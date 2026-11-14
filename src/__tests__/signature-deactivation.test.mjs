import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  deleteSignatureSlotObject,
  getDynamicSignatureSlots,
  getLatestSignatureObjectNameForSlot,
  getSignatureObjectNamesForSlot,
  setSignatureObjectActiveState,
} from '../utils/signatures.ts'

function createMemoryStorage(initialObjects) {
  const files = new Map(initialObjects.map((object) => [object.path, object]))

  return {
    files,
    async list(folder) {
      const prefix = folder ? `${folder}/` : ''
      const data = [...files.entries()]
        .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
        .map(([path, object]) => ({
          name: folder ? path.slice(prefix.length) : path,
          updated_at: object.updated_at,
        }))
      return { data, error: null }
    },
    async move(from, to) {
      const object = files.get(from)
      if (!object || files.has(to)) return { error: { message: 'Move failed' } }
      files.delete(from)
      files.set(to, { ...object, path: to })
      return { error: null }
    },
    async remove(paths) {
      paths.forEach((path) => files.delete(path))
      return { error: null }
    },
  }
}

test('signature manager includes the official stamp slot', async () => {
  const query = {
    eq: () => query,
    then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
  }
  const slots = await getDynamicSignatureSlots({
    from: () => ({
      select: () => query,
    }),
  })

  assert.ok(slots.some((slot) => slot.slot_key === 'school-stamp'))
})

test('signature slot path matching only includes supported image formats for that exact slot', () => {
  const paths = getSignatureObjectNamesForSlot([
    { name: 'school-stamp.png' },
    { name: 'school-stamp.jpeg' },
    { name: 'school-stamp.webp' },
    { name: 'school-stamp.svg' },
    { name: 'school-stamp-backup.png' },
    { name: 'head-teacher.png' },
  ], 'school-stamp')

  assert.deepEqual(paths, ['school-stamp.png', 'school-stamp.jpeg', 'school-stamp.webp'])
})

test('the most recently updated supported asset is selected for reactivation', () => {
  assert.equal(getLatestSignatureObjectNameForSlot([
    { name: 'school-stamp.jpg', updated_at: '2026-10-23T10:00:00Z' },
    { name: 'school-stamp.png', updated_at: '2026-10-23T11:00:00Z' },
    { name: 'school-stamp.svg', updated_at: '2026-10-23T12:00:00Z' },
  ], 'school-stamp'), 'school-stamp.png')
})

test('signature deactivation removes the object from the active root and reactivation restores it', async () => {
  const storage = createMemoryStorage([
    { path: 'school-stamp.jpg', updated_at: '2026-10-23T10:00:00Z' },
    { path: 'school-stamp.png', updated_at: '2026-10-23T11:00:00Z' },
  ])

  assert.deepEqual(await setSignatureObjectActiveState(storage, 'school-stamp', false), { active: false })
  assert.equal(storage.files.has('school-stamp.png'), false)
  assert.equal(storage.files.has('disabled/school-stamp.png'), true)
  assert.equal(storage.files.has('disabled/school-stamp.jpg'), true)

  assert.deepEqual(await setSignatureObjectActiveState(storage, 'school-stamp', true), { active: true })
  assert.equal(storage.files.has('school-stamp.png'), true)
  assert.equal(storage.files.has('school-stamp.jpg'), false)
  assert.equal([...storage.files.keys()].some((path) => path.startsWith('disabled/')), false)
})

test('signature controls call the activation API', () => {
  const client = fs.readFileSync('src/components/layout/signatures-client.tsx', 'utf8')
  const api = fs.readFileSync('src/app/api/signatures/route.ts', 'utf8')

  assert.match(client, /Deactivate from Reports/)
  assert.match(client, /Reactivate for Reports/)
  assert.match(client, /method: 'PATCH'/)
  assert.match(client, /fetch\('\/api\/signatures', \{ cache: 'no-store' \}\)/)
  assert.match(api, /setSignatureObjectActiveState/)
  assert.match(api, /const public_url = activePath \? buildPublicUrl\(admin, activePath\) : null/)
  assert.match(api, /'Cache-Control': 'no-store'/)
})

test('report generation reads only root signature assets, so disabled-folder images are excluded', () => {
  for (const routePath of ['src/app/api/report/route.ts', 'src/app/api/report/batch/route.ts']) {
    const route = fs.readFileSync(routePath, 'utf8')
    assert.match(route, /storage\.from\('signatures'\)\.list\('',/)
    assert.doesNotMatch(route, /storage\.from\('signatures'\)\.list\('disabled'/)
  }
})

test('deleteSignatureSlotObject removes both active and disabled assets for slot', async () => {
  const storage = createMemoryStorage([
    { path: 'head-teacher.png', updated_at: '2026-10-24T12:00:00Z' },
    { path: 'disabled/head-teacher.jpg', updated_at: '2026-10-24T11:00:00Z' },
    { path: 'school-stamp.png', updated_at: '2026-10-24T10:00:00Z' },
  ])

  const res = await deleteSignatureSlotObject(storage, 'head-teacher')
  assert.deepEqual(res, { success: true })
  assert.equal(storage.files.has('head-teacher.png'), false)
  assert.equal(storage.files.has('disabled/head-teacher.jpg'), false)
  // Ensure other slots are untouched
  assert.equal(storage.files.has('school-stamp.png'), true)
})

test('report renderers gate signatures and stamp using print_preferences', () => {
  const files = [
    'src/components/reports/PrimaryEOTReport.tsx',
    'src/components/reports/PrimaryMOTReport.tsx',
    'src/components/reports/P7EOTReport.tsx',
    'src/components/reports/NurseryEOTReport.tsx',
    'src/components/reports/NurseryMOTReport.tsx',
    'src/components/reports/TheologyMOTReport.tsx',
    'src/components/reports/NurseryTheologyEOTReport.tsx',
    'src/components/reports/PrimaryBOTReport.tsx',
  ]

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    assert.match(content, /includeStamp/, `Expected ${file} to evaluate includeStamp`)
  }
})
