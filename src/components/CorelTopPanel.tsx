import React, { useState, useRef } from 'react';
import {
  IconDocNew,
  IconFolderOpen,
  IconSaveDisk,
  IconCloudOpen,
  IconCloudSave,
  IconPrinter,
  IconCut,
  IconCopyDoc,
  IconPasteDoc,
  IconImportArrow,
  IconExportArrow,
  IconExportPdf,
  IconFullScreenF9,
  IconRulersEye,
  IconGridEye,
  IconGuidelinesEye,
  IconSnapToggle,
  IconMirrorHorizontal,
  IconMirrorVertical,
  IconCornerRound,
  IconCornerScallop,
  IconCornerChamfer,
  IconPenNib,
  IconPowerClip,
  IconTemplateNew,
  IconCloseDoc,
  IconCloseAllDocs,
  IconSaveAsPlus,
  IconSaveTemplate,
  IconRevertDoc,
  IconPrintPreview,
  IconDocProperties,
  IconPowerExit,
  IconUndoMenu,
  IconRedoMenu,
  IconRepeatMenu,
  IconBringIntoFocus,
  IconExitFocusMode,
  IconCopyProperties,
  IconPasteInView,
  IconPasteSpecial,
  IconTrashDelete,
  IconDuplicatePlus,
  IconCloneDual,
  IconPreviewSelected,
  IconZoomInMenu,
  IconZoomOutMenu,
  IconZoomToFitMenu,
  IconInsertPage,
  IconDuplicatePage,
  IconRenamePage,
  IconDeletePage,
  IconGoToPage,
  IconLayerActive,
  IconAllPages123,
  IconOddPages135,
  IconEvenPages246,
  IconPageNumberSettings,
  IconSwitchOrientation,
  IconDocOptions,
  IconPageSize,
  IconPageLayout,
  IconPageBackground,
  IconBorderGrommet,
  IconConvertToBitmap,
  IconStraightenImage,
  IconImageAdjustmentLab,
  IconCmykSeparation,
  IconTextTabs,
  IconTextColumns,
  IconBulletsNumbering,
  IconDropCap,
  IconTextStatistics,
  IconEditText,
  IconConvertParagraphText,
  IconFitTextToPath,
  IconStraightenText,
  IconAlignToBaseline,
  IconChangeCase,
  IconEncodeText,
  IconNudgeDistance,
  IconAutofitPage,
  IconSymmetryCreate,
  IconSymmetryEdit,
  IconSymmetryFinish,
  IconSymmetryRemove,
  IconSymmetryBreak,
} from './CorelTopPanelIcons';
import {
  Undo2,
  Redo2,
  Settings,
  ExternalLink,
  ChevronDown,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  Layers,
  Users,
  Share2,
  Check,
  Maximize2,
  Sun,
  Moon,
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
  X,
  Plus,
  Spline,
  QrCode,
  Timer,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatDurationHMS, TimerStatus } from './ProjectTimerWindow';
import {
  PageConfig,
  PropertyState,
  CollaboratorUser,
  ThemeMode,
  SnapConfig,
  ToolType,
  CurveActionType,
  CurveEditState,
  ViewQualityMode,
  DimensionConfig,
  CropToolsConfig,
  CropActionType,
  ZoomPresetMode,
  SymmetryConfig,
} from '../types';
import {
  IconDimension,
  IconHVDimension,
  IconAngularDimension,
  IconSegmentDimension,
  IconCallout,
  IconShadow,
  IconContour,
  IconBlend,
  IconDistort,
  IconEnvelope,
  IconExtrude,
  IconBlockShadow,
  IconFreehand,
  IconLine2P,
  IconBezier,
  IconPen,
  IconBSpline,
  IconPolyline,
  IconCurve3P,
  IconCrop,
  IconKnife,
  IconVirtualSegmentDelete,
  IconEraser,
  IconEyedropper,
} from './CorelToolIcons';
import { ALL_UNITS, PAGE_PRESETS, UNITS_DATA, pxToUnit, unitToPx } from '../utils/units';
import { POPULAR_FONTS, FONT_SIZES } from '../utils/fonts';

interface CorelTopPanelProps {
  documentName: string;
  onDocumentNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canPaste?: boolean;
  theme: ThemeMode;
  onOpenSettings: () => void;
  onOpenPageSetup?: () => void;
  onAddPage?: () => void;
  onToggleTheme: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomSet: (zoom: number) => void;
  onZoomMode?: (mode: ZoomPresetMode) => void;
  zoomLevel: number;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onExport: (format: 'ndr' | 'dwg' | 'svg' | 'pdf' | 'png' | 'json') => void;
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
  // Object properties
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
  onUngroupAll?: () => void;
  onEnterGroupEdit?: () => void;
  onExitGroupEdit?: () => void;
  groupEditDepth?: number;
  snapConfig?: SnapConfig;
  onUpdateSnapConfig?: (snap: Partial<SnapConfig>) => void;
  activeTool?: ToolType;
  onPowerClipPlace?: () => void;
  onPowerClipExtract?: () => void;
  onPowerClipEdit?: () => void;
  onPowerClipFinish?: () => void;
  isPowerClipEditing?: boolean;
  symmetryEditingConfig?: SymmetryConfig | null;
  onUpdateSymmetryConfig?: (cfg: Partial<SymmetryConfig>) => void;
  onCreateSymmetry?: () => void;
  onEditSymmetry?: () => void;
  onFinishSymmetry?: () => void;
  onRemoveSymmetry?: () => void;
  onBreakSymmetryLink?: () => void;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-page') => void;
  onConvertToCurves?: () => void;
  curveEditState?: CurveEditState;
  onCurveAction?: (action: CurveActionType) => void;
  // Document tabs matching image_2b0a935b.png
  docTabs?: string[];
  activeDocTab?: string;
  onSelectDocTab?: (tab: string) => void;
  onCloseDocTab?: (tab: string) => void;
  onNewDocTab?: () => void;
  onOpenWelcome?: () => void;
  showWelcomeScreen?: boolean;
  // Extended File Menu actions matching file_tab_e99c7ee2.png
  onNewFromTemplate?: () => void;
  onOpenFromCloud?: () => void;
  recentFiles?: { name: string; savedAt: string }[];
  onOpenRecent?: (name: string) => void;
  onCloseDocument?: () => void;
  onCloseAllDocuments?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onSaveToCloud?: () => void;
  onSaveAsTemplate?: () => void;
  onRevert?: () => void;
  canSave?: boolean;
  isDirty?: boolean;
  canRevert?: boolean;
  onAcquireImage?: (source: 'file' | 'clipboard') => void;
  onImport?: () => void;
  onQuickExport?: (format: 'ndr' | 'dwg' | 'svg' | 'pdf' | 'png' | 'json', scale?: number) => void;
  onSendTo?: (target: 'desktop' | 'mail' | 'cloud') => void;
  onPrintMerge?: (action: 'insert_field' | 'csv') => void;
  onPrint?: () => void;
  onPrintPreview?: () => void;
  onExit?: () => void;
  // Extended Edit Menu actions matching edit_tab_c6f39bd0.jpg
  undoLabel?: string;
  canRepeat?: boolean;
  onRepeat?: () => void;
  isFocusMode?: boolean;
  onBringIntoFocus?: () => void;
  onExitFocusMode?: () => void;
  onCopyPropertiesFrom?: () => void;
  onPasteInView?: () => void;
  onPasteSpecial?: () => void;
  onClone?: () => void;
  onSelectAll?: (mode: 'objects' | 'text' | 'curves' | 'nodes') => void;
  findReplaceOpen?: boolean;
  onOpenFindReplace?: () => void;
  onOpenStepAndRepeat?: () => void;
  // Extended View Menu actions matching view tab screenshot
  viewQualityMode?: ViewQualityMode;
  onChangeViewQualityMode?: (mode: ViewQualityMode) => void;
  onFullScreenPreview?: () => void;
  onPreviewSelectedOnly?: () => void;
  multipageView?: boolean;
  onToggleMultipageView?: () => void;
  hasCanvasObjects?: boolean;
  onZoomToFitObjects?: () => void;
  proofColors?: boolean;
  onToggleProofColors?: () => void;
  simulateOverprints?: boolean;
  onToggleSimulateOverprints?: () => void;
  rasterizeComplexEffects?: boolean;
  onToggleRasterizeComplexEffects?: () => void;
  showPrintableArea?: boolean;
  onTogglePrintableArea?: () => void;
  showBaselineGrid?: boolean;
  onToggleBaselineGrid?: () => void;
  showGuidelines?: boolean;
  onToggleGuidelines?: () => void;
  showAlignmentGuides?: boolean;
  onToggleAlignmentGuides?: () => void;
  showDynamicGuides?: boolean;
  onToggleDynamicGuides?: () => void;
  showDocNavigator?: boolean;
  onToggleDocNavigator?: () => void;
  showScrollbars?: boolean;
  onToggleScrollbars?: () => void;
  // Extended Layout Menu actions matching layout_tab_457dd0e8.png
  pagesCount?: number;
  onInsertPage?: () => void;
  onDuplicatePage?: () => void;
  onRenamePage?: () => void;
  onDeletePage?: () => void;
  onGoToPage?: () => void;
  onInsertPageNumber?: (mode: 'active' | 'all' | 'odd' | 'even') => void;
  onPageNumberSettings?: () => void;
  onOpenPageSetupTab?: (tab: 'size' | 'orientation' | 'units' | 'bleed' | 'background') => void;
  onBorderAndGrommet?: () => void;
  // Bitmap Menu actions
  onConvertToBitmap?: () => void;
  onStraightenImage?: () => void;
  onImageAdjustmentLab?: () => void;
  onBitmapGrayscale?: () => void;
  onBitmapInvert?: () => void;
  onBitmapCmykSeparation?: () => void;
  onSelectTool?: (tool: ToolType) => void;
  // Text Menu actions matching text_tab_ea200fa1.jpg
  showNonPrintingChars?: boolean;
  useHyphenation?: boolean;
  showTextFrames?: boolean;
  onTextAction?: (action: string, payload?: any) => void;
  // Effects Menu actions matching effect_tab_19a41bcd.jpg
  onEffectAction?: (action: string, payload?: any) => void;
  // QR Code Generator
  onOpenQrCode?: () => void;
  // Random Filler Macro
  onOpenRandomFiller?: () => void;
  // Project Timer
  showProjectTimer?: boolean;
  onToggleProjectTimer?: () => void;
  projectTimerSeconds?: number;
  projectTimerStatus?: TimerStatus;
  // Dimension Tool Settings
  dimensionConfig?: DimensionConfig;
  onUpdateDimensionConfig?: (cfg: Partial<DimensionConfig>) => void;
  // Crop / Knife / Virtual Segment Delete / Eraser Tool Settings
  cropToolsConfig?: CropToolsConfig;
  onUpdateCropToolsConfig?: (cfg: Partial<CropToolsConfig>) => void;
  onCropAction?: (action: CropActionType) => void;
  onAutofitPage?: (marginPx?: number) => void;
  currentFill?: string;
  currentStroke?: string;
}

const STROKE_WIDTHS = [
  { label: 'None', value: 0 },
  { label: 'Hairline', value: 0.25 },
  { label: '0.5 pt', value: 0.5 },
  { label: '0.75 pt', value: 0.75 },
  { label: '1.0 pt', value: 1 },
  { label: '1.5 pt', value: 1.5 },
  { label: '2.0 pt', value: 2 },
  { label: '3.0 pt', value: 3 },
  { label: '4.0 pt', value: 4 },
  { label: '6.0 pt', value: 6 },
  { label: '8.0 pt', value: 8 },
  { label: '12.0 pt', value: 12 },
];

export const CorelTopPanel: React.FC<CorelTopPanelProps> = ({
  documentName,
  onDocumentNameChange,
  canUndo,
  canRedo,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  canPaste,
  theme,
  onOpenSettings,
  onOpenPageSetup,
  onAddPage,
  onToggleTheme,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomSet,
  onZoomMode,
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
  onUngroupAll,
  onEnterGroupEdit,
  onExitGroupEdit,
  groupEditDepth = 0,
  snapConfig = {
    enabled: true,
    snapToGrid: false,
    snapToObjects: true,
    snapToPage: true,
    gridSize: 20,
    snapThreshold: 14,
  },
  onUpdateSnapConfig = () => {},
  activeTool = 'pick',
  onPowerClipPlace,
  onPowerClipExtract,
  onPowerClipEdit,
  onPowerClipFinish,
  isPowerClipEditing = false,
  symmetryEditingConfig = null,
  onUpdateSymmetryConfig,
  onCreateSymmetry,
  onEditSymmetry,
  onFinishSymmetry,
  onRemoveSymmetry,
  onBreakSymmetryLink,
  onAlign,
  onConvertToCurves,
  curveEditState,
  onCurveAction,
  docTabs = ['Untitled-1'],
  activeDocTab = 'Untitled-1',
  onSelectDocTab,
  onCloseDocTab,
  onNewDocTab,
  onOpenWelcome,
  showWelcomeScreen = false,
  onNewFromTemplate,
  onOpenFromCloud,
  recentFiles = [],
  onOpenRecent,
  onCloseDocument,
  onCloseAllDocuments,
  onSave,
  onSaveAs,
  onSaveToCloud,
  onSaveAsTemplate,
  onRevert,
  canSave = true,
  isDirty = false,
  canRevert = false,
  onAcquireImage,
  onImport,
  onQuickExport,
  onSendTo,
  onPrintMerge,
  onPrint,
  onPrintPreview,
  onExit,
  undoLabel = '',
  canRepeat = false,
  onRepeat,
  isFocusMode = false,
  onBringIntoFocus,
  onExitFocusMode,
  onCopyPropertiesFrom,
  onPasteInView,
  onPasteSpecial,
  onClone,
  onSelectAll,
  findReplaceOpen = false,
  onOpenFindReplace,
  onOpenStepAndRepeat,
  viewQualityMode = 'enhanced',
  onChangeViewQualityMode,
  onFullScreenPreview,
  onPreviewSelectedOnly,
  multipageView = false,
  onToggleMultipageView,
  hasCanvasObjects = false,
  onZoomToFitObjects,
  proofColors = false,
  onToggleProofColors,
  simulateOverprints = false,
  onToggleSimulateOverprints,
  rasterizeComplexEffects = false,
  onToggleRasterizeComplexEffects,
  showPrintableArea = false,
  onTogglePrintableArea,
  showBaselineGrid = false,
  onToggleBaselineGrid,
  showGuidelines = true,
  onToggleGuidelines,
  showAlignmentGuides = true,
  onToggleAlignmentGuides,
  showDynamicGuides = true,
  onToggleDynamicGuides,
  showDocNavigator = true,
  onToggleDocNavigator,
  showScrollbars = true,
  onToggleScrollbars,
  pagesCount = 1,
  onInsertPage,
  onDuplicatePage,
  onRenamePage,
  onDeletePage,
  onGoToPage,
  onInsertPageNumber,
  onPageNumberSettings,
  onOpenPageSetupTab,
  onBorderAndGrommet,
  onConvertToBitmap,
  onStraightenImage,
  onImageAdjustmentLab,
  onBitmapGrayscale,
  onBitmapInvert,
  onBitmapCmykSeparation,
  onSelectTool,
  showNonPrintingChars = false,
  useHyphenation = false,
  showTextFrames = false,
  onTextAction,
  onEffectAction,
  onOpenQrCode,
  onOpenRandomFiller,
  showProjectTimer = false,
  onToggleProjectTimer,
  projectTimerSeconds = 0,
  projectTimerStatus = 'stopped',
  dimensionConfig = { precision: 2, unit: 'auto', showUnit: true, style: 'arrows', textPosition: 'above' },
  onUpdateDimensionConfig,
  cropToolsConfig = { eraserSize: 18, eraserNib: 'round', knifeAutoGap: false, cropRegion: null },
  onUpdateCropToolsConfig,
  onCropAction,
  onAutofitPage,
  currentFill = '#00a651',
  currentStroke = '#000000',
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeFileSubmenu, setActiveFileSubmenu] = useState<string | null>(null);
  const [activeEditSubmenu, setActiveEditSubmenu] = useState<string | null>(null);
  const [activeViewSubmenu, setActiveViewSubmenu] = useState<string | null>(null);
  const [activeLayoutSubmenu, setActiveLayoutSubmenu] = useState<string | null>(null);
  const [activeWindowSubmenu, setActiveWindowSubmenu] = useState<string | null>(null);
  const [activeTextSubmenu, setActiveTextSubmenu] = useState<string | null>(null);
  const [activeEffectsSubmenu, setActiveEffectsSubmenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);
  const [snapMenuOpen, setSnapMenuOpen] = useState<boolean>(false);
  const snapButtonRef = useRef<HTMLButtonElement | null>(null);
  const [snapMenuPos, setSnapMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [effectDropdownOpen, setEffectDropdownOpen] = useState<boolean>(false);
  const effectButtonRef = useRef<HTMLButtonElement | null>(null);
  const effectDropdownRef = useRef<HTMLDivElement | null>(null);
  const [effectMenuPos, setEffectMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [curveDropdownOpen, setCurveDropdownOpen] = useState<boolean>(false);
  const curveButtonRef = useRef<HTMLButtonElement | null>(null);
  const curveDropdownRef = useRef<HTMLDivElement | null>(null);
  const [curveMenuPos, setCurveMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [cropDropdownOpen, setCropDropdownOpen] = useState<boolean>(false);
  const cropButtonRef = useRef<HTMLButtonElement | null>(null);
  const cropDropdownRef = useRef<HTMLDivElement | null>(null);
  const [cropMenuPos, setCropMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [autofitDropdownOpen, setAutofitDropdownOpen] = useState<boolean>(false);
  const autofitButtonRef = useRef<HTMLButtonElement | null>(null);
  const autofitDropdownRef = useRef<HTMLDivElement | null>(null);
  const [autofitMenuPos, setAutofitMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [nudgeDraft, setNudgeDraft] = useState<string | null>(null);
  const [autofitMarginDraft, setAutofitMarginDraft] = useState<string | null>(null);
  const [nudgeTooltipOpen, setNudgeTooltipOpen] = useState<boolean>(false);
  const nudgeControlRef = useRef<HTMLDivElement | null>(null);
  const [nudgeTooltipPos, setNudgeTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!autofitDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (autofitDropdownRef.current?.contains(target) || autofitButtonRef.current?.contains(target)) return;
      setAutofitDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAutofitDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [autofitDropdownOpen]);

  React.useEffect(() => {
    if (!cropDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cropDropdownRef.current?.contains(target) || cropButtonRef.current?.contains(target)) return;
      setCropDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCropDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [cropDropdownOpen]);

  React.useEffect(() => {
    if (!effectDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (effectDropdownRef.current?.contains(target) || effectButtonRef.current?.contains(target)) return;
      setEffectDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEffectDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [effectDropdownOpen]);

  React.useEffect(() => {
    if (!curveDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (curveDropdownRef.current?.contains(target) || curveButtonRef.current?.contains(target)) return;
      setCurveDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCurveDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [curveDropdownOpen]);

  React.useEffect(() => {
    if (!activeMenu) {
      setActiveFileSubmenu(null);
      setActiveEditSubmenu(null);
      setActiveViewSubmenu(null);
      setActiveLayoutSubmenu(null);
      setActiveWindowSubmenu(null);
      setActiveTextSubmenu(null);
      setActiveEffectsSubmenu(null);
      return;
    }
    const handleOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setActiveFileSubmenu(null);
        setActiveEditSubmenu(null);
        setActiveViewSubmenu(null);
        setActiveLayoutSubmenu(null);
        setActiveWindowSubmenu(null);
        setActiveTextSubmenu(null);
        setActiveEffectsSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeMenu]);

  const handleToggleSnapMenu = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!snapMenuOpen && snapButtonRef.current) {
      const rect = snapButtonRef.current.getBoundingClientRect();
      setSnapMenuPos({
        top: rect.bottom + 2,
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 260)),
      });
    }
    setSnapMenuOpen((prev) => !prev);
  };
  const [showCollabModal, setShowCollabModal] = useState(false);
  const isDark = theme === 'dark';
  const [selectedAnchor, setSelectedAnchor] = useState<number>(0); // 0-8, 0 is Top-Left (CorelDRAW standard)
  const [cornerStyle, setCornerStyle] = useState<'round' | 'scallop' | 'chamfer'>('round');
  const [lockRatio, setLockRatio] = useState<boolean>(false);
  const [lockCorners, setLockCorners] = useState<boolean>(true);

  // Unit converter helper using the comprehensive units system
  const activeUnitInfo = UNITS_DATA[pageConfig.units] || UNITS_DATA.px;
  const unitSuffix = ` ${activeUnitInfo.symbol}`;

  const toDisplay = (val: number, decimals?: number) => {
    return pxToUnit(val, pageConfig.units, decimals !== undefined ? decimals : activeUnitInfo.decimals);
  };
  const fromDisplay = (val: number) => {
    return unitToPx(val, pageConfig.units);
  };

  const getFineStepForUnit = (unit: PageConfig['units']) => {
    switch (unit) {
      case 'mm':
        return 0.1;
      case 'cm':
        return 0.05;
      case 'in':
        return 0.01;
      case 'px':
        return 1;
      case 'pt':
        return 0.5;
      case 'pc':
        return 0.1;
      default:
        return 0.01;
    }
  };

  const formatFineUnit = (pxVal: number, unit: PageConfig['units'], minDecimals = 1) => {
    const raw = pxToUnit(pxVal, unit, unit === 'px' ? 1 : 3);
    let numStr: string;
    if (unit === 'px') {
      numStr = Number.isInteger(raw) ? String(raw) : raw.toFixed(1);
    } else {
      const trimmed = String(Number(raw.toFixed(3)));
      const parts = trimmed.split('.');
      if (!parts[1] && minDecimals > 0) {
        numStr = `${trimmed}.${'0'.repeat(minDecimals)}`;
      } else if (parts[1] && parts[1].length < minDecimals) {
        numStr = `${parts[0]}.${parts[1].padEnd(minDecimals, '0')}`;
      } else {
        numStr = trimmed;
      }
    }
    const sym = (UNITS_DATA[unit] || UNITS_DATA.px).symbol;
    return `${numStr} ${sym}`;
  };

  const currentNudgePx = pageConfig.nudgeDistance ?? unitToPx(0.1, 'mm');
  const currentAutofitMarginPx = pageConfig.autofitMargin ?? 0;

  const commitNudgeValue = (rawInput: string) => {
    const parsed = parseFloat(rawInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdatePageConfig({ nudgeDistance: Math.max(0.01, fromDisplay(parsed)) });
    }
    setNudgeDraft(null);
  };

  const stepNudgeDistance = (direction: 1 | -1) => {
    const step = getFineStepForUnit(pageConfig.units);
    const currentInUnit = pxToUnit(currentNudgePx, pageConfig.units, 3);
    const minVal = pageConfig.units === 'px' ? 0.5 : step;
    const nextInUnit = Math.max(minVal, Number((currentInUnit + direction * step).toFixed(3)));
    onUpdatePageConfig({ nudgeDistance: fromDisplay(nextInUnit) });
    setNudgeDraft(null);
  };

  const commitAutofitMarginValue = (rawInput: string) => {
    const parsed = parseFloat(rawInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePageConfig({ autofitMargin: Math.max(0, fromDisplay(parsed)) });
    }
    setAutofitMarginDraft(null);
  };

  const stepAutofitMargin = (direction: 1 | -1) => {
    const step = getFineStepForUnit(pageConfig.units);
    const currentInUnit = pxToUnit(currentAutofitMarginPx, pageConfig.units, 3);
    const nextInUnit = Math.max(0, Number((currentInUnit + direction * step).toFixed(3)));
    onUpdatePageConfig({ autofitMargin: fromDisplay(nextInUnit) });
    setAutofitMarginDraft(null);
  };

  const isSelected = !!selectedObject;
  const isDimensionTool = ['dimension', 'hv_dimension', 'angular_dimension', 'segment_dimension', 'callout'].includes(activeTool);
  const isEffectTool = ['shadow', 'contour', 'blend', 'distort', 'envelope', 'extrude', 'block_shadow'].includes(activeTool);
  const isFreehandCurveTool = ['freehand', 'line2p', 'bezier', 'pen', 'b_spline', 'polyline', 'curve_3p'].includes(activeTool);
  const isCropTool = ['crop', 'knife', 'virtual_segment_delete', 'eraser'].includes(activeTool);
  const isEyedropperTool = activeTool === 'eyedropper';
  const isZoomTool = activeTool === 'zoom' || activeTool === 'pan';
  const isText = (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) || (activeTool === 'text');
  const isRect = selectedObject && selectedObject.type === 'rect';

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
    if ((selectedObject as any).canvas) {
      (selectedObject as any).canvas.renderAll();
    }
  };

  const menuItems = [
    { label: 'File', accel: 'F', key: 'file' },
    { label: 'Edit', accel: 'E', key: 'edit' },
    { label: 'View', accel: 'V', key: 'view' },
    { label: 'Layout', accel: 'L', key: 'layout' },
    { label: 'Object', accel: 'O', key: 'object' },
    { label: 'Text', accel: 'T', key: 'text' },
    { label: 'Bitmap', accel: 'B', key: 'bitmap' },
    { label: 'Effects', accel: 'E', key: 'effects' },
    { label: 'Tools', accel: 'o', key: 'tools' },
    { label: 'Window', accel: 'W', key: 'window' },
    { label: 'Help', accel: 'H', key: 'help' },
  ];

  return (
    <div
      className={`border-b select-none transition-colors ${isDark ? 'bg-[#484b51] border-[#646870] text-zinc-100' : 'bg-[#ebecee] border-[#b5b8bd] text-zinc-900'}`}
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {/* =========================================================================
          ROW 0: Application Title Bar (Exact match with image_d50933df.png: Nuradraw - FileName*)
          ========================================================================= */}
      <div
        className={`h-6 border-b px-2.5 flex items-center justify-between text-xs ${
          isDark
            ? 'bg-[#3b3e44] border-[#565a62] text-zinc-100'
            : 'bg-white border-[#dcdee2] text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/assets/aistudio/favicon_23650500.svg"
            alt="Nuradraw"
            className="w-4 h-4 object-contain shrink-0"
            draggable={false}
          />
          <span
            title={`Nuradraw - ${documentName || activeDocTab || 'Untitled-1'}${isDirty ? '*' : ''}`}
            className="text-[12px] font-normal tracking-normal truncate"
          >
            Nuradraw - {documentName || activeDocTab || 'Untitled-1'}
            {isDirty ? '*' : ''}
          </span>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: CorelDRAW Classic Menu Bar
          ========================================================================= */}
      <div className={`h-6 border-b px-2 flex items-center justify-between text-xs ${isDark ? 'bg-[#484b51] border-[#60646c]' : 'bg-[#ebecee] border-[#d8dadd]'}`}>
        <div ref={menuBarRef} className="flex items-center space-x-1">
          {menuItems.map((item) => (
            <div key={item.key} className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === item.key ? null : item.key)}
                className={`px-2 py-0.5 rounded-xs transition-colors ${
                  activeMenu === item.key
                    ? isDark ? 'bg-[#5c6068] text-white font-semibold' : 'bg-[#c9d0d8] text-black font-semibold'
                    : isDark ? 'text-zinc-100 hover:bg-[#575b63]' : 'text-zinc-800 hover:bg-[#dbe0e5]'
                }`}
              >
                {(() => {
                  const idx = item.label.indexOf(item.accel);
                  if (idx === -1) return item.label;
                  return (
                    <>
                      {item.label.slice(0, idx)}
                      <span className="underline font-semibold">{item.accel}</span>
                      {item.label.slice(idx + item.accel.length)}
                    </>
                  );
                })()}
              </button>

              {/* File Dropdown Menu (Exact CorelDRAW File Menu Layout) */}
              {activeMenu === 'file' && item.key === 'file' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                    isDark
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                  onMouseLeave={() => setActiveFileSubmenu(null)}
                >
                  {/* 1. New... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onNewDocument();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDocNew className="w-4 h-4 shrink-0" />
                      <span><span className="underline">N</span>ew...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+N</span>
                  </button>

                  {/* 2. New from Template... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onNewFromTemplate || onOpenWelcome)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconTemplateNew className="w-4 h-4 shrink-0" />
                      <span>New <span className="underline">f</span>rom Template...</span>
                    </span>
                  </button>

                  {/* 3. Open... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onOpenJSON();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconFolderOpen className="w-4 h-4 shrink-0" />
                      <span><span className="underline">O</span>pen...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+O</span>
                  </button>

                  {/* 4. Open from Cloud... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onOpenFromCloud?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCloudOpen className="w-4 h-4 shrink-0" />
                      <span>Open from Cloud...</span>
                    </span>
                  </button>

                  {/* 5. Open Recent > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('open_recent')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'open_recent' ? null : 'open_recent')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Open <span className="underline">R</span>ecent</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'open_recent' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-56 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        {recentFiles.length === 0 ? (
                          <div className="px-3 py-1.5 text-zinc-400 italic text-[11px]">No recent documents</div>
                        ) : (
                          recentFiles.map((rf) => (
                            <button
                              key={rf.name}
                              onClick={() => {
                                onOpenRecent?.(rf.name);
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between gap-2"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                <img
                                  src="/assets/aistudio/favicon_23650500.svg"
                                  alt=""
                                  className="w-3.5 h-3.5 object-contain shrink-0"
                                  draggable={false}
                                />
                                <span className="truncate">{rf.name}</span>
                              </span>
                              <span className="text-[10px] opacity-60 shrink-0">{rf.savedAt}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 6. Close */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onCloseDocument?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCloseDoc className="w-4 h-4 shrink-0" />
                      <span><span className="underline">C</span>lose</span>
                    </span>
                  </button>

                  {/* 7. Close All */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onCloseAllDocuments?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCloseAllDocs className="w-4 h-4 shrink-0" />
                      <span>C<span className="underline">l</span>ose All</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 8. Save... */}
                  <button
                    disabled={!canSave}
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onSave || (() => onExport('json')))();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 disabled:opacity-45 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSaveDisk className="w-4 h-4 shrink-0" />
                      <span><span className="underline">S</span>ave...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+S</span>
                  </button>

                  {/* 9. Save As... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onSaveAs || (() => onExport('json')))();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSaveAsPlus className="w-4 h-4 shrink-0" />
                      <span>Save <span className="underline">A</span>s...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Shift+S</span>
                  </button>

                  {/* 10. Save to Cloud... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onSaveToCloud?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCloudSave className="w-4 h-4 shrink-0" />
                      <span>Save to Cloud...</span>
                    </span>
                  </button>

                  {/* 11. Save as Template... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onSaveAsTemplate?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSaveTemplate className="w-4 h-4 shrink-0" />
                      <span>Save as Te<span className="underline">m</span>plate...</span>
                    </span>
                  </button>

                  {/* 12. Revert */}
                  <button
                    disabled={!canRevert}
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onRevert?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 disabled:opacity-45 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconRevertDoc className="w-4 h-4 shrink-0" />
                      <span><span className="underline">R</span>evert</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 13. Acquire Image > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('acquire_image')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'acquire_image' ? null : 'acquire_image')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Ac<span className="underline">q</span>uire Image</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'acquire_image' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-52 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        <button
                          onClick={() => {
                            (onAcquireImage ? onAcquireImage('file') : onImport?.());
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Select Source / File...
                        </button>
                        <button
                          onClick={() => {
                            onAcquireImage?.('clipboard');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Acquire from Clipboard
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 14. Import... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onImport || onOpenJSON)();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconImportArrow className="w-4 h-4 shrink-0" />
                      <span><span className="underline">I</span>mport...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+I</span>
                  </button>

                  {/* 15. Export... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onExport('svg');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconExportArrow className="w-4 h-4 shrink-0" />
                      <span><span className="underline">E</span>xport...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+E</span>
                  </button>

                  {/* 16. Export For > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('export_for')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'export_for' ? null : 'export_for')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Export Fo<span className="underline">r</span></span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'export_for' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-52 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('png', 1) : onExport('png'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Web (PNG 1x)...
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('png', 3) : onExport('png'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Office / High-Res (PNG 3x)...
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('svg') : onExport('svg'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          HTML5 / Vector (SVG)...
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('dwg') : onExport('dwg'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          AutoCAD Drawing (.dwg)...
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 17. Export Docker > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('export_docker')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'export_docker' ? null : 'export_docker')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Export Docker</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'export_docker' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        <button
                          onClick={() => {
                            onExport('svg');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Open Export Panel...
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('svg') : onExport('svg'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Quick Export SVG
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('png', 2) : onExport('png'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Quick Export PNG
                        </button>
                        <button
                          onClick={() => {
                            (onQuickExport ? onQuickExport('dwg') : onExport('dwg'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Quick Export DWG
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 18. Send To > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('send_to')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'send_to' ? null : 'send_to')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Sen<span className="underline">d</span> To</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'send_to' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-52 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        <button
                          onClick={() => {
                            (onSendTo ? onSendTo('desktop') : onQuickExport?.('ndr'));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Desktop (Download .ndr)
                        </button>
                        <button
                          onClick={() => {
                            (onSendTo ? onSendTo('mail') : setShowCollabModal(true));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Mail / Copy Share Link
                        </button>
                        <button
                          onClick={() => {
                            (onSendTo ? onSendTo('cloud') : onSaveToCloud?.());
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Cloud Workspace
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 19. Publish to PDF */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onExport('pdf');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconExportPdf className="w-4 h-4 shrink-0" />
                      <span>Publis<span className="underline">h</span> to PDF</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 20. Print Merge > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveFileSubmenu('print_merge')}
                  >
                    <button
                      onClick={() => setActiveFileSubmenu(activeFileSubmenu === 'print_merge' ? null : 'print_merge')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Print <span className="underline">M</span>erge</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeFileSubmenu === 'print_merge' && (
                      <div className={`absolute left-full top-0 ml-0.5 w-52 rounded-xs shadow-xl py-1 z-50 border ${
                        isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}>
                        <button
                          onClick={() => {
                            onPrintMerge?.('insert_field');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Insert Merge Field (&lt;&lt;Name&gt;&gt;)
                        </button>
                        <button
                          onClick={() => {
                            onPrintMerge?.('csv');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                        >
                          Load CSV / Perform Merge...
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 21. Print... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onPrint || (() => window.print()))();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPrinter className="w-4 h-4 shrink-0" />
                      <span><span className="underline">P</span>rint...</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+P</span>
                  </button>

                  {/* 22. Print Preview... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onPrintPreview?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPrintPreview className="w-4 h-4 shrink-0" />
                      <span>Print Pre<span className="underline">v</span>iew...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 23. Document Properties... */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      onOpenPageSetup?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDocProperties className="w-4 h-4 shrink-0" />
                      <span>Document <span className="underline">P</span>roperties...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 24. Exit */}
                  <button
                    onMouseEnter={() => setActiveFileSubmenu(null)}
                    onClick={() => {
                      (onExit || onOpenWelcome)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPowerExit className="w-4 h-4 shrink-0" />
                      <span>E<span className="underline">x</span>it</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+F4</span>
                  </button>
                </div>
              )}

              {/* Edit Dropdown Menu (Exact CorelDRAW Edit Menu Layout matching edit_tab_c6f39bd0.jpg) */}
              {activeMenu === 'edit' && item.key === 'edit' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                    isDark
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                  onMouseLeave={() => setActiveEditSubmenu(null)}
                >
                  {/* 1. Undo */}
                  <button
                    disabled={!canUndo}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onUndo();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconUndoMenu className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">U</span>ndo{undoLabel ? ` ${undoLabel}` : ''}
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Z</span>
                  </button>

                  {/* 2. Redo */}
                  <button
                    disabled={!canRedo}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onRedo();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconRedoMenu className="w-4 h-4 shrink-0" />
                      <span>
                        R<span className="underline">e</span>do
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Shift+Z</span>
                  </button>

                  {/* 3. Repeat */}
                  <button
                    disabled={!canRepeat}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onRepeat?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconRepeatMenu className="w-4 h-4 shrink-0" />
                      <span>Repeat</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+R</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 4. Bring into Focus */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onBringIntoFocus?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconBringIntoFocus className="w-4 h-4 shrink-0" />
                      <span>
                        Bring into <span className="underline">F</span>ocus
                      </span>
                    </span>
                  </button>

                  {/* 5. Exit Focus Mode */}
                  <button
                    disabled={!isFocusMode && !isPowerClipEditing}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onExitFocusMode?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconExitFocusMode className="w-4 h-4 shrink-0" />
                      <span>Exit Focus Mode</span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Shift+Esc</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 6. Cut */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onCut?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCut className="w-4 h-4 shrink-0" />
                      <span>
                        Cu<span className="underline">t</span>
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+X</span>
                  </button>

                  {/* 7. Copy */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onCopy?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCopyDoc className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">C</span>opy
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+C</span>
                  </button>

                  {/* 8. Copy Properties From... */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onCopyPropertiesFrom?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCopyProperties className="w-4 h-4 shrink-0" />
                      <span>
                        Copy Properties Fro<span className="underline">m</span>...
                      </span>
                    </span>
                  </button>

                  {/* 9. Paste */}
                  <button
                    disabled={!canPaste}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onPaste?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPasteDoc className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">P</span>aste
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+V</span>
                  </button>

                  {/* 10. Paste in View */}
                  <button
                    disabled={!canPaste}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onPasteInView?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPasteInView className="w-4 h-4 shrink-0" />
                      <span>
                        Paste in <span className="underline">V</span>iew
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Shift+V</span>
                  </button>

                  {/* 11. Paste Special... */}
                  <button
                    disabled={!canPaste}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onPasteSpecial?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPasteSpecial className="w-4 h-4 shrink-0" />
                      <span>
                        Paste <span className="underline">S</span>pecial...
                      </span>
                    </span>
                  </button>

                  {/* 12. Delete */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onDelete?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconTrashDelete className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">D</span>elete
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Delete</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 13. Duplicate */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onDuplicate?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDuplicatePlus className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">D</span>uplicate
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+D</span>
                  </button>

                  {/* 14. Clone */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onClone?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCloneDual className="w-4 h-4 shrink-0" />
                      <span>
                        Clo<span className="underline">n</span>e
                      </span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 15. Select All > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveEditSubmenu('select_all')}
                  >
                    <button
                      onClick={() =>
                        setActiveEditSubmenu(activeEditSubmenu === 'select_all' ? null : 'select_all')
                      }
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          Select <span className="underline">A</span>ll
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeEditSubmenu === 'select_all' && (
                      <div
                        className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                          isDark
                            ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectAll?.('objects');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                        >
                          <span>Objects</span>
                          <span className="text-[11px] opacity-75">Ctrl+A</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectAll?.('text');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                        >
                          <span>Text</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectAll?.('curves');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                        >
                          <span>Curves</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectAll?.('nodes');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                        >
                          <span>Nodes (Shape Tool)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 16. Find and Replace */}
                  <button
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onOpenFindReplace?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {findReplaceOpen && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">F</span>ind and Replace
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+F</span>
                  </button>

                  {/* 17. Step and Repeat */}
                  <button
                    onMouseEnter={() => setActiveEditSubmenu(null)}
                    onClick={() => {
                      onOpenStepAndRepeat?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0" />
                      <span>
                        Step and Repea<span className="underline">t</span>
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Shift+D</span>
                  </button>
                </div>
              )}

              {/* View Dropdown Menu (Exact CorelDRAW View Menu Layout matching view tab screenshot) */}
              {activeMenu === 'view' && item.key === 'view' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                    isDark
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                  onMouseLeave={() => setActiveViewSubmenu(null)}
                >
                  {/* 1. Wireframe */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onChangeViewQualityMode?.('wireframe');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {viewQualityMode === 'wireframe' && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                      <span>
                        <span className="underline">W</span>ireframe
                      </span>
                    </span>
                  </button>

                  {/* 2. Normal */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onChangeViewQualityMode?.('normal');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {viewQualityMode === 'normal' && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                      <span>
                        <span className="underline">N</span>ormal
                      </span>
                    </span>
                  </button>

                  {/* 3. Enhanced */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onChangeViewQualityMode?.('enhanced');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {viewQualityMode === 'enhanced' && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                      <span>
                        <span className="underline">E</span>nhanced
                      </span>
                    </span>
                  </button>

                  {/* 4. Pixels */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onChangeViewQualityMode?.('pixels');
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {viewQualityMode === 'pixels' && <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                      <span>
                        Pi<span className="underline">x</span>els
                      </span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 5. Full-screen Preview */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onFullScreenPreview?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconFullScreenF9 className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="underline">F</span>ull-screen Preview
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">F9</span>
                  </button>

                  {/* 6. Preview Selected Only */}
                  <button
                    disabled={!selectedObject}
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onPreviewSelectedOnly?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPreviewSelected className="w-4 h-4 shrink-0" />
                      <span>
                        Preview Selected <span className="underline">O</span>nly
                      </span>
                    </span>
                  </button>

                  {/* 7. Multipage View */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleMultipageView?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {multipageView && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">M</span>ultipage View
                      </span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 8. Zoom In */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onZoomIn();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconZoomInMenu className="w-4 h-4 shrink-0" />
                      <span>
                        Zoom <span className="underline">I</span>n
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl++</span>
                  </button>

                  {/* 9. Zoom Out */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onZoomOut();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconZoomOutMenu className="w-4 h-4 shrink-0" />
                      <span>
                        Zoom <span className="underline">O</span>ut
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">F3 / Ctrl+-</span>
                  </button>

                  {/* 10. Zoom To Fit */}
                  <button
                    disabled={!hasCanvasObjects}
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      (onZoomToFitObjects || onZoomFit)();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconZoomToFitMenu className="w-4 h-4 shrink-0" />
                      <span>
                        Zoom To <span className="underline">F</span>it
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">F4</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 11. Proof Colors */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleProofColors?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {proofColors && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        Proof <span className="underline">C</span>olors
                      </span>
                    </span>
                  </button>

                  {/* 12. Simulate Overprints */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleSimulateOverprints?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {simulateOverprints && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        Simulate O<span className="underline">v</span>erprints
                      </span>
                    </span>
                  </button>

                  {/* 13. Rasterize Complex Effects */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleRasterizeComplexEffects?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {rasterizeComplexEffects && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        Rasteri<span className="underline">z</span>e Complex Effects
                      </span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 14. Page > */}
                  <div className="relative" onMouseEnter={() => setActiveViewSubmenu('page')}>
                    <button
                      onClick={() => setActiveViewSubmenu(activeViewSubmenu === 'page' ? null : 'page')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">P</span>age
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeViewSubmenu === 'page' && (
                      <div
                        className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                          isDark
                            ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onUpdatePageConfig({ showPageBorder: pageConfig.showPageBorder === false });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {pageConfig.showPageBorder !== false && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Page Border</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdatePageConfig({ showBleed: !pageConfig.showBleed });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {pageConfig.showBleed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Bleed</span>
                        </button>
                        <button
                          onClick={() => {
                            onTogglePrintableArea?.();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {showPrintableArea && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Printable Area</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdatePageConfig({ facingPages: !pageConfig.facingPages });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {pageConfig.facingPages && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Facing Pages</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 15. Grid > */}
                  <div className="relative" onMouseEnter={() => setActiveViewSubmenu('grid')}>
                    <button
                      onClick={() => setActiveViewSubmenu(activeViewSubmenu === 'grid' ? null : 'grid')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">G</span>rid
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeViewSubmenu === 'grid' && (
                      <div
                        className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                          isDark
                            ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onToggleGrid();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {showGrid && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Document Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            onToggleBaselineGrid?.();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {showBaselineGrid && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Baseline Grid</span>
                        </button>
                        <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                        <button
                          onClick={() => {
                            onOpenPageSetup?.();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5" />
                          <span>Grid Setup...</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 16. Rulers */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleRulers();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showRulers && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">R</span>ulers
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+Shift+R</span>
                  </button>

                  {/* 17. Guidelines */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleGuidelines?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showGuidelines && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">G</span>uidelines
                      </span>
                    </span>
                  </button>

                  {/* 18. Alignment Guides */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleAlignmentGuides?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showAlignmentGuides && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">A</span>lignment Guides
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+Shift+A</span>
                  </button>

                  {/* 19. Dynamic Guides */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleDynamicGuides?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showDynamicGuides && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">D</span>ynamic Guides
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+Shift+D</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 20. Snap To > */}
                  <div className="relative" onMouseEnter={() => setActiveViewSubmenu('snap_to')}>
                    <button
                      onClick={() => setActiveViewSubmenu(activeViewSubmenu === 'snap_to' ? null : 'snap_to')}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          Snap <span className="underline">T</span>o
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                    </button>
                    {activeViewSubmenu === 'snap_to' && (
                      <div
                        className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                          isDark
                            ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onUpdateSnapConfig({ snapToGrid: !snapConfig.snapToGrid });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {snapConfig.snapToGrid && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Document Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSnapConfig({ snapToBaselineGrid: !snapConfig.snapToBaselineGrid });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {snapConfig.snapToBaselineGrid && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Baseline Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSnapConfig({ snapToGuidelines: !(snapConfig.snapToGuidelines ?? true) });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {(snapConfig.snapToGuidelines ?? true) && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Guidelines</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSnapConfig({ snapToObjects: !snapConfig.snapToObjects });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {snapConfig.snapToObjects && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Objects</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSnapConfig({ snapToPage: !snapConfig.snapToPage });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            {snapConfig.snapToPage && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                          <span>Page</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 21. Snap Off */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onUpdateSnapConfig({ enabled: !snapConfig.enabled });
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {!snapConfig.enabled && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        Snap <span className="underline">O</span>ff
                      </span>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+Q</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 22. Document Navigator */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleDocNavigator?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showDocNavigator && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">D</span>ocument Navigator
                      </span>
                    </span>
                  </button>

                  {/* 23. Scrollbars */}
                  <button
                    onMouseEnter={() => setActiveViewSubmenu(null)}
                    onClick={() => {
                      onToggleScrollbars?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {showScrollbars && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                      </span>
                      <span>
                        <span className="underline">S</span>crollbars
                      </span>
                    </span>
                  </button>
                </div>
              )}



              {/* Object Dropdown Menu (Includes PowerClip) */}
              {activeMenu === 'object' && item.key === 'object' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-2xl py-1 z-50 text-xs ${
                    isDark ? 'bg-[#4e5157] border border-[#6a6e77] text-zinc-100' : 'bg-[#f5f5f7] border border-[#a1a5ab] text-zinc-800'
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  {/* Insert Section (QR Code) */}
                  <div className="px-3 py-0.5 font-semibold text-[10px] uppercase text-zinc-400">Insert</div>
                  <button
                    onClick={() => onOpenQrCode?.()}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                    title="Insert Vector QR Code..."
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#0078d7]" />
                      <span className="font-medium">QR Code...</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">Vector</span>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* PowerClip Header & Options */}
                  <div className="px-3 py-1 font-semibold text-[10px] uppercase text-blue-600 dark:text-blue-400 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <IconPowerClip className="w-3.5 h-3.5" />
                      PowerClip
                    </span>
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1 py-0.2 rounded font-semibold">CorelDRAW</span>
                  </div>

                  <button
                    onClick={onPowerClipPlace}
                    disabled={!selectedObject}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                    title="Place selected object inside another frame/container"
                  >
                    <div className="flex items-center gap-2">
                      <IconPowerClip className="w-4 h-4 text-[#0078d7]" />
                      <span className="font-medium">Place Inside Frame...</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">Click Frame</span>
                  </button>

                  <button
                    onClick={onPowerClipExtract}
                    disabled={!selectedObject || (!((selectedObject as any).isPowerClip) && !((selectedObject as any).customType === 'powerclip'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                    title="Extract contents out of the PowerClip frame"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-center text-xs">📤</span>
                      <span>Extract Contents</span>
                    </div>
                  </button>

                  {!isPowerClipEditing ? (
                    <button
                      onClick={onPowerClipEdit}
                      disabled={!selectedObject || (!((selectedObject as any).isPowerClip) && !((selectedObject as any).customType === 'powerclip'))}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                      title="Edit objects inside this PowerClip frame"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-center text-xs">✏️</span>
                        <span>Edit PowerClip</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={onPowerClipFinish}
                      className="w-full text-left px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 flex justify-between items-center font-semibold"
                      title="Finish editing and re-apply clipping mask"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-center text-xs">✔️</span>
                        <span>Finish Editing PowerClip</span>
                      </div>
                    </button>
                  )}

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Symmetry Header & Options */}
                  <div className="px-3 py-1 font-semibold text-[10px] uppercase text-sky-600 dark:text-sky-400 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <IconSymmetryCreate className="w-3.5 h-3.5" />
                      Symmetry
                    </span>
                    <span className="text-[9px] bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-1 py-0.2 rounded font-semibold">Live Mirror</span>
                  </div>

                  {!symmetryEditingConfig ? (
                    <button
                      onClick={() => {
                        onCreateSymmetry?.();
                        setActiveMenu(null);
                      }}
                      disabled={!selectedObject || !!(selectedObject as any)?.isSymmetryGroup}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <IconSymmetryCreate className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Create New Symmetry</span>
                      </div>
                      <span className="font-mono text-[10px] opacity-70">Alt+S</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onFinishSymmetry?.();
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 hover:bg-[#0078d7] hover:text-white text-sky-700 dark:text-sky-300 flex justify-between items-center font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <IconSymmetryFinish className="w-4 h-4 shrink-0" />
                        <span>Finish Editing Symmetry</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onEditSymmetry?.();
                      setActiveMenu(null);
                    }}
                    disabled={!!symmetryEditingConfig || !selectedObject || !(selectedObject as any)?.isSymmetryGroup}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2">
                      <IconSymmetryEdit className="w-4 h-4 shrink-0" />
                      <span>Edit Symmetry</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onBreakSymmetryLink?.();
                      setActiveMenu(null);
                    }}
                    disabled={!symmetryEditingConfig && (!selectedObject || !(selectedObject as any)?.isSymmetryGroup)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2">
                      <IconSymmetryBreak className="w-4 h-4 shrink-0" />
                      <span>Break Symmetry Link</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onRemoveSymmetry?.();
                      setActiveMenu(null);
                    }}
                    disabled={!symmetryEditingConfig && (!selectedObject || !(selectedObject as any)?.isSymmetryGroup)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2">
                      <IconSymmetryRemove className="w-4 h-4 shrink-0" />
                      <span>Remove Symmetry</span>
                    </div>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Order */}
                  <div className="px-3 py-0.5 font-semibold text-[10px] uppercase text-zinc-400">Order</div>
                  <button onClick={onBringForward} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Forward One</span>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+PgUp</span>
                  </button>
                  <button onClick={onSendBackward} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Back One</span>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+PgDn</span>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Group */}
                  <div className="px-3 py-0.5 font-semibold text-[10px] uppercase text-zinc-400">Group</div>
                  <button
                    onClick={() => {
                      onGroup();
                      setActiveMenu(null);
                    }}
                    disabled={!selectedObject || selectedObject.type !== 'activeselection'}
                    className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <span>Group Objects</span>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+G</span>
                  </button>
                  <button
                    onClick={() => {
                      onUngroup();
                      setActiveMenu(null);
                    }}
                    disabled={!selectedObject || selectedObject.type !== 'group'}
                    className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <span>Ungroup Objects</span>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+U</span>
                  </button>
                  <button
                    onClick={() => {
                      onUngroupAll?.();
                      setActiveMenu(null);
                    }}
                    disabled={!selectedObject || selectedObject.type !== 'group'}
                    className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <span>Ungroup All Objects</span>
                  </button>
                  <button
                    onClick={() => {
                      onEnterGroupEdit?.();
                      setActiveMenu(null);
                    }}
                    disabled={
                      !selectedObject ||
                      selectedObject.type !== 'group' ||
                      !!(selectedObject as any).isPowerClip ||
                      (selectedObject as any).customType === 'powerclip' ||
                      !!(selectedObject as any).isTextOnPath
                    }
                    className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <span>Edit Group Contents</span>
                    <span className="font-mono text-[10px] opacity-70">Dbl-Click</span>
                  </button>
                  {groupEditDepth > 0 && (
                    <button
                      onClick={() => {
                        onExitGroupEdit?.();
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-3 py-1 bg-sky-500/15 hover:bg-[#0078d7] hover:text-white text-sky-600 dark:text-sky-300 font-semibold flex justify-between items-center"
                    >
                      <span>Finish Editing Group</span>
                      <span className="font-mono text-[10px] opacity-70">Esc</span>
                    </button>
                  )}
                  <button
                    onClick={onConvertToCurves}
                    disabled={!selectedObject || selectedObject.type === 'activeselection'}
                    className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40"
                  >
                    <span>Convert to Curves</span>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+Q</span>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Align and Distribute */}
                  <div className="px-3 py-0.5 font-semibold text-[10px] uppercase text-zinc-400">Align and Distribute</div>
                  <button onClick={() => { onAlign?.('left'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Left</span>
                    <span className="font-mono text-[10px] opacity-70">L</span>
                  </button>
                  <button onClick={() => { onAlign?.('center'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Centers Horizontally</span>
                    <span className="font-mono text-[10px] opacity-70">C</span>
                  </button>
                  <button onClick={() => { onAlign?.('right'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Right</span>
                    <span className="font-mono text-[10px] opacity-70">R</span>
                  </button>
                  <button onClick={() => { onAlign?.('top'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Top</span>
                    <span className="font-mono text-[10px] opacity-70">T</span>
                  </button>
                  <button onClick={() => { onAlign?.('middle'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Centers Vertically</span>
                    <span className="font-mono text-[10px] opacity-70">E</span>
                  </button>
                  <button onClick={() => { onAlign?.('bottom'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Align Bottom</span>
                    <span className="font-mono text-[10px] opacity-70">B</span>
                  </button>
                  <button onClick={() => { onAlign?.('center-page'); setActiveMenu(null); }} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Center to Page</span>
                    <span className="font-mono text-[10px] opacity-70">P</span>
                  </button>
                  <button onClick={() => { onToggleDocker('align'); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center">
                    <span>Align and Distribute Docker...</span>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Transformations */}
                  <div className="px-3 py-0.5 font-semibold text-[10px] uppercase text-zinc-400">Transformations</div>
                  <button onClick={() => onToggleDocker('transform')} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center">
                    <span>Transform Docker...</span>
                    <span className="font-mono text-[10px] opacity-70">Alt+F7</span>
                  </button>
                  <button onClick={() => onRotate(90)} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Rotate 90° Clockwise</span>
                  </button>
                  <button onClick={onFlipH} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Mirror Horizontally</span>
                  </button>
                  <button onClick={onFlipV} disabled={!selectedObject} className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex justify-between items-center disabled:opacity-40">
                    <span>Mirror Vertically</span>
                  </button>
                </div>
              )}

              {/* Text Dropdown Menu (Matches text_tab_ea200fa1.jpg) */}
              {activeMenu === 'text' && item.key === 'text' && (() => {
                const isTextObjSelected = !!(
                  selectedObject &&
                  (selectedObject.type === 'i-text' ||
                    selectedObject.type === 'text' ||
                    selectedObject.type === 'textbox' ||
                    Boolean((selectedObject as any).isTextOnPath))
                );
                const isParagraphSelected = !!(selectedObject && selectedObject.type === 'textbox');
                return (
                  <div
                    className={`absolute left-0 top-full mt-0.5 w-72 rounded-xs shadow-2xl py-1 z-50 text-[12px] border select-none ${
                      isDark
                        ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                        : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                    }`}
                  >
                    {/* 1. Tabs... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('tabs');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconTextTabs className="w-4 h-4 shrink-0" />
                        <span>
                          T<span className="underline">a</span>bs...
                        </span>
                      </span>
                    </button>

                    {/* 2. Columns... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('columns');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconTextColumns className="w-4 h-4 shrink-0" />
                        <span>
                          C<span className="underline">o</span>lumns...
                        </span>
                      </span>
                    </button>

                    {/* 3. Bullets and Numbering... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('bullets');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconBulletsNumbering className="w-4 h-4 shrink-0" />
                        <span>
                          B<span className="underline">u</span>llets and Numbering...
                        </span>
                      </span>
                    </button>

                    {/* 4. Drop Cap... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('drop_cap');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconDropCap className="w-4 h-4 shrink-0" />
                        <span>
                          D<span className="underline">r</span>op Cap...
                        </span>
                      </span>
                    </button>

                    {/* 5. Text Statistics... */}
                    <button
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('statistics');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconTextStatistics className="w-4 h-4 shrink-0" />
                        <span>
                          Text Statisti<span className="underline">c</span>s...
                        </span>
                      </span>
                    </button>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 6. Edit Text... Ctrl+Shift+T */}
                    <button
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('edit_text');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconEditText className="w-4 h-4 shrink-0" />
                        <span>
                          Edit Te<span className="underline">x</span>t...
                        </span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+Shift+T</span>
                    </button>

                    {/* 7. Insert Formatting Code ▶ */}
                    <div
                      className="relative"
                      onMouseEnter={() => setActiveTextSubmenu('formatting_code')}
                    >
                      <button
                        onClick={() =>
                          setActiveTextSubmenu(
                            activeTextSubmenu === 'formatting_code' ? null : 'formatting_code'
                          )
                        }
                        className={`w-full text-left px-2.5 py-1 flex items-center justify-between ${
                          activeTextSubmenu === 'formatting_code'
                            ? isDark
                              ? 'bg-zinc-700 text-white'
                              : 'bg-[#c9ced4] text-zinc-900'
                            : isDark
                            ? 'hover:bg-zinc-700'
                            : 'hover:bg-[#c9ced4]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 h-4 shrink-0" />
                          <span>
                            Insert Fo<span className="underline">r</span>matting Code
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                      </button>

                      {activeTextSubmenu === 'formatting_code' && (
                        <div
                          className={`absolute left-full top-0 ml-0.5 w-52 rounded-xs shadow-xl py-1 z-50 border ${
                            isDark
                              ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                              : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                          }`}
                        >
                          {[
                            { label: 'Em Dash (—)', code: '—' },
                            { label: 'En Dash (–)', code: '–' },
                            { label: 'Non-breaking Space', code: '\u00A0' },
                            { label: 'Optional Hyphen (-)', code: '-' },
                            { label: 'Line Break (↵)', code: '\n' },
                            { label: 'Copyright (©)', code: '©' },
                            { label: 'Registered (®)', code: '®' },
                            { label: 'Trademark (™)', code: '™' },
                          ].map((fmt) => (
                            <button
                              key={fmt.label}
                              onClick={() => {
                                onTextAction?.('insert_code', fmt.code);
                                setActiveMenu(null);
                                setActiveTextSubmenu(null);
                              }}
                              className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                            >
                              <span>{fmt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 8. Convert To Paragraph Text Ctrl+F8 */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('convert_paragraph');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconConvertParagraphText className="w-4 h-4 shrink-0" />
                        <span>
                          {isParagraphSelected ? (
                            <>
                              Con<span className="underline">v</span>ert To Artistic Text
                            </>
                          ) : (
                            <>
                              Con<span className="underline">v</span>ert To Paragraph Text
                            </>
                          )}
                        </span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+F8</span>
                    </button>

                    {/* 9. Show Non-Printing Characters */}
                    <button
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('toggle_non_printing');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {showNonPrintingChars && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                        <span>
                          Show <span className="underline">N</span>on-Printing Characters
                        </span>
                      </span>
                    </button>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 10. Paragraph Text Frame ▶ */}
                    <div
                      className="relative"
                      onMouseEnter={() => setActiveTextSubmenu('paragraph_frame')}
                    >
                      <button
                        onClick={() =>
                          setActiveTextSubmenu(
                            activeTextSubmenu === 'paragraph_frame' ? null : 'paragraph_frame'
                          )
                        }
                        className={`w-full text-left px-2.5 py-1 flex items-center justify-between ${
                          activeTextSubmenu === 'paragraph_frame'
                            ? isDark
                              ? 'bg-zinc-700 text-white'
                              : 'bg-[#c9ced4] text-zinc-900'
                            : isDark
                            ? 'hover:bg-zinc-700'
                            : 'hover:bg-[#c9ced4]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 h-4 shrink-0" />
                          <span>
                            Paragraph Te<span className="underline">x</span>t Frame
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                      </button>

                      {activeTextSubmenu === 'paragraph_frame' && (
                        <div
                          className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                            isDark
                              ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                              : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                          }`}
                        >
                          <button
                            onClick={() => {
                              onTextAction?.('fit_text_to_frame');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                          >
                            Fit Text to Frame
                          </button>
                          <button
                            onClick={() => {
                              onTextAction?.('toggle_text_frames');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white flex items-center justify-between"
                          >
                            <span>Show Text Frames</span>
                            {showTextFrames && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </button>
                          <button
                            onClick={() => {
                              onTextAction?.('convert_paragraph');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                          >
                            Create / Convert Frame
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 11. Fit Text to Path */}
                    <button
                      disabled={!isTextObjSelected && !selectedObject}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('fit_to_path');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconFitTextToPath className="w-4 h-4 shrink-0" />
                        <span>
                          Fit <span className="underline">T</span>ext to Path
                        </span>
                      </span>
                    </button>

                    {/* 12. Straighten Text */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('straighten');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconStraightenText className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">S</span>traighten Text
                        </span>
                      </span>
                    </button>

                    {/* 13. Align to Baseline Alt+F12 */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('align_baseline');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconAlignToBaseline className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">A</span>lign to Baseline
                        </span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Alt+F12</span>
                    </button>

                    {/* 14. Align to Baseline Grid */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('align_baseline_grid');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          Align to Baseline <span className="underline">G</span>rid
                        </span>
                      </span>
                    </button>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 15. Use Hyphenation */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('toggle_hyphenation');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {useHyphenation && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                        <span>Use Hyphenation</span>
                      </span>
                    </button>

                    {/* 16. Writing Tools ▶ */}
                    <div
                      className="relative"
                      onMouseEnter={() => setActiveTextSubmenu('writing_tools')}
                    >
                      <button
                        onClick={() =>
                          setActiveTextSubmenu(
                            activeTextSubmenu === 'writing_tools' ? null : 'writing_tools'
                          )
                        }
                        className={`w-full text-left px-2.5 py-1 flex items-center justify-between ${
                          activeTextSubmenu === 'writing_tools'
                            ? isDark
                              ? 'bg-zinc-700 text-white'
                              : 'bg-[#c9ced4] text-zinc-900'
                            : isDark
                            ? 'hover:bg-zinc-700'
                            : 'hover:bg-[#c9ced4]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 h-4 shrink-0" />
                          <span>
                            <span className="underline">W</span>riting Tools
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                      </button>

                      {activeTextSubmenu === 'writing_tools' && (
                        <div
                          className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                            isDark
                              ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                              : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                          }`}
                        >
                          <button
                            onClick={() => {
                              onTextAction?.('spell_check');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                          >
                            Spell Check...
                          </button>
                          <button
                            onClick={() => {
                              onTextAction?.('quick_correct');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                          >
                            QuickCorrect (Auto-Format)
                          </button>
                          <button
                            onClick={() => {
                              onTextAction?.('statistics');
                              setActiveMenu(null);
                              setActiveTextSubmenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                          >
                            Word &amp; Font Report...
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 17. Change Case... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('change_case');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconChangeCase className="w-4 h-4 shrink-0" />
                        <span>Change Case...</span>
                      </span>
                    </button>

                    {/* 18. Make Text Web-compatible */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('web_compatible');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">M</span>ake Text Web-compatible
                        </span>
                      </span>
                    </button>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 19. Encode... */}
                    <button
                      disabled={!isTextObjSelected}
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onTextAction?.('encode');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconEncodeText className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="underline">E</span>ncode...
                        </span>
                      </span>
                    </button>

                    <div className={`h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                    {/* 20. Text Ctrl+T */}
                    <button
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onToggleDocker('text');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {activeDockers.includes('text') && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                        <span>Text</span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+T</span>
                    </button>

                    {/* 21. Glyphs Ctrl+F11 */}
                    <button
                      onMouseEnter={() => setActiveTextSubmenu(null)}
                      onClick={() => {
                        onToggleDocker('glyphs');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {activeDockers.includes('glyphs') && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                        <span>Glyphs</span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Ctrl+F11</span>
                    </button>
                  </div>
                );
              })()}

              {/* Bitmap Dropdown Menu (CorelDRAW Bitmap Tab) */}
              {activeMenu === 'bitmap' && item.key === 'bitmap' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                    isDark
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  {/* 1. Convert to Bitmap... */}
                  <button
                    disabled={!selectedObject}
                    onClick={() => onConvertToBitmap?.()}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconConvertToBitmap className="w-4 h-4 shrink-0" />
                      <span><span className="underline">C</span>onvert to Bitmap...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 2. Straighten Image... */}
                  <button
                    disabled={!selectedObject}
                    onClick={() => onStraightenImage?.()}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconStraightenImage className="w-4 h-4 shrink-0" />
                      <span><span className="underline">S</span>traighten Image...</span>
                    </span>
                  </button>

                  {/* 3. Image Adjustment Lab... */}
                  <button
                    disabled={!selectedObject}
                    onClick={() => onImageAdjustmentLab?.()}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconImageAdjustmentLab className="w-4 h-4 shrink-0" />
                      <span><span className="underline">I</span>mage Adjustment Lab...</span>
                    </span>
                  </button>

                  {/* 4. CMYK Color Separation (New Page) */}
                  <button
                    disabled={!selectedObject}
                    onClick={() => onBitmapCmykSeparation?.()}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                    title="Separate Cyan, Magenta, Yellow, and Black plates onto a new page"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCmykSeparation className="w-4 h-4 shrink-0" />
                      <span className="font-medium">CMYK Separation (C, M, Y, K)</span>
                    </span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1 rounded font-semibold">
                      New Page
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  <div className="px-2.5 py-0.5 font-semibold text-[10px] uppercase text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>Trace Bitmap (TraceDraw)</span>
                    <span className="text-[9px] bg-sky-100 dark:bg-sky-900/50 text-sky-700 px-1 rounded font-semibold">Vector</span>
                  </div>
                  <button
                    disabled={!selectedObject}
                    onClick={() => {
                      if (selectedObject) {
                        onConvertToCurves?.();
                      }
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex justify-between items-center disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="font-medium">Quick Trace</span>
                    <span className="text-[10px] opacity-70">1-Click</span>
                  </button>
                  <button
                    onClick={() => onToggleDocker('ai_generate')}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex justify-between items-center"
                  >
                    <span>Centerline Trace...</span>
                    <span className="text-[10px] opacity-70">Technical</span>
                  </button>
                  <button
                    onClick={() => onToggleDocker('ai_generate')}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex justify-between items-center"
                  >
                    <span>Outline Trace &gt; Clipart / Logo...</span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                  <div className="px-2.5 py-0.5 font-semibold text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Quick Color</div>
                  <button
                    disabled={!selectedObject}
                    onClick={() => {
                      if (onBitmapGrayscale) {
                        onBitmapGrayscale();
                      } else if (selectedObject) {
                        selectedObject.set('fill', '#334155');
                        onUpdateProperties({ fill: '#334155' });
                      }
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>Grayscale</span>
                  </button>
                  <button
                    disabled={!selectedObject}
                    onClick={() => {
                      if (onBitmapInvert) {
                        onBitmapInvert();
                      } else if (selectedObject) {
                        const cur = typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000';
                        const inv = cur === '#000000' ? '#ffffff' : '#000000';
                        selectedObject.set('fill', inv);
                        onUpdateProperties({ fill: inv });
                      }
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>Invert Colors</span>
                  </button>
                </div>
              )}

              {/* Effects Dropdown Menu (Exact CorelDRAW Effects Menu matching effect_tab_19a41bcd.jpg) */}
              {activeMenu === 'effects' && item.key === 'effects' && (() => {
                const hasAnyEffect = Boolean(
                  selectedObject &&
                    (selectedObject.shadow ||
                      (selectedObject.opacity ?? 1) < 0.99 ||
                      (selectedObject as any).hasEffects ||
                      selectedObject.type === 'group')
                );
                const effectCategories: {
                  key: string;
                  labelNode: React.ReactNode;
                  labelText: string;
                  items: string[];
                }[] = [
                  {
                    key: '3d',
                    labelText: '3D Effects',
                    labelNode: <span>3D Effects</span>,
                    items: ['3D Rotate...', 'Cylinder...', 'Emboss...', 'Page Curl...', 'Perspective...', 'Pinch/Punch...', 'Sphere...'],
                  },
                  {
                    key: 'adjust',
                    labelText: 'Adjust',
                    labelNode: (
                      <span>
                        <span className="underline">A</span>djust
                      </span>
                    ),
                    items: ['Image Adjustment Lab...', 'Brightness / Contrast / Intensity...', 'Color Balance...', 'Gamma...', 'Hue / Saturation / Lightness...', 'Auto Equalize'],
                  },
                  {
                    key: 'art_strokes',
                    labelText: 'Art Strokes',
                    labelNode: (
                      <span>
                        <span className="underline">A</span>rt Strokes
                      </span>
                    ),
                    items: ['Charcoal...', 'Conte Crayon...', 'Crayon...', 'Cubist...', 'Impressionist...', 'Palette Knife...', 'Pastels...', 'Pen & Ink...', 'Pointillist...', 'Scraperboard...', 'Sketch Pad...', 'Watercolor...'],
                  },
                  {
                    key: 'blur',
                    labelText: 'Blur',
                    labelNode: (
                      <span>
                        <span className="underline">B</span>lur
                      </span>
                    ),
                    items: ['Directional Smooth...', 'Gaussian Blur...', 'Jaggy Despeckle...', 'Low Pass...', 'Motion Blur...', 'Radial Blur...', 'Smart Blur...', 'Smooth...', 'Zoom...'],
                  },
                  {
                    key: 'camera',
                    labelText: 'Camera',
                    labelNode: (
                      <span>
                        <span className="underline">C</span>amera
                      </span>
                    ),
                    items: ['Colorize...', 'Diffuse...', 'Lens Flare...', 'Photo Filter...', 'Sepia Toning...', 'Time Machine...'],
                  },
                  {
                    key: 'color_transform',
                    labelText: 'Color Transform',
                    labelNode: (
                      <span>
                        Co<span className="underline">l</span>or Transform
                      </span>
                    ),
                    items: ['Bit Planes...', 'Halftone...', 'Psychedelic...', 'Solarize...'],
                  },
                  {
                    key: 'contour_cat',
                    labelText: 'Contour',
                    labelNode: (
                      <span>
                        C<span className="underline">o</span>ntour
                      </span>
                    ),
                    items: ['Edge Detect...', 'Find Edges...', 'Trace Contour...'],
                  },
                  {
                    key: 'correction',
                    labelText: 'Correction',
                    labelNode: (
                      <span>
                        C<span className="underline">o</span>rrection
                      </span>
                    ),
                    items: ['Dust & Scratch...'],
                  },
                  {
                    key: 'creative',
                    labelText: 'Creative',
                    labelNode: (
                      <span>
                        Creati<span className="underline">v</span>e
                      </span>
                    ),
                    items: ['Crafts...', 'Crystalize...', 'Fabric...', 'Frame...', 'Glass Block...', 'Kids Play...', 'Mosaic...', 'Particles...', 'Scatter...', 'Smoked Glass...', 'Stained Glass...', 'Vignette...', 'Vortex...', 'Weather...'],
                  },
                  {
                    key: 'custom',
                    labelText: 'Custom',
                    labelNode: (
                      <span>
                        C<span className="underline">u</span>stom
                      </span>
                    ),
                    items: ['Bump Map...', 'User Defined...'],
                  },
                  {
                    key: 'distort',
                    labelText: 'Distort',
                    labelNode: (
                      <span>
                        <span className="underline">D</span>istort
                      </span>
                    ),
                    items: ['Blocks...', 'Displace...', 'Offset...', 'Pixelate...', 'Ripple...', 'Swirl...', 'Tile...', 'Wet Paint...', 'Whirlpool...', 'Wind...'],
                  },
                  {
                    key: 'noise',
                    labelText: 'Noise',
                    labelNode: (
                      <span>
                        <span className="underline">N</span>oise
                      </span>
                    ),
                    items: ['Add Noise...', 'Maximum...', 'Median...', 'Minimum...', 'Remove Moire...', 'Remove Noise...'],
                  },
                  {
                    key: 'sharpen',
                    labelText: 'Sharpen',
                    labelNode: (
                      <span>
                        <span className="underline">S</span>harpen
                      </span>
                    ),
                    items: ['Adaptive Unsharp...', 'Directional Sharpen...', 'High Pass...', 'Sharpen...', 'Unsharp Mask...'],
                  },
                  {
                    key: 'texture',
                    labelText: 'Texture',
                    labelNode: (
                      <span>
                        <span className="underline">T</span>exture
                      </span>
                    ),
                    items: ['Brick Wall...', 'Bubbles...', 'Canvas...', 'Cobblestone...', 'Elephant Skin...', 'Etching...', 'Plastic...', 'Relief Sculpture...', 'Stone...', 'Underpainting...', 'Woodgrain...'],
                  },
                  {
                    key: 'transform_cat',
                    labelText: 'Transform',
                    labelNode: (
                      <span>
                        Tran<span className="underline">s</span>form
                      </span>
                    ),
                    items: ['Deinterlace...', 'Invert Colors', 'Posterize...'],
                  },
                ];

                return (
                  <div
                    className={`relative left-0 top-0 mt-0.5`}
                    onMouseLeave={() => setActiveEffectsSubmenu(null)}
                  >
                    <div
                      className={`absolute left-0 top-0 w-56 rounded-xs shadow-2xl py-1 z-50 text-[12px] border select-none ${
                        isDark
                          ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                          : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                      }`}
                    >
                      {/* Left CorelDRAW Icon Gutter Strip */}
                      <div
                        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-7 border-r ${
                          isDark ? 'bg-[#46494f] border-[#646870]' : 'bg-[#eeeeef] border-[#d8dadf]'
                        }`}
                      />

                      {/* 1. Flatten Effects (with fx icon in gutter) */}
                      <button
                        disabled={!hasAnyEffect}
                        onMouseEnter={() => setActiveEffectsSubmenu(null)}
                        onClick={() => {
                          onEffectAction?.('flatten_effects');
                          setActiveMenu(null);
                          setActiveEffectsSubmenu(null);
                        }}
                        className="relative z-10 w-full text-left pl-1 pr-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <span className="w-5 flex items-center justify-center shrink-0 italic font-serif font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                          fx
                        </span>
                        <span>Flatten Effects</span>
                      </button>

                      <div className={`relative z-10 h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                      {/* 15 Flyout Effect Categories */}
                      {effectCategories.map((cat) => (
                        <div
                          key={cat.key}
                          className="relative z-10"
                          onMouseEnter={() => setActiveEffectsSubmenu(cat.key)}
                        >
                          <button
                            onClick={() => {
                              onEffectAction?.('filter', {
                                category: cat.labelText,
                                effectName: cat.items[0],
                              });
                              setActiveMenu(null);
                              setActiveEffectsSubmenu(null);
                            }}
                            className={`w-full text-left pl-8 pr-2.5 py-1 flex items-center justify-between ${
                              activeEffectsSubmenu === cat.key
                                ? isDark
                                  ? 'bg-zinc-700'
                                  : 'bg-[#d4d7dc]'
                                : 'hover:bg-[#c9ced4] dark:hover:bg-zinc-700'
                            }`}
                          >
                            {cat.labelNode}
                            <span className="text-[9px] text-zinc-600 dark:text-zinc-400">▶</span>
                          </button>

                          {activeEffectsSubmenu === cat.key && (
                            <div
                              className={`absolute left-full top-0 ml-0.5 w-56 rounded-xs shadow-xl py-1 z-50 border text-[12px] ${
                                isDark
                                  ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                                  : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                              }`}
                            >
                              {cat.items.map((subName) => (
                                <button
                                  key={subName}
                                  onClick={() => {
                                    onEffectAction?.('filter', {
                                      category: cat.labelText,
                                      effectName: subName,
                                    });
                                    setActiveMenu(null);
                                    setActiveEffectsSubmenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1 hover:bg-[#0078d7] hover:text-white"
                                >
                                  {subName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className={`relative z-10 h-px my-1 ml-7 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`} />

                      {/* Bottom 9 Vector / Creative Effect Tools */}
                      {[
                        {
                          action: 'artistic_media',
                          label: (
                            <span>
                              Artistic Me<span className="underline">d</span>ia
                            </span>
                          ),
                        },
                        {
                          action: 'bevel',
                          label: (
                            <span>
                              Be<span className="underline">v</span>el
                            </span>
                          ),
                        },
                        {
                          action: 'blend',
                          label: (
                            <span>
                              <span className="underline">B</span>lend
                            </span>
                          ),
                        },
                        {
                          action: 'contour',
                          label: (
                            <span>
                              <span className="underline">C</span>ontour
                            </span>
                          ),
                          shortcut: 'Ctrl+F9',
                        },
                        {
                          action: 'envelope',
                          label: (
                            <span>
                              <span className="underline">E</span>nvelope
                            </span>
                          ),
                          shortcut: 'Ctrl+F7',
                        },
                        {
                          action: 'extrude',
                          label: (
                            <span>
                              <span className="underline">E</span>xtrude
                            </span>
                          ),
                        },
                        {
                          action: 'lens',
                          label: (
                            <span>
                              Len<span className="underline">s</span>
                            </span>
                          ),
                          shortcut: 'Alt+F3',
                        },
                        {
                          action: 'photococktail',
                          label: (
                            <span>
                              <span className="underline">P</span>hotoCocktail
                            </span>
                          ),
                        },
                        {
                          action: 'pointillizer',
                          label: (
                            <span>
                              <span className="underline">P</span>ointillizer
                            </span>
                          ),
                        },
                      ].map((entry) => (
                        <button
                          key={entry.action}
                          onMouseEnter={() => setActiveEffectsSubmenu(null)}
                          onClick={() => {
                            onEffectAction?.(entry.action);
                            setActiveMenu(null);
                            setActiveEffectsSubmenu(null);
                          }}
                          className="relative z-10 w-full text-left pl-8 pr-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                        >
                          {entry.label}
                          {entry.shortcut && (
                            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              {entry.shortcut}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Layout Dropdown Menu (Exact CorelDRAW Layout Menu matching layout_tab_457dd0e8.png) */}
              {activeMenu === 'layout' && item.key === 'layout' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-60 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                    isDark
                      ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                  }`}
                  onMouseLeave={() => setActiveLayoutSubmenu(null)}
                >
                  {/* 1. Insert Page... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      (onInsertPage || onAddPage)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconInsertPage className="w-4 h-4 shrink-0" />
                      <span><span className="underline">I</span>nsert Page...</span>
                    </span>
                  </button>

                  {/* 2. Duplicate Page... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onDuplicatePage?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDuplicatePage className="w-4 h-4 shrink-0" />
                      <span><span className="underline">D</span>uplicate Page...</span>
                    </span>
                  </button>

                  {/* 3. Rename Page... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onRenamePage?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconRenamePage className="w-4 h-4 shrink-0" />
                      <span>Ren<span className="underline">a</span>me Page...</span>
                    </span>
                  </button>

                  {/* 4. Delete Page... */}
                  <button
                    disabled={pagesCount <= 1}
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onDeletePage?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDeletePage className="w-4 h-4 shrink-0" />
                      <span><span className="underline">D</span>elete Page...</span>
                    </span>
                  </button>

                  {/* 5. Go to Page... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onGoToPage?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconGoToPage className="w-4 h-4 shrink-0" />
                      <span><span className="underline">G</span>o to Page...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 6. Insert Page Number > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveLayoutSubmenu('insert_page_number')}
                  >
                    <button
                      onClick={() =>
                        setActiveLayoutSubmenu(
                          activeLayoutSubmenu === 'insert_page_number' ? null : 'insert_page_number'
                        )
                      }
                      className={`w-full text-left px-2.5 py-1 flex items-center justify-between ${
                        activeLayoutSubmenu === 'insert_page_number'
                          ? isDark
                            ? 'bg-[#0078d7] text-white'
                            : 'bg-[#cde6f7] text-zinc-900'
                          : 'hover:bg-[#c9ced4] dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 shrink-0" />
                        <span>Insert Page <span className="underline">N</span>umber</span>
                      </span>
                      <span className="text-[10px] opacity-75">▶</span>
                    </button>

                    {activeLayoutSubmenu === 'insert_page_number' && (
                      <div
                        className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-2xl py-1 z-50 text-[12px] border ${
                          isDark
                            ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                            : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onInsertPageNumber?.('active');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center gap-2.5"
                        >
                          <IconLayerActive className="w-4 h-4 shrink-0" />
                          <span>On <span className="underline">A</span>ctive Layer</span>
                        </button>

                        <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                        <button
                          onClick={() => {
                            onInsertPageNumber?.('all');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center gap-2.5"
                        >
                          <IconAllPages123 className="w-4 h-4 shrink-0" />
                          <span>On All <span className="underline">P</span>ages</span>
                        </button>

                        <button
                          onClick={() => {
                            onInsertPageNumber?.('odd');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center gap-2.5"
                        >
                          <IconOddPages135 className="w-4 h-4 shrink-0" />
                          <span>On All <span className="underline">O</span>dd Pages</span>
                        </button>

                        <button
                          onClick={() => {
                            onInsertPageNumber?.('even');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center gap-2.5"
                        >
                          <IconEvenPages246 className="w-4 h-4 shrink-0" />
                          <span>On All <span className="underline">E</span>ven Pages</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 7. Page Number Settings... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onPageNumberSettings?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPageNumberSettings className="w-4 h-4 shrink-0" />
                      <span>Page Number <span className="underline">S</span>ettings...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 8. Switch Page Orientation */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onUpdatePageConfig({
                        orientation: pageConfig.orientation === 'portrait' ? 'landscape' : 'portrait',
                        width: pageConfig.height,
                        height: pageConfig.width,
                      });
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSwitchOrientation className="w-4 h-4 shrink-0" />
                      <span>Switch Page Or<span className="underline">i</span>entation</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 9. Document Options... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      (onOpenPageSetupTab ? () => onOpenPageSetupTab('units') : onOpenPageSetup)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDocOptions className="w-4 h-4 shrink-0" />
                      <span>Document Options...</span>
                    </span>
                  </button>

                  {/* 10. Page Size... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      (onOpenPageSetupTab ? () => onOpenPageSetupTab('size') : onOpenPageSetup)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPageSize className="w-4 h-4 shrink-0" />
                      <span><span className="underline">P</span>age Size...</span>
                    </span>
                  </button>

                  {/* Autofit Page */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onAutofitPage?.(currentAutofitMarginPx);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconAutofitPage className="w-4 h-4 shrink-0" />
                      <span>Autofit Page</span>
                    </span>
                  </button>

                  {/* 11. Page Layout... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      (onOpenPageSetupTab ? () => onOpenPageSetupTab('orientation') : onOpenPageSetup)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPageLayout className="w-4 h-4 shrink-0" />
                      <span>Page La<span className="underline">y</span>out...</span>
                    </span>
                  </button>

                  {/* 12. Page Background... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      (onOpenPageSetupTab ? () => onOpenPageSetupTab('background') : onOpenPageSetup)?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPageBackground className="w-4 h-4 shrink-0" />
                      <span>Page <span className="underline">B</span>ackground...</span>
                    </span>
                  </button>

                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* 13. Border and Grommet... */}
                  <button
                    onMouseEnter={() => setActiveLayoutSubmenu(null)}
                    onClick={() => {
                      onBorderAndGrommet?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1 hover:bg-[#c9ced4] dark:hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconBorderGrommet className="w-4 h-4 shrink-0" />
                      <span>Border and Grommet...</span>
                    </span>
                  </button>
                </div>
              )}

              {/* Tools Dropdown Menu */}
              {activeMenu === 'tools' && item.key === 'tools' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-xl py-1 z-50 text-xs ${
                    isDark ? 'bg-[#4e5157] border border-[#6a6e77] text-zinc-100' : 'bg-[#f5f5f7] border border-[#a1a5ab] text-zinc-800'
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => onToggleProjectTimer?.()}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-[#0078d7]" />
                      <span>Project Timer Window...</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] opacity-80 tabular-nums">
                        {formatDurationHMS(projectTimerSeconds)}
                      </span>
                      {showProjectTimer && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </button>
                  <button
                    onClick={() => onOpenQrCode?.()}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-sky-500" />
                      <span>QR Code Generator...</span>
                    </div>
                  </button>
                  <button
                    onClick={() => onOpenRandomFiller?.()}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span>Random Filler...</span>
                    </div>
                  </button>
                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                  <button onClick={onOpenSettings} className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Options &amp; Settings...</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+J</span>
                  </button>
                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                  <button onClick={onToggleTheme} className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Window Dropdown Menu (Matches windows_3f4ff24d.jpg) */}
              {activeMenu === 'window' && item.key === 'window' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-64 rounded-xs shadow-xl py-1 z-50 text-[12px] select-none ${
                    isDark
                      ? 'bg-[#4e5157] border border-[#6a6e77] text-zinc-100'
                      : 'bg-[#f4f4f6] border border-[#9a9ea4] text-zinc-900'
                  }`}
                >
                  {[
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          Propert<span className="underline">i</span>es
                        </>
                      ),
                      shortcut: 'Alt+Enter',
                      checked: activeDockers.includes('properties'),
                      onClick: () => onToggleDocker('properties'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">O</span>bjects
                        </>
                      ),
                      checked: activeDockers.includes('objects'),
                      onClick: () => onToggleDocker('objects'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Pages',
                      checked: activeDockers.includes('pages'),
                      onClick: () => onToggleDocker('pages'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">C</span>omments
                        </>
                      ),
                      checked: activeDockers.includes('comments'),
                      onClick: () => onToggleDocker('comments'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Object Data',
                      checked: activeDockers.includes('object_data'),
                      onClick: () => onToggleDocker('object_data'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          Object <span className="underline">S</span>tyles
                        </>
                      ),
                      shortcut: 'Ctrl+F5',
                      checked: activeDockers.includes('object_styles'),
                      onClick: () => onToggleDocker('object_styles'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          Symb<span className="underline">o</span>ls
                        </>
                      ),
                      shortcut: 'Ctrl+F3',
                      checked: activeDockers.includes('symbols'),
                      onClick: () => onToggleDocker('symbols'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">F</span>ind and Replace
                        </>
                      ),
                      shortcut: 'Ctrl+F',
                      checked: !!findReplaceOpen,
                      onClick: () => onOpenFindReplace?.(),
                    },
                    {
                      type: 'item' as const,
                      label: 'Export',
                      checked: false,
                      onClick: () => onExport('png'),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">T</span>ransform
                        </>
                      ),
                      shortcut: 'Alt+F7',
                      checked: activeDockers.includes('transform'),
                      onClick: () => onToggleDocker('transform'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Coordinates',
                      checked: activeDockers.includes('coordinates'),
                      onClick: () => onToggleDocker('coordinates'),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          Live <span className="underline">G</span>uides
                        </>
                      ),
                      checked: !!showAlignmentGuides,
                      onClick: () => onToggleAlignmentGuides?.(),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">G</span>uidelines
                        </>
                      ),
                      checked: !!showGuidelines,
                      onClick: () => onToggleGuidelines?.(),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">A</span>lign and Distribute
                        </>
                      ),
                      shortcut: 'Ctrl+Shift+A',
                      checked: activeDockers.includes('align'),
                      onClick: () => onToggleDocker('align'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Fit Objects to Path',
                      checked: activeDockers.includes('fit_to_path'),
                      onClick: () => onToggleDocker('fit_to_path'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Step and Repeat',
                      shortcut: 'Ctrl+Shift+D',
                      checked: false,
                      onClick: () => onOpenStepAndRepeat?.(),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          S<span className="underline">h</span>ape
                        </>
                      ),
                      checked: activeDockers.includes('shape'),
                      onClick: () => onToggleDocker('shape'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Corners',
                      checked: activeDockers.includes('corners'),
                      onClick: () => onToggleDocker('corners'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">J</span>oin Curves
                        </>
                      ),
                      checked: activeDockers.includes('join_curves'),
                      onClick: () => onToggleDocker('join_curves'),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          Te<span className="underline">x</span>t
                        </>
                      ),
                      shortcut: 'Ctrl+T',
                      checked: activeDockers.includes('text'),
                      onClick: () => onToggleDocker('text'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Font Sampler',
                      checked: activeDockers.includes('font_sampler'),
                      onClick: () => onToggleDocker('font_sampler'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">G</span>lyphs
                        </>
                      ),
                      shortcut: 'Ctrl+F11',
                      checked: activeDockers.includes('glyphs'),
                      onClick: () => onToggleDocker('glyphs'),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'submenu' as const,
                      key: 'effects',
                      label: 'Effects',
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          C<span className="underline">o</span>lor
                        </>
                      ),
                      checked: activeDockers.includes('color'),
                      onClick: () => onToggleDocker('color'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Palettes',
                      checked: activeDockers.includes('palettes'),
                      onClick: () => onToggleDocker('palettes'),
                    },
                    {
                      type: 'item' as const,
                      label: (
                        <>
                          <span className="underline">C</span>olor Styles
                        </>
                      ),
                      shortcut: 'Ctrl+F6',
                      checked: activeDockers.includes('color_styles'),
                      onClick: () => onToggleDocker('color_styles'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Color Proofing',
                      checked: !!proofColors,
                      onClick: () => onToggleProofColors?.(),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: 'Assets',
                      checked: activeDockers.includes('assets'),
                      onClick: () => onToggleDocker('assets'),
                    },
                    {
                      type: 'item' as const,
                      label: 'Tray',
                      checked: activeDockers.includes('tray'),
                      onClick: () => onToggleDocker('tray'),
                    },
                    { type: 'sep' as const },
                    {
                      type: 'item' as const,
                      label: 'Links and Rollovers',
                      checked: activeDockers.includes('links'),
                      onClick: () => onToggleDocker('links'),
                    },
                  ].map((entry, idx) => {
                    if (entry.type === 'sep') {
                      return (
                        <div
                          key={`win-sep-${idx}`}
                          className={`h-px my-1 ml-6 mr-1 ${isDark ? 'bg-zinc-700' : 'bg-[#d4d6da]'}`}
                        />
                      );
                    }
                    if (entry.type === 'submenu') {
                      return (
                        <div
                          key="win-effects-sub"
                          className="relative"
                          onMouseEnter={() => setActiveWindowSubmenu('effects')}
                        >
                          <button
                            onClick={() => {
                              onToggleDocker('effects');
                              setActiveMenu(null);
                              setActiveWindowSubmenu(null);
                            }}
                            className={`w-full text-left px-2 py-1 flex items-center justify-between ${
                              activeWindowSubmenu === 'effects'
                                ? isDark
                                  ? 'bg-zinc-700 text-white'
                                  : 'bg-[#c9ced4] text-zinc-900'
                                : isDark
                                ? 'hover:bg-zinc-700'
                                : 'hover:bg-[#c9ced4]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                                {activeDockers.includes('effects') && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                              </span>
                              <span>{entry.label}</span>
                            </span>
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">▶</span>
                          </button>

                          {activeWindowSubmenu === 'effects' && (
                            <div
                              className={`absolute left-full top-0 ml-0.5 w-48 rounded-xs shadow-xl py-1 z-50 border ${
                                isDark
                                  ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                                  : 'bg-[#f4f4f6] border-[#9a9ea4] text-zinc-900'
                              }`}
                            >
                              {[
                                { label: 'Shadow', tool: 'shadow' as ToolType },
                                { label: 'Contour', tool: 'contour' as ToolType },
                                { label: 'Blend', tool: 'blend' as ToolType },
                                { label: 'Distort', tool: 'distort' as ToolType },
                                { label: 'Envelope', tool: 'envelope' as ToolType },
                                { label: 'Extrude', tool: 'extrude' as ToolType },
                                { label: 'Block Shadow', tool: 'block_shadow' as ToolType },
                                { label: 'Transparency', tool: 'transparency' as ToolType },
                                { label: 'Artistic Media', tool: 'artistic_media' as ToolType },
                              ].map((eff) => (
                                <button
                                  key={eff.tool}
                                  onClick={() => {
                                    onSelectTool?.(eff.tool);
                                    setActiveMenu(null);
                                    setActiveWindowSubmenu(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                                >
                                  <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                                    {activeTool === eff.tool && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                  </span>
                                  <span>{eff.label}</span>
                                </button>
                              ))}
                              <div className={`h-px my-1 mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                              <button
                                onClick={() => {
                                  onToggleDocker('effects');
                                  setActiveMenu(null);
                                  setActiveWindowSubmenu(null);
                                }}
                                className="w-full text-left px-2.5 py-1 hover:bg-[#0078d7] hover:text-white flex items-center gap-2"
                              >
                                <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                                  {activeDockers.includes('effects') && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                </span>
                                <span>Effects Docker...</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <button
                        key={`win-item-${idx}`}
                        onMouseEnter={() => setActiveWindowSubmenu(null)}
                        onClick={() => {
                          entry.onClick();
                          setActiveMenu(null);
                          setActiveWindowSubmenu(null);
                        }}
                        className={`w-full text-left px-2 py-1 flex items-center justify-between ${
                          isDark ? 'hover:bg-zinc-700' : 'hover:bg-[#c9ced4]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                            {entry.checked && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                          </span>
                          <span>{entry.label}</span>
                        </span>
                        {entry.shortcut && (
                          <span className="text-zinc-500 dark:text-zinc-400 text-[11px] pl-3">{entry.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Help Dropdown Menu */}
              {activeMenu === 'help' && item.key === 'help' && (
                <div
                  className={`absolute left-0 top-full mt-0.5 w-60 rounded-xs shadow-xl py-1 z-50 text-xs ${
                    isDark ? 'bg-[#4e5157] border border-[#6a6e77] text-zinc-100' : 'bg-[#f5f5f7] border border-[#a1a5ab] text-zinc-800'
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => onToggleDocker('hints')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <span>TraceDraw User Guide</span>
                    <span className="font-mono text-[10px] opacity-70">F1</span>
                  </button>
                  <button
                    onClick={() => onToggleDocker('hints')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <span>CorelDRAW Shortcuts</span>
                  </button>
                  <button
                    onClick={() => onToggleDocker('hints')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex justify-between items-center"
                  >
                    <span>Snapping & Snapping Engine Guide</span>
                  </button>
                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                  <div className="px-3 py-1.5 text-zinc-500 text-[10.5px]">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">TraceDraw / CorelDRAW Web</div>
                    <div>High-precision vector editor with magnetic node snapping.</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right side: Project Timer & Real-time collaboration */}
        <div className={`flex items-center space-x-2 ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>
          <button
            onClick={() => onToggleProjectTimer?.()}
            title="Open / Toggle Project Timer Window"
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-xs border text-[11px] transition cursor-pointer ${
              showProjectTimer
                ? isDark
                  ? 'bg-[#5c6068] border-sky-400 text-white'
                  : 'bg-[#d0e1f9] border-[#7da2ce] text-zinc-900'
                : isDark
                ? 'bg-[#53575f] border-[#6a6e77] text-zinc-100 hover:bg-[#5e626b]'
                : 'bg-[#e2e4e8] border-zinc-300 text-zinc-800 hover:bg-[#d5d8de]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                projectTimerStatus === 'running'
                  ? 'bg-emerald-500 animate-pulse'
                  : projectTimerStatus === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-zinc-400'
              }`}
            />
            <Timer className="w-3 h-3 text-[#38bdf8]" />
            <span className="font-mono text-[10.5px] font-semibold tabular-nums">
              {formatDurationHMS(projectTimerSeconds)}
            </span>
          </button>
          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-xs border text-[11px] ${
            isDark ? 'bg-[#53575f] border-[#6a6e77] text-zinc-100' : 'bg-[#e2e4e8] border-zinc-300 text-zinc-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono text-[10px]">Room: {roomId}</span>
          </div>
          <button
            onClick={() => setShowCollabModal(true)}
            className="flex items-center space-x-1 px-2 py-0.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded-xs text-[11px] font-medium shadow-xs"
          >
            <Users className="w-3 h-3" />
            <span>Collab ({collaborators.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: CorelDRAW Standard Command Bar (Exact Icons from Screenshot)
          ========================================================================= */}
      <div className={`h-8 border-b px-1.5 flex items-center gap-1 relative z-20 ${
        isDark ? 'corel-dark-bar bg-[#4d5056] border-[#646870] text-zinc-100' : 'bg-[#ebecee] border-[#cfd1d6] text-zinc-900'
      }`}>
        {/* New Document */}
        <button onClick={onNewDocument} title="New Document (Ctrl+N)" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconDocNew className="w-4 h-4" />
        </button>

        {/* Open Document with dropdown */}
        <div className="flex items-center">
          <button onClick={onOpenJSON} title="Open Document (Ctrl+O)" className="p-1 hover:bg-[#dbe0e6] rounded-l-xs border border-transparent hover:border-zinc-300">
            <IconFolderOpen className="w-4 h-4" />
          </button>
          <button onClick={onOpenJSON} className="p-0.5 hover:bg-[#dbe0e6] rounded-r-xs text-zinc-600">
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => (onSave || (() => onExport('ndr')))()}
          title="Save Document (.ndr) (Ctrl+S)"
          className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300"
        >
          <IconSaveDisk className="w-4 h-4" />
        </button>

        {/* Cloud Open & Cloud Save */}
        <button onClick={onOpenFromCloud || onOpenJSON} title="Open from Cloud" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconCloudOpen className="w-4 h-4" />
        </button>
        <button onClick={onSaveToCloud || (() => onExport('ndr'))} title="Save to Cloud" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconCloudSave className="w-4 h-4" />
        </button>

        {/* Print */}
        <button onClick={() => window.print()} title="Print Document (Ctrl+P)" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconPrinter className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Cut, Copy, Paste */}
        <button
          onClick={onCut}
          disabled={!selectedObject}
          title="Cut (Ctrl+X)"
          className="p-1 hover:bg-[#dbe0e6] dark:hover:bg-zinc-700 rounded-xs border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-40 transition"
        >
          <IconCut className="w-4 h-4" />
        </button>
        <button
          onClick={onCopy}
          disabled={!selectedObject}
          title="Copy (Ctrl+C)"
          className="p-1 hover:bg-[#dbe0e6] dark:hover:bg-zinc-700 rounded-xs border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-40 transition"
        >
          <IconCopyDoc className="w-4 h-4" />
        </button>
        <button
          onClick={onPaste}
          disabled={!canPaste}
          title="Paste (Ctrl+V)"
          className="p-1 hover:bg-[#dbe0e6] dark:hover:bg-zinc-700 rounded-xs border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-40 transition"
        >
          <IconPasteDoc className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Undo / Redo */}
        <div className="flex items-center">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 hover:bg-[#dbe0e6] rounded-xs text-zinc-700 disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className="w-2.5 h-2.5 text-zinc-500 mr-1 cursor-pointer" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 hover:bg-[#dbe0e6] rounded-xs text-zinc-700 disabled:opacity-30"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className="w-2.5 h-2.5 text-zinc-500 cursor-pointer" />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Import, Export, Export PDF */}
        <button onClick={onOpenJSON} title="Import (Ctrl+I)" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconImportArrow className="w-4 h-4" />
        </button>
        <button onClick={() => onExport('svg')} title="Export Vector SVG (Ctrl+E)" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconExportArrow className="w-4 h-4" />
        </button>
        <button onClick={() => onExport('pdf')} title="Publish To PDF" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconExportPdf className="w-4 h-4" />
        </button>
        <button
          onClick={() => onOpenQrCode?.()}
          title="Insert Vector QR Code Generator"
          className="p-1 hover:bg-[#dbe0e6] dark:hover:bg-zinc-700 rounded-xs border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 flex items-center gap-1 text-zinc-800 dark:text-zinc-200 transition"
        >
          <QrCode className="w-4 h-4 text-[#0078d7]" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Zoom Level Dropdown (Includes To Page, To Width, To Height, To Fit & up to 409,600%) */}
        <div className="flex items-center bg-white border border-[#abadb3] rounded-xs px-1.5 py-0.5 h-6">
          <select
            value={Math.max(1, Math.round(zoomLevel * 100))}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'to_page' || val === 'to_width' || val === 'to_height' || val === 'to_fit') {
                onZoomMode?.(val);
              } else {
                onZoomSet(Math.min(4096, Math.max(0.01, Number(val) / 100)));
              }
            }}
            title="Zoom Levels (To Page, To Width, To Height, To Fit, or %)"
            className="text-xs text-zinc-900 bg-transparent outline-none cursor-pointer pr-1 font-sans"
          >
            <optgroup label="Fit Options">
              <option value="to_page">To Page (Shift+F4)</option>
              <option value="to_width">To Width</option>
              <option value="to_height">To Height</option>
              <option value="to_fit">To Fit (F4)</option>
            </optgroup>
            <optgroup label="Zoom Levels">
              {(() => {
                const curPct = Math.max(1, Math.round(zoomLevel * 100));
                const presets = [
                  1, 5, 10, 25, 50, 75, 100, 150, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 50000, 100000, 200000, 409600,
                ];
                const list = presets.includes(curPct)
                  ? presets
                  : [...presets, curPct].sort((a, b) => a - b);
                return list.map((pct) => (
                  <option key={pct} value={pct}>
                    {pct.toLocaleString()}%
                  </option>
                ));
              })()}
            </optgroup>
          </select>
        </div>

        {/* Full Screen Preview F9 */}
        <button onClick={onZoomFit} title="Full-Screen Preview (F9)" className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300">
          <IconFullScreenF9 className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Show Rulers, Grid, Guidelines */}
        <button
          onClick={onToggleRulers}
          title="Show Rulers"
          className={`p-1 rounded-xs border ${showRulers ? 'bg-[#d0e1f9] border-[#7da2ce]' : 'hover:bg-[#dbe0e6] border-transparent'}`}
        >
          <IconRulersEye className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleGrid}
          title="Show Grid"
          className={`p-1 rounded-xs border ${showGrid ? 'bg-[#d0e1f9] border-[#7da2ce]' : 'hover:bg-[#dbe0e6] border-transparent'}`}
        >
          <IconGridEye className="w-4 h-4" />
        </button>
        <button
          title="Show Guidelines"
          className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-transparent hover:border-zinc-300"
        >
          <IconGuidelinesEye className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

        {/* Snap Off & Snap To */}
        <div className="relative flex items-center">
          {/* Master Snap Button: CorelDRAW Snap Off / Snap On toggle */}
          <button
            onClick={() => onUpdateSnapConfig({ enabled: !snapConfig.enabled })}
            title={
              snapConfig.enabled
                ? 'Snap Off (Click to turn snapping off)'
                : 'Snap On (Click to turn snapping on)'
            }
            className={`p-1 rounded-xs border transition-colors ${
              snapConfig.enabled
                ? isDark
                  ? 'bg-blue-900/40 border-blue-500/60 text-blue-300'
                  : 'bg-[#d0e1f9] border-[#7da2ce] text-[#004e98]'
                : isDark
                ? 'hover:bg-zinc-700 border-transparent text-zinc-500 opacity-60'
                : 'hover:bg-[#dbe0e6] border-transparent text-zinc-400 opacity-60'
            }`}
          >
            <IconSnapToggle className="w-4 h-4" active={snapConfig.enabled} />
          </button>

          {/* Snap To Dropdown trigger */}
          <div className="relative">
            <button
              ref={snapButtonRef}
              onClick={handleToggleSnapMenu}
              className={`flex items-center text-xs px-1.5 py-0.5 rounded-xs cursor-pointer border transition-colors ${
                snapMenuOpen
                  ? isDark
                    ? 'bg-[#5c6068] border-[#747982] text-white'
                    : 'bg-[#c9d0d8] border-[#a1a5ab] text-black font-medium'
                  : isDark
                  ? 'text-zinc-100 hover:bg-[#5c6068] border-transparent hover:border-[#6e737d]'
                  : 'text-zinc-800 hover:bg-[#dbe0e6] border-transparent hover:border-zinc-300'
              }`}
            >
              <span>Snap <u>T</u>o</span>
              <ChevronDown className="w-2.5 h-2.5 ml-1" />
            </button>

            {/* Snap To Dropdown Popover */}
            {snapMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[99]"
                  onClick={() => setSnapMenuOpen(false)}
                />
                <div
                  className={`fixed w-60 rounded-xs shadow-2xl py-1.5 z-[100] text-xs border ${
                    isDark ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100' : 'bg-[#f5f5f7] border-[#a1a5ab] text-zinc-800'
                  }`}
                  style={{
                    top: `${snapMenuPos.top}px`,
                    left: `${snapMenuPos.left}px`,
                    fontFamily: 'Segoe UI, Tahoma, sans-serif'
                  }}
                >
                  <div className={`px-3 py-1 font-semibold text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Snap To
                  </div>
                  <div className={`h-px my-0.5 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                  {/* Document Grid */}
                  <button
                    onClick={() => onUpdateSnapConfig({ snapToGrid: !snapConfig.snapToGrid })}
                    className={`w-full text-left px-3 py-1.5 flex justify-between items-center ${
                      isDark ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-[#0078d7] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 flex items-center justify-center">
                        {snapConfig.snapToGrid && <Check className="w-3.5 h-3.5 text-blue-500 group-hover:text-white" />}
                      </span>
                      <span>Document <u>G</u>rid</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">Ctrl+Y</span>
                  </button>

                  {/* Objects */}
                  <button
                    onClick={() => onUpdateSnapConfig({ snapToObjects: !snapConfig.snapToObjects })}
                    className={`w-full text-left px-3 py-1.5 flex justify-between items-center ${
                      isDark ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-[#0078d7] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 flex items-center justify-center">
                        {snapConfig.snapToObjects && <Check className="w-3.5 h-3.5 text-blue-500 group-hover:text-white" />}
                      </span>
                      <span><u>O</u>bjects</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">Alt+Z</span>
                  </button>

                  {/* Page */}
                  <button
                    onClick={() => onUpdateSnapConfig({ snapToPage: !snapConfig.snapToPage })}
                    className={`w-full text-left px-3 py-1.5 flex justify-between items-center ${
                      isDark ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-[#0078d7] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 flex items-center justify-center">
                        {snapConfig.snapToPage && <Check className="w-3.5 h-3.5 text-blue-500 group-hover:text-white" />}
                      </span>
                      <span><u>P</u>age</span>
                    </div>
                  </button>

                  <div className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

                  {/* Master Snapping Switch */}
                  <button
                    onClick={() => onUpdateSnapConfig({ enabled: !snapConfig.enabled })}
                    className={`w-full text-left px-3 py-1.5 flex justify-between items-center font-medium ${
                      isDark ? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-[#0078d7] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 flex items-center justify-center">
                        {snapConfig.enabled && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </span>
                      <span>Snapping {snapConfig.enabled ? 'On' : 'Off'}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      snapConfig.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {snapConfig.enabled ? 'Active' : 'Off'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Options / Settings Gear */}
        <button
          onClick={onOpenSettings}
          title="Options & Settings (Ctrl+J)"
          className={`p-1 rounded-xs border border-transparent ${
            isDark ? 'hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300' : 'hover:bg-[#dbe0e6] hover:border-zinc-300 text-zinc-700'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Quick Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          className={`p-1 rounded-xs border border-transparent ${
            isDark ? 'hover:bg-zinc-700 hover:border-zinc-600 text-amber-400' : 'hover:bg-[#dbe0e6] hover:border-zinc-300 text-indigo-600'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Docker Quick View Toggle */}
        <button
          onClick={() => onToggleDocker('objects')}
          title="Toggle Objects Docker"
          className={`p-1 rounded-xs border border-transparent ${
            activeDockers.includes('objects')
              ? 'bg-[#d0e1f9] border-[#7da2ce] text-[#004e98]'
              : isDark
              ? 'hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300'
              : 'hover:bg-[#dbe0e6] hover:border-zinc-300 text-zinc-700'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* AI Generate Button (Exact from TraceDraw image_2b0a935b.png) */}
        <button
          onClick={() => onToggleDocker('ai_generate')}
          title="AI Vector Generation"
          className="flex items-center text-xs text-sky-700 dark:text-sky-300 px-2 py-0.5 hover:bg-sky-100 dark:hover:bg-sky-950/60 rounded-xs cursor-pointer border border-sky-300 dark:border-sky-700 font-medium ml-1 transition"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-500" />
          <span>AI Generate</span>
          <ChevronDown className="w-2.5 h-2.5 ml-1 opacity-70" />
        </button>
      </div>

      {/* =========================================================================
          ROW 3: Exact CorelDRAW Property Bar (Matches Screenshot)
          ========================================================================= */}
      <div className={`h-9 px-2 flex items-center gap-2 overflow-x-auto text-xs border-t ${
        isDark ? 'corel-dark-bar bg-[#52555c] border-[#676b73] text-zinc-100' : 'bg-[#ebecee] border-[#f5f6f8]'
      }`}>
        {activeTool === 'shape' ? (
          /* Shape Tool (F10): CorelDRAW Curve & Node Editing Property Bar */
          <div className="flex items-center gap-1.5 w-full shrink-0">
            <div className="flex items-center gap-1 pr-1.5 border-r border-[#c2c5cb] shrink-0">
              <Spline className="w-3.5 h-3.5 text-[#0078d7]" />
              <span className="font-semibold text-[11px] text-zinc-800">Shape Tool (F10)</span>
            </div>

            {curveEditState?.isCurveObject ? (
              <>
                {/* Manual Add Point Mode (Click anywhere) + Add / Delete Nodes */}
                <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => onCurveAction?.('toggle_add_node_mode')}
                    title="Interactive Add Point Mode: Click anywhere on any curve segment to insert a node, or click on canvas to extend open curves (Alt+Click / Double-Click also adds points)"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs font-medium transition cursor-pointer ${
                      curveEditState.addNodeMode
                        ? 'bg-[#dcfce7] border border-[#16a34a] text-[#14532d] font-semibold shadow-2xs'
                        : 'hover:bg-[#dbe0e6] text-zinc-900'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 12 C5 4, 11 4, 14 12" />
                      <circle cx="8" cy="6" r="2" fill="#16a34a" stroke="#14532d" />
                      <path d="M12.5 1.5v4M10.5 3.5h4" stroke="#16a34a" strokeWidth="1.6" />
                    </svg>
                    <span className="text-[11px]">{curveEditState.addNodeMode ? '+ Add Point (ON)' : '+ Add Point'}</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('add_node')}
                    title="Insert Node at Midpoint of Selected Segment"
                    className="px-1.5 h-6 flex items-center gap-1 hover:bg-[#dbe0e6] rounded-xs text-zinc-900 font-medium cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 12 C5 4, 11 4, 14 12" />
                      <rect x="6.5" y="4.5" width="3" height="3" fill="#0078d7" stroke="#0f172a" />
                      <path d="M12 2v4M10 4h4" stroke="#16a34a" strokeWidth="1.5" />
                    </svg>
                    <span className="text-[11px]">Add Mid</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('delete_node')}
                    disabled={curveEditState.selectedNodeCount === 0 || curveEditState.nodeCount <= 2}
                    title="Delete Selected Nodes (Del / Double-click node)"
                    className="px-1.5 h-6 flex items-center gap-1 hover:bg-[#dbe0e6] disabled:opacity-40 rounded-xs text-zinc-900 font-medium cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 12 L8 6 L14 12" />
                      <rect x="6.5" y="4.5" width="3" height="3" fill="#ef4444" stroke="#7f1d1d" />
                      <path d="M10 4h4" stroke="#dc2626" strokeWidth="1.5" />
                    </svg>
                    <span className="text-[11px]">Delete</span>
                  </button>
                </div>

                {/* Join / Break Nodes */}
                <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => onCurveAction?.('join_nodes')}
                    disabled={curveEditState.selectedNodeCount < 2}
                    title="Join Two Nodes"
                    className="px-1.5 h-6 flex items-center gap-1 hover:bg-[#dbe0e6] disabled:opacity-40 rounded-xs text-zinc-900 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <path d="M2 12 L6 8 M14 12 L10 8" />
                      <rect x="6.5" y="6.5" width="3" height="3" fill="#0078d7" />
                    </svg>
                    <span className="text-[11px]">Join</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('break_curve')}
                    disabled={curveEditState.selectedNodeCount === 0}
                    title="Break Curve at Selected Node"
                    className="px-1.5 h-6 flex items-center gap-1 hover:bg-[#dbe0e6] disabled:opacity-40 rounded-xs text-zinc-900 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <path d="M2 11 L6 7 M10 7 L14 11" />
                      <rect x="4.5" y="5.5" width="2.5" height="2.5" fill="#fff" />
                      <rect x="9" y="5.5" width="2.5" height="2.5" fill="#fff" />
                    </svg>
                    <span className="text-[11px]">Break</span>
                  </button>
                </div>

                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Segment Type: To Line / To Curve / All Bezier */}
                <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => onCurveAction?.('to_line')}
                    title="Convert Segment to Straight Line"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.activeSegmentType === 'line'
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="3" y1="12" x2="13" y2="4" />
                      <rect x="1.5" y="10.5" width="3" height="3" fill="#fff" />
                      <rect x="11.5" y="2.5" width="3" height="3" fill="#fff" />
                    </svg>
                    <span>To Line</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('to_curve')}
                    title="Convert Selected Segment to Cubic Bezier Curve"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.activeSegmentType === 'curve'
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 12 C5 3, 11 13, 13 4" />
                      <rect x="1.5" y="10.5" width="3" height="3" fill="#fff" />
                      <rect x="11.5" y="2.5" width="3" height="3" fill="#fff" />
                    </svg>
                    <span>To Curve</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('all_to_curve')}
                    title="Convert All Segments to Editable Cubic Bezier Handles"
                    className="px-1.5 h-6 flex items-center gap-1 hover:bg-[#dbe0e6] rounded-xs text-[11px] font-medium text-[#005a9e] transition cursor-pointer"
                  >
                    <Spline className="w-3 h-3" />
                    <span>All Bezier</span>
                  </button>
                </div>

                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Node Continuity Types: Cusp / Smooth / Symmetrical */}
                <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => onCurveAction?.('node_cusp')}
                    title="Cusp Node (Independent Bezier handles)"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.activeNodeType === 'cusp'
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 13 C4 6, 7 6, 8 8 C9 6, 12 6, 14 13" />
                      <rect x="6.5" y="6.5" width="3" height="3" fill="#0078d7" />
                    </svg>
                    <span>Cusp</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('node_smooth')}
                    title="Smooth Node (Auto-adds Bezier handles with collinear tangent)"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.activeNodeType === 'smooth'
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 12 C5 6, 11 6, 14 4" />
                      <circle cx="8" cy="7" r="2" fill="#0078d7" />
                    </svg>
                    <span>Smooth</span>
                  </button>
                  <button
                    onClick={() => onCurveAction?.('node_symmetrical')}
                    title="Symmetrical Node (Auto-adds equal mirrored Bezier handles)"
                    className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.activeNodeType === 'symmetrical'
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M2 12 C5 5, 11 5, 14 12" />
                      <polygon points="8,4 10.5,6.5 8,9 5.5,6.5" fill="#0078d7" />
                    </svg>
                    <span>Symmetrical</span>
                  </button>
                </div>

                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Reverse / Close Curve / Select All Nodes */}
                <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => onCurveAction?.('reverse_curve')}
                    title="Reverse Direction"
                    className="px-1.5 h-6 hover:bg-[#dbe0e6] rounded-xs text-[11px] text-zinc-800 cursor-pointer"
                  >
                    ⇄ Reverse
                  </button>
                  <button
                    onClick={() => onCurveAction?.('close_curve')}
                    title={curveEditState.isClosed ? 'Open Curve' : 'Close Curve'}
                    className={`px-1.5 h-6 rounded-xs text-[11px] transition cursor-pointer ${
                      curveEditState.isClosed
                        ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                        : 'hover:bg-[#dbe0e6] text-zinc-800'
                    }`}
                  >
                    {curveEditState.isClosed ? 'Closed ✓' : 'Close Curve'}
                  </button>
                  <button
                    onClick={() => onCurveAction?.('select_all_nodes')}
                    title="Select All Nodes (Or drag a Window Box anywhere around nodes; Shift+Drag to add)"
                    className="px-1.5 h-6 hover:bg-[#dbe0e6] rounded-xs text-[11px] text-zinc-800 cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                <span
                  className="ml-auto text-[10px] font-mono text-zinc-600 bg-white border border-[#c2c5cb] px-1.5 py-0.5 rounded-xs shrink-0"
                  title="Drag box anywhere to Window-Select nodes • Alt+Click or Double-Click to add node"
                >
                  {curveEditState.selectedNodeCount}/{curveEditState.nodeCount} nodes · Drag: Window Select
                </span>
              </>
            ) : isSelected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onConvertToCurves}
                  title="Convert Object to Editable Curves (Ctrl+Q)"
                  className="px-2.5 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1.5 text-xs text-zinc-900 font-semibold transition cursor-pointer"
                >
                  <Spline className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span>Convert to Curves (Ctrl+Q)</span>
                </button>
                <span className="text-[11px] text-zinc-600">
                  Click Convert to Curves or double-click shape to edit individual Bezier nodes, add points anywhere, &amp; window-select nodes
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-600">
                Click any curve or shape on the canvas to edit its nodes, Bezier handles, add points anywhere, &amp; window-select nodes
              </span>
            )}
          </div>
        ) : isDimensionTool ? (
          /* Dimension Tools Property Bar (Parallel, H/V, Angular, Segment, 3-Point Callout) */
          <div className="flex items-center gap-2 w-full shrink-0">
            <div className="flex items-center gap-1 pr-2 border-r border-[#c2c5cb] shrink-0">
              <IconDimension className="w-3.5 h-3.5 text-[#0078d7]" />
              <span className="font-semibold text-[11px]">Dimension Tools</span>
            </div>

            {/* 5 Dimension Subtool Switcher */}
            <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
              {[
                { id: 'dimension' as ToolType, label: 'Parallel', icon: <IconDimension className="w-3.5 h-3.5" /> },
                { id: 'hv_dimension' as ToolType, label: 'Horiz/Vert', icon: <IconHVDimension className="w-3.5 h-3.5" /> },
                { id: 'angular_dimension' as ToolType, label: 'Angular', icon: <IconAngularDimension className="w-3.5 h-3.5" /> },
                { id: 'segment_dimension' as ToolType, label: 'Segment', icon: <IconSegmentDimension className="w-3.5 h-3.5" /> },
                { id: 'callout' as ToolType, label: '2-Leg Callout', icon: <IconCallout className="w-3.5 h-3.5" /> },
              ].map((dt) => (
                <button
                  key={dt.id}
                  onClick={() => onSelectTool?.(dt.id)}
                  title={dt.label}
                  className={`px-1.5 h-6 flex items-center gap-1 rounded-xs text-[11px] transition cursor-pointer ${
                    activeTool === dt.id
                      ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                      : 'hover:bg-[#dbe0e6] text-zinc-800'
                  }`}
                >
                  {dt.icon}
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>

            {activeTool !== 'callout' && (
              <>
                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Precision */}
                {activeTool !== 'angular_dimension' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] opacity-75">Units:</span>
                    <select
                      value={dimensionConfig.unit}
                      onChange={(e) => onUpdateDimensionConfig?.({ unit: e.target.value as any })}
                      className="bg-white border border-[#abadb3] h-6 px-1 text-[11px] text-zinc-900 rounded-xs outline-none cursor-pointer"
                      title="Dimension Measurement Units"
                    >
                      <option value="auto">Auto ({activeUnitInfo.symbol})</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                      <option value="pt">pt</option>
                      <option value="px">px</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] opacity-75">Precision:</span>
                  <select
                    value={dimensionConfig.precision}
                    onChange={(e) => onUpdateDimensionConfig?.({ precision: Number(e.target.value) as 0 | 1 | 2 | 3 })}
                    className="bg-white border border-[#abadb3] h-6 px-1 text-[11px] text-zinc-900 rounded-xs outline-none cursor-pointer font-mono"
                    title="Decimal Precision"
                  >
                    <option value={0}>0</option>
                    <option value={1}>0.0</option>
                    <option value={2}>0.00</option>
                    <option value={3}>0.000</option>
                  </select>
                </div>

                {/* Style: Arrows / Ticks */}
                {activeTool !== 'angular_dimension' && (
                  <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 gap-0.5 shrink-0">
                    <button
                      onClick={() => onUpdateDimensionConfig?.({ style: 'arrows' })}
                      className={`px-1.5 h-6 rounded-xs text-[11px] cursor-pointer ${
                        dimensionConfig.style === 'arrows'
                          ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                          : 'hover:bg-[#dbe0e6] text-zinc-800'
                      }`}
                    >
                      Arrows
                    </button>
                    <button
                      onClick={() => onUpdateDimensionConfig?.({ style: 'ticks' })}
                      className={`px-1.5 h-6 rounded-xs text-[11px] cursor-pointer ${
                        dimensionConfig.style === 'ticks'
                          ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900'
                          : 'hover:bg-[#dbe0e6] text-zinc-800'
                      }`}
                    >
                      Ticks
                    </button>
                  </div>
                )}

                {/* Text Placement */}
                <button
                  onClick={() =>
                    onUpdateDimensionConfig?.({
                      textPosition: dimensionConfig.textPosition === 'above' ? 'center' : 'above',
                    })
                  }
                  title="Toggle Dimension Text Position (Above Line / Centered)"
                  className="px-2 h-6 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 cursor-pointer shrink-0"
                >
                  Text: {dimensionConfig.textPosition === 'above' ? 'Above' : 'Center'}
                </button>

                {activeTool !== 'angular_dimension' && (
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={dimensionConfig.showUnit}
                      onChange={(e) => onUpdateDimensionConfig?.({ showUnit: e.target.checked })}
                      className="accent-[#0078d7]"
                    />
                    <span>Show Unit</span>
                  </label>
                )}
              </>
            )}

            <span className="ml-auto text-[10.5px] opacity-75 shrink-0">
              {activeTool === 'angular_dimension'
                ? 'Click Vertex → Click Ray 1 → Click Ray 2 (Esc cancels)'
                : activeTool === 'callout'
                ? 'Click Target → Click Elbow → Click Shoulder (Esc cancels)'
                : activeTool === 'segment_dimension'
                ? 'Click any shape/path edge or drag between two points'
                : activeTool === 'hv_dimension'
                ? 'Drag between 2 points to measure Horizontal or Vertical span'
                : 'Drag between 2 points (OSNAP enabled; hold Shift for 15°/45°/90°)'}
            </span>
          </div>
        ) : isEffectTool ? (
          /* Interactive Drop Shadow & Effect Sub-Commands Property Bar (Dropdown) */
          (() => {
            const effectSubCommands = [
              { id: 'shadow' as ToolType, label: 'Shadow', icon: <IconShadow className="w-4 h-4" /> },
              { id: 'contour' as ToolType, label: 'Contour', icon: <IconContour className="w-4 h-4" /> },
              { id: 'blend' as ToolType, label: 'Blend', icon: <IconBlend className="w-4 h-4" /> },
              { id: 'distort' as ToolType, label: 'Distort', icon: <IconDistort className="w-4 h-4" /> },
              { id: 'envelope' as ToolType, label: 'Envelope', icon: <IconEnvelope className="w-4 h-4" /> },
              { id: 'extrude' as ToolType, label: 'Extrude', icon: <IconExtrude className="w-4 h-4" /> },
              { id: 'block_shadow' as ToolType, label: 'Block Shadow', icon: <IconBlockShadow className="w-4 h-4" /> },
            ];
            const currentEffect = effectSubCommands.find((ef) => ef.id === activeTool) || effectSubCommands[0];
            return (
              <div className="flex items-center gap-2 w-full shrink-0">
                <div className="flex items-center gap-1 pr-2 border-r border-[#c2c5cb] shrink-0">
                  <IconShadow className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span className="font-semibold text-[11px]">Drop Shadow Effects</span>
                </div>

                {/* CorelDRAW Effect Sub-Commands Dropdown */}
                <div className="relative shrink-0">
                  <button
                    ref={effectButtonRef}
                    onClick={() => {
                      if (!effectDropdownOpen && effectButtonRef.current) {
                        const rect = effectButtonRef.current.getBoundingClientRect();
                        setEffectMenuPos({
                          top: rect.bottom + 2,
                          left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
                        });
                      }
                      setEffectDropdownOpen((prev) => !prev);
                    }}
                    className="h-6 min-w-[145px] px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                    title="Select Drop Shadow Sub-Command"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {currentEffect.icon}
                      <span>{currentEffect.label}</span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  </button>

                  {effectDropdownOpen && (
                    <div
                      ref={effectDropdownRef}
                      style={{ top: effectMenuPos.top, left: effectMenuPos.left }}
                      className={`fixed z-[999] min-w-[180px] rounded-xs shadow-xl py-1 border text-[12px] ${
                        isDark
                          ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                          : 'bg-[#f5f5f7] border-zinc-400 text-zinc-900'
                      }`}
                    >
                      {effectSubCommands.map((ef) => {
                        const isSelected = activeTool === ef.id;
                        return (
                          <button
                            key={ef.id}
                            onClick={() => {
                              onSelectTool?.(ef.id);
                              setEffectDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[#0078d7] hover:text-white transition cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#5c6068] font-semibold text-white'
                                  : 'bg-[#dde8f5] font-semibold text-zinc-900'
                                : ''
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-4 h-4 flex items-center justify-center shrink-0">{ef.icon}</span>
                              <span>{ef.label}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {['contour', 'blend', 'envelope', 'extrude', 'distort'].includes(activeTool) && (
                  <button
                    onClick={() => {
                      if (activeTool === 'distort') {
                        onEffectAction?.('filter', { category: 'Distort', effectName: 'ZigZag...' });
                      } else {
                        onEffectAction?.(activeTool);
                      }
                    }}
                    className="px-2 h-6 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 cursor-pointer shrink-0 font-medium"
                    title="Open Interactive Effect Settings Dialog"
                  >
                    Effect Options...
                  </button>
                )}

                <span className="ml-auto text-[10.5px] opacity-75 shrink-0">
                  {activeTool === 'shadow'
                    ? 'Click any object on canvas to add a soft Drop Shadow'
                    : activeTool === 'contour'
                    ? 'Click any object to generate concentric Contour steps'
                    : activeTool === 'blend'
                    ? 'Click any object to generate progressive Blend steps (or select 2 objects & use Effect Options)'
                    : activeTool === 'distort'
                    ? 'Click any vector shape to apply Push & Pull vector distortion'
                    : activeTool === 'envelope'
                    ? 'Click any object to apply Envelope warp'
                    : activeTool === 'extrude'
                    ? 'Click any object to project a 3D Extrusion'
                    : 'Click any object to add a solid vector Block Shadow'}
                </span>
              </div>
            );
          })()
        ) : isFreehandCurveTool ? (
          /* Freehand & Curve Tools Property Bar (Dropdown matching image_2c33f052.png) */
          (() => {
            const curveTools = [
              { id: 'freehand' as ToolType, label: 'Freehand', shortcut: 'F5', icon: <IconFreehand className="w-4 h-4" /> },
              { id: 'line2p' as ToolType, label: '2-Point Line', icon: <IconLine2P className="w-4 h-4" /> },
              { id: 'bezier' as ToolType, label: 'Bézier', icon: <IconBezier className="w-4 h-4" /> },
              { id: 'pen' as ToolType, label: 'Pen', icon: <IconPen className="w-4 h-4" /> },
              { id: 'b_spline' as ToolType, label: 'B-Spline', icon: <IconBSpline className="w-4 h-4" /> },
              { id: 'polyline' as ToolType, label: 'Polyline', icon: <IconPolyline className="w-4 h-4" /> },
              { id: 'curve_3p' as ToolType, label: '3-Point Curve', icon: <IconCurve3P className="w-4 h-4" /> },
            ];
            const currentCurve = curveTools.find((ct) => ct.id === activeTool) || curveTools[0];
            return (
              <div className="flex items-center gap-2 w-full shrink-0">
                <div className="flex items-center gap-1 pr-2 border-r border-[#c2c5cb] shrink-0">
                  <IconFreehand className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span className="font-semibold text-[11px]">Curve Tools</span>
                </div>

                {/* Freehand Curve Sub-Tools Dropdown */}
                <div className="relative shrink-0">
                  <button
                    ref={curveButtonRef}
                    onClick={() => {
                      if (!curveDropdownOpen && curveButtonRef.current) {
                        const rect = curveButtonRef.current.getBoundingClientRect();
                        setCurveMenuPos({
                          top: rect.bottom + 2,
                          left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
                        });
                      }
                      setCurveDropdownOpen((prev) => !prev);
                    }}
                    className="h-6 min-w-[155px] px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                    title="Select Freehand / Curve Tool"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {currentCurve.icon}
                      <span>{currentCurve.label}</span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  </button>

                  {curveDropdownOpen && (
                    <div
                      ref={curveDropdownRef}
                      style={{ top: curveMenuPos.top, left: curveMenuPos.left }}
                      className={`fixed z-[999] min-w-[195px] rounded-xs shadow-xl py-1 border text-[12px] ${
                        isDark
                          ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                          : 'bg-[#f5f5f7] border-zinc-400 text-zinc-900'
                      }`}
                    >
                      {curveTools.map((ct) => {
                        const isSelected = activeTool === ct.id;
                        return (
                          <button
                            key={ct.id}
                            onClick={() => {
                              onSelectTool?.(ct.id);
                              setCurveDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[#0078d7] hover:text-white transition cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#5c6068] font-semibold text-white'
                                  : 'bg-[#dde8f5] font-semibold text-zinc-900'
                                : ''
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-4 h-4 flex items-center justify-center shrink-0">{ct.icon}</span>
                              <span>{ct.label}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              {ct.shortcut && <span className="text-[10px] opacity-65 font-mono">{ct.shortcut}</span>}
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Outline Width & Dash Controls while Drawing */}
                <div className="flex items-center gap-1 shrink-0">
                  <IconPenNib className="w-4 h-4 text-zinc-700" />
                  <select
                    value={properties.strokeWidth}
                    onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
                    className="bg-white border border-[#abadb3] px-1.5 py-0.5 h-6 text-xs text-zinc-900 outline-none cursor-pointer"
                    title="Outline Width"
                  >
                    {STROKE_WIDTHS.map((sw) => (
                      <option key={sw.value} value={sw.value}>
                        {sw.label}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={
                    !properties.strokeDashArray?.length
                      ? 'solid'
                      : properties.strokeDashArray[0] >= 4
                      ? 'dashed'
                      : 'dotted'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'solid') onUpdateProperties({ strokeDashArray: [] });
                    else if (val === 'dashed') onUpdateProperties({ strokeDashArray: [6, 4] });
                    else if (val === 'dotted') onUpdateProperties({ strokeDashArray: [2, 2] });
                  }}
                  className="bg-white border border-[#abadb3] px-2 py-0.5 h-6 text-xs text-zinc-900 outline-none cursor-pointer shrink-0"
                  title="Outline Style"
                >
                  <option value="solid">━━━━━━ Solid</option>
                  <option value="dashed">━ ━ ━ ━ Dashed</option>
                  <option value="dotted">•••••••• Dotted</option>
                </select>

                <span className="ml-auto text-[10.5px] opacity-75 shrink-0">
                  {activeTool === 'freehand'
                    ? 'Click and drag to draw a freehand stroke'
                    : activeTool === 'line2p'
                    ? 'Drag P1 → P2 to draw straight line (Shift for 15°/45°/90°)'
                    : activeTool === 'bezier' || activeTool === 'pen'
                    ? 'Click for corner or drag for smooth handle; Double-click / Enter to finish'
                    : activeTool === 'b_spline'
                    ? 'Click control vertices for smooth B-Spline; Double-click / Enter to finish'
                    : activeTool === 'polyline'
                    ? 'Click points to draw connected segments; Double-click / Enter to finish'
                    : 'Drag P1 → P2 chord, then move & click P3 to set arc'}
                </span>
              </div>
            );
          })()
        ) : isCropTool ? (
          /* Crop, Knife, Virtual Segment Delete & Eraser Property Bar (Dropdown matching image_e9f592a5.png) */
          (() => {
            const cropTools = [
              { id: 'crop' as ToolType, label: 'Crop', icon: <IconCrop className="w-4 h-4" /> },
              { id: 'knife' as ToolType, label: 'Knife', icon: <IconKnife className="w-4 h-4" /> },
              { id: 'virtual_segment_delete' as ToolType, label: 'Virtual Segment Delete', icon: <IconVirtualSegmentDelete className="w-4 h-4" /> },
              { id: 'eraser' as ToolType, label: 'Eraser', shortcut: 'X', dividerBefore: true, icon: <IconEraser className="w-4 h-4" /> },
            ];
            const currentCrop = cropTools.find((ct) => ct.id === activeTool) || cropTools[0];
            return (
              <div className="flex items-center gap-2 w-full shrink-0">
                <div className="flex items-center gap-1 pr-2 border-r border-[#c2c5cb] shrink-0">
                  <IconCrop className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span className="font-semibold text-[11px]">Crop Tools</span>
                </div>

                {/* Crop Sub-Tools Dropdown */}
                <div className="relative shrink-0">
                  <button
                    ref={cropButtonRef}
                    onClick={() => {
                      if (!cropDropdownOpen && cropButtonRef.current) {
                        const rect = cropButtonRef.current.getBoundingClientRect();
                        setCropMenuPos({
                          top: rect.bottom + 2,
                          left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)),
                        });
                      }
                      setCropDropdownOpen((prev) => !prev);
                    }}
                    className="h-6 min-w-[185px] px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                    title="Select Crop / Segment Delete Tool"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {currentCrop.icon}
                      <span>{currentCrop.label}</span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  </button>

                  {cropDropdownOpen && (
                    <div
                      ref={cropDropdownRef}
                      style={{ top: cropMenuPos.top, left: cropMenuPos.left }}
                      className={`fixed z-[999] min-w-[215px] rounded-xs shadow-xl py-1 border text-[12px] ${
                        isDark
                          ? 'bg-[#4e5157] border-[#6a6e77] text-zinc-100'
                          : 'bg-[#f5f5f7] border-zinc-400 text-zinc-900'
                      }`}
                    >
                      {cropTools.map((ct) => {
                        const isSelected = activeTool === ct.id;
                        return (
                          <React.Fragment key={ct.id}>
                            {ct.dividerBefore && (
                              <div className={`my-1 h-px ${isDark ? 'bg-[#646870]' : 'bg-zinc-300'}`} />
                            )}
                            <button
                              onClick={() => {
                                onSelectTool?.(ct.id);
                                setCropDropdownOpen(false);
                              }}
                              className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[#0078d7] hover:text-white transition cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#5c6068] font-semibold text-white'
                                    : 'bg-[#dde8f5] font-semibold text-zinc-900'
                                  : ''
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="w-4 h-4 flex items-center justify-center shrink-0">{ct.icon}</span>
                                <span>{ct.label}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                {ct.shortcut && <span className="text-[10px] opacity-65 font-mono">{ct.shortcut}</span>}
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

                {/* Tool-Specific Controls for Crop, Knife, Virtual Segment Delete, Eraser */}
                {activeTool === 'crop' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="opacity-75 font-mono">X:</span>
                      <input
                        type="number"
                        disabled={!cropToolsConfig.cropRegion}
                        value={cropToolsConfig.cropRegion ? toDisplay(cropToolsConfig.cropRegion.x) : ''}
                        placeholder="—"
                        onChange={(e) => {
                          if (!cropToolsConfig.cropRegion) return;
                          onUpdateCropToolsConfig?.({
                            cropRegion: { ...cropToolsConfig.cropRegion, x: fromDisplay(Number(e.target.value) || 0) },
                          });
                        }}
                        className="w-16 bg-white border border-[#abadb3] px-1 py-0.5 h-6 text-[11px] text-zinc-900 font-mono disabled:opacity-50"
                        title={`Crop Left (${unitSuffix.trim()})`}
                      />
                      <span className="opacity-75 font-mono ml-1">Y:</span>
                      <input
                        type="number"
                        disabled={!cropToolsConfig.cropRegion}
                        value={cropToolsConfig.cropRegion ? toDisplay(cropToolsConfig.cropRegion.y) : ''}
                        placeholder="—"
                        onChange={(e) => {
                          if (!cropToolsConfig.cropRegion) return;
                          onUpdateCropToolsConfig?.({
                            cropRegion: { ...cropToolsConfig.cropRegion, y: fromDisplay(Number(e.target.value) || 0) },
                          });
                        }}
                        className="w-16 bg-white border border-[#abadb3] px-1 py-0.5 h-6 text-[11px] text-zinc-900 font-mono disabled:opacity-50"
                        title={`Crop Top (${unitSuffix.trim()})`}
                      />
                      <span className="opacity-75 font-mono ml-1">W:</span>
                      <input
                        type="number"
                        min={1}
                        disabled={!cropToolsConfig.cropRegion}
                        value={cropToolsConfig.cropRegion ? toDisplay(cropToolsConfig.cropRegion.width) : ''}
                        placeholder="—"
                        onChange={(e) => {
                          if (!cropToolsConfig.cropRegion) return;
                          onUpdateCropToolsConfig?.({
                            cropRegion: {
                              ...cropToolsConfig.cropRegion,
                              width: Math.max(10, fromDisplay(Number(e.target.value) || 10)),
                            },
                          });
                        }}
                        className="w-16 bg-white border border-[#abadb3] px-1 py-0.5 h-6 text-[11px] text-zinc-900 font-mono disabled:opacity-50"
                        title={`Crop Width (${unitSuffix.trim()})`}
                      />
                      <span className="opacity-75 font-mono ml-1">H:</span>
                      <input
                        type="number"
                        min={1}
                        disabled={!cropToolsConfig.cropRegion}
                        value={cropToolsConfig.cropRegion ? toDisplay(cropToolsConfig.cropRegion.height) : ''}
                        placeholder="—"
                        onChange={(e) => {
                          if (!cropToolsConfig.cropRegion) return;
                          onUpdateCropToolsConfig?.({
                            cropRegion: {
                              ...cropToolsConfig.cropRegion,
                              height: Math.max(10, fromDisplay(Number(e.target.value) || 10)),
                            },
                          });
                        }}
                        className="w-16 bg-white border border-[#abadb3] px-1 py-0.5 h-6 text-[11px] text-zinc-900 font-mono disabled:opacity-50"
                        title={`Crop Height (${unitSuffix.trim()})`}
                      />
                    </div>
                    <button
                      disabled={!cropToolsConfig.cropRegion}
                      onClick={() => onCropAction?.('apply_crop')}
                      className="h-6 px-2.5 bg-[#0078d7] hover:bg-[#006abc] text-white rounded-xs text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
                      title="Apply Crop Region (Enter / Double-Click inside Crop Box)"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Crop</span>
                    </button>
                    <button
                      disabled={!cropToolsConfig.cropRegion}
                      onClick={() => onCropAction?.('clear_crop')}
                      className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-zinc-100 text-zinc-800 rounded-xs text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
                      title="Clear Crop Selection (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}

                {activeTool === 'knife' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateCropToolsConfig?.({ knifeAutoGap: !cropToolsConfig.knifeAutoGap })}
                      className={`h-6 px-2.5 rounded-xs border text-[11px] font-medium cursor-pointer transition ${
                        cropToolsConfig.knifeAutoGap
                          ? 'bg-[#0078d7] text-white border-[#005a9e]'
                          : 'bg-white text-zinc-800 border-[#abadb3] hover:bg-zinc-100'
                      }`}
                      title="Slightly separate sliced halves after cutting"
                    >
                      Auto-Gap on Cut: {cropToolsConfig.knifeAutoGap ? 'On' : 'Off'}
                    </button>
                  </div>
                )}

                {activeTool === 'eraser' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] opacity-80">Thickness:</span>
                    <input
                      type="number"
                      min={2}
                      max={120}
                      value={cropToolsConfig.eraserSize}
                      onChange={(e) => {
                        const val = Math.max(2, Math.min(120, Number(e.target.value) || 2));
                        onUpdateCropToolsConfig?.({ eraserSize: val });
                      }}
                      className="w-14 bg-white border border-[#abadb3] px-1.5 py-0.5 h-6 text-[11px] text-zinc-900 font-mono"
                      title="Eraser Nib Thickness (px)"
                    />
                    <select
                      value={cropToolsConfig.eraserSize}
                      onChange={(e) => onUpdateCropToolsConfig?.({ eraserSize: Number(e.target.value) })}
                      className="bg-white border border-[#abadb3] px-1.5 py-0.5 h-6 text-[11px] text-zinc-900 outline-none cursor-pointer"
                      title="Eraser Preset Thickness"
                    >
                      {[6, 12, 18, 28, 42, 64].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz} px
                        </option>
                      ))}
                    </select>

                    <div className="h-5 w-px bg-[#c2c5cb] mx-0.5" />

                    <span className="text-[11px] opacity-80">Nib:</span>
                    <div className="flex items-center border border-[#abadb3] rounded-xs overflow-hidden bg-white">
                      <button
                        onClick={() => onUpdateCropToolsConfig?.({ eraserNib: 'round' })}
                        className={`h-6 px-2 text-[11px] flex items-center gap-1 cursor-pointer ${
                          cropToolsConfig.eraserNib === 'round'
                            ? 'bg-[#0078d7] text-white font-semibold'
                            : 'text-zinc-800 hover:bg-zinc-100'
                        }`}
                        title="Round Eraser Nib"
                      >
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-current bg-current/25" />
                        <span>Round</span>
                      </button>
                      <button
                        onClick={() => onUpdateCropToolsConfig?.({ eraserNib: 'square' })}
                        className={`h-6 px-2 text-[11px] flex items-center gap-1 border-l border-[#abadb3] cursor-pointer ${
                          cropToolsConfig.eraserNib === 'square'
                            ? 'bg-[#0078d7] text-white font-semibold'
                            : 'text-zinc-800 hover:bg-zinc-100'
                        }`}
                        title="Square Eraser Nib"
                      >
                        <span className="inline-block w-2.5 h-2.5 border border-current bg-current/25" />
                        <span>Square</span>
                      </button>
                    </div>
                  </div>
                )}

                <span className="ml-auto text-[10.5px] opacity-75 shrink-0">
                  {activeTool === 'crop'
                    ? cropToolsConfig.cropRegion
                      ? 'Drag handles to resize • Drag inside to move • Double-click or Enter to Crop'
                      : 'Drag a rectangle on canvas to define the Crop region'
                    : activeTool === 'knife'
                    ? 'Drag a line across any object to slice it into two pieces (Shift: 15°/45°/90°)'
                    : activeTool === 'virtual_segment_delete'
                    ? 'Hover & click any highlighted edge or curve segment to remove only that segment'
                    : 'Drag across objects to erase along the nib path (Shortcut: X)'}
                </span>
              </div>
            );
          })()
        ) : isEyedropperTool ? (
          /* Color Eyedropper Property Bar */
          <div className="flex items-center gap-3 w-full shrink-0">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-[#c2c5cb] shrink-0">
              <IconEyedropper className="w-4 h-4 text-[#0078d7]" />
              <span className="font-semibold text-[11px]">Color Eyedropper (I)</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] opacity-80">Primary Fill:</span>
              <span
                className="inline-block w-4 h-4 rounded-xs border border-zinc-500 shadow-2xs shrink-0"
                style={{
                  background:
                    !currentFill || currentFill === 'transparent'
                      ? 'repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                      : currentFill,
                }}
                title={`Primary Fill: ${currentFill}`}
              />
              <span className="font-mono text-[11px] font-medium min-w-[60px]">
                {!currentFill || currentFill === 'transparent' ? 'None' : currentFill.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-[#c2c5cb] shrink-0">
              <span className="text-[11px] opacity-80">Primary Stroke:</span>
              <span
                className="inline-block w-4 h-4 rounded-xs border border-zinc-500 shadow-2xs shrink-0"
                style={{
                  background:
                    !currentStroke || currentStroke === 'transparent'
                      ? 'repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                      : currentStroke,
                }}
                title={`Primary Stroke: ${currentStroke}`}
              />
              <span className="font-mono text-[11px] font-medium min-w-[60px]">
                {!currentStroke || currentStroke === 'transparent' ? 'None' : currentStroke.toUpperCase()}
              </span>
            </div>

            <button
              onClick={() => onSelectTool?.('pick')}
              className="ml-2 h-6 px-2.5 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] rounded-xs text-[11px] text-zinc-900 font-medium cursor-pointer shadow-2xs shrink-0"
              title="Return to Pick Tool"
            >
              Done (Pick)
            </button>

            <span className="ml-auto text-[10.5px] opacity-75 shrink-0">
              Click any canvas object to sample its Fill & Stroke • Hold Shift to sample multiple
            </span>
          </div>
        ) : isZoomTool ? (
          /* Zoom / Pan Tool Property Bar with Zoom Levels Dropdown & To Page */
          <div className="flex items-center gap-2 w-full shrink-0">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-[#c2c5cb] shrink-0">
              <ZoomIn className="w-4 h-4 text-[#0078d7]" />
              <span className="font-semibold text-[11px]">
                {activeTool === 'pan' ? 'Pan Tool (H)' : 'Zoom Tool (F2)'}
              </span>
            </div>

            <div className="flex items-center bg-white border border-[#abadb3] rounded-xs px-1.5 py-0.5 h-6 shrink-0">
              <select
                value={Math.max(1, Math.round(zoomLevel * 100))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'to_page' || val === 'to_width' || val === 'to_height' || val === 'to_fit') {
                    onZoomMode?.(val);
                  } else {
                    onZoomSet(Math.min(4096, Math.max(0.01, Number(val) / 100)));
                  }
                }}
                className="text-xs text-zinc-900 bg-transparent outline-none cursor-pointer pr-1 font-sans"
              >
                <optgroup label="Fit Options">
                  <option value="to_page">To Page (Shift+F4)</option>
                  <option value="to_width">To Width</option>
                  <option value="to_height">To Height</option>
                  <option value="to_fit">To Fit (F4)</option>
                </optgroup>
                <optgroup label="Zoom Levels">
                  {(() => {
                    const curPct = Math.max(1, Math.round(zoomLevel * 100));
                    const presets = [10, 25, 50, 75, 100, 150, 200, 400, 800, 1600, 3200];
                    const list = presets.includes(curPct)
                      ? presets
                      : [...presets, curPct].sort((a, b) => a - b);
                    return list.map((pct) => (
                      <option key={pct} value={pct}>
                        {pct.toLocaleString()}%
                      </option>
                    ));
                  })()}
                </optgroup>
              </select>
            </div>

            <button
              onClick={onZoomIn}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium flex items-center gap-1 cursor-pointer shrink-0"
              title="Zoom In (Ctrl++)"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#0078d7]" />
              <span>Zoom In</span>
            </button>

            <button
              onClick={onZoomOut}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium flex items-center gap-1 cursor-pointer shrink-0"
              title="Zoom Out (Ctrl+-)"
            >
              <ZoomOut className="w-3.5 h-3.5 text-[#0078d7]" />
              <span>Zoom Out</span>
            </button>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            <button
              onClick={() => onZoomSet(1)}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium cursor-pointer shrink-0"
              title="Zoom to Actual Size (100%)"
            >
              1:1 (100%)
            </button>

            <button
              onClick={() => onZoomMode?.('to_page')}
              className="h-6 px-2.5 bg-[#e5f1fb] border border-[#0078d7] hover:bg-[#cce8ff] rounded-xs text-[11px] text-zinc-900 font-semibold cursor-pointer shrink-0"
              title="Zoom To Page (Shift+F4)"
            >
              To Page
            </button>

            <button
              onClick={() => onZoomMode?.('to_width')}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium cursor-pointer shrink-0"
              title="Zoom To Page Width"
            >
              To Width
            </button>

            <button
              onClick={() => onZoomMode?.('to_height')}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium cursor-pointer shrink-0"
              title="Zoom To Page Height"
            >
              To Height
            </button>

            <button
              onClick={() => onZoomMode?.('to_fit')}
              className="h-6 px-2 bg-white border border-[#abadb3] hover:bg-[#e5f1fb] hover:border-[#0078d7] rounded-xs text-[11px] text-zinc-900 font-medium cursor-pointer shrink-0"
              title="Zoom To Fit All Objects (F4)"
            >
              To Fit
            </button>
          </div>
        ) : isText ? (
          /* When Text is Selected or Text Tool Active: Full Typography & Font Styling Property Bar */
          <div className="flex items-center gap-2 w-full shrink-0">
            {/* Origin & Positions if text selected */}
            {selectedObject ? (
              <>
                <div className="w-6 h-6 border border-[#abadb3] bg-white grid grid-cols-3 grid-rows-3 p-0.5 gap-0.5 rounded-xs" title="Object Origin (Anchor Point)">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnchor(idx)}
                      className={`w-full h-full rounded-none transition ${
                        selectedAnchor === idx ? 'bg-[#00aeef] border border-[#0072bc]' : 'bg-[#e5e7eb] hover:bg-[#9ca3af]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center">
                    <span className="w-3.5 text-zinc-500 font-mono text-[11px]">X:</span>
                    <input
                      type="text"
                      value={`${toDisplay(properties.x)}${unitSuffix}`}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!isNaN(parsed)) onUpdateProperties({ x: fromDisplay(parsed) });
                      }}
                      className="w-16 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-3.5 text-zinc-500 font-mono text-[11px]">Y:</span>
                    <input
                      type="text"
                      value={`${toDisplay(properties.y)}${unitSuffix}`}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!isNaN(parsed)) onUpdateProperties({ y: fromDisplay(parsed) });
                      }}
                      className="w-16 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                    />
                  </div>
                </div>
                <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />
              </>
            ) : null}

            {/* Font Family Dropdown */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-zinc-500 font-semibold text-[11px]">Font:</span>
              <select
                value={properties.fontFamily || 'Montserrat'}
                onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
                className="bg-white border border-[#abadb3] px-2 py-0.5 h-6 text-xs text-zinc-900 outline-none focus:border-[#0078d7] cursor-pointer min-w-[130px] max-w-[160px]"
                title="Font List (Select Typeface)"
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

            {/* Font Size with quick presets */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-zinc-500 font-semibold text-[11px]">Size:</span>
              <div className="flex items-center border border-[#abadb3] bg-white h-6">
                <input
                  type="number"
                  min="4"
                  max="500"
                  value={properties.fontSize || 24}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) onUpdateProperties({ fontSize: val });
                  }}
                  className="w-12 px-1 text-center text-xs text-zinc-900 outline-none font-mono"
                  title="Font Size (pt)"
                />
                <select
                  value={properties.fontSize || 24}
                  onChange={(e) => onUpdateProperties({ fontSize: Number(e.target.value) })}
                  className="w-4 bg-zinc-100 hover:bg-zinc-200 border-l border-[#abadb3] text-[10px] text-zinc-700 outline-none cursor-pointer h-full px-0"
                  title="Preset Sizes"
                >
                  {FONT_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz} pt
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-zinc-500 text-[10px]">pt</span>
            </div>

            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* Font Style Toggles: Bold, Italic, Underline, Strikethrough */}
            <div className="flex items-center border border-[#abadb3] rounded-xs bg-white p-0.5 gap-0.5 shrink-0">
              <button
                onClick={() =>
                  onUpdateProperties({
                    fontWeight: properties.fontWeight === 'bold' || properties.fontWeight === '700' ? 'normal' : 'bold',
                  })
                }
                title="Bold (Ctrl+B)"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.fontWeight === 'bold' || properties.fontWeight === '700'
                    ? 'bg-[#00aeef] text-white font-bold'
                    : 'text-zinc-700 hover:bg-zinc-200'
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
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.fontStyle === 'italic'
                    ? 'bg-[#00aeef] text-white'
                    : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ underline: !properties.underline })}
                title="Underline"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.underline ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ linethrough: !properties.linethrough })}
                title="Strikethrough"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.linethrough ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* Text Alignment */}
            <div className="flex items-center border border-[#abadb3] rounded-xs bg-white p-0.5 gap-0.5 shrink-0">
              <button
                onClick={() => onUpdateProperties({ textAlign: 'left' })}
                title="Align Left (Ctrl+L)"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.textAlign === 'left' || !properties.textAlign ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'center' })}
                title="Align Center (Ctrl+E)"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.textAlign === 'center' ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'right' })}
                title="Align Right (Ctrl+R)"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.textAlign === 'right' ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateProperties({ textAlign: 'justify' })}
                title="Fully Justify (Ctrl+J)"
                className={`w-6 h-5 flex items-center justify-center rounded-xs transition ${
                  properties.textAlign === 'justify' ? 'bg-[#00aeef] text-white' : 'text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* Font Colors: Fill, Outline Stroke, Background */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Text Fill Color */}
              <div className="flex items-center gap-1" title="Font Color (Text Fill)">
                <span className="text-zinc-600 font-semibold text-[11px] flex items-center gap-0.5">
                  <Type className="w-3 h-3 text-[#00aeef]" />
                  Color:
                </span>
                <input
                  type="color"
                  value={
                    typeof properties.fill === 'string' && properties.fill.startsWith('#')
                      ? properties.fill
                      : '#000000'
                  }
                  onChange={(e) => onUpdateProperties({ fill: e.target.value })}
                  className="w-5 h-5 border border-[#abadb3] bg-white cursor-pointer rounded-xs p-0"
                />
              </div>

              {/* Text Outline Stroke */}
              <div className="flex items-center gap-1" title="Font Outline (Stroke Color & Width)">
                <span className="text-zinc-600 font-semibold text-[11px] flex items-center gap-0.5">
                  <IconPenNib className="w-3 h-3 text-amber-600" />
                  Outline:
                </span>
                <input
                  type="color"
                  value={
                    typeof properties.stroke === 'string' && properties.stroke.startsWith('#')
                      ? properties.stroke
                      : '#000000'
                  }
                  onChange={(e) => onUpdateProperties({ stroke: e.target.value })}
                  className="w-5 h-5 border border-[#abadb3] bg-white cursor-pointer rounded-xs p-0"
                />
                <select
                  value={properties.strokeWidth || 0}
                  onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
                  className="bg-white border border-[#abadb3] px-1 py-0.5 h-5 text-[11px] text-zinc-900 outline-none cursor-pointer"
                >
                  {STROKE_WIDTHS.map((sw) => (
                    <option key={sw.value} value={sw.value}>
                      {sw.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background Highlight */}
              <div className="flex items-center gap-1" title="Text Highlight / Background Color">
                <span className="text-zinc-500 text-[11px]">Bg:</span>
                <input
                  type="color"
                  value={
                    properties.textBackgroundColor && properties.textBackgroundColor.startsWith('#')
                      ? properties.textBackgroundColor
                      : '#ffffff'
                  }
                  onChange={(e) => onUpdateProperties({ textBackgroundColor: e.target.value })}
                  className="w-5 h-5 border border-[#abadb3] bg-white cursor-pointer rounded-xs p-0"
                />
                {properties.textBackgroundColor && properties.textBackgroundColor !== 'transparent' && (
                  <button
                    onClick={() => onUpdateProperties({ textBackgroundColor: 'transparent' })}
                    title="Clear Background Highlight"
                    className="text-[10px] text-zinc-500 hover:text-red-500 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* Tracking (charSpacing) & Leading (lineHeight) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1" title="Character Spacing (Tracking)">
                <span className="text-zinc-500 font-mono text-[10px]">AV:</span>
                <input
                  type="number"
                  step="10"
                  min="-200"
                  max="1000"
                  value={properties.charSpacing || 0}
                  onChange={(e) => onUpdateProperties({ charSpacing: Number(e.target.value) })}
                  className="w-12 h-5 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none"
                />
              </div>

              <div className="flex items-center gap-1" title="Line Spacing (Leading / Line Height)">
                <span className="text-zinc-500 font-mono text-[10px]">LH:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="5"
                  value={properties.lineHeight || 1.16}
                  onChange={(e) => onUpdateProperties({ lineHeight: Number(e.target.value) })}
                  className="w-12 h-5 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none"
                />
              </div>
            </div>

            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* Case Conversion */}
            <div className="flex items-center border border-[#abadb3] rounded-xs bg-white p-0.5 gap-0.5 shrink-0">
              <button
                onClick={() => handleTransformCase('upper')}
                title="Convert to UPPERCASE"
                className="px-1.5 h-5 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200 rounded-xs"
              >
                AA
              </button>
              <button
                onClick={() => handleTransformCase('lower')}
                title="Convert to lowercase"
                className="px-1.5 h-5 text-[11px] font-normal text-zinc-700 hover:bg-zinc-200 rounded-xs"
              >
                aa
              </button>
              <button
                onClick={() => handleTransformCase('title')}
                title="Convert to Title Case"
                className="px-1.5 h-5 text-[11px] capitalize text-zinc-700 hover:bg-zinc-200 rounded-xs"
              >
                Aa
              </button>
            </div>

            {/* PowerClip Button for Text */}
            <button
              onClick={onPowerClipPlace}
              title="PowerClip: Place Inside Frame..."
              className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium shrink-0 transition"
            >
              <IconPowerClip className="w-3.5 h-3.5 text-[#0078d7]" />
              <span>PowerClip</span>
            </button>
          </div>
        ) : isSelected ? (
          /* When Object / Rectangle is Selected: EXACT Row 3 from Screenshot */
          <div className="flex items-center gap-2 w-full">
            {/* 1. 9-Point Anchor Box (Object Origin selector) */}
            <div className="w-6 h-6 border border-[#abadb3] bg-white grid grid-cols-3 grid-rows-3 p-0.5 gap-0.5 rounded-xs" title="Object Origin (Anchor Point)">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnchor(idx)}
                  className={`w-full h-full rounded-none transition ${
                    selectedAnchor === idx ? 'bg-[#00aeef] border border-[#0072bc]' : 'bg-[#e5e7eb] hover:bg-[#9ca3af]'
                  }`}
                />
              ))}
            </div>

            {/* 2. X and Y Position Inputs (Stacked) */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center">
                <span className="w-3.5 text-zinc-500 font-mono text-[11px]">X:</span>
                <input
                  type="text"
                  value={`${toDisplay(properties.x)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) onUpdateProperties({ x: fromDisplay(parsed) });
                  }}
                  className="w-18 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                />
              </div>
              <div className="flex items-center">
                <span className="w-3.5 text-zinc-500 font-mono text-[11px]">Y:</span>
                <input
                  type="text"
                  value={`${toDisplay(properties.y)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) onUpdateProperties({ y: fromDisplay(parsed) });
                  }}
                  className="w-18 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[#c2c5cb]" />

            {/* 3. Width & Height Inputs (with |↔| and |↕| arrows) */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center">
                <span className="w-4 text-zinc-600 font-bold text-[10px]" title="Object Width">|↔|</span>
                <input
                  type="text"
                  value={`${toDisplay(properties.width)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed) && parsed > 0) {
                      const newW = fromDisplay(parsed);
                      if (lockRatio && properties.width > 0) {
                        const ratio = newW / properties.width;
                        onUpdateProperties({ width: newW, height: properties.height * ratio });
                      } else {
                        onUpdateProperties({ width: newW });
                      }
                    }
                  }}
                  className="w-18 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                />
              </div>
              <div className="flex items-center">
                <span className="w-4 text-zinc-600 font-bold text-[10px]" title="Object Height">|↕|</span>
                <input
                  type="text"
                  value={`${toDisplay(properties.height)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed) && parsed > 0) {
                      const newH = fromDisplay(parsed);
                      if (lockRatio && properties.height > 0) {
                        const ratio = newH / properties.height;
                        onUpdateProperties({ height: newH, width: properties.width * ratio });
                      } else {
                        onUpdateProperties({ height: newH });
                      }
                    }
                  }}
                  className="w-18 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
                />
              </div>
            </div>

            {/* 4. Scale Factor Percentage Inputs */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center">
                <input
                  type="text"
                  readOnly
                  value="100.0"
                  className="w-12 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-700"
                />
                <span className="text-zinc-500 text-[10px] ml-0.5">%</span>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  readOnly
                  value="100.0"
                  className="w-12 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono text-zinc-700"
                />
                <span className="text-zinc-500 text-[10px] ml-0.5">%</span>
              </div>
            </div>

            {/* 5. Lock Ratio Padlock */}
            <button
              onClick={() => setLockRatio(!lockRatio)}
              title={lockRatio ? 'Unlock Ratio' : 'Lock Ratio'}
              className="p-1 hover:bg-[#dbe0e6] rounded-xs text-zinc-700"
            >
              {lockRatio ? <Lock className="w-3.5 h-3.5 text-zinc-900" /> : <Unlock className="w-3.5 h-3.5 text-zinc-500" />}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-[#c2c5cb]" />

            {/* 6. Angle of Rotation */}
            <div className="flex items-center">
              <RotateCcw className="w-3.5 h-3.5 text-zinc-600 mr-1" />
              <input
                type="number"
                value={Math.round(properties.angle % 360)}
                onChange={(e) => onUpdateProperties({ angle: Number(e.target.value) })}
                className="w-12 h-5 bg-white border border-[#abadb3] px-1 text-right text-xs font-mono outline-none focus:border-[#0078d7]"
              />
              <span className="text-zinc-600 text-xs ml-0.5">°</span>
            </div>

            {/* 7. Mirror Horizontally and Vertically */}
            <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5">
              <button onClick={onFlipH} title="Mirror Horizontally" className="p-0.5 hover:bg-[#dbe0e6] rounded-xs">
                <IconMirrorHorizontal className="w-4 h-4" />
              </button>
              <button onClick={onFlipV} title="Mirror Vertically" className="p-0.5 hover:bg-[#dbe0e6] rounded-xs">
                <IconMirrorVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[#c2c5cb]" />

            {/* 8. Corner Styles: Round, Scallop, Chamfer (CorelDRAW signature rect controls) */}
            <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5">
              <button
                onClick={() => setCornerStyle('round')}
                title="Round Corner"
                className={`p-0.5 rounded-xs ${cornerStyle === 'round' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#dbe0e6]'}`}
              >
                <IconCornerRound className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCornerStyle('scallop')}
                title="Scalloped Corner"
                className={`p-0.5 rounded-xs ${cornerStyle === 'scallop' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#dbe0e6]'}`}
              >
                <IconCornerScallop className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCornerStyle('chamfer')}
                title="Chamfered Corner"
                className={`p-0.5 rounded-xs ${cornerStyle === 'chamfer' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#dbe0e6]'}`}
              >
                <IconCornerChamfer className="w-4 h-4" />
              </button>
            </div>

            {/* 9. Corner Radii Inputs with center padlock */}
            <div className="flex items-center gap-1">
              {/* Left corners (Top-Left & Bottom-Left) */}
              <div className="flex flex-col gap-0.5">
                <input
                  type="text"
                  value={`${toDisplay(properties.rx)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) {
                      const val = fromDisplay(parsed);
                      onUpdateProperties({ rx: val, ry: val });
                    }
                  }}
                  className="w-14 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono outline-none"
                  title="Top-Left Corner Radius"
                />
                <input
                  type="text"
                  value={`${toDisplay(properties.ry)}${unitSuffix}`}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) {
                      const val = fromDisplay(parsed);
                      onUpdateProperties({ rx: val, ry: val });
                    }
                  }}
                  className="w-14 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono outline-none"
                  title="Bottom-Left Corner Radius"
                />
              </div>

              {/* Center Lock Corners Padlock */}
              <button
                onClick={() => setLockCorners(!lockCorners)}
                title={lockCorners ? 'All Corners Linked' : 'Independent Corners'}
                className="p-1 hover:bg-[#dbe0e6] rounded-xs text-zinc-700"
              >
                {lockCorners ? <Lock className="w-3.5 h-3.5 text-zinc-900" /> : <Unlock className="w-3.5 h-3.5 text-zinc-500" />}
              </button>

              {/* Right corners (Top-Right & Bottom-Right) */}
              <div className="flex flex-col gap-0.5">
                <input
                  type="text"
                  value={`${toDisplay(properties.rx)}${unitSuffix}`}
                  readOnly
                  className="w-14 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono"
                  title="Top-Right Corner Radius"
                />
                <input
                  type="text"
                  value={`${toDisplay(properties.ry)}${unitSuffix}`}
                  readOnly
                  className="w-14 h-4 bg-white border border-[#abadb3] px-1 text-right text-[11px] font-mono"
                  title="Bottom-Right Corner Radius"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[#c2c5cb]" />

            {/* 10. Pen Nib + Outline Width */}
            <div className="flex items-center gap-1">
              <IconPenNib className="w-4 h-4 text-zinc-700" />
              <select
                value={properties.strokeWidth}
                onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
                className="bg-white border border-[#abadb3] px-1.5 py-0.5 h-6 text-xs text-zinc-900 outline-none cursor-pointer"
              >
                {STROKE_WIDTHS.map((sw) => (
                  <option key={sw.value} value={sw.value}>
                    {sw.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 11. Outline Dash Style Dropdown */}
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
              className="bg-white border border-[#abadb3] px-2 py-0.5 h-6 text-xs text-zinc-900 outline-none cursor-pointer"
            >
              <option value="solid">━━━━━━ Solid</option>
              <option value="dashed">━ ━ ━ ━ Dashed</option>
              <option value="dotted">•••••••• Dotted</option>
            </select>

            {/* Divider */}
            <div className="h-6 w-px bg-[#c2c5cb] shrink-0" />

            {/* PowerClip & Convert to Curves Actions in Property Bar */}
            <div className="flex items-center gap-1 shrink-0">
              {selectedObject &&
                selectedObject.type !== 'path' &&
                selectedObject.type !== 'activeselection' &&
                onConvertToCurves && (
                  <button
                    onClick={onConvertToCurves}
                    title="Convert to Curves (Ctrl+Q)"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer"
                  >
                    <Spline className="w-3.5 h-3.5 text-[#0078d7]" />
                    <span>Convert to Curves</span>
                  </button>
                )}

              <button
                onClick={onPowerClipPlace}
                title="PowerClip: Place Inside Frame..."
                className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition"
              >
                <IconPowerClip className="w-3.5 h-3.5 text-[#0078d7]" />
                <span>PowerClip</span>
              </button>

              {(selectedObject as any)?.customType === 'qrcode' && onOpenQrCode && (
                <button
                  onClick={onOpenQrCode}
                  title="Edit QR Code Data & Style"
                  className="px-2 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1 text-xs text-zinc-900 font-semibold transition cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span>Edit QR Code...</span>
                </button>
              )}

              {((selectedObject as any)?.isPowerClip || (selectedObject as any)?.customType === 'powerclip') && (
                <>
                  <button
                    onClick={onPowerClipExtract}
                    title="Extract PowerClip Contents"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition"
                  >
                    <span>📤 Extract</span>
                  </button>

                  {!isPowerClipEditing ? (
                    <button
                      onClick={onPowerClipEdit}
                      title="Edit PowerClip Contents"
                      className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition"
                    >
                      <span>✏️ Edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPowerClipFinish}
                      title="Finish Editing PowerClip"
                      className="px-2 py-0.5 rounded-xs border border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 text-xs font-semibold transition"
                    >
                      <span>✔️ Finish</span>
                    </button>
                  )}
                </>
              )}

              {/* Group / Ungroup / Group Editing Buttons */}
              {selectedObject?.type === 'activeselection' && (
                <button
                  onClick={onGroup}
                  title="Group Selected Objects (Ctrl+G)"
                  className="px-2 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1 text-xs text-zinc-900 font-semibold transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-[#0078d7]" />
                  <span>Group</span>
                </button>
              )}

              {selectedObject?.type === 'group' && (
                <>
                  {!(selectedObject as any)?.isPowerClip &&
                    (selectedObject as any)?.customType !== 'powerclip' &&
                    !(selectedObject as any)?.isSymmetryGroup &&
                    !(selectedObject as any)?.isTextOnPath &&
                    (selectedObject as any)?.customType !== 'qrcode' &&
                    onEnterGroupEdit && (
                      <button
                        onClick={onEnterGroupEdit}
                        title="Edit Group Contents (Double-click Group)"
                        className="px-2 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1 text-xs text-zinc-900 font-semibold transition cursor-pointer"
                      >
                        <span>✎ Edit Group</span>
                      </button>
                    )}
                  {!(selectedObject as any)?.isSymmetryGroup && (
                    <button
                      onClick={onUngroup}
                      title="Ungroup Objects (Ctrl+U)"
                      className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer"
                    >
                      <span>Ungroup</span>
                    </button>
                  )}
                  {!(selectedObject as any)?.isSymmetryGroup && onUngroupAll && (
                    <button
                      onClick={onUngroupAll}
                      title="Ungroup All Nested Groups"
                      className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer"
                    >
                      <span>Ungroup All</span>
                    </button>
                  )}
                </>
              )}

              {/* Selected Symmetry Group Quick Actions */}
              {selectedObject && (selectedObject as any)?.isSymmetryGroup && !symmetryEditingConfig && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={onEditSymmetry}
                    title="Edit Symmetry (Double-click)"
                    className="px-2 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1 text-xs text-zinc-900 font-semibold transition cursor-pointer"
                  >
                    <IconSymmetryEdit className="w-3.5 h-3.5" />
                    <span>Edit Symmetry</span>
                  </button>
                  <button
                    onClick={onBreakSymmetryLink}
                    title="Break Symmetry Link into independent objects"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer"
                  >
                    <IconSymmetryBreak className="w-3.5 h-3.5" />
                    <span>Break Link</span>
                  </button>
                  <button
                    onClick={onRemoveSymmetry}
                    title="Remove Symmetry copies"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-red-50 hover:border-red-400 flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer"
                  >
                    <IconSymmetryRemove className="w-3.5 h-3.5" />
                    <span>Remove Symmetry</span>
                  </button>
                </div>
              )}

              {/* Create New Symmetry Quick Button for Selected Object(s) */}
              {selectedObject && !(selectedObject as any)?.isSymmetryGroup && !symmetryEditingConfig && onCreateSymmetry && (
                <button
                  onClick={onCreateSymmetry}
                  title="Create New Symmetry (Alt+S)"
                  className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1 text-xs text-zinc-900 font-medium transition cursor-pointer shrink-0"
                >
                  <IconSymmetryCreate className="w-3.5 h-3.5 shrink-0" />
                  <span>Symmetry</span>
                </button>
              )}

              {selectedObject?.type === 'image' && onBitmapCmykSeparation && (
                <button
                  onClick={onBitmapCmykSeparation}
                  title="CMYK Separation: Split Cyan, Magenta, Yellow & Black plates onto a New Page"
                  className="px-2 py-0.5 rounded-xs border border-[#0078d7] bg-[#e5f1fb] hover:bg-[#cce8ff] flex items-center gap-1.5 text-xs text-zinc-900 font-semibold transition cursor-pointer shrink-0"
                >
                  <IconCmykSeparation className="w-3.5 h-3.5 shrink-0" />
                  <span>CMYK Separation</span>
                </button>
              )}

              {symmetryEditingConfig && (
                <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-[#c2c5cb]">
                  <span className="text-[11px] font-medium text-zinc-600">Mirrors:</span>
                  <div className="flex items-center border border-[#abadb3] bg-white rounded-xs overflow-hidden">
                    <button
                      onClick={() =>
                        onUpdateSymmetryConfig?.({
                          mirrorLines: Math.max(1, (symmetryEditingConfig.mirrorLines || 1) - 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-xs hover:bg-[#e5f1fb] border-r border-[#d0d3d8] cursor-pointer"
                      title="Decrease Mirror Lines"
                    >
                      −
                    </button>
                    <span className="px-2 text-xs font-mono font-semibold text-zinc-900">
                      {symmetryEditingConfig.mirrorLines || 1}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateSymmetryConfig?.({
                          mirrorLines: Math.min(12, (symmetryEditingConfig.mirrorLines || 1) + 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-xs hover:bg-[#e5f1fb] border-l border-[#d0d3d8] cursor-pointer"
                      title="Increase Mirror Lines"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateSymmetryConfig?.({
                        angleDeg: Math.abs((symmetryEditingConfig.angleDeg || 0) % 180) < 45 ? 90 : 0,
                      })
                    }
                    title="Switch Vertical / Horizontal Mirror Axis"
                    className="px-1.5 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] text-[11px] text-zinc-800 cursor-pointer"
                  >
                    {Math.round(symmetryEditingConfig.angleDeg || 0)}°
                  </button>
                  <button
                    onClick={onFinishSymmetry}
                    title="Finish Editing Symmetry"
                    className="px-2 py-0.5 rounded-xs border border-sky-600 bg-[#0078d7] text-white hover:bg-[#0063b1] flex items-center gap-1 text-xs font-semibold transition cursor-pointer"
                  >
                    <span>✓ Finish Symmetry</span>
                  </button>
                  <button
                    onClick={onBreakSymmetryLink}
                    title="Break Symmetry Link"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] text-xs text-zinc-900 cursor-pointer"
                  >
                    Break Link
                  </button>
                  <button
                    onClick={onRemoveSymmetry}
                    title="Remove Symmetry"
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-red-50 hover:border-red-400 text-xs text-zinc-900 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {groupEditDepth > 0 && onExitGroupEdit && (
                <button
                  onClick={onExitGroupEdit}
                  title="Finish Editing Group (Esc)"
                  className="px-2 py-0.5 rounded-xs border border-sky-500 bg-sky-100 text-sky-900 hover:bg-sky-200 flex items-center gap-1 text-xs font-semibold transition cursor-pointer"
                >
                  <span>✓ Finish Group</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* When NO Object is Selected: CorelDRAW Contextual Page Setup Bar (or Symmetry Editing Bar) */
          <div className="flex items-center gap-2.5 w-full overflow-x-auto py-0.5">
            {symmetryEditingConfig && (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconSymmetryEdit className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold text-[#0078d7]">Symmetry Editing:</span>
                  <span className="text-xs text-zinc-600">Mirror lines:</span>
                  <div className="flex items-center border border-[#abadb3] bg-white rounded-xs overflow-hidden">
                    <button
                      onClick={() =>
                        onUpdateSymmetryConfig?.({
                          mirrorLines: Math.max(1, (symmetryEditingConfig.mirrorLines || 1) - 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-xs hover:bg-[#e5f1fb] border-r border-[#d0d3d8] cursor-pointer"
                    >
                      −
                    </button>
                    <span className="px-2 text-xs font-mono font-semibold text-zinc-900">
                      {symmetryEditingConfig.mirrorLines || 1}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateSymmetryConfig?.({
                          mirrorLines: Math.min(12, (symmetryEditingConfig.mirrorLines || 1) + 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-xs hover:bg-[#e5f1fb] border-l border-[#d0d3d8] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateSymmetryConfig?.({
                        angleDeg: Math.abs((symmetryEditingConfig.angleDeg || 0) % 180) < 45 ? 90 : 0,
                      })
                    }
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] text-xs text-zinc-800 cursor-pointer"
                    title="Toggle Vertical (0°) / Horizontal (90°) Mirror Axis"
                  >
                    Axis: {Math.round(symmetryEditingConfig.angleDeg || 0)}°
                  </button>
                  <button
                    onClick={onFinishSymmetry}
                    className="px-2.5 py-0.5 rounded-xs border border-sky-600 bg-[#0078d7] text-white hover:bg-[#0063b1] flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    <span>✓ Finish Editing Symmetry</span>
                  </button>
                  <button
                    onClick={onBreakSymmetryLink}
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] text-xs text-zinc-900 cursor-pointer"
                  >
                    Break Symmetry Link
                  </button>
                  <button
                    onClick={onRemoveSymmetry}
                    className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-red-50 hover:border-red-400 text-xs text-zinc-900 cursor-pointer"
                  >
                    Remove Symmetry
                  </button>
                </div>
                <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />
              </>
            )}
            {groupEditDepth > 0 && onExitGroupEdit && (
              <>
                <button
                  onClick={onExitGroupEdit}
                  title="Finish Editing Group (Esc)"
                  className="px-2.5 py-0.5 rounded-xs border border-sky-500 bg-sky-100 text-sky-900 hover:bg-sky-200 flex items-center gap-1 text-xs font-semibold shrink-0 transition cursor-pointer"
                >
                  <span>✓ Finish Editing Group (Esc)</span>
                </button>
                <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />
              </>
            )}
            {/* Page Setup Launcher Dialog Button */}
            <button
              onClick={onOpenPageSetup}
              title="Open Page Setup Dialog (Ctrl+Shift+P)"
              className="px-2 py-0.5 rounded-xs border border-[#abadb3] bg-white hover:bg-[#e5f1fb] hover:border-[#0078d7] flex items-center gap-1.5 text-xs text-zinc-900 shadow-2xs font-medium shrink-0 transition"
            >
              <FileText className="w-3.5 h-3.5 text-[#0078d7]" />
              <span>Page Setup...</span>
            </button>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Page Preset Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-zinc-600 font-medium text-xs">Paper:</span>
              <select
                value={pageConfig.preset}
                onChange={(e) => {
                  const presetId = e.target.value;
                  const found = PAGE_PRESETS.find((p) => p.id === presetId);
                  if (found) {
                    let w = found.widthPx;
                    let h = found.heightPx;
                    if (pageConfig.orientation === 'landscape') {
                      const max = Math.max(w, h);
                      const min = Math.min(w, h);
                      w = max;
                      h = min;
                    } else {
                      const max = Math.max(w, h);
                      const min = Math.min(w, h);
                      w = min;
                      h = max;
                    }
                    onUpdatePageConfig({ preset: presetId, width: w, height: h });
                  } else {
                    onUpdatePageConfig({ preset: presetId });
                  }
                }}
                className="bg-white border border-[#abadb3] px-1.5 py-0.5 text-xs text-zinc-900 outline-none focus:border-[#0078d7] cursor-pointer max-w-[170px]"
              >
                <optgroup label="Standard Print">
                  {PAGE_PRESETS.filter((p) => p.category === 'Print').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.description.split(' (')[0]})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Commercial / Stationery">
                  {PAGE_PRESETS.filter((p) => p.category === 'Stationery').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Digital / Web">
                  {PAGE_PRESETS.filter((p) => p.category === 'Digital / Web').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Social Media">
                  {PAGE_PRESETS.filter((p) => p.category === 'Social Media').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <option value="Custom">Custom Dimensions</option>
              </select>
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Page Width & Height */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-zinc-600 font-bold text-[10px]" title="Page Width">|↔|</span>
              <input
                type="text"
                value={`${toDisplay(pageConfig.width)}${unitSuffix}`}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    onUpdatePageConfig({ width: fromDisplay(parsed), preset: 'Custom' });
                  }
                }}
                className="w-20 h-5 bg-white border border-[#abadb3] px-1.5 text-right text-xs font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-zinc-600 font-bold text-[10px]" title="Page Height">|↕|</span>
              <input
                type="text"
                value={`${toDisplay(pageConfig.height)}${unitSuffix}`}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    onUpdatePageConfig({ height: fromDisplay(parsed), preset: 'Custom' });
                  }
                }}
                className="w-20 h-5 bg-white border border-[#abadb3] px-1.5 text-right text-xs font-mono text-zinc-900 outline-none focus:border-[#0078d7]"
              />
            </div>

            {/* Orientation buttons */}
            <div className="flex items-center bg-[#f0f1f3] border border-[#abadb3] rounded-xs p-0.5 shrink-0">
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
                className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1 transition ${
                  pageConfig.orientation === 'portrait'
                    ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <div className="w-2.5 h-3.5 border border-current rounded-2xs" />
                <span>Portrait</span>
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
                className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1 transition ${
                  pageConfig.orientation === 'landscape'
                    ? 'bg-[#cce8ff] border border-[#99d1ff] font-semibold text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <div className="w-3.5 h-2.5 border border-current rounded-2xs" />
                <span>Landscape</span>
              </button>
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Autofit Page Margin Flyout Button (Exact from image_387e6bbe.png) */}
            <div className="relative shrink-0">
              <button
                ref={autofitButtonRef}
                onClick={() => {
                  if (!autofitDropdownOpen && autofitButtonRef.current) {
                    const rect = autofitButtonRef.current.getBoundingClientRect();
                    setAutofitMenuPos({
                      top: rect.bottom + 2,
                      left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
                    });
                  }
                  setAutofitDropdownOpen((prev) => !prev);
                }}
                title="Autofit Page Margin"
                className={`relative w-7 h-6 flex items-center justify-center rounded-xs border transition ${
                  autofitDropdownOpen
                    ? 'bg-[#cce8ff] border-[#0078d7] shadow-2xs'
                    : 'border-transparent hover:bg-[#e5f1fb] hover:border-[#99d1ff]'
                }`}
              >
                <IconAutofitPage className="w-4 h-4" />
                <span
                  className="absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-zinc-700"
                  aria-hidden="true"
                />
              </button>

              {autofitDropdownOpen && (
                <div
                  ref={autofitDropdownRef}
                  style={{ top: autofitMenuPos.top, left: autofitMenuPos.left }}
                  className="fixed z-[999] w-[196px] bg-[#f0f0f0] border border-[#9a9ea4] shadow-lg p-2.5 select-none text-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-zinc-900">Margin:</span>
                    <div className="flex items-stretch h-6 bg-white border border-[#abadb3] focus-within:border-[#0078d7]">
                      <input
                        type="text"
                        value={autofitMarginDraft !== null ? autofitMarginDraft : formatFineUnit(currentAutofitMarginPx, pageConfig.units, 1)}
                        onFocus={(e) => {
                          setAutofitMarginDraft(formatFineUnit(currentAutofitMarginPx, pageConfig.units, 1));
                          setTimeout(() => e.target.select(), 0);
                        }}
                        onChange={(e) => setAutofitMarginDraft(e.target.value)}
                        onBlur={(e) => commitAutofitMarginValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            commitAutofitMarginValue((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            stepAutofitMargin(1);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            stepAutofitMargin(-1);
                          } else if (e.key === 'Escape') {
                            setAutofitMarginDraft(null);
                            setAutofitDropdownOpen(false);
                          }
                        }}
                        className="w-20 px-1.5 text-left text-xs font-sans text-zinc-900 outline-none bg-transparent"
                      />
                      <div className="flex flex-col w-4 border-l border-[#c2c5cb] bg-[#ececef]">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => stepAutofitMargin(1)}
                          className="flex-1 flex items-center justify-center hover:bg-[#cce8ff] active:bg-[#99d1ff] border-b border-[#d0d3d8]"
                          title="Increase Margin"
                        >
                          <svg viewBox="0 0 8 5" className="w-2 h-1.5" fill="#444"><path d="M4 0.5 L7.5 4.5 L0.5 4.5 Z" /></svg>
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => stepAutofitMargin(-1)}
                          className="flex-1 flex items-center justify-center hover:bg-[#cce8ff] active:bg-[#99d1ff]"
                          title="Decrease Margin"
                        >
                          <svg viewBox="0 0 8 5" className="w-2 h-1.5" fill="#444"><path d="M4 4.5 L7.5 0.5 L0.5 0.5 Z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const activeMargin = autofitMarginDraft !== null && !isNaN(parseFloat(autofitMarginDraft))
                        ? Math.max(0, fromDisplay(parseFloat(autofitMarginDraft)))
                        : currentAutofitMarginPx;
                      if (autofitMarginDraft !== null) {
                        commitAutofitMarginValue(autofitMarginDraft);
                      }
                      onAutofitPage?.(activeMargin);
                      setAutofitDropdownOpen(false);
                    }}
                    className="w-full h-6 bg-[#e1e1e1] hover:bg-[#e5f1fb] active:bg-[#cce8ff] border border-[#adadad] hover:border-[#0078d7] text-xs text-zinc-900 flex items-center justify-center transition cursor-pointer"
                  >
                    Autofit Page
                  </button>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* All 9 Measurement Units dropdown */}
            <div className="flex items-center gap-1 text-zinc-600 shrink-0">
              <span className="font-medium text-xs">Units:</span>
              <select
                value={pageConfig.units}
                onChange={(e) => onUpdatePageConfig({ units: e.target.value as any })}
                className="bg-white border border-[#abadb3] px-1.5 py-0.5 text-xs text-zinc-900 outline-none focus:border-[#0078d7] cursor-pointer"
              >
                {ALL_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Nudge Distance (Exact from image_205e352e.png: Icon + Input + Spinners + Tooltip) */}
            <div
              ref={nudgeControlRef}
              onMouseEnter={() => {
                if (nudgeControlRef.current) {
                  const rect = nudgeControlRef.current.getBoundingClientRect();
                  setNudgeTooltipPos({
                    top: rect.bottom + 4,
                    left: Math.max(8, Math.min(rect.left + 18, window.innerWidth - 230)),
                  });
                }
                setNudgeTooltipOpen(true);
              }}
              onMouseLeave={() => setNudgeTooltipOpen(false)}
              className="relative flex items-center gap-1 text-zinc-700 shrink-0"
            >
              <IconNudgeDistance className="w-4 h-4 shrink-0" />
              <div className="flex items-stretch h-6 bg-white border border-[#abadb3] focus-within:border-[#0078d7]">
                <input
                  type="text"
                  aria-label="Nudge distance"
                  value={nudgeDraft !== null ? nudgeDraft : formatFineUnit(currentNudgePx, pageConfig.units, 1)}
                  onFocus={(e) => {
                    setNudgeTooltipOpen(false);
                    setNudgeDraft(formatFineUnit(currentNudgePx, pageConfig.units, 1));
                    setTimeout(() => e.target.select(), 0);
                  }}
                  onChange={(e) => setNudgeDraft(e.target.value)}
                  onBlur={(e) => commitNudgeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitNudgeValue((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      stepNudgeDistance(1);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      stepNudgeDistance(-1);
                    } else if (e.key === 'Escape') {
                      setNudgeDraft(null);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-16 px-1.5 text-left text-xs font-sans text-zinc-900 outline-none bg-transparent"
                />
                <div className="flex flex-col w-4 border-l border-[#c2c5cb] bg-[#ececef]">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => stepNudgeDistance(1)}
                    className="flex-1 flex items-center justify-center hover:bg-[#cce8ff] active:bg-[#99d1ff] border-b border-[#d0d3d8]"
                    title="Increase Nudge Distance"
                  >
                    <svg viewBox="0 0 8 5" className="w-2 h-1.5" fill="#444"><path d="M4 0.5 L7.5 4.5 L0.5 4.5 Z" /></svg>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => stepNudgeDistance(-1)}
                    className="flex-1 flex items-center justify-center hover:bg-[#cce8ff] active:bg-[#99d1ff]"
                    title="Decrease Nudge Distance"
                  >
                    <svg viewBox="0 0 8 5" className="w-2 h-1.5" fill="#444"><path d="M4 4.5 L7.5 0.5 L0.5 0.5 Z" /></svg>
                  </button>
                </div>
              </div>

              {nudgeTooltipOpen && (
                <div
                  style={{ top: nudgeTooltipPos.top, left: nudgeTooltipPos.left }}
                  className="fixed z-[998] bg-white border border-zinc-500 shadow-md px-2.5 py-1.5 pointer-events-none text-left"
                >
                  <div className="text-[11px] font-bold text-zinc-900 leading-tight">Nudge distance</div>
                  <div className="text-[11px] text-zinc-700 leading-tight mt-0.5">Set the distance for nudging objects.</div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Duplicate Distance X & Y (Exact from image_2b0a935b.png: 0.0 mm, 0.0 mm) */}
            <div className="flex flex-col gap-0.5 shrink-0" title="Duplicate Distance Offset">
              <div className="flex items-center">
                <span className="text-[9px] font-mono text-zinc-500 mr-1">X:</span>
                <input
                  type="text"
                  defaultValue="0.0 mm"
                  className="w-16 h-3.5 bg-white border border-[#abadb3] px-1 text-right text-[10px] font-mono text-zinc-900 outline-none"
                />
              </div>
              <div className="flex items-center">
                <span className="text-[9px] font-mono text-zinc-500 mr-1">Y:</span>
                <input
                  type="text"
                  defaultValue="0.0 mm"
                  className="w-16 h-3.5 bg-white border border-[#abadb3] px-1 text-right text-[10px] font-mono text-zinc-900 outline-none"
                />
              </div>
            </div>

            <div className="h-5 w-px bg-[#c2c5cb] shrink-0" />

            {/* Selection Mode / Treat as Filled icon */}
            <button
              title="Treat As Filled (Select by clicking inside unfilled objects)"
              className="p-1 hover:bg-[#dbe0e6] rounded-xs border border-zinc-400 bg-white"
            >
              <div className="w-3.5 h-3.5 border border-dashed border-zinc-800" />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          ROW 4: Document Tab Bar (Exact match with image_2b0a935b.png)
          ========================================================================= */}
      <div className={`h-6 px-1 flex items-center border-t text-xs select-none ${
        isDark ? 'bg-[#484b51] border-[#646870]' : 'bg-[#e1e3e7] border-[#cbced4]'
      }`}>
        {/* Welcome Screen Tab */}
        <button
          onClick={onOpenWelcome}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border-r transition ${
            isDark ? 'border-[#646870]' : 'border-[#cbced4]'
          } ${
            showWelcomeScreen
              ? isDark
                ? 'bg-[#5c6068] font-semibold text-sky-300'
                : 'bg-white font-semibold text-sky-600'
              : isDark
              ? 'text-zinc-200 hover:bg-[#575b63]'
              : 'text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <span className="text-xs">🏠</span>
          <span className="text-[11px] font-medium">Welcome Screen</span>
        </button>

        {/* Document Tabs */}
        {docTabs.map((tab) => {
          const isActive = tab === activeDocTab && !showWelcomeScreen;
          return (
            <div
              key={tab}
              onClick={() => onSelectDocTab?.(tab)}
              className={`flex items-center gap-2 px-3 py-1 text-xs border-r cursor-pointer transition ${
                isDark ? 'border-[#646870]' : 'border-[#cbced4]'
              } ${
                isActive
                  ? isDark
                    ? 'bg-[#5c6068] text-white font-semibold border-t-2 border-t-sky-400'
                    : 'bg-[#cfe4fc] text-zinc-950 font-semibold border-t-2 border-t-sky-600'
                  : isDark
                  ? 'text-zinc-300 hover:bg-[#575b63]'
                  : 'text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <img
                src="/assets/aistudio/favicon_23650500.svg"
                alt=""
                className="w-3.5 h-3.5 object-contain shrink-0"
                draggable={false}
              />
              <span className="text-[11px]">{tab}</span>
              {docTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseDocTab?.(tab);
                  }}
                  className="hover:text-red-500 rounded p-0.5"
                  title="Close Document"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Document Tab (+) */}
        <button
          onClick={onNewDocTab}
          title="New Document Tab"
          className={`w-6 h-6 flex items-center justify-center rounded-xs transition ml-1 ${
            isDark
              ? 'text-zinc-300 hover:text-white hover:bg-[#575b63]'
              : 'text-zinc-600 hover:text-black hover:bg-zinc-200'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Collaboration Dialog */}
      {showCollabModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-[#f5f5f7] border border-zinc-400 rounded-sm p-4 w-96 shadow-2xl text-zinc-800">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#0078d7]" />
                <h3 className="font-semibold text-sm">Multi-User Collaboration</h3>
              </div>
              <button onClick={() => setShowCollabModal(false)} className="text-zinc-500 hover:text-black font-bold">
                &times;
              </button>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Your Name</label>
                <input
                  type="text"
                  defaultValue={currentUser.name}
                  onBlur={(e) => onUpdateUserName(e.target.value)}
                  className="w-full bg-white border border-zinc-400 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Room ID</label>
                <input
                  type="text"
                  defaultValue={roomId}
                  onBlur={(e) => onSwitchRoom(e.target.value)}
                  className="w-full bg-white border border-zinc-400 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div className="pt-2 border-t border-zinc-300">
                <div className="font-medium text-zinc-600 mb-1">Active Collaborators ({collaborators.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {collaborators.map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: user.color }} />
                        <span>{user.name} {user.id === currentUser.id && '(You)'}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">online</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
