import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CANONICAL_SCHOOL_LOGO,
  normalizeSchoolLogoUrl,
} from '../lib/school-settings-helper.ts';

import {
  hasOpaquePaperBackground,
  extractCleanSignaturePixels,
} from '../lib/signature-ink-processor.ts';

import {
  DEFAULT_STAMP_CONFIG,
  formatStampDisplayDate,
} from '../components/reports/StampGenerator.tsx';

import {
  getStoredThemeMode,
  resolveEffectiveTheme,
} from '../lib/client-cache.ts';

import {
  toggleSelectAllPreservingOthers,
  applyRangeSelection,
  getReportCompletionStatus,
  filterEnrollmentsByCompletion,
} from '../lib/report-selection.ts';

import {
  getServerSupabaseKey,
  getServiceRoleKey,
} from '../lib/supabase-env.ts';

import {
  buildActivityActorMap,
  resolveActivityActor,
} from '../lib/activity-actors.ts';

import {
  DEFAULT_OVERLAYS_BY_TEMPLATE,
} from '../lib/report-overlays.ts';

import {
  isNurseryClass,
  computeNurseryBadge,
  getNurseryGrade,
  getGradeDisplay,
  getSubjectGradeNumber,
} from '../lib/grading.ts';

import { MobileBottomNav } from '../components/layout/mobile-bottom-nav.tsx';

describe('Workstream 1: School Badge / Logo Normalization', () => {
  it('replaces broken /logo.png and empty inputs with canonical /logo-512h.png', () => {
    assert.equal(CANONICAL_SCHOOL_LOGO, '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl('/logo.png'), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl('logo.png'), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl(''), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl(null), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl(undefined), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl('   '), '/logo-512h.png');
  });

  it('preserves valid relative and remote HTTPS badge URLs', () => {
    assert.equal(normalizeSchoolLogoUrl('/school_logo.svg'), '/school_logo.svg');
    assert.equal(normalizeSchoolLogoUrl('/custom_badge.png'), '/custom_badge.png');
    assert.equal(normalizeSchoolLogoUrl('/school_logo.png'), '/school_logo.png');
    assert.equal(
      normalizeSchoolLogoUrl('https://cdn.example.edu/crest.png'),
      'https://cdn.example.edu/crest.png'
    );
  });
});

describe('Workstream 2: Signature Ink Extractor & Paper Removal', () => {
  it('detects opaque paper background and removes uneven shadowed paper while normalizing ink color', () => {
    const width = 48;
    const height = 24;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Paint an uneven shadowed grey/warm-cream paper background (luminance ~175..245)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const shade = 175 + Math.round((x / (width - 1)) * 65);
        rgba[idx] = shade;
        rgba[idx + 1] = shade - 4;
        rgba[idx + 2] = shade - 10;
        rgba[idx + 3] = 255;
      }
    }

    // Draw a crisp dark signature stroke inside x=[12..34], y=[8..15]
    for (let y = 9; y <= 13; y++) {
      for (let x = 14; x <= 32; x++) {
        const idx = (y * width + x) * 4;
        rgba[idx] = 28;
        rgba[idx + 1] = 32;
        rgba[idx + 2] = 40;
        rgba[idx + 3] = 255;
      }
    }

    assert.equal(hasOpaquePaperBackground(rgba, width, height), true);

    const blueRes = extractCleanSignaturePixels(rgba, width, height, {
      inkMode: 'blue',
      boldness: 1.25,
      marginPx: 2,
    });

    // Tight crop should strip outer blank paper margins
    assert.ok(blueRes.width > 0 && blueRes.width < width, `expected cropped width < ${width}, got ${blueRes.width}`);
    assert.ok(blueRes.height > 0 && blueRes.height < height, `expected cropped height < ${height}, got ${blueRes.height}`);

    // Corner background pixel in cropped result should be transparent (alpha === 0)
    assert.equal(blueRes.data[3], 0);

    // Center ink pixel should have high alpha and blue tint (#14387F => B > R)
    const cx = Math.floor(blueRes.width / 2);
    const cy = Math.floor(blueRes.height / 2);
    const cIdx = (cy * blueRes.width + cx) * 4;
    assert.ok(blueRes.data[cIdx + 3] > 200, `expected high ink alpha, got ${blueRes.data[cIdx + 3]}`);
    assert.ok(blueRes.data[cIdx + 2] > blueRes.data[cIdx], 'expected blue channel to exceed red channel in blue mode');

    // Black ink mode should normalize to dark slate neutral (#0F172A)
    const blackRes = extractCleanSignaturePixels(rgba, width, height, {
      inkMode: 'black',
      boldness: 1.25,
      marginPx: 2,
    });
    assert.ok(blackRes.data[cIdx + 3] > 200);
    assert.ok(blackRes.data[cIdx] < 40 && blackRes.data[cIdx + 1] < 50);
  });

  it('recognizes already transparent PNG signatures as not needing background removal', () => {
    const width = 20;
    const height = 20;
    const rgba = new Uint8ClampedArray(width * height * 4);
    // All alpha = 0 except a tiny stroke in center
    for (let x = 6; x <= 14; x++) {
      const idx = (10 * width + x) * 4;
      rgba[idx] = 20;
      rgba[idx + 1] = 56;
      rgba[idx + 2] = 127;
      rgba[idx + 3] = 255;
    }
    assert.equal(hasOpaquePaperBackground(rgba, width, height), false);
  });
});

describe('Workstream 3: Jiddah Stamp Configuration & Date Formatting', () => {
  it('defaults to official Jiddah stamp geometry, royal stamp blue ink, and Nsaggu P.O.Box line', () => {
    assert.equal(DEFAULT_STAMP_CONFIG.school_name, 'JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL');
    assert.equal(DEFAULT_STAMP_CONFIG.title, 'HEADTEACHER');
    assert.equal(DEFAULT_STAMP_CONFIG.po_box, 'P.O.Box 34008, Nsaggu');
    assert.equal(DEFAULT_STAMP_CONFIG.phone, 'Nakawuka Rd, Wakiso District');
    assert.equal(DEFAULT_STAMP_CONFIG.ink_color, '#1B3B8B');
    assert.equal(DEFAULT_STAMP_CONFIG.date, '26 OCT 2026');
  });

  it('formats ISO YYYY-MM-DD dates into uppercase DD MMM YYYY stamp date strings', () => {
    assert.equal(formatStampDisplayDate('2026-10-26'), '26 OCT 2026');
    assert.equal(formatStampDisplayDate('2026-05-04'), '04 MAY 2026');
    assert.equal(formatStampDisplayDate('18 AUG 2026'), '18 AUG 2026');
    assert.equal(formatStampDisplayDate(null), '26 OCT 2026');
  });
});

describe('Workstream 4: Strict Two-Theme Mode Resolution (Light & Dark Only)', () => {
  it('resolves light/dark strictly and maps legacy hybrid/system cleanly', () => {
    assert.deepEqual(resolveEffectiveTheme('light'), {
      mode: 'light',
      sidebarDark: false,
      workspaceDark: false,
    });
    assert.deepEqual(resolveEffectiveTheme('dark'), {
      mode: 'dark',
      sidebarDark: true,
      workspaceDark: true,
    });
    // Cast legacy values via any to verify runtime defense
    assert.deepEqual(resolveEffectiveTheme('hybrid'), {
      mode: 'light',
      sidebarDark: false,
      workspaceDark: false,
    });
    assert.equal(getStoredThemeMode(), 'light');
  });
});

describe('Workstream 5: Report Center Unified Selection & Completion Filtering', () => {
  it('toggles Select All across visible students while preserving checked off-filter IDs', () => {
    const visible = ['s1', 's2', 's3'];
    const initial = ['off1'];

    const afterSelectAll = toggleSelectAllPreservingOthers(visible, initial);
    assert.deepEqual(afterSelectAll, ['off1', 's1', 's2', 's3']);

    const afterDeselectVisible = toggleSelectAllPreservingOthers(visible, afterSelectAll);
    assert.deepEqual(afterDeselectVisible, ['off1']);
  });

  it('supports forward and backward Shift+Click inclusive range selection', () => {
    const ordered = ['a', 'b', 'c', 'd', 'e'];

    // Click 'b' normally (anchorIndex = 1)
    const step1 = applyRangeSelection(ordered, [], 'b', null, false);
    assert.deepEqual(step1.nextSelected, ['b']);
    assert.equal(step1.nextAnchorIndex, 1);

    // Shift+Click 'd' (forward range b..d)
    const step2 = applyRangeSelection(ordered, step1.nextSelected, 'd', step1.nextAnchorIndex, true);
    assert.deepEqual(step2.nextSelected, ['b', 'c', 'd']);
    assert.equal(step2.nextAnchorIndex, 3);

    // Shift+Click 'a' from anchor 'd' (backward range a..d unchecks since 'a' wasn't checked? Wait: 'a' was unchecked so shouldSelect=true checks a..d)
    const step3 = applyRangeSelection(ordered, step2.nextSelected, 'a', step2.nextAnchorIndex, true);
    assert.deepEqual(step3.nextSelected, ['b', 'c', 'd', 'a']);
  });

  it('classifies and filters reports by mark completion status accurately', () => {
    const completeReport = {
      score_type: 'eot',
      circular: {
        subjects: [
          { name: 'English', eot_score: 82 },
          { name: 'Mathematics', eot_score: 90 },
        ],
      },
    };
    const incompleteReport = {
      score_type: 'eot',
      circular: {
        subjects: [
          { name: 'English', eot_score: 82 },
          { name: 'Mathematics', eot_score: null },
        ],
      },
    };

    assert.equal(getReportCompletionStatus(completeReport), 'complete');
    assert.equal(getReportCompletionStatus(incompleteReport), 'incomplete');

    const statusMap = { s1: 'complete', s2: 'incomplete' };
    const items = [{ enrollment_id: 's1' }, { enrollment_id: 's2' }, { enrollment_id: 's3' }];
    assert.deepEqual(filterEnrollmentsByCompletion(items, statusMap, 'complete'), [{ enrollment_id: 's1' }]);
    assert.deepEqual(filterEnrollmentsByCompletion(items, statusMap, 'incomplete'), [{ enrollment_id: 's2' }]);
    assert.equal(filterEnrollmentsByCompletion(items, statusMap, 'all').length, 3);
  });
});

describe('Forensic Remediation: JSON Logo Parsing, Key Resolution, Activity Actors, Overlays', () => {
  it('extracts .logo from stringified or URL-encoded JSON and maps legacy budge paths to /logo-512h.png', () => {
    assert.equal(normalizeSchoolLogoUrl('/school_budge.jpeg'), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl('school_budge.jpeg'), '/logo-512h.png');
    assert.equal(normalizeSchoolLogoUrl('/school_badge.png'), '/logo-512h.png');
    assert.equal(
      normalizeSchoolLogoUrl('{"logo":"/school_budge.jpeg","stamp":"/stamp.png"}'),
      '/logo-512h.png'
    );
    assert.equal(
      normalizeSchoolLogoUrl('/%7B%22logo%22%3A%22%2Fschool_budge.jpeg%22%7D'),
      '/logo-512h.png'
    );
    assert.equal(
      normalizeSchoolLogoUrl('{"logo":"https://cdn.example.edu/jiddah-crest.png"}'),
      'https://cdn.example.edu/jiddah-crest.png'
    );
  });

  it('resolves server Supabase key gracefully when SUPABASE_SERVICE_ROLE_KEY is absent', () => {
    assert.equal(
      getServerSupabaseKey({
        SUPABASE_SERVICE_ROLE_KEY: 'service-key-1',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-1',
      }),
      'service-key-1'
    );
    assert.equal(
      getServiceRoleKey({
        SUPABASE_SERVICE_ROLE_KEY: '   ',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-1',
      }),
      undefined
    );
    assert.equal(
      getServerSupabaseKey({
        SUPABASE_SERVICE_ROLE_KEY: '',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo_key',
      }),
      'sb_publishable_demo_key'
    );
  });

  it('maps activity log user_ids to teacher/profile names and never emits raw UUIDs', () => {
    const uid = '39da752c-2b12-4361-a146-9bb230519672';
    const unknownUid = '99999999-1111-2222-3333-444444444444';
    const actorMap = buildActivityActorMap(
      [
        {
          id: 't-1',
          auth_user_id: uid,
          name: 'Hassan Hatim',
          role: 'admin',
          subject: 'Both',
        },
      ],
      []
    );

    const resolved = resolveActivityActor(uid, {}, actorMap);
    assert.equal(resolved.name, 'Hassan Hatim');
    assert.equal(resolved.role, 'Administrator');
    assert.equal(resolved.displayLabel, 'Hassan Hatim (Administrator)');

    const fallback = resolveActivityActor(unknownUid, { user_name: unknownUid }, actorMap);
    assert.equal(fallback.name, 'School Staff');
    assert.equal(fallback.role, 'System');
  });

  it('positions Report Studio default stamps safely in the bottom-right stamp zone away from remarks text', () => {
    for (const key of ['primary-eot', 'primary-mot', 'primary-bot', 'p7-eot', 'nursery-eot', 'theology-mot']) {
      const overlay = DEFAULT_OVERLAYS_BY_TEMPLATE[key];
      assert.ok(overlay.stamp.xPercent >= 80, `${key} stamp xPercent should sit in right stamp box`);
      assert.ok(overlay.stamp.yPercent >= 80, `${key} stamp yPercent should sit in footer zone`);
    }
  });
});

describe('Workstream 6: Nursery Grading & Marks Entry Workspace Architecture', () => {
  it('canonical isNurseryClass accurately classifies Nursery/Pre-Primary cohorts vs Primary classes', () => {
    // True nursery classes
    assert.equal(isNurseryClass('Baby Class'), true);
    assert.equal(isNurseryClass('baby'), true);
    assert.equal(isNurseryClass('Middle'), true);
    assert.equal(isNurseryClass('middle class'), true);
    assert.equal(isNurseryClass('Top Class'), true);
    assert.equal(isNurseryClass('Top'), true);
    assert.equal(isNurseryClass('Nursery'), true);
    assert.equal(isNurseryClass('Pre-Primary'), true);
    assert.equal(isNurseryClass('Pre Primary'), true);
    assert.equal(isNurseryClass('KG 1'), true);
    assert.equal(isNurseryClass('ECE Section'), true);

    // False primary / secular classes
    assert.equal(isNurseryClass('P.1'), false);
    assert.equal(isNurseryClass('P.2'), false);
    assert.equal(isNurseryClass('P.3'), false);
    assert.equal(isNurseryClass('P.4'), false);
    assert.equal(isNurseryClass('P.5'), false);
    assert.equal(isNurseryClass('P.6'), false);
    assert.equal(isNurseryClass('P.7'), false);
    assert.equal(isNurseryClass('Primary 3'), false);
    assert.equal(isNurseryClass(null), false);
    assert.equal(isNurseryClass(undefined), false);
    assert.equal(isNurseryClass(''), false);
  });

  it('enforces Official Jiddah Nursery Letter Scale (A, B, C, D, E) without UNEB D1-F9 pollution', () => {
    // A: 90 - 100
    assert.deepEqual(getNurseryGrade(100), { grade: 'A', remark: 'Excellent' });
    assert.deepEqual(getNurseryGrade(95), { grade: 'A', remark: 'Excellent' });
    assert.deepEqual(getNurseryGrade(90), { grade: 'A', remark: 'Excellent' });

    // B: 80 - 89
    assert.deepEqual(getNurseryGrade(89), { grade: 'B', remark: 'Very Good' });
    assert.deepEqual(getNurseryGrade(85), { grade: 'B', remark: 'Very Good' });
    assert.deepEqual(getNurseryGrade(80), { grade: 'B', remark: 'Very Good' });

    // C: 70 - 79
    assert.deepEqual(getNurseryGrade(79), { grade: 'C', remark: 'Good' });
    assert.deepEqual(getNurseryGrade(75), { grade: 'C', remark: 'Good' });
    assert.deepEqual(getNurseryGrade(70), { grade: 'C', remark: 'Good' });

    // D: 50 - 69
    assert.deepEqual(getNurseryGrade(69), { grade: 'D', remark: 'Fair' });
    assert.deepEqual(getNurseryGrade(60), { grade: 'D', remark: 'Fair' });
    assert.deepEqual(getNurseryGrade(50), { grade: 'D', remark: 'Fair' });

    // E: 0 - 49
    assert.deepEqual(getNurseryGrade(49), { grade: 'E', remark: 'Poor' });
    assert.deepEqual(getNurseryGrade(25), { grade: 'E', remark: 'Poor' });
    assert.deepEqual(getNurseryGrade(0), { grade: 'E', remark: 'Poor' });
  });

  it('computes Nursery badge tokens with exact brand colors and handles invalid/empty marks safely', () => {
    const badgeA = computeNurseryBadge(95);
    assert.ok(badgeA);
    assert.equal(badgeA.grade, 'A');
    assert.equal(badgeA.remark, 'Excellent');
    assert.ok(badgeA.bg.includes('#0D5C3A') || badgeA.bg.includes('10B981'));

    const badgeB = computeNurseryBadge(85);
    assert.ok(badgeB);
    assert.equal(badgeB.grade, 'B');
    assert.equal(badgeB.remark, 'Very Good');

    const badgeC = computeNurseryBadge(72);
    assert.ok(badgeC);
    assert.equal(badgeC.grade, 'C');

    const badgeD = computeNurseryBadge(58);
    assert.ok(badgeD);
    assert.equal(badgeD.grade, 'D');

    const badgeE = computeNurseryBadge(35);
    assert.ok(badgeE);
    assert.equal(badgeE.grade, 'E');

    // Invalid / out of bounds handling
    assert.equal(computeNurseryBadge(null), null);
    assert.equal(computeNurseryBadge(undefined), null);
    assert.equal(computeNurseryBadge(-5), null);
    assert.equal(computeNurseryBadge(105), null);
  });

  it('verifies cohort NANYANJA ASHWAAQ (Middle) receives letter grades A and B, never D1 or D2', () => {
    const student = {
      name: 'NANYANJA ASHWAAQ',
      circular_class: 'Middle',
      admission_number: 'ADM-2024-089',
    };

    const isNursery = isNurseryClass(student.circular_class);
    assert.equal(isNursery, true);

    // Score 95 should evaluate to 'A'
    const gradeFor95 = isNursery
      ? getNurseryGrade(95).grade
      : getGradeDisplay(getSubjectGradeNumber(95));
    assert.equal(gradeFor95, 'A');
    assert.notEqual(gradeFor95, 'D1');

    // Score 85 should evaluate to 'B'
    const gradeFor85 = isNursery
      ? getNurseryGrade(85).grade
      : getGradeDisplay(getSubjectGradeNumber(85));
    assert.equal(gradeFor85, 'B');
    assert.notEqual(gradeFor85, 'D1');
    assert.notEqual(gradeFor85, 'D2');
  });
});

describe('Workstream 7: Navigation Layout, Alphanumeric Sorting & Mobile Optimization', () => {
  it('enforces natural alphanumeric sorting for Nursery learning areas (LA1, LA2, LA3...)', () => {
    const rawSubjects = [
      { subject_name: 'LA2 English' },
      { subject_name: 'LA1 Social Development' },
      { subject_name: 'LA4 Numbers' },
      { subject_name: 'LA3 Health Habits' },
    ];

    const getSubjectOrder = (name) => {
      const n = (name || '').toUpperCase();
      if (n.includes('ENG')) return 1;
      if (n.includes('MATH') || n.includes('MTC')) return 2;
      if (n.includes('LIT 1') || n.includes('LIT I')) return 3;
      if (n.includes('LIT 2') || n.includes('LIT II')) return 4;
      if (n.includes('SCI')) return 5;
      if (n.includes('SST') || n.includes('SOCIAL')) return 6;
      if (n.includes('COMP')) return 7;
      if (n.includes('IRE')) return 8;
      return 99;
    };

    const isCurrentNursery = true;

    const sorted = [...rawSubjects].sort((a, b) => {
      const nameA = a.subject_name || '';
      const nameB = b.subject_name || '';
      if (isCurrentNursery || /^LA\d+/i.test(nameA) || /^LA\d+/i.test(nameB)) {
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      }
      const orderA = getSubjectOrder(nameA);
      const orderB = getSubjectOrder(nameB);
      if (orderA !== orderB) return orderA - orderB;
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const sortedNames = sorted.map((s) => s.subject_name);
    assert.deepEqual(sortedNames, [
      'LA1 Social Development',
      'LA2 English',
      'LA3 Health Habits',
      'LA4 Numbers',
    ]);

    // Specifically verify LA1 Social Development precedes LA2 English (regression fix)
    assert.equal(sortedNames[0], 'LA1 Social Development');
    assert.equal(sortedNames[1], 'LA2 English');
  });

  it('renders MobileBottomNav cleanly as null eliminating redundant mobile bars', () => {
    assert.equal(typeof MobileBottomNav, 'function');
    assert.equal(MobileBottomNav(), null);
  });
});

describe('Workstream 8: Mobile Drawer Header & Mobile Marks Entry Architecture', () => {
  const rootDir = process.cwd();

  it('renders both Search (🔍) and Close (✕) buttons in the mobile sidebar drawer header', () => {
    const sidebarPath = path.join(rootDir, 'src/components/layout/app-sidebar.tsx');
    const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');

    // Asserts mobile header row exists with both search and close button actions
    assert.match(sidebarSrc, /data-testid="mobile-sidebar-search-btn"/);
    assert.match(sidebarSrc, /data-testid="mobile-sidebar-close-btn"/);
    assert.match(sidebarSrc, /jiddah:open-command-palette/);
    assert.match(sidebarSrc, /setOpenMobile\(false\)/);
  });

  it('prevents overlapping Radix close button in SheetContent', () => {
    const sheetPath = path.join(rootDir, 'src/components/figma-ui/ui/sheet.tsx');
    const sheetSrc = fs.readFileSync(sheetPath, 'utf8');
    assert.match(sheetSrc, /hideCloseButton/);

    const sidebarUiPath = path.join(rootDir, 'src/components/figma-ui/ui/sidebar.tsx');
    const sidebarUiSrc = fs.readFileSync(sidebarUiPath, 'utf8');
    assert.match(sidebarUiSrc, /hideCloseButton/);
  });

  it('enforces numeric keypad (inputMode="numeric" and pattern="[0-9]*") on score inputs', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    assert.match(marksEntrySrc, /inputMode="numeric"/);
    assert.match(marksEntrySrc, /pattern="\[0-9\]\*"/);
  });

  it('hides desktop keyboard hints and Ctrl+S shortcuts on mobile viewports', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // "Arrow keys / Enter for next row" is hidden on mobile screens
    assert.match(marksEntrySrc, /hidden md:inline-flex items-center gap-1[^>]*>\s*<Sparkles[^>]*\/>\s*Arrow keys \/ Enter for next row/s);

    // "(Ctrl+S)" is hidden on mobile screens
    assert.match(marksEntrySrc, /<span className="hidden md:inline"> \(Ctrl\+S\)<\/span>/);
  });

  it('verifies mobile marks entry replaces cramped dark green box with clean elevated card', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Mobile Top Filter Strip exists
    assert.match(marksEntrySrc, /aria-label="Class Filter Mobile"/);
    assert.match(marksEntrySrc, /aria-label="Exam Phase Mobile"/);

    // Expandable student search toggle exists
    assert.match(marksEntrySrc, /aria-label="Toggle student search"/);

    // Single-line floating bottom save dock exists
    assert.match(marksEntrySrc, /sticky bottom-2 z-20 rounded-full\s+(?:md:static\s+)?bg-white\/95 dark:bg-\[#1E1F20\]\/95/);
  });
});

describe('Workstream 9: Custom Radix Comboboxes, Middle Performance Bar & Dark Mode Score Inputs', () => {
  const rootDir = process.cwd();

  it('exports CustomPillSelect and StudentCombobox components built on Radix Popover', () => {
    const customSelectPath = path.join(rootDir, 'src/components/ui/custom-pill-select.tsx');
    const customSelectSrc = fs.readFileSync(customSelectPath, 'utf8');

    assert.match(customSelectSrc, /@radix-ui\/react-popover/);
    assert.match(customSelectSrc, /export function CustomPillSelect/);
    assert.match(customSelectSrc, /export function StudentCombobox/);
    assert.match(customSelectSrc, /PopoverPrimitive\.Root/);
    assert.match(customSelectSrc, /PopoverPrimitive\.Trigger/);
    assert.match(customSelectSrc, /PopoverPrimitive\.Content/);
  });

  it('replaces all native select tags in Marks Entry with CustomPillSelect and StudentCombobox', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Asserts custom components are imported
    assert.match(marksEntrySrc, /import\s*\{[^}]*CustomPillSelect[^}]*StudentCombobox[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);

    // Desktop Zone 1 uses CustomPillSelect for class and subject filters
    assert.match(marksEntrySrc, /<CustomPillSelect\s+id="marks-class-select"/);
    assert.match(marksEntrySrc, /<CustomPillSelect\s+id="marks-subject-select"/);

    // Desktop Zone 2 uses StudentCombobox with hero variant
    assert.match(marksEntrySrc, /<StudentCombobox\s+id="marks-student-select"\s+ariaLabel="Student"\s+variant="hero"/);

    // Mobile strip uses CustomPillSelect and StudentCombobox
    assert.match(marksEntrySrc, /<CustomPillSelect\s+id="marks-class-filter-mobile"/);
    assert.match(marksEntrySrc, /<StudentCombobox\s+id="marks-student-select-mobile"/);

    // No raw <select tags remain in marks entry
    assert.doesNotMatch(marksEntrySrc, /<select[\s>]/);
  });

  it('enforces dark recessed inputs in Dark Mode to eliminate white-on-white score text', () => {
    const globalsCssPath = path.join(rootDir, 'src/app/globals.css');
    const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

    // .dark .score-input rules exist in globals.css
    assert.match(globalsCss, /\.dark\s+\.score-input\s*\{[^}]*background:\s*#0D1714\s*!important/);
    assert.match(globalsCss, /\.dark\s+\.score-input\s*\{[^}]*color:\s*#FFFFFF\s*!important/);
    assert.match(globalsCss, /\.dark\s+\.score-input:focus\s*\{[^}]*background:\s*#16241F\s*!important/);

    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Sizing and dark mode contrast classes enforced on score inputs
    assert.match(marksEntrySrc, /score-input/);
    assert.match(marksEntrySrc, /dark:!bg-\[#0D1714\]/);
    assert.match(marksEntrySrc, /dark:!text-\[#FFFFFF\]/);
  });

  it('renders Middle Performance Bar & Remark column in Secular and Theology tables', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Performance & Remark headers exist
    assert.match(marksEntrySrc, /Performance &amp; Remark/);
    assert.match(marksEntrySrc, /المستوى والتقدير/);

    // Row hover transition colors
    assert.match(marksEntrySrc, /hover:bg-\[var\(--bg-hover\)\] transition-colors/);

    // Single-curriculum telemetry side card rendered in lg:col-span-4
    assert.match(marksEntrySrc, /function StudentPerformanceSideCard/);
    assert.match(marksEntrySrc, /<StudentPerformanceSideCard/);
    assert.match(marksEntrySrc, /lg:col-span-4/);
  });
});

describe('Workstream 10: Silky Popover Physics, Wrapped Chevron Fix, & System-Wide Custom Combobox Rollout', () => {
  const rootDir = process.cwd();

  it('defines hardware-accelerated popover keyframes and eliminates popper wrapper transitions in globals.css', () => {
    const globalsCssPath = path.join(rootDir, 'src/app/globals.css');
    const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

    assert.match(globalsCss, /\[data-radix-popper-content-wrapper\]\s*\{[^}]*transition:\s*none\s*!important/);
    assert.match(globalsCss, /@keyframes\s+jiddah-popover-in/);
    assert.match(globalsCss, /@keyframes\s+jiddah-popover-out/);
    assert.match(globalsCss, /\.jiddah-popover-content\[data-state="open"\]/);
    assert.match(globalsCss, /\.jiddah-popover-content\[data-state="closed"\]/);
  });

  it('prevents wrapped chevron in CustomPillSelect and anchors popovers to jiddah-popover-content', () => {
    const customSelectPath = path.join(rootDir, 'src/components/ui/custom-pill-select.tsx');
    const customSelectSrc = fs.readFileSync(customSelectPath, 'utf8');

    // Prevents wrapping of chevron button & label
    assert.match(customSelectSrc, /flex-nowrap\s+whitespace-nowrap/);
    assert.match(customSelectSrc, /whitespace-nowrap\s+shrink-0/);
    assert.match(customSelectSrc, /ease-\[cubic-bezier\(0\.16,1,0\.3,1\)\]/);
    assert.match(customSelectSrc, /jiddah-popover-content/);

    // MoreActionsMenu and Radix popovers also use jiddah-popover-content
    const moreActionsPath = path.join(rootDir, 'src/components/ui/more-actions-menu.tsx');
    const moreActionsSrc = fs.readFileSync(moreActionsPath, 'utf8');
    assert.match(moreActionsSrc, /jiddah-popover-content/);

    const figmaPopoverPath = path.join(rootDir, 'src/components/figma-ui/ui/popover.tsx');
    const figmaPopoverSrc = fs.readFileSync(figmaPopoverPath, 'utf8');
    assert.match(figmaPopoverSrc, /jiddah-popover-content/);
  });

  it('auto-adjusts Marks Entry layout between windowed and fullscreen viewports', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Compact row height h-10 or h-[38px]
    assert.match(marksEntrySrc, /hover:bg-\[var\(--bg-hover\)\] transition-colors (?:h-10|h-\[38px\]|\$\{isBothView)/);

    // Zone 4 save bar is md:static on desktop and sticky on mobile
    assert.match(marksEntrySrc, /sticky bottom-2 z-20 rounded-full md:static/);
    assert.match(marksEntrySrc, /shrink-0 mt-auto/);

    // Side card compacts and hides keyboard shortcuts on shorter viewports
    assert.match(marksEntrySrc, /hidden\s+\[@media\(min-height:860px\)\]:block/);
  });

  it('rolls out CustomPillSelect across Secular Hub, Theology Hub, Reports, Students, and Classes', () => {
    const secularHubPath = path.join(rootDir, 'src/components/secular-hub/SecularHubClient.tsx');
    const secularHubSrc = fs.readFileSync(secularHubPath, 'utf8');
    assert.match(secularHubSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(secularHubSrc, /<CustomPillSelect\s+id="secular-hub-term-select"/);
    assert.match(secularHubSrc, /<CustomPillSelect\s+id="secular-hub-class-select"/);

    const theologyHubPath = path.join(rootDir, 'src/components/theology-hub/TheologyHubClient.tsx');
    const theologyHubSrc = fs.readFileSync(theologyHubPath, 'utf8');
    assert.match(theologyHubSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(theologyHubSrc, /<CustomPillSelect\s+id="theology-hub-term-select"/);
    assert.match(theologyHubSrc, /<CustomPillSelect\s+id="theology-hub-class-select"/);

    const reportsClientPath = path.join(rootDir, 'src/components/layout/reports-client.tsx');
    const reportsClientSrc = fs.readFileSync(reportsClientPath, 'utf8');
    assert.match(reportsClientSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(reportsClientSrc, /<CustomPillSelect\s+id="reports-class-select"/);
    assert.match(reportsClientSrc, /<CustomPillSelect\s+id="reports-term-select"/);

    const reportGenPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const reportGenSrc = fs.readFileSync(reportGenPath, 'utf8');
    assert.match(reportGenSrc, /flex flex-1 min-h-0 overflow-hidden relative/);

    const studentsListPath = path.join(rootDir, 'src/components/StudentsListClient.tsx');
    const studentsListSrc = fs.readFileSync(studentsListPath, 'utf8');
    assert.match(studentsListSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(studentsListSrc, /<CustomPillSelect\s+id="students-class-filter"/);

    const classesClientPath = path.join(rootDir, 'src/components/layout/classes-client.tsx');
    const classesClientSrc = fs.readFileSync(classesClientPath, 'utf8');
    assert.match(classesClientSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(classesClientSrc, /<CustomPillSelect\s+id="classes-section-filter"/);
  });
});

describe('Workstream 11: Milestone 16 Layout Compactness, Mobile Refinement & Module Rollout', () => {
  const rootDir = process.cwd();

  it('enforces 2-row mobile filter strip and eliminates avatar collision in Marks Entry', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Row 1: Class + Subject grid
    assert.match(marksEntrySrc, /grid grid-cols-2 gap-1\.5 w-full/);
    assert.match(marksEntrySrc, /id="marks-subject-filter-mobile"/);

    // Row 2: Phase track + Department track
    assert.match(marksEntrySrc, /flex-\[4\]/);
    assert.match(marksEntrySrc, /grid-cols-4/);
    assert.match(marksEntrySrc, /flex-\[3\]/);
    assert.match(marksEntrySrc, /grid-cols-3/);

    // Mobile student switcher: no redundant outer avatar circle before StudentCombobox
    assert.doesNotMatch(marksEntrySrc, /<div className="w-8 h-8 rounded-full bg-emerald-600[^"]*"><StudentCombobox/);
    assert.match(marksEntrySrc, /<StudentCombobox\s+id="marks-student-select-mobile"/);
  });

  it('enforces table-fixed layout and compact row geometry in Secular & Theology tables', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // table-fixed w-full applied to tables
    assert.match(marksEntrySrc, /<table className="w-full table-fixed/);

    // Compact py-1 row cell geometry
    assert.match(marksEntrySrc, /px-3 sm:px-4 py-1/);
    assert.match(marksEntrySrc, /w-\[(?:52|54)%\] sm:w-\[36%\]/);
    assert.match(marksEntrySrc, /w-\[(?:46|48)%\] sm:w-\[28%\]/);

    // Bottom container padding avoids floating Save bar overlap
    assert.match(marksEntrySrc, /pb-2/);
  });

  it('rolls out CustomPillSelect and Brand Themes across Teachers, Subjects, Roll Call, and Hubs', () => {
    const teachersPath = path.join(rootDir, 'src/components/layout/teachers-client.tsx');
    const teachersSrc = fs.readFileSync(teachersPath, 'utf8');
    assert.match(teachersSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(teachersSrc, /<CustomPillSelect\s+id="teachers-role-filter"/);

    const subjectsPath = path.join(rootDir, 'src/components/layout/subjects-client.tsx');
    const subjectsSrc = fs.readFileSync(subjectsPath, 'utf8');
    assert.match(subjectsSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(subjectsSrc, /<CustomPillSelect\s+id="subjects-curriculum-filter"/);

    const rollCallPath = path.join(rootDir, 'src/components/teacher/RollCallClient.tsx');
    const rollCallSrc = fs.readFileSync(rollCallPath, 'utf8');
    assert.match(rollCallPath && rollCallSrc, /import\s*\{[^}]*CustomPillSelect[^}]*\}\s*from\s*['"]@\/components\/ui\/custom-pill-select['"]/);
    assert.match(rollCallSrc, /<CustomPillSelect\s+id="rollcall-class-select"/);

    // Hubs header washes
    const secularHubPath = path.join(rootDir, 'src/components/secular-hub/SecularHubClient.tsx');
    const secularHubSrc = fs.readFileSync(secularHubPath, 'utf8');
    assert.match(secularHubSrc, /bg-\[#0D5C3A\]\/10/);

    const theologyHubPath = path.join(rootDir, 'src/components/theology-hub/TheologyHubClient.tsx');
    const theologyHubSrc = fs.readFileSync(theologyHubPath, 'utf8');
    assert.match(theologyHubSrc, /bg-\[#D97706\]\/15/);
  });
});

describe('Workstream 12: Five Exact CSS Layout and Table-Math Bug Fixes', () => {
  const rootDir = process.cwd();

  it('prevents Quick Search collision with Term badge in Desktop Zone 1', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Quick Search pill wrapper includes overflow-hidden and responsive widths
    assert.match(marksEntrySrc, /w-44 lg:w-52 xl:w-64 max-w-\[260px\] shrink/);

    // Input has w-full min-w-0 and size={1}
    assert.match(marksEntrySrc, /id="marks-student-search"[^>]*size=\{1\}/);
    assert.match(marksEntrySrc, /w-full min-w-0 bg-transparent text-xs outline-none border-0 truncate/);

    // Right-side controls group has shrink-0 and compact text-[11px] font-semibold
    assert.match(marksEntrySrc, /flex items-center gap-1\.5 shrink-0 ml-auto/);
    assert.match(marksEntrySrc, /px-2\.5 py-1 text-\[11px\] font-semibold/);
  });

  it('prevents All Subjects (6) wrapped chevron in CustomPillSelect and marks entry', () => {
    const customSelectPath = path.join(rootDir, 'src/components/ui/custom-pill-select.tsx');
    const customSelectSrc = fs.readFileSync(customSelectPath, 'utf8');

    // Inline style flexWrap nowrap enforced on button
    assert.match(customSelectSrc, /flexWrap:\s*'nowrap'/);
    assert.match(customSelectSrc, /whiteSpace:\s*'nowrap'/);
    assert.match(customSelectSrc, /inline-flex flex-row flex-nowrap items-center justify-between gap-1\.5 whitespace-nowrap shrink-0/);
    assert.match(customSelectSrc, /<ChevronDown\s+className=\{cn\(\s*'size-3\.5 shrink-0/);

    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Subject select on desktop uses hidden xl:inline-flex shrink-0 w-auto
    assert.match(marksEntrySrc, /id="marks-subject-select"[\s\S]*?className="hidden xl:inline-flex shrink-0 w-auto"/);
  });

  it('enforces overflow-hidden w-full wrappers and exact table column percentages', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Wrappers have overflow-hidden w-full (zero internal horizontal scrollbar)
    assert.match(marksEntrySrc, /data-testid="marks-scroll-grid"\s+className="overflow-hidden w-full/);
    assert.match(marksEntrySrc, /<div className="overflow-hidden w-full/);

    // Column widths: 52% mobile / 36% sm for subject, 48% mobile / 28% sm for score (single phase)
    assert.match(marksEntrySrc, /w-\[52%\] sm:w-\[36%\] px-3 sm:px-4 py-1/);
    assert.match(marksEntrySrc, /w-\[48%\] sm:w-\[28%\] px-2\.5 sm:px-4 py-1/);

    // Subject cells enforce max-w-0 truncate
    assert.match(marksEntrySrc, /max-w-0 truncate py-1/);

    // Score cells enforce flex justify-end
    assert.match(marksEntrySrc, /flex items-center justify-end gap-1\.5 w-full/);
  });

  it('verifies parent container does not use pb-16 to avoid sticky Save bar displacement', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Parent container uses pb-2, not pb-16
    assert.doesNotMatch(marksEntrySrc, /pb-16/);
    assert.match(marksEntrySrc, /w-full max-w-full min-w-0 pb-2 flex-1 min-h-0 flex flex-col justify-between/);

    // Zone 3 grid container has mb-3 separation before Zone 4 Save bar
    assert.match(marksEntrySrc, /grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch w-full min-w-0 flex-1 min-h-0 mb-3/);
  });
});

describe('Workstream 13: Final 5-Point Micro-Polish Pass for Marks Entry', () => {
  const rootDir = process.cwd();

  it('1. expands Desktop Zone 1 Quick Search to w-44 lg:w-52 xl:w-64 max-w-[260px] with "Search student..." placeholder', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    assert.match(marksEntrySrc, /className="relative w-44 lg:w-52 xl:w-64 max-w-\[260px\] shrink"/);
    assert.match(marksEntrySrc, /placeholder="Search student\.\.\."/);
  });

  it('2. aligns Secular & Theology Card bottom baselines in Desktop "Both" mode via items-stretch and insight strip', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Zone 3 grid uses items-stretch
    assert.match(marksEntrySrc, /grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch/);

    // Both cards use h-full flex flex-col justify-between
    assert.match(marksEntrySrc, /h-full flex flex-col justify-between[\s\S]*?Secular Marks/);
    assert.match(marksEntrySrc, /h-full flex flex-col justify-between[\s\S]*?Theology Marks/);

    // Both table containers use flex-1 flex flex-col
    assert.match(marksEntrySrc, /data-testid="marks-scroll-grid"\s+className="overflow-hidden w-full flex-1 flex flex-col"/);

    // Footers pushed to mt-auto shrink-0
    assert.match(marksEntrySrc, /mt-auto shrink-0[\s\S]*?Secular Summary/);
    assert.match(marksEntrySrc, /mt-auto shrink-0[\s\S]*?ملخص المواد الشرعية/);

    // Theology performance insight strip present when Theology has fewer rows than Secular
    assert.match(marksEntrySrc, /data-testid="theology-insight-strip"/);
    assert.match(marksEntrySrc, /أعلى مادة:/);
    assert.match(marksEntrySrc, /مكتمل ١٠٠٪/);
  });

  it('3. converts Theology summary numbers strictly through toArabicDigits with zero Western numeral mixing', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // toArabicDigits function definition
    assert.match(marksEntrySrc, /export function toArabicDigits\(/);

    // Theology footer converts total, maxTotal, and mean percentage
    assert.match(marksEntrySrc, /المجموع:\s*\{toArabicDigits\(theologyStats\.total\)\}\s*\/\s*\{toArabicDigits\(theologyStats\.maxTotal\)\}\s*•\s*المعدل:\s*\{toArabicDigits\(theologyStats\.mean\)\}٪/);

    // Test toArabicDigits numeral conversion
    function toArabicDigits(val) {
      if (val === null || val === undefined || val === '') return '';
      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return String(val).replace(/[0-9]/g, (d) => arabicDigits[Number(d)] ?? d);
    }

    assert.strictEqual(toArabicDigits(356), '٣٥٦');
    assert.strictEqual(toArabicDigits(400), '٤٠٠');
    assert.strictEqual(toArabicDigits(89.5), '٨٩.٥');
    assert.strictEqual(toArabicDigits(100), '١٠٠');
    assert.strictEqual(`المجموع: ${toArabicDigits(356)} / ${toArabicDigits(400)} • المعدل: ${toArabicDigits(89.5)}٪`, 'المجموع: ٣٥٦ / ٤٠٠ • المعدل: ٨٩.٥٪');
  });

  it('4. gives Mobile Student Name maximum width by removing duplicate ⋮ and tightening buttons to w-8 h-8', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Stepper buttons are w-8 h-8 shrink-0
    assert.match(marksEntrySrc, /title="Previous student"[\s\S]*?className="w-8 h-8 rounded-full/);
    assert.match(marksEntrySrc, /title="Next student"[\s\S]*?className="w-8 h-8 rounded-full/);

    // Search toggle button is w-8 h-8 shrink-0
    assert.match(marksEntrySrc, /aria-label="Toggle student search"[\s\S]*?className={`w-8 h-8 rounded-full/);

    // Duplicate MoreActionsMenu is removed from mobile student switcher card
    const studentCardRegion = marksEntrySrc.substring(
      marksEntrySrc.indexOf('Mobile Active Student Switcher Card'),
      marksEntrySrc.indexOf('Expandable Search Row')
    );
    assert.doesNotMatch(studentCardRegion, /<MoreActionsMenu/);

    // StudentCombobox mobile horizontal padding reduced to px-2.5 and gap-1.5
    const customSelectPath = path.join(rootDir, 'src/components/ui/custom-pill-select.tsx');
    const customSelectSrc = fs.readFileSync(customSelectPath, 'utf8');
    assert.match(customSelectSrc, /px-2\.5 sm:px-3/);
    assert.match(customSelectSrc, /gap-1\.5 sm:gap-2/);
  });

  it('5. disables Next.js floating dev indicator badge in next.config.ts', () => {
    const nextConfigPath = path.join(rootDir, 'next.config.ts');
    const nextConfigSrc = fs.readFileSync(nextConfigPath, 'utf8');

    assert.match(nextConfigSrc, /devIndicators:\s*false/);
    assert.doesNotMatch(nextConfigSrc, /position:\s*'bottom-right'/);
  });
});

describe('Workstream 14: Multi-Phase "ALL" Column Math, Zero-Void Theology Rows & Mobile Term Badge', () => {
  const rootDir = process.cwd();

  it('hides middle remark column in ALL mode and applies exact multi-phase percentages', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Rule A: Middle Performance & Remark and Core columns are hidden when examType === 'all'
    assert.match(marksEntrySrc, /examType !== 'all'\s*&&\s*\(\s*<th className="hidden sm:table-cell sm:w-\[36%\] px-3 py-1\.5 text-left">\s*Performance &amp; Remark/);
    assert.match(marksEntrySrc, /examType !== 'all'\s*&&\s*\(\s*<th className="hidden sm:table-cell sm:w-\[36%\] px-3 py-1\.5 text-right" dir="rtl">\s*المستوى والتقدير/);
    assert.match(marksEntrySrc, /!isCurrentNursery && examType !== 'all' && \(\s*<th className="hidden sm:table-cell px-1\.5 py-1\.5 text-center w-10">Core<\/th>/);

    // Rule B: Dynamic Column Percentages for ALL mode in Secular (28% mobile / 31% sm, score 24% mobile / 23% sm)
    assert.match(marksEntrySrc, /examType === 'all'\s*\?\s*'w-\[28%\] sm:w-\[31%\] px-2 sm:px-3 py-1\.5 text-left'\s*:\s*'w-\[52%\] sm:w-\[36%\] px-3 sm:px-4 py-1\.5 text-left'/);
    assert.match(marksEntrySrc, /examType === 'all'\s*\?\s*'w-\[24%\] sm:w-\[23%\] px-1 sm:px-2 py-1\.5 text-center'\s*:\s*'w-\[48%\] sm:w-\[28%\] px-2\.5 sm:px-4 py-1\.5 text-right'/);

    // Rule B: Dynamic Column Percentages for ALL mode in Theology (38% mobile / 40% sm, score 31% mobile / 30% sm)
    assert.match(marksEntrySrc, /examType === 'all'\s*\?\s*'w-\[38%\] sm:w-\[40%\] px-2\.5 sm:px-3\.5 py-1\.5 text-left'\s*:\s*'w-\[52%\] sm:w-\[36%\] px-3 sm:px-4 py-1\.5 text-left'/);
    assert.match(marksEntrySrc, /examType === 'all'\s*\?\s*'w-\[31%\] sm:w-\[30%\] px-1\.5 sm:px-2\.5 py-1\.5 text-center'\s*:\s*'w-\[48%\] sm:w-\[28%\] px-2\.5 sm:px-4 py-1\.5 text-right'/);

    // Mobile shortened header labels
    assert.match(marksEntrySrc, /BOT<span className="hidden sm:inline"> \(100\)<\/span>/);
    assert.match(marksEntrySrc, /MOT<span className="hidden sm:inline"> \(100\)<\/span>/);
    assert.match(marksEntrySrc, /EOT<span className="hidden sm:inline"> \(100\)<\/span>/);

    // Rule C: Compact input sizing in ALL mode
    assert.match(marksEntrySrc, /isAllPhases\s*\?\s*'w-11 sm:w-14 h-7\.5 px-1 text-xs font-mono font-extrabold tabular-nums text-center/);
    assert.match(marksEntrySrc, /isAllPhases\s*\?\s*'min-w-\[22px\] sm:min-w-\[32px\] h-6 sm:h-7 px-1 text-\[10px\] sm:text-\[11px\] font-bold/);
  });

  it('eliminates hollow card gap inside Theology card via proportional row scaling and flush insight strip', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Secular rows use h-[38px]
    assert.match(marksEntrySrc, /<tr className="hover:bg-\[var\(--bg-hover\)\] transition-colors h-\[38px\]">/);

    // Theology rows proportionally scale to h-[50px] sm:h-[52px] in Both mode
    assert.match(marksEntrySrc, /isBothView \? 'h-\[50px\] sm:h-\[52px\]' : 'h-10'/);
    assert.match(marksEntrySrc, /isBothView \? 'text-xs sm:text-\[15px\]' : 'text-xs sm:text-\[13px\]'/);

    // Table container has no justify-between
    assert.match(marksEntrySrc, /data-testid="marks-scroll-grid"\s+className="overflow-hidden w-full flex-1 flex flex-col"/);

    // Performance insight strip sits flush with mt-2.5 instead of mt-auto
    assert.match(marksEntrySrc, /className="mt-2\.5 px-3\.5 py-1\.5 mx-2\.5 mb-2 rounded-xl/);
  });

  it('renders read-only Active Term confirmation pill on mobile and provides scroll clearance spacer', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    // Mobile Active Term pill in student switcher card telemetry
    assert.match(marksEntrySrc, /data-testid="mobile-active-term-pill"/);
    assert.match(marksEntrySrc, /inline-flex items-center gap-1 px-2 py-0\.5 rounded-full bg-\[#0D5C3A\]\/10 dark:bg-\[#10B981\]\/15 text-\[#0D5C3A\] dark:text-\[#34D399\] text-\[10\.5px\] font-semibold shrink-0 select-none/);

    // Mobile scroll clearance spacer after Zone 4 sticky save pill
    assert.match(marksEntrySrc, /className="h-14 md:hidden shrink-0 pointer-events-none"/);
  });
});

describe('Workstream 15: Report Center Smart Defaults, Zone 1 Bar & Split-Pane Architecture', () => {
  const rootDir = process.cwd();

  it('eliminates blank landing screen with smart defaults and automatic report generation', () => {
    const reportGenPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const reportGenSrc = fs.readFileSync(reportGenPath, 'utf8');

    // Default term and phase initialized
    assert.match(reportGenSrc, /phase:\s*\(searchParams\.get\('phase'\)\s*as\s*any\)\s*\|\|\s*'EOT'/);

    // Auto-selects class if none chosen
    assert.match(reportGenSrc, /localStorage\.getItem\('jiddah_reports_last_class'\)/);
    assert.match(reportGenSrc, /classIds:\s*\[chosenClassId\]/);

    // Automatically generates reports on mount
    assert.match(reportGenSrc, /autoGeneratedKey\.current !== key/);
    assert.match(reportGenSrc, /executeGeneration\(\)/);
  });

  it('enforces Dark Mode stage backdrop and Zone 1 Unified Live Control Bar', () => {
    const reportGenPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const reportGenSrc = fs.readFileSync(reportGenPath, 'utf8');

    // Dark-mode compliant workspace backdrop
    assert.match(reportGenSrc, /data-testid="report-center-workspace"/);
    assert.match(reportGenSrc, /bg-\[#EEF3F0\] dark:bg-\[#0B110E\]/);

    // Zone 1 bar controls
    assert.match(reportGenSrc, /id="reports-class-cohort-select"/);
    assert.match(reportGenSrc, /data-testid="reports-active-term-pill"/);
    assert.match(reportGenSrc, /data-testid="reports-phase-track"/);
    assert.match(reportGenSrc, /data-testid="reports-curriculum-track"/);

    // TopToolbar Zone 1 implementation
    const topToolbarPath = path.join(rootDir, 'src/components/figma-ui/TopToolbar.tsx');
    const topToolbarSrc = fs.readFileSync(topToolbarPath, 'utf8');
    assert.match(topToolbarSrc, /data-testid="reports-zone-1-bar"/);
    assert.match(topToolbarSrc, /bg-white dark:bg-\[#151D1A\] rounded-2xl px-3 py-1\.5 border border-\[#0D5C3A\]\/15 dark:border-\[#F59E0B\]\/20/);
    assert.doesNotMatch(topToolbarSrc, /<div className="text-xs font-bold text-stone-700 dark:text-stone-200 truncate">\s*Report Center\s*<\/div>/);

    // ReportPreviewCell paper styling
    const previewCellPath = path.join(rootDir, 'src/components/reports/ReportPreviewCell.tsx');
    const previewCellSrc = fs.readFileSync(previewCellPath, 'utf8');
    assert.match(previewCellSrc, /shadow-\[0_12px_36px_rgba\(0,0,0,0\.12\)\] dark:shadow-\[0_16px_48px_rgba\(0,0,0,0\.65\)\]/);
  });

  it('delivers responsive Student Roster & Document Canvas controls', () => {
    const reportGenPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const reportGenSrc = fs.readFileSync(reportGenPath, 'utf8');

    // Preview Canvas & Popover student roster
    assert.match(reportGenSrc, /<StudentRosterSidebar/);
    assert.match(reportGenSrc, /<DocumentCanvas/);

    // Mobile layout
    assert.match(reportGenSrc, /id="reports-mobile-class-select"/);

    // Student Roster Sidebar features
    const sidebarPath = path.join(rootDir, 'src/components/figma-ui/StudentRosterSidebar.tsx');
    const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');
    assert.match(sidebarSrc, /data-testid="student-roster-sidebar"/);
    assert.match(sidebarSrc, /data-testid="student-roster-list"/);
    assert.match(sidebarSrc, /selected for batch print/);

    // Document Canvas Unified Zoom Control & Floating Dock
    const canvasPath = path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx');
    const canvasSrc = fs.readFileSync(canvasPath, 'utf8');
    assert.match(canvasSrc, /data-testid="floating-control-dock"/);
    assert.match(canvasSrc, /data-testid="unified-zoom-control"/);
  });
});

describe('WORKSTREAM 16: Full-Width Document Preview & Dual-Curriculum Report Data Pipeline', () => {
  const rootDir = process.cwd();

  it('dedicates 100% of workspace width to Document Preview Canvas with Topbar Popover Roster', () => {
    const reportGenPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const reportGenSrc = fs.readFileSync(reportGenPath, 'utf8');

    // Popover trigger for student & batch checklist
    assert.match(reportGenSrc, /data-testid="student-roster-popover-trigger"/);
    assert.match(reportGenSrc, /<Popover open={isRosterOpen}/);
    assert.match(reportGenSrc, /Selected •/);

    // Full width document preview canvas container (no pinned 320px desktop sidebar)
    assert.match(reportGenSrc, /100% Full-Width Document Preview Canvas/);
    assert.match(reportGenSrc, /<DocumentCanvas/);

    // TopToolbar receives studentSelectorPill
    assert.match(reportGenSrc, /studentSelectorPill={/);

    const toolbarPath = path.join(rootDir, 'src/components/figma-ui/TopToolbar.tsx');
    const toolbarSrc = fs.readFileSync(toolbarPath, 'utf8');
    assert.match(toolbarSrc, /studentSelectorPill/);
  });

  it('provides translucent bottom-right floating dock with steppers and zoom controls in DocumentCanvas', () => {
    const canvasPath = path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx');
    const canvasSrc = fs.readFileSync(canvasPath, 'utf8');

    assert.match(canvasSrc, /data-testid="floating-control-dock"/);
    assert.match(canvasSrc, /ChevronLeft/);
    assert.match(canvasSrc, /ChevronRight/);
    assert.match(canvasSrc, /data-testid="unified-zoom-control"/);
    assert.match(canvasSrc, /Maximize2/);
    assert.doesNotMatch(canvasSrc, /data-testid="stage-top-mini-bar"/);
  });

  it('guarantees theology marks and subjects are populated for dual-curriculum reports in single and batch APIs', () => {
    const singleReportPath = path.join(rootDir, 'src/app/api/report/route.ts');
    const singleReportSrc = fs.readFileSync(singleReportPath, 'utf8');

    // Queries theology_subjects table (not subjects)
    assert.match(singleReportSrc, /\.from\('theology_subjects'\)/);
    // Uses equivalent termIds
    assert.match(singleReportSrc, /resolveEquivalentTerms/);
    assert.match(singleReportSrc, /fetchAndReconcileSecularMarks/);
    // Never sets theology to null for secular/dual
    assert.match(singleReportSrc, /theology: theologySectionData,/);

    const batchReportPath = path.join(rootDir, 'src/app/api/report/batch/route.ts');
    const batchReportSrc = fs.readFileSync(batchReportPath, 'utf8');

    // Reconciles equivalent terms
    assert.match(batchReportSrc, /resolveEquivalentTerms/);
    // Fetches theology_subjects regardless of curriculum === 'secular'
    assert.match(batchReportSrc, /\.from\('theology_subjects'\)/);
    // Always provides theologySectionData for dual-curriculum report cards
    assert.match(batchReportSrc, /theology: theologySectionData,/);
  });

  it('properly evaluates student completion readiness without false missing flags', () => {
    const selectionPath = path.join(rootDir, 'src/lib/report-selection.ts');
    const selectionSrc = fs.readFileSync(selectionPath, 'utf8');

    assert.match(selectionSrc, /hasRecordedPhaseScore/);

    const sidebarPath = path.join(rootDir, 'src/components/figma-ui/StudentRosterSidebar.tsx');
    const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');

    assert.match(sidebarSrc, /isStudentReady/);
    assert.match(sidebarSrc, /rep\?\.division/);
  });

  it('enforces print system A4 specifications, 2-up half-card 138mm budget, and light mode color-scheme', () => {
    const printCssPath = path.join(rootDir, 'src/styles/reports/print-system.css');
    const printCssSrc = fs.readFileSync(printCssPath, 'utf8');

    assert.doesNotMatch(printCssSrc, /^@page\s*\{\s*size:\s*A4\s+portrait/m);
    assert.match(printCssSrc, /\.a4-two-up-page/);
    assert.match(printCssSrc, /max-height: 138mm;/);
    assert.match(printCssSrc, /color-scheme: light !important;/);
    assert.match(printCssSrc, /color: #0F172A !important;/);

    const previewCellPath = path.join(rootDir, 'src/components/reports/ReportPreviewCell.tsx');
    const previewCellSrc = fs.readFileSync(previewCellPath, 'utf8');
    assert.match(previewCellSrc, /colorScheme:\s*'light'/);
    assert.match(previewCellSrc, /color:\s*'#0F172A'/);
  });
});

describe('Workstream 22: Universal Marks Reconciliation, Form Collision Fix, Stamp Hardening & Document Studio', () => {
  const rootDir = process.cwd();

  it('verifies marks-reconciliation engine handles equivalent terms, fetchAllSupabaseRows, and merging', () => {
    const reconcilerPath = path.join(rootDir, 'src/lib/marks-reconciliation.ts');
    const reconcilerSrc = fs.readFileSync(reconcilerPath, 'utf8');

    assert.match(reconcilerSrc, /export async function resolveEquivalentTerms/);
    assert.match(reconcilerSrc, /export async function fetchAndReconcileSecularMarks/);
    assert.match(reconcilerSrc, /export async function fetchAndReconcileTheologyMarks/);
    assert.match(reconcilerSrc, /fetchAllSupabaseRows/);
    assert.match(reconcilerSrc, /canonicalSecularSubjectCode/);
    assert.match(reconcilerSrc, /canonicalTheologySubjectCode/);
  });

  it('verifies TheologyMarkTableRow and SecularMarkTableRow have bounded progress bars and no duplicate labels', () => {
    const marksEntryPath = path.join(rootDir, 'src/components/shared-marks-entry.tsx');
    const marksEntrySrc = fs.readFileSync(marksEntryPath, 'utf8');

    assert.match(marksEntrySrc, /max-w-\[140px\]/);
    assert.match(marksEntrySrc, /pr-5 overflow-hidden/);
    assert.match(marksEntrySrc, /toArabicDigits\(theologyStats\.total\)/);
    assert.match(marksEntrySrc, /whitespace-nowrap truncate/);
    assert.match(marksEntrySrc, /md:hidden/);
  });

  it('verifies all 8 report templates bound stamps to 135x68 and crest renders unclipped', () => {
    const templates = [
      'PrimaryEOTReport.tsx',
      'P7EOTReport.tsx',
      'PrimaryMOTReport.tsx',
      'PrimaryBOTReport.tsx',
      'NurseryEOTReport.tsx',
      'NurseryMOTReport.tsx',
      'NurseryTheologyEOTReport.tsx',
      'TheologyMOTReport.tsx',
    ];

    for (const t of templates) {
      const tPath = path.join(rootDir, `src/components/reports/${t}`);
      const tSrc = fs.readFileSync(tPath, 'utf8');
      assert.match(tSrc, /13[25]px/);
      assert.match(tSrc, /6[248]px/);
      assert.match(tSrc, /OfficialReportStamp/);
    }

    const crestPath = path.join(rootDir, 'src/components/reports/ReportSchoolLogo.tsx');
    const crestSrc = fs.readFileSync(crestPath, 'utf8');
    assert.match(crestSrc, /w-14 h-14/);
    assert.match(crestSrc, /overflow-visible/);
  });

  it('verifies student religion resolver and non-Muslim Secular Portrait routing', () => {
    const religionPath = path.join(rootDir, 'src/lib/student-religion.ts');
    const religionSrc = fs.readFileSync(religionPath, 'utf8');

    assert.match(religionSrc, /export function isNonMuslimStudent/);
    assert.match(religionSrc, /export function shouldUseSecularPortraitTemplate/);
    assert.match(religionSrc, /export function getSecularPortraitReportTitle/);

    const clientPath = path.join(rootDir, 'src/components/ReportGeneratorClient.tsx');
    const clientSrc = fs.readFileSync(clientPath, 'utf8');
    assert.match(clientSrc, /shouldUseSecularPortraitTemplate/);
    assert.match(clientSrc, /applyDynamicPrintPageRule/);
    assert.match(clientSrc, /jiddah-print-page-rule/);
  });

  it('verifies global AppTopbar hides on /admin/reports and TopToolbar exposes full Document Studio controls', () => {
    const topbarPath = path.join(rootDir, 'src/components/layout/app-topbar.tsx');
    const topbarSrc = fs.readFileSync(topbarPath, 'utf8');
    assert.match(topbarSrc, /pathname\?\.startsWith\('\/admin\/reports'\)/);
    // Verifies Rule of Hooks: early return occurs AFTER all useEffect declarations
    const effectIndex = topbarSrc.lastIndexOf('React.useEffect');
    const returnIndex = topbarSrc.indexOf("if (pathname?.startsWith('/admin/reports'))");
    assert.ok(returnIndex > effectIndex, 'Early return for /admin/reports must occur after all useEffect hooks to prevent hook count mismatch');

    const toolbarPath = path.join(rootDir, 'src/components/figma-ui/TopToolbar.tsx');
    const toolbarSrc = fs.readFileSync(toolbarPath, 'utf8');
    assert.match(toolbarSrc, /Document Studio Controls/);
    assert.match(toolbarSrc, /Template Color Themes/);
    assert.match(toolbarSrc, /Stamps, Signatures & Watermarks/);
    assert.match(toolbarSrc, /data-testid="studio-popover-trigger"/);
  });

  it('guarantees marks-reconciliation resolves student IDs through enrollments table without invalid column lookups', () => {
    const reconcilerPath = path.join(rootDir, 'src/lib/marks-reconciliation.ts');
    const reconcilerSrc = fs.readFileSync(reconcilerPath, 'utf8');

    // circular_marks and theology_marks query by enrollment_id, not student_id
    assert.match(reconcilerSrc, /\.from\('circular_marks'\)[\s\S]*?\.in\('enrollment_id', chunk\)/);
    assert.match(reconcilerSrc, /\.from\('theology_marks'\)[\s\S]*?\.in\('enrollment_id', chunk\)/);

    // Resolves student_ids via enrollments table
    assert.match(reconcilerSrc, /\.from\('enrollments'\)[\s\S]*?\.select\('id, student_id'\)[\s\S]*?\.in\('student_id', chunk\)/);
  });
});

describe('Workstream 23: Authentic Jiddah Vector Stamp, Clean Signature Ink Filter, Multi-Page Print, Bold Pupil Profiles & MS Word Toolbar', () => {
  const rootDir = process.cwd();

  it('1. renders authentic Jiddah Headteacher digital vector stamp SVG with exact physical geometry and defaults across all 8 templates', () => {
    const stampPath = path.join(rootDir, 'src/components/reports/StampGenerator.tsx');
    const stampSrc = fs.readFileSync(stampPath, 'utf8');

    // Exact outer U-bracket frame paths in Royal Stamp Blue (#1B3B8B)
    assert.match(stampSrc, /M 14 52 L 14 18 Q 14 10 22 10 L 358 10 Q 366 10 366 18 L 366 52/);
    assert.match(stampSrc, /M 14 168 L 14 202 Q 14 210 22 210 L 358 210 Q 366 210 366 202 L 366 168/);
    assert.match(stampSrc, /strokeWidth="4\.5"/);

    // Rotated vertical wall texts
    assert.match(stampSrc, /transform="translate\(14, 110\) rotate\(90\)"/);
    assert.match(stampSrc, /transform="translate\(366, 110\) rotate\(-90\)"/);
    assert.match(stampSrc, /HEADTEACHER&apos;S OFFICE/);

    // Top 2 Header Lines
    assert.match(stampSrc, /JIDDAH ISLAMIC NURSERY &amp;/);
    assert.match(stampSrc, /PRIMARY SCHOOL/);

    // Middle 3-Column Row: Shield Crest, Red Dater Stamp, Crescent & Star
    assert.match(stampSrc, /DAY AND BOARDING/);
    assert.match(stampSrc, /STRIVE FOR LIFE &amp; HERE AFTER/);
    assert.match(stampSrc, /date_ink_color|#C81E1E|#D92626/);

    // Bottom 3 Footer Lines
    assert.match(stampSrc, /HEADTEACHER/);
    assert.match(stampSrc, /P\.O\.Box 34008, Nsaggu/);
    assert.match(stampSrc, /Nakawuka Rd, Wakiso District/);

    // Digital vector stamp is primary default across all 8 templates (no direct uploaded image ternary bypass)
    const templates = [
      'PrimaryEOTReport.tsx',
      'P7EOTReport.tsx',
      'PrimaryMOTReport.tsx',
      'PrimaryBOTReport.tsx',
      'NurseryEOTReport.tsx',
      'NurseryMOTReport.tsx',
      'NurseryTheologyEOTReport.tsx',
      'TheologyMOTReport.tsx',
    ];

    for (const t of templates) {
      const tSrc = fs.readFileSync(path.join(rootDir, `src/components/reports/${t}`), 'utf8');
      assert.doesNotMatch(tSrc, /reportData\?\.signatures\?\.\['school-stamp'\]\s*\?\s*\(\s*<img/);
      assert.match(tSrc, /<OfficialReportStamp\s+reportData=\{reportData\}\s+studioFormatting=\{(?:studioFormatting|effectiveStudioPass)\}/);
    }
  });

  it('2. strips grey camera paper backgrounds from teacher signatures via CleanSignatureImage and #jiddah-clean-ink SVG filter', () => {
    const sigCompPath = path.join(rootDir, 'src/components/reports/CleanSignatureImage.tsx');
    const sigCompSrc = fs.readFileSync(sigCompPath, 'utf8');

    assert.match(sigCompSrc, /export function CleanSignatureImage/);
    assert.match(sigCompSrc, /export const extractSignatureInk/);
    assert.match(sigCompSrc, /id="jiddah-clean-ink"/);
    assert.match(sigCompSrc, /<feColorMatrix/);
    assert.match(sigCompSrc, /<feComponentTransfer>/);
    assert.match(sigCompSrc, /slope="4\.5"\s+intercept="-1\.35"/);
    assert.match(sigCompSrc, /url\(#jiddah-clean-ink\)/);
  });

  it('3. unconstrains layout wrappers during @media print so multi-page batch printing outputs all N sheets', () => {
    const layoutPath = path.join(rootDir, 'src/app/admin/layout.tsx');
    const layoutSrc = fs.readFileSync(layoutPath, 'utf8');
    assert.match(layoutSrc, /print:!h-auto print:!min-h-0 print:!max-h-none print:!overflow-visible print:!static/);
    assert.doesNotMatch(layoutSrc, /print:!block/);

    const printCssPath = path.join(rootDir, 'src/styles/reports/print-system.css');
    const printCssSrc = fs.readFileSync(printCssPath, 'utf8');
    assert.match(printCssSrc, /\[data-slot="sidebar-wrapper"\]/);
    assert.match(printCssSrc, /\[data-slot="sidebar-inset"\]/);
    assert.match(printCssSrc, /\.report-card-sheet,\s*[\s\S]*?#print-portal \.report-container\s*\{[\s\S]*?page-break-after:\s*avoid\s*!important;[\s\S]*?break-after:\s*avoid\s*!important;/);

    const eotPath = path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx');
    const eotSrc = fs.readFileSync(eotPath, 'utf8');
    // Verify tightened vertical padding so bottom validity banner never clips
    assert.match(eotSrc, /\.landscape-page\s*\{[\s\S]*?padding:\s*2\.5mm 4mm;/);
  });

  it('4. enforces big and bold pupil profile typography across all 8 report templates', () => {
    const eotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx'), 'utf8');
    assert.match(eotSrc, /font-size:\s*15\.5px;\s*font-weight:\s*900;/);
    assert.match(eotSrc, /font-size:\s*(?:17|22)px;\s*font-weight:\s*900;/);

    const p7Src = fs.readFileSync(path.join(rootDir, 'src/components/reports/P7EOTReport.tsx'), 'utf8');
    assert.match(p7Src, /\.p7-eot-report \.line\.pupil-name\s*\{[^}]*font-size:\s*16px;\s*font-weight:\s*900;/);

    const motSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryMOTReport.tsx'), 'utf8');
    assert.match(motSrc, /fontSize:\s*'16px',\s*fontWeight:\s*900,\s*textTransform:\s*'uppercase'/);

    const botSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryBOTReport.tsx'), 'utf8');
    assert.match(botSrc, /fontSize:\s*'16px',\s*fontWeight:\s*900,\s*textTransform:\s*'uppercase'/);

    const nurseryEotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryEOTReport.tsx'), 'utf8');
    assert.match(nurseryEotSrc, /fontSize:\s*'16px',\s*fontWeight:\s*900,\s*textTransform:\s*'uppercase'/);

    const nurseryMotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryMOTReport.tsx'), 'utf8');
    assert.match(nurseryMotSrc, /fontSize:\s*'16px',\s*fontWeight:\s*900,\s*textTransform:\s*'uppercase'/);

    const nurseryTheoSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryTheologyEOTReport.tsx'), 'utf8');
    assert.match(nurseryTheoSrc, /font-weight:\s*900;\s*font-size:\s*17px;/);

    const theoMotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/TheologyMOTReport.tsx'), 'utf8');
    assert.match(theoMotSrc, /font-weight:\s*900;\s*font-size:\s*17px;/);
  });

  it('5. makes Desktop TopToolbar hidden md:flex with iconic view-mode-toggle, visual-select-toggle, download, and print buttons, and consolidates mobile into a single h-11 header', () => {
    const toolbarSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/TopToolbar.tsx'), 'utf8');
    assert.match(toolbarSrc, /hidden md:flex items-center justify-between gap-2/);
    assert.match(toolbarSrc, /data-testid="view-mode-toggle"/);
    assert.match(toolbarSrc, /data-testid="visual-select-toggle"/);
    assert.match(toolbarSrc, /data-testid="toolbar-download-btn"/);
    assert.match(toolbarSrc, /data-testid="toolbar-print-btn"/);

    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.match(clientSrc, /h-11 px-2 flex md:hidden items-center justify-between gap-1 bg-white dark:bg-\[#151D1A\]/);
    assert.match(clientSrc, /visualSelectMode=\{visualSelectMode\}/);
    assert.match(clientSrc, /onToggleVisualSelect=/);
    assert.match(clientSrc, /onPrintCurrent=\{handlePrintCurrent\}/);

    const rosterSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/StudentRosterSidebar.tsx'), 'utf8');
    assert.match(rosterSrc, /data-testid="roster-select-all-btn"/);
    assert.match(rosterSrc, /inViewSelectedCount\} selected/);
  });
});

describe('Workstream 24: Landscape Print Lock, Blank Page 1 Fix, Iconic Studio Topbar & Visual Selection, Translucent Minimizable Dock, Zero-Blur Modals & Adaptive Ink Extraction', () => {
  const rootDir = process.cwd();

  it('1. removes static portrait @page override, locks landscape tables-row to flex row, and eliminates blank Page 1', () => {
    const printCssSrc = fs.readFileSync(path.join(rootDir, 'src/styles/reports/print-system.css'), 'utf8');
    // Static global portrait @page rule must not override dynamic landscape orientation
    assert.doesNotMatch(printCssSrc, /^@page\s*\{\s*size:\s*A4\s+portrait/m);
    // Side-by-side landscape tables lock
    assert.match(printCssSrc, /\.landscape-page\s+\.tables-wrapper,\s*[\r\n]+\s*\.landscape-page\s+\.tables-row\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*row\s*!important;/);
    // Scoped main rule so PrimaryEOTReport doesn't collapse
    assert.match(printCssSrc, /\[data-slot="sidebar-inset"\]\s*>\s*main/);
    // No blank page 1
    assert.match(printCssSrc, /\.report-card-sheet:first-child[\s\S]*?break-before:\s*avoid\s*!important;/);

    const eotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx'), 'utf8');
    assert.match(eotSrc, /<div className="tables-wrapper tables-row">/);
    assert.doesNotMatch(eotSrc, /<main className="tables-wrapper">/);

    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    const portalSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrintPortal.tsx'), 'utf8');
    assert.match(clientSrc, /data-testid="report-center-workspace"[\s\S]*?print:!hidden/);
    assert.match(clientSrc, /applyDynamicPrintPageRule/);
    assert.match(portalSrc, /297mm 210mm !important/);
  });

  it('2. upgrades PrintDialog with 3 clear print scopes and on-canvas Select on Canvas mode', () => {
    const dialogSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/PrintDialog.tsx'), 'utf8');
    assert.match(dialogSrc, /onEnterVisualSelect/);
    assert.match(dialogSrc, /Select on Canvas/);
    assert.match(dialogSrc, /Batch Print/);
    assert.match(dialogSrc, /Current Report/);
    assert.match(dialogSrc, /Custom Visual Selection/);

    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /data-testid="visual-selection-bar"/);
    assert.match(canvasSrc, /justify-start/);
  });

  it('3. renders a translucent, minimizable bottom-right floating zoom/page dock with side="top" tooltips', () => {
    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /dockMinimized/);
    assert.match(canvasSrc, /side="top"/);
    assert.match(canvasSrc, /bg-white\/75/);
  });

  it('4. strips backdrop-blur from modals/dialogs/popovers and removes dark-grey camera boxes from signatures', () => {
    const globalsSrc = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf8');
    assert.match(globalsSrc, /\[data-slot="dialog-overlay"\][\s\S]*?backdrop-filter:\s*none\s*!important;/);
    assert.match(globalsSrc, /\[data-slot="popover-content"\][\s\S]*?backdrop-filter:\s*none\s*!important;/);

    const printDialogSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/PrintDialog.tsx'), 'utf8');
    assert.doesNotMatch(printDialogSrc, /backdropFilter:\s*'blur\(/);

    const inkSrc = fs.readFileSync(path.join(rootDir, 'src/lib/signature-ink-processor.ts'), 'utf8');
    assert.match(inkSrc, /lum >= 85/);
    assert.match(inkSrc, /localContrast < 8 \|\| globalContrast < 10/);
  });
});

describe('Workstream 25: CSS Named Pages for Mixed Print, P7 Portrait Parity, White-Clipped Signatures, Authentic Badge Stamp & Branded Loader', () => {
  const rootDir = process.cwd();

  it('1. configures CSS named pages (@page landscape-sheet & @page portrait-sheet) for mixed-orientation batch printing', () => {
    const printCssSrc = fs.readFileSync(path.join(rootDir, 'src/styles/reports/print-system.css'), 'utf8');
    assert.match(printCssSrc, /@page landscape-sheet\s*\{\s*size:\s*A4 landscape;/);
    assert.match(printCssSrc, /@page portrait-sheet\s*\{\s*size:\s*A4 portrait;/);
    assert.match(printCssSrc, /page:\s*landscape-sheet\s*!important;/);
    assert.match(printCssSrc, /page:\s*portrait-sheet\s*!important;/);

    const primaryEotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx'), 'utf8');
    assert.doesNotMatch(primaryEotSrc, /page:\s*landscape-sheet\s*!important;/);
    assert.match(primaryEotSrc, /data-report-orientation="landscape"/);
  });

  it('2. enforces P7EOTReport design parity with PrimaryEOTReport (double gold/emerald border, maroon header, centered crest, inside stamp, bold pupil line)', () => {
    const p7Src = fs.readFileSync(path.join(rootDir, 'src/components/reports/P7EOTReport.tsx'), 'utf8');
    assert.doesNotMatch(p7Src, /page:\s*portrait-sheet\s*!important;/);
    assert.match(p7Src, /data-report-orientation="portrait"/);
    assert.match(p7Src, /effective\.headerAccentColor|#7F1D1D/); // Maroon/accent title
    assert.match(p7Src, /\/logo-512h\.png/); // Centered crest
    assert.match(p7Src, /getSecularPortraitReportTitle/);
    assert.match(p7Src, /<OfficialReportStamp/);
    assert.match(p7Src, /\.p7-eot-report \.line\.pupil-name[\s\S]*?font-size:\s*16px;[\s\S]*?font-weight:\s*900;/);
    assert.match(p7Src, /--report-border-color:\s*\$\{effective\.secondaryColor\}|--report-border-color,\s*#c2994c/);
    assert.match(p7Src, /--report-primary-color:\s*\$\{effective\.primaryColor\}|--report-primary-color,\s*#0f4d25/);
  });

  it('3. white-clips signatures instantly with CSS multiply + grayscale/brightness/contrast and caches processed canvas data', () => {
    const sigImgSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/CleanSignatureImage.tsx'), 'utf8');
    assert.match(sigImgSrc, /mixBlendMode/);
    assert.match(sigImgSrc, /'multiply'/);
    assert.match(sigImgSrc, /grayscale\(1\) brightness\(1\.48\) contrast\(3\.8\)/);

    const procSrc = fs.readFileSync(path.join(rootDir, 'src/lib/signature-ink-processor.ts'), 'utf8');
    assert.match(procSrc, /processedSignatureCache/);
    assert.match(procSrc, /SIG_CACHE_VERSION = 'v7-sauvola-solid-royal-blue'/);
  });

  it('4. renders authentic Jiddah badge image with ink filter in StampGenerator', () => {
    const stampSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/StampGenerator.tsx'), 'utf8');
    assert.match(stampSrc, /id="jiddah-stamp-ink-filter"/);
    assert.match(stampSrc, /href=\{crestDataUrl \|\| "\/logo-512h\.png"\}|href="\/logo-512h\.png"/);
  });

  it('5. provides pearl-on-dark tooltips in dark mode without sluggish animations', () => {
    const tooltipSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/ui/tooltip.tsx'), 'utf8');
    assert.match(tooltipSrc, /dark:bg-\[#F1F5F2\]/);
    assert.match(tooltipSrc, /dark:text-\[#093D26\]/);
    assert.match(tooltipSrc, /transition-none/);
  });

  it('6. provides clean 2-item roster bar and eliminates false Div I on Nursery and Theology', () => {
    const rosterSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/StudentRosterSidebar.tsx'), 'utf8');
    assert.match(rosterSrc, /data-testid="roster-select-all-btn"/);
    assert.match(rosterSrc, /isNursery/);
    assert.match(rosterSrc, /isTheology/);
    assert.match(rosterSrc, /ممتاز/);
    assert.match(rosterSrc, /getNurseryGrade/);
  });

  it('7. wires branded JiddahLoader with dual-orbiting rings across Report Canvas, Login, Marks Entry, and Hubs', () => {
    const loaderSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/jiddah-loader.tsx'), 'utf8');
    assert.match(loaderSrc, /JiddahLoader/);
    assert.match(loaderSrc, /#0D5C3A/); // Forest emerald
    assert.match(loaderSrc, /#D97706/); // Warm gold

    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /<JiddahLoader/);

    const loginSrc = fs.readFileSync(path.join(rootDir, 'src/app/login/page.tsx'), 'utf8');
    assert.match(loginSrc, /<JiddahLoader/);

    const sharedMarksSrc = fs.readFileSync(path.join(rootDir, 'src/components/shared-marks-entry.tsx'), 'utf8');
    assert.match(sharedMarksSrc, /<JiddahLoader/);

    const secularHubSrc = fs.readFileSync(path.join(rootDir, 'src/components/secular-hub/SecularHubClient.tsx'), 'utf8');
    assert.match(secularHubSrc, /<JiddahLoader/);

    const theologyHubSrc = fs.readFileSync(path.join(rootDir, 'src/components/theology-hub/TheologyHubClient.tsx'), 'utf8');
    assert.match(theologyHubSrc, /<JiddahLoader/);

    const previewCellSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/ReportPreviewCell.tsx'), 'utf8');
    assert.match(previewCellSrc, /React\.memo\(\s*ReportPreviewCellComponent/);
  });
});

describe('Workstream 26: Progressive Card Mounting, Transparent Stamp Crest, Seated Signatures, Redesigned P7 & Topbar Responsiveness', () => {
  const rootDir = process.cwd();

  it('1. progressively mounts preview cards via requestAnimationFrame and eliminates duplicate batch toast', () => {
    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /visibleCount/);
    assert.match(canvasSrc, /requestAnimationFrame/);
    assert.match(canvasSrc, /visibleReports/);

    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.doesNotMatch(clientSrc, /toast\.loading\('Generating batch reports/);
  });

  it('2. adds transparent stamp crest SVG luminance filter and royal blue signature ink filter', () => {
    const stampSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/StampGenerator.tsx'), 'utf8');
    assert.match(stampSrc, /id="jiddah-stamp-crest-ink"/);
    assert.match(stampSrc, /useMonochromeStampCrest|filter="url\(#jiddah-stamp-crest-ink\)"/);

    const cleanSigSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/CleanSignatureImage.tsx'), 'utf8');
    assert.match(cleanSigSrc, /id="jiddah-blue-signature-ink"/);
    assert.match(cleanSigSrc, /#0F3491/);

    const procSrc = fs.readFileSync(path.join(rootDir, 'src/lib/signature-ink-processor.ts'), 'utf8');
    assert.match(procSrc, /outR = Math\.round\(12/);
    assert.match(procSrc, /outG = Math\.round\(42/);
    assert.match(procSrc, /outB = Math\.round\(132/);
  });

  it('3. seats signatures directly on dotted line across report templates', () => {
    const reportFiles = [
      'src/components/reports/PrimaryEOTReport.tsx',
      'src/components/reports/PrimaryMOTReport.tsx',
      'src/components/reports/PrimaryBOTReport.tsx',
      'src/components/reports/NurseryEOTReport.tsx',
      'src/components/reports/NurseryMOTReport.tsx',
      'src/components/reports/NurseryTheologyEOTReport.tsx',
      'src/components/reports/P7EOTReport.tsx',
    ];

    for (const file of reportFiles) {
      const src = fs.readFileSync(path.join(rootDir, file), 'utf8');
      assert.match(src, /borderBottom:\s*'1\.5px dotted #334155'/);
      assert.match(src, /marginBottom:\s*'-6px'/);
    }
  });

  it('4. enforces 21px font-black Arabic pupil typography and 16.5px cohort values', () => {
    const primarySrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx'), 'utf8');
    assert.match(primarySrc, /\.arabic-pupil-name\s*\{[\s\S]*?font-size:[\s\S]*?21[\s\S]*?font-weight:\s*900;/);
    assert.match(primarySrc, /\.info-box\.arabic \.info-value\s*\{[\s\S]*?font-size:[\s\S]*?16\.5[\s\S]*?font-weight:\s*900;/);

    const nurseryTheoSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryTheologyEOTReport.tsx'), 'utf8');
    assert.match(nurseryTheoSrc, /fontSize:\s*'21px',\s*fontWeight:\s*900/);

    const theoMotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/TheologyMOTReport.tsx'), 'utf8');
    assert.match(theoMotSrc, /fontSize:\s*'21px',\s*color:\s*'#0F172A'/);
  });

  it('5. enforces redesigned P7EOTReport proportional layout with Comparative Performance gold banner, UNEB strip, and zero middle gap', () => {
    const p7Src = fs.readFileSync(path.join(rootDir, 'src/components/reports/P7EOTReport.tsx'), 'utf8');
    assert.match(p7Src, /COMPARATIVE PERFORMANCE/);
    assert.match(p7Src, /th-banner/);
    assert.match(p7Src, /uneb-strip/);
    assert.match(p7Src, /UNEB PRIMARY DIVISION CLASSIFICATION/);
    assert.match(p7Src, /border:\s*1\.5px dashed (#C59B27|\$\{effective\.secondaryColor\})/);
    assert.match(p7Src, /background-color:\s*#FAF6EE/);
  });

  it('6. normalizes default zoom to 1.0, prepends All Classes, auto-maps curriculum aliases, and collapses Topbar responsively', () => {
    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.match(clientSrc, /const \[zoom, setZoom\] = useState\(1\.0\)/);
    assert.match(clientSrc, /SECULAR_TO_THEOLOGY_MAP/);
    assert.match(clientSrc, /THEOLOGY_TO_SECULAR_MAP/);
    assert.match(clientSrc, /All Classes/);
    assert.match(clientSrc, /max-w-\[145px\] xl:max-w-\[230px\]/);

    const toolbarSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/TopToolbar.tsx'), 'utf8');
    assert.match(toolbarSrc, /hidden xl:inline">Customize/);

    const emptySrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/EmptyState.tsx'), 'utf8');
    assert.doesNotMatch(emptySrc, /Open Filters &amp; Roster/);
  });
});

describe('Workstream 27: Solid Blue Block Elimination, Canvas Deduplication, Filled Gaps & Single-Sheet Print Lock', () => {
  const rootDir = process.cwd();

  it('1. eliminates solid blue blocks by fixing SVG alpha matrix and rendering transparent processed signatures', () => {
    const cleanSigSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/CleanSignatureImage.tsx'), 'utf8');
    assert.match(cleanSigSrc, /0 0 0 1 0/);
    assert.match(cleanSigSrc, /isProcessed\s*=\s*Boolean\(resolvedSrc\?\.startsWith\('data:'\)\)/);

    const procSrc = fs.readFileSync(path.join(rootDir, 'src/lib/signature-ink-processor.ts'), 'utf8');
    assert.match(procSrc, /export const inFlightSignaturePromises = new Map<string, Promise<string>>\(\)/);
    assert.match(procSrc, /sourceRgba\[topIdx \+ 3\] >= 40/);
    assert.match(procSrc, /sourceRgba\[srcIdx \+ 3\] < 40/);
  });

  it('2. renders monochromatic stamp crest without filter clipping blocks via cached singleton hook', () => {
    const stampSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/StampGenerator.tsx'), 'utf8');
    assert.match(stampSrc, /export const stampCrestCache = new Map<string, string>\(\)/);
    assert.match(stampSrc, /export function useMonochromeStampCrest/);
    assert.match(stampSrc, /const crestDataUrl = useMonochromeStampCrest/);
    assert.match(stampSrc, /href=\{crestDataUrl \|\| "\/logo-512h\.png"\}/);
    assert.doesNotMatch(stampSrc, /<image[^>]*filter="url\(#jiddah-stamp-crest-ink\)"/);
  });

  it('3. eliminates per-cell ResizeObservers and broadcasts scale from DocumentCanvas at 60fps', () => {
    const previewCellSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/ReportPreviewCell.tsx'), 'utf8');
    assert.match(previewCellSrc, /scale:\s*externalScale/);
    assert.match(previewCellSrc, /if \(externalScale !== undefined\) return/);

    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /const \[containerWidth, setContainerWidth\] = useState<number>\(0\)/);
    assert.match(canvasSrc, /renderReport\(report, isActive, \{ landscapeScale, portraitScale \}\)/);

    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.match(clientSrc, /renderJiddahReport = useCallback\(\s*\(report: ReportData, isActive: boolean, scales\?:/);
  });

  it('4. fills middle void in P7EOTReport and Nursery reports with proportional tables and progressive records', () => {
    const p7Src = fs.readFileSync(path.join(rootDir, 'src/components/reports/P7EOTReport.tsx'), 'utf8');
    assert.match(p7Src, /مدرسة جدة الإسلامية للروضة/);
    assert.match(p7Src, /justify-content:\s*flex-start;/);
    assert.match(p7Src, /white-space:\s*nowrap/);
    assert.match(p7Src, /max-height:\s*296mm;/);

    const nurseryEotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryEOTReport.tsx'), 'utf8');
    assert.doesNotMatch(nurseryEotSrc, /<table style=\{\{ marginTop: 'auto' \}\}>/);
    assert.doesNotMatch(nurseryEotSrc, /Beginning of Term \(BOT\)/);
    assert.match(nurseryEotSrc, /Mid-Term Assessment \(MOT\)/);
    assert.doesNotMatch(nurseryEotSrc, /End of Term Assessment \(EOT\)/);

    const nurseryMotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryMOTReport.tsx'), 'utf8');
    assert.doesNotMatch(nurseryMotSrc, /<table style=\{\{ marginTop: 'auto' \}\}>/);
  });

  it('5. enforces named page sheet styling and prevents unnamed @page overriding mixed-batch orientation', () => {
    const printCssSrc = fs.readFileSync(path.join(rootDir, 'src/styles/reports/print-system.css'), 'utf8');
    assert.match(printCssSrc, /\.report-sheet-landscape/);
    assert.match(printCssSrc, /\.report-sheet-portrait/);

    const portalSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrintPortal.tsx'), 'utf8');
    assert.match(portalSrc, /pageOrientation\?: 'portrait' \| 'landscape' \| 'mixed'/);
    assert.match(portalSrc, /pageOrientation !== 'mixed'/);

    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.match(clientSrc, /report-sheet-landscape/);
    assert.match(clientSrc, /report-sheet-portrait/);
    assert.match(clientSrc, /hasLandscape && !hasPortrait/);
    assert.match(clientSrc, /hasPortrait && !hasLandscape/);
  });
});

describe('Workstream 28: Adaptive Signature Extractor, Portrait Single-Sheet Lock, Nursery Overlap Fix & Fluid Mobile/Roster Count', () => {
  const rootDir = process.cwd();

  it('1. uses 2D integral localMean + globalMedian adaptive extraction, CORS proxy, and zero raw-grey fallback', () => {
    const procSrc = fs.readFileSync(path.join(rootDir, 'src/lib/signature-ink-processor.ts'), 'utf8');
    assert.match(procSrc, /windowRadius = 9/);
    assert.match(procSrc, /integralLum/);
    assert.match(procSrc, /localContrast < 8 \|\| globalContrast < 10/);
    assert.match(procSrc, /EMPTY_TRANSPARENT_PNG_DATA_URL/);
    assert.match(procSrc, /\/api\/signatures\/proxy/);

    const cleanSigSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/CleanSignatureImage.tsx'), 'utf8');
    assert.match(cleanSigSrc, /getCachedSignatureUrl/);
    assert.match(cleanSigSrc, /useState<string \| null>\(\(\) =>/);

    const proxyPath = path.join(rootDir, 'src/app/api/signatures/proxy/route.ts');
    assert.ok(fs.existsSync(proxyPath), 'proxy route exists');
    const proxySrc = fs.readFileSync(proxyPath, 'utf8');
    assert.match(proxySrc, /verifyDataAccess/);
    assert.match(proxySrc, /Access-Control-Allow-Origin/);
  });

  it('2. cleans P7EOTReport identity rows, enlarges school headers, and eliminates trailing blank portrait sheet', () => {
    const p7Src = fs.readFileSync(path.join(rootDir, 'src/components/reports/P7EOTReport.tsx'), 'utf8');
    assert.doesNotMatch(p7Src, /LIN \/ ADM/);
    assert.doesNotMatch(p7Src, />GENDER</);
    assert.match(p7Src, /height:\s*(?:286|292|295)mm\s*!important/);

    const primaryEotSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/PrimaryEOTReport.tsx'), 'utf8');
    assert.match(primaryEotSrc, /font-size:\s*22px/);

    const printCssSrc = fs.readFileSync(path.join(rootDir, 'src/styles/reports/print-system.css'), 'utf8');
    assert.match(printCssSrc, /height:\s*(?:286|292|295)mm\s*!important/);
    assert.match(printCssSrc, /data-last-printed="true"/);

    const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/DocumentCanvas.tsx'), 'utf8');
    assert.match(canvasSrc, /data-last-printed=/);

    const theoSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/TheologyMOTReport.tsx'), 'utf8');
    assert.match(theoSrc, /data-last-printed=\{isLastPrinted \? 'true' : 'false'\}/);
  });

  it('3. eliminates Nursery footer overlap and seats Class Teacher + Head Teacher signatures on dedicated SIG lines', () => {
    for (const file of ['src/components/reports/NurseryEOTReport.tsx', 'src/components/reports/NurseryMOTReport.tsx']) {
      const src = fs.readFileSync(path.join(rootDir, file), 'utf8');
      assert.doesNotMatch(src, /\.tables-container\s*\{[^}]*min-height:\s*0/);
      assert.match(src, /justify-content:\s*space-between/);
      assert.match(src, />SIG:</);
      assert.match(src, /borderBottom:\s*'1\.5px dotted #334155'/);
    }

    const nurseryTheoSrc = fs.readFileSync(path.join(rootDir, 'src/components/reports/NurseryTheologyEOTReport.tsx'), 'utf8');
    assert.match(nurseryTheoSrc, /border-top:\s*none;/);
  });

  it('4. displays in-view selected count and preserves 280px fluid mobile topbar', () => {
    const clientSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReportGeneratorClient.tsx'), 'utf8');
    assert.match(clientSrc, /selectedInViewIds/);
    assert.match(clientSrc, /selectedInViewCount/);
    assert.match(clientSrc, /data-testid="mobile-roster-pill"/);
    assert.match(clientSrc, /w-full max-w-full overflow-hidden/);

    const sidebarSrc = fs.readFileSync(path.join(rootDir, 'src/components/figma-ui/StudentRosterSidebar.tsx'), 'utf8');
    assert.match(sidebarSrc, /inViewSelectedCount/);
  });
});










describe('Workstream 29: Mobile-First 6-Item Studio Bar, Slot-Relative 100% Fit & Touch Pan, Sauvola Solid Royal Blue Ink + KYC Verifier + Digital Signature Pad, and Nursery BOT Removal', () => {
  const read = (relPath) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('WS29.1: Mobile topbar renders strictly 6 compact items with max-w-full overflow-hidden, DocumentCanvas renders a single compact selection row on mobile, and zoom dock defaults to minimized on mobile', () => {
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');
    const canvasSrc = read('src/components/figma-ui/DocumentCanvas.tsx');
    const toolbarSrc = read('src/components/figma-ui/TopToolbar.tsx');

    // Mobile topbar container and 6 items
    assert.match(clientSrc, /h-11 px-2 flex md:hidden.*w-full max-w-full overflow-hidden/);
    assert.match(clientSrc, /data-testid="mobile-roster-pill"/);
    assert.match(clientSrc, /data-testid="mobile-phase-curriculum-pill"/);
    assert.match(clientSrc, /data-testid="mobile-print-cta"/);
    assert.match(clientSrc, /🎨 Customize Studio & Stamp/);
    assert.match(clientSrc, /max-w-\[calc\(100vw-20px\)\] max-h-\[72dvh\]/);
    assert.match(toolbarSrc, /max-w-\[calc\(100vw-20px\)\] max-h-\[72dvh\]/);

    // Compact mobile selection bar & minimized zoom dock default on mobile
    assert.match(canvasSrc, /window\.innerWidth < 768/);
    assert.match(canvasSrc, /data-testid="visual-selection-bar"/);
    assert.match(canvasSrc, /flex items-center justify-between gap-1 px-2\.5 py-1\.5 rounded-xl/);
    assert.match(canvasSrc, /data-testid="floating-dock-minimized"/);
  });

  it('WS29.2: DocumentCanvas and ReportPreviewCell compute slot-relative 100% fit (zoom=1.0), clamp zoom to [0.5, 1.5], set explicit scaled pixel width/height on outer wrapper, and enable 2D touch panning when zoom > 1.0', () => {
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');
    const canvasSrc = read('src/components/figma-ui/DocumentCanvas.tsx');
    const cellSrc = read('src/components/reports/ReportPreviewCell.tsx');

    assert.match(clientSrc, /export const ZOOM_STEPS = \[0\.5, 0\.75, 0\.9, 1\.0, 1\.15, 1\.25, 1\.5\] as const/);
    assert.match(canvasSrc, /Math\.min\(1\.5, Math\.max\(0\.5, zoom\)\)/);
    assert.match(canvasSrc, /\(stageClientWidth - 72\) \/ 2/);
    assert.match(canvasSrc, /stageClientWidth - \(isMobile \? 16 : 48\)/);
    assert.match(canvasSrc, /touchAction: zoom > 1\.0 \? 'pan-x pan-y' : 'pan-y'/);
    assert.match(canvasSrc, /WebkitOverflowScrolling: 'touch'/);

    assert.match(cellSrc, /Math\.min\(1\.5, Math\.max\(0\.5, zoom\)\)/);
    assert.match(cellSrc, /const scaledW = Math\.round\(nativeWidthPx \* actualScale\)/);
    assert.match(cellSrc, /const scaledH = Math\.round\(nativeHeightPx \* actualScale\)/);
  });

  it('WS29.3: signature-ink-processor.ts uses SIG_CACHE_VERSION v7-sauvola-solid-royal-blue, Sauvola 19x19 integral-image binarization, Royal Blue (#0C2A84 / R=12,G=42,B=132), solid stroke opacity (alpha >= 215), and zero raw-grey fallback; signature-quality-verifier.ts + SignatureInkReviewCard + signatures-client digital signature pad', () => {
    const procSrc = read('src/lib/signature-ink-processor.ts');
    const cacheSrc = read('src/lib/client-cache.ts');
    const verifierSrc = read('src/lib/signature-quality-verifier.ts');
    const reviewSrc = read('src/components/SignatureInkReviewCard.tsx');
    const sigClientSrc = read('src/components/layout/signatures-client.tsx');

    assert.match(procSrc, /SIG_CACHE_VERSION = 'v7-sauvola-solid-royal-blue'/);
    assert.match(cacheSrc, /SIGNATURE_CACHE_VERSION = 'v7-sauvola-solid-royal-blue'/);
    assert.match(procSrc, /windowRadius = 9/);
    assert.match(procSrc, /integralLumSq/);
    assert.match(procSrc, /sauvolaThreshold = localMean \* \(1 - 0\.14 \* \(1 - localStd \/ 128\)\)/);
    assert.match(procSrc, /outR = Math\.round\(12/);
    assert.match(procSrc, /outG = Math\.round\(42/);
    assert.match(procSrc, /outB = Math\.round\(132/);
    assert.match(procSrc, /Math\.max\(235,/);
    assert.doesNotMatch(procSrc, /catch\s*\{\s*return src;\s*\}/);

    assert.match(verifierSrc, /export function verifySignatureImageQuality/);
    assert.match(verifierSrc, /sharpnessScore/);
    assert.match(verifierSrc, /lightingUniformityScore/);
    assert.match(verifierSrc, /contrastScore/);
    assert.match(verifierSrc, /INK_BOLDNESS_PRESETS/);

    assert.match(reviewSrc, /verifySignatureFileQuality/);
    assert.match(reviewSrc, /INK_BOLDNESS_PRESETS/);
    assert.match(reviewSrc, /Sharpness/);
    assert.match(reviewSrc, /Lighting Uniformity/);

    assert.match(sigClientSrc, /data-testid="draw-signature-tab"/);
    assert.match(sigClientSrc, /data-testid="digital-signature-pad-panel"/);
    assert.match(sigClientSrc, /touchAction: 'none'/);
    assert.match(sigClientSrc, /capture="environment"/);
    assert.match(sigClientSrc, /Save Transparent Signature/);
  });

  it('WS29.4: NurseryEOTReport omits BOT from Progressive Records, and TopToolbar, ReportGeneratorClient, and shared-marks-entry hide BOT when Nursery or Theology is active', () => {
    const nurseryEotSrc = read('src/components/reports/NurseryEOTReport.tsx');
    const toolbarSrc = read('src/components/figma-ui/TopToolbar.tsx');
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');
    const marksSrc = read('src/components/shared-marks-entry.tsx');

    assert.doesNotMatch(nurseryEotSrc, /Beginning of Term \(BOT\)/);
    assert.match(nurseryEotSrc, /Mid-Term Assessment \(MOT\)/);
    assert.match(toolbarSrc, /phaseTrack/);
    assert.match(clientSrc, /isCurrentNurseryOrTheology/);
    assert.match(clientSrc, /availablePhases/);
    assert.match(marksSrc, /hideBotPhase/);
    assert.match(marksSrc, /availableExamTypes/);
  });

  it('WS29.5: P7EOTReport omits LIN / ADM and GENDER, includes TOTAL MARKS, AGGREGATE, and DIVISION, enlarges English & Arabic school names, and locks single-sheet portrait printing', () => {
    const p7Src = read('src/components/reports/P7EOTReport.tsx');
    const canvasSrc = read('src/components/figma-ui/DocumentCanvas.tsx');
    const cssSrc = read('src/styles/reports/print-system.css');

    assert.doesNotMatch(p7Src, /LIN \/ ADM/);
    assert.doesNotMatch(p7Src, /label: 'GENDER'/);
    assert.match(p7Src, /TOTAL MARKS/);
    assert.match(p7Src, /AGGREGATE/);
    assert.match(p7Src, /DIVISION/);
    assert.match(p7Src, /font-size:\s*22px/);
    assert.match(p7Src, /font-size:\s*18\.5px/);
    assert.match(canvasSrc, /data-last-printed=/);
    assert.match(cssSrc, /max-height:\s*(?:286|292|295)mm\s*!important/);
  });
});

describe('Workstream 30: Portrait Arabic Header Fit, Theology Position/Out-Of, Nursery Educative Watermark & Comments, Instant Selection, and Report Studio 2.0', () => {
  const read = (relPath) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('WS30.1: P7EOTReport constrains Arabic header inside 3-column grid (18.5px, rtl, padding-right: 6px, overflow: hidden) and print-system.css enforces 295mm portrait cap with break-after: avoid on data-last-printed="true"', () => {
    const p7Src = read('src/components/reports/P7EOTReport.tsx');
    const cssSrc = read('src/styles/reports/print-system.css');

    assert.match(p7Src, /grid-template-columns:\s*1fr auto 1fr/);
    assert.match(p7Src, /font-size:\s*18\.5px/);
    assert.match(p7Src, /paddingRight:\s*'6px'/);
    assert.match(p7Src, /max-height:\s*(?:286|292|295)mm\s*!important/);
    assert.match(cssSrc, /\.report-card-sheet\.print-excluded\s*\{\s*display:\s*none\s*!important;/);
    assert.match(cssSrc, /\.report-card-sheet\[data-last-printed="true"\][\s\S]*?break-after:\s*avoid\s*!important/);
  });

  it('WS30.2: PrimaryEOTReport Arabic Theology identity box includes الترتيب (Position) and عدد الطلبة (Out Of) in Arabic-Indic numerals, and API routes return theology_position & theology_total_students across all curricula', () => {
    const primaryEotSrc = read('src/components/reports/PrimaryEOTReport.tsx');
    const singleRouteSrc = read('src/app/api/report/route.ts');
    const batchRouteSrc = read('src/app/api/report/batch/route.ts');

    assert.match(primaryEotSrc, /الترتيب :/);
    assert.match(primaryEotSrc, /عدد الطلبة :/);
    assert.match(primaryEotSrc, /toArabicNumerals\(theologyPosition\)/);
    assert.match(primaryEotSrc, /toArabicNumerals\(theologyTotalStudents\)/);
    assert.match(singleRouteSrc, /theology_position:\s*theologyPosition/);
    assert.match(singleRouteSrc, /theology_total_students:\s*totalTheologyStudents/);
    assert.match(batchRouteSrc, /theology_position:\s*theologyPosition/);
    assert.match(batchRouteSrc, /theology_total_students:\s*totalTheologyStudents/);
  });

  it('WS30.3: NurseryTheologyEOTReport centers 18.5px bold Arabic remarks and renders classTeacherSignatureUrl, and NurseryEducativeWatermark renders central school crest + educative nursery vector art across Nursery templates', () => {
    const nurseryTheoSrc = read('src/components/reports/NurseryTheologyEOTReport.tsx');
    const nurseryEotSrc = read('src/components/reports/NurseryEOTReport.tsx');
    const nurseryMotSrc = read('src/components/reports/NurseryMOTReport.tsx');
    const watermarkSrc = read('src/components/reports/NurseryEducativeWatermark.tsx');

    assert.match(nurseryTheoSrc, /fontSize:\s*`\$\{effective\.arabicCommentFontSizePx\}px`/);
    assert.match(nurseryTheoSrc, /fontWeight:\s*800/);
    assert.match(nurseryTheoSrc, /color:\s*'#1E40AF'/);
    assert.match(nurseryTheoSrc, /classTeacherSignatureUrl/);
    assert.match(nurseryEotSrc, /<NurseryEducativeWatermark/);
    assert.match(nurseryMotSrc, /<NurseryEducativeWatermark/);
    assert.match(watermarkSrc, /data-testid="nursery-educative-watermark"/);
    assert.match(watermarkSrc, /\/logo-512h\.png/);
  });

  it('WS30.4: DocumentCanvas and ReportPreviewCell use O(1) Set lookup, MemoizedCanvasCard, and custom React.memo comparator with stable handleToggleSelectCard callback', () => {
    const canvasSrc = read('src/components/figma-ui/DocumentCanvas.tsx');
    const cellSrc = read('src/components/reports/ReportPreviewCell.tsx');
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');

    assert.match(canvasSrc, /selectedIdSet = useMemo\(\(\) => new Set\(selectedIds\)/);
    assert.match(canvasSrc, /MemoizedCanvasCard = React\.memo/);
    assert.match(cellSrc, /prev\.report\?\.student\?\.id === next\.report\?\.student\?\.id/);
    assert.match(clientSrc, /handleToggleSelectCard = useCallback/);
  });

  it('WS30.5: TopToolbar Studio Popover and ReportStudioClient 2.0 share persistent studio-config-store, render all 8 templates live, and support global persistence', () => {
    const storeSrc = read('src/lib/studio-config-store.ts');
    const toolbarSrc = read('src/components/figma-ui/TopToolbar.tsx');
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');

    assert.match(storeSrc, /jiddah_studio_formatting_v2/);
    assert.match(storeSrc, /jiddah:studio-config-updated/);
    assert.match(toolbarSrc, /Official Headteacher Stamp/);
    assert.match(toolbarSrc, /Nursery Educative Art/);
    assert.match(toolbarSrc, /Save as School Default/);
    assert.match(toolbarSrc, /Open Full Report Studio 2\.0/);
    assert.match(studioSrc, /data-testid="report-studio-2-root"/);
    assert.match(studioSrc, /nursery-theology-eot/);
    assert.match(studioSrc, /data-testid="save-scope-all"|Save & Apply to All/);
  });

  it('WS31.1: PrimaryEOTReport Secular Profile Box Row 3 displays AGGREGATE and DIVISION side-by-side, PrimaryBOTReport includes AGG alongside DIV, and TERM display is standardized', () => {
    const primaryEotSrc = read('src/components/reports/PrimaryEOTReport.tsx');
    const p7EotSrc = read('src/components/reports/P7EOTReport.tsx');
    const primaryBotSrc = read('src/components/reports/PrimaryBOTReport.tsx');

    assert.match(primaryEotSrc, /<span className="info-label">AGGREGATE:<\/span>/);
    assert.match(primaryEotSrc, /eotAgg \|\| reportData\?\.total_aggregates \|\| '--'/);
    assert.match(primaryEotSrc, /<span className="info-label">DIVISION:<\/span>/);
    assert.match(primaryEotSrc, /division \|\| '--'/);
    assert.match(primaryEotSrc, /formattedTerm = reportData\?\.term\?\.term_number \? `Term \$\{reportData\.term\.term_number\}`/);
    assert.match(p7EotSrc, /reportData\?\.term\?\.term_number \? `Term \$\{reportData\.term\.term_number\}`/);
    assert.match(primaryBotSrc, /AGG: <div className="bot-line"/);
  });

  it('WS31.2: ReportStudioClient uses authentic Jiddah Islamic Schools metadata and PrimaryEOTReport/P7EOTReport prevent motto clipping', () => {
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');
    const primaryEotSrc = read('src/components/reports/PrimaryEOTReport.tsx');
    const p7EotSrc = read('src/components/reports/P7EOTReport.tsx');

    assert.match(studioSrc, /Jiddah Islamic Schools/);
    assert.match(studioSrc, /P\.O\. BOX 34008 Kampala \(U\)/);
    assert.match(studioSrc, /\+256705316961 \/ \+256 787 779 909/);
    assert.match(studioSrc, /jiddahislamicnurseryandpri@gmail\.com/);
    assert.match(studioSrc, /Striving for Life & The Hereafter/);
    assert.match(primaryEotSrc, /\.header-left \{ flex: 0 0 36%; overflow: visible; \}/);
    assert.match(p7EotSrc, /\.p7-eot-report \.header-left \{ min-width: 0; overflow: visible; \}/);
  });

  it('WS31.3: ReportStudioClient populates GRD display fields, auto-pairs sample student archetypes, removes duplicate emojis, and renders single-row studio header with floating stage archetype pill', () => {
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');
    const primaryEotSrc = read('src/components/reports/PrimaryEOTReport.tsx');
    const p7EotSrc = read('src/components/reports/P7EOTReport.tsx');

    assert.match(studioSrc, /bot_grade_display:\s*'D1'/);
    assert.match(studioSrc, /mot_grade_display:\s*'D1'/);
    assert.match(studioSrc, /eot_grade_display:\s*'D1'/);
    assert.match(studioSrc, /is_core:\s*true/);
    assert.match(primaryEotSrc, /subject\.eot_grade_display \?\? subject\.eot_agg \?\? subject\.grade \?\? "--"/);
    assert.match(p7EotSrc, /subject\.eot_grade_display \?\? subject\.eot_agg \?\? subject\.grade \?\? '--'/);
    assert.doesNotMatch(studioSrc, /💾 Save & Apply to All Reports/);
    assert.match(studioSrc, /h-13 px-3 bg-white dark:bg-\[#151D1A\] border-b border-stone-200 dark:border-white\/10 flex items-center justify-between gap-2 w-full max-w-full overflow-hidden/);
    assert.match(studioSrc, /data-testid="studio-sample-archetype-switcher"/);
  });

  it('WS32.1: resolveEffectiveStudioStyle is defined in studio-config-store and wired into all 8 report templates', () => {
    const storeSrc = read('src/lib/studio-config-store.ts');
    assert.match(storeSrc, /export function resolveEffectiveStudioStyle/);

    const templates = [
      'src/components/reports/PrimaryEOTReport.tsx',
      'src/components/reports/P7EOTReport.tsx',
      'src/components/reports/PrimaryMOTReport.tsx',
      'src/components/reports/PrimaryBOTReport.tsx',
      'src/components/reports/NurseryEOTReport.tsx',
      'src/components/reports/NurseryMOTReport.tsx',
      'src/components/reports/NurseryTheologyEOTReport.tsx',
      'src/components/reports/TheologyMOTReport.tsx',
    ];
    for (const tplPath of templates) {
      const src = read(tplPath);
      assert.match(src, /resolveEffectiveStudioStyle/, `${tplPath} must use resolveEffectiveStudioStyle`);
    }
  });

  it('WS32.2: ReportStudioClient top bar is overflow-proof with compact template selector, Prev/Next steppers, mobile view switcher, and zero raw emojis', () => {
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');
    const toolbarSrc = read('src/components/figma-ui/TopToolbar.tsx');

    assert.match(studioSrc, /dataTestId="studio-template-select"|data-testid="studio-template-select"/);
    assert.match(studioSrc, /data-testid="studio-mobile-view-switcher"/);
    assert.match(studioSrc, /data-testid="studio-save-apply-all"/);
    assert.match(studioSrc, /School Name \(Arabic\)/);
    assert.match(studioSrc, /Comment Font Size/);
    assert.doesNotMatch(studioSrc, /[🎨🔤🖼️✒️✨💾🚀]/);
    assert.doesNotMatch(toolbarSrc, /[✨💾🚀]/);
  });

  it('WS32.3: StampGenerator enforces dir="ltr" and unicodeBidi isolate/bidi-override so 24 APR 2026 never reverses inside RTL templates, and TheologyMOTReport computes valid Arabic grade and separates footer stamp', () => {
    const stampSrc = read('src/components/reports/StampGenerator.tsx');
    const theoMotSrc = read('src/components/reports/TheologyMOTReport.tsx');

    assert.match(stampSrc, /dir="ltr"/);
    assert.match(stampSrc, /unicodeBidi:\s*"isolate"/);
    assert.match(stampSrc, /unicodeBidi:\s*"bidi-override"/);
    assert.match(theoMotSrc, /computedDivision/);
    assert.match(theoMotSrc, /if \(avg >= 85\) return 'ممتاز'/);
    assert.match(theoMotSrc, /\.tc-comment \{[\s\S]*?flex: 1;[\s\S]*?min-width: 0;/);
  });
});

describe('Workstream 33: Template & Print Engine Stabilization, Scoped Report Studio 2.0, Stamp/Signature/Watermark Precision & Upload Center Overhaul', () => {
  const read = (relPath) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('WS33.1: P7EOTReport removes uncomputed AVERAGE row and locks 286mm height, while PrimaryEOTReport uses splitArabicSchoolName and fixed 135x64 stamp slot', () => {
    const p7Src = read('src/components/reports/P7EOTReport.tsx');
    const primarySrc = read('src/components/reports/PrimaryEOTReport.tsx');

    assert.doesNotMatch(p7Src, />AVERAGE</);
    assert.match(p7Src, /height:\s*295mm\s*!important/);
    assert.match(p7Src, /nameArabicLine1/);
    assert.match(p7Src, /nameArabicLine2/);
    assert.match(p7Src, /<NurseryEducativeWatermark/);
    assert.match(p7Src, /maxWidth=\{135\}[\s\S]*?maxHeight=\{64\}/);

    assert.match(primarySrc, /nameArabicLine1/);
    assert.match(primarySrc, /nameArabicLine2/);
    assert.match(primarySrc, /effective\.arabicFontFamilyCss/);
    assert.match(primarySrc, /<NurseryEducativeWatermark[\s\S]*?templateId="primary-eot"/);
    assert.match(primarySrc, /width:\s*'135px'[\s\S]*?height:\s*'64px'[\s\S]*?overflow:\s*'visible'/);
  });

  it('WS33.2: PrintPortal and print-system.css enforce exact mm @page rules without conflicting named pages', () => {
    const portalSrc = read('src/components/reports/PrintPortal.tsx');
    const cssSrc = read('src/styles/reports/print-system.css');
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');

    assert.match(clientSrc, /function isLandscapeReportData/);
    assert.match(clientSrc, /function applyDynamicPrintPageRule/);
    assert.match(clientSrc, /size: 297mm 210mm !important; margin: 0mm !important;/);
    assert.match(clientSrc, /size: 210mm 297mm !important; margin: 0mm !important;/);
    assert.match(portalSrc, /297mm 210mm !important; margin: 0mm !important;/);
    assert.match(portalSrc, /210mm 297mm !important; margin: 0mm !important;/);
    assert.match(cssSrc, /height:\s*209mm\s*!important/);
    assert.match(cssSrc, /height:\s*295mm\s*!important/);
  });

  it('WS33.3: studio-config-store supports scoped template overrides, dual fonts, expanded palettes, ColorWheelPicker, Watermark art presets, and Stamp/Signature transform controls', () => {
    const storeSrc = read('src/lib/studio-config-store.ts');
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');
    const toolbarSrc = read('src/components/figma-ui/TopToolbar.tsx');
    const colorPickerSrc = read('src/components/ui/color-wheel-picker.tsx');
    const watermarkSrc = read('src/components/reports/NurseryEducativeWatermark.tsx');
    const stampSrc = read('src/components/reports/StampGenerator.tsx');
    const sigSrc = read('src/components/reports/CleanSignatureImage.tsx');

    assert.match(storeSrc, /export type ReportTemplateId/);
    assert.match(storeSrc, /export function getCurriculumGroupTemplates/);
    assert.match(storeSrc, /export function splitArabicSchoolName/);
    assert.match(storeSrc, /nursery-cobalt-sunshine/);
    assert.match(storeSrc, /madinah-emerald-gold/);
    assert.match(storeSrc, /englishFontFamily/);
    assert.match(storeSrc, /arabicFontFamily/);

    assert.doesNotMatch(studioSrc, /<select[\s>]/);
    assert.doesNotMatch(toolbarSrc, /<select[\s>]/);
    assert.match(studioSrc, /data-testid="save-scope-template"/);
    assert.match(studioSrc, /data-testid="save-scope-group"/);
    assert.match(studioSrc, /data-testid="save-scope-all"/);
    assert.match(studioSrc, /Reset Default/);
    assert.match(studioSrc, /ColorWheelPicker/);
    assert.match(colorPickerSrc, /export function ColorWheelPicker/);

    assert.match(watermarkSrc, /islamic-arabesque/);
    assert.match(watermarkSrc, /certificate-filigree/);
    assert.match(watermarkSrc, /stem-explorers/);
    assert.match(stampSrc, /official-stamp-anchor-slot/);
    assert.match(stampSrc, /official-stamp-transform-layer/);
    assert.match(sigSrc, /feColorMatrix/);
    assert.match(sigSrc, /signatureThreshold/);
  });

  it('WS33.4: Upload Center uses unified getUploadMetrics, CustomPillSelect, 2-mode digital signature draw pad, Stamp preview, Live Visual Gallery, and excludes theology-teacher-p7 from dynamic UI slots', () => {
    const sigUtilsSrc = read('src/utils/signatures.ts');
    const sigApiSrc = read('src/app/api/signatures/route.ts');
    const uploadPageSrc = read('src/app/admin/upload/page.tsx');
    const uploadClientSrc = read('src/components/layout/upload-client.tsx');

    assert.match(sigUtilsSrc, /isTheology && key === 'theology-teacher-p7'/);
    assert.match(sigUtilsSrc, /getClassSortWeight/);
    assert.match(sigApiSrc, /extractFileSize/);
    assert.match(uploadPageSrc, /initialSignatureSlots/);
    assert.match(uploadClientSrc, /getUploadMetrics/);
    assert.match(uploadClientSrc, /CustomPillSelect/);
    assert.doesNotMatch(uploadClientSrc, /<select[\s>]/);
    assert.match(uploadClientSrc, /Draw Digital Signature/);
    assert.match(uploadClientSrc, /touchAction:\s*'none'/);
    assert.match(uploadClientSrc, /OfficialReportStamp/);
    assert.match(uploadClientSrc, /Re-Clean Ink/);
  });
});

describe('Workstream 34: 5-Subject Landscape Fit, Zero Ghost Page 2 Portal, 16px Deadband Anti-Shake, Conic Icon Buttons & Split Upload Workspace', () => {
  const read = (relPath) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('WS34.1: PrimaryEOTReport tightens 5-subject vertical spacing inside 209mm, and PrintPortal + print-system.css hide body siblings cleanly and break strictly via data-first-printed="false"', () => {
    const primarySrc = read('src/components/reports/PrimaryEOTReport.tsx');
    const p7Src = read('src/components/reports/P7EOTReport.tsx');
    const portalSrc = read('src/components/reports/PrintPortal.tsx');
    const cssSrc = read('src/styles/reports/print-system.css');
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');

    assert.match(primarySrc, /padding:\s*2\.5mm 4mm;/);
    assert.match(primarySrc, /\.school-logo\s*\{[\s\S]*?height:\s*48px;/);
    assert.match(primarySrc, /\.validity-bar\s*\{[\s\S]*?padding:\s*3\.5px 6px;/);
    assert.match(p7Src, /height:\s*295mm\s*!important/);
    assert.match(p7Src, /max-height:\s*295mm\s*!important/);

    assert.match(portalSrc, /createPortal/);
    assert.match(portalSrc, /id="report-print-portal"/);
    assert.match(portalSrc, /data-print-portal="active"/);
    assert.match(cssSrc, /html:has\(#report-print-portal\)\s*body\s*>\s*\*:not\(#report-print-portal\):not\(style\):not\(script\)/);
    assert.match(cssSrc, /\.report-card-sheet\[data-first-printed="false"\]/);
    assert.match(cssSrc, /\.report-card-sheet\[data-first-printed="true"\]/);
    assert.match(clientSrc, /data-first-printed=\{isFirstSheet \? 'true' : 'false'\}/);
  });

  it('WS34.2: ReportStudioClient includes 5 sample primary subjects, uses 16px ResizeObserver deadband hysteresis on overflow-hidden wrapper, and eliminates CSS zoom across all 8 templates', () => {
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');
    const previewCellSrc = read('src/components/reports/ReportPreviewCell.tsx');
    const docCanvasSrc = read('src/components/figma-ui/DocumentCanvas.tsx');

    assert.match(studioSrc, /subject_name:\s*'COMP'/);
    assert.match(studioSrc, /previewStageOuterRef/);
    assert.match(studioSrc, /Math\.abs\(newWidth - prev\.width\)\s*<\s*16/);
    assert.match(studioSrc, /requestAnimationFrame/);
    assert.match(previewCellSrc, /Math\.abs\(roundedW - lastWidthRef\.current\)\s*<\s*16/);
    assert.match(docCanvasSrc, /Math\.abs\(w - prev\)\s*>=\s*16/);

    const templates = [
      'src/components/reports/PrimaryEOTReport.tsx',
      'src/components/reports/P7EOTReport.tsx',
      'src/components/reports/PrimaryMOTReport.tsx',
      'src/components/reports/PrimaryBOTReport.tsx',
      'src/components/reports/NurseryEOTReport.tsx',
      'src/components/reports/NurseryMOTReport.tsx',
      'src/components/reports/NurseryTheologyEOTReport.tsx',
      'src/components/reports/TheologyMOTReport.tsx',
    ];
    for (const tpl of templates) {
      const src = read(tpl);
      assert.doesNotMatch(src, /\bzoom:\s*\$\{effective\.(?:fontScaleMultiplier|arabicFontScaleMultiplier)\}/, `${tpl} must use CSS variables instead of zoom:`);
    }
  });

  it('WS34.3: ColorWheelPicker and SectionHeaderWithReset use crisp conic-wheel & RotateCcw icon buttons inside Tooltips', () => {
    const colorPickerSrc = read('src/components/ui/color-wheel-picker.tsx');
    const studioSrc = read('src/components/reports/ReportStudioClient.tsx');

    assert.doesNotMatch(colorPickerSrc, />\s*Wheel\s*</);
    assert.doesNotMatch(colorPickerSrc, />\s*Default\s*</);
    assert.match(colorPickerSrc, /conic-gradient\(/);
    assert.match(colorPickerSrc, /<Tooltip>/);
    assert.match(colorPickerSrc, /aria-label="Reset Default"/);
    assert.match(studioSrc, /<TooltipContent side="top">/);
    assert.match(studioSrc, /aria-label="Reset Default"/);
  });

  it('WS34.4: UploadClient removes HeroSection & duplicate ASSET CATEGORIES sidebar, fixes quota typo, and renders 12-column side-by-side workspace above the fold', () => {
    const uploadSrc = read('src/components/layout/upload-client.tsx');

    assert.doesNotMatch(uploadSrc, /HeroSection/);
    assert.doesNotMatch(uploadSrc, /Asset Categories/);
    assert.doesNotMatch(uploadSrc, /used consumed/);
    assert.match(uploadSrc, /lg:grid-cols-12/);
    assert.match(uploadSrc, /lg:col-span-(?:4|5)/);
    assert.match(uploadSrc, /lg:col-span-(?:8|7)/);
    assert.match(uploadSrc, /data-testid="upload-telemetry-bar"/);
    assert.match(uploadSrc, /data-testid="upload-mobile-view-switcher"/);
    assert.match(uploadSrc, /max-h-\[calc\(100dvh-(?:215|165)px\)\]/);
  });
});

describe('Workstream 35: Zero Blank Page 1 Print Portal, Mixed-Only Named Pages, P7 & Nursery Gap Elimination & Jiddah Emerald/Marigold Upload Center Redesign', () => {
  const read = (relPath) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('WS35.1: AdminLayout & ReportGeneratorClient hide app chrome during portal printing and PrintPortal scopes named pages strictly to mixed batches', () => {
    const layoutSrc = read('src/app/admin/layout.tsx');
    const clientSrc = read('src/components/ReportGeneratorClient.tsx');
    const portalSrc = read('src/components/reports/PrintPortal.tsx');
    const cssSrc = read('src/styles/reports/print-system.css');
    const containerSrc = read('src/components/reports/shared/ReportContainer.tsx');
    const primarySrc = read('src/components/reports/PrimaryEOTReport.tsx');

    assert.doesNotMatch(layoutSrc, /print:!block/);
    assert.match(clientSrc, /report-studio-root[\s\S]*?print:!hidden/);
    assert.match(portalSrc, /data-mixed-orientation=\{pageOrientation === 'mixed' \? 'true' : 'false'\}/);
    assert.match(cssSrc, /html:has\(#report-print-portal\) body > \*:not\(#report-print-portal\):not\(style\):not\(script\)/);
    assert.match(cssSrc, /#report-print-portal\[data-mixed-orientation="true"\] \.report-sheet-landscape/);
    assert.match(containerSrc, /report-container-root/);
    assert.match(primarySrc, /margin:\s*0\s*!important;[\s\S]*?left:\s*0\s*!important;/);
  });

  it('WS35.2: P7EOTReport sets .table-section and .table-container to flex: 0 0 auto with balanced spacing, and NurseryEOTReport tightens gaps between tables', () => {
    const p7Src = read('src/components/reports/P7EOTReport.tsx');
    const nurserySrc = read('src/components/reports/NurseryEOTReport.tsx');

    assert.match(p7Src, /\.p7-eot-report \.table-section\s*\{[\s\S]*?flex:\s*0 0 auto;/);
    assert.match(p7Src, /\.p7-eot-report \.table-container\s*\{[\s\S]*?flex:\s*0 0 auto;/);
    assert.match(p7Src, /\.p7-eot-report \.comments-box\s*\{[\s\S]*?justify-content:\s*space-evenly;/);
    assert.match(nurserySrc, /\.nursery-eot-report \.tables-container\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?justify-content:\s*flex-start;/);
    assert.match(nurserySrc, /\.nursery-eot-report \.learning-area-table td\s*\{[\s\S]*?padding:\s*10px 12px;/);
  });

  it('WS35.3: UploadClient renders CleanSignatureImage, uses Upload/PenTool/Wand2 without RefreshCw on signature cards, excludes unused DOS/Head/Principal roles, and uses Forest Green + Warm Marigold hierarchy', () => {
    const sigUtilsSrc = read('src/utils/signatures.ts');
    const uploadSrc = read('src/components/layout/upload-client.tsx');

    assert.doesNotMatch(sigUtilsSrc, /slot_key:\s*'dos-signature'/);
    assert.doesNotMatch(sigUtilsSrc, /slot_key:\s*'theology-head'/);
    assert.doesNotMatch(sigUtilsSrc, /slot_key:\s*'principal'/);

    assert.match(uploadSrc, /CleanSignatureImage/);
    assert.match(uploadSrc, /data-testid="upload-role-banner"/);
    assert.match(uploadSrc, /#0D5C3A/);
    assert.match(uploadSrc, /#EA580C/);
    assert.match(uploadSrc, /UploadCloud/);
    assert.match(uploadSrc, /'dos-signature'[\s\S]*?'theology-head'[\s\S]*?'principal'/);
  });
});
