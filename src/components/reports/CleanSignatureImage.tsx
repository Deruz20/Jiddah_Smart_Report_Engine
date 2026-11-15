'use client';

import React, { useEffect, useState } from 'react';
import {
  cleanSignatureImageUrl,
  extractCleanSignaturePixels,
  type SignatureInkMode,
} from '@/lib/signature-ink-processor';

export const extractSignatureInk = cleanSignatureImageUrl;
export { extractCleanSignaturePixels };

export interface CleanSignatureImageProps {
  src?: string | null;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  inkMode?: SignatureInkMode;
  boldness?: number;
  studioFormatting?: {
    cleanSignatures?: boolean;
    [key: string]: any;
  };
}

/**
 * Global SVG filter definition that drops photographed grey background pixels
 * to pure transparent while retaining crisp pen ink.
 */
export function CleanSignatureSvgFilter() {
  return (
    <svg
      data-testid="jiddah-clean-ink-filter-svg"
      className="sr-only"
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {/* Dedicated Luminance-to-Blue-Ink Filter: strips dark grey backgrounds (RGB >= 0.48 -> alpha 0) and colors pen strokes in Royal Ballpoint Blue (#0F3491) */}
        <filter id="jiddah-blue-signature-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.059
                    0 0 0 0 0.204
                    0 0 0 0 0.569
                    -2.8 -2.8 -2.8 0 3.9"
          />
        </filter>
        <filter id="jiddah-clean-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncR type="linear" slope="4.5" intercept="-1.35" />
            <feFuncG type="linear" slope="4.5" intercept="-1.35" />
            <feFuncB type="linear" slope="4.5" intercept="-1.35" />
            <feFuncA type="identity" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Renders an official signature with high-contrast ink extraction and transparent paper removal.
 * Photographed grey camera paper backgrounds are stripped, blending seamlessly with report cards.
 */
export function CleanSignatureImage({
  src,
  alt = 'Signature',
  style,
  className,
  inkMode = 'blue',
  boldness = 1.25,
  studioFormatting,
}: CleanSignatureImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src || null);
  const [hidden, setHidden] = useState(false);

  const cleanEnabled = studioFormatting?.cleanSignatures !== false;

  useEffect(() => {
    let active = true;
    setHidden(false);
    setResolvedSrc(src || null);

    if (!src || !cleanEnabled) return;

    extractSignatureInk(src, { inkMode, boldness })
      .then((cleaned) => {
        if (active && cleaned) {
          setResolvedSrc(cleaned);
        }
      })
      .catch(() => {
        // Fallback to raw src silently
      });

    return () => {
      active = false;
    };
  }, [src, inkMode, boldness, cleanEnabled]);

  if (!resolvedSrc || hidden) return null;

  return (
    <>
      <CleanSignatureSvgFilter />
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        crossOrigin="anonymous"
        onError={() => setHidden(true)}
        style={{
          mixBlendMode: 'multiply',
          backgroundColor: 'transparent',
          objectFit: 'contain',
          filter: cleanEnabled
            ? (inkMode === 'blue'
                ? 'url(#jiddah-blue-signature-ink)'
                : 'grayscale(1) brightness(1.48) contrast(3.8) url(#jiddah-clean-ink)')
            : undefined,
          ...style,
        }}
      />
    </>
  );
}

export const CleanSignatureImg = CleanSignatureImage;
export default CleanSignatureImage;
