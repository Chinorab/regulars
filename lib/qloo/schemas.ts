import { z } from "zod";

// Schemas match the live hackathon API responses observed in scripts/0N probes (2026-10-16).
// Unknown fields pass through; we only validate what we read.

const trim = z.string().transform((v) => v.trim());

export const TagRef = z.object({
  tag_id: z.string().optional(),
  id: z.string().optional(),
  name: trim,
  type: z.string().optional(),
});

export const SearchResult = z.object({
  entity_id: z.string(),
  name: z.string(),
  types: z.array(z.string()).default([]),
  disambiguation: z.string().optional(),
  popularity: z.number().optional(),
  properties: z
    .object({
      image: z.object({ url: z.string() }).partial().optional(),
      short_description: z.string().optional(),
    })
    .passthrough()
    .optional(),
  tags: z.array(TagRef).optional(),
});
export type SearchResult = z.infer<typeof SearchResult>;

// Parse list items one by one: a single odd record is dropped instead of failing the response.
function tolerantList<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(z.unknown())
    .default([])
    .transform((arr) =>
      arr.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.infer<T>] : [];
      }),
    );
}

export const SearchResponse = z.object({ results: tolerantList(SearchResult) });

export const Explain = z.object({ entity_id: z.string(), score: z.number() });

const HoursSlot = z.object({
  opens: z.string().nullish().transform((v) => v ?? undefined),
  closes: z.string().nullish().transform((v) => v ?? undefined),
  closed: z.boolean().nullish().transform((v) => v ?? undefined),
});

export const PlaceEntity = z.object({
  entity_id: z.string(),
  name: z.string(),
  popularity: z.number().optional(),
  location: z.object({ lat: z.number(), lon: z.number() }).partial().optional(),
  tags: z.array(z.union([z.string(), TagRef])).default([]),
  query: z
    .object({
      affinity: z.number().optional(),
      explainability: z
        .object({ "signal.interests.entities": z.array(Explain).optional() })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
  properties: z
    .object({
      address: z.string().nullish(),
      phone: z.string().nullish(),
      website: z.string().nullish(),
      hours: z.record(z.string(), z.array(HoursSlot)).nullish(),
      price_level: z.number().nullish(),
      images: z.array(z.object({ url: z.string() })).nullish(),
      image: z.object({ url: z.string() }).partial().nullish(),
      short_description: z.string().nullish(),
      description: z.string().nullish(),
      keywords: z.array(z.object({ name: z.string(), count: z.number() })).nullish(),
      is_closed: z.boolean().nullish(),
      geocode: z.object({ name: z.string().nullish(), city: z.string().nullish() }).partial().nullish(),
    })
    .passthrough()
    .default({}),
});
export type PlaceEntity = z.infer<typeof PlaceEntity>;

export const Locality = z.object({
  entity_id: z.string(),
  name: z.string(),
  disambiguation: z.string().nullish().transform((v) => v ?? undefined),
  location: z.object({ lat: z.number(), lon: z.number() }).nullish().transform((v) => v ?? undefined),
});
export type Locality = z.infer<typeof Locality>;

export const PlaceInsights = z.object({
  results: z.object({ entities: tolerantList(PlaceEntity) }).default({ entities: [] }),
  query: z
    .object({
      localities: z.object({ filter: z.array(Locality).optional() }).partial().optional(),
    })
    .passthrough()
    .optional(),
});
export type PlaceInsights = z.infer<typeof PlaceInsights>;

export const TagInsight = z.object({
  tag_id: z.string(),
  name: trim,
  subtype: z.string().optional(),
  query: z.object({ affinity: z.number().optional() }).partial().optional(),
});
export type TagInsight = z.infer<typeof TagInsight>;

export const TagInsights = z.object({
  results: z.object({ tags: tolerantList(TagInsight) }).default({ tags: [] }),
});

export const TagSearch = z.object({
  results: z
    .object({
      tags: z.array(z.object({ id: z.string(), name: trim, type: z.string() })).default([]),
    })
    .default({ tags: [] }),
});
