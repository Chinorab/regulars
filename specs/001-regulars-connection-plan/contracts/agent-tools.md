# Contract: Agent tools (server side, used by the Claude loop and by MCP)

> Implementation note (2026-10-16): the loop exposes `read_taste`, `find_places` and `submit_plan`
> to the model. Entity resolution and locality validation happen before the run (intake, or the MCP
> tool in code), so the agent's user message stays the literal request text (fix C2). `read_taste`
> returns the resolved loves with ids plus taste and room tags and the constraints. `score_places`
> is used by check in and `explain_match`, not by the planning loop.

Every tool validates input with zod, calls Qloo through `lib/qloo/client.ts` (cache, budget,
throttle), writes full records into the run's evidence registry and returns a compact projection.

## resolve_entities
- Input: `{ queries: string[1..5] }`
- Qloo: `/search` per query (types artist, movie, tv_show, book, podcast, person), take 3
- Output: `{ results: { query, matches: { id, name, kind, hasImage }[] }[] }`

## get_taste_portrait
- Input: `{ entityIds: string[1..6], excludeTagIds?: string[] }`
- Qloo: two `/v2/insights` calls, `filter.type=urn:tag`, `filter.tag.types` taste set and ambience
- Output: `{ taste: { id, name, affinity }[<=12], rooms: { id, name, affinity }[<=8] }`

## validate_locality
- Input: `{ query: string, city: string }`
- Qloo: `/v2/insights` with `filter.location.query` (take 1)
- Output: `{ ok: true, name, disambiguation, centroid } | { ok: false, resolvedTo?: string }`

## find_places
- Input: `{ tier: "show_up"|"come_back"|"join_in", signalEntityIds: string[1..8], signalTagIds?:
  string[], location: string, scope: "near"|"city", days?: Day[], maxPriceLevel?: 1|2,
  noAlcohol: boolean, excludeEntityIds?: string[], excludeTagIds?: string[], take?: number<=10 }`
- Qloo: `/v2/insights` `filter.type=urn:entity:place`, `filter.tags` = tier categories,
  `filter.exclude.tags` (drinking when noAlcohol, removed tags), `filter.hours` (first day),
  `filter.price_level.max`, `feature.explainability=true`
- Post filter: own category matches tier; not bar like when noAlcohol; open on a chosen day when
  hours exist
- Output: `{ places: { id, name, categories, affinity, km, contributions: {name, score}[],
  timeOfDay, stepFree, priceLevel?, openOnChosenDays?: boolean }[], scopeUsed }`

## score_places
- Input: `{ placeIds: string[1..10], signalEntityIds: string[1..8] }`
- Qloo: `/v2/insights` with `filter.results.entities`, `feature.explainability=true`
- Output: same projection as `find_places`

## submit_plan (terminal)
- Input: `{ tiers: { tier, featuredId, backupIds: string[<=2], tips: string[<=3] }[3],
  portraitSentence?: string<=160 }`
- Server: `validatePlan` (ids in registry and in that tier's results, no duplicates, tips without
  venue facts). Invalid input returns a tool error to the model once; second failure ends the run
  with the valid subset and marks empty tiers honestly.
