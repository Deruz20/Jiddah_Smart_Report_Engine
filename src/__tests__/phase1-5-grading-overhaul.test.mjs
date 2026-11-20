import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  extractGradePoint,
  getSubjectGradeNumber,
  getGradeDisplay,
  calculateAggregate,
  getDivision,
  getTheologyGradeNumber,
  getTheologyGradeDisplay,
  getTheologySubjectRemark,
  calculateTheologyAggregate,
  calculateTheologyAggregateFromMarks,
  getTheologyDivision,
  getTheologyDivisionDetails,
  getTheologyComment,
} from '../lib/grading.ts';

import {
  DEFAULT_DIVISION_BOUNDARIES,
  DEFAULT_THEOLOGY_GRADING_BANDS,
  DEFAULT_THEOLOGY_DIVISION_BOUNDARIES,
  normalizeLegacyTheologyGradingScale,
  validateGradingBands,
  validateDivisionBoundaries,
  resolveTheologyGradingBands,
  resolveTheologyDivisionBoundaries,
} from '../lib/school-settings-helper.ts';

describe('Phase 1.5 — 1. Boundary Proof (4–12 = Div I / Mamtaz, 13 = Div II)', () => {
  it('Secular: aggregates 4 and 12 both yield Division I, and 13 yields Division II', () => {
    const marksAgg4 = [
      { subject_name: 'English', score: 90 },
      { subject_name: 'Mathematics', score: 88 },
      { subject_name: 'Science', score: 86 },
      { subject_name: 'Social Studies', score: 85 },
    ];
    const agg4 = calculateAggregate(marksAgg4, 'upper_primary');
    assert.equal(agg4, 4);
    assert.equal(getDivision(agg4), 'I');

    const marksAgg12 = [
      { subject_name: 'English', score: 70 },       // C3 = 3
      { subject_name: 'Mathematics', score: 72 },   // C3 = 3
      { subject_name: 'Science', score: 74 },       // C3 = 3
      { subject_name: 'Social Studies', score: 71 },// C3 = 3
    ];
    const agg12 = calculateAggregate(marksAgg12, 'upper_primary');
    assert.equal(agg12, 12);
    assert.equal(getDivision(agg12), 'I');

    const marksAgg13 = [
      { subject_name: 'English', score: 70 },       // C3 = 3
      { subject_name: 'Mathematics', score: 72 },   // C3 = 3
      { subject_name: 'Science', score: 74 },       // C3 = 3
      { subject_name: 'Social Studies', score: 65 },// C4 = 4
    ];
    const agg13 = calculateAggregate(marksAgg13, 'upper_primary');
    assert.equal(agg13, 13);
    assert.equal(getDivision(agg13), 'II');

    // Full Secular boundary sweep (4..36)
    assert.equal(getDivision(23), 'II');
    assert.equal(getDivision(24), 'II');
    assert.equal(getDivision(25), 'III');
    assert.equal(getDivision(29), 'III');
    assert.equal(getDivision(30), 'IV');
    assert.equal(getDivision(34), 'IV');
    assert.equal(getDivision(35), 'U');
    assert.equal(getDivision(36), 'U');
  });

  it('Theology (IPLE): aggregates 4 and 12 both yield ممتاز (Mamtaz), and 13 yields جيد جداً (Div 2)', () => {
    const marksAgg4 = [
      { subject_name_arabic: 'القرآن الكريم', score: 92 },
      { subject_name_arabic: 'اللغة العربية', score: 88 },
      { subject_name_arabic: 'الفقه', score: 86 },
      { subject_name_arabic: 'التربية الإسلامية', score: 85 },
    ];
    const agg4 = calculateTheologyAggregateFromMarks(marksAgg4);
    assert.equal(agg4, 4);
    assert.equal(getTheologyDivision(agg4), 'ممتاز');

    // 4 x C3 (65 each -> 4 * 3 = 12 aggregate) MUST yield ممتاز
    const marksAgg12 = [
      { subject_name_arabic: 'القرآن الكريم', score: 65 },
      { subject_name_arabic: 'اللغة العربية', score: 68 },
      { subject_name_arabic: 'الفقه', score: 70 },
      { subject_name_arabic: 'التربية الإسلامية', score: 74 },
    ];
    const agg12 = calculateTheologyAggregateFromMarks(marksAgg12);
    assert.equal(agg12, 12);
    assert.equal(getTheologyDivision(agg12), 'ممتاز');

    // Legacy failure case: avg 73.75% ([85, 75, 70, 65] => 1+2+3+3 = 9 agg) MUST yield ممتاز (not جيد!)
    const agg9 = calculateTheologyAggregate([85, 75, 70, 65]);
    assert.equal(agg9, 9);
    assert.equal(getTheologyDivision(agg9), 'ممتاز');

    // 3 x C3 (65) + 1 x C4 (60) => 3+3+3+4 = 13 aggregate MUST yield جيد جداً (Div 2)
    const marksAgg13 = [
      { subject_name_arabic: 'القرآن الكريم', score: 65 },
      { subject_name_arabic: 'اللغة العربية', score: 65 },
      { subject_name_arabic: 'الفقه', score: 65 },
      { subject_name_arabic: 'التربية الإسلامية', score: 60 },
    ];
    const agg13 = calculateTheologyAggregateFromMarks(marksAgg13);
    assert.equal(agg13, 13);
    assert.equal(getTheologyDivision(agg13), 'جيد جداً');

    // Full Theology boundary sweep (4..36)
    assert.equal(getTheologyDivision(23), 'جيد جداً');
    assert.equal(getTheologyDivision(24), 'جيد');
    assert.equal(getTheologyDivision(29), 'جيد');
    assert.equal(getTheologyDivision(30), 'مقبول');
    assert.equal(getTheologyDivision(34), 'مقبول');
    assert.equal(getTheologyDivision(35), 'راسب');
    assert.equal(getTheologyDivision(36), 'راسب');
  });

  it('Theology: computes 4-core-subject aggregate cleanly when a class has >4 theology subjects', () => {
    const sixSubjectMarks = [
      { subject_name_arabic: 'القرآن الكريم', score: 85 },     // Core 1 -> pt 1
      { subject_name_arabic: 'اللغة العربية', score: 75 },     // Core 2 -> pt 2
      { subject_name_arabic: 'الفقه', score: 70 },             // Core 3 -> pt 3
      { subject_name_arabic: 'التربية الإسلامية', score: 65 }, // Core 4 -> pt 3
      { subject_name_arabic: 'التاريخ والسيرة', score: 42 },   // Extra enrichment subject (ignored in 4-core agg)
      { subject_name_arabic: 'الحديث الشريف', score: 40 },     // Extra enrichment subject (ignored in 4-core agg)
    ];
    const agg = calculateTheologyAggregateFromMarks(sixSubjectMarks);
    assert.equal(agg, 9);
    assert.equal(getTheologyDivision(agg), 'ممتاز');

    // Missing core score returns null rather than partial inflated grade
    const missingCore = sixSubjectMarks.map((m) =>
      m.subject_name_arabic === 'الفقه' ? { ...m, score: null } : m
    );
    assert.equal(calculateTheologyAggregateFromMarks(missingCore), null);
  });
});

describe('Phase 1.5 — 2. Distinct IPLE Single-Subject vs Overall Student Mapping', () => {
  it('Single subject displays (ت١–خ٩) and remarks are completely disjoint from overall divisions (ممتاز–راسب)', () => {
    const overallDivisionSet = new Set(DEFAULT_THEOLOGY_DIVISION_BOUNDARIES.map((d) => d.division));
    assert.deepEqual(Array.from(overallDivisionSet), ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'راسب']);

    const sampleScores = [90, 80, 70, 62, 57, 52, 45, 35, 20];
    const singleSubjectRows = sampleScores.map((score) => {
      const point = getTheologyGradeNumber(score);
      const code = getTheologyGradeDisplay(score);
      const remark = getTheologySubjectRemark(point);
      assert.equal(overallDivisionSet.has(code), false, `Subject code "${code}" must not collide with overall division`);
      assert.equal(overallDivisionSet.has(remark), false, `Subject remark "${remark}" must not collide with overall division`);
      assert.doesNotMatch(code, /^(D1|D2|C3|C4|C5|C6|P7|P8|F9)$/, 'Theology subject grade must not reuse secular D1-F9 code');
      assert.equal(extractGradePoint(code), point);
      return { score, point, code, remark };
    });

    const overallRows = [4, 12, 13, 23, 24, 29, 30, 34, 35, 36].map((agg) => {
      const info = getTheologyDivisionDetails(agg);
      return { agg, division: info.division, eq: info.equivalentDivision, label: info.label };
    });

    console.log('\n[Phase 1.5 Proof] IPLE Single-Subject Performance Mapping:');
    console.table(singleSubjectRows);
    console.log('[Phase 1.5 Proof] IPLE Overall Candidate Aggregate Division Mapping:');
    console.table(overallRows);
  });

  it('Division-aware Arabic teacher comment honors overall IPLE division as well as legacy scores', () => {
    assert.equal(getTheologyComment(null, 'male', undefined, 'ممتاز'), 'جهد مميز،شكرا');
    assert.equal(getTheologyComment(null, 'female', undefined, 'جيد جداً'), 'بقيت خطوة إلى الامتياز');
    assert.equal(getTheologyComment(null, 'male', undefined, 'جيد'), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(null, 'female', undefined, 'جيد'), 'أنتِ قادرة على الأفضل');
  });
});

describe('Phase 1.5 — 3. Configurable Thresholds & API/UI Wiring', () => {
  it('Custom division boundaries dynamically adjust Div 1 / ممتاز thresholds for both Secular and Theology', () => {
    const customSecular = DEFAULT_DIVISION_BOUNDARIES.map((b) =>
      b.division === 'I'
        ? { ...b, min: 4, max: 10 }
        : b.division === 'II'
          ? { ...b, min: 11, max: 24 }
          : b
    );
    const customTheology = DEFAULT_THEOLOGY_DIVISION_BOUNDARIES.map((b) =>
      b.equivalentDivision === 'I'
        ? { ...b, min: 4, max: 10 }
        : b.equivalentDivision === 'II'
          ? { ...b, min: 11, max: 23 }
          : b
    );

    assert.equal(validateDivisionBoundaries(customSecular).valid, true);
    assert.equal(validateDivisionBoundaries(customTheology).valid, true);

    assert.equal(getDivision(10, customSecular), 'I');
    assert.equal(getDivision(12, customSecular), 'II');
    assert.equal(getTheologyDivision(10, customTheology), 'ممتاز');
    assert.equal(getTheologyDivision(12, customTheology), 'جيد جداً');

    // Resolvers honor injected custom settings
    const resolvedTheoBands = resolveTheologyGradingBands({
      settings: { theology_grading_scale: DEFAULT_THEOLOGY_GRADING_BANDS },
    });
    const resolvedTheoDivs = resolveTheologyDivisionBoundaries({
      settings: { theology_division_boundaries: customTheology },
    });
    assert.equal(resolvedTheoBands[0].grade, 'ت١');
    assert.equal(resolvedTheoDivs[0].max, 10);
  });

  it('Validation rejects gaps and overlaps in division boundaries and grading scales', () => {
    const gappedDivs = DEFAULT_THEOLOGY_DIVISION_BOUNDARIES.map((b) =>
      b.equivalentDivision === 'I' ? { ...b, max: 10 } : b
    );
    assert.equal(validateDivisionBoundaries(gappedDivs).valid, false);

    const overlappingDivs = DEFAULT_DIVISION_BOUNDARIES.map((b) =>
      b.division === 'II' ? { ...b, min: 11 } : b
    );
    assert.equal(validateDivisionBoundaries(overlappingDivs).valid, false);
    assert.equal(validateGradingBands(DEFAULT_THEOLOGY_GRADING_BANDS).valid, true);
  });

  it('Upgrades pre-1.5 colliding D1-F9 + ممتاز saved snapshot while preserving custom min/max cutoffs', () => {
    const legacySnapshot = [
      { grade: 'D1', range: '90-100', min: 90, max: 100, remark: 'ممتاز' },
      { grade: 'D2', range: '75-89', min: 75, max: 89, remark: 'جيد جدا' },
      { grade: 'C3', range: '65-74', min: 65, max: 74, remark: 'جيد' },
      { grade: 'C4', range: '60-64', min: 60, max: 64, remark: 'جيد' },
      { grade: 'C5', range: '55-59', min: 55, max: 59, remark: 'مقبول' },
      { grade: 'C6', range: '50-54', min: 50, max: 54, remark: 'مقبول' },
      { grade: 'P7', range: '40-49', min: 40, max: 49, remark: 'ضعيف' },
      { grade: 'P8', range: '30-39', min: 30, max: 39, remark: 'ضعيف' },
      { grade: 'F9', range: '0-29', min: 0, max: 29, remark: 'ضعيف' },
    ];
    const upgraded = normalizeLegacyTheologyGradingScale(legacySnapshot);
    assert.equal(upgraded[0].grade, 'ت١');
    assert.equal(upgraded[0].min, 90);
    assert.equal(upgraded[0].remark, 'تفوق عالٍ');
    assert.equal(upgraded[8].grade, 'خ٩');
    assert.equal(upgraded[8].remark, 'دون المستوى');
  });

  it('API routes, hubs, marks entry, and SettingsClient all wire configurable grading thresholds', () => {
    const reportSrc = fs.readFileSync(path.resolve('src/app/api/report/route.ts'), 'utf8');
    const batchSrc = fs.readFileSync(path.resolve('src/app/api/report/batch/route.ts'), 'utf8');
    const secHubApi = fs.readFileSync(path.resolve('src/app/api/secular-hub/route.ts'), 'utf8');
    const theoHubApi = fs.readFileSync(path.resolve('src/app/api/theology-hub/route.ts'), 'utf8');
    const settingsApi = fs.readFileSync(path.resolve('src/app/api/settings/school/route.ts'), 'utf8');
    const theoHubUi = fs.readFileSync(path.resolve('src/components/theology-hub/TheologyHubClient.tsx'), 'utf8');
    const secHubUi = fs.readFileSync(path.resolve('src/components/secular-hub/SecularHubClient.tsx'), 'utf8');
    const settingsUi = fs.readFileSync(path.resolve('src/components/layout/SettingsClient.tsx'), 'utf8');

    assert.match(reportSrc, /getTheologyDivision/);
    assert.match(reportSrc, /calculateTheologyAggregateFromMarks/);
    assert.match(batchSrc, /getTheologyDivision/);
    assert.match(batchSrc, /calculateTheologyAggregateFromMarks/);
    assert.match(secHubApi, /gradingConfig/);
    assert.match(theoHubApi, /theology_division_boundaries/);
    assert.match(settingsApi, /theology_division_boundaries/);
    assert.match(theoHubUi, /getTheologyDivision/);
    assert.match(secHubUi, /gradingConfig/);
    assert.match(settingsUi, /theology_division_boundaries/);
  });
});
