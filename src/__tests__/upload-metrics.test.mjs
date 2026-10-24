import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStoragePercent,
  getUploadMetrics,
  getUploadProgressPercent,
  getVisibleStoragePercent,
} from '../lib/upload-metrics.ts';

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
