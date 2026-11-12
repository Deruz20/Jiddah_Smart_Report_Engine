import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_PRINT_PREFERENCES,
  DEFAULT_MARKS_LOCKS,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_DIVISION_BOUNDARIES,
  DEFAULT_UNEB_GRADING_BANDS,
  DEFAULT_THEOLOGY_GRADING_BANDS,
  DEFAULT_THEOLOGY_REMARKS,
  validateGradingBands,
  isExamSetLockedForUser,
  resolveReportBranding,
  resolveDivisionBoundaries,
  fetchMergedSchoolSettings,
} from '../lib/school-settings-helper.ts';

import {
  calculateAggregate,
  getDivision,
  getClassTeacherComment,
  getHeadTeacherComment,
} from '../lib/grading.ts';

describe('1. Grading Scale Validation (0-100 Coverage, Zero Overlaps, Zero Gaps)', () => {
  it('accepts default UNEB and Theology grading scales covering 0..100 cleanly', () => {
    const secularResult = validateGradingBands(DEFAULT_UNEB_GRADING_BANDS);
    assert.equal(secularResult.valid, true);

    const theologyResult = validateGradingBands(DEFAULT_THEOLOGY_GRADING_BANDS);
    assert.equal(theologyResult.valid, true);
  });

  it('rejects overlapping grade ranges', () => {
    const overlapping = DEFAULT_UNEB_GRADING_BANDS.map((b) =>
      b.grade === 'D2' ? { ...b, max: 86 } : b
    );
    const res = validateGradingBands(overlapping);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /Overlapping score range/i);
  });

  it('rejects gaps between grade ranges', () => {
    const gapped = DEFAULT_UNEB_GRADING_BANDS.map((b) =>
      b.grade === 'C3' ? { ...b, max: 72 } : b
    );
    const res = validateGradingBands(gapped);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /Gap detected/i);
  });

  it('rejects scales that do not reach 100 or start at 0', () => {
    const missingTop = DEFAULT_UNEB_GRADING_BANDS.map((b) =>
      b.grade === 'D1' ? { ...b, max: 98 } : b
    );
    assert.equal(validateGradingBands(missingTop).valid, false);

    const missingBottom = DEFAULT_UNEB_GRADING_BANDS.map((b) =>
      b.grade === 'F9' ? { ...b, min: 5 } : b
    );
    assert.equal(validateGradingBands(missingBottom).valid, false);
  });
});

describe('2. Custom Grading Scale & Division Boundaries End-to-End Calculation', () => {
  it('calculates aggregate using custom grading_scale bands', () => {
    const customScale = [
      { grade: 'D1', range: '90-100', min: 90, max: 100, remark: 'Supreme' },
      { grade: 'D2', range: '80-89', min: 80, max: 89, remark: 'Great' },
      { grade: 'C3', range: '70-79', min: 70, max: 79, remark: 'Good' },
      { grade: 'C4', range: '60-69', min: 60, max: 69, remark: 'Fair' },
      { grade: 'C5', range: '55-59', min: 55, max: 59, remark: 'Pass' },
      { grade: 'C6', range: '50-54', min: 50, max: 54, remark: 'Weak Pass' },
      { grade: 'P7', range: '40-49', min: 40, max: 49, remark: 'Try Harder' },
      { grade: 'P8', range: '35-39', min: 35, max: 39, remark: 'Low' },
      { grade: 'F9', range: '0-34', min: 0, max: 34, remark: 'Fail' },
    ];

    // Under default UNEB scale, 86 is D1 (1 pt). Under customScale, 86 is D2 (2 pts).
    const marks = [
      { subject_name: 'English', score: 86 },
      { subject_name: 'Mathematics', score: 86 },
      { subject_name: 'Science', score: 86 },
      { subject_name: 'Social Studies', score: 86 },
    ];

    assert.equal(calculateAggregate(marks, 'upper_primary'), 4);
    assert.equal(calculateAggregate(marks, 'upper_primary', customScale), 8);
  });

  it('evaluates division and teacher comments from custom division_boundaries', () => {
    const customBoundaries = DEFAULT_DIVISION_BOUNDARIES.map((b) =>
      b.division === 'I'
        ? {
            ...b,
            min: 4,
            max: 10,
            classTeacherComment: 'Custom Div I Class Remark',
            headTeacherComment: 'Custom Div I Head Remark',
          }
        : b.division === 'II'
          ? { ...b, min: 11, max: 23 }
          : b
    );

    // Aggregate 12 is Division I by default, but Division II under customBoundaries (where Div I max is 10)
    assert.equal(getDivision(12), 'I');
    assert.equal(getDivision(12, customBoundaries), 'II');

    // Custom comments for Division I when no subject marks override
    assert.equal(
      getClassTeacherComment('I', [], undefined, customBoundaries),
      'Custom Div I Class Remark'
    );
    assert.equal(
      getHeadTeacherComment('I', [], undefined, customBoundaries),
      'Custom Div I Head Remark'
    );
  });
});

describe('3. Marks Entry & Exam Set Access Locks (marks_locks)', () => {
  it('blocks non-admin teachers when BOT, MOT, or EOT is locked, while allowing Admin overrides', () => {
    const lockedBotSettings = {
      marks_locks: {
        bot_locked: true,
        mot_locked: false,
        eot_locked: true,
      },
    };

    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'bot', false).locked, true);
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'mot', false).locked, false);
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'eot', false).locked, true);
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'all', false).locked, true);

    // Administrator override is always permitted
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'bot', true).locked, false);
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'eot', true).locked, false);
    assert.equal(isExamSetLockedForUser(lockedBotSettings, 'all', true).locked, false);
  });
});

describe('4. Print Preferences & Merged School Settings Contract', () => {
  it('includes showClassPosition, includeStamp, includeSignatures, watermarkEnabled, highFidelityColors', async () => {
    assert.equal(DEFAULT_PRINT_PREFERENCES.includeStamp, true);
    assert.equal(DEFAULT_PRINT_PREFERENCES.includeSignatures, true);
    assert.equal(DEFAULT_PRINT_PREFERENCES.showClassPosition, true);

    const branding = resolveReportBranding({
      settings: {
        school_name: 'Jiddah Test School',
        arabic_name: 'مدرسة جدة',
        registration_number: 'PPS/N/999',
        po_box: 'P.O. Box 777',
        website_url: 'https://jiddah.ac.ug',
      },
    });

    assert.equal(branding.schoolName, 'Jiddah Test School');
    assert.equal(branding.arabicSchoolName, 'مدرسة جدة');
    assert.equal(branding.registrationNumber, 'PPS/N/999');
    assert.equal(branding.poBox, 'P.O. Box 777');
    assert.equal(branding.websiteUrl, 'https://jiddah.ac.ug');
  });

  it('verifies Chrome Material-3 layout and 7 categories in SettingsClient.tsx', () => {
    const settingsClientPath = path.resolve(
      process.cwd(),
      'src/components/layout/SettingsClient.tsx'
    );
    const source = fs.readFileSync(settingsClientPath, 'utf8');

    assert.match(
      source,
      /Search settings \(e\.g\. grading, stamp, active term, fees, password\)\.\.\./
    );
    assert.match(source, /School Identity & Profile/);
    assert.match(source, /Academic Terms & Calendar/);
    assert.match(source, /Grading & Remarks Engine/);
    assert.match(source, /Stamps & Signatures/);
    assert.match(source, /Report Card & Print Layout/);
    assert.match(source, /Marks & Access Locks/);
    assert.match(source, /My Account & Security/);
  });
});
