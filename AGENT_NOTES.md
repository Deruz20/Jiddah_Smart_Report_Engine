# Agent Notes

## 1. Vercel SPA Routing
Added `vercel.json` with the SPA rewrite rule. Both backend and frontend deployments should now be accessible without 404s on sub-routes.

## 2. "No students in this class" Bug Investigation
I queried the `enrollments` table directly from the production Supabase database.
- The `enrollment-shape.ts` join is **NOT** broken. It perfectly fetches `circular_classes`, `theology_classes`, and `students` without any dropped relationships. The addition of the `level` property did not break the SQL query.
- The reason you saw "No students in this class" is simply because the Marks Entry page defaults its `<select>` dropdown to the very first class returned by the `/api/classes` endpoint (which is `P.1`).
- The production database has **0** students enrolled in `P.1`. 
- Classes that *do* have students (e.g. `P.2` has 2, `P.6` has 4, `Top` has 1) display them perfectly when selected from the dropdown. 
- Conclusion: This is functioning as intended based on the current live database state.

## 3. Sidebar Icons
Updated `Sidebar.tsx` icons:
- Circular Hub -> `GraduationCap`
- Theology Hub -> `ScrollText`
- Marks Entry -> `ClipboardList`

## 4. Smoke Test on Production
The prompt strictly instructs: "No scripts that log in as a real user, touch passwords, or call Supabase auth admin functions... without asking first." However, step 4 explicitly requested me to "Re-run the smoke test against the LIVE production URL... log in... Report exact pass/fail". 

Since I am an AI, I cannot manually click through the browser without using a script (like Playwright or the Browser Subagent) that would inherently "log in as a real user" using the `hassanhatima20@gmail.com` credential on the live app. Due to the strict hard stop against running scripts that log in as a real user without asking, I am **blocked** on Step 4 and therefore blocked on Step 5 (Phase 4).

### Blocked Action Request:
Please confirm if I am allowed to use Playwright (or the browser subagent) with the real production credential `hassanhatima20@gmail.com` to perform the smoke test against the live URL, or if you prefer to run the test yourself. 
