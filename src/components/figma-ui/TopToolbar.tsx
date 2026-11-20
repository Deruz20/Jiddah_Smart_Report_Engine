'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Download,
  Printer,
  Share2,
  Search,
  X,
  LayoutGrid,
  LayoutList,
  CheckSquare,
  List,
  Sliders,
  Settings,
  History,
  Menu,
  ArrowLeft,
  Sun,
  Moon,
  Palette,
  Type,
  Bold,
  Stamp,
  Check,
  Sparkles,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { useSidebar } from '@/components/figma-ui/ui/sidebar'
import { getStoredThemeMode, setStoredThemeMode, type ThemeMode } from '@/lib/client-cache'
import { persistStudioConfigGlobally, saveStudioConfigToStorage, normalizeStudioConfig, STUDIO_ENGLISH_FONT_FAMILIES, type NurseryReportTheme } from '@/lib/studio-config-store'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { toast } from 'sonner'

export interface StudioFormattingState {
  fontFamily: string
  fontSize: number
  isBold: boolean
  colorTheme: string
  stampEnabled: boolean
  stampMode?: 'digital' | 'uploaded'
  stampInkColor: string
  stampDate?: string
  signaturesEnabled: boolean
  watermarkOpacity: number
  showNurseryArt?: boolean
  nurseryTheme?: NurseryReportTheme
  nurseryArtOpacity?: number
  signatureThreshold?: number
  stampScale?: number
}

export const DEFAULT_STUDIO_FORMATTING: StudioFormattingState = {
  fontFamily: 'Default Academic',
  fontSize: 100,
  isBold: false,
  colorTheme: 'jiddah-classic',
  stampEnabled: true,
  stampMode: 'digital',
  stampInkColor: '#1B3B8B',
  stampDate: '',
  signaturesEnabled: true,
  watermarkOpacity: 4,
  showNurseryArt: true,
  nurseryTheme: undefined,
  nurseryArtOpacity: 7,
  signatureThreshold: 210,
  stampScale: 100,
}

const COLOR_THEMES = [
  { id: 'jiddah-classic', label: 'Jiddah Classic', primary: '#14532D', secondary: '#C59B27' },
  { id: 'royal-emerald', label: 'Royal Emerald', primary: '#0D5C3A', secondary: '#10B981' },
  { id: 'imperial-navy', label: 'Imperial Navy & Gold', primary: '#1E3A8A', secondary: '#D97706' },
  { id: 'burgundy-heritage', label: 'Burgundy Heritage', primary: '#7F1D1D', secondary: '#B45309' },
  { id: 'monochrome', label: 'Monochrome Ink-Saver', primary: '#18181B', secondary: '#71717A' },
]

const FONT_FAMILIES = [...STUDIO_ENGLISH_FONT_FAMILIES]

const STAMP_INK_COLORS = [
  { id: '#1D4ED8', label: 'Royal Blue' },
  { id: '#14532D', label: 'Forest Green' },
  { id: '#18181B', label: 'Midnight Black' },
  { id: '#B91C1C', label: 'Crimson Red' },
]

interface TopToolbarProps {
  searchOpen?: boolean
  onSearchToggle?: () => void
  onDownload?: () => void
  downloadOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[]
  onPrint?: () => void
  printOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[]
  onBatchPrint?: () => void
  onShare?: () => void
  reportCount?: number
  layout?: 'single' | 'grid'
  onLayoutToggle?: () => void
  isGenerating?: boolean
  title?: React.ReactNode
  classCohortSelect?: React.ReactNode
  studentSelectorPill?: React.ReactNode
  activeTermPill?: React.ReactNode
  phaseTrack?: React.ReactNode
  curriculumTrack?: React.ReactNode
  layoutTrack?: React.ReactNode
  primaryPrintAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  moreActionsItems?: {
    label: string
    icon: any
    onClick: () => void
  }[]
  studioFormatting?: StudioFormattingState
  onStudioFormattingChange?: (updater: (prev: StudioFormattingState) => StudioFormattingState) => void
  cardsPerRow?: 1 | 2 | 3
  onCardsPerRowChange?: (count: 1 | 2 | 3) => void
  onPrintCurrent?: () => void
  visualSelectMode?: boolean
  onToggleVisualSelect?: () => void
  onOpenQaAuditor?: () => void
  qaIssueCount?: number
}

export function TopToolbar({
  searchOpen = false,
  onSearchToggle,
  onDownload,
  downloadOptions,
  onPrint,
  printOptions,
  onBatchPrint,
  onShare,
  reportCount = 0,
  layout = 'single',
  onLayoutToggle,
  isGenerating,
  title,
  classCohortSelect,
  studentSelectorPill,
  activeTermPill,
  phaseTrack,
  curriculumTrack,
  layoutTrack,
  primaryPrintAction,
  moreActionsItems,
  studioFormatting = DEFAULT_STUDIO_FORMATTING,
  onStudioFormattingChange,
  cardsPerRow = 1,
  onCardsPerRowChange,
  onPrintCurrent,
  visualSelectMode = false,
  onToggleVisualSelect,
  onOpenQaAuditor,
  qaIssueCount = 0,
}: TopToolbarProps) {
  let sidebar: { toggleSidebar: () => void } | null = null
  try {
    sidebar = useSidebar()
  } catch {
    sidebar = null
  }

  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  useEffect(() => {
    const sync = () => setThemeMode(getStoredThemeMode())
    sync()
    window.addEventListener('jiddah-theme-changed', sync)
    return () => window.removeEventListener('jiddah-theme-changed', sync)
  }, [])

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark'
    setStoredThemeMode(next)
    setThemeMode(next)
  }

  const updateFormatting = (partial: Partial<StudioFormattingState>) => {
    if (onStudioFormattingChange) {
      onStudioFormattingChange((prev) => ({ ...prev, ...partial }))
    }
  }

  // Document Studio Formatting Ribbon & Popover
  const studioControlsContent = (
    <div className="p-3.5 flex flex-col gap-3.5 text-xs select-none">
      <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-2">
        <span className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 text-xs">
          <Sparkles className="size-3.5 text-[#0D5C3A] dark:text-[#34D399]" />
          Document Studio Controls
        </span>
        <button
          type="button"
          onClick={() => {
            if (onStudioFormattingChange) onStudioFormattingChange(() => DEFAULT_STUDIO_FORMATTING)
          }}
          className="text-[10px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
        >
          Reset Defaults
        </button>
      </div>

      {/* 1. Typography Controls */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Typography & Scaling
        </span>
        <div className="flex items-center gap-2">
          {/* Font Family */}
          <CustomPillSelect
            ariaLabel="Typography Font Family"
            value={studioFormatting.fontFamily}
            onChange={(val) => updateFormatting({ fontFamily: val })}
            options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
            triggerClassName="flex-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold"
          />

          {/* Size Stepper: A- / 100% / A+ */}
          <div className="flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] rounded-lg border border-black/[0.06] dark:border-white/[0.08] p-0.5">
            <button
              type="button"
              onClick={() => updateFormatting({ fontSize: Math.max(85, studioFormatting.fontSize - 5) })}
              className="px-2 py-0.5 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="px-1.5 text-[10px] font-mono tabular-nums text-stone-500">
              {studioFormatting.fontSize}%
            </span>
            <button
              type="button"
              onClick={() => updateFormatting({ fontSize: Math.min(115, studioFormatting.fontSize + 5) })}
              className="px-2 py-0.5 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Bold Weight Toggle */}
          <button
            type="button"
            onClick={() => updateFormatting({ isBold: !studioFormatting.isBold })}
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-serif font-black text-xs transition cursor-pointer border ${
              studioFormatting.isBold
                ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Toggle bold headings & scores"
          >
            B
          </button>
        </div>
      </div>

      {/* 2. Color Theme Swatches */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Template Color Themes
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_THEMES.map((theme) => {
            const isSelected = studioFormatting.colorTheme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => updateFormatting({ colorTheme: theme.id })}
                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer text-center ${
                  isSelected
                    ? 'border-[#0D5C3A] dark:border-[#34D399] bg-[#0D5C3A]/5 dark:bg-[#34D399]/10 shadow-2xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
                title={theme.label}
              >
                <div className="flex items-center -space-x-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white dark:border-black shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-white dark:border-black shrink-0"
                    style={{ backgroundColor: theme.secondary }}
                  />
                </div>
                <span className="text-[9px] font-medium text-stone-600 dark:text-stone-300 truncate w-full">
                  {theme.label.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Stamp & Signature Controls */}
      <div className="flex flex-col gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Stamps, Signatures & Watermarks
        </span>

        {/* Official Stamp Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-200">
            Official Headteacher Stamp
          </span>
          <button
            type="button"
            onClick={() => updateFormatting({ stampEnabled: !studioFormatting.stampEnabled })}
            className={`w-9 h-5 rounded-full transition cursor-pointer p-0.5 flex items-center ${
              studioFormatting.stampEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Stamp Mode & Ink Colors */}
        {studioFormatting.stampEnabled && (
          <div className="flex flex-col gap-2 pl-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-500">Stamp Mode:</span>
              <div className="flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] rounded-lg p-0.5 border border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => updateFormatting({ stampMode: 'digital' })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    (studioFormatting.stampMode || 'digital') === 'digital'
                      ? 'bg-[#0D5C3A] text-white'
                      : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  Digital Vector
                </button>
                <button
                  type="button"
                  onClick={() => updateFormatting({ stampMode: 'uploaded' })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    studioFormatting.stampMode === 'uploaded'
                      ? 'bg-[#0D5C3A] text-white'
                      : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  Uploaded Image Backup
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-500">Ink Color:</span>
              <div className="flex items-center gap-1">
                {STAMP_INK_COLORS.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    onClick={() => updateFormatting({ stampInkColor: ink.id })}
                    className={`w-4 h-4 rounded-full border transition cursor-pointer ${
                      studioFormatting.stampInkColor === ink.id
                        ? 'ring-2 ring-[#0D5C3A] scale-110'
                        : 'border-white/50'
                    }`}
                    style={{ backgroundColor: ink.id }}
                    title={ink.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-500">Stamp Date:</span>
              <input
                type="text"
                value={studioFormatting.stampDate || ''}
                onChange={(e) => updateFormatting({ stampDate: e.target.value.toUpperCase() })}
                placeholder="24 OCT 2026"
                className="h-6 px-2 w-32 rounded bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-bold text-stone-800 dark:text-stone-100"
              />
            </div>
          </div>
        )}

        {/* Signatures Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-200">
            Teacher & Headteacher Signatures
          </span>
          <button
            type="button"
            onClick={() => updateFormatting({ signaturesEnabled: !studioFormatting.signaturesEnabled })}
            className={`w-9 h-5 rounded-full transition cursor-pointer p-0.5 flex items-center ${
              studioFormatting.signaturesEnabled ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Watermark Opacity Stepper */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-200">
            Crest Watermark Opacity
          </span>
          <div className="flex items-center gap-1">
            {[0, 4, 8, 12, 15].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => updateFormatting({ watermarkOpacity: op })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums cursor-pointer ${
                  studioFormatting.watermarkOpacity === op
                    ? 'bg-[#0D5C3A] text-white'
                    : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-600 dark:text-stone-300'
                }`}
              >
                {op}%
              </button>
            ))}
          </div>
        </div>

        {/* Nursery Educative Art Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Nursery Educative Art
          </span>
          <button
            type="button"
            onClick={() =>
              updateFormatting({
                showNurseryArt: !(studioFormatting.showNurseryArt ?? true),
              })
            }
            className={`w-9 h-5 rounded-full transition cursor-pointer p-0.5 flex items-center ${
              (studioFormatting.showNurseryArt ?? true)
                ? 'bg-[#0D5C3A] justify-end'
                : 'bg-stone-300 dark:bg-stone-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Nursery Card Style Selector */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-200">
            Nursery Card Style
          </span>
          <div className="flex flex-wrap items-center bg-[#F0F4F9] dark:bg-[#1E2623] rounded-lg p-0.5 border border-black/[0.06] dark:border-white/[0.08] gap-0.5">
            {([
              { id: 'islamic-garden', label: 'Islamic Garden' },
              { id: 'playful', label: 'Playful' },
              { id: 'lineart', label: 'Line-Art B&W' },
              { id: 'classic', label: 'Classic' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`toolbar-nursery-theme-${t.id}`}
                onClick={() => updateFormatting({ nurseryTheme: t.id })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                  (studioFormatting.nurseryTheme || 'playful') === t.id
                    ? 'bg-[#0D5C3A] text-white'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save as School Default + Open Full Report Studio 2.0 */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={async () => {
              const normalized = normalizeStudioConfig(studioFormatting)
              saveStudioConfigToStorage(normalized)
              const ok = await persistStudioConfigGlobally(normalized)
              if (ok) {
                toast.success('Studio design saved as school default across all reports.')
              } else {
                toast.success('Studio design saved locally across all reports.')
              }
            }}
            className="w-full h-8 px-3 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save as School Default</span>
          </button>
          <Link
            href="/admin/reports/studio"
            className="w-full h-7.5 px-3 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition border border-black/[0.06] dark:border-white/[0.08]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-[#10B981]" />
            <span>Open Full Report Studio 2.0</span>
          </Link>
        </div>
      </div>
    </div>
  )

  if (classCohortSelect) {
    return (
      <Tooltip.Provider delayDuration={100}>
        <div
          data-testid="reports-zone-1-bar"
          className="w-full h-12 bg-white dark:bg-[#151D1A] rounded-2xl px-3 py-1.5 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 hidden md:flex items-center justify-between gap-2 shadow-2xs z-20 print:hidden overflow-hidden max-w-full"
        >
          {/* Left Group: Back Arrow, Class Cohort, Student Quick Jump */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Link
                  href="/admin"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                  aria-label="Back to Dashboard"
                >
                  <ArrowLeft size={16} />
                </Link>
              </Tooltip.Trigger>
              <TooltipContent>Back to Dashboard</TooltipContent>
            </Tooltip.Root>

            {classCohortSelect}
            {studentSelectorPill}
          </div>

          {/* Center Group: Phase Track + Curriculum Track */}
          <div className="flex items-center gap-1.5 shrink-0">
            {phaseTrack}
            {curriculumTrack}
          </div>

          {/* Right Studio & Output Group: View Toggle, Visual Select, Studio, Download, Print, Theme, More */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {/* Single Iconic View Mode Toggle (Grid View 2-up <-> Single Scroll View) */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  data-testid="view-mode-toggle"
                  onClick={onLayoutToggle}
                  aria-label={layout === 'grid' ? 'Switch to Single scroll view' : 'Switch to Grid view (2 per row)'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 border ${
                    layout === 'grid'
                      ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                      : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 border-black/[0.04] dark:border-white/[0.06] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C]'
                  }`}
                >
                  {layout === 'grid' ? <LayoutList size={15} /> : <LayoutGrid size={15} />}
                </button>
              </Tooltip.Trigger>
              <TooltipContent>
                {layout === 'grid' ? 'Single scroll view' : 'Grid view (2 per row)'}
              </TooltipContent>
            </Tooltip.Root>

            {/* Visual Card Select Toggle Icon */}
            {onToggleVisualSelect && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    data-testid="visual-select-toggle"
                    onClick={onToggleVisualSelect}
                    aria-label="Select report cards visually on canvas"
                    aria-pressed={visualSelectMode}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 border ${
                      visualSelectMode
                        ? 'bg-[#EA580C] text-white border-[#EA580C]'
                        : 'bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 border-black/[0.04] dark:border-white/[0.06] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C]'
                    }`}
                  >
                    <CheckSquare size={15} />
                  </button>
                </Tooltip.Trigger>
                <TooltipContent>Select report cards visually on canvas</TooltipContent>
              </Tooltip.Root>
            )}

            {/* Pre-Print QA & Name Check Button */}
            {onOpenQaAuditor && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    data-testid="qa-name-check-trigger"
                    onClick={onOpenQaAuditor}
                    className={`h-8 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition shrink-0 border ${
                      qaIssueCount > 0
                        ? 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                        : 'bg-[#0D5C3A]/10 text-[#0D5C3A] dark:bg-[#10B981]/15 dark:text-[#34D399] border-[#0D5C3A]/25 hover:bg-[#0D5C3A]/18'
                    }`}
                  >
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span className="font-bold hidden lg:inline">QA &amp; Name Check</span>
                    {qaIssueCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-black tabular-nums">
                        {qaIssueCount}
                      </span>
                    )}
                  </button>
                </Tooltip.Trigger>
                <TooltipContent>
                  {qaIssueCount > 0
                    ? `Pre-Print QA & Name Check (${qaIssueCount} item${qaIssueCount === 1 ? '' : 's'} flagged)`
                    : 'Pre-Print QA & Name Check — All checks clear'}
                </TooltipContent>
              </Tooltip.Root>
            )}

            {/* Studio Customize Pill */}
            <Popover>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      data-testid="studio-popover-trigger"
                      className="h-8 px-2.5 rounded-full bg-[#D97706]/12 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] border border-[#D97706]/30 hover:bg-[#D97706]/20 dark:hover:bg-[#F59E0B]/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Palette className="size-3.5 text-[#D97706] dark:text-[#FCD34D] shrink-0" />
                      <span className="font-bold hidden xl:inline">Customize</span>
                    </button>
                  </PopoverTrigger>
                </Tooltip.Trigger>
                <TooltipContent>Customize Fonts, Colors, Stamp & Signatures</TooltipContent>
              </Tooltip.Root>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[320px] sm:w-[360px] max-w-[calc(100vw-20px)] max-h-[72dvh] overflow-y-auto p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl bg-white dark:bg-[#151D1A] z-50"
              >
                {studioControlsContent}
              </PopoverContent>
            </Popover>

            {/* Download / Export Icon with optional Options Popover */}
            {(onDownload || (downloadOptions && downloadOptions.length > 0)) && (
              downloadOptions && downloadOptions.length > 0 ? (
                <Popover>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          data-testid="toolbar-download-btn"
                          aria-label="Download / Export Reports"
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border border-black/[0.04] dark:border-white/[0.06] transition cursor-pointer shrink-0"
                        >
                          <Download size={15} />
                        </button>
                      </PopoverTrigger>
                    </Tooltip.Trigger>
                    <TooltipContent>Download / Batch Export</TooltipContent>
                  </Tooltip.Root>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-64 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 space-y-1"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Export Options
                    </div>
                    {downloadOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={opt.onClick}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-left cursor-pointer"
                      >
                        {opt.icon || <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      data-testid="toolbar-download-btn"
                      onClick={onDownload}
                      aria-label="Download / Export Reports"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border border-black/[0.04] dark:border-white/[0.06] transition cursor-pointer shrink-0"
                    >
                      <Download size={15} />
                    </button>
                  </Tooltip.Trigger>
                  <TooltipContent>Download PDF / CSV</TooltipContent>
                </Tooltip.Root>
              )
            )}

            {/* Primary Print CTA (opens Print Configuration Modal) */}
            {(onPrint || primaryPrintAction) && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    data-testid="toolbar-print-btn"
                    onClick={onPrint || primaryPrintAction?.onClick}
                    disabled={primaryPrintAction?.disabled}
                    className="h-8 px-3 rounded-full bg-gradient-to-r from-[#0D5C3A] to-[#117A4D] hover:from-[#09472C] hover:to-[#0D5C3A] text-white ring-1 ring-[#D97706]/50 shadow-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition shrink-0"
                  >
                    <Printer className="size-3.5 shrink-0" />
                    <span className="tabular-nums">
                      Print{reportCount > 0 ? ` (${reportCount})` : ''}
                    </span>
                  </button>
                </Tooltip.Trigger>
                <TooltipContent>Print Reports</TooltipContent>
              </Tooltip.Root>
            )}

            {/* Theme Mode Toggle (Sun/Moon) */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] transition cursor-pointer border-0 shrink-0"
                >
                  {themeMode === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
                </button>
              </Tooltip.Trigger>
              <TooltipContent>
                Switch to {themeMode === 'dark' ? 'light' : 'dark'} mode
              </TooltipContent>
            </Tooltip.Root>

            {/* More Actions Menu */}
            <MoreActionsMenu
              items={
                moreActionsItems || [
                  {
                    label: 'Report Studio 2.0',
                    icon: Sliders,
                    onClick: () => {
                      window.location.href = '/admin/reports/studio'
                    },
                  },
                  {
                    label: 'Download PDF / Export',
                    icon: Download,
                    onClick: onPrint || (() => {}),
                  },
                  {
                    label: 'Stamp & Signature Settings',
                    icon: Settings,
                    onClick: () => {
                      window.location.href = '/admin/signatures'
                    },
                  },
                  {
                    label: 'Refresh Reports',
                    icon: History,
                    onClick: () => {
                      window.location.reload()
                    },
                  },
                ]
              }
              align="end"
            />
          </div>
        </div>
      </Tooltip.Provider>
    )
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex items-center justify-between shrink-0 w-full bg-white dark:bg-[#111916] border-b border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 px-3 sm:px-5 min-h-[44px] h-11 z-20 print:hidden">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <AnimatePresence>
            {title ? (
              <div className="flex items-center gap-2 font-semibold truncate min-w-0">{title}</div>
            ) : reportCount > 0 ? (
              <motion.div
                className="flex items-center gap-2 rounded-full truncate min-h-[36px] px-3.5 py-1 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border border-emerald-200/80 dark:border-emerald-800/60"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isGenerating ? '#f97316' : '#059669',
                    boxShadow: `0 0 0 3px ${isGenerating ? 'rgba(249,115,22,0.2)' : 'rgba(5,150,105,0.2)'}`,
                  }}
                  className={isGenerating ? 'animate-pulse' : ''}
                />
                <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 truncate tabular-nums">
                  {isGenerating ? 'Generating…' : `${reportCount} loaded`}
                </span>
                {!isGenerating && reportCount > 0 && (
                  <span className="hidden lg:inline text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-black/40 px-2.5 py-0.5 rounded-full border border-emerald-300/40 tabular-nums">
                    Ready in 2s · saves ~{Math.max(0.5, Math.round((reportCount * 7) / 6) / 10)} hrs grading
                  </span>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center bg-[#F0F4F9] dark:bg-[#1E1F20] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] transition cursor-pointer border-0"
            title="Toggle theme"
          >
            {themeMode === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {primaryPrintAction && (
            <motion.button
              type="button"
              onClick={primaryPrintAction.onClick}
              disabled={primaryPrintAction.disabled}
              whileTap={{ scale: 0.97 }}
              className="h-8.5 px-3.5 sm:px-4 rounded-full btn-jiddah-cta text-xs font-bold inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Printer className="size-3.5 shrink-0" />
              <span className="truncate tabular-nums">{primaryPrintAction.label}</span>
            </motion.button>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  )
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        side="bottom"
        sideOffset={6}
        className="z-50 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none"
      >
        {children}
        <Tooltip.Arrow className="fill-stone-900 dark:fill-stone-100" />
      </Tooltip.Content>
    </Tooltip.Portal>
  )
}
