-- PROPOSED: Soft-deactivate synthetic @jiddah.local Class Teacher accounts
-- Target: 16 Class Teacher accounts created on production on 22-23 Sep 2026.
-- SAFETY MECHANISM: Aborts inside DO block unless exactly 16 rows match.

DO $$
DECLARE
  v_target_ids uuid[];
  v_count integer;
  v_updated_teachers integer;
  v_banned_users integer;
BEGIN
  -- 1. Identify target IDs (explicitly matching Class Teacher, @jiddah.local, created between 2026-09-22 and 2026-09-24)
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_target_ids
  FROM public.teachers
  WHERE role = 'Class Teacher'
    AND email LIKE '%@jiddah.local'
    AND created_at >= '2026-09-22 00:00:00+00'
    AND created_at <  '2026-09-24 00:00:00+00';

  v_count := coalesce(array_length(v_target_ids, 1), 0);

  IF v_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Expected exactly 16 target accounts, found %. Transaction rolled back.', v_count;
  END IF;

  -- 2. Soft-deactivate in public.teachers
  UPDATE public.teachers
  SET status = 'inactive'
  WHERE id = ANY(v_target_ids);
  GET DIAGNOSTICS v_updated_teachers = ROW_COUNT;

  -- 3. Ban corresponding auth.users accounts
  UPDATE auth.users
  SET banned_until = '2099-01-01 00:00:00+00'
  WHERE id IN (
    SELECT auth_user_id FROM public.teachers WHERE id = ANY(v_target_ids) AND auth_user_id IS NOT NULL
  ) OR id = ANY(v_target_ids);
  GET DIAGNOSTICS v_banned_users = ROW_COUNT;

  -- 4. Record audit entry in public.activity_logs
  INSERT INTO public.activity_logs (action, metadata, created_at)
  VALUES (
    'deactivate_synthetic_jiddah_local_accounts',
    jsonb_build_object(
      'target_count', v_count,
      'updated_teachers', v_updated_teachers,
      'banned_users', v_banned_users,
      'target_ids', v_target_ids,
      'timestamp', now()
    ),
    now()
  );

  RAISE NOTICE 'SUCCESS: Deactivated % synthetic teacher accounts and banned sessions.', v_updated_teachers;
END $$;
