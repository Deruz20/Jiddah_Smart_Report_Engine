import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const printStyles = await readFile(
  new URL('../styles/reports/print-system.css', import.meta.url),
  'utf8'
);
const printDialog = await readFile(
  new URL('../components/figma-ui/PrintDialog.tsx', import.meta.url),
  'utf8'
);
const reportGenerator = await readFile(
  new URL('../components/ReportGeneratorClient.tsx', import.meta.url),
  'utf8'
);

test('softens signature images while preserving full-color stamps in print', () => {
  assert.match(printStyles, /#print-portal \.report-container \.comments-and-stamp img/);
  assert.match(printStyles, /#print-portal \.report-container \.comments-and-stamp \.c-sig img[\s\S]*filter:\s*grayscale\(1\) brightness\(1\.12\)\s*!important/);
  assert.match(printStyles, /#print-portal \.report-container \.tc-stamp img[\s\S]*filter:\s*none\s*!important/);
  assert.match(printStyles, /#print-portal \.report-container \.stamp-box img[\s\S]*filter:\s*none\s*!important/);
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

test('fits Theology two-up sheets inside printer-safe A4 bounds', () => {
  assert.match(
    printStyles,
    /#print-portal \.report-container\.theology-2up-sheet\s*\{[^}]*width:\s*210mm\s*!important;[^}]*height:\s*297mm\s*!important;[^}]*zoom:\s*1\s*!important/s
  );
  assert.match(printStyles, /#print-portal \.theology-2up-card-slot\s*\{[^}]*height:\s*148mm\s*!important;[^}]*flex:\s*0 0 148mm\s*!important/s);
  assert.match(printStyles, /#print-portal \.theology-2up-cutline\s*\{[^}]*height:\s*1mm\s*!important;[^}]*flex:\s*0 0 1mm\s*!important/s);
  assert.match(printStyles, /\.theology-2up-card-slot \.theology-card\s*\{[^}]*height:\s*auto\s*!important/);
});

test('print configuration supports current, batch, and selected reports', () => {
  assert.match(printDialog, /useState<'current' \| 'all' \| 'custom'>/);
  assert.match(printDialog, /student\?\.arabic_name \|\| report\.student\?\.name/);
  assert.match(printDialog, /onConfirmPrint\(printMode === 'custom' \? Array\.from\(selectedIds\) : printMode\)/);
  assert.match(reportGenerator, /Array\.isArray\(printScope\)[\s\S]*printScope\.includes\(report\.id\)/);
  assert.match(reportGenerator, /window\.requestAnimationFrame\(\(\) => \{[\s\S]*window\.print\(\)/);
  assert.match(reportGenerator, /window\.addEventListener\('afterprint', restoreTitle/);
});
