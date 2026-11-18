import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTheologyGradeNumber,
  getTheologyGradeDisplay,
  getTheologyComment,
  calculateTheologyAggregate,
} from '../lib/grading.ts';
import {
  DEFAULT_THEOLOGY_GRADING_BANDS,
  DEFAULT_THEOLOGY_REMARKS,
  resolveTheologyGradingBands,
  resolveTheologyRemarks,
} from '../lib/school-settings-helper.ts';

test('Theology IPLE Standards — Distinct Single-Subject Grading Scale', async (t) => {
  await t.test('Score boundaries map to correct grade numbers and distinct Arabic IPLE subject displays', () => {
    // 85-100: Point 1 (تفوق ١)
    assert.equal(getTheologyGradeNumber(100), 1);
    assert.equal(getTheologyGradeNumber(85), 1);
    assert.equal(getTheologyGradeDisplay(85), 'ت١');

    // 75-84: Point 2 (تفوق ٢)
    assert.equal(getTheologyGradeNumber(84), 2);
    assert.equal(getTheologyGradeNumber(75), 2);
    assert.equal(getTheologyGradeDisplay(75), 'ت٢');

    // 65-74: Point 3 (جدارة ٣)
    assert.equal(getTheologyGradeNumber(74), 3);
    assert.equal(getTheologyGradeNumber(65), 3);
    assert.equal(getTheologyGradeDisplay(65), 'ج٣');

    // 60-64: Point 4 (جدارة ٤)
    assert.equal(getTheologyGradeNumber(64), 4);
    assert.equal(getTheologyGradeNumber(60), 4);
    assert.equal(getTheologyGradeDisplay(60), 'ج٤');

    // 55-59: Point 5 (جدارة ٥)
    assert.equal(getTheologyGradeNumber(59), 5);
    assert.equal(getTheologyGradeNumber(55), 5);
    assert.equal(getTheologyGradeDisplay(55), 'ج٥');

    // 50-54: Point 6 (جدارة ٦)
    assert.equal(getTheologyGradeNumber(54), 6);
    assert.equal(getTheologyGradeNumber(50), 6);
    assert.equal(getTheologyGradeDisplay(50), 'ج٦');

    // 40-49: Point 7 (اجتياز ٧)
    assert.equal(getTheologyGradeNumber(49), 7);
    assert.equal(getTheologyGradeNumber(40), 7);
    assert.equal(getTheologyGradeDisplay(40), 'ن٧');

    // 30-39: Point 8 (اجتياز ٨)
    assert.equal(getTheologyGradeNumber(39), 8);
    assert.equal(getTheologyGradeNumber(30), 8);
    assert.equal(getTheologyGradeDisplay(30), 'ن٨');

    // 0-29: Point 9 (دون المستوى ٩)
    assert.equal(getTheologyGradeNumber(29), 9);
    assert.equal(getTheologyGradeNumber(0), 9);
    assert.equal(getTheologyGradeDisplay(0), 'خ٩');
  });

  await t.test('Theology 4 subjects aggregate calculation uses 2026 scale', () => {
    // 85 + 75 + 65 + 60 -> 1 + 2 + 3 + 4 = 10
    const agg = calculateTheologyAggregate([85, 75, 65, 60]);
    assert.equal(agg, 10);
  });
});

test('Theology 2026 PDF Standards — Gender-Aware Performance Remarks', async (t) => {
  await t.test('ممتاز (85+) yields exact Arabic remark for both genders', () => {
    assert.equal(getTheologyComment(90, 'male'), 'جهد مميز،شكرا');
    assert.equal(getTheologyComment(85, 'female'), 'جهد مميز،شكرا');
    assert.equal(getTheologyComment(88, 'girl'), 'جهد مميز،شكرا');
  });

  await t.test('جيد جدا (75-84) yields exact Arabic remark for both genders', () => {
    assert.equal(getTheologyComment(80, 'male'), 'بقيت خطوة إلى الامتياز');
    assert.equal(getTheologyComment(75, 'female'), 'بقيت خطوة إلى الامتياز');
  });

  await t.test('جيد (60-74) selects correct masculine vs feminine form', () => {
    assert.equal(getTheologyComment(70, 'male'), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(70, 'female'), 'أنتِ قادرة على الأفضل');
    assert.equal(getTheologyComment(62, 'girl'), 'أنتِ قادرة على الأفضل');
    assert.equal(getTheologyComment(62, 'boy'), 'أنت قادر على الأفضل');
  });

  await t.test('مقبول (50-59) selects correct masculine vs feminine form', () => {
    assert.equal(getTheologyComment(55, 'male'), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(55, 'female'), 'أنتِ قادرة على الأفضل');
  });

  await t.test('ضعيف (0-49) selects correct masculine vs feminine form', () => {
    assert.equal(getTheologyComment(45, 'male'), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(45, 'female'), 'أنتِ قادرة على الأفضل');
    assert.equal(getTheologyComment(20, 'girl'), 'أنتِ قادرة على الأفضل');
  });

  await t.test('Settings custom remark overrides are honored when provided', () => {
    const custom = [
      { level: 'ممتاز', boys: 'ممتاز يا بطل', girls: 'ممتازة يا بطلة' },
    ];
    assert.equal(getTheologyComment(95, 'male', custom), 'ممتاز يا بطل');
    assert.equal(getTheologyComment(95, 'female', custom), 'ممتازة يا بطلة');
  });
});

test('Theology School Settings Helper Defaults & Resolution', (t) => {
  assert.equal(DEFAULT_THEOLOGY_GRADING_BANDS.length, 9);
  assert.equal(DEFAULT_THEOLOGY_REMARKS.length, 5);

  const reportDataEmpty = { settings: {} };
  const bands = resolveTheologyGradingBands(reportDataEmpty);
  assert.equal(bands[0].grade, 'ت١');
  assert.equal(bands[0].min, 85);
  assert.equal(bands[8].grade, 'خ٩');
  assert.equal(bands[8].max, 29);

  const remarks = resolveTheologyRemarks(reportDataEmpty);
  assert.equal(remarks[0].level, 'ممتاز');
  assert.equal(remarks[0].boys, 'جهد مميز،شكرا');
});
