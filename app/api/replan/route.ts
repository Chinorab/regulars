import { z } from "zod";
import { EvidenceRegistry } from "@/lib/agent/registry";
import { findPlaces, type RunContext } from "@/lib/agent/tools";
import { PlaceSchema, ProfileSchema, TierKeySchema, type Place, type TierKey } from "@/lib/plan/types";
import { errorJson, readBody } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";

export const maxDuration = 30;

const Body = z.object({
  profile: ProfileSchema,
  tiers: z.array(TierKeySchema).min(1).max(3),
  excludedPlaceIds: z.array(z.string()).max(80).default([]),
  addedSignalIds: z.array(z.string()).max(10).default([]),
  keepIds: z.array(z.string()).max(12).default([]),
  // Liked places are sent back so their names can be shown in "Why you"; they are Qloo records
  // this browser received earlier.
  knownPlaces: z.array(PlaceSchema).max(12).default([]),
});

// Check in and swap adjustments without the planner: one Qloo call per tier, ranked by affinity
// to the loves plus any liked places (contracts/http-api.md).
export async function POST(req: Request) {
  const rl = await limit(req, "light");
  if (!rl.ok) return limited(rl.retryAfterSec);
  try {
    const body = await readBody(req, Body);
    const registry = new EvidenceRegistry();
    for (const l of body.profile.loves) registry.addEntity(l.entity);
    registry.addPlaces(null, body.knownPlaces);
    const ctx: RunContext = {
      profile: body.profile,
      registry,
      excludedPlaceIds: [...new Set([...body.excludedPlaceIds, ...body.keepIds])],
      addedSignalIds: body.addedSignalIds,
      onStep: () => {},
    };
    const updates: { key: TierKey; featuredId: string | null; backupIds: string[]; status: "ok" | "empty" | "widened" }[] = [];
    const places: Record<string, Place> = {};
    for (const key of body.tiers) {
      await findPlaces(ctx, { tier: key, scope: "near" });
      const ids = registry.tierResults[key].filter((id) => !ctx.excludedPlaceIds.includes(id));
      const [featured, ...rest] = ids;
      const backups = rest.slice(0, 2);
      for (const id of [featured, ...backups]) if (id) places[id] = registry.places.get(id)!;
      // A place chosen for one tier is not offered again in the next.
      ctx.excludedPlaceIds.push(...[featured, ...backups].filter(Boolean) as string[]);
      updates.push({
        key,
        featuredId: featured ?? null,
        backupIds: backups,
        status: featured ? (registry.widened.has(key) ? "widened" : "ok") : "empty",
      });
    }
    return Response.json({ updates, places });
  } catch (e) {
    return errorJson(e);
  }
}
