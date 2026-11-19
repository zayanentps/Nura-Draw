import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { X, Type, BarChart2, CaseSensitive, Code2, ListOrdered, Columns } from 'lucide-react';
import { ThemeMode } from '../types';
import { ensureObjectId } from '../utils/canvasHelpers';
import { isTextOnPathObject, reflowTextOnPathGroup } from '../utils/fitTextToPath';

export type TextDialogKind =
  | null
  | 'edit_text'
  | 'statistics'
  | 'change_case'
  | 'tabs'
  | 'columns'
  | 'bullets'
  | 'drop_cap'
  | 'encode';

interface TextToolsModalsProps {
  activeDialog: TextDialogKind;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  theme?: ThemeMode;
  onCanvasUpdated: () => void;
  onToast?: (msg: string) => void;
}

export const TextToolsModals: React.FC<TextToolsModalsProps> = ({
  activeDialog,
  onClose,
  canvas,
  selectedObject,
  theme = 'light',
  onCanvasUpdated,
  onToast,
}) => {
  const isDark = theme === 'dark';
  const isCurvedText = isTextOnPathObject(selectedObject);
  const isTextObj =
    isCurvedText ||
    (!!selectedObject &&
      (selectedObject.type === 'i-text' ||
        selectedObject.type === 'text' ||
        selectedObject.type === 'textbox'));

  const [editTextValue, setEditTextValue] = useState('');
  const [caseMode, setCaseMode] = useState<'sentence' | 'lower' | 'upper' | 'title' | 'toggle'>('title');
  const [tabSpaces, setTabSpaces] = useState(4);
  const [columnsCount, setColumnsCount] = useState(2);
  const [bulletType, setBulletType] = useState<'bullet' | 'number' | 'none'>('bullet');
  const [encodingMode, setEncodingMode] = useState<'utf8' | 'ascii' | 'unicode' | 'win1252'>('utf8');

  useEffect(() => {
    if (!activeDialog) return;
    if (isCurvedText && selectedObject) {
      setEditTextValue(String((selectedObject as any).textOnPathData?.text || ''));
    } else if (isTextObj) {
      setEditTextValue(String((selectedObject as any).text || ''));
    } else {
      setEditTextValue('Sample CorelDRAW Text');
    }
  }, [activeDialog, isTextObj, isCurvedText, selectedObject]);

  if (!activeDialog || !canvas) return null;

  const panelCls = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-zinc-900';
  const btnCls = isDark
    ? 'bg-[#5a5e66] border-[#6e737d] hover:bg-[#666a73] text-zinc-100'
    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e5f1fb] hover:border-[#0078d7] text-zinc-900';

  const getAllTextObjects = (): fabric.FabricObject[] =>
    canvas
      .getObjects()
      .filter((o) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox');

  const getObjectText = (o: fabric.FabricObject | null | undefined) =>
    isTextOnPathObject(o)
      ? String((o as any).textOnPathData?.text || '')
      : String((o as any)?.text || '');

  // Text Statistics computation
  const targetTexts = isTextObj
    ? [getObjectText(selectedObject)]
    : getAllTextObjects().map((o) => getObjectText(o));
  const combinedText = targetTexts.join('\n');
  const paragraphsCount = combinedText ? combinedText.split(/\n+/).filter(Boolean).length : 0;
  const linesCount = combinedText ? combinedText.split(/\r?\n/).length : 0;
  const wordsCount = combinedText.trim() ? combinedText.trim().split(/\s+/).length : 0;
  const charsWithSpaces = combinedText.length;
  const charsNoSpaces = combinedText.replace(/\s+/g, '').length;
  const fontsUsed = Array.from(
    new Set(
      (isTextObj ? [selectedObject] : getAllTextObjects()).map((o) =>
        isTextOnPathObject(o)
          ? String((o as any).textOnPathData?.fontFamily || 'Arial')
          : String((o as any).fontFamily || 'Arial')
      )
    )
  );

  const applyEditText = () => {
    if (isCurvedText && selectedObject) {
      reflowTextOnPathGroup(canvas, selectedObject as fabric.Group, { text: editTextValue });
    } else if (isTextObj && selectedObject) {
      (selectedObject as any).set('text', editTextValue);
      selectedObject.setCoords();
    } else {
      const txt = new fabric.IText(editTextValue || 'Sample Text', {
        left: 160,
        top: 160,
        fontFamily: 'Montserrat',
        fontSize: 32,
        fill: '#1e293b',
      });
      ensureObjectId(txt, 'Artistic Text');
      canvas.add(txt);
      canvas.setActiveObject(txt);
    }
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.('Text updated');
    onClose();
  };

  const applyChangeCase = () => {
    if (!isTextObj || !selectedObject) return;
    const raw = getObjectText(selectedObject);
    let next = raw;
    if (caseMode === 'upper') next = raw.toUpperCase();
    else if (caseMode === 'lower') next = raw.toLowerCase();
    else if (caseMode === 'title') {
      next = raw.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    } else if (caseMode === 'sentence') {
      next = raw
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
    } else if (caseMode === 'toggle') {
      next = Array.from(raw)
        .map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
        .join('');
    }
    if (isCurvedText) {
      reflowTextOnPathGroup(canvas, selectedObject as fabric.Group, { text: next });
    } else {
      (selectedObject as any).set('text', next);
      selectedObject.setCoords();
    }
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.(`Applied ${caseMode} case`);
    onClose();
  };

  const applyBullets = () => {
    if (!isTextObj || !selectedObject) return;
    const rawLines = String((selectedObject as any).text || '').split(/\r?\n/);
    const cleaned = rawLines.map((l) => l.replace(/^(\s*([•\-*]|\d+\.)\s+)/, ''));
    const next =
      bulletType === 'none'
        ? cleaned.join('\n')
        : bulletType === 'bullet'
        ? cleaned.map((l) => (l.trim() ? `• ${l}` : l)).join('\n')
        : cleaned.map((l, i) => (l.trim() ? `${i + 1}. ${l}` : l)).join('\n');
    (selectedObject as any).set('text', next);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.(
      bulletType === 'none' ? 'Removed bullets/numbering' : `Applied ${bulletType} list`
    );
    onClose();
  };

  const applyTabs = () => {
    if (!isTextObj || !selectedObject) return;
    const raw = String((selectedObject as any).text || '');
    const indent = ' '.repeat(tabSpaces);
    const next = raw
      .split(/\r?\n/)
      .map((line) => (line.startsWith(indent) ? line : `${indent}${line}`))
      .join('\n');
    (selectedObject as any).set('text', next);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.(`Applied ${tabSpaces}-space tab stop`);
    onClose();
  };

  const applyColumns = () => {
    if (!isTextObj || !selectedObject) return;
    const raw = String((selectedObject as any).text || '').trim();
    if (!raw) return;
    const words = raw.split(/\s+/);
    const perCol = Math.max(1, Math.ceil(words.length / columnsCount));
    const cols: string[] = [];
    for (let c = 0; c < columnsCount; c++) {
      cols.push(words.slice(c * perCol, (c + 1) * perCol).join(' '));
    }
    const baseLeft = selectedObject.left || 120;
    const baseTop = selectedObject.top || 120;
    const fontSize = (selectedObject as any).fontSize || 18;
    const fontFamily = (selectedObject as any).fontFamily || 'Montserrat';
    const fill = selectedObject.fill || '#1e293b';

    (selectedObject as any).set('text', cols[0] || '');
    selectedObject.set({ width: 180 });
    selectedObject.setCoords();

    for (let c = 1; c < cols.length; c++) {
      if (!cols[c]) continue;
      const box = new fabric.Textbox(cols[c], {
        left: baseLeft + c * 200,
        top: baseTop,
        width: 180,
        fontSize,
        fontFamily,
        fill,
      });
      ensureObjectId(box, `Column ${c + 1}`);
      canvas.add(box);
    }
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.(`Formatted text into ${columnsCount} columns`);
    onClose();
  };

  const applyDropCap = () => {
    if (!isTextObj || !selectedObject) return;
    const raw = String((selectedObject as any).text || '');
    if (!raw.trim()) return;
    const firstChar = raw.trim().charAt(0).toUpperCase();
    const rest = raw.trim().slice(1);
    (selectedObject as any).set('text', `${firstChar} ${rest}`);
    (selectedObject as any).setSelectionStyles?.(
      { fontSize: Math.round(((selectedObject as any).fontSize || 20) * 1.9), fontWeight: 'bold' },
      0,
      1
    );
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.('Applied Drop Cap to first character');
    onClose();
  };

  const applyEncoding = () => {
    if (!isTextObj || !selectedObject) return;
    const raw = String((selectedObject as any).text || '');
    let next = raw;
    if (encodingMode === 'ascii') {
      next = raw.normalize('NFKD').replace(/[^\x20-\x7E\r\n]/g, '');
    } else if (encodingMode === 'utf8') {
      next = raw.normalize('NFC');
    } else if (encodingMode === 'unicode') {
      next = raw.normalize('NFKC');
    }
    (selectedObject as any).set('text', next);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    onCanvasUpdated();
    onToast?.(`Applied ${encodingMode.toUpperCase()} text encoding`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 select-none text-[12px]"
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      <div className={`w-[420px] max-w-[94vw] border shadow-2xl ${panelCls}`}>
        <div
          className={`h-8 px-3 flex items-center justify-between border-b ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-white border-[#d6d6d6]'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {activeDialog === 'edit_text' && <><Type className="w-3.5 h-3.5 text-sky-500" /> Edit Text</>}
            {activeDialog === 'statistics' && <><BarChart2 className="w-3.5 h-3.5 text-emerald-500" /> Text Statistics</>}
            {activeDialog === 'change_case' && <><CaseSensitive className="w-3.5 h-3.5 text-blue-500" /> Change Case</>}
            {activeDialog === 'tabs' && <><Type className="w-3.5 h-3.5" /> Tabs</>}
            {activeDialog === 'columns' && <><Columns className="w-3.5 h-3.5" /> Columns</>}
            {activeDialog === 'bullets' && <><ListOrdered className="w-3.5 h-3.5" /> Bullets and Numbering</>}
            {activeDialog === 'drop_cap' && <><Type className="w-3.5 h-3.5" /> Drop Cap</>}
            {activeDialog === 'encode' && <><Code2 className="w-3.5 h-3.5" /> Text Encoding</>}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-red-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {activeDialog === 'edit_text' && (
            <>
              <div className="text-[11px] opacity-75">
                {isTextObj ? 'Edit selected text object content:' : 'Create a new Artistic Text object:'}
              </div>
              <textarea
                rows={6}
                value={editTextValue}
                onChange={(e) => setEditTextValue(e.target.value)}
                className={`w-full p-2 border outline-none text-[12px] font-sans ${inputCls}`}
              />
            </>
          )}

          {activeDialog === 'statistics' && (
            <div className="space-y-2">
              <div className="text-[11px] opacity-75">
                Scope: <strong>{isTextObj ? 'Selected Text Object' : 'All Text Objects in Document'}</strong>
              </div>
              <div className={`border p-3 space-y-1.5 ${isDark ? 'border-[#646870] bg-[#45484e]' : 'border-zinc-300 bg-white'}`}>
                <div className="flex justify-between"><span>Paragraphs:</span><strong>{paragraphsCount}</strong></div>
                <div className="flex justify-between"><span>Lines:</span><strong>{linesCount}</strong></div>
                <div className="flex justify-between"><span>Words:</span><strong>{wordsCount}</strong></div>
                <div className="flex justify-between"><span>Characters (with spaces):</span><strong>{charsWithSpaces}</strong></div>
                <div className="flex justify-between"><span>Characters (no spaces):</span><strong>{charsNoSpaces}</strong></div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <span>Fonts Used:</span>
                  <strong className="truncate max-w-[200px]">{fontsUsed.length ? fontsUsed.join(', ') : 'None'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeDialog === 'change_case' && (
            <div className="space-y-2">
              {(
                [
                  { id: 'sentence', label: 'Sentence case.' },
                  { id: 'lower', label: 'lowercase' },
                  { id: 'upper', label: 'UPPERCASE' },
                  { id: 'title', label: 'Title Case' },
                  { id: 'toggle', label: 'tOGGLE cASE' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="changeCaseMode"
                    checked={caseMode === opt.id}
                    onChange={() => setCaseMode(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {activeDialog === 'tabs' && (
            <div className="flex items-center justify-between gap-3">
              <label>Tab Indent Width (spaces):</label>
              <input
                type="number"
                min={2}
                max={16}
                value={tabSpaces}
                onChange={(e) => setTabSpaces(Math.max(2, Number(e.target.value) || 4))}
                className={`w-20 px-2 py-1 border ${inputCls}`}
              />
            </div>
          )}

          {activeDialog === 'columns' && (
            <div className="flex items-center justify-between gap-3">
              <label>Number of Columns:</label>
              <select
                value={columnsCount}
                onChange={(e) => setColumnsCount(Number(e.target.value))}
                className={`w-28 px-2 py-1 border ${inputCls}`}
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
              </select>
            </div>
          )}

          {activeDialog === 'bullets' && (
            <div className="space-y-2">
              {(
                [
                  { id: 'bullet', label: '• Bulleted List' },
                  { id: 'number', label: '1. Numbered List' },
                  { id: 'none', label: 'Remove Bullets / Numbering' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bulletMode"
                    checked={bulletType === opt.id}
                    onChange={() => setBulletType(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {activeDialog === 'drop_cap' && (
            <div className="text-[11.5px]">
              Enlarges and bolds the opening character of the selected paragraph text object.
            </div>
          )}

          {activeDialog === 'encode' && (
            <div className="space-y-2">
              <label className="block text-[11px] opacity-75">Select Character Encoding Normalization:</label>
              <select
                value={encodingMode}
                onChange={(e) => setEncodingMode(e.target.value as any)}
                className={`w-full px-2 py-1 border ${inputCls}`}
              >
                <option value="utf8">UTF-8 (Unicode NFC)</option>
                <option value="unicode">Unicode (NFKC Compatibility)</option>
                <option value="win1252">Windows-1252 (Western European)</option>
                <option value="ascii">US-ASCII (Strip Extended Characters)</option>
              </select>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-300 dark:border-zinc-700 flex justify-end gap-2">
          {activeDialog !== 'statistics' && (
            <button
              type="button"
              onClick={() => {
                if (activeDialog === 'edit_text') applyEditText();
                else if (activeDialog === 'change_case') applyChangeCase();
                else if (activeDialog === 'tabs') applyTabs();
                else if (activeDialog === 'columns') applyColumns();
                else if (activeDialog === 'bullets') applyBullets();
                else if (activeDialog === 'drop_cap') applyDropCap();
                else if (activeDialog === 'encode') applyEncoding();
              }}
              className={`px-4 py-1 border font-medium ${btnCls}`}
            >
              OK
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1 border ${btnCls}`}
          >
            {activeDialog === 'statistics' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
