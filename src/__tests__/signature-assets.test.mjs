import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getDynamicSignatureSlots,
  getReportSignatureKeys,
  getReportSignatures,
  mapLatestSignatureObjects,
} from '../utils/signatures.ts'

test('report signature keys include stamp and both class-teacher curricula', () => {
  const keys = getReportSignatureKeys()
  assert.ok(keys.includes('school-stamp'))
  assert.ok(keys.includes('class-teacher-p1'))
  assert.ok(keys.includes('theology-teacher-p1'))
  assert.ok(keys.includes('class-teacher-p7'))
  assert.ok(keys.includes('theology-teacher-p7'))
})

test('all report templates render the uploaded school stamp in their existing stamp slot', () => {
  const templates = [
    'NurseryEOTReport.tsx',
    'NurseryMOTReport.tsx',
    'NurseryTheologyEOTReport.tsx',
    'P7EOTReport.tsx',
    'PrimaryBOTReport.tsx',
    'PrimaryEOTReport.tsx',
    'PrimaryMOTReport.tsx',
    'TheologyMOTReport.tsx',
  ]

  for (const template of templates) {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/reports', template),
      'utf8'
    )
    assert.match(source, /signatures\?\.\[['"]school-stamp['"]\]/, `${template} must read the uploaded stamp`)
    assert.match(source, /<img/, `${template} must render the stamp as an image`)
  }
})

test('latest supported image wins per slot and unsupported files are ignored', () => {
  const latest = mapLatestSignatureObjects([
    { name: 'school-stamp.jpg', updated_at: '2026-10-23T10:00:00Z' },
    { name: 'school-stamp.png', updated_at: '2026-10-23T11:00:00Z' },
    { name: 'school-stamp.svg', updated_at: '2026-10-23T12:00:00Z' },
    { name: 'unrecognized.png', updated_at: '2026-10-23T13:00:00Z' },
  ])

  assert.equal(latest.get('school-stamp')?.name, 'school-stamp.png')
  assert.equal(latest.has('head-teacher'), false)
})

test('signature-slot discovery uses active enrollments and reports query failures', async () => {
  const filters = []
  const result = {
    data: [{
      circular_classes: { class_name: 'P.1' },
      theology_classes: { class_name_english: 'Primary 1' },
    }],
    error: null,
  }
  const query = {
    select(selection) {
      assert.match(selection, /circular_classes/)
      assert.match(selection, /theology_classes/)
      assert.match(selection, /is_archived/)
      return this
    },
    eq(column, value) {
      filters.push([column, value])
      return this
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  const client = { from: (table) => {
    assert.equal(table, 'enrollments')
    return query
  } }

  const slots = await getDynamicSignatureSlots(client)
  assert.deepEqual(filters, [['is_active', true], ['students.is_archived', false]])
  assert.ok(slots.some((slot) => slot.slot_key === 'school-stamp'))
  assert.ok(slots.some((slot) => slot.slot_key === 'class-teacher-p1'))
  assert.ok(slots.some((slot) => slot.slot_key === 'theology-teacher-p1'))

  result.error = { message: 'lookup failed' }
  await assert.rejects(() => getDynamicSignatureSlots(client), /lookup failed/)
})

test('report signature URLs choose the newest file and include a cache version', async () => {
  const objects = [
    { name: 'head-teacher.jpg', updated_at: '2026-10-23T10:00:00Z' },
    { name: 'head-teacher.png', updated_at: '2026-10-23T11:00:00Z' },
    { name: 'school-stamp.png', updated_at: '2026-10-23T12:00:00Z' },
  ]
  const client = {
    storage: {
      from(bucket) {
        assert.equal(bucket, 'signatures')
        return {
          list: async () => ({ data: objects, error: null }),
          getPublicUrl(name) {
            return { data: { publicUrl: `https://assets.example/${name}` } }
          },
        }
      },
    },
  }

  const signatures = await getReportSignatures(client)
  assert.equal(
    signatures['head-teacher'],
    'https://assets.example/head-teacher.png?v=2026-10-23T11%3A00%3A00Z'
  )
  assert.equal(
    signatures['school-stamp'],
    'https://assets.example/school-stamp.png?v=2026-10-23T12%3A00%3A00Z'
  )

  const failingClient = {
    storage: {
      from: () => ({ list: async () => ({ data: null, error: { message: 'storage unavailable' } }) }),
    },
  }
  await assert.rejects(() => getReportSignatures(failingClient), /storage unavailable/)
})
