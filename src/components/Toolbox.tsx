import React, { useState, useRef, useEffect } from 'react';
import {
  IconPick,
  IconShape,
  IconCrop,
  IconKnife,
  IconVirtualSegmentDelete,
  IconEraser,
  IconZoom,
  IconFreehand,
  IconLine2P,
  IconBezier,
  IconPen,
  IconBSpline,
  IconPolyline,
  IconCurve3P,
  IconArtisticMedia,
  IconRectangle,
  IconEllipse,
  IconPolygon,
  IconText,
  IconTable,
  IconDimension,
  IconHVDimension,
  IconAngularDimension,
  IconSegmentDimension,
  IconCallout,
  IconConnector,
  IconShadow,
  IconContour,
  IconBlend,
  IconDistort,
  IconEnvelope,
  IconExtrude,
  IconBlockShadow,
  IconTransparency,
  IconEyedropper,
  IconInteractiveFill,
  IconGear,
} from './NuraToolIcons';
import { ToolType, ThemeMode } from '../types';
import { Plus, ChevronsRight, QrCode } from 'lucide-react';

interface ToolboxProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  theme?: ThemeMode;
  onOpenSettings?: () => void;
  onOpenQrCode?: () => void;
}

interface SubTool {
  id: ToolType;
  key?: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  dividerBefore?: boolean;
}

interface ToolGroup {
  id: string;
  activeId: ToolType;
  defaultId: ToolType;
  subTools: SubTool[];
  hasDividerAfter?: boolean;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  activeTool,
  onSelectTool,
  theme = 'light',
  onOpenSettings,
  onOpenQrCode,
}) => {
  const [openFlyoutGroupId, setOpenFlyoutGroupId] = useState<string | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ top: number; left: number }>({ top: 0, left: 40 });
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const flyoutTimerRef = useRef<any>(null);
  const isDark = theme === 'dark';

  // Maintain which specific tool in each group is currently selected
  const [groupSelections, setGroupSelections] = useState<{ [groupId: string]: ToolType }>({
    pickGroup: 'pick',
    shapeGroup: 'shape',
    cropGroup: 'crop',
    zoomGroup: 'zoom',
    freehandGroup: 'freehand',
    artisticGroup: 'artistic_media',
    rectGroup: 'rectangle',
    ellipseGroup: 'ellipse',
    polyGroup: 'polygon',
    textGroup: 'text',
    dimGroup: 'dimension',
    connGroup: 'connector',
    effectGroup: 'shadow',
    transGroup: 'transparency',
    eyeGroup: 'eyedropper',
    fillGroup: 'gradient',
  });

  const toolGroups: ToolGroup[] = [
    {
      id: 'pickGroup',
      activeId: groupSelections.pickGroup || 'pick',
      defaultId: 'pick',
      hasDividerAfter: false,
      subTools: [
        { id: 'pick', label: 'Pick Tool', shortcut: 'V', icon: <IconPick className="w-4 h-4" /> },
        { id: 'freehand_pick', label: 'Freehand Pick', icon: <IconPick className="w-4 h-4 text-emerald-600" /> },
      ],
    },
    {
      id: 'shapeGroup',
      activeId: groupSelections.shapeGroup || 'shape',
      defaultId: 'shape',
      hasDividerAfter: true,
      subTools: [
        { id: 'shape', label: 'Shape Tool', shortcut: 'F10', icon: <IconShape className="w-4 h-4" /> },
        { id: 'smooth', label: 'Smooth Tool', icon: <IconShape className="w-4 h-4 text-emerald-600" /> },
      ],
    },
    {
      id: 'cropGroup',
      activeId: groupSelections.cropGroup || 'crop',
      defaultId: 'crop',
      hasDividerAfter: false,
      subTools: [
        { id: 'crop', label: 'Crop', icon: <IconCrop className="w-4 h-4" /> },
        { id: 'knife', label: 'Knife', icon: <IconKnife className="w-4 h-4" /> },
        { id: 'virtual_segment_delete', label: 'Virtual Segment Delete', icon: <IconVirtualSegmentDelete className="w-4 h-4" /> },
        { id: 'eraser', label: 'Eraser', shortcut: 'X', dividerBefore: true, icon: <IconEraser className="w-4 h-4" /> },
      ],
    },
    {
      id: 'zoomGroup',
      activeId: groupSelections.zoomGroup || 'zoom',
      defaultId: 'zoom',
      hasDividerAfter: true,
      subTools: [
        { id: 'zoom', label: 'Zoom Tool', shortcut: 'F2', icon: <IconZoom className="w-4 h-4" /> },
        { id: 'pan', label: 'Pan Hand Tool', shortcut: 'H', icon: <IconZoom className="w-4 h-4 text-blue-600" /> },
      ],
    },
    {
      id: 'freehandGroup',
      activeId: groupSelections.freehandGroup || 'freehand',
      defaultId: 'freehand',
      hasDividerAfter: false,
      subTools: [
        { id: 'freehand', label: 'Freehand', shortcut: 'F5', icon: <IconFreehand className="w-4 h-4" /> },
        { id: 'line2p', label: '2-Point Line', icon: <IconLine2P className="w-4 h-4" /> },
        { id: 'bezier', label: 'Bézier', icon: <IconBezier className="w-4 h-4" /> },
        { id: 'pen', label: 'Pen', icon: <IconPen className="w-4 h-4" /> },
        { id: 'b_spline', label: 'B-Spline', icon: <IconBSpline className="w-4 h-4" /> },
        { id: 'polyline', label: 'Polyline', icon: <IconPolyline className="w-4 h-4" /> },
        { id: 'curve_3p', label: '3-Point Curve', icon: <IconCurve3P className="w-4 h-4" /> },
      ],
    },
    {
      id: 'artisticGroup',
      activeId: groupSelections.artisticGroup || 'artistic_media',
      defaultId: 'artistic_media',
      hasDividerAfter: false,
      subTools: [
        { id: 'artistic_media', label: 'Artistic Media', icon: <IconArtisticMedia className="w-4 h-4" /> },
      ],
    },
    {
      id: 'rectGroup',
      activeId: groupSelections.rectGroup || 'rectangle',
      defaultId: 'rectangle',
      hasDividerAfter: false,
      subTools: [
        { id: 'rectangle', label: 'Rectangle Tool', shortcut: 'F6', icon: <IconRectangle className="w-4 h-4" /> },
        { id: 'rect3p', label: '3-Point Rectangle', icon: <IconRectangle className="w-4 h-4 text-emerald-600" /> },
      ],
    },
    {
      id: 'ellipseGroup',
      activeId: groupSelections.ellipseGroup || 'ellipse',
      defaultId: 'ellipse',
      hasDividerAfter: false,
      subTools: [
        { id: 'ellipse', label: 'Ellipse Tool', shortcut: 'F7', icon: <IconEllipse className="w-4 h-4" /> },
        { id: 'ellipse3p', label: '3-Point Ellipse', icon: <IconEllipse className="w-4 h-4 text-emerald-600" /> },
      ],
    },
    {
      id: 'polyGroup',
      activeId: groupSelections.polyGroup || 'polygon',
      defaultId: 'polygon',
      hasDividerAfter: true,
      subTools: [
        { id: 'polygon', label: 'Polygon Tool', shortcut: 'Y', icon: <IconPolygon className="w-4 h-4" /> },
        { id: 'star', label: 'Star Tool', icon: <IconPolygon className="w-4 h-4 text-amber-500" /> },
        { id: 'spiral', label: 'Spiral Tool', shortcut: 'A', icon: <IconPolygon className="w-4 h-4 text-purple-600" /> },
      ],
    },
    {
      id: 'textGroup',
      activeId: groupSelections.textGroup || 'text',
      defaultId: 'text',
      hasDividerAfter: true,
      subTools: [
        { id: 'text', key: 'artistic_text', label: 'Text Tool', shortcut: 'F8', icon: <IconText className="w-4 h-4" /> },
        { id: 'text', key: 'paragraph_text', label: 'Paragraph / Artistic Text', shortcut: 'F8', icon: <IconText className="w-4 h-4 text-emerald-600" /> },
        { id: 'text', key: 'table_tool', label: 'Table Tool', icon: <IconTable className="w-4 h-4 text-blue-600" /> },
      ],
    },
    {
      id: 'dimGroup',
      activeId: groupSelections.dimGroup || 'dimension',
      defaultId: 'dimension',
      hasDividerAfter: false,
      subTools: [
        { id: 'dimension', label: 'Parallel Dimension', icon: <IconDimension className="w-4 h-4" /> },
        { id: 'hv_dimension', label: 'Horizontal or Vertical Dimension', icon: <IconHVDimension className="w-4 h-4" /> },
        { id: 'angular_dimension', label: 'Angular Dimension', icon: <IconAngularDimension className="w-4 h-4" /> },
        { id: 'segment_dimension', label: 'Segment Dimension', icon: <IconSegmentDimension className="w-4 h-4" /> },
        { id: 'callout', label: '2-Leg Callout', dividerBefore: true, icon: <IconCallout className="w-4 h-4" /> },
      ],
    },
    {
      id: 'connGroup',
      activeId: groupSelections.connGroup || 'connector',
      defaultId: 'connector',
      hasDividerAfter: true,
      subTools: [
        { id: 'connector', label: 'Straight-Line Connector', icon: <IconConnector className="w-4 h-4" /> },
      ],
    },
    {
      id: 'effectGroup',
      activeId: groupSelections.effectGroup || 'shadow',
      defaultId: 'shadow',
      hasDividerAfter: false,
      subTools: [
        { id: 'shadow', label: 'Shadow', icon: <IconShadow className="w-4 h-4" /> },
        { id: 'contour', label: 'Contour', icon: <IconContour className="w-4 h-4" /> },
        { id: 'blend', label: 'Blend', icon: <IconBlend className="w-4 h-4" /> },
        { id: 'distort', label: 'Distort', icon: <IconDistort className="w-4 h-4" /> },
        { id: 'envelope', label: 'Envelope', icon: <IconEnvelope className="w-4 h-4" /> },
        { id: 'extrude', label: 'Extrude', icon: <IconExtrude className="w-4 h-4" /> },
        { id: 'block_shadow', label: 'Block Shadow', icon: <IconBlockShadow className="w-4 h-4" /> },
      ],
    },
    {
      id: 'transGroup',
      activeId: groupSelections.transGroup || 'transparency',
      defaultId: 'transparency',
      hasDividerAfter: true,
      subTools: [
        { id: 'transparency', label: 'Transparency Tool', icon: <IconTransparency className="w-4 h-4" /> },
      ],
    },
    {
      id: 'eyeGroup',
      activeId: groupSelections.eyeGroup || 'eyedropper',
      defaultId: 'eyedropper',
      hasDividerAfter: false,
      subTools: [
        { id: 'eyedropper', label: 'Color Eyedropper', shortcut: 'I', icon: <IconEyedropper className="w-4 h-4" /> },
      ],
    },
    {
      id: 'fillGroup',
      activeId: groupSelections.fillGroup || 'gradient',
      defaultId: 'gradient',
      hasDividerAfter: true,
      subTools: [
        { id: 'gradient', label: 'Interactive Fill', shortcut: 'G', icon: <IconInteractiveFill className="w-4 h-4" /> },
        { id: 'smart_fill', label: 'Smart Fill Tool', icon: <IconInteractiveFill className="w-4 h-4 text-amber-500" /> },
      ],
    },
  ];

  useEffect(() => {
    setGroupSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const g of toolGroups) {
        if (g.subTools.some((st) => st.id === activeTool) && prev[g.id] !== activeTool) {
          next[g.id] = activeTool;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeTool]);

  const openFlyoutForGroup = (groupId: string, itemCount: number) => {
    const btn = buttonRefs.current[groupId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const estimatedHeight = Math.max(80, itemCount * 28 + 20);
      const clampedTop = Math.max(8, Math.min(rect.top, window.innerHeight - estimatedHeight - 8));
      setFlyoutCoords({
        top: clampedTop,
        left: rect.right + 4,
      });
    }
    setOpenFlyoutGroupId(groupId);
  };

  useEffect(() => {
    if (!openFlyoutGroupId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (flyoutRef.current && flyoutRef.current.contains(target)) return;
      const triggerBtn = buttonRefs.current[openFlyoutGroupId];
      if (triggerBtn && triggerBtn.contains(target)) return;
      setOpenFlyoutGroupId(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFlyoutGroupId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [openFlyoutGroupId]);

  const handleToolClick = (group: ToolGroup) => {
    if (group.id === 'effectGroup' || group.id === 'freehandGroup' || group.id === 'cropGroup') {
      if (openFlyoutGroupId === group.id) {
        setOpenFlyoutGroupId(null);
        return;
      }
      onSelectTool(group.activeId);
      openFlyoutForGroup(group.id, group.subTools.length);
      return;
    }

    const isGroupCurrentlyActive = group.subTools.some((st) => st.id === activeTool);
    if (isGroupCurrentlyActive && group.subTools.length > 1) {
      if (openFlyoutGroupId === group.id) {
        setOpenFlyoutGroupId(null);
      } else {
        openFlyoutForGroup(group.id, group.subTools.length);
      }
      return;
    }
    const currentTool = group.activeId;
    onSelectTool(currentTool);
    setOpenFlyoutGroupId(null);
  };

  const handleSelectSubTool = (groupId: string, subToolId: ToolType) => {
    setGroupSelections((prev) => ({ ...prev, [groupId]: subToolId }));
    onSelectTool(subToolId);
    setOpenFlyoutGroupId(null);
  };

  const handleMouseEnterGroup = (_groupId: string) => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
  };

  const handleFlyoutArrowClick = (e: React.MouseEvent, group: ToolGroup) => {
    e.stopPropagation();
    if (openFlyoutGroupId === group.id) {
      setOpenFlyoutGroupId(null);
    } else {
      openFlyoutForGroup(group.id, group.subTools.length);
    }
  };

  return (
    <aside
      className={`w-9 shrink-0 border-r flex flex-col items-center py-1 select-none z-30 shadow-xs transition-colors overflow-y-auto overflow-x-visible ${
        isDark ? 'bg-[#4d5056] border-[#646870] text-zinc-100' : 'bg-[#f0f0f2] border-[#d4d4d8] text-zinc-700'
      }`}
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      <div className="flex flex-col items-center w-full px-0.5 gap-0.5">
        {toolGroups.map((group) => {
          const currentActiveToolId = group.activeId;
          const isGroupActive = group.subTools.some((st) => st.id === activeTool);
          const currentSubTool =
            group.subTools.find((st) => st.id === (isGroupActive ? activeTool : currentActiveToolId)) ||
            group.subTools[0];
          const activeFlyout = openFlyoutGroupId === group.id;

          return (
            <React.Fragment key={group.id}>
              <div
                className="relative w-full flex justify-center"
                onMouseEnter={() => handleMouseEnterGroup(group.id)}
              >
                {/* Main Tool Button */}
                <button
                  ref={(el) => {
                    buttonRefs.current[group.id] = el;
                  }}
                  onClick={() => handleToolClick(group)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openFlyoutForGroup(group.id, group.subTools.length);
                  }}
                  title={`${currentSubTool.label} ${currentSubTool.shortcut ? `(${currentSubTool.shortcut})` : ''}\n(Click bottom-right arrow for more tools)`}
                  className={`w-7 h-7 rounded-xs flex items-center justify-center relative transition-all ${
                    isGroupActive || activeFlyout
                      ? isDark
                        ? 'bg-[#3d4045] text-white border border-[#727780] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-sky-400'
                        : 'bg-[#ffffff] text-zinc-900 border border-[#9ca3af] shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] ring-1 ring-zinc-400'
                      : isDark
                      ? 'text-zinc-200 hover:bg-[#5c6068] hover:border hover:border-[#6e737d]'
                      : 'text-zinc-700 hover:bg-[#e4e4e7] hover:border hover:border-zinc-300'
                  }`}
                >
                  {/* Tool Icon */}
                  <div className="flex items-center justify-center">
                    {currentSubTool.icon}
                  </div>

                  {/* Signature NuraDraw Bottom-Right Flyout Triangle */}
                  {group.subTools.length > 1 && (
                    <span
                      onClick={(e) => handleFlyoutArrowClick(e, group)}
                      className="absolute bottom-0 right-0 w-3 h-3 flex items-end justify-end cursor-pointer z-10"
                      title="Open Sub-Commands Dropdown"
                    >
                      <span className={`w-0 h-0 border-b-[4px] border-r-[4px] border-t-[3px] border-l-[3px] border-t-transparent border-l-transparent ${
                        isDark ? 'border-b-zinc-200 border-r-zinc-200' : 'border-b-zinc-800 border-r-zinc-800'
                      }`} />
                    </span>
                  )}
                </button>
              </div>

              {/* Horizontal Group Divider (Matches NuraDraw toolbar dividers in screenshot) */}
              {group.hasDividerAfter && (
                <div className={`w-5 h-px my-0.5 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              )}
            </React.Fragment>
          );
        })}

        {/* QR Code Generator Quick Tool */}
        {onOpenQrCode && (
          <>
            <button
              onClick={onOpenQrCode}
              title="QR Code Generator (Insert Vector QR Code)"
              className={`w-7 h-7 rounded-xs flex items-center justify-center relative transition-all ${
                isDark
                  ? 'text-sky-400 hover:bg-zinc-700 hover:border hover:border-zinc-600'
                  : 'text-[#0078d7] hover:bg-[#e5f1fb] hover:border hover:border-[#99d1ff]'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom Quick Customize [+] and More [>>] buttons */}
        <div className={`w-5 h-px my-0.5 ${isDark ? 'bg-[#646870]' : 'bg-zinc-300'}`} />
        <button
          title="Quick Customize / Add Tools"
          className={`w-7 h-6 flex items-center justify-center rounded-xs text-xs ${
            isDark ? 'text-zinc-300 hover:text-white hover:bg-[#5c6068]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-[#e4e4e7]'
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <button
          title="Toolbar Options"
          className={`w-7 h-5 flex items-center justify-center rounded-xs ${
            isDark ? 'text-zinc-300 hover:text-white hover:bg-[#5c6068]' : 'text-zinc-400 hover:text-zinc-900 hover:bg-[#e4e4e7]'
          }`}
        >
          <ChevronsRight className="w-3 h-3 text-sky-400" />
        </button>

        {/* Divider before Settings */}
        <div className={`w-5 h-px my-1 ${isDark ? 'bg-[#646870]' : 'bg-zinc-300'}`} />

        {/* NuraDraw Options / Tools Cogwheel (Matches bottom of image_8930b229.png) */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => onOpenSettings?.()}
            title="Options / Settings (Ctrl+J)"
            className={`w-7 h-7 rounded-xs flex items-center justify-center relative transition-all ${
              isDark
                ? 'text-zinc-200 hover:bg-[#5c6068] hover:border hover:border-[#6e737d]'
                : 'text-zinc-700 hover:bg-[#e4e4e7] hover:border hover:border-zinc-300'
            }`}
          >
            <IconGear className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {/* Signature NuraDraw Flyout Triangle */}
            <span
              className="absolute bottom-0 right-0 w-0 h-0 border-b-[4px] border-r-[4px] border-b-zinc-800 border-r-zinc-800 border-t-[4px] border-l-[4px] border-t-transparent border-l-transparent pointer-events-none"
            />
          </button>
        </div>
      </div>

      {/* Fixed-position Floating Flyout Dropdown (Escapes overflow-y-auto clipping) */}
      {openFlyoutGroupId && (() => {
        const activeGroup = toolGroups.find((g) => g.id === openFlyoutGroupId);
        if (!activeGroup) return null;
        return (
          <div
            ref={flyoutRef}
            style={{ top: flyoutCoords.top, left: flyoutCoords.left }}
            className={`fixed rounded-xs shadow-2xl py-1 z-[999] min-w-[205px] text-xs ${
              isDark
                ? 'bg-[#4e5157] border border-[#6a6e77] text-zinc-100'
                : 'bg-[#f5f5f7] border border-zinc-400 text-zinc-800'
            }`}
          >
            <div className="py-0.5">
              {activeGroup.subTools.map((sub, subIdx) => {
                const isSelected = activeTool === sub.id;
                return (
                  <React.Fragment key={sub.key || `${activeGroup.id}_${sub.id}_${subIdx}`}>
                    {sub.dividerBefore && (
                      <div className={`my-1 h-px ${isDark ? 'bg-[#646870]' : 'bg-zinc-300'}`} />
                    )}
                    <button
                      onClick={() => handleSelectSubTool(activeGroup.id, sub.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-[#0078d7] hover:text-white transition cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-[#5c6068] font-semibold text-white'
                            : 'bg-[#dde8f5] font-semibold text-zinc-900'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          {sub.icon}
                        </div>
                        <span className="text-[11.5px] whitespace-nowrap">{sub.label}</span>
                      </div>
                      {sub.shortcut && (
                        <span className="text-[10px] opacity-60 font-mono ml-2">
                          {sub.shortcut}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })()}
    </aside>
  );
};
