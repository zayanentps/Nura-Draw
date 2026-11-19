import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { X, Sparkles } from 'lucide-react';
import { ThemeMode } from '../types';
import { disableObjectCaching, ensureObjectId } from '../utils/canvasHelpers';
import { hexToRgb, normalizeHex, rgbToHex } from '../utils/colorConversion';

export type EffectDialogState =
  | null
  | { kind: 'bevel' }
  | { kind: 'blend' }
  | { kind: 'contour' }
  | { kind: 'envelope' }
  | { kind: 'extrude' }
  | { kind: 'lens' }
  | { kind: 'photococktail' }
  | { kind: 'pointillizer' }
  | { kind: 'filter'; category: string; effectName: string };

interface EffectToolsModalProps {
  dialog: EffectDialogState;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  theme?: ThemeMode;
  onCanvasUpdated: (label: string) => void;
  onToast?: (msg: string) => void;
}

function interpolateHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(normalizeHex(hexA) || '#00a651');
  const b = hexToRgb(normalizeHex(hexB) || '#0078d7');
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function applyPixelEffectToCanvas(
  srcCanvas: HTMLCanvasElement,
  effectName: string,
  category: string,
  amount: number // 0..100
): HTMLCanvasElement {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const norm = Math.max(0, Math.min(1, amount / 100));
  const lower = `${category} ${effectName}`.toLowerCase();

  // CSS Filter fast paths combined with pixel manipulation
  if (lower.includes('gaussian blur') || lower.includes('low pass') || lower.includes('smooth')) {
    ctx.filter = `blur(${(norm * 14).toFixed(1)}px)`;
    ctx.drawImage(srcCanvas, 0, 0);
    return out;
  }
  if (lower.includes('motion blur') || lower.includes('zoom')) {
    ctx.globalAlpha = 0.25;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const dx = lower.includes('zoom') ? 0 : (i - steps / 2) * norm * 3.5;
      const scale = lower.includes('zoom') ? 1 + (i - steps / 2) * norm * 0.03 : 1;
      ctx.save();
      ctx.translate(w / 2 + dx, h / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(srcCanvas, -w / 2, -h / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return out;
  }
  if (lower.includes('radial blur')) {
    ctx.globalAlpha = 0.22;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const ang = ((i - steps / 2) * norm * 6 * Math.PI) / 180;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(ang);
      ctx.drawImage(srcCanvas, -w / 2, -h / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return out;
  }

  ctx.drawImage(srcCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const orig = new Uint8ClampedArray(data);

  if (lower.includes('invert')) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('sepia') || lower.includes('time machine')) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const sr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      const sg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      const sb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
      data[i] = r + (sr - r) * norm;
      data[i + 1] = g + (sg - g) * norm;
      data[i + 2] = b + (sb - b) * norm;
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('posterize') || lower.includes('bit planes') || lower.includes('watercolor') || lower.includes('cubist')) {
    const levels = Math.max(2, Math.round(12 - norm * 9));
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / step) * step;
      data[i + 1] = Math.round(data[i + 1] / step) * step;
      data[i + 2] = Math.round(data[i + 2] / step) * step;
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('solarize') || lower.includes('psychedelic')) {
    const thresh = Math.round(255 * (1 - norm * 0.75));
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > thresh) data[i] = 255 - data[i];
      if (data[i + 1] > thresh) data[i + 1] = 255 - data[i + 1];
      if (data[i + 2] > thresh) data[i + 2] = 255 - data[i + 2];
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('noise') || lower.includes('charcoal') || lower.includes('crayon') || lower.includes('pastels')) {
    const spread = norm * 95;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const n = (Math.random() - 0.5) * spread;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('pixelate') || lower.includes('mosaic') || lower.includes('blocks') || lower.includes('glass block') || lower.includes('stained glass')) {
    const blockSize = Math.max(2, Math.round(2 + norm * 22));
    for (let y = 0; y < h; y += blockSize) {
      for (let x = 0; x < w; x += blockSize) {
        const cx = Math.min(w - 1, x + Math.floor(blockSize / 2));
        const cy = Math.min(h - 1, y + Math.floor(blockSize / 2));
        const si = (cy * w + cx) * 4;
        for (let by = 0; by < blockSize && y + by < h; by++) {
          for (let bx = 0; bx < blockSize && x + bx < w; bx++) {
            const di = ((y + by) * w + (x + bx)) * 4;
            data[di] = orig[si];
            data[di + 1] = orig[si + 1];
            data[di + 2] = orig[si + 2];
            data[di + 3] = orig[si + 3];
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('halftone') || lower.includes('pointillist')) {
    const cell = Math.max(4, Math.round(4 + norm * 12));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (let y = cell / 2; y < h; y += cell) {
      for (let x = cell / 2; x < w; x += cell) {
        const ix = Math.min(w - 1, Math.floor(x));
        const iy = Math.min(h - 1, Math.floor(y));
        const si = (iy * w + ix) * 4;
        if (orig[si + 3] < 20) continue;
        const lum = (0.299 * orig[si] + 0.587 * orig[si + 1] + 0.114 * orig[si + 2]) / 255;
        const r = Math.max(0.5, ((1 - lum * 0.75) * cell) / 2);
        ctx.fillStyle = `rgb(${orig[si]},${orig[si + 1]},${orig[si + 2]})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return out;
  }

  if (lower.includes('emboss') || lower.includes('relief') || lower.includes('edge') || lower.includes('find edges') || lower.includes('trace contour') || lower.includes('sharpen') || lower.includes('unsharp') || lower.includes('high pass')) {
    const isEdge = lower.includes('edge') || lower.includes('trace contour');
    const isEmboss = lower.includes('emboss') || lower.includes('relief');
    const strength = 0.5 + norm * 2;
    const kernel = isEmboss
      ? [-2 * strength, -1 * strength, 0, -1 * strength, 1, 1 * strength, 0, 1 * strength, 2 * strength]
      : isEdge
      ? [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      : [0, -strength, 0, -strength, 1 + 4 * strength, -strength, 0, -strength, 0];
    const bias = isEmboss ? 128 : 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = bias;
        let g = bias;
        let b = bias;
        let kIdx = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4;
            const kv = kernel[kIdx++];
            r += orig[idx] * kv;
            g += orig[idx + 1] * kv;
            b += orig[idx + 2] * kv;
          }
        }
        const di = (y * w + x) * 4;
        data[di] = Math.max(0, Math.min(255, r));
        data[di + 1] = Math.max(0, Math.min(255, g));
        data[di + 2] = Math.max(0, Math.min(255, b));
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('swirl') || lower.includes('whirlpool') || lower.includes('vortex') || lower.includes('ripple') || lower.includes('pinch')) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.55;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        let sx = x;
        let sy = y;
        if (lower.includes('ripple')) {
          sx = Math.round(x + Math.sin(y * 0.15) * norm * 12);
          sy = Math.round(y + Math.cos(x * 0.15) * norm * 12);
        } else if (dist < maxR && dist > 0.5) {
          const factor = 1 - dist / maxR;
          if (lower.includes('pinch')) {
            const scale = 1 - factor * norm * 0.6;
            sx = Math.round(cx + dx * scale);
            sy = Math.round(cy + dy * scale);
          } else {
            const angle = Math.atan2(dy, dx) + factor * norm * 4.5;
            sx = Math.round(cx + dist * Math.cos(angle));
            sy = Math.round(cy + dist * Math.sin(angle));
          }
        }
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const si = (sy * w + sx) * 4;
          const di = (y * w + x) * 4;
          data[di] = orig[si];
          data[di + 1] = orig[si + 1];
          data[di + 2] = orig[si + 2];
          data[di + 3] = orig[si + 3];
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (lower.includes('vignette')) {
    ctx.putImageData(imgData, 0, 0);
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.65);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${(norm * 0.85).toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return out;
  }

  // Texture / Lens Flare / Brightness / Saturation / Gamma / Generic Fallback
  if (lower.includes('gamma') || lower.includes('brightness') || lower.includes('color balance') || lower.includes('hue') || lower.includes('colorize') || lower.includes('photo filter') || lower.includes('auto equalize')) {
    const bright = 1 + (norm - 0.5) * 0.8;
    const sat = lower.includes('hue') || lower.includes('colorize') ? 0.5 + norm * 1.5 : 1 + norm * 0.3;
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `brightness(${bright.toFixed(2)}) saturate(${sat.toFixed(2)}) contrast(${(1 + (norm - 0.3) * 0.4).toFixed(2)})`;
    ctx.drawImage(srcCanvas, 0, 0);
    return out;
  }

  // Subtle weave/texture overlay for Texture / Canvas / Brick / Woodgrain / Stone / Plastic
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] === 0) continue;
      const tex = (Math.sin(x * 0.5) * Math.cos(y * 0.5) + Math.sin((x + y) * 0.25)) * norm * 28;
      data[idx] = Math.max(0, Math.min(255, data[idx] + tex));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + tex));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + tex));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return out;
}

export const EffectToolsModal: React.FC<EffectToolsModalProps> = ({
  dialog,
  onClose,
  canvas,
  selectedObject,
  theme = 'light',
  onCanvasUpdated,
  onToast,
}) => {
  const isDark = theme === 'dark';

  // Vector Effect States
  const [steps, setSteps] = useState(5);
  const [offsetPx, setOffsetPx] = useState(10);
  const [contourMode, setContourMode] = useState<'outside' | 'inside' | 'center'>('outside');
  const [contourColor, setContourColor] = useState('#0078d7');

  const [bevelDistance, setBevelDistance] = useState(12);
  const [bevelIntensity, setBevelIntensity] = useState(65);

  const [envelopePreset, setEnvelopePreset] = useState<'arc_top' | 'bulge' | 'skew_left' | 'skew_right'>('arc_top');
  const [envelopeAmount, setEnvelopeAmount] = useState(35);

  const [extrudeDepthX, setExtrudeDepthX] = useState(24);
  const [extrudeDepthY, setExtrudeDepthY] = useState(24);
  const [extrudeColor, setExtrudeColor] = useState('#334155');

  const [lensType, setLensType] = useState<'transparency' | 'invert' | 'grayscale' | 'color_add' | 'brighten'>('transparency');
  const [lensAmount, setLensAmount] = useState(55);
  const [lensColor, setLensColor] = useState('#00aeef');

  const [pointDotSize, setPointDotSize] = useState(8);
  const [pointSpacing, setPointSpacing] = useState(12);

  const [cocktailCols, setCocktailCols] = useState(4);

  // Filter Effect States
  const [filterAmount, setFilterAmount] = useState(50);
  const [previewSrcCanvas, setPreviewSrcCanvas] = useState<HTMLCanvasElement | null>(null);
  const previewOutRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!dialog || dialog.kind !== 'filter' || !selectedObject) {
      setPreviewSrcCanvas(null);
      return;
    }
    setFilterAmount(50);
    const dataUrl = selectedObject.toDataURL({ format: 'png', multiplier: 1 });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, img.width);
      c.height = Math.max(1, img.height);
      const cx = c.getContext('2d')!;
      cx.drawImage(img, 0, 0);
      setPreviewSrcCanvas(c);
    };
    img.src = dataUrl;
  }, [dialog, selectedObject]);

  useEffect(() => {
    if (!dialog || dialog.kind !== 'filter' || !previewSrcCanvas || !previewOutRef.current) return;
    const processed = applyPixelEffectToCanvas(
      previewSrcCanvas,
      dialog.effectName,
      dialog.category,
      filterAmount
    );
    const target = previewOutRef.current;
    target.width = processed.width;
    target.height = processed.height;
    const tctx = target.getContext('2d')!;
    tctx.clearRect(0, 0, target.width, target.height);
    tctx.drawImage(processed, 0, 0);
  }, [dialog, previewSrcCanvas, filterAmount]);

  if (!dialog || !canvas) return null;

  const panelCls = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f0f0f0] border-[#828790] text-[#1e1e1e]';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-[#111]';

  const applyContour = async () => {
    if (!selectedObject) return;
    const objects = canvas.getObjects();
    const insertIdx = Math.max(0, objects.indexOf(selectedObject));
    const baseFill = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#00a651';

    for (let i = steps; i >= 1; i--) {
      const clone = await selectedObject.clone();
      const sign = contourMode === 'inside' ? -1 : 1;
      const w = Math.max(8, selectedObject.getScaledWidth());
      const h = Math.max(8, selectedObject.getScaledHeight());
      const scaleFactorX = Math.max(0.15, (w + sign * i * offsetPx * 2) / w);
      const scaleFactorY = Math.max(0.15, (h + sign * i * offsetPx * 2) / h);
      const t = i / steps;
      clone.set({
        scaleX: (selectedObject.scaleX || 1) * scaleFactorX,
        scaleY: (selectedObject.scaleY || 1) * scaleFactorY,
        fill: interpolateHex(baseFill, contourColor, t),
        stroke: contourColor,
        strokeWidth: Math.max(1, selectedObject.strokeWidth || 1),
      });
      ensureObjectId(clone, `Contour Step ${i}`);
      disableObjectCaching(clone);
      canvas.add(clone);
      if (contourMode !== 'inside' && typeof canvas.moveObjectTo === 'function') {
        canvas.moveObjectTo(clone, insertIdx);
      }
    }
    canvas.requestRenderAll();
    onCanvasUpdated('Contour');
    onToast?.(`Applied ${steps}-step ${contourMode} Contour`);
    onClose();
  };

  const applyBevel = () => {
    if (!selectedObject) return;
    selectedObject.set({
      shadow: new fabric.Shadow({
        color: `rgba(15, 23, 42, ${(bevelIntensity / 100).toFixed(2)})`,
        blur: Math.max(2, bevelDistance * 1.4),
        offsetX: Math.round(bevelDistance * 0.45),
        offsetY: Math.round(bevelDistance * 0.45),
      }),
      stroke: selectedObject.stroke && selectedObject.stroke !== 'transparent' ? selectedObject.stroke : '#e2e8f0',
      strokeWidth: Math.max(2, selectedObject.strokeWidth || 3),
    });
    (selectedObject as any).hasEffects = true;
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated('Bevel');
    onToast?.('Applied 3D Bevel effect');
    onClose();
  };

  const applyBlend = async () => {
    if (!selectedObject) return;
    if (selectedObject.type === 'activeselection') {
      const sel = selectedObject as fabric.ActiveSelection;
      const items = sel.getObjects();
      if (items.length >= 2) {
        const a = items[0];
        const b = items[items.length - 1];
        const ca = a.getCenterPoint();
        const cb = b.getCenterPoint();
        const fa = typeof a.fill === 'string' ? a.fill : '#00a651';
        const fb = typeof b.fill === 'string' ? b.fill : '#0078d7';
        canvas.discardActiveObject();
        for (let i = 1; i <= steps; i++) {
          const t = i / (steps + 1);
          const clone = await a.clone();
          const cx = ca.x + (cb.x - ca.x) * t;
          const cy = ca.y + (cb.y - ca.y) * t;
          clone.set({
            scaleX: (a.scaleX || 1) + ((b.scaleX || 1) - (a.scaleX || 1)) * t,
            scaleY: (a.scaleY || 1) + ((b.scaleY || 1) - (a.scaleY || 1)) * t,
            angle: (a.angle || 0) + ((b.angle || 0) - (a.angle || 0)) * t,
            fill: interpolateHex(fa, fb, t),
          });
          clone.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center');
          ensureObjectId(clone, `Blend Step ${i}`);
          disableObjectCaching(clone);
          canvas.add(clone);
        }
        canvas.requestRenderAll();
        onCanvasUpdated('Blend');
        onToast?.(`Created ${steps}-step Blend between objects`);
        onClose();
        return;
      }
    }

    // Single object stepped blend
    const baseFill = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#00a651';
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const clone = await selectedObject.clone();
      clone.set({
        left: (selectedObject.left || 0) + i * offsetPx,
        top: (selectedObject.top || 0) + i * offsetPx,
        fill: interpolateHex(baseFill, contourColor, t),
        opacity: Math.max(0.2, 1 - t * 0.65),
      });
      ensureObjectId(clone, `Blend Step ${i}`);
      disableObjectCaching(clone);
      canvas.add(clone);
    }
    canvas.requestRenderAll();
    onCanvasUpdated('Blend');
    onToast?.(`Created ${steps}-step Blend`);
    onClose();
  };

  const applyEnvelope = () => {
    if (!selectedObject) return;
    const amt = envelopeAmount;
    if (envelopePreset === 'skew_left') {
      selectedObject.set({ skewX: -amt * 0.6, skewY: amt * 0.15 });
    } else if (envelopePreset === 'skew_right') {
      selectedObject.set({ skewX: amt * 0.6, skewY: -amt * 0.15 });
    } else if (envelopePreset === 'bulge') {
      selectedObject.set({
        scaleX: (selectedObject.scaleX || 1) * (1 + amt / 180),
        scaleY: (selectedObject.scaleY || 1) * (1 - amt / 300),
      });
    } else {
      selectedObject.set({
        skewY: amt * 0.35,
        angle: (selectedObject.angle || 0) + amt * 0.12,
      });
    }
    (selectedObject as any).hasEffects = true;
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated('Envelope');
    onToast?.(`Applied ${envelopePreset.replace('_', ' ')} Envelope`);
    onClose();
  };

  const applyExtrude = async () => {
    if (!selectedObject) return;
    const objects = canvas.getObjects();
    const insertIdx = Math.max(0, objects.indexOf(selectedObject));
    const depthSteps = Math.max(3, Math.min(20, steps));
    for (let i = depthSteps; i >= 1; i--) {
      const t = i / depthSteps;
      const clone = await selectedObject.clone();
      clone.set({
        left: (selectedObject.left || 0) + extrudeDepthX * t,
        top: (selectedObject.top || 0) + extrudeDepthY * t,
        fill: extrudeColor,
        stroke: extrudeColor,
      });
      ensureObjectId(clone, `Extrude Depth ${i}`);
      disableObjectCaching(clone);
      canvas.add(clone);
      if (typeof canvas.moveObjectTo === 'function') {
        canvas.moveObjectTo(clone, insertIdx);
      }
    }
    canvas.requestRenderAll();
    onCanvasUpdated('Extrude');
    onToast?.('Applied 3D Extrude depth');
    onClose();
  };

  const applyLens = () => {
    if (!selectedObject) return;
    if (lensType === 'transparency') {
      selectedObject.set('opacity', Math.max(0.05, 1 - lensAmount / 100));
    } else if (lensType === 'invert') {
      const curFill = typeof selectedObject.fill === 'string' ? normalizeHex(selectedObject.fill) : null;
      if (curFill) {
        const { r, g, b } = hexToRgb(curFill);
        selectedObject.set('fill', rgbToHex(255 - r, 255 - g, 255 - b));
      }
    } else if (lensType === 'grayscale') {
      const curFill = typeof selectedObject.fill === 'string' ? normalizeHex(selectedObject.fill) : null;
      if (curFill) {
        const { r, g, b } = hexToRgb(curFill);
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        selectedObject.set('fill', rgbToHex(lum, lum, lum));
      }
    } else if (lensType === 'color_add') {
      const curFill = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#ffffff';
      selectedObject.set('fill', interpolateHex(curFill, lensColor, lensAmount / 100));
    } else if (lensType === 'brighten') {
      const curFill = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#808080';
      selectedObject.set('fill', interpolateHex(curFill, '#ffffff', lensAmount / 100));
    }
    (selectedObject as any).hasEffects = true;
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated('Lens');
    onToast?.(`Applied ${lensType.replace('_', ' ')} Lens`);
    onClose();
  };

  const applyPointillizer = () => {
    if (!selectedObject) return;
    const bound = selectedObject.getBoundingRect();
    const offData = selectedObject.toDataURL({ format: 'png', multiplier: 1 });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, img.width);
      c.height = Math.max(1, img.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pix = ctx.getImageData(0, 0, c.width, c.height).data;
      const dots: fabric.Circle[] = [];
      for (let y = pointSpacing / 2; y < c.height; y += pointSpacing) {
        for (let x = pointSpacing / 2; x < c.width; x += pointSpacing) {
          const ix = Math.floor(x);
          const iy = Math.floor(y);
          const idx = (iy * c.width + ix) * 4;
          if (pix[idx + 3] < 40) continue;
          const col = rgbToHex(pix[idx], pix[idx + 1], pix[idx + 2]);
          const dot = new fabric.Circle({
            left: bound.left + x,
            top: bound.top + y,
            originX: 'center',
            originY: 'center',
            radius: Math.max(1.5, pointDotSize / 2),
            fill: col,
            strokeWidth: 0,
            objectCaching: false,
          });
          dots.push(dot);
        }
      }
      if (dots.length > 0) {
        const grp = new fabric.Group(dots, { objectCaching: false });
        ensureObjectId(grp, 'Pointillizer Mosaic');
        disableObjectCaching(grp);
        canvas.remove(selectedObject);
        canvas.add(grp);
        canvas.setActiveObject(grp);
        canvas.requestRenderAll();
        onCanvasUpdated('Pointillizer');
        onToast?.(`Created Pointillizer mosaic (${dots.length} vector dots)`);
      }
      onClose();
    };
    img.src = offData;
  };

  const applyPhotoCocktail = async () => {
    if (!selectedObject) return;
    const bound = selectedObject.getBoundingRect();
    const cols = Math.max(2, Math.min(8, cocktailCols));
    const cellScale = 1 / cols;
    const gap = 4;
    const tiles: fabric.FabricObject[] = [];
    for (let row = 0; row < cols; row++) {
      for (let col = 0; col < cols; col++) {
        const clone = await selectedObject.clone();
        clone.set({
          scaleX: (selectedObject.scaleX || 1) * cellScale,
          scaleY: (selectedObject.scaleY || 1) * cellScale,
          left: bound.left + col * ((bound.width / cols) + gap),
          top: bound.top + row * ((bound.height / cols) + gap),
          opacity: 0.75 + ((row + col) % 2) * 0.25,
        });
        disableObjectCaching(clone);
        tiles.push(clone);
      }
    }
    const grp = new fabric.Group(tiles, { objectCaching: false });
    ensureObjectId(grp, 'PhotoCocktail Grid');
    disableObjectCaching(grp);
    canvas.remove(selectedObject);
    canvas.add(grp);
    canvas.setActiveObject(grp);
    canvas.requestRenderAll();
    onCanvasUpdated('PhotoCocktail');
    onToast?.(`Created ${cols}×${cols} PhotoCocktail collage`);
    onClose();
  };

  const applyFilterEffect = async () => {
    if (!selectedObject || dialog.kind !== 'filter' || !previewSrcCanvas) return;
    const processed = applyPixelEffectToCanvas(
      previewSrcCanvas,
      dialog.effectName,
      dialog.category,
      filterAmount
    );
    const dataUrl = processed.toDataURL('image/png');
    const bound = selectedObject.getBoundingRect();
    const imgObj = await fabric.FabricImage.fromURL(dataUrl);
    imgObj.set({
      left: bound.left,
      top: bound.top,
      originX: 'left',
      originY: 'top',
      objectCaching: false,
    });
    (imgObj as any).hasEffects = true;
    ensureObjectId(imgObj, `${dialog.effectName} Effect`);
    disableObjectCaching(imgObj);
    canvas.remove(selectedObject);
    canvas.add(imgObj);
    canvas.setActiveObject(imgObj);
    canvas.requestRenderAll();
    onCanvasUpdated(dialog.effectName);
    onToast?.(`Applied ${dialog.category} → ${dialog.effectName}`);
    onClose();
  };

  const titleMap: Record<string, string> = {
    bevel: 'Bevel Effect',
    blend: 'Blend Effect',
    contour: 'Contour (Ctrl+F9)',
    envelope: 'Envelope (Ctrl+F7)',
    extrude: 'Extrude 3D',
    lens: 'Lens (Alt+F3)',
    photococktail: 'PhotoCocktail Collage',
    pointillizer: 'Pointillizer Vector Mosaic',
  };

  const modalTitle =
    dialog.kind === 'filter'
      ? `${dialog.category} — ${dialog.effectName.replace(/\.\.\.$/, '')}`
      : titleMap[dialog.kind] || 'Effect';

  const handleConfirm = () => {
    if (dialog.kind === 'contour') applyContour();
    else if (dialog.kind === 'bevel') applyBevel();
    else if (dialog.kind === 'blend') applyBlend();
    else if (dialog.kind === 'envelope') applyEnvelope();
    else if (dialog.kind === 'extrude') applyExtrude();
    else if (dialog.kind === 'lens') applyLens();
    else if (dialog.kind === 'pointillizer') applyPointillizer();
    else if (dialog.kind === 'photococktail') applyPhotoCocktail();
    else if (dialog.kind === 'filter') applyFilterEffect();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 select-none font-sans"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={`w-[390px] border shadow-2xl text-[12px] ${panelCls}`}>
        <div
          className={`h-[30px] px-3 flex items-center justify-between border-b ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-white border-[#dcdcdc]'
          }`}
        >
          <span className="font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0078d7]" />
            {modalTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 -mr-1.5 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!selectedObject && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-300 text-[11px]">
              Select an object on the canvas first to apply this effect.
            </div>
          )}

          {dialog.kind === 'filter' && (
            <div className="space-y-3">
              <div className="w-full h-44 bg-[#444] border border-zinc-500 flex items-center justify-center overflow-hidden p-2">
                <canvas ref={previewOutRef} className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Effect Intensity / Amount</span>
                  <span className="font-mono">{filterAmount}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(Number(e.target.value))}
                  className="w-full accent-[#0078d7] cursor-pointer"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'contour' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] mb-1">Contour Direction:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['outside', 'inside', 'center'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setContourMode(m)}
                      className={`py-1 border capitalize ${
                        contourMode === m ? 'bg-[#0078d7] text-white border-[#0078d7]' : inputCls
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] mb-1">Steps:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={steps}
                    onChange={(e) => setSteps(Math.max(1, Number(e.target.value) || 1))}
                    className={`w-full h-6 px-2 border ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1">Offset (px):</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={offsetPx}
                    onChange={(e) => setOffsetPx(Math.max(2, Number(e.target.value) || 4))}
                    className={`w-full h-6 px-2 border ${inputCls}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]">End Contour Color:</span>
                <input
                  type="color"
                  value={contourColor}
                  onChange={(e) => setContourColor(e.target.value)}
                  className="w-8 h-6 border border-zinc-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'bevel' && (
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Bevel Distance</span>
                  <span className="font-mono">{bevelDistance} px</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={36}
                  value={bevelDistance}
                  onChange={(e) => setBevelDistance(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Shadow Intensity</span>
                  <span className="font-mono">{bevelIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={bevelIntensity}
                  onChange={(e) => setBevelIntensity(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'blend' && (
            <div className="space-y-2.5">
              <div className="text-[11px] opacity-80">
                Select two objects to blend smoothly between them, or one object for a stepped fade blend.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] mb-1">Blend Steps:</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={steps}
                    onChange={(e) => setSteps(Math.max(2, Number(e.target.value) || 5))}
                    className={`w-full h-6 px-2 border ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1">Target Color:</label>
                  <input
                    type="color"
                    value={contourColor}
                    onChange={(e) => setContourColor(e.target.value)}
                    className="w-full h-6 border border-zinc-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {dialog.kind === 'envelope' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] mb-1">Envelope Warp Preset:</label>
                <select
                  value={envelopePreset}
                  onChange={(e) => setEnvelopePreset(e.target.value as any)}
                  className={`w-full h-6 px-1.5 border ${inputCls}`}
                >
                  <option value="arc_top">Perspective Arch</option>
                  <option value="bulge">Horizontal Stretch / Bulge</option>
                  <option value="skew_left">Slant Left Envelope</option>
                  <option value="skew_right">Slant Right Envelope</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Warp Amount</span>
                  <span className="font-mono">{envelopeAmount}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={envelopeAmount}
                  onChange={(e) => setEnvelopeAmount(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'extrude' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] mb-1">Depth X (px):</label>
                  <input
                    type="number"
                    min={-100}
                    max={100}
                    value={extrudeDepthX}
                    onChange={(e) => setExtrudeDepthX(Number(e.target.value) || 0)}
                    className={`w-full h-6 px-2 border ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1">Depth Y (px):</label>
                  <input
                    type="number"
                    min={-100}
                    max={100}
                    value={extrudeDepthY}
                    onChange={(e) => setExtrudeDepthY(Number(e.target.value) || 0)}
                    className={`w-full h-6 px-2 border ${inputCls}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Extrude Shading Color:</span>
                <input
                  type="color"
                  value={extrudeColor}
                  onChange={(e) => setExtrudeColor(e.target.value)}
                  className="w-8 h-6 border border-zinc-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'lens' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] mb-1">Lens Effect Type:</label>
                <select
                  value={lensType}
                  onChange={(e) => setLensType(e.target.value as any)}
                  className={`w-full h-6 px-1.5 border ${inputCls}`}
                >
                  <option value="transparency">Transparency</option>
                  <option value="invert">Invert</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="color_add">Color Add / Tint</option>
                  <option value="brighten">Brighten</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Rate / Amount</span>
                  <span className="font-mono">{lensAmount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={lensAmount}
                  onChange={(e) => setLensAmount(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
              {lensType === 'color_add' && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">Lens Tint Color:</span>
                  <input
                    type="color"
                    value={lensColor}
                    onChange={(e) => setLensColor(e.target.value)}
                    className="w-8 h-6 border border-zinc-400 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {dialog.kind === 'pointillizer' && (
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Dot Diameter</span>
                  <span className="font-mono">{pointDotSize} px</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={pointDotSize}
                  onChange={(e) => setPointDotSize(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Grid Spacing</span>
                  <span className="font-mono">{pointSpacing} px</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={28}
                  value={pointSpacing}
                  onChange={(e) => setPointSpacing(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
            </div>
          )}

          {dialog.kind === 'photococktail' && (
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Collage Grid Size</span>
                  <span className="font-mono">{cocktailCols} × {cocktailCols}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={cocktailCols}
                  onChange={(e) => setCocktailCols(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-3 pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!selectedObject}
            onClick={handleConfirm}
            className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#0078d7] text-[#111] text-[12px] disabled:opacity-40"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-[#111] text-[12px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
