import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { chromium } from 'playwright';
import { enforceLocalSafeEnvironment, getRehearsalCredentials } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import { computeHubCohortMetrics } from '../lib/hub-cohort-engine.ts';
import {
  buildDetailedReportCsv,
  clampSupportThreshold,
  computeHubDetailedReport,
  filterNeedsSupportLearners,
} from '../lib/hub-detailed-report.ts';

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

const TERM2_ID = 'e4500000-0000-4000-8000-999999999992'; // Term 2, 2025 (precedes Term 3, 2025)
const TERM3_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-333333333333'; // Term 3, 2025

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

describe('Phase 4A Unit Suite — Pure Detailed Report Engine, Reconciliation, Support Stepper, Trends & Quality Flags', () => {
  it('Reconciles bit-for-bit with Phase 3 computeHubCohortMetrics while computing stats, trends, support stepper, and quality flags', () => {
    const classes = [
      { id: 'c-baby', class_name: 'Baby Class', section: 'nursery' },
      { id: 'c-p1', class_name: 'Primary 1', section: 'lower_primary' },
      { id: 'c-p4', class_name: 'P.4 East', section: 'upper_primary' },
      { id: 'c-p5', class_name: 'P.5 East', section: 'upper_primary' },
      { id: 'c-p7', class_name: 'P.7 Candidates', section: 'upper_primary' },
      { id: 'c-unmapped', class_name: 'Tahfidh Special', section: 'special' },
    ];

    const subjects = [
      { id: 's-la1', subject_name: 'Learning Area 1', section: 'nursery', is_core: true, is_gradable: true },
      { id: 's-lit', subject_name: 'Literacy I', section: 'lower_primary', is_core: true, is_gradable: true },
      { id: 's-eng', subject_name: 'English', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: 's-mth', subject_name: 'Mathematics', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: 's-sci', subject_name: 'Science', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: 's-sst', subject_name: 'Social Studies', section: 'upper_primary', is_core: true, is_gradable: true },
    ];

    const enrollments = [
      { id: 'e-baby', student_id: 'stu-baby', circular_class_id: 'c-baby', students: { name: 'Baby A', gender: 'female', is_archived: false } },
      { id: 'e-p1', student_id: 'stu-p1', circular_class_id: 'c-p1', students: { name: 'P1 Weak', gender: 'male', is_archived: false } },
      { id: 'e-p4-hi', student_id: 'stu-p4-hi', circular_class_id: 'c-p4', students: { name: 'P4 High', gender: 'female', is_archived: false } },
      { id: 'e-p4-lo', student_id: 'stu-p4-lo', circular_class_id: 'c-p4', students: { name: 'P4 Support', gender: 'male', is_archived: false } },
      { id: 'e-p5-mid', student_id: 'stu-p5-mid', circular_class_id: 'c-p5', students: { name: 'P5 Mid', gender: 'female', is_archived: false } },
      { id: 'e-p5-inc', student_id: 'stu-p5-inc', circular_class_id: 'c-p5', students: { name: 'P5 Incomplete', gender: 'male', is_archived: false } },
      { id: 'e-p5-arch', student_id: 'stu-p5-arch', circular_class_id: 'c-p5', students: { name: 'Archived Hidden', gender: 'male', is_archived: true } },
      { id: 'e-p7', student_id: 'stu-p7', circular_class_id: 'c-p7', students: { name: 'P7 Candidate', gender: 'female', is_archived: false } },
    ];

    const marks = [
      { enrollment_id: 'e-baby', student_id: 'stu-baby', subject_id: 's-la1', eot_score: 90, mot_score: 80 }, // +10pp
      { enrollment_id: 'e-p1', student_id: 'stu-p1', subject_id: 's-lit', eot_score: 42, mot_score: 55 }, // declined -13pp
      { enrollment_id: 'e-p4-hi', student_id: 'stu-p4-hi', subject_id: 's-eng', eot_score: 95, mot_score: 80 },
      { enrollment_id: 'e-p4-hi', student_id: 'stu-p4-hi', subject_id: 's-mth', eot_score: 95, mot_score: 80 },
      { enrollment_id: 'e-p4-hi', student_id: 'stu-p4-hi', subject_id: 's-sci', eot_score: 95, mot_score: 80 },
      { enrollment_id: 'e-p4-hi', student_id: 'stu-p4-hi', subject_id: 's-sst', eot_score: 75, mot_score: 60 }, // mean = 90 vs 75 (+15pp)
      { enrollment_id: 'e-p4-lo', student_id: 'stu-p4-lo', subject_id: 's-eng', eot_score: 48, mot_score: 44 },
      { enrollment_id: 'e-p4-lo', student_id: 'stu-p4-lo', subject_id: 's-mth', eot_score: 48, mot_score: 44 },
      { enrollment_id: 'e-p4-lo', student_id: 'stu-p4-lo', subject_id: 's-sci', eot_score: 48, mot_score: 44 },
      { enrollment_id: 'e-p4-lo', student_id: 'stu-p4-lo', subject_id: 's-sst', eot_score: 48, mot_score: 44 }, // mean = 48 vs 44 (+4pp)
      { enrollment_id: 'e-p5-mid', student_id: 'stu-p5-mid', subject_id: 's-eng', eot_score: 62, mot_score: 60 },
      { enrollment_id: 'e-p5-mid', student_id: 'stu-p5-mid', subject_id: 's-mth', eot_score: 62, mot_score: 60 },
      { enrollment_id: 'e-p5-mid', student_id: 'stu-p5-mid', subject_id: 's-sci', eot_score: 62, mot_score: 60 },
      { enrollment_id: 'e-p5-mid', student_id: 'stu-p5-mid', subject_id: 's-sst', eot_score: 54, mot_score: 60 }, // mean = 60
      { enrollment_id: 'e-p5-inc', student_id: 'stu-p5-inc', subject_id: 's-eng', eot_score: 80, mot_score: 80 }, // incomplete
      { enrollment_id: 'e-p5-arch', student_id: 'stu-p5-arch', subject_id: 's-eng', eot_score: 99, mot_score: 99 }, // archived!
    ];

    const rawMarksForQuality = [
      ...marks,
      { enrollment_id: 'e-p4-hi', student_id: 'stu-p4-hi', subject_id: 's-eng', eot_score: 95 }, // 1 duplicate row
      { enrollment_id: 'e-p5-inc', student_id: 'stu-p5-inc', subject_id: 's-sst', eot_score: 109 }, // 1 out-of-range score (unique subject!)
    ];

    const activeEnrollments = enrollments.filter((e) => !e.students.is_archived);
    const phase3School = computeHubCohortMetrics({
      curriculum: 'secular',
      mode: 'section',
      sectionId: null,
      classes,
      enrollments: activeEnrollments,
      marks,
      subjects,
      examPhase: 'eot',
      termNumber: 3,
      termLabel: 'Term 3, 2025',
    });

    const phase4 = computeHubDetailedReport({
      curriculum: 'secular',
      scope: 'school',
      termId: TERM3_ID,
      termLabel: 'Term 3, 2025',
      termNumber: 3,
      academicYear: 2025,
      examPhase: 'eot',
      supportThreshold: 50,
      classes,
      enrollments,
      marks,
      rawMarksForQuality,
      subjects,
      marksLocks: { eot_locked: true },
      previousExamBaseline: {
        available: true,
        examPhase: 'mot',
        label: 'Term 3, 2025 MOT',
        labelArabic: 'منتصف الفترة الثالثة',
        marks,
      },
    });

    // Exact Phase 3 parity (archived excluded, P.7 excluded, incomplete excluded)
    assert.equal(phase4.cohort.totalEnrolled, phase3School.summary.totalCandidates);
    assert.equal(phase4.cohort.satComplete, phase3School.summary.satCandidates);
    assert.equal(phase4.cohort.incompleteTotal, phase3School.summary.incompleteCandidates);
    assert.equal(phase4.cohort.candidateExcludedCount, 1);
    assert.equal(phase4.performance.n, 5);
    assert.deepEqual(
      phase4.learners.top10.map((s) => ({ id: s.id, pos: s.position, score: s.normalizedScore })),
      phase3School.top10.map((s) => ({ id: s.id, pos: s.position, score: s.normalizedScore }))
    );

    // Performance stats: [42, 48, 60, 90, 90] -> mean = 66, median = 60, min = 42, max = 90, range = 48
    assert.equal(phase4.performance.meanPct, 66);
    assert.equal(phase4.performance.medianPct, 60);
    assert.equal(phase4.performance.lowestPct, 42);
    assert.equal(phase4.performance.highestPct, 90);
    assert.equal(phase4.performance.rangePct, 48);

    // Needs Support stepper: 50% -> [42, 48] (2); 35% -> []; 65% -> [42, 48, 60] (3)
    assert.deepEqual(phase4.learners.needsSupport.map((s) => s.studentId), ['stu-p1', 'stu-p4-lo']);
    assert.equal(filterNeedsSupportLearners(phase4.learners.eligibleLearners, 'secular', 35).length, 0);
    assert.equal(filterNeedsSupportLearners(phase4.learners.eligibleLearners, 'secular', 65).length, 3);
    assert.equal(clampSupportThreshold(10), 35);
    assert.equal(clampSupportThreshold(99), 65);

    // Archived student completely excluded everywhere
    assert.ok(!phase4.learners.eligibleLearners.some((s) => s.studentId === 'stu-p5-arch'));
    assert.ok(!phase4.cohort.missingLearners.some((s) => s.studentId === 'stu-p5-arch'));

    // Trends: MOT means [80, 55, 75, 44, 60] = 62.8 -> EOT 66 (+3.2 pp); top improved: stu-p4-hi (+15pp), declined: stu-p1 (-13pp)
    assert.equal(phase4.trends.previousExam.available, true);
    assert.equal(phase4.trends.previousExam.previousMeanPct, 62.8);
    assert.equal(phase4.trends.previousExam.currentMeanPct, 66);
    assert.equal(phase4.trends.previousExam.deltaMeanPct, 3.2);
    assert.equal(phase4.trends.previousExam.improvedLearners[0].studentId, 'stu-p4-hi');
    assert.equal(phase4.trends.previousExam.improvedLearners[0].deltaPct, 15);
    assert.equal(phase4.trends.previousExam.declinedLearners[0].studentId, 'stu-p1');
    assert.equal(phase4.trends.previousExam.declinedLearners[0].deltaPct, -13);

    // Comparisons: Section vs Section & Class vs Class
    assert.equal(phase4.comparisons.sectionVsSection.length, 3);
    assert.equal(phase4.comparisons.classVsClass.find((c) => c.classId === 'c-p7')?.candidateExcluded, true);

    // Data quality flags: 1 out-of-range (109), 1 duplicate pair, 1 unmapped class, 1 incomplete learner
    assert.equal(phase4.dataQuality.outOfRangeScores.length, 1);
    assert.equal(phase4.dataQuality.outOfRangeScores[0].score, 109);
    assert.equal(phase4.dataQuality.duplicateMarkRows.length, 1);
    assert.equal(phase4.dataQuality.unmappedClasses.length, 1);
    assert.equal(phase4.dataQuality.missingMarksStudentsCount, 1);
    assert.equal(phase4.cycleCompleteness.examLocked, true);

    // Deterministic insights strictly reference real computed numbers
    const allInsightText = phase4.insights.map((i) => i.text).join('\n');
    assert.match(allInsightText, /5 of 6 active non-candidate/);
    assert.match(allInsightText, /mean normalized average is 66%/);
    assert.match(allInsightText, /2 learner\(s\).*below the 50% threshold/);
    assert.match(allInsightText, /out-of-range score\(s\)/);

    // CSV contains all major sections & formula injection protection
    const csv = buildDetailedReportCsv(phase4, 65);
    assert.match(csv, /SECTION 1: COHORT & PERFORMANCE SUMMARY/);
    assert.match(csv, /SECTION 7: NEEDS SUPPORT \(< 65%\)/);
    assert.match(csv, /P5 Mid/);
  });
});

describe('Phase 4B Live Rehearsal API, Role × Scope Matrix, SQL Reconciliation & Playwright E2E (E1)', () => {
  const RUN = 'e4500000-0000-4000-8000';
  const C_BABY = `${RUN}-000000000001`;
  const C_P4 = `${RUN}-000000000002`;
  const C_P5 = `${RUN}-000000000003`;
  const C_P7 = `${RUN}-000000000004`;
  const C_P1_BASE = 'c1000000-0000-0000-0000-000000000001';
  const C_P2_BASE = 'c1000000-0000-0000-0000-000000000002';

  const T_P4 = `${RUN}-000000000011`;
  const T_P5 = `${RUN}-000000000012`;
  const T_P7 = `${RUN}-000000000013`;
  const T_P1_BASE = 'c0000000-0000-0000-0000-000000000002';

  const S_ENG = `${RUN}-000000000101`;
  const S_MTH = `${RUN}-000000000102`;
  const S_SCI = `${RUN}-000000000103`;
  const S_SST = `${RUN}-000000000104`;
  const S_LA1 = `${RUN}-000000000105`;

  const TS_4A = `${RUN}-000000000201`;
  const TS_4B = `${RUN}-000000000202`;
  const TS_4C = `${RUN}-000000000203`;
  const TS_4D = `${RUN}-000000000204`;
  const TS_5A = `${RUN}-000000000205`;
  const TS_5B = `${RUN}-000000000206`;
  const TS_5C = `${RUN}-000000000207`;
  const TS_5D = `${RUN}-000000000208`;
  const TS_5E = `${RUN}-000000000209`;

  // 10 synthetic students:
  // 0: Baby Class (92%)
  // 1..3: P.4 (90%, 62%, 42% [<50% needs support!])
  // 4..6: P.5 (84%, 56%, incomplete marks)
  // 7: P.5 Archived (99% - MUST be excluded!)
  // 8: P.7 Candidate (BOT 88%, EOT N/A)
  // 9: Primary 1 (assigned to Class Teacher, 78% + 108 out-of-range in P.2 check on another mark)
  const students = Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `${RUN}-0000000003${n}`,
      name: i === 7 ? 'P4 Archived Pupil' : `P4 Synth Learner ${n}`,
      arabic_name: i === 7 ? 'تلميذ مؤرشف' : `تلميذ مرحلة ٤ رقم ${n}`,
      admission_number: `P4S-${n}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      religion: 'Muslim',
      is_muslim: true,
      is_archived: i === 7,
    };
  });

  const enrollments = [
    { id: `${RUN}-000000000401`, student_id: students[0].id, circular_class_id: C_BABY, theology_class_id: null },
    { id: `${RUN}-000000000402`, student_id: students[1].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000403`, student_id: students[2].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000404`, student_id: students[3].id, circular_class_id: C_P4, theology_class_id: T_P4 },
    { id: `${RUN}-000000000405`, student_id: students[4].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000406`, student_id: students[5].id, circular_class_id: C_P5, theology_class_id: T_P5 },
    { id: `${RUN}-000000000407`, student_id: students[6].id, circular_class_id: C_P5, theology_class_id: T_P5 }, // incomplete
    { id: `${RUN}-000000000408`, student_id: students[7].id, circular_class_id: C_P5, theology_class_id: T_P5 }, // archived
    { id: `${RUN}-000000000409`, student_id: students[8].id, circular_class_id: C_P7, theology_class_id: T_P7 }, // candidate
    { id: `${RUN}-000000000410`, student_id: students[9].id, circular_class_id: C_P1_BASE, theology_class_id: T_P1_BASE },
  ];

  // Historical Term 2 inactive enrollments so unique(enrollment_id, subject_id) holds cleanly while Term 2->3 trends match via student_id
  const prevEnrollments = [
    { id: `${RUN}-000000000502`, student_id: students[1].id, circular_class_id: C_P4, theology_class_id: T_P4, is_active: false },
    { id: `${RUN}-000000000503`, student_id: students[2].id, circular_class_id: C_P4, theology_class_id: T_P4, is_active: false },
    { id: `${RUN}-000000000504`, student_id: students[3].id, circular_class_id: C_P4, theology_class_id: T_P4, is_active: false },
  ];

  const cookies = {};

  before(async () => {
    await seedRehearsalDatabase();

    await supabaseAdmin.from('terms').upsert({
      id: TERM2_ID,
      label: 'Term 2, 2025',
      academic_year: 2025,
      term_number: 2,
      is_current: false,
      start_date: '2025-05-15',
      end_date: '2025-08-15',
    });

    await supabaseAdmin.from('circular_classes').upsert([
      { id: C_BABY, class_name: 'Baby Class', section: 'nursery' },
      { id: C_P4, class_name: 'P.4 East', section: 'upper_primary' },
      { id: C_P5, class_name: 'P.5 East', section: 'upper_primary' },
      { id: C_P7, class_name: 'P.7 Candidates', section: 'upper_primary' },
    ]);
    await supabaseAdmin.from('theology_classes').upsert([
      { id: T_P4, class_name_arabic: 'الرابعة', class_name_english: 'P.4 Theology', level: 4 },
      { id: T_P5, class_name_arabic: 'الخامسة', class_name_english: 'P.5 Theology', level: 5 },
      { id: T_P7, class_name_arabic: 'السابعة', class_name_english: 'P.7 Theology', level: 7 },
    ]);
    await supabaseAdmin.from('circular_subjects').upsert([
      { id: S_LA1, subject_name: 'Learning Area 1', section: 'nursery', is_core: true, is_gradable: true },
      { id: S_ENG, subject_name: 'English', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: S_MTH, subject_name: 'Mathematics', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: S_SCI, subject_name: 'Science', section: 'upper_primary', is_core: true, is_gradable: true },
      { id: S_SST, subject_name: 'Social Studies', section: 'upper_primary', is_core: true, is_gradable: true },
    ]);
    await supabaseAdmin.from('theology_subjects').upsert([
      { id: TS_4A, name_arabic: 'القرآن الكريم', subject_name_arabic: 'القرآن الكريم', subject_name: 'Quran 4', section: '4', level: 4, sort_order: 1 },
      { id: TS_4B, name_arabic: 'اللغة العربية', subject_name_arabic: 'اللغة العربية', subject_name: 'Arabic 4', section: '4', level: 4, sort_order: 2 },
      { id: TS_4C, name_arabic: 'الفقه', subject_name_arabic: 'الفقه', subject_name: 'Fiqh 4', section: '4', level: 4, sort_order: 3 },
      { id: TS_4D, name_arabic: 'التربية الإسلامية', subject_name_arabic: 'التربية الإسلامية', subject_name: 'Islamic Studies 4', section: '4', level: 4, sort_order: 4 },
      { id: TS_5A, name_arabic: 'القرآن الكريم', subject_name_arabic: 'القرآن الكريم', subject_name: 'Quran 5', section: '5', level: 5, sort_order: 1 },
      { id: TS_5B, name_arabic: 'اللغة العربية', subject_name_arabic: 'اللغة العربية', subject_name: 'Arabic 5', section: '5', level: 5, sort_order: 2 },
      { id: TS_5C, name_arabic: 'الفقه', subject_name_arabic: 'الفقه', subject_name: 'Fiqh 5', section: '5', level: 5, sort_order: 3 },
      { id: TS_5D, name_arabic: 'التربية الإسلامية', subject_name_arabic: 'التربية الإسلامية', subject_name: 'Islamic Studies 5', section: '5', level: 5, sort_order: 4 },
      { id: TS_5E, name_arabic: 'التاريخ والسيرة', subject_name_arabic: 'التاريخ والسيرة', subject_name: 'History 5', section: '5', level: 5, sort_order: 5 },
    ]);

    const { error: stErr } = await supabaseAdmin.from('students').upsert(students);
    assert.equal(stErr, null, stErr?.message);

    const { error: enrErr } = await supabaseAdmin.from('enrollments').upsert([
      ...enrollments.map((e) => ({
        ...e,
        academic_year: 2025,
        is_active: true,
        theology_status: e.theology_class_id ? 'active' : 'not_applicable',
      })),
      ...prevEnrollments.map((e) => ({
        ...e,
        academic_year: 2024,
        theology_status: 'active',
      })),
    ]);
    assert.equal(enrErr, null, enrErr?.message);

    // Circular marks for Term 3 + historical Term 2
    const circMarks = [
      { enrollment_id: enrollments[0].id, subject_id: S_LA1, term_id: TERM3_ID, mot_score: 88, eot_score: 92 },
    ];
    const upScores = [
      [1, { eot: [94, 92, 88, 86], mot: [84, 82, 80, 78] }], // 90% EOT vs 81% MOT (+9 pp)
      [2, { eot: [65, 63, 61, 59], mot: [70, 68, 66, 64] }], // 62% EOT vs 67% MOT (-5 pp)
      [3, { eot: [45, 43, 41, 39], mot: [40, 38, 36, 34] }], // 42% EOT (<50% Support) vs 37% MOT
      [4, { eot: [86, 86, 82, 82], mot: [80, 80, 76, 76] }], // 84%
      [5, { eot: [58, 58, 54, 54], mot: [50, 50, 48, 48] }], // 56% (<65% when stepped up!)
      [7, { eot: [99, 99, 99, 99], mot: [99, 99, 99, 99] }], // Archived student - MUST ignore
    ];
    const upSubs = [S_ENG, S_MTH, S_SCI, S_SST];
    for (const [idx, s] of upScores) {
      upSubs.forEach((subId, k) => {
        circMarks.push({
          enrollment_id: enrollments[idx].id,
          subject_id: subId,
          term_id: TERM3_ID,
          mot_score: s.mot[k],
          eot_score: s.eot[k],
        });
      });
    }
    // Incomplete P.5 learner (only 3/4 subjects)
    [S_ENG, S_MTH, S_SCI].forEach((subId) => {
      circMarks.push({ enrollment_id: enrollments[6].id, subject_id: subId, term_id: TERM3_ID, eot_score: 77 });
    });
    // P.7 Term 3 BOT marks + Term 3 EOT out-of-range test score on P.5[5] via bot_score / extra row
    upSubs.forEach((subId) => {
      circMarks.push({ enrollment_id: enrollments[8].id, subject_id: subId, term_id: TERM3_ID, bot_score: 88, eot_score: null });
    });
    // Lower primary subject on C_P1_BASE (enrollment[9]) for Term 3 BOT (bot_score: 108 out-of-range; eot_score null avoids single-subject Div U)
    const S_LOWER_MTH = 'c2000000-0000-0000-0000-000000000001';
    circMarks.push(
      { enrollment_id: enrollments[9].id, subject_id: S_LOWER_MTH, term_id: TERM3_ID, bot_score: 108, eot_score: null },
    );

    // Term 2 marks on prevEnrollments for Term 2 -> Term 3 trend
    [
      [prevEnrollments[0].id, [75, 75, 75, 75]], // 75 -> 90 (+15pp)
      [prevEnrollments[1].id, [60, 60, 60, 60]], // 60 -> 62 (+2pp)
      [prevEnrollments[2].id, [48, 48, 48, 48]], // 48 -> 42 (-6pp)
    ].forEach(([eid, vals]) => {
      upSubs.forEach((subId, k) => {
        circMarks.push({ enrollment_id: eid, subject_id: subId, term_id: TERM2_ID, eot_score: vals[k] });
      });
    });

    const { error: cmErr } = await supabaseAdmin.from('circular_marks').insert(circMarks);
    assert.equal(cmErr, null, `circular_marks insert failed: ${cmErr?.message}`);

    // Theology marks (P.4 4 core subjects, P.5 5 subjects -> heterogeneous! P.4[3] = 37% [راسب], Archived[7] = 99%)
    const theoMarks = [
      ...[TS_4A, TS_4B, TS_4C, TS_4D].map((subId, k) => ({ enrollment_id: enrollments[1].id, subject_id: subId, term_id: TERM3_ID, mot_score: 84 - k, eot_score: 90 })), // 90% ممتاز
      ...[TS_4A, TS_4B, TS_4C, TS_4D].map((subId, k) => ({ enrollment_id: enrollments[2].id, subject_id: subId, term_id: TERM3_ID, mot_score: 68 - k, eot_score: 62 })), // 62%
      ...[TS_4A, TS_4B, TS_4C, TS_4D].map((subId, k) => ({ enrollment_id: enrollments[3].id, subject_id: subId, term_id: TERM3_ID, mot_score: 40 - k, eot_score: 37 })), // 37% راسب
      ...[TS_5A, TS_5B, TS_5C, TS_5D, TS_5E].map((subId, k) => ({ enrollment_id: enrollments[4].id, subject_id: subId, term_id: TERM3_ID, mot_score: 78, eot_score: 84 })), // 84%
      ...[TS_5A, TS_5B, TS_5C, TS_5D, TS_5E].map((subId, k) => ({ enrollment_id: enrollments[5].id, subject_id: subId, term_id: TERM3_ID, mot_score: 52, eot_score: 56 })), // 56%
      ...[TS_5A, TS_5B, TS_5C, TS_5D, TS_5E].map((subId) => ({ enrollment_id: enrollments[7].id, subject_id: subId, term_id: TERM3_ID, mot_score: 99, eot_score: 99 })), // archived!
    ];
    const { error: tmErr } = await supabaseAdmin.from('theology_marks').insert(theoMarks);
    assert.equal(tmErr, null, `theology_marks insert failed: ${tmErr?.message}`);

    // Log in all role personas cleanly
    for (const [key, id] of [
      ['admin', 'admin@test.local'],
      ['principal', 'principal@test.local'],
      ['head', 'head@test.local'],
      ['deputy', 'deputy@test.local'],
      ['dosSec', 'dos@test.local'],
      ['dosTheo', 'dos_theology@test.local'],
      ['teacher', 'teacher@test.local'],
      ['theoTeacher', 'theology@test.local'],
      ['staff', 'staff@test.local'],
    ]) {
      cookies[key] = await loginAs(id);
    }
  });

  after(async () => {
    const eIds = [...enrollments, ...prevEnrollments].map((e) => e.id);
    await supabaseAdmin.from('circular_marks').delete().in('enrollment_id', eIds);
    await supabaseAdmin.from('theology_marks').delete().in('enrollment_id', eIds);
    await supabaseAdmin.from('enrollments').delete().in('id', eIds);
    await supabaseAdmin.from('students').delete().in('id', students.map((s) => s.id));
    await supabaseAdmin.from('circular_subjects').delete().in('id', [S_LA1, S_ENG, S_MTH, S_SCI, S_SST]);
    await supabaseAdmin.from('theology_subjects').delete().in('id', [TS_4A, TS_4B, TS_4C, TS_4D, TS_5A, TS_5B, TS_5C, TS_5D, TS_5E]);
    await supabaseAdmin.from('circular_classes').delete().in('id', [C_BABY, C_P4, C_P5, C_P7]);
    await supabaseAdmin.from('theology_classes').delete().in('id', [T_P4, T_P5, T_P7]);
    await supabaseAdmin.from('terms').delete().eq('id', TERM2_ID);
  });

  it('Enforces strict server-side Role × Scope Matrix across all 9 roles + unauthenticated', async () => {
    const req = async (cookie, qs) => {
      const res = await fetch(`${BASE_URL}/api/hub-detailed-report?${qs}`, {
        headers: cookie ? { Cookie: cookie } : {},
      });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    };

    // 1. Unauthenticated -> 401
    assert.equal((await req('', `curriculum=secular&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 401);

    // 2. Support Staff -> 403 across everything
    for (const qs of [
      `curriculum=secular&scope=school&term_id=${TERM3_ID}&exam_phase=eot`,
      `curriculum=secular&scope=class&class_id=${C_P1_BASE}&term_id=${TERM3_ID}&exam_phase=eot`,
      `curriculum=theology&scope=school&term_id=${TERM3_ID}&exam_phase=eot`,
    ]) {
      assert.equal((await req(cookies.staff, qs)).status, 403);
    }

    // 3. School-wide leadership (Administrator, Principal, Head Teacher, Deputy Head Teacher) -> 200 on BOTH hubs
    for (const roleKey of ['admin', 'principal', 'head', 'deputy']) {
      for (const cur of ['secular', 'theology']) {
        const rSchool = await req(cookies[roleKey], `curriculum=${cur}&scope=school&term_id=${TERM3_ID}&exam_phase=eot`);
        assert.equal(rSchool.status, 200, `${roleKey} school ${cur} failed: ${JSON.stringify(rSchool.json)}`);
        assert.equal(rSchool.json.availableScopes.school, true);

        const rSec = await req(cookies[roleKey], `curriculum=${cur}&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot`);
        assert.equal(rSec.status, 200, `${roleKey} section ${cur} failed`);
      }
    }

    // 4. DOS Secular -> 200 Secular (school/section/class), 403 Theology (school/section/class)
    assert.equal((await req(cookies.dosSec, `curriculum=secular&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.dosSec, `curriculum=secular&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.dosSec, `curriculum=theology&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.dosSec, `curriculum=theology&scope=class&class_id=${T_P4}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);

    // 5. DOS Theology -> 200 Theology (school/section/class), 403 Secular (school/section/class)
    assert.equal((await req(cookies.dosTheo, `curriculum=theology&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.dosTheo, `curriculum=theology&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.dosTheo, `curriculum=secular&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.dosTheo, `curriculum=secular&scope=class&class_id=${C_P4}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);

    // 6. Class Teacher (assigned ONLY Primary 1) -> 200 on P.1, 403 on school/section/unassigned/theology
    assert.equal((await req(cookies.teacher, `curriculum=secular&scope=class&class_id=${C_P1_BASE}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.teacher, `curriculum=secular&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.teacher, `curriculum=secular&scope=section&section_id=lower_primary&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.teacher, `curriculum=secular&scope=class&class_id=${C_P4}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.teacher, `curriculum=theology&scope=class&class_id=${T_P4}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);

    // 7. Theology Instructor (assigned ONLY T_P1_BASE) -> 200 on T_P1_BASE, 403 on school/section/unassigned/secular
    assert.equal((await req(cookies.theoTeacher, `curriculum=theology&scope=class&class_id=${T_P1_BASE}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 200);
    assert.equal((await req(cookies.theoTeacher, `curriculum=theology&scope=school&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.theoTeacher, `curriculum=theology&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.theoTeacher, `curriculum=theology&scope=class&class_id=${T_P4}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
    assert.equal((await req(cookies.theoTeacher, `curriculum=secular&scope=class&class_id=${C_P1_BASE}&term_id=${TERM3_ID}&exam_phase=eot`)).status, 403);
  });

  it('Reconciles Detailed Report figures 100% with Phase 3 & Direct Postgres SQL on Secular + Theology, including Archived exclusion & Trends', async () => {
    const pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();
    try {
      // Secular Upper Primary EOT Detailed vs Phase 3
      const [phase3SecRes, phase4SecRes] = await Promise.all([
        fetch(`${BASE_URL}/api/secular-hub?term_id=${TERM3_ID}&section_id=upper_primary`, {
          headers: { Cookie: cookies.principal },
        }),
        fetch(`${BASE_URL}/api/hub-detailed-report?curriculum=secular&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot&support_threshold=50`, {
          headers: { Cookie: cookies.principal },
        }),
      ]);
      assert.equal(phase3SecRes.status, 200);
      assert.equal(phase4SecRes.status, 200);

      const p3Sec = await phase3SecRes.json();
      const { report: p4Sec } = await phase4SecRes.json();

      const p3Computed = computeHubCohortMetrics({
        curriculum: 'secular',
        mode: 'section',
        sectionId: 'upper_primary',
        classes: p3Sec.classes,
        enrollments: p3Sec.enrollments,
        marks: p3Sec.marks,
        subjects: p3Sec.subjects,
        examPhase: 'eot',
        termNumber: 3,
        gradingConfig: p3Sec.gradingConfig,
      });

      assert.equal(p4Sec.cohort.totalEnrolled, p3Computed.summary.totalCandidates);
      assert.equal(p4Sec.cohort.satComplete, p3Computed.summary.satCandidates);
      assert.equal(p4Sec.cohort.candidateExcludedCount, 1);
      assert.equal(p4Sec.performance.meanPct, p3Computed.summary.meanNormalizedPct);
      assert.deepEqual(
        p4Sec.learners.top10.map((s) => s.studentId),
        p3Computed.top10.map((s) => s.student_id)
      );

      // Verify SQL confirms archived P4S-08 excluded and P4S-04 (42%) is Needs Support
      const archCountSql = await pgClient.query(
        `SELECT COUNT(*)::int AS cnt FROM public.students WHERE id = $1 AND is_archived = true`,
        [students[7].id]
      );
      assert.equal(archCountSql.rows[0].cnt, 1);
      assert.ok(!p4Sec.learners.eligibleLearners.some((s) => s.studentId === students[7].id));
      assert.deepEqual(p4Sec.learners.needsSupport.map((s) => s.studentId), [students[3].id]);

      // Trends: vs Term 3 MOT and vs Term 2 EOT!
      assert.equal(p4Sec.trends.previousExam.available, true);
      assert.equal(p4Sec.trends.previousTerm.available, true);
      assert.ok(p4Sec.trends.previousTerm.matchedLearnerCount >= 3);

      // Out-of-range check on Primary 1 BOT (score 108)
      const p1BotRes = await fetch(
        `${BASE_URL}/api/hub-detailed-report?curriculum=secular&scope=class&class_id=${C_P1_BASE}&term_id=${TERM3_ID}&exam_phase=bot`,
        { headers: { Cookie: cookies.teacher } }
      );
      assert.equal(p1BotRes.status, 200);
      const { report: p1Bot } = await p1BotRes.json();
      assert.equal(p1Bot.dataQuality.outOfRangeScores.length, 1);
      assert.equal(p1Bot.dataQuality.outOfRangeScores[0].score, 108);

      // Theology Upper Primary EOT Detailed vs Phase 3
      const [phase3TheoRes, phase4TheoRes] = await Promise.all([
        fetch(`${BASE_URL}/api/theology-hub?term_id=${TERM3_ID}&section_id=upper_primary`, {
          headers: { Cookie: cookies.dosTheo },
        }),
        fetch(`${BASE_URL}/api/hub-detailed-report?curriculum=theology&scope=section&section_id=upper_primary&term_id=${TERM3_ID}&exam_phase=eot`, {
          headers: { Cookie: cookies.dosTheo },
        }),
      ]);
      assert.equal(phase3TheoRes.status, 200);
      assert.equal(phase4TheoRes.status, 200);

      const p3Theo = await phase3TheoRes.json();
      const { report: p4Theo } = await phase4TheoRes.json();
      const p3TheoComp = computeHubCohortMetrics({
        curriculum: 'theology',
        mode: 'section',
        sectionId: 'upper_primary',
        classes: p3Theo.classes,
        enrollments: p3Theo.enrollments,
        marks: p3Theo.marks,
        subjects: p3Theo.subjects,
        examPhase: 'eot',
        termNumber: 3,
        gradingConfig: p3Theo.gradingConfig,
      });

      assert.equal(p4Theo.cohort.totalEnrolled, p3TheoComp.summary.totalCandidates);
      assert.equal(p4Theo.cohort.satComplete, p3TheoComp.summary.satCandidates);
      assert.deepEqual(
        p4Theo.learners.top10.map((s) => s.studentId),
        p3TheoComp.top10.map((s) => s.student_id)
      );
      assert.deepEqual(p4Theo.learners.needsSupport.map((s) => s.studentId), [students[3].id]);
    } finally {
      await pgClient.end();
    }
  });

  it('Playwright Chromium E2E (E1): Secular & Theology Detailed Report, 35%–65% Stepper, Dark-Mode Print Light Paper, CSV, Class Teacher Scope, Axe WCAG', async () => {
    const launchOpts = fs.existsSync('/usr/bin/google-chrome')
      ? { headless: true, executablePath: '/usr/bin/google-chrome' }
      : { headless: true };
    const browser = await chromium.launch(launchOpts);
    const consoleErrors = [];

    try {
      // 1. Principal logged in -> School Scope on BOTH Secular & Theology Hubs
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
      const page = await context.newPage();
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.locator('input[type="text"]').first().fill('principal@test.local');
      await page.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }),
        page.locator('button[type="submit"]').click(),
      ]);

      // Dismiss ProductTour overlay if triggered on first synthetic Principal login
      await page.evaluate(() => localStorage.setItem('jiddah_tour_completed', 'true'));

      // SECULAR HUB DETAILED REPORT
      await page.goto(`${BASE_URL}/admin/secular-hub?term_id=${TERM3_ID}&exam_phase=eot&tab=detailed_report&scope=school`, {
        waitUntil: 'networkidle',
      });
      const closeTourBtn = page.getByLabel('Close Product Tour');
      if (await closeTourBtn.isVisible().catch(() => false)) {
        await closeTourBtn.click();
      }
      await page.getByTestId('detailed-report-view').waitFor({ state: 'visible', timeout: 15000 });
      await page.getByTestId('detailed-report-insights').waitFor({ state: 'visible', timeout: 15000 });
      await page.getByTestId('section-vs-section-table').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('class-vs-class-table').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('subject-class-matrix').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('cycle-completeness-panel').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('data-quality-panel').waitFor({ state: 'visible', timeout: 10000 });

      const secBodyText = await page.getByTestId('detailed-report-view').innerText();
      assert.match(secBodyText, /N\/A — candidate class/);
      assert.match(secBodyText, /Grade A[\s\S]*?1[\s\S]*?100%/);
      assert.ok(!secBodyText.includes('P4 Archived Pupil'), 'Archived learner must NEVER render in Detailed Report');

      // Test Needs Support 35%–65% interactive stepper: default 50% -> 1 learner (42%), step up to 65% -> includes 56% & 62%!
      const kpiCount = page.getByTestId('needs-support-kpi-count');
      assert.equal((await kpiCount.innerText()).trim(), '1');

      await page.getByTestId('needs-support-stepper-inc').click();
      await page.getByTestId('needs-support-stepper-inc').click();
      await page.getByTestId('needs-support-stepper-inc').click();
      assert.equal((await page.getByTestId('needs-support-threshold-value').innerText()).trim(), '< 65%');
      assert.equal((await kpiCount.innerText()).trim(), '3');

      await page.getByTestId('needs-support-stepper-dec').click();
      await page.getByTestId('needs-support-stepper-dec').click();
      await page.getByTestId('needs-support-stepper-dec').click();
      await page.getByTestId('needs-support-stepper-dec').click(); // down to 45%
      await page.getByTestId('needs-support-stepper-dec').click(); // down to 40%
      await page.getByTestId('needs-support-stepper-dec').click(); // down to 35%
      assert.equal((await page.getByTestId('needs-support-threshold-value').innerText()).trim(), '< 35%');
      assert.equal((await kpiCount.innerText()).trim(), '0');

      // CSV download test
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.getByTestId('detailed-report-csv-btn').click(),
      ]);
      assert.match(download.suggestedFilename(), /Jiddah_secular_Detailed_Report/i);

      // Dark-mode Print Portal Light Paper Enforcement Check under actual @media print emulation
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.emulateMedia({ media: 'print' });
      const printDoc = page.locator('#report-print-portal [data-testid="detailed-report-print-document"]');
      await printDoc.waitFor({ state: 'visible', timeout: 10000 });
      const printStyles = await printDoc.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return { bg: cs.backgroundColor, color: cs.color, colorScheme: cs.colorScheme };
      });
      assert.equal(printStyles.bg, 'rgb(255, 255, 255)');
      assert.equal(printStyles.color, 'rgb(17, 24, 39)');
      assert.equal(printStyles.colorScheme, 'light');
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));

      // Axe WCAG 2.0 AA check on Secular Detailed Report
      const axePath = 'node_modules/axe-core/axe.min.js';
      if (fs.existsSync(axePath)) {
        await page.addScriptTag({ path: axePath });
        const secAxe = await page.evaluate(async () => {
          const el = document.querySelector('[data-testid="detailed-report-view"]');
          return await window.axe.run(el, { runOnly: ['wcag2a', 'wcag2aa'] });
        });
        assert.deepEqual(
          secAxe.violations.map((v) => `${v.id}: ${v.help}`),
          [],
          'Secular Detailed Report must be axe-clean'
        );
      }

      // THEOLOGY HUB DETAILED REPORT (RTL Arabic)
      await page.goto(`${BASE_URL}/admin/theology-hub?term_id=${TERM3_ID}&exam_phase=eot&tab=detailed_report&scope=school`, {
        waitUntil: 'networkidle',
      });
      const theoView = page.getByTestId('detailed-report-view');
      await theoView.waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await theoView.getAttribute('dir'), 'rtl');
      await page.getByTestId('detailed-report-insights').waitFor({ state: 'visible', timeout: 15000 });
      const theoText = await theoView.innerText();
      assert.match(theoText, /ممتاز/);
      assert.match(theoText, /N\/A — candidate class/);
      assert.ok(!theoText.includes('تلميذ مؤرشف'), 'Archived theology student must NEVER render');

      await context.close();

      // 2. Class Teacher scoping check in browser (must NOT show Whole School button)
      const tCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const tPage = await tCtx.newPage();
      await tPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await tPage.locator('input[type="text"]').first().fill('teacher@test.local');
      await tPage.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        tPage.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }),
        tPage.locator('button[type="submit"]').click(),
      ]);
      await tPage.evaluate(() => localStorage.setItem('jiddah_tour_completed', 'true'));
      await tPage.goto(`${BASE_URL}/admin/secular-hub?term_id=${TERM3_ID}&class_id=${C_P1_BASE}&exam_phase=bot&tab=detailed_report`, {
        waitUntil: 'networkidle',
      });
      await tPage.getByTestId('detailed-report-view').waitFor({ state: 'visible', timeout: 15000 });
      await tPage.getByTestId('data-quality-panel').waitFor({ state: 'visible', timeout: 10000 });
      assert.match(await tPage.getByTestId('data-quality-panel').innerText(), /108/);
      assert.equal(await tPage.getByTestId('report-scope-school').count(), 0, 'Class Teacher must NOT see Whole School option');
      assert.equal(await tPage.getByTestId('report-scope-section').count(), 0, 'Single-class teacher must NOT see Section option');
      await tCtx.close();

      assert.deepEqual(consoleErrors, []);
    } finally {
      await browser.close();
    }
  });
});
