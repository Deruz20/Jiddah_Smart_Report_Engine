'use client';

import React, { useEffect, useState } from 'react';
import {
  cleanSignatureImageUrl,
  extractCleanSignaturePixels,
  getCachedSignatureUrl,
  type SignatureInkMode,
} from '@/lib/signature-ink-processor';

export const extractSignatureInk = cleanSignatureImageUrl;
export { extractCleanSignaturePixels };

/**
 * In-memory cache of processed signature data URLs keyed by `${src}|${inkColor}|${threshold}`
 * so HTML5 Canvas pixel-by-pixel extraction NEVER re-runs on React re-renders or batch printing.
 */
export const signatureDataUrlCache = new Map<string, string>();
const MAX_SIGNATURE_MEMO_ENTRIES = 250;

export function buildSignatureCacheKey(
  src: string,
  inkColor: string = '#0C2A84',
  threshold: number = 225
): string {
  return `${src}|${(inkColor || '#0C2A84').toUpperCase()}|${threshold}`;
}

export interface CleanSignatureImageProps {
  src?: string | null;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  inkMode?: SignatureInkMode;
  boldness?: number;
  studioFormatting?: {
    cleanSignatures?: boolean;
    signatureScale?: number;
    signatureRotation?: number;
    signatureOffsetX?: number;
    signatureOffsetY?: number;
    signatureInkColor?: string;
    signatureThreshold?: number;
    [key: string]: any;
  };
}

function hexToRgbUnit(hex: string): [number, number, number] {
  const clean = (hex || '#0C2A84').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = (parseInt(full.slice(0, 2), 16) || 12) / 255;
  const g = (parseInt(full.slice(2, 4), 16) || 42) / 255;
  const b = (parseInt(full.slice(4, 6), 16) || 132) / 255;
  return [Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3))];
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
        {/* Dedicated Luminance-to-Blue-Ink Filter: strips dark grey backgrounds and colors pen strokes in Royal Ballpoint Blue (#0F3491) without clipping transparent pixels into solid blocks */}
        <filter id="jiddah-blue-signature-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.059
                    0 0 0 0 0.204
                    0 0 0 0 0.569
                    0 0 0 1 0"
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
function CleanSignatureImageInner({
  src,
  alt = 'Signature',
  style,
  className,
  inkMode: propInkMode = 'blue',
  boldness: propBoldness = 1.25,
  studioFormatting,
}: CleanSignatureImageProps) {
  const cleanEnabled = studioFormatting?.cleanSignatures !== false;
  const sigInkHex = studioFormatting?.signatureInkColor || '#0C2A84';
  const resolvedInkMode: SignatureInkMode =
    sigInkHex.toUpperCase() === '#0F172A'
      ? 'black'
      : propInkMode;

  const thresholdVal = Number(studioFormatting?.signatureThreshold ?? 225);
  const effectiveBoldness =
    studioFormatting?.signatureThreshold !== undefined
      ? thresholdVal >= 245
        ? 1.85
        : thresholdVal <= 195
          ? 0.95
          : 1.3
      : propBoldness;

  const memoKey = src ? buildSignatureCacheKey(src, sigInkHex, thresholdVal) : '';

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    if (!cleanEnabled) return src;
    if (src.startsWith('data:')) return src;
    const directHit = signatureDataUrlCache.get(memoKey);
    if (directHit) return directHit;
    return getCachedSignatureUrl(src, { inkMode: resolvedInkMode, boldness: effectiveBoldness }) ?? null;
  });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    setHidden(false);

    const trimmedSrc = typeof src === 'string' ? src.trim() : '';
    if (!trimmedSrc) {
      setResolvedSrc(null);
      return;
    }

    if (!cleanEnabled) {
      setResolvedSrc(trimmedSrc);
      return;
    }

    const cached = trimmedSrc.startsWith('data:')
      ? trimmedSrc
      : signatureDataUrlCache.get(memoKey) ??
        getCachedSignatureUrl(trimmedSrc, { inkMode: resolvedInkMode, boldness: effectiveBoldness });
    if (cached) {
      if (!trimmedSrc.startsWith('data:') && memoKey && !signatureDataUrlCache.has(memoKey)) {
        signatureDataUrlCache.set(memoKey, cached);
      }
      setResolvedSrc(cached);
      return;
    }

    setResolvedSrc(null);

    extractSignatureInk(trimmedSrc, { inkMode: resolvedInkMode, boldness: effectiveBoldness })
      .then((cleaned) => {
        if (cleaned && memoKey) {
          if (signatureDataUrlCache.size >= MAX_SIGNATURE_MEMO_ENTRIES) {
            const oldestKey = signatureDataUrlCache.keys().next().value;
            if (oldestKey) signatureDataUrlCache.delete(oldestKey);
          }
          signatureDataUrlCache.set(memoKey, cleaned);
        }
        if (active && cleaned) {
          setResolvedSrc(cleaned);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedSrc(trimmedSrc);
        }
      });

    return () => {
      active = false;
    };
  }, [src, memoKey, resolvedInkMode, effectiveBoldness, cleanEnabled]);

  if (!src || typeof src !== 'string' || !src.trim() || !resolvedSrc || hidden) return null;

  const isProcessed = Boolean(resolvedSrc?.startsWith('data:'));
  const sigScale = Number(studioFormatting?.signatureScale ?? 100) / 100;
  const sigRotation = Number(studioFormatting?.signatureRotation ?? 0);
  const sigOffsetX = Number(studioFormatting?.signatureOffsetX ?? 0);
  const sigOffsetY = Number(studioFormatting?.signatureOffsetY ?? 0);
  const filterId = `jiddah-custom-sig-${sigInkHex.replace(/[^a-fA-F0-9]/g, '') || '0C2A84'}`;
  const [rU, gU, bU] = hexToRgbUnit(sigInkHex);
  const useCustomInkFilter =
    Boolean(studioFormatting?.signatureInkColor) &&
    sigInkHex.toUpperCase() !== '#0C2A84';

  const transformParts = [
    sigOffsetX !== 0 || sigOffsetY !== 0 ? `translate(${sigOffsetX}px, ${sigOffsetY}px)` : '',
    sigRotation !== 0 ? `rotate(${sigRotation}deg)` : '',
    sigScale !== 1 ? `scale(${sigScale})` : '',
  ].filter(Boolean);

  return (
    <>
      {!isProcessed && <CleanSignatureSvgFilter />}
      {useCustomInkFilter && (
        <svg className="sr-only" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values={`0 0 0 0 ${rU}  0 0 0 0 ${gU}  0 0 0 0 ${bU}  0 0 0 1 0`}
              />
            </filter>
          </defs>
        </svg>
      )}
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
          maxHeight: '45px',
          width: '100%',
          maxWidth: '140px',
          transform: transformParts.length > 0 ? transformParts.join(' ') : undefined,
          transformOrigin: 'center bottom',
          filter: useCustomInkFilter
            ? `url(#${filterId})`
            : cleanEnabled && !isProcessed
              ? resolvedInkMode === 'blue'
                ? 'grayscale(1) brightness(1.48) contrast(3.8) url(#jiddah-blue-signature-ink)'
                : 'grayscale(1) brightness(1.48) contrast(3.8) url(#jiddah-clean-ink)'
              : thresholdVal >= 245
                ? 'contrast(1.35) saturate(1.15)'
                : thresholdVal <= 195
                  ? 'opacity(0.86)'
                  : undefined,
          ...style,
        }}
      />
    </>
  );
}

export const CleanSignatureImage = React.memo(CleanSignatureImageInner);
export const CleanSignatureImg = CleanSignatureImage;
export default CleanSignatureImage;
