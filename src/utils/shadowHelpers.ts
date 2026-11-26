import * as fabric from 'fabric';

export interface ParsedShadowMetrics {
  hasShadow: boolean;
  offsetX: number;
  offsetY: number;
  distance: number;
  angle: number;
  blur: number;
  transparency: number; // 0 (opaque) to 100 (invisible)
  opacity: number; // 100 (opaque) to 0 (invisible)
  colorHex: string;
  alpha: number; // 0 to 1
  rgba: string;
}

export interface ShadowPreset {
  id: string;
  label: string;
  distance: number;
  angle: number;
  blur: number;
  transparency: number;
  colorHex?: string;
}

export const SHADOW_PRESETS: ShadowPreset[] = [
  { id: 'bottom_right', label: 'Bottom-Right', distance: 14, angle: 45, blur: 15, transparency: 50 },
  { id: 'bottom_left', label: 'Bottom-Left', distance: 14, angle: 135, blur: 15, transparency: 50 },
  { id: 'top_right', label: 'Top-Right', distance: 14, angle: 315, blur: 15, transparency: 50 },
  { id: 'perspective_soft', label: 'Soft Perspective', distance: 28, angle: 55, blur: 28, transparency: 60 },
  { id: 'tight_glow', label: 'Flat / Glow', distance: 0, angle: 0, blur: 18, transparency: 35 },
  { id: 'hard_offset', label: 'Hard Offset', distance: 10, angle: 45, blur: 0, transparency: 30 },
];

export function parseShadowColor(color?: string | null): { hex: string; alpha: number } {
  if (!color || typeof color !== 'string') {
    return { hex: '#000000', alpha: 0.5 };
  }
  const trimmed = color.trim();

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    const r = Math.max(0, Math.min(255, parseInt(rgbaMatch[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgbaMatch[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgbaMatch[3], 10)));
    const a = rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1;
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, alpha: Number.isFinite(a) ? a : 0.5 };
  }

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return { hex: `#${r}${r}${g}${g}${b}${b}`.toLowerCase(), alpha: 1 };
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return { hex: trimmed.toLowerCase(), alpha: 1 };
  }

  if (/^#[0-9a-f]{8}$/i.test(trimmed)) {
    const alpha = Math.max(0, Math.min(1, parseInt(trimmed.slice(7, 9), 16) / 255));
    return { hex: trimmed.slice(0, 7).toLowerCase(), alpha };
  }

  return { hex: '#000000', alpha: 0.5 };
}

export function formatShadowRgba(hex: string, alpha: number): string {
  const cleanHex = parseShadowColor(hex).hex;
  const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
  const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
  const b = parseInt(cleanHex.slice(5, 7), 16) || 0;
  const clampedAlpha = Math.max(0, Math.min(1, Number(alpha.toFixed(3))));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

export function normalizeAngleDeg(deg: number): number {
  let a = deg % 360;
  if (a < 0) a += 360;
  return Math.round(a * 10) / 10;
}

export function getShadowMetrics(
  shadowObj: any,
  fallback?: { color?: string; blur?: number; offsetX?: number; offsetY?: number }
): ParsedShadowMetrics {
  const hasShadow = !!(shadowObj && (shadowObj.color || shadowObj.blur !== undefined || shadowObj.offsetX !== undefined || shadowObj.offsetY !== undefined));
  const src = hasShadow ? shadowObj : fallback || {};
  const offsetX = Number.isFinite(Number(src.offsetX)) ? Number(src.offsetX) : 10;
  const offsetY = Number.isFinite(Number(src.offsetY)) ? Number(src.offsetY) : 10;
  const blur = Number.isFinite(Number(src.blur)) ? Math.max(0, Number(src.blur)) : 15;
  const { hex, alpha } = parseShadowColor(src.color || 'rgba(0,0,0,0.5)');
  const transparency = Math.max(0, Math.min(100, Math.round((1 - alpha) * 100)));
  const distance = Math.round(Math.hypot(offsetX, offsetY) * 10) / 10;
  const angle =
    distance > 0.01 ? normalizeAngleDeg((Math.atan2(offsetY, offsetX) * 180) / Math.PI) : 45;

  return {
    hasShadow,
    offsetX: Math.round(offsetX * 10) / 10,
    offsetY: Math.round(offsetY * 10) / 10,
    distance,
    angle,
    blur: Math.round(blur * 10) / 10,
    transparency,
    opacity: 100 - transparency,
    colorHex: hex,
    alpha,
    rgba: formatShadowRgba(hex, alpha),
  };
}

export function polarToOffset(distance: number, angleDeg: number): { offsetX: number; offsetY: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const d = Math.max(0, distance);
  return {
    offsetX: Math.round(Math.cos(rad) * d * 10) / 10,
    offsetY: Math.round(Math.sin(rad) * d * 10) / 10,
  };
}

export function createFabricShadowFromParams(params: {
  offsetX: number;
  offsetY: number;
  blur: number;
  transparency: number;
  colorHex: string;
}): fabric.Shadow {
  const alpha = Math.max(0, Math.min(1, 1 - params.transparency / 100));
  const rgba = formatShadowRgba(params.colorHex, alpha);
  return new fabric.Shadow({
    color: rgba,
    blur: Math.max(0, params.blur),
    offsetX: params.offsetX,
    offsetY: params.offsetY,
  });
}

export function applyShadowToTarget(
  target: fabric.FabricObject,
  params: {
    offsetX: number;
    offsetY: number;
    blur: number;
    transparency: number;
    colorHex: string;
  } | null
): void {
  const applyOne = (obj: fabric.FabricObject) => {
    if (!params) {
      obj.set('shadow', null);
      (obj as any).hasEffects = false;
    } else {
      obj.set('shadow', createFabricShadowFromParams(params));
      (obj as any).hasEffects = true;
    }
    obj.dirty = true;
  };

  if (target.type === 'activeselection' && typeof (target as any).getObjects === 'function') {
    for (const child of (target as any).getObjects()) {
      applyOne(child);
    }
  } else {
    applyOne(target);
  }
}

export function extractTargetShadowForUi(target: fabric.FabricObject | null): any {
  if (!target) return null;
  if (target.type === 'activeselection' && typeof (target as any).getObjects === 'function') {
    const children = (target as any).getObjects() as fabric.FabricObject[];
    const withShadow = children.find((c) => !!(c as any).shadow);
    return withShadow ? withShadow.shadow : null;
  }
  return target.shadow || null;
}
