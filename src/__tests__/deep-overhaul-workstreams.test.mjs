import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  findReconciledMark,
  canonicalSecularSubjectCode,
  canonicalTheologySubjectCode,
} from '@/lib/marks-reconciliation';
import { upsertAndVerifyMarks } from '@/lib/marks-write';
import {
  clearOfflineCaches,
  getPendingOutboxCount,
  submitMutationWithOfflineFallback,
} from '@/lib/offline-sync';
import {
  ALL_STAFF_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  authorizeTeacherProfile,
} from '@/lib/teacher-access';
import { resolveUserScope } from '@/lib/access-scope';
import { resolveAllowedSignatureSlotsForUser } from '@/utils/signatures';
import { getDefaultBroadsheetPrintConfig } from '@/lib/broadsheet-print-config';
import { BroadsheetPrintDocument } from '@/components/hubs/BroadsheetPrintDocument';
import { computeHubCohortMetrics } from '@/lib/hub-cohort-engine';

describe('Workstream 1: Marks Pipeline Reconciliation & Postgres Write Verification', () => {
  it('findReconciledMark merges sibling enrollment & canonical subject code scores without shadowing', () => {
    const marks = [
      {
        enrollment_id: 'enr-active',
        student_id: 'stu-1',
        subject_id: 'subj-eng-circ',
        subject_name: 'English Language',
        subject_code: 'ENG',
        bot_score: 72,
        mot_score: null,
        eot_score: null,
      },
      {
        enrollment_id: 'enr-sibling',
        student_id: 'stu-1',
        subject_id: 'subj-eng-legacy',
        subject_name: 'ENG',
        subject_code: 'ENG',
        bot_score: null,
        mot_score: 80,
        eot_score: 88,
      },
      {
        enrollment_id: 'enr-sibling',
        student_id: 'stu-1',
        subject_id: 'subj-quran-old',
        subject_name: 'القرآن الكريم',
        subject_code: 'QURAN',
        bot_score: null,
        mot_score: 91,
        eot_score: 94,
      },
    ];

    const secularMatch = findReconciledMark(marks, {
      studentId: 'stu-1',
      enrollmentId: 'enr-active',
      subjectId: 'subj-eng-circ',
      subjectName: 'English Language',
      curriculum: 'secular',
    });

    assert.ok(secularMatch);
    assert.equal(secularMatch.bot_score, 72);
    assert.equal(secularMatch.mot_score, 80);
    assert.equal(secularMatch.eot_score, 88);

    const theoMatch = findReconciledMark(marks, {
      studentId: 'stu-1',
      enrollmentId: 'enr-active',
      subjectId: 'subj-quran-new',
      subjectName: 'القرآن الكريم',
      curriculum: 'theology',
    });

    assert.ok(theoMatch);
    assert.equal(theoMatch.mot_score, 91);
    assert.equal(theoMatch.eot_score, 94);
    assert.equal(canonicalSecularSubjectCode('Mathematics'), 'MATH');
    assert.equal(canonicalTheologySubjectCode('اللغة العربية'), 'ARABIC');
  });

  it('upsertAndVerifyMarks fails loudly if Postgres read-back finds 0 persisted rows', async () => {
    const mockDbClient = {
      from: () => ({
        upsert: () => ({
          select: async () => ({ data: [{ id: 'fake-id' }], error: null }),
        }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    };

    const res = await upsertAndVerifyMarks(
      mockDbClient,
      'circular_marks',
      [{ enrollment_id: 'enr-1', subject_id: 'sub-1', term_id: 'term-1', eot_score: 85 }],
      { enrollmentId: 'enr-1', termId: 'term-1' }
    );

    assert.match(res.error || '', /Postgres write verification failed/);
  });

  it('submitMutationWithOfflineFallback surfaces explicit HTTP 500 JSON DB errors instead of masking offline', async () => {
    await clearOfflineCaches();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'new row violates row-level security policy' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const res = await submitMutationWithOfflineFallback({
        url: '/api/marks',
        method: 'POST',
        body: { enrollment_id: 'e1', term_id: 't1', score_type: 'eot' },
      });
      assert.equal(res.queued, false);
      assert.equal(res.error, 'new row violates row-level security policy');
      assert.equal(await getPendingOutboxCount(), 0);
    } finally {
      globalThis.fetch = originalFetch;
      await clearOfflineCaches();
    }
  });
});

describe('Workstreams 2 & 3: Hub Filters, Sticky Z-Index, Toast Placement, and Input Clamp', () => {
  it('enforces solid z-40/z-30/z-20 sticky layers and P.7 exclusion toggle in both Hubs', () => {
    const root = process.cwd();
    const secHub = fs.readFileSync(path.join(root, 'src/components/secular-hub/SecularHubClient.tsx'), 'utf8');
    const theoHub = fs.readFileSync(path.join(root, 'src/components/theology-hub/TheologyHubClient.tsx'), 'utf8');
    const panels = fs.readFileSync(path.join(root, 'src/components/hubs/HubCohortPanels.tsx'), 'utf8');

    assert.match(secHub, /secular-section-quick-pills/);
    assert.match(theoHub, /theology-section-quick-pills/);
    assert.match(secHub, /isSectionMode && !showExcludedCandidates && st\.isCandidateExcluded/);
    assert.match(theoHub, /isSectionMode && !showExcludedCandidates && st\.isCandidateExcluded/);
    assert.match(secHub, /overflow-x-auto overflow-y-auto flex-1 min-h-0 pb-16/);
    assert.match(theoHub, /overflow-x-auto overflow-y-auto flex-1 min-h-0 pb-16/);
    assert.match(secHub, /sticky top-0 left-0 z-40/);
    assert.match(theoHub, /sticky top-0 right-0 z-40/);
    assert.match(secHub, /isSectionMode \? 'Section Average' : 'Class Average'/);
    assert.match(theoHub, /isSectionMode \? 'متوسط القسم' : 'متوسط الفصل'/);
    assert.match(panels, /toggle-excluded-candidates-btn/);
  });

  it('positions global Toaster at top-center and enforces 0-100 keystroke guard without ت١..خ٩ badges', () => {
    const root = process.cwd();
    const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
    const marksEntry = fs.readFileSync(path.join(root, 'src/components/shared-marks-entry.tsx'), 'utf8');

    assert.match(layout, /<Toaster[\s\S]*position="top-center"/);
    assert.doesNotMatch(layout, /position="bottom-right"/);
    assert.match(marksEntry, /if \(raw\.length > 2 && raw !== '100'\) return/);
    assert.match(marksEntry, /marks-outbox-sync-banner/);
    assert.doesNotMatch(marksEntry, /ت١|خ٩/);
  });
});

describe('Workstream 4: Secretary Print QA Role & Broadsheet Table Style Customizer', () => {
  it('configures Secretary role with read-only Print QA permissions, unrestricted signatures, and narrow navigation', async () => {
    assert.ok(ALL_STAFF_ROLES.includes('Secretary'));
    assert.deepEqual(DEFAULT_ROLE_PERMISSIONS.Secretary, ['read_students', 'read_marks', 'read_reports']);

    const readAuth = authorizeTeacherProfile(
      { id: 'sec-1', role: 'Secretary', subject: 'Both', status: 'active' },
      [],
      'read'
    );
    assert.equal(readAuth.isAuthorized, true);
    assert.equal(readAuth.canonicalRole, 'Secretary');
    assert.equal(readAuth.filterByDepartment, 'both');

    const writeAuth = authorizeTeacherProfile(
      { id: 'sec-1', role: 'Secretary', subject: 'Both', status: 'active' },
      [],
      'write'
    );
    assert.equal(writeAuth.isAuthorized, false);

    const scope = resolveUserScope({ ...readAuth, classes: [] });
    assert.equal(scope.isSecretary, true);
    assert.equal(scope.canAccessReports, true);
    assert.equal(scope.canAccessSecularHub, true);
    assert.equal(scope.canAccessTheologyHub, true);
    assert.equal(scope.canAccessStudents, true);
    assert.equal(scope.canManageUploads, true);
    assert.equal(scope.canWriteMarks, false);
    assert.equal(scope.canWriteStudents, false);
    assert.equal(scope.canLockMarks, false);
    assert.equal(scope.canManageTeachers, false);
    assert.equal(scope.canManageSettings, false);

    const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/app-sidebar.tsx'), 'utf8');
    const secDashboardMatch = sidebarSrc.match(/id:\s*"dashboard"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secMarksMatch = sidebarSrc.match(/id:\s*"marks"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secReportsMatch = sidebarSrc.match(/id:\s*"reports"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secSecularHubMatch = sidebarSrc.match(/id:\s*"secular-hub"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secTheoHubMatch = sidebarSrc.match(/id:\s*"theology-hub"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secTeachersMatch = sidebarSrc.match(/id:\s*"teachers"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    const secUploadsMatch = sidebarSrc.match(/id:\s*"uploads"[\s\S]*?roles:\s*\[([^\]]+)\]/);

    assert.match(secDashboardMatch?.[1] || '', /"Secretary"/);
    assert.match(secReportsMatch?.[1] || '', /"Secretary"/);
    assert.match(secSecularHubMatch?.[1] || '', /"Secretary"/);
    assert.match(secTheoHubMatch?.[1] || '', /"Secretary"/);
    assert.match(secUploadsMatch?.[1] || '', /"Secretary"/);
    assert.doesNotMatch(secMarksMatch?.[1] || '', /"Secretary"/);
    assert.doesNotMatch(secTeachersMatch?.[1] || '', /"Secretary"/);

    const allowedSlots = await resolveAllowedSignatureSlotsForUser({ from: () => ({ select: async () => ({ data: [] }) }) }, readAuth);
    assert.equal(allowedSlots, null);
  });

  it('BroadsheetPrintDocument supports double_border, clean_grid, zebra_banded, and toner_saver table styles', () => {
    const baseConfig = getDefaultBroadsheetPrintConfig('secular');
    const students = [
      {
        id: 's1',
        name: 'Amina Nakato',
        total: 170,
        aggregate: 4,
        division: 'I',
        position: 1,
        subjectScores: { e: 85, m: 85 },
        subjectGrades: { e: 'D1', m: 'D1' },
      },
      {
        id: 's2',
        name: 'Bilal Kato',
        total: 150,
        aggregate: 6,
        division: 'I',
        position: 2,
        subjectScores: { e: 75, m: 75 },
        subjectGrades: { e: 'D2', m: 'D2' },
      },
    ];
    const subjects = [
      { id: 'e', subject_name: 'English' },
      { id: 'm', subject_name: 'Mathematics' },
    ];

    for (const styleId of ['double_border', 'clean_grid', 'zebra_banded', 'toner_saver']) {
      const html = renderToStaticMarkup(
        React.createElement(BroadsheetPrintDocument, {
          curriculum: 'secular',
          config: { ...baseConfig, tableStyle: styleId },
          students,
          subjects,
          termLabel: 'Term 3',
          academicYear: 2026,
          classNameLabel: 'P.6',
          examPhase: 'eot',
        })
      );
      assert.match(html, new RegExp(`data-table-style="${styleId}"`));
      if (styleId === 'double_border') {
        assert.match(html, /3px double/);
      }
      if (styleId === 'toner_saver') {
        assert.doesNotMatch(html, /background-color:#DCFCE7/);
      }
    }
  });

  it('Workstream 2 & UI Guard: computeHubCohortMetrics deduplicates canonical Section subjects across levels & AppSidebar fails closed until roleResolved', () => {
    const res = computeHubCohortMetrics({
      curriculum: 'theology',
      mode: 'section',
      sectionId: 'upper_primary',
      examPhase: 'eot',
      termNumber: 3,
      termLabel: 'Term 3',
      classes: [
        { id: 'c4', class_name_english: 'Theology P.4', class_name_arabic: 'الصف الرابع', level: '4' },
        { id: 'c6', class_name_english: 'Theology P.6', class_name_arabic: 'الصف السادس', level: '6' },
      ],
      subjects: [
        { id: 'q4', subject_name_arabic: 'القرآن الكريم', level: '4' },
        { id: 'a4', subject_name_arabic: 'اللغة العربية', level: '4' },
        { id: 'q6', subject_name_arabic: 'القرآن الكريم', level: '6' },
        { id: 'a6', subject_name_arabic: 'اللغة العربية', level: '6' },
      ],
      enrollments: [
        {
          id: 'e4',
          student_id: 's4',
          theology_class_id: 'c4',
          students: { id: 's4', name: 'Zahra', is_muslim: true },
          theology_classes: { id: 'c4', class_name_english: 'Theology P.4', class_name_arabic: 'الصف الرابع', level: '4' },
        },
        {
          id: 'e6',
          student_id: 's6',
          theology_class_id: 'c6',
          students: { id: 's6', name: 'Amina', is_muslim: true },
          theology_classes: { id: 'c6', class_name_english: 'Theology P.6', class_name_arabic: 'الصف السادس', level: '6' },
        },
      ],
      marks: [
        { enrollment_id: 'e4', student_id: 's4', subject_id: 'q4', eot_score: 93 },
        { enrollment_id: 'e4', student_id: 's4', subject_id: 'a4', eot_score: 88 },
        { enrollment_id: 'e6', student_id: 's6', subject_id: 'q6', eot_score: 92 },
        { enrollment_id: 'e6', student_id: 's6', subject_id: 'a6', eot_score: 86 },
      ],
    });

    assert.equal(res.orderedSubjects.length, 2, 'Expected 2 deduplicated canonical columns across P.4 & P.6');
    const quranColId = res.orderedSubjects[0].id;
    const p6Row = res.students.find((r) => r.student_id === 's6');
    assert.ok(p6Row);
    assert.equal(p6Row.subjectScores[quranColId], 92, 'P.6 Quran score must populate canonical Quran column');

    const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/app-sidebar.tsx'), 'utf8');
    assert.match(sidebarSrc, /const \[roleResolved, setRoleResolved\] = React\.useState\(false\)/);
    assert.match(sidebarSrc, /useState<CanonicalAccountRole>\("Class Teacher"\)/);
    assert.match(sidebarSrc, /data-role-resolved=\{roleResolved \? "true" : "false"\}/);
  });
});
