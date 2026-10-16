# Implementation Plan: Regulars Connection Plan

**Branch**: `001-regulars-connection-plan` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-regulars-connection-plan/spec.md`

## Summary

A Next.js web app where a person names what they love and their neighborhood, and an agent (Claude
tool use loop) calls typed Qloo tools to resolve entities, read the taste portrait and find real
places per tier, then submits a plan by referencing place ids only. The server turns that into
display data from an **evidence registry** of the Qloo responses fetched during the run, so no
venue fact can come from the model. The same tools are exposed over MCP. Qloo answers are cached
for 24 hours and every visitor is rate limited because the hackathon key allows 5 requests per
second and 10,000 per month (see README, "What the live API taught us").

## Technical Context

**Language/Version**: TypeScript (strict), Node.js 24 runtime on Vercel

**Primary Dependencies**: Next.js 16 (App Router), React 19, `@anthropic-ai/sdk` (model
`claude-sonnet-5-5`), `mcp-handler` + `@modelcontextprotocol/sdk` (Streamable HTTP), `zod` (tool
schemas and response validation), `@upstash/redis` + `@upstash/ratelimit` (shared cache, rate
limit, monthly budget guard), `next/font` (Bricolage Grotesque, Figtree)

**Storage**: Browser `localStorage` for plan state (wrapped in try/catch, in memory fallback).
Server: Upstash Redis for the Qloo response cache (24 h TTL) and counters only, with an in process
fallback for local development. Keys are HMACs (cache keys and IPs), values hold Qloo place and tag
data only, so Upstash receives no readable user input. No user records on the server.

**Testing**: Vitest for pure logic (evidence registry, constraint filters, locality validation, plan
validation, check in reducer). playwright-cli for end to end journeys at 390 px and 1440 px against
live Qloo before each deploy.

**Target Platform**: Vercel (Fluid compute, Node runtime for API routes), evergreen browsers, phones
from 360 px wide, letter size print

**Project Type**: Web application (single Next.js project: UI, API routes, MCP endpoint)

**Performance Goals**: sample profile plan in under 60 s end to end with first visible agent step
within 3 s; cached sample plan in under 15 s; Lighthouse performance 90+ on the home page

**Constraints**: Qloo 5 req/s and 10,000 req/month shared by all visitors; about 10 Qloo calls per
uncached plan; no secrets on the client; no Qloo response data in the public repo; nothing shown
that Qloo did not return; English only (Spanish fixed text on the sheet)

**Scale/Scope**: hackathon demo traffic (tens to low hundreds of judges and visitors), 9 screens plus
loading, error and empty states, 3 MCP tools, 3 sample profiles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan satisfies it | Status |
|-----------|----------------------------|--------|
| I. Truth from Qloo only | Agent returns ids; server renders from the evidence registry; `validatePlan` drops anything not in it; tips schema forbids venue facts; error states never use fixtures | Pass |
| II. Every claim has a source | Landing figures live in one typed `sources.ts` with URL per figure; README and DEVPOST reuse it | Pass |
| III. Privacy by default | No account; `lib/storage.ts` try/catch wrapper; only Qloo and Anthropic receive user input; Upstash sees HMAC keys and Qloo data only; keys read in server modules guarded by `server-only`; privacy page lists exact flows | Pass (after analysis fix C1) |
| IV. Qloo is the engine | Agent tools are zod typed wrappers over `/search`, `/v2/tags`, `/v2/insights`; Redis cache and per IP limit; Compare runs bare model and agent live on one identical text; MCP endpoint | Pass (after analysis fix C2) |
| V. Warm, editorial, faithful | Tokens extracted to `app/tokens.css`; components use tokens only; banned patterns enforced by a copy lint script; favicon from mockup mark | Pass |
| VI. English everywhere | All copy in `content/` modules in English; Spanish only in `sheetCopy.es` | Pass |
| VII. Verified before deploy | `npm run verify` = typecheck, unit tests, copy lint, secret scan; playwright-cli journeys at 2 sizes; screenshots compared to `design/`; early previews stay behind Vercel deployment protection until privacy page and journeys pass | Pass (after analysis fix C3) |
| VIII. Spec driven, probe first | Probes in `scripts/` already run; findings drive research decisions below | Pass |

Added services: Upstash Redis (justified: serverless instances do not share memory, and the monthly
Qloo quota needs one shared counter and cache). Recorded in Complexity Tracking.

**Post design re-check (after Phase 1)**: still Pass. The evidence registry design in
[data-model.md](data-model.md) and the tool contracts in [contracts/](contracts/) make Principle I
structurally enforced rather than prompt enforced.

## Project Structure

### Documentation (this feature)

```text
specs/001-regulars-connection-plan/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent-tools.md
│   ├── http-api.md
│   └── mcp-tools.md
└── tasks.md            # next: speckit-tasks
```

### Source Code (repository root)

```text
app/
├── layout.tsx              # fonts, tokens, metadata
├── tokens.css              # single design token file (from design/)
├── globals.css
├── icon.svg                # favicon (doorway mark)
├── page.tsx                # Home + 3 sample profiles + sourced problem
├── start/page.tsx          # Intake
├── taste/page.tsx          # Taste portrait
├── plan/page.tsx           # Connection Plan + live agent steps
├── checkin/page.tsx        # Check in
├── compare/page.tsx        # Without Qloo / With Qloo
├── link-worker/page.tsx    # Link worker form + sheet preview
├── link-worker/sheet/page.tsx  # Printable sheet (letter, large print)
├── privacy/page.tsx
└── api/
    ├── resolve/route.ts    # entity search for intake cards
    ├── taste/route.ts      # taste portrait tags
    ├── plan/route.ts       # agent run, streams NDJSON steps then the plan
    ├── replan/route.ts     # check in and swap adjustments
    ├── compare/route.ts    # bare model answer (no tools)
    ├── locality/route.ts   # neighborhood validation
    └── mcp/route.ts        # MCP Streamable HTTP endpoint

components/                 # UI from mockups, tokens only (PlaceCard, WhyYou, TierSection, ...)
content/                    # copy, tier definitions, sources.ts, sheet copy (en, es)
lib/
├── qloo/                   # client.ts, schemas.ts, cache.ts, budget.ts, categories.ts
├── agent/                  # tools.ts, run.ts, prompt.ts, registry.ts, validate.ts
├── plan/                   # constraints.ts, distance.ts, checkin.ts, types.ts
├── ratelimit.ts
└── storage.ts              # client side try/catch storage wrapper
scripts/                    # live API probes (already written), copy lint, secret scan
tests/unit/                 # vitest
tests/e2e/                  # playwright-cli journey scripts and screenshots
design/                     # Claude Design mockups (source of truth)
```

**Structure Decision**: one Next.js project. UI routes, API routes and the MCP endpoint share
`lib/qloo` and `lib/agent`, so the web app and external agents use exactly the same tools.

## Phase 0 and Phase 1 outputs

- [research.md](research.md): decisions on agent loop, evidence registry, caching, rate limits,
  tier category mapping, constraints, locality validation, MCP, streaming, comparison, styling.
- [data-model.md](data-model.md): entities, validation rules, plan and check in state transitions.
- [contracts/agent-tools.md](contracts/agent-tools.md): tools the agent can call.
- [contracts/http-api.md](contracts/http-api.md): routes the UI calls.
- [contracts/mcp-tools.md](contracts/mcp-tools.md): the three public MCP tools.
- [quickstart.md](quickstart.md): how to run and validate end to end.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| Upstash Redis (Vercel Marketplace, free tier) | Shared 24 h Qloo cache, per IP rate limit, monthly Qloo budget guard across serverless instances | In process memory is per instance and resets on cold start, so it cannot protect a 10,000 call monthly quota |
| Agent loop instead of a fixed pipeline | Chosen by the user (clarification 2026-10-16); core to the Agentic Hackathon | A pipeline is faster but demonstrates less agency; mitigated by streaming steps and a 60 s cap |
