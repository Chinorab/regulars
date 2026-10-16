---
description: "Task list for Regulars Connection Plan"
---

# Tasks: Regulars Connection Plan

**Input**: Design documents from `/specs/001-regulars-connection-plan/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the constitution (Principle VII): Vitest units for `lib/` logic and
playwright-cli journeys before each deploy.

**Organization**: grouped by user story (spec.md). Single Next.js project at repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1 to US7 from spec.md

---

## Phase 1: Setup

- [X] T001 Scaffold Next.js 16 App Router + TypeScript (strict) at repository root without Tailwind, keeping `design/`, `scripts/`, `specs/`, `.specify/` intact; create `package.json` scripts `dev`, `build`, `typecheck`, `test`, `verify`
- [X] T002 [P] Add dependencies `@anthropic-ai/sdk`, `mcp-handler`, `@modelcontextprotocol/sdk`, `zod`, `@upstash/redis`, `@upstash/ratelimit`, `server-only`; dev `vitest`; record in `package.json`
- [X] T003 [P] Configure `next.config.ts` (images remotePatterns for `images.qloo.com`, security headers, no `x-powered-by`) and `tsconfig.json` paths `@/*`
- [X] T004 [P] Add `.env.example` keys (`QLOO_API_KEY`, `ANTHROPIC_API_KEY`, `CACHE_KEY_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) and confirm `.gitignore` covers `.env*` and `scripts/output/`
- [X] T005 [P] Add MIT `LICENSE` file at repository root (copyright 2026 Regulars contributors)

---

## Phase 2: Foundational (blocks all stories)

**Design system**
- [X] T006 Extract design tokens from `design/*.dc.html` (colors, type scale, spacing, radii, motion, focus ring) into `app/tokens.css`; document mapping in a comment header
- [X] T007 Set up fonts (Bricolage Grotesque, Figtree) via `next/font/google` and base styles in `app/layout.tsx` and `app/globals.css` (reduced motion, focus visible, 44px targets)
- [X] T008 [P] Create favicon `app/icon.svg` and `app/apple-icon.png` from the doorway mark in `design/Favicon.dc.html`
- [X] T009 [P] Build shared UI primitives from tokens in `components/ui/` (Button primary and ghost, Toggle, Field, Wordmark, Header, Footer, Icon set as inline stroke SVG, Skeleton, Notice for errors)

**Qloo core**
- [X] T010 Write zod schemas for search, tags, entity insights, place insights, explainability, localities in `lib/qloo/schemas.ts` (trim tag names)
- [X] T011 Implement cache adapter (Upstash Redis with in process fallback, 24 h TTL, stores `fetchedAt`; keys are HMAC SHA-256 with `CACHE_KEY_SECRET`; strip the echoed `query` request block from values) in `lib/qloo/cache.ts`
- [X] T012 Implement monthly budget guard (stop uncached calls at 9,000 per month) and outbound throttle (4 per second, 429 backoff) in `lib/qloo/budget.ts`
- [X] T013 Implement typed Qloo client (`search`, `tags`, `insightsTags`, `insightsPlaces`, `scorePlaces`) using cache, budget, schemas, `server-only`, typed errors `qloo_unavailable` and `qloo_quota` in `lib/qloo/client.ts`
- [X] T014 [P] Define tier category sets, drinking tags, taste and ambience tag types in `lib/qloo/categories.ts` (from research.md section 7 and 8)
- [X] T015 [P] Implement per IP rate limiting helpers (plan, light, mcp buckets; identifier is an HMAC of the IP, never the raw IP) in `lib/ratelimit.ts`
- [X] T016 [P] Implement client storage wrapper with try/catch and in memory fallback in `lib/storage.ts`
- [X] T017 [P] Implement place projection helpers (categories, isBarLike, stepFree, timeOfDay, hours for day, distance from centroid) in `lib/plan/place.ts` and `lib/plan/distance.ts`
- [X] T018 [P] Define app types and zod schemas (Profile, ConnectionPlan, Tier, CheckIn, AgentStep) in `lib/plan/types.ts`
- [X] T019 Verify `/search` `types` comma list live and record the result in README "What the live API taught us" via `scripts/06-search-types.mjs`
- [X] T020 [P] Unit tests for schemas, projection, distance, storage fallback in `tests/unit/place.test.ts`

**Checkpoint**: tokens, primitives and a cached, budgeted Qloo client exist.

---

## Phase 3: User Story 1, plan from what I love (P1) MVP

**Goal**: intake, taste portrait, agent built three tier plan with Why you evidence.
**Independent test**: "Big Thief, Past Lives, The Bear" + "Logan Square, Chicago" gives three tiers of real places with evidence.

- [X] T021 [P] [US1] Implement `/api/resolve` (top 3 matches with images) in `app/api/resolve/route.ts`
- [X] T022 [P] [US1] Implement `/api/locality` with US and city validation in `app/api/locality/route.ts` and `lib/plan/locality.ts`
- [X] T023 [P] [US1] Implement `/api/taste` (two tag insight calls, optional one sentence reading) in `app/api/taste/route.ts`
- [X] T024 [US1] Implement evidence registry in `lib/agent/registry.ts`
- [X] T025 [US1] Implement agent tools per `contracts/agent-tools.md` (resolve_entities, get_taste_portrait, validate_locality, find_places with post filters and city widening, score_places, submit_plan) in `lib/agent/tools.ts`
- [X] T026 [US1] Implement `validatePlan` (ids in registry and tier results, no duplicates, tips stripped of times, prices, dates, distances, events) in `lib/agent/validate.ts`
- [X] T027 [US1] Write system prompt (tiers, social ease pacing, constraints, ids only, general tips) and `buildRequestText(profile)` whose literal output is the agent's user message and the Compare quote, in `lib/agent/prompt.ts`
- [X] T028 [US1] Implement agent loop (claude-sonnet-5-5, max 12 turns, 55 s budget, step events) in `lib/agent/run.ts`
- [X] T029 [US1] Implement `/api/plan` NDJSON stream (step, plan, error) with rate limit and `maxDuration` in `app/api/plan/route.ts`
- [X] T030 [P] [US1] Unit tests for validatePlan, constraints and locality validation in `tests/unit/validate.test.ts`
- [X] T031 [US1] Build Intake screen from `design/Intake.dc.html` and `design/MobileIntake.dc.html` (entity cards, disambiguation, constraints) in `app/start/page.tsx` and `components/intake/`
- [X] T032 [US1] Build Taste screen from `design/Taste.dc.html` and `design/MobileTaste.dc.html` (real tags, removable, sources aside) in `app/taste/page.tsx` and `components/taste/`
- [X] T033 [US1] Build Plan screen from `design/Plan.dc.html` and `design/MobilePlan.dc.html` (tier timeline, PlaceCard with Qloo fields only, WhyYou, Your move tips styled apart, fetchedAt, live agent steps, swap to backup) in `app/plan/page.tsx` and `components/plan/`
- [X] T034 [US1] Design and build loading, Qloo error, quota reached, empty tier (with an offer to relax one named constraint) and model unavailable states in the same visual language in `components/states/`
- [X] T035 [US1] Persist profile and plan through `lib/storage.ts` with a client store in `lib/plan/store.ts`

**Checkpoint**: MVP works end to end on live data.

---

## Phase 4: User Story 2, one click samples (P1)

- [X] T036 [P] [US2] Define the three sample profiles (Austin, Chicago, Seattle) as inputs only in `content/samples.ts`
- [X] T037 [US2] Build Home screen from `design/Main.dc.html` and `design/MobileHome.dc.html` with sample buttons that prefill intake and start a live build, labeled Sample profile, in `app/page.tsx` and `components/home/`

---

## Phase 5: User Story 3, check in (P2)

- [X] T038 [US3] Implement check in reducer (not for me, okay, back; TierChange list) in `lib/plan/checkin.ts` with tests in `tests/unit/checkin.test.ts`
- [X] T039 [US3] Implement `/api/replan` (exclude and replace when backups run out; liked place as signal for later tiers) in `app/api/replan/route.ts`
- [X] T040 [US3] Build Check in screen from `design/Checkin.dc.html` and `design/MobileCheckin.dc.html` with real change summary in `app/checkin/page.tsx` and `components/checkin/`

---

## Phase 6: User Story 4, Without Qloo / With Qloo (P2)

- [X] T041 [US4] Implement `/api/compare` running both sides live and in parallel on the literal `buildRequestText(profile)`: bare model with no tools, and the agent with tools (cache keeps Qloo cost low), streamed per side, in `app/api/compare/route.ts`
- [X] T042 [US4] Build Compare screen from `design/Compare.dc.html` (request shown once, two live columns, evidence on the right, per side errors) in `app/compare/page.tsx` and `components/compare/`

---

## Phase 7: User Story 5, link worker mode (P2)

- [X] T043 [P] [US5] Write sheet copy in English and Spanish in `content/sheet.ts`
- [X] T044 [US5] Build Link worker form and live preview from `design/LinkWorker.dc.html` (needs backed by tags, else Call ahead to check) in `app/link-worker/page.tsx` and `components/linkworker/`
- [X] T045 [US5] Build printable sheet from `design/PatientSheet.dc.html` (letter, large print, check boxes, worker contact, erase on afterprint and Start over), rendered in memory on the same page with print CSS so nothing is stored, in `components/linkworker/PatientSheet.tsx` and `app/globals.css`

---

## Phase 8: User Story 6, MCP endpoint (P3)

- [X] T046 [US6] Implement MCP server with find_regular_spots, build_connection_plan, explain_match per `contracts/mcp-tools.md` in `app/api/mcp/[transport]/route.ts` and `lib/mcp/server.ts`
- [X] T047 [US6] Validate with MCP Inspector and record Claude Desktop config in README

---

## Phase 9: User Story 7, landing problem and privacy (P3)

- [X] T048 [P] [US7] Read the three October 2026 sources and record only figures they contain, with URLs, in `content/sources.ts`
- [X] T049 [US7] Add the sourced problem section to Home in `components/home/Problem.tsx`
- [X] T050 [US7] Build Privacy page from `design/Privacy.dc.html`, rewritten to match real flows (no account, browser storage, Qloo and Anthropic only, 24 h server cache of Qloo answers keyed by hashes, hashed IPs for rate limits, no analytics) in `app/privacy/page.tsx`

---

## Phase 10: Polish and release

- [X] T051 [P] Copy lint (em and en dashes, emoji, AI mentions, banned words) and secret scan (repo and `.next/static`) in `scripts/lint-copy.mjs` and `scripts/scan-secrets.mjs`, wired into `npm run verify`
- [X] T052 Accessibility and guidelines pass with web-design-guidelines skill across all screens
- [X] T053 playwright-cli journeys at 390x844 and 1440x900 per quickstart.md, screenshots in `tests/e2e/screens/`, compared with `design/`; record timings for the three samples (first step under 3 s, plan under 60 s) in `tests/e2e/timings.md`
- [X] T054 Complete README (problem with sources, demo, why it only works with Qloo, Qloo calls table, API lessons, install, env vars, MCP config, license) in `README.md`
- [X] T055 Write `DEVPOST.md` (Inspiration, What it does, How we built it, Qloo integration, Challenges, What's next)
- [X] T056 Create public GitHub repo `Chinorab/regulars` with MIT license and About description; push
- [X] T057 Deploy to Vercel with deploy-to-vercel skill (env vars, Upstash from Marketplace), rerun journeys on production URL
- [X] T058 Schedule a check that the demo stays online until 2026-11-16

---

## Dependencies

- Phase 1 then Phase 2 block everything.
- US1 (Phase 3) is the base for US2, US3, US4, US5, US6.
- US2 needs US1 screens; US3 and US4 need a plan; US5 reuses the agent; US6 reuses `lib/agent/tools`.
- US7 is independent after Phase 2 (privacy, sources) and can run alongside US1.
- Phase 10 after all stories; T057 deploy only after T051 to T053 pass and favicon (T008) and
  privacy (T050) exist.

## Parallel examples

- Phase 2: T008, T009, T014, T015, T016, T017, T018 in parallel after T006 and T010.
- US1: T021, T022, T023 in parallel; T030 alongside T031.
- US7: T048 alongside any US1 task.

## Implementation strategy

1. MVP: Phases 1 to 3 plus T036 and T037 (samples) so judges can try it in one click.
2. Then US3 and US4 (strongest proof of Qloo depth), US5, US6, US7.
3. Deploy a preview early (after MVP) only behind Vercel deployment protection, to catch Vercel
   specifics. No public deploy until the privacy page (T050), favicon (T008) and T051 to T053 pass.
