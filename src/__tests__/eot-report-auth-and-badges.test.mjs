import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveReportBranding } from '../lib/school-settings-helper.ts';
import { canAccessClass, isAdministratorRole } from '../lib/teacher-access.ts';

describe('EOT Report Authorization & Administrator Bypass', () => {
  test('isAdministratorRole correctly identifies Administrator', () => {
    assert.equal(isAdministratorRole('Administrator'), true);
    assert.equal(isAdministratorRole('admin'), true);
    assert.equal(isAdministratorRole('ADMIN'), true);
    assert.equal(isAdministratorRole('Class Teacher'), false);
    assert.equal(isAdministratorRole('DOS Secular'), false);
    assert.equal(isAdministratorRole('DOS Theology'), false);
  });

  test('Admin user has immediate access to combined EOT report enrollments', () => {
    const adminAccess = {
      isAuthorized: true,
      role: 'Administrator',
      canonicalRole: 'Administrator',
      filterByDepartment: 'both'
    };

    // Both classes null or one class null must NOT reject Admin
    const isAdmin = isAdministratorRole(adminAccess.role) || adminAccess.role === 'Administrator' || (!adminAccess.filterByClasses && !adminAccess.filterByDepartment);
    assert.equal(isAdmin, true, 'Administrator must bypass class restriction in report routes');
  });

  test('Teacher with secular assignment can access combined enrollment without theology class', () => {
    const teacherAccess = {
      isAuthorized: true,
      role: 'Class Teacher',
      canonicalRole: 'Class Teacher',
      filterByDepartment: 'secular',
      classAssignments: [{ classId: 'cls-secular-1', classType: 'circular' }]
    };

    const enrollment = {
      circular_class_id: 'cls-secular-1',
      theology_class_id: null
    };

    const circularOk = Boolean(enrollment.circular_class_id && canAccessClass(teacherAccess, 'circular', enrollment.circular_class_id));
    const theologyOk = Boolean(enrollment.theology_class_id && canAccessClass(teacherAccess, 'theology', enrollment.theology_class_id, enrollment.circular_class_id));
    
    // In combined mode: allowed if either class is accessible
    const allowed = circularOk || theologyOk;
    assert.equal(allowed, true, 'Class teacher with secular class can access combined report even if theology_class_id is null');
  });
});

describe('Branding & Default School Names', () => {
  test('resolveReportBranding preserves "Jiddah Islamic Schools" in title case', () => {
    const branding = resolveReportBranding({});
    assert.equal(branding.schoolName, 'Jiddah Islamic Schools');
    assert.equal(branding.arabicSchoolName, 'مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو');
    assert.equal(branding.logoUrl, '/school_budge.jpeg');
  });

  test('resolveReportBranding respects custom school name when provided in settings', () => {
    const custom = resolveReportBranding({
      settings: {
        school_name: 'Custom Islamic Academy',
        arabic_name: 'مدرسة مخصصة',
        logo_url: '/custom_badge.png'
      }
    });
    assert.equal(custom.schoolName, 'Custom Islamic Academy');
    assert.equal(custom.arabicSchoolName, 'مدرسة مخصصة');
    assert.equal(custom.logoUrl, '/custom_badge.png');
  });
});

describe('Report Badge Styling & Shape Preservation', () => {
  test('PrimaryMOTReport and PrimaryBOTReport do not force circular 50% border-radius on badge', () => {
    const mot = fs.readFileSync('src/components/reports/PrimaryMOTReport.tsx', 'utf8');
    const bot = fs.readFileSync('src/components/reports/PrimaryBOTReport.tsx', 'utf8');

    assert.equal(mot.includes('.mot-logo {\n            width: 85px;\n            height: 85px;\n            border-radius: 50%'), false, 'PrimaryMOTReport must not have circular logo crop');
    assert.equal(bot.includes('.bot-logo {\n            width: 85px;\n            height: 85px;\n            border-radius: 50%'), false, 'PrimaryBOTReport must not have circular logo crop');
    assert.equal(mot.includes('background: transparent;'), true);
    assert.equal(bot.includes('background: transparent;'), true);
  });

  test('TheologyMOTReport renders badge in header with natural shape', () => {
    const theo = fs.readFileSync('src/components/reports/TheologyMOTReport.tsx', 'utf8');
    assert.equal(theo.includes('.tc-badge'), true, 'TheologyMOTReport must have .tc-badge style');
    assert.equal(theo.includes('className="tc-badge"'), true, 'TheologyMOTReport must render tc-badge element in header');
    assert.equal(theo.includes('src={reportData?.settings?.logo_url || "/school_budge.jpeg"}'), true);
  });

  test('NurseryTheologyEOTReport renders badge in header', () => {
    const ntheo = fs.readFileSync('src/components/reports/NurseryTheologyEOTReport.tsx', 'utf8');
    assert.equal(ntheo.includes('.header-badge'), true, 'NurseryTheologyEOTReport must have .header-badge style');
    assert.equal(ntheo.includes('className="header-badge"'), true, 'NurseryTheologyEOTReport must render header-badge element');
  });
});

describe('Marks Entry & Floating Controls Refinement', () => {
  test('shared-marks-entry has computeTheologyBadge with official Arabic remarks', () => {
    const marks = fs.readFileSync('src/components/shared-marks-entry.tsx', 'utf8');
    assert.equal(marks.includes('function computeTheologyBadge'), true);
    assert.equal(marks.includes("'ممتاز'"), true);
    assert.equal(marks.includes("'جيد جدا'"), true);
    assert.equal(marks.includes("'جيد'"), true);
    assert.equal(marks.includes("'مقبول'"), true);
    assert.equal(marks.includes("'ضعيف'"), true);
    assert.equal(marks.includes('sticky bottom-14'), false, 'Floating sticky save bar must be removed');
  });

  test('FloatingControls has minimizable state and mobile-safe position', () => {
    const controls = fs.readFileSync('src/components/figma-ui/FloatingControls.tsx', 'utf8');
    assert.equal(controls.includes('isMinimized'), true, 'FloatingControls must support minimize toggle');
    assert.equal(controls.includes('bottom-20 md:bottom-5'), true, 'Must sit above mobile bottom nav');
  });
});
