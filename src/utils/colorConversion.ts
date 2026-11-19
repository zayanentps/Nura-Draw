import { CORELDRAW_PALETTE } from './palette';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface CMYKColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface HSBColor {
  h: number; // 0..360
  s: number; // 0..100
  b: number; // 0..100
}

export interface HLSColor {
  h: number; // 0..360
  l: number; // 0..100
  s: number; // 0..100
}

export interface LabColor {
  l: number; // 0..100
  a: number; // -128..127
  b: number; // -128..127
}

export interface YIQColor {
  y: number; // 0..255
  i: number; // 0..255 (100-centered for UI parity)
  q: number; // 0..255 (100-centered for UI parity)
}

export function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function normalizeHex(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'transparent' || trimmed === 'none') return null;

  // Handle #RGB
  const shortMatch = trimmed.match(/^#?([0-9a-f]{3})$/i);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  // Handle #RRGGBB or #RRGGBBAA
  const longMatch = trimmed.match(/^#?([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (longMatch) {
    return `#${longMatch[1]}`.toLowerCase();
  }

  // Handle rgb(r, g, b) / rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = clamp(parseInt(rgbMatch[1], 10), 0, 255);
    const g = clamp(parseInt(rgbMatch[2], 10), 0, 255);
    const b = clamp(parseInt(rgbMatch[3], 10), 0, 255);
    return rgbToHex(r, g, b);
  }

  return null;
}

export function hexToRgb(hex: string): RGBColor {
  const norm = normalizeHex(hex) || '#000000';
  const num = parseInt(norm.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

export function rgbToCmyk(r: number, g: number, b: number): CMYKColor {
  // CorelDRAW default Black (#373435) and near-pure black (#000000) -> K:100
  const hex = rgbToHex(r, g, b);
  if (hex === '#000000' || hex === '#373435') {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const rp = clamp(r, 0, 255) / 255;
  const gp = clamp(g, 0, 255) / 255;
  const bp = clamp(b, 0, 255) / 255;
  const k = 1 - Math.max(rp, gp, bp);
  if (k >= 0.999) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = ((1 - rp - k) / (1 - k)) * 100;
  const m = ((1 - gp - k) / (1 - k)) * 100;
  const y = ((1 - bp - k) / (1 - k)) * 100;
  return {
    c: Math.round(clamp(c, 0, 100)),
    m: Math.round(clamp(m, 0, 100)),
    y: Math.round(clamp(y, 0, 100)),
    k: Math.round(clamp(k * 100, 0, 100)),
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): RGBColor {
  const cp = clamp(c, 0, 100) / 100;
  const mp = clamp(m, 0, 100) / 100;
  const yp = clamp(y, 0, 100) / 100;
  const kp = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - cp) * (1 - kp)),
    g: Math.round(255 * (1 - mp) * (1 - kp)),
    b: Math.round(255 * (1 - yp) * (1 - kp)),
  };
}

export function rgbToHsb(r: number, g: number, b: number): HSBColor {
  const rp = clamp(r, 0, 255) / 255;
  const gp = clamp(g, 0, 255) / 255;
  const bp = clamp(b, 0, 255) / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rp) h = ((gp - bp) / d) % 6;
    else if (max === gp) h = (bp - rp) / d + 2;
    else h = (rp - gp) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const br = max * 100;
  return {
    h: Math.round(h) % 360,
    s: Math.round(clamp(s, 0, 100)),
    b: Math.round(clamp(br, 0, 100)),
  };
}

export function hsbToRgb(h: number, s: number, b: number): RGBColor {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const bb = clamp(b, 0, 100) / 100;
  const c = bb * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = bb - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function rgbToHls(r: number, g: number, b: number): HLSColor {
  const rp = clamp(r, 0, 255) / 255;
  const gp = clamp(g, 0, 255) / 255;
  const bp = clamp(b, 0, 255) / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rp) h = ((gp - bp) / d) % 6;
    else if (max === gp) h = (bp - rp) / d + 2;
    else h = (rp - gp) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return {
    h: Math.round(h) % 360,
    l: Math.round(clamp(l * 100, 0, 100)),
    s: Math.round(clamp(s * 100, 0, 100)),
  };
}

export function hlsToRgb(h: number, l: number, s: number): RGBColor {
  const hh = ((h % 360) + 360) % 360;
  const ll = clamp(l, 0, 100) / 100;
  const ss = clamp(s, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function rgbToLab(r: number, g: number, b: number): LabColor {
  const linearize = (v: number) => {
    const s = v / 255;
    return s > 0.04045 ? Math.pow((s + 0.055) / 1.055, 2.4) : s / 12.92;
  };
  const rl = linearize(clamp(r, 0, 255));
  const gl = linearize(clamp(g, 0, 255));
  const bl = linearize(clamp(b, 0, 255));

  // Observer = 2°, Illuminant = D65
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    l: Math.round(clamp(116 * fy - 16, 0, 100)),
    a: Math.round(clamp(500 * (fx - fy), -128, 127)),
    b: Math.round(clamp(200 * (fy - fz), -128, 127)),
  };
}

export function labToRgb(l: number, a: number, b: number): RGBColor {
  const fy = (clamp(l, 0, 100) + 16) / 116;
  const fx = clamp(a, -128, 127) / 500 + fy;
  const fz = fy - clamp(b, -128, 127) / 200;

  const finv = (t: number) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
  const x = finv(fx) * 0.95047;
  const y = finv(fy) * 1.0;
  const z = finv(fz) * 1.08883;

  const rl = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const gl = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  const bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  const gamma = (u: number) => {
    const c = clamp(u, 0, 1);
    return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  };

  return {
    r: Math.round(gamma(rl) * 255),
    g: Math.round(gamma(gl) * 255),
    b: Math.round(gamma(bl) * 255),
  };
}

export function rgbToYiq(r: number, g: number, b: number): YIQColor {
  const rr = clamp(r, 0, 255);
  const gg = clamp(g, 0, 255);
  const bb = clamp(b, 0, 255);
  const y = 0.299 * rr + 0.587 * gg + 0.114 * bb;
  const i = 0.595716 * rr - 0.274453 * gg - 0.321263 * bb;
  const q = 0.211456 * rr - 0.522591 * gg + 0.311135 * bb;
  // Offset I and Q by +100 so neutral gray/black centers around 100 (Corel UI convention)
  return {
    y: Math.round(clamp(y, 0, 255)),
    i: Math.round(clamp(i + 100, 0, 255)),
    q: Math.round(clamp(q + 100, 0, 255)),
  };
}

export function yiqToRgb(y: number, iOffset: number, qOffset: number): RGBColor {
  const yy = clamp(y, 0, 255);
  const ii = iOffset - 100;
  const qq = qOffset - 100;
  const r = yy + 0.9563 * ii + 0.621 * qq;
  const g = yy - 0.2721 * ii - 0.6474 * qq;
  const b = yy - 1.107 * ii + 1.7046 * qq;
  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
  };
}

export function formatCmykComponents(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  return `C:${c} M:${m} Y:${y} K:${k}`;
}

export function resolveColorName(hex: string): string {
  const norm = normalizeHex(hex);
  if (!norm) return 'None';
  if (norm === '#000000' || norm === '#373435') return 'Black';

  const exact = CORELDRAW_PALETTE.find((s) => s.hex.toLowerCase() === norm);
  if (exact) return exact.name;

  const { r, g, b } = hexToRgb(norm);
  return `RGB (${r}, ${g}, ${b})`;
}

export function getSwatchLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
