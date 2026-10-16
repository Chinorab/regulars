import { z } from "zod";

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Day = (typeof DAYS)[number];

export const TierKeySchema = z.enum(["show_up", "come_back", "join_in"]);
export type TierKey = z.infer<typeof TierKeySchema>;

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  tagIds: z.array(z.string()).max(80).optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const LocalitySchema = z.object({
  query: z.string(),
  name: z.string(),
  disambiguation: z.string(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
});
export type ResolvedLocality = z.infer<typeof LocalitySchema>;

export const ProfileSchema = z.object({
  loves: z.array(z.object({ query: z.string(), entity: EntitySchema })).min(1).max(5),
  locality: LocalitySchema,
  city: z.string().min(2).max(80),
  budget: z.enum(["free", "u15", "u40", "any"]).default("any"),
  evenings: z.array(z.enum(DAYS)).default([]),
  noAlcohol: z.boolean().default(false),
  socialEase: z.number().int().min(1).max(5).default(3),
  removedTagIds: z.array(z.string()).default([]),
  needs: z
    .object({ daytime: z.boolean().default(false), stepFree: z.boolean().default(false) })
    .default({ daytime: false, stepFree: false }),
  sample: z.string().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// A place as displayed: every field here comes from a Qloo response (see lib/plan/place.ts).
export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(z.string()),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  hours: z.record(z.string(), z.array(z.object({ opens: z.string().optional(), closes: z.string().optional(), closed: z.boolean().optional() }))).optional(),
  priceLevel: z.number().optional(),
  reviewKeywords: z.array(z.object({ name: z.string(), count: z.number() })),
  timeOfDay: z.array(z.string()),
  stepFree: z.boolean().optional(),
  barLike: z.boolean(),
  affinity: z.number().optional(),
  contributions: z.array(z.object({ entityId: z.string(), score: z.number() })),
  km: z.number().optional(),
  location: z.object({ lat: z.number(), lon: z.number() }).optional(),
  fetchedAt: z.string(),
});
export type Place = z.infer<typeof PlaceSchema>;

export const TierSchema = z.object({
  key: TierKeySchema,
  featuredId: z.string().nullable(),
  backupIds: z.array(z.string()).max(2),
  tips: z.array(z.string()).max(3),
  status: z.enum(["ok", "empty", "widened"]),
  reconsider: z.boolean().default(false),
});
export type Tier = z.infer<typeof TierSchema>;

export const AgentStepSchema = z.object({
  label: z.string(),
  tool: z.string(),
  cacheHit: z.boolean().optional(),
  at: z.string(),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  requestText: z.string(),
  tiers: z.array(TierSchema).length(3),
  places: z.record(z.string(), PlaceSchema),
  excludedPlaceIds: z.array(z.string()),
  addedSignalIds: z.array(z.string()),
  steps: z.array(AgentStepSchema),
  portrait: z.object({ headline: z.string(), body: z.string() }).optional(),
});
export type ConnectionPlan = z.infer<typeof PlanSchema>;

export type TierChange = {
  tierKey: TierKey;
  kind: "unchanged" | "replaced" | "refreshed" | "reconsider" | "earlier";
  fromId?: string;
  toId?: string;
};

export const TIER_META: Record<TierKey, { weeks: string; verb: string; goal: string }> = {
  show_up: {
    weeks: "Weeks 1 and 2",
    verb: "Show up.",
    goal: "Go alone, twice. Sit near the back. Nobody expects anything from you.",
  },
  come_back: {
    weeks: "Weeks 3 and 4",
    verb: "Come back.",
    goal: "Same place, same time of week. Let a few faces become familiar.",
  },
  join_in: {
    weeks: "Weeks 5 and 6",
    verb: "Join in.",
    goal: "Take one small part. A question, a seat at the table, a name.",
  },
};
