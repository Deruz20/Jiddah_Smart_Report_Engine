export const SCHOOL_CUSTOMIZATION_ACTION = 'school_customization_config';
export const CANONICAL_SCHOOL_LOGO = '/logo-512h.png';

const BROKEN_LOGO_PATHS = new Set([
  '/logo.png',
  'logo.png',
  '/school_badge.png',
  'school_badge.png',
  '/school_badge.jpg',
  'school_badge.jpg',
  '/school_badge.jpeg',
  'school_badge.jpeg',
  '/school-badge.png',
  'school-badge.png',
  '/school_budge.jpeg',
  'school_budge.jpeg',
  '/school_budge.jpg',
  'school_budge.jpg',
  '/school_budge.png',
  'school_budge.png',
  '/images/logo.png',
  '/badge.png',
  'badge.png',
  '/badge.jpg',
  '/badge.jpeg',
]);

function extractLogoValueFromPossiblyJson(raw: string): string {
  let candidate = raw.trim();
  if (!candidate) return '';

  // Decode URL-encoded JSON strings (repeat if nested-encoded up to 3 times)
  for (let i = 0; i < 3; i++) {
    if (
      candidate.includes('%7B') ||
      candidate.includes('%7b') ||
      candidate.includes('%22') ||
      candidate.includes('%2F') ||
      candidate.includes('%2f')
    ) {
      const stripped = candidate.startsWith('/') ? candidate.slice(1) : candidate;
      try {
        const decoded = decodeURIComponent(stripped).trim();
        if (decoded && decoded !== candidate) {
          candidate = decoded;
        } else {
          break;
        }
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  // Strip accidental leading slash before raw JSON string ("/{...}")
  if (candidate.startsWith('/{')) {
    candidate = candidate.slice(1).trim();
  }

  if (candidate.startsWith('{')) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const nested = parsed?.logo ?? parsed?.logo_url ?? parsed?.url ?? '';
      const resolvedNested = typeof nested === 'string' ? nested.trim() : '';
      if (resolvedNested) {
        return extractLogoValueFromPossiblyJson(resolvedNested);
      }
    } catch {
      // Fallback regex if JSON string was truncated
      const match = candidate.match(/"(?:logo|logo_url|url)"\s*:\s*"([^"]*)"/i);
      if (match?.[1]?.trim()) {
        return extractLogoValueFromPossiblyJson(match[1].trim());
      }
    }
  }

  return candidate;
}

export function normalizeSchoolLogoUrl(rawUrl?: string | null): string {
  const rawString = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  const extracted = extractLogoValueFromPossiblyJson(rawString);
  if (!extracted || extracted === 'null' || extracted === 'undefined') {
    return CANONICAL_SCHOOL_LOGO;
  }

  const lower = extracted.toLowerCase();
  if (BROKEN_LOGO_PATHS.has(lower) || BROKEN_LOGO_PATHS.has(`/${lower.replace(/^\/+/, '')}`)) {
    return CANONICAL_SCHOOL_LOGO;
  }

  if (
    lower.startsWith('/') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('blob:')
  ) {
    return extracted;
  }

  return `/${extracted.replace(/^\/+/, '')}`;
}

export interface GradingBand {
  grade: string;
  range: string;
  min: number;
  max: number;
  remark: string;
}

export interface DivisionBoundaryItem {
  division: 'I' | 'II' | 'III' | 'IV' | 'U';
  label: string;
  min: number;
  max: number;
  classTeacherComment: string;
  headTeacherComment: string;
}

export interface FeeStructureConfig {
  nursery_day: string;
  lower_primary_day: string;
  upper_primary_day: string;
  boarding: string;
  notes?: string;
}

export interface MarksLocksConfig {
  bot_locked: boolean;
  mot_locked: boolean;
  eot_locked: boolean;
  lock_reason?: string;
  updated_at?: string;
}

export interface PrintPreferencesConfig {
  includeStamp: boolean;
  includeSignatures: boolean;
  watermarkEnabled: boolean;
  highFidelityColors: boolean;
  showClassPosition: boolean;
  stamp_config?: Record<string, any>;
}

export const DEFAULT_PRINT_PREFERENCES: PrintPreferencesConfig = {
  includeStamp: true,
  includeSignatures: true,
  watermarkEnabled: false,
  highFidelityColors: true,
  showClassPosition: true,
};

export const DEFAULT_MARKS_LOCKS: MarksLocksConfig = {
  bot_locked: false,
  mot_locked: false,
  eot_locked: false,
  lock_reason: '',
};

export const DEFAULT_FEE_STRUCTURE: FeeStructureConfig = {
  nursery_day: 'UGX 350,000',
  lower_primary_day: 'UGX 420,000',
  upper_primary_day: 'UGX 480,000',
  boarding: 'UGX 850,000',
  notes: 'All fees are payable via school bank pay code prior to term opening.',
};

export const DEFAULT_DIVISION_BOUNDARIES: DivisionBoundaryItem[] = [
  {
    division: 'I',
    label: 'Division I',
    min: 4,
    max: 12,
    classTeacherComment: 'Outstanding performance. Keep it up!',
    headTeacherComment: 'Excellent achievement. Keep up the high standard.',
  },
  {
    division: 'II',
    label: 'Division II',
    min: 13,
    max: 23,
    classTeacherComment: 'Very good performance. Keep it up.',
    headTeacherComment: 'Very good result. Continue working toward excellence.',
  },
  {
    division: 'III',
    label: 'Division III',
    min: 24,
    max: 29,
    classTeacherComment: 'Average performance. Keep practising to improve.',
    headTeacherComment: 'Fair result. Consistent practice will help you improve.',
  },
  {
    division: 'IV',
    label: 'Division IV',
    min: 30,
    max: 34,
    classTeacherComment: 'Promising result. More effort will bring progress.',
    headTeacherComment: 'Promising result. Work harder to make stronger progress.',
  },
  {
    division: 'U',
    label: 'Ungraded (U)',
    min: 35,
    max: 36,
    classTeacherComment: 'Strive harder. Practise regularly and ask for help.',
    headTeacherComment: 'Strive harder. Seek support from your teachers.',
  },
];

export const DEFAULT_UNEB_GRADING_BANDS: GradingBand[] = [
  { grade: 'D1', range: '85-100', min: 85, max: 100, remark: 'Excellent' },
  { grade: 'D2', range: '75-84', min: 75, max: 84, remark: 'Very Good' },
  { grade: 'C3', range: '70-74', min: 70, max: 74, remark: 'Good' },
  { grade: 'C4', range: '60-69', min: 60, max: 69, remark: 'Quite Good' },
  { grade: 'C5', range: '55-59', min: 55, max: 59, remark: 'Fairly Good' },
  { grade: 'C6', range: '50-54', min: 50, max: 54, remark: 'Fair' },
  { grade: 'P7', range: '40-49', min: 40, max: 49, remark: 'More Effort' },
  { grade: 'P8', range: '35-39', min: 35, max: 39, remark: 'Work Harder' },
  { grade: 'F9', range: '0-34', min: 0, max: 34, remark: 'Poor / Pull Up' },
];

export const DEFAULT_GRADING_BANDS = DEFAULT_UNEB_GRADING_BANDS;
export const DEFAULT_GRADING_SCALE = DEFAULT_UNEB_GRADING_BANDS;
export type GradingBandItem = GradingBand;
export type MergedSchoolSettings = Awaited<ReturnType<typeof fetchMergedSchoolSettings>>;

export interface TheologyRemarkItem {
  level: string; // 'ممتاز' | 'جيد جدا' | 'جيد' | 'مقبول' | 'ضعيف'
  boys: string;
  girls: string;
}

export const DEFAULT_THEOLOGY_GRADING_BANDS: GradingBand[] = [
  { grade: 'D1', range: '85-100', min: 85, max: 100, remark: 'ممتاز' },
  { grade: 'D2', range: '75-84', min: 75, max: 84, remark: 'جيد جدا' },
  { grade: 'C3', range: '65-74', min: 65, max: 74, remark: 'جيد' },
  { grade: 'C4', range: '60-64', min: 60, max: 64, remark: 'جيد' },
  { grade: 'C5', range: '55-59', min: 55, max: 59, remark: 'مقبول' },
  { grade: 'C6', range: '50-54', min: 50, max: 54, remark: 'مقبول' },
  { grade: 'P7', range: '40-49', min: 40, max: 49, remark: 'ضعيف' },
  { grade: 'P8', range: '30-39', min: 30, max: 39, remark: 'ضعيف' },
  { grade: 'F9', range: '0-29', min: 0, max: 29, remark: 'ضعيف' },
];
export const DEFAULT_THEOLOGY_GRADING_SCALE = DEFAULT_THEOLOGY_GRADING_BANDS;

export const DEFAULT_THEOLOGY_REMARKS: TheologyRemarkItem[] = [
  { level: 'ممتاز', boys: 'جهد مميز،شكرا', girls: 'جهد مميز،شكرا' },
  { level: 'جيد جدا', boys: 'بقيت خطوة إلى الامتياز', girls: 'بقيت خطوة إلى الامتياز' },
  { level: 'جيد', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  { level: 'مقبول', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  { level: 'ضعيف', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
];

/**
 * Validates that a set of grading bands covers 0..100 cleanly with no overlaps or gaps.
 */
export function validateGradingBands(
  bands: Pick<GradingBand, 'grade' | 'min' | 'max'>[]
): { valid: boolean; error?: string } {
  if (!Array.isArray(bands) || bands.length === 0) {
    return { valid: false, error: 'Grading scale cannot be empty.' };
  }

  for (const b of bands) {
    if (!Number.isFinite(b.min) || !Number.isFinite(b.max)) {
      return { valid: false, error: `Grade ${b.grade} has non-numeric score bounds.` };
    }
    if (b.min < 0 || b.max > 100) {
      return { valid: false, error: `Grade ${b.grade} bounds (${b.min}–${b.max}) must be within 0 and 100.` };
    }
    if (b.min > b.max) {
      return { valid: false, error: `Grade ${b.grade} min score (${b.min}) cannot exceed max score (${b.max}).` };
    }
  }

  const sorted = [...bands].sort((a, b) => b.max - a.max);
  if (sorted[0].max !== 100) {
    return { valid: false, error: `Highest grade (${sorted[0].grade}) must have max score 100 (currently ${sorted[0].max}).` };
  }
  if (sorted[sorted.length - 1].min !== 0) {
    return {
      valid: false,
      error: `Lowest grade (${sorted[sorted.length - 1].grade}) must have min score 0 (currently ${sorted[sorted.length - 1].min}).`,
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const upper = sorted[i];
    const lower = sorted[i + 1];
    if (upper.min <= lower.max) {
      return {
        valid: false,
        error: `Overlapping score range between ${upper.grade} (${upper.min}–${upper.max}) and ${lower.grade} (${lower.min}–${lower.max}).`,
      };
    }
    if (upper.min - lower.max > 1) {
      return {
        valid: false,
        error: `Score gap detected between ${lower.grade} (max ${lower.max}) and ${upper.grade} (min ${upper.min}).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Checks whether a given exam set ('bot' | 'mot' | 'eot' | 'all') is locked for non-admin staff.
 */
export function isExamSetLockedForUser(
  settings: any,
  scoreType: string,
  isAdmin: boolean
): { locked: boolean; message?: string } {
  if (isAdmin) return { locked: false };
  const locks: MarksLocksConfig = {
    ...DEFAULT_MARKS_LOCKS,
    ...(settings?.marks_locks || {}),
  };

  const normalized = (scoreType || '').toLowerCase();
  if (normalized === 'bot' && locks.bot_locked) {
    return {
      locked: true,
      message: 'Beginning of Term (BOT) marks entry is currently locked by Administration.',
    };
  }
  if (normalized === 'mot' && locks.mot_locked) {
    return {
      locked: true,
      message: 'Mid-Term (MOT) marks entry is currently locked by Administration.',
    };
  }
  if (normalized === 'eot' && locks.eot_locked) {
    return {
      locked: true,
      message: 'End of Term (EOT) marks entry is currently locked by Administration.',
    };
  }
  if (normalized === 'all') {
    const lockedSets: string[] = [];
    if (locks.bot_locked) lockedSets.push('BOT');
    if (locks.mot_locked) lockedSets.push('MOT');
    if (locks.eot_locked) lockedSets.push('EOT');
    if (lockedSets.length > 0) {
      return {
        locked: true,
        message: `Marks entry is locked for ${lockedSets.join(', ')} by Administration.`,
      };
    }
  }
  return { locked: false };
}

export async function fetchMergedSchoolSettings(supabase: any, gradingCriteria: any[] = []) {
  const [schoolRes, logsRes] = await Promise.all([
    supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    supabase
      .from('activity_logs')
      .select('metadata, details')
      .eq('action', SCHOOL_CUSTOMIZATION_ACTION)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const rawSchoolSettings = schoolRes?.data || null;
  const rawLogs = Array.isArray(logsRes?.data)
    ? logsRes.data[0]
    : logsRes?.data || null;

  const rawPayload = rawLogs?.metadata || rawLogs?.details || null;
  let customConfig: Record<string, any> = {};
  if (rawPayload && typeof rawPayload === 'object') {
    customConfig = rawPayload as Record<string, any>;
  } else if (typeof rawPayload === 'string') {
    try {
      customConfig = JSON.parse(rawPayload);
    } catch {
      customConfig = {};
    }
  }

  const merged = {
    ...(rawSchoolSettings || {}),
    ...customConfig,
    print_preferences: {
      ...DEFAULT_PRINT_PREFERENCES,
      ...(rawSchoolSettings?.print_preferences || {}),
      ...(customConfig?.print_preferences || {}),
    },
    marks_locks: {
      ...DEFAULT_MARKS_LOCKS,
      ...(rawSchoolSettings?.marks_locks || {}),
      ...(customConfig?.marks_locks || {}),
    },
    division_boundaries:
      Array.isArray(customConfig?.division_boundaries) && customConfig.division_boundaries.length > 0
        ? customConfig.division_boundaries
        : Array.isArray(rawSchoolSettings?.division_boundaries) && rawSchoolSettings.division_boundaries.length > 0
        ? rawSchoolSettings.division_boundaries
        : DEFAULT_DIVISION_BOUNDARIES,
    fee_structure: {
      ...DEFAULT_FEE_STRUCTURE,
      ...(rawSchoolSettings?.fee_structure || {}),
      ...(customConfig?.fee_structure || {}),
    },
    // Grading scales — always guarantee a non-empty array so API routes never fall back to stale legacy logic.
    grading_scale:
      Array.isArray(customConfig?.grading_scale) && customConfig.grading_scale.length > 0
        ? customConfig.grading_scale
        : Array.isArray(rawSchoolSettings?.grading_scale) && rawSchoolSettings.grading_scale.length > 0
        ? rawSchoolSettings.grading_scale
        : DEFAULT_UNEB_GRADING_BANDS,
    theology_grading_scale:
      Array.isArray(customConfig?.theology_grading_scale) && customConfig.theology_grading_scale.length > 0
        ? customConfig.theology_grading_scale
        : Array.isArray(rawSchoolSettings?.theology_grading_scale) && rawSchoolSettings.theology_grading_scale.length > 0
        ? rawSchoolSettings.theology_grading_scale
        : DEFAULT_THEOLOGY_GRADING_BANDS,
    theology_remarks:
      Array.isArray(customConfig?.theology_remarks) && customConfig.theology_remarks.length > 0
        ? customConfig.theology_remarks
        : Array.isArray(rawSchoolSettings?.theology_remarks) && rawSchoolSettings.theology_remarks.length > 0
        ? rawSchoolSettings.theology_remarks
        : DEFAULT_THEOLOGY_REMARKS,
    ...(rawSchoolSettings?.name ? { name: rawSchoolSettings.name, school_name: rawSchoolSettings.name } : {}),
    ...(rawSchoolSettings?.school_name ? { name: rawSchoolSettings.school_name, school_name: rawSchoolSettings.school_name } : {}),
    ...(customConfig?.school_name ? { name: customConfig.school_name, school_name: customConfig.school_name } : {}),
    ...(rawSchoolSettings?.address ? { address: rawSchoolSettings.address } : {}),
    ...(customConfig?.address ? { address: customConfig.address } : {}),
    ...(rawSchoolSettings?.district ? { district: rawSchoolSettings.district } : {}),
    ...(customConfig?.district ? { district: customConfig.district } : {}),
    ...(rawSchoolSettings?.email ? { email: rawSchoolSettings.email } : {}),
    ...(customConfig?.email ? { email: customConfig.email } : {}),
    ...(rawSchoolSettings?.phone ? { phone: rawSchoolSettings.phone, phone_1: rawSchoolSettings.phone } : {}),
    ...(rawSchoolSettings?.phone_1 ? { phone: rawSchoolSettings.phone_1, phone_1: rawSchoolSettings.phone_1 } : {}),
    ...(customConfig?.phone_1 ? { phone: customConfig.phone_1, phone_1: customConfig.phone_1 } : {}),
    grading_criteria: gradingCriteria,
    logo_url: normalizeSchoolLogoUrl(
      customConfig?.logo_url || rawSchoolSettings?.logo_url
    ),
  };

  return merged;
}

export function resolveReportBranding(reportData: any) {
  const s = reportData?.settings || {};
  const rawName = s.school_name || s.name;
  const schoolName = rawName && !rawName.toLowerCase().includes('nursery and primary')
    ? String(rawName)
    : 'Jiddah Islamic Schools';

  return {
    schoolName,
    arabicSchoolName: s.arabic_name || s.arabic_school_name || 'مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو',
    address: s.address || 'P.O.Box 34008 Kampala (U)',
    poBox: s.po_box || 'P.O.Box 34008 Kampala (U)',
    registrationNumber: s.registration_number || '',
    websiteUrl: s.website_url || '',
    phone: s.phone_1 || s.phone
      ? `${s.phone_1 || s.phone}${s.phone_2 ? ` / ${s.phone_2}` : ''}`
      : '+256 744950042 / 0705316961',
    email: s.email || 'jiddahislamicnurseryandpri@gmail.com',
    motto: s.motto || '',
    payCode: s.pay_code || '--',
    logoUrl: normalizeSchoolLogoUrl(s.logo_url),
    primaryFont: s.primary_font || undefined,
    arabicFont: s.arabic_font || undefined,
    themePreset: s.report_theme_preset || undefined,
    themeColor: s.theme_color || undefined,
    feeStructure: s.fee_structure || DEFAULT_FEE_STRUCTURE,
  };
}

export function resolveReportGradingBands(reportData: any): GradingBand[] {
  const s = reportData?.settings || {};

  if (Array.isArray(s.grading_scale) && s.grading_scale.length > 0) {
    return s.grading_scale.map((b: any) => ({
      grade: String(b.grade || ''),
      min: Number(b.min ?? 0),
      max: Number(b.max ?? 100),
      range: `${b.min ?? 0}-${b.max ?? 100}`,
      remark: String(b.remark || ''),
    }));
  }

  const criteria = reportData?.grading_criteria || s.grading_criteria || [];
  if (Array.isArray(criteria) && criteria.length > 0) {
    const gradeLabels = criteria
      .filter(
        (c: any) =>
          c.output_type === 'grade_label' &&
          (c.curriculum === 'secular' || c.curriculum === 'circular' || !c.curriculum) &&
          c.metric_type === 'subject_score'
      )
      .sort((a: any, b: any) => Number(b.max_value) - Number(a.max_value));

    if (gradeLabels.length >= 4) {
      return gradeLabels.map((c: any) => ({
        grade: String(c.output_text),
        min: Number(c.min_value),
        max: Number(c.max_value),
        range: `${c.min_value}-${c.max_value}`,
        remark: '',
      }));
    }
  }

  return DEFAULT_UNEB_GRADING_BANDS;
}

export function resolveTheologyGradingBands(reportData: any): GradingBand[] {
  const s = reportData?.settings || {};

  if (Array.isArray(s.theology_grading_scale) && s.theology_grading_scale.length > 0) {
    return s.theology_grading_scale.map((b: any) => ({
      grade: String(b.grade || ''),
      min: Number(b.min ?? 0),
      max: Number(b.max ?? 100),
      range: `${b.min ?? 0}-${b.max ?? 100}`,
      remark: String(b.remark || ''),
    }));
  }

  const criteria = reportData?.grading_criteria || s.grading_criteria || [];
  if (Array.isArray(criteria) && criteria.length > 0) {
    const gradeLabels = criteria
      .filter(
        (c: any) =>
          c.output_type === 'grade_label' &&
          c.curriculum === 'theology' &&
          c.metric_type === 'subject_score'
      )
      .sort((a: any, b: any) => Number(b.max_value) - Number(a.max_value));

    if (gradeLabels.length >= 4) {
      return gradeLabels.map((c: any) => ({
        grade: String(c.output_text),
        min: Number(c.min_value),
        max: Number(c.max_value),
        range: `${c.min_value}-${c.max_value}`,
        remark: '',
      }));
    }
  }

  return DEFAULT_THEOLOGY_GRADING_BANDS;
}

export function resolveTheologyRemarks(reportData: any): TheologyRemarkItem[] {
  const s = reportData?.settings || {};
  if (Array.isArray(s.theology_remarks) && s.theology_remarks.length > 0) {
    return s.theology_remarks;
  }
  return DEFAULT_THEOLOGY_REMARKS;
}

export function resolveDivisionBoundaries(reportData: any): DivisionBoundaryItem[] {
  const s = reportData?.settings || {};
  if (Array.isArray(s.division_boundaries) && s.division_boundaries.length > 0) {
    return s.division_boundaries;
  }
  return DEFAULT_DIVISION_BOUNDARIES;
}
