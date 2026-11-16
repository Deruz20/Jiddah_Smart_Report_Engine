import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { computeStandardRankings } from '../lib/ranking.ts';
import {
  calculateTheologyAggregate,
  getTheologyGradeNumber,
  getTheologyGradeDisplay,
  calculateAggregate,
  getSubjectGradeNumber,
  getGradeDisplay,
  getDivision,
} from '../lib/grading.ts';
import { isNonMuslimStudent } from '../lib/student-religion.ts';
import { downloadCSV, escapeCSV } from '../utils/csvExport.ts';

describe('Hubs & Broadsheet Suite: Workstream 1 - API Resilience & Schema Integrity', () => {
  it('purges non-existent theology_exempt column from /api/theology-hub/route.ts query', () => {
    const theologyRoutePath = path.resolve('src/app/api/theology-hub/route.ts');
    const source = fs.readFileSync(theologyRoutePath, 'utf8');

    // theology_exempt must NOT appear in the students select query (causes PGRST204 500 error)
    assert.doesNotMatch(source, /students\s*\([^)]*theology_exempt/i);
    // Real columns (id, name, arabic_name, admission_number, gender, religion, is_muslim) must be queried
    assert.match(source, /students\s*\(\s*id,\s*name,\s*arabic_name/);
  });

  it('/api/theology-hub and /api/secular-hub enforce verifyDataAccess server-side in all calls', () => {
    const theologyRoutePath = path.resolve('src/app/api/theology-hub/route.ts');
    const secularRoutePath = path.resolve('src/app/api/secular-hub/route.ts');
    const theoSrc = fs.readFileSync(theologyRoutePath, 'utf8');
    const secSrc = fs.readFileSync(secularRoutePath, 'utf8');

    assert.match(theoSrc, /verifyDataAccess\s*\(\s*supabase,\s*user,\s*['"]read['"],\s*null,\s*['"]theology['"]\)/);
    assert.match(secSrc, /verifyDataAccess\s*\(\s*supabase,\s*user,\s*['"]read['"],\s*null,\s*['"]secular['"]\)/);
  });

  it('supports class_id parameter and filters enrollments accurately without 500 crashes', () => {
    const theologyRoutePath = path.resolve('src/app/api/theology-hub/route.ts');
    const secularRoutePath = path.resolve('src/app/api/secular-hub/route.ts');
    const theoSrc = fs.readFileSync(theologyRoutePath, 'utf8');
    const secSrc = fs.readFileSync(secularRoutePath, 'utf8');

    assert.match(theoSrc, /searchParams\.get\(['"]class_id['"]\)/);
    assert.match(secSrc, /searchParams\.get\(['"]class_id['"]\)/);
    assert.match(theoSrc, /query\.eq\(['"]theology_class_id['"],\s*classId\)/);
    assert.match(secSrc, /query\.eq\(['"]circular_class_id['"],\s*classId\)/);
  });

  it('includes resilient fallback to subjects table when theology_subjects or circular_subjects fail', () => {
    const theologyRoutePath = path.resolve('src/app/api/theology-hub/route.ts');
    const secularRoutePath = path.resolve('src/app/api/secular-hub/route.ts');
    const theoSrc = fs.readFileSync(theologyRoutePath, 'utf8');
    const secSrc = fs.readFileSync(secularRoutePath, 'utf8');

    assert.match(theoSrc, /\.from\(['"]subjects['"]\)/);
    assert.match(theoSrc, /\.eq\(['"]curriculum['"],\s*['"]theology['"]\)/);
    assert.match(secSrc, /\.from\(['"]subjects['"]\)/);
    assert.match(secSrc, /\.eq\(['"]curriculum['"],\s*['"]secular['"]\)/);
  });
});

describe('Hubs & Broadsheet Suite: Workstream 2 - Standard Competition Rankings & Aggregates', () => {
  it('computes tie-aware standard competition rankings (1, 2, 3, 3, 5) with zero gaps on non-ties', () => {
    const mockCohort = [
      { id: '1', name: 'Student A', total: 350 },
      { id: '2', name: 'Student B', total: 320 },
      { id: '3', name: 'Student C', total: 310 },
      { id: '4', name: 'Student D', total: 310 }, // Tie with Student C
      { id: '5', name: 'Student E', total: 290 },
      { id: '6', name: 'Student F', total: null }, // Incomplete
    ];

    const ranked = computeStandardRankings(mockCohort);
    assert.equal(ranked[0].name, 'Student A');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].name, 'Student B');
    assert.equal(ranked[1].rank, 2);
    assert.equal(ranked[2].name, 'Student C');
    assert.equal(ranked[2].rank, 3);
    assert.equal(ranked[3].name, 'Student D');
    assert.equal(ranked[3].rank, 3); // Tied at 3
    assert.equal(ranked[4].name, 'Student E');
    assert.equal(ranked[4].rank, 5); // Next is 5 (skips 4)
    assert.equal(ranked[5].name, 'Student F');
    assert.equal(ranked[5].rank, '-'); // Empty kept at bottom
  });

  it('accurately calculates 4-subject Islamic Theology aggregates and Roman divisions', () => {
    // 4 subjects with scores: 90 (D1=1), 80 (D2=2), 70 (C3=3), 60 (C4=4) => Agg = 10 (Div I)
    const agg1 = calculateTheologyAggregate([90, 80, 70, 60]);
    assert.equal(agg1, 10);
    assert.equal(getDivision(agg1), 'I');

    // Aggregate 13 => Div II
    const agg2 = calculateTheologyAggregate([60, 60, 60, 70]); // 4 + 4 + 4 + 3 = 15
    assert.equal(agg2, 15);
    assert.equal(getDivision(agg2), 'II');

    // Missing subject returns null aggregate
    const aggMissing = calculateTheologyAggregate([80, 70, 60]);
    assert.equal(aggMissing, null);
  });

  it('accurately calculates Upper Primary UNEB aggregates and divisions', () => {
    const marks = [
      { subject_name: 'English', score: 88 },      // D1 = 1
      { subject_name: 'Mathematics', score: 76 },  // D2 = 2
      { subject_name: 'Science', score: 71 },      // C3 = 3
      { subject_name: 'Social Studies', score: 62 },// C4 = 4
    ];

    const agg = calculateAggregate(marks, 'upper_primary');
    assert.equal(agg, 10);
    assert.equal(getDivision(agg), 'I');
  });

  it('formula injection mitigation protects broadsheet CSV exports (CWE-1236)', () => {
    // Formula triggers = , + , - , @ must be prefixed with single quote
    assert.equal(escapeCSV('=SUM(A1:A10)'), `'=SUM(A1:A10)`);
    assert.equal(escapeCSV('+cmd|/c'), `'+cmd|/c`);
    assert.equal(escapeCSV('@HYPERLINK'), `'@HYPERLINK`);
    assert.equal(escapeCSV('Normal Student'), 'Normal Student');
  });
});

describe('Hubs & Broadsheet Suite: Workstream 3 - Senior UI/UX Standards & Jiddah Brand Parity', () => {
  it('SecularHubClient and TheologyHubClient implement the 10 Senior UI/UX Standards', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const secPath = path.resolve('src/components/secular-hub/SecularHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');
    const secSrc = fs.readFileSync(secPath, 'utf8');

    // 1. Concentric Radius
    assert.match(theoSrc, /rounded-2xl/);
    assert.match(theoSrc, /rounded-\[10px\]/);
    assert.match(secSrc, /rounded-2xl/);
    assert.match(secSrc, /rounded-\[10px\]/);

    // 2. Alpha Borders
    assert.match(theoSrc, /border-\[#0D5C3A\]\/1[25]/);
    assert.match(theoSrc, /dark:border-white\/10/);
    assert.match(secSrc, /border-\[#0D5C3A\]\/1[25]/);
    assert.match(secSrc, /dark:border-white\/10/);

    // 3. OKLCH Palettes & Gradients
    assert.match(theoSrc, /bg-\[linear-gradient\(135deg_in_oklch/);
    assert.match(secSrc, /bg-\[linear-gradient\(135deg_in_oklch/);

    // 4. Matched Icon Stroke Weight (2.25)
    assert.match(theoSrc, /strokeWidth=\{2\.25\}/);
    assert.match(secSrc, /strokeWidth=\{2\.25\}/);

    // 5. Masked Scroll Edges
    assert.match(theoSrc, /mask-image:linear-gradient\(to_right,transparent/);
    assert.match(secSrc, /mask-image:linear-gradient\(to_right,transparent/);

    // 6. Dynamic Viewport (100dvh) & Dark Depth
    assert.match(theoSrc, /min-h-\[100dvh\]/);
    assert.match(theoSrc, /dark:bg-\[#0D1411\]/);
    assert.match(secSrc, /min-h-\[100dvh\]/);
    assert.match(secSrc, /dark:bg-\[#0D1411\]/);

    // 7. Commanding Forest-Green + Warm Marigold Banner
    assert.match(theoSrc, /data-testid="theology-hub-banner"/);
    assert.match(secSrc, /data-testid="secular-hub-banner"/);
  });

  it('both hubs support Sheet, Analysis, and Top 10 view modes with search and division filtering', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const secPath = path.resolve('src/components/secular-hub/SecularHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');
    const secSrc = fs.readFileSync(secPath, 'utf8');

    assert.match(theoSrc, /searchQuery/);
    assert.match(theoSrc, /divisionFilter/);
    assert.match(theoSrc, /activeTab === 'assessment'/);
    assert.match(theoSrc, /activeTab === 'analysis'/);
    assert.match(theoSrc, /activeTab === 'top_students'/);

    assert.match(secSrc, /searchQuery/);
    assert.match(secSrc, /divisionFilter/);
    assert.match(secSrc, /activeTab === 'assessment'/);
    assert.match(secSrc, /activeTab === 'analysis'/);
    assert.match(secSrc, /activeTab === 'top_students'/);
  });

  it('both hubs render formal institutional print broadsheet via PrintPortal landscape with stamp and signatures', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const secPath = path.resolve('src/components/secular-hub/SecularHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');
    const secSrc = fs.readFileSync(secPath, 'utf8');

    // Uses PrintPortal with landscape orientation
    assert.match(theoSrc, /<PrintPortal\s+pageOrientation="landscape">/);
    assert.match(secSrc, /<PrintPortal\s+pageOrientation="landscape">/);

    // Official Letterhead & Official Signatures Footer
    assert.match(theoSrc, /<OfficialPrintLetterhead/);
    assert.match(theoSrc, /<OfficialPrintSignaturesFooter/);
    assert.match(secSrc, /<OfficialPrintLetterhead/);
    assert.match(secSrc, /<OfficialPrintSignaturesFooter/);

    // Official Stamp
    assert.match(theoSrc, /<OfficialReportStamp/);
    assert.match(secSrc, /<OfficialReportStamp/);
  });

  it('both hubs support one-click jump to student report cards in /admin/reports', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const secPath = path.resolve('src/components/secular-hub/SecularHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');
    const secSrc = fs.readFileSync(secPath, 'utf8');

    assert.match(theoSrc, /\/admin\/reports\?student_id=/);
    assert.match(secSrc, /\/admin\/reports\?student_id=/);
  });

  it('TheologyHubClient implements English toolbar parity with Report Center and authentic RTL Arabic assessment sheet', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');

    // Single-row Report Center-style toolbar (h-12 rounded-2xl white card)
    assert.match(theoSrc, /h-12/);
    assert.match(theoSrc, /rounded-2xl/);
    assert.match(theoSrc, /ArrowLeft/);

    // English Toolbar Controls & Buttons (Report Center Parity)
    assert.match(theoSrc, /Theology Hub/);
    assert.match(theoSrc, /Print/);
    assert.match(theoSrc, />Sheet</);
    assert.match(theoSrc, />Analysis</);
    assert.match(theoSrc, />Top 10</);

    // RTL direction on assessment sheet container and table
    assert.match(theoSrc, /dir="rtl"/);

    // Table Column Headers in Arabic
    assert.match(theoSrc, />\s*م\s*<\/th>/);
    assert.match(theoSrc, /اسم التلميذ\/ة/);
    assert.match(theoSrc, /المجموع/);
    assert.match(theoSrc, /الترتيب/);
    assert.match(theoSrc, /الملاحظات/);

    // Authentic Arabic Performance Badges
    assert.match(theoSrc, /ممتاز/);
    assert.match(theoSrc, /جيد جداً/);
    assert.match(theoSrc, /جيد/);
    assert.match(theoSrc, /مقبول/);
    assert.match(theoSrc, /ضعيف/);

    // Footer in Arabic
    assert.match(theoSrc, /متوسط الفصل/);
    assert.match(theoSrc, /نسبة النجاح/);
  });

  it('Theology Broadsheet print renderer features official double-border frame (4px #14532D and 1.5px #C59B27) with official stamp', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');

    // Official double-border frame
    assert.match(theoSrc, /border:\s*['"]4px solid #14532D['"]/);
    assert.match(theoSrc, /border:\s*['"]1\.5px solid #C59B27['"]/);

    // Document title banner in Forest Emerald
    assert.match(theoSrc, /كشف درجات الطلاب العام — قسم العلوم الشرعية واللغة العربية/);
    assert.match(theoSrc, /#0D5C3A/);

    // Official Sign-Off Footer
    assert.match(theoSrc, /مُعدّ الكشف: معلم الفصل/);
    assert.match(theoSrc, /مُراجع: مشرف الدراسات/);
    assert.match(theoSrc, /معتمد: مدير المدرسة والختم الرسمي/);

    // Official circular report stamp inside print portal
    assert.match(theoSrc, /<OfficialReportStamp[\s\S]*?maxWidth=\{110\}[\s\S]*?maxHeight=\{52\}/);
  });

  it('both hubs implement streamlined, compact top toolbars matching Report Center (h-12 single bar)', () => {
    const theoPath = path.resolve('src/components/theology-hub/TheologyHubClient.tsx');
    const secPath = path.resolve('src/components/secular-hub/SecularHubClient.tsx');
    const theoSrc = fs.readFileSync(theoPath, 'utf8');
    const secSrc = fs.readFileSync(secPath, 'utf8');

    // Both hubs use the h-12 single-row toolbar matching Report Center
    assert.match(theoSrc, /h-12/);
    assert.match(secSrc, /h-12/);
    assert.match(theoSrc, /id="theology-hub-term-select"/);
    assert.match(theoSrc, /id="theology-hub-class-select"/);
    assert.match(secSrc, /id="secular-hub-term-select"/);
    assert.match(secSrc, /id="secular-hub-class-select"/);
  });
});
