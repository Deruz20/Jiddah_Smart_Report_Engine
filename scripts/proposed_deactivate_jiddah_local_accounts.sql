-- PROPOSED: Soft-deactivate synthetic @jiddah.local Class Teacher accounts
-- Target: 16 Class Teacher accounts created on production on 22-23 Sep 2026.
-- SAFETY MECHANISM: Aborts inside DO block unless exactly 16 rows match.
-- AUDIT DESTINATION: public.activity_logs (matching application convention).

DO $$
DECLARE
  -- Explicit target IDs to be populated directly from probe v3 section 'jiddah_local_accounts'
  v_target_ids uuid[] := ARRAY[
    -- PROBE_TARGET_IDS_PLACEHOLDER (e.g. 'uuid1', 'uuid2', ...)
  ]::uuid[];
  v_count integer;
  v_matched_count integer;
  v_updated_teachers integer;
  v_banned_users integer;
BEGIN
  v_count := coalesce(array_length(v_target_ids, 1), 0);

  -- 1. Validate that exactly 16 target IDs are provided
  IF v_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Expected exactly 16 target IDs in explicit list, found %. Transaction rolled back.', v_count;
  END IF;

  -- 2. Verify all 16 target IDs match Class Teacher role and were created between 22-23 Sep 2026
  SELECT count(*)::int INTO v_matched_count
  FROM public.teachers
  WHERE id = ANY(v_target_ids)
    AND role = 'Class Teacher'
    AND created_at >= '2026-09-22 00:00:00+00'
    AND created_at <  '2026-09-24 00:00:00+00';

  IF v_matched_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Criteria mismatch. Found % matching teachers among the 16 target IDs. Transaction rolled back.', v_matched_count;
  END IF;

  -- 3. Soft-deactivate in public.teachers (status = 'inactive')
  UPDATE public.teachers
  SET status = 'inactive'
  WHERE id = ANY(v_target_ids);
  GET DIAGNOSTICS v_updated_teachers = ROW_COUNT;

  -- 4. Ban corresponding auth.users accounts (revoke active logins)
  UPDATE auth.users
  SET banned_until = '2099-01-01 00:00:00+00'
  WHERE id IN (
    SELECT auth_user_id FROM public.teachers WHERE id = ANY(v_target_ids) AND auth_user_id IS NOT NULL
  ) OR id = ANY(v_target_ids);
  GET DIAGNOSTICS v_banned_users = ROW_COUNT;

  -- 5. Record audit entry in public.activity_logs
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

  RAISE NOTICE 'SUCCESS: Deactivated % synthetic teacher accounts and banned % auth users.', v_updated_teachers, v_banned_users;
END $$;
