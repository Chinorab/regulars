# Regulars — PROGRESS

Qloo Agentic Hackathon (Devpost). Deadline 2026-10-30 23:45 EDT. Demo online until 2026-11-16.
Full brief: first message of the build session (2026-10-15). Constitution: `.specify/memory/constitution.md`.

## Done
- 2026-10-15 Claude Design mockups (15 boards) copied to `design/` from
  https://claude.ai/artifact/T8ixwZPaTxBPWAy6cgYwpT
- 2026-10-15 Spec Kit runtime installed (`.specify/`)
- 2026-10-15 Constitution v1.0.0 written

## Decisions (user, 2026-10-15)
- Tiers: Show up / Come back / Join in (mockup copy gets updated)
- Venue cards: only Qloo fields + general "Your move" tips with no venue facts, styled apart from evidence
- Link worker needs: keep only what the Qloo probes confirm, otherwise "Call ahead to check"; Spanish covers fixed sheet text only
- Landing stats: only the 3 Oct 2026 sources from the brief, using only figures they actually contain
- Copy: no em/en dashes; avoid hyphens in UI labels ("Check in")

- 2026-10-16 spec written: `specs/001-regulars-connection-plan/spec.md` (+ checklist, all pass)
- 2026-10-16 live Qloo probes `scripts/01..05` run (~130 calls); findings in README "What the live API taught us"

## Key API facts (details in README)
- Quota: 5 req/s, 10,000 req/month → cache everything, ~10 calls per plan build
- `feature.explainability=true` = per place contribution of each loved entity → "Why you"
- Books barely move place affinity; artists/films/TV do
- Location typos resolve abroad silently → validate locality is US + city matches
- Join in: use city scope with category tags only
- price_level present 18/49 only; wheelchair entrance tag 41/49; time_of_day tags 49/49; hours 44/49

- 2026-10-16 speckit-clarify: agent picks tools (steps streamed), 1 featured + 2 backups per tier, 24 h Qloo cache
- 2026-10-16 speckit-plan: plan.md, research.md, data-model.md, contracts/ (agent tools, HTTP, MCP), quickstart.md
- Probe: a liked place works as a Qloo signal (affinity 0.97) → check in "I'd go back" is feasible

## Architecture in one line
Claude tool loop → typed Qloo tools → per run evidence registry → `submit_plan` takes ids only →
server renders facts from registry. Upstash Redis for cache + per IP limit + monthly budget guard.

- 2026-10-16 speckit-tasks (58 tasks) + speckit-analyze (3 critical fixed: HMAC keys for Upstash, Compare runs both sides live, no public deploy before privacy/journeys)
- 2026-10-16 speckit-implement Phase 1 + 2 DONE (T001 to T020): Next 16.4 + React 19, tokens in `app/tokens.css`,
  primitives in `components/ui/`, favicon `app/icon.svg` + `app/apple-icon.tsx`, Qloo client `lib/qloo/*`
  (HMAC cache, 9k/month budget guard, throttle, 429 retry), `lib/ratelimit.ts`, `lib/storage.ts`, `lib/plan/*`; 10 unit tests pass
- Icons: `@phosphor-icons/react` (import from `/dist/ssr` in server components). MCP: `mcp-handler@2` + `@modelcontextprotocol/server@2`
- Claude: model `claude-sonnet-5-5` (user choice), manual loop on `client.beta.messages` + `fallbacks: "default"`
  (beta `server-side-fallback-2026-07-01`), `tool_choice` auto only (forced = 400), effort medium, validate tool input with zod

- 2026-10-16 Phase 3 server DONE (T021 to T030): /api/resolve, /api/locality, /api/taste, /api/plan (NDJSON),
  agent `lib/agent/{registry,tools,validate,prompt,run}.ts`; 18 unit tests pass. Live Chicago run: 17 s,
  6 steps, City Lit Books / Jimmy Beans Coffee Club / Off the Wall Cafe (join in widened to city), portrait OK
- Fixed from live data: Qloo sends `opens: null` for closed days; lists parse item by item; resolve dedupes by id
- Dev server: launch config `regulars-dev` in D:\claude\.claude\launch.json, port 3761

- 2026-10-16 Phase 3 UI DONE (T031 to T036): /start (intake, ?sample=austin|chicago|seattle), /taste (portrait from
  Qloo tags, diversify.by=subtype), /plan (streamed steps, PlaceCard with Qloo fields only, WhyYou from explainability,
  DistanceDiagram from Qloo coords, swap to backups). Full Chicago journey verified in browser on live data.

- 2026-10-16 ALL USER STORIES BUILT (49/58 tasks): home + samples + sourced facts (`content/sources.ts`), check in
  with /api/replan (liked place becomes Qloo signal, verified live), /compare (both sides live, bare model invents
  "Dice Dojo-type places"), link worker (in-memory sheet, EN/ES, print CSS, wiped on afterprint), MCP /api/mcp
  (3 tools, explain_match verified), /privacy (real flows + delete button)
- Washingtonian article is behind Cloudflare: only cited for the Act's existence, no figures from it (tell user)

- 2026-10-16 Polish DONE (55/58): copy lint + secret scan (`npm run verify`), web guidelines fixes (confirm on
  destructive actions, color-scheme, touch-action, beforeunload in link worker), playwright-cli journeys A to G
  pass desktop 1440 + mobile 360 (`tests/e2e/timings.md`, plan 12 to 18 s), README complete, DEVPOST.md written
- Fixes found by journeys: reveal animations no longer hide content; broken Qloo image falls back; print CSS
  (sticky ancestor); locality shows "Name, City"; rate limit plan bucket 12/h (env RATE_LIMIT_PLAN_PER_HOUR)
- README/DEVPOST still contain placeholders [DEMO_URL] and [DEMO_DOMAIN] until deploy

- 2026-10-16 T056 DONE: public repo https://github.com/Chinorab/regulars (MIT detected, topics, homepage set);
  git identity is repo local (Anas <atikniouine93@gmail.com>)
- 2026-10-16 Vercel project `regulars` (team anas02-projects, Hobby) linked + GitHub connected; env vars set for
  production and preview (QLOO_API_KEY, ANTHROPIC_API_KEY, CACHE_KEY_SECRET); live: https://regulars-zeta.vercel.app

- 2026-10-16 Upstash: free plan = 1 DB, so the Townwatch store (upstash-kv-fuchsia-plank) is shared; connected to
  `regulars` via API (KV_REST_API_* vars); all Regulars keys under `regulars:` (verified: 18 cached Qloo answers,
  rate limit keys, budget counter in prod)
- 2026-10-16 Production journeys pass (desktop + mobile, link worker, compare, check in, errors, privacy):
  plan 18 to 23 s cold on Vercel
- 2026-10-16 Uptime routine trig_01YBYs9d8ev1wLn8mGho3WeB (daily 06:00 UTC, read only, opens a GitHub issue
  "Uptime check failing" on failure, stops reporting after 2026-11-16): https://claude.ai/code/routines/trig_01YBYs9d8ev1wLn8mGho3WeB
- ALL 58 TASKS DONE

## Current step
- Remaining for the user: Devpost submission (DEVPOST.md ready), demo video if Devpost requires one,
  disable the uptime routine after 2026-11-16 (routines cannot be deleted by the agent)
