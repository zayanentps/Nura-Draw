import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export interface FitTextToPathOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  charSpacing: number;
  distance: number; // Offset distance from path in px (default 6)
  offsetRatio: number; // 0..1 position along path (0.5 = centered at top for closed paths)
  placement: 'outside' | 'on_path' | 'inside';
  orientation: 'follow' | 'vertical';
  flipSide: boolean; // false = top/outside left-to-right; true = bottom arc left-to-right
  pathObjectId?: string;
}

interface PolyPoint {
  x: number;
  y: number;
}

interface SampledPolyline {
  points: PolyPoint[];
  cumLen: number[];
  totalLen: number;
  closed: boolean;
}

export function isTextObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  return obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
}

export function isTextOnPathObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  return Boolean((obj as any).isTextOnPath || (obj as any).customType === 'text_on_path');
}

export function isPathTargetObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  if (isTextObject(obj) || isTextOnPathObject(obj)) return false;
  return (
    obj.type === 'ellipse' ||
    obj.type === 'circle' ||
    obj.type === 'rect' ||
    obj.type === 'triangle' ||
    obj.type === 'polygon' ||
    obj.type === 'polyline' ||
    obj.type === 'line' ||
    obj.type === 'path'
  );
}

function transformLocalPoint(m: number[], lx: number, ly: number): PolyPoint {
  return {
    x: m[0] * lx + m[2] * ly + m[4],
    y: m[1] * lx + m[3] * ly + m[5],
  };
}

function subdivideLine(p0: PolyPoint, p1: PolyPoint, steps: number, out: PolyPoint[], skipFirst = false) {
  const start = skipFirst ? 1 : 0;
  for (let i = start; i <= steps; i++) {
    const t = i / steps;
    out.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
    });
  }
}

function sampleCubicBezier(
  p0: PolyPoint,
  p1: PolyPoint,
  p2: PolyPoint,
  p3: PolyPoint,
  steps: number,
  out: PolyPoint[]
) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    out.push({
      x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
      y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
    });
  }
}

function sampleQuadraticBezier(
  p0: PolyPoint,
  p1: PolyPoint,
  p2: PolyPoint,
  steps: number,
  out: PolyPoint[]
) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
}

function computeSignedArea(pts: PolyPoint[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

export function extractWorldPolyline(pathObj: fabric.FabricObject, flipSide = false): SampledPolyline | null {
  const m = pathObj.calcTransformMatrix(false);
  const type = pathObj.type;
  const localPts: PolyPoint[] = [];
  let closed = false;

  if (type === 'circle' || type === 'ellipse') {
    const rx =
      type === 'circle'
        ? (pathObj as fabric.Circle).radius || (pathObj.width || 0) / 2
        : (pathObj as fabric.Ellipse).rx || (pathObj.width || 0) / 2;
    const ry =
      type === 'circle'
        ? (pathObj as fabric.Circle).radius || (pathObj.height || 0) / 2
        : (pathObj as fabric.Ellipse).ry || (pathObj.height || 0) / 2;
    if (rx <= 0 || ry <= 0) return null;
    const segs = 360;
    for (let i = 0; i < segs; i++) {
      const theta = Math.PI / 2 + (i / segs) * Math.PI * 2;
      localPts.push({ x: rx * Math.cos(theta), y: ry * Math.sin(theta) });
    }
    closed = true;
  } else if (type === 'rect') {
    const w = pathObj.width || 0;
    const h = pathObj.height || 0;
    if (w <= 0 || h <= 0) return null;
    const rx = Math.min(w / 2, Math.max(0, (pathObj as any).rx || 0));
    const ry = Math.min(h / 2, Math.max(0, (pathObj as any).ry || 0));
    const x0 = -w / 2;
    const y0 = -h / 2;
    const x1 = w / 2;
    const y1 = h / 2;
    const arcSegs = 16;

    // Start at top-left after corner, walk clockwise
    localPts.push({ x: x0 + rx, y: y0 });
    subdivideLine({ x: x0 + rx, y: y0 }, { x: x1 - rx, y: y0 }, 24, localPts, true);
    if (rx > 0 || ry > 0) {
      for (let i = 1; i <= arcSegs; i++) {
        const a = -Math.PI / 2 + (i / arcSegs) * (Math.PI / 2);
        localPts.push({ x: x1 - rx + rx * Math.cos(a), y: y0 + ry + ry * Math.sin(a) });
      }
    }
    subdivideLine({ x: x1, y: y0 + ry }, { x: x1, y: y1 - ry }, 24, localPts, true);
    if (rx > 0 || ry > 0) {
      for (let i = 1; i <= arcSegs; i++) {
        const a = 0 + (i / arcSegs) * (Math.PI / 2);
        localPts.push({ x: x1 - rx + rx * Math.cos(a), y: y1 - ry + ry * Math.sin(a) });
      }
    }
    subdivideLine({ x: x1 - rx, y: y1 }, { x: x0 + rx, y: y1 }, 24, localPts, true);
    if (rx > 0 || ry > 0) {
      for (let i = 1; i <= arcSegs; i++) {
        const a = Math.PI / 2 + (i / arcSegs) * (Math.PI / 2);
        localPts.push({ x: x0 + rx + rx * Math.cos(a), y: y1 - ry + ry * Math.sin(a) });
      }
    }
    subdivideLine({ x: x0, y: y1 - ry }, { x: x0, y: y0 + ry }, 24, localPts, true);
    if (rx > 0 || ry > 0) {
      for (let i = 1; i < arcSegs; i++) {
        const a = Math.PI + (i / arcSegs) * (Math.PI / 2);
        localPts.push({ x: x0 + rx + rx * Math.cos(a), y: y0 + ry + ry * Math.sin(a) });
      }
    }
    closed = true;
  } else if (type === 'triangle') {
    const w = pathObj.width || 0;
    const h = pathObj.height || 0;
    if (w <= 0 || h <= 0) return null;
    const p0 = { x: 0, y: -h / 2 };
    const p1 = { x: w / 2, y: h / 2 };
    const p2 = { x: -w / 2, y: h / 2 };
    localPts.push(p0);
    subdivideLine(p0, p1, 24, localPts, true);
    subdivideLine(p1, p2, 24, localPts, true);
    subdivideLine(p2, p0, 24, localPts, true);
    localPts.pop();
    closed = true;
  } else if (type === 'line') {
    const lp = (pathObj as fabric.Line).calcLinePoints();
    subdivideLine({ x: lp.x1, y: lp.y1 }, { x: lp.x2, y: lp.y2 }, 40, localPts, false);
    closed = false;
  } else if (type === 'polygon' || type === 'polyline') {
    const pts = (pathObj as any).points as { x: number; y: number }[] | undefined;
    if (!pts || pts.length < 2) return null;
    const ox = (pathObj as any).pathOffset?.x || 0;
    const oy = (pathObj as any).pathOffset?.y || 0;
    const shifted = pts.map((p) => ({ x: p.x - ox, y: p.y - oy }));
    localPts.push(shifted[0]);
    for (let i = 1; i < shifted.length; i++) {
      subdivideLine(shifted[i - 1], shifted[i], 16, localPts, true);
    }
    if (type === 'polygon') {
      subdivideLine(shifted[shifted.length - 1], shifted[0], 16, localPts, true);
      localPts.pop();
      closed = true;
    } else {
      closed = false;
    }
  } else if (type === 'path') {
    const cmds = (pathObj as fabric.Path).path as any[][] | undefined;
    if (!cmds || cmds.length === 0) return null;
    const ox = (pathObj as any).pathOffset?.x || 0;
    const oy = (pathObj as any).pathOffset?.y || 0;
    let cur: PolyPoint = { x: -ox, y: -oy };
    let start: PolyPoint = { ...cur };
    let hasClose = false;

    for (const cmd of cmds) {
      const op = String(cmd[0]).toUpperCase();
      if (op === 'M') {
        cur = { x: Number(cmd[1]) - ox, y: Number(cmd[2]) - oy };
        start = { ...cur };
        localPts.push({ ...cur });
      } else if (op === 'L') {
        const next = { x: Number(cmd[1]) - ox, y: Number(cmd[2]) - oy };
        subdivideLine(cur, next, 16, localPts, true);
        cur = next;
      } else if (op === 'H') {
        const next = { x: Number(cmd[1]) - ox, y: cur.y };
        subdivideLine(cur, next, 16, localPts, true);
        cur = next;
      } else if (op === 'V') {
        const next = { x: cur.x, y: Number(cmd[1]) - oy };
        subdivideLine(cur, next, 16, localPts, true);
        cur = next;
      } else if (op === 'C') {
        const p1 = { x: Number(cmd[1]) - ox, y: Number(cmd[2]) - oy };
        const p2 = { x: Number(cmd[3]) - ox, y: Number(cmd[4]) - oy };
        const p3 = { x: Number(cmd[5]) - ox, y: Number(cmd[6]) - oy };
        sampleCubicBezier(cur, p1, p2, p3, 32, localPts);
        cur = p3;
      } else if (op === 'Q') {
        const p1 = { x: Number(cmd[1]) - ox, y: Number(cmd[2]) - oy };
        const p2 = { x: Number(cmd[3]) - ox, y: Number(cmd[4]) - oy };
        sampleQuadraticBezier(cur, p1, p2, 24, localPts);
        cur = p2;
      } else if (op === 'Z') {
        hasClose = true;
        if (Math.hypot(start.x - cur.x, start.y - cur.y) > 0.5) {
          subdivideLine(cur, start, 12, localPts, true);
        }
        cur = { ...start };
      }
    }
    if (localPts.length < 2) return null;
    closed = hasClose || Math.hypot(localPts[0].x - localPts[localPts.length - 1].x, localPts[0].y - localPts[localPts.length - 1].y) < 2.5;
    if (closed && Math.hypot(localPts[0].x - localPts[localPts.length - 1].x, localPts[0].y - localPts[localPts.length - 1].y) < 0.5) {
      localPts.pop();
    }
  } else {
    return null;
  }

  if (localPts.length < 2) return null;

  // Transform all local points into canvas world coordinates
  let worldPts = localPts.map((p) => transformLocalPoint(m, p.x, p.y));

  // Deduplicate adjacent nearly-identical points
  worldPts = worldPts.filter((p, idx) => {
    if (idx === 0) return true;
    const prev = worldPts[idx - 1];
    return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.05;
  });
  if (worldPts.length < 2) return null;

  if (closed) {
    const area = computeSignedArea(worldPts);
    // For top arc left-to-right: clockwise in screen coords (+X right, +Y down) means area > 0.
    // For bottom arc left-to-right (flipSide=true): counter-clockwise means area < 0.
    const wantClockwise = !flipSide;
    if ((wantClockwise && area < 0) || (!wantClockwise && area > 0)) {
      worldPts.reverse();
    }

    // Rotate cyclic array so index 0 is the opposite seam:
    // - Top arc (wantClockwise): index 0 = bottom-most point (max Y), so 50% = top apex!
    // - Bottom arc (flipSide): index 0 = top-most point (min Y), so 50% = bottom apex!
    const centerX = worldPts.reduce((acc, p) => acc + p.x, 0) / worldPts.length;
    let seamIdx = 0;
    for (let i = 1; i < worldPts.length; i++) {
      const a = worldPts[i];
      const b = worldPts[seamIdx];
      const betterY = flipSide ? a.y < b.y - 0.5 : a.y > b.y + 0.5;
      const sameYBetterX =
        Math.abs(a.y - b.y) <= 0.5 && Math.abs(a.x - centerX) < Math.abs(b.x - centerX);
      if (betterY || sameYBetterX) {
        seamIdx = i;
      }
    }
    worldPts = [...worldPts.slice(seamIdx), ...worldPts.slice(0, seamIdx)];
    worldPts.push({ ...worldPts[0] });
  } else {
    // Open path: ensure left-to-right reading order unless user flips
    const first = worldPts[0];
    const last = worldPts[worldPts.length - 1];
    if (last.x < first.x - 10) {
      worldPts.reverse();
    }
  }

  // Compute cumulative arc length
  const cumLen: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < worldPts.length; i++) {
    const d = Math.hypot(worldPts[i].x - worldPts[i - 1].x, worldPts[i].y - worldPts[i - 1].y);
    totalLen += d;
    cumLen.push(totalLen);
  }
  if (totalLen < 1) return null;

  return { points: worldPts, cumLen, totalLen, closed };
}

function samplePolylineAtArc(
  poly: SampledPolyline,
  arcDist: number,
  flipSide: boolean
): { x: number; y: number; tx: number; ty: number; nx: number; ny: number } {
  const { points, cumLen, totalLen, closed } = poly;
  let s = arcDist;

  if (closed) {
    s = ((s % totalLen) + totalLen) % totalLen;
  } else if (s < 0) {
    // Extend smoothly along start tangent
    const p0 = points[0];
    const p1 = points[1];
    const segLen = Math.max(0.0001, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const tx = (p1.x - p0.x) / segLen;
    const ty = (p1.y - p0.y) / segLen;
    const [nx, ny] = flipSide ? [-ty, tx] : [ty, -tx];
    return { x: p0.x + tx * s, y: p0.y + ty * s, tx, ty, nx, ny };
  } else if (s > totalLen) {
    const pn = points[points.length - 1];
    const prev = points[points.length - 2];
    const segLen = Math.max(0.0001, Math.hypot(pn.x - prev.x, pn.y - prev.y));
    const tx = (pn.x - prev.x) / segLen;
    const ty = (pn.y - prev.y) / segLen;
    const extra = s - totalLen;
    const [nx, ny] = flipSide ? [-ty, tx] : [ty, -tx];
    return { x: pn.x + tx * extra, y: pn.y + ty * extra, tx, ty, nx, ny };
  }

  // Binary search segment containing arc length s
  let lo = 0;
  let hi = cumLen.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cumLen[mid] <= s) lo = mid;
    else hi = mid - 1;
  }

  const s0 = cumLen[lo];
  const s1 = cumLen[lo + 1];
  const segLen = Math.max(0.0001, s1 - s0);
  const t = (s - s0) / segLen;
  const a = points[lo];
  const b = points[lo + 1];
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;

  // Smooth tangent using neighboring span across vertices to avoid jitter on curved paths
  const span = Math.min(totalLen * 0.02, 4);
  const prevIdx = Math.max(0, lo - 1);
  const nextIdx = Math.min(points.length - 1, lo + 2);
  let dx = points[nextIdx].x - points[prevIdx].x;
  let dy = points[nextIdx].y - points[prevIdx].y;
  let tLen = Math.hypot(dx, dy);
  if (tLen < 0.0001 || (closed && span < 0.001)) {
    dx = b.x - a.x;
    dy = b.y - a.y;
    tLen = Math.max(0.0001, Math.hypot(dx, dy));
  }
  const tx = dx / tLen;
  const ty = dy / tLen;
  // Clockwise screen coords -> outward normal is (ty, -tx). Counter-clockwise (flipSide) -> outward normal is (-ty, tx).
  const [nx, ny] = flipSide ? [-ty, tx] : [ty, -tx];

  return { x, y, tx, ty, nx, ny };
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d')!;
  }
  return measureCtx;
}

export function buildTextOnPathGroup(
  pathObj: fabric.FabricObject,
  rawOptions: Partial<FitTextToPathOptions> & { text: string }
): fabric.Group | null {
  const options: FitTextToPathOptions = {
    text: rawOptions.text || 'Text Along Path',
    fontFamily: rawOptions.fontFamily || 'Arial',
    fontSize: Math.max(6, Number(rawOptions.fontSize) || 28),
    fontWeight: rawOptions.fontWeight || 'normal',
    fontStyle: rawOptions.fontStyle || 'normal',
    fill: rawOptions.fill && rawOptions.fill !== 'transparent' ? rawOptions.fill : '#111827',
    stroke: rawOptions.stroke || 'transparent',
    strokeWidth: Number(rawOptions.strokeWidth) || 0,
    charSpacing: Number(rawOptions.charSpacing) || 0,
    distance: rawOptions.distance !== undefined ? Number(rawOptions.distance) : 6,
    offsetRatio: rawOptions.offsetRatio !== undefined ? Number(rawOptions.offsetRatio) : 0.5,
    placement: rawOptions.placement || 'outside',
    orientation: rawOptions.orientation || 'follow',
    flipSide: Boolean(rawOptions.flipSide),
    pathObjectId: rawOptions.pathObjectId || (pathObj as any).id,
  };

  const poly = extractWorldPolyline(pathObj, options.flipSide);
  if (!poly) return null;

  const chars = Array.from(options.text);
  if (chars.length === 0) return null;

  // Measure glyph advances with kerning pairs via Canvas 2D
  const ctx = getMeasureContext();
  const fontPrefix = `${options.fontStyle === 'italic' ? 'italic ' : ''}${
    options.fontWeight === 'bold' || options.fontWeight === '700' ? 'bold ' : ''
  }`;
  ctx.font = `${fontPrefix}${options.fontSize}px "${options.fontFamily}", Arial, sans-serif`;

  const extraSpacing = (options.charSpacing / 1000) * options.fontSize;
  const advances: number[] = [];
  let prevWidth = 0;
  for (let i = 0; i < chars.length; i++) {
    const prefix = chars.slice(0, i + 1).join('');
    const nextWidth = ctx.measureText(prefix).width;
    const adv = Math.max(options.fontSize * 0.18, nextWidth - prevWidth) + extraSpacing;
    advances.push(adv);
    prevWidth = nextWidth;
  }

  const totalTextWidth = advances.reduce((sum, w) => sum + w, 0);
  const centerArc = Math.max(0, Math.min(1, options.offsetRatio)) * poly.totalLen;
  const startArc = centerArc - totalTextWidth / 2;

  // Measure uniform line box height from Fabric Text so all baselines align cleanly on a concentric arc
  const sampleMetric = new fabric.Text('Tg', {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight as any,
    fontStyle: options.fontStyle as any,
  });
  const glyphBoxHeight = sampleMetric.height || options.fontSize * 1.13;

  // Compute signed normal shift from the path curve
  let normalShift = 0;
  if (options.placement === 'outside') {
    normalShift = options.flipSide
      ? options.distance + glyphBoxHeight * 0.42
      : options.distance + glyphBoxHeight * 0.36;
  } else if (options.placement === 'inside') {
    normalShift = options.flipSide
      ? -(options.distance + glyphBoxHeight * 0.36)
      : -(options.distance + glyphBoxHeight * 0.42);
  } else {
    normalShift = options.distance;
  }

  const glyphObjects: fabric.Text[] = [];
  let cursorArc = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const adv = advances[i];
    const midArc = startArc + cursorArc + adv / 2;
    cursorArc += adv;

    if (ch.trim() === '') continue;

    const sample = samplePolylineAtArc(poly, midArc, options.flipSide);
    const gx = sample.x + sample.nx * normalShift;
    const gy = sample.y + sample.ny * normalShift;
    const angleDeg =
      options.orientation === 'vertical' ? 0 : (Math.atan2(sample.ty, sample.tx) * 180) / Math.PI;

    const glyph = new fabric.Text(ch, {
      left: gx,
      top: gy,
      originX: 'center',
      originY: 'center',
      angle: angleDeg,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      fontWeight: options.fontWeight as any,
      fontStyle: options.fontStyle as any,
      fill: options.fill,
      stroke: options.strokeWidth > 0 && options.stroke !== 'transparent' ? options.stroke : undefined,
      strokeWidth: options.strokeWidth,
      objectCaching: false,
    });
    glyphObjects.push(glyph);
  }

  if (glyphObjects.length === 0) return null;

  const group = new fabric.Group(glyphObjects, {
    subTargetCheck: false,
    objectCaching: false,
  });

  (group as any).isTextOnPath = true;
  (group as any).customType = 'text_on_path';
  (group as any).textOnPathData = {
    ...options,
    pathObjectId: (pathObj as any).id || options.pathObjectId,
  };
  disableObjectCaching(group);
  ensureObjectId(group, `Text on Path: ${options.text.slice(0, 20)}`);
  group.setCoords();

  return group;
}

export function reflowTextOnPathGroup(
  canvas: fabric.Canvas,
  existingGroup: fabric.Group,
  patch?: Partial<FitTextToPathOptions>
): fabric.Group | null {
  const data = ((existingGroup as any).textOnPathData || {}) as FitTextToPathOptions;
  const pathObj = canvas.getObjects().find((o) => (o as any).id === data.pathObjectId);
  if (!pathObj) return null;

  const nextOpts: FitTextToPathOptions = {
    ...data,
    ...patch,
    text: patch?.text !== undefined ? patch.text : data.text || 'Text Along Path',
  };

  const rebuilt = buildTextOnPathGroup(pathObj, nextOpts);
  if (!rebuilt) return null;

  // Preserve original group ID & stacking position
  (rebuilt as any).id = (existingGroup as any).id || (rebuilt as any).id;
  const objects = canvas.getObjects();
  const prevIdx = objects.indexOf(existingGroup);
  const wasActive = canvas.getActiveObject() === existingGroup;

  canvas.remove(existingGroup);
  canvas.add(rebuilt);
  if (prevIdx >= 0 && typeof canvas.moveObjectTo === 'function') {
    canvas.moveObjectTo(rebuilt, prevIdx);
  }
  if (wasActive) {
    canvas.setActiveObject(rebuilt);
  }
  rebuilt.setCoords();
  canvas.requestRenderAll();
  return rebuilt;
}

export function reflowLinkedTextsForPath(canvas: fabric.Canvas, pathObj: fabric.FabricObject): boolean {
  const pathId = (pathObj as any)?.id;
  if (!pathId) return false;
  const linked = canvas
    .getObjects()
    .filter((o) => isTextOnPathObject(o) && (o as any).textOnPathData?.pathObjectId === pathId);

  if (linked.length === 0) return false;
  for (const grp of linked) {
    reflowTextOnPathGroup(canvas, grp as fabric.Group);
  }
  return true;
}

export function straightenTextOnPathToIText(
  canvas: fabric.Canvas,
  textOnPathGroup: fabric.Group
): fabric.IText {
  const data = ((textOnPathGroup as any).textOnPathData || {}) as Partial<FitTextToPathOptions>;
  const center = textOnPathGroup.getCenterPoint();
  const itext = new fabric.IText(data.text || 'Text', {
    left: center.x,
    top: center.y,
    originX: 'center',
    originY: 'center',
    fontFamily: data.fontFamily || 'Arial',
    fontSize: data.fontSize || 28,
    fontWeight: (data.fontWeight as any) || 'normal',
    fontStyle: (data.fontStyle as any) || 'normal',
    fill: data.fill || '#111827',
    stroke: data.strokeWidth && data.strokeWidth > 0 ? data.stroke : undefined,
    strokeWidth: data.strokeWidth || 0,
    charSpacing: data.charSpacing || 0,
    objectCaching: false,
  });
  ensureObjectId(itext, 'Artistic Text');
  disableObjectCaching(itext);

  const objects = canvas.getObjects();
  const prevIdx = objects.indexOf(textOnPathGroup);
  canvas.remove(textOnPathGroup);
  canvas.add(itext);
  if (prevIdx >= 0 && typeof canvas.moveObjectTo === 'function') {
    canvas.moveObjectTo(itext, prevIdx);
  }
  canvas.setActiveObject(itext);
  itext.setCoords();
  canvas.requestRenderAll();
  return itext;
}
