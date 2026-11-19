import React from 'react'

export type NurseryArtVariant = 'secular' | 'theology' | 'islamic-garden'

export interface NurseryHeaderArtProps {
  side: 'left' | 'right'
  lineArt?: boolean
  variant?: NurseryArtVariant
  width?: number
  height?: number
}

/**
 * Pure inline-SVG early-childhood illustrations for Nursery EOT report headers.
 * Renders secular joyful pastel/lineart art OR Islamic Garden Arabic/Quranic motifs.
 */
export function NurseryPlayfulHeaderArt({
  side,
  lineArt = false,
  variant = 'secular',
  width = 112,
  height = 84,
}: NurseryHeaderArtProps) {
  const ink = '#1E293B'
  const sunFill = lineArt ? '#FFFFFF' : '#FDE047'
  const sunRay = lineArt ? ink : '#F59E0B'
  const skin = lineArt ? '#FFFFFF' : '#F7C9A6'
  const boyCap = lineArt ? '#E2E8F0' : '#0D5C3A'
  const boyCapBand = lineArt ? ink : '#F59E0B'
  const girlHijab = lineArt ? '#F1F5F9' : '#FB7185'
  const cloudFill = lineArt ? '#FFFFFF' : '#E0F2FE'
  const cloudStroke = lineArt ? ink : '#38BDF8'
  const starFill = lineArt ? '#FFFFFF' : '#FBBF24'
  const pencilBody = lineArt ? '#F1F5F9' : '#F59E0B'
  const pencilTip = lineArt ? '#CBD5E1' : '#FB7185'

  const isIslamic = variant === 'islamic-garden' || variant === 'theology'
  const emerald = lineArt ? ink : '#047857'
  const emeraldFill = lineArt ? '#FFFFFF' : '#D1FAE5'
  const gold = lineArt ? ink : '#D97706'
  const goldFill = lineArt ? '#FFFFFF' : '#FEF3C7'
  const sandFill = lineArt ? '#FFFFFF' : '#FDE68A'

  if (isIslamic && side === 'right') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        data-testid="nursery-islamic-art-right"
      >
        {/* Crescent Moon & Twinkling Stars */}
        <path
          d="M20 12 C11 14, 9 27, 18 33 C23 36, 29 34, 31 30 C24 31, 18 26, 18 19 C18 16, 19 14, 20 12 Z"
          fill={goldFill}
          stroke={gold}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M34 11 L35.6 15 L39.8 15.5 L36.6 18.3 L37.5 22.5 L34 20.3 L30.5 22.5 L31.4 18.3 L28.2 15.5 L32.4 15 Z"
          fill={starFill}
          stroke={ink}
          strokeWidth="1.1"
        />

        {/* Hanging Islamic Fanous Lantern */}
        <g transform="translate(88, 2)">
          <line x1="12" y1="0" x2="12" y2="8" stroke={gold} strokeWidth="1.6" />
          <path d="M8 8 L16 8 L18 14 L6 14 Z" fill={goldFill} stroke={gold} strokeWidth="1.4" />
          <rect x="6" y="14" width="12" height="16" rx="3" fill={lineArt ? '#FFFFFF' : '#FEF08A'} stroke={gold} strokeWidth="1.5" />
          <path d="M12 16 V28 M9 19 L15 19" stroke={emerald} strokeWidth="1.2" />
          <path d="M7 30 L17 30 L14 35 L10 35 Z" fill={goldFill} stroke={gold} strokeWidth="1.4" />
        </g>

        {/* Smiling Boy in Kufi & Girl in Hijab Reading Mushaf on Rehal */}
        <g transform="translate(18, 26)">
          {/* Girl in Emerald Hijab */}
          <path d="M22 4 C11 4, 5 12, 5 24 C5 33, 8 40, 11 45 H33 C36 40, 39 33, 39 24 C39 12, 33 4, 22 4 Z" fill={lineArt ? '#F1F5F9' : '#34D399'} stroke={ink} strokeWidth="1.5" />
          <circle cx="22" cy="19" r="9.5" fill={skin} stroke={ink} strokeWidth="1.4" />
          <circle cx="18.5" cy="18.5" r="1.2" fill={ink} />
          <circle cx="25.5" cy="18.5" r="1.2" fill={ink} />
          <path d="M19 22.5 Q22 25.5 25 22.5" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />

          {/* Boy in Kufi */}
          <g transform="translate(36, 0)">
            <path d="M6 45 C6 36, 13 32, 22 32 C31 32, 38 36, 38 45 Z" fill={emeraldFill} stroke={ink} strokeWidth="1.5" />
            <circle cx="22" cy="19" r="10.5" fill={skin} stroke={ink} strokeWidth="1.5" />
            <path d="M12 15 C12 8, 32 8, 32 15 Z" fill={boyCap} stroke={ink} strokeWidth="1.4" />
            <path d="M12.5 14.5 H31.5" stroke={gold} strokeWidth="2" strokeLinecap="round" />
            <circle cx="18.5" cy="19" r="1.2" fill={ink} />
            <circle cx="25.5" cy="19" r="1.2" fill={ink} />
            <path d="M19 23 Q22 26 25 23" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
          </g>

          {/* Open Mushaf resting on Rehal Stand */}
          <g transform="translate(22, 35)">
            <path d="M8 22 L20 12 L32 22" stroke={gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 8 C14 4, 5 4, 1 7 V17 C5 14, 14 14, 20 18 C26 14, 35 14, 39 17 V7 C35 4, 26 4, 20 8 Z" fill="#FFFFFF" stroke={emerald} strokeWidth="1.6" strokeLinejoin="round" />
            <line x1="20" y1="8" x2="20" y2="18" stroke={emerald} strokeWidth="1.4" />
            <path d="M6 10 H15 M6 13 H14 M25 10 H34 M26 13 H34" stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    )
  }

  if (isIslamic && side === 'left') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        data-testid="nursery-islamic-art-left"
      >
        {/* Floating Arabic Letters أ ب ت & Numerals ١ ٢ ٣ */}
        <text x="12" y="18" fontSize="12" fontWeight="900" fill={emerald} fontFamily="Cairo, sans-serif">أ</text>
        <text x="26" y="15" fontSize="11" fontWeight="900" fill={gold} fontFamily="Cairo, sans-serif">ب</text>
        <text x="39" y="19" fontSize="11" fontWeight="900" fill={emerald} fontFamily="Cairo, sans-serif">ت</text>
        <text x="86" y="16" fontSize="11" fontWeight="900" fill={gold} fontFamily="Cairo, sans-serif">١ ٢ ٣</text>

        {/* Mosque Dome + Crescent Finial */}
        <g transform="translate(46, 8)">
          <line x1="14" y1="3" x2="14" y2="8" stroke={gold} strokeWidth="1.4" />
          <circle cx="14" cy="2.5" r="2" stroke={gold} strokeWidth="1.2" />
          <path d="M4 22 C4 11, 24 11, 24 22 Z" fill={emeraldFill} stroke={emerald} strokeWidth="1.5" />
          <rect x="3" y="22" width="22" height="10" rx="1.5" fill="#FFFFFF" stroke={emerald} strokeWidth="1.4" />
          <path d="M11 32 V27 C11 25, 17 25, 17 27 V32" fill={goldFill} stroke={gold} strokeWidth="1.2" />
        </g>

        {/* Date Palm Tree */}
        <g transform="translate(6, 26)">
          <path d="M16 56 Q19 40 16 24" stroke={gold} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M16 24 C8 16, 2 18, 1 23 M16 24 C10 12, 18 10, 20 15 M16 24 C24 14, 30 18, 29 24 M16 24 C24 22, 27 28, 24 31" stroke={emerald} strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* Friendly Baby Camel */}
        <g transform="translate(34, 44)">
          <path
            d="M8 28 V18 C8 13, 14 11, 18 14 C21 8, 28 8, 31 14 L36 16 L36 8 C36 4, 42 4, 43 8 C43 11, 41 12, 39 13 L38 22 H34 V32 H30 V24 H16 V32 H12 V24 H8 Z"
            fill={sandFill}
            stroke={gold}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="39.5" cy="7.5" r="1" fill={ink} />
        </g>

        {/* Crowned Hoopoe (Hudhud) & Honeybee */}
        <g transform="translate(76, 36)">
          {/* Hoopoe */}
          <ellipse cx="14" cy="24" rx="8" ry="6" fill={lineArt ? '#FFFFFF' : '#FDBA74'} stroke={ink} strokeWidth="1.4" />
          <circle cx="20" cy="18" r="4.5" fill={lineArt ? '#FFFFFF' : '#FED7AA'} stroke={ink} strokeWidth="1.4" />
          <path d="M17 14 L15 8 M19.5 13.5 L20 7 M22 14 L24 9" stroke={gold} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M24 18 L31 17 L24 20" stroke={ink} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6 25 L1 29 L6 22" fill={ink} />
          {/* Little Honeybee */}
          <g transform="translate(26, 2)">
            <ellipse cx="7" cy="8" rx="5" ry="3.5" fill={lineArt ? '#FFFFFF' : '#FACC15'} stroke={ink} strokeWidth="1.2" />
            <ellipse cx="6" cy="4" rx="2.5" ry="2" fill="#E0F2FE" stroke={ink} strokeWidth="1" />
            <line x1="6" y1="5" x2="6" y2="11" stroke={ink} strokeWidth="1.1" />
            <line x1="9" y1="5.5" x2="9" y2="10.5" stroke={ink} strokeWidth="1.1" />
          </g>
        </g>
      </svg>
    )
  }

  if (side === 'left') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        data-testid="nursery-vector-art-left"
      >
        {/* Soft Rainbow Arc */}
        <path
          d="M12 36 C16 14, 46 14, 52 34"
          stroke={lineArt ? ink : '#FB7185'}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M17 37 C21 20, 42 20, 47 35"
          stroke={lineArt ? ink : '#FBBF24'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={lineArt ? '3 2' : undefined}
        />
        <path
          d="M22 38 C26 26, 38 26, 42 36"
          stroke={lineArt ? ink : '#34D399'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Fluffy Cloud */}
        <path
          d="M6 42 C6 36, 13 33, 18 36 C21 31, 30 31, 33 36 C38 35, 42 39, 41 44 H9 C7 44, 6 43, 6 42 Z"
          fill={cloudFill}
          stroke={cloudStroke}
          strokeWidth="1.6"
        />

        {/* Bright Smiling Sun / Sunflower */}
        <g transform="translate(82, 4)">
          <circle cx="16" cy="16" r="10.5" fill={sunFill} stroke={sunRay} strokeWidth="1.8" />
          <path
            d="M16 1 V4 M16 28 V31 M1 16 H4 M28 16 H31 M5 5 L7.5 7.5 M24.5 24.5 L27 27 M27 5 L24.5 7.5 M7.5 24.5 L5 27"
            stroke={sunRay}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="13" cy="15" r="1.2" fill={ink} />
          <circle cx="19" cy="15" r="1.2" fill={ink} />
          <path d="M13 18.5 Q16 21 19 18.5" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
        </g>

        {/* Smiling Muslim Nursery Boy in Neat Kufi */}
        <g transform="translate(46, 26)">
          {/* Shoulders / Thobe */}
          <path
            d="M6 58 C6 46, 15 41, 26 41 C37 41, 46 46, 46 58 Z"
            fill={lineArt ? '#FFFFFF' : '#E0F2FE'}
            stroke={ink}
            strokeWidth="1.7"
          />
          {/* Collar */}
          <path d="M21 42 L26 49 L31 42" stroke={lineArt ? ink : '#0284C7'} strokeWidth="1.5" />
          {/* Head */}
          <circle cx="26" cy="26" r="14.5" fill={skin} stroke={ink} strokeWidth="1.8" />
          {/* Neat Kufi Cap */}
          <path
            d="M12.5 21 C12.5 11, 39.5 11, 39.5 21 Z"
            fill={boyCap}
            stroke={ink}
            strokeWidth="1.7"
          />
          <path d="M13 20.5 H39" stroke={boyCapBand} strokeWidth="2.6" strokeLinecap="round" />
          {/* Smiling Face */}
          <circle cx="21" cy="26" r="1.5" fill={ink} />
          <circle cx="31" cy="26" r="1.5" fill={ink} />
          {!lineArt && (
            <>
              <circle cx="18" cy="29.5" r="2.2" fill="#FDA4AF" opacity="0.65" />
              <circle cx="34" cy="29.5" r="2.2" fill="#FDA4AF" opacity="0.65" />
            </>
          )}
          <path d="M21.5 31.5 Q26 35.5 30.5 31.5" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        </g>

        {/* Twinkling Star */}
        <path
          d="M18 58 L20.2 63.5 L26 64.2 L21.6 68 L22.8 73.8 L18 70.8 L13.2 73.8 L14.4 68 L10 64.2 L15.8 63.5 Z"
          fill={starFill}
          stroke={ink}
          strokeWidth="1.3"
        />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="nursery-vector-art-right"
    >
      {/* Dotted Pencil Flight Trail & Paper Airplane */}
      <path
        d="M8 22 C22 10, 42 12, 54 24"
        stroke={lineArt ? ink : '#0284C7'}
        strokeWidth="1.6"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <g transform="translate(52, 8)">
        <path
          d="M2 14 L24 4 L15 22 L11 16 Z"
          fill={lineArt ? '#FFFFFF' : '#BAE6FD'}
          stroke={ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M11 16 L24 4" stroke={ink} strokeWidth="1.2" />
      </g>

      {/* 4-Color Pinwheel */}
      <g transform="translate(88, 12)">
        <line x1="12" y1="14" x2="12" y2="36" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 14 L12 4 C18 4, 20 10, 12 14 Z" fill={lineArt ? '#FFFFFF' : '#F59E0B'} stroke={ink} strokeWidth="1.4" />
        <path d="M12 14 L22 14 C22 20, 16 22, 12 14 Z" fill={lineArt ? '#E2E8F0' : '#38BDF8'} stroke={ink} strokeWidth="1.4" />
        <path d="M12 14 L12 24 C6 24, 4 18, 12 14 Z" fill={lineArt ? '#FFFFFF' : '#10B981'} stroke={ink} strokeWidth="1.4" />
        <path d="M12 14 L2 14 C2 8, 8 6, 12 14 Z" fill={lineArt ? '#E2E8F0' : '#FB7185'} stroke={ink} strokeWidth="1.4" />
        <circle cx="12" cy="14" r="2.2" fill="#FFFFFF" stroke={ink} strokeWidth="1.3" />
      </g>

      {/* Smiling Muslim Nursery Girl in Cheerful Hijab */}
      <g transform="translate(28, 25)">
        {/* Hijab Outer Drape */}
        <path
          d="M28 6 C14 6, 7 17, 7 32 C7 42, 11 52, 14 58 H42 C45 52, 49 42, 49 32 C49 17, 42 6, 28 6 Z"
          fill={girlHijab}
          stroke={ink}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Face inside Hijab */}
        <circle cx="28" cy="26" r="12.5" fill={skin} stroke={ink} strokeWidth="1.6" />
        {/* Hijab Scarf Trim Flower */}
        <circle cx="40" cy="18" r="3.4" fill={sunFill} stroke={ink} strokeWidth="1.2" />
        {/* Eyes & Cheerful Smile */}
        <circle cx="23.5" cy="25.5" r="1.4" fill={ink} />
        <circle cx="32.5" cy="25.5" r="1.4" fill={ink} />
        {!lineArt && (
          <>
            <circle cx="20.5" cy="29" r="2" fill="#F43F5E" opacity="0.45" />
            <circle cx="35.5" cy="29" r="2" fill="#F43F5E" opacity="0.45" />
          </>
        )}
        <path d="M23.5 31 Q28 35 32.5 31" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* Colorful Pencil */}
      <g transform="translate(88, 52) rotate(-28)">
        <rect x="0" y="6" width="22" height="8" rx="1.5" fill={pencilBody} stroke={ink} strokeWidth="1.4" />
        <path d="M22 6 L30 10 L22 14 Z" fill={skin} stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M27.5 8.8 L30 10 L27.5 11.2 Z" fill={ink} />
        <rect x="-4" y="6" width="4.5" height="8" rx="1.2" fill={pencilTip} stroke={ink} strokeWidth="1.4" />
      </g>
    </svg>
  )
}

/**
 * Corner storybook, star award ribbon, cloud & paper airplane vectors anchored gently in corners.
 */
export function NurseryCornerDecor({
  lineArt = false,
  variant = 'secular',
}: {
  lineArt?: boolean
  variant?: NurseryArtVariant
}) {
  const ink = '#334155'
  const gold = lineArt ? ink : '#D97706'
  const blue = lineArt ? ink : '#0284C7'
  const emerald = lineArt ? ink : '#059669'

  if (variant === 'islamic-garden' || variant === 'theology') {
    return (
      <div
        data-testid="nursery-corner-decor"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Bottom-Left: Open Noble Mushaf on Rehal Stand & Crescent */}
        <svg
          width="74"
          height="58"
          viewBox="0 0 80 62"
          fill="none"
          style={{ position: 'absolute', bottom: '8px', left: '12px', opacity: lineArt ? 0.35 : 0.65 }}
        >
          <path d="M22 50 L40 34 L58 50" stroke={gold} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M40 20 C29 14, 14 14, 6 19 V40 C14 35, 29 35, 40 41 C51 35, 66 35, 74 40 V19 C66 14, 51 14, 40 20 Z"
            fill={lineArt ? '#FFFFFF' : '#ECFDF5'}
            stroke={emerald}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <line x1="40" y1="20" x2="40" y2="41" stroke={emerald} strokeWidth="1.6" />
          <path d="M14 26 H32 M14 32 H30 M48 26 H66 M48 32 H64" stroke={gold} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M62 4 C56 6, 55 13, 60 16 C63 18, 67 17, 68 15 C64 15, 60 12, 60 8 Z" fill={lineArt ? '#FFFFFF' : '#FDE68A'} stroke={gold} strokeWidth="1.4" />
        </svg>

        {/* Bottom-Right: Rub el Hizb Islamic Star & Palm Medallion */}
        <svg
          width="66"
          height="58"
          viewBox="0 0 68 62"
          fill="none"
          style={{ position: 'absolute', bottom: '8px', right: '12px', opacity: lineArt ? 0.35 : 0.65 }}
        >
          <rect x="19" y="15" width="30" height="30" rx="2" fill={lineArt ? '#FFFFFF' : '#FEF3C7'} stroke={gold} strokeWidth="1.8" />
          <rect x="19" y="15" width="30" height="30" rx="2" transform="rotate(45 34 30)" fill={lineArt ? '#FFFFFF' : '#ECFDF5'} stroke={emerald} strokeWidth="1.8" />
          <circle cx="34" cy="30" r="8.5" fill={lineArt ? '#FFFFFF' : '#FDE68A'} stroke={gold} strokeWidth="1.6" />
        </svg>
      </div>
    )
  }

  return (
    <div
      data-testid="nursery-corner-decor"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Subtle Top-Side Twinkling Stars & Open Storybook */}
      <svg
        width="74"
        height="58"
        viewBox="0 0 80 62"
        fill="none"
        style={{ position: 'absolute', bottom: '8px', left: '12px', opacity: lineArt ? 0.35 : 0.6 }}
      >
        <path
          d="M38 18 C27 12, 12 12, 4 17 V50 C12 45, 27 45, 38 51 C49 45, 64 45, 72 50 V17 C64 12, 49 12, 38 18 Z"
          fill={lineArt ? '#FFFFFF' : '#FEF9C3'}
          stroke={blue}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <line x1="38" y1="18" x2="38" y2="51" stroke={blue} strokeWidth="1.6" />
        <path d="M12 26 H30 M12 34 H28" stroke={emerald} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M46 26 H64 M46 34 H62" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M68 4 L70 9 L75 10 L71 13 L72 18 L68 15 L64 18 L65 13 L61 10 L66 9 Z" fill={lineArt ? '#FFFFFF' : '#FBBF24'} stroke={ink} strokeWidth="1.2" />
      </svg>

      {/* Subtle Bottom-Right Star Award Ribbon */}
      <svg
        width="64"
        height="58"
        viewBox="0 0 68 62"
        fill="none"
        style={{ position: 'absolute', bottom: '8px', right: '12px', opacity: lineArt ? 0.35 : 0.6 }}
      >
        <path d="M26 34 L20 56 L30 50 L36 56 L38 34" fill={lineArt ? '#FFFFFF' : '#BAE6FD'} stroke={blue} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M40 34 L46 56 L38 50 L34 56" fill={lineArt ? '#FFFFFF' : '#FDE68A'} stroke={gold} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="34" cy="24" r="15" fill={lineArt ? '#FFFFFF' : '#FEF3C7'} stroke={gold} strokeWidth="2" />
        <path
          d="M34 13 L37 20 L44.5 21 L39 26 L40.5 33.5 L34 29.8 L27.5 33.5 L29 26 L23.5 21 L31 20 Z"
          fill={lineArt ? '#FFFFFF' : '#F59E0B'}
          stroke={ink}
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}
