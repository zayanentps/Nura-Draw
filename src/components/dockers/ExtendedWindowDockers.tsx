import React, { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { PageConfig, PropertyState, ThemeMode, ToolType } from '../../types';
import { POPULAR_FONTS, FONT_SIZES } from '../../utils/fonts';
import { ensureObjectId } from '../../utils/canvasHelpers';
import { LiveEmbossSection } from '../EmbossControlsPanel';
import { Plus, Trash2, Check, ExternalLink, Sparkles, Copy } from 'lucide-react';

export type ExtendedDockerId =
  | 'pages'
  | 'comments'
  | 'object_data'
  | 'object_styles'
  | 'symbols'
  | 'coordinates'
  | 'fit_to_path'
  | 'shape'
  | 'corners'
  | 'join_curves'
  | 'text'
  | 'font_sampler'
  | 'glyphs'
  | 'effects'
  | 'color'
  | 'palettes'
  | 'color_styles'
  | 'assets'
  | 'tray'
  | 'links';

interface ExtendedWindowDockersProps {
  dockerId: ExtendedDockerId;
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  pageConfig: PageConfig;
  pages?: PageConfig[];
  activePageIndex?: number;
  onSelectPage?: (idx: number) => void;
  onAddPage?: () => void;
  onSelectTool?: (tool: ToolType) => void;
  onConvertToCurves?: () => void;
  theme?: ThemeMode;
  onRefresh?: () => void;
}

const GLYPHS_LIST = [
  '©', '®', '™', '°', '±', '×', '÷', '≠', '≈', '≤', '≥', '∞',
  '€', '£', '¥', '₹', '¢', '§', '¶', '†', '‡', '•', '…', '‰',
  '→', '←', '↑', '↓', '↔', '⇒', '★', '☆', '✦', '♦', '♥', '♣',
  '♠', '✓', '✕', '✔', '⌘', '⌥', '⇧', '☎', '✉', '☀', '☁', '❄',
];

const PALETTE_GROUPS: Record<string, string[]> = {
  'Default CMYK': ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff', '#00aeef', '#ec008c', '#fff200', '#2e3192', '#00a651', '#ed1c24', '#f7941d', '#662d91'],
  'Vivid RGB': ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'],
  'Earth & Print': ['#451a03', '#78350f', '#92400e', '#b45309', '#d97706', '#7c2d12', '#9a3412', '#14532d', '#166534', '#1e3a8a', '#1e293b', '#475569', '#94a3b8', '#e2e8f0'],
};

export const ExtendedWindowDockers: React.FC<ExtendedWindowDockersProps> = ({
  dockerId,
  canvas,
  selectedObject,
  properties,
  onUpdateProperties,
  pageConfig,
  pages = [pageConfig],
  activePageIndex = 0,
  onSelectPage,
  onAddPage,
  onSelectTool,
  onConvertToCurves,
  theme = 'light',
  onRefresh,
}) => {
  const isDark = theme === 'dark';
  const cardCls = isDark
    ? 'bg-[#45484e] border-[#646870] text-zinc-100'
    : 'bg-white border-zinc-300 text-zinc-800';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100 focus:border-[#0078d7]'
    : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0078d7]';
  const btnCls = isDark
    ? 'bg-[#585c64] hover:bg-[#646972] border-[#6e737d] text-zinc-100'
    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800';

  // Comments state
  const [comments, setComments] = useState<{ id: string; text: string; page: number; resolved: boolean }[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Object Data state
  const [dataKey, setDataKey] = useState('SKU');
  const [dataVal, setDataVal] = useState('');
  const [objectDataMap, setObjectDataMap] = useState<Record<string, string>>({});

  // Object Styles state
  const [styles, setStyles] = useState<
    { id: string; name: string; fill: string; stroke: string; strokeWidth: number }[]
  >([
    { id: 's1', name: 'Primary Brand Fill', fill: '#0078d7', stroke: '#004e98', strokeWidth: 2 },
    { id: 's2', name: 'Emerald Badge', fill: '#00a651', stroke: '#065f46', strokeWidth: 1.5 },
    { id: 's3', name: 'Wireframe Outline', fill: 'transparent', stroke: '#111827', strokeWidth: 1.5 },
    { id: 's4', name: 'Warm Highlight', fill: '#f59e0b', stroke: '#92400e', strokeWidth: 2 },
  ]);

  // Symbols & Tray state
  const [symbols, setSymbols] = useState<{ id: string; name: string; json: any }[]>([]);
  const [trayItems, setTrayItems] = useState<{ id: string; name: string; json: any }[]>([]);

  // Fit Objects to Path state
  const [fitCount, setFitCount] = useState<number>(6);
  const [fitRadius, setFitRadius] = useState<number>(120);

  // Join Curves state
  const [gapTolerance, setGapTolerance] = useState<number>(5);

  // Font Sampler state
  const [sampleText, setSampleText] = useState<string>('NuraDraw Design 123');

  // Color & Palette state
  const [activePalette, setActivePalette] = useState<string>('Default CMYK');
  const [pickerColor, setPickerColor] = useState<string>(properties.fill || '#00a651');
  const [docColors, setDocColors] = useState<string[]>([]);
  const [replaceTargetColor, setReplaceTargetColor] = useState<string>('');
  const [replaceNewColor, setReplaceNewColor] = useState<string>('#0078d7');

  // Links state
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkTooltip, setLinkTooltip] = useState<string>('');

  useEffect(() => {
    if (selectedObject) {
      const existingData = (selectedObject as any).objectData;
      setObjectDataMap(existingData && typeof existingData === 'object' ? { ...existingData } : {});
      setLinkUrl((selectedObject as any).webLink || '');
      setLinkTooltip((selectedObject as any).rolloverTip || '');
    } else {
      setObjectDataMap({});
      setLinkUrl('');
      setLinkTooltip('');
    }
  }, [selectedObject]);

  useEffect(() => {
    if (dockerId === 'color_styles' && canvas) {
      const found = new Set<string>();
      canvas.getObjects().forEach((o) => {
        if (typeof o.fill === 'string' && o.fill !== 'transparent') found.add(o.fill.toLowerCase());
        if (typeof o.stroke === 'string' && o.stroke !== 'transparent') found.add(o.stroke.toLowerCase());
      });
      const arr = Array.from(found);
      setDocColors(arr);
      if (arr.length > 0 && !replaceTargetColor) {
        setReplaceTargetColor(arr[0]);
      }
    }
  }, [dockerId, canvas, selectedObject, replaceTargetColor]);

  // 1. Pages
  if (dockerId === 'pages') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Document Pages ({pages.length})</span>
          {onAddPage && (
            <button
              onClick={onAddPage}
              className="px-2 py-1 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {pages.map((pg, idx) => (
            <button
              key={`${pg.name}-${idx}`}
              onClick={() => onSelectPage?.(idx)}
              className={`w-full text-left p-2 rounded border flex items-center justify-between transition ${
                idx === activePageIndex
                  ? 'border-[#0078d7] bg-[#0078d7]/15 font-semibold'
                  : `${cardCls} hover:border-[#0078d7]/60`
              }`}
            >
              <div>
                <div>{pg.name || `Page ${idx + 1}`}</div>
                <div className="text-[10px] opacity-65">
                  {pg.preset} • {pg.orientation} ({pg.width}×{pg.height}px)
                </div>
              </div>
              {idx === activePageIndex && <Check className="w-3.5 h-3.5 text-[#0078d7]" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Comments
  if (dockerId === 'comments') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Review Comments (Page {activePageIndex + 1})</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commentInput.trim()) {
                setComments((p) => [
                  { id: `c-${Date.now()}`, text: commentInput.trim(), page: activePageIndex + 1, resolved: false },
                  ...p,
                ]);
                setCommentInput('');
              }
            }}
            placeholder="Add design note..."
            className={`flex-1 px-2 py-1 border rounded outline-none ${inputCls}`}
          />
          <button
            onClick={() => {
              if (!commentInput.trim()) return;
              setComments((p) => [
                { id: `c-${Date.now()}`, text: commentInput.trim(), page: activePageIndex + 1, resolved: false },
                ...p,
              ]);
              setCommentInput('');
            }}
            className="px-2.5 py-1 bg-[#0078d7] text-white rounded font-medium"
          >
            Add
          </button>
        </div>
        <div className="space-y-1.5">
          {comments.length === 0 ? (
            <div className="text-[11px] opacity-60 italic py-4 text-center">No comments added yet.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className={`p-2 rounded border flex items-start justify-between gap-2 ${cardCls}`}>
                <div className={c.resolved ? 'line-through opacity-55' : ''}>
                  <div className="text-[10px] opacity-65">Page {c.page}</div>
                  <div>{c.text}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))
                    }
                    className="p-1 hover:text-emerald-500"
                    title="Toggle Resolved"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                    className="p-1 hover:text-red-500"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 3. Object Data
  if (dockerId === 'object_data') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Object Data Manager</div>
        {!selectedObject ? (
          <div className="text-[11px] opacity-65 py-4 text-center">Select an object to view or edit metadata fields.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={dataKey}
                onChange={(e) => setDataKey(e.target.value)}
                placeholder="Field"
                className={`px-2 py-1 border rounded outline-none ${inputCls}`}
              />
              <input
                type="text"
                value={dataVal}
                onChange={(e) => setDataVal(e.target.value)}
                placeholder="Value"
                className={`px-2 py-1 border rounded outline-none ${inputCls}`}
              />
            </div>
            <button
              onClick={() => {
                if (!dataKey.trim()) return;
                const next = { ...objectDataMap, [dataKey.trim()]: dataVal };
                (selectedObject as any).objectData = next;
                setObjectDataMap(next);
                setDataVal('');
              }}
              className="w-full py-1.5 bg-[#0078d7] text-white rounded font-medium"
            >
              Save Field
            </button>
            <div className="space-y-1">
              {Object.entries(objectDataMap).map(([k, v]) => (
                <div key={k} className={`px-2 py-1.5 rounded border flex justify-between items-center ${cardCls}`}>
                  <span className="font-medium">{k}</span>
                  <span className="font-mono opacity-80">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // 4. Object Styles
  if (dockerId === 'object_styles') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Object Styles</span>
          <button
            disabled={!selectedObject}
            onClick={() => {
              if (!selectedObject) return;
              setStyles((prev) => [
                {
                  id: `s-${Date.now()}`,
                  name: `Style ${prev.length + 1}`,
                  fill: typeof selectedObject.fill === 'string' ? selectedObject.fill : '#00a651',
                  stroke: typeof selectedObject.stroke === 'string' ? selectedObject.stroke : '#000000',
                  strokeWidth: selectedObject.strokeWidth || 1,
                },
                ...prev,
              ]);
            }}
            className={`px-2 py-1 rounded border text-[11px] disabled:opacity-40 ${btnCls}`}
          >
            + From Selection
          </button>
        </div>
        <div className="space-y-1.5">
          {styles.map((st) => (
            <button
              key={st.id}
              disabled={!selectedObject}
              onClick={() => {
                onUpdateProperties({ fill: st.fill, stroke: st.stroke, strokeWidth: st.strokeWidth });
              }}
              className={`w-full p-2 rounded border flex items-center gap-2.5 text-left disabled:opacity-45 ${cardCls} hover:border-[#0078d7]`}
            >
              <span
                className="w-5 h-5 rounded-xs shrink-0"
                style={{
                  backgroundColor: st.fill === 'transparent' ? 'transparent' : st.fill,
                  border: `${Math.max(1, st.strokeWidth)}px solid ${st.stroke}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{st.name}</div>
                <div className="text-[10px] opacity-65">Fill: {st.fill} • Stroke: {st.strokeWidth}px</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 5. Symbols
  if (dockerId === 'symbols') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Symbols Library</div>
        <button
          disabled={!selectedObject}
          onClick={() => {
            if (!selectedObject) return;
            const json = selectedObject.toObject();
            setSymbols((p) => [
              { id: `sym-${Date.now()}`, name: (selectedObject as any).name || `Symbol ${p.length + 1}`, json },
              ...p,
            ]);
          }}
          className="w-full py-1.5 bg-[#0078d7] hover:bg-[#0063b1] disabled:opacity-40 text-white rounded font-medium"
        >
          Create Symbol from Selection
        </button>
        {symbols.length === 0 ? (
          <div className="text-[11px] opacity-60 italic py-4 text-center">Select an object and click Create Symbol.</div>
        ) : (
          <div className="space-y-1.5">
            {symbols.map((sym) => (
              <div key={sym.id} className={`p-2 rounded border flex items-center justify-between ${cardCls}`}>
                <span className="truncate font-medium">{sym.name}</span>
                <button
                  onClick={async () => {
                    if (!canvas) return;
                    const objs = await fabric.util.enlivenObjects([sym.json]);
                    const obj = objs[0] as fabric.FabricObject;
                    if (obj) {
                      obj.set({ left: (obj.left || 80) + 25, top: (obj.top || 80) + 25 });
                      ensureObjectId(obj, sym.name);
                      canvas.add(obj);
                      canvas.setActiveObject(obj);
                      canvas.requestRenderAll();
                      onRefresh?.();
                    }
                  }}
                  className="px-2 py-0.5 bg-[#0078d7] text-white rounded text-[11px]"
                >
                  Insert
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 6. Coordinates
  if (dockerId === 'coordinates') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Object Coordinates</div>
        <div className={`p-2 rounded border space-y-2 ${cardCls}`}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] opacity-70 mb-0.5">X (px)</label>
              <input
                type="number"
                disabled={!selectedObject}
                value={Math.round(properties.x)}
                onChange={(e) => onUpdateProperties({ x: Number(e.target.value) || 0 })}
                className={`w-full px-2 py-1 border rounded font-mono ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-70 mb-0.5">Y (px)</label>
              <input
                type="number"
                disabled={!selectedObject}
                value={Math.round(properties.y)}
                onChange={(e) => onUpdateProperties({ y: Number(e.target.value) || 0 })}
                className={`w-full px-2 py-1 border rounded font-mono ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-70 mb-0.5">Width (px)</label>
              <input
                type="number"
                disabled={!selectedObject}
                value={Math.round(properties.width)}
                onChange={(e) => onUpdateProperties({ width: Math.max(1, Number(e.target.value) || 1) })}
                className={`w-full px-2 py-1 border rounded font-mono ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-70 mb-0.5">Height (px)</label>
              <input
                type="number"
                disabled={!selectedObject}
                value={Math.round(properties.height)}
                onChange={(e) => onUpdateProperties({ height: Math.max(1, Number(e.target.value) || 1) })}
                className={`w-full px-2 py-1 border rounded font-mono ${inputCls}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] opacity-70 mb-0.5">Rotation Angle (°)</label>
            <input
              type="number"
              disabled={!selectedObject}
              value={Math.round(properties.angle)}
              onChange={(e) => onUpdateProperties({ angle: Number(e.target.value) || 0 })}
              className={`w-full px-2 py-1 border rounded font-mono ${inputCls}`}
            />
          </div>
        </div>
      </div>
    );
  }

  // 7. Fit Objects to Path
  if (dockerId === 'fit_to_path') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Fit Objects to Path</div>
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] opacity-75 mb-1">Copies along Circular Path</label>
            <input
              type="number"
              min={2}
              max={36}
              value={fitCount}
              onChange={(e) => setFitCount(Number(e.target.value) || 6)}
              className={`w-full px-2 py-1 border rounded ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-[11px] opacity-75 mb-1">Path Radius (px)</label>
            <input
              type="number"
              min={20}
              max={600}
              value={fitRadius}
              onChange={(e) => setFitRadius(Number(e.target.value) || 120)}
              className={`w-full px-2 py-1 border rounded ${inputCls}`}
            />
          </div>
          <button
            disabled={!selectedObject || !canvas}
            onClick={async () => {
              if (!selectedObject || !canvas) return;
              const cx = pageConfig.width / 2;
              const cy = pageConfig.height / 2;
              for (let i = 0; i < fitCount; i++) {
                const theta = (2 * Math.PI * i) / fitCount;
                const clone = await selectedObject.clone();
                clone.set({
                  left: cx + Math.cos(theta) * fitRadius,
                  top: cy + Math.sin(theta) * fitRadius,
                  angle: (theta * 180) / Math.PI + 90,
                });
                ensureObjectId(clone);
                canvas.add(clone);
              }
              canvas.requestRenderAll();
              onRefresh?.();
            }}
            className="w-full py-1.5 bg-[#0078d7] disabled:opacity-40 text-white rounded font-medium"
          >
            Apply to Path
          </button>
        </div>
      </div>
    );
  }

  // 8. Shape
  if (dockerId === 'shape') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Shaping &amp; Curve Operations</div>
        <div className="space-y-1.5">
          <button
            disabled={!selectedObject}
            onClick={() => onConvertToCurves?.()}
            className={`w-full py-1.5 px-2.5 border rounded text-left disabled:opacity-40 ${btnCls}`}
          >
            Convert to Curves (Ctrl+Q)
          </button>
          <button
            onClick={() => onSelectTool?.('shape')}
            className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}
          >
            Activate Shape Node Tool (F10)
          </button>
          <button
            onClick={() => onSelectTool?.('smooth')}
            className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}
          >
            Activate Smooth Tool
          </button>
        </div>
      </div>
    );
  }

  // 9. Corners
  if (dockerId === 'corners') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Corners (Fillet / Scallop / Chamfer)</div>
        <div>
          <div className="flex justify-between mb-1">
            <span>Corner Radius</span>
            <span className="font-mono">{Math.round(properties.rx || 0)} px</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            disabled={!selectedObject}
            value={properties.rx || 0}
            onChange={(e) => {
              const r = Number(e.target.value);
              onUpdateProperties({ rx: r, ry: r });
            }}
            className="w-full accent-[#0078d7]"
          />
        </div>
      </div>
    );
  }

  // 10. Join Curves
  if (dockerId === 'join_curves') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Join Curves</div>
        <div>
          <label className="block text-[11px] opacity-75 mb-1">Gap Tolerance (px)</label>
          <input
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={gapTolerance}
            onChange={(e) => setGapTolerance(Number(e.target.value) || 5)}
            className={`w-full px-2 py-1 border rounded ${inputCls}`}
          />
        </div>
        <button
          onClick={() => onSelectTool?.('shape')}
          className="w-full py-1.5 bg-[#0078d7] text-white rounded font-medium"
        >
          Open Shape Tool to Join Nodes
        </button>
      </div>
    );
  }

  // 11. Text
  if (dockerId === 'text') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Text Properties</div>
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] opacity-70 mb-0.5">Font Family</label>
            <select
              value={properties.fontFamily}
              onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
              className={`w-full px-2 py-1 border rounded ${inputCls}`}
            >
              {POPULAR_FONTS.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] opacity-70 mb-0.5">Font Size</label>
            <select
              value={properties.fontSize}
              onChange={(e) => onUpdateProperties({ fontSize: Number(e.target.value) })}
              className={`w-full px-2 py-1 border rounded ${inputCls}`}
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s} pt</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => onUpdateProperties({ fontWeight: properties.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`flex-1 py-1 border rounded font-bold ${properties.fontWeight === 'bold' ? 'bg-[#0078d7] text-white border-[#0078d7]' : btnCls}`}
            >
              B
            </button>
            <button
              onClick={() => onUpdateProperties({ fontStyle: properties.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 py-1 border rounded italic ${properties.fontStyle === 'italic' ? 'bg-[#0078d7] text-white border-[#0078d7]' : btnCls}`}
            >
              I
            </button>
            <button
              onClick={() => onUpdateProperties({ underline: !properties.underline })}
              className={`flex-1 py-1 border rounded underline ${properties.underline ? 'bg-[#0078d7] text-white border-[#0078d7]' : btnCls}`}
            >
              U
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 12. Font Sampler
  if (dockerId === 'font_sampler') {
    return (
      <div className="p-3 space-y-2.5 text-xs">
        <div className="font-semibold">Font Sampler</div>
        <input
          type="text"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          placeholder="Type preview text..."
          className={`w-full px-2 py-1 border rounded outline-none ${inputCls}`}
        />
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5">
          {POPULAR_FONTS.map((f) => (
            <button
              key={f.name}
              onClick={() => onUpdateProperties({ fontFamily: f.name })}
              className={`w-full text-left p-2 rounded border transition hover:border-[#0078d7] ${cardCls}`}
            >
              <div className="text-[10px] opacity-60">{f.name} ({f.category})</div>
              <div className="text-sm truncate" style={{ fontFamily: `${f.name}, ${f.fallback}` }}>{sampleText || 'Sample Text'}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 13. Glyphs
  if (dockerId === 'glyphs') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Glyphs (Click to Insert)</div>
        <div className="grid grid-cols-6 gap-1">
          {GLYPHS_LIST.map((g) => (
            <button
              key={g}
              onClick={() => {
                if (!canvas) return;
                if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) {
                  const cur = (selectedObject as any).text || '';
                  (selectedObject as any).set('text', `${cur}${g}`);
                  canvas.requestRenderAll();
                } else {
                  const tb = new fabric.IText(g, {
                    left: pageConfig.width / 2 - 16,
                    top: pageConfig.height / 2 - 16,
                    fontSize: 36,
                    fill: properties.fill || '#111827',
                  });
                  ensureObjectId(tb, `Glyph ${g}`);
                  canvas.add(tb);
                  canvas.setActiveObject(tb);
                  canvas.requestRenderAll();
                }
                onRefresh?.();
              }}
              className={`h-8 rounded border flex items-center justify-center text-sm hover:bg-[#0078d7] hover:text-white ${btnCls}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 14. Effects
  if (dockerId === 'effects') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Live Effects</div>
        <div>
          <div className="flex justify-between mb-1">
            <span>Object Opacity</span>
            <span className="font-mono">{Math.round((properties.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            disabled={!selectedObject}
            value={properties.opacity ?? 1}
            onChange={(e) => onUpdateProperties({ opacity: Number(e.target.value) })}
            className="w-full accent-[#0078d7]"
          />
        </div>
        <div className="space-y-1.5">
          <button onClick={() => onSelectTool?.('shadow')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Shadow Tool
          </button>
          <button onClick={() => onSelectTool?.('contour')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Contour Tool
          </button>
          <button onClick={() => onSelectTool?.('blend')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Blend Tool
          </button>
          <button onClick={() => onSelectTool?.('distort')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Distort Tool
          </button>
          <button onClick={() => onSelectTool?.('envelope')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Envelope Tool
          </button>
          <button onClick={() => onSelectTool?.('extrude')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Extrude Tool
          </button>
          <button onClick={() => onSelectTool?.('block_shadow')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Block Shadow Tool
          </button>
          <button onClick={() => onSelectTool?.('transparency')} className={`w-full py-1.5 px-2.5 border rounded text-left ${btnCls}`}>
            Transparency Tool
          </button>
        </div>

        {/* Emboss Parameters */}
        <div className={`pt-2.5 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
          <LiveEmbossSection
            canvas={canvas}
            selectedObject={selectedObject}
            theme={theme}
            defaultExpanded={true}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    );
  }

  // 15. Color
  if (dockerId === 'color') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Color Mixer</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pickerColor}
            onChange={(e) => setPickerColor(e.target.value)}
            className="w-12 h-10 bg-transparent border-0 cursor-pointer"
          />
          <input
            type="text"
            value={pickerColor}
            onChange={(e) => setPickerColor(e.target.value)}
            className={`flex-1 px-2 py-1.5 border rounded font-mono ${inputCls}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onUpdateProperties({ fill: pickerColor })}
            className="py-1.5 bg-[#0078d7] text-white rounded font-medium"
          >
            Apply Fill
          </button>
          <button
            onClick={() => onUpdateProperties({ stroke: pickerColor })}
            className={`py-1.5 border rounded font-medium ${btnCls}`}
          >
            Apply Outline
          </button>
        </div>
      </div>
    );
  }

  // 16. Palettes
  if (dockerId === 'palettes') {
    const swatches = PALETTE_GROUPS[activePalette] || PALETTE_GROUPS['Default CMYK'];
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Color Palettes</div>
        <select
          value={activePalette}
          onChange={(e) => setActivePalette(e.target.value)}
          className={`w-full px-2 py-1 border rounded ${inputCls}`}
        >
          {Object.keys(PALETTE_GROUPS).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <div className="grid grid-cols-7 gap-1.5">
          {swatches.map((hex) => (
            <button
              key={hex}
              onClick={() => onUpdateProperties({ fill: hex })}
              onContextMenu={(e) => {
                e.preventDefault();
                onUpdateProperties({ stroke: hex });
              }}
              title={`${hex} (Left-click: Fill, Right-click: Outline)`}
              className="w-7 h-7 rounded-xs border border-zinc-500/40 shadow-xs"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 17. Color Styles
  if (dockerId === 'color_styles') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Document Color Styles</div>
        {docColors.length === 0 ? (
          <div className="text-[11px] opacity-60 italic py-4 text-center">Draw objects to inspect document colors.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {docColors.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setReplaceTargetColor(hex)}
                  className={`w-7 h-7 rounded border-2 ${replaceTargetColor === hex ? 'border-[#0078d7] scale-105' : 'border-zinc-500/40'}`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={replaceNewColor} onChange={(e) => setReplaceNewColor(e.target.value)} className="w-8 h-7 cursor-pointer" />
              <button
                onClick={() => {
                  if (!canvas || !replaceTargetColor) return;
                  canvas.getObjects().forEach((o) => {
                    if (typeof o.fill === 'string' && o.fill.toLowerCase() === replaceTargetColor.toLowerCase()) {
                      o.set('fill', replaceNewColor);
                    }
                    if (typeof o.stroke === 'string' && o.stroke.toLowerCase() === replaceTargetColor.toLowerCase()) {
                      o.set('stroke', replaceNewColor);
                    }
                  });
                  canvas.requestRenderAll();
                  setReplaceTargetColor(replaceNewColor.toLowerCase());
                  onRefresh?.();
                }}
                className="flex-1 py-1.5 bg-[#0078d7] text-white rounded font-medium"
              >
                Update Color Style
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // 18. Assets
  if (dockerId === 'assets') {
    const quickAssets = [
      { label: 'Badge Circle', create: () => new fabric.Circle({ radius: 45, fill: '#0078d7', stroke: '#004e98', strokeWidth: 2 }) },
      { label: 'Banner Pill', create: () => new fabric.Rect({ width: 180, height: 54, rx: 27, ry: 27, fill: '#00a651', stroke: '#065f46', strokeWidth: 2 }) },
      { label: 'Accent Frame', create: () => new fabric.Rect({ width: 160, height: 110, fill: 'transparent', stroke: '#111827', strokeWidth: 3 }) },
      { label: 'Arrow Tag', create: () => new fabric.Polygon([{ x: 0, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 0 }, { x: 120, y: 35 }, { x: 80, y: 70 }, { x: 80, y: 50 }, { x: 0, y: 50 }], { fill: '#f59e0b', stroke: '#92400e', strokeWidth: 1.5 }) },
    ];
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0078d7]" /> Vector Assets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickAssets.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                if (!canvas) return;
                const obj = a.create();
                obj.set({ left: pageConfig.width / 2 - 60, top: pageConfig.height / 2 - 40 });
                ensureObjectId(obj, a.label);
                canvas.add(obj);
                canvas.setActiveObject(obj);
                canvas.requestRenderAll();
                onRefresh?.();
              }}
              className={`p-2.5 rounded border text-center hover:border-[#0078d7] font-medium ${cardCls}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 19. Tray
  if (dockerId === 'tray') {
    return (
      <div className="p-3 space-y-3 text-xs">
        <div className="font-semibold">Content Tray</div>
        <button
          disabled={!selectedObject}
          onClick={() => {
            if (!selectedObject) return;
            setTrayItems((p) => [
              { id: `tr-${Date.now()}`, name: (selectedObject as any).name || selectedObject.type || 'Item', json: selectedObject.toObject() },
              ...p,
            ]);
          }}
          className="w-full py-1.5 bg-[#0078d7] disabled:opacity-40 text-white rounded font-medium flex items-center justify-center gap-1.5"
        >
          <Copy className="w-3.5 h-3.5" /> Add Selection to Tray
        </button>
        {trayItems.length === 0 ? (
          <div className="text-[11px] opacity-60 italic py-4 text-center">Tray is empty.</div>
        ) : (
          <div className="space-y-1.5">
            {trayItems.map((it) => (
              <div key={it.id} className={`p-2 rounded border flex items-center justify-between ${cardCls}`}>
                <span className="truncate">{it.name}</span>
                <button
                  onClick={async () => {
                    if (!canvas) return;
                    const objs = await fabric.util.enlivenObjects([it.json]);
                    const obj = objs[0] as fabric.FabricObject;
                    if (obj) {
                      obj.set({ left: (obj.left || 60) + 20, top: (obj.top || 60) + 20 });
                      ensureObjectId(obj, it.name);
                      canvas.add(obj);
                      canvas.setActiveObject(obj);
                      canvas.requestRenderAll();
                      onRefresh?.();
                    }
                  }}
                  className="px-2 py-0.5 bg-[#0078d7] text-white rounded text-[11px]"
                >
                  Place
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 20. Links and Rollovers
  return (
    <div className="p-3 space-y-3 text-xs">
      <div className="font-semibold flex items-center gap-1.5">
        <ExternalLink className="w-3.5 h-3.5 text-[#0078d7]" /> Links &amp; Rollovers
      </div>
      {!selectedObject ? (
        <div className="text-[11px] opacity-65 py-4 text-center">Select an object to assign a hyperlink or rollover label.</div>
      ) : (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] opacity-70 mb-0.5">Hyperlink URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className={`w-full px-2 py-1 border rounded outline-none ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-[10px] opacity-70 mb-0.5">Rollover Tooltip</label>
            <input
              type="text"
              value={linkTooltip}
              onChange={(e) => setLinkTooltip(e.target.value)}
              placeholder="Hover description..."
              className={`w-full px-2 py-1 border rounded outline-none ${inputCls}`}
            />
          </div>
          <button
            onClick={() => {
              (selectedObject as any).webLink = linkUrl;
              (selectedObject as any).rolloverTip = linkTooltip;
              onRefresh?.();
            }}
            className="w-full py-1.5 bg-[#0078d7] text-white rounded font-medium"
          >
            Assign Link
          </button>
        </div>
      )}
    </div>
  );
};
