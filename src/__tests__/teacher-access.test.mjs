import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accessDeniedForLookupError,
  authorizeTeacherProfile,
  canAccessClass,
  canAccessEnrollment,
  canAssignEnrollmentClasses,
  canHardDeleteStudent,
  classIdsForType,
  enrollmentMatchesRosterFilters,
  isAdministratorRole,
  resolveTeacherProfile,
  rosterClassFilters,
  subjectMatchesClassScope,
} from '../lib/teacher-access.ts';

const teacherProfile = {
  id: 'teacher-profile-id',
  auth_user_id: 'auth-user-id',
  role: 'Class Teacher',
  status: 'active',
};

test('resolves an identity through auth_user_id when it differs from teachers.id', () => {
  const resolved = resolveTeacherProfile([teacherProfile], 'auth-user-id');
  assert.equal(resolved, teacherProfile);
  assert.equal(
    authorizeTeacherProfile(resolved, [], 'write').teacherId,
    'teacher-profile-id'
  );
  assert.equal(resolveTeacherProfile([teacherProfile], 'unrelated-user-id'), null);
  assert.equal(resolveTeacherProfile([
    teacherProfile,
    { ...teacherProfile, id: 'duplicate-match' },
  ], 'auth-user-id'), null);
});

test('scopes Class Teacher access by assigned class and curriculum', () => {
  const access = authorizeTeacherProfile(
    teacherProfile,
    [
      { classId: 'circular-class-id', classType: 'circular' },
      { classId: 'theology-class-id', classType: 'theology' },
    ],
    'write'
  );

  assert.equal(access.isAuthorized, true);
  assert.equal(canAccessClass(access, 'circular', 'circular-class-id'), true);
  assert.equal(canAccessClass(access, 'theology', 'theology-class-id'), true);
  assert.equal(canAccessClass(access, 'theology', 'circular-class-id'), false);
  assert.equal(
    canAccessClass(access, 'theology', 'cohort-theology-id', 'circular-class-id'),
    true
  );
  assert.equal(
    canAccessClass(access, 'theology', 'unassigned-theology-id', 'unassigned-circular-id'),
    false
  );
  assert.equal(canAccessClass(access, 'circular', 'circular-class-id'), true);
  assert.equal(canAccessClass(access, 'circular', 'unassigned-class-id'), false);
  assert.equal(canAccessClass(access, 'theology', 'unassigned-theology-id'), false);
  assert.deepEqual(classIdsForType(access, 'circular'), ['circular-class-id']);
  assert.deepEqual(classIdsForType(access, 'theology'), ['theology-class-id']);
  assert.deepEqual(classIdsForType(access, 'circular').includes('unassigned-class-id'), false);
});

test('allows student management only when an enrollment has an accessible class', () => {
  const access = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: 'theology-class-id', classType: 'theology' }],
    'write'
  );

  assert.equal(canAccessEnrollment(access, {
    circular_class_id: 'unassigned-circular-id',
    theology_class_id: 'theology-class-id',
  }), true);
  assert.equal(canAccessEnrollment(access, {
    circular_class_id: 'unassigned-circular-id',
    theology_class_id: 'unassigned-theology-id',
  }), false);
  assert.equal(canAccessEnrollment(access, {
    circular_class_id: null,
    theology_class_id: null,
  }), false);
});

test('builds a fail-closed roster filter for assigned circular and theology classes', () => {
  const circularId = 'c1000000-0000-0000-0000-000000000001';
  const theologyId = 'c2000000-0000-0000-0000-000000000001';
  const unassignedCircularId = 'c1000000-0000-0000-0000-000000000099';

  const theologyOnly = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: theologyId, classType: 'theology' }],
    'read'
  );
  const theologyFilters = rosterClassFilters(theologyOnly);
  assert.deepEqual(theologyFilters, [{ column: 'theology_class_id', classIds: [theologyId] }]);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: unassignedCircularId,
    theology_class_id: theologyId,
  }, theologyFilters), true);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: unassignedCircularId,
    theology_class_id: null,
  }, theologyFilters), false);

  const circularOnly = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: circularId, classType: 'circular' }],
    'read'
  );
  const circularFilters = rosterClassFilters(circularOnly);
  assert.deepEqual(circularFilters, [{ column: 'circular_class_id', classIds: [circularId] }]);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: circularId,
    theology_class_id: null,
  }, circularFilters), true);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: unassignedCircularId,
    theology_class_id: null,
  }, circularFilters), false);

  const both = authorizeTeacherProfile(
    teacherProfile,
    [
      { classId: circularId, classType: 'circular' },
      { classId: theologyId, classType: 'theology' },
    ],
    'read'
  );
  const bothFilters = rosterClassFilters(both);
  assert.equal(bothFilters.length, 2);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: null,
    theology_class_id: theologyId,
  }, bothFilters), true);
  assert.equal(enrollmentMatchesRosterFilters({
    circular_class_id: unassignedCircularId,
    theology_class_id: null,
  }, bothFilters), false);

  const noAssignments = authorizeTeacherProfile(teacherProfile, [], 'read');
  assert.deepEqual(rosterClassFilters(noAssignments), []);
  assert.deepEqual(rosterClassFilters({
    ...theologyOnly,
    classAssignments: [{ classId: 'not-a-uuid', classType: 'theology' }],
  }), []);
});

test('student enrollment writes require access to every assigned curriculum class', () => {
  const circularId = 'c1000000-0000-0000-0000-000000000001';
  const theologyId = 'c2000000-0000-0000-0000-000000000001';
  const circularOnly = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: circularId, classType: 'circular' }],
    'write'
  );
  const both = authorizeTeacherProfile(
    teacherProfile,
    [
      { classId: circularId, classType: 'circular' },
      { classId: theologyId, classType: 'theology' },
    ],
    'write'
  );

  assert.equal(canAssignEnrollmentClasses(circularOnly, circularId, null), true);
  assert.equal(canAssignEnrollmentClasses(circularOnly, circularId, theologyId), true);
  assert.equal(canAssignEnrollmentClasses(circularOnly, 'c1000000-0000-0000-0000-000000000099', theologyId), false);
  assert.equal(canAssignEnrollmentClasses(both, circularId, theologyId), true);
  assert.equal(
    canAssignEnrollmentClasses(both, 'c1000000-0000-0000-0000-000000000099', theologyId),
    false
  );
});

test('mark subjects must match the assigned class section or theology level', () => {
  assert.equal(subjectMatchesClassScope('lower_primary', 'lower_primary'), true);
  assert.equal(subjectMatchesClassScope(2, '2'), true);
  assert.equal(subjectMatchesClassScope('lower_primary', 'upper_primary'), false);
  assert.equal(subjectMatchesClassScope(2, 3), false);
  assert.equal(subjectMatchesClassScope(null, 'lower_primary'), false);
});

test('report generation uses the same assigned-class boundary as marks', () => {
  const access = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: 'c2000000-0000-0000-0000-000000000001', classType: 'theology' }],
    'read'
  );
  assert.equal(canAccessClass(access, 'theology', 'c2000000-0000-0000-0000-000000000001'), true);
  assert.equal(canAccessClass(access, 'theology', 'c2000000-0000-0000-0000-000000000099'), false);
  assert.equal(canAccessClass(access, 'circular', 'c1000000-0000-0000-0000-000000000099'), false);
});

test('permanent student deletion is administrator-only', () => {
  const administrator = authorizeTeacherProfile(
    { id: 'admin-id', role: 'Administrator', status: 'active' },
    [],
    'write'
  );
  const classTeacher = authorizeTeacherProfile(
    teacherProfile,
    [{ classId: 'c1000000-0000-0000-0000-000000000001', classType: 'circular' }],
    'write'
  );

  assert.equal(canHardDeleteStudent(administrator), true);
  assert.equal(canHardDeleteStudent(classTeacher), false);
  assert.equal(canHardDeleteStudent({ isAuthorized: false, role: 'Administrator' }), false);
});

test('restricts department-specific teachers to their curriculum', () => {
  const theologyDos = authorizeTeacherProfile(
    { id: 'dos-id', role: 'DOS', subject: 'Theology', status: 'active' },
    [],
    'write'
  );
  const secularDos = authorizeTeacherProfile(
    { id: 'dos-id', role: 'DOS', subject: 'Secular', status: 'active' },
    [],
    'write'
  );

  assert.equal(canAccessClass(theologyDos, 'theology', 'theology-class-id'), true);
  assert.equal(canAccessClass(theologyDos, 'circular', 'circular-class-id'), false);
  assert.equal(canAccessClass(secularDos, 'circular', 'circular-class-id'), true);
  assert.equal(canAccessClass(secularDos, 'theology', 'theology-class-id'), false);
  assert.equal(
    authorizeTeacherProfile(
      { id: 'dos-id', role: 'DOS', subject: 'Theology', status: 'active' },
      [],
      'write',
      null,
      'secular'
    ).isAuthorized,
    false
  );
});

test('rejects missing and inactive teacher identities', () => {
  for (const status of ['inactive', 'suspended', 'deactivated', 'banned']) {
    assert.equal(
      authorizeTeacherProfile({ ...teacherProfile, status }, [], 'read').isAuthorized,
      false
    );
  }

  assert.equal(
    authorizeTeacherProfile({ ...teacherProfile, role: 'unknown' }, [], 'read').isAuthorized,
    false
  );
  assert.equal(
    resolveTeacherProfile([], 'missing-auth-user'),
    null
  );
});

test('assignment lookup errors produce a denied access result', () => {
  assert.deepEqual(
    accessDeniedForLookupError({ message: 'lookup failed' }, 'Unable to verify assignments.'),
    { isAuthorized: false, message: 'Unable to verify assignments.' }
  );
  assert.equal(accessDeniedForLookupError(null, 'Unable to verify assignments.'), null);
});

test('keeps administrative and read-only leadership rules distinct', () => {
  const administrator = authorizeTeacherProfile(
    { id: 'admin-id', role: 'Administrator', status: 'active' },
    [],
    'write'
  );
  const headTeacher = authorizeTeacherProfile(
    { id: 'head-id', role: 'Head Teacher', status: 'active' },
    [],
    'write'
  );

  assert.equal(canAccessClass(administrator, 'circular', 'any-class-id'), true);
  assert.equal(headTeacher.isAuthorized, false);
});

test('recognizes only the supported administrator role strings for admin-only operations', () => {
  assert.equal(isAdministratorRole('Administrator'), true);
  assert.equal(isAdministratorRole('admin'), true);
  assert.equal(isAdministratorRole('DOS'), false);
  assert.equal(isAdministratorRole('Head Teacher'), false);
  assert.equal(isAdministratorRole(null), false);
});
