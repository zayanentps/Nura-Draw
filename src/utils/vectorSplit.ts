import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId, getObjectLabel } from './canvasHelpers';

export interface VecPt {
  x: number;
  y: number;
}

type Seg =
  | { type: 'L'; p0: VecPt; p1: VecPt }
  | { type: 'C'; p0: VecPt; cp1: VecPt; cp2: VecPt; p1: VecPt };

interface Subpath {
  segs: Seg[];
  closed: boolean;
}

const VECTOR_TYPES = new Set([
  'rect',
  'circle',
  'ellipse',
  'polygon',
  'polyline',
  'line',
  'path',
]);

function dist(a: VecPt, b: VecPt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPt(a: VecPt, b: VecPt, t: number): VecPt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function evalCubic(p0: VecPt, cp1: VecPt, cp2: VecPt, p1: VecPt, t: number): VecPt {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p1.y,
  };
}

function splitCubicAt(
  p0: VecPt,
  cp1: VecPt,
  cp2: VecPt,
  p1: VecPt,
  t: number
): [
  { p0: VecPt; cp1: VecPt; cp2: VecPt; p1: VecPt },
  { p0: VecPt; cp1: VecPt; cp2: VecPt; p1: VecPt }
] {
  const p01 = lerpPt(p0, cp1, t);
  const p12 = lerpPt(cp1, cp2, t);
  const p23 = lerpPt(cp2, p1, t);
  const p012 = lerpPt(p01, p12, t);
  const p123 = lerpPt(p12, p23, t);
  const mid = lerpPt(p012, p123, t);
  return [
    { p0, cp1: p01, cp2: p012, p1: mid },
    { p0: mid, cp1: p123, cp2: p23, p1 },
  ];
}

function reverseSeg(seg: Seg): Seg {
  if (seg.type === 'L') {
    return { type: 'L', p0: seg.p1, p1: seg.p0 };
  }
  return { type: 'C', p0: seg.p1, cp1: seg.cp2, cp2: seg.cp1, p1: seg.p0 };
}

function reverseSegList(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    out.push(reverseSeg(segs[i]));
  }
  return out;
}

function hasVisibleFill(fill: unknown): boolean {
  if (!fill) return false;
  if (typeof fill === 'string') {
    const f = fill.trim().toLowerCase();
    return f !== '' && f !== 'transparent' && f !== 'none';
  }
  return true;
}

function cloneFillForPiece(
  obj: fabric.FabricObject,
  pieceWidth: number,
  pieceHeight: number,
  pieceOffset: VecPt
): fabric.FabricObject['fill'] {
  const fill = obj.fill;
  if (!fill || typeof fill === 'string') return fill;

  if (typeof (fill as any).toObject === 'function') {
    const raw = (fill as any).toObject();
    if (raw && (raw.type === 'linear' || raw.type === 'radial')) {
      const coords = { ...(raw.coords || {}) };
      if ((raw.gradientUnits || 'pixels') === 'pixels') {
        // Transform gradient endpoints from source object's local center-space -> scene -> piece local-space
        const mat = obj.calcTransformMatrix();
        const off = (obj as any).pathOffset
          ? { x: (obj as any).pathOffset.x || 0, y: (obj as any).pathOffset.y || 0 }
          : { x: (obj.width || 0) / 2, y: (obj.height || 0) / 2 };

        const mapCoord = (gx: number, gy: number) => {
          const scene = fabric.util.transformPoint(new fabric.Point(gx - off.x, gy - off.y), mat);
          return {
            x: scene.x - pieceOffset.x + pieceWidth / 2,
            y: scene.y - pieceOffset.y + pieceHeight / 2,
          };
        };

        if (typeof coords.x1 === 'number' && typeof coords.y1 === 'number') {
          const p1 = mapCoord(coords.x1, coords.y1);
          coords.x1 = p1.x;
          coords.y1 = p1.y;
        }
        if (typeof coords.x2 === 'number' && typeof coords.y2 === 'number') {
          const p2 = mapCoord(coords.x2, coords.y2);
          coords.x2 = p2.x;
          coords.y2 = p2.y;
        }
      }
      if (raw.type === 'radial') {
        return new fabric.Gradient<'radial'>({
          ...raw,
          type: 'radial',
          coords,
        });
      }
      return new fabric.Gradient<'linear'>({
        ...raw,
        type: 'linear',
        coords,
      });
    }
  }
  return fill;
}

/**
 * Extracts scene-space Subpaths from any standard Fabric vector object without mutating it.
 */
export function extractSceneSubpaths(obj: fabric.FabricObject): Subpath[] | null {
  if (!obj || !VECTOR_TYPES.has(obj.type || '')) return null;
  if (obj.clipPath) return null;

  const mat = obj.calcTransformMatrix();
  const toScene = (lx: number, ly: number): VecPt => {
    const p = fabric.util.transformPoint(new fabric.Point(lx, ly), mat);
    return { x: p.x, y: p.y };
  };

  if (obj.type === 'rect') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    if (w <= 0 || h <= 0) return null;
    const rx = Math.min(w / 2, (obj as fabric.Rect).rx || 0);
    const ry = Math.min(h / 2, (obj as fabric.Rect).ry || 0);
    const p = (x: number, y: number) => toScene(x - w / 2, y - h / 2);

    const segs: Seg[] = [];
    if (rx > 0.01 || ry > 0.01) {
      const k = 0.552284749831;
      const kx = rx * k;
      const ky = ry * k;
      segs.push({ type: 'L', p0: p(rx, 0), p1: p(w - rx, 0) });
      segs.push({ type: 'C', p0: p(w - rx, 0), cp1: p(w - rx + kx, 0), cp2: p(w, ry - ky), p1: p(w, ry) });
      segs.push({ type: 'L', p0: p(w, ry), p1: p(w, h - ry) });
      segs.push({ type: 'C', p0: p(w, h - ry), cp1: p(w, h - ry + ky), cp2: p(w - rx + kx, h), p1: p(w - rx, h) });
      segs.push({ type: 'L', p0: p(w - rx, h), p1: p(rx, h) });
      segs.push({ type: 'C', p0: p(rx, h), cp1: p(rx - kx, h), cp2: p(0, h - ry + ky), p1: p(0, h - ry) });
      segs.push({ type: 'L', p0: p(0, h - ry), p1: p(0, ry) });
      segs.push({ type: 'C', p0: p(0, ry), cp1: p(0, ry - ky), cp2: p(rx - kx, 0), p1: p(rx, 0) });
    } else {
      const tl = p(0, 0);
      const tr = p(w, 0);
      const br = p(w, h);
      const bl = p(0, h);
      segs.push(
        { type: 'L', p0: tl, p1: tr },
        { type: 'L', p0: tr, p1: br },
        { type: 'L', p0: br, p1: bl },
        { type: 'L', p0: bl, p1: tl }
      );
    }
    return [{ segs, closed: true }];
  }

  if (obj.type === 'circle' || obj.type === 'ellipse') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const rx = obj.type === 'circle' ? (obj as fabric.Circle).radius || w / 2 : (obj as fabric.Ellipse).rx || w / 2;
    const ry = obj.type === 'circle' ? (obj as fabric.Circle).radius || h / 2 : (obj as fabric.Ellipse).ry || h / 2;
    if (rx <= 0 || ry <= 0) return null;
    const k = 0.552284749831;
    const ox = rx * k;
    const oy = ry * k;
    const pt = (x: number, y: number) => toScene(x, y);
    const segs: Seg[] = [
      { type: 'C', p0: pt(0, -ry), cp1: pt(ox, -ry), cp2: pt(rx, -oy), p1: pt(rx, 0) },
      { type: 'C', p0: pt(rx, 0), cp1: pt(rx, oy), cp2: pt(ox, ry), p1: pt(0, ry) },
      { type: 'C', p0: pt(0, ry), cp1: pt(-ox, ry), cp2: pt(-rx, oy), p1: pt(-rx, 0) },
      { type: 'C', p0: pt(-rx, 0), cp1: pt(-rx, -oy), cp2: pt(-ox, -ry), p1: pt(0, -ry) },
    ];
    return [{ segs, closed: true }];
  }

  if (obj.type === 'polygon' || obj.type === 'polyline') {
    const poly = obj as fabric.Polygon;
    const pts = poly.points || [];
    if (pts.length < 2) return null;
    const off = poly.pathOffset || { x: 0, y: 0 };
    const sPts = pts.map((pt) => toScene(pt.x - off.x, pt.y - off.y));
    const closed = obj.type === 'polygon';
    const segs: Seg[] = [];
    for (let i = 1; i < sPts.length; i++) {
      if (dist(sPts[i - 1], sPts[i]) > 1e-4) {
        segs.push({ type: 'L', p0: sPts[i - 1], p1: sPts[i] });
      }
    }
    if (closed && dist(sPts[sPts.length - 1], sPts[0]) > 1e-4) {
      segs.push({ type: 'L', p0: sPts[sPts.length - 1], p1: sPts[0] });
    }
    if (segs.length === 0) return null;
    return [{ segs, closed }];
  }

  if (obj.type === 'line') {
    const line = obj as fabric.Line;
    const lp = line.calcLinePoints();
    const p1 = toScene(lp.x1, lp.y1);
    const p2 = toScene(lp.x2, lp.y2);
    if (dist(p1, p2) < 1e-4) return null;
    return [{ segs: [{ type: 'L', p0: p1, p1: p2 }], closed: false }];
  }

  if (obj.type === 'path') {
    const pathObj = obj as fabric.Path;
    const cmds = (pathObj.path || []) as any[][];
    const off = pathObj.pathOffset || { x: 0, y: 0 };
    const p = (lx: number, ly: number) => toScene(lx - off.x, ly - off.y);

    const subpaths: Subpath[] = [];
    let curSegs: Seg[] = [];
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    let hasSub = false;

    const flushSub = (closed: boolean) => {
      if (!hasSub) return;
      if (curSegs.length > 0) {
        const endPt = curSegs[curSegs.length - 1].p1;
        const startPt = curSegs[0].p0;
        const isClosedLoop = closed || dist(endPt, startPt) < 0.5;
        if (isClosedLoop && dist(endPt, startPt) >= 1e-3) {
          curSegs.push({ type: 'L', p0: endPt, p1: startPt });
        }
        subpaths.push({ segs: curSegs, closed: isClosedLoop });
      }
      curSegs = [];
      hasSub = false;
    };

    for (const cmd of cmds) {
      const op = String(cmd[0]).toUpperCase();
      if (op === 'M') {
        flushSub(false);
        curX = Number(cmd[1]);
        curY = Number(cmd[2]);
        startX = curX;
        startY = curY;
        hasSub = true;
      } else if (op === 'L') {
        const nx = Number(cmd[1]);
        const ny = Number(cmd[2]);
        const a = p(curX, curY);
        const b = p(nx, ny);
        if (dist(a, b) > 1e-4) curSegs.push({ type: 'L', p0: a, p1: b });
        curX = nx;
        curY = ny;
      } else if (op === 'H') {
        const nx = Number(cmd[1]);
        const a = p(curX, curY);
        const b = p(nx, curY);
        if (dist(a, b) > 1e-4) curSegs.push({ type: 'L', p0: a, p1: b });
        curX = nx;
      } else if (op === 'V') {
        const ny = Number(cmd[1]);
        const a = p(curX, curY);
        const b = p(curX, ny);
        if (dist(a, b) > 1e-4) curSegs.push({ type: 'L', p0: a, p1: b });
        curY = ny;
      } else if (op === 'Q') {
        const qx = Number(cmd[1]);
        const qy = Number(cmd[2]);
        const nx = Number(cmd[3]);
        const ny = Number(cmd[4]);
        const c1x = curX + (2 / 3) * (qx - curX);
        const c1y = curY + (2 / 3) * (qy - curY);
        const c2x = nx + (2 / 3) * (qx - nx);
        const c2y = ny + (2 / 3) * (qy - ny);
        curSegs.push({
          type: 'C',
          p0: p(curX, curY),
          cp1: p(c1x, c1y),
          cp2: p(c2x, c2y),
          p1: p(nx, ny),
        });
        curX = nx;
        curY = ny;
      } else if (op === 'C') {
        const nx = Number(cmd[5]);
        const ny = Number(cmd[6]);
        curSegs.push({
          type: 'C',
          p0: p(curX, curY),
          cp1: p(Number(cmd[1]), Number(cmd[2])),
          cp2: p(Number(cmd[3]), Number(cmd[4])),
          p1: p(nx, ny),
        });
        curX = nx;
        curY = ny;
      } else if (op === 'Z') {
        flushSub(true);
        curX = startX;
        curY = startY;
      }
    }
    flushSub(false);
    return subpaths.length > 0 ? subpaths : null;
  }

  return null;
}

function findCubicLineRoots(
  p0: VecPt,
  cp1: VecPt,
  cp2: VecPt,
  p1: VecPt,
  signedDist: (pt: VecPt) => number
): number[] {
  const roots: number[] = [];

  const recurse = (
    q0: VecPt,
    q1: VecPt,
    q2: VecPt,
    q3: VecPt,
    t0: number,
    t1: number,
    depth: number
  ) => {
    const d0 = signedDist(q0);
    const d1 = signedDist(q1);
    const d2 = signedDist(q2);
    const d3 = signedDist(q3);

    const minD = Math.min(d0, d1, d2, d3);
    const maxD = Math.max(d0, d1, d2, d3);
    if (minD > 0 || maxD < 0) return;

    const span = dist(q0, q3) + dist(q0, q1) + dist(q1, q2) + dist(q2, q3);
    if (depth >= 15 || span < 0.05) {
      if (d0 * d3 <= 0) {
        let lo = t0;
        let hi = t1;
        let sLo = signedDist(evalCubic(p0, cp1, cp2, p1, lo));
        for (let iter = 0; iter < 8; iter++) {
          const mid = (lo + hi) * 0.5;
          const sMid = signedDist(evalCubic(p0, cp1, cp2, p1, mid));
          if (sLo * sMid <= 0) {
            hi = mid;
          } else {
            lo = mid;
            sLo = sMid;
          }
        }
        const root = (lo + hi) * 0.5;
        if (root > 1e-6 && root < 1 - 1e-6) {
          if (roots.length === 0 || Math.abs(root - roots[roots.length - 1]) > 1e-4) {
            roots.push(root);
          }
        }
      }
      return;
    }

    const tMid = (t0 + t1) * 0.5;
    const [left, right] = splitCubicAt(q0, q1, q2, q3, 0.5);
    recurse(left.p0, left.cp1, left.cp2, left.p1, t0, tMid, depth + 1);
    recurse(right.p0, right.cp1, right.cp2, right.p1, tMid, t1, depth + 1);
  };

  recurse(p0, cp1, cp2, p1, 0, 1, 0);
  return roots;
}

interface CrossingVertex {
  id: number;
  pt: VecPt;
  u: number;
  sidePosRunIdx: number;
  sideNegRunIdx: number;
  partnerId: number;
}

interface SplitRun {
  segs: Seg[];
  startCrossingId: number;
  endCrossingId: number;
  side: '+' | '-';
}

/**
 * Splits Subpaths along the infinite line (x1,y1)->(x2,y2) using exact half-plane decomposition.
 * Returns { posSubpaths, negSubpaths } if the line actually divides the shape, otherwise null.
 */
export function splitSubpathsByLine(
  subpaths: Subpath[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  treatOpenAsClosed: boolean
): { pos: Subpath[]; neg: Subpath[] } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return null;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // Symbolic perturbation: pick a tiny normal offset eps so no segment endpoint has |s| < 1e-3
  const anchors: VecPt[] = [];
  for (const sp of subpaths) {
    for (const seg of sp.segs) {
      anchors.push(seg.p0, seg.p1);
    }
  }
  let eps = 0;
  const candidates = [0, 1.7e-3, -1.7e-3, 3.9e-3, -3.9e-3, 7.3e-3, -7.3e-3, 1.3e-2];
  for (const c of candidates) {
    const ok = anchors.every((a) => Math.abs((a.x - x1) * nx + (a.y - y1) * ny - c) >= 1e-3);
    if (ok) {
      eps = c;
      break;
    }
  }

  const signedDist = (p: VecPt) => (p.x - x1) * nx + (p.y - y1) * ny - eps;
  const lineCoord = (p: VecPt) => (p.x - x1) * ux + (p.y - y1) * uy;

  const posOut: Subpath[] = [];
  const negOut: Subpath[] = [];

  // Process open subpaths vs closed subpaths
  const closedSubpaths: Subpath[] = [];
  for (const sp of subpaths) {
    const isClosed = sp.closed || treatOpenAsClosed;
    if (isClosed) {
      // Ensure explicitly closed if open with visible fill
      const segs = [...sp.segs];
      if (segs.length > 0 && dist(segs[segs.length - 1].p1, segs[0].p0) > 1e-3) {
        segs.push({ type: 'L', p0: segs[segs.length - 1].p1, p1: segs[0].p0 });
      }
      closedSubpaths.push({ segs, closed: true });
    } else {
      // Open stroke splitting
      const pieces: { side: '+' | '-'; segs: Seg[] }[] = [];
      let curSide: '+' | '-' | null = null;
      let curSegs: Seg[] = [];

      const pushSeg = (s: Seg, side: '+' | '-') => {
        if (curSide !== side) {
          if (curSegs.length > 0 && curSide) {
            pieces.push({ side: curSide, segs: curSegs });
          }
          curSide = side;
          curSegs = [s];
        } else {
          curSegs.push(s);
        }
      };

      for (const seg of sp.segs) {
        if (seg.type === 'L') {
          const s0 = signedDist(seg.p0);
          const s1 = signedDist(seg.p1);
          if (s0 >= 0 && s1 >= 0) {
            pushSeg(seg, '+');
          } else if (s0 <= 0 && s1 <= 0) {
            pushSeg(seg, '-');
          } else {
            const t = s0 / (s0 - s1);
            const hit = lerpPt(seg.p0, seg.p1, t);
            pushSeg({ type: 'L', p0: seg.p0, p1: hit }, s0 >= 0 ? '+' : '-');
            pushSeg({ type: 'L', p0: hit, p1: seg.p1 }, s1 >= 0 ? '+' : '-');
          }
        } else {
          const roots = findCubicLineRoots(seg.p0, seg.cp1, seg.cp2, seg.p1, signedDist);
          let cur = { p0: seg.p0, cp1: seg.cp1, cp2: seg.cp2, p1: seg.p1 };
          let prevT = 0;
          for (const r of roots) {
            const localT = (r - prevT) / (1 - prevT);
            const [left, right] = splitCubicAt(cur.p0, cur.cp1, cur.cp2, cur.p1, localT);
            const midS = signedDist(evalCubic(left.p0, left.cp1, left.cp2, left.p1, 0.5));
            pushSeg({ type: 'C', ...left }, midS >= 0 ? '+' : '-');
            cur = right;
            prevT = r;
          }
          const tailS = signedDist(evalCubic(cur.p0, cur.cp1, cur.cp2, cur.p1, 0.5));
          pushSeg({ type: 'C', ...cur }, tailS >= 0 ? '+' : '-');
        }
      }
      if (curSegs.length > 0 && curSide) {
        pieces.push({ side: curSide, segs: curSegs });
      }
      for (const pc of pieces) {
        if (pc.side === '+') posOut.push({ segs: pc.segs, closed: false });
        else negOut.push({ segs: pc.segs, closed: false });
      }
    }
  }

  // Now process all closed subpaths together so compound holes split accurately
  const crossings: CrossingVertex[] = [];
  const allRuns: SplitRun[] = [];
  const uncrossedLoops: { side: '+' | '-'; sp: Subpath }[] = [];

  for (const sp of closedSubpaths) {
    interface TaggedSeg {
      seg: Seg;
      side: '+' | '-';
      startsAtCrossing: boolean;
      endsAtCrossing: boolean;
    }

    const tagged: TaggedSeg[] = [];
    let loopCrossingCount = 0;

    for (const seg of sp.segs) {
      if (seg.type === 'L') {
        const s0 = signedDist(seg.p0);
        const s1 = signedDist(seg.p1);
        if (s0 >= 0 && s1 >= 0) {
          tagged.push({ seg, side: '+', startsAtCrossing: false, endsAtCrossing: false });
        } else if (s0 <= 0 && s1 <= 0) {
          tagged.push({ seg, side: '-', startsAtCrossing: false, endsAtCrossing: false });
        } else {
          const t = s0 / (s0 - s1);
          const hit = lerpPt(seg.p0, seg.p1, t);
          loopCrossingCount++;
          tagged.push({
            seg: { type: 'L', p0: seg.p0, p1: hit },
            side: s0 >= 0 ? '+' : '-',
            startsAtCrossing: false,
            endsAtCrossing: true,
          });
          tagged.push({
            seg: { type: 'L', p0: hit, p1: seg.p1 },
            side: s1 >= 0 ? '+' : '-',
            startsAtCrossing: true,
            endsAtCrossing: false,
          });
        }
      } else {
        const roots = findCubicLineRoots(seg.p0, seg.cp1, seg.cp2, seg.p1, signedDist);
        if (roots.length === 0) {
          const sMid = signedDist(evalCubic(seg.p0, seg.cp1, seg.cp2, seg.p1, 0.5));
          const side: '+' | '-' = (sMid || signedDist(seg.p0)) >= 0 ? '+' : '-';
          tagged.push({ seg, side, startsAtCrossing: false, endsAtCrossing: false });
        } else {
          let cur = { p0: seg.p0, cp1: seg.cp1, cp2: seg.cp2, p1: seg.p1 };
          let prevT = 0;
          let prevCrossed = false;
          const parts: { seg: Seg; side: '+' | '-' }[] = [];
          for (const r of roots) {
            const localT = (r - prevT) / (1 - prevT);
            const [left, right] = splitCubicAt(cur.p0, cur.cp1, cur.cp2, cur.p1, localT);
            const midS = signedDist(evalCubic(left.p0, left.cp1, left.cp2, left.p1, 0.5));
            parts.push({ seg: { type: 'C', ...left }, side: midS >= 0 ? '+' : '-' });
            cur = right;
            prevT = r;
          }
          const tailS = signedDist(evalCubic(cur.p0, cur.cp1, cur.cp2, cur.p1, 0.5));
          parts.push({ seg: { type: 'C', ...cur }, side: tailS >= 0 ? '+' : '-' });

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const nextPart = parts[i + 1];
            const crossesNext = nextPart ? part.side !== nextPart.side : false;
            if (crossesNext) loopCrossingCount++;
            tagged.push({
              seg: part.seg,
              side: part.side,
              startsAtCrossing: prevCrossed,
              endsAtCrossing: crossesNext,
            });
            prevCrossed = crossesNext;
          }
        }
      }
    }

    if (loopCrossingCount === 0 || tagged.length === 0) {
      const samplePt = sp.segs[0]?.p0;
      if (samplePt) {
        uncrossedLoops.push({ side: signedDist(samplePt) >= 0 ? '+' : '-', sp });
      }
      continue;
    }

    // Group tagged segments into maximal contiguous runs between actual crossings
    // Find an index that starts at a crossing (there must be at least 2)
    const firstCrossIdx = tagged.findIndex((t) => t.startsAtCrossing);
    if (firstCrossIdx < 0) {
      const samplePt = sp.segs[0]?.p0;
      if (samplePt) uncrossedLoops.push({ side: signedDist(samplePt) >= 0 ? '+' : '-', sp });
      continue;
    }

    const ordered: TaggedSeg[] = [
      ...tagged.slice(firstCrossIdx),
      ...tagged.slice(0, firstCrossIdx),
    ];

    // Collect crossing points & alternating runs
    let curRunSegs: Seg[] = [];
    let curRunSide: '+' | '-' = ordered[0].side;
    const loopCrossIds: number[] = [];
    const loopRuns: { segs: Seg[]; side: '+' | '-' }[] = [];

    const firstPt = ordered[0].seg.p0;
    const firstCid = crossings.length;
    crossings.push({
      id: firstCid,
      pt: firstPt,
      u: lineCoord(firstPt),
      sidePosRunIdx: -1,
      sideNegRunIdx: -1,
      partnerId: -1,
    });
    loopCrossIds.push(firstCid);

    for (let i = 0; i < ordered.length; i++) {
      const item = ordered[i];
      curRunSegs.push(item.seg);
      if (item.endsAtCrossing && i < ordered.length - 1) {
        const nextItem = ordered[i + 1];
        if (nextItem.side !== curRunSide) {
          loopRuns.push({ segs: curRunSegs, side: curRunSide });
          const cPt = item.seg.p1;
          const cid = crossings.length;
          crossings.push({
            id: cid,
            pt: cPt,
            u: lineCoord(cPt),
            sidePosRunIdx: -1,
            sideNegRunIdx: -1,
            partnerId: -1,
          });
          loopCrossIds.push(cid);
          curRunSegs = [];
          curRunSide = nextItem.side;
        }
      }
    }
    if (curRunSegs.length > 0) {
      loopRuns.push({ segs: curRunSegs, side: curRunSide });
    }

    // Check parity: must have >= 2 runs and equal number of runs and crossings
    if (loopRuns.length < 2 || loopRuns.length !== loopCrossIds.length) {
      const samplePt = sp.segs[0]?.p0;
      if (samplePt) uncrossedLoops.push({ side: signedDist(samplePt) >= 0 ? '+' : '-', sp });
      continue;
    }

    for (let r = 0; r < loopRuns.length; r++) {
      const run = loopRuns[r];
      const startCid = loopCrossIds[r];
      const endCid = loopCrossIds[(r + 1) % loopCrossIds.length];
      const runIdx = allRuns.length;
      allRuns.push({
        segs: run.segs,
        startCrossingId: startCid,
        endCrossingId: endCid,
        side: run.side,
      });
      if (run.side === '+') {
        crossings[startCid].sidePosRunIdx = runIdx;
        crossings[endCid].sidePosRunIdx = runIdx;
      } else {
        crossings[startCid].sideNegRunIdx = runIdx;
        crossings[endCid].sideNegRunIdx = runIdx;
      }
    }
  }

  for (const ul of uncrossedLoops) {
    if (ul.side === '+') posOut.push(ul.sp);
    else negOut.push(ul.sp);
  }

  // Pair crossings along the cut line in sorted u order: (0,1), (2,3), ...
  if (crossings.length >= 2 && crossings.length % 2 === 0) {
    const sortedCrossings = [...crossings].sort((a, b) => a.u - b.u);
    for (let i = 0; i < sortedCrossings.length; i += 2) {
      const a = sortedCrossings[i];
      const b = sortedCrossings[i + 1];
      crossings[a.id].partnerId = b.id;
      crossings[b.id].partnerId = a.id;
    }

    const extractSideLoops = (side: '+' | '-', target: Subpath[]) => {
      const visited = new Set<number>();
      for (let i = 0; i < allRuns.length; i++) {
        if (allRuns[i].side !== side || visited.has(i)) continue;
        const loopSegs: Seg[] = [];
        let curRunIdx = i;
        let enterFromCid = allRuns[i].startCrossingId;
        let guard = 0;

        while (guard++ < allRuns.length + 4) {
          if (visited.has(curRunIdx)) break;
          visited.add(curRunIdx);
          const run = allRuns[curRunIdx];
          let exitCid: number;
          if (enterFromCid === run.startCrossingId) {
            loopSegs.push(...run.segs);
            exitCid = run.endCrossingId;
          } else {
            loopSegs.push(...reverseSegList(run.segs));
            exitCid = run.startCrossingId;
          }

          const partnerCid = crossings[exitCid]?.partnerId ?? -1;
          if (partnerCid < 0) break;

          const pA = crossings[exitCid].pt;
          const pB = crossings[partnerCid].pt;
          if (dist(pA, pB) > 1e-4) {
            loopSegs.push({ type: 'L', p0: pA, p1: pB });
          }

          const nextRunIdx =
            side === '+' ? crossings[partnerCid].sidePosRunIdx : crossings[partnerCid].sideNegRunIdx;
          if (nextRunIdx < 0 || nextRunIdx === i && visited.has(i)) {
            break;
          }
          curRunIdx = nextRunIdx;
          enterFromCid = partnerCid;
        }

        if (loopSegs.length >= 2) {
          target.push({ segs: loopSegs, closed: true });
        }
      }
    };

    extractSideLoops('+', posOut);
    extractSideLoops('-', negOut);
  }

  if (posOut.length === 0 || negOut.length === 0) {
    return null;
  }

  return { pos: posOut, neg: negOut };
}

function subpathsToSvgD(subpaths: Subpath[]): string {
  const parts: string[] = [];
  for (const sp of subpaths) {
    if (sp.segs.length === 0) continue;
    const first = sp.segs[0].p0;
    parts.push(`M ${first.x.toFixed(3)} ${first.y.toFixed(3)}`);
    for (const seg of sp.segs) {
      if (seg.type === 'L') {
        if (dist(seg.p0, seg.p1) > 0.015) {
          parts.push(`L ${seg.p1.x.toFixed(3)} ${seg.p1.y.toFixed(3)}`);
        }
      } else {
        parts.push(
          `C ${seg.cp1.x.toFixed(3)} ${seg.cp1.y.toFixed(3)} ${seg.cp2.x.toFixed(3)} ${seg.cp2.y.toFixed(3)} ${seg.p1.x.toFixed(3)} ${seg.p1.y.toFixed(3)}`
        );
      }
    }
    if (sp.closed) {
      parts.push('Z');
    }
  }
  return parts.join(' ');
}

function buildPathPieceFromSubpaths(
  sourceObj: fabric.FabricObject,
  subpaths: Subpath[]
): fabric.Path | null {
  const d = subpathsToSvgD(subpaths);
  if (!d) return null;

  const isFilled = hasVisibleFill(sourceObj.fill);
  const shadowObj =
    sourceObj.shadow && typeof (sourceObj.shadow as any).clone === 'function'
      ? (sourceObj.shadow as any).clone()
      : sourceObj.shadow || undefined;

  const piece = new fabric.Path(d, {
    fill: isFilled ? sourceObj.fill : 'transparent',
    fillRule: (sourceObj as any).fillRule || 'nonzero',
    stroke: sourceObj.stroke,
    strokeWidth: sourceObj.strokeWidth,
    strokeDashArray: sourceObj.strokeDashArray ? [...sourceObj.strokeDashArray] : undefined,
    strokeUniform: true,
    strokeLineCap: sourceObj.strokeLineCap,
    strokeLineJoin: sourceObj.strokeLineJoin,
    opacity: sourceObj.opacity,
    shadow: shadowObj,
    perPixelTargetFind: isFilled,
  });

  if (sourceObj.fill && typeof sourceObj.fill === 'object') {
    const off = piece.pathOffset || { x: piece.left || 0, y: piece.top || 0 };
    piece.set('fill', cloneFillForPiece(sourceObj, piece.width || 1, piece.height || 1, off));
  }

  (piece as any).isCurve = true;
  disableObjectCaching(piece);
  piece.setCoords();
  return piece;
}

/**
 * Clips a closed subpath collection to the positive half-plane of line (x1,y1)->(x2,y2).
 * Used by Crop tool so trimmed vector shapes have exact tight bounding boxes too.
 */
export function clipSubpathsToRect(
  subpaths: Subpath[],
  rect: { left: number; top: number; width: number; height: number },
  treatOpenAsClosed: boolean
): Subpath[] | null {
  const { left, top, width, height } = rect;
  const right = left + width;
  const bottom = top + height;

  // Clip against 4 half-planes where positive (nx, ny) points INSIDE the rectangle:
  // 1. x >= left   : line (left, top) -> (left, bottom) has dx=0, dy=h => nx=-1, ny=0 (neg!)
  //    Wait: normal formula in splitSubpathsByLine is nx = -dy/len, ny = dx/len!
  //    - Bottom-to-top on left edge: (left, bottom) -> (left, top) => dx=0, dy=-1 => nx=+1, ny=0 => s = x - left >= 0!
  //    - Top-to-bottom on right edge: (right, top) -> (right, bottom) => dx=0, dy=1 => nx=-1, ny=0 => s = right - x >= 0!
  //    - Left-to-right on top edge: (left, top) -> (right, top) => dx=1, dy=0 => nx=0, ny=+1 => s = y - top >= 0!
  //    - Right-to-left on bottom edge: (right, bottom) -> (left, bottom) => dx=-1, dy=0 => nx=0, ny=-1 => s = bottom - y >= 0!
  const planes: [number, number, number, number, (p: VecPt) => boolean][] = [
    [left, bottom, left, top, (p) => p.x >= left],
    [right, top, right, bottom, (p) => p.x <= right],
    [left, top, right, top, (p) => p.y >= top],
    [right, bottom, left, bottom, (p) => p.y <= bottom],
  ];

  let current = subpaths;
  for (const [x1, y1, x2, y2, insideFn] of planes) {
    const res = splitSubpathsByLine(current, x1, y1, x2, y2, treatOpenAsClosed);
    if (res) {
      current = res.pos;
    } else {
      // Uncrossed by this edge: either entirely inside or entirely outside
      const sample = current[0]?.segs[0]?.p0;
      if (!sample || !insideFn(sample)) {
        return null;
      }
    }
    if (current.length === 0) return null;
  }
  return current;
}

export function cropVectorObjectToRect(
  obj: fabric.FabricObject,
  rect: { left: number; top: number; width: number; height: number }
): fabric.Path | null {
  const subs = extractSceneSubpaths(obj);
  if (!subs) return null;
  const treatOpenAsClosed = obj.type !== 'line' && obj.type !== 'polyline' && hasVisibleFill(obj.fill);
  const clipped = clipSubpathsToRect(subs, rect, treatOpenAsClosed);
  if (!clipped) return null;
  const piece = buildPathPieceFromSubpaths(obj, clipped);
  if (!piece) return null;
  ensureObjectId(piece, getObjectLabel(obj));
  return piece;
}

/**
 * Fallback tight raster crop for non-vector objects (Image, Text/IText, or clipped groups/masks)
 * so their resulting selection handles & bounding box wrap strictly ONLY the remaining portion.
 */
async function rasterizeClippedHalfObject(
  obj: fabric.FabricObject,
  clipPolyPts: VecPt[],
  tightBBox: { left: number; top: number; width: number; height: number }
): Promise<fabric.FabricImage | null> {
  if (tightBBox.width < 1 || tightBBox.height < 1) return null;

  const dpr = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 2)));
  const cw = Math.max(2, Math.ceil(tightBBox.width * dpr));
  const ch = Math.max(2, Math.ceil(tightBBox.height * dpr));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = cw;
  offCanvas.height = ch;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) return null;

  const cloned = await obj.clone();
  cloned.setCoords();

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(-tightBBox.left, -tightBBox.top);

  ctx.beginPath();
  clipPolyPts.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  ctx.clip();

  // Render Fabric object at its exact scene transform
  cloned.render(ctx);
  ctx.restore();

  const dataUrl = offCanvas.toDataURL('image/png');
  const img = await fabric.FabricImage.fromURL(dataUrl);
  img.set({
    left: tightBBox.left,
    top: tightBBox.top,
    originX: 'left',
    originY: 'top',
    scaleX: 1 / dpr,
    scaleY: 1 / dpr,
    perPixelTargetFind: true,
  });
  disableObjectCaching(img);
  img.setCoords();
  return img;
}

function clipRectPolyByHalfPlane(
  poly: VecPt[],
  x1: number,
  y1: number,
  nx: number,
  ny: number,
  keepPositive: boolean
): VecPt[] {
  const s = (p: VecPt) => ((p.x - x1) * nx + (p.y - y1) * ny) * (keepPositive ? 1 : -1);
  const out: VecPt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = s(a);
    const sb = s(b);
    if (sa >= 0) {
      out.push(a);
      if (sb < 0) {
        const t = sa / (sa - sb);
        out.push(lerpPt(a, b, t));
      }
    } else if (sb >= 0) {
      const t = sa / (sa - sb);
      out.push(lerpPt(a, b, t));
    }
  }
  return out;
}

function bboxOfPoly(poly: VecPt[]): { left: number; top: number; width: number; height: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    left: minX,
    top: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/**
 * Recursively splits an object (vector shape, group, image, or text) by the cut line
 * into independent halves `[sidePosPieces, sideNegPieces]` with exact half-only bounding boxes.
 */
async function splitObjectIntoSides(
  obj: fabric.FabricObject,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Promise<{ pos: fabric.FabricObject[]; neg: fabric.FabricObject[] } | null> {
  if ((obj as any).isDimension || obj.visible === false || (obj as any).excludeFromExport) {
    return null;
  }

  // 1. Standard Vector Object (no external clipPath) -> exact Bezier/Polygon split!
  const subs = extractSceneSubpaths(obj);
  if (subs) {
    const treatOpenAsClosed = obj.type !== 'line' && obj.type !== 'polyline' && hasVisibleFill(obj.fill);
    const splitRes = splitSubpathsByLine(subs, x1, y1, x2, y2, treatOpenAsClosed);
    if (splitRes) {
      const pA = buildPathPieceFromSubpaths(obj, splitRes.pos);
      const pB = buildPathPieceFromSubpaths(obj, splitRes.neg);
      if (pA && pB) {
        return { pos: [pA], neg: [pB] };
      }
      return null;
    }

    // Did not cross line: determine which side the whole vector object belongs to
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const sample = subs[0]?.segs[0]?.p0;
    if (!sample) return null;
    const s = (sample.x - x1) * nx + (sample.y - y1) * ny;
    return s >= 0 ? { pos: [obj], neg: [] } : { pos: [], neg: [obj] };
  }

  // 2. Group -> split children independently and reassemble tight groups!
  if (obj.type === 'group' && !obj.clipPath) {
    const grp = obj as fabric.Group;
    const children = grp.getObjects ? grp.getObjects() : [];
    if (children.length === 0) return null;

    const posChildren: fabric.FabricObject[] = [];
    const negChildren: fabric.FabricObject[] = [];
    let anyCrossed = false;

    for (const child of children) {
      // Snapshot child's world transform before modifying or cloning
      const mat = child.calcTransformMatrix();
      const childRes = await splitObjectIntoSides(child, x1, y1, x2, y2);
      if (!childRes) continue;

      if (childRes.pos.length > 0 && childRes.neg.length > 0) {
        anyCrossed = true;
      }

      const materializeInScene = async (c: fabric.FabricObject): Promise<fabric.FabricObject> => {
        if (c !== child) return c;
        const cloned = await c.clone();
        // Bake group's transform onto cloned child so it sits at exact scene coordinates
        const decomposed = fabric.util.qrDecompose(mat);
        cloned.set({
          left: decomposed.translateX,
          top: decomposed.translateY,
          scaleX: decomposed.scaleX,
          scaleY: decomposed.scaleY,
          angle: decomposed.angle,
          skewX: decomposed.skewX,
          skewY: decomposed.skewY,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
        });
        cloned.setCoords();
        return cloned;
      };

      for (const p of childRes.pos) posChildren.push(await materializeInScene(p));
      for (const n of childRes.neg) negChildren.push(await materializeInScene(n));
    }

    if (!anyCrossed && (posChildren.length === 0 || negChildren.length === 0)) {
      return posChildren.length > 0 ? { pos: [obj], neg: [] } : { pos: [], neg: [obj] };
    }

    const wrapGroup = (items: fabric.FabricObject[]) => {
      if (items.length === 0) return null;
      const g = new fabric.Group(items, { subTargetCheck: true, opacity: obj.opacity });
      disableObjectCaching(g);
      g.setCoords();
      return g;
    };

    const gPos = wrapGroup(posChildren);
    const gNeg = wrapGroup(negChildren);
    if (gPos && gNeg) return { pos: [gPos], neg: [gNeg] };
    if (gPos) return { pos: [gPos], neg: [] };
    if (gNeg) return { pos: [], neg: [gNeg] };
    return null;
  }

  // 3. Raster / Text / Already-Clipped Objects -> tight polygon-cropped canvas image per half
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const br = obj.getBoundingRect();
  const rectPoly: VecPt[] = [
    { x: br.left, y: br.top },
    { x: br.left + br.width, y: br.top },
    { x: br.left + br.width, y: br.top + br.height },
    { x: br.left, y: br.top + br.height },
  ];

  const polyPos = clipRectPolyByHalfPlane(rectPoly, x1, y1, nx, ny, true);
  const polyNeg = clipRectPolyByHalfPlane(rectPoly, x1, y1, nx, ny, false);

  if (polyPos.length < 3) return { pos: [], neg: [obj] };
  if (polyNeg.length < 3) return { pos: [obj], neg: [] };

  const bbPos = bboxOfPoly(polyPos);
  const bbNeg = bboxOfPoly(polyNeg);
  if (bbPos.width < 1 || bbPos.height < 1) return { pos: [], neg: [obj] };
  if (bbNeg.width < 1 || bbNeg.height < 1) return { pos: [obj], neg: [] };

  const [imgPos, imgNeg] = await Promise.all([
    rasterizeClippedHalfObject(obj, polyPos, bbPos),
    rasterizeClippedHalfObject(obj, polyNeg, bbNeg),
  ]);
  if (!imgPos || !imgNeg) return null;
  return { pos: [imgPos], neg: [imgNeg] };
}

/**
 * Crops any object (vector or raster/text/group) to a target rectangle with tight bounding boxes.
 */
export async function cropObjectToRectTight(
  obj: fabric.FabricObject,
  rect: { left: number; top: number; width: number; height: number }
): Promise<fabric.FabricObject | null> {
  if ((obj as any).isDimension || obj.visible === false || (obj as any).excludeFromExport) {
    return obj;
  }
  const br = obj.getBoundingRect();
  const fullyInside =
    br.left >= rect.left &&
    br.left + br.width <= rect.left + rect.width &&
    br.top >= rect.top &&
    br.top + br.height <= rect.top + rect.height;
  if (fullyInside) return obj;

  const intersects =
    br.left < rect.left + rect.width &&
    br.left + br.width > rect.left &&
    br.top < rect.top + rect.height &&
    br.top + br.height > rect.top;
  if (!intersects) return null;

  // Vector path/shape
  const vecCropped = cropVectorObjectToRect(obj, rect);
  if (vecCropped) return vecCropped;
  if (extractSceneSubpaths(obj)) {
    // It was a pure vector shape whose geometry missed the crop rect completely
    return null;
  }

  // Group -> crop children
  if (obj.type === 'group' && !obj.clipPath) {
    const grp = obj as fabric.Group;
    const children = grp.getObjects ? grp.getObjects() : [];
    const kept: fabric.FabricObject[] = [];
    for (const child of children) {
      const mat = child.calcTransformMatrix();
      const croppedChild = await cropObjectToRectTight(child, rect);
      if (!croppedChild) continue;
      if (croppedChild === child) {
        const cloned = await child.clone();
        const decomposed = fabric.util.qrDecompose(mat);
        cloned.set({
          left: decomposed.translateX,
          top: decomposed.translateY,
          scaleX: decomposed.scaleX,
          scaleY: decomposed.scaleY,
          angle: decomposed.angle,
          skewX: decomposed.skewX,
          skewY: decomposed.skewY,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
        });
        cloned.setCoords();
        kept.push(cloned);
      } else {
        kept.push(croppedChild);
      }
    }
    if (kept.length === 0) return null;
    const outGrp = new fabric.Group(kept, { subTargetCheck: true, opacity: obj.opacity });
    disableObjectCaching(outGrp);
    ensureObjectId(outGrp, getObjectLabel(obj));
    outGrp.setCoords();
    return outGrp;
  }

  // Raster / Text / Clipped object -> tight rasterized crop
  const ix1 = Math.max(br.left, rect.left);
  const iy1 = Math.max(br.top, rect.top);
  const ix2 = Math.min(br.left + br.width, rect.left + rect.width);
  const iy2 = Math.min(br.top + br.height, rect.top + rect.height);
  if (ix2 - ix1 < 1 || iy2 - iy1 < 1) return null;
  const poly: VecPt[] = [
    { x: ix1, y: iy1 },
    { x: ix2, y: iy1 },
    { x: ix2, y: iy2 },
    { x: ix1, y: iy2 },
  ];
  const img = await rasterizeClippedHalfObject(obj, poly, {
    left: ix1,
    top: iy1,
    width: ix2 - ix1,
    height: iy2 - iy1,
  });
  if (img) ensureObjectId(img, getObjectLabel(obj));
  return img;
}

/**
 * Divides an object cleanly along the cut segment (x1,y1)->(x2,y2) into two independent
 * objects whose bounding boxes and control points belong strictly to each half.
 */
export async function sliceObjectByLineSegment(
  canvas: fabric.Canvas,
  obj: fabric.FabricObject,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  autoGap: boolean
): Promise<fabric.FabricObject[] | null> {
  if ((obj as any).isDimension || obj.visible === false || (obj as any).excludeFromExport) {
    return null;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 6) return null;

  const br = obj.getBoundingRect();
  // Quick AABB check against cut segment
  const segMinX = Math.min(x1, x2);
  const segMaxX = Math.max(x1, x2);
  const segMinY = Math.min(y1, y2);
  const segMaxY = Math.max(y1, y2);
  if (
    segMaxX < br.left ||
    segMinX > br.left + br.width ||
    segMaxY < br.top ||
    segMinY > br.top + br.height
  ) {
    return null;
  }

  // Also ensure the cut segment actually intersects or traverses the object's bounding rect
  const inside = (x: number, y: number) =>
    x >= br.left && x <= br.left + br.width && y >= br.top && y <= br.top + br.height;
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  const segsHit = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, ex: number, ey: number) =>
    ccw(ax, ay, cx, cy, ex, ey) !== ccw(bx, by, cx, cy, ex, ey) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, ex, ey);
  const minX = br.left;
  const maxX = br.left + br.width;
  const minY = br.top;
  const maxY = br.top + br.height;
  const touchesRect =
    inside(x1, y1) ||
    inside(x2, y2) ||
    segsHit(x1, y1, x2, y2, minX, minY, maxX, minY) ||
    segsHit(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
    segsHit(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
    segsHit(x1, y1, x2, y2, minX, maxY, minX, minY);
  if (!touchesRect) return null;

  const res = await splitObjectIntoSides(obj, x1, y1, x2, y2);
  if (!res || res.pos.length === 0 || res.neg.length === 0) return null;

  const pieceA = res.pos[0];
  const pieceB = res.neg[0];
  if (pieceA === obj || pieceB === obj) return null;

  if (autoGap) {
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const gap = 3.5;
    pieceA.set({ left: (pieceA.left || 0) + nx * gap, top: (pieceA.top || 0) + ny * gap });
    pieceB.set({ left: (pieceB.left || 0) - nx * gap, top: (pieceB.top || 0) - ny * gap });
  }

  pieceA.setCoords();
  pieceB.setCoords();

  const baseName = getObjectLabel(obj);
  ensureObjectId(pieceA, `${baseName} (Part 1)`);
  ensureObjectId(pieceB, `${baseName} (Part 2)`);

  const stackIdx = canvas.getObjects().indexOf(obj);
  canvas.remove(obj);
  if (stackIdx >= 0) {
    canvas.insertAt(stackIdx, pieceA, pieceB);
  } else {
    canvas.add(pieceA, pieceB);
  }
  return [pieceA, pieceB];
}
