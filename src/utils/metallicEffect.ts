import * as fabric from 'fabric';
import { MetallicEffectConfig, MetallicPresetId } from '../types';

export interface MetallicStopSpec {
  offset: number;
  color: string;
  role: 'dark' | 'mid' | 'bright' | 'specular';
}

export interface MetallicPresetDefinition {
  id: MetallicPresetId;
  label: string;
  subtitle: string;
  badgeColor: string;
  stops: MetallicStopSpec[];
  rimStops: { offset: number; color: string }[];
  defaultShadowColor: string;
}

export const DEFAULT_METALLIC_CONFIG: MetallicEffectConfig = {
  preset: 'gold',
  intensity: 82,
  glossiness: 78,
  gradientSize: 100,
  angle: 105,
  reflectionBands: 2,
  bevelStroke: true,
  bevelWidth: 1.5,
  shadowDepth: 45,
  gradientType: 'linear',
};

export const METALLIC_PRESETS: Record<MetallicPresetId, MetallicPresetDefinition> = {
  silver: {
    id: 'silver',
    label: 'Silver',
    subtitle: 'Polished Sterling & Chrome',
    badgeColor: '#cbd5e1',
    stops: [
      { offset: 0.0, color: '#334155', role: 'dark' },
      { offset: 0.14, color: '#94a3b8', role: 'mid' },
      { offset: 0.28, color: '#ffffff', role: 'specular' },
      { offset: 0.44, color: '#cbd5e1', role: 'bright' },
      { offset: 0.56, color: '#475569', role: 'dark' },
      { offset: 0.72, color: '#f8fafc', role: 'specular' },
      { offset: 0.86, color: '#94a3b8', role: 'mid' },
      { offset: 1.0, color: '#1e293b', role: 'dark' },
    ],
    rimStops: [
      { offset: 0, color: '#ffffff' },
      { offset: 0.5, color: '#64748b' },
      { offset: 1, color: '#e2e8f0' },
    ],
    defaultShadowColor: 'rgba(15, 23, 42, 0.55)',
  },
  gold: {
    id: 'gold',
    label: 'Gold',
    subtitle: '24K Bullion & Warm Sheen',
    badgeColor: '#eab308',
    stops: [
      { offset: 0.0, color: '#5c3104', role: 'dark' },
      { offset: 0.14, color: '#b45309', role: 'mid' },
      { offset: 0.28, color: '#fef9c3', role: 'specular' },
      { offset: 0.43, color: '#facc15', role: 'bright' },
      { offset: 0.56, color: '#78350f', role: 'dark' },
      { offset: 0.72, color: '#fffbeb', role: 'specular' },
      { offset: 0.87, color: '#d97706', role: 'mid' },
      { offset: 1.0, color: '#451a03', role: 'dark' },
    ],
    rimStops: [
      { offset: 0, color: '#fef08a' },
      { offset: 0.5, color: '#92400e' },
      { offset: 1, color: '#fde047' },
    ],
    defaultShadowColor: 'rgba(69, 26, 3, 0.55)',
  },
  copper: {
    id: 'copper',
    label: 'Copper',
    subtitle: 'Burnished Rose-Bronze',
    badgeColor: '#ea580c',
    stops: [
      { offset: 0.0, color: '#3b1206', role: 'dark' },
      { offset: 0.15, color: '#9a3412', role: 'mid' },
      { offset: 0.3, color: '#ffedd5', role: 'specular' },
      { offset: 0.45, color: '#fb923c', role: 'bright' },
      { offset: 0.58, color: '#5b1e0c', role: 'dark' },
      { offset: 0.74, color: '#fff1f2', role: 'specular' },
      { offset: 0.88, color: '#c2410c', role: 'mid' },
      { offset: 1.0, color: '#2b0b04', role: 'dark' },
    ],
    rimStops: [
      { offset: 0, color: '#fed7aa' },
      { offset: 0.5, color: '#7c2d12' },
      { offset: 1, color: '#fdba74' },
    ],
    defaultShadowColor: 'rgba(67, 20, 7, 0.58)',
  },
  cobalt: {
    id: 'cobalt',
    label: 'Cobalt',
    subtitle: 'Anodized Deep Metallic Blue',
    badgeColor: '#2563eb',
    stops: [
      { offset: 0.0, color: '#091534', role: 'dark' },
      { offset: 0.15, color: '#1e3a8a', role: 'mid' },
      { offset: 0.29, color: '#e0f2fe', role: 'specular' },
      { offset: 0.44, color: '#38bdf8', role: 'bright' },
      { offset: 0.57, color: '#172554', role: 'dark' },
      { offset: 0.73, color: '#bae6fd', role: 'specular' },
      { offset: 0.87, color: '#1d4ed8', role: 'mid' },
      { offset: 1.0, color: '#070f26', role: 'dark' },
    ],
    rimStops: [
      { offset: 0, color: '#bae6fd' },
      { offset: 0.5, color: '#1e3a8a' },
      { offset: 1, color: '#60a5fa' },
    ],
    defaultShadowColor: 'rgba(15, 23, 42, 0.65)',
  },
  bismuth: {
    id: 'bismuth',
    label: 'Bismuth',
    subtitle: 'Iridescent Crystal Prismatic',
    badgeColor: '#a855f7',
    stops: [
      { offset: 0.0, color: '#1e1b4b', role: 'dark' },
      { offset: 0.14, color: '#db2777', role: 'mid' },
      { offset: 0.27, color: '#fef08a', role: 'specular' },
      { offset: 0.41, color: '#34d399', role: 'bright' },
      { offset: 0.55, color: '#06b6d4', role: 'mid' },
      { offset: 0.69, color: '#fdf4ff', role: 'specular' },
      { offset: 0.84, color: '#9333ea', role: 'bright' },
      { offset: 1.0, color: '#1e1b4b', role: 'dark' },
    ],
    rimStops: [
      { offset: 0, color: '#67e8f9' },
      { offset: 0.5, color: '#ec4899' },
      { offset: 1, color: '#fde047' },
    ],
    defaultShadowColor: 'rgba(49, 16, 66, 0.6)',
  },
};

export const METALLIC_PRESET_ORDER: MetallicPresetId[] = [
  'silver',
  'gold',
  'copper',
  'cobalt',
  'bismuth',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [128, 128, 128];
}

function toHex(r: number, g: number, b: number): string {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function mixColors(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const u = clamp(t, 0, 1);
  return toHex(r1 + (r2 - r1) * u, g1 + (g2 - g1) * u, b1 + (b2 - b1) * u);
}

/**
 * Generates dynamic gradient stops modulated by Effect Intensity, Glossiness, and Reflection Bands.
 */
export function buildMetallicColorStops(
  config: MetallicEffectConfig
): { offset: number; color: string }[] {
  const preset = METALLIC_PRESETS[config.preset] || METALLIC_PRESETS.gold;
  const intensityRatio = clamp(config.intensity, 0, 100) / 100;
  const glossRatio = clamp(config.glossiness, 0, 100) / 100;
  const bands = clamp(Math.round(config.reflectionBands || 1), 1, 4);

  // Determine average midtone color for softening when intensity < 100
  const midAnchor = preset.stops[1]?.color || '#94a3b8';

  const modulatedBase = preset.stops.map((st) => {
    let col = st.color;
    // Intensity controls contrast between valleys and midtones/highlights
    if (intensityRatio < 1) {
      if (st.role === 'dark') {
        col = mixColors(midAnchor, st.color, 0.25 + intensityRatio * 0.75);
      } else if (st.role === 'bright') {
        col = mixColors(midAnchor, st.color, 0.35 + intensityRatio * 0.65);
      }
    }

    // Glossiness pushes specular/bright bands closer to pure crisp highlight,
    // and sharpens nearby dark contrast bands for mirror-like chrome sheen
    if (st.role === 'specular') {
      col = mixColors(midAnchor, mixColors(col, '#ffffff', glossRatio * 0.65), 0.35 + glossRatio * 0.65);
    } else if (st.role === 'bright') {
      col = mixColors(col, '#ffffff', glossRatio * 0.25);
    } else if (st.role === 'dark' && glossRatio > 0.5) {
      col = mixColors(col, '#090d16', (glossRatio - 0.5) * 0.45);
    }
    return { offset: st.offset, color: col, role: st.role };
  });

  if (bands <= 1) {
    return modulatedBase.map(({ offset, color }) => ({ offset, color }));
  }

  // Repeat/mirror stops across multiple reflection bands cleanly
  const out: { offset: number; color: string }[] = [];
  for (let b = 0; b < bands; b++) {
    const startOff = b / bands;
    const span = 1 / bands;
    const isReverse = b % 2 === 1;
    const cycleStops = isReverse ? [...modulatedBase].reverse() : modulatedBase;
    for (let i = 0; i < cycleStops.length; i++) {
      // Avoid duplicate exact offset at band boundary
      if (b > 0 && i === 0) continue;
      const localOff = isReverse ? 1 - cycleStops[i].offset : cycleStops[i].offset;
      out.push({
        offset: Number(clamp(startOff + localOff * span, 0, 1).toFixed(4)),
        color: cycleStops[i].color,
      });
    }
  }
  return out;
}

/**
 * Generates CSS background string matching the exact Fabric metallic look for UI swatches & preview cards.
 */
export function getMetallicPreviewCss(config: MetallicEffectConfig): string {
  const stops = buildMetallicColorStops(config);
  const stopStr = stops.map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`).join(', ');
  if (config.gradientType === 'radial') {
    const scalePct = clamp(config.gradientSize, 25, 250);
    return `radial-gradient(circle at 50% 45%, ${stopStr})`.replace(
      'circle at 50% 45%',
      `circle ${Math.round(scalePct * 0.7)}% at 50% 45%`
    );
  }
  return `linear-gradient(${Math.round(config.angle)}deg, ${stopStr})`;
}

/**
 * Builds the Fabric.Gradient fill using percentage coordinates so it adapts smoothly
 * to text edits, curves, rectangles, circles, polygons, and scaling.
 */
export function buildMetallicFillGradient(
  config: MetallicEffectConfig
): fabric.Gradient<'linear' | 'radial'> {
  const colorStops = buildMetallicColorStops(config);
  const scaleFactor = clamp(config.gradientSize, 25, 250) / 100;

  if (config.gradientType === 'radial') {
    return new fabric.Gradient({
      type: 'radial',
      gradientUnits: 'percentage',
      coords: {
        x1: 0.5,
        y1: 0.45,
        r1: 0.02,
        x2: 0.5,
        y2: 0.5,
        r2: Number((0.65 * scaleFactor).toFixed(4)),
      },
      colorStops,
    });
  }

  const rad = ((config.angle % 360) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // Span scaled by gradientSize (100% -> 0.55 half-span across unit square)
  const halfSpan = 0.55 * scaleFactor;

  return new fabric.Gradient({
    type: 'linear',
    gradientUnits: 'percentage',
    coords: {
      x1: Number((0.5 - dx * halfSpan).toFixed(4)),
      y1: Number((0.5 - dy * halfSpan).toFixed(4)),
      x2: Number((0.5 + dx * halfSpan).toFixed(4)),
      y2: Number((0.5 + dy * halfSpan).toFixed(4)),
    },
    colorStops,
  });
}

export function buildMetallicRimGradient(
  config: MetallicEffectConfig
): fabric.Gradient<'linear'> {
  const preset = METALLIC_PRESETS[config.preset] || METALLIC_PRESETS.gold;
  const glossRatio = clamp(config.glossiness, 0, 100) / 100;
  const rad = (((config.angle + 180) % 360) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const halfSpan = 0.55;

  const rimStops = preset.rimStops.map((st, idx) => ({
    offset: st.offset,
    color: idx === 0 ? mixColors(st.color, '#ffffff', glossRatio * 0.6) : st.color,
  }));

  return new fabric.Gradient({
    type: 'linear',
    gradientUnits: 'percentage',
    coords: {
      x1: Number((0.5 - dx * halfSpan).toFixed(4)),
      y1: Number((0.5 - dy * halfSpan).toFixed(4)),
      x2: Number((0.5 + dx * halfSpan).toFixed(4)),
      y2: Number((0.5 + dy * halfSpan).toFixed(4)),
    },
    colorStops: rimStops,
  });
}

function applyMetallicToSingleLeaf(
  obj: fabric.FabricObject,
  config: MetallicEffectConfig
): void {
  const anyObj = obj as any;
  // Save original style once before applying metallic so Remove can restore cleanly
  if (!anyObj.preMetallicBackup) {
    anyObj.preMetallicBackup = {
      fill: typeof obj.fill === 'string' ? obj.fill : '#111827',
      stroke: typeof obj.stroke === 'string' ? obj.stroke : 'transparent',
      strokeWidth: Number(obj.strokeWidth) || 0,
      hasShadow: !!obj.shadow,
    };
  }

  const fillGrad = buildMetallicFillGradient(config);
  const preset = METALLIC_PRESETS[config.preset] || METALLIC_PRESETS.gold;
  const isText =
    obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
  const isLine = obj.type === 'line';

  if (isLine) {
    // Open straight lines only render stroke, so apply metallic gradient to stroke directly
    obj.set({
      stroke: fillGrad as any,
      strokeWidth: Math.max(2, Number(obj.strokeWidth) || 3),
    });
  } else {
    obj.set('fill', fillGrad as any);
    if (config.bevelStroke) {
      const bevelGrad = buildMetallicRimGradient(config);
      obj.set({
        stroke: bevelGrad as any,
        strokeWidth: Math.max(0.5, config.bevelWidth || (isText ? 1.2 : 1.5)),
        strokeUniform: true,
        paintFirst: isText ? 'stroke' : 'fill',
      });
    } else {
      const backup = anyObj.preMetallicBackup;
      obj.set({
        stroke: backup?.stroke || 'transparent',
        strokeWidth: backup?.strokeWidth ?? 0,
      });
    }
  }

  const depthRatio = clamp(config.shadowDepth, 0, 100) / 100;
  if (depthRatio > 0.01) {
    const rad = ((config.angle % 360) * Math.PI) / 180;
    const dist = 2 + depthRatio * 9;
    obj.set(
      'shadow',
      new fabric.Shadow({
        color: preset.defaultShadowColor,
        blur: Math.round(3 + depthRatio * 14),
        offsetX: Math.round(Math.cos(rad) * dist * 0.65 + 2),
        offsetY: Math.round(Math.sin(rad) * dist * 0.65 + 2.5),
      })
    );
  } else {
    obj.set('shadow', null);
  }

  anyObj.metallicEffectConfig = { ...config };
  obj.setCoords();
}

function applyMetallicRecursively(
  obj: fabric.FabricObject,
  config: MetallicEffectConfig
): number {
  const anyObj = obj as any;
  if (obj.type === 'group' && typeof anyObj.getObjects === 'function') {
    const children: fabric.FabricObject[] = anyObj.getObjects();
    let count = 0;
    for (const child of children) {
      count += applyMetallicRecursively(child, config);
    }
    anyObj.metallicEffectConfig = { ...config };
    obj.setCoords();
    return count;
  }
  applyMetallicToSingleLeaf(obj, config);
  return 1;
}

function removeMetallicFromSingleLeaf(obj: fabric.FabricObject): void {
  const anyObj = obj as any;
  const backup = anyObj.preMetallicBackup;
  if (backup) {
    obj.set({
      fill: backup.fill ?? '#1e293b',
      stroke: backup.stroke ?? 'transparent',
      strokeWidth: backup.strokeWidth ?? 0,
      shadow: null,
    });
    delete anyObj.preMetallicBackup;
  } else {
    obj.set({
      fill: '#1e293b',
      stroke: 'transparent',
      strokeWidth: 0,
      shadow: null,
    });
  }
  delete anyObj.metallicEffectConfig;
  obj.setCoords();
}

function removeMetallicRecursively(obj: fabric.FabricObject): number {
  const anyObj = obj as any;
  if (obj.type === 'group' && typeof anyObj.getObjects === 'function') {
    const children: fabric.FabricObject[] = anyObj.getObjects();
    let count = 0;
    for (const child of children) {
      count += removeMetallicRecursively(child);
    }
    delete anyObj.metallicEffectConfig;
    obj.setCoords();
    return count;
  }
  removeMetallicFromSingleLeaf(obj);
  return 1;
}

export function readMetallicConfigFromObject(
  obj: fabric.FabricObject | null | undefined
): MetallicEffectConfig {
  if (!obj) return { ...DEFAULT_METALLIC_CONFIG };
  const anyObj = obj as any;
  if (anyObj.metallicEffectConfig) {
    return { ...DEFAULT_METALLIC_CONFIG, ...anyObj.metallicEffectConfig };
  }
  if (obj.type === 'activeselection' || obj.type === 'group') {
    const children: fabric.FabricObject[] =
      typeof anyObj.getObjects === 'function' ? anyObj.getObjects() : [];
    for (const c of children) {
      if ((c as any).metallicEffectConfig) {
        return { ...DEFAULT_METALLIC_CONFIG, ...(c as any).metallicEffectConfig };
      }
    }
  }
  return { ...DEFAULT_METALLIC_CONFIG };
}

export function applyMetallicEffectToSelection(
  canvas: fabric.Canvas,
  config: MetallicEffectConfig
): number {
  const targets = canvas.getActiveObjects();
  if (targets.length === 0) return 0;
  let updated = 0;
  for (const t of targets) {
    updated += applyMetallicRecursively(t, config);
  }
  canvas.requestRenderAll();
  return updated;
}

export function removeMetallicEffectFromSelection(
  canvas: fabric.Canvas
): number {
  const targets = canvas.getActiveObjects();
  if (targets.length === 0) return 0;
  let updated = 0;
  for (const t of targets) {
    updated += removeMetallicRecursively(t);
  }
  canvas.requestRenderAll();
  return updated;
}
