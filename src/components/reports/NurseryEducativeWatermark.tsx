'use client'

import React from 'react'
import {
  resolveEffectiveStudioStyle,
  useStudioFormatting,
  type ReportTemplateId,
  type StudioArtPreset,
} from '@/lib/studio-config-store'

export interface NurseryEducativeWatermarkProps {
  logoUrl?: string
  studioFormatting?: Record<string, any> | null
  includeEducativeArt?: boolean
  templateId?: ReportTemplateId
  variant?: 'secular' | 'theology'
}

/**
 * Zero-layout-shift watermark & blended vector art backdrop for all Nursery & Primary templates.
 * - Layer 1: Central Watermark (Official Crest, Crest + Islamic Star Frame, Academic Laurel Seal, or None)
 * - Layer 2: Selected Background Illustration Preset (Safari Wildlife, ABC & 123 Literacy, STEM Explorers,
 *   Islamic Garden & Arabic Alphabet, Islamic Geometric Arabesque, Classic Certificate Filigree, or None)
 */
export function NurseryEducativeWatermark({
  logoUrl = '/logo-512h.png',
  studioFormatting,
  includeEducativeArt = true,
  templateId,
  variant,
}: NurseryEducativeWatermarkProps) {
  const formatting = useStudioFormatting(studioFormatting)
  const effective = resolveEffectiveStudioStyle(formatting, undefined, templateId)
  const isTheologyVariant =
    variant === 'theology' || templateId === 'nursery-theology-eot' || templateId === 'theology-mot'

  const crestOpacity = effective.watermarkStyle === 'none' ? 0 : effective.watermarkOpacity
  const wmScale = Number((effective.watermarkScale / 100).toFixed(2))
  const resolvedPreset: StudioArtPreset =
    effective.artPreset === 'none'
      ? 'none'
      : effective.artPreset !== 'default'
        ? effective.artPreset
        : includeEducativeArt
          ? isTheologyVariant
            ? 'islamic-nursery'
            : 'safari'
          : 'none'

  const showArt =
    resolvedPreset !== 'none' &&
    (effective.artPreset !== 'default' || (includeEducativeArt && effective.showNurseryArt))
  const rawArtOp = effective.nurseryArtOpacity ?? 7
  const artOpacity =
    rawArtOp > 0.5 ? rawArtOp / 100 : Math.min(0.11, Math.max(0.035, (crestOpacity || 0.055) * 1.18))
  const strokeColor = effective.primaryColor || '#1E40AF'
  const accentColor = effective.secondaryColor || '#D97706'

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
      {/* Layer 1: Central School Crest / Seal Watermark */}
      {effective.watermarkStyle !== 'none' && crestOpacity > 0 && (
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
            transform: `scale(${wmScale})`,
            transformOrigin: 'center center',
          }}
        >
          <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {effective.watermarkStyle === 'crest-star' && (
              <svg
                viewBox="0 0 360 360"
                style={{ position: 'absolute', inset: '-20px', width: '360px', height: '360px' }}
                fill="none"
              >
                <rect x="52" y="52" width="256" height="256" rx="10" stroke={strokeColor} strokeWidth="3" />
                <rect
                  x="52"
                  y="52"
                  width="256"
                  height="256"
                  rx="10"
                  transform="rotate(45 180 180)"
                  stroke={accentColor}
                  strokeWidth="2.5"
                />
                <circle cx="180" cy="180" r="144" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="6 4" />
              </svg>
            )}
            {effective.watermarkStyle === 'laurel-seal' && (
              <svg
                viewBox="0 0 360 360"
                style={{ position: 'absolute', inset: '-20px', width: '360px', height: '360px' }}
                fill="none"
              >
                <circle cx="180" cy="180" r="154" stroke={strokeColor} strokeWidth="3.5" />
                <circle cx="180" cy="180" r="142" stroke={accentColor} strokeWidth="2" strokeDasharray="8 5" />
                <path
                  d="M65 250 C40 190, 50 115, 105 68 M295 250 C320 190, 310 115, 255 68"
                  stroke={strokeColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
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
        </div>
      )}

      {/* Layer 2: Background Illustration & Border Art Preset */}
      {showArt && (
        <svg
          data-testid="nursery-educative-vector-art"
          data-art-preset={resolvedPreset}
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
          {(resolvedPreset === 'safari' || resolvedPreset === 'abc-literacy') && (
            <>
              {/* A B C Alphabet Blocks */}
              <g transform="translate(24, 155)" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="0" y="0" width="44" height="44" rx="8" fill={strokeColor} fillOpacity="0.08" />
                <text x="22" y="31" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">A</text>
                <rect x="48" y="14" width="44" height="44" rx="8" fill={accentColor} fillOpacity="0.1" stroke={accentColor} />
                <text x="70" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill={accentColor} stroke="none" fontFamily="sans-serif">B</text>
                <rect x="18" y="50" width="44" height="44" rx="8" fill={strokeColor} fillOpacity="0.08" />
                <text x="40" y="81" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">C</text>
                <path d="M112 10 L115 20 L125 23 L115 26 L112 36 L109 26 L99 23 L109 20 Z" fill={accentColor} stroke="none" />
              </g>

              {/* Open Storybook */}
              <g transform="translate(26, 475)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M60 22 C42 12, 16 12, 4 20 L4 76 C16 68, 42 68, 60 78 C78 68, 104 68, 116 76 L116 20 C104 12, 78 12, 60 22 Z" fill={strokeColor} fillOpacity="0.05" />
                <path d="M60 22 L60 78" />
                <path d="M16 34 H46 M16 46 H46 M16 58 H38" strokeWidth="2" />
                <path d="M74 34 H104 M74 46 H104 M74 58 H96" strokeWidth="2" />
              </g>

              {/* 1 2 3 Numerals */}
              <g transform="translate(656, 155)" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="22" fill={strokeColor} fillOpacity="0.08" />
                <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">1</text>
                <circle cx="74" cy="36" r="22" fill={accentColor} fillOpacity="0.1" stroke={accentColor} />
                <text x="74" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill={accentColor} stroke="none" fontFamily="sans-serif">2</text>
                <circle cx="42" cy="76" r="22" fill={strokeColor} fillOpacity="0.08" />
                <text x="42" y="85" textAnchor="middle" fontSize="26" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="sans-serif">3</text>
              </g>

              {/* Pencil & Musical Notes */}
              <g transform="translate(662, 470)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 76 L68 26 L84 42 L34 92 L12 98 L18 76 Z" fill={strokeColor} fillOpacity="0.06" />
                <path d="M58 36 L74 52" />
                <path d="M82 88 V58 L108 52 V82" />
                <circle cx="76" cy="88" r="6" fill={strokeColor} />
                <circle cx="102" cy="82" r="6" fill={accentColor} />
              </g>
            </>
          )}

          {resolvedPreset === 'safari' && (
            <>
              {/* Lower-Left Corner: Friendly Giraffe & Baby Elephant */}
              <g transform="translate(24, 790)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M36 140 V88 L52 30 C54 22, 66 22, 68 30 L74 40 C78 42, 76 50, 68 50 L58 50 L54 88 L82 94 L82 140 M48 140 V112 H70 V140" fill={accentColor} fillOpacity="0.08" />
                <circle cx="58" cy="20" r="3" fill={strokeColor} />
                <circle cx="66" cy="20" r="3" fill={strokeColor} />
                <g transform="translate(96, 62)">
                  <path d="M18 78 V52 C18 32, 36 22, 56 24 C74 26, 86 38, 86 56 V78 H72 V62 H34 V78 H18 Z" fill={strokeColor} fillOpacity="0.07" />
                  <path d="M84 44 C96 44, 100 58, 92 66 C88 70, 82 66, 84 60" />
                  <ellipse cx="56" cy="44" rx="12" ry="15" fill={strokeColor} fillOpacity="0.1" />
                </g>
              </g>

              {/* Lower-Right Corner: Friendly Lion Cub & Graduation Cap */}
              <g transform="translate(625, 795)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M70 16 L118 34 L70 52 L22 34 L70 16 Z" fill={strokeColor} fillOpacity="0.1" />
                <path d="M42 42 V62 C42 70, 98 70, 98 62 V42" />
                <path d="M112 37 V64" stroke={accentColor} strokeWidth="2.8" />
                <g transform="translate(36, 76)">
                  <circle cx="36" cy="36" r="28" stroke={accentColor} strokeDasharray="6 4" fill={accentColor} fillOpacity="0.08" />
                  <circle cx="36" cy="36" r="20" fill="#FFFFFF" fillOpacity="0.6" stroke={strokeColor} />
                  <circle cx="29" cy="33" r="2.5" fill={strokeColor} />
                  <circle cx="43" cy="33" r="2.5" fill={strokeColor} />
                  <path d="M30 46 Q36 51 42 46" />
                </g>
              </g>
            </>
          )}

          {resolvedPreset === 'abc-literacy' && (
            <g transform="translate(26, 810)" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {/* Abacus */}
              <rect x="0" y="10" width="110" height="84" rx="8" />
              <line x1="0" y1="34" x2="110" y2="34" />
              <line x1="0" y1="58" x2="110" y2="58" />
              <circle cx="24" cy="34" r="6" fill={accentColor} />
              <circle cx="44" cy="34" r="6" fill={strokeColor} />
              <circle cx="72" cy="58" r="6" fill={accentColor} />
              <circle cx="92" cy="58" r="6" fill={strokeColor} />
              {/* Ruling Ruler on right */}
              <g transform="translate(620, 0)">
                <rect x="0" y="10" width="120" height="36" rx="4" fill={accentColor} fillOpacity="0.08" />
                <path d="M16 10 V22 M32 10 V18 M48 10 V22 M64 10 V18 M80 10 V22 M96 10 V18" />
              </g>
            </g>
          )}

          {resolvedPreset === 'stem-explorers' && (
            <>
              {/* Globe */}
              <g transform="translate(28, 180)" stroke={strokeColor} strokeWidth="2.5">
                <circle cx="48" cy="48" r="38" fill={strokeColor} fillOpacity="0.06" />
                <ellipse cx="48" cy="48" rx="18" ry="38" />
                <line x1="10" y1="48" x2="86" y2="48" />
                <path d="M22 92 H74 M48 86 V92" />
              </g>
              {/* Atom */}
              <g transform="translate(650, 170)" stroke={accentColor} strokeWidth="2.4">
                <ellipse cx="52" cy="52" rx="44" ry="18" transform="rotate(30 52 52)" />
                <ellipse cx="52" cy="52" rx="44" ry="18" transform="rotate(-30 52 52)" />
                <ellipse cx="52" cy="52" rx="44" ry="18" transform="rotate(90 52 52)" />
                <circle cx="52" cy="52" r="7" fill={strokeColor} />
              </g>
              {/* Rocket */}
              <g transform="translate(658, 820)" stroke={strokeColor} strokeWidth="2.5" strokeLinejoin="round">
                <path d="M52 10 C70 30, 74 62, 66 88 H38 C30 62, 34 30, 52 10 Z" fill={strokeColor} fillOpacity="0.08" />
                <circle cx="52" cy="48" r="8" fill={accentColor} fillOpacity="0.2" />
                <path d="M38 72 L24 92 L38 88 M66 72 L80 92 L66 88" />
              </g>
            </>
          )}

          {resolvedPreset === 'islamic-nursery' && (
            <>
              {/* Upper-Left Margin: Arabic Alphabet Outlined Tiles */}
              <g transform="translate(22, 150)" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {[
                  { ch: 'أ', x: 0, y: 0, accent: false },
                  { ch: 'ب', x: 48, y: 12, accent: true },
                  { ch: 'ت', x: 14, y: 50, accent: false },
                  { ch: 'ج', x: 64, y: 56, accent: true },
                  { ch: 'س', x: 20, y: 98, accent: false },
                  { ch: 'ق', x: 70, y: 102, accent: false },
                ].map((item) => (
                  <g key={item.ch} transform={`translate(${item.x}, ${item.y})`}>
                    <rect
                      x="0"
                      y="0"
                      width="42"
                      height="42"
                      rx="9"
                      fill={(item.accent ? accentColor : strokeColor)}
                      fillOpacity="0.06"
                      stroke={item.accent ? accentColor : strokeColor}
                    />
                    <text
                      x="21"
                      y="29"
                      textAnchor="middle"
                      fontSize="24"
                      fontWeight="900"
                      fill={item.accent ? accentColor : strokeColor}
                      stroke="none"
                      fontFamily="Amiri, Cairo, sans-serif"
                    >
                      {item.ch}
                    </text>
                  </g>
                ))}
              </g>

              {/* Upper-Right Margin: Eastern Arabic Numerals & Fanous Lantern */}
              <g transform="translate(652, 148)" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {[
                  { num: '١', x: 0, y: 6, accent: false },
                  { num: '٢', x: 52, y: 18, accent: true },
                  { num: '٣', x: 10, y: 58, accent: true },
                  { num: '٤', x: 60, y: 70, accent: false },
                  { num: '٥', x: 20, y: 112, accent: false },
                ].map((item) => (
                  <g key={item.num} transform={`translate(${item.x}, ${item.y})`}>
                    <circle
                      cx="20"
                      cy="20"
                      r="19"
                      fill={(item.accent ? accentColor : strokeColor)}
                      fillOpacity="0.06"
                      stroke={item.accent ? accentColor : strokeColor}
                    />
                    <text
                      x="20"
                      y="28"
                      textAnchor="middle"
                      fontSize="23"
                      fontWeight="900"
                      fill={item.accent ? accentColor : strokeColor}
                      stroke="none"
                      fontFamily="Amiri, Cairo, sans-serif"
                    >
                      {item.num}
                    </text>
                  </g>
                ))}
                {/* Outlined Fanous Lantern & Crescent */}
                <g transform="translate(86, 8)" stroke={accentColor}>
                  <path d="M18 4 C11 6, 10 15, 16 19 C20 21, 24 20, 26 17 C21 18, 17 14, 17 9 Z" />
                  <path d="M10 34 L26 34 L29 42 L7 42 Z" />
                  <rect x="8" y="42" width="20" height="28" rx="4" fill={accentColor} fillOpacity="0.05" />
                  <path d="M10 70 L26 70 L22 78 L14 78 Z" />
                </g>
              </g>

              {/* Mid-Left Margin: Noble Mushaf on Rehal + Honeybee & Butterfly */}
              <g transform="translate(22, 462)" stroke={strokeColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 92 L58 64 L98 92" stroke={accentColor} strokeWidth="3" />
                <path d="M58 26 C40 16, 16 16, 4 24 L4 70 C16 62, 40 62, 58 72 C76 62, 100 62, 112 70 L112 24 C100 16, 76 16, 58 26 Z" fill={strokeColor} fillOpacity="0.05" />
                <line x1="58" y1="26" x2="58" y2="72" />
                <path d="M16 38 H44 M16 49 H42 M72 38 H100 M72 49 H98" stroke={accentColor} strokeWidth="1.9" />
                {/* Honeybee & Butterfly */}
                <g transform="translate(18, 106)">
                  <ellipse cx="22" cy="18" rx="14" ry="9" fill={accentColor} fillOpacity="0.08" stroke={accentColor} />
                  <ellipse cx="18" cy="7" rx="8" ry="6" />
                  <ellipse cx="28" cy="7" rx="8" ry="6" />
                  <line x1="18" y1="9" x2="18" y2="27" />
                  <line x1="25" y1="10" x2="25" y2="26" />
                </g>
              </g>

              {/* Mid-Right Margin: Crowned Hoopoe (Hudhud) & Fish */}
              <g transform="translate(650, 470)" stroke={strokeColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="54" cy="46" rx="22" ry="15" fill={accentColor} fillOpacity="0.07" />
                <circle cx="76" cy="30" r="11" fill={strokeColor} fillOpacity="0.06" />
                <path d="M68 20 L64 8 M74 19 L74 6 M80 20 L84 9" stroke={accentColor} />
                <path d="M87 30 L106 27 L87 35" />
                <path d="M32 48 L14 60 L32 42" />
                {/* Gentle Fish below */}
                <g transform="translate(30, 86)" stroke={accentColor}>
                  <path d="M18 18 C32 4, 58 4, 74 18 C58 32, 32 32, 18 18 Z" fill={accentColor} fillOpacity="0.06" />
                  <path d="M18 18 L4 8 V28 Z" />
                  <circle cx="60" cy="15" r="2.2" fill={strokeColor} />
                </g>
              </g>

              {/* Bottom-Left Corner: Date Palm, Gentle Camel & Numerals ٦..١٠ */}
              <g transform="translate(22, 815)" stroke={strokeColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M34 115 Q40 76 34 38" stroke={accentColor} strokeWidth="4" />
                <path d="M34 38 C16 20, 4 26, 2 38 M34 38 C22 14, 38 10, 42 22 M34 38 C52 18, 66 26, 62 38 M34 38 C50 36, 56 48, 50 54" stroke={strokeColor} strokeWidth="2.8" />
                <g transform="translate(56, 54)" stroke={accentColor}>
                  <path d="M8 46 V24 C8 14, 18 10, 26 16 C32 4, 46 4, 52 16 L60 20 L62 6 C62 0, 72 0, 74 6 C74 12, 70 14, 67 16 L64 34 H58 V54 H50 V38 H24 V54 H16 V38 H8 Z" fill={accentColor} fillOpacity="0.06" />
                </g>
                <text x="12" y="138" fontSize="18" fontWeight="900" fill={strokeColor} stroke="none" fontFamily="Amiri, Cairo, sans-serif">٦  ٧  ٨  ٩  ١٠</text>
              </g>

              {/* Bottom-Right Corner: Mosque Dome, Rub el Hizb & Gentle Sheep */}
              <g transform="translate(646, 810)" stroke={strokeColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M32 48 C32 22, 82 22, 82 48 Z" fill={strokeColor} fillOpacity="0.06" />
                <line x1="57" y1="8" x2="57" y2="24" stroke={accentColor} />
                <rect x="24" y="48" width="66" height="30" rx="4" />
                <path d="M48 78 V62 C48 54, 66 54, 66 62 V78" stroke={accentColor} />
                <g transform="translate(6, 94)" stroke={accentColor}>
                  <rect x="12" y="8" width="32" height="32" rx="4" />
                  <rect x="12" y="8" width="32" height="32" rx="4" transform="rotate(45 28 24)" />
                </g>
                <text x="58" y="132" fontSize="19" fontWeight="900" fill={accentColor} stroke="none" fontFamily="Amiri, Cairo, sans-serif">ك  ل  م  ن  ي</text>
              </g>
            </>
          )}

          {resolvedPreset === 'islamic-arabesque' && (
            <>
              {[
                [26, 26],
                [668, 26],
                [26, 997],
                [668, 997],
              ].map(([x, y], idx) => (
                <g key={idx} transform={`translate(${x}, ${y})`} stroke={accentColor} strokeWidth="2.4">
                  <rect x="18" y="18" width="64" height="64" stroke={strokeColor} />
                  <rect x="18" y="18" width="64" height="64" transform="rotate(45 50 50)" />
                  <circle cx="50" cy="50" r="14" stroke={strokeColor} fill={accentColor} fillOpacity="0.1" />
                </g>
              ))}
            </>
          )}

          {resolvedPreset === 'certificate-filigree' && (
            <g stroke={accentColor} strokeWidth="2.4" fill="none">
              <path d="M22 86 V22 H86 M32 72 V32 H72" />
              <path d="M772 86 V22 H708 M762 72 V32 H722" />
              <path d="M22 1037 V1101 H86 M32 1051 V1091 H72" />
              <path d="M772 1037 V1101 H708 M762 1051 V1091 H722" />
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

export default NurseryEducativeWatermark
