-- DRAFT until rehearsal passes.
begin;
drop policy if exists tca_select_own on public.teacher_class_assignments;
create policy tca_select_own on public.teacher_class_assignments
  for select to authenticated
  using (teacher_id in (select t.id from public.teachers t where t.auth_user_id = auth.uid() or t.id = auth.uid()));

drop policy if exists theology_marks_dos_policy on public.theology_marks;
create policy theology_marks_dos_policy on public.theology_marks
  for all to authenticated
  using (exists (select 1 from public.teachers t where (t.auth_user_id = auth.uid() or t.id = auth.uid())
          and t.role = 'DOS' and lower(coalesce(t.subject,'')) = 'theology'
          and lower(coalesce(t.status,'active')) not in ('inactive','suspended','deactivated','banned')))
  with check (exists (select 1 from public.teachers t where (t.auth_user_id = auth.uid() or t.id = auth.uid())
          and t.role = 'DOS' and lower(coalesce(t.subject,'')) = 'theology'
          and lower(coalesce(t.status,'active')) not in ('inactive','suspended','deactivated','banned')));

drop policy if exists circular_marks_dos_policy on public.circular_marks;
create policy circular_marks_dos_policy on public.circular_marks
  for all to authenticated
  using (exists (select 1 from public.teachers t where (t.auth_user_id = auth.uid() or t.id = auth.uid())
          and t.role = 'DOS' and lower(coalesce(t.subject,'')) = 'secular'
          and lower(coalesce(t.status,'active')) not in ('inactive','suspended','deactivated','banned')))
  with check (exists (select 1 from public.teachers t where (t.auth_user_id = auth.uid() or t.id = auth.uid())
          and t.role = 'DOS' and lower(coalesce(t.subject,'')) = 'secular'
          and lower(coalesce(t.status,'active')) not in ('inactive','suspended','deactivated','banned')));
commit;
