import React, { useState, useEffect } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Maximize,
  Grid,
  Layers,
  ArrowRightLeft,
  ArrowUpDown,
} from 'lucide-react';
import * as fabric from 'fabric';
import { alignObjects, distributeObjects, AlignMode, AlignTarget } from '../../utils/canvasHelpers';
import { ThemeMode } from '../../types';

interface AlignDockerProps {
  canvas: fabric.Canvas | null;
  pageWidth: number;
  pageHeight: number;
  theme?: ThemeMode;
  onRefresh?: () => void;
}

export const AlignDocker: React.FC<AlignDockerProps> = ({
  canvas,
  pageWidth,
  pageHeight,
  theme = 'light',
  onRefresh,
}) => {
  const isDark = theme === 'dark';
  const [alignTarget, setAlignTarget] = useState<AlignTarget>('objects');
  const [selectedCount, setSelectedCount] = useState<number>(0);

  // Monitor canvas selection
  useEffect(() => {
    if (!canvas) return;

    const updateCount = () => {
      const active = canvas.getActiveObjects();
      setSelectedCount(active ? active.length : 0);
    };

    updateCount();
    canvas.on('selection:created', updateCount);
    canvas.on('selection:updated', updateCount);
    canvas.on('selection:cleared', updateCount);

    return () => {
      canvas.off('selection:created', updateCount);
      canvas.off('selection:updated', updateCount);
      canvas.off('selection:cleared', updateCount);
    };
  }, [canvas]);

  const handleAlign = (alignment: AlignMode) => {
    if (!canvas) return;
    alignObjects(canvas, alignment, pageWidth, pageHeight, alignTarget);
    onRefresh?.();
  };

  const handleDistribute = (direction: 'horizontal' | 'vertical') => {
    if (!canvas) return;
    distributeObjects(canvas, direction);
    onRefresh?.();
  };

  const btnClass = `flex flex-col items-center justify-center gap-1 p-2 rounded transition border text-xs shadow-xs ${
    isDark
      ? 'bg-[#565a62] hover:bg-[#61656e] active:bg-[#494c52] border-[#6b7079] hover:border-zinc-400 text-zinc-100'
      : 'bg-white hover:bg-zinc-100 active:bg-zinc-200 border-[#abadb3] hover:border-zinc-400 text-zinc-800'
  }`;

  return (
    <div
      className={`p-3 select-none text-xs space-y-3.5 transition-colors ${
        isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'
      }`}
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {/* Title */}
      <div
        className={`font-semibold pb-1.5 border-b flex items-center justify-between ${
          isDark ? 'border-[#646870] text-zinc-100' : 'border-[#abadb3] text-zinc-800'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Grid className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-[12px]">Align and Distribute</span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            selectedCount >= 2
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
              : selectedCount === 1
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
              : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/20'
          }`}
        >
          {selectedCount} selected
        </span>
      </div>

      {/* Align To Target Selector (CorelDRAW Signature: Active Objects vs Page vs Key Object) */}
      <div>
        <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Align to:
        </label>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setAlignTarget('objects')}
            title="Align relative to selected objects (Object to Object)"
            className={`py-1 px-1.5 rounded-xs text-[10px] font-medium border text-center transition ${
              alignTarget === 'objects'
                ? isDark
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-[#0078d7] text-white border-[#005a9e]'
                : isDark
                ? 'bg-[#565a62] hover:bg-[#61656e] text-zinc-200 border-[#686c75]'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border-[#abadb3]'
            }`}
          >
            Objects
          </button>
          <button
            type="button"
            onClick={() => setAlignTarget('page')}
            title="Align relative to Page bounds"
            className={`py-1 px-1.5 rounded-xs text-[10px] font-medium border text-center transition ${
              alignTarget === 'page'
                ? isDark
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-[#0078d7] text-white border-[#005a9e]'
                : isDark
                ? 'bg-[#565a62] hover:bg-[#61656e] text-zinc-200 border-[#686c75]'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border-[#abadb3]'
            }`}
          >
            Page
          </button>
          <button
            type="button"
            onClick={() => setAlignTarget('key-object')}
            title="Align to Target Key Object (last selected object)"
            className={`py-1 px-1.5 rounded-xs text-[10px] font-medium border text-center transition ${
              alignTarget === 'key-object'
                ? isDark
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-[#0078d7] text-white border-[#005a9e]'
                : isDark
                ? 'bg-[#565a62] hover:bg-[#61656e] text-zinc-200 border-[#686c75]'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border-[#abadb3]'
            }`}
          >
            Key Object
          </button>
        </div>
      </div>

      {/* Horizontal Alignment */}
      <div>
        <label className={`block text-[11px] font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Align Horizontally
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => handleAlign('left')} className={btnClass} title="Align Left (L)">
            <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-medium">Left (L)</span>
          </button>
          <button onClick={() => handleAlign('center')} className={btnClass} title="Align Center (C)">
            <AlignCenter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-medium">Center (C)</span>
          </button>
          <button onClick={() => handleAlign('right')} className={btnClass} title="Align Right (R)">
            <AlignRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-medium">Right (R)</span>
          </button>
        </div>
      </div>

      {/* Vertical Alignment */}
      <div>
        <label className={`block text-[11px] font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Align Vertically
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => handleAlign('top')} className={btnClass} title="Align Top (T)">
            <AlignVerticalJustifyStart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-medium">Top (T)</span>
          </button>
          <button onClick={() => handleAlign('middle')} className={btnClass} title="Align Middle (E)">
            <AlignVerticalJustifyCenter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-medium">Middle (E)</span>
          </button>
          <button onClick={() => handleAlign('bottom')} className={btnClass} title="Align Bottom (B)">
            <AlignVerticalJustifyEnd className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-medium">Bottom (B)</span>
          </button>
        </div>
      </div>

      {/* Distribute Space (Equal gaps between objects) */}
      <div>
        <label className={`block text-[11px] font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Distribute Space (Equal Gaps)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleDistribute('horizontal')}
            disabled={selectedCount < 3}
            className={`${btnClass} disabled:opacity-40 disabled:pointer-events-none`}
            title="Distribute Horizontal Spacing evenly (needs 3+ objects)"
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-medium">Distribute H</span>
          </button>
          <button
            onClick={() => handleDistribute('vertical')}
            disabled={selectedCount < 3}
            className={`${btnClass} disabled:opacity-40 disabled:pointer-events-none`}
            title="Distribute Vertical Spacing evenly (needs 3+ objects)"
          >
            <ArrowUpDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-medium">Distribute V</span>
          </button>
        </div>
      </div>

      {/* Page Alignment: Center to Page (P) */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-[#abadb3]'}`}>
        <label className={`block text-[11px] font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Center to Page
        </label>
        <button
          onClick={() => handleAlign('center-page')}
          disabled={selectedCount === 0}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded font-medium text-xs transition border shadow-xs disabled:opacity-40 ${
            isDark
              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-400'
          }`}
          title="Center selection to Page (P in CorelDRAW)"
        >
          <Maximize className="w-4 h-4" />
          <span>Center to Page (P)</span>
        </button>
      </div>
    </div>
  );
};
