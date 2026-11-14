import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveUserScope,
  canAccessClassInScope,
  canAccessSubjectInScope,
  canAccessFullClassBroadsheet,
} from '../lib/access-scope.ts';

// Load enumerated routes from Wave 1 sweep
const ARTIFACTS_DIR = path.resolve(process.cwd(), '../jiddah_agent_artifacts/sweeps');
const routeEnumFile = path.join(ARTIFACTS_DIR, 'route_enumeration_results.json');

// Canonical roles and their allowed permission capabilities
const ROLE_CAPABILITIES = {
  admin: new Set([
    'view_dashboard',
    'view_marks',
    'edit_marks',
    'approve_marks',
    'generate_reports',
    'edit_settings',
    'manage_teachers',
    'view_audit_logs',
    'manage_notifications',
  ]),
  head_teacher: new Set([
    'view_dashboard',
    'view_marks',
    'approve_marks',
    'generate_reports',
    'view_audit_logs',
    'manage_notifications',
  ]),
  dos: new Set([
    'view_dashboard',
    'view_marks',
    'edit_marks',
    'approve_marks',
    'generate_reports',
    'view_audit_logs',
    'manage_notifications',
  ]),
  class_teacher: new Set([
    'view_dashboard',
    'view_marks',
    'edit_marks',
    'generate_reports',
    'manage_notifications',
  ]),
  theology_instructor: new Set([
    'view_dashboard',
    'view_marks',
    'edit_marks',
    'manage_notifications',
  ]),
  support_staff: new Set([
    'view_dashboard',
    'manage_notifications',
  ]),
  guest: new Set([]), // Unauthenticated
};

// Route-to-capability requirements
const ROUTE_CAPABILITY_MAP = {
  // Admin & Settings
  '/admin/settings': 'edit_settings',
  '/admin/settings/grading-standards': 'edit_settings',
  '/admin/teachers': 'manage_teachers',
  '/admin/activity': 'view_audit_logs',
  '/api/settings/school': 'edit_settings',
  '/api/settings/initials': 'edit_settings',
  '/api/settings/terms': 'edit_settings',
  '/api/settings/terms/active': 'edit_settings',
  '/api/settings/transliterate/batch': 'edit_settings',
  '/api/settings/user': 'manage_own_account',
  '/api/settings/user/avatar': 'manage_own_account',
  '/api/settings/user/password': 'manage_own_account',
  '/api/admin/teachers/invite': 'manage_teachers',
  '/api/admin/teachers/:id': 'manage_teachers',
  '/api/admin/reset-password': 'manage_teachers',

  // Marks & Grading
  '/admin/marks': 'edit_marks',
  '/api/marks': 'edit_marks',
  '/api/theology-marks': 'edit_marks',

  // Reports
  '/admin/reports': 'generate_reports',
  '/api/report': 'generate_reports',
  '/api/report/batch': 'generate_reports',

  // Dashboard & General Staff
  '/admin': 'view_dashboard',
  '/admin/account': 'view_dashboard',
  '/admin/notifications': 'manage_notifications',
  '/api/notifications': 'manage_notifications',
  '/api/notifications/mark-all-read': 'manage_notifications',
  '/api/notifications/unread-count': 'manage_notifications',

  // Public / Auth
  '/login': 'public',
  '/register': 'public',
  '/reset-password': 'public',
  '/onboarding': 'public',
  '/api/auth/login': 'public',
  '/api/auth/signup': 'public',
  '/api/auth/logout': 'public',
};

describe('Wave 3: RBAC & Permission Matrix Data-Driven Suite [MOCK - In-Memory Policy Simulation]', () => {
  describe('1. Route Coverage & Drift Prevention', () => {
    it('verifies that all critical sensitive routes have an explicit permission matrix definition', () => {
      if (!fs.existsSync(routeEnumFile)) {
        assert.fail('Route enumeration results file not found. Run route-enumeration.mjs first.');
      }
      const data = JSON.parse(fs.readFileSync(routeEnumFile, 'utf8'));
      const routes = data.routes || [];

      // Critical sensitive endpoints that MUST be mapped
      const sensitivePrefixes = ['/admin/settings', '/admin/teachers', '/api/settings', '/api/admin'];
      for (const r of routes) {
        if (sensitivePrefixes.some((p) => r.routePath.startsWith(p))) {
          assert.ok(
            ROUTE_CAPABILITY_MAP[r.routePath] || ROUTE_CAPABILITY_MAP[r.routePath.replace(/:[^\/]+/g, ':id')],
            `Sensitive route ${r.routePath} missing from ROUTE_CAPABILITY_MAP!`
          );
        }
      }
    });
  });

  describe('2. Allow and Deny Invariants Across Roles', () => {
    it('ALLOW: Admin has full authority across all management operations', () => {
      const caps = ROLE_CAPABILITIES.admin;
      assert.ok(caps.has('edit_settings'));
      assert.ok(caps.has('manage_teachers'));
      assert.ok(caps.has('edit_marks'));
      assert.ok(caps.has('generate_reports'));
    });

    it('DENY: Class Teacher is strictly blocked from editing school settings', () => {
      const caps = ROLE_CAPABILITIES.class_teacher;
      assert.equal(caps.has('edit_settings'), false, 'Class Teacher must never edit school settings');
      assert.equal(caps.has('manage_teachers'), false, 'Class Teacher must never manage teacher invites');
    });

    it('DENY: Theology Instructor is strictly blocked from secular marks moderation and settings', () => {
      const caps = ROLE_CAPABILITIES.theology_instructor;
      assert.equal(caps.has('edit_settings'), false);
      assert.equal(caps.has('approve_marks'), false);
    });

    it('DENY: Support Staff cannot enter or edit marks or generate report cards', () => {
      const caps = ROLE_CAPABILITIES.support_staff;
      assert.equal(caps.has('edit_marks'), false);
      assert.equal(caps.has('generate_reports'), false);
      assert.equal(caps.has('edit_settings'), false);
    });

    it('DENY: Unauthenticated Guest has zero capabilities on protected surfaces', () => {
      const caps = ROLE_CAPABILITIES.guest;
      assert.equal(caps.size, 0, 'Guest must have zero protected capabilities');
    });
  });

  describe('3. Anti-ID-Swapping (IDOR) & Cohort Isolation', () => {

    it('asserts that Teacher A cannot edit marks for Teacher B assigned class without DOS/Admin role', () => {
      const teacher = { id: 't-01', role: 'class_teacher', assignedClasses: ['cls-p6'] };
      const targetClass = 'cls-p7';

      const canEditClass = (user, classId) => {
        if (user.role === 'admin' || user.role === 'dos') return true;
        return user.assignedClasses.includes(classId);
      };

      assert.equal(canEditClass(teacher, targetClass), false, 'Teacher cannot edit unassigned class');
    });
  });

  describe('4. Mass-Assignment & Role Tampering Protection', () => {
    it('strips client-supplied role or forces server-validated assignment', () => {
      const incomingPayload = {
        email: 'attacker@evil.local',
        name: 'Evil User',
        role: 'admin', // Tampering attempt
      };

      const sanitizeUserRegistration = (payload) => {
        const { role, ...safe } = payload;
        return {
          ...safe,
          role: 'pending', // Default safe unprivileged role
        };
      };

      const sanitized = sanitizeUserRegistration(incomingPayload);
      assert.equal(sanitized.role, 'pending', 'Incoming role attribute must be stripped to pending');
    });
  });

  describe('5. Role Literal Canonicalization', () => {
    it('normalizes variant role strings consistently', () => {
      const normalizeRole = (raw) => {
        if (!raw) return 'guest';
        const str = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (str === 'administrator' || str === 'admin') return 'admin';
        if (str === 'head_teacher' || str === 'principal') return 'head_teacher';
        if (str === 'dos' || str.includes('dos')) return 'dos';
        if (str === 'class_teacher' || str === 'teacher') return 'class_teacher';
        if (str === 'theology_instructor' || str.includes('theology')) return 'theology_instructor';
        if (str === 'support_staff' || str === 'staff') return 'support_staff';
        return 'guest';
      };

      assert.equal(normalizeRole('Administrator'), 'admin');
      assert.equal(normalizeRole('admin'), 'admin');
      assert.equal(normalizeRole('Admin'), 'admin');
      assert.equal(normalizeRole('DOS'), 'dos');
      assert.equal(normalizeRole('dos'), 'dos');
      assert.equal(normalizeRole('Class Teacher'), 'class_teacher');
      assert.equal(normalizeRole('Teacher'), 'class_teacher');
      assert.equal(normalizeRole('Theology Instructor'), 'theology_instructor');
      assert.equal(normalizeRole('Unknown Hacker'), 'guest');
    });
  });

  describe('6. Unified Teacher & Department Scoping Engine (resolveUserScope)', () => {
    it('grants Administrator & Head Teacher full institutional access across Secular and Theology', () => {
      const adminScope = resolveUserScope({ role: 'Administrator', status: 'active' });
      assert.equal(adminScope.isAuthorized, true);
      assert.equal(adminScope.isFullAccess, true);
      assert.equal(adminScope.department, 'both');
      assert.equal(adminScope.canAccessSecular, true);
      assert.equal(adminScope.canAccessTheology, true);
      assert.equal(adminScope.canManageSettings, true);
      assert.equal(adminScope.canManageTeachers, true);
      assert.equal(canAccessClassInScope(adminScope, 'any-class-id', 'circular'), true);
      assert.equal(canAccessClassInScope(adminScope, 'any-theology-id', 'theology'), true);
      assert.equal(canAccessFullClassBroadsheet(adminScope, 'any-class-id'), true);
    });

    it('isolates DOS Secular vs DOS Theology by department while preserving leadership capabilities', () => {
      const dosSecular = resolveUserScope({ role: 'DOS Secular', subject: 'Secular', status: 'active' });
      assert.equal(dosSecular.isFullAccess, true);
      assert.equal(dosSecular.department, 'secular');
      assert.equal(dosSecular.canAccessSecular, true);
      assert.equal(dosSecular.canAccessTheology, false);
      assert.equal(dosSecular.canAccessSecularHub, true);
      assert.equal(dosSecular.canAccessTheologyHub, false);
      assert.equal(canAccessClassInScope(dosSecular, 'sec-cls-1', 'circular'), true);
      assert.equal(canAccessClassInScope(dosSecular, 'theo-cls-1', 'theology'), false);

      const dosTheology = resolveUserScope({ role: 'DOS Theology', subject: 'Theology', status: 'active' });
      assert.equal(dosTheology.isFullAccess, true);
      assert.equal(dosTheology.department, 'theology');
      assert.equal(dosTheology.canAccessSecular, false);
      assert.equal(dosTheology.canAccessTheology, true);
      assert.equal(dosTheology.canAccessSecularHub, false);
      assert.equal(dosTheology.canAccessTheologyHub, true);
      assert.equal(canAccessClassInScope(dosTheology, 'sec-cls-1', 'circular'), false);
      assert.equal(canAccessClassInScope(dosTheology, 'theo-cls-1', 'theology'), true);
    });

    it('enforces Subject Teacher scope: restricted to assigned class_id + subject_id pairs and auto-selects default class & subject', () => {
      const subjectTeacher = resolveUserScope({
        role: 'Subject Teacher',
        subject: 'Secular, Mathematics, Science',
        status: 'active',
        classAssignments: [
          { classId: 'cls-p6', classType: 'circular', subjectId: 'sub-math', subjectName: 'Mathematics' },
          { classId: 'cls-p7', classType: 'circular', subjectId: 'sub-sci', subjectName: 'Science' },
        ],
      });

      assert.equal(subjectTeacher.isAuthorized, true);
      assert.equal(subjectTeacher.isSubjectTeacher, true);
      assert.equal(subjectTeacher.isClassTeacher, false);
      assert.equal(subjectTeacher.department, 'secular');
      assert.equal(subjectTeacher.defaultClassId, 'cls-p6');
      assert.equal(subjectTeacher.defaultSubjectId, 'sub-math');
      assert.equal(subjectTeacher.canAccessMarksEntry, true);
      assert.equal(subjectTeacher.canAccessSubjects, true);
      assert.equal(subjectTeacher.canAccessSecularHub, true);
      assert.equal(subjectTeacher.canAccessTheologyHub, false);
      assert.equal(subjectTeacher.canAccessStudents, false);
      assert.equal(subjectTeacher.canAccessReports, false);
      assert.equal(canAccessSubjectInScope(subjectTeacher, 'cls-p6', 'sub-math', 'secular'), true);
      assert.equal(canAccessSubjectInScope(subjectTeacher, 'cls-p6', 'English', 'secular'), false);
      assert.equal(canAccessSubjectInScope(subjectTeacher, 'cls-p5', 'sub-math', 'secular'), false);
      assert.equal(canAccessFullClassBroadsheet(subjectTeacher, 'cls-p6'), false);
    });

    it('grants Class Teacher (Homeroom / Muraqib) access to Classes, Students, Report Center, and full-class Hub broadsheets for assigned homeroom class', () => {
      const classTeacher = resolveUserScope({
        role: 'Class Teacher',
        subject: 'Secular',
        status: 'active',
        classAssignments: [
          { classId: 'cls-p4', classType: 'circular', isHomeroom: true },
        ],
        homeroomClassIds: ['cls-p4'],
      });

      assert.equal(classTeacher.isAuthorized, true);
      assert.equal(classTeacher.isClassTeacher, true);
      assert.equal(classTeacher.canAccessClasses, true);
      assert.equal(classTeacher.canAccessStudents, true);
      assert.equal(classTeacher.canAccessReports, true);
      assert.equal(classTeacher.canEditClassTeacherRemarks, true);
      assert.equal(classTeacher.canEditHeadTeacherRemarks, false);
      assert.equal(canAccessClassInScope(classTeacher, 'cls-p4', 'circular'), true);
      assert.equal(canAccessClassInScope(classTeacher, 'cls-p5', 'circular'), false);
      assert.equal(canAccessFullClassBroadsheet(classTeacher, 'cls-p4'), true);
      assert.equal(canAccessFullClassBroadsheet(classTeacher, 'cls-p5'), false);
    });

    it('flags unassigned active teachers with isUnassigned=true without throwing 403 unauthorized', () => {
      const unassigned = resolveUserScope({
        role: 'Class Teacher',
        subject: 'Theology',
        status: 'active',
        classAssignments: [],
      });

      assert.equal(unassigned.isAuthorized, true);
      assert.equal(unassigned.isUnassigned, true);
      assert.equal(unassigned.department, 'theology');
      assert.deepEqual(unassigned.allowedClassIds, []);
      assert.equal(unassigned.defaultClassId, null);
    });
  });
});
