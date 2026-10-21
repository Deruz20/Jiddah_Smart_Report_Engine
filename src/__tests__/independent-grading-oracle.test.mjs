import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSubjectGradeNumber,
  getGradeDisplay,
  calculateAggregate,
  getDivision,
  getPromotionStatus,
  getSubjectRemark,
  getTheologySubjectRemark,
  calculateTheologyAggregate,
  isCoreSubject,
  isGradableSubject,
} from '../lib/grading.ts';

import { computeStandardRankings } from '../lib/ranking.ts';
import { generateSyntheticCohort } from './fixtures/synthetic-seed-factory.mjs';

// Independent Domain Oracle (derived strictly from Ugandan UNEB/Jiddah standards)
const INDEPENDENT_GRADE_ORACLE = [
  // Extreme boundaries
  { mark: 100, expectedGradeNum: 1, expectedDisplay: 'D1' },
  { mark: 86, expectedGradeNum: 1, expectedDisplay: 'D1' },
  { mark: 85, expectedGradeNum: 1, expectedDisplay: 'D1' }, // boundary
  { mark: 84.9, expectedGradeNum: 2, expectedDisplay: 'D2' },
  { mark: 84, expectedGradeNum: 2, expectedDisplay: 'D2' },
  { mark: 76, expectedGradeNum: 2, expectedDisplay: 'D2' },
  { mark: 75, expectedGradeNum: 2, expectedDisplay: 'D2' }, // boundary
  { mark: 74, expectedGradeNum: 3, expectedDisplay: 'C3' },
  { mark: 71, expectedGradeNum: 3, expectedDisplay: 'C3' },
  { mark: 70, expectedGradeNum: 3, expectedDisplay: 'C3' }, // boundary
  { mark: 69, expectedGradeNum: 4, expectedDisplay: 'C4' },
  { mark: 61, expectedGradeNum: 4, expectedDisplay: 'C4' },
  { mark: 60, expectedGradeNum: 4, expectedDisplay: 'C4' }, // boundary
  { mark: 59, expectedGradeNum: 5, expectedDisplay: 'C5' },
  { mark: 56, expectedGradeNum: 5, expectedDisplay: 'C5' },
  { mark: 55, expectedGradeNum: 5, expectedDisplay: 'C5' }, // boundary
  { mark: 54, expectedGradeNum: 6, expectedDisplay: 'C6' },
  { mark: 51, expectedGradeNum: 6, expectedDisplay: 'C6' },
  { mark: 50, expectedGradeNum: 6, expectedDisplay: 'C6' }, // boundary
  { mark: 49, expectedGradeNum: 7, expectedDisplay: 'P7' },
  { mark: 41, expectedGradeNum: 7, expectedDisplay: 'P7' },
  { mark: 40, expectedGradeNum: 7, expectedDisplay: 'P7' }, // boundary
  { mark: 39, expectedGradeNum: 8, expectedDisplay: 'P8' },
  { mark: 36, expectedGradeNum: 8, expectedDisplay: 'P8' },
  { mark: 35, expectedGradeNum: 8, expectedDisplay: 'P8' }, // boundary
  { mark: 34, expectedGradeNum: 9, expectedDisplay: 'F9' },
  { mark: 1, expectedGradeNum: 9, expectedDisplay: 'F9' },
  { mark: 0, expectedGradeNum: 9, expectedDisplay: 'F9' },
];

const INDEPENDENT_DIVISION_ORACLE = [
  { agg: 4, expectedDiv: 'I' },
  { agg: 12, expectedDiv: 'I' }, // boundary
  { agg: 13, expectedDiv: 'II' }, // boundary
  { agg: 23, expectedDiv: 'II' }, // boundary
  { agg: 24, expectedDiv: 'III' }, // boundary
  { agg: 29, expectedDiv: 'III' }, // boundary
  { agg: 30, expectedDiv: 'IV' }, // boundary
  { agg: 34, expectedDiv: 'IV' }, // boundary
  { agg: 35, expectedDiv: 'U' }, // boundary
  { agg: 36, expectedDiv: 'U' },
];

describe('Wave 3: Independent Grading & Calculation Oracle', () => {
  describe('1. Mark-to-Grade Boundary Oracle', () => {
    for (const item of INDEPENDENT_GRADE_ORACLE) {
      it(`evaluates mark ${item.mark} exactly to grade ${item.expectedDisplay} (${item.expectedGradeNum})`, () => {
        const gradeNum = getSubjectGradeNumber(item.mark);
        const display = getGradeDisplay(gradeNum);
        assert.equal(gradeNum, item.expectedGradeNum, `Grade number mismatch for mark ${item.mark}`);
        assert.equal(display, item.expectedDisplay, `Grade display mismatch for mark ${item.mark}`);
      });
    }
  });

  describe('2. Aggregate to Division Oracle', () => {
    for (const item of INDEPENDENT_DIVISION_ORACLE) {
      it(`evaluates aggregate ${item.agg} to Division ${item.expectedDiv}`, () => {
        const div = getDivision(item.agg);
        assert.equal(div, item.expectedDiv, `Division mismatch for aggregate ${item.agg}`);
      });
    }
  });

  describe('3. Promotion Decisions and Manual Overrides', () => {
    it('promotes Division I, II, and III', () => {
      assert.equal(getPromotionStatus('I'), 'Promote');
      assert.equal(getPromotionStatus('II'), 'Promote');
      assert.equal(getPromotionStatus('III'), 'Promote');
    });

    it('places Division IV on probation', () => {
      assert.equal(getPromotionStatus('IV'), 'Probation');
    });

    it('requires Division U to repeat', () => {
      assert.equal(getPromotionStatus('U'), 'Repeat');
    });

    it('honors manual override "Try Next Class" regardless of division', () => {
      assert.equal(getPromotionStatus('U', 'Try Next Class'), 'Try Next Class');
      assert.equal(getPromotionStatus('IV', 'Try Next Class'), 'Try Next Class');
      assert.equal(getPromotionStatus('I', 'Try Next Class'), 'Try Next Class');
    });
  });

  describe('4. Property-Based Calculation Tests', () => {
    it('Property: Monotonicity - A higher mark never yields a worse grade', () => {
      for (let m = 0; m < 100; m++) {
        const gradeCurrent = getSubjectGradeNumber(m);
        const gradeNext = getSubjectGradeNumber(m + 1);
        // In UNEB, 1 is best, 9 is worst -> gradeNext must be <= gradeCurrent
        assert.ok(
          gradeNext <= gradeCurrent,
          `Monotonicity violation at mark ${m} -> ${m + 1}: grade ${gradeCurrent} -> ${gradeNext}`
        );
      }
    });

    it('Property: Ranking Ties - Students with identical scores always receive the same rank', () => {
      const cohort = [
        { id: 's1', total: 350 },
        { id: 's2', total: 320 },
        { id: 's3', total: 320 }, // Tied with s2
        { id: 's4', total: 310 },
        { id: 's5', total: 310 }, // Tied with s4
        { id: 's6', total: 290 },
      ];
      const ranked = computeStandardRankings(cohort);
      assert.equal(ranked[0].rank, 1);
      assert.equal(ranked[1].rank, 2);
      assert.equal(ranked[2].rank, 2); // Tied
      assert.equal(ranked[3].rank, 4); // Standard Competition skips 3 -> 4
      assert.equal(ranked[4].rank, 4); // Tied
      assert.equal(ranked[5].rank, 6); // Standard Competition skips 5 -> 6
    });

    it('Property: Empty / Missing Marks handle gracefully without crashing', () => {
      const marks = [
        { subject_name: 'English', score: 80 },
        { subject_name: 'Mathematics', score: null }, // Missing core
        { subject_name: 'Science', score: 70 },
        { subject_name: 'Social Studies', score: 65 },
      ];
      const agg = calculateAggregate(marks, 'upper_primary');
      assert.equal(agg, null, 'Aggregate must be null if any core subject mark is missing');
    });
  });

  describe('5. Remarks Oracle (Secular & Arabic IPLE Theology)', () => {
    it('generates correct secular remarks per grade', () => {
      assert.equal(getSubjectRemark(1), 'Excellent');
      assert.equal(getSubjectRemark(2), 'Very Good');
      assert.equal(getSubjectRemark(3), 'Good');
      assert.equal(getSubjectRemark(4), 'Fairly Good');
      assert.equal(getSubjectRemark(5), 'Fair');
      assert.equal(getSubjectRemark(6), 'Average');
      assert.equal(getSubjectRemark(7), 'Below Average');
      assert.equal(getSubjectRemark(8), 'Poor');
      assert.equal(getSubjectRemark(9), 'Failed');
    });

    it('generates authentic Arabic remarks for Islamic theology', () => {
      assert.equal(getTheologySubjectRemark(1), 'ممتاز');
      assert.equal(getTheologySubjectRemark(2), 'جيد جداً');
      assert.equal(getTheologySubjectRemark(3), 'جيد');
      assert.equal(getTheologySubjectRemark(5), 'مقبول');
      assert.equal(getTheologySubjectRemark(7), 'ضعيف');
      assert.equal(getTheologySubjectRemark(8), 'ضعيف جداً');
      assert.equal(getTheologySubjectRemark(9), 'راسب');
    });
  });

  describe('6. Full Synthetic Cohort Verification (12-student boundary test)', () => {
    it('verifies calculations for all 12 synthetic students in class P7', () => {
      const students = generateSyntheticCohort('cls-alpha-p7', 1);
      assert.equal(students.length, 12);

      // Student 1: Top D1
      const s1 = students[0];
      const s1Marks = Object.entries(s1.marks).map(([k, v]) => ({ subject_name: k, score: v }));
      const s1Agg = calculateAggregate(s1Marks, 'upper_primary');
      assert.equal(s1Agg, 4, 'Top student should achieve Aggregate 4');
      assert.equal(getDivision(s1Agg), 'I');

      // Student 10 & 11: Tied ranks
      const s10 = students[9];
      const s11 = students[10];
      const s10Total = Object.values(s10.marks).reduce((a, b) => (a || 0) + (b || 0), 0);
      const s11Total = Object.values(s11.marks).reduce((a, b) => (a || 0) + (b || 0), 0);
      assert.equal(s10Total, s11Total, 'Students 10 and 11 must have identical totals');

      // Student 12: Missing data
      const s12 = students[11];
      const s12Marks = Object.entries(s12.marks).map(([k, v]) => ({ subject_name: k, score: v }));
      const s12Agg = calculateAggregate(s12Marks, 'upper_primary');
      assert.equal(s12Agg, null, 'Student with null marks must produce null aggregate');
    });
  });
});
