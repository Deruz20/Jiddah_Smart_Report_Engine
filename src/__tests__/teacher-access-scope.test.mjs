import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canAccessCurriculumClass, resolveTeacherIdentity } from '../lib/teacher-access-scope.ts'

test('teacher identity resolution accepts Auth UID or matching profile ID, and fails closed', () => {
  const profile = { id: 'teacher-profile', auth_user_id: 'auth-user', status: 'active' }
  assert.equal(resolveTeacherIdentity([profile], 'auth-user'), profile)
  assert.equal(resolveTeacherIdentity([{ ...profile, auth_user_id: null }], 'teacher-profile').id, 'teacher-profile')
  assert.equal(resolveTeacherIdentity([{ ...profile, status: 'suspended' }], 'auth-user'), null)
  assert.equal(resolveTeacherIdentity([profile, profile], 'auth-user'), null)
  assert.equal(resolveTeacherIdentity([], 'auth-user'), null)
})

test('teacher class access is separated by assigned curriculum', () => {
  const access = {
    isAuthorized: true,
    role: 'Class Teacher',
    filterByCircularClasses: ['circular-1'],
    filterByTheologyClasses: ['theology-1'],
  }
  assert.equal(canAccessCurriculumClass(access, 'circular', 'circular-1'), true)
  assert.equal(canAccessCurriculumClass(access, 'circular', 'theology-1'), false)
  assert.equal(canAccessCurriculumClass(access, 'theology', 'theology-1'), true)
  assert.equal(canAccessCurriculumClass(access, 'theology', 'unassigned'), false)
})

test('empty assignments, denied identities, and department mismatch fail closed', () => {
  assert.equal(canAccessCurriculumClass({
    isAuthorized: true,
    role: 'Class Teacher',
    filterByCircularClasses: [],
    filterByTheologyClasses: [],
  }, 'circular', 'any-class'), false)
  assert.equal(canAccessCurriculumClass({
    isAuthorized: false,
    filterByCircularClasses: ['circular-1'],
  }, 'circular', 'circular-1'), false)
  assert.equal(canAccessCurriculumClass({
    isAuthorized: true,
    role: 'DOS Theology',
    filterByDepartment: 'theology',
  }, 'circular', 'circular-1'), false)
})

test('missing assignment data fails closed while department-wide roles retain their scope', () => {
  assert.equal(canAccessCurriculumClass({
    isAuthorized: true,
    role: 'Class Teacher',
  }, 'circular', 'circular-1'), false)
  assert.equal(canAccessCurriculumClass({
    isAuthorized: true,
    role: 'DOS Theology',
    filterByDepartment: 'theology',
  }, 'theology', 'theology-1'), true)
  assert.equal(canAccessCurriculumClass({
    isAuthorized: true,
    role: 'Head Teacher',
    filterByDepartment: 'both',
  }, 'circular', 'circular-1'), true)
})
