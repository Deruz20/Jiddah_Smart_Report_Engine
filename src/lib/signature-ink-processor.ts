export type SignatureInkMode = 'blue' | 'black' | 'original';

export interface SignatureExtractionOptions {
  inkMode?: SignatureInkMode;
  boldness?: number;
  marginPx?: number;
}

export interface SignatureCropBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ExtractedSignatureResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  bounds: SignatureCropBounds;
  inkPixelRatio: number;
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Inspects outer border pixels and overall alpha distribution to detect whether
 * an image still has an opaque paper/scanner background that should be extracted.
 */
export function hasOpaquePaperBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): boolean {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) return false;

  let sampled = 0;
  let opaqueLightPixels = 0;
  let transparentPixels = 0;

  const stepX = Math.max(1, Math.floor(width / 24));
  const stepY = Math.max(1, Math.floor(height / 24));

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const idx = (y * width + x) * 4;
      const alpha = rgba[idx + 3];
      sampled++;
      if (alpha < 24) {
        transparentPixels++;
      } else {
        const lum = getLuminance(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
        if (lum >= 85) {
          opaqueLightPixels++;
        }
      }
    }
  }

  if (sampled === 0) return false;
  // Already an alpha-transparent PNG with minimal background fill
  if (transparentPixels / sampled >= 0.32) return false;
  // Opaque bright/gray paper fills >30% of sampled grid
  return opaqueLightPixels / sampled >= 0.25;
}

/**
 * Extracts crisp transparent pen ink from an RGBA buffer captured on paper,
 * handling shadows, uneven phone lighting, grey paper, and light ruled lines.
 */
export function extractCleanSignaturePixels(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: SignatureExtractionOptions = {}
): ExtractedSignatureResult {
  const inkMode: SignatureInkMode = options.inkMode ?? 'blue';
  const boldness = Math.max(0.6, Math.min(2.0, options.boldness ?? 1.25));
  const marginPx = Math.max(0, Math.min(16, Math.round(options.marginPx ?? 4)));

  if (width <= 0 || height <= 0 || sourceRgba.length < width * height * 4) {
    return {
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      inkPixelRatio: 0,
    };
  }

  const totalPixels = width * height;
  const lumBuffer = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = sourceRgba[idx + 3];
    lumBuffer[i] = a < 20 ? 255 : getLuminance(sourceRgba[idx], sourceRgba[idx + 1], sourceRgba[idx + 2]);
  }

  // Build coarse illumination grid using 80th percentile per block to handle uneven lighting
  const targetCellSize = Math.min(32, Math.max(8, Math.round(Math.min(width, height) / 3)));
  const gridCols = Math.max(2, Math.min(20, Math.ceil(width / targetCellSize)));
  const gridRows = Math.max(2, Math.min(20, Math.ceil(height / targetCellSize)));
  const cellBg = new Float32Array(gridCols * gridRows);

  for (let gy = 0; gy < gridRows; gy++) {
    const y0 = Math.floor((gy * height) / gridRows);
    const y1 = Math.min(height, Math.ceil(((gy + 1) * height) / gridRows));
    for (let gx = 0; gx < gridCols; gx++) {
      const x0 = Math.floor((gx * width) / gridCols);
      const x1 = Math.min(width, Math.ceil(((gx + 1) * width) / gridCols));

      const samples: number[] = [];
      const stride = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 96)));
      for (let y = y0; y < y1; y += stride) {
        for (let x = x0; x < x1; x += stride) {
          samples.push(lumBuffer[y * width + x]);
        }
      }

      if (samples.length === 0) {
        cellBg[gy * gridCols + gx] = 245;
      } else {
        samples.sort((a, b) => a - b);
        const p80 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.8))];
        cellBg[gy * gridCols + gx] = Math.max(95, p80);
      }
    }
  }

  // Smooth the illumination grid slightly so tile seams never create halos
  const smoothedBg = new Float32Array(gridCols * gridRows);
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      let sum = 0;
      let weight = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = gy + dy;
          const nx = gx + dx;
          if (ny >= 0 && ny < gridRows && nx >= 0 && nx < gridCols) {
            const w = dx === 0 && dy === 0 ? 4 : 1;
            sum += cellBg[ny * gridCols + nx] * w;
            weight += w;
          }
        }
      }
      smoothedBg[gy * gridCols + gx] = sum / Math.max(1, weight);
    }
  }

  // Sample outer border pixels for global adaptive paper-background luminance (bgLum)
  const borderSamples: number[] = [];
  for (let x = 0; x < width; x++) {
    borderSamples.push(lumBuffer[x], lumBuffer[(height - 1) * width + x]);
  }
  for (let y = 0; y < height; y++) {
    borderSamples.push(lumBuffer[y * width], lumBuffer[y * width + (width - 1)]);
  }
  borderSamples.sort((a, b) => a - b);
  const bgLum = borderSamples.length > 0
    ? Math.max(95, borderSamples[Math.min(borderSamples.length - 1, Math.floor(borderSamples.length * 0.85))])
    : 240;

  const rawAlpha = new Uint8ClampedArray(totalPixels);

  for (let y = 0; y < height; y++) {
    const fy = ((y + 0.5) / height) * gridRows - 0.5;
    const gy0 = Math.max(0, Math.min(gridRows - 1, Math.floor(fy)));
    const gy1 = Math.max(0, Math.min(gridRows - 1, gy0 + 1));
    const ty = Math.max(0, Math.min(1, fy - gy0));

    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const srcIdx = p * 4;
      if (sourceRgba[srcIdx + 3] < 20) {
        rawAlpha[p] = 0;
        continue;
      }

      const fx = ((x + 0.5) / width) * gridCols - 0.5;
      const gx0 = Math.max(0, Math.min(gridCols - 1, Math.floor(fx)));
      const gx1 = Math.max(0, Math.min(gridCols - 1, gx0 + 1));
      const tx = Math.max(0, Math.min(1, fx - gx0));

      const top =
        smoothedBg[gy0 * gridCols + gx0] * (1 - tx) +
        smoothedBg[gy0 * gridCols + gx1] * tx;
      const bottom =
        smoothedBg[gy1 * gridCols + gx0] * (1 - tx) +
        smoothedBg[gy1 * gridCols + gx1] * tx;
      const localBg = top * (1 - ty) + bottom * ty;

      const paperThreshold = localBg - 28;
      const lum = lumBuffer[p];
      if (lum >= paperThreshold) {
        rawAlpha[p] = 0;
        continue;
      }

      const inkDepth = paperThreshold - lum;
      const boostFactor = 45 / Math.max(0.75, boldness * 0.9);
      rawAlpha[p] = Math.min(255, Math.round((inkDepth / boostFactor) * 255));
    }
  }

  // Gentle despeckle + edge anti-aliasing
  const finalRgba = new Uint8ClampedArray(sourceRgba.length);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inkPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const cAlpha = rawAlpha[p];
      if (cAlpha === 0) continue;

      let activeNeighbors = 0;
      let neighborAlphaSum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const na = rawAlpha[ny * width + nx];
            if (na > 12) activeNeighbors++;
            neighborAlphaSum += na;
          }
        }
      }

      // Drop isolated 1px noise grains
      if (activeNeighbors === 0 && cAlpha < 210) {
        continue;
      }

      const smoothedAlpha =
        cAlpha < 210
          ? Math.min(255, Math.round(cAlpha * 0.72 + (neighborAlphaSum / 8) * 0.28))
          : cAlpha;

      if (smoothedAlpha < 12) continue;

      const idx = p * 4;
      const strength = smoothedAlpha / 255;

      let outR: number;
      let outG: number;
      let outB: number;

      if (inkMode === 'blue') {
        // Pen Blue (#14387F) with slight stroke depth richness
        outR = Math.round(24 - strength * 8);
        outG = Math.round(64 - strength * 12);
        outB = Math.round(138 - strength * 16);
      } else if (inkMode === 'black') {
        // Jet Black (#0F172A)
        outR = Math.round(24 - strength * 10);
        outG = Math.round(34 - strength * 12);
        outB = Math.round(52 - strength * 12);
      } else {
        // Original ink hue preserved, deepened slightly for clean crisp contrast
        const srcR = sourceRgba[idx];
        const srcG = sourceRgba[idx + 1];
        const srcB = sourceRgba[idx + 2];
        const darken = 0.78;
        outR = Math.max(0, Math.min(255, Math.round(srcR * darken)));
        outG = Math.max(0, Math.min(255, Math.round(srcG * darken)));
        outB = Math.max(0, Math.min(255, Math.round(srcB * darken)));
      }

      finalRgba[idx] = outR;
      finalRgba[idx + 1] = outG;
      finalRgba[idx + 2] = outB;
      finalRgba[idx + 3] = smoothedAlpha;

      inkPixels++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      data: finalRgba,
      width,
      height,
      bounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1, width, height },
      inkPixelRatio: 0,
    };
  }

  const cropMinX = Math.max(0, minX - marginPx);
  const cropMinY = Math.max(0, minY - marginPx);
  const cropMaxX = Math.min(width - 1, maxX + marginPx);
  const cropMaxY = Math.min(height - 1, maxY + marginPx);
  const cropWidth = cropMaxX - cropMinX + 1;
  const cropHeight = cropMaxY - cropMinY + 1;

  const cropped = new Uint8ClampedArray(cropWidth * cropHeight * 4);
  for (let cy = 0; cy < cropHeight; cy++) {
    const srcStart = ((cropMinY + cy) * width + cropMinX) * 4;
    const dstStart = cy * cropWidth * 4;
    cropped.set(finalRgba.subarray(srcStart, srcStart + cropWidth * 4), dstStart);
  }

  return {
    data: cropped,
    width: cropWidth,
    height: cropHeight,
    bounds: {
      minX: cropMinX,
      minY: cropMinY,
      maxX: cropMaxX,
      maxY: cropMaxY,
      width: cropWidth,
      height: cropHeight,
    },
    inkPixelRatio: inkPixels / totalPixels,
  };
}

// ---------------------------------------------------------------------------
// Browser Canvas Wrappers & URL Cache
// ---------------------------------------------------------------------------

const MAX_PROCESSING_DIM = 900;
const cleanedUrlCache = new Map<string, string>();

function loadBrowserImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function imageElementToCanvasData(img: HTMLImageElement): {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, MAX_PROCESSING_DIM / Math.max(natW, natH));
  const width = Math.max(1, Math.round(natW * scale));
  const height = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { rgba: imageData.data, width, height };
}

function rgbaToPngBlobAndDataUrl(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable.'));
      return;
    }

    if (width > 0 && height > 0 && rgba.length === width * height * 4) {
      const imgData = new ImageData(new Uint8ClampedArray(rgba), width, height);
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode cleaned PNG.'));
          return;
        }
        resolve({ dataUrl, blob });
      },
      'image/png',
      1
    );
  });
}

export async function processSignatureFileToPng(
  file: File | Blob,
  options: SignatureExtractionOptions = {}
): Promise<{
  file: File;
  cleanedDataUrl: string;
  originalDataUrl: string;
  width: number;
  height: number;
  inkPixelRatio: number;
}> {
  const originalObjectUrl = URL.createObjectURL(file);
  try {
    const img = await loadBrowserImage(originalObjectUrl);
    const { rgba, width, height } = imageElementToCanvasData(img);
    const extracted = extractCleanSignaturePixels(rgba, width, height, options);

    const outW = extracted.width || width;
    const outH = extracted.height || height;
    const outRgba = extracted.width > 0 ? extracted.data : rgba;
    const { dataUrl, blob } = await rgbaToPngBlobAndDataUrl(outRgba, outW, outH);

    const baseName = file instanceof File ? file.name.replace(/\.[^.]+$/, '') : 'signature';
    const processedFile = new File([blob], `${baseName}-clean.png`, { type: 'image/png' });

    const originalDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    return {
      file: processedFile,
      cleanedDataUrl: dataUrl,
      originalDataUrl,
      width: outW,
      height: outH,
      inkPixelRatio: extracted.inkPixelRatio,
    };
  } finally {
    URL.revokeObjectURL(originalObjectUrl);
  }
}

export async function cleanSignatureImageUrl(
  src: string,
  options: SignatureExtractionOptions = {}
): Promise<string> {
  if (!src || typeof window === 'undefined' || typeof document === 'undefined') return src;

  const cacheKey = `${src}|${options.inkMode ?? 'blue'}|${options.boldness ?? 1.25}`;
  const cached = cleanedUrlCache.get(cacheKey);
  if (cached) return cached;

  try {
    const img = await loadBrowserImage(src, 'anonymous');
    const { rgba, width, height } = imageElementToCanvasData(img);

    if (!hasOpaquePaperBackground(rgba, width, height)) {
      cleanedUrlCache.set(cacheKey, src);
      return src;
    }

    const extracted = extractCleanSignaturePixels(rgba, width, height, options);
    if (extracted.width === 0 || extracted.height === 0 || extracted.inkPixelRatio < 0.0005) {
      cleanedUrlCache.set(cacheKey, src);
      return src;
    }

    const { dataUrl } = await rgbaToPngBlobAndDataUrl(extracted.data, extracted.width, extracted.height);
    cleanedUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    return src;
  }
}
