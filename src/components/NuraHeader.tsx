import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  Share2,
  Users,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Ruler,
  HelpCircle,
  FileCode,
  FileImage,
  Layers,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { CollaboratorUser, PageConfig } from '../types';

interface NuraHeaderProps {
  documentName: string;
  onDocumentNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  zoomLevel: number;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onExport: (format: 'dwg' | 'svg' | 'pdf' | 'png' | 'json') => void;
  onOpenJSON: () => void;
  onNewDocument: () => void;
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser;
  roomId: string;
  onSwitchRoom: (roomId: string) => void;
  onUpdateUserName: (name: string) => void;
  isConnected: boolean;
  onToggleDocker: (dockerName: string) => void;
  activeDockers: string[];
}

export const NuraHeader: React.FC<NuraHeaderProps> = ({
  documentName,
  onDocumentNameChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  zoomLevel,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  onExport,
  onOpenJSON,
  onNewDocument,
  collaborators,
  currentUser,
  roomId,
  onSwitchRoom,
  onUpdateUserName,
  isConnected,
  onToggleDocker,
  activeDockers,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomId);
  const [tempNameInput, setTempNameInput] = useState(currentUser.name);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="bg-[#24272b] text-zinc-200 select-none border-b border-zinc-700/80 font-sans text-xs">
      {/* Top Application Title Bar & Main Menu */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a1c1e] border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          {/* NuraDraw Style Icon Brand */}
          <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => setActiveMenu(null)}>
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-emerald-600 via-green-500 to-lime-400 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black font-black" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-zinc-100 flex items-center gap-1 text-[13px]">
              Nura<span className="text-emerald-400 font-extrabold">Draw</span>
              <span className="text-[10px] text-zinc-400 px-1 py-0.2 bg-zinc-800 rounded border border-zinc-700">Web</span>
            </span>
          </div>

          {/* Document Title (Editable) */}
          <div className="flex items-center text-zinc-400 text-xs px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-transparent hover:border-zinc-700">
            {isEditingName ? (
              <input
                type="text"
                value={documentName}
                onChange={(e) => onDocumentNameChange(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                autoFocus
                className="bg-zinc-900 text-white px-1 py-0.5 rounded text-xs outline-none border border-emerald-500 w-36"
              />
            ) : (
              <span onClick={() => setIsEditingName(true)} className="cursor-text text-zinc-200 font-medium">
                {documentName}
              </span>
            )}
            <span className="text-[10px] text-zinc-500 ml-1.5">[RGB / 300 DPI]</span>
          </div>

          {/* Desktop App Menus */}
          <div className="relative flex items-center space-x-0.5 text-zinc-300 ml-2">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                className={`px-2 py-0.5 rounded hover:bg-zinc-700 transition ${activeMenu === 'file' ? 'bg-zinc-700 text-white' : ''}`}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div
                  className="absolute left-0 top-full mt-1 w-52 bg-[#2a2d32] border border-zinc-700 rounded shadow-xl py-1 z-50 text-zinc-200"
                  onClick={() => setActiveMenu(null)}
                >
                  <button onClick={onNewDocument} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>New Document</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+N</span>
                  </button>
                  <button onClick={onOpenJSON} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Open Project (.nuradraw)</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+O</span>
                  </button>
                  <div className="h-px bg-zinc-700 my-1" />
                  <button onClick={() => onExport('json')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Save Project (.nuradraw)</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+S</span>
                  </button>
                  <div className="h-px bg-zinc-700 my-1" />
                  <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Export As</div>
                  <button onClick={() => onExport('svg')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SVG (Scalable Vector)</span>
                  </button>
                  <button onClick={() => onExport('pdf')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-red-400" />
                    <span>PDF (Print Document)</span>
                  </button>
                  <button onClick={() => onExport('png')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center gap-2">
                    <FileImage className="w-3.5 h-3.5 text-blue-400" />
                    <span>PNG (Raster Image)</span>
                  </button>
                  <button onClick={() => onExport('dwg')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>DWG (AutoCAD Drawing)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                className={`px-2 py-0.5 rounded hover:bg-zinc-700 transition ${activeMenu === 'edit' ? 'bg-zinc-700 text-white' : ''}`}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-[#2a2d32] border border-zinc-700 rounded shadow-xl py-1 z-50 text-zinc-200"
                  onClick={() => setActiveMenu(null)}
                >
                  <button disabled={!canUndo} onClick={onUndo} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Undo</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+Z</span>
                  </button>
                  <button disabled={!canRedo} onClick={onRedo} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Redo</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+Y</span>
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                className={`px-2 py-0.5 rounded hover:bg-zinc-700 transition ${activeMenu === 'view' ? 'bg-zinc-700 text-white' : ''}`}
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-[#2a2d32] border border-zinc-700 rounded shadow-xl py-1 z-50 text-zinc-200"
                  onClick={() => setActiveMenu(null)}
                >
                  <button onClick={onZoomIn} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Zoom In</span>
                    <span className="text-[10px] text-zinc-400">Ctrl +</span>
                  </button>
                  <button onClick={onZoomOut} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Zoom Out</span>
                    <span className="text-[10px] text-zinc-400">Ctrl -</span>
                  </button>
                  <button onClick={onZoomFit} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Fit to Page</span>
                    <span className="text-[10px] text-zinc-400">Shift+F4</span>
                  </button>
                  <div className="h-px bg-zinc-700 my-1" />
                  <button onClick={onToggleGrid} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center justify-between">
                    <span>Grid Lines</span>
                    {showGrid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button onClick={onToggleRulers} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center justify-between">
                    <span>Rulers</span>
                    {showRulers && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Dockers Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'dockers' ? null : 'dockers')}
                className={`px-2 py-0.5 rounded hover:bg-zinc-700 transition ${activeMenu === 'dockers' ? 'bg-zinc-700 text-white' : ''}`}
              >
                Dockers
              </button>
              {activeMenu === 'dockers' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-[#2a2d32] border border-zinc-700 rounded shadow-xl py-1 z-50 text-zinc-200"
                  onClick={() => setActiveMenu(null)}
                >
                  <button onClick={() => onToggleDocker('objects')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Objects & Layers</span>
                    {activeDockers.includes('objects') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button onClick={() => onToggleDocker('transform')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Transform</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] opacity-70">Alt+F7</span>
                      {activeDockers.includes('transform') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                  <button onClick={() => onToggleDocker('align')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Align & Distribute</span>
                    {activeDockers.includes('align') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button onClick={() => onToggleDocker('properties')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Object Properties</span>
                    {activeDockers.includes('properties') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button onClick={() => onToggleDocker('collab')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center">
                    <span>Real-time Collab</span>
                    {activeDockers.includes('collab') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Real-time Presence, Collaboration & Export Buttons */}
        <div className="flex items-center space-x-2">
          {/* Connection status badge */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-zinc-800 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-zinc-300 font-mono text-[10px]">Room: {roomId}</span>
          </div>

          {/* Active Collaborators Avatars */}
          <div className="flex items-center -space-x-1.5">
            {collaborators.map((user) => (
              <div
                key={user.id}
                title={`${user.name} ${user.id === currentUser.id ? '(You)' : ''}`}
                style={{ backgroundColor: user.color }}
                className="w-5 h-5 rounded-full border border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white shadow"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Share & Room button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow transition"
          >
            <Share2 className="w-3 h-3" />
            <span>Collaborate ({collaborators.length})</span>
          </button>
        </div>
      </div>

      {/* Standard Toolbar (Icons row) */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#282b30] border-b border-zinc-700/60">
        <div className="flex items-center space-x-1">
          <button onClick={onNewDocument} title="New Document (Ctrl+N)" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white">
            <Laptop className="w-3.5 h-3.5" />
          </button>
          <button onClick={onOpenJSON} title="Open Document (Ctrl+O)" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white">
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onExport('json')} title="Save Document (Ctrl+S)" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white">
            <Save className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-600 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-600 mx-1" />

          {/* Quick Export drop triggers */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onExport('svg')}
              title="Export as Vector SVG"
              className="px-2 py-1 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 rounded font-medium flex items-center gap-1 text-[11px]"
            >
              <FileCode className="w-3 h-3 text-emerald-400" />
              <span>SVG</span>
            </button>
            <button
              onClick={() => onExport('pdf')}
              title="Export as PDF Document"
              className="px-2 py-1 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 rounded font-medium flex items-center gap-1 text-[11px]"
            >
              <FileCode className="w-3 h-3 text-red-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => onExport('png')}
              title="Export as PNG Image"
              className="px-2 py-1 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 rounded font-medium flex items-center gap-1 text-[11px]"
            >
              <FileImage className="w-3 h-3 text-blue-400" />
              <span>PNG</span>
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-600 mx-1" />

          {/* Rulers & Grid Toggles */}
          <button
            onClick={onToggleRulers}
            title="Toggle Rulers"
            className={`p-1.5 rounded hover:bg-zinc-700 ${showRulers ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-400'}`}
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleGrid}
            title="Toggle Grid (Snap)"
            className={`p-1.5 rounded hover:bg-zinc-700 ${showGrid ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-400'}`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-600 mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button onClick={onZoomOut} title="Zoom Out" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-zinc-300 font-mono text-[11px] px-1 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={onZoomIn} title="Zoom In" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={onZoomFit} title="Fit to Window" className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Dockers quick toggles */}
        <div className="flex items-center space-x-1 text-zinc-400">
          <button
            onClick={() => onToggleDocker('objects')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-zinc-700 ${
              activeDockers.includes('objects') ? 'bg-zinc-700 text-emerald-400 font-semibold' : ''
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Objects</span>
          </button>
          <button
            onClick={() => onToggleDocker('align')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-zinc-700 ${
              activeDockers.includes('align') ? 'bg-zinc-700 text-emerald-400 font-semibold' : ''
            }`}
          >
            <span>Align</span>
          </button>
          <button
            onClick={() => onToggleDocker('properties')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-zinc-700 ${
              activeDockers.includes('properties') ? 'bg-zinc-700 text-emerald-400 font-semibold' : ''
            }`}
          >
            <span>Properties</span>
          </button>
        </div>
      </div>

      {/* Collaboration Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-[#24272b] border border-zinc-700 rounded-lg p-5 w-96 shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-sm">Real-time Multi-User Studio</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">Your Designer Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempNameInput}
                    onChange={(e) => setTempNameInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => onUpdateUserName(tempNameInput)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">Collaboration Room ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempRoomInput}
                    onChange={(e) => setTempRoomInput(e.target.value)}
                    placeholder="e.g. design-team"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (tempRoomInput.trim()) onSwitchRoom(tempRoomInput.trim());
                    }}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs font-medium"
                  >
                    Switch
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">Share Invite Link</label>
                <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                  <span className="text-zinc-400 font-mono text-[10px] truncate flex-1">
                    {window.location.origin}?room={roomId}
                  </span>
                  <button
                    onClick={copyRoomLink}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded text-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-700">
                <div className="text-[11px] font-medium text-zinc-400 mb-2">Connected in this Room ({collaborators.length})</div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {collaborators.map((user) => (
                    <div key={user.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }} />
                        <span className="text-zinc-200">
                          {user.name} {user.id === currentUser.id && '(You)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">online</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
