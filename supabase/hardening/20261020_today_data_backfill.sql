-- DRAFT, run only after owner previews counts.
begin;
update public.teachers t set auth_user_id = t.id
 where t.auth_user_id is null and exists (select 1 from auth.users u where u.id = t.id);
insert into public.teacher_class_assignments (teacher_id, class_id, class_type)
 select t.id, c.id, 'theology' from public.teachers t join public.theology_classes c on c.id::text = any(t.classes) where t.role = 'Class Teacher'
 union all
 select t.id, c.id, 'circular' from public.teachers t join public.circular_classes c on c.id::text = any(t.classes) where t.role = 'Class Teacher'
 on conflict do nothing;
commit;
