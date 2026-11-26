import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';
import { convertObjectToCurves } from './curveEngine';

export type EnvelopeMode = 'straight' | 'single_arc' | 'double_arc' | 'unconstrained';

export type EnvelopeNodeId = 'tl' | 'tm' | 'tr' | 'rm' | 'br' | 'bm' | 'bl' | 'lm';

export interface EnvelopePoint {
  x: number;
  y: number;
}

export interface EnvelopeCage {
  tl: EnvelopePoint;
  tm: EnvelopePoint;
  tr: EnvelopePoint;
  rm: EnvelopePoint;
  br: EnvelopePoint;
  bm: EnvelopePoint;
  bl: EnvelopePoint;
  lm: EnvelopePoint;
}

export interface EnvelopeSegmentUV {
  startUV: { u: number; v: number };
  samples: { u: number; v: number }[];
}

export interface EnvelopeSubpathUV {
  closed: boolean;
  segments: EnvelopeSegmentUV[];
}

export interface EnvelopeBaseSnapshot {
  minX: number;
  minY: number;
  width: number;
  height: number;
  subpaths: EnvelopeSubpathUV[];
  origSvgD: string;
}

export interface EnvelopeConfigMeta {
  mode: EnvelopeMode;
  cage: EnvelopeCage;
  activeNode: EnvelopeNodeId;
  keepLines?: boolean;
  lastBounds?: { left: number; top: number; width: number; height: number };
  base: EnvelopeBaseSnapshot;
}

export interface EnvelopePreset {
  id: string;
  label: string;
  mode: EnvelopeMode;
  buildCage: (minX: number, minY: number, width: number, height: number, amount?: number) => EnvelopeCage;
}

export const DEFAULT_ENVELOPE_MODE: EnvelopeMode = 'single_arc';

const CLAMP_CURVE_SEGMENTS = 10;

export function createRectangularCage(
  minX: number,
  minY: number,
  width: number,
  height: number
): EnvelopeCage {
  const maxX = minX + width;
  const maxY = minY + height;
  const midX = minX + width / 2;
  const midY = minY + height / 2;
  return {
    tl: { x: minX, y: minY },
    tm: { x: midX, y: minY },
    tr: { x: maxX, y: minY },
    rm: { x: maxX, y: midY },
    br: { x: maxX, y: maxY },
    bm: { x: midX, y: maxY },
    bl: { x: minX, y: maxY },
    lm: { x: minX, y: midY },
  };
}

export function cloneEnvelopeCage(cage: EnvelopeCage): EnvelopeCage {
  return {
    tl: { ...cage.tl },
    tm: { ...cage.tm },
    tr: { ...cage.tr },
    rm: { ...cage.rm },
    br: { ...cage.br },
    bm: { ...cage.bm },
    bl: { ...cage.bl },
    lm: { ...cage.lm },
  };
}

export const ENVELOPE_PRESETS: EnvelopePreset[] = [
  {
    id: 'inward_pinch',
    label: 'Inward Pinch',
    mode: 'single_arc',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const amt = Math.max(-0.9, Math.min(0.9, amount));
      const dx = w * 0.17 * (amt / 0.35);
      const dy = h * 0.2 * (amt / 0.35);
      base.tm.y += dy;
      base.bm.y -= dy;
      base.lm.x += dx;
      base.rm.x -= dx;
      return base;
    },
  },
  {
    id: 'bulge_out',
    label: 'Bulge Out',
    mode: 'single_arc',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const amt = Math.max(-0.9, Math.min(0.9, amount));
      const dx = w * 0.18 * (amt / 0.35);
      const dy = h * 0.22 * (amt / 0.35);
      base.tm.y -= dy;
      base.bm.y += dy;
      base.lm.x -= dx;
      base.rm.x += dx;
      return base;
    },
  },
  {
    id: 'arch_top',
    label: 'Arch Up',
    mode: 'single_arc',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dy = h * 0.32 * (amount / 0.35);
      base.tm.y -= dy;
      base.bm.y -= dy * 0.65;
      return base;
    },
  },
  {
    id: 'bridge_bottom',
    label: 'Bridge Bottom',
    mode: 'single_arc',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dy = h * 0.34 * (amount / 0.35);
      base.bm.y -= dy;
      return base;
    },
  },
  {
    id: 'perspective_top',
    label: 'Perspective Top',
    mode: 'straight',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dx = w * 0.18 * (amount / 0.35);
      base.tl.x += dx;
      base.tr.x -= dx;
      base.tm.x = (base.tl.x + base.tr.x) / 2;
      base.lm.x = (base.tl.x + base.bl.x) / 2;
      base.rm.x = (base.tr.x + base.br.x) / 2;
      return base;
    },
  },
  {
    id: 'flag_wave',
    label: 'Flag Wave',
    mode: 'double_arc',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dy = h * 0.22 * (amount / 0.35);
      base.tm.y -= dy;
      base.bm.y -= dy;
      return base;
    },
  },
  {
    id: 'skew_left',
    label: 'Slant Left',
    mode: 'straight',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dx = w * 0.2 * (amount / 0.35);
      base.tl.x -= dx;
      base.tr.x -= dx;
      base.tm.x = (base.tl.x + base.tr.x) / 2;
      base.lm.x = (base.tl.x + base.bl.x) / 2;
      base.rm.x = (base.tr.x + base.br.x) / 2;
      return base;
    },
  },
  {
    id: 'skew_right',
    label: 'Slant Right',
    mode: 'straight',
    buildCage: (x, y, w, h, amount = 0.35) => {
      const base = createRectangularCage(x, y, w, h);
      const dx = w * 0.2 * (amount / 0.35);
      base.tl.x += dx;
      base.tr.x += dx;
      base.tm.x = (base.tl.x + base.tr.x) / 2;
      base.lm.x = (base.tl.x + base.bl.x) / 2;
      base.rm.x = (base.tr.x + base.br.x) / 2;
      return base;
    },
  },
];

function lerpPt(a: EnvelopePoint, b: EnvelopePoint, t: number): EnvelopePoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function evalQuad(p0: EnvelopePoint, c: EnvelopePoint, p1: EnvelopePoint, t: number): EnvelopePoint {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y,
  };
}

function evalCubic(
  p0: EnvelopePoint,
  c1: EnvelopePoint,
  c2: EnvelopePoint,
  p1: EnvelopePoint,
  t: number
): EnvelopePoint {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * p1.y,
  };
}

function getDoubleArcControls(a: EnvelopePoint, m: EnvelopePoint, b: EnvelopePoint) {
  const midX = (a.x + b.x) * 0.5;
  const midY = (a.y + b.y) * 0.5;
  const dx = m.x - midX;
  const dy = m.y - midY;
  const vx = (b.x - a.x) * 0.25 + dx * 0.85;
  const vy = (b.y - a.y) * 0.25 + dy * 0.85;
  const q1 = { x: m.x - vx, y: m.y - vy };
  const q2 = { x: m.x + vx, y: m.y + vy };
  return { q1, q2 };
}

export function evalEnvelopeEdgeCurve(
  a: EnvelopePoint,
  m: EnvelopePoint,
  b: EnvelopePoint,
  t: number,
  mode: EnvelopeMode
): EnvelopePoint {
  const clamped = Math.max(0, Math.min(1, t));
  if (mode === 'straight') {
    return lerpPt(a, b, clamped);
  }
  if (mode === 'double_arc') {
    const { q1, q2 } = getDoubleArcControls(a, m, b);
    if (clamped <= 0.5) {
      return evalQuad(a, q1, m, clamped * 2);
    }
    return evalQuad(m, q2, b, (clamped - 0.5) * 2);
  }
  // single_arc & unconstrained: quadratic Bezier passing directly through midpoint M at t = 0.5
  const c = {
    x: 2 * m.x - 0.5 * (a.x + b.x),
    y: 2 * m.y - 0.5 * (a.y + b.y),
  };
  return evalQuad(a, c, b, clamped);
}

export function evalCoonsPatch(
  u: number,
  v: number,
  cage: EnvelopeCage,
  mode: EnvelopeMode
): EnvelopePoint {
  const topPt = evalEnvelopeEdgeCurve(cage.tl, cage.tm, cage.tr, u, mode);
  const botPt = evalEnvelopeEdgeCurve(cage.bl, cage.bm, cage.br, u, mode);
  const leftPt = evalEnvelopeEdgeCurve(cage.tl, cage.lm, cage.bl, v, mode);
  const rightPt = evalEnvelopeEdgeCurve(cage.tr, cage.rm, cage.br, v, mode);

  const w00 = (1 - u) * (1 - v);
  const w10 = u * (1 - v);
  const w01 = (1 - u) * v;
  const w11 = u * v;

  const bilinearX = w00 * cage.tl.x + w10 * cage.tr.x + w01 * cage.bl.x + w11 * cage.br.x;
  const bilinearY = w00 * cage.tl.y + w10 * cage.tr.y + w01 * cage.bl.y + w11 * cage.br.y;

  return {
    x: (1 - v) * topPt.x + v * botPt.x + (1 - u) * leftPt.x + u * rightPt.x - bilinearX,
    y: (1 - v) * topPt.y + v * botPt.y + (1 - u) * leftPt.y + u * rightPt.y - bilinearY,
  };
}

function edgeSvgCommands(
  a: EnvelopePoint,
  m: EnvelopePoint,
  b: EnvelopePoint,
  mode: EnvelopeMode,
  toScreen: (p: EnvelopePoint) => EnvelopePoint
): string {
  const A = toScreen(a);
  const M = toScreen(m);
  const B = toScreen(b);

  if (mode === 'straight') {
    return `L ${B.x.toFixed(2)} ${B.y.toFixed(2)}`;
  }
  if (mode === 'double_arc') {
    const { q1, q2 } = getDoubleArcControls(A, M, B);
    return `Q ${q1.x.toFixed(2)} ${q1.y.toFixed(2)} ${M.x.toFixed(2)} ${M.y.toFixed(2)} Q ${q2.x.toFixed(2)} ${q2.y.toFixed(2)} ${B.x.toFixed(2)} ${B.y.toFixed(2)}`;
  }
  const c = {
    x: 2 * M.x - 0.5 * (A.x + B.x),
    y: 2 * M.y - 0.5 * (A.y + B.y),
  };
  return `Q ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${B.x.toFixed(2)} ${B.y.toFixed(2)}`;
}

export function computeEnvelopeCageSvgPath(
  cage: EnvelopeCage,
  mode: EnvelopeMode,
  pan: { x: number; y: number } = { x: 0, y: 0 },
  zoomLevel: number = 1
): string {
  const toScreen = (p: EnvelopePoint): EnvelopePoint => ({
    x: pan.x + p.x * zoomLevel,
    y: pan.y + p.y * zoomLevel,
  });
  const start = toScreen(cage.tl);
  const top = edgeSvgCommands(cage.tl, cage.tm, cage.tr, mode, toScreen);
  const right = edgeSvgCommands(cage.tr, cage.rm, cage.br, mode, toScreen);
  const bottom = edgeSvgCommands(cage.br, cage.bm, cage.bl, mode, toScreen);
  const left = edgeSvgCommands(cage.bl, cage.lm, cage.tl, mode, toScreen);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ${top} ${right} ${bottom} ${left} Z`;
}

function clampHandle(hx: number, hy: number, segLen: number): EnvelopePoint {
  const hLen = Math.hypot(hx, hy);
  const maxLen = segLen * 0.44;
  if (hLen > maxLen && hLen > 1e-6) {
    const s = maxLen / hLen;
    return { x: hx * s, y: hy * s };
  }
  return { x: hx, y: hy };
}

function buildSegmentCubicSvg(pts: EnvelopePoint[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `L ${pts[1].x.toFixed(3)} ${pts[1].y.toFixed(3)}`;
  }
  const out: string[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segLen < 1e-4) {
      out.push(`L ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`);
      continue;
    }
    const t1Raw =
      i === 0
        ? { x: (p2.x - p1.x) / 3, y: (p2.y - p1.y) / 3 }
        : { x: (p2.x - p0.x) / 6, y: (p2.y - p0.y) / 6 };
    const t2Raw =
      i === n - 2
        ? { x: (p2.x - p1.x) / 3, y: (p2.y - p1.y) / 3 }
        : { x: (p3.x - p1.x) / 6, y: (p3.y - p1.y) / 6 };
    const h1 = clampHandle(t1Raw.x, t1Raw.y, segLen);
    const h2 = clampHandle(t2Raw.x, t2Raw.y, segLen);
    out.push(
      `C ${(p1.x + h1.x).toFixed(3)} ${(p1.y + h1.y).toFixed(3)} ${(p2.x - h2.x).toFixed(3)} ${(p2.y - h2.y).toFixed(3)} ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`
    );
  }
  return out.join(' ');
}

export function extractBaseSnapshotFromPath(pathObj: fabric.Path): EnvelopeBaseSnapshot {
  const cmds = (pathObj.path || []) as any[][];
  const m = pathObj.calcOwnMatrix();
  const off = pathObj.pathOffset || { x: 0, y: 0 };

  const toScene = (lx: number, ly: number): EnvelopePoint => {
    const pt = new fabric.Point(lx - off.x, ly - off.y).transform(m);
    return { x: pt.x, y: pt.y };
  };

  interface RawSegment {
    start: EnvelopePoint;
    samples: EnvelopePoint[];
  }
  interface RawSubpath {
    closed: boolean;
    segments: RawSegment[];
  }

  const rawSubpaths: RawSubpath[] = [];
  let curSub: RawSubpath | null = null;
  let curPt: EnvelopePoint = { x: 0, y: 0 };
  let startPt: EnvelopePoint = { x: 0, y: 0 };
  const origSvgParts: string[] = [];

  let curLocal = { x: 0, y: 0 };
  let startLocal = { x: 0, y: 0 };

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    const op = String(cmd[0]).toUpperCase();
    if (op === 'M') {
      curLocal = { x: Number(cmd[1]), y: Number(cmd[2]) };
      startLocal = { ...curLocal };
      const p = toScene(curLocal.x, curLocal.y);
      curSub = { closed: false, segments: [] };
      rawSubpaths.push(curSub);
      curPt = p;
      startPt = p;
      origSvgParts.push(`M ${p.x.toFixed(3)} ${p.y.toFixed(3)}`);
    } else if (op === 'L' || op === 'H' || op === 'V') {
      if (!curSub) {
        curSub = { closed: false, segments: [] };
        rawSubpaths.push(curSub);
      }
      if (op === 'L') {
        curLocal = { x: Number(cmd[1]), y: Number(cmd[2]) };
      } else if (op === 'H') {
        curLocal = { x: Number(cmd[1]), y: curLocal.y };
      } else {
        curLocal = { x: curLocal.x, y: Number(cmd[1]) };
      }
      const next = toScene(curLocal.x, curLocal.y);
      const samples: EnvelopePoint[] = [];
      for (let k = 1; k <= CLAMP_CURVE_SEGMENTS; k++) {
        samples.push(lerpPt(curPt, next, k / CLAMP_CURVE_SEGMENTS));
      }
      curSub.segments.push({ start: curPt, samples });
      curPt = next;
      origSvgParts.push(`L ${next.x.toFixed(3)} ${next.y.toFixed(3)}`);
    } else if (op === 'Q') {
      if (!curSub) {
        curSub = { closed: false, segments: [] };
        rawSubpaths.push(curSub);
      }
      const c = toScene(Number(cmd[1]), Number(cmd[2]));
      curLocal = { x: Number(cmd[3]), y: Number(cmd[4]) };
      const next = toScene(curLocal.x, curLocal.y);
      const samples: EnvelopePoint[] = [];
      for (let k = 1; k <= CLAMP_CURVE_SEGMENTS; k++) {
        samples.push(evalQuad(curPt, c, next, k / CLAMP_CURVE_SEGMENTS));
      }
      curSub.segments.push({ start: curPt, samples });
      curPt = next;
      origSvgParts.push(`Q ${c.x.toFixed(3)} ${c.y.toFixed(3)} ${next.x.toFixed(3)} ${next.y.toFixed(3)}`);
    } else if (op === 'C') {
      if (!curSub) {
        curSub = { closed: false, segments: [] };
        rawSubpaths.push(curSub);
      }
      const c1 = toScene(Number(cmd[1]), Number(cmd[2]));
      const c2 = toScene(Number(cmd[3]), Number(cmd[4]));
      curLocal = { x: Number(cmd[5]), y: Number(cmd[6]) };
      const next = toScene(curLocal.x, curLocal.y);
      const samples: EnvelopePoint[] = [];
      for (let k = 1; k <= CLAMP_CURVE_SEGMENTS; k++) {
        samples.push(evalCubic(curPt, c1, c2, next, k / CLAMP_CURVE_SEGMENTS));
      }
      curSub.segments.push({ start: curPt, samples });
      curPt = next;
      origSvgParts.push(
        `C ${c1.x.toFixed(3)} ${c1.y.toFixed(3)} ${c2.x.toFixed(3)} ${c2.y.toFixed(3)} ${next.x.toFixed(3)} ${next.y.toFixed(3)}`
      );
    } else if (op === 'Z') {
      if (curSub) {
        const distToStart = Math.hypot(curPt.x - startPt.x, curPt.y - startPt.y);
        if (distToStart > 0.25) {
          const samples: EnvelopePoint[] = [];
          for (let k = 1; k <= CLAMP_CURVE_SEGMENTS; k++) {
            samples.push(lerpPt(curPt, startPt, k / CLAMP_CURVE_SEGMENTS));
          }
          curSub.segments.push({ start: curPt, samples });
        }
        curSub.closed = true;
      }
      curLocal = { ...startLocal };
      curPt = startPt;
      origSvgParts.push('Z');
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sub of rawSubpaths) {
    for (const seg of sub.segments) {
      const allPts = [seg.start, ...seg.samples];
      for (const p of allPts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    const br = pathObj.getBoundingRect();
    minX = br.left;
    minY = br.top;
    maxX = br.left + Math.max(1, br.width);
    maxY = br.top + Math.max(1, br.height);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const subpaths: EnvelopeSubpathUV[] = rawSubpaths.map((sub) => ({
    closed: sub.closed,
    segments: sub.segments.map((seg) => ({
      startUV: {
        u: (seg.start.x - minX) / width,
        v: (seg.start.y - minY) / height,
      },
      samples: seg.samples.map((p) => ({
        u: (p.x - minX) / width,
        v: (p.y - minY) / height,
      })),
    })),
  }));

  return {
    minX,
    minY,
    width,
    height,
    subpaths,
    origSvgD: origSvgParts.join(' '),
  };
}

export function extractOrInitEnvelopeConfig(target: fabric.FabricObject): EnvelopeConfigMeta {
  const existing = (target as any).envelopeConfig as EnvelopeConfigMeta | undefined;
  if (existing && existing.cage && existing.base) {
    return {
      mode: existing.mode || DEFAULT_ENVELOPE_MODE,
      cage: cloneEnvelopeCage(existing.cage),
      activeNode: existing.activeNode || 'bl',
      keepLines: existing.keepLines,
      lastBounds: existing.lastBounds ? { ...existing.lastBounds } : undefined,
      base: existing.base,
    };
  }

  if (target.type === 'path') {
    const base = extractBaseSnapshotFromPath(target as fabric.Path);
    const cage = createRectangularCage(base.minX, base.minY, base.width, base.height);
    const br = target.getBoundingRect();
    return {
      mode: DEFAULT_ENVELOPE_MODE,
      cage,
      activeNode: 'bl',
      lastBounds: { left: br.left, top: br.top, width: br.width, height: br.height },
      base,
    };
  }

  const br = target.getBoundingRect();
  const minX = br.left;
  const minY = br.top;
  const width = Math.max(1, br.width);
  const height = Math.max(1, br.height);
  const cage = createRectangularCage(minX, minY, width, height);
  return {
    mode: DEFAULT_ENVELOPE_MODE,
    cage,
    activeNode: 'bl',
    lastBounds: { left: br.left, top: br.top, width: br.width, height: br.height },
    base: {
      minX,
      minY,
      width,
      height,
      subpaths: [],
      origSvgD: '',
    },
  };
}

export function buildWarpedSvgPath(
  base: EnvelopeBaseSnapshot,
  cage: EnvelopeCage,
  mode: EnvelopeMode
): string {
  const parts: string[] = [];
  for (const sub of base.subpaths) {
    if (sub.segments.length === 0) continue;
    const firstPt = evalCoonsPatch(sub.segments[0].startUV.u, sub.segments[0].startUV.v, cage, mode);
    parts.push(`M ${firstPt.x.toFixed(3)} ${firstPt.y.toFixed(3)}`);
    for (const seg of sub.segments) {
      const startPt = evalCoonsPatch(seg.startUV.u, seg.startUV.v, cage, mode);
      const pts: EnvelopePoint[] = [startPt];
      for (const s of seg.samples) {
        pts.push(evalCoonsPatch(s.u, s.v, cage, mode));
      }
      parts.push(buildSegmentCubicSvg(pts));
    }
    if (sub.closed) {
      parts.push('Z');
    }
  }
  return parts.join(' ');
}

function canConvertShapeToEnvelopePath(obj: fabric.FabricObject): boolean {
  return ['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'path'].includes(obj.type || '');
}

function replaceObjectWithCurvePath(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): fabric.Path | null {
  if (target.type === 'path') {
    return target as fabric.Path;
  }
  const converted = convertObjectToCurves(target);
  if (!converted) return null;

  // Preserve identity & attached effect configs across vector curve promotion
  (converted as any).id = (target as any).id || (converted as any).id;
  if ((target as any).name) (converted as any).name = (target as any).name;
  (converted as any).isLocked = (target as any).isLocked;
  (converted as any).blendConfig = (target as any).blendConfig;
  (converted as any).contourConfig = (target as any).contourConfig;
  (converted as any).extrudeConfig = (target as any).extrudeConfig;
  (converted as any).metallicEffectConfig = (target as any).metallicEffectConfig;
  (converted as any).preMetallicBackup = (target as any).preMetallicBackup;
  (converted as any).hasEffects = true;

  const objects = canvas.getObjects();
  const idx = objects.indexOf(target);
  canvas.remove(target);
  canvas.add(converted);
  if (idx >= 0 && typeof canvas.moveObjectTo === 'function') {
    canvas.moveObjectTo(converted, idx);
  }
  disableObjectCaching(converted);
  ensureObjectId(converted);
  return converted;
}

export function applySvgDataToPathObject(pathObj: fabric.Path, svgD: string) {
  if (!svgD.trim()) return;
  const tmp = new fabric.Path(svgD, {
    originX: 'left',
    originY: 'top',
    stroke: pathObj.stroke,
    strokeWidth: pathObj.strokeWidth,
    strokeUniform: pathObj.strokeUniform ?? true,
    strokeLineCap: pathObj.strokeLineCap,
    strokeLineJoin: pathObj.strokeLineJoin,
  });
  pathObj.set({
    path: tmp.path,
    width: tmp.width,
    height: tmp.height,
    pathOffset: tmp.pathOffset,
    left: tmp.left,
    top: tmp.top,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'left',
    originY: 'top',
    dirty: true,
  });
  pathObj.setCoords();
}

export function applyEnvelopeCageToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  cage: EnvelopeCage,
  mode: EnvelopeMode,
  options?: {
    activeNode?: EnvelopeNodeId;
    lockForEnvelopeTool?: boolean;
  }
): fabric.FabricObject {
  let working: fabric.FabricObject = target;
  let existingCfg = (target as any).envelopeConfig as EnvelopeConfigMeta | undefined;

  if (canConvertShapeToEnvelopePath(target) && target.type !== 'path') {
    const preSnapshotCfg = existingCfg;
    const promoted = replaceObjectWithCurvePath(canvas, target);
    if (promoted) {
      working = promoted;
      if (preSnapshotCfg && preSnapshotCfg.base && preSnapshotCfg.base.subpaths.length > 0) {
        existingCfg = preSnapshotCfg;
      } else {
        existingCfg = undefined;
      }
    }
  }

  let base: EnvelopeBaseSnapshot;
  if (existingCfg && existingCfg.base && (working.type !== 'path' || existingCfg.base.subpaths.length > 0)) {
    base = existingCfg.base;
  } else {
    const init = extractOrInitEnvelopeConfig(working);
    base = init.base;
  }

  if (working.type === 'path' && base.subpaths.length > 0) {
    const warpedD = buildWarpedSvgPath(base, cage, mode);
    applySvgDataToPathObject(working as fabric.Path, warpedD);
  } else {
    // Fallback for IText / Text / Group / Image: fit bounding box + affine skew approximation from cage
    const topVecX = cage.tr.x - cage.tl.x;
    const topVecY = cage.tr.y - cage.tl.y;
    const leftVecX = cage.bl.x - cage.tl.x;
    const leftVecY = cage.bl.y - cage.tl.y;

    const allPts = [cage.tl, cage.tm, cage.tr, cage.rm, cage.br, cage.bm, cage.bl, cage.lm];
    const minX = Math.min(...allPts.map((p) => p.x));
    const maxX = Math.max(...allPts.map((p) => p.x));
    const minY = Math.min(...allPts.map((p) => p.y));
    const maxY = Math.max(...allPts.map((p) => p.y));
    const newW = Math.max(8, maxX - minX);
    const newH = Math.max(8, maxY - minY);
    const rawW = Math.max(1, working.width || base.width);
    const rawH = Math.max(1, working.height || base.height);

    const skewXDeg = Math.max(-55, Math.min(55, (Math.atan2(leftVecX, Math.max(8, leftVecY)) * 180) / Math.PI));
    const skewYDeg = Math.max(-55, Math.min(55, (Math.atan2(topVecY, Math.max(8, topVecX)) * 180) / Math.PI));

    working.set({
      scaleX: newW / rawW,
      scaleY: newH / rawH,
      skewX: skewXDeg,
      skewY: skewYDeg,
      dirty: true,
    });
    working.setPositionByOrigin(
      new fabric.Point((minX + maxX) / 2, (minY + maxY) / 2),
      'center',
      'center'
    );
    working.setCoords();
  }

  const br = working.getBoundingRect();
  const nextMeta: EnvelopeConfigMeta = {
    mode,
    cage: cloneEnvelopeCage(cage),
    activeNode: options?.activeNode || existingCfg?.activeNode || 'bl',
    lastBounds: { left: br.left, top: br.top, width: br.width, height: br.height },
    base,
  };
  (working as any).envelopeConfig = nextMeta;
  (working as any).hasEffects = true;

  if (options?.lockForEnvelopeTool) {
    working.set({
      selectable: false,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
    });
    canvas.setActiveObject(working);
  }

  canvas.requestRenderAll();
  return working;
}

export function applyEnvelopePresetToTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  presetId: string,
  amount = 0.35,
  options?: { lockForEnvelopeTool?: boolean }
): fabric.FabricObject {
  const cfg = extractOrInitEnvelopeConfig(target);
  const preset = ENVELOPE_PRESETS.find((p) => p.id === presetId) || ENVELOPE_PRESETS[0];
  const cage = preset.buildCage(cfg.base.minX, cfg.base.minY, cfg.base.width, cfg.base.height, amount);
  return applyEnvelopeCageToTarget(canvas, target, cage, preset.mode, {
    activeNode: cfg.activeNode,
    lockForEnvelopeTool: options?.lockForEnvelopeTool,
  });
}

export function resetEnvelopeOnTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  options?: { lockForEnvelopeTool?: boolean }
): fabric.FabricObject {
  const cfg = extractOrInitEnvelopeConfig(target);
  const rectCage = createRectangularCage(cfg.base.minX, cfg.base.minY, cfg.base.width, cfg.base.height);
  if (target.type === 'path' && cfg.base.origSvgD) {
    applySvgDataToPathObject(target as fabric.Path, cfg.base.origSvgD);
    const br = target.getBoundingRect();
    (target as any).envelopeConfig = {
      ...cfg,
      cage: rectCage,
      lastBounds: { left: br.left, top: br.top, width: br.width, height: br.height },
    };
    if (options?.lockForEnvelopeTool) {
      target.set({
        selectable: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
      });
      canvas.setActiveObject(target);
    }
    canvas.requestRenderAll();
    return target;
  }
  return applyEnvelopeCageToTarget(canvas, target, rectCage, cfg.mode, options);
}

export function clearEnvelopeFromTarget(
  canvas: fabric.Canvas,
  target: fabric.FabricObject
): fabric.FabricObject {
  const cfg = (target as any).envelopeConfig as EnvelopeConfigMeta | undefined;
  if (cfg && target.type === 'path' && cfg.base.origSvgD) {
    applySvgDataToPathObject(target as fabric.Path, cfg.base.origSvgD);
  } else if (cfg && target.type !== 'path') {
    target.set({ skewX: 0, skewY: 0 });
    target.setCoords();
  }
  delete (target as any).envelopeConfig;
  canvas.requestRenderAll();
  return target;
}

/**
 * Keeps stored Envelope cage synchronized if the object is moved/scaled/transformed outside the Envelope tool.
 */
export function refreshEnvelopeIfMoved(target: fabric.FabricObject) {
  const cfg = (target as any)?.envelopeConfig as EnvelopeConfigMeta | undefined;
  if (!cfg || !cfg.cage || !cfg.lastBounds) return;
  const br = target.getBoundingRect();
  const prev = cfg.lastBounds;
  const sx = prev.width > 1e-3 ? br.width / prev.width : 1;
  const sy = prev.height > 1e-3 ? br.height / prev.height : 1;

  if (
    Math.abs(br.left - prev.left) < 0.05 &&
    Math.abs(br.top - prev.top) < 0.05 &&
    Math.abs(sx - 1) < 1e-4 &&
    Math.abs(sy - 1) < 1e-4
  ) {
    return;
  }

  const mapPt = (p: EnvelopePoint): EnvelopePoint => ({
    x: br.left + (p.x - prev.left) * sx,
    y: br.top + (p.y - prev.top) * sy,
  });

  cfg.cage = {
    tl: mapPt(cfg.cage.tl),
    tm: mapPt(cfg.cage.tm),
    tr: mapPt(cfg.cage.tr),
    rm: mapPt(cfg.cage.rm),
    br: mapPt(cfg.cage.br),
    bm: mapPt(cfg.cage.bm),
    bl: mapPt(cfg.cage.bl),
    lm: mapPt(cfg.cage.lm),
  };
  cfg.base = {
    ...cfg.base,
    minX: br.left + (cfg.base.minX - prev.left) * sx,
    minY: br.top + (cfg.base.minY - prev.top) * sy,
    width: Math.max(1, cfg.base.width * sx),
    height: Math.max(1, cfg.base.height * sy),
    origSvgD: '', // origSvgD coordinates invalidated after external scale/move; regenerate if needed
  };
  if (target.type === 'path') {
    // Recompute origSvgD cleanly from rectangular cage in new bounds
    const rectCage = createRectangularCage(cfg.base.minX, cfg.base.minY, cfg.base.width, cfg.base.height);
    if (cfg.base.subpaths.length > 0) {
      cfg.base.origSvgD = buildWarpedSvgPath(cfg.base, rectCage, 'straight');
    }
  }
  cfg.lastBounds = { left: br.left, top: br.top, width: br.width, height: br.height };
}

/**
 * Updates a single Envelope node in the cage while preserving mode behavior:
 * - Corner nodes shift adjacent edge midpoints by 0.5*delta unless unconstrained.
 * - Midpoint nodes in 'straight' mode translate their whole edge linearly.
 * - Optional symmetric opposite-edge mirroring (Shift key or Mirror toggle).
 */
export function moveEnvelopeCageNode(
  cage: EnvelopeCage,
  nodeId: EnvelopeNodeId,
  newPos: EnvelopePoint,
  mode: EnvelopeMode,
  options?: { mirrorOpposite?: boolean; parallelOpposite?: boolean }
): EnvelopeCage {
  const next = cloneEnvelopeCage(cage);
  const old = cage[nodeId];
  const dx = newPos.x - old.x;
  const dy = newPos.y - old.y;

  next[nodeId] = { x: newPos.x, y: newPos.y };

  const isCorner = nodeId === 'tl' || nodeId === 'tr' || nodeId === 'br' || nodeId === 'bl';

  if (isCorner) {
    if (mode === 'straight') {
      if (nodeId === 'tl') {
        next.tm = lerpPt(next.tl, next.tr, 0.5);
        next.lm = lerpPt(next.tl, next.bl, 0.5);
      } else if (nodeId === 'tr') {
        next.tm = lerpPt(next.tl, next.tr, 0.5);
        next.rm = lerpPt(next.tr, next.br, 0.5);
      } else if (nodeId === 'br') {
        next.bm = lerpPt(next.bl, next.br, 0.5);
        next.rm = lerpPt(next.tr, next.br, 0.5);
      } else if (nodeId === 'bl') {
        next.bm = lerpPt(next.bl, next.br, 0.5);
        next.lm = lerpPt(next.tl, next.bl, 0.5);
      }
    } else if (mode !== 'unconstrained') {
      // Shift adjacent midpoints by 0.5 * delta so straight edges stay straight and arcs preserve sag
      if (nodeId === 'tl') {
        next.tm.x += dx * 0.5;
        next.tm.y += dy * 0.5;
        next.lm.x += dx * 0.5;
        next.lm.y += dy * 0.5;
      } else if (nodeId === 'tr') {
        next.tm.x += dx * 0.5;
        next.tm.y += dy * 0.5;
        next.rm.x += dx * 0.5;
        next.rm.y += dy * 0.5;
      } else if (nodeId === 'br') {
        next.bm.x += dx * 0.5;
        next.bm.y += dy * 0.5;
        next.rm.x += dx * 0.5;
        next.rm.y += dy * 0.5;
      } else if (nodeId === 'bl') {
        next.bm.x += dx * 0.5;
        next.bm.y += dy * 0.5;
        next.lm.x += dx * 0.5;
        next.lm.y += dy * 0.5;
      }
    }

    if (options?.mirrorOpposite) {
      if (nodeId === 'tl') {
        next.tr.x -= dx;
        next.tr.y += dy;
        next.tm.x = (next.tl.x + next.tr.x) / 2;
      } else if (nodeId === 'tr') {
        next.tl.x -= dx;
        next.tl.y += dy;
        next.tm.x = (next.tl.x + next.tr.x) / 2;
      } else if (nodeId === 'bl') {
        next.br.x -= dx;
        next.br.y += dy;
        next.bm.x = (next.bl.x + next.br.x) / 2;
      } else if (nodeId === 'br') {
        next.bl.x -= dx;
        next.bl.y += dy;
        next.bm.x = (next.bl.x + next.br.x) / 2;
      }
    }
    return next;
  }

  // Midpoint node dragged
  if (mode === 'straight') {
    if (nodeId === 'tm') {
      next.tl.x += dx;
      next.tl.y += dy;
      next.tr.x += dx;
      next.tr.y += dy;
      next.lm = lerpPt(next.tl, next.bl, 0.5);
      next.rm = lerpPt(next.tr, next.br, 0.5);
    } else if (nodeId === 'bm') {
      next.bl.x += dx;
      next.bl.y += dy;
      next.br.x += dx;
      next.br.y += dy;
      next.lm = lerpPt(next.tl, next.bl, 0.5);
      next.rm = lerpPt(next.tr, next.br, 0.5);
    } else if (nodeId === 'lm') {
      next.tl.x += dx;
      next.tl.y += dy;
      next.bl.x += dx;
      next.bl.y += dy;
      next.tm = lerpPt(next.tl, next.tr, 0.5);
      next.bm = lerpPt(next.bl, next.br, 0.5);
    } else if (nodeId === 'rm') {
      next.tr.x += dx;
      next.tr.y += dy;
      next.br.x += dx;
      next.br.y += dy;
      next.tm = lerpPt(next.tl, next.tr, 0.5);
      next.bm = lerpPt(next.bl, next.br, 0.5);
    }
    return next;
  }

  const oppositeMap: Record<'tm' | 'bm' | 'lm' | 'rm', 'tm' | 'bm' | 'lm' | 'rm'> = {
    tm: 'bm',
    bm: 'tm',
    lm: 'rm',
    rm: 'lm',
  };
  const oppId = oppositeMap[nodeId as 'tm' | 'bm' | 'lm' | 'rm'];
  if (options?.mirrorOpposite && oppId) {
    next[oppId].x -= dx;
    next[oppId].y -= dy;
  } else if (options?.parallelOpposite && oppId) {
    next[oppId].x += dx;
    next[oppId].y += dy;
  }
  return next;
}
