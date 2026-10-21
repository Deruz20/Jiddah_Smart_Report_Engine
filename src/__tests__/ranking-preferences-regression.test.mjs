import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeStandardRankings, computeConfigurableRankings } from '../lib/ranking.ts';

describe('Ranking Preferences & Parity Regression Suite', () => {
  const sampleCohort = [
    { id: '1', name: 'Zaid', total: 420, english: 85, math: 90 },
    { id: '2', name: 'Amina', total: 390, english: 90, math: 80 },
    { id: '3', name: 'Bilal', total: 390, english: 80, math: 95 },
    { id: '4', name: 'Dawud', total: 310, english: 70, math: 65 },
    { id: '5', name: 'Fatima', total: null }, // Absent
  ];

  it('Default Parity: computeConfigurableRankings() with undefined preferences matches computeStandardRankings() exactly (1, 2, 2, 4)', () => {
    const defaultRanked = computeStandardRankings(sampleCohort);
    const configurableRanked = computeConfigurableRankings(sampleCohort);

    assert.deepEqual(
      configurableRanked.map(s => ({ id: s.id, rank: s.rank })),
      defaultRanked.map(s => ({ id: s.id, rank: s.rank })),
      'Default output must be 100% identical to legacy standard ranking'
    );

    assert.equal(configurableRanked[0].rank, 1);
    assert.equal(configurableRanked[1].rank, 2);
    assert.equal(configurableRanked[2].rank, 2); // Tie at 390
    assert.equal(configurableRanked[3].rank, 4); // Skips 3 -> 4
    assert.equal(configurableRanked[4].rank, '-'); // Absent
  });

  it('Dense Ranking: method="dense" assigns contiguous ranks on ties (1, 2, 2, 3)', () => {
    const denseRanked = computeConfigurableRankings(sampleCohort, { method: 'dense' });

    assert.equal(denseRanked[0].rank, 1);
    assert.equal(denseRanked[1].rank, 2);
    assert.equal(denseRanked[2].rank, 2);
    assert.equal(denseRanked[3].rank, 3); // Does NOT skip 3
    assert.equal(denseRanked[4].rank, '-');
  });

  it('Ordinal Ranking: method="ordinal" assigns sequential ranks (1, 2, 3, 4)', () => {
    const ordinalRanked = computeConfigurableRankings(sampleCohort, { method: 'ordinal' });

    assert.equal(ordinalRanked[0].rank, 1);
    assert.equal(ordinalRanked[1].rank, 2);
    assert.equal(ordinalRanked[2].rank, 3);
    assert.equal(ordinalRanked[3].rank, 4);
    assert.equal(ordinalRanked[4].rank, '-');
  });

  it('Fractional Ranking: method="fractional" assigns average rank to tied items (1, 2.5, 2.5, 4)', () => {
    const fractionalRanked = computeConfigurableRankings(sampleCohort, { method: 'fractional' });

    assert.equal(fractionalRanked[0].rank, 1);
    assert.equal(fractionalRanked[1].rank, 2.5);
    assert.equal(fractionalRanked[2].rank, 2.5);
    assert.equal(fractionalRanked[3].rank, 4);
    assert.equal(fractionalRanked[4].rank, '-');
  });

  it('Tiebreak: tiebreak="english" breaks ties using English score', () => {
    const tiebreakRanked = computeConfigurableRankings(sampleCohort, {
      method: 'ordinal',
      tiebreak: 'english'
    });

    // Amina has English 90 vs Bilal English 80 -> Amina ranks higher
    assert.equal(tiebreakRanked[1].name, 'Amina');
    assert.equal(tiebreakRanked[1].rank, 2);
    assert.equal(tiebreakRanked[2].name, 'Bilal');
    assert.equal(tiebreakRanked[2].rank, 3);
  });

  it('Hide Rank: show_rank=false sets all ranks to "-"', () => {
    const hiddenRanked = computeConfigurableRankings(sampleCohort, { show_rank: false });

    hiddenRanked.forEach((s) => {
      assert.equal(s.rank, '-');
    });
  });
});
