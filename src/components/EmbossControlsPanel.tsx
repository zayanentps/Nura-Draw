import React, { useEffect, useId, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { ChevronDown, ChevronUp, Pipette, RotateCcw } from 'lucide-react';
import {
  DEFAULT_EMBOSS_PARAMS,
  EmbossColorMode,
  EmbossParams,
  applyEmbossParamsToTarget,
  extractTargetEmbossForUi,
  removeEmbossFromTarget,
  sanitizeEmbossParams,
} from '../utils/embossHelpers';
import { rgbToHex } from '../utils/colorConversion';
import { ThemeMode } from '../types';

interface EmbossControlsPanelProps {
  params: EmbossParams;
  onChange: (next: EmbossParams) => void;
  onReset?: () => void;
  theme?: ThemeMode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  disabled?: boolean;
  eyedropperActive?: boolean;
  onTriggerEyedropper?: () => void;
  onRemoveEmboss?: () => void;
  hasActiveEmboss?: boolean;
}

export const EmbossControlsPanel: React.FC<EmbossControlsPanelProps> = ({
  params,
  onChange,
  onReset,
  theme = 'light',
  collapsible = true,
  defaultExpanded = true,
  disabled = false,
  eyedropperActive = false,
  onTriggerEyedropper,
  onRemoveEmboss,
  hasActiveEmboss = false,
}) => {
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const radioGroupName = useId();

  const safe = sanitizeEmbossParams(params);

  const update = (patch: Partial<EmbossParams>) => {
    onChange(sanitizeEmbossParams({ ...safe, ...patch }));
  };

  const handleDialPointer = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = cy - clientY; // up is positive Y for counter-clockwise standard angles (45 deg = top-right)
    let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    if (deg < 0) deg += 360;
    update({ direction: deg });
  };

  const startDialDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    handleDialPointer(e.clientX, e.clientY);

    const onMove = (ev: PointerEvent) => {
      handleDialPointer(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleEyedropperClick = async () => {
    if (disabled) return;
    if (onTriggerEyedropper) {
      onTriggerEyedropper();
      return;
    }
    const EyeDropperCtor = (window as any).EyeDropper;
    if (typeof EyeDropperCtor === 'function') {
      try {
        const res = await new EyeDropperCtor().open();
        if (res?.sRGBHex) {
          update({ colorMode: 'other', otherColor: res.sRGBHex });
        }
      } catch {
        // User canceled EyeDropper
      }
    }
  };

  const dialRad = (safe.direction * Math.PI) / 180;
  const dotRadiusPx = 10.5;
  const dotX = 18 + Math.cos(dialRad) * dotRadiusPx;
  const dotY = 18 - Math.sin(dialRad) * dotRadiusPx;

  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-[#111]';

  const mutedTextCls = isDark ? 'text-zinc-300' : 'text-zinc-700';

  return (
    <div className={`text-[12px] select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Header row matching ▲ Emboss   ↺  ☑ */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => collapsible && setExpanded((prev) => !prev)}
          className={`flex items-center gap-1.5 font-semibold ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          } ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {collapsible &&
            (expanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            ))}
          <span>Emboss</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Reset Emboss parameters"
            onClick={() => {
              if (onReset) onReset();
              else onChange({ ...DEFAULT_EMBOSS_PARAMS });
            }}
            className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${mutedTextCls}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <input
            type="checkbox"
            title="Enable / Preview Emboss"
            checked={safe.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-3.5 h-3.5 accent-[#0078d7] cursor-pointer"
          />
        </div>
      </div>

      {(!collapsible || expanded) && (
        <div className="space-y-3 pl-0.5">
          {/* Depth */}
          <div>
            <div className={`text-[11px] mb-1 ${mutedTextCls}`}>Depth</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={safe.depth}
                onChange={(e) => update({ depth: Number(e.target.value) })}
                className="flex-1 accent-[#0078d7] cursor-pointer"
              />
              <input
                type="number"
                min={1}
                max={20}
                step={1}
                value={safe.depth}
                onChange={(e) => update({ depth: Number(e.target.value) || 1 })}
                className={`w-[58px] h-[24px] px-1.5 border text-[11px] font-mono text-right ${inputCls}`}
              />
            </div>
          </div>

          {/* Level */}
          <div>
            <div className={`text-[11px] mb-1 ${mutedTextCls}`}>Level</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={500}
                step={1}
                value={safe.level}
                onChange={(e) => update({ level: Number(e.target.value) })}
                className="flex-1 accent-[#0078d7] cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={safe.level}
                onChange={(e) => update({ level: Number(e.target.value) || 0 })}
                className={`w-[58px] h-[24px] px-1.5 border text-[11px] font-mono text-right ${inputCls}`}
              />
            </div>
          </div>

          {/* Direction */}
          <div>
            <div className={`text-[11px] mb-1.5 ${mutedTextCls}`}>Direction</div>
            <div className="flex items-center gap-2.5">
              <div
                ref={dialRef}
                onPointerDown={startDialDrag}
                title={`Light Direction: ${safe.direction}° (drag to rotate)`}
                className={`relative w-9 h-9 rounded-full border cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-[#3b3e44] border-[#787d87]'
                    : 'bg-[#e9eaec] border-[#8b8e94]'
                }`}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" className="block pointer-events-none">
                  <line
                    x1="18"
                    y1="18"
                    x2={dotX}
                    y2={dotY}
                    stroke={isDark ? '#a1a1aa' : '#71717a'}
                    strokeWidth="1"
                    strokeDasharray="2 1"
                  />
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="3.2"
                    fill={isDark ? '#f4f4f5' : '#4b5563'}
                    stroke={isDark ? '#18181b' : '#ffffff'}
                    strokeWidth="0.7"
                  />
                </svg>
              </div>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={360}
                  step={1}
                  value={safe.direction}
                  onChange={(e) => update({ direction: Number(e.target.value) || 0 })}
                  className={`w-[58px] h-[24px] px-1.5 border text-[11px] font-mono text-right ${inputCls}`}
                />
                <span className={`ml-1 text-[11px] ${mutedTextCls}`}>°</span>
              </div>
            </div>
          </div>

          {/* Emboss color */}
          <div>
            <div className={`text-[11px] mb-1.5 ${mutedTextCls}`}>Emboss color</div>
            <div className="space-y-1.5">
              {(
                [
                  { id: 'original', label: 'Original color' },
                  { id: 'gray', label: 'Gray' },
                  { id: 'black', label: 'Black' },
                ] as { id: EmbossColorMode; label: string }[]
              ).map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 cursor-pointer text-[11px]"
                >
                  <input
                    type="radio"
                    name={`emboss-color-${radioGroupName}`}
                    checked={safe.colorMode === opt.id}
                    onChange={() => update({ colorMode: opt.id })}
                    className="accent-[#0078d7] cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}

              {/* Other + Swatch + Eyedropper */}
              <div className="flex items-center gap-2 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name={`emboss-color-${radioGroupName}`}
                    checked={safe.colorMode === 'other'}
                    onChange={() => update({ colorMode: 'other' })}
                    className="accent-[#0078d7] cursor-pointer"
                  />
                  <span>Other</span>
                </label>

                <label
                  title="Pick custom emboss color"
                  className={`flex items-center h-[22px] border px-1 gap-1 cursor-pointer ${inputCls}`}
                >
                  <span
                    className="w-7 h-3.5 border border-black/30 inline-block"
                    style={{ backgroundColor: safe.otherColor }}
                  />
                  <input
                    type="color"
                    value={safe.otherColor}
                    onChange={(e) =>
                      update({ colorMode: 'other', otherColor: e.target.value })
                    }
                    className="sr-only"
                  />
                  <span className="text-[9px] opacity-70">▼</span>
                </label>

                <button
                  type="button"
                  onClick={() => void handleEyedropperClick()}
                  title={
                    eyedropperActive
                      ? 'Click preview or canvas to sample color'
                      : 'Sample color with Eyedropper'
                  }
                  className={`w-6 h-6 flex items-center justify-center rounded border cursor-pointer transition-colors ${
                    eyedropperActive
                      ? 'bg-[#0078d7] text-white border-[#0078d7]'
                      : isDark
                      ? 'bg-[#4d5056] hover:bg-[#5c6068] border-[#6a6e77] text-zinc-200'
                      : 'bg-white hover:bg-[#e5f1fb] border-[#adadad] text-zinc-700'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {onRemoveEmboss && hasActiveEmboss && (
            <button
              type="button"
              onClick={onRemoveEmboss}
              className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
                isDark
                  ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              Remove Emboss
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface LiveEmbossSectionProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  theme?: ThemeMode;
  defaultExpanded?: boolean;
  onRefresh?: () => void;
}

export const LiveEmbossSection: React.FC<LiveEmbossSectionProps> = ({
  canvas,
  selectedObject,
  theme = 'light',
  defaultExpanded,
  onRefresh,
}) => {
  const initial = extractTargetEmbossForUi(selectedObject);
  const [params, setParams] = useState<EmbossParams>(() =>
    initial.hasEmboss ? initial.params : { ...DEFAULT_EMBOSS_PARAMS, enabled: false }
  );
  const [hasEmboss, setHasEmboss] = useState<boolean>(initial.hasEmboss);
  const [eyedropperActive, setEyedropperActive] = useState(false);

  useEffect(() => {
    const next = extractTargetEmbossForUi(selectedObject);
    setParams(next.hasEmboss ? next.params : { ...DEFAULT_EMBOSS_PARAMS, enabled: false });
    setHasEmboss(next.hasEmboss);
    setEyedropperActive(false);
  }, [selectedObject]);

  useEffect(() => {
    if (!eyedropperActive || !canvas) return;
    const upperEl = canvas.upperCanvasEl;
    const lowerEl = canvas.lowerCanvasEl;
    if (!upperEl || !lowerEl) return;
    const prevCursor = upperEl.style.cursor;
    upperEl.style.cursor = 'crosshair';

    const onCanvasPick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const rect = lowerEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const px = Math.max(
          0,
          Math.min(lowerEl.width - 1, Math.floor(((ev.clientX - rect.left) / rect.width) * lowerEl.width))
        );
        const py = Math.max(
          0,
          Math.min(lowerEl.height - 1, Math.floor(((ev.clientY - rect.top) / rect.height) * lowerEl.height))
        );
        const ctx = lowerEl.getContext('2d');
        if (ctx) {
          const d = ctx.getImageData(px, py, 1, 1).data;
          const sampledHex = rgbToHex(d[0], d[1], d[2]);
          const nextParams: EmbossParams = {
            ...params,
            enabled: true,
            colorMode: 'other',
            otherColor: sampledHex,
          };
          setParams(nextParams);
          setHasEmboss(true);
          const target = canvas.getActiveObject() || selectedObject;
          if (target) {
            void applyEmbossParamsToTarget(canvas, target, nextParams).then(() => onRefresh?.());
          }
        }
      }
      setEyedropperActive(false);
    };

    upperEl.addEventListener('mousedown', onCanvasPick, true);
    return () => {
      upperEl.style.cursor = prevCursor;
      upperEl.removeEventListener('mousedown', onCanvasPick, true);
    };
  }, [eyedropperActive, canvas, selectedObject, params, onRefresh]);

  const commitParams = async (next: EmbossParams) => {
    setParams(next);
    setHasEmboss(true);
    if (!canvas || !selectedObject) return;
    const activeTarget = canvas.getActiveObject() || selectedObject;
    await applyEmbossParamsToTarget(canvas, activeTarget, next);
    onRefresh?.();
  };

  return (
    <EmbossControlsPanel
      params={params}
      disabled={!selectedObject}
      hasActiveEmboss={hasEmboss}
      onChange={(next) => {
        const toggledCheckboxOnly = next.enabled !== params.enabled;
        const resolved = toggledCheckboxOnly ? next : { ...next, enabled: true };
        void commitParams(resolved);
      }}
      onReset={() => void commitParams({ ...DEFAULT_EMBOSS_PARAMS })}
      onRemoveEmboss={async () => {
        if (!canvas || !selectedObject) return;
        const activeTarget = canvas.getActiveObject() || selectedObject;
        await removeEmbossFromTarget(canvas, activeTarget);
        setParams({ ...DEFAULT_EMBOSS_PARAMS });
        setHasEmboss(false);
        onRefresh?.();
      }}
      eyedropperActive={eyedropperActive}
      onTriggerEyedropper={async () => {
        if (eyedropperActive) {
          setEyedropperActive(false);
          return;
        }
        const EyeDropperCtor = (window as any).EyeDropper;
        if (typeof EyeDropperCtor === 'function') {
          try {
            const res = await new EyeDropperCtor().open();
            if (res?.sRGBHex) {
              void commitParams({
                ...params,
                colorMode: 'other',
                otherColor: res.sRGBHex,
              });
              return;
            }
          } catch {
            // Fall through to canvas pixel sampling
          }
        }
        setEyedropperActive(true);
      }}
      theme={theme}
      collapsible={true}
      defaultExpanded={defaultExpanded ?? initial.hasEmboss}
    />
  );
};

