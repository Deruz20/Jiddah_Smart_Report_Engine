import { useRef, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Search,
  Check,
  Printer,
  X,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReportData, FilterState } from './types';
import { EmptyState } from './EmptyState';

interface DocumentCanvasProps {
  reports: ReportData[];
  zoom: number;
  layout: FilterState['layout'];
  activeReportId: string | null;
  onSelectReport: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onSearchOpen?: () => void;
  onLayoutToggle?: () => void;
  renderReport: (report: any, isActive: boolean) => React.ReactNode;
  printScope?: 'current' | 'all' | string[];
  cardsPerRow?: 1 | 2 | 3;
  // Visual Card Selection Mode
  visualSelectMode?: boolean;
  selectedIds?: string[];
  onToggleSelectCard?: (id: string) => void;
  onSelectAllCards?: () => void;
  onClearCards?: () => void;
  onInvertCards?: () => void;
  onPrintSelectedCards?: () => void;
  onExitVisualSelect?: () => void;
}

export function DocumentCanvas({
  reports,
  zoom,
  layout,
  activeReportId,
  onSelectReport,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onSearchOpen,
  renderReport,
  visualSelectMode = false,
  selectedIds = [],
  onToggleSelectCard,
  onSelectAllCards,
  onClearCards,
  onInvertCards,
  onPrintSelectedCards,
  onExitVisualSelect,
}: DocumentCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dockMinimized, setDockMinimized] = useState(false);

  // Minimize dock by default on mobile (< 768px) so report cards remain unobstructed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setDockMinimized(true);
    }
  }, []);

  const activeIndex = useMemo(() => {
    const idx = reports.findIndex((r) => r.id === activeReportId);
    return idx >= 0 ? idx : 0;
  }, [reports, activeReportId]);

  function handleNavigate(index: number) {
    if (index < 0 || index >= reports.length) return;
    const newReport = reports[index];
    onSelectReport(newReport.id);
    const el = scrollRef.current?.querySelector(`[data-report-id="${newReport.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const isGrid = layout === 'grid';

  return (
    <Tooltip.Provider delayDuration={120}>
      <div
        data-testid="report-preview-stage"
        className="relative flex-1 w-full h-full flex flex-col min-w-0 bg-[#E6ECE8] dark:bg-[#0D1310] overflow-hidden print:!static print:!overflow-visible print:!block print:!hidden"
      >
        {/* Visual Card Selection Mode Floating Bar */}
        {visualSelectMode && reports.length > 0 && (
          <div
            data-testid="visual-selection-bar"
            className="shrink-0 z-20 mx-3 mt-2.5 px-3 py-2 rounded-xl bg-white dark:bg-[#151D1A] border border-[#0D5C3A]/25 dark:border-[#F59E0B]/30 shadow-md flex flex-wrap items-center justify-between gap-2 print:hidden"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-stone-100">
              <span className="px-2 py-0.5 rounded-full bg-[#0D5C3A]/10 text-[#0D5C3A] dark:bg-emerald-500/20 dark:text-emerald-300 tabular-nums">
                {selectedIds.length} / {reports.length} Selected
              </span>
              <span className="hidden sm:inline text-stone-500 dark:text-stone-400 font-medium">
                Click any report card below to select or deselect
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={onSelectAllCards}
                className="h-7 px-2.5 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearCards}
                className="h-7 px-2.5 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onInvertCards}
                className="h-7 px-2.5 rounded-lg bg-[#F0F4F9] dark:bg-[#1E2623] text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Invert
              </button>
              <button
                type="button"
                onClick={onPrintSelectedCards}
                disabled={selectedIds.length === 0}
                className="h-7 px-3 rounded-full bg-[#0D5C3A] text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-[#0A472C] disabled:opacity-40 transition cursor-pointer"
              >
                <Printer size={12} />
                <span>Print {selectedIds.length} Selected Cards</span>
              </button>
              {onExitVisualSelect && (
                <button
                  type="button"
                  onClick={onExitVisualSelect}
                  className="h-7 px-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
                  title="Exit Selection Mode"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Translucent, Minimizable Bottom-Right Floating Magnifier & Page Bar */}
        <div
          data-testid="floating-control-dock"
          className="absolute bottom-3 right-3 z-30 print:hidden select-none"
        >
          {dockMinimized ? (
            <button
              type="button"
              data-testid="floating-dock-minimized"
              onClick={() => setDockMinimized(false)}
              className="h-8 px-2.5 rounded-full bg-white/75 dark:bg-[#151D1A]/75 hover:bg-white/95 dark:hover:bg-[#151D1A]/95 transition-opacity border border-black/10 dark:border-white/15 shadow-md flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#111827] dark:text-[#F3F7F5] cursor-pointer"
              title="Expand zoom & page controls"
            >
              <Search size={12} className="text-[#0D5C3A] dark:text-[#34D399]" />
              <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
              <span className="opacity-40">•</span>
              <span className="tabular-nums">
                {reports.length > 0 ? `${activeIndex + 1}/${reports.length}` : '0/0'}
              </span>
            </button>
          ) : (
            <div className="rounded-full px-2.5 py-1 bg-white/75 dark:bg-[#151D1A]/75 hover:bg-white/95 dark:hover:bg-[#151D1A]/95 transition-opacity border border-black/10 dark:border-white/15 shadow-md flex items-center gap-1">
              {/* Previous */}
              <DockTooltipButton
                label="Previous report"
                onClick={() => handleNavigate(activeIndex - 1)}
                disabled={activeIndex <= 0}
              >
                <ChevronLeft size={14} />
              </DockTooltipButton>

              {/* Page Counter */}
              <span className="px-1.5 text-[11px] font-mono font-bold text-[#111827] dark:text-[#F3F7F5] tabular-nums">
                {reports.length > 0 ? `${activeIndex + 1} / ${reports.length}` : '0 / 0'}
              </span>

              {/* Next */}
              <DockTooltipButton
                label="Next report"
                onClick={() => handleNavigate(activeIndex + 1)}
                disabled={activeIndex >= reports.length - 1}
              >
                <ChevronRight size={14} />
              </DockTooltipButton>

              <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

              {/* Unified Zoom Cluster */}
              <div data-testid="unified-zoom-control" className="flex items-center gap-0.5">
                <DockTooltipButton
                  label="Zoom out"
                  onClick={onZoomOut}
                  disabled={zoom <= 0.4}
                >
                  <ZoomOut size={13} />
                </DockTooltipButton>

                <DockTooltipButton label="Reset zoom" onClick={onFitScreen}>
                  <span className="text-[10.5px] font-mono font-bold px-1 tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                </DockTooltipButton>

                <DockTooltipButton
                  label="Zoom in"
                  onClick={onZoomIn}
                  disabled={zoom >= 2}
                >
                  <ZoomIn size={13} />
                </DockTooltipButton>

                <DockTooltipButton label="Fit to screen" onClick={onFitScreen}>
                  <Maximize2 size={12} className="text-[#0D5C3A] dark:text-[#34D399]" />
                </DockTooltipButton>
              </div>

              <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

              {/* Minimize */}
              <DockTooltipButton label="Minimize bar" onClick={() => setDockMinimized(true)}>
                <Minus size={13} />
              </DockTooltipButton>
            </div>
          )}
        </div>

        {/* Scrollable A4 Viewport — justify-start prevents top card clipping */}
        <div
          ref={scrollRef}
          data-canvas-scroll
          className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden py-6 px-4 pb-20 flex flex-col items-center justify-start"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(13,92,58,0.06) 1px, transparent 1px),
              radial-gradient(circle, rgba(245,158,11,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 48px 48px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.15) transparent',
          }}
        >
          {reports.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-96">
              <EmptyState onSearchOpen={onSearchOpen || (() => {})} />
            </div>
          ) : (
            <div
              className={
                isGrid
                  ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 py-2 w-full max-w-[1750px] justify-items-center'
                  : 'flex flex-col items-center justify-start gap-8 py-2 w-full max-w-[1200px]'
              }
            >
              <AnimatePresence>
                {reports.map((report, index) => {
                  const isSelected = selectedIds.includes(report.id);
                  const isActive = report.id === activeReportId;
                  return (
                    <motion.div
                      key={report.id}
                      data-report-id={report.id}
                      onClick={() => {
                        onSelectReport(report.id);
                        if (visualSelectMode && onToggleSelectCard) {
                          onToggleSelectCard(report.id);
                        }
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3), type: 'spring', stiffness: 280, damping: 28 }}
                      className={`relative flex justify-center rounded-xl transition ${
                        visualSelectMode
                          ? isSelected
                            ? 'ring-3 ring-[#EA580C] dark:ring-[#F59E0B] ring-offset-2 ring-offset-[#E6ECE8] dark:ring-offset-[#0D1310] cursor-pointer'
                            : 'opacity-80 hover:opacity-100 ring-1 ring-black/10 dark:ring-white/15 cursor-pointer'
                          : ''
                      }`}
                    >
                      {visualSelectMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectCard?.(report.id);
                          }}
                          aria-pressed={isSelected}
                          className={`absolute top-2 right-2 z-20 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md inline-flex items-center gap-1 transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#EA580C] text-white'
                              : 'bg-white/95 text-stone-700 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>{isSelected ? 'Selected' : 'Select'}</span>
                        </button>
                      )}
                      {renderReport(report, isActive)}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function DockTooltipButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="h-7 min-w-7 px-1 rounded-full flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 px-2 py-1 text-[11px] font-medium rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md pointer-events-none"
        >
          {label}
          <Tooltip.Arrow className="fill-stone-900 dark:fill-stone-100" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
