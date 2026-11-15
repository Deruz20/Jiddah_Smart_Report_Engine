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
} from 'lucide-react'
import Link from 'next/link'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { useSidebar } from '@/components/figma-ui/ui/sidebar'
import { getStoredThemeMode, setStoredThemeMode, type ThemeMode } from '@/lib/client-cache'

export interface StudioFormattingState {
  fontFamily: string
  fontSize: number
  isBold: boolean
  colorTheme: string
  stampEnabled: boolean
  stampInkColor: string
  stampDate?: string
  signaturesEnabled: boolean
  watermarkOpacity: number
}

export const DEFAULT_STUDIO_FORMATTING: StudioFormattingState = {
  fontFamily: 'Default Academic',
  fontSize: 100,
  isBold: false,
  colorTheme: 'jiddah-classic',
  stampEnabled: true,
  stampInkColor: '#1D4ED8',
  stampDate: '',
  signaturesEnabled: true,
  watermarkOpacity: 4,
}

const COLOR_THEMES = [
  { id: 'jiddah-classic', label: 'Jiddah Classic', primary: '#14532D', secondary: '#C59B27' },
  { id: 'royal-emerald', label: 'Royal Emerald', primary: '#0D5C3A', secondary: '#10B981' },
  { id: 'imperial-navy', label: 'Imperial Navy & Gold', primary: '#1E3A8A', secondary: '#D97706' },
  { id: 'burgundy-heritage', label: 'Burgundy Heritage', primary: '#7F1D1D', secondary: '#B45309' },
  { id: 'monochrome', label: 'Monochrome Ink-Saver', primary: '#18181B', secondary: '#71717A' },
]

const FONT_FAMILIES = [
  'Default Academic',
  'Inter Sans',
  'Times Serif',
  'Cinzel Prestige',
  'Amiri Arabic',
]

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
          <select
            value={studioFormatting.fontFamily}
            onChange={(e) => updateFormatting({ fontFamily: e.target.value })}
            className="flex-1 h-7 px-2 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

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
            Official Circular Stamp
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

        {/* Stamp Ink Colors */}
        {studioFormatting.stampEnabled && (
          <div className="flex items-center gap-1.5 pl-2">
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
      </div>
    </div>
  )

  if (classCohortSelect) {
    return (
      <Tooltip.Provider delayDuration={150}>
        <div
          data-testid="reports-zone-1-bar"
          className="w-full bg-white dark:bg-[#151D1A] rounded-2xl px-3 py-2 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shadow-2xs z-20 print:hidden"
        >
          {/* Top/Left Row: Nav triggers, Class Cohort, Student Roster, Term */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
            {/* Mobile Menu Trigger */}
            {sidebar && (
              <button
                type="button"
                onClick={sidebar.toggleSidebar}
                className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <Menu size={16} />
              </button>
            )}

            {/* Back to Dashboard Button */}
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>

            {/* Class Cohort Select */}
            {classCohortSelect}

            {/* Student Selector Pill */}
            {studentSelectorPill}

            {/* Active Term Pill */}
            <div className="hidden sm:block">{activeTermPill}</div>
          </div>

          {/* Center Controls (Desktop): Phase Track + Curriculum Track + Layout Toggle Track */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {phaseTrack}
            {curriculumTrack}
            {layoutTrack}
          </div>

          {/* Mobile Secondary Row: Active Term + Phase Track + Curriculum Track */}
          <div className="flex lg:hidden items-center justify-between gap-1.5 overflow-x-auto py-0.5 shrink-0 scrollbar-none">
            <div className="sm:hidden">{activeTermPill}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              {phaseTrack}
              {curriculumTrack}
              {layoutTrack}
            </div>
          </div>

          {/* Right Actions: Studio Formatting Popover + Theme Mode + Primary Print CTA + More Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto justify-end">
            {/* 🎨 Studio Formatting Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="studio-popover-trigger"
                  className="h-8.5 px-2.5 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border border-black/[0.04] dark:border-white/[0.06] text-xs font-semibold text-stone-800 dark:text-stone-200 inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  title="Document Studio Formatting & Themes"
                >
                  <Palette className="size-3.5 text-[#0D5C3A] dark:text-[#34D399] shrink-0" />
                  <span className="hidden sm:inline font-bold">Studio</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[320px] sm:w-[360px] p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl bg-white dark:bg-[#151D1A] z-50 overflow-hidden"
              >
                {studioControlsContent}
              </PopoverContent>
            </Popover>

            {/* Theme Mode Toggle (Sun/Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
              className="w-8.5 h-8.5 rounded-full flex items-center justify-center bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] transition cursor-pointer border-0 shrink-0"
              title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {themeMode === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>

            {/* Grid vs Single Layout View (Desktop) */}
            {layout && onLayoutToggle && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button
                    onClick={onLayoutToggle}
                    aria-label={layout === 'grid' ? 'Single scroll view' : 'Grid view'}
                    className="hidden sm:inline-flex items-center justify-center rounded-full w-8.5 h-8.5 bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] hover:text-[#0D5C3A] dark:hover:text-emerald-300 cursor-pointer border-0 shrink-0"
                    whileTap={{ scale: 0.92 }}
                  >
                    {layout === 'grid' ? <List size={15} /> : <LayoutGrid size={15} />}
                  </motion.button>
                </Tooltip.Trigger>
                <TooltipContent>{layout === 'grid' ? 'Single scroll view' : 'Grid view'}</TooltipContent>
              </Tooltip.Root>
            )}

            {/* Primary Print CTA Button */}
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
