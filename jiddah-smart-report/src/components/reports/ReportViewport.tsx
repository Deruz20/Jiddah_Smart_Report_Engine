'use client'

import React from 'react'
import { PreviewScaler } from './PreviewScaler'

interface ReportViewportProps {
  children: React.ReactNode
  orientation?: 'portrait' | 'landscape'
}

export function ReportViewport({ children, orientation = 'portrait' }: ReportViewportProps) {
  const isLandscape = orientation === 'landscape'
  const targetWidth = isLandscape ? 1123 : 794
  const targetHeight = isLandscape ? 794 : 1123

  return (
    <PreviewScaler targetWidth={targetWidth} targetHeight={targetHeight}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            .report-viewport-wrapper, .report-viewport-wrapper * { visibility: visible; }
            .report-viewport-wrapper {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4 ${orientation};
              margin: 0;
            }
            /* Force exact black and white/colors for the preview wrapper only */
            .report-viewport-wrapper, .report-viewport-wrapper * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      }} />
      <div 
        className="report-viewport-wrapper relative bg-white mx-auto print:!m-0 print:!shadow-none print:!border-0 overflow-hidden"
        style={{
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        {/* Faint Centered Watermark */}
        <div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
          style={{ opacity: 0.05 }}
        >
          <img 
            src="/school_budge.jpeg" 
            alt="Watermark" 
            className="w-[80%] max-h-[80%] object-contain grayscale"
          />
        </div>
        
        {/* Content Layer */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    </PreviewScaler>
  )
}
