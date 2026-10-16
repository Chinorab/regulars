# Quickstart and validation: Regulars

## Prerequisites
- Node.js 24, npm
- `.env.local` with `QLOO_API_KEY`, `ANTHROPIC_API_KEY`; optional `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN` (without them cache and limits run in process)

## Run
```bash
npm install
npm run dev
```

## Validate
1. `npm run verify`: typecheck, unit tests, copy lint (no em or en dashes, emoji, banned words),
   secret scan of the repo and the client bundle.
2. Live API probes still pass: `node scripts/01-resolve-entities.mjs` (12 of 12 resolve).
3. Journeys with playwright-cli at 390x844 and 1440x900 (see `tests/e2e/`):
   - Home: click each sample profile; a plan streams steps and shows 3 tiers with Why you evidence.
   - Intake: type 3 loves and "Logan Square, Chicago"; cards with images; continue to taste.
   - Taste: remove one tag; build plan; tag no longer listed in evidence.
   - Plan: swap the Show up place; a backup appears without a network call.
   - Check in: "Not for me" replaces the place; "I'd go back" refreshes later tiers.
   - Compare: both columns render with the same request text.
   - Link worker: fill form, Spanish sheet, print preview; storage empty after print.
   - Privacy: page reachable from every footer.
   - Errors: unset `QLOO_API_KEY` locally and confirm honest error states, no fixtures.
   - Locality: "Logn Sqare, Chicgo" is rejected with a correction prompt.
4. MCP: `npx @modelcontextprotocol/inspector` against `http://localhost:3000/api/mcp`, list tools,
   call each with the Seattle sample.
5. Compare screenshots with the matching boards in `design/`.
