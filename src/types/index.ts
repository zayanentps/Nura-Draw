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
  | 'rect3p'
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

export type CropActionType = 'apply_crop' | 'clear_crop';

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
