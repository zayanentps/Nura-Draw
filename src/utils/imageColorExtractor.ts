import { rgbToHex } from './colorConversion';

export interface ExtractedColorOptions {
  maxColors?: number;
  minDistance?: number;
  sampleMaxDim?: number;
}

interface ColorBucket {
  sumR: number;
  sumG: number;
  sumB: number;
  count: number;
}

/**
 * Extracts distinct dominant & accent hex colors (#rrggbb) from a loaded
 * HTMLImageElement, HTMLCanvasElement, or ImageBitmap.
 */
export function extractColorsFromImageElement(
  source: CanvasImageSource & {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  },
  options: ExtractedColorOptions = {}
): string[] {
  const maxColors = options.maxColors ?? 48;
  const minDistance = options.minDistance ?? 24;
  const sampleMaxDim = options.sampleMaxDim ?? 160;

  const rawW =
    Number(source.naturalWidth || source.videoWidth || source.width || 0) || 0;
  const rawH =
    Number(source.naturalHeight || source.videoHeight || source.height || 0) || 0;
  if (rawW <= 0 || rawH <= 0) return [];

  const scale = Math.min(1, sampleMaxDim / Math.max(rawW, rawH));
  const w = Math.max(1, Math.round(rawW * scale));
  const h = Math.max(1, Math.round(rawH * scale));

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  try {
    ctx.drawImage(source, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Fine 22-level-per-channel quantization preserves exact flat colors & accents
    const step = 12;
    const buckets = new Map<string, ColorBucket>();
    let opaqueCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      opaqueCount++;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const kr = Math.min(255, Math.round(r / step) * step);
      const kg = Math.min(255, Math.round(g / step) * step);
      const kb = Math.min(255, Math.round(b / step) * step);
      const key = `${kr},${kg},${kb}`;

      const existing = buckets.get(key);
      if (existing) {
        existing.sumR += r;
        existing.sumG += g;
        existing.sumB += b;
        existing.count += 1;
      } else {
        buckets.set(key, { sumR: r, sumG: g, sumB: b, count: 1 });
      }
    }

    if (opaqueCount === 0 || buckets.size === 0) return [];

    // Sort buckets by pixel count descending (most prominent colors first)
    const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
    const minNoiseCount = sorted.length > 16 ? Math.max(2, Math.floor(opaqueCount * 0.0008)) : 1;

    const picked: { r: number; g: number; b: number; hex: string }[] = [];
    const seenHex = new Set<string>();

    const tryPickPass = (thresholdDist: number, minCount: number) => {
      for (const bucket of sorted) {
        if (picked.length >= maxColors) break;
        if (bucket.count < minCount) continue;

        const r = Math.round(bucket.sumR / bucket.count);
        const g = Math.round(bucket.sumG / bucket.count);
        const b = Math.round(bucket.sumB / bucket.count);
        const hex = rgbToHex(r, g, b);
        if (seenHex.has(hex)) continue;

        const tooClose = picked.some(
          (p) => Math.hypot(p.r - r, p.g - g, p.b - b) < thresholdDist
        );
        if (!tooClose) {
          seenHex.add(hex);
          picked.push({ r, g, b, hex });
        }
      }
    };

    tryPickPass(minDistance, minNoiseCount);

    // If image only has subtle variations (e.g. monochrome gradient), relax distance slightly
    if (picked.length < 4 && sorted.length > picked.length) {
      tryPickPass(Math.max(10, Math.floor(minDistance / 2)), 1);
    }

    return picked.map((p) => p.hex);
  } catch {
    return [];
  }
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Empty image data'));
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Invalid image format'));
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load dropped image URL'));
    img.src = url;
  });
}

export async function extractColorsFromDroppedTransfer(
  dataTransfer: DataTransfer,
  options: ExtractedColorOptions = {}
): Promise<string[]> {
  const allColors: string[] = [];
  const seen = new Set<string>();
  const appendUnique = (hexes: string[]) => {
    for (const h of hexes) {
      if (!seen.has(h)) {
        seen.add(h);
        allColors.push(h);
      }
    }
  };

  // 1. Dropped local image files (PNG, JPG, WebP, GIF, BMP, SVG, etc.)
  const files = Array.from(dataTransfer.files || []);
  const imageFiles = files.filter(
    (f) =>
      f.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg|ico|avif)$/i.test(f.name)
  );

  for (const file of imageFiles) {
    try {
      const img = await loadImageFromFile(file);
      appendUnique(extractColorsFromImageElement(img, options));
    } catch {
      // Ignore unreadable image file and continue
    }
  }

  if (allColors.length > 0) {
    return allColors.slice(0, options.maxColors ?? 48);
  }

  // 2. Dragged image URL or <img src="..."> HTML from browser/assets
  const candidates: string[] = [];
  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    for (const line of uriList.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) candidates.push(trimmed);
    }
  }
  const html = dataTransfer.getData('text/html');
  if (html) {
    const srcMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (srcMatch?.[1]) candidates.push(srcMatch[1]);
  }
  const plain = dataTransfer.getData('text/plain');
  if (plain && /^(data:image\/|https?:\/\/|blob:|\/)/i.test(plain.trim())) {
    candidates.push(plain.trim());
  }

  for (const url of candidates) {
    try {
      const img = await loadImageFromUrl(url);
      appendUnique(extractColorsFromImageElement(img, options));
      if (allColors.length > 0) break;
    } catch {
      // Continue trying next candidate
    }
  }

  return allColors.slice(0, options.maxColors ?? 48);
}
