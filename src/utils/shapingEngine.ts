import * as fabric from 'fabric';
import * as polygonClippingNs from 'polygon-clipping';
import type { MultiPolygon, Pair, Polygon, Ring } from 'polygon-clipping';
import { extractSceneSubpaths, VecPt } from './vectorSplit';
import { disableObjectCaching, ensureObjectId, getObjectLabel } from './canvasHelpers';

const pc = ((polygonClippingNs as any).default ?? polygonClippingNs) as typeof polygonClippingNs;

export type ShapeOperation =
  | 'combine'
  | 'weld'
  | 'trim'
  | 'intersect'
  | 'simplify'
  | 'front_minus_back'
  | 'back_minus_front'
  | 'create_boundary';

export interface ShapeOpResult {
  ok: boolean;
  message: string;
  label?: string;
  createdCount?: number;
}

type SceneSeg =
  | { type: 'L'; p0: VecPt; p1: VecPt }
  | { type: 'C'; p0: VecPt; cp1: VecPt; cp2: VecPt; p1: VecPt };

interface SceneSubpath {
  segs: SceneSeg[];
  closed: boolean;
}

function ptDist(a: VecPt, b: VecPt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPt(a: VecPt, b: VecPt, t: number): VecPt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function pointToLineDist(p: VecPt, a: VecPt, b: VecPt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return ptDist(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function flattenCubicToRingPts(
  p0: VecPt,
  cp1: VecPt,
  cp2: VecPt,
  p1: VecPt,
  out: VecPt[],
  depth: number = 0
): void {
  const chord = ptDist(p0, p1);
  const d1 = pointToLineDist(cp1, p0, p1);
  const d2 = pointToLineDist(cp2, p0, p1);
  const ctrlSpan = ptDist(p0, cp1) + ptDist(cp1, cp2) + ptDist(cp2, p1);

  const needsSplit =
    depth < 6 &&
    ((depth < 2 && ctrlSpan > 4) || (Math.max(d1, d2) > 0.22 && chord > 1.2));

  if (!needsSplit) {
    out.push(p1);
    return;
  }

  const p01 = lerpPt(p0, cp1, 0.5);
  const p12 = lerpPt(cp1, cp2, 0.5);
  const p23 = lerpPt(cp2, p1, 0.5);
  const p012 = lerpPt(p01, p12, 0.5);
  const p123 = lerpPt(p12, p23, 0.5);
  const mid = lerpPt(p012, p123, 0.5);

  flattenCubicToRingPts(p0, p01, p012, mid, out, depth + 1);
  flattenCubicToRingPts(mid, p123, p23, p1, out, depth + 1);
}

function extractTriangleSceneSubpaths(obj: fabric.FabricObject): SceneSubpath[] | null {
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

function extractBoundingBoxSceneSubpaths(obj: fabric.FabricObject): SceneSubpath[] | null {
  const w = obj.width || 0;
  const h = obj.height || 0;
  if (w <= 0 || h <= 0) return null;
  const mat = obj.calcTransformMatrix();
  const toScene = (lx: number, ly: number): VecPt => {
    const p = fabric.util.transformPoint(new fabric.Point(lx, ly), mat);
    return { x: p.x, y: p.y };
  };
  const tl = toScene(-w / 2, -h / 2);
  const tr = toScene(w / 2, -h / 2);
  const br = toScene(w / 2, h / 2);
  const bl = toScene(-w / 2, h / 2);
  return [
    {
      closed: true,
      segs: [
        { type: 'L', p0: tl, p1: tr },
        { type: 'L', p0: tr, p1: br },
        { type: 'L', p0: br, p1: bl },
        { type: 'L', p0: bl, p1: tl },
      ],
    },
  ];
}

function collectObjectSceneSubpaths(obj: fabric.FabricObject): SceneSubpath[] {
  if (!obj) return [];
  if (obj.type === 'group') {
    const children = (obj as fabric.Group).getObjects?.() || [];
    const out: SceneSubpath[] = [];
    for (const child of children) {
      out.push(...collectObjectSceneSubpaths(child));
    }
    return out;
  }
  if (obj.type === 'triangle') {
    return extractTriangleSceneSubpaths(obj) || [];
  }
  const direct = extractSceneSubpaths(obj);
  if (direct && direct.length > 0) {
    return direct as SceneSubpath[];
  }
  return extractBoundingBoxSceneSubpaths(obj) || [];
}

function ringSignedArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    area += x0 * y1 - x1 * y0;
  }
  return area * 0.5;
}

function objectToMultiPolygon(obj: fabric.FabricObject): MultiPolygon {
  const subs = collectObjectSceneSubpaths(obj);
  const rings: Ring[] = [];

  for (const sp of subs) {
    if (!sp.segs || sp.segs.length === 0) continue;
    const pts: VecPt[] = [sp.segs[0].p0];
    for (const seg of sp.segs) {
      if (seg.type === 'L') {
        pts.push(seg.p1);
      } else {
        flattenCubicToRingPts(seg.p0, seg.cp1, seg.cp2, seg.p1, pts, 0);
      }
    }

    // Remove near-duplicate consecutive vertices
    const dedup: Pair[] = [];
    for (const p of pts) {
      const prev = dedup[dedup.length - 1];
      if (!prev || Math.hypot(p.x - prev[0], p.y - prev[1]) > 0.02) {
        dedup.push([Number(p.x.toFixed(4)), Number(p.y.toFixed(4))]);
      }
    }
    if (dedup.length >= 2) {
      const first = dedup[0];
      const last = dedup[dedup.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.02) {
        dedup.push([first[0], first[1]]);
      } else {
        dedup[dedup.length - 1] = [first[0], first[1]];
      }
    }
    if (dedup.length >= 4 && Math.abs(ringSignedArea(dedup)) > 0.05) {
      rings.push(dedup);
    }
  }

  if (rings.length === 0) return [];
  if (rings.length === 1) return [[rings[0]]];

  // Respect evenodd hole winding across compound subpaths via xor accumulation
  let acc: MultiPolygon = [[rings[0]]];
  for (let i = 1; i < rings.length; i++) {
    acc = pc.xor(acc, [[rings[i]]]);
  }
  return acc;
}

function simplifyCollinearRing(ring: Ring): Pair[] {
  const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;
  if (n < 3) return [];

  const openPts: Pair[] = ring.slice(0, n);
  const cleaned: Pair[] = [];
  for (let i = 0; i < openPts.length; i++) {
    const prev = openPts[(i - 1 + openPts.length) % openPts.length];
    const curr = openPts[i];
    const next = openPts[(i + 1) % openPts.length];
    const d = pointToLineDist(
      { x: curr[0], y: curr[1] },
      { x: prev[0], y: prev[1] },
      { x: next[0], y: next[1] }
    );
    if (d > 0.015) {
      cleaned.push(curr);
    }
  }
  return cleaned.length >= 3 ? cleaned : openPts;
}

function hasVisibleFill(fill: unknown): boolean {
  if (!fill) return false;
  if (typeof fill === 'string') {
    const s = fill.trim().toLowerCase();
    return s !== '' && s !== 'transparent' && s !== 'none';
  }
  return true;
}

function pickStyleSource(objs: fabric.FabricObject[], preferLast: boolean): fabric.FabricObject {
  const ordered = preferLast ? [...objs].reverse() : objs;
  const withFill = ordered.find((o) => hasVisibleFill(o.fill));
  return withFill || ordered[0];
}

function buildPathFromSubpaths(
  subpaths: SceneSubpath[],
  styleSource: fabric.FabricObject,
  label: string,
  overrideOutlineOnly: boolean = false
): fabric.Path | null {
  const parts: string[] = [];
  for (const sp of subpaths) {
    if (!sp.segs || sp.segs.length === 0) continue;
    const start = sp.segs[0].p0;
    parts.push(`M ${Number(start.x.toFixed(3))} ${Number(start.y.toFixed(3))}`);
    for (const seg of sp.segs) {
      if (seg.type === 'L') {
        parts.push(`L ${Number(seg.p1.x.toFixed(3))} ${Number(seg.p1.y.toFixed(3))}`);
      } else {
        parts.push(
          `C ${Number(seg.cp1.x.toFixed(3))} ${Number(seg.cp1.y.toFixed(3))} ${Number(seg.cp2.x.toFixed(3))} ${Number(seg.cp2.y.toFixed(3))} ${Number(seg.p1.x.toFixed(3))} ${Number(seg.p1.y.toFixed(3))}`
        );
      }
    }
    if (sp.closed) parts.push('Z');
  }
  if (parts.length === 0) return null;

  const d = parts.join(' ');
  const fill = overrideOutlineOnly
    ? 'transparent'
    : styleSource.type === 'line'
    ? 'transparent'
    : styleSource.fill ?? '#00a651';
  const stroke = overrideOutlineOnly ? '#000000' : styleSource.stroke ?? '#000000';
  const strokeWidth = overrideOutlineOnly
    ? 0.25
    : styleSource.strokeWidth !== undefined
    ? styleSource.strokeWidth
    : 0.25;

  const pathObj = new fabric.Path(d, {
    fill,
    stroke,
    strokeWidth,
    strokeDashArray:
      !overrideOutlineOnly && Array.isArray(styleSource.strokeDashArray)
        ? [...styleSource.strokeDashArray]
        : undefined,
    strokeUniform: true,
    fillRule: 'evenodd',
    opacity: overrideOutlineOnly ? 1 : styleSource.opacity ?? 1,
    originX: 'left',
    originY: 'top',
  });
  (pathObj as any).isCurve = true;
  disableObjectCaching(pathObj);
  ensureObjectId(pathObj, label);
  pathObj.setCoords();
  return pathObj;
}

function buildPathFromMultiPolygon(
  geom: MultiPolygon,
  styleSource: fabric.FabricObject,
  label: string,
  overrideOutlineOnly: boolean = false
): fabric.Path | null {
  if (!geom || geom.length === 0) return null;

  const subpaths: SceneSubpath[] = [];
  for (const poly of geom) {
    for (const ring of poly) {
      const pts = simplifyCollinearRing(ring);
      if (pts.length < 3) continue;
      const segs: SceneSeg[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        segs.push({
          type: 'L',
          p0: { x: a[0], y: a[1] },
          p1: { x: b[0], y: b[1] },
        });
      }
      subpaths.push({ segs, closed: true });
    }
  }

  if (subpaths.length === 0) return null;
  return buildPathFromSubpaths(subpaths, styleSource, label, overrideOutlineOnly);
}

/**
 * Splits a multi-subpath fabric.Path (e.g. from Combine) back into separate fabric.Path objects.
 * Returns null if the path only has 1 subpath.
 */
export function breakApartCombinedPath(pathObj: fabric.Path): fabric.Path[] | null {
  const subs = extractSceneSubpaths(pathObj);
  if (!subs || subs.length <= 1) return null;

  const created: fabric.Path[] = [];
  for (let i = 0; i < subs.length; i++) {
    const sp = subs[i];
    const single = buildPathFromSubpaths(
      [sp as SceneSubpath],
      pathObj,
      `${getObjectLabel(pathObj)} (${i + 1})`,
      false
    );
    if (single) created.push(single);
  }
  return created.length > 1 ? created : null;
}

/**
 * Executes NuraDraw multi-object shaping / boolean / combine operations on the current canvas selection.
 */
export function executeShapeOperation(
  canvas: fabric.Canvas,
  op: ShapeOperation
): ShapeOpResult {
  const activeObj = canvas.getActiveObject();
  if (!activeObj || activeObj.type !== 'activeselection') {
    return { ok: false, message: 'Select two or more objects first' };
  }

  const sel = activeObj as fabric.ActiveSelection;
  const allCanvasObjs = canvas.getObjects();
  const selectedSorted = [...sel.getObjects()].sort(
    (a, b) => allCanvasObjs.indexOf(a) - allCanvasObjs.indexOf(b)
  );
  if (selectedSorted.length < 2) {
    return { ok: false, message: 'Select at least two objects' };
  }

  const indices = selectedSorted.map((o) => allCanvasObjs.indexOf(o)).filter((i) => i >= 0);
  const minIndex = indices.length > 0 ? Math.min(...indices) : allCanvasObjs.length;
  const maxIndex = indices.length > 0 ? Math.max(...indices) : allCanvasObjs.length;

  // Bake ActiveSelection transforms cleanly onto each independent object before extracting scene geometry
  canvas.discardActiveObject();

  const restoreSelection = () => {
    const present = selectedSorted.filter((o) => canvas.getObjects().includes(o));
    if (present.length > 1) {
      const nextSel = new fabric.ActiveSelection(present, { canvas });
      canvas.setActiveObject(nextSel);
    } else if (present.length === 1) {
      canvas.setActiveObject(present[0]);
    }
    canvas.requestRenderAll();
  };

  // 1. COMBINE (keeps exact Bezier curves with evenodd fill)
  if (op === 'combine') {
    const allSubpaths: SceneSubpath[] = [];
    for (const obj of selectedSorted) {
      allSubpaths.push(...collectObjectSceneSubpaths(obj));
    }
    if (allSubpaths.length === 0) {
      restoreSelection();
      return { ok: false, message: 'No vector paths available to Combine' };
    }
    const styleSrc = pickStyleSource(selectedSorted, true);
    const combined = buildPathFromSubpaths(allSubpaths, styleSrc, 'Combined Curve');
    if (!combined) {
      restoreSelection();
      return { ok: false, message: 'Failed to Combine selected objects' };
    }
    selectedSorted.forEach((o) => canvas.remove(o));
    canvas.insertAt(Math.min(minIndex, canvas.getObjects().length), combined);
    canvas.setActiveObject(combined);
    canvas.requestRenderAll();
    return {
      ok: true,
      label: 'Combine Objects',
      message: `Combined ${selectedSorted.length} objects`,
      createdCount: 1,
    };
  }

  // Extract closed polygon geometries for all boolean operations
  const geoms = selectedSorted.map((o) => ({
    obj: o,
    geom: objectToMultiPolygon(o),
  }));
  const validGeoms = geoms.filter((g) => g.geom.length > 0);
  if (validGeoms.length < 2) {
    restoreSelection();
    return { ok: false, message: 'Select at least two closed vector shapes' };
  }

  // 2. WELD (Union of all selected objects)
  if (op === 'weld') {
    const merged = pc.union(validGeoms[0].geom, ...validGeoms.slice(1).map((g) => g.geom));
    const styleSrc = pickStyleSource(selectedSorted, true);
    const welded = buildPathFromMultiPolygon(merged, styleSrc, 'Welded Curve');
    if (!welded) {
      restoreSelection();
      return { ok: false, message: 'Weld produced an empty result' };
    }
    selectedSorted.forEach((o) => canvas.remove(o));
    canvas.insertAt(Math.min(minIndex, canvas.getObjects().length), welded);
    canvas.setActiveObject(welded);
    canvas.requestRenderAll();
    return {
      ok: true,
      label: 'Weld',
      message: `Welded ${selectedSorted.length} objects`,
      createdCount: 1,
    };
  }

  // 3. TRIM (Top/front objects cut into bottom/back target object; cutters stay intact)
  if (op === 'trim') {
    const targetEntry = validGeoms[0];
    const cutters = validGeoms.slice(1).map((g) => g.geom);
    const cutterUnion = cutters.length === 1 ? cutters[0] : pc.union(cutters[0], ...cutters.slice(1));
    const trimmedGeom = pc.difference(targetEntry.geom, cutterUnion);

    const targetIdx = canvas.getObjects().indexOf(targetEntry.obj);
    canvas.remove(targetEntry.obj);

    const trimmedPath = buildPathFromMultiPolygon(
      trimmedGeom,
      targetEntry.obj,
      `${getObjectLabel(targetEntry.obj)} (Trimmed)`
    );
    if (trimmedPath) {
      canvas.insertAt(Math.max(0, Math.min(targetIdx, canvas.getObjects().length)), trimmedPath);
      canvas.setActiveObject(trimmedPath);
      canvas.requestRenderAll();
      return { ok: true, label: 'Trim', message: 'Trimmed target object', createdCount: 1 };
    }
    canvas.requestRenderAll();
    return { ok: true, label: 'Trim', message: 'Target object completely trimmed away', createdCount: 0 };
  }

  // 4. INTERSECT (Creates new object from overlap; original objects remain intact)
  if (op === 'intersect') {
    let overlap: MultiPolygon = validGeoms[0].geom;
    for (let i = 1; i < validGeoms.length; i++) {
      overlap = pc.intersection(overlap, validGeoms[i].geom);
      if (overlap.length === 0) break;
    }
    if (overlap.length === 0) {
      restoreSelection();
      return { ok: false, message: 'Selected objects do not intersect' };
    }
    const styleSrc = pickStyleSource(selectedSorted, false);
    const intersected = buildPathFromMultiPolygon(overlap, styleSrc, 'Intersection');
    if (!intersected) {
      restoreSelection();
      return { ok: false, message: 'Selected objects do not intersect' };
    }
    canvas.insertAt(Math.min(maxIndex + 1, canvas.getObjects().length), intersected);
    canvas.setActiveObject(intersected);
    canvas.requestRenderAll();
    return { ok: true, label: 'Intersect', message: 'Created intersection object', createdCount: 1 };
  }

  // 5. SIMPLIFY (Each lower object has upper overlapping objects trimmed out of it)
  if (op === 'simplify') {
    const resultingObjs: fabric.FabricObject[] = [];
    for (let i = 0; i < validGeoms.length; i++) {
      const entry = validGeoms[i];
      if (i === validGeoms.length - 1) {
        resultingObjs.push(entry.obj);
        continue;
      }
      const upperGeoms = validGeoms.slice(i + 1).map((g) => g.geom);
      const upperUnion = upperGeoms.length === 1 ? upperGeoms[0] : pc.union(upperGeoms[0], ...upperGeoms.slice(1));
      const diff = pc.difference(entry.geom, upperUnion);
      const idx = canvas.getObjects().indexOf(entry.obj);
      canvas.remove(entry.obj);
      const simplifiedPath = buildPathFromMultiPolygon(
        diff,
        entry.obj,
        `${getObjectLabel(entry.obj)}`
      );
      if (simplifiedPath) {
        canvas.insertAt(Math.max(0, Math.min(idx, canvas.getObjects().length)), simplifiedPath);
        resultingObjs.push(simplifiedPath);
      }
    }
    if (resultingObjs.length > 1) {
      const nextSel = new fabric.ActiveSelection(resultingObjs, { canvas });
      canvas.setActiveObject(nextSel);
    } else if (resultingObjs.length === 1) {
      canvas.setActiveObject(resultingObjs[0]);
    }
    canvas.requestRenderAll();
    return {
      ok: true,
      label: 'Simplify',
      message: 'Simplified overlapping objects',
      createdCount: resultingObjs.length,
    };
  }

  // 6. FRONT MINUS BACK (Topmost front object minus all objects behind it; back objects removed)
  if (op === 'front_minus_back') {
    const frontEntry = validGeoms[validGeoms.length - 1];
    const backGeoms = validGeoms.slice(0, -1).map((g) => g.geom);
    const backUnion = backGeoms.length === 1 ? backGeoms[0] : pc.union(backGeoms[0], ...backGeoms.slice(1));
    const diff = pc.difference(frontEntry.geom, backUnion);

    selectedSorted.forEach((o) => canvas.remove(o));
    const resultPath = buildPathFromMultiPolygon(diff, frontEntry.obj, 'Front Minus Back');
    if (resultPath) {
      canvas.insertAt(Math.min(minIndex, canvas.getObjects().length), resultPath);
      canvas.setActiveObject(resultPath);
      canvas.requestRenderAll();
      return { ok: true, label: 'Front Minus Back', message: 'Applied Front Minus Back', createdCount: 1 };
    }
    canvas.requestRenderAll();
    return { ok: true, label: 'Front Minus Back', message: 'Front object completely subtracted', createdCount: 0 };
  }

  // 7. BACK MINUS FRONT (Bottommost back object minus all objects in front; front objects removed)
  if (op === 'back_minus_front') {
    const backEntry = validGeoms[0];
    const frontGeoms = validGeoms.slice(1).map((g) => g.geom);
    const frontUnion = frontGeoms.length === 1 ? frontGeoms[0] : pc.union(frontGeoms[0], ...frontGeoms.slice(1));
    const diff = pc.difference(backEntry.geom, frontUnion);

    selectedSorted.forEach((o) => canvas.remove(o));
    const resultPath = buildPathFromMultiPolygon(diff, backEntry.obj, 'Back Minus Front');
    if (resultPath) {
      canvas.insertAt(Math.min(minIndex, canvas.getObjects().length), resultPath);
      canvas.setActiveObject(resultPath);
      canvas.requestRenderAll();
      return { ok: true, label: 'Back Minus Front', message: 'Applied Back Minus Front', createdCount: 1 };
    }
    canvas.requestRenderAll();
    return { ok: true, label: 'Back Minus Front', message: 'Back object completely subtracted', createdCount: 0 };
  }

  // 8. CREATE BOUNDARY (Creates outer closed perimeter around selected objects; originals stay intact)
  if (op === 'create_boundary') {
    const merged = pc.union(validGeoms[0].geom, ...validGeoms.slice(1).map((g) => g.geom));
    const outerOnly: MultiPolygon = merged
      .filter((poly: Polygon) => poly.length > 0)
      .map((poly: Polygon) => [poly[0]]);
    const boundary = buildPathFromMultiPolygon(
      outerOnly,
      validGeoms[0].obj,
      'Boundary',
      true
    );
    if (!boundary) {
      restoreSelection();
      return { ok: false, message: 'Could not create boundary from selection' };
    }
    canvas.insertAt(Math.min(maxIndex + 1, canvas.getObjects().length), boundary);
    canvas.setActiveObject(boundary);
    canvas.requestRenderAll();
    return { ok: true, label: 'Create Boundary', message: 'Created outer boundary path', createdCount: 1 };
  }

  restoreSelection();
  return { ok: false, message: 'Unsupported shaping operation' };
}
