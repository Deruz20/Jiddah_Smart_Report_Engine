'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SchoolStamp } from './SchoolStamp';
import {
  OverlayElementState,
  TemplateOverlays,
  clampCoordinates,
  applySnapGuides,
  SNAP_GUIDES,
} from '@/lib/report-overlays';

interface DraggableOverlayLayerProps {
  overlays: TemplateOverlays;
  onChange: (updated: TemplateOverlays) => void;
  selectedElementId: 'stamp' | 'head-teacher' | 'class-teacher' | null;
  onSelectElement: (id: 'stamp' | 'head-teacher' | 'class-teacher' | null) => void;
  snapEnabled: boolean;
  isInteractive?: boolean;
}

export const DraggableOverlayLayer: React.FC<DraggableOverlayLayerProps> = ({
  overlays,
  onChange,
  selectedElementId,
  onSelectElement,
  snapEnabled,
  isInteractive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGuideX, setActiveGuideX] = useState<number | null>(null);
  const [activeGuideY, setActiveGuideY] = useState<number | null>(null);

  // Dragging state
  const dragRef = useRef<{
    isDragging: boolean;
    elementKey: 'stamp' | 'headTeacher' | 'classTeacher';
    startX: number;
    startY: number;
    startElemXPercent: number;
    startElemYPercent: number;
  } | null>(null);

  const getElementKeyById = (id: string): 'stamp' | 'headTeacher' | 'classTeacher' => {
    if (id === 'stamp') return 'stamp';
    if (id === 'head-teacher') return 'headTeacher';
    return 'classTeacher';
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    id: 'stamp' | 'head-teacher' | 'class-teacher'
  ) => {
    if (!isInteractive) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectElement(id);

    const key = getElementKeyById(id);
    const elemState = overlays[key];

    dragRef.current = {
      isDragging: true,
      elementKey: key,
      startX: e.clientX,
      startY: e.clientY,
      startElemXPercent: elemState.xPercent,
      startElemYPercent: elemState.yPercent,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    let targetX = dragRef.current.startElemXPercent + deltaXPercent;
    let targetY = dragRef.current.startElemYPercent + deltaYPercent;

    if (snapEnabled) {
      const snapX = applySnapGuides(targetX, SNAP_GUIDES.x);
      const snapY = applySnapGuides(targetY, SNAP_GUIDES.y);
      targetX = snapX.snappedVal;
      targetY = snapY.snappedVal;
      setActiveGuideX(snapX.guideHit);
      setActiveGuideY(snapY.guideHit);
    } else {
      setActiveGuideX(null);
      setActiveGuideY(null);
    }

    const clamped = clampCoordinates(targetX, targetY);
    const key = dragRef.current.elementKey;

    onChange({
      ...overlays,
      [key]: {
        ...overlays[key],
        xPercent: Math.round(clamped.x * 10) / 10,
        yPercent: Math.round(clamped.y * 10) / 10,
      },
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current && dragRef.current.isDragging) {
      dragRef.current = null;
      setActiveGuideX(null);
      setActiveGuideY(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Keyboard arrow nudging on selected element
  useEffect(() => {
    if (!isInteractive || !selectedElementId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = getElementKeyById(selectedElementId);
      const elem = overlays[key];
      const step = e.shiftKey ? 2.5 : 0.5; // Shift is 5x faster

      let deltaX = 0;
      let deltaY = 0;
      let handled = false;

      if (e.key === 'ArrowLeft') {
        deltaX = -step;
        handled = true;
      } else if (e.key === 'ArrowRight') {
        deltaX = step;
        handled = true;
      } else if (e.key === 'ArrowUp') {
        deltaY = -step;
        handled = true;
      } else if (e.key === 'ArrowDown') {
        deltaY = step;
        handled = true;
      } else if (e.key === '[') {
        // Rotate CCW
        onChange({
          ...overlays,
          [key]: {
            ...elem,
            rotation: Math.max(-45, elem.rotation - (e.shiftKey ? 5 : 1)),
          },
        });
        handled = true;
      } else if (e.key === ']') {
        // Rotate CW
        onChange({
          ...overlays,
          [key]: {
            ...elem,
            rotation: Math.min(45, elem.rotation + (e.shiftKey ? 5 : 1)),
          },
        });
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        if (deltaX !== 0 || deltaY !== 0) {
          const clamped = clampCoordinates(elem.xPercent + deltaX, elem.yPercent + deltaY);
          onChange({
            ...overlays,
            [key]: {
              ...elem,
              xPercent: Math.round(clamped.x * 10) / 10,
              yPercent: Math.round(clamped.y * 10) / 10,
            },
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInteractive, selectedElementId, overlays, onChange]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none z-30"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ overflow: 'hidden' }}
    >
      {/* Snap guide lines */}
      {snapEnabled && activeGuideX !== null && (
        <div
          className="absolute top-0 bottom-0 border-l border-dashed border-emerald-500 z-40 transition-opacity"
          style={{ left: `${activeGuideX}%` }}
        >
          <span className="text-[9px] bg-emerald-600 text-white font-mono px-1 rounded-sm absolute top-1 left-1 shadow-sm">
            X: {activeGuideX}%
          </span>
        </div>
      )}
      {snapEnabled && activeGuideY !== null && (
        <div
          className="absolute left-0 right-0 border-t border-dashed border-emerald-500 z-40 transition-opacity"
          style={{ top: `${activeGuideY}%` }}
        >
          <span className="text-[9px] bg-emerald-600 text-white font-mono px-1 rounded-sm absolute top-1 left-1 shadow-sm">
            Y: {activeGuideY}%
          </span>
        </div>
      )}

      {/* 1. School Stamp Overlay */}
      {overlays.stamp.visible && (
        <div
          id="overlay-stamp"
          onPointerDown={(e) => handlePointerDown(e, 'stamp')}
          className={`absolute pointer-events-auto transition-shadow ${
            isInteractive ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={{
            left: `${overlays.stamp.xPercent}%`,
            top: `${overlays.stamp.yPercent}%`,
            transform: `rotate(${overlays.stamp.rotation}deg) scale(${overlays.stamp.scale})`,
            opacity: overlays.stamp.opacity,
            transformOrigin: 'center center',
          }}
        >
          <div
            className={`relative rounded-md transition-all ${
              selectedElementId === 'stamp' && isInteractive
                ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white shadow-xl bg-emerald-50/10'
                : 'hover:ring-1 hover:ring-emerald-400/50'
            }`}
          >
            {selectedElementId === 'stamp' && isInteractive && (
              <div className="absolute -top-6 left-0 bg-emerald-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 whitespace-nowrap">
                <span>Stamp</span>
                <span className="font-mono text-[9px] opacity-80">
                  {overlays.stamp.xPercent}%, {overlays.stamp.yPercent}% | {overlays.stamp.rotation}°
                </span>
              </div>
            )}
            <SchoolStamp date="2026-05-01" />
          </div>
        </div>
      )}

      {/* 2. Head Teacher Signature Overlay */}
      {overlays.headTeacher.visible && (
        <div
          id="overlay-head-teacher"
          onPointerDown={(e) => handlePointerDown(e, 'head-teacher')}
          className={`absolute pointer-events-auto transition-shadow ${
            isInteractive ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={{
            left: `${overlays.headTeacher.xPercent}%`,
            top: `${overlays.headTeacher.yPercent}%`,
            transform: `rotate(${overlays.headTeacher.rotation}deg) scale(${overlays.headTeacher.scale})`,
            opacity: overlays.headTeacher.opacity,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className={`relative p-1 rounded transition-all ${
              selectedElementId === 'head-teacher' && isInteractive
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-xl bg-blue-50/20'
                : 'hover:ring-1 hover:ring-blue-400/50'
            }`}
          >
            {selectedElementId === 'head-teacher' && isInteractive && (
              <div className="absolute -top-6 left-0 bg-blue-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 whitespace-nowrap">
                <span>Head Teacher</span>
                <span className="font-mono text-[9px] opacity-80">
                  {overlays.headTeacher.xPercent}%, {overlays.headTeacher.yPercent}%
                </span>
              </div>
            )}
            {/* Realistic stylized Headteacher signature SVG */}
            <svg
              width="150"
              height="45"
              viewBox="0 0 150 45"
              fill="none"
              stroke="#0f3460"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm select-none"
            >
              <path d="M 12 34 C 28 8, 35 12, 44 26 C 48 32, 56 36, 68 20 C 74 12, 85 10, 92 24 C 98 34, 110 32, 138 22" />
              <path d="M 22 26 C 45 28, 88 28, 142 30" strokeWidth="1.2" strokeDasharray="3 2" />
              <path d="M 40 10 C 44 28, 48 38, 52 42" strokeWidth="1.8" />
            </svg>
          </div>
        </div>
      )}

      {/* 3. Class Teacher Signature Overlay */}
      {overlays.classTeacher.visible && (
        <div
          id="overlay-class-teacher"
          onPointerDown={(e) => handlePointerDown(e, 'class-teacher')}
          className={`absolute pointer-events-auto transition-shadow ${
            isInteractive ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={{
            left: `${overlays.classTeacher.xPercent}%`,
            top: `${overlays.classTeacher.yPercent}%`,
            transform: `rotate(${overlays.classTeacher.rotation}deg) scale(${overlays.classTeacher.scale})`,
            opacity: overlays.classTeacher.opacity,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className={`relative p-1 rounded transition-all ${
              selectedElementId === 'class-teacher' && isInteractive
                ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-white shadow-xl bg-purple-50/20'
                : 'hover:ring-1 hover:ring-purple-400/50'
            }`}
          >
            {selectedElementId === 'class-teacher' && isInteractive && (
              <div className="absolute -top-6 left-0 bg-purple-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 whitespace-nowrap">
                <span>Class Teacher</span>
                <span className="font-mono text-[9px] opacity-80">
                  {overlays.classTeacher.xPercent}%, {overlays.classTeacher.yPercent}%
                </span>
              </div>
            )}
            {/* Realistic stylized Class Teacher signature SVG */}
            <svg
              width="135"
              height="40"
              viewBox="0 0 135 40"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="2.0"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm select-none"
            >
              <path d="M 10 28 C 22 14, 30 16, 38 28 C 42 34, 52 32, 60 18 C 66 8, 80 14, 94 28 C 102 36, 114 26, 128 20" />
              <path d="M 28 34 L 120 34" strokeWidth="1.2" strokeDasharray="2 2" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
