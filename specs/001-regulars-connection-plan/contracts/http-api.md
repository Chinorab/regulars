# Contract: HTTP routes used by the UI

All routes: JSON in, Node runtime, per IP rate limit (429 with `{ error: "rate_limited",
retryAfterSec }`), errors as `{ error: code, message }` with codes `qloo_unavailable`,
`qloo_quota`, `model_unavailable`, `invalid_input`, `locality_not_found`.

| Route | Method | Body | Response |
|-------|--------|------|----------|
| `/api/resolve` | POST | `{ query }` | `{ matches: QlooEntity[<=3] }` |
| `/api/locality` | POST | `{ query, city }` | `validate_locality` output |
| `/api/taste` | POST | `{ entityIds, excludeTagIds? }` | `{ taste, rooms, sentence? }` (sentence null if model down) |
| `/api/plan` | POST | `{ profile }` | NDJSON stream: `{type:"step", label, tool, cacheHit}` … `{type:"plan", plan}` or `{type:"error", code, message}` |
| `/api/replan` | POST | `{ plan, action: {kind:"swap"|"checkin", placeId, choice?} }` | `{ plan, changes }` |
| `/api/compare` | POST | `{ profile }` | NDJSON: `{side:"without", type:"text", text, generatedAt}` and `{side:"with", type:"step"|"plan"}` for the same literal request text; per side `error` |
| `/api/mcp` | POST/GET/DELETE | MCP Streamable HTTP | see mcp-tools.md |

`profile` and `plan` match [data-model.md](../data-model.md). No route stores request bodies or logs
loves, notes or names.
