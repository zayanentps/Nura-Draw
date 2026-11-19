import * as fabric from 'fabric';

export interface CmykPlateResult {
  cyanDataUrl: string;
  magentaDataUrl: string;
  yellowDataUrl: string;
  blackDataUrl: string;
  width: number;
  height: number;
  coverage: {
    c: number;
    m: number;
    y: number;
    k: number;
  };
}

function imageDataToPngDataUrl(imgData: ImageData): string {
  const c = document.createElement('canvas');
  c.width = imgData.width;
  c.height = imgData.height;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(imgData, 0, 0);
  return c.toDataURL('image/png');
}

/**
 * Separates a selected Fabric bitmap (or rasterized object) into 4 true subtractive CMYK color plates
 * (Cyan, Magenta, Yellow, Black) preserving transparency and returning PNG data URLs + ink coverage.
 */
export async function separateObjectToCmykPlates(
  target: fabric.FabricObject
): Promise<CmykPlateResult> {
  const bounds = target.getBoundingRect();
  let desiredW = Math.max(1, bounds.width);
  let desiredH = Math.max(1, bounds.height);

  if (target.type === 'image') {
    const imgObj = target as fabric.FabricImage;
    const orig = imgObj.getOriginalSize();
    if (orig && orig.width > 0 && orig.height > 0) {
      desiredW = orig.width;
      desiredH = orig.height;
    }
  }

  // Cap processing dimension at 1400px so separation is instant and responsive in 1 click
  const maxDim = Math.max(desiredW, desiredH, 1);
  const targetMax = Math.min(1400, Math.max(300, maxDim));
  const multiplier = Math.min(
    4,
    Math.max(1, targetMax / Math.max(1, Math.max(bounds.width, bounds.height)))
  );

  const rawDataUrl = target.toDataURL({
    format: 'png',
    multiplier,
  });

  const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = (err) => reject(err);
    im.src = rawDataUrl;
  });

  const width = Math.max(1, imgEl.naturalWidth || Math.round(bounds.width * multiplier));
  const height = Math.max(1, imgEl.naturalHeight || Math.round(bounds.height * multiplier));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) {
    throw new Error('Could not initialize 2D canvas context for CMYK separation');
  }
  srcCtx.drawImage(imgEl, 0, 0, width, height);

  const srcImgData = srcCtx.getImageData(0, 0, width, height);
  const src = srcImgData.data;

  const cyanImg = srcCtx.createImageData(width, height);
  const magentaImg = srcCtx.createImageData(width, height);
  const yellowImg = srcCtx.createImageData(width, height);
  const blackImg = srcCtx.createImageData(width, height);

  const cData = cyanImg.data;
  const mData = magentaImg.data;
  const yData = yellowImg.data;
  const kData = blackImg.data;

  let sumC = 0;
  let sumM = 0;
  let sumY = 0;
  let sumK = 0;
  let opaqueCount = 0;

  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    if (a === 0) {
      cData[i + 3] = 0;
      mData[i + 3] = 0;
      yData[i + 3] = 0;
      kData[i + 3] = 0;
      continue;
    }

    const r = src[i] / 255;
    const g = src[i + 1] / 255;
    const b = src[i + 2] / 255;

    const k = 1 - Math.max(r, g, b);
    let c = 0;
    let m = 0;
    let y = 0;

    if (k < 0.9999) {
      const denom = 1 - k;
      c = Math.max(0, Math.min(1, (1 - r - k) / denom));
      m = Math.max(0, Math.min(1, (1 - g - k) / denom));
      y = Math.max(0, Math.min(1, (1 - b - k) / denom));
    }

    opaqueCount += 1;
    sumC += c;
    sumM += m;
    sumY += y;
    sumK += k;

    // Cyan plate: White (0% C) -> Pure Cyan (100% C)
    cData[i] = Math.round(255 * (1 - c));
    cData[i + 1] = 255;
    cData[i + 2] = 255;
    cData[i + 3] = a;

    // Magenta plate: White (0% M) -> Pure Magenta (100% M)
    mData[i] = 255;
    mData[i + 1] = Math.round(255 * (1 - m));
    mData[i + 2] = 255;
    mData[i + 3] = a;

    // Yellow plate: White (0% Y) -> Pure Yellow (100% Y)
    yData[i] = 255;
    yData[i + 1] = 255;
    yData[i + 2] = Math.round(255 * (1 - y));
    yData[i + 3] = a;

    // Black (Key) plate: White (0% K) -> Pure Black (100% K)
    const kByte = Math.round(255 * (1 - k));
    kData[i] = kByte;
    kData[i + 1] = kByte;
    kData[i + 2] = kByte;
    kData[i + 3] = a;
  }

  const denomCount = Math.max(1, opaqueCount);

  return {
    cyanDataUrl: imageDataToPngDataUrl(cyanImg),
    magentaDataUrl: imageDataToPngDataUrl(magentaImg),
    yellowDataUrl: imageDataToPngDataUrl(yellowImg),
    blackDataUrl: imageDataToPngDataUrl(blackImg),
    width,
    height,
    coverage: {
      c: Math.round((sumC / denomCount) * 100),
      m: Math.round((sumM / denomCount) * 100),
      y: Math.round((sumY / denomCount) * 100),
      k: Math.round((sumK / denomCount) * 100),
    },
  };
}
