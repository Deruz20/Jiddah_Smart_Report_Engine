-- ============================================================================
-- Section 9: Row Level Security (RLS) for Marks Tables
-- ============================================================================

-- Enable RLS on marks tables
alter table circular_marks enable row level security;
alter table theology_marks enable row level security;

-- Policy for circular_marks
-- Teachers can only read/write marks for classes they are assigned to (as subject teacher),
-- or classes they are the class teacher for, or if they have an admin/DOS role.
drop policy if exists "circular_marks_access_policy" on circular_marks;
create policy "circular_marks_access_policy"
on circular_marks
for all
using (
  exists (
    select 1
    from enrollments e
    join circular_classes cc on cc.id = e.circular_class_id
    join teachers t on t.auth_user_id = auth.uid()
    where e.id = circular_marks.enrollment_id
      and (
        -- Subject teacher assigned to this class
        exists (
          select 1 from teacher_class_assignments tca 
          where tca.teacher_id = t.id 
            and tca.class_id = cc.id 
            and tca.class_type = 'circular'
        )
        -- Class/form teacher — full class visibility
        or cc.class_teacher_id = t.id
        -- Admin / DOS Secular role
        or t.role in ('DOS Secular','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
)
with check (
  exists (
    select 1
    from enrollments e
    join circular_classes cc on cc.id = e.circular_class_id
    join teachers t on t.auth_user_id = auth.uid()
    where e.id = circular_marks.enrollment_id
      and (
        -- Subject teacher assigned to this class
        exists (
          select 1 from teacher_class_assignments tca 
          where tca.teacher_id = t.id 
            and tca.class_id = cc.id 
            and tca.class_type = 'circular'
        )
        -- Class/form teacher — full class visibility
        or cc.class_teacher_id = t.id
        -- Admin / DOS Secular role
        or t.role in ('DOS Secular','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
);

-- Policy for theology_marks
drop policy if exists "theology_marks_access_policy" on theology_marks;
create policy "theology_marks_access_policy"
on theology_marks
for all
using (
  exists (
    select 1
    from enrollments e
    join theology_classes tc on tc.id = e.theology_class_id
    join teachers t on t.auth_user_id = auth.uid()
    where e.id = theology_marks.enrollment_id
      and (
        -- Subject teacher assigned to this class
        exists (
          select 1 from teacher_class_assignments tca 
          where tca.teacher_id = t.id 
            and tca.class_id = tc.id 
            and tca.class_type = 'theology'
        )
        -- Theology does not have a class_teacher_id on its table, but circular homeroom teachers need access
        or exists (
          select 1 from circular_classes cc
          where cc.id = e.circular_class_id
            and cc.class_teacher_id = t.id
        )
        -- Admin / DOS Theology role
        or t.role in ('DOS Theology','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
)
with check (
  exists (
    select 1
    from enrollments e
    join theology_classes tc on tc.id = e.theology_class_id
    join teachers t on t.auth_user_id = auth.uid()
    where e.id = theology_marks.enrollment_id
      and (
        -- Subject teacher assigned to this class
        exists (
          select 1 from teacher_class_assignments tca 
          where tca.teacher_id = t.id 
            and tca.class_id = tc.id 
            and tca.class_type = 'theology'
        )
        -- Circular homeroom teachers need access to enter/compile theology marks
        or exists (
          select 1 from circular_classes cc
          where cc.id = e.circular_class_id
            and cc.class_teacher_id = t.id
        )
        -- Admin / DOS Theology role
        or t.role in ('DOS Theology','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
);
