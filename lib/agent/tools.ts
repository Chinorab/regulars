import "server-only";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { placeInsights, tagInsights, QlooError } from "@/lib/qloo/client";
import {
  CATEGORY_LABEL,
  DRINKING_TAGS,
  ROOM_TAG_TYPES,
  TASTE_TAG_TYPES,
  TIER_CATEGORIES,
} from "@/lib/qloo/categories";
import { isDaytime, matchesTier, onlyLateNight, openOnDay, toPlace } from "@/lib/plan/place";
import type { Place, Profile, TierKey } from "@/lib/plan/types";
import { listJoin } from "./prompt";
import type { EvidenceRegistry } from "./registry";

export type StepFn = (label: string, tool: string, cacheHit?: boolean) => void;

export type RunContext = {
  profile: Profile;
  registry: EvidenceRegistry;
  excludedPlaceIds: string[];
  addedSignalIds: string[];
  onStep: StepFn;
  taste?: { taste: TasteTag[]; rooms: TasteTag[] };
};

export type TasteTag = { id: string; name: string; affinity: number };

const PRICE_MAX: Record<Profile["budget"], number | undefined> = { free: 1, u15: 2, u40: 3, any: undefined };

function loveIds(ctx: RunContext) {
  return ctx.profile.loves.map((l) => l.entity.id);
}

// ---------- read_taste ----------

export async function readTaste(ctx: RunContext) {
  const ids = [...loveIds(ctx), ...ctx.addedSignalIds];
  for (const l of ctx.profile.loves) ctx.registry.addEntity(l.entity);
  ctx.onStep(`Reading your taste from ${listJoin(ctx.profile.loves.map((l) => l.entity.name))}`, "read_taste");
  const exclude = ctx.profile.removedTagIds;
  const [taste, rooms] = await Promise.all([
    tagInsights({ entityIds: ids, tagTypes: TASTE_TAG_TYPES, excludeTagIds: exclude, take: 12, perSubtype: 4 }),
    tagInsights({ entityIds: ids, tagTypes: ROOM_TAG_TYPES, excludeTagIds: exclude, take: 8 }),
  ]);
  ctx.registry.countCall(taste.cacheHit);
  ctx.registry.countCall(rooms.cacheHit);
  const map = (t: { tag_id: string; name: string; query?: { affinity?: number } }) => ({
    id: t.tag_id,
    name: t.name,
    affinity: Math.round((t.query?.affinity ?? 0) * 100) / 100,
  });
  const removed = new Set(exclude);
  ctx.taste = {
    taste: taste.data.map(map).filter((t) => !removed.has(t.id)),
    rooms: rooms.data.map(map).filter((t) => !removed.has(t.id)),
  };
  return ctx.taste;
}

// ---------- find_places ----------

export const FindPlacesInput = z.object({
  tier: z.enum(["show_up", "come_back", "join_in"]),
  scope: z.enum(["near", "city"]).default("near"),
  signal_entity_ids: z.array(z.string()).max(8).optional(),
  signal_tag_ids: z.array(z.string()).max(3).optional(),
});

export function tierCategories(tier: TierKey, ease: number): string[] {
  if (tier === "come_back" && ease >= 4) return [...new Set([...TIER_CATEGORIES.come_back, ...TIER_CATEGORIES.join_in])];
  return TIER_CATEGORIES[tier];
}

const TIER_PHRASE: Record<TierKey, string> = {
  show_up: "record stores, bookstores, parks and music rooms",
  come_back: "cafes, comic shops, game stores and climbing gyms",
  join_in: "community centers, studios, gardens and game clubs",
};

// Constraint post filter. Returns kept places plus how many were removed and why.
export function applyConstraints(places: Place[], tier: TierKey, ctx: RunContext) {
  const p = ctx.profile;
  const priceMax = PRICE_MAX[p.budget];
  const kept: Place[] = [];
  let removed = 0;
  for (const place of places) {
    if (p.noAlcohol && place.barLike) { removed++; continue; }
    if (priceMax !== undefined && place.priceLevel !== undefined && place.priceLevel > priceMax) { removed++; continue; }
    if (p.evenings.length > 0 && place.hours && !p.evenings.some((d) => openOnDay(place, d) !== false)) { removed++; continue; }
    if (p.needs.daytime && isDaytime(place) === false) { removed++; continue; }
    if (tier === "show_up" && p.socialEase <= 2 && onlyLateNight(place)) { removed++; continue; }
    kept.push(place);
  }
  // Step free need: places Qloo tags as step free first; the rest stay, marked "call ahead".
  if (p.needs.stepFree) kept.sort((a, b) => Number(b.stepFree === true) - Number(a.stepFree === true));
  return { kept, removed };
}

async function queryTier(ctx: RunContext, tier: TierKey, scope: "near" | "city", signals: string[], tagSignals: string[]) {
  const cats = tierCategories(tier, ctx.profile.socialEase);
  const exclude = [...ctx.profile.removedTagIds, ...(ctx.profile.noAlcohol ? DRINKING_TAGS : [])];
  const r = await placeInsights({
    signalEntityIds: signals,
    signalTagIds: tagSignals.length ? tagSignals : undefined,
    locationQuery: scope === "near" ? ctx.profile.locality.query : ctx.profile.city,
    categoryTags: cats,
    excludeTags: exclude,
    excludeEntityIds: ctx.excludedPlaceIds.length ? ctx.excludedPlaceIds : undefined,
    take: 12,
  });
  ctx.registry.countCall(r.cacheHit);
  const center = ctx.profile.locality.center;
  const places = r.data.results.entities
    .map((e) => toPlace(e, r.fetchedAt, center))
    .filter((pl) => matchesTier(pl, cats) && !ctx.excludedPlaceIds.includes(pl.id));
  return { places, cacheHit: r.cacheHit, cats };
}

export async function findPlaces(ctx: RunContext, raw: unknown) {
  const input = FindPlacesInput.parse(raw);
  const allowedSignals = new Set([...loveIds(ctx), ...ctx.addedSignalIds]);
  let signals = (input.signal_entity_ids ?? []).filter((id) => allowedSignals.has(id));
  if (signals.length === 0) signals = [...allowedSignals];
  const knownTags = new Set([...(ctx.taste?.taste ?? []), ...(ctx.taste?.rooms ?? [])].map((t) => t.id));
  const tagSignals = (input.signal_tag_ids ?? []).filter((t) => knownTags.has(t));

  const where = input.scope === "near" ? `near ${ctx.profile.locality.name}` : `across ${ctx.profile.city}`;
  ctx.onStep(
    input.scope === "city"
      ? `Widening the search to all of ${ctx.profile.city}`
      : `Looking for ${TIER_PHRASE[input.tier]} ${where}`,
    "find_places",
  );

  let { places } = await queryTier(ctx, input.tier, input.scope, signals, tagSignals);
  let { kept, removed } = applyConstraints(places, input.tier, ctx);
  let scopeUsed = input.scope;

  // FR-006c: Join in widens to the whole city when fewer than three places qualify nearby.
  if (input.tier === "join_in" && input.scope === "near" && kept.length < 3) {
    ctx.onStep(`Few places to join nearby, so searching all of ${ctx.profile.city}`, "find_places");
    const wide = await queryTier(ctx, "join_in", "city", signals, tagSignals);
    const merged = [...kept, ...applyConstraints(wide.places, "join_in", ctx).kept.filter((p) => !kept.some((k) => k.id === p.id))];
    kept = merged;
    scopeUsed = "city";
  }
  if (scopeUsed === "city") ctx.registry.widened.add(input.tier);

  ctx.registry.addPlaces(input.tier, kept);
  return {
    tier: input.tier,
    scope_used: scopeUsed,
    removed_by_constraints: removed,
    places: kept.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      categories: p.categories.map((c) => CATEGORY_LABEL[c] ?? c.replace(/_/g, " ")).slice(0, 3),
      affinity: p.affinity !== undefined ? Math.round(p.affinity * 1000) / 1000 : null,
      miles_from_center: p.km !== undefined ? Math.round(p.km * 0.621371 * 10) / 10 : null,
      driven_by: p.contributions.map((c) => ({ name: ctx.registry.signalName(c.entityId) ?? c.entityId, score: Math.round(c.score * 100) / 100 })),
      time_of_day: p.timeOfDay,
      step_free_entrance: p.stepFree ?? "unknown",
      price_level: p.priceLevel ?? "not listed",
      visitors_mention: p.reviewKeywords.slice(0, 3).map((k) => k.name),
    })),
  };
}

// ---------- submit_plan ----------

export const SubmitPlanInput = z.object({
  tiers: z
    .array(
      z.object({
        tier: z.enum(["show_up", "come_back", "join_in"]),
        featured_id: z.string().nullable(),
        backup_ids: z.array(z.string()).max(2).default([]),
        tips: z.array(z.string()).max(3).default([]),
      }),
    )
    .min(1)
    .max(3),
  portrait: z.object({ headline: z.string().max(120), body: z.string().max(400) }).optional(),
});
export type SubmitPlanInput = z.infer<typeof SubmitPlanInput>;

// ---------- tool definitions sent to the model ----------

export const AGENT_TOOLS: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: "read_taste",
    description:
      "Read the person's resolved loves (with Qloo entity ids), their Qloo taste tags (genres, keywords) and room tags (ambience), plus their constraints. Call this first.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "find_places",
    description:
      "Query the Qloo taste graph for real places for one tier, ranked by affinity to the person's signals, near their neighborhood (scope near) or across their city (scope city). The tool applies the person's constraints itself and returns ids, categories, affinity, distance from the neighborhood center and which loves drove each match.",
    input_schema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: ["show_up", "come_back", "join_in"] },
        scope: { type: "string", enum: ["near", "city"], description: "Default near." },
        signal_entity_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional subset of love ids to use as signals. Omit to use all loves.",
        },
        signal_tag_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional, up to 3 tag ids returned by read_taste, used as extra signals.",
        },
      },
      required: ["tier"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_plan",
    description:
      "Submit the final plan. Use only place ids returned by find_places for the same tier. Call exactly once, at the end.",
    input_schema: {
      type: "object",
      properties: {
        tiers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tier: { type: "string", enum: ["show_up", "come_back", "join_in"] },
              featured_id: { type: ["string", "null"] },
              backup_ids: { type: "array", items: { type: "string" }, maxItems: 2 },
              tips: { type: "array", items: { type: "string" }, maxItems: 3 },
            },
            required: ["tier", "featured_id", "backup_ids", "tips"],
            additionalProperties: false,
          },
        },
        portrait: {
          type: "object",
          properties: { headline: { type: "string" }, body: { type: "string" } },
          required: ["headline", "body"],
          additionalProperties: false,
        },
      },
      required: ["tiers", "portrait"],
      additionalProperties: false,
    },
  },
];

export function toolErrorMessage(e: unknown): string {
  if (e instanceof QlooError) return `Qloo error (${e.code}): ${e.message}`;
  if (e instanceof z.ZodError) return `Invalid input: ${e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;
  return "Tool failed.";
}
