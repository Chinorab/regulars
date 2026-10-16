<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regulars project rules

- Read `PROGRESS.md` first; the constitution is `.specify/memory/constitution.md`.
- Never display a venue fact that did not come from a Qloo response (see `lib/agent/registry.ts`).
- All user facing copy in English, no em or en dashes, no emoji, no mention of AI.
- Secrets only from server environment variables; never import `lib/qloo` or `lib/agent` in client components.
