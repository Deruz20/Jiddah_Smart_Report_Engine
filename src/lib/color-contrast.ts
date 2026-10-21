/**
 * WCAG 2.1 Programmatic Color Contrast & Luminance Validator.
 * Used for theme colors, school branding, and report card visual verification.
 */

// Converts hex string (#rrggbb or #rgb) to RGB components [0..255]
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

// Computes WCAG 2.1 relative luminance
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Computes contrast ratio between two hex colors (returns ratio from 1 to 21)
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Number(ratio.toFixed(2));
}

export interface ContrastEvaluation {
  ratio: number;
  isAANormalText: boolean; // >= 4.5
  isAALargeText: boolean;  // >= 3.0
  isAAANormalText: boolean;// >= 7.0
  status: 'PASS' | 'WARN' | 'FAIL';
  recommendation?: string;
}

export function evaluateColorContrast(foregroundHex: string, backgroundHex: string = '#FFFFFF'): ContrastEvaluation {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  const isAANormalText = ratio >= 4.5;
  const isAALargeText = ratio >= 3.0;
  const isAAANormalText = ratio >= 7.0;

  let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let recommendation: string | undefined;

  if (!isAALargeText) {
    status = 'FAIL';
    recommendation = `Contrast ratio of ${ratio}:1 fails WCAG AA standards. Choose a darker or more saturated hue.`;
  } else if (!isAANormalText) {
    status = 'WARN';
    recommendation = `Contrast ratio of ${ratio}:1 passes for large text/headings (>=3.0:1) but may be hard to read for body text.`;
  }

  return {
    ratio,
    isAANormalText,
    isAALargeText,
    isAAANormalText,
    status,
    recommendation,
  };
}
