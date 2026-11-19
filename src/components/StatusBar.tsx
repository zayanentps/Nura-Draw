import React from 'react';
import { Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { PageConfig, ThemeMode } from '../types';

interface StatusBarProps {
  cursorPos: { x: number; y: number };
  selectionLabel: string;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  pages: PageConfig[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  theme?: ThemeMode;
  currentFill?: string;
  currentStroke?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPos,
  selectionLabel,
  zoomLevel,
  onZoomChange,
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  theme = 'light',
  currentFill = 'transparent',
  currentStroke = '#000000',
}) => {
  const isDark = theme === 'dark';

  return (
    <footer
      className={`h-6 border-t px-3 flex items-center justify-between text-[11px] select-none font-sans transition-colors ${
        isDark
          ? 'bg-[#494c52] border-[#646870] text-zinc-200'
          : 'bg-[#ebecee] border-[#cfd1d6] text-zinc-700'
      }`}
    >
      {/* Page Tabs */}
      <div className={`flex items-center gap-1 border-r pr-3 ${isDark ? 'border-[#646870]' : 'border-[#cfd1d6]'}`}>
        <div className="flex items-center gap-0.5">
          {pages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPage(idx)}
              className={`px-2 py-0.5 rounded-t text-[11px] border-b-2 font-medium transition ${
                activePageIndex === idx
                  ? isDark
                    ? 'bg-[#5c6068] text-emerald-300 border-emerald-400'
                    : 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : isDark
                    ? 'text-zinc-300 hover:text-white border-transparent'
                    : 'text-zinc-600 hover:text-zinc-900 border-transparent'
              }`}
            >
              {p.name || `Page ${idx + 1}`}
            </button>
          ))}
          <button
            onClick={onAddPage}
            title="Add Page"
            className={`p-1 rounded transition-colors ${
              isDark
                ? 'text-zinc-300 hover:text-white hover:bg-[#5c6068]'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200'
            }`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Selected Object / Context description */}
      <div className={`flex-1 px-4 truncate flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        <Layers className={`w-3 h-3 shrink-0 ${isDark ? 'text-zinc-300' : 'text-zinc-400'}`} />
        <span className="truncate">{selectionLabel || 'No object selected — Click or drag tool to create vector shapes'}</span>
      </div>

      {/* Coordinates and Zoom Controls */}
      <div className="flex items-center gap-4">
        {/* Coordinates */}
        <div className={`font-mono flex items-center gap-2 text-[10px] ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          <span>
            X: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{Math.round(cursorPos.x)}</strong> px
          </span>
          <span>
            Y: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{Math.round(cursorPos.y)}</strong> px
          </span>
        </div>

        {/* Zoom Controls (Logarithmic range 1% to 409,600% max) */}
        <div className={`flex items-center gap-1.5 border-l pl-3 ${isDark ? 'border-[#646870]' : 'border-[#cfd1d6]'}`}>
          <button
            onClick={() => onZoomChange(Math.max(0.01, Number((zoomLevel * 0.8).toFixed(4))))}
            title="Zoom Out"
            className={`p-0.5 ${isDark ? 'hover:text-white' : 'hover:text-black'}`}
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={Math.round(
              ((Math.log(Math.min(4096, Math.max(0.01, zoomLevel))) - Math.log(0.01)) /
                (Math.log(4096) - Math.log(0.01))) *
                1000
            )}
            onChange={(e) => {
              const t = Number(e.target.value) / 1000;
              const next = Math.exp(Math.log(0.01) + t * (Math.log(4096) - Math.log(0.01)));
              onZoomChange(Math.min(4096, Math.max(0.01, Number(next.toFixed(4)))));
            }}
            className="w-20 accent-blue-600 cursor-pointer h-1"
          />
          <button
            onClick={() => onZoomChange(Math.min(4096, Number((zoomLevel * 1.25).toFixed(4))))}
            title="Zoom In"
            className={`p-0.5 ${isDark ? 'hover:text-white' : 'hover:text-black'}`}
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <span className={`font-mono min-w-[3.25rem] text-right text-[10px] ${isDark ? 'text-zinc-300' : 'text-zinc-800 font-semibold'}`}>
            {Math.round(zoomLevel * 100).toLocaleString()}%
          </span>
        </div>

        {/* CorelDRAW Status Bar Fill & Outline Indicator */}
        <div
          className={`flex items-center gap-2 border-l pl-3 text-[10px] ${isDark ? 'border-zinc-800' : 'border-[#cfd1d6]'}`}
          title="Active Fill & Outline (Left-click right palette = Fill, Right-click = Outline)"
        >
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 border border-zinc-400 inline-block"
              style={{
                background:
                  currentFill === 'transparent'
                    ? 'linear-gradient(to top right, #fff 44%, #dc2626 48%, #dc2626 52%, #fff 56%)'
                    : currentFill,
              }}
            />
            <span className="font-mono opacity-80">{currentFill === 'transparent' ? 'None' : currentFill}</span>
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 border-2 inline-block bg-transparent"
              style={{
                borderColor: currentStroke === 'transparent' ? '#a1a1aa' : currentStroke,
              }}
            />
            <span className="font-mono opacity-80">{currentStroke === 'transparent' ? 'None' : currentStroke}</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
