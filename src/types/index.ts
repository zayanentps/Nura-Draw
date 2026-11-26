export type ToolType =
  | 'pick'
  | 'freehand_pick'
  | 'shape'
  | 'smooth'
  | 'crop'
  | 'knife'
  | 'virtual_segment_delete'
  | 'eraser'
  | 'zoom'
  | 'pan'
  | 'freehand'
  | 'line2p'
  | 'bezier'
  | 'pen'
  | 'b_spline'
  | 'polyline'
  | 'curve_3p'
  | 'artistic_media'
  | 'rectangle'
  | 'ellipse'
  | 'ellipse3p'
  | 'polygon'
  | 'star'
  | 'spiral'
  | 'text'
  | 'dimension'
  | 'hv_dimension'
  | 'angular_dimension'
  | 'segment_dimension'
  | 'callout'
  | 'connector'
  | 'shadow'
  | 'contour'
  | 'blend'
  | 'distort'
  | 'envelope'
  | 'extrude'
  | 'block_shadow'
  | 'transparency'
  | 'eyedropper'
  | 'gradient'
  | 'smart_fill';

export interface DimensionConfig {
  precision: 0 | 1 | 2 | 3;
  unit: 'auto' | 'px' | 'mm' | 'cm' | 'in' | 'pt';
  showUnit: boolean;
  style: 'arrows' | 'ticks';
  textPosition: 'above' | 'center';
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textColor?: string;
  strokeColor?: string;
}

export interface DimensionData {
  kind: 'parallel' | 'horizontal' | 'vertical' | 'segment' | 'angular' | 'callout';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset?: number;
  placeX?: number;
  placeY?: number;
  vx?: number;
  vy?: number;
  p3x?: number;
  labelText?: string;
  precision: 0 | 1 | 2 | 3;
  unit: 'auto' | 'px' | 'mm' | 'cm' | 'in' | 'pt';
  showUnit: boolean;
  style: 'arrows' | 'ticks';
  textPosition: 'above' | 'center';
  strokeColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  underline?: boolean;
  textBackgroundColor?: string;
  origCenterX?: number;
  origCenterY?: number;
  origScaleX?: number;
  origScaleY?: number;
  origAngle?: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropToolsConfig {
  eraserSize: number;
  eraserNib: 'round' | 'square';
  knifeAutoGap: boolean;
  cropRegion: CropRegion | null;
}

export interface SmartFillConfig {
  useFillColor: boolean;
  fillColor: string;
  outlineMode: 'none' | 'specify';
  outlineWidth: number;
  outlineColor: string;
}

export type CropActionType = 'apply_crop' | 'clear_crop';

export type ZoomPresetMode = 'to_page' | 'to_width' | 'to_height' | 'to_fit';

export interface SymmetryConfig {
  centerX: number;
  centerY: number;
  angleDeg: number; // 0 = vertical mirror axis, 90 = horizontal mirror axis
  mirrorLines: number; // 1..12 mirror planes
}

import type { UnitType, PagePreset } from '../utils/units';

export type { UnitType, PagePreset };

export interface PageConfig {
  name: string;
  width: number;
  height: number;
  preset: PagePreset | string;
  orientation: 'portrait' | 'landscape';
  units: UnitType;
  backgroundColor: string;
  bleed?: number; // bleed margin in px
  showBleed?: boolean;
  showPageBorder?: boolean;
  dpi?: number;
  facingPages?: boolean;
  nudgeDistance?: number; // nudge step distance in px
  autofitMargin?: number; // autofit page margin in px
}

export interface LayerObject {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CollaboratorUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  activeObjectId?: string | null;
}

export interface HistorySnapshot {
  json: string;
  timestamp: number;
  description: string;
}

export interface PropertyState {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDashArray: number[];
  opacity: number;
  rx: number;
  ry: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  linethrough?: boolean;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  charSpacing?: number;
  lineHeight?: number;
  textBackgroundColor?: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  contourDirection?: 'inside' | 'center' | 'outside';
  contourSteps?: number;
  contourOffset?: number;
  contourOutlineColor?: string;
  contourFillColor?: string;
  blendSteps?: number;
  blendColorMode?: 'direct' | 'clockwise' | 'counterclockwise';
  blendAccelObject?: number;
  blendAccelColor?: number;
  extrudeType?: 'small_back' | 'big_back' | 'back_parallel' | 'small_front' | 'big_front' | 'front_parallel';
  extrudeDepth?: number;
  extrudeOffsetX?: number;
  extrudeOffsetY?: number;
  extrudeColorMode?: 'object_fill' | 'solid' | 'shade';
  extrudeColor?: string;
  extrudeShadeColor?: string;
  extrudeLight?: number;
  extrudeOutline?: boolean;
  envelopeMode?: 'straight' | 'single_arc' | 'double_arc' | 'unconstrained';
  envelopeMirror?: boolean;
  blockShadowOffsetX?: number;
  blockShadowOffsetY?: number;
  blockShadowColor?: string;
  blockShadowSimplify?: boolean;
  blockShadowRemoveHoles?: boolean;
  blockShadowFromOutline?: boolean;
  blockShadowExpandEnabled?: boolean;
  blockShadowExpandPx?: number;
  blockShadowOverprint?: boolean;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  cmyk?: string;
}

export interface DocumentPaletteSwatch {
  id: string;
  name: string;
  hex: string;
  treatAs: 'Process' | 'Spot';
  cmyk?: string;
}

export type ThemeMode = 'light' | 'dark';

export type ViewQualityMode = 'wireframe' | 'normal' | 'enhanced' | 'pixels';

export interface SnapConfig {
  enabled: boolean;
  orthoMode?: boolean; // AutoCAD F8 Ortho constraint (strict 0° / 90° / 180° / 270°)
  snapToGrid: boolean;
  snapToBaselineGrid?: boolean;
  snapToGuidelines?: boolean;
  snapToObjects: boolean;
  snapToPage: boolean;
  gridSize?: number; // document grid spacing in px (default: 20)
  snapThreshold?: number; // snap aperture threshold in screen px (default: 14)
}

export interface SnapGuideline {
  id: string;
  type: 'vertical' | 'horizontal';
  pos: number;
  label?: string;
  source: 'page' | 'object' | 'grid';
}

export type SnapPointType = 'node' | 'midpoint' | 'intersection' | 'center' | 'quadrant' | 'perpendicular';

export interface SnapMarker {
  id: string;
  x: number;
  y: number;
  type: SnapPointType;
  label: string;
}

export type CurveActionType =
  | 'add_node'
  | 'delete_node'
  | 'join_nodes'
  | 'break_curve'
  | 'to_line'
  | 'to_curve'
  | 'all_to_curve'
  | 'toggle_add_node_mode'
  | 'node_cusp'
  | 'node_smooth'
  | 'node_symmetrical'
  | 'reverse_curve'
  | 'close_curve'
  | 'select_all_nodes';

export interface CurveEditState {
  isCurveObject: boolean;
  selectedNodeCount: number;
  hasActiveSegment: boolean;
  activeSegmentType: 'line' | 'curve' | null;
  activeNodeType: 'cusp' | 'smooth' | 'symmetrical' | null;
  isClosed: boolean;
  nodeCount: number;
  addNodeMode?: boolean;
}

export type GeometricConstraintType =
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'concentric'
  | 'coincident'
  | 'equal'
  | 'symmetric'
  | 'horizontal'
  | 'vertical'
  | 'fix';

export interface GeometricConstraint {
  id: string;
  type: GeometricConstraintType;
  objectIds: string[];
  axisMode?: 'vertical' | 'horizontal' | 'object';
  axisPos?: number;
  fixedLeft?: number;
  fixedTop?: number;
  enabled: boolean;
}

export type DimConstraintKind =
  | 'horizontal'
  | 'vertical'
  | 'aligned'
  | 'radius'
  | 'diameter'
  | 'angular';

export interface DimensionalConstraint {
  id: string;
  name: string;
  kind: DimConstraintKind;
  objectIds: string[];
  expression: string;
  value: number;
  error?: string;
  offset?: number;
}

export interface ParametricVariable {
  id: string;
  name: string;
  expression: string;
  value: number;
  unit?: UnitType | 'deg' | 'scalar';
  comment?: string;
  error?: string;
}

export interface ParametricState {
  variables: ParametricVariable[];
  dimConstraints: DimensionalConstraint[];
  geomConstraints: GeometricConstraint[];
  showConstraints: boolean;
}

export type MetallicPresetId = 'silver' | 'gold' | 'copper' | 'cobalt' | 'bismuth';

export interface MetallicEffectConfig {
  preset: MetallicPresetId;
  intensity: number; // 0..100
  glossiness: number; // 0..100
  gradientSize: number; // 25..250 (%)
  angle: number; // 0..360 deg
  reflectionBands: number; // 1..4
  bevelStroke: boolean;
  bevelWidth: number; // 0.5..8 px
  shadowDepth: number; // 0..100 (%)
  gradientType: 'linear' | 'radial';
}
