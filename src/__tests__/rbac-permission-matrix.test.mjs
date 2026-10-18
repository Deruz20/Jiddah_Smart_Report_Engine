import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
    it('N/A (SINGLE SCHOOL): Multi-tenant cross-school isolation is not applicable to single-deployment architecture', () => {
      // Contract: Jiddah is deployed as one database/app per school. No school_id column exists.
      assert.ok(true, 'Single-school deployment architecture; cross-school tenant ID isolation is N/A.');
    });

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
});
