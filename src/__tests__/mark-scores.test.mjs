import test from 'node:test';
import assert from 'node:assert/strict';
import { getMarkScore } from '../lib/mark-scores.ts';

test('reads the current score field before the legacy mark field', () => {
  assert.equal(getMarkScore({ mot_score: 61, mot_mark: 72 }, 'mot'), 61);
});

test('reads legacy marks when the current score field is empty', () => {
  assert.equal(getMarkScore({ eot_score: null, eot_mark: 84 }, 'eot'), 84);
});

test('preserves zero scores and returns null only when both fields are empty', () => {
  assert.equal(getMarkScore({ bot_score: 0, bot_mark: 30 }, 'bot'), 0);
  assert.equal(getMarkScore({ bot_score: null, bot_mark: null }, 'bot'), null);
});
