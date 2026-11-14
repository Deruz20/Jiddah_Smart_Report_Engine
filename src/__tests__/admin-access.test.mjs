import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorizeTeacherProfile, canAccessClass } from '../lib/teacher-access.ts'

test('administrator access includes circular and theology classes', () => {
  const access = authorizeTeacherProfile(
    { id: 'admin-1', role: 'Administrator', status: 'active' },
    [],
    'write'
  )

  assert.equal(access.isAuthorized, true)
  assert.equal(access.canonicalRole, 'Administrator')
  assert.equal(canAccessClass(access, 'circular', 'circular-1'), true)
  assert.equal(canAccessClass(access, 'theology', 'theology-1'), true)
})

test('inactive administrator identities do not gain access', () => {
  const access = authorizeTeacherProfile(
    { id: 'admin-1', role: 'Administrator', status: 'inactive' },
    [],
    'write'
  )

  assert.equal(access.isAuthorized, false)
  assert.equal(canAccessClass(access, 'circular', 'circular-1'), false)
})
