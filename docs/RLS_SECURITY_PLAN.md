# Row Level Security (RLS) & Database Isolation Execution Plan

## 1. Executive Summary & Threat Model
Jiddah Smart Report Engine operates a dual-curriculum environment:
- **Secular Primary / Nursery (UNEB)**: English, Mathematics, Integrated Science, Social Studies, Literacy I & II.
- **Theology (IPLE)**: Qur'an, Arabic Language, Fiqh, Islamic Religious Education / Tarbiya.

### Security Boundaries
1. **Department Isolation**: Theology teachers must NOT have read/write access to secular academic records, and Secular teachers must NOT mutate theology marks.
2. **Class Stream Isolation**: Teachers may only input or edit marks for classes explicitly assigned to them in `teacher_class_assignments` (or where they are designated class teacher).
3. **Supervisory Privileges**: Directors of Studies (`dos_secular`, `dos_theology`) are restricted to their respective departments. Only `admin` / `head_teacher` accounts hold school-wide bypass authority.
4. **Defense in Depth**: While application APIs enforce `verifyDataAccess()`, database-level Row Level Security (RLS) provides a hardened perimeter against compromised tokens or unintended SQL access.

---

## 2. Server-Side Query Sanitization Audit
All queries throughout the `/api` routes and server components have been audited:
- **Parameterization**: Queries utilize Supabase PostgREST client chaining (`.eq()`, `.in()`, `.filter()`) which inherently parameterizes arguments, preventing SQL injection.
- **UUID Validation**: User and entity inputs are validated against standard RFC 4122 UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) prior to execution.
- **Service Role Scoping**: `createAdminClient()` (bypassing RLS) is strictly restricted to server-side endpoints after explicit session authentication and `verifyDataAccess()` authorization gates.

---

## 3. Database RLS Policy Architecture

### A. Helper Functions in Postgres (`auth.uid()`)
To ensure high-performance policy evaluation without recursive queries, security definer functions are deployed:
```sql
-- Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'head_teacher', 'headteacher', 'Administrator')
      AND status = 'active'
  );
$$;

-- Check if current authenticated user has active assignment to a circular class
CREATE OR REPLACE FUNCTION public.has_circular_class_access(class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    LEFT JOIN public.teacher_class_assignments tca ON tca.teacher_id = t.id
    WHERE t.auth_user_id = auth.uid()
      AND t.status = 'active'
      AND (
        t.role IN ('admin', 'head_teacher', 'dos_secular')
        OR (tca.circular_class_id = class_id)
      )
  );
$$;

-- Check if current authenticated user has active assignment to a theology class
CREATE OR REPLACE FUNCTION public.has_theology_class_access(class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    LEFT JOIN public.teacher_class_assignments tca ON tca.teacher_id = t.id
    WHERE t.auth_user_id = auth.uid()
      AND t.status = 'active'
      AND (
        t.role IN ('admin', 'head_teacher', 'dos_theology')
        OR (tca.theology_class_id = class_id)
      )
  );
$$;
```

### B. Table Policies: `marks` & `circular_marks` (Secular)
- **SELECT**: Accessible by Admins, Secular DOS, and teachers assigned to the enrollment's `circular_class_id`.
- **INSERT / UPDATE**: Restricted strictly to active teachers assigned to the subject and class, or Admins/Secular DOS when marks are unlocked.

### C. Table Policies: `theology_marks` (Theology)
- **SELECT**: Accessible by Admins, Theology DOS, and theology teachers assigned to the enrollment's `theology_class_id`.
- **INSERT / UPDATE**: Restricted strictly to theology teachers assigned to the subject and class, or Admins/Theology DOS.

---

## 4. Staging & Execution Protocol
In compliance with project standing rules:
- **No unapproved schema migrations**: The migration script `supabase/migrations/20261120_secular_theology_rls_policies.sql` is staged for review.
- **Execution Command (Upon Approval)**:
  ```bash
  npm run db:push
  npm run db:types
  ```
- **Rollback Safety**: A paired rollback script `supabase/migrations/20261120_secular_theology_rls_policies_rollback.sql` is provided to immediately revert policies should any unexpected constraint occur.
