import "server-only";
import type { z } from "zod";
import { cacheGet, cacheSet } from "./cache";
import { QuotaError, reserveCall, throttle } from "./budget";
import {
  PlaceInsights,
  SearchResponse,
  TagInsights,
  TagSearch,
  type SearchResult,
  type TagInsight,
} from "./schemas";

const BASE = "https://hackathon.api.qloo.com";

export type QlooErrorCode = "qloo_unavailable" | "qloo_quota" | "qloo_bad_request";

export class QlooError extends Error {
  constructor(
    public code: QlooErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export type QlooResult<T> = { data: T; fetchedAt: string; cacheHit: boolean };

type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params: Params) {
  const url = new URL(path, BASE);
  const keys = Object.keys(params).sort();
  for (const k of keys) {
    const v = params[k];
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url;
}

// Keep only what the app reads. The top level `query` echo is reduced to the resolved
// localities (public geography) so cached values hold Qloo data, not request text.
function slim(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = body as Record<string, unknown>;
  const out: Record<string, unknown> = { results: b.results };
  const q = b.query as Record<string, unknown> | undefined;
  if (q && typeof q === "object" && q.localities) out.query = { localities: q.localities };
  return out;
}

async function call<S extends z.ZodTypeAny>(path: string, params: Params, schema: S): Promise<QlooResult<z.infer<S>>> {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new QlooError("qloo_unavailable", "Taste data is not configured on this server.");
  const url = buildUrl(path, params);
  const cacheKey = `GET ${url.pathname}?${url.searchParams.toString()}`;

  const hit = await cacheGet<unknown>(cacheKey);
  if (hit) {
    const parsed = schema.safeParse(hit.data);
    if (parsed.success) return { data: parsed.data, fetchedAt: hit.fetchedAt, cacheHit: true };
  }

  try {
    await reserveCall();
  } catch (e) {
    if (e instanceof QuotaError) throw new QlooError("qloo_quota", "This month's taste data allowance is used up.");
    throw e;
  }

  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    try {
      res = await fetch(url, {
        headers: { "X-Api-Key": key, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      res = undefined;
      continue;
    }
    if (res.status !== 429 && res.status < 500) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : 600 * 2 ** attempt));
  }

  if (!res) throw new QlooError("qloo_unavailable", "Taste data could not be reached.");
  if (res.status === 400) {
    const text = await res.text();
    throw new QlooError("qloo_bad_request", text.slice(0, 300), 400);
  }
  if (!res.ok) throw new QlooError("qloo_unavailable", `Taste data answered ${res.status}.`, res.status);

  const raw = slim(await res.json());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new QlooError("qloo_unavailable", "Taste data returned an unexpected shape.");
  const fetchedAt = new Date().toISOString();
  await cacheSet(cacheKey, { data: raw, fetchedAt });
  return { data: parsed.data, fetchedAt, cacheHit: false };
}

const ENTITY_TYPES = [
  "urn:entity:artist",
  "urn:entity:movie",
  "urn:entity:tv_show",
  "urn:entity:book",
  "urn:entity:podcast",
  "urn:entity:person",
];

export async function search(query: string, types: string[] = ENTITY_TYPES, take = 5): Promise<QlooResult<SearchResult[]>> {
  const r = await call("/search", { query, types: types.join(","), take }, SearchResponse);
  return { ...r, data: r.data.results };
}

export async function searchTags(query: string, take = 20) {
  const r = await call("/v2/tags", { "filter.query": query, take }, TagSearch);
  return { ...r, data: r.data.results.tags };
}

export async function tagInsights(opts: {
  entityIds: string[];
  tagTypes: string[];
  excludeTagIds?: string[];
  take?: number;
  perSubtype?: number;
}): Promise<QlooResult<TagInsight[]>> {
  const r = await call(
    "/v2/insights",
    {
      "filter.type": "urn:tag",
      "signal.interests.entities": opts.entityIds.join(","),
      "filter.tag.types": opts.tagTypes.join(","),
      "filter.exclude.tags": opts.excludeTagIds?.join(","),
      "diversify.by": opts.perSubtype ? "subtype" : undefined,
      "diversify.take": opts.perSubtype,
      take: opts.take ?? 20,
    },
    TagInsights,
  );
  return { ...r, data: r.data.results.tags };
}

export type PlaceQuery = {
  signalEntityIds?: string[];
  signalTagIds?: string[];
  locationQuery?: string;
  radiusMeters?: number;
  categoryTags?: string[];
  excludeTags?: string[];
  excludeEntityIds?: string[];
  resultEntityIds?: string[];
  openOn?: string;
  priceLevelMax?: number;
  take?: number;
};

export async function placeInsights(q: PlaceQuery): Promise<QlooResult<PlaceInsights>> {
  return call(
    "/v2/insights",
    {
      "filter.type": "urn:entity:place",
      "signal.interests.entities": q.signalEntityIds?.join(","),
      "signal.interests.tags": q.signalTagIds?.join(","),
      "filter.location.query": q.locationQuery,
      "filter.location.radius": q.radiusMeters,
      "filter.tags": q.categoryTags?.join(","),
      "filter.exclude.tags": q.excludeTags?.join(","),
      "filter.exclude.entities": q.excludeEntityIds?.join(","),
      "filter.results.entities": q.resultEntityIds?.join(","),
      "filter.hours": q.openOn,
      "filter.price_level.max": q.priceLevelMax,
      "feature.explainability": true,
      take: q.take ?? 10,
    },
    PlaceInsights,
  );
}
