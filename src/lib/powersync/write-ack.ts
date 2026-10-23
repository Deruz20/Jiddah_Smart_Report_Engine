export function assertWriteApplied(
  operation: string,
  result: { data: Array<{ id: string }> | null; error: { message: string } | null }
) {
  if (result.error) throw new Error(`PowerSync ${operation} failed: ${result.error.message}`)
  if (!result.data?.length) {
    throw new Error(`PowerSync ${operation} matched no server rows; keeping the operation queued.`)
  }
}
