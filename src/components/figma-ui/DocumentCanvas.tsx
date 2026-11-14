import { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
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
      className="relative flex-1 flex flex-col min-w-0 bg-[#E6ECE8] dark:bg-[#0D1310] overflow-hidden print:static print:overflow-visible print:block"
    >
      {/* Top Mini Bar Inside Preview Stage */}
      <div
        data-testid="stage-top-mini-bar"
        className="shrink-0 bg-white/95 dark:bg-[#151D1A]/95 backdrop-blur-md border-b border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 px-3 py-1.5 flex items-center justify-between gap-2 z-10 print:hidden"
      >
        {/* Left: Visible Student & Steppers */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate(activeIndex - 1)}
              disabled={activeIndex <= 0}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-stone-700 dark:text-stone-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Previous student"
              aria-label="Previous student"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate(activeIndex + 1)}
              disabled={activeIndex >= reports.length - 1}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-stone-700 dark:text-stone-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Next student"
              aria-label="Next student"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="min-w-0 truncate">
            {reports.length > 0 && currentReport ? (
              <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] truncate tabular-nums">
                <span className="text-[#0D5C3A] dark:text-[#34D399] font-bold">
                  {activeIndex + 1} of {reports.length}
                </span>{' '}
                • {currentReport.student.name}
              </span>
            ) : (
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] italic">
                No active report
              </span>
            )}
          </div>
        </div>

        {/* Right: Layout Toggle + Unified Zoom Control */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onLayoutToggle && (
            <button
              type="button"
              onClick={onLayoutToggle}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] text-stone-700 dark:text-stone-200 hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[11px] font-semibold transition cursor-pointer"
              title={isSingle ? 'Switch to continuous scroll' : 'Switch to single view'}
            >
              {isSingle ? <LayoutGrid size={13} /> : <List size={13} />}
              <span className="hidden md:inline">{isSingle ? 'Single View' : 'Continuous'}</span>
            </button>
          )}

          {/* ONE Unified Zoom Control */}
          <div
            data-testid="unified-zoom-control"
            className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] rounded-full p-0.5 border border-black/[0.04] dark:border-white/[0.06] shrink-0"
          >
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoom <= 0.4}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[11px] font-mono font-bold text-stone-800 dark:text-stone-100 px-1.5 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoom >= 2}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              onClick={onFitScreen}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold text-[#0D5C3A] dark:text-[#34D399] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
              title="Fit to width"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable A4 Viewport */}
      <div
        ref={scrollRef}
        data-canvas-scroll
        className="flex-1 overflow-auto p-4 sm:p-6 pb-20 flex flex-col items-center"
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
          // Continuous View: Renders all loaded reports
          <div className="flex flex-col items-center gap-8 py-2 w-full">
            <AnimatePresence>
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  data-report-id={report.id}
                  onClick={() => onSelectReport(report.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', stiffness: 280, damping: 28 }}
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
