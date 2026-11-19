'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ChevronDown,
  Layers,
  ShieldCheck,
  Move,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getLiveIsoDateString,
  getLiveStampDateString,
  resolveEffectiveStampDate,
} from '@/lib/stamp-date';

import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport';
import P7EOTReport from '@/components/reports/P7EOTReport';
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport';
import PrimaryBOTReport from '@/components/reports/PrimaryBOTReport';
import NurseryEOTReport from '@/components/reports/NurseryEOTReport';
import NurseryMOTReport from '@/components/reports/NurseryMOTReport';
import NurseryTheologyEOTReport from '@/components/reports/NurseryTheologyEOTReport';
import TheologyMOTReport from '@/components/reports/TheologyMOTReport';
import { ReportPreviewCell } from '@/components/reports/ReportPreviewCell';
import { STABILIZED_REPORT_ORIENTATIONS } from '@/lib/report-constants';
import { CustomPillSelect } from '@/components/ui/custom-pill-select';
import { ColorWheelPicker } from '@/components/ui/color-wheel-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { StabilizedReportType } from '@/types/report';
import {
  DEFAULT_STUDIO_CONFIG,
  STUDIO_COLOR_THEMES,
  STUDIO_ENGLISH_FONT_FAMILIES,
  STUDIO_ARABIC_FONT_FAMILIES,
  STUDIO_STAMP_INK_COLORS,
  STUDIO_SIGNATURE_INK_COLORS,
  useSyncedStudioConfig,
  persistStudioConfigGlobally,
  saveStudioConfigToStorage,
  normalizeStudioConfig,
  getCurriculumGroupTemplates,
  StudioFormattingProvider,
  type StudioFormattingConfig,
  type ReportTemplateId,
  type StudioArtPreset,
  type StudioWatermarkStyle,
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
  badgeHighlightColor?: string;
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

export type TemplateType = ReportTemplateId;
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
    { id: 'primary-eot', label: 'Primary EOT Landscape', shortLabel: 'Primary EOT', reportType: 'PrimaryEOTReport' },
    { id: 'p7-eot', label: 'Primary Secular Portrait (P.7 / Non-Muslim)', shortLabel: 'Portrait Secular', reportType: 'P7EOTReport' },
    { id: 'primary-mot', label: 'Primary MOT', shortLabel: 'Primary MOT', reportType: 'PrimaryMOTReport' },
    { id: 'primary-bot', label: 'Primary BOT', shortLabel: 'Primary BOT', reportType: 'PrimaryBOTReport' },
    { id: 'nursery-eot', label: 'Nursery EOT', shortLabel: 'Nursery EOT', reportType: 'NurseryEOTReport' },
    { id: 'nursery-mot', label: 'Nursery MOT', shortLabel: 'Nursery MOT', reportType: 'NurseryMOTReport' },
    { id: 'nursery-theology-eot', label: 'Nursery Theology EOT', shortLabel: 'Nursery Theology', reportType: 'NurseryTheologyEOTReport' },
    { id: 'theology-mot', label: 'Theology 2-Up', shortLabel: 'Theology 2-Up', reportType: 'TheologyMOTReport' },
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

const ART_PRESET_OPTIONS: { id: StudioArtPreset; label: string; desc: string }[] = [
  { id: 'default', label: 'Template Default', desc: 'Islamic Garden on Theology; Safari & Literacy on Secular Nursery' },
  { id: 'islamic-nursery', label: 'Islamic Garden & Arabic Alphabet', desc: 'Arabic letters أ ب ت, numerals ١–١٠, Mushaf on Rehal, fanous & palm' },
  { id: 'safari', label: 'Safari Wildlife & Nature', desc: 'Giraffe, Lion Cub, Baby Elephant, Acacia & Stars' },
  { id: 'abc-literacy', label: 'ABC & 123 Early Literacy', desc: 'Alphabet blocks, counting numerals, abacus, books' },
  { id: 'stem-explorers', label: 'STEM & Little Explorers', desc: 'Globe, telescope, rocket, atoms & science badges' },
  { id: 'islamic-arabesque', label: 'Islamic Geometric & Crescent Arabesque', desc: '8-point Rub el Hizb stars & arabesque corners' },
  { id: 'certificate-filigree', label: 'Classic Certificate Filigree', desc: 'Ornamental academic corner flourishes' },
  { id: 'none', label: 'None (Clean Paper)', desc: 'Minimal white archival card backdrop' },
];

const WATERMARK_STYLE_OPTIONS: { id: StudioWatermarkStyle; label: string }[] = [
  { id: 'crest', label: 'Official School Crest (Default)' },
  { id: 'crest-star', label: 'Crest + Islamic Star Frame' },
  { id: 'laurel-seal', label: 'Academic Laurel Seal' },
  { id: 'none', label: 'Hidden (0%)' },
];

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

function SectionHeaderWithReset({
  title,
  onReset,
}: {
  title: string;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {title}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset Default"
            className="w-6 h-6 rounded-md text-stone-500 hover:text-[#0D5C3A] dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-white/10 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {`Reset ${title} to Default`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

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
    badgeHighlightColor: '#0D5C3A',
    arabicSchoolName:
      initialSettings?.arabic_name || 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
  };

  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(initialActiveTemplate);
  const [sampleProfileId, setSampleProfileId] = useState<SampleProfileId>('muslim');
  const [activeTab, setActiveTab] = useState<InspectorTab>('theme');
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls');
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [dragStampMode, setDragStampMode] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding || defaultBranding);
  const [gradingScale] = useState<GradingBand[]>(initialGradingScale);
  const [divisionBoundaries] = useState<DivisionBoundary[]>(initialDivisionBoundaries);
  const [storedConfig, setStoredConfig] = useSyncedStudioConfig();
  const [zoom, setZoom] = useState<number>(0.85);
  const [isSaving, setIsSaving] = useState(false);
  const previewStageOuterRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [liveSignatures, setLiveSignatures] = useState<Record<string, string>>({
    'head-teacher': SAMPLE_HEADTEACHER_SIG,
    'class-teacher-p4': SAMPLE_TEACHER_SIG,
    'class-teacher-p7': SAMPLE_TEACHER_SIG,
    'class-teacher-top': SAMPLE_TEACHER_SIG,
    'class-teacher-middle': SAMPLE_TEACHER_SIG,
    'class-teacher-baby': SAMPLE_TEACHER_SIG,
    'theology-teacher-top': SAMPLE_TEACHER_SIG,
  });

  // Effective config for currently edited template (merges baseline + activeTemplate override)
  const studioConfig = useMemo(
    () => normalizeStudioConfig(storedConfig, activeTemplate),
    [storedConfig, activeTemplate]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchRealSignatures() {
      try {
        const res = await fetch('/api/signatures');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || typeof data !== 'object') return;
        const map: Record<string, string> = {};
        if (Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item?.slot_key && item?.public_url && item?.active) {
              map[item.slot_key] = item.public_url;
            }
          }
        }
        if (Object.keys(map).length > 0) {
          setLiveSignatures((prev) => ({ ...prev, ...map }));
        }
      } catch { }
    }
    fetchRealSignatures();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStudio = useCallback(
    (partial: Partial<StudioFormattingConfig>) => {
      setStoredConfig((prev) => {
        const existingOverrides = prev.templateOverrides || {};
        const prevTemplateSlice = existingOverrides[activeTemplate] || {};
        let resolvedPartial: Partial<StudioFormattingConfig> = { ...partial };

        if (partial.colorTheme) {
          const themePreset = STUDIO_COLOR_THEMES[partial.colorTheme];
          if (themePreset) {
            resolvedPartial = {
              ...resolvedPartial,
              themeId: themePreset.id,
              colorTheme: themePreset.id,
              primaryColor: themePreset.primary,
              secondaryColor: themePreset.secondary,
              accentColor: themePreset.accent,
              badgeHighlightColor: themePreset.highlight,
            };
            setBranding((b) => ({
              ...b,
              primaryColor: themePreset.primary,
              secondaryColor: themePreset.secondary,
              accentColor: themePreset.accent,
              badgeHighlightColor: themePreset.highlight,
            }));
          }
        }

        const nextOverrideSlice = { ...prevTemplateSlice, ...resolvedPartial };
        return normalizeStudioConfig({
          ...prev,
          ...resolvedPartial,
          templateOverrides: {
            ...existingOverrides,
            [activeTemplate]: nextOverrideSlice,
          },
        });
      });
    },
    [activeTemplate, setStoredConfig]
  );

  const updateBrandingField = useCallback(
    (patch: Partial<BrandingConfig>) => {
      setBranding((prev) => {
        const updated = { ...prev, ...patch };
        updateStudio({
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          accentColor: updated.accentColor,
          badgeHighlightColor: updated.badgeHighlightColor,
          schoolHeader: {
            nameEnglish: updated.schoolName,
            nameArabic: updated.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
            address: updated.schoolAddress,
            phone: updated.schoolPhone,
            email: updated.schoolEmail,
            motto: updated.schoolMotto,
            logoUrl: updated.logoUrl,
          },
        });
        return updated;
      });
    },
    [updateStudio]
  );

  const handleTemplateSelect = (tpl: TemplateType) => {
    setActiveTemplate(tpl);
    if (tpl === 'p7-eot') {
      if (sampleProfileId !== 'p7') {
        setSampleProfileId('non-muslim');
      }
    } else if (tpl === 'nursery-eot' || tpl === 'nursery-mot' || tpl === 'nursery-theology-eot') {
      setSampleProfileId('nursery');
    } else {
      setSampleProfileId('muslim');
    }
  };

  const handleStepTemplate = (direction: -1 | 1) => {
    const idx = TEMPLATE_OPTIONS.findIndex((t) => t.id === activeTemplate);
    const nextIdx = (idx + direction + TEMPLATE_OPTIONS.length) % TEMPLATE_OPTIONS.length;
    handleTemplateSelect(TEMPLATE_OPTIONS[nextIdx].id);
  };

  const handleResetDefaults = () => {
    setStoredConfig(DEFAULT_STUDIO_CONFIG);
    saveStudioConfigToStorage(DEFAULT_STUDIO_CONFIG);
    setBranding({
      ...defaultBranding,
      primaryColor: DEFAULT_STUDIO_CONFIG.primaryColor || '#14532D',
      secondaryColor: DEFAULT_STUDIO_CONFIG.secondaryColor || '#C59B27',
      accentColor: DEFAULT_STUDIO_CONFIG.accentColor || '#7F1D1D',
      badgeHighlightColor: DEFAULT_STUDIO_CONFIG.badgeHighlightColor || '#0D5C3A',
    });
    toast.success('All Studio formatting reset to canonical defaults.');
  };

  const buildCurrentSliceForSave = useCallback((): StudioFormattingConfig => {
    return normalizeStudioConfig({
      ...studioConfig,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      badgeHighlightColor: branding.badgeHighlightColor,
      schoolHeader: {
        nameEnglish: branding.schoolName,
        nameArabic: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
        address: branding.schoolAddress,
        phone: branding.schoolPhone,
        email: branding.schoolEmail,
        motto: branding.schoolMotto,
        logoUrl: branding.logoUrl,
      },
    });
  }, [branding, studioConfig]);

  const handleScopedSave = async (scope: 'template' | 'group' | 'all') => {
    setIsSaving(true);
    setSaveMenuOpen(false);
    try {
      const slice = buildCurrentSliceForSave();
      const currentStored = storedConfig;
      const prevOverrides = currentStored.templateOverrides || {};
      let nextGlobal: StudioFormattingConfig;

      if (scope === 'template') {
        const { templateOverrides: _omitted, ...sliceWithoutNested } = slice;
        nextGlobal = normalizeStudioConfig({
          ...currentStored,
          templateOverrides: {
            ...prevOverrides,
            [activeTemplate]: sliceWithoutNested,
          },
        });
      } else if (scope === 'group') {
        const { templateOverrides: _omitted, ...sliceWithoutNested } = slice;
        const { templates } = getCurriculumGroupTemplates(activeTemplate);
        const updatedOverrides = { ...prevOverrides };
        for (const tplId of templates) {
          updatedOverrides[tplId] = sliceWithoutNested;
        }
        nextGlobal = normalizeStudioConfig({
          ...currentStored,
          templateOverrides: updatedOverrides,
        });
      } else {
        nextGlobal = normalizeStudioConfig({
          ...slice,
          templateOverrides: {},
        });
      }

      setStoredConfig(nextGlobal);
      saveStudioConfigToStorage(nextGlobal);

      const schoolPatchBody: Record<string, any> = {
        report_studio_config: nextGlobal,
        ...(scope === 'all'
          ? {
            school_name: branding.schoolName,
            arabic_name: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
            motto: branding.schoolMotto,
            address: branding.schoolAddress,
            phone_1: branding.schoolPhone,
            email: branding.schoolEmail,
            logo_url: branding.logoUrl,
            theme_color: branding.primaryColor,
            grading_scale: gradingScale,
            division_boundaries: divisionBoundaries,
            print_preferences: {
              ...initialPrintPreferences,
              includeStamp: nextGlobal.stampEnabled,
              includeSignatures: nextGlobal.signaturesEnabled,
              stamp_config: {
                ...initialPrintPreferences?.stamp_config,
                ink_color: nextGlobal.stampInkColor,
                date_ink_color: nextGlobal.stampDateInkColor,
                date: nextGlobal.stampDate,
                rotation: nextGlobal.stampRotation,
                opacity: Number((nextGlobal.stampOpacity / 100).toFixed(2)),
                grain_realism: nextGlobal.stampNaturalRealism,
              },
            },
          }
          : {}),
      };

      const [studioSaved, schoolRes] = await Promise.all([
        persistStudioConfigGlobally(nextGlobal),
        fetch('/api/settings/school', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schoolPatchBody),
        }).catch(() => null),
      ]);

      const scopeLabel =
        scope === 'template'
          ? activeTemplateMeta.shortLabel
          : scope === 'group'
            ? curriculumGroup.label
            : 'All 8 Templates';

      if (studioSaved || (schoolRes && schoolRes.ok)) {
        toast.success(`Saved & applied to ${scopeLabel}!`);
      } else {
        toast.success(`Saved & applied to ${scopeLabel} locally.`);
      }
    } catch {
      toast.error('Saved locally; could not sync with server.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeTemplateMeta = useMemo(
    () => TEMPLATE_OPTIONS.find((t) => t.id === activeTemplate) || TEMPLATE_OPTIONS[0],
    [activeTemplate]
  );

  // Measure the overflow-hidden outer stage wrapper with 16px hysteresis deadband in rAF
  // so sidebar open/close or scrollbar toggles never cause 60fps preview shaking
  useEffect(() => {
    const outerEl = previewStageOuterRef.current;
    if (!outerEl) return;
    let rafId: number | null = null;

    const commitMeasurements = (rawW: number, rawH: number) => {
      const newWidth = Math.round(rawW);
      const newHeight = Math.round(rawH);
      setStageSize((prev) => {
        if (
          prev.width > 0 &&
          Math.abs(newWidth - prev.width) < 16 &&
          Math.abs(newHeight - prev.height) < 16
        ) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });
    };

    const observer = new ResizeObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (!latest) return;
      const { width, height } = latest.contentRect;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        commitMeasurements(width, height);
      });
    });

    observer.observe(outerEl);
    commitMeasurements(outerEl.clientWidth, outerEl.clientHeight);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [mobileView]);

  const studioPreviewScale = useMemo(() => {
    const dims = STABILIZED_REPORT_ORIENTATIONS[activeTemplateMeta.reportType];
    const nativeW = dims?.width || 1123;
    const clampedZoom = Math.min(1.5, Math.max(0.5, zoom));
    if (stageSize.width <= 0) {
      return Number(Math.min(Math.max(0.72 * clampedZoom, 0.25), 1.5).toFixed(4));
    }
    const isMobile = stageSize.width < 768;
    const usableW = Math.max(stageSize.width - (isMobile ? 20 : 56), 220);
    const fitScale = Math.min(usableW / nativeW, 1);
    return Number(Math.min(Math.max(fitScale * clampedZoom, 0.25), 1.5).toFixed(4));
  }, [activeTemplateMeta.reportType, stageSize.width, zoom]);

  const curriculumGroup = useMemo(
    () => getCurriculumGroupTemplates(activeTemplate),
    [activeTemplate]
  );

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
      {
        subject_name: 'COMP',
        bot_score: 78,
        bot_grade_display: 'D2',
        bot_agg: 'D2',
        mot_score: 82,
        mot_grade_display: 'D2',
        mot_agg: 'D2',
        eot_score: 88,
        eot_grade_display: 'D1',
        eot_agg: 'D1',
        score: 88,
        grade: 'D1',
        is_core: false,
        remark: 'VERY GOOD',
        teacher_initials: 'H.H',
      },
    ];

    const nurserySubjects = [
      { subject_name: 'Reading & Language', mot_score: 92, eot_score: 95, score: 95, grade: 'A', remark: 'EXCELLENT', teacher_initials: 'F.N' },
      { subject_name: 'Numbers', mot_score: 88, eot_score: 91, score: 91, grade: 'A', remark: 'EXCELLENT', teacher_initials: 'F.N' },
      { subject_name: 'Health Habits', mot_score: 85, eot_score: 88, score: 88, grade: 'B', remark: 'VERY GOOD', teacher_initials: 'H.A' },
      { subject_name: 'Writing', mot_score: 82, eot_score: 86, score: 86, grade: 'B', remark: 'VERY GOOD', teacher_initials: 'F.N' },
      { subject_name: 'Drawing & Art', mot_score: 90, eot_score: 94, score: 94, grade: 'A', remark: 'EXCELLENT', teacher_initials: 'S.K' },
    ];

    return {
      id: `studio-preview-${activeTemplate}-${student.id}`,
      student,
      term: {
        name: 'Term 1',
        label: 'Term 1',
        term_number: 1,
        academic_year: String(new Date().getFullYear()),
        end_date: studioConfig.reportDateOverride || getLiveIsoDateString(),
        next_term_start: studioConfig.nextTermBeginsOverride || '2026-05-18',
        next_term_start_boarders: '2026-05-16',
        next_term_start_day: studioConfig.nextTermBeginsOverride || '2026-05-18',
        endDate: studioConfig.reportDateOverride || getLiveIsoDateString(),
        nextTermBegins: studioConfig.nextTermBeginsOverride || '2026-05-18',
        next_term_begins: studioConfig.nextTermBeginsOverride || '2026-05-18',
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
        arabic_name: branding.arabicSchoolName || 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
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
        report_studio_config: storedConfig,
        print_preferences: {
          ...initialPrintPreferences,
          includeStamp: studioConfig.stampEnabled,
          includeSignatures: studioConfig.signaturesEnabled,
          stamp_config: {
            ...initialPrintPreferences?.stamp_config,
            ink_color: studioConfig.stampInkColor,
            date_ink_color: studioConfig.stampDateInkColor,
            date: resolveEffectiveStampDate(studioConfig.stampDate),
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
          { subject_name: 'القرآن الكريم', subject_name_arabic: 'القرآن الكريم', mot_score: 92, eot_score: 95, score: 95, grade: 'ت١', theology_remark: activeTemplate === 'nursery-theology-eot' ? 'ممتاز' : 'تفوق عالٍ', teacher_initials: 'ع.م' },
          { subject_name: 'الفقه', subject_name_arabic: 'الفقه', mot_score: 86, eot_score: 89, score: 89, grade: 'ت١', theology_remark: activeTemplate === 'nursery-theology-eot' ? 'ممتاز' : 'تفوق عالٍ', teacher_initials: 'ح.س' },
          { subject_name: 'التوحيد', subject_name_arabic: 'التوحيد', mot_score: 88, eot_score: 91, score: 91, grade: 'ت١', theology_remark: activeTemplate === 'nursery-theology-eot' ? 'ممتاز' : 'تفوق عالٍ', teacher_initials: 'م.أ' },
          { subject_name: 'اللغة العربية', subject_name_arabic: 'اللغة العربية', mot_score: 84, eot_score: 88, score: 88, grade: 'ت١', theology_remark: activeTemplate === 'nursery-theology-eot' ? 'ممتاز' : 'تفوق عالٍ', teacher_initials: 'ي.ك' },
          { subject_name: 'التربية الإسلامية', subject_name_arabic: 'التربية الإسلامية', mot_score: 90, eot_score: 93, score: 93, grade: 'ت١', theology_remark: activeTemplate === 'nursery-theology-eot' ? 'ممتاز' : 'تفوق عالٍ', teacher_initials: 'س.ن' },
        ],
        mot_total: 440,
        eot_total: 456,
        total: 456,
        average: 91.2,
        aggregate: 4,
        division: 'ممتاز',
        teacher_comment: 'ما شاء الله، تفاعل ممتاز وتقدم رائع في الحفظ والتعلم، بارك الله فيك.',
        head_teacher_comment: 'نتيجة مشرفة وجهد مبارك، نتمنى له/لها دوام التفوق والنجاح.',
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
      stamp_date: resolveEffectiveStampDate(studioConfig.stampDate),
    };
  }, [
    activeTemplate,
    activeSampleProfile,
    branding,
    gradingScale,
    divisionBoundaries,
    studioConfig,
    storedConfig,
    initialPrintPreferences,
    liveSignatures,
  ]);

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

  const palettesByCategory = useMemo(() => {
    const all = Object.values(STUDIO_COLOR_THEMES);
    return [
      { title: 'Primary & General Palettes', items: all.filter((p) => p.category === 'primary') },
      { title: 'Nursery Dedicated Palettes', items: all.filter((p) => p.category === 'nursery') },
      { title: 'Theology Dedicated Palettes', items: all.filter((p) => p.category === 'theology') },
    ];
  }, []);

  return (
    <StudioFormattingProvider value={studioConfig}>
      <div
        data-testid="report-studio-2-root"
        className="flex flex-col h-[calc(100dvh-16px)] bg-[#F3F6F4] dark:bg-[#0D1310] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 overflow-hidden"
      >
        {/* Top Studio Header Bar (Overflow-Proof Single-Row Layout — CustomPillSelect, Zero Duplicate Switchers) */}
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

          {/* Center Group: Prev / CustomPillSelect / Next Stepper */}
          <div
            data-testid="studio-template-switcher"
            className="flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#1E2623] p-1 rounded-xl border border-black/[0.05] dark:border-white/[0.08] min-w-0"
          >
            <button
              type="button"
              onClick={() => handleStepTemplate(-1)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Previous Template"
              aria-label="Previous Template"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <CustomPillSelect
              id="studio-template-select"
              dataTestId="studio-template-select"
              ariaLabel="Select Report Template"
              value={activeTemplate}
              onChange={(val) => handleTemplateSelect(val as TemplateType)}
              options={TEMPLATE_OPTIONS.map((tpl) => ({
                value: tpl.id,
                label: tpl.label,
              }))}
              triggerClassName="h-7 px-2.5 rounded-lg text-xs font-bold max-w-[165px] sm:max-w-[260px]"
            />
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

          {/* Right Group: Global Reset + Scoped Save Popover */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="h-8 px-2.5 rounded-xl border border-stone-200 dark:border-white/15 bg-white dark:bg-[#1E2623] text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 transition inline-flex items-center gap-1 cursor-pointer shrink-0"
              title="Reset All Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <Popover open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="studio-save-apply-all"
                  disabled={isSaving}
                  className="h-8 px-3 sm:px-3.5 rounded-xl bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">
                    {isSaving ? 'Saving...' : 'Save & Apply'}
                  </span>
                  <span className="md:hidden">{isSaving ? 'Saving...' : 'Save'}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-72 p-2 rounded-2xl bg-white dark:bg-[#151D1A] border border-[#0D5C3A]/15 dark:border-[#F59E0B]/25 shadow-xl z-50 space-y-1.5"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Choose Apply Scope
                </div>
                <button
                  type="button"
                  data-testid="save-scope-template"
                  onClick={() => void handleScopedSave('template')}
                  className="w-full p-2.5 rounded-xl hover:bg-[#0D5C3A]/8 dark:hover:bg-white/5 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-stone-900 dark:text-white">
                    Save to This Template Only ({activeTemplateMeta.shortLabel})
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Applies overrides strictly to {activeTemplateMeta.label}
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="save-scope-group"
                  onClick={() => void handleScopedSave('group')}
                  className="w-full p-2.5 rounded-xl hover:bg-[#0D5C3A]/8 dark:hover:bg-white/5 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-stone-900 dark:text-white">
                    Save to Curriculum Group ({curriculumGroup.label})
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Updates all templates inside {curriculumGroup.label}
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="save-scope-all"
                  onClick={() => void handleScopedSave('all')}
                  className="w-full p-2.5 rounded-xl bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save &amp; Apply to All Reports (School Default)</span>
                  </div>
                  <div className="text-[10px] text-emerald-100/85 mt-0.5">
                    All 8 templates + global Report Center &amp; School Settings
                  </div>
                </button>
              </PopoverContent>
            </Popover>
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
            className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${mobileView === 'controls'
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
            className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${mobileView === 'preview'
              ? 'bg-[#0D5C3A] text-white shadow-2xs'
              : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-300'
              }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Report Preview</span>
          </button>
        </div>

        {/* 2-Pane Workspace */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          {/* Left Inspector Dock */}
          <aside
            data-testid="studio-left-inspector"
            className={`w-full lg:w-[355px] bg-white dark:bg-[#151D1A] border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-white/10 flex-col shrink-0 flex-1 lg:flex-initial overflow-hidden ${mobileView === 'controls' ? 'flex' : 'hidden lg:flex'
              }`}
          >
            {/* 4 Inspector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-[#F0F4F9] dark:bg-[#1E2623] border-b border-stone-200 dark:border-white/10 shrink-0">
              {[
                { id: 'theme' as const, label: 'Theme', fullLabel: 'Theme & Colors', icon: Palette },
                { id: 'typography' as const, label: 'Type', fullLabel: 'Typography & Layout', icon: Type },
                { id: 'watermark' as const, label: 'Art', fullLabel: 'Watermark & Background Art', icon: Sparkles },
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
                        Theme &amp; Colors
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Section-specific school palettes and 4-channel interactive color wheel.
                      </p>
                    </div>
                  </div>

                  {/* Curated School Palettes by Section */}
                  <div className="space-y-3">
                    <SectionHeaderWithReset
                      title="Color Palette"
                      onReset={() => updateStudio({ colorTheme: 'jiddah-classic' })}
                    />
                    {palettesByCategory.map((group) => (
                      <div key={group.title} className="space-y-1.5">
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          {group.title}
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {group.items.map((theme) => {
                            const isSelected = studioConfig.colorTheme === theme.id;
                            return (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() => updateStudio({ colorTheme: theme.id })}
                                className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${isSelected
                                  ? 'border-[#0D5C3A] bg-[#0D5C3A]/5 dark:bg-[#0D5C3A]/20 shadow-2xs'
                                  : 'border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/5'
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex items-center -space-x-1 shrink-0">
                                    <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: theme.primary }} />
                                    <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: theme.secondary }} />
                                    <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: theme.accent }} />
                                    <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: theme.highlight }} />
                                  </div>
                                  <span className="font-bold text-stone-800 dark:text-stone-100 text-[11px] truncate">
                                    {theme.label}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#0D5C3A] shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 4-Channel Interactive Color Wheel */}
                  <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-white/10">
                    <SectionHeaderWithReset
                      title="Custom Brand Colors"
                      onReset={() =>
                        updateBrandingField({
                          primaryColor: '#14532D',
                          secondaryColor: '#C59B27',
                          accentColor: '#7F1D1D',
                          badgeHighlightColor: '#0D5C3A',
                        })
                      }
                    />
                    <ColorWheelPicker
                      label="Primary Color"
                      value={branding.primaryColor}
                      defaultValue="#14532D"
                      onChange={(hex) => updateBrandingField({ primaryColor: hex })}
                    />
                    <ColorWheelPicker
                      label="Secondary Border / Banner"
                      value={branding.secondaryColor}
                      defaultValue="#C59B27"
                      onChange={(hex) => updateBrandingField({ secondaryColor: hex })}
                    />
                    <ColorWheelPicker
                      label="Header Title Accent"
                      value={branding.accentColor}
                      defaultValue="#7F1D1D"
                      onChange={(hex) => updateBrandingField({ accentColor: hex })}
                    />
                    <ColorWheelPicker
                      label="Badge / Highlight Accent"
                      value={branding.badgeHighlightColor || '#0D5C3A'}
                      defaultValue="#0D5C3A"
                      onChange={(hex) => updateBrandingField({ badgeHighlightColor: hex })}
                    />
                  </div>

                  {/* School Identity Quick Edit */}
                  <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-white/10">
                    <SectionHeaderWithReset
                      title="School Header Identity"
                      onReset={() =>
                        updateBrandingField({
                          schoolName: 'Jiddah Islamic Schools',
                          arabicSchoolName: 'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو',
                          schoolAddress: 'P.O. BOX 34008 Kampala (U)',
                          schoolPhone: '+256705316961 / +256 787 779 909',
                          schoolEmail: 'jiddahislamicnurseryandpri@gmail.com',
                          schoolMotto: 'Striving for Life & The Hereafter',
                        })
                      }
                    />
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

              {/* TAB 2: TYPOGRAPHY & LAYOUT (SPLIT ENGLISH SECULAR VS ARABIC THEOLOGY) */}
              {activeTab === 'typography' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Typography &amp; Layout
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Separate English Secular and Arabic Theology fonts, scaling, and density.
                      </p>
                    </div>
                  </div>

                  {/* Secular / English Typography Card */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="English Secular Typography"
                      onReset={() =>
                        updateStudio({
                          englishFontFamily: DEFAULT_STUDIO_CONFIG.englishFontFamily,
                          fontFamily: DEFAULT_STUDIO_CONFIG.englishFontFamily,
                          englishFontScale: 100,
                          fontScale: 100,
                          fontSize: 100,
                        })
                      }
                    />
                    <div className="space-y-1">
                      <span className="block text-[10px] font-semibold text-stone-500">English Font Family</span>
                      <CustomPillSelect
                        id="studio-english-font-select"
                        ariaLabel="English Font Family"
                        value={studioConfig.englishFontFamily || studioConfig.fontFamily}
                        onChange={(val) =>
                          updateStudio({ englishFontFamily: val, fontFamily: val })
                        }
                        options={STUDIO_ENGLISH_FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
                        triggerClassName="w-full h-8 px-2.5 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-stone-500">English Font Scale</span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.englishFontScale}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={85}
                        max={115}
                        step={5}
                        value={studioConfig.englishFontScale}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateStudio({ englishFontScale: v, fontScale: v, fontSize: v });
                        }}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>
                  </div>

                  {/* Theology / Arabic Typography Card */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="Arabic Theology Typography (الخط العربي)"
                      onReset={() =>
                        updateStudio({
                          arabicFontFamily: DEFAULT_STUDIO_CONFIG.arabicFontFamily,
                          arabicFontScale: 100,
                        })
                      }
                    />
                    <div className="space-y-1">
                      <span className="block text-[10px] font-semibold text-stone-500">Arabic Font Family</span>
                      <CustomPillSelect
                        id="studio-arabic-font-select"
                        ariaLabel="Arabic Font Family"
                        value={studioConfig.arabicFontFamily}
                        onChange={(val) => updateStudio({ arabicFontFamily: val })}
                        options={STUDIO_ARABIC_FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
                        triggerClassName="w-full h-8 px-2.5 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-stone-500">Arabic Font Scale</span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.arabicFontScale}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={85}
                        max={120}
                        step={5}
                        value={studioConfig.arabicFontScale}
                        onChange={(e) => updateStudio({ arabicFontScale: Number(e.target.value) })}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>
                  </div>

                  {/* Shared Layout Controls */}
                  <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-white/10">
                    <SectionHeaderWithReset
                      title="Shared Layout Controls"
                      onReset={() =>
                        updateStudio({
                          isBold: true,
                          boldScores: true,
                          commentFontSize: 'large',
                          pageDensity: 'balanced',
                        })
                      }
                    />
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-stone-100">Bold Scores &amp; Aggregates</div>
                        <div className="text-[10px] text-stone-500">High-contrast print legibility</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStudio({ isBold: !studioConfig.isBold, boldScores: !studioConfig.isBold })}
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

                    {/* Table Row Density */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Table Row Density
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

                  {/* Typography & Remarks Section */}
                  <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-white/10">
                    <SectionHeaderWithReset
                      title="Typography & Remarks"
                      onReset={() =>
                        updateStudio({
                          italicizeText: false,
                          useDosRemarkOverrides: true,
                        })
                      }
                    />
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-stone-100">Italicize Comments &amp; Remarks</div>
                        <div className="text-[10px] text-stone-500">Off by default so Arabic &amp; print remarks stay crisp</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(studioConfig.italicizeText)}
                        onClick={() => updateStudio({ italicizeText: !studioConfig.italicizeText })}
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.italicizeText ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623]">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-stone-100">Use DOS Custom Remarks (From Settings)</div>
                        <div className="text-[10px] text-stone-500">Disable to use built-in system fallback remarks</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={studioConfig.useDosRemarkOverrides !== false}
                        onClick={() => updateStudio({ useDosRemarkOverrides: studioConfig.useDosRemarkOverrides === false })}
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.useDosRemarkOverrides !== false ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WATERMARK & BACKGROUND ART GALLERY */}
              {activeTab === 'watermark' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Watermark &amp; Background Art
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Configure central seal watermarks and decorative art across all templates.
                      </p>
                    </div>
                  </div>

                  {/* Section 6: Central Watermark */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="Watermark"
                      onReset={() =>
                        updateStudio({
                          watermarkStyle: 'crest',
                          watermarkScale: 100,
                          watermarkOpacity: 5.5,
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      {WATERMARK_STYLE_OPTIONS.map((wm) => (
                        <button
                          key={wm.id}
                          type="button"
                          onClick={() => updateStudio({ watermarkStyle: wm.id })}
                          className={`p-2 rounded-lg text-[10.5px] font-bold border text-left transition cursor-pointer ${studioConfig.watermarkStyle === wm.id
                            ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                            : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                            }`}
                        >
                          {wm.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-stone-700 dark:text-stone-300">
                          Watermark Scale (70% – 130%)
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.watermarkScale}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={70}
                        max={130}
                        step={5}
                        value={studioConfig.watermarkScale}
                        onChange={(e) => updateStudio({ watermarkScale: Number(e.target.value) })}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-stone-700 dark:text-stone-300">
                          Watermark Opacity (0% – 20%)
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.watermarkOpacity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={0.5}
                        value={studioConfig.watermarkOpacity}
                        onChange={(e) => updateStudio({ watermarkOpacity: Number(e.target.value) })}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>
                  </div>

                  {/* Section 7: Background Illustration & Border Art Gallery */}
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-700/30 space-y-3">
                    <SectionHeaderWithReset
                      title="Background Art"
                      onReset={() =>
                        updateStudio({
                          artPreset: 'default',
                          showNurseryArt: true,
                          nurseryArtOpacity: 7,
                        })
                      }
                    />
                    <div className="space-y-1.5" data-testid="studio-art-preset-gallery">
                      {ART_PRESET_OPTIONS.map((preset) => {
                        const selected = studioConfig.artPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => updateStudio({ artPreset: preset.id })}
                            className={`w-full p-2 rounded-lg border text-left transition cursor-pointer ${selected
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                              : 'bg-white dark:bg-[#151D1A] text-stone-800 dark:text-stone-200 border-amber-200/70 dark:border-white/10'
                              }`}
                          >
                            <div className="text-[11px] font-bold">{preset.label}</div>
                            <div className={`text-[10px] ${selected ? 'text-emerald-100' : 'text-stone-500'}`}>
                              {preset.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                      <span className="text-[10.5px] font-bold text-stone-800 dark:text-stone-100">
                        Nursery EOT Card Illustration Style
                      </span>
                      <div className="grid grid-cols-2 gap-1.5" data-testid="studio-nursery-theme-selector">
                        {([
                          { id: 'islamic-garden', label: 'Islamic Garden' },
                          { id: 'playful', label: 'Playful Color' },
                          { id: 'lineart', label: 'Line-Art B&W' },
                          { id: 'classic', label: 'Classic' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            data-testid={`studio-nursery-theme-${opt.id}`}
                            onClick={() => updateStudio({ nurseryTheme: opt.id })}
                            className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                              (studioConfig.nurseryTheme || 'playful') === opt.id
                                ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                                : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                      <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100">
                        Nursery Educative Layer
                      </span>
                      <button
                        type="button"
                        onClick={() => updateStudio({ showNurseryArt: !studioConfig.showNurseryArt })}
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer shrink-0 ${studioConfig.showNurseryArt ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-stone-700 dark:text-stone-300">
                          Background Art Opacity
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0D5C3A]">
                          {studioConfig.nurseryArtOpacity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={15}
                        step={1}
                        value={studioConfig.nurseryArtOpacity}
                        onChange={(e) => updateStudio({ nurseryArtOpacity: Number(e.target.value) })}
                        className="w-full accent-[#0D5C3A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PHYSICAL STAMP & SIGNATURES ENGINE */}
              {activeTab === 'stamp' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 flex items-center justify-center text-[#0D5C3A] dark:text-[#10B981] shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-200">
                        Physical Stamp &amp; Signatures
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Scale, rotate, recolor, and drag-to-position without shifting report layout.
                      </p>
                    </div>
                  </div>

                  {/* Section: Quick Date Overrides */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="Quick Date Overrides"
                      onReset={() =>
                        updateStudio({
                          reportDateOverride: '',
                          nextTermBeginsOverride: '',
                        })
                      }
                    />
                    <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Override printed Report Date or Next Term Begins for quick batches without modifying school database terms.
                    </p>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                        Report Date (Leave blank for DB Term End Date)
                      </label>
                      <input
                        type="text"
                        value={studioConfig.reportDateOverride || ''}
                        onChange={(e) => updateStudio({ reportDateOverride: e.target.value })}
                        placeholder="e.g. 05/12/2026 or leave blank"
                        className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#151D1A] border border-stone-200 dark:border-white/10 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                        Next Term Begins (Leave blank for DB Next Term Date)
                      </label>
                      <input
                        type="text"
                        value={studioConfig.nextTermBeginsOverride || ''}
                        onChange={(e) => updateStudio({ nextTermBeginsOverride: e.target.value })}
                        placeholder="e.g. 02/02/2027 or leave blank"
                        className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#151D1A] border border-stone-200 dark:border-white/10 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Section 8: Official Stamp */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="Official Stamp"
                      onReset={() =>
                        updateStudio({
                          stampEnabled: true,
                          showStamp: true,
                          stampMode: 'digital',
                          stampInkColor: '#1B3B8B',
                          stampColor: '#1B3B8B',
                          stampDateInkColor: '#C81E1E',
                          stampNaturalRealism: true,
                          stampScale: 100,
                          stampRotation: -2,
                          stampOpacity: 92,
                          stampOffsetX: 0,
                          stampOffsetY: 0,
                        })
                      }
                    />

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#151D1A]">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-stone-100">Show Official Stamp</div>
                        <div className="text-[10px] text-stone-500">Dual-ink Jiddah rubber stamp</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateStudio({ stampEnabled: !studioConfig.stampEnabled, showStamp: !studioConfig.stampEnabled })
                        }
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.stampEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    {studioConfig.stampEnabled && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateStudio({ stampMode: 'digital' })}
                            className={`py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${studioConfig.stampMode === 'digital'
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                              : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                              }`}
                          >
                            Digital Vector
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudio({ stampMode: 'uploaded' })}
                            className={`py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${studioConfig.stampMode === 'uploaded'
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                              : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                              }`}
                          >
                            Uploaded Backup
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#151D1A]">
                          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                            Natural Rubber Ink Texture
                          </span>
                          <button
                            type="button"
                            onClick={() => updateStudio({ stampNaturalRealism: !studioConfig.stampNaturalRealism })}
                            className={`w-9 h-5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.stampNaturalRealism ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                              }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>

                        {/* Institutional Ink Swatches */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Institutional Stamp Ink
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {STUDIO_STAMP_INK_COLORS.map((ink) => (
                              <button
                                key={ink.id}
                                type="button"
                                onClick={() => updateStudio({ stampInkColor: ink.id, stampColor: ink.id })}
                                className={`p-1.5 rounded-lg border flex items-center gap-2 transition cursor-pointer ${studioConfig.stampInkColor.toUpperCase() === ink.id.toUpperCase()
                                  ? 'border-[#0D5C3A] bg-[#0D5C3A]/8 font-bold'
                                  : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#151D1A]'
                                  }`}
                              >
                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: ink.id }} />
                                <span className="text-[10.5px] truncate">{ink.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <ColorWheelPicker
                          label="Custom Stamp Body Ink"
                          value={studioConfig.stampInkColor}
                          defaultValue="#1B3B8B"
                          onChange={(hex) => updateStudio({ stampInkColor: hex, stampColor: hex })}
                        />
                        <ColorWheelPicker
                          label="Dater Stamp Date Ink"
                          value={studioConfig.stampDateInkColor}
                          defaultValue="#C81E1E"
                          onChange={(hex) => updateStudio({ stampDateInkColor: hex })}
                        />

                        {/* Stamp Date */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Stamp Date
                          </label>
                          <input
                            type="text"
                            value={studioConfig.stampDate}
                            onChange={(e) => updateStudio({ stampDate: e.target.value.toUpperCase() })}
                            placeholder={getLiveStampDateString()}
                            className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#151D1A] border border-stone-200 dark:border-white/10 text-xs font-bold"
                          />
                        </div>

                        {/* Stamp Size 60-150% */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Stamp Size (60% – 150%)
                            </span>
                            <span className="text-xs font-mono font-bold text-[#0D5C3A]">{studioConfig.stampScale}%</span>
                          </div>
                          <input
                            type="range"
                            min={60}
                            max={150}
                            step={5}
                            value={studioConfig.stampScale}
                            onChange={(e) => updateStudio({ stampScale: Number(e.target.value) })}
                            className="w-full accent-[#0D5C3A]"
                          />
                        </div>

                        {/* Stamp Rotation -25 to +25 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Stamp Rotation (-25° to +25°)
                            </span>
                            <span className="text-xs font-mono font-bold text-[#0D5C3A]">{studioConfig.stampRotation}°</span>
                          </div>
                          <input
                            type="range"
                            min={-25}
                            max={25}
                            step={1}
                            value={studioConfig.stampRotation}
                            onChange={(e) => updateStudio({ stampRotation: Number(e.target.value) })}
                            className="w-full accent-[#0D5C3A]"
                          />
                          <div className="grid grid-cols-4 gap-1">
                            {[-6, -2, 0, 4].map((deg) => (
                              <button
                                key={deg}
                                type="button"
                                onClick={() => updateStudio({ stampRotation: deg })}
                                className={`py-1 rounded text-[10px] font-bold border cursor-pointer ${studioConfig.stampRotation === deg
                                  ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                                  : 'bg-white dark:bg-[#151D1A] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10'
                                  }`}
                              >
                                {deg === -2 ? '-2° Def' : `${deg > 0 ? '+' : ''}${deg}°`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stamp Contrast / Opacity */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Ink Contrast / Opacity
                            </span>
                            <span className="text-xs font-mono font-bold text-[#0D5C3A]">{studioConfig.stampOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={100}
                            step={2}
                            value={studioConfig.stampOpacity}
                            onChange={(e) => updateStudio({ stampOpacity: Number(e.target.value) })}
                            className="w-full accent-[#0D5C3A]"
                          />
                        </div>

                        {/* Drag-to-Position & X/Y Sliders */}
                        <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Stamp Offset (X: {studioConfig.stampOffsetX}px, Y: {studioConfig.stampOffsetY}px)
                            </span>
                            <button
                              type="button"
                              onClick={() => updateStudio({ stampOffsetX: 0, stampOffsetY: 0 })}
                              className="text-[10px] font-bold text-[#0D5C3A] hover:underline cursor-pointer"
                            >
                              Reset Pos
                            </button>
                          </div>
                          <button
                            type="button"
                            data-testid="toggle-drag-stamp-mode"
                            onClick={() => setDragStampMode((v) => !v)}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border cursor-pointer transition ${dragStampMode
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-white/10'
                              }`}
                          >
                            <Move className="w-3.5 h-3.5" />
                            <span>{dragStampMode ? 'Drag Stamp on Report Active (Click to Lock)' : 'Drag Stamp Directly on Preview'}</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-stone-500">X Offset ({studioConfig.stampOffsetX})</span>
                              <input
                                type="range"
                                min={-120}
                                max={120}
                                step={2}
                                value={studioConfig.stampOffsetX}
                                onChange={(e) => updateStudio({ stampOffsetX: Number(e.target.value) })}
                                className="w-full accent-[#0D5C3A]"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500">Y Offset ({studioConfig.stampOffsetY})</span>
                              <input
                                type="range"
                                min={-80}
                                max={80}
                                step={2}
                                value={studioConfig.stampOffsetY}
                                onChange={(e) => updateStudio({ stampOffsetY: Number(e.target.value) })}
                                className="w-full accent-[#0D5C3A]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 9: Signatures Engine */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1E2623]/70 border border-stone-200 dark:border-white/10 space-y-3">
                    <SectionHeaderWithReset
                      title="Signatures"
                      onReset={() =>
                        updateStudio({
                          signaturesEnabled: true,
                          showSignatures: true,
                          signatureInkColor: '#0C2A84',
                          signatureThreshold: 225,
                          signatureScale: 100,
                          signatureRotation: 0,
                          signatureOffsetX: 0,
                          signatureOffsetY: 0,
                        })
                      }
                    />
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#151D1A]">
                      <div>
                        <div className="font-bold text-stone-800 dark:text-stone-100">Show Signatures</div>
                        <div className="text-[10px] text-stone-500">Auto paper-stripped transparent ink</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateStudio({
                            signaturesEnabled: !studioConfig.signaturesEnabled,
                            showSignatures: !studioConfig.signaturesEnabled,
                          })
                        }
                        className={`w-10 h-5.5 rounded-full p-0.5 flex items-center transition cursor-pointer ${studioConfig.signaturesEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 justify-start'
                          }`}
                      >
                        <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    {studioConfig.signaturesEnabled && (
                      <div className="space-y-3">
                        {/* Signature Pen Color Swatches */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {STUDIO_SIGNATURE_INK_COLORS.map((pen) => (
                            <button
                              key={pen.id}
                              type="button"
                              onClick={() => updateStudio({ signatureInkColor: pen.id })}
                              className={`p-1.5 rounded-lg border flex items-center gap-2 transition cursor-pointer ${studioConfig.signatureInkColor.toUpperCase() === pen.id.toUpperCase()
                                ? 'border-[#0D5C3A] bg-[#0D5C3A]/8 font-bold'
                                : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#151D1A]'
                                }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: pen.id }} />
                              <span className="text-[10.5px] truncate">{pen.label}</span>
                            </button>
                          ))}
                        </div>

                        <ColorWheelPicker
                          label="Signature Pen Ink"
                          value={studioConfig.signatureInkColor}
                          defaultValue="#0C2A84"
                          onChange={(hex) => updateStudio({ signatureInkColor: hex })}
                        />

                        {/* Stroke Boldness / Contrast Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Stroke Boldness / Contrast
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { label: 'Light (190)', value: 190 },
                              { label: 'Balanced (225)', value: 225 },
                              { label: 'Ultra (255)', value: 255 },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateStudio({ signatureThreshold: opt.value })}
                                className={`py-1.5 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${studioConfig.signatureThreshold === opt.value
                                  ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                                  : 'bg-white dark:bg-[#151D1A] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Signature Scale & Rotation */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Signature Scale (70% – 145%)
                            </span>
                            <span className="text-xs font-mono font-bold text-[#0D5C3A]">{studioConfig.signatureScale}%</span>
                          </div>
                          <input
                            type="range"
                            min={70}
                            max={145}
                            step={5}
                            value={studioConfig.signatureScale}
                            onChange={(e) => updateStudio({ signatureScale: Number(e.target.value) })}
                            className="w-full accent-[#0D5C3A]"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Signature Rotation (-15° to +15°)
                            </span>
                            <span className="text-xs font-mono font-bold text-[#0D5C3A]">{studioConfig.signatureRotation}°</span>
                          </div>
                          <input
                            type="range"
                            min={-15}
                            max={15}
                            step={1}
                            value={studioConfig.signatureRotation}
                            onChange={(e) => updateStudio({ signatureRotation: Number(e.target.value) })}
                            className="w-full accent-[#0D5C3A]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-stone-500">Sig X Offset ({studioConfig.signatureOffsetX}px)</span>
                            <input
                              type="range"
                              min={-25}
                              max={25}
                              step={1}
                              value={studioConfig.signatureOffsetX}
                              onChange={(e) => updateStudio({ signatureOffsetX: Number(e.target.value) })}
                              className="w-full accent-[#0D5C3A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500">Sig Y Offset ({studioConfig.signatureOffsetY}px)</span>
                            <input
                              type="range"
                              min={-25}
                              max={25}
                              step={1}
                              value={studioConfig.signatureOffsetY}
                              onChange={(e) => updateStudio({ signatureOffsetY: Number(e.target.value) })}
                              className="w-full accent-[#0D5C3A]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right Live Sample Preview Stage (outer overflow-hidden wrapper prevents ResizeObserver scrollbar shaking) */}
          <div
            ref={previewStageOuterRef}
            className={`flex-1 flex-col min-w-0 overflow-hidden relative ${
              mobileView === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <main
              data-testid="studio-live-preview-stage"
              data-canvas-scroll
              className="flex-1 bg-[#E6ECE8] dark:bg-[#0D1310] overflow-auto relative flex flex-col items-center justify-start p-3 sm:p-8"
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

            {/* Interactive Preview Container (supports drag-to-position stamp when toggled) */}
            <div
              className="relative"
              onPointerDown={(e) => {
                if (!dragStampMode) return;
                const target = (e.target as HTMLElement)?.closest('[data-testid="official-stamp-anchor-slot"]');
                if (!target) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                dragStartRef.current = {
                  clientX: e.clientX,
                  clientY: e.clientY,
                  origX: studioConfig.stampOffsetX,
                  origY: studioConfig.stampOffsetY,
                };
              }}
              onPointerMove={(e) => {
                if (!dragStampMode || !dragStartRef.current) return;
                const dx = Math.round((e.clientX - dragStartRef.current.clientX) / zoom);
                const dy = Math.round((e.clientY - dragStartRef.current.clientY) / zoom);
                updateStudio({
                  stampOffsetX: Math.max(-120, Math.min(120, dragStartRef.current.origX + dx)),
                  stampOffsetY: Math.max(-80, Math.min(80, dragStartRef.current.origY + dy)),
                });
              }}
              onPointerUp={() => {
                dragStartRef.current = null;
              }}
            >
              {dragStampMode && (
                <div className="mb-2 text-center text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Drag-to-Position active: drag the stamp on the report card to adjust X/Y offset
                </div>
              )}
              <ReportPreviewCell
                reportType={activeTemplateMeta.reportType}
                zoom={zoom}
                scale={studioPreviewScale}
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
            </div>
            </main>
          </div>
        </div>
      </div>
    </StudioFormattingProvider>
  );
}

export default ReportStudioClient;
