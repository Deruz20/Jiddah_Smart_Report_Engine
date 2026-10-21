# Jiddah Smart Report Engine — Architecture & Attack Surface Analysis

**Target:** Jiddah Smart Report Engine (Clean Room / Production Baseline)  
**Framework:** Next.js App Router (16.3.6), React 19  
**Database:** Supabase PostgreSQL with Row Level Security (RLS)  
**Print System:** Client-Side DOM Isolation (`#print-portal`) with CSS `@media print`

---

## 1. Trust Boundaries & Core Components

1. **Edge Middleware & Session Layer (`src/middleware.ts`):**
   - Intercepts all incoming requests matching non-static paths.
   - Refreshes Supabase session cookies.
   - Redirects unauthenticated traffic to `/login` and verifies role landings.

2. **Application Route Guarding (`src/lib/data-access.ts`):**
   - `verifyDataAccess(cookieStore, resourceSchoolId, requiredRole)` enforces tenant isolation and RBAC.

3. **Database Security Model:**
   - Multi-tenant data partition keyed by `school_id`.
   - Tables enforce RLS policies restricting read/write to `auth.uid() = id` or matching tenant.
   - Migration `20261013_user_notification_reads.sql` remains strictly on hold for production.

4. **Document & Print Generation:**
   - **Zero headless browsers:** Reports are rendered purely in client React DOM inside an off-screen portal (`#print-portal`).
   - Triggered via `window.print()` with `@media print` styles.
   - Eliminates backend SSRF, local file inclusion, and headless Chromium execution hazards.

5. **Storage & Assets:**
   - Supabase Storage buckets: `signatures`, `user-avatars`, `documents`.
   - Upload routes sanitize file types, restrict max sizes, and canonicalize extensions.
