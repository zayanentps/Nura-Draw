import * as fabric from 'fabric';
import { extractSceneSubpaths, VecPt } from './vectorSplit';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export interface SmartFillOptions {
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface SmartFillResult {
  path: fabric.Path;
  area: number;
  holeCount: number;
}

interface RawSeg {
  a: VecPt;
  b: VecPt;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  len: number;
}

interface HalfEdge {
  id: number;
  from: number;
  to: number;
  twin: number;
  angle: number;
  used: boolean;
}

interface PlanarFace {
  pts: VecPt[];
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  interiorPt: VecPt;
}

const VECTOR_BOUNDARY_TYPES = new Set([
  'rect',
  'circle',
  'ellipse',
  'triangle',
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

function pointToSegmentLineDist(p: VecPt, a: VecPt, b: VecPt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return dist(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function flattenCubicToSegments(
  p0: VecPt,
  cp1: VecPt,
  cp2: VecPt,
  p1: VecPt,
  out: { a: VecPt; b: VecPt }[],
  depth: number = 0
): void {
  const chord = dist(p0, p1);
  const d1 = pointToSegmentLineDist(cp1, p0, p1);
  const d2 = pointToSegmentLineDist(cp2, p0, p1);
  const ctrlSpan = dist(p0, cp1) + dist(cp1, cp2) + dist(cp2, p1);

  const needsSplit =
    depth < 6 &&
    ((depth < 2 && ctrlSpan > 4) || (Math.max(d1, d2) > 0.22 && chord > 1.2));

  if (!needsSplit) {
    if (chord > 0.08) {
      out.push({ a: p0, b: p1 });
    }
    return;
  }

  const p01 = lerpPt(p0, cp1, 0.5);
  const p12 = lerpPt(cp1, cp2, 0.5);
  const p23 = lerpPt(cp2, p1, 0.5);
  const p012 = lerpPt(p01, p12, 0.5);
  const p123 = lerpPt(p12, p23, 0.5);
  const mid = lerpPt(p012, p123, 0.5);

  flattenCubicToSegments(p0, p01, p012, mid, out, depth + 1);
  flattenCubicToSegments(mid, p123, p23, p1, out, depth + 1);
}

function extractTriangleSubpaths(obj: fabric.FabricObject): { segs: { type: 'L'; p0: VecPt; p1: VecPt }[]; closed: boolean }[] | null {
  const w = obj.width || 0;
  const h = obj.height || 0;
  if (w <= 0 || h <= 0) return null;
  const mat = obj.calcTransformMatrix();
  const toScene = (lx: number, ly: number): VecPt => {
    const p = fabric.util.transformPoint(new fabric.Point(lx, ly), mat);
    return { x: p.x, y: p.y };
  };
  const top = toScene(0, -h / 2);
  const br = toScene(w / 2, h / 2);
  const bl = toScene(-w / 2, h / 2);
  return [
    {
      closed: true,
      segs: [
        { type: 'L', p0: top, p1: br },
        { type: 'L', p0: br, p1: bl },
        { type: 'L', p0: bl, p1: top },
      ],
    },
  ];
}

function collectBoundaryObjects(obj: fabric.FabricObject, out: fabric.FabricObject[]): void {
  if (!obj || obj.visible === false) return;
  const anyObj = obj as any;
  if (
    anyObj.isDimension ||
    anyObj.isSymmetryAxis ||
    anyObj.isSymmetryPreview ||
    anyObj.excludeFromExport ||
    anyObj.isGrid ||
    anyObj.isGuide ||
    anyObj.isTempPreview
  ) {
    return;
  }

  if (obj.type === 'group') {
    const children = (obj as fabric.Group).getObjects?.() || [];
    for (const child of children) {
      collectBoundaryObjects(child, out);
    }
    return;
  }

  if (VECTOR_BOUNDARY_TYPES.has(obj.type || '')) {
    out.push(obj);
  }
}

function extractAllRawSegments(canvas: fabric.Canvas): RawSeg[] {
  const objs: fabric.FabricObject[] = [];
  for (const topObj of canvas.getObjects()) {
    collectBoundaryObjects(topObj, objs);
  }

  const pairs: { a: VecPt; b: VecPt }[] = [];

  for (const obj of objs) {
    const subs = obj.type === 'triangle' ? extractTriangleSubpaths(obj) : extractSceneSubpaths(obj);
    if (!subs) continue;

    for (const sp of subs) {
      if (!sp.segs || sp.segs.length === 0) continue;
      const beforeCount = pairs.length;
      for (const seg of sp.segs) {
        if (seg.type === 'L') {
          if (dist(seg.p0, seg.p1) > 0.08) {
            pairs.push({ a: seg.p0, b: seg.p1 });
          }
        } else {
          flattenCubicToSegments(seg.p0, seg.cp1, seg.cp2, seg.p1, pairs, 0);
        }
      }
      if (sp.closed && pairs.length > beforeCount) {
        const firstPt = pairs[beforeCount].a;
        const lastPt = pairs[pairs.length - 1].b;
        if (dist(lastPt, firstPt) > 0.08) {
          pairs.push({ a: lastPt, b: firstPt });
        }
      }
    }
  }

  return pairs.map((s) => ({
    a: s.a,
    b: s.b,
    minX: Math.min(s.a.x, s.b.x),
    minY: Math.min(s.a.y, s.b.y),
    maxX: Math.max(s.a.x, s.b.x),
    maxY: Math.max(s.a.y, s.b.y),
    len: dist(s.a, s.b),
  }));
}

function splitRawSegmentsAtIntersections(segs: RawSeg[]): { a: VecPt; b: VecPt }[] {
  const n = segs.length;
  const splits: number[][] = Array.from({ length: n }, () => [0, 1]);
  const AABB_PAD = 0.3;
  const ENDPOINT_PX_TOL = 0.14;
  const HIT_DIST_TOL = 0.15;
  const MIN_SPLIT_PX = 0.08;

  for (let i = 0; i < n; i++) {
    const sA = segs[i];
    if (sA.len < 0.08) continue;
    const dAx = sA.b.x - sA.a.x;
    const dAy = sA.b.y - sA.a.y;

    for (let j = i + 1; j < n; j++) {
      const sB = segs[j];
      if (sB.len < 0.08) continue;

      if (
        sA.maxX + AABB_PAD < sB.minX ||
        sA.minX - AABB_PAD > sB.maxX ||
        sA.maxY + AABB_PAD < sB.minY ||
        sA.minY - AABB_PAD > sB.maxY
      ) {
        continue;
      }

      const dBx = sB.b.x - sB.a.x;
      const dBy = sB.b.y - sB.a.y;
      const denom = dAx * dBy - dAy * dBx;
      const sinAngle = Math.abs(denom) / (sA.len * sB.len);

      if (sinAngle < 1e-4) {
        // Collinear / nearly parallel segments: split at overlapping projections
        const perp = Math.abs((sB.a.x - sA.a.x) * dAy - (sB.a.y - sA.a.y) * dAx) / sA.len;
        if (perp > 0.18) continue;

        const lenA2 = sA.len * sA.len;
        const tb0 = ((sB.a.x - sA.a.x) * dAx + (sB.a.y - sA.a.y) * dAy) / lenA2;
        const tb1 = ((sB.b.x - sA.a.x) * dAx + (sB.b.y - sA.a.y) * dAy) / lenA2;
        const tMin = Math.min(tb0, tb1);
        const tMax = Math.max(tb0, tb1);
        const tMargin = ENDPOINT_PX_TOL / sA.len;
        if (tMax < -tMargin || tMin > 1 + tMargin) continue;

        if (tb0 * sA.len > MIN_SPLIT_PX && (1 - tb0) * sA.len > MIN_SPLIT_PX) splits[i].push(tb0);
        if (tb1 * sA.len > MIN_SPLIT_PX && (1 - tb1) * sA.len > MIN_SPLIT_PX) splits[i].push(tb1);

        const lenB2 = sB.len * sB.len;
        const ua0 = ((sA.a.x - sB.a.x) * dBx + (sA.a.y - sB.a.y) * dBy) / lenB2;
        const ua1 = ((sA.b.x - sB.a.x) * dBx + (sA.b.y - sB.a.y) * dBy) / lenB2;
        if (ua0 * sB.len > MIN_SPLIT_PX && (1 - ua0) * sB.len > MIN_SPLIT_PX) splits[j].push(ua0);
        if (ua1 * sB.len > MIN_SPLIT_PX && (1 - ua1) * sB.len > MIN_SPLIT_PX) splits[j].push(ua1);
        continue;
      }

      const rx = sB.a.x - sA.a.x;
      const ry = sB.a.y - sA.a.y;
      const t = (rx * dBy - ry * dBx) / denom;
      const u = (rx * dAy - ry * dAx) / denom;

      const extA = ENDPOINT_PX_TOL / sA.len;
      const extB = ENDPOINT_PX_TOL / sB.len;

      if (t >= -extA && t <= 1 + extA && u >= -extB && u <= 1 + extB) {
        const tc = Math.max(0, Math.min(1, t));
        const uc = Math.max(0, Math.min(1, u));
        const pA = lerpPt(sA.a, sA.b, tc);
        const pB = lerpPt(sB.a, sB.b, uc);
        if (dist(pA, pB) > HIT_DIST_TOL) continue;

        if (tc * sA.len > MIN_SPLIT_PX && (1 - tc) * sA.len > MIN_SPLIT_PX) {
          splits[i].push(tc);
        }
        if (uc * sB.len > MIN_SPLIT_PX && (1 - uc) * sB.len > MIN_SPLIT_PX) {
          splits[j].push(uc);
        }
      }
    }
  }

  const out: { a: VecPt; b: VecPt }[] = [];
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    if (s.len < 0.08) continue;
    const ts = splits[i].sort((a, b) => a - b);
    const uniq: number[] = [ts[0]];
    const minDt = MIN_SPLIT_PX / s.len;
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - uniq[uniq.length - 1] > minDt) {
        uniq.push(ts[k]);
      } else if (k === ts.length - 1) {
        uniq[uniq.length - 1] = 1;
      }
    }
    if (uniq[uniq.length - 1] < 1) uniq[uniq.length - 1] = 1;

    for (let k = 0; k < uniq.length - 1; k++) {
      const p0 = lerpPt(s.a, s.b, uniq[k]);
      const p1 = lerpPt(s.a, s.b, uniq[k + 1]);
      if (dist(p0, p1) > 0.08) {
        out.push({ a: p0, b: p1 });
      }
    }
  }

  return out;
}

function buildPrunedPlanarGraph(pieces: { a: VecPt; b: VecPt }[]): {
  verts: VecPt[];
  edges: [number, number][];
} {
  const SNAP_TOL = 0.2;
  const CELL = 0.3;
  const grid = new Map<string, number[]>();
  const verts: VecPt[] = [];

  const getVertId = (pt: VecPt): number => {
    const cx = Math.floor(pt.x / CELL);
    const cy = Math.floor(pt.y / CELL);
    let bestId = -1;
    let bestDist = SNAP_TOL;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = grid.get(key);
        if (!bucket) continue;
        for (const vid of bucket) {
          const d = dist(verts[vid], pt);
          if (d <= bestDist) {
            bestDist = d;
            bestId = vid;
          }
        }
      }
    }

    if (bestId >= 0) return bestId;

    const id = verts.length;
    verts.push({ x: pt.x, y: pt.y });
    const homeKey = `${cx},${cy}`;
    const homeBucket = grid.get(homeKey);
    if (homeBucket) homeBucket.push(id);
    else grid.set(homeKey, [id]);
    return id;
  };

  const adj = new Map<number, Set<number>>();
  const ensureAdj = (v: number) => {
    let set = adj.get(v);
    if (!set) {
      set = new Set<number>();
      adj.set(v, set);
    }
    return set;
  };

  for (const pc of pieces) {
    const u = getVertId(pc.a);
    const v = getVertId(pc.b);
    if (u === v) continue;
    ensureAdj(u).add(v);
    ensureAdj(v).add(u);
  }

  // Iteratively prune degree < 2 vertices (removes open curves, hair lines, protruding cut tails)
  const queue: number[] = [];
  const inQueue = new Set<number>();
  for (const [vid, nbrs] of adj.entries()) {
    if (nbrs.size < 2) {
      queue.push(vid);
      inQueue.add(vid);
    }
  }

  while (queue.length > 0) {
    const vid = queue.pop()!;
    const nbrs = adj.get(vid);
    if (!nbrs) continue;
    for (const nbr of nbrs) {
      const nSet = adj.get(nbr);
      if (nSet) {
        nSet.delete(vid);
        if (nSet.size < 2 && !inQueue.has(nbr)) {
          queue.push(nbr);
          inQueue.add(nbr);
        }
      }
    }
    adj.delete(vid);
  }

  const edgeKeys = new Set<string>();
  const edges: [number, number][] = [];
  for (const [u, nbrs] of adj.entries()) {
    for (const v of nbrs) {
      if (u < v) {
        const key = `${u}_${v}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push([u, v]);
        }
      }
    }
  }

  return { verts, edges };
}

function signedPolygonArea(pts: VecPt[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum * 0.5;
}

function pointInPolygon(pt: VecPt, poly: VecPt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersects =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function findPolygonInteriorPoint(pts: VecPt[]): VecPt {
  let cx = 0;
  let cy = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const centroid = { x: cx / pts.length, y: cy / pts.length };
  if (pointInPolygon(centroid, pts)) return centroid;

  // Scanline fallback for concave polygons
  for (const frac of [0.5, 0.35, 0.65, 0.25, 0.75]) {
    const y = minY + (maxY - minY) * frac;
    const xs: number[] = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[j];
      const b = pts[i];
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    xs.sort((a, b) => a - b);
    if (xs.length >= 2) {
      const candidate = { x: 0.5 * (xs[0] + xs[1]), y };
      if (pointInPolygon(candidate, pts)) return candidate;
    }
  }

  return pts[0];
}

function simplifyCollinearPolygon(pts: VecPt[], tol: number = 0.025): VecPt[] {
  if (pts.length <= 3) return pts;
  const out: VecPt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = out.length > 0 ? out[out.length - 1] : pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const segLen = dist(prev, next);
    if (segLen < 1e-4) continue;
    const perp = pointToSegmentLineDist(curr, prev, next);
    const dot =
      (curr.x - prev.x) * (next.x - curr.x) + (curr.y - prev.y) * (next.y - curr.y);
    if (perp <= tol && dot >= 0) {
      continue;
    }
    out.push(curr);
  }
  return out.length >= 3 ? out : pts;
}

function extractBoundedPlanarFaces(
  verts: VecPt[],
  edges: [number, number][]
): PlanarFace[] {
  if (edges.length < 3) return [];

  const halfEdges: HalfEdge[] = [];
  const outgoing = new Map<number, number[]>();
  const addOut = (vid: number, heId: number) => {
    let list = outgoing.get(vid);
    if (!list) {
      list = [];
      outgoing.set(vid, list);
    }
    list.push(heId);
  };

  for (const [u, v] of edges) {
    const id0 = halfEdges.length;
    const id1 = id0 + 1;
    const a = verts[u];
    const b = verts[v];
    halfEdges.push({
      id: id0,
      from: u,
      to: v,
      twin: id1,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      used: false,
    });
    halfEdges.push({
      id: id1,
      from: v,
      to: u,
      twin: id0,
      angle: Math.atan2(a.y - b.y, a.x - b.x),
      used: false,
    });
    addOut(u, id0);
    addOut(v, id1);
  }

  const posInOutgoing = new Int32Array(halfEdges.length);
  for (const [, list] of outgoing.entries()) {
    list.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle);
    for (let i = 0; i < list.length; i++) {
      posInOutgoing[list[i]] = i;
    }
  }

  const faces: PlanarFace[] = [];
  const maxSteps = halfEdges.length + 2;

  for (let i = 0; i < halfEdges.length; i++) {
    if (halfEdges[i].used) continue;
    const pts: VecPt[] = [];
    let cur = halfEdges[i];
    let steps = 0;
    let closedCleanly = false;

    while (steps++ < maxSteps) {
      if (cur.used) {
        closedCleanly = cur.id === i;
        break;
      }
      cur.used = true;
      pts.push(verts[cur.from]);

      const outList = outgoing.get(cur.to);
      if (!outList || outList.length === 0) break;
      const twinIdx = posInOutgoing[cur.twin];
      const nextIdx = (twinIdx - 1 + outList.length) % outList.length;
      cur = halfEdges[outList[nextIdx]];
    }

    if (!closedCleanly || pts.length < 3) continue;

    // In screen coords (x right, y down), signedArea > 0 is an interior bounded face
    const sArea = signedPolygonArea(pts);
    if (sArea > 1.0) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      faces.push({
        pts,
        area: sArea,
        minX,
        minY,
        maxX,
        maxY,
        interiorPt: findPolygonInteriorPoint(pts),
      });
    }
  }

  return faces;
}

function buildSvgPathFromLoops(outer: VecPt[], holes: VecPt[][]): string {
  const parts: string[] = [];
  const appendRing = (ring: VecPt[]) => {
    const clean = simplifyCollinearPolygon(ring);
    if (clean.length < 3) return;
    parts.push(`M ${clean[0].x.toFixed(2)} ${clean[0].y.toFixed(2)}`);
    for (let i = 1; i < clean.length; i++) {
      parts.push(`L ${clean[i].x.toFixed(2)} ${clean[i].y.toFixed(2)}`);
    }
    parts.push('Z');
  };
  appendRing(outer);
  for (const h of holes) {
    appendRing(h);
  }
  return parts.join(' ');
}

/**
 * Computes the minimal enclosed/intersected planar face containing `clickPt`
 * across all visible vector objects on `canvas`, and constructs a brand-new
 * filled `fabric.Path` object without altering the source boundary objects.
 */
export function smartFillAtPoint(
  canvas: fabric.Canvas,
  clickPt: VecPt,
  options: SmartFillOptions
): SmartFillResult | null {
  const rawSegs = extractAllRawSegments(canvas);
  if (rawSegs.length < 3) return null;

  const pieces = splitRawSegmentsAtIntersections(rawSegs);
  if (pieces.length < 3) return null;

  const { verts, edges } = buildPrunedPlanarGraph(pieces);
  if (verts.length < 3 || edges.length < 3) return null;

  const faces = extractBoundedPlanarFaces(verts, edges);
  if (faces.length === 0) return null;

  const containing = faces.filter(
    (f) =>
      clickPt.x >= f.minX &&
      clickPt.x <= f.maxX &&
      clickPt.y >= f.minY &&
      clickPt.y <= f.maxY &&
      pointInPolygon(clickPt, f.pts)
  );

  if (containing.length === 0) return null;

  // Smallest containing face = exact minimal intersected/enclosed region at clickPt
  containing.sort((a, b) => a.area - b.area);
  const winner = containing[0];

  // Collect any disjoint enclosed shapes strictly inside `winner` (holes/donuts)
  const candidateHoles = faces.filter(
    (f) =>
      f !== winner &&
      f.area < winner.area - 0.5 &&
      f.minX >= winner.minX - 0.5 &&
      f.maxX <= winner.maxX + 0.5 &&
      f.minY >= winner.minY - 0.5 &&
      f.maxY <= winner.maxY + 0.5 &&
      !pointInPolygon(clickPt, f.pts) &&
      pointInPolygon(f.interiorPt, winner.pts)
  );

  // Keep only top-level holes directly inside `winner` (not islands nested inside another hole)
  const immediateHoles = candidateHoles.filter(
    (h) =>
      !candidateHoles.some(
        (other) =>
          other !== h &&
          other.area > h.area &&
          pointInPolygon(h.interiorPt, other.pts)
      )
  );

  const svgD = buildSvgPathFromLoops(
    winner.pts,
    immediateHoles.map((h) => h.pts)
  );
  if (!svgD) return null;

  const sw = Math.max(0, Number(options.strokeWidth) || 0);
  const strokeVal = sw > 0 && options.strokeColor && options.strokeColor !== 'transparent'
    ? options.strokeColor
    : 'transparent';
  const fillVal = options.fillColor || '#00a651';

  const filledPath = new fabric.Path(svgD, {
    fill: fillVal,
    fillRule: 'evenodd',
    stroke: strokeVal,
    strokeWidth: sw > 0 ? sw : 0,
    strokeUniform: true,
    strokeLineJoin: 'round',
    strokeLineCap: 'round',
    perPixelTargetFind: fillVal !== 'transparent',
  });

  (filledPath as any).isCurve = true;
  (filledPath as any).isSmartFill = true;
  ensureObjectId(filledPath, 'Smart Fill');
  disableObjectCaching(filledPath);
  filledPath.setCoords();

  return {
    path: filledPath,
    area: winner.area,
    holeCount: immediateHoles.length,
  };
}
