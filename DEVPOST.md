# Regulars

**Become a regular somewhere.** Name what you love. Regulars finds the places your people already
go, then plans six weeks of showing up.

Live demo: https://regulars-zeta.vercel.app · Code: https://github.com/Chinorab/regulars · License: MIT

## Inspiration

About one in three Americans feel lonely on a regular basis
([CU Boulder Today, Oct 2026](https://www.colorado.edu/today/2026/10/13/can-prescription-nature-help-cure-loneliness-epidemic)).
A study of 277,489 adults linked loneliness and isolation to the loss of nearly six years of life
free from mental disorders
([ScienceDaily, Nature Communications, Oct 2026](https://www.sciencedaily.com/releases/2026/10/261006234514.htm)),
and Congress is weighing a
[National Strategy for Social Connection Act](https://washingtonian.com/2026/10/15/congress-and-science-could-make-the-future-less-lonely/).

The advice people get is generic: get out more, join a club. It rarely sticks. Friendships tend to
form where you keep seeing the same faces, in a place full of people who like what you like. A
recent trial of nature prescriptions found that doing the activity with a group worked
significantly better for the loneliest people
([Lancet Regional Health, via CU Boulder](https://www.colorado.edu/today/2026/10/13/can-prescription-nature-help-cure-loneliness-epidemic)).
The missing piece is knowing *which* place. That is a taste question, and it is local. Qloo's taste
graph answers exactly that.

## What it does

- **Intake.** You name a few artists, films, shows, books or podcasts and your neighborhood. Each
  name becomes a real entity card with its image. You set a budget, free days, whether to leave out
  bars, and how easy talking to strangers feels.
- **Taste portrait.** Real Qloo tags, balanced across genres, keywords and the kind of rooms these
  fans prefer. Each one is removable.
- **A six week Connection Plan** in three steps: **Show up** (go alone, no pressure), **Come back**
  (same place, same time, faces repeat), **Join in** (take one small part). Each step has one real
  place and two backups.
- **Why you, with evidence.** Every card shows only what Qloo returned: hours on your free days,
  address, price level, accessibility, distance from your neighborhood center. A Why you block comes
  straight from Qloo explainability: "Project Hail Mary drove 40% of this match", the affinity
  score, what visitors mention, and which of your loves did not move it.
- **Check ins that change the plan.** "Not for me" swaps the place for the next match.
  "I'd go back" makes that place a new taste signal: in our Chicago test, after a check in at City
  Lit Books the next steps were re-ranked and the bookstore drove 34% of the new matches.
- **Without Qloo / With Qloo.** The same request goes live to the same model with no tools and to
  the grounded agent, side by side. On its own the model invented "Dice Dojo-type places" and
  cover charges; the grounded side can only name places Qloo returned.
- **Link worker mode.** Social prescribers and care teams can plan with a patient and print a large
  print, letter size sheet in English or Spanish. Nothing is stored; the form wipes itself after
  printing.
- **An MCP endpoint** exposing `find_regular_spots`, `build_connection_plan` and `explain_match`, so
  Claude Desktop or any agent can use Regulars as a tool.

No account. Plans stay in the browser.

## How we built it

- **Spec first.** GitHub Spec Kit: a constitution (truth from Qloo only, every claim sourced, privacy
  by default), a spec, clarifications, a plan, 58 tasks and a cross artifact analysis that caught
  three critical issues before any code was written.
- **Probe first.** Before writing the agent we called the live API with three cities and three taste
  profiles, about 130 calls, and wrote down what we learned (see Challenges).
- **Agent.** A Claude tool use loop on `claude-sonnet-5-5`, with three tools: `read_taste`,
  `find_places` and `submit_plan`. Each tool call streams to the page as a step ("Looking for record
  stores, bookstores, parks and music rooms near Logan Square").
- **Evidence registry.** Every Qloo record fetched during a run goes into a registry. The model only
  ever hands back place ids; the server renders every field from the registry, and `validatePlan`
  drops any id Qloo did not return for that step. Tips are filtered so they cannot carry venue facts.
- **Stack.** Next.js 16 App Router and TypeScript on Vercel, plain CSS with tokens extracted from our
  Claude Design mockups, Upstash Redis for a 24 hour cache and per visitor limits (keys and IPs are
  hashed), `mcp-handler` for the MCP endpoint.
- **Verification.** 23 unit tests, a copy lint (no em dashes, no emoji), a secret scan of the source
  and client bundle, and seven browser journeys with playwright-cli at 1440 px and 360 px, all run
  against the live APIs.

## Qloo integration

| Call | How Regulars uses it |
|---|---|
| `/search` with a `types` list | Resolve each love to an entity with image and tags, one call per name |
| `/v2/insights`, `filter.type=urn:tag`, `filter.tag.types`, `diversify.by=subtype` | Taste portrait balanced across music genres, Qloo genres and keywords |
| `/v2/insights`, `filter.tag.types=urn:tag:ambience:qloo` | The rooms these fans prefer |
| `/v2/insights`, `filter.type=urn:entity:place`, `filter.location.query`, `filter.tags` (place categories per step), `filter.exclude.tags`, `filter.exclude.entities`, `feature.explainability` | Real places per step with affinity and per love contributions; bars excluded on request; swapped or rejected places excluded |
| `/v2/insights` with a liked place in `signal.interests.entities` | Check ins re-rank the later steps around a place you want to return to |
| `/v2/insights`, `filter.results.entities` | `explain_match`: score one place for a set of loves |
| Locality resolution from `filter.location.query` | Validate the neighborhood and compute distance from its center |

We also use what Qloo returns beyond the ranking: opening hours (to respect free days), wheelchair
accessible entrance and time of day tags (for link worker needs like step free or daytime only),
review keywords ("Visitors mention"), images and coordinates.

## Challenges we ran into

- **The quota is real.** The hackathon key allows 5 requests per second and 10,000 a month. We
  budgeted about ten calls per plan, cached every answer for 24 hours, added a monthly guard and per
  visitor limits, and learned that a 429 on `/search` looks like "no match" if you do not check it.
- **Typos travel far.** An unknown or misspelled place name in `filter.location.query` does not fail:
  "Logn Sqare, Chicgo" resolved to a district of Besançon, France. Regulars accepts only a US locality
  that matches the stated city and asks the person to check the spelling otherwise.
- **Books do not move places.** Explainability showed that books barely affect place affinity, while
  artists, films and shows do. Instead of hiding that, the Why you block says so ("Dune did not move
  this match") and books still shape the taste portrait through tags.
- **Unfiltered tags are noisy.** Plain tag insights returned credit card types and seafood chowder for
  jazz fans. `filter.tag.types` plus `diversify.by=subtype` gave a portrait people recognize.
- **Participatory places are sparse.** "Join in" categories return few places at neighborhood scale,
  so the agent widens to the whole city when fewer than three qualify, and the card says so.
- **Keeping the model honest.** The mockups had friendly details like "Tuesdays at 7 pm, songwriter
  night". Qloo does not know about events, so the design changed: only Qloo fields appear, and the
  general advice is visibly separate from the evidence.

## Accomplishments that we're proud of

- Every venue fact on screen can be traced to a Qloo response from that request.
- A check in measurably changes the next recommendations, and the card shows by how much.
- A paper sheet that a link worker can hand to someone without a phone.

## What we learned

The most useful thing an agent can do with a taste graph is to stay inside it. The best moments in
the demo come from Qloo data the model could not have known: which love actually drove a match, a
store's hours on your free day, the bookstore that changes your next coffee shop.

## What's next

- Pilot link worker mode with a social prescribing team and measure return visits, not clicks.
- Optional reminders before each visit, still without an account.
- Events and recurring formats when a reliable source exists, shown only when verified.
- More languages for the printed sheet.

## Built with

Next.js · React · TypeScript · Claude API · Qloo Taste AI · Model Context Protocol · Upstash Redis ·
Vercel · GitHub Spec Kit · Playwright
