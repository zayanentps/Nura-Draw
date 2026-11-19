import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Plus } from 'lucide-react';
import { DocumentPaletteSwatch, ThemeMode } from '../types';
import { formatCmykComponents } from '../utils/colorConversion';

interface DocumentPaletteBarProps {
  swatches: DocumentPaletteSwatch[];
  currentFill: string;
  currentStroke: string;
  onSelectFill: (color: string) => void;
  onSelectStroke: (color: string) => void;
  onOpenPaletteEditor: (selectedIndex?: number) => void;
  theme?: ThemeMode;
}

export const DocumentPaletteBar: React.FC<DocumentPaletteBarProps> = ({
  swatches,
  currentFill,
  currentStroke,
  onSelectFill,
  onSelectStroke,
  onOpenPaletteEditor,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div
      aria-label="Document Palette"
      onDoubleClick={(e) => {
        // Double-clicking anywhere on the empty bottom palette strip opens Palette Editor
        if (e.target === e.currentTarget || e.target === scrollRef.current) {
          onOpenPaletteEditor(0);
        }
      }}
      className={`h-[26px] border-t px-1.5 flex items-center gap-1 select-none shrink-0 ${
        isDark
          ? 'bg-[#4c4f55] border-[#646870] text-zinc-200'
          : 'bg-[#ededef] border-[#cfd1d6] text-zinc-700'
      }`}
    >
      {/* Document Palette Label & Editor Trigger */}
      <button
        type="button"
        onClick={() => onOpenPaletteEditor(0)}
        title="Open Document Palette Editor (Double-click any color swatch)"
        className={`h-[20px] px-1.5 flex items-center gap-1 rounded-xs text-[10px] font-medium shrink-0 transition ${
          isDark ? 'hover:bg-[#5b5f67] text-zinc-200' : 'hover:bg-[#d8dadf] text-zinc-700'
        }`}
      >
        <SlidersHorizontal className="w-3 h-3 text-[#38bdf8]" />
        <span className="hidden sm:inline">Document Palette</span>
      </button>

      {/* Scroll Left */}
      <button
        type="button"
        onClick={() => handleScroll(-120)}
        title="Scroll Document Palette Left"
        className={`w-4 h-[20px] flex items-center justify-center rounded-xs shrink-0 ${
          isDark ? 'hover:bg-[#5b5f67] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
        }`}
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {/* None (Transparent) Swatch */}
      <button
        type="button"
        onClick={() => onSelectFill('transparent')}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelectStroke('transparent');
        }}
        title="None (Transparent)&#10;• Left-click: Fill&#10;• Right-click: Outline"
        className={`relative w-[18px] h-[18px] shrink-0 border bg-white flex items-center justify-center ${
          currentFill === 'transparent'
            ? 'border-black ring-1 ring-black/40'
            : isDark
            ? 'border-[#4a4d54] hover:border-white'
            : 'border-[#7c7e83] hover:border-black'
        }`}
      >
        <svg className="w-full h-full" viewBox="0 0 18 18" preserveAspectRatio="none">
          <line x1="1" y1="17" x2="17" y2="1" stroke="#dc2626" strokeWidth="1.6" />
        </svg>
      </button>

      {/* Document Color Swatches Strip */}
      <div
        ref={scrollRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) {
            onOpenPaletteEditor(0);
          }
        }}
        className="flex-1 flex items-center gap-[2px] overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {swatches.length === 0 ? (
          <span
            onDoubleClick={() => onOpenPaletteEditor(0)}
            className={`text-[10px] italic px-1.5 truncate cursor-pointer ${
              isDark ? 'text-zinc-300' : 'text-zinc-500'
            }`}
            title="Select any color to add it here • Double-click to open Palette Editor"
          >
            Select any color to add to current document • Double-click for Palette Editor
          </span>
        ) : (
          swatches.map((swatch, index) => {
            const isFillActive = currentFill.toLowerCase() === swatch.hex.toLowerCase();
            const isStrokeActive = currentStroke.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => onSelectFill(swatch.hex)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelectStroke(swatch.hex);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onOpenPaletteEditor(index);
                }}
                title={`${swatch.name} (${swatch.treatAs})\n${swatch.cmyk || formatCmykComponents(swatch.hex)}\nHex: ${swatch.hex.toUpperCase()}\n• Left-click: Fill\n• Right-click: Outline\n• Double-click: Palette Editor`}
                className={`relative w-[18px] h-[18px] shrink-0 border transition-transform hover:z-10 hover:scale-[1.08] ${
                  isFillActive
                    ? isDark
                      ? 'border-white ring-1 ring-white/70 z-10'
                      : 'border-black ring-1 ring-black/45 z-10'
                    : isStrokeActive
                    ? 'border-sky-500 ring-1 ring-sky-400/75 z-10'
                    : isDark
                    ? 'border-[#3c3f45] hover:border-white'
                    : 'border-[#7c7e83] hover:border-black'
                }`}
                style={{ backgroundColor: swatch.hex }}
              />
            );
          })
        )}
      </div>

      {/* Quick Open Palette Editor (+) Button */}
      <button
        type="button"
        onClick={() => onOpenPaletteEditor(swatches.length > 0 ? swatches.length - 1 : 0)}
        title="Edit / Add Colors in Document Palette"
        className={`w-5 h-[18px] flex items-center justify-center rounded-xs shrink-0 border ${
          isDark
            ? 'border-[#686c75] hover:bg-[#5b5f67] text-zinc-200'
            : 'border-[#c0c2c6] hover:bg-[#d8dadf] text-zinc-700'
        }`}
      >
        <Plus className="w-3 h-3" />
      </button>

      {/* Scroll Right */}
      <button
        type="button"
        onClick={() => handleScroll(120)}
        title="Scroll Document Palette Right"
        className={`w-4 h-[20px] flex items-center justify-center rounded-xs shrink-0 ${
          isDark ? 'hover:bg-[#5b5f67] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
        }`}
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};
