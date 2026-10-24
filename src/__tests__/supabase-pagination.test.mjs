import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllSupabaseRows } from '../lib/supabase-pagination.ts';

test('fetches every page of Supabase rows in stable ranges', async () => {
  const rows = Array.from({ length: 235 }, (_, id) => ({ id }));
  const ranges = [];

  const result = await fetchAllSupabaseRows(
    () => ({
      range: async (from, to) => {
        ranges.push([from, to]);
        return { data: rows.slice(from, to + 1), error: null };
      },
    }),
    100
  );

  assert.deepEqual(result, rows);
  assert.deepEqual(ranges, [[0, 99], [100, 199], [200, 299]]);
});

test('propagates a failed page instead of returning incomplete rows', async () => {
  const failure = new Error('page request failed');

  await assert.rejects(
    fetchAllSupabaseRows(() => ({
      range: async () => ({ data: null, error: failure }),
    })),
    (error) => error === failure
  );
});

test('rejects invalid page sizes', async () => {
  await assert.rejects(
    fetchAllSupabaseRows(
      () => ({ range: async () => ({ data: [], error: null }) }),
      0
    ),
    RangeError
  );
});
