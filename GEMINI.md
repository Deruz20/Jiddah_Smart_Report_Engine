# Gemini & Antigravity Agent Guardrails

## Non-Interactive Database & Deployment CLI Rules

1. **Database Operations (Non-Interactive Only):**
   - Always use `npm run db:push`, `npm run db:pull`, and `npm run db:types` instead of interactive `supabase` CLI prompts.
   - TypeScript database types are generated to `src/types/supabase.ts` via `npm run db:types`.
   - Never run unapproved destructive database commands or interactive CLI wizards that block execution.

2. **Pre-Deployment Verification Gate:**
   - Always run `npm run typecheck`, `npm test`, and `npm run build` to verify changes before running `npm run deploy:preview`.
   - All verification steps must pass with zero build or type errors prior to preview deployment.

3. **Production Deployment Restriction:**
   - **Never** run `npm run deploy:prod` unless explicitly instructed by the user.

4. **Environment & Secret Safety:**
   - Never commit `.env`, `.env.local`, `.env*.local`, or `.vercel` directories to version control.
   - Non-interactive Supabase CLI credentials (`SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`) are stored exclusively in `.env.local`.

