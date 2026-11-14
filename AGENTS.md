<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Non-Interactive Database & Deployment CLI Rules

- Always use `npm run db:push`, `npm run db:pull`, and `npm run db:types` instead of interactive `supabase` prompts.
- Always run `npm run typecheck`, `npm test`, and `npm run build` to verify changes before running `npm run deploy:preview`.
- Never run `npm run deploy:prod` unless explicitly instructed by the user.
