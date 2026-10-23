import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertWriteApplied } from '../lib/powersync/write-ack.ts'

test('PowerSync acknowledges only writes that return an affected row', () => {
  assert.doesNotThrow(() => assertWriteApplied('PATCH', { data: [{ id: 'row-1' }], error: null }))
  assert.throws(
    () => assertWriteApplied('PATCH', { data: [], error: null }),
    /matched no server rows/
  )
  assert.throws(
    () => assertWriteApplied('DELETE', { data: null, error: { message: 'RLS denied' } }),
    /RLS denied/
  )
})
