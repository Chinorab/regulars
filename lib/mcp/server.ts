import "server-only";
import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { placeInsights, search } from "@/lib/qloo/client";
import { resolveLocality } from "@/lib/plan/locality";
import { toPlace } from "@/lib/plan/place";
import { formatMiles } from "@/lib/plan/distance";
import { runAgent } from "@/lib/agent/run";
import { EvidenceRegistry } from "@/lib/agent/registry";
import { findPlaces, type RunContext } from "@/lib/agent/tools";
import { TIER_META, type Entity, type Place, type Profile, DAYS } from "@/lib/plan/types";
import { toApiError } from "@/lib/http";

// MCP tools share lib/agent and lib/qloo with the web app (contracts/mcp-tools.md).

const KIND: Record<string, string> = {
  "urn:entity:artist": "Artist",
  "urn:entity:movie": "Film",
  "urn:entity:tv_show": "TV series",
  "urn:entity:book": "Book",
  "urn:entity:podcast": "Podcast",
  "urn:entity:person": "Person",
};

async function resolveLoves(queries: string[]): Promise<{ resolved: Entity[]; unmatched: string[] }> {
  const resolved: Entity[] = [];
  const unmatched: string[] = [];
  for (const q of queries) {
    const r = await search(q, undefined, 3);
    const top = r.data.find((e) => e.types.some((t) => KIND[t]));
    if (!top) {
      unmatched.push(q);
      continue;
    }
    resolved.push({
      id: top.entity_id,
      name: top.name.replace(/\s*\([^()]*#\d+(\.\d+)?\)\s*$/, "").trim() || top.name,
      kind: top.types.map((t) => KIND[t]).find(Boolean) ?? "Entity",
    });
  }
  return { resolved, unmatched };
}

async function buildProfile(input: {
  loves: string[];
  location: string;
  city: string;
  budget?: Profile["budget"];
  free_days?: (typeof DAYS)[number][];
  no_alcohol?: boolean;
  social_ease?: number;
}): Promise<{ profile: Profile; unmatched: string[] }> {
  const loc = await resolveLocality(input.location, input.city);
  if (!loc.ok) throw new Error(`Location not found in the United States: ${input.location}${loc.resolvedTo ? ` (resolved to ${loc.resolvedTo})` : ""}`);
  const { resolved, unmatched } = await resolveLoves(input.loves);
  if (resolved.length === 0) throw new Error("None of the loves could be matched to a Qloo entity.");
  return {
    profile: {
      loves: resolved.map((e, i) => ({ query: input.loves[i] ?? e.name, entity: e })),
      locality: loc.locality,
      city: input.city,
      budget: input.budget ?? "any",
      evenings: input.free_days ?? [],
      noAlcohol: input.no_alcohol ?? false,
      socialEase: input.social_ease ?? 3,
      removedTagIds: [],
      needs: { daytime: false, stepFree: false },
    },
    unmatched,
  };
}

function placeOut(p: Place, nameOf: (id: string) => string, hood: string) {
  return {
    name: p.name,
    qloo_id: p.id,
    categories: p.categories,
    address: p.address ?? null,
    distance: p.km !== undefined ? `${formatMiles(p.km)} from the center of ${hood}` : null,
    affinity: p.affinity !== undefined ? Number(p.affinity.toFixed(3)) : null,
    why_you: [...p.contributions].sort((a, b) => b.score - a.score).map((c) => ({ signal: nameOf(c.entityId), share: Number(c.score.toFixed(2)) })),
    hours: p.hours ?? null,
    price_level: p.priceLevel ?? null,
    website: p.website ?? null,
    visitors_mention: p.reviewKeywords.slice(0, 4).map((k) => k.name),
    fetched_at: p.fetchedAt,
  };
}

const text = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] });
const fail = (e: unknown) => {
  const msg = e instanceof Error && !("code" in e) ? e.message : toApiError(e).message;
  return { content: [{ type: "text" as const, text: msg }], isError: true };
};

const Loves = z.array(z.string().min(1).max(120)).min(1).max(5).describe("Things the person loves: artists, films, series, books, podcasts.");
const Location = z.string().min(2).max(120).describe('Neighborhood and city, for example "Logan Square, Chicago".');
const City = z.string().min(2).max(80).describe('The US city, for example "Chicago".');

export const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "find_regular_spots",
      {
        title: "Find regular spots",
        description:
          "Find real places near a US neighborhood where people with a given taste already go, ranked by Qloo taste affinity, with the evidence for each match. Every field comes from the Qloo taste graph.",
        inputSchema: z.object({
          loves: Loves,
          location: Location,
          city: City,
          tier: z.enum(["show_up", "come_back", "join_in"]).default("show_up").describe("show_up: go alone, low pressure. come_back: recurring cafes and shops. join_in: participatory places."),
          no_alcohol: z.boolean().default(false),
        }),
      },
      async (input) => {
        try {
          const { profile, unmatched } = await buildProfile({ ...input, no_alcohol: input.no_alcohol });
          const registry = new EvidenceRegistry();
          for (const l of profile.loves) registry.addEntity(l.entity);
          const ctx: RunContext = { profile, registry, excludedPlaceIds: [], addedSignalIds: [], onStep: () => {} };
          await findPlaces(ctx, { tier: input.tier, scope: "near" });
          const places = registry.tierResults[input.tier].map((id) => registry.places.get(id)!).slice(0, 8);
          const nameOf = (id: string) => registry.signalName(id) ?? id;
          return text({
            locality: profile.locality.disambiguation,
            matched_loves: profile.loves.map((l) => `${l.entity.name} (${l.entity.kind})`),
            unmatched_loves: unmatched,
            tier: input.tier,
            places: places.map((p) => placeOut(p, nameOf, profile.locality.name)),
            source: "Qloo taste graph (hackathon.api.qloo.com)",
          });
        } catch (e) {
          return fail(e);
        }
      },
    );

    server.registerTool(
      "build_connection_plan",
      {
        title: "Build a Connection Plan",
        description:
          "Run the Regulars agent: a six week plan in three steps (show up, come back, join in), each with one real place and up to two backups from the Qloo taste graph, evidence for each, and general first steps. Takes 15 to 45 seconds.",
        inputSchema: z.object({
          loves: Loves,
          location: Location,
          city: City,
          budget: z.enum(["free", "u15", "u40", "any"]).default("any"),
          free_days: z.array(z.enum(DAYS)).max(7).default([]),
          no_alcohol: z.boolean().default(false),
          social_ease: z.number().int().min(1).max(5).default(3).describe("How easy talking to someone new feels, 1 very hard to 5 easy."),
        }),
      },
      async (input) => {
        try {
          const { profile, unmatched } = await buildProfile(input);
          const plan = await runAgent(profile);
          const nameOf = (id: string) => profile.loves.find((l) => l.entity.id === id)?.entity.name ?? plan.places[id]?.name ?? id;
          return text({
            request: plan.requestText,
            unmatched_loves: unmatched,
            portrait: plan.portrait ?? null,
            steps: plan.tiers.map((t) => ({
              weeks: TIER_META[t.key].weeks,
              step: TIER_META[t.key].verb,
              featured: t.featuredId ? placeOut(plan.places[t.featuredId]!, nameOf, profile.locality.name) : null,
              backups: t.backupIds.map((id) => plan.places[id]?.name).filter(Boolean),
              your_move: t.tips,
            })),
            agent_steps: plan.steps.map((s) => s.label),
          });
        } catch (e) {
          return fail(e);
        }
      },
    );

    server.registerTool(
      "explain_match",
      {
        title: "Explain a match",
        description:
          "Explain why a specific Qloo place matches a set of loves: Qloo affinity and how much each love contributed (Qloo explainability).",
        inputSchema: z.object({
          place_id: z.string().min(8).max(64).describe("Qloo entity id of the place, as returned by the other tools."),
          loves: Loves,
        }),
      },
      async (input) => {
        try {
          const { resolved, unmatched } = await resolveLoves(input.loves);
          if (resolved.length === 0) throw new Error("None of the loves could be matched to a Qloo entity.");
          const r = await placeInsights({ signalEntityIds: resolved.map((e) => e.id), resultEntityIds: [input.place_id], take: 1 });
          const raw = r.data.results.entities[0];
          if (!raw) throw new Error("Qloo returned no score for that place id.");
          const p = toPlace(raw, r.fetchedAt);
          const nameOf = (id: string) => resolved.find((e) => e.id === id)?.name ?? id;
          return text({
            place: p.name,
            categories: p.categories,
            affinity: p.affinity ?? null,
            contributions: [...p.contributions].sort((a, b) => b.score - a.score).map((c) => ({ love: nameOf(c.entityId), share: Number(c.score.toFixed(2)) })),
            silent_loves: resolved.filter((e) => !p.contributions.some((c) => c.entityId === e.id)).map((e) => e.name),
            unmatched_loves: unmatched,
            fetched_at: p.fetchedAt,
          });
        } catch (e) {
          return fail(e);
        }
      },
    );
  },
  { serverInfo: { name: "regulars", version: "1.0.0" } },
);
