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
  Box,
} from 'lucide-react';
import * as fabric from 'fabric';
import { PropertyState, ThemeMode } from '../../types';
import { POPULAR_FONTS, FONT_SIZES, FONT_WEIGHTS } from '../../utils/fonts';
import {
  applyShadowToTarget,
  extractTargetShadowForUi,
  formatShadowRgba,
  getShadowMetrics,
  polarToOffset,
} from '../../utils/shadowHelpers';
import {
  ContourDirection,
  DEFAULT_CONTOUR_PARAMS,
  applyContourParamsToTarget,
  extractTargetContourForUi,
  removeContourFromTarget,
  resolveContourParent,
} from '../../utils/contourHelpers';
import {
  BlendColorMode,
  DEFAULT_BLEND_PARAMS,
  applyBlendBetweenObjects,
  removeBlendByObject,
  resolveBlendGroup,
} from '../../utils/blendHelpers';
import {
  ExtrudeColorMode,
  ExtrudeType,
  DEFAULT_EXTRUDE_PARAMS,
  applyExtrudeParamsToTarget,
  extractTargetExtrudeForUi,
  removeExtrudeFromTarget,
  resolveExtrudeParent,
} from '../../utils/extrudeHelpers';
import {
  EnvelopeMode,
  ENVELOPE_PRESETS,
  DEFAULT_ENVELOPE_MODE,
  applyEnvelopeCageToTarget,
  applyEnvelopePresetToTarget,
  clearEnvelopeFromTarget,
  extractOrInitEnvelopeConfig,
  resetEnvelopeOnTarget,
} from '../../utils/envelopeHelpers';
import {
  BlockShadowParams,
  DEFAULT_BLOCK_SHADOW_PARAMS,
  applyBlockShadowParamsToTarget,
  extractTargetBlockShadowForUi,
  removeBlockShadowFromTarget,
  resolveBlockShadowParent,
} from '../../utils/blockShadowHelpers';
import { LiveEmbossSection } from '../EmbossControlsPanel';

interface PropertiesDockerProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  theme?: ThemeMode;
  onRefresh?: () => void;
}

export const PropertiesDocker: React.FC<PropertiesDockerProps> = ({
  canvas,
  selectedObject,
  properties,
  onUpdateProperties,
  theme = 'light',
  onRefresh,
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
    onRefresh?.();
  };

  const shadowMetrics = getShadowMetrics(extractTargetShadowForUi(selectedObject), {
    color: properties.shadowColor,
    blur: properties.shadowBlur,
    offsetX: properties.shadowOffsetX,
    offsetY: properties.shadowOffsetY,
  });

  const applyShadowPatch = (
    patch: Partial<{ distance: number; angle: number; blur: number; transparency: number; colorHex: string; remove: boolean }>
  ) => {
    if (!selectedObject || !canvas) return;
    if (patch.remove) {
      applyShadowToTarget(selectedObject, null);
      canvas.requestRenderAll();
      onRefresh?.();
      return;
    }
    const nextDist = patch.distance !== undefined ? Math.max(0, patch.distance) : shadowMetrics.distance;
    const nextAngle = patch.angle !== undefined ? patch.angle : shadowMetrics.angle;
    const nextBlur = patch.blur !== undefined ? Math.max(0, patch.blur) : shadowMetrics.blur;
    const nextTransp =
      patch.transparency !== undefined
        ? Math.max(0, Math.min(100, Math.round(patch.transparency)))
        : shadowMetrics.transparency;
    const nextColorHex = patch.colorHex !== undefined ? patch.colorHex : shadowMetrics.colorHex;
    const { offsetX, offsetY } = polarToOffset(nextDist, nextAngle);
    const nextRgba = formatShadowRgba(nextColorHex, Math.max(0, Math.min(1, 1 - nextTransp / 100)));

    onUpdateProperties({
      shadowColor: nextRgba,
      shadowBlur: nextBlur,
      shadowOffsetX: offsetX,
      shadowOffsetY: offsetY,
    });
    applyShadowToTarget(selectedObject, {
      offsetX,
      offsetY,
      blur: nextBlur,
      transparency: nextTransp,
      colorHex: nextColorHex,
    });
    canvas.requestRenderAll();
    onRefresh?.();
  };

  const contourUi = extractTargetContourForUi(canvas, selectedObject);
  const contourParams = {
    direction: properties.contourDirection ?? contourUi.params.direction,
    steps: properties.contourSteps ?? contourUi.params.steps,
    offsetPx: properties.contourOffset ?? contourUi.params.offsetPx,
    outlineColor: properties.contourOutlineColor ?? contourUi.params.outlineColor,
    fillColor: properties.contourFillColor ?? contourUi.params.fillColor,
  };

  const applyContourPatch = async (
    patch: Partial<{
      direction: ContourDirection;
      steps: number;
      offsetPx: number;
      outlineColor: string;
      fillColor: string;
      remove: boolean;
    }>
  ) => {
    if (!selectedObject || !canvas) return;
    const parent = resolveContourParent(canvas, selectedObject) || selectedObject;
    if (patch.remove) {
      removeContourFromTarget(canvas, parent);
      canvas.setActiveObject(parent);
      canvas.requestRenderAll();
      onUpdateProperties({
        contourDirection: DEFAULT_CONTOUR_PARAMS.direction,
        contourSteps: DEFAULT_CONTOUR_PARAMS.steps,
        contourOffset: DEFAULT_CONTOUR_PARAMS.offsetPx,
        contourOutlineColor: DEFAULT_CONTOUR_PARAMS.outlineColor,
        contourFillColor: DEFAULT_CONTOUR_PARAMS.fillColor,
      });
      onRefresh?.();
      return;
    }
    const next = {
      direction: patch.direction ?? contourParams.direction,
      steps: patch.steps !== undefined ? Math.max(1, Math.min(50, Math.round(patch.steps))) : contourParams.steps,
      offsetPx:
        patch.offsetPx !== undefined
          ? Math.max(1, Math.min(250, Math.round(patch.offsetPx * 10) / 10))
          : contourParams.offsetPx,
      outlineColor: patch.outlineColor ?? contourParams.outlineColor,
      fillColor: patch.fillColor ?? contourParams.fillColor,
    };
    onUpdateProperties({
      contourDirection: next.direction,
      contourSteps: next.steps,
      contourOffset: next.offsetPx,
      contourOutlineColor: next.outlineColor,
      contourFillColor: next.fillColor,
    });
    await applyContourParamsToTarget(canvas, parent, next);
    onRefresh?.();
  };

  const blendResolved = resolveBlendGroup(canvas, selectedObject);
  const blendSelectionTargets =
    !blendResolved && selectedObject.type === 'activeselection'
      ? ((selectedObject as fabric.ActiveSelection).getObjects() || [])
      : [];
  const blendParams = {
    steps: properties.blendSteps ?? blendResolved?.params.steps ?? DEFAULT_BLEND_PARAMS.steps,
    colorMode: properties.blendColorMode ?? blendResolved?.params.colorMode ?? DEFAULT_BLEND_PARAMS.colorMode,
    accelObject: properties.blendAccelObject ?? blendResolved?.params.accelObject ?? DEFAULT_BLEND_PARAMS.accelObject,
    accelColor: properties.blendAccelColor ?? blendResolved?.params.accelColor ?? DEFAULT_BLEND_PARAMS.accelColor,
  };

  const applyBlendPatch = async (
    patch: Partial<{ steps: number; colorMode: BlendColorMode; accelObject: number; accelColor: number; remove: boolean }>
  ) => {
    if (!selectedObject || !canvas) return;
    if (patch.remove) {
      const res = removeBlendByObject(canvas, selectedObject);
      if (res.source) canvas.setActiveObject(res.source);
      canvas.requestRenderAll();
      onUpdateProperties({
        blendSteps: DEFAULT_BLEND_PARAMS.steps,
        blendColorMode: DEFAULT_BLEND_PARAMS.colorMode,
        blendAccelObject: DEFAULT_BLEND_PARAMS.accelObject,
        blendAccelColor: DEFAULT_BLEND_PARAMS.accelColor,
      });
      onRefresh?.();
      return;
    }

    const next = {
      steps: patch.steps !== undefined ? Math.max(1, Math.min(50, Math.round(patch.steps))) : blendParams.steps,
      colorMode: patch.colorMode ?? blendParams.colorMode,
      accelObject: patch.accelObject ?? blendParams.accelObject,
      accelColor: patch.accelColor ?? blendParams.accelColor,
    };

    let src = blendResolved?.source || null;
    let dst = blendResolved?.target || null;
    if ((!src || !dst) && blendSelectionTargets.length >= 2) {
      src = blendSelectionTargets[0];
      dst = blendSelectionTargets[blendSelectionTargets.length - 1];
      canvas.discardActiveObject();
    }

    onUpdateProperties({
      blendSteps: next.steps,
      blendColorMode: next.colorMode,
      blendAccelObject: next.accelObject,
      blendAccelColor: next.accelColor,
    });
    if (src && dst && src !== dst) {
      const res = await applyBlendBetweenObjects(canvas, src, dst, next, { blendId: blendResolved?.blendId });
      if (res) canvas.setActiveObject(res.source);
      onRefresh?.();
    }
  };

  const extrudeUi = extractTargetExtrudeForUi(canvas, selectedObject);
  const extrudeParams = {
    extrudeType: properties.extrudeType ?? extrudeUi.params.extrudeType,
    offsetX: properties.extrudeOffsetX ?? extrudeUi.params.offsetX,
    offsetY: properties.extrudeOffsetY ?? extrudeUi.params.offsetY,
    depth: properties.extrudeDepth ?? extrudeUi.params.depth,
    colorMode: properties.extrudeColorMode ?? extrudeUi.params.colorMode,
    solidColor: properties.extrudeColor ?? extrudeUi.params.solidColor,
    shadeColor: properties.extrudeShadeColor ?? extrudeUi.params.shadeColor,
    lightIntensity: properties.extrudeLight ?? extrudeUi.params.lightIntensity,
    showOutline: properties.extrudeOutline ?? extrudeUi.params.showOutline,
  };

  const applyExtrudePatch = async (
    patch: Partial<{
      extrudeType: ExtrudeType;
      offsetX: number;
      offsetY: number;
      depth: number;
      colorMode: ExtrudeColorMode;
      solidColor: string;
      shadeColor: string;
      lightIntensity: number;
      showOutline: boolean;
      remove: boolean;
    }>
  ) => {
    if (!selectedObject || !canvas) return;
    const parent = resolveExtrudeParent(canvas, selectedObject) || selectedObject;
    if (patch.remove) {
      removeExtrudeFromTarget(canvas, parent);
      canvas.setActiveObject(parent);
      canvas.requestRenderAll();
      onUpdateProperties({
        extrudeType: DEFAULT_EXTRUDE_PARAMS.extrudeType,
        extrudeOffsetX: DEFAULT_EXTRUDE_PARAMS.offsetX,
        extrudeOffsetY: DEFAULT_EXTRUDE_PARAMS.offsetY,
        extrudeDepth: DEFAULT_EXTRUDE_PARAMS.depth,
        extrudeColorMode: DEFAULT_EXTRUDE_PARAMS.colorMode,
        extrudeColor: DEFAULT_EXTRUDE_PARAMS.solidColor,
        extrudeShadeColor: DEFAULT_EXTRUDE_PARAMS.shadeColor,
        extrudeLight: DEFAULT_EXTRUDE_PARAMS.lightIntensity,
        extrudeOutline: DEFAULT_EXTRUDE_PARAMS.showOutline,
      });
      onRefresh?.();
      return;
    }

    const next = {
      extrudeType: patch.extrudeType ?? extrudeParams.extrudeType,
      offsetX: patch.offsetX ?? extrudeParams.offsetX,
      offsetY: patch.offsetY ?? extrudeParams.offsetY,
      depth: patch.depth !== undefined ? Math.max(1, Math.min(95, Math.round(patch.depth))) : extrudeParams.depth,
      colorMode: patch.colorMode ?? extrudeParams.colorMode,
      solidColor: patch.solidColor ?? extrudeParams.solidColor,
      shadeColor: patch.shadeColor ?? extrudeParams.shadeColor,
      lightIntensity:
        patch.lightIntensity !== undefined
          ? Math.max(0, Math.min(100, Math.round(patch.lightIntensity)))
          : extrudeParams.lightIntensity,
      showOutline: patch.showOutline ?? extrudeParams.showOutline,
    };

    onUpdateProperties({
      extrudeType: next.extrudeType,
      extrudeOffsetX: next.offsetX,
      extrudeOffsetY: next.offsetY,
      extrudeDepth: next.depth,
      extrudeColorMode: next.colorMode,
      extrudeColor: next.solidColor,
      extrudeShadeColor: next.shadeColor,
      extrudeLight: next.lightIntensity,
      extrudeOutline: next.showOutline,
    });
    await applyExtrudeParamsToTarget(canvas, parent, next);
    onRefresh?.();
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
            onClick={() => applyShadowPatch({})}
            className="px-2 py-0.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-medium border border-emerald-500/40 cursor-pointer"
          >
            Apply
          </button>
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Distance:</span>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={Math.round(shadowMetrics.distance)}
              onChange={(e) => applyShadowPatch({ distance: Number(e.target.value) })}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className={`font-mono w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {Math.round(shadowMetrics.distance)}px
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Angle:</span>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={Math.round(shadowMetrics.angle)}
              onChange={(e) => applyShadowPatch({ angle: Number(e.target.value) })}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className={`font-mono w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {Math.round(shadowMetrics.angle)}°
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Transparency:</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={shadowMetrics.transparency}
              onChange={(e) => applyShadowPatch({ transparency: Number(e.target.value) })}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className={`font-mono w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {shadowMetrics.transparency}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Feathering:</span>
            <input
              type="range"
              min="0"
              max="80"
              value={Math.round(shadowMetrics.blur)}
              onChange={(e) => applyShadowPatch({ blur: Number(e.target.value) })}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className={`font-mono w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {Math.round(shadowMetrics.blur)}px
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Color:</span>
            <input
              type="color"
              value={shadowMetrics.colorHex}
              onChange={(e) => applyShadowPatch({ colorHex: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
            />
          </div>
          <button
            onClick={() => applyShadowPatch({ remove: true })}
            className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
              isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
            }`}
          >
            Remove Shadow
          </button>
        </div>
      </div>

      {/* Contour */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
          <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Contour</span>
          </span>
          <button
            onClick={() => void applyContourPatch({})}
            className="px-2 py-0.5 bg-sky-600/15 hover:bg-sky-600/25 text-sky-600 dark:text-sky-400 rounded text-[10px] font-medium border border-sky-500/40 cursor-pointer"
          >
            Apply
          </button>
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1">
            {(['center', 'inside', 'outside'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => void applyContourPatch({ direction: m })}
                className={`py-1 rounded text-[10px] border capitalize cursor-pointer ${
                  contourParams.direction === m
                    ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                    : isDark
                    ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                }`}
              >
                {m === 'center' ? 'Center' : m}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Steps:</span>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={Math.min(20, contourParams.steps)}
              onChange={(e) => void applyContourPatch({ steps: Number(e.target.value) })}
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className={`font-mono tabular-nums w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {contourParams.steps}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Offset:</span>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={Math.min(100, Math.round(contourParams.offsetPx))}
              onChange={(e) => void applyContourPatch({ offsetPx: Number(e.target.value) })}
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className={`font-mono tabular-nums w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {Math.round(contourParams.offsetPx)}px
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Outline:</span>
              <input
                type="color"
                value={contourParams.outlineColor}
                onChange={(e) => void applyContourPatch({ outlineColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Fill:</span>
              <input
                type="color"
                value={contourParams.fillColor}
                onChange={(e) => void applyContourPatch({ fillColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
              />
            </label>
          </div>
          <button
            onClick={() => void applyContourPatch({ remove: true })}
            className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
              isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
            }`}
          >
            Remove Contour
          </button>
        </div>
      </div>

      {/* Blend */}
      {(blendResolved || blendSelectionTargets.length >= 2) && (
        <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
          <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
            <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Blend</span>
            </span>
            <button
              onClick={() => void applyBlendPatch({})}
              className="px-2 py-0.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-medium border border-emerald-500/40 cursor-pointer"
            >
              Apply
            </button>
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'direct', label: 'Direct' },
                  { id: 'clockwise', label: 'CW' },
                  { id: 'counterclockwise', label: 'CCW' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void applyBlendPatch({ colorMode: m.id })}
                  className={`py-1 rounded text-[10px] border cursor-pointer ${
                    blendParams.colorMode === m.id
                      ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                      : isDark
                      ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Steps:</span>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={Math.min(40, blendParams.steps)}
                onChange={(e) => void applyBlendPatch({ steps: Number(e.target.value) })}
                className="w-24 accent-emerald-500 cursor-pointer"
              />
              <span className={`font-mono tabular-nums w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {blendParams.steps}
              </span>
            </div>
            <button
              onClick={() => void applyBlendPatch({ remove: true })}
              className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
                isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              Clear Blend
            </button>
          </div>
        </div>
      )}

      {/* Extrude 3D */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
          <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <Box className="w-3.5 h-3.5 text-indigo-500" />
            <span>Extrude 3D</span>
          </span>
          <button
            onClick={() => void applyExtrudePatch({})}
            className="px-2 py-0.5 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-medium border border-indigo-500/40 cursor-pointer"
          >
            Apply
          </button>
        </label>
        <div className="space-y-2">
          <select
            value={extrudeParams.extrudeType}
            onChange={(e) => void applyExtrudePatch({ extrudeType: e.target.value as ExtrudeType })}
            className={`w-full rounded px-1.5 py-1 text-xs border ${inputClass} outline-none cursor-pointer`}
          >
            <option value="small_back">Small Back</option>
            <option value="big_back">Big Back</option>
            <option value="back_parallel">Back Parallel</option>
            <option value="small_front">Small Front</option>
            <option value="big_front">Big Front</option>
            <option value="front_parallel">Front Parallel</option>
          </select>
          <div className="flex items-center justify-between gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Depth:</span>
            <input
              type="range"
              min="5"
              max="95"
              step="1"
              value={extrudeParams.depth}
              onChange={(e) => void applyExtrudePatch({ depth: Number(e.target.value) })}
              className="w-24 accent-indigo-500 cursor-pointer"
            />
            <span className={`font-mono tabular-nums w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {extrudeParams.depth}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'object_fill', label: 'Fill' },
                { id: 'solid', label: 'Solid' },
                { id: 'shade', label: 'Shade' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void applyExtrudePatch({ colorMode: m.id })}
                className={`py-1 rounded text-[10px] border cursor-pointer ${
                  extrudeParams.colorMode === m.id
                    ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                    : isDark
                    ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {extrudeParams.colorMode !== 'object_fill' && (
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5">
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Color:</span>
                <input
                  type="color"
                  value={extrudeParams.solidColor}
                  onChange={(e) => void applyExtrudePatch({ solidColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
                />
              </label>
              {extrudeParams.colorMode === 'shade' && (
                <label className="flex items-center gap-1.5">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>To:</span>
                  <input
                    type="color"
                    value={extrudeParams.shadeColor}
                    onChange={(e) => void applyExtrudePatch({ shadeColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
                  />
                </label>
              )}
            </div>
          )}
          <button
            onClick={() => void applyExtrudePatch({ remove: true })}
            className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
              isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
            }`}
          >
            Remove Extrude
          </button>
        </div>
      </div>

      {/* Envelope Warp */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
          <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Envelope Warp</span>
          </span>
          <button
            onClick={() => {
              if (!selectedObject || !canvas) return;
              const next = applyEnvelopePresetToTarget(canvas, selectedObject, 'inward_pinch', 0.35);
              canvas.setActiveObject(next);
              onUpdateProperties({ envelopeMode: 'single_arc' });
              (canvas as any).fire('envelope:updated', { target: next });
              onRefresh?.();
            }}
            className="px-2 py-0.5 bg-sky-600/15 hover:bg-sky-600/25 text-sky-600 dark:text-sky-400 rounded text-[10px] font-medium border border-sky-500/40 cursor-pointer"
          >
            Pinch
          </button>
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: 'straight', label: 'Straight' },
                { id: 'single_arc', label: 'Single Arc' },
                { id: 'double_arc', label: 'Double Arc' },
                { id: 'unconstrained', label: 'Unconstrained' },
              ] as { id: EnvelopeMode; label: string }[]
            ).map((m) => {
              const curMode: EnvelopeMode =
                (selectedObject as any)?.envelopeConfig?.mode ??
                properties.envelopeMode ??
                DEFAULT_ENVELOPE_MODE;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (!selectedObject || !canvas) return;
                    const cfg = extractOrInitEnvelopeConfig(selectedObject);
                    const next = applyEnvelopeCageToTarget(canvas, selectedObject, cfg.cage, m.id, {
                      activeNode: cfg.activeNode,
                    });
                    canvas.setActiveObject(next);
                    onUpdateProperties({ envelopeMode: m.id });
                    (canvas as any).fire('envelope:updated', { target: next });
                    onRefresh?.();
                  }}
                  className={`py-1 rounded text-[10px] border cursor-pointer ${
                    curMode === m.id
                      ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                      : isDark
                      ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (!selectedObject || !canvas || !e.target.value) return;
              const next = applyEnvelopePresetToTarget(canvas, selectedObject, e.target.value, 0.35);
              canvas.setActiveObject(next);
              const cfg = extractOrInitEnvelopeConfig(next);
              onUpdateProperties({ envelopeMode: cfg.mode });
              (canvas as any).fire('envelope:updated', { target: next });
              onRefresh?.();
            }}
            className={`w-full rounded px-1.5 py-1 text-xs border ${inputClass} outline-none cursor-pointer`}
          >
            <option value="">Apply Envelope Preset...</option>
            {ENVELOPE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              disabled={!(selectedObject as any)?.envelopeConfig}
              onClick={() => {
                if (!selectedObject || !canvas) return;
                const next = resetEnvelopeOnTarget(canvas, selectedObject);
                canvas.setActiveObject(next);
                (canvas as any).fire('envelope:updated', { target: next });
                onRefresh?.();
              }}
              className={`py-1 rounded text-[10px] border cursor-pointer disabled:opacity-40 ${
                isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!(selectedObject as any)?.envelopeConfig}
              onClick={() => {
                if (!selectedObject || !canvas) return;
                const next = clearEnvelopeFromTarget(canvas, selectedObject);
                canvas.setActiveObject(next);
                onUpdateProperties({ envelopeMode: DEFAULT_ENVELOPE_MODE });
                (canvas as any).fire('envelope:updated', { target: next });
                onRefresh?.();
              }}
              className={`py-1 rounded text-[10px] border cursor-pointer disabled:opacity-40 ${
                isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Block Shadow */}
      {(() => {
        const bsParent = resolveBlockShadowParent(canvas, selectedObject) || selectedObject;
        const bsUi = extractTargetBlockShadowForUi(canvas, bsParent);
        const bsParams: BlockShadowParams = {
          offsetX: properties.blockShadowOffsetX ?? bsUi.params.offsetX,
          offsetY: properties.blockShadowOffsetY ?? bsUi.params.offsetY,
          color: properties.blockShadowColor ?? bsUi.params.color,
          simplify: properties.blockShadowSimplify ?? bsUi.params.simplify,
          removeHoles: properties.blockShadowRemoveHoles ?? bsUi.params.removeHoles,
          fromOutline: properties.blockShadowFromOutline ?? bsUi.params.fromOutline,
          expandEnabled: properties.blockShadowExpandEnabled ?? bsUi.params.expandEnabled,
          expandPx: properties.blockShadowExpandPx ?? bsUi.params.expandPx,
          overprint: properties.blockShadowOverprint ?? bsUi.params.overprint,
        };
        const applyBsPatch = async (patch: Partial<BlockShadowParams> & { remove?: boolean }) => {
          if (!canvas || !bsParent) return;
          if (patch.remove) {
            const res = removeBlockShadowFromTarget(canvas, bsParent);
            canvas.setActiveObject(res.parent);
            onUpdateProperties({
              blockShadowOffsetX: DEFAULT_BLOCK_SHADOW_PARAMS.offsetX,
              blockShadowOffsetY: DEFAULT_BLOCK_SHADOW_PARAMS.offsetY,
              blockShadowColor: DEFAULT_BLOCK_SHADOW_PARAMS.color,
              blockShadowSimplify: DEFAULT_BLOCK_SHADOW_PARAMS.simplify,
              blockShadowRemoveHoles: DEFAULT_BLOCK_SHADOW_PARAMS.removeHoles,
              blockShadowFromOutline: DEFAULT_BLOCK_SHADOW_PARAMS.fromOutline,
              blockShadowExpandEnabled: DEFAULT_BLOCK_SHADOW_PARAMS.expandEnabled,
              blockShadowExpandPx: DEFAULT_BLOCK_SHADOW_PARAMS.expandPx,
              blockShadowOverprint: DEFAULT_BLOCK_SHADOW_PARAMS.overprint,
            });
            (canvas as any).fire('block_shadow:updated', { target: res.parent });
            onRefresh?.();
            return;
          }
          const next = { ...bsParams, ...patch };
          onUpdateProperties({
            blockShadowOffsetX: next.offsetX,
            blockShadowOffsetY: next.offsetY,
            blockShadowColor: next.color,
            blockShadowSimplify: next.simplify,
            blockShadowRemoveHoles: next.removeHoles,
            blockShadowFromOutline: next.fromOutline,
            blockShadowExpandEnabled: next.expandEnabled,
            blockShadowExpandPx: next.expandPx,
            blockShadowOverprint: next.overprint,
          });
          await applyBlockShadowParamsToTarget(canvas, bsParent, next);
          (canvas as any).fire('block_shadow:updated', { target: bsParent });
          onRefresh?.();
        };

        return (
          <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
            <label className="block text-[11px] font-medium mb-2 flex items-center justify-between">
              <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <Box className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span>Block Shadow</span>
              </span>
              <button
                onClick={() => void applyBsPatch({})}
                className="px-2 py-0.5 bg-zinc-700/15 hover:bg-zinc-700/25 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-medium border border-zinc-500/40 cursor-pointer"
              >
                Apply
              </button>
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Color:</span>
                <input
                  type="color"
                  value={bsParams.color}
                  onChange={(e) => void applyBsPatch({ color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => void applyBsPatch({ removeHoles: !bsParams.removeHoles })}
                  className={`py-1 rounded text-[10px] border cursor-pointer ${
                    bsParams.removeHoles
                      ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                      : isDark
                      ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  Remove Holes
                </button>
                <button
                  type="button"
                  onClick={() => void applyBsPatch({ overprint: !bsParams.overprint })}
                  className={`py-1 rounded text-[10px] border cursor-pointer ${
                    bsParams.overprint
                      ? 'bg-[#0078d7] text-white border-[#0078d7] font-semibold'
                      : isDark
                      ? 'bg-[#565a62] text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  Overprint
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Expand:</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={bsParams.expandEnabled ? Math.round(bsParams.expandPx) : 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    void applyBsPatch({ expandEnabled: v > 0, expandPx: v });
                  }}
                  className="w-24 accent-[#0078d7] cursor-pointer"
                />
                <span className={`font-mono tabular-nums w-9 text-right ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {bsParams.expandEnabled ? Math.round(bsParams.expandPx) : 0}px
                </span>
              </div>
              <button
                onClick={() => void applyBsPatch({ remove: true })}
                className={`w-full py-1 rounded text-[10px] border cursor-pointer ${
                  isDark ? 'bg-[#565a62] hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                Remove Block Shadow
              </button>
            </div>
          </div>
        );
      })()}

      {/* Emboss */}
      <div className={`pt-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
        <LiveEmbossSection canvas={canvas} selectedObject={selectedObject} theme={theme} onRefresh={onRefresh} />
      </div>
    </div>
  );
};
