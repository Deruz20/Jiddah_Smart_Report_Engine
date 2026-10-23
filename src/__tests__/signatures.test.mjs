import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getClassTeacherSignatureKey,
  getDynamicSignatureSlots,
  getReportSignatureKeys,
} from '../utils/signatures.ts'

test('report signature keys cover all class-teacher levels and both curricula', () => {
  const keys = getReportSignatureKeys()
  assert.equal(keys.includes('class-teacher-p1'), true)
  assert.equal(keys.includes('class-teacher-p7'), true)
  assert.equal(keys.includes('theology-teacher-p1'), true)
  assert.equal(keys.includes('theology-teacher-p7'), true)
  assert.equal(keys.includes('head-teacher'), true)
  assert.equal(keys.includes('principal'), true)
  assert.equal(getClassTeacherSignatureKey('Primary 4'), 'class-teacher-p4')
})

test('dynamic signature slots use active enrollment class names for each curriculum', async () => {
  const filters = []
  const query = {
    select() { return this },
    eq(column, value) {
      filters.push([column, value])
      return this
    },
    then(resolve, reject) {
      return Promise.resolve({
        data: [
          {
            circular_classes: { class_name: 'Primary 1' },
            theology_classes: { class_name_english: 'Primary 2' },
          },
        ],
        error: null,
      }).then(resolve, reject)
    },
  }
  const supabase = {
    from(table) {
      assert.equal(table, 'enrollments')
      return query
    },
  }

  const slots = await getDynamicSignatureSlots(supabase)
  const slotKeys = slots.map((slot) => slot.slot_key)

  assert.equal(slotKeys.includes('class-teacher-p1'), true)
  assert.equal(slotKeys.includes('theology-teacher-p2'), true)
  assert.equal(slotKeys.includes('theology-teacher-p1'), false)
  assert.deepEqual(filters, [
    ['is_active', true],
    ['students.is_archived', false],
  ])
})
