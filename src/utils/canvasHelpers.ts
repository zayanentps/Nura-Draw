import * as fabric from 'fabric';
import { DimensionConfig, PageConfig } from '../types';
import { UnitType, UNITS_DATA, pxToUnit } from './units';

export function getObjectLabel(obj: fabric.FabricObject): string {
  if (obj.type === 'activeselection') {
    const count = (obj as fabric.ActiveSelection).getObjects?.()?.length || 0;
    return `${count} Objects Selected`;
  }
  if ((obj as any).name) return (obj as any).name;
  const type = obj.type || 'Object';
  switch (type) {
    case 'rect':
      return 'Rectangle';
    case 'circle':
      return 'Circle';
    case 'ellipse':
      return 'Ellipse';
    case 'i-text':
    case 'text':
      return `Text ("${((obj as any).text || '').slice(0, 12)}...")`;
    case 'path':
      return 'Curve / Path';
    case 'polygon':
      return 'Polygon';
    case 'group':
      return `Group (${(obj as fabric.Group).getObjects?.()?.length || 0} items)`;
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function disableObjectCaching(obj: fabric.FabricObject | null | undefined): void {
  if (!obj) return;
  (obj as any).objectCaching = false;
  (obj as any).noScaleCache = false;
  if (typeof (obj as any)._removeCacheCanvas === 'function') {
    (obj as any)._removeCacheCanvas();
  }
  if ((obj as any).clipPath) {
    disableObjectCaching((obj as any).clipPath);
  }
  if (typeof (obj as any).getObjects === 'function') {
    const children = (obj as any).getObjects() as fabric.FabricObject[];
    if (Array.isArray(children)) {
      for (const child of children) {
        disableObjectCaching(child);
      }
    }
  }
}

export function ensureObjectId(obj: fabric.FabricObject, customName?: string): string {
  disableObjectCaching(obj);
  if (!(obj as any).id) {
    (obj as any).id = 'obj_' + Math.random().toString(36).substring(2, 9);
  }
  if (!(obj as any).name) {
    (obj as any).name = customName || getObjectLabel(obj);
  }
  return (obj as any).id;
}

export function createStarPoints(points: number = 5, outerRadius: number = 50, innerRadius: number = 25) {
  const step = Math.PI / points;
  const path: { x: number; y: number }[] = [];
  let angle = -Math.PI / 2;

  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    path.push({
      x: outerRadius + r * Math.cos(angle),
      y: outerRadius + r * Math.sin(angle),
    });
    angle += step;
  }
  return path;
}

export function createPolygonPoints(sides: number = 6, radius: number = 50) {
  const points: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2;
    points.push({
      x: radius + radius * Math.cos(angle),
      y: radius + radius * Math.sin(angle),
    });
  }
  return points;
}

export function createSpiralPath(turns: number = 3, maxRadius: number = 60): string {
  const totalSteps = turns * 40;
  const angleStep = (turns * 2 * Math.PI) / totalSteps;
  const radiusStep = maxRadius / totalSteps;

  let pathStr = '';
  for (let i = 0; i <= totalSteps; i++) {
    const angle = i * angleStep;
    const r = i * radiusStep;
    const x = maxRadius + r * Math.cos(angle);
    const y = maxRadius + r * Math.sin(angle);
    if (i === 0) {
      pathStr += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      pathStr += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return pathStr;
}

export function formatDimensionValue(
  pxDistance: number,
  pageUnit: UnitType = 'px',
  config?: DimensionConfig
): string {
  const effectiveUnit: UnitType = !config?.unit || config.unit === 'auto' ? pageUnit : config.unit;
  const info = UNITS_DATA[effectiveUnit] || UNITS_DATA.px;
  const decimals = config?.precision !== undefined ? config.precision : info.decimals;
  const val = pxToUnit(pxDistance, effectiveUnit, decimals);
  const numStr = val.toFixed(decimals);
  return config?.showUnit === false ? numStr : `${numStr} ${info.symbol}`;
}

function buildArrowHead(
  tipX: number,
  tipY: number,
  inwardAngleRad: number,
  size: number = 9,
  color: string = '#1e293b'
): fabric.Polygon {
  const spread = Math.PI / 7; // ~25.7 deg half-angle
  const bx1 = tipX - Math.cos(inwardAngleRad - spread) * size;
  const by1 = tipY - Math.sin(inwardAngleRad - spread) * size;
  const bx2 = tipX - Math.cos(inwardAngleRad + spread) * size;
  const by2 = tipY - Math.sin(inwardAngleRad + spread) * size;
  return new fabric.Polygon(
    [
      { x: tipX, y: tipY },
      { x: bx1, y: by1 },
      { x: bx2, y: by2 },
    ],
    {
      fill: color,
      strokeWidth: 0,
      strokeUniform: true,
    }
  );
}

function buildTickCap(
  cx: number,
  cy: number,
  axisAngleRad: number,
  length: number = 10,
  color: string = '#1e293b'
): fabric.Line {
  const tickAngle = axisAngleRad + Math.PI / 4;
  const dx = Math.cos(tickAngle) * (length / 2);
  const dy = Math.sin(tickAngle) * (length / 2);
  return new fabric.Line([cx - dx, cy - dy, cx + dx, cy + dy], {
    stroke: color,
    strokeWidth: 2,
    strokeUniform: true,
  });
}

export function createDimensionObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: {
    pageUnit?: UnitType;
    config?: DimensionConfig;
    offset?: number;
    kind?: 'parallel' | 'segment';
    strokeColor?: string;
  }
): fabric.Group {
  const pxLen = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const offset = options?.offset ?? 0;
  const color = options?.strokeColor || '#1e293b';
  const cfg = options?.config;
  const style = cfg?.style || 'arrows';

  // Unit perpendicular normal (pointing "above" line in screen coords)
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);

  // Dimension line endpoints (shifted by offset if any)
  const dx1 = x1 + nx * offset;
  const dy1 = y1 + ny * offset;
  const dx2 = x2 + nx * offset;
  const dy2 = y2 + ny * offset;

  const items: fabric.FabricObject[] = [];

  // Extension / witness lines if offset !== 0
  if (Math.abs(offset) > 1) {
    const sign = offset >= 0 ? 1 : -1;
    const extOver = 5 * sign;
    const extGap = 3 * sign;
    items.push(
      new fabric.Line([x1 + nx * extGap, y1 + ny * extGap, dx1 + nx * extOver, dy1 + ny * extOver], {
        stroke: color,
        strokeWidth: 1.1,
        strokeUniform: true,
      }),
      new fabric.Line([x2 + nx * extGap, y2 + ny * extGap, dx2 + nx * extOver, dy2 + ny * extOver], {
        stroke: color,
        strokeWidth: 1.1,
        strokeUniform: true,
      })
    );
  } else {
    // End witness caps for direct parallel dimension
    const capLen = 7;
    items.push(
      new fabric.Line([dx1 - nx * capLen, dy1 - ny * capLen, dx1 + nx * capLen, dy1 + ny * capLen], {
        stroke: color,
        strokeWidth: 1.4,
        strokeUniform: true,
      }),
      new fabric.Line([dx2 - nx * capLen, dy2 - ny * capLen, dx2 + nx * capLen, dy2 + ny * capLen], {
        stroke: color,
        strokeWidth: 1.4,
        strokeUniform: true,
      })
    );
  }

  // Main dimension line
  items.push(
    new fabric.Line([dx1, dy1, dx2, dy2], {
      stroke: color,
      strokeWidth: 1.6,
      strokeUniform: true,
    })
  );

  // End markers (Arrows or 45-deg Architectural Ticks)
  if (pxLen > 8) {
    if (style === 'ticks') {
      items.push(buildTickCap(dx1, dy1, angle, 10, color), buildTickCap(dx2, dy2, angle, 10, color));
    } else {
      items.push(
        buildArrowHead(dx1, dy1, angle + Math.PI, 9, color),
        buildArrowHead(dx2, dy2, angle, 9, color)
      );
    }
  }

  // Upright readable text angle in [-90, 90]
  let deg = (angle * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;

  const midX = (dx1 + dx2) / 2;
  const midY = (dy1 + dy2) / 2;
  const textOffset = cfg?.textPosition === 'center' ? 0 : 12;
  // Always nudge text slightly above visual line
  const radUpright = (deg * Math.PI) / 180;
  const tx = midX + Math.sin(radUpright) * textOffset;
  const ty = midY - Math.cos(radUpright) * textOffset;

  const label = formatDimensionValue(pxLen, options?.pageUnit || 'px', cfg);
  const text = new fabric.IText(label, {
    left: tx,
    top: ty,
    originX: 'center',
    originY: 'center',
    angle: deg,
    fontSize: 12,
    fontFamily: 'Montserrat',
    fontWeight: 'bold',
    fill: '#0f172a',
    backgroundColor: 'rgba(255,255,255,0.9)',
  });
  items.push(text);

  const group = new fabric.Group(items, { subTargetCheck: true });
  (group as any).isDimension = true;
  (group as any).dimensionKind = options?.kind || 'parallel';
  ensureObjectId(
    group,
    `${options?.kind === 'segment' ? 'Segment' : 'Parallel'} Dimension (${label})`
  );
  return group;
}

export function createHVDimensionObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: {
    pageUnit?: UnitType;
    config?: DimensionConfig;
    strokeColor?: string;
  }
): fabric.Group {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const isHorizontal = dx >= dy;
  const color = options?.strokeColor || '#1e293b';
  const cfg = options?.config;
  const style = cfg?.style || 'arrows';

  const items: fabric.FabricObject[] = [];
  let pxLen = 0;

  if (isHorizontal) {
    pxLen = dx;
    const dimY = y2;
    const extSign = dimY >= y1 ? 1 : -1;
    // Extension lines from measured points to dimension line y = dimY
    if (Math.abs(dimY - y1) > 2) {
      items.push(
        new fabric.Line([x1, y1 + 3 * extSign, x1, dimY + 5 * extSign], {
          stroke: color,
          strokeWidth: 1.1,
          strokeUniform: true,
        })
      );
    } else {
      items.push(
        new fabric.Line([x1, dimY - 7, x1, dimY + 7], {
          stroke: color,
          strokeWidth: 1.4,
          strokeUniform: true,
        })
      );
    }
    items.push(
      new fabric.Line([x2, dimY - 7, x2, dimY + 7], {
        stroke: color,
        strokeWidth: 1.4,
        strokeUniform: true,
      }),
      new fabric.Line([x1, dimY, x2, dimY], {
        stroke: color,
        strokeWidth: 1.6,
        strokeUniform: true,
      })
    );

    if (pxLen > 8) {
      const dir = x2 >= x1 ? 0 : Math.PI;
      if (style === 'ticks') {
        items.push(buildTickCap(x1, dimY, dir, 10, color), buildTickCap(x2, dimY, dir, 10, color));
      } else {
        items.push(
          buildArrowHead(x1, dimY, dir + Math.PI, 9, color),
          buildArrowHead(x2, dimY, dir, 9, color)
        );
      }
    }

    const label = formatDimensionValue(pxLen, options?.pageUnit || 'px', cfg);
    const ty = cfg?.textPosition === 'center' ? dimY : dimY - 12;
    items.push(
      new fabric.IText(label, {
        left: (x1 + x2) / 2,
        top: ty,
        originX: 'center',
        originY: 'center',
        fontSize: 12,
        fontFamily: 'Montserrat',
        fontWeight: 'bold',
        fill: '#0f172a',
        backgroundColor: 'rgba(255,255,255,0.9)',
      })
    );

    const group = new fabric.Group(items, { subTargetCheck: true });
    (group as any).isDimension = true;
    (group as any).dimensionKind = 'horizontal';
    ensureObjectId(group, `Horizontal Dimension (${label})`);
    return group;
  } else {
    pxLen = dy;
    const dimX = x2;
    const extSign = dimX >= x1 ? 1 : -1;
    if (Math.abs(dimX - x1) > 2) {
      items.push(
        new fabric.Line([x1 + 3 * extSign, y1, dimX + 5 * extSign, y1], {
          stroke: color,
          strokeWidth: 1.1,
          strokeUniform: true,
        })
      );
    } else {
      items.push(
        new fabric.Line([dimX - 7, y1, dimX + 7, y1], {
          stroke: color,
          strokeWidth: 1.4,
          strokeUniform: true,
        })
      );
    }
    items.push(
      new fabric.Line([dimX - 7, y2, dimX + 7, y2], {
        stroke: color,
        strokeWidth: 1.4,
        strokeUniform: true,
      }),
      new fabric.Line([dimX, y1, dimX, y2], {
        stroke: color,
        strokeWidth: 1.6,
        strokeUniform: true,
      })
    );

    if (pxLen > 8) {
      const dir = y2 >= y1 ? Math.PI / 2 : -Math.PI / 2;
      if (style === 'ticks') {
        items.push(buildTickCap(dimX, y1, dir, 10, color), buildTickCap(dimX, y2, dir, 10, color));
      } else {
        items.push(
          buildArrowHead(dimX, y1, dir + Math.PI, 9, color),
          buildArrowHead(dimX, y2, dir, 9, color)
        );
      }
    }

    const label = formatDimensionValue(pxLen, options?.pageUnit || 'px', cfg);
    const tx = cfg?.textPosition === 'center' ? dimX : dimX - 12;
    items.push(
      new fabric.IText(label, {
        left: tx,
        top: (y1 + y2) / 2,
        originX: 'center',
        originY: 'center',
        angle: -90,
        fontSize: 12,
        fontFamily: 'Montserrat',
        fontWeight: 'bold',
        fill: '#0f172a',
        backgroundColor: 'rgba(255,255,255,0.9)',
      })
    );

    const group = new fabric.Group(items, { subTargetCheck: true });
    (group as any).isDimension = true;
    (group as any).dimensionKind = 'vertical';
    ensureObjectId(group, `Vertical Dimension (${label})`);
    return group;
  }
}

export function createAngularDimensionObject(
  vx: number,
  vy: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  options?: {
    config?: DimensionConfig;
    strokeColor?: string;
  }
): fabric.Group {
  const color = options?.strokeColor || '#1e293b';
  const cfg = options?.config;
  const r1 = Math.hypot(p1x - vx, p1y - vy);
  const r2 = Math.hypot(p2x - vx, p2y - vy);
  const a1 = Math.atan2(p1y - vy, p1x - vx);
  const a2 = Math.atan2(p2y - vy, p2x - vx);

  // Shortest signed angular sweep in [-PI, PI]
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  const degAbs = (Math.abs(delta) * 180) / Math.PI;
  const precision = cfg?.precision !== undefined ? Math.min(2, cfg.precision) : 1;
  const label = `${degAbs.toFixed(precision)}°`;

  const arcRadius = Math.max(24, Math.min(160, Math.min(r1 || 60, r2 || 60) * 0.72));
  const arcStartX = vx + Math.cos(a1) * arcRadius;
  const arcStartY = vy + Math.sin(a1) * arcRadius;
  const arcEndX = vx + Math.cos(a1 + delta) * arcRadius;
  const arcEndY = vy + Math.sin(a1 + delta) * arcRadius;
  const sweepFlag = delta >= 0 ? 1 : 0;

  const items: fabric.FabricObject[] = [
    // Ray extension lines
    new fabric.Line([vx, vy, p1x, p1y], {
      stroke: color,
      strokeWidth: 1.2,
      strokeDashArray: [4, 3],
      strokeUniform: true,
    }),
    new fabric.Line([vx, vy, p2x, p2y], {
      stroke: color,
      strokeWidth: 1.2,
      strokeDashArray: [4, 3],
      strokeUniform: true,
    }),
    // Arc path
    new fabric.Path(
      `M ${arcStartX.toFixed(2)} ${arcStartY.toFixed(2)} A ${arcRadius.toFixed(2)} ${arcRadius.toFixed(2)} 0 0 ${sweepFlag} ${arcEndX.toFixed(2)} ${arcEndY.toFixed(2)}`,
      {
        fill: 'transparent',
        stroke: color,
        strokeWidth: 1.8,
        strokeUniform: true,
      }
    ),
  ];

  // Tangent arrowheads on arc ends
  if (Math.abs(delta) > 0.08) {
    const tangentSign = delta >= 0 ? 1 : -1;
    const startTangent = a1 + tangentSign * (Math.PI / 2);
    const endTangent = a1 + delta + tangentSign * (Math.PI / 2);
    items.push(
      buildArrowHead(arcStartX, arcStartY, startTangent + Math.PI, 8.5, color),
      buildArrowHead(arcEndX, arcEndY, endTangent, 8.5, color)
    );
  }

  const midAngle = a1 + delta / 2;
  const textDist = cfg?.textPosition === 'center' ? arcRadius : arcRadius + 14;
  const tx = vx + Math.cos(midAngle) * textDist;
  const ty = vy + Math.sin(midAngle) * textDist;

  items.push(
    new fabric.IText(label, {
      left: tx,
      top: ty,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fontFamily: 'Montserrat',
      fontWeight: 'bold',
      fill: '#0f172a',
      backgroundColor: 'rgba(255,255,255,0.92)',
    })
  );

  const group = new fabric.Group(items, { subTargetCheck: true });
  (group as any).isDimension = true;
  (group as any).dimensionKind = 'angular';
  ensureObjectId(group, `Angular Dimension (${label})`);
  return group;
}

export function createCalloutObject(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  labelText: string = 'Callout',
  strokeColor: string = '#1e293b'
): fabric.Group {
  const dirAngle = Math.atan2(p1y - p2y, p1x - p2x);
  const shoulderX = Math.abs(p3x - p2x) < 10 ? p2x + (p2x >= p1x ? 48 : -48) : p3x;
  const isRight = shoulderX >= p2x;

  const leaderPath = new fabric.Path(
    `M ${p1x.toFixed(1)} ${p1y.toFixed(1)} L ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${shoulderX.toFixed(1)} ${p2y.toFixed(1)}`,
    {
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: 1.8,
      strokeUniform: true,
    }
  );

  const tipArrow = buildArrowHead(p1x, p1y, dirAngle, 9, strokeColor);

  const labelOffsetX = isRight ? shoulderX + 6 : shoulderX - 6;
  const text = new fabric.IText(labelText, {
    left: labelOffsetX,
    top: p2y,
    originX: isRight ? 'left' : 'right',
    originY: 'center',
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fill: '#0f172a',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 2,
  });

  const group = new fabric.Group([leaderPath, tipArrow, text], { subTargetCheck: true });
  (group as any).isDimension = true;
  (group as any).dimensionKind = 'callout';
  ensureObjectId(group, `Callout (${labelText})`);
  return group;
}

export interface ObjectSegmentHit {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthPx: number;
  distancePx: number;
}

function closestDistPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function findNearestObjectSegment(
  objects: fabric.FabricObject[],
  px: number,
  py: number,
  _pageConfig: PageConfig,
  tolerancePx: number = 14
): ObjectSegmentHit | null {
  let best: ObjectSegmentHit | null = null;

  const considerSegment = (x1: number, y1: number, x2: number, y2: number) => {
    const lengthPx = Math.hypot(x2 - x1, y2 - y1);
    if (lengthPx < 3) return;
    const d = closestDistPointToSegment(px, py, x1, y1, x2, y2);
    if (d <= tolerancePx && (!best || d < best.distancePx)) {
      best = { x1, y1, x2, y2, lengthPx, distancePx: d };
    }
  };

  for (const obj of objects) {
    if (!obj || obj.visible === false || (obj as any).isDimension) continue;

    if (obj.type === 'line') {
      const line = obj as fabric.Line;
      const pts = line.calcLinePoints();
      const mat = line.calcTransformMatrix();
      const p1 = fabric.util.transformPoint(new fabric.Point(pts.x1, pts.y1), mat);
      const p2 = fabric.util.transformPoint(new fabric.Point(pts.x2, pts.y2), mat);
      considerSegment(p1.x, p1.y, p2.x, p2.y);
      continue;
    }

    if (obj.type === 'polygon' || obj.type === 'polyline') {
      const poly = obj as fabric.Polygon;
      const pts = poly.points || [];
      const offset = poly.pathOffset || new fabric.Point(0, 0);
      const mat = poly.calcTransformMatrix();
      const transformed = pts.map((pt) =>
        fabric.util.transformPoint(new fabric.Point(pt.x - offset.x, pt.y - offset.y), mat)
      );
      for (let i = 0; i < transformed.length; i++) {
        const a = transformed[i];
        const b = transformed[(i + 1) % transformed.length];
        if (i === transformed.length - 1 && obj.type === 'polyline') break;
        considerSegment(a.x, a.y, b.x, b.y);
      }
      continue;
    }

    if (obj.type === 'path') {
      const pathObj = obj as fabric.Path;
      const cmds: any[] = pathObj.path || [];
      const offset = pathObj.pathOffset || new fabric.Point(0, 0);
      const mat = pathObj.calcTransformMatrix();
      const toWorld = (lx: number, ly: number) =>
        fabric.util.transformPoint(new fabric.Point(lx - offset.x, ly - offset.y), mat);

      let curX = 0;
      let curY = 0;
      let startX = 0;
      let startY = 0;
      for (const c of cmds) {
        const type = c[0];
        if (type === 'M') {
          curX = c[1];
          curY = c[2];
          startX = curX;
          startY = curY;
        } else if (type === 'L') {
          const p1 = toWorld(curX, curY);
          const p2 = toWorld(c[1], c[2]);
          considerSegment(p1.x, p1.y, p2.x, p2.y);
          curX = c[1];
          curY = c[2];
        } else if (type === 'C') {
          const p1 = toWorld(curX, curY);
          const p2 = toWorld(c[5], c[6]);
          considerSegment(p1.x, p1.y, p2.x, p2.y);
          curX = c[5];
          curY = c[6];
        } else if (type === 'Q') {
          const p1 = toWorld(curX, curY);
          const p2 = toWorld(c[3], c[4]);
          considerSegment(p1.x, p1.y, p2.x, p2.y);
          curX = c[3];
          curY = c[4];
        } else if (type === 'Z' || type === 'z') {
          const p1 = toWorld(curX, curY);
          const p2 = toWorld(startX, startY);
          considerSegment(p1.x, p1.y, p2.x, p2.y);
          curX = startX;
          curY = startY;
        }
      }
      continue;
    }

    // Rectangles, groups, text boxes -> 4 corner edges via aCoords
    obj.setCoords();
    const coords = obj.getCoords();
    if (coords && coords.length === 4) {
      for (let i = 0; i < 4; i++) {
        const a = coords[i];
        const b = coords[(i + 1) % 4];
        considerSegment(a.x, a.y, b.x, b.y);
      }
    }
  }

  return best;
}

export function createConnectorObject(x1: number, y1: number, x2: number, y2: number): fabric.Group {
  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: '#334155',
    strokeWidth: 2,
  });

  const startNode = new fabric.Rect({
    left: x1 - 4,
    top: y1 - 4,
    width: 8,
    height: 8,
    fill: '#f97316',
    stroke: '#1e293b',
    strokeWidth: 1.5,
  });

  const endNode = new fabric.Rect({
    left: x2 - 4,
    top: y2 - 4,
    width: 8,
    height: 8,
    fill: '#f97316',
    stroke: '#1e293b',
    strokeWidth: 1.5,
  });

  const group = new fabric.Group([line, startNode, endNode]);
  ensureObjectId(group, 'Connector Line');
  return group;
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-page';
export type AlignTarget = 'objects' | 'page' | 'key-object';

export function alignObjects(
  canvas: fabric.Canvas,
  alignment: AlignMode,
  pageWidth: number,
  pageHeight: number,
  target: AlignTarget = 'objects'
) {
  const activeObj = canvas.getActiveObject();
  if (!activeObj) return;

  const rawObjects = canvas.getActiveObjects();
  if (!rawObjects || rawObjects.length === 0) return;

  // Case 1: Single object selected OR explicitly targeting Page
  if (rawObjects.length === 1 || target === 'page') {
    const isMulti = rawObjects.length > 1;
    const objects = [...rawObjects];

    if (isMulti) {
      canvas.discardActiveObject();
    }

    if (isMulti) {
      const items = objects.map((obj) => {
        const rect = obj.getBoundingRect();
        return {
          obj,
          rect,
          left: rect.left,
          right: rect.left + rect.width,
          centerX: rect.left + rect.width / 2,
          top: rect.top,
          bottom: rect.top + rect.height,
          centerY: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      });

      const minLeft = Math.min(...items.map((i) => i.left));
      const maxRight = Math.max(...items.map((i) => i.right));
      const minTop = Math.min(...items.map((i) => i.top));
      const maxBottom = Math.max(...items.map((i) => i.bottom));
      const groupCenterX = (minLeft + maxRight) / 2;
      const groupCenterY = (minTop + maxBottom) / 2;

      let dx = 0;
      let dy = 0;

      switch (alignment) {
        case 'left':
          dx = 0 - minLeft;
          break;
        case 'center':
          dx = pageWidth / 2 - groupCenterX;
          break;
        case 'right':
          dx = pageWidth - maxRight;
          break;
        case 'top':
          dy = 0 - minTop;
          break;
        case 'middle':
          dy = pageHeight / 2 - groupCenterY;
          break;
        case 'bottom':
          dy = pageHeight - maxBottom;
          break;
        case 'center-page':
          dx = pageWidth / 2 - groupCenterX;
          dy = pageHeight / 2 - groupCenterY;
          break;
      }

      items.forEach((item) => {
        item.obj.set({
          left: (item.obj.left || 0) + dx,
          top: (item.obj.top || 0) + dy,
        });
        item.obj.setCoords();
      });

      const newSelection = new fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(newSelection);
    } else {
      const obj = objects[0];
      const rect = obj.getBoundingRect();
      let dx = 0;
      let dy = 0;

      switch (alignment) {
        case 'left':
          dx = 0 - rect.left;
          break;
        case 'center':
          dx = pageWidth / 2 - (rect.left + rect.width / 2);
          break;
        case 'right':
          dx = pageWidth - (rect.left + rect.width);
          break;
        case 'top':
          dy = 0 - rect.top;
          break;
        case 'middle':
          dy = pageHeight / 2 - (rect.top + rect.height / 2);
          break;
        case 'bottom':
          dy = pageHeight - (rect.top + rect.height);
          break;
        case 'center-page':
          dx = pageWidth / 2 - (rect.left + rect.width / 2);
          dy = pageHeight / 2 - (rect.top + rect.height / 2);
          break;
      }

      obj.set({
        left: (obj.left || 0) + dx,
        top: (obj.top || 0) + dy,
      });
      obj.setCoords();
    }

    canvas.requestRenderAll();
    canvas.fire('object:modified');
    return;
  }

  // Case 2: Multiple objects selected -> Pure Object-to-Object Alignment!
  const objects = [...rawObjects];

  // Discard active selection to obtain pure absolute canvas coordinates
  canvas.discardActiveObject();

  // Measure every object's absolute bounding box on the canvas
  const items = objects.map((obj) => {
    const rect = obj.getBoundingRect();
    return {
      obj,
      rect,
      left: rect.left,
      right: rect.left + rect.width,
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.top + rect.height,
      centerY: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  });

  const minLeft = Math.min(...items.map((i) => i.left));
  const maxRight = Math.max(...items.map((i) => i.right));
  const minTop = Math.min(...items.map((i) => i.top));
  const maxBottom = Math.max(...items.map((i) => i.bottom));
  const groupCenterX = (minLeft + maxRight) / 2;
  const groupCenterY = (minTop + maxBottom) / 2;

  // Key Object (target object = last selected object)
  const keyItem = items[items.length - 1];

  let targetLeft = minLeft;
  let targetRight = maxRight;
  let targetCenterX = groupCenterX;
  let targetTop = minTop;
  let targetBottom = maxBottom;
  let targetCenterY = groupCenterY;

  if (target === 'key-object') {
    targetLeft = keyItem.left;
    targetRight = keyItem.right;
    targetCenterX = keyItem.centerX;
    targetTop = keyItem.top;
    targetBottom = keyItem.bottom;
    targetCenterY = keyItem.centerY;
  }

  // Shift each object so that the corresponding edge/center aligns with target
  items.forEach((item) => {
    let dx = 0;
    let dy = 0;

    switch (alignment) {
      case 'left':
        dx = targetLeft - item.left;
        break;
      case 'center':
        dx = targetCenterX - item.centerX;
        break;
      case 'right':
        dx = targetRight - item.right;
        break;
      case 'top':
        dy = targetTop - item.top;
        break;
      case 'middle':
        dy = targetCenterY - item.centerY;
        break;
      case 'bottom':
        dy = targetBottom - item.bottom;
        break;
      case 'center-page':
        dx = pageWidth / 2 - groupCenterX;
        dy = pageHeight / 2 - groupCenterY;
        break;
    }

    item.obj.set({
      left: (item.obj.left || 0) + dx,
      top: (item.obj.top || 0) + dy,
    });
    item.obj.setCoords();
  });

  // Re-establish ActiveSelection with recalculated bounds
  const newSelection = new fabric.ActiveSelection(objects, { canvas });
  canvas.setActiveObject(newSelection);
  canvas.requestRenderAll();
  canvas.fire('object:modified');
}

export function distributeObjects(
  canvas: fabric.Canvas,
  direction: 'horizontal' | 'vertical'
) {
  const activeObj = canvas.getActiveObject();
  if (!activeObj) return;

  const rawObjects = canvas.getActiveObjects();
  if (!rawObjects || rawObjects.length < 3) return;

  const objects = [...rawObjects];
  canvas.discardActiveObject();

  const items = objects.map((obj) => {
    const rect = obj.getBoundingRect();
    return {
      obj,
      rect,
      left: rect.left,
      right: rect.left + rect.width,
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.top + rect.height,
      centerY: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  });

  if (direction === 'horizontal') {
    items.sort((a, b) => a.left - b.left);
    const minLeft = items[0].left;
    const maxRight = items[items.length - 1].right;
    const totalItemWidth = items.reduce((acc, curr) => acc + curr.width, 0);
    const totalGap = (maxRight - minLeft) - totalItemWidth;
    const spacing = totalGap / (items.length - 1);

    let curLeft = minLeft;
    items.forEach((item) => {
      const dx = curLeft - item.left;
      item.obj.set({ left: (item.obj.left || 0) + dx });
      item.obj.setCoords();
      curLeft += item.width + spacing;
    });
  } else {
    items.sort((a, b) => a.top - b.top);
    const minTop = items[0].top;
    const maxBottom = items[items.length - 1].bottom;
    const totalItemHeight = items.reduce((acc, curr) => acc + curr.height, 0);
    const totalGap = (maxBottom - minTop) - totalItemHeight;
    const spacing = totalGap / (items.length - 1);

    let curTop = minTop;
    items.forEach((item) => {
      const dy = curTop - item.top;
      item.obj.set({ top: (item.obj.top || 0) + dy });
      item.obj.setCoords();
      curTop += item.height + spacing;
    });
  }

  const newSelection = new fabric.ActiveSelection(objects, { canvas });
  canvas.setActiveObject(newSelection);
  canvas.requestRenderAll();
  canvas.fire('object:modified');
}

export async function applyBlockShadowToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  offsetX: number = 16,
  offsetY: number = 16,
  shadowColor: string = '#1e293b'
): Promise<fabric.Group | null> {
  const dist = Math.hypot(offsetX, offsetY);
  const steps = Math.max(8, Math.min(28, Math.round(dist)));
  const insertIdx = Math.max(0, canvas.getObjects().indexOf(target));
  const clones: fabric.FabricObject[] = [];
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const c = await target.clone();
    c.set({
      left: (target.left || 0) + offsetX * t,
      top: (target.top || 0) + offsetY * t,
      fill: shadowColor,
      stroke: shadowColor,
      shadow: null,
      opacity: 1,
    });
    disableObjectCaching(c);
    clones.push(c);
  }
  const blockGroup = new fabric.Group(clones, { subTargetCheck: true });
  ensureObjectId(blockGroup, 'Block Shadow');
  (blockGroup as any).hasEffects = true;
  (target as any).hasEffects = true;
  canvas.insertAt(insertIdx, blockGroup);
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
  return blockGroup;
}

export async function applyExtrudeToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  offsetX: number = 22,
  offsetY: number = 22,
  extrudeColor: string = '#334155'
): Promise<fabric.Group | null> {
  const steps = 12;
  const insertIdx = Math.max(0, canvas.getObjects().indexOf(target));
  const clones: fabric.FabricObject[] = [];
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const c = await target.clone();
    c.set({
      left: (target.left || 0) + offsetX * t,
      top: (target.top || 0) + offsetY * t,
      fill: extrudeColor,
      stroke: i === steps ? '#0f172a' : extrudeColor,
      shadow: null,
    });
    disableObjectCaching(c);
    clones.push(c);
  }
  const extGroup = new fabric.Group(clones, { subTargetCheck: true });
  ensureObjectId(extGroup, 'Extrude 3D');
  (extGroup as any).hasEffects = true;
  (target as any).hasEffects = true;
  canvas.insertAt(insertIdx, extGroup);
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
  return extGroup;
}

export async function applyContourToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  steps: number = 3,
  stepScale: number = 0.14,
  contourColor: string = '#0078d7'
): Promise<void> {
  const insertIdx = Math.max(0, canvas.getObjects().indexOf(target));
  const center = target.getCenterPoint();
  const baseSx = target.scaleX || 1;
  const baseSy = target.scaleY || 1;
  for (let i = steps; i >= 1; i--) {
    const factor = 1 + i * stepScale;
    const c = await target.clone();
    c.set({
      scaleX: baseSx * factor,
      scaleY: baseSy * factor,
      fill: i % 2 === 0 ? contourColor : '#38bdf8',
      stroke: contourColor,
      opacity: Math.max(0.25, 1 - i * 0.2),
      shadow: null,
    });
    c.setPositionByOrigin(center, 'center', 'center');
    ensureObjectId(c, `Contour Step ${i}`);
    disableObjectCaching(c);
    canvas.insertAt(insertIdx, c);
  }
  (target as any).hasEffects = true;
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
}

export async function applyBlendToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  target2?: fabric.FabricObject | null,
  steps: number = 4,
  offsetX: number = 22,
  offsetY: number = 22
): Promise<void> {
  if (target2 && target2 !== target) {
    const cA = target.getCenterPoint();
    const cB = target2.getCenterPoint();
    const insertIdx = Math.max(0, canvas.getObjects().indexOf(target));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const c = await target.clone();
      c.set({
        scaleX: (target.scaleX || 1) + ((target2.scaleX || 1) - (target.scaleX || 1)) * t,
        scaleY: (target.scaleY || 1) + ((target2.scaleY || 1) - (target.scaleY || 1)) * t,
        angle: (target.angle || 0) + ((target2.angle || 0) - (target.angle || 0)) * t,
        opacity: Math.max(0.25, (target.opacity ?? 1) * (1 - t) + (target2.opacity ?? 1) * t),
      });
      c.setPositionByOrigin(
        new fabric.Point(cA.x + (cB.x - cA.x) * t, cA.y + (cB.y - cA.y) * t),
        'center',
        'center'
      );
      ensureObjectId(c, `Blend Step ${i}`);
      disableObjectCaching(c);
      canvas.insertAt(insertIdx, c);
    }
    canvas.requestRenderAll();
    return;
  }

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const c = await target.clone();
    c.set({
      left: (target.left || 0) + offsetX * i,
      top: (target.top || 0) + offsetY * i,
      scaleX: (target.scaleX || 1) * (1 - t * 0.25),
      scaleY: (target.scaleY || 1) * (1 - t * 0.25),
      opacity: Math.max(0.2, 1 - t * 0.65),
    });
    ensureObjectId(c, `Blend Step ${i}`);
    disableObjectCaching(c);
    canvas.add(c);
  }
  (target as any).hasEffects = true;
  canvas.requestRenderAll();
}

export function applyDistortToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  mode: 'push_pull' | 'zipper' | 'twister' = 'push_pull',
  amplitude: number = 18
): fabric.FabricObject {
  const bound = target.getBoundingRect();
  const cx = bound.left + bound.width / 2;
  const cy = bound.top + bound.height / 2;
  const rx = Math.max(12, bound.width / 2);
  const ry = Math.max(12, bound.height / 2);

  // For vector shapes (rect, ellipse, circle, polygon, path), generate a genuine distorted vector Path
  if (['rect', 'ellipse', 'circle', 'polygon', 'path'].includes(target.type || '')) {
    const count = mode === 'zipper' ? 24 : mode === 'twister' ? 20 : 16;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      let mult = 1;
      let twist = 0;
      if (mode === 'push_pull') {
        mult = 1 + (i % 2 === 0 ? 0.28 : -0.22) * (amplitude / 18);
      } else if (mode === 'zipper') {
        mult = 1 + (i % 2 === 0 ? 0.18 : -0.18) * (amplitude / 18);
      } else {
        twist = 0.55 * (amplitude / 18);
      }
      pts.push({
        x: cx + Math.cos(a + twist) * rx * mult,
        y: cy + Math.sin(a + twist) * ry * mult,
      });
    }
    let d = '';
    if (mode === 'zipper') {
      d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    } else {
      d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        d += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      d += ' Z';
    }

    const idx = canvas.getObjects().indexOf(target);
    const distorted = new fabric.Path(d, {
      fill: target.fill ?? '#00a651',
      stroke: target.stroke ?? '#000000',
      strokeWidth: target.strokeWidth ?? 1,
      strokeUniform: true,
      opacity: target.opacity ?? 1,
      shadow: target.shadow || null,
    });
    (distorted as any).isCurve = true;
    (distorted as any).hasEffects = true;
    ensureObjectId(distorted, `Distort (${mode})`);
    canvas.remove(target);
    if (idx >= 0) canvas.insertAt(idx, distorted);
    else canvas.add(distorted);
    canvas.setActiveObject(distorted);
    canvas.requestRenderAll();
    return distorted;
  }

  // Fallback for text/image/groups: transform distortion
  target.set({
    skewX: mode === 'twister' ? 18 : -14,
    skewY: mode === 'push_pull' ? 12 : -8,
  });
  (target as any).hasEffects = true;
  target.setCoords();
  canvas.requestRenderAll();
  return target;
}

export function applyEnvelopeToObject(
  canvas: fabric.Canvas,
  target: fabric.FabricObject,
  preset: 'arc_top' | 'bulge' | 'skew_left' | 'skew_right' = 'arc_top',
  amount: number = 30
): void {
  if (preset === 'skew_left') {
    target.set({ skewX: -amount * 0.6, skewY: amount * 0.15 });
  } else if (preset === 'skew_right') {
    target.set({ skewX: amount * 0.6, skewY: -amount * 0.15 });
  } else if (preset === 'bulge') {
    target.set({
      scaleX: (target.scaleX || 1) * (1 + amount / 180),
      scaleY: (target.scaleY || 1) * (1 - amount / 300),
    });
  } else {
    target.set({
      skewY: amount * 0.35,
      angle: (target.angle || 0) + amount * 0.12,
    });
  }
  (target as any).hasEffects = true;
  target.setCoords();
  canvas.requestRenderAll();
}

