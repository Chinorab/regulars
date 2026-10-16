# Contract: MCP tools at `/api/mcp` (Streamable HTTP)

Server name `regulars`. Same per IP limits as `/api/plan`. Errors are MCP tool errors with the same
codes as the HTTP API. Results carry the Qloo evidence so a calling agent can cite it.

## find_regular_spots
Find real places near a neighborhood where people with a given taste already go.
- Input: `{ loves: string[1..5], location: string, city: string, tier?: "show_up"|"come_back"|
  "join_in", noAlcohol?: boolean }`
- Output: `{ locality, places: [{ name, address?, categories, affinity, kmFromCenter, whyYou:
  [{ love, score }], hours?, website?, fetchedAt }] }`

## build_connection_plan
Run the full Regulars agent and return a six week plan.
- Input: `{ loves: string[1..5], location: string, city: string, budget?: "free"|"u15"|"u40"|"any",
  evenings?: Day[], noAlcohol?: boolean, socialEase?: 1..5 }`
- Output: `{ tiers: [{ tier, weeks, featured: Place, backups: Place[], tips }], steps, fetchedAt }`

## explain_match
Explain why a specific place matches a set of loves, with Qloo affinity and contributions.
- Input: `{ placeId: string, loves: string[1..5] }`
- Output: `{ place: { name, categories }, affinity, contributions: [{ love, score }] }`

Claude Desktop config (documented in README):

```json
{ "mcpServers": { "regulars": { "command": "npx", "args": ["mcp-remote", "https://<domain>/api/mcp"] } } }
```
