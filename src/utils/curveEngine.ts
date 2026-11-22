import * as fabric from 'fabric';
import { ensureObjectId, getObjectLabel } from './canvasHelpers';

export type CurveNodeType = 'cusp' | 'smooth' | 'symmetrical';

export interface CurveHandleInfo {
  x: number;
  y: number;
  cmdIndex: number;
  argX: number;
  argY: number;
  which: 'cp1' | 'cp2';
}

export interface CurveNodeInfo {
  id: string;
  cmdIndex: number;
  x: number;
  y: number;
  nodeType: CurveNodeType;
  isSubpathStart: boolean;
  isSubpathEnd: boolean;
  isClosedEnd: boolean;
  pairedCmdIndex?: number;
  inHandle?: CurveHandleInfo;
  outHandle?: CurveHandleInfo;
}

export interface CurveSegmentInfo {
  cmdIndex: number;
  prevCmdIndex: number;
  type: 'line' | 'curve';
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
  mid: { x: number; y: number };
  isClosingZ?: boolean;
}

export interface EditableCurveData {
  nodes: CurveNodeInfo[];
  segments: CurveSegmentInfo[];
  isClosed: boolean;
  outlinePolylines: { x: number; y: number }[][];
}

function transformPt(x: number, y: number, matrix: fabric.TMat2D): { x: number; y: number } {
  const pt = fabric.util.transformPoint(new fabric.Point(x, y), matrix);
  return { x: pt.x, y: pt.y };
}

export function pathCoordToScene(
  pathObj: fabric.Path,
  px: number,
  py: number
): { x: number; y: number } {
  const offset = pathObj.pathOffset || { x: 0, y: 0 };
  return transformPt(px - offset.x, py - offset.y, pathObj.calcTransformMatrix());
}

export function sceneToPathCoord(
  pathObj: fabric.Path,
  sx: number,
  sy: number
): { x: number; y: number } {
  const offset = pathObj.pathOffset || { x: 0, y: 0 };
  const inv = fabric.util.invertTransform(pathObj.calcTransformMatrix());
  const local = transformPt(sx, sy, inv);
  return { x: local.x + offset.x, y: local.y + offset.y };
}

function getCmdEndpoint(cmd: any[]): { x: number; y: number } | null {
  const op = String(cmd[0]).toUpperCase();
  if (op === 'M' || op === 'L') return { x: Number(cmd[1]), y: Number(cmd[2]) };
  if (op === 'Q') return { x: Number(cmd[3]), y: Number(cmd[4]) };
  if (op === 'C') return { x: Number(cmd[5]), y: Number(cmd[6]) };
  return null;
}

function setCmdEndpoint(cmd: any[], x: number, y: number) {
  const op = String(cmd[0]).toUpperCase();
  if (op === 'M' || op === 'L') {
    cmd[1] = x;
    cmd[2] = y;
  } else if (op === 'Q') {
    cmd[3] = x;
    cmd[4] = y;
  } else if (op === 'C') {
    cmd[5] = x;
    cmd[6] = y;
  }
}

function getNodeTypesMap(pathObj: fabric.Path): Record<number, CurveNodeType> {
  if (!(pathObj as any).nodeTypes) {
    (pathObj as any).nodeTypes = {};
  }
  return (pathObj as any).nodeTypes;
}

/**
 * Recomputes Fabric Path bounding box / pathOffset while keeping unmodified world coordinates pinned.
 */
export function finalizePathMutation(
  pathObj: fabric.Path,
  prevOffset?: { x: number; y: number }
) {
  const oldOff = prevOffset || {
    x: pathObj.pathOffset?.x || 0,
    y: pathObj.pathOffset?.y || 0,
  };
  const beforeWorld = new fabric.Point(0, 0).transform(pathObj.calcOwnMatrix());

  pathObj.set('dirty', true);
  pathObj.setDimensions();

  const newOff = pathObj.pathOffset || { x: 0, y: 0 };
  const afterWorld = new fabric.Point(oldOff.x - newOff.x, oldOff.y - newOff.y).transform(
    pathObj.calcOwnMatrix()
  );

  pathObj.set({
    left: (pathObj.left || 0) - (afterWorld.x - beforeWorld.x),
    top: (pathObj.top || 0) - (afterWorld.y - beforeWorld.y),
  });
  pathObj.setCoords();
}

/**
 * Converts Q commands in a fabric.Path to cubic C commands so every curve has 2 handles.
 */
export function normalizePathToCubic(pathObj: fabric.Path) {
  const cmds = pathObj.path as any[][];
  if (!Array.isArray(cmds)) return;

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let changed = false;

  const out: any[][] = [];
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    const op = String(cmd[0]).toUpperCase();
    if (op === 'M') {
      curX = Number(cmd[1]);
      curY = Number(cmd[2]);
      startX = curX;
      startY = curY;
      out.push(['M', curX, curY]);
    } else if (op === 'L') {
      curX = Number(cmd[1]);
      curY = Number(cmd[2]);
      out.push(['L', curX, curY]);
    } else if (op === 'H') {
      curX = Number(cmd[1]);
      out.push(['L', curX, curY]);
      changed = true;
    } else if (op === 'V') {
      curY = Number(cmd[1]);
      out.push(['L', curX, curY]);
      changed = true;
    } else if (op === 'Q') {
      const qx = Number(cmd[1]);
      const qy = Number(cmd[2]);
      const x = Number(cmd[3]);
      const y = Number(cmd[4]);
      const cp1x = curX + (2 / 3) * (qx - curX);
      const cp1y = curY + (2 / 3) * (qy - curY);
      const cp2x = x + (2 / 3) * (qx - x);
      const cp2y = y + (2 / 3) * (qy - y);
      out.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
      curX = x;
      curY = y;
      changed = true;
    } else if (op === 'C') {
      curX = Number(cmd[5]);
      curY = Number(cmd[6]);
      out.push(['C', Number(cmd[1]), Number(cmd[2]), Number(cmd[3]), Number(cmd[4]), curX, curY]);
    } else if (op === 'Z') {
      curX = startX;
      curY = startY;
      out.push(['Z']);
    } else {
      out.push([...cmd]);
    }
  }

  if (changed) {
    const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };
    pathObj.path = out as any;
    finalizePathMutation(pathObj, prevOff);
  }
}

/**
 * Converts Rect, Circle, Ellipse, Polygon, Polyline, or Line into an editable NuraDraw Curve (fabric.Path).
 */
export function convertObjectToCurves(obj: fabric.FabricObject): fabric.Path | null {
  if (!obj) return null;

  if (obj.type === 'path') {
    const p = obj as fabric.Path;
    normalizePathToCubic(p);
    (p as any).isCurve = true;
    p.set({ strokeUniform: true });
    return p;
  }

  const w = obj.width || 100;
  const h = obj.height || 100;
  let pathData = '';
  const initialNodeTypes: Record<number, CurveNodeType> = {};

  if (obj.type === 'rect') {
    const rx = Math.min(w / 2, (obj as fabric.Rect).rx || 0);
    const ry = Math.min(h / 2, (obj as fabric.Rect).ry || 0);
    if (rx > 0 || ry > 0) {
      const k = 0.552284749831;
      const kx = rx * k;
      const ky = ry * k;
      pathData = [
        `M ${rx} 0`,
        `L ${w - rx} 0`,
        `C ${w - rx + kx} 0 ${w} ${ry - ky} ${w} ${ry}`,
        `L ${w} ${h - ry}`,
        `C ${w} ${h - ry + ky} ${w - rx + kx} ${h} ${w - rx} ${h}`,
        `L ${rx} ${h}`,
        `C ${rx - kx} ${h} 0 ${h - ry + ky} 0 ${h - ry}`,
        `L 0 ${ry}`,
        `C 0 ${ry - ky} ${rx - kx} 0 ${rx} 0`,
        'Z',
      ].join(' ');
      for (let i = 0; i <= 8; i++) initialNodeTypes[i] = 'smooth';
    } else {
      pathData = `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    }
  } else if (obj.type === 'circle' || obj.type === 'ellipse') {
    const rx = obj.type === 'circle' ? (obj as fabric.Circle).radius || w / 2 : (obj as fabric.Ellipse).rx || w / 2;
    const ry = obj.type === 'circle' ? (obj as fabric.Circle).radius || h / 2 : (obj as fabric.Ellipse).ry || h / 2;
    const cx = rx;
    const cy = ry;
    const k = 0.552284749831;
    const ox = rx * k;
    const oy = ry * k;
    pathData = [
      `M ${cx} 0`,
      `C ${cx + ox} 0 ${2 * rx} ${cy - oy} ${2 * rx} ${cy}`,
      `C ${2 * rx} ${cy + oy} ${cx + ox} ${2 * ry} ${cx} ${2 * ry}`,
      `C ${cx - ox} ${2 * ry} 0 ${cy + oy} 0 ${cy}`,
      `C 0 ${cy - oy} ${cx - ox} 0 ${cx} 0`,
      'Z',
    ].join(' ');
    initialNodeTypes[0] = 'symmetrical';
    initialNodeTypes[1] = 'symmetrical';
    initialNodeTypes[2] = 'symmetrical';
    initialNodeTypes[3] = 'symmetrical';
    initialNodeTypes[4] = 'symmetrical';
  } else if ((obj.type === 'polygon' || obj.type === 'polyline') && Array.isArray((obj as any).points)) {
    const pts = (obj as any).points as { x: number; y: number }[];
    if (pts.length < 2) return null;
    pathData =
      `M ${pts[0].x} ${pts[0].y} ` +
      pts
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(' ') +
      (obj.type === 'polygon' ? ' Z' : '');
  } else if (obj.type === 'line') {
    const lp = (obj as fabric.Line).calcLinePoints();
    pathData = `M ${lp.x1} ${lp.y1} L ${lp.x2} ${lp.y2}`;
  } else {
    // Fallback for IText / other bounding-box objects: convert bounding outline
    pathData = `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }

  const center = obj.getCenterPoint();
  const pathObj = new fabric.Path(pathData, {
    angle: obj.angle,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    skewX: obj.skewX,
    skewY: obj.skewY,
    flipX: obj.flipX,
    flipY: obj.flipY,
    fill: obj.type === 'line' ? 'transparent' : obj.fill,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    strokeDashArray: obj.strokeDashArray ? [...obj.strokeDashArray] : undefined,
    strokeUniform: true,
    opacity: obj.opacity,
    shadow: obj.shadow,
    originX: obj.originX,
    originY: obj.originY,
  });

  pathObj.setPositionByOrigin(center, 'center', 'center');
  pathObj.setCoords();
  (pathObj as any).isCurve = true;
  (pathObj as any).nodeTypes = initialNodeTypes;
  ensureObjectId(pathObj, `${getObjectLabel(obj)} (Curves)`);
  return pathObj;
}

/**
 * Finds subpaths in `path.path` and extracts all nodes, handles, segments, and sampled polylines in scene coords.
 */
export function extractEditableCurveData(pathObj: fabric.Path): EditableCurveData {
  normalizePathToCubic(pathObj);
  const cmds = (pathObj.path || []) as any[][];
  const nodeTypes = getNodeTypesMap(pathObj);

  const nodes: CurveNodeInfo[] = [];
  const segments: CurveSegmentInfo[] = [];
  const outlinePolylines: { x: number; y: number }[][] = [];
  let isClosed = false;

  // Identify subpath ranges
  interface SubpathRange {
    startIdx: number;
    endIdx: number; // inclusive last command index
    hasZ: boolean;
  }
  const subpaths: SubpathRange[] = [];
  let curStart = -1;
  for (let i = 0; i < cmds.length; i++) {
    const op = String(cmds[i][0]).toUpperCase();
    if (op === 'M') {
      if (curStart >= 0) {
        subpaths.push({ startIdx: curStart, endIdx: i - 1, hasZ: false });
      }
      curStart = i;
    } else if (op === 'Z' && curStart >= 0) {
      subpaths.push({ startIdx: curStart, endIdx: i, hasZ: true });
      curStart = -1;
      isClosed = true;
    }
  }
  if (curStart >= 0) {
    subpaths.push({ startIdx: curStart, endIdx: cmds.length - 1, hasZ: false });
  }

  for (const sp of subpaths) {
    const startPtRaw = getCmdEndpoint(cmds[sp.startIdx]);
    if (!startPtRaw) continue;

    // Collect drawable node command indices in this subpath
    const nodeCmdIndices: number[] = [];
    for (let i = sp.startIdx; i <= sp.endIdx; i++) {
      const op = String(cmds[i][0]).toUpperCase();
      if (op === 'M' || op === 'L' || op === 'C') {
        nodeCmdIndices.push(i);
      }
    }
    if (nodeCmdIndices.length === 0) continue;

    const lastNodeCmdIdx = nodeCmdIndices[nodeCmdIndices.length - 1];
    const lastPtRaw = getCmdEndpoint(cmds[lastNodeCmdIdx])!;
    const endsMatch =
      nodeCmdIndices.length > 1 &&
      Math.hypot(lastPtRaw.x - startPtRaw.x, lastPtRaw.y - startPtRaw.y) < 0.5;
    const subpathClosed = sp.hasZ || endsMatch;
    if (subpathClosed) isClosed = true;

    const polyline: { x: number; y: number }[] = [];

    // Build segments and sampled outline
    for (let k = 0; k < nodeCmdIndices.length; k++) {
      const idx = nodeCmdIndices[k];
      const cmd = cmds[idx];
      const op = String(cmd[0]).toUpperCase();
      const ptRaw = getCmdEndpoint(cmd)!;
      const ptScene = pathCoordToScene(pathObj, ptRaw.x, ptRaw.y);

      if (op === 'M') {
        polyline.push(ptScene);
        continue;
      }

      const prevIdx = nodeCmdIndices[k - 1];
      const prevRaw = getCmdEndpoint(cmds[prevIdx])!;
      const p0 = pathCoordToScene(pathObj, prevRaw.x, prevRaw.y);

      if (op === 'L') {
        const mid = { x: (p0.x + ptScene.x) / 2, y: (p0.y + ptScene.y) / 2 };
        segments.push({ cmdIndex: idx, prevCmdIndex: prevIdx, type: 'line', p0, p1: ptScene, mid });
        polyline.push(ptScene);
      } else if (op === 'C') {
        const cp1 = pathCoordToScene(pathObj, Number(cmd[1]), Number(cmd[2]));
        const cp2 = pathCoordToScene(pathObj, Number(cmd[3]), Number(cmd[4]));
        const mid = evalCubicBezier(p0, cp1, cp2, ptScene, 0.5);
        segments.push({
          cmdIndex: idx,
          prevCmdIndex: prevIdx,
          type: 'curve',
          p0,
          p1: ptScene,
          cp1,
          cp2,
          mid,
        });
        for (let s = 1; s <= 12; s++) {
          polyline.push(evalCubicBezier(p0, cp1, cp2, ptScene, s / 12));
        }
      }
    }

    // Explicit closing segment when Z is used and endpoints don't already coincide
    if (sp.hasZ && !endsMatch && nodeCmdIndices.length >= 2) {
      const p0 = pathCoordToScene(pathObj, lastPtRaw.x, lastPtRaw.y);
      const p1 = pathCoordToScene(pathObj, startPtRaw.x, startPtRaw.y);
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      segments.push({
        cmdIndex: sp.endIdx, // points to Z
        prevCmdIndex: lastNodeCmdIdx,
        type: 'line',
        p0,
        p1,
        mid,
        isClosingZ: true,
      });
      polyline.push(p1);
    }

    outlinePolylines.push(polyline);

    // Build CurveNodeInfo entries
    for (let k = 0; k < nodeCmdIndices.length; k++) {
      const idx = nodeCmdIndices[k];
      // If closed and last command coincides with M, skip creating duplicate overlapping node
      // and instead link its inHandle onto the M node via pairedCmdIndex!
      if (subpathClosed && endsMatch && k === nodeCmdIndices.length - 1) {
        continue;
      }

      const ptRaw = getCmdEndpoint(cmds[idx])!;
      const ptScene = pathCoordToScene(pathObj, ptRaw.x, ptRaw.y);

      const isStart = k === 0;
      const isEnd = k === nodeCmdIndices.length - 1;

      let inHandle: CurveHandleInfo | undefined;
      let outHandle: CurveHandleInfo | undefined;
      let pairedCmdIndex: number | undefined;

      // Incoming handle comes from current command if C, or from closing lastNodeCmdIdx if M & endsMatch
      if (isStart && subpathClosed && endsMatch) {
        pairedCmdIndex = lastNodeCmdIdx;
        const closeCmd = cmds[lastNodeCmdIdx];
        if (String(closeCmd[0]).toUpperCase() === 'C') {
          const h = pathCoordToScene(pathObj, Number(closeCmd[3]), Number(closeCmd[4]));
          inHandle = { x: h.x, y: h.y, cmdIndex: lastNodeCmdIdx, argX: 3, argY: 4, which: 'cp2' };
        }
      } else if (!isStart) {
        const curCmd = cmds[idx];
        if (String(curCmd[0]).toUpperCase() === 'C') {
          const h = pathCoordToScene(pathObj, Number(curCmd[3]), Number(curCmd[4]));
          inHandle = { x: h.x, y: h.y, cmdIndex: idx, argX: 3, argY: 4, which: 'cp2' };
        }
      }

      // Outgoing handle comes from next command if it is C
      if (k + 1 < nodeCmdIndices.length) {
        const nextIdx = nodeCmdIndices[k + 1];
        const nextCmd = cmds[nextIdx];
        if (String(nextCmd[0]).toUpperCase() === 'C') {
          const h = pathCoordToScene(pathObj, Number(nextCmd[1]), Number(nextCmd[2]));
          outHandle = { x: h.x, y: h.y, cmdIndex: nextIdx, argX: 1, argY: 2, which: 'cp1' };
        }
      }

      nodes.push({
        id: `node-${idx}`,
        cmdIndex: idx,
        x: ptScene.x,
        y: ptScene.y,
        nodeType: nodeTypes[idx] || 'cusp',
        isSubpathStart: isStart,
        isSubpathEnd: isEnd && !subpathClosed,
        isClosedEnd: isStart && subpathClosed,
        pairedCmdIndex,
        inHandle,
        outHandle,
      });
    }
  }

  return { nodes, segments, isClosed, outlinePolylines };
}

export function evalCubicBezier(
  p0: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p1.y,
  };
}

/**
 * Finds the closest segment on the path to a canvas scene point (sub-pixel accurate for exact node insertion).
 */
export function findClosestSegmentHit(
  data: EditableCurveData,
  sx: number,
  sy: number,
  threshold: number
): { seg: CurveSegmentInfo; t: number; point: { x: number; y: number }; dist: number } | null {
  let best: { seg: CurveSegmentInfo; t: number; point: { x: number; y: number }; dist: number } | null = null;

  for (const seg of data.segments) {
    if (seg.type === 'line') {
      const dx = seg.p1.x - seg.p0.x;
      const dy = seg.p1.y - seg.p0.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-6) continue;
      const rawT = ((sx - seg.p0.x) * dx + (sy - seg.p0.y) * dy) / lenSq;
      const t = Math.min(0.98, Math.max(0.02, rawT));
      const pt = { x: seg.p0.x + t * dx, y: seg.p0.y + t * dy };
      const dist = Math.hypot(pt.x - sx, pt.y - sy);
      if (dist <= threshold && (!best || dist < best.dist)) {
        best = { seg, t, point: pt, dist };
      }
    } else if (seg.cp1 && seg.cp2) {
      const steps = 40;
      let bestT = 0.5;
      let bestDist = Infinity;
      let bestPt = seg.mid;

      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const pt = evalCubicBezier(seg.p0, seg.cp1, seg.cp2, seg.p1, t);
        const dist = Math.hypot(pt.x - sx, pt.y - sy);
        if (dist < bestDist) {
          bestDist = dist;
          bestT = t;
          bestPt = pt;
        }
      }

      // Two-pass local refinement around bestT
      let halfSpan = 1 / steps;
      for (let pass = 0; pass < 3; pass++) {
        const subSteps = 8;
        const tStart = Math.max(0.02, bestT - halfSpan);
        const tEnd = Math.min(0.98, bestT + halfSpan);
        for (let s = 0; s <= subSteps; s++) {
          const t = tStart + (s / subSteps) * (tEnd - tStart);
          const pt = evalCubicBezier(seg.p0, seg.cp1, seg.cp2, seg.p1, t);
          const dist = Math.hypot(pt.x - sx, pt.y - sy);
          if (dist < bestDist) {
            bestDist = dist;
            bestT = t;
            bestPt = pt;
          }
        }
        halfSpan /= 4;
      }

      if (bestDist <= threshold && (!best || bestDist < best.dist)) {
        best = { seg, t: bestT, point: bestPt, dist: bestDist };
      }
    }
  }

  return best;
}

/**
 * Moves selected nodes (and their attached Bezier handles) cleanly to target deltas or exact position.
 */
export function moveCurveNodes(
  pathObj: fabric.Path,
  nodeCmdIndices: number[],
  dxScene: number,
  dyScene: number
) {
  if (nodeCmdIndices.length === 0) return;
  const data = extractEditableCurveData(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  const nodeMap = new Map<number, CurveNodeInfo>();
  for (const n of data.nodes) nodeMap.set(n.cmdIndex, n);

  const visitedCmds = new Set<number>();

  for (const idx of nodeCmdIndices) {
    const node = nodeMap.get(idx);
    if (!node || visitedCmds.has(idx)) continue;
    visitedCmds.add(idx);

    const targetPath = sceneToPathCoord(pathObj, node.x + dxScene, node.y + dyScene);
    setCmdEndpoint(cmds[idx], targetPath.x, targetPath.y);

    if (node.pairedCmdIndex !== undefined && cmds[node.pairedCmdIndex]) {
      setCmdEndpoint(cmds[node.pairedCmdIndex], targetPath.x, targetPath.y);
    }

    if (node.inHandle) {
      const hPath = sceneToPathCoord(pathObj, node.inHandle.x + dxScene, node.inHandle.y + dyScene);
      cmds[node.inHandle.cmdIndex][node.inHandle.argX] = hPath.x;
      cmds[node.inHandle.cmdIndex][node.inHandle.argY] = hPath.y;
    }

    if (node.outHandle) {
      const hPath = sceneToPathCoord(pathObj, node.outHandle.x + dxScene, node.outHandle.y + dyScene);
      cmds[node.outHandle.cmdIndex][node.outHandle.argX] = hPath.x;
      cmds[node.outHandle.cmdIndex][node.outHandle.argY] = hPath.y;
    }
  }

  finalizePathMutation(pathObj, prevOff);
}

/**
 * Moves a Bezier control handle and updates the opposite handle according to nodeType (cusp / smooth / symmetrical).
 */
export function moveCurveHandle(
  pathObj: fabric.Path,
  nodeCmdIndex: number,
  which: 'cp1' | 'cp2',
  newSceneX: number,
  newSceneY: number
) {
  const data = extractEditableCurveData(pathObj);
  const node = data.nodes.find((n) => n.cmdIndex === nodeCmdIndex);
  if (!node) return;

  const handle = which === 'cp1' ? node.outHandle : node.inHandle;
  const oppHandle = which === 'cp1' ? node.inHandle : node.outHandle;
  if (!handle) return;

  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  const hPath = sceneToPathCoord(pathObj, newSceneX, newSceneY);
  cmds[handle.cmdIndex][handle.argX] = hPath.x;
  cmds[handle.cmdIndex][handle.argY] = hPath.y;

  // Enforce smooth or symmetrical tangent alignment on opposite handle
  if (oppHandle && (node.nodeType === 'smooth' || node.nodeType === 'symmetrical')) {
    const vx = newSceneX - node.x;
    const vy = newSceneY - node.y;
    const newLen = Math.hypot(vx, vy);
    if (newLen > 1e-3) {
      const oppLen =
        node.nodeType === 'symmetrical'
          ? newLen
          : Math.max(4, Math.hypot(oppHandle.x - node.x, oppHandle.y - node.y));
      const oppSceneX = node.x - (vx / newLen) * oppLen;
      const oppSceneY = node.y - (vy / newLen) * oppLen;
      const oppPath = sceneToPathCoord(pathObj, oppSceneX, oppSceneY);
      cmds[oppHandle.cmdIndex][oppHandle.argX] = oppPath.x;
      cmds[oppHandle.cmdIndex][oppHandle.argY] = oppPath.y;
    }
  }

  finalizePathMutation(pathObj, prevOff);
}

/**
 * Direct NuraDraw segment bending: drags a line or curve segment directly to reshape it.
 * Automatically converts straight L (or Z closing) segments to cubic C curves.
 */
export function dragCurveSegment(
  pathObj: fabric.Path,
  cmdIndex: number,
  dragTargetSceneX: number,
  dragTargetSceneY: number,
  t: number = 0.5
): number {
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  let targetIdx = cmdIndex;
  const op = String(cmds[targetIdx]?.[0] || '').toUpperCase();

  // Materialize implicit closing Z into explicit L before curving
  if (op === 'Z') {
    let mIdx = targetIdx - 1;
    while (mIdx >= 0 && String(cmds[mIdx][0]).toUpperCase() !== 'M') mIdx--;
    if (mIdx >= 0) {
      const startPt = getCmdEndpoint(cmds[mIdx])!;
      cmds.splice(targetIdx, 0, ['L', startPt.x, startPt.y]);
    }
  }

  // Convert L -> C at targetIdx
  if (String(cmds[targetIdx][0]).toUpperCase() === 'L') {
    const p0 = getCmdEndpoint(cmds[targetIdx - 1])!;
    const p1 = getCmdEndpoint(cmds[targetIdx])!;
    cmds[targetIdx] = [
      'C',
      p0.x + (p1.x - p0.x) / 3,
      p0.y + (p1.y - p0.y) / 3,
      p0.x + ((p1.x - p0.x) * 2) / 3,
      p0.y + ((p1.y - p0.y) * 2) / 3,
      p1.x,
      p1.y,
    ];
  }

  if (String(cmds[targetIdx][0]).toUpperCase() !== 'C') return targetIdx;

  const p0Raw = getCmdEndpoint(cmds[targetIdx - 1])!;
  const p1Raw = getCmdEndpoint(cmds[targetIdx])!;
  const p0 = pathCoordToScene(pathObj, p0Raw.x, p0Raw.y);
  const p1 = pathCoordToScene(pathObj, p1Raw.x, p1Raw.y);
  const cp1 = pathCoordToScene(pathObj, Number(cmds[targetIdx][1]), Number(cmds[targetIdx][2]));
  const cp2 = pathCoordToScene(pathObj, Number(cmds[targetIdx][3]), Number(cmds[targetIdx][4]));

  const clampedT = Math.min(0.85, Math.max(0.15, t));
  const curPt = evalCubicBezier(p0, cp1, cp2, p1, clampedT);
  const dx = dragTargetSceneX - curPt.x;
  const dy = dragTargetSceneY - curPt.y;

  const mt = 1 - clampedT;
  const w1 = 3 * mt * mt * clampedT;
  const w2 = 3 * mt * clampedT * clampedT;
  const denom = w1 * w1 + w2 * w2 || 0.75;

  const newCp1Scene = { x: cp1.x + dx * (w1 / denom), y: cp1.y + dy * (w1 / denom) };
  const newCp2Scene = { x: cp2.x + dx * (w2 / denom), y: cp2.y + dy * (w2 / denom) };

  const c1Path = sceneToPathCoord(pathObj, newCp1Scene.x, newCp1Scene.y);
  const c2Path = sceneToPathCoord(pathObj, newCp2Scene.x, newCp2Scene.y);
  cmds[targetIdx][1] = c1Path.x;
  cmds[targetIdx][2] = c1Path.y;
  cmds[targetIdx][3] = c2Path.x;
  cmds[targetIdx][4] = c2Path.y;

  finalizePathMutation(pathObj, prevOff);
  return targetIdx;
}

/**
 * Splits a segment at parameter t using exact de Casteljau subdivision (for C) or linear split (for L).
 */
export function addNodeOnPath(pathObj: fabric.Path, segCmdIndex: number, t: number = 0.5): number | null {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const nodeTypes = getNodeTypesMap(pathObj);
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  if (segCmdIndex <= 0 || segCmdIndex >= cmds.length) return null;

  let op = String(cmds[segCmdIndex][0]).toUpperCase();
  if (op === 'Z') {
    let mIdx = segCmdIndex - 1;
    while (mIdx >= 0 && String(cmds[mIdx][0]).toUpperCase() !== 'M') mIdx--;
    if (mIdx < 0) return null;
    const startPt = getCmdEndpoint(cmds[mIdx])!;
    cmds.splice(segCmdIndex, 0, ['L', startPt.x, startPt.y]);
    op = 'L';
  }

  const p0 = getCmdEndpoint(cmds[segCmdIndex - 1]);
  const p1 = getCmdEndpoint(cmds[segCmdIndex]);
  if (!p0 || !p1) return null;

  const clampedT = Math.min(0.95, Math.max(0.05, t));

  if (op === 'L') {
    const mx = p0.x + clampedT * (p1.x - p0.x);
    const my = p0.y + clampedT * (p1.y - p0.y);
    cmds.splice(segCmdIndex, 1, ['L', mx, my], ['L', p1.x, p1.y]);
    // Shift nodeType indices >= segCmdIndex + 1
    const updatedTypes: Record<number, CurveNodeType> = {};
    for (const [k, v] of Object.entries(nodeTypes)) {
      const ki = Number(k);
      updatedTypes[ki > segCmdIndex ? ki + 1 : ki] = v;
    }
    updatedTypes[segCmdIndex] = 'cusp';
    (pathObj as any).nodeTypes = updatedTypes;
    finalizePathMutation(pathObj, prevOff);
    return segCmdIndex;
  }

  if (op === 'C') {
    const c1 = { x: Number(cmds[segCmdIndex][1]), y: Number(cmds[segCmdIndex][2]) };
    const c2 = { x: Number(cmds[segCmdIndex][3]), y: Number(cmds[segCmdIndex][4]) };
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: a.x + clampedT * (b.x - a.x),
      y: a.y + clampedT * (b.y - a.y),
    });

    const p01 = lerp(p0, c1);
    const p12 = lerp(c1, c2);
    const p23 = lerp(c2, p1);
    const p012 = lerp(p01, p12);
    const p123 = lerp(p12, p23);
    const mid = lerp(p012, p123);

    cmds.splice(
      segCmdIndex,
      1,
      ['C', p01.x, p01.y, p012.x, p012.y, mid.x, mid.y],
      ['C', p123.x, p123.y, p23.x, p23.y, p1.x, p1.y]
    );

    const updatedTypes: Record<number, CurveNodeType> = {};
    for (const [k, v] of Object.entries(nodeTypes)) {
      const ki = Number(k);
      updatedTypes[ki > segCmdIndex ? ki + 1 : ki] = v;
    }
    updatedTypes[segCmdIndex] = 'smooth';
    (pathObj as any).nodeTypes = updatedTypes;
    finalizePathMutation(pathObj, prevOff);
    return segCmdIndex;
  }

  return null;
}

/**
 * Deletes selected nodes cleanly from a path while keeping at least 2 points in open paths or 3 in closed paths.
 */
export function deleteNodesFromPath(pathObj: fabric.Path, cmdIndices: number[]): boolean {
  if (cmdIndices.length === 0) return false;
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  const drawableCount = cmds.filter((c) => ['M', 'L', 'C'].includes(String(c[0]).toUpperCase())).length;
  const deleteSet = new Set(cmdIndices);
  if (drawableCount - deleteSet.size < 2) return false;

  const data = extractEditableCurveData(pathObj);
  const pairedDeletes = new Set<number>(deleteSet);
  for (const n of data.nodes) {
    if (deleteSet.has(n.cmdIndex) && n.pairedCmdIndex !== undefined) {
      pairedDeletes.add(n.pairedCmdIndex);
    }
  }

  const nextCmds: any[][] = [];
  let needNewM = false;

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    const op = String(cmd[0]).toUpperCase();

    if (pairedDeletes.has(i)) {
      if (op === 'M') needNewM = true;
      continue;
    }

    if (needNewM && (op === 'L' || op === 'C')) {
      const ep = getCmdEndpoint(cmd)!;
      nextCmds.push(['M', ep.x, ep.y]);
      needNewM = false;
    } else if (needNewM && op === 'Z') {
      needNewM = false;
    } else {
      nextCmds.push([...cmd]);
    }
  }

  // If path was closed via paired M/last, ensure last command connects back to new M if Z wasn't present
  if (nextCmds.length < 2) return false;
  pathObj.path = nextCmds as any;
  (pathObj as any).nodeTypes = {};
  finalizePathMutation(pathObj, prevOff);
  return true;
}

/**
 * Converts selected segment(s) to straight lines ('line') or cubic Bezier curves ('curve').
 */
export function setSegmentsType(
  pathObj: fabric.Path,
  segCmdIndices: number[],
  targetType: 'line' | 'curve'
) {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  for (const idx of segCmdIndices) {
    if (idx <= 0 || idx >= cmds.length) continue;
    const cmd = cmds[idx];
    const op = String(cmd[0]).toUpperCase();

    if (targetType === 'line' && op === 'C') {
      cmds[idx] = ['L', Number(cmd[5]), Number(cmd[6])];
    } else if (targetType === 'curve' && (op === 'L' || op === 'Z')) {
      if (op === 'Z') {
        let mIdx = idx - 1;
        while (mIdx >= 0 && String(cmds[mIdx][0]).toUpperCase() !== 'M') mIdx--;
        if (mIdx >= 0) {
          const p0 = getCmdEndpoint(cmds[idx - 1])!;
          const p1 = getCmdEndpoint(cmds[mIdx])!;
          cmds.splice(
            idx,
            0,
            [
              'C',
              p0.x + (p1.x - p0.x) / 3,
              p0.y + (p1.y - p0.y) / 3,
              p0.x + ((p1.x - p0.x) * 2) / 3,
              p0.y + ((p1.y - p0.y) * 2) / 3,
              p1.x,
              p1.y,
            ]
          );
        }
      } else {
        const p0 = getCmdEndpoint(cmds[idx - 1])!;
        const p1 = getCmdEndpoint(cmd)!;
        cmds[idx] = [
          'C',
          p0.x + (p1.x - p0.x) / 3,
          p0.y + (p1.y - p0.y) / 3,
          p0.x + ((p1.x - p0.x) * 2) / 3,
          p0.y + ((p1.y - p0.y) * 2) / 3,
          p1.x,
          p1.y,
        ];
      }
    }
  }

  finalizePathMutation(pathObj, prevOff);
}

/**
 * Sets node type ('cusp' | 'smooth' | 'symmetrical') on selected nodes and aligns their tangent handles.
 * Automatically converts adjacent straight L segments to cubic C curves when setting Smooth / Symmetrical.
 */
export function setNodesType(
  pathObj: fabric.Path,
  nodeCmdIndices: number[],
  nodeType: CurveNodeType
) {
  let data = extractEditableCurveData(pathObj);

  if (nodeType === 'smooth' || nodeType === 'symmetrical') {
    const selSet = new Set(nodeCmdIndices);
    const straightSegsToUpgrade = data.segments
      .filter((s) => s.type === 'line' && (selSet.has(s.cmdIndex) || selSet.has(s.prevCmdIndex)))
      .map((s) => s.cmdIndex);
    if (straightSegsToUpgrade.length > 0) {
      setSegmentsType(pathObj, straightSegsToUpgrade, 'curve');
      data = extractEditableCurveData(pathObj);
    }
  }

  const nodeTypes = getNodeTypesMap(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  for (const idx of nodeCmdIndices) {
    nodeTypes[idx] = nodeType;
    const node = data.nodes.find((n) => n.cmdIndex === idx);
    if (!node || !node.inHandle || !node.outHandle) continue;

    if (nodeType === 'smooth' || nodeType === 'symmetrical') {
      const vxIn = node.inHandle.x - node.x;
      const vyIn = node.inHandle.y - node.y;
      const vxOut = node.outHandle.x - node.x;
      const vyOut = node.outHandle.y - node.y;

      const lenIn = Math.hypot(vxIn, vyIn) || 1;
      const lenOut = Math.hypot(vxOut, vyOut) || 1;
      // Tangent direction = vector from inHandle toward outHandle
      let tx = vxOut / lenOut - vxIn / lenIn;
      let ty = vyOut / lenOut - vyIn / lenIn;
      const tLen = Math.hypot(tx, ty);
      if (tLen > 1e-4) {
        tx /= tLen;
        ty /= tLen;
      } else {
        tx = 1;
        ty = 0;
      }

      const targetLenIn = nodeType === 'symmetrical' ? (lenIn + lenOut) / 2 : lenIn;
      const targetLenOut = nodeType === 'symmetrical' ? (lenIn + lenOut) / 2 : lenOut;

      const inP = sceneToPathCoord(pathObj, node.x - tx * targetLenIn, node.y - ty * targetLenIn);
      const outP = sceneToPathCoord(pathObj, node.x + tx * targetLenOut, node.y + ty * targetLenOut);

      cmds[node.inHandle.cmdIndex][node.inHandle.argX] = inP.x;
      cmds[node.inHandle.cmdIndex][node.inHandle.argY] = inP.y;
      cmds[node.outHandle.cmdIndex][node.outHandle.argX] = outP.x;
      cmds[node.outHandle.cmdIndex][node.outHandle.argY] = outP.y;
    }
  }

  finalizePathMutation(pathObj, prevOff);
}

/**
 * NuraDraw Auto-Close Curve / Toggle Closed Loop.
 */
export function toggleCloseCurve(pathObj: fabric.Path) {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };
  const last = cmds[cmds.length - 1];
  if (last && String(last[0]).toUpperCase() === 'Z') {
    cmds.pop();
  } else {
    cmds.push(['Z']);
  }
  finalizePathMutation(pathObj, prevOff);
}

/**
 * NuraDraw Break Curve at selected node (opens closed path or splits into two open subpaths).
 */
export function breakCurveAtNodes(pathObj: fabric.Path, nodeCmdIndices: number[]) {
  if (nodeCmdIndices.length === 0) return;
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };
  const targetIdx = nodeCmdIndices[0];

  const hasZ = cmds.some((c) => String(c[0]).toUpperCase() === 'Z');
  if (hasZ && targetIdx === 0) {
    // Simply remove Z to open at start node
    pathObj.path = cmds.filter((c) => String(c[0]).toUpperCase() !== 'Z') as any;
    finalizePathMutation(pathObj, prevOff);
    return;
  }

  const ep = getCmdEndpoint(cmds[targetIdx]);
  if (!ep) return;

  const out: any[][] = [];
  for (let i = 0; i < cmds.length; i++) {
    const op = String(cmds[i][0]).toUpperCase();
    if (op === 'Z') continue;
    out.push([...cmds[i]]);
    if (i === targetIdx && i < cmds.length - 1) {
      out.push(['M', ep.x, ep.y]);
    }
  }
  pathObj.path = out as any;
  (pathObj as any).nodeTypes = {};
  finalizePathMutation(pathObj, prevOff);
}

/**
 * NuraDraw Join Two Nodes: merges two selected open endpoints or closes gap between them.
 */
export function joinCurveNodes(pathObj: fabric.Path, nodeCmdIndices: number[]) {
  if (nodeCmdIndices.length < 2) return;
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  const aIdx = Math.min(nodeCmdIndices[0], nodeCmdIndices[1]);
  const bIdx = Math.max(nodeCmdIndices[0], nodeCmdIndices[1]);
  const pA = getCmdEndpoint(cmds[aIdx]);
  const pB = getCmdEndpoint(cmds[bIdx]);
  if (!pA || !pB) return;

  const mid = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
  setCmdEndpoint(cmds[aIdx], mid.x, mid.y);
  setCmdEndpoint(cmds[bIdx], mid.x, mid.y);

  const last = cmds[cmds.length - 1];
  if (aIdx === 0 && bIdx === cmds.length - 1 && String(last[0]).toUpperCase() !== 'Z') {
    cmds.push(['Z']);
  }

  finalizePathMutation(pathObj, prevOff);
}

/**
 * NuraDraw Reverse Subpath Direction.
 */
export function reverseCurveDirection(pathObj: fabric.Path) {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  if (cmds.length < 2) return;
  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };

  const hasZ = String(cmds[cmds.length - 1][0]).toUpperCase() === 'Z';
  const work = cmds.filter((c) => String(c[0]).toUpperCase() !== 'Z');
  if (work.length < 2) return;

  const points: { x: number; y: number }[] = [];
  const segs: { type: 'L' | 'C'; cp1?: { x: number; y: number }; cp2?: { x: number; y: number } }[] = [];

  for (let i = 0; i < work.length; i++) {
    const op = String(work[i][0]).toUpperCase();
    const ep = getCmdEndpoint(work[i]);
    if (!ep) continue;
    points.push(ep);
    if (i > 0) {
      if (op === 'C') {
        segs.push({
          type: 'C',
          cp1: { x: Number(work[i][1]), y: Number(work[i][2]) },
          cp2: { x: Number(work[i][3]), y: Number(work[i][4]) },
        });
      } else {
        segs.push({ type: 'L' });
      }
    }
  }

  const rev: any[][] = [['M', points[points.length - 1].x, points[points.length - 1].y]];
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    const targetPt = points[i];
    if (seg.type === 'C' && seg.cp1 && seg.cp2) {
      rev.push(['C', seg.cp2.x, seg.cp2.y, seg.cp1.x, seg.cp1.y, targetPt.x, targetPt.y]);
    } else {
      rev.push(['L', targetPt.x, targetPt.y]);
    }
  }
  if (hasZ) rev.push(['Z']);

  pathObj.path = rev as any;
  (pathObj as any).nodeTypes = {};
  finalizePathMutation(pathObj, prevOff);
}

/**
 * Smooth Tool on a Path: converts sharp L corners into smooth cubic Bezier curves.
 */
export function smoothPathCorners(pathObj: fabric.Path) {
  normalizePathToCubic(pathObj);
  const data = extractEditableCurveData(pathObj);
  const allSegs = data.segments.map((s) => s.cmdIndex);
  setSegmentsType(pathObj, allSegs, 'curve');
  const allNodes = data.nodes.map((n) => n.cmdIndex);
  setNodesType(pathObj, allNodes, 'smooth');
}

/**
 * Extends an open path by appending a new Bezier/line endpoint anywhere on the canvas.
 */
export function extendOpenCurveToPoint(
  pathObj: fabric.Path,
  sceneX: number,
  sceneY: number,
  asCurve: boolean = true
): number | null {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  if (cmds.length === 0) return null;
  const lastOp = String(cmds[cmds.length - 1][0]).toUpperCase();
  if (lastOp === 'Z') return null;

  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };
  const prevEp = getCmdEndpoint(cmds[cmds.length - 1]);
  if (!prevEp) return null;

  const targetPath = sceneToPathCoord(pathObj, sceneX, sceneY);
  if (asCurve) {
    cmds.push([
      'C',
      prevEp.x + (targetPath.x - prevEp.x) / 3,
      prevEp.y + (targetPath.y - prevEp.y) / 3,
      prevEp.x + ((targetPath.x - prevEp.x) * 2) / 3,
      prevEp.y + ((targetPath.y - prevEp.y) * 2) / 3,
      targetPath.x,
      targetPath.y,
    ]);
  } else {
    cmds.push(['L', targetPath.x, targetPath.y]);
  }

  const newCmdIdx = cmds.length - 1;
  finalizePathMutation(pathObj, prevOff);
  return newCmdIdx;
}

/**
 * NuraDraw Virtual Segment Delete: removes a clicked segment from a path.
 * If the subpath is closed, opens it smoothly by removing the clicked edge and keeping remaining edges connected.
 */
export function deleteSegmentFromPath(
  pathObj: fabric.Path,
  segCmdIndex: number
): 'modified' | 'delete_object' | 'noop' {
  normalizePathToCubic(pathObj);
  const cmds = pathObj.path as any[][];
  if (!Array.isArray(cmds) || cmds.length < 2) return 'delete_object';
  if (segCmdIndex <= 0 || segCmdIndex >= cmds.length) return 'noop';

  const prevOff = { x: pathObj.pathOffset?.x || 0, y: pathObj.pathOffset?.y || 0 };
  const segOp = String(cmds[segCmdIndex][0]).toUpperCase();

  // Single-segment open path -> delete entire object
  const drawableSegs = cmds.filter((c) => ['L', 'C', 'Q', 'Z'].includes(String(c[0]).toUpperCase()));
  if (drawableSegs.length <= 1) {
    return 'delete_object';
  }

  // Case 1: Clicked the closing 'Z' segment
  if (segOp === 'Z') {
    const next = cmds.filter((_, idx) => idx !== segCmdIndex);
    if (next.length < 2) return 'delete_object';
    pathObj.path = next as any;
    (pathObj as any).nodeTypes = {};
    finalizePathMutation(pathObj, prevOff);
    return 'modified';
  }

  const hasZ = String(cmds[cmds.length - 1][0]).toUpperCase() === 'Z';
  const work = cmds.filter((c) => String(c[0]).toUpperCase() !== 'Z');

  // If closed single-loop path, reorder commands so the break starts cleanly after the deleted segment
  if (hasZ && !work.slice(1).some((c) => String(c[0]).toUpperCase() === 'M')) {
    const startPt = getCmdEndpoint(work[0]);
    const prevEndPt = getCmdEndpoint(work[work.length - 1]);
    // Add explicit closing edge if startPt != prevEndPt
    const loopSegs: any[][] = [...work.slice(1)];
    if (startPt && prevEndPt && Math.hypot(startPt.x - prevEndPt.x, startPt.y - prevEndPt.y) > 0.5) {
      loopSegs.push(['L', startPt.x, startPt.y]);
    }
    const delSegIdx = segCmdIndex - 1;
    if (delSegIdx >= 0 && delSegIdx < loopSegs.length) {
      const deletedEnd = getCmdEndpoint(loopSegs[delSegIdx]);
      const reordered: any[][] = [];
      if (deletedEnd) {
        reordered.push(['M', deletedEnd.x, deletedEnd.y]);
        for (let offset = 1; offset < loopSegs.length; offset++) {
          reordered.push([...loopSegs[(delSegIdx + offset) % loopSegs.length]]);
        }
        if (reordered.length < 2) return 'delete_object';
        pathObj.path = reordered as any;
        (pathObj as any).nodeTypes = {};
        finalizePathMutation(pathObj, prevOff);
        return 'modified';
      }
    }
  }

  // Open path:
  // If deleting first segment (index 1), move 'M' to endpoint of segment 1
  if (segCmdIndex === 1) {
    const ep = getCmdEndpoint(work[1]);
    if (!ep || work.length <= 2) return 'delete_object';
    const next = [['M', ep.x, ep.y], ...work.slice(2)];
    pathObj.path = next as any;
    (pathObj as any).nodeTypes = {};
    finalizePathMutation(pathObj, prevOff);
    return 'modified';
  }

  // If deleting last segment
  if (segCmdIndex === work.length - 1) {
    const next = work.slice(0, -1);
    if (next.length < 2) return 'delete_object';
    pathObj.path = next as any;
    (pathObj as any).nodeTypes = {};
    finalizePathMutation(pathObj, prevOff);
    return 'modified';
  }

  // Deleting a middle segment: turn deleted segment into a subpath jump 'M' at its end point
  const ep = getCmdEndpoint(work[segCmdIndex]);
  if (!ep) return 'noop';
  const next = work.map((c, idx) => (idx === segCmdIndex ? ['M', ep.x, ep.y] : [...c]));
  pathObj.path = next as any;
  (pathObj as any).nodeTypes = {};
  finalizePathMutation(pathObj, prevOff);
  return 'modified';
}

