import { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';
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
  onLayoutToggle,
  renderReport,
  printScope = 'all',
  cardsPerRow = 1,
}: DocumentCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = useMemo(() => {
    const idx = reports.findIndex((r) => r.id === activeReportId);
    return idx >= 0 ? idx : 0;
  }, [reports, activeReportId]);

  const currentReport = reports[activeIndex] || reports[0];

  function handleNavigate(index: number) {
    if (index < 0 || index >= reports.length) return;
    const newReport = reports[index];
    onSelectReport(newReport.id);
    const el = scrollRef.current?.querySelector(`[data-report-id="${newReport.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const isSingle = layout === 'single';

  return (
    <div
      data-testid="report-preview-stage"
      className="relative flex-1 w-full h-full flex flex-col min-w-0 bg-[#E6ECE8] dark:bg-[#0D1310] overflow-hidden print:static print:overflow-visible print:block"
    >
      {/* Floating WhatsApp-Style Vertical Control Dock */}
      <div
        data-testid="floating-control-dock"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-white/95 dark:bg-[#151D1A]/95 backdrop-blur-md rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-xl p-1.5 gap-1.5 print:hidden select-none"
      >
        {/* Page Counter */}
        <div className="px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] text-[10.5px] font-mono font-bold text-[#111827] dark:text-[#F3F7F5] tabular-nums text-center">
          {reports.length > 0 ? `${activeIndex + 1}/${reports.length}` : '0/0'}
        </div>

        {/* Up Stepper */}
        <button
          type="button"
          onClick={() => handleNavigate(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="Previous report card (Up)"
          aria-label="Previous report card"
        >
          <ChevronUp size={16} />
        </button>

        {/* Down Stepper */}
        <button
          type="button"
          onClick={() => handleNavigate(activeIndex + 1)}
          disabled={activeIndex >= reports.length - 1}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="Next report card (Down)"
          aria-label="Next report card"
        >
          <ChevronDown size={16} />
        </button>

        {/* Fine Hairline Divider */}
        <div className="w-5 h-px bg-black/[0.08] dark:bg-white/[0.08] my-0.5" />

        {/* Unified Zoom Control */}
        <div data-testid="unified-zoom-control" className="flex flex-col items-center gap-1">
          {/* Zoom In */}
          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoom >= 2}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={15} />
          </button>

          {/* Current Zoom % Button (Click to reset/fit) */}
          <button
            type="button"
            onClick={onFitScreen}
            className="text-[10px] font-mono font-bold text-stone-700 dark:text-stone-200 px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer tabular-nums"
            title="Reset zoom to fit"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoom <= 0.4}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={15} />
          </button>

          {/* Fit to screen */}
          <button
            type="button"
            onClick={onFitScreen}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[#0D5C3A] dark:text-[#34D399] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
            title="Fit to screen"
            aria-label="Fit to screen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable A4 Viewport */}
      <div
        ref={scrollRef}
        data-canvas-scroll
        className="flex-1 w-full h-full overflow-auto p-4 sm:p-6 pb-20 flex flex-col items-center"
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
        ) : isSingle ? (
          // Single View: Renders only the active report card
          <div className="my-auto py-2 flex flex-col items-center">
            {currentReport && (
              <div data-report-id={currentReport.id}>
                {renderReport(currentReport, true)}
              </div>
            )}
          </div>
        ) : (
          // Continuous View: Renders all loaded reports (supports MS Word 1, 2, or 3 cards per row)
          <div
            className={
              cardsPerRow === 3
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 py-2 w-full max-w-[2600px] justify-items-center'
                : cardsPerRow === 2
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 py-2 w-full max-w-[1750px] justify-items-center'
                : 'flex flex-col items-center gap-8 py-2 w-full max-w-[900px]'
            }
          >
            <AnimatePresence>
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  data-report-id={report.id}
                  onClick={() => onSelectReport(report.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', stiffness: 280, damping: 28 }}
                  className="flex justify-center"
                >
                  {renderReport(report, report.id === activeReportId)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
