import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  Monitor,
  FileText,
  Download as DownloadIcon,
  Image as ImageIcon,
  ChevronDown,
  ChevronLeft,
  Info,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  LayoutGrid,
  List,
  FolderPlus,
} from 'lucide-react';
import * as fabric from 'fabric';
import { PageConfig, ThemeMode } from '../types';
import {
  NURADRAW_EXPORT_FORMATS,
  NuraExportFormat,
  AdvancedExportSettings,
  DEFAULT_ADVANCED_EXPORT_SETTINGS,
  exportWithSettings,
  NdrProjectExtraData,
} from '../utils/exportUtils';

interface ExportModalProps {
  canvas: fabric.Canvas | null;
  pageConfig: PageConfig;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
  defaultFormatExt?: string;
  dialogMode?: 'save' | 'export';
  extraNdrData?: NdrProjectExtraData;
  pagesCount?: number;
  activePageIndex?: number;
  theme?: ThemeMode;
  onExportSuccess?: (message: string) => void;
  onSaveCompleted?: (savedFilename: string) => void;
}

interface FolderItem {
  id: string;
  label: string;
  path: string;
  icon: 'desktop' | 'docs' | 'downloads' | 'pictures' | 'pc';
}

interface SavedFileEntry {
  name: string;
  folderId: string;
  type: string;
  date: string;
  size: string;
}

const VIRTUAL_FOLDERS: FolderItem[] = [
  { id: 'desktop', label: 'Desktop', path: 'C:\\Users\\user\\Desktop', icon: 'desktop' },
  { id: 'documents', label: 'Documents', path: 'C:\\Users\\user\\Documents', icon: 'docs' },
  { id: 'downloads', label: 'Downloads', path: 'C:\\Users\\user\\Downloads', icon: 'downloads' },
  { id: 'pictures', label: 'Pictures', path: 'C:\\Users\\user\\Pictures', icon: 'pictures' },
  { id: 'projects', label: 'NuraDraw Projects', path: 'C:\\Users\\user\\Documents\\TraceDraw', icon: 'pc' },
];

const RECENT_EXPORTS_KEY = 'tracedraw_recent_exported_files_v1';

type SettingsTab = 'general' | 'color' | 'document' | 'objects' | 'prepress' | 'security' | 'issues';

export const ExportModal: React.FC<ExportModalProps> = ({
  canvas,
  pageConfig,
  documentName,
  isOpen,
  onClose,
  defaultFormatExt = 'pdf',
  dialogMode = 'export',
  extraNdrData,
  pagesCount = 1,
  theme = 'light',
  onExportSuccess,
  onSaveCompleted,
}) => {
  const isDark = theme === 'dark';
  const isSaveMode = dialogMode === 'save';
  const [step, setStep] = useState<'location' | 'settings'>('location');

  // Step 1: Location & Format state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(isSaveMode ? 'downloads' : 'desktop');
  const [customLocationPath, setCustomLocationPath] = useState<string>(
    isSaveMode ? 'C:\\Users\\user\\Downloads' : 'C:\\Users\\user\\Desktop'
  );
  const [nativeDirHandle, setNativeDirHandle] = useState<any | null>(null);
  const [nativeFileHandle, setNativeFileHandle] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string>(
    documentName.replace(/\.[^/.]+$/, '') || 'Untitled-1'
  );
  const [selectedFormatId, setSelectedFormatId] = useState<string>(isSaveMode ? 'ndr' : 'pdf');
  const [formatMenuOpen, setFormatMenuOpen] = useState<boolean>(false);
  const [selectedOnly, setSelectedOnly] = useState<boolean>(false);
  const [skipSettingsDialog, setSkipSettingsDialog] = useState<boolean>(false);
  const [explorerView, setExplorerView] = useState<'icons' | 'details'>(isSaveMode ? 'icons' : 'details');
  const [compatVersion, setCompatVersion] = useState<string>('25.1 (2024.1)');
  const [customFolders, setCustomFolders] = useState<FolderItem[]>([]);
  const [savedHistory, setSavedHistory] = useState<SavedFileEntry[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_EXPORTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedFileEntry[];
        return parsed.map((entry) =>
          entry.name.toLowerCase().endsWith('.ndr')
            ? { ...entry, type: 'Nura Draw (.ndr)' }
            : entry
        );
      }
    } catch {}
    return [
      { name: 'Untitled-1.ndr', folderId: 'downloads', type: 'Nura Draw (.ndr)', date: 'Today', size: '142 KB' },
      { name: 'Packaging-Box-Final.ndr', folderId: 'downloads', type: 'Nura Draw (.ndr)', date: 'Last month', size: '318 KB' },
      { name: 'Brand-Logo-Print.pdf', folderId: 'desktop', type: 'PDF Document', date: 'Today', size: '248 KB' },
      { name: 'Poster-Final.svg', folderId: 'desktop', type: 'SVG Document', date: 'Today', size: '64 KB' },
      { name: 'Flyer-A4.png', folderId: 'documents', type: 'PNG Image', date: 'Yesterday', size: '1.2 MB' },
    ];
  });

  // Step 2: 6+1 Tabs Settings state
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<AdvancedExportSettings>(DEFAULT_ADVANCED_EXPORT_SETTINGS);
  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<string[]>([
    'Document Distribution',
    'Prepress',
    'Web',
    'Archive (PDF/A-1b)',
    'Editing',
  ]);

  const formatDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileNameInputRef = useRef<HTMLInputElement | null>(null);

  const allFolders = useMemo(() => [...VIRTUAL_FOLDERS, ...customFolders], [customFolders]);

  const selectedFormat: NuraExportFormat = useMemo(
    () => NURADRAW_EXPORT_FORMATS.find((f) => f.id === selectedFormatId) || NURADRAW_EXPORT_FORMATS[0],
    [selectedFormatId]
  );

  const hasSelection = !!(canvas && canvas.getActiveObject());

  // Reset modal state on open
  useEffect(() => {
    if (!isOpen) return;
    setStep('location');
    setActiveTab('general');
    setFormatMenuOpen(false);
    setLocationNotice(null);
    setNativeFileHandle(null);
    const defaultFolder = isSaveMode
      ? VIRTUAL_FOLDERS.find((f) => f.id === 'downloads') || VIRTUAL_FOLDERS[0]
      : VIRTUAL_FOLDERS[0];
    setSelectedFolderId(defaultFolder.id);
    setCustomLocationPath(defaultFolder.path);
    setExplorerView(isSaveMode ? 'icons' : 'details');

    const cleanBase = documentName.replace(/\.[^/.]+$/, '') || 'Untitled-1';
    setFileName(cleanBase);

    const extLower = (defaultFormatExt || (isSaveMode ? 'ndr' : 'pdf')).toLowerCase();
    const matched =
      NURADRAW_EXPORT_FORMATS.find((f) => f.id === extLower || f.ext === extLower) ||
      NURADRAW_EXPORT_FORMATS[0];
    setSelectedFormatId(matched.id);

    setSettings((prev) => ({
      ...prev,
      pagesRangeText: pagesCount > 1 ? `1-${pagesCount}` : '1',
      exportRange: 'current_document',
      pageSizeMode: 'document',
    }));

    // Auto-focus & select filename for quick rename just like NuraDraw Save Drawing
    setTimeout(() => {
      if (fileNameInputRef.current) {
        fileNameInputRef.current.focus();
        fileNameInputRef.current.select();
      }
    }, 30);
  }, [isOpen, documentName, defaultFormatExt, pagesCount, isSaveMode]);

  // Close format dropdown on outside click
  useEffect(() => {
    if (!formatMenuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(e.target as Node)) {
        setFormatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [formatMenuOpen]);

  // Preflight issues calculation (matches "1 Issue" tab in screenshot)
  const preflightIssues = useMemo(() => {
    const issues: string[] = [];
    if (
      settings.openPasswordEnabled &&
      settings.openPassword !== settings.openPasswordConfirm
    ) {
      issues.push('Open password and Confirm password do not match.');
    }
    if (
      settings.permissionPasswordEnabled &&
      settings.permissionPassword !== settings.permissionPasswordConfirm
    ) {
      issues.push('Permission password and Confirm password do not match.');
    }
    if (selectedFormat.kind === 'pdf' && settings.outputColor === 'Native' && !settings.embedColorProfile) {
      issues.push('Color profile is not embedded; document colors may shift across devices.');
    }
    if (settings.pdfPreset === 'Prepress' && settings.colorDpi < 300) {
      issues.push('Prepress preset recommends Color downsampling >= 300 dpi.');
    }
    if (issues.length === 0 && canvas && canvas.getObjects().length === 0) {
      issues.push('Current page contains no vector or bitmap objects.');
    }
    return issues;
  }, [settings, selectedFormat, canvas]);

  if (!isOpen || !canvas) return null;

  const cleanFileBase = (fileName.trim() || 'Untitled-1').replace(/\.[^/.]+$/, '');
  const fullTargetFilename = `${cleanFileBase}.${selectedFormat.ext}`;
  const displayFullPath = nativeFileHandle
    ? `${customLocationPath} (${nativeFileHandle.name})`
    : `${customLocationPath.replace(/[\\/]+$/, '')}\\${fullTargetFilename}`;

  const handleSelectFolder = (folder: FolderItem) => {
    setSelectedFolderId(folder.id);
    setCustomLocationPath(folder.path);
    setNativeDirHandle(null);
    setNativeFileHandle(null);
    setLocationNotice(null);
  };

  // Try native OS File System Access API (save location / folder picker) with iframe fallback
  const handleBrowseNativeLocation = async () => {
    setLocationNotice(null);
    try {
      const win = window as any;
      if (typeof win.showSaveFilePicker === 'function') {
        const handle = await win.showSaveFilePicker({
          suggestedName: fullTargetFilename,
          types: [
            {
              description: selectedFormat.label,
              accept: { [selectedFormat.mime]: [`.${selectedFormat.ext}`] },
            },
          ],
        });
        setNativeFileHandle(handle);
        setNativeDirHandle(null);
        const base = String(handle.name || fullTargetFilename).replace(/\.[^/.]+$/, '');
        setFileName(base);
        setCustomLocationPath(`Selected System Location`);
        return;
      }
      if (typeof win.showDirectoryPicker === 'function') {
        const dir = await win.showDirectoryPicker({ mode: 'readwrite' });
        setNativeDirHandle(dir);
        setNativeFileHandle(null);
        setCustomLocationPath(`Local Folder: ${dir.name}`);
        return;
      }
      setLocationNotice('System folder picker unavailable in this browser; file will save to browser Downloads.');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setLocationNotice('Iframe preview uses browser Downloads — choose a preset folder or edit path below.');
    }
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'Prepress') {
      setSettings((s) => ({
        ...s,
        pdfPreset: presetName,
        outputColor: 'CMYK',
        compatibility: 'PDF/X-1a',
        colorDpi: 300,
        grayscaleDpi: 300,
        bleedLimitEnabled: true,
        cropMarks: true,
        registrationMarks: true,
      }));
    } else if (presetName === 'Web') {
      setSettings((s) => ({
        ...s,
        pdfPreset: presetName,
        outputColor: 'RGB',
        optimizeForWeb: true,
        colorDpi: 96,
        grayscaleDpi: 96,
        jpegQuality: 82,
        bleedLimitEnabled: false,
        cropMarks: false,
      }));
    } else if (presetName === 'Archive (PDF/A-1b)') {
      setSettings((s) => ({
        ...s,
        pdfPreset: presetName,
        embedFonts: true,
        embedColorProfile: true,
        compatibility: 'PDF/X-4',
      }));
    } else {
      setSettings((s) => ({
        ...s,
        pdfPreset: presetName,
      }));
    }
  };

  const performActualExport = async () => {
    if (!canvas) return;
    if (
      settings.openPasswordEnabled &&
      settings.openPassword !== settings.openPasswordConfirm
    ) {
      setActiveTab('security');
      setLocationNotice('Open password and confirmation do not match.');
      return;
    }
    if (
      settings.permissionPasswordEnabled &&
      settings.permissionPassword !== settings.permissionPasswordConfirm
    ) {
      setActiveTab('security');
      setLocationNotice('Permission password and confirmation do not match.');
      return;
    }

    setIsExporting(true);
    try {
      const effectiveSettings: AdvancedExportSettings = {
        ...settings,
        exportRange: selectedOnly ? 'selection' : settings.exportRange,
      };
      const method = await exportWithSettings(
        canvas,
        pageConfig,
        selectedFormat,
        fullTargetFilename,
        effectiveSettings,
        nativeFileHandle,
        nativeDirHandle,
        {
          ...extraNdrData,
          compatVersion,
        }
      );

      const newEntry: SavedFileEntry = {
        name: fullTargetFilename,
        folderId: selectedFolderId,
        type: selectedFormat.ext === 'ndr' ? 'Nura Draw (.ndr)' : `${selectedFormat.short} File`,
        date: 'Just now',
        size: 'Ready',
      };
      const updated = [newEntry, ...savedHistory.filter((h) => h.name !== fullTargetFilename)].slice(0, 16);
      setSavedHistory(updated);
      try {
        localStorage.setItem(RECENT_EXPORTS_KEY, JSON.stringify(updated));
      } catch {}

      onSaveCompleted?.(fullTargetFilename);
      onExportSuccess?.(
        method === 'download'
          ? `${isSaveMode ? 'Saved' : 'Exported'} ${fullTargetFilename} (${customLocationPath})`
          : `Saved ${fullTargetFilename} directly to chosen location`
      );
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setLocationNotice('Save failed — please verify settings and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStep1ExportClick = () => {
    if (selectedOnly && hasSelection) {
      setSettings((s) => ({ ...s, exportRange: 'selection', pageSizeMode: 'selected_objects' }));
    }
    if (
      isSaveMode ||
      skipSettingsDialog ||
      selectedFormat.ext === 'ndr' ||
      selectedFormat.ext === 'dwg' ||
      selectedFormat.ext === 'dxf'
    ) {
      performActualExport();
    } else {
      setStep('settings');
    }
  };

  // Shared Windows classic UI styles matching the attached screenshots
  const winBg = isDark ? 'bg-[#4d5056] text-zinc-100 border-[#6a6e77]' : 'bg-[#f0f0f0] text-zinc-900 border-[#8a8d93]';
  const winHeader = isDark ? 'bg-[#44474d] border-[#646870] text-zinc-100' : 'bg-white border-[#d6d6d6] text-zinc-900';
  const winInput = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100 focus:border-[#0078d7]'
    : 'bg-white border-[#adadad] text-zinc-900 focus:border-[#0078d7]';
  const winBtn = isDark
    ? 'bg-[#5a5e66] border-[#6e737d] hover:bg-[#666a73] text-zinc-100'
    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e5f1fb] hover:border-[#0078d7] text-zinc-900';
  const fieldsetBorder = isDark ? 'border-[#646870]' : 'border-[#d0d0d0]';

  const pinnedFormats = NURADRAW_EXPORT_FORMATS.filter((f) => f.pinned);
  const allOtherFormats = NURADRAW_EXPORT_FORMATS.filter((f) => !f.pinned);

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 select-none"
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {step === 'location' ? (
        /* ==================== STEP 1: NURADRAW SAVE DRAWING / EXPORT LOCATION & RENAME DIALOG ==================== */
        <div className={`w-[740px] max-w-[96vw] border shadow-2xl text-[12px] ${winBg}`}>
          {/* Window Title Bar */}
          <div className={`h-8 px-3 flex items-center justify-between border-b ${winHeader}`}>
            <span className="flex items-center gap-2 font-normal text-[12px]">
              {isSaveMode && (
                <img
                  src="/assets/aistudio/favicon_23650500.svg"
                  alt=""
                  className="w-4 h-4 object-contain shrink-0"
                  draggable={false}
                />
              )}
              <span>{isSaveMode ? 'Save Drawing' : 'Export'}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-red-600 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Windows Address & Location Bar */}
          <div className={`px-3 py-1.5 border-b flex items-center gap-2 ${isDark ? 'border-[#646870] bg-[#53575f]' : 'border-[#d6d6d6] bg-[#f7f7f7]'}`}>
            <span className="text-[11px] shrink-0 opacity-75">
              This PC &gt; {allFolders.find((f) => f.id === selectedFolderId)?.label || 'Downloads'}
            </span>
            <div className={`flex-1 flex items-center gap-1.5 px-2 py-1 border text-[11px] ${winInput}`}>
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="text"
                value={customLocationPath}
                onChange={(e) => {
                  setCustomLocationPath(e.target.value);
                  setNativeDirHandle(null);
                  setNativeFileHandle(null);
                }}
                className="flex-1 bg-transparent outline-none text-[11px]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const idx = customFolders.length + 1;
                const folderName = `New folder (${idx})`;
                const newF: FolderItem = {
                  id: `custom_${Date.now()}`,
                  label: folderName,
                  path: `${customLocationPath.replace(/[\\/]+$/, '')}\\${folderName}`,
                  icon: 'pc',
                };
                setCustomFolders((prev) => [...prev, newF]);
                handleSelectFolder(newF);
              }}
              className={`px-2 py-1 border text-[11px] shrink-0 flex items-center gap-1 transition ${winBtn}`}
              title="Create new folder"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
              <span>New folder</span>
            </button>
            <button
              type="button"
              onClick={handleBrowseNativeLocation}
              className={`px-2.5 py-1 border text-[11px] shrink-0 transition ${winBtn}`}
              title="Select folder or save location on your computer"
            >
              Browse Location...
            </button>
            <div className="flex items-center border border-zinc-400/50 rounded-xs overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setExplorerView('icons')}
                title="Large Icons View"
                className={`p-1 ${explorerView === 'icons' ? 'bg-[#cce8ff] text-zinc-900' : 'opacity-70 hover:opacity-100'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setExplorerView('details')}
                title="Details List View"
                className={`p-1 ${explorerView === 'details' ? 'bg-[#cce8ff] text-zinc-900' : 'opacity-70 hover:opacity-100'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Explorer Body: Left Quick Access + Right Files Grid/List */}
          <div className="flex h-[250px] border-b border-[#d0d0d0] dark:border-zinc-700">
            {/* Quick Access Sidebar */}
            <div
              className={`w-44 border-r p-1.5 space-y-0.5 overflow-y-auto ${
                isDark ? 'bg-[#46494f] border-[#646870]' : 'bg-[#f8f8f8] border-[#dcdcdc]'
              }`}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Quick access
              </div>
              {allFolders.map((folder) => {
                const isActive = selectedFolderId === folder.id && !nativeFileHandle && !nativeDirHandle;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleSelectFolder(folder)}
                    className={`w-full text-left px-2 py-1.5 flex items-center gap-2 text-[11.5px] rounded-xs transition ${
                      isActive
                        ? 'bg-[#cce8ff] text-zinc-900 border border-[#99d1ff]'
                        : isDark
                        ? 'hover:bg-[#575b63] text-zinc-200'
                        : 'hover:bg-[#e5f3ff] text-zinc-800'
                    }`}
                  >
                    {folder.icon === 'desktop' && <Monitor className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                    {folder.icon === 'docs' && <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    {folder.icon === 'downloads' && <DownloadIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {folder.icon === 'pictures' && <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                    {folder.icon === 'pc' && <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className="truncate">{folder.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Directory File Area */}
            <div className={`flex-1 overflow-y-auto p-2 ${isDark ? 'bg-[#3e4147]' : 'bg-white'}`}>
              {explorerView === 'icons' ? (
                <div className="grid grid-cols-5 gap-2">
                  {savedHistory
                    .filter((entry) => entry.folderId === selectedFolderId || selectedFolderId === 'downloads')
                    .map((entry) => {
                      const base = entry.name.replace(/\.[^/.]+$/, '');
                      const lowerName = entry.name.toLowerCase();
                      const isNdr = lowerName.endsWith('.ndr');
                      const isDwg = lowerName.endsWith('.dwg') || lowerName.endsWith('.dxf');
                      const isSelected = fileName.trim().toLowerCase() === base.toLowerCase();
                      return (
                        <button
                          key={entry.name}
                          type="button"
                          onClick={() => setFileName(base)}
                          onDoubleClick={() => {
                            setFileName(base);
                            performActualExport();
                          }}
                          className={`flex flex-col items-center p-2 rounded-xs border text-center transition ${
                            isSelected
                              ? 'bg-[#cce8ff] border-[#99d1ff] text-zinc-900'
                              : isDark
                              ? 'border-transparent hover:bg-[#575b63] text-zinc-100'
                              : 'border-transparent hover:bg-[#e5f3ff] text-zinc-800'
                          }`}
                        >
                          {isNdr ? (
                            <img
                              src="/assets/aistudio/favicon_23650500.svg"
                              alt={entry.name}
                              className="w-11 h-12 object-contain mb-1.5"
                              draggable={false}
                            />
                          ) : isDwg ? (
                            <div className="w-11 h-12 rounded-sm flex flex-col items-center justify-center shadow-xs mb-1.5 border bg-sky-50 border-sky-300 text-sky-700 font-bold text-[10px]">
                              <FileText className="w-5 h-5 mb-0.5" />
                              <span>DWG</span>
                            </div>
                          ) : (
                            <div className="w-11 h-12 rounded-sm flex items-center justify-center shadow-xs mb-1.5 border bg-zinc-100 border-zinc-300 text-zinc-600">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <span className="text-[10.5px] leading-tight line-clamp-2 break-all">{entry.name}</span>
                        </button>
                      );
                    })}
                </div>
              ) : (
                <>
                  <div
                    className={`grid grid-cols-12 px-2 py-1 text-[10.5px] border-b font-medium ${
                      isDark ? 'border-[#646870] text-zinc-300' : 'border-zinc-200 text-zinc-500'
                    }`}
                  >
                    <span className="col-span-6">Name</span>
                    <span className="col-span-3">Type</span>
                    <span className="col-span-3 text-right">Date modified</span>
                  </div>
                  {savedHistory
                    .filter((entry) => entry.folderId === selectedFolderId || selectedFolderId === 'downloads')
                    .map((entry) => (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() => {
                          const base = entry.name.replace(/\.[^/.]+$/, '');
                          setFileName(base);
                        }}
                        className={`w-full grid grid-cols-12 px-2 py-1 text-left text-[11px] items-center ${
                          isDark ? 'hover:bg-[#575b63] text-zinc-100' : 'hover:bg-[#e5f3ff] text-zinc-800'
                        }`}
                      >
                        <span className="col-span-6 truncate flex items-center gap-1.5">
                          {entry.name.toLowerCase().endsWith('.ndr') ? (
                            <img
                              src="/assets/aistudio/favicon_23650500.svg"
                              alt=""
                              className="w-3.5 h-3.5 object-contain shrink-0"
                              draggable={false}
                            />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">{entry.name}</span>
                        </span>
                        <span className="col-span-3 truncate opacity-70">{entry.type}</span>
                        <span className="col-span-3 text-right opacity-60">{entry.date}</span>
                      </button>
                    ))}
                </>
              )}
              {nativeFileHandle && (
                <div className="mt-2 mx-1 p-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Selected native save file: <strong>{nativeFileHandle.name}</strong>
                  </span>
                </div>
              )}
              {nativeDirHandle && (
                <div className="mt-2 mx-1 p-2 rounded border border-sky-500/40 bg-sky-500/10 text-[11px] flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    Saving directly inside system folder: <strong>{nativeDirHandle.name}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* File Name, Save as Type & NuraDraw Save Options */}
          <div className="px-4 py-3 space-y-2.5">
            {locationNotice && (
              <div className="px-2.5 py-1 text-[11px] rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{locationNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-12 items-center gap-2">
              <label className="col-span-2 text-right text-[11.5px]">File name:</label>
              <div className="col-span-8 flex items-center">
                <input
                  ref={fileNameInputRef}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStep1ExportClick();
                    }
                  }}
                  placeholder="Enter file name..."
                  className={`w-full px-2 py-1 border text-[12px] outline-none ${winInput}`}
                />
              </div>
              <div className="col-span-2 text-[11px] opacity-75 font-mono truncate">
                .{selectedFormat.ext}
              </div>
            </div>

            {/* Save as type dropdown */}
            <div className="grid grid-cols-12 items-center gap-2 relative" ref={formatDropdownRef}>
              <label className="col-span-2 text-right text-[11.5px]">Save as type:</label>
              <div className="col-span-8 relative">
                <button
                  type="button"
                  onClick={() => setFormatMenuOpen((o) => !o)}
                  className={`w-full px-2 py-1 border text-left text-[12px] flex items-center justify-between gap-2 ${winInput}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {selectedFormat.ext === 'ndr' && (
                      <img
                        src="/assets/aistudio/favicon_23650500.svg"
                        alt=""
                        className="w-3.5 h-3.5 object-contain shrink-0"
                        draggable={false}
                      />
                    )}
                    <span className="truncate">{selectedFormat.label}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </button>

                {formatMenuOpen && (
                  <div
                    className={`absolute left-0 right-0 bottom-full mb-0.5 max-h-[300px] overflow-y-auto border shadow-2xl z-50 text-[12px] ${
                      isDark ? 'bg-[#45484e] border-[#686c75] text-zinc-100' : 'bg-white border-[#7a7d82] text-zinc-900'
                    }`}
                  >
                    {pinnedFormats.map((fmt) => {
                      const active = selectedFormatId === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => {
                            setSelectedFormatId(fmt.id);
                            setFormatMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-0.5 truncate flex items-center gap-1.5 ${
                            active
                              ? 'bg-[#0078d7] text-white'
                              : isDark
                              ? 'hover:bg-zinc-700'
                              : 'hover:bg-[#0078d7] hover:text-white'
                          }`}
                        >
                          {fmt.ext === 'ndr' && (
                            <img
                              src="/assets/aistudio/favicon_23650500.svg"
                              alt=""
                              className="w-3.5 h-3.5 object-contain shrink-0"
                              draggable={false}
                            />
                          )}
                          <span className="truncate">{fmt.label}</span>
                        </button>
                      );
                    })}

                    <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                    {allOtherFormats.map((fmt) => {
                      const active = selectedFormatId === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => {
                            setSelectedFormatId(fmt.id);
                            setFormatMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-0.5 truncate ${
                            active
                              ? 'bg-[#0078d7] text-white'
                              : isDark
                              ? 'hover:bg-zinc-700'
                              : 'hover:bg-[#0078d7] hover:text-white'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2" />
            </div>

            {isSaveMode ? (
              <div className="pt-1 space-y-2">
                <div className="grid grid-cols-12 items-start gap-2 text-[11px]">
                  <div className="col-span-4 flex items-center gap-1.5 pl-4">
                    <input
                      type="checkbox"
                      id="save_embed_profile"
                      checked={settings.embedColorProfile}
                      onChange={(e) => setSettings((s) => ({ ...s, embedColorProfile: e.target.checked }))}
                    />
                    <label htmlFor="save_embed_profile" className="cursor-pointer text-[#0066cc] dark:text-sky-400">
                      Embed color profiles
                    </label>
                  </div>
                  <div className="col-span-4 opacity-80 leading-tight">
                    Color profiles: sRGB IEC61966-2.1; U.S. Web Coated (SWOP) v2
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#0066cc] dark:text-sky-400">
                      <input
                        type="checkbox"
                        checked={settings.embedFonts}
                        onChange={(e) => setSettings((s) => ({ ...s, embedFonts: e.target.checked }))}
                      />
                      <span>Embed fonts</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-75">Version:</span>
                      <select
                        value={compatVersion}
                        onChange={(e) => setCompatVersion(e.target.value)}
                        className={`px-1.5 py-0.5 border text-[11px] outline-none ${winInput}`}
                      >
                        <option value="25.1 (2024.1)">25.1 (2024.1)</option>
                        <option value="24.0 (2022)">24.0 (2022)</option>
                        <option value="22.0 (2020)">22.0 (2020)</option>
                        <option value="19.0 (2017)">19.0 (2017)</option>
                        <option value="17.0 (X7)">17.0 (X7)</option>
                        <option value="14.0 (X4)">14.0 (X4)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className={`flex items-center gap-1.5 text-[11px] ${!hasSelection ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      disabled={!hasSelection}
                      checked={selectedOnly}
                      onChange={(e) => setSelectedOnly(e.target.checked)}
                    />
                    <span>Selected only</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('settings')}
                      className={`px-3 py-1 border text-[12px] transition ${winBtn}`}
                    >
                      Advanced...
                    </button>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleStep1ExportClick}
                      className={`w-24 py-1 border-2 border-[#0078d7] text-[12px] font-medium transition ${winBtn}`}
                    >
                      {isExporting ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className={`w-24 py-1 border text-[12px] transition ${winBtn}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 items-center gap-2 pt-0.5">
                <div className="col-span-2" />
                <div className="col-span-7 flex items-center gap-5 text-[11.5px]">
                  <label className={`flex items-center gap-1.5 ${!hasSelection ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      disabled={!hasSelection}
                      checked={selectedOnly}
                      onChange={(e) => setSelectedOnly(e.target.checked)}
                    />
                    <span>Selected only</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipSettingsDialog}
                      onChange={(e) => setSkipSettingsDialog(e.target.checked)}
                    />
                    <span>Do not show filter dialog</span>
                  </label>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleStep1ExportClick}
                    className={`w-24 py-1 border text-[12px] font-medium transition ${winBtn}`}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`w-24 py-1 border text-[12px] transition ${winBtn}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================== STEP 2: NURADRAW SETTINGS WINDOW (MATCHING 6 TABS + ISSUES) ==================== */
        <div className={`w-[580px] max-w-[95vw] border shadow-2xl text-[12px] ${winBg}`}>
          {/* Window Title Bar */}
          <div className={`h-8 px-3 flex items-center justify-between border-b ${winHeader}`}>
            <span className="font-normal text-[12px]">
              {selectedFormat.kind === 'pdf' ? 'PDF Settings' : `${selectedFormat.short} Export Settings`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-red-600 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab Strip (General | Color | Document | Objects | Prepress | Security | Issues) */}
          <div className="px-3 pt-2.5">
            <div className="flex items-end border-b border-[#c5c5c5] dark:border-zinc-700 gap-0.5">
              {(
                [
                  { id: 'general', label: 'General' },
                  { id: 'color', label: 'Color' },
                  { id: 'document', label: 'Document' },
                  { id: 'objects', label: 'Objects' },
                  { id: 'prepress', label: 'Prepress' },
                  { id: 'security', label: 'Security' },
                  {
                    id: 'issues',
                    label:
                      preflightIssues.length === 1
                        ? '1 Issue'
                        : `${preflightIssues.length} Issues`,
                  },
                ] as { id: SettingsTab; label: string }[]
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 text-[11.5px] border border-b-0 -mb-[1px] transition ${
                      isActive
                        ? isDark
                          ? 'bg-[#545860] border-[#6a6e77] text-white font-medium pb-1.5 z-10'
                          : 'bg-white border-[#c5c5c5] text-zinc-900 pb-1.5 z-10'
                        : isDark
                        ? 'bg-[#45484e] border-[#646870] text-zinc-300 hover:text-white'
                        : 'bg-[#e6e6e6] border-[#d0d0d0] text-zinc-700 hover:bg-[#ededed]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Active Tab Body */}
            <div
              className={`border border-t-0 p-4 min-h-[330px] ${
                isDark ? 'bg-[#545860] border-[#6a6e77]' : 'bg-white border-[#c5c5c5]'
              }`}
            >
              {/* TAB 1: GENERAL (image_f4eecf51.png) */}
              {activeTab === 'general' && (
                <div className="space-y-3 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0">File name:</span>
                      <span className="truncate font-normal opacity-90" title={displayFullPath}>
                        {displayFullPath}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('location')}
                      className={`px-2 py-0.5 border text-[11px] shrink-0 ${winBtn}`}
                    >
                      Change...
                    </button>
                  </div>

                  {/* Export range */}
                  <fieldset className={`border px-3 py-2 ${fieldsetBorder}`}>
                    <legend className="px-1 text-[11.5px]">Export range</legend>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportRange"
                          checked={settings.exportRange === 'current_document'}
                          onChange={() => setSettings((s) => ({ ...s, exportRange: 'current_document' }))}
                        />
                        <span>
                          <span className="underline">C</span>urrent document
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportRange"
                          checked={settings.exportRange === 'current_page'}
                          onChange={() => setSettings((s) => ({ ...s, exportRange: 'current_page' }))}
                        />
                        <span>
                          C<span className="underline">u</span>rrent Page
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportRange"
                          checked={settings.exportRange === 'documents'}
                          onChange={() => setSettings((s) => ({ ...s, exportRange: 'documents' }))}
                        />
                        <span>
                          <span className="underline">D</span>ocuments
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="exportRange"
                            checked={settings.exportRange === 'pages'}
                            onChange={() => setSettings((s) => ({ ...s, exportRange: 'pages' }))}
                          />
                          <span>
                            <span className="underline">P</span>ages:
                          </span>
                        </label>
                        <input
                          type="text"
                          value={settings.pagesRangeText}
                          disabled={settings.exportRange !== 'pages'}
                          onChange={(e) => setSettings((s) => ({ ...s, pagesRangeText: e.target.value }))}
                          className={`w-24 px-1.5 py-0.5 border text-[11.5px] disabled:opacity-50 ${winInput}`}
                        />
                      </div>

                      <label
                        className={`flex items-center gap-2 ${
                          !hasSelection ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportRange"
                          disabled={!hasSelection}
                          checked={settings.exportRange === 'selection'}
                          onChange={() => setSettings((s) => ({ ...s, exportRange: 'selection' }))}
                        />
                        <span>
                          <span className="underline">S</span>election
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Page size */}
                  <fieldset className={`border px-3 py-2 ${fieldsetBorder}`}>
                    <legend className="px-1 text-[11.5px]">Page size</legend>
                    <div className="space-y-1.5 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pageSizeMode"
                          checked={settings.pageSizeMode === 'document'}
                          onChange={() => setSettings((s) => ({ ...s, pageSizeMode: 'document' }))}
                        />
                        <span>Defined by document</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          !hasSelection ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pageSizeMode"
                          disabled={!hasSelection}
                          checked={settings.pageSizeMode === 'selected_objects'}
                          onChange={() => setSettings((s) => ({ ...s, pageSizeMode: 'selected_objects' }))}
                        />
                        <span>Defined by selected objects</span>
                      </label>
                    </div>
                  </fieldset>

                  <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.cropToPage}
                      onChange={(e) => setSettings((s) => ({ ...s, cropToPage: e.target.checked }))}
                    />
                    <span>Crop to page on export</span>
                  </label>

                  {/* Preset & Compatibility */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-3">
                      <label className="w-24">
                        {selectedFormat.kind === 'pdf' ? 'PDF preset:' : 'Export preset:'}
                      </label>
                      <select
                        value={settings.pdfPreset}
                        onChange={(e) => applyPreset(e.target.value)}
                        className={`w-60 px-2 py-1 border text-[12px] ${winInput}`}
                      >
                        {customPresets.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Save current as custom preset"
                        onClick={() => {
                          const label = `Custom ${customPresets.length - 4}`;
                          setCustomPresets((prev) => [...prev, label]);
                          setSettings((s) => ({ ...s, pdfPreset: label }));
                        }}
                        className={`p-1 border ${winBtn}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove selected custom preset"
                        onClick={() => {
                          if (customPresets.length > 5 && settings.pdfPreset.startsWith('Custom')) {
                            const next = customPresets.filter((p) => p !== settings.pdfPreset);
                            setCustomPresets(next);
                            setSettings((s) => ({ ...s, pdfPreset: next[0] }));
                          }
                        }}
                        className={`p-1 border ${winBtn}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="w-24">Compatibility:</label>
                      <select
                        value={settings.compatibility}
                        onChange={(e) => setSettings((s) => ({ ...s, compatibility: e.target.value }))}
                        className={`w-60 px-2 py-1 border text-[12px] ${winInput}`}
                      >
                        <option value="Acrobat DC">Acrobat DC</option>
                        <option value="Acrobat 9.0">Acrobat 9.0</option>
                        <option value="Acrobat 8.0">Acrobat 8.0</option>
                        <option value="PDF/X-1a">PDF/X-1a</option>
                        <option value="PDF/X-3">PDF/X-3</option>
                        <option value="PDF/X-4">PDF/X-4</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COLOR (image_fa201c45.png) */}
              {activeTab === 'color' && (
                <div className="space-y-3 text-[12px]">
                  <fieldset className={`border px-3 py-2.5 space-y-2.5 ${fieldsetBorder}`}>
                    <legend className="px-1 text-[11.5px]">Color management</legend>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="colorManagement"
                          checked={settings.colorManagementMode === 'document'}
                          onChange={() => setSettings((s) => ({ ...s, colorManagementMode: 'document' }))}
                        />
                        <span>Use document color settings</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="colorManagement"
                          checked={settings.colorManagementMode === 'proof'}
                          onChange={() => setSettings((s) => ({ ...s, colorManagementMode: 'proof' }))}
                        />
                        <span>Use color proof settings</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2 pt-1">
                      <label className="col-span-4">Output color:</label>
                      <select
                        value={settings.outputColor}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            outputColor: e.target.value as AdvancedExportSettings['outputColor'],
                          }))
                        }
                        className={`col-span-4 px-2 py-1 border text-[12px] ${winInput}`}
                      >
                        <option value="Native">Native</option>
                        <option value="RGB">RGB</option>
                        <option value="CMYK">CMYK</option>
                        <option value="Grayscale">Grayscale</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.convertSpotColors}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, convertSpotColors: e.target.checked }))
                          }
                        />
                        <span>Convert spot colors to</span>
                      </label>
                      <select
                        disabled={!settings.convertSpotColors}
                        value={settings.spotTarget}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            spotTarget: e.target.value as 'CMYK' | 'RGB',
                          }))
                        }
                        className={`col-span-4 px-2 py-1 border text-[12px] disabled:opacity-50 ${winInput}`}
                      >
                        <option value="CMYK">CMYK</option>
                        <option value="RGB">RGB</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.embedColorProfile}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, embedColorProfile: e.target.checked }))
                          }
                        />
                        <span>Embed color profile</span>
                      </label>
                      <span className="col-span-8 text-[11.5px] opacity-85">
                        {settings.outputColor === 'CMYK'
                          ? 'U.S. Web Coated (SWOP) v2 - 557 KB'
                          : 'sRGB IEC61966-2.1 - 3.07 KB'}
                      </span>
                    </div>
                  </fieldset>

                  <fieldset className={`border px-3 py-2.5 space-y-1.5 ${fieldsetBorder}`}>
                    <legend className="px-1 text-[11.5px]">Other color controls</legend>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.preserveOverprints}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, preserveOverprints: e.target.checked }))
                        }
                      />
                      <span>Preserve document overprints</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.alwaysOverprintBlack}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, alwaysOverprintBlack: e.target.checked }))
                        }
                      />
                      <span>Always overprint black</span>
                    </label>
                  </fieldset>
                </div>
              )}

              {/* TAB 3: DOCUMENT (image_58911b56.png) */}
              {activeTab === 'document' && (
                <div className="space-y-3 text-[12px]">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-2">Author:</label>
                    <input
                      type="text"
                      value={settings.author}
                      onChange={(e) => setSettings((s) => ({ ...s, author: e.target.value }))}
                      className={`col-span-6 px-2 py-1 border text-[12px] ${winInput}`}
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-2">Keywords:</label>
                    <input
                      type="text"
                      value={settings.keywords}
                      onChange={(e) => setSettings((s) => ({ ...s, keywords: e.target.value }))}
                      className={`col-span-6 px-2 py-1 border text-[12px] ${winInput}`}
                    />
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.optimizeForWeb}
                        onChange={(e) => setSettings((s) => ({ ...s, optimizeForWeb: e.target.checked }))}
                      />
                      <span>
                        Optimi<span className="underline">z</span>e for web
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeComments}
                        onChange={(e) => setSettings((s) => ({ ...s, includeComments: e.target.checked }))}
                      />
                      <span>
                        Include <span className="underline">c</span>omments
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-12 gap-3 pt-1">
                    <fieldset className={`col-span-6 border px-3 py-2 space-y-1.5 ${fieldsetBorder}`}>
                      <legend className="px-1 text-[11.5px]">Bookmarks</legend>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.includeHyperlinks}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, includeHyperlinks: e.target.checked }))
                          }
                        />
                        <span>Include hyperlinks</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.generateBookmarks}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, generateBookmarks: e.target.checked }))
                          }
                        />
                        <span>
                          Generate <span className="underline">b</span>ookmarks
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.generateThumbnails}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, generateThumbnails: e.target.checked }))
                          }
                        />
                        <span>
                          Generate <span className="underline">t</span>humbnails
                        </span>
                      </label>

                      <div className="pt-1 font-medium text-[11.5px]">On start:</div>
                      {(
                        [
                          { id: 'Page Only', label: 'Page Only' },
                          { id: 'Full Screen', label: 'Full Screen' },
                          { id: 'Bookmarks', label: 'Bookmarks' },
                          { id: 'Thumbnails', label: 'Thumbnails' },
                        ] as const
                      ).map((mode) => (
                        <label
                          key={mode.id}
                          className={`flex items-center gap-2 ${
                            mode.id === 'Thumbnails' && !settings.generateThumbnails
                              ? 'opacity-45 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="radio"
                            name="onStartMode"
                            disabled={mode.id === 'Thumbnails' && !settings.generateThumbnails}
                            checked={settings.onStartMode === mode.id}
                            onChange={() => setSettings((s) => ({ ...s, onStartMode: mode.id }))}
                          />
                          <span>{mode.label}</span>
                        </label>
                      ))}
                    </fieldset>

                    <fieldset className={`col-span-6 border px-3 py-2 space-y-1.5 h-fit ${fieldsetBorder}`}>
                      <legend className="px-1 text-[11.5px]">Encoding</legend>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pdfEncoding"
                          checked={settings.encoding === 'ASCII 85'}
                          onChange={() => setSettings((s) => ({ ...s, encoding: 'ASCII 85' }))}
                        />
                        <span>
                          <span className="underline">A</span>SCII 85
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pdfEncoding"
                          checked={settings.encoding === 'Binary'}
                          onChange={() => setSettings((s) => ({ ...s, encoding: 'Binary' }))}
                        />
                        <span>
                          Bi<span className="underline">n</span>ary
                        </span>
                      </label>
                    </fieldset>
                  </div>
                </div>
              )}

              {/* TAB 4: OBJECTS (image_d2e82743.png) */}
              {activeTab === 'objects' && (
                <div className="space-y-3 text-[12px]">
                  <div className="grid grid-cols-12 gap-3">
                    {/* Left Column: Compression + Downsampling */}
                    <div className="col-span-6 space-y-2.5">
                      <fieldset className={`border px-3 py-2 space-y-2 ${fieldsetBorder}`}>
                        <legend className="px-1 text-[11.5px]">Compression</legend>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11.5px]">Compression type:</label>
                          <select
                            value={settings.compressionType}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                compressionType: e.target.value as AdvancedExportSettings['compressionType'],
                              }))
                            }
                            className={`w-24 px-1.5 py-0.5 border text-[11.5px] ${winInput}`}
                          >
                            <option value="JPEG">JPEG</option>
                            <option value="LZW">LZW</option>
                            <option value="ZIP">ZIP</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11.5px]">JPEG Quality:</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={10}
                              max={100}
                              value={settings.jpegQuality}
                              onChange={(e) =>
                                setSettings((s) => ({ ...s, jpegQuality: Number(e.target.value) }))
                              }
                              className="flex-1 accent-[#0078d7]"
                            />
                            <div className={`px-1.5 py-0.5 border w-14 text-right text-[11px] ${winInput}`}>
                              {settings.jpegQuality} %
                            </div>
                          </div>
                          <div className="flex justify-between text-[10.5px] opacity-75 pr-16">
                            <span>Low</span>
                            <span>High</span>
                          </div>
                        </div>
                      </fieldset>

                      <fieldset className={`border px-3 py-2 space-y-1.5 ${fieldsetBorder}`}>
                        <legend className="px-1 text-[11.5px]">Downsampling</legend>
                        {(
                          [
                            {
                              checkedKey: 'downsampleColor',
                              valKey: 'colorDpi',
                              label: (
                                <>
                                  <span className="underline">C</span>olor
                                </>
                              ),
                            },
                            {
                              checkedKey: 'downsampleGrayscale',
                              valKey: 'grayscaleDpi',
                              label: (
                                <>
                                  <span className="underline">G</span>rayscale
                                </>
                              ),
                            },
                            {
                              checkedKey: 'downsampleMono',
                              valKey: 'monoDpi',
                              label: (
                                <>
                                  <span className="underline">M</span>onochrome
                                </>
                              ),
                            },
                          ] as const
                        ).map((row) => (
                          <div key={row.valKey} className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings[row.checkedKey]}
                                onChange={(e) =>
                                  setSettings((s) => ({ ...s, [row.checkedKey]: e.target.checked }))
                                }
                              />
                              <span>{row.label}</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={36}
                                max={1200}
                                value={settings[row.valKey]}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [row.valKey]: Math.max(36, Number(e.target.value) || 72),
                                  }))
                                }
                                className={`w-16 px-1.5 py-0.5 border text-[11.5px] ${winInput}`}
                              />
                              <span className="text-[11px]">dpi</span>
                            </div>
                          </div>
                        ))}
                      </fieldset>
                    </div>

                    {/* Right Column: Text & Vector Options */}
                    <div className="col-span-6 space-y-2.5">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.compressTextLineArt}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, compressTextLineArt: e.target.checked }))
                            }
                          />
                          <span>Compress text and line art</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.exportTextAsCurves}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, exportTextAsCurves: e.target.checked }))
                            }
                          />
                          <span>
                            Export all <span className="underline">t</span>ext as curves
                          </span>
                        </label>
                      </div>

                      <fieldset className={`border px-3 py-2 space-y-1.5 ${fieldsetBorder}`}>
                        <legend className="px-1 text-[11.5px]">Text</legend>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.embedFonts}
                            onChange={(e) => setSettings((s) => ({ ...s, embedFonts: e.target.checked }))}
                          />
                          <span>
                            Embed <span className="underline">f</span>onts in document
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.embedBase14Fonts}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, embedBase14Fonts: e.target.checked }))
                            }
                          />
                          <span>
                            Embed <span className="underline">b</span>ase 14 fonts
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.convertTrueTypeToType1}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, convertTrueTypeToType1: e.target.checked }))
                            }
                          />
                          <span>Convert TrueType to Type 1</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.subsetFonts}
                            onChange={(e) => setSettings((s) => ({ ...s, subsetFonts: e.target.checked }))}
                          />
                          <span>
                            <span className="underline">S</span>ubset fonts
                          </span>
                        </label>
                        <div className="flex items-center gap-2 pl-5 pt-0.5">
                          <span className="text-[11.5px]">Under</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={settings.subsetThreshold}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, subsetThreshold: Number(e.target.value) || 80 }))
                            }
                            className={`w-16 px-1.5 py-0.5 border text-[11.5px] ${winInput}`}
                          />
                          <span>%</span>
                        </div>
                      </fieldset>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.renderComplexFillsAsBitmaps}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, renderComplexFillsAsBitmaps: e.target.checked }))
                        }
                      />
                      <span>
                        Render comple<span className="underline">x</span> fills as bitmaps
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span>EPS files:</span>
                      <select
                        value={settings.epsFilesMode}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            epsFilesMode: e.target.value as 'PostScript' | 'Preview only',
                          }))
                        }
                        className={`w-44 px-2 py-0.5 border text-[11.5px] ${winInput}`}
                      >
                        <option value="PostScript">PostScript</option>
                        <option value="Preview only">Preview only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PREPRESS (image_37ab15aa.png) */}
              {activeTab === 'prepress' && (
                <div className="space-y-3 text-[12px]">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.bleedLimitEnabled}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, bleedLimitEnabled: e.target.checked }))
                        }
                      />
                      <span>
                        <span className="underline">B</span>leed Limit
                      </span>
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={0.05}
                        min={0}
                        max={2}
                        disabled={!settings.bleedLimitEnabled}
                        value={settings.bleedLimitInches}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            bleedLimitInches: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className={`w-20 px-1.5 py-0.5 border text-[11.5px] disabled:opacity-50 ${winInput}`}
                      />
                      <span>"</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.preserveHalftone}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, preserveHalftone: e.target.checked }))
                      }
                    />
                    <span>
                      Preserve <span className="underline">h</span>alftone screen information
                    </span>
                  </label>

                  <fieldset className={`border px-3 py-2.5 ${fieldsetBorder}`}>
                    <legend className="px-1 text-[11.5px]">Printer's marks</legend>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.cropMarks}
                          onChange={(e) => setSettings((s) => ({ ...s, cropMarks: e.target.checked }))}
                        />
                        <span>
                          Crop <span className="underline">m</span>arks
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.registrationMarks}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, registrationMarks: e.target.checked }))
                          }
                        />
                        <span>
                          <span className="underline">R</span>egistration marks
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.fileInformation}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, fileInformation: e.target.checked }))
                          }
                        />
                        <span>
                          File <span className="underline">i</span>nformation
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.densitometerScales}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, densitometerScales: e.target.checked }))
                          }
                        />
                        <span>
                          <span className="underline">D</span>ensitometer scales
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintainOpiLinks}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, maintainOpiLinks: e.target.checked }))
                      }
                    />
                    <span>
                      Maintain OPI <span className="underline">l</span>inks
                    </span>
                  </label>
                </div>
              )}

              {/* TAB 6: SECURITY (image_4c1ce39f.png) */}
              {activeTab === 'security' && (
                <div className="space-y-2.5 text-[12px]">
                  <div className="flex items-center gap-4 pb-1">
                    <span className="font-semibold">Encryption method:</span>
                    <span>128-bit AES</span>
                  </div>

                  {/* Open password */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.openPasswordEnabled}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, openPasswordEnabled: e.target.checked }))
                        }
                      />
                      <span>
                        <span className="underline">O</span>pen password
                      </span>
                    </label>
                    <div className={`pl-6 space-y-1.5 ${!settings.openPasswordEnabled ? 'opacity-50' : ''}`}>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Password:</label>
                        <input
                          type="password"
                          disabled={!settings.openPasswordEnabled}
                          value={settings.openPassword}
                          onChange={(e) => setSettings((s) => ({ ...s, openPassword: e.target.value }))}
                          className={`col-span-5 px-2 py-0.5 border text-[12px] ${winInput}`}
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Confirm password:</label>
                        <input
                          type="password"
                          disabled={!settings.openPasswordEnabled}
                          value={settings.openPasswordConfirm}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, openPasswordConfirm: e.target.value }))
                          }
                          className={`col-span-5 px-2 py-0.5 border text-[12px] ${winInput}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permission password */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.permissionPasswordEnabled}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, permissionPasswordEnabled: e.target.checked }))
                        }
                      />
                      <span>
                        <span className="underline">P</span>ermission password
                      </span>
                    </label>
                    <div
                      className={`pl-6 space-y-1.5 ${
                        !settings.permissionPasswordEnabled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Password:</label>
                        <input
                          type="password"
                          disabled={!settings.permissionPasswordEnabled}
                          value={settings.permissionPassword}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, permissionPassword: e.target.value }))
                          }
                          className={`col-span-5 px-2 py-0.5 border text-[12px] ${winInput}`}
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Confirm password:</label>
                        <input
                          type="password"
                          disabled={!settings.permissionPasswordEnabled}
                          value={settings.permissionPasswordConfirm}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              permissionPasswordConfirm: e.target.value,
                            }))
                          }
                          className={`col-span-5 px-2 py-0.5 border text-[12px] ${winInput}`}
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Printing Permissions:</label>
                        <select
                          disabled={!settings.permissionPasswordEnabled}
                          value={settings.printingPermissions}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              printingPermissions: e.target.value as AdvancedExportSettings['printingPermissions'],
                            }))
                          }
                          className={`col-span-5 px-1.5 py-0.5 border text-[11.5px] ${winInput}`}
                        >
                          <option value="None">None</option>
                          <option value="Low Resolution">Low Resolution</option>
                          <option value="High Resolution">High Resolution</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4">Editing Permissions:</label>
                        <select
                          disabled={!settings.permissionPasswordEnabled}
                          value={settings.editingPermissions}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              editingPermissions: e.target.value as AdvancedExportSettings['editingPermissions'],
                            }))
                          }
                          className={`col-span-5 px-1.5 py-0.5 border text-[11.5px] ${winInput}`}
                        >
                          <option value="None">None</option>
                          <option value="Any except extracting pages">Any except extracting pages</option>
                          <option value="Commenting & filling forms">Commenting &amp; filling forms</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                        <input
                          type="checkbox"
                          disabled={!settings.permissionPasswordEnabled}
                          checked={settings.enableCopyingContent}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, enableCopyingContent: e.target.checked }))
                          }
                        />
                        <span>
                          Enab<span className="underline">l</span>e copying of content
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-2 mt-2 flex items-center gap-2.5 text-[11.5px] border-zinc-300 dark:border-zinc-700">
                    <span className="w-4 h-4 rounded-full bg-[#0078d7] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      i
                    </span>
                    <span>The permission settings are preserved in Adobe Acrobat</span>
                  </div>
                </div>
              )}

              {/* TAB 7: PREFLIGHT ISSUES */}
              {activeTab === 'issues' && (
                <div className="space-y-2.5 text-[12px]">
                  <div className="font-semibold">Preflight Summary ({selectedFormat.short})</div>
                  {preflightIssues.length === 0 ? (
                    <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>No issues detected. Document is ready to export.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {preflightIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded border border-amber-500/40 bg-amber-500/10 flex items-start gap-2 text-amber-800 dark:text-amber-300"
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {showHelpBanner && (
            <div className="mx-3 mt-2 px-3 py-1.5 text-[11px] rounded border border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200">
              Configure General range, Color management, Document metadata, Object compression/fonts, Prepress printer marks, or 128-bit Security passwords, then click OK to save to <strong>{displayFullPath}</strong>.
            </div>
          )}

          {/* Footer: [?] [Back] ..... [OK] [Cancel] */}
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHelpBanner((v) => !v)}
                className={`w-6 h-6 border text-[12px] flex items-center justify-center ${winBtn}`}
                title="Export Settings Help"
              >
                ?
              </button>
              <button
                type="button"
                onClick={() => setStep('location')}
                className={`px-2.5 py-1 border text-[11.5px] flex items-center gap-1 ${winBtn}`}
                title="Back to Save Location & Format"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={performActualExport}
                className={`w-20 py-1 border text-[12px] font-medium transition ${winBtn} disabled:opacity-50`}
              >
                {isExporting ? 'Saving...' : 'OK'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`w-20 py-1 border text-[12px] transition ${winBtn}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
