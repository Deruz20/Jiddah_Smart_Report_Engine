# JIDDAH SMART REPORT ENGINE — STAGING DEPLOYMENT & DEVELOPER ONBOARDING GUIDE

**Governing Standard:** Safe staging environments and reproducible bootstrapping without touching production.

---

## 1. Staging Architecture Options

Because Jiddah is deployed on Supabase and Vercel, the owner has two highly cost-effective options for staging:

### Option A: Dedicated Free-Tier Supabase Project (Recommended for Cloud Verification)
- **Cost:** Free ($0/mo) on Supabase Free Tier.
- **Isolation:** Complete separation from production credentials, users, and student records.
- **Vercel Integration:** Configured as environment variables scoped exclusively to Vercel **Preview** environments.
- **Workflow:**
  1. Create project `jiddah-smart-report-staging` in Supabase Dashboard.
  2. Apply repo migrations from `supabase/migrations/` in order.
  3. Seed synthetic test data using `scripts/seed-rehearsal-synthetic-users.mjs`.
  4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel under Environment Variables -> **Preview only**.

### Option B: Local Docker Rehearsal Stack (Zero Cloud Dependency)
- **Cost:** $0.
- **Speed:** Instant local resets; runs completely offline.
- **Stack:** Docker container running PostgreSQL 15 on port `54322` with Supabase Auth and PostgREST.
- **Workflow:**
  1. Start container: `docker compose up -d` or isolated rehearsal container.
  2. Run bootstrap verification: `node scripts/test-fresh-db-bootstrap.mjs`.
  3. Run local dev server pointing to localhost: `npm run dev:local`.

---

## 2. Fresh Database Bootstrap Verification

The migration pipeline has been proven reproducible. 22 repository migrations in `supabase/migrations/` apply sequentially to an empty PostgreSQL database with 0 manual alignment scripts.

To verify on any machine with Docker installed:
```powershell
node scripts/test-fresh-db-bootstrap.mjs
```
**Verification Evidence:**
- 33 tables created cleanly.
- RLS enabled across all sensitive entities.
- Canonical constraints for `teachers`, `teacher_invites`, and `academic_terms` established.

---

## 3. Developer Onboarding Checklist (Step-by-Step)

A new engineer onboarding to Jiddah should follow these exact steps:

### Step 1: Clone & Dependency Installation
```powershell
git clone https://github.com/Deruz20/Jiddah_Smart_Report_Engine.git
cd Jiddah_Smart_Report_Engine
npm install
```

### Step 2: Environment Configuration
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<local_service_role_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```
*Note: Never commit `.env.local` to git.*

### Step 3: Run Database Migrations
For staging or local instance:
```powershell
# Using Supabase CLI (if installed)
npx supabase db push

# Or using the direct migration runner
node scripts/test-fresh-db-bootstrap.mjs
```

### Step 4: Run Verification Tests
```powershell
npm run typecheck
npm test
```
**Acceptance Criteria:**
- `tsc --noEmit` exits with code 0 (0 errors).
- `npm test` passes all 253+ unit and invariant tests across 47 suites.

### Step 5: Start Local Development Server
```powershell
# Port 3000 is reserved for production audit; start on secondary port 3001
npm run dev -- -p 3001
```
Open `http://localhost:3001` in your browser. Verify the login screen renders cleanly with the warm paper aesthetic.

---

## 4. Staging-to-Production Release Gate Protocol

Before any changes from staging or preview are deployed to production:
1. **Zero Secret Leakage:** Run `git ls-files | findstr "\.env"` to confirm 0 secret files tracked.
2. **Typecheck & Test Pass:** `npm run typecheck && npm test` must pass with exit code 0.
3. **Owner Checklist Sign-off:** Follow the exact manual steps in `OWNER_CHECKLIST.md`.
4. **Vercel Preview Smoke Test:** Test login, marks entry, and report card generation on the preview deployment URL before promoting to production.
