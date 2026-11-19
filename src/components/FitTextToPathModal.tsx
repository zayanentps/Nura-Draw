import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { X } from 'lucide-react';
import { ThemeMode } from '../types';
import {
  FitTextToPathOptions,
  buildTextOnPathGroup,
  isTextOnPathObject,
  reflowTextOnPathGroup,
} from '../utils/fitTextToPath';

interface FitTextToPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  targetPathObj: fabric.FabricObject | null;
  targetGroupObj: fabric.Group | null;
  defaultText?: string;
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultFill?: string;
  theme?: ThemeMode;
  onApplied: (newGroup: fabric.Group) => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Montserrat',
  'Helvetica',
  'Verdana',
  'Times New Roman',
  'Georgia',
  'Courier New',
];

export const FitTextToPathModal: React.FC<FitTextToPathModalProps> = ({
  isOpen,
  onClose,
  canvas,
  targetPathObj,
  targetGroupObj,
  defaultText = 'The Union Territory of INDIA',
  defaultFontFamily = 'Arial',
  defaultFontSize = 28,
  defaultFill = '#111827',
  theme = 'light',
  onApplied,
}) => {
  const isDark = theme === 'dark';

  const [text, setText] = useState(defaultText);
  const [fontFamily, setFontFamily] = useState(defaultFontFamily);
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [fill, setFill] = useState(defaultFill === 'transparent' ? '#111827' : defaultFill);
  const [charSpacing, setCharSpacing] = useState(0);
  const [distance, setDistance] = useState(6);
  const [offsetRatio, setOffsetRatio] = useState(0.5);
  const [placement, setPlacement] = useState<'outside' | 'on_path' | 'inside'>('outside');
  const [orientation, setOrientation] = useState<'follow' | 'vertical'>('follow');
  const [flipSide, setFlipSide] = useState(false);

  const [liveGroup, setLiveGroup] = useState<fabric.Group | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLiveGroup(null);
      return;
    }

    if (targetGroupObj && isTextOnPathObject(targetGroupObj)) {
      const data = ((targetGroupObj as any).textOnPathData || {}) as Partial<FitTextToPathOptions>;
      setText(data.text || defaultText);
      setFontFamily(data.fontFamily || defaultFontFamily);
      setFontSize(Number(data.fontSize) || defaultFontSize);
      setFontWeight(data.fontWeight === 'bold' ? 'bold' : 'normal');
      setFontStyle(data.fontStyle === 'italic' ? 'italic' : 'normal');
      setFill(data.fill && data.fill !== 'transparent' ? data.fill : '#111827');
      setCharSpacing(Number(data.charSpacing) || 0);
      setDistance(data.distance !== undefined ? Number(data.distance) : 6);
      setOffsetRatio(data.offsetRatio !== undefined ? Number(data.offsetRatio) : 0.5);
      setPlacement(data.placement || 'outside');
      setOrientation(data.orientation || 'follow');
      setFlipSide(Boolean(data.flipSide));
      setLiveGroup(targetGroupObj);
    } else {
      setText(defaultText);
      setFontFamily(defaultFontFamily);
      setFontSize(defaultFontSize);
      setFontWeight('normal');
      setFontStyle('normal');
      setFill(defaultFill === 'transparent' ? '#111827' : defaultFill);
      setCharSpacing(0);
      setDistance(6);
      setOffsetRatio(0.5);
      setPlacement('outside');
      setOrientation('follow');
      setFlipSide(false);
      setLiveGroup(null);
    }
  }, [isOpen, targetGroupObj, defaultText, defaultFontFamily, defaultFontSize, defaultFill]);

  if (!isOpen || !canvas) return null;

  const currentOpts: FitTextToPathOptions = {
    text: text || 'Text Along Path',
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    fill,
    stroke: 'transparent',
    strokeWidth: 0,
    charSpacing,
    distance,
    offsetRatio,
    placement,
    orientation,
    flipSide,
    pathObjectId:
      (targetPathObj as any)?.id || (liveGroup as any)?.textOnPathData?.pathObjectId,
  };

  const handleApply = () => {
    let resultGroup: fabric.Group | null = null;
    if (liveGroup && canvas.getObjects().includes(liveGroup)) {
      resultGroup = reflowTextOnPathGroup(canvas, liveGroup, currentOpts);
    } else if (targetPathObj) {
      resultGroup = buildTextOnPathGroup(targetPathObj, currentOpts);
      if (resultGroup) {
        canvas.add(resultGroup);
        canvas.setActiveObject(resultGroup);
        canvas.requestRenderAll();
      }
    }

    if (resultGroup) {
      setLiveGroup(resultGroup);
      onApplied(resultGroup);
    }
    onClose();
  };

  const handleLivePreview = (patch: Partial<FitTextToPathOptions>) => {
    const merged: FitTextToPathOptions = { ...currentOpts, ...patch };
    if (liveGroup && canvas.getObjects().includes(liveGroup)) {
      const rebuilt = reflowTextOnPathGroup(canvas, liveGroup, merged);
      if (rebuilt) setLiveGroup(rebuilt);
    } else if (targetPathObj) {
      const created = buildTextOnPathGroup(targetPathObj, merged);
      if (created) {
        canvas.add(created);
        canvas.setActiveObject(created);
        canvas.requestRenderAll();
        setLiveGroup(created);
      }
    }
  };

  const panelCls = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f0f0f0] border-[#828790] text-[#1e1e1e]';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100'
    : 'bg-white border-[#adadad] text-[#111]';

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/30 select-none font-sans"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={`w-[380px] border shadow-2xl text-[12px] ${panelCls}`}>
        {/* Title Bar */}
        <div
          className={`h-[30px] px-3 flex items-center justify-between border-b ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-white border-[#dcdcdc]'
          }`}
        >
          <span className="font-medium">Fit Text to Path</span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 -mr-1.5 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-3">
          <div>
            <label className="block text-[11px] font-medium mb-1">Text on Path:</label>
            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleLivePreview({ text: e.target.value });
              }}
              className={`w-full h-[26px] px-2 border outline-none focus:border-[#0078d7] ${inputCls}`}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium mb-1">Font:</label>
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  handleLivePreview({ fontFamily: e.target.value });
                }}
                className={`w-full h-[24px] px-1.5 border outline-none ${inputCls}`}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Size (px):</label>
              <input
                type="number"
                min={6}
                max={200}
                value={fontSize}
                onChange={(e) => {
                  const val = Math.max(6, Number(e.target.value) || 12);
                  setFontSize(val);
                  handleLivePreview({ fontSize: val });
                }}
                className={`w-full h-[24px] px-1.5 border outline-none ${inputCls}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = fontWeight === 'bold' ? 'normal' : 'bold';
                  setFontWeight(next);
                  handleLivePreview({ fontWeight: next });
                }}
                className={`w-7 h-6 border font-bold text-xs ${
                  fontWeight === 'bold'
                    ? 'bg-[#0078d7] text-white border-[#0078d7]'
                    : inputCls
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = fontStyle === 'italic' ? 'normal' : 'italic';
                  setFontStyle(next);
                  handleLivePreview({ fontStyle: next });
                }}
                className={`w-7 h-6 border italic text-xs ${
                  fontStyle === 'italic'
                    ? 'bg-[#0078d7] text-white border-[#0078d7]'
                    : inputCls
                }`}
              >
                I
              </button>
              <input
                type="color"
                value={fill}
                onChange={(e) => {
                  setFill(e.target.value);
                  handleLivePreview({ fill: e.target.value });
                }}
                title="Text Fill Color"
                className="w-7 h-6 border border-[#adadad] bg-transparent cursor-pointer p-0"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Placement:</span>
              <select
                value={placement}
                onChange={(e) => {
                  const p = e.target.value as 'outside' | 'on_path' | 'inside';
                  setPlacement(p);
                  handleLivePreview({ placement: p });
                }}
                className={`h-[24px] px-1.5 border outline-none ${inputCls}`}
              >
                <option value="outside">Outside / Top</option>
                <option value="on_path">On Path</option>
                <option value="inside">Inside / Bottom</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-black/10 dark:border-white/10">
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>Distance from Path</span>
                <span className="font-mono">{distance} px</span>
              </div>
              <input
                type="range"
                min={-40}
                max={80}
                value={distance}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDistance(d);
                  handleLivePreview({ distance: d });
                }}
                className="w-full accent-[#0078d7] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>Position Along Path</span>
                <span className="font-mono">{Math.round(offsetRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(offsetRatio * 100)}
                onChange={(e) => {
                  const r = Number(e.target.value) / 100;
                  setOffsetRatio(r);
                  handleLivePreview({ offsetRatio: r });
                }}
                className="w-full accent-[#0078d7] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>Character Spacing</span>
                <span className="font-mono">{charSpacing}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={400}
                step={10}
                value={charSpacing}
                onChange={(e) => {
                  const cs = Number(e.target.value);
                  setCharSpacing(cs);
                  handleLivePreview({ charSpacing: cs });
                }}
                className="w-full accent-[#0078d7] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={flipSide}
                onChange={(e) => {
                  setFlipSide(e.target.checked);
                  handleLivePreview({ flipSide: e.target.checked });
                }}
                className="accent-[#0078d7]"
              />
              <span>Place on Bottom / Other Side</span>
            </label>

            <select
              value={orientation}
              onChange={(e) => {
                const o = e.target.value as 'follow' | 'vertical';
                setOrientation(o);
                handleLivePreview({ orientation: o });
              }}
              className={`h-[22px] px-1 border text-[11px] outline-none ${inputCls}`}
            >
              <option value="follow">Follow Curve</option>
              <option value="vertical">Vertical Letters</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3.5 pb-3 pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleApply}
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
  );
};
