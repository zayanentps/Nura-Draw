import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { X, Sparkles, RotateCcw, Trash2, Check } from 'lucide-react';
import { MetallicEffectConfig, MetallicPresetId, ThemeMode } from '../types';
import {
  DEFAULT_METALLIC_CONFIG,
  METALLIC_PRESETS,
  METALLIC_PRESET_ORDER,
  applyMetallicEffectToSelection,
  getMetallicPreviewCss,
  readMetallicConfigFromObject,
  removeMetallicEffectFromSelection,
} from '../utils/metallicEffect';

interface MetallicTextModalProps {
  canvas: fabric.Canvas | null;
  isOpen: boolean;
  initialPreset?: MetallicPresetId | null;
  onClose: () => void;
  theme?: ThemeMode;
  onCommitted?: (label: string) => void;
  onToast?: (msg: string) => void;
}

export const MetallicTextModal: React.FC<MetallicTextModalProps> = ({
  canvas,
  isOpen,
  initialPreset = null,
  onClose,
  theme = 'light',
  onCommitted,
  onToast,
}) => {
  const isDark = theme === 'dark';

  const [config, setConfig] = useState<MetallicEffectConfig>(DEFAULT_METALLIC_CONFIG);
  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [selectionLabel, setSelectionLabel] = useState<string>('No object selected');
  const [selectedCount, setSelectedCount] = useState<number>(0);

  // Draggable modal position
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const livePreviewRef = useRef<boolean>(livePreview);
  livePreviewRef.current = livePreview;

  const syncFromCanvasSelection = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    setSelectedCount(active.length);

    if (active.length === 0) {
      setSelectionLabel('No selection — click any text or object');
      return;
    }

    if (active.length === 1) {
      const t = active[0].type || 'object';
      const isTxt = t === 'i-text' || t === 'text' || t === 'textbox';
      setSelectionLabel(isTxt ? 'Selected Text' : `Selected ${t}`);
    } else {
      setSelectionLabel(`${active.length} objects selected`);
    }

    // Only sync slider values if target already carries metallic settings
    const anyWithMetallic = active.find((o) => Boolean((o as any).metallicEffectConfig));
    if (anyWithMetallic) {
      setConfig(readMetallicConfigFromObject(anyWithMetallic));
    }
  }, [canvas]);

  const wasOpenRef = useRef<boolean>(false);

  // Initial sync when modal opens + optional initialPreset
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (!canvas) return;
    if (!wasOpenRef.current) {
      setDragOffset({ x: 0, y: 0 });
      wasOpenRef.current = true;
    }
    syncFromCanvasSelection();

    const active = canvas.getActiveObjects();
    if (initialPreset) {
      const base = readMetallicConfigFromObject(active[0]);
      const nextCfg = { ...base, preset: initialPreset };
      setConfig(nextCfg);
      if (livePreviewRef.current && active.length > 0) {
        applyMetallicEffectToSelection(canvas, nextCfg);
      }
    }
  }, [isOpen, canvas, initialPreset, syncFromCanvasSelection]);

  // Keep selection info & existing metallic sliders synced while user works on canvas
  useEffect(() => {
    if (!isOpen || !canvas) return;

    const handleSelectionChange = () => {
      syncFromCanvasSelection();
    };

    canvas.on('selection:created', handleSelectionChange);
    canvas.on('selection:updated', handleSelectionChange);
    canvas.on('selection:cleared', handleSelectionChange);
    return () => {
      canvas.off('selection:created', handleSelectionChange);
      canvas.off('selection:updated', handleSelectionChange);
      canvas.off('selection:cleared', handleSelectionChange);
    };
  }, [isOpen, canvas, syncFromCanvasSelection]);

  // Apply live preview only on explicit user interaction inside this panel
  const updateConfigAndPreview = useCallback(
    (updater: (prev: MetallicEffectConfig) => MetallicEffectConfig) => {
      setConfig((prev) => {
        const next = updater(prev);
        if (canvas && livePreviewRef.current && canvas.getActiveObjects().length > 0) {
          applyMetallicEffectToSelection(canvas, next);
        }
        return next;
      });
    },
    [canvas]
  );

  // Window drag listeners
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      setDragOffset({
        x: dragStartRef.current.ox + (e.clientX - dragStartRef.current.mx),
        y: dragStartRef.current.oy + (e.clientY - dragStartRef.current.my),
      });
    };
    const onUp = () => {
      dragStartRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const previewCss = useMemo(() => getMetallicPreviewCss(config), [config]);

  if (!isOpen) return null;

  const activePreset = METALLIC_PRESETS[config.preset];

  const handleApply = () => {
    if (!canvas) return;
    const count = canvas.getActiveObjects().length;
    if (count === 0) {
      onToast?.('Select any Text or Object first to apply Metallic Effect');
      return;
    }
    applyMetallicEffectToSelection(canvas, config);
    onCommitted?.(`Metallic ${activePreset.label}`);
    onToast?.(`Applied ${activePreset.label} metallic effect to ${count} object(s)`);
  };

  const handleRemove = () => {
    if (!canvas) return;
    const count = removeMetallicEffectFromSelection(canvas);
    if (count === 0) {
      onToast?.('Select an object to remove Metallic Effect');
      return;
    }
    onCommitted?.('Remove Metallic Effect');
    onToast?.('Removed metallic effect');
  };

  const handleReset = () => {
    updateConfigAndPreview((prev) => ({
      ...DEFAULT_METALLIC_CONFIG,
      preset: prev.preset,
    }));
  };

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none flex items-start justify-end p-5 pt-28">
      <div
        className={`pointer-events-auto w-[410px] max-w-[95vw] rounded shadow-2xl border select-none text-[12px] ${
          isDark
            ? 'bg-[#2b2d31] border-[#4b4f58] text-zinc-100'
            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
        }`}
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={(e) => {
            dragStartRef.current = {
              mx: e.clientX,
              my: e.clientY,
              ox: dragOffset.x,
              oy: dragOffset.y,
            };
          }}
          className={`flex items-center justify-between px-3 py-2 border-b cursor-move ${
            isDark
              ? 'bg-[#1f2125] border-[#3f4249] text-zinc-100'
              : 'bg-[#e3e5e9] border-[#c4c8cf] text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Metallic Properties</span>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            title="Close Window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-3.5 max-h-[76vh] overflow-y-auto">
          {/* Selection Status + Live Preview Toggle */}
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={`font-medium ${
                selectedCount === 0 ? 'text-amber-600 dark:text-amber-400' : 'opacity-80'
              }`}
            >
              {selectionLabel}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => {
                  const nextLive = e.target.checked;
                  setLivePreview(nextLive);
                  if (nextLive && canvas && canvas.getActiveObjects().length > 0) {
                    applyMetallicEffectToSelection(canvas, config);
                  }
                }}
                className="accent-[#0078d7]"
              />
              <span>Live Preview</span>
            </label>
          </div>

          {/* Interactive Preview Banner */}
          <div
            className={`rounded border p-3 flex items-center justify-between gap-3 ${
              isDark ? 'bg-[#18191c] border-[#3d4048]' : 'bg-[#1e293b] border-[#cbd5e1]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div
                className="text-[24px] font-black tracking-wide leading-none truncate"
                style={{
                  backgroundImage: previewCss,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter:
                    config.shadowDepth > 0
                      ? `drop-shadow(1px 2px ${Math.round(2 + (config.shadowDepth / 100) * 6)}px rgba(0,0,0,0.75))`
                      : undefined,
                }}
              >
                {activePreset.label.toUpperCase()}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {activePreset.subtitle}
              </div>
            </div>
            <div
              className="w-11 h-11 rounded-full shrink-0 border border-white/40 shadow-inner"
              style={{
                background: previewCss,
              }}
              title="Surface sheen sample"
            />
          </div>

          {/* 5 Metal Presets Grid */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Metal Finish Preset
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {METALLIC_PRESET_ORDER.map((id, index) => {
                const p = METALLIC_PRESETS[id];
                const swatchCss = getMetallicPreviewCss({ ...config, preset: id });
                const isSelected = config.preset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      updateConfigAndPreview((prev) => ({ ...prev, preset: id }))
                    }
                    className={`flex flex-col items-center gap-1 p-1.5 rounded border text-[11px] transition-all ${
                      isSelected
                        ? 'border-[#0078d7] ring-1 ring-[#0078d7] bg-[#0078d7]/10 font-semibold'
                        : isDark
                        ? 'border-[#454952] hover:bg-white/5'
                        : 'border-[#c6cad1] hover:bg-black/5'
                    }`}
                  >
                    <span
                      className="w-full h-5 rounded-xs border border-black/25 shadow-inner"
                      style={{ background: swatchCss }}
                    />
                    <span className="truncate w-full text-center">
                      {index + 1}. {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2.5 pt-1">
            {/* Effect Intensity */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2">
              <span className="text-[11px] font-medium">Effect Intensity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={config.intensity}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    intensity: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.intensity}%
              </span>
            </div>

            {/* Glossiness */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2">
              <span className="text-[11px] font-medium">Glossiness</span>
              <input
                type="range"
                min={0}
                max={100}
                value={config.glossiness}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    glossiness: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.glossiness}%
              </span>
            </div>

            {/* Gradient Size */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2">
              <span className="text-[11px] font-medium">Gradient Size</span>
              <input
                type="range"
                min={25}
                max={250}
                value={config.gradientSize}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    gradientSize: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.gradientSize}%
              </span>
            </div>

            {/* Reflection Angle */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2">
              <span className="text-[11px] font-medium">Light Angle</span>
              <input
                type="range"
                min={0}
                max={360}
                value={config.angle}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    angle: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.angle}°
              </span>
            </div>

            {/* Reflection Bands & Gradient Mode */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium">Sheen Bands</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() =>
                        updateConfigAndPreview((prev) => ({ ...prev, reflectionBands: b }))
                      }
                      className={`w-6 h-5 rounded-xs text-[11px] border ${
                        config.reflectionBands === b
                          ? 'bg-[#0078d7] text-white border-[#0078d7]'
                          : isDark
                          ? 'border-[#4b4f58] hover:bg-white/10'
                          : 'border-[#c4c8cf] hover:bg-black/5'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium">Style</span>
                <div className="flex items-center gap-1">
                  {(['linear', 'radial'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        updateConfigAndPreview((prev) => ({ ...prev, gradientType: mode }))
                      }
                      className={`px-2 h-5 rounded-xs text-[11px] capitalize border ${
                        config.gradientType === mode
                          ? 'bg-[#0078d7] text-white border-[#0078d7]'
                          : isDark
                          ? 'border-[#4b4f58] hover:bg-white/10'
                          : 'border-[#c4c8cf] hover:bg-black/5'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bevel Rim Stroke & Width */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2 pt-0.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bevelStroke}
                  onChange={(e) =>
                    updateConfigAndPreview((prev) => ({
                      ...prev,
                      bevelStroke: e.target.checked,
                    }))
                  }
                  className="accent-[#0078d7]"
                />
                <span>Rim Bevel</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={6}
                step={0.25}
                disabled={!config.bevelStroke}
                value={config.bevelWidth}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    bevelWidth: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer disabled:opacity-40"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.bevelWidth}px
              </span>
            </div>

            {/* Shadow / 3D Depth */}
            <div className="grid grid-cols-[118px_1fr_46px] items-center gap-2">
              <span className="text-[11px] font-medium">3D Depth Shadow</span>
              <input
                type="range"
                min={0}
                max={100}
                value={config.shadowDepth}
                onChange={(e) =>
                  updateConfigAndPreview((prev) => ({
                    ...prev,
                    shadowDepth: Number(e.target.value),
                  }))
                }
                className="accent-[#0078d7] cursor-pointer"
              />
              <span className="text-right tabular-nums text-[11px] opacity-85">
                {config.shadowDepth}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions — keeps window open until user explicitly clicks Close / X */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 border-t ${
            isDark ? 'bg-[#222428] border-[#3f4249]' : 'bg-[#e9ebee] border-[#c4c8cf]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRemove}
              className={`px-2 py-1 rounded-xs border text-[11px] flex items-center gap-1 ${
                isDark
                  ? 'border-[#525660] hover:bg-red-500/20 text-red-300'
                  : 'border-[#c4c8cf] hover:bg-red-50 text-red-700'
              }`}
              title="Remove metallic effect from selected object(s)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={`px-2 py-1 rounded-xs border text-[11px] flex items-center gap-1 ${
                isDark
                  ? 'border-[#525660] hover:bg-white/10'
                  : 'border-[#c4c8cf] hover:bg-black/5'
              }`}
              title="Reset sliders"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 rounded-xs bg-[#0078d7] hover:bg-[#006abc] text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              title="Save / Apply metallic state to history (keeps window open)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-2.5 py-1 rounded-xs border text-[11px] ${
                isDark
                  ? 'border-[#525660] hover:bg-white/10'
                  : 'border-[#c4c8cf] hover:bg-black/5'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
