import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ToolType,
  PageConfig,
  PropertyState,
  CollaboratorUser,
  ThemeMode,
  SnapConfig,
  SnapGuideline,
  SnapMarker,
  CurveActionType,
  CurveEditState,
  ViewQualityMode,
  DimensionConfig,
  CropToolsConfig,
  CropActionType,
  CropRegion,
} from '../types';
import {
  ensureObjectId,
  disableObjectCaching,
  getObjectLabel,
  createPolygonPoints,
  createStarPoints,
  createSpiralPath,
  createDimensionObject,
  createHVDimensionObject,
  createAngularDimensionObject,
  createCalloutObject,
  findNearestObjectSegment,
  formatDimensionValue,
  createConnectorObject,
  applyBlockShadowToObject,
  applyExtrudeToObject,
  applyContourToObject,
  applyBlendToObject,
  applyDistortToObject,
  applyEnvelopeToObject,
} from '../utils/canvasHelpers';
import { reflowLinkedTextsForPath } from '../utils/fitTextToPath';
import { sliceObjectByLineSegment, cropObjectToRectTight } from '../utils/vectorSplit';
import {
  calculateObjectSnapping,
  extractObjectFeaturePoints,
  getObjectCenterlineCorners,
  findNearestOsnapPoint,
  applyPolarOrOrthoConstraint,
  GrabbedPointInfo,
  PolarGuide,
} from '../utils/snappingEngine';
import {
  EditableCurveData,
  CurveNodeType,
  extractEditableCurveData,
  findClosestSegmentHit,
  moveCurveNodes,
  moveCurveHandle,
  dragCurveSegment,
  addNodeOnPath,
  deleteNodesFromPath,
  setSegmentsType,
  setNodesType,
  breakCurveAtNodes,
  joinCurveNodes,
  toggleCloseCurve,
  reverseCurveDirection,
  smoothPathCorners,
  extendOpenCurveToPoint,
  convertObjectToCurves,
  deleteSegmentFromPath,
} from '../utils/curveEngine';
import { socketService } from '../services/socketService';
import { TopRuler, LeftRuler } from './Rulers';
import { CorelContextMenu } from './CorelContextMenu';

const EYEDROPPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19.5 4.5a2.12 2.12 0 0 1 0 3l-2.1 2.1 1.1 1.1-1.4 1.4-1.5-1.5-7.4 7.4c-.4.4-.9.7-1.4.8l-3 .7.7-3c.1-.5.4-1 .8-1.4l7.4-7.4-1.5-1.5 1.4-1.4 1.1 1.1 2.1-2.1a2.12 2.12 0 0 1 3 0Z" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 7.5 16.5 10.5" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const EYEDROPPER_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(EYEDROPPER_SVG)}") 2 21, crosshair`;

function normalizeColorToHex(color: any): string | null {
  if (color === null || color === undefined || color === '' || color === 'none') {
    return null;
  }
  if (color === 'transparent') return 'transparent';
  if (typeof color === 'object' && Array.isArray((color as any).colorStops)) {
    const firstStop = (color as any).colorStops[0];
    return firstStop?.color ? normalizeColorToHex(firstStop.color) : null;
  }
  if (typeof color !== 'string') return null;
  const trimmed = color.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return null;
  if (trimmed.toLowerCase() === 'transparent') return 'transparent';
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-f]{8}$/i.test(trimmed)) {
    const alpha = parseInt(trimmed.slice(7, 9), 16);
    if (alpha === 0) return 'transparent';
    return trimmed.slice(0, 7).toLowerCase();
  }
  const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    if (a <= 0) return 'transparent';
    const toHex = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
    return `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(rgbaMatch[3])}`;
  }
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#010203';
      ctx.fillStyle = trimmed;
      const computed = ctx.fillStyle;
      if (typeof computed === 'string' && /^#[0-9a-f]{6}$/i.test(computed)) {
        return computed.toLowerCase();
      }
    }
  } catch {
    // ignore invalid css color string
  }
  return trimmed.toLowerCase();
}

function sampleCanvasPixelHex(canvas: fabric.Canvas, evt?: MouseEvent): string | null {
  if (!evt) return null;
  try {
    const el = canvas.getElement();
    const ctx = el.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const px = Math.floor(((evt.clientX - rect.left) * el.width) / rect.width);
    const py = Math.floor(((evt.clientY - rect.top) * el.height) / rect.height);
    if (px < 0 || py < 0 || px >= el.width || py >= el.height) return null;
    const data = ctx.getImageData(px, py, 1, 1).data;
    if (data[3] === 0) return null;
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
  } catch {
    return null;
  }
}

function resolveHitLeafObject(
  obj: fabric.FabricObject,
  scenePt: fabric.Point | null,
  subTarget?: fabric.FabricObject | null
): fabric.FabricObject {
  if (subTarget && subTarget !== obj) {
    return resolveHitLeafObject(subTarget, scenePt, null);
  }
  const anyObj = obj as any;
  if (anyObj.type === 'group' && typeof anyObj.getObjects === 'function') {
    const children: fabric.FabricObject[] = anyObj.getObjects();
    if (scenePt) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.visible === false) continue;
        if (typeof child.containsPoint === 'function' && child.containsPoint(scenePt)) {
          return resolveHitLeafObject(child, scenePt, null);
        }
        const br = typeof child.getBoundingRect === 'function' ? child.getBoundingRect() : null;
        if (
          br &&
          scenePt.x >= br.left &&
          scenePt.x <= br.left + br.width &&
          scenePt.y >= br.top &&
          scenePt.y <= br.top + br.height
        ) {
          return resolveHitLeafObject(child, scenePt, null);
        }
      }
    }
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.visible === false) continue;
      if (child.fill || child.stroke || child.type === 'group') {
        return resolveHitLeafObject(child, scenePt, null);
      }
    }
  }
  return obj;
}

function extractObjectColors(
  target: fabric.FabricObject,
  canvas: fabric.Canvas,
  evt?: MouseEvent,
  subTarget?: fabric.FabricObject | null
): { fill: string; stroke: string } {
  const scenePt = evt ? canvas.getScenePoint(evt) : null;
  const resolved = resolveHitLeafObject(target, scenePt, subTarget);
  let fill = normalizeColorToHex((resolved as any).fill);
  let stroke = normalizeColorToHex((resolved as any).stroke);

  if (resolved.type === 'image') {
    const pixel = sampleCanvasPixelHex(canvas, evt);
    if (pixel) {
      fill = pixel;
    }
  }

  if (!fill && target !== resolved) {
    fill = normalizeColorToHex((target as any).fill);
  }
  if (!stroke && target !== resolved) {
    stroke = normalizeColorToHex((target as any).stroke);
  }

  if (!fill) {
    const pixel = sampleCanvasPixelHex(canvas, evt);
    if (pixel && (!stroke || stroke === 'transparent')) {
      fill = pixel;
    }
  }

  return {
    fill: fill || 'transparent',
    stroke: stroke || 'transparent',
  };
}

function resolveEventTarget(
  canvas: fabric.Canvas,
  evt: Event | undefined,
  opt?: any
): fabric.FabricObject | null {
  if (opt?.target && typeof (opt.target as any).onSelect === 'function') {
    return opt.target as fabric.FabricObject;
  }
  if (!evt) return null;
  const found: any = canvas.findTarget(evt as any);
  if (found) {
    if (typeof found.onSelect === 'function') return found as fabric.FabricObject;
    if (found.target && typeof found.target.onSelect === 'function') {
      return found.target as fabric.FabricObject;
    }
  }
  if ('clientX' in evt && 'clientY' in evt) {
    const scenePt = canvas.getScenePoint(evt as MouseEvent);
    const viewportPt = scenePt.transform(canvas.viewportTransform);
    const objs = canvas.getObjects();
    for (let i = objs.length - 1; i >= 0; i--) {
      const obj = objs[i];
      if (obj.visible === false || (obj as any).excludeFromExport) continue;
      if ((obj as any).perPixelTargetFind && typeof (canvas as any).isTargetTransparent === 'function') {
        if (!canvas.isTargetTransparent(obj, viewportPt.x, viewportPt.y)) {
          return obj;
        }
        continue;
      }
      if (typeof obj.containsPoint === 'function' && obj.containsPoint(scenePt)) {
        return obj;
      }
      const br = typeof obj.getBoundingRect === 'function' ? obj.getBoundingRect() : null;
      if (
        br &&
        scenePt.x >= br.left &&
        scenePt.x <= br.left + br.width &&
        scenePt.y >= br.top &&
        scenePt.y <= br.top + br.height
      ) {
        return obj;
      }
    }
  }
  return null;
}

function doesSegmentIntersectRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: { left: number; top: number; width: number; height: number }
): boolean {
  const minX = rect.left;
  const maxX = rect.left + rect.width;
  const minY = rect.top;
  const maxY = rect.top + rect.height;

  const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;
  if (inside(x1, y1) || inside(x2, y2)) return true;

  const segMinX = Math.min(x1, x2);
  const segMaxX = Math.max(x1, x2);
  const segMinY = Math.min(y1, y2);
  const segMaxY = Math.max(y1, y2);
  if (segMaxX < minX || segMinX > maxX || segMaxY < minY || segMinY > maxY) return false;

  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  const segsHit = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) =>
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);

  return (
    segsHit(x1, y1, x2, y2, minX, minY, maxX, minY) ||
    segsHit(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
    segsHit(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
    segsHit(x1, y1, x2, y2, minX, maxY, minX, minY)
  );
}

// Real vector/raster half-plane splitting lives in ../utils/vectorSplit.ts

function buildSceneEraserShapes(
  pts: { x: number; y: number }[],
  halfWidth: number,
  nib: 'round' | 'square'
): fabric.FabricObject[] {
  const shapes: fabric.FabricObject[] = [];
  const r = Math.max(1, halfWidth);
  const addCap = (p: { x: number; y: number }) => {
    if (nib === 'square') {
      shapes.push(
        new fabric.Rect({
          left: p.x - r,
          top: p.y - r,
          width: r * 2,
          height: r * 2,
          originX: 'left',
          originY: 'top',
          fill: '#000000',
          strokeWidth: 0,
        })
      );
    } else {
      shapes.push(
        new fabric.Circle({
          left: p.x - r,
          top: p.y - r,
          radius: r,
          originX: 'left',
          originY: 'top',
          fill: '#000000',
          strokeWidth: 0,
        })
      );
    }
  };

  if (pts.length === 0) return shapes;
  addCap(pts[0]);

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const angDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      shapes.push(
        new fabric.Rect({
          left: (a.x + b.x) / 2,
          top: (a.y + b.y) / 2,
          width: dist,
          height: r * 2,
          angle: angDeg,
          originX: 'center',
          originY: 'center',
          fill: '#000000',
          strokeWidth: 0,
        })
      );
    }
    addCap(b);
  }
  return shapes;
}

async function applyEraserStrokeToObjects(
  canvas: fabric.Canvas,
  rawPts: { x: number; y: number }[],
  eraserSize: number,
  nib: 'round' | 'square'
): Promise<boolean> {
  if (rawPts.length === 0) return false;
  const pts: { x: number; y: number }[] = [rawPts[0]];
  for (let i = 1; i < rawPts.length; i++) {
    const prev = pts[pts.length - 1];
    if (Math.hypot(rawPts[i].x - prev.x, rawPts[i].y - prev.y) >= 2.5) {
      pts.push(rawPts[i]);
    }
  }
  const halfW = Math.max(1, eraserSize / 2);

  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
  for (const p of pts) {
    if (p.x - halfW < sMinX) sMinX = p.x - halfW;
    if (p.y - halfW < sMinY) sMinY = p.y - halfW;
    if (p.x + halfW > sMaxX) sMaxX = p.x + halfW;
    if (p.y + halfW > sMaxY) sMaxY = p.y + halfW;
  }

  const objects = [...canvas.getObjects()];
  let anyModified = false;

  for (const obj of objects) {
    if (obj.visible === false || (obj as any).excludeFromExport || (obj as any).isDimension) continue;
    const br = obj.getBoundingRect();
    const overlapsBBox =
      br.left <= sMaxX &&
      br.left + br.width >= sMinX &&
      br.top <= sMaxY &&
      br.top + br.height >= sMinY;
    if (!overlapsBBox) continue;

    // Verify at least one stroke point is within halfW of object bounding rect
    let touches = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = i + 1 < pts.length ? pts[i + 1] : a;
      if (
        doesSegmentIntersectRect(a.x, a.y, b.x, b.y, {
          left: br.left - halfW,
          top: br.top - halfW,
          width: br.width + halfW * 2,
          height: br.height + halfW * 2,
        })
      ) {
        touches = true;
        break;
      }
    }
    if (!touches) continue;

    // If object is completely contained inside a single nib circle/square, remove it cleanly
    const objContainedInSinglePt =
      pts.length === 1 &&
      br.left >= pts[0].x - halfW &&
      br.left + br.width <= pts[0].x + halfW &&
      br.top >= pts[0].y - halfW &&
      br.top + br.height <= pts[0].y + halfW;

    if (objContainedInSinglePt) {
      canvas.remove(obj);
      anyModified = true;
      continue;
    }

    const maskShapes = buildSceneEraserShapes(pts, halfW, nib);
    if (maskShapes.length === 0) continue;
    const maskGroup = new fabric.Group(maskShapes, {
      inverted: true,
      fill: '#000000',
      strokeWidth: 0,
    });
    (maskGroup as any).isEraserMask = true;

    let targetObj = obj;
    if (obj.clipPath) {
      const stackIdx = canvas.getObjects().indexOf(obj);
      const objLabel = getObjectLabel(obj);
      canvas.remove(obj);
      const wrapper = new fabric.Group([obj], { subTargetCheck: true });
      disableObjectCaching(wrapper);
      ensureObjectId(wrapper, objLabel);
      if (stackIdx >= 0) canvas.insertAt(stackIdx, wrapper);
      else canvas.add(wrapper);
      targetObj = wrapper;
    }

    targetObj.setCoords();
    fabric.util.sendObjectToPlane(maskGroup, undefined, targetObj.calcTransformMatrix());
    maskGroup.inverted = true;
    targetObj.set('clipPath', maskGroup);
    targetObj.set({ dirty: true, perPixelTargetFind: true });
    anyModified = true;
  }

  return anyModified;
}

function buildPolylineOrBezierPathD(
  nodes: { x: number; y: number; inX?: number; inY?: number; outX?: number; outY?: number }[],
  closed: boolean
): string {
  if (nodes.length === 0) return '';
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i - 1];
    const q = nodes[i];
    if (p.outX !== undefined || q.inX !== undefined) {
      d += ` C ${p.outX ?? p.x} ${p.outY ?? p.y} ${q.inX ?? q.x} ${q.inY ?? q.y} ${q.x} ${q.y}`;
    } else {
      d += ` L ${q.x} ${q.y}`;
    }
  }
  if (closed && nodes.length >= 2) {
    const lastN = nodes[nodes.length - 1];
    const firstN = nodes[0];
    if (lastN.outX !== undefined || firstN.inX !== undefined) {
      d += ` C ${lastN.outX ?? lastN.x} ${lastN.outY ?? lastN.y} ${firstN.inX ?? firstN.x} ${firstN.inY ?? firstN.y} ${firstN.x} ${firstN.y}`;
    }
    d += ' Z';
  }
  return d;
}

function buildBSplinePathD(
  nodes: { x: number; y: number }[],
  closed: boolean
): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return `M ${nodes[0].x} ${nodes[0].y}`;
  if (nodes.length === 2) return `M ${nodes[0].x} ${nodes[0].y} L ${nodes[1].x} ${nodes[1].y}`;
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  if (closed) {
    const m0 = mid(nodes[nodes.length - 1], nodes[0]);
    let d = `M ${m0.x} ${m0.y}`;
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      const next = nodes[(i + 1) % nodes.length];
      const m = mid(p, next);
      d += ` Q ${p.x} ${p.y} ${m.x} ${m.y}`;
    }
    return d + ' Z';
  }
  const mFirst = mid(nodes[0], nodes[1]);
  let d = `M ${nodes[0].x} ${nodes[0].y} L ${mFirst.x} ${mFirst.y}`;
  for (let i = 1; i < nodes.length - 1; i++) {
    const mNext = mid(nodes[i], nodes[i + 1]);
    d += ` Q ${nodes[i].x} ${nodes[i].y} ${mNext.x} ${mNext.y}`;
  }
  const last = nodes[nodes.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

interface CorelCanvasProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  pageConfig: PageConfig;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  onSampleColors?: (fill: string, stroke: string) => void;
  onSelectionChange: (obj: fabric.FabricObject | null) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  showRulers: boolean;
  onRegisterCanvas: (canvas: fabric.Canvas) => void;
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser;
  onCursorMove: (pos: { x: number; y: number }) => void;
  currentFill: string;
  currentStroke: string;
  workspaceBg?: string;
  onOpenPageSetup?: () => void;
  theme?: ThemeMode;
  snapConfig?: SnapConfig;
  powerClipPicking?: boolean;
  onPickPowerClipContainer?: (container: fabric.FabricObject) => void;
  fitTextPicking?: boolean;
  onPickFitTextPath?: (pathTarget: fabric.FabricObject) => void;
  onPowerClipEdit?: (target: fabric.FabricObject) => void;
  onPowerClipFinish?: () => void;
  isPowerClipEditing?: boolean;
  isGroupEditing?: boolean;
  onGroupEditEnter?: (target: fabric.FabricObject, subTarget?: fabric.FabricObject | null) => void;
  onGroupEditFinish?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onUngroupAll?: () => void;
  // History & Clipboard actions
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPaste?: boolean;
  onCanvasModified?: () => void;
  // Context Menu Action callbacks
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onPowerClipPlace?: () => void;
  onPowerClipExtract?: () => void;
  onConvertToCurves?: () => void;
  onBringIntoFocus?: () => void;
  onBreakApart?: () => void;
  onToggleHide?: () => void;
  onToggleLock?: () => void;
  onOpenProperties?: () => void;
  onAlignToPixelGrid?: () => void;
  onCreateSymmetry?: () => void;
  onCreateSymbol?: () => void;
  // Curve editing state & action registration
  onCurveStateChange?: (state: CurveEditState) => void;
  onRegisterCurveActionHandler?: (handler: (action: CurveActionType) => void) => void;
  // Crop / Knife / Virtual Segment Delete / Eraser state & actions
  cropToolsConfig?: CropToolsConfig;
  onUpdateCropToolsConfig?: (cfg: Partial<CropToolsConfig>) => void;
  onRegisterCropActionHandler?: (handler: (action: CropActionType) => void) => void;
  // View menu display states
  viewQualityMode?: ViewQualityMode;
  proofColors?: boolean;
  simulateOverprints?: boolean;
  rasterizeComplexEffects?: boolean;
  showBaselineGrid?: boolean;
  showPrintableArea?: boolean;
  showGuidelines?: boolean;
  showAlignmentGuides?: boolean;
  showDynamicGuides?: boolean;
  showDocNavigator?: boolean;
  showScrollbars?: boolean;
  onObjectsCountChange?: (count: number) => void;
  dimensionConfig?: DimensionConfig;
}

export const CorelCanvas: React.FC<CorelCanvasProps> = ({
  activeTool,
  onSelectTool,
  pageConfig,
  properties,
  onUpdateProperties,
  onSampleColors,
  onSelectionChange,
  zoomLevel,
  onZoomChange,
  showGrid,
  showRulers,
  onRegisterCanvas,
  collaborators,
  currentUser,
  onCursorMove,
  currentFill,
  currentStroke,
  workspaceBg = '#3f4248',
  onOpenPageSetup,
  theme = 'light',
  snapConfig = {
    enabled: true,
    snapToGrid: false,
    snapToObjects: true,
    snapToPage: true,
    gridSize: 20,
    snapThreshold: 14,
  },
  powerClipPicking = false,
  onPickPowerClipContainer,
  fitTextPicking = false,
  onPickFitTextPath,
  onPowerClipEdit,
  onPowerClipFinish,
  isPowerClipEditing = false,
  isGroupEditing = false,
  onGroupEditEnter,
  onGroupEditFinish,
  onGroup,
  onUngroup,
  onUngroupAll,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  canPaste = false,
  onCanvasModified,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onPowerClipPlace,
  onPowerClipExtract,
  onConvertToCurves,
  onBringIntoFocus,
  onBreakApart,
  onToggleHide,
  onToggleLock,
  onOpenProperties,
  onAlignToPixelGrid,
  onCreateSymmetry,
  onCreateSymbol,
  onCurveStateChange,
  onRegisterCurveActionHandler,
  cropToolsConfig = { eraserSize: 18, eraserNib: 'round', knifeAutoGap: false, cropRegion: null },
  onUpdateCropToolsConfig,
  onRegisterCropActionHandler,
  viewQualityMode = 'enhanced',
  proofColors = false,
  simulateOverprints = false,
  rasterizeComplexEffects = false,
  showBaselineGrid = false,
  showPrintableArea = false,
  showGuidelines = true,
  showAlignmentGuides = true,
  showDynamicGuides = true,
  showDocNavigator = true,
  showScrollbars = true,
  onObjectsCountChange,
  dimensionConfig,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deskRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // Right-click context menu state
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Pan & Viewport state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 40 });
  const [docNavOpen, setDocNavOpen] = useState<boolean>(false);
  const [docNavPreviewUrl, setDocNavPreviewUrl] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Active magnetic snapping guidelines, AutoCAD OSNAP markers, Polar guide & CAD HUD
  const [activeSnapLines, setActiveSnapLines] = useState<SnapGuideline[]>([]);
  const [activeSnapMarkers, setActiveSnapMarkers] = useState<SnapMarker[]>([]);
  const [hoverSnapMarker, setHoverSnapMarker] = useState<SnapMarker | null>(null);
  const [activePolarGuide, setActivePolarGuide] = useState<PolarGuide | null>(null);
  const [cadHud, setCadHud] = useState<{ x: number; y: number; text: string; swatches?: [string, string] } | null>(null);
  const [bezierRubberBand, setBezierRubberBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const viewQualityModeRef = useRef<ViewQualityMode>(viewQualityMode);
  viewQualityModeRef.current = viewQualityMode;
  const simulateOverprintsRef = useRef<boolean>(simulateOverprints);
  simulateOverprintsRef.current = simulateOverprints;
  const rasterizeEffectsRef = useRef<boolean>(rasterizeComplexEffects);
  rasterizeEffectsRef.current = rasterizeComplexEffects;
  const snapConfigRef = useRef<SnapConfig>(snapConfig);
  snapConfigRef.current = snapConfig;
  const pageConfigRef = useRef<PageConfig>(pageConfig);
  pageConfigRef.current = pageConfig;
  const dimensionConfigRef = useRef<DimensionConfig | undefined>(dimensionConfig);
  dimensionConfigRef.current = dimensionConfig;
  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const activeToolRef = useRef<ToolType>(activeTool);
  activeToolRef.current = activeTool;
  const shiftKeyRef = useRef<boolean>(false);

  // Real-time loop prevention flag
  const isRemoteUpdateRef = useRef<boolean>(false);

  // Drawing in progress state
  const isDrawingShapeRef = useRef<boolean>(false);
  const shapeStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDrawnPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeTempShapeRef = useRef<fabric.FabricObject | null>(null);

  // Multi-step Dimension tools (Angular Dimension & 3-Point Callout) + Live SVG Preview
  const angularStepRef = useRef<{ vertex: { x: number; y: number }; p1?: { x: number; y: number } } | null>(null);
  const calloutStepRef = useRef<{ p1: { x: number; y: number }; p2?: { x: number; y: number } } | null>(null);
  const [dimOverlay, setDimOverlay] = useState<
    | { kind: 'hv'; x1: number; y1: number; x2: number; y2: number }
    | { kind: 'angular'; vx: number; vy: number; p1?: { x: number; y: number }; cursor: { x: number; y: number } }
    | { kind: 'segment'; x1: number; y1: number; x2: number; y2: number; label: string }
    | { kind: 'callout'; p1: { x: number; y: number }; p2?: { x: number; y: number }; cursor: { x: number; y: number } }
    | null
  >(null);

  // Bezier, Pen, B-Spline & Polyline multi-node drawing state
  const bezierNodesRef = useRef<{ x: number; y: number; inX?: number; inY?: number; outX?: number; outY?: number }[]>([]);
  const isDraggingBezierHandleRef = useRef<boolean>(false);
  const bezierPreviewRef = useRef<fabric.FabricObject | null>(null);
  const [bezierPenPreview, setBezierPenPreview] = useState<{
    nodes: { x: number; y: number; inX?: number; inY?: number; outX?: number; outY?: number }[];
    cursorPt: { x: number; y: number } | null;
    closeHighlight: boolean;
  } | null>(null);

  // 3-Point Curve state & live SVG overlay
  const curve3pStepRef = useRef<{ p1: { x: number; y: number }; p2?: { x: number; y: number }; phase: 'chord' | 'apex' } | null>(null);
  const [curve3pOverlay, setCurve3pOverlay] = useState<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    apex: { x: number; y: number } | null;
  } | null>(null);

  // Crop / Knife / Eraser interactive state & live SVG overlays
  const cropToolsConfigRef = useRef<CropToolsConfig>(cropToolsConfig);
  cropToolsConfigRef.current = cropToolsConfig;
  const cropDragRef = useRef<
    | { mode: 'create'; startX: number; startY: number }
    | { mode: 'move'; startX: number; startY: number; orig: CropRegion }
    | { mode: 'handle'; handle: string; startX: number; startY: number; orig: CropRegion }
    | null
  >(null);
  const [cropDraftRect, setCropDraftRect] = useState<CropRegion | null>(null);
  const knifeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [knifePreviewLine, setKnifePreviewLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const eraserTrailRef = useRef<{ x: number; y: number }[] | null>(null);
  const [eraserTrailPreview, setEraserTrailPreview] = useState<{ x: number; y: number }[] | null>(null);
  const [eraserCursorPt, setEraserCursorPt] = useState<{ x: number; y: number } | null>(null);

  // Panning with hand or middle mouse
  const isPanningRef = useRef<boolean>(false);
  const lastPanPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Grabbed point & drag origin for AutoCAD base-point move + Polar/Ortho tracking
  const grabbedPointRef = useRef<GrabbedPointInfo | null>(null);
  const dragOriginRef = useRef<{ left: number; top: number; baseX: number; baseY: number } | null>(null);

  // CorelDRAW Shape Tool (F10) Curve Node / Handle / Segment Editing Refs & Overlay State
  const activeCurvePathRef = useRef<fabric.Path | null>(null);
  const curveDataRef = useRef<EditableCurveData | null>(null);
  const selectedNodeIndicesRef = useRef<number[]>([]);
  const activeSegmentRef = useRef<{ cmdIndex: number; t: number } | null>(null);
  const addNodeModeRef = useRef<boolean>(false);
  const curveDragRef = useRef<
    | null
    | { mode: 'node'; lastX: number; lastY: number; primaryCmdIndex: number; didMutate: boolean }
    | { mode: 'handle'; nodeCmdIndex: number; which: 'cp1' | 'cp2'; didMutate: boolean }
    | { mode: 'segment'; cmdIndex: number; t: number; didMutate: boolean }
    | { mode: 'marquee'; startX: number; startY: number; clickedTarget: fabric.FabricObject | null }
  >(null);

  const [curveOverlay, setCurveOverlay] = useState<{
    data: EditableCurveData;
    selectedNodes: number[];
    activeSegCmd: number | null;
    hoverNodeCmd: number | null;
    hoverHandleKey: string | null;
  } | null>(null);
  const [curveMarquee, setCurveMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [addNodeHoverPreview, setAddNodeHoverPreview] = useState<{
    point: { x: number; y: number };
    extendFrom?: { x: number; y: number };
  } | null>(null);

  const onCurveStateChangeRef = useRef(onCurveStateChange);
  onCurveStateChangeRef.current = onCurveStateChange;
  const onCanvasModifiedRef = useRef(onCanvasModified);
  onCanvasModifiedRef.current = onCanvasModified;

  const syncCurveOverlay = useCallback(
    (
      pathObj: fabric.Path | null,
      hoverNodeCmd: number | null = null,
      hoverHandleKey: string | null = null
    ) => {
      activeCurvePathRef.current = pathObj;
      if (!pathObj) {
        curveDataRef.current = null;
        selectedNodeIndicesRef.current = [];
        activeSegmentRef.current = null;
        addNodeModeRef.current = false;
        setAddNodeHoverPreview(null);
        setCurveOverlay(null);
        onCurveStateChangeRef.current?.({
          isCurveObject: false,
          selectedNodeCount: 0,
          hasActiveSegment: false,
          activeSegmentType: null,
          activeNodeType: null,
          isClosed: false,
          nodeCount: 0,
          addNodeMode: false,
        });
        return;
      }

      const data = extractEditableCurveData(pathObj);
      curveDataRef.current = data;

      const validCmdSet = new Set(data.nodes.map((n) => n.cmdIndex));
      selectedNodeIndicesRef.current = selectedNodeIndicesRef.current.filter((idx) =>
        validCmdSet.has(idx)
      );

      let activeSegObj = activeSegmentRef.current
        ? data.segments.find((s) => s.cmdIndex === activeSegmentRef.current!.cmdIndex) || null
        : null;
      if (!activeSegObj) {
        activeSegmentRef.current = null;
      }

      let activeNodeType: CurveNodeType | null = null;
      if (selectedNodeIndicesRef.current.length > 0) {
        const firstSel = data.nodes.find((n) => n.cmdIndex === selectedNodeIndicesRef.current[0]);
        activeNodeType = firstSel?.nodeType || null;
      }

      setCurveOverlay({
        data,
        selectedNodes: [...selectedNodeIndicesRef.current],
        activeSegCmd: activeSegObj ? activeSegObj.cmdIndex : null,
        hoverNodeCmd,
        hoverHandleKey,
      });

      onCurveStateChangeRef.current?.({
        isCurveObject: true,
        selectedNodeCount: selectedNodeIndicesRef.current.length,
        hasActiveSegment: !!activeSegObj,
        activeSegmentType: activeSegObj ? activeSegObj.type : null,
        activeNodeType,
        isClosed: data.isClosed,
        nodeCount: data.nodes.length,
        addNodeMode: addNodeModeRef.current,
      });
    },
    []
  );

  // Initialize Fabric canvas once
  useEffect(() => {
    if (!canvasElementRef.current) return;

    const initialWidth = deskRef.current?.clientWidth || Math.max(pageConfig.width + 400, 1600);
    const initialHeight = deskRef.current?.clientHeight || Math.max(pageConfig.height + 400, 1200);

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: 'transparent',
      enableRetinaScaling: true,
      selection: true,
      selectionColor: 'transparent',
      selectionBorderColor: theme === 'dark' ? '#9ca3af' : '#52525b',
      selectionLineWidth: 1,
      selectionDashArray: [3, 3],
      selectionFullyContained: false,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    onRegisterCanvas(canvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          fabric.config.configure({ devicePixelRatio: window.devicePixelRatio || 1 });
          canvas.setDimensions({ width, height });
          canvas.requestRenderAll();
        }
      }
    });
    if (deskRef.current) {
      resizeObserver.observe(deskRef.current);
    }

    // Initial default shapes for quick preview if canvas is empty
    const welcomeRect = new fabric.Rect({
      left: 100,
      top: 120,
      originX: 'left',
      originY: 'top',
      width: 280,
      height: 180,
      fill: '#00a651',
      stroke: '#005826',
      strokeWidth: 2,
      strokeUniform: true,
      objectCaching: false,
      rx: 12,
      ry: 12,
    });
    ensureObjectId(welcomeRect, 'Corel Banner');

    const welcomeCircle = new fabric.Circle({
      left: 320,
      top: 220,
      originX: 'left',
      originY: 'top',
      radius: 80,
      fill: '#ed1c24',
      stroke: '#790000',
      strokeWidth: 2,
      strokeUniform: true,
      objectCaching: false,
      opacity: 0.9,
    });
    ensureObjectId(welcomeCircle, 'Accent Circle');

    const welcomeText = new fabric.IText('CorelDRAW Web', {
      left: 130,
      top: 180,
      originX: 'left',
      originY: 'top',
      fontFamily: 'Montserrat',
      fontSize: 26,
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    ensureObjectId(welcomeText, 'Title Text');

    canvas.add(welcomeRect, welcomeCircle, welcomeText);
    canvas.renderAll();

    // Event listeners for selection
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      onSelectionChange(active || null);
      if (activeToolRef.current === 'shape') {
        if (active && active.type === 'path') {
          syncCurveOverlay(active as fabric.Path);
        } else {
          syncCurveOverlay(null);
        }
      }
      if (active) {
        if (active.type === 'activeselection') {
          // Multi-selection: show collective bounding dimensions
          onUpdateProperties({
            x: Math.round(active.left || 0),
            y: Math.round(active.top || 0),
            width: Math.round((active.width || 0) * (active.scaleX || 1)),
            height: Math.round((active.height || 0) * (active.scaleY || 1)),
            angle: Math.round(active.angle || 0),
          });
        } else {
          onUpdateProperties({
            x: active.left || 0,
            y: active.top || 0,
            width: (active.width || 0) * (active.scaleX || 1),
            height: (active.height || 0) * (active.scaleY || 1),
            angle: active.angle || 0,
            fill: typeof active.fill === 'string' ? active.fill : '#00a651',
            stroke: typeof active.stroke === 'string' ? active.stroke : '#000000',
            strokeWidth: active.strokeWidth || 1,
            opacity: active.opacity !== undefined ? active.opacity : 1,
            rx: (active as any).rx || 0,
            ry: (active as any).ry || 0,
            fontFamily: (active as any).fontFamily || 'Montserrat',
            fontSize: (active as any).fontSize || 24,
            fontWeight: (active as any).fontWeight || 'normal',
            fontStyle: (active as any).fontStyle || 'normal',
            underline: !!(active as any).underline,
            linethrough: !!(active as any).linethrough,
            textAlign: (active as any).textAlign || 'left',
            charSpacing: (active as any).charSpacing || 0,
            lineHeight: (active as any).lineHeight || 1.16,
            textBackgroundColor: (active as any).textBackgroundColor || 'transparent',
          });
        }
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      setActiveSnapLines([]);
      setActiveSnapMarkers([]);
      if (activeToolRef.current !== 'shape') {
        syncCurveOverlay(null);
      }
      onSelectionChange(null);
    });

    // Handle modification and sync to real-time peers
    const handleModified = (e: any) => {
      setActiveSnapLines([]);
      setActiveSnapMarkers([]);
      if (isRemoteUpdateRef.current) return;
      const target = e.target;
      if (target) {
        ensureObjectId(target);
        reflowLinkedTextsForPath(canvas, target);
        handleSelection();
        // Broadcast to WebSocket peers
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify', (target as any).id, target.toJSON());
      }
      onCanvasModified?.();
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:added', (e: any) => {
      onObjectsCountChange?.(canvas.getObjects().length);
      if (e.target) {
        disableObjectCaching(e.target);
        if (!isRemoteUpdateRef.current) {
          ensureObjectId(e.target);
        }
      }
    });
    canvas.on('object:removed', () => {
      onObjectsCountChange?.(canvas.getObjects().length);
    });

    // Non-destructive View Quality / Overprint / Rasterize render hooks
    const renderBackup = new WeakMap<
      fabric.FabricObject,
      { fill: any; stroke: any; strokeWidth: any; shadow: any; gco: any }
    >();
    const collectLeafObjects = (objs: fabric.FabricObject[], out: fabric.FabricObject[] = []) => {
      for (const o of objs) {
        out.push(o);
        if (typeof (o as any).getObjects === 'function') {
          collectLeafObjects((o as any).getObjects(), out);
        }
      }
      return out;
    };
    const handleBeforeRender = () => {
      const mode = viewQualityModeRef.current;
      const overprint = simulateOverprintsRef.current;
      const rasterizeFx = rasterizeEffectsRef.current;
      const ctx = canvas.getContext();
      if (ctx) {
        ctx.imageSmoothingEnabled = mode !== 'normal' && mode !== 'pixels';
      }
      const all = collectLeafObjects(canvas.getObjects());
      for (const o of all) {
        if ((o as any).objectCaching || (o as any).noScaleCache) {
          disableObjectCaching(o);
        }
      }
      if (mode !== 'wireframe' && !overprint && !rasterizeFx) return;
      for (const o of all) {
        renderBackup.set(o, {
          fill: o.fill,
          stroke: o.stroke,
          strokeWidth: o.strokeWidth,
          shadow: o.shadow,
          gco: o.globalCompositeOperation,
        });
        if (mode === 'wireframe') {
          o.fill = 'transparent';
          o.stroke = '#1e293b';
          o.strokeWidth = 1 / Math.max(0.01, zoomLevelRef.current);
          o.shadow = null;
        } else {
          if (overprint) {
            o.globalCompositeOperation = 'multiply';
          }
          if (rasterizeFx && o.shadow) {
            o.shadow = new fabric.Shadow({
              color: (o.shadow as any).color || 'rgba(0,0,0,0.4)',
              blur: Math.max(2, Math.round(((o.shadow as any).blur || 8) * 0.6)),
              offsetX: (o.shadow as any).offsetX || 4,
              offsetY: (o.shadow as any).offsetY || 4,
            });
          }
        }
      }
    };
    const handleAfterRender = () => {
      const all = collectLeafObjects(canvas.getObjects());
      for (const o of all) {
        const b = renderBackup.get(o);
        if (b) {
          o.fill = b.fill;
          o.stroke = b.stroke;
          o.strokeWidth = b.strokeWidth;
          o.shadow = b.shadow;
          o.globalCompositeOperation = b.gco;
          renderBackup.delete(o);
        }
      }
    };
    canvas.on('before:render', handleBeforeRender);
    canvas.on('after:render', handleAfterRender);

    // Cleanup on unmount
    return () => {
      canvas.off('before:render', handleBeforeRender);
      canvas.off('after:render', handleAfterRender);
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Re-render canvas whenever View Quality / Overprints / Rasterize toggle changes
  useEffect(() => {
    fabricRef.current?.requestRenderAll();
  }, [viewQualityMode, simulateOverprints, rasterizeComplexEffects]);

  // Sync zoom and pan to fabric viewport transform
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(zoomLevel);
    canvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, pan.x, pan.y]);
    // Synchronize object coordinates for marquee selection at all zoom/pan positions
    canvas.forEachObject((obj) => obj.setCoords());
    canvas.requestRenderAll();
  }, [zoomLevel, pan]);

  // Sync window selection style on theme change (transparent fill, grey dotted outline)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.selectionColor = 'transparent';
    canvas.selectionBorderColor = theme === 'dark' ? '#9ca3af' : '#52525b';
    canvas.selectionLineWidth = 1;
    canvas.selectionDashArray = [3, 3];
    canvas.requestRenderAll();
  }, [theme]);

  // Mouse cursor-centered Zoom In & Zoom Out on wheel scroll (CorelDRAW behavior)
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = desk.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Exact scene coordinates under the mouse cursor before zooming
      const sceneX = (screenX - pan.x) / zoomLevel;
      const sceneY = (screenY - pan.y) / zoomLevel;

      // Mouse wheel delta: deltaY < 0 = scroll up (Zoom In), deltaY > 0 = scroll down (Zoom Out)
      const zoomDelta = -e.deltaY * 0.002;
      const factor = Math.exp(zoomDelta);
      const newZoom = Math.min(4096, Math.max(0.01, Number((zoomLevel * factor).toFixed(4))));
      if (newZoom === zoomLevel) return;

      // Position the new pan so the exact scene coordinates stay anchored under the cursor
      const newPanX = screenX - sceneX * newZoom;
      const newPanY = screenY - sceneY * newZoom;

      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
      onZoomChange(newZoom);
    };

    desk.addEventListener('wheel', handleWheel, { passive: false });
    return () => desk.removeEventListener('wheel', handleWheel);
  }, [pan, zoomLevel, onZoomChange]);

  // Handle incoming remote updates from WebSocket without infinite loops
  useEffect(() => {
    const unsubscribeCanvas = socketService.on('canvas:updated', async (payload: any) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if (payload.senderId === currentUser.id) return; // Ignore own messages

      isRemoteUpdateRef.current = true;
      try {
        if (payload.canvasData) {
          await canvas.loadFromJSON(payload.canvasData);
          canvas.forEachObject((obj) => disableObjectCaching(obj));
          canvas.requestRenderAll();
        }
      } catch (e) {
        console.error('Failed to apply remote canvas update', e);
      } finally {
        isRemoteUpdateRef.current = false;
      }
    });

    const unsubscribeInit = socketService.on('room:init', async (payload: any) => {
      const canvas = fabricRef.current;
      if (!canvas || !payload.canvasData) return;

      isRemoteUpdateRef.current = true;
      try {
        await canvas.loadFromJSON(payload.canvasData);
        canvas.forEachObject((obj) => disableObjectCaching(obj));
        canvas.requestRenderAll();
      } catch (e) {
        console.error('Failed to load initial room state', e);
      } finally {
        isRemoteUpdateRef.current = false;
      }
    });

    return () => {
      unsubscribeCanvas();
      unsubscribeInit();
    };
  }, [currentUser.id]);

  // Update canvas tool state & drawing modes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (!['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool)) {
      bezierNodesRef.current = [];
      isDraggingBezierHandleRef.current = false;
      bezierPreviewRef.current = null;
      setBezierPenPreview(null);
      setBezierRubberBand(null);
    }
    if (activeTool !== 'curve_3p') {
      curve3pStepRef.current = null;
      setCurve3pOverlay(null);
    }

    if (activeTool !== 'angular_dimension') {
      angularStepRef.current = null;
    }
    if (activeTool !== 'callout') {
      calloutStepRef.current = null;
    }
    if (!['dimension', 'hv_dimension', 'angular_dimension', 'segment_dimension', 'callout', 'virtual_segment_delete'].includes(activeTool)) {
      setDimOverlay(null);
    }
    if (activeTool !== 'crop') {
      cropDragRef.current = null;
      setCropDraftRect(null);
      if (cropToolsConfigRef.current?.cropRegion) {
        onUpdateCropToolsConfig?.({ cropRegion: null });
      }
    }
    if (activeTool !== 'knife') {
      knifeStartRef.current = null;
      setKnifePreviewLine(null);
    }
    if (activeTool !== 'eraser') {
      eraserTrailRef.current = null;
      setEraserTrailPreview(null);
      setEraserCursorPt(null);
    }
    setCadHud(null);

    canvas.isDrawingMode = activeTool === 'freehand' || activeTool === 'artistic_media';

    if (activeTool === 'freehand') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = currentStroke || '#000000';
      canvas.freeDrawingBrush.width = properties.strokeWidth || 2;
    } else if (activeTool === 'artistic_media') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = currentStroke || '#1e293b';
      canvas.freeDrawingBrush.width = Math.max(6, (properties.strokeWidth || 2) * 4);
    }

    if (powerClipPicking || fitTextPicking) {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = true; // allow clicking to select target container or path
      });
      canvas.requestRenderAll();
      return;
    }

    const restoreLockState = (obj: fabric.FabricObject) => {
      const isLocked = !!(obj as any).isLocked;
      obj.set({
        hasControls: !isLocked,
        hasBorders: true,
        lockMovementX: isLocked,
        lockMovementY: isLocked,
      });
    };

    canvas.hoverCursor =
      activeTool === 'eyedropper'
        ? EYEDROPPER_CURSOR
        : activeTool === 'pick' || activeTool === 'freehand_pick'
        ? 'move'
        : 'crosshair';

    if (activeTool === 'pick' || activeTool === 'freehand_pick') {
      syncCurveOverlay(null);
      setCurveMarquee(null);
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
        restoreLockState(obj);
        obj.setCoords();
      });
      canvas.requestRenderAll();
    } else if (activeTool === 'shape') {
      canvas.selection = false;
      canvas.defaultCursor = 'default';
      addNodeModeRef.current = false;
      setAddNodeHoverPreview(null);
      const curActive = canvas.getActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = true;
        obj.set({
          hasControls: false,
          hasBorders: obj.type !== 'path',
          lockMovementX: true,
          lockMovementY: true,
        });
        obj.setCoords();
      });
      if (curActive && curActive.type === 'path') {
        selectedNodeIndicesRef.current = [];
        activeSegmentRef.current = null;
        syncCurveOverlay(curActive as fabric.Path);
      } else {
        syncCurveOverlay(null);
      }
      canvas.requestRenderAll();
    } else if (activeTool === 'pan') {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.discardActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      canvas.requestRenderAll();
    } else if (activeTool === 'zoom') {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = 'zoom-in';
      canvas.discardActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      canvas.requestRenderAll();
    } else if (activeTool === 'eyedropper') {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = EYEDROPPER_CURSOR;
      canvas.hoverCursor = EYEDROPPER_CURSOR;
      canvas.discardActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = true; // eyedropper samples colors from objects
      });
      canvas.requestRenderAll();
    } else if (
      ['smooth', 'smart_fill', 'transparency', 'shadow', 'contour', 'blend', 'distort', 'envelope', 'extrude', 'block_shadow', 'knife', 'virtual_segment_delete', 'eraser', 'gradient'].includes(
        activeTool
      )
    ) {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = true; // object-modifying tools click existing objects
      });
      canvas.requestRenderAll();
    } else if (activeTool === 'text') {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = 'text';
      canvas.forEachObject((obj) => {
        const isTextObj = obj.type === 'i-text' || obj.type === 'text';
        obj.selectable = isTextObj;
        obj.evented = isTextObj;
        restoreLockState(obj);
      });
      canvas.requestRenderAll();
    } else {
      syncCurveOverlay(null);
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      canvas.requestRenderAll();
    }
  }, [activeTool, currentStroke, properties.strokeWidth, powerClipPicking, fitTextPicking, syncCurveOverlay]);

  // Register CorelDRAW Shape Tool Property Bar action handler
  useEffect(() => {
    if (!onRegisterCurveActionHandler) return;
    onRegisterCurveActionHandler((action: CurveActionType) => {
      const canvas = fabricRef.current;
      const curPath = activeCurvePathRef.current;
      const curData = curveDataRef.current;
      if (!canvas || !curPath || !curData) return;

      let didChange = false;

      if (action === 'add_node') {
        let segIdx: number | null = activeSegmentRef.current?.cmdIndex ?? null;
        let tVal = activeSegmentRef.current?.t ?? 0.5;
        if (segIdx === null && selectedNodeIndicesRef.current.length > 0) {
          const selSet = new Set(selectedNodeIndicesRef.current);
          const matchSeg = curData.segments.find(
            (s) => selSet.has(s.cmdIndex) || selSet.has(s.prevCmdIndex)
          );
          if (matchSeg) {
            segIdx = matchSeg.cmdIndex;
            tVal = 0.5;
          }
        }
        if (segIdx === null && curData.segments.length > 0) {
          segIdx = curData.segments[0].cmdIndex;
          tVal = 0.5;
        }
        if (segIdx !== null) {
          const inserted = addNodeOnPath(curPath, segIdx, tVal);
          if (inserted !== null) {
            selectedNodeIndicesRef.current = [inserted];
            activeSegmentRef.current = null;
            didChange = true;
          }
        }
      } else if (action === 'delete_node') {
        if (selectedNodeIndicesRef.current.length > 0) {
          didChange = deleteNodesFromPath(curPath, selectedNodeIndicesRef.current);
          if (didChange) {
            selectedNodeIndicesRef.current = [];
            activeSegmentRef.current = null;
          }
        }
      } else if (action === 'join_nodes') {
        if (selectedNodeIndicesRef.current.length >= 2) {
          joinCurveNodes(curPath, selectedNodeIndicesRef.current);
          didChange = true;
        }
      } else if (action === 'break_curve') {
        if (selectedNodeIndicesRef.current.length > 0) {
          breakCurveAtNodes(curPath, selectedNodeIndicesRef.current);
          selectedNodeIndicesRef.current = [];
          didChange = true;
        }
      } else if (action === 'toggle_add_node_mode') {
        addNodeModeRef.current = !addNodeModeRef.current;
        if (!addNodeModeRef.current) setAddNodeHoverPreview(null);
        canvas.defaultCursor = addNodeModeRef.current ? 'crosshair' : 'default';
        syncCurveOverlay(curPath);
        return;
      } else if (action === 'all_to_curve') {
        const allSegIndices = curData.segments.map((s) => s.cmdIndex);
        if (allSegIndices.length > 0) {
          setSegmentsType(curPath, allSegIndices, 'curve');
          didChange = true;
        }
      } else if (action === 'to_line' || action === 'to_curve') {
        const targetType = action === 'to_line' ? 'line' : 'curve';
        let segIndices: number[] = [];
        if (activeSegmentRef.current) {
          segIndices = [activeSegmentRef.current.cmdIndex];
        } else if (selectedNodeIndicesRef.current.length > 0) {
          const selSet = new Set(selectedNodeIndicesRef.current);
          segIndices = curData.segments
            .filter((s) => selSet.has(s.cmdIndex) || selSet.has(s.prevCmdIndex))
            .map((s) => s.cmdIndex);
        } else {
          segIndices = curData.segments.map((s) => s.cmdIndex);
        }
        if (segIndices.length > 0) {
          setSegmentsType(curPath, segIndices, targetType);
          didChange = true;
        }
      } else if (action === 'node_cusp' || action === 'node_smooth' || action === 'node_symmetrical') {
        const nType: CurveNodeType =
          action === 'node_cusp' ? 'cusp' : action === 'node_smooth' ? 'smooth' : 'symmetrical';
        const targetNodes =
          selectedNodeIndicesRef.current.length > 0
            ? selectedNodeIndicesRef.current
            : curData.nodes.map((n) => n.cmdIndex);
        if (targetNodes.length > 0) {
          setNodesType(curPath, targetNodes, nType);
          didChange = true;
        }
      } else if (action === 'reverse_curve') {
        reverseCurveDirection(curPath);
        didChange = true;
      } else if (action === 'close_curve') {
        toggleCloseCurve(curPath);
        didChange = true;
      } else if (action === 'select_all_nodes') {
        selectedNodeIndicesRef.current = curData.nodes.map((n) => n.cmdIndex);
        activeSegmentRef.current = null;
        syncCurveOverlay(curPath);
        return;
      }

      if (didChange) {
        syncCurveOverlay(curPath);
        canvas.requestRenderAll();
        onCanvasModifiedRef.current?.();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      }
    });
  }, [onRegisterCurveActionHandler, syncCurveOverlay]);

  const applyCropRegionToCanvas = useCallback(
    async (region: CropRegion | null) => {
      const canvas = fabricRef.current;
      if (!canvas || !region || region.width < 10 || region.height < 10) return;
      const { x: left, y: top, width, height } = region;
      const rect = { left, top, width, height };
      const objects = [...canvas.getObjects()];

      for (const obj of objects) {
        if (obj.visible === false || (obj as any).excludeFromExport || (obj as any).isDimension) continue;
        const r = obj.getBoundingRect();
        const intersects =
          r.left < left + width &&
          r.left + r.width > left &&
          r.top < top + height &&
          r.top + r.height > top;
        if (!intersects) {
          canvas.remove(obj);
          continue;
        }
        const cropped = await cropObjectToRectTight(obj, rect);
        if (!cropped) {
          canvas.remove(obj);
        } else if (cropped !== obj) {
          const stackIdx = canvas.getObjects().indexOf(obj);
          canvas.remove(obj);
          if (stackIdx >= 0) canvas.insertAt(stackIdx, cropped);
          else canvas.add(cropped);
        }
      }

      cropDragRef.current = null;
      setCropDraftRect(null);
      onUpdateCropToolsConfig?.({ cropRegion: null });
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      onCanvasModified?.();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      onSelectTool('pick');
    },
    [onUpdateCropToolsConfig, onCanvasModified, onSelectTool]
  );

  // Register Crop Property Bar action handler (Apply / Clear Crop)
  useEffect(() => {
    if (!onRegisterCropActionHandler) return;
    onRegisterCropActionHandler((action: CropActionType) => {
      if (action === 'apply_crop') {
        applyCropRegionToCanvas(cropToolsConfigRef.current?.cropRegion || null);
      } else if (action === 'clear_crop') {
        cropDragRef.current = null;
        setCropDraftRect(null);
        onUpdateCropToolsConfig?.({ cropRegion: null });
        setCadHud(null);
      }
    });
  }, [onRegisterCropActionHandler, applyCropRegionToCanvas, onUpdateCropToolsConfig]);

  // Mouse handlers for drawing vector shapes and panning
  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const evt = opt.e as MouseEvent;
      const pointer = canvas.getScenePoint(evt);

      // PowerClip container selection mode
      if (powerClipPicking) {
        const target = opt.target;
        if (target && onPickPowerClipContainer) {
          onPickPowerClipContainer(target);
        }
        return;
      }

      // Fit Text to Path target selection mode
      if (fitTextPicking) {
        const target = opt.target;
        if (target && onPickFitTextPath) {
          onPickFitTextPath(target);
        }
        return;
      }

      // Pan with middle mouse button or Pan tool
      if (evt.button === 1 || activeTool === 'pan') {
        isPanningRef.current = true;
        lastPanPosRef.current = { x: evt.clientX, y: evt.clientY };
        canvas.defaultCursor = 'grabbing';
        (canvas as any)._currentTransform = null;
        canvas.requestRenderAll();
        return;
      }

      // Zoom tool click (Left click = zoom in at cursor, Alt/Right click = zoom out at cursor)
      if (activeTool === 'zoom') {
        const desk = deskRef.current;
        const rect = desk ? desk.getBoundingClientRect() : { left: 0, top: 0 };
        const screenX = evt.clientX - rect.left;
        const screenY = evt.clientY - rect.top;

        const sceneX = (screenX - pan.x) / zoomLevel;
        const sceneY = (screenY - pan.y) / zoomLevel;

        const factor = evt.altKey || evt.button === 2 ? 0.5 : 2;
        const newZoom = Math.min(4096, Math.max(0.01, Number((zoomLevel * factor).toFixed(4))));

        const newPanX = screenX - sceneX * newZoom;
        const newPanY = screenY - sceneY * newZoom;

        setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
        onZoomChange(newZoom);
        return;
      }

      setHoverSnapMarker(null);
      const currentSnap = snapConfigRef.current;
      const curZoom = zoomLevelRef.current || 1;

      const resolveSnappedPoint = (
        rawPt: { x: number; y: number },
        perpOrigin?: { x: number; y: number } | null
      ) => {
        if (!currentSnap?.enabled) return { x: rawPt.x, y: rawPt.y };
        const osnap = findNearestOsnapPoint(
          rawPt.x,
          rawPt.y,
          canvas.getObjects(),
          activeTempShapeRef.current,
          pageConfigRef.current,
          currentSnap,
          curZoom,
          perpOrigin
        );
        return osnap ? { x: osnap.x, y: osnap.y } : { x: rawPt.x, y: rawPt.y };
      };

      // Shape Tool (F10): Manual Add Node Anywhere + Bezier Handle + Node + Segment + Window Selection
      if (activeTool === 'shape') {
        const curPath = activeCurvePathRef.current;
        const curData = curveDataRef.current;
        const hitTol = 10 / curZoom;

        if (curPath && curData) {
          const isOverExistingHandleOrNode = curData.nodes.some(
            (n) =>
              Math.hypot(n.x - pointer.x, n.y - pointer.y) <= hitTol ||
              (n.inHandle && Math.hypot(n.inHandle.x - pointer.x, n.inHandle.y - pointer.y) <= hitTol) ||
              (n.outHandle && Math.hypot(n.outHandle.x - pointer.x, n.outHandle.y - pointer.y) <= hitTol)
          );

          // 0. Manual Add-Node Mode (or Alt+Click on segment): add point on segment immediately
          if ((addNodeModeRef.current || evt.altKey) && !isOverExistingHandleOrNode) {
            const segHit = findClosestSegmentHit(curData, pointer.x, pointer.y, 16 / curZoom);
            if (segHit) {
              const inserted = addNodeOnPath(curPath, segHit.seg.cmdIndex, segHit.t);
              if (inserted !== null) {
                selectedNodeIndicesRef.current = [inserted];
                activeSegmentRef.current = null;
                setAddNodeHoverPreview(null);
                syncCurveOverlay(curPath);
                canvas.requestRenderAll();
                onCanvasModified?.();
                socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
              }
              return;
            }
          }

          // 1. Hit-test Bezier Handles of currently active curve
          for (const node of curData.nodes) {
            const candidates: { h: typeof node.inHandle; which: 'cp1' | 'cp2' }[] = [
              { h: node.outHandle, which: 'cp1' },
              { h: node.inHandle, which: 'cp2' },
            ];
            for (const c of candidates) {
              if (!c.h) continue;
              if (Math.hypot(c.h.x - pointer.x, c.h.y - pointer.y) <= hitTol) {
                selectedNodeIndicesRef.current = [node.cmdIndex];
                activeSegmentRef.current = null;
                curveDragRef.current = {
                  mode: 'handle',
                  nodeCmdIndex: node.cmdIndex,
                  which: c.which,
                  didMutate: false,
                };
                syncCurveOverlay(curPath);
                return;
              }
            }
          }

          // 2. Hit-test Curve Nodes
          for (const node of curData.nodes) {
            if (Math.hypot(node.x - pointer.x, node.y - pointer.y) <= hitTol) {
              if (evt.shiftKey) {
                const exists = selectedNodeIndicesRef.current.includes(node.cmdIndex);
                selectedNodeIndicesRef.current = exists
                  ? selectedNodeIndicesRef.current.filter((id) => id !== node.cmdIndex)
                  : [...selectedNodeIndicesRef.current, node.cmdIndex];
              } else if (!selectedNodeIndicesRef.current.includes(node.cmdIndex)) {
                selectedNodeIndicesRef.current = [node.cmdIndex];
              }
              activeSegmentRef.current = null;
              curveDragRef.current = {
                mode: 'node',
                lastX: pointer.x,
                lastY: pointer.y,
                primaryCmdIndex: node.cmdIndex,
                didMutate: false,
              };
              syncCurveOverlay(curPath);
              return;
            }
          }

          // 3. Hit-test Curve / Line Segments (Direct CorelDRAW segment bending)
          const segHit = findClosestSegmentHit(curData, pointer.x, pointer.y, hitTol);
          if (segHit) {
            selectedNodeIndicesRef.current = [];
            activeSegmentRef.current = { cmdIndex: segHit.seg.cmdIndex, t: segHit.t };
            curveDragRef.current = {
              mode: 'segment',
              cmdIndex: segHit.seg.cmdIndex,
              t: segHit.t,
              didMutate: false,
            };
            syncCurveOverlay(curPath);
            return;
          }
        }

        // 4. Start Window Selection (marquee box) unconditionally on drag;
        // if user only clicks (< 4px drag) on another object or open-curve extension, handle it on mouse:up!
        const target = resolveEventTarget(canvas, evt, opt);
        curveDragRef.current = {
          mode: 'marquee',
          startX: pointer.x,
          startY: pointer.y,
          clickedTarget: target,
        };
        setCurveMarquee({ x1: pointer.x, y1: pointer.y, x2: pointer.x, y2: pointer.y });
        return;
      }

      // Point-Grab Tracking: Detect if user grabbed a specific node/midpoint/center/quadrant of the target
      // (Skip if clicking a resize/rotation handle transform corner)
      if ((activeTool === 'pick' || activeTool === 'freehand_pick') && opt.target && !opt.transform?.corner) {
        const target = opt.target;
        if (typeof target.setCoords === 'function') target.setCoords();
        const fPoints = extractObjectFeaturePoints(target);
        let closest: { pt: any; dist: number } | null = null;
        const grabRadius = Math.min(28, Math.max(8, 18 / curZoom));
        for (const pt of fPoints) {
          const d = Math.hypot(pt.x - pointer.x, pt.y - pointer.y);
          if (d <= grabRadius && (!closest || d < closest.dist)) {
            closest = { pt, dist: d };
          }
        }
        if (closest) {
          grabbedPointRef.current = {
            type: closest.pt.type,
            label: closest.pt.label,
            offsetFromOrigin: {
              dx: closest.pt.x - (target.left || 0),
              dy: closest.pt.y - (target.top || 0),
            },
          };
          dragOriginRef.current = {
            left: target.left || 0,
            top: target.top || 0,
            baseX: closest.pt.x,
            baseY: closest.pt.y,
          };
        } else {
          grabbedPointRef.current = null;
          const c = target.getCenterPoint ? target.getCenterPoint() : { x: pointer.x, y: pointer.y };
          dragOriginRef.current = {
            left: target.left || 0,
            top: target.top || 0,
            baseX: c.x,
            baseY: c.y,
          };
        }
      } else {
        grabbedPointRef.current = null;
        dragOriginRef.current = null;
      }

      // Eyedropper tool click
      if (activeTool === 'eyedropper') {
        const subTarget = opt?.subTargets && opt.subTargets.length > 0 ? opt.subTargets[0] : null;
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          const { fill, stroke } = extractObjectColors(target, canvas, evt, subTarget);
          if (onSampleColors) {
            onSampleColors(fill, stroke);
          } else {
            onUpdateProperties({ fill, stroke });
          }
          setCadHud(null);
          if (!evt.shiftKey) {
            onSelectTool('pick');
          }
        }
        return;
      }

      // Interactive Gradient tool click
      if (activeTool === 'gradient') {
        const target = opt.target;
        if (target) {
          const grad = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: target.width || 100, y2: target.height || 100 },
            colorStops: [
              { offset: 0, color: currentFill === 'transparent' ? '#00a651' : currentFill },
              { offset: 1, color: '#fff200' },
            ],
          });
          target.set('fill', grad);
          canvas.renderAll();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Artistic Text Tool click (with OSNAP start point)
      if (activeTool === 'text') {
        const startPt = resolveSnappedPoint(pointer);
        const iText = new fabric.IText('Vector Text', {
          left: startPt.x,
          top: startPt.y,
          originX: 'left',
          originY: 'top',
          fontFamily: properties.fontFamily || 'Montserrat',
          fontSize: properties.fontSize || 24,
          fontWeight: (properties.fontWeight as any) || 'normal',
          fontStyle: (properties.fontStyle as any) || 'normal',
          underline: !!properties.underline,
          linethrough: !!properties.linethrough,
          textAlign: (properties.textAlign as any) || 'left',
          charSpacing: properties.charSpacing || 0,
          lineHeight: properties.lineHeight || 1.16,
          textBackgroundColor: properties.textBackgroundColor || 'transparent',
          fill: currentFill === 'transparent' ? '#000000' : currentFill,
          stroke: currentStroke || undefined,
          strokeWidth: properties.strokeWidth || 0,
        });
        ensureObjectId(iText, 'Artistic Text');
        if (isPowerClipEditing) {
          (iText as any).isPowerClipContent = true;
        }
        canvas.add(iText);
        canvas.setActiveObject(iText);
        iText.enterEditing();
        canvas.renderAll();
        onSelectTool('pick');
        socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
        return;
      }

      // 3-Point Curve Tool (Drag P1->P2 or Click P1->Click P2, then Move & Click P3 apex)
      if (activeTool === 'curve_3p') {
        const st = curve3pStepRef.current;
        if (!st) {
          const p1 = resolveSnappedPoint(pointer);
          curve3pStepRef.current = { p1, p2: p1, phase: 'chord' };
          setCurve3pOverlay({ p1, p2: p1, apex: null });
          setCadHud({ x: p1.x, y: p1.y, text: 'Drag or click end point P2' });
          return;
        }
        if (st.phase === 'chord') {
          let p2 = resolveSnappedPoint(pointer, st.p1);
          if (p2.x === pointer.x && p2.y === pointer.y && (evt.shiftKey || currentSnap?.enabled)) {
            p2 = applyPolarOrOrthoConstraint(st.p1, pointer, evt.shiftKey, !!currentSnap?.enabled, curZoom).point;
          }
          curve3pStepRef.current = { p1: st.p1, p2, phase: 'apex' };
          setCurve3pOverlay({ p1: st.p1, p2, apex: p2 });
          setCadHud({ x: p2.x, y: p2.y, text: 'Move to bow arc & click P3' });
          return;
        }
        if (st.phase === 'apex' && st.p2) {
          const apex = resolveSnappedPoint(pointer);
          const p1 = st.p1;
          const p2 = st.p2;
          const cx = 2 * apex.x - 0.5 * (p1.x + p2.x);
          const cy = 2 * apex.y - 0.5 * (p1.y + p2.y);
          const d = `M ${p1.x} ${p1.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${p2.x} ${p2.y}`;
          const pathObj = new fabric.Path(d, {
            fill: 'transparent',
            stroke: currentStroke || '#000000',
            strokeWidth: properties.strokeWidth || 2,
            strokeUniform: true,
            selectable: true,
          });
          (pathObj as any).isCurve = true;
          ensureObjectId(pathObj, '3-Point Curve');
          canvas.add(pathObj);
          canvas.setActiveObject(pathObj);
          curve3pStepRef.current = null;
          setCurve3pOverlay(null);
          setActivePolarGuide(null);
          setCadHud(null);
          canvas.requestRenderAll();
          onSelectTool('pick');
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
          return;
        }
      }

      // Interactive Bezier, Pen, B-Spline & Polyline Tools
      if (['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool)) {
        const prevNodes = bezierNodesRef.current;
        const prevNode = prevNodes.length > 0 ? prevNodes[prevNodes.length - 1] : null;
        const firstNode = prevNodes.length > 0 ? prevNodes[0] : null;
        const minCloseCount = activeTool === 'b_spline' ? 3 : 2;

        // Click on start node closes & finishes the curve automatically
        if (firstNode && prevNodes.length >= minCloseCount && Math.hypot(pointer.x - firstNode.x, pointer.y - firstNode.y) <= 10 / curZoom) {
          if (bezierPreviewRef.current) {
            canvas.remove(bezierPreviewRef.current);
            bezierPreviewRef.current = null;
          }
          const finalD =
            activeTool === 'b_spline'
              ? buildBSplinePathD(prevNodes, true)
              : buildPolylineOrBezierPathD(prevNodes, true);
          const closedPath = new fabric.Path(finalD, {
            fill: currentFill,
            stroke: currentStroke || '#000000',
            strokeWidth: properties.strokeWidth || 2,
            strokeUniform: true,
            selectable: true,
          });
          (closedPath as any).isCurve = true;
          const ntMap: Record<number, CurveNodeType> = {};
          prevNodes.forEach((n, idx) => {
            if (activeTool === 'b_spline' || n.outX !== undefined || n.inX !== undefined) ntMap[idx] = 'symmetrical';
          });
          (closedPath as any).nodeTypes = ntMap;
          const label =
            activeTool === 'b_spline' ? 'B-Spline' : activeTool === 'polyline' ? 'Polyline' : 'Bezier Curve';
          ensureObjectId(closedPath, label);
          canvas.add(closedPath);
          canvas.setActiveObject(closedPath);
          bezierNodesRef.current = [];
          isDraggingBezierHandleRef.current = false;
          setBezierPenPreview(null);
          setBezierRubberBand(null);
          setActivePolarGuide(null);
          setCadHud(null);
          canvas.requestRenderAll();
          onSelectTool('pick');
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
          return;
        }

        let nextPt = resolveSnappedPoint(pointer, prevNode);
        if (
          prevNode &&
          nextPt.x === pointer.x &&
          nextPt.y === pointer.y &&
          (evt.shiftKey || currentSnap?.enabled)
        ) {
          const polar = applyPolarOrOrthoConstraint(
            prevNode,
            pointer,
            evt.shiftKey,
            !!currentSnap?.enabled,
            curZoom
          );
          nextPt = polar.point;
        }

        bezierNodesRef.current.push({ x: nextPt.x, y: nextPt.y });
        isDraggingBezierHandleRef.current = activeTool === 'bezier' || activeTool === 'pen';
        setBezierPenPreview({
          nodes: [...bezierNodesRef.current],
          cursorPt: nextPt,
          closeHighlight: false,
        });

        const nodes = bezierNodesRef.current;
        if (nodes.length > 1) {
          const pathStr =
            activeTool === 'b_spline'
              ? buildBSplinePathD(nodes, false)
              : buildPolylineOrBezierPathD(nodes, false);
          if (bezierPreviewRef.current) canvas.remove(bezierPreviewRef.current);
          const pathObj = new fabric.Path(pathStr, {
            fill: 'transparent',
            stroke: currentStroke || '#000000',
            strokeWidth: properties.strokeWidth || 2,
            strokeUniform: true,
            selectable: true,
          });
          (pathObj as any).isCurve = true;
          const label =
            activeTool === 'b_spline' ? 'B-Spline' : activeTool === 'polyline' ? 'Polyline' : `Curve ${nodes.length}`;
          ensureObjectId(pathObj, label);
          bezierPreviewRef.current = pathObj;
          canvas.add(pathObj);
          canvas.requestRenderAll();
        }
        return;
      }

      // Interactive Crop Tool (Create marquee, Drag to Move, or Drag 8 Handles to Resize)
      if (activeTool === 'crop') {
        const curRegion = cropToolsConfigRef.current?.cropRegion;
        const tol = 10 / curZoom;
        if (curRegion) {
          const { x, y, width: w, height: h } = curRegion;
          const handles: { id: string; hx: number; hy: number }[] = [
            { id: 'nw', hx: x, hy: y },
            { id: 'n', hx: x + w / 2, hy: y },
            { id: 'ne', hx: x + w, hy: y },
            { id: 'e', hx: x + w, hy: y + h / 2 },
            { id: 'se', hx: x + w, hy: y + h },
            { id: 's', hx: x + w / 2, hy: y + h },
            { id: 'sw', hx: x, hy: y + h },
            { id: 'w', hx: x, hy: y + h / 2 },
          ];
          const hitHandle = handles.find((hd) => Math.hypot(pointer.x - hd.hx, pointer.y - hd.hy) <= tol);
          if (hitHandle) {
            cropDragRef.current = {
              mode: 'handle',
              handle: hitHandle.id,
              startX: pointer.x,
              startY: pointer.y,
              orig: { ...curRegion },
            };
            return;
          }
          if (pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h) {
            cropDragRef.current = {
              mode: 'move',
              startX: pointer.x,
              startY: pointer.y,
              orig: { ...curRegion },
            };
            return;
          }
        }
        const startPt = resolveSnappedPoint(pointer);
        cropDragRef.current = { mode: 'create', startX: startPt.x, startY: startPt.y };
        setCropDraftRect({ x: startPt.x, y: startPt.y, width: 1, height: 1 });
        return;
      }

      // Knife Tool (Start cut line)
      if (activeTool === 'knife') {
        const startPt = resolveSnappedPoint(pointer);
        knifeStartRef.current = startPt;
        setKnifePreviewLine({ x1: startPt.x, y1: startPt.y, x2: startPt.x, y2: startPt.y });
        return;
      }

      // Eraser Tool (Start interactive nib stroke)
      if (activeTool === 'eraser') {
        eraserTrailRef.current = [{ x: pointer.x, y: pointer.y }];
        setEraserTrailPreview([{ x: pointer.x, y: pointer.y }]);
        return;
      }

      // Shape drawing tools (Rectangle, Ellipse, Polygon, Star, 3-Point variants) with OSNAP start point
      if (['rectangle', 'ellipse', 'polygon', 'star', 'rect3p', 'ellipse3p'].includes(activeTool)) {
        const startPt = resolveSnappedPoint(pointer);
        isDrawingShapeRef.current = true;
        shapeStartRef.current = startPt;
        lastDrawnPointRef.current = startPt;

        let newShape: fabric.FabricObject;
        const sw = properties.strokeWidth || 1;

        if (activeTool === 'rectangle' || activeTool === 'rect3p') {
          newShape = new fabric.Rect({
            left: startPt.x - sw / 2,
            top: startPt.y - sw / 2,
            originX: 'left',
            originY: 'top',
            width: 1,
            height: 1,
            fill: currentFill,
            stroke: currentStroke || '#000000',
            strokeWidth: sw,
            strokeUniform: true,
            rx: properties.rx || 0,
            ry: properties.ry || 0,
          });
          ensureObjectId(newShape, 'Rectangle');
        } else if (activeTool === 'ellipse' || activeTool === 'ellipse3p') {
          newShape = new fabric.Ellipse({
            left: startPt.x - sw / 2,
            top: startPt.y - sw / 2,
            originX: 'left',
            originY: 'top',
            rx: 1,
            ry: 1,
            fill: currentFill,
            stroke: currentStroke || '#000000',
            strokeWidth: sw,
            strokeUniform: true,
          });
          ensureObjectId(newShape, 'Ellipse');
        } else if (activeTool === 'star') {
          const starPts = createStarPoints(5, 40, 20);
          newShape = new fabric.Polygon(starPts, {
            left: startPt.x - sw / 2,
            top: startPt.y - sw / 2,
            originX: 'left',
            originY: 'top',
            fill: currentFill === 'transparent' ? '#ffc20e' : currentFill,
            stroke: currentStroke || '#000000',
            strokeWidth: sw,
            strokeUniform: true,
          });
          ensureObjectId(newShape, 'Star');
        } else {
          const polyPts = createPolygonPoints(6, 40);
          newShape = new fabric.Polygon(polyPts, {
            left: startPt.x - sw / 2,
            top: startPt.y - sw / 2,
            originX: 'left',
            originY: 'top',
            fill: currentFill,
            stroke: currentStroke || '#000000',
            strokeWidth: sw,
            strokeUniform: true,
          });
          ensureObjectId(newShape, 'Polygon');
        }

        activeTempShapeRef.current = newShape;
        canvas.add(newShape);
        canvas.renderAll();
        return;
      }

      // Angular Dimension Tool (3-click: Vertex -> Ray 1 -> Ray 2)
      if (activeTool === 'angular_dimension') {
        const pt = resolveSnappedPoint(pointer, angularStepRef.current?.vertex || null);
        const curStep = angularStepRef.current;
        if (!curStep) {
          angularStepRef.current = { vertex: pt };
          setDimOverlay({ kind: 'angular', vx: pt.x, vy: pt.y, cursor: pt });
          return;
        }
        if (!curStep.p1) {
          if (Math.hypot(pt.x - curStep.vertex.x, pt.y - curStep.vertex.y) < 4) return;
          curStep.p1 = pt;
          setDimOverlay({
            kind: 'angular',
            vx: curStep.vertex.x,
            vy: curStep.vertex.y,
            p1: pt,
            cursor: pt,
          });
          return;
        }
        if (Math.hypot(pt.x - curStep.vertex.x, pt.y - curStep.vertex.y) < 4) return;
        const angObj = createAngularDimensionObject(
          curStep.vertex.x,
          curStep.vertex.y,
          curStep.p1.x,
          curStep.p1.y,
          pt.x,
          pt.y,
          {
            config: dimensionConfigRef.current,
            strokeColor: currentStroke || '#1e293b',
          }
        );
        if (isPowerClipEditing) {
          (angObj as any).isPowerClipContent = true;
        }
        canvas.add(angObj);
        canvas.setActiveObject(angObj);
        angularStepRef.current = null;
        setDimOverlay(null);
        setCadHud(null);
        canvas.requestRenderAll();
        onSelectTool('pick');
        socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (angObj as any).id, angObj.toJSON());
        onCanvasModified?.();
        return;
      }

      // 3-Point Callout Tool (Click Target -> Click Elbow -> Click Horizontal Shoulder)
      if (activeTool === 'callout') {
        const pt = resolveSnappedPoint(pointer, calloutStepRef.current?.p2 || calloutStepRef.current?.p1 || null);
        const curStep = calloutStepRef.current;
        if (!curStep) {
          calloutStepRef.current = { p1: pt };
          setDimOverlay({ kind: 'callout', p1: pt, cursor: pt });
          return;
        }
        if (!curStep.p2) {
          if (Math.hypot(pt.x - curStep.p1.x, pt.y - curStep.p1.y) < 4) return;
          curStep.p2 = pt;
          setDimOverlay({ kind: 'callout', p1: curStep.p1, p2: pt, cursor: pt });
          return;
        }
        const calloutObj = createCalloutObject(
          curStep.p1.x,
          curStep.p1.y,
          curStep.p2.x,
          curStep.p2.y,
          pt.x,
          'Callout',
          currentStroke || '#1e293b'
        );
        if (isPowerClipEditing) {
          (calloutObj as any).isPowerClipContent = true;
        }
        canvas.add(calloutObj);
        canvas.setActiveObject(calloutObj);
        calloutStepRef.current = null;
        setDimOverlay(null);
        setCadHud(null);
        canvas.requestRenderAll();
        onSelectTool('pick');
        socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (calloutObj as any).id, calloutObj.toJSON());
        onCanvasModified?.();
        return;
      }

      // Segment Dimension Tool: Click any shape/line segment to immediately dimension it (or drag manually)
      if (activeTool === 'segment_dimension') {
        const segHit = findNearestObjectSegment(
          canvas.getObjects(),
          pointer.x,
          pointer.y,
          pageConfigRef.current,
          16 / curZoom
        );
        if (segHit) {
          const segDim = createDimensionObject(segHit.x1, segHit.y1, segHit.x2, segHit.y2, {
            pageUnit: pageConfigRef.current.units,
            config: dimensionConfigRef.current,
            offset: 24,
            kind: 'segment',
            strokeColor: currentStroke || '#1e293b',
          });
          if (isPowerClipEditing) {
            (segDim as any).isPowerClipContent = true;
          }
          canvas.add(segDim);
          canvas.setActiveObject(segDim);
          setDimOverlay(null);
          setCadHud(null);
          canvas.requestRenderAll();
          onSelectTool('pick');
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (segDim as any).id, segDim.toJSON());
          onCanvasModified?.();
          return;
        }
      }

      // 2-Point Line, Parallel/HV/Segment Dimension, Connector with OSNAP start point
      if (['line2p', 'dimension', 'hv_dimension', 'segment_dimension', 'connector'].includes(activeTool)) {
        const startPt = resolveSnappedPoint(pointer);
        isDrawingShapeRef.current = true;
        shapeStartRef.current = startPt;
        lastDrawnPointRef.current = startPt;

        const isDimTool = ['dimension', 'hv_dimension', 'segment_dimension'].includes(activeTool);
        const tempLine = new fabric.Line([startPt.x, startPt.y, startPt.x, startPt.y], {
          stroke: isDimTool ? '#1e293b' : activeTool === 'connector' ? '#f97316' : currentStroke || '#000000',
          strokeWidth: properties.strokeWidth || 2,
          strokeUniform: true,
          strokeDashArray: isDimTool ? [4, 4] : [],
          opacity: activeTool === 'hv_dimension' ? 0.35 : 1,
        });
        activeTempShapeRef.current = tempLine;
        canvas.add(tempLine);
        canvas.renderAll();
        return;
      }

      // Archimedean Spiral Tool
      if (activeTool === 'spiral') {
        const startPt = resolveSnappedPoint(pointer);
        const spiralPath = createSpiralPath(3, 50);
        const spiralObj = new fabric.Path(spiralPath, {
          left: startPt.x,
          top: startPt.y,
          fill: 'transparent',
          stroke: currentStroke || '#000000',
          strokeWidth: properties.strokeWidth || 2,
        });
        ensureObjectId(spiralObj, 'Archimedean Spiral');
        canvas.add(spiralObj);
        canvas.setActiveObject(spiralObj);
        canvas.renderAll();
        onSelectTool('pick');
        socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (spiralObj as any).id, spiralObj.toJSON());
        return;
      }

      // Smart Fill Tool
      if (activeTool === 'smart_fill') {
        const target = opt.target;
        if (target) {
          target.set('fill', currentFill === 'transparent' ? '#00a651' : currentFill);
          canvas.renderAll();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Transparency Tool
      if (activeTool === 'transparency') {
        const target = opt.target;
        if (target) {
          const newOp = target.opacity === 0.5 ? 1 : 0.5;
          target.set('opacity', newOp);
          onUpdateProperties({ opacity: newOp });
          canvas.renderAll();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Drop Shadow Tool
      if (activeTool === 'shadow') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          target.set(
            'shadow',
            new fabric.Shadow({
              color: 'rgba(0,0,0,0.5)',
              blur: 15,
              offsetX: 8,
              offsetY: 8,
            })
          );
          (target as any).hasEffects = true;
          canvas.setActiveObject(target);
          canvas.requestRenderAll();
          onSelectionChange(target);
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Contour Tool
      if (activeTool === 'contour') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          applyContourToObject(canvas, target, 3, 0.14, currentStroke || '#0078d7').then(() => {
            onSelectionChange(target);
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          });
        }
        onSelectTool('pick');
        return;
      }

      // Blend Tool
      if (activeTool === 'blend') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          applyBlendToObject(canvas, target, null, 4, 22, 22).then(() => {
            onSelectionChange(target);
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          });
        }
        onSelectTool('pick');
        return;
      }

      // Distort Tool
      if (activeTool === 'distort') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          const distorted = applyDistortToObject(canvas, target, 'push_pull', 18);
          onSelectionChange(distorted);
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Envelope Tool
      if (activeTool === 'envelope') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          applyEnvelopeToObject(canvas, target, 'arc_top', 30);
          canvas.setActiveObject(target);
          onSelectionChange(target);
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        onSelectTool('pick');
        return;
      }

      // Extrude Tool
      if (activeTool === 'extrude') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          applyExtrudeToObject(canvas, target, 20, 20, currentStroke || '#334155').then(() => {
            onSelectionChange(target);
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          });
        }
        onSelectTool('pick');
        return;
      }

      // Block Shadow Tool
      if (activeTool === 'block_shadow') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          applyBlockShadowToObject(canvas, target, 16, 16, currentStroke || '#1e293b').then(() => {
            onSelectionChange(target);
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          });
        }
        onSelectTool('pick');
        return;
      }

      // Virtual Segment Delete Tool (Deletes only the clicked segment from a curve or shape edge)
      if (activeTool === 'virtual_segment_delete') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target && !(target as any).isDimension) {
          if (target.type === 'line') {
            canvas.remove(target);
            canvas.discardActiveObject();
            setDimOverlay(null);
            canvas.requestRenderAll();
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'remove');
            return;
          }

          if (target.type === 'path') {
            const workingPath = target as fabric.Path;
            const curveData = extractEditableCurveData(workingPath);
            const segHit = findClosestSegmentHit(curveData, pointer.x, pointer.y, 26 / curZoom);
            if (segHit) {
              const res = deleteSegmentFromPath(workingPath, segHit.seg.cmdIndex);
              if (res === 'delete_object') {
                canvas.remove(workingPath);
                canvas.discardActiveObject();
              } else if (res === 'modified') {
                workingPath.set({ fill: 'transparent' });
                workingPath.setCoords();
              }
              setDimOverlay(null);
              canvas.requestRenderAll();
              onCanvasModified?.();
              socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
            }
            return;
          }

          if (['rect', 'circle', 'ellipse', 'polygon'].includes(target.type || '')) {
            const converted = convertObjectToCurves(target);
            if (converted) {
              const curveData = extractEditableCurveData(converted);
              const segHit = findClosestSegmentHit(curveData, pointer.x, pointer.y, 26 / curZoom);
              if (segHit) {
                const idx = canvas.getObjects().indexOf(target);
                canvas.remove(target);
                if (idx >= 0) canvas.insertAt(idx, converted);
                else canvas.add(converted);
                const res = deleteSegmentFromPath(converted, segHit.seg.cmdIndex);
                if (res === 'delete_object') {
                  canvas.remove(converted);
                  canvas.discardActiveObject();
                } else {
                  converted.set({ fill: 'transparent' });
                  converted.setCoords();
                }
                setDimOverlay(null);
                canvas.requestRenderAll();
                onCanvasModified?.();
                socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
              }
            }
            return;
          }
        }
        return;
      }

      // Smooth Tool
      if (activeTool === 'smooth') {
        const target = resolveEventTarget(canvas, evt, opt);
        if (target && target.type === 'rect') {
          (target as any).set({ rx: 20, ry: 20 });
          canvas.requestRenderAll();
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        } else if (target && target.type === 'path') {
          smoothPathCorners(target as fabric.Path);
          canvas.requestRenderAll();
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        return;
      }
    },
    [activeTool, currentFill, currentStroke, properties, zoomLevel, pan, onZoomChange, onSelectTool, onUpdateProperties, onSampleColors, powerClipPicking, onPickPowerClipContainer, fitTextPicking, onPickFitTextPath, isPowerClipEditing, onSelectionChange, onCanvasModified, syncCurveOverlay]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const evt = opt.e as MouseEvent;
      const pointer = canvas.getScenePoint(evt);

      // Track cursor position for rulers and status bar
      setCursorPos({ x: pointer.x, y: pointer.y });
      onCursorMove({ x: pointer.x, y: pointer.y });

      // Panning is handled globally via window mousemove so panning stays smooth outside canvas bounds
      if (isPanningRef.current) {
        return;
      }

      const currentSnap = snapConfigRef.current;
      const curZoom = zoomLevelRef.current || 1;

      // Shape Tool (F10): Node / Handle / Direct Segment Dragging + Marquee + Hover Detection
      if (activeTool === 'shape') {
        const curPath = activeCurvePathRef.current;
        const curData = curveDataRef.current;
        const drag = curveDragRef.current;

        if (drag?.mode === 'marquee') {
          setCurveMarquee({
            x1: Math.min(drag.startX, pointer.x),
            y1: Math.min(drag.startY, pointer.y),
            x2: Math.max(drag.startX, pointer.x),
            y2: Math.max(drag.startY, pointer.y),
          });
          return;
        }

        if (drag && curPath && curData) {
          if (drag.mode === 'node') {
            let dx = pointer.x - drag.lastX;
            let dy = pointer.y - drag.lastY;
            const pNode = curData.nodes.find((n) => n.cmdIndex === drag.primaryCmdIndex);

            if (pNode && currentSnap?.enabled) {
              const candX = pNode.x + dx;
              const candY = pNode.y + dy;
              const osnap = findNearestOsnapPoint(
                candX,
                candY,
                canvas.getObjects(),
                curPath,
                pageConfigRef.current,
                currentSnap,
                curZoom
              );
              if (osnap) {
                dx = osnap.x - pNode.x;
                dy = osnap.y - pNode.y;
                setActiveSnapMarkers([
                  {
                    id: `node-osnap-${osnap.type}-${Math.round(osnap.x)}-${Math.round(osnap.y)}`,
                    x: osnap.x,
                    y: osnap.y,
                    type: osnap.type,
                    label: osnap.label,
                  },
                ]);
              } else {
                setActiveSnapMarkers([]);
              }
            } else {
              setActiveSnapMarkers([]);
            }

            if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
              moveCurveNodes(curPath, selectedNodeIndicesRef.current, dx, dy);
              drag.lastX += dx;
              drag.lastY += dy;
              drag.didMutate = true;
              if (pNode) {
                setCadHud({
                  x: pNode.x + dx,
                  y: pNode.y + dy,
                  text: `Node (${Math.round(pNode.x + dx)}, ${Math.round(pNode.y + dy)})`,
                });
              }
              syncCurveOverlay(curPath);
              canvas.requestRenderAll();
            }
            return;
          }

          if (drag.mode === 'handle') {
            let hx = pointer.x;
            let hy = pointer.y;
            if (evt.shiftKey) {
              const pNode = curData.nodes.find((n) => n.cmdIndex === drag.nodeCmdIndex);
              if (pNode) {
                const vx = hx - pNode.x;
                const vy = hy - pNode.y;
                const dist = Math.hypot(vx, vy);
                const angle = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
                hx = pNode.x + Math.cos(angle) * dist;
                hy = pNode.y + Math.sin(angle) * dist;
              }
            }
            moveCurveHandle(curPath, drag.nodeCmdIndex, drag.which, hx, hy);
            drag.didMutate = true;
            syncCurveOverlay(curPath);
            canvas.requestRenderAll();
            return;
          }

          if (drag.mode === 'segment') {
            const updatedIdx = dragCurveSegment(curPath, drag.cmdIndex, pointer.x, pointer.y, drag.t);
            drag.cmdIndex = updatedIdx;
            activeSegmentRef.current = { cmdIndex: updatedIdx, t: drag.t };
            drag.didMutate = true;
            syncCurveOverlay(curPath);
            canvas.requestRenderAll();
            return;
          }
        } else if (curPath && curData && evt.buttons === 0) {
          // Manual Add-Node Mode (or Alt hover) shows exact live preview dot on segment or open extension
          if (addNodeModeRef.current || evt.altKey) {
            const segHit = findClosestSegmentHit(curData, pointer.x, pointer.y, 16 / curZoom);
            if (segHit) {
              setAddNodeHoverPreview({ point: segHit.point });
              canvas.defaultCursor = 'crosshair';
            } else if (addNodeModeRef.current && !curData.isClosed && curData.nodes.length > 0) {
              const lastNode = curData.nodes[curData.nodes.length - 1];
              setAddNodeHoverPreview({
                point: { x: pointer.x, y: pointer.y },
                extendFrom: { x: lastNode.x, y: lastNode.y },
              });
              canvas.defaultCursor = 'crosshair';
            } else {
              setAddNodeHoverPreview(null);
              canvas.defaultCursor = 'default';
            }
            return;
          }

          setAddNodeHoverPreview((prev) => (prev ? null : prev));
          const hitTol = 10 / curZoom;
          let hoverHandleKey: string | null = null;
          let hoverNodeCmd: number | null = null;

          for (const node of curData.nodes) {
            if (node.outHandle && Math.hypot(node.outHandle.x - pointer.x, node.outHandle.y - pointer.y) <= hitTol) {
              hoverHandleKey = `${node.cmdIndex}-cp1`;
              break;
            }
            if (node.inHandle && Math.hypot(node.inHandle.x - pointer.x, node.inHandle.y - pointer.y) <= hitTol) {
              hoverHandleKey = `${node.cmdIndex}-cp2`;
              break;
            }
          }
          if (!hoverHandleKey) {
            for (const node of curData.nodes) {
              if (Math.hypot(node.x - pointer.x, node.y - pointer.y) <= hitTol) {
                hoverNodeCmd = node.cmdIndex;
                break;
              }
            }
          }
          const segHit = !hoverHandleKey && hoverNodeCmd === null ? findClosestSegmentHit(curData, pointer.x, pointer.y, hitTol) : null;
          canvas.defaultCursor = hoverHandleKey || hoverNodeCmd !== null ? 'pointer' : segHit ? 'move' : 'default';
          setCurveOverlay((prev) => {
            if (!prev) return prev;
            if (prev.hoverNodeCmd === hoverNodeCmd && prev.hoverHandleKey === hoverHandleKey) return prev;
            return { ...prev, hoverNodeCmd, hoverHandleKey };
          });
        }
        return;
      }

      // Active Shape / Line / Dimension Drawing with AutoCAD OSNAP + Polar/Ortho + Dynamic Input HUD
      if (isDrawingShapeRef.current && activeTempShapeRef.current) {
        const start = shapeStartRef.current;
        const shape = activeTempShapeRef.current;
        const isLinearTool = ['line2p', 'dimension', 'hv_dimension', 'segment_dimension', 'connector'].includes(activeTool);

        const osnap = currentSnap?.enabled
          ? findNearestOsnapPoint(
              pointer.x,
              pointer.y,
              canvas.getObjects(),
              shape,
              pageConfigRef.current,
              currentSnap,
              curZoom,
              isLinearTool ? start : null
            )
          : null;

        let endPt = { x: pointer.x, y: pointer.y };

        if (osnap) {
          endPt = { x: osnap.x, y: osnap.y };
          setActiveSnapMarkers([
            {
              id: `draw-osnap-${osnap.type}-${Math.round(osnap.x)}-${Math.round(osnap.y)}`,
              x: osnap.x,
              y: osnap.y,
              type: osnap.type,
              label: osnap.label,
            },
          ]);
          setActivePolarGuide(null);
        } else if (isLinearTool && activeTool !== 'hv_dimension') {
          const polar = applyPolarOrOrthoConstraint(
            start,
            pointer,
            evt.shiftKey,
            !!currentSnap?.enabled,
            curZoom
          );
          endPt = polar.point;
          setActiveSnapMarkers([]);
          setActivePolarGuide(polar.polarGuide);
        } else {
          setActiveSnapMarkers([]);
          setActivePolarGuide(null);
        }

        lastDrawnPointRef.current = endPt;

        if (shape.type === 'line') {
          (shape as fabric.Line).set({
            x2: endPt.x,
            y2: endPt.y,
          });
          if (activeTool === 'hv_dimension') {
            const dx = Math.abs(endPt.x - start.x);
            const dy = Math.abs(endPt.y - start.y);
            const isHoriz = dx >= dy;
            const measuredPx = isHoriz ? dx : dy;
            const formatted = formatDimensionValue(
              measuredPx,
              pageConfigRef.current.units,
              dimensionConfigRef.current
            );
            setDimOverlay({ kind: 'hv', x1: start.x, y1: start.y, x2: endPt.x, y2: endPt.y });
            setCadHud({
              x: endPt.x,
              y: endPt.y,
              text: `${isHoriz ? 'H' : 'V'}: ${formatted}`,
            });
          } else if (activeTool === 'dimension' || activeTool === 'segment_dimension') {
            const len = Math.hypot(endPt.x - start.x, endPt.y - start.y);
            let deg = Math.round(((Math.atan2(endPt.y - start.y, endPt.x - start.x) * 180) / Math.PI) * 10) / 10;
            if (deg < 0) deg += 360;
            const formatted = formatDimensionValue(
              len,
              pageConfigRef.current.units,
              dimensionConfigRef.current
            );
            setCadHud({ x: endPt.x, y: endPt.y, text: `${formatted}  ∠ ${deg}°` });
          } else {
            const len = Math.round(Math.hypot(endPt.x - start.x, endPt.y - start.y));
            let deg = Math.round(((Math.atan2(endPt.y - start.y, endPt.x - start.x) * 180) / Math.PI) * 10) / 10;
            if (deg < 0) deg += 360;
            setCadHud({ x: endPt.x, y: endPt.y, text: `${len} px  ∠ ${deg}°` });
          }
          canvas.requestRenderAll();
          return;
        }

        const rawW = Math.abs(endPt.x - start.x);
        const rawH = Math.abs(endPt.y - start.y);
        const isSquare = evt.shiftKey && !osnap;
        const w = isSquare ? Math.max(rawW, rawH) : rawW;
        const h = isSquare ? Math.max(rawW, rawH) : rawH;
        const left = endPt.x < start.x ? start.x - w : start.x;
        const top = endPt.y < start.y ? start.y - h : start.y;
        const sw = shape.strokeWidth || 0;

        if (shape.type === 'rect') {
          shape.set({
            left: left - sw / 2,
            top: top - sw / 2,
            width: Math.max(2, w),
            height: Math.max(2, h),
            originX: 'left',
            originY: 'top',
          });
        } else if (shape.type === 'ellipse') {
          shape.set({
            left: left - sw / 2,
            top: top - sw / 2,
            rx: Math.max(1, w / 2),
            ry: Math.max(1, h / 2),
            originX: 'left',
            originY: 'top',
          });
        } else if (shape.type === 'polygon') {
          const baseW = shape.width || 80;
          const baseH = shape.height || 80;
          const scaleX = Math.max(0.05, w / baseW);
          const scaleY = Math.max(0.05, h / baseH);
          const finalScale = evt.shiftKey ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
          shape.set({
            left: left - sw / 2,
            top: top - sw / 2,
            scaleX: finalScale,
            scaleY: finalScale,
            originX: 'left',
            originY: 'top',
          });
        }

        setCadHud({
          x: endPt.x,
          y: endPt.y,
          text: `${Math.round(w)} × ${Math.round(h)} px`,
        });
        canvas.requestRenderAll();
        return;
      }

      // 3-Point Curve live preview (chord drag or apex bow)
      if (activeTool === 'curve_3p' && curve3pStepRef.current) {
        const st = curve3pStepRef.current;
        const osnap = currentSnap?.enabled
          ? findNearestOsnapPoint(pointer.x, pointer.y, canvas.getObjects(), null, pageConfigRef.current, currentSnap, curZoom, st.p1)
          : null;
        let curPt = osnap ? { x: osnap.x, y: osnap.y } : { x: pointer.x, y: pointer.y };
        if (!osnap && st.phase === 'chord') {
          const polar = applyPolarOrOrthoConstraint(st.p1, pointer, evt.shiftKey, !!currentSnap?.enabled, curZoom);
          curPt = polar.point;
          setActivePolarGuide(polar.polarGuide);
        } else {
          setActivePolarGuide(null);
        }

        if (st.phase === 'chord') {
          st.p2 = curPt;
          setCurve3pOverlay({ p1: st.p1, p2: curPt, apex: null });
          const len = Math.round(Math.hypot(curPt.x - st.p1.x, curPt.y - st.p1.y));
          setCadHud({ x: curPt.x, y: curPt.y, text: `Chord: ${len} px (Release or click P2)` });
        } else if (st.phase === 'apex' && st.p2) {
          setCurve3pOverlay({ p1: st.p1, p2: st.p2, apex: curPt });
          setCadHud({ x: curPt.x, y: curPt.y, text: `Click P3 to set curve arc` });
        }
        return;
      }

      // Bezier / Pen / B-Spline / Polyline Handle Dragging + Multi-Point Rubber-Band Preview
      if (['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool) && bezierNodesRef.current.length > 0) {
        const nodes = bezierNodesRef.current;
        const lastNode = nodes[nodes.length - 1];

        if ((activeTool === 'bezier' || activeTool === 'pen') && isDraggingBezierHandleRef.current && evt.buttons === 1) {
          const dist = Math.hypot(pointer.x - lastNode.x, pointer.y - lastNode.y);
          if (dist > 3 / curZoom) {
            lastNode.outX = pointer.x;
            lastNode.outY = pointer.y;
            lastNode.inX = 2 * lastNode.x - pointer.x;
            lastNode.inY = 2 * lastNode.y - pointer.y;

            if (nodes.length > 1) {
              const pathStr = buildPolylineOrBezierPathD(nodes, false);
              if (bezierPreviewRef.current) canvas.remove(bezierPreviewRef.current);
              const pathObj = new fabric.Path(pathStr, {
                fill: 'transparent',
                stroke: currentStroke || '#000000',
                strokeWidth: properties.strokeWidth || 2,
                strokeUniform: true,
                selectable: true,
              });
              (pathObj as any).isCurve = true;
              ensureObjectId(pathObj, `Curve ${nodes.length}`);
              bezierPreviewRef.current = pathObj;
              canvas.add(pathObj);
              canvas.requestRenderAll();
            }
          }
          setBezierPenPreview({
            nodes: nodes.map((n) => ({ ...n })),
            cursorPt: null,
            closeHighlight: false,
          });
          setCadHud({
            x: pointer.x,
            y: pointer.y,
            text: `Bezier Handle (${Math.round(dist)} px)`,
          });
          return;
        }

        if (evt.buttons === 0 || activeTool === 'b_spline' || activeTool === 'polyline') {
          const osnap = currentSnap?.enabled
            ? findNearestOsnapPoint(
                pointer.x,
                pointer.y,
                canvas.getObjects(),
                bezierPreviewRef.current,
                pageConfigRef.current,
                currentSnap,
                curZoom,
                lastNode
              )
            : null;

          let endPt = { x: pointer.x, y: pointer.y };
          if (osnap) {
            endPt = { x: osnap.x, y: osnap.y };
            setHoverSnapMarker({
              id: `bezier-hover-${osnap.type}-${Math.round(osnap.x)}-${Math.round(osnap.y)}`,
              x: osnap.x,
              y: osnap.y,
              type: osnap.type,
              label: osnap.label,
            });
            setActivePolarGuide(null);
          } else {
            const polar = applyPolarOrOrthoConstraint(
              lastNode,
              pointer,
              evt.shiftKey,
              !!currentSnap?.enabled,
              curZoom
            );
            endPt = polar.point;
            setHoverSnapMarker(null);
            setActivePolarGuide(polar.polarGuide);
          }

          const firstNode = nodes[0];
          const minCloseCount = activeTool === 'b_spline' ? 3 : 2;
          const closeHighlight =
            nodes.length >= minCloseCount && Math.hypot(endPt.x - firstNode.x, endPt.y - firstNode.y) <= 10 / curZoom;
          if (closeHighlight) {
            endPt = { x: firstNode.x, y: firstNode.y };
          }

          setBezierPenPreview({
            nodes: nodes.map((n) => ({ ...n })),
            cursorPt: endPt,
            closeHighlight,
          });
          setBezierRubberBand({ x1: lastNode.x, y1: lastNode.y, x2: endPt.x, y2: endPt.y });
          const len = Math.round(Math.hypot(endPt.x - lastNode.x, endPt.y - lastNode.y));
          let deg = Math.round(((Math.atan2(endPt.y - lastNode.y, endPt.x - lastNode.x) * 180) / Math.PI) * 10) / 10;
          if (deg < 0) deg += 360;
          setCadHud({ x: endPt.x, y: endPt.y, text: `${len} px  ∠ ${deg}°` });
          return;
        }
      } else {
        setBezierRubberBand((prev) => (prev ? null : prev));
        setBezierPenPreview((prev) => (prev ? null : prev));
      }

      // Multi-step Angular Dimension live preview
      if (activeTool === 'angular_dimension' && angularStepRef.current) {
        const st = angularStepRef.current;
        const osnap = currentSnap?.enabled
          ? findNearestOsnapPoint(pointer.x, pointer.y, canvas.getObjects(), null, pageConfigRef.current, currentSnap, curZoom, st.vertex)
          : null;
        const curPt = osnap ? { x: osnap.x, y: osnap.y } : { x: pointer.x, y: pointer.y };
        setDimOverlay({
          kind: 'angular',
          vx: st.vertex.x,
          vy: st.vertex.y,
          p1: st.p1,
          cursor: curPt,
        });
        if (st.p1) {
          const a1 = Math.atan2(st.p1.y - st.vertex.y, st.p1.x - st.vertex.x);
          const a2 = Math.atan2(curPt.y - st.vertex.y, curPt.x - st.vertex.x);
          let delta = a2 - a1;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          const deg = (Math.abs(delta) * 180) / Math.PI;
          setCadHud({ x: curPt.x, y: curPt.y, text: `Angle: ${deg.toFixed(1)}°` });
        } else {
          const r = Math.round(Math.hypot(curPt.x - st.vertex.x, curPt.y - st.vertex.y));
          setCadHud({ x: curPt.x, y: curPt.y, text: `Ray 1 (${r} px)` });
        }
        return;
      }

      // Multi-step 3-Point Callout live preview
      if (activeTool === 'callout' && calloutStepRef.current) {
        const st = calloutStepRef.current;
        const osnap = currentSnap?.enabled
          ? findNearestOsnapPoint(pointer.x, pointer.y, canvas.getObjects(), null, pageConfigRef.current, currentSnap, curZoom, st.p2 || st.p1)
          : null;
        const curPt = osnap ? { x: osnap.x, y: osnap.y } : { x: pointer.x, y: pointer.y };
        setDimOverlay({
          kind: 'callout',
          p1: st.p1,
          p2: st.p2,
          cursor: curPt,
        });
        setCadHud({
          x: curPt.x,
          y: curPt.y,
          text: st.p2 ? 'Click to place callout label' : 'Click elbow point',
        });
        return;
      }

      // Crop Tool interactive drag/move/resize
      if (activeTool === 'crop' && cropDragRef.current) {
        const drag = cropDragRef.current;
        if (drag.mode === 'create') {
          const x = Math.min(drag.startX, pointer.x);
          const y = Math.min(drag.startY, pointer.y);
          const w = Math.max(2, Math.abs(pointer.x - drag.startX));
          const h = Math.max(2, Math.abs(pointer.y - drag.startY));
          setCropDraftRect({ x, y, width: w, height: h });
          setCadHud({ x: pointer.x, y: pointer.y, text: `Crop: ${Math.round(w)} × ${Math.round(h)} px` });
        } else if (drag.mode === 'move') {
          const nextRegion: CropRegion = {
            x: drag.orig.x + (pointer.x - drag.startX),
            y: drag.orig.y + (pointer.y - drag.startY),
            width: drag.orig.width,
            height: drag.orig.height,
          };
          onUpdateCropToolsConfig?.({ cropRegion: nextRegion });
          setCadHud({ x: pointer.x, y: pointer.y, text: `X: ${Math.round(nextRegion.x)}, Y: ${Math.round(nextRegion.y)}` });
        } else if (drag.mode === 'handle') {
          const dx = pointer.x - drag.startX;
          const dy = pointer.y - drag.startY;
          let { x, y, width, height } = drag.orig;
          if (drag.handle.includes('w')) {
            const newX = Math.min(x + width - 10, x + dx);
            width = x + width - newX;
            x = newX;
          }
          if (drag.handle.includes('e')) {
            width = Math.max(10, width + dx);
          }
          if (drag.handle.includes('n')) {
            const newY = Math.min(y + height - 10, y + dy);
            height = y + height - newY;
            y = newY;
          }
          if (drag.handle.includes('s')) {
            height = Math.max(10, height + dy);
          }
          const nextRegion: CropRegion = { x, y, width, height };
          onUpdateCropToolsConfig?.({ cropRegion: nextRegion });
          setCadHud({ x: pointer.x, y: pointer.y, text: `${Math.round(width)} × ${Math.round(height)} px` });
        }
        return;
      }

      // Knife Tool live cut line preview
      if (activeTool === 'knife' && knifeStartRef.current) {
        const start = knifeStartRef.current;
        const polar = applyPolarOrOrthoConstraint(start, pointer, evt.shiftKey, !!currentSnap?.enabled, curZoom);
        const endPt = polar.point;
        setKnifePreviewLine({ x1: start.x, y1: start.y, x2: endPt.x, y2: endPt.y });
        setActivePolarGuide(polar.polarGuide);
        const len = Math.round(Math.hypot(endPt.x - start.x, endPt.y - start.y));
        let deg = Math.round(((Math.atan2(endPt.y - start.y, endPt.x - start.x) * 180) / Math.PI) * 10) / 10;
        if (deg < 0) deg += 360;
        setCadHud({ x: endPt.x, y: endPt.y, text: `Cut: ${len} px  ∠ ${deg}°` });
        return;
      }

      // Eraser Tool live nib tracking & stroke preview
      if (activeTool === 'eraser') {
        setEraserCursorPt({ x: pointer.x, y: pointer.y });
        if (eraserTrailRef.current && evt.buttons === 1) {
          const prev = eraserTrailRef.current[eraserTrailRef.current.length - 1];
          if (!prev || Math.hypot(pointer.x - prev.x, pointer.y - prev.y) >= 2.5) {
            eraserTrailRef.current.push({ x: pointer.x, y: pointer.y });
            setEraserTrailPreview([...eraserTrailRef.current]);
          }
          return;
        }
      }

      // Segment Dimension & Virtual Segment Delete live segment hover highlight
      if ((activeTool === 'segment_dimension' || activeTool === 'virtual_segment_delete') && evt.buttons === 0) {
        const segHit = findNearestObjectSegment(
          canvas.getObjects(),
          pointer.x,
          pointer.y,
          pageConfigRef.current,
          20 / curZoom
        );
        if (segHit) {
          const label = formatDimensionValue(
            segHit.lengthPx,
            pageConfigRef.current.units,
            dimensionConfigRef.current
          );
          setDimOverlay({
            kind: 'segment',
            x1: segHit.x1,
            y1: segHit.y1,
            x2: segHit.x2,
            y2: segHit.y2,
            label,
          });
          setCadHud({
            x: pointer.x,
            y: pointer.y,
            text: activeTool === 'virtual_segment_delete' ? `Delete Segment (${label})` : `Segment: ${label} (Click)`,
          });
        } else {
          setDimOverlay((prev) => (prev?.kind === 'segment' ? null : prev));
          setCadHud((prev) => (prev ? null : prev));
        }
      }

      // Hover AutoCAD OSNAP Marker in Pick Mode AND Drawing Tools (before click)
      const hoverSnapTools: ToolType[] = [
        'pick',
        'freehand_pick',
        'line2p',
        'rectangle',
        'rect3p',
        'ellipse',
        'ellipse3p',
        'polygon',
        'star',
        'bezier',
        'pen',
        'b_spline',
        'polyline',
        'curve_3p',
        'dimension',
        'hv_dimension',
        'angular_dimension',
        'segment_dimension',
        'callout',
        'connector',
        'text',
        'spiral',
      ];

      if (
        hoverSnapTools.includes(activeTool) &&
        currentSnap?.enabled &&
        !grabbedPointRef.current &&
        evt.buttons === 0
      ) {
        const osnap = findNearestOsnapPoint(
          pointer.x,
          pointer.y,
          canvas.getObjects(),
          null,
          pageConfigRef.current,
          currentSnap,
          curZoom
        );

        if (osnap) {
          setHoverSnapMarker({
            id: `hover-${osnap.type}-${Math.round(osnap.x)}-${Math.round(osnap.y)}`,
            x: osnap.x,
            y: osnap.y,
            type: osnap.type,
            label: osnap.label,
          });
        } else {
          setHoverSnapMarker((prev) => (prev ? null : prev));
        }
      } else {
        setHoverSnapMarker((prev) => (prev ? null : prev));
      }

      // Eyedropper live hover preview of Fill & Stroke colors
      if (activeTool === 'eyedropper' && evt.buttons === 0) {
        const subTarget = opt?.subTargets && opt.subTargets.length > 0 ? opt.subTargets[0] : null;
        const target = resolveEventTarget(canvas, evt, opt);
        if (target) {
          const { fill, stroke } = extractObjectColors(target, canvas, evt, subTarget);
          const fillLabel = fill === 'transparent' ? 'None' : fill.toUpperCase();
          const strokeLabel = stroke === 'transparent' ? 'None' : stroke.toUpperCase();
          setCadHud({
            x: pointer.x,
            y: pointer.y,
            text: `F: ${fillLabel}  S: ${strokeLabel}`,
            swatches: [fill, stroke],
          });
        } else {
          setCadHud((prev) => (prev ? null : prev));
        }
        setActivePolarGuide((prev) => (prev ? null : prev));
        return;
      }

      if (evt.buttons === 0 && activeTool !== 'segment_dimension' && activeTool !== 'virtual_segment_delete') {
        setCadHud((prev) => (prev ? null : prev));
        setActivePolarGuide((prev) => (prev ? null : prev));
      } else if (evt.buttons === 0) {
        setActivePolarGuide((prev) => (prev ? null : prev));
      }
    },
    [onCursorMove, activeTool]
  );

  const handleMouseUp = useCallback(
    (opt: any) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      grabbedPointRef.current = null;
      dragOriginRef.current = null;
      isDraggingBezierHandleRef.current = false;
      setActiveSnapLines([]);
      setActiveSnapMarkers([]);
      setActivePolarGuide(null);
      setCadHud(null);

      // Finalize Shape Tool node/handle/segment/marquee operation
      if (activeTool === 'shape' && curveDragRef.current) {
        const drag = curveDragRef.current;
        const curPath = activeCurvePathRef.current;
        const curData = curveDataRef.current;
        curveDragRef.current = null;

        if (drag.mode === 'marquee') {
          const evt = opt.e as MouseEvent;
          const endPt = canvas.getScenePoint(evt);
          const minX = Math.min(drag.startX, endPt.x);
          const maxX = Math.max(drag.startX, endPt.x);
          const minY = Math.min(drag.startY, endPt.y);
          const maxY = Math.max(drag.startY, endPt.y);
          const isDragBox = maxX - minX > 4 || maxY - minY > 4;

          if (isDragBox) {
            let targetPath = curPath;
            let inside = curData
              ? curData.nodes
                  .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
                  .map((n) => n.cmdIndex)
              : [];

            // If no active curve or no nodes of active curve inside box, auto-find curve under window box
            if (inside.length === 0) {
              const allPaths = [...canvas.getObjects()]
                .reverse()
                .filter((o): o is fabric.Path => o.type === 'path' && o.visible !== false);
              for (const candidatePath of allPaths) {
                const cData = extractEditableCurveData(candidatePath);
                const cInside = cData.nodes
                  .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
                  .map((n) => n.cmdIndex);
                if (cInside.length > 0) {
                  targetPath = candidatePath;
                  inside = cInside;
                  canvas.setActiveObject(candidatePath);
                  onSelectionChange(candidatePath);
                  break;
                }
              }
            }

            if (targetPath) {
              activeSegmentRef.current = null;
              if (evt.shiftKey && targetPath === curPath) {
                const merged = new Set([...selectedNodeIndicesRef.current, ...inside]);
                selectedNodeIndicesRef.current = Array.from(merged);
              } else {
                selectedNodeIndicesRef.current = inside;
              }
              syncCurveOverlay(targetPath);
            }
          } else {
            // Simple click without drag: switch clicked object, extend open curve in Add Point mode, or clear node selection
            const clicked = drag.clickedTarget;
            if (clicked && clicked !== curPath) {
              canvas.setActiveObject(clicked);
              onSelectionChange(clicked);
              if (clicked.type === 'path') {
                selectedNodeIndicesRef.current = [];
                activeSegmentRef.current = null;
                syncCurveOverlay(clicked as fabric.Path);
              } else {
                syncCurveOverlay(null);
              }
              canvas.requestRenderAll();
            } else if (addNodeModeRef.current && curPath && curData && !curData.isClosed) {
              const currentSnap = snapConfigRef.current;
              const curZoom = zoomLevelRef.current || 1;
              const osnap = currentSnap?.enabled
                ? findNearestOsnapPoint(
                    endPt.x,
                    endPt.y,
                    canvas.getObjects(),
                    null,
                    pageConfigRef.current,
                    currentSnap,
                    curZoom
                  )
                : null;
              const pt = osnap ? { x: osnap.x, y: osnap.y } : { x: endPt.x, y: endPt.y };
              const addedIdx = extendOpenCurveToPoint(curPath, pt.x, pt.y, true);
              if (addedIdx !== null) {
                selectedNodeIndicesRef.current = [addedIdx];
                activeSegmentRef.current = null;
                setAddNodeHoverPreview(null);
                syncCurveOverlay(curPath);
                canvas.requestRenderAll();
                onCanvasModified?.();
                socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
              }
            } else if (!evt.shiftKey && curPath) {
              selectedNodeIndicesRef.current = [];
              activeSegmentRef.current = null;
              syncCurveOverlay(curPath);
            }
          }

          setCurveMarquee(null);
          return;
        }

        if (drag.didMutate && curPath) {
          syncCurveOverlay(curPath);
          canvas.requestRenderAll();
          onCanvasModified?.();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
        return;
      }

      // Finalize interactive Crop Region drag/move/resize
      if (activeTool === 'crop' && cropDragRef.current) {
        const drag = cropDragRef.current;
        cropDragRef.current = null;
        const evt = opt.e as MouseEvent;
        const endPt = canvas.getScenePoint(evt);
        if (drag.mode === 'create') {
          const left = Math.min(drag.startX, endPt.x);
          const top = Math.min(drag.startY, endPt.y);
          const width = Math.abs(endPt.x - drag.startX);
          const height = Math.abs(endPt.y - drag.startY);
          setCropDraftRect(null);
          if (width >= 10 && height >= 10) {
            onUpdateCropToolsConfig?.({ cropRegion: { x: left, y: top, width, height } });
          } else {
            onUpdateCropToolsConfig?.({ cropRegion: null });
          }
        }
        return;
      }

      // Finalize Knife Tool slice across all intersected objects
      if (activeTool === 'knife' && knifeStartRef.current) {
        const start = knifeStartRef.current;
        knifeStartRef.current = null;
        const evt = opt.e as MouseEvent;
        const pointer = canvas.getScenePoint(evt);
        const curZoom = zoomLevelRef.current || 1;
        const polar = applyPolarOrOrthoConstraint(start, pointer, evt.shiftKey, !!snapConfigRef.current?.enabled, curZoom);
        const endPt = polar.point;
        setKnifePreviewLine(null);
        setActivePolarGuide(null);
        if (Math.hypot(endPt.x - start.x, endPt.y - start.y) >= 8) {
          const targets = [...canvas.getObjects()].filter(
            (o) => o.visible !== false && !(o as any).excludeFromExport && !(o as any).isDimension
          );
          const autoGap = cropToolsConfigRef.current?.knifeAutoGap ?? false;
          Promise.all(
            targets.map((obj) => sliceObjectByLineSegment(canvas, obj, start.x, start.y, endPt.x, endPt.y, autoGap))
          ).then(
            (results) => {
              const slicedPieces = results.filter((r): r is fabric.FabricObject[] => Array.isArray(r) && r.length > 0);
              if (slicedPieces.length > 0) {
                canvas.setActiveObject(slicedPieces[0][0]);
                onSelectionChange(slicedPieces[0][0]);
                canvas.requestRenderAll();
                onCanvasModified?.();
                socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
              }
            }
          );
        }
        return;
      }

      // Finalize Eraser Tool stroke
      if (activeTool === 'eraser' && eraserTrailRef.current) {
        const pts = [...eraserTrailRef.current];
        eraserTrailRef.current = null;
        setEraserTrailPreview(null);
        const cfg = cropToolsConfigRef.current || { eraserSize: 18, eraserNib: 'round', knifeAutoGap: false, cropRegion: null };
        applyEraserStrokeToObjects(canvas, pts, cfg.eraserSize, cfg.eraserNib).then((changed) => {
          if (changed) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          }
        });
        return;
      }

      // 3-Point Curve mouse:up after dragging chord P1 -> P2
      if (activeTool === 'curve_3p' && curve3pStepRef.current && curve3pStepRef.current.phase === 'chord') {
        const st = curve3pStepRef.current;
        const p2 = st.p2 || st.p1;
        if (Math.hypot(p2.x - st.p1.x, p2.y - st.p1.y) >= 6) {
          curve3pStepRef.current = { p1: st.p1, p2, phase: 'apex' };
          setCurve3pOverlay({ p1: st.p1, p2, apex: p2 });
          setCadHud({ x: p2.x, y: p2.y, text: 'Move to bow arc & click P3' });
        }
        return;
      }

      if (isDrawingShapeRef.current && activeTempShapeRef.current) {
        isDrawingShapeRef.current = false;
        const tempObj = activeTempShapeRef.current;
        const start = shapeStartRef.current;
        const evt = opt.e as MouseEvent;
        const rawPointer = canvas.getScenePoint(evt);
        const endPt = lastDrawnPointRef.current || rawPointer;
        lastDrawnPointRef.current = null;

        if (activeTool === 'dimension' || activeTool === 'hv_dimension' || activeTool === 'segment_dimension') {
          canvas.remove(tempObj);
          activeTempShapeRef.current = null;
          setDimOverlay(null);
          if (Math.hypot(endPt.x - start.x, endPt.y - start.y) < 4) {
            canvas.renderAll();
            return;
          }
          const dimObj =
            activeTool === 'hv_dimension'
              ? createHVDimensionObject(start.x, start.y, endPt.x, endPt.y, {
                  pageUnit: pageConfigRef.current.units,
                  config: dimensionConfigRef.current,
                  strokeColor: currentStroke || '#1e293b',
                })
              : createDimensionObject(start.x, start.y, endPt.x, endPt.y, {
                  pageUnit: pageConfigRef.current.units,
                  config: dimensionConfigRef.current,
                  offset: activeTool === 'segment_dimension' ? 24 : 0,
                  kind: activeTool === 'segment_dimension' ? 'segment' : 'parallel',
                  strokeColor: currentStroke || '#1e293b',
                });
          if (isPowerClipEditing) {
            (dimObj as any).isPowerClipContent = true;
          }
          canvas.add(dimObj);
          canvas.setActiveObject(dimObj);
          canvas.renderAll();
          onSelectTool('pick');
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (dimObj as any).id, dimObj.toJSON());
          onCanvasModified?.();
          return;
        }

        if (activeTool === 'connector') {
          canvas.remove(tempObj);
          const connObj = createConnectorObject(start.x, start.y, endPt.x, endPt.y);
          canvas.add(connObj);
          canvas.setActiveObject(connObj);
          activeTempShapeRef.current = null;
          canvas.renderAll();
          onSelectTool('pick');
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (connObj as any).id, connObj.toJSON());
          onCanvasModified?.();
          return;
        }

        const dragDist = Math.hypot(endPt.x - start.x, endPt.y - start.y);
        const sw = tempObj.strokeWidth || 0;
        if (dragDist < 6) {
          if (tempObj.type === 'rect') {
            tempObj.set({
              left: start.x - sw / 2,
              top: start.y - sw / 2,
              width: 160,
              height: 100,
              originX: 'left',
              originY: 'top',
            });
          } else if (tempObj.type === 'ellipse') {
            tempObj.set({
              left: start.x - sw / 2,
              top: start.y - sw / 2,
              rx: 60,
              ry: 40,
              originX: 'left',
              originY: 'top',
            });
          } else if (tempObj.type === 'polygon') {
            tempObj.set({
              left: start.x - sw / 2,
              top: start.y - sw / 2,
              originX: 'left',
              originY: 'top',
            });
          }
        } else {
          tempObj.set({
            originX: 'left',
            originY: 'top',
          });
        }

        tempObj.setCoords();
        if (isPowerClipEditing) {
          (tempObj as any).isPowerClipContent = true;
        }
        canvas.setActiveObject(tempObj);
        activeTempShapeRef.current = null;
        canvas.renderAll();

        // Switch back to pick tool for seamless drafting workflow
        onSelectTool('pick');

        socketService.sendCanvasUpdate(canvas.toJSON(), 'add', (tempObj as any).id, tempObj.toJSON());
        onCanvasModified?.();
      }
    },
    [activeTool, onSelectTool, isPowerClipEditing, onCanvasModified, onSelectionChange]
  );

  // Double-click handler: PowerClip Edit mode, Bezier finish, or Page Setup
  const handleDoubleClick = useCallback(
    (opt?: any) => {
      const canvas = fabricRef.current;

      // Shape Tool Double-Click:
      // - Double-click node -> Delete node
      // - Double-click segment -> Add node
      // - Double-click non-curve shape -> Convert to Curves
      if (activeTool === 'shape' && canvas && opt?.e) {
        const pointer = canvas.getScenePoint(opt.e as MouseEvent);
        const curZoom = zoomLevelRef.current || 1;
        const hitTol = 10 / curZoom;
        const curPath = activeCurvePathRef.current;
        const curData = curveDataRef.current;

        if (curPath && curData) {
          const hitNode = curData.nodes.find((n) => Math.hypot(n.x - pointer.x, n.y - pointer.y) <= hitTol);
          if (hitNode) {
            const removed = deleteNodesFromPath(curPath, [hitNode.cmdIndex]);
            if (removed) {
              selectedNodeIndicesRef.current = [];
              activeSegmentRef.current = null;
              syncCurveOverlay(curPath);
              canvas.requestRenderAll();
              onCanvasModified?.();
              socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
            }
            return;
          }

          const hitSeg = findClosestSegmentHit(curData, pointer.x, pointer.y, hitTol);
          if (hitSeg) {
            const inserted = addNodeOnPath(curPath, hitSeg.seg.cmdIndex, hitSeg.t);
            if (inserted !== null) {
              selectedNodeIndicesRef.current = [inserted];
              activeSegmentRef.current = null;
              syncCurveOverlay(curPath);
              canvas.requestRenderAll();
              onCanvasModified?.();
              socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
            }
            return;
          }
        } else {
          const hitTarget = resolveEventTarget(canvas, opt.e, opt);
          if (hitTarget && hitTarget.type !== 'path' && onConvertToCurves) {
            canvas.setActiveObject(hitTarget);
            onSelectionChange(hitTarget);
            onConvertToCurves();
            return;
          }
        }
      }

      // Look for PowerClip target: opt.target, opt.subTargets, or current activeObject
      let target: any = opt?.target || canvas?.getActiveObject();
      if (target?.group && (target.group.isPowerClip || target.group.customType === 'powerclip')) {
        target = target.group;
      }
      if (opt?.subTargets && opt.subTargets.length > 0) {
        for (const st of opt.subTargets) {
          if (st?.group && (st.group.isPowerClip || st.group.customType === 'powerclip')) {
            target = st.group;
            break;
          }
        }
      }

      const isPC = target && (target.isPowerClip || target.customType === 'powerclip');
      if (isPC && onPowerClipEdit) {
        onPowerClipEdit(target);
        return;
      }

      // Double-clicking on empty canvas while editing finishes PowerClip edit mode
      if (isPowerClipEditing && (!opt || !opt.target) && onPowerClipFinish) {
        onPowerClipFinish();
        return;
      }

      // Double-clicking on empty canvas while editing a Group finishes current Group Edit level
      if (isGroupEditing && (!opt || !opt.target) && onGroupEditFinish) {
        onGroupEditFinish();
        return;
      }

      // Double-clicking a regular Group with Pick tool enters Group Editing mode (supports nested groups!)
      if (
        (activeTool === 'pick' || activeTool === 'freehand_pick') &&
        target &&
        target.type === 'group' &&
        !isPC &&
        !(target as any).isTextOnPath &&
        (target as any).customType !== 'qrcode' &&
        onGroupEditEnter
      ) {
        const subTarget = opt?.subTargets && opt.subTargets.length > 0 ? opt.subTargets[0] : null;
        onGroupEditEnter(target, subTarget);
        return;
      }

      if (['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool) && bezierNodesRef.current.length > 0) {
        if (bezierPreviewRef.current && canvas) {
          const obj = bezierPreviewRef.current;
          if (currentFill && currentFill !== 'transparent') {
            obj.set('fill', currentFill);
          }
          const ntMap: Record<number, CurveNodeType> = {};
          bezierNodesRef.current.forEach((n, idx) => {
            if (activeTool === 'b_spline' || n.outX !== undefined || n.inX !== undefined) ntMap[idx] = 'symmetrical';
          });
          (obj as any).nodeTypes = ntMap;
          (obj as any).isCurve = true;
          canvas.setActiveObject(obj);
          canvas.requestRenderAll();
        }
        bezierNodesRef.current = [];
        isDraggingBezierHandleRef.current = false;
        bezierPreviewRef.current = null;
        setBezierPenPreview(null);
        setBezierRubberBand(null);
        setActivePolarGuide(null);
        setCadHud(null);
        onSelectTool('pick');
        onCanvasModified?.();
        if (canvas) {
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
        }
        return;
      }

      // Double-clicking inside an active Crop Region applies the crop immediately (CorelDRAW standard!)
      if (activeTool === 'crop' && cropToolsConfigRef.current?.cropRegion && canvas && opt?.e) {
        const pt = canvas.getScenePoint(opt.e as MouseEvent);
        const r = cropToolsConfigRef.current.cropRegion;
        if (pt.x >= r.x && pt.x <= r.x + r.width && pt.y >= r.y && pt.y <= r.y + r.height) {
          applyCropRegionToCanvas(r);
          return;
        }
      }

      // In CorelDRAW: double-clicking empty page or desk in pick mode opens Page Setup!
      if ((activeTool === 'pick' || activeTool === 'pan') && (!opt || !opt.target) && onOpenPageSetup) {
        onOpenPageSetup();
      }
    },
    [
      onPowerClipEdit,
      isPowerClipEditing,
      onPowerClipFinish,
      isGroupEditing,
      onGroupEditEnter,
      onGroupEditFinish,
      activeTool,
      onSelectTool,
      onOpenPageSetup,
      currentFill,
      onCanvasModified,
      onConvertToCurves,
      onSelectionChange,
      syncCurveOverlay,
      applyCropRegionToCanvas,
    ]
  );

  // Keyboard shortcut listener + Shift (Ortho F8) tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shiftKeyRef.current = e.shiftKey;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const canvas = fabricRef.current;
      if (!canvas) return;
      const activeForTextCheck = canvas.getActiveObject();
      if (activeForTextCheck && (activeForTextCheck as any).isEditing) {
        return;
      }

      if (e.key === 'Escape') {
        if (['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool) && bezierNodesRef.current.length > 0) {
          bezierNodesRef.current = [];
          isDraggingBezierHandleRef.current = false;
          bezierPreviewRef.current = null;
          setBezierPenPreview(null);
          setBezierRubberBand(null);
          setActivePolarGuide(null);
          setCadHud(null);
          onSelectTool('pick');
        } else if (activeTool === 'curve_3p' && curve3pStepRef.current) {
          curve3pStepRef.current = null;
          setCurve3pOverlay(null);
          setActivePolarGuide(null);
          setCadHud(null);
          onSelectTool('pick');
        } else if (activeTool === 'angular_dimension' && angularStepRef.current) {
          angularStepRef.current = null;
          setDimOverlay(null);
          setCadHud(null);
          onSelectTool('pick');
        } else if (activeTool === 'callout' && calloutStepRef.current) {
          calloutStepRef.current = null;
          setDimOverlay(null);
          setCadHud(null);
          onSelectTool('pick');
        } else if (activeTool === 'shape' && addNodeModeRef.current) {
          addNodeModeRef.current = false;
          setAddNodeHoverPreview(null);
          canvas.defaultCursor = 'default';
          syncCurveOverlay(activeCurvePathRef.current);
        } else if (activeTool === 'crop' && (cropToolsConfigRef.current?.cropRegion || cropDraftRect)) {
          cropDragRef.current = null;
          setCropDraftRect(null);
          onUpdateCropToolsConfig?.({ cropRegion: null });
          setCadHud(null);
        }
      } else if (e.key === 'Enter' && activeTool === 'crop' && cropToolsConfigRef.current?.cropRegion) {
        e.preventDefault();
        applyCropRegionToCanvas(cropToolsConfigRef.current.cropRegion);
      } else if (e.key === 'Enter' && ['bezier', 'pen', 'b_spline', 'polyline'].includes(activeTool)) {
        handleDoubleClick();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTool === 'shape' && activeCurvePathRef.current && selectedNodeIndicesRef.current.length > 0) {
          const curPath = activeCurvePathRef.current;
          const ok = deleteNodesFromPath(curPath, selectedNodeIndicesRef.current);
          if (ok) {
            e.preventDefault();
            selectedNodeIndicesRef.current = [];
            activeSegmentRef.current = null;
            syncCurveOverlay(curPath);
            canvas.requestRenderAll();
            onCanvasModified?.();
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
          }
          return;
        }
        const active = canvas.getActiveObject();
        // Only delete if not currently typing in an IText
        if (active && !(active as any).isEditing) {
          e.preventDefault();
          if (active.type === 'activeselection') {
            const sel = active as fabric.ActiveSelection;
            const objs = [...sel.getObjects()];
            canvas.discardActiveObject();
            objs.forEach((o) => canvas.remove(o));
          } else {
            canvas.remove(active);
            canvas.discardActiveObject();
          }
          canvas.requestRenderAll();
          onSelectionChange(null);
          socketService.sendCanvasUpdate(canvas.toJSON(), 'remove');
        }
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'v' || e.key === 'V')) {
        onSelectTool('pick');
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P')) {
        const active = canvas.getActiveObject();
        if (active && !(active as any).isEditing) {
          const w = (active.width || 0) * (active.scaleX || 1);
          const h = (active.height || 0) * (active.scaleY || 1);
          active.set({
            left: (pageConfig.width - w) / 2,
            top: (pageConfig.height - h) / 2,
            originX: 'left',
            originY: 'top',
          });
          active.setCoords();
          canvas.renderAll();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      shiftKeyRef.current = e.shiftKey;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, onSelectTool, pageConfig, handleDoubleClick, onSelectionChange, applyCropRegionToCanvas, onUpdateCropToolsConfig, cropDraftRect]);

  // AutoCAD-Grade Real-time Object Snapping Engine (Move + Polar/Ortho + CAD HUD)
  const handleObjectMoving = useCallback((e: any) => {
    if (isPanningRef.current || activeToolRef.current === 'pan') {
      return;
    }

    const currentSnap = snapConfigRef.current;
    const target = e.target;
    const canvas = fabricRef.current;
    if (!target || !canvas) return;

    if (!currentSnap || !currentSnap.enabled) {
      setActiveSnapLines((prev) => (prev.length > 0 ? [] : prev));
      setActiveSnapMarkers((prev) => (prev.length > 0 ? [] : prev));
      setActivePolarGuide((prev) => (prev ? null : prev));
      setCadHud((prev) => (prev ? null : prev));
      return;
    }

    const currentPage = pageConfigRef.current;
    const allObjects = canvas.getObjects();
    const curZoom = zoomLevelRef.current || 1;

    const { snappedLeft, snappedTop, snapLines, activeMarkers, polarGuide } = calculateObjectSnapping(
      target,
      allObjects,
      currentPage,
      currentSnap,
      curZoom,
      grabbedPointRef.current,
      dragOriginRef.current,
      shiftKeyRef.current
    );

    if (snappedLeft !== (target.left || 0) || snappedTop !== (target.top || 0)) {
      target.set({ left: snappedLeft, top: snappedTop });
      target.setCoords();
      canvas.requestRenderAll();
    }

    if (dragOriginRef.current) {
      const dx = snappedLeft - dragOriginRef.current.left;
      const dy = snappedTop - dragOriginRef.current.top;
      const dist = Math.round(Math.hypot(dx, dy));
      let deg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;
      if (deg < 0) deg += 360;
      const refX = grabbedPointRef.current
        ? snappedLeft + grabbedPointRef.current.offsetFromOrigin.dx
        : (target.getCenterPoint?.().x ?? snappedLeft);
      const refY = grabbedPointRef.current
        ? snappedTop + grabbedPointRef.current.offsetFromOrigin.dy
        : (target.getCenterPoint?.().y ?? snappedTop);
      setCadHud({ x: refX, y: refY, text: `Δ ${dist} px  ∠ ${deg}°` });
    }

    setHoverSnapMarker(null);
    setActiveSnapLines(snapLines);
    setActiveSnapMarkers(activeMarkers);
    setActivePolarGuide(polarGuide);
  }, []);

  // AutoCAD OSNAP when resizing / dragging corner handles (object:scaling) using exact vector centerline
  const handleObjectScaling = useCallback((e: any) => {
    const currentSnap = snapConfigRef.current;
    if (!currentSnap?.enabled || isPanningRef.current) return;

    const target = e.target as fabric.FabricObject;
    const corner = e.transform?.corner as string | undefined;
    const canvas = fabricRef.current;
    if (!target || !corner || !canvas) return;
    if (Math.abs(target.angle || 0) > 0.01) return;

    target.setCoords();
    const [tl, tr, br, bl] = getObjectCenterlineCorners(target);

    const getCornersAnchor = (c: { x: number; y: number }[]) => ({
      tl: c[0],
      tr: c[1],
      br: c[2],
      bl: c[3],
      mt: { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 },
      mb: { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 },
      ml: { x: (c[0].x + c[3].x) / 2, y: (c[0].y + c[3].y) / 2 },
      mr: { x: (c[1].x + c[2].x) / 2, y: (c[1].y + c[2].y) / 2 },
    });

    const handleMap: Record<
      string,
      {
        pt: { x: number; y: number };
        anchor: { x: number; y: number };
        anchorKey: 'tl' | 'tr' | 'br' | 'bl' | 'mt' | 'mb' | 'ml' | 'mr';
        sx: boolean;
        sy: boolean;
      }
    > = {
      tl: { pt: tl, anchor: br, anchorKey: 'br', sx: true, sy: true },
      tr: { pt: tr, anchor: bl, anchorKey: 'bl', sx: true, sy: true },
      br: { pt: br, anchor: tl, anchorKey: 'tl', sx: true, sy: true },
      bl: { pt: bl, anchor: tr, anchorKey: 'tr', sx: true, sy: true },
      mt: { pt: { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 }, anchor: { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 }, anchorKey: 'mb', sx: false, sy: true },
      mb: { pt: { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 }, anchor: { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 }, anchorKey: 'mt', sx: false, sy: true },
      ml: { pt: { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 }, anchor: { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 }, anchorKey: 'mr', sx: true, sy: false },
      mr: { pt: { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 }, anchor: { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 }, anchorKey: 'ml', sx: true, sy: false },
    };

    const spec = handleMap[corner];
    if (!spec) return;

    const curZoom = zoomLevelRef.current || 1;
    const osnap = findNearestOsnapPoint(
      spec.pt.x,
      spec.pt.y,
      canvas.getObjects(),
      target,
      pageConfigRef.current,
      currentSnap,
      curZoom
    );

    if (!osnap) {
      setActiveSnapMarkers([]);
      return;
    }

    let updated = false;
    if (spec.sx) {
      const curSpanX = spec.pt.x - spec.anchor.x;
      const newSpanX = osnap.x - spec.anchor.x;
      if (Math.abs(curSpanX) > 4 && Math.sign(curSpanX) === Math.sign(newSpanX) && Math.abs(newSpanX) > 4) {
        target.set('scaleX', (target.scaleX || 1) * (newSpanX / curSpanX));
        updated = true;
      }
    }
    if (spec.sy) {
      const curSpanY = spec.pt.y - spec.anchor.y;
      const newSpanY = osnap.y - spec.anchor.y;
      if (Math.abs(curSpanY) > 4 && Math.sign(curSpanY) === Math.sign(newSpanY) && Math.abs(newSpanY) > 4) {
        target.set('scaleY', (target.scaleY || 1) * (newSpanY / curSpanY));
        updated = true;
      }
    }

    if (updated) {
      const afterCorners = getCornersAnchor(getObjectCenterlineCorners(target));
      const shiftedAnchor = afterCorners[spec.anchorKey];
      target.set({
        left: (target.left || 0) + (spec.anchor.x - shiftedAnchor.x),
        top: (target.top || 0) + (spec.anchor.y - shiftedAnchor.y),
      });
      target.setCoords();
      canvas.requestRenderAll();
      setActiveSnapMarkers([
        {
          id: `scale-osnap-${osnap.type}-${Math.round(osnap.x)}-${Math.round(osnap.y)}`,
          x: osnap.x,
          y: osnap.y,
          type: osnap.type,
          label: osnap.label,
        },
      ]);
    }
  }, []);

  // Attach fabric and DOM event listeners + Middle-Mouse Pan Capture & Window Dragging
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);

    const upperEl = canvas.upperCanvasEl;

    // Capture-phase middle-mouse pan: prevents Fabric from accidentally selecting/dragging objects underneath
    const handleCaptureMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        isPanningRef.current = true;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        setHoverSnapMarker(null);
        canvas.defaultCursor = 'grabbing';
        (canvas as any)._currentTransform = null;
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      setHoverSnapMarker(null);
      const deltaX = e.clientX - lastPanPosRef.current.x;
      const deltaY = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      const curZoom = zoomLevelRef.current || 1;

      setPan((prev) => {
        const newX = prev.x + deltaX;
        const newY = prev.y + deltaY;
        canvas.setViewportTransform([curZoom, 0, 0, curZoom, newX, newY]);
        canvas.requestRenderAll();
        return { x: newX, y: newY };
      });
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (activeToolRef.current === 'shape' && curveDragRef.current?.mode === 'marquee') {
        const drag = curveDragRef.current;
        curveDragRef.current = null;
        const endPt = canvas.getScenePoint(e);
        const minX = Math.min(drag.startX, endPt.x);
        const maxX = Math.max(drag.startX, endPt.x);
        const minY = Math.min(drag.startY, endPt.y);
        const maxY = Math.max(drag.startY, endPt.y);
        if (maxX - minX > 4 || maxY - minY > 4) {
          let targetPath = activeCurvePathRef.current;
          let inside = curveDataRef.current
            ? curveDataRef.current.nodes
                .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
                .map((n) => n.cmdIndex)
            : [];
          if (inside.length === 0) {
            const allPaths = [...canvas.getObjects()]
              .reverse()
              .filter((o): o is fabric.Path => o.type === 'path' && o.visible !== false);
            for (const candidatePath of allPaths) {
              const cData = extractEditableCurveData(candidatePath);
              const cInside = cData.nodes
                .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
                .map((n) => n.cmdIndex);
              if (cInside.length > 0) {
                targetPath = candidatePath;
                inside = cInside;
                canvas.setActiveObject(candidatePath);
                onSelectionChange(candidatePath);
                break;
              }
            }
          }
          if (targetPath) {
            activeSegmentRef.current = null;
            selectedNodeIndicesRef.current = e.shiftKey && targetPath === activeCurvePathRef.current
              ? Array.from(new Set([...selectedNodeIndicesRef.current, ...inside]))
              : inside;
            syncCurveOverlay(targetPath);
          }
        }
        setCurveMarquee(null);
      }

      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      canvas.defaultCursor = activeToolRef.current === 'pan' ? 'grab' : activeToolRef.current === 'pick' ? 'default' : 'crosshair';
      canvas.forEachObject((obj) => obj.setCoords());
      canvas.requestRenderAll();
    };

    const handleDomDblClick = () => {
      const active: any = canvas.getActiveObject();
      let t = active;
      if (t?.group && (t.group.isPowerClip || t.group.customType === 'powerclip')) {
        t = t.group;
      }
      if (t && (t.isPowerClip || t.customType === 'powerclip')) {
        if (onPowerClipEdit) onPowerClipEdit(t);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const target = resolveEventTarget(canvas, e);
      if (target && typeof canvas.setActiveObject === 'function') {
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
        onSelectionChange(target);
      } else {
        const active = canvas.getActiveObject();
        if (active) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          onSelectionChange(null);
        }
      }
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    upperEl?.addEventListener('mousedown', handleCaptureMouseDown, { capture: true });
    upperEl?.addEventListener('dblclick', handleDomDblClick);
    upperEl?.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:dblclick', handleDoubleClick);
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:scaling', handleObjectScaling);
      upperEl?.removeEventListener('mousedown', handleCaptureMouseDown, { capture: true });
      upperEl?.removeEventListener('dblclick', handleDomDblClick);
      upperEl?.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick, handleObjectMoving, handleObjectScaling, onPowerClipEdit, onSelectionChange]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col relative overflow-hidden select-none transition-colors duration-200"
      style={{ backgroundColor: workspaceBg }}
    >
      {/* Top Row: Origin Corner Box (20px) + Top Ruler */}
      {showRulers && (
        <div className="flex h-5 w-full flex-shrink-0 select-none">
          {/* Origin Corner Box with active unit symbol */}
          <div
            className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-r border-b font-mono font-bold text-[8.5px] uppercase cursor-pointer select-none transition-colors ${
              theme === 'dark'
                ? 'bg-[#474a50] border-[#6c717a] text-sky-300 hover:bg-[#575b63]'
                : 'bg-[#e4e5e8] border-[#c5c8cf] text-blue-600 hover:bg-[#d4d6dc]'
            }`}
            title={`Current Unit: ${pageConfig.units.toUpperCase()}. Click to open Page Setup.`}
            onClick={onOpenPageSetup}
          >
            {pageConfig.units}
          </div>

          {/* Top Ruler aligned with Canvas Desk */}
          <div className="flex-1 h-5 relative overflow-hidden">
            <TopRuler
              zoom={zoomLevel}
              pan={pan}
              cursorPos={cursorPos}
              units={pageConfig.units}
              theme={theme}
              pageWidth={pageConfig.width}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Ruler */}
        {showRulers && (
          <div className="w-5 h-full flex-shrink-0 relative overflow-hidden">
            <LeftRuler
              zoom={zoomLevel}
              pan={pan}
              cursorPos={cursorPos}
              units={pageConfig.units}
              theme={theme}
              pageHeight={pageConfig.height}
            />
          </div>
        )}

        {/* Canvas Desk Area */}
        <div ref={deskRef} className="flex-1 relative overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Dots Background */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: 'radial-gradient(#71717a 1px, transparent 1px)',
                backgroundSize: `${(snapConfig.gridSize || 20) * zoomLevel}px ${(snapConfig.gridSize || 20) * zoomLevel}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
              }}
            />
          )}

          {/* CorelDRAW Paper Outline / Shadow (Exact match with image_2b0a935b.png) */}
          {pageConfig.showPageBorder !== false && (
            <div
              className={`absolute pointer-events-none ${
                theme === 'dark'
                  ? 'border border-zinc-600 shadow-[4px_4px_0px_rgba(0,0,0,0.45)]'
                  : 'border border-zinc-400 shadow-[4px_4px_0px_rgba(0,0,0,0.22)]'
              }`}
              style={{
                left: `${pan.x}px`,
                top: `${pan.y}px`,
                width: `${pageConfig.width * zoomLevel}px`,
                height: `${pageConfig.height * zoomLevel}px`,
                backgroundColor:
                  viewQualityMode === 'wireframe'
                    ? '#ffffff'
                    : pageConfig.backgroundColor || '#ffffff',
              }}
            />
          )}

          {/* Page Bleed Overlay */}
          {pageConfig.showBleed && (
            <div
              className="absolute pointer-events-none border border-dashed border-red-500/80"
              style={{
                left: `${pan.x - (pageConfig.bleed || 12) * zoomLevel}px`,
                top: `${pan.y - (pageConfig.bleed || 12) * zoomLevel}px`,
                width: `${(pageConfig.width + (pageConfig.bleed || 12) * 2) * zoomLevel}px`,
                height: `${(pageConfig.height + (pageConfig.bleed || 12) * 2) * zoomLevel}px`,
              }}
            />
          )}

          {/* Printable Area Overlay */}
          {showPrintableArea && (
            <div
              className="absolute pointer-events-none border border-dashed border-sky-500/75"
              style={{
                left: `${pan.x + 24 * zoomLevel}px`,
                top: `${pan.y + 24 * zoomLevel}px`,
                width: `${Math.max(0, pageConfig.width - 48) * zoomLevel}px`,
                height: `${Math.max(0, pageConfig.height - 48) * zoomLevel}px`,
              }}
            />
          )}

          {/* Baseline Grid Overlay */}
          {showBaselineGrid && (
            <div
              className="absolute pointer-events-none opacity-35"
              style={{
                left: `${pan.x}px`,
                top: `${pan.y}px`,
                width: `${pageConfig.width * zoomLevel}px`,
                height: `${pageConfig.height * zoomLevel}px`,
                backgroundImage: 'linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
                backgroundSize: `100% ${16 * zoomLevel}px`,
              }}
            />
          )}

          {/* Page Guidelines Overlay */}
          {showGuidelines && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${pan.x}px`,
                top: `${pan.y}px`,
                width: `${pageConfig.width * zoomLevel}px`,
                height: `${pageConfig.height * zoomLevel}px`,
              }}
            >
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-cyan-500/35" />
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-cyan-500/35" />
            </div>
          )}

          {/* Interactive Fabric Canvas */}
          <div
            className="absolute inset-0"
            style={{
              filter: proofColors ? 'saturate(0.84) contrast(0.95) brightness(1.02)' : undefined,
              imageRendering: viewQualityMode === 'pixels' ? 'pixelated' : undefined,
            }}
          >
            <canvas ref={canvasElementRef} />
          </div>

          {/* CorelDRAW Shape Tool (F10) Curve Wireframe, Bezier Handles & Nodes SVG Overlay */}
          {(curveOverlay || curveMarquee) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
              {/* Subpath blue hairline wireframe */}
              {curveOverlay?.data.outlinePolylines.map((poly, pIdx) => {
                if (poly.length < 2) return null;
                const d = poly
                  .map(
                    (pt, idx) =>
                      `${idx === 0 ? 'M' : 'L'} ${pan.x + pt.x * zoomLevel} ${pan.y + pt.y * zoomLevel}`
                  )
                  .join(' ');
                return (
                  <path
                    key={`wire-${pIdx}`}
                    d={d}
                    fill="none"
                    stroke="#0078d7"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    opacity="0.9"
                  />
                );
              })}

              {/* Highlighted Active Segment */}
              {curveOverlay &&
                curveOverlay.activeSegCmd !== null &&
                (() => {
                  const seg = curveOverlay.data.segments.find(
                    (s) => s.cmdIndex === curveOverlay.activeSegCmd
                  );
                  if (!seg) return null;
                  const sx0 = pan.x + seg.p0.x * zoomLevel;
                  const sy0 = pan.y + seg.p0.y * zoomLevel;
                  const sx1 = pan.x + seg.p1.x * zoomLevel;
                  const sy1 = pan.y + seg.p1.y * zoomLevel;
                  const mx = pan.x + seg.mid.x * zoomLevel;
                  const my = pan.y + seg.mid.y * zoomLevel;
                  const d =
                    seg.type === 'curve' && seg.cp1 && seg.cp2
                      ? `M ${sx0} ${sy0} C ${pan.x + seg.cp1.x * zoomLevel} ${
                          pan.y + seg.cp1.y * zoomLevel
                        } ${pan.x + seg.cp2.x * zoomLevel} ${
                          pan.y + seg.cp2.y * zoomLevel
                        } ${sx1} ${sy1}`
                      : `M ${sx0} ${sy0} L ${sx1} ${sy1}`;
                  return (
                    <g>
                      <path d={d} fill="none" stroke="#f97316" strokeWidth="2.4" opacity="0.9" />
                      <circle cx={mx} cy={my} r={4} fill="#f97316" stroke="#ffffff" strokeWidth="1.2" />
                    </g>
                  );
                })()}

              {/* Bezier Tangent Lines & Control Handles */}
              {curveOverlay?.data.nodes.map((node) => {
                const isSel = curveOverlay.selectedNodes.includes(node.cmdIndex);
                const nx = pan.x + node.x * zoomLevel;
                const ny = pan.y + node.y * zoomLevel;
                const showHandles = isSel || curveOverlay.data.nodes.length <= 24;
                if (!showHandles) return null;

                return (
                  <g key={`handles-${node.cmdIndex}`}>
                    {node.inHandle && (() => {
                      const hx = pan.x + node.inHandle.x * zoomLevel;
                      const hy = pan.y + node.inHandle.y * zoomLevel;
                      const isHov = curveOverlay.hoverHandleKey === `${node.cmdIndex}-cp2`;
                      return (
                        <g>
                          <line
                            x1={nx}
                            y1={ny}
                            x2={hx}
                            y2={hy}
                            stroke="#0284c7"
                            strokeWidth="1.1"
                            strokeDasharray="3 2"
                          />
                          <circle
                            cx={hx}
                            cy={hy}
                            r={isHov ? 4.8 : 3.6}
                            fill={isHov ? '#06b6d4' : '#ffffff'}
                            stroke="#0284c7"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })()}
                    {node.outHandle && (() => {
                      const hx = pan.x + node.outHandle.x * zoomLevel;
                      const hy = pan.y + node.outHandle.y * zoomLevel;
                      const isHov = curveOverlay.hoverHandleKey === `${node.cmdIndex}-cp1`;
                      return (
                        <g>
                          <line
                            x1={nx}
                            y1={ny}
                            x2={hx}
                            y2={hy}
                            stroke="#0284c7"
                            strokeWidth="1.1"
                            strokeDasharray="3 2"
                          />
                          <circle
                            cx={hx}
                            cy={hy}
                            r={isHov ? 4.8 : 3.6}
                            fill={isHov ? '#06b6d4' : '#ffffff'}
                            stroke="#0284c7"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* CorelDRAW Node Glyphs: Square (Cusp), Circle (Smooth), Diamond (Symmetrical) */}
              {curveOverlay?.data.nodes.map((node) => {
                const isSel = curveOverlay.selectedNodes.includes(node.cmdIndex);
                const isHov = curveOverlay.hoverNodeCmd === node.cmdIndex;
                const nx = pan.x + node.x * zoomLevel;
                const ny = pan.y + node.y * zoomLevel;
                const r = isSel || isHov ? 5 : 4;
                const fill = isSel ? '#0078d7' : isHov ? '#bae6fd' : '#ffffff';
                const stroke = isSel ? '#0f172a' : node.isSubpathStart ? '#0284c7' : '#1e293b';

                return (
                  <g key={`node-${node.cmdIndex}`} transform={`translate(${nx}, ${ny})`}>
                    {node.nodeType === 'cusp' && (
                      <rect
                        x={-r}
                        y={-r}
                        width={r * 2}
                        height={r * 2}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSel ? '1.8' : '1.4'}
                      />
                    )}
                    {node.nodeType === 'smooth' && (
                      <circle
                        cx={0}
                        cy={0}
                        r={r}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSel ? '1.8' : '1.4'}
                      />
                    )}
                    {node.nodeType === 'symmetrical' && (
                      <polygon
                        points={`0,${-r - 1} ${r + 1},0 0,${r + 1} ${-r - 1},0`}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSel ? '1.8' : '1.4'}
                      />
                    )}
                    {node.isSubpathStart && (
                      <rect
                        x={-r - 2.5}
                        y={-r - 2.5}
                        width={(r + 2.5) * 2}
                        height={(r + 2.5) * 2}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="1"
                        opacity="0.7"
                      />
                    )}
                  </g>
                );
              })}

              {/* Dashed Window Selection Box + Live Enclosed Node Highlight */}
              {curveMarquee && (() => {
                const mx = pan.x + curveMarquee.x1 * zoomLevel;
                const my = pan.y + curveMarquee.y1 * zoomLevel;
                const mw = (curveMarquee.x2 - curveMarquee.x1) * zoomLevel;
                const mh = (curveMarquee.y2 - curveMarquee.y1) * zoomLevel;
                const enclosed = curveOverlay
                  ? curveOverlay.data.nodes.filter(
                      (n) =>
                        n.x >= curveMarquee.x1 &&
                        n.x <= curveMarquee.x2 &&
                        n.y >= curveMarquee.y1 &&
                        n.y <= curveMarquee.y2
                    )
                  : [];
                return (
                  <g>
                    <rect
                      x={mx}
                      y={my}
                      width={mw}
                      height={mh}
                      fill="rgba(0, 120, 215, 0.12)"
                      stroke="#0078d7"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                    />
                    {enclosed.map((n) => (
                      <circle
                        key={`win-${n.cmdIndex}`}
                        cx={pan.x + n.x * zoomLevel}
                        cy={pan.y + n.y * zoomLevel}
                        r={7}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                      />
                    ))}
                    {(mw > 18 || mh > 18) && (
                      <g transform={`translate(${mx + 4}, ${Math.max(14, my - 6)})`}>
                        <rect
                          x={0}
                          y={-12}
                          width={118}
                          height={15}
                          rx={2.5}
                          fill="#0f172a"
                          fillOpacity="0.88"
                        />
                        <text x={6} y={-1.5} fill="#ffffff" fontSize="9.5" fontFamily="Segoe UI, sans-serif">
                          Window: {enclosed.length} {enclosed.length === 1 ? 'node' : 'nodes'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* Live Manual Add-Point Preview Dot & Open Curve Extension Ray */}
              {addNodeHoverPreview && (
                <g>
                  {addNodeHoverPreview.extendFrom && (
                    <line
                      x1={pan.x + addNodeHoverPreview.extendFrom.x * zoomLevel}
                      y1={pan.y + addNodeHoverPreview.extendFrom.y * zoomLevel}
                      x2={pan.x + addNodeHoverPreview.point.x * zoomLevel}
                      y2={pan.y + addNodeHoverPreview.point.y * zoomLevel}
                      stroke="#16a34a"
                      strokeWidth="1.4"
                      strokeDasharray="4 3"
                    />
                  )}
                  <circle
                    cx={pan.x + addNodeHoverPreview.point.x * zoomLevel}
                    cy={pan.y + addNodeHoverPreview.point.y * zoomLevel}
                    r={6}
                    fill="#22c55e"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                  <line
                    x1={pan.x + addNodeHoverPreview.point.x * zoomLevel - 3}
                    y1={pan.y + addNodeHoverPreview.point.y * zoomLevel}
                    x2={pan.x + addNodeHoverPreview.point.x * zoomLevel + 3}
                    y2={pan.y + addNodeHoverPreview.point.y * zoomLevel}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={pan.x + addNodeHoverPreview.point.x * zoomLevel}
                    y1={pan.y + addNodeHoverPreview.point.y * zoomLevel - 3}
                    x2={pan.x + addNodeHoverPreview.point.x * zoomLevel}
                    y2={pan.y + addNodeHoverPreview.point.y * zoomLevel + 3}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>
          )}

          {/* AutoCAD-Grade OSNAP Glyphs, Polar/Ortho Tracking Rays, Displacement Vector, Dimension Previews & Crop/Knife/Eraser Overlays */}
          {(activeSnapLines.length > 0 ||
            activeSnapMarkers.length > 0 ||
            hoverSnapMarker ||
            activePolarGuide ||
            bezierRubberBand ||
            bezierPenPreview ||
            dimOverlay ||
            cropDraftRect ||
            cropToolsConfig.cropRegion ||
            knifePreviewLine ||
            eraserTrailPreview ||
            eraserCursorPt ||
            cadHud) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
              {/* Live Dimension Tool SVG Previews (H/V, Angular, Segment, 3-Point Callout) */}
              {dimOverlay?.kind === 'hv' && (() => {
                const { x1, y1, x2, y2 } = dimOverlay;
                const isHoriz = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
                const sx1 = pan.x + x1 * zoomLevel;
                const sy1 = pan.y + y1 * zoomLevel;
                const sx2 = pan.x + x2 * zoomLevel;
                const sy2 = pan.y + y2 * zoomLevel;
                return isHoriz ? (
                  <g>
                    <line x1={sx1} y1={sy1} x2={sx1} y2={sy2} stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
                    <line x1={sx1} y1={sy2} x2={sx2} y2={sy2} stroke="#0284c7" strokeWidth="1.8" />
                    <circle cx={sx1} cy={sy2} r={3} fill="#0284c7" />
                    <circle cx={sx2} cy={sy2} r={3} fill="#0284c7" />
                  </g>
                ) : (
                  <g>
                    <line x1={sx1} y1={sy1} x2={sx2} y2={sy1} stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
                    <line x1={sx2} y1={sy1} x2={sx2} y2={sy2} stroke="#0284c7" strokeWidth="1.8" />
                    <circle cx={sx2} cy={sy1} r={3} fill="#0284c7" />
                    <circle cx={sx2} cy={sy2} r={3} fill="#0284c7" />
                  </g>
                );
              })()}
              {dimOverlay?.kind === 'angular' && (() => {
                const svx = pan.x + dimOverlay.vx * zoomLevel;
                const svy = pan.y + dimOverlay.vy * zoomLevel;
                const scx = pan.x + dimOverlay.cursor.x * zoomLevel;
                const scy = pan.y + dimOverlay.cursor.y * zoomLevel;
                const sp1 = dimOverlay.p1
                  ? { x: pan.x + dimOverlay.p1.x * zoomLevel, y: pan.y + dimOverlay.p1.y * zoomLevel }
                  : null;
                let arcD = '';
                if (sp1) {
                  const r1 = Math.hypot(sp1.x - svx, sp1.y - svy);
                  const r2 = Math.hypot(scx - svx, scy - svy);
                  const a1 = Math.atan2(sp1.y - svy, sp1.x - svx);
                  const a2 = Math.atan2(scy - svy, scx - svx);
                  let delta = a2 - a1;
                  while (delta > Math.PI) delta -= Math.PI * 2;
                  while (delta < -Math.PI) delta += Math.PI * 2;
                  const arcR = Math.max(20, Math.min(140, Math.min(r1 || 50, r2 || 50) * 0.72));
                  const ax1 = svx + Math.cos(a1) * arcR;
                  const ay1 = svy + Math.sin(a1) * arcR;
                  const ax2 = svx + Math.cos(a1 + delta) * arcR;
                  const ay2 = svy + Math.sin(a1 + delta) * arcR;
                  arcD = `M ${ax1} ${ay1} A ${arcR} ${arcR} 0 0 ${delta >= 0 ? 1 : 0} ${ax2} ${ay2}`;
                }
                return (
                  <g>
                    <circle cx={svx} cy={svy} r={4} fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                    {sp1 ? (
                      <>
                        <line x1={svx} y1={svy} x2={sp1.x} y2={sp1.y} stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="4 3" />
                        <line x1={svx} y1={svy} x2={scx} y2={scy} stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="4 3" />
                        {arcD && <path d={arcD} fill="none" stroke="#0284c7" strokeWidth="2" />}
                      </>
                    ) : (
                      <line x1={svx} y1={svy} x2={scx} y2={scy} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                    )}
                  </g>
                );
              })()}
              {dimOverlay?.kind === 'segment' && (
                <g>
                  <line
                    x1={pan.x + dimOverlay.x1 * zoomLevel}
                    y1={pan.y + dimOverlay.y1 * zoomLevel}
                    x2={pan.x + dimOverlay.x2 * zoomLevel}
                    y2={pan.y + dimOverlay.y2 * zoomLevel}
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle cx={pan.x + dimOverlay.x1 * zoomLevel} cy={pan.y + dimOverlay.y1 * zoomLevel} r={4} fill="#10b981" />
                  <circle cx={pan.x + dimOverlay.x2 * zoomLevel} cy={pan.y + dimOverlay.y2 * zoomLevel} r={4} fill="#10b981" />
                </g>
              )}
              {dimOverlay?.kind === 'callout' && (() => {
                const sp1 = { x: pan.x + dimOverlay.p1.x * zoomLevel, y: pan.y + dimOverlay.p1.y * zoomLevel };
                const sc = { x: pan.x + dimOverlay.cursor.x * zoomLevel, y: pan.y + dimOverlay.cursor.y * zoomLevel };
                const sp2 = dimOverlay.p2
                  ? { x: pan.x + dimOverlay.p2.x * zoomLevel, y: pan.y + dimOverlay.p2.y * zoomLevel }
                  : null;
                return (
                  <g>
                    <circle cx={sp1.x} cy={sp1.y} r={4} fill="#9333ea" stroke="#ffffff" strokeWidth="1.5" />
                    {sp2 ? (
                      <>
                        <line x1={sp1.x} y1={sp1.y} x2={sp2.x} y2={sp2.y} stroke="#9333ea" strokeWidth="1.8" />
                        <line x1={sp2.x} y1={sp2.y} x2={sc.x} y2={sp2.y} stroke="#9333ea" strokeWidth="1.8" strokeDasharray="4 2" />
                      </>
                    ) : (
                      <line x1={sp1.x} y1={sp1.y} x2={sc.x} y2={sc.y} stroke="#9333ea" strokeWidth="1.6" strokeDasharray="4 2" />
                    )}
                  </g>
                );
              })()}
              {/* AutoCAD Polar / Ortho Infinite Tracking Ray */}
              {showDynamicGuides && activePolarGuide && (() => {
                const ox = pan.x + activePolarGuide.origin.x * zoomLevel;
                const oy = pan.y + activePolarGuide.origin.y * zoomLevel;
                const rad = (activePolarGuide.angleDeg * Math.PI) / 180;
                const ext = 3000;
                const x1 = ox - Math.cos(rad) * ext;
                const y1 = oy - Math.sin(rad) * ext;
                const x2 = ox + Math.cos(rad) * ext;
                const y2 = oy + Math.sin(rad) * ext;
                return (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#22c55e"
                    strokeWidth="1.2"
                    strokeDasharray="6 4"
                    opacity="0.8"
                  />
                );
              })()}

              {/* Interactive Bezier / Pen Nodes, Handles & Live Cubic Preview */}
              {bezierPenPreview && (() => {
                const nodes = bezierPenPreview.nodes;
                const last = nodes[nodes.length - 1];
                const cur = bezierPenPreview.cursorPt;
                return (
                  <g>
                    {nodes.map((n, idx) => {
                      const nx = pan.x + n.x * zoomLevel;
                      const ny = pan.y + n.y * zoomLevel;
                      const isFirst = idx === 0;
                      return (
                        <g key={`bz-${idx}`}>
                          {n.inX !== undefined && n.inY !== undefined && (
                            <>
                              <line
                                x1={nx}
                                y1={ny}
                                x2={pan.x + n.inX * zoomLevel}
                                y2={pan.y + n.inY * zoomLevel}
                                stroke="#0284c7"
                                strokeWidth="1.1"
                                strokeDasharray="3 2"
                              />
                              <circle
                                cx={pan.x + n.inX * zoomLevel}
                                cy={pan.y + n.inY * zoomLevel}
                                r={3.5}
                                fill="#ffffff"
                                stroke="#0284c7"
                                strokeWidth="1.4"
                              />
                            </>
                          )}
                          {n.outX !== undefined && n.outY !== undefined && (
                            <>
                              <line
                                x1={nx}
                                y1={ny}
                                x2={pan.x + n.outX * zoomLevel}
                                y2={pan.y + n.outY * zoomLevel}
                                stroke="#0284c7"
                                strokeWidth="1.1"
                                strokeDasharray="3 2"
                              />
                              <circle
                                cx={pan.x + n.outX * zoomLevel}
                                cy={pan.y + n.outY * zoomLevel}
                                r={3.5}
                                fill="#06b6d4"
                                stroke="#0284c7"
                                strokeWidth="1.4"
                              />
                            </>
                          )}
                          <rect
                            x={nx - (isFirst && bezierPenPreview.closeHighlight ? 6 : 4)}
                            y={ny - (isFirst && bezierPenPreview.closeHighlight ? 6 : 4)}
                            width={(isFirst && bezierPenPreview.closeHighlight ? 6 : 4) * 2}
                            height={(isFirst && bezierPenPreview.closeHighlight ? 6 : 4) * 2}
                            fill={isFirst && bezierPenPreview.closeHighlight ? '#22c55e' : '#ffffff'}
                            stroke="#0078d7"
                            strokeWidth="1.6"
                          />
                        </g>
                      );
                    })}
                    {activeTool === 'b_spline' && nodes.length >= 2 && (
                      <polyline
                        points={nodes
                          .map((n) => `${pan.x + n.x * zoomLevel},${pan.y + n.y * zoomLevel}`)
                          .join(' ')}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="1.1"
                        strokeDasharray="3 3"
                        opacity="0.7"
                      />
                    )}
                    {last && cur && (
                      <path
                        d={
                          last.outX !== undefined && last.outY !== undefined
                            ? `M ${pan.x + last.x * zoomLevel} ${pan.y + last.y * zoomLevel} C ${pan.x + last.outX * zoomLevel} ${pan.y + last.outY * zoomLevel} ${pan.x + cur.x * zoomLevel} ${pan.y + cur.y * zoomLevel} ${pan.x + cur.x * zoomLevel} ${pan.y + cur.y * zoomLevel}`
                            : `M ${pan.x + last.x * zoomLevel} ${pan.y + last.y * zoomLevel} L ${pan.x + cur.x * zoomLevel} ${pan.y + cur.y * zoomLevel}`
                        }
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.6"
                        strokeDasharray="4 3"
                      />
                    )}
                  </g>
                );
              })()}

              {/* 3-Point Curve Live Chord & Arc Preview */}
              {curve3pOverlay && (() => {
                const p1x = pan.x + curve3pOverlay.p1.x * zoomLevel;
                const p1y = pan.y + curve3pOverlay.p1.y * zoomLevel;
                const p2x = pan.x + curve3pOverlay.p2.x * zoomLevel;
                const p2y = pan.y + curve3pOverlay.p2.y * zoomLevel;
                const apex = curve3pOverlay.apex;
                const apx = apex ? pan.x + apex.x * zoomLevel : null;
                const apy = apex ? pan.y + apex.y * zoomLevel : null;
                const cx = apx !== null ? 2 * apx - 0.5 * (p1x + p2x) : null;
                const cy = apy !== null ? 2 * apy - 0.5 * (p1y + p2y) : null;
                return (
                  <g>
                    <line
                      x1={p1x}
                      y1={p1y}
                      x2={p2x}
                      y2={p2y}
                      stroke="#0284c7"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      opacity="0.75"
                    />
                    {cx !== null && cy !== null && (
                      <path
                        d={`M ${p1x} ${p1y} Q ${cx} ${cy} ${p2x} ${p2y}`}
                        fill="none"
                        stroke="#0078d7"
                        strokeWidth="2"
                      />
                    )}
                    <rect x={p1x - 4} y={p1y - 4} width="8" height="8" fill="#ffffff" stroke="#0078d7" strokeWidth="1.5" />
                    <rect x={p2x - 4} y={p2y - 4} width="8" height="8" fill="#ffffff" stroke="#0078d7" strokeWidth="1.5" />
                    {apx !== null && apy !== null && (
                      <rect x={apx - 4} y={apy - 4} width="8" height="8" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
                    )}
                  </g>
                );
              })()}

              {/* Bezier Rubber-Band Preview Segment */}
              {bezierRubberBand && !bezierPenPreview && (
                <line
                  x1={pan.x + bezierRubberBand.x1 * zoomLevel}
                  y1={pan.y + bezierRubberBand.y1 * zoomLevel}
                  x2={pan.x + bezierRubberBand.x2 * zoomLevel}
                  y2={pan.y + bezierRubberBand.y2 * zoomLevel}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.9"
                />
              )}

              {/* Object Move Displacement Vector */}
              {dragOriginRef.current && cadHud && !isDrawingShapeRef.current && (
                <line
                  x1={pan.x + dragOriginRef.current.baseX * zoomLevel}
                  y1={pan.y + dragOriginRef.current.baseY * zoomLevel}
                  x2={pan.x + cadHud.x * zoomLevel}
                  y2={pan.y + cadHud.y * zoomLevel}
                  stroke="#22c55e"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.75"
                />
              )}

              {/* Snap Guidelines (Alignment Guides) */}
              {showAlignmentGuides && activeSnapLines.map((line) => {
                const color =
                  line.source === 'page'
                    ? '#06b6d4'
                    : line.source === 'object'
                    ? '#22c55e'
                    : '#3b82f6';
                if (line.type === 'vertical') {
                  const screenX = pan.x + line.pos * zoomLevel;
                  return (
                    <line
                      key={line.id}
                      x1={screenX}
                      y1={0}
                      x2={screenX}
                      y2="100%"
                      stroke={color}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.65"
                    />
                  );
                } else {
                  const screenY = pan.y + line.pos * zoomLevel;
                  return (
                    <line
                      key={line.id}
                      x1={0}
                      y1={screenY}
                      x2="100%"
                      y2={screenY}
                      stroke={color}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.65"
                    />
                  );
                }
              })}

              {/* Hover AutoCAD OSNAP Marker (before click/drag in Pick or Drawing tools) */}
              {hoverSnapMarker &&
                activeSnapMarkers.length === 0 &&
                (() => {
                  const sx = pan.x + hoverSnapMarker.x * zoomLevel;
                  const sy = pan.y + hoverSnapMarker.y * zoomLevel;
                  const strokeCol =
                    hoverSnapMarker.type === 'intersection'
                      ? '#f59e0b'
                      : hoverSnapMarker.type === 'center'
                      ? '#06b6d4'
                      : '#22c55e';
                  return (
                    <g transform={`translate(${sx}, ${sy})`}>
                      {hoverSnapMarker.type === 'node' && (
                        <rect x={-5.5} y={-5.5} width={11} height={11} fill="none" stroke={strokeCol} strokeWidth="2.2" />
                      )}
                      {hoverSnapMarker.type === 'midpoint' && (
                        <polygon points="0,-7 6.5,4.5 -6.5,4.5" fill="none" stroke={strokeCol} strokeWidth="2.2" />
                      )}
                      {hoverSnapMarker.type === 'intersection' && (
                        <g>
                          <line x1={-5.5} y1={-5.5} x2={5.5} y2={5.5} stroke={strokeCol} strokeWidth="2.2" />
                          <line x1={5.5} y1={-5.5} x2={-5.5} y2={5.5} stroke={strokeCol} strokeWidth="2.2" />
                        </g>
                      )}
                      {hoverSnapMarker.type === 'center' && (
                        <g>
                          <circle cx={0} cy={0} r={6} fill="none" stroke={strokeCol} strokeWidth="2" />
                          <circle cx={0} cy={0} r={1.8} fill={strokeCol} />
                        </g>
                      )}
                      {hoverSnapMarker.type === 'quadrant' && (
                        <polygon points="0,-6.5 6.5,0 0,6.5 -6.5,0" fill="none" stroke={strokeCol} strokeWidth="2.2" />
                      )}
                      {hoverSnapMarker.type === 'perpendicular' && (
                        <g>
                          <polyline points="-5,-5 -5,5 5,5" fill="none" stroke={strokeCol} strokeWidth="2" />
                          <polyline points="-5,0 0,0 0,5" fill="none" stroke={strokeCol} strokeWidth="1.5" />
                        </g>
                      )}
                      <g transform="translate(10, -10)">
                        <rect
                          x={0}
                          y={-12}
                          width={hoverSnapMarker.label.length * 6.1 + 12}
                          height={15}
                          rx={2.5}
                          fill="#0f172a"
                          fillOpacity="0.9"
                          stroke={strokeCol}
                          strokeWidth="1"
                        />
                        <text
                          x={6}
                          y={-1.5}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontFamily="Segoe UI, Tahoma, sans-serif"
                          fontWeight="600"
                        >
                          {hoverSnapMarker.label}
                        </text>
                      </g>
                    </g>
                  );
                })()}

              {/* Active Locked AutoCAD OSNAP Markers (during Move, Resize, or Drawing) */}
              {activeSnapMarkers.map((marker) => {
                const sx = pan.x + marker.x * zoomLevel;
                const sy = pan.y + marker.y * zoomLevel;
                const col =
                  marker.type === 'intersection'
                    ? '#f59e0b'
                    : marker.type === 'center'
                    ? '#06b6d4'
                    : marker.type === 'quadrant'
                    ? '#10b981'
                    : '#22c55e';

                return (
                  <g key={marker.id} transform={`translate(${sx}, ${sy})`}>
                    {marker.type === 'node' && (
                      <g>
                        <rect x={-6.5} y={-6.5} width={13} height={13} fill="none" stroke="#0f172a" strokeWidth="3.5" opacity="0.6" />
                        <rect x={-6} y={-6} width={12} height={12} fill="none" stroke={col} strokeWidth="2.2" />
                      </g>
                    )}

                    {marker.type === 'midpoint' && (
                      <g>
                        <polygon points="0,-8 7.5,5 -7.5,5" fill="none" stroke="#0f172a" strokeWidth="3.5" opacity="0.6" />
                        <polygon points="0,-7.5 7,4.5 -7,4.5" fill="none" stroke={col} strokeWidth="2.2" />
                      </g>
                    )}

                    {marker.type === 'intersection' && (
                      <g>
                        <line x1={-6} y1={-6} x2={6} y2={6} stroke="#0f172a" strokeWidth="4" opacity="0.6" />
                        <line x1={6} y1={-6} x2={-6} y2={6} stroke="#0f172a" strokeWidth="4" opacity="0.6" />
                        <line x1={-5.5} y1={-5.5} x2={5.5} y2={5.5} stroke={col} strokeWidth="2.3" strokeLinecap="round" />
                        <line x1={5.5} y1={-5.5} x2={-5.5} y2={5.5} stroke={col} strokeWidth="2.3" strokeLinecap="round" />
                      </g>
                    )}

                    {marker.type === 'center' && (
                      <g>
                        <circle cx={0} cy={0} r={6.5} fill="none" stroke="#0f172a" strokeWidth="3.5" opacity="0.6" />
                        <circle cx={0} cy={0} r={6.5} fill="none" stroke={col} strokeWidth="2.2" />
                        <circle cx={0} cy={0} r={2} fill={col} />
                      </g>
                    )}

                    {marker.type === 'quadrant' && (
                      <g>
                        <polygon points="0,-7 7,0 0,7 -7,0" fill="none" stroke="#0f172a" strokeWidth="3.5" opacity="0.6" />
                        <polygon points="0,-6.5 6.5,0 0,6.5 -6.5,0" fill="none" stroke={col} strokeWidth="2.2" />
                      </g>
                    )}

                    {marker.type === 'perpendicular' && (
                      <g>
                        <polyline points="-5.5,-5.5 -5.5,5.5 5.5,5.5" fill="none" stroke={col} strokeWidth="2.2" />
                        <polyline points="-5.5,0 0,0 0,5.5" fill="none" stroke={col} strokeWidth="1.6" />
                      </g>
                    )}

                    <g transform="translate(11, -11)">
                      <rect
                        x={0}
                        y={-12}
                        width={marker.label.length * 6.3 + 14}
                        height={16}
                        rx={3}
                        fill="#0f172a"
                        fillOpacity="0.92"
                        stroke={col}
                        strokeWidth="1"
                      />
                      <text
                        x={7}
                        y={-0.5}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="Segoe UI, Tahoma, sans-serif"
                        fontWeight="bold"
                      >
                        {marker.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Interactive Crop Region Mask & 8 Resize Handles */}
              {(cropDraftRect || cropToolsConfig.cropRegion) && (() => {
                const r = cropDraftRect || cropToolsConfig.cropRegion!;
                const sx = pan.x + r.x * zoomLevel;
                const sy = pan.y + r.y * zoomLevel;
                const sw = r.width * zoomLevel;
                const sh = r.height * zoomLevel;
                const handlePts = [
                  { x: sx, y: sy },
                  { x: sx + sw / 2, y: sy },
                  { x: sx + sw, y: sy },
                  { x: sx + sw, y: sy + sh / 2 },
                  { x: sx + sw, y: sy + sh },
                  { x: sx + sw / 2, y: sy + sh },
                  { x: sx, y: sy + sh },
                  { x: sx, y: sy + sh / 2 },
                ];
                return (
                  <g>
                    <path
                      d={`M -5000 -5000 H 15000 V 15000 H -5000 Z M ${sx} ${sy} V ${sy + sh} H ${sx + sw} V ${sy} Z`}
                      fill="rgba(15, 23, 42, 0.35)"
                      fillRule="evenodd"
                    />
                    <rect
                      x={sx}
                      y={sy}
                      width={sw}
                      height={sh}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={sx}
                      y={sy}
                      width={sw}
                      height={sh}
                      fill="none"
                      stroke="#0078d7"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                    {!cropDraftRect &&
                      handlePts.map((hp, hi) => (
                        <rect
                          key={hi}
                          x={hp.x - 4}
                          y={hp.y - 4}
                          width={8}
                          height={8}
                          fill="#ffffff"
                          stroke="#0078d7"
                          strokeWidth="1.6"
                        />
                      ))}
                  </g>
                );
              })()}

              {/* Knife Tool Live Vector Cut Line */}
              {knifePreviewLine && (() => {
                const kx1 = pan.x + knifePreviewLine.x1 * zoomLevel;
                const ky1 = pan.y + knifePreviewLine.y1 * zoomLevel;
                const kx2 = pan.x + knifePreviewLine.x2 * zoomLevel;
                const ky2 = pan.y + knifePreviewLine.y2 * zoomLevel;
                return (
                  <g>
                    <line
                      x1={kx1}
                      y1={ky1}
                      x2={kx2}
                      y2={ky2}
                      stroke="#ffffff"
                      strokeWidth="3"
                      opacity="0.7"
                    />
                    <line
                      x1={kx1}
                      y1={ky1}
                      x2={kx2}
                      y2={ky2}
                      stroke="#ef4444"
                      strokeWidth="1.8"
                      strokeDasharray="6 4"
                    />
                    <circle cx={kx1} cy={ky1} r={4} fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={kx2} cy={ky2} r={4} fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })()}

              {/* Eraser Tool Live Nib & Stroke Preview */}
              {eraserTrailPreview && eraserTrailPreview.length > 0 && (
                <polyline
                  points={eraserTrailPreview
                    .map((p) => `${pan.x + p.x * zoomLevel},${pan.y + p.y * zoomLevel}`)
                    .join(' ')}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.82"
                  strokeWidth={Math.max(2, cropToolsConfig.eraserSize * zoomLevel)}
                  strokeLinecap={cropToolsConfig.eraserNib === 'square' ? 'square' : 'round'}
                  strokeLinejoin={cropToolsConfig.eraserNib === 'square' ? 'miter' : 'round'}
                />
              )}
              {activeTool === 'eraser' && eraserCursorPt && (() => {
                const ex = pan.x + eraserCursorPt.x * zoomLevel;
                const ey = pan.y + eraserCursorPt.y * zoomLevel;
                const er = (cropToolsConfig.eraserSize * zoomLevel) / 2;
                return cropToolsConfig.eraserNib === 'square' ? (
                  <rect
                    x={ex - er}
                    y={ey - er}
                    width={er * 2}
                    height={er * 2}
                    fill="rgba(255,255,255,0.22)"
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                ) : (
                  <circle
                    cx={ex}
                    cy={ey}
                    r={er}
                    fill="rgba(255,255,255,0.22)"
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                );
              })()}

              {/* AutoCAD Dynamic Input Dimension / Polar / Eyedropper HUD near Cursor */}
              {cadHud && (
                <g transform={`translate(${pan.x + cadHud.x * zoomLevel + 14}, ${pan.y + cadHud.y * zoomLevel + 18})`}>
                  <rect
                    x={0}
                    y={0}
                    width={cadHud.text.length * 6.4 + (cadHud.swatches ? 42 : 14)}
                    height={20}
                    rx={3}
                    fill="#0f172a"
                    fillOpacity="0.92"
                    stroke={activePolarGuide ? '#22c55e' : '#64748b'}
                    strokeWidth="1"
                  />
                  {cadHud.swatches && (
                    <>
                      <rect
                        x={6}
                        y={4}
                        width={11}
                        height={11}
                        rx={1.5}
                        fill={cadHud.swatches[0] === 'transparent' ? '#334155' : cadHud.swatches[0]}
                        stroke="#e2e8f0"
                        strokeWidth="0.9"
                      />
                      <rect
                        x={20}
                        y={4}
                        width={11}
                        height={11}
                        rx={1.5}
                        fill="none"
                        stroke={cadHud.swatches[1] === 'transparent' ? '#94a3b8' : cadHud.swatches[1]}
                        strokeWidth="2.5"
                      />
                    </>
                  )}
                  <text
                    x={cadHud.swatches ? 37 : 7}
                    y={13.5}
                    fill={activePolarGuide ? '#86efac' : '#e2e8f0'}
                    fontSize="10"
                    fontFamily="Consolas, Monaco, monospace"
                    fontWeight="600"
                  >
                    {cadHud.text}
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* Collaborative Remote Cursors Overlay */}
          {collaborators
            .filter((user) => user.id !== currentUser.id && user.cursor)
            .map((user) => {
              const screenX = pan.x + (user.cursor?.x || 0) * zoomLevel;
              const screenY = pan.y + (user.cursor?.y || 0) * zoomLevel;

              return (
                <div
                  key={user.id}
                  className="absolute pointer-events-none z-30 transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${screenX}px, ${screenY}px)`,
                  }}
                >
                  {/* Cursor Arrow */}
                  <svg className="w-5 h-5 -rotate-45 drop-shadow" viewBox="0 0 24 24" fill={user.color}>
                    <path d="M3 3l7 18 3-7 7-3L3 3z" stroke="#000" strokeWidth="1.5" />
                  </svg>
                  {/* Designer Badge */}
                  <div
                    style={{ backgroundColor: user.color }}
                    className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white shadow whitespace-nowrap"
                  >
                    {user.name}
                  </div>
                </div>
              );
            })}

          {/* Workspace Horizontal & Vertical Scrollbars */}
          {showScrollbars && (
            <>
              {/* Vertical Scrollbar */}
              <div
                className={`absolute top-0 right-0 bottom-3.5 w-3.5 z-30 border-l flex flex-col items-center justify-center ${
                  theme === 'dark' ? 'bg-[#46494f] border-[#646870]' : 'bg-[#e4e5e8] border-[#c5c8cf]'
                }`}
              >
                <input
                  type="range"
                  min={-600}
                  max={400}
                  value={pan.y}
                  onChange={(e) => setPan((prev) => ({ ...prev, y: Number(e.target.value) }))}
                  title="Vertical Workspace Scroll"
                  className="w-28 h-2 accent-zinc-500 cursor-pointer -rotate-90 opacity-75 hover:opacity-100"
                />
              </div>

              {/* Horizontal Scrollbar */}
              <div
                className={`absolute left-0 right-3.5 bottom-0 h-3.5 z-30 border-t flex items-center justify-center px-2 ${
                  theme === 'dark' ? 'bg-[#46494f] border-[#646870]' : 'bg-[#e4e5e8] border-[#c5c8cf]'
                }`}
              >
                <input
                  type="range"
                  min={-800}
                  max={600}
                  value={pan.x}
                  onChange={(e) => setPan((prev) => ({ ...prev, x: Number(e.target.value) }))}
                  title="Horizontal Workspace Scroll"
                  className="w-full max-w-md h-1.5 accent-zinc-500 cursor-pointer opacity-75 hover:opacity-100"
                />
              </div>
            </>
          )}

          {/* CorelDRAW Bottom-Right Document Navigator Corner Button & Minimap Popup */}
          {showDocNavigator && (
            <div className="absolute right-0 bottom-0 z-40">
              {docNavOpen && (
                <div
                  className={`absolute right-4 bottom-4 w-44 rounded border shadow-2xl p-2 ${
                    theme === 'dark'
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold mb-1.5">
                    <span>Document Navigator</span>
                    <button onClick={() => setDocNavOpen(false)} className="px-1 hover:text-red-500">✕</button>
                  </div>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const rx = (e.clientX - rect.left) / rect.width;
                      const ry = (e.clientY - rect.top) / rect.height;
                      const deskW = deskRef.current?.clientWidth || 800;
                      const deskH = deskRef.current?.clientHeight || 600;
                      setPan({
                        x: Math.round(deskW / 2 - rx * pageConfig.width * zoomLevel),
                        y: Math.round(deskH / 2 - ry * pageConfig.height * zoomLevel),
                      });
                    }}
                    className="relative w-full h-32 bg-white border border-zinc-400 cursor-crosshair overflow-hidden flex items-center justify-center"
                    title="Click anywhere to pan viewport"
                  >
                    {docNavPreviewUrl ? (
                      <img src={docNavPreviewUrl} alt="Navigator" className="w-full h-full object-contain pointer-events-none" />
                    ) : (
                      <span className="text-[10px] text-zinc-400">{pageConfig.preset}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <button
                      onClick={() => {
                        setPan({ x: 60, y: 40 });
                        onZoomChange(0.85);
                      }}
                      className="px-2 py-0.5 bg-[#0078d7] text-white rounded hover:bg-[#0063b1]"
                    >
                      Center Page
                    </button>
                    <span className="font-mono">{Math.round(zoomLevel * 100)}%</span>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  if (!docNavOpen && fabricRef.current) {
                    try {
                      setDocNavPreviewUrl(
                        fabricRef.current.toDataURL({
                          format: 'png',
                          multiplier: 0.25,
                          left: 0,
                          top: 0,
                          width: pageConfig.width,
                          height: pageConfig.height,
                        })
                      );
                    } catch {}
                  }
                  setDocNavOpen((prev) => !prev);
                }}
                title="Document Navigator"
                className={`w-3.5 h-3.5 flex items-center justify-center border-t border-l text-[9px] font-bold ${
                  theme === 'dark'
                    ? 'bg-[#4d5056] border-[#6a6e77] text-sky-300 hover:bg-[#5c6068]'
                    : 'bg-[#d8dade] border-[#b5b8bd] text-zinc-700 hover:bg-[#c5c8cf]'
                }`}
              >
                ✛
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CorelDRAW Authentic Right-Click Context Menu */}
      {contextMenuPos && (
        <CorelContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          selectedObject={fabricRef.current?.getActiveObject() || null}
          canvas={fabricRef.current}
          theme={theme}
          onClose={() => setContextMenuPos(null)}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          canPaste={canPaste}
          onCut={onCut}
          onCopy={onCopy}
          onPaste={onPaste}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
          onPowerClipPlace={onPowerClipPlace}
          onPowerClipEdit={() => {
            const active = fabricRef.current?.getActiveObject();
            if (active && onPowerClipEdit) onPowerClipEdit(active);
          }}
          onPowerClipFinish={onPowerClipFinish}
          onPowerClipExtract={onPowerClipExtract}
          isPowerClipEditing={isPowerClipEditing}
          onGroup={onGroup}
          onUngroup={onUngroup}
          onUngroupAll={onUngroupAll}
          onEnterGroupEdit={(target) => {
            const active = target || fabricRef.current?.getActiveObject();
            if (active && onGroupEditEnter) onGroupEditEnter(active);
          }}
          onExitGroupEdit={onGroupEditFinish}
          isGroupEditing={isGroupEditing}
          onConvertToCurves={onConvertToCurves}
          onBringIntoFocus={onBringIntoFocus}
          onBreakApart={onBreakApart}
          onToggleHide={onToggleHide}
          onToggleLock={onToggleLock}
          onOpenProperties={onOpenProperties}
          onOpenPageSetup={onOpenPageSetup}
          onAlignToPixelGrid={onAlignToPixelGrid}
          onCreateSymmetry={onCreateSymmetry}
          onCreateSymbol={onCreateSymbol}
        />
      )}
    </div>
  );
};
