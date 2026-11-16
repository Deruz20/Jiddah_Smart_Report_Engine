/**
 * REAL-TIME KYC SIGNATURE UPLOAD QUALITY VERIFIER
 *
 * Computes 3 live optical quality metrics on any uploaded or photographed signature image:
 *  1. sharpnessScore (0–100): 2D Laplacian variance blur check
 *  2. lightingUniformityScore (0–100): 4-quadrant paper background uniformity (flags dark camera shadows)
 *  3. contrastScore (0–100): Ink-to-paper separation
 */

export type InkBoldnessPreset = 'light' | 'balanced' | 'bold';

export const INK_BOLDNESS_PRESETS: {
  id: InkBoldnessPreset;
  label: string;
  value: number;
}[] = [
  { id: 'light', label: 'Light', value: 0.95 },
  { id: 'balanced', label: 'Balanced', value: 1.25 },
  { id: 'bold', label: 'Bold', value: 1.65 },
];

export interface SignatureQualityMetrics {
  sharpnessScore: number;
  lightingUniformityScore: number;
  contrastScore: number;
  overallScore: number;
  passed: boolean;
  warnings: string[];
}

function getLum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function verifySignatureImageQuality(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): SignatureQualityMetrics {
  if (width < 4 || height < 4 || rgba.length < width * height * 4) {
    return {
      sharpnessScore: 0,
      lightingUniformityScore: 0,
      contrastScore: 0,
      overallScore: 0,
      passed: false,
      warnings: ['Image dimensions are too small to analyze.'],
    };
  }

  const totalPixels = width * height;
  const lum = new Float32Array(totalPixels);
  const opaqueLums: number[] = [];

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = rgba[idx + 3];
    const l = a < 30 ? 255 : getLum(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
    lum[i] = l;
    if (a >= 30) opaqueLums.push(l);
  }

  // 1. Sharpness Score (0–100): 2D Laplacian variance over inner pixels
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 140));

  for (let y = 1; y < height - 1; y += step) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += step) {
      const c = lum[row + x];
      const lap =
        -4 * c +
        lum[row - width + x] +
        lum[row + width + x] +
        lum[row + x - 1] +
        lum[row + x + 1];
      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount++;
    }
  }

  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  const lapVariance = lapCount > 0 ? Math.max(0, lapSqSum / lapCount - lapMean * lapMean) : 0;
  const sharpnessScore = Math.min(100, Math.max(15, Math.round(Math.sqrt(lapVariance) * 3.4)));

  // 2. Lighting Uniformity Score (0–100): 4-quadrant 75th-percentile background comparison
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  const quadrants: number[][] = [[], [], [], []];

  for (let y = 0; y < height; y += step) {
    const qY = y < midY ? 0 : 2;
    for (let x = 0; x < width; x += step) {
      const qIdx = qY + (x < midX ? 0 : 1);
      quadrants[qIdx].push(lum[y * width + x]);
    }
  }

  const qBgLums = quadrants.map((arr) => {
    if (arr.length === 0) return 220;
    arr.sort((a, b) => a - b);
    return arr[Math.floor(arr.length * 0.75)] ?? 220;
  });

  const minQ = Math.min(...qBgLums);
  const maxQ = Math.max(...qBgLums);
  const spread = maxQ - minQ;
  const darkestPenalty = minQ < 160 ? (160 - minQ) * 0.35 : 0;
  const lightingUniformityScore = Math.max(
    10,
    Math.min(100, Math.round(100 - spread * 1.1 - darkestPenalty))
  );

  // 3. Contrast Score (0–100): Ink-to-paper separation
  let contrastScore = 80;
  if (opaqueLums.length > 10) {
    opaqueLums.sort((a, b) => a - b);
    const inkP03 = opaqueLums[Math.max(0, Math.floor(opaqueLums.length * 0.03))] ?? 40;
    const paperP75 = opaqueLums[Math.floor(opaqueLums.length * 0.75)] ?? 225;
    const delta = Math.max(0, paperP75 - inkP03);
    contrastScore = Math.max(15, Math.min(100, Math.round((delta / 135) * 100)));
  }

  const overallScore = Math.round(
    sharpnessScore * 0.3 + lightingUniformityScore * 0.35 + contrastScore * 0.35
  );

  const warnings: string[] = [];
  if (sharpnessScore < 45) {
    warnings.push('Image looks slightly blurry — hold camera steady for crisper pen edges.');
  }
  if (lightingUniformityScore < 65) {
    warnings.push('Camera shadow detected on paper — Sauvola binarization will strip the grey shadow automatically.');
  }
  if (contrastScore < 55) {
    warnings.push('Faint pen strokes detected — use "Bold" ink preset below for 100% solid Royal Blue output.');
  }

  return {
    sharpnessScore,
    lightingUniformityScore,
    contrastScore,
    overallScore,
    passed: overallScore >= 55,
    warnings,
  };
}

export async function verifySignatureFileQuality(
  file: File
): Promise<SignatureQualityMetrics> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      sharpnessScore: 90,
      lightingUniformityScore: 90,
      contrastScore: 90,
      overallScore: 90,
      passed: true,
      warnings: [],
    };
  }

  const objUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = objUrl;
    });
    const maxDim = 600;
    let w = img.naturalWidth || img.width || 1;
    let h = img.naturalHeight || img.height || 1;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.max(4, Math.round(w * s));
      h = Math.max(4, Math.round(h * s));
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    return verifySignatureImageQuality(data, w, h);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}
