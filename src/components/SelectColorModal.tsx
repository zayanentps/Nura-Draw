import React, { useEffect, useRef, useState } from 'react';
import { Pipette, RefreshCw, X } from 'lucide-react';
import { DocumentPaletteSwatch } from '../types';
import { CORELDRAW_PALETTE } from '../utils/palette';
import {
  clamp,
  cmykToRgb,
  formatCmykComponents,
  hexToRgb,
  hlsToRgb,
  hsbToRgb,
  labToRgb,
  normalizeHex,
  resolveColorName,
  rgbToCmyk,
  rgbToHex,
  rgbToHls,
  rgbToHsb,
  rgbToLab,
  rgbToYiq,
  yiqToRgb,
} from '../utils/colorConversion';

export interface SelectColorResult {
  hex: string;
  name: string;
  cmyk: string;
}

interface SelectColorModalProps {
  isOpen: boolean;
  initialHex?: string;
  initialName?: string;
  documentSwatches?: DocumentPaletteSwatch[];
  onConfirm: (result: SelectColorResult) => void;
  onCancel: () => void;
}

type ViewerMode = 'HSB - Hue Based' | 'CMYK' | 'RGB' | 'Grayscale';
type ColorModelOption = 'CMYK' | 'RGB' | 'HSB' | 'HLS' | 'Lab' | 'Grayscale';

export const SelectColorModal: React.FC<SelectColorModalProps> = ({
  isOpen,
  initialHex = '#373435',
  initialName,
  documentSwatches = [],
  onConfirm,
  onCancel,
}) => {
  const normalizedInitial = normalizeHex(initialHex) || '#373435';

  const [tabMode, setTabMode] = useState<'viewers' | 'palettes'>('viewers');
  const [viewerMode, setViewerMode] = useState<ViewerMode>('HSB - Hue Based');
  const [colorModel, setColorModel] = useState<ColorModelOption>('CMYK');
  const [paletteSource, setPaletteSource] = useState<'cmyk' | 'grayscale' | 'document'>('cmyk');

  const [hex, setHex] = useState<string>(normalizedInitial);
  const [hexInput, setHexInput] = useState<string>(normalizedInitial);
  const [colorName, setColorName] = useState<string>(initialName || resolveColorName(normalizedInitial));
  const [nameEdited, setNameEdited] = useState<boolean>(Boolean(initialName));

  // Keep HSB state separately so dragging to black/white preserves Hue
  const initialRgb = hexToRgb(normalizedInitial);
  const initialHsb = rgbToHsb(initialRgb.r, initialRgb.g, initialRgb.b);
  const [hsb, setHsb] = useState<{ h: number; s: number; b: number }>(initialHsb);

  const squareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingSquareRef = useRef(false);
  const draggingBarRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const norm = normalizeHex(initialHex) || '#373435';
    const rgb = hexToRgb(norm);
    const nextHsb = rgbToHsb(rgb.r, rgb.g, rgb.b);
    setHex(norm);
    setHexInput(norm);
    setHsb(nextHsb);
    setColorName(initialName || resolveColorName(norm));
    setNameEdited(Boolean(initialName));
    setTabMode('viewers');
  }, [isOpen, initialHex, initialName]);

  const rgb = hexToRgb(hex);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const hls = rgbToHls(rgb.r, rgb.g, rgb.b);
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const yiq = rgbToYiq(rgb.r, rgb.g, rgb.b);

  const commitRgb = (r: number, g: number, b: number, preserveHue?: number) => {
    const nextHex = rgbToHex(r, g, b);
    const nextHsb = rgbToHsb(r, g, b);
    if (preserveHue !== undefined) {
      nextHsb.h = preserveHue;
    } else if (nextHsb.s === 0 || nextHsb.b === 0) {
      nextHsb.h = hsb.h;
    }
    setHex(nextHex);
    setHexInput(nextHex);
    setHsb(nextHsb);
    if (!nameEdited) {
      setColorName(resolveColorName(nextHex));
    }
  };

  const commitHsb = (h: number, s: number, b: number) => {
    const clampedH = ((Math.round(h) % 360) + 360) % 360;
    const clampedS = clamp(Math.round(s), 0, 100);
    const clampedB = clamp(Math.round(b), 0, 100);
    const nextRgb = hsbToRgb(clampedH, clampedS, clampedB);
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setHsb({ h: clampedH, s: clampedS, b: clampedB });
    setHex(nextHex);
    setHexInput(nextHex);
    if (!nameEdited) {
      setColorName(resolveColorName(nextHex));
    }
  };

  // Render 2D viewer square
  useEffect(() => {
    if (!isOpen || tabMode !== 'viewers') return;
    const canvas = squareCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (viewerMode === 'HSB - Hue Based') {
      // Base pure hue
      const pure = hsbToRgb(hsb.h, 100, 100);
      ctx.fillStyle = `rgb(${pure.r}, ${pure.g}, ${pure.b})`;
      ctx.fillRect(0, 0, w, h);

      // Horizontal white gradient (left = white, right = transparent)
      const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
      whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
      whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(0, 0, w, h);

      // Vertical black gradient (top = transparent, bottom = black)
      const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
      blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
      blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = blackGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (viewerMode === 'RGB') {
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        const bVal = Math.round(((h - 1 - y) / (h - 1)) * 255);
        for (let x = 0; x < w; x++) {
          const gVal = Math.round((x / (w - 1)) * 255);
          const idx = (y * w + x) * 4;
          img.data[idx] = rgb.r;
          img.data[idx + 1] = gVal;
          img.data[idx + 2] = bVal;
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    } else if (viewerMode === 'CMYK') {
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        const mVal = ((h - 1 - y) / (h - 1)) * 100;
        for (let x = 0; x < w; x++) {
          const cVal = (x / (w - 1)) * 100;
          const p = cmykToRgb(cVal, mVal, cmyk.y, cmyk.k);
          const idx = (y * w + x) * 4;
          img.data[idx] = p.r;
          img.data[idx + 1] = p.g;
          img.data[idx + 2] = p.b;
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    } else {
      // Grayscale
      const grayGrad = ctx.createLinearGradient(0, 0, 0, h);
      grayGrad.addColorStop(0, '#ffffff');
      grayGrad.addColorStop(1, '#000000');
      ctx.fillStyle = grayGrad;
      ctx.fillRect(0, 0, w, h);
    }
  }, [isOpen, tabMode, viewerMode, hsb.h, rgb.r, cmyk.y, cmyk.k]);

  // Render horizontal spectrum / component bar
  useEffect(() => {
    if (!isOpen || tabMode !== 'viewers') return;
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);

    if (viewerMode === 'HSB - Hue Based') {
      grad.addColorStop(0, '#ff0000');
      grad.addColorStop(1 / 6, '#ffff00');
      grad.addColorStop(2 / 6, '#00ff00');
      grad.addColorStop(3 / 6, '#00ffff');
      grad.addColorStop(4 / 6, '#0000ff');
      grad.addColorStop(5 / 6, '#ff00ff');
      grad.addColorStop(1, '#ff0000');
    } else if (viewerMode === 'RGB') {
      grad.addColorStop(0, `rgb(0, ${rgb.g}, ${rgb.b})`);
      grad.addColorStop(1, `rgb(255, ${rgb.g}, ${rgb.b})`);
    } else if (viewerMode === 'CMYK') {
      const zero = cmykToRgb(cmyk.c, cmyk.m, 0, cmyk.k);
      const full = cmykToRgb(cmyk.c, cmyk.m, 100, cmyk.k);
      grad.addColorStop(0, `rgb(${zero.r}, ${zero.g}, ${zero.b})`);
      grad.addColorStop(1, `rgb(${full.r}, ${full.g}, ${full.b})`);
    } else {
      grad.addColorStop(0, '#000000');
      grad.addColorStop(1, '#ffffff');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, [isOpen, tabMode, viewerMode, rgb.g, rgb.b, cmyk.c, cmyk.m, cmyk.k]);

  // Pointer dragging for 2D square & spectrum bar
  const updateFromSquarePointer = (clientX: number, clientY: number) => {
    const canvas = squareCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((clientY - rect.top) / rect.height, 0, 1);

    if (viewerMode === 'HSB - Hue Based') {
      commitHsb(hsb.h, nx * 100, (1 - ny) * 100);
    } else if (viewerMode === 'RGB') {
      commitRgb(rgb.r, Math.round(nx * 255), Math.round((1 - ny) * 255));
    } else if (viewerMode === 'CMYK') {
      const next = cmykToRgb(Math.round(nx * 100), Math.round((1 - ny) * 100), cmyk.y, cmyk.k);
      commitRgb(next.r, next.g, next.b);
    } else {
      const gray = Math.round((1 - ny) * 255);
      commitRgb(gray, gray, gray);
    }
  };

  const updateFromBarPointer = (clientX: number) => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1);

    if (viewerMode === 'HSB - Hue Based') {
      commitHsb(nx * 359, hsb.s, hsb.b);
    } else if (viewerMode === 'RGB') {
      commitRgb(Math.round(nx * 255), rgb.g, rgb.b);
    } else if (viewerMode === 'CMYK') {
      const next = cmykToRgb(cmyk.c, cmyk.m, Math.round(nx * 100), cmyk.k);
      commitRgb(next.r, next.g, next.b);
    } else {
      const gray = Math.round(nx * 255);
      commitRgb(gray, gray, gray);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerMove = (e: PointerEvent) => {
      if (draggingSquareRef.current) {
        updateFromSquarePointer(e.clientX, e.clientY);
      } else if (draggingBarRef.current) {
        updateFromBarPointer(e.clientX);
      }
    };
    const onPointerUp = () => {
      draggingSquareRef.current = false;
      draggingBarRef.current = false;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  });

  if (!isOpen) return null;

  // Compute crosshair coordinates inside 2D square (in %)
  let markerX = hsb.s;
  let markerY = 100 - hsb.b;
  let barPct = (hsb.h / 360) * 100;

  if (viewerMode === 'RGB') {
    markerX = (rgb.g / 255) * 100;
    markerY = 100 - (rgb.b / 255) * 100;
    barPct = (rgb.r / 255) * 100;
  } else if (viewerMode === 'CMYK') {
    markerX = cmyk.c;
    markerY = 100 - cmyk.m;
    barPct = cmyk.y;
  } else if (viewerMode === 'Grayscale') {
    const lum = Math.round((0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 2.55);
    markerX = 50;
    markerY = 100 - lum;
    barPct = lum;
  }

  const handleEyeDropper = async () => {
    const EyeDropperCtor = (window as any).EyeDropper;
    if (typeof EyeDropperCtor === 'function') {
      try {
        const dropper = new EyeDropperCtor();
        const result = await dropper.open();
        if (result?.sRGBHex) {
          const picked = normalizeHex(result.sRGBHex);
          if (picked) {
            const pRgb = hexToRgb(picked);
            setNameEdited(false);
            commitRgb(pRgb.r, pRgb.g, pRgb.b);
          }
        }
      } catch {
        // User cancelled eyedropper
      }
    }
  };

  const handleResetToInitial = () => {
    const r = hexToRgb(normalizedInitial);
    setNameEdited(false);
    commitRgb(r.r, r.g, r.b);
  };

  const paletteSwatches =
    paletteSource === 'grayscale'
      ? CORELDRAW_PALETTE.slice(1, 12)
      : paletteSource === 'document'
      ? documentSwatches.map((s) => ({ name: s.name, hex: s.hex, cmyk: s.cmyk || formatCmykComponents(s.hex) }))
      : CORELDRAW_PALETTE.filter((s) => s.hex !== 'transparent');

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 select-none font-sans"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="w-[538px] bg-[#f0f0f0] border border-[#707070] shadow-2xl text-[#1e1e1e] text-[12px]">
        {/* Classic Windows Dialog Title Bar */}
        <div className="h-[30px] bg-white px-3 flex items-center justify-between border-b border-[#dcdcdc]">
          <span className="text-[12px] text-[#111]">Select Color</span>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 -mr-1.5 flex items-center justify-center text-[#333] hover:bg-[#e81123] hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 flex gap-5">
          {/* Left Panel: Color Viewers / Color Palettes */}
          <div className="w-[222px] shrink-0 flex flex-col">
            {/* Radio Switch */}
            <div className="flex items-center gap-5 mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[12px]">
                <input
                  type="radio"
                  name="selectColorMode"
                  checked={tabMode === 'viewers'}
                  onChange={() => setTabMode('viewers')}
                  className="accent-[#0078d7]"
                />
                <span>
                  <u>C</u>olor viewers
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[12px]">
                <input
                  type="radio"
                  name="selectColorMode"
                  checked={tabMode === 'palettes'}
                  onChange={() => setTabMode('palettes')}
                  className="accent-[#0078d7]"
                />
                <span>
                  Color <u>p</u>alettes
                </span>
              </label>
            </div>

            {tabMode === 'viewers' ? (
              <>
                {/* Viewer Selector Dropdown */}
                <select
                  value={viewerMode}
                  onChange={(e) => setViewerMode(e.target.value as ViewerMode)}
                  className="w-full h-[23px] px-1.5 mb-2 bg-white border border-[#0078d7] text-[12px] text-[#111] outline-none"
                >
                  <option value="HSB - Hue Based">HSB - Hue Based</option>
                  <option value="CMYK">CMYK</option>
                  <option value="RGB">RGB</option>
                  <option value="Grayscale">Grayscale</option>
                </select>

                {/* 2D Color Square */}
                <div className="relative w-[222px] h-[196px] border border-[#9b9b9b] cursor-crosshair overflow-hidden">
                  <canvas
                    ref={squareCanvasRef}
                    width={222}
                    height={196}
                    onPointerDown={(e) => {
                      draggingSquareRef.current = true;
                      updateFromSquarePointer(e.clientX, e.clientY);
                    }}
                    className="w-full h-full block"
                  />
                  {/* Square Crosshair Marker */}
                  <div
                    className="pointer-events-none absolute w-[9px] h-[9px] -translate-x-1/2 -translate-y-1/2 border border-white shadow-[0_0_0_1px_#000]"
                    style={{
                      left: `${markerX}%`,
                      top: `${markerY}%`,
                    }}
                  />
                </div>

                {/* Horizontal Rainbow / Component Slider Bar */}
                <div className="relative w-[222px] h-[15px] mt-2.5 border border-[#9b9b9b] cursor-ew-resize">
                  <canvas
                    ref={barCanvasRef}
                    width={222}
                    height={15}
                    onPointerDown={(e) => {
                      draggingBarRef.current = true;
                      updateFromBarPointer(e.clientX);
                    }}
                    className="w-full h-full block"
                  />
                  {/* Vertical Thumb Handle */}
                  <div
                    className="pointer-events-none absolute top-[-2px] bottom-[-2px] w-[6px] -translate-x-1/2 border border-black bg-transparent shadow-[inset_0_0_0_1px_#fff]"
                    style={{ left: `${clamp(barPct, 0, 100)}%` }}
                  />
                </div>

                {/* Preview Square + Reset Swap + Eyedropper */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-[38px] h-[38px] border border-[#8e8e8e]"
                      style={{ backgroundColor: hex }}
                      title={`Current: ${hex.toUpperCase()}`}
                    />
                    <button
                      type="button"
                      onClick={handleResetToInitial}
                      title={`Reset to original (${normalizedInitial.toUpperCase()})`}
                      className="w-7 h-7 flex items-center justify-center rounded-xs hover:bg-[#e1e1e1] border border-transparent hover:border-[#adadad] text-[#333]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleEyeDropper}
                    title="Pick color from screen"
                    className="w-7 h-7 flex items-center justify-center rounded-xs hover:bg-[#e1e1e1] border border-transparent hover:border-[#adadad] text-[#333]"
                  >
                    <Pipette className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col flex-1">
                <select
                  value={paletteSource}
                  onChange={(e) => setPaletteSource(e.target.value as 'cmyk' | 'grayscale' | 'document')}
                  className="w-full h-[23px] px-1.5 mb-2 bg-white border border-[#0078d7] text-[12px] text-[#111] outline-none"
                >
                  <option value="cmyk">Default CMYK Palette</option>
                  <option value="grayscale">Grayscale Ramp</option>
                  <option value="document">Document Palette ({documentSwatches.length})</option>
                </select>
                <div className="flex-1 min-h-[215px] max-h-[225px] bg-[#555555] border border-[#828790] p-1.5 overflow-y-auto">
                  {paletteSwatches.length === 0 ? (
                    <div className="text-[11px] text-zinc-200 text-center py-10 px-2">
                      No colors in Document Palette yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-9 gap-[3px]">
                      {paletteSwatches.map((sw, i) => {
                        const swHex = normalizeHex(sw.hex) || '#000000';
                        const active = swHex === hex;
                        return (
                          <button
                            key={`${sw.name}-${swHex}-${i}`}
                            type="button"
                            onClick={() => {
                              const r = hexToRgb(swHex);
                              setNameEdited(true);
                              setColorName(sw.name);
                              commitRgb(r.r, r.g, r.b);
                            }}
                            title={`${sw.name} (${swHex.toUpperCase()})`}
                            className={`w-5 h-5 border ${
                              active
                                ? 'border-black ring-1 ring-white z-10'
                                : 'border-black/40 hover:border-white'
                            }`}
                            style={{ backgroundColor: swHex }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-3">
                  <div
                    className="w-[38px] h-[38px] border border-[#8e8e8e]"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="text-[11px] leading-tight text-[#333] truncate">
                    <div className="font-medium truncate">{colorName}</div>
                    <div className="font-mono text-[10px] text-[#555]">{hex.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Color Model, Name & Numeric Component Grid */}
          <div className="flex-1 flex flex-col">
            {/* Color model */}
            <label className="text-[12px] text-[#111] mb-1">Color model:</label>
            <select
              value={colorModel}
              onChange={(e) => setColorModel(e.target.value as ColorModelOption)}
              className="w-full h-[23px] px-1.5 mb-2.5 bg-[#e1e1e1] border border-[#adadad] text-[12px] text-[#111] outline-none focus:border-[#0078d7]"
            >
              <option value="CMYK">CMYK</option>
              <option value="RGB">RGB</option>
              <option value="HSB">HSB</option>
              <option value="HLS">HLS</option>
              <option value="Lab">Lab</option>
              <option value="Grayscale">Grayscale</option>
            </select>

            {/* Name */}
            <label className="text-[12px] text-[#111] mb-1">Name:</label>
            <div className="flex mb-3">
              <input
                type="text"
                list="corel-named-swatches"
                value={colorName}
                onChange={(e) => {
                  const val = e.target.value;
                  setColorName(val);
                  setNameEdited(true);
                  const found = CORELDRAW_PALETTE.find(
                    (p) => p.hex !== 'transparent' && p.name.toLowerCase() === val.trim().toLowerCase()
                  );
                  if (found) {
                    const pRgb = hexToRgb(found.hex);
                    commitRgb(pRgb.r, pRgb.g, pRgb.b);
                  }
                }}
                className="flex-1 h-[23px] px-1.5 bg-white border border-[#8e8e8e] text-[12px] text-[#111] outline-none focus:border-[#0078d7]"
              />
              <datalist id="corel-named-swatches">
                {CORELDRAW_PALETTE.filter((p) => p.hex !== 'transparent').map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </div>

            {/* 3-Column Numeric Inputs Grid */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[12px]">
              {/* Col 1: R, G, B, Hex */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">R:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.r}
                    onChange={(e) => commitRgb(clamp(Number(e.target.value), 0, 255), rgb.g, rgb.b)}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">G:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.g}
                    onChange={(e) => commitRgb(rgb.r, clamp(Number(e.target.value), 0, 255), rgb.b)}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">B:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.b}
                    onChange={(e) => commitRgb(rgb.r, rgb.g, clamp(Number(e.target.value), 0, 255))}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex justify-end">
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setHexInput(raw);
                      if (/^#?[0-9a-f]{6}$/i.test(raw.trim())) {
                        const norm = normalizeHex(raw);
                        if (norm) {
                          const nextRgb = hexToRgb(norm);
                          commitRgb(nextRgb.r, nextRgb.g, nextRgb.b);
                        }
                      }
                    }}
                    onBlur={() => {
                      const norm = normalizeHex(hexInput);
                      if (norm) {
                        const nextRgb = hexToRgb(norm);
                        commitRgb(nextRgb.r, nextRgb.g, nextRgb.b);
                      } else {
                        setHexInput(hex);
                      }
                    }}
                    className="w-[68px] h-[22px] px-1.5 bg-white border border-[#ababab] font-mono text-[11px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>

              {/* Col 2: C, M, Y, K */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">C:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cmyk.c}
                    onChange={(e) => {
                      const next = cmykToRgb(clamp(Number(e.target.value), 0, 100), cmyk.m, cmyk.y, cmyk.k);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">M:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cmyk.m}
                    onChange={(e) => {
                      const next = cmykToRgb(cmyk.c, clamp(Number(e.target.value), 0, 100), cmyk.y, cmyk.k);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">Y:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cmyk.y}
                    onChange={(e) => {
                      const next = cmykToRgb(cmyk.c, cmyk.m, clamp(Number(e.target.value), 0, 100), cmyk.k);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">K:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cmyk.k}
                    onChange={(e) => {
                      const next = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, clamp(Number(e.target.value), 0, 100));
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>

              {/* Col 3: L, a, b */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">L:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={lab.l}
                    onChange={(e) => {
                      const next = labToRgb(clamp(Number(e.target.value), 0, 100), lab.a, lab.b);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">a:</span>
                  <input
                    type="number"
                    min={-128}
                    max={127}
                    value={lab.a}
                    onChange={(e) => {
                      const next = labToRgb(lab.l, clamp(Number(e.target.value), -128, 127), lab.b);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">b:</span>
                  <input
                    type="number"
                    min={-128}
                    max={127}
                    value={lab.b}
                    onChange={(e) => {
                      const next = labToRgb(lab.l, lab.a, clamp(Number(e.target.value), -128, 127));
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>

              {/* Lower Block Row Group (HSB / HLS / YIQ) */}
              {/* Col 1: H, S, B */}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">H:</span>
                  <input
                    type="number"
                    min={0}
                    max={360}
                    value={hsb.h}
                    onChange={(e) => commitHsb(Number(e.target.value), hsb.s, hsb.b)}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">S:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={hsb.s}
                    onChange={(e) => commitHsb(hsb.h, Number(e.target.value), hsb.b)}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">B:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={hsb.b}
                    onChange={(e) => commitHsb(hsb.h, hsb.s, Number(e.target.value))}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>

              {/* Col 2: H, L, S */}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">H:</span>
                  <input
                    type="number"
                    min={0}
                    max={360}
                    value={hls.h}
                    onChange={(e) => {
                      const next = hlsToRgb(Number(e.target.value), hls.l, hls.s);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">L:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={hls.l}
                    onChange={(e) => {
                      const next = hlsToRgb(hls.h, Number(e.target.value), hls.s);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">S:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={hls.s}
                    onChange={(e) => {
                      const next = hlsToRgb(hls.h, hls.l, Number(e.target.value));
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>

              {/* Col 3: Y, I, Q */}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">Y:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={yiq.y}
                    onChange={(e) => {
                      const next = yiqToRgb(Number(e.target.value), yiq.i, yiq.q);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">I:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={yiq.i}
                    onChange={(e) => {
                      const next = yiqToRgb(yiq.y, Number(e.target.value), yiq.q);
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[#222]">Q:</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={yiq.q}
                    onChange={(e) => {
                      const next = yiqToRgb(yiq.y, yiq.i, Number(e.target.value));
                      commitRgb(next.r, next.g, next.b);
                    }}
                    className="w-[46px] h-[22px] px-1 bg-white border border-[#ababab] text-[12px] outline-none focus:border-[#0078d7]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-3.5 pb-3 pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onConfirm({
                hex,
                name: colorName.trim() || resolveColorName(hex),
                cmyk: formatCmykComponents(hex),
              })
            }
            className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#0078d7] text-[#111] text-[12px]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-[#111] text-[12px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
