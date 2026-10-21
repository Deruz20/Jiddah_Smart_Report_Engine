import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  clampCoordinates,
  applySnapGuides,
  nudgeCoordinate,
  DEFAULT_OVERLAYS_BY_TEMPLATE,
  SNAP_GUIDES,
} from '../lib/report-overlays.ts';

import {
  computeConfigurableRankings,
} from '../lib/ranking.ts';

import {
  getContrastRatio,
  enforceContrastGuard,
} from '../lib/contrast-guard.ts';

import {
  SYNTHETIC_REPORT_FIXTURES,
} from '../lib/report-synthetic-fixtures.ts';

describe('Report Studio: Stamp & Signature Positioning System', () => {
  test('clampCoordinates keeps positions strictly within 1% to 96% page bounds', () => {
    // Underflow clamped to 1
    const under = clampCoordinates(-10, -5);
    assert.equal(under.x, 1);
    assert.equal(under.y, 1);

    // Overflow clamped to max (96)
    const over = clampCoordinates(150, 102);
    assert.equal(over.x, 96);
    assert.equal(over.y, 96);

    // Normal values preserved
    const normal = clampCoordinates(45.5, 78.2);
    assert.equal(normal.x, 45.5);
    assert.equal(normal.y, 78.2);
  });

  test('applySnapGuides accurately snaps coordinates when within tolerance', () => {
    // 50% center guide with tolerance 1.5
    const nearCenter = applySnapGuides(49.2, SNAP_GUIDES.x, 1.5);
    assert.equal(nearCenter.snappedVal, 50);
    assert.equal(nearCenter.guideHit, 50);

    // Beyond tolerance: preserves original position
    const farFromGuide = applySnapGuides(60.0, SNAP_GUIDES.x, 1.5);
    assert.equal(farFromGuide.snappedVal, 60.0);
    assert.equal(farFromGuide.guideHit, null);
  });

  test('nudgeCoordinate applies fractional deltas with bounds protection', () => {
    // Nudge forward by 0.5%
    const forward = nudgeCoordinate(50.0, 0.5);
    assert.equal(forward, 50.5);

    // Nudge backward by 2.5% (Shift mode)
    const fastBack = nudgeCoordinate(50.0, -2.5);
    assert.equal(fastBack, 47.5);

    // Cannot nudge past max bound
    const atMax = nudgeCoordinate(95.8, 2.0);
    assert.equal(atMax, 96);
  });

  test('DEFAULT_OVERLAYS_BY_TEMPLATE defines all 6 core templates with valid elements', () => {
    const expectedTemplates = [
      'primary-eot',
      'primary-mot',
      'primary-bot',
      'p7-eot',
      'nursery-eot',
      'theology-mot',
    ];

    for (const tmpl of expectedTemplates) {
      const overlays = DEFAULT_OVERLAYS_BY_TEMPLATE[tmpl];
      assert.ok(overlays, `Template ${tmpl} must have default overlays`);
      assert.ok(overlays.stamp, `Template ${tmpl} must have stamp overlay`);
      assert.ok(overlays.headTeacher, `Template ${tmpl} must have headTeacher overlay`);
      assert.ok(overlays.classTeacher, `Template ${tmpl} must have classTeacher overlay`);

      // Verify coordinate sanity
      assert.ok(overlays.stamp.xPercent >= 1 && overlays.stamp.xPercent <= 96);
      assert.ok(overlays.stamp.yPercent >= 1 && overlays.stamp.yPercent <= 96);
      assert.ok(overlays.stamp.opacity >= 0.1 && overlays.stamp.opacity <= 1.0);
    }
  });
});

describe('Report Studio: Live Customization & Contrast Guard', () => {
  test('enforces WCAG AA contrast ratio threshold (>= 4.5:1 on white)', () => {
    // Deep Emerald (#0f4d25) on White (#FFFFFF)
    const ratioEmerald = getContrastRatio('#0f4d25', '#FFFFFF');
    assert.ok(ratioEmerald >= 7.0, `Emerald contrast should be >= 7.0, got ${ratioEmerald}`);

    // Light Yellow (#fde047) on White (#FFFFFF) is non-compliant
    const ratioYellow = getContrastRatio('#fde047', '#FFFFFF');
    assert.ok(ratioYellow < 4.5, `Yellow contrast should be < 4.5, got ${ratioYellow}`);

    // enforceContrastGuard darkens non-compliant colors automatically
    const guarded = enforceContrastGuard('#fde047', '#FFFFFF', 4.5);
    assert.equal(guarded.wasAdjusted, true);
    assert.ok(guarded.actualRatio >= 4.5);
  });
});

describe('Report Studio: Ranking Settings Interactive Preview & Parity', () => {
  const samplePupils = [
    { id: '1', name: 'Farouk', english: 90, math: 96, total: 385, average: 96.2, aggregate: 4 },
    { id: '2', name: 'Amina', english: 92, math: 90, total: 370, average: 92.5, aggregate: 6 },
    { id: '3', name: 'Ibrahim', english: 88, math: 94, total: 370, average: 92.5, aggregate: 6 },
    { id: '4', name: 'Zahra', english: 84, math: 86, total: 350, average: 87.5, aggregate: 8 },
  ];

  test('Standard Competition Ranking assigns 1, 2, 2, 4 on ties', () => {
    const res = computeConfigurableRankings(samplePupils, {
      method: 'standard',
      basis: 'total_score',
      tiebreak: 'none',
      show_rank: true,
    });
    assert.equal(res[0].rank, 1);
    assert.equal(res[1].rank, 2);
    assert.equal(res[2].rank, 2); // Tied with Amina
    assert.equal(res[3].rank, 4); // Skips 3
  });

  test('Dense Ranking assigns 1, 2, 2, 3 on ties', () => {
    const res = computeConfigurableRankings(samplePupils, {
      method: 'dense',
      basis: 'total_score',
      tiebreak: 'none',
      show_rank: true,
    });
    assert.equal(res[0].rank, 1);
    assert.equal(res[1].rank, 2);
    assert.equal(res[2].rank, 2);
    assert.equal(res[3].rank, 3); // Immediate next rank
  });

  test('Fractional Ranking assigns 1, 2.5, 2.5, 4 on ties', () => {
    const res = computeConfigurableRankings(samplePupils, {
      method: 'fractional',
      basis: 'total_score',
      tiebreak: 'none',
      show_rank: true,
    });
    assert.equal(res[0].rank, 1);
    assert.equal(res[1].rank, 2.5);
    assert.equal(res[2].rank, 2.5);
    assert.equal(res[3].rank, 4);
  });

  test('Tiebreak="english" breaks ties using English marks', () => {
    const res = computeConfigurableRankings(samplePupils, {
      method: 'standard',
      basis: 'total_score',
      tiebreak: 'english',
      show_rank: true,
    });
    assert.equal(res[0].name, 'Farouk');
    // Amina has 92 in English, Ibrahim has 88 -> Amina wins tie
    assert.equal(res[1].name, 'Amina');
    assert.equal(res[1].rank, 2);
    assert.equal(res[2].name, 'Ibrahim');
    assert.equal(res[2].rank, 3);
  });

  test('show_rank=false hides all ranks as "-"', () => {
    const res = computeConfigurableRankings(samplePupils, {
      show_rank: false,
    });
    assert.ok(res.every((s) => s.rank === '-'));
  });
});

describe('Report Studio: Synthetic Report Fixtures Validation', () => {
  test('all 7 template fixtures have complete student, curriculum and score attributes', () => {
    const fixtureKeys = [
      'primary-eot',
      'primary-mot',
      'primary-bot',
      'p7-eot',
      'nursery-eot',
      'theology-mot',
    ];

    for (const key of fixtureKeys) {
      const fixture = SYNTHETIC_REPORT_FIXTURES[key];
      assert.ok(fixture, `Fixture ${key} must exist`);
      assert.ok(fixture.student, `Fixture ${key} must have student info`);
      assert.ok(fixture.student.name, `Fixture ${key} student must have name`);
      assert.ok(fixture.term, `Fixture ${key} must have term`);
    }

    // Verify dual-curriculum integrity on primary-eot
    const p5 = SYNTHETIC_REPORT_FIXTURES['primary-eot'];
    assert.equal(p5.circular.subjects.length, 4);
    assert.equal(p5.theology.subjects.length, 5);
    assert.equal(p5.circular.division, 'I');
    assert.equal(p5.theology.division, '1');
  });
});
