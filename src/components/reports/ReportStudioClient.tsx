'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Palette,
  Type,
  Stamp,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Check,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  UserCheck,
  SlidersHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport';
import P7EOTReport from '@/components/reports/P7EOTReport';
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport';
import PrimaryBOTReport from '@/components/reports/PrimaryBOTReport';
import NurseryEOTReport from '@/components/reports/NurseryEOTReport';
import NurseryMOTReport from '@/components/reports/NurseryMOTReport';
import NurseryTheologyEOTReport from '@/components/reports/NurseryTheologyEOTReport';
import TheologyMOTReport from '@/components/reports/TheologyMOTReport';
import { ReportPreviewCell } from '@/components/reports/ReportPreviewCell';
import type { StabilizedReportType } from '@/types/report';
import {
  DEFAULT_STUDIO_CONFIG,
  STUDIO_COLOR_THEMES,
  STUDIO_FONT_FAMILIES,
  STUDIO_STAMP_INK_COLORS,
  useSyncedStudioConfig,
  persistStudioConfigGlobally,
  saveStudioConfigToStorage,
  normalizeStudioConfig,
  StudioFormattingProvider,
  type StudioFormattingConfig,
} from '@/lib/studio-config-store';

export interface BrandingConfig {
  schoolName: string;
  schoolMotto: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  arabicSchoolName?: string;
}

export interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  label: string;
}

export type TemplateType =
  | 'primary-eot'
  | 'p7-eot'
  | 'primary-mot'
  | 'primary-bot'
  | 'nursery-eot'
  | 'nursery-mot'
  | 'nursery-theology-eot'
  | 'theology-mot';

export type SampleProfileId = 'muslim' | 'non-muslim' | 'p7' | 'nursery';

export interface PrintPreferencesWithStudio {
  includeStamp?: boolean;
  includeSignatures?: boolean;
  stamp_config?: {
    shape?: 'circular' | 'rectangular' | 'oval';
    ink_color?: string;
    custom_text?: string;
    date?: string;
  };
  studio_overlays?: Record<string, Record<string, OverlayTransform>>;
}

export interface GradingBand {
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
}

export interface DivisionBoundary {
  division: string;
  minAggregate: number;
  maxAggregate: number;
}

interface ReportStudioClientProps {
  initialBranding?: BrandingConfig;
  initialPrintPreferences?: PrintPreferencesWithStudio;
  initialGradingScale?: GradingBand[];
  initialDivisionBoundaries?: DivisionBoundary[];
  initialActiveTemplate?: TemplateType;
  initialSettings?: Record<string, any>;
}

const TEMPLATE_OPTIONS: {
  id: TemplateType;
  label: string;
  shortLabel: string;
  reportType: StabilizedReportType;
}[] = [
    {
      id: 'primary-eot',
      label: 'Primary EOT Landscape',
      shortLabel: 'Primary EOT',
      reportType: 'PrimaryEOTReport',
    },
    {
      id: 'p7-eot',
      label: 'Primary Secular Portrait (P.7 / Non-Muslim)',
      shortLabel: 'Portrait Secular',
      reportType: 'P7EOTReport',
    },
    {
      id: 'primary-mot',
      label: 'Primary MOT',
      shortLabel: 'Primary MOT',
      reportType: 'PrimaryMOTReport',
    },
    {
      id: 'primary-bot',
      label: 'Primary BOT',
      shortLabel: 'Primary BOT',
      reportType: 'PrimaryBOTReport',
    },
    {
      id: 'nursery-eot',
      label: 'Nursery EOT',
      shortLabel: 'Nursery EOT',
      reportType: 'NurseryEOTReport',
    },
    {
      id: 'nursery-mot',
      label: 'Nursery MOT',
      shortLabel: 'Nursery MOT',
      reportType: 'NurseryMOTReport',
    },
    {
      id: 'nursery-theology-eot',
      label: 'Nursery Theology EOT',
      shortLabel: 'Nursery Theology',
      reportType: 'NurseryTheologyEOTReport',
    },
    {
      id: 'theology-mot',
      label: 'Theology 2-Up',
      shortLabel: 'Theology 2-Up',
      reportType: 'TheologyMOTReport',
    },
  ];

const SAMPLE_PROFILES: {
  id: SampleProfileId;
  label: string;
  student: {
    id: string;
    name: string;
    arabic_name: string;
    admission_number: string;
    class_name: string;
    theology_class_arabic: string;
    gender: string;
    religion: string;
    is_muslim: boolean;
  };
}[] = [
    {
      id: 'muslim',
      label: 'Muslim Student',
      student: {
        id: 'sample-muslim-p4',
        name: 'AISHA BINTI SULAIMAN',
        arabic_name: 'عائشة بنت سليمان',
        admission_number: 'JID-2026-042',
        class_name: 'P.4',
        theology_class_arabic: 'الصف الرابع',
        gender: 'Female',
        religion: 'Muslim',
        is_muslim: true,
      },
    },
    {
      id: 'non-muslim',
      label: 'Non-Muslim Student',
      student: {
        id: 'sample-non-muslim-p4',
        name: 'SSUUNA HARBERT',
        arabic_name: 'سونا هربرت',
        admission_number: 'JID-2026-108',
        class_name: 'P.4',
        theology_class_arabic: 'الصف الرابع',
        gender: 'Male',
        religion: 'Non-Muslim',
        is_muslim: false,
      },
    },
    {
      id: 'p7',
      label: 'P.7 Candidate',
      student: {
        id: 'sample-p7-candidate',
        name: 'ABDULLAH HASSAN KATO',
        arabic_name: 'عبد الله حسن كاتو',
        admission_number: 'JID-2026-007',
        class_name: 'P.7',
        theology_class_arabic: 'الصف السابع',
        gender: 'Male',
        religion: 'Muslim',
        is_muslim: true,
      },
    },
    {
      id: 'nursery',
      label: 'Nursery Pupil',
      student: {
        id: 'sample-nursery-pupil',
        name: 'ZAYNAB NAMUKASA',
        arabic_name: 'زينب ناموكاسا',
        admission_number: 'JID-2026-301',
        class_name: 'Top Class',
        theology_class_arabic: 'الروضة العليا',
        gender: 'Female',
        religion: 'Muslim',
        is_muslim: true,
      },
    },
  ];

// Authentic multi-stroke calligraphic fountain-pen SVG signatures seated directly on the dotted signature line
const SAMPLE_HEADTEACHER_SIG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 72"><g fill="none" stroke="#0C2A84" stroke-linecap="round" stroke-linejoin="round"><path d="M16 54 C28 20, 48 14, 54 38 C58 54, 42 58, 52 42 C64 22, 82 18, 86 44 C88 54, 102 28, 114 34 C124 38, 128 52, 140 36 C152 20, 166 48, 180 34 C194 20, 212 44, 242 26" stroke-width="2.9"/><path d="M26 50 C38 24, 52 22, 56 40" stroke-width="1.6" opacity="0.85"/><path d="M32 60 Q128 48 234 56" stroke-width="2.1"/><path d="M72 65 Q148 56 208 62" stroke-width="1.3" opacity="0.8"/><circle cx="218" cy="46" r="1.8" fill="#0C2A84" stroke="none"/></g></svg>`
  );

const SAMPLE_TEACHER_SIG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 68"><g fill="none" stroke="#0C2A84" stroke-linecap="round" stroke-linejoin="round"><path d="M18 52 C32 18, 52 16, 58 42 C62 54, 74 26, 88 34 C100 42, 108 52, 120 34 C132 18, 146 46, 162 34 C176 24, 192 44, 222 28" stroke-width="2.7"/><path d="M40 34 L74 30" stroke-width="1.8" opacity="0.9"/><path d="M28 58 Q122 48 214 54" stroke-width="1.9"/><circle cx="198" cy="44" r="1.6" fill="#0C2A84" stroke="none"/></g></svg>`
  );

type InspectorTab = 'theme' | 'typography' | 'watermark' | 'stamp';

export function ReportStudioClient({
  initialBranding,
  initialPrintPreferences = {},
  initialGradingScale = [],
  initialDivisionBoundaries = [],
  initialActiveTemplate = 'primary-eot',
  initialSettings,
}: ReportStudioClientProps) {
  const defaultBranding: BrandingConfig = {
    schoolName: initialSettings?.school_name || 'Jiddah Islamic Schools',
    schoolMotto: initialSettings?.motto || 'Striving for Life & The Hereafter',
    schoolAddress: initialSettings?.address || 'P.O. BOX 34008 Kampala (U)',
    schoolPhone: initialSettings?.phone || '+256705316961 / +256 787 779 909',
    schoolEmail: initialSettings?.email || 'jiddahislamicnurseryandpri@gmail.com',
    logoUrl: initialSettings?.logo_url || '/logo-512h.png',
    primaryColor: initialSettings?.theme_color || '#14532D',
    secondaryColor: '#C59B27',
    accentColor: '#7F1D1D',
    arabicSchoolName: initialSettings?.arabic_name || 'مدرسة جدة الإسلامية للروضة والإبتدائية',
  };
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(initialActiveTemplate);
  const [sampleProfileId, setSampleProfileId] = useState<SampleProfileId>('muslim');
  const [activeTab, setActiveTab] = useState<InspectorTab>('theme');
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls');
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding || defaultBranding);
  const [gradingScale, setGradingScale] = useState<GradingBand[]>(initialGradingScale);
  const [divisionBoundaries, setDivisionBoundaries] = useState<DivisionBoundary[]>(initialDivisionBoundaries);
  const [studioConfig, setStudioConfig] = useSyncedStudioConfig();
  const [zoom, setZoom] = useState<number>(0.85);
  const [isSaving, setIsSaving] = useState(false);
  const [liveSignatures, setLiveSignatures] = useState<Record<string, string>>({
    'head-teacher': SAMPLE_HEADTEACHER_SIG,
    'class-teacher-p4': SAMPLE_TEACHER_SIG,
    'class-teacher-p7': SAMPLE_TEACHER_SIG,
    'class-teacher-top': SAMPLE_TEACHER_SIG,
    'class-teacher-middle': SAMPLE_TEACHER_SIG,
    'class-teacher-baby': SAMPLE_TEACHER_SIG,
    'theology-teacher-top': SAMPLE_TEACHER_SIG,
  });

  // Load real uploaded signatures if available so the studio preview shows the school's real signatures
  useEffect(() => {
    let cancelled = false;
    async function fetchRealSignatures() {
      try {
        const res = await fetch('/api/signatures');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || typeof data !== 'object') return;
        const map: Record<string, string> = {};
        if (Array.isArray(data.signatures)) {
          for (const item of data.signatures) {
            if (item?.slot && item?.url) map[item.slot] = item.url;
          }
        } else if (data.signatures && typeof data.signatures === 'object') {
          Object.assign(map, data.signatures);
        }
        if (Object.keys(map).length > 0) {
          setLiveSignatures((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // Keep clean SVG sample signatures
      }
    }
    fetchRealSignatures();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStudio = useCallback(
    (partial: Partial<StudioFormattingConfig>) => {
      setStudioConfig((prev) => {
        const next = normalizeStudioConfig({ ...prev, ...partial });
        if (partial.colorTheme) {
          const themePreset = STUDIO_COLOR_THEMES[partial.colorTheme];
          if (themePreset) {
            next.primaryColor = themePreset.primary;
            next.secondaryColor = themePreset.secondary;
            next.accentColor = themePreset.accent;
            setBranding((b) => ({
              ...b,
              primaryColor: themePreset.primary,
              secondaryColor: themePreset.secondary,
              accentColor: themePreset.accent,
            }));
          }
        }
        return next;
      });
    },
    [setStudioConfig]
  );

  const updateBrandingField = useCallback(
    (patch: Partial<BrandingConfig>) => {
      setBranding((prev) => {
        const updated = { ...prev, ...patch };
        setStudioConfig((curr) =>
          normalizeStudioConfig({
            ...curr,
            primaryColor: updated.primaryColor,
            secondaryColor: updated.secondaryColor,
            accentColor: updated.accentColor,
            schoolHeader: {
              ...curr.schoolHeader,
              nameEnglish: updated.schoolName,
              nameArabic: updated.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية',
              address: updated.schoolAddress,
              phone: updated.schoolPhone,
              email: updated.schoolEmail,
              motto: updated.schoolMotto,
              logoUrl: updated.logoUrl,
            },
          })
        );
        return updated;
      });
    },
    [setStudioConfig]
  );

  const handleTemplateSelect = (tpl: TemplateType) => {
    setActiveTemplate(tpl);
    if (tpl === 'p7-eot') {
      if (sampleProfileId !== 'p7') {
        setSampleProfileId('non-muslim');
      }
    } else if (
      tpl === 'nursery-eot' ||
      tpl === 'nursery-mot' ||
      tpl === 'nursery-theology-eot'
    ) {
      setSampleProfileId('nursery');
    } else if (
      tpl === 'primary-eot' ||
      tpl === 'primary-mot' ||
      tpl === 'primary-bot' ||
      tpl === 'theology-mot'
    ) {
      setSampleProfileId('muslim');
    }
  };

  const handleStepTemplate = (direction: -1 | 1) => {
    const idx = TEMPLATE_OPTIONS.findIndex((t) => t.id === activeTemplate);
    const nextIdx = (idx + direction + TEMPLATE_OPTIONS.length) % TEMPLATE_OPTIONS.length;
    handleTemplateSelect(TEMPLATE_OPTIONS[nextIdx].id);
  };

  const handleResetDefaults = () => {
    setStudioConfig(DEFAULT_STUDIO_CONFIG);
    saveStudioConfigToStorage(DEFAULT_STUDIO_CONFIG);
    setBranding((prev) => ({
      ...prev,
      primaryColor: DEFAULT_STUDIO_CONFIG.primaryColor || '#14532D',
      secondaryColor: DEFAULT_STUDIO_CONFIG.secondaryColor || '#C59B27',
      accentColor: DEFAULT_STUDIO_CONFIG.accentColor || '#7F1D1D',
    }));
    toast.success('Studio formatting reset to defaults.');
  };

  const handleSaveAndApplyAll = async () => {
    setIsSaving(true);
    try {
      const normalized = normalizeStudioConfig({
        ...studioConfig,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        schoolHeader: {
          nameEnglish: branding.schoolName,
          nameArabic: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية',
          address: branding.schoolAddress,
          phone: branding.schoolPhone,
          email: branding.schoolEmail,
          motto: branding.schoolMotto,
          logoUrl: branding.logoUrl,
        },
      });
      saveStudioConfigToStorage(normalized);

      const [studioSaved, schoolRes, brandingRes] = await Promise.all([
        persistStudioConfigGlobally(normalized),
        fetch('/api/settings/school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_name: branding.schoolName,
            arabic_name: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية',
            motto: branding.schoolMotto,
            address: branding.schoolAddress,
            phone: branding.schoolPhone,
            email: branding.schoolEmail,
            logo_url: branding.logoUrl,
            theme_color: branding.primaryColor,
            report_studio_config: normalized,
          }),
        }).catch(() => null),
        fetch('/api/settings/school/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...branding,
            grading_scale: gradingScale,
            division_boundaries: divisionBoundaries,
            print_preferences: {
              ...initialPrintPreferences,
              includeStamp: normalized.stampEnabled,
              includeSignatures: normalized.signaturesEnabled,
              stamp_config: {
                ...initialPrintPreferences?.stamp_config,
                ink_color: normalized.stampInkColor,
                date: normalized.stampDate,
              },
            },
          }),
        }).catch(() => null),
      ]);

      if (studioSaved || (schoolRes && schoolRes.ok) || (brandingRes && brandingRes.ok)) {
        toast.success('Saved & applied to all reports across Report Center and School Settings!');
      } else {
        toast.success('Saved & applied across all reports in this browser.');
      }
    } catch {
      toast.error('Saved locally; could not sync with server.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSampleProfile = useMemo(
    () => SAMPLE_PROFILES.find((p) => p.id === sampleProfileId) || SAMPLE_PROFILES[0],
    [sampleProfileId]
  );

  const sampleReportData = useMemo(() => {
    const isNurseryTemplate =
      activeTemplate === 'nursery-eot' ||
      activeTemplate === 'nursery-mot' ||
      activeTemplate === 'nursery-theology-eot';
    const student = isNurseryTemplate
      ? SAMPLE_PROFILES.find((p) => p.id === 'nursery')!.student
      : activeSampleProfile.student;

    const primarySubjects = [
      {
        subject_name: 'English',
        bot_score: 86,
        bot_grade_display: 'D1',
        bot_agg: 'D1',
        mot_score: 88,
        mot_grade_display: 'D1',
        mot_agg: 'D1',
        eot_score: 92,
        eot_grade_display: 'D1',
        eot_agg: 'D1',
        score: 92,
        grade: 'D1',
        is_core: true,
        remark: 'EXCELLENT',
        teacher_initials: 'M.K',
      },
      {
        subject_name: 'Mathematics',
        bot_score: 82,
        bot_grade_display: 'D2',
        bot_agg: 'D2',
        mot_score: 85,
        mot_grade_display: 'D2',
        mot_agg: 'D2',
        eot_score: 89,
        eot_grade_display: 'D2',
        eot_agg: 'D2',
        score: 89,
        grade: 'D2',
        is_core: true,
        remark: 'VERY GOOD',
        teacher_initials: 'A.S',
      },
      {
        subject_name: 'Science',
        bot_score: 80,
        bot_grade_display: 'D2',
        bot_agg: 'D2',
        mot_score: 84,
        mot_grade_display: 'D2',
        mot_agg: 'D2',
        eot_score: 86,
        eot_grade_display: 'D2',
        eot_agg: 'D2',
        score: 86,
        grade: 'D2',
        is_core: true,
        remark: 'VERY GOOD',
        teacher_initials: 'J.O',
      },
      {
        subject_name: 'SST',
        bot_score: 85,
        bot_grade_display: 'D1',
        bot_agg: 'D1',
        mot_score: 88,
        mot_grade_display: 'D1',
        mot_agg: 'D1',
        eot_score: 91,
        eot_grade_display: 'D1',
        eot_agg: 'D1',
        score: 91,
        grade: 'D1',
        is_core: true,
        remark: 'EXCELLENT',
        teacher_initials: 'R.N',
      },
    ];

    const nurserySubjects = [
      {
        subject_name: 'Reading & Language',
        mot_score: 92,
        eot_score: 95,
        score: 95,
        grade: 'A',
        remark: 'EXCELLENT',
        teacher_initials: 'F.N',
      },
      {
        subject_name: 'Numbers',
        mot_score: 88,
        eot_score: 91,
        score: 91,
        grade: 'A',
        remark: 'EXCELLENT',
        teacher_initials: 'F.N',
      },
      {
        subject_name: 'Health Habits',
        mot_score: 85,
        eot_score: 88,
        score: 88,
        grade: 'B',
        remark: 'VERY GOOD',
        teacher_initials: 'H.A',
      },
      {
        subject_name: 'Writing',
        mot_score: 82,
        eot_score: 86,
        score: 86,
        grade: 'B',
        remark: 'VERY GOOD',
        teacher_initials: 'F.N',
      },
      {
        subject_name: 'Drawing & Art',
        mot_score: 90,
        eot_score: 94,
        score: 94,
        grade: 'A',
        remark: 'EXCELLENT',
        teacher_initials: 'S.K',
      },
    ];

    return {
      id: `studio-preview-${activeTemplate}-${student.id}`,
      student,
      term: {
        name: 'Term 1',
        term_number: 1,
        academic_year: '2026',
        end_date: '2026-04-24',
        next_term_start: '2026-05-18',
        next_term_start_boarders: '2026-05-16',
        next_term_start_day: '2026-05-18',
      },
      branding: {
        schoolName: branding.schoolName,
        address: branding.schoolAddress,
        phone: branding.schoolPhone,
        email: branding.schoolEmail,
        motto: branding.schoolMotto,
        logoUrl: branding.logoUrl || '/logo-512h.png',
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        primaryFont: studioConfig.fontFamily,
        themePreset: studioConfig.colorTheme,
      },
      settings: {
        school_name: branding.schoolName,
        arabic_name: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية',
        address: branding.schoolAddress,
        phone: branding.schoolPhone,
        email: branding.schoolEmail,
        motto: branding.schoolMotto,
        logo_url: branding.logoUrl || '/logo-512h.png',
        primary_color: branding.primaryColor,
        secondary_color: branding.secondaryColor,
        accent_color: branding.accentColor,
        grading_scale: gradingScale,
        division_boundaries: divisionBoundaries,
        report_studio_config: studioConfig,
        print_preferences: {
          ...initialPrintPreferences,
          includeStamp: studioConfig.stampEnabled,
          includeSignatures: studioConfig.signaturesEnabled,
          stamp_config: {
            ...initialPrintPreferences?.stamp_config,
            ink_color: studioConfig.stampInkColor,
            date: studioConfig.stampDate || '24 APR 2026',
          },
        },
      },
      gradingBands: gradingScale,
      divisionBoundaries,
      circular: {
        subjects: isNurseryTemplate ? nurserySubjects : primarySubjects,
        bot_total: 333,
        bot_aggregate: 6,
        bot_division: 'I',
        mot_total: 345,
        mot_aggregate: 6,
        mot_division: 'I',
        eot_total: 358,
        eot_aggregate: 6,
        eot_division: 'I',
        total: 358,
        average: 89.5,
        aggregate: 6,
        division: 'I',
        position: 2,
        total_students: 38,
        class_teacher_comment: 'Impressive performance, thank you.',
        head_teacher_comment: 'Excellent results, keep shining!',
        conduct_remark: 'Very Good',
      },
      theology: {
        subjects: [
          {
            subject_name: 'القرآن الكريم',
            subject_name_arabic: 'القرآن الكريم',
            mot_score: 92,
            eot_score: 95,
            score: 95,
            grade: 'ممتاز',
            teacher_initials: 'ع.م',
          },
          {
            subject_name: 'الفقه',
            subject_name_arabic: 'الفقه',
            mot_score: 86,
            eot_score: 89,
            score: 89,
            grade: 'جيد جدا',
            teacher_initials: 'ح.س',
          },
          {
            subject_name: 'التوحيد',
            subject_name_arabic: 'التوحيد',
            mot_score: 88,
            eot_score: 91,
            score: 91,
            grade: 'ممتاز',
            teacher_initials: 'م.أ',
          },
          {
            subject_name: 'اللغة العربية',
            subject_name_arabic: 'اللغة العربية',
            mot_score: 84,
            eot_score: 88,
            score: 88,
            grade: 'جيد جدا',
            teacher_initials: 'ي.ك',
          },
          {
            subject_name: 'التربية الإسلامية',
            subject_name_arabic: 'التربية الإسلامية',
            mot_score: 90,
            eot_score: 93,
            score: 93,
            grade: 'ممتاز',
            teacher_initials: 'س.ن',
          },
        ],
        mot_total: 440,
        eot_total: 456,
        total: 456,
        average: 91.2,
        division: 'ممتاز',
        position: 3,
        total_students: 38,
        theology_position: 3,
        theology_total_students: 38,
      },
      theology_position: 3,
      theology_total_students: 38,
      meta: {
        is_term_3: false,
        position: 2,
        total_students: 38,
        theology_position: 3,
        theology_total_students: 38,
      },
      signatures: liveSignatures,
      stamp_date: studioConfig.stampDate || '24 APR 2026',
    };
  }, [
    activeTemplate,
    activeSampleProfile,
    branding,
    gradingScale,
    divisionBoundaries,
    studioConfig,
    initialPrintPreferences,
    liveSignatures,
  ]);

  const activeTemplateMeta = useMemo(
    () => TEMPLATE_OPTIONS.find((t) => t.id === activeTemplate) || TEMPLATE_OPTIONS[0],
    [activeTemplate]
  );

  const renderActiveTemplateNode = () => {
    switch (activeTemplate) {
      case 'primary-eot':
        return <PrimaryEOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'p7-eot':
        return <P7EOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'primary-mot':
        return <PrimaryMOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'primary-bot':
        return <PrimaryBOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'nursery-eot':
        return <NurseryEOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'nursery-mot':
        return <NurseryMOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'nursery-theology-eot':
        return <NurseryTheologyEOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      case 'theology-mot':
        return <TheologyMOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
      default:
        return <PrimaryEOTReport reportData={sampleReportData} studioFormatting={studioConfig} />;
    }
  };

  return (
    <StudioFormattingProvider value={studioConfig}>
      <div
        data-testid="report-studio-2-root"
        className="flex flex-col h-[calc(100dvh-16px)] bg-[#F3F6F4] dark:bg-[#0D1310] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 overflow-hidden"
      >
        {/* Top Studio Header Bar (100% Responsive Single-Row Layout — Zero Horizontal Clipping) */}
        <header className="h-13 px-3 bg-white dark:bg-[#151D1A] border-b border-stone-200 dark:border-white/10 flex items-center justify-between gap-2 w-full max-w-full overflow-hidden shrink-0 z-20">
          {/* Left Group */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/reports"
              className="h-8 px-2.5 sm:px-3 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-bold text-stone-800 dark:text-stone-100 inline-flex items-center gap-1.5 transition shrink-0"
              title="Back to Report Center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Report Center</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h1 className="text-xs font-black tracking-tight text-stone-900 dark:text-white leading-tight">
                  Report Studio 2.0
                </h1>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  Live Document Engine
                </p>
              </div>
            </div>
          </div>

          {/* Center Group: Compact Template Selector + Prev/Next Stepper + Sample Archetype */}
          <div
            data-testid="studio-template-switcher"
            className="flex items-center gap-1.5 min-w-0 flex-1 justify-center"
          >
            <div className="flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#1E2623] p-1 rounded-xl border border-black/[0.05] dark:border-white/[0.08] min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => handleStepTemplate(-1)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Previous Template"
                aria-label="Previous Template"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                id="studio-template-select"
                data-testid="studio-template-select"
                value={activeTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value as TemplateType)}
                className="h-7 px-2 rounded-lg bg-white dark:bg-[#151D1A] border border-stone-200/80 dark:border-white/10 text-xs font-bold text-stone-900 dark:text-white min-w-0 max-w-[160px] sm:max-w-[240px] md:max-w-[300px] truncate cursor-pointer"
                aria-label="Select Report Template"
              >
                {TEMPLATE_OPTIONS.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleStepTemplate(1)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Next Template"
                aria-label="Next Template"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#1E2623] p-1 rounded-xl border border-black/[0.05] dark:border-white/[0.08] shrink-0">
              {SAMPLE_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSampleProfileId(prof.id)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition cursor-pointer ${
                    sampleProfileId === prof.id
                      ? 'bg-[#0D5C3A] text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {prof.id === 'muslim'
                    ? 'Muslim'
                    : prof.id === 'non-muslim'
                      ? 'Non-Muslim'
                      : prof.id === 'p7'
                        ? 'P.7'
                        : 'Nursery'}
                </button>
              ))}
            </div>
          </div>

          {/* Right Group: Reset + Save & Apply to All Reports CTA */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="h-8 px-2.5 rounded-xl border border-stone-200 dark:border-white/15 bg-white dark:bg-[#1E2623] text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 transition inline-flex items-center gap-1 cursor-pointer shrink-0"
              title="Reset Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              data-testid="studio-save-apply-all"
              onClick={handleSaveAndApplyAll}
              disabled={isSaving}
              className="h-8 px-3 sm:px-3.5 rounded-xl bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {isSaving ? 'Saving...' : 'Save & Apply to All Reports'}
              </span>
              <span className="md:hidden">{isSaving ? 'Saving...' : 'Save & Apply'}</span>
            </button>
          </div>
        </header>

        {/* Responsive Mobile/Tablet View Switcher (< lg) */}
        <div
          data-testid="studio-mobile-view-switcher"
          className="lg:hidden grid grid-cols-2 gap-1.5 px-3 py-2 bg-white dark:bg-[#151D1A] border-b border-stone-200 dark:border-white/10 shrink-0"
        >
          <button
            type="button"
            onClick={() => setMobileView('controls')}
            className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileView === 'controls'
                ? 'bg-[#0D5C3A] text-white shadow-2xs'
                : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize Controls</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileView === 'preview'
                ? 'bg-[#0D5C3A] text-white shadow-2xs'
                : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Report Preview</span>
          </button>
        </div>

        {/* 2-Pane Workspace: Left Inspector Dock (w-[340px] on lg+) + Right Live Sample Preview Stage */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          {/* Left Inspector Dock */}
          <aside
            data-testid="studio-left-inspector"
            className={`w-full lg:w-[340px] bg-white dark:bg-[#151D1A] border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-white/10 flex-col shrink-0 flex-1 lg:flex-initial overflow-hidden ${
              mobileView === 'controls' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* 4 Inspector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-[#F0F4F9] dark:bg-[#1E2623] border-b border-stone-200 dark:border-white/10 shrink-0">
              {[
                { id: 'theme' as const, label: 'Theme', fullLabel: 'Theme & Colors', icon: Palette },
                { id: 'typography' as const, label: 'Type', fullLabel: 'Typography & Layout', icon: Type },
                { id: 'watermark' as const, label: 'Art', fullLabel: 'Watermark & Nursery Art', icon: Sparkles },
                { id: 'stamp' as const, label: 'Stamp', fullLabel: 'Stamp & Signatures', icon: Stamp },
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.fullLabel}
                    className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${activeTab === tab.id
                        ? 'bg-[#0D5C3A] text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* TAB 1: THEME & COLORS */}
              {activeTab === 'theme' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Theme & Colors
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Choose a curated school palette or customize primary, secondary, and header accent colors live.
                      </p>
                    </div>
                  </div>

                  {/* 5 Curated School Palettes */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Curated School Palettes
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.values(STUDIO_COLOR_THEMES).map((theme) => {
                        const isSelected = studioConfig.colorTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => updateStudio({ colorTheme: theme.id })}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${isSelected
                              ? 'border-[#0D5C3A] bg-[#0D5C3A]/5 dark:bg-[#0D5C3A]/20 shadow-2xs'
                              : 'border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/5'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center -space-x-1.5">
                                <span
                                  className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                                  style={{ backgroundColor: theme.primary }}
                                />
                                <span
                                  className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                                  style={{ backgroundColor: theme.secondary }}
                                />
                                <span
                                  className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                                  style={{ backgroundColor: theme.accent }}
                                />
                              </div>
                              <span className="font-bold text-stone-800 dark:text-stone-100 text-xs">
                                {theme.label}
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#0D5C3A]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Color Pickers */}
                  <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Custom Brand Accent Colors
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          Primary
                        </label>
                        <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-[#1E2623] p-1.5 rounded-lg border border-stone-200 dark:border-white/10">
                          <input
                            type="color"
                            value={branding.primaryColor}
                            onChange={(e) => {
                              updateBrandingField({ primaryColor: e.target.value });
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-stone-600 dark:text-stone-300">
                            {branding.primaryColor}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          Secondary
                        </label>
                        <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-[#1E2623] p-1.5 rounded-lg border border-stone-200 dark:border-white/10">
                          <input
                            type="color"
                            value={branding.secondaryColor}
                            onChange={(e) => {
                              updateBrandingField({ secondaryColor: e.target.value });
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-stone-600 dark:text-stone-300">
                            {branding.secondaryColor}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          Header Accent
                        </label>
                        <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-[#1E2623] p-1.5 rounded-lg border border-stone-200 dark:border-white/10">
                          <input
                            type="color"
                            value={branding.accentColor}
                            onChange={(e) => {
                              updateBrandingField({ accentColor: e.target.value });
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-stone-600 dark:text-stone-300">
                            {branding.accentColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* School Identity Quick Edit */}
                  <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      School Header Identity
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        School Name (English)
                      </label>
                      <input
                        type="text"
                        value={branding.schoolName}
                        onChange={(e) => updateBrandingField({ schoolName: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        School Name (Arabic)
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={branding.arabicSchoolName || ''}
                        onChange={(e) => updateBrandingField({ arabicSchoolName: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                          Address / P.O. Box
                        </label>
                        <input
                          type="text"
                          value={branding.schoolAddress}
                          onChange={(e) => updateBrandingField({ schoolAddress: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={branding.schoolPhone}
                          onChange={(e) => updateBrandingField({ schoolPhone: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Email
                      </label>
                      <input
                        type="text"
                        value={branding.schoolEmail}
                        onChange={(e) => updateBrandingField({ schoolEmail: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        School Motto
                      </label>
                      <input
                        type="text"
                        value={branding.schoolMotto}
                        onChange={(e) => updateBrandingField({ schoolMotto: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-200 dark:border-white/10 rounded-lg bg-stone-50 dark:bg-[#1E2623]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TYPOGRAPHY & LAYOUT */}
              {activeTab === 'typography' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Typography & Layout
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Control font families, scaling, bold emphasis, comment font size, and page density across all report templates.
                      </p>
                    </div>
                  </div>

                  {/* Font Family Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Font Family
                    </label>
                    <select
                      value={studioConfig.fontFamily}
                      onChange={(e) => updateStudio({ fontFamily: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623] border border-stone-200 dark:border-white/10 text-xs font-bold text-stone-800 dark:text-stone-100 cursor-pointer"
                    >
                      {STUDIO_FONT_FAMILIES.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Scale Stepper (85% to 115%) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Font Scale (85% – 115%)
                      </span>
                      <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                        {studioConfig.fontSize}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateStudio({ fontSize: Math.max(85, studioConfig.fontSize - 5) })}
                        className="h-8 px-3 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] font-bold text-xs cursor-pointer"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min={85}
                        max={115}
                        step={5}
                        value={studioConfig.fontSize}
                        onChange={(e) => updateStudio({ fontSize: Number(e.target.value) })}
                        className="flex-1 accent-[#0D5C3A]"
                      />
                      <button
                        type="button"
                        onClick={() => updateStudio({ fontSize: Math.min(115, studioConfig.fontSize + 5) })}
                        className="h-8 px-3 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] font-bold text-xs cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Bold Scores/Headings Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                    <div>
                      <div className="font-bold text-stone-800 dark:text-stone-100">Bold Scores & Headings</div>
                      <div className="text-[10px] text-stone-500">High-contrast print legibility</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStudio({ isBold: !studioConfig.isBold })}
                      className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.isBold ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                        }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Comment Font Size */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Comment Font Size
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: 'normal', label: 'Normal' },
                        { id: 'large', label: 'Large' },
                        { id: 'xlarge', label: 'X-Large' },
                      ] as const).map((sizeOpt) => (
                        <button
                          key={sizeOpt.id}
                          type="button"
                          onClick={() => updateStudio({ commentFontSize: sizeOpt.id })}
                          className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${(studioConfig.commentFontSize || 'large') === sizeOpt.id
                            ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                            : 'bg-stone-50 dark:bg-[#1E2623] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                            }`}
                        >
                          {sizeOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Margin / Padding Density */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Page Margin / Padding Density
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['compact', 'balanced', 'spacious'] as const).map((density) => (
                        <button
                          key={density}
                          type="button"
                          onClick={() => updateStudio({ pageDensity: density })}
                          className={`py-2 rounded-lg text-xs font-bold capitalize border transition cursor-pointer ${(studioConfig.pageDensity || 'balanced') === density
                            ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                            : 'bg-stone-50 dark:bg-[#1E2623] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                            }`}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WATERMARK & NURSERY ART */}
              {activeTab === 'watermark' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Watermark & Nursery Art
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Configure the central school crest watermark and blended educative Nursery background art.
                      </p>
                    </div>
                  </div>

                  {/* Central School Crest Watermark Opacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100">
                        Central School Crest Watermark Opacity
                      </span>
                      <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                        {studioConfig.watermarkOpacity}%
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 4, 8, 12, 15].map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => updateStudio({ watermarkOpacity: op })}
                          className={`py-1.5 rounded-lg text-xs font-bold tabular-nums cursor-pointer transition ${studioConfig.watermarkOpacity === op
                            ? 'bg-[#0D5C3A] text-white shadow-2xs'
                            : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-300'
                            }`}
                        >
                          {op}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle for Nursery Educative Background Artwork */}
                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-700/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            Nursery Educative Background Artwork
                          </div>
                          <div className="text-[10.5px] text-stone-500">
                            A B C blocks, 1 2 3 numerals, storybooks, giraffe, baby elephant & lion cub
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStudio({ showNurseryArt: !studioConfig.showNurseryArt })}
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer shrink-0 ${studioConfig.showNurseryArt ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    {studioConfig.showNurseryArt && (
                      <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-stone-700 dark:text-stone-300">
                            Nursery Art Opacity (4% – 12%)
                          </span>
                          <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                            {studioConfig.nurseryArtOpacity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={12}
                          step={1}
                          value={studioConfig.nurseryArtOpacity}
                          onChange={(e) => updateStudio({ nurseryArtOpacity: Number(e.target.value) })}
                          className="w-full accent-[#0D5C3A]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: STAMP & SIGNATURES */}
              {activeTab === 'stamp' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Stamp & Signatures
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Configure the authentic Jiddah Headteacher vector rubber stamp and transparent ink signatures.
                      </p>
                    </div>
                  </div>

                  {/* Official Headteacher Stamp Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                    <div>
                      <div className="font-bold text-stone-800 dark:text-stone-100">
                        Official Headteacher Stamp
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Authentic Jiddah vector rubber stamp
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStudio({ stampEnabled: !studioConfig.stampEnabled })}
                      className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.stampEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                        }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {studioConfig.stampEnabled && (
                    <div className="space-y-3.5 pl-1">
                      {/* Stamp Mode */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Stamp Mode
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateStudio({ stampMode: 'digital' })}
                            className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${studioConfig.stampMode === 'digital'
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                              : 'bg-stone-50 dark:bg-[#1E2623] text-stone-700 dark:text-stone-300 border-stone-200'
                              }`}
                          >
                            Digital Vector
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudio({ stampMode: 'uploaded' })}
                            className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${studioConfig.stampMode === 'uploaded'
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                              : 'bg-stone-50 dark:bg-[#1E2623] text-stone-700 dark:text-stone-300 border-stone-200'
                              }`}
                          >
                            Uploaded Image Backup
                          </button>
                        </div>
                      </div>

                      {/* Stamp Ink Color Swatches */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Stamp Ink Color
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {STUDIO_STAMP_INK_COLORS.map((ink) => (
                            <button
                              key={ink.id}
                              type="button"
                              onClick={() => updateStudio({ stampInkColor: ink.id })}
                              className={`p-2 rounded-lg border flex items-center gap-2 transition cursor-pointer ${studioConfig.stampInkColor === ink.id
                                ? 'border-[#0D5C3A] bg-[#0D5C3A]/5 font-bold'
                                : 'border-stone-200 dark:border-white/10'
                                }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: ink.id }}
                              />
                              <span className="text-[11px] truncate">{ink.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stamp Date Input */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Stamp Date
                        </label>
                        <input
                          type="text"
                          value={studioConfig.stampDate}
                          onChange={(e) => updateStudio({ stampDate: e.target.value.toUpperCase() })}
                          placeholder="24 OCT 2026"
                          className="w-full h-8 px-2.5 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] border border-stone-200 dark:border-white/10 text-xs font-bold"
                        />
                      </div>

                      {/* Stamp Scale (85% - 115%) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Stamp Scale (85% – 115%)
                          </span>
                          <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                            {studioConfig.stampScale}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={85}
                          max={115}
                          step={5}
                          value={studioConfig.stampScale}
                          onChange={(e) => updateStudio({ stampScale: Number(e.target.value) })}
                          className="w-full accent-[#0D5C3A]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Teacher & Headteacher Signatures Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                    <div>
                      <div className="font-bold text-stone-800 dark:text-stone-100">
                        Teacher & Headteacher Signatures
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Auto background-stripped transparent ink
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStudio({ signaturesEnabled: !studioConfig.signaturesEnabled })}
                      className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.signaturesEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                        }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Signature Ink Contrast / Threshold Slider */}
                  {studioConfig.signaturesEnabled && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Signature Ink Contrast / Threshold
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.signatureThreshold}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={160}
                        max={240}
                        step={5}
                        value={studioConfig.signatureThreshold}
                        onChange={(e) => updateStudio({ signatureThreshold: Number(e.target.value) })}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right Live Sample Preview Stage */}
          <main
            data-testid="studio-live-preview-stage"
            data-canvas-scroll
            className={`flex-1 bg-[#E6ECE8] dark:bg-[#0D1310] overflow-auto relative flex-col items-center justify-start p-3 sm:p-8 ${
              mobileView === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(13,92,58,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* Floating Preview Status, Sample Archetype Switcher & Zoom Pill */}
            <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#151D1A]/95 border border-black/10 dark:border-white/15 shadow-md text-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#0D5C3A]" />
              <span className="font-bold text-stone-800 dark:text-stone-100">
                {activeTemplateMeta.label}
              </span>
              <span className="text-stone-400">•</span>
              <div
                data-testid="studio-sample-archetype-switcher"
                className="flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#1E2623] p-0.5 rounded-full border border-black/[0.05] dark:border-white/[0.08]"
              >
                {SAMPLE_PROFILES.map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setSampleProfileId(prof.id)}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap transition cursor-pointer ${sampleProfileId === prof.id
                        ? 'bg-[#0D5C3A] text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                      }`}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-3.5 bg-stone-300 dark:bg-white/15 mx-1" />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-[11px] tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.85)}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#0D5C3A]" />
              </button>
            </div>

            {/* Live Rendered Sample Report Card */}
            <ReportPreviewCell
              reportType={activeTemplateMeta.reportType}
              zoom={zoom}
              studioFormatting={studioConfig}
              isActive={true}
            >
              <div
                style={{
                  fontSize: `${studioConfig.fontSize}%`,
                  fontWeight: studioConfig.isBold ? 600 : 'normal',
                  width: '100%',
                  height: '100%',
                }}
              >
                {renderActiveTemplateNode()}
              </div>
            </ReportPreviewCell>
          </main>
        </div>
      </div>
    </StudioFormattingProvider>
  );
}

export default ReportStudioClient;

