import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export type BlendColorMode = 'direct' | 'clockwise' | 'counterclockwise';

export interface BlendParams {
  steps: number;
  colorMode: BlendColorMode;
  accelObject: number; // -100..100 (0 = uniform)
  accelColor: number; // -100..100 (0 = uniform)
}

export interface BlendConfigMeta {
  blendId: string;
  sourceId: string;
  targetId: string;
  params: BlendParams;
}

export interface ResolvedBlendGroup {
  blendId: string;
  source: fabric.FabricObject;
  target: fabric.FabricObject;
  params: BlendParams;
  stepObjects: fabric.FabricObject[];
}

export const DEFAULT_BLEND_PARAMS: BlendParams = {
  steps: 20,
  colorMode: 'direct',
  accelObject: 0,
  accelColor: 0,
};

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  silver: '#c0c0c0',
};

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColorRgba(color: unknown): RgbaColor | null {
  if (typeof color !== 'string') return null;
  const raw = color.trim().toLowerCase();
  if (!raw || raw === 'transparent' || raw === 'none') return null;
  const s = NAMED_COLORS[raw] || raw;

  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1])))),
      g: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2])))),
      b: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3])))),
      a: rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4]))) : 1,
    };
  }

  return null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

function formatRgbaOrHex(r: number, g: number, b: number, a: number): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));
  const ca = Math.max(0, Math.min(1, a));
  if (ca >= 0.999) {
    const hex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${hex(cr)}${hex(cg)}${hex(cb)}`;
  }
  return `rgba(${cr}, ${cg}, ${cb}, ${Number(ca.toFixed(3))})`;
}

export function interpolateBlendColor(
  fromColor: unknown,
  toColor: unknown,
  t: number,
  mode: BlendColorMode = 'direct'
): string {
  const clamped = Math.max(0, Math.min(1, t));
  const c1 = parseColorRgba(fromColor);
  const c2 = parseColorRgba(toColor);

  if (!c1 && !c2) return 'transparent';
  if (!c1 && c2) {
    return formatRgbaOrHex(c2.r, c2.g, c2.b, c2.a * clamped);
  }
  if (c1 && !c2) {
    return formatRgbaOrHex(c1.r, c1.g, c1.b, c1.a * (1 - clamped));
  }

  const a1 = c1!;
  const a2 = c2!;
  const alpha = a1.a + (a2.a - a1.a) * clamped;

  if (mode === 'direct') {
    const r = a1.r + (a2.r - a1.r) * clamped;
    const g = a1.g + (a2.g - a1.g) * clamped;
    const b = a1.b + (a2.b - a1.b) * clamped;
    return formatRgbaOrHex(r, g, b, alpha);
  }

  const hsl1 = rgbToHsl(a1.r, a1.g, a1.b);
  const hsl2 = rgbToHsl(a2.r, a2.g, a2.b);
  let dh = hsl2.h - hsl1.h;
  if (mode === 'clockwise') {
    if (dh < 0) dh += 360;
  } else {
    if (dh > 0) dh -= 360;
  }
  const h = hsl1.h + dh * clamped;
  const s = hsl1.s + (hsl2.s - hsl1.s) * clamped;
  const l = hsl1.l + (hsl2.l - hsl1.l) * clamped;
  const rgb = hslToRgb(h, s, l);
  return formatRgbaOrHex(rgb.r, rgb.g, rgb.b, alpha);
}

function applyAcceleration(t: number, accel: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  if (!accel) return clampedT;
  const exp = Math.pow(2, Math.max(-100, Math.min(100, accel)) / 50);
  return Math.pow(clampedT, exp);
}

export function resolveBlendGroup(
  canvas: fabric.Canvas | null,
  obj: fabric.FabricObject | null
): ResolvedBlendGroup | null {
  if (!canvas || !obj) return null;
  const objects = canvas.getObjects();

  let blendId: string | undefined = (obj as any).isBlendStep
    ? (obj as any).blendId
    : (obj as any).blendConfig?.blendId;

  let sourceId: string | undefined = (obj as any).isBlendStep
    ? (obj as any).blendSourceId
    : (obj as any).blendConfig?.sourceId;

  let targetId: string | undefined = (obj as any).isBlendStep
    ? (obj as any).blendTargetId
    : (obj as any).blendConfig?.targetId;

  if (!blendId) return null;

  const source = objects.find((o) => (o as any).id === sourceId && !(o as any).isBlendStep);
  const target = objects.find((o) => (o as any).id === targetId && !(o as any).isBlendStep);
  if (!source || !target || source === target) return null;

  const cfg: BlendConfigMeta | undefined =
    (source as any).blendConfig || (target as any).blendConfig;
  const stepObjects = objects.filter(
    (o) => (o as any).isBlendStep && (o as any).blendId === blendId
  );

  return {
    blendId,
    source,
    target,
    params: {
      steps: Math.max(1, Math.min(50, Math.round(cfg?.params?.steps ?? DEFAULT_BLEND_PARAMS.steps))),
      colorMode: cfg?.params?.colorMode ?? DEFAULT_BLEND_PARAMS.colorMode,
      accelObject: cfg?.params?.accelObject ?? DEFAULT_BLEND_PARAMS.accelObject,
      accelColor: cfg?.params?.accelColor ?? DEFAULT_BLEND_PARAMS.accelColor,
    },
    stepObjects,
  };
}

export function removeBlendByObject(
  canvas: fabric.Canvas,
  obj: fabric.FabricObject | null
): { removed: number; source: fabric.FabricObject | null; target: fabric.FabricObject | null } {
  if (!obj) return { removed: 0, source: null, target: null };
  const resolved = resolveBlendGroup(canvas, obj);
  const blendId = resolved?.blendId || (obj as any).blendId || (obj as any).blendConfig?.blendId;
  if (!blendId) return { removed: 0, source: null, target: null };

  const toRemove = canvas
    .getObjects()
    .filter((o) => (o as any).isBlendStep && (o as any).blendId === blendId);
  for (const s of toRemove) {
    canvas.remove(s);
  }

  if (resolved?.source) {
    delete (resolved.source as any).blendConfig;
    (resolved.source as any).hasEffects = !!(resolved.source.shadow || (resolved.source as any).contourConfig);
  }
  if (resolved?.target) {
    delete (resolved.target as any).blendConfig;
    (resolved.target as any).hasEffects = !!(resolved.target.shadow || (resolved.target as any).contourConfig);
  }

  return {
    removed: toRemove.length,
    source: resolved?.source || null,
    target: resolved?.target || null,
  };
}

const blendGenerationMap = new Map<string, number>();

export async function applyBlendBetweenObjects(
  canvas: fabric.Canvas,
  rawSource: fabric.FabricObject,
  rawTarget: fabric.FabricObject,
  rawParams?: Partial<BlendParams>,
  options?: { lockForBlendTool?: boolean; blendId?: string }
): Promise<ResolvedBlendGroup | null> {
  if (!rawSource || !rawTarget || rawSource === rawTarget) return null;
  if (rawSource.type === 'activeselection' || rawTarget.type === 'activeselection') return null;

  const sourceId = ensureObjectId(rawSource, (rawSource as any).name || 'Blend Start');
  const targetId = ensureObjectId(rawTarget, (rawTarget as any).name || 'Blend End');

  const existingCfg =
    (rawSource as any).blendConfig?.blendId === (rawTarget as any).blendConfig?.blendId
      ? ((rawSource as any).blendConfig as BlendConfigMeta | undefined)
      : undefined;

  const blendId =
    options?.blendId ||
    existingCfg?.blendId ||
    `blend-${sourceId}-${targetId}`;

  const baseParams = existingCfg?.params || DEFAULT_BLEND_PARAMS;
  const params: BlendParams = {
    steps: Math.max(1, Math.min(50, Math.round(rawParams?.steps ?? baseParams.steps))),
    colorMode: rawParams?.colorMode ?? baseParams.colorMode,
    accelObject: Math.max(-100, Math.min(100, Math.round(rawParams?.accelObject ?? baseParams.accelObject))),
    accelColor: Math.max(-100, Math.min(100, Math.round(rawParams?.accelColor ?? baseParams.accelColor))),
  };

  const nextGen = (blendGenerationMap.get(blendId) || 0) + 1;
  blendGenerationMap.set(blendId, nextGen);

  const cA = rawSource.getCenterPoint();
  const cB = rawTarget.getCenterPoint();
  const wA = Math.max(2, (rawSource.width || rawSource.getScaledWidth() || 2) * (rawSource.scaleX || 1));
  const hA = Math.max(2, (rawSource.height || rawSource.getScaledHeight() || 2) * (rawSource.scaleY || 1));
  const wB = Math.max(2, (rawTarget.width || rawTarget.getScaledWidth() || 2) * (rawTarget.scaleX || 1));
  const hB = Math.max(2, (rawTarget.height || rawTarget.getScaledHeight() || 2) * (rawTarget.scaleY || 1));
  const angleA = rawSource.angle || 0;
  const angleB = rawTarget.angle || 0;
  const opA = rawSource.opacity ?? 1;
  const opB = rawTarget.opacity ?? 1;
  const swA = rawSource.strokeWidth ?? 0;
  const swB = rawTarget.strokeWidth ?? 0;
  const fillA = typeof rawSource.fill === 'string' ? rawSource.fill : 'transparent';
  const fillB = typeof rawTarget.fill === 'string' ? rawTarget.fill : 'transparent';
  const strokeA = typeof rawSource.stroke === 'string' ? rawSource.stroke : 'transparent';
  const strokeB = typeof rawTarget.stroke === 'string' ? rawTarget.stroke : 'transparent';

  const lockProps = options?.lockForBlendTool
    ? { selectable: false, hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true }
    : { selectable: true, evented: true };

  const isARect = rawSource.type === 'rect';
  const isACircleOrEllipse = rawSource.type === 'circle' || rawSource.type === 'ellipse';
  const isBRect = rawTarget.type === 'rect';
  const isBCircleOrEllipse = rawTarget.type === 'circle' || rawTarget.type === 'ellipse';

  const builtSteps: fabric.FabricObject[] = [];

  for (let i = 1; i <= params.steps; i++) {
    if (blendGenerationMap.get(blendId) !== nextGen) {
      return null;
    }

    const linearT = i / (params.steps + 1);
    const tObj = applyAcceleration(linearT, params.accelObject);
    const tCol = applyAcceleration(linearT, params.accelColor);

    const interpW = wA + (wB - wA) * tObj;
    const interpH = hA + (hB - hA) * tObj;

    let stepObj: fabric.FabricObject;
    if (isARect && isBCircleOrEllipse) {
      stepObj = await rawSource.clone();
      const baseW = Math.max(1, stepObj.width || wA);
      const baseH = Math.max(1, stepObj.height || hA);
      const startRx = (rawSource as fabric.Rect).rx || 0;
      const startRy = (rawSource as fabric.Rect).ry || 0;
      stepObj.set({
        rx: startRx + (baseW / 2 - startRx) * tObj,
        ry: startRy + (baseH / 2 - startRy) * tObj,
      });
    } else if (isACircleOrEllipse && isBRect) {
      stepObj = await rawTarget.clone();
      const baseW = Math.max(1, stepObj.width || wB);
      const baseH = Math.max(1, stepObj.height || hB);
      const endRx = (rawTarget as fabric.Rect).rx || 0;
      const endRy = (rawTarget as fabric.Rect).ry || 0;
      stepObj.set({
        rx: baseW / 2 + (endRx - baseW / 2) * tObj,
        ry: baseH / 2 + (endRy - baseH / 2) * tObj,
      });
    } else {
      const template = tObj >= 0.5 && rawSource.type !== rawTarget.type ? rawTarget : rawSource;
      stepObj = await template.clone();
    }

    if (blendGenerationMap.get(blendId) !== nextGen) {
      return null;
    }

    const baseUnscaledW = Math.max(1, stepObj.width || 1);
    const baseUnscaledH = Math.max(1, stepObj.height || 1);

    stepObj.set({
      scaleX: interpW / baseUnscaledW,
      scaleY: interpH / baseUnscaledH,
      angle: angleA + (angleB - angleA) * tObj,
      opacity: Math.max(0, Math.min(1, opA + (opB - opA) * tObj)),
      fill: interpolateBlendColor(fillA, fillB, tCol, params.colorMode),
      stroke: interpolateBlendColor(strokeA, strokeB, tCol, params.colorMode),
      strokeWidth: Math.max(0, swA + (swB - swA) * tObj),
      strokeUniform: true,
      shadow: null,
      ...lockProps,
    });

    stepObj.setPositionByOrigin(
      new fabric.Point(cA.x + (cB.x - cA.x) * tObj, cA.y + (cB.y - cA.y) * tObj),
      'center',
      'center'
    );
    ensureObjectId(stepObj, `Blend Step ${i}`);
    (stepObj as any).isBlendStep = true;
    (stepObj as any).blendId = blendId;
    (stepObj as any).blendSourceId = sourceId;
    (stepObj as any).blendTargetId = targetId;
    (stepObj as any).blendStepIndex = i;
    delete (stepObj as any).blendConfig;
    disableObjectCaching(stepObj);
    stepObj.setCoords();
    builtSteps.push(stepObj);
  }

  if (blendGenerationMap.get(blendId) !== nextGen) {
    return null;
  }

  // Remove old steps belonging to this blend atomically
  const oldSteps = canvas
    .getObjects()
    .filter((o) => (o as any).isBlendStep && (o as any).blendId === blendId);
  for (const s of oldSteps) {
    canvas.remove(s);
  }

  // Stack cleanly from Start Object (back) -> Step 1..N -> End Object (front)
  const objsAfterClean = canvas.getObjects();
  let idxA = objsAfterClean.indexOf(rawSource);
  const idxB = objsAfterClean.indexOf(rawTarget);
  if (idxA === -1 || idxB === -1) return null;

  if (idxB < idxA && typeof canvas.moveObjectTo === 'function') {
    canvas.moveObjectTo(rawTarget, idxA);
    idxA = canvas.getObjects().indexOf(rawSource);
  }

  const insertBase = Math.max(0, idxA + 1);
  for (let k = 0; k < builtSteps.length; k++) {
    canvas.insertAt(insertBase + k, builtSteps[k]);
  }

  const meta: BlendConfigMeta = {
    blendId,
    sourceId,
    targetId,
    params,
  };
  (rawSource as any).blendConfig = meta;
  (rawTarget as any).blendConfig = meta;
  (rawSource as any).hasEffects = true;
  (rawTarget as any).hasEffects = true;

  canvas.requestRenderAll();
  return {
    blendId,
    source: rawSource,
    target: rawTarget,
    params,
    stepObjects: builtSteps,
  };
}

export async function refreshBlendIfLinked(
  canvas: fabric.Canvas,
  obj: fabric.FabricObject | null,
  options?: { lockForBlendTool?: boolean }
): Promise<void> {
  if (!canvas || !obj) return;
  if ((obj as any).isBlendStep) return;

  const candidates =
    obj.type === 'activeselection' && typeof (obj as any).getObjects === 'function'
      ? ((obj as any).getObjects() as fabric.FabricObject[])
      : [obj];

  const seenIds = new Set<string>();
  for (const item of candidates) {
    const cfg = (item as any).blendConfig as BlendConfigMeta | undefined;
    if (!cfg || !cfg.blendId || seenIds.has(cfg.blendId)) continue;
    seenIds.add(cfg.blendId);
    const resolved = resolveBlendGroup(canvas, item);
    if (resolved) {
      await applyBlendBetweenObjects(canvas, resolved.source, resolved.target, resolved.params, options);
    }
  }
}
