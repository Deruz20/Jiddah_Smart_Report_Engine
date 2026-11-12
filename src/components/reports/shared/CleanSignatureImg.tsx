'use client';

import React, { useEffect, useState } from 'react';
import { cleanSignatureImageUrl, type SignatureInkMode } from '@/lib/signature-ink-processor';

interface CleanSignatureImgProps {
  src?: string | null;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  inkMode?: SignatureInkMode;
  boldness?: number;
}

/**
 * Renders an official signature with automatic client-side transparent ink extraction
 * when an uploaded asset still contains white/grey paper background pixels.
 */
export function CleanSignatureImg({
  src,
  alt = 'Signature',
  style,
  className,
  inkMode = 'blue',
  boldness = 1.25,
}: CleanSignatureImgProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src || null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    setHidden(false);
    setResolvedSrc(src || null);

    if (!src) return;

    cleanSignatureImageUrl(src, { inkMode, boldness })
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
  }, [src, inkMode, boldness]);

  if (!resolvedSrc || hidden) return null;

  return (
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
        ...style,
      }}
    />
  );
}

