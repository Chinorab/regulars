# Data Model: Regulars Connection Plan

All types are TypeScript with zod schemas in `lib/qloo/schemas.ts` and `lib/plan/types.ts`.
Nothing here is stored on the server except cached Qloo responses and counters.

## Qloo side (validated from live responses)

### QlooEntity (from `/search`)
| Field | Type | Notes |
|-------|------|-------|
| id | string | `entity_id` |
| name | string | as returned |
| types | string[] | e.g. `urn:entity:artist` |
| imageUrl | string? | `properties.image.url` |
| shortDescription | string? | `properties.short_description` |
| tags | {id, name, type}[] | names trimmed |

### QlooPlace (from `/v2/insights`, `filter.type=urn:entity:place`)
| Field | Type | Notes |
|-------|------|-------|
| id, name | string | |
| location | {lat, lon} | used for distance |
| address | string? | `properties.address` |
| neighborhood | string? | `properties.geocode.name` |
| categories | string[] | from `urn:tag:category:place:*` tags |
| hours | Record<day, {opens, closes, closed}[]>? | `properties.hours` |
| priceLevel | 1..4? | often missing (18 of 49 in probes) |
| website, phone | string? | |
| images | string[] | |
| description | string? | `short_description` or `description` |
| reviewKeywords | {name, count}[] | `properties.keywords`, shown as "Visitors mention" |
| timeOfDay | string[] | `time_of_day_fit` tags |
| stepFreeEntrance | boolean? | true if the wheelchair entrance tag exists, undefined otherwise |
| isBarLike | boolean | any bar, pub, brewery, night club category or genre tag |
| affinity | number | `query.affinity` |
| contributions | {entityId, score}[] | `query.explainability["signal.interests.entities"]` |
| fetchedAt | ISO string | when the cached Qloo answer was fetched |

### TasteTag (from `/v2/insights`, `filter.type=urn:tag`)
`{ id, name (trimmed), kind: "taste" | "room", affinity, sourceEntityIds }`. Source ids come from
matching against the resolved entities' own tags; when a tag is in no entity's own tags it is
labeled "From your combined taste".

## Evidence registry (per agent run, server only)

`Map<entityId, QlooEntity | QlooPlace>` plus `calls: {tool, params, cacheHit, fetchedAt}[]`.
Rule: anything rendered as a fact must be read from the registry. `validatePlan` rejects ids not in
the registry and strips tip text matching time, price, date, distance or event patterns.

## App side

### Profile (browser)
| Field | Type | Validation |
|-------|------|------------|
| loves | {query, entity: QlooEntity}[] | 1 to 5 resolved; 3 recommended |
| locality | {query, name, disambiguation, centroid, cityName} | US and city match (FR-013a) |
| budget | "free" \| "u15" \| "u40" \| "any" | |
| evenings | Day[] | may be empty (any day) |
| noAlcohol | boolean | |
| socialEase | 1..5 | |
| removedTagIds | string[] | |
| mode | "self" \| "linkWorker" | |

### ConnectionPlan (browser)
| Field | Type |
|-------|------|
| id | string |
| createdAt, updatedAt | ISO |
| profileSnapshot | Profile |
| tiers | Tier[3] |
| excludedPlaceIds | string[] |
| addedSignalIds | string[] (liked places) |
| steps | AgentStep[] (shown as "How this plan was made") |
| places | Record<id, QlooPlace> (snapshot of registry records used) |

### Tier
`{ key: "show_up" | "come_back" | "join_in", weeks: [1,2] | [3,4] | [5,6], featuredId, backupIds
(max 2), tips: string[] (max 3, general only), status: "ok" | "empty" | "widened" }`.

### CheckIn
`{ placeId, tierKey, choice: "back" | "okay" | "not", note?, at, changes: TierChange[] }` where
`TierChange = { tierKey, kind: "unchanged" | "replaced" | "refreshed" | "reconsider", fromId?, toId? }`.

### PatientSheet (link worker, in memory only)
`{ firstName, needs: ("daytime" | "stepFree" | "free" | "noAlcohol" | "largePrint")[], language:
"en" | "es", workerName, workerPhone, plan }`. Erased on print (`afterprint`) and on "Start over".

## State transitions

```text
Plan:  draft (intake) -> building (agent steps streaming) -> ready
       ready -> adjusting (check in or swap) -> ready
       building -> failed (Qloo or model error, honest message, retry)

Place in a tier:  featured -> [not for me | swap] -> excluded; next backup -> featured
                  featured -> [I'd go back] -> kept; added as signal; later tiers refreshed
                  featured -> [It was okay] -> kept, marked reconsider
```
