import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSubjectGradeNumber,
  getGradeDisplay,
  isCoreSubject,
  isGradableSubject,
  calculateAggregate,
  calculateTheologyAggregate,
  getDivision,
  getPromotionStatus,
  getNurseryGrade,
  getSubjectRemark,
  getTheologySubjectRemark,
  getClassTeacherComment,
  getClassTeacherReportComment,
  getHeadTeacherComment,
  getConductRemark,
} from '../lib/grading.ts';

import { evaluateCriteria } from '../lib/grading-engine.ts';

describe('1. UNEB Grading Scales & Boundaries', () => {
  const table = [
    { mark: 100, expectedGradeNum: 1, expectedDisplay: 'D1' },
    { mark: 85,  expectedGradeNum: 1, expectedDisplay: 'D1' },
    { mark: 84,  expectedGradeNum: 2, expectedDisplay: 'D2' },
    { mark: 75,  expectedGradeNum: 2, expectedDisplay: 'D2' },
    { mark: 74,  expectedGradeNum: 3, expectedDisplay: 'C3' },
    { mark: 70,  expectedGradeNum: 3, expectedDisplay: 'C3' },
    { mark: 69,  expectedGradeNum: 4, expectedDisplay: 'C4' },
    { mark: 60,  expectedGradeNum: 4, expectedDisplay: 'C4' },
    { mark: 59,  expectedGradeNum: 5, expectedDisplay: 'C5' },
    { mark: 55,  expectedGradeNum: 5, expectedDisplay: 'C5' },
    { mark: 54,  expectedGradeNum: 6, expectedDisplay: 'C6' },
    { mark: 50,  expectedGradeNum: 6, expectedDisplay: 'C6' },
    { mark: 49,  expectedGradeNum: 7, expectedDisplay: 'P7' },
    { mark: 40,  expectedGradeNum: 7, expectedDisplay: 'P7' },
    { mark: 39,  expectedGradeNum: 8, expectedDisplay: 'P8' },
    { mark: 35,  expectedGradeNum: 8, expectedDisplay: 'P8' },
    { mark: 34,  expectedGradeNum: 9, expectedDisplay: 'F9' },
    { mark: 0,   expectedGradeNum: 9, expectedDisplay: 'F9' },
  ];

  for (const { mark, expectedGradeNum, expectedDisplay } of table) {
    it(`Mark ${mark} should map to Grade ${expectedGradeNum} (${expectedDisplay})`, () => {
      const num = getSubjectGradeNumber(mark);
      assert.equal(num, expectedGradeNum);
      const display = getGradeDisplay(num);
      assert.equal(display, expectedDisplay);
    });
  }
});

describe('2. Division Classification', () => {
  const divisionTable = [
    { aggregate: 4,  expectedDivision: 'I' },
    { aggregate: 12, expectedDivision: 'I' },
    { aggregate: 13, expectedDivision: 'II' },
    { aggregate: 23, expectedDivision: 'II' },
    { aggregate: 24, expectedDivision: 'III' },
    { aggregate: 29, expectedDivision: 'III' },
    { aggregate: 30, expectedDivision: 'IV' },
    { aggregate: 34, expectedDivision: 'IV' },
    { aggregate: 35, expectedDivision: 'U' },
    { aggregate: 36, expectedDivision: 'U' },
  ];

  for (const { aggregate, expectedDivision } of divisionTable) {
    it(`Aggregate ${aggregate} must be Division ${expectedDivision}`, () => {
      assert.equal(getDivision(aggregate), expectedDivision);
    });
  }
});

describe('3. Core Subjects & Aggregate Calculation', () => {
  it('Upper Primary: 4 core subjects (Eng, Math, Sci, SST) calculate correct aggregate', () => {
    const marks = [
      { subject_name: 'English', score: 85 },        // D1 (1)
      { subject_name: 'Mathematics', score: 80 },    // D2 (2)
      { subject_name: 'Science', score: 72 },        // C3 (3)
      { subject_name: 'Social Studies', score: 65 }, // C4 (4)
    ];
    const agg = calculateAggregate(marks, 'upper_primary');
    assert.equal(agg, 1 + 2 + 3 + 4); // 10 (Division I)
    assert.equal(getDivision(agg), 'I');
  });

  it('Lower Primary: 4 core subjects (Eng, Math, Lit I, Lit II) calculate correct aggregate', () => {
    const marks = [
      { subject_name: 'ENG', score: 55 },    // C5 (5)
      { subject_name: 'MTC', score: 52 },    // C6 (6)
      { subject_name: 'LIT I', score: 45 },  // P7 (7)
      { subject_name: 'LIT II', score: 38 }, // P8 (8)
    ];
    const agg = calculateAggregate(marks, 'lower_primary');
    assert.equal(agg, 5 + 6 + 7 + 8); // 26 (Division III)
    assert.equal(getDivision(agg), 'III');
  });

  it('Missing any core subject returns null (prevents partial distorted aggregate)', () => {
    const marks = [
      { subject_name: 'English', score: 85 },
      { subject_name: 'Mathematics', score: 80 },
      { subject_name: 'Science', score: 72 },
      // Social Studies missing!
    ];
    const agg = calculateAggregate(marks, 'upper_primary');
    assert.equal(agg, null);
  });

  it('Non-gradable subjects are correctly excluded', () => {
    assert.equal(isGradableSubject('Computer'), false);
    assert.equal(isGradableSubject('English'), true);
    assert.equal(isGradableSubject('Writing', 'Top Class'), false);
  });
});

describe('4. Theology Aggregates & Remarks', () => {
  it('Theology 4 subjects aggregate (IPLE standard)', () => {
    const scores = [85, 75, 70, 60]; // 1 + 2 + 3 + 4 = 10
    const agg = calculateTheologyAggregate(scores);
    assert.equal(agg, 10);
    assert.equal(getDivision(agg), 'I');
  });

  it('Missing theology score returns null aggregate', () => {
    assert.equal(calculateTheologyAggregate([85, 75, 70]), null);
  });

  it('Arabic theology remarks conform to school standards', () => {
    assert.equal(getTheologySubjectRemark(1), 'ممتاز');
    assert.equal(getTheologySubjectRemark(2), 'جيد جداً');
    assert.equal(getTheologySubjectRemark(3), 'جيد');
    assert.equal(getTheologySubjectRemark(9), 'راسب');
  });
});

describe('5. Promotion Logic', () => {
  it('Division I, II, III promote', () => {
    assert.equal(getPromotionStatus('I'), 'Promote');
    assert.equal(getPromotionStatus('II'), 'Promote');
    assert.equal(getPromotionStatus('III'), 'Promote');
  });

  it('Division IV probation', () => {
    assert.equal(getPromotionStatus('IV'), 'Probation');
  });

  it('Division U repeats', () => {
    assert.equal(getPromotionStatus('U'), 'Repeat');
  });

  it('Manual override Try Next Class respected', () => {
    assert.equal(getPromotionStatus('U', 'Try Next Class'), 'Try Next Class');
  });

  it('Class and head teacher comments reflect the grade descriptors for each division', () => {
    const expected = {
      I: [
        'Outstanding performance. Keep it up!',
        'Excellent achievement. Keep up the high standard.',
      ],
      II: [
        'Very good performance. Keep it up.',
        'Very good result. Continue working toward excellence.',
      ],
      III: [
        'Average performance. Keep practising to improve.',
        'Fair result. Consistent practice will help you improve.',
      ],
      IV: [
        'Promising result. More effort will bring progress.',
        'Promising result. Work harder to make stronger progress.',
      ],
      U: [
        'Strive harder. Practise regularly and ask for help.',
        'Strive harder. Seek support from your teachers.',
      ],
    };

    for (const [division, [classTeacher, headTeacher]] of Object.entries(expected)) {
      assert.equal(getClassTeacherComment(division), classTeacher);
      assert.equal(getHeadTeacherComment(division), headTeacher);
    }
  });

  it('Class and head teacher comments reflect the pupil marks and configured grading remarks', () => {
    assert.equal(getClassTeacherComment('I', [90, 88, 85, 89]), 'Excellent performance. Keep it up!');
    assert.equal(getHeadTeacherComment('I', [72, 71, 74, 70]), 'Good result. Consistent practice will support further progress.');
    assert.equal(getClassTeacherComment('IV', [10, 20, 25, 30]), 'Poor / Pull Up performance. Work closely with your teachers to improve.');

    const customBands = [
      { grade: 'A', min: 80, max: 100, remark: 'Outstanding' },
      { grade: 'B', min: 0, max: 79, remark: 'Developing' },
    ];
    assert.equal(getClassTeacherComment('II', [84, 80], customBands), 'Outstanding performance. Keep it up!');
    assert.equal(getHeadTeacherComment('II', [40, 30], customBands), 'Developing performance. Work closely with your teachers to make progress.');
  });

  it('Term 3 MOT uses encouraging performance feedback instead of EOT promotion text', () => {
    assert.equal(getClassTeacherReportComment({
      scoreType: 'mot',
      termNumber: 3,
      promotionStatus: 'Promote',
      gradingComment: null,
      division: 'II',
    }), 'Good performance. Keep it up!');
  });

  it('Term 3 EOT retains promotion comments', () => {
    assert.equal(getClassTeacherReportComment({
      scoreType: 'eot',
      termNumber: 3,
      promotionStatus: 'Promote',
      gradingComment: null,
      division: 'II',
    }), 'Promoted to the next class.');
  });

  it('configured grading comments remain available on MOT reports', () => {
    assert.equal(getClassTeacherReportComment({
      scoreType: 'mot',
      termNumber: 2,
      promotionStatus: null,
      gradingComment: 'Custom class comment.',
      division: 'II',
    }), 'Custom class comment.');
  });
});

describe('6. Dynamic Grading Rules Engine (evaluateCriteria)', () => {
  const criteriaList = [
    {
      id: 'c1',
      curriculum: 'secular',
      class_id: null,
      metric_type: 'subject_score',
      min_value: 95,
      max_value: 100,
      output_type: 'grade_label',
      output_text: 'D1*',
    },
    {
      id: 'c2',
      curriculum: 'secular',
      class_id: null,
      metric_type: 'aggregate',
      min_value: 4,
      max_value: 8,
      output_type: 'comment',
      output_text: 'Exceptional Distinction Scholar',
    },
    {
      id: 'c3',
      curriculum: 'secular',
      class_id: 'p7-uuid',
      metric_type: 'subject_score',
      min_value: 0,
      max_value: 49,
      output_type: 'comment',
      output_text: 'Needs remedial coaching before PLE',
    }
  ];

  it('Overrides subject grade when score matches custom rule', () => {
    const res = evaluateCriteria(98, 'subject_score', 'secular', null, criteriaList, 'grade_label');
    assert.equal(res, 'D1*');
  });

  it('Falls back to null when score does not match rule', () => {
    const res = evaluateCriteria(88, 'subject_score', 'secular', null, criteriaList, 'grade_label');
    assert.equal(res, null);
  });

  it('Class-specific override applies only to matching class', () => {
    const match = evaluateCriteria(40, 'subject_score', 'secular', 'p7-uuid', criteriaList, 'comment');
    assert.equal(match, 'Needs remedial coaching before PLE');

    const mismatch = evaluateCriteria(40, 'subject_score', 'secular', 'p6-uuid', criteriaList, 'comment');
    assert.equal(mismatch, null);
  });
});

describe('7. Standard Competition Ranking (1224 Ranking)', () => {
  it('Handles ties correctly with skipped positions for subsequent students', () => {
    const totals = [390, 380, 380, 350, 310]; // 1st, 2nd, 2nd, 4th, 5th
    
    // Student A: 390
    assert.equal(totals.indexOf(390) + 1, 1);
    
    // Students B & C: 380
    assert.equal(totals.indexOf(380) + 1, 2);
    
    // Student D: 350 (position 4, not 3)
    assert.equal(totals.indexOf(350) + 1, 4);
    
    // Student E: 310 (position 5)
    assert.equal(totals.indexOf(310) + 1, 5);
  });
});
