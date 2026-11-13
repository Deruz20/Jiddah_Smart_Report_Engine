# Non-Interactive Database & Deployment CLI Workflow

This guide documents the non-interactive CLI rules and scripts for database migrations, TypeScript schema generation, and Vercel preview/production deployments in the **Jiddah Smart Report Engine**.

---

## 1. NPM Scripts Reference (`package.json`)

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run supabase` | `supabase` | Runs the local project-pinned Supabase CLI (`devDependency`). |
| `npm run db:types` | `supabase gen types typescript --linked > src/types/supabase.ts` | Generates TypeScript database types from the linked Supabase project into `src/types/supabase.ts`. |
| `npm run db:push` | `supabase db push` | Pushes local migrations in `supabase/migrations/` to the linked remote database. |
| `npm run db:pull` | `supabase db pull` | Pulls remote database schema changes into local `supabase/migrations/`. |
| `npm run deploy:preview` | `vercel --yes` | Deploys a non-interactive Vercel preview build. |
| `npm run deploy:prod` | `vercel --prod --yes` | Deploys to Vercel production (**requires explicit user authorization**). |

---

## 2. Environment & Secret Safety (`.env.local`)

- **Ignored Files:** `.env`, `.env.local`, `.env*.local`, and `.vercel` are explicitly ignored in `.gitignore` and must never be committed to version control.
- **Required Non-Interactive Credentials in `.env.local`:**
  - `NEXT_PUBLIC_SUPABASE_URL` — Hosted project URL (`https://vismrobdsdsaxmqegcay.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anonymous JWT key
  - `SUPABASE_SERVICE_ROLE_KEY` — Server-side service role key
  - `SUPABASE_ACCESS_TOKEN` — Personal access token for non-interactive Supabase CLI commands
  - `SUPABASE_DB_PASSWORD` — Database password for non-interactive `db:push` / `db:pull`

---

## 3. Agent & Developer Guardrails

1. **Non-Interactive Database Operations Only:**
   - Always use `npm run db:push`, `npm run db:pull`, and `npm run db:types` instead of interactive `supabase` prompts.
   - Never run destructive database resets (`supabase db reset --linked`) without explicit user approval.

2. **Pre-Deployment Verification Gate:**
   - Before running `npm run deploy:preview`, always verify:
     ```bash
     npm run typecheck
     npm test
     npm run build
     ```
   - All three checks must pass with zero errors prior to deployment.

3. **Production Deployment Restriction:**
   - **Never** run `npm run deploy:prod` unless explicitly instructed by the user.

