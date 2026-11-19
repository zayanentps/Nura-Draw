export type UnitType = 'in' | 'mm' | 'cm' | 'px' | 'pt' | 'pc' | 'ft' | 'm' | 'yd';

export type PagePreset =
  | 'Letter'
  | 'Legal'
  | 'Tabloid'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'B4'
  | 'B5'
  | 'BusinessCard'
  | 'BusinessCardEuro'
  | 'Postcard'
  | 'EnvelopeDL'
  | 'FHD'
  | 'UHD4K'
  | 'InstagramPost'
  | 'InstagramStory'
  | 'FacebookCover'
  | 'YouTubeThumbnail'
  | 'TwitterHeader'
  | 'Custom';

export interface UnitInfo {
  id: UnitType;
  label: string;
  symbol: string;
  pxPerUnit: number; // At standard 96 DPI: 1 inch = 96 px
  decimals: number;
  step: number;
}

// 96 CSS pixels per inch standard
export const UNITS_DATA: Record<UnitType, UnitInfo> = {
  in: {
    id: 'in',
    label: 'Inches',
    symbol: '"',
    pxPerUnit: 96,
    decimals: 3,
    step: 0.1,
  },
  mm: {
    id: 'mm',
    label: 'Millimeters',
    symbol: 'mm',
    pxPerUnit: 96 / 25.4, // ~3.7795 px
    decimals: 1,
    step: 1,
  },
  cm: {
    id: 'cm',
    label: 'Centimeters',
    symbol: 'cm',
    pxPerUnit: 96 / 2.54, // ~37.795 px
    decimals: 2,
    step: 0.5,
  },
  px: {
    id: 'px',
    label: 'Pixels',
    symbol: 'px',
    pxPerUnit: 1,
    decimals: 0,
    step: 10,
  },
  pt: {
    id: 'pt',
    label: 'Points (1/72")',
    symbol: 'pt',
    pxPerUnit: 96 / 72, // 4/3 px
    decimals: 1,
    step: 1,
  },
  pc: {
    id: 'pc',
    label: 'Picas (12 pt)',
    symbol: 'pc',
    pxPerUnit: 16, // 12 * (4/3)
    decimals: 2,
    step: 0.5,
  },
  ft: {
    id: 'ft',
    label: 'Feet',
    symbol: 'ft',
    pxPerUnit: 96 * 12, // 1152 px
    decimals: 3,
    step: 0.1,
  },
  m: {
    id: 'm',
    label: 'Meters',
    symbol: 'm',
    pxPerUnit: (96 / 2.54) * 100, // 3779.528 px
    decimals: 3,
    step: 0.05,
  },
  yd: {
    id: 'yd',
    label: 'Yards',
    symbol: 'yd',
    pxPerUnit: 96 * 36, // 3456 px
    decimals: 3,
    step: 0.1,
  },
};

export const ALL_UNITS: UnitInfo[] = [
  UNITS_DATA.in,
  UNITS_DATA.mm,
  UNITS_DATA.cm,
  UNITS_DATA.px,
  UNITS_DATA.pt,
  UNITS_DATA.pc,
  UNITS_DATA.ft,
  UNITS_DATA.m,
  UNITS_DATA.yd,
];

// Convert pixels to given unit
export function pxToUnit(px: number, unit: UnitType, decimals?: number): number {
  const info = UNITS_DATA[unit] || UNITS_DATA.px;
  const val = px / info.pxPerUnit;
  const dec = decimals !== undefined ? decimals : info.decimals;
  return Number(val.toFixed(dec));
}

// Convert given unit to pixels
export function unitToPx(val: number, unit: UnitType): number {
  const info = UNITS_DATA[unit] || UNITS_DATA.px;
  return val * info.pxPerUnit;
}

// Convert between any two units
export function convertUnit(val: number, from: UnitType, to: UnitType): number {
  if (from === to) return val;
  const px = unitToPx(val, from);
  return pxToUnit(px, to);
}

// Format number with unit symbol
export function formatWithUnit(val: number, unit: UnitType, decimals?: number): string {
  const num = pxToUnit(val, unit, decimals);
  const info = UNITS_DATA[unit] || UNITS_DATA.px;
  return `${num} ${info.symbol}`;
}

export interface PresetInfo {
  id: PagePreset;
  name: string;
  category: 'Print' | 'Stationery' | 'Digital / Web' | 'Social Media' | 'Custom';
  widthPx: number; // width in px
  heightPx: number; // height in px
  description: string;
}

export const PAGE_PRESETS: PresetInfo[] = [
  // Standard Print
  {
    id: 'Letter',
    name: 'Letter',
    category: 'Print',
    widthPx: 816, // 8.5" * 96
    heightPx: 1056, // 11" * 96
    description: '8.5 × 11 in (215.9 × 279.4 mm)',
  },
  {
    id: 'Legal',
    name: 'Legal',
    category: 'Print',
    widthPx: 816, // 8.5" * 96
    heightPx: 1344, // 14" * 96
    description: '8.5 × 14 in (215.9 × 355.6 mm)',
  },
  {
    id: 'Tabloid',
    name: 'Tabloid / Ledger',
    category: 'Print',
    widthPx: 1056, // 11" * 96
    heightPx: 1632, // 17" * 96
    description: '11 × 17 in (279.4 × 431.8 mm)',
  },
  {
    id: 'A3',
    name: 'A3',
    category: 'Print',
    widthPx: 1123, // 297 mm
    heightPx: 1587, // 420 mm
    description: '297 × 420 mm (11.7 × 16.5 in)',
  },
  {
    id: 'A4',
    name: 'A4',
    category: 'Print',
    widthPx: 794, // 210 mm
    heightPx: 1123, // 297 mm
    description: '210 × 297 mm (8.3 × 11.7 in)',
  },
  {
    id: 'A5',
    name: 'A5',
    category: 'Print',
    widthPx: 559, // 148 mm
    heightPx: 794, // 210 mm
    description: '148 × 210 mm (5.8 × 8.3 in)',
  },
  {
    id: 'A6',
    name: 'A6',
    category: 'Print',
    widthPx: 397, // 105 mm
    heightPx: 559, // 148 mm
    description: '105 × 148 mm (4.1 × 5.8 in)',
  },
  {
    id: 'B4',
    name: 'B4 (ISO)',
    category: 'Print',
    widthPx: 945, // 250 mm
    heightPx: 1334, // 353 mm
    description: '250 × 353 mm (9.8 × 13.9 in)',
  },
  {
    id: 'B5',
    name: 'B5 (ISO)',
    category: 'Print',
    widthPx: 665, // 176 mm
    heightPx: 945, // 250 mm
    description: '176 × 250 mm (6.9 × 9.8 in)',
  },

  // Stationery
  {
    id: 'BusinessCard',
    name: 'Business Card (US)',
    category: 'Stationery',
    widthPx: 336, // 3.5" * 96
    heightPx: 192, // 2" * 96
    description: '3.5 × 2.0 in (88.9 × 50.8 mm)',
  },
  {
    id: 'BusinessCardEuro',
    name: 'Business Card (Euro)',
    category: 'Stationery',
    widthPx: 321, // 85 mm
    heightPx: 208, // 55 mm
    description: '85 × 55 mm',
  },
  {
    id: 'Postcard',
    name: 'Postcard',
    category: 'Stationery',
    widthPx: 576, // 6" * 96
    heightPx: 384, // 4" * 96
    description: '6 × 4 in (152.4 × 101.6 mm)',
  },
  {
    id: 'EnvelopeDL',
    name: 'Envelope DL',
    category: 'Stationery',
    widthPx: 831, // 220 mm
    heightPx: 416, // 110 mm
    description: '220 × 110 mm (8.66 × 4.33 in)',
  },

  // Digital / Web
  {
    id: 'FHD',
    name: 'Full HD 1080p',
    category: 'Digital / Web',
    widthPx: 1920,
    heightPx: 1080,
    description: '1920 × 1080 px (16:9)',
  },
  {
    id: 'UHD4K',
    name: '4K Ultra HD',
    category: 'Digital / Web',
    widthPx: 3840,
    heightPx: 2160,
    description: '3840 × 2160 px (16:9)',
  },

  // Social Media
  {
    id: 'InstagramPost',
    name: 'Instagram Post (Square)',
    category: 'Social Media',
    widthPx: 1080,
    heightPx: 1080,
    description: '1080 × 1080 px (1:1)',
  },
  {
    id: 'InstagramStory',
    name: 'Instagram Story / Reel',
    category: 'Social Media',
    widthPx: 1080,
    heightPx: 1920,
    description: '1080 × 1920 px (9:16)',
  },
  {
    id: 'FacebookCover',
    name: 'Facebook Cover',
    category: 'Social Media',
    widthPx: 820,
    heightPx: 312,
    description: '820 × 312 px',
  },
  {
    id: 'YouTubeThumbnail',
    name: 'YouTube Thumbnail',
    category: 'Social Media',
    widthPx: 1280,
    heightPx: 720,
    description: '1280 × 720 px (16:9)',
  },
  {
    id: 'TwitterHeader',
    name: 'Twitter / X Header',
    category: 'Social Media',
    widthPx: 1500,
    heightPx: 500,
    description: '1500 × 500 px (3:1)',
  },

  // Custom
  {
    id: 'Custom',
    name: 'Custom Size',
    category: 'Custom',
    widthPx: 816,
    heightPx: 1056,
    description: 'User specified width and height',
  },
];
