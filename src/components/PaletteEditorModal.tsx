import React, { useEffect, useRef, useState } from 'react';
import { FilePlus2, FolderOpen, Save, FileDown, X } from 'lucide-react';
import { DocumentPaletteSwatch } from '../types';
import { NURADRAW_PALETTE } from '../utils/palette';
import {
  formatCmykComponents,
  getSwatchLuminance,
  hexToRgb,
  normalizeHex,
  resolveColorName,
  rgbToCmyk,
  rgbToHsb,
} from '../utils/colorConversion';
import { SelectColorModal, SelectColorResult } from './SelectColorModal';

interface PaletteEditorModalProps {
  isOpen: boolean;
  swatches: DocumentPaletteSwatch[];
  initialSelectedIndex?: number;
  documentName?: string;
  onSave: (updatedSwatches: DocumentPaletteSwatch[]) => void;
  onClose: () => void;
}

type SortCriteria = 'hue' | 'luminance' | 'name' | 'rgb' | 'cmyk' | 'reverse';

export const PaletteEditorModal: React.FC<PaletteEditorModalProps> = ({
  isOpen,
  swatches,
  initialSelectedIndex = 0,
  documentName = 'Document',
  onSave,
  onClose,
}) => {
  const [draftSwatches, setDraftSwatches] = useState<DocumentPaletteSwatch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [paletteView, setPaletteView] = useState<'document' | 'cmyk'>('document');
  const [hasModified, setHasModified] = useState<boolean>(false);
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Nested Select Color modal state
  const [selectColorMode, setSelectColorMode] = useState<'edit' | 'add' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cloned = swatches.map((s) => ({ ...s }));
    setDraftSwatches(cloned);
    const safeIdx = cloned.length > 0 ? Math.max(0, Math.min(initialSelectedIndex, cloned.length - 1)) : -1;
    setSelectedIndex(safeIdx);
    setPaletteView('document');
    setHasModified(false);
    setShowSortMenu(false);
    setShowHelp(false);
    setStatusMessage(null);
    setSelectColorMode(null);
  }, [isOpen, swatches, initialSelectedIndex]);

  if (!isOpen) return null;

  const isDocumentView = paletteView === 'document';
  const displayedSwatches: DocumentPaletteSwatch[] = isDocumentView
    ? draftSwatches
    : NURADRAW_PALETTE.filter((p) => p.hex !== 'transparent').map((p, idx) => ({
        id: `cmyk-${idx}`,
        name: p.name,
        hex: p.hex,
        treatAs: 'Process',
        cmyk: p.cmyk || formatCmykComponents(p.hex),
      }));

  const activeSwatch =
    isDocumentView && selectedIndex >= 0 && selectedIndex < draftSwatches.length
      ? draftSwatches[selectedIndex]
      : !isDocumentView && selectedIndex >= 0 && selectedIndex < displayedSwatches.length
      ? displayedSwatches[selectedIndex]
      : null;

  const flashMsg = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleSort = (criteria: SortCriteria) => {
    if (!isDocumentView || draftSwatches.length < 2) {
      setShowSortMenu(false);
      return;
    }
    const currentId = activeSwatch?.id;
    const next = [...draftSwatches];
    if (criteria === 'reverse') {
      next.reverse();
    } else if (criteria === 'name') {
      next.sort((a, b) => a.name.localeCompare(b.name));
    } else if (criteria === 'luminance') {
      next.sort((a, b) => getSwatchLuminance(a.hex) - getSwatchLuminance(b.hex));
    } else if (criteria === 'hue') {
      next.sort((a, b) => {
        const ha = rgbToHsb(...Object.values(hexToRgb(a.hex)) as [number, number, number]);
        const hb = rgbToHsb(...Object.values(hexToRgb(b.hex)) as [number, number, number]);
        if (ha.h !== hb.h) return ha.h - hb.h;
        if (ha.s !== hb.s) return ha.s - hb.s;
        return ha.b - hb.b;
      });
    } else if (criteria === 'rgb') {
      next.sort((a, b) => {
        const ra = hexToRgb(a.hex);
        const rb = hexToRgb(b.hex);
        return ra.r * 65536 + ra.g * 256 + ra.b - (rb.r * 65536 + rb.g * 256 + rb.b);
      });
    } else if (criteria === 'cmyk') {
      next.sort((a, b) => {
        const ra = hexToRgb(a.hex);
        const rb = hexToRgb(b.hex);
        const ca = rgbToCmyk(ra.r, ra.g, ra.b);
        const cb = rgbToCmyk(rb.r, rb.g, rb.b);
        return ca.c + ca.m + ca.y + ca.k - (cb.c + cb.m + cb.y + cb.k);
      });
    }
    setDraftSwatches(next);
    if (currentId) {
      const idx = next.findIndex((s) => s.id === currentId);
      setSelectedIndex(idx >= 0 ? idx : 0);
    }
    setHasModified(true);
    setShowSortMenu(false);
  };

  const handleDeleteColor = () => {
    if (!isDocumentView || selectedIndex < 0 || selectedIndex >= draftSwatches.length) return;
    const next = draftSwatches.filter((_, idx) => idx !== selectedIndex);
    setDraftSwatches(next);
    setSelectedIndex(next.length === 0 ? -1 : Math.min(selectedIndex, next.length - 1));
    setHasModified(true);
  };

  const handleResetPalette = () => {
    const cloned = swatches.map((s) => ({ ...s }));
    setDraftSwatches(cloned);
    setSelectedIndex(cloned.length > 0 ? Math.max(0, Math.min(initialSelectedIndex, cloned.length - 1)) : -1);
    setHasModified(false);
    flashMsg('Palette reset to document state');
  };

  const handleNewPalette = () => {
    setPaletteView('document');
    setDraftSwatches([]);
    setSelectedIndex(-1);
    setHasModified(true);
    flashMsg('Cleared Document Palette');
  };

  const handleSavePaletteFile = (asCustomName = false) => {
    const payload = {
      paletteName: `${documentName} Palette`,
      type: 'NuraDrawDocumentPalette',
      version: 1,
      colors: draftSwatches,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asCustomName ? `${documentName}-custom-palette.json` : `${documentName}-palette.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashMsg('Palette saved');
  };

  const handleOpenPaletteFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.colors) ? parsed.colors : [];
        const imported: DocumentPaletteSwatch[] = list
          .map((item: any, idx: number) => {
            const hex = normalizeHex(typeof item === 'string' ? item : item?.hex);
            if (!hex) return null;
            return {
              id: `imp-${Date.now()}-${idx}`,
              name: (typeof item === 'object' && item?.name) || resolveColorName(hex),
              hex,
              treatAs: item?.treatAs === 'Spot' ? 'Spot' : 'Process',
              cmyk: formatCmykComponents(hex),
            };
          })
          .filter(Boolean) as DocumentPaletteSwatch[];
        if (imported.length > 0) {
          setPaletteView('document');
          setDraftSwatches(imported);
          setSelectedIndex(0);
          setHasModified(true);
          flashMsg(`Loaded ${imported.length} colors`);
        }
      } catch {
        flashMsg('Invalid palette file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectColorConfirm = (res: SelectColorResult) => {
    const normHex = normalizeHex(res.hex) || '#000000';
    if (selectColorMode === 'edit' && isDocumentView && selectedIndex >= 0 && selectedIndex < draftSwatches.length) {
      setDraftSwatches((prev) =>
        prev.map((sw, idx) =>
          idx === selectedIndex
            ? {
                ...sw,
                hex: normHex,
                name: res.name,
                cmyk: res.cmyk,
              }
            : sw
        )
      );
      setHasModified(true);
    } else if (selectColorMode === 'add') {
      const existingIdx = draftSwatches.findIndex((s) => s.hex.toLowerCase() === normHex.toLowerCase());
      if (existingIdx >= 0) {
        setPaletteView('document');
        setSelectedIndex(existingIdx);
        flashMsg('Color already in Document Palette');
      } else {
        const nextItem: DocumentPaletteSwatch = {
          id: `doc-color-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: res.name,
          hex: normHex,
          treatAs: 'Process',
          cmyk: res.cmyk,
        };
        setPaletteView('document');
        setDraftSwatches((prev) => {
          const next = [...prev, nextItem];
          setSelectedIndex(next.length - 1);
          return next;
        });
        setHasModified(true);
      }
    }
    setSelectColorMode(null);
  };

  const updateSelectedSwatchField = (patch: Partial<DocumentPaletteSwatch>) => {
    if (!isDocumentView || selectedIndex < 0 || selectedIndex >= draftSwatches.length) return;
    setDraftSwatches((prev) =>
      prev.map((sw, idx) => (idx === selectedIndex ? { ...sw, ...patch } : sw))
    );
    setHasModified(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 select-none font-sans"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.cpl"
          onChange={handleOpenPaletteFile}
          className="hidden"
        />

        <div className="w-[434px] bg-[#f0f0f0] border border-[#707070] shadow-2xl text-[#1e1e1e] text-[12px]">
          {/* Classic Windows Dialog Title Bar */}
          <div className="h-[30px] bg-white px-3 flex items-center justify-between border-b border-[#dcdcdc]">
            <span className="text-[12px] text-[#111]">Palette Editor</span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 -mr-1.5 flex items-center justify-center text-[#333] hover:bg-[#e81123] hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dialog Content */}
          <div className="p-3 space-y-3">
            {/* Top Row: Palette Selector + 4 File Action Icons */}
            <div className="flex items-center gap-2">
              <select
                value={paletteView}
                onChange={(e) => {
                  const nextView = e.target.value as 'document' | 'cmyk';
                  setPaletteView(nextView);
                  setSelectedIndex(0);
                }}
                className="flex-1 h-[24px] px-1.5 bg-[#e1e1e1] border border-[#0078d7] text-[12px] text-[#111] outline-none"
              >
                <option value="document">Document Palette</option>
                <option value="cmyk">Default CMYK Palette</option>
              </select>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleNewPalette}
                  title="New Document Palette (Clear Colors)"
                  className="w-[24px] h-[24px] flex items-center justify-center rounded-xs hover:bg-[#dcdcdc] border border-transparent hover:border-[#adadad] text-[#2d6b2d]"
                >
                  <FilePlus2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Open Palette File..."
                  className="w-[24px] h-[24px] flex items-center justify-center rounded-xs hover:bg-[#dcdcdc] border border-transparent hover:border-[#adadad] text-[#333]"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!hasModified}
                  onClick={() => handleSavePaletteFile(false)}
                  title="Save Palette"
                  className={`w-[24px] h-[24px] flex items-center justify-center rounded-xs border border-transparent ${
                    hasModified
                      ? 'hover:bg-[#dcdcdc] hover:border-[#adadad] text-[#333]'
                      : 'text-[#a5a5a5] cursor-default'
                  }`}
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePaletteFile(true)}
                  title="Save Palette As..."
                  className="w-[24px] h-[24px] flex items-center justify-center rounded-xs hover:bg-[#dcdcdc] border border-transparent hover:border-[#adadad] text-[#2d6b2d]"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Row: Dark Swatch Grid + Action Buttons Column */}
            <div className="flex gap-2.5">
              {/* Swatch Box (#555555 dark gray matching reference) */}
              <div className="flex-1 h-[246px] bg-white border border-[#cccccc] flex flex-col">
                <div className="flex-1 bg-[#555555] p-[3px] overflow-y-auto content-start flex flex-wrap gap-[2px]">
                  {displayedSwatches.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-center text-[11px] text-zinc-300 px-4">
                      Document Palette is empty. Click &ldquo;Add Color&rdquo; or select any color in your document.
                    </div>
                  ) : (
                    displayedSwatches.map((sw, idx) => {
                      const isSel = idx === selectedIndex;
                      return (
                        <button
                          key={sw.id || `${sw.hex}-${idx}`}
                          type="button"
                          onClick={() => setSelectedIndex(idx)}
                          onDoubleClick={() => {
                            setSelectedIndex(idx);
                            if (isDocumentView) {
                              setSelectColorMode('edit');
                            } else {
                              setSelectColorMode('add');
                            }
                          }}
                          title={`${sw.name}\n${sw.cmyk || formatCmykComponents(sw.hex)}\nDouble-click to edit color`}
                          className={`w-[17px] h-[17px] shrink-0 relative ${
                            isSel
                              ? 'outline outline-1 outline-white border border-black z-10'
                              : 'border border-black/30 hover:border-white'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      );
                    })
                  )}
                </div>
                <div className="h-[18px] bg-white px-2 flex items-center justify-between text-[10px] text-[#666] border-t border-[#e0e0e0]">
                  <span>{displayedSwatches.length} color{displayedSwatches.length === 1 ? '' : 's'}</span>
                  {statusMessage && <span className="text-[#0078d7] font-medium">{statusMessage}</span>}
                </div>
              </div>

              {/* Right Side Action Buttons */}
              <div className="w-[108px] shrink-0 flex flex-col gap-1.5 relative">
                <button
                  type="button"
                  disabled={!isDocumentView || !activeSwatch}
                  onClick={() => setSelectColorMode('edit')}
                  className={`h-[24px] border text-[12px] ${
                    isDocumentView && activeSwatch
                      ? 'bg-[#e1e1e1] hover:bg-[#e5f1fb] border-[#adadad] hover:border-[#0078d7] text-[#111]'
                      : 'bg-[#ececec] border-[#d3d3d3] text-[#9b9b9b] cursor-default'
                  }`}
                >
                  <u>E</u>dit Color
                </button>
                <button
                  type="button"
                  onClick={() => setSelectColorMode('add')}
                  className="h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-[#111] text-[12px]"
                >
                  <u>A</u>dd Color
                </button>
                <button
                  type="button"
                  disabled={!isDocumentView || !activeSwatch}
                  onClick={handleDeleteColor}
                  className={`h-[24px] border text-[12px] ${
                    isDocumentView && activeSwatch
                      ? 'bg-[#e1e1e1] hover:bg-[#e5f1fb] border-[#adadad] hover:border-[#0078d7] text-[#111]'
                      : 'bg-[#ececec] border-[#d3d3d3] text-[#9b9b9b] cursor-default'
                  }`}
                >
                  <u>D</u>elete Color
                </button>

                {/* Sort Colors Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!isDocumentView || draftSwatches.length < 2}
                    onClick={() => setShowSortMenu((v) => !v)}
                    className={`w-full h-[24px] px-2 flex items-center justify-between text-[12px] border ${
                      isDocumentView && draftSwatches.length >= 2
                        ? 'bg-[#f0f0f0] hover:bg-[#e5f1fb] border-transparent hover:border-[#0078d7] text-[#111]'
                        : 'border-transparent text-[#9b9b9b] cursor-default'
                    }`}
                  >
                    <span>
                      <u>S</u>ort Colors
                    </span>
                    <span className="text-[9px]">▼</span>
                  </button>

                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-0.5 w-36 bg-white border border-[#999] shadow-lg py-1 z-30 text-[11px]">
                      {(
                        [
                          { id: 'hue', label: 'By Hue' },
                          { id: 'luminance', label: 'By Luminance' },
                          { id: 'name', label: 'By Name (A–Z)' },
                          { id: 'rgb', label: 'By RGB Value' },
                          { id: 'cmyk', label: 'By CMYK Density' },
                          { id: 'reverse', label: 'Reverse Order' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSort(opt.id)}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!hasModified}
                  onClick={handleResetPalette}
                  className={`h-[24px] border text-[12px] mt-0.5 ${
                    hasModified
                      ? 'bg-[#e1e1e1] hover:bg-[#e5f1fb] border-[#adadad] hover:border-[#0078d7] text-[#111]'
                      : 'bg-[#ececec] border-[#d3d3d3] text-[#a0a0a0] cursor-default'
                  }`}
                >
                  <u>R</u>eset Palette
                </button>
              </div>
            </div>

            {/* Selected Color Section */}
            <div className="pt-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[12px] text-[#111] shrink-0">Selected color</span>
                <div className="flex-1 h-px bg-[#dcdcdc]" />
              </div>

              <div className="bg-[#f8f8f8] border border-[#e2e2e2] px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-[74px] text-[12px] text-[#222] shrink-0">Name:</span>
                    <input
                      type="text"
                      disabled={!isDocumentView || !activeSwatch}
                      value={activeSwatch ? activeSwatch.name : ''}
                      onChange={(e) => updateSelectedSwatchField({ name: e.target.value })}
                      className="w-[110px] h-[22px] px-1.5 bg-white border border-[#b0b0b0] text-[12px] text-[#111] outline-none focus:border-[#0078d7] disabled:bg-[#f0f0f0] disabled:text-[#888]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[74px] text-[12px] text-[#222] shrink-0">Treat as:</span>
                    <select
                      disabled={!isDocumentView || !activeSwatch}
                      value={activeSwatch ? activeSwatch.treatAs : 'Process'}
                      onChange={(e) =>
                        updateSelectedSwatchField({ treatAs: e.target.value as 'Process' | 'Spot' })
                      }
                      className="w-[110px] h-[22px] px-1 bg-[#e1e1e1] border border-[#adadad] text-[12px] text-[#111] outline-none focus:border-[#0078d7] disabled:opacity-60"
                    >
                      <option value="Process">Process</option>
                      <option value="Spot">Spot</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[74px] text-[12px] text-[#222] shrink-0">Components:</span>
                    <span className="text-[12px] text-[#111] truncate">
                      {activeSwatch ? formatCmykComponents(activeSwatch.hex) : '—'}
                    </span>
                  </div>
                </div>

                {/* Large Color Preview Swatch */}
                <div
                  className="w-[82px] h-[52px] shrink-0 border border-[#8e8e8e]"
                  style={{
                    backgroundColor: activeSwatch ? activeSwatch.hex : '#e6e6e6',
                  }}
                />
              </div>

              {showHelp && (
                <div className="mt-2 px-2.5 py-1.5 bg-[#ffffe1] border border-[#cccc99] text-[11px] text-[#333] leading-snug">
                  Click a swatch to inspect its Name, Process/Spot mode, and CMYK values. Double-click any swatch (or click Edit Color) to open Select Color.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                title="Palette Editor Help"
                className="w-[24px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-[#111] text-[12px]"
              >
                ?
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSave(draftSwatches);
                    onClose();
                  }}
                  className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#0078d7] text-[#111] text-[12px]"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-[74px] h-[24px] bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-[#111] text-[12px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Select Color Modal */}
      <SelectColorModal
        isOpen={selectColorMode !== null}
        initialHex={
          selectColorMode === 'edit' && activeSwatch
            ? activeSwatch.hex
            : '#00a651'
        }
        initialName={selectColorMode === 'edit' && activeSwatch ? activeSwatch.name : undefined}
        documentSwatches={draftSwatches}
        onConfirm={handleSelectColorConfirm}
        onCancel={() => setSelectColorMode(null)}
      />
    </>
  );
};
