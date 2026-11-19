import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  Grid,
  Square,
  Circle,
  Spline,
  FolderOpen,
  FolderClosed,
  Pencil,
  Check,
  Group,
  Ungroup,
} from 'lucide-react';
import * as fabric from 'fabric';
import { ThemeMode } from '../../types';

interface ObjectsDockerProps {
  canvas: fabric.Canvas | null;
  onSelectObject: (obj: fabric.FabricObject) => void;
  onRefresh: () => void;
  theme?: ThemeMode;
  onGroup?: () => void;
  onUngroup?: () => void;
  onEnterGroupEdit?: (target?: fabric.FabricObject) => void;
  onExitGroupEdit?: () => void;
  isGroupEditing?: boolean;
}

const objectUidMap = new WeakMap<object, string>();
let nextObjectUid = 1;

function getStableObjectKey(obj: fabric.FabricObject): string {
  let uid = objectUidMap.get(obj);
  if (!uid) {
    uid = `obj-uid-${nextObjectUid++}`;
    objectUidMap.set(obj, uid);
  }
  return uid;
}

export const ObjectsDocker: React.FC<ObjectsDockerProps> = ({
  canvas,
  onSelectObject,
  onRefresh,
  theme = 'light',
  onGroup,
  onUngroup,
  onEnterGroupEdit,
  onExitGroupEdit,
  isGroupEditing = false,
}) => {
  const isDark = theme === 'dark';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Tree collapse state
  const [page1Expanded, setPage1Expanded] = useState(true);
  const [layer1Expanded, setLayer1Expanded] = useState(true);
  const [masterPageExpanded, setMasterPageExpanded] = useState(false);

  // Layer visibility & lock state
  const [layer1Visible, setLayer1Visible] = useState(true);
  const [layer1Locked, setLayer1Locked] = useState(false);

  if (!canvas) {
    return (
      <div className="p-4 text-xs text-zinc-500 italic text-center">
        Canvas not loaded
      </div>
    );
  }

  // Get objects in reverse order (top of layer stack first)
  const rawObjects = canvas.getObjects();
  const objects = [...rawObjects].reverse();
  const activeObject = canvas.getActiveObject();

  const toggleGroupExpand = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [uid]: prev[uid] === false ? true : !prev[uid] }));
  };

  const handleToggleVisibility = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    obj.set('visible', !obj.visible);
    canvas.renderAll();
    onRefresh();
  };

  const handleToggleLock = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    const isLocked = !obj.selectable;
    obj.set({
      selectable: isLocked,
      evented: isLocked,
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
    });
    canvas.renderAll();
    onRefresh();
  };

  const handleDelete = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    onRefresh();
  };

  const handleDuplicate = async (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    const cloned = await obj.clone();
    cloned.set({
      left: (obj.left || 0) + 20,
      top: (obj.top || 0) + 20,
      name: `${(obj as any).name || 'Object'} (Copy)`,
      id: 'obj_' + Math.random().toString(36).substring(2, 9),
    });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
    onRefresh();
  };

  const handleMoveUp = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    canvas.bringObjectForward(obj);
    canvas.renderAll();
    onRefresh();
  };

  const handleMoveDown = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
    onRefresh();
  };

  const startRename = (obj: fabric.FabricObject) => {
    setEditingId(getStableObjectKey(obj));
    setEditingName((obj as any).name || obj.type || 'Object');
  };

  const saveRename = (obj: fabric.FabricObject) => {
    if (editingName.trim()) {
      (obj as any).name = editingName.trim();
    }
    setEditingId(null);
    canvas.renderAll();
    onRefresh();
  };

  const getObjectIcon = (type?: string, isExpanded?: boolean) => {
    switch (type) {
      case 'rect':
        return <Square className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'circle':
      case 'ellipse':
        return <Circle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'i-text':
      case 'text':
      case 'textbox':
        return <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'path':
        return <Spline className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'group':
        return isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        ) : (
          <FolderClosed className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        );
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  const renderObjectNode = (obj: fabric.FabricObject, depth = 0, parentGroup?: fabric.Group): React.ReactNode => {
    const objUid = getStableObjectKey(obj);
    const isGroup = obj.type === 'group';
    const isExpanded = expandedGroups[objUid] ?? false;
    const isSelected = activeObject === obj;
    const isLocked = !obj.selectable;
    const isVisible = obj.visible !== false;
    const isSpecialGroup =
      !!(obj as any).isPowerClip ||
      (obj as any).customType === 'powerclip' ||
      !!(obj as any).isTextOnPath ||
      (obj as any).customType === 'qrcode';
    const children = isGroup ? [...(obj as fabric.Group).getObjects()].reverse() : [];

    return (
      <div key={objUid}>
        <div
          onClick={() => {
            if (parentGroup && onEnterGroupEdit) {
              onEnterGroupEdit(parentGroup);
            } else {
              onSelectObject(obj);
            }
          }}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          className={`flex items-center justify-between pr-2 py-1 rounded cursor-pointer transition ${
            isSelected
              ? isDark
                ? 'bg-sky-900/60 border border-sky-600 text-white font-medium'
                : 'bg-[#b8d8fd] border border-[#78b3fa] text-zinc-950 font-medium'
              : isDark
              ? 'hover:bg-[#5b5f67] text-zinc-300'
              : 'hover:bg-zinc-200/80 text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isGroup ? (
              <button
                onClick={(e) => toggleGroupExpand(e, objUid)}
                title={isExpanded ? 'Collapse Group' : 'Expand Group Contents'}
                className="p-0.5 rounded hover:bg-black/15 shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 opacity-80" />
                ) : (
                  <ChevronRight className="w-3 h-3 opacity-80" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {getObjectIcon(obj.type, isExpanded)}

            {editingId === objUid ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => saveRename(obj)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename(obj)}
                autoFocus
                className="bg-white dark:bg-zinc-900 px-1 py-0.5 rounded text-xs border border-sky-500 w-full outline-none"
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isGroup && !isSpecialGroup && onEnterGroupEdit && !parentGroup) {
                    onEnterGroupEdit(obj);
                  } else {
                    startRename(obj);
                  }
                }}
                className="truncate text-xs"
                title={
                  isGroup && !isSpecialGroup
                    ? 'Double-click to Edit Group Contents'
                    : 'Double-click to rename'
                }
              >
                {(obj as any).name || obj.type || 'Object'}
                {isGroup ? ` (${children.length})` : ''}
              </span>
            )}
          </div>

          {/* Quick Object Actions (top-level canvas objects) */}
          {!parentGroup ? (
            <div className="flex items-center gap-0.5 shrink-0 opacity-80 hover:opacity-100">
              {isGroup && !isSpecialGroup && onEnterGroupEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterGroupEdit(obj);
                  }}
                  title="Edit Group Contents (Double-click)"
                  className="p-0.5 hover:text-sky-400 text-sky-500"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => handleMoveUp(e, obj)}
                title="Bring Forward"
                className="p-0.5 hover:text-sky-600"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleMoveDown(e, obj)}
                title="Send Backward"
                className="p-0.5 hover:text-sky-600"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleToggleVisibility(e, obj)}
                title={isVisible ? 'Hide' : 'Show'}
                className="p-0.5 hover:text-sky-600"
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-amber-500" />}
              </button>
              <button
                onClick={(e) => handleToggleLock(e, obj)}
                title={isLocked ? 'Unlock' : 'Lock'}
                className="p-0.5 hover:text-sky-600"
              >
                {isLocked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                onClick={(e) => handleDuplicate(e, obj)}
                title="Duplicate"
                className="p-0.5 hover:text-sky-600"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(e, obj)}
                title="Delete"
                className="p-0.5 hover:text-red-500 text-zinc-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-[9px] opacity-60 px-1">in group</span>
          )}
        </div>

        {/* Nested Children inside Group */}
        {isGroup && isExpanded && children.length > 0 && (
          <div className="ml-3 border-l border-zinc-400/40 space-y-0.5">
            {children.map((child) => renderObjectNode(child, depth + 1, obj as fabric.Group))}
          </div>
        )}
      </div>
    );
  };

  const canGroup = activeObject?.type === 'activeselection';
  const canUngroup = activeObject?.type === 'group';
  const canEditSelectedGroup =
    canUngroup &&
    !(activeObject as any)?.isPowerClip &&
    (activeObject as any)?.customType !== 'powerclip' &&
    !(activeObject as any)?.isTextOnPath &&
    (activeObject as any)?.customType !== 'qrcode';

  return (
    <div className={`flex flex-col h-full select-none text-[11px] font-sans ${isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f8f9fa] text-zinc-800'}`}>
      {/* Quick Group / Ungroup / Group Edit Bar */}
      <div className={`px-2 py-1.5 border-b flex items-center gap-1 flex-wrap ${
        isDark ? 'bg-[#45484e] border-[#646870]' : 'bg-[#eceef1] border-zinc-300'
      }`}>
        <button
          onClick={() => onGroup?.()}
          disabled={!canGroup}
          title="Group Selected Objects (Ctrl+G)"
          className={`px-1.5 py-1 rounded border text-[10.5px] flex items-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-[#565a62] border-[#6b707a] hover:bg-[#0078d7] text-zinc-100'
              : 'bg-white border-zinc-300 hover:bg-[#e5f1fb] text-zinc-800'
          }`}
        >
          <Group className="w-3 h-3 text-sky-500" />
          <span>Group</span>
        </button>

        <button
          onClick={() => onUngroup?.()}
          disabled={!canUngroup}
          title="Ungroup Objects (Ctrl+U)"
          className={`px-1.5 py-1 rounded border text-[10.5px] flex items-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-[#565a62] border-[#6b707a] hover:bg-[#0078d7] text-zinc-100'
              : 'bg-white border-zinc-300 hover:bg-[#e5f1fb] text-zinc-800'
          }`}
        >
          <Ungroup className="w-3 h-3 text-amber-500" />
          <span>Ungroup</span>
        </button>

        {canEditSelectedGroup && onEnterGroupEdit && (
          <button
            onClick={() => onEnterGroupEdit(activeObject!)}
            title="Edit Group Contents (Double-click)"
            className="px-1.5 py-1 rounded border border-[#0078d7] bg-[#0078d7] hover:bg-[#0063b1] text-white text-[10.5px] flex items-center gap-1 transition cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit Group</span>
          </button>
        )}

        {isGroupEditing && onExitGroupEdit && (
          <button
            onClick={onExitGroupEdit}
            title="Finish Editing Group (Esc)"
            className="px-1.5 py-1 rounded border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] flex items-center gap-1 transition cursor-pointer ml-auto"
          >
            <Check className="w-3 h-3" />
            <span>Finish</span>
          </button>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {/* Node 1: Page 1 */}
        <div>
          <div
            onClick={() => setPage1Expanded(!page1Expanded)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
              isDark ? 'hover:bg-[#5b5f67]' : 'hover:bg-zinc-200'
            }`}
          >
            {page1Expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            )}
            <FileText className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
            <span className="font-semibold text-xs">Page 1</span>
          </div>

          {page1Expanded && (
            <div className="ml-4 pl-1 border-l border-zinc-200 dark:border-zinc-700/60 space-y-0.5 mt-0.5">
              {/* Layer 1 */}
              <div
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
                  isDark
                    ? 'bg-sky-950/70 border border-sky-800/60 text-white'
                    : 'bg-[#cfe4fc] border border-[#a8cefc] text-zinc-900'
                }`}
                onClick={() => setLayer1Expanded(!layer1Expanded)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {layer1Expanded ? (
                    <ChevronDown className="w-3 h-3 text-sky-600 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-sky-600 shrink-0" />
                  )}
                  <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayer1Visible(!layer1Visible);
                        canvas.forEachObject((o) => o.set('visible', !layer1Visible));
                        canvas.renderAll();
                      }}
                      className="hover:text-black dark:hover:text-white"
                      title={layer1Visible ? 'Layer Visible' : 'Layer Hidden'}
                    >
                      {layer1Visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-amber-500" />}
                    </button>
                    <span title="Printable Layer" className="inline-flex">
                      <Printer className="w-3 h-3 opacity-60" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayer1Locked(!layer1Locked);
                        canvas.forEachObject((o) => o.set('selectable', layer1Locked));
                        canvas.renderAll();
                      }}
                      className="hover:text-black dark:hover:text-white"
                      title={layer1Locked ? 'Layer Locked' : 'Layer Unlocked'}
                    >
                      {layer1Locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 opacity-60" />}
                    </button>
                  </div>
                  <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 ml-1" />
                  <span className="font-semibold text-xs truncate">Layer 1</span>
                </div>
                <span className="text-[10px] font-mono opacity-70">({objects.length})</span>
              </div>

              {/* Objects inside Layer 1 */}
              {layer1Expanded && (
                <div className="ml-2 space-y-0.5 mt-0.5">
                  {objects.length === 0 ? (
                    <div className="py-2 pl-3 text-zinc-400 italic text-[10px]">
                      No objects on this layer
                    </div>
                  ) : (
                    objects.map((obj) => renderObjectNode(obj, 0))
                  )}
                </div>
              )}

              {/* Guides Item under Page 1 */}
              <div className="flex items-center gap-2 px-2 py-1 text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 opacity-60" />
                  <Printer className="w-3 h-3 opacity-40" />
                  <Unlock className="w-3 h-3 opacity-40" />
                </div>
                <span className="text-sky-500 font-bold">+</span>
                <span>Guides</span>
              </div>
            </div>
          )}
        </div>

        {/* Node 2: Master Page */}
        <div className="pt-1">
          <div
            onClick={() => setMasterPageExpanded(!masterPageExpanded)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
              isDark ? 'hover:bg-[#5b5f67]' : 'hover:bg-zinc-200'
            }`}
          >
            {masterPageExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            )}
            <FileText className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
            <span className="font-semibold text-xs">Master Page</span>
          </div>

          {masterPageExpanded && (
            <div className="ml-4 pl-1 border-l border-zinc-200 dark:border-zinc-700/60 space-y-1 mt-0.5">
              <div className="flex items-center gap-2 px-2 py-0.5 text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 opacity-60" />
                  <Printer className="w-3 h-3 opacity-40" />
                  <Unlock className="w-3 h-3 opacity-40" />
                </div>
                <span className="text-sky-500 font-bold">+</span>
                <span>Guides (all pages)</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-0.5 text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 opacity-60" />
                  <Printer className="w-3 h-3 opacity-40" />
                  <Unlock className="w-3 h-3 opacity-40" />
                </div>
                <Grid className="w-3 h-3 text-zinc-500" />
                <span>Document Grid</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
