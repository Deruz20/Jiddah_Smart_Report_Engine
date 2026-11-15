'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type StudioThemeId =
  | 'jiddah-classic'
  | 'royal-emerald'
  | 'imperial-navy'
  | 'burgundy-heritage'
  | 'monochrome'
  | string

export type StudioFontFamily =
  | 'default'
  | 'inter'
  | 'serif'
  | 'cinzel'
  | 'amiri'
  | 'Default Academic'
  | 'Inter Sans'
  | 'Times Serif'
  | 'Cinzel Prestige'
  | 'Amiri Arabic'
  | string

export type StudioCommentFontSize = 'normal' | 'large' | 'xlarge'

export interface StudioFormattingConfig {
  themeId: StudioThemeId
  fontFamily: StudioFontFamily
  fontScale: number // 85 to 115, default 100
  boldScores: boolean // default false
  commentFontSize: StudioCommentFontSize // default 'large'
  showStamp: boolean // default true
  stampMode: 'digital' | 'uploaded' // default 'digital'
  stampColor: string // default '#1B3B8B'
  stampDate: string // default ''
  showSignatures: boolean // default true
  signatureInkColor: string // default '#0C2A84'
  watermarkOpacity: number // 0 to 0.15 or 0..15 integer percentage
  showNurseryArt: boolean // default true
  nurseryArtOpacity: number // 4 to 12, default 7
  signatureThreshold: number // 160 to 240, default 210
  stampScale: number // 85 to 115, default 100
  pageDensity?: 'compact' | 'balanced' | 'spacious'
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string

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
  primary: string
  secondary: string
  accent: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headerBg: string
  borderColor: string
}

export const STUDIO_COLOR_THEMES: Record<string, StudioThemePalette> = {
  'jiddah-classic': {
    id: 'jiddah-classic',
    label: 'Jiddah Classic',
    primary: '#0f4d25',
    secondary: '#C59B27',
    accent: '#7F1D1D',
    primaryColor: '#0f4d25',
    secondaryColor: '#C59B27',
    accentColor: '#7F1D1D',
    headerBg: 'linear-gradient(135deg, #064e3b, #047857)',
    borderColor: '#c2994c',
  },
  'royal-emerald': {
    id: 'royal-emerald',
    label: 'Royal Emerald',
    primary: '#0D5C3A',
    secondary: '#10B981',
    accent: '#065F46',
    primaryColor: '#0D5C3A',
    secondaryColor: '#10B981',
    accentColor: '#065F46',
    headerBg: 'linear-gradient(135deg, #0D5C3A, #059669)',
    borderColor: '#10B981',
  },
  'imperial-navy': {
    id: 'imperial-navy',
    label: 'Imperial Navy & Gold',
    primary: '#1E3A8A',
    secondary: '#D97706',
    accent: '#1D4ED8',
    primaryColor: '#1E3A8A',
    secondaryColor: '#D97706',
    accentColor: '#1D4ED8',
    headerBg: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)',
    borderColor: '#D97706',
  },
  'burgundy-heritage': {
    id: 'burgundy-heritage',
    label: 'Burgundy Heritage',
    primary: '#7F1D1D',
    secondary: '#B45309',
    accent: '#991B1B',
    primaryColor: '#7F1D1D',
    secondaryColor: '#B45309',
    accentColor: '#991B1B',
    headerBg: 'linear-gradient(135deg, #7F1D1D, #991B1B)',
    borderColor: '#B45309',
  },
  monochrome: {
    id: 'monochrome',
    label: 'Monochrome Ink-Saver',
    primary: '#18181B',
    secondary: '#71717A',
    accent: '#27272A',
    primaryColor: '#18181B',
    secondaryColor: '#71717A',
    accentColor: '#27272A',
    headerBg: 'linear-gradient(135deg, #18181B, #3F3F46)',
    borderColor: '#52525B',
  },
}

export const STUDIO_FONT_FAMILIES = [
  'Default Academic',
  'Inter Sans',
  'Times Serif',
  'Cinzel Prestige',
  'Amiri Arabic',
] as const

export const STUDIO_STAMP_INK_COLORS = [
  { id: '#1B3B8B', label: 'Royal Blue' },
  { id: '#14532D', label: 'Forest Green' },
  { id: '#18181B', label: 'Midnight Black' },
  { id: '#B91C1C', label: 'Crimson Red' },
] as const

export const DEFAULT_STUDIO_CONFIG: StudioFormattingConfig = {
  themeId: 'jiddah-classic',
  fontFamily: 'Default Academic',
  fontScale: 100,
  boldScores: false,
  commentFontSize: 'large',
  showStamp: true,
  stampMode: 'digital',
  stampColor: '#1B3B8B',
  stampDate: '',
  showSignatures: true,
  signatureInkColor: '#0C2A84',
  watermarkOpacity: 4,
  showNurseryArt: true,
  nurseryArtOpacity: 7,
  signatureThreshold: 210,
  stampScale: 100,
  pageDensity: 'balanced',
  primaryColor: '#14532D',
  secondaryColor: '#C59B27',
  accentColor: '#7F1D1D',

  // Synchronized aliases
  colorTheme: 'jiddah-classic',
  fontSize: 100,
  isBold: false,
  stampEnabled: true,
  stampInkColor: '#1B3B8B',
  signaturesEnabled: true,
}

export function normalizeStudioConfig(
  rawInput?: Partial<StudioFormattingConfig> | Record<string, any> | null
): StudioFormattingConfig {
  if (!rawInput || typeof rawInput !== 'object') return { ...DEFAULT_STUDIO_CONFIG }
  const inputAny = rawInput as Record<string, any>
  const raw: Record<string, any> =
    inputAny.formatting && typeof inputAny.formatting === 'object' ? inputAny.formatting : inputAny

  const themeId = String(raw.colorTheme || raw.themeId || DEFAULT_STUDIO_CONFIG.themeId)
  const validThemeId = STUDIO_COLOR_THEMES[themeId] ? themeId : 'jiddah-classic'
  const themePalette = STUDIO_COLOR_THEMES[validThemeId]

  const rawFontScale = Number(raw.fontSize ?? raw.fontScale ?? DEFAULT_STUDIO_CONFIG.fontScale)
  const fontScale = Number.isFinite(rawFontScale) ? Math.min(115, Math.max(85, rawFontScale)) : 100

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
  const stampDate = typeof raw.stampDate === 'string' ? raw.stampDate : DEFAULT_STUDIO_CONFIG.stampDate

  const showSignatures =
    raw.signaturesEnabled !== undefined
      ? Boolean(raw.signaturesEnabled)
      : raw.showSignatures !== undefined
      ? Boolean(raw.showSignatures)
      : true

  const signatureInkColor = String(raw.signatureInkColor || DEFAULT_STUDIO_CONFIG.signatureInkColor)

  const rawWatermark = Number(raw.watermarkOpacity ?? DEFAULT_STUDIO_CONFIG.watermarkOpacity)
  const watermarkOpacity = Number.isFinite(rawWatermark)
    ? rawWatermark > 0 && rawWatermark < 1
      ? Math.round(rawWatermark * 100)
      : Math.min(20, Math.max(0, rawWatermark))
    : DEFAULT_STUDIO_CONFIG.watermarkOpacity

  const showNurseryArt = raw.showNurseryArt !== undefined ? Boolean(raw.showNurseryArt) : true
  const rawArtOp = Number(raw.nurseryArtOpacity ?? DEFAULT_STUDIO_CONFIG.nurseryArtOpacity)
  const nurseryArtOpacity = Number.isFinite(rawArtOp) ? Math.min(15, Math.max(2, rawArtOp)) : 7
  const rawSigThreshold = Number(raw.signatureThreshold ?? DEFAULT_STUDIO_CONFIG.signatureThreshold)
  const signatureThreshold = Number.isFinite(rawSigThreshold) ? Math.min(245, Math.max(150, rawSigThreshold)) : 210
  const rawStampScale = Number(raw.stampScale ?? DEFAULT_STUDIO_CONFIG.stampScale)
  const stampScale = Number.isFinite(rawStampScale) ? Math.min(125, Math.max(75, rawStampScale)) : 100
  const fontFamily = String(raw.fontFamily || DEFAULT_STUDIO_CONFIG.fontFamily)

  return {
    themeId: validThemeId,
    fontFamily,
    fontScale,
    boldScores,
    commentFontSize,
    showStamp,
    stampMode,
    stampColor,
    stampDate,
    showSignatures,
    signatureInkColor,
    watermarkOpacity,
    showNurseryArt,
    nurseryArtOpacity,
    signatureThreshold,
    stampScale,
    pageDensity: raw.pageDensity || 'balanced',
    primaryColor: raw.primaryColor || themePalette.primaryColor,
    secondaryColor: raw.secondaryColor || themePalette.secondaryColor,
    accentColor: raw.accentColor || themePalette.accentColor,

    // Keep aliases in lockstep
    colorTheme: validThemeId,
    fontSize: fontScale,
    isBold: boldScores,
    stampEnabled: showStamp,
    stampInkColor: stampColor,
    signaturesEnabled: showSignatures,
  }
}

export function resolveStudioFontStack(fontFamily?: StudioFontFamily): string | undefined {
  if (!fontFamily || fontFamily === 'default' || fontFamily === 'Default Academic') return undefined
  if (fontFamily === 'inter' || fontFamily === 'Inter Sans') return "'Inter', system-ui, sans-serif"
  if (fontFamily === 'serif' || fontFamily === 'Times Serif') return "'Times New Roman', Georgia, serif"
  if (fontFamily === 'cinzel' || fontFamily === 'Cinzel Prestige') return "'Cinzel', Georgia, serif"
  if (fontFamily === 'amiri' || fontFamily === 'Amiri Arabic') return "'Amiri', 'Cairo', serif"
  return undefined
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
  const fontStack = resolveStudioFontStack(merged.fontFamily)
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
        return saveStudioConfigToStorage({ ...prev, ...nextPartial })
      })
    },
    []
  )

  return [config, updateConfig]
}
