import { z } from "zod";
import { tagInsights } from "@/lib/qloo/client";
import { ROOM_TAG_TYPES, TASTE_TAG_TYPES } from "@/lib/qloo/categories";
import { errorJson, readBody } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";
import { writePortrait } from "@/lib/agent/portrait";
import { interleaveBySubtype } from "@/lib/plan/format";

const Body = z.object({
  entityIds: z.array(z.string()).min(1).max(8),
  excludeTagIds: z.array(z.string()).max(40).default([]),
});

// Taste portrait tags, straight from Qloo, plus a short reading written only from those tags.
export async function POST(req: Request) {
  const rl = await limit(req, "light");
  if (!rl.ok) return limited(rl.retryAfterSec);
  try {
    const { entityIds, excludeTagIds } = await readBody(req, Body);
    const [taste, rooms] = await Promise.all([
      tagInsights({ entityIds, tagTypes: TASTE_TAG_TYPES, excludeTagIds, take: 12, perSubtype: 4 }),
      tagInsights({ entityIds, tagTypes: ROOM_TAG_TYPES, excludeTagIds, take: 8 }),
    ]);
    const removed = new Set(excludeTagIds);
    const map = (t: { tag_id: string; name: string; subtype?: string; query?: { affinity?: number } }) => ({
      id: t.tag_id,
      name: t.name,
      kind: t.subtype ?? "",
      affinity: t.query?.affinity ?? 0,
    });
    const tasteTags = interleaveBySubtype(taste.data.map(map).filter((t) => !removed.has(t.id)));
    const roomTags = rooms.data.map(map).filter((t) => !removed.has(t.id));
    const portrait = await writePortrait(
      tasteTags.slice(0, 10).map((t) => t.name),
      roomTags.slice(0, 6).map((t) => t.name),
    );
    return Response.json({ taste: tasteTags, rooms: roomTags, portrait, fetchedAt: taste.fetchedAt });
  } catch (e) {
    return errorJson(e);
  }
}
