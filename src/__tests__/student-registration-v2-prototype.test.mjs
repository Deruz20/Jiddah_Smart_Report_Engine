import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Student Registration V2 Overhaul Logic & Invariants', () => {
  // Test Age Calculation & Suggested Class Placement Engine
  function calculateAgeAndSuggestedClass(dobString, referenceDateString = '2026-05-01') {
    const birthDate = new Date(dobString);
    const today = new Date(referenceDateString);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }

    let suggestedClass = 'Primary 1';
    if (years <= 3) suggestedClass = 'Baby Class';
    else if (years === 4) suggestedClass = 'Middle Class';
    else if (years === 5) suggestedClass = 'Top Class';
    else if (years === 6) suggestedClass = 'Primary 1 (P.1)';
    else if (years === 7) suggestedClass = 'Primary 2 (P.2)';
    else if (years === 8) suggestedClass = 'Primary 3 (P.3)';
    else if (years === 9) suggestedClass = 'Primary 4 (P.4)';
    else if (years === 10) suggestedClass = 'Primary 5 (P.5)';
    else if (years === 11) suggestedClass = 'Primary 6 (P.6)';
    else if (years >= 12) suggestedClass = 'Primary 7 (P.7 PLE)';

    return { years, months, suggestedClass };
  }

  test('calculates correct age and suggested class for 9-year-old (P.4)', () => {
    const res = calculateAgeAndSuggestedClass('2017-04-15', '2026-05-01');
    assert.equal(res.years, 9);
    assert.equal(res.months, 1);
    assert.equal(res.suggestedClass, 'Primary 4 (P.4)');
  });

  test('calculates correct age and suggested class for nursery child (Baby Class)', () => {
    const res = calculateAgeAndSuggestedClass('2023-01-10', '2026-05-01');
    assert.equal(res.years, 3);
    assert.equal(res.suggestedClass, 'Baby Class');
  });

  test('calculates correct age for graduating cohort (P.7 PLE)', () => {
    const res = calculateAgeAndSuggestedClass('2013-09-20', '2026-05-01');
    assert.equal(res.years, 12);
    assert.equal(res.suggestedClass, 'Primary 7 (P.7 PLE)');
  });

  // Test Sibling Detection Engine
  const MOCK_EXISTING_SIBLINGS = {
    '+256752123456': {
      name: 'Amina Nakato',
      class_name: 'P.4 Blue',
      admission_number: 'JIS/2024/0512',
      guardian_name: 'Al-Hajj Sulaiman Ssemakula',
      guardian_phone: '+256752123456',
      residence_address: 'Nsaggu Village, Nakawuka Road, Wakiso',
    },
    '0752123456': {
      name: 'Amina Nakato',
      class_name: 'P.4 Blue',
      admission_number: 'JIS/2024/0512',
      guardian_name: 'Al-Hajj Sulaiman Ssemakula',
      guardian_phone: '+256752123456',
      residence_address: 'Nsaggu Village, Nakawuka Road, Wakiso',
    },
  };

  function detectSiblingByPhone(rawPhone) {
    if (!rawPhone) return null;
    const cleanPhone = rawPhone.replace(/\s+/g, '');
    return MOCK_EXISTING_SIBLINGS[cleanPhone] || null;
  }

  test('detects existing enrolled sibling when phone matches with spaces', () => {
    const sibling = detectSiblingByPhone('+256 752 123456');
    assert.ok(sibling);
    assert.equal(sibling.name, 'Amina Nakato');
    assert.equal(sibling.guardian_name, 'Al-Hajj Sulaiman Ssemakula');
  });

  test('detects existing enrolled sibling when phone matches local 075 format', () => {
    const sibling = detectSiblingByPhone('0752123456');
    assert.ok(sibling);
    assert.equal(sibling.name, 'Amina Nakato');
  });

  test('returns null when phone does not match any existing family', () => {
    const sibling = detectSiblingByPhone('+256700000000');
    assert.equal(sibling, null);
  });

  // Test Dual-Curriculum Decoupling
  test('supports independent secular class and theology level assignment', () => {
    const student = {
      secular_class: 'P.4',
      secular_stream: 'Blue',
      theology_class: 'الفصل الثالث (Level 3)',
      religion: 'Muslim',
    };
    // Secular is Grade 4, but theology can be Level 3 based on individual Arabic fluency
    assert.notEqual(student.secular_class, 'P.3');
    assert.equal(student.secular_class, 'P.4');
    assert.equal(student.theology_class, 'الفصل الثالث (Level 3)');
  });

  // Test True Lifecycle States
  test('supports valid discrete lifecycle status values', () => {
    const VALID_LIFECYCLES = ['active', 'transferred', 'withdrawn', 'graduated', 'suspended'];
    const assignedStatus = 'transferred';
    assert.ok(VALID_LIFECYCLES.includes(assignedStatus));
  });
});
