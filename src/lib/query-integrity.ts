export function assertQuerySucceeded(
  operation: string,
  error: { message: string } | null
) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`)
  }
}
