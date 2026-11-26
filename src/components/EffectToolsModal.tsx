import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { X, Sparkles } from 'lucide-react';
import { ThemeMode } from '../types';
import { disableObjectCaching, ensureObjectId } from '../utils/canvasHelpers';
import { hexToRgb, normalizeHex, rgbToHex } from '../utils/colorConversion';
import { applyExtrudeParamsToTarget } from '../utils/extrudeHelpers';
import { ENVELOPE_PRESETS, applyEnvelopePresetToTarget } from '../utils/envelopeHelpers';
import {
  DEFAULT_EMBOSS_PARAMS,
  EmbossParams,
  applyEmbossParamsToTarget,
  applyEmbossToCanvas,
  extractTargetEmbossForUi,
  removeEmbossFromTarget,
  sampleCanvasPixelHex,
} from '../utils/embossHelpers';
import { EmbossControlsPanel } from './EmbossControlsPanel';

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

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function hslToRgbTuple(hDeg: number, s: number, l: number): [number, number, number] {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  if (s === 0) {
    const val = clamp255(l * 255);
    return [val, val, val];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    clamp255(hue2rgb(p, q, h + 1 / 3) * 255),
    clamp255(hue2rgb(p, q, h) * 255),
    clamp255(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function applyConvolution3x3(
  orig: Uint8ClampedArray,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  kernel: number[],
  bias = 0,
  preserveTransparent = true
): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const di = (y * w + x) * 4;
      if (preserveTransparent && orig[di + 3] === 0) continue;
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
      data[di] = clamp255(r);
      data[di + 1] = clamp255(g);
      data[di + 2] = clamp255(b);
    }
  }
}

function applyRankFilter3x3(
  orig: Uint8ClampedArray,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  mode: 'median' | 'min' | 'max',
  blendRatio = 1
): void {
  const rs = new Array<number>(9);
  const gs = new Array<number>(9);
  const bs = new Array<number>(9);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const di = (y * w + x) * 4;
      if (orig[di + 3] === 0) continue;
      let n = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          rs[n] = orig[idx];
          gs[n] = orig[idx + 1];
          bs[n] = orig[idx + 2];
          n++;
        }
      }
      rs.sort((a, b) => a - b);
      gs.sort((a, b) => a - b);
      bs.sort((a, b) => a - b);
      const pick = mode === 'min' ? 0 : mode === 'max' ? 8 : 4;
      data[di] = clamp255(orig[di] + (rs[pick] - orig[di]) * blendRatio);
      data[di + 1] = clamp255(orig[di + 1] + (gs[pick] - orig[di + 1]) * blendRatio);
      data[di + 2] = clamp255(orig[di + 2] + (bs[pick] - orig[di + 2]) * blendRatio);
    }
  }
}

function applyPixelEffectToCanvas(
  srcCanvas: HTMLCanvasElement,
  effectName: string,
  category: string,
  amount: number // 0..100
): HTMLCanvasElement {
  const w = Math.max(1, srcCanvas.width);
  const h = Math.max(1, srcCanvas.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const norm = Math.max(0, Math.min(1, amount / 100));
  const eff = effectName.toLowerCase();
  const cat = category.toLowerCase();

  // 1. BLUR EFFECTS
  if (
    eff.includes('gaussian blur') ||
    eff.includes('low pass') ||
    eff.includes('smooth') ||
    eff.includes('smart blur') ||
    eff.includes('directional smooth') ||
    eff.includes('underpainting')
  ) {
    const px = eff.includes('directional smooth') || eff.includes('smart') ? norm * 8 : norm * 14;
    ctx.filter = `blur(${px.toFixed(1)}px)`;
    ctx.drawImage(srcCanvas, 0, 0);
    if (eff.includes('underpainting')) {
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(245, 240, 225, ${(norm * 0.16).toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    return out;
  }

  if (eff.includes('motion blur') || eff.includes('zoom') || eff.includes('wind')) {
    const steps = eff.includes('wind') ? 10 : 8;
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.globalAlpha = eff.includes('wind') ? 0.2 : 0.25;
    for (let i = 0; i < steps; i++) {
      const dx = eff.includes('zoom')
        ? 0
        : eff.includes('wind')
        ? i * norm * 3.8
        : (i - steps / 2) * norm * 3.5;
      const scale = eff.includes('zoom') ? 1 + (i - steps / 2) * norm * 0.035 : 1;
      ctx.save();
      ctx.translate(w / 2 + dx, h / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(srcCanvas, -w / 2, -h / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return out;
  }

  if (eff.includes('radial blur')) {
    ctx.drawImage(srcCanvas, 0, 0);
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

  // 2. ADJUST / COLOR EFFECTS (CSS Fast-paths + Pixel Curves)
  if (eff.includes('brightness') || eff.includes('color balance') || eff.includes('hue') || eff.includes('photo filter')) {
    if (eff.includes('brightness')) {
      const bright = 0.75 + norm * 0.75;
      const contrast = 0.85 + norm * 0.65;
      ctx.filter = `brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)})`;
      ctx.drawImage(srcCanvas, 0, 0);
      return out;
    }
    if (eff.includes('hue')) {
      const hueDeg = Math.round((norm - 0.5) * 360);
      const sat = 0.6 + norm * 1.4;
      ctx.filter = `hue-rotate(${hueDeg}deg) saturate(${sat.toFixed(2)})`;
      ctx.drawImage(srcCanvas, 0, 0);
      return out;
    }
    if (eff.includes('photo filter')) {
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 168, 52, ${(norm * 0.45).toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      return out;
    }
    // Color Balance
    ctx.drawImage(srcCanvas, 0, 0);
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const warm = (norm - 0.5) * 70;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = clamp255(d[i] + warm);
      d[i + 2] = clamp255(d[i + 2] - warm);
    }
    ctx.putImageData(id, 0, 0);
    return out;
  }

  // Draw base image for pixel operations
  ctx.drawImage(srcCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const orig = new Uint8ClampedArray(data);

  // 3. GAMMA & AUTO EQUALIZE
  if (eff.includes('gamma')) {
    const gamma = Math.max(0.25, 0.35 + norm * 2.1);
    const inv = 1 / gamma;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      data[i] = clamp255(Math.pow(data[i] / 255, inv) * 255);
      data[i + 1] = clamp255(Math.pow(data[i + 1] / 255, inv) * 255);
      data[i + 2] = clamp255(Math.pow(data[i + 2] / 255, inv) * 255);
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('auto equalize')) {
    let minL = 255;
    let maxL = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < minL) minL = lum;
      if (lum > maxL) maxL = lum;
    }
    const span = Math.max(10, maxL - minL);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) {
        const stretched = ((orig[i + c] - minL) / span) * 255;
        data[i + c] = clamp255(orig[i + c] + (stretched - orig[i + c]) * norm);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 4. TRANSFORM & COLOR TRANSFORM
  if (eff.includes('invert')) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      data[i] = clamp255(orig[i] + (255 - orig[i] - orig[i]) * norm);
      data[i + 1] = clamp255(orig[i + 1] + (255 - orig[i + 1] - orig[i + 1]) * norm);
      data[i + 2] = clamp255(orig[i + 2] + (255 - orig[i + 2] - orig[i + 2]) * norm);
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('deinterlace')) {
    const step = norm > 0.5 ? 2 : 1;
    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 0; x < w; x++) {
        const di = (y * w + x) * 4;
        const up = ((y - step) * w + x) * 4;
        const dn = (Math.min(h - 1, y + step) * w + x) * 4;
        data[di] = clamp255((orig[up] + orig[dn]) * 0.5);
        data[di + 1] = clamp255((orig[up + 1] + orig[dn + 1]) * 0.5);
        data[di + 2] = clamp255((orig[up + 2] + orig[dn + 2]) * 0.5);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('sepia') || eff.includes('time machine')) {
    for (let i = 0; i < data.length; i += 4) {
      const r = orig[i];
      const g = orig[i + 1];
      const b = orig[i + 2];
      const sr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      const sg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      const sb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
      data[i] = clamp255(r + (sr - r) * norm);
      data[i + 1] = clamp255(g + (sg - g) * norm);
      data[i + 2] = clamp255(b + (sb - b) * norm);
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('colorize')) {
    const hue = norm * 360;
    const [tr, tg, tb] = hslToRgbTuple(hue, 0.75, 0.5);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const lum = (0.299 * orig[i] + 0.587 * orig[i + 1] + 0.114 * orig[i + 2]) / 255;
      data[i] = clamp255(tr * lum * 1.45);
      data[i + 1] = clamp255(tg * lum * 1.45);
      data[i + 2] = clamp255(tb * lum * 1.45);
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('psychedelic')) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const lum = (0.299 * orig[i] + 0.587 * orig[i + 1] + 0.114 * orig[i + 2]) / 255;
      const [pr, pg, pb] = hslToRgbTuple((lum * 360 * (1 + norm * 2.5)) % 360, 0.95, 0.55);
      data[i] = pr;
      data[i + 1] = pg;
      data[i + 2] = pb;
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('posterize') || eff.includes('bit planes') || eff.includes('watercolor') || eff.includes('cubist') || eff.includes('crafts') || eff.includes('kids play')) {
    const levels = Math.max(2, Math.round(10 - norm * 7.5));
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      data[i] = clamp255(Math.round(orig[i] / step) * step);
      data[i + 1] = clamp255(Math.round(orig[i + 1] / step) * step);
      data[i + 2] = clamp255(Math.round(orig[i + 2] / step) * step);
      if (eff.includes('kids play') || eff.includes('crafts')) {
        // Extra vibrant saturation pop
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = clamp255(avg + (data[i] - avg) * 1.35);
        data[i + 1] = clamp255(avg + (data[i + 1] - avg) * 1.35);
        data[i + 2] = clamp255(avg + (data[i + 2] - avg) * 1.35);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('solarize')) {
    const thresh = Math.round(255 * (1 - norm * 0.78));
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > thresh) data[i] = 255 - data[i];
      if (data[i + 1] > thresh) data[i + 1] = 255 - data[i + 1];
      if (data[i + 2] > thresh) data[i + 2] = 255 - data[i + 2];
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 5. NOISE & CORRECTION FILTERS (Note: check 'remove noise' / 'median' BEFORE 'add noise'!)
  if (eff.includes('remove noise') || eff.includes('remove moire') || eff.includes('median') || eff.includes('dust & scratch') || eff.includes('jaggy despeckle')) {
    applyRankFilter3x3(orig, data, w, h, 'median', 0.35 + norm * 0.65);
    ctx.putImageData(imgData, 0, 0);
    return out;
  }
  if (eff.includes('maximum')) {
    applyRankFilter3x3(orig, data, w, h, 'max', 0.3 + norm * 0.7);
    ctx.putImageData(imgData, 0, 0);
    return out;
  }
  if (eff.includes('minimum')) {
    applyRankFilter3x3(orig, data, w, h, 'min', 0.3 + norm * 0.7);
    ctx.putImageData(imgData, 0, 0);
    return out;
  }
  if (eff.includes('add noise')) {
    const spread = norm * 110;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const n = (Math.random() - 0.5) * spread;
      data[i] = clamp255(orig[i] + n);
      data[i + 1] = clamp255(orig[i + 1] + n);
      data[i + 2] = clamp255(orig[i + 2] + n);
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 6. ART STROKES (Charcoal, Conte Crayon, Crayon, Pastels, Pen & Ink, Scraperboard, Sketch Pad, Impressionist, Palette Knife)
  if (eff.includes('pen & ink') || eff.includes('scraperboard') || eff.includes('sketch pad') || eff.includes('charcoal') || eff.includes('conte') || eff.includes('crayon') || eff.includes('pastels')) {
    const isDarkMode = eff.includes('scraperboard');
    const isColorSketch = eff.includes('crayon') || eff.includes('pastels');
    const thresh = 90 + norm * 90;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const di = (y * w + x) * 4;
        if (orig[di + 3] === 0) continue;
        const lum = 0.299 * orig[di] + 0.587 * orig[di + 1] + 0.114 * orig[di + 2];
        const rx = ((y * w + (x + 1)) * 4);
        const dy = (((y + 1) * w + x) * 4);
        const lumR = 0.299 * orig[rx] + 0.587 * orig[rx + 1] + 0.114 * orig[rx + 2];
        const lumD = 0.299 * orig[dy] + 0.587 * orig[dy + 1] + 0.114 * orig[dy + 2];
        const edge = Math.abs(lum - lumR) + Math.abs(lum - lumD);
        const hatch = ((x + y) % 5 === 0 && lum < thresh) ? 1 : 0;
        const grain = (Math.random() - 0.5) * 32;

        if (isColorSketch) {
          const edgeDark = edge > 24 ? 0.55 : 1;
          data[di] = clamp255(orig[di] * edgeDark + grain);
          data[di + 1] = clamp255(orig[di + 1] * edgeDark + grain);
          data[di + 2] = clamp255(orig[di + 2] * edgeDark + grain);
        } else if (isDarkMode) {
          const ink = edge > 20 || lum > 255 - thresh * 0.6 ? 245 : 18;
          data[di] = ink;
          data[di + 1] = ink;
          data[di + 2] = ink;
        } else {
          const strokeVal = edge > 18 || hatch ? 26 : Math.min(250, lum + 55 + grain * 0.6);
          data[di] = clamp255(strokeVal);
          data[di + 1] = clamp255(strokeVal);
          data[di + 2] = clamp255(strokeVal);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('impressionist') || eff.includes('palette knife')) {
    const dab = Math.max(3, Math.round(3 + norm * 9));
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += Math.max(2, Math.floor(dab * 0.75))) {
      for (let x = 0; x < w; x += Math.max(2, Math.floor(dab * 0.75))) {
        const si = (y * w + x) * 4;
        if (orig[si + 3] < 20) continue;
        ctx.fillStyle = `rgba(${orig[si]},${orig[si + 1]},${orig[si + 2]},0.92)`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(eff.includes('palette knife') ? 0.45 : ((x + y) % 7) * 0.25);
        ctx.fillRect(-dab / 2, -dab * 0.25, dab * 1.4, dab * 0.55);
        ctx.restore();
      }
    }
    return out;
  }

  // 7. PIXELATE / MOSAIC / CRYSTALIZE / STAINED GLASS / GLASS BLOCK / BLOCKS
  if (
    eff.includes('pixelate') ||
    eff.includes('mosaic') ||
    eff.includes('blocks') ||
    eff.includes('glass block') ||
    eff.includes('stained glass') ||
    eff.includes('crystalize')
  ) {
    const blockSize = Math.max(3, Math.round(3 + norm * 22));
    const isStained = eff.includes('stained glass');
    const isCrystal = eff.includes('crystalize');
    for (let y = 0; y < h; y += blockSize) {
      for (let x = 0; x < w; x += blockSize) {
        const jx = isCrystal ? Math.floor((Math.sin(x * 0.13 + y * 0.07) * 0.4 + 0.5) * blockSize) : Math.floor(blockSize / 2);
        const jy = isCrystal ? Math.floor((Math.cos(y * 0.13 - x * 0.07) * 0.4 + 0.5) * blockSize) : Math.floor(blockSize / 2);
        const cx = Math.min(w - 1, Math.max(0, x + jx));
        const cy = Math.min(h - 1, Math.max(0, y + jy));
        const si = (cy * w + cx) * 4;
        for (let by = 0; by < blockSize && y + by < h; by++) {
          for (let bx = 0; bx < blockSize && x + bx < w; bx++) {
            const di = ((y + by) * w + (x + bx)) * 4;
            if (isStained && (bx === 0 || by === 0) && orig[di + 3] > 20) {
              data[di] = 20;
              data[di + 1] = 20;
              data[di + 2] = 24;
              data[di + 3] = orig[di + 3];
            } else {
              data[di] = orig[si];
              data[di + 1] = orig[si + 1];
              data[di + 2] = orig[si + 2];
              data[di + 3] = orig[si + 3];
            }
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 8. HALFTONE / POINTILLIST (preserves transparent background!)
  if (eff.includes('halftone') || eff.includes('pointillist')) {
    const cell = Math.max(4, Math.round(4 + norm * 12));
    ctx.clearRect(0, 0, w, h);
    for (let y = cell / 2; y < h; y += cell) {
      for (let x = cell / 2; x < w; x += cell) {
        const ix = Math.min(w - 1, Math.floor(x));
        const iy = Math.min(h - 1, Math.floor(y));
        const si = (iy * w + ix) * 4;
        if (orig[si + 3] < 25) continue;
        const lum = (0.299 * orig[si] + 0.587 * orig[si + 1] + 0.114 * orig[si + 2]) / 255;
        const r = Math.max(0.7, ((1 - lum * 0.65) * cell) / 2);
        ctx.fillStyle = `rgba(${orig[si]},${orig[si + 1]},${orig[si + 2]},${(orig[si + 3] / 255).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return out;
  }

  // 9. EMBOSS / BUMP MAP / RELIEF / CONTOUR / EDGE / SHARPEN / HIGH PASS / USER DEFINED
  if (
    eff.includes('emboss') ||
    eff.includes('bump map') ||
    eff.includes('relief') ||
    eff.includes('edge') ||
    eff.includes('find edges') ||
    eff.includes('trace contour') ||
    eff.includes('sharpen') ||
    eff.includes('unsharp') ||
    eff.includes('high pass') ||
    eff.includes('user defined')
  ) {
    const isEdge = eff.includes('edge') || eff.includes('trace contour');
    const isEmboss = eff.includes('emboss') || eff.includes('relief') || eff.includes('bump map');
    const isHighPass = eff.includes('high pass');
    const strength = 0.5 + norm * 2.2;
    const kernel = isEmboss
      ? [-2 * strength, -1 * strength, 0, -1 * strength, 1, 1 * strength, 0, 1 * strength, 2 * strength]
      : isEdge || isHighPass
      ? [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      : [0, -strength, 0, -strength, 1 + 4 * strength, -strength, 0, -strength, 0];
    const bias = isEmboss || isHighPass ? 128 : 0;
    applyConvolution3x3(orig, data, w, h, kernel, bias, true);
    if (eff.includes('trace contour')) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const mag = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const ink = mag > 65 ? 25 : 248;
        data[i] = ink;
        data[i + 1] = ink;
        data[i + 2] = ink;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 10. 3D EFFECTS & DISTORT GEOMETRY (3D Rotate, Cylinder, Sphere, Perspective, Pinch, Swirl, Whirlpool, Vortex, Ripple, ZigZag, Displace, Offset, Wet Paint, Tile, Page Curl)
  if (eff.includes('tile')) {
    const grid = Math.max(2, Math.min(6, Math.round(2 + norm * 4)));
    ctx.clearRect(0, 0, w, h);
    const cw = w / grid;
    const ch = h / grid;
    for (let ry = 0; ry < grid; ry++) {
      for (let rx = 0; rx < grid; rx++) {
        ctx.drawImage(srcCanvas, rx * cw, ry * ch, cw, ch);
      }
    }
    return out;
  }

  if (eff.includes('offset')) {
    const ox = Math.round(norm * w * 0.5);
    const oy = Math.round(norm * h * 0.5);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = (x + w - ox) % w;
        const sy = (y + h - oy) % h;
        const si = (sy * w + sx) * 4;
        const di = (y * w + x) * 4;
        data[di] = orig[si];
        data[di + 1] = orig[si + 1];
        data[di + 2] = orig[si + 2];
        data[di + 3] = orig[si + 3];
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('diffuse') || eff.includes('scatter') || eff.includes('particles')) {
    const rad = Math.max(1, Math.round(2 + norm * 16));
    ctx.clearRect(0, 0, w, h);
    const outImg = ctx.createImageData(w, h);
    const od = outImg.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.min(w - 1, Math.max(0, Math.round(x + (Math.random() - 0.5) * rad * 2)));
        const sy = Math.min(h - 1, Math.max(0, Math.round(y + (Math.random() - 0.5) * rad * 2)));
        const si = (sy * w + sx) * 4;
        const di = (y * w + x) * 4;
        od[di] = orig[si];
        od[di + 1] = orig[si + 1];
        od[di + 2] = orig[si + 2];
        od[di + 3] = orig[si + 3];
      }
    }
    ctx.putImageData(outImg, 0, 0);
    return out;
  }

  if (eff.includes('wet paint')) {
    const maxDrip = norm * 26;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const drip = Math.abs(Math.sin(x * 0.22) * Math.cos(x * 0.09)) * maxDrip;
        const sy = Math.max(0, Math.min(h - 1, Math.round(y - drip)));
        const si = (sy * w + x) * 4;
        const di = (y * w + x) * 4;
        data[di] = orig[si];
        data[di + 1] = orig[si + 1];
        data[di + 2] = orig[si + 2];
        data[di + 3] = orig[si + 3];
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  if (eff.includes('3d rotate') || eff.includes('perspective')) {
    ctx.clearRect(0, 0, w, h);
    const outImg = ctx.createImageData(w, h);
    const od = outImg.data;
    const tilt = 0.1 + norm * 0.45;
    for (let y = 0; y < h; y++) {
      const ny = y / Math.max(1, h - 1);
      const rowScale = eff.includes('perspective')
        ? 1 - (1 - ny) * tilt
        : 1 - Math.abs(ny - 0.5) * tilt * 0.5;
      const rowOffset = eff.includes('3d rotate') ? (ny - 0.5) * w * tilt * 0.35 : 0;
      for (let x = 0; x < w; x++) {
        const sx = Math.round(((x - w / 2 - rowOffset) / Math.max(0.2, rowScale)) + w / 2);
        const sy = eff.includes('3d rotate')
          ? Math.round(((y - h / 2) / Math.max(0.4, 1 - norm * 0.35)) + h / 2)
          : y;
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const si = (sy * w + sx) * 4;
          const di = (y * w + x) * 4;
          const shade = eff.includes('3d rotate') ? 1 - (1 - ny) * norm * 0.25 : 1;
          od[di] = clamp255(orig[si] * shade);
          od[di + 1] = clamp255(orig[si + 1] * shade);
          od[di + 2] = clamp255(orig[si + 2] * shade);
          od[di + 3] = orig[si + 3];
        }
      }
    }
    ctx.putImageData(outImg, 0, 0);
    return out;
  }

  if (eff.includes('cylinder')) {
    ctx.clearRect(0, 0, w, h);
    const outImg = ctx.createImageData(w, h);
    const od = outImg.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / Math.max(1, w - 1)) * 2 - 1;
        const curved = Math.asin(Math.max(-1, Math.min(1, nx))) / (Math.PI / 2);
        const sx = Math.round((curved * norm + nx * (1 - norm) + 1) * 0.5 * (w - 1));
        if (sx >= 0 && sx < w) {
          const si = (y * w + sx) * 4;
          const di = (y * w + x) * 4;
          const spec = Math.max(0, 1 - Math.abs(nx + 0.22) * 2.5) * norm * 55;
          const edgeDark = 1 - Math.pow(Math.abs(nx), 2.2) * norm * 0.45;
          od[di] = clamp255(orig[si] * edgeDark + spec);
          od[di + 1] = clamp255(orig[si + 1] * edgeDark + spec);
          od[di + 2] = clamp255(orig[si + 2] * edgeDark + spec);
          od[di + 3] = orig[si + 3];
        }
      }
    }
    ctx.putImageData(outImg, 0, 0);
    return out;
  }

  if (
    eff.includes('swirl') ||
    eff.includes('whirlpool') ||
    eff.includes('vortex') ||
    eff.includes('ripple') ||
    eff.includes('zigzag') ||
    eff.includes('displace') ||
    eff.includes('pinch') ||
    eff.includes('sphere')
  ) {
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
        let shade = 1;
        let spec = 0;
        if (eff.includes('ripple') || eff.includes('displace')) {
          const amp = norm * (eff.includes('displace') ? 16 : 12);
          sx = Math.round(x + Math.sin(y * 0.14) * amp);
          sy = Math.round(y + Math.cos(x * 0.14) * amp);
        } else if (eff.includes('zigzag')) {
          const ang = Math.atan2(dy, dx);
          const wave = Math.sin(dist * 0.22) * norm * 0.35;
          sx = Math.round(cx + dist * Math.cos(ang + wave));
          sy = Math.round(cy + dist * Math.sin(ang + wave));
        } else if (dist < maxR && dist > 0.5) {
          const factor = 1 - dist / maxR;
          if (eff.includes('pinch')) {
            const scale = 1 - factor * norm * 0.65;
            sx = Math.round(cx + dx * scale);
            sy = Math.round(cy + dy * scale);
          } else if (eff.includes('sphere')) {
            const rNorm = dist / maxR;
            const scale = Math.pow(rNorm, 1 + norm * 0.75) / Math.max(0.01, rNorm);
            sx = Math.round(cx + dx * scale);
            sy = Math.round(cy + dy * scale);
            spec = Math.max(0, 1 - Math.hypot(dx + maxR * 0.32, dy + maxR * 0.32) / (maxR * 0.55)) * norm * 70;
            shade = 1 - Math.pow(rNorm, 2.2) * norm * 0.4;
          } else {
            const angle = Math.atan2(dy, dx) + factor * norm * 4.5;
            sx = Math.round(cx + dist * Math.cos(angle));
            sy = Math.round(cy + dist * Math.sin(angle));
          }
        }
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const si = (sy * w + sx) * 4;
          const di = (y * w + x) * 4;
          data[di] = clamp255(orig[si] * shade + spec);
          data[di + 1] = clamp255(orig[si + 1] * shade + spec);
          data[di + 2] = clamp255(orig[si + 2] * shade + spec);
          data[di + 3] = orig[si + 3];
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  // 11. CAMERA / OVERLAY EFFECTS (Page Curl, Lens Flare, Vignette, Frame, Smoked Glass, Weather, Bubbles)
  if (eff.includes('page curl')) {
    const foldSize = Math.round(Math.min(w, h) * (0.18 + norm * 0.32));
    // Clip corner off original
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - foldSize, h);
    ctx.lineTo(w, h - foldSize);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Draw curled flap
    const grad = ctx.createLinearGradient(w - foldSize, h - foldSize, w - foldSize * 0.2, h - foldSize * 0.2);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.55, '#cbd5e1');
    grad.addColorStop(1, '#475569');
    ctx.beginPath();
    ctx.moveTo(w - foldSize, h);
    ctx.lineTo(w - foldSize, h - foldSize);
    ctx.lineTo(w, h - foldSize);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.35)';
    ctx.stroke();
    return out;
  }

  if (eff.includes('lens flare')) {
    const fx = w * 0.32;
    const fy = h * 0.28;
    const rad = Math.max(w, h) * (0.35 + norm * 0.35);
    const flare = ctx.createRadialGradient(fx, fy, 2, fx, fy, rad);
    flare.addColorStop(0, `rgba(255, 255, 240, ${(0.65 + norm * 0.35).toFixed(2)})`);
    flare.addColorStop(0.2, `rgba(255, 220, 140, ${(0.35 + norm * 0.35).toFixed(2)})`);
    flare.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, w, h);
    // Secondary bokeh rings along axis
    [0.55, 0.72, 0.85].forEach((t, idx) => {
      const bx = fx + (w / 2 - fx) * t * 1.4;
      const by = fy + (h / 2 - fy) * t * 1.4;
      const br = Math.max(6, (10 + idx * 8) * (0.6 + norm * 0.6));
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(125, 211, 252, ${(0.14 + norm * 0.14).toFixed(2)})`;
      ctx.fill();
    });
    return out;
  }

  if (eff.includes('vignette') || eff.includes('smoked glass')) {
    if (eff.includes('smoked glass')) {
      ctx.filter = `blur(${(2 + norm * 5).toFixed(1)}px) brightness(${(0.88 - norm * 0.28).toFixed(2)})`;
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.filter = 'none';
    }
    const grad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * (eff.includes('smoked') ? 0.1 : 0.2),
      w / 2,
      h / 2,
      Math.max(w, h) * 0.68
    );
    grad.addColorStop(0, eff.includes('smoked') ? `rgba(15,23,42,${(norm * 0.32).toFixed(2)})` : 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(10,12,18,${(0.35 + norm * 0.55).toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return out;
  }

  if (eff.includes('frame')) {
    const bw = Math.max(6, Math.round(Math.min(w, h) * (0.04 + norm * 0.09)));
    ctx.strokeStyle = '#3f2e1d';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = Math.max(2, bw * 0.22);
    ctx.strokeRect(bw * 0.9, bw * 0.9, w - bw * 1.8, h - bw * 1.8);
    return out;
  }

  if (eff.includes('weather')) {
    ctx.filter = `brightness(${(0.92 - norm * 0.15).toFixed(2)}) contrast(${(1 + norm * 0.2).toFixed(2)})`;
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.strokeStyle = `rgba(224, 242, 254, ${(0.25 + norm * 0.45).toFixed(2)})`;
    ctx.lineWidth = 1.2;
    const dropCount = Math.round(35 + norm * 110);
    for (let i = 0; i < dropCount; i++) {
      const rx = ((i * 73) % w);
      const ry = ((i * 137) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 18 + norm * 12);
      ctx.stroke();
    }
    return out;
  }

  if (eff.includes('bubbles')) {
    const count = Math.round(6 + norm * 18);
    for (let i = 0; i < count; i++) {
      const bx = ((i * 97 + 31) % w);
      const by = ((i * 67 + 23) % h);
      const br = Math.max(6, Math.min(w, h) * (0.05 + ((i % 4) * 0.03)));
      const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 1, bx, by, br);
      bg.addColorStop(0, 'rgba(255,255,255,0.7)');
      bg.addColorStop(0.65, 'rgba(186,230,253,0.18)');
      bg.addColorStop(1, 'rgba(255,255,255,0.55)');
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return out;
  }

  // 12. PROCEDURAL TEXTURES (Brick Wall, Woodgrain, Fabric, Etching, Plastic, Canvas, Cobblestone, Stone, Elephant Skin)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] === 0) continue;
      let delta = 0;
      if (eff.includes('brick')) {
        const bh = 18;
        const bw = 36;
        const row = Math.floor(y / bh);
        const shift = (row % 2) * (bw / 2);
        const isMortar = y % bh < 2 || (x + shift) % bw < 2;
        delta = isMortar ? -norm * 75 : ((Math.sin(x * 0.3) * Math.cos(y * 0.3)) * norm * 16);
      } else if (eff.includes('woodgrain')) {
        const ring = Math.sin(Math.hypot(x - w * 0.3, (y - h * 0.5) * 0.35) * 0.35);
        delta = ring * norm * 42;
      } else if (eff.includes('etching')) {
        const hatch = Math.sin((x + y) * 0.9);
        delta = hatch * norm * 52;
      } else if (eff.includes('plastic')) {
        const sheen = Math.pow(Math.max(0, Math.sin(x * 0.08 + y * 0.08)), 6);
        delta = sheen * norm * 85;
      } else if (eff.includes('fabric') || eff.includes('canvas')) {
        const weave = (Math.sin(x * 1.4) + Math.cos(y * 1.4)) * 0.5;
        delta = weave * norm * 32;
      } else {
        // Stone / Cobblestone / Elephant Skin / Generic Texture fallback
        delta = (Math.sin(x * 0.45) * Math.cos(y * 0.45) + Math.sin((x + y) * 0.22)) * norm * 30;
      }
      data[idx] = clamp255(orig[idx] + delta);
      data[idx + 1] = clamp255(orig[idx + 1] + delta);
      data[idx + 2] = clamp255(orig[idx + 2] + delta);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  void cat;
  return out;
}

function applyLensToObject(
  obj: fabric.FabricObject,
  lensType: 'transparency' | 'invert' | 'grayscale' | 'color_add' | 'brighten',
  lensAmount: number,
  lensColor: string
): void {
  const anyObj = obj as any;
  if ((obj.type === 'group' || obj.type === 'activeselection') && typeof anyObj.getObjects === 'function') {
    for (const child of anyObj.getObjects()) {
      applyLensToObject(child, lensType, lensAmount, lensColor);
    }
    anyObj.hasEffects = true;
    obj.setCoords();
    return;
  }

  if (lensType === 'transparency') {
    obj.set('opacity', Math.max(0.05, 1 - lensAmount / 100));
  } else {
    const transformHex = (col: string): string => {
      const hex = normalizeHex(col);
      if (!hex) return col;
      if (lensType === 'invert') {
        const { r, g, b } = hexToRgb(hex);
        return rgbToHex(255 - r, 255 - g, 255 - b);
      }
      if (lensType === 'grayscale') {
        const { r, g, b } = hexToRgb(hex);
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        return rgbToHex(lum, lum, lum);
      }
      if (lensType === 'color_add') {
        return interpolateHex(hex, lensColor, lensAmount / 100);
      }
      if (lensType === 'brighten') {
        return interpolateHex(hex, '#ffffff', lensAmount / 100);
      }
      return col;
    };

    if (typeof obj.fill === 'string' && obj.fill !== 'transparent') {
      obj.set('fill', transformHex(obj.fill));
    } else if (obj.fill && typeof (obj.fill as any).colorStops !== 'undefined') {
      const grad = obj.fill as fabric.Gradient<'linear' | 'radial'>;
      if (Array.isArray(grad.colorStops)) {
        grad.colorStops = grad.colorStops.map((s) => ({
          ...s,
          color: transformHex(s.color),
        }));
      }
    }
  }
  anyObj.hasEffects = true;
  obj.setCoords();
}

function removeSelectedTarget(canvas: fabric.Canvas, selectedObject: fabric.FabricObject): void {
  if (selectedObject.type === 'activeselection') {
    const items = [...(selectedObject as fabric.ActiveSelection).getObjects()];
    canvas.discardActiveObject();
    items.forEach((o) => canvas.remove(o));
  } else {
    canvas.discardActiveObject();
    canvas.remove(selectedObject);
  }
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
  const [embossParams, setEmbossParams] = useState<EmbossParams>({ ...DEFAULT_EMBOSS_PARAMS });
  const [embossEyedropper, setEmbossEyedropper] = useState(false);
  const [previewSrcCanvas, setPreviewSrcCanvas] = useState<HTMLCanvasElement | null>(null);
  const previewOutRef = useRef<HTMLCanvasElement | null>(null);

  const isEmbossDialog =
    dialog?.kind === 'filter' && dialog.effectName.toLowerCase().includes('emboss');

  useEffect(() => {
    if (!dialog || dialog.kind !== 'filter' || !selectedObject) {
      setPreviewSrcCanvas(null);
      setEmbossEyedropper(false);
      return;
    }
    setFilterAmount(50);
    setEmbossEyedropper(false);
    if (dialog.effectName.toLowerCase().includes('emboss')) {
      const existing = extractTargetEmbossForUi(selectedObject);
      setEmbossParams(existing.hasEmboss ? existing.params : { ...DEFAULT_EMBOSS_PARAMS });
    }
    const existingSrcUrl = (selectedObject as any).embossSourceDataUrl as string | undefined;
    const dataUrl =
      dialog.effectName.toLowerCase().includes('emboss') && existingSrcUrl
        ? existingSrcUrl
        : selectedObject.toDataURL({
            format: 'png',
            multiplier: 1,
            withoutShadow: true,
            enableRetinaScaling: false,
          });
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
    const processed = isEmbossDialog
      ? applyEmbossToCanvas(previewSrcCanvas, embossParams)
      : applyPixelEffectToCanvas(
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
  }, [dialog, previewSrcCanvas, filterAmount, isEmbossDialog, embossParams]);

  if (!dialog || !canvas) return null;

  const panelCls = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f0f0f0] border-[#828790] text-[#1e1e1e]';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-[#111]';

  const makeCloneableTemplate = async (target: fabric.FabricObject): Promise<fabric.FabricObject> => {
    if (target.type === 'activeselection') {
      const items = (target as fabric.ActiveSelection).getObjects();
      const clonedItems = await Promise.all(items.map((it) => it.clone()));
      return new fabric.Group(clonedItems, { objectCaching: false });
    }
    return await target.clone();
  };

  const applyContour = async () => {
    if (!selectedObject) return;
    const objects = canvas.getObjects();
    const firstItem =
      selectedObject.type === 'activeselection'
        ? (selectedObject as fabric.ActiveSelection).getObjects()[0]
        : selectedObject;
    const insertIdx = Math.max(0, objects.indexOf(firstItem));
    const origCenter = selectedObject.getCenterPoint();
    const baseFill = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#00a651';

    for (let i = steps; i >= 1; i--) {
      const clone = await makeCloneableTemplate(selectedObject);
      const sign = contourMode === 'inside' ? -1 : contourMode === 'center' ? (i % 2 === 0 ? 1 : -1) : 1;
      const w = Math.max(8, selectedObject.getScaledWidth());
      const h = Math.max(8, selectedObject.getScaledHeight());
      const scaleFactorX = Math.max(0.15, (w + sign * i * offsetPx * 2) / w);
      const scaleFactorY = Math.max(0.15, (h + sign * i * offsetPx * 2) / h);
      const t = i / steps;
      clone.set({
        scaleX: (clone.scaleX || 1) * scaleFactorX,
        scaleY: (clone.scaleY || 1) * scaleFactorY,
        fill: interpolateHex(baseFill, contourColor, t),
        stroke: contourColor,
        strokeWidth: Math.max(1, selectedObject.strokeWidth || 1),
      });
      clone.setPositionByOrigin(origCenter, 'center', 'center');
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
    const targets =
      selectedObject.type === 'activeselection'
        ? (selectedObject as fabric.ActiveSelection).getObjects()
        : [selectedObject];

    for (const target of targets) {
      target.set({
        shadow: new fabric.Shadow({
          color: `rgba(15, 23, 42, ${(bevelIntensity / 100).toFixed(2)})`,
          blur: Math.max(2, bevelDistance * 1.4),
          offsetX: Math.round(bevelDistance * 0.45),
          offsetY: Math.round(bevelDistance * 0.45),
        }),
        stroke: target.stroke && target.stroke !== 'transparent' ? target.stroke : '#e2e8f0',
        strokeWidth: Math.max(2, target.strokeWidth || 3),
      });
      (target as any).hasEffects = true;
      target.setCoords();
    }
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
    const amt = Math.max(-0.9, Math.min(0.9, envelopeAmount / 100));
    const targets =
      selectedObject.type === 'activeselection'
        ? (selectedObject as fabric.ActiveSelection).getObjects()
        : [selectedObject];

    const mappedPresetId =
      envelopePreset === 'arc_top'
        ? 'inward_pinch'
        : envelopePreset === 'bulge'
        ? 'bulge_out'
        : envelopePreset;

    let lastResult: fabric.FabricObject | null = null;
    for (const target of targets) {
      lastResult = applyEnvelopePresetToTarget(canvas, target, mappedPresetId, amt);
    }
    if (targets.length === 1 && lastResult) {
      canvas.setActiveObject(lastResult);
      (canvas as any).fire('envelope:updated', { target: lastResult });
    }
    canvas.requestRenderAll();
    onCanvasUpdated('Envelope');
    onToast?.(`Applied ${envelopePreset.replace(/_/g, ' ')} Envelope`);
    onClose();
  };

  const applyExtrude = async () => {
    if (!selectedObject) return;
    await applyExtrudeParamsToTarget(canvas, selectedObject, {
      extrudeType: 'small_back',
      offsetX: extrudeDepthX * 2,
      offsetY: extrudeDepthY * 2,
      depth: 50,
      colorMode: 'solid',
      solidColor: extrudeColor,
    });
    onCanvasUpdated('Extrude');
    onToast?.('Applied 3D Extrude');
    onClose();
  };

  const applyLens = () => {
    if (!selectedObject) return;
    applyLensToObject(selectedObject, lensType, lensAmount, lensColor);
    canvas.requestRenderAll();
    onCanvasUpdated('Lens');
    onToast?.(`Applied ${lensType.replace('_', ' ')} Lens`);
    onClose();
  };

  const applyPointillizer = () => {
    if (!selectedObject) return;
    const bound = selectedObject.getBoundingRect();
    const offData = selectedObject.toDataURL({
      format: 'png',
      multiplier: 1,
      withoutShadow: true,
      enableRetinaScaling: false,
    });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, img.width);
      c.height = Math.max(1, img.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pix = ctx.getImageData(0, 0, c.width, c.height).data;
      // Auto-adapt spacing if object is huge so we never generate > ~1800 dots
      const minSafeSpacing = Math.sqrt((c.width * c.height) / 1800);
      const step = Math.max(pointSpacing, minSafeSpacing);
      const sxRatio = bound.width / Math.max(1, c.width);
      const syRatio = bound.height / Math.max(1, c.height);
      const dots: fabric.Circle[] = [];
      for (let y = step / 2; y < c.height; y += step) {
        for (let x = step / 2; x < c.width; x += step) {
          const ix = Math.floor(x);
          const iy = Math.floor(y);
          const idx = (iy * c.width + ix) * 4;
          if (pix[idx + 3] < 40) continue;
          const col = rgbToHex(pix[idx], pix[idx + 1], pix[idx + 2]);
          const dot = new fabric.Circle({
            left: bound.left + x * sxRatio,
            top: bound.top + y * syRatio,
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
        removeSelectedTarget(canvas, selectedObject);
        canvas.add(grp);
        canvas.setActiveObject(grp);
        canvas.requestRenderAll();
        onCanvasUpdated('Pointillizer');
        onToast?.(`Created Pointillizer mosaic (${dots.length} vector dots)`);
      } else {
        onToast?.('Object has no visible pixels for Pointillizer');
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
        const clone = await makeCloneableTemplate(selectedObject);
        clone.set({
          scaleX: (clone.scaleX || 1) * cellScale,
          scaleY: (clone.scaleY || 1) * cellScale,
          left: bound.left + col * (bound.width / cols + gap),
          top: bound.top + row * (bound.height / cols + gap),
          opacity: 0.75 + ((row + col) % 2) * 0.25,
        });
        disableObjectCaching(clone);
        tiles.push(clone);
      }
    }
    const grp = new fabric.Group(tiles, { objectCaching: false });
    ensureObjectId(grp, 'PhotoCocktail Grid');
    disableObjectCaching(grp);
    removeSelectedTarget(canvas, selectedObject);
    canvas.add(grp);
    canvas.setActiveObject(grp);
    canvas.requestRenderAll();
    onCanvasUpdated('PhotoCocktail');
    onToast?.(`Created ${cols}×${cols} PhotoCocktail collage`);
    onClose();
  };

  const applyFilterEffect = async () => {
    if (!selectedObject || dialog.kind !== 'filter' || !previewSrcCanvas) return;
    if (isEmbossDialog) {
      if (!embossParams.enabled && (selectedObject as any).embossConfig) {
        await removeEmbossFromTarget(canvas, selectedObject);
        onCanvasUpdated('Remove Emboss');
        onToast?.('Removed Emboss effect');
        onClose();
        return;
      }
      if (!embossParams.enabled) {
        onClose();
        return;
      }
      await applyEmbossParamsToTarget(canvas, selectedObject, embossParams);
      onCanvasUpdated('Emboss');
      onToast?.(
        `Applied Emboss (Depth: ${embossParams.depth}, Level: ${embossParams.level}, ${embossParams.direction}°)`
      );
      onClose();
      return;
    }
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
      scaleX: bound.width / Math.max(1, imgObj.width || 1),
      scaleY: bound.height / Math.max(1, imgObj.height || 1),
      originX: 'left',
      originY: 'top',
      objectCaching: false,
    });
    (imgObj as any).hasEffects = true;
    ensureObjectId(imgObj, `${dialog.effectName.replace(/\.\.\.$/, '')} Effect`);
    disableObjectCaching(imgObj);
    removeSelectedTarget(canvas, selectedObject);
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
              <div className="w-full h-44 bg-[#444] border border-zinc-500 flex items-center justify-center overflow-hidden p-2 relative">
                <canvas
                  ref={previewOutRef}
                  onClick={(e) => {
                    if (!isEmbossDialog || !embossEyedropper || !previewSrcCanvas || !previewOutRef.current) return;
                    const sampled = sampleCanvasPixelHex(
                      previewSrcCanvas,
                      e.clientX,
                      e.clientY,
                      previewOutRef.current
                    );
                    if (sampled) {
                      setEmbossParams((prev) => ({
                        ...prev,
                        colorMode: 'other',
                        otherColor: sampled,
                      }));
                    }
                    setEmbossEyedropper(false);
                  }}
                  className={`max-w-full max-h-full object-contain ${
                    isEmbossDialog && embossEyedropper ? 'cursor-crosshair' : ''
                  }`}
                />
                {isEmbossDialog && embossEyedropper && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] pointer-events-none">
                    Click preview to sample Emboss color
                  </div>
                )}
              </div>
              {isEmbossDialog ? (
                <EmbossControlsPanel
                  params={embossParams}
                  onChange={(next) => setEmbossParams(next)}
                  onReset={() => setEmbossParams({ ...DEFAULT_EMBOSS_PARAMS })}
                  theme={theme}
                  collapsible={false}
                  eyedropperActive={embossEyedropper}
                  onTriggerEyedropper={async () => {
                    if (embossEyedropper) {
                      setEmbossEyedropper(false);
                      return;
                    }
                    const EyeDropperCtor = (window as any).EyeDropper;
                    if (typeof EyeDropperCtor === 'function') {
                      try {
                        const res = await new EyeDropperCtor().open();
                        if (res?.sRGBHex) {
                          setEmbossParams((prev) => ({
                            ...prev,
                            colorMode: 'other',
                            otherColor: res.sRGBHex,
                          }));
                          return;
                        }
                      } catch {
                        // Fall through to canvas preview sampler
                      }
                    }
                    setEmbossEyedropper(true);
                  }}
                />
              ) : (
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
              )}
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
                  <option value="arc_top">Inward Pinch (4-Side)</option>
                  <option value="bulge">Bulge Out (4-Side)</option>
                  <option value="skew_left">Slant Left</option>
                  <option value="skew_right">Slant Right</option>
                  {ENVELOPE_PRESETS.filter(
                    (p) => !['inward_pinch', 'bulge_out', 'skew_left', 'skew_right'].includes(p.id)
                  ).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
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
