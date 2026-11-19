import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sliders,
  Check,
  X,
  RotateCcw,
  Maximize2,
  Minimize2,
  Palette,
  Eye,
  EyeOff,
  Columns,
  Square
} from 'lucide-react';
import { PageConfig, ThemeMode } from '../types';
import {
  UnitType,
  PagePreset,
  ALL_UNITS,
  PAGE_PRESETS,
  pxToUnit,
  unitToPx,
  formatWithUnit,
  UNITS_DATA
} from '../utils/units';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageConfig: PageConfig;
  onUpdatePageConfig: (config: Partial<PageConfig>, applyToAll?: boolean) => void;
  totalPagesCount: number;
  activePageIndex: number;
  theme?: ThemeMode;
  initialTab?: 'size' | 'orientation' | 'units' | 'bleed' | 'background';
}

export const PageSetupModal: React.FC<PageSetupModalProps> = ({
  isOpen,
  onClose,
  pageConfig,
  onUpdatePageConfig,
  totalPagesCount,
  activePageIndex,
  theme = 'light',
  initialTab = 'size',
}) => {
  const isDark = theme === 'dark';

  // Local draft state
  const [activeTab, setActiveTab] = useState<'size' | 'orientation' | 'units' | 'bleed' | 'background'>(initialTab);
  const [preset, setPreset] = useState<PagePreset | string>(pageConfig.preset || 'Letter');
  const [units, setUnits] = useState<UnitType>(pageConfig.units || 'in');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(pageConfig.orientation || 'portrait');
  const [widthPx, setWidthPx] = useState<number>(pageConfig.width || 816);
  const [heightPx, setHeightPx] = useState<number>(pageConfig.height || 1056);
  const [backgroundColor, setBackgroundColor] = useState<string>(pageConfig.backgroundColor || '#ffffff');
  const [bleedPx, setBleedPx] = useState<number>(pageConfig.bleed ?? 0);
  const [showBleed, setShowBleed] = useState<boolean>(pageConfig.showBleed ?? false);
  const [showPageBorder, setShowPageBorder] = useState<boolean>(pageConfig.showPageBorder ?? true);
  const [dpi, setDpi] = useState<number>(pageConfig.dpi || 96);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [facingPages, setFacingPages] = useState<boolean>(pageConfig.facingPages || false);

  // Sync state whenever modal opens or pageConfig changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'size');
      setPreset(pageConfig.preset || 'Letter');
      setUnits(pageConfig.units || 'in');
      setOrientation(pageConfig.orientation || 'portrait');
      setWidthPx(pageConfig.width || 816);
      setHeightPx(pageConfig.height || 1056);
      setBackgroundColor(pageConfig.backgroundColor || '#ffffff');
      setBleedPx(pageConfig.bleed ?? 0);
      setShowBleed(pageConfig.showBleed ?? false);
      setShowPageBorder(pageConfig.showPageBorder ?? true);
      setDpi(pageConfig.dpi || 96);
      setFacingPages(pageConfig.facingPages || false);
    }
  }, [isOpen, pageConfig, initialTab]);

  if (!isOpen) return null;

  // Handle Preset Selection
  const handleSelectPreset = (presetId: PagePreset) => {
    const found = PAGE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    setPreset(presetId);

    let w = found.widthPx;
    let h = found.heightPx;

    // Preserve orientation unless standard paper preset dictates it
    if (orientation === 'landscape') {
      const max = Math.max(w, h);
      const min = Math.min(w, h);
      setWidthPx(max);
      setHeightPx(min);
    } else {
      const max = Math.max(w, h);
      const min = Math.min(w, h);
      setWidthPx(min);
      setHeightPx(max);
    }
  };

  // Orientation toggle
  const handleSetOrientation = (newOrientation: 'portrait' | 'landscape') => {
    if (orientation === newOrientation) return;
    setOrientation(newOrientation);

    // Swap width and height
    const w = widthPx;
    const h = heightPx;
    if (newOrientation === 'portrait' && w > h) {
      setWidthPx(h);
      setHeightPx(w);
    } else if (newOrientation === 'landscape' && h > w) {
      setWidthPx(h);
      setHeightPx(w);
    }
  };

  // Unit conversion
  const handleSelectUnit = (newUnit: UnitType) => {
    setUnits(newUnit);
  };

  // Save changes
  const handleApply = () => {
    onUpdatePageConfig(
      {
        preset,
        units,
        orientation,
        width: Math.round(widthPx),
        height: Math.round(heightPx),
        backgroundColor,
        bleed: bleedPx,
        showBleed,
        showPageBorder,
        dpi,
        facingPages,
      },
      applyToAll
    );
    onClose();
  };

  // Preview Aspect Ratio calculation
  const maxPreviewDim = 160;
  const aspect = widthPx / Math.max(1, heightPx);
  let previewW = maxPreviewDim;
  let previewH = maxPreviewDim;
  if (aspect > 1) {
    previewW = maxPreviewDim;
    previewH = maxPreviewDim / aspect;
  } else {
    previewH = maxPreviewDim;
    previewW = maxPreviewDim * aspect;
  }

  const bleedPreviewOffset = Math.max(2, Math.min(10, (bleedPx / Math.max(widthPx, heightPx)) * maxPreviewDim * 1.5));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-3xl rounded-sm shadow-2xl border flex flex-col overflow-hidden max-h-[92vh] ${
          isDark
            ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100 shadow-black/50'
            : 'bg-[#f4f5f7] border-[#abadb3] text-zinc-900 shadow-2xl'
        }`}
        style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
      >
        {/* CorelDRAW Title Bar */}
        <div
          className={`px-4 py-2 flex items-center justify-between border-b select-none ${
            isDark ? 'bg-[#44474d] border-[#646870] text-zinc-100' : 'bg-[#e3e5e8] border-[#cfd1d6] text-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0078d7]" />
            <span className="font-semibold text-xs tracking-wide">
              Page Setup — Document: Page {activePageIndex + 1} of {totalPagesCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 hover:text-white rounded-xs transition text-zinc-400"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div
            className={`w-48 border-r select-none py-2 text-xs shrink-0 flex flex-col justify-between ${
              isDark ? 'bg-[#46494f] border-[#646870]' : 'bg-[#eaebed] border-[#d8dadd]'
            }`}
          >
            <div className="space-y-0.5 px-2">
              {[
                { id: 'size', label: 'Page Size', icon: Maximize2 },
                { id: 'orientation', label: 'Layout & Orientation', icon: Columns },
                { id: 'units', label: 'Measurement Units', icon: Sliders },
                { id: 'bleed', label: 'Bleed & Guidelines', icon: Square },
                { id: 'background', label: 'Paper Background', icon: Palette },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full text-left px-2.5 py-2 rounded-xs flex items-center gap-2.5 transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-[#0078d7] text-white font-semibold'
                          : 'bg-[#0078d7] text-white font-semibold shadow-xs'
                        : isDark
                          ? 'text-zinc-200 hover:bg-[#575b63]'
                          : 'text-zinc-700 hover:bg-[#dbe0e5]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Paper Preview Card */}
            <div
              className={`m-2 p-2.5 rounded border flex flex-col items-center justify-center text-center ${
                isDark ? 'bg-[#3f4248] border-[#646870]' : 'bg-white border-zinc-300 shadow-xs'
              }`}
            >
              <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-2">Live Preview</div>

              <div
                className="relative flex items-center justify-center mb-2"
                style={{ width: `${maxPreviewDim}px`, height: `${maxPreviewDim}px` }}
              >


                {/* Page sheet */}
                <div
                  className="rounded-xs shadow-md border transition-all flex flex-col items-center justify-center"
                  style={{
                    width: `${previewW}px`,
                    height: `${previewH}px`,
                    backgroundColor: backgroundColor,
                    borderColor: isDark ? '#52525b' : '#9ca3af',
                  }}
                >
                  <div className="text-[9px] font-mono font-semibold text-zinc-700 bg-white/70 px-1 rounded shadow-2xs">
                    {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-500">
                {pxToUnit(widthPx, units)} × {pxToUnit(heightPx, units)} {UNITS_DATA[units]?.symbol}
              </div>
              <div className="text-[9px] text-zinc-400">
                ({Math.round(widthPx)} × {Math.round(heightPx)} px)
              </div>
            </div>
          </div>

          {/* Tab Content Panes */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
            {/* TAB 1: PAGE SIZE */}
            {activeTab === 'size' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Page Dimensions & Standard Presets</h4>
                  <p className="text-[11px] text-zinc-500">
                    Choose from standard print, commercial stationery, or digital resolutions, or enter custom dimensions.
                  </p>
                </div>

                {/* Presets Grid */}
                <div>
                  <label className="block font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Preset Formats</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 border rounded border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/40">
                    {PAGE_PRESETS.map((p) => {
                      const isSelected = preset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPreset(p.id)}
                          className={`p-2 rounded-xs border text-left flex flex-col transition ${
                            isSelected
                              ? 'bg-[#0078d7]/10 border-[#0078d7] text-[#0078d7] font-semibold dark:bg-[#0078d7]/20 dark:text-blue-400'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{p.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-[#0078d7] dark:text-blue-400 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-normal truncate mt-0.5">
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Width & Height custom controls */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                      Width ({UNITS_DATA[units]?.label})
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step={UNITS_DATA[units]?.step || 1}
                        value={pxToUnit(widthPx, units)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setWidthPx(unitToPx(val, units));
                            setPreset('Custom');
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-l border text-xs font-mono outline-none ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-white focus:border-[#0078d7]'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0078d7]'
                        }`}
                      />
                      <span
                        className={`px-2.5 py-1.5 border border-l-0 rounded-r font-mono text-[11px] ${
                          isDark ? 'bg-zinc-700 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        }`}
                      >
                        {UNITS_DATA[units]?.symbol}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                      Height ({UNITS_DATA[units]?.label})
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step={UNITS_DATA[units]?.step || 1}
                        value={pxToUnit(heightPx, units)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setHeightPx(unitToPx(val, units));
                            setPreset('Custom');
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-l border text-xs font-mono outline-none ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-white focus:border-[#0078d7]'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0078d7]'
                        }`}
                      />
                      <span
                        className={`px-2.5 py-1.5 border border-l-0 rounded-r font-mono text-[11px] ${
                          isDark ? 'bg-zinc-700 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        }`}
                      >
                        {UNITS_DATA[units]?.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORIENTATION & LAYOUT */}
            {activeTab === 'orientation' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Page Orientation & Book Layout</h4>
                  <p className="text-[11px] text-zinc-500">
                    Set sheet direction, vertical vs horizontal aspect, and multi-page layout behavior.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleSetOrientation('portrait')}
                    className={`p-3.5 rounded border text-left flex items-center gap-3 transition ${
                      orientation === 'portrait'
                        ? 'bg-[#0078d7]/10 border-[#0078d7] text-[#0078d7] font-semibold dark:bg-[#0078d7]/20 dark:text-blue-400'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <div className="w-7 h-10 border-2 border-current rounded-xs shrink-0 flex items-center justify-center">
                      <div className="w-3 h-1 bg-current rounded-2xs" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs">Portrait Orientation</div>
                      <div className="text-[10px] text-zinc-500">Height is greater than width (Vertical)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSetOrientation('landscape')}
                    className={`p-3.5 rounded border text-left flex items-center gap-3 transition ${
                      orientation === 'landscape'
                        ? 'bg-[#0078d7]/10 border-[#0078d7] text-[#0078d7] font-semibold dark:bg-[#0078d7]/20 dark:text-blue-400'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <div className="w-10 h-7 border-2 border-current rounded-xs shrink-0 flex items-center justify-center">
                      <div className="w-3 h-1 bg-current rounded-2xs" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs">Landscape Orientation</div>
                      <div className="text-[10px] text-zinc-500">Width is greater than height (Horizontal)</div>
                    </div>
                  </button>
                </div>

                {/* Facing Pages Toggle */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={facingPages}
                      onChange={(e) => setFacingPages(e.target.checked)}
                      className="rounded accent-[#0078d7]"
                    />
                    <span className="font-medium text-xs">Facing Pages (Booklet / Double-Page Spread)</span>
                  </label>
                  <p className="text-[11px] text-zinc-500 pl-6">
                    Displays adjacent pages side by side for magazine, catalog, or brochure publishing.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: MEASUREMENT UNITS */}
            {activeTab === 'units' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Measurement Units & Coordinate Scaling</h4>
                  <p className="text-[11px] text-zinc-500">
                    CorelDRAW supports physical print units, typographic units, and screen pixels with live conversion.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {ALL_UNITS.map((u) => {
                    const isSelected = units === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUnit(u.id)}
                        className={`p-2.5 rounded border text-left flex flex-col transition ${
                          isSelected
                            ? 'bg-[#0078d7]/10 border-[#0078d7] text-[#0078d7] font-semibold dark:bg-[#0078d7]/20 dark:text-blue-400'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs">{u.label}</span>
                          <span className="font-mono text-xs font-bold text-zinc-500">[{u.symbol}]</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono mt-1">
                          1 {u.symbol} = {u.pxPerUnit.toFixed(2)} px
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Print Resolution / DPI */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                    Document Rendering Resolution (DPI)
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { val: 72, label: '72 DPI (Web Low)' },
                      { val: 96, label: '96 DPI (Screen Std)' },
                      { val: 150, label: '150 DPI (Draft Print)' },
                      { val: 300, label: '300 DPI (High-Quality Print)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => setDpi(item.val)}
                        className={`px-3 py-1.5 rounded text-[11px] border transition ${
                          dpi === item.val
                            ? 'border-[#0078d7] font-semibold bg-[#0078d7]/10 text-[#0078d7] dark:text-blue-400'
                            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BLEED & GUIDELINES */}
            {activeTab === 'bleed' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Prepress Bleed Area & Canvas Guides</h4>
                  <p className="text-[11px] text-zinc-500">
                    Bleed ensures graphics print cleanly to the paper edge after trimming in commercial printing presses.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                      Bleed Distance ({UNITS_DATA[units]?.label})
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step={units === 'in' ? 0.0625 : 1}
                        value={pxToUnit(bleedPx, units, 3)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            setBleedPx(unitToPx(val, units));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-l border text-xs font-mono outline-none ${
                          isDark
                            ? 'bg-[#3e4147] border-[#686c75] text-white'
                            : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                      <span
                        className={`px-2.5 py-1.5 border border-l-0 rounded-r font-mono text-[11px] ${
                          isDark ? 'bg-zinc-700 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        }`}
                      >
                        {UNITS_DATA[units]?.symbol}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Standard offset: 0.125 in (3.175 mm / 12 px)
                    </span>
                  </div>

                  <div className="space-y-2 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBleed}
                        onChange={(e) => setShowBleed(e.target.checked)}
                        className="rounded accent-[#0078d7]"
                      />
                      <span className="font-medium text-xs">Show Bleed Area Guide (Red Dashed Line)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPageBorder}
                        onChange={(e) => setShowPageBorder(e.target.checked)}
                        className="rounded accent-[#0078d7]"
                      />
                      <span className="font-medium text-xs">Show Printable Page Border & Shadow</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAPER BACKGROUND */}
            {activeTab === 'background' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Paper Background Color</h4>
                  <p className="text-[11px] text-zinc-500">
                    Choose solid paper color or set transparent canvas for vector logos and icon export.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {[
                    { name: 'Pure White', color: '#ffffff' },
                    { name: 'Warm Paper', color: '#fbf9f4' },
                    { name: 'Newsprint', color: '#f0ede6' },
                    { name: 'Midnight Charcoal', color: '#1a1c1e' },
                    { name: 'Deep Onyx', color: '#090a0b' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setBackgroundColor(p.color)}
                      className={`px-3 py-2 rounded border flex items-center gap-2 transition ${
                        backgroundColor === p.color
                          ? 'border-[#0078d7] font-semibold bg-[#0078d7]/10'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.name}</span>
                    </button>
                  ))}

                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-400 cursor-pointer bg-transparent"
                      title="Custom Paper Color"
                    />
                    <span className="font-mono text-[11px] text-zinc-500">{backgroundColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Classic CorelDRAW Dialog Actions) */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between select-none ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-[#e9eaed] border-[#cfd1d6]'
          }`}
        >
          {/* Apply to option */}
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="applyScope"
                checked={!applyToAll}
                onChange={() => setApplyToAll(false)}
                className="accent-[#0078d7]"
              />
              <span className="font-medium">Current Page Only (Page {activePageIndex + 1})</span>
            </label>

            {totalPagesCount > 1 && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyScope"
                  checked={applyToAll}
                  onChange={() => setApplyToAll(true)}
                  className="accent-[#0078d7]"
                />
                <span className="font-medium">All Pages ({totalPagesCount} pages)</span>
              </label>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xs border text-xs transition ${
                isDark
                  ? 'border-[#686c75] hover:bg-[#575b63] text-zinc-200'
                  : 'border-zinc-400 bg-white hover:bg-zinc-100 text-zinc-800 shadow-2xs'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-1.5 rounded-xs text-xs font-semibold bg-[#0078d7] hover:bg-[#006cc1] text-white shadow-xs transition"
            >
              OK (Apply)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
