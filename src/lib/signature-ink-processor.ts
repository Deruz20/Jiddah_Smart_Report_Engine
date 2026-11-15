export type SignatureInkMode = 'blue' | 'black' | 'original';

export const SIG_CACHE_VERSION = 'v5-adaptive-local';

const EMPTY_TRANSPARENT_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

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
  // Opaque bright/gray paper fills >25% of sampled grid (also handles darker shadow photos)
  if (opaqueLightPixels / sampled >= 0.25) return true;
  // Fallback for very dim shadow photos (all opaque, no transparency)
  return transparentPixels / sampled < 0.05;
}

/**
 * Extracts crisp transparent pen ink from an RGBA buffer captured on paper
 * using a fast O(1) 2D Integral Image (17x17 local neighborhood mean) + global median contrast.
 * Strips both bright white paper and dimly lit dark-grey paper shadows cleanly.
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
  const opaqueMask = new Uint8Array(totalPixels);
  const opaqueLums: number[] = [];

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = sourceRgba[idx + 3];
    if (a < 40) {
      lumBuffer[i] = 255;
      opaqueMask[i] = 0;
    } else {
      const lum = getLuminance(sourceRgba[idx], sourceRgba[idx + 1], sourceRgba[idx + 2]);
      lumBuffer[i] = lum;
      opaqueMask[i] = 1;
      opaqueLums.push(lum);
    }
  }

  if (opaqueLums.length === 0) {
    return {
      data: new Uint8ClampedArray(sourceRgba.length),
      width,
      height,
      bounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1, width, height },
      inkPixelRatio: 0,
    };
  }

  // Global median luminance across all opaque pixels (represents paper even under dim lighting)
  opaqueLums.sort((a, b) => a - b);
  const globalMedian = opaqueLums[Math.floor(opaqueLums.length * 0.5)] ?? 220;

  // Sample outer border pixels to check if this is an opaque rectangular photo needing 4px frame trim
  const borderSamples: number[] = [];
  let totalBorderPixels = 0;
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const btmIdx = ((height - 1) * width + x) * 4;
    totalBorderPixels += 2;
    if (sourceRgba[topIdx + 3] >= 40) borderSamples.push(lumBuffer[x]);
    if (sourceRgba[btmIdx + 3] >= 40) borderSamples.push(lumBuffer[(height - 1) * width + x]);
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    totalBorderPixels += 2;
    if (sourceRgba[leftIdx + 3] >= 40) borderSamples.push(lumBuffer[y * width]);
    if (sourceRgba[rightIdx + 3] >= 40) borderSamples.push(lumBuffer[y * width + (width - 1)]);
  }
  const isOpaquePhoto = totalBorderPixels > 0 && borderSamples.length / totalBorderPixels >= 0.45;

  // Build 2D Integral Images (prefix sums) for O(1) 17x17 local neighborhood mean
  const strideW = width + 1;
  const integralLum = new Float64Array(strideW * (height + 1));
  const integralCount = new Int32Array(strideW * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowLum = 0;
    let rowCnt = 0;
    const srcRow = y * width;
    const dstRow = (y + 1) * strideW;
    const prevDstRow = y * strideW;

    for (let x = 0; x < width; x++) {
      const p = srcRow + x;
      if (opaqueMask[p] === 1) {
        rowLum += lumBuffer[p];
        rowCnt += 1;
      }
      integralLum[dstRow + x + 1] = integralLum[prevDstRow + x + 1] + rowLum;
      integralCount[dstRow + x + 1] = integralCount[prevDstRow + x + 1] + rowCnt;
    }
  }

  const windowRadius = 8; // 17x17 window: [-8, +8]
  const rawAlpha = new Uint8ClampedArray(totalPixels);

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - windowRadius);
    const y1 = Math.min(height - 1, y + windowRadius);
    const r0 = y0 * strideW;
    const r1 = (y1 + 1) * strideW;

    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const srcIdx = p * 4;
      if (sourceRgba[srcIdx + 3] < 40) {
        rawAlpha[p] = 0;
        continue;
      }

      // Drop 4px outer border frame on non-transparent photos
      if (isOpaquePhoto && (x < 4 || x >= width - 4 || y < 4 || y >= height - 4)) {
        rawAlpha[p] = 0;
        continue;
      }

      const x0 = Math.max(0, x - windowRadius);
      const x1 = Math.min(width - 1, x + windowRadius);

      const sum =
        integralLum[r1 + x1 + 1] -
        integralLum[r1 + x0] -
        integralLum[r0 + x1 + 1] +
        integralLum[r0 + x0];
      const cnt =
        integralCount[r1 + x1 + 1] -
        integralCount[r1 + x0] -
        integralCount[r0 + x1 + 1] +
        integralCount[r0 + x0];

      const localMean = cnt > 0 ? sum / cnt : globalMedian;
      const lum = lumBuffer[p];
      const localContrast = localMean - lum;
      const globalContrast = globalMedian - lum;

      // Strict Paper Removal Rule: uniform paper has negligible local or global contrast
      if (localContrast < 9 || globalContrast < 10) {
        rawAlpha[p] = 0;
        continue;
      }

      // Boost stroke contrast so even faint pen lines on dark paper become bold
      const boostedAlpha = Math.min(
        255,
        Math.round((localContrast - 8) * 16 * (boldness / 1.25))
      );
      rawAlpha[p] = Math.max(0, boostedAlpha);
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
        // Royal Ballpoint Pen Blue (#0F3491 -> R=15, G=52, B=145)
        outR = Math.round(15);
        outG = Math.round(52);
        outB = Math.round(145);
      } else if (inkMode === 'black') {
        // Jet Black (#0F172A)
        outR = Math.round(24 - strength * 10);
        outG = Math.round(34 - strength * 12);
        outB = Math.round(52 - strength * 12);
      } else {
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

/**
 * Recolors an already-transparent PNG signature cleanly into Royal Blue / Black ink
 * without altering existing transparency.
 */
function recolorTransparentSignature(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  inkMode: SignatureInkMode
): Uint8ClampedArray {
  if (inkMode === 'original') return sourceRgba;
  const out = new Uint8ClampedArray(sourceRgba.length);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const a = sourceRgba[idx + 3];
    if (a < 20) continue;
    out[idx] = inkMode === 'blue' ? 15 : 15;
    out[idx + 1] = inkMode === 'blue' ? 52 : 23;
    out[idx + 2] = inkMode === 'blue' ? 145 : 42;
    out[idx + 3] = Math.min(255, Math.round(a * 1.15));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Browser Canvas Wrappers, CORS-Safe Fetch & URL Cache
// ---------------------------------------------------------------------------

const MAX_PROCESSING_DIM = 900;
export const processedSignatureCache = new Map<string, string>();
const cleanedUrlCache = processedSignatureCache;

function loadBrowserImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function loadSignatureImageSafe(src: string): Promise<HTMLImageElement> {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return loadBrowserImage(src);
  }

  // Try direct CORS fetch -> Blob URL (avoids browser non-CORS cache poisoning)
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      try {
        const img = await loadBrowserImage(objUrl);
        return img;
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    }
  } catch {
    // Fall through to same-origin authenticated proxy
  }

  // Fallback: fetch through /api/signatures/proxy so remote images never taint canvas
  if (typeof window !== 'undefined' && /^https?:\/\//i.test(src)) {
    try {
      const proxyUrl = `/api/signatures/proxy?url=${encodeURIComponent(src)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        const objUrl = URL.createObjectURL(blob);
        try {
          const img = await loadBrowserImage(objUrl);
          return img;
        } finally {
          URL.revokeObjectURL(objUrl);
        }
      }
    } catch {
      // Fall through to direct crossOrigin attempt
    }
  }

  return loadBrowserImage(src, 'anonymous');
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

export const inFlightSignaturePromises = new Map<string, Promise<string>>();

export function getCachedSignatureUrl(
  src: string,
  options: SignatureExtractionOptions = {}
): string | undefined {
  if (!src) return undefined;
  const cacheKey = `${SIG_CACHE_VERSION}|${src}|${options.inkMode ?? 'blue'}|${options.boldness ?? 1.25}`;
  return cleanedUrlCache.get(cacheKey);
}

export async function cleanSignatureImageUrl(
  src: string,
  options: SignatureExtractionOptions = {}
): Promise<string> {
  if (!src || typeof window === 'undefined' || typeof document === 'undefined') return src;

  const cacheKey = `${SIG_CACHE_VERSION}|${src}|${options.inkMode ?? 'blue'}|${options.boldness ?? 1.25}`;
  const cached = cleanedUrlCache.get(cacheKey);
  if (cached) return cached;

  const inFlight = inFlightSignaturePromises.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const img = await loadSignatureImageSafe(src);
      const { rgba, width, height } = imageElementToCanvasData(img);

      // Already alpha-transparent PNG: normalize ink tone without subtracting background
      if (!hasOpaquePaperBackground(rgba, width, height)) {
        const recolored = recolorTransparentSignature(rgba, width, height, options.inkMode ?? 'blue');
        const { dataUrl } = await rgbaToPngBlobAndDataUrl(recolored, width, height);
        cleanedUrlCache.set(cacheKey, dataUrl);
        return dataUrl;
      }

      // Photographed/scanned signature on white or dark-grey paper: extract locally & never return raw grey src
      const extracted = extractCleanSignaturePixels(rgba, width, height, options);
      if (extracted.width === 0 || extracted.height === 0 || extracted.inkPixelRatio === 0) {
        cleanedUrlCache.set(cacheKey, EMPTY_TRANSPARENT_PNG_DATA_URL);
        return EMPTY_TRANSPARENT_PNG_DATA_URL;
      }

      const { dataUrl } = await rgbaToPngBlobAndDataUrl(extracted.data, extracted.width, extracted.height);
      cleanedUrlCache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch {
      return src;
    }
  })().finally(() => {
    inFlightSignaturePromises.delete(cacheKey);
  });

  inFlightSignaturePromises.set(cacheKey, promise);
  return promise;
}
