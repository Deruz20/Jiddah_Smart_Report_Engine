import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import PrimaryEOTReport from '../components/reports/PrimaryEOTReport.tsx';
import TheologyMOTReport from '../components/reports/TheologyMOTReport.tsx';
import NurseryTheologyEOTReport from '../components/reports/NurseryTheologyEOTReport.tsx';
import NurseryEOTReport from '../components/reports/NurseryEOTReport.tsx';
import { enforceLocalSafeEnvironment, getRehearsalCredentials } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import {
  DEFAULT_DIVISION_BOUNDARIES,
  DEFAULT_GRADING_SCALE,
  DEFAULT_PROMOTION_COMMENTS,
  DEFAULT_THEOLOGY_DIVISION_BOUNDARIES,
  DEFAULT_THEOLOGY_REMARKS,
  DEFAULT_THEOLOGY_GRADING_SCALE,
  parseActivityMetadataObject,
} from '../lib/school-settings-helper.ts';
import { getTheologyComment } from '../lib/grading.ts';
import { evaluateCriteria, normalizeGradingCriterion } from '../lib/grading-engine.ts';

enforceLocalSafeEnvironment();
const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const SERVICE_KEY = creds.serviceRoleKey;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEFAULT_PASS = 'Password123!';

const baseOrigin = new URL(BASE_URL);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error(`Refusing to run Phase 2 tests against non-local server: ${BASE_URL}`);
}
const supabaseOrigin = new URL(SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseOrigin.hostname) || supabaseOrigin.port !== '54321') {
  throw new Error(`Refusing to run Phase 2 tests against non-rehearsal Supabase: ${SUPABASE_URL}`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TERM1_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';
const TERM3_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-333333333333';
const ENR_MALE_P1 = 'e0000000-0000-0000-0000-000000000001';
const ENR_FEMALE_P2 = 'e0000000-0000-0000-0000-000000000002';

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
  assert.equal(res.status, 200, `Expected login 200 for ${identifier}, got ${res.status}: ${JSON.stringify(body)}`);
  return extractCookieHeader(res);
}

describe('Phase 2 — Comments, Conduct & Remarks Persistence & Consumers (E1)', () => {
  let adminCookie = '';
  let principalCookie = '';
  let dosSecularCookie = '';
  let dosTheologyCookie = '';
  let teacherCookie = '';
  let theoTeacherCookie = '';
  let baselineSettings = null;
  let baselineConfigIds = new Set();

  before(async () => {
    await seedRehearsalDatabase();
    adminCookie = await loginAs('admin');
    principalCookie = await loginAs('principal');
    dosSecularCookie = await loginAs('dos');
    dosTheologyCookie = await loginAs('dos_theology');
    teacherCookie = await loginAs('teacher');
    theoTeacherCookie = await loginAs('theology');

    const { data: logsBefore } = await supabaseAdmin
      .from('activity_logs')
      .select('id')
      .eq('action', 'school_customization_config');
    baselineConfigIds = new Set((logsBefore || []).map((r) => r.id));

    const getRes = await fetch(`${BASE_URL}/api/settings/school`, {
      headers: { Cookie: adminCookie },
      cache: 'no-store',
    });
    const getBody = await getRes.json();
    baselineSettings = getBody?.data || null;
  });

  it('Unit: diacritic normalization, division priority, double-stringified JSON unwrap & grading_criteria schema adapter', () => {
    // 1) 'جيد جداً' (with fathatan) from division_boundaries MUST match '{ level: "جيد جدا" }' in theology_remarks
    const customRemarks = [
      { level: 'ممتاز', boys: 'CUSTOM_MAMTAZ_B', girls: 'CUSTOM_MAMTAZ_G' },
      { level: 'جيد جدا', boys: 'CUSTOM_JJ_B', girls: 'CUSTOM_JJ_G' },
      { level: 'جيد', boys: 'CUSTOM_J_B', girls: 'CUSTOM_J_G' },
      { level: 'مقبول', boys: 'CUSTOM_M_B', girls: 'CUSTOM_M_G' },
      { level: 'راسب', boys: 'CUSTOM_R_B', girls: 'CUSTOM_R_G' },
    ];
    assert.equal(getTheologyComment(260, 'male', customRemarks, 'جيد جداً'), 'CUSTOM_JJ_B');
    assert.equal(getTheologyComment(260, 'female', customRemarks, 'جيد جداً'), 'CUSTOM_JJ_G');
    // Overall division from IPLE aggregate overrides raw percentage when average is 75% but aggregate is ممتاز
    assert.equal(getTheologyComment(300, 'male', customRemarks, 'ممتاز'), 'CUSTOM_MAMTAZ_B');
    // Subject count divisor works for 3-subject Nursery totals
    assert.equal(getTheologyComment(270, 'female', customRemarks, null, 3), 'CUSTOM_MAMTAZ_G');

    // 2) parseActivityMetadataObject unwraps native object and double-stringified legacy strings
    const nestedString = JSON.stringify(JSON.stringify({ promotion_comments: { promoted: 'OK' } }));
    assert.deepEqual(parseActivityMetadataObject(nestedString), { promotion_comments: { promoted: 'OK' } });
    assert.deepEqual(parseActivityMetadataObject({ a: 1 }), { a: 1 });
    assert.equal(parseActivityMetadataObject('not-json'), null);

    // 3) normalizeGradingCriterion adapts live DB columns (section, grade, min_score, max_score, remark)
    const dbRow = {
      id: 'rule-1',
      section: 'secular',
      class_id: null,
      grade: 'aggregate:comment',
      min_score: 4,
      max_score: 12,
      min_value: 4,
      max_value: 12,
      remark: 'DB_RULE_COMMENT',
    };
    const norm = normalizeGradingCriterion(dbRow);
    assert.equal(norm.curriculum, 'secular');
    assert.equal(norm.metric_type, 'aggregate');
    assert.equal(norm.output_type, 'comment');
    assert.equal(evaluateCriteria(8, 'aggregate', 'secular', 'any-class', [dbRow], 'comment'), 'DB_RULE_COMMENT');
  });

  it('Settings persistence, merge safety across roles, real errors on auth/validation, and end-to-end reflection in reports & hubs', async () => {
    const tempSubjectIds = [
      'd2000000-0000-0000-0000-000000000101',
      'd2000000-0000-0000-0000-000000000102',
      'd2000000-0000-0000-0000-000000000103',
      'd2000000-0000-0000-0000-000000000104',
    ];
    const tempTheoSubjectIds = [
      'd3000000-0000-0000-0000-000000000201',
      'd3000000-0000-0000-0000-000000000202',
      'd3000000-0000-0000-0000-000000000203',
      'd3000000-0000-0000-0000-000000000204',
    ];
    let createdCriteriaId = null;

    const customBoundaries = DEFAULT_DIVISION_BOUNDARIES.map((b) =>
      b.division === 'I'
        ? {
            ...b,
            classTeacherComment: 'E1_CUSTOM_DIV1_TEACHER',
            headTeacherComment: 'E1_CUSTOM_DIV1_HEAD',
            conductRemark: 'E1_CUSTOM_DIV1_CONDUCT',
          }
        : b.division === 'II'
          ? {
              ...b,
              classTeacherComment: 'E1_CUSTOM_DIV2_TEACHER',
              headTeacherComment: 'E1_CUSTOM_DIV2_HEAD',
              conductRemark: 'E1_CUSTOM_DIV2_CONDUCT',
            }
          : b
    );
    const customPromo = {
      ...DEFAULT_PROMOTION_COMMENTS,
      promoted: 'E1_CUSTOM_PROMOTED_REMARK',
      default_conduct: 'E1_CUSTOM_DEFAULT_CONDUCT',
      append_division_comment: false,
    };
    const customSecScale = DEFAULT_GRADING_SCALE.map((b) =>
      b.grade === 'D1' ? { ...b, remark: 'E1_SUBJ_D1_REMARK' } : b
    );
    const customTheoRemarks = DEFAULT_THEOLOGY_REMARKS.map((r) =>
      r.level === 'ممتاز'
        ? { ...r, boys: 'E1_THEO_BOYS_MAMTAZ', girls: 'E1_THEO_GIRLS_MAMTAZ' }
        : r.level === 'جيد جدا'
          ? { ...r, boys: 'E1_THEO_BOYS_JJ', girls: 'E1_THEO_GIRLS_JJ' }
          : r
    );
    const customTheoScale = DEFAULT_THEOLOGY_GRADING_SCALE.map((b, i) =>
      i === 0 ? { ...b, remark: 'E1_THEO_SUBJ_TOP' } : b
    );

    try {
      // 1) Seed 4 core secular subjects into BOTH circular_subjects (trigger) & subjects (report API), plus 4 core theology subjects
      // Note: circular_marks has UNIQUE(enrollment_id, subject_id) on rehearsal DB, so Term 3 reuses a separate student enrollment (ENR_FEMALE_P2)
      const secularSeed = [
        { id: tempSubjectIds[0], subject_name: 'ENG', section: 'lower_primary' },
        { id: tempSubjectIds[1], subject_name: 'MATH', section: 'lower_primary' },
        { id: tempSubjectIds[2], subject_name: 'LIT I', section: 'lower_primary' },
        { id: tempSubjectIds[3], subject_name: 'LIT II', section: 'lower_primary' },
      ];
      const { error: cSubErr } = await supabaseAdmin.from('circular_subjects').upsert(secularSeed, { onConflict: 'id' });
      assert.equal(cSubErr, null, `circular_subjects upsert failed: ${cSubErr?.message}`);
      const { error: subErr } = await supabaseAdmin.from('subjects').upsert(
        secularSeed.map((s) => ({ ...s, curriculum: 'secular' })),
        { onConflict: 'id' }
      );
      assert.equal(subErr, null, `subjects upsert failed: ${subErr?.message}`);

      const { error: t1SubErr } = await supabaseAdmin.from('theology_subjects').upsert([
        { id: tempTheoSubjectIds[0], subject_name_arabic: 'القرآن الكريم', level: 1, sort_order: 1 },
        { id: tempTheoSubjectIds[1], subject_name_arabic: 'اللغة العربية', level: 1, sort_order: 2 },
        { id: tempTheoSubjectIds[2], subject_name_arabic: 'الفقه', level: 1, sort_order: 3 },
        { id: tempTheoSubjectIds[3], subject_name_arabic: 'التربية الإسلامية', level: 1, sort_order: 4 },
      ], { onConflict: 'id' });
      assert.equal(t1SubErr, null, `theology_subjects L1 upsert failed: ${t1SubErr?.message}`);

      const { error: t2SubErr } = await supabaseAdmin.from('theology_subjects').upsert([
        { id: 'd3000000-0000-0000-0000-000000000301', subject_name_arabic: 'القرآن الكريم', level: 2, sort_order: 1 },
        { id: 'd3000000-0000-0000-0000-000000000302', subject_name_arabic: 'اللغة العربية', level: 2, sort_order: 2 },
        { id: 'd3000000-0000-0000-0000-000000000303', subject_name_arabic: 'الفقه', level: 2, sort_order: 3 },
        { id: 'd3000000-0000-0000-0000-000000000304', subject_name_arabic: 'التربية الإسلامية', level: 2, sort_order: 4 },
      ], { onConflict: 'id' });
      assert.equal(t2SubErr, null, `theology_subjects L2 upsert failed: ${t2SubErr?.message}`);

      // Male student (P.1, Term 1): 90+ across 4 core subjects -> Div I (agg 4); Theology 90+ -> ممتاز
      for (const sid of tempSubjectIds) {
        const { error: cmErr } = await supabaseAdmin.from('circular_marks').insert([{
          enrollment_id: ENR_MALE_P1,
          subject_id: sid,
          term_id: TERM1_ID,
          bot_score: 88,
          mot_score: 90,
          eot_score: 92,
        }]);
        assert.equal(cmErr, null, `circular_marks Term 1 insert failed for ${sid}: ${cmErr?.message}`);

        // Seed ENR_FEMALE_P2 (P.2, lower_primary) in Term 3 so Term 3 promotion_comments can be verified cleanly
        const { error: cm3Err } = await supabaseAdmin.from('circular_marks').insert([{
          enrollment_id: ENR_FEMALE_P2,
          subject_id: sid,
          term_id: TERM3_ID,
          bot_score: 88,
          mot_score: 90,
          eot_score: 92,
        }]);
        assert.equal(cm3Err, null, `circular_marks Term 3 insert failed for ${sid}: ${cm3Err?.message}`);
      }
      for (const tsid of tempTheoSubjectIds) {
        const { error: tmErr } = await supabaseAdmin.from('theology_marks').insert([{
          enrollment_id: ENR_MALE_P1,
          subject_id: tsid,
          term_id: TERM1_ID,
          mot_score: 91,
          eot_score: 94,
        }]);
        assert.equal(tmErr, null, `theology_marks L1 insert failed for ${tsid}: ${tmErr?.message}`);
      }

      // Female student (P.2, level 2): Theology 61 across 4 subjects -> 4 pts x 4 = agg 16 -> جيد جداً (13-23)
      for (const tsid of [
        'd3000000-0000-0000-0000-000000000301',
        'd3000000-0000-0000-0000-000000000302',
        'd3000000-0000-0000-0000-000000000303',
        'd3000000-0000-0000-0000-000000000304',
      ]) {
        const { error: tm2Err } = await supabaseAdmin.from('theology_marks').insert([{
          enrollment_id: ENR_FEMALE_P2,
          subject_id: tsid,
          term_id: TERM1_ID,
          mot_score: 61,
          eot_score: 61,
        }]);
        assert.equal(tm2Err, null, `theology_marks L2 insert failed: ${tm2Err?.message}`);
      }

      // 2) Verify authorization failures return real 403/400 errors (never silent 200)
      for (const [roleName, cookie] of [
        ['Class Teacher', teacherCookie],
        ['Principal', principalCookie],
        ['DOS Secular', dosSecularCookie],
      ]) {
        const deniedRes = await fetch(`${BASE_URL}/api/settings/school`, {
          method: 'PATCH',
          headers: { Cookie: cookie, 'Content-Type': 'application/json' },
          body: JSON.stringify({ division_boundaries: customBoundaries }),
        });
        assert.equal(deniedRes.status, 403, `${roleName} must get 403 on comments PATCH`);
        const deniedBody = await deniedRes.json();
        assert.match(deniedBody.error || '', /Access Denied|Insufficient permissions/i);
      }

      const invalidRes = await fetch(`${BASE_URL}/api/settings/school`, {
        method: 'PATCH',
        headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division_boundaries: customBoundaries.map((b) =>
            b.division === 'I' ? { ...b, max: 10 } : b
          ),
        }),
      });
      assert.equal(invalidRes.status, 400);

      // 3) Admin saves comments, conduct, grading scales & theology remarks
      const saveRes = await fetch(`${BASE_URL}/api/settings/school`, {
        method: 'PATCH',
        headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division_boundaries: customBoundaries,
          promotion_comments: customPromo,
          grading_scale: customSecScale,
          theology_remarks: customTheoRemarks,
          theology_grading_scale: customTheoScale,
        }),
      });
      assert.equal(saveRes.status, 200);
      const saveJson = await saveRes.json();
      assert.equal(saveJson.success, true);
      assert.equal(saveJson.data?.division_boundaries?.[0]?.conductRemark, 'E1_CUSTOM_DIV1_CONDUCT');

      // 4) Principal toggles marks_locks — MUST merge cleanly WITHOUT wiping Admin's comment/remark settings
      const lockRes = await fetch(`${BASE_URL}/api/settings/school`, {
        method: 'PATCH',
        headers: { Cookie: principalCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks_locks: { bot_locked: false, mot_locked: false, eot_locked: false } }),
      });
      assert.equal(lockRes.status, 200);
      const lockBody = await lockRes.json();
      assert.equal(lockBody.data?.division_boundaries?.[0]?.conductRemark, 'E1_CUSTOM_DIV1_CONDUCT');
      assert.equal(lockBody.data?.promotion_comments?.promoted, 'E1_CUSTOM_PROMOTED_REMARK');

      // 5) Fresh reload GET /api/settings/school confirms all values persist
      const reloadRes = await fetch(`${BASE_URL}/api/settings/school`, {
        headers: { Cookie: adminCookie },
        cache: 'no-store',
      });
      assert.equal(reloadRes.status, 200);
      const reloadData = (await reloadRes.json()).data;
      assert.equal(reloadData.division_boundaries[0].classTeacherComment, 'E1_CUSTOM_DIV1_TEACHER');
      assert.equal(reloadData.division_boundaries[0].headTeacherComment, 'E1_CUSTOM_DIV1_HEAD');
      assert.equal(reloadData.division_boundaries[0].conductRemark, 'E1_CUSTOM_DIV1_CONDUCT');
      assert.equal(reloadData.promotion_comments.promoted, 'E1_CUSTOM_PROMOTED_REMARK');
      assert.equal(reloadData.promotion_comments.default_conduct, 'E1_CUSTOM_DEFAULT_CONDUCT');
      assert.equal(reloadData.theology_remarks.find((r) => r.level === 'ممتاز')?.boys, 'E1_THEO_BOYS_MAMTAZ');

      // 6) Verify consumers per role: Admin, Class Teacher, DOS Secular, DOS Theology, Theology Instructor
      for (const [label, cookie] of [
        ['Administrator', adminCookie],
        ['Class Teacher', teacherCookie],
      ]) {
        // Term 1 EOT Report
        const repRes = await fetch(
          `${BASE_URL}/api/report?enrollment_id=${ENR_MALE_P1}&term_id=${TERM1_ID}&score_type=eot`,
          { headers: { Cookie: cookie } }
        );
        assert.equal(repRes.status, 200, `/api/report Term 1 EOT failed for ${label}`);
        const rep = await repRes.json();
        assert.equal(rep.circular?.division, 'I', `Expected Div I for ${label}, got circular: ${JSON.stringify(rep.circular)}`);
        assert.equal(rep.circular?.conduct_remark, 'E1_CUSTOM_DIV1_CONDUCT', `${label} conduct mismatch`);
        assert.equal(rep.circular?.class_teacher_comment, 'E1_CUSTOM_DIV1_TEACHER', `${label} teacher comment mismatch`);
        assert.equal(rep.circular?.head_teacher_comment, 'E1_CUSTOM_DIV1_HEAD', `${label} head comment mismatch`);
        assert.equal(rep.circular?.subjects?.[0]?.remark, 'E1_SUBJ_D1_REMARK', `${label} subject remark mismatch`);
        assert.equal(rep.theology?.division, 'ممتاز');
        assert.equal(rep.theology?.teacher_comment, 'E1_THEO_BOYS_MAMTAZ', `${label} theology boys comment mismatch`);
        assert.equal(rep.theology?.subjects?.[0]?.theology_remark, 'E1_THEO_SUBJ_TOP', `${label} theology subj remark mismatch`);

        // Term 2/1 MOT Report: uses custom grading_scale remark, suppresses conduct fallback
        const motRes = await fetch(
          `${BASE_URL}/api/report?enrollment_id=${ENR_MALE_P1}&term_id=${TERM1_ID}&score_type=mot`,
          { headers: { Cookie: cookie } }
        );
        assert.equal(motRes.status, 200);
        const mot = await motRes.json();
        assert.equal(mot.circular?.conduct_remark, '');
        assert.equal(mot.circular?.class_teacher_comment, 'E1_SUBJ_D1_REMARK');
        assert.equal(mot.circular?.head_teacher_comment, 'E1_SUBJ_D1_REMARK');
        assert.equal(mot.circular?.subjects?.[0]?.remark, 'E1_SUBJ_D1_REMARK');

        // Term 3 EOT Report (tested on ENR_FEMALE_P2 by Admin/Class-unscoped): uses custom promotion_comments.promoted
        if (label === 'Administrator') {
          const t3Res = await fetch(
            `${BASE_URL}/api/report?enrollment_id=${ENR_FEMALE_P2}&term_id=${TERM3_ID}&score_type=eot`,
            { headers: { Cookie: cookie } }
          );
          assert.equal(t3Res.status, 200);
          const t3 = await t3Res.json();
          assert.equal(t3.circular?.class_teacher_comment, 'E1_CUSTOM_PROMOTED_REMARK');
        }

        // Batch report API parity check
        const batchRes = await fetch(`${BASE_URL}/api/report/batch`, {
          method: 'POST',
          headers: { Cookie: cookie, 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollment_ids: [ENR_MALE_P1], term_id: TERM1_ID, score_type: 'eot' }),
        });
        assert.equal(batchRes.status, 200, `/api/report/batch failed for ${label}`);
        const batchJson = await batchRes.json();
        const bRep = batchJson.reports?.[0];
        assert.ok(bRep, `Missing batch report for ${label}`);
        assert.equal(bRep.circular?.conduct_remark, 'E1_CUSTOM_DIV1_CONDUCT');
        assert.equal(bRep.circular?.class_teacher_comment, 'E1_CUSTOM_DIV1_TEACHER');
        assert.equal(bRep.circular?.head_teacher_comment, 'E1_CUSTOM_DIV1_HEAD');
        assert.equal(bRep.theology?.teacher_comment, 'E1_THEO_BOYS_MAMTAZ');
      }

      // Check female Theology student comment ('جيد جداً' -> matches '{ level: "جيد جدا" }' girls remark!)
      const femTheoRes = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${ENR_FEMALE_P2}&term_id=${TERM1_ID}&score_type=eot&curriculum=theology`,
        { headers: { Cookie: adminCookie } }
      );
      assert.equal(femTheoRes.status, 200);
      const femTheo = await femTheoRes.json();
      assert.equal(femTheo.theology?.division, 'جيد جداً');
      assert.equal(femTheo.theology?.teacher_comment, 'E1_THEO_GIRLS_JJ');

      // Render actual locked report components with real API report payloads to verify visible output
      const maleRepRes = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${ENR_MALE_P1}&term_id=${TERM1_ID}&score_type=eot`,
        { headers: { Cookie: teacherCookie } }
      );
      const maleRepData = await maleRepRes.json();
      const primaryHtml = renderToStaticMarkup(React.createElement(PrimaryEOTReport, { reportData: maleRepData }));
      assert.match(primaryHtml, /E1_CUSTOM_DIV1_CONDUCT/);
      assert.match(primaryHtml, /E1_CUSTOM_DIV1_TEACHER/);
      assert.match(primaryHtml, /E1_CUSTOM_DIV1_HEAD/);
      assert.match(primaryHtml, /E1_SUBJ_D1_REMARK/);
      assert.match(primaryHtml, /E1_THEO_BOYS_MAMTAZ/);
      assert.match(primaryHtml, /E1_THEO_SUBJ_TOP/);

      const theoHtml = renderToStaticMarkup(React.createElement(TheologyMOTReport, { reportData: femTheo }));
      assert.match(theoHtml, /E1_THEO_GIRLS_JJ/);

      const nurseryTheoHtml = renderToStaticMarkup(React.createElement(NurseryTheologyEOTReport, { reportData: femTheo }));
      assert.match(nurseryTheoHtml, /E1_THEO_GIRLS_JJ/);
      const nurseryTheoMaleHtml = renderToStaticMarkup(React.createElement(NurseryTheologyEOTReport, { reportData: maleRepData }));
      assert.match(nurseryTheoMaleHtml, /E1_THEO_BOYS_MAMTAZ/);
      assert.match(nurseryTheoMaleHtml, /E1_THEO_SUBJ_TOP/);

      const nurseryEotHtml = renderToStaticMarkup(
        React.createElement(NurseryEOTReport, {
          reportData: {
            ...maleRepData,
            circular: {
              ...maleRepData.circular,
              conduct_remark: 'E1_CUSTOM_DEFAULT_CONDUCT',
              class_teacher_comment: 'E1_NURSERY_TEACHER_OVERRIDE',
              head_teacher_comment: 'E1_NURSERY_HEAD_OVERRIDE',
            },
          },
        })
      );
      assert.match(nurseryEotHtml, /E1_CUSTOM_DEFAULT_CONDUCT/);
      assert.match(nurseryEotHtml, /E1_NURSERY_TEACHER_OVERRIDE/);
      assert.match(nurseryEotHtml, /E1_NURSERY_HEAD_OVERRIDE/);

      // Hubs receive live gradingConfig across roles (Admin, DOS, Class Teacher, Theology Instructor)
      for (const [label, cookie] of [
        ['DOS Secular', dosSecularCookie],
        ['Class Teacher', teacherCookie],
      ]) {
        const hubRes = await fetch(`${BASE_URL}/api/secular-hub?term_id=${TERM1_ID}`, {
          headers: { Cookie: cookie },
        });
        assert.equal(hubRes.status, 200, `secular-hub failed for ${label}`);
        const hub = await hubRes.json();
        assert.equal(hub.gradingConfig?.division_boundaries?.[0]?.conductRemark, 'E1_CUSTOM_DIV1_CONDUCT');
        assert.equal(hub.gradingConfig?.grading_scale?.[0]?.remark, 'E1_SUBJ_D1_REMARK');
      }

      for (const [label, cookie] of [
        ['DOS Theology', dosTheologyCookie],
        ['Theology Instructor', theoTeacherCookie],
      ]) {
        const tHubRes = await fetch(`${BASE_URL}/api/theology-hub?term_id=${TERM1_ID}`, {
          headers: { Cookie: cookie },
        });
        assert.equal(tHubRes.status, 200, `theology-hub failed for ${label}`);
        const tHub = await tHubRes.json();
        assert.equal(
          tHub.gradingConfig?.theology_remarks?.find((r) => r.level === 'ممتاز')?.boys,
          'E1_THEO_BOYS_MAMTAZ'
        );
      }

      // 7) grading_criteria native DB columns (section, grade, min_score, max_score, remark) work & override report
      const { data: insRule, error: insRuleErr } = await supabaseAdmin
        .from('grading_criteria')
        .insert([{
          section: 'secular',
          class_id: null,
          grade: 'aggregate:comment',
          min_score: 4,
          max_score: 12,
          min_value: 4,
          max_value: 12,
          remark: 'E1_CRITERIA_OVERRIDE_TEACHER',
        }])
        .select('*')
        .single();
      assert.equal(insRuleErr, null);
      createdCriteriaId = insRule.id;

      const overRes = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${ENR_MALE_P1}&term_id=${TERM1_ID}&score_type=eot`,
        { headers: { Cookie: adminCookie } }
      );
      const overJson = await overRes.json();
      assert.equal(overJson.circular?.class_teacher_comment, 'E1_CRITERIA_OVERRIDE_TEACHER');
      // Conduct remark remains governed by division_boundaries (not clobbered by 'aggregate' teacher rule)
      assert.equal(overJson.circular?.conduct_remark, 'E1_CUSTOM_DIV1_CONDUCT');
    } finally {
      if (createdCriteriaId) {
        await supabaseAdmin.from('grading_criteria').delete().eq('id', createdCriteriaId);
      }
      await supabaseAdmin.from('circular_marks').delete().in('subject_id', tempSubjectIds);
      await supabaseAdmin.from('subjects').delete().in('id', tempSubjectIds);
      await supabaseAdmin.from('circular_subjects').delete().in('id', tempSubjectIds);
      await supabaseAdmin.from('theology_marks').delete().in('subject_id', [
        ...tempTheoSubjectIds,
        'd3000000-0000-0000-0000-000000000301',
        'd3000000-0000-0000-0000-000000000302',
        'd3000000-0000-0000-0000-000000000303',
        'd3000000-0000-0000-0000-000000000304',
      ]);
      await supabaseAdmin.from('theology_subjects').delete().in('id', [
        ...tempTheoSubjectIds,
        'd3000000-0000-0000-0000-000000000301',
        'd3000000-0000-0000-0000-000000000302',
        'd3000000-0000-0000-0000-000000000303',
        'd3000000-0000-0000-0000-000000000304',
      ]);

      // Restore clean baseline settings snapshot in DB
      const { data: logsAfter } = await supabaseAdmin
        .from('activity_logs')
        .select('id')
        .eq('action', 'school_customization_config');
      const idsToDelete = (logsAfter || [])
        .map((r) => r.id)
        .filter((id) => !baselineConfigIds.has(id));
      if (idsToDelete.length > 0) {
        await supabaseAdmin.from('activity_logs').delete().in('id', idsToDelete);
      }
    }
  });

  it('Browser UI (Playwright): Edit conduct remark in /admin/settings, save with verified toast, reload page, and confirm persistence', async () => {
    const launchOpts = fs.existsSync('/usr/bin/google-chrome')
      ? { headless: true, executablePath: '/usr/bin/google-chrome' }
      : { headless: true };
    const browser = await chromium.launch(launchOpts);
    const uiConductMarker = `E1_UI_CONDUCT_${Date.now()}`;

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.locator('input[type="text"]').first().fill('admin');
      await page.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
        page.locator('button[type="submit"]').click(),
      ]);

      await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
      const navBtn = page.locator('button:visible', { hasText: 'Grading & Remarks Engine' }).first();
      await navBtn.click();

      const conductInput = page.locator('input[placeholder="Good conduct."]:visible').first();
      await conductInput.waitFor({ state: 'visible', timeout: 10000 });
      await conductInput.fill(uiConductMarker);

      // Click the "Save Changes" button inside the Term 3 Promotion Remarks & General Conduct card
      const promoCard = page.locator('div.rounded-2xl', { hasText: 'Term 3 Promotion Remarks & General Conduct' }).first();
      await promoCard.getByRole('button', { name: /Save Changes/i }).click();

      await page.getByText(/saved and verified/i).first().waitFor({ state: 'visible', timeout: 10000 });

      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('button:visible', { hasText: 'Grading & Remarks Engine' }).first().click();
      const reloadedInput = page.locator('input[placeholder="Good conduct."]:visible').first();
      await reloadedInput.waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(await reloadedInput.inputValue(), uiConductMarker);
    } finally {
      await browser.close();
      const { data: logsAfter } = await supabaseAdmin
        .from('activity_logs')
        .select('id')
        .eq('action', 'school_customization_config');
      const idsToDelete = (logsAfter || [])
        .map((r) => r.id)
        .filter((id) => !baselineConfigIds.has(id));
      if (idsToDelete.length > 0) {
        await supabaseAdmin.from('activity_logs').delete().in('id', idsToDelete);
      }
      await supabaseAdmin
        .from('activity_logs')
        .delete()
        .eq('action', 'update_school_settings')
        .gte('created_at', new Date(Date.now() - 120_000).toISOString());
    }
  });
});
