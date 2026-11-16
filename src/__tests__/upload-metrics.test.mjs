import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStoragePercent,
  getUploadMetrics,
  getUploadProgressPercent,
  getVisibleStoragePercent,
} from '../lib/upload-metrics.ts';
import { getDynamicSignatureSlots } from '../utils/signatures.ts';

test('counts stored documents and signature slots once and sums their actual sizes', () => {
  const metrics = getUploadMetrics([
    { size: 300, category: 'Documents', status: 'done' },
    { size: 200, category: 'Branding', status: 'done' },
    { size: 900, category: 'Documents', status: 'error' },
    { size: 100, category: 'Documents', status: 'uploading' },
  ], [
    { slot_key: 'school-stamp', uploaded: true, size: 500 },
    { slot_key: 'head-teacher', uploaded: true, size: 400 },
    { slot_key: 'p4-class-teacher', uploaded: false, size: 0 },
  ]);

  assert.deepEqual(metrics, {
    totalFiles: 5,
    totalBytes: 1500,
    signatureCount: 1,
    categoryCounts: {
      Signatures: 1,
      Stamps: 1,
      Branding: 1,
      Documents: 1,
      Other: 0,
    },
  });
});

test('does not double-count the previous signature while replacing its slot', () => {
  const metrics = getUploadMetrics([
    { size: 120, category: 'Signatures', status: 'uploading', targetSlotKey: 'head-teacher' },
  ], [
    { slot_key: 'head-teacher', uploaded: true, size: 100 },
  ]);

  assert.equal(metrics.totalFiles, 1);
  assert.equal(metrics.totalBytes, 120);
});

test('upload transfer remains below complete until the server confirms success', () => {
  assert.equal(getUploadProgressPercent(0, 200), 0);
  assert.equal(getUploadProgressPercent(100, 200), 50);
  assert.equal(getUploadProgressPercent(200, 200), 99);
  assert.equal(getUploadProgressPercent(1, 0), 0);
});

test('storage meter stays visible for small positive usage without misreporting its percentage', () => {
  assert.equal(getVisibleStoragePercent(0, 1024 ** 3), 0);
  assert.equal(getVisibleStoragePercent(1024, 1024 ** 3), 1);
  assert.equal(formatStoragePercent(1024, 1024 ** 3), '<0.01% used');
  assert.equal(formatStoragePercent(1024 ** 3, 1024 ** 3), '100.00% used');
});

test('getDynamicSignatureSlots excludes theology-teacher-p7 and sorts secular and theology classes canonically', async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        then(resolve) {
          resolve({
            data: [
              { circular_classes: { class_name: 'P.7' }, theology_classes: { class_name_english: 'P.7' } },
              { circular_classes: { class_name: 'P.2' }, theology_classes: { class_name_english: 'P.6' } },
              { circular_classes: { class_name: 'Baby Class' }, theology_classes: { class_name_english: 'Top Class' } },
              { circular_classes: { class_name: 'P.1' }, theology_classes: { class_name_english: 'Baby Class' } },
            ],
            error: null,
          });
        },
      };
    },
  };

  const slots = await getDynamicSignatureSlots(mockSupabase);
  const keys = slots.map((s) => s.slot_key);

  assert.equal(keys.includes('theology-teacher-p7'), false);
  assert.equal(keys[0], 'head-teacher');

  const secularIdxBaby = keys.indexOf('class-teacher-baby');
  const secularIdxP1 = keys.indexOf('class-teacher-p1');
  const secularIdxP2 = keys.indexOf('class-teacher-p2');
  const secularIdxP7 = keys.indexOf('class-teacher-p7');
  assert.ok(secularIdxBaby < secularIdxP1 && secularIdxP1 < secularIdxP2 && secularIdxP2 < secularIdxP7);

  const theoIdxBaby = keys.indexOf('theology-teacher-baby');
  const theoIdxTop = keys.indexOf('theology-teacher-top');
  const theoIdxP6 = keys.indexOf('theology-teacher-p6');
  assert.ok(theoIdxBaby < theoIdxTop && theoIdxTop < theoIdxP6);
});
