import React, { useRef, useState } from 'react';
import { NURADRAW_PALETTE } from '../utils/palette';
import { DocumentPaletteSwatch, ThemeMode, ToolType } from '../types';
import { Pipette, ChevronUp, ChevronDown, ChevronsRight, ChevronsLeft, Plus, Slash } from 'lucide-react';

interface ColorPaletteProps {
  currentFill: string;
  currentStroke: string;
  onSelectFill: (color: string) => void;
  onSelectStroke: (color: string) => void;
  theme?: ThemeMode;
  activeTool?: ToolType;
  onSelectTool?: (tool: ToolType) => void;
  documentSwatches?: DocumentPaletteSwatch[];
  onOpenPaletteEditor?: (selectedIndex?: number) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  currentFill,
  currentStroke,
  onSelectFill,
  onSelectStroke,
  theme = 'light',
  activeTool,
  onSelectTool,
  documentSwatches = [],
  onOpenPaletteEditor,
}) => {
  const isDark = theme === 'dark';
  const listRef = useRef<HTMLDivElement | null>(null);
  const customFillInputRef = useRef<HTMLInputElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showFlyout, setShowFlyout] = useState(false);
  const [paletteMode, setPaletteMode] = useState<'cmyk' | 'grayscale' | 'document'>('cmyk');

  const handleSwatchContextMenu = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    onSelectStroke(color);
  };

  const handleScroll = (delta: number) => {
    if (listRef.current) {
      listRef.current.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

  const swatchesToRender =
    paletteMode === 'grayscale'
      ? NURADRAW_PALETTE.slice(0, 12)
      : paletteMode === 'document'
      ? [
          { name: 'None (Transparent)', hex: 'transparent', cmyk: 'None' },
          ...documentSwatches.map((sw) => ({
            name: sw.name,
            hex: sw.hex,
            cmyk: sw.cmyk || sw.hex,
          })),
        ]
      : NURADRAW_PALETTE;

  return (
    <aside
      aria-label="Color Palette"
      className={`relative h-full flex flex-col items-center shrink-0 select-none z-20 border-l transition-all duration-150 ${
        expanded ? 'w-[76px]' : 'w-[28px]'
      } ${
        isDark
          ? 'bg-[#4c4f55] border-[#646870] text-zinc-100'
          : 'bg-[#ededef] border-[#c0c2c6] text-zinc-800'
      }`}
    >
      {/* Hidden custom color input for quick custom Fill selection */}
      <input
        ref={customFillInputRef}
        type="color"
        value={currentFill === 'transparent' ? '#ffffff' : currentFill}
        onChange={(e) => onSelectFill(e.target.value)}
        className="opacity-0 w-0 h-0 absolute pointer-events-none"
      />

      {/* Top Palette Controls: Flyout Arrow, Eyedropper, Scroll Up */}
      <div
        className={`w-full flex flex-col items-center pt-1 pb-0.5 gap-0.5 shrink-0 ${
          isDark ? 'bg-[#4f5259]' : 'bg-[#ededef]'
        }`}
      >
        {/* Tiny Flyout Triangle (Palette Options) */}
        <button
          type="button"
          onClick={() => setShowFlyout((v) => !v)}
          title="Palette Options (Switch Palette / Custom Color / Document Colors)"
          className={`w-full h-4 flex items-center justify-center transition ${
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-[#d8dadf] text-zinc-700'
          }`}
        >
          <span
            className="inline-block w-0 h-0"
            style={{
              borderTop: '3.5px solid transparent',
              borderBottom: '3.5px solid transparent',
              borderLeft: isDark ? '5px solid #a1a1aa' : '5px solid #4a4d52',
            }}
          />
        </button>

        {/* Eyedropper Button (Left-click: Eyedropper tool, Right-click: Custom color picker) */}
        <button
          type="button"
          onClick={() => {
            if (onSelectTool) {
              onSelectTool(activeTool === 'eyedropper' ? 'pick' : 'eyedropper');
            } else {
              customFillInputRef.current?.click();
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            customFillInputRef.current?.click();
          }}
          title="Color Eyedropper (Left-click: Eyedropper Tool | Right-click: Custom Fill Color)"
          className={`w-full h-5 flex items-center justify-center transition ${
            activeTool === 'eyedropper'
              ? isDark
                ? 'bg-zinc-700 text-sky-400'
                : 'bg-[#d0d7e2] text-[#005a9e]'
              : isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-[#d8dadf] text-zinc-600'
          }`}
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>

        {/* Scroll Up Chevron */}
        <button
          type="button"
          onClick={() => handleScroll(-96)}
          title="Scroll Palette Up"
          className={`w-full h-4 flex items-center justify-center transition ${
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-[#d8dadf] text-zinc-600'
          }`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vertical Color Swatches Column / Expanded Multi-Column Grid */}
      <div
        ref={listRef}
        className={`flex-1 w-full overflow-y-auto px-[3px] py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          expanded ? 'grid grid-cols-3 gap-[2px] auto-rows-[18px] content-start' : 'flex flex-col gap-[1px]'
        }`}
      >
        {swatchesToRender.map((swatch) => {
          const isTransparent = swatch.hex === 'transparent';
          const isFillActive = currentFill.toLowerCase() === swatch.hex.toLowerCase();
          const isStrokeActive = currentStroke.toLowerCase() === swatch.hex.toLowerCase();

          return (
            <button
              key={swatch.name + swatch.hex}
              type="button"
              onClick={() => onSelectFill(swatch.hex)}
              onContextMenu={(e) => handleSwatchContextMenu(e, swatch.hex)}
              title={`${swatch.name}${swatch.cmyk ? `\n${swatch.cmyk}` : ''}\nHex: ${swatch.hex}\n• Left-click: Fill\n• Right-click: Outline`}
              className={`relative w-full h-[18px] shrink-0 border transition-transform hover:z-10 hover:scale-[1.06] flex items-center justify-center ${
                isFillActive
                  ? isDark
                    ? 'border-white ring-1 ring-white/70 z-10'
                    : 'border-black ring-1 ring-black/40 z-10'
                  : isStrokeActive
                  ? 'border-sky-500 ring-1 ring-sky-400/70 z-10'
                  : isDark
                  ? 'border-[#3c3f45] hover:border-white'
                  : 'border-[#7c7e83] hover:border-black'
              }`}
              style={{
                backgroundColor: isTransparent ? '#ffffff' : swatch.hex,
              }}
            >
              {isTransparent && (
                <svg className="w-full h-full" viewBox="0 0 20 16" preserveAspectRatio="none">
                  <line x1="1" y1="15" x2="19" y2="1" stroke="#dc2626" strokeWidth="1.6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Palette Controls: Scroll Down + Expand/Collapse (>>) */}
      <div
        className={`w-full flex flex-col items-center py-0.5 gap-0.5 shrink-0 border-t ${
          isDark ? 'bg-[#4f5259] border-[#646870]' : 'bg-[#ededef] border-[#c8cad0]'
        }`}
      >
        <button
          type="button"
          onClick={() => handleScroll(96)}
          title="Scroll Palette Down"
          className={`w-full h-4 flex items-center justify-center transition ${
            isDark ? 'hover:bg-[#5c6068] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? 'Collapse Palette to Single Column' : 'Expand Palette Columns (>>)'}
          className={`w-full h-5 flex items-center justify-center transition ${
            isDark ? 'hover:bg-[#5c6068] text-zinc-200' : 'hover:bg-[#d8dadf] text-zinc-700'
          }`}
        >
          {expanded ? <ChevronsLeft className="w-3.5 h-3.5" /> : <ChevronsRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Palette Options Flyout Menu */}
      {showFlyout && (
        <div
          className={`absolute right-full top-1 mr-1 w-56 rounded-xs shadow-xl border p-2 z-50 text-xs ${
            isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-300 dark:border-zinc-700">
            <span className="font-semibold text-[11px]">Palette Options</span>
            <button
              type="button"
              onClick={() => setShowFlyout(false)}
              className="text-[10px] opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>

          {/* Current Fill / Outline Indicator */}
          <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/5 dark:bg-white/5">
            <div className="relative w-6 h-6 border border-zinc-400 bg-white shrink-0">
              <div
                className="absolute inset-0 border-2"
                style={{ borderColor: currentStroke === 'transparent' ? '#71717a' : currentStroke }}
              />
              <div
                className="absolute inset-1 flex items-center justify-center"
                style={{ backgroundColor: currentFill === 'transparent' ? '#f4f4f5' : currentFill }}
              >
                {currentFill === 'transparent' && <Slash className="w-2.5 h-2.5 text-red-500 stroke-[2.5]" />}
              </div>
            </div>
            <div className="text-[10px] leading-tight min-w-0">
              <div className="truncate">
                Fill: <span className="font-mono font-semibold">{currentFill}</span>
              </div>
              <div className="truncate">
                Line: <span className="font-mono font-semibold">{currentStroke}</span>
              </div>
            </div>
          </div>

          {/* Palette Set Selection */}
          <div className="space-y-0.5 mb-2">
            {(
              [
                { id: 'cmyk', label: 'Default CMYK Palette' },
                { id: 'grayscale', label: 'Grayscale Ramp' },
                { id: 'document', label: `Document Palette (${documentSwatches.length})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPaletteMode(opt.id);
                  setShowFlyout(false);
                }}
                className={`w-full text-left px-2 py-1 rounded-xs text-[11px] flex items-center justify-between ${
                  paletteMode === opt.id
                    ? 'bg-[#0078d7] text-white'
                    : isDark
                    ? 'hover:bg-zinc-700'
                    : 'hover:bg-[#d8dadf]'
                }`}
              >
                <span>{opt.label}</span>
                {paletteMode === opt.id && <span>✓</span>}
              </button>
            ))}
          </div>

          {/* Custom Pickers & Document Palette Actions */}
          <div className="pt-1.5 border-t border-zinc-300 dark:border-zinc-700 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => customFillInputRef.current?.click()}
              className={`w-full text-left px-2 py-1 rounded-xs text-[11px] flex items-center gap-1.5 ${
                isDark ? 'hover:bg-zinc-700' : 'hover:bg-[#d8dadf]'
              }`}
            >
              <Pipette className="w-3 h-3 text-emerald-500" />
              <span>Custom Fill Color...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFlyout(false);
                onOpenPaletteEditor?.(0);
              }}
              className={`w-full text-left px-2 py-1 rounded-xs text-[11px] flex items-center gap-1.5 ${
                isDark ? 'hover:bg-zinc-700' : 'hover:bg-[#d8dadf]'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Palette Editor...</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
