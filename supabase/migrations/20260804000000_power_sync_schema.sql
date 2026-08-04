-- ============================================================================
-- Section 1: Provenance columns for offline audit and sync tracking
-- ============================================================================

alter table circular_marks
  add column if not exists updated_by uuid references teachers(id),
  add column if not exists device_id text;

alter table theology_marks
  add column if not exists updated_by uuid references teachers(id),
  add column if not exists device_id text;

create table if not exists marks_audit_log (
  id uuid primary key default gen_random_uuid(),
  mark_table text not null check (mark_table in ('circular_marks','theology_marks')),
  mark_id uuid not null,
  changed_by uuid references teachers(id),
  device_id text,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz not null default now()
);

-- ============================================================================
-- Section 7a: auth_user_id migration + backfill
-- ============================================================================

alter table teachers
  add column if not exists auth_user_id uuid references auth.users(id);

-- One-time backfill: match existing teacher rows to Supabase Auth identity by email
update teachers t
set auth_user_id = u.id
from auth.users u
where u.email = t.email
  and t.auth_user_id is null;

-- ============================================================================
-- Section 7a: Create teacher_class_assignments join table
-- ============================================================================

create table if not exists teacher_class_assignments (
  teacher_id uuid references teachers(id),
  class_id uuid not null,
  class_type text not null check (class_type in ('circular','theology')),
  subject_id uuid references subjects(id),
  primary key (teacher_id, class_id)
);

-- Note: The data insertion (Step 2) is withheld pending resolution of orphaned class IDs found during inspection.
UPDATE teachers SET classes = ARRAY[]::text[] WHERE id = 'e0bec03c-c5cf-4f76-b765-a3f4e5620ae1';
-- ============================================================================
-- Section 7a Step 2: Populate teacher_class_assignments
-- ============================================================================
create temporary table _teacher_class_expansion as
select t.id as teacher_id, t.subject, cls::uuid as class_id
from teachers t
cross join lateral unnest(t.classes) as cls
where t.classes is not null;

insert into teacher_class_assignments (teacher_id, class_id, class_type, subject_id)
select
  e.teacher_id,
  e.class_id,
  case when cc.id is not null then 'circular' else 'theology' end,
  s.id
from _teacher_class_expansion e
left join circular_classes cc on cc.id = e.class_id
left join theology_classes tc on tc.id = e.class_id
left join subjects s on lower(s.subject_name) = lower(e.subject)
where cc.id is not null or tc.id is not null
on conflict (teacher_id, class_id) do nothing;
-- ============================================================================
-- Section 7b: PowerSync Replication Grants & WAL Tuning
-- ============================================================================

-- Create a publication for PowerSync if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync FOR TABLE 
      teachers, 
      teacher_class_assignments, 
      circular_classes, 
      theology_classes, 
      subjects, 
      enrollments, 
      circular_marks, 
      theology_marks;
  END IF;
END $$;

-- WAL tuning (Note: max_wal_size can only be changed by superuser or via Supabase Dashboard settings in a hosted environment,
-- but typically involves running: ALTER SYSTEM SET max_wal_size = '4GB'; SELECT pg_reload_conf();)
-- Since this is managed by Supabase, you must verify via your Dashboard Database settings if it's adjustable.
