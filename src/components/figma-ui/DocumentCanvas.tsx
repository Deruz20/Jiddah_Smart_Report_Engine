import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ReportData, FilterState } from './types';
import { FloatingControls } from './FloatingControls';
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
  onSearchOpen: () => void;
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
  renderReport,
  printScope = 'all',
}: DocumentCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = reports.findIndex(r => r.id === activeReportId);

  function handleNavigate(index: number) {
    if (index < 0 || index >= reports.length) return;
    const newReport = reports[index];
    onSelectReport(newReport.id);
    const el = scrollRef.current?.querySelector(`[data-report-id="${newReport.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="relative flex-1 overflow-hidden print:static print:overflow-visible print:block">
      {/* Workspace */}
      <div
        ref={scrollRef}
        data-canvas-scroll
        className="absolute inset-0 overflow-auto"
        style={{
          background: `
            radial-gradient(circle, rgba(15,77,37,0.04) 1px, transparent 1px),
            radial-gradient(circle, rgba(15,77,37,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px, 56px 56px',
          backgroundColor: '#FDFBF7',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.12) transparent',
        }}
      >
        {reports.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-96">
            <EmptyState onSearchOpen={onSearchOpen} />
          </div>
        ) : layout === 'grid' ? (
          <div
            className="p-4 md:p-12"
            style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              gap: 32,
              justifyContent: 'center',
            }}
          >
            <AnimatePresence>
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  data-report-id={report.id}
                  onClick={() => onSelectReport(report.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.055, type: 'spring', stiffness: 260, damping: 26 }}
                >
                  {renderReport(report, report.id === activeReportId)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div
            className="p-4 md:p-12 pb-[100px] md:pb-[100px]"
            style={{
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              gap: 40,
            }}
          >
            <AnimatePresence>
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  data-report-id={report.id}
                  onClick={() => onSelectReport(report.id)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, type: 'spring', stiffness: 250, damping: 26 }}
                >
                  {renderReport(report, report.id === activeReportId)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating controls — always visible */}
      <FloatingControls
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitScreen={onFitScreen}
        totalReports={reports.length}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
