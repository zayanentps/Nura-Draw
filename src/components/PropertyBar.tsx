import React from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Square,
  Circle,
  FileText,
  Spline,
  ArrowUpToLine,
  ArrowDownToLine,
  Layers,
  Sparkles
} from 'lucide-react';
import { PageConfig, PropertyState } from '../types';
import { ALL_UNITS } from '../utils/units';

interface PropertyBarProps {
  selectedObject: any | null;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  pageConfig: PageConfig;
  onUpdatePageConfig: (config: Partial<PageConfig>) => void;
  onRotate: (deltaAngle: number) => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onGroup: () => void;
  onUngroup: () => void;
}

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
  'Verdana',
  'Segoe UI',
  'Montserrat',
];

const STROKE_WIDTH_PRESETS = [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24];

export const PropertyBar: React.FC<PropertyBarProps> = ({
  selectedObject,
  properties,
  onUpdateProperties,
  pageConfig,
  onUpdatePageConfig,
  onRotate,
  onFlipH,
  onFlipV,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
}) => {
  const isSelected = !!selectedObject;
  const isText = selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text');
  const isRect = selectedObject && selectedObject.type === 'rect';
  const isGroup = selectedObject && selectedObject.type === 'group';

  return (
    <div className="h-9 bg-[#2d3137] border-b border-zinc-700/80 px-2 flex items-center text-zinc-300 text-xs overflow-x-auto select-none gap-2">
      {/* If nothing is selected: Page Setup Properties */}
      {!isSelected ? (
        <div className="flex items-center gap-3 w-full">
          {/* Page Preset */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Page:</span>
            <select
              value={pageConfig.preset}
              onChange={(e) => {
                const preset = e.target.value as PageConfig['preset'];
                let w = pageConfig.width;
                let h = pageConfig.height;
                if (preset === 'A4') {
                  w = 794;
                  h = 1123;
                } else if (preset === 'A3') {
                  w = 1123;
                  h = 1587;
                } else if (preset === 'Letter') {
                  w = 816;
                  h = 1056;
                } else if (preset === 'FHD') {
                  w = 1920;
                  h = 1080;
                } else if (preset === 'Instagram') {
                  w = 1080;
                  h = 1080;
                }
                onUpdatePageConfig({ preset, width: w, height: h });
              }}
              className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="A3">A3 (297 x 420 mm)</option>
              <option value="Letter">Letter (8.5 x 11 in)</option>
              <option value="FHD">Full HD (1920 x 1080 px)</option>
              <option value="Instagram">Square (1080 x 1080 px)</option>
              <option value="Custom">Custom Size</option>
            </select>
          </div>

          <div className="h-4 w-px bg-zinc-600" />

          {/* Width & Height */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">W:</span>
            <input
              type="number"
              value={pageConfig.width}
              onChange={(e) => onUpdatePageConfig({ width: Math.max(100, Number(e.target.value) || 100), preset: 'Custom' })}
              className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500"
            />
            <span className="text-zinc-500 text-[10px]">px</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-zinc-400">H:</span>
            <input
              type="number"
              value={pageConfig.height}
              onChange={(e) => onUpdatePageConfig({ height: Math.max(100, Number(e.target.value) || 100), preset: 'Custom' })}
              className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500"
            />
            <span className="text-zinc-500 text-[10px]">px</span>
          </div>

          {/* Orientation buttons */}
          <div className="flex items-center rounded bg-zinc-800 border border-zinc-600 p-0.5">
            <button
              onClick={() => {
                if (pageConfig.orientation !== 'portrait') {
                  onUpdatePageConfig({
                    orientation: 'portrait',
                    width: Math.min(pageConfig.width, pageConfig.height),
                    height: Math.max(pageConfig.width, pageConfig.height),
                  });
                }
              }}
              title="Portrait Orientation"
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                pageConfig.orientation === 'portrait' ? 'bg-emerald-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Portrait
            </button>
            <button
              onClick={() => {
                if (pageConfig.orientation !== 'landscape') {
                  onUpdatePageConfig({
                    orientation: 'landscape',
                    width: Math.max(pageConfig.width, pageConfig.height),
                    height: Math.min(pageConfig.width, pageConfig.height),
                  });
                }
              }}
              title="Landscape Orientation"
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                pageConfig.orientation === 'landscape' ? 'bg-emerald-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Landscape
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-600" />

          {/* Page background color */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Paper:</span>
            <input
              type="color"
              value={pageConfig.backgroundColor}
              onChange={(e) => onUpdatePageConfig({ backgroundColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent"
              title="Page Background Color"
            />
          </div>

          {/* Units */}
          <div className="flex items-center gap-1 ml-auto text-zinc-400">
            <span>Units:</span>
            <select
              value={pageConfig.units}
              onChange={(e) => onUpdatePageConfig({ units: e.target.value as any })}
              className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white outline-none cursor-pointer"
            >
              {ALL_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* Object-Specific Properties (Dynamic NuraDraw Contextual Inspector) */
        <div className="flex items-center gap-2.5 w-full">
          {/* Object Type Badge */}
          <div className="flex items-center gap-1 bg-zinc-800/90 text-emerald-400 px-2 py-0.5 rounded border border-zinc-600 text-[11px] font-semibold">
            {isRect && <Square className="w-3 h-3" />}
            {selectedObject?.type === 'circle' && <Circle className="w-3 h-3" />}
            {isText && <FileText className="w-3 h-3" />}
            {selectedObject?.type === 'path' && <Spline className="w-3 h-3" />}
            {isGroup && <Layers className="w-3 h-3" />}
            <span>{(selectedObject as any).name || selectedObject.type}</span>
          </div>

          <div className="h-4 w-px bg-zinc-600" />

          {/* Position X and Y */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-mono">X:</span>
            <input
              type="number"
              value={Math.round(properties.x)}
              onChange={(e) => onUpdateProperties({ x: Number(e.target.value) })}
              className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-mono">Y:</span>
            <input
              type="number"
              value={Math.round(properties.y)}
              onChange={(e) => onUpdateProperties({ y: Number(e.target.value) })}
              className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Size W and H */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-mono">W:</span>
            <input
              type="number"
              value={Math.round(properties.width)}
              onChange={(e) => onUpdateProperties({ width: Math.max(2, Number(e.target.value)) })}
              className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-mono">H:</span>
            <input
              type="number"
              value={Math.round(properties.height)}
              onChange={(e) => onUpdateProperties({ height: Math.max(2, Number(e.target.value)) })}
              className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Rotation Angle */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-mono">∠:</span>
            <input
              type="number"
              value={Math.round(properties.angle % 360)}
              onChange={(e) => onUpdateProperties({ angle: Number(e.target.value) })}
              className="w-12 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none focus:border-emerald-500 font-mono"
            />
            <span className="text-zinc-400 text-[10px]">°</span>
            <button
              onClick={() => onRotate(-90)}
              title="Rotate 90° CCW"
              className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRotate(90)}
              title="Rotate 90° CW"
              className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          {/* Mirror Flip */}
          <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-600 rounded p-0.5">
            <button onClick={onFlipH} title="Mirror Horizontally" className="p-0.5 hover:bg-zinc-700 rounded text-zinc-300">
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
            <button onClick={onFlipV} title="Mirror Vertically" className="p-0.5 hover:bg-zinc-700 rounded text-zinc-300">
              <FlipVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-600" />

          {/* Text-Specific Properties */}
          {isText && (
            <div className="flex items-center gap-2">
              <select
                value={properties.fontFamily}
                onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
                className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white outline-none max-w-[100px]"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={properties.fontSize}
                onChange={(e) => onUpdateProperties({ fontSize: Math.max(6, Number(e.target.value)) })}
                className="w-12 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none font-mono"
                title="Font Size (pt)"
              />

              <div className="flex items-center rounded bg-zinc-800 border border-zinc-600 p-0.5">
                <button
                  onClick={() => onUpdateProperties({ fontWeight: properties.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={`p-1 rounded ${properties.fontWeight === 'bold' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Bold"
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onUpdateProperties({ fontStyle: properties.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={`p-1 rounded ${properties.fontStyle === 'italic' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Italic"
                >
                  <Italic className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onUpdateProperties({ underline: !properties.underline })}
                  className={`p-1 rounded ${properties.underline ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Underline"
                >
                  <Underline className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center rounded bg-zinc-800 border border-zinc-600 p-0.5">
                <button
                  onClick={() => onUpdateProperties({ textAlign: 'left' })}
                  className={`p-1 rounded ${properties.textAlign === 'left' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onUpdateProperties({ textAlign: 'center' })}
                  className={`p-1 rounded ${properties.textAlign === 'center' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onUpdateProperties({ textAlign: 'right' })}
                  className={`p-1 rounded ${properties.textAlign === 'right' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                  title="Align Right"
                >
                  <AlignRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Rectangle Corner Radius (Fillet) */}
          {isRect && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-[11px]">Radius:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={properties.rx}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  onUpdateProperties({ rx: val, ry: val });
                }}
                className="w-12 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white text-right outline-none font-mono"
              />
            </div>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 text-[11px]">Stroke:</span>
            <select
              value={properties.strokeWidth}
              onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
              className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white outline-none"
            >
              {STROKE_WIDTH_PRESETS.map((sw) => (
                <option key={sw} value={sw}>
                  {sw === 0 ? 'None (Hairline)' : `${sw} pt`}
                </option>
              ))}
            </select>
          </div>

          {/* Stroke Dash Style */}
          <div className="flex items-center gap-1">
            <select
              value={
                properties.strokeDashArray?.length === 0
                  ? 'solid'
                  : properties.strokeDashArray?.[0] === 5
                  ? 'dashed'
                  : 'dotted'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'solid') onUpdateProperties({ strokeDashArray: [] });
                else if (val === 'dashed') onUpdateProperties({ strokeDashArray: [6, 4] });
                else if (val === 'dotted') onUpdateProperties({ strokeDashArray: [2, 2] });
              }}
              className="bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs text-white outline-none"
            >
              <option value="solid">━━━━ Solid</option>
              <option value="dashed">━ ━ ━ Dashed</option>
              <option value="dotted">•••• Dotted</option>
            </select>
          </div>

          {/* Fill & Outline Colors */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" title="Fill Color">
              <span className="text-zinc-400 text-[10px]">Fill:</span>
              <input
                type="color"
                value={properties.fill === 'transparent' ? '#ffffff' : properties.fill}
                onChange={(e) => onUpdateProperties({ fill: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1" title="Outline / Stroke Color">
              <span className="text-zinc-400 text-[10px]">Line:</span>
              <input
                type="color"
                value={properties.stroke || '#000000'}
                onChange={(e) => onUpdateProperties({ stroke: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent"
              />
            </div>
          </div>

          {/* Opacity slider */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-zinc-400 text-[10px]">Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={properties.opacity}
              onChange={(e) => onUpdateProperties({ opacity: Number(e.target.value) })}
              className="w-16 accent-emerald-500 cursor-pointer"
            />
            <span className="text-zinc-400 text-[10px] font-mono w-7 text-right">
              {Math.round(properties.opacity * 100)}%
            </span>
          </div>

          {/* Ordering & Grouping actions */}
          <div className="flex items-center gap-1 border-l border-zinc-600 pl-2">
            <button
              onClick={onBringForward}
              title="Bring Forward (Ctrl+PgUp)"
              className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSendBackward}
              title="Send Backward (Ctrl+PgDn)"
              className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
            {isGroup ? (
              <button
                onClick={onUngroup}
                title="Ungroup (Ctrl+U)"
                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] border border-zinc-600"
              >
                Ungroup
              </button>
            ) : (
              <button
                onClick={onGroup}
                title="Group (Ctrl+G)"
                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] border border-zinc-600"
              >
                Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
