import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  getDefaultBroadsheetPrintConfig,
  getBroadsheetTypographyTokens,
  prepareBroadsheetStudents,
} from '@/lib/broadsheet-print-config';
import { BroadsheetPrintDocument } from '@/components/hubs/BroadsheetPrintDocument';

function makeSampleStudents(count, curriculum) {
  return Array.from({ length: count }, (_, idx) => {
    const rank = idx + 1;
    const scoreA = Math.max(45, 99 - idx);
    const scoreB = Math.max(42, 95 - idx);
    return {
      id: `st-${rank}`,
      name: `Student Sample ${rank}`,
      arabic_name: `التلميذ التجريبي ${rank}`,
      gender: idx % 2 === 0 ? 'male' : 'female',
      admission_number: `JINPS-2026-${9000 + rank}`,
      total: scoreA + scoreB,
      aggregate: 4 + (idx % 12),
      division: curriculum === 'theology' ? (idx < 8 ? 'ممتاز' : 'جيد جداً') : idx < 8 ? 'I' : 'II',
      position: rank,
      subjectScores: { sub1: scoreA, sub2: scoreB },
      subjectGrades: {
        sub1: curriculum === 'theology' ? 'ت١' : 'D1',
        sub2: curriculum === 'theology' ? 'ت٢' : 'D2',
      },
    };
  });
}

const sampleTheologySubjects = [
  { id: 'sub1', subject_name_arabic: 'القرآن الكريم', subject_name: 'Quran' },
  { id: 'sub2', subject_name_arabic: 'اللغة العربية', subject_name: 'Arabic' },
];

const sampleSecularSubjects = [
  { id: 'sub1', subject_name: 'English' },
  { id: 'sub2', subject_name: 'Mathematics' },
];

const sampleSummary = {
  subjectStats: {
    sub1: { avg: 88, highest: 99, lowest: 50, passRate: 100 },
    sub2: { avg: 84, highest: 95, lowest: 45, passRate: 95 },
  },
  classAverageTotal: 172,
  nurseryOverallAvg: 86,
  satCandidates: 40,
  totalCandidates: 40,
  divCounts: { I: 10, II: 15, III: 8, IV: 5, U: 2 },
};

describe('Broadsheet Print Overhaul & Advanced Customization Studio', () => {
  it('defaults remove Admission ID on both hubs and remove D1/ت١ subject sub-columns on Theology', () => {
    const theo = getDefaultBroadsheetPrintConfig('theology');
    const sec = getDefaultBroadsheetPrintConfig('secular');

    assert.equal(theo.showAdmissionId, false);
    assert.equal(sec.showAdmissionId, false);
    assert.equal(theo.showSubjectGrades, false);
    assert.equal(theo.fontScale, 'readable');
    assert.equal(sec.fontScale, 'readable');
    assert.equal(theo.density, 'comfortable');
    assert.equal(sec.density, 'comfortable');
    assert.equal(theo.orientation, 'landscape');
    assert.equal(sec.orientation, 'landscape');
  });

  it('provides human-readable default (12px) and Large Print eye-comfort (14px) typography tokens', () => {
    const compact = getBroadsheetTypographyTokens('compact', 'tight');
    const readable = getBroadsheetTypographyTokens('readable', 'comfortable');
    const large = getBroadsheetTypographyTokens('large', 'spacious');

    assert.equal(compact.bodyFontPx, 10.5);
    assert.equal(readable.bodyFontPx, 12);
    assert.equal(large.bodyFontPx, 14);
    assert.equal(large.lineHeight, 1.4);
    assert.ok(readable.cellPadding.includes('6px'));
    assert.ok(large.cellPadding.includes('9px'));
  });

  it('prepareBroadsheetStudents handles all/filtered/top_10/top_20 row scopes and sort orders accurately', () => {
    const all = makeSampleStudents(25, 'secular');
    const filtered = all.slice(0, 6);
    const baseCfg = getDefaultBroadsheetPrintConfig('secular');

    assert.equal(prepareBroadsheetStudents(all, filtered, { ...baseCfg, rowScope: 'all' }).length, 25);
    assert.equal(prepareBroadsheetStudents(all, filtered, { ...baseCfg, rowScope: 'filtered' }).length, 6);
    assert.equal(prepareBroadsheetStudents(all, filtered, { ...baseCfg, rowScope: 'top_10' }).length, 10);
    assert.equal(prepareBroadsheetStudents(all, filtered, { ...baseCfg, rowScope: 'top_20' }).length, 20);

    const byName = prepareBroadsheetStudents(all, filtered, { ...baseCfg, sortBy: 'name' });
    assert.equal(byName[0].name, 'Student Sample 1');
    assert.equal(byName[1].name, 'Student Sample 10');

    const byAgg = prepareBroadsheetStudents(all, filtered, { ...baseCfg, sortBy: 'aggregate' });
    assert.ok((byAgg[0].aggregate ?? 99) <= (byAgg[1].aggregate ?? 99));
  });

  it('renders Theology broadsheet with 40 students, NO Adm No, NO ت١/درجة/تقدير sub-columns, and readable 12px font', () => {
    const cfg = getDefaultBroadsheetPrintConfig('theology');
    const students = makeSampleStudents(40, 'theology');
    const html = renderToStaticMarkup(
      React.createElement(BroadsheetPrintDocument, {
        curriculum: 'theology',
        config: cfg,
        students,
        subjects: sampleTheologySubjects,
        termLabel: 'Term 3',
        academicYear: 2026,
        classNameLabel: 'الصف الثالث',
        examPhase: 'eot',
        summary: sampleSummary,
      })
    );

    assert.match(html, /id="theology-hub-print-root"/);
    assert.match(html, /font-size:12px/i);
    assert.doesNotMatch(html, /رقم القيد/);
    assert.doesNotMatch(html, /JINPS-2026-9001/);
    assert.doesNotMatch(html, /درجة \/ تقدير/);
    assert.doesNotMatch(html, />ت١</);
    assert.match(html, /التلميذ التجريبي 40/);
    assert.doesNotMatch(html, /report-sheet-landscape/);
  });

  it('allows opt-in Admission ID and Large Print (14px) accessibility mode when customized', () => {
    const customCfg = {
      ...getDefaultBroadsheetPrintConfig('theology'),
      showAdmissionId: true,
      fontScale: 'large',
    };
    const html = renderToStaticMarkup(
      React.createElement(BroadsheetPrintDocument, {
        curriculum: 'theology',
        config: customCfg,
        students: makeSampleStudents(3, 'theology'),
        subjects: sampleTheologySubjects,
        termLabel: 'Term 3',
        academicYear: 2026,
        classNameLabel: 'الصف الثالث',
        examPhase: 'eot',
        summary: sampleSummary,
      })
    );

    assert.match(html, /font-size:14px/i);
    assert.match(html, /رقم القيد/);
    assert.match(html, /JINPS-2026-9001/);
  });

  it('Secular Nursery hides Agg/Div columns and Cohort Summary box automatically', () => {
    const secCfg = getDefaultBroadsheetPrintConfig('secular');
    const html = renderToStaticMarkup(
      React.createElement(BroadsheetPrintDocument, {
        curriculum: 'secular',
        config: secCfg,
        students: makeSampleStudents(5, 'secular'),
        subjects: sampleSecularSubjects,
        termLabel: 'Term 3',
        academicYear: 2026,
        classNameLabel: 'Baby',
        sectionLabel: 'Nursery',
        examPhase: 'eot',
        isNursery: true,
        summary: sampleSummary,
      })
    );

    assert.match(html, /id="secular-hub-print-root"/);
    assert.doesNotMatch(html, />Agg</);
    assert.doesNotMatch(html, />Div</);
    assert.doesNotMatch(html, /Official Cohort Summary/);
    assert.doesNotMatch(html, /JINPS-2026-9001/);
  });

  it('print-system.css uncaps hub broadsheet height for multi-page printing and enforces light mode', () => {
    const css = fs.readFileSync(path.resolve('src/styles/reports/print-system.css'), 'utf8');
    const portal = fs.readFileSync(path.resolve('src/components/reports/PrintPortal.tsx'), 'utf8');

    assert.match(css, /#secular-hub-print-root,\s*#theology-hub-print-root/);
    assert.match(css, /height:\s*auto\s*!important/);
    assert.match(css, /max-height:\s*none\s*!important/);
    assert.match(css, /overflow:\s*visible\s*!important/);
    assert.match(css, /display:\s*table-header-group\s*!important/);
    assert.match(css, /color-scheme:\s*light\s*!important/);
    assert.match(portal, /pageMargin\s*=\s*'0mm'/);
  });

  it('both Hubs wire Customize Sheet Studio trigger, localStorage persistence, and PrintPortal margin 8mm', () => {
    const theo = fs.readFileSync(path.resolve('src/components/theology-hub/TheologyHubClient.tsx'), 'utf8');
    const sec = fs.readFileSync(path.resolve('src/components/secular-hub/SecularHubClient.tsx'), 'utf8');

    assert.match(theo, /setPrintStudioOpen\(true\)/);
    assert.match(theo, /loadBroadsheetPrintConfig\('theology'\)/);
    assert.match(theo, /saveBroadsheetPrintConfig\('theology'/);
    assert.match(theo, /pageMargin="8mm"/);

    assert.match(sec, /setPrintStudioOpen\(true\)/);
    assert.match(sec, /loadBroadsheetPrintConfig\('secular'\)/);
    assert.match(sec, /saveBroadsheetPrintConfig\('secular'/);
    assert.match(sec, /pageMargin="8mm"/);
  });

  it('guarantees Theology never displays D1-style subject grade sub-columns even if forced in config/modal/CSV', () => {
    const forcedCfg = {
      ...getDefaultBroadsheetPrintConfig('theology'),
      showSubjectGrades: true,
    };
    const html = renderToStaticMarkup(
      React.createElement(BroadsheetPrintDocument, {
        curriculum: 'theology',
        config: forcedCfg,
        students: makeSampleStudents(3, 'theology'),
        subjects: sampleTheologySubjects,
        termLabel: 'Term 3',
        academicYear: 2026,
        classNameLabel: 'الصف الثالث',
        examPhase: 'eot',
        summary: sampleSummary,
      })
    );

    assert.doesNotMatch(html, /درجة \/ تقدير/);
    assert.doesNotMatch(html, /Mark \| Grd/);
    assert.doesNotMatch(html, />ت١</);
    assert.doesNotMatch(html, />ت٢</);

    const theoSrc = fs.readFileSync(path.resolve('src/components/theology-hub/TheologyHubClient.tsx'), 'utf8');
    const modalSrc = fs.readFileSync(path.resolve('src/components/hubs/BroadsheetPrintStudioModal.tsx'), 'utf8');
    assert.doesNotMatch(theoSrc, /getTheologyGradeDisplay/);
    assert.doesNotMatch(theoSrc, /\(Grade\)/);
    assert.doesNotMatch(modalSrc, /Per-Subject Grades/);
  });

  it('forces light mode globally across @media print, theme-compat, Tailwind dark variant, and PrintPortal', () => {
    const css = fs.readFileSync(path.resolve('src/styles/reports/print-system.css'), 'utf8');
    const compat = fs.readFileSync(path.resolve('src/styles/theme-compat.css'), 'utf8');
    const globals = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8');
    const portal = fs.readFileSync(path.resolve('src/components/reports/PrintPortal.tsx'), 'utf8');

    assert.match(compat, /@media not print/);
    assert.match(globals, /@custom-variant dark[\s\S]*?@media not print/);
    assert.match(css, /:root,\s*html,\s*body,\s*\.dark,\s*\[data-theme="dark"\]/);
    assert.match(css, /--bg-card:\s*#ffffff\s*!important/);
    assert.match(portal, /beforeprint/);
    assert.match(portal, /afterprint/);
  });

  it('docs/PHASE1_PRODUCTION_TEACHER_FIXES.sql covers all diagnostic fixes & synthetic cleanup safely inside BEGIN/COMMIT', () => {
    const sql = fs.readFileSync(path.resolve('docs/PHASE1_PRODUCTION_TEACHER_FIXES.sql'), 'utf8');

    assert.match(sql, /^\s*BEGIN;/m);
    assert.match(sql, /^\s*COMMIT;\s*$/m);
    assert.match(sql, /hassanhatima20@gmail\.com/);
    assert.match(sql, /moureen@gmail\.com/);
    assert.match(sql, /e16b9c2c-ead3-45d6-94c6-98cd3285254c/);
    assert.match(sql, /beff121c-3189-404e-a187-4d945a2fcab1/);
    assert.match(sql, /anatoli@gmail\.com/);
    assert.match(sql, /a0d05ac7-a631-4c17-a07d-e0049fb6cd35/);
    assert.match(sql, /b86fa625-3636-4d46-ae2f-ea5b7a628fa7/);
    assert.match(sql, /zulfa@gmail\.com/);
    assert.match(sql, /ibrahimwoira8@gmail\.com/);
    assert.match(sql, /DOS Theology/);
    assert.match(sql, /bbaale@gmail\.com/);
    assert.match(sql, /DOS Secular/);
    assert.match(sql, /@jiddah\.local/);
    assert.match(sql, /@jiddahschool\.local/);
  });
});
