import * as fabric from 'fabric';
import { SnapConfig, PageConfig, SnapGuideline, SnapMarker, SnapPointType } from '../types';

export interface CalculatedSnapPoint {
  x: number;
  y: number;
  type: SnapPointType;
  label: string;
  source: 'object' | 'page' | 'grid';
}

export interface LineSegment {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  objId: number;
}

export interface GrabbedPointInfo {
  type: SnapPointType;
  label: string;
  offsetFromOrigin: { dx: number; dy: number };
}

export interface PolarGuide {
  origin: { x: number; y: number };
  point: { x: number; y: number };
  angleDeg: number;
  isOrtho: boolean;
}

const OSNAP_PRIORITY: Record<SnapPointType, number> = {
  intersection: 0,
  node: 1,
  midpoint: 2,
  perpendicular: 3,
  center: 4,
  quadrant: 5,
};

function transformPt(x: number, y: number, matrix: fabric.TMat2D): { x: number; y: number } {
  const pt = fabric.util.transformPoint(new fabric.Point(x, y), matrix);
  return { x: pt.x, y: pt.y };
}

/**
 * Geometric intersection of two finite line segments (with fast AABB rejection).
 */
export function getLineIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): { x: number; y: number } | null {
  if (
    Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) - 0.5 ||
    Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) + 0.5 ||
    Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) - 0.5 ||
    Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y) + 0.5
  ) {
    return null;
  }

  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-6) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

  if (t >= -0.001 && t <= 1.001 && u >= -0.001 && u <= 1.001) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }
  return null;
}

/**
 * Drops a perpendicular from `origin` onto finite segment [p1, p2] if projection lies inside segment.
 */
function getPerpendicularFoot(
  origin: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } | null {
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-4) return null;
  const t = ((origin.x - p1.x) * vx + (origin.y - p1.y) * vy) / lenSq;
  if (t > 0.02 && t < 0.98) {
    return { x: p1.x + t * vx, y: p1.y + t * vy };
  }
  return null;
}

function getEffectiveMatrix(
  obj: fabric.FabricObject,
  parentMatrix?: fabric.TMat2D
): fabric.TMat2D {
  if (parentMatrix) {
    return fabric.util.multiplyTransformMatrices(parentMatrix, obj.calcOwnMatrix());
  }
  return obj.calcTransformMatrix();
}

/**
 * Extracts exact geometric edges in scene coordinates for cross-object intersection & perpendicular snapping.
 */
export function getObjectSegments(
  obj: fabric.FabricObject,
  objId: number = 0,
  parentMatrix?: fabric.TMat2D
): LineSegment[] {
  const segments: LineSegment[] = [];
  try {
    const matrix = getEffectiveMatrix(obj, parentMatrix);

    if (obj.type === 'line') {
      const lp = (obj as fabric.Line).calcLinePoints();
      const p1 = transformPt(lp.x1, lp.y1, matrix);
      const p2 = transformPt(lp.x2, lp.y2, matrix);
      segments.push({ p1, p2, objId });
      return segments;
    }

    if (obj.type === 'circle' || obj.type === 'ellipse') {
      // Circles/ellipses do not have rectangular corner edges
      return segments;
    }

    if ((obj.type === 'polygon' || obj.type === 'polyline') && Array.isArray((obj as any).points)) {
      const polyPts = (obj as any).points as { x: number; y: number }[];
      const offset = (obj as any).pathOffset || { x: 0, y: 0 };
      const worldPts = polyPts.map((p) => transformPt(p.x - offset.x, p.y - offset.y, matrix));
      const count = obj.type === 'polygon' ? worldPts.length : worldPts.length - 1;
      for (let i = 0; i < count; i++) {
        const next = worldPts[(i + 1) % worldPts.length];
        segments.push({ p1: worldPts[i], p2: next, objId });
      }
      return segments;
    }

    if (obj.type === 'path' && Array.isArray((obj as any).path)) {
      const cmds = (obj as any).path as any[];
      const offset = (obj as any).pathOffset || { x: 0, y: 0 };
      let cur: { x: number; y: number } | null = null;
      let subStart: { x: number; y: number } | null = null;

      for (const cmd of cmds) {
        const op = String(cmd[0]).toUpperCase();
        if (op === 'M' && cmd.length >= 3) {
          cur = transformPt(cmd[1] - offset.x, cmd[2] - offset.y, matrix);
          subStart = cur;
        } else if (op === 'L' && cmd.length >= 3 && cur) {
          const next = transformPt(cmd[1] - offset.x, cmd[2] - offset.y, matrix);
          segments.push({ p1: cur, p2: next, objId });
          cur = next;
        } else if (op === 'Q' && cmd.length >= 5 && cur) {
          const next = transformPt(cmd[3] - offset.x, cmd[4] - offset.y, matrix);
          segments.push({ p1: cur, p2: next, objId });
          cur = next;
        } else if (op === 'C' && cmd.length >= 7 && cur) {
          const next = transformPt(cmd[5] - offset.x, cmd[6] - offset.y, matrix);
          segments.push({ p1: cur, p2: next, objId });
          cur = next;
        } else if (op === 'Z' && cur && subStart) {
          segments.push({ p1: cur, p2: subStart, objId });
          cur = subStart;
        }
      }
      if (segments.length > 0) return segments;
    }

    if ((obj.type === 'group' || obj.type === 'activeselection') && typeof (obj as fabric.Group).getObjects === 'function') {
      const children = (obj as fabric.Group).getObjects();
      for (const child of children) {
        segments.push(...getObjectSegments(child, objId, matrix));
      }
      return segments;
    }

    // Standard Rect / Text / Fallback: use exact vector centerline corners (±width/2, ±height/2)
    // rather than getCoords(), which includes strokeWidth/2 outer padding and offsets outlines
    const w = (obj.width || 0) / 2;
    const h = (obj.height || 0) / 2;
    const tl = transformPt(-w, -h, matrix);
    const tr = transformPt(w, -h, matrix);
    const br = transformPt(w, h, matrix);
    const bl = transformPt(-w, h, matrix);
    segments.push({ p1: tl, p2: tr, objId });
    segments.push({ p1: tr, p2: br, objId });
    segments.push({ p1: br, p2: bl, objId });
    segments.push({ p1: bl, p2: tl, objId });
  } catch {
    // ignore malformed object geometry
  }
  return segments;
}

/**
 * Returns the 4 vector centerline corners [tl, tr, br, bl] in scene coordinates (without strokeWidth padding).
 */
export function getObjectCenterlineCorners(
  obj: fabric.FabricObject,
  parentMatrix?: fabric.TMat2D
): { x: number; y: number }[] {
  const matrix = getEffectiveMatrix(obj, parentMatrix);
  const w = (obj.width || 0) / 2;
  const h = (obj.height || 0) / 2;
  return [
    transformPt(-w, -h, matrix),
    transformPt(w, -h, matrix),
    transformPt(w, h, matrix),
    transformPt(-w, h, matrix),
  ];
}

/**
 * Extracts exact AutoCAD OSNAP feature points from a Fabric object:
 * - Endpoint (`node`)
 * - Midpoint (`midpoint`)
 * - Center (`center`)
 * - Quadrant (`quadrant` for circle/ellipse)
 */
export function extractObjectFeaturePoints(
  obj: fabric.FabricObject,
  source: 'object' | 'page' = 'object',
  parentMatrix?: fabric.TMat2D
): CalculatedSnapPoint[] {
  const points: CalculatedSnapPoint[] = [];

  try {
    const matrix = getEffectiveMatrix(obj, parentMatrix);

    // 1. Line: exact endpoints + midpoint
    if (obj.type === 'line') {
      const lp = (obj as fabric.Line).calcLinePoints();
      const p1 = transformPt(lp.x1, lp.y1, matrix);
      const p2 = transformPt(lp.x2, lp.y2, matrix);
      points.push({ x: p1.x, y: p1.y, type: 'node', label: 'Endpoint', source });
      points.push({ x: p2.x, y: p2.y, type: 'node', label: 'Endpoint', source });
      points.push({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        type: 'midpoint',
        label: 'Midpoint',
        source,
      });
      return points;
    }

    // 2. Circle / Ellipse: Center + 4 Quadrants
    if (obj.type === 'circle' || obj.type === 'ellipse') {
      const center = transformPt(0, 0, matrix);
      points.push({ x: center.x, y: center.y, type: 'center', label: 'Center', source });

      const rx = obj.type === 'circle' ? (obj as fabric.Circle).radius || 0 : (obj as fabric.Ellipse).rx || 0;
      const ry = obj.type === 'circle' ? (obj as fabric.Circle).radius || 0 : (obj as fabric.Ellipse).ry || 0;
      const qTop = transformPt(0, -ry, matrix);
      const qRight = transformPt(rx, 0, matrix);
      const qBottom = transformPt(0, ry, matrix);
      const qLeft = transformPt(-rx, 0, matrix);

      points.push({ x: qTop.x, y: qTop.y, type: 'quadrant', label: 'Quadrant', source });
      points.push({ x: qRight.x, y: qRight.y, type: 'quadrant', label: 'Quadrant', source });
      points.push({ x: qBottom.x, y: qBottom.y, type: 'quadrant', label: 'Quadrant', source });
      points.push({ x: qLeft.x, y: qLeft.y, type: 'quadrant', label: 'Quadrant', source });
      return points;
    }

    // 3. Polygon / Polyline: exact transformed vertices (accounting for pathOffset) + edge midpoints + center
    if ((obj.type === 'polygon' || obj.type === 'polyline') && Array.isArray((obj as any).points)) {
      const polyPts = (obj as any).points as { x: number; y: number }[];
      const offset = (obj as any).pathOffset || { x: 0, y: 0 };
      const worldPts = polyPts.map((p) => transformPt(p.x - offset.x, p.y - offset.y, matrix));

      for (let i = 0; i < worldPts.length; i++) {
        points.push({ x: worldPts[i].x, y: worldPts[i].y, type: 'node', label: 'Endpoint', source });
      }

      const edgeCount = obj.type === 'polygon' ? worldPts.length : worldPts.length - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = worldPts[i];
        const b = worldPts[(i + 1) % worldPts.length];
        points.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          type: 'midpoint',
          label: 'Midpoint',
          source,
        });
      }

      const center = transformPt(0, 0, matrix);
      points.push({ x: center.x, y: center.y, type: 'center', label: 'Center', source });
      return points;
    }

    // 4. Path: exact vertices + straight-segment midpoints + center
    if (obj.type === 'path' && Array.isArray((obj as any).path)) {
      const cmds = (obj as any).path as any[];
      const offset = (obj as any).pathOffset || { x: 0, y: 0 };
      let cur: { x: number; y: number } | null = null;
      let subStart: { x: number; y: number } | null = null;

      for (const cmd of cmds) {
        const op = String(cmd[0]).toUpperCase();
        if (op === 'M' && cmd.length >= 3) {
          cur = transformPt(cmd[1] - offset.x, cmd[2] - offset.y, matrix);
          subStart = cur;
          points.push({ x: cur.x, y: cur.y, type: 'node', label: 'Endpoint', source });
        } else if (op === 'L' && cmd.length >= 3) {
          const next = transformPt(cmd[1] - offset.x, cmd[2] - offset.y, matrix);
          points.push({ x: next.x, y: next.y, type: 'node', label: 'Endpoint', source });
          if (cur) {
            points.push({
              x: (cur.x + next.x) / 2,
              y: (cur.y + next.y) / 2,
              type: 'midpoint',
              label: 'Midpoint',
              source,
            });
          }
          cur = next;
        } else if (op === 'Q' && cmd.length >= 5) {
          const next = transformPt(cmd[3] - offset.x, cmd[4] - offset.y, matrix);
          points.push({ x: next.x, y: next.y, type: 'node', label: 'Endpoint', source });
          cur = next;
        } else if (op === 'C' && cmd.length >= 7) {
          const next = transformPt(cmd[5] - offset.x, cmd[6] - offset.y, matrix);
          points.push({ x: next.x, y: next.y, type: 'node', label: 'Endpoint', source });
          cur = next;
        } else if (op === 'Z' && cur && subStart) {
          points.push({
            x: (cur.x + subStart.x) / 2,
            y: (cur.y + subStart.y) / 2,
            type: 'midpoint',
            label: 'Midpoint',
            source,
          });
          cur = subStart;
        }
      }

      const center = transformPt(0, 0, matrix);
      points.push({ x: center.x, y: center.y, type: 'center', label: 'Center', source });
      return points;
    }

    // 5. Group / ActiveSelection: outer centerline bounds + child feature points
    if ((obj.type === 'group' || obj.type === 'activeselection') && typeof (obj as fabric.Group).getObjects === 'function') {
      const center = transformPt(0, 0, matrix);
      points.push({ x: center.x, y: center.y, type: 'center', label: 'Center', source });

      const [tl, tr, br, bl] = getObjectCenterlineCorners(obj, parentMatrix);
      points.push({ x: tl.x, y: tl.y, type: 'node', label: 'Endpoint', source });
      points.push({ x: tr.x, y: tr.y, type: 'node', label: 'Endpoint', source });
      points.push({ x: br.x, y: br.y, type: 'node', label: 'Endpoint', source });
      points.push({ x: bl.x, y: bl.y, type: 'node', label: 'Endpoint', source });
      points.push({ x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2, type: 'midpoint', label: 'Midpoint', source });
      points.push({ x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2, type: 'midpoint', label: 'Midpoint', source });
      points.push({ x: (br.x + bl.x) / 2, y: (br.y + bl.y) / 2, type: 'midpoint', label: 'Midpoint', source });
      points.push({ x: (bl.x + tl.x) / 2, y: (bl.y + tl.y) / 2, type: 'midpoint', label: 'Midpoint', source });

      const children = (obj as fabric.Group).getObjects();
      for (const child of children) {
        points.push(...extractObjectFeaturePoints(child, source, matrix));
      }
      return points;
    }

    // 6. Standard Rect / IText / Image / Fallback: exact vector centerline (±width/2, ±height/2)
    const [tl, tr, br, bl] = getObjectCenterlineCorners(obj, parentMatrix);
    points.push({ x: tl.x, y: tl.y, type: 'node', label: 'Endpoint', source });
    points.push({ x: tr.x, y: tr.y, type: 'node', label: 'Endpoint', source });
    points.push({ x: br.x, y: br.y, type: 'node', label: 'Endpoint', source });
    points.push({ x: bl.x, y: bl.y, type: 'node', label: 'Endpoint', source });

    points.push({ x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2, type: 'midpoint', label: 'Midpoint', source });
    points.push({ x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2, type: 'midpoint', label: 'Midpoint', source });
    points.push({ x: (br.x + bl.x) / 2, y: (br.y + bl.y) / 2, type: 'midpoint', label: 'Midpoint', source });
    points.push({ x: (bl.x + tl.x) / 2, y: (bl.y + tl.y) / 2, type: 'midpoint', label: 'Midpoint', source });

    const center = transformPt(0, 0, matrix);
    points.push({ x: center.x, y: center.y, type: 'center', label: 'Center', source });
  } catch {
    // ignore
  }

  return points;
}

export function extractMovingObjectPoints(target: fabric.FabricObject): CalculatedSnapPoint[] {
  return extractObjectFeaturePoints(target, 'object');
}

/**
 * Collects all OSNAP target points (object points + cross-object intersections + page points + optional perpendiculars).
 */
export function collectCandidateOsnapPoints(
  allObjects: fabric.FabricObject[],
  excludeObj: fabric.FabricObject | null,
  pageConfig: PageConfig,
  snapConfig: SnapConfig,
  perpendicularOrigin?: { x: number; y: number } | null
): CalculatedSnapPoint[] {
  const candidates: CalculatedSnapPoint[] = [];
  const segments: LineSegment[] = [];

  if (snapConfig.snapToObjects) {
    let objIdx = 1;
    for (const obj of allObjects) {
      if (obj === excludeObj || !obj.visible || (obj as any).isGuideline) continue;
      if (
        excludeObj &&
        excludeObj.type === 'activeselection' &&
        typeof (excludeObj as fabric.ActiveSelection).getObjects === 'function' &&
        (excludeObj as fabric.ActiveSelection).getObjects().includes(obj)
      ) {
        continue;
      }

      candidates.push(...extractObjectFeaturePoints(obj, 'object'));
      segments.push(...getObjectSegments(obj, objIdx));
      objIdx++;
    }
  }

  if (snapConfig.snapToPage) {
    const pw = pageConfig.width;
    const ph = pageConfig.height;

    candidates.push({ x: 0, y: 0, type: 'node', label: 'Page Corner', source: 'page' });
    candidates.push({ x: pw, y: 0, type: 'node', label: 'Page Corner', source: 'page' });
    candidates.push({ x: pw, y: ph, type: 'node', label: 'Page Corner', source: 'page' });
    candidates.push({ x: 0, y: ph, type: 'node', label: 'Page Corner', source: 'page' });

    candidates.push({ x: pw / 2, y: 0, type: 'midpoint', label: 'Page Midpoint', source: 'page' });
    candidates.push({ x: pw, y: ph / 2, type: 'midpoint', label: 'Page Midpoint', source: 'page' });
    candidates.push({ x: pw / 2, y: ph, type: 'midpoint', label: 'Page Midpoint', source: 'page' });
    candidates.push({ x: 0, y: ph / 2, type: 'midpoint', label: 'Page Midpoint', source: 'page' });

    candidates.push({ x: pw / 2, y: ph / 2, type: 'center', label: 'Page Center', source: 'page' });

    if (snapConfig.snapToObjects) {
      segments.push({ p1: { x: 0, y: 0 }, p2: { x: pw, y: 0 }, objId: -1 });
      segments.push({ p1: { x: pw, y: 0 }, p2: { x: pw, y: ph }, objId: -1 });
      segments.push({ p1: { x: pw, y: ph }, p2: { x: 0, y: ph }, objId: -1 });
      segments.push({ p1: { x: 0, y: ph }, p2: { x: 0, y: 0 }, objId: -1 });
    }
  }

  // Compute cross-object intersections ONLY (segA.objId !== segB.objId)
  if (segments.length >= 2) {
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[i].objId === segments[j].objId) continue;
        const inter = getLineIntersection(
          segments[i].p1,
          segments[i].p2,
          segments[j].p1,
          segments[j].p2
        );
        if (inter) {
          candidates.push({
            x: inter.x,
            y: inter.y,
            type: 'intersection',
            label: 'Intersection',
            source: 'object',
          });
        }
      }
    }
  }

  // Perpendicular snap feet when drawing from a start point
  if (perpendicularOrigin && segments.length > 0) {
    for (const seg of segments) {
      const foot = getPerpendicularFoot(perpendicularOrigin, seg.p1, seg.p2);
      if (foot) {
        candidates.push({
          x: foot.x,
          y: foot.y,
          type: 'perpendicular',
          label: 'Perpendicular',
          source: seg.objId === -1 ? 'page' : 'object',
        });
      }
    }
  }

  return candidates;
}

/**
 * Selects the best OSNAP point within aperture using distance + AutoCAD OSNAP priority.
 */
function pickBestOsnapTarget(
  x: number,
  y: number,
  candidates: CalculatedSnapPoint[],
  threshold: number,
  zoomLevel: number
): { target: CalculatedSnapPoint; dx: number; dy: number; dist: number } | null {
  let best: { target: CalculatedSnapPoint; dx: number; dy: number; dist: number; prio: number } | null = null;
  const tieTolerance = Math.max(0.75, 2.5 / (zoomLevel || 1));

  for (const tp of candidates) {
    const dx = tp.x - x;
    const dy = tp.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > threshold) continue;

    const prio = OSNAP_PRIORITY[tp.type] ?? 9;
    if (!best) {
      best = { target: tp, dx, dy, dist, prio };
      continue;
    }

    // Prefer strictly closer unless within tie-tolerance where OSNAP priority wins
    if (Math.abs(dist - best.dist) <= tieTolerance) {
      if (prio < best.prio || (prio === best.prio && dist < best.dist)) {
        best = { target: tp, dx, dy, dist, prio };
      }
    } else if (dist < best.dist - tieTolerance) {
      best = { target: tp, dx, dy, dist, prio };
    }
  }

  return best ? { target: best.target, dx: best.dx, dy: best.dy, dist: best.dist } : null;
}

/**
 * Queries nearest OSNAP (or Grid) point for hover preview, drawing tools, and resize handle snapping.
 */
export function findNearestOsnapPoint(
  x: number,
  y: number,
  allObjects: fabric.FabricObject[],
  excludeObj: fabric.FabricObject | null,
  pageConfig: PageConfig,
  snapConfig: SnapConfig,
  zoomLevel: number = 1,
  perpendicularOrigin?: { x: number; y: number } | null
): CalculatedSnapPoint | null {
  if (!snapConfig.enabled) return null;

  const baseScreenThreshold = snapConfig.snapThreshold || 14;
  const threshold = Math.min(26, Math.max(2.5, baseScreenThreshold / (zoomLevel || 1)));

  const candidates = collectCandidateOsnapPoints(
    allObjects,
    excludeObj,
    pageConfig,
    snapConfig,
    perpendicularOrigin
  );

  const match = pickBestOsnapTarget(x, y, candidates, threshold, zoomLevel);
  if (match) return match.target;

  // Grid snap fallback
  const gridSize = snapConfig.gridSize || 20;
  if (snapConfig.snapToGrid && gridSize > 0) {
    const gx = Math.round(x / gridSize) * gridSize;
    const gy = Math.round(y / gridSize) * gridSize;
    if (Math.hypot(gx - x, gy - y) <= threshold) {
      return { x: gx, y: gy, type: 'node', label: 'Grid', source: 'grid' };
    }
  }

  return null;
}

export function isOrthoActive(
  snapConfig?: SnapConfig | null,
  shiftKey: boolean = false
): boolean {
  // AutoCAD behavior: Shift temporarily overrides Ortho state (turns ON when off, OFF when on)
  return snapConfig?.orthoMode ? !shiftKey : shiftKey;
}

/**
 * AutoCAD Ortho (strict 0/90/180/270) & Polar Tracking (45° increments within ±4°).
 */
export function applyPolarOrOrthoConstraint(
  origin: { x: number; y: number },
  cursor: { x: number; y: number },
  orthoActive: boolean,
  polarEnabled: boolean,
  zoomLevel: number = 1
): { point: { x: number; y: number }; polarGuide: PolarGuide | null } {
  const dx = cursor.x - origin.x;
  const dy = cursor.y - origin.y;
  const r = Math.hypot(dx, dy);

  if (r < 1e-3) {
    return { point: cursor, polarGuide: null };
  }

  // Strict Ortho (AutoCAD ORTHO / Shift): snap cleanly to horizontal or vertical axis
  if (orthoActive) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      const angleDeg = dx >= 0 ? 0 : 180;
      const pt = { x: cursor.x, y: origin.y };
      return {
        point: pt,
        polarGuide: { origin, point: pt, angleDeg, isOrtho: true },
      };
    } else {
      const angleDeg = dy >= 0 ? 90 : -90;
      const pt = { x: origin.x, y: cursor.y };
      return {
        point: pt,
        polarGuide: { origin, point: pt, angleDeg, isOrtho: true },
      };
    }
  }

  // Gentle Polar Tracking (0°, 45°, 90°, 135°, 180°, ...) when dragging > 12 screen px
  if (polarEnabled && r * (zoomLevel || 1) > 12) {
    const rawRad = Math.atan2(dy, dx);
    const stepRad = Math.PI / 4; // 45° increments
    const snappedIdx = Math.round(rawRad / stepRad);
    const snappedRad = snappedIdx * stepRad;
    const angleDiffDeg = Math.abs(((rawRad - snappedRad) * 180) / Math.PI);

    if (angleDiffDeg <= 4.2) {
      const cos = Math.cos(snappedRad);
      const sin = Math.sin(snappedRad);
      const proj = dx * cos + dy * sin;
      const pt = {
        x: Math.abs(cos) < 1e-6 ? origin.x : origin.x + proj * cos,
        y: Math.abs(sin) < 1e-6 ? origin.y : origin.y + proj * sin,
      };
      let deg = Math.round((snappedRad * 180) / Math.PI);
      if (deg === -180) deg = 180;
      return {
        point: pt,
        polarGuide: { origin, point: pt, angleDeg: deg, isOrtho: false },
      };
    }
  }

  return { point: cursor, polarGuide: null };
}

/**
 * Resolves cursor point with AutoCAD Ortho Mode + optional OSNAP projection.
 * When Ortho is active and an OSNAP target is hit, projects onto the active horizontal/vertical Ortho ray.
 */
export function projectPointWithOrthoAndOsnap(
  origin: { x: number; y: number },
  rawCursor: { x: number; y: number },
  osnapPoint: { x: number; y: number } | null,
  orthoActive: boolean,
  polarEnabled: boolean,
  zoomLevel: number = 1
): { point: { x: number; y: number }; polarGuide: PolarGuide | null } {
  if (orthoActive) {
    const targetForAxis = osnapPoint || rawCursor;
    const dx = targetForAxis.x - origin.x;
    const dy = targetForAxis.y - origin.y;
    if (Math.hypot(dx, dy) < 1e-3) {
      return { point: targetForAxis, polarGuide: null };
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      const angleDeg = dx >= 0 ? 0 : 180;
      const pt = { x: targetForAxis.x, y: origin.y };
      return {
        point: pt,
        polarGuide: { origin, point: pt, angleDeg, isOrtho: true },
      };
    } else {
      const angleDeg = dy >= 0 ? 90 : -90;
      const pt = { x: origin.x, y: targetForAxis.y };
      return {
        point: pt,
        polarGuide: { origin, point: pt, angleDeg, isOrtho: true },
      };
    }
  }

  if (osnapPoint) {
    return { point: osnapPoint, polarGuide: null };
  }

  return applyPolarOrOrthoConstraint(origin, rawCursor, false, polarEnabled, zoomLevel);
}

/**
 * AutoCAD-grade Smooth Object Snapping for Moving Objects:
 * 1. Zero random 1D axis sticking across unrelated objects.
 * 2. Priority 1: Grabbed point 2D OSNAP lock (Endpoint, Midpoint, Center, Quadrant, Intersection).
 * 3. Priority 2: Closest object feature point 2D OSNAP lock when dragging by body.
 * 4. Priority 3: Polar / Ortho tracking from dragOrigin (with aligned-axis projection snap).
 * 5. Priority 4: Grid snap fallback if enabled.
 */
export function calculateObjectSnapping(
  target: fabric.FabricObject,
  allObjects: fabric.FabricObject[],
  pageConfig: PageConfig,
  snapConfig: SnapConfig,
  zoomLevel: number = 1,
  grabbedPoint?: GrabbedPointInfo | null,
  dragOrigin?: { left: number; top: number } | null,
  shiftKey: boolean = false
): {
  snappedLeft: number;
  snappedTop: number;
  snapLines: SnapGuideline[];
  activeMarkers: SnapMarker[];
  polarGuide: PolarGuide | null;
} {
  if (typeof (target as any).setCoords === 'function') {
    (target as any).setCoords();
  }

  const currentLeft = target.left || 0;
  const currentTop = target.top || 0;

  const baseScreenThreshold = snapConfig.snapThreshold || 14;
  const threshold = Math.min(26, Math.max(2.5, baseScreenThreshold / (zoomLevel || 1)));
  const gridSize = snapConfig.gridSize || 20;

  const orthoActive = isOrthoActive(snapConfig, shiftKey);

  const candidateTargetPoints = snapConfig.enabled
    ? collectCandidateOsnapPoints(allObjects, target, pageConfig, snapConfig)
    : [];

  const snapLines: SnapGuideline[] = [];
  const activeMarkers: SnapMarker[] = [];
  let polarGuide: PolarGuide | null = null;

  let best2DLock: {
    target: CalculatedSnapPoint;
    dx: number;
    dy: number;
    dist: number;
  } | null = null;

  // Compute Polar / Ortho constraint displacement first if dragging from origin
  let workLeft = currentLeft;
  let workTop = currentTop;

  if (dragOrigin) {
    const moveRes = applyPolarOrOrthoConstraint(
      { x: dragOrigin.left, y: dragOrigin.top },
      { x: currentLeft, y: currentTop },
      orthoActive,
      !!snapConfig.enabled,
      zoomLevel
    );
    if (moveRes.polarGuide) {
      workLeft = moveRes.point.x;
      workTop = moveRes.point.y;
      const refOffsetX = grabbedPoint
        ? grabbedPoint.offsetFromOrigin.dx
        : ((target.getCenterPoint?.().x ?? currentLeft) - currentLeft);
      const refOffsetY = grabbedPoint
        ? grabbedPoint.offsetFromOrigin.dy
        : ((target.getCenterPoint?.().y ?? currentTop) - currentTop);
      polarGuide = {
        origin: { x: dragOrigin.left + refOffsetX, y: dragOrigin.top + refOffsetY },
        point: { x: workLeft + refOffsetX, y: workTop + refOffsetY },
        angleDeg: moveRes.polarGuide.angleDeg,
        isOrtho: moveRes.polarGuide.isOrtho,
      };
    }
  }

  const deltaFromCurrentX = workLeft - currentLeft;
  const deltaFromCurrentY = workTop - currentTop;

  // PRIORITY 1: Grabbed Point 2D OSNAP Lock (disabled for diagonal jumps when strict Ortho is active; Priority 3 handles 1D Ortho-axis OSNAP)
  if (!orthoActive && grabbedPoint && candidateTargetPoints.length > 0) {
    const curGrabbedX = workLeft + grabbedPoint.offsetFromOrigin.dx;
    const curGrabbedY = workTop + grabbedPoint.offsetFromOrigin.dy;

    const match = pickBestOsnapTarget(
      curGrabbedX,
      curGrabbedY,
      candidateTargetPoints,
      threshold,
      zoomLevel
    );

    if (match) {
      // If Ortho (Shift) is active, lock only if aligned with the Ortho axis or directly within tight aperture
      best2DLock = {
        target: match.target,
        dx: deltaFromCurrentX + match.dx,
        dy: deltaFromCurrentY + match.dy,
        dist: match.dist,
      };
    }
  }

  // PRIORITY 2: Body-Drag 2D OSNAP Lock (disabled for diagonal jumps when strict Ortho is active)
  if (!orthoActive && !best2DLock && candidateTargetPoints.length > 0) {
    const sourcePoints = extractMovingObjectPoints(target);
    let bestOverall: {
      target: CalculatedSnapPoint;
      dx: number;
      dy: number;
      dist: number;
      prio: number;
    } | null = null;
    const tieTol = Math.max(0.75, 2.5 / (zoomLevel || 1));

    for (const sp of sourcePoints) {
      const sx = sp.x + deltaFromCurrentX;
      const sy = sp.y + deltaFromCurrentY;
      const match = pickBestOsnapTarget(sx, sy, candidateTargetPoints, threshold, zoomLevel);
      if (!match) continue;

      const prio = OSNAP_PRIORITY[match.target.type] ?? 9;
      if (
        !bestOverall ||
        match.dist < bestOverall.dist - tieTol ||
        (Math.abs(match.dist - bestOverall.dist) <= tieTol && prio < bestOverall.prio)
      ) {
        bestOverall = {
          target: match.target,
          dx: deltaFromCurrentX + match.dx,
          dy: deltaFromCurrentY + match.dy,
          dist: match.dist,
          prio,
        };
      }
    }

    if (bestOverall) {
      best2DLock = {
        target: bestOverall.target,
        dx: bestOverall.dx,
        dy: bestOverall.dy,
        dist: bestOverall.dist,
      };
    }
  }

  // PRIORITY 3: If tracking along a horizontal/vertical Polar/Ortho ray, snap along that axis ONLY to aligned OSNAP points!
  if (!best2DLock && polarGuide && (Math.abs(polarGuide.angleDeg) === 0 || Math.abs(polarGuide.angleDeg) === 180 || Math.abs(polarGuide.angleDeg) === 90)) {
    const isHoriz = Math.abs(polarGuide.angleDeg) === 0 || Math.abs(polarGuide.angleDeg) === 180;
    const refX = grabbedPoint
      ? workLeft + grabbedPoint.offsetFromOrigin.dx
      : (target.getCenterPoint?.().x ?? workLeft) + deltaFromCurrentX;
    const refY = grabbedPoint
      ? workTop + grabbedPoint.offsetFromOrigin.dy
      : (target.getCenterPoint?.().y ?? workTop) + deltaFromCurrentY;

    let bestAxisDist = threshold + 1;
    let axisTarget: CalculatedSnapPoint | null = null;
    let axisCorr = 0;

    for (const tp of candidateTargetPoints) {
      const diff = isHoriz ? tp.x - refX : tp.y - refY;
      if (Math.abs(diff) <= threshold && Math.abs(diff) < bestAxisDist) {
        bestAxisDist = Math.abs(diff);
        axisCorr = diff;
        axisTarget = tp;
      }
    }

    if (axisTarget) {
      const finalLeft = isHoriz ? workLeft + axisCorr : workLeft;
      const finalTop = isHoriz ? workTop : workTop + axisCorr;

      snapLines.push({
        id: `track-${isHoriz ? 'v' : 'h'}-${axisTarget.x}-${axisTarget.y}`,
        type: isHoriz ? 'vertical' : 'horizontal',
        pos: isHoriz ? axisTarget.x : axisTarget.y,
        label: axisTarget.label,
        source: axisTarget.source,
      });

      activeMarkers.push({
        id: `track-m-${axisTarget.x}-${axisTarget.y}`,
        x: isHoriz ? axisTarget.x : refX,
        y: isHoriz ? refY : axisTarget.y,
        type: axisTarget.type,
        label: axisTarget.label,
      });

      // Keep polarGuide point synced with tracked coordinate
      polarGuide = {
        ...polarGuide,
        point: {
          x: isHoriz ? axisTarget.x : refX,
          y: isHoriz ? refY : axisTarget.y,
        },
      };

      return {
        snappedLeft: finalLeft,
        snappedTop: finalTop,
        snapLines,
        activeMarkers,
        polarGuide,
      };
    }
  }

  // Apply 2D OSNAP Lock
  if (best2DLock) {
    const tp = best2DLock.target;
    activeMarkers.push({
      id: `osnap-${tp.type}-${tp.x}-${tp.y}`,
      x: tp.x,
      y: tp.y,
      type: tp.type,
      label: tp.label,
    });

    // Subtle AutoCAD alignment crosshairs through locked point
    snapLines.push({
      id: `osnap-v-${tp.x}`,
      type: 'vertical',
      pos: tp.x,
      label: tp.label,
      source: tp.source,
    });
    snapLines.push({
      id: `osnap-h-${tp.y}`,
      type: 'horizontal',
      pos: tp.y,
      label: tp.label,
      source: tp.source,
    });

    return {
      snappedLeft: currentLeft + best2DLock.dx,
      snappedTop: currentTop + best2DLock.dy,
      snapLines,
      activeMarkers,
      polarGuide: polarGuide
        ? { ...polarGuide, point: { x: tp.x, y: tp.y } }
        : null,
    };
  }

  // PRIORITY 4: Grid Snap fallback (only if explicitly enabled by user; respects active Ortho axis)
  if (snapConfig.enabled && snapConfig.snapToGrid && gridSize > 0) {
    const gx = Math.round(workLeft / gridSize) * gridSize;
    const gy = Math.round(workTop / gridSize) * gridSize;
    const dxG = gx - workLeft;
    const dyG = gy - workTop;
    const isHorizOrtho = orthoActive && polarGuide && (Math.abs(polarGuide.angleDeg) === 0 || Math.abs(polarGuide.angleDeg) === 180);
    const isVertOrtho = orthoActive && polarGuide && Math.abs(polarGuide.angleDeg) === 90;
    const finalLeft = !isVertOrtho && Math.abs(dxG) <= threshold ? gx : workLeft;
    const finalTop = !isHorizOrtho && Math.abs(dyG) <= threshold ? gy : workTop;

    if (finalLeft !== workLeft || finalTop !== workTop) {
      activeMarkers.push({
        id: `grid-${finalLeft}-${finalTop}`,
        x: finalLeft,
        y: finalTop,
        type: 'node',
        label: 'Grid',
      });
    }

    return {
      snappedLeft: finalLeft,
      snappedTop: finalTop,
      snapLines,
      activeMarkers,
      polarGuide,
    };
  }

  return {
    snappedLeft: workLeft,
    snappedTop: workTop,
    snapLines,
    activeMarkers,
    polarGuide,
  };
}
