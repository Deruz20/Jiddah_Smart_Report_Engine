import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REPORT_LOGO, fallbackReportLogo } from '../lib/report-logo.ts';

test('falls back to the bundled school badge when a configured logo fails', () => {
  const image = {
    src: 'https://invalid.example/logo.png',
    dataset: {},
  };

  fallbackReportLogo(image);

  assert.equal(image.src, DEFAULT_REPORT_LOGO);
  assert.equal(image.dataset.reportLogoFallback, 'true');
});

test('does not loop if the bundled school badge also fails', () => {
  const image = {
    src: DEFAULT_REPORT_LOGO,
    dataset: { reportLogoFallback: 'true' },
  };

  fallbackReportLogo(image);

  assert.equal(image.src, DEFAULT_REPORT_LOGO);
});
