import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { X, Minus, Plus, RefreshCw } from 'lucide-react';
import { PageConfig, ThemeMode } from '../types';
import { generateRandomFillerGroup } from '../utils/randomFiller';

interface RandomFillerModalProps {
  canvas: fabric.Canvas | null;
  pageConfig: PageConfig;
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
  onFillCommitted?: (label: string, count: number) => void;
  onToast?: (msg: string) => void;
}

function pxToUnitLabel(px: number, units: PageConfig['units']): { value: string; suffix: string } {
  const dpi = 96;
  switch (units) {
    case 'in':
      return { value: (px / dpi).toFixed(2), suffix: 'in' };
    case 'mm':
      return { value: ((px * 25.4) / dpi).toFixed(1), suffix: 'mm' };
    case 'cm':
      return { value: ((px * 2.54) / dpi).toFixed(2), suffix: 'cm' };
    case 'pt':
      return { value: ((px * 72) / dpi).toFixed(1), suffix: 'pt' };
    case 'ft':
      return { value: (px / (dpi * 12)).toFixed(2), suffix: 'ft' };
    case 'm':
      return { value: ((px * 0.0254) / dpi).toFixed(3), suffix: 'm' };
    default:
      return { value: Math.round(px).toString(), suffix: 'px' };
  }
}

export const RandomFillerModal: React.FC<RandomFillerModalProps> = ({
  canvas,
  pageConfig,
  isOpen,
  onClose,
  theme = 'light',
  onFillCommitted,
  onToast,
}) => {
  const isDark = theme === 'dark';

  const [sources, setSources] = useState<fabric.FabricObject[]>([]);
  const [target, setTarget] = useState<fabric.FabricObject | null>(null);

  const [treatAsOneGroup, setTreatAsOneGroup] = useState<boolean>(false);
  const [minSize, setMinSize] = useState<number>(20);
  const [maxSize, setMaxSize] = useState<number>(76);
  const [minRotation, setMinRotation] = useState<number>(-30);
  const [maxRotation, setMaxRotation] = useState<number>(30);
  const [spacing, setSpacing] = useState<number>(26);
  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000_000));
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Draggable window position
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  const previewGroupRef = useRef<fabric.Group | null>(null);
  const hasUnpushedPreviewRef = useRef<boolean>(false);
  const generationSeqRef = useRef<number>(0);

  // Auto-detect source(s) & target when modal opens
  useEffect(() => {
    if (!isOpen || !canvas) return;
    setDragOffset({ x: 0, y: 0 });
    previewGroupRef.current = null;
    hasUnpushedPreviewRef.current = false;
    setLastCount(null);
    setStatusNote(null);
    setSeed(Math.floor(Math.random() * 1_000_000_000));

    const active = canvas
      .getActiveObjects()
      .filter((o) => (o as any).customType !== 'random_filler');

    if (active.length >= 2) {
      // Heuristic: if one object has a noticeably larger bounding area (>= 1.8x), it's the target container;
      // otherwise use the last object in the selection as the target.
      const withArea = active.map((obj) => {
        const r = obj.getBoundingRect();
        return { obj, area: r.width * r.height };
      });
      const sortedByArea = [...withArea].sort((a, b) => b.area - a.area);
      const chosenTarget =
        sortedByArea[0].area >= sortedByArea[1].area * 1.8
          ? sortedByArea[0].obj
          : active[active.length - 1];
      const chosenSources = active.filter((o) => o !== chosenTarget);
      setSources(chosenSources);
      setTarget(chosenTarget);
    } else if (active.length === 1) {
      // Single object selected: assume it's a source first (user can click Set Target on container)
      setSources([active[0]]);
      setTarget(null);
      setStatusNote('Select your Target shape on canvas and click "Set Target".');
    } else {
      setSources([]);
      setTarget(null);
      setStatusNote('Select Source object(s) & Target shape, or pick them below.');
    }
  }, [isOpen, canvas]);

  // Dragging handlers for window title bar
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mx;
      const dy = e.clientY - dragStartRef.current.my;
      setDragOffset({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
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

  const clearPreviewGroup = useCallback(() => {
    if (!canvas || !previewGroupRef.current) return;
    canvas.remove(previewGroupRef.current);
    previewGroupRef.current = null;
    canvas.requestRenderAll();
  }, [canvas]);

  const runFill = useCallback(
    async (useSeed: number, commitHistory: boolean) => {
      if (!canvas) return;
      if (sources.length === 0 || !target) {
        if (commitHistory) {
          onToast?.('Please assign both Source object(s) and Target shape first.');
        }
        return;
      }

      const seq = ++generationSeqRef.current;
      setIsGenerating(true);
      setStatusNote(null);

      try {
        clearPreviewGroup();
        const result = await generateRandomFillerGroup(canvas, sources, target, {
          treatAsOneGroup,
          minSizePct: minSize,
          maxSizePct: maxSize,
          minRotationDeg: minRotation,
          maxRotationDeg: maxRotation,
          spacingPct: spacing,
          seed: useSeed,
        });

        // If a newer run started while awaiting clones, discard stale result
        if (seq !== generationSeqRef.current) {
          canvas.remove(result.group);
          canvas.requestRenderAll();
          return;
        }

        previewGroupRef.current = result.group;
        setLastCount(result.count);

        if (commitHistory) {
          hasUnpushedPreviewRef.current = false;
          onFillCommitted?.('Random Filler', result.count);
        } else {
          hasUnpushedPreviewRef.current = true;
        }
      } catch (err) {
        console.error('Random Filler failed:', err);
        setStatusNote('Could not generate random fill for the selected objects.');
      } finally {
        if (seq === generationSeqRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [
      canvas,
      sources,
      target,
      treatAsOneGroup,
      minSize,
      maxSize,
      minRotation,
      maxRotation,
      spacing,
      clearPreviewGroup,
      onFillCommitted,
      onToast,
    ]
  );

  // Live preview effect when sliders/options change
  useEffect(() => {
    if (!isOpen || !canvas) return;
    if (!livePreview) {
      return;
    }
    if (sources.length === 0 || !target) return;

    const timer = window.setTimeout(() => {
      runFill(seed, false);
    }, 65);

    return () => window.clearTimeout(timer);
  }, [
    isOpen,
    canvas,
    livePreview,
    sources,
    target,
    treatAsOneGroup,
    minSize,
    maxSize,
    minRotation,
    maxRotation,
    spacing,
    seed,
    runFill,
  ]);

  const targetDimsText = useMemo(() => {
    if (!target) return 'None';
    const r = target.getBoundingRect();
    const w = pxToUnitLabel(r.width, pageConfig.units);
    const h = pxToUnitLabel(r.height, pageConfig.units);
    return `${w.value} x ${h.value} ${w.suffix}`;
  }, [target, pageConfig.units]);

  if (!isOpen || !canvas) return null;

  const handleSetSelectedAsSource = () => {
    const sel = canvas
      .getActiveObjects()
      .filter((o) => o !== target && (o as any).customType !== 'random_filler');
    if (sel.length === 0) {
      onToast?.('Select 1 or more source objects on canvas first.');
      return;
    }
    setSources(sel);
    setStatusNote(null);
  };

  const handleSetSelectedAsTarget = () => {
    const sel = canvas
      .getActiveObjects()
      .filter((o) => (o as any).customType !== 'random_filler');
    if (sel.length === 0) {
      onToast?.('Select a target container shape on canvas first.');
      return;
    }
    const nextTarget = sel[sel.length - 1];
    setSources((prev) => prev.filter((o) => o !== nextTarget));
    setTarget(nextTarget);
    setStatusNote(null);
  };

  const handleGenerateClick = () => {
    const nextSeed = Math.floor(Math.random() * 1_000_000_000);
    setSeed(nextSeed);
    runFill(nextSeed, true);
  };

  const handleCloseClick = () => {
    if (hasUnpushedPreviewRef.current && previewGroupRef.current) {
      hasUnpushedPreviewRef.current = false;
      onFillCommitted?.('Random Filler', lastCount || 1);
    }
    onClose();
  };

  const winBg = isDark
    ? 'bg-[#4d5056] text-zinc-100 border-[#6a6e77]'
    : 'bg-[#f0f0f0] text-zinc-900 border-[#8a8d93]';
  const winHeader = isDark
    ? 'bg-[#44474d] border-[#646870] text-zinc-100'
    : 'bg-white border-[#d6d6d6] text-zinc-900';
  const winInput = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-zinc-900';
  const winBtn = isDark
    ? 'bg-[#5a5e66] border-[#6e737d] hover:bg-[#666a73] text-zinc-100'
    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e5f1fb] hover:border-[#0078d7] text-zinc-900';

  const sliders: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    onChange: (val: number) => void;
  }[] = [
    {
      label: 'Min size',
      value: minSize,
      min: 5,
      max: 200,
      unit: '%',
      onChange: (v) => {
        const clamped = Math.max(5, Math.min(200, v));
        setMinSize(clamped);
        if (clamped > maxSize) setMaxSize(clamped);
      },
    },
    {
      label: 'Max size',
      value: maxSize,
      min: 5,
      max: 200,
      unit: '%',
      onChange: (v) => {
        const clamped = Math.max(5, Math.min(200, v));
        setMaxSize(clamped);
        if (clamped < minSize) setMinSize(clamped);
      },
    },
    {
      label: 'Min rotation',
      value: minRotation,
      min: -180,
      max: 180,
      unit: '°',
      onChange: (v) => {
        const clamped = Math.max(-180, Math.min(180, v));
        setMinRotation(clamped);
        if (clamped > maxRotation) setMaxRotation(clamped);
      },
    },
    {
      label: 'Max rotation',
      value: maxRotation,
      min: -180,
      max: 180,
      unit: '°',
      onChange: (v) => {
        const clamped = Math.max(-180, Math.min(180, v));
        setMaxRotation(clamped);
        if (clamped < minRotation) setMinRotation(clamped);
      },
    },
    {
      label: 'Spacing',
      value: spacing,
      min: 0,
      max: 100,
      unit: '%',
      onChange: (v) => setSpacing(Math.max(0, Math.min(100, v))),
    },
  ];

  return (
    <div
      className="fixed top-20 left-1/2 z-50 w-[390px] max-w-[95vw] border shadow-2xl text-[12px] select-none"
      style={{
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        transform: `translate(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px)`,
      }}
    >
      <div className={winBg}>
        {/* Title Bar (Draggable) */}
        <div
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragStartRef.current = {
              mx: e.clientX,
              my: e.clientY,
              ox: dragOffset.x,
              oy: dragOffset.y,
            };
          }}
          className={`h-8 px-3 flex items-center justify-between border-b cursor-move ${winHeader}`}
        >
          <span className="font-normal text-[12px]">Random Filler</span>
          <button
            type="button"
            onClick={handleCloseClick}
            className="p-1 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dark Navy Banner matching screenshot */}
        <div className="bg-[#0d1f3a] text-white px-3 py-1.5 font-bold tracking-wide text-[11.5px] uppercase flex items-center justify-between">
          <span>RANDOM FILLER</span>
          {lastCount !== null && (
            <span className="text-[10px] font-normal text-sky-200 normal-case">
              {lastCount} items placed
            </span>
          )}
        </div>

        {/* Source & Target Metadata Row */}
        <div className="px-3 pt-2.5 pb-1.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] opacity-90">
            <span>
              Source: <strong>{sources.length}</strong> object(s)
            </span>
            <span>
              Target: <strong>{targetDimsText}</strong>
            </span>
          </div>

          {/* Interactive Source/Target Pickers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetSelectedAsSource}
              className={`flex-1 py-0.5 px-2 border text-[10.5px] transition cursor-pointer ${winBtn}`}
              title="Use currently selected canvas object(s) as Source"
            >
              Set Selected as Source
            </button>
            <button
              type="button"
              onClick={handleSetSelectedAsTarget}
              className={`flex-1 py-0.5 px-2 border text-[10.5px] transition cursor-pointer ${winBtn}`}
              title="Use currently selected container object as Target"
            >
              Set Selected as Target
            </button>
            <button
              type="button"
              disabled={!target && sources.length === 0}
              onClick={() => {
                if (sources.length >= 1 && target) {
                  const prevTarget = target;
                  const nextTarget = sources[sources.length - 1];
                  setSources([...sources.slice(0, -1), prevTarget]);
                  setTarget(nextTarget);
                }
              }}
              className={`p-1 border text-[10.5px] transition cursor-pointer disabled:opacity-40 ${winBtn}`}
              title="Swap Source and Target"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {statusNote && (
            <div className="px-2 py-1 text-[10.5px] rounded-xs border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
              {statusNote}
            </div>
          )}

          {/* Treat sources as one group */}
          <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11.5px]">
            <input
              type="checkbox"
              checked={treatAsOneGroup}
              onChange={(e) => setTreatAsOneGroup(e.target.checked)}
            />
            <span>Treat sources as one group</span>
          </label>
        </div>

        {/* 5 Adjustment Sliders */}
        <div className="px-3 py-1.5 space-y-2">
          {sliders.map((s) => (
            <div key={s.label} className="grid grid-cols-12 items-center gap-1.5">
              <span className="col-span-4 text-[11.5px] truncate">{s.label}</span>

              <div className="col-span-6 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => s.onChange(s.value - 1)}
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 cursor-pointer ${winBtn}`}
                  title={`Decrease ${s.label}`}
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  value={s.value}
                  onChange={(e) => s.onChange(Number(e.target.value))}
                  className="flex-1 accent-[#0078d7] cursor-pointer h-1.5"
                />
                <button
                  type="button"
                  onClick={() => s.onChange(s.value + 1)}
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 cursor-pointer ${winBtn}`}
                  title={`Increase ${s.label}`}
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className={`col-span-2 flex items-center border px-1 h-5 ${winInput}`}>
                <input
                  type="number"
                  min={s.min}
                  max={s.max}
                  value={s.value}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!Number.isNaN(num)) s.onChange(num);
                  }}
                  className="w-full bg-transparent text-right text-[11px] font-mono outline-none"
                />
                <span className="text-[10px] opacity-75 ml-0.5">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions: Live Preview, GENERATE, CLOSE */}
        <div className="px-3 py-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2 mt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11.5px]">
            <input
              type="checkbox"
              checked={livePreview}
              onChange={(e) => {
                const checked = e.target.checked;
                setLivePreview(checked);
                if (!checked && hasUnpushedPreviewRef.current) {
                  clearPreviewGroup();
                  hasUnpushedPreviewRef.current = false;
                  setLastCount(null);
                }
              }}
            />
            <span>Live preview</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating || sources.length === 0 || !target}
              onClick={handleGenerateClick}
              className="px-4 py-1 bg-[#0066cc] hover:bg-[#0055ad] disabled:opacity-45 text-white border border-[#004e9e] text-[11px] font-bold tracking-wide uppercase transition cursor-pointer"
            >
              {isGenerating ? 'Working...' : 'GENERATE'}
            </button>
            <button
              type="button"
              onClick={handleCloseClick}
              className={`px-4 py-1 border text-[11px] font-medium uppercase tracking-wide transition cursor-pointer ${winBtn}`}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
