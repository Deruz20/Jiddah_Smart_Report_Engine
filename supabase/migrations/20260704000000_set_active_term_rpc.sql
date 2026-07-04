CREATE OR REPLACE FUNCTION set_active_term(p_term_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM terms WHERE id = p_term_id) THEN
    RAISE EXCEPTION 'Term % does not exist', p_term_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE terms SET is_current = false WHERE is_current = true;
  UPDATE terms SET is_current = true WHERE id = p_term_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_active_term(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_active_term(uuid) TO authenticated;
