'use client';

import React from 'react';

export interface JiddahLoaderProps {
  label?: string;
  sublabel?: string;
  variant?: 'fullscreen' | 'stage' | 'inline';
  className?: string;
}

/**
 * JiddahLoader: Engaging branded loading component featuring the Jiddah School Crest,
 * dual-orbiting Forest Emerald (#0D5C3A) & Warm Gold (#D97706) rings, and an animated shimmer bar.
 */
export function JiddahLoader({
  label = 'Loading Jiddah Workspace...',
  sublabel,
  variant = 'stage',
  className = '',
}: JiddahLoaderProps) {
  if (variant === 'inline') {
    return (
      <div
        data-testid="jiddah-loader-inline"
        className={`inline-flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300 ${className}`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0D5C3A] border-r-[#0D5C3A] animate-spin" />
          <div className="absolute inset-0.5 rounded-full border-2 border-transparent border-b-[#D97706] border-l-[#D97706] animate-[spin_1.5s_linear_infinite_reverse]" />
          <img
            src="/logo-512h.png"
            alt=""
            className="w-3 h-3 object-contain"
          />
        </div>
        <span>{label}</span>
      </div>
    );
  }

  const isFullscreen = variant === 'fullscreen';

  return (
    <div
      data-testid={isFullscreen ? 'jiddah-loader-fullscreen' : 'jiddah-loader-stage'}
      className={
        isFullscreen
          ? `fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#0B110E]/95 backdrop-blur-none p-6 select-none ${className}`
          : `w-full h-full min-h-[320px] flex flex-col items-center justify-center p-6 select-none ${className}`
      }
    >
      {/* Dual Orbiting Rings around Center Crest */}
      <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
        {/* Outer Orbit: Forest Emerald */}
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#0D5C3A] border-r-[#0D5C3A] dark:border-t-[#10B981] dark:border-r-[#10B981] animate-spin"
          style={{ animationDuration: '1.8s' }}
        />

        {/* Inner Counter-Orbit: Warm Gold */}
        <div
          className="absolute inset-2 rounded-full border-[2.5px] border-transparent border-b-[#D97706] border-l-[#D97706] dark:border-b-[#F59E0B] dark:border-l-[#F59E0B] animate-[spin_2.4s_linear_infinite_reverse]"
        />

        {/* Subtle Ambient Pulse Halo */}
        <div className="absolute inset-4 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 animate-pulse" />

        {/* Center Jiddah Crest */}
        <div className="relative z-10 w-12 h-12 flex items-center justify-center drop-shadow-sm">
          <img
            src="/logo-512h.png"
            alt="Jiddah Crest"
            className="w-11 h-11 object-contain"
          />
        </div>
      </div>

      {/* Primary Status Label */}
      <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F3F7F5] text-center tracking-tight mb-1">
        {label}
      </h3>

      {/* Sublabel / Context */}
      {sublabel && (
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] text-center max-w-sm mb-4">
          {sublabel}
        </p>
      )}

      {/* Animated Gradient Shimmer Bar */}
      <div className="w-48 h-1 rounded-full bg-stone-200/80 dark:bg-stone-800/80 overflow-hidden relative mt-2">
        <div
          className="absolute top-0 bottom-0 w-24 rounded-full bg-gradient-to-r from-[#0D5C3A] via-[#D97706] to-[#0D5C3A] dark:from-[#10B981] dark:via-[#F59E0B] dark:to-[#10B981] animate-[jiddahShimmer_1.6s_ease-in-out_infinite]"
          style={{
            animation: 'jiddahShimmer 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes jiddahShimmer {
          0% {
            left: -40%;
          }
          50% {
            left: 50%;
          }
          100% {
            left: 110%;
          }
        }
      `}</style>
    </div>
  );
}

export default JiddahLoader;
