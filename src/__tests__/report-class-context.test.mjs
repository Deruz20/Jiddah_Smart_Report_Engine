import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasRequiredClassForReport } from '../lib/report-class-context.ts'
import { resolveSectionType } from '../lib/section-type.ts'

test('requires the class for the requested curriculum and accepts theology-only combined reports', () => {
  assert.equal(hasRequiredClassForReport('theology', false, true), true)
  assert.equal(hasRequiredClassForReport('theology', true, false), false)
  assert.equal(hasRequiredClassForReport('secular', true, false), true)
  assert.equal(hasRequiredClassForReport('secular', false, true), false)
  assert.equal(hasRequiredClassForReport('combined', false, true), true)
  assert.equal(hasRequiredClassForReport('combined', false, false), false)
})

test('maps theology levels to the canonical report section types', () => {
  assert.equal(resolveSectionType('raudha'), 'nursery')
  assert.equal(resolveSectionType('ibtidaai_lower'), 'lower_primary')
  assert.equal(resolveSectionType('ibtidaai_upper'), 'upper_primary')
})
