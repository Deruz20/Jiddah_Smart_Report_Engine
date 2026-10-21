-- DRAFT rollback for the rehearsal-only 20261020_today_minimal.sql.
begin;
drop policy if exists tca_select_own on public.teacher_class_assignments;
drop policy if exists theology_marks_dos_policy on public.theology_marks;
drop policy if exists circular_marks_dos_policy on public.circular_marks;
commit;
