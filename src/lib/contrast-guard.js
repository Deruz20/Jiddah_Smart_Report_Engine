// @ts-check

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 15, g: 77, b: 37 }; // default fallback #0F4D25
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
export function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Enforce minimum contrast ratio (default 4.5:1 for WCAG AA) against target background.
 * If contrast is insufficient, progressively darken the color until compliance is met.
 * @param {string} colorHex
 * @param {string} [backgroundHex='#FDFBF7']
 * @param {number} [minRatio=4.5]
 * @returns {{ safeColor: string, actualRatio: number, wasAdjusted: boolean }}
 */
export function enforceContrastGuard(colorHex, backgroundHex = '#FDFBF7', minRatio = 4.5) {
  let currentRgb = hexToRgb(colorHex);
  let currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
  let ratio = getContrastRatio(currentHex, backgroundHex);

  if (ratio >= minRatio) {
    return { safeColor: currentHex, actualRatio: Math.round(ratio * 100) / 100, wasAdjusted: false };
  }

  let iterations = 0;
  while (ratio < minRatio && iterations < 30) {
    currentRgb.r = Math.floor(currentRgb.r * 0.88);
    currentRgb.g = Math.floor(currentRgb.g * 0.88);
    currentRgb.b = Math.floor(currentRgb.b * 0.88);
    currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
    ratio = getContrastRatio(currentHex, backgroundHex);
    iterations++;
  }

  return { safeColor: currentHex, actualRatio: Math.round(ratio * 100) / 100, wasAdjusted: true };
}
