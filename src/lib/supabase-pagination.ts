export interface SupabaseRangeQuery<T> {
  range(
    from: number,
    to: number
  ): PromiseLike<{ data: T[] | null; error: unknown | null }>
}

export async function fetchAllSupabaseRows<T>(
  createQuery: () => SupabaseRangeQuery<T>,
  pageSize = 1000
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer.')
  }

  const rows: T[] = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery().range(offset, offset + pageSize - 1)
    if (error) throw error

    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}
