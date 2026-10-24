import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  getReportSignatures,
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
    getPublicUrl(name) {
      return { data: { publicUrl: `https://assets.example/${name}` } }
    },
  }
}

test('deactivating a signature excludes it from newly generated report data and reactivation restores it', async () => {
  const storage = createMemoryStorage([
    { path: 'head-teacher.png', updated_at: '2026-10-24T10:00:00Z' },
  ])
  const client = { storage: { from: () => storage } }

  assert.match((await getReportSignatures(client))['head-teacher'], /head-teacher\.png/)

  assert.deepEqual(await setSignatureObjectActiveState(storage, 'head-teacher', false), { active: false })
  assert.equal((await getReportSignatures(client))['head-teacher'], null)

  assert.deepEqual(await setSignatureObjectActiveState(storage, 'head-teacher', true), { active: true })
  assert.match((await getReportSignatures(client))['head-teacher'], /head-teacher\.png/)
})

test('signature manager and API expose the reversible activation control without caching state', () => {
  const client = fs.readFileSync('src/components/layout/signatures-client.tsx', 'utf8')
  const api = fs.readFileSync('src/app/api/signatures/route.ts', 'utf8')

  assert.match(client, /Deactivate from Reports/)
  assert.match(client, /Reactivate for Reports/)
  assert.match(client, /fetch\('\/api\/signatures', \{ cache: 'no-store' \}\)/)
  assert.match(api, /setSignatureObjectActiveState/)
  assert.match(api, /'Cache-Control': 'no-store'/)
})
