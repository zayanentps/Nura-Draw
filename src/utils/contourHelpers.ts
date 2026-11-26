import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export type ContourDirection = 'inside' | 'center' | 'outside';

export interface ContourParams {
  direction: ContourDirection;
  steps: number;
  offsetPx: number;
  outlineColor: string;
  fillColor: string;
}

export interface ContourPreset {
  id: string;
  label: string;
  direction: ContourDirection;
  steps: number;
  offsetPx: number;
  outlineColor?: string;
  fillColor?: string;
}

export const DEFAULT_CONTOUR_PARAMS: ContourParams = {
  direction: 'outside',
  steps: 3,
  offsetPx: 12,
  outlineColor: '#0078d7',
  fillColor: '#38bdf8',
};

export const CONTOUR_PRESETS: ContourPreset[] = [
  { id: 'outside_3', label: '3-Step Outside', direction: 'outside', steps: 3, offsetPx: 12 },
  { id: 'inside_3', label: 'Subtle Inside', direction: 'inside', steps: 3, offsetPx: 8 },
  { id: 'bold_halftone', label: 'Bold 6-Step', direction: 'outside', steps: 6, offsetPx: 10 },
  { id: 'to_center', label: 'To Center', direction: 'center', steps: 6, offsetPx: 8 },
];

function parseToRgb(hexOrRgb?: string | null): { r: number; g: number; b: number } | null {
  if (!hexOrRgb || typeof hexOrRgb !== 'string' || hexOrRgb === 'transparent' || hexOrRgb === 'none') {
    return null;
  }
  const s = hexOrRgb.trim();
  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgbMatch = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10))),
      g: Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10))),
      b: Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10))),
    };
  }
  return null;
}

export function normalizeContourHex(color?: string | null, fallback = '#0078d7'): string {
  const rgb = parseToRgb(color);
  if (!rgb) return fallback;
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function interpolateContourColor(fromColor: string | null | undefined, toHex: string, t: number): string {
  const c1 = parseToRgb(fromColor);
  const c2 = parseToRgb(toHex) || { r: 0, g: 120, b: 215 };
  if (!c1) return normalizeContourHex(toHex);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(c1.r + (c2.r - c1.r) * clamped);
  const g = Math.round(c1.g + (c2.g - c1.g) * clamped);
  const b = Math.round(c1.b + (c2.b - c1.b) * clamped);
  const toHexByte = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function resolveContourParent(
  canvas: fabric.Canvas,
  obj: fabric.FabricObject | null
): fabric.FabricObject | null {
  if (!obj) return null;
  const parentId = (obj as any).contourParentId;
  if ((obj as any).isContourStep && parentId) {
    const parent = canvas.getObjects().find((o) => (o as any).id === parentId);
    if (parent) return parent;
  }
  return obj;
}

export function getContourStepObjects(canvas: fabric.Canvas, parent: fabric.FabricObject): fabric.FabricObject[] {
  const parentId = (parent as any).id;
  if (!parentId) return [];
  return canvas.getObjects().filter((o) => (o as any).isContourStep && (o as any).contourParentId === parentId);
}

export function extractTargetContourForUi(
  canvas: fabric.Canvas | null,
  target: fabric.FabricObject | null
): { hasContour: boolean; params: ContourParams } {
  if (!target) {
    return { hasContour: false, params: { ...DEFAULT_CONTOUR_PARAMS } };
  }
  const actual = canvas ? resolveContourParent(canvas, target) || target : target;
  const cfg = (actual as any).contourConfig as Partial<ContourParams> | undefined;
  const stepsExist = canvas ? getContourStepObjects(canvas, actual).length > 0 : false;
  const hasContour = !!(cfg || stepsExist);
  return {
    hasContour,
    params: {
      direction: cfg?.direction || DEFAULT_CONTOUR_PARAMS.direction,
      steps: Math.max(1, Math.min(50, Math.round(cfg?.steps ?? DEFAULT_CONTOUR_PARAMS.steps))),
      offsetPx: Math.max(1, Math.min(250, Math.round((cfg?.offsetPx ?? DEFAULT_CONTOUR_PARAMS.offsetPx) * 10) / 10)),
      outlineColor: normalizeContourHex(cfg?.outlineColor, DEFAULT_CONTOUR_PARAMS.outlineColor),
      fillColor: normalizeContourHex(cfg?.fillColor, DEFAULT_CONTOUR_PARAMS.fillColor),
    },
  };
}

export function removeContourFromTarget(canvas: fabric.Canvas, target: fabric.FabricObject): number {
  const actual = resolveContourParent(canvas, target) || target;
  const steps = getContourStepObjects(canvas, actual);
  for (const s of steps) {
    canvas.remove(s);
  }
  delete (actual as any).contourConfig;
  (actual as any).hasEffects = !!actual.shadow;
  return steps.length;
}

// Per-parent generation token prevents async clone races during fast mousemove scrubbing
const buildGenerationMap = new WeakMap<fabric.FabricObject, number>();

export async function applyContourParamsToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  rawParams: Partial<ContourParams>,
  options?: { lockForContourTool?: boolean }
): Promise<fabric.FabricObject> {
  const actual = resolveContourParent(canvas, target) || target;
  const parentId = ensureObjectId(actual, (actual as any).name || 'Object');

  const existing = extractTargetContourForUi(canvas, actual).params;
  const params: ContourParams = {
    direction: rawParams.direction ?? existing.direction,
    steps: Math.max(1, Math.min(50, Math.round(rawParams.steps ?? existing.steps))),
    offsetPx: Math.max(1, Math.min(250, Math.round((rawParams.offsetPx ?? existing.offsetPx) * 10) / 10)),
    outlineColor: normalizeContourHex(rawParams.outlineColor, existing.outlineColor),
    fillColor: normalizeContourHex(rawParams.fillColor, existing.fillColor),
  };

  const nextGen = (buildGenerationMap.get(actual) || 0) + 1;
  buildGenerationMap.set(actual, nextGen);

  const w = Math.max(4, actual.getScaledWidth());
  const h = Math.max(4, actual.getScaledHeight());
  const minHalf = Math.max(2, Math.min(w, h) / 2 - 2);
  const effectiveSteps =
    params.direction === 'center'
      ? Math.max(1, Math.min(30, Math.floor(minHalf / Math.max(1, params.offsetPx))))
      : params.steps;

  const baseFill = typeof actual.fill === 'string' ? actual.fill : 'transparent';
  const baseStroke = typeof actual.stroke === 'string' && actual.stroke !== 'transparent' ? actual.stroke : params.outlineColor;
  const baseSx = actual.scaleX || 1;
  const baseSy = actual.scaleY || 1;
  const center = actual.getCenterPoint();
  const lockProps = options?.lockForContourTool
    ? { selectable: false, hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true }
    : { selectable: true, evented: true };

  // Pre-build clones off-canvas before mutating canvas objects
  const builtSteps: fabric.FabricObject[] = [];
  const stepOrder =
    params.direction === 'outside'
      ? Array.from({ length: effectiveSteps }, (_, idx) => effectiveSteps - idx) // outer -> inner (drawn behind target)
      : Array.from({ length: effectiveSteps }, (_, idx) => idx + 1); // outer-inside -> innermost (drawn in front of target)

  for (const i of stepOrder) {
    if (buildGenerationMap.get(actual) !== nextGen) {
      return actual; // Superseded by newer scrub frame
    }
    let c: fabric.FabricObject;
    if (actual.type === 'activeselection' && typeof (actual as any).getObjects === 'function') {
      const items = (actual as any).getObjects() as fabric.FabricObject[];
      const clonedItems = await Promise.all(items.map((it) => it.clone()));
      c = new fabric.Group(clonedItems, { objectCaching: false });
    } else {
      c = await actual.clone();
    }
    if (buildGenerationMap.get(actual) !== nextGen) {
      return actual;
    }

    const sign = params.direction === 'outside' ? 1 : -1;
    const delta = sign * i * params.offsetPx * 2;
    const scaleFactorX = Math.max(0.06, (w + delta) / w);
    const scaleFactorY = Math.max(0.06, (h + delta) / h);
    const t = i / Math.max(1, effectiveSteps);

    const stepFill =
      baseFill === 'transparent' || baseFill === 'none'
        ? 'transparent'
        : interpolateContourColor(baseFill, params.fillColor, t);
    const stepStroke = interpolateContourColor(baseStroke, params.outlineColor, t);

    c.set({
      scaleX: baseSx * scaleFactorX,
      scaleY: baseSy * scaleFactorY,
      fill: stepFill,
      stroke: stepStroke,
      strokeWidth: Math.max(0.5, actual.strokeWidth || 1),
      strokeUniform: true,
      shadow: null,
      ...lockProps,
    });
    c.setPositionByOrigin(center, 'center', 'center');
    ensureObjectId(c, `Contour Step ${i}`);
    (c as any).isContourStep = true;
    (c as any).contourParentId = parentId;
    (c as any).contourStepIndex = i;
    delete (c as any).contourConfig;
    disableObjectCaching(c);
    c.setCoords();
    builtSteps.push(c);
  }

  if (buildGenerationMap.get(actual) !== nextGen) {
    return actual;
  }

  // Replace previous contour rings atomically
  const oldSteps = getContourStepObjects(canvas, actual);
  for (const s of oldSteps) {
    canvas.remove(s);
  }

  const targetIdx = Math.max(0, canvas.getObjects().indexOf(actual));
  if (params.direction === 'outside') {
    for (let k = 0; k < builtSteps.length; k++) {
      canvas.insertAt(targetIdx + k, builtSteps[k]);
    }
  } else {
    for (let k = 0; k < builtSteps.length; k++) {
      canvas.insertAt(targetIdx + 1 + k, builtSteps[k]);
    }
  }

  (actual as any).contourConfig = { ...params };
  (actual as any).hasEffects = true;
  canvas.setActiveObject(actual);
  canvas.requestRenderAll();
  return actual;
}
