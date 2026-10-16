import { z } from "zod";
import { search } from "@/lib/qloo/client";
import { errorJson, readBody } from "@/lib/http";
import { limit, limited } from "@/lib/ratelimit";
import type { Entity } from "@/lib/plan/types";

const Body = z.object({ query: z.string().trim().min(1).max(120) });

const KIND: Record<string, string> = {
  "urn:entity:artist": "Artist",
  "urn:entity:movie": "Film",
  "urn:entity:tv_show": "TV series",
  "urn:entity:book": "Book",
  "urn:entity:podcast": "Podcast",
  "urn:entity:person": "Person",
};

// Entity search for intake cards: top matches with images, straight from Qloo /search.
export async function POST(req: Request) {
  const rl = await limit(req, "light");
  if (!rl.ok) return limited(rl.retryAfterSec);
  try {
    const { query } = await readBody(req, Body);
    const r = await search(query, undefined, 6);
    const seen = new Set<string>();
    const matches: Entity[] = [];
    for (const e of r.data) {
      const kind = e.types.map((t) => KIND[t]).find(Boolean);
      if (!kind) continue;
      const key = `${e.name.toLowerCase()}|${kind}`;
      if (seen.has(key) || seen.has(e.entity_id)) continue;
      seen.add(key);
      seen.add(e.entity_id);
      matches.push({
        id: e.entity_id,
        // "Dune (Dune, #1)" reads as "Dune": drop the series suffix Qloo adds to book titles.
        name: e.name.replace(/\s*\([^()]*#\d+(\.\d+)?\)\s*$/, "").trim() || e.name,
        kind,
        imageUrl: e.properties?.image?.url,
        description: e.properties?.short_description,
        tagIds: (e.tags ?? []).map((t) => t.tag_id ?? t.id ?? "").filter(Boolean).slice(0, 80),
      });
      if (matches.length === 3) break;
    }
    return Response.json({ matches, fetchedAt: r.fetchedAt });
  } catch (e) {
    return errorJson(e);
  }
}
