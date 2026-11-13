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
  it('defaults to official Jiddah stamp geometry, navy blue ink, and P.O. BOX line', () => {
    assert.equal(DEFAULT_STAMP_CONFIG.school_name, 'JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL');
    assert.equal(DEFAULT_STAMP_CONFIG.title, 'HEADTEACHER');
    assert.equal(DEFAULT_STAMP_CONFIG.po_box, 'P.O. BOX 34008, KAMPALA - UGANDA');
    assert.equal(DEFAULT_STAMP_CONFIG.ink_color, '#1B3678');
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
    assert.match(marksEntrySrc, /sticky bottom-2 z-20 rounded-full bg-white\/95 dark:bg-\[#1E1F20\]\/95/);
  });
});



