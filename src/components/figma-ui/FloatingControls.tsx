import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomOut, ZoomIn, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface FloatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  totalReports?: number;
  activeIndex?: number;
  onNavigate?: (index: number) => void;
}

export function FloatingControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  totalReports = 0,
  activeIndex = 0,
  onNavigate,
}: FloatingControlsProps) {
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < totalReports - 1;

  if (isMinimized) {
    return (
      <motion.button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full shadow-2xl bg-stone-900/95 text-white border border-white/20 text-xs font-bold backdrop-blur-md cursor-pointer hover:bg-stone-800 active:scale-95 transition"
        title="Open zoom and page controls"
        aria-label="Open zoom and page controls"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Maximize2 size={13} className="text-amber-400 shrink-0" />
        <span>{Math.round(zoom * 100)}%</span>
        {totalReports > 1 && (
          <span className="text-[10px] text-amber-300 font-mono">
            {activeIndex + 1}/{totalReports}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-2xl shadow-2xl print:hidden tabular-nums max-w-[94vw] overflow-x-auto z-50"
      style={{
        background: 'rgba(28,25,23,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.14)',
        padding: '4px 8px',
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 28 }}
    >
      <AnimatePresence>
        {totalReports > 1 && (
          <motion.div
            className="flex items-center gap-1"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
          >
            <PillBtn onClick={() => onNavigate?.(activeIndex - 1)} disabled={!canPrev} title="Previous">
              <ChevronLeft size={16} />
            </PillBtn>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', padding: '0 8px', whiteSpace: 'nowrap' }}>
              {activeIndex + 1} / {totalReports}
            </span>
            <PillBtn onClick={() => onNavigate?.(activeIndex + 1)} disabled={!canNext} title="Next">
              <ChevronRight size={16} />
            </PillBtn>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
          </motion.div>
        )}
      </AnimatePresence>

      <PillBtn onClick={onZoomOut} disabled={zoom <= 0.5} title="Zoom out">
        <ZoomOut size={16} />
      </PillBtn>

      <motion.button
        onClick={onFitScreen}
        title="Reset to 100%"
        aria-label="Reset zoom to 100%"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '4px 10px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          color: 'white',
          cursor: 'pointer',
          minWidth: 50,
          minHeight: 38,
        }}
        whileHover={{ background: 'rgba(255,255,255,0.14)' }}
        whileTap={{ scale: 0.94 }}
      >
        {Math.round(zoom * 100)}%
      </motion.button>

      <PillBtn onClick={onZoomIn} disabled={zoom >= 2} title="Zoom in">
        <ZoomIn size={16} />
      </PillBtn>

      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

      <PillBtn onClick={onFitScreen} title="Fit to screen">
        <Maximize2 size={15} />
      </PillBtn>

      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

      <PillBtn onClick={() => setIsMinimized(true)} title="Minimize controls">
        <Minimize2 size={14} />
      </PillBtn>
    </motion.div>
  );
}

function PillBtn({
  onClick,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        minWidth: 38,
        minHeight: 38,
        background: 'transparent',
        border: 'none',
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      whileHover={disabled ? {} : { background: 'rgba(255,255,255,0.1)' }}
      whileTap={disabled ? {} : { scale: 0.9 }}
    >
      {children}
    </motion.button>
  );
}
