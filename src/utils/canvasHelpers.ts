import * as fabric from 'fabric';
import { DimensionConfig, DimensionData, PageConfig } from '../types';
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
  config?: Partial<DimensionConfig>
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
  size: number = 11,
  color: string = '#1e293b'
): fabric.Polygon {
  const spread = Math.PI / 6.5;
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
      objectCaching: false,
    }
  );
}

function buildTickCap(
  cx: number,
  cy: number,
  axisAngleRad: number,
  length: number = 11,
  color: string = '#1e293b'
): fabric.Line {
  const tickAngle = axisAngleRad + Math.PI / 4;
  const dx = Math.cos(tickAngle) * (length / 2);
  const dy = Math.sin(tickAngle) * (length / 2);
  return new fabric.Line([cx - dx, cy - dy, cx + dx, cy + dy], {
    stroke: color,
    strokeWidth: 2,
    strokeUniform: true,
    objectCaching: false,
  });
}

export interface ParallelDimensionGeometry {
  pxLen: number;
  angle: number;
  dx1: number;
  dy1: number;
  dx2: number;
  dy2: number;
  ext1?: [number, number, number, number];
  ext2?: [number, number, number, number];
  cap1?: [number, number, number, number];
  cap2?: [number, number, number, number];
  textX: number;
  textY: number;
  textDeg: number;
}

export function computeParallelDimensionGeometry(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number = 0,
  textPosition: 'above' | 'center' = 'above',
  fontSize: number = 13
): ParallelDimensionGeometry {
  const pxLen = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);

  const dx1 = x1 + nx * offset;
  const dy1 = y1 + ny * offset;
  const dx2 = x2 + nx * offset;
  const dy2 = y2 + ny * offset;

  let ext1: [number, number, number, number] | undefined;
  let ext2: [number, number, number, number] | undefined;
  let cap1: [number, number, number, number] | undefined;
  let cap2: [number, number, number, number] | undefined;

  if (Math.abs(offset) > 2) {
    const sign = offset >= 0 ? 1 : -1;
    const extOver = 6 * sign;
    const extGap = 3 * sign;
    ext1 = [x1 + nx * extGap, y1 + ny * extGap, dx1 + nx * extOver, dy1 + ny * extOver];
    ext2 = [x2 + nx * extGap, y2 + ny * extGap, dx2 + nx * extOver, dy2 + ny * extOver];
  } else {
    const capLen = 8;
    cap1 = [dx1 - nx * capLen, dy1 - ny * capLen, dx1 + nx * capLen, dy1 + ny * capLen];
    cap2 = [dx2 - nx * capLen, dy2 - ny * capLen, dx2 + nx * capLen, dy2 + ny * capLen];
  }

  let textDeg = (angle * 180) / Math.PI;
  if (textDeg > 90) textDeg -= 180;
  if (textDeg < -90) textDeg += 180;

  const midX = (dx1 + dx2) / 2;
  const midY = (dy1 + dy2) / 2;
  const textOffset = textPosition === 'center' ? 0 : Math.max(10, Math.round(fontSize * 0.85) + 2);
  const radUpright = (textDeg * Math.PI) / 180;
  const textX = midX + Math.sin(radUpright) * textOffset;
  const textY = midY - Math.cos(radUpright) * textOffset;

  return { pxLen, angle, dx1, dy1, dx2, dy2, ext1, ext2, cap1, cap2, textX, textY, textDeg };
}

export interface HVDimensionGeometry {
  orientation: 'horizontal' | 'vertical';
  pxLen: number;
  dimCoord: number; // dimY when horizontal, dimX when vertical
  dimLine: [number, number, number, number];
  ext1: [number, number, number, number];
  ext2: [number, number, number, number];
  dirAngle: number;
  textX: number;
  textY: number;
  textDeg: number;
}

export function computeHVDimensionGeometry(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  placePt?: { x: number; y: number },
  textPosition: 'above' | 'center' = 'above',
  fontSize: number = 13
): HVDimensionGeometry {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  let isHorizontal = dx >= dy;
  if (placePt) {
    if (dx < 3 && dy >= 3) {
      isHorizontal = false;
    } else if (dy < 3 && dx >= 3) {
      isHorizontal = true;
    } else {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const outY = placePt.y < minY ? minY - placePt.y : placePt.y > maxY ? placePt.y - maxY : 0;
      const outX = placePt.x < minX ? minX - placePt.x : placePt.x > maxX ? placePt.x - maxX : 0;
      if (outY > outX + 2) {
        isHorizontal = true;
      } else if (outX > outY + 2) {
        isHorizontal = false;
      } else {
        const distCenterY = Math.abs(placePt.y - (y1 + y2) / 2);
        const distCenterX = Math.abs(placePt.x - (x1 + x2) / 2);
        isHorizontal = distCenterY >= distCenterX ? true : dx >= dy;
      }
    }
  }

  const textGap = textPosition === 'center' ? 0 : Math.max(10, Math.round(fontSize * 0.85) + 2);

  if (isHorizontal) {
    const dimY = placePt ? placePt.y : y2;
    const s1 = dimY >= y1 ? 1 : -1;
    const s2 = dimY >= y2 ? 1 : -1;
    const ext1: [number, number, number, number] =
      Math.abs(dimY - y1) > 2 ? [x1, y1 + 3 * s1, x1, dimY + 6 * s1] : [x1, dimY - 8, x1, dimY + 8];
    const ext2: [number, number, number, number] =
      Math.abs(dimY - y2) > 2 ? [x2, y2 + 3 * s2, x2, dimY + 6 * s2] : [x2, dimY - 8, x2, dimY + 8];

    return {
      orientation: 'horizontal',
      pxLen: dx,
      dimCoord: dimY,
      dimLine: [x1, dimY, x2, dimY],
      ext1,
      ext2,
      dirAngle: x2 >= x1 ? 0 : Math.PI,
      textX: (x1 + x2) / 2,
      textY: dimY - textGap,
      textDeg: 0,
    };
  } else {
    const dimX = placePt ? placePt.x : x2;
    const s1 = dimX >= x1 ? 1 : -1;
    const s2 = dimX >= x2 ? 1 : -1;
    const ext1: [number, number, number, number] =
      Math.abs(dimX - x1) > 2 ? [x1 + 3 * s1, y1, dimX + 6 * s1, y1] : [dimX - 8, y1, dimX + 8, y1];
    const ext2: [number, number, number, number] =
      Math.abs(dimX - x2) > 2 ? [x2 + 3 * s2, y2, dimX + 6 * s2, y2] : [dimX - 8, y2, dimX + 8, y2];

    return {
      orientation: 'vertical',
      pxLen: dy,
      dimCoord: dimX,
      dimLine: [dimX, y1, dimX, y2],
      ext1,
      ext2,
      dirAngle: y2 >= y1 ? Math.PI / 2 : -Math.PI / 2,
      textX: dimX - textGap,
      textY: (y1 + y2) / 2,
      textDeg: -90,
    };
  }
}

export function createDimensionObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: {
    pageUnit?: UnitType;
    config?: Partial<DimensionConfig>;
    offset?: number;
    kind?: 'parallel' | 'segment';
    strokeColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    underline?: boolean;
    textBackgroundColor?: string;
  }
): fabric.Group {
  const cfg = options?.config;
  const offset = options?.offset ?? 0;
  const color = options?.strokeColor || cfg?.strokeColor || '#1e293b';
  const textColor = options?.textColor || cfg?.textColor || '#0f172a';
  const fontSize = options?.fontSize || cfg?.fontSize || 13;
  const fontFamily = options?.fontFamily || cfg?.fontFamily || 'Montserrat';
  const fontWeight = options?.fontWeight || cfg?.fontWeight || 'bold';
  const fontStyle = options?.fontStyle || cfg?.fontStyle || 'normal';
  const underline = !!options?.underline;
  const textBackgroundColor = options?.textBackgroundColor || 'rgba(255,255,255,0.9)';
  const style = cfg?.style || 'arrows';
  const textPosition = cfg?.textPosition || 'above';
  const unit = cfg?.unit || 'auto';
  const precision = cfg?.precision !== undefined ? cfg.precision : 2;
  const showUnit = cfg?.showUnit !== false;

  const geom = computeParallelDimensionGeometry(x1, y1, x2, y2, offset, textPosition, fontSize);
  const items: fabric.FabricObject[] = [];

  if (geom.ext1 && geom.ext2) {
    items.push(
      new fabric.Line(geom.ext1, { stroke: color, strokeWidth: 1.2, strokeUniform: true, objectCaching: false }),
      new fabric.Line(geom.ext2, { stroke: color, strokeWidth: 1.2, strokeUniform: true, objectCaching: false })
    );
  } else if (geom.cap1 && geom.cap2) {
    items.push(
      new fabric.Line(geom.cap1, { stroke: color, strokeWidth: 1.4, strokeUniform: true, objectCaching: false }),
      new fabric.Line(geom.cap2, { stroke: color, strokeWidth: 1.4, strokeUniform: true, objectCaching: false })
    );
  }

  // Main dimension line
  items.push(
    new fabric.Line([geom.dx1, geom.dy1, geom.dx2, geom.dy2], {
      stroke: color,
      strokeWidth: 1.6,
      strokeUniform: true,
      objectCaching: false,
    })
  );

  // End markers (Arrows or 45-deg Architectural Ticks)
  if (geom.pxLen > 6) {
    const arrowSize = geom.pxLen < 28 ? Math.max(5.5, geom.pxLen * 0.3) : 11;
    if (style === 'ticks') {
      items.push(buildTickCap(geom.dx1, geom.dy1, geom.angle, 11, color), buildTickCap(geom.dx2, geom.dy2, geom.angle, 11, color));
    } else {
      items.push(
        buildArrowHead(geom.dx1, geom.dy1, geom.angle + Math.PI, arrowSize, color),
        buildArrowHead(geom.dx2, geom.dy2, geom.angle, arrowSize, color)
      );
    }
  }

  const label = formatDimensionValue(geom.pxLen, options?.pageUnit || 'px', { unit, precision, showUnit });
  const text = new fabric.IText(label, {
    left: geom.textX,
    top: geom.textY,
    originX: 'center',
    originY: 'center',
    angle: geom.textDeg,
    fontSize,
    fontFamily,
    fontWeight: fontWeight as any,
    fontStyle: fontStyle as any,
    underline,
    fill: textColor,
    backgroundColor: textBackgroundColor,
    padding: 2,
    objectCaching: false,
  });
  (text as any).isDimensionText = true;
  items.push(text);

  const group = new fabric.Group(items, { subTargetCheck: true, objectCaching: false });
  const center = group.getCenterPoint();
  const dimData: DimensionData = {
    kind: options?.kind || 'parallel',
    x1,
    y1,
    x2,
    y2,
    offset,
    precision,
    unit,
    showUnit,
    style,
    textPosition,
    strokeColor: color,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    textBackgroundColor,
    origCenterX: center.x,
    origCenterY: center.y,
  };
  (group as any).isDimension = true;
  (group as any).dimensionKind = dimData.kind;
  (group as any).dimensionData = dimData;
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
    config?: Partial<DimensionConfig>;
    strokeColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    underline?: boolean;
    textBackgroundColor?: string;
    placePt?: { x: number; y: number };
  }
): fabric.Group {
  const cfg = options?.config;
  const color = options?.strokeColor || cfg?.strokeColor || '#1e293b';
  const textColor = options?.textColor || cfg?.textColor || '#0f172a';
  const fontSize = options?.fontSize || cfg?.fontSize || 13;
  const fontFamily = options?.fontFamily || cfg?.fontFamily || 'Montserrat';
  const fontWeight = options?.fontWeight || cfg?.fontWeight || 'bold';
  const fontStyle = options?.fontStyle || cfg?.fontStyle || 'normal';
  const underline = !!options?.underline;
  const textBackgroundColor = options?.textBackgroundColor || 'rgba(255,255,255,0.9)';
  const style = cfg?.style || 'arrows';
  const textPosition = cfg?.textPosition || 'above';
  const unit = cfg?.unit || 'auto';
  const precision = cfg?.precision !== undefined ? cfg.precision : 2;
  const showUnit = cfg?.showUnit !== false;

  const geom = computeHVDimensionGeometry(x1, y1, x2, y2, options?.placePt, textPosition, fontSize);
  const items: fabric.FabricObject[] = [
    new fabric.Line(geom.ext1, { stroke: color, strokeWidth: 1.2, strokeUniform: true, objectCaching: false }),
    new fabric.Line(geom.ext2, { stroke: color, strokeWidth: 1.2, strokeUniform: true, objectCaching: false }),
    new fabric.Line(geom.dimLine, { stroke: color, strokeWidth: 1.6, strokeUniform: true, objectCaching: false }),
  ];

  const [lx1, ly1, lx2, ly2] = geom.dimLine;
  if (geom.pxLen > 6) {
    const arrowSize = geom.pxLen < 28 ? Math.max(5.5, geom.pxLen * 0.3) : 11;
    if (style === 'ticks') {
      items.push(buildTickCap(lx1, ly1, geom.dirAngle, 11, color), buildTickCap(lx2, ly2, geom.dirAngle, 11, color));
    } else {
      items.push(
        buildArrowHead(lx1, ly1, geom.dirAngle + Math.PI, arrowSize, color),
        buildArrowHead(lx2, ly2, geom.dirAngle, arrowSize, color)
      );
    }
  }

  const label = formatDimensionValue(geom.pxLen, options?.pageUnit || 'px', { unit, precision, showUnit });
  const text = new fabric.IText(label, {
    left: geom.textX,
    top: geom.textY,
    originX: 'center',
    originY: 'center',
    angle: geom.textDeg,
    fontSize,
    fontFamily,
    fontWeight: fontWeight as any,
    fontStyle: fontStyle as any,
    underline,
    fill: textColor,
    backgroundColor: textBackgroundColor,
    padding: 2,
    objectCaching: false,
  });
  (text as any).isDimensionText = true;
  items.push(text);

  const group = new fabric.Group(items, { subTargetCheck: true, objectCaching: false });
  const center = group.getCenterPoint();
  const dimData: DimensionData = {
    kind: geom.orientation,
    x1,
    y1,
    x2,
    y2,
    placeX: options?.placePt ? options.placePt.x : x2,
    placeY: options?.placePt ? options.placePt.y : y2,
    precision,
    unit,
    showUnit,
    style,
    textPosition,
    strokeColor: color,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    textBackgroundColor,
    origCenterX: center.x,
    origCenterY: center.y,
  };
  (group as any).isDimension = true;
  (group as any).dimensionKind = geom.orientation;
  (group as any).dimensionData = dimData;
  ensureObjectId(
    group,
    `${geom.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'} Dimension (${label})`
  );
  return group;
}

export function createAngularDimensionObject(
  vx: number,
  vy: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  options?: {
    config?: Partial<DimensionConfig>;
    strokeColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    underline?: boolean;
    textBackgroundColor?: string;
  }
): fabric.Group {
  const cfg = options?.config;
  const color = options?.strokeColor || cfg?.strokeColor || '#1e293b';
  const textColor = options?.textColor || cfg?.textColor || '#0f172a';
  const fontSize = options?.fontSize || cfg?.fontSize || 13;
  const fontFamily = options?.fontFamily || cfg?.fontFamily || 'Montserrat';
  const fontWeight = options?.fontWeight || cfg?.fontWeight || 'bold';
  const fontStyle = options?.fontStyle || cfg?.fontStyle || 'normal';
  const underline = !!options?.underline;
  const textBackgroundColor = options?.textBackgroundColor || 'rgba(255,255,255,0.92)';
  const textPosition = cfg?.textPosition || 'above';
  const precision = cfg?.precision !== undefined ? cfg.precision : 1;

  const r1 = Math.hypot(p1x - vx, p1y - vy);
  const r2 = Math.hypot(p2x - vx, p2y - vy);
  const a1 = Math.atan2(p1y - vy, p1x - vx);
  const a2 = Math.atan2(p2y - vy, p2x - vx);

  // Shortest signed angular sweep in [-PI, PI]
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  const degAbs = (Math.abs(delta) * 180) / Math.PI;
  const label = `${degAbs.toFixed(Math.min(2, precision))}°`;

  const arcRadius = Math.max(24, Math.min(160, Math.min(r1 || 60, r2 || 60) * 0.72));
  const arcStartX = vx + Math.cos(a1) * arcRadius;
  const arcStartY = vy + Math.sin(a1) * arcRadius;
  const arcEndX = vx + Math.cos(a1 + delta) * arcRadius;
  const arcEndY = vy + Math.sin(a1 + delta) * arcRadius;
  const sweepFlag = delta >= 0 ? 1 : 0;

  const items: fabric.FabricObject[] = [
    new fabric.Line([vx, vy, p1x, p1y], {
      stroke: color,
      strokeWidth: 1.2,
      strokeDashArray: [4, 3],
      strokeUniform: true,
      objectCaching: false,
    }),
    new fabric.Line([vx, vy, p2x, p2y], {
      stroke: color,
      strokeWidth: 1.2,
      strokeDashArray: [4, 3],
      strokeUniform: true,
      objectCaching: false,
    }),
    new fabric.Path(
      `M ${arcStartX.toFixed(2)} ${arcStartY.toFixed(2)} A ${arcRadius.toFixed(2)} ${arcRadius.toFixed(2)} 0 0 ${sweepFlag} ${arcEndX.toFixed(2)} ${arcEndY.toFixed(2)}`,
      {
        fill: 'transparent',
        stroke: color,
        strokeWidth: 1.8,
        strokeUniform: true,
        objectCaching: false,
      }
    ),
  ];

  if (Math.abs(delta) > 0.08) {
    const tangentSign = delta >= 0 ? 1 : -1;
    const startTangent = a1 + tangentSign * (Math.PI / 2);
    const endTangent = a1 + delta + tangentSign * (Math.PI / 2);
    items.push(
      buildArrowHead(arcStartX, arcStartY, startTangent + Math.PI, 10, color),
      buildArrowHead(arcEndX, arcEndY, endTangent, 10, color)
    );
  }

  const midAngle = a1 + delta / 2;
  const textDist = textPosition === 'center' ? arcRadius : arcRadius + Math.max(14, fontSize * 0.9);
  const tx = vx + Math.cos(midAngle) * textDist;
  const ty = vy + Math.sin(midAngle) * textDist;

  const textObj = new fabric.IText(label, {
    left: tx,
    top: ty,
    originX: 'center',
    originY: 'center',
    fontSize,
    fontFamily,
    fontWeight: fontWeight as any,
    fontStyle: fontStyle as any,
    underline,
    fill: textColor,
    backgroundColor: textBackgroundColor,
    padding: 2,
    objectCaching: false,
  });
  (textObj as any).isDimensionText = true;
  items.push(textObj);

  const group = new fabric.Group(items, { subTargetCheck: true, objectCaching: false });
  const center = group.getCenterPoint();
  const dimData: DimensionData = {
    kind: 'angular',
    x1: p1x,
    y1: p1y,
    x2: p2x,
    y2: p2y,
    vx,
    vy,
    precision: precision as 0 | 1 | 2 | 3,
    unit: cfg?.unit || 'auto',
    showUnit: cfg?.showUnit !== false,
    style: cfg?.style || 'arrows',
    textPosition,
    strokeColor: color,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    textBackgroundColor,
    origCenterX: center.x,
    origCenterY: center.y,
  };
  (group as any).isDimension = true;
  (group as any).dimensionKind = 'angular';
  (group as any).dimensionData = dimData;
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
  strokeColor: string = '#1e293b',
  textStyle?: {
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    underline?: boolean;
    textBackgroundColor?: string;
  }
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
      objectCaching: false,
    }
  );

  const tipArrow = buildArrowHead(p1x, p1y, dirAngle, 10, strokeColor);
  const textColor = textStyle?.textColor || '#0f172a';
  const fontSize = textStyle?.fontSize || 13;
  const fontFamily = textStyle?.fontFamily || 'Montserrat';
  const fontWeight = textStyle?.fontWeight || '600';
  const fontStyle = textStyle?.fontStyle || 'normal';
  const underline = !!textStyle?.underline;
  const textBackgroundColor = textStyle?.textBackgroundColor || 'rgba(255,255,255,0.9)';

  const labelOffsetX = isRight ? shoulderX + 6 : shoulderX - 6;
  const text = new fabric.IText(labelText, {
    left: labelOffsetX,
    top: p2y,
    originX: isRight ? 'left' : 'right',
    originY: 'center',
    fontSize,
    fontFamily,
    fontWeight: fontWeight as any,
    fontStyle: fontStyle as any,
    underline,
    fill: textColor,
    backgroundColor: textBackgroundColor,
    padding: 2,
    objectCaching: false,
  });
  (text as any).isDimensionText = true;

  const group = new fabric.Group([leaderPath, tipArrow, text], { subTargetCheck: true, objectCaching: false });
  const center = group.getCenterPoint();
  const dimData: DimensionData = {
    kind: 'callout',
    x1: p1x,
    y1: p1y,
    x2: p2x,
    y2: p2y,
    p3x,
    labelText,
    precision: 2,
    unit: 'auto',
    showUnit: true,
    style: 'arrows',
    textPosition: 'above',
    strokeColor,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    textBackgroundColor,
    origCenterX: center.x,
    origCenterY: center.y,
  };
  (group as any).isDimension = true;
  (group as any).dimensionKind = 'callout';
  (group as any).dimensionData = dimData;
  ensureObjectId(group, `Callout (${labelText})`);
  return group;
}

export function updateDimensionGroup(
  canvas: fabric.Canvas,
  existingGroup: fabric.Group,
  patch: Partial<DimensionData>,
  pageUnit: UnitType
): fabric.Group | null {
  const existingData = (existingGroup as any).dimensionData as DimensionData | undefined;
  if (!existingData) {
    // Fallback for legacy dimension groups created without dimensionData: update child props in place
    const children = typeof existingGroup.getObjects === 'function' ? existingGroup.getObjects() : [];
    let touched = false;
    for (const ch of children) {
      if (ch.type === 'i-text' || ch.type === 'text') {
        if (patch.fontSize !== undefined) { ch.set('fontSize', patch.fontSize); touched = true; }
        if (patch.fontFamily !== undefined) { ch.set('fontFamily', patch.fontFamily); touched = true; }
        if (patch.fontWeight !== undefined) { ch.set('fontWeight', patch.fontWeight as any); touched = true; }
        if (patch.fontStyle !== undefined) { ch.set('fontStyle', patch.fontStyle as any); touched = true; }
        if (patch.underline !== undefined) { ch.set('underline', patch.underline); touched = true; }
        if (patch.textColor !== undefined) { ch.set('fill', patch.textColor); touched = true; }
        if (patch.textBackgroundColor !== undefined) { ch.set('backgroundColor', patch.textBackgroundColor); touched = true; }
      } else if (patch.strokeColor !== undefined) {
        if (ch.type === 'polygon') ch.set('fill', patch.strokeColor);
        else ch.set('stroke', patch.strokeColor);
        touched = true;
      }
    }
    if (touched) {
      existingGroup.set('dirty', true);
      existingGroup.setCoords();
      canvas.requestRenderAll();
    }
    return existingGroup;
  }

  const curCenter = existingGroup.getCenterPoint();
  const dx = existingData.origCenterX !== undefined ? curCenter.x - existingData.origCenterX : 0;
  const dy = existingData.origCenterY !== undefined ? curCenter.y - existingData.origCenterY : 0;
  const sx = existingGroup.scaleX || 1;
  const sy = existingGroup.scaleY || 1;
  const prevAngle = existingGroup.angle || 0;

  const transformPt = (px: number, py: number) => {
    const cx0 = existingData.origCenterX ?? curCenter.x;
    const cy0 = existingData.origCenterY ?? curCenter.y;
    return {
      x: curCenter.x + (px - cx0) * sx + (existingData.origCenterX === undefined ? dx : 0),
      y: curCenter.y + (py - cy0) * sy + (existingData.origCenterY === undefined ? dy : 0),
    };
  };

  const p1 = transformPt(existingData.x1, existingData.y1);
  const p2 = transformPt(existingData.x2, existingData.y2);
  const merged: DimensionData = { ...existingData, ...patch };
  const commonCfg: DimensionConfig = {
    precision: merged.precision,
    unit: merged.unit,
    showUnit: merged.showUnit,
    style: merged.style,
    textPosition: merged.textPosition,
    fontSize: merged.fontSize,
    fontFamily: merged.fontFamily,
    fontWeight: merged.fontWeight,
    fontStyle: merged.fontStyle,
    textColor: merged.textColor,
    strokeColor: merged.strokeColor,
  };

  let rebuilt: fabric.Group;
  if (merged.kind === 'horizontal' || merged.kind === 'vertical') {
    const placePt =
      merged.placeX !== undefined && merged.placeY !== undefined
        ? transformPt(merged.placeX, merged.placeY)
        : undefined;
    rebuilt = createHVDimensionObject(p1.x, p1.y, p2.x, p2.y, {
      pageUnit,
      config: commonCfg,
      strokeColor: merged.strokeColor,
      textColor: merged.textColor,
      fontSize: merged.fontSize,
      fontFamily: merged.fontFamily,
      fontWeight: merged.fontWeight,
      fontStyle: merged.fontStyle,
      underline: merged.underline,
      textBackgroundColor: merged.textBackgroundColor,
      placePt,
    });
  } else if (merged.kind === 'angular' && merged.vx !== undefined && merged.vy !== undefined) {
    const v = transformPt(merged.vx, merged.vy);
    rebuilt = createAngularDimensionObject(v.x, v.y, p1.x, p1.y, p2.x, p2.y, {
      config: commonCfg,
      strokeColor: merged.strokeColor,
      textColor: merged.textColor,
      fontSize: merged.fontSize,
      fontFamily: merged.fontFamily,
      fontWeight: merged.fontWeight,
      fontStyle: merged.fontStyle,
      underline: merged.underline,
      textBackgroundColor: merged.textBackgroundColor,
    });
  } else if (merged.kind === 'callout' && merged.p3x !== undefined) {
    const p3 = transformPt(merged.p3x, existingData.y2);
    rebuilt = createCalloutObject(
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      p3.x,
      merged.labelText || 'Callout',
      merged.strokeColor,
      {
        textColor: merged.textColor,
        fontSize: merged.fontSize,
        fontFamily: merged.fontFamily,
        fontWeight: merged.fontWeight,
        fontStyle: merged.fontStyle,
        underline: merged.underline,
        textBackgroundColor: merged.textBackgroundColor,
      }
    );
  } else {
    rebuilt = createDimensionObject(p1.x, p1.y, p2.x, p2.y, {
      pageUnit,
      config: commonCfg,
      offset: (merged.offset || 0) * ((Math.abs(sx) + Math.abs(sy)) / 2),
      kind: merged.kind === 'segment' ? 'segment' : 'parallel',
      strokeColor: merged.strokeColor,
      textColor: merged.textColor,
      fontSize: merged.fontSize,
      fontFamily: merged.fontFamily,
      fontWeight: merged.fontWeight,
      fontStyle: merged.fontStyle,
      underline: merged.underline,
      textBackgroundColor: merged.textBackgroundColor,
    });
  }

  // Preserve stacking order, ID, rotation, opacity, and PowerClip membership
  const stackIdx = canvas.getObjects().indexOf(existingGroup);
  (rebuilt as any).id = (existingGroup as any).id;
  if ((existingGroup as any).isPowerClipContent) {
    (rebuilt as any).isPowerClipContent = true;
  }
  if (prevAngle !== 0) {
    rebuilt.rotate(prevAngle);
  }
  rebuilt.set('opacity', existingGroup.opacity ?? 1);
  canvas.remove(existingGroup);
  if (stackIdx >= 0) {
    canvas.insertAt(Math.min(stackIdx, canvas.getObjects().length), rebuilt);
  } else {
    canvas.add(rebuilt);
  }
  rebuilt.setCoords();
  canvas.setActiveObject(rebuilt);
  canvas.requestRenderAll();
  return rebuilt;
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

export function createConnectorObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number = 0.25,
  strokeColor: string = '#334155'
): fabric.Group {
  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: strokeColor,
    strokeWidth,
    strokeUniform: true,
  });

  const startNode = new fabric.Rect({
    left: x1 - 4,
    top: y1 - 4,
    width: 8,
    height: 8,
    fill: '#f97316',
    stroke: '#1e293b',
    strokeWidth: 1,
    strokeUniform: true,
  });

  const endNode = new fabric.Rect({
    left: x2 - 4,
    top: y2 - 4,
    width: 8,
    height: 8,
    fill: '#f97316',
    stroke: '#1e293b',
    strokeWidth: 1,
    strokeUniform: true,
  });

  const group = new fabric.Group([line, startNode, endNode]);
  (group as any).isConnector = true;
  group.set({ stroke: strokeColor, strokeWidth });
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

