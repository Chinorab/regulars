import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { QlooError } from "@/lib/qloo/client";
import { DASH_SPACED_RE } from "@/lib/text";
import type { ConnectionPlan, Place, Profile } from "@/lib/plan/types";
import { EvidenceRegistry } from "./registry";
import { SYSTEM_PROMPT, buildRequestText } from "./prompt";
import {
  AGENT_TOOLS,
  SubmitPlanInput,
  findPlaces,
  readTaste,
  toolErrorMessage,
  type RunContext,
} from "./tools";
import { assembleTiers, type ProposedTier } from "./validate";

export const AGENT_MODEL = "claude-sonnet-5-5";
const MAX_TURNS = 12;
const BUDGET_MS = 52_000;

export type StepEvent = { label: string; tool: string; cacheHit?: boolean };

export class ModelUnavailableError extends Error {
  code = "model_unavailable" as const;
}

let client: Anthropic | null = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new ModelUnavailableError("Planner is not configured on this server.");
  client ??= new Anthropic({ maxRetries: 1 });
  return client;
}

export function cleanProse(s: string | undefined, max = 400): string | undefined {
  if (!s) return undefined;
  const out = s
    .replace(DASH_SPACED_RE, ", ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return out || undefined;
}

export type RunOptions = {
  excludedPlaceIds?: string[];
  addedSignalIds?: string[];
  onStep?: (e: StepEvent) => void;
};

export async function runAgent(profile: Profile, opts: RunOptions = {}): Promise<ConnectionPlan> {
  const started = Date.now();
  const registry = new EvidenceRegistry();
  const ctx: RunContext = {
    profile,
    registry,
    excludedPlaceIds: opts.excludedPlaceIds ?? [],
    addedSignalIds: opts.addedSignalIds ?? [],
    onStep: (label, tool, cacheHit) => {
      registry.steps.push({ label, tool, cacheHit, at: new Date().toISOString() });
      opts.onStep?.({ label, tool, cacheHit });
    },
  };
  const requestText = buildRequestText(profile);

  let proposal: ProposedTier[] | null = null;
  let portrait: { headline: string; body: string } | undefined;

  try {
    const result = await agentLoop(ctx, requestText, started);
    proposal = result?.proposal ?? null;
    portrait = result?.portrait;
  } catch (e) {
    if (e instanceof QlooError) throw e;
    // Planner unavailable: fall back to Qloo rankings directly (spec edge case). No prose.
    ctx.onStep("Ranking places straight from the taste data", "fallback");
  }

  // Any tier the agent did not search is searched now, so a plan never relies on the model.
  if (!ctx.taste) await readTaste(ctx).catch((e) => { if (e instanceof QlooError) throw e; });
  for (const tier of ["show_up", "come_back", "join_in"] as const) {
    if (registry.tierResults[tier].length === 0) await findPlaces(ctx, { tier, scope: "near" });
  }

  ctx.onStep("Putting your six weeks together", "submit_plan");
  const { tiers } = assembleTiers(proposal ?? [], registry.tierResults, registry.widened, new Set(ctx.excludedPlaceIds));
  const used = new Set(tiers.flatMap((t) => [t.featuredId, ...t.backupIds]).filter(Boolean) as string[]);
  const places: Record<string, Place> = {};
  for (const id of used) {
    const p = registry.places.get(id);
    if (p) places[id] = p;
  }
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    requestText,
    tiers,
    places,
    excludedPlaceIds: ctx.excludedPlaceIds,
    addedSignalIds: ctx.addedSignalIds,
    steps: registry.steps,
    portrait:
      portrait && cleanProse(portrait.headline, 120) && cleanProse(portrait.body)
        ? { headline: cleanProse(portrait.headline, 120)!, body: cleanProse(portrait.body)! }
        : undefined,
  };
}

async function agentLoop(ctx: RunContext, requestText: string, started: number) {
  const api = anthropic();
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: requestText }];
  let submitRetries = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const remaining = BUDGET_MS - (Date.now() - started);
    if (remaining < 4_000) return null;

    let message: Anthropic.Beta.Messages.BetaMessage;
    try {
      message = await api.beta.messages.create(
        {
          model: AGENT_MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages,
        },
        { timeout: remaining },
      );
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw new ModelUnavailableError(e.message);
      throw e;
    }

    if (message.stop_reason === "refusal") return null;
    const toolUses = message.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
    if (message.stop_reason === "max_tokens" || toolUses.length === 0) return null;

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    const done: { final: { proposal: ProposedTier[]; portrait?: { headline: string; body: string } } | null } = { final: null };

    await Promise.all(
      toolUses.map(async (tu) => {
        try {
          if (tu.name === "read_taste") {
            const taste = await readTaste(ctx);
            results.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify({
                loves: ctx.profile.loves.map((l) => ({ id: l.entity.id, name: l.entity.name, kind: l.entity.kind })),
                liked_places_as_signals: ctx.addedSignalIds.map((id) => ({ id, name: ctx.registry.signalName(id) ?? id })),
                taste_tags: taste.taste,
                room_tags: taste.rooms,
                constraints: {
                  neighborhood: ctx.profile.locality.disambiguation,
                  budget: ctx.profile.budget,
                  free_days: ctx.profile.evenings,
                  no_alcohol: ctx.profile.noAlcohol,
                  social_ease_1_to_5: ctx.profile.socialEase,
                  daytime_only: ctx.profile.needs.daytime,
                  step_free_entrance: ctx.profile.needs.stepFree,
                },
              }),
            });
          } else if (tu.name === "find_places") {
            const out = await findPlaces(ctx, tu.input);
            results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
          } else if (tu.name === "submit_plan") {
            const input = SubmitPlanInput.parse(tu.input);
            const { dropped } = assembleTiers(input.tiers, ctx.registry.tierResults, ctx.registry.widened, new Set(ctx.excludedPlaceIds));
            if (dropped.length > 0 && submitRetries === 0) {
              submitRetries++;
              results.push({
                type: "tool_result",
                tool_use_id: tu.id,
                is_error: true,
                content: `These ids were not returned by find_places for that tier or were repeated: ${dropped.join(", ")}. Resubmit using only ids from each tier's results.`,
              });
            } else {
              done.final = { proposal: input.tiers, portrait: input.portrait };
              results.push({ type: "tool_result", tool_use_id: tu.id, content: "Plan received." });
            }
          } else {
            results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: `Unknown tool ${tu.name}` });
          }
        } catch (e) {
          if (e instanceof QlooError && e.code !== "qloo_bad_request") throw e;
          results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: toolErrorMessage(e) });
        }
      }),
    );

    if (done.final) return done.final;
    messages.push({ role: "user", content: results });
  }
  return null;
}
