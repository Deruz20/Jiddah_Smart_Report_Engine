# JIDDAH OWASP ASVS & WSTG SECURITY CHECKLIST

*Operational security verification checklist for Jiddah Smart Report Engine.*

## 1. Access Control & Authorization (ASVS V4)
- [ ] **V4.1 Multi-Role Matrix Coverage:** Every route (page, API, server action) is mapped to allowed roles.
- [ ] **V4.2 Fail-Closed Authorization:** Any unrecognized or missing role defaults to 401 Unauthorized or 403 Forbidden.
- [ ] **V4.3 Row-Level Security (RLS):** Every user table in Supabase enforces RLS policies. No anonymous read/write to private school data.
- [ ] **V4.4 Anti-ID-Swapping (BOLA/IDOR):** Changing student ID, mark ID, or class ID in request parameters never grants access across students or classes.
- [ ] **V4.5 Cross-School Isolation:** User with `school_id = A` cannot query, modify, or view data from `school_id = B`.
- [ ] **V4.6 Role Tampering Prevention:** Client-supplied role attributes in user registration or update payloads are rejected (mass-assignment protection).

## 2. Authentication & Session Integrity (ASVS V2 & V3)
- [ ] **V2.1 Session Expiration:** Expired sessions redirect cleanly to `/login` without exposing internal application state.
- [ ] **V2.2 Stale Role Invalidation:** If a user's role is demoted or deactivated in the database, subsequent requests immediately reflect the demotion.
- [ ] **V3.1 Secure Cookie Configuration:** Auth tokens stored in `HttpOnly`, `SameSite=Lax/Strict`, and `Secure` cookies.
- [ ] **V3.2 Public Access Confinement:** Only `/login`, `/register`, `/reset-password`, and `/onboarding` are publicly accessible. All `/admin/*` routes require verified credentials.

## 3. Data Validation & Injection Prevention (ASVS V5)
- [ ] **V5.1 Grading Input Boundaries:** Mark inputs strictly validated: 0 <= mark <= 100, non-numeric values rejected, NaN rejected.
- [ ] **V5.2 Report Generation Sanitization (Headless Browser Safety):** Student names, comments, school motto, and template variables sanitized against HTML/XSS injection before PDF rendering via Puppeteer.
- [ ] **V5.3 CSV/Spreadsheet Formula Injection:** Exported mark sheets and report summaries sanitize leading `=`, `+`, `-`, `@` characters to prevent formula execution in Excel/Sheets.
- [ ] **V5.4 SQL Parameterization:** All direct database queries parameterized or wrapped via Supabase PostgREST client.

## 4. File Upload & Asset Handling (ASVS V12)
- [ ] **V12.1 Logo & Signature MIME Validation:** Uploaded images validated for content type (JPEG, PNG, WebP) and size (< 2MB).
- [ ] **V12.2 SVG Script Execution Prevention:** SVG files disallow embedded `<script>` or event attributes (`onload`), or converted to raster images.
- [ ] **V12.3 Path Traversal:** File storage keys strictly generated from UUIDs/hashes, rejecting user-supplied directory traversal sequences (`../`).

## 5. Information Leakage & Student Privacy (ASVS V7 & V9)
- [ ] **V7.1 Redacted Error Messages:** Database exception traces, SQL fragments, and connection strings never returned to client responses.
- [ ] **V9.1 Zero External Third-Party Transmission:** No student PII (names, marks, grades, photos) sent to third-party APIs, analytics, or external AI services.
- [ ] **V9.2 Client Bundle Secret Hygiene:** Verify client bundles contain zero `service_role` keys, database passwords, or unredacted admin secrets.
