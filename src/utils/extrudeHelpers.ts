import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export type ExtrudeType =
  | 'small_back'
  | 'big_back'
  | 'back_parallel'
  | 'small_front'
  | 'big_front'
  | 'front_parallel';

export type ExtrudeColorMode = 'object_fill' | 'solid' | 'shade';

export interface ExtrudeParams {
  extrudeType: ExtrudeType;
  offsetX: number; // Vanishing point / direction offset X from object center (px)
  offsetY: number; // Vanishing point / direction offset Y from object center (px)
  depth: number; // 1..95 (%)
  colorMode: ExtrudeColorMode;
  solidColor: string;
  shadeColor: string;
  lightIntensity: number; // 0..100
  showOutline: boolean;
}

export interface ExtrudeConfigMeta {
  extrudeId: string;
  parentId: string;
  params: ExtrudeParams;
}

export interface ExtrudePreset {
  id: string;
  label: string;
  params: Partial<ExtrudeParams>;
}

export const DEFAULT_EXTRUDE_PARAMS: ExtrudeParams = {
  extrudeType: 'small_back',
  offsetX: 90,
  offsetY: -70,
  depth: 50,
  colorMode: 'object_fill',
  solidColor: '#334155',
  shadeColor: '#0f172a',
  lightIntensity: 65,
  showOutline: true,
};

export const EXTRUDE_PRESETS: ExtrudePreset[] = [
  {
    id: 'top_right_3d',
    label: '3D Top-Right',
    params: { extrudeType: 'small_back', offsetX: 95, offsetY: -75, depth: 50, colorMode: 'object_fill', lightIntensity: 65 },
  },
  {
    id: 'bottom_right_3d',
    label: '3D Bottom-Right',
    params: { extrudeType: 'small_back', offsetX: 95, offsetY: 75, depth: 50, colorMode: 'object_fill', lightIntensity: 65 },
  },
  {
    id: 'parallel_block',
    label: 'Parallel Block',
    params: { extrudeType: 'back_parallel', offsetX: 60, offsetY: 45, depth: 65, colorMode: 'shade', solidColor: '#475569', shadeColor: '#0f172a', lightIntensity: 70 },
  },
  {
    id: 'deep_perspective',
    label: 'Deep Perspective',
    params: { extrudeType: 'small_back', offsetX: 140, offsetY: -90, depth: 75, colorMode: 'shade', solidColor: '#1e40af', shadeColor: '#0f172a', lightIntensity: 75 },
  },
  {
    id: 'pop_out_front',
    label: 'Pop-Out Front',
    params: { extrudeType: 'big_front', offsetX: 70, offsetY: 55, depth: 45, colorMode: 'object_fill', lightIntensity: 60 },
  },
  {
    id: 'gold_bevel',
    label: 'Gold 3D Shade',
    params: { extrudeType: 'small_back', offsetX: 85, offsetY: -65, depth: 55, colorMode: 'shade', solidColor: '#f59e0b', shadeColor: '#78350f', lightIntensity: 75 },
  },
];

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
};

function parseHexRgb(color: unknown): { r: number; g: number; b: number } | null {
  if (typeof color !== 'string') return null;
  const raw = color.trim().toLowerCase();
  if (!raw || raw === 'transparent' || raw === 'none') return null;
  const s = NAMED_COLORS[raw] || raw;
  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1])))),
      g: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2])))),
      b: Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3])))),
    };
  }
  return null;
}

export function normalizeExtrudeHex(color: unknown, fallback = '#334155'): string {
  const rgb = parseHexRgb(color);
  if (!rgb) return fallback;
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function adjustRgb(rgb: { r: number; g: number; b: number }, factor: number): string {
  // factor in [-1, 1]: negative darkens toward 0, positive lightens toward 255
  const apply = (c: number) => {
    if (factor < 0) return Math.round(c * (1 + factor));
    return Math.round(c + (255 - c) * factor);
  };
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(apply(rgb.r))}${toHex(apply(rgb.g))}${toHex(apply(rgb.b))}`;
}

function lerpHex(fromHex: string, toHex: string, t: number): string {
  const c1 = parseHexRgb(fromHex) || { r: 51, g: 65, b: 85 };
  const c2 = parseHexRgb(toHex) || { r: 15, g: 23, b: 42 };
  const cl = Math.max(0, Math.min(1, t));
  const r = Math.round(c1.r + (c2.r - c1.r) * cl);
  const g = Math.round(c1.g + (c2.g - c1.g) * cl);
  const b = Math.round(c1.b + (c2.b - c1.b) * cl);
  const h = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function resolveExtrudeParent(
  canvas: fabric.Canvas | null,
  obj: fabric.FabricObject | null
): fabric.FabricObject | null {
  if (!canvas || !obj) return null;
  if ((obj as any).isExtrudeBody && (obj as any).extrudeParentId) {
    const parent = canvas.getObjects().find((o) => (o as any).id === (obj as any).extrudeParentId);
    if (parent) return parent;
  }
  return obj;
}

export function getExtrudeBodyObjects(
  canvas: fabric.Canvas,
  parent: fabric.FabricObject
): fabric.FabricObject[] {
  const parentId = (parent as any).id;
  if (!parentId) return [];
  return canvas.getObjects().filter(
    (o) => (o as any).isExtrudeBody && (o as any).extrudeParentId === parentId
  );
}

export function extractTargetExtrudeForUi(
  canvas: fabric.Canvas | null,
  target: fabric.FabricObject | null
): { hasExtrude: boolean; params: ExtrudeParams } {
  if (!target) {
    return { hasExtrude: false, params: { ...DEFAULT_EXTRUDE_PARAMS } };
  }
  const actual = canvas ? resolveExtrudeParent(canvas, target) || target : target;
  const cfg = (actual as any).extrudeConfig as Partial<ExtrudeConfigMeta> | undefined;
  const bodyExists = canvas ? getExtrudeBodyObjects(canvas, actual).length > 0 : false;
  const hasExtrude = !!(cfg || bodyExists);
  const p = cfg?.params;
  return {
    hasExtrude,
    params: {
      extrudeType: p?.extrudeType || DEFAULT_EXTRUDE_PARAMS.extrudeType,
      offsetX: Number.isFinite(p?.offsetX) ? Math.round((p!.offsetX) * 10) / 10 : DEFAULT_EXTRUDE_PARAMS.offsetX,
      offsetY: Number.isFinite(p?.offsetY) ? Math.round((p!.offsetY) * 10) / 10 : DEFAULT_EXTRUDE_PARAMS.offsetY,
      depth: Math.max(1, Math.min(95, Math.round(p?.depth ?? DEFAULT_EXTRUDE_PARAMS.depth))),
      colorMode: p?.colorMode || DEFAULT_EXTRUDE_PARAMS.colorMode,
      solidColor: normalizeExtrudeHex(p?.solidColor, DEFAULT_EXTRUDE_PARAMS.solidColor),
      shadeColor: normalizeExtrudeHex(p?.shadeColor, DEFAULT_EXTRUDE_PARAMS.shadeColor),
      lightIntensity: Math.max(0, Math.min(100, Math.round(p?.lightIntensity ?? DEFAULT_EXTRUDE_PARAMS.lightIntensity))),
      showOutline: p?.showOutline ?? DEFAULT_EXTRUDE_PARAMS.showOutline,
    },
  };
}

export function removeExtrudeFromTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): { parent: fabric.FabricObject; removed: number } {
  const actual = resolveExtrudeParent(canvas, target) || target;
  const bodies = getExtrudeBodyObjects(canvas, actual);
  for (const b of bodies) {
    canvas.remove(b);
  }
  delete (actual as any).extrudeConfig;
  (actual as any).hasEffects = !!actual.shadow || !!(actual as any).contourConfig || !!(actual as any).blendConfig;
  return { parent: actual, removed: bodies.length };
}

function sampleCubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  segments = 6
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

function sampleQuadBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  segments = 5
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

function extractBoundaryRings(obj: fabric.FabricObject): { x: number; y: number }[][] | null {
  obj.setCoords();
  const matrix = obj.calcTransformMatrix();
  const toScene = (lx: number, ly: number) => {
    const pt = fabric.util.transformPoint(new fabric.Point(lx, ly), matrix);
    return { x: pt.x, y: pt.y };
  };

  if (obj.type === 'rect') {
    const w = Math.max(1, obj.width || 1);
    const h = Math.max(1, obj.height || 1);
    const hw = w / 2;
    const hh = h / 2;
    const rx = Math.min(hw, Math.max(0, (obj as fabric.Rect).rx || 0));
    const ry = Math.min(hh, Math.max(0, (obj as fabric.Rect).ry || 0));

    if (rx < 0.5 && ry < 0.5) {
      return [[toScene(-hw, -hh), toScene(hw, -hh), toScene(hw, hh), toScene(-hw, hh)]];
    }

    const ring: { x: number; y: number }[] = [];
    const arcSegs = 5;
    const addCorner = (cx: number, cy: number, startAng: number, endAng: number) => {
      for (let i = 0; i <= arcSegs; i++) {
        const a = startAng + ((endAng - startAng) * i) / arcSegs;
        ring.push(toScene(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
      }
    };
    addCorner(hw - rx, -hh + ry, -Math.PI / 2, 0);
    addCorner(hw - rx, hh - ry, 0, Math.PI / 2);
    addCorner(-hw + rx, hh - ry, Math.PI / 2, Math.PI);
    addCorner(-hw + rx, -hh + ry, Math.PI, Math.PI * 1.5);
    return [ring];
  }

  if (obj.type === 'circle' || obj.type === 'ellipse') {
    const rx = obj.type === 'circle' ? (obj as fabric.Circle).radius || 20 : (obj as fabric.Ellipse).rx || 20;
    const ry = obj.type === 'circle' ? (obj as fabric.Circle).radius || 20 : (obj as fabric.Ellipse).ry || 20;
    const segs = 40;
    const ring: { x: number; y: number }[] = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      ring.push(toScene(rx * Math.cos(a), ry * Math.sin(a)));
    }
    return [ring];
  }

  if ((obj.type === 'polygon' || obj.type === 'triangle') && Array.isArray((obj as fabric.Polygon).points)) {
    const poly = obj as fabric.Polygon;
    const off = poly.pathOffset || { x: 0, y: 0 };
    const ring = poly.points.map((p) => toScene(p.x - off.x, p.y - off.y));
    if (ring.length >= 3) return [ring];
  }

  if (obj.type === 'triangle') {
    const w = (obj.width || 40) / 2;
    const h = (obj.height || 40) / 2;
    return [[toScene(0, -h), toScene(w, h), toScene(-w, h)]];
  }

  if (obj.type === 'path' && Array.isArray((obj as fabric.Path).path)) {
    const pathObj = obj as fabric.Path;
    const off = pathObj.pathOffset || { x: 0, y: 0 };
    const ring: { x: number; y: number }[] = [];
    let cur = { x: 0, y: 0 };
    for (const cmd of pathObj.path) {
      const type = cmd[0];
      if (type === 'M' || type === 'L') {
        cur = { x: Number(cmd[1]), y: Number(cmd[2]) };
        ring.push(toScene(cur.x - off.x, cur.y - off.y));
      } else if (type === 'Q') {
        const p1 = { x: Number(cmd[1]), y: Number(cmd[2]) };
        const p2 = { x: Number(cmd[3]), y: Number(cmd[4]) };
        for (const s of sampleQuadBezier(cur, p1, p2, 5)) {
          ring.push(toScene(s.x - off.x, s.y - off.y));
        }
        cur = p2;
      } else if (type === 'C') {
        const p1 = { x: Number(cmd[1]), y: Number(cmd[2]) };
        const p2 = { x: Number(cmd[3]), y: Number(cmd[4]) };
        const p3 = { x: Number(cmd[5]), y: Number(cmd[6]) };
        for (const s of sampleCubicBezier(cur, p1, p2, p3, 6)) {
          ring.push(toScene(s.x - off.x, s.y - off.y));
        }
        cur = p3;
      }
    }
    if (ring.length >= 3) return [ring];
  }

  return null;
}

function getTargetPrimaryHex(target: fabric.FabricObject, fallback = '#0078d7'): string {
  if (typeof target.fill === 'string') {
    const parsed = parseHexRgb(target.fill);
    if (parsed) return normalizeExtrudeHex(target.fill, fallback);
  }
  if (target.fill && typeof target.fill === 'object' && Array.isArray((target.fill as any).colorStops)) {
    const stops = (target.fill as any).colorStops;
    if (stops.length > 0 && typeof stops[0].color === 'string') {
      return normalizeExtrudeHex(stops[0].color, fallback);
    }
  }
  if (typeof target.stroke === 'string') {
    const parsed = parseHexRgb(target.stroke);
    if (parsed) return normalizeExtrudeHex(target.stroke, fallback);
  }
  return fallback;
}

export function computeExtrudeProjection(
  center: { x: number; y: number },
  params: ExtrudeParams
): {
  isFrontProjection: boolean;
  projCenter: { x: number; y: number };
  projScale: number;
  vpPoint: { x: number; y: number };
  handleTip: { x: number; y: number };
} {
  const t = Math.max(0.02, Math.min(0.95, params.depth / 100));
  const vpPoint = { x: center.x + params.offsetX, y: center.y + params.offsetY };

  switch (params.extrudeType) {
    case 'small_back': {
      const projCenter = {
        x: center.x + params.offsetX * t,
        y: center.y + params.offsetY * t,
      };
      return {
        isFrontProjection: false,
        projCenter,
        projScale: Math.max(0.08, 1 - t * 0.85),
        vpPoint,
        handleTip: vpPoint,
      };
    }
    case 'big_back': {
      const projCenter = {
        x: center.x - params.offsetX * t,
        y: center.y - params.offsetY * t,
      };
      return {
        isFrontProjection: false,
        projCenter,
        projScale: 1 + t * 0.65,
        vpPoint,
        handleTip: vpPoint,
      };
    }
    case 'back_parallel': {
      const projCenter = {
        x: center.x + params.offsetX * t,
        y: center.y + params.offsetY * t,
      };
      return {
        isFrontProjection: false,
        projCenter,
        projScale: 1,
        vpPoint,
        handleTip: vpPoint,
      };
    }
    case 'small_front': {
      const projCenter = {
        x: center.x + params.offsetX * t,
        y: center.y + params.offsetY * t,
      };
      return {
        isFrontProjection: true,
        projCenter,
        projScale: Math.max(0.15, 1 - t * 0.72),
        vpPoint,
        handleTip: vpPoint,
      };
    }
    case 'big_front': {
      const projCenter = {
        x: center.x + params.offsetX * t,
        y: center.y + params.offsetY * t,
      };
      return {
        isFrontProjection: true,
        projCenter,
        projScale: 1 + t * 0.65,
        vpPoint,
        handleTip: vpPoint,
      };
    }
    case 'front_parallel': {
      const projCenter = {
        x: center.x + params.offsetX * t,
        y: center.y + params.offsetY * t,
      };
      return {
        isFrontProjection: true,
        projCenter,
        projScale: 1,
        vpPoint,
        handleTip: vpPoint,
      };
    }
  }
}

const extrudeGenerationMap = new WeakMap<fabric.FabricObject, number>();

export async function applyExtrudeParamsToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  rawParams: Partial<ExtrudeParams>,
  options?: { lockForExtrudeTool?: boolean }
): Promise<fabric.FabricObject> {
  const actual = resolveExtrudeParent(canvas, target) || target;
  const parentId = ensureObjectId(actual, (actual as any).name || 'Object');

  const existing = extractTargetExtrudeForUi(canvas, actual);
  const existingParams = existing.hasExtrude ? existing.params : DEFAULT_EXTRUDE_PARAMS;

  const params: ExtrudeParams = {
    extrudeType: rawParams.extrudeType ?? existingParams.extrudeType,
    offsetX:
      rawParams.offsetX !== undefined && Number.isFinite(rawParams.offsetX)
        ? Math.round(rawParams.offsetX * 10) / 10
        : existingParams.offsetX,
    offsetY:
      rawParams.offsetY !== undefined && Number.isFinite(rawParams.offsetY)
        ? Math.round(rawParams.offsetY * 10) / 10
        : existingParams.offsetY,
    depth: Math.max(1, Math.min(95, Math.round(rawParams.depth ?? existingParams.depth))),
    colorMode: rawParams.colorMode ?? existingParams.colorMode,
    solidColor: normalizeExtrudeHex(rawParams.solidColor, existingParams.solidColor),
    shadeColor: normalizeExtrudeHex(rawParams.shadeColor, existingParams.shadeColor),
    lightIntensity: Math.max(0, Math.min(100, Math.round(rawParams.lightIntensity ?? existingParams.lightIntensity))),
    showOutline: rawParams.showOutline ?? existingParams.showOutline,
  };

  const nextGen = (extrudeGenerationMap.get(actual) || 0) + 1;
  extrudeGenerationMap.set(actual, nextGen);

  const center = actual.getCenterPoint();
  const proj = computeExtrudeProjection(center, params);

  const objectFillHex = getTargetPrimaryHex(actual, '#0078d7');
  const baseSideHex =
    params.colorMode === 'object_fill'
      ? objectFillHex
      : params.solidColor;
  const baseRgb = parseHexRgb(baseSideHex) || { r: 51, g: 65, b: 85 };
  const deepHex =
    params.colorMode === 'shade'
      ? params.shadeColor
      : adjustRgb(baseRgb, -0.42);
  const lightAmt = (params.lightIntensity / 100) * 0.48;

  const rings = extractBoundaryRings(actual);
  const builtPieces: fabric.FabricObject[] = [];
  const strokeOutlineColor =
    typeof actual.stroke === 'string' && actual.stroke !== 'transparent' && actual.stroke !== 'none'
      ? actual.stroke
      : adjustRgb(baseRgb, -0.55);

  if (rings && rings.length > 0) {
    // True vector 3D polygon side faces + cap
    const lightDir = { x: -0.65, y: -0.76 }; // top-left directional studio light
    const quadsWithDepth: { poly: fabric.Polygon; score: number }[] = [];

    for (const frontRing of rings) {
      if (frontRing.length < 3) continue;
      const projRing = frontRing.map((pt) => ({
        x: proj.projCenter.x + (pt.x - center.x) * proj.projScale,
        y: proj.projCenter.y + (pt.y - center.y) * proj.projScale,
      }));

      // Signed area to ensure consistent outward normals
      let area = 0;
      for (let i = 0; i < frontRing.length; i++) {
        const a = frontRing[i];
        const b = frontRing[(i + 1) % frontRing.length];
        area += a.x * b.y - b.x * a.y;
      }
      const windingSign = area >= 0 ? 1 : -1;

      const backCapFill =
        params.colorMode === 'shade'
          ? params.shadeColor
          : adjustRgb(baseRgb, -0.35);

      if (!proj.isFrontProjection) {
        const backCap = new fabric.Polygon(projRing, {
          fill: backCapFill,
          stroke: params.showOutline ? strokeOutlineColor : backCapFill,
          strokeWidth: params.showOutline ? 0.75 : 0.3,
          strokeLineJoin: 'round',
          objectCaching: false,
        });
        quadsWithDepth.push({ poly: backCap, score: -1e9 });
      }

      const extrudeDx = proj.projCenter.x - center.x;
      const extrudeDy = proj.projCenter.y - center.y;

      for (let i = 0; i < frontRing.length; i++) {
        const nextIdx = (i + 1) % frontRing.length;
        const p0 = frontRing[i];
        const p1 = frontRing[nextIdx];
        const q0 = projRing[i];
        const q1 = projRing[nextIdx];

        const ex = p1.x - p0.x;
        const ey = p1.y - p0.y;
        const eLen = Math.hypot(ex, ey) || 1;
        // Outward normal in screen coords
        const nx = (ey / eLen) * windingSign;
        const ny = (-ex / eLen) * windingSign;

        const dotLight = nx * lightDir.x + ny * lightDir.y;
        const shadeDelta = dotLight * lightAmt - 0.14;

        let faceFill: string | fabric.Gradient<'linear'>;
        if (params.colorMode === 'shade') {
          const litFront = adjustRgb(parseHexRgb(params.solidColor) || baseRgb, dotLight * lightAmt * 0.6);
          const litBack = adjustRgb(parseHexRgb(params.shadeColor) || { r: 15, g: 23, b: 42 }, dotLight * lightAmt * 0.45);
          faceFill = new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords:
              Math.abs(extrudeDx) >= Math.abs(extrudeDy)
                ? { x1: extrudeDx >= 0 ? 0 : 1, y1: 0.5, x2: extrudeDx >= 0 ? 1 : 0, y2: 0.5 }
                : { x1: 0.5, y1: extrudeDy >= 0 ? 0 : 1, x2: 0.5, y2: extrudeDy >= 0 ? 1 : 0 },
            colorStops: [
              { offset: 0, color: proj.isFrontProjection ? litBack : litFront },
              { offset: 1, color: proj.isFrontProjection ? litFront : litBack },
            ],
          });
        } else {
          faceFill = adjustRgb(baseRgb, shadeDelta);
        }

        const sideEdgeStroke = params.showOutline
          ? strokeOutlineColor
          : typeof faceFill === 'string'
          ? faceFill
          : params.solidColor;

        const quad = new fabric.Polygon([p0, p1, q1, q0], {
          fill: faceFill,
          stroke: sideEdgeStroke,
          strokeWidth: params.showOutline ? (frontRing.length > 16 ? 0.35 : 0.85) : 0.45,
          strokeLineJoin: 'round',
          objectCaching: false,
        });

        // Painter's depth score: faces closer to the viewer (opposite of extrusion back) draw later
        const midX = (p0.x + p1.x + q0.x + q1.x) / 4 - center.x;
        const midY = (p0.y + p1.y + q0.y + q1.y) / 4 - center.y;
        const dirLen = Math.hypot(extrudeDx, extrudeDy) || 1;
        const depthScore = -(midX * (extrudeDx / dirLen) + midY * (extrudeDy / dirLen));
        quadsWithDepth.push({ poly: quad, score: depthScore });
      }

      if (proj.isFrontProjection) {
        const frontFill =
          typeof actual.fill === 'string' || (actual.fill && typeof actual.fill === 'object')
            ? actual.fill
            : objectFillHex;
        const frontCap = new fabric.Polygon(projRing, {
          fill: frontFill as any,
          stroke: typeof actual.stroke === 'string' ? actual.stroke : strokeOutlineColor,
          strokeWidth: Math.max(0.5, actual.strokeWidth || 1),
          strokeLineJoin: 'round',
          objectCaching: false,
        });
        quadsWithDepth.push({ poly: frontCap, score: 1e9 });
      }
    }

    quadsWithDepth.sort((a, b) => a.score - b.score);
    for (const item of quadsWithDepth) {
      builtPieces.push(item.poly);
    }
  } else {
    // High-density smooth vector extrusion for Text / IText / Textbox / Groups
    const distPx = Math.hypot(proj.projCenter.x - center.x, proj.projCenter.y - center.y);
    const steps = Math.max(16, Math.min(44, Math.round(distPx / 2.2) + 8));
    const baseSx = actual.scaleX || 1;
    const baseSy = actual.scaleY || 1;

    // Order slices from backmost to frontmost
    const indices = proj.isFrontProjection
      ? Array.from({ length: steps }, (_, idx) => idx + 1)
      : Array.from({ length: steps }, (_, idx) => steps - idx);

    for (const i of indices) {
      if (extrudeGenerationMap.get(actual) !== nextGen) return actual;
      const u = i / steps;
      const sliceScale = 1 + (proj.projScale - 1) * u;
      const sliceCenter = new fabric.Point(
        center.x + (proj.projCenter.x - center.x) * u,
        center.y + (proj.projCenter.y - center.y) * u
      );

      let c: fabric.FabricObject;
      if (actual.type === 'activeselection' && typeof (actual as any).getObjects === 'function') {
        const clonedItems = await Promise.all(((actual as any).getObjects() as fabric.FabricObject[]).map((it) => it.clone()));
        c = new fabric.Group(clonedItems, { objectCaching: false });
      } else {
        c = await actual.clone();
      }
      if (extrudeGenerationMap.get(actual) !== nextGen) return actual;

      const isOuterCap = i === steps;
      let sliceFill: string;
      if (proj.isFrontProjection && isOuterCap) {
        sliceFill = typeof actual.fill === 'string' ? actual.fill : objectFillHex;
      } else if (params.colorMode === 'shade') {
        const frontCol = normalizeExtrudeHex(params.solidColor, baseSideHex);
        const backCol = normalizeExtrudeHex(params.shadeColor, deepHex);
        sliceFill = lerpHex(frontCol, backCol, u);
      } else {
        const shadeDarkness = -0.16 - 0.28 * u * (0.4 + 0.6 * (params.lightIntensity / 100));
        sliceFill = adjustRgb(baseRgb, shadeDarkness);
      }

      const sliceStroke =
        proj.isFrontProjection && isOuterCap
          ? typeof actual.stroke === 'string'
            ? actual.stroke
            : strokeOutlineColor
          : params.showOutline && isOuterCap
          ? strokeOutlineColor
          : sliceFill;

      c.set({
        scaleX: baseSx * sliceScale,
        scaleY: baseSy * sliceScale,
        fill: sliceFill,
        stroke: sliceStroke,
        strokeWidth: isOuterCap ? Math.max(0.75, actual.strokeWidth || 0.75) : Math.max(0.5, actual.strokeWidth || 0.5),
        shadow: null,
        opacity: 1,
        objectCaching: false,
      });
      c.setPositionByOrigin(sliceCenter, 'center', 'center');
      c.setCoords();
      builtPieces.push(c);
    }
  }

  if (extrudeGenerationMap.get(actual) !== nextGen) {
    return actual;
  }

  const extrudeId =
    (actual as any).extrudeConfig?.extrudeId ||
    `extrude_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const extGroup = new fabric.Group(builtPieces, {
    subTargetCheck: false,
    objectCaching: false,
    selectable: !options?.lockForExtrudeTool,
    evented: true,
    hasControls: !options?.lockForExtrudeTool,
    hasBorders: !options?.lockForExtrudeTool,
    lockMovementX: !!options?.lockForExtrudeTool,
    lockMovementY: !!options?.lockForExtrudeTool,
  });

  ensureObjectId(extGroup, 'Extrude 3D');
  (extGroup as any).isExtrudeBody = true;
  (extGroup as any).extrudeId = extrudeId;
  (extGroup as any).extrudeParentId = parentId;
  (extGroup as any).hasEffects = true;
  disableObjectCaching(extGroup);
  extGroup.setCoords();

  // Atomically replace previous Extrude body
  const oldBodies = getExtrudeBodyObjects(canvas, actual);
  for (const b of oldBodies) {
    canvas.remove(b);
  }

  const targetIdx = Math.max(0, canvas.getObjects().indexOf(actual));
  const insertAt = proj.isFrontProjection ? targetIdx + 1 : targetIdx;
  canvas.insertAt(insertAt, extGroup);

  (actual as any).extrudeConfig = {
    extrudeId,
    parentId,
    params: { ...params },
  } as ExtrudeConfigMeta;
  (actual as any).hasEffects = true;

  canvas.setActiveObject(actual);
  canvas.requestRenderAll();
  return actual;
}

export async function refreshExtrudeIfLinked(
  canvas: fabric.Canvas | null,
  obj: fabric.FabricObject | null
): Promise<void> {
  if (!canvas || !obj || (obj as any).isExtrudeBody) return;
  const cfg = (obj as any).extrudeConfig as ExtrudeConfigMeta | undefined;
  if (!cfg?.params) return;
  await applyExtrudeParamsToTarget(canvas, obj, cfg.params, { lockForExtrudeTool: false });
}
