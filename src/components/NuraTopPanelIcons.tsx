import React from 'react';

// =============================================================================
// NuraDraw Windows 10 OS Fluent / Shell Icon Set (16x16 Top Panel & Menu Grid)
// Crisp miter/0.5px corners, Windows 10 flat color planes (#0078D4, #50E6FF,
// #FFC83D Explorer Gold, #107C10 Green, #E81123 Red, #FFFFFF Paper) +
// adaptive currentColor structural strokes for seamless Light & Dark themes.
// =============================================================================

// New Document (Windows 10 crisp white page + folded corner + green plus badge)
export const IconDocNew: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M3 1.5H9.5L13 5V14.5H3V1.5Z"
      fill="#FFFFFF"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="miter"
    />
    <path d="M9.5 1.5V5H13" fill="#E1DFDD" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="miter" />
    <path d="M5 7.5H10M5 10H8.5" stroke="#8A8886" strokeWidth="1" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="0.8" fill="#107C10" />
    <path d="M12.25 10.7V13.8M10.7 12.25H13.8" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

// Windows 10 File Explorer Open Folder (#FFC83D Gold front, #E6A100 Rear tab)
export const IconFolderOpen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M1.5 3H6L7.3 4.5H13.5V12.5H1.5V3Z"
      fill="#E6A100"
      stroke="#9C6500"
      strokeWidth="0.95"
      strokeLinejoin="miter"
    />
    <path d="M3 5H12.5V6.5H3V5Z" fill="#FFFFFF" fillOpacity="0.85" />
    <path
      d="M1.5 6.5H14.5L13.2 13H1.5V6.5Z"
      fill="#FFC83D"
      stroke="#9C6500"
      strokeWidth="0.95"
      strokeLinejoin="miter"
    />
  </svg>
);

// Windows 10 Classic Blue Floppy Save Diskette (#0078D4)
export const IconSaveDisk: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M2 2H11.8L14 4.2V14H2V2Z"
      fill="#0078D4"
      stroke="#004E8C"
      strokeWidth="1"
      strokeLinejoin="miter"
    />
    <rect x="4.5" y="2" width="6" height="4" fill="#E1DFDD" stroke="#004E8C" strokeWidth="0.8" />
    <rect x="7.8" y="2.6" width="1.4" height="2.6" fill="#004E8C" />
    <rect x="4" y="8.5" width="8" height="5.5" fill="#FFFFFF" stroke="#004E8C" strokeWidth="0.8" />
    <path d="M5.5 10.5H10.5M5.5 12.2H9.2" stroke="#8A8886" strokeWidth="0.9" />
  </svg>
);

// Windows 10 OneDrive / Cloud Open (#50E6FF + #0078D4)
export const IconCloudOpen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M3.8 11H12.2C13.6 11 14.5 10 14.5 8.7C14.5 7.5 13.6 6.5 12.4 6.4C12 4.2 10.1 2.7 7.9 2.7C5.8 2.7 4 4.1 3.6 6C2.3 6.2 1.5 7.3 1.5 8.6C1.5 10 2.5 11 3.8 11Z"
      fill="#50E6FF"
      fillOpacity="0.28"
      stroke="#0078D4"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M8 7.5V13.8M5.8 11.6L8 13.8L10.2 11.6" stroke="#0078D4" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

// Cloud Save / Upload (#107C10 Windows Green arrow + #0078D4 Cloud)
export const IconCloudSave: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M3.8 11H12.2C13.6 11 14.5 10 14.5 8.7C14.5 7.5 13.6 6.5 12.4 6.4C12 4.2 10.1 2.7 7.9 2.7C5.8 2.7 4 4.1 3.6 6C2.3 6.2 1.5 7.3 1.5 8.6C1.5 10 2.5 11 3.8 11Z"
      fill="#50E6FF"
      fillOpacity="0.24"
      stroke="#0078D4"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M8 14V7.8M5.8 10L8 7.8L10.2 10" stroke="#107C10" strokeWidth="1.45" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

// Windows 10 Printer (Silver body, crisp white paper feed, #0078D4 status LED)
export const IconPrinter: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4" y="1.5" width="8" height="4" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.05" />
    <rect x="1.5" y="5" width="13" height="6" rx="0.7" fill="#D2D0CE" stroke="currentColor" strokeWidth="1.1" />
    <rect x="4" y="8.5" width="8" height="6" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.05" />
    <path d="M5.5 10.5H10.5M5.5 12.2H9.5" stroke="#605E5C" strokeWidth="0.95" />
    <rect x="11" y="6.2" width="1.6" height="1.2" fill="#0078D4" />
  </svg>
);

// Windows 10 Scissors / Cut
export const IconCut: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="4" cy="4.2" r="2" fill="#0078D4" fillOpacity="0.2" stroke="#0078D4" strokeWidth="1.25" />
    <circle cx="4" cy="11.8" r="2" fill="#0078D4" fillOpacity="0.2" stroke="#0078D4" strokeWidth="1.25" />
    <path d="M5.6 5.4L14 12.2M5.6 10.6L14 3.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

// Windows 10 Copy (Overlapping crisp white documents)
export const IconCopyDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="4" width="8" height="10" fill="#E1DFDD" stroke="currentColor" strokeWidth="1.1" />
    <rect x="5.5" y="1.5" width="8" height="10" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <path d="M7.2 4.5H11.8M7.2 6.8H11.8M7.2 9H10.2" stroke="#0078D4" strokeWidth="1" />
  </svg>
);

// Windows 10 Clipboard Paste (Brown/Amber board + crisp white sheet)
export const IconPasteDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="2.5" width="10" height="12" rx="0.6" fill="#D29200" fillOpacity="0.88" stroke="#7A5200" strokeWidth="1" />
    <rect x="5" y="1.2" width="5" height="2.3" fill="#8A8886" stroke="#323130" strokeWidth="0.9" />
    <rect x="4.5" y="4.5" width="8.5" height="9.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" />
    <path d="M6.2 7H11.2M6.2 9.2H11.2M6.2 11.4H9.6" stroke="#0078D4" strokeWidth="1" />
  </svg>
);

// Import (#0078D4 Windows Blue arrow into tray)
export const IconImportArrow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 10.5V14H14V10.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M8 2V10.5M5 7.5L8 10.5L11 7.5" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

// Export (#107C10 Windows Green arrow out of tray)
export const IconExportArrow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 10.5V14H14V10.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M8 10.8V2.2M5 5.2L8 2.2L11 5.2" stroke="#107C10" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

// Export PDF (Crisp white document with #D13438 red header/badge)
export const IconExportPdf: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9.5L13 5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M9.5 1.5V5H13" fill="#E1DFDD" stroke="currentColor" strokeWidth="1" />
    <rect x="4" y="6.8" width="7.5" height="5.2" rx="0.5" fill="#D13438" />
    <path d="M5.5 10.5C6.8 7.6 9.2 7.6 10 10.5C8 9.7 7 9.7 5.5 10.5Z" stroke="#FFFFFF" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

// Full Screen Preview (F9)
export const IconFullScreenF9: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4" y="4" width="8" height="8" fill="#50E6FF" fillOpacity="0.28" stroke="#0078D4" strokeWidth="1.15" />
    <path
      d="M1.5 5.5V1.5H5.5M10.5 1.5H14.5V5.5M14.5 10.5V14.5H10.5M5.5 14.5H1.5V10.5"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="square"
    />
  </svg>
);

// Show Rulers with eye
export const IconRulersEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 2H4.8V11.2H14V14H2V2Z" fill="#FFC83D" fillOpacity="0.75" stroke="currentColor" strokeWidth="1" />
    <path d="M2 5H4M2 8H4.2M7 14V12M10.5 14V12" stroke="currentColor" strokeWidth="0.95" />
    <path d="M6.5 6.2C7.8 4.2 11.7 4.2 13 6.2C11.7 8.2 7.8 8.2 6.5 6.2Z" fill="#FFFFFF" stroke="#0078D4" strokeWidth="1.15" />
    <circle cx="9.75" cy="6.2" r="1.1" fill="#0078D4" />
  </svg>
);

// Show Grid (Crisp Windows 10 grid lines)
export const IconGridEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="12" height="12" fill="#FFFFFF" fillOpacity="0.9" stroke="currentColor" strokeWidth="1.15" />
    <path d="M6 2V14M10 2V14M2 6H14M2 10H14" stroke="#8A8886" strokeWidth="0.95" />
    <rect x="9" y="5" width="2" height="2" fill="#0078D4" />
  </svg>
);

// Show Guidelines
export const IconGuidelinesEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.25" strokeDasharray="2 1.8" />
    <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#0078D4" strokeWidth="1.25" strokeDasharray="2 1.8" />
    <rect x="5.5" y="5.5" width="5" height="5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="7" y="7" width="2" height="2" fill="#0078D4" />
  </svg>
);

// Snap Toggle (Windows 10 U-Magnet with silver/red poles)
export const IconSnapToggle: React.FC<{ className?: string; active?: boolean }> = ({ className = 'w-4 h-4', active = true }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M4 2.5V8C4 10.2 5.8 12 8 12C10.2 12 12 10.2 12 8V2.5"
      stroke={active ? '#E81123' : 'currentColor'}
      strokeWidth="2.1"
      strokeLinecap="butt"
    />
    <rect x="2.8" y="1.8" width="2.4" height="2.2" fill="#D2D0CE" stroke="currentColor" strokeWidth="0.7" />
    <rect x="10.8" y="1.8" width="2.4" height="2.2" fill="#D2D0CE" stroke="currentColor" strokeWidth="0.7" />
    {active ? (
      <rect x="10.5" y="10.5" width="4.5" height="4.5" rx="0.8" fill="#107C10" />
    ) : (
      <path d="M11 11L14.5 14.5M14.5 11L11 14.5" stroke="#E81123" strokeWidth="1.5" />
    )}
  </svg>
);

// Mirror Horizontal
export const IconMirrorHorizontal: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.2" strokeDasharray="2 1.5" />
    <path d="M6 4L2 8L6 12V4Z" fill="#0078D4" stroke="#005A9E" strokeWidth="0.9" strokeLinejoin="miter" />
    <path d="M10 4L14 8L10 12V4Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="miter" />
  </svg>
);

// Mirror Vertical
export const IconMirrorVertical: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#0078D4" strokeWidth="1.2" strokeDasharray="2 1.5" />
    <path d="M4 6L8 2L12 6H4Z" fill="#0078D4" stroke="#005A9E" strokeWidth="0.9" strokeLinejoin="miter" />
    <path d="M4 10L8 14L12 10H4Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="miter" />
  </svg>
);

// Corner Styles
export const IconCornerRound: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13.5V8.5C3 5.5 5.5 3 8.5 3H13.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="square" />
    <rect x="7.5" y="7.5" width="3" height="3" fill="#0078D4" />
  </svg>
);

export const IconCornerScallop: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13.5V8.5C6 8.5 8.5 6 8.5 3H13.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="square" />
    <rect x="4" y="4" width="3" height="3" fill="#0078D4" />
  </svg>
);

export const IconCornerChamfer: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13.5V8L8 3H13.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="square" strokeLinejoin="miter" />
    <rect x="4.5" y="4.5" width="2.6" height="2.6" fill="#0078D4" />
  </svg>
);

// Pen Nib outline icon (Windows Gold/Brass nib)
export const IconPenNib: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M8 1.5L12 7.5L10.3 11.5H5.7L4 7.5L8 1.5Z"
      fill="#FFC83D"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="miter"
    />
    <path d="M8 1.5V7" stroke="currentColor" strokeWidth="1.05" />
    <circle cx="8" cy="7.5" r="1.1" fill="#0078D4" />
    <rect x="5" y="11.5" width="6" height="2.5" fill="#0078D4" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// PowerClip Icon (Windows 10 container + shape clip)
export const IconPowerClip: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="12" height="12" fill="#E6F2FA" fillOpacity="0.5" stroke="#0078D4" strokeWidth="1.15" strokeDasharray="2.5 1.5" />
    <circle cx="8.5" cy="8.5" r="3" fill="#50E6FF" stroke="#0078D4" strokeWidth="1" />
    <path d="M1.5 1.5L6.2 6.2M6.2 3.2V6.2H3.2" stroke="#E81123" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

// New from Template
export const IconTemplateNew: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="10.5" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="2" y="2" width="10.5" height="2.8" fill="#0078D4" />
    <path d="M5.5 4.8V14" stroke="#8A8886" strokeWidth="0.95" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="0.8" fill="#107C10" />
    <path d="M12.25 10.7V13.8M10.7 12.25H13.8" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

// Close Document (Windows 10 window + #E81123 X badge)
export const IconCloseDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2.5" width="11" height="11" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="2" y="2.5" width="11" height="2.6" fill="#D2D0CE" stroke="currentColor" strokeWidth="1" />
    <rect x="9.5" y="1.5" width="5.5" height="5.5" rx="0.6" fill="#E81123" />
    <path d="M11 3L13.5 5.5M13.5 3L11 5.5" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

// Close All Documents
export const IconCloseAllDocs: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4.5" y="1.5" width="9" height="9" fill="#E1DFDD" stroke="currentColor" strokeWidth="1" />
    <rect x="1.5" y="4.8" width="9.5" height="9.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="1.5" y="4.8" width="9.5" height="2.4" fill="#0078D4" />
    <rect x="9.5" y="1.5" width="5.5" height="5.5" rx="0.6" fill="#E81123" />
    <path d="M11 3L13.5 5.5M13.5 3L11 5.5" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

// Save As (Windows 10 blue floppy + green +)
export const IconSaveAsPlus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 2H11L13 4V13.5H2V2Z" fill="#0078D4" stroke="#004E8C" strokeWidth="1" />
    <rect x="4.5" y="2" width="5" height="3.5" fill="#E1DFDD" stroke="#004E8C" strokeWidth="0.8" />
    <rect x="4" y="8" width="7" height="5.5" fill="#FFFFFF" stroke="#004E8C" strokeWidth="0.8" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="0.8" fill="#107C10" />
    <path d="M12.25 10.7V13.8M10.7 12.25H13.8" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

// Save as Template
export const IconSaveTemplate: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4" y="1.5" width="10" height="10" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="4" y="1.5" width="10" height="2.6" fill="#0078D4" />
    <rect x="1.5" y="6.5" width="7.5" height="7.5" fill="#0078D4" stroke="#004E8C" strokeWidth="0.9" />
    <rect x="3" y="10.2" width="4.5" height="3.8" fill="#FFFFFF" />
  </svg>
);

// Revert Document
export const IconRevertDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 4.2H9L11.8 7V14.5H2.5V4.2Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <path d="M10.2 2.5C12.8 2.5 14.2 4 14 6.5" stroke="#0078D4" strokeWidth="1.45" strokeLinecap="square" />
    <path d="M11 1L9 2.6L11 4.2" fill="#0078D4" />
  </svg>
);

// Print Preview
export const IconPrintPreview: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L12 4.5V14H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="9.8" cy="9.8" r="2.8" fill="#50E6FF" fillOpacity="0.45" stroke="#0078D4" strokeWidth="1.25" />
    <path d="M12 12L14.5 14.5" stroke="#005A9E" strokeWidth="1.7" strokeLinecap="square" />
  </svg>
);

// Document Properties
export const IconDocProperties: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 1.5H8L11 4.5V14.5H2V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 6.5H8.5M4 9.2H7.5M10.5 7.5H14.5M10.5 10.2H14.5M10.5 12.8H14.5" stroke="#0078D4" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

// Exit / Power (#E81123 Windows Red)
export const IconPowerExit: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M4.8 4A5 5 0 1 0 11.2 4" stroke="#E81123" strokeWidth="1.55" strokeLinecap="square" />
    <line x1="8" y1="1.8" x2="8" y2="7.5" stroke="#E81123" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

// Edit Menu Icons (Windows 10 Azure Blue #0078D4 curved arrows)

export const IconUndoMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M4.5 5H9.5A4 4 0 1 1 5.5 12.5" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="square" />
    <path d="M6.5 2.5L3.2 5L6.5 7.5V2.5Z" fill="#0078D4" />
  </svg>
);

export const IconRedoMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M11.5 5H6.5A4 4 0 1 0 10.5 12.5" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="square" />
    <path d="M9.5 2.5L12.8 5L9.5 7.5V2.5Z" fill="#0078D4" />
  </svg>
);

export const IconRepeatMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M11.5 5.2A4.5 4.5 0 1 0 12 10.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <path d="M8.8 5.5H12.5V1.8" stroke="#0078D4" strokeWidth="1.45" strokeLinecap="square" />
  </svg>
);

export const IconBringIntoFocus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 5V2H5M11 2H14V5M14 11V14H11M5 14H2V11" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    <rect x="5.5" y="5.5" width="5" height="5" fill="#50E6FF" fillOpacity="0.4" stroke="#0078D4" strokeWidth="1.2" />
  </svg>
);

export const IconExitFocusMode: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="5.5" width="8" height="8" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" />
    <rect x="4.5" y="8" width="3" height="3" fill="#0078D4" fillOpacity="0.35" />
    <path d="M8.5 5.5L10.5 7.5L14.5 3" stroke="#107C10" strokeWidth="1.65" strokeLinecap="square" />
  </svg>
);

export const IconCopyProperties: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="6.5" height="7.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="7.5" y="6.5" width="6.5" height="7.5" fill="#E6F2FA" stroke="#0078D4" strokeWidth="1.15" />
    <rect x="9.5" y="9" width="2.5" height="2.5" fill="#0078D4" />
  </svg>
);

export const IconPasteInView: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="8" height="10" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6.5" y="6.5" width="7.5" height="7.5" fill="#E6F2FA" stroke="#0078D4" strokeWidth="1.15" />
    <rect x="9.2" y="9.2" width="2.2" height="2.2" fill="#0078D4" />
  </svg>
);

export const IconPasteSpecial: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="8" height="10" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6.5" y="6.5" width="7.5" height="7.5" fill="#FFF4CE" stroke="#D29200" strokeWidth="1.15" />
    <rect x="9.2" y="9.2" width="2.2" height="2.2" fill="#D29200" />
  </svg>
);

export const IconTrashDelete: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 4H13.5M6 4V2H10V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    <path d="M4 4L4.8 14H11.2L12 4H4Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="miter" />
    <path d="M6.5 6.5V11.5M9.5 6.5V11.5" stroke="#E81123" strokeWidth="1.15" />
  </svg>
);

export const IconDuplicatePlus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="4.5" width="6.5" height="6.5" fill="#E1DFDD" stroke="currentColor" strokeWidth="1.1" />
    <rect x="5.5" y="7.5" width="6.5" height="6.5" fill="#E6F2FA" stroke="#0078D4" strokeWidth="1.1" />
    <rect x="9.5" y="1.5" width="5" height="5" rx="0.6" fill="#107C10" />
    <path d="M12 2.5V5.5M10.5 4H13.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

export const IconCloneDual: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="3.2" width="6" height="9.6" fill="#0078D4" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.15" />
    <rect x="8.2" y="3.2" width="6" height="9.6" fill="#FFFFFF" stroke="#0078D4" strokeWidth="1.15" strokeDasharray="2 1.2" />
  </svg>
);

// View Menu Icons

export const IconPreviewSelected: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.15" strokeDasharray="2 1.5" />
    <rect x="5" y="5" width="6" height="6" fill="#50E6FF" fillOpacity="0.4" stroke="#0078D4" strokeWidth="1.2" />
  </svg>
);

export const IconZoomInMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.5" fill="#50E6FF" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6.8 4.8V8.8M4.8 6.8H8.8" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M10.2 10.2L14 14" stroke="#323130" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

export const IconZoomOutMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.8 6.8H8.8" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M10.2 10.2L14 14" stroke="#323130" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

export const IconZoomToFitMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.5" fill="#50E6FF" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.2" />
    <rect x="4.8" y="4.8" width="4" height="4" stroke="#0078D4" strokeWidth="1.15" />
    <path d="M10.2 10.2L14 14" stroke="#323130" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

// Layout Menu Icons

export const IconInsertPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L12 4.5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M4.5 6.8H8.5M4.5 9.2H8.5" stroke="#8A8886" strokeWidth="1" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="0.8" fill="#107C10" />
    <path d="M12.25 10.7V13.8M10.7 12.25H13.8" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

export const IconDuplicatePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="7" height="9" fill="#E1DFDD" stroke="currentColor" strokeWidth="1" />
    <rect x="5" y="5" width="7" height="9" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="9.5" y="1.5" width="5" height="5" rx="0.6" fill="#107C10" />
    <path d="M12 2.5V5.5M10.5 4H13.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

export const IconRenamePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L12 4.5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M10.2 2.5H14.2M10.2 7.5H14.2M12.2 2.5V7.5" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

export const IconDeletePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L12 4.5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="0.8" fill="#E81123" />
    <path d="M10.8 12.25H13.7" stroke="#FFFFFF" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

export const IconGoToPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L12 4.5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M9 7L14 2M10.5 2H14V5.5" stroke="#0078D4" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

export const IconLayerActive: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 11L8 14L14 11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="miter" />
    <path d="M2 8L8 11L14 8" stroke="#0078D4" strokeWidth="1.25" strokeLinejoin="miter" />
    <path d="M8 2L14 5L8 8L2 5L8 2Z" fill="#FFC83D" stroke="#9C6500" strokeWidth="1" strokeLinejoin="miter" />
  </svg>
);

// All / Odd / Even Pages
export const IconAllPages123: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="1.8" width="6.5" height="8" fill="#E6F2FA" stroke="currentColor" strokeWidth="1" />
    <rect x="4.8" y="3.8" width="6.5" height="8" fill="#E6F2FA" stroke="currentColor" strokeWidth="1" />
    <rect x="7.8" y="5.8" width="6.5" height="8" fill="#FFFFFF" stroke="#0078D4" strokeWidth="1.15" />
  </svg>
);

export const IconOddPages135: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="1.8" width="6.5" height="8" fill="#DFF6DD" stroke="#107C10" strokeWidth="1.1" />
    <rect x="4.8" y="3.8" width="6.5" height="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.55" />
    <rect x="7.8" y="5.8" width="6.5" height="8" fill="#DFF6DD" stroke="#107C10" strokeWidth="1.15" />
  </svg>
);

export const IconEvenPages246: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="1.8" width="6.5" height="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.55" />
    <rect x="4.8" y="3.8" width="6.5" height="8" fill="#EFE8FA" stroke="#8661C5" strokeWidth="1.15" />
    <rect x="7.8" y="5.8" width="6.5" height="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.55" />
  </svg>
);

// Windows 10 Crisp Cogwheel Mini Badge
const GearBadge = () => (
  <g transform="translate(9.5, 9.5)">
    <path
      d="M2.5 0H3.5L3.8 0.9L4.6 1.2L5.4 0.7L6 1.3L5.4 2.1L5.7 2.8L6.5 3V4L5.7 4.2L5.4 4.9L6 5.6L5.3 6.2L4.5 5.7L3.8 6L3.5 6.8H2.5L2.2 6L1.5 5.7L0.7 6.2L0 5.6L0.6 4.9L0.3 4.2L-0.5 4V3L0.3 2.8L0.6 2.1L0 1.3L0.6 0.7L1.4 1.2L2.2 0.9L2.5 0Z"
      fill="#0078D4"
      stroke="#FFFFFF"
      strokeWidth="0.4"
    />
    <circle cx="3" cy="3.4" r="1.1" fill="#FFFFFF" />
  </g>
);

export const IconPageNumberSettings: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9L11.8 4.2V14H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <path d="M5.2 5.2L4.5 10.5M7.8 5.2L7.1 10.5M3.8 7H8.6M3.5 8.8H8.3" stroke="currentColor" strokeWidth="1.05" />
    <GearBadge />
  </svg>
);

export const IconSwitchOrientation: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="1.8" width="5" height="7.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="7" y="9" width="7.2" height="5" fill="#E6F2FA" stroke="#0078D4" strokeWidth="1.15" />
    <path d="M9 3.5H12.5V6.8M11 5.3L12.5 6.8L14 5.3" stroke="#0078D4" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

export const IconDocOptions: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5H9.5L13 5V14.5H2.5V1.5Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M9.5 1.5V5H13" fill="#E1DFDD" stroke="currentColor" strokeWidth="1" />
    <path d="M4.5 7.5H10.5M4.5 10H9" stroke="#0078D4" strokeWidth="1" />
  </svg>
);

export const IconPageSize: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="1.8" width="9.5" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 11L9.5 5.5M6.8 5.5H9.5V8.2M4 8.2V11H6.8" stroke="#0078D4" strokeWidth="1.2" strokeLinecap="square" />
    <GearBadge />
  </svg>
);

export const IconPageLayout: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="1.8" width="9.5" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="3.5" y="3.8" width="3.2" height="7.5" fill="#E6F2FA" stroke="#0078D4" strokeWidth="0.9" />
    <path d="M8 5.2H10M8 7.4H10" stroke="currentColor" strokeWidth="1" />
    <GearBadge />
  </svg>
);

export const IconPageBackground: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="1.8" width="9.5" height="12" fill="#50E6FF" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.1" />
    <path d="M3.5 11.2L9.5 5.2M3.5 8L6.8 4.8" stroke="#0078D4" strokeWidth="1" />
    <GearBadge />
  </svg>
);

export const IconBorderGrommet: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="12" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="4.8" cy="4.8" r="1.1" fill="#0078D4" />
    <circle cx="11.2" cy="4.8" r="1.1" fill="#0078D4" />
    <circle cx="4.8" cy="11.2" r="1.1" fill="#0078D4" />
    <circle cx="11.2" cy="11.2" r="1.1" fill="#0078D4" />
  </svg>
);

// Bitmap Menu Icons

export const IconConvertToBitmap: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="2" width="6.2" height="6.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <rect x="7.5" y="7.5" width="6.8" height="6.8" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" />
    <rect x="7.5" y="7.5" width="3.4" height="3.4" fill="#0078D4" />
    <rect x="10.9" y="10.9" width="3.4" height="3.4" fill="#605E5C" />
    <path d="M10 3.2H13.2V6.4" stroke="#107C10" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

export const IconStraightenImage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#0078D4" strokeWidth="1.1" strokeDasharray="2 1.5" />
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.1" strokeDasharray="2 1.5" />
    <rect
      x="3.8"
      y="4.2"
      width="8.4"
      height="7.6"
      transform="rotate(-10 8 8)"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.15"
    />
  </svg>
);

export const IconImageAdjustmentLab: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="2" width="12.4" height="12" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" />
    <line x1="4.6" y1="4" x2="4.6" y2="12" stroke="#8A8886" strokeWidth="1.1" />
    <rect x="3.4" y="5.5" width="2.4" height="2" fill="#E81123" />
    <line x1="8" y1="4" x2="8" y2="12" stroke="#8A8886" strokeWidth="1.1" />
    <rect x="6.8" y="8.8" width="2.4" height="2" fill="#107C10" />
    <line x1="11.4" y1="4" x2="11.4" y2="12" stroke="#8A8886" strokeWidth="1.1" />
    <rect x="10.2" y="5" width="2.4" height="2" fill="#0078D4" />
  </svg>
);

export const IconCmykSeparation: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="5.5" height="5.5" fill="#00BCF2" stroke="#0078D4" strokeWidth="0.6" />
    <rect x="8.5" y="2" width="5.5" height="5.5" fill="#EC008C" />
    <rect x="2" y="8.5" width="5.5" height="5.5" fill="#FFF100" stroke="#D29200" strokeWidth="0.6" />
    <rect x="8.5" y="8.5" width="5.5" height="5.5" fill="#323130" />
  </svg>
);

// Text Menu Icons

export const IconTextTabs: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 4H6.5M4.8 2.2L6.5 4L4.8 5.8" stroke="#0078D4" strokeWidth="1.4" strokeLinecap="square" />
    <path d="M2 7.8H14M6 10.5H14M6 13.2H14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

export const IconTextColumns: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 3.5H6.8M2 6.5H6.8M2 9.5H6.8M2 12.5H6.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    <path d="M9.2 3.5H14M9.2 6.5H14M9.2 9.5H14M9.2 12.5H14" stroke="#0078D4" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

export const IconBulletsNumbering: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="3.2" width="2" height="2" fill="#0078D4" />
    <rect x="2" y="7" width="2" height="2" fill="#0078D4" />
    <rect x="2" y="10.8" width="2" height="2" fill="#0078D4" />
    <path d="M5.8 4.2H14M5.8 8H14M5.8 11.8H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);

export const IconDropCap: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.2 9L4.6 3L7 9M3 7.2H6.2" stroke="#0078D4" strokeWidth="1.45" strokeLinecap="square" />
    <path d="M9 4H14M9 6.8H14M2.2 11.5H14M2.2 13.8H11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

export const IconTextStatistics: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.2" y="9.5" width="2" height="4" fill="#0078D4" />
    <rect x="5.5" y="5.5" width="2" height="8" fill="#50E6FF" stroke="#0078D4" strokeWidth="0.6" />
    <rect x="8.8" y="7.5" width="2" height="6" fill="#0078D4" />
    <rect x="12" y="3" width="2" height="10.5" fill="#107C10" />
    <path d="M1.5 13.8H14.5" stroke="currentColor" strokeWidth="1.15" />
  </svg>
);

export const IconEditText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.8 11.2L5 5L7.2 11.2M3.5 9.2H6.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M11.5 2.5V13.5M9.8 2.5H13.2M9.8 13.5H13.2" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

export const IconConvertParagraphText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="2" width="7.2" height="7.2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.1" strokeDasharray="1.8 1.2" />
    <path d="M3.2 4.8H7.5M3.2 6.8H6.5" stroke="currentColor" strokeWidth="1" />
    <path d="M9 13.8L11.2 8.2L13.4 13.8M9.7 12H12.7" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

export const IconFitTextToPath: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 13C5 7 10 5 13.5 4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 7L6.5 3L8 7M5.5 5.8H7.5" stroke="#0078D4" strokeWidth="1.3" strokeLinecap="square" />
    <rect x="1.3" y="11.8" width="2.4" height="2.4" fill="#0078D4" />
    <rect x="12.3" y="2.8" width="2.4" height="2.4" fill="#0078D4" />
  </svg>
);

export const IconStraightenText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 11.5L4.8 7L6.6 11.5M9.5 11.5L11.3 7L13.1 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    <path d="M4 5C6 2.8 10 2.8 12 5" stroke="#0078D4" strokeWidth="1.25" />
    <path d="M2 13.8H14" stroke="#0078D4" strokeWidth="1.35" />
  </svg>
);

export const IconAlignToBaseline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3.2 10.5L5.8 4L8.4 10.5M4 8.5H7.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <circle cx="11.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    <line x1="1.8" y1="13" x2="14.2" y2="13" stroke="#0078D4" strokeWidth="1.5" />
  </svg>
);

export const IconChangeCase: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="4.5" cy="10.2" r="2.1" stroke="currentColor" strokeWidth="1.3" />
    <line x1="6.6" y1="8.2" x2="6.6" y2="12.3" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9 12.2L11.2 6.5L13.4 12.2M9.6 10.5H12.8" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
    <path d="M5 4.2C7 2.5 9.8 2.5 11.5 4.2" stroke="#0078D4" strokeWidth="1.25" />
  </svg>
);

export const IconEncodeText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M5.5 4.2L2 8L5.5 11.8M10.5 4.2L14 8L10.5 11.8M8.8 3.2L7.2 12.8" stroke="#0078D4" strokeWidth="1.45" strokeLinecap="square" />
  </svg>
);

// Nudge Distance
export const IconNudgeDistance: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="6" y="6" width="4" height="4" fill="#50E6FF" stroke="currentColor" strokeWidth="1.15" />
    <path d="M8 1.5V4.2M8 11.8V14.5M1.5 8H4.2M11.8 8H14.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M6.5 3L8 1.5L9.5 3M6.5 13L8 14.5L9.5 13M3 6.5L1.5 8L3 9.5M13 6.5L14.5 8L13 9.5" stroke="#0078D4" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

// Autofit Page
export const IconAutofitPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="3.5" y="3.5" width="9" height="9" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.15" />
    <rect x="6.8" y="6.8" width="2.4" height="2.4" fill="#0078D4" />
    <path d="M11.5 4.5L14.5 1.5M12 1.5H14.5V4M4.5 11.5L1.5 14.5M4 14.5H1.5V12" stroke="#0078D4" strokeWidth="1.35" strokeLinecap="square" />
  </svg>
);

// Symmetry Tool Icons
export const IconSymmetryCreate: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.2" strokeDasharray="2 1.4" />
    <path d="M6 4.2L2 8L6 11.8V4.2Z" fill="#50E6FF" stroke="#0078D4" strokeWidth="1" strokeLinejoin="miter" />
    <path d="M10 4.2L14 8L10 11.8V4.2Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" strokeLinejoin="miter" />
    <rect x="10.2" y="1.2" width="4.8" height="4.8" rx="0.6" fill="#107C10" />
    <path d="M12.6 2.2V5M11.2 3.6H14" stroke="#FFFFFF" strokeWidth="1.15" strokeLinecap="square" />
  </svg>
);

export const IconSymmetryEdit: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.2" strokeDasharray="2 1.4" />
    <path d="M6 4.2L2 8L6 11.8V4.2Z" fill="#50E6FF" stroke="#0078D4" strokeWidth="1" strokeLinejoin="miter" />
    <path d="M10 4.2L14 8L10 11.8V4.2Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" strokeLinejoin="miter" />
    <path d="M10.5 13.5L13.8 10.2L14.8 11.2L11.5 14.5L10 14.8L10.5 13.5Z" fill="#FFC83D" stroke="#9C6500" strokeWidth="0.9" />
  </svg>
);

export const IconSymmetryFinish: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078D4" strokeWidth="1.2" strokeDasharray="2 1.4" />
    <path d="M6 4.2L2 8L6 11.8V4.2Z" fill="#50E6FF" stroke="#0078D4" strokeWidth="1" strokeLinejoin="miter" />
    <path d="M10 4.2L14 8L10 11.8V4.2Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" strokeLinejoin="miter" />
    <rect x="9.8" y="9.8" width="5.2" height="5.2" rx="0.6" fill="#107C10" />
    <path d="M11 12.4L12.1 13.5L14 11.2" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="square" />
  </svg>
);

export const IconSymmetryRemove: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 1.4" opacity="0.55" />
    <path d="M6 4.2L2 8L6 11.8V4.2Z" fill="#E1DFDD" stroke="currentColor" strokeWidth="1" />
    <path d="M10 4.2L14 8L10 11.8V4.2Z" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.2" opacity="0.55" />
    <path d="M10.5 10.5L14.2 14.2M14.2 10.5L10.5 14.2" stroke="#E81123" strokeWidth="1.65" strokeLinecap="square" />
  </svg>
);

export const IconSymmetryBreak: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M5.5 4.2L1.8 8L5.5 11.8V4.2Z" fill="#50E6FF" stroke="#0078D4" strokeWidth="1" />
    <path d="M10.5 4.2L14.2 8L10.5 11.8V4.2Z" fill="#FFFFFF" stroke="#0078D4" strokeWidth="1" />
    <path d="M7.5 1.8L8.5 5.4L7 8L8.5 10.6L7.5 14.2" stroke="#E81123" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

// =============================================================================
// Multi-Selection Shaping & Combine Icons (Matches Property Bar Reference)
// =============================================================================

export const IconShapeCombine: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 2H9V5H5V9H2V2Z" fill="currentColor" />
    <rect x="5.75" y="5.75" width="4.5" height="4.5" fill="currentColor" />
    <path d="M11 7H14V14H7V11H11V7Z" fill="currentColor" />
  </svg>
);

export const IconShapeWeld: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M2.5 2.5H9.5V6.5H13.5V13.5H6.5V9.5H2.5V2.5Z"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeTrim: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M2.5 9.5V2.5H9.5V6.5H6.5V9.5H2.5Z"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
    <rect
      x="6.5"
      y="6.5"
      width="7"
      height="7"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeIntersect: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect
      x="2.5"
      y="2.5"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
    <rect
      x="6.5"
      y="6.5"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeDasharray="1.5 1.3"
      strokeLinejoin="miter"
    />
    <rect
      x="6.5"
      y="6.5"
      width="3"
      height="3"
      fill="#FFFFFF"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeSimplify: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect
      x="2.5"
      y="2.5"
      width="7"
      height="7"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
    <path
      d="M6.5 9.5V6.5H9.5"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeDasharray="1.5 1.3"
      strokeLinejoin="miter"
    />
    <path
      d="M9.5 6.5H13.5V13.5H6.5V9.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeFrontMinusBack: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect
      x="2.5"
      y="2.5"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeDasharray="1.5 1.3"
      strokeLinejoin="miter"
    />
    <path
      d="M9.5 6.5H13.5V13.5H6.5V9.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeBackMinusFront: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M2.5 9.5V2.5H9.5V6.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="miter"
    />
    <rect
      x="6.5"
      y="6.5"
      width="7"
      height="7"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeDasharray="1.5 1.3"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShapeBoundary: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path
      d="M2.5 2.5H9.5V6.5H13.5V13.5H6.5V9.5H2.5V2.5Z"
      fill="#FFFFFF"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="miter"
    />
    <rect
      x="8.2"
      y="8.2"
      width="3.3"
      height="3.3"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.6"
    />
  </svg>
);

