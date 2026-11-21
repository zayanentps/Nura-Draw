import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ToolType,
  PageConfig,
  PropertyState,
  CollaboratorUser,
  ThemeMode,
  SnapConfig,
  CurveActionType,
  CurveEditState,
  ViewQualityMode,
  DocumentPaletteSwatch,
  DimensionConfig,
  CropToolsConfig,
  CropActionType,
  ZoomPresetMode,
  SymmetryConfig,
  ParametricState,
  GeometricConstraintType,
  DimConstraintKind,
} from './types';
import { socketService } from './services/socketService';
import { CorelTopPanel } from './components/CorelTopPanel';
import { Toolbox } from './components/Toolbox';
import { CorelCanvas } from './components/CorelCanvas';
import { ColorPalette } from './components/ColorPalette';
import { DocumentPaletteBar } from './components/DocumentPaletteBar';
import { PaletteEditorModal } from './components/PaletteEditorModal';
import { StatusBar } from './components/StatusBar';
import { DockersSidebar, DockerId } from './components/dockers/DockersSidebar';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { PageSetupModal } from './components/PageSetupModal';
import { importFromJSON, exportAsSVG, exportAsPNG, exportAsPDF, exportAsNDR, exportAsDWG } from './utils/exportUtils';
import { pxToUnit, UNITS_DATA } from './utils/units';
import { separateObjectToCmykPlates } from './utils/cmykSeparation';
import { ensureObjectId, getObjectLabel, alignObjects, AlignMode, AlignTarget } from './utils/canvasHelpers';
import { convertObjectToCurves } from './utils/curveEngine';
import {
  getSymmetryTransforms,
  cloneAndTransformSymmetryObject,
  transformSymmetryConfigByGroup,
} from './utils/symmetryEngine';
import { formatCmykComponents, normalizeHex, resolveColorName } from './utils/colorConversion';
import { IconFitTextToPath, IconPowerClip, IconSymmetryCreate } from './components/CorelTopPanelIcons';
import { TextToolsModals, TextDialogKind } from './components/TextToolsModals';
import { FitTextToPathModal } from './components/FitTextToPathModal';
import { EffectToolsModal, EffectDialogState } from './components/EffectToolsModal';
import { QrCodeModal } from './components/QrCodeModal';
import { RandomFillerModal } from './components/RandomFillerModal';
import { FountainFillModal } from './components/FountainFillModal';
import { MetallicTextModal } from './components/MetallicTextModal';
import {
  DEFAULT_METALLIC_CONFIG,
  METALLIC_PRESETS,
  applyMetallicEffectToSelection,
  readMetallicConfigFromObject,
  removeMetallicEffectFromSelection,
} from './utils/metallicEffect';
import { ParametersManagerModal } from './components/ParametersManagerModal';
import {
  EMPTY_PARAMETRIC_STATE,
  solveParametricSystem,
  createDimConstraint,
  createGeomConstraint,
  autoConstrainObjects,
  pruneOrphanedConstraints,
} from './utils/parametricEngine';
import {
  ProjectTimerWindow,
  ProjectTimerState,
  formatDurationHMS,
} from './components/ProjectTimerWindow';
import {
  buildTextOnPathGroup,
  isPathTargetObject,
  isTextObject,
  isTextOnPathObject,
  reflowTextOnPathGroup,
  straightenTextOnPathToIText,
} from './utils/fitTextToPath';

export default function App() {
  // Document metadata & pages (Exact match with TraceDraw image_2b0a935b.png)
  const [documentName, setDocumentName] = useState<string>('Untitled-1');
  const [docTabs, setDocTabs] = useState<string[]>(['Untitled-1']);
  const [activeDocTab, setActiveDocTab] = useState<string>('Untitled-1');
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(false);

  const [pages, setPages] = useState<PageConfig[]>([
    {
      name: 'Page 1',
      width: 794,
      height: 1123,
      preset: 'A4',
      orientation: 'portrait',
      units: 'mm',
      backgroundColor: '#ffffff',
      bleed: 0,
      showBleed: false,
      showPageBorder: true,
      dpi: 96,
      nudgeDistance: (96 / 25.4) * 0.1, // 0.1 mm default
      autofitMargin: 0, // 0.0 mm default
    },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const pageConfig = pages[activePageIndex] || pages[0];

  // Canvas and active tool
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pick');
  const [dimensionConfig, setDimensionConfig] = useState<DimensionConfig>({
    precision: 2,
    unit: 'auto',
    showUnit: true,
    style: 'arrows',
    textPosition: 'above',
  });
  const handleUpdateDimensionConfig = useCallback((cfg: Partial<DimensionConfig>) => {
    setDimensionConfig((prev) => ({ ...prev, ...cfg }));
  }, []);

  // Colors & Per-Document Palette
  const [currentFill, setCurrentFill] = useState<string>('#00a651');
  const [currentStroke, setCurrentStroke] = useState<string>('#000000');
  const [docPalettes, setDocPalettes] = useState<Record<string, DocumentPaletteSwatch[]>>({});
  const [showPaletteEditor, setShowPaletteEditor] = useState<boolean>(false);
  const [paletteEditorSelectedIndex, setPaletteEditorSelectedIndex] = useState<number>(0);

  const currentDocumentPalette = docPalettes[activeDocTab] || [];

  const recordDocumentColor = useCallback(
    (rawColor: string) => {
      const hex = normalizeHex(rawColor);
      if (!hex) return;
      setDocPalettes((prev) => {
        const list = prev[activeDocTab] || [];
        if (list.some((sw) => sw.hex.toLowerCase() === hex)) {
          return prev;
        }
        const nextSwatch: DocumentPaletteSwatch = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: resolveColorName(hex),
          hex,
          treatAs: 'Process',
          cmyk: formatCmykComponents(hex),
        };
        return {
          ...prev,
          [activeDocTab]: [...list, nextSwatch],
        };
      });
    },
    [activeDocTab]
  );

  const handleOpenPaletteEditor = useCallback((selectedIndex = 0) => {
    setPaletteEditorSelectedIndex(selectedIndex);
    setShowPaletteEditor(true);
  }, []);

  const handleSaveDocumentPalette = useCallback(
    (updatedSwatches: DocumentPaletteSwatch[]) => {
      setDocPalettes((prev) => ({
        ...prev,
        [activeDocTab]: updatedSwatches,
      }));
    },
    [activeDocTab]
  );

  // Selected object and properties
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const [properties, setProperties] = useState<PropertyState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    fill: '#00a651',
    stroke: '#000000',
    strokeWidth: 1,
    strokeDashArray: [],
    opacity: 1,
    rx: 0,
    ry: 0,
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    textAlign: 'left',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 10,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
  });

  // View state
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewQualityMode, setViewQualityMode] = useState<ViewQualityMode>('enhanced');
  const [fullScreenPreviewUrl, setFullScreenPreviewUrl] = useState<string | null>(null);
  const [fullScreenPreviewLabel, setFullScreenPreviewLabel] = useState<string>('');
  const [multipageView, setMultipageView] = useState<boolean>(false);
  const [hasCanvasObjects, setHasCanvasObjects] = useState<boolean>(false);
  const [proofColors, setProofColors] = useState<boolean>(false);
  const [simulateOverprints, setSimulateOverprints] = useState<boolean>(false);
  const [rasterizeComplexEffects, setRasterizeComplexEffects] = useState<boolean>(false);
  const [showPrintableArea, setShowPrintableArea] = useState<boolean>(false);
  const [showBaselineGrid, setShowBaselineGrid] = useState<boolean>(false);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState<boolean>(true);
  const [showDynamicGuides, setShowDynamicGuides] = useState<boolean>(true);
  const [showDocNavigator, setShowDocNavigator] = useState<boolean>(true);
  const [showScrollbars, setShowScrollbars] = useState<boolean>(true);

  // CorelDRAW Snapping state (Page, Objects, Document Grid, AutoCAD Ortho)
  const [snapConfig, setSnapConfig] = useState<SnapConfig>({
    enabled: true,
    snapToGrid: false,
    snapToBaselineGrid: false,
    snapToGuidelines: true,
    snapToObjects: true,
    snapToPage: true,
    orthoMode: false,
    gridSize: 20,
    snapThreshold: 14,
  });

  const handleUpdateSnapConfig = (partial: Partial<SnapConfig>) => {
    setSnapConfig((prev) => ({ ...prev, ...partial }));
  };

  // Theme & Appearance state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('corel_theme') as ThemeMode) || 'light';
  });
  const [workspaceBg, setWorkspaceBg] = useState<string>(() => {
    const saved = localStorage.getItem('corel_workspace_bg');
    const savedTheme = (localStorage.getItem('corel_theme') as ThemeMode) || 'light';
    if (savedTheme === 'dark' && (!saved || saved === '#1f2226')) {
      return '#3f4248';
    }
    return saved || (savedTheme === 'dark' ? '#3f4248' : '#e9eaed');
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPageSetupModal, setShowPageSetupModal] = useState<boolean>(false);
  const [pageSetupTab, setPageSetupTab] = useState<'size' | 'orientation' | 'units' | 'bleed' | 'background'>('size');
  const openPageSetup = useCallback((tab: 'size' | 'orientation' | 'units' | 'bleed' | 'background' = 'size') => {
    setPageSetupTab(tab);
    setShowPageSetupModal(true);
  }, []);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('corel_theme', newTheme);
    if (newTheme === 'dark' && (workspaceBg === '#e9eaed' || workspaceBg === '#1f2226')) {
      setWorkspaceBg('#3f4248');
      localStorage.setItem('corel_workspace_bg', '#3f4248');
    } else if (newTheme === 'light' && (workspaceBg === '#3f4248' || workspaceBg === '#1f2226')) {
      setWorkspaceBg('#e9eaed');
      localStorage.setItem('corel_workspace_bg', '#e9eaed');
    }
  };

  const handleWorkspaceBgChange = (color: string) => {
    setWorkspaceBg(color);
    localStorage.setItem('corel_workspace_bg', color);
  };

  // Dockers state - defaults to 'objects' open as shown in TraceDraw image_2b0a935b.png
  const [activeDocker, setActiveDocker] = useState<DockerId | null>('objects');
  const activeDockers = activeDocker ? [activeDocker] : [];

  // Export Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportDefaultFormat, setExportDefaultFormat] = useState<'ndr' | 'dwg' | 'svg' | 'pdf' | 'png' | 'json'>('ndr');
  const [exportDialogMode, setExportDialogMode] = useState<'save' | 'export'>('save');
  const [showRandomFillerModal, setShowRandomFillerModal] = useState<boolean>(false);
  const [parametricState, setParametricState] = useState<ParametricState>(EMPTY_PARAMETRIC_STATE);
  const parametricStateRef = useRef<ParametricState>(parametricState);
  parametricStateRef.current = parametricState;
  const isSolvingParametricRef = useRef<boolean>(false);
  const [showParametersManager, setShowParametersManager] = useState<boolean>(false);

  // Text Menu State & Dialogs
  const [activeTextDialog, setActiveTextDialog] = useState<TextDialogKind>(null);
  const [showMetallicModal, setShowMetallicModal] = useState<boolean>(false);
  const [metallicInitialPreset, setMetallicInitialPreset] = useState<
    import('./types').MetallicPresetId | null
  >(null);
  const [showNonPrintingChars, setShowNonPrintingChars] = useState<boolean>(false);
  const [useHyphenation, setUseHyphenation] = useState<boolean>(false);
  const [showTextFrames, setShowTextFrames] = useState<boolean>(false);

  // Effects Menu Dialog State
  const [activeEffectDialog, setActiveEffectDialog] = useState<EffectDialogState>(null);

  // File Menu Modals & Persistence State (Templates, Cloud, Print Preview, Recent Files, Save/Revert)
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);
  const [printPreviewDataUrl, setPrintPreviewDataUrl] = useState<string>('');
  const [fileToast, setFileToast] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<{ name: string; savedAt: string; data?: string }[]>(() => {
    try {
      const raw = localStorage.getItem('corel_recent_files');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cloudDocs, setCloudDocs] = useState<{ id: string; name: string; savedAt: string; pageConfig: PageConfig; canvasData: any }[]>(() => {
    try {
      const raw = localStorage.getItem('corel_cloud_docs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [customTemplates, setCustomTemplates] = useState<{ id: string; name: string; pageConfig: PageConfig; canvasData: any }[]>(() => {
    try {
      const raw = localStorage.getItem('corel_custom_templates');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    const fileName = documentName || activeDocTab || 'Untitled-1';
    document.title = `Nuradraw - ${fileName}${isDirty ? '*' : ''}`;
  }, [documentName, activeDocTab, isDirty]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvMergeInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setFileToast(msg);
    setTimeout(() => {
      setFileToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Real-time collaboration state
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'studio-corel-1';
  });
  const [currentUser, setCurrentUser] = useState<CollaboratorUser>(() =>
    socketService.getCurrentUser()
  );
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([
    socketService.getCurrentUser(),
  ]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // History stack for Undo / Redo + Edit Menu state
  const historyRef = useRef<string[]>([]);
  const undoLabelsRef = useRef<string[]>(['']);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [undoLabel, setUndoLabel] = useState<string>('');
  const [canRepeat, setCanRepeat] = useState<boolean>(false);
  const lastRepeatableRef = useRef<{ type: 'duplicate' | 'clone' | 'align' | 'step_repeat'; payload?: any } | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const preFocusViewRef = useRef<{ zoom: number; vpt: number[] } | null>(null);
  const clipboardRef = useRef<fabric.FabricObject | null>(null);
  const [canPaste, setCanPaste] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Menu Modals state
  const [showCopyPropsModal, setShowCopyPropsModal] = useState<boolean>(false);
  const [copyPropsSourceId, setCopyPropsSourceId] = useState<string>('');
  const [copyPropsFill, setCopyPropsFill] = useState<boolean>(true);
  const [copyPropsStrokeColor, setCopyPropsStrokeColor] = useState<boolean>(true);
  const [copyPropsStrokeWidth, setCopyPropsStrokeWidth] = useState<boolean>(true);

  const [showPasteSpecialModal, setShowPasteSpecialModal] = useState<boolean>(false);
  const [pasteSpecialFormat, setPasteSpecialFormat] = useState<'vector' | 'outline' | 'text'>('vector');

  const [showFindReplaceModal, setShowFindReplaceModal] = useState<boolean>(false);
  const [findReplaceTab, setFindReplaceTab] = useState<'text' | 'color'>('text');
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [findCaseSensitive, setFindCaseSensitive] = useState<boolean>(false);
  const [findColorHex, setFindColorHex] = useState<string>('#00a651');
  const [replaceColorHex, setReplaceColorHex] = useState<string>('#0078d7');
  const [findColorScope, setFindColorScope] = useState<'fill' | 'stroke' | 'both'>('fill');

  const [showStepRepeatModal, setShowStepRepeatModal] = useState<boolean>(false);
  const [stepCols, setStepCols] = useState<number>(3);
  const [stepRows, setStepRows] = useState<number>(1);
  const [stepOffsetX, setStepOffsetX] = useState<number>(40);
  const [stepOffsetY, setStepOffsetY] = useState<number>(0);

  // Layout Menu State & Modals
  const pageCanvasesRef = useRef<Record<number, string>>({});
  const [showInsertPageModal, setShowInsertPageModal] = useState<boolean>(false);
  const [insertPageCount, setInsertPageCount] = useState<number>(1);
  const [insertPagePlacement, setInsertPagePlacement] = useState<'before' | 'after'>('after');
  const [insertPageTarget, setInsertPageTarget] = useState<number>(1);

  const [showDuplicatePageModal, setShowDuplicatePageModal] = useState<boolean>(false);
  const [dupPagePlacement, setDupPagePlacement] = useState<'before' | 'after'>('after');
  const [dupCopyContents, setDupCopyContents] = useState<boolean>(true);

  const [showRenamePageModal, setShowRenamePageModal] = useState<boolean>(false);
  const [renamePageValue, setRenamePageValue] = useState<string>('Page 1');

  const [showDeletePageModal, setShowDeletePageModal] = useState<boolean>(false);
  const [deletePageTarget, setDeletePageTarget] = useState<number>(1);

  const [showGoToPageModal, setShowGoToPageModal] = useState<boolean>(false);
  const [goToPageValue, setGoToPageValue] = useState<number>(1);

  const [showPageNumSettingsModal, setShowPageNumSettingsModal] = useState<boolean>(false);
  const [pageNumStartAt, setPageNumStartAt] = useState<number>(1);
  const [pageNumStyle, setPageNumStyle] = useState<'arabic' | 'roman_lower' | 'roman_upper' | 'alpha_lower' | 'alpha_upper'>('arabic');
  const [pageNumPrefix, setPageNumPrefix] = useState<string>('');
  const [pageNumPosition, setPageNumPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'>('bottom-center');
  const [pageNumFontSize, setPageNumFontSize] = useState<number>(14);

  const [showBorderGrommetModal, setShowBorderGrommetModal] = useState<boolean>(false);
  const [bgMarginPx, setBgMarginPx] = useState<number>(18);
  const [bgStrokeColor, setBgStrokeColor] = useState<string>('#111827');
  const [bgStrokeWidth, setBgStrokeWidth] = useState<number>(2);
  const [bgHorizGrommets, setBgHorizGrommets] = useState<number>(4);
  const [bgVertGrommets, setBgVertGrommets] = useState<number>(3);
  const [bgGrommetDiameter, setBgGrommetDiameter] = useState<number>(14);
  const [bgGrommetColor, setBgGrommetColor] = useState<string>('#94a3b8');

  // Bitmap Menu State & Modals
  const [showConvertBitmapModal, setShowConvertBitmapModal] = useState<boolean>(false);
  const [bitmapDpi, setBitmapDpi] = useState<number>(300);
  const [bitmapColorMode, setBitmapColorMode] = useState<'rgb' | 'cmyk' | 'grayscale' | 'bw'>('rgb');
  const [bitmapTransparentBg, setBitmapTransparentBg] = useState<boolean>(true);
  const [bitmapAntiAlias, setBitmapAntiAlias] = useState<boolean>(true);

  const [showStraightenModal, setShowStraightenModal] = useState<boolean>(false);
  const [straightenAngle, setStraightenAngle] = useState<number>(0);
  const [straightenAutoCrop, setStraightenAutoCrop] = useState<boolean>(true);
  const [straightenShowGrid, setStraightenShowGrid] = useState<boolean>(true);
  const [straightenPreviewUrl, setStraightenPreviewUrl] = useState<string>('');

  const [showAdjLabModal, setShowAdjLabModal] = useState<boolean>(false);
  const [adjPreviewUrl, setAdjPreviewUrl] = useState<string>('');
  const [adjShowOriginal, setAdjShowOriginal] = useState<boolean>(false);
  const [adjTemperature, setAdjTemperature] = useState<number>(0);
  const [adjTint, setAdjTint] = useState<number>(0);
  const [adjSaturation, setAdjSaturation] = useState<number>(0);
  const [adjBrightness, setAdjBrightness] = useState<number>(0);
  const [adjContrast, setAdjContrast] = useState<number>(0);
  const [adjVibrance, setAdjVibrance] = useState<number>(0);
  const [adjGamma, setAdjGamma] = useState<number>(1.0);

  // PowerClip state
  const [powerClipPicking, setPowerClipPicking] = useState<boolean>(false);
  const powerClipSourceRef = useRef<fabric.FabricObject | null>(null);
  const [powerClipEditingObj, setPowerClipEditingObj] = useState<fabric.FabricObject | null>(null);

  // Fit Text to Path state
  const [fitTextPicking, setFitTextPicking] = useState<boolean>(false);
  const fitTextSourceRef = useRef<fabric.FabricObject | null>(null);
  const [showFitTextModal, setShowFitTextModal] = useState<boolean>(false);
  const [fitTextPathTarget, setFitTextPathTarget] = useState<fabric.FabricObject | null>(null);
  const [fitTextGroupTarget, setFitTextGroupTarget] = useState<fabric.Group | null>(null);
  const [showQrCodeModal, setShowQrCodeModal] = useState<boolean>(false);
  const [showFountainFillModal, setShowFountainFillModal] = useState<boolean>(false);

  // Live Symmetry Editing state
  const [symmetryEditingConfig, setSymmetryEditingConfig] = useState<SymmetryConfig | null>(null);
  const symmetryEditingConfigRef = useRef<SymmetryConfig | null>(null);
  symmetryEditingConfigRef.current = symmetryEditingConfig;
  const isSyncingSymmetryRef = useRef<boolean>(false);
  const symmetrySyncSeqRef = useRef<number>(0);

  // Nested Group Editing (Isolation Mode) stack
  interface GroupEditLevel {
    id: string;
    groupName: string;
    insertIndex: number;
    groupMeta: Record<string, any>;
    outerObjectStates: Array<{
      obj: fabric.FabricObject;
      opacity: number;
      selectable: boolean;
      evented: boolean;
    }>;
  }
  const groupEditStackRef = useRef<GroupEditLevel[]>([]);
  const [groupEditStack, setGroupEditStack] = useState<GroupEditLevel[]>([]);

  // Project Timer State (persisted per project/document tab)
  const EMPTY_TIMER: ProjectTimerState = {
    totalSeconds: 0,
    sessionSeconds: 0,
    status: 'stopped',
    sessions: [],
  };
  const [showProjectTimer, setShowProjectTimer] = useState<boolean>(false);
  const [autoTrackTimer, setAutoTrackTimer] = useState<boolean>(true);
  const [projectTimers, setProjectTimers] = useState<Record<string, ProjectTimerState>>(() => {
    try {
      const raw = localStorage.getItem('tracedraw_project_timers_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ProjectTimerState>;
        // Restore saved durations but start paused/stopped unless running was persisted
        const normalized: Record<string, ProjectTimerState> = {};
        for (const [k, v] of Object.entries(parsed)) {
          normalized[k] = {
            totalSeconds: Number(v.totalSeconds) || 0,
            sessionSeconds: Number(v.sessionSeconds) || 0,
            status: v.status === 'running' ? 'paused' : v.status || 'stopped',
            sessions: Array.isArray(v.sessions) ? v.sessions : [],
          };
        }
        return normalized;
      }
    } catch {
      // ignore storage read errors
    }
    return {};
  });

  const currentTimerState: ProjectTimerState = projectTimers[activeDocTab] || EMPTY_TIMER;
  const autoTrackTimerRef = useRef(autoTrackTimer);
  autoTrackTimerRef.current = autoTrackTimer;
  const activeDocTabRef = useRef(activeDocTab);
  activeDocTabRef.current = activeDocTab;

  useEffect(() => {
    try {
      localStorage.setItem('tracedraw_project_timers_v1', JSON.stringify(projectTimers));
    } catch {
      // ignore quota errors
    }
  }, [projectTimers]);

  useEffect(() => {
    const hasAnyRunning = Object.values(projectTimers).some((t) => t.status === 'running');
    if (!hasAnyRunning) return;
    const interval = window.setInterval(() => {
      setProjectTimers((prev) => {
        let changed = false;
        const next: Record<string, ProjectTimerState> = { ...prev };
        for (const [key, t] of Object.entries(prev)) {
          if (t.status === 'running') {
            changed = true;
            next[key] = {
              ...t,
              totalSeconds: t.totalSeconds + 1,
              sessionSeconds: t.sessionSeconds + 1,
            };
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [projectTimers]);

  const handleTimerPlay = useCallback(() => {
    const key = activeDocTabRef.current;
    setProjectTimers((prev) => {
      const cur = prev[key] || { totalSeconds: 0, sessionSeconds: 0, status: 'stopped', sessions: [] };
      return { ...prev, [key]: { ...cur, status: 'running' } };
    });
  }, []);

  const handleTimerPause = useCallback(() => {
    const key = activeDocTabRef.current;
    setProjectTimers((prev) => {
      const cur = prev[key];
      if (!cur || cur.status !== 'running') return prev;
      return { ...prev, [key]: { ...cur, status: 'paused' } };
    });
  }, []);

  const handleTimerStop = useCallback(() => {
    const key = activeDocTabRef.current;
    setProjectTimers((prev) => {
      const cur = prev[key] || { totalSeconds: 0, sessionSeconds: 0, status: 'stopped', sessions: [] };
      const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nextSessions =
        cur.sessionSeconds > 0
          ? [
              { id: `sess-${Date.now()}`, endedAt: nowLabel, durationSec: cur.sessionSeconds },
              ...cur.sessions,
            ].slice(0, 30)
          : cur.sessions;
      return {
        ...prev,
        [key]: {
          ...cur,
          sessionSeconds: 0,
          status: 'stopped',
          sessions: nextSessions,
        },
      };
    });
  }, []);

  const handleTimerReset = useCallback(() => {
    const key = activeDocTabRef.current;
    setProjectTimers((prev) => ({
      ...prev,
      [key]: { totalSeconds: 0, sessionSeconds: 0, status: 'stopped', sessions: [] },
    }));
  }, []);

  // Curve Editing State (Shape Tool F10)
  const [curveEditState, setCurveEditState] = useState<CurveEditState>({
    isCurveObject: false,
    selectedNodeCount: 0,
    hasActiveSegment: false,
    activeSegmentType: null,
    activeNodeType: null,
    isClosed: false,
    nodeCount: 0,
    addNodeMode: false,
  });
  const curveActionHandlerRef = useRef<((action: CurveActionType) => void) | null>(null);
  const handleRegisterCurveActionHandler = useCallback((handler: (action: CurveActionType) => void) => {
    curveActionHandlerRef.current = handler;
  }, []);
  const handleCurveAction = useCallback((action: CurveActionType) => {
    curveActionHandlerRef.current?.(action);
  }, []);

  // Crop Tools Configuration & Action Handler (Crop / Knife / Virtual Segment Delete / Eraser)
  const [cropToolsConfig, setCropToolsConfig] = useState<CropToolsConfig>({
    eraserSize: 18,
    eraserNib: 'round',
    knifeAutoGap: false,
    cropRegion: null,
  });
  const handleUpdateCropToolsConfig = useCallback((patch: Partial<CropToolsConfig>) => {
    setCropToolsConfig((prev) => ({ ...prev, ...patch }));
  }, []);
  const cropActionHandlerRef = useRef<((action: CropActionType) => void) | null>(null);
  const handleRegisterCropActionHandler = useCallback((handler: (action: CropActionType) => void) => {
    cropActionHandlerRef.current = handler;
  }, []);
  const handleCropAction = useCallback((action: CropActionType) => {
    cropActionHandlerRef.current?.(action);
  }, []);

  const zoomModeHandlerRef = useRef<((mode: ZoomPresetMode) => void) | null>(null);
  const handleRegisterZoomModeHandler = useCallback((handler: (mode: ZoomPresetMode) => void) => {
    zoomModeHandlerRef.current = handler;
  }, []);
  const handleZoomMode = useCallback(
    (mode: ZoomPresetMode) => {
      if (zoomModeHandlerRef.current) {
        zoomModeHandlerRef.current(mode);
      } else if (mode === 'to_fit') {
        handleZoomToFitObjects();
      } else {
        setZoomLevel(0.85);
      }
    },
    []
  );

  // Initialize socket and listeners
  useEffect(() => {
    socketService.connect(roomId);

    const unsubConn = socketService.on('connection:change', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubInit = socketService.on('room:init', (payload) => {
      if (payload.users) {
        setCollaborators(payload.users);
      }
    });

    const unsubJoined = socketService.on('user:joined', (payload) => {
      setCollaborators((prev) => {
        if (prev.some((u) => u.id === payload.user.id)) return prev;
        return [...prev, payload.user];
      });
    });

    const unsubLeft = socketService.on('user:left', (payload) => {
      setCollaborators((prev) => prev.filter((u) => u.id !== payload.userId));
    });

    const unsubCursor = socketService.on('cursor:updated', (payload) => {
      setCollaborators((prev) =>
        prev.map((u) => (u.id === payload.userId ? { ...u, cursor: payload.cursor } : u))
      );
    });

    return () => {
      unsubConn();
      unsubInit();
      unsubJoined();
      unsubLeft();
      unsubCursor();
      socketService.disconnect();
    };
  }, [roomId]);

  // Serialization custom attributes to preserve during Undo/Redo and real-time syncing
  const SERIALIZE_PROPERTIES = [
    'id',
    'name',
    'isPowerClip',
    'customType',
    'powerClipData',
    'isLocked',
    'isCurve',
    'nodeTypes',
    'isSymbol',
    'isClone',
    'cloneSourceId',
    'webLink',
    'wrapText',
    'wrapConnector',
    'overprintOutline',
    'objectHinting',
    'isPageNumber',
    'isBorderAndGrommet',
    'isTextOnPath',
    'textOnPathData',
    'qrConfig',
    'isDimension',
    'dimensionKind',
    'perPixelTargetFind',
    'globalCompositeOperation',
    'isSymmetryGroup',
    'symmetryConfig',
    'symmetryLocalAxis',
    'isSymmetryPrimary',
    'isSymmetryMirror',
    'symmetryCopyIndex',
    'metallicEffectConfig',
    'preMetallicBackup',
  ];

  // Push history state helper
  const pushHistory = useCallback((actionLabel = 'Modify') => {
    if (!canvas) return;
    try {
      const json = JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any));
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      const newLabels = undoLabelsRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(json);
      newLabels.push(actionLabel);
      if (newHistory.length > 50) {
        newHistory.shift();
        newLabels.shift();
      }
      historyRef.current = newHistory;
      undoLabelsRef.current = newLabels;
      historyIndexRef.current = newHistory.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
      setUndoLabel(historyIndexRef.current > 0 ? newLabels[historyIndexRef.current] || '' : '');
      setIsDirty(lastSavedSnapshotRef.current ? json !== lastSavedSnapshotRef.current : historyIndexRef.current > 0);
      if (autoTrackTimerRef.current) {
        const key = activeDocTabRef.current;
        setProjectTimers((prev) => {
          const cur = prev[key];
          if (cur && cur.status !== 'stopped') return prev;
          return {
            ...prev,
            [key]: {
              totalSeconds: cur?.totalSeconds || 0,
              sessionSeconds: cur?.sessionSeconds || 0,
              status: 'running',
              sessions: cur?.sessions || [],
            },
          };
        });
      }
    } catch (e) {
      console.warn('Failed to snapshot history', e);
    }
  }, [canvas]);

  const handleRegisterCanvas = useCallback((canvasInstance: fabric.Canvas) => {
    setCanvas(canvasInstance);
    // Push first state
    setTimeout(() => {
      try {
        const json = JSON.stringify(canvasInstance.toObject(SERIALIZE_PROPERTIES as any));
        historyRef.current = [json];
        undoLabelsRef.current = [''];
        historyIndexRef.current = 0;
        lastSavedSnapshotRef.current = json;
        setCanUndo(false);
        setCanRedo(false);
        setUndoLabel('');
        setIsDirty(false);
      } catch (e) {}
    }, 200);
  }, []);

  // Copy object to clipboard (Ctrl+C)
  const handleCopy = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj as any).isEditing) return;

    try {
      const cloned = await activeObj.clone();
      clipboardRef.current = cloned;
      setCanPaste(true);
    } catch (err) {
      console.error('Failed to copy object', err);
    }
  }, [canvas]);

  // Cut object to clipboard (Ctrl+X)
  const handleCut = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj as any).isEditing) return;

    try {
      const cloned = await activeObj.clone();
      clipboardRef.current = cloned;
      setCanPaste(true);

      if (activeObj.type === 'activeselection') {
        const sel = activeObj as fabric.ActiveSelection;
        sel.forEachObject((obj) => {
          canvas.remove(obj);
        });
        canvas.discardActiveObject();
      } else {
        canvas.remove(activeObj);
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      setSelectedObject(null);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'remove');
      pushHistory('Cut');
    } catch (err) {
      console.error('Failed to cut object', err);
    }
  }, [canvas, pushHistory]);

  // Paste object from clipboard (Ctrl+V)
  const handlePaste = useCallback(async () => {
    if (!canvas || !clipboardRef.current) return;
    try {
      const cloned = await clipboardRef.current.clone();
      canvas.discardActiveObject();

      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        evented: true,
      });

      if (cloned.type === 'activeselection') {
        const sel = cloned as fabric.ActiveSelection;
        sel.canvas = canvas;
        sel.forEachObject((obj) => {
          ensureObjectId(obj);
          if (powerClipEditingObj) {
            (obj as any).isPowerClipContent = true;
          }
          canvas.add(obj);
        });
        sel.setCoords();
      } else {
        ensureObjectId(cloned);
        if (powerClipEditingObj) {
          (cloned as any).isPowerClipContent = true;
        }
        canvas.add(cloned);
      }

      // Cascading offset for subsequent pastes
      clipboardRef.current.top = (clipboardRef.current.top || 0) + 20;
      clipboardRef.current.left = (clipboardRef.current.left || 0) + 20;

      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      setSelectedObject(cloned);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
      pushHistory('Paste');
    } catch (err) {
      console.error('Failed to paste object', err);
    }
  }, [canvas, pushHistory, powerClipEditingObj]);

  // Duplicate object in place (Ctrl+D)
  const handleDuplicate = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj as any).isEditing) return;

    try {
      const cloned = await activeObj.clone();
      canvas.discardActiveObject();

      cloned.set({
        left: (activeObj.left || 0) + 20,
        top: (activeObj.top || 0) + 20,
        evented: true,
      });

      if (cloned.type === 'activeselection') {
        const sel = cloned as fabric.ActiveSelection;
        sel.canvas = canvas;
        sel.forEachObject((obj) => {
          ensureObjectId(obj, getObjectLabel(obj) + ' (Copy)');
          if (powerClipEditingObj) {
            (obj as any).isPowerClipContent = true;
          }
          canvas.add(obj);
        });
        sel.setCoords();
      } else {
        ensureObjectId(cloned, getObjectLabel(activeObj) + ' (Copy)');
        if (powerClipEditingObj) {
          (cloned as any).isPowerClipContent = true;
        }
        canvas.add(cloned);
      }

      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      setSelectedObject(cloned);
      lastRepeatableRef.current = { type: 'duplicate' };
      setCanRepeat(true);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
      pushHistory('Duplicate');
    } catch (err) {
      console.error('Failed to duplicate object', err);
    }
  }, [canvas, pushHistory, powerClipEditingObj]);

  // Delete selected object(s) (Delete / Backspace)
  const handleDelete = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj as any).isEditing) return;

    if (activeObj.type === 'activeselection') {
      const sel = activeObj as fabric.ActiveSelection;
      const objs = [...sel.getObjects()];
      canvas.discardActiveObject();
      objs.forEach((obj) => {
        canvas.remove(obj);
      });
    } else {
      canvas.remove(activeObj);
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    setSelectedObject(null);
    socketService.sendCanvasUpdate(canvas.toJSON(), 'remove');
    pushHistory('Delete');
  }, [canvas, pushHistory]);

  // Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z / Ctrl+Y) CorelDRAW implementation
  const handleUndo = useCallback(async () => {
    if (!canvas || historyIndexRef.current <= 0) return;
    try {
      groupEditStackRef.current = [];
      setGroupEditStack([]);
      historyIndexRef.current -= 1;
      const jsonStr = historyRef.current[historyIndexRef.current];
      if (jsonStr) {
        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        await canvas.loadFromJSON(parsed);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelectedObject(null);
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        setUndoLabel(historyIndexRef.current > 0 ? undoLabelsRef.current[historyIndexRef.current] || '' : '');
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'sync');
      }
    } catch (e) {
      console.error('Failed to undo canvas state', e);
    }
  }, [canvas]);

  const handleRedo = useCallback(async () => {
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    try {
      groupEditStackRef.current = [];
      setGroupEditStack([]);
      historyIndexRef.current += 1;
      const jsonStr = historyRef.current[historyIndexRef.current];
      if (jsonStr) {
        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        await canvas.loadFromJSON(parsed);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelectedObject(null);
        setCanUndo(true);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        setUndoLabel(undoLabelsRef.current[historyIndexRef.current] || '');
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'sync');
      }
    } catch (e) {
      console.error('Failed to redo canvas state', e);
    }
  }, [canvas]);

  const handleBringForward = useCallback(() => {
    if (!selectedObject || !canvas) return;
    canvas.bringObjectForward(selectedObject);
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleSendBackward = useCallback(() => {
    if (!selectedObject || !canvas) return;
    canvas.sendObjectBackwards(selectedObject);
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleBringToFront = useCallback(() => {
    if (!selectedObject || !canvas) return;
    canvas.bringObjectToFront(selectedObject);
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleSendToBack = useCallback(() => {
    if (!selectedObject || !canvas) return;
    canvas.sendObjectToBack(selectedObject);
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleConvertToCurves = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type === 'activeselection') return;

    try {
      const pathObj = convertObjectToCurves(activeObj);
      if (!pathObj) return;

      if (pathObj !== activeObj) {
        const objects = canvas.getObjects();
        const prevIndex = objects.indexOf(activeObj);
        canvas.remove(activeObj);
        canvas.add(pathObj);
        if (prevIndex >= 0 && typeof canvas.moveObjectTo === 'function') {
          canvas.moveObjectTo(pathObj, prevIndex);
        }
      }

      canvas.setActiveObject(pathObj);
      canvas.requestRenderAll();
      setSelectedObject(pathObj);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      pushHistory('Convert to Curves');
    } catch (err) {
      console.error('Failed to convert to curves', err);
    }
  }, [canvas, pushHistory]);

  const handleBringIntoFocus = useCallback(() => {
    if (!canvas || !selectedObject) return;
    if (!isFocusMode) {
      preFocusViewRef.current = {
        zoom: zoomLevel,
        vpt: [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])],
      };
    }
    const bound = selectedObject.getBoundingRect();
    const cw = canvas.getWidth() || 800;
    const ch = canvas.getHeight() || 600;
    const targetZoom = Math.max(
      0.01,
      Math.min(4096, Math.min((cw * 0.65) / Math.max(bound.width, 40), (ch * 0.65) / Math.max(bound.height, 40)))
    );
    const center = selectedObject.getCenterPoint();
    const tx = cw / 2 - center.x * targetZoom;
    const ty = ch / 2 - center.y * targetZoom;
    canvas.setViewportTransform([targetZoom, 0, 0, targetZoom, tx, ty]);
    setZoomLevel(Number(targetZoom.toFixed(4)));
    setIsFocusMode(true);
    canvas.requestRenderAll();
  }, [canvas, selectedObject, isFocusMode, zoomLevel]);

  const handleExitFocusMode = useCallback(() => {
    if (!canvas) return;
    if (preFocusViewRef.current) {
      const { zoom, vpt } = preFocusViewRef.current;
      canvas.setViewportTransform(vpt as any);
      setZoomLevel(zoom);
      preFocusViewRef.current = null;
    } else {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoomLevel(0.85);
    }
    setIsFocusMode(false);
    canvas.requestRenderAll();
  }, [canvas]);

  const handleGroup = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeselection') {
      showToast('Select multiple objects first to Group (Ctrl+G)');
      return;
    }
    const sel = activeObj as fabric.ActiveSelection;
    const allObjs = canvas.getObjects();
    const objects = [...sel.getObjects()].sort(
      (a, b) => allObjs.indexOf(a) - allObjs.indexOf(b)
    );
    const indices = objects.map((o) => allObjs.indexOf(o)).filter((i) => i >= 0);
    const minIndex = indices.length > 0 ? Math.min(...indices) : allObjs.length;

    canvas.discardActiveObject();
    objects.forEach((o) => canvas.remove(o));
    const group = new fabric.Group(objects, { subTargetCheck: true });
    ensureObjectId(group, 'Group');
    canvas.insertAt(Math.min(minIndex, canvas.getObjects().length), group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    setSelectedObject(group);
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory('Group Objects');
    showToast(`Grouped ${objects.length} objects`);
  }, [canvas, pushHistory, showToast]);

  const handleUngroup = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') {
      showToast('Select a Group first to Ungroup (Ctrl+U)');
      return;
    }
    const group = activeObj as fabric.Group;
    const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));
    const children = group.removeAll();
    canvas.discardActiveObject();
    canvas.remove(group);
    children.forEach((o) => {
      o.set({ selectable: true, evented: true });
      o.setCoords();
    });
    if (children.length > 0) {
      canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...children);
    }
    if (children.length === 1) {
      canvas.setActiveObject(children[0]);
      setSelectedObject(children[0]);
    } else if (children.length > 1) {
      const sel = new fabric.ActiveSelection(children, { canvas });
      canvas.setActiveObject(sel);
      setSelectedObject(sel);
    } else {
      setSelectedObject(null);
    }
    canvas.requestRenderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory('Ungroup Objects');
    showToast(`Ungrouped ${children.length} objects`);
  }, [canvas, pushHistory, showToast]);

  const handleUngroupAll = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') {
      showToast('Select a Group first to Ungroup All');
      return;
    }
    const group = activeObj as fabric.Group;
    const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));

    const unpackRecursive = (g: fabric.Group): fabric.FabricObject[] => {
      const items = g.removeAll();
      const result: fabric.FabricObject[] = [];
      for (const item of items) {
        if (
          item.type === 'group' &&
          !(item as any).isTextOnPath &&
          (item as any).customType !== 'qrcode'
        ) {
          result.push(...unpackRecursive(item as fabric.Group));
        } else {
          item.set({ selectable: true, evented: true });
          item.setCoords();
          result.push(item);
        }
      }
      return result;
    };

    const allChildren = unpackRecursive(group);
    canvas.discardActiveObject();
    canvas.remove(group);
    if (allChildren.length > 0) {
      canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...allChildren);
    }
    if (allChildren.length === 1) {
      canvas.setActiveObject(allChildren[0]);
      setSelectedObject(allChildren[0]);
    } else if (allChildren.length > 1) {
      const sel = new fabric.ActiveSelection(allChildren, { canvas });
      canvas.setActiveObject(sel);
      setSelectedObject(sel);
    } else {
      setSelectedObject(null);
    }
    canvas.requestRenderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory('Ungroup All');
    showToast(`Ungrouped all into ${allChildren.length} objects`);
  }, [canvas, pushHistory, showToast]);

  const handleEnterGroupEdit = useCallback(
    (targetArg?: fabric.FabricObject, subTargetArg?: fabric.FabricObject | null) => {
      if (!canvas) return;
      const target = targetArg || selectedObject || canvas.getActiveObject();
      if (!target || target.type !== 'group') {
        showToast('Select a Group to edit its contents');
        return;
      }
      if (
        (target as any).isSymmetryGroup ||
        (target as any).isPowerClip ||
        (target as any).customType === 'powerclip' ||
        (target as any).isTextOnPath ||
        (target as any).customType === 'qrcode'
      ) {
        return;
      }

      const group = target as fabric.Group;
      const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));
      const groupName = (group as any).name || 'Group';
      const groupMeta = {
        id: (group as any).id,
        name: groupName,
        opacity: group.opacity ?? 1,
        shadow: group.shadow,
        visible: group.visible !== false,
      };

      const outerObjectStates = canvas
        .getObjects()
        .filter((o) => o !== group)
        .map((o) => ({
          obj: o,
          opacity: o.opacity ?? 1,
          selectable: o.selectable !== false,
          evented: o.evented !== false,
        }));

      outerObjectStates.forEach(({ obj }) => {
        obj.set({
          opacity: Math.min(obj.opacity ?? 1, 0.28),
          selectable: false,
          evented: false,
        });
      });

      const children = group.removeAll();
      canvas.discardActiveObject();
      canvas.remove(group);

      children.forEach((child) => {
        child.set({ selectable: true, evented: true });
        child.setCoords();
      });
      if (children.length > 0) {
        canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...children);
      }

      const level: GroupEditLevel = {
        id: groupMeta.id || `grp-${Date.now()}`,
        groupName,
        insertIndex,
        groupMeta,
        outerObjectStates,
      };
      groupEditStackRef.current = [...groupEditStackRef.current, level];
      setGroupEditStack([...groupEditStackRef.current]);
      setActiveTool('pick');

      if (subTargetArg && children.includes(subTargetArg)) {
        canvas.setActiveObject(subTargetArg);
        setSelectedObject(subTargetArg);
      } else {
        setSelectedObject(null);
      }
      canvas.requestRenderAll();
      showToast(`Editing "${groupName}" — Double-click empty area or press Esc to finish`);
    },
    [canvas, selectedObject, showToast]
  );

  const handleExitGroupEdit = useCallback(
    (exitAll: boolean = false) => {
      if (!canvas || groupEditStackRef.current.length === 0) return;

      const exitOneLevel = (): fabric.FabricObject | null => {
        const stack = [...groupEditStackRef.current];
        const level = stack.pop();
        if (!level) return null;

        const lockedOuterSet = new Set<fabric.FabricObject>();
        stack.forEach((ancestor) => {
          ancestor.outerObjectStates.forEach((s) => lockedOuterSet.add(s.obj));
        });
        level.outerObjectStates.forEach((s) => lockedOuterSet.add(s.obj));

        const groupChildren = canvas.getObjects().filter((o) => !lockedOuterSet.has(o));
        canvas.discardActiveObject();
        groupChildren.forEach((c) => canvas.remove(c));

        let rebuiltGroup: fabric.Group | null = null;
        if (groupChildren.length > 0) {
          rebuiltGroup = new fabric.Group(groupChildren, {
            subTargetCheck: true,
            opacity: level.groupMeta.opacity ?? 1,
            shadow: level.groupMeta.shadow,
            visible: level.groupMeta.visible !== false,
          });
          (rebuiltGroup as any).id = level.groupMeta.id;
          (rebuiltGroup as any).name = level.groupMeta.name;
          ensureObjectId(rebuiltGroup, level.groupName);
          canvas.insertAt(Math.min(level.insertIndex, canvas.getObjects().length), rebuiltGroup);
        }

        level.outerObjectStates.forEach((s) => {
          s.obj.set({
            opacity: s.opacity,
            selectable: s.selectable,
            evented: s.evented,
          });
          s.obj.setCoords();
        });

        groupEditStackRef.current = stack;
        return rebuiltGroup;
      };

      let lastGroup = exitOneLevel();
      if (exitAll) {
        while (groupEditStackRef.current.length > 0) {
          lastGroup = exitOneLevel();
        }
      }

      setGroupEditStack([...groupEditStackRef.current]);
      if (lastGroup) {
        canvas.setActiveObject(lastGroup);
        setSelectedObject(lastGroup);
      } else {
        setSelectedObject(null);
      }
      canvas.requestRenderAll();

      if (groupEditStackRef.current.length === 0) {
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        pushHistory('Edit Group');
        showToast('Finished editing group');
      } else {
        const parentName = groupEditStackRef.current[groupEditStackRef.current.length - 1].groupName;
        showToast(`Returned to "${parentName}"`);
      }
    },
    [canvas, pushHistory, showToast]
  );

  const handleBreakApart = useCallback(() => {
    if (!canvas || !selectedObject) return;
    if (selectedObject.type === 'group') {
      handleUngroup();
    } else if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
      const text = (selectedObject as fabric.IText).text || '';
      const lines = text.split('\n');
      if (lines.length > 1) {
        canvas.remove(selectedObject);
        const startTop = selectedObject.top || 0;
        const fontSize = (selectedObject as fabric.IText).fontSize || 24;
        lines.forEach((line, idx) => {
          const t = new fabric.IText(line, {
            left: selectedObject.left,
            top: startTop + idx * fontSize * 1.2,
            fontFamily: (selectedObject as fabric.IText).fontFamily,
            fontSize: fontSize,
            fill: selectedObject.fill,
          });
          ensureObjectId(t, `Line ${idx + 1}`);
          canvas.add(t);
        });
        canvas.renderAll();
        pushHistory();
      }
    }
  }, [canvas, selectedObject, handleUngroup, pushHistory]);

  const handleToggleHide = useCallback(() => {
    if (!canvas || !selectedObject) return;
    selectedObject.set('visible', !selectedObject.visible);
    if (!selectedObject.visible) {
      canvas.discardActiveObject();
      setSelectedObject(null);
    }
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleToggleLock = useCallback(() => {
    if (!canvas || !selectedObject) return;
    const isLocked = !(selectedObject as any).isLocked;
    (selectedObject as any).isLocked = isLocked;
    selectedObject.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockRotation: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      hasControls: !isLocked,
    });
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleAlignToPixelGrid = useCallback(() => {
    if (!canvas || !selectedObject) return;
    selectedObject.set({
      left: Math.round(selectedObject.left || 0),
      top: Math.round(selectedObject.top || 0),
    });
    selectedObject.setCoords();
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
  }, [canvas, selectedObject]);

  const handleAlign = useCallback(
    (alignment: AlignMode, target: AlignTarget = 'objects') => {
      if (!canvas) return;
      alignObjects(canvas, alignment, pageConfig.width, pageConfig.height, target);
      setSelectedObject(canvas.getActiveObject() || null);
      lastRepeatableRef.current = { type: 'align', payload: { alignment, target } };
      setCanRepeat(true);
      pushHistory('Align');
    },
    [canvas, pageConfig.width, pageConfig.height, pushHistory]
  );

  const syncSymmetryMirrors = useCallback(
    async (cfgOverride?: SymmetryConfig) => {
      if (!canvas) return;
      const cfg = cfgOverride || symmetryEditingConfigRef.current;
      if (!cfg) return;

      const seq = ++symmetrySyncSeqRef.current;
      const primaries = canvas
        .getObjects()
        .filter((o) => (o as any).isSymmetryPrimary && !(o as any).isSymmetryMirror);
      const transforms = getSymmetryTransforms(cfg);

      const cloneJobs: Promise<fabric.FabricObject>[] = [];
      for (const p of primaries) {
        for (let idx = 0; idx < transforms.length; idx++) {
          cloneJobs.push(cloneAndTransformSymmetryObject(p, transforms[idx], idx));
        }
      }

      const newMirrors = await Promise.all(cloneJobs);
      if (seq !== symmetrySyncSeqRef.current || !symmetryEditingConfigRef.current) {
        return;
      }

      isSyncingSymmetryRef.current = true;
      try {
        const oldMirrors = canvas.getObjects().filter((o) => (o as any).isSymmetryMirror);
        oldMirrors.forEach((m) => canvas.remove(m));

        if (newMirrors.length > 0) {
          const allObjs = canvas.getObjects();
          const firstPrimaryIdx = allObjs.findIndex((o) => (o as any).isSymmetryPrimary);
          const insertIdx = firstPrimaryIdx >= 0 ? firstPrimaryIdx : allObjs.length;
          canvas.insertAt(insertIdx, ...newMirrors);
        }
        canvas.requestRenderAll();
      } finally {
        isSyncingSymmetryRef.current = false;
      }
    },
    [canvas]
  );

  const handleEditSymmetry = useCallback(
    async (targetArg?: any) => {
      if (!canvas) return;
      if (symmetryEditingConfigRef.current) {
        showToast('Already editing Symmetry');
        return;
      }
      const target = targetArg || selectedObject || canvas.getActiveObject();
      if (!target || !(target as any).isSymmetryGroup || target.type !== 'group') {
        showToast('Select a Symmetry group to edit');
        return;
      }

      try {
        const group = target as fabric.Group;
        const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));
        const storedCfg: SymmetryConfig = (group as any).symmetryConfig || {
          centerX: group.getCenterPoint().x,
          centerY: group.getCenterPoint().y,
          angleDeg: 0,
          mirrorLines: 1,
        };
        const localAxis = (group as any).symmetryLocalAxis as { x: number; y: number } | undefined;
        const groupMatrix = group.calcTransformMatrix();
        const sceneCenterPt = localAxis
          ? new fabric.Point(localAxis.x, localAxis.y).transform(groupMatrix)
          : group.getCenterPoint();
        const transformedCfg = transformSymmetryConfigByGroup(storedCfg, group);
        const nextCfg: SymmetryConfig = {
          centerX: sceneCenterPt.x,
          centerY: sceneCenterPt.y,
          angleDeg: transformedCfg.angleDeg,
          mirrorLines: Math.max(1, Math.min(12, Math.round(storedCfg.mirrorLines || 1))),
        };

        const children = group.removeAll();
        let primaries = children.filter((c) => !(c as any).isSymmetryMirror);
        if (primaries.length === 0 && children.length > 0) {
          primaries = [children[0]];
        }

        isSyncingSymmetryRef.current = true;
        try {
          canvas.discardActiveObject();
          canvas.remove(group);
          primaries.forEach((p) => {
            (p as any).isSymmetryPrimary = true;
            delete (p as any).isSymmetryMirror;
            p.set({ selectable: true, evented: true });
            p.setCoords();
          });
          if (primaries.length > 0) {
            canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...primaries);
          }
        } finally {
          isSyncingSymmetryRef.current = false;
        }

        symmetryEditingConfigRef.current = nextCfg;
        setSymmetryEditingConfig(nextCfg);
        setActiveTool('pick');

        if (primaries.length === 1) {
          canvas.setActiveObject(primaries[0]);
          setSelectedObject(primaries[0]);
        } else if (primaries.length > 1) {
          const sel = new fabric.ActiveSelection(primaries, { canvas });
          canvas.setActiveObject(sel);
          setSelectedObject(sel);
        } else {
          setSelectedObject(null);
        }

        await syncSymmetryMirrors(nextCfg);
        showToast('Editing Symmetry — drag axis or edit primary objects');
      } catch (e) {
        console.error('Failed to edit symmetry', e);
      }
    },
    [canvas, selectedObject, syncSymmetryMirrors, showToast]
  );

  const handleCreateSymmetry = useCallback(async () => {
    if (!canvas) return;
    if (symmetryEditingConfigRef.current) {
      showToast('Already editing Symmetry — finish editing first');
      return;
    }

    const active = selectedObject || canvas.getActiveObject();
    if (active && (active as any).isSymmetryGroup) {
      await handleEditSymmetry(active);
      return;
    }

    try {
      let primaries: fabric.FabricObject[] = [];
      let cfg: SymmetryConfig;

      if (active) {
        if (active.type === 'activeselection') {
          const sel = active as fabric.ActiveSelection;
          primaries = [...sel.getObjects()];
          canvas.discardActiveObject();
        } else {
          primaries = [active];
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        primaries.forEach((p) => {
          (p as any).isSymmetryPrimary = true;
          delete (p as any).isSymmetryMirror;
          p.setCoords();
          const b = p.getBoundingRect();
          minX = Math.min(minX, b.left);
          maxX = Math.max(maxX, b.left + b.width);
          minY = Math.min(minY, b.top);
          maxY = Math.max(maxY, b.top + b.height);
        });

        cfg = {
          centerX: Number.isFinite(maxX) ? maxX + 16 : pageConfig.width / 2,
          centerY: Number.isFinite(minY) && Number.isFinite(maxY) ? (minY + maxY) / 2 : pageConfig.height / 2,
          angleDeg: 0,
          mirrorLines: 1,
        };
      } else {
        cfg = {
          centerX: pageConfig.width / 2,
          centerY: pageConfig.height / 2,
          angleDeg: 0,
          mirrorLines: 1,
        };
      }

      symmetryEditingConfigRef.current = cfg;
      setSymmetryEditingConfig(cfg);
      setActiveTool('pick');

      if (primaries.length === 1) {
        canvas.setActiveObject(primaries[0]);
        setSelectedObject(primaries[0]);
      } else if (primaries.length > 1) {
        const sel = new fabric.ActiveSelection(primaries, { canvas });
        canvas.setActiveObject(sel);
        setSelectedObject(sel);
      }

      await syncSymmetryMirrors(cfg);
      pushHistory('Create Symmetry');
      showToast('Symmetry editing started — adjust mirror lines or edit primary object');
    } catch (e) {
      console.error('Failed to create symmetry', e);
    }
  }, [canvas, selectedObject, pageConfig.width, pageConfig.height, handleEditSymmetry, syncSymmetryMirrors, pushHistory, showToast]);

  const handleFinishSymmetry = useCallback(async () => {
    if (!canvas || !symmetryEditingConfigRef.current) return;
    const cfg = { ...symmetryEditingConfigRef.current };

    try {
      await syncSymmetryMirrors(cfg);

      const allObjs = canvas.getObjects();
      const primaries = allObjs.filter((o) => (o as any).isSymmetryPrimary && !(o as any).isSymmetryMirror);
      const mirrors = allObjs.filter((o) => (o as any).isSymmetryMirror);

      symmetrySyncSeqRef.current++;
      symmetryEditingConfigRef.current = null;
      setSymmetryEditingConfig(null);

      if (primaries.length === 0) {
        isSyncingSymmetryRef.current = true;
        try {
          mirrors.forEach((m) => canvas.remove(m));
          canvas.requestRenderAll();
        } finally {
          isSyncingSymmetryRef.current = false;
        }
        showToast('Exited Symmetry editing');
        return;
      }

      const memberIndices = [...primaries, ...mirrors]
        .map((o) => allObjs.indexOf(o))
        .filter((i) => i >= 0);
      const insertIndex = memberIndices.length > 0 ? Math.min(...memberIndices) : allObjs.length;

      isSyncingSymmetryRef.current = true;
      let symGroup: fabric.Group;
      try {
        canvas.discardActiveObject();
        [...primaries, ...mirrors].forEach((o) => canvas.remove(o));

        symGroup = new fabric.Group([...primaries, ...mirrors], {
          subTargetCheck: true,
        });
        const invMatrix = fabric.util.invertTransform(symGroup.calcTransformMatrix());
        const localAxisPt = new fabric.Point(cfg.centerX, cfg.centerY).transform(invMatrix);
        (symGroup as any).isSymmetryGroup = true;
        (symGroup as any).symmetryConfig = cfg;
        (symGroup as any).symmetryLocalAxis = { x: localAxisPt.x, y: localAxisPt.y };
        ensureObjectId(symGroup, 'Symmetry Group');

        canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), symGroup);
        canvas.setActiveObject(symGroup);
        setSelectedObject(symGroup);
        canvas.requestRenderAll();
      } finally {
        isSyncingSymmetryRef.current = false;
      }

      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      pushHistory('Finish Editing Symmetry');
      showToast('Finished editing Symmetry');
    } catch (e) {
      console.error('Failed to finish symmetry editing', e);
    }
  }, [canvas, syncSymmetryMirrors, pushHistory, showToast]);

  const handleRemoveSymmetry = useCallback(() => {
    if (!canvas) return;

    if (symmetryEditingConfigRef.current) {
      symmetrySyncSeqRef.current++;
      symmetryEditingConfigRef.current = null;
      setSymmetryEditingConfig(null);

      isSyncingSymmetryRef.current = true;
      try {
        canvas.discardActiveObject();
        const allObjs = canvas.getObjects();
        const mirrors = allObjs.filter((o) => (o as any).isSymmetryMirror);
        const primaries = allObjs.filter((o) => (o as any).isSymmetryPrimary && !(o as any).isSymmetryMirror);
        mirrors.forEach((m) => canvas.remove(m));
        primaries.forEach((p) => {
          delete (p as any).isSymmetryPrimary;
          p.set({ selectable: true, evented: true });
          p.setCoords();
        });
        if (primaries.length === 1) {
          canvas.setActiveObject(primaries[0]);
          setSelectedObject(primaries[0]);
        } else if (primaries.length > 1) {
          const sel = new fabric.ActiveSelection(primaries, { canvas });
          canvas.setActiveObject(sel);
          setSelectedObject(sel);
        } else {
          setSelectedObject(null);
        }
        canvas.requestRenderAll();
      } finally {
        isSyncingSymmetryRef.current = false;
      }

      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      pushHistory('Remove Symmetry');
      showToast('Removed Symmetry');
      return;
    }

    const target = selectedObject || canvas.getActiveObject();
    if (!target || !(target as any).isSymmetryGroup || target.type !== 'group') {
      showToast('Select a Symmetry group to remove symmetry');
      return;
    }

    const group = target as fabric.Group;
    const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));
    const children = group.removeAll();
    let primaries = children.filter((c) => !(c as any).isSymmetryMirror);
    if (primaries.length === 0 && children.length > 0) {
      primaries = [children[0]];
    }

    canvas.discardActiveObject();
    canvas.remove(group);
    primaries.forEach((p) => {
      delete (p as any).isSymmetryPrimary;
      delete (p as any).isSymmetryMirror;
      delete (p as any).symmetryCopyIndex;
      p.set({ selectable: true, evented: true });
      p.setCoords();
    });
    if (primaries.length > 0) {
      canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...primaries);
    }
    if (primaries.length === 1) {
      canvas.setActiveObject(primaries[0]);
      setSelectedObject(primaries[0]);
    } else if (primaries.length > 1) {
      const sel = new fabric.ActiveSelection(primaries, { canvas });
      canvas.setActiveObject(sel);
      setSelectedObject(sel);
    } else {
      setSelectedObject(null);
    }
    canvas.requestRenderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory('Remove Symmetry');
    showToast('Removed Symmetry');
  }, [canvas, selectedObject, pushHistory, showToast]);

  const handleBreakSymmetryLink = useCallback(() => {
    if (!canvas) return;

    if (symmetryEditingConfigRef.current) {
      symmetrySyncSeqRef.current++;
      symmetryEditingConfigRef.current = null;
      setSymmetryEditingConfig(null);

      const allObjs = canvas.getObjects();
      const symMembers = allObjs.filter(
        (o) => (o as any).isSymmetryPrimary || (o as any).isSymmetryMirror
      );
      symMembers.forEach((o) => {
        delete (o as any).isSymmetryPrimary;
        delete (o as any).isSymmetryMirror;
        delete (o as any).symmetryCopyIndex;
        o.set({ selectable: true, evented: true });
        o.setCoords();
      });
      canvas.discardActiveObject();
      if (symMembers.length === 1) {
        canvas.setActiveObject(symMembers[0]);
        setSelectedObject(symMembers[0]);
      } else if (symMembers.length > 1) {
        const sel = new fabric.ActiveSelection(symMembers, { canvas });
        canvas.setActiveObject(sel);
        setSelectedObject(sel);
      } else {
        setSelectedObject(null);
      }
      canvas.requestRenderAll();
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      pushHistory('Break Symmetry Link');
      showToast('Broke Symmetry link — all objects are now independent');
      return;
    }

    const target = selectedObject || canvas.getActiveObject();
    if (!target || !(target as any).isSymmetryGroup || target.type !== 'group') {
      showToast('Select a Symmetry group to break symmetry link');
      return;
    }

    const group = target as fabric.Group;
    const insertIndex = Math.max(0, canvas.getObjects().indexOf(group));
    const children = group.removeAll();
    canvas.discardActiveObject();
    canvas.remove(group);
    children.forEach((c) => {
      delete (c as any).isSymmetryPrimary;
      delete (c as any).isSymmetryMirror;
      delete (c as any).symmetryCopyIndex;
      c.set({ selectable: true, evented: true });
      c.setCoords();
    });
    if (children.length > 0) {
      canvas.insertAt(Math.min(insertIndex, canvas.getObjects().length), ...children);
    }
    if (children.length === 1) {
      canvas.setActiveObject(children[0]);
      setSelectedObject(children[0]);
    } else if (children.length > 1) {
      const sel = new fabric.ActiveSelection(children, { canvas });
      canvas.setActiveObject(sel);
      setSelectedObject(sel);
    } else {
      setSelectedObject(null);
    }
    canvas.requestRenderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory('Break Symmetry Link');
    showToast('Broke Symmetry link — all copies are now independent objects');
  }, [canvas, selectedObject, pushHistory, showToast]);

  const handleUpdateSymmetryConfig = useCallback(
    (patch: Partial<SymmetryConfig>) => {
      const cur = symmetryEditingConfigRef.current;
      if (!cur) return;
      const next: SymmetryConfig = {
        ...cur,
        ...patch,
        mirrorLines: Math.max(1, Math.min(12, Math.round((patch.mirrorLines ?? cur.mirrorLines) || 1))),
      };
      symmetryEditingConfigRef.current = next;
      setSymmetryEditingConfig(next);
      void syncSymmetryMirrors(next);
    },
    [syncSymmetryMirrors]
  );

  // Live Symmetry canvas sync listener while editing Symmetry
  useEffect(() => {
    if (!canvas || !symmetryEditingConfig) return;

    const handleLiveTransform = (opt: any) => {
      if (isSyncingSymmetryRef.current) return;
      const target = opt?.target;
      if (target && (target as any).isSymmetryMirror) return;
      void syncSymmetryMirrors();
    };

    const handleObjectAdded = (opt: any) => {
      if (isSyncingSymmetryRef.current) return;
      const target = opt?.target;
      if (
        !target ||
        (target as any).isSymmetryMirror ||
        (target as any).excludeFromExport ||
        (target as any).isDimension
      ) {
        return;
      }
      (target as any).isSymmetryPrimary = true;
      void syncSymmetryMirrors();
    };

    const handleObjectRemoved = (opt: any) => {
      if (isSyncingSymmetryRef.current) return;
      const target = opt?.target;
      if (target && (target as any).isSymmetryPrimary) {
        void syncSymmetryMirrors();
      }
    };

    canvas.on('object:moving', handleLiveTransform);
    canvas.on('object:scaling', handleLiveTransform);
    canvas.on('object:rotating', handleLiveTransform);
    canvas.on('object:skewing', handleLiveTransform);
    canvas.on('object:modified', handleLiveTransform);
    canvas.on('text:changed', handleLiveTransform);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      canvas.off('object:moving', handleLiveTransform);
      canvas.off('object:scaling', handleLiveTransform);
      canvas.off('object:rotating', handleLiveTransform);
      canvas.off('object:skewing', handleLiveTransform);
      canvas.off('object:modified', handleLiveTransform);
      canvas.off('text:changed', handleLiveTransform);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
    };
  }, [canvas, !!symmetryEditingConfig, syncSymmetryMirrors]);

  // Live Parametric & Constraints Solver (keeps GCON & DCON enforced during moves/edits)
  useEffect(() => {
    if (!canvas) return;

    const runLiveSolve = (opt: any, isFinal: boolean) => {
      if (isSolvingParametricRef.current) return;
      const st = parametricStateRef.current;
      if (st.dimConstraints.length === 0 && st.geomConstraints.length === 0) return;

      const target = opt?.target;
      if (!target || (target as any).excludeFromExport || (target as any).isDimension) return;
      const movedId = (target as any).id as string | undefined;

      isSolvingParametricRef.current = true;
      try {
        const res = solveParametricSystem(canvas, st, pageConfig.units, {
          movedObjectId: movedId,
          iterations: isFinal ? 10 : 5,
        });
        if (isFinal && res.nextState !== st) {
          setParametricState(res.nextState);
        }
      } finally {
        isSolvingParametricRef.current = false;
      }
    };

    const onLive = (opt: any) => runLiveSolve(opt, false);
    const onFinal = (opt: any) => runLiveSolve(opt, true);
    const onRemoved = () => {
      const st = parametricStateRef.current;
      if (st.dimConstraints.length === 0 && st.geomConstraints.length === 0) return;
      const pruned = pruneOrphanedConstraints(canvas, st);
      if (pruned !== st) setParametricState(pruned);
    };

    canvas.on('object:moving', onLive);
    canvas.on('object:scaling', onLive);
    canvas.on('object:rotating', onLive);
    canvas.on('object:modified', onFinal);
    canvas.on('object:removed', onRemoved);

    return () => {
      canvas.off('object:moving', onLive);
      canvas.off('object:scaling', onLive);
      canvas.off('object:rotating', onLive);
      canvas.off('object:modified', onFinal);
      canvas.off('object:removed', onRemoved);
    };
  }, [canvas, pageConfig.units]);

  const handleUpdateParametricState = useCallback(
    (next: ParametricState, solve = false) => {
      if (!canvas || !solve) {
        setParametricState(next);
        return;
      }
      isSolvingParametricRef.current = true;
      try {
        const res = solveParametricSystem(canvas, next, pageConfig.units, { iterations: 12 });
        setParametricState(res.nextState);
        if (res.mutated) {
          canvas.requestRenderAll();
          setHasCanvasObjects(canvas.getObjects().length > 0);
          pushHistory('Solve Parametric');
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        }
      } finally {
        isSolvingParametricRef.current = false;
      }
    },
    [canvas, pageConfig.units, pushHistory]
  );

  const getSelectedTargetObjects = useCallback((): fabric.FabricObject[] => {
    if (!canvas) return [];
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeselection') {
      return [...(active as fabric.ActiveSelection).getObjects()];
    }
    return [active];
  }, [canvas]);

  const handleAddDimConstraint = useCallback(
    (kind: DimConstraintKind) => {
      if (!canvas) return;
      const objs = getSelectedTargetObjects();
      if (objs.length === 0) {
        showToast('Select 1 object (for size/angle) or 2 objects (for distance) first.');
        return;
      }
      isSolvingParametricRef.current = true;
      try {
        const res = createDimConstraint(canvas, parametricStateRef.current, kind, objs, pageConfig.units);
        if (res.error) {
          showToast(res.error);
          return;
        }
        setParametricState(res.state);
        canvas.requestRenderAll();
        pushHistory(`DCON ${kind}`);
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        showToast(`Applied ${kind} constraint (${res.created?.name} = ${res.created?.expression})`);
      } finally {
        isSolvingParametricRef.current = false;
      }
    },
    [canvas, getSelectedTargetObjects, pageConfig.units, pushHistory, showToast]
  );

  const handleEditDimConstraint = useCallback(
    (dimId: string, newExpression: string) => {
      const next: ParametricState = {
        ...parametricStateRef.current,
        dimConstraints: parametricStateRef.current.dimConstraints.map((d) =>
          d.id === dimId ? { ...d, expression: newExpression } : d
        ),
      };
      handleUpdateParametricState(next, true);
    },
    [handleUpdateParametricState]
  );

  const handleDeleteDimConstraint = useCallback((dimId: string) => {
    setParametricState((prev) => ({
      ...prev,
      dimConstraints: prev.dimConstraints.filter((d) => d.id !== dimId),
    }));
    showToast('Removed dimensional constraint');
  }, [showToast]);

  const handleAddGeomConstraint = useCallback(
    (type: GeometricConstraintType) => {
      if (!canvas) return;
      const objs = getSelectedTargetObjects();
      isSolvingParametricRef.current = true;
      try {
        const res = createGeomConstraint(canvas, parametricStateRef.current, type, objs, pageConfig.units);
        if (res.error) {
          showToast(res.error);
          return;
        }
        setParametricState(res.state);
        canvas.requestRenderAll();
        pushHistory(`GCON ${type}`);
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        showToast(`Applied ${type.toUpperCase()} geometric constraint`);
      } finally {
        isSolvingParametricRef.current = false;
      }
    },
    [canvas, getSelectedTargetObjects, pageConfig.units, pushHistory, showToast]
  );

  const handleDeleteGeomConstraint = useCallback((geomId: string) => {
    setParametricState((prev) => ({
      ...prev,
      geomConstraints: prev.geomConstraints.filter((g) => g.id !== geomId),
    }));
    showToast('Removed geometric constraint');
  }, [showToast]);

  const handleAutoConstrain = useCallback(() => {
    if (!canvas) return;
    const sel = getSelectedTargetObjects();
    const targets = sel.length > 0 ? sel : canvas.getObjects();
    if (targets.length === 0) {
      showToast('Draw or select objects first to run AutoConstrain.');
      return;
    }
    isSolvingParametricRef.current = true;
    try {
      const res = autoConstrainObjects(canvas, parametricStateRef.current, targets, pageConfig.units);
      setParametricState(res.state);
      canvas.requestRenderAll();
      if (res.addedCount > 0) {
        pushHistory('AutoConstrain');
        socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        showToast(`AutoConstrain applied ${res.addedCount} geometric constraint(s)`);
      } else {
        showToast('No new matching geometric constraints detected');
      }
    } finally {
      isSolvingParametricRef.current = false;
    }
  }, [canvas, getSelectedTargetObjects, pageConfig.units, pushHistory, showToast]);

  const handleClearSelectedConstraints = useCallback(() => {
    const selIds = new Set(getSelectedTargetObjects().map((o) => (o as any).id).filter(Boolean));
    if (selIds.size === 0) {
      showToast('Select object(s) to remove their constraints.');
      return;
    }
    setParametricState((prev) => ({
      ...prev,
      dimConstraints: prev.dimConstraints.filter((d) => !d.objectIds.some((id) => selIds.has(id))),
      geomConstraints: prev.geomConstraints.filter((g) => !g.objectIds.some((id) => selIds.has(id))),
    }));
    showToast('Cleared constraints on selected object(s)');
  }, [getSelectedTargetObjects, showToast]);

  const handleClearAllConstraints = useCallback(() => {
    setParametricState((prev) => ({
      ...prev,
      dimConstraints: [],
      geomConstraints: [],
    }));
    showToast('Cleared all geometric & dimensional constraints');
  }, [showToast]);

  const handleCreateSymbol = useCallback(() => {
    if (!selectedObject) return;
    (selectedObject as any).isSymbol = true;
    ensureObjectId(selectedObject, `${getObjectLabel(selectedObject)} (Symbol)`);
  }, [selectedObject]);

  const handleOpenProperties = useCallback(() => {
    setActiveDocker('properties');
  }, []);

  // Paste in View (Ctrl+Shift+V) — pastes centered in current viewport
  const handlePasteInView = useCallback(async () => {
    if (!canvas || !clipboardRef.current) return;
    try {
      const cloned = await clipboardRef.current.clone();
      canvas.discardActiveObject();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const viewCenterX = ((canvas.getWidth() || 800) / 2 - vpt[4]) / (vpt[0] || 1);
      const viewCenterY = ((canvas.getHeight() || 600) / 2 - vpt[5]) / (vpt[3] || 1);
      const bw = (cloned.width || 0) * (cloned.scaleX || 1);
      const bh = (cloned.height || 0) * (cloned.scaleY || 1);

      cloned.set({
        left: cloned.originX === 'center' ? viewCenterX : viewCenterX - bw / 2,
        top: cloned.originY === 'center' ? viewCenterY : viewCenterY - bh / 2,
        evented: true,
      });

      if (cloned.type === 'activeselection') {
        const sel = cloned as fabric.ActiveSelection;
        sel.canvas = canvas;
        sel.forEachObject((obj) => {
          ensureObjectId(obj);
          canvas.add(obj);
        });
        sel.setCoords();
      } else {
        ensureObjectId(cloned);
        canvas.add(cloned);
      }

      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      setSelectedObject(cloned);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
      pushHistory('Paste in View');
      showToast('Pasted object centered in current view');
    } catch (err) {
      console.error('Failed to paste in view', err);
    }
  }, [canvas, pushHistory, showToast]);

  // Apply Paste Special
  const handleApplyPasteSpecial = useCallback(async () => {
    if (!canvas || !clipboardRef.current) return;
    try {
      const src = clipboardRef.current;
      if (pasteSpecialFormat === 'text') {
        const rawText = typeof (src as any).text === 'string' ? (src as any).text : getObjectLabel(src);
        const textObj = new fabric.IText(rawText, {
          left: (src.left || 80) + 24,
          top: (src.top || 80) + 24,
          fontFamily: (src as any).fontFamily || 'Montserrat',
          fontSize: (src as any).fontSize || 24,
          fill: '#111827',
        });
        ensureObjectId(textObj, 'Pasted Text');
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        setSelectedObject(textObj);
      } else {
        const cloned = await src.clone();
        cloned.set({
          left: (cloned.left || 0) + 24,
          top: (cloned.top || 0) + 24,
          evented: true,
        });
        if (pasteSpecialFormat === 'outline') {
          const applyOutlineOnly = (o: fabric.FabricObject) => {
            o.set({
              fill: 'transparent',
              stroke: o.stroke && o.stroke !== 'transparent' ? o.stroke : '#000000',
              strokeWidth: Math.max(1, o.strokeWidth || 1),
            });
          };
          if (cloned.type === 'activeselection') {
            (cloned as fabric.ActiveSelection).forEachObject(applyOutlineOnly);
          } else {
            applyOutlineOnly(cloned);
          }
        }
        if (cloned.type === 'activeselection') {
          const sel = cloned as fabric.ActiveSelection;
          sel.canvas = canvas;
          sel.forEachObject((obj) => {
            ensureObjectId(obj);
            canvas.add(obj);
          });
          sel.setCoords();
        } else {
          ensureObjectId(cloned);
          canvas.add(cloned);
        }
        canvas.setActiveObject(cloned);
        setSelectedObject(cloned);
      }
      canvas.requestRenderAll();
      setShowPasteSpecialModal(false);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
      pushHistory('Paste Special');
    } catch (err) {
      console.error('Paste special failed', err);
    }
  }, [canvas, pasteSpecialFormat, pushHistory]);

  // Clone object (linked clone marker)
  const handleClone = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj as any).isEditing) return;

    try {
      const cloned = await activeObj.clone();
      canvas.discardActiveObject();
      cloned.set({
        left: (activeObj.left || 0) + 24,
        top: (activeObj.top || 0) + 24,
        evented: true,
      });
      if (cloned.type === 'activeselection') {
        const sel = cloned as fabric.ActiveSelection;
        sel.canvas = canvas;
        sel.forEachObject((obj) => {
          (obj as any).isClone = true;
          ensureObjectId(obj, getObjectLabel(obj) + ' (Clone)');
          canvas.add(obj);
        });
        sel.setCoords();
      } else {
        (cloned as any).isClone = true;
        (cloned as any).cloneSourceId = (activeObj as any).id || '';
        ensureObjectId(cloned, getObjectLabel(activeObj) + ' (Clone)');
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      setSelectedObject(cloned);
      lastRepeatableRef.current = { type: 'clone' };
      setCanRepeat(true);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
      pushHistory('Clone');
      showToast('Created linked clone');
    } catch (err) {
      console.error('Failed to clone object', err);
    }
  }, [canvas, pushHistory, showToast]);

  // Select All (Objects / Text / Curves / Nodes)
  const handleSelectAll = useCallback(
    (mode: 'objects' | 'text' | 'curves' | 'nodes' = 'objects') => {
      if (!canvas) return;
      if (mode === 'nodes') {
        setActiveTool('shape');
        setTimeout(() => handleCurveAction('select_all_nodes'), 50);
        return;
      }

      const allObjs = canvas.getObjects().filter((o) => o.selectable !== false && o.visible !== false);
      let matched = allObjs;
      if (mode === 'text') {
        matched = allObjs.filter((o) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox');
      } else if (mode === 'curves') {
        matched = allObjs.filter((o) => o.type === 'path' || (o as any).isCurve);
      }

      canvas.discardActiveObject();
      if (matched.length === 0) {
        setSelectedObject(null);
        canvas.requestRenderAll();
        showToast(`No ${mode} found on page`);
        return;
      }
      if (matched.length === 1) {
        canvas.setActiveObject(matched[0]);
        setSelectedObject(matched[0]);
      } else {
        const sel = new fabric.ActiveSelection(matched, { canvas });
        canvas.setActiveObject(sel);
        setSelectedObject(sel);
      }
      canvas.requestRenderAll();
      showToast(`Selected ${matched.length} ${mode}`);
    },
    [canvas, handleCurveAction, showToast]
  );

  // Copy Properties From...
  const handleOpenCopyProperties = useCallback(() => {
    if (!canvas || !selectedObject) return;
    const allObjs = canvas.getObjects();
    const others = allObjs.filter((o) => o !== selectedObject && o.selectable !== false);
    if (others.length === 0) {
      showToast('Add another object on the canvas to copy properties from');
      return;
    }
    const first = others[0];
    setCopyPropsSourceId((first as any).id || String(allObjs.indexOf(first)));
    setShowCopyPropsModal(true);
  }, [canvas, selectedObject, showToast]);

  const handleApplyCopyProperties = useCallback(() => {
    if (!canvas || !selectedObject) return;
    const objs = canvas.getObjects();
    const sourceObj = objs.find((o, idx) => ((o as any).id || String(idx)) === copyPropsSourceId);
    if (!sourceObj) {
      setShowCopyPropsModal(false);
      return;
    }

    const applyToTarget = (target: fabric.FabricObject) => {
      if (copyPropsFill && sourceObj.fill !== undefined) target.set('fill', sourceObj.fill);
      if (copyPropsStrokeColor && sourceObj.stroke !== undefined) target.set('stroke', sourceObj.stroke);
      if (copyPropsStrokeWidth && sourceObj.strokeWidth !== undefined) target.set('strokeWidth', sourceObj.strokeWidth);
      target.setCoords();
    };

    if (selectedObject.type === 'activeselection') {
      (selectedObject as fabric.ActiveSelection).forEachObject(applyToTarget);
    } else {
      applyToTarget(selectedObject);
    }

    canvas.requestRenderAll();
    setShowCopyPropsModal(false);
    socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
    pushHistory('Copy Properties');
    showToast(`Copied properties from ${getObjectLabel(sourceObj)}`);
  }, [canvas, selectedObject, copyPropsSourceId, copyPropsFill, copyPropsStrokeColor, copyPropsStrokeWidth, pushHistory, showToast]);

  // Step and Repeat (Ctrl+Shift+D)
  const handleApplyStepAndRepeat = useCallback(
    async (colsArg?: number, rowsArg?: number, oxArg?: number, oyArg?: number) => {
      if (!canvas) return;
      const activeObj = canvas.getActiveObject();
      if (!activeObj) {
        showToast('Select an object first to Step and Repeat');
        return;
      }
      const cols = Math.max(1, Math.min(20, colsArg ?? stepCols));
      const rows = Math.max(1, Math.min(20, rowsArg ?? stepRows));
      const ox = oxArg ?? stepOffsetX;
      const oy = oyArg ?? stepOffsetY;

      const created: fabric.FabricObject[] = [];
      const baseLeft = activeObj.left || 0;
      const baseTop = activeObj.top || 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 && c === 0) continue;
          const cloned = await activeObj.clone();
          cloned.set({
            left: baseLeft + c * ox,
            top: baseTop + r * oy,
            evented: true,
          });
          if (cloned.type === 'activeselection') {
            const sel = cloned as fabric.ActiveSelection;
            sel.canvas = canvas;
            sel.forEachObject((o) => {
              ensureObjectId(o, getObjectLabel(o) + ' (Step)');
              canvas.add(o);
              created.push(o);
            });
          } else {
            ensureObjectId(cloned, getObjectLabel(activeObj) + ` (${r + 1}×${c + 1})`);
            canvas.add(cloned);
            created.push(cloned);
          }
        }
      }

      if (created.length > 0) {
        lastRepeatableRef.current = {
          type: 'step_repeat',
          payload: { cols, rows, ox, oy },
        };
        setCanRepeat(true);
        canvas.requestRenderAll();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
        pushHistory('Step and Repeat');
        showToast(`Created ${created.length} Step and Repeat copies`);
      }
      setShowStepRepeatModal(false);
    },
    [canvas, stepCols, stepRows, stepOffsetX, stepOffsetY, pushHistory, showToast]
  );

  // Repeat last action (Ctrl+R)
  const handleRepeat = useCallback(() => {
    const last = lastRepeatableRef.current;
    if (!last) return;
    if (last.type === 'duplicate') handleDuplicate();
    else if (last.type === 'clone') handleClone();
    else if (last.type === 'align' && last.payload) {
      handleAlign(last.payload.alignment, last.payload.target);
    } else if (last.type === 'step_repeat' && last.payload) {
      handleApplyStepAndRepeat(last.payload.cols, last.payload.rows, last.payload.ox, last.payload.oy);
    }
  }, [handleDuplicate, handleClone, handleAlign, handleApplyStepAndRepeat]);

  // Find and Replace (Ctrl+F)
  const handleFindNextMatch = useCallback(() => {
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (findReplaceTab === 'text') {
      if (!findQuery.trim()) return;
      const needle = findCaseSensitive ? findQuery : findQuery.toLowerCase();
      const matches = objs.filter((o) => {
        const txt = (o as any).text;
        if (typeof txt !== 'string') return false;
        const hay = findCaseSensitive ? txt : txt.toLowerCase();
        return hay.includes(needle);
      });
      if (matches.length === 0) {
        showToast(`No text matching "${findQuery}"`);
        return;
      }
      const curIdx = selectedObject ? matches.indexOf(selectedObject) : -1;
      const nextObj = matches[(curIdx + 1) % matches.length];
      canvas.setActiveObject(nextObj);
      setSelectedObject(nextObj);
      canvas.requestRenderAll();
    } else {
      const targetColor = findColorHex.toLowerCase();
      const matches = objs.filter((o) => {
        const fillMatch =
          (findColorScope === 'fill' || findColorScope === 'both') &&
          typeof o.fill === 'string' &&
          o.fill.toLowerCase() === targetColor;
        const strokeMatch =
          (findColorScope === 'stroke' || findColorScope === 'both') &&
          typeof o.stroke === 'string' &&
          o.stroke.toLowerCase() === targetColor;
        return fillMatch || strokeMatch;
      });
      if (matches.length === 0) {
        showToast(`No objects using color ${findColorHex}`);
        return;
      }
      const curIdx = selectedObject ? matches.indexOf(selectedObject) : -1;
      const nextObj = matches[(curIdx + 1) % matches.length];
      canvas.setActiveObject(nextObj);
      setSelectedObject(nextObj);
      canvas.requestRenderAll();
    }
  }, [canvas, findReplaceTab, findQuery, findCaseSensitive, findColorHex, findColorScope, selectedObject, showToast]);

  const handleReplaceAllMatches = useCallback(() => {
    if (!canvas) return;
    let count = 0;
    const objs = canvas.getObjects();
    if (findReplaceTab === 'text') {
      if (!findQuery) return;
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, findCaseSensitive ? 'g' : 'gi');
      objs.forEach((o) => {
        if (typeof (o as any).text === 'string') {
          const nextTxt = (o as any).text.replace(regex, replaceQuery);
          if (nextTxt !== (o as any).text) {
            (o as any).set('text', nextTxt);
            count++;
          }
        }
      });
    } else {
      const targetColor = findColorHex.toLowerCase();
      objs.forEach((o) => {
        let changed = false;
        if (
          (findColorScope === 'fill' || findColorScope === 'both') &&
          typeof o.fill === 'string' &&
          o.fill.toLowerCase() === targetColor
        ) {
          o.set('fill', replaceColorHex);
          changed = true;
        }
        if (
          (findColorScope === 'stroke' || findColorScope === 'both') &&
          typeof o.stroke === 'string' &&
          o.stroke.toLowerCase() === targetColor
        ) {
          o.set('stroke', replaceColorHex);
          changed = true;
        }
        if (changed) count++;
      });
    }

    if (count > 0) {
      canvas.requestRenderAll();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      pushHistory('Find and Replace');
      showToast(`Replaced ${count} object(s)`);
    } else {
      showToast('No matching items to replace');
    }
  }, [canvas, findReplaceTab, findQuery, replaceQuery, findCaseSensitive, findColorHex, replaceColorHex, findColorScope, pushHistory, showToast]);

  // Full-screen Preview (F9) & Preview Selected Only
  const handleFullScreenPreview = useCallback(() => {
    if (fullScreenPreviewUrl) {
      setFullScreenPreviewUrl(null);
      return;
    }
    if (!canvas) return;
    try {
      const prevVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const url = canvas.toDataURL({
        format: 'png',
        multiplier: 2,
        left: 0,
        top: 0,
        width: pageConfig.width,
        height: pageConfig.height,
      });
      canvas.setViewportTransform(prevVpt as any);
      canvas.requestRenderAll();
      setFullScreenPreviewUrl(url);
      setFullScreenPreviewLabel(`${documentName} — Full-Screen Preview (Press F9 or Esc to exit)`);
    } catch (err) {
      console.error('Full-screen preview failed', err);
    }
  }, [canvas, fullScreenPreviewUrl, pageConfig, documentName]);

  const handlePreviewSelectedOnly = useCallback(() => {
    if (!canvas || !selectedObject) return;
    const all = canvas.getObjects();
    const activeSet = new Set<fabric.FabricObject>(
      selectedObject.type === 'activeselection'
        ? (selectedObject as fabric.ActiveSelection).getObjects()
        : [selectedObject]
    );
    const prevVisibility = all.map((o) => o.visible);
    try {
      all.forEach((o) => {
        if (!activeSet.has(o)) o.visible = false;
      });
      const prevVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const url = canvas.toDataURL({
        format: 'png',
        multiplier: 2,
        left: 0,
        top: 0,
        width: pageConfig.width,
        height: pageConfig.height,
      });
      all.forEach((o, idx) => {
        o.visible = prevVisibility[idx];
      });
      canvas.setViewportTransform(prevVpt as any);
      canvas.requestRenderAll();
      setFullScreenPreviewUrl(url);
      setFullScreenPreviewLabel('Preview Selected Only (Press F9 or Esc to exit)');
    } catch (err) {
      all.forEach((o, idx) => {
        o.visible = prevVisibility[idx];
      });
      console.error('Preview selected only failed', err);
    }
  }, [canvas, selectedObject, pageConfig]);

  // Zoom To Fit All Objects (F4)
  const handleZoomToFitObjects = useCallback(() => {
    if (!canvas) return;
    const objs = canvas.getObjects().filter((o) => o.visible !== false);
    if (objs.length === 0) {
      setZoomLevel(0.85);
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    objs.forEach((o) => {
      const b = o.getBoundingRect();
      minX = Math.min(minX, b.left);
      minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width);
      maxY = Math.max(maxY, b.top + b.height);
    });
    const contentW = Math.max(40, (maxX - minX) / (canvas.getZoom() || 1));
    const contentH = Math.max(40, (maxY - minY) / (canvas.getZoom() || 1));
    const cw = canvas.getWidth() || 800;
    const ch = canvas.getHeight() || 600;
    const targetZoom = Math.max(0.01, Math.min(4096, Math.min((cw * 0.78) / contentW, (ch * 0.78) / contentH)));
    setZoomLevel(Number(targetZoom.toFixed(4)));
  }, [canvas]);

  const handleToggleBold = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') {
      const tObj = activeObj as fabric.IText;
      const isEditing = !!(tObj as any).isEditing;
      const hasRange =
        isEditing &&
        typeof tObj.selectionStart === 'number' &&
        typeof tObj.selectionEnd === 'number' &&
        tObj.selectionStart !== tObj.selectionEnd;

      if (hasRange) {
        const styles = tObj.getSelectionStyles(tObj.selectionStart, tObj.selectionEnd);
        const allBold = styles.length > 0 && styles.every((s: any) => s?.fontWeight === 'bold' || s?.fontWeight === '700');
        const nextWeight = allBold ? 'normal' : 'bold';
        tObj.setSelectionStyles({ fontWeight: nextWeight }, tObj.selectionStart, tObj.selectionEnd);
        setProperties((prev) => ({ ...prev, fontWeight: nextWeight }));
        canvas.requestRenderAll();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        pushHistory('Bold Selection');
        return;
      }

      const curWeight = String((tObj as any).fontWeight || 'normal');
      const nextWeight = curWeight === 'bold' || curWeight === '700' ? 'normal' : 'bold';
      (tObj as any).set('fontWeight', nextWeight);
      if (isEditing && typeof (tObj as any).removeStyle === 'function') {
        (tObj as any).setSelectionStyles({ fontWeight: nextWeight }, 0, (tObj.text || '').length);
      }
      tObj.setCoords();
      setProperties((prev) => ({ ...prev, fontWeight: nextWeight }));
      canvas.requestRenderAll();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      pushHistory('Toggle Bold');
      showToast(`Bold ${nextWeight === 'bold' ? 'On' : 'Off'}`);
      return;
    }

    if (isTextOnPathObject(activeObj)) {
      const curWeight = String((activeObj as any).textOnPathData?.fontWeight || properties.fontWeight || 'normal');
      const nextWeight = curWeight === 'bold' || curWeight === '700' ? 'normal' : 'bold';
      const rebuilt = reflowTextOnPathGroup(canvas, activeObj as fabric.Group, { fontWeight: nextWeight });
      if (rebuilt) {
        setSelectedObject(rebuilt);
        setProperties((prev) => ({ ...prev, fontWeight: nextWeight }));
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        pushHistory('Toggle Bold');
        showToast(`Bold ${nextWeight === 'bold' ? 'On' : 'Off'}`);
      }
      return;
    }

    if (activeObj.type === 'activeselection') {
      const sel = activeObj as fabric.ActiveSelection;
      const textObjs = sel
        .getObjects()
        .filter((o) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox');
      if (textObjs.length > 0) {
        const firstWeight = String((textObjs[0] as any).fontWeight || 'normal');
        const nextWeight = firstWeight === 'bold' || firstWeight === '700' ? 'normal' : 'bold';
        textObjs.forEach((o) => (o as any).set('fontWeight', nextWeight));
        sel.setCoords();
        setProperties((prev) => ({ ...prev, fontWeight: nextWeight }));
        canvas.requestRenderAll();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        pushHistory('Toggle Bold');
        showToast(`Bold ${nextWeight === 'bold' ? 'On' : 'Off'}`);
      }
    }
  }, [canvas, properties.fontWeight, pushHistory, showToast]);

  // Global Keyboard Shortcuts (All CorelDRAW standard shortcuts + F1-F11)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input element, select, or textarea, do not intercept
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+B / Cmd+B = Bold (works both when text object is selected AND during active IText editing)
      if (isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        e.stopPropagation();
        handleToggleBold();
        return;
      }

      // If actively editing text in a Fabric IText on canvas, let remaining text editing proceed
      if (canvas) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj as any).isEditing) {
          return;
        }
      }

      // Ctrl+Z / Cmd+Z = Undo (CorelDRAW shortcut)
      if (isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y / Cmd+Y = Redo (CorelDRAW shortcut)
      // Also support Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if (
        (isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) ||
        (isCtrlOrCmd && !e.altKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+J / Cmd+J = Options & Settings
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowSettingsModal(true);
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P = Page Setup
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        openPageSetup('size');
        return;
      }

      // Ctrl+N = New Document
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleNewDocument();
        return;
      }

      // Ctrl+O = Open Document
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }

      // Ctrl+S = Save / Ctrl+Shift+S = Save As
      if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSaveDocument();
        }
        return;
      }

      // Ctrl+I = Import Image / SVG / File
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        importInputRef.current?.click();
        return;
      }

      // Ctrl+E = Export Modal
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
        setShowExportModal(true);
        return;
      }

      // Ctrl+P = Print
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        window.print();
        return;
      }

      // Ctrl+C / Cmd+C = Copy
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl+X / Cmd+X = Cut
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleCut();
        return;
      }

      // Ctrl+V = Paste / Ctrl+Shift+V = Paste in View
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (e.shiftKey) {
          handlePasteInView();
        } else {
          handlePaste();
        }
        return;
      }

      // Ctrl+D = Duplicate / Ctrl+Shift+D = Step and Repeat
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (e.shiftKey) {
          setShowStepRepeatModal(true);
        } else {
          handleDuplicate();
        }
        return;
      }

      // Ctrl+R = Repeat last action
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleRepeat();
        return;
      }

      // Ctrl+A = Select All Objects
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectAll('objects');
        return;
      }

      // Ctrl+G = Group Objects
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleGroup();
        return;
      }

      // Ctrl+U = Ungroup Objects
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        handleUngroup();
        return;
      }

      // Ctrl+F = Find and Replace
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setShowFindReplaceModal((prev) => !prev);
        return;
      }

      // Shift+Esc = Exit Focus Mode
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        handleExitFocusMode();
        return;
      }

      // Delete / Backspace = Delete selected object(s) (skip when Shape tool is deleting nodes)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTool === 'shape' && curveEditState.selectedNodeCount > 0) {
          return;
        }
        const activeObj = canvas?.getActiveObject();
        if (activeObj && !(activeObj as any).isEditing) {
          e.preventDefault();
          handleDelete();
          return;
        }
      }

      // CorelDRAW Alignment Shortcuts (L, R, T, B, C, E, P) when object(s) selected
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && canvas?.getActiveObject()) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !(activeObj as any).isEditing) {
          const keyUpper = e.key.toUpperCase();
          if (keyUpper === 'L') {
            e.preventDefault();
            handleAlign('left');
            return;
          }
          if (keyUpper === 'R') {
            e.preventDefault();
            handleAlign('right');
            return;
          }
          if (keyUpper === 'T') {
            e.preventDefault();
            handleAlign('top');
            return;
          }
          if (keyUpper === 'B') {
            e.preventDefault();
            handleAlign('bottom');
            return;
          }
          if (keyUpper === 'C') {
            e.preventDefault();
            handleAlign('center');
            return;
          }
          if (keyUpper === 'E') {
            e.preventDefault();
            handleAlign('middle');
            return;
          }
          if (keyUpper === 'P') {
            e.preventDefault();
            handleAlign('center-page');
            return;
          }
        }
      }

      // X = Eraser Tool (CorelDRAW shortcut)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        setActiveTool('eraser');
        return;
      }

      // I = Color Eyedropper Tool
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setActiveTool('eyedropper');
        showToast('Color Eyedropper (I)');
        return;
      }

      // Alt+Z = Toggle Snap to Objects (CorelDRAW shortcut)
      if (e.altKey && !isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        setSnapConfig((prev) => ({ ...prev, snapToObjects: !prev.snapToObjects }));
        return;
      }

      // Alt+Y = Toggle Snap to Document Grid (CorelDRAW shortcut)
      if (e.altKey && !isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        setSnapConfig((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
        return;
      }

      // Alt+F7 = Toggle Transform Docker (CorelDRAW shortcut)
      if (e.altKey && !isCtrlOrCmd && (e.key === 'F7' || e.code === 'F7')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'transform' ? null : 'transform'));
        return;
      }

      // Escape = Close Modal/Preview, Cancel PowerClip/FitText Picking, or Exit Group Editing
      if (e.key === 'Escape') {
        if (showFountainFillModal) {
          e.preventDefault();
          setShowFountainFillModal(false);
          return;
        }
        if (fullScreenPreviewUrl) {
          e.preventDefault();
          setFullScreenPreviewUrl(null);
          return;
        }
        if (powerClipPicking) {
          e.preventDefault();
          setPowerClipPicking(false);
          powerClipSourceRef.current = null;
          return;
        }
        if (fitTextPicking) {
          e.preventDefault();
          setFitTextPicking(false);
          fitTextSourceRef.current = null;
          return;
        }
        if (groupEditStackRef.current.length > 0) {
          e.preventDefault();
          handleExitGroupEdit(false);
          return;
        }
        if (symmetryEditingConfigRef.current) {
          e.preventDefault();
          void handleFinishSymmetry();
          return;
        }
      }

      // '+' key (numpad plus or shift+'=') = Duplicate (CorelDRAW shortcut)
      if (!isCtrlOrCmd && !e.altKey && (e.key === '+' || e.code === 'NumpadAdd')) {
        const activeObj = canvas?.getActiveObject();
        if (activeObj && !(activeObj as any).isEditing) {
          e.preventDefault();
          handleDuplicate();
          return;
        }
      }

      // Ctrl+Q / Cmd+Q = Convert to Curves (CorelDRAW shortcut)
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handleConvertToCurves();
        return;
      }

      // Ctrl+K / Cmd+K = Break Apart (CorelDRAW shortcut)
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handleBreakApart();
        return;
      }

      // Alt+S = Create New Symmetry (CorelDRAW shortcut)
      if (e.altKey && !isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleCreateSymmetry();
        return;
      }

      // Alt+Enter = Properties Docker (CorelDRAW shortcut)
      if (e.altKey && !isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        handleOpenProperties();
        return;
      }

      // Window Dockers Shortcuts (Ctrl+Shift+A, Ctrl+T, Ctrl+F3, Ctrl+F5, Ctrl+F6, Ctrl+F11)
      if (isCtrlOrCmd && e.shiftKey && !e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'align' ? null : 'align'));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'text' ? null : 'text'));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F5' || e.code === 'F5')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'object_styles' ? null : 'object_styles'));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F3' || e.code === 'F3')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'symbols' ? null : 'symbols'));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F11' || e.code === 'F11')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'glyphs' ? null : 'glyphs'));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F6' || e.code === 'F6')) {
        e.preventDefault();
        setActiveDocker((prev) => (prev === 'color_styles' ? null : 'color_styles'));
        return;
      }

      // Ctrl+Shift+T = Edit Text...
      if (isCtrlOrCmd && e.shiftKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setActiveTextDialog('edit_text');
        return;
      }

      // Ctrl+F8 = Convert To Paragraph / Artistic Text
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F8' || e.code === 'F8')) {
        e.preventDefault();
        handleTextActionRef.current('convert_paragraph');
        return;
      }

      // Alt+F12 = Align to Baseline
      if (e.altKey && !isCtrlOrCmd && (e.key === 'F12' || e.code === 'F12')) {
        e.preventDefault();
        handleTextActionRef.current('align_baseline');
        return;
      }

      // Ctrl+F9 = Contour Effect
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        setActiveEffectDialog({ kind: 'contour' });
        return;
      }

      // Ctrl+F7 = Envelope Effect
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === 'F7' || e.code === 'F7')) {
        e.preventDefault();
        setActiveEffectDialog({ kind: 'envelope' });
        return;
      }

      // Alt+F3 = Lens Effect
      if (e.altKey && !isCtrlOrCmd && (e.key === 'F3' || e.code === 'F3')) {
        e.preventDefault();
        setActiveEffectDialog({ kind: 'lens' });
        return;
      }

      // F1 = CorelDRAW Help (Hints & Shortcuts Docker)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F1' || e.code === 'F1')) {
        e.preventDefault();
        e.stopPropagation();
        setActiveDocker((prev) => (prev === 'hints' ? null : 'hints'));
        return;
      }

      // F2 = Zoom Tool
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F2' || e.code === 'F2')) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTool('zoom');
        showToast('Zoom Tool (F2)');
        return;
      }

      // F3 = To Reduce Size (Zoom Out)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F3' || e.code === 'F3')) {
        e.preventDefault();
        e.stopPropagation();
        setZoomLevel((z) => {
          const next = Math.max(0.01, Number((z * 0.8).toFixed(4)));
          return next;
        });
        return;
      }

      // F5 = Freehand Tool
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F5' || e.code === 'F5')) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTool('freehand');
        showToast('Freehand Tool (F5)');
        return;
      }

      // F6 = Rectangle Tool
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F6' || e.code === 'F6')) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTool('rectangle');
        showToast('Rectangle Tool (F6)');
        return;
      }

      // F7 = Ellipse Tool (Circle)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F7' || e.code === 'F7')) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTool('ellipse');
        showToast('Ellipse Tool (F7)');
        return;
      }

      // Shift+F8 or Alt+F8 = Toggle AutoCAD Ortho Mode (keeps F8 for CorelDRAW Text Tool)
      if (!isCtrlOrCmd && (e.shiftKey || e.altKey) && (e.key === 'F8' || e.code === 'F8')) {
        e.preventDefault();
        e.stopPropagation();
        setSnapConfig((prev) => {
          const next = !prev.orthoMode;
          showToast(next ? 'Ortho Mode: ON (0° / 90°)' : 'Ortho Mode: OFF');
          return { ...prev, orthoMode: next };
        });
        return;
      }

      // F8 = Text Tool (CorelDRAW standard shortcut)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F8' || e.code === 'F8')) {
        e.preventDefault();
        setActiveTool('text');
        showToast('Text Tool (F8)');
        return;
      }

      // F9 = Full-screen Preview
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        handleFullScreenPreview();
        return;
      }

      // F4 = Zoom To Fit / Shift+F4 = Fit Page
      if (!isCtrlOrCmd && !e.altKey && (e.key === 'F4' || e.code === 'F4')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleZoomMode('to_page');
        } else {
          handleZoomMode('to_fit');
        }
        return;
      }

      // Ctrl++ / Ctrl+= = Zoom In, Ctrl+- = Zoom Out
      if (isCtrlOrCmd && !e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoomLevel((z) => Math.min(4096, Number((z * 1.25).toFixed(4))));
        return;
      }
      if (isCtrlOrCmd && !e.altKey && e.key === '-') {
        e.preventDefault();
        setZoomLevel((z) => Math.max(0.01, Number((z * 0.8).toFixed(4))));
        return;
      }

      // Alt+Shift+R = Toggle Rulers
      if (e.altKey && e.shiftKey && !isCtrlOrCmd && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setShowRulers((r) => !r);
        return;
      }

      // Alt+Shift+A = Toggle Alignment Guides
      if (e.altKey && e.shiftKey && !isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setShowAlignmentGuides((a) => !a);
        return;
      }

      // Alt+Shift+D = Toggle Dynamic Guides
      if (e.altKey && e.shiftKey && !isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowDynamicGuides((d) => !d);
        return;
      }

      // Alt+Q = Toggle Snap Off / On
      if (e.altKey && !e.shiftKey && !isCtrlOrCmd && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        setSnapConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
        return;
      }

      // F10 = Shape Tool / Curve Node Editing (CorelDRAW standard shortcut)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F10' || e.code === 'F10')) {
        e.preventDefault();
        setActiveTool((prev) => (prev === 'shape' ? 'pick' : 'shape'));
        return;
      }

      // F11 = Fountain Fill Dialog (CorelDRAW standard shortcut)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === 'F11' || e.code === 'F11')) {
        e.preventDefault();
        e.stopPropagation();
        setShowFountainFillModal((prev) => !prev);
        return;
      }

      // Arrow keys = Nudge selected object(s) by configured Nudge Distance
      if (
        !e.altKey &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj || (activeObj as any).isEditing) return;

        e.preventDefault();
        e.stopPropagation();

        const baseNudge = pageConfig.nudgeDistance ?? (96 / 25.4) * 0.1;
        const multiplier = e.shiftKey ? 2 : isCtrlOrCmd ? 0.5 : 1;
        const step = baseNudge * multiplier;

        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;

        const nextLeft = (activeObj.left ?? 0) + dx;
        const nextTop = (activeObj.top ?? 0) + dy;
        activeObj.set({ left: nextLeft, top: nextTop });
        activeObj.setCoords();
        setProperties((prev) => ({
          ...prev,
          x: nextLeft,
          y: nextTop,
        }));
        canvas.requestRenderAll();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        pushHistory('Nudge Object');
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [
    canvas,
    activeTool,
    documentName,
    docTabs,
    curveEditState.selectedNodeCount,
    fullScreenPreviewUrl,
    showFountainFillModal,
    powerClipPicking,
    fitTextPicking,
    handleCopy,
    handleCut,
    handlePaste,
    handlePasteInView,
    handleDuplicate,
    handleRepeat,
    handleSelectAll,
    handleGroup,
    handleUngroup,
    handleUngroupAll,
    handleEnterGroupEdit,
    handleExitGroupEdit,
    handleToggleBold,
    handleAlign,
    handleExitFocusMode,
    handleDelete,
    handleUndo,
    handleRedo,
    pageConfig,
    handleConvertToCurves,
    handleBreakApart,
    handleCreateSymmetry,
    handleFinishSymmetry,
    handleOpenProperties,
    handleFullScreenPreview,
    handleZoomToFitObjects,
    pushHistory,
    showToast,
  ]);

  // Update object properties in Fabric
  const handleUpdateProperties = useCallback(
    (newProps: Partial<PropertyState>) => {
      setProperties((prev) => ({ ...prev, ...newProps }));

      if (newProps.fill !== undefined) {
        setCurrentFill(newProps.fill);
        recordDocumentColor(newProps.fill);
      }
      if (newProps.stroke !== undefined) {
        setCurrentStroke(newProps.stroke);
        recordDocumentColor(newProps.stroke);
      }

      if (!selectedObject || !canvas) return;

      // Handle multi-selection batch property updates
      if (selectedObject.type === 'activeselection') {
        const sel = selectedObject as fabric.ActiveSelection;
        if (newProps.x !== undefined) sel.set('left', newProps.x);
        if (newProps.y !== undefined) sel.set('top', newProps.y);
        if (newProps.angle !== undefined) sel.set('angle', newProps.angle);
        if (newProps.fill !== undefined) {
          sel.forEachObject((obj) => obj.set('fill', newProps.fill));
          setCurrentFill(newProps.fill);
        }
        if (newProps.stroke !== undefined) {
          sel.forEachObject((obj) => obj.set('stroke', newProps.stroke));
          setCurrentStroke(newProps.stroke);
        }
        if (newProps.strokeWidth !== undefined) sel.forEachObject((obj) => obj.set('strokeWidth', newProps.strokeWidth));
        if (newProps.opacity !== undefined) sel.forEachObject((obj) => obj.set('opacity', newProps.opacity));
        sel.setCoords();
        canvas.renderAll();
        if (symmetryEditingConfigRef.current) void syncSymmetryMirrors();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
        return;
      }

      if (isTextOnPathObject(selectedObject)) {
        const patch: Record<string, any> = {};
        if (newProps.fill !== undefined) patch.fill = newProps.fill;
        if (newProps.stroke !== undefined) patch.stroke = newProps.stroke;
        if (newProps.strokeWidth !== undefined) patch.strokeWidth = newProps.strokeWidth;
        if (newProps.fontFamily !== undefined) patch.fontFamily = newProps.fontFamily;
        if (newProps.fontSize !== undefined) patch.fontSize = newProps.fontSize;
        if (newProps.fontWeight !== undefined) patch.fontWeight = newProps.fontWeight;
        if (newProps.fontStyle !== undefined) patch.fontStyle = newProps.fontStyle;
        if (newProps.charSpacing !== undefined) patch.charSpacing = newProps.charSpacing;
        if (Object.keys(patch).length > 0) {
          const rebuilt = reflowTextOnPathGroup(canvas, selectedObject as fabric.Group, patch);
          if (rebuilt) {
            setSelectedObject(rebuilt);
            socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
            return;
          }
        }
      }

      if (newProps.x !== undefined) selectedObject.set('left', newProps.x);
      if (newProps.y !== undefined) selectedObject.set('top', newProps.y);

      if (newProps.width !== undefined && selectedObject.width) {
        selectedObject.set('scaleX', newProps.width / selectedObject.width);
      }
      if (newProps.height !== undefined && selectedObject.height) {
        selectedObject.set('scaleY', newProps.height / selectedObject.height);
      }
      if (newProps.angle !== undefined) selectedObject.set('angle', newProps.angle);
      if (newProps.fill !== undefined) {
        selectedObject.set('fill', newProps.fill);
        setCurrentFill(newProps.fill);
      }
      if (newProps.stroke !== undefined) {
        selectedObject.set('stroke', newProps.stroke);
        setCurrentStroke(newProps.stroke);
      }
      if (newProps.strokeWidth !== undefined) selectedObject.set('strokeWidth', newProps.strokeWidth);
      if (newProps.strokeDashArray !== undefined) selectedObject.set('strokeDashArray', newProps.strokeDashArray);
      if (newProps.opacity !== undefined) selectedObject.set('opacity', newProps.opacity);

      if (newProps.rx !== undefined) (selectedObject as any).set({ rx: newProps.rx, ry: newProps.ry });
      if (newProps.fontFamily !== undefined) (selectedObject as any).set('fontFamily', newProps.fontFamily);
      if (newProps.fontSize !== undefined) (selectedObject as any).set('fontSize', newProps.fontSize);
      if (newProps.fontWeight !== undefined) (selectedObject as any).set('fontWeight', newProps.fontWeight);
      if (newProps.fontStyle !== undefined) (selectedObject as any).set('fontStyle', newProps.fontStyle);
      if (newProps.underline !== undefined) (selectedObject as any).set('underline', newProps.underline);
      if (newProps.linethrough !== undefined) (selectedObject as any).set('linethrough', newProps.linethrough);
      if (newProps.textAlign !== undefined) (selectedObject as any).set('textAlign', newProps.textAlign);
      if (newProps.charSpacing !== undefined) (selectedObject as any).set('charSpacing', newProps.charSpacing);
      if (newProps.lineHeight !== undefined) (selectedObject as any).set('lineHeight', newProps.lineHeight);
      if (newProps.textBackgroundColor !== undefined) (selectedObject as any).set('textBackgroundColor', newProps.textBackgroundColor);

      selectedObject.setCoords();
      canvas.renderAll();
      if (symmetryEditingConfigRef.current) void syncSymmetryMirrors();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
    },
    [selectedObject, canvas, recordDocumentColor, syncSymmetryMirrors]
  );

  // Sample fill and stroke colors from canvas object without mutating any previously selected object
  const handleSampleColors = useCallback(
    (fill: string, stroke: string) => {
      setCurrentFill(fill);
      setCurrentStroke(stroke);
      setProperties((prev) => ({ ...prev, fill, stroke }));
      if (fill && fill !== 'transparent') {
        recordDocumentColor(fill);
      }
      if (stroke && stroke !== 'transparent') {
        recordDocumentColor(stroke);
      }
      const fillLabel = fill === 'transparent' ? 'None' : fill.toUpperCase();
      const strokeLabel = stroke === 'transparent' ? 'None' : stroke.toUpperCase();
      showToast(`Sampled Fill: ${fillLabel} | Stroke: ${strokeLabel}`);
    },
    [recordDocumentColor, showToast]
  );

  // Fill / Stroke selection from Color Palette & Bottom Document Palette
  const handleSelectFill = (color: string) => {
    setCurrentFill(color);
    recordDocumentColor(color);
    if (selectedObject && canvas) {
      if (isTextOnPathObject(selectedObject)) {
        const rebuilt = reflowTextOnPathGroup(canvas, selectedObject as fabric.Group, { fill: color });
        if (rebuilt) setSelectedObject(rebuilt);
      } else if (selectedObject.type === 'activeselection') {
        (selectedObject as fabric.ActiveSelection).forEachObject((obj) => {
          if (isTextOnPathObject(obj)) {
            reflowTextOnPathGroup(canvas, obj as fabric.Group, { fill: color });
          } else {
            obj.set('fill', color);
          }
        });
      } else {
        selectedObject.set('fill', color);
      }
      setProperties((prev) => ({ ...prev, fill: color }));
      canvas.renderAll();
      if (symmetryEditingConfigRef.current) void syncSymmetryMirrors();
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      pushHistory();
    }
  };

  const handleSelectStroke = (color: string) => {
    setCurrentStroke(color);
    recordDocumentColor(color);
    if (selectedObject && canvas) {
      if (isTextOnPathObject(selectedObject)) {
        const curSw = ((selectedObject as any).textOnPathData?.strokeWidth || 0) > 0
          ? (selectedObject as any).textOnPathData.strokeWidth
          : color === 'transparent' ? 0 : 1;
        const rebuilt = reflowTextOnPathGroup(canvas, selectedObject as fabric.Group, {
          stroke: color,
          strokeWidth: color === 'transparent' ? 0 : curSw,
        });
        if (rebuilt) setSelectedObject(rebuilt);
      } else if (selectedObject.type === 'activeselection') {
        (selectedObject as fabric.ActiveSelection).forEachObject((obj) => {
          if (isTextOnPathObject(obj)) {
            reflowTextOnPathGroup(canvas, obj as fabric.Group, { stroke: color });
          } else {
            obj.set('stroke', color);
          }
        });
      } else {
        selectedObject.set('stroke', color);
      }
      setProperties((prev) => ({ ...prev, stroke: color }));
      canvas.renderAll();
      if (symmetryEditingConfigRef.current) void syncSymmetryMirrors();
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      pushHistory();
    }
  };

  // Object transform shortcuts
  const handleRotate = (deltaAngle: number) => {
    if (!selectedObject || !canvas) return;
    const currentAngle = selectedObject.angle || 0;
    const newAngle = (currentAngle + deltaAngle) % 360;
    selectedObject.set('angle', newAngle);
    selectedObject.setCoords();
    setProperties((prev) => ({ ...prev, angle: newAngle }));
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory();
  };

  const handleFlipH = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    selectedObject.setCoords();
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory();
  };

  const handleFlipV = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    selectedObject.setCoords();
    canvas.renderAll();
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    pushHistory();
  };



  // PowerClip Implementation (Exact CorelDRAW Sub-pixel Geometry & Frame Clipping)
  const createPowerClip = useCallback(
    async (content: fabric.FabricObject, container: fabric.FabricObject, isFromEditMode = false) => {
      if (!canvas) return;
      try {
        ensureObjectId(content, 'Content');
        ensureObjectId(container, 'PowerClip Frame');

        // Clone both objects to maintain independent state
        const [containerClone, contentClone] = await Promise.all([
          container.clone(),
          content.clone(),
        ]);

        // Auto-center content inside the container frame whenever new PowerClip is created
        if (!isFromEditMode) {
          const containerCenter = container.getCenterPoint();
          contentClone.setPositionByOrigin(containerCenter, 'center', 'center');
          contentClone.setCoords();
        }

        // Clip contentClone using container's geometry sent to contentClone plane
        const clipMask = await container.clone();
        clipMask.set({
          stroke: 'transparent',
          fill: 'black',
        });
        fabric.util.sendObjectToPlane(clipMask, undefined, contentClone.calcTransformMatrix());
        contentClone.clipPath = clipMask;

        // Create the group from the clones
        const powerClipGroup = new fabric.Group([containerClone, contentClone], {
          subTargetCheck: true,
        });

        (powerClipGroup as any).isPowerClip = true;
        (powerClipGroup as any).customType = 'powerclip';
        ensureObjectId(powerClipGroup, `PowerClip (${getObjectLabel(container)})`);

        canvas.remove(content);
        canvas.remove(container);
        canvas.add(powerClipGroup);
        canvas.setActiveObject(powerClipGroup);
        canvas.renderAll();
        setSelectedObject(powerClipGroup);
        pushHistory();
        socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      } catch (err) {
        console.error('Failed to create PowerClip', err);
      }
    },
    [canvas, pushHistory]
  );

  const handlePowerClipPlace = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      alert('Please select an object first to place inside a PowerClip frame.');
      return;
    }

    if (activeObj.type === 'activeselection') {
      const sel = activeObj as fabric.ActiveSelection;
      const objects = sel.getObjects();
      if (objects.length >= 2) {
        const container = objects[0];
        const content = objects[1];
        canvas.discardActiveObject();
        createPowerClip(content, container);
        return;
      }
    }

    powerClipSourceRef.current = activeObj;
    setPowerClipPicking(true);
  }, [canvas, createPowerClip]);

  const handlePickPowerClipContainer = useCallback(
    (target: fabric.FabricObject) => {
      if (!powerClipSourceRef.current || !canvas) return;
      if (target === powerClipSourceRef.current) return;
      const source = powerClipSourceRef.current;
      setPowerClipPicking(false);
      powerClipSourceRef.current = null;
      createPowerClip(source, target);
    },
    [canvas, createPowerClip]
  );

  const handlePowerClipExtract = useCallback(async () => {
    if (!canvas || !selectedObject) return;
    let target = selectedObject as any;
    if (target.group && (target.group.isPowerClip || target.group.customType === 'powerclip')) {
      target = target.group;
    }
    const isPC = target.isPowerClip || target.customType === 'powerclip';
    if (!isPC || target.type !== 'group') {
      alert('Please select a PowerClip object to extract its contents.');
      return;
    }

    try {
      const group = target as fabric.Group;
      const objects = group.getObjects();
      if (objects.length < 2) return;

      const containerObj = objects[0];
      const contentObj = objects[1];

      const cMatrix = containerObj.calcTransformMatrix();
      const cDecomp = fabric.util.qrDecompose(cMatrix);
      const restoredContainer = await containerObj.clone();
      restoredContainer.set({
        left: cDecomp.translateX,
        top: cDecomp.translateY,
        originX: 'center',
        originY: 'center',
        scaleX: cDecomp.scaleX,
        scaleY: cDecomp.scaleY,
        angle: cDecomp.angle,
        selectable: true,
        evented: true,
      });

      canvas.remove(group);
      ensureObjectId(restoredContainer, 'Frame');
      canvas.add(restoredContainer);

      let lastRestoredContent: fabric.FabricObject | null = null;

      if ((contentObj as any).isCombinedContentGroup && contentObj.type === 'group') {
        const subObjs = (contentObj as fabric.Group).getObjects();
        for (let i = 0; i < subObjs.length; i++) {
          const sub = subObjs[i];
          const subMatrix = sub.calcTransformMatrix();
          const subDecomp = fabric.util.qrDecompose(subMatrix);
          const restoredSub = await sub.clone();
          restoredSub.set({
            left: subDecomp.translateX + 20,
            top: subDecomp.translateY + 20,
            originX: 'center',
            originY: 'center',
            scaleX: subDecomp.scaleX,
            scaleY: subDecomp.scaleY,
            angle: subDecomp.angle,
            clipPath: undefined,
            selectable: true,
            evented: true,
          });
          ensureObjectId(restoredSub, `Extracted Content ${i + 1}`);
          canvas.add(restoredSub);
          lastRestoredContent = restoredSub;
        }
      } else {
        const contentMatrix = contentObj.calcTransformMatrix();
        const contentDecomp = fabric.util.qrDecompose(contentMatrix);
        const restoredContent = await contentObj.clone();
        restoredContent.set({
          left: contentDecomp.translateX + 20,
          top: contentDecomp.translateY + 20,
          originX: 'center',
          originY: 'center',
          scaleX: contentDecomp.scaleX,
          scaleY: contentDecomp.scaleY,
          angle: contentDecomp.angle,
          clipPath: undefined,
          selectable: true,
          evented: true,
        });
        ensureObjectId(restoredContent, 'Extracted Content');
        canvas.add(restoredContent);
        lastRestoredContent = restoredContent;
      }

      if (lastRestoredContent) {
        canvas.setActiveObject(lastRestoredContent);
        setSelectedObject(lastRestoredContent);
      }
      canvas.renderAll();
      pushHistory();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
    } catch (err) {
      console.error('Failed to extract PowerClip', err);
    }
  }, [canvas, selectedObject, pushHistory]);

  const handlePowerClipEdit = useCallback(async (targetGroup?: fabric.FabricObject) => {
    if (!canvas) return;
    let group = (targetGroup || selectedObject || canvas.getActiveObject()) as fabric.Group | null;
    if (group && (group as any).group && (((group as any).group.isPowerClip) || ((group as any).group.customType === 'powerclip'))) {
      group = (group as any).group as fabric.Group;
    }
    if (!group) return;
    const isPC = (group as any).isPowerClip || (group as any).customType === 'powerclip';
    if (!isPC || group.type !== 'group') {
      alert('Please select a PowerClip object to edit.');
      return;
    }

    try {
      const objects = group.getObjects();
      if (objects.length < 2) return;

      const containerObj = objects[0];
      const contentObj = objects[1];

      // Unpack at world coordinates with qrDecompose
      const cMatrix = containerObj.calcTransformMatrix();
      const cDecomp = fabric.util.qrDecompose(cMatrix);
      const restoredContainer = await containerObj.clone();
      restoredContainer.set({
        left: cDecomp.translateX,
        top: cDecomp.translateY,
        originX: 'center',
        originY: 'center',
        scaleX: cDecomp.scaleX,
        scaleY: cDecomp.scaleY,
        angle: cDecomp.angle,
        selectable: false,
        evented: false,
      });
      (restoredContainer as any).isPowerClipFrame = true;
      (restoredContainer as any).originalStrokeDashArray = restoredContainer.strokeDashArray || [];
      restoredContainer.set('strokeDashArray', [4, 4]);

      canvas.remove(group);
      ensureObjectId(restoredContainer, 'Frame (Editing)');
      canvas.add(restoredContainer);

      const restoredContentList: fabric.FabricObject[] = [];

      // If content was a combined group of multiple items (e.g. copied or added shapes)
      if ((contentObj as any).isCombinedContentGroup && contentObj.type === 'group') {
        const subObjs = (contentObj as fabric.Group).getObjects();
        for (let i = 0; i < subObjs.length; i++) {
          const sub = subObjs[i];
          const subMatrix = sub.calcTransformMatrix();
          const subDecomp = fabric.util.qrDecompose(subMatrix);
          const restoredSub = await sub.clone();
          restoredSub.set({
            left: subDecomp.translateX,
            top: subDecomp.translateY,
            originX: 'center',
            originY: 'center',
            scaleX: subDecomp.scaleX,
            scaleY: subDecomp.scaleY,
            angle: subDecomp.angle,
            clipPath: undefined,
            selectable: true,
            evented: true,
          });
          (restoredSub as any).isPowerClipContent = true;
          ensureObjectId(restoredSub, `Content ${i + 1} (Editing)`);
          canvas.add(restoredSub);
          restoredContentList.push(restoredSub);
        }
      } else {
        const contentMatrix = contentObj.calcTransformMatrix();
        const contentDecomp = fabric.util.qrDecompose(contentMatrix);
        const restoredContent = await contentObj.clone();
        restoredContent.set({
          left: contentDecomp.translateX,
          top: contentDecomp.translateY,
          originX: 'center',
          originY: 'center',
          scaleX: contentDecomp.scaleX,
          scaleY: contentDecomp.scaleY,
          angle: contentDecomp.angle,
          clipPath: undefined,
          selectable: true,
          evented: true,
        });
        (restoredContent as any).isPowerClipContent = true;
        ensureObjectId(restoredContent, 'Content (Editing)');
        canvas.add(restoredContent);
        restoredContentList.push(restoredContent);
      }

      if (restoredContentList.length === 1) {
        canvas.setActiveObject(restoredContentList[0]);
        setSelectedObject(restoredContentList[0]);
      } else if (restoredContentList.length > 1) {
        const sel = new fabric.ActiveSelection(restoredContentList, { canvas });
        canvas.setActiveObject(sel);
        setSelectedObject(sel);
      }

      canvas.renderAll();
      setPowerClipEditingObj(restoredContainer);
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
    } catch (err) {
      console.error('Failed to enter PowerClip edit mode', err);
    }
  }, [canvas, selectedObject]);

  const handlePowerClipFinish = useCallback(() => {
    if (!canvas || !powerClipEditingObj) return;
    const container = powerClipEditingObj;
    const allObjs = canvas.getObjects();

    // Collect all content objects belonging to this PowerClip editing session
    let contentObjects = allObjs.filter(
      (o) => o !== container && (o as any).isPowerClipContent
    );

    if (contentObjects.length === 0) {
      const active = canvas.getActiveObject();
      if (active && active !== container) {
        contentObjects = [active];
      } else {
        const others = allObjs.filter((o) => o !== container);
        if (others.length > 0) {
          contentObjects = others;
        }
      }
    }

    if (contentObjects.length === 0) {
      if ((container as any).originalStrokeDashArray) {
        container.set('strokeDashArray', (container as any).originalStrokeDashArray);
      } else {
        container.set('strokeDashArray', []);
      }
      container.set({ selectable: true, evented: true });
      delete (container as any).isPowerClipFrame;
      setPowerClipEditingObj(null);
      return;
    }

    if ((container as any).originalStrokeDashArray) {
      container.set('strokeDashArray', (container as any).originalStrokeDashArray);
    } else {
      container.set('strokeDashArray', []);
    }
    container.set({ selectable: true, evented: true });
    delete (container as any).isPowerClipFrame;

    let finalContent: fabric.FabricObject;
    if (contentObjects.length === 1) {
      finalContent = contentObjects[0];
      delete (finalContent as any).isPowerClipContent;
    } else {
      canvas.discardActiveObject();
      contentObjects.forEach((o) => {
        delete (o as any).isPowerClipContent;
        canvas.remove(o);
      });
      const combinedGroup = new fabric.Group(contentObjects, {
        subTargetCheck: true,
      });
      (combinedGroup as any).isCombinedContentGroup = true;
      ensureObjectId(combinedGroup, 'PowerClip Contents');
      canvas.add(combinedGroup);
      finalContent = combinedGroup;
    }

    setPowerClipEditingObj(null);
    createPowerClip(finalContent, container, true);
  }, [canvas, powerClipEditingObj, createPowerClip]);

  // Page config update & Multi-page Layout Management
  const handleUpdatePageConfig = (partial: Partial<PageConfig>, applyToAll: boolean = false) => {
    setPages((prev) => {
      if (applyToAll) {
        return prev.map((p) => ({ ...p, ...partial }));
      }
      const docWideUpdates: Partial<PageConfig> = {};
      if ('nudgeDistance' in partial) docWideUpdates.nudgeDistance = partial.nudgeDistance;
      if ('autofitMargin' in partial) docWideUpdates.autofitMargin = partial.autofitMargin;
      const hasDocWide = Object.keys(docWideUpdates).length > 0;
      return prev.map((p, idx) => {
        if (idx === activePageIndex) return { ...p, ...partial };
        return hasDocWide ? { ...p, ...docWideUpdates } : p;
      });
    });
  };

  const handleAutofitPage = useCallback(
    (marginPxOverride?: number) => {
      if (!canvas) return;
      if (groupEditStackRef.current.length > 0) {
        handleExitGroupEdit(true);
      }
      const marginPx = Math.max(
        0,
        marginPxOverride !== undefined ? marginPxOverride : pageConfig.autofitMargin ?? 0
      );
      const objs = canvas
        .getObjects()
        .filter((o) => o.visible !== false && !(o as any).excludeFromExport);
      if (objs.length === 0) {
        showToast('No objects on page to autofit');
        return;
      }

      const prevActive = canvas.getActiveObject();
      if (prevActive && prevActive.type === 'activeselection') {
        canvas.discardActiveObject();
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      objs.forEach((o) => {
        o.setCoords();
        const b = o.getBoundingRect();
        minX = Math.min(minX, b.left);
        minY = Math.min(minY, b.top);
        maxX = Math.max(maxX, b.left + b.width);
        maxY = Math.max(maxY, b.top + b.height);
      });

      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        return;
      }

      const contentW = Math.max(1, maxX - minX);
      const contentH = Math.max(1, maxY - minY);
      const newWidth = Math.max(10, Number((contentW + marginPx * 2).toFixed(2)));
      const newHeight = Math.max(10, Number((contentH + marginPx * 2).toFixed(2)));

      const dx = marginPx - minX;
      const dy = marginPx - minY;

      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        objs.forEach((o) => {
          o.set({
            left: (o.left ?? 0) + dx,
            top: (o.top ?? 0) + dy,
          });
          o.setCoords();
        });
      }

      handleUpdatePageConfig({
        width: newWidth,
        height: newHeight,
        preset: 'Custom',
        orientation: newWidth >= newHeight ? 'landscape' : 'portrait',
        autofitMargin: marginPx,
      });

      canvas.requestRenderAll();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'modify');
      pushHistory('Autofit Page');

      setTimeout(() => {
        handleZoomMode('to_page');
      }, 30);

      const wDisp = pxToUnit(newWidth, pageConfig.units);
      const hDisp = pxToUnit(newHeight, pageConfig.units);
      const unitSym = UNITS_DATA[pageConfig.units]?.symbol || 'px';
      showToast(`Page fitted to ${wDisp} × ${hDisp} ${unitSym}`);
    },
    [
      canvas,
      pageConfig.autofitMargin,
      pageConfig.units,
      handleExitGroupEdit,
      pushHistory,
      showToast,
      handleZoomMode,
    ]
  );

  const handleSelectPage = useCallback(async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pages.length || targetIndex === activePageIndex) return;
    if (canvas) {
      pageCanvasesRef.current[activePageIndex] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );
      const targetJson = pageCanvasesRef.current[targetIndex];
      canvas.discardActiveObject();
      if (targetJson) {
        try {
          await canvas.loadFromJSON(JSON.parse(targetJson));
        } catch {
          canvas.clear();
        }
      } else {
        canvas.clear();
      }
      canvas.requestRenderAll();
      setSelectedObject(null);
      setHasCanvasObjects(canvas.getObjects().length > 0);
    }
    setActivePageIndex(targetIndex);
  }, [canvas, pages.length, activePageIndex]);

  const handleAddPage = useCallback(async () => {
    if (canvas) {
      pageCanvasesRef.current[activePageIndex] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );
      canvas.discardActiveObject();
      canvas.clear();
      canvas.requestRenderAll();
      setSelectedObject(null);
      setHasCanvasObjects(false);
    }
    const newPageNum = pages.length + 1;
    const newPage: PageConfig = {
      ...pageConfig,
      name: `Page ${newPageNum}`,
    };
    const nextIdx = pages.length;
    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(nextIdx);
  }, [canvas, activePageIndex, pages.length, pageConfig]);

  const handleOpenInsertPageModal = () => {
    setInsertPageCount(1);
    setInsertPagePlacement('after');
    setInsertPageTarget(activePageIndex + 1);
    setShowInsertPageModal(true);
  };

  const handleApplyInsertPages = async () => {
    const count = Math.max(1, Math.min(50, Math.round(insertPageCount || 1)));
    const targetZero = Math.max(0, Math.min(pages.length - 1, Math.round((insertPageTarget || 1) - 1)));
    const insertIdx = insertPagePlacement === 'before' ? targetZero : targetZero + 1;

    if (canvas) {
      pageCanvasesRef.current[activePageIndex] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );
    }

    // Shift stored page canvases >= insertIdx
    const updatedCanvases: Record<number, string> = {};
    Object.entries(pageCanvasesRef.current).forEach(([k, v]) => {
      const idx = Number(k);
      updatedCanvases[idx >= insertIdx ? idx + count : idx] = v;
    });
    pageCanvasesRef.current = updatedCanvases;

    const newPages: PageConfig[] = Array.from({ length: count }, (_, i) => ({
      ...pageConfig,
      name: `Page ${pages.length + i + 1}`,
    }));

    setPages((prev) => {
      const next = [...prev];
      next.splice(insertIdx, 0, ...newPages);
      return next;
    });

    if (canvas) {
      canvas.discardActiveObject();
      canvas.clear();
      canvas.requestRenderAll();
      setSelectedObject(null);
      setHasCanvasObjects(false);
    }
    setActivePageIndex(insertIdx);
    setShowInsertPageModal(false);
    showToast(`Inserted ${count} ${count === 1 ? 'page' : 'pages'}`);
  };

  const handleOpenDuplicatePageModal = () => {
    setDupPagePlacement('after');
    setDupCopyContents(true);
    setShowDuplicatePageModal(true);
  };

  const handleApplyDuplicatePage = async () => {
    const insertIdx = dupPagePlacement === 'before' ? activePageIndex : activePageIndex + 1;
    let currentJson = '';
    if (canvas) {
      currentJson = JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any));
      pageCanvasesRef.current[activePageIndex] = currentJson;
    }

    const updatedCanvases: Record<number, string> = {};
    Object.entries(pageCanvasesRef.current).forEach(([k, v]) => {
      const idx = Number(k);
      updatedCanvases[idx >= insertIdx ? idx + 1 : idx] = v;
    });
    if (dupCopyContents && currentJson) {
      updatedCanvases[insertIdx] = currentJson;
    } else {
      delete updatedCanvases[insertIdx];
    }
    pageCanvasesRef.current = updatedCanvases;

    const duplicatedPage: PageConfig = {
      ...pageConfig,
      name: `${pageConfig.name} (Copy)`,
    };
    setPages((prev) => {
      const next = [...prev];
      next.splice(insertIdx, 0, duplicatedPage);
      return next;
    });

    if (canvas && !dupCopyContents) {
      canvas.discardActiveObject();
      canvas.clear();
      canvas.requestRenderAll();
      setSelectedObject(null);
      setHasCanvasObjects(false);
    }
    setActivePageIndex(insertIdx);
    setShowDuplicatePageModal(false);
    showToast(`Duplicated "${pageConfig.name}"`);
  };

  const handleOpenRenamePageModal = () => {
    setRenamePageValue(pageConfig.name || `Page ${activePageIndex + 1}`);
    setShowRenamePageModal(true);
  };

  const handleApplyRenamePage = () => {
    const trimmed = renamePageValue.trim();
    if (!trimmed) return;
    handleUpdatePageConfig({ name: trimmed });
    setShowRenamePageModal(false);
    showToast(`Renamed page to "${trimmed}"`);
  };

  const handleOpenDeletePageModal = () => {
    if (pages.length <= 1) return;
    setDeletePageTarget(activePageIndex + 1);
    setShowDeletePageModal(true);
  };

  const handleApplyDeletePage = async () => {
    if (pages.length <= 1) return;
    const delIdx = Math.max(0, Math.min(pages.length - 1, Math.round((deletePageTarget || 1) - 1)));

    if (canvas) {
      pageCanvasesRef.current[activePageIndex] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );
    }

    const updatedCanvases: Record<number, string> = {};
    Object.entries(pageCanvasesRef.current).forEach(([k, v]) => {
      const idx = Number(k);
      if (idx < delIdx) updatedCanvases[idx] = v;
      else if (idx > delIdx) updatedCanvases[idx - 1] = v;
    });
    pageCanvasesRef.current = updatedCanvases;

    const remainingCount = pages.length - 1;
    const nextActive =
      delIdx < activePageIndex
        ? activePageIndex - 1
        : Math.min(activePageIndex, remainingCount - 1);

    setPages((prev) => prev.filter((_, i) => i !== delIdx));

    if (canvas && delIdx === activePageIndex) {
      const nextJson = updatedCanvases[nextActive];
      canvas.discardActiveObject();
      if (nextJson) {
        try {
          await canvas.loadFromJSON(JSON.parse(nextJson));
        } catch {
          canvas.clear();
        }
      } else {
        canvas.clear();
      }
      canvas.requestRenderAll();
      setSelectedObject(null);
      setHasCanvasObjects(canvas.getObjects().length > 0);
    }

    setActivePageIndex(nextActive);
    setShowDeletePageModal(false);
    showToast(`Deleted Page ${delIdx + 1}`);
  };

  const handleOpenGoToPageModal = () => {
    setGoToPageValue(activePageIndex + 1);
    setShowGoToPageModal(true);
  };

  const handleApplyGoToPage = () => {
    const idx = Math.max(0, Math.min(pages.length - 1, Math.round((goToPageValue || 1) - 1)));
    handleSelectPage(idx);
    setShowGoToPageModal(false);
  };

  const formatPageNumberText = useCallback(
    (oneBasedPage: number) => {
      const num = Math.max(1, pageNumStartAt + oneBasedPage - 1);
      const toRoman = (n: number): string => {
        const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let rem = n;
        let out = '';
        for (let i = 0; i < vals.length; i++) {
          while (rem >= vals[i]) {
            out += syms[i];
            rem -= vals[i];
          }
        }
        return out;
      };
      const toAlpha = (n: number): string => {
        let rem = n;
        let out = '';
        while (rem > 0) {
          rem -= 1;
          out = String.fromCharCode(65 + (rem % 26)) + out;
          rem = Math.floor(rem / 26);
        }
        return out;
      };
      let core = String(num);
      if (pageNumStyle === 'roman_upper') core = toRoman(num);
      else if (pageNumStyle === 'roman_lower') core = toRoman(num).toLowerCase();
      else if (pageNumStyle === 'alpha_upper') core = toAlpha(num);
      else if (pageNumStyle === 'alpha_lower') core = toAlpha(num).toLowerCase();
      return `${pageNumPrefix}${core}`;
    },
    [pageNumStartAt, pageNumStyle, pageNumPrefix]
  );

  const createPageNumberFabricObj = useCallback(
    (pg: PageConfig, oneBasedIndex: number) => {
      const textStr = formatPageNumberText(oneBasedIndex);
      const margin = 28;
      let left = pg.width / 2;
      let originX: 'left' | 'center' | 'right' = 'center';
      if (pageNumPosition.endsWith('left')) {
        left = margin;
        originX = 'left';
      } else if (pageNumPosition.endsWith('right')) {
        left = pg.width - margin;
        originX = 'right';
      }
      const isTop = pageNumPosition.startsWith('top');
      const top = isTop ? margin : pg.height - margin - pageNumFontSize;
      const tb = new fabric.IText(textStr, {
        left,
        top,
        originX,
        fontFamily: 'Montserrat',
        fontSize: pageNumFontSize,
        fill: '#1f2937',
        fontWeight: 'normal',
      });
      (tb as any).isPageNumber = true;
      ensureObjectId(tb, `Page Number (${textStr})`);
      return tb;
    },
    [formatPageNumberText, pageNumPosition, pageNumFontSize]
  );

  const handleInsertPageNumber = useCallback(
    (mode: 'active' | 'all' | 'odd' | 'even') => {
      if (!canvas) return;
      if (mode === 'even' && pages.length < 2) {
        showToast('No even pages in document yet — add Page 2 or more first');
        return;
      }

      const matchesMode = (idx: number) => {
        if (mode === 'active') return idx === activePageIndex;
        if (mode === 'all') return true;
        if (mode === 'odd') return (idx + 1) % 2 === 1;
        return (idx + 1) % 2 === 0;
      };

      let count = 0;
      pages.forEach((pg, idx) => {
        if (!matchesMode(idx)) return;
        count += 1;
        const numObj = createPageNumberFabricObj(pg, idx + 1);
        if (idx === activePageIndex) {
          canvas
            .getObjects()
            .filter((o: any) => o.isPageNumber)
            .forEach((o) => canvas.remove(o));
          canvas.add(numObj);
          canvas.setActiveObject(numObj);
        } else {
          const existingRaw = pageCanvasesRef.current[idx];
          let parsed: any = { version: '6.0.0', objects: [] };
          if (existingRaw) {
            try {
              parsed = JSON.parse(existingRaw);
            } catch {}
          }
          const filtered = Array.isArray(parsed.objects)
            ? parsed.objects.filter((o: any) => !o.isPageNumber)
            : [];
          filtered.push(numObj.toObject(SERIALIZE_PROPERTIES as any));
          parsed.objects = filtered;
          pageCanvasesRef.current[idx] = JSON.stringify(parsed);
        }
      });

      canvas.requestRenderAll();
      setHasCanvasObjects(canvas.getObjects().length > 0);
      pushHistory('Insert Page Number');
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      const labelMap = {
        active: 'active layer',
        all: `all ${count} page(s)`,
        odd: `${count} odd page(s)`,
        even: `${count} even page(s)`,
      };
      showToast(`Inserted page number on ${labelMap[mode]}`);
    },
    [canvas, pages, activePageIndex, createPageNumberFabricObj, pushHistory, showToast]
  );

  const handleApplyBorderAndGrommet = useCallback(() => {
    if (!canvas) return;
    const margin = Math.max(0, bgMarginPx);
    const w = Math.max(20, pageConfig.width - margin * 2);
    const h = Math.max(20, pageConfig.height - margin * 2);

    // Remove previous Border and Grommet group if present
    canvas
      .getObjects()
      .filter((o: any) => o.isBorderAndGrommet)
      .forEach((o) => canvas.remove(o));

    const parts: fabric.FabricObject[] = [];
    const borderRect = new fabric.Rect({
      left: margin,
      top: margin,
      width: w,
      height: h,
      fill: 'transparent',
      stroke: bgStrokeColor,
      strokeWidth: Math.max(0.5, bgStrokeWidth),
    });
    parts.push(borderRect);

    const radius = Math.max(2, bgGrommetDiameter / 2);
    const grommetInset = margin + Math.max(radius + 4, 10);
    const leftX = grommetInset;
    const rightX = pageConfig.width - grommetInset;
    const topY = grommetInset;
    const bottomY = pageConfig.height - grommetInset;

    const addGrommet = (cx: number, cy: number) => {
      const outer = new fabric.Circle({
        left: cx - radius,
        top: cy - radius,
        radius,
        fill: '#ffffff',
        stroke: bgGrommetColor,
        strokeWidth: Math.max(1.5, radius * 0.35),
      });
      parts.push(outer);
    };

    const hCount = Math.max(0, Math.min(20, Math.round(bgHorizGrommets)));
    const vCount = Math.max(0, Math.min(20, Math.round(bgVertGrommets)));

    if (hCount === 1) {
      addGrommet(pageConfig.width / 2, topY);
      addGrommet(pageConfig.width / 2, bottomY);
    } else if (hCount >= 2) {
      for (let i = 0; i < hCount; i++) {
        const x = leftX + ((rightX - leftX) * i) / (hCount - 1);
        addGrommet(x, topY);
        addGrommet(x, bottomY);
      }
    }

    if (vCount > 2) {
      for (let j = 1; j < vCount - 1; j++) {
        const y = topY + ((bottomY - topY) * j) / (vCount - 1);
        addGrommet(leftX, y);
        addGrommet(rightX, y);
      }
    }

    const group = new fabric.Group(parts, {});
    (group as any).isBorderAndGrommet = true;
    ensureObjectId(group, 'Border and Grommet');
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    setSelectedObject(group);
    setHasCanvasObjects(canvas.getObjects().length > 0);
    pushHistory('Border and Grommet');
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'add');
    setShowBorderGrommetModal(false);
    showToast('Added Border and Grommet to page');
  }, [
    canvas,
    bgMarginPx,
    pageConfig.width,
    pageConfig.height,
    bgStrokeColor,
    bgStrokeWidth,
    bgGrommetDiameter,
    bgGrommetColor,
    bgHorizGrommets,
    bgVertGrommets,
    pushHistory,
    showToast,
  ]);

  // Bitmap Menu Handlers (Convert to Bitmap, Straighten Image, Image Adjustment Lab, Quick Color)
  const rasterizeObjectToDataUrl = useCallback(
    async (
      target: fabric.FabricObject,
      dpiVal: number,
      colorMode: 'rgb' | 'cmyk' | 'grayscale' | 'bw',
      transparentBg: boolean
    ): Promise<{ dataUrl: string; bounds: { left: number; top: number; width: number; height: number } }> => {
      const bounds = target.getBoundingRect();
      const multiplier = Math.min(4, Math.max(1, dpiVal / 96));
      const rawUrl = target.toDataURL({ multiplier, format: 'png' });

      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = rawUrl;
      });

      const off = document.createElement('canvas');
      off.width = Math.max(1, imgEl.naturalWidth || Math.round(bounds.width * multiplier));
      off.height = Math.max(1, imgEl.naturalHeight || Math.round(bounds.height * multiplier));
      const ctx = off.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = bitmapAntiAlias;
        if (!transparentBg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, off.width, off.height);
        }
        ctx.drawImage(imgEl, 0, 0, off.width, off.height);

        if (colorMode === 'grayscale' || colorMode === 'bw') {
          const imgData = ctx.getImageData(0, 0, off.width, off.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const val = colorMode === 'bw' ? (lum >= 128 ? 255 : 0) : lum;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }

      return { dataUrl: off.toDataURL('image/png'), bounds };
    },
    [bitmapAntiAlias]
  );

  const handleApplyConvertToBitmap = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    try {
      const { dataUrl, bounds } = await rasterizeObjectToDataUrl(
        activeObj,
        bitmapDpi,
        bitmapColorMode,
        bitmapTransparentBg
      );
      const bmp = await fabric.FabricImage.fromURL(dataUrl);
      const scaleX = bounds.width / Math.max(1, bmp.width || 1);
      const scaleY = bounds.height / Math.max(1, bmp.height || 1);
      bmp.set({
        left: bounds.left,
        top: bounds.top,
        scaleX,
        scaleY,
      });
      ensureObjectId(bmp, `Bitmap (${bitmapDpi} DPI)`);

      if (activeObj.type === 'activeselection') {
        const sel = activeObj as fabric.ActiveSelection;
        sel.forEachObject((o) => canvas.remove(o));
      } else {
        canvas.remove(activeObj);
      }
      canvas.discardActiveObject();
      canvas.add(bmp);
      canvas.setActiveObject(bmp);
      canvas.requestRenderAll();
      setSelectedObject(bmp);
      setHasCanvasObjects(canvas.getObjects().length > 0);
      pushHistory('Convert to Bitmap');
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      setShowConvertBitmapModal(false);
      showToast(`Converted selection to ${bitmapDpi} DPI ${bitmapColorMode.toUpperCase()} Bitmap`);
    } catch (err) {
      console.error('Convert to Bitmap failed', err);
      showToast('Failed to convert selection to bitmap');
    }
  }, [canvas, rasterizeObjectToDataUrl, bitmapDpi, bitmapColorMode, bitmapTransparentBg, pushHistory, showToast]);

  const handleOpenStraightenModal = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    try {
      setStraightenPreviewUrl(activeObj.toDataURL({ format: 'png' }));
    } catch {
      setStraightenPreviewUrl('');
    }
    setStraightenAngle(0);
    setStraightenAutoCrop(true);
    setStraightenShowGrid(true);
    setShowStraightenModal(true);
  }, [canvas]);

  const handleApplyStraightenImage = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const delta = straightenAngle || 0;
    const center = activeObj.getCenterPoint();
    const nextAngle = ((activeObj.angle || 0) + delta) % 360;
    activeObj.set('angle', nextAngle);
    activeObj.setPositionByOrigin(center, 'center', 'center');
    activeObj.setCoords();

    if (straightenAutoCrop && Math.abs(delta) > 0.05 && activeObj.type === 'image') {
      const rad = (Math.abs(delta) * Math.PI) / 180;
      const zoomFactor = 1 + Math.sin(rad) * 0.45;
      activeObj.set({
        scaleX: (activeObj.scaleX || 1) * zoomFactor,
        scaleY: (activeObj.scaleY || 1) * zoomFactor,
      });
      activeObj.setPositionByOrigin(center, 'center', 'center');
      activeObj.setCoords();
    }

    canvas.requestRenderAll();
    setProperties((prev) => ({ ...prev, angle: nextAngle }));
    pushHistory('Straighten Image');
    socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
    setShowStraightenModal(false);
    showToast(`Straightened image by ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°`);
  }, [canvas, straightenAngle, straightenAutoCrop, pushHistory, showToast]);

  const handleOpenImageAdjustmentLab = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    try {
      setAdjPreviewUrl(activeObj.toDataURL({ format: 'png' }));
    } catch {
      setAdjPreviewUrl('');
    }
    setAdjShowOriginal(false);
    setAdjTemperature(0);
    setAdjTint(0);
    setAdjSaturation(0);
    setAdjBrightness(0);
    setAdjContrast(0);
    setAdjVibrance(0);
    setAdjGamma(1.0);
    setShowAdjLabModal(true);
  }, [canvas]);

  const handleApplyImageAdjustmentLab = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const buildFilters = () => {
      const list: any[] = [];
      if (adjBrightness !== 0) {
        list.push(new fabric.filters.Brightness({ brightness: adjBrightness / 100 }));
      }
      if (adjContrast !== 0) {
        list.push(new fabric.filters.Contrast({ contrast: adjContrast / 100 }));
      }
      if (adjSaturation !== 0) {
        list.push(new fabric.filters.Saturation({ saturation: adjSaturation / 100 }));
      }
      if (adjVibrance !== 0) {
        list.push(new fabric.filters.Vibrance({ vibrance: adjVibrance / 100 }));
      }
      if (Math.abs(adjGamma - 1.0) > 0.02) {
        const g = Math.max(0.2, Math.min(2.2, adjGamma));
        list.push(new fabric.filters.Gamma({ gamma: [g, g, g] }));
      }
      if (adjTemperature !== 0 || adjTint !== 0) {
        const t = adjTemperature / 250;
        const gShift = adjTint / 250;
        list.push(
          new fabric.filters.ColorMatrix({
            matrix: [
              1 + t, 0, 0, 0, 0,
              0, 1 + gShift, 0, 0, 0,
              0, 0, 1 - t, 0, 0,
              0, 0, 0, 1, 0,
            ],
            colorsOnly: true,
          })
        );
      }
      return list;
    };

    try {
      let targetImg: fabric.FabricImage;
      if (activeObj.type === 'image') {
        targetImg = activeObj as fabric.FabricImage;
      } else {
        const { dataUrl, bounds } = await rasterizeObjectToDataUrl(activeObj, 150, 'rgb', true);
        targetImg = await fabric.FabricImage.fromURL(dataUrl);
        targetImg.set({
          left: bounds.left,
          top: bounds.top,
          scaleX: bounds.width / Math.max(1, targetImg.width || 1),
          scaleY: bounds.height / Math.max(1, targetImg.height || 1),
        });
        ensureObjectId(targetImg, 'Adjusted Bitmap');
        if (activeObj.type === 'activeselection') {
          (activeObj as fabric.ActiveSelection).forEachObject((o) => canvas.remove(o));
        } else {
          canvas.remove(activeObj);
        }
        canvas.discardActiveObject();
        canvas.add(targetImg);
        canvas.setActiveObject(targetImg);
        setSelectedObject(targetImg);
      }

      targetImg.filters = buildFilters();
      targetImg.applyFilters();
      canvas.requestRenderAll();
      setHasCanvasObjects(canvas.getObjects().length > 0);
      pushHistory('Image Adjustment Lab');
      socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
      setShowAdjLabModal(false);
      showToast('Applied Image Adjustment Lab settings');
    } catch (err) {
      console.error('Image Adjustment Lab failed', err);
      showToast('Failed to apply image adjustments');
    }
  }, [
    canvas,
    adjBrightness,
    adjContrast,
    adjSaturation,
    adjVibrance,
    adjGamma,
    adjTemperature,
    adjTint,
    rasterizeObjectToDataUrl,
    pushHistory,
    showToast,
  ]);

  const handleBitmapGrayscale = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    if (activeObj.type === 'image') {
      const img = activeObj as fabric.FabricImage;
      img.filters = [...(img.filters || []), new fabric.filters.Grayscale()];
      img.applyFilters();
      canvas.requestRenderAll();
      pushHistory('Grayscale');
      showToast('Applied Grayscale filter');
    } else {
      activeObj.set('fill', '#475569');
      canvas.requestRenderAll();
      pushHistory('Grayscale');
      showToast('Applied Grayscale tone');
    }
  }, [canvas, pushHistory, showToast]);

  const handleBitmapInvert = useCallback(() => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    if (activeObj.type === 'image') {
      const img = activeObj as fabric.FabricImage;
      img.filters = [...(img.filters || []), new fabric.filters.Invert()];
      img.applyFilters();
      canvas.requestRenderAll();
      pushHistory('Invert Colors');
      showToast('Inverted bitmap colors');
    } else {
      const cur = typeof activeObj.fill === 'string' ? activeObj.fill : '#000000';
      const inv = cur.toLowerCase() === '#000000' ? '#ffffff' : '#000000';
      activeObj.set('fill', inv);
      canvas.requestRenderAll();
      pushHistory('Invert Colors');
      showToast('Inverted object color');
    }
  }, [canvas, pushHistory, showToast]);

  const handleBitmapCmykSeparation = useCallback(async () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      showToast('Select a bitmap image first for CMYK separation');
      return;
    }

    try {
      const sourceLabel = getObjectLabel(activeObj) || 'Bitmap';
      const result = await separateObjectToCmykPlates(activeObj);

      const [cImg, mImg, yImg, kImg] = await Promise.all([
        fabric.FabricImage.fromURL(result.cyanDataUrl),
        fabric.FabricImage.fromURL(result.magentaDataUrl),
        fabric.FabricImage.fromURL(result.yellowDataUrl),
        fabric.FabricImage.fromURL(result.blackDataUrl),
      ]);

      // Preserve the existing page completely untouched before switching to the new page
      pageCanvasesRef.current[activePageIndex] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );

      const nextIdx = pages.length;
      const cleanName = sourceLabel.replace(/\s+/g, ' ').trim().slice(0, 18) || 'Bitmap';
      const newPage: PageConfig = {
        ...pageConfig,
        name: `CMYK - ${cleanName}`,
      };

      canvas.discardActiveObject();
      canvas.clear();

      const pageW = Math.max(200, pageConfig.width || 794);
      const pageH = Math.max(200, pageConfig.height || 1123);
      const margin = Math.max(24, Math.min(pageW, pageH) * 0.055);
      const headerHeight = 32;
      const gapX = 24;
      const gapY = 34;
      const labelBand = 22;

      const cellW = Math.max(40, (pageW - margin * 2 - gapX) / 2);
      const cellH = Math.max(40, (pageH - margin * 2 - headerHeight - gapY) / 2 - labelBand);

      const headerTitle = new fabric.IText(`CMYK SEPARATION — ${sourceLabel.toUpperCase()}`, {
        left: margin,
        top: margin * 0.65,
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Inter, Arial, sans-serif',
        fill: '#1e293b',
      });
      ensureObjectId(headerTitle, 'CMYK Sheet Header');
      canvas.add(headerTitle);

      const plates: {
        img: fabric.FabricImage;
        title: string;
        swatchColor: string;
        textColor: string;
        objName: string;
        col: number;
        row: number;
      }[] = [
        {
          img: cImg,
          title: `C — Cyan (${result.coverage.c}%)`,
          swatchColor: '#00aeef',
          textColor: '#0284c7',
          objName: 'Cyan Plate (C)',
          col: 0,
          row: 0,
        },
        {
          img: mImg,
          title: `M — Magenta (${result.coverage.m}%)`,
          swatchColor: '#ec008c',
          textColor: '#be185d',
          objName: 'Magenta Plate (M)',
          col: 1,
          row: 0,
        },
        {
          img: yImg,
          title: `Y — Yellow (${result.coverage.y}%)`,
          swatchColor: '#fff200',
          textColor: '#a16207',
          objName: 'Yellow Plate (Y)',
          col: 0,
          row: 1,
        },
        {
          img: kImg,
          title: `K — Black (${result.coverage.k}%)`,
          swatchColor: '#111827',
          textColor: '#111827',
          objName: 'Black Plate (K)',
          col: 1,
          row: 1,
        },
      ];

      for (const p of plates) {
        const cellX = margin + p.col * (cellW + gapX);
        const cellY = margin + headerHeight + p.row * (cellH + labelBand + gapY);

        const natW = Math.max(1, p.img.width || result.width);
        const natH = Math.max(1, p.img.height || result.height);
        const scale = Math.min(cellW / natW, cellH / natH);
        const drawW = natW * scale;
        const drawH = natH * scale;
        const imgLeft = cellX + (cellW - drawW) / 2;
        const imgTop = cellY + labelBand + (cellH - drawH) / 2;

        const swatch = new fabric.Rect({
          left: cellX,
          top: cellY + 3,
          width: 11,
          height: 11,
          rx: 2,
          ry: 2,
          fill: p.swatchColor,
          stroke: '#64748b',
          strokeWidth: 0.6,
        });
        ensureObjectId(swatch, `${p.objName} Swatch`);

        const label = new fabric.IText(p.title, {
          left: cellX + 16,
          top: cellY + 2,
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'Inter, Arial, sans-serif',
          fill: p.textColor,
        });
        ensureObjectId(label, `${p.objName} Label`);

        p.img.set({
          left: imgLeft,
          top: imgTop,
          scaleX: scale,
          scaleY: scale,
          globalCompositeOperation: 'multiply',
        });
        ensureObjectId(p.img, p.objName);

        canvas.add(swatch, label, p.img);
      }

      canvas.requestRenderAll();
      pageCanvasesRef.current[nextIdx] = JSON.stringify(
        canvas.toObject(SERIALIZE_PROPERTIES as any)
      );

      setPages((prev) => [...prev, newPage]);
      setActivePageIndex(nextIdx);
      setSelectedObject(null);
      setHasCanvasObjects(true);
      pushHistory('CMYK Separation (New Page)');
      showToast('CMYK separated (Cyan, Magenta, Yellow, Black) on new page');
    } catch (err) {
      console.error('CMYK separation failed', err);
      showToast('Failed to separate CMYK channels from selected object');
    }
  }, [canvas, activePageIndex, pages.length, pageConfig, pushHistory, showToast]);

  const recordRecentFile = useCallback((name: string, serializedCanvas?: string) => {
    const entry = {
      name,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      data: serializedCanvas,
    };
    setRecentFiles((prev) => {
      const next = [entry, ...prev.filter((r) => r.name !== name)].slice(0, 8);
      try {
        localStorage.setItem('corel_recent_files', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Open project file (.ndr / .corelweb / .json / .svg)
  const handleOpenJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;
    const success = await importFromJSON(file, canvas, (loadedConfig, fullMeta) => {
      if (fullMeta?.pages && fullMeta.pages.length > 0) {
        pageCanvasesRef.current = fullMeta.pageCanvases || {};
        setPages(fullMeta.pages);
        setActivePageIndex(fullMeta.activePageIndex ?? 0);
      } else {
        pageCanvasesRef.current = {};
        setPages([loadedConfig]);
        setActivePageIndex(0);
      }
      setParametricState(fullMeta?.parametricState || EMPTY_PARAMETRIC_STATE);
    });
    if (success) {
      setDocumentName(file.name);
      const json = JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any));
      lastSavedSnapshotRef.current = json;
      setIsDirty(false);
      recordRecentFile(file.name, json);
      pushHistory();
      socketService.sendCanvasUpdate(canvas.toJSON(), 'sync');
      showToast(`Opened "${file.name}"`);
    }
    e.target.value = '';
  };

  // Import Image / SVG / NDR / Vector file onto active canvas
  const handleImportMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;
    const lower = file.name.toLowerCase();

    try {
      if (
        lower.endsWith('.ndr') ||
        lower.endsWith('.corelweb') ||
        lower.endsWith('.json') ||
        lower.endsWith('.dwg') ||
        lower.endsWith('.dxf')
      ) {
        const ok = await importFromJSON(file, canvas, (loadedConfig, fullMeta) => {
          if (fullMeta?.pages && fullMeta.pages.length > 0) {
            pageCanvasesRef.current = fullMeta.pageCanvases || {};
            setPages(fullMeta.pages);
            setActivePageIndex(fullMeta.activePageIndex ?? 0);
          } else {
            pageCanvasesRef.current = {};
            setPages([loadedConfig]);
            setActivePageIndex(0);
          }
          if (fullMeta?.parametricState) {
            setParametricState(fullMeta.parametricState);
          }
        });
        if (ok) {
          setDocumentName(file.name);
          recordRecentFile(file.name, JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any)));
          pushHistory();
          showToast(`Imported project "${file.name}"`);
        }
      } else if (lower.endsWith('.svg')) {
        const svgText = await file.text();
        const result = await fabric.loadSVGFromString(svgText);
        const objs = (result.objects || []).filter(Boolean) as fabric.FabricObject[];
        if (objs.length > 0) {
          const group = objs.length === 1 ? objs[0] : fabric.util.groupSVGElements(objs, result.options);
          group.set({ left: 80, top: 80 });
          ensureObjectId(group, file.name);
          canvas.add(group);
          canvas.setActiveObject(group);
          canvas.requestRenderAll();
          pushHistory();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
          showToast(`Imported SVG "${file.name}"`);
        }
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result !== 'string') return;
          const img = await fabric.FabricImage.fromURL(reader.result);
          const maxDim = 420;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          img.set({ left: 80, top: 80, scaleX: scale, scaleY: scale });
          ensureObjectId(img, file.name);
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          pushHistory();
          socketService.sendCanvasUpdate(canvas.toJSON(), 'add');
          showToast(`Acquired image "${file.name}"`);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Import failed', err);
      showToast('Failed to import selected file');
    }
    e.target.value = '';
  };

  const handleSaveDocument = useCallback(() => {
    if (!canvas) return;
    if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
    setExportDialogMode('save');
    setExportDefaultFormat('ndr');
    setShowExportModal(true);
  }, [canvas, handleExitGroupEdit]);

  const handleSaveAs = useCallback(() => {
    if (!canvas) return;
    if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
    setExportDialogMode('save');
    setExportDefaultFormat('ndr');
    setShowExportModal(true);
  }, [canvas, handleExitGroupEdit]);

  const handleSaveToCloud = useCallback(() => {
    if (!canvas) return;
    if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
    const canvasData = canvas.toObject(SERIALIZE_PROPERTIES as any);
    const snapshot = JSON.stringify(canvasData);
    lastSavedSnapshotRef.current = snapshot;
    setIsDirty(false);
    const entry = {
      id: `cloud-${Date.now()}`,
      name: documentName || 'Untitled-1',
      savedAt: new Date().toLocaleString(),
      pageConfig,
      canvasData,
    };
    setCloudDocs((prev) => {
      const next = [entry, ...prev.filter((d) => d.name !== entry.name)].slice(0, 20);
      try {
        localStorage.setItem('corel_cloud_docs', JSON.stringify(next));
      } catch {}
      return next;
    });
    recordRecentFile(entry.name, snapshot);
    socketService.sendCanvasUpdate(canvasData, 'sync');
    showToast(`Saved "${entry.name}" to Cloud Workspace`);
  }, [canvas, documentName, pageConfig, recordRecentFile, showToast, handleExitGroupEdit]);

  const handleSaveAsTemplate = useCallback(() => {
    if (!canvas) return;
    const tmpl = {
      id: `tmpl-${Date.now()}`,
      name: `${documentName || 'Custom'} Template`,
      pageConfig,
      canvasData: canvas.toObject(SERIALIZE_PROPERTIES as any),
    };
    setCustomTemplates((prev) => {
      const next = [tmpl, ...prev].slice(0, 12);
      try {
        localStorage.setItem('corel_custom_templates', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(`Saved "${tmpl.name}" to Templates`);
  }, [canvas, documentName, pageConfig, showToast]);

  const handleRevertDocument = useCallback(async () => {
    if (!canvas || !lastSavedSnapshotRef.current) return;
    try {
      const parsed = JSON.parse(lastSavedSnapshotRef.current);
      await canvas.loadFromJSON(parsed);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelectedObject(null);
      setIsDirty(false);
      pushHistory();
      socketService.sendCanvasUpdate(parsed, 'sync');
      showToast('Reverted document to last saved state');
    } catch (e) {
      console.error('Revert failed', e);
    }
  }, [canvas, pushHistory, showToast]);

  const handleOpenRecent = useCallback(
    async (name: string) => {
      if (!canvas) return;
      const found = recentFiles.find((r) => r.name === name);
      if (found?.data) {
        try {
          const parsed = JSON.parse(found.data);
          await canvas.loadFromJSON(parsed);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setDocumentName(name);
          lastSavedSnapshotRef.current = found.data;
          setIsDirty(false);
          pushHistory();
          showToast(`Opened recent file "${name}"`);
        } catch {}
      } else {
        fileInputRef.current?.click();
      }
    },
    [canvas, recentFiles, pushHistory, showToast]
  );

  const handleAcquireImage = useCallback(
    async (source: 'file' | 'clipboard') => {
      if (source === 'file') {
        importInputRef.current?.click();
        return;
      }
      if (!canvas || !navigator.clipboard?.read) {
        showToast('Use Ctrl+V or Import... to place clipboard/local images');
        return;
      }
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const url = URL.createObjectURL(blob);
            const img = await fabric.FabricImage.fromURL(url);
            img.set({ left: 80, top: 80 });
            ensureObjectId(img, 'Acquired Image');
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            pushHistory();
            showToast('Image acquired from clipboard');
            return;
          }
        }
        showToast('No image found in clipboard');
      } catch {
        showToast('Clipboard read blocked — use Ctrl+V or Import...');
      }
    },
    [canvas, pushHistory, showToast]
  );

  const handleQuickExport = useCallback(
    (format: 'ndr' | 'dwg' | 'svg' | 'pdf' | 'png' | 'json', scale = 2) => {
      if (!canvas) return;
      if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
      const base = (documentName || 'design').replace(/\.[^/.]+$/, '');
      if (format === 'svg') exportAsSVG(canvas, pageConfig, `${base}.svg`);
      else if (format === 'pdf') exportAsPDF(canvas, pageConfig, `${base}.pdf`);
      else if (format === 'png') exportAsPNG(canvas, pageConfig, scale, `${base}.png`);
      else if (format === 'dwg') exportAsDWG(canvas, pageConfig, `${base}.dwg`);
      else {
        const json = JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any));
        exportAsNDR(canvas, pageConfig, `${base}.ndr`, {
          pages,
          activePageIndex,
          pageCanvases: { ...pageCanvasesRef.current, [activePageIndex]: json },
          serializeProps: SERIALIZE_PROPERTIES,
        });
      }
      showToast(`Exported ${base}.${format === 'json' || format === 'ndr' ? 'ndr' : format}`);
    },
    [canvas, documentName, pageConfig, pages, activePageIndex, showToast, handleExitGroupEdit]
  );

  const handleSendTo = useCallback(
    (target: 'desktop' | 'mail' | 'cloud') => {
      if (target === 'desktop') {
        handleQuickExport('json');
      } else if (target === 'mail') {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        showToast('Collaboration link copied to clipboard for sharing');
      } else {
        handleSaveToCloud();
      }
    },
    [handleQuickExport, handleSaveToCloud, showToast]
  );

  const handlePrintMerge = useCallback(
    (action: 'insert_field' | 'csv') => {
      if (!canvas) return;
      if (action === 'insert_field') {
        const fieldText = new fabric.IText('<<MergeField>>', {
          left: 120,
          top: 120,
          fontFamily: 'Montserrat',
          fontSize: 22,
          fill: '#0078d7',
        });
        ensureObjectId(fieldText, 'Print Merge Field');
        canvas.add(fieldText);
        canvas.setActiveObject(fieldText);
        canvas.requestRenderAll();
        pushHistory();
        showToast('Inserted <<MergeField>> placeholder onto page');
      } else {
        csvMergeInputRef.current?.click();
      }
    },
    [canvas, pushHistory, showToast]
  );

  const handleCsvMergeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length >= 2) {
      const headers = lines[0].split(',').map((h) => h.trim());
      const firstRow = lines[1].split(',').map((v) => v.trim());
      let replaced = 0;
      canvas.getObjects().forEach((obj) => {
        if ((obj.type === 'i-text' || obj.type === 'text') && typeof (obj as any).text === 'string') {
          let txt: string = (obj as any).text;
          headers.forEach((h, i) => {
            txt = txt.replace(new RegExp(`<<${h}>>`, 'gi'), firstRow[i] || '');
          });
          if (txt.includes('<<MergeField>>') && firstRow[0]) {
            txt = txt.replace(/<<MergeField>>/g, firstRow[0]);
          }
          if (txt !== (obj as any).text) {
            (obj as any).set('text', txt);
            replaced++;
          }
        }
      });
      canvas.requestRenderAll();
      pushHistory();
      showToast(`Print Merge applied ${lines.length - 1} CSV records (${replaced} field(s) updated)`);
    }
    e.target.value = '';
  };

  const handleOpenPrintPreview = useCallback(() => {
    if (!canvas) return;
    if (groupEditStackRef.current.length > 0) handleExitGroupEdit(true);
    const url = canvas.toDataURL({
      format: 'png',
      multiplier: 1.5,
      left: 0,
      top: 0,
      width: pageConfig.width,
      height: pageConfig.height,
    });
    setPrintPreviewDataUrl(url);
    setShowPrintPreviewModal(true);
  }, [canvas, pageConfig, handleExitGroupEdit]);

  const handleCloseDocument = useCallback(() => {
    groupEditStackRef.current = [];
    setGroupEditStack([]);
    if (docTabs.length > 1) {
      const remaining = docTabs.filter((t) => t !== activeDocTab);
      setDocTabs(remaining);
      setActiveDocTab(remaining[0]);
      setDocumentName(remaining[0]);
    } else if (canvas) {
      canvas.clear();
      canvas.renderAll();
      setSelectedObject(null);
      setParametricState(EMPTY_PARAMETRIC_STATE);
      setShowWelcomeScreen(true);
    }
  }, [docTabs, activeDocTab, canvas]);

  const handleCloseAllDocuments = useCallback(() => {
    groupEditStackRef.current = [];
    setGroupEditStack([]);
    if (canvas) {
      canvas.clear();
      canvas.renderAll();
      setSelectedObject(null);
    }
    setParametricState(EMPTY_PARAMETRIC_STATE);
    setDocTabs(['Untitled-1']);
    setActiveDocTab('Untitled-1');
    setDocumentName('Untitled-1');
    setShowWelcomeScreen(true);
  }, [canvas]);

  const handleNewDocument = () => {
    if (!canvas) return;
    const newIdx = docTabs.length + 1;
    const newName = `Untitled-${newIdx}`;
    setDocTabs((prev) => [...prev, newName]);
    setActiveDocTab(newName);
    setDocumentName(newName);
    setShowWelcomeScreen(false);
  };

  const handleSelectDocTab = (tab: string) => {
    setActiveDocTab(tab);
    setDocumentName(tab);
    setShowWelcomeScreen(false);
  };

  const handleCloseDocTab = (tab: string) => {
    if (docTabs.length <= 1) return;
    const remaining = docTabs.filter((t) => t !== tab);
    setDocTabs(remaining);
    if (activeDocTab === tab) {
      setActiveDocTab(remaining[0]);
      setDocumentName(remaining[0]);
    }
  };

  const handleNewDocTab = () => {
    handleNewDocument();
  };

  // Docker toggle helper
  const handleToggleDocker = (dockerName: string) => {
    const id = dockerName.toLowerCase() as DockerId;
    setActiveDocker((prev) => (prev === id ? null : id));
  };

  // Complete CorelDRAW Text Menu Actions
  const handleTextAction = useCallback(
    (action: string, payload?: any) => {
      if (!canvas) return;
      const active = canvas.getActiveObject();
      const isTextObj =
        !!active &&
        (active.type === 'i-text' || active.type === 'text' || active.type === 'textbox');

      switch (action) {
        case 'tabs':
        case 'columns':
        case 'bullets':
        case 'drop_cap':
        case 'statistics':
        case 'edit_text':
        case 'change_case':
        case 'encode':
          setActiveTextDialog(action as TextDialogKind);
          break;

        case 'insert_code': {
          const code = typeof payload === 'string' ? payload : '—';
          if (isTextObj && active) {
            const cur = String((active as any).text || '');
            (active as any).set('text', `${cur}${code}`);
            active.setCoords();
          } else {
            const t = new fabric.IText(code, {
              left: 180,
              top: 180,
              fontFamily: 'Montserrat',
              fontSize: 28,
              fill: '#1e293b',
            });
            ensureObjectId(t, 'Artistic Text');
            canvas.add(t);
            canvas.setActiveObject(t);
          }
          canvas.requestRenderAll();
          pushHistory();
          showToast('Inserted formatting character');
          break;
        }

        case 'convert_paragraph': {
          if (!isTextObj || !active) {
            showToast('Select a text object first');
            return;
          }
          const jsonProps = {
            left: active.left,
            top: active.top,
            fontFamily: (active as any).fontFamily || 'Montserrat',
            fontSize: (active as any).fontSize || 24,
            fontWeight: (active as any).fontWeight || 'normal',
            fontStyle: (active as any).fontStyle || 'normal',
            fill: active.fill || '#1e293b',
            angle: active.angle || 0,
            textAlign: (active as any).textAlign || 'left',
          };
          const textVal = String((active as any).text || '');
          const isParagraph = active.type === 'textbox';
          const replacement = isParagraph
            ? new fabric.IText(textVal, jsonProps)
            : new fabric.Textbox(textVal, {
                ...jsonProps,
                width: Math.max(220, Math.round(active.getScaledWidth())),
              });
          ensureObjectId(replacement, isParagraph ? 'Artistic Text' : 'Paragraph Text');
          canvas.remove(active);
          canvas.add(replacement);
          canvas.setActiveObject(replacement);
          canvas.requestRenderAll();
          setSelectedObject(replacement);
          pushHistory();
          showToast(isParagraph ? 'Converted to Artistic Text' : 'Converted to Paragraph Text');
          break;
        }

        case 'toggle_non_printing': {
          setShowNonPrintingChars((prev) => {
            const next = !prev;
            showToast(next ? 'Non-printing characters indicator enabled' : 'Non-printing characters hidden');
            return next;
          });
          break;
        }

        case 'toggle_text_frames': {
          setShowTextFrames((prev) => {
            const next = !prev;
            canvas.getObjects().forEach((o) => {
              if (o.type === 'textbox') {
                o.set('stroke', next ? '#38bdf8' : 'transparent');
                o.set('strokeWidth', next ? 0.5 : 0);
              }
            });
            canvas.requestRenderAll();
            showToast(next ? 'Paragraph Text Frames visible' : 'Paragraph Text Frames hidden');
            return next;
          });
          break;
        }

        case 'fit_text_to_frame': {
          if (!isTextObj || !active) return;
          const targetW = Math.max(120, active.getScaledWidth());
          const len = Math.max(1, String((active as any).text || '').length);
          const fittedSize = Math.max(10, Math.min(72, Math.round((targetW * 1.6) / Math.sqrt(len))));
          (active as any).set('fontSize', fittedSize);
          active.setCoords();
          canvas.requestRenderAll();
          pushHistory();
          showToast(`Fitted text to frame (${fittedSize} pt)`);
          break;
        }

        case 'fit_to_path': {
          const applyFitPair = (txtObj: fabric.FabricObject, pObj: fabric.FabricObject) => {
            ensureObjectId(pObj);
            const rawText = String((txtObj as any).text || 'The Union Territory of INDIA');
            const curvedGroup = buildTextOnPathGroup(pObj, {
              text: rawText,
              fontFamily: (txtObj as any).fontFamily || 'Arial',
              fontSize: Number((txtObj as any).fontSize) || 28,
              fontWeight: String((txtObj as any).fontWeight || 'normal'),
              fontStyle: String((txtObj as any).fontStyle || 'normal'),
              fill: typeof txtObj.fill === 'string' && txtObj.fill !== 'transparent' ? txtObj.fill : '#111827',
              stroke: typeof txtObj.stroke === 'string' ? txtObj.stroke : 'transparent',
              strokeWidth: Number(txtObj.strokeWidth) || 0,
              charSpacing: Number((txtObj as any).charSpacing) || 0,
              distance: 6,
              offsetRatio: 0.5,
              placement: 'outside',
              orientation: 'follow',
              flipSide: false,
              pathObjectId: (pObj as any).id,
            });
            if (!curvedGroup) {
              showToast('Could not extract path geometry from selected shape');
              return;
            }
            canvas.discardActiveObject();
            canvas.remove(txtObj);
            canvas.add(curvedGroup);
            canvas.setActiveObject(curvedGroup);
            setSelectedObject(curvedGroup);
            canvas.requestRenderAll();
            pushHistory('Fit Text to Path');
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
            showToast('Fitted text to path — click Text → Fit Text to Path again to adjust distance/offset');
          };

          if (active && active.type === 'activeselection') {
            const items = (active as fabric.ActiveSelection).getObjects();
            const txtObj = items.find((o) => isTextObject(o));
            const pObj = items.find((o) => isPathTargetObject(o));
            if (txtObj && pObj) {
              applyFitPair(txtObj, pObj);
              break;
            }
          }

          if (isTextOnPathObject(active)) {
            const pathId = (active as any).textOnPathData?.pathObjectId;
            const linkedPath = canvas.getObjects().find((o) => (o as any).id === pathId) || null;
            setFitTextGroupTarget(active as fabric.Group);
            setFitTextPathTarget(linkedPath);
            setShowFitTextModal(true);
            break;
          }

          if (isTextObject(active) && active) {
            fitTextSourceRef.current = active;
            setFitTextPicking(true);
            showToast('Click any shape, ellipse, circle, or path to fit text onto it');
            break;
          }

          if (isPathTargetObject(active) && active) {
            ensureObjectId(active);
            setFitTextGroupTarget(null);
            setFitTextPathTarget(active);
            setShowFitTextModal(true);
            break;
          }

          showToast('Select a Text object or Shape/Path first');
          break;
        }

        case 'straighten': {
          if (isTextOnPathObject(active) && active) {
            const straightened = straightenTextOnPathToIText(canvas, active as fabric.Group);
            setSelectedObject(straightened);
            pushHistory('Straighten Text');
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
            showToast('Straightened text back to horizontal baseline');
            break;
          }
          if (!isTextObj || !active) return;
          active.set({ angle: 0, skewX: 0, skewY: 0 });
          active.setCoords();
          canvas.requestRenderAll();
          pushHistory();
          showToast('Straightened text to horizontal baseline');
          break;
        }

        case 'align_baseline': {
          const objs = canvas.getActiveObjects().filter(
            (o) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox'
          );
          if (objs.length > 1) {
            const refBottom = Math.max(...objs.map((o) => (o.top || 0) + o.getScaledHeight()));
            objs.forEach((o) => {
              o.set('top', refBottom - o.getScaledHeight());
              o.setCoords();
            });
            canvas.requestRenderAll();
            pushHistory();
            showToast('Aligned selected text objects to common baseline');
          } else if (isTextObj && active) {
            active.set({ angle: 0 });
            active.setCoords();
            canvas.requestRenderAll();
            pushHistory();
            showToast('Aligned text to baseline');
          }
          break;
        }

        case 'align_baseline_grid': {
          if (!isTextObj || !active) return;
          const gridStep = 18;
          const snappedTop = Math.round((active.top || 0) / gridStep) * gridStep;
          active.set('top', snappedTop);
          active.setCoords();
          canvas.requestRenderAll();
          pushHistory();
          showToast('Snapped text to baseline grid');
          break;
        }

        case 'toggle_hyphenation': {
          setUseHyphenation((prev) => {
            const next = !prev;
            if (isTextObj && active && active.type === 'textbox') {
              (active as any).set('splitByGrapheme', next);
              canvas.requestRenderAll();
            }
            showToast(next ? 'Automatic hyphenation enabled' : 'Hyphenation disabled');
            return next;
          });
          break;
        }

        case 'spell_check': {
          const textObjs = isTextObj && active ? [active] : canvas.getObjects().filter((o) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox');
          const allWords = textObjs
            .map((o) => String((o as any).text || ''))
            .join(' ')
            .trim();
          const repeats = allWords.match(/\b(\w+)\s+\1\b/gi);
          if (repeats && repeats.length > 0) {
            showToast(`Spell Check found ${repeats.length} repeated word(s): "${repeats[0]}"`);
          } else {
            showToast(`Spell Check complete — ${allWords ? allWords.split(/\s+/).length : 0} word(s) verified`);
          }
          break;
        }

        case 'quick_correct': {
          if (isTextObj && active) {
            const raw = String((active as any).text || '');
            const fixed = raw
              .replace(/--/g, '—')
              .replace(/\(c\)/gi, '©')
              .replace(/\(tm\)/gi, '™')
              .replace(/ {2,}/g, ' ');
            (active as any).set('text', fixed);
            active.setCoords();
            canvas.requestRenderAll();
            pushHistory();
            showToast('QuickCorrect applied');
          } else {
            showToast('Select text to apply QuickCorrect');
          }
          break;
        }

        case 'web_compatible': {
          if (!isTextObj || !active) return;
          (active as any).set('fontFamily', 'Arial');
          active.setCoords();
          canvas.requestRenderAll();
          pushHistory();
          showToast('Converted text font to Web-compatible Arial');
          break;
        }

        case 'metallic_preset': {
          const presetId = (payload || 'gold') as import('./types').MetallicPresetId;
          const activeObjs = canvas.getActiveObjects();
          setMetallicInitialPreset(presetId);
          setShowMetallicModal(true);
          if (activeObjs.length === 0) {
            showToast('Select any Text or Object first to apply Metallic Effect');
            return;
          }
          const existing = readMetallicConfigFromObject(activeObjs[0]);
          const nextCfg = { ...DEFAULT_METALLIC_CONFIG, ...existing, preset: presetId };
          applyMetallicEffectToSelection(canvas, nextCfg);
          setSelectedObject(canvas.getActiveObject() || null);
          pushHistory(`Metallic ${METALLIC_PRESETS[presetId].label}`);
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          showToast(`Applied ${METALLIC_PRESETS[presetId].label} metallic effect`);
          break;
        }

        case 'metallic_adjust': {
          setMetallicInitialPreset(null);
          setShowMetallicModal(true);
          break;
        }

        case 'metallic_remove': {
          const removed = removeMetallicEffectFromSelection(canvas);
          if (removed === 0) {
            showToast('Select an object with Metallic Effect first');
            return;
          }
          setSelectedObject(canvas.getActiveObject() || null);
          pushHistory('Remove Metallic Effect');
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          showToast('Removed metallic effect');
          break;
        }
      }
    },
    [canvas, pushHistory, showToast]
  );

  const handleTextActionRef = useRef(handleTextAction);
  handleTextActionRef.current = handleTextAction;

  // CorelDRAW Effects Menu Handler
  const handleEffectAction = useCallback(
    async (action: string, payload?: any) => {
      if (!canvas) return;
      const active = canvas.getActiveObject();

      if (action === 'artistic_media') {
        setActiveTool('artistic_media');
        showToast('Artistic Media brush active — draw freehand strokes on canvas');
        return;
      }

      if (action === 'flatten_effects') {
        if (!active) {
          showToast('Select an object with effects to flatten');
          return;
        }
        try {
          const bound = active.getBoundingRect();
          const dataUrl = active.toDataURL({ format: 'png', multiplier: 2 });
          const img = await fabric.FabricImage.fromURL(dataUrl);
          img.set({
            left: bound.left,
            top: bound.top,
            scaleX: 0.5,
            scaleY: 0.5,
            originX: 'left',
            originY: 'top',
            objectCaching: false,
          });
          ensureObjectId(img, 'Flattened Effect');
          canvas.remove(active);
          canvas.add(img);
          canvas.setActiveObject(img);
          setSelectedObject(img);
          canvas.requestRenderAll();
          pushHistory('Flatten Effects');
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          showToast('Flattened effects into crisp raster object');
        } catch (err) {
          console.error('Failed to flatten effects', err);
        }
        return;
      }

      if (action === 'filter' && payload?.effectName) {
        if (payload.effectName === 'Image Adjustment Lab...') {
          handleOpenImageAdjustmentLab();
          return;
        }
        setActiveEffectDialog({
          kind: 'filter',
          category: payload.category || 'Effects',
          effectName: payload.effectName,
        });
        return;
      }

      if (
        action === 'bevel' ||
        action === 'blend' ||
        action === 'contour' ||
        action === 'envelope' ||
        action === 'extrude' ||
        action === 'lens' ||
        action === 'photococktail' ||
        action === 'pointillizer'
      ) {
        setActiveEffectDialog({ kind: action });
      }
    },
    [canvas, pushHistory, showToast, handleOpenImageAdjustmentLab]
  );

  // Switch Room
  const handleSwitchRoom = (newRoom: string) => {
    setRoomId(newRoom);
    socketService.switchRoom(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
  };

  // Update user name
  const handleUpdateUserName = (newName: string) => {
    socketService.updateUserName(newName);
    setCurrentUser((prev) => ({ ...prev, name: newName }));
  };

  // Throttled cursor broadcast
  const lastCursorEmitRef = useRef<number>(0);
  const handleCursorMove = (pos: { x: number; y: number }) => {
    setCursorPos(pos);
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 40) {
      lastCursorEmitRef.current = now;
      socketService.sendCursor(pos.x, pos.y);
    }
  };

  // Selection string for status bar
  const selectionLabel = selectedObject
    ? `${getObjectLabel(selectedObject)} — X: ${Math.round(selectedObject.left || 0)}px, Y: ${Math.round(
        selectedObject.top || 0
      )}px, W: ${Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}px, H: ${Math.round(
        (selectedObject.height || 0) * (selectedObject.scaleY || 1)
      )}px`
    : '';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans ${theme === 'dark' ? 'bg-[#484b51]' : 'bg-[#e9eaed]'}`}>
      {/* Hidden file input for opening projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ndr,.corelweb,.json,.svg,.dwg,.dxf"
        onChange={handleOpenJSONFile}
        className="hidden"
      />
      {/* Hidden file input for Importing Images / SVG / NDR / DWG / Files */}
      <input
        ref={importInputRef}
        type="file"
        accept="image/*,.svg,.ndr,.corelweb,.json,.dwg,.dxf"
        onChange={handleImportMediaFile}
        className="hidden"
      />
      {/* Hidden CSV input for Print Merge */}
      <input
        ref={csvMergeInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleCsvMergeFile}
        className="hidden"
      />

      {/* Non-blocking File Action Toast */}
      {fileToast && (
        <div className="fixed bottom-10 right-5 z-[80] bg-zinc-900/95 text-white text-xs px-3.5 py-2 rounded shadow-xl border border-sky-500/60 flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{fileToast}</span>
        </div>
      )}

      {/* Complete CorelDRAW Top Panel (Menu Bar, Standard Command Bar, Contextual Property Bar) */}
      <CorelTopPanel
        documentName={documentName}
        onDocumentNameChange={setDocumentName}
        canUndo={canUndo}
        canRedo={canRedo}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        canPaste={canPaste}
        theme={theme}
        activeTool={activeTool}
        onOpenSettings={() => setShowSettingsModal(true)}
        onToggleTheme={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={() => setZoomLevel((z) => Math.min(4096, Number((z * 1.25).toFixed(4))))}
        onZoomOut={() => setZoomLevel((z) => Math.max(0.01, Number((z * 0.8).toFixed(4))))}
        onZoomFit={() => setZoomLevel(0.85)}
        onZoomSet={(z) => setZoomLevel(Math.min(4096, Math.max(0.01, z)))}
        onZoomMode={handleZoomMode}
        zoomLevel={zoomLevel}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((g) => !g)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers((r) => !r)}
        onExport={(fmt) => {
          setExportDialogMode(fmt === 'ndr' ? 'save' : 'export');
          setExportDefaultFormat(fmt || 'pdf');
          setShowExportModal(true);
        }}
        onOpenJSON={() => fileInputRef.current?.click()}
        onNewDocument={handleNewDocument}
        collaborators={collaborators}
        currentUser={currentUser}
        roomId={roomId}
        onSwitchRoom={handleSwitchRoom}
        onUpdateUserName={handleUpdateUserName}
        isConnected={isConnected}
        onToggleDocker={handleToggleDocker}
        activeDockers={activeDockers}
        selectedObject={selectedObject}
        properties={properties}
        onUpdateProperties={handleUpdateProperties}
        pageConfig={pageConfig}
        onUpdatePageConfig={handleUpdatePageConfig}
        onOpenPageSetup={() => openPageSetup('size')}
        onAddPage={handleAddPage}
        onRotate={handleRotate}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onUngroupAll={handleUngroupAll}
        onEnterGroupEdit={() => handleEnterGroupEdit()}
        onExitGroupEdit={() => handleExitGroupEdit(false)}
        groupEditDepth={groupEditStack.length}
        snapConfig={snapConfig}
        onUpdateSnapConfig={handleUpdateSnapConfig}
        onPowerClipPlace={handlePowerClipPlace}
        onPowerClipExtract={handlePowerClipExtract}
        onPowerClipEdit={handlePowerClipEdit}
        onPowerClipFinish={handlePowerClipFinish}
        isPowerClipEditing={!!powerClipEditingObj}
        symmetryEditingConfig={symmetryEditingConfig}
        onUpdateSymmetryConfig={handleUpdateSymmetryConfig}
        onCreateSymmetry={handleCreateSymmetry}
        onEditSymmetry={handleEditSymmetry}
        onFinishSymmetry={handleFinishSymmetry}
        onRemoveSymmetry={handleRemoveSymmetry}
        onBreakSymmetryLink={handleBreakSymmetryLink}
        onAlign={handleAlign}
        onConvertToCurves={handleConvertToCurves}
        curveEditState={curveEditState}
        onCurveAction={handleCurveAction}
        docTabs={docTabs}
        activeDocTab={activeDocTab}
        onSelectDocTab={handleSelectDocTab}
        onCloseDocTab={handleCloseDocTab}
        onNewDocTab={handleNewDocTab}
        onOpenWelcome={() => setShowWelcomeScreen(true)}
        showWelcomeScreen={showWelcomeScreen}
        onNewFromTemplate={() => setShowTemplateModal(true)}
        onOpenFromCloud={() => setShowCloudModal(true)}
        recentFiles={recentFiles}
        onOpenRecent={handleOpenRecent}
        onCloseDocument={handleCloseDocument}
        onCloseAllDocuments={handleCloseAllDocuments}
        onSave={handleSaveDocument}
        onSaveAs={handleSaveAs}
        onSaveToCloud={handleSaveToCloud}
        onSaveAsTemplate={handleSaveAsTemplate}
        onRevert={handleRevertDocument}
        canSave={isDirty || canUndo}
        isDirty={isDirty}
        canRevert={isDirty && !!lastSavedSnapshotRef.current}
        onAcquireImage={handleAcquireImage}
        onImport={() => importInputRef.current?.click()}
        onQuickExport={handleQuickExport}
        onSendTo={handleSendTo}
        onPrintMerge={handlePrintMerge}
        onPrint={() => window.print()}
        onPrintPreview={handleOpenPrintPreview}
        onExit={() => setShowWelcomeScreen(true)}
        undoLabel={undoLabel}
        canRepeat={canRepeat}
        onRepeat={handleRepeat}
        isFocusMode={isFocusMode}
        onBringIntoFocus={handleBringIntoFocus}
        onExitFocusMode={() => {
          if (powerClipEditingObj) handlePowerClipFinish();
          handleExitFocusMode();
        }}
        onCopyPropertiesFrom={handleOpenCopyProperties}
        onPasteInView={handlePasteInView}
        onPasteSpecial={() => setShowPasteSpecialModal(true)}
        onClone={handleClone}
        onSelectAll={handleSelectAll}
        findReplaceOpen={showFindReplaceModal}
        onOpenFindReplace={() => setShowFindReplaceModal((prev) => !prev)}
        onOpenStepAndRepeat={() => setShowStepRepeatModal(true)}
        viewQualityMode={viewQualityMode}
        onChangeViewQualityMode={setViewQualityMode}
        onFullScreenPreview={handleFullScreenPreview}
        onPreviewSelectedOnly={handlePreviewSelectedOnly}
        multipageView={multipageView}
        onToggleMultipageView={() => setMultipageView((m) => !m)}
        hasCanvasObjects={hasCanvasObjects}
        onZoomToFitObjects={handleZoomToFitObjects}
        proofColors={proofColors}
        onToggleProofColors={() => setProofColors((p) => !p)}
        simulateOverprints={simulateOverprints}
        onToggleSimulateOverprints={() => setSimulateOverprints((s) => !s)}
        rasterizeComplexEffects={rasterizeComplexEffects}
        onToggleRasterizeComplexEffects={() => setRasterizeComplexEffects((r) => !r)}
        showPrintableArea={showPrintableArea}
        onTogglePrintableArea={() => setShowPrintableArea((p) => !p)}
        showBaselineGrid={showBaselineGrid}
        onToggleBaselineGrid={() => setShowBaselineGrid((b) => !b)}
        showGuidelines={showGuidelines}
        onToggleGuidelines={() => setShowGuidelines((g) => !g)}
        showAlignmentGuides={showAlignmentGuides}
        onToggleAlignmentGuides={() => setShowAlignmentGuides((a) => !a)}
        showDynamicGuides={showDynamicGuides}
        onToggleDynamicGuides={() => setShowDynamicGuides((d) => !d)}
        showDocNavigator={showDocNavigator}
        onToggleDocNavigator={() => setShowDocNavigator((n) => !n)}
        showScrollbars={showScrollbars}
        onToggleScrollbars={() => setShowScrollbars((s) => !s)}
        pagesCount={pages.length}
        onInsertPage={handleOpenInsertPageModal}
        onDuplicatePage={handleOpenDuplicatePageModal}
        onRenamePage={handleOpenRenamePageModal}
        onDeletePage={handleOpenDeletePageModal}
        onGoToPage={handleOpenGoToPageModal}
        onInsertPageNumber={handleInsertPageNumber}
        onPageNumberSettings={() => setShowPageNumSettingsModal(true)}
        onOpenPageSetupTab={openPageSetup}
        onBorderAndGrommet={() => setShowBorderGrommetModal(true)}
        onConvertToBitmap={() => setShowConvertBitmapModal(true)}
        onStraightenImage={handleOpenStraightenModal}
        onImageAdjustmentLab={handleOpenImageAdjustmentLab}
        onBitmapGrayscale={handleBitmapGrayscale}
        onBitmapInvert={handleBitmapInvert}
        onBitmapCmykSeparation={handleBitmapCmykSeparation}
        onSelectTool={setActiveTool}
        showNonPrintingChars={showNonPrintingChars}
        useHyphenation={useHyphenation}
        showTextFrames={showTextFrames}
        onTextAction={handleTextAction}
        onEffectAction={handleEffectAction}
        onOpenQrCode={() => setShowQrCodeModal(true)}
        onOpenRandomFiller={() => setShowRandomFillerModal(true)}
        showProjectTimer={showProjectTimer}
        onToggleProjectTimer={() => setShowProjectTimer((prev) => !prev)}
        projectTimerSeconds={currentTimerState.totalSeconds}
        projectTimerStatus={currentTimerState.status}
        dimensionConfig={dimensionConfig}
        onUpdateDimensionConfig={handleUpdateDimensionConfig}
        cropToolsConfig={cropToolsConfig}
        onUpdateCropToolsConfig={handleUpdateCropToolsConfig}
        onCropAction={handleCropAction}
        onAutofitPage={handleAutofitPage}
        currentFill={currentFill}
        currentStroke={currentStroke}
        parametricState={parametricState}
        onOpenParametersManager={() => setShowParametersManager(true)}
        onAddDimConstraint={handleAddDimConstraint}
        onAddGeomConstraint={handleAddGeomConstraint}
        onAutoConstrain={handleAutoConstrain}
        onToggleShowConstraints={() =>
          setParametricState((prev) => ({ ...prev, showConstraints: !prev.showConstraints }))
        }
        onSolveConstraints={() => {
          handleUpdateParametricState(parametricStateRef.current, true);
          showToast('Re-evaluated all parametric formulas & constraints');
        }}
        onClearSelectedConstraints={handleClearSelectedConstraints}
        onClearAllConstraints={handleClearAllConstraints}
      />

      {/* Main Workspace (Left Toolbox + Center Canvas + Right Dockers) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbox */}
        <Toolbox
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          theme={theme}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenQrCode={() => setShowQrCodeModal(true)}
        />

        {/* Center Canvas Area with Rulers & Collaborator Cursors */}
        <CorelCanvas
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          pageConfig={pageConfig}
          properties={properties}
          onUpdateProperties={handleUpdateProperties}
          onSampleColors={handleSampleColors}
          onSelectionChange={setSelectedObject}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          showGrid={showGrid}
          showRulers={showRulers}
          onRegisterCanvas={handleRegisterCanvas}
          collaborators={collaborators}
          currentUser={currentUser}
          onCursorMove={handleCursorMove}
          currentFill={currentFill}
          currentStroke={currentStroke}
          workspaceBg={workspaceBg}
          onOpenPageSetup={() => openPageSetup('size')}
          theme={theme}
          snapConfig={snapConfig}
          dimensionConfig={dimensionConfig}
          powerClipPicking={powerClipPicking}
          onPickPowerClipContainer={handlePickPowerClipContainer}
          fitTextPicking={fitTextPicking}
          onPickFitTextPath={(targetPath) => {
            const srcText = fitTextSourceRef.current;
            setFitTextPicking(false);
            fitTextSourceRef.current = null;
            if (!canvas || !srcText || !isPathTargetObject(targetPath)) {
              showToast('Please click a valid shape, ellipse, circle, or curve path');
              return;
            }
            ensureObjectId(targetPath);
            const curvedGroup = buildTextOnPathGroup(targetPath, {
              text: String((srcText as any).text || 'The Union Territory of INDIA'),
              fontFamily: (srcText as any).fontFamily || 'Arial',
              fontSize: Number((srcText as any).fontSize) || 28,
              fontWeight: String((srcText as any).fontWeight || 'normal'),
              fontStyle: String((srcText as any).fontStyle || 'normal'),
              fill: typeof srcText.fill === 'string' && srcText.fill !== 'transparent' ? srcText.fill : '#111827',
              stroke: typeof srcText.stroke === 'string' ? srcText.stroke : 'transparent',
              strokeWidth: Number(srcText.strokeWidth) || 0,
              charSpacing: Number((srcText as any).charSpacing) || 0,
              distance: 6,
              offsetRatio: 0.5,
              placement: 'outside',
              orientation: 'follow',
              flipSide: false,
              pathObjectId: (targetPath as any).id,
            });
            if (!curvedGroup) {
              showToast('Could not extract path geometry from selected shape');
              return;
            }
            canvas.discardActiveObject();
            canvas.remove(srcText);
            canvas.add(curvedGroup);
            canvas.setActiveObject(curvedGroup);
            setSelectedObject(curvedGroup);
            canvas.requestRenderAll();
            pushHistory('Fit Text to Path');
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
            showToast('Fitted text to path');
          }}
          onPowerClipEdit={handlePowerClipEdit}
          onPowerClipFinish={handlePowerClipFinish}
          isPowerClipEditing={!!powerClipEditingObj}
          isGroupEditing={groupEditStack.length > 0}
          onGroupEditEnter={handleEnterGroupEdit}
          onGroupEditFinish={() => handleExitGroupEdit(false)}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onUngroupAll={handleUngroupAll}
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          canPaste={canPaste}
          onCanvasModified={pushHistory}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onPowerClipPlace={handlePowerClipPlace}
          onPowerClipExtract={handlePowerClipExtract}
          onConvertToCurves={handleConvertToCurves}
          onBringIntoFocus={handleBringIntoFocus}
          onBreakApart={handleBreakApart}
          onToggleHide={handleToggleHide}
          onToggleLock={handleToggleLock}
          onOpenProperties={handleOpenProperties}
          onAlignToPixelGrid={handleAlignToPixelGrid}
          onCreateSymmetry={handleCreateSymmetry}
          onEditSymmetry={handleEditSymmetry}
          onFinishSymmetry={handleFinishSymmetry}
          onRemoveSymmetry={handleRemoveSymmetry}
          onBreakSymmetryLink={handleBreakSymmetryLink}
          symmetryEditingConfig={symmetryEditingConfig}
          onUpdateSymmetryConfig={handleUpdateSymmetryConfig}
          onCreateSymbol={handleCreateSymbol}
          onCurveStateChange={setCurveEditState}
          onRegisterCurveActionHandler={handleRegisterCurveActionHandler}
          cropToolsConfig={cropToolsConfig}
          onUpdateCropToolsConfig={handleUpdateCropToolsConfig}
          onRegisterCropActionHandler={handleRegisterCropActionHandler}
          onRegisterZoomModeHandler={handleRegisterZoomModeHandler}
          viewQualityMode={viewQualityMode}
          proofColors={proofColors}
          simulateOverprints={simulateOverprints}
          rasterizeComplexEffects={rasterizeComplexEffects}
          showBaselineGrid={showBaselineGrid}
          showPrintableArea={showPrintableArea}
          showGuidelines={showGuidelines}
          showAlignmentGuides={showAlignmentGuides}
          showDynamicGuides={showDynamicGuides}
          showDocNavigator={showDocNavigator}
          showScrollbars={showScrollbars}
          onObjectsCountChange={(cnt) => setHasCanvasObjects(cnt > 0)}
          parametricState={parametricState}
          onEditDimConstraint={handleEditDimConstraint}
          onDeleteDimConstraint={handleDeleteDimConstraint}
          onDeleteGeomConstraint={handleDeleteGeomConstraint}
          onOpenParametersManager={() => setShowParametersManager(true)}
        />

        {/* PowerClip Target Picking Indicator Banner */}
        {powerClipPicking && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0078d7] text-white px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-3 border border-blue-300 animate-pulse">
            <IconPowerClip className="w-5 h-5 text-white shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">PowerClip: Select Container Frame</span>
              <span className="text-[11px] text-blue-100">Click on any shape or container on the canvas to place object inside</span>
            </div>
            <button
              onClick={() => {
                setPowerClipPicking(false);
                powerClipSourceRef.current = null;
              }}
              className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium border border-white/30 cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* Fit Text to Path Picking Indicator Banner */}
        {fitTextPicking && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0078d7] text-white px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-3 border border-blue-300">
            <IconFitTextToPath className="w-5 h-5 text-white shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">Fit Text to Path: Select Target Shape or Curve</span>
              <span className="text-[11px] text-blue-100">Click any Ellipse, Circle, Rectangle, Curve, or Line on canvas to curve the text onto it</span>
            </div>
            <button
              onClick={() => {
                setFitTextPicking(false);
                fitTextSourceRef.current = null;
              }}
              className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium border border-white/30 cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* PowerClip Edit Mode Indicator Banner */}
        {powerClipEditingObj && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-3 border border-emerald-400">
            <span className="text-base">✏️</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold">Editing PowerClip Contents</span>
              <span className="text-[11px] text-emerald-100">Move, rotate, copy (Ctrl+D), or resize contents. Click Finish or double-click canvas when done.</span>
            </div>
            <button
              onClick={handlePowerClipFinish}
              className="ml-2 px-3 py-1 bg-white text-emerald-800 hover:bg-zinc-100 rounded text-xs font-bold shadow-xs cursor-pointer"
            >
              Finish Editing
            </button>
          </div>
        )}

        {/* Group Editing Isolation Mode Breadcrumb Banner */}
        {groupEditStack.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0078d7] text-white px-4 py-2 rounded-md shadow-2xl flex items-center gap-3 border border-sky-300">
            <span className="text-sm font-bold">✎</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold flex items-center gap-1 flex-wrap">
                <span className="opacity-75">Page</span>
                {groupEditStack.map((lvl, idx) => (
                  <React.Fragment key={lvl.id + '_' + idx}>
                    <span className="opacity-60">›</span>
                    <span className={idx === groupEditStack.length - 1 ? 'underline' : 'opacity-85'}>
                      {lvl.groupName}
                    </span>
                  </React.Fragment>
                ))}
              </span>
              <span className="text-[10.5px] text-sky-100">
                Edit, move, recolor, add, or delete objects inside this group. Double-click empty area or press Esc to finish.
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {groupEditStack.length > 1 && (
                <button
                  onClick={() => handleExitGroupEdit(false)}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold cursor-pointer border border-white/30"
                >
                  Back 1 Level
                </button>
              )}
              <button
                onClick={() => handleExitGroupEdit(true)}
                className="px-3 py-1 bg-white text-[#005a9e] hover:bg-sky-50 rounded text-xs font-bold shadow-xs cursor-pointer"
              >
                Finish Editing
              </button>
            </div>
          </div>
        )}

        {/* Live Symmetry Editing Banner */}
        {symmetryEditingConfig && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0078d7] text-white px-4 py-2 rounded-md shadow-2xl flex items-center gap-3 border border-sky-300">
            <IconSymmetryCreate className="w-5 h-5 text-white shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">
                Editing Symmetry ({symmetryEditingConfig.mirrorLines}{' '}
                {symmetryEditingConfig.mirrorLines === 1 ? 'Mirror Line' : 'Mirror Lines'} •{' '}
                {Math.round(symmetryEditingConfig.angleDeg)}°)
              </span>
              <span className="text-[10.5px] text-sky-100">
                Edit objects or drag the blue mirror axis/handle. Press Esc or Finish when done.
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <button
                onClick={handleBreakSymmetryLink}
                className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded text-xs font-semibold cursor-pointer border border-white/30"
              >
                Break Link
              </button>
              <button
                onClick={handleRemoveSymmetry}
                className="px-2.5 py-1 bg-red-500/85 hover:bg-red-600 text-white rounded text-xs font-semibold cursor-pointer border border-red-300/40"
              >
                Remove
              </button>
              <button
                onClick={() => void handleFinishSymmetry()}
                className="px-3 py-1 bg-white text-[#005a9e] hover:bg-sky-50 rounded text-xs font-bold shadow-xs cursor-pointer"
              >
                Finish Editing Symmetry
              </button>
            </div>
          </div>
        )}

        {/* Welcome Screen Overlay when Welcome Screen Tab is active */}
        {showWelcomeScreen && (
          <div
            className={`absolute inset-0 z-40 flex flex-col items-center justify-center p-8 overflow-y-auto ${
              theme === 'dark' ? 'bg-[#46494f] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'
            }`}
          >
            <div className="max-w-3xl w-full space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-zinc-300 dark:border-zinc-700">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
                  <p className="text-xs text-zinc-500 mt-1">
                    Vector illustration, page layout, bitmap tracing, and precision object snapping.
                  </p>
                </div>
                <button
                  onClick={() => setShowWelcomeScreen(false)}
                  className="px-4 py-2 bg-[#0078d7] hover:bg-[#0063b1] text-white text-xs font-semibold rounded shadow-sm transition cursor-pointer"
                >
                  Back to {activeDocTab}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    handleNewDocument();
                    setShowWelcomeScreen(false);
                  }}
                  className={`p-5 rounded border text-left transition hover:border-[#0078d7] cursor-pointer ${
                    theme === 'dark' ? 'bg-[#4f5259] border-[#666a72]' : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                >
                  <div className="text-lg font-bold text-[#0078d7] mb-1">+ New Document</div>
                  <div className="text-xs text-zinc-400">Create a blank A4 or custom vector document.</div>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowWelcomeScreen(false);
                  }}
                  className={`p-5 rounded border text-left transition hover:border-[#0078d7] cursor-pointer ${
                    theme === 'dark' ? 'bg-[#4f5259] border-[#666a72]' : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                >
                  <div className="text-lg font-bold text-emerald-500 mb-1">Open Document</div>
                  <div className="text-xs text-zinc-400">Load an existing .ndr (Nura Draw) or SVG project.</div>
                </button>
                <button
                  onClick={() => {
                    setShowWelcomeScreen(false);
                    setActiveDocker('ai_generate');
                  }}
                  className={`p-5 rounded border text-left transition hover:border-[#0078d7] cursor-pointer ${
                    theme === 'dark' ? 'bg-[#4f5259] border-[#666a72]' : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                >
                  <div className="text-lg font-bold text-amber-400 mb-1">AI Vector Generate</div>
                  <div className="text-xs text-zinc-400">Generate vector artwork and badges directly on canvas.</div>
                </button>
              </div>

              <div className="pt-2 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Open Documents
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {docTabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => handleSelectDocTab(tab)}
                        className={`px-3 py-1.5 rounded border text-xs font-medium cursor-pointer transition flex items-center gap-2 ${
                          theme === 'dark'
                            ? 'bg-[#4f5259] border-[#666a72] hover:border-sky-500'
                            : 'bg-white border-zinc-300 hover:border-sky-500'
                        }`}
                      >
                        <img
                          src="/assets/aistudio/favicon_23650500.svg"
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                          draggable={false}
                        />
                        <span>{tab} ({pageConfig.preset} • {pageConfig.units})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {recentFiles.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Recent Nura Draw (.ndr) Files
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentFiles.map((rf) => (
                        <button
                          key={rf.name}
                          onClick={() => {
                            handleOpenRecent(rf.name);
                            setShowWelcomeScreen(false);
                          }}
                          className={`px-3 py-1.5 rounded border text-xs font-medium cursor-pointer transition flex items-center gap-2 ${
                            theme === 'dark'
                              ? 'bg-[#4f5259] border-[#666a72] hover:border-sky-500'
                              : 'bg-white border-zinc-300 hover:border-sky-500'
                          }`}
                        >
                          <img
                            src="/assets/aistudio/favicon_23650500.svg"
                            alt=""
                            className="w-4 h-4 object-contain shrink-0"
                            draggable={false}
                          />
                          <span>{rf.name}</span>
                          <span className="text-[10px] opacity-60">{rf.savedAt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Right Dockers System with Vertical Tab Strip (Matches image_e6758737.png) */}
        <DockersSidebar
          canvas={canvas}
          selectedObject={selectedObject}
          properties={properties}
          onUpdateProperties={handleUpdateProperties}
          pageConfig={pageConfig}
          pages={pages}
          activePageIndex={activePageIndex}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onSelectTool={setActiveTool}
          onConvertToCurves={handleConvertToCurves}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onEnterGroupEdit={(target) => handleEnterGroupEdit(target)}
          onExitGroupEdit={() => handleExitGroupEdit(false)}
          isGroupEditing={groupEditStack.length > 0}
          theme={theme}
          activeDockerId={activeDocker}
          onToggleDocker={(id) => setActiveDocker(id)}
          activeTool={activeTool}
          onRefresh={() => {
            canvas?.renderAll();
            setSelectedObject(canvas?.getActiveObject() || null);
          }}
        />

        {/* Right-Side Vertical CorelDRAW Color Palette (L-Click Fill, R-Click Outline) */}
        <ColorPalette
          currentFill={currentFill}
          currentStroke={currentStroke}
          onSelectFill={handleSelectFill}
          onSelectStroke={handleSelectStroke}
          theme={theme}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          documentSwatches={currentDocumentPalette}
          onOpenPaletteEditor={handleOpenPaletteEditor}
        />
      </div>

      {/* Bottom Document Palette Strip (Auto-records selected colors for current document; Double-click -> Palette Editor) */}
      <DocumentPaletteBar
        swatches={currentDocumentPalette}
        currentFill={currentFill}
        currentStroke={currentStroke}
        onSelectFill={handleSelectFill}
        onSelectStroke={handleSelectStroke}
        onOpenPaletteEditor={handleOpenPaletteEditor}
        theme={theme}
      />

      {/* Bottom Status Bar */}
      <StatusBar
        cursorPos={cursorPos}
        selectionLabel={selectionLabel}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onZoomMode={handleZoomMode}
        pages={pages}
        activePageIndex={activePageIndex}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        theme={theme}
        currentFill={currentFill}
        currentStroke={currentStroke}
        orthoMode={!!snapConfig.orthoMode}
        onToggleOrtho={() =>
          setSnapConfig((prev) => {
            const next = !prev.orthoMode;
            showToast(next ? 'Ortho Mode: ON (0° / 90°)' : 'Ortho Mode: OFF');
            return { ...prev, orthoMode: next };
          })
        }
      />

      {/* Document Palette Editor & Nested Select Color Dialog */}
      <PaletteEditorModal
        isOpen={showPaletteEditor}
        swatches={currentDocumentPalette}
        initialSelectedIndex={paletteEditorSelectedIndex}
        documentName={documentName}
        onSave={handleSaveDocumentPalette}
        onClose={() => setShowPaletteEditor(false)}
      />

      {/* Save Drawing / Export Location & Rename Dialog */}
      <ExportModal
        canvas={canvas}
        pageConfig={pageConfig}
        documentName={documentName}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        defaultFormatExt={exportDefaultFormat}
        dialogMode={exportDialogMode}
        extraNdrData={
          canvas
            ? {
                pages,
                activePageIndex,
                pageCanvases: {
                  ...pageCanvasesRef.current,
                  [activePageIndex]: JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any)),
                },
                serializeProps: SERIALIZE_PROPERTIES,
                parametricState,
              }
            : undefined
        }
        pagesCount={pages.length}
        activePageIndex={activePageIndex}
        theme={theme}
        onExportSuccess={showToast}
        onSaveCompleted={(savedFilename) => {
          if (!canvas) return;
          const json = JSON.stringify(canvas.toObject(SERIALIZE_PROPERTIES as any));
          lastSavedSnapshotRef.current = json;
          setIsDirty(false);
          setDocumentName(savedFilename);
          recordRecentFile(savedFilename, json);
        }}
      />

      {/* Parameters Manager Modal (PARAMETERS / PAR) */}
      <ParametersManagerModal
        isOpen={showParametersManager}
        onClose={() => setShowParametersManager(false)}
        canvas={canvas}
        parametricState={parametricState}
        onUpdateState={handleUpdateParametricState}
        onAutoConstrain={handleAutoConstrain}
        onAddDimConstraint={handleAddDimConstraint}
        onAddGeomConstraint={handleAddGeomConstraint}
        unit={pageConfig.units}
        theme={theme}
      />

      {/* Random Filler Floating Tool Window (Tools -> Random Filler...) */}
      <RandomFillerModal
        canvas={canvas}
        pageConfig={pageConfig}
        isOpen={showRandomFillerModal}
        onClose={() => setShowRandomFillerModal(false)}
        theme={theme}
        onFillCommitted={(label, count) => {
          if (!canvas) return;
          setHasCanvasObjects(canvas.getObjects().length > 0);
          pushHistory(label);
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          showToast(`Random Filler: placed ${count} object(s) inside target`);
        }}
        onToast={showToast}
      />

      {/* Metallic Text & Object Effect Floating Window (Text -> Metallic Text & Effect) */}
      <MetallicTextModal
        canvas={canvas}
        isOpen={showMetallicModal}
        initialPreset={metallicInitialPreset}
        onClose={() => {
          setShowMetallicModal(false);
          setMetallicInitialPreset(null);
        }}
        theme={theme}
        onCommitted={(label) => {
          if (!canvas) return;
          setSelectedObject(canvas.getActiveObject() || null);
          pushHistory(label);
          socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
        }}
        onToast={showToast}
      />

      {/* Text Menu Dialogs (Edit Text, Statistics, Change Case, Tabs, Columns, Bullets, Drop Cap, Encode) */}
      <TextToolsModals
        activeDialog={activeTextDialog}
        onClose={() => setActiveTextDialog(null)}
        canvas={canvas}
        selectedObject={selectedObject}
        theme={theme}
        onCanvasUpdated={() => {
          pushHistory();
          setSelectedObject(canvas?.getActiveObject() || null);
        }}
        onToast={showToast}
      />

      {/* Fit Text to Path Options & Live Adjustment Modal */}
      <FitTextToPathModal
        isOpen={showFitTextModal}
        onClose={() => {
          setShowFitTextModal(false);
          setFitTextPathTarget(null);
          setFitTextGroupTarget(null);
        }}
        canvas={canvas}
        targetPathObj={fitTextPathTarget}
        targetGroupObj={fitTextGroupTarget}
        defaultFontFamily={properties.fontFamily || 'Arial'}
        defaultFontSize={properties.fontSize || 28}
        defaultFill={currentFill === 'transparent' ? '#111827' : currentFill}
        theme={theme}
        onApplied={(newGrp) => {
          setSelectedObject(newGrp);
          pushHistory('Fit Text to Path');
          if (canvas) {
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          }
          showToast('Fitted text to path');
        }}
      />

      {/* Effects Menu Dialogs (Bevel, Blend, Contour, Envelope, Extrude, Lens, PhotoCocktail, Pointillizer & Filters) */}
      <EffectToolsModal
        dialog={activeEffectDialog}
        onClose={() => setActiveEffectDialog(null)}
        canvas={canvas}
        selectedObject={selectedObject}
        theme={theme}
        onCanvasUpdated={(label) => {
          pushHistory(label);
          setSelectedObject(canvas?.getActiveObject() || null);
          if (canvas) {
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          }
        }}
        onToast={showToast}
      />

      {/* Vector QR Code Generator Modal */}
      <QrCodeModal
        isOpen={showQrCodeModal}
        onClose={() => setShowQrCodeModal(false)}
        canvas={canvas}
        selectedObject={selectedObject}
        pageConfig={pageConfig}
        theme={theme}
        onCanvasUpdated={(label) => {
          pushHistory(label);
          setSelectedObject(canvas?.getActiveObject() || null);
          if (canvas) {
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          }
        }}
        onToast={showToast}
      />

      {/* CorelDRAW Fountain Fill Modal (F11) */}
      <FountainFillModal
        isOpen={showFountainFillModal}
        onClose={() => setShowFountainFillModal(false)}
        canvas={canvas}
        selectedObject={selectedObject}
        currentFill={currentFill}
        theme={theme}
        onApplied={(label) => {
          pushHistory(label || 'Fountain Fill');
          setSelectedObject(canvas?.getActiveObject() || null);
          if (canvas) {
            socketService.sendCanvasUpdate(canvas.toObject(SERIALIZE_PROPERTIES as any), 'modify');
          }
        }}
        onToast={showToast}
      />

      {/* Floating Draggable Project Timer Window */}
      <ProjectTimerWindow
        isOpen={showProjectTimer}
        onClose={() => setShowProjectTimer(false)}
        projectName={documentName || activeDocTab}
        timerState={currentTimerState}
        onPlay={handleTimerPlay}
        onPause={handleTimerPause}
        onStop={() => {
          const hadSec = currentTimerState.sessionSeconds;
          handleTimerStop();
          if (hadSec > 0) {
            showToast(`Session logged (${formatDurationHMS(hadSec)})`);
          }
        }}
        onReset={() => {
          handleTimerReset();
          showToast('Project timer reset to 00:00:00');
        }}
        autoTrackEnabled={autoTrackTimer}
        onToggleAutoTrack={() => setAutoTrackTimer((v) => !v)}
        theme={theme}
      />

      {/* CorelDRAW Settings / Options Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        pageConfig={pageConfig}
        onUpdatePageConfig={handleUpdatePageConfig}
        workspaceBg={workspaceBg}
        onWorkspaceBgChange={handleWorkspaceBgChange}
        currentUser={currentUser}
        onUpdateUserName={handleUpdateUserName}
      />

      {/* CorelDRAW Page Setup Modal */}
      <PageSetupModal
        isOpen={showPageSetupModal}
        onClose={() => setShowPageSetupModal(false)}
        pageConfig={pageConfig}
        onUpdatePageConfig={handleUpdatePageConfig}
        totalPagesCount={pages.length}
        activePageIndex={activePageIndex}
        theme={theme}
        initialTab={pageSetupTab}
      />

      {/* New from Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[520px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">New from Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 my-4 max-h-72 overflow-y-auto">
              {[
                { name: 'A4 Poster Portrait', preset: 'A4', w: 794, h: 1123, units: 'mm' as const },
                { name: 'Business Card (85×55mm)', preset: 'Custom', w: 321, h: 208, units: 'mm' as const },
                { name: 'Social Square (1080×1080)', preset: 'Custom', w: 1080, h: 1080, units: 'px' as const },
                { name: 'A3 Blueprint Landscape', preset: 'A3', w: 1587, h: 1123, units: 'mm' as const },
              ].map((t) => (
                <button
                  key={t.name}
                  onClick={() => {
                    handleNewDocument();
                    handleUpdatePageConfig({ preset: t.preset, width: t.w, height: t.h, units: t.units });
                    setShowTemplateModal(false);
                    showToast(`Created from template "${t.name}"`);
                  }}
                  className="p-3 rounded border border-zinc-700 bg-zinc-800/70 hover:border-sky-500 text-left transition"
                >
                  <div className="font-semibold text-xs text-white">{t.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{t.w} × {t.h} px ({t.units})</div>
                </button>
              ))}
              {customTemplates.map((ct) => (
                <button
                  key={ct.id}
                  onClick={async () => {
                    if (!canvas) return;
                    handleNewDocument();
                    handleUpdatePageConfig(ct.pageConfig);
                    await canvas.loadFromJSON(ct.canvasData);
                    canvas.requestRenderAll();
                    setShowTemplateModal(false);
                    showToast(`Loaded custom template "${ct.name}"`);
                  }}
                  className="p-3 rounded border border-emerald-700/60 bg-emerald-950/30 hover:border-emerald-400 text-left transition"
                >
                  <div className="font-semibold text-xs text-emerald-300">{ct.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Saved User Template</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowTemplateModal(false)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Open from Cloud Workspace Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[460px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Open from Cloud Workspace</h3>
              <button onClick={() => setShowCloudModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-2 max-h-64 overflow-y-auto">
              {cloudDocs.length === 0 ? (
                <div className="text-xs text-zinc-400 italic py-6 text-center">
                  No cloud documents saved yet. Use File → Save to Cloud... first.
                </div>
              ) : (
                cloudDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={async () => {
                      if (!canvas) return;
                      handleUpdatePageConfig(doc.pageConfig);
                      await canvas.loadFromJSON(doc.canvasData);
                      canvas.requestRenderAll();
                      setDocumentName(doc.name);
                      lastSavedSnapshotRef.current = JSON.stringify(doc.canvasData);
                      setIsDirty(false);
                      setShowCloudModal(false);
                      showToast(`Loaded "${doc.name}" from Cloud`);
                    }}
                    className="w-full p-2.5 rounded border border-zinc-700 bg-zinc-800/70 hover:border-sky-500 flex items-center justify-between text-left transition"
                  >
                    <span className="font-semibold text-xs text-white">{doc.name}</span>
                    <span className="text-[10px] text-zinc-400">{doc.savedAt}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  handleSaveToCloud();
                }}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs text-white font-medium"
              >
                Save Current to Cloud
              </button>
              <button onClick={() => setShowCloudModal(false)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[640px] max-w-[92vw] shadow-2xl text-zinc-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">
                Print Preview — {documentName} ({pageConfig.preset}, {pageConfig.width}×{pageConfig.height}px)
              </h3>
              <button onClick={() => setShowPrintPreviewModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-900/80 rounded my-4 p-6 flex items-center justify-center">
              {printPreviewDataUrl && (
                <div className="bg-white shadow-2xl border border-zinc-400 p-2 max-h-[60vh]">
                  <img src={printPreviewDataUrl} alt="Print Preview" className="max-h-[55vh] w-auto object-contain" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleQuickExport('pdf')}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
              >
                Publish to PDF
              </button>
              <button
                onClick={() => {
                  setShowPrintPreviewModal(false);
                  window.print();
                }}
                className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold"
              >
                Print...
              </button>
              <button onClick={() => setShowPrintPreviewModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Properties From Modal */}
      {showCopyPropsModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[380px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Copy Properties From...</h3>
              <button onClick={() => setShowCopyPropsModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Source Object on Canvas</label>
                <select
                  value={copyPropsSourceId}
                  onChange={(e) => setCopyPropsSourceId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                >
                  {(canvas?.getObjects() || []).map((o, idx) => {
                    if (o === selectedObject || o.selectable === false) return null;
                    const val = (o as any).id || String(idx);
                    return (
                      <option key={val} value={val}>
                        {getObjectLabel(o)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={copyPropsStrokeWidth} onChange={(e) => setCopyPropsStrokeWidth(e.target.checked)} />
                  <span>Outline Pen (Width)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={copyPropsStrokeColor} onChange={(e) => setCopyPropsStrokeColor(e.target.checked)} />
                  <span>Outline Color</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={copyPropsFill} onChange={(e) => setCopyPropsFill(e.target.checked)} />
                  <span>Fill</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCopyPropsModal(false)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyCopyProperties} className="px-4 py-1 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Special Modal */}
      {showPasteSpecialModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[360px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Paste Special</h3>
              <button onClick={() => setShowPasteSpecialModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-2.5 text-xs">
              <label className="flex items-center gap-2.5 p-2 rounded border border-zinc-700 bg-zinc-800/70 cursor-pointer">
                <input
                  type="radio"
                  name="pasteSpecial"
                  checked={pasteSpecialFormat === 'vector'}
                  onChange={() => setPasteSpecialFormat('vector')}
                />
                <div>
                  <div className="font-semibold text-white">CorelDRAW Vector Object</div>
                  <div className="text-[11px] text-zinc-400">Paste full fill, outline, curves & attributes</div>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-2 rounded border border-zinc-700 bg-zinc-800/70 cursor-pointer">
                <input
                  type="radio"
                  name="pasteSpecial"
                  checked={pasteSpecialFormat === 'outline'}
                  onChange={() => setPasteSpecialFormat('outline')}
                />
                <div>
                  <div className="font-semibold text-white">Outline / Wireframe Only</div>
                  <div className="text-[11px] text-zinc-400">Strip fill and preserve vector stroke path</div>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-2 rounded border border-zinc-700 bg-zinc-800/70 cursor-pointer">
                <input
                  type="radio"
                  name="pasteSpecial"
                  checked={pasteSpecialFormat === 'text'}
                  onChange={() => setPasteSpecialFormat('text')}
                />
                <div>
                  <div className="font-semibold text-white">Unformatted Text</div>
                  <div className="text-[11px] text-zinc-400">Paste as editable plain Artistic Text</div>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasteSpecialModal(false)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyPasteSpecial} className="px-4 py-1 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">Paste</button>
            </div>
          </div>
        </div>
      )}

      {/* Find and Replace Modal (Ctrl+F) */}
      {showFindReplaceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[420px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Find and Replace (Ctrl+F)</h3>
              <button onClick={() => setShowFindReplaceModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="flex gap-1 mt-3 bg-zinc-900 p-1 rounded text-xs">
              <button
                onClick={() => setFindReplaceTab('text')}
                className={`flex-1 py-1 rounded font-medium ${findReplaceTab === 'text' ? 'bg-[#0078d7] text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Replace Text
              </button>
              <button
                onClick={() => setFindReplaceTab('color')}
                className={`flex-1 py-1 rounded font-medium ${findReplaceTab === 'color' ? 'bg-[#0078d7] text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Replace Color
              </button>
            </div>
            {findReplaceTab === 'text' ? (
              <div className="my-4 space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Find Text</label>
                  <input
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="Text to find..."
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Replace With</label>
                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Replacement text..."
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={findCaseSensitive} onChange={(e) => setFindCaseSensitive(e.target.checked)} />
                  <span>Match case</span>
                </label>
              </div>
            ) : (
              <div className="my-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Find Color</label>
                    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded px-2 py-1">
                      <input type="color" value={findColorHex} onChange={(e) => setFindColorHex(e.target.value)} className="w-6 h-6 bg-transparent border-0 cursor-pointer" />
                      <input type="text" value={findColorHex} onChange={(e) => setFindColorHex(e.target.value)} className="w-full bg-transparent text-zinc-100 outline-none font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Replace Color</label>
                    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded px-2 py-1">
                      <input type="color" value={replaceColorHex} onChange={(e) => setReplaceColorHex(e.target.value)} className="w-6 h-6 bg-transparent border-0 cursor-pointer" />
                      <input type="text" value={replaceColorHex} onChange={(e) => setReplaceColorHex(e.target.value)} className="w-full bg-transparent text-zinc-100 outline-none font-mono" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Apply To</label>
                  <select
                    value={findColorScope}
                    onChange={(e) => setFindColorScope(e.target.value as 'fill' | 'stroke' | 'both')}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none"
                  >
                    <option value="fill">Fills Only</option>
                    <option value="stroke">Outlines Only</option>
                    <option value="both">Fills &amp; Outlines</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={handleFindNextMatch} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-medium">Find Next</button>
              <button onClick={handleReplaceAllMatches} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">Replace All</button>
              <button onClick={() => setShowFindReplaceModal(false)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Step and Repeat Modal (Ctrl+Shift+D) */}
      {showStepRepeatModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[380px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Step and Repeat (Ctrl+Shift+D)</h3>
              <button onClick={() => setShowStepRepeatModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Horizontal Copies</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={stepCols}
                  onChange={(e) => setStepCols(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Vertical Copies</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={stepRows}
                  onChange={(e) => setStepRows(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Horizontal Offset (px)</label>
                <input
                  type="number"
                  value={stepOffsetX}
                  onChange={(e) => setStepOffsetX(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Vertical Offset (px)</label>
                <input
                  type="number"
                  value={stepOffsetY}
                  onChange={(e) => setStepOffsetY(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStepRepeatModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button
                onClick={() => handleApplyStepAndRepeat()}
                disabled={!selectedObject}
                className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] disabled:opacity-40 text-white rounded text-xs font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multipage View Spread Strip Overlay */}
      {multipageView && (
        <div className="fixed top-24 right-14 z-40 bg-[#4d5056]/95 border border-[#6b6f78] rounded-md shadow-2xl p-3 w-72 text-zinc-100 select-none">
          <div className="flex items-center justify-between border-b border-zinc-700 pb-2 mb-2.5">
            <span className="text-xs font-semibold">Multipage View ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})</span>
            <button onClick={() => setMultipageView(false)} className="text-zinc-400 hover:text-white text-xs px-1.5">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {pages.map((p, idx) => (
              <button
                key={`${p.name}-${idx}`}
                onClick={() => handleSelectPage(idx)}
                className={`p-2 rounded border text-left transition ${
                  activePageIndex === idx
                    ? 'border-[#0078d7] bg-[#0078d7]/20 text-white'
                    : 'border-zinc-700 bg-zinc-800/70 hover:border-zinc-500'
                }`}
              >
                <div className="w-full h-14 bg-white rounded-xs border border-zinc-400 mb-1.5 flex items-center justify-center text-[10px] text-zinc-500">
                  {p.preset}
                </div>
                <div className="text-[11px] font-semibold truncate">{p.name || `Page ${idx + 1}`}</div>
                <div className="text-[10px] text-zinc-400">{p.width}×{p.height}px</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleAddPage}
            className="mt-2.5 w-full py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-medium"
          >
            + Add Page
          </button>
        </div>
      )}

      {/* Insert Page Modal */}
      {showInsertPageModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[380px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Insert Page</h3>
              <button onClick={() => setShowInsertPageModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Number of Pages</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={insertPageCount}
                  onChange={(e) => setInsertPageCount(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={insertPagePlacement === 'before'}
                    onChange={() => setInsertPagePlacement('before')}
                  />
                  <span>Before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={insertPagePlacement === 'after'}
                    onChange={() => setInsertPagePlacement('after')}
                  />
                  <span>After</span>
                </label>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Existing Page (1–{pages.length})</label>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={insertPageTarget}
                  onChange={(e) => setInsertPageTarget(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowInsertPageModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyInsertPages} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Page Modal */}
      {showDuplicatePageModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[380px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Duplicate Page ({pageConfig.name})</h3>
              <button onClick={() => setShowDuplicatePageModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div className="text-zinc-400">Insert Duplicate Page:</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={dupPagePlacement === 'before'}
                    onChange={() => setDupPagePlacement('before')}
                  />
                  <span>Before selected page</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={dupPagePlacement === 'after'}
                    onChange={() => setDupPagePlacement('after')}
                  />
                  <span>After selected page</span>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={dupCopyContents}
                  onChange={(e) => setDupCopyContents(e.target.checked)}
                />
                <span>Copy layers and their contents</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDuplicatePageModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyDuplicatePage} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Page Modal */}
      {showRenamePageModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[360px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Rename Page</h3>
              <button onClick={() => setShowRenamePageModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 text-xs">
              <label className="block text-zinc-400 mb-1">Page Name</label>
              <input
                type="text"
                autoFocus
                value={renamePageValue}
                onChange={(e) => setRenamePageValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyRenamePage();
                }}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRenamePageModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyRenamePage} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Modal */}
      {showDeletePageModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[360px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Delete Page</h3>
              <button onClick={() => setShowDeletePageModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Delete Page Number (1–{pages.length})</label>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={deletePageTarget}
                  onChange={(e) => setDeletePageTarget(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                Selected page: <span className="text-zinc-200 font-medium">{pages[Math.max(0, Math.min(pages.length - 1, deletePageTarget - 1))]?.name}</span>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeletePageModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyDeletePage} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Go to Page Modal */}
      {showGoToPageModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[340px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Go to Page</h3>
              <button onClick={() => setShowGoToPageModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 text-xs space-y-2">
              <label className="block text-zinc-400">Page Number (1 to {pages.length})</label>
              <input
                type="number"
                autoFocus
                min={1}
                max={pages.length}
                value={goToPageValue}
                onChange={(e) => setGoToPageValue(Number(e.target.value) || 1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyGoToPage();
                }}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowGoToPageModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyGoToPage} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Page Number Settings Modal */}
      {showPageNumSettingsModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[400px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Page Number Settings</h3>
              <button onClick={() => setShowPageNumSettingsModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Start at Number</label>
                  <input
                    type="number"
                    min={1}
                    value={pageNumStartAt}
                    onChange={(e) => setPageNumStartAt(Number(e.target.value) || 1)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Font Size (px)</label>
                  <input
                    type="number"
                    min={8}
                    max={96}
                    value={pageNumFontSize}
                    onChange={(e) => setPageNumFontSize(Number(e.target.value) || 14)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Style</label>
                <select
                  value={pageNumStyle}
                  onChange={(e) => setPageNumStyle(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none"
                >
                  <option value="arabic">1, 2, 3, ...</option>
                  <option value="roman_lower">i, ii, iii, ...</option>
                  <option value="roman_upper">I, II, III, ...</option>
                  <option value="alpha_lower">a, b, c, ...</option>
                  <option value="alpha_upper">A, B, C, ...</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Prefix (optional, e.g. &quot;Page &quot;)</label>
                <input
                  type="text"
                  value={pageNumPrefix}
                  onChange={(e) => setPageNumPrefix(e.target.value)}
                  placeholder="Page "
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Placement</label>
                <select
                  value={pageNumPosition}
                  onChange={(e) => setPageNumPosition(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-700 rounded px-3 py-2 flex items-center justify-between">
                <span className="text-zinc-400">Preview:</span>
                <span className="font-mono text-zinc-100 font-semibold">{formatPageNumberText(activePageIndex + 1)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPageNumSettingsModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Close</button>
              <button
                onClick={() => {
                  setShowPageNumSettingsModal(false);
                  handleInsertPageNumber('all');
                }}
                className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold"
              >
                Apply &amp; Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Border and Grommet Modal */}
      {showBorderGrommetModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[420px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Border and Grommet</h3>
              <button onClick={() => setShowBorderGrommetModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Border Margin (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={bgMarginPx}
                    onChange={(e) => setBgMarginPx(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Border Width (px)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={bgStrokeWidth}
                    onChange={(e) => setBgStrokeWidth(Number(e.target.value) || 1)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Horizontal Grommets</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={bgHorizGrommets}
                    onChange={(e) => setBgHorizGrommets(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Vertical Grommets</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={bgVertGrommets}
                    onChange={(e) => setBgVertGrommets(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Grommet Diameter (px)</label>
                  <input
                    type="number"
                    min={4}
                    max={48}
                    value={bgGrommetDiameter}
                    onChange={(e) => setBgGrommetDiameter(Number(e.target.value) || 12)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Grommet Ring Color</label>
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded px-2 py-1">
                    <input type="color" value={bgGrommetColor} onChange={(e) => setBgGrommetColor(e.target.value)} className="w-5 h-5 bg-transparent border-0 cursor-pointer" />
                    <input type="text" value={bgGrommetColor} onChange={(e) => setBgGrommetColor(e.target.value)} className="w-full bg-transparent text-zinc-100 outline-none font-mono" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Border Stroke Color</label>
                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded px-2 py-1">
                  <input type="color" value={bgStrokeColor} onChange={(e) => setBgStrokeColor(e.target.value)} className="w-5 h-5 bg-transparent border-0 cursor-pointer" />
                  <input type="text" value={bgStrokeColor} onChange={(e) => setBgStrokeColor(e.target.value)} className="w-full bg-transparent text-zinc-100 outline-none font-mono" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBorderGrommetModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyBorderAndGrommet} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Bitmap Modal */}
      {showConvertBitmapModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[390px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Convert to Bitmap</h3>
              <button onClick={() => setShowConvertBitmapModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Resolution (DPI)</label>
                <select
                  value={bitmapDpi}
                  onChange={(e) => setBitmapDpi(Number(e.target.value) || 300)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none"
                >
                  <option value={72}>72 dpi (Web / Screen)</option>
                  <option value={96}>96 dpi (Standard)</option>
                  <option value={150}>150 dpi (Draft Print)</option>
                  <option value={200}>200 dpi (Medium Print)</option>
                  <option value={300}>300 dpi (High-Quality Print)</option>
                  <option value={600}>600 dpi (Press Quality)</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Color Mode</label>
                <select
                  value={bitmapColorMode}
                  onChange={(e) => setBitmapColorMode(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1.5 text-zinc-100 outline-none"
                >
                  <option value="rgb">RGB Color (24-bit)</option>
                  <option value="cmyk">CMYK Color (32-bit)</option>
                  <option value="grayscale">Grayscale (8-bit)</option>
                  <option value="bw">Black and White (1-bit)</option>
                </select>
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bitmapAntiAlias}
                    onChange={(e) => setBitmapAntiAlias(e.target.checked)}
                  />
                  <span>Anti-aliasing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bitmapTransparentBg}
                    onChange={(e) => setBitmapTransparentBg(e.target.checked)}
                  />
                  <span>Transparent background</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConvertBitmapModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyConvertToBitmap} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Straighten Image Modal */}
      {showStraightenModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[520px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Straighten Image</h3>
              <button onClick={() => setShowStraightenModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>
            <div className="my-4 space-y-4 text-xs">
              {/* Interactive Horizon Preview */}
              <div className="relative h-56 bg-zinc-900 border border-zinc-700 rounded overflow-hidden flex items-center justify-center">
                {straightenPreviewUrl ? (
                  <img
                    src={straightenPreviewUrl}
                    alt="Straighten preview"
                    className="max-h-44 max-w-[85%] object-contain transition-transform duration-75"
                    style={{
                      transform: `rotate(${straightenAngle}deg) scale(${straightenAutoCrop ? 1 + Math.sin((Math.abs(straightenAngle) * Math.PI) / 180) * 0.45 : 1})`,
                    }}
                  />
                ) : (
                  <span className="text-zinc-500">No preview available</span>
                )}
                {straightenShowGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-45"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.5) 1px, transparent 1px)',
                      backgroundSize: '28px 28px',
                    }}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400">Rotate Angle (-45° to +45°)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={-45}
                      max={45}
                      step={0.1}
                      value={straightenAngle}
                      onChange={(e) => setStraightenAngle(Math.max(-45, Math.min(45, Number(e.target.value) || 0)))}
                      className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-right font-mono text-zinc-100 outline-none focus:border-sky-500"
                    />
                    <span className="text-zinc-400">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={0.1}
                  value={straightenAngle}
                  onChange={(e) => setStraightenAngle(Number(e.target.value))}
                  className="w-full accent-[#0078d7]"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={straightenAutoCrop}
                        onChange={(e) => setStraightenAutoCrop(e.target.checked)}
                      />
                      <span>Crop Image</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={straightenShowGrid}
                        onChange={(e) => setStraightenShowGrid(e.target.checked)}
                      />
                      <span>Show Grid</span>
                    </label>
                  </div>
                  <button
                    onClick={() => setStraightenAngle(0)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-[11px]"
                  >
                    Reset 0°
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStraightenModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
              <button onClick={handleApplyStraightenImage} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Adjustment Lab Modal */}
      {showAdjLabModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
          <div className="bg-[#4d5056] border border-[#686c75] rounded-lg p-5 w-[680px] shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
              <h3 className="font-semibold text-sm">Image Adjustment Lab</h3>
              <button onClick={() => setShowAdjLabModal(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
            </div>

            <div className="grid grid-cols-12 gap-4 my-4 text-xs">
              {/* Preview Pane */}
              <div className="col-span-6 flex flex-col gap-2">
                <div className="h-64 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center overflow-hidden p-2 relative">
                  {adjPreviewUrl ? (
                    <img
                      src={adjPreviewUrl}
                      alt="Adjustment preview"
                      className="max-h-full max-w-full object-contain"
                      style={
                        adjShowOriginal
                          ? undefined
                          : {
                              filter: `brightness(${Math.max(0.1, (1 + adjBrightness / 100) * (1 / Math.max(0.4, adjGamma)))}) contrast(${Math.max(0.1, 1 + adjContrast / 100)}) saturate(${Math.max(0, 1 + (adjSaturation + adjVibrance * 0.5) / 100)}) sepia(${Math.max(0, adjTemperature / 220)}) hue-rotate(${adjTint * 0.45 - Math.min(0, adjTemperature) * 0.25}deg)`,
                            }
                      }
                    />
                  ) : (
                    <span className="text-zinc-500">No preview available</span>
                  )}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-zinc-300">
                    {adjShowOriginal ? 'Original' : 'Adjusted'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={() => setAdjShowOriginal(true)}
                    onMouseUp={() => setAdjShowOriginal(false)}
                    onMouseLeave={() => setAdjShowOriginal(false)}
                    onClick={() => setAdjShowOriginal((p) => !p)}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded font-medium"
                  >
                    {adjShowOriginal ? 'Showing Original (Click to Toggle)' : 'Before / After'}
                  </button>
                  <button
                    onClick={() => {
                      setAdjBrightness(8);
                      setAdjContrast(16);
                      setAdjSaturation(12);
                      setAdjVibrance(18);
                      setAdjTemperature(4);
                      setAdjTint(0);
                      setAdjGamma(1.0);
                    }}
                    className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded font-medium"
                  >
                    Auto Adjust
                  </button>
                </div>
              </div>

              {/* Controls Pane */}
              <div className="col-span-6 space-y-2.5 pr-1">
                {[
                  { label: 'Temperature', val: adjTemperature, set: setAdjTemperature, min: -100, max: 100, step: 1 },
                  { label: 'Tint', val: adjTint, set: setAdjTint, min: -100, max: 100, step: 1 },
                  { label: 'Saturation', val: adjSaturation, set: setAdjSaturation, min: -100, max: 100, step: 1 },
                  { label: 'Vibrance', val: adjVibrance, set: setAdjVibrance, min: -100, max: 100, step: 1 },
                  { label: 'Brightness', val: adjBrightness, set: setAdjBrightness, min: -100, max: 100, step: 1 },
                  { label: 'Contrast', val: adjContrast, set: setAdjContrast, min: -100, max: 100, step: 1 },
                  { label: 'Highlights / Gamma', val: adjGamma, set: setAdjGamma, min: 0.2, max: 2.2, step: 0.05 },
                ].map((ctrl) => (
                  <div key={ctrl.label}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-zinc-300">{ctrl.label}</span>
                      <span className="font-mono text-zinc-400">
                        {ctrl.step < 1 ? ctrl.val.toFixed(2) : ctrl.val}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={ctrl.val}
                      onChange={(e) => ctrl.set(Number(e.target.value))}
                      className="w-full accent-[#0078d7]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
              <button
                onClick={() => {
                  setAdjTemperature(0);
                  setAdjTint(0);
                  setAdjSaturation(0);
                  setAdjBrightness(0);
                  setAdjContrast(0);
                  setAdjVibrance(0);
                  setAdjGamma(1.0);
                  setAdjShowOriginal(false);
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-xs"
              >
                Reset to Original
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowAdjLabModal(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">Cancel</button>
                <button onClick={handleApplyImageAdjustmentLab} className="px-4 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-semibold">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Preview Overlay (F9 / Preview Selected Only) */}
      {fullScreenPreviewUrl && (
        <div
          onClick={() => setFullScreenPreviewUrl(null)}
          className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6 cursor-pointer select-none"
        >
          <div className="absolute top-3 right-4 flex items-center gap-3 bg-zinc-900/80 border border-zinc-700 px-3 py-1 rounded text-xs text-zinc-300">
            <span>{fullScreenPreviewLabel}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenPreviewUrl(null);
              }}
              className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-white"
            >
              Exit (Esc)
            </button>
          </div>
          <img
            src={fullScreenPreviewUrl}
            alt="Full-Screen Preview"
            className="max-w-[95vw] max-h-[92vh] object-contain shadow-2xl border border-zinc-700 bg-white"
          />
        </div>
      )}
    </div>
  );
}
