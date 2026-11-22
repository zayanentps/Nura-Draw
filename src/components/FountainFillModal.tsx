import React, { useState, useEffect, useMemo } from 'react';
import * as fabric from 'fabric';
import { X, Sparkles, ArrowLeftRight, Check } from 'lucide-react';
import { ThemeMode } from '../types';
import { isTextOnPathObject, reflowTextOnPathGroup } from '../utils/fitTextToPath';

export type FountainFillType = 'linear' | 'radial' | 'reflected';

interface FountainFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  currentFill: string;
  theme?: ThemeMode;
  onApplied?: (label?: string) => void;
  onToast?: (msg: string) => void;
}

const FOUNTAIN_PRESETS: Array<{
  name: string;
  type: FountainFillType;
  start: string;
  mid: string;
  end: string;
  useMid: boolean;
  angle: number;
}> = [
  { name: 'Nura Green', type: 'linear', start: '#00a651', mid: '#8dc63f', end: '#fff200', useMid: false, angle: 0 },
  { name: 'Sunset Gold', type: 'linear', start: '#ed1c24', mid: '#f7941d', end: '#fff200', useMid: true, angle: 45 },
  { name: 'Ocean Deep', type: 'linear', start: '#00aeef', mid: '#0072bc', end: '#1b1464', useMid: false, angle: 90 },
  { name: 'Radial Glow', type: 'radial', start: '#fff799', mid: '#f7941d', end: '#ed1c24', useMid: false, angle: 0 },
  { name: 'Chrome Steel', type: 'reflected', start: '#23272f', mid: '#e5e7eb', end: '#525866', useMid: true, angle: 90 },
  { name: 'Royal Magenta', type: 'linear', start: '#92278f', mid: '#ec008c', end: '#ff85c0', useMid: true, angle: 135 },
];

export const FountainFillModal: React.FC<FountainFillModalProps> = ({
  isOpen,
  onClose,
  canvas,
  selectedObject,
  currentFill,
  theme = 'light',
  onApplied,
  onToast,
}) => {
  const isDark = theme === 'dark';

  const [fillType, setFillType] = useState<FountainFillType>('linear');
  const [startColor, setStartColor] = useState<string>('#00a651');
  const [midColor, setMidColor] = useState<string>('#00aeef');
  const [endColor, setEndColor] = useState<string>('#fff200');
  const [useMidStop, setUseMidStop] = useState<boolean>(false);
  const [angle, setAngle] = useState<number>(0);
  const [midpoint, setMidpoint] = useState<number>(50);
  const [startOpacity, setStartOpacity] = useState<number>(100);
  const [endOpacity, setEndOpacity] = useState<number>(100);

  // Initialize from selected object's current fill when opening
  useEffect(() => {
    if (!isOpen) return;
    const fillVal: any = selectedObject?.fill;
    if (fillVal && typeof fillVal === 'object' && Array.isArray(fillVal.colorStops)) {
      const stops = fillVal.colorStops;
      setFillType(fillVal.type === 'radial' ? 'radial' : 'linear');
      if (stops.length >= 2) {
        setStartColor(stops[0].color || '#00a651');
        setEndColor(stops[stops.length - 1].color || '#fff200');
        if (stops.length >= 3) {
          setUseMidStop(true);
          setMidColor(stops[1].color || '#00aeef');
          setMidpoint(Math.round((stops[1].offset ?? 0.5) * 100));
        } else {
          setUseMidStop(false);
        }
      }
    } else if (typeof fillVal === 'string' && fillVal.startsWith('#')) {
      setStartColor(fillVal);
    } else if (currentFill && currentFill.startsWith('#')) {
      setStartColor(currentFill);
    }
  }, [isOpen, selectedObject, currentFill]);

  const previewCss = useMemo(() => {
    const midPct = Math.max(10, Math.min(90, midpoint));
    if (fillType === 'radial') {
      return useMidStop
        ? `radial-gradient(circle, ${startColor} 0%, ${midColor} ${midPct}%, ${endColor} 100%)`
        : `radial-gradient(circle, ${startColor} 0%, ${endColor} 100%)`;
    }
    if (fillType === 'reflected') {
      return `linear-gradient(${angle}deg, ${startColor} 0%, ${useMidStop ? midColor : endColor} ${midPct}%, ${startColor} 100%)`;
    }
    return useMidStop
      ? `linear-gradient(${angle}deg, ${startColor} 0%, ${midColor} ${midPct}%, ${endColor} 100%)`
      : `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
  }, [fillType, startColor, midColor, endColor, useMidStop, angle, midpoint]);

  if (!isOpen) return null;

  const buildFabricGradient = (target: fabric.FabricObject): fabric.Gradient<'linear' | 'radial'> => {
    const w = Math.max(1, target.width || 100);
    const h = Math.max(1, target.height || 100);
    const midOffset = Math.max(0.05, Math.min(0.95, midpoint / 100));

    const hexWithOpacity = (hex: string, opPct: number) => {
      if (opPct >= 100) return hex;
      const clean = hex.replace('#', '');
      if (clean.length !== 6) return hex;
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${(opPct / 100).toFixed(2)})`;
    };

    const sCol = hexWithOpacity(startColor, startOpacity);
    const eCol = hexWithOpacity(endColor, endOpacity);

    const stops =
      fillType === 'reflected'
        ? [
            { offset: 0, color: sCol },
            { offset: midOffset, color: useMidStop ? midColor : eCol },
            { offset: 1, color: sCol },
          ]
        : useMidStop
        ? [
            { offset: 0, color: sCol },
            { offset: midOffset, color: midColor },
            { offset: 1, color: eCol },
          ]
        : [
            { offset: 0, color: sCol },
            { offset: 1, color: eCol },
          ];

    if (fillType === 'radial') {
      const cx = w / 2;
      const cy = h / 2;
      const r2 = Math.max(w, h) * 0.55;
      return new fabric.Gradient({
        type: 'radial',
        gradientUnits: 'pixels',
        coords: {
          x1: cx,
          y1: cy,
          r1: 0,
          x2: cx,
          y2: cy,
          r2,
        },
        colorStops: stops,
      });
    }

    const rad = ((angle % 360) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const cx = w / 2;
    const cy = h / 2;
    const halfLen = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;

    return new fabric.Gradient({
      type: 'linear',
      gradientUnits: 'pixels',
      coords: {
        x1: cx - dx * halfLen,
        y1: cy - dy * halfLen,
        x2: cx + dx * halfLen,
        y2: cy + dy * halfLen,
      },
      colorStops: stops,
    });
  };

  const handleApply = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) {
      onToast?.('Select an object on canvas first to apply Fountain Fill (F11)');
      return;
    }

    if (active.type === 'activeselection') {
      (active as fabric.ActiveSelection).forEachObject((obj) => {
        if (isTextOnPathObject(obj)) {
          reflowTextOnPathGroup(canvas, obj as fabric.Group, { fill: startColor });
        } else {
          obj.set('fill', buildFabricGradient(obj));
        }
      });
    } else if (isTextOnPathObject(active)) {
      // Text on path consists of per-character IText children; apply gradient to each glyph
      const grp = active as fabric.Group;
      grp.getObjects().forEach((child: any) => {
        if (child && !child.isGuidePath) {
          child.set('fill', buildFabricGradient(child));
        }
      });
    } else if (active.type === 'group') {
      const grp = active as fabric.Group;
      grp.getObjects().forEach((child) => {
        child.set('fill', buildFabricGradient(child));
      });
    } else {
      active.set('fill', buildFabricGradient(active));
    }

    canvas.requestRenderAll();
    onApplied?.('Fountain Fill');
    onToast?.('Applied Fountain Fill (F11)');
    onClose();
  };

  const panelBg = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f4f5f7] border-zinc-400 text-zinc-900';
  const cardBg = isDark
    ? 'bg-[#43464c] border-[#62666f]'
    : 'bg-white border-zinc-300';
  const inputCls = isDark
    ? 'bg-[#3c3f45] border-[#686c75] text-zinc-100'
    : 'bg-white border-zinc-300 text-zinc-900';

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
      <div className={`w-[460px] max-w-[95vw] rounded-lg border shadow-2xl overflow-hidden ${panelBg}`}>
        {/* Header */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-b ${
            isDark ? 'bg-[#45484e] border-[#666a72]' : 'bg-[#e6e8ec] border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold tracking-wide">Fountain Fill (F11)</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition cursor-pointer ${
              isDark ? 'hover:bg-[#5c6068] text-zinc-300' : 'hover:bg-zinc-300 text-zinc-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Type & Live Preview Row */}
          <div className="flex gap-3 items-stretch">
            <div className={`w-28 h-24 rounded border shadow-inner shrink-0 ${cardBg}`} style={{ background: previewCss }} />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-1">
                  Fountain Type
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'linear', label: 'Linear' },
                      { id: 'radial', label: 'Elliptical' },
                      { id: 'reflected', label: 'Reflected' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFillType(t.id)}
                      className={`py-1.5 px-2 rounded border text-[11px] font-medium transition cursor-pointer ${
                        fillType === t.id
                          ? 'bg-[#0078d7] text-white border-[#0078d7]'
                          : isDark
                          ? 'bg-[#43464c] border-[#62666f] text-zinc-200 hover:bg-[#565a62]'
                          : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-1">
                  Presets
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FOUNTAIN_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      title={p.name}
                      onClick={() => {
                        setFillType(p.type);
                        setStartColor(p.start);
                        setMidColor(p.mid);
                        setEndColor(p.end);
                        setUseMidStop(p.useMid);
                        setAngle(p.angle);
                      }}
                      className="w-6 h-5 rounded border border-zinc-500/70 shadow-xs hover:scale-110 transition cursor-pointer"
                      style={{
                        background:
                          p.type === 'radial'
                            ? `radial-gradient(circle, ${p.start}, ${p.end})`
                            : `linear-gradient(${p.angle}deg, ${p.start}, ${p.end})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Color Stops */}
          <div className={`p-3 rounded border space-y-2.5 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px]">Color Blend Stops</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMidStop}
                    onChange={(e) => setUseMidStop(e.target.checked)}
                    className="accent-sky-500"
                  />
                  <span>3-Color Custom</span>
                </label>
                <button
                  onClick={() => {
                    const tmp = startColor;
                    setStartColor(endColor);
                    setEndColor(tmp);
                  }}
                  title="Swap From / To Colors"
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${inputCls}`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Swap</span>
                </button>
              </div>
            </div>

            <div className={`grid ${useMidStop ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
              <div>
                <label className="block text-[10px] opacity-75 mb-1">From Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={startColor}
                    onChange={(e) => setStartColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={startColor}
                    onChange={(e) => setStartColor(e.target.value)}
                    className={`w-full px-1.5 py-1 rounded border text-[11px] font-mono ${inputCls}`}
                  />
                </div>
              </div>

              {useMidStop && (
                <div>
                  <label className="block text-[10px] opacity-75 mb-1">Middle Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={midColor}
                      onChange={(e) => setMidColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={midColor}
                      onChange={(e) => setMidColor(e.target.value)}
                      className={`w-full px-1.5 py-1 rounded border text-[11px] font-mono ${inputCls}`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] opacity-75 mb-1">To Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={endColor}
                    onChange={(e) => setEndColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={endColor}
                    onChange={(e) => setEndColor(e.target.value)}
                    className={`w-full px-1.5 py-1 rounded border text-[11px] font-mono ${inputCls}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Angle, Midpoint & Transparency */}
          <div className={`p-3 rounded border space-y-2.5 ${cardBg}`}>
            {fillType !== 'radial' && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span>Angle</span>
                  <div className="flex items-center gap-1">
                    {[0, 45, 90, 135, 180].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAngle(a)}
                        className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                          angle === a ? 'bg-[#0078d7] text-white border-[#0078d7]' : inputCls
                        }`}
                      >
                        {a}°
                      </button>
                    ))}
                    <span className="font-mono ml-1 w-9 text-right">{angle}°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span>Mid-point Offset</span>
                <span className="font-mono">{midpoint}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={midpoint}
                onChange={(e) => setMidpoint(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-[10px] opacity-80 mb-0.5">
                  <span>Start Opacity</span>
                  <span className="font-mono">{startOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={startOpacity}
                  onChange={(e) => setStartOpacity(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] opacity-80 mb-0.5">
                  <span>End Opacity</span>
                  <span className="font-mono">{endOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={endOpacity}
                  onChange={(e) => setEndOpacity(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>
          </div>

          {!selectedObject && (
            <div className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-700/50 rounded px-2.5 py-1.5">
              Select an object on canvas before clicking OK to apply this Fountain Fill.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 flex items-center justify-end gap-2 border-t ${
            isDark ? 'bg-[#45484e] border-[#666a72]' : 'bg-[#e6e8ec] border-zinc-300'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-3 py-1.5 rounded border text-xs font-medium cursor-pointer ${
              isDark
                ? 'bg-[#565a62] hover:bg-[#62666f] border-[#6c7079] text-zinc-100'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded bg-[#0078d7] hover:bg-[#0063b1] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>OK (Apply)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
