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
        <filter id="jiddah-clean-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncR type="linear" slope="3.2" intercept="-1.45" />
            <feFuncG type="linear" slope="3.2" intercept="-1.45" />
            <feFuncB type="linear" slope="3.2" intercept="-1.45" />
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
            ? 'url(#jiddah-clean-ink) contrast(1.4) brightness(1.05)'
            : undefined,
          ...style,
        }}
      />
    </>
  );
}

export const CleanSignatureImg = CleanSignatureImage;
export default CleanSignatureImage;
