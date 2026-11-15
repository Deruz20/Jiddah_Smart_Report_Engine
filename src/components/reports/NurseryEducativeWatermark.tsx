'use client'

import React from 'react'
import { useStudioFormatting } from '@/lib/studio-config-store'

export interface NurseryEducativeWatermarkProps {
  logoUrl?: string
  studioFormatting?: Record<string, any> | null
  includeEducativeArt?: boolean
}

/**
 * Zero-layout-shift watermark & blended educative vector backdrop for Nursery & Primary templates.
 * - Layer 1: Central School Crest Watermark (/logo-512h.png, 320px × 320px) at watermarkOpacity (default 0.055)
 * - Layer 2: Playful Educative Nursery SVG Vector Art (A B C blocks, open storybook, 1 2 3 counting numerals,
 *   abacus & pencil, musical notes, and friendly safari animals: giraffe, lion cub, baby elephant + graduation cap)
 */
export function NurseryEducativeWatermark({
  logoUrl = '/logo-512h.png',
  studioFormatting,
  includeEducativeArt = true,
}: NurseryEducativeWatermarkProps) {
  const { formatting, palette } = useStudioFormatting(studioFormatting)
  const rawWatermarkOp = formatting.watermarkOpacity ?? 4
  const crestOpacity = rawWatermarkOp > 0.5 ? rawWatermarkOp / 100 : rawWatermarkOp
  const showArt = includeEducativeArt && (formatting.showNurseryArt !== false)
  const rawArtOp = formatting.nurseryArtOpacity ?? 7
  const artOpacity = rawArtOp > 0.5 ? rawArtOp / 100 : Math.min(0.11, Math.max(0.035, (crestOpacity || 0.055) * 1.18))
  const strokeColor = palette.primaryColor || '#1E40AF'
  const accentColor = palette.secondaryColor || '#D97706'

  return (
    <div
      data-testid="nursery-educative-watermark"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Layer 1: Central School Crest Watermark (320px × 320px) */}
      <div
        data-testid="school-crest-watermark-layer"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: crestOpacity,
          pointerEvents: 'none',
        }}
      >
        <img
          src={logoUrl || '/logo-512h.png'}
          alt=""
          style={{
            width: '320px',
            height: '320px',
            objectFit: 'contain',
          }}
          onError={(e) => {
            if (!e.currentTarget.src.endsWith('/logo-512h.png')) {
              e.currentTarget.src = '/logo-512h.png'
            }
          }}
        />
      </div>

      {/* Layer 2: Blended Educative Nursery Vector Artwork */}
      {showArt && (
        <svg
          data-testid="nursery-educative-vector-art"
          viewBox="0 0 794 1123"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: artOpacity,
            pointerEvents: 'none',
          }}
        >
          {/* Top-Left & Mid-Left Margin: Playful A B C Alphabet Blocks, Open Storybook & Stars */}
          <g transform="translate(24, 155)" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Block A */}
            <rect x="0" y="0" width="44" height="44" rx="8" fill={strokeColor} fillOpacity="0.08" />
            <text x="22" y="31" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">
              A
            </text>
            {/* Block B */}
            <rect x="48" y="14" width="44" height="44" rx="8" fill={accentColor} fillOpacity="0.1" stroke={accentColor} />
            <text x="70" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill={accentColor} stroke="none" fontFamily="sans-serif">
              B
            </text>
            {/* Block C */}
            <rect x="18" y="50" width="44" height="44" rx="8" fill={strokeColor} fillOpacity="0.08" />
            <text x="40" y="81" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">
              C
            </text>
            {/* Sparkle Stars */}
            <path d="M112 10 L115 20 L125 23 L115 26 L112 36 L109 26 L99 23 L109 20 Z" fill={accentColor} stroke="none" />
            <circle cx="105" cy="70" r="4" fill={strokeColor} />
          </g>

          {/* Mid-Left Open Storybook */}
          <g transform="translate(26, 475)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M60 22 C42 12, 16 12, 4 20 L4 76 C16 68, 42 68, 60 78 C78 68, 104 68, 116 76 L116 20 C104 12, 78 12, 60 22 Z" fill={strokeColor} fillOpacity="0.05" />
            <path d="M60 22 L60 78" />
            <path d="M16 34 H46 M16 46 H46 M16 58 H38" strokeWidth="2" />
            <path d="M74 34 H104 M74 46 H104 M74 58 H96" strokeWidth="2" />
            <path d="M60 4 L63 11 L70 11 L64 15 L66 22 L60 18 L54 22 L56 15 L50 11 L57 11 Z" fill={accentColor} stroke="none" />
          </g>

          {/* Top-Right & Mid-Right Margin: 1 2 3 Counting Numerals, Abacus/Pencil & Musical Notes */}
          <g transform="translate(656, 155)" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="24" r="22" fill={strokeColor} fillOpacity="0.08" />
            <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">
              1
            </text>
            <circle cx="74" cy="36" r="22" fill={accentColor} fillOpacity="0.1" stroke={accentColor} />
            <text x="74" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill={accentColor} stroke="none" fontFamily="sans-serif">
              2
            </text>
            <circle cx="42" cy="76" r="22" fill={strokeColor} fillOpacity="0.08" />
            <text x="42" y="85" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">
              3
            </text>
          </g>

          {/* Mid-Right Pencil, Abacus Beads & Musical Notes */}
          <g transform="translate(662, 470)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Pencil */}
            <path d="M18 76 L68 26 L84 42 L34 92 L12 98 L18 76 Z" fill={strokeColor} fillOpacity="0.06" />
            <path d="M58 36 L74 52" />
            {/* Musical Notes */}
            <path d="M82 88 V58 L108 52 V82" />
            <circle cx="76" cy="88" r="6" fill={strokeColor} />
            <circle cx="102" cy="82" r="6" fill={accentColor} />
          </g>

          {/* Lower-Left Corner: Friendly Giraffe & Baby Elephant Line-Art Silhouette */}
          <g transform="translate(24, 790)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Gentle Giraffe */}
            <path
              d="M36 140 V88 L52 30 C54 22, 66 22, 68 30 L74 40 C78 42, 76 50, 68 50 L58 50 L54 88 L82 94 L82 140 M48 140 V112 H70 V140"
              fill={accentColor}
              fillOpacity="0.08"
            />
            <circle cx="58" cy="20" r="3" fill={strokeColor} />
            <circle cx="66" cy="20" r="3" fill={strokeColor} />
            <circle cx="52" cy="72" r="3.5" fill={accentColor} stroke="none" />
            <circle cx="64" cy="98" r="4" fill={accentColor} stroke="none" />
            <circle cx="46" cy="102" r="3" fill={accentColor} stroke="none" />

            {/* Baby Elephant */}
            <g transform="translate(96, 62)">
              <path
                d="M18 78 V52 C18 32, 36 22, 56 24 C74 26, 86 38, 86 56 V78 H72 V62 H34 V78 H18 Z"
                fill={strokeColor}
                fillOpacity="0.07"
              />
              {/* Trunk & Ear */}
              <path d="M84 44 C96 44, 100 58, 92 66 C88 70, 82 66, 84 60" />
              <ellipse cx="56" cy="44" rx="12" ry="15" fill={strokeColor} fillOpacity="0.1" />
              <circle cx="74" cy="38" r="2.5" fill={strokeColor} />
            </g>
          </g>

          {/* Lower-Right Corner: Friendly Lion Cub, Graduation Cap & Stars */}
          <g transform="translate(625, 795)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Graduation Cap */}
            <path d="M70 16 L118 34 L70 52 L22 34 L70 16 Z" fill={strokeColor} fillOpacity="0.1" />
            <path d="M42 42 V62 C42 70, 98 70, 98 62 V42" />
            <path d="M112 37 V64" stroke={accentColor} strokeWidth="2.8" />
            <circle cx="112" cy="66" r="3.5" fill={accentColor} />

            {/* Friendly Lion Cub Face */}
            <g transform="translate(36, 76)">
              <circle cx="36" cy="36" r="28" stroke={accentColor} strokeDasharray="6 4" fill={accentColor} fillOpacity="0.08" />
              <circle cx="36" cy="36" r="20" fill="#FFFFFF" fillOpacity="0.6" stroke={strokeColor} />
              <circle cx="22" cy="20" r="6" fill={strokeColor} fillOpacity="0.12" />
              <circle cx="50" cy="20" r="6" fill={strokeColor} fillOpacity="0.12" />
              <circle cx="29" cy="33" r="2.5" fill={strokeColor} />
              <circle cx="43" cy="33" r="2.5" fill={strokeColor} />
              <path d="M33 40 L39 40 L36 44 Z" fill={accentColor} />
              <path d="M30 46 Q36 51 42 46" />
            </g>
          </g>
        </svg>
      )}
    </div>
  )
}

export default NurseryEducativeWatermark
