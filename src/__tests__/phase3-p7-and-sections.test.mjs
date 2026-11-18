import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { chromium } from 'playwright';
import { enforceLocalSafeEnvironment, getRehearsalCredentials } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import {
  CANDIDATE_NA_BADGE,
  doesExamApplyToClassInTerm,
  mapClassesToSections,
} from '../lib/academic-sections.ts';
import { computeHubCohortMetrics } from '../lib/hub-cohort-engine.ts';
import {
  buildClassStatuses,
  computeExamBreakdown,
} from '../lib/dashboard-telemetry.ts';

enforceLocalSafeEnvironment();
const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const SERVICE_KEY = creds.serviceRoleKey;
const DB_URL = creds.dbUrl;
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3012';
const DEFAULT_PASS = 'Password123!';

const baseOrigin = new URL(BASE_URL);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error(`Refusing non-local server URL: ${BASE_URL}`);
}
const dbOrigin = new URL(DB_URL);
if (!['127.0.0.1', 'localhost'].includes(dbOrigin.hostname)) {
  throw new Error(`Refusing non-local Postgres URL: ${DB_URL}`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TERM1_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';
const TERM3_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-333333333333';

function extractCookieHeader(response) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  if (!setCookies.length) {
    const raw = response.headers.get('set-cookie');
    if (raw) {
      return raw
        .split(/,(?=[^ ;]+=)/)
        .map((c) => c.split(';')[0].trim())
        .join('; ');
    }
    return '';
  }
  return setCookies.map((c) => c.split(';')[0].trim()).join('; ');
}

async function loginAs(identifier) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: DEFAULT_PASS }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, `Login failed for ${identifier}: ${res.status} ${JSON.stringify(body)}`);
  return extractCookieHeader(res);
}

describe('Phase 3B & 3C Unit Suite — Central P.7 Guard, Section Mapping, Normalized Ranking & Missing Marks', () => {
  it('Central P.7 Rule: excludes ONLY P.7 (Secular & Theology) in Term 3 EOT; Term 3 BOT/MOT and Terms 1-2 apply normally', () => {
    const secP7Variants = [
      { id: 'c-p7', class_name: 'P.7', section: 'upper_primary' },
      { id: 'c-p7-p', class_name: 'Primary 7', section: 'upper_primary' },
      { id: 'c-p7-e', class_name: 'P.7 East', section: 'upper_primary' },
    ];
    for (const cls of secP7Variants) {
      const t3Eot = doesExamApplyToClassInTerm({
        ...cls,
        curriculum: 'secular',
        examType: 'eot',
        termNumber: 3,
      });
      assert.equal(t3Eot.applies, false, `Expected P.7 Term 3 EOT excluded for ${cls.class_name}`);
      assert.equal(t3Eot.badge, CANDIDATE_NA_BADGE);

      for (const examType of ['bot', 'mot']) {
        const res = doesExamApplyToClassInTerm({
          ...cls,
          curriculum: 'secular',
          examType,
          termNumber: 3,
        });
        assert.equal(res.applies, true, `Expected P.7 Term 3 ${examType} to still apply`);
      }

      for (const termNumber of [1, 2]) {
        const res = doesExamApplyToClassInTerm({
          ...cls,
          curriculum: 'secular',
          examType: 'eot',
          termNumber,
        });
        assert.equal(res.applies, true, `Expected P.7 Term ${termNumber} EOT to apply`);
      }
    }

    const theoP7Variants = [
      { id: 't-p7-lvl', class_name_arabic: 'السابع', class_name_english: 'Seventh', level: 7 },
      { id: 't-p7-ar', class_name_arabic: 'الصف السابع', class_name_english: '', level: null },
      { id: 't-p7-en', class_name_arabic: 'الفصل', class_name_english: 'P.7 Theology', level: null },
    ];
    for (const cls of theoP7Variants) {
      const t3Eot = doesExamApplyToClassInTerm({
        ...cls,
        curriculum: 'theology',
        examType: 'eot',
        termNumber: 3,
      });
      assert.equal(t3Eot.applies, false, `Expected Theology P.7 Term 3 EOT excluded`);
      assert.equal(t3Eot.badge, CANDIDATE_NA_BADGE);

      const t3Mot = doesExamApplyToClassInTerm({
        ...cls,
        curriculum: 'theology',
        examType: 'mot',
        termNumber: 3,
      });
      assert.equal(t3Mot.applies, true);
    }

    // Non-P.7 classes always apply in Term 3 EOT
    for (const cls of [
      { id: 'c1', class_name: 'Baby Class', section: 'nursery' },
      { id: 'c2', class_name: 'P.1', section: 'lower_primary' },
      { id: 'c3', class_name: 'P.6', section: 'upper_primary' },
    ]) {
      const r = doesExamApplyToClassInTerm({
        ...cls,
        curriculum: 'secular',
        examType: 'eot',
        termNumber: 3,
      });
      assert.equal(r.applies, true);
      assert.equal(r.isCandidateClass, false);
    }
  });

  it('Maps classes strictly by ID/canonical code and flags unmapped classes with data-quality warning instead of dropping', () => {
    const customSecId = 'custom-nursery-uuid';
    const secClasses = [
      { id: 'sec-baby', class_name: 'Baby Class', section: 'nursery' },
      { id: 'sec-top', class_name: 'Top Class', section: 'nursery' },
      { id: 'sec-p1', class_name: 'Primary 1', section: 'lower_primary' },
      { id: 'sec-p6', class_name: 'P.6', section: 'upper_primary' },
      { id: 'sec-p7', class_name: 'P.7', section: 'upper_primary' },
      { id: customSecId, class_name: 'Custom Nursery Cohort', section: 'nursery' },
      { id: 'sec-unmapped', class_name: 'Tahfidh Bridging', section: 'special' },
    ];
    const res = mapClassesToSections(secClasses, 'secular', [
      {
        id: 'nursery',
        label: 'Nursery',
        label_arabic: 'الروضة',
        description: 'Baby -> Top',
        circular_class_codes: ['BABY', 'MIDDLE', 'TOP', 'NURSERY'],
        theology_class_codes: ['RAUDHA'],
        circular_class_ids: [customSecId],
        theology_class_ids: [],
      },
    ]);

    assert.equal(res.bySection.nursery.map((c) => c.id).includes('sec-baby'), true);
    assert.equal(res.bySection.nursery.map((c) => c.id).includes('sec-top'), true);
    assert.equal(res.bySection.nursery.map((c) => c.id).includes(customSecId), true);
    assert.deepEqual(res.bySection.lower_primary.map((c) => c.id), ['sec-p1']);
    assert.deepEqual(res.bySection.upper_primary.map((c) => c.id), ['sec-p6', 'sec-p7']);
    assert.equal(res.unmappedClasses.length, 1);
    assert.equal(res.unmappedClasses[0].id, 'sec-unmapped');
    assert.equal(res.unmappedClasses[0].label, 'Tahfidh Bridging');
  });

  it('Before/After Proof (E1): Non-P.7 class outputs & dashboard EOT completion are identical regardless of P.7 Term 3 EOT presence', () => {
    const classesBase = [
      { id: 'c4', class_name: 'P.4', section: 'upper_primary' },
      { id: 'c6', class_name: 'P.6', section: 'upper_primary' },
    ];
    const classesWithP7 = [
      ...classesBase,
      { id: 'c7', class_name: 'P.7', section: 'upper_primary' },
    ];
    const enrollmentsBase = [
      { id: 'e4', student_id: 's4', circular_class_id: 'c4', students: { name: 'P4 A' } },
      { id: 'e6', student_id: 's6', circular_class_id: 'c6', students: { name: 'P6 A' } },
    ];
    const enrollmentsWithP7 = [
      ...enrollmentsBase,
      { id: 'e7', student_id: 's7', circular_class_id: 'c7', students: { name: 'P7 Candidate' } },
    ];
    const subjects = [
      { id: 'sub-eng', subject_name: 'English', section: 'upper_primary' },
      { id: 'sub-mth', subject_name: 'Mathematics', section: 'upper_primary' },
      { id: 'sub-sci', subject_name: 'Science', section: 'upper_primary' },
      { id: 'sub-sst', subject_name: 'Social Studies', section: 'upper_primary' },
    ];
    const marks = [
      { enrollment_id: 'e4', student_id: 's4', subject_id: 'sub-eng', term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: 'e4', student_id: 's4', subject_id: 'sub-mth', term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: 'e4', student_id: 's4', subject_id: 'sub-sci', term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: 'e4', student_id: 's4', subject_id: 'sub-sst', term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: 'e6', student_id: 's6', subject_id: 'sub-eng', term_id: TERM3_ID, eot_score: 90 },
      { enrollment_id: 'e6', student_id: 's6', subject_id: 'sub-mth', term_id: TERM3_ID, eot_score: 90 },
      { enrollment_id: 'e6', student_id: 's6', subject_id: 'sub-sci', term_id: TERM3_ID, eot_score: 90 },
      { enrollment_id: 'e6', student_id: 's6', subject_id: 'sub-sst', term_id: TERM3_ID, eot_score: 90 },
    ];

    // Hub Upper Primary summary without P.7 vs with P.7 (having 0 Term 3 EOT marks)
    const hubBase = computeHubCohortMetrics({
      curriculum: 'secular',
      mode: 'section',
      sectionId: 'upper_primary',
      classes: classesBase,
      enrollments: enrollmentsBase,
      marks,
      subjects,
      examPhase: 'eot',
      termNumber: 3,
    });
    const hubWithP7 = computeHubCohortMetrics({
      curriculum: 'secular',
      mode: 'section',
      sectionId: 'upper_primary',
      classes: classesWithP7,
      enrollments: enrollmentsWithP7,
      marks,
      subjects,
      examPhase: 'eot',
      termNumber: 3,
    });

    assert.deepEqual(hubWithP7.summary, {
      ...hubBase.summary,
      candidateExcludedStudents: 1,
    });
    assert.deepEqual(
      hubWithP7.top10.map((s) => ({ id: s.id, position: s.position, total: s.total, normalizedScore: s.normalizedScore })),
      hubBase.top10.map((s) => ({ id: s.id, position: s.position, total: s.total, normalizedScore: s.normalizedScore }))
    );

    // Dashboard telemetry parity (before vs after adding P.7 in Term 3)
    const dashBase = buildClassStatuses({
      department: 'secular',
      enrollments: enrollmentsBase,
      circularClasses: classesBase,
      theologyClasses: [],
      circularMarks: marks,
      theologyMarks: [],
      circularSubjects: subjects,
      termNumber: 3,
    });
    const dashWithP7 = buildClassStatuses({
      department: 'secular',
      enrollments: enrollmentsWithP7,
      circularClasses: classesWithP7,
      theologyClasses: [],
      circularMarks: marks,
      theologyMarks: [],
      circularSubjects: subjects,
      termNumber: 3,
    });

    // Non-P.7 class rows identical
    assert.deepEqual(dashWithP7.secularClassStatuses.slice(0, 2), dashBase.secularClassStatuses);
    // P.7 marked N/A candidate class with 0 missing marks distortion
    assert.equal(dashWithP7.secularClassStatuses[2].eotApplicable, false);
    assert.equal(dashWithP7.secularClassStatuses[2].candidateBadge, CANDIDATE_NA_BADGE);
    assert.equal(dashWithP7.secularClassStatuses[2].missingMarks, 0);

    const brBase = computeExamBreakdown({
      department: 'secular',
      circularMarks: marks,
      theologyMarks: [],
      totalRequiredSecular: dashBase.secularClassStatuses.reduce((a, b) => a + b.totalRequired, 0),
      totalRequiredTheology: 0,
      totalRequiredEotSecular: dashBase.totalRequiredEotSecular,
      excludedEotEnrollmentIds: dashBase.excludedEotEnrollmentIds,
    });
    const brWithP7 = computeExamBreakdown({
      department: 'secular',
      circularMarks: marks,
      theologyMarks: [],
      totalRequiredSecular: dashWithP7.secularClassStatuses.reduce((a, b) => a + b.totalRequired, 0),
      totalRequiredTheology: 0,
      totalRequiredEotSecular: dashWithP7.totalRequiredEotSecular,
      excludedEotEnrollmentIds: dashWithP7.excludedEotEnrollmentIds,
    });
    assert.deepEqual(brWithP7.eot, brBase.eot);
    assert.equal(brWithP7.eot.completionPct, 100);
    assert.equal(brWithP7.eot.averageScore, 85);
  });

  it('Normalized Section Ranking: Top Class (4 subjects, 90%) beats Baby Class (5 subjects, 80%) despite lower raw total, preserves 1-2-2-4 ties, excludes missing marks', () => {
    const nurseryClasses = [
      { id: 'c-baby', class_name: 'Baby Class', section: 'nursery' },
      { id: 'c-top', class_name: 'Top Class', section: 'nursery' },
    ];
    // Top Class excludes 'Writing' -> 2 subjects vs Baby Class -> 3 subjects
    const subjects = [
      { id: 'n-la1', subject_name: 'Learning Area 1', section: 'nursery' },
      { id: 'n-la2', subject_name: 'Learning Area 2', section: 'nursery' },
      { id: 'n-wrt', subject_name: 'Writing', section: 'nursery' },
    ];
    const enrollments = [
      { id: 'eb1', student_id: 'sb1', circular_class_id: 'c-baby', students: { name: 'Baby RawHigh (80%)' } },
      { id: 'et1', student_id: 'st1', circular_class_id: 'c-top', students: { name: 'Top Winner (90%)' } },
      { id: 'eb2', student_id: 'sb2', circular_class_id: 'c-baby', students: { name: 'Baby Tied (85%)' } },
      { id: 'et2', student_id: 'st2', circular_class_id: 'c-top', students: { name: 'Top Tied (85%)' } },
      { id: 'eb3', student_id: 'sb3', circular_class_id: 'c-baby', students: { name: 'Missing Writing' } },
    ];
    const marks = [
      // Baby RawHigh: 80 + 80 + 80 = 240 / 300 = 80%
      { enrollment_id: 'eb1', subject_id: 'n-la1', eot_score: 80 },
      { enrollment_id: 'eb1', subject_id: 'n-la2', eot_score: 80 },
      { enrollment_id: 'eb1', subject_id: 'n-wrt', eot_score: 80 },
      // Top Winner: 90 + 90 = 180 / 200 = 90% (lower raw total 180 < 240, higher %)
      { enrollment_id: 'et1', subject_id: 'n-la1', eot_score: 90 },
      { enrollment_id: 'et1', subject_id: 'n-la2', eot_score: 90 },
      // Baby Tied: 85 + 85 + 85 = 255 / 300 = 85%
      { enrollment_id: 'eb2', subject_id: 'n-la1', eot_score: 85 },
      { enrollment_id: 'eb2', subject_id: 'n-la2', eot_score: 85 },
      { enrollment_id: 'eb2', subject_id: 'n-wrt', eot_score: 85 },
      // Top Tied: 85 + 85 = 170 / 200 = 85%
      { enrollment_id: 'et2', subject_id: 'n-la1', eot_score: 85 },
      { enrollment_id: 'et2', subject_id: 'n-la2', eot_score: 85 },
      // Missing Writing: 100 + 100, missing n-wrt -> MUST be excluded from rank!
      { enrollment_id: 'eb3', subject_id: 'n-la1', eot_score: 100 },
      { enrollment_id: 'eb3', subject_id: 'n-la2', eot_score: 100 },
    ];

    const res = computeHubCohortMetrics({
      curriculum: 'secular',
      mode: 'section',
      sectionId: 'nursery',
      classes: nurseryClasses,
      enrollments,
      marks,
      subjects,
      examPhase: 'eot',
      termNumber: 3,
    });

    assert.equal(res.isNormalizedRanking, true);
    assert.equal(res.hasHeterogeneousSubjects, true);

    const byId = Object.fromEntries(res.students.map((s) => [s.id, s]));
    assert.equal(byId.et1.position, 1, '90% Top Class student ranks #1 over 80% Baby student');
    assert.equal(byId.eb2.position, 2, '85% ties at rank 2');
    assert.equal(byId.et2.position, 2, '85% ties at rank 2');
    assert.equal(byId.eb1.position, 4, '80% jumps from 2 to rank 4 (1,2,2,4 standard competition)');
    assert.equal(byId.eb3.position, '-', 'Incomplete marks student excluded from rank');

    assert.equal(res.missingMarksList.length, 1);
    assert.equal(res.missingMarksList[0].studentName, 'Missing Writing');
    assert.deepEqual(res.missingMarksList[0].missingSubjects, ['Writing']);

    // Class breakdown totals reconcile to section counts
    const sumEnrolled = res.classBreakdown.reduce((s, r) => s + r.totalEnrolled, 0);
    const sumSat = res.classBreakdown.reduce((s, r) => s + r.satComplete, 0);
    assert.equal(sumEnrolled, 5);
    assert.equal(sumSat, 4);
  });
});

describe('Phase 3D Live Rehearsal Integration, RBAC Scoping, SQL Reconciliation & Playwright E2E (E1)', () => {
  const RUN = 'd3500000-0000-4000-8000';
  const C_BABY = `${RUN}-000000000001`;
  const C_TOP = `${RUN}-000000000002`;
  const C_P4 = `${RUN}-000000000003`;
  const C_P5 = `${RUN}-000000000004`;
  const C_P6 = `${RUN}-000000000005`;
  const C_P7 = `${RUN}-000000000006`;
  const C_SEC_UNMAPPED = `${RUN}-000000000007`;

  const T_P4 = `${RUN}-000000000011`;
  const T_P5 = `${RUN}-000000000012`;
  const T_P7 = `${RUN}-000000000013`;
  const T_UNMAPPED = `${RUN}-000000000014`;

  const CS_LA1 = `${RUN}-000000000101`;
  const CS_WRT = `${RUN}-000000000102`;
  const CS_ENG = `${RUN}-000000000103`;
  const CS_MTH = `${RUN}-000000000104`;
  const CS_SCI = `${RUN}-000000000105`;
  const CS_SST = `${RUN}-000000000106`;

  const TS_4A = `${RUN}-000000000201`;
  const TS_4B = `${RUN}-000000000202`;
  const TS_5A = `${RUN}-000000000203`;
  const TS_5B = `${RUN}-000000000204`;
  const TS_5C = `${RUN}-000000000205`;

  // 14 synthetic students/enrollments across Nursery + Upper Primary + P.7
  const students = Array.from({ length: 14 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `${RUN}-0000000003${n}`,
      name: `P3 Synth Student ${n}`,
      arabic_name: `تلميذ تجريبي ${n}`,
      admission_number: `P3S-${n}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      religion: 'Muslim',
      is_muslim: true,
    };
  });

  // Mapping student index -> classes
  const enrollments = [
    // Nursery: 0 (Baby), 1 (Top)
    { id: `${RUN}-000000000401`, student_id: students[0].id, circular_class_id: C_BABY, theology_class_id: null },
    { id: `${RUN}-000000000402`, student_id: students[1].id, circular_class_id: C_TOP, theology_class_id: null },
    // Upper Primary Secular + Theology: 2..5 (P4 + Theo 4), 6..10 (P5 + Theo 5, where student 10 has missing marks), 11 (P6)
    { id: `${RUN}-000000000403`, student_id: students[2].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000404`, student_id: students[3].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000405`, student_id: students[4].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000406`, student_id: students[5].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000407`, student_id: students[6].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000408`, student_id: students[7].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000409`, student_id: students[8].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000410`, student_id: students[9].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000411`, student_id: students[10].id, circular_class_id: C_P5, theology_class_id: T_P5 }, // incomplete marks!
    { id: `${RUN}-000000000412`, student_id: students[11].id, circular_class_id: C_P6, theology_class_id: T_P4 },
    // P.7 Candidate class: 12 & 13
    { id: `${RUN}-000000000413`, student_id: students[12].id, circular_class_id: C_P7, theology_class_id: T_P7 },
    { id: `${RUN}-000000000414`, student_id: students[13].id, circular_class_id: C_P7, theology_class_id: T_P7 },
  ];

  let adminCookie = '';
  let teacherCookie = '';

  before(async () => {
    await seedRehearsalDatabase();

    // Seed classes
    const { error: ccErr } = await supabaseAdmin.from('circular_classes').upsert([
      { id: C_BABY, class_name: 'Baby Class', section: 'nursery' },
      { id: C_TOP, class_name: 'Top Class', section: 'nursery' },
      { id: C_P4, class_name: 'P.4 East', section: 'upper_primary' },
      { id: C_P5, class_name: 'P.5 East', section: 'upper_primary' },
      { id: C_P6, class_name: 'P.6 East', section: 'upper_primary' },
      { id: C_P7, class_name: 'P.7 Candidates', section: 'upper_primary' },
      { id: C_SEC_UNMAPPED, class_name: 'Tahfidh Bridging', section: 'special' },
    ]);
    assert.equal(ccErr, null, ccErr?.message);

    const { error: tcErr } = await supabaseAdmin.from('theology_classes').upsert([
      { id: T_P4, class_name_arabic: 'الرابعة', class_name_english: 'P.4 Theology', level: 4 },
      { id: T_P5, class_name_arabic: 'الخامسة', class_name_english: 'P.5 Theology', level: 5 },
      { id: T_P7, class_name_arabic: 'السابعة', class_name_english: 'P.7 Theology', level: 7 },
      { id: T_UNMAPPED, class_name_arabic: 'تحفيظ خاص', class_name_english: 'Tahfidh Special', level: 99 },
    ]);
    assert.equal(tcErr, null, tcErr?.message);

    // Seed subjects
    const { error: csErr } = await supabaseAdmin.from('circular_subjects').upsert([
      { id: CS_LA1, subject_name: 'Learning Area 1', section: 'nursery', is_core: true, is_gradable: true },
      { id: CS_WRT, subject_name: 'Writing', section: 'nursery', is_core: false, is_gradable: false },
      { id: CS_ENG, subject_name: 'English', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: CS_MTH, subject_name: 'Mathematics', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: CS_SCI, subject_name: 'Science', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: CS_SST, subject_name: 'Social Studies', section: 'upper_primary', is_core: true, is_gradable: true },
    ]);
    assert.equal(csErr, null, csErr?.message);

    const { error: tsErr } = await supabaseAdmin.from('theology_subjects').upsert([
      { id: TS_4A, name_arabic: 'القرآن الكريم', subject_name_arabic: 'القرآن الكريم', subject_name: 'Quran 4', section: '4', level: 4, sort_order: 1 },
      { id: TS_4B, name_arabic: 'اللغة العربية', subject_name_arabic: 'اللغة العربية', subject_name: 'Arabic 4', section: '4', level: 4, sort_order: 2 },
      { id: TS_5A, name_arabic: 'القرآن الكريم', subject_name_arabic: 'القرآن الكريم', subject_name: 'Quran 5', section: '5', level: 5, sort_order: 1 },
      { id: TS_5B, name_arabic: 'اللغة العربية', subject_name_arabic: 'اللغة العربية', subject_name: 'Arabic 5', section: '5', level: 5, sort_order: 2 },
      { id: TS_5C, name_arabic: 'الفقه والعبادات', subject_name_arabic: 'الفقه والعبادات', subject_name: 'Fiqh 5', section: '5', level: 5, sort_order: 3 },
    ]);
    assert.equal(tsErr, null, tsErr?.message);

    const { error: stErr } = await supabaseAdmin.from('students').upsert(students);
    assert.equal(stErr, null, stErr?.message);

    const { error: enrErr } = await supabaseAdmin.from('enrollments').upsert(
      enrollments.map((e) => ({ ...e, academic_year: 2025, is_active: true, theology_status: e.theology_class_id ? 'active' : 'not_applicable' }))
    );
    assert.equal(enrErr, null, enrErr?.message);

    // Seed Term 3 circular marks
    const circMarksToInsert = [
      // Nursery: Baby sits LA1 + Writing (80, 80 -> 80%), Top sits LA1 only (92 -> 92%)
      { enrollment_id: enrollments[0].id, subject_id: CS_LA1, term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: enrollments[0].id, subject_id: CS_WRT, term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: enrollments[1].id, subject_id: CS_LA1, term_id: TERM3_ID, eot_score: 92 },
    ];
    // Upper Primary P.4 (scores 96, 88, 84, 72) & P.5 (88, 82, 76, 68, and student[10] missing SST!) & P.6 (91)
    const upperScoresByIdx = new Map([
      [2, [96, 96, 96, 96]], // 96%
      [3, [88, 88, 88, 88]], // 88% (tie with index 6!)
      [4, [84, 84, 84, 84]], // 84%
      [5, [72, 72, 72, 72]], // 72%
      [6, [88, 88, 88, 88]], // 88% (tie with index 3!)
      [7, [82, 82, 82, 82]], // 82%
      [8, [76, 76, 76, 76]], // 76%
      [9, [68, 68, 68, 68]], // 68%
      [11, [91, 91, 91, 91]], // 91%
    ]);
    for (const [idx, [eng, mth, sci, sst]] of upperScoresByIdx.entries()) {
      const eid = enrollments[idx].id;
      circMarksToInsert.push(
        { enrollment_id: eid, subject_id: CS_ENG, term_id: TERM3_ID, eot_score: eng },
        { enrollment_id: eid, subject_id: CS_MTH, term_id: TERM3_ID, eot_score: mth },
        { enrollment_id: eid, subject_id: CS_SCI, term_id: TERM3_ID, eot_score: sci },
        { enrollment_id: eid, subject_id: CS_SST, term_id: TERM3_ID, eot_score: sst }
      );
    }
    // Student index 10 (P.5 incomplete marks — missing CS_SST, must NOT get rank and NOT get zero-filled!)
    circMarksToInsert.push(
      { enrollment_id: enrollments[10].id, subject_id: CS_ENG, term_id: TERM3_ID, eot_score: 99 },
      { enrollment_id: enrollments[10].id, subject_id: CS_MTH, term_id: TERM3_ID, eot_score: 99 },
      { enrollment_id: enrollments[10].id, subject_id: CS_SCI, term_id: TERM3_ID, eot_score: 99 }
    );
    // P.7 Term 3 BOT marks ONLY (0 EOT marks -> P.7 BOT still works, P.7 EOT excluded!)
    circMarksToInsert.push(
      { enrollment_id: enrollments[12].id, subject_id: CS_ENG, term_id: TERM3_ID, bot_score: 93, eot_score: null },
      { enrollment_id: enrollments[12].id, subject_id: CS_MTH, term_id: TERM3_ID, bot_score: 89, eot_score: null },
      { enrollment_id: enrollments[12].id, subject_id: CS_SCI, term_id: TERM3_ID, bot_score: 90, eot_score: null },
      { enrollment_id: enrollments[12].id, subject_id: CS_SST, term_id: TERM3_ID, bot_score: 88, eot_score: null }
    );
    const { error: cmErr } = await supabaseAdmin.from('circular_marks').insert(circMarksToInsert);
    assert.equal(cmErr, null, `circular_marks insert error: ${cmErr?.message}`);

    // Seed Term 3 theology marks (Level 4 has 2 subjects; Level 5 has 3 subjects -> heterogeneous!)
    const theoMarksToInsert = [
      // T_P4 (2 subjects): index 2 (94%), 3 (86% tie), 4 (80%), 5 (70%), 11 (90%)
      { enrollment_id: enrollments[2].id, subject_id: TS_4A, term_id: TERM3_ID, eot_score: 94 },
      { enrollment_id: enrollments[2].id, subject_id: TS_4B, term_id: TERM3_ID, eot_score: 94 },
      { enrollment_id: enrollments[3].id, subject_id: TS_4A, term_id: TERM3_ID, eot_score: 86 },
      { enrollment_id: enrollments[3].id, subject_id: TS_4B, term_id: TERM3_ID, eot_score: 86 },
      { enrollment_id: enrollments[4].id, subject_id: TS_4A, term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: enrollments[4].id, subject_id: TS_4B, term_id: TERM3_ID, eot_score: 80 },
      { enrollment_id: enrollments[5].id, subject_id: TS_4A, term_id: TERM3_ID, eot_score: 70 },
      { enrollment_id: enrollments[5].id, subject_id: TS_4B, term_id: TERM3_ID, eot_score: 70 },
      { enrollment_id: enrollments[11].id, subject_id: TS_4A, term_id: TERM3_ID, eot_score: 90 },
      { enrollment_id: enrollments[11].id, subject_id: TS_4B, term_id: TERM3_ID, eot_score: 90 },
      // T_P5 (3 subjects): index 6 (86% tie with raw 258 > 172!), 7 (83%), 8 (75%), 9 (65%), 10 (missing TS_5C!)
      { enrollment_id: enrollments[6].id, subject_id: TS_5A, term_id: TERM3_ID, eot_score: 86 },
      { enrollment_id: enrollments[6].id, subject_id: TS_5B, term_id: TERM3_ID, eot_score: 86 },
      { enrollment_id: enrollments[6].id, subject_id: TS_5C, term_id: TERM3_ID, eot_score: 86 },
      { enrollment_id: enrollments[7].id, subject_id: TS_5A, term_id: TERM3_ID, eot_score: 83 },
      { enrollment_id: enrollments[7].id, subject_id: TS_5B, term_id: TERM3_ID, eot_score: 83 },
      { enrollment_id: enrollments[7].id, subject_id: TS_5C, term_id: TERM3_ID, eot_score: 83 },
      { enrollment_id: enrollments[8].id, subject_id: TS_5A, term_id: TERM3_ID, eot_score: 75 },
      { enrollment_id: enrollments[8].id, subject_id: TS_5B, term_id: TERM3_ID, eot_score: 75 },
      { enrollment_id: enrollments[8].id, subject_id: TS_5C, term_id: TERM3_ID, eot_score: 75 },
      { enrollment_id: enrollments[9].id, subject_id: TS_5A, term_id: TERM3_ID, eot_score: 65 },
      { enrollment_id: enrollments[9].id, subject_id: TS_5B, term_id: TERM3_ID, eot_score: 65 },
      { enrollment_id: enrollments[9].id, subject_id: TS_5C, term_id: TERM3_ID, eot_score: 65 },
      // Index 10 missing TS_5C!
      { enrollment_id: enrollments[10].id, subject_id: TS_5A, term_id: TERM3_ID, eot_score: 99 },
      { enrollment_id: enrollments[10].id, subject_id: TS_5B, term_id: TERM3_ID, eot_score: 99 },
    ];
    const { error: tmErr } = await supabaseAdmin.from('theology_marks').insert(theoMarksToInsert);
    assert.equal(tmErr, null, `theology_marks insert error: ${tmErr?.message}`);

    adminCookie = await loginAs('admin');
    teacherCookie = await loginAs('teacher');
  });

  after(async () => {
    const enrIds = enrollments.map((e) => e.id);
    const stIds = students.map((s) => s.id);
    await supabaseAdmin.from('circular_marks').delete().in('enrollment_id', enrIds);
    await supabaseAdmin.from('theology_marks').delete().in('enrollment_id', enrIds);
    await supabaseAdmin.from('enrollments').delete().in('id', enrIds);
    await supabaseAdmin.from('students').delete().in('id', stIds);
    await supabaseAdmin.from('circular_subjects').delete().in('id', [CS_LA1, CS_WRT, CS_ENG, CS_MTH, CS_SCI, CS_SST]);
    await supabaseAdmin.from('theology_subjects').delete().in('id', [TS_4A, TS_4B, TS_5A, TS_5B, TS_5C]);
    await supabaseAdmin.from('circular_classes').delete().in('id', [C_BABY, C_TOP, C_P4, C_P5, C_P6, C_P7, C_SEC_UNMAPPED]);
    await supabaseAdmin.from('theology_classes').delete().in('id', [T_P4, T_P5, T_P7, T_UNMAPPED]);
  });

  it('Server-side RBAC scoping & Section API: Class Teacher calling Section API only receives their assigned class and 403 for unassigned classes', async () => {
    // Admin requesting upper_primary section gets P.4, P.5, P.6, P.7 enrollments & unmapped warning
    const adminRes = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM3_ID}&section_id=upper_primary`,
      { headers: { Cookie: adminCookie } }
    );
    assert.equal(adminRes.status, 200);
    const adminJson = await adminRes.json();
    assert.equal(adminJson.termMeta?.term_number, 3);
    assert.ok(adminJson.enrollments.length >= 12);
    assert.ok(adminJson.unmappedClasses.some((u) => u.id === C_SEC_UNMAPPED));

    // Class Teacher assigned ONLY Primary 1 calling lower_primary only receives Primary 1
    const ctLowerRes = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM1_ID}&section_id=lower_primary`,
      { headers: { Cookie: teacherCookie } }
    );
    assert.equal(ctLowerRes.status, 200);
    const ctLower = await ctLowerRes.json();
    assert.ok(
      ctLower.enrollments.every((e) => e.circular_class_id === 'c1000000-0000-0000-0000-000000000001'),
      'Class Teacher must never receive Primary 2 via section_id=lower_primary'
    );

    // Class Teacher calling section_id=upper_primary gets 0 enrollments (server-side scoped!)
    const ctUpperRes = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM3_ID}&section_id=upper_primary`,
      { headers: { Cookie: teacherCookie } }
    );
    assert.equal(ctUpperRes.status, 200);
    const ctUpper = await ctUpperRes.json();
    assert.equal(ctUpper.enrollments.length, 0);

    // Direct class_id for unassigned class is 403
    const forbiddenRes = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM3_ID}&class_id=${C_P4}`,
      { headers: { Cookie: teacherCookie } }
    );
    assert.equal(forbiddenRes.status, 403);
  });

  it('SQL Independent Reconciliation (E1): Section sums == sum(class counts) and Section Top 10 matches raw Postgres SQL recomputation on Secular & Theology', async () => {
    const pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();
    try {
      // 1. Fetch Secular Upper Primary API payload and independently recompute in SQL/Postgres
      const secApiRes = await fetch(
        `${BASE_URL}/api/secular-hub?term_id=${TERM3_ID}&section_id=upper_primary`,
        { headers: { Cookie: adminCookie } }
      );
      const secApi = await secApiRes.json();

      const secSql = await pgClient.query(`
        SELECT e.id AS enrollment_id, s.name, cc.id AS class_id, cc.class_name,
               COUNT(cm.eot_score) FILTER (WHERE cm.eot_score IS NOT NULL) AS sat_count,
               COALESCE(SUM(cm.eot_score), 0)::numeric AS total_score,
               ROUND((COALESCE(SUM(cm.eot_score), 0)::numeric / (4 * 100.0)) * 100, 2) AS avg_pct
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        JOIN public.circular_classes cc ON cc.id = e.circular_class_id
        LEFT JOIN public.circular_marks cm ON cm.enrollment_id = e.id AND cm.term_id = $1
        WHERE cc.id IN ($2, $3, $4) AND e.is_active = true
        GROUP BY e.id, s.name, cc.id, cc.class_name
      `, [TERM3_ID, C_P4, C_P5, C_P6]);

      const secHubMetrics = computeHubCohortMetrics({
        curriculum: 'secular',
        mode: 'section',
        sectionId: 'upper_primary',
        classes: secApi.classes.filter((c) => [C_P4, C_P5, C_P6, C_P7].includes(c.id)),
        enrollments: secApi.enrollments,
        marks: secApi.marks,
        subjects: secApi.subjects,
        examPhase: 'eot',
        termNumber: 3,
        gradingConfig: secApi.gradingConfig,
      });

      // Verify class count reconciliation
      assert.equal(
        secHubMetrics.classBreakdown.filter((c) => !c.isCandidateExcluded).reduce((a, b) => a + b.totalEnrolled, 0),
        secSql.rows.length
      );
      const sqlComplete = secSql.rows
        .filter((r) => Number(r.sat_count) === 4)
        .sort((a, b) => Number(b.avg_pct) - Number(a.avg_pct));
      assert.equal(secHubMetrics.summary.satCandidates, sqlComplete.length);

      // Recompute ties (1,2,2,4) on SQL rows
      let curRank = 1;
      const sqlTop10 = sqlComplete.slice(0, 10).map((r, idx) => {
        if (idx > 0 && Number(r.avg_pct) !== Number(sqlComplete[idx - 1].avg_pct)) curRank = idx + 1;
        return { id: r.enrollment_id, rank: curRank, avg_pct: Number(r.avg_pct) };
      });
      assert.deepEqual(
        secHubMetrics.top10.map((s) => ({ id: s.id, rank: s.position, avg_pct: s.normalizedScore })),
        sqlTop10
      );

      // 2. Theology Upper Primary API & SQL reconciliation (heterogeneous 2 vs 3 subjects!)
      const theoApiRes = await fetch(
        `${BASE_URL}/api/theology-hub?term_id=${TERM3_ID}&section_id=upper_primary`,
        { headers: { Cookie: adminCookie } }
      );
      const theoApi = await theoApiRes.json();
      assert.ok(theoApi.unmappedClasses.some((u) => u.id === T_UNMAPPED));

      const theoSql = await pgClient.query(`
        WITH expected AS (
          SELECT tc.id AS class_id, tc.level, COUNT(ts.id)::int AS exp_cnt
          FROM public.theology_classes tc
          JOIN public.theology_subjects ts ON ts.level = tc.level
          WHERE tc.id IN ($2, $3)
          GROUP BY tc.id, tc.level
        )
        SELECT e.id AS enrollment_id, tc.id AS class_id, ex.exp_cnt,
               COUNT(tm.eot_score) FILTER (WHERE tm.eot_score IS NOT NULL)::int AS sat_cnt,
               COALESCE(SUM(tm.eot_score), 0)::numeric AS total_score,
               ROUND((COALESCE(SUM(tm.eot_score), 0)::numeric / (ex.exp_cnt * 100.0)) * 100, 2) AS avg_pct
        FROM public.enrollments e
        JOIN public.theology_classes tc ON tc.id = e.theology_class_id
        JOIN expected ex ON ex.class_id = tc.id
        LEFT JOIN public.theology_marks tm ON tm.enrollment_id = e.id AND tm.term_id = $1
        WHERE e.is_active = true
        GROUP BY e.id, tc.id, ex.exp_cnt
      `, [TERM3_ID, T_P4, T_P5]);

      const theoHubMetrics = computeHubCohortMetrics({
        curriculum: 'theology',
        mode: 'section',
        sectionId: 'upper_primary',
        classes: theoApi.classes.filter((c) => [T_P4, T_P5, T_P7].includes(c.id)),
        enrollments: theoApi.enrollments,
        marks: theoApi.marks,
        subjects: theoApi.subjects,
        examPhase: 'eot',
        termNumber: 3,
        gradingConfig: theoApi.gradingConfig,
      });

      assert.equal(theoHubMetrics.isNormalizedRanking, true);
      assert.equal(theoHubMetrics.hasHeterogeneousSubjects, true);

      const theoSqlComplete = theoSql.rows
        .filter((r) => Number(r.sat_cnt) === Number(r.exp_cnt))
        .sort((a, b) => Number(b.avg_pct) - Number(a.avg_pct));
      let tRank = 1;
      const theoSqlTop10 = theoSqlComplete.slice(0, 10).map((r, idx) => {
        if (idx > 0 && Number(r.avg_pct) !== Number(theoSqlComplete[idx - 1].avg_pct)) tRank = idx + 1;
        return { id: r.enrollment_id, rank: tRank, avg_pct: Number(r.avg_pct) };
      });
      assert.deepEqual(
        theoHubMetrics.top10.map((s) => ({ id: s.id, rank: s.position, avg_pct: s.normalizedScore })),
        theoSqlTop10
      );
    } finally {
      await pgClient.end();
    }
  });

  it('Playwright Chromium E2E (E1): P.7 N/A Guard, Section Filter, Class Breakdown, Missing Marks & Top 10 on BOTH Hubs', async () => {
    const launchOpts = fs.existsSync('/usr/bin/google-chrome')
      ? { headless: true, executablePath: '/usr/bin/google-chrome' }
      : { headless: true };
    const browser = await chromium.launch(launchOpts);
    const consoleErrors = [];

    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.locator('input[type="text"]').first().fill('admin');
      await page.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }),
        page.locator('button[type="submit"]').click(),
      ]);

      // -------------------------------------------------------------
      // A. SECULAR HUB E2E (P.7 Guard + Upper Primary Section + Top 10 + Nursery)
      // -------------------------------------------------------------
      await page.goto(`${BASE_URL}/admin/secular-hub?term_id=${TERM3_ID}&class_id=${C_P7}&exam_phase=eot`, {
        waitUntil: 'networkidle',
      });
      const secNa = page.getByTestId('candidate-class-na-banner');
      await secNa.waitFor({ state: 'visible', timeout: 15000 });
      assert.match(await secNa.innerText(), /N\/A — candidate class/);

      // Clicking BOT still renders P.7 BOT marks cleanly!
      await secNa.getByRole('button', { name: /View Term 3 BOT/i }).click();
      await page.getByText('P3 Synth Student 13').first().waitFor({ state: 'visible', timeout: 15000 });

      // Switch to EOT and select Upper Primary Section via Section selector beside Class
      await page.locator('button:visible', { hasText: /^EOT$/ }).first().click();
      const secSectionSelect = page.getByTestId('secular-hub-section-select');
      assert.ok(await secSectionSelect.getAttribute('aria-label'));
      await secSectionSelect.click();
      await page.getByRole('button', { name: /Upper Primary/i }).first().click();

      // Combined Upper Primary view: P.7 excluded notice, unmapped class warning, ranking disclosure
      await page.getByTestId('section-candidate-exclusion-notice').waitFor({ state: 'visible', timeout: 15000 });
      const unmappedWarn = page.getByTestId('unmapped-classes-warning');
      await unmappedWarn.waitFor({ state: 'visible', timeout: 10000 });
      assert.match(await unmappedWarn.innerText(), /Tahfidh Bridging/);
      await page.getByTestId('ranking-method-disclosure').waitFor({ state: 'visible', timeout: 10000 });

      // Analysis tab: verify Class Breakdown table has P.7 N/A badge & Missing Marks panel lists Student 11
      await page.locator('button:visible', { hasText: /^Analysis$/ }).first().click();
      const clsTable = page.getByTestId('class-breakdown-table');
      await clsTable.waitFor({ state: 'visible', timeout: 10000 });
      const clsText = await clsTable.innerText();
      assert.match(clsText, /P\.7 Candidates[\s\S]*N\/A — candidate class/);
      const missingPanel = page.getByTestId('missing-marks-panel');
      await missingPanel.waitFor({ state: 'visible', timeout: 10000 });
      assert.match(await missingPanel.innerText(), /P3 Synth Student 11/);

      // Top 10 tab: verify Student 03 (96%) #1 & tied #2 Student 04 + 07 (88%)
      await page.locator('button:visible', { hasText: /^Top 10$/ }).first().click();
      await page.getByText('Official Top 10 Merit Roll — Upper Primary').waitFor({ state: 'visible', timeout: 10000 });
      const secTopText = await page.locator('main').last().innerText();
      assert.match(secTopText, /P3 Synth Student 03/);
      assert.ok(!secTopText.includes('P3 Synth Student 13'), 'P.7 candidate must not appear in Term 3 EOT Top 10');

      const axePath = 'node_modules/axe-core/axe.min.js';
      if (fs.existsSync(axePath)) {
        await page.addScriptTag({ path: axePath });
        const secAxe = await page.evaluate(async () => {
          const mains = document.querySelectorAll('main');
          const hubMain = mains[mains.length - 1];
          return await window.axe.run(hubMain, {
            runOnly: ['wcag2a', 'wcag2aa'],
          });
        });
        assert.deepEqual(
          secAxe.violations.map((v) => `${v.id}: ${v.help}`),
          [],
          'Secular Hub must be axe-clean (wcag2a/wcag2aa)'
        );
      }

      // -------------------------------------------------------------
      // B. THEOLOGY HUB E2E (P.7 Guard + Upper Primary Heterogeneous Section + Top 10)
      // -------------------------------------------------------------
      await page.goto(`${BASE_URL}/admin/theology-hub?term_id=${TERM3_ID}&class_id=${T_P7}&exam_phase=eot`, {
        waitUntil: 'networkidle',
      });
      const theoNa = page.getByTestId('candidate-class-na-banner');
      await theoNa.waitFor({ state: 'visible', timeout: 15000 });
      assert.match(await theoNa.innerText(), /N\/A — candidate class/);

      const theoSectionSelect = page.getByTestId('theology-hub-section-select');
      assert.ok(await theoSectionSelect.getAttribute('aria-label'));
      await theoSectionSelect.click();
      await page.getByRole('button', { name: /Upper Primary/i }).first().click();

      await page.getByTestId('section-candidate-exclusion-notice').waitFor({ state: 'visible', timeout: 15000 });
      await page.getByTestId('unmapped-classes-warning').waitFor({ state: 'visible', timeout: 10000 });
      const rankDisclosure = await page.getByTestId('ranking-method-disclosure').innerText();
      assert.match(rankDisclosure, /الترتيب المعياري/);

      // Analysis & Top 10 in Arabic RTL
      await page.locator('button:visible', { hasText: /^Analysis$/ }).first().click();
      await page.getByTestId('class-breakdown-table').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('missing-marks-panel').waitFor({ state: 'visible', timeout: 10000 });

      await page.locator('button:visible', { hasText: /^Top 10$/ }).first().click();
      await page.getByText('قائمة الشرف').waitFor({ state: 'visible', timeout: 10000 });
      const theoTopText = await page.locator('main').last().innerText();
      assert.match(theoTopText, /تلميذ تجريبي 03/);
      assert.ok(!theoTopText.includes('تلميذ تجريبي 13'), 'P.7 Theology student excluded from Term 3 EOT Top 10');

      if (fs.existsSync(axePath)) {
        await page.addScriptTag({ path: axePath });
        const theoAxe = await page.evaluate(async () => {
          const mains = document.querySelectorAll('main');
          const hubMain = mains[mains.length - 1];
          return await window.axe.run(hubMain, {
            runOnly: ['wcag2a', 'wcag2aa'],
          });
        });
        assert.deepEqual(
          theoAxe.violations.map((v) => `${v.id}: ${v.help}`),
          [],
          'Theology Hub must be axe-clean (wcag2a/wcag2aa)'
        );
      }

      assert.deepEqual(consoleErrors, []);
    } finally {
      await browser.close();
    }
  });
});
