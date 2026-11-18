import type { SupabaseClient } from '@supabase/supabase-js'

export interface VerifiedMarksWriteResult {
  persistedRows: any[]
  error: string | null
}

function isRlsOrPermissionError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || '').toLowerCase()
  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied')
  )
}

/**
 * Persists secular or theology mark rows to Postgres via upsert + RLS-safe RPC fallback,
 * then explicitly reads rows back from Postgres so 200 OK is never returned for unpersisted writes.
 */
export async function upsertAndVerifyMarks(
  dbClient: SupabaseClient,
  table: 'circular_marks' | 'theology_marks',
  rows: Record<string, any>[],
  scope: { enrollmentId: string; termId: string }
): Promise<VerifiedMarksWriteResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { persistedRows: [], error: null }
  }

  const selectCols =
    table === 'circular_marks'
      ? 'id, enrollment_id, subject_id, term_id, bot_score, mot_score, eot_score'
      : 'id, enrollment_id, subject_id, term_id, mot_score, eot_score'

  const rpcName =
    table === 'circular_marks'
      ? 'upsert_circular_marks_scoped'
      : 'upsert_theology_marks_scoped'

  const { data: upserted, error: upsertError } = await dbClient
    .from(table)
    .upsert(rows, { onConflict: 'enrollment_id,subject_id,term_id' })
    .select(selectCols)

  if (upsertError) {
    if (isRlsOrPermissionError(upsertError)) {
      const { error: rpcError } = await dbClient.rpc(rpcName, { p_rows: rows })
      if (rpcError) {
        console.error(`${table} RPC fallback error:`, rpcError.message)
        return { persistedRows: [], error: upsertError.message || rpcError.message }
      }
    } else {
      console.error(`${table} upsert error:`, upsertError.message)
      return { persistedRows: [], error: upsertError.message }
    }
  }

  const expectedSubjectIds = [...new Set(rows.map((r) => String(r.subject_id || '')).filter(Boolean))]
  const { data: readBack, error: readBackError } = await dbClient
    .from(table)
    .select(selectCols)
    .eq('enrollment_id', scope.enrollmentId)
    .eq('term_id', scope.termId)
    .in('subject_id', expectedSubjectIds)

  if (readBackError) {
    console.error(`${table} read-back verification error:`, readBackError.message)
    return {
      persistedRows: Array.isArray(upserted) ? upserted : [],
      error: `Saved marks could not be verified in Postgres: ${readBackError.message}`,
    }
  }

  const persisted = Array.isArray(readBack) ? readBack : []
  if (persisted.length < expectedSubjectIds.length) {
    return {
      persistedRows: persisted,
      error: `Postgres write verification failed (${persisted.length}/${expectedSubjectIds.length} rows persisted). Check RLS policies on ${table}.`,
    }
  }

  return { persistedRows: persisted, error: null }
}
