export const SCHOOL_CUSTOMIZATION_ACTION = 'school_customization_config';

export interface GradingBand {
  grade: string;
  range: string;
  min: number;
  max: number;
  remark: string;
}

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

export interface TheologyRemarkItem {
  level: string; // 'ممتاز' | 'جيد جدا' | 'جيد' | 'مقبول' | 'ضعيف'
  boys: string;
  girls: string;
}

/**
 * Official Theology Grading Scale (2026 Standards from PDF specification):
 * 85-100: D1
 * 75-84:  D2
 * 65-74:  C3
 * 60-64:  C4
 * 55-59:  C5
 * 50-54:  C6
 * 40-49:  P7
 * 30-39:  P8
 * 0-29:   F9
 */
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

/**
 * Official Theology Performance Remarks (الملاحظات from PDF specification):
 * ممتاز: جهد مميز،شكرا
 * جيد جدا: بقيت خطوة إلى الامتياز
 * جيد: أنت قادر على الأفضل (Boys) / أنتِ قادرة على الأفضل (Girls)
 * مقبول: أنت قادر على الأفضل (Boys) / أنتِ قادرة على الأفضل (Girls)
 * ضعيف: أنت قادر على الأفضل (Boys) / أنتِ قادرة على الأفضل (Girls)
 */
export const DEFAULT_THEOLOGY_REMARKS: TheologyRemarkItem[] = [
  { level: 'ممتاز', boys: 'جهد مميز،شكرا', girls: 'جهد مميز،شكرا' },
  { level: 'جيد جدا', boys: 'بقيت خطوة إلى الامتياز', girls: 'بقيت خطوة إلى الامتياز' },
  { level: 'جيد', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  { level: 'مقبول', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  { level: 'ضعيف', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
];

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
    ...(rawSchoolSettings?.name ? { name: rawSchoolSettings.name, school_name: rawSchoolSettings.name } : {}),
    ...(rawSchoolSettings?.school_name ? { name: rawSchoolSettings.school_name, school_name: rawSchoolSettings.school_name } : {}),
    ...(rawSchoolSettings?.address ? { address: rawSchoolSettings.address } : {}),
    ...(rawSchoolSettings?.district ? { district: rawSchoolSettings.district } : {}),
    ...(rawSchoolSettings?.email ? { email: rawSchoolSettings.email } : {}),
    ...(rawSchoolSettings?.phone ? { phone: rawSchoolSettings.phone, phone_1: rawSchoolSettings.phone } : {}),
    ...(rawSchoolSettings?.phone_1 ? { phone: rawSchoolSettings.phone_1, phone_1: rawSchoolSettings.phone_1 } : {}),
    grading_criteria: gradingCriteria,
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
    arabicSchoolName: s.arabic_name || 'مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو',
    address: s.address || 'P.O.Box 34008 Kampala (U)',
    phone: s.phone_1 || s.phone
      ? `${s.phone_1 || s.phone}${s.phone_2 ? ` / ${s.phone_2}` : ''}`
      : '+256 744950042 / 0705316961',
    email: s.email || 'jiddahislamicnurseryandpri@gmail.com',
    motto: s.motto || '',
    payCode: s.pay_code || '--',
    logoUrl: s.logo_url || '/logo-512h.png',
    primaryFont: s.primary_font || undefined,
    arabicFont: s.arabic_font || undefined,
    themePreset: s.report_theme_preset || undefined,
    themeColor: s.theme_color || undefined,
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
