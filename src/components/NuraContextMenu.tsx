import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { ThemeMode } from '../types';
import {
  IconSymmetryCreate,
  IconSymmetryEdit,
  IconSymmetryFinish,
  IconSymmetryRemove,
  IconSymmetryBreak,
} from './NuraTopPanelIcons';

export interface NuraContextMenuProps {
  x: number;
  y: number;
  selectedObject: fabric.FabricObject | null;
  canvas: fabric.Canvas | null;
  theme?: ThemeMode;
  onClose: () => void;
  // History & Clipboard status
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPaste?: boolean;
  // Core Clipboard & Edit actions
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  // Order actions
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  // PowerClip actions
  onPowerClipPlace?: () => void;
  onPowerClipEdit?: () => void;
  onPowerClipFinish?: () => void;
  onPowerClipExtract?: () => void;
  isPowerClipEditing?: boolean;
  // Group actions
  onGroup?: () => void;
  onUngroup?: () => void;
  onUngroupAll?: () => void;
  onEnterGroupEdit?: (target?: fabric.FabricObject) => void;
  onExitGroupEdit?: () => void;
  isGroupEditing?: boolean;
  // Object actions
  onConvertToCurves?: () => void;
  onBringIntoFocus?: () => void;
  onBreakApart?: () => void;
  onToggleHide?: () => void;
  onToggleLock?: () => void;
  onOpenProperties?: () => void;
  onOpenPageSetup?: () => void;
  onAlignToPixelGrid?: () => void;
  onCreateSymmetry?: () => void;
  onEditSymmetry?: () => void;
  onFinishSymmetry?: () => void;
  onRemoveSymmetry?: () => void;
  onBreakSymmetryLink?: () => void;
  isSymmetryEditing?: boolean;
  onCreateSymbol?: () => void;
}

export const NuraContextMenu: React.FC<NuraContextMenuProps> = ({
  x,
  y,
  selectedObject,
  canvas,
  theme = 'light',
  onClose,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  canPaste = false,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onPowerClipPlace,
  onPowerClipEdit,
  onPowerClipFinish,
  onPowerClipExtract,
  isPowerClipEditing = false,
  onGroup,
  onUngroup,
  onUngroupAll,
  onEnterGroupEdit,
  onExitGroupEdit,
  isGroupEditing = false,
  onConvertToCurves,
  onBringIntoFocus,
  onBreakApart,
  onToggleHide,
  onToggleLock,
  onOpenProperties,
  onOpenPageSetup,
  onAlignToPixelGrid,
  onCreateSymmetry,
  onEditSymmetry,
  onFinishSymmetry,
  onRemoveSymmetry,
  onBreakSymmetryLink,
  isSymmetryEditing = false,
  onCreateSymbol,
}) => {
  const isDark = theme === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x, y });

  const hasSelection = !!selectedObject;
  const isGroup = !!selectedObject && selectedObject.type === 'group';
  const isMultiSelect = !!selectedObject && selectedObject.type === 'activeselection';
  const isSymmetryGroup = !!(selectedObject && (selectedObject as any).isSymmetryGroup);
  const isPC =
    selectedObject &&
    ((selectedObject as any).isPowerClip || (selectedObject as any).customType === 'powerclip');
  const isTextOnPath = !!(selectedObject && (selectedObject as any).isTextOnPath);
  const isLocked =
    selectedObject &&
    (selectedObject.lockMovementX || (selectedObject as any).isLocked);
  const isHidden = selectedObject && selectedObject.visible === false;

  // Auto-clamp context menu position inside viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuWidth = rect.width || 210;
      const menuHeight = rect.height || 480;

      let clampedX = x;
      let clampedY = y;

      if (x + menuWidth > window.innerWidth - 8) {
        clampedX = Math.max(8, window.innerWidth - menuWidth - 8);
      }
      if (y + menuHeight > window.innerHeight - 8) {
        clampedY = Math.max(8, window.innerHeight - menuHeight - 8);
      }

      setMenuPos({ x: clampedX, y: clampedY });
    }
  }, [x, y]);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleMouseDownOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleMouseDownOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDownOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAction = (callback?: () => void) => {
    if (callback) {
      callback();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 rounded-xs shadow-2xl py-1 text-[11.5px] select-none transition-colors border ${
        isDark
          ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100 divide-zinc-700'
          : 'bg-[#ffffff] border-[#b0b3b8] text-zinc-900 shadow-xl'
      }`}
      style={{
        left: menuPos.x,
        top: menuPos.y,
        minWidth: '210px',
        fontFamily: 'Segoe UI, Tahoma, Helvetica, sans-serif',
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!hasSelection ? (
        <>
          {/* Canvas Context Menu when clicking empty canvas */}
          <button
            disabled={!canUndo}
            onClick={() => handleAction(onUndo)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.3">
                  <path d="M4 7l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 4h9a4 4 0 0 1 4 4v2" strokeLinecap="round" />
                </svg>
              </span>
              <span><span className="underline">U</span>ndo</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+Z</span>
          </button>

          <button
            disabled={!canRedo}
            onClick={() => handleAction(onRedo)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.3">
                  <path d="M12 7l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                </svg>
              </span>
              <span><span className="underline">R</span>edo</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+Y</span>
          </button>

          <button
            disabled={!canPaste}
            onClick={() => handleAction(onPaste)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
                  <rect x="3" y="4" width="10" height="10" rx="1" />
                  <path d="M6 4V2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V4" />
                </svg>
              </span>
              <span><span className="underline">P</span>aste</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+V</span>
          </button>

          <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

          <button
            onClick={() => handleAction(onOpenPageSetup)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                📄
              </span>
              <span><span className="underline">P</span>age Setup...</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+Shift+P</span>
          </button>

          {isGroupEditing && (
            <>
              <button
                onClick={() => handleAction(onExitGroupEdit)}
                className="w-full flex items-center justify-between px-2 py-1 text-left bg-sky-500/15 hover:bg-[#0078d7] hover:text-white text-sky-600 dark:text-sky-300 font-semibold group cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">✓</span>
                  <span>Finish Editing Group</span>
                </div>
                <span className="font-mono text-[10px] opacity-75 pl-3">Esc</span>
              </button>
              <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            </>
          )}

          <button
            onClick={() => handleAction(onOpenProperties)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors font-medium"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                  <path d="M13.5 3.5l-7 7L3 7l1-1 2.5 2.5 6-6 1 1z" />
                </svg>
              </span>
              <span>P<span className="underline">r</span>operties</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Alt+Enter</span>
          </button>
        </>
      ) : (
        <>
          {/* Object Context Menu matching screenshot */}
          {/* 1. Convert to Curves */}
          <button
            disabled={!hasSelection}
            onClick={() => handleAction(onConvertToCurves)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
          >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Convert to curves icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M2 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 1a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 1a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
              <path d="M3.5 10.5 C 5 5, 11 11, 12.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          <span>Con<span className="underline">v</span>ert to Curves</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+Q</span>
      </button>

      {/* 2. Bring into Focus */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onBringIntoFocus)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Bring into focus icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
              <circle cx="8" cy="8" r="2.5" />
            </svg>
          </span>
          <span>Bring into <span className="underline">F</span>ocus</span>
        </div>
      </button>

      {/* 3. Break Apart */}
      <button
        disabled={!hasSelection || selectedObject?.type !== 'group'}
        onClick={() => handleAction(onBreakApart)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Break apart icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <rect x="2" y="2" width="5" height="5" />
              <rect x="9" y="9" width="5" height="5" />
              <line x1="7" y1="7" x2="9" y2="9" strokeDasharray="1 1" />
            </svg>
          </span>
          <span>Bre<span className="underline">a</span>k Apart</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+K</span>
      </button>

      {/* Group / Ungroup / Group Editing */}
      {(isMultiSelect || isGroup || isGroupEditing) && (
        <>
          <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          {isMultiSelect && (
            <button
              onClick={() => handleAction(onGroup)}
              className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors font-medium"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.3">
                    <rect x="2" y="2" width="6" height="6" />
                    <rect x="8" y="8" width="6" height="6" />
                    <rect x="1" y="1" width="14" height="14" strokeDasharray="2 1.5" opacity="0.6" />
                  </svg>
                </span>
                <span><span className="underline">G</span>roup Objects</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+G</span>
            </button>
          )}
          {isGroup && !isPC && !isTextOnPath && (
            <button
              onClick={() => handleAction(() => onEnterGroupEdit?.(selectedObject || undefined))}
              className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors font-medium text-sky-600 dark:text-sky-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">✎</span>
                <span><span className="underline">E</span>dit Group</span>
              </div>
              <span className="font-mono text-[10px] opacity-70 pl-3">Dbl-Click</span>
            </button>
          )}
          {isGroup && (
            <>
              <button
                onClick={() => handleAction(onUngroup)}
                className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.3">
                      <rect x="2" y="2" width="5" height="5" />
                      <rect x="9" y="9" width="5" height="5" />
                    </svg>
                  </span>
                  <span><span className="underline">U</span>ngroup Objects</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+U</span>
              </button>
              <button
                onClick={() => handleAction(onUngroupAll)}
                className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0" />
                  <span>Ungroup All</span>
                </div>
              </button>
            </>
          )}
          {isGroupEditing && (
            <button
              onClick={() => handleAction(onExitGroupEdit)}
              className="w-full flex items-center justify-between px-2 py-1 text-left bg-sky-500/15 hover:bg-[#0078d7] hover:text-white text-sky-600 dark:text-sky-300 font-semibold group cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">✓</span>
                <span>Finish Editing Group</span>
              </div>
              <span className="font-mono text-[10px] opacity-75 pl-3">Esc</span>
            </button>
          )}
        </>
      )}

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 4. Cut */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onCut)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Cut icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M3.5 3.5a2 2 0 1 0 2.8 2.8L8 4.7l1.7 1.6a2 2 0 1 0 2.8-2.8 2 2 0 0 0-2.8 0L8 5.2 6.3 3.5a2 2 0 0 0-2.8 0zm.7.7a1 1 0 1 1 1.4 1.4L4.2 4.2zm7.6 0a1 1 0 1 1 1.4 1.4l-1.4-1.4zM6 8l-4 7h2l3-5.2L6 8zm4 0l1 1.8 3 5.2h2L10 8z" />
            </svg>
          </span>
          <span><span className="underline">C</span>ut</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+X</span>
      </button>

      {/* 5. Copy */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onCopy)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Copy icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <rect x="5" y="5" width="8" height="9" rx="0.5" />
              <path d="M3 11H2V2h8v1" />
            </svg>
          </span>
          <span><span className="underline">C</span>opy</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Ctrl+C</span>
      </button>

      {/* 6. Delete */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onDelete)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Delete icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M5 2V1h6v1h4v1H1V2h4zm1 3v8h1V5H6zm3 0v8h1V5H9zm-5 8V4h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span><span className="underline">D</span>elete</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Delete</span>
      </button>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 7. Order (with Submenu) */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('order')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          disabled={!hasSelection}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
                <rect x="2" y="5" width="8" height="8" />
                <rect x="6" y="2" width="8" height="8" />
              </svg>
            </span>
            <span><span className="underline">O</span>rder</span>
          </div>
          <span className="text-[10px] opacity-70">▶</span>
        </button>

        {activeSubmenu === 'order' && hasSelection && (
          <div
            className={`absolute left-full top-0 ml-0.5 rounded-xs shadow-2xl py-1 z-50 min-w-[170px] text-[11.5px] border ${
              isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#ffffff] border-[#b0b3b8] text-zinc-900 shadow-xl'
            }`}
          >
            <button
              onClick={() => handleAction(onBringToFront)}
              className="w-full flex items-center justify-between px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              <span>To <span className="underline">F</span>ront of Page</span>
              <span className="font-mono text-[9.5px] opacity-70 ml-2">Shift+PgUp</span>
            </button>
            <button
              onClick={() => handleAction(onSendToBack)}
              className="w-full flex items-center justify-between px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              <span>To <span className="underline">B</span>ack of Page</span>
              <span className="font-mono text-[9.5px] opacity-70 ml-2">Shift+PgDn</span>
            </button>
            <button
              onClick={() => handleAction(onBringForward)}
              className="w-full flex items-center justify-between px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              <span><span className="underline">F</span>orward One</span>
              <span className="font-mono text-[9.5px] opacity-70 ml-2">Ctrl+PgUp</span>
            </button>
            <button
              onClick={() => handleAction(onSendBackward)}
              className="w-full flex items-center justify-between px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              <span><span className="underline">B</span>ack One</span>
              <span className="font-mono text-[9.5px] opacity-70 ml-2">Ctrl+PgDn</span>
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 8. Hide */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onToggleHide)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Eye slash icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8z" />
              <line x1="2" y1="2" x2="14" y2="14" strokeWidth="1.2" />
            </svg>
          </span>
          <span>{isHidden ? 'Show' : <><span className="underline">H</span>ide</>}</span>
        </div>
      </button>

      {/* 9. Lock */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onToggleLock)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Lock icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M4 6V4a4 4 0 0 1 8 0v2h1v8H3V6h1zm2 0h4V4a2 2 0 1 0-4 0v2z" />
            </svg>
          </span>
          <span>{isLocked ? 'Unlock' : <><span className="underline">L</span>ock</>}</span>
        </div>
      </button>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 10. PowerClip Inside... */}
      {!isPowerClipEditing ? (
        !isPC ? (
          <button
            disabled={!hasSelection}
            onClick={() => handleAction(onPowerClipPlace)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {/* PowerClip icon */}
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
                  <rect x="2" y="3" width="12" height="10" rx="1" />
                  <circle cx="8" cy="8" r="2.5" />
                </svg>
              </span>
              <span><span className="underline">P</span>owerClip Inside...</span>
            </div>
          </button>
        ) : (
          <>
            <button
              onClick={() => handleAction(onPowerClipEdit)}
              className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0 text-amber-500">✏️</span>
                <span><span className="underline">E</span>dit PowerClip</span>
              </div>
            </button>
            <button
              onClick={() => handleAction(onPowerClipExtract)}
              className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center shrink-0 text-blue-500">📤</span>
                <span><span className="underline">E</span>xtract Contents</span>
              </div>
            </button>
          </>
        )
      ) : (
        <button
          onClick={() => handleAction(onPowerClipFinish)}
          className="w-full flex items-center justify-between px-2 py-1 text-left bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 font-semibold group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-300">✔️</span>
            <span><span className="underline">F</span>inish Editing PowerClip</span>
          </div>
        </button>
      )}

      {/* 11. Frame Type (with Submenu) */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('frametype')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          disabled={!hasSelection}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0" />
            <span><span className="underline">F</span>rame Type</span>
          </div>
          <span className="text-[10px] opacity-70">▶</span>
        </button>

        {activeSubmenu === 'frametype' && hasSelection && (
          <div
            className={`absolute left-full top-0 ml-0.5 rounded-xs shadow-2xl py-1 z-50 min-w-[150px] text-[11.5px] border ${
              isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#ffffff] border-[#b0b3b8] text-zinc-900 shadow-xl'
            }`}
          >
            <button
              onClick={() => handleAction(onPowerClipPlace)}
              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              PowerClip Frame
            </button>
            <button
              onClick={() => handleAction()}
              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              Text Frame
            </button>
            <button
              onClick={() => handleAction()}
              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              None
            </button>
            <button
              onClick={() => handleAction(onPowerClipExtract)}
              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              Remove Frame
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 12. Symmetry Actions */}
      {isSymmetryEditing ? (
        <>
          <button
            onClick={() => handleAction(onFinishSymmetry)}
            className="w-full flex items-center justify-between px-2 py-1 text-left bg-sky-50 dark:bg-sky-900/30 hover:bg-[#0078d7] hover:text-white text-sky-700 dark:text-sky-300 font-semibold group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryFinish className="w-4 h-4 shrink-0" />
              <span>Finish Editing Symmetry</span>
            </div>
          </button>
          <button
            onClick={() => handleAction(onBreakSymmetryLink)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryBreak className="w-4 h-4 shrink-0" />
              <span>Break Symmetry Link</span>
            </div>
          </button>
          <button
            onClick={() => handleAction(onRemoveSymmetry)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryRemove className="w-4 h-4 shrink-0" />
              <span>Remove Symmetry</span>
            </div>
          </button>
        </>
      ) : isSymmetryGroup ? (
        <>
          <button
            onClick={() => handleAction(onEditSymmetry)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryEdit className="w-4 h-4 shrink-0" />
              <span>Edit Symmetry</span>
            </div>
          </button>
          <button
            onClick={() => handleAction(onBreakSymmetryLink)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryBreak className="w-4 h-4 shrink-0" />
              <span>Break Symmetry Link</span>
            </div>
          </button>
          <button
            onClick={() => handleAction(onRemoveSymmetry)}
            className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconSymmetryRemove className="w-4 h-4 shrink-0" />
              <span>Remove Symmetry</span>
            </div>
          </button>
        </>
      ) : (
        <button
          disabled={!hasSelection}
          onClick={() => handleAction(onCreateSymmetry)}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <IconSymmetryCreate className="w-4 h-4 shrink-0" />
            <span><span className="underline">C</span>reate New Symmetry</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Alt+S</span>
        </button>
      )}

      {/* 13. Create New Symbol */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onCreateSymbol)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Symbol icon with green plus */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <path d="M3 2h7l3 3v9H3V2z" />
              <path d="M10 2v3h3" />
              <path d="M13 11v4M11 13h4" stroke="#10b981" strokeWidth="1.5" />
            </svg>
          </span>
          <span>Create <span className="underline">N</span>ew Symbol</span>
        </div>
      </button>

      {/* 14. Internet Links */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('links')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          disabled={!hasSelection}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0" />
            <span>I<span className="underline">n</span>ternet Links</span>
          </div>
          <span className="text-[10px] opacity-70">▶</span>
        </button>

        {activeSubmenu === 'links' && (
          <div
            className={`absolute left-full top-0 ml-0.5 rounded-xs shadow-2xl py-1 z-50 min-w-[140px] text-[11.5px] border ${
              isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#ffffff] border-[#b0b3b8] text-zinc-900 shadow-xl'
            }`}
          >
            <button
              onClick={() => {
                const url = prompt('Enter URL for Web Link:', 'https://');
                if (url && selectedObject) {
                  (selectedObject as any).webLink = url;
                }
                onClose();
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
            >
              Add Link...
            </button>
          </div>
        )}
      </div>

      {/* 15. Object Styles */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('objstyles')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          disabled={!hasSelection}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0" />
            <span>Object <span className="underline">S</span>tyles</span>
          </div>
          <span className="text-[10px] opacity-70">▶</span>
        </button>
      </div>

      {/* 16. Color Styles */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('colorstyles')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          disabled={!hasSelection}
          className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 flex items-center justify-center shrink-0" />
            <span>Color <span className="underline">S</span>tyles</span>
          </div>
          <span className="text-[10px] opacity-70">▶</span>
        </button>
      </div>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 17. Wrap Paragraph Text */}
      <button
        disabled={!hasSelection}
        onClick={() => {
          if (selectedObject) {
            (selectedObject as any).wrapText = !(selectedObject as any).wrapText;
            canvas?.renderAll();
          }
          onClose();
        }}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Wrap paragraph text icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <circle cx="8" cy="8" r="3.5" stroke="#0284c7" />
              <line x1="2" y1="4" x2="5" y2="4" />
              <line x1="11" y1="4" x2="14" y2="4" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="11" y1="12" x2="14" y2="12" />
            </svg>
          </span>
          <span><span className="underline">W</span>rap Paragraph Text</span>
        </div>
      </button>

      {/* 18. Wrap Connector Line */}
      <button
        disabled={!hasSelection}
        onClick={() => {
          if (selectedObject) {
            (selectedObject as any).wrapConnector = !(selectedObject as any).wrapConnector;
            canvas?.renderAll();
          }
          onClose();
        }}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Wrap connector line icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <path d="M2 8h3v-3h6v3h3" stroke="#ea580c" />
              <rect x="6" y="6" width="4" height="4" />
            </svg>
          </span>
          <span>Wrap <span className="underline">C</span>onnector Line</span>
        </div>
      </button>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 19. Overprint Fill */}
      <button
        disabled
        className="w-full flex items-center justify-between px-2 py-1 text-left opacity-35 cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 shrink-0" />
          <span>Overprint Fill</span>
        </div>
      </button>

      {/* 20. Overprint Outline */}
      <button
        disabled={!hasSelection}
        onClick={() => {
          if (selectedObject) {
            (selectedObject as any).overprintOutline = !(selectedObject as any).overprintOutline;
            canvas?.renderAll();
          }
          onClose();
        }}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 shrink-0" />
          <span>Overprint <span className="underline">O</span>utline</span>
        </div>
      </button>

      {/* 21. Object Hinting */}
      <button
        disabled={!hasSelection}
        onClick={() => {
          if (selectedObject) {
            (selectedObject as any).objectHinting = !(selectedObject as any).objectHinting;
            canvas?.renderAll();
          }
          onClose();
        }}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 shrink-0" />
          <span>Object <span className="underline">H</span>inting</span>
        </div>
      </button>

      {/* 22. Align with Pixel Grid */}
      <button
        disabled={!hasSelection}
        onClick={() => handleAction(onAlignToPixelGrid)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Horseshoe magnet over pixel grid icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.2">
              <path d="M4 2v4a4 4 0 0 0 8 0V2" stroke="#dc2626" strokeWidth="1.5" />
              <line x1="2" y1="13" x2="14" y2="13" strokeDasharray="1.5 1.5" />
              <line x1="2" y1="15" x2="14" y2="15" strokeDasharray="1.5 1.5" />
            </svg>
          </span>
          <span>Align with Pixel <span className="underline">G</span>rid</span>
        </div>
      </button>

      {/* Divider */}
      <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

      {/* 23. Properties */}
      <button
        onClick={() => handleAction(onOpenProperties)}
        className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-[#0078d7] hover:text-white group cursor-pointer transition-colors font-medium"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {/* Properties checkmark icon */}
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M13.5 3.5l-7 7L3 7l1-1 2.5 2.5 6-6 1 1z" />
            </svg>
          </span>
          <span><span className="underline">P</span>roperties</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 group-hover:text-white pl-3">Alt+Enter</span>
      </button>

        </>
      )}
    </div>
  );
};
