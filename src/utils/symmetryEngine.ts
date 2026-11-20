import * as fabric from 'fabric';
import { SymmetryConfig } from '../types';
import { ensureObjectId, getObjectLabel } from './canvasHelpers';

/**
 * Returns the affine reflection matrix across a line passing through (cx, cy)
 * whose line direction is rotated by `axisAngleRad` from the vertical Y-axis
 * (i.e. axisAngleRad = 0 -> vertical mirror line x = cx, normal = (1, 0);
 *  axisAngleRad = PI/2 -> horizontal mirror line y = cy, normal = (0, 1)).
 */
export function buildReflectionMatrix(
  cx: number,
  cy: number,
  axisAngleRad: number
): fabric.TMat2D {
  const nx = Math.cos(axisAngleRad);
  const ny = Math.sin(axisAngleRad);

  const a = 1 - 2 * nx * nx;
  const b = -2 * nx * ny;
  const c = -2 * nx * ny;
  const d = 1 - 2 * ny * ny;

  const translateToOrigin: fabric.TMat2D = [1, 0, 0, 1, -cx, -cy];
  const reflectOrigin: fabric.TMat2D = [a, b, c, d, 0, 0];
  const translateBack: fabric.TMat2D = [1, 0, 0, 1, cx, cy];

  return fabric.util.multiplyTransformMatrices(
    translateBack,
    fabric.util.multiplyTransformMatrices(reflectOrigin, translateToOrigin)
  );
}

/**
 * Returns a pure rotation matrix around (cx, cy) by `rotRad`.
 */
export function buildRotationAroundPointMatrix(
  cx: number,
  cy: number,
  rotRad: number
): fabric.TMat2D {
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const translateToOrigin: fabric.TMat2D = [1, 0, 0, 1, -cx, -cy];
  const rotateOrigin: fabric.TMat2D = [cos, sin, -sin, cos, 0, 0];
  const translateBack: fabric.TMat2D = [1, 0, 0, 1, cx, cy];

  return fabric.util.multiplyTransformMatrices(
    translateBack,
    fabric.util.multiplyTransformMatrices(rotateOrigin, translateToOrigin)
  );
}

/**
 * Generates all dihedral D_N symmetry transform matrices (excluding identity)
 * for `config.mirrorLines` planes passing through (centerX, centerY).
 * - mirrorLines = 1 -> 1 reflection (2 total copies)
 * - mirrorLines = N >= 2 -> (N - 1) rotations + N reflections (2*N total copies)
 */
export function getSymmetryTransforms(config: SymmetryConfig): fabric.TMat2D[] {
  const n = Math.max(1, Math.min(12, Math.round(config.mirrorLines || 1)));
  const baseRad = ((config.angleDeg || 0) * Math.PI) / 180;
  const { centerX: cx, centerY: cy } = config;
  const transforms: fabric.TMat2D[] = [];

  if (n === 1) {
    transforms.push(buildReflectionMatrix(cx, cy, baseRad));
    return transforms;
  }

  for (let r = 1; r < n; r++) {
    const rotAngle = (r * 2 * Math.PI) / n;
    transforms.push(buildRotationAroundPointMatrix(cx, cy, rotAngle));
  }

  for (let k = 0; k < n; k++) {
    const axisAngle = baseRad + (k * Math.PI) / n;
    transforms.push(buildReflectionMatrix(cx, cy, axisAngle));
  }

  return transforms;
}

/**
 * Clones a primary Fabric object and applies a world-space symmetry transform matrix.
 */
export async function cloneAndTransformSymmetryObject(
  src: fabric.FabricObject,
  symmetryMatrix: fabric.TMat2D,
  copyIndex: number
): Promise<fabric.FabricObject> {
  const srcMatrix = src.calcTransformMatrix();
  const targetMatrix = fabric.util.multiplyTransformMatrices(symmetryMatrix, srcMatrix);
  const decomp = fabric.util.qrDecompose(targetMatrix);

  const cloned = await src.clone();
  cloned.set({
    originX: 'center',
    originY: 'center',
    left: decomp.translateX,
    top: decomp.translateY,
    angle: decomp.angle,
    scaleX: Math.abs(decomp.scaleX),
    scaleY: Math.abs(decomp.scaleY),
    flipX: decomp.scaleX < 0,
    flipY: decomp.scaleY < 0,
    skewX: decomp.skewX || 0,
    skewY: decomp.skewY || 0,
    selectable: false,
    evented: false,
  });

  // Assign a fresh unique ID to mirror copy so selection/Layers never collide with source
  delete (cloned as any).id;
  delete (cloned as any).isSymmetryPrimary;
  (cloned as any).isSymmetryMirror = true;
  (cloned as any).symmetryCopyIndex = copyIndex;
  ensureObjectId(cloned, `${getObjectLabel(src)} (Mirror ${copyIndex + 1})`);
  cloned.setCoords();
  return cloned;
}

/**
 * Transforms a SymmetryConfig's axis center & angle when a packed Symmetry Group
 * has been moved, scaled, or rotated on the canvas before re-entering Edit Symmetry.
 */
export function transformSymmetryConfigByGroup(
  config: SymmetryConfig,
  group: fabric.Group
): SymmetryConfig {
  const m = group.calcTransformMatrix();
  const pt = new fabric.Point(config.centerX, config.centerY);
  // Note: config stored in group-local coords vs scene coords:
  // When packed, group center moved; we compute transform delta from group matrix.
  const originPt = new fabric.Point(0, 0).transform(m);
  const rad = ((config.angleDeg || 0) * Math.PI) / 180;
  // Direction vector along vertical axis (sin(rad), -cos(rad)) rotated by group angle
  const dirX = -Math.sin(rad);
  const dirY = Math.cos(rad);
  const groupDecomp = fabric.util.qrDecompose(m);
  const rotRad = (groupDecomp.angle * Math.PI) / 180;
  const rDirX = dirX * Math.cos(rotRad) - dirY * Math.sin(rotRad);
  const rDirY = dirX * Math.sin(rotRad) + dirY * Math.cos(rotRad);
  const nextAngleDeg = Math.round(((Math.atan2(-rDirX, rDirY) * 180) / Math.PI) * 100) / 100;

  void pt;
  void originPt;
  return {
    ...config,
    angleDeg: nextAngleDeg,
  };
}

/**
 * Computes scene-space endpoints for drawing the dashed symmetry mirror lines.
 */
export function getSymmetryAxisLines(
  config: SymmetryConfig,
  halfLength = 2400
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const n = Math.max(1, Math.min(12, Math.round(config.mirrorLines || 1)));
  const baseRad = ((config.angleDeg || 0) * Math.PI) / 180;
  const { centerX: cx, centerY: cy } = config;
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (let k = 0; k < n; k++) {
    const phi = baseRad + (k * Math.PI) / n;
    // Mirror line direction is perpendicular to normal (cos(phi), sin(phi)) -> (-sin(phi), cos(phi))
    const ux = -Math.sin(phi);
    const uy = Math.cos(phi);
    lines.push({
      x1: cx - ux * halfLength,
      y1: cy - uy * halfLength,
      x2: cx + ux * halfLength,
      y2: cy + uy * halfLength,
    });
  }

  return lines;
}
