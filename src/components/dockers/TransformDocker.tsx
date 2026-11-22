import React, { useState, useEffect } from 'react';
import {
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  RotateCw,
  Move,
  FlipHorizontal,
  FlipVertical,
  X,
} from 'lucide-react';
import * as fabric from 'fabric';
import { PageConfig, ThemeMode } from '../../types';
import { UNITS_DATA, pxToUnit, unitToPx } from '../../utils/units';
import { ensureObjectId } from '../../utils/canvasHelpers';

export type TransformTab = 'position' | 'rotate' | 'scale' | 'size' | 'skew';

interface TransformDockerProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  pageConfig: PageConfig;
  theme?: ThemeMode;
  onClose?: () => void;
  onCollapse?: () => void;
  onRefresh?: () => void;
  initialTab?: TransformTab;
}

export const TransformDocker: React.FC<TransformDockerProps> = ({
  canvas,
  selectedObject,
  pageConfig,
  theme = 'light',
  onClose,
  onCollapse,
  onRefresh,
  initialTab = 'position',
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<TransformTab>(initialTab);

  // Active unit settings
  const unitInfo = UNITS_DATA[pageConfig.units] || UNITS_DATA.px;
  const unitSuffix = ` ${unitInfo.symbol}`;
  const unitDecimals = unitInfo.decimals;
  const unitStep = unitInfo.step;

  // Selected Anchor (0 to 8: 0=TL, 1=TC, 2=TR, 3=ML, 4=C, 5=MR, 6=BL, 7=BC, 8=BR)
  // In NuraDraw screenshot, top-center (1) is active
  const [anchor, setAnchor] = useState<number>(1);

  // Position state
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [relativePos, setRelativePos] = useState<boolean>(true);

  // Rotate state
  const [rotateAngle, setRotateAngle] = useState<number>(0);
  const [relativeCenter, setRelativeCenter] = useState<boolean>(true);

  // Scale & Mirror state
  const [scaleXPercent, setScaleXPercent] = useState<number>(100);
  const [scaleYPercent, setScaleYPercent] = useState<number>(100);
  const [proportionalScale, setProportionalScale] = useState<boolean>(true);

  // Size state
  const [sizeWidth, setSizeWidth] = useState<number>(0);
  const [sizeHeight, setSizeHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);

  // Skew state
  const [skewH, setSkewH] = useState<number>(0);
  const [skewV, setSkewV] = useState<number>(0);
  const [useAnchorPoint, setUseAnchorPoint] = useState<boolean>(true);

  // Copies count (default 1)
  const [copies, setCopies] = useState<number>(1);

  // Synchronize values when selected object changes or anchor changes
  useEffect(() => {
    if (!selectedObject) {
      if (!relativePos) {
        setPosX(0);
        setPosY(0);
      }
      setSizeWidth(0);
      setSizeHeight(0);
      return;
    }

    const bound = selectedObject.getBoundingRect();
    const w = bound.width;
    const h = bound.height;

    // Size tab
    setSizeWidth(pxToUnit(w, pageConfig.units, unitDecimals));
    setSizeHeight(pxToUnit(h, pageConfig.units, unitDecimals));

    // Scale tab
    setScaleXPercent(Math.round((selectedObject.scaleX || 1) * 100));
    setScaleYPercent(Math.round((selectedObject.scaleY || 1) * 100));

    // Rotate tab
    setRotateAngle(Math.round(selectedObject.angle || 0));

    // Position tab
    if (!relativePos) {
      const col = anchor % 3;
      const row = Math.floor(anchor / 3);
      const absX = bound.left + (col / 2) * w;
      const absY = bound.top + (row / 2) * h;
      setPosX(pxToUnit(absX, pageConfig.units, unitDecimals));
      setPosY(pxToUnit(absY, pageConfig.units, unitDecimals));
    }
  }, [selectedObject, anchor, relativePos, pageConfig.units]);

  // When clicking an anchor in Position mode with Relative Position active,
  // NuraDraw calculates the directional shift (dx, dy)
  const handleAnchorClick = (idx: number) => {
    setAnchor(idx);
    if (activeTab === 'position' && relativePos && selectedObject) {
      const bound = selectedObject.getBoundingRect();
      const col = idx % 3; // 0: -w, 1: 0, 2: +w
      const row = Math.floor(idx / 3); // 0: -h, 1: 0, 2: +h

      let dxPx = 0;
      let dyPx = 0;

      if (col === 0) dxPx = -bound.width;
      else if (col === 2) dxPx = bound.width;

      if (row === 0) dyPx = -bound.height;
      else if (row === 2) dyPx = bound.height;

      setPosX(pxToUnit(dxPx, pageConfig.units, unitDecimals));
      setPosY(pxToUnit(dyPx, pageConfig.units, unitDecimals));
    } else if (activeTab === 'position' && !relativePos && selectedObject) {
      const bound = selectedObject.getBoundingRect();
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const absX = bound.left + (col / 2) * bound.width;
      const absY = bound.top + (row / 2) * bound.height;
      setPosX(pxToUnit(absX, pageConfig.units, unitDecimals));
      setPosY(pxToUnit(absY, pageConfig.units, unitDecimals));
    }
  };

  // Helper to get anchor coordinates in pixels
  const getObjectAnchorPoint = (obj: fabric.FabricObject, anchorIdx: number) => {
    const bound = obj.getBoundingRect();
    const col = anchorIdx % 3;
    const row = Math.floor(anchorIdx / 3);
    return {
      x: bound.left + (col / 2) * bound.width,
      y: bound.top + (row / 2) * bound.height,
      width: bound.width,
      height: bound.height,
      left: bound.left,
      top: bound.top,
    };
  };

  // Handle Apply Transformation
  const handleApply = async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const count = Math.max(0, Math.floor(copies));
    const dxPx = unitToPx(posX, pageConfig.units);
    const dyPx = unitToPx(posY, pageConfig.units);

    if (count === 0) {
      // Direct Transformation on active object
      if (activeTab === 'position') {
        if (relativePos) {
          activeObj.set({
            left: (activeObj.left || 0) + dxPx,
            top: (activeObj.top || 0) + dyPx,
          });
        } else {
          const col = anchor % 3;
          const row = Math.floor(anchor / 3);
          const targetAbsX = unitToPx(posX, pageConfig.units);
          const targetAbsY = unitToPx(posY, pageConfig.units);
          const bound = activeObj.getBoundingRect();
          const currentAnchorX = bound.left + (col / 2) * bound.width;
          const currentAnchorY = bound.top + (row / 2) * bound.height;
          const shiftX = targetAbsX - currentAnchorX;
          const shiftY = targetAbsY - currentAnchorY;
          activeObj.set({
            left: (activeObj.left || 0) + shiftX,
            top: (activeObj.top || 0) + shiftY,
          });
        }
      } else if (activeTab === 'rotate') {
        const rad = (rotateAngle * Math.PI) / 180;
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;
        const relX = currentLeft - anchorPt.x;
        const relY = currentTop - anchorPt.y;
        const newLeft = relX * cos - relY * sin + anchorPt.x;
        const newTop = relX * sin + relY * cos + anchorPt.y;

        activeObj.set({
          angle: ((activeObj.angle || 0) + rotateAngle) % 360,
          left: newLeft,
          top: newTop,
        });
      } else if (activeTab === 'scale') {
        const factorX = scaleXPercent / 100;
        const factorY = scaleYPercent / 100;
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;
        const newScaleX = (activeObj.scaleX || 1) * factorX;
        const newScaleY = (activeObj.scaleY || 1) * factorY;

        activeObj.set({
          scaleX: newScaleX,
          scaleY: newScaleY,
          left: anchorPt.x + (currentLeft - anchorPt.x) * factorX,
          top: anchorPt.y + (currentTop - anchorPt.y) * factorY,
        });
      } else if (activeTab === 'size') {
        const targetWPx = unitToPx(sizeWidth, pageConfig.units);
        const targetHPx = unitToPx(sizeHeight, pageConfig.units);
        const bound = activeObj.getBoundingRect();
        const factorX = targetWPx / (bound.width || 1);
        const factorY = targetHPx / (bound.height || 1);
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;
        activeObj.set({
          scaleX: (activeObj.scaleX || 1) * factorX,
          scaleY: (activeObj.scaleY || 1) * factorY,
          left: anchorPt.x + (currentLeft - anchorPt.x) * factorX,
          top: anchorPt.y + (currentTop - anchorPt.y) * factorY,
        });
      } else if (activeTab === 'skew') {
        activeObj.set({
          skewX: (activeObj.skewX || 0) + skewH,
          skewY: (activeObj.skewY || 0) + skewV,
        });
      }

      activeObj.setCoords();
      canvas.requestRenderAll();
      onRefresh?.();
      return;
    }

    // Step-and-Repeat Copies (NuraDraw signature functionality)
    let lastCloned: fabric.FabricObject = activeObj;

    for (let c = 1; c <= count; c++) {
      const cloned = await activeObj.clone();
      ensureObjectId(cloned, `${(activeObj as any).name || activeObj.type} (Copy ${c})`);
      if ((activeObj as any).isPowerClipContent) {
        (cloned as any).isPowerClipContent = true;
      }

      if (activeTab === 'position') {
        if (relativePos) {
          cloned.set({
            left: (activeObj.left || 0) + dxPx * c,
            top: (activeObj.top || 0) + dyPx * c,
          });
        } else {
          cloned.set({
            left: (activeObj.left || 0) + dxPx * c,
            top: (activeObj.top || 0) + dyPx * c,
          });
        }
      } else if (activeTab === 'rotate') {
        const totalAngle = rotateAngle * c;
        const rad = (totalAngle * Math.PI) / 180;
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;
        const relX = currentLeft - anchorPt.x;
        const relY = currentTop - anchorPt.y;
        const newLeft = relX * cos - relY * sin + anchorPt.x;
        const newTop = relX * sin + relY * cos + anchorPt.y;

        cloned.set({
          angle: ((activeObj.angle || 0) + totalAngle) % 360,
          left: newLeft,
          top: newTop,
        });
      } else if (activeTab === 'scale') {
        const factorX = Math.pow(scaleXPercent / 100, c);
        const factorY = Math.pow(scaleYPercent / 100, c);
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;

        cloned.set({
          scaleX: (activeObj.scaleX || 1) * factorX,
          scaleY: (activeObj.scaleY || 1) * factorY,
          left: anchorPt.x + (currentLeft - anchorPt.x) * factorX,
          top: anchorPt.y + (currentTop - anchorPt.y) * factorY,
        });
      } else if (activeTab === 'size') {
        const targetWPx = unitToPx(sizeWidth, pageConfig.units);
        const targetHPx = unitToPx(sizeHeight, pageConfig.units);
        const bound = activeObj.getBoundingRect();
        const factorX = targetWPx / (bound.width || 1);
        const factorY = targetHPx / (bound.height || 1);
        const anchorPt = getObjectAnchorPoint(activeObj, anchor);

        const currentLeft = activeObj.left || 0;
        const currentTop = activeObj.top || 0;
        cloned.set({
          scaleX: (activeObj.scaleX || 1) * factorX,
          scaleY: (activeObj.scaleY || 1) * factorY,
          left: anchorPt.x + (currentLeft - anchorPt.x) * factorX,
          top: anchorPt.y + (currentTop - anchorPt.y) * factorY,
        });
      } else if (activeTab === 'skew') {
        cloned.set({
          skewX: (activeObj.skewX || 0) + skewH * c,
          skewY: (activeObj.skewY || 0) + skewV * c,
        });
      }

      cloned.setCoords();
      canvas.add(cloned);
      lastCloned = cloned;
    }

    canvas.setActiveObject(lastCloned);
    canvas.requestRenderAll();
    onRefresh?.();
  };

  // Flip Horizontal
  const handleFlipH = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('flipX', !obj.flipX);
    obj.setCoords();
    canvas.requestRenderAll();
    onRefresh?.();
  };

  // Flip Vertical
  const handleFlipV = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('flipY', !obj.flipY);
    obj.setCoords();
    canvas.requestRenderAll();
    onRefresh?.();
  };

  return (
    <div
      className={`w-full select-none text-xs flex flex-col font-sans transition-colors ${
        isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'
      }`}
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {/* Title Header: Transform >> ✕ */}
      <div
        className={`h-7 px-2.5 flex items-center justify-between border-b ${
          isDark
            ? 'bg-[#545860] border-[#6a6e77] text-zinc-100'
            : 'bg-[#e9eaec] border-[#abadb3] text-zinc-800'
        }`}
      >
        <span className="font-semibold text-[12px] tracking-wide">Transform</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCollapse || onClose}
            title="Collapse Docker (>>)"
            className={`p-0.5 rounded-xs transition ${
              isDark ? 'hover:bg-[#62666f] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
            }`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Docker"
              className={`p-0.5 rounded-xs transition ${
                isDark ? 'hover:bg-[#62666f] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top 5 Tab Icons (Position, Rotate, Scale/Mirror, Size, Skew) */}
      <div
        className={`h-8 px-1 flex items-center gap-0.5 border-b ${
          isDark ? 'bg-[#46494f] border-[#646870]' : 'bg-[#e2e4e8] border-[#abadb3]'
        }`}
      >
        {/* Tab 1: Position */}
        <button
          onClick={() => setActiveTab('position')}
          title="Position (Alt+F7)"
          className={`flex-1 h-7 flex items-center justify-center rounded-xs transition ${
            activeTab === 'position'
              ? isDark
                ? 'bg-[#4d5056] text-white shadow-xs border border-[#6a6e77] border-b-transparent'
                : 'bg-[#f4f5f7] text-black shadow-xs border border-[#abadb3] border-b-transparent'
              : isDark
              ? 'text-zinc-300 hover:bg-[#575b63] hover:text-white'
              : 'text-zinc-700 hover:bg-[#d5d8de]'
          }`}
        >
          {/* NuraDraw crosshair with 4 arrowheads icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M8 1v14M1 8h14" />
            <path d="M5.5 3.5L8 1l2.5 2.5M5.5 12.5L8 15l2.5-2.5M3.5 5.5L1 8l2.5 2.5M12.5 5.5L15 8l-2.5 2.5" />
          </svg>
        </button>

        {/* Tab 2: Rotate */}
        <button
          onClick={() => setActiveTab('rotate')}
          title="Rotate (Alt+F8)"
          className={`flex-1 h-7 flex items-center justify-center rounded-xs transition ${
            activeTab === 'rotate'
              ? isDark
                ? 'bg-[#4d5056] text-white shadow-xs border border-[#6a6e77] border-b-transparent'
                : 'bg-[#f4f5f7] text-black shadow-xs border border-[#abadb3] border-b-transparent'
              : isDark
              ? 'text-zinc-300 hover:bg-[#575b63] hover:text-white'
              : 'text-zinc-700 hover:bg-[#d5d8de]'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Tab 3: Scale and Mirror */}
        <button
          onClick={() => setActiveTab('scale')}
          title="Scale and Mirror (Alt+F9)"
          className={`flex-1 h-7 flex items-center justify-center rounded-xs transition ${
            activeTab === 'scale'
              ? isDark
                ? 'bg-[#4d5056] text-white shadow-xs border border-[#6a6e77] border-b-transparent'
                : 'bg-[#f4f5f7] text-black shadow-xs border border-[#abadb3] border-b-transparent'
              : isDark
              ? 'text-zinc-300 hover:bg-[#575b63] hover:text-white'
              : 'text-zinc-700 hover:bg-[#d5d8de]'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 13V3l5 5-5 5zm7 0V3l5 5-5 5z" opacity="0.85" />
            <path d="M7.5 1v14h1V1h-1z" />
          </svg>
        </button>

        {/* Tab 4: Size */}
        <button
          onClick={() => setActiveTab('size')}
          title="Size (Alt+F10)"
          className={`flex-1 h-7 flex items-center justify-center rounded-xs transition ${
            activeTab === 'size'
              ? isDark
                ? 'bg-[#4d5056] text-white shadow-xs border border-[#6a6e77] border-b-transparent'
                : 'bg-[#f4f5f7] text-black shadow-xs border border-[#abadb3] border-b-transparent'
              : isDark
              ? 'text-zinc-300 hover:bg-[#575b63] hover:text-white'
              : 'text-zinc-700 hover:bg-[#d5d8de]'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2.5" width="12" height="11" strokeDasharray="2 2" />
            <path d="M5 8h6M8 5v6" />
          </svg>
        </button>

        {/* Tab 5: Skew */}
        <button
          onClick={() => setActiveTab('skew')}
          title="Skew (Alt+F11)"
          className={`flex-1 h-7 flex items-center justify-center rounded-xs transition ${
            activeTab === 'skew'
              ? isDark
                ? 'bg-[#4d5056] text-white shadow-xs border border-[#6a6e77] border-b-transparent'
                : 'bg-[#f4f5f7] text-black shadow-xs border border-[#abadb3] border-b-transparent'
              : isDark
              ? 'text-zinc-300 hover:bg-[#575b63] hover:text-white'
              : 'text-zinc-700 hover:bg-[#d5d8de]'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 3h8l-2 10H3l2-10z" />
          </svg>
        </button>
      </div>

      {/* Docker Body */}
      <div className="p-3 space-y-3.5">
        {/* Subtitle */}
        <div className="font-bold text-[12px] capitalize tracking-tight">
          {activeTab === 'position' && 'Position'}
          {activeTab === 'rotate' && 'Rotate'}
          {activeTab === 'scale' && 'Scale and mirror'}
          {activeTab === 'size' && 'Size'}
          {activeTab === 'skew' && 'Skew'}
        </div>

        {/* TAB 1: POSITION (Matches Exact Screenshot) */}
        {activeTab === 'position' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* 3×3 Reference Point Grid */}
              <div
                className={`w-11 h-11 border p-1 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xs shrink-0 ${
                  isDark ? 'bg-[#45484e] border-[#686c75]' : 'bg-white border-[#abadb3]'
                }`}
                title="Reference Point (Anchor)"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnchorClick(idx)}
                    className={`w-full h-full border transition rounded-none ${
                      anchor === idx
                        ? isDark
                          ? 'bg-blue-400 border-white'
                          : 'bg-black border-black'
                        : isDark
                        ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600'
                        : 'bg-white border-[#707070] hover:bg-[#e1e4e8]'
                    }`}
                  />
                ))}
              </div>

              {/* X and Y Inputs with NuraDraw Up/Down Steppers */}
              <div className="flex-1 space-y-1.5">
                {/* X Input */}
                <div className="flex items-center">
                  <span className="w-4 font-mono text-[11px] text-zinc-500">X:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={unitStep}
                      value={posX}
                      onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                      className={`w-full h-6 px-1.5 pr-8 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-4 text-[10px] text-zinc-400 pointer-events-none">
                      {unitInfo.symbol}
                    </span>
                    <div className="absolute right-0 top-0 bottom-0 w-3.5 flex flex-col border-l border-inherit">
                      <button
                        type="button"
                        onClick={() => setPosX((v) => parseFloat((v + unitStep).toFixed(unitDecimals)))}
                        className={`h-3 flex items-center justify-center hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosX((v) => parseFloat((v - unitStep).toFixed(unitDecimals)))}
                        className={`h-3 flex items-center justify-center border-t border-inherit hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Y Input */}
                <div className="flex items-center">
                  <span className="w-4 font-mono text-[11px] text-zinc-500">Y:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={unitStep}
                      value={posY}
                      onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                      className={`w-full h-6 px-1.5 pr-8 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-4 text-[10px] text-zinc-400 pointer-events-none">
                      {unitInfo.symbol}
                    </span>
                    <div className="absolute right-0 top-0 bottom-0 w-3.5 flex flex-col border-l border-inherit">
                      <button
                        type="button"
                        onClick={() => setPosY((v) => parseFloat((v + unitStep).toFixed(unitDecimals)))}
                        className={`h-3 flex items-center justify-center hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosY((v) => parseFloat((v - unitStep).toFixed(unitDecimals)))}
                        className={`h-3 flex items-center justify-center border-t border-inherit hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Relative Position Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer ml-14 text-xs font-normal">
              <input
                type="checkbox"
                checked={relativePos}
                onChange={(e) => setRelativePos(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0078d7] rounded-xs"
              />
              <span>Relative Position</span>
            </label>
          </div>
        )}

        {/* TAB 2: ROTATE */}
        {activeTab === 'rotate' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* 3×3 Anchor Grid */}
              <div
                className={`w-11 h-11 border p-1 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xs shrink-0 ${
                  isDark ? 'bg-[#45484e] border-[#686c75]' : 'bg-white border-[#abadb3]'
                }`}
                title="Center of Rotation"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnchor(idx)}
                    className={`w-full h-full border transition rounded-none ${
                      anchor === idx
                        ? isDark
                          ? 'bg-blue-400 border-white'
                          : 'bg-black border-black'
                        : isDark
                        ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600'
                        : 'bg-white border-[#707070] hover:bg-[#e1e4e8]'
                    }`}
                  />
                ))}
              </div>

              {/* Angle Input */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center">
                  <span className="w-10 text-[11px] text-zinc-500">Angle:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={5}
                      value={rotateAngle}
                      onChange={(e) => setRotateAngle(parseFloat(e.target.value) || 0)}
                      className={`w-full h-6 px-1.5 pr-8 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-4 text-[10px] text-zinc-400 pointer-events-none">°</span>
                    <div className="absolute right-0 top-0 bottom-0 w-3.5 flex flex-col border-l border-inherit">
                      <button
                        type="button"
                        onClick={() => setRotateAngle((v) => (v + 15) % 360)}
                        className={`h-3 flex items-center justify-center hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotateAngle((v) => (v - 15 + 360) % 360)}
                        className={`h-3 flex items-center justify-center border-t border-inherit hover:bg-blue-500 hover:text-white ${
                          isDark ? 'bg-[#575b63]' : 'bg-[#e1e1e1]'
                        }`}
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={relativeCenter}
                    onChange={(e) => setRelativeCenter(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#0078d7]"
                  />
                  <span>Relative Center</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SCALE AND MIRROR */}
        {activeTab === 'scale' && (
          <div className="space-y-3">
            {/* Mirror Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFlipH}
                className={`flex-1 h-6 px-2 flex items-center justify-center gap-1.5 border rounded-xs ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-[#e1e1e1] border-[#abadb3] hover:bg-[#d0d0d0] text-black'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="text-[11px]">Mirror Horizontally</span>
              </button>
              <button
                type="button"
                onClick={handleFlipV}
                className={`flex-1 h-6 px-2 flex items-center justify-center gap-1.5 border rounded-xs ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-[#e1e1e1] border-[#abadb3] hover:bg-[#d0d0d0] text-black'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span className="text-[11px]">Mirror Vertically</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* 3×3 Anchor Grid */}
              <div
                className={`w-11 h-11 border p-1 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xs shrink-0 ${
                  isDark ? 'bg-[#45484e] border-[#686c75]' : 'bg-white border-[#abadb3]'
                }`}
                title="Anchor Point"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnchor(idx)}
                    className={`w-full h-full border transition rounded-none ${
                      anchor === idx
                        ? isDark
                          ? 'bg-blue-400 border-white'
                          : 'bg-black border-black'
                        : isDark
                        ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600'
                        : 'bg-white border-[#707070] hover:bg-[#e1e4e8]'
                    }`}
                  />
                ))}
              </div>

              {/* Scale X & Y */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">X:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={5}
                      value={scaleXPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setScaleXPercent(val);
                        if (proportionalScale) setScaleYPercent(val);
                      }}
                      className={`w-full h-6 px-1.5 pr-6 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">%</span>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">Y:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={5}
                      value={scaleYPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setScaleYPercent(val);
                        if (proportionalScale) setScaleXPercent(val);
                      }}
                      className={`w-full h-6 px-1.5 pr-6 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs ml-14">
              <input
                type="checkbox"
                checked={proportionalScale}
                onChange={(e) => setProportionalScale(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0078d7]"
              />
              <span>Proportional</span>
            </label>
          </div>
        )}

        {/* TAB 4: SIZE */}
        {activeTab === 'size' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* 3×3 Anchor Grid */}
              <div
                className={`w-11 h-11 border p-1 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xs shrink-0 ${
                  isDark ? 'bg-[#45484e] border-[#686c75]' : 'bg-white border-[#abadb3]'
                }`}
                title="Anchor Point"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnchor(idx)}
                    className={`w-full h-full border transition rounded-none ${
                      anchor === idx
                        ? isDark
                          ? 'bg-blue-400 border-white'
                          : 'bg-black border-black'
                        : isDark
                        ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600'
                        : 'bg-white border-[#707070] hover:bg-[#e1e4e8]'
                    }`}
                  />
                ))}
              </div>

              {/* Width and Height */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">X:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={unitStep}
                      value={sizeWidth}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (maintainAspect && sizeWidth > 0) {
                          const ratio = val / sizeWidth;
                          setSizeHeight(parseFloat((sizeHeight * ratio).toFixed(unitDecimals)));
                        }
                        setSizeWidth(val);
                      }}
                      className={`w-full h-6 px-1.5 pr-8 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">
                      {unitInfo.symbol}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">Y:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={unitStep}
                      value={sizeHeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (maintainAspect && sizeHeight > 0) {
                          const ratio = val / sizeHeight;
                          setSizeWidth(parseFloat((sizeWidth * ratio).toFixed(unitDecimals)));
                        }
                        setSizeHeight(val);
                      }}
                      className={`w-full h-6 px-1.5 pr-8 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">
                      {unitInfo.symbol}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs ml-14">
              <input
                type="checkbox"
                checked={!maintainAspect}
                onChange={(e) => setMaintainAspect(!e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0078d7]"
              />
              <span>Non-proportional</span>
            </label>
          </div>
        )}

        {/* TAB 5: SKEW */}
        {activeTab === 'skew' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* 3×3 Anchor Grid */}
              <div
                className={`w-11 h-11 border p-1 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xs shrink-0 ${
                  isDark ? 'bg-[#45484e] border-[#686c75]' : 'bg-white border-[#abadb3]'
                }`}
                title="Anchor Point"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnchor(idx)}
                    className={`w-full h-full border transition rounded-none ${
                      anchor === idx
                        ? isDark
                          ? 'bg-blue-400 border-white'
                          : 'bg-black border-black'
                        : isDark
                        ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600'
                        : 'bg-white border-[#707070] hover:bg-[#e1e4e8]'
                    }`}
                  />
                ))}
              </div>

              {/* Skew H and V */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">H:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={5}
                      value={skewH}
                      onChange={(e) => setSkewH(parseFloat(e.target.value) || 0)}
                      className={`w-full h-6 px-1.5 pr-6 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">°</span>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-8 text-[11px] text-zinc-500">V:</span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="number"
                      step={5}
                      value={skewV}
                      onChange={(e) => setSkewV(parseFloat(e.target.value) || 0)}
                      className={`w-full h-6 px-1.5 pr-6 border rounded-xs font-mono text-xs ${
                        isDark
                          ? 'bg-[#3e4147] border-[#686c75] text-white'
                          : 'bg-white border-[#abadb3] text-black'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] text-zinc-400 pointer-events-none">°</span>
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs ml-14">
              <input
                type="checkbox"
                checked={useAnchorPoint}
                onChange={(e) => setUseAnchorPoint(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0078d7]"
              />
              <span>Use Anchor Point</span>
            </label>
          </div>
        )}

        {/* Copies Spinner Input (Direct match to screenshot) */}
        <div className="pt-1 flex items-center justify-center gap-3">
          <span className="text-xs text-zinc-700 dark:text-zinc-300">Copies:</span>
          <div className="relative w-20 flex items-center">
            <input
              type="number"
              min={0}
              max={99}
              value={copies}
              onChange={(e) => setCopies(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={`w-full h-6 px-2 pr-5 border rounded-xs font-mono text-xs text-left ${
                isDark
                  ? 'bg-[#3e4147] border-[#686c75] text-white'
                  : 'bg-white border-[#abadb3] text-black'
              }`}
            />
            <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col border-l border-inherit">
              <button
                type="button"
                onClick={() => setCopies((c) => Math.min(99, c + 1))}
                className={`h-3 flex items-center justify-center hover:bg-blue-500 hover:text-white ${
                  isDark ? 'bg-[#575b63] text-zinc-200' : 'bg-[#e1e1e1] text-zinc-700'
                }`}
              >
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => setCopies((c) => Math.max(0, c - 1))}
                className={`h-3 flex items-center justify-center border-t border-inherit hover:bg-blue-500 hover:text-white ${
                  isDark ? 'bg-[#575b63] text-zinc-200' : 'bg-[#e1e1e1] text-zinc-700'
                }`}
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Apply Button (Full Width, NuraDraw grey bevel style) */}
        <button
          type="button"
          onClick={handleApply}
          className={`w-full h-7 rounded-xs font-medium text-xs tracking-wide transition border shadow-xs flex items-center justify-center ${
            isDark
              ? 'bg-[#5a5e66] hover:bg-[#666a73] active:bg-[#494c52] border-[#767a83] text-white'
              : 'bg-[#e1e1e1] hover:bg-[#d4d4d4] active:bg-[#c0c0c0] border-[#abadb3] text-black'
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  );
};
