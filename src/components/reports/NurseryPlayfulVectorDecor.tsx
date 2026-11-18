import React from 'react'

export interface NurseryHeaderArtProps {
  side: 'left' | 'right'
  lineArt?: boolean
  width?: number
  height?: number
}

/**
 * Pure inline-SVG early-childhood illustrations for Nursery EOT report headers.
 * Renders either joyful pastel colors ('playful') or crisp monochrome strokes ('lineart').
 */
export function NurseryPlayfulHeaderArt({
  side,
  lineArt = false,
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
export function NurseryCornerDecor({ lineArt = false }: { lineArt?: boolean }) {
  const ink = '#334155'
  const gold = lineArt ? ink : '#D97706'
  const blue = lineArt ? ink : '#0284C7'
  const emerald = lineArt ? ink : '#059669'

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
