import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export interface BlockShadowParams {
  offsetX: number; // X extrusion offset in scene px
  offsetY: number; // Y extrusion offset in scene px
  color: string; // Hex fill color of block shadow
  simplify: boolean; // Merge silhouette cleanly
  removeHoles: boolean; // Fill interior cutouts solid
  fromOutline: boolean; // Expand hull by object's stroke width
  expandEnabled: boolean; // Enable outward expansion offset
  expandPx: number; // Outward expansion amount in scene px
  overprint: boolean; // Overprint (multiply composite)
}

export interface BlockShadowConfigMeta {
  blockShadowId: string;
  parentId: string;
  params: BlockShadowParams;
}

export const DEFAULT_BLOCK_SHADOW_PARAMS: BlockShadowParams = {
  offsetX: 60,
  offsetY: 36,
  color: '#262626',
  simplify: true,
  removeHoles: false,
  fromOutline: false,
  expandEnabled: false,
  expandPx: 0,
  overprint: false,
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
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  gray: '#808080',
  grey: '#808080',
};

export function normalizeBlockShadowHex(color: unknown, fallback = '#262626'): string {
  if (typeof color !== 'string') return fallback;
  const raw = color.trim().toLowerCase();
  if (!raw || raw === 'transparent' || raw === 'none') return fallback;
  const s = NAMED_COLORS[raw] || raw;
  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return `#${h.slice(0, 6)}`;
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    const toH = (v: string) =>
      Math.max(0, Math.min(255, Math.round(parseFloat(v)))).toString(16).padStart(2, '0');
    return `#${toH(rgb[1])}${toH(rgb[2])}${toH(rgb[3])}`;
  }
  return fallback;
}

export function resolveBlockShadowParent(
  canvas: fabric.Canvas | null,
  obj: fabric.FabricObject | null
): fabric.FabricObject | null {
  if (!canvas || !obj) return null;
  if ((obj as any).isBlockShadow && (obj as any).blockShadowParentId) {
    const parent = canvas.getObjects().find((o) => (o as any).id === (obj as any).blockShadowParentId);
    if (parent) return parent;
  }
  return obj;
}

export function extractTargetBlockShadowForUi(
  canvas: fabric.Canvas | null,
  target: fabric.FabricObject | null
): { hasBlockShadow: boolean; params: BlockShadowParams } {
  const actual = resolveBlockShadowParent(canvas, target);
  if (!actual) {
    return { hasBlockShadow: false, params: { ...DEFAULT_BLOCK_SHADOW_PARAMS } };
  }
  const meta = (actual as any).blockShadowConfig as BlockShadowConfigMeta | undefined;
  const linkedExists =
    !!meta?.blockShadowId &&
    !!canvas?.getObjects().some((o) => (o as any).id === meta.blockShadowId);

  if (meta && meta.params && linkedExists) {
    return {
      hasBlockShadow: true,
      params: {
        offsetX: Number.isFinite(meta.params.offsetX) ? meta.params.offsetX : DEFAULT_BLOCK_SHADOW_PARAMS.offsetX,
        offsetY: Number.isFinite(meta.params.offsetY) ? meta.params.offsetY : DEFAULT_BLOCK_SHADOW_PARAMS.offsetY,
        color: normalizeBlockShadowHex(meta.params.color, DEFAULT_BLOCK_SHADOW_PARAMS.color),
        simplify: meta.params.simplify ?? DEFAULT_BLOCK_SHADOW_PARAMS.simplify,
        removeHoles: meta.params.removeHoles ?? DEFAULT_BLOCK_SHADOW_PARAMS.removeHoles,
        fromOutline: meta.params.fromOutline ?? DEFAULT_BLOCK_SHADOW_PARAMS.fromOutline,
        expandEnabled: meta.params.expandEnabled ?? DEFAULT_BLOCK_SHADOW_PARAMS.expandEnabled,
        expandPx: Math.max(0, Number(meta.params.expandPx ?? 0)),
        overprint: meta.params.overprint ?? DEFAULT_BLOCK_SHADOW_PARAMS.overprint,
      },
    };
  }
  return { hasBlockShadow: false, params: { ...DEFAULT_BLOCK_SHADOW_PARAMS } };
}

function sampleQuadBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  steps = 6
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

function sampleCubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  steps = 6
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

function ringSignedArea(ring: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
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
    const rings: { x: number; y: number }[][] = [];
    let currentRing: { x: number; y: number }[] = [];
    let cur = { x: 0, y: 0 };
    let start = { x: 0, y: 0 };

    const flushRing = () => {
      if (currentRing.length >= 3) {
        rings.push(currentRing);
      }
      currentRing = [];
    };

    for (const cmd of pathObj.path) {
      const type = String(cmd[0]).toUpperCase();
      if (type === 'M') {
        flushRing();
        cur = { x: Number(cmd[1]), y: Number(cmd[2]) };
        start = { ...cur };
        currentRing.push(toScene(cur.x - off.x, cur.y - off.y));
      } else if (type === 'L') {
        cur = { x: Number(cmd[1]), y: Number(cmd[2]) };
        currentRing.push(toScene(cur.x - off.x, cur.y - off.y));
      } else if (type === 'H') {
        cur = { x: Number(cmd[1]), y: cur.y };
        currentRing.push(toScene(cur.x - off.x, cur.y - off.y));
      } else if (type === 'V') {
        cur = { x: cur.x, y: Number(cmd[1]) };
        currentRing.push(toScene(cur.x - off.x, cur.y - off.y));
      } else if (type === 'Q') {
        const p1 = { x: Number(cmd[1]), y: Number(cmd[2]) };
        const p2 = { x: Number(cmd[3]), y: Number(cmd[4]) };
        for (const s of sampleQuadBezier(cur, p1, p2, 5)) {
          currentRing.push(toScene(s.x - off.x, s.y - off.y));
        }
        cur = p2;
      } else if (type === 'C') {
        const p1 = { x: Number(cmd[1]), y: Number(cmd[2]) };
        const p2 = { x: Number(cmd[3]), y: Number(cmd[4]) };
        const p3 = { x: Number(cmd[5]), y: Number(cmd[6]) };
        for (const s of sampleCubicBezier(cur, p1, p2, p3, 6)) {
          currentRing.push(toScene(s.x - off.x, s.y - off.y));
        }
        cur = p3;
      } else if (type === 'Z') {
        cur = { ...start };
      }
    }
    flushRing();
    if (rings.length > 0) return rings;
  }

  return null;
}

function hasObjectFill(target: fabric.FabricObject): boolean {
  const fill = target.fill;
  if (!fill) return false;
  if (typeof fill === 'string') {
    const f = fill.trim().toLowerCase();
    return f !== '' && f !== 'transparent' && f !== 'none';
  }
  return true; // gradient or pattern
}

function ringToSvgSubpath(pts: { x: number; y: number }[]): string {
  if (pts.length < 3) return '';
  return (
    pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ') + ' Z'
  );
}

const blockShadowGenerationMap = new WeakMap<fabric.FabricObject, number>();

export async function applyBlockShadowParamsToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  rawParams: Partial<BlockShadowParams>,
  options?: { lockForBlockShadowTool?: boolean }
): Promise<fabric.FabricObject> {
  const actual = resolveBlockShadowParent(canvas, target) || target;
  const parentId = ensureObjectId(actual, (actual as any).name || 'Object');

  const existing = extractTargetBlockShadowForUi(canvas, actual);
  const existingParams = existing.hasBlockShadow ? existing.params : DEFAULT_BLOCK_SHADOW_PARAMS;

  const params: BlockShadowParams = {
    offsetX:
      rawParams.offsetX !== undefined && Number.isFinite(rawParams.offsetX)
        ? Math.round(rawParams.offsetX * 10) / 10
        : existingParams.offsetX,
    offsetY:
      rawParams.offsetY !== undefined && Number.isFinite(rawParams.offsetY)
        ? Math.round(rawParams.offsetY * 10) / 10
        : existingParams.offsetY,
    color: normalizeBlockShadowHex(rawParams.color, existingParams.color),
    simplify: rawParams.simplify ?? existingParams.simplify,
    removeHoles: rawParams.removeHoles ?? existingParams.removeHoles,
    fromOutline: rawParams.fromOutline ?? existingParams.fromOutline,
    expandEnabled: rawParams.expandEnabled ?? existingParams.expandEnabled,
    expandPx:
      rawParams.expandPx !== undefined && Number.isFinite(rawParams.expandPx)
        ? Math.max(0, Math.min(200, Math.round(rawParams.expandPx * 10) / 10))
        : existingParams.expandPx,
    overprint: rawParams.overprint ?? existingParams.overprint,
  };

  const nextGen = (blockShadowGenerationMap.get(actual) || 0) + 1;
  blockShadowGenerationMap.set(actual, nextGen);

  const rings = extractBoundaryRings(actual);
  const dx = params.offsetX;
  const dy = params.offsetY;
  const outlineMargin =
    params.fromOutline && typeof actual.strokeWidth === 'number' && actual.strokeWidth > 0
      ? actual.strokeWidth * 0.5
      : 0;
  const expandMargin = params.expandEnabled ? Math.max(0, params.expandPx) : 0;
  const totalOutwardExpand = outlineMargin + expandMargin;

  let builtShadowObj: fabric.FabricObject | null = null;

  if (rings && rings.length > 0) {
    // Sort rings by area descending so largest outer contour comes first; optionally skip inner hole rings
    const sorted = [...rings].sort((a, b) => Math.abs(ringSignedArea(b)) - Math.abs(ringSignedArea(a)));
    const activeRings = params.removeHoles ? [sorted[0]] : sorted;
    const isHollowTarget = !hasObjectFill(actual) && !params.removeHoles;

    const svgParts: string[] = [];

    for (const ring of activeRings) {
      const shiftedRing = ring.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      if (!isHollowTarget) {
        // Solid front + back caps (filled object or Remove Holes enabled)
        svgParts.push(ringToSvgSubpath(ring));
        svgParts.push(ringToSvgSubpath(shiftedRing));
      }
      // Sweep every edge quad from ring[i] -> ring[i+1] -> shiftedRing[i+1] -> shiftedRing[i]
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        const p0 = ring[i];
        const p1 = ring[j];
        const q1 = shiftedRing[j];
        const q0 = shiftedRing[i];
        svgParts.push(
          `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${q1.x.toFixed(2)} ${q1.y.toFixed(2)} L ${q0.x.toFixed(2)} ${q0.y.toFixed(2)} Z`
        );
      }
    }

    const svgD = svgParts.join(' ');
    const shadowPath = new fabric.Path(svgD, {
      originX: 'left',
      originY: 'top',
      fill: params.color,
      fillRule: 'nonzero',
      stroke: totalOutwardExpand > 0 ? params.color : params.color,
      strokeWidth: totalOutwardExpand > 0 ? totalOutwardExpand * 2 : 0.4,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      strokeUniform: true,
      paintFirst: 'fill',
      opacity: params.overprint ? 0.88 : 1,
      globalCompositeOperation: params.overprint ? 'multiply' : 'source-over',
      shadow: null,
    });
    builtShadowObj = shadowPath;
  } else {
    // Fallback for IText / Text / Textbox / Group / Image: multi-step clone sweep
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(8, Math.min(28, Math.round(dist / 2)));
    const clones: fabric.FabricObject[] = [];
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      const c = await actual.clone();
      c.set({
        left: (actual.left || 0) + dx * t,
        top: (actual.top || 0) + dy * t,
        fill: params.color,
        stroke: params.color,
        strokeWidth: totalOutwardExpand > 0 ? totalOutwardExpand * 2 : c.strokeWidth || 0,
        strokeLineJoin: 'round',
        strokeLineCap: 'round',
        shadow: null,
        opacity: 1,
      });
      disableObjectCaching(c);
      clones.push(c);
    }
    if (blockShadowGenerationMap.get(actual) !== nextGen) {
      return actual;
    }
    const grp = new fabric.Group(clones, {
      subTargetCheck: false,
      opacity: params.overprint ? 0.88 : 1,
      globalCompositeOperation: params.overprint ? 'multiply' : 'source-over',
    });
    builtShadowObj = grp;
  }

  if (blockShadowGenerationMap.get(actual) !== nextGen || !builtShadowObj) {
    return actual;
  }

  const prevShadowId = ((actual as any).blockShadowConfig as BlockShadowConfigMeta | undefined)?.blockShadowId;
  const oldObjects = canvas.getObjects().filter(
    (o) =>
      ((o as any).isBlockShadow && (o as any).blockShadowParentId === parentId) ||
      (prevShadowId && (o as any).id === prevShadowId)
  );
  oldObjects.forEach((o) => canvas.remove(o));

  const blockShadowId = ensureObjectId(builtShadowObj, `${(actual as any).name || 'Object'} Block Shadow`);
  (builtShadowObj as any).isBlockShadow = true;
  (builtShadowObj as any).blockShadowId = blockShadowId;
  (builtShadowObj as any).blockShadowParentId = parentId;
  (builtShadowObj as any).hasEffects = true;
  builtShadowObj.set({
    selectable: options?.lockForBlockShadowTool ? false : true,
    evented: true,
    hasControls: options?.lockForBlockShadowTool ? false : true,
    lockMovementX: options?.lockForBlockShadowTool ? true : false,
    lockMovementY: options?.lockForBlockShadowTool ? true : false,
  });
  disableObjectCaching(builtShadowObj);

  (actual as any).blockShadowConfig = {
    blockShadowId,
    parentId,
    params,
  } as BlockShadowConfigMeta;
  (actual as any).hasEffects = true;

  const insertIdx = Math.max(0, canvas.getObjects().indexOf(actual));
  canvas.insertAt(insertIdx, builtShadowObj);

  if (options?.lockForBlockShadowTool) {
    actual.set({
      selectable: false,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true,
      lockMovementY: true,
    });
  }

  canvas.setActiveObject(actual);
  canvas.requestRenderAll();
  return actual;
}

export function removeBlockShadowFromTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): { parent: fabric.FabricObject; removed: number } {
  const actual = resolveBlockShadowParent(canvas, target) || target;
  const parentId = (actual as any).id;
  const prevId = ((actual as any).blockShadowConfig as BlockShadowConfigMeta | undefined)?.blockShadowId;
  const toRemove = canvas.getObjects().filter(
    (o) =>
      ((o as any).isBlockShadow && parentId && (o as any).blockShadowParentId === parentId) ||
      (prevId && (o as any).id === prevId)
  );
  toRemove.forEach((o) => canvas.remove(o));
  delete (actual as any).blockShadowConfig;
  canvas.requestRenderAll();
  return { parent: actual, removed: toRemove.length };
}

export async function refreshBlockShadowIfLinked(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): Promise<void> {
  if (!canvas || !target) return;
  const actual = resolveBlockShadowParent(canvas, target) || target;
  const meta = (actual as any).blockShadowConfig as BlockShadowConfigMeta | undefined;
  if (!meta || !meta.params) return;
  await applyBlockShadowParamsToTarget(canvas, actual, meta.params);
}
