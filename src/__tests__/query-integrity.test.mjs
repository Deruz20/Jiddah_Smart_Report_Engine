import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertQuerySucceeded } from '../lib/query-integrity.ts'

test('report data reads fail explicitly instead of returning partial success', () => {
  assert.doesNotThrow(() => assertQuerySucceeded('grading criteria', null))
  assert.throws(
    () => assertQuerySucceeded('class rankings', { message: 'permission denied' }),
    /class rankings failed: permission denied/
  )
})
