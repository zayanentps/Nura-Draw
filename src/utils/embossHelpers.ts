import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';
import { normalizeHex, rgbToHex } from './colorConversion';

export type EmbossColorMode = 'original' | 'gray' | 'black' | 'other';

export interface EmbossParams {
  enabled: boolean;
  depth: number; // 1..20 px
  level: number; // 0..500 %
  direction: number; // 0..360 deg (45 = top-right)
  colorMode: EmbossColorMode;
  otherColor: string;
}

export const DEFAULT_EMBOSS_PARAMS: EmbossParams = {
  enabled: true,
  depth: 4,
  level: 100,
  direction: 45,
  colorMode: 'gray',
  otherColor: '#ffffff',
};

const sourceCanvasCache = new Map<string, HTMLCanvasElement>();
const inFlightConversion = new WeakMap<fabric.FabricObject, Promise<fabric.FabricObject>>();

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function parseHexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex) || '#ffffff';
  const clean = norm.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

export function sanitizeEmbossParams(raw?: Partial<EmbossParams> | null): EmbossParams {
  const depthRaw = Number(raw?.depth);
  const levelRaw = Number(raw?.level);
  const dirRaw = Number(raw?.direction);
  const colorMode: EmbossColorMode =
    raw?.colorMode === 'original' ||
    raw?.colorMode === 'gray' ||
    raw?.colorMode === 'black' ||
    raw?.colorMode === 'other'
      ? raw.colorMode
      : DEFAULT_EMBOSS_PARAMS.colorMode;

  const dirNormalized = Number.isFinite(dirRaw)
    ? ((Math.round(dirRaw) % 360) + 360) % 360
    : DEFAULT_EMBOSS_PARAMS.direction;

  return {
    enabled: raw?.enabled !== undefined ? Boolean(raw.enabled) : DEFAULT_EMBOSS_PARAMS.enabled,
    depth: Number.isFinite(depthRaw)
      ? Math.max(1, Math.min(20, Math.round(depthRaw)))
      : DEFAULT_EMBOSS_PARAMS.depth,
    level: Number.isFinite(levelRaw)
      ? Math.max(0, Math.min(500, Math.round(levelRaw)))
      : DEFAULT_EMBOSS_PARAMS.level,
    direction: dirNormalized,
    colorMode,
    otherColor: normalizeHex(raw?.otherColor || '') || DEFAULT_EMBOSS_PARAMS.otherColor,
  };
}

export function applyEmbossToCanvas(
  srcCanvas: HTMLCanvasElement,
  rawParams: Partial<EmbossParams>
): HTMLCanvasElement {
  const params = sanitizeEmbossParams(rawParams);
  const w = Math.max(1, srcCanvas.width);
  const h = Math.max(1, srcCanvas.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(srcCanvas, 0, 0);

  if (!params.enabled) {
    return out;
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const orig = new Uint8ClampedArray(data);

  // Precompute alpha-weighted luminance for fast directional multi-tap emboss
  const lumBuf = new Float32Array(w * h);
  for (let i = 0, p = 0; i < orig.length; i += 4, p++) {
    const a = orig[i + 3] / 255;
    lumBuf[p] = (0.299 * orig[i] + 0.587 * orig[i + 1] + 0.114 * orig[i + 2]) * a;
  }

  const rad = (params.direction * Math.PI) / 180;
  // Screen space: 0 deg = right (+x), 90 deg = up (-y), 45 deg = top-right
  const lx = Math.cos(rad);
  const ly = -Math.sin(rad);

  const depth = Math.max(1, params.depth);
  const tapCount = Math.min(8, depth);
  const tapOffsetsX = new Float32Array(tapCount);
  const tapOffsetsY = new Float32Array(tapCount);
  for (let t = 0; t < tapCount; t++) {
    const dist = tapCount === 1 ? 1 : 1 + (t / (tapCount - 1)) * (depth - 1);
    tapOffsetsX[t] = lx * dist;
    tapOffsetsY[t] = ly * dist;
  }

  // Normalize gain so increasing Depth thickens the bevel without blowing out brightness,
  // while Level scales contrast cleanly (100% = crisp classic emboss).
  const gain = (params.level / 100) * (1.15 / Math.sqrt(tapCount));
  const [otherR, otherG, otherB] = parseHexToRgb(params.otherColor);

  const sampleLum = (fx: number, fy: number): number => {
    const ix = fx < 0 ? 0 : fx >= w - 1 ? w - 1 : Math.round(fx);
    const iy = fy < 0 ? 0 : fy >= h - 1 ? h - 1 : Math.round(fy);
    return lumBuf[iy * w + ix];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (orig[idx + 3] === 0) continue;

      let diffSum = 0;
      for (let t = 0; t < tapCount; t++) {
        const ox = tapOffsetsX[t];
        const oy = tapOffsetsY[t];
        // Light comes from (+ox, +oy); lit face has lower outside lum towards light and higher inside lum away
        const lumTowards = sampleLum(x + ox, y + oy);
        const lumAway = sampleLum(x - ox, y - oy);
        diffSum += lumAway - lumTowards;
      }

      const delta = diffSum * gain;

      if (params.colorMode === 'original') {
        data[idx] = clamp255(orig[idx] + delta);
        data[idx + 1] = clamp255(orig[idx + 1] + delta);
        data[idx + 2] = clamp255(orig[idx + 2] + delta);
      } else if (params.colorMode === 'gray') {
        const v = clamp255(128 + delta);
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
      } else if (params.colorMode === 'black') {
        const v = clamp255(delta);
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
      } else {
        data[idx] = clamp255(otherR + delta);
        data[idx + 1] = clamp255(otherG + delta);
        data[idx + 2] = clamp255(otherB + delta);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return out;
}

export function extractTargetEmbossForUi(target: fabric.FabricObject | null): {
  hasEmboss: boolean;
  params: EmbossParams;
} {
  if (!target) {
    return { hasEmboss: false, params: { ...DEFAULT_EMBOSS_PARAMS } };
  }
  const cfg = (target as any).embossConfig as Partial<EmbossParams> | undefined;
  if (!cfg) {
    return { hasEmboss: false, params: { ...DEFAULT_EMBOSS_PARAMS } };
  }
  return {
    hasEmboss: true,
    params: sanitizeEmbossParams(cfg),
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function getSourceCanvasForTarget(
  target: fabric.FabricObject
): Promise<{ sourceId: string; sourceDataUrl: string; srcCanvas: HTMLCanvasElement }> {
  const anyObj = target as any;
  let sourceId = typeof anyObj.embossSourceId === 'string' ? anyObj.embossSourceId : '';
  let sourceDataUrl =
    typeof anyObj.embossSourceDataUrl === 'string' ? anyObj.embossSourceDataUrl : '';

  if (sourceId && sourceCanvasCache.has(sourceId)) {
    return {
      sourceId,
      sourceDataUrl,
      srcCanvas: sourceCanvasCache.get(sourceId)!,
    };
  }

  if (!sourceDataUrl) {
    sourceDataUrl = target.toDataURL({
      format: 'png',
      multiplier: 1,
      withoutShadow: true,
      enableRetinaScaling: false,
    });
  }

  if (!sourceId) {
    sourceId = `emb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const img = await loadImageElement(sourceDataUrl);
  const c = document.createElement('canvas');
  c.width = Math.max(1, img.width);
  c.height = Math.max(1, img.height);
  const cx = c.getContext('2d')!;
  cx.drawImage(img, 0, 0);
  sourceCanvasCache.set(sourceId, c);

  return { sourceId, sourceDataUrl, srcCanvas: c };
}

export async function applyEmbossParamsToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  rawParams: Partial<EmbossParams>
): Promise<fabric.FabricObject> {
  const params = sanitizeEmbossParams(rawParams);
  const existingFlight = inFlightConversion.get(target);
  if (existingFlight) {
    const resolved = await existingFlight;
    return applyEmbossParamsToTarget(canvas, resolved, params);
  }

  const anyTarget = target as any;

  // If this object is already an embossed FabricImage, update its element in-place for zero flicker
  if (target.type === 'image' && anyTarget.embossSourceDataUrl) {
    const { sourceId, sourceDataUrl, srcCanvas } = await getSourceCanvasForTarget(target);
    const outCanvas = applyEmbossToCanvas(srcCanvas, params);
    const imgTarget = target as fabric.FabricImage;
    imgTarget.setElement(outCanvas);
    imgTarget.set({
      dirty: true,
      objectCaching: false,
    });
    anyTarget.embossSourceId = sourceId;
    anyTarget.embossSourceDataUrl = sourceDataUrl;
    anyTarget.embossConfig = { ...params };
    anyTarget.hasEffects = params.enabled;
    imgTarget.setCoords();
    canvas.requestRenderAll();
    return imgTarget;
  }

  const conversionPromise = (async (): Promise<fabric.FabricObject> => {
    // First time embossing this target: capture clean snapshot + preEmbossObjectJson backup
    let preEmbossObjectJson: any = null;
    if (target.type !== 'activeselection') {
      try {
        preEmbossObjectJson = target.toObject(['id', 'name', 'customType', 'isCurve', 'nodeTypes']);
      } catch {
        preEmbossObjectJson = null;
      }
    }

    const bound = target.getBoundingRect();
    const { sourceId, sourceDataUrl, srcCanvas } = await getSourceCanvasForTarget(target);
    const outCanvas = applyEmbossToCanvas(srcCanvas, params);

    const origIndex =
      target.type === 'activeselection'
        ? Math.max(0, canvas.getObjects().indexOf((target as fabric.ActiveSelection).getObjects()[0]))
        : Math.max(0, canvas.getObjects().indexOf(target));

    const origId = anyTarget.id;
    const origName = anyTarget.name || 'Embossed Object';

    const imgObj = new fabric.FabricImage(outCanvas, {
      left: bound.left,
      top: bound.top,
      scaleX: bound.width / Math.max(1, outCanvas.width),
      scaleY: bound.height / Math.max(1, outCanvas.height),
      originX: 'left',
      originY: 'top',
      objectCaching: false,
    });

    const anyNew = imgObj as any;
    anyNew.embossSourceId = sourceId;
    anyNew.embossSourceDataUrl = sourceDataUrl;
    anyNew.embossConfig = { ...params };
    anyNew.preEmbossObjectJson = preEmbossObjectJson;
    anyNew.hasEffects = params.enabled;
    if (origId) anyNew.id = origId;
    anyNew.name = origName.includes('Emboss') ? origName : `${origName} (Emboss)`;
    ensureObjectId(imgObj, anyNew.name);
    disableObjectCaching(imgObj);

    if (target.type === 'activeselection') {
      const items = [...(target as fabric.ActiveSelection).getObjects()];
      canvas.discardActiveObject();
      items.forEach((o) => canvas.remove(o));
    } else {
      canvas.discardActiveObject();
      canvas.remove(target);
    }

    canvas.add(imgObj);
    if (typeof canvas.moveObjectTo === 'function') {
      canvas.moveObjectTo(imgObj, Math.min(origIndex, Math.max(0, canvas.getObjects().length - 1)));
    }
    canvas.setActiveObject(imgObj);
    imgObj.setCoords();
    canvas.requestRenderAll();
    return imgObj;
  })();

  inFlightConversion.set(target, conversionPromise);
  try {
    return await conversionPromise;
  } finally {
    inFlightConversion.delete(target);
  }
}

export async function removeEmbossFromTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): Promise<fabric.FabricObject> {
  const anyTarget = target as any;
  if (!anyTarget.embossConfig && !anyTarget.embossSourceDataUrl) {
    return target;
  }

  const origIndex = Math.max(0, canvas.getObjects().indexOf(target));
  const curBound = target.getBoundingRect();

  // Restore original vector/text/group object if we saved preEmbossObjectJson
  if (anyTarget.preEmbossObjectJson) {
    try {
      const restoredList = await fabric.util.enlivenObjects([anyTarget.preEmbossObjectJson]);
      const restored = restoredList[0] as fabric.FabricObject | undefined;
      if (restored) {
        // Align restored object to current position/size in case the embossed object was moved/resized
        const prevBound = restored.getBoundingRect();
        if (prevBound.width > 1 && prevBound.height > 1) {
          const curCenter = new fabric.Point(
            curBound.left + curBound.width / 2,
            curBound.top + curBound.height / 2
          );
          restored.setPositionByOrigin(curCenter, 'center', 'center');
        }
        disableObjectCaching(restored);
        canvas.discardActiveObject();
        canvas.remove(target);
        canvas.add(restored);
        if (typeof canvas.moveObjectTo === 'function') {
          canvas.moveObjectTo(
            restored,
            Math.min(origIndex, Math.max(0, canvas.getObjects().length - 1))
          );
        }
        canvas.setActiveObject(restored);
        restored.setCoords();
        canvas.requestRenderAll();
        return restored;
      }
    } catch {
      // Fallback to un-embossed raster snapshot
    }
  }

  if (target.type === 'image' && anyTarget.embossSourceDataUrl) {
    const { srcCanvas } = await getSourceCanvasForTarget(target);
    const imgTarget = target as fabric.FabricImage;
    imgTarget.setElement(srcCanvas);
    delete anyTarget.embossConfig;
    delete anyTarget.embossSourceDataUrl;
    delete anyTarget.embossSourceId;
    delete anyTarget.preEmbossObjectJson;
    anyTarget.hasEffects = false;
    imgTarget.set({ dirty: true });
    imgTarget.setCoords();
    canvas.requestRenderAll();
    return imgTarget;
  }

  return target;
}

export function sampleCanvasPixelHex(
  srcCanvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  displayElement: HTMLElement
): string | null {
  const rect = displayElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const rx = Math.max(0, Math.min(srcCanvas.width - 1, Math.floor(((clientX - rect.left) / rect.width) * srcCanvas.width)));
  const ry = Math.max(0, Math.min(srcCanvas.height - 1, Math.floor(((clientY - rect.top) / rect.height) * srcCanvas.height)));
  const ctx = srcCanvas.getContext('2d');
  if (!ctx) return null;
  const px = ctx.getImageData(rx, ry, 1, 1).data;
  return rgbToHex(px[0], px[1], px[2]);
}
