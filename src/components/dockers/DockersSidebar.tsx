import React from 'react';
import { ChevronsRight, X, Plus } from 'lucide-react';
import * as fabric from 'fabric';
import { PageConfig, PropertyState, ThemeMode } from '../../types';
import { TransformDocker } from './TransformDocker';
import { PropertiesDocker } from './PropertiesDocker';
import { ObjectsDocker } from './ObjectsDocker';
import { AlignDocker } from './AlignDocker';
import { HintsDocker } from './HintsDocker';
import { AiGenerateDocker } from './AiGenerateDocker';
import { ExtendedWindowDockers, ExtendedDockerId } from './ExtendedWindowDockers';

export type DockerId =
  | 'properties'
  | 'transform'
  | 'objects'
  | 'align'
  | 'hints'
  | 'ai_generate'
  | ExtendedDockerId;

const DOCKER_LABELS: Record<DockerId, string> = {
  properties: 'Properties',
  transform: 'Transform',
  objects: 'Objects',
  align: 'Align and Distribute',
  hints: 'Hints',
  ai_generate: 'AI Generate',
  pages: 'Pages',
  comments: 'Comments',
  object_data: 'Object Data',
  object_styles: 'Object Styles',
  symbols: 'Symbols',
  coordinates: 'Coordinates',
  fit_to_path: 'Fit Objects to Path',
  shape: 'Shape',
  corners: 'Corners',
  join_curves: 'Join Curves',
  text: 'Text',
  font_sampler: 'Font Sampler',
  glyphs: 'Glyphs',
  effects: 'Effects',
  color: 'Color',
  palettes: 'Palettes',
  color_styles: 'Color Styles',
  assets: 'Assets',
  tray: 'Tray',
  links: 'Links and Rollovers',
};

interface DockersSidebarProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  properties: PropertyState;
  onUpdateProperties: (props: Partial<PropertyState>) => void;
  pageConfig: PageConfig;
  pages?: PageConfig[];
  activePageIndex?: number;
  onSelectPage?: (idx: number) => void;
  onAddPage?: () => void;
  onSelectTool?: (tool: any) => void;
  onConvertToCurves?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onEnterGroupEdit?: (target?: fabric.FabricObject) => void;
  onExitGroupEdit?: () => void;
  isGroupEditing?: boolean;
  theme?: ThemeMode;
  activeDockerId: DockerId | null;
  onToggleDocker: (id: DockerId | null) => void;
  onRefresh?: () => void;
  activeTool?: any;
}

interface DockerTabMeta {
  id: DockerId;
  label: string;
  icon: React.ReactNode;
}

export const DockersSidebar: React.FC<DockersSidebarProps> = ({
  canvas,
  selectedObject,
  properties,
  onUpdateProperties,
  pageConfig,
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onSelectTool,
  onConvertToCurves,
  onGroup,
  onUngroup,
  onEnterGroupEdit,
  onExitGroupEdit,
  isGroupEditing = false,
  theme = 'light',
  activeDockerId,
  onToggleDocker,
  onRefresh,
  activeTool = 'pick',
}) => {
  const isDark = theme === 'dark';

  // Tabs matching exact vertical dockers strip in image_2b0a935b.png
  const baseTabs: DockerTabMeta[] = [
    {
      id: 'hints',
      label: 'Hints',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.8A4 4 0 0 0 4 5.8C4 7.3 4.8 8.3 5.5 9.2C5.8 9.6 6 10 6 10.6H10C10 10 10.2 9.6 10.5 9.2C11.2 8.3 12 7.3 12 5.8A4 4 0 0 0 8 1.8Z"
            fill="#FFC83D"
            stroke="#9C6500"
            strokeWidth="1.05"
          />
          <rect x="6" y="10.8" width="4" height="2" fill="#D2D0CE" stroke="currentColor" strokeWidth="0.9" />
          <line x1="6.8" y1="14.2" x2="9.2" y2="14.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
        </svg>
      ),
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <line x1="2" y1="4.8" x2="14" y2="4.8" stroke="currentColor" strokeWidth="1.25" />
          <rect x="4.5" y="3.2" width="3.2" height="3.2" fill="#0078D4" stroke="#FFFFFF" strokeWidth="0.6" />
          <line x1="2" y1="11.2" x2="14" y2="11.2" stroke="currentColor" strokeWidth="1.25" />
          <rect x="8.5" y="9.6" width="3.2" height="3.2" fill="#0078D4" stroke="#FFFFFF" strokeWidth="0.6" />
        </svg>
      ),
    },
    {
      id: 'objects',
      label: 'Objects',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <polygon points="8,1.8 14,5 8,8.2 2,5" fill="#50E6FF" stroke="#0078D4" strokeWidth="1.05" strokeLinejoin="miter" />
          <polyline points="2,8.2 8,11.4 14,8.2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="miter" />
          <polyline points="2,11.2 8,14.4 14,11.2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="miter" />
        </svg>
      ),
    },
    {
      id: 'ai_generate',
      label: 'AI Generate',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L9.5 6L14 7.5L9.5 9L8 13.5L6.5 9L2 7.5L6.5 6L8 1.5Z" fill="#8661C5" stroke="#5C2D91" strokeWidth="1" strokeLinejoin="miter" />
          <rect x="11.8" y="2" width="2" height="2" fill="#50E6FF" />
        </svg>
      ),
    },
  ];

  const tabs: DockerTabMeta[] =
    activeDockerId && !baseTabs.some((t) => t.id === activeDockerId)
      ? [
          ...baseTabs,
          {
            id: activeDockerId,
            label: DOCKER_LABELS[activeDockerId] || activeDockerId,
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
                <rect x="2" y="2" width="12" height="2.8" fill="#0078D4" />
                <line x1="4.5" y1="7.5" x2="11.5" y2="7.5" stroke="currentColor" strokeWidth="1.15" />
                <line x1="4.5" y1="10.5" x2="9.5" y2="10.5" stroke="currentColor" strokeWidth="1.15" />
              </svg>
            ),
          },
        ]
      : baseTabs;

  const handleTabClick = (id: DockerId) => {
    if (activeDockerId === id) {
      // Clicking the already active docker tab collapses it
      onToggleDocker(null);
    } else {
      // Expand and activate this docker
      onToggleDocker(id);
    }
  };

  const handleCollapse = () => {
    onToggleDocker(null);
  };

  const isExpanded = activeDockerId !== null;
  const isCoreDocker =
    activeDockerId === 'transform' ||
    activeDockerId === 'properties' ||
    activeDockerId === 'objects' ||
    activeDockerId === 'align' ||
    activeDockerId === 'hints' ||
    activeDockerId === 'ai_generate';

  return (
    <div
      className="flex h-full select-none z-20 shrink-0"
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {/* Expanded Docker Panel (Width ~280px when open, 0 when collapsed) */}
      {isExpanded && (
        <aside
          className={`w-72 h-full flex flex-col border-l shadow-md overflow-hidden transition-all duration-150 ${
            isDark ? 'bg-[#4d5056] border-[#646870] text-zinc-100' : 'bg-[#f4f5f7] border-[#c0c2c6] text-zinc-900'
          }`}
        >
          {/* Header for dockers other than Transform (TransformDocker renders its own matching header) */}
          {activeDockerId !== 'transform' && (
            <div
              className={`h-7 px-2.5 flex items-center justify-between border-b shrink-0 ${
                isDark ? 'bg-[#545860] border-[#6a6e77] text-zinc-100' : 'bg-[#e9eaec] border-[#abadb3] text-zinc-800'
              }`}
            >
              <span className="font-semibold text-[12px] tracking-wide">
                {DOCKER_LABELS[activeDockerId!] || activeDockerId}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCollapse}
                  title="Collapse Docker (>>)"
                  className={`p-0.5 rounded-xs transition ${
                    isDark ? 'hover:bg-[#62666f] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
                  }`}
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCollapse}
                  title="Close Docker"
                  className={`p-0.5 rounded-xs transition ${
                    isDark ? 'hover:bg-[#62666f] text-zinc-300' : 'hover:bg-[#d8dadf] text-zinc-600'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Docker Body Content */}
          <div className="flex-1 overflow-y-auto">
            {activeDockerId === 'transform' && (
              <TransformDocker
                canvas={canvas}
                selectedObject={selectedObject}
                pageConfig={pageConfig}
                theme={theme}
                onCollapse={handleCollapse}
                onClose={handleCollapse}
                onRefresh={onRefresh}
              />
            )}

            {activeDockerId === 'properties' && (
              <PropertiesDocker
                canvas={canvas}
                selectedObject={selectedObject}
                properties={properties}
                onUpdateProperties={onUpdateProperties}
                theme={theme}
              />
            )}

            {activeDockerId === 'objects' && (
              <ObjectsDocker
                canvas={canvas}
                theme={theme}
                onGroup={onGroup}
                onUngroup={onUngroup}
                onEnterGroupEdit={onEnterGroupEdit}
                onExitGroupEdit={onExitGroupEdit}
                isGroupEditing={isGroupEditing}
                onSelectObject={(obj) => {
                  if (canvas) {
                    canvas.setActiveObject(obj);
                    canvas.renderAll();
                    onRefresh?.();
                  }
                }}
                onRefresh={() => {
                  canvas?.renderAll();
                  onRefresh?.();
                }}
              />
            )}

            {activeDockerId === 'align' && (
              <AlignDocker
                canvas={canvas}
                pageWidth={pageConfig.width}
                pageHeight={pageConfig.height}
                theme={theme}
                onRefresh={onRefresh}
              />
            )}

            {activeDockerId === 'hints' && (
              <HintsDocker
                theme={theme}
                activeTool={activeTool}
              />
            )}

            {activeDockerId === 'ai_generate' && (
              <AiGenerateDocker
                canvas={canvas}
                theme={theme}
                onRefresh={onRefresh}
              />
            )}

            {activeDockerId && !isCoreDocker && (
              <ExtendedWindowDockers
                dockerId={activeDockerId as ExtendedDockerId}
                canvas={canvas}
                selectedObject={selectedObject}
                properties={properties}
                onUpdateProperties={onUpdateProperties}
                pageConfig={pageConfig}
                pages={pages}
                activePageIndex={activePageIndex}
                onSelectPage={onSelectPage}
                onAddPage={onAddPage}
                onSelectTool={onSelectTool}
                onConvertToCurves={onConvertToCurves}
                theme={theme}
                onRefresh={onRefresh}
              />
            )}
          </div>
        </aside>
      )}

      {/* Vertical Docker Tab Strip (Fixed ~26px width on the right edge, matching image_e6758737.png) */}
      <div
        className={`w-7 h-full flex flex-col items-center py-1.5 border-l border-r shrink-0 z-30 transition-colors ${
          isDark
            ? 'bg-[#46494f] border-[#646870] text-zinc-200'
            : 'bg-[#e4e5e8] border-[#c0c2c6] text-zinc-700'
        }`}
      >
        <div className="flex flex-col items-center w-full gap-1">
          {tabs.map((tab) => {
            const isActive = activeDockerId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={`${tab.label} (Click to ${isActive ? 'collapse' : 'open'})`}
                className={`w-full py-2 flex flex-col items-center justify-start cursor-pointer transition-all relative ${
                  isActive
                    ? isDark
                      ? 'bg-[#4d5056] text-white -ml-[1px] border-y border-[#6a6e77] font-semibold shadow-xs'
                      : 'bg-[#f4f5f7] text-zinc-950 -ml-[1px] border-y border-[#c0c2c6] font-semibold shadow-xs'
                    : isDark
                    ? 'hover:bg-[#575b63] text-zinc-300 hover:text-white border border-transparent'
                    : 'hover:bg-[#d6d8dc] text-zinc-600 hover:text-zinc-900 border border-transparent'
                }`}
              >
                {/* Active Indicator Bar on the edge */}
                {isActive && (
                  <span
                    className={`absolute -left-[1px] top-0 bottom-0 w-[2px] ${
                      isDark ? 'bg-[#4d5056]' : 'bg-[#f4f5f7]'
                    }`}
                  />
                )}

                {/* Tab Icon */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0 mb-1">
                  {tab.icon}
                </div>

                {/* Vertical Label Text (Top-to-Bottom as in NuraDraw) */}
                <span
                  style={{ writingMode: 'vertical-rl' }}
                  className="text-[11px] tracking-wider select-none leading-none py-1.5"
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Add [+] at the bottom of the tab strip */}
        <div className="mt-auto pt-2 flex justify-center w-full">
          <button
            title="Add Docker"
            onClick={() => {
              // Cycle through dockers or open Transform by default if collapsed
              if (!activeDockerId) onToggleDocker('transform');
            }}
            className={`w-5 h-5 flex items-center justify-center rounded-xs transition ${
              isDark
                ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-[#d6d8dc]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
