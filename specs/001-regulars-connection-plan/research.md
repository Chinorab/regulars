# Research: Regulars Connection Plan

Decisions below are grounded in the live probes of 2026-10-16 (`scripts/01..05`, summarized in the
README section "What the live API taught us").

## 1. Agent loop and the evidence registry

- **Decision**: Manual Claude tool use loop on the server (`claude-sonnet-5-5`), max 12 turns and a
  55 s wall clock budget. Every Qloo response a tool returns is stored in a per run **evidence
  registry** keyed by entity id. The agent finishes by calling `submit_plan`, which accepts only ids
  from the registry plus short tips. The server builds every displayed field from the registry.
- **Rationale**: Principle I becomes structural: a model cannot add a venue, hour or affinity that
  Qloo did not return because the display layer never reads model text for facts. A manual loop
  (rather than a hidden helper) lets us stream each tool call to the UI as a visible step.
- **Alternatives**: fixed pipeline (rejected by user for agency); letting the model write cards and
  then fact checking text (fragile).

## 2. What the model sees from Qloo

- **Decision**: Tools return compact projections (name, id, categories, affinity, explainability,
  distance, time of day tags, accessibility flag, price level, top review keywords), not raw
  payloads. The registry keeps the full validated record.
- **Rationale**: Raw place payloads are large (50+ tags, localities). Compact results cut tokens and
  latency, and keep the model focused on choosing.

## 3. Caching and quota

- **Decision**: Cache key = HMAC SHA-256 (server secret `CACHE_KEY_SECRET`) of method + path + sorted
  query string, so Upstash never sees what a person typed. Values are Qloo responses with the echoed
  `query` request block removed (place and tag data only). TTL 24 h (clarification). Store in
  Upstash Redis; fall back to an in process Map in development. A monthly budget counter stops new
  uncached Qloo calls at 9,000 per month and shows an honest "quota reached" message. Responses keep
  a `fetchedAt` time shown on cards.
- **Rationale**: 10,000 calls a month shared by all visitors; one uncached plan costs about 10.
  Samples become cheap after the first run while still being real Qloo answers.
- **Alternatives**: Next.js fetch Data Cache (no shared counter, harder to show `fetchedAt`); Vercel
  Runtime Cache (no atomic counters for rate limits).

## 4. Rate limiting

- **Decision**: `@upstash/ratelimit` sliding window keyed by an HMAC of the IP (never the raw IP): 6 plan builds per hour, 60 lightweight
  calls (resolve, locality) per 10 minutes; MCP calls share the plan limit. Outbound Qloo calls go
  through a token bucket of 4 per second to stay under the 5 per second key limit, with 429 retry
  and backoff.
- **Rationale**: Probe 1 lost results to 429 bursts before throttling.

## 5. Entity resolution

- **Decision**: For each typed love, query `/search` with the types artist, movie, tv_show, book,
  podcast, person in one call (`types` comma list, still to be verified live in the first
  implementation task; fallback is untyped search filtered to those types) and present the top three
  with images for the user to confirm. Never treat a 429 as no match.
- **Rationale**: Untyped search mixes albums and people ("Dune" returns films, an artist, an album
  and the book). Confirmation also fixes the Agatha Christie person versus author case.

## 6. Taste portrait

- **Decision**: Two `/v2/insights` calls with `filter.type=urn:tag`: one with
  `filter.tag.types=urn:tag:genre:music,urn:tag:genre:qloo,urn:tag:keyword:qloo` (what they love),
  one with `urn:tag:ambience:qloo` (the rooms they like). Trim names. The model may write one
  sentence from these tags, displayed as a reading of them. Removed tags go into
  `filter.exclude.tags` on later calls.
- **Rationale**: Unfiltered tag insights returned credit cards and dishes.

## 7. Tier category mapping

- **Decision** (all `urn:tag:category:place:*`):
  - Show up: `record_store`, `book_store`, `park`, `botanical_garden`, `museum`, `library`,
    `live_music_venue`, `jazz_club`
  - Come back: `cafe`, `coffee_shop`, `comic_book_store`, `game_store`, `rock_climbing_gym`,
    `yoga_studio`
  - Join in: `board_game_club`, `community_garden`, `community_center`, `cultural_center`,
    `art_studio`, `pottery_classes`, `dance_school`, `rock_climbing_gym`
  - Social ease 1 to 2: in Show up, drop places whose only time of day tags are `late_night`.
    Social ease 4 to 5: Join in categories may also appear in Come back.
- **Rationale**: Probe 4 confirmed coverage; Join in needed city scope (probe 5). Results are
  re-checked against each place's own category tags because multi tag filters are a union.
- **Alternatives**: generic tags like `activity_type:qloo:social_community` (pulled bars into
  Seattle results).

## 8. Constraints

- **Budget**: apply `filter.price_level.max` only when budget is Free (1) or Under $15 (1 to 2);
  cards where `price_level` is missing say "Price not listed". Never claim "free".
- **Evenings**: when the user picks days, pass `filter.hours=<day>` and check the place's hours for
  that day; show the real opening hours for chosen days from `properties.hours`.
- **No alcohol**: `filter.exclude.tags` with `bar`, `pub`, `brewery`, `night_club`, `cocktail_bar`,
  `wine_bar`, `beer_garden`, `brewpub`, plus a post filter on the place's own `genre:place:bar`
  tags. Copy says "Not a bar or brewery" rather than "alcohol free".
- **Daytime only / step free** (link worker): `time_of_day_fit` tags and
  `accessibility:place:wheelchair_accessible_entrance`; missing tag means "Call ahead to check".

## 9. Locality validation

- **Decision**: `/api/locality` sends `filter.location.query` with a cheap signal and reads
  `query.localities.filter[0]`. Accept only when `disambiguation` contains "United States" and the
  user's city token. Otherwise ask the user to correct it. The resolved centroid is used for
  distance.
- **Rationale**: typos resolved to France and Tasmania without errors (probe 5).

## 10. Check in and swap

- **Decision**: "Not for me" adds the id to `excluded` and promotes the next backup; when no backup
  remains, `/api/replan` runs one Qloo call for that tier with `filter.exclude.entities`. "I'd go
  back" adds the place id to signals and refreshes the later tiers (probe: a place as signal gives
  strong affinity and explainability credits it). "It was okay" marks it for reconsideration.
- **Rationale**: backups make most changes free; replans cost one call per tier.

## 11. Streaming

- **Decision**: `/api/plan` returns `application/x-ndjson` lines: `step`, `place_preview`,
  `plan`, `error`. The UI renders steps in the mockup's style. Node runtime, `maxDuration` 60.

## 12. Without Qloo / With Qloo

- **Decision**: One request text is built from the profile (the quote shown on the Compare screen).
  The agent's user message is always that literal text, so the plan itself answers it. On Compare,
  `/api/compare` runs both sides live and in parallel: the same model with no tools, and the agent
  with tools on the same text (Qloo answers mostly come from the 24 h cache, so the grounded side costs
  few or no new Qloo calls). Both columns show when they were generated. The left column is shown
  unedited.

## 13. MCP endpoint

- **Decision**: `mcp-handler` at `/api/mcp` (Streamable HTTP), three tools sharing `lib/agent/tools`.
  Claude Desktop config uses `npx mcp-remote https://<domain>/api/mcp`; claude.ai custom connectors
  use the URL directly. No auth; rate limited per IP.

## 14. Styling and design fidelity

- **Decision**: Plain CSS with custom properties in one `app/tokens.css` and CSS Modules per
  component; the mockups are inline styled HTML so translating values one to one is the most faithful
  path. Fonts through `next/font/google`. Images from `images.qloo.com` via `next/image`
  remotePatterns; striped placeholder when absent.
- **Mockup corrections** (rules win, reported to user): tier names; invented hours, events, prices
  and walking times removed; Surgeon General stat replaced by the three October 2026 sources; privacy
  page rewritten (no accounts, email, sign in cookie or retention placeholders); "Check In" label kept
  without hyphen; door illustration gradient is warm amber, not violet, so it stays.

## 15. Testing

- **Decision**: Vitest for `lib/` units with recorded shapes typed from schemas (no stored Qloo
  data in the repo). playwright-cli journeys run against a local or preview deployment with the
  live API; screenshots at 390 and 1440 compared with `design/` boards.
