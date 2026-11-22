import React from 'react';
import {
  Sliders,
  Droplet,
  Sun,
  Layers,
  Sparkles,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from 'lucide-react';
import * as fabric from 'fabric';
import { PropertyState, ThemeMode } from '../../types';
import { POPULAR_FONTS, FONT_SIZES, FONT_WEIGHTS } from '../../utils/fonts';

interface PropertiesDockerProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  theme?: ThemeMode;
}

export const PropertiesDocker: React.FC<PropertiesDockerProps> = ({
  canvas,
  selectedObject,
  properties,
  onUpdateProperties,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  if (!selectedObject) {
    return (
      <div className={`p-6 text-center italic text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Select any object on the canvas to edit its vector properties, stroke styles, gradients, and shadows.
      </div>
    );
  }

  const applyGradient = (startColor: string, endColor: string) => {
    if (!selectedObject || !canvas) return;
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: 0,
        y1: 0,
        x2: selectedObject.width || 100,
        y2: selectedObject.height || 100,
      },
      colorStops: [
        { offset: 0, color: startColor },
        { offset: 1, color: endColor },
      ],
    });
    selectedObject.set('fill', gradient);
    canvas.renderAll();
  };

  const applyShadow = (enabled: boolean) => {
    if (!selectedObject || !canvas) return;
    if (enabled) {
      selectedObject.set(
        'shadow',
        new fabric.Shadow({
          color: properties.shadowColor || 'rgba(0,0,0,0.5)',
          blur: properties.shadowBlur || 15,
          offsetX: properties.shadowOffsetX || 8,
          offsetY: properties.shadowOffsetY || 8,
        })
      );
    } else {
      selectedObject.set('shadow', null);
    }
    canvas.renderAll();
  };

  const isText = selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text');

  const handleTransformCase = (mode: 'upper' | 'lower' | 'title') => {
    if (!selectedObject) return;
    const currentText = (selectedObject as any).text;
    if (typeof currentText !== 'string') return;
    let newText = currentText;
    if (mode === 'upper') newText = currentText.toUpperCase();
    else if (mode === 'lower') newText = currentText.toLowerCase();
    else if (mode === 'title') {
      newText = currentText.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }
    (selectedObject as any).set('text', newText);
    if (canvas) {
      canvas.renderAll();
    }
  };

  const inputClass = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-white'
    : 'bg-white border-zinc-300 text-zinc-900 shadow-xs';

  return (
    <div className={`p-3 select-none text-xs space-y-4 overflow-y-auto max-h-full transition-colors ${
      isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f5f5f7] text-zinc-800'
    }`}>
      <div className={`font-semibold pb-2 border-b flex items-center gap-1.5 ${
        isDark ? 'border-[#646870] text-zinc-100' : 'border-zinc-300 text-zinc-800'
      }`}>
        <Sliders className="w-4 h-4 text-emerald-500" />
        <span>Object Properties</span>
      </div>

      {/* Dedicated Typography & Text Formatting Section if Text Selected */}
      {isText && (
        <div className={`p-2.5 rounded-sm border ${isDark ? 'bg-[#45484e] border-[#646870]' : 'bg-white border-zinc-300 shadow-2xs'} space-y-3`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-700">
            <span className="font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Type className="w-4 h-4" />
              <span>Typography</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTransformCase('upper')}
                title="UPPERCASE"
                className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                AA
              </button>
              <button
                onClick={() => handleTransformCase('lower')}
                title="lowercase"
                className="px-1.5 py-0.5 rounded text-[10px] font-normal border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                aa
              </button>
              <button
                onClick={() => handleTransformCase('title')}
                title="Title Case"
                className="px-1.5 py-0.5 rounded text-[10px] capitalize border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Aa
              </button>
            </div>
          </div>

          {/* Text Content Field */}
          <div>
            <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Text Content
            </label>
            <textarea
              rows={2}
              value={(selectedObject as any).text || ''}
              onChange={(e) => {
                const val = e.target.value;
                (selectedObject as any).set('text', val);
                if (canvas) canvas.renderAll();
              }}
              className={`w-full rounded px-2 py-1 text-xs border ${inputClass} resize-none outline-none focus:border-blue-500`}
            />
          </div>

          {/* Font Family */}
          <div>
            <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Font Family
            </label>
            <select
              value={properties.fontFamily || 'Montserrat'}
              onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
              className={`w-full rounded px-2 py-1 text-xs border ${inputClass} outline-none cursor-pointer`}
              style={{ fontFamily: properties.fontFamily || 'Montserrat' }}
            >
              <optgroup label="Sans-Serif">
                {POPULAR_FONTS.filter((f) => f.category === 'Sans-Serif').map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Serif">
                {POPULAR_FONTS.filter((f) => f.category === 'Serif').map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Display">
                {POPULAR_FONTS.filter((f) => f.category === 'Display').map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Script">
                {POPULAR_FONTS.filter((f) => f.category === 'Script').map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Monospace">
                {POPULAR_FONTS.filter((f) => f.category === 'Monospace').map((f) => (
                  <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Size & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Font Size
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="6"
                  max="300"
                  value={properties.fontSize || 24}
                  onChange={(e) => onUpdateProperties({ fontSize: Number(e.target.value) })}
                  className={`w-full rounded px-2 py-1 text-xs border ${inputClass} font-mono outline-none`}
                />
                <span className="text-[10px] text-zinc-500">pt</span>
              </div>
            </div>

            <div>
              <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Weight
              </label>
              <select
                value={properties.fontWeight || 'normal'}
                onChange={(e) => onUpdateProperties({ fontWeight: e.target.value })}
                className={`w-full rounded px-1.5 py-1 text-xs border ${inputClass} outline-none cursor-pointer`}
              >
                {FONT_WEIGHTS.map((fw) => (
                  <option key={fw.value} value={fw.value}>
                    {fw.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Font Styles & Alignment */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {/* Styles */}
            <div className="flex items-center rounded border border-zinc-300 dark:border-zinc-600 p-0.5 gap-0.5">
              <button
                onClick={() =>
                  onUpdateProperties({
                    fontWeight: properties.fontWeight === 'bold' || properties.fontWeight === '700' ? 'normal' : 'bold',
                  })
                }
                title="Bold (Ctrl+B)"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.fontWeight === 'bold' || properties.fontWeight === '700'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateProperties({
                    fontStyle: properties.fontStyle === 'italic' ? 'normal' : 'italic',
                  })
                }
                title="Italic"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.fontStyle === 'italic'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ underline: !properties.underline })}
                title="Underline"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.underline
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ linethrough: !properties.linethrough })}
                title="Strikethrough"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.linethrough
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center rounded border border-zinc-300 dark:border-zinc-600 p-0.5 gap-0.5">
              <button
                onClick={() => onUpdateProperties({ textAlign: 'left' })}
                title="Align Left"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.textAlign === 'left' || !properties.textAlign
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'center' })}
                title="Align Center"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.textAlign === 'center'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'right' })}
                title="Align Right"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.textAlign === 'right'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'justify' })}
                title="Justify"
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition ${
                  properties.textAlign === 'justify'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Character Spacing & Line Height */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-700">
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Tracking (Spacing)
              </label>
              <input
                type="number"
                step="10"
                min="-200"
                max="1000"
                value={properties.charSpacing || 0}
                onChange={(e) => onUpdateProperties({ charSpacing: Number(e.target.value) })}
                className={`w-full rounded px-2 py-1 text-xs border ${inputClass} font-mono outline-none`}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Leading (Line Height)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="4"
                value={properties.lineHeight || 1.16}
                onChange={(e) => onUpdateProperties({ lineHeight: Number(e.target.value) })}
                className={`w-full rounded px-2 py-1 text-xs border ${inputClass} font-mono outline-none`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fill Options */}
      <div>
        <label className={`block text-[11px] font-medium mb-2 flex items-center gap-1 ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          <Droplet className="w-3.5 h-3.5 text-blue-500" />
          <span>Fill</span>
        </label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          <button
            onClick={() => onUpdateProperties({ fill: '#00a651' })}
            className={`py-1 rounded text-[10px] border ${
              typeof properties.fill === 'string' && properties.fill !== 'transparent'
                ? isDark ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-zinc-200 text-zinc-900 border-zinc-400 font-semibold'
                : isDark ? 'bg-[#565a62] text-zinc-400 border-zinc-700' : 'bg-white text-zinc-700 border-zinc-300'
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => applyGradient('#00a651', '#fff200')}
            className={`py-1 rounded text-[10px] border ${
              isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 shadow-xs'
            }`}
          >
            Gradient
          </button>
          <button
            onClick={() => onUpdateProperties({ fill: 'transparent' })}
            className={`py-1 rounded text-[10px] border ${
              properties.fill === 'transparent'
                ? isDark ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-zinc-200 text-zinc-900 border-zinc-400 font-semibold'
                : isDark ? 'bg-[#565a62] text-zinc-400 border-zinc-700' : 'bg-white text-zinc-700 border-zinc-300'
            }`}
          >
            No Fill
          </button>
        </div>

        {/* Quick Gradient Presets */}
        <div className="space-y-1">
          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Gradient presets:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => applyGradient('#ed1c24', '#ffc20e')}
              className="w-6 h-6 rounded border border-zinc-400/80 bg-gradient-to-r from-red-600 to-amber-400 shadow-xs"
              title="Sunset Gold"
            />
            <button
              onClick={() => applyGradient('#00aeef', '#1b1464')}
              className="w-6 h-6 rounded border border-zinc-400/80 bg-gradient-to-r from-cyan-400 to-indigo-900 shadow-xs"
              title="Ocean Deep"
            />
            <button
              onClick={() => applyGradient('#00a651', '#fff568')}
              className="w-6 h-6 rounded border border-zinc-400/80 bg-gradient-to-r from-emerald-600 to-yellow-300 shadow-xs"
              title="Nura Green Aura"
            />
            <button
              onClick={() => applyGradient('#92278f', '#ec008c')}
              className="w-6 h-6 rounded border border-zinc-400/80 bg-gradient-to-r from-purple-700 to-pink-500 shadow-xs"
              title="Neon Magenta"
            />
          </div>
        </div>
      </div>

      {/* Stroke / Outline */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <label className={`block text-[11px] font-medium mb-2 flex items-center gap-1 ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          <Sliders className="w-3.5 h-3.5 text-amber-500" />
          <span>Outline / Stroke</span>
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Color:</span>
            <input
              type="color"
              value={properties.stroke || '#000000'}
              onChange={(e) => onUpdateProperties({ stroke: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
            />
          </div>
          <div className="flex items-center justify-between gap-1.5">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Width:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateProperties({ strokeWidth: 0.25 })}
                title="Reset to Hairline (0.25 pt)"
                className={`px-1.5 py-0.5 text-[10px] rounded border ${
                  properties.strokeWidth === 0.25
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500 font-semibold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                Hairline
              </button>
              <input
                type="number"
                min="0"
                max="50"
                step="0.25"
                value={properties.strokeWidth}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateProperties({ strokeWidth: Number.isFinite(val) ? Math.max(0, val) : 0 });
                }}
                className={`w-16 rounded px-1.5 py-0.5 text-right text-xs border ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drop Shadow */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
          <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <Sun className="w-3.5 h-3.5 text-yellow-500" />
            <span>Drop Shadow</span>
          </span>
          <button
            onClick={() => applyShadow(true)}
            className="px-2 py-0.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-medium border border-emerald-500/40"
          >
            Apply
          </button>
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Color:</span>
            <input
              type="color"
              value={properties.shadowColor || '#000000'}
              onChange={(e) => {
                onUpdateProperties({ shadowColor: e.target.value });
                applyShadow(true);
              }}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Blur:</span>
            <input
              type="range"
              min="0"
              max="50"
              value={properties.shadowBlur}
              onChange={(e) => {
                onUpdateProperties({ shadowBlur: Number(e.target.value) });
                applyShadow(true);
              }}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className={`font-mono w-6 text-right ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{properties.shadowBlur}</span>
          </div>
          <button
            onClick={() => applyShadow(false)}
            className={`w-full py-1 rounded text-[10px] border ${
              isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-300'
            }`}
          >
            Remove Shadow
          </button>
        </div>
      </div>
    </div>
  );
};
