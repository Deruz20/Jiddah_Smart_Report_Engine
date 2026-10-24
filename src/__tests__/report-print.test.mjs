import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const printStyles = await readFile(
  new URL('../styles/reports/print-system.css', import.meta.url),
  'utf8'
);

test('softens signature and stamp images for grayscale print', () => {
  assert.match(printStyles, /#print-portal \.report-container \.comments-and-stamp img/);
  assert.match(printStyles, /filter:\s*grayscale\(1\) brightness\(1\.12\)\s*!important/);
  assert.match(printStyles, /mix-blend-mode:\s*normal\s*!important/);
  assert.match(printStyles, /background:\s*transparent\s*!important/);
});

test('keeps the theology watermark visible in grayscale print output', () => {
  assert.match(printStyles, /#print-portal \.theology-card-inner::before/);
  assert.match(printStyles, /filter:\s*grayscale\(1\) contrast\(1\.1\)/);
  assert.match(printStyles, /opacity:\s*0\.16\s*!important/);
});

test('defaults browser print output to A4 portrait paper', () => {
  assert.match(printStyles, /@page\s*\{\s*size:\s*A4 portrait;/);
});
