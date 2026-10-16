# Regulars

Become a regular somewhere. Regulars takes a few things you love and your neighborhood, finds real
places where people with similar taste already go, and turns them into a six week Connection Plan:
**Show up**, **Come back**, **Join in**.

Built for the Qloo Agentic Hackathon. Live demo: **https://regulars-zeta.vercel.app** (no account, three one click
examples). License: [MIT](LICENSE).

## The problem

- About **1 in 3 Americans** feel lonely on a regular basis
  ([CU Boulder Today, Oct 13, 2026](https://www.colorado.edu/today/2026/10/13/can-prescription-nature-help-cure-loneliness-epidemic)).
- In a study of **277,489 adults aged 40 to 69**, loneliness and social isolation were associated
  with the loss of **nearly six years** of life free from mental disorders
  ([ScienceDaily on a Tulane study in *Nature Communications*, Oct 2026](https://www.sciencedaily.com/releases/2026/10/261006234514.htm)).
- In a RECETAS trial of **320 lonely older adults** in Barcelona given a weekly nature prescription,
  loneliness scores fell **17% on average after one year**, and going with a group worked
  significantly better for those who started out lowest
  ([Lancet Regional Health, via CU Boulder Today](https://www.colorado.edu/today/2026/10/13/can-prescription-nature-help-cure-loneliness-epidemic)).
- Congress is weighing a
  [National Strategy for Social Connection Act](https://washingtonian.com/2026/10/15/congress-and-science-could-make-the-future-less-lonely/).

The usual advice, to get out more and join a club, rarely sticks. What tends to work is returning,
again and again, to the same place where people who like what you like are already there. The hard
part is knowing which place. That is a taste problem, and it is local.

## What it does

1. **Intake.** Name up to five artists, films, series, books or podcasts. Each is resolved to a real
   Qloo entity, shown as a card with its image, with a choice when the name is ambiguous. Add a
   neighborhood and constraints: budget, free days, no bars, how easy talking to strangers feels.
2. **Taste portrait.** Real Qloo tags (genres, keywords, the kind of rooms these fans prefer), each
   traceable and removable, plus a short reading written only from those tags.
3. **Connection Plan.** An agent calls Qloo tools and builds three tiers, each with one featured
   place and two backups. Every card shows only fields Qloo returned (hours on your free days,
   address, price level, accessibility, distance from your neighborhood center) and a **Why you**
   block from Qloo explainability: "Project Hail Mary drove 40% of this match", the affinity score,
   what visitors mention, and which of your loves did not move it.
4. **Check in.** After a visit: *I'd go back*, *It was okay* or *Not for me*. "Not for me" excludes
   the place and promotes a backup. "I'd go back" turns the place itself into a Qloo signal and
   refreshes the later tiers, so the next matches are places its regulars also like.
5. **Without Qloo / With Qloo.** The same request, sent live to the same model with no tools and to
   the grounded agent, side by side.
6. **Link worker mode.** For social prescribers: plan with a patient, print a letter size, large print
   sheet in English or Spanish. Nothing is stored; the form wipes itself after printing.
7. **MCP endpoint.** `find_regular_spots`, `build_connection_plan` and `explain_match` for any agent,
   for example Claude Desktop.

## Why it only works with Qloo

A language model alone can describe the kind of place a jazz fan might like. It cannot know that
fans of Miles Davis and John Coltrane near Ballard lean toward Sonic Boom Records, that the store
opens at 11 am on Wednesdays, or that a check in at a bookstore should shift the next suggestion
toward a specific coffee roaster. In our side by side runs the model on its own invented
"Dice Dojo-type places" and quoted cover charges. The grounded agent can only choose among places
Qloo returned, and every claim on a card is traced to a Qloo field. Concretely, Qloo gives us:

- **Cross domain affinity**: books, films, shows and artists ranked against real venues in a city.
- **Explainability**: per place, how much each love contributed. This is the "Why you" block, and it
  is honest when a love did not matter (books rarely move place affinity; see below).
- **Places as signals**: a liked venue can steer the next search, which makes check ins meaningful.
- **Structured venue data**: hours, accessibility tags, time of day fit, review keywords and
  coordinates, which let constraints be applied instead of promised.

## How it works

```text
Browser (no account, localStorage)
  /api/plan    Claude tool use loop (claude-sonnet-5-5), each step streamed to the page
                 read_taste   -> Qloo /v2/insights (tags)
                 find_places  -> Qloo /v2/insights (places + explainability), constraint filters
                 submit_plan  -> place ids only
               Evidence registry: every Qloo record fetched during the run
               validatePlan: drops ids Qloo did not return for that tier, strips venue facts from tips
  /api/replan, /api/compare, /api/taste, /api/resolve, /api/locality
  /api/mcp     Streamable HTTP, same tools
Qloo client: 24 h cache (Upstash Redis, HMAC keys), 9,000 call monthly guard, throttle, 429 retry
```

The model never writes a venue fact. It returns ids; the server renders every field from the Qloo
records collected during the run. If Qloo is down or the quota is used, the app says so and shows
nothing rather than guessing.

## Qloo calls used

| Endpoint | Key parameters | Role in Regulars |
|---|---|---|
| `GET /search` | `query`, `types` (artist, movie, tv_show, book, podcast, person), `take` | Resolve each love to an entity with image and tags (intake cards, disambiguation) |
| `GET /v2/insights` | `filter.type=urn:tag`, `signal.interests.entities`, `filter.tag.types` (music genres, Qloo genres, keywords), `diversify.by=subtype`, `diversify.take`, `filter.exclude.tags` | Taste portrait tags, balanced across tag families; removed tags excluded |
| `GET /v2/insights` | `filter.type=urn:tag`, `filter.tag.types=urn:tag:ambience:qloo` | The rooms these fans prefer (Warm, Intimate, Cozy) |
| `GET /v2/insights` | `filter.type=urn:entity:place`, `filter.location.query`, `filter.tags` (`urn:tag:category:place:*`), `filter.exclude.tags` (bars, removed tags), `filter.exclude.entities`, `signal.interests.entities`, `signal.interests.tags`, `feature.explainability=true`, `take` | Real places per tier near the neighborhood or across the city, with affinity and per love contributions |
| `GET /v2/insights` | `filter.location.query`, `filter.tags`, `take=1` | Validate the neighborhood: accept only a US locality matching the stated city; its centroid gives distances |
| `GET /v2/insights` | `signal.interests.entities` including a liked place id | Check in: re-rank later tiers around a place the person wants to return to |
| `GET /v2/insights` | `filter.results.entities`, `feature.explainability=true` | `explain_match`: score one place against a set of loves |
| `GET /v2/tags` | `filter.query` | Used in the probes to find the `urn:tag:category:place:*` ids for each tier |

## What the live API taught us

Before writing any agent code we called the hackathon Qloo API directly with three sample profiles
(Austin indie folk, Chicago science fiction, Seattle jazz and crime novels). The scripts are in
[`scripts/`](scripts/) and run with `node scripts/0N-*.mjs` once `QLOO_API_KEY` is set. Raw
responses go to `scripts/output/`, which is gitignored because Qloo's terms forbid publishing
response data. Findings, from probes run on 2026-10-16:

**Quota and limits**
- The hackathon key returns `x-second-ratelimit-limit: 5` and `x-month-ratelimit-limit: 10000`.
  Short bursts get a 429. That shaped the design: every Qloo response is cached on the server, each
  visitor is rate limited, and one plan build is budgeted at about ten calls.
- Rate limited `/search` calls can look like "no match" if the status isn't checked. The client
  retries 429s with backoff and never treats them as empty results.

**Entity resolution (`/search`)**
- `/search?query=…&types=urn:entity:artist` returns ids, images
  (`properties.image.url`), short descriptions and the entity's own tags (genres plus audience traits
  such as "Introspective" or "Devoted").
- Without `types`, ambiguous names return albums, people and films mixed together (for example,
  "Dune" returns two films, an artist, an album and the book). The intake resolves per type and
  lets the user pick.
- Agatha Christie resolves as `urn:entity:person`; books resolve with series suffixes
  ("Dune (Dune, #1)").
- `types` accepts a comma separated list. One call with artist, movie, tv_show, book, podcast and
  person returns "Dune" as two films, an artist, the book and two shows, with albums excluded.
  That gives the intake a single lookup per typed name.

**Place categories (`/v2/tags`)**
- `/v2/tags?filter.query=bookstore` returns several tag families for one idea: `category:place`,
  `genre:place`, `setting:qloo`, `nearby_attraction:qloo`. Only `urn:tag:category:place:*` works
  reliably as a venue category filter.
- Every category we needed exists: `record_store`, `book_store`, `live_music_venue`, `jazz_club`,
  `rock_climbing_gym`, `board_game_club`, `game_store`, `park`, `community_garden`,
  `botanical_garden`, `library`, `community_center`, `cafe`, `coffee_shop`, `art_studio`,
  `pottery_classes`, `dance_school`, `museum`, `cultural_center`.

**Taste portrait (`/v2/insights`, `filter.type=urn:tag`)**
- Unfiltered tag insights are noisy: jazz fans came back with credit card types, hotel ratings and
  seafood chowder.
- `filter.tag.types` fixes it. `urn:tag:genre:music,urn:tag:genre:qloo,urn:tag:keyword:qloo` gives
  a readable taste ("Hard Bop", "Crime novel", "Detective Fiction", "Victorian Era");
  `urn:tag:ambience:qloo` gives the rooms these people prefer ("Warm", "Intimate", "Cozy").
- Some tag names include stray spaces (" indie rock"), so names are trimmed before display.

**Places (`/v2/insights`, `filter.type=urn:entity:place`)**
- `filter.location.query` accepts a neighborhood ("Logan Square, Chicago") and returns the resolved
  locality with its centroid in `query.localities.filter`. All results landed within 2.6 km of the
  centroid, so walking distance can be computed from Qloo coordinates instead of guessed.
- `feature.explainability=true` returns, per place, how much each input entity contributed
  (normalized 0 to 1). This is the backbone of the "Why you" block.
- Explainability exposed something we did not expect: books barely move place affinity. In
  Seattle the places were driven by Miles Davis and John Coltrane, and running the two crime novels
  alone returned book stores with affinity 0.00. Chicago places were driven by Project Hail Mary,
  Arrival and The Expanse, and Dune did not appear. Regulars shows the user which loves actually
  shaped each match, and uses book genres through tags instead.
- Field coverage across 49 places: hours 44, image 49, website 47, description 49, review keywords
  45, accessibility tags 48 (wheelchair accessible entrance 41), time of day tags 49, price level
  only 18, price range always empty. So budget is checked only when `price_level` exists, and the card
  says so when it can't be checked.
- `urn:tag:accessibility:place:wheelchair_accessible_entrance` and
  `urn:tag:time_of_day_fit:qloo:*` mean link worker needs like "step free entrance" and "daytime
  only" can be backed by real data. When a place lacks the tag, the sheet says "Call ahead to check".
- `filter.hours=tuesday` works for the "evenings you are free" constraint.
- `filter.tags` with several categories is a union and returns places whose secondary categories
  match (a wedding venue showed up as "community center"). Results are re-checked against their
  own category tags before use.
- Participatory categories are sparse at neighborhood scale (one result for "Join in" in each city).
  Searching the whole city with category tags only gave ten good results each (Crux Climbing
  Center, Ballet Austin, Chicago Cultural Center, Youngstown Cultural Arts Center). Mixing in
  generic tags such as `activity_type:qloo:social_community` pulled bars and restaurants into
  Seattle results, so those tags are not used.
- `filter.exclude.tags` with bar categories removes most drinking venues, but review keywords can
  still mention cocktails at a cafe. The no alcohol option is applied on categories and stated
  precisely.
- `filter.results.entities` scores a given list of places against the user's signals, which is how
  a liked place is re-scored after a check in.

**Failure modes we now handle**
- Wrong key: `401 {"error":{"reason":"API keys mismatch"}}`.
- No signal and no filter: `400 "at least one valid signal or filter is required"`.
- A free text tag in `filter.tags` returns 200 with zero results, silently.
- An unknown or misspelled place name in `filter.location.query` does not fail. "Logn Sqare, Chicgo"
  resolved to a district of Besançon, France, and "Qwxzv Nowhere" to Tasmania. Regulars validates
  the resolved locality (United States, matching city) and asks the user to confirm.
- A bad `signal.location.query` is silently ignored and returns worldwide results.

## Run it locally

Requirements: Node.js 24 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` first (table below). Checks: `npm run verify` runs the typecheck, unit tests,
copy lint and secret scan. Browser journeys live in `tests/e2e/` and run with playwright-cli, for
example `playwright-cli run-code --filename=tests/e2e/journey-plan.js`. Results:
[`tests/e2e/timings.md`](tests/e2e/timings.md).

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `QLOO_API_KEY` | yes | Qloo hackathon key, server only |
| `ANTHROPIC_API_KEY` | yes | Claude API key, server only |
| `CACHE_KEY_SECRET` | yes | Random secret used to hash cache keys and visitor IPs (`openssl rand -hex 32`) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_URL`, `KV_REST_API_TOKEN` names the Vercel Upstash integration sets) | in production | Shared cache, rate limits and monthly Qloo budget, all keys under `regulars:`. Without them an in process fallback is used |
| `QLOO_MONTHLY_LIMIT` | no | Stop uncached Qloo calls after this many per month (default 9000) |
| `RATE_LIMIT_PLAN_PER_HOUR` | no | Plan builds per visitor per hour (default 12) |

## Use it from Claude Desktop (MCP)

The endpoint is `https://regulars-zeta.vercel.app/api/mcp` (Streamable HTTP). In Claude Desktop, add it as a
custom connector with that URL, or use `mcp-remote` in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "regulars": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://regulars-zeta.vercel.app/api/mcp"]
    }
  }
}
```

Then ask, for example: *"Use regulars to find places in Logan Square, Chicago for someone who loves
Dune and Arrival, and explain the top match."*

| Tool | What it returns |
|---|---|
| `find_regular_spots` | Real places for one tier with affinity, per love contributions, hours, address and distance |
| `build_connection_plan` | The full six week plan from the agent, with evidence and the steps it took |
| `explain_match` | Qloo affinity of one place for a set of loves and how much each love contributed |

## Privacy

No accounts, no cookies, no analytics. Plans live in the browser. Qloo receives the names you type
and your neighborhood; Anthropic receives the request text it plans from. Cache keys and IPs are
hashed before they reach the cache. Details on the site's privacy page
([source](app/privacy/page.tsx)).

## Design

The visual source of truth is the Claude Design canvas in [`design/`](design/); tokens live in
[`app/tokens.css`](app/tokens.css). Deliberate departures from the mockups, because the project rules
come first: tier names follow the brief (Show up, Come back, Join in); invented hours, events,
prices and walking times were removed, and cards show only Qloo fields; the decorative street map
became a distance diagram drawn from Qloo coordinates; the home statistic uses the three October 2026
sources; the privacy page describes the real flows (no accounts, email or sign in cookie).

## Built with

Next.js 16, React 19, TypeScript, Claude API (`claude-sonnet-5-5`, tool use), Qloo Taste AI,
`mcp-handler`, Upstash Redis, Vercel. Built spec first with GitHub Spec Kit; the constitution, spec,
plan and tasks are in [`.specify/`](.specify/memory/constitution.md) and
[`specs/001-regulars-connection-plan/`](specs/001-regulars-connection-plan/).

## License

[MIT](LICENSE)
