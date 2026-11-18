'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type StudioThemeId =
  | 'jiddah-classic'
  | 'royal-emerald'
  | 'imperial-navy'
  | 'burgundy-heritage'
  | 'monochrome'
  | 'nursery-cobalt-sunshine'
  | 'nursery-emerald-coral'
  | 'nursery-berry-gold'
  | 'madinah-emerald-gold'
  | 'makkah-midnight-bronze'
  | string

export type ReportTemplateId =
  | 'primary-eot'
  | 'p7-eot'
  | 'primary-mot'
  | 'primary-bot'
  | 'nursery-eot'
  | 'nursery-mot'
  | 'nursery-theology-eot'
  | 'theology-mot'

export type StudioFontFamily =
  | 'Default Academic (Plus Jakarta)'
  | 'Inter (Modern Sans)'
  | 'Merriweather (Academic Serif)'
  | 'Cinzel (Institutional Prestige)'
  | 'Lora (Calligraphic Serif)'
  | 'JetBrains Mono (Tabular)'
  | 'Default Academic'
  | 'Inter Sans'
  | 'Times Serif'
  | 'Cinzel Prestige'
  | 'Amiri Arabic'
  | string

export type StudioArabicFontFamily =
  | 'Default Quranic Naskh (Amiri)'
  | 'Cairo (Modern Geometric Arabic)'
  | 'Tajawal (Clean Contemporary Arabic)'
  | 'Noto Naskh Arabic (Classic Academic)'
  | 'Scheherazade New (Traditional Calligraphic)'
  | 'Almarai (Crisp Arabic Print)'
  | string

export type StudioCommentFontSize = 'normal' | 'large' | 'xlarge'
export type StudioWatermarkStyle = 'crest' | 'crest-star' | 'laurel-seal' | 'none'
export type NurseryReportTheme = 'playful' | 'lineart' | 'classic'
export type StudioArtPreset =
  | 'default'
  | 'safari'
  | 'abc-literacy'
  | 'stem-explorers'
  | 'islamic-arabesque'
  | 'certificate-filigree'
  | 'none'

export interface StudioFormattingConfig {
  themeId: StudioThemeId
  fontFamily: StudioFontFamily
  englishFontFamily: StudioFontFamily
  englishFontScale: number // 85 to 115, default 100
  arabicFontFamily: StudioArabicFontFamily
  arabicFontScale: number // 85 to 120, default 100
  fontScale: number // 85 to 115, default 100
  boldScores: boolean // default true
  commentFontSize: StudioCommentFontSize // default 'large'
  showStamp: boolean // default true
  stampMode: 'digital' | 'uploaded' // default 'digital'
  stampColor: string // default '#1B3B8B'
  stampDateInkColor: string // default '#C81E1E'
  stampNaturalRealism: boolean // default true
  stampDate: string // default ''
  stampRotation: number // -25 to +25, default -2
  stampOpacity: number // 50 to 100, default 92
  stampOffsetX: number // -120 to 120, default 0
  stampOffsetY: number // -80 to 80, default 0
  stampScale: number // 60 to 150, default 100
  showSignatures: boolean // default true
  signatureInkColor: string // default '#0C2A84'
  signatureThreshold: number // 160 to 255, default 225
  signatureScale: number // 70 to 145, default 100
  signatureRotation: number // -15 to +15, default 0
  signatureOffsetX: number // -25 to +25, default 0
  signatureOffsetY: number // -25 to +25, default 0
  watermarkStyle: StudioWatermarkStyle // default 'crest'
  watermarkScale: number // 70 to 130, default 100
  watermarkOpacity: number // 0 to 20, default 5.5
  showNurseryArt: boolean // default true
  nurseryTheme?: NurseryReportTheme // default 'playful'
  artPreset: StudioArtPreset // default 'default'
  nurseryArtOpacity: number // 4 to 15, default 7
  pageDensity?: 'compact' | 'balanced' | 'spacious'
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  badgeHighlightColor?: string
  schoolHeader?: {
    nameEnglish?: string
    nameArabic?: string
    address?: string
    phone?: string
    email?: string
    motto?: string
    logoUrl?: string
  }
  templateOverrides?: Partial<Record<ReportTemplateId, Partial<StudioFormattingConfig>>>

  // Legacy / Toolbar alias fields kept synchronized for 100% compatibility
  colorTheme: string
  fontSize: number
  isBold: boolean
  stampEnabled: boolean
  stampInkColor: string
  signaturesEnabled: boolean
}

export const STUDIO_STORAGE_KEY = 'jiddah_studio_formatting_v2'
export const LEGACY_STUDIO_STORAGE_KEY = 'jiddah_report_studio_formatting'
export const STUDIO_UPDATE_EVENT = 'jiddah:studio-config-updated'

export interface StudioThemePalette {
  id: string
  label: string
  category: 'primary' | 'nursery' | 'theology'
  primary: string
  secondary: string
  accent: string
  highlight: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  badgeHighlightColor: string
  headerBg: string
  borderColor: string
}

export const STUDIO_COLOR_THEMES: Record<string, StudioThemePalette> = {
  'jiddah-classic': {
    id: 'jiddah-classic',
    label: 'Jiddah Classic (Default)',
    category: 'primary',
    primary: '#14532D',
    secondary: '#C59B27',
    accent: '#7F1D1D',
    highlight: '#0D5C3A',
    primaryColor: '#14532D',
    secondaryColor: '#C59B27',
    accentColor: '#7F1D1D',
    badgeHighlightColor: '#0D5C3A',
    headerBg: 'linear-gradient(135deg, #14532D, #047857)',
    borderColor: '#C59B27',
  },
  'royal-emerald': {
    id: 'royal-emerald',
    label: 'Royal Emerald & Amber',
    category: 'primary',
    primary: '#0D5C3A',
    secondary: '#D97706',
    accent: '#065F46',
    highlight: '#10B981',
    primaryColor: '#0D5C3A',
    secondaryColor: '#D97706',
    accentColor: '#065F46',
    badgeHighlightColor: '#10B981',
    headerBg: 'linear-gradient(135deg, #0D5C3A, #059669)',
    borderColor: '#D97706',
  },
  'imperial-navy': {
    id: 'imperial-navy',
    label: 'Imperial Navy & Gold',
    category: 'primary',
    primary: '#1E3A8A',
    secondary: '#D97706',
    accent: '#1D4ED8',
    highlight: '#2563EB',
    primaryColor: '#1E3A8A',
    secondaryColor: '#D97706',
    accentColor: '#1D4ED8',
    badgeHighlightColor: '#2563EB',
    headerBg: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)',
    borderColor: '#D97706',
  },
  'burgundy-heritage': {
    id: 'burgundy-heritage',
    label: 'Burgundy Heritage & Bronze',
    category: 'primary',
    primary: '#7F1D1D',
    secondary: '#B45309',
    accent: '#881337',
    highlight: '#9F1239',
    primaryColor: '#7F1D1D',
    secondaryColor: '#B45309',
    accentColor: '#881337',
    badgeHighlightColor: '#9F1239',
    headerBg: 'linear-gradient(135deg, #7F1D1D, #881337)',
    borderColor: '#B45309',
  },
  monochrome: {
    id: 'monochrome',
    label: 'Monochrome Ink-Saver',
    category: 'primary',
    primary: '#1F2937',
    secondary: '#6B7280',
    accent: '#111827',
    highlight: '#374151',
    primaryColor: '#1F2937',
    secondaryColor: '#6B7280',
    accentColor: '#111827',
    badgeHighlightColor: '#374151',
    headerBg: 'linear-gradient(135deg, #1F2937, #374151)',
    borderColor: '#6B7280',
  },
  'nursery-cobalt-sunshine': {
    id: 'nursery-cobalt-sunshine',
    label: 'Nursery Royal Cobalt & Sunshine (Default)',
    category: 'nursery',
    primary: '#1E40AF',
    secondary: '#F59E0B',
    accent: '#1D4ED8',
    highlight: '#0284C7',
    primaryColor: '#1E40AF',
    secondaryColor: '#F59E0B',
    accentColor: '#1D4ED8',
    badgeHighlightColor: '#0284C7',
    headerBg: 'linear-gradient(135deg, #1E40AF, #1D4ED8)',
    borderColor: '#F59E0B',
  },
  'nursery-emerald-coral': {
    id: 'nursery-emerald-coral',
    label: 'Nursery Emerald Garden & Coral',
    category: 'nursery',
    primary: '#059669',
    secondary: '#FB7185',
    accent: '#047857',
    highlight: '#F59E0B',
    primaryColor: '#059669',
    secondaryColor: '#FB7185',
    accentColor: '#047857',
    badgeHighlightColor: '#F59E0B',
    headerBg: 'linear-gradient(135deg, #059669, #047857)',
    borderColor: '#FB7185',
  },
  'nursery-berry-gold': {
    id: 'nursery-berry-gold',
    label: 'Nursery Berry & Warm Gold',
    category: 'nursery',
    primary: '#9D174D',
    secondary: '#D97706',
    accent: '#831843',
    highlight: '#DB2777',
    primaryColor: '#9D174D',
    secondaryColor: '#D97706',
    accentColor: '#831843',
    badgeHighlightColor: '#DB2777',
    headerBg: 'linear-gradient(135deg, #9D174D, #831843)',
    borderColor: '#D97706',
  },
  'madinah-emerald-gold': {
    id: 'madinah-emerald-gold',
    label: 'Madinah Emerald & Gold (Default)',
    category: 'theology',
    primary: '#064E3B',
    secondary: '#D6B14C',
    accent: '#047857',
    highlight: '#0D9488',
    primaryColor: '#064E3B',
    secondaryColor: '#D6B14C',
    accentColor: '#047857',
    badgeHighlightColor: '#0D9488',
    headerBg: 'linear-gradient(135deg, #064E3B, #047857)',
    borderColor: '#D6B14C',
  },
  'makkah-midnight-bronze': {
    id: 'makkah-midnight-bronze',
    label: 'Makkah Midnight & Bronze',
    category: 'theology',
    primary: '#1E293B',
    secondary: '#B45309',
    accent: '#0F172A',
    highlight: '#D97706',
    primaryColor: '#1E293B',
    secondaryColor: '#B45309',
    accentColor: '#0F172A',
    badgeHighlightColor: '#D97706',
    headerBg: 'linear-gradient(135deg, #1E293B, #0F172A)',
    borderColor: '#B45309',
  },
}

export const STUDIO_ENGLISH_FONT_FAMILIES = [
  'Default Academic (Plus Jakarta)',
  'Inter (Modern Sans)',
  'Merriweather (Academic Serif)',
  'Cinzel (Institutional Prestige)',
  'Lora (Calligraphic Serif)',
  'JetBrains Mono (Tabular)',
] as const

export const STUDIO_ARABIC_FONT_FAMILIES = [
  'Default Quranic Naskh (Amiri)',
  'Cairo (Modern Geometric Arabic)',
  'Tajawal (Clean Contemporary Arabic)',
  'Noto Naskh Arabic (Classic Academic)',
  'Scheherazade New (Traditional Calligraphic)',
  'Almarai (Crisp Arabic Print)',
] as const

export const STUDIO_FONT_FAMILIES = [
  ...STUDIO_ENGLISH_FONT_FAMILIES,
] as const

export const STUDIO_STAMP_INK_COLORS = [
  { id: '#1B3B8B', label: 'Official Stamp Blue' },
  { id: '#5B21B6', label: 'Institutional Violet' },
  { id: '#0D5C3A', label: 'Forest Emerald' },
  { id: '#B91C1C', label: 'Official Crimson Red' },
  { id: '#1E293B', label: 'Archival Carbon Black' },
  { id: '#1E3A8A', label: 'Navy Indigo' },
] as const

export const STUDIO_SIGNATURE_INK_COLORS = [
  { id: '#0C2A84', label: 'Royal Ballpoint Blue' },
  { id: '#1E3A8A', label: 'Classic Navy' },
  { id: '#0F172A', label: 'Jet Black Pen' },
  { id: '#0D5C3A', label: 'Emerald Pen' },
] as const

export const DEFAULT_STUDIO_CONFIG: StudioFormattingConfig = {
  themeId: 'jiddah-classic',
  fontFamily: 'Default Academic (Plus Jakarta)',
  englishFontFamily: 'Default Academic (Plus Jakarta)',
  englishFontScale: 100,
  arabicFontFamily: 'Default Quranic Naskh (Amiri)',
  arabicFontScale: 100,
  fontScale: 100,
  boldScores: true,
  commentFontSize: 'large',
  showStamp: true,
  stampMode: 'digital',
  stampColor: '#1B3B8B',
  stampDateInkColor: '#C81E1E',
  stampNaturalRealism: true,
  stampDate: '',
  stampRotation: -2,
  stampOpacity: 92,
  stampOffsetX: 0,
  stampOffsetY: 0,
  stampScale: 100,
  showSignatures: true,
  signatureInkColor: '#0C2A84',
  signatureThreshold: 225,
  signatureScale: 100,
  signatureRotation: 0,
  signatureOffsetX: 0,
  signatureOffsetY: 0,
  watermarkStyle: 'crest',
  watermarkScale: 100,
  watermarkOpacity: 5.5,
  showNurseryArt: true,
  nurseryTheme: 'playful',
  artPreset: 'default',
  nurseryArtOpacity: 7,
  pageDensity: 'balanced',
  primaryColor: '#14532D',
  secondaryColor: '#C59B27',
  accentColor: '#7F1D1D',
  badgeHighlightColor: '#0D5C3A',
  templateOverrides: {},

  // Synchronized aliases
  colorTheme: 'jiddah-classic',
  fontSize: 100,
  isBold: true,
  stampEnabled: true,
  stampInkColor: '#1B3B8B',
  signaturesEnabled: true,
}

export function getCurriculumGroupTemplates(templateId: ReportTemplateId): {
  label: string
  templates: ReportTemplateId[]
} {
  if (templateId === 'nursery-eot' || templateId === 'nursery-mot') {
    return {
      label: 'All Nursery',
      templates: ['nursery-eot', 'nursery-mot', 'nursery-theology-eot'],
    }
  }
  if (templateId === 'theology-mot' || templateId === 'nursery-theology-eot') {
    return {
      label: 'All Theology',
      templates: ['theology-mot', 'nursery-theology-eot'],
    }
  }
  return {
    label: 'All Primary',
    templates: ['primary-eot', 'p7-eot', 'primary-mot', 'primary-bot'],
  }
}

export function splitArabicSchoolName(rawArabicName?: string | null): {
  line1: string
  line2: string
} {
  const cleaned = String(rawArabicName || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) {
    return {
      line1: 'مدرسة جدة الإسلامية للروضة والإبتدائية',
      line2: 'انساغو - واكيسو',
    }
  }
  const match = cleaned.match(/^(.*?)(?:\s*[-–—_]+\s*|\s+)(انساغ[و|ي].*|واكيسو.*)$/)
  if (match) {
    const l1 = match[1].replace(/[-–—_\s]+$/g, '').trim()
    const rawL2 = match[2].replace(/^[-–—_\s]+/g, '').trim()
    const l2 = rawL2.includes('واكيسو') && !rawL2.includes('-') ? rawL2.replace(/\s+(واكيسو)/, ' - $1') : rawL2
    if (l1 && l2) {
      return { line1: l1, line2: l2 }
    }
  }
  return {
    line1: cleaned.replace(/[-–—_\s]+$/g, ''),
    line2: '',
  }
}

function resolveThemeDefaultForTemplate(templateId?: ReportTemplateId): StudioThemePalette {
  if (templateId === 'nursery-eot' || templateId === 'nursery-mot') {
    return STUDIO_COLOR_THEMES['nursery-cobalt-sunshine']
  }
  if (templateId === 'theology-mot' || templateId === 'nursery-theology-eot') {
    return STUDIO_COLOR_THEMES['madinah-emerald-gold']
  }
  return STUDIO_COLOR_THEMES['jiddah-classic']
}

export function normalizeStudioConfig(
  rawInput?: Partial<StudioFormattingConfig> | Record<string, any> | null,
  templateId?: ReportTemplateId
): StudioFormattingConfig {
  const baseDefaultTheme = resolveThemeDefaultForTemplate(templateId)
  if (!rawInput || typeof rawInput !== 'object') {
    return {
      ...DEFAULT_STUDIO_CONFIG,
      themeId: baseDefaultTheme.id,
      colorTheme: baseDefaultTheme.id,
      primaryColor: baseDefaultTheme.primaryColor,
      secondaryColor: baseDefaultTheme.secondaryColor,
      accentColor: baseDefaultTheme.accentColor,
      badgeHighlightColor: baseDefaultTheme.badgeHighlightColor,
    }
  }
  const inputAny = rawInput as Record<string, any>
  const unwrapped: Record<string, any> =
    inputAny.formatting && typeof inputAny.formatting === 'object' ? inputAny.formatting : inputAny

  const overrideSlice =
    templateId &&
    unwrapped.templateOverrides &&
    typeof unwrapped.templateOverrides === 'object' &&
    unwrapped.templateOverrides[templateId]
      ? unwrapped.templateOverrides[templateId]
      : undefined

  const raw: Record<string, any> = overrideSlice ? { ...unwrapped, ...overrideSlice } : unwrapped

  const rawThemeCandidate = String(raw.colorTheme || raw.themeId || DEFAULT_STUDIO_CONFIG.themeId)
  const useTemplateSpecificTheme =
    !overrideSlice &&
    rawThemeCandidate === 'jiddah-classic' &&
    (!raw.primaryColor || raw.primaryColor === DEFAULT_STUDIO_CONFIG.primaryColor) &&
    (templateId === 'nursery-eot' ||
      templateId === 'nursery-mot' ||
      templateId === 'theology-mot' ||
      templateId === 'nursery-theology-eot')

  const validThemeId = useTemplateSpecificTheme
    ? baseDefaultTheme.id
    : STUDIO_COLOR_THEMES[rawThemeCandidate]
      ? rawThemeCandidate
      : baseDefaultTheme.id
  const themePalette = STUDIO_COLOR_THEMES[validThemeId] || baseDefaultTheme

  const rawEnglishScale = Number(raw.englishFontScale ?? raw.fontSize ?? raw.fontScale ?? DEFAULT_STUDIO_CONFIG.fontScale)
  const englishFontScale = Number.isFinite(rawEnglishScale) ? Math.min(115, Math.max(85, rawEnglishScale)) : 100
  const rawArabicScale = Number(raw.arabicFontScale ?? raw.fontSize ?? raw.fontScale ?? DEFAULT_STUDIO_CONFIG.arabicFontScale)
  const arabicFontScale = Number.isFinite(rawArabicScale) ? Math.min(120, Math.max(85, rawArabicScale)) : 100
  const fontScale = englishFontScale

  const boldScores =
    raw.isBold !== undefined
      ? Boolean(raw.isBold)
      : raw.boldScores !== undefined
        ? Boolean(raw.boldScores)
        : DEFAULT_STUDIO_CONFIG.boldScores

  const commentFontSize: StudioCommentFontSize =
    raw.commentFontSize === 'normal' || raw.commentFontSize === 'large' || raw.commentFontSize === 'xlarge'
      ? raw.commentFontSize
      : 'large'

  const showStamp =
    raw.stampEnabled !== undefined
      ? Boolean(raw.stampEnabled)
      : raw.showStamp !== undefined
        ? Boolean(raw.showStamp)
        : true

  const stampMode: 'digital' | 'uploaded' = raw.stampMode === 'uploaded' ? 'uploaded' : 'digital'
  const stampColor = String(raw.stampInkColor || raw.stampColor || DEFAULT_STUDIO_CONFIG.stampColor)
  const stampDateInkColor = String(raw.stampDateInkColor || DEFAULT_STUDIO_CONFIG.stampDateInkColor)
  const stampNaturalRealism =
    raw.stampNaturalRealism !== undefined ? Boolean(raw.stampNaturalRealism) : DEFAULT_STUDIO_CONFIG.stampNaturalRealism
  const stampDate = typeof raw.stampDate === 'string' ? raw.stampDate : DEFAULT_STUDIO_CONFIG.stampDate

  const rawStampRot = Number(raw.stampRotation ?? DEFAULT_STUDIO_CONFIG.stampRotation)
  const stampRotation = Number.isFinite(rawStampRot) ? Math.min(25, Math.max(-25, rawStampRot)) : -2
  const rawStampOp = Number(raw.stampOpacity ?? DEFAULT_STUDIO_CONFIG.stampOpacity)
  const stampOpacity = Number.isFinite(rawStampOp) ? Math.min(100, Math.max(50, rawStampOp)) : 92
  const rawStampOffsetX = Number(raw.stampOffsetX ?? DEFAULT_STUDIO_CONFIG.stampOffsetX)
  const stampOffsetX = Number.isFinite(rawStampOffsetX) ? Math.min(120, Math.max(-120, rawStampOffsetX)) : 0
  const rawStampOffsetY = Number(raw.stampOffsetY ?? DEFAULT_STUDIO_CONFIG.stampOffsetY)
  const stampOffsetY = Number.isFinite(rawStampOffsetY) ? Math.min(80, Math.max(-80, rawStampOffsetY)) : 0
  const rawStampScale = Number(raw.stampScale ?? DEFAULT_STUDIO_CONFIG.stampScale)
  const stampScale = Number.isFinite(rawStampScale) ? Math.min(150, Math.max(60, rawStampScale)) : 100

  const showSignatures =
    raw.signaturesEnabled !== undefined
      ? Boolean(raw.signaturesEnabled)
      : raw.showSignatures !== undefined
        ? Boolean(raw.showSignatures)
        : true

  const signatureInkColor = String(raw.signatureInkColor || DEFAULT_STUDIO_CONFIG.signatureInkColor)
  const rawSigThreshold = Number(raw.signatureThreshold ?? DEFAULT_STUDIO_CONFIG.signatureThreshold)
  const signatureThreshold = Number.isFinite(rawSigThreshold) ? Math.min(255, Math.max(150, rawSigThreshold)) : 225
  const rawSigScale = Number(raw.signatureScale ?? DEFAULT_STUDIO_CONFIG.signatureScale)
  const signatureScale = Number.isFinite(rawSigScale) ? Math.min(145, Math.max(70, rawSigScale)) : 100
  const rawSigRot = Number(raw.signatureRotation ?? DEFAULT_STUDIO_CONFIG.signatureRotation)
  const signatureRotation = Number.isFinite(rawSigRot) ? Math.min(15, Math.max(-15, rawSigRot)) : 0
  const rawSigX = Number(raw.signatureOffsetX ?? DEFAULT_STUDIO_CONFIG.signatureOffsetX)
  const signatureOffsetX = Number.isFinite(rawSigX) ? Math.min(25, Math.max(-25, rawSigX)) : 0
  const rawSigY = Number(raw.signatureOffsetY ?? DEFAULT_STUDIO_CONFIG.signatureOffsetY)
  const signatureOffsetY = Number.isFinite(rawSigY) ? Math.min(25, Math.max(-25, rawSigY)) : 0

  const watermarkStyle: StudioWatermarkStyle =
    raw.watermarkStyle === 'crest' ||
    raw.watermarkStyle === 'crest-star' ||
    raw.watermarkStyle === 'laurel-seal' ||
    raw.watermarkStyle === 'none'
      ? raw.watermarkStyle
      : 'crest'
  const rawWmScale = Number(raw.watermarkScale ?? DEFAULT_STUDIO_CONFIG.watermarkScale)
  const watermarkScale = Number.isFinite(rawWmScale) ? Math.min(130, Math.max(70, rawWmScale)) : 100
  const rawWatermark = Number(raw.watermarkOpacity ?? DEFAULT_STUDIO_CONFIG.watermarkOpacity)
  const watermarkOpacity = Number.isFinite(rawWatermark)
    ? rawWatermark > 0 && rawWatermark < 1
      ? Number((rawWatermark * 100).toFixed(1))
      : Math.min(20, Math.max(0, rawWatermark))
    : DEFAULT_STUDIO_CONFIG.watermarkOpacity

  const showNurseryArt = raw.showNurseryArt !== undefined ? Boolean(raw.showNurseryArt) : true
  const nurseryTheme: NurseryReportTheme =
    raw.nurseryTheme === 'lineart' || raw.nurseryTheme === 'classic' ? raw.nurseryTheme : 'playful'
  const artPreset: StudioArtPreset =
    raw.artPreset === 'safari' ||
    raw.artPreset === 'abc-literacy' ||
    raw.artPreset === 'stem-explorers' ||
    raw.artPreset === 'islamic-arabesque' ||
    raw.artPreset === 'certificate-filigree' ||
    raw.artPreset === 'none'
      ? raw.artPreset
      : 'default'

  const rawArtOp = Number(raw.nurseryArtOpacity ?? DEFAULT_STUDIO_CONFIG.nurseryArtOpacity)
  const nurseryArtOpacity = Number.isFinite(rawArtOp) ? Math.min(15, Math.max(2, rawArtOp)) : 7

  const englishFontFamily = String(
    raw.englishFontFamily || raw.fontFamily || DEFAULT_STUDIO_CONFIG.englishFontFamily
  )
  const arabicFontFamily = String(raw.arabicFontFamily || DEFAULT_STUDIO_CONFIG.arabicFontFamily)

  const themeSwitched =
    useTemplateSpecificTheme ||
    (raw.colorTheme && raw.themeId && raw.colorTheme !== raw.themeId) ||
    (validThemeId !== 'jiddah-classic' &&
      raw.primaryColor === DEFAULT_STUDIO_CONFIG.primaryColor &&
      raw.secondaryColor === DEFAULT_STUDIO_CONFIG.secondaryColor)

  return {
    themeId: validThemeId,
    fontFamily: englishFontFamily,
    englishFontFamily,
    englishFontScale,
    arabicFontFamily,
    arabicFontScale,
    fontScale,
    boldScores,
    commentFontSize,
    showStamp,
    stampMode,
    stampColor,
    stampDateInkColor,
    stampNaturalRealism,
    stampDate,
    stampRotation,
    stampOpacity,
    stampOffsetX,
    stampOffsetY,
    stampScale,
    showSignatures,
    signatureInkColor,
    signatureThreshold,
    signatureScale,
    signatureRotation,
    signatureOffsetX,
    signatureOffsetY,
    watermarkStyle,
    watermarkScale,
    watermarkOpacity,
    showNurseryArt,
    nurseryTheme,
    artPreset,
    nurseryArtOpacity,
    pageDensity: raw.pageDensity || 'balanced',
    primaryColor: themeSwitched ? themePalette.primaryColor : raw.primaryColor || themePalette.primaryColor,
    secondaryColor: themeSwitched ? themePalette.secondaryColor : raw.secondaryColor || themePalette.secondaryColor,
    accentColor: themeSwitched ? themePalette.accentColor : raw.accentColor || themePalette.accentColor,
    badgeHighlightColor: themeSwitched
      ? themePalette.badgeHighlightColor
      : raw.badgeHighlightColor || themePalette.badgeHighlightColor,
    schoolHeader: raw.schoolHeader && typeof raw.schoolHeader === 'object' ? { ...raw.schoolHeader } : undefined,
    templateOverrides:
      unwrapped.templateOverrides && typeof unwrapped.templateOverrides === 'object'
        ? unwrapped.templateOverrides
        : {},

    // Keep aliases in lockstep
    colorTheme: validThemeId,
    fontSize: fontScale,
    isBold: boldScores,
    stampEnabled: showStamp,
    stampInkColor: stampColor,
    signaturesEnabled: showSignatures,
  }
}

export function resolveStudioFontStack(fontFamily?: StudioFontFamily): string {
  const f = String(fontFamily || '').trim()
  if (!f || f === 'default' || f === 'Default Academic' || f === 'Default Academic (Plus Jakarta)') {
    return "'Plus Jakarta Sans', 'Montserrat', system-ui, sans-serif"
  }
  if (f === 'inter' || f === 'Inter Sans' || f === 'Inter (Modern Sans)' || f === 'Inter') {
    return "'Inter', system-ui, sans-serif"
  }
  if (f === 'Merriweather (Academic Serif)') {
    return "'Merriweather', Georgia, serif"
  }
  if (f === 'serif' || f === 'Times Serif') {
    return "'Times New Roman', Georgia, serif"
  }
  if (f === 'cinzel' || f === 'Cinzel Prestige' || f === 'Cinzel (Institutional Prestige)') {
    return "'Cinzel', Georgia, serif"
  }
  if (f === 'Lora (Calligraphic Serif)') {
    return "'Lora', Georgia, serif"
  }
  if (f === 'JetBrains Mono (Tabular)') {
    return "'JetBrains Mono', ui-monospace, monospace"
  }
  if (f === 'amiri' || f === 'Amiri Arabic' || f === 'Default Quranic Naskh (Amiri)') {
    return "'Amiri', 'Noto Naskh Arabic', serif"
  }
  return "'Plus Jakarta Sans', 'Montserrat', system-ui, sans-serif"
}

export function resolveStudioArabicFontStack(arabicFontFamily?: StudioArabicFontFamily): string {
  const f = String(arabicFontFamily || '').trim()
  if (!f || f === 'amiri' || f === 'Default Quranic Naskh (Amiri)' || f === 'Amiri' || f === 'Amiri Arabic') {
    return "'Amiri', 'Noto Naskh Arabic', serif"
  }
  if (f.includes('Cairo')) return "'Cairo', 'Amiri', sans-serif"
  if (f.includes('Tajawal')) return "'Tajawal', 'Cairo', sans-serif"
  if (f.includes('Noto Naskh')) return "'Noto Naskh Arabic', 'Amiri', serif"
  if (f.includes('Scheherazade')) return "'Scheherazade New', 'Amiri', serif"
  if (f.includes('Almarai')) return "'Almarai', 'Cairo', sans-serif"
  return "'Amiri', 'Noto Naskh Arabic', serif"
}

export interface EffectiveStudioStyle {
  primaryColor: string
  secondaryColor: string
  headerAccentColor: string
  badgeHighlightColor: string
  fontFamilyCss: string
  arabicFontFamilyCss: string
  fontScaleMultiplier: number
  arabicFontScaleMultiplier: number
  scoreFontWeight: number
  headingFontWeight: number
  commentFontSizePx: number
  arabicCommentFontSizePx: number
  densityPadding: string
  watermarkStyle: StudioWatermarkStyle
  watermarkScale: number
  watermarkOpacity: number
  watermarkOpacityPercent: number
  showNurseryArt: boolean
  nurseryTheme: NurseryReportTheme
  artPreset: StudioArtPreset
  nurseryArtOpacity: number
  showStamp: boolean
  stampMode: 'digital' | 'uploaded'
  stampColor: string
  stampDateInkColor: string
  stampNaturalRealism: boolean
  stampDate: string
  stampRotation: number
  stampOpacity: number
  stampOffsetX: number
  stampOffsetY: number
  stampScale: number
  showSignatures: boolean
  signatureInkColor: string
  signatureThreshold: number
  signatureScale: number
  signatureRotation: number
  signatureOffsetX: number
  signatureOffsetY: number
  schoolHeader: {
    nameEnglish: string
    nameArabic: string
    nameArabicLine1: string
    nameArabicLine2: string
    address: string
    phone: string
    email: string
    motto: string
    logoUrl: string
  }
}

export function resolveEffectiveStudioStyle(
  studioConfig?: Partial<StudioFormattingConfig> | Record<string, any> | null,
  reportDataOrTemplateId?: any,
  maybeTemplateId?: ReportTemplateId
): EffectiveStudioStyle {
  const explicitTemplateId =
    typeof reportDataOrTemplateId === 'string'
      ? (reportDataOrTemplateId as ReportTemplateId)
      : maybeTemplateId
  const reportData = typeof reportDataOrTemplateId === 'string' ? undefined : reportDataOrTemplateId

  const normalized = normalizeStudioConfig(
    studioConfig || reportData?.settings?.report_studio_config || DEFAULT_STUDIO_CONFIG,
    explicitTemplateId
  )
  const baseDefaultTheme = resolveThemeDefaultForTemplate(explicitTemplateId)
  const palette = STUDIO_COLOR_THEMES[normalized.themeId] || baseDefaultTheme
  const settings = reportData?.settings || {}
  const headerOverride = normalized.schoolHeader

  const primaryColor = normalized.primaryColor || settings.primary_color || palette.primaryColor
  const secondaryColor = normalized.secondaryColor || settings.secondary_color || palette.secondaryColor
  const headerAccentColor = normalized.accentColor || settings.accent_color || palette.accentColor
  const badgeHighlightColor = normalized.badgeHighlightColor || palette.badgeHighlightColor

  const fontFamilyCss = resolveStudioFontStack(normalized.englishFontFamily || normalized.fontFamily)
  const arabicFontFamilyCss = resolveStudioArabicFontStack(normalized.arabicFontFamily)
  const fontScaleMultiplier = Number((normalized.englishFontScale / 100).toFixed(3))
  const arabicFontScaleMultiplier = Number((normalized.arabicFontScale / 100).toFixed(3))
  const scoreFontWeight = normalized.boldScores ? 900 : 700
  const headingFontWeight = normalized.boldScores ? 900 : 800

  const commentFontSizePx =
    normalized.commentFontSize === 'xlarge'
      ? 16
      : normalized.commentFontSize === 'large'
        ? 14
        : 12

  const arabicCommentFontSizePx =
    normalized.commentFontSize === 'xlarge'
      ? 20
      : normalized.commentFontSize === 'large'
        ? 18.5
        : 15

  const densityPadding =
    normalized.pageDensity === 'compact'
      ? '2px 4px'
      : normalized.pageDensity === 'spacious'
        ? '6px 8px'
        : '3.5px 6px'

  const watermarkOpacityPercent = normalized.watermarkOpacity
  const watermarkOpacity = Number((watermarkOpacityPercent / 100).toFixed(3))

  const rawSchoolName = headerOverride?.nameEnglish || settings.school_name || settings.name
  const nameEnglish =
    rawSchoolName && !String(rawSchoolName).toLowerCase().includes('nursery and primary')
      ? String(rawSchoolName)
      : 'Jiddah Islamic Schools'

  const rawArabic =
    headerOverride?.nameArabic ||
    settings.arabic_name ||
    settings.arabic_school_name ||
    'مدرسة جدة الإسلامية للروضة والإبتدائية - انساغو - واكيسو'

  const { line1: nameArabicLine1, line2: nameArabicLine2 } = splitArabicSchoolName(rawArabic)
  const nameArabic = nameArabicLine2 ? `${nameArabicLine1} - ${nameArabicLine2}` : nameArabicLine1

  const address = headerOverride?.address || settings.address || 'P.O. BOX 34008 Kampala (U)'
  const phone =
    headerOverride?.phone ||
    (settings.phone_1 || settings.phone
      ? `${settings.phone_1 || settings.phone}${settings.phone_2 ? ` / ${settings.phone_2}` : ''}`
      : '+256705316961 / +256 787 779 909')
  const email = headerOverride?.email || settings.email || 'jiddahislamicnurseryandpri@gmail.com'
  const motto = headerOverride?.motto || settings.motto || 'Striving for Life & The Hereafter'
  const logoUrl = headerOverride?.logoUrl || settings.logo_url || '/logo-512h.png'

  return {
    primaryColor,
    secondaryColor,
    headerAccentColor,
    badgeHighlightColor,
    fontFamilyCss,
    arabicFontFamilyCss,
    fontScaleMultiplier,
    arabicFontScaleMultiplier,
    scoreFontWeight,
    headingFontWeight,
    commentFontSizePx,
    arabicCommentFontSizePx,
    densityPadding,
    watermarkStyle: normalized.watermarkStyle,
    watermarkScale: normalized.watermarkScale,
    watermarkOpacity,
    watermarkOpacityPercent,
    showNurseryArt: normalized.showNurseryArt,
    nurseryTheme: normalized.nurseryTheme || 'playful',
    artPreset: normalized.artPreset,
    nurseryArtOpacity: normalized.nurseryArtOpacity,
    showStamp: normalized.showStamp,
    stampMode: normalized.stampMode,
    stampColor: normalized.stampColor,
    stampDateInkColor: normalized.stampDateInkColor,
    stampNaturalRealism: normalized.stampNaturalRealism,
    stampDate: normalized.stampDate,
    stampRotation: normalized.stampRotation,
    stampOpacity: normalized.stampOpacity,
    stampOffsetX: normalized.stampOffsetX,
    stampOffsetY: normalized.stampOffsetY,
    stampScale: normalized.stampScale,
    showSignatures: normalized.showSignatures,
    signatureInkColor: normalized.signatureInkColor,
    signatureThreshold: normalized.signatureThreshold,
    signatureScale: normalized.signatureScale,
    signatureRotation: normalized.signatureRotation,
    signatureOffsetX: normalized.signatureOffsetX,
    signatureOffsetY: normalized.signatureOffsetY,
    schoolHeader: {
      nameEnglish,
      nameArabic,
      nameArabicLine1,
      nameArabicLine2,
      address,
      phone,
      email,
      motto,
      logoUrl,
    },
  }
}

export function loadStudioConfigFromStorage(): StudioFormattingConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_STUDIO_CONFIG }
  try {
    const v2Raw = localStorage.getItem(STUDIO_STORAGE_KEY)
    if (v2Raw) {
      return normalizeStudioConfig(JSON.parse(v2Raw))
    }
    const legacyRaw = localStorage.getItem(LEGACY_STUDIO_STORAGE_KEY)
    if (legacyRaw) {
      return normalizeStudioConfig(JSON.parse(legacyRaw))
    }
  } catch {}
  return { ...DEFAULT_STUDIO_CONFIG }
}

export function saveStudioConfigToStorage(config: Partial<StudioFormattingConfig>): StudioFormattingConfig {
  const normalized = normalizeStudioConfig(config)
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(normalized)
      localStorage.setItem(STUDIO_STORAGE_KEY, serialized)
      localStorage.setItem(LEGACY_STUDIO_STORAGE_KEY, serialized)
      window.dispatchEvent(new CustomEvent(STUDIO_UPDATE_EVENT, { detail: normalized }))
    } catch {}
  }
  return normalized
}

export async function persistStudioConfigGlobally(
  config: Partial<StudioFormattingConfig>
): Promise<boolean> {
  const normalized = saveStudioConfigToStorage(config)
  try {
    const res = await fetch('/api/settings/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_studio_config: normalized,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const StudioFormattingContext = createContext<StudioFormattingConfig>(DEFAULT_STUDIO_CONFIG)

export function StudioFormattingProvider({
  value,
  children,
}: {
  value?: Partial<StudioFormattingConfig> | null
  children: React.ReactNode
}) {
  const normalized = normalizeStudioConfig(value)
  return React.createElement(StudioFormattingContext.Provider, { value: normalized }, children)
}

export type ResolvedStudioFormatting = StudioFormattingConfig & {
  formatting: StudioFormattingConfig
  palette: StudioThemePalette
  fontStack: string | undefined
}

export function useStudioFormatting(
  propFormatting?: Partial<StudioFormattingConfig> | Record<string, any> | null,
  fallbackFormatting?: Partial<StudioFormattingConfig> | Record<string, any> | null
): ResolvedStudioFormatting {
  const contextFormatting = useContext(StudioFormattingContext)
  const base = fallbackFormatting
    ? normalizeStudioConfig({ ...contextFormatting, ...fallbackFormatting })
    : contextFormatting
  const merged = propFormatting
    ? normalizeStudioConfig({ ...base, ...((propFormatting as Record<string, any>).formatting || propFormatting) })
    : base
  const palette = STUDIO_COLOR_THEMES[merged.themeId] || STUDIO_COLOR_THEMES['jiddah-classic']
  const fontStack = resolveStudioFontStack(merged.englishFontFamily || merged.fontFamily)
  return {
    ...merged,
    formatting: merged,
    palette,
    fontStack,
  }
}

export function useSyncedStudioConfig(initial?: Partial<StudioFormattingConfig>): [
  StudioFormattingConfig,
  (updater: Partial<StudioFormattingConfig> | ((prev: StudioFormattingConfig) => Partial<StudioFormattingConfig>)) => void
] {
  const [config, setConfig] = useState<StudioFormattingConfig>(() =>
    initial ? normalizeStudioConfig(initial) : loadStudioConfigFromStorage()
  )

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const custom = e as CustomEvent<StudioFormattingConfig>
      if (custom.detail) {
        setConfig(normalizeStudioConfig(custom.detail))
      } else {
        setConfig(loadStudioConfigFromStorage())
      }
    }
    window.addEventListener(STUDIO_UPDATE_EVENT, onUpdated)
    return () => window.removeEventListener(STUDIO_UPDATE_EVENT, onUpdated)
  }, [])

  const updateConfig = React.useCallback(
    (updater: Partial<StudioFormattingConfig> | ((prev: StudioFormattingConfig) => Partial<StudioFormattingConfig>)) => {
      setConfig((prev) => {
        const nextPartial = typeof updater === 'function' ? updater(prev) : updater
        const themeChanged =
          (nextPartial.colorTheme && nextPartial.colorTheme !== prev.colorTheme) ||
          (nextPartial.themeId && nextPartial.themeId !== prev.themeId)
        const nextThemeId = String(nextPartial.colorTheme || nextPartial.themeId || prev.themeId)
        const nextPalette = STUDIO_COLOR_THEMES[nextThemeId] || STUDIO_COLOR_THEMES['jiddah-classic']
        const mergedInput: Partial<StudioFormattingConfig> = {
          ...prev,
          ...nextPartial,
          ...(themeChanged
            ? {
                themeId: nextThemeId,
                colorTheme: nextThemeId,
                primaryColor: nextPartial.primaryColor || nextPalette.primaryColor,
                secondaryColor: nextPartial.secondaryColor || nextPalette.secondaryColor,
                accentColor: nextPartial.accentColor || nextPalette.accentColor,
                badgeHighlightColor: nextPartial.badgeHighlightColor || nextPalette.badgeHighlightColor,
              }
            : {}),
        }
        return saveStudioConfigToStorage(mergedInput)
      })
    },
    []
  )

  return [config, updateConfig]
}
