import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, Share2, Search, X, LayoutGrid, List, PanelTop, Sliders, FileSpreadsheet, Settings, History } from 'lucide-react';
import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreActionsMenu } from '@/components/ui/more-actions-menu';

interface TopToolbarProps {
  searchOpen?: boolean;
  onSearchToggle?: () => void;
  onDownload?: () => void;
  downloadOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
  onPrint?: () => void;
  printOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
  onBatchPrint?: () => void;
  onShare?: () => void;
  reportCount?: number;
  layout?: 'single' | 'grid';
  onLayoutToggle?: () => void;
  isGenerating?: boolean;
  title?: React.ReactNode;
  classCohortSelect?: React.ReactNode;
  studentSelectorPill?: React.ReactNode;
  activeTermPill?: React.ReactNode;
  phaseTrack?: React.ReactNode;
  curriculumTrack?: React.ReactNode;
  layoutTrack?: React.ReactNode;
  primaryPrintAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  moreActionsItems?: {
    label: string;
    icon: any;
    onClick: () => void;
  }[];
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
}: TopToolbarProps) {
  if (classCohortSelect) {
    return (
      <Tooltip.Provider delayDuration={150}>
        <div
          data-testid="reports-zone-1-bar"
          className="w-full bg-white dark:bg-[#151D1A] rounded-2xl px-3 py-2 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex items-center justify-between gap-2 shadow-2xs z-20 print:hidden"
        >
          {/* Left Controls: Class Cohort CustomPillSelect + Interactive Student/Batch Pill + Active Term Pill */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            {classCohortSelect}
            {studentSelectorPill}
            {activeTermPill}
          </div>

          {/* Center Controls: Phase Track + Curriculum Track + Layout Toggle Track */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {phaseTrack}
            {curriculumTrack}
            {layoutTrack}
          </div>

          {/* Right Actions: Primary Print CTA + MoreActionsMenu */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {layout && onLayoutToggle && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button
                    onClick={onLayoutToggle}
                    aria-label={layout === 'grid' ? 'Single scroll view' : 'Grid view'}
                    className="hidden sm:inline-flex items-center justify-center rounded-full w-8.5 h-8.5 bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] hover:text-[#0D5C3A] dark:hover:text-emerald-300 cursor-pointer border-0"
                    whileTap={{ scale: 0.92 }}
                  >
                    {layout === 'grid' ? <List size={15} /> : <LayoutGrid size={15} />}
                  </motion.button>
                </Tooltip.Trigger>
                <TooltipContent>{layout === 'grid' ? 'Single scroll view' : 'Grid view'}</TooltipContent>
              </Tooltip.Root>
            )}

            {primaryPrintAction && (
              <motion.button
                type="button"
                onClick={primaryPrintAction.onClick}
                disabled={primaryPrintAction.disabled}
                whileTap={{ scale: 0.97 }}
                className="h-9 px-4 rounded-full btn-jiddah-cta text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <Printer className="size-3.5 shrink-0" />
                <span className="truncate tabular-nums">{primaryPrintAction.label}</span>
              </motion.button>
            )}

            <MoreActionsMenu
              items={
                moreActionsItems || [
                  {
                    label: 'Report Studio 2.0',
                    icon: Sliders,
                    onClick: () => {
                      window.location.href = '/admin/reports/studio';
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
                      window.location.href = '/admin/signatures';
                    },
                  },
                  {
                    label: 'Refresh Reports',
                    icon: History,
                    onClick: () => {
                      window.location.reload();
                    },
                  },
                ]
              }
              align="end"
            />
          </div>
        </div>
      </Tooltip.Provider>
    );
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex items-center justify-between shrink-0 w-full bg-white dark:bg-[#111916] border-b border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 px-3 sm:px-5 min-h-[44px] h-11 z-20 print:hidden">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {/* Contextual Title or Loaded Reports Badge (No duplicate hamburger icon!) */}
          <AnimatePresence>
            {title ? (
              <div className="flex items-center gap-2 font-semibold truncate min-w-0">
                {title}
              </div>
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
          {reportCount > 1 && onLayoutToggle && (
            <div className="hidden md:block flex-shrink-0">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button
                    onClick={onLayoutToggle}
                    aria-label={layout === 'grid' ? 'Single scroll view' : 'Grid view'}
                    className="flex items-center justify-center rounded-full min-w-[34px] min-h-[34px] bg-[#F0F4F9] dark:bg-[#1E1F20] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] hover:text-[#0D5C3A] dark:hover:text-emerald-300 cursor-pointer border-0"
                    whileTap={{ scale: 0.92 }}
                  >
                    {layout === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                  </motion.button>
                </Tooltip.Trigger>
                <TooltipContent>{layout === 'grid' ? 'Single scroll view' : 'Grid view'}</TooltipContent>
              </Tooltip.Root>
            </div>
          )}

          {/* Download / Export */}
          {downloadOptions && downloadOptions.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <div className="flex-shrink-0">
                  <IconBtn
                    icon={<Download size={16} />}
                    tooltip="Export / Download"
                    disabled={reportCount === 0 && !title}
                  />
                </div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="print:hidden bg-white dark:bg-[#111916] rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 dark:border-[#24332E] z-[300]"
                >
                  {downloadOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[40px] text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 dark:focus:bg-emerald-950/40 focus:text-[#059669] dark:focus:text-emerald-300 transition-colors"
                    >
                      {opt.icon}
                      {opt.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : onDownload ? (
            <IconBtn
              icon={<Download size={16} />}
              tooltip="Download reports"
              onClick={onDownload}
              disabled={reportCount === 0 && !title}
            />
          ) : null}

          {/* Print */}
          {printOptions && printOptions.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <div className="flex-shrink-0">
                  <IconBtn
                    icon={<Printer size={16} />}
                    tooltip="Print Options"
                    disabled={reportCount === 0 && !title}
                  />
                </div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="print:hidden bg-white dark:bg-[#111916] rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 dark:border-[#24332E] z-[300]"
                >
                  {printOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[40px] text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 dark:focus:bg-emerald-950/40 focus:text-[#059669] dark:focus:text-emerald-300 transition-colors"
                    >
                      {opt.icon}
                      {opt.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}

          {/* 1-Click Print Pill (Count-Aware + Tactile Gradient + Micro-scale) */}
          {onPrint && (
            <motion.button
              type="button"
              onClick={onPrint}
              disabled={reportCount === 0 && !title}
              whileTap={{ scale: 0.97 }}
              className="h-9 px-4 rounded-full bg-gradient-to-r from-[#0D5C3A] via-[#0F6B43] to-[#147A4D] hover:from-[#0A4B2F] hover:via-[#0D5C3A] hover:to-[#B45309] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-[0_4px_14px_-3px_rgba(13,92,58,0.4)] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Printer className="size-4 shrink-0" />
              <span className="truncate tabular-nums">
                {reportCount > 0 ? `Print ${reportCount} Ready Reports` : 'Print Reports'}
              </span>
            </motion.button>
          )}

          {/* Secondary Tools in More Actions Menu */}
          <MoreActionsMenu
            items={[
              {
                label: 'Report Studio 2.0',
                icon: Sliders,
                onClick: () => {
                  window.location.href = '/admin/reports/studio';
                },
              },
              {
                label: 'Export Broadsheet',
                icon: FileSpreadsheet,
                onClick: () => {
                  window.location.href = '/admin/secular-hub';
                },
              },
              {
                label: 'Batch Settings',
                icon: Settings,
                onClick: () => {
                  window.location.href = '/admin/settings';
                },
              },
              {
                label: 'Audit & Activity',
                icon: History,
                onClick: () => {
                  window.location.href = '/admin/activity';
                },
              },
              ...(onBatchPrint
                ? [
                    {
                      label: 'Batch Print All Classes',
                      icon: Printer,
                      onClick: onBatchPrint,
                    },
                  ]
                : []),
              ...(onShare
                ? [
                    {
                      label: 'Share Link',
                      icon: Share2,
                      onClick: onShare,
                    },
                  ]
                : []),
            ]}
            align="end"
          />

          {/* Filter toggle */}
          <div className="flex-shrink-0">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  onClick={onSearchToggle}
                  className={`flex items-center gap-1.5 rounded-full font-semibold h-8 px-3 text-xs border-0 cursor-pointer transition-colors ${
                    searchOpen
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-[#F0F4F9] dark:bg-[#1E1F20] text-stone-800 dark:text-stone-100 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] hover:text-[#0D5C3A] dark:hover:text-emerald-300'
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  <motion.span
                    animate={{ rotate: searchOpen ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {searchOpen ? <X size={14} /> : <Search size={14} />}
                  </motion.span>
                  <span>{searchOpen ? 'Hide Filters' : 'Filters'}</span>
                </motion.button>
              </Tooltip.Trigger>
              <TooltipContent>{searchOpen ? 'Hide filter panel' : 'Show filter panel'}</TooltipContent>
            </Tooltip.Root>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function IconBtn({
  icon,
  tooltip,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.button
          onClick={onClick}
          disabled={disabled}
          title={tooltip}
          aria-label={tooltip}
          className="flex items-center justify-center rounded-full flex-shrink-0 min-w-[34px] min-h-[34px] bg-[#F0F4F9] dark:bg-[#1E1F20] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] hover:text-[#0D5C3A] dark:hover:text-emerald-300 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer border-0"
          whileTap={disabled ? {} : { scale: 0.92 }}
        >
          {icon}
        </motion.button>
      </Tooltip.Trigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip.Root>
  );
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        sideOffset={6}
        className="bg-neutral-900 text-white dark:bg-[#1E1F20] dark:text-[#E3E3E3] rounded-full px-3 py-1.5 text-xs font-medium shadow-md border border-white/10 dark:border-white/10 z-[300] pointer-events-none select-none transition-opacity duration-100 ease-out data-[state=closed]:opacity-0 data-[state=delayed-open]:opacity-100"
      >
        {children}
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}
