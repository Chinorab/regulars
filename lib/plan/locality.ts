import "server-only";
import { placeInsights } from "@/lib/qloo/client";
import type { ResolvedLocality } from "./types";

export type LocalityCheck =
  | { ok: true; locality: ResolvedLocality; fetchedAt: string; cacheHit: boolean }
  | { ok: false; resolvedTo?: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Qloo resolves unknown or misspelled names to far away places without an error
// ("Logn Sqare, Chicgo" became Besancon, France in probe 05). Accept only a US locality
// whose description contains the city the person typed.
export function acceptLocality(disambiguation: string | undefined, city: string): boolean {
  if (!disambiguation) return false;
  const d = norm(disambiguation);
  const c = norm(city);
  return d.includes("united states") && c.length > 1 && d.includes(c);
}

export async function resolveLocality(query: string, city: string): Promise<LocalityCheck> {
  const r = await placeInsights({
    locationQuery: query,
    categoryTags: ["urn:tag:category:place:park"],
    take: 1,
  });
  const loc = r.data.query?.localities?.filter?.[0];
  if (!loc || !acceptLocality(loc.disambiguation, city)) return { ok: false, resolvedTo: loc?.disambiguation };
  return {
    ok: true,
    locality: { query, name: loc.name, disambiguation: loc.disambiguation ?? loc.name, center: loc.location },
    fetchedAt: r.fetchedAt,
    cacheHit: r.cacheHit,
  };
}
