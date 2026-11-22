import React from 'react';

// New Document with green plus
export const IconDocNew: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 1.5 L10 1.5 L13 4.5 L13 14.5 L3 14.5 Z" fill="#ffffff" stroke="#374151" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M10 1.5 L10 4.5 L13 4.5" fill="#e5e7eb" stroke="#374151" strokeWidth="1" />
    <circle cx="4" cy="4" r="2.5" fill="#22c55e" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M4 2.5 L4 5.5 M2.5 4 L5.5 4" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Folder Open with dropdown
export const IconFolderOpen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M1.5 3 C1.5 2.5 2 2 2.5 2 L6 2 L7.5 3.5 L13.5 3.5 C14 3.5 14.5 4 14.5 4.5 L14.5 5.5 L1.5 5.5 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
    <path d="M1 6 L13 6 L15 13.5 L3 13.5 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

// File Save icon using attached SVG as-is
export const IconSaveDisk: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img
    src="/assets/aistudio/favicon_23650500.svg"
    alt="Save"
    className={`${className} object-contain shrink-0`}
    draggable={false}
  />
);

// Cloud open / download
export const IconCloudOpen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3.5 9.5 C2.5 9.5 1.5 8.7 1.5 7.5 C1.5 6.4 2.3 5.6 3.3 5.5 C3.8 3.8 5.3 2.5 7.2 2.5 C9.3 2.5 11 3.9 11.4 5.8 C12.6 6 13.5 7 13.5 8.2 C13.5 9.5 12.5 10.5 11.2 10.5 L3.5 10.5 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
    <path d="M7.5 6 L7.5 11 M5.5 9 L7.5 11 L9.5 9" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Cloud upload / publish
export const IconCloudSave: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3.5 9.5 C2.5 9.5 1.5 8.7 1.5 7.5 C1.5 6.4 2.3 5.6 3.3 5.5 C3.8 3.8 5.3 2.5 7.2 2.5 C9.3 2.5 11 3.9 11.4 5.8 C12.6 6 13.5 7 13.5 8.2 C13.5 9.5 12.5 10.5 11.2 10.5 L3.5 10.5 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
    <path d="M7.5 11 L7.5 6 M5.5 8 L7.5 6 L9.5 8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Printer
export const IconPrinter: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4" y="1.5" width="8" height="4" fill="#ffffff" stroke="#475569" strokeWidth="1" />
    <rect x="2" y="5.5" width="12" height="6" rx="1" fill="#64748b" stroke="#334155" strokeWidth="1" />
    <rect x="4.5" y="8.5" width="7" height="6" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
  </svg>
);

// Cut (Scissors on page)
export const IconCut: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M4 11 L12 3 M4 3 L12 11" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="3.5" cy="11.5" r="1.8" stroke="#334155" strokeWidth="1.2" />
    <circle cx="3.5" cy="3.5" r="1.8" stroke="#334155" strokeWidth="1.2" />
  </svg>
);

// Copy (Two sheets)
export const IconCopyDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="5.5" y="2" width="8" height="10" fill="#ffffff" stroke="#334155" strokeWidth="1.2" />
    <path d="M2.5 5 L2.5 14 L10.5 14" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Paste (Clipboard)
export const IconPasteDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="3" width="9" height="11" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
    <rect x="5" y="5.5" width="9" height="9" fill="#ffffff" stroke="#334155" strokeWidth="1.2" />
    <rect x="4" y="1.5" width="5" height="2.5" rx="0.5" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
  </svg>
);

// Import [↓]
export const IconImportArrow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 13 L14 13" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="square" />
    <path d="M8 2 L8 10 M4.5 6.5 L8 10 L11.5 6.5" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Export [↑]
export const IconExportArrow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 13 L14 13" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="square" />
    <path d="M8 10 L8 2 M4.5 5.5 L8 2 L11.5 5.5" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Export PDF [↑ PDF]
export const IconExportPdf: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M8 8 L8 1.5 M5.5 4 L8 1.5 L10.5 4" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <text x="8" y="14" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#dc2626" fontFamily="Arial, sans-serif">
      PDF
    </text>
  </svg>
);

// Full screen preview (F9)
export const IconFullScreenF9: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="3" y="3" width="10" height="10" fill="#1e293b" />
    <path d="M1 4 L1 1 L4 1 M12 1 L15 1 L15 4 M1 12 L1 15 L4 15 M15 12 L15 15 L12 15" stroke="#334155" strokeWidth="1.5" />
  </svg>
);

// Show Rulers with eye [👁 L]
export const IconRulersEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 2 L2 14 L14 14" stroke="#334155" strokeWidth="1.5" />
    <path d="M2 5 L4 5 M2 8 L5 8 M2 11 L4 11 M5 14 L5 12 M8 14 L8 11 M11 14 L11 12" stroke="#475569" strokeWidth="1" />
    <ellipse cx="9" cy="7" rx="3.5" ry="2" stroke="#0284c7" strokeWidth="1" fill="#e0f2fe" />
    <circle cx="9" cy="7" r="1.2" fill="#0284c7" />
  </svg>
);

// Show Grid with eye [👁 #]
export const IconGridEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="#64748b" strokeWidth="1" fill="none" />
    <path d="M6 2 L6 14 M10 2 L10 14 M2 6 L14 6 M2 10 L14 10" stroke="#94a3b8" strokeWidth="1" />
    <circle cx="11" cy="5" r="1.5" fill="#0284c7" />
  </svg>
);

// Show Guidelines with eye [👁 +]
export const IconGuidelinesEye: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="2" x2="8" y2="14" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="2 2" />
    <line x1="2" y1="8" x2="14" y2="8" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="2 2" />
    <circle cx="8" cy="8" r="2.5" stroke="#334155" strokeWidth="1" fill="#ffffff" />
    <circle cx="8" cy="8" r="1" fill="#0284c7" />
  </svg>
);

// Snap toggle with active magnet or red cross
export const IconSnapToggle: React.FC<{ className?: string; active?: boolean }> = ({ className = 'w-4 h-4', active = true }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M4 3 L4 8 C4 10.2 5.8 12 8 12 C10.2 12 12 10.2 12 8 L12 3" stroke={active ? '#0284c7' : '#64748b'} strokeWidth="1.6" />
    <rect x="3" y="2" width="2" height="3" fill="#ef4444" />
    <rect x="11" y="2" width="2" height="3" fill="#ef4444" />
    {active ? (
      <circle cx="12" cy="12" r="2.5" fill="#16a34a" />
    ) : (
      <path d="M11 11 L15 15 M15 11 L11 15" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
    )}
  </svg>
);

// Mirror Horizontal (Left/Right)
export const IconMirrorHorizontal: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="2 1" />
    <path d="M6.5 4 L3 8 L6.5 12 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
    <path d="M9.5 4 L13 8 L9.5 12 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.2" />
  </svg>
);

// Mirror Vertical (Top/Bottom)
export const IconMirrorVertical: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="2 1" />
    <path d="M4 6.5 L8 3 L12 6.5 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
    <path d="M4 9.5 L8 13 L12 9.5 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.2" />
  </svg>
);

// Corner styles for NuraDraw rectangle
export const IconCornerRound: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13 L3 8 C3 5.2 5.2 3 8 3 L13 3" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconCornerScallop: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13 L3 8 C5.8 8 8 5.8 8 3 L13 3" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconCornerChamfer: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 13 L3 8 L8 3 L13 3" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="miter" />
  </svg>
);

// Pen Nib outline icon
export const IconPenNib: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="currentColor">
    <path d="M8 1 L11.5 5.5 L10 8 L11 14 L8 13 L5 14 L6 8 L4.5 5.5 Z" stroke="#1e293b" strokeWidth="0.8" />
    <circle cx="8" cy="6.5" r="1" fill="#ffffff" />
    <line x1="8" y1="1" x2="8" y2="5.5" stroke="#ffffff" strokeWidth="0.8" />
  </svg>
);

// NuraDraw PowerClip Icon
export const IconPowerClip: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="#0072bc" strokeWidth="1.2" fill="#e0f2fe" strokeDasharray="3 1.5" />
    <circle cx="8" cy="8" r="3.2" fill="#0284c7" stroke="#0369a1" strokeWidth="0.8" />
    <path d="M1.5 1.5 L5.5 5.5 M5.5 2.5 L5.5 5.5 L2.5 5.5" stroke="#e11d48" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// New from Template
export const IconTemplateNew: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="3" width="9" height="11" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <line x1="2" y1="6" x2="11" y2="6" stroke="#374151" strokeWidth="1" />
    <line x1="6" y1="6" x2="6" y2="14" stroke="#9ca3af" strokeWidth="0.9" />
    <circle cx="12" cy="4" r="2.6" fill="#22c55e" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M12 2.6V5.4M10.6 4H13.4" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

// Close Window / Document
export const IconCloseDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="3" width="11" height="10" rx="0.8" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <line x1="2" y1="5.5" x2="13" y2="5.5" stroke="#64748b" strokeWidth="0.9" />
    <path d="M10.5 1.5 L14.5 5.5 M14.5 1.5 L10.5 5.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Close All Windows / Documents
export const IconCloseAllDocs: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4.5" y="2" width="8.5" height="8" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
    <rect x="2" y="5" width="9" height="8.5" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <line x1="2" y1="7.3" x2="11" y2="7.3" stroke="#64748b" strokeWidth="0.9" />
    <path d="M10.5 1.5 L14.5 5.5 M14.5 1.5 L10.5 5.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Save As (Floppy with green +)
export const IconSaveAsPlus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 3 L10 3 L12 5 L12 14 L2 14 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
    <rect x="4" y="3" width="5" height="3.5" fill="#ffffff" />
    <rect x="4" y="8.5" width="6" height="4.5" fill="#f1f5f9" />
    <circle cx="12.2" cy="4.2" r="2.7" fill="#22c55e" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M12.2 2.8V5.6M10.8 4.2H13.6" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

// Save as Template
export const IconSaveTemplate: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="4.5" y="2" width="9" height="10" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <line x1="4.5" y1="4.8" x2="13.5" y2="4.8" stroke="#64748b" strokeWidth="0.9" />
    <path d="M2 7 L7.5 7 L9 8.5 L9 14.5 L2 14.5 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.9" />
    <rect x="3.5" y="10.5" width="4" height="3.2" fill="#f8fafc" />
  </svg>
);

// Revert Document
export const IconRevertDoc: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 5 L9.5 5 L11.5 7 L11.5 14 L2.5 14 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
    <rect x="4.5" y="9" width="5" height="4" fill="#f8fafc" />
    <path d="M11.5 3.5 C13.5 3.5 14.5 5 14 7" stroke="#64748b" strokeWidth="1.2" strokeDasharray="1.5 1.2" strokeLinecap="round" />
    <path d="M10.5 3.5 L12.5 2 L12.5 5 Z" fill="#64748b" />
  </svg>
);

// Print Preview
export const IconPrintPreview: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 1.5 H9.5 L12.5 4.5 V13.5 H3 Z" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <path d="M9.5 1.5 V4.5 H12.5" stroke="#374151" strokeWidth="1" />
    <circle cx="9.5" cy="9.5" r="2.8" fill="#e0f2fe" stroke="#1e293b" strokeWidth="1.2" />
    <line x1="11.6" y1="11.6" x2="14.2" y2="14.2" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Document Properties
export const IconDocProperties: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 1.5 H9 L11.5 4 V14 H2.5 Z" fill="#ffffff" stroke="#374151" strokeWidth="1.1" />
    <path d="M5 6 H9 M5 8.5 H8.5 M5 11 H7.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
    <line x1="10" y1="7" x2="14.5" y2="7" stroke="#1e293b" strokeWidth="1.2" />
    <line x1="10" y1="10" x2="14.5" y2="10" stroke="#1e293b" strokeWidth="1.2" />
    <line x1="10" y1="13" x2="14.5" y2="13" stroke="#1e293b" strokeWidth="1.2" />
  </svg>
);

// Exit / Power
export const IconPowerExit: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M5.2 4.2 A4.8 4.8 0 1 0 10.8 4.2" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="8" y1="1.8" x2="8" y2="7.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Edit Menu Icons (Matching NuraDraw edit_tab_c6f39bd0.jpg)

// Undo curved counter-clockwise arrow
export const IconUndoMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M5.5 4.5 H9.5 A4 4 0 1 1 5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M6.2 2 L3.2 4.5 L6.2 7 Z" fill="currentColor" />
  </svg>
);

// Redo curved clockwise arrow
export const IconRedoMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M10.5 4.5 H6.5 A4 4 0 1 0 11 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9.8 2 L12.8 4.5 L9.8 7 Z" fill="currentColor" />
  </svg>
);

// Repeat clockwise loop with double chevron
export const IconRepeatMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M8.5 3.5 A4.5 4.5 0 1 1 3.8 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 1.2" />
    <path d="M4.2 3.5 H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M7.5 1.5 L10.3 3.5 L7.5 5.5 Z" fill="currentColor" />
  </svg>
);

// Bring into Focus (dashed frame + arrow pointer)
export const IconBringIntoFocus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="6.5" width="7" height="7" stroke="#1e293b" strokeWidth="1.1" strokeDasharray="2 1.2" />
    <rect x="4.5" y="8.5" width="3" height="3" fill="#475569" />
    <rect x="1.5" y="5.5" width="2" height="2" fill="#1e293b" />
    <rect x="8.5" y="12.5" width="2" height="2" fill="#1e293b" />
    <path d="M13.5 2 L9.5 6 M9.5 3 V6 H12.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Exit Focus Mode (dashed frame + check)
export const IconExitFocusMode: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="6.5" width="7" height="7" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 1.2" />
    <rect x="4.5" y="8.5" width="3" height="3" stroke="currentColor" strokeWidth="0.9" />
    <path d="M9 5.5 L10.8 7.3 L14.2 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Copy Properties From...
export const IconCopyProperties: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2" width="6.5" height="7.5" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <rect x="7.5" y="6.5" width="6.5" height="7.5" fill="#e2e8f0" stroke="#334155" strokeWidth="1" />
    <path d="M4 5.5 L6.5 4 L5.5 7 Z" fill="#0284c7" />
    <circle cx="11" cy="10.2" r="1.4" fill="#334155" />
  </svg>
);

// Paste in View (Clipboard + centered view arrows)
export const IconPasteInView: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2.5" width="8.5" height="10.5" rx="1" fill="#334155" />
    <rect x="4.2" y="1.2" width="4" height="2" rx="0.5" fill="#64748b" />
    <rect x="5.5" y="5.5" width="8.5" height="9" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />
    <path d="M9.75 7.2 V12.8 M7 10 H12.5" stroke="#0284c7" strokeWidth="1.1" />
    <circle cx="9.75" cy="10" r="1.1" fill="#0284c7" />
  </svg>
);

// Paste Special... (Clipboard + node box)
export const IconPasteSpecial: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2.5" width="8.5" height="10.5" rx="1" fill="#334155" />
    <rect x="4.2" y="1.2" width="4" height="2" rx="0.5" fill="#64748b" />
    <rect x="6" y="6.5" width="8" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />
    <rect x="5.2" y="5.7" width="1.8" height="1.8" fill="#1e293b" />
    <rect x="13" y="5.7" width="1.8" height="1.8" fill="#1e293b" />
    <rect x="5.2" y="13.5" width="1.8" height="1.8" fill="#1e293b" />
    <rect x="13" y="13.5" width="1.8" height="1.8" fill="#1e293b" />
  </svg>
);

// Delete Trash Can
export const IconTrashDelete: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 4 H13 M5.5 4 V2.5 H10.5 V4" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M4 4.5 L4.8 14 H11.2 L12 4.5 Z" fill="#334155" stroke="#1e293b" strokeWidth="1" />
    <line x1="6.5" y1="6.5" x2="6.8" y2="12" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    <line x1="8" y1="6.5" x2="8" y2="12" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    <line x1="9.5" y1="6.5" x2="9.2" y2="12" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Duplicate (two overlapping squares + bright green +)
export const IconDuplicatePlus: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="4.5" width="6.5" height="6.5" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
    <rect x="6.5" y="7.5" width="6.5" height="6.5" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
    <rect x="9" y="1.5" width="5.5" height="5.5" rx="0.8" fill="#22c55e" />
    <path d="M11.75 2.7 V5.8 M10.2 4.25 H13.3" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// Clone (dual silhouettes: solid left, outlined right)
export const IconCloneDual: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="4.5" cy="3.5" r="1.4" fill="#334155" />
    <path d="M2.2 6.5 H6.8 L5.3 13.5 H3.7 Z" fill="#334155" />
    <circle cx="11.5" cy="3.5" r="1.4" stroke="#334155" strokeWidth="1.1" fill="#ffffff" />
    <path d="M9.2 6.5 H13.8 L12.3 13.5 H10.7 Z" stroke="#334155" strokeWidth="1.1" fill="#ffffff" />
  </svg>
);

// View Menu Icons (Matching view tab screenshot)

// Preview Selected Only
export const IconPreviewSelected: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2.5" y="2.5" width="11" height="11" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 1.5" />
    <rect x="1.5" y="1.5" width="2.2" height="2.2" fill="currentColor" />
    <rect x="12.3" y="1.5" width="2.2" height="2.2" fill="currentColor" />
    <rect x="1.5" y="12.3" width="2.2" height="2.2" fill="currentColor" />
    <rect x="12.3" y="12.3" width="2.2" height="2.2" fill="currentColor" />
    <rect x="5" y="5" width="6" height="6" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// Zoom In (+)
export const IconZoomInMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6.8 4.6 V9 M4.6 6.8 H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Zoom Out (-)
export const IconZoomOutMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.6 6.8 H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Zoom To Fit
export const IconZoomToFitMenu: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle cx="6.8" cy="6.8" r="4.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.2" />
    <rect x="4.5" y="4.5" width="4.6" height="4.6" stroke="currentColor" strokeWidth="0.9" />
    <line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Layout Menu Icons (Matching layout_tab_457dd0e8.png)

// Insert Page... (document with lines + green + badge)
export const IconInsertPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9.5 L11.5 4 V14 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="4.2" y1="6" x2="8.8" y2="6" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="8.2" x2="9.8" y2="8.2" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="10.4" x2="9.8" y2="10.4" stroke="#64748b" strokeWidth="1" />
    <rect x="9.5" y="1" width="5.5" height="5.5" rx="0.8" fill="#16a34a" />
    <path d="M12.25 2.2 V5.3 M10.7 3.75 H13.8" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// Duplicate Page... (overlapping pages + green + badge)
export const IconDuplicatePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2.5" width="6.5" height="8.5" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="3.3" y1="5" x2="7.2" y2="5" stroke="#64748b" strokeWidth="0.9" />
    <line x1="3.3" y1="7" x2="7.2" y2="7" stroke="#64748b" strokeWidth="0.9" />
    <rect x="6" y="6" width="6.5" height="8.5" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="7.3" y1="8.5" x2="11.2" y2="8.5" stroke="#64748b" strokeWidth="0.9" />
    <line x1="7.3" y1="10.5" x2="11.2" y2="10.5" stroke="#64748b" strokeWidth="0.9" />
    <rect x="9.5" y="1" width="5.5" height="5.5" rx="0.8" fill="#16a34a" />
    <path d="M12.25 2.2 V5.3 M10.7 3.75 H13.8" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// Rename Page... (page + I-beam rename cursor)
export const IconRenamePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9.5 L11.5 4 V14 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="4.2" y1="6" x2="8.2" y2="6" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="8.5" x2="9.5" y2="8.5" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="11" x2="9.5" y2="11" stroke="#64748b" strokeWidth="1" />
    <path d="M10.5 2 H14.5 M10.5 7 H14.5 M12.5 2 V7" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Delete Page... (page + red minus circle)
export const IconDeletePage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9.5 L11.5 4 V14 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="4.2" y1="6" x2="8.5" y2="6" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="8.5" x2="9.8" y2="8.5" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="11" x2="9.8" y2="11" stroke="#64748b" strokeWidth="1" />
    <circle cx="12.2" cy="3.8" r="2.9" fill="#ef4444" />
    <line x1="10.8" y1="3.8" x2="13.6" y2="3.8" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// Go to Page... (page + diagonal pen/arrow)
export const IconGoToPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9.5 L11.5 4 V14 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="4.2" y1="6.5" x2="8.2" y2="6.5" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="9" x2="9.5" y2="9" stroke="#64748b" strokeWidth="1" />
    <line x1="4.2" y1="11.5" x2="9.5" y2="11.5" stroke="#64748b" strokeWidth="1" />
    <path d="M13.8 1.8 L9.2 6.4 L8.6 7.8 L10 7.2 L14.6 2.6 Z" fill="#334155" stroke="#1e293b" strokeWidth="0.6" />
  </svg>
);

// On Active Layer (orange top diamond layer + gray lower layers)
export const IconLayerActive: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M8 10.5 L13.5 13 L8 15 L2.5 13 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
    <path d="M8 6.5 L13.5 9 L8 11.2 L2.5 9 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="0.8" />
    <path d="M8 2 L14 4.8 L8 7.5 L2 4.8 Z" fill="#f97316" stroke="#c2410c" strokeWidth="0.9" />
  </svg>
);

// On All Pages (1-2-3 overlapping pages)
export const IconAllPages123: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="1.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="3.2" y="7.2" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">1</text>
    <rect x="4.8" y="4" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="6.5" y="9.8" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">2</text>
    <rect x="8.2" y="6.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="9.9" y="12.3" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">3</text>
  </svg>
);

// On All Odd Pages (1-3-5 overlapping pages)
export const IconOddPages135: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="1.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="3.2" y="7.2" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">1</text>
    <rect x="4.8" y="4" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="6.5" y="9.8" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">3</text>
    <rect x="8.2" y="6.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="9.9" y="12.3" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">5</text>
  </svg>
);

// On All Even Pages (2-4-6 overlapping pages)
export const IconEvenPages246: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="1.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="3.2" y="7.2" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">2</text>
    <rect x="4.8" y="4" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="6.5" y="9.8" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">4</text>
    <rect x="8.2" y="6.5" width="6.5" height="8" fill="#ffffff" stroke="#334155" strokeWidth="0.9" />
    <text x="9.9" y="12.3" fontSize="5.5" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">6</text>
  </svg>
);

// Small dark gear badge helper inside SVGs
const GearBadge = () => (
  <g transform="translate(9.5, 9.5)">
    <circle cx="3" cy="3" r="2.6" fill="#334155" />
    <circle cx="3" cy="3" r="1" fill="#ffffff" />
    <path d="M3 0 V0.8 M3 5.2 V6 M0 3 H0.8 M5.2 3 H6 M0.9 0.9 L1.5 1.5 M4.5 4.5 L5.1 5.1 M5.1 0.9 L4.5 1.5 M1.5 4.5 L0.9 5.1" stroke="#334155" strokeWidth="1" />
  </g>
);

// Page Number Settings... (page with # + gear)
export const IconPageNumberSettings: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9 L11.5 4.5 V13.5 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <text x="4" y="10.2" fontSize="7.2" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">#</text>
    <GearBadge />
  </svg>
);

// Switch Page Orientation (portrait + landscape swap arrow)
export const IconSwitchOrientation: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.8" y="2" width="4.5" height="6.2" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <rect x="8.2" y="9.2" width="6.2" height="4.5" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <path d="M8 4.2 C10.8 4.2 11.8 5.6 11.8 7.5" stroke="#1e293b" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M10.4 6.6 L11.8 8 L13.1 6.6" stroke="#1e293b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Document Options... (clean blank page with dog-ear corner)
export const IconDocOptions: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3 1.8 H10 L13 4.8 V14.2 H3 Z" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
    <path d="M10 1.8 V4.8 H13" stroke="#334155" strokeWidth="1" fill="#e2e8f0" />
  </svg>
);

// Page Size... (page with diagonal size arrows + gear)
export const IconPageSize: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9 L11.5 4.5 V13.5 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <path d="M4.2 10.5 L9.2 5.5 M6.8 5.5 H9.2 V7.9 M4.2 8.1 V10.5 H6.6" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    <GearBadge />
  </svg>
);

// Page Layout... (page with folded corner / grid lines + gear)
export const IconPageLayout: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9 L11.5 4.5 V13.5 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <rect x="4" y="4" width="3.5" height="7.5" stroke="#64748b" strokeWidth="0.8" fill="#f1f5f9" />
    <line x1="8.5" y1="5.5" x2="10" y2="5.5" stroke="#64748b" strokeWidth="0.9" />
    <line x1="8.5" y1="7.5" x2="10" y2="7.5" stroke="#64748b" strokeWidth="0.9" />
    <GearBadge />
  </svg>
);

// Page Background... (page with diagonal fill stripe + gear)
export const IconPageBackground: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2.5 2 H9 L11.5 4.5 V13.5 H2.5 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <path d="M3.5 12.2 L10.5 5.2 M3.5 9.2 L7.8 4.9 M5.8 12.5 L10.5 7.8" stroke="#64748b" strokeWidth="1" />
    <GearBadge />
  </svg>
);

// Border and Grommet... (overlapping border frame with corner/edge grommets)
export const IconBorderGrommet: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 2 H8.5 L10.5 4 V11.5 H2 Z" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <rect x="5" y="5.5" width="9" height="8.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.1" />
    <circle cx="6.8" cy="7.3" r="0.9" fill="#ffffff" stroke="#334155" strokeWidth="0.7" />
    <circle cx="12.2" cy="7.3" r="0.9" fill="#ffffff" stroke="#334155" strokeWidth="0.7" />
    <circle cx="6.8" cy="12.2" r="0.9" fill="#ffffff" stroke="#334155" strokeWidth="0.7" />
    <circle cx="12.2" cy="12.2" r="0.9" fill="#ffffff" stroke="#334155" strokeWidth="0.7" />
  </svg>
);

// Bitmap Menu Icons

// Convert to Bitmap... (vector rectangle converting to checkerboard/pixel bitmap)
export const IconConvertToBitmap: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="2" width="6.5" height="6.5" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <rect x="7.5" y="7" width="7" height="7" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
    <rect x="7.5" y="7" width="3.5" height="3.5" fill="#3b82f6" />
    <rect x="11" y="10.5" width="3.5" height="3.5" fill="#1e293b" />
    <path d="M9.5 3.2 H13 V6" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Straighten Image... (tilted image over aligned grid lines)
export const IconStraightenImage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#0284c7" strokeWidth="1" strokeDasharray="1.8 1.4" />
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0284c7" strokeWidth="1" strokeDasharray="1.8 1.4" />
    <rect
      x="3.5"
      y="4"
      width="9"
      height="8"
      transform="rotate(-10 8 8)"
      fill="#ffffff"
      fillOpacity="0.85"
      stroke="#1e293b"
      strokeWidth="1.1"
    />
    <path d="M5.5 10 L7.2 7.8 L8.8 9.4 L10.2 8.2 L11.5 10 Z" fill="#16a34a" opacity="0.7" />
  </svg>
);

// Image Adjustment Lab... (tonal color bars & lab sliders)
export const IconImageAdjustmentLab: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="2" width="13" height="12" rx="1" fill="#ffffff" stroke="#334155" strokeWidth="1" />
    <line x1="4.5" y1="4" x2="4.5" y2="12" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="4.5" cy="6.2" r="1.4" fill="#ef4444" />
    <line x1="8" y1="4" x2="8" y2="12" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="8" cy="9.8" r="1.4" fill="#22c55e" />
    <line x1="11.5" y1="4" x2="11.5" y2="12" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="11.5" cy="5.8" r="1.4" fill="#3b82f6" />
  </svg>
);

// CMYK Color Separation (4 plates: C, M, Y, K)
export const IconCmykSeparation: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="1.5" y="1.5" width="6" height="6" rx="0.8" fill="#00aeef" stroke="#0284c7" strokeWidth="0.7" />
    <rect x="8.5" y="1.5" width="6" height="6" rx="0.8" fill="#ec008c" stroke="#be185d" strokeWidth="0.7" />
    <rect x="1.5" y="8.5" width="6" height="6" rx="0.8" fill="#fff200" stroke="#ca8a04" strokeWidth="0.7" />
    <rect x="8.5" y="8.5" width="6" height="6" rx="0.8" fill="#1e293b" stroke="#0f172a" strokeWidth="0.7" />
  </svg>
);

// Text Menu Icons (Matches text_tab_ea200fa1.jpg)

export const IconTextTabs: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 3.5 H6 M4.5 2 L6.5 3.5 L4.5 5" stroke="#475569" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="2" y1="7" x2="14" y2="7" stroke="#64748b" strokeWidth="1" />
    <line x1="5" y1="9.5" x2="14" y2="9.5" stroke="#64748b" strokeWidth="1" />
    <line x1="5" y1="12" x2="14" y2="12" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const IconTextColumns: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M2 3.5 H7 M2 6 H7 M2 8.5 H7 M2 11 H7 M2 13.5 H7" stroke="#64748b" strokeWidth="1" />
    <path d="M9 3.5 H14 M9 6 H14 M9 8.5 H14 M9 11 H14 M9 13.5 H14" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const IconBulletsNumbering: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="1.5" y="6" fontSize="5" fill="#475569" fontFamily="sans-serif">1</text>
    <line x1="6" y1="4.5" x2="14" y2="4.5" stroke="#64748b" strokeWidth="1" />
    <circle cx="3" cy="8.5" r="0.9" fill="#475569" />
    <line x1="6" y1="8.5" x2="14" y2="8.5" stroke="#64748b" strokeWidth="1" />
    <circle cx="3" cy="12.5" r="0.9" fill="#475569" />
    <line x1="6" y1="12.5" x2="14" y2="12.5" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const IconDropCap: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="1.5" y="9" fontSize="8" fontWeight="600" fill="#475569" fontFamily="serif">A</text>
    <line x1="8.5" y1="3.5" x2="14" y2="3.5" stroke="#64748b" strokeWidth="1" />
    <line x1="8.5" y1="6" x2="14" y2="6" stroke="#64748b" strokeWidth="1" />
    <line x1="8.5" y1="8.5" x2="14" y2="8.5" stroke="#64748b" strokeWidth="1" />
    <line x1="2" y1="11.5" x2="14" y2="11.5" stroke="#64748b" strokeWidth="1" />
    <line x1="2" y1="14" x2="14" y2="14" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const IconTextStatistics: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="2.2" y="8" fontSize="7.2" fill="#1e293b" fontFamily="sans-serif">ab</text>
    <rect x="2" y="12" width="1.6" height="2" fill="#1e293b" />
    <rect x="5" y="10.2" width="1.6" height="3.8" fill="#1e293b" />
    <rect x="8" y="11.4" width="1.6" height="2.6" fill="#1e293b" />
    <rect x="11" y="9.8" width="1.6" height="4.2" fill="#1e293b" />
  </svg>
);

export const IconEditText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="2" y="10.5" fontSize="7.5" fill="#1e293b" fontFamily="sans-serif">ab</text>
    <line x1="12" y1="3" x2="12" y2="13" stroke="#1e293b" strokeWidth="1.2" />
    <path d="M10.5 3 H13.5 M10.5 13 H13.5" stroke="#1e293b" strokeWidth="1" />
  </svg>
);

export const IconConvertParagraphText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="2.5" width="7" height="7" stroke="#475569" strokeWidth="0.9" strokeDasharray="1.5 1" />
    <path d="M3.5 4.5 H7.5 M3.5 6.5 H7.5 M3.5 8.5 H6" stroke="#334155" strokeWidth="0.9" />
    <text x="8.5" y="14" fontSize="7.5" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">A</text>
    <path d="M10.5 3.5 C12.5 3.5 13 5 13 6.8" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const IconFitTextToPath: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="2" y1="13" x2="13" y2="3" stroke="#1e293b" strokeWidth="1.1" />
    <rect x="1.5" y="11.5" width="2.2" height="2.2" fill="#ffffff" stroke="#1e293b" strokeWidth="0.9" />
    <rect x="11.5" y="2" width="2.2" height="2.2" fill="#ffffff" stroke="#1e293b" strokeWidth="0.9" />
    <text x="3.5" y="8" fontSize="6.5" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">A</text>
  </svg>
);

export const IconStraightenText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3.5 5.5 C5 2.5 11 2.5 12.5 5.5" stroke="#475569" strokeWidth="1" fill="none" />
    <path d="M11 5.2 L12.8 5.8 L13 4" stroke="#475569" strokeWidth="0.9" strokeLinecap="round" />
    <text x="2.2" y="12" fontSize="6.5" fill="#1e293b" fontFamily="sans-serif">a</text>
    <text x="9.5" y="12" fontSize="6.5" fill="#1e293b" fontFamily="sans-serif">a</text>
  </svg>
);

export const IconAlignToBaseline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="2" y="11.5" fontSize="8.5" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">Aa</text>
    <line x1="1.5" y1="13" x2="14.5" y2="13" stroke="#0284c7" strokeWidth="1.2" />
  </svg>
);

export const IconChangeCase: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M3.5 5.5 C5.5 2.5 10.5 2.5 12.5 5.5" stroke="#475569" strokeWidth="1" fill="none" />
    <path d="M11 5.2 L12.8 5.8 L13 4" stroke="#475569" strokeWidth="0.9" strokeLinecap="round" />
    <text x="2" y="12.5" fontSize="6.5" fill="#1e293b" fontFamily="sans-serif">a</text>
    <text x="8.5" y="12.5" fontSize="7.2" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">A</text>
  </svg>
);

export const IconEncodeText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <text x="1.5" y="13" fontSize="7.2" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">A</text>
    <text x="6" y="7.5" fontSize="5.8" fontWeight="700" fill="#334155" fontFamily="monospace">&lt;/&gt;</text>
  </svg>
);

// Nudge Distance 4-way diamond/square icon (matching NuraDraw image_205e352e.png)
export const IconNudgeDistance: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="6" y="6" width="4" height="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
    {/* Top triangle */}
    <path d="M8 1.2 L10.3 4.2 L5.7 4.2 Z" fill="#1e293b" />
    {/* Bottom triangle */}
    <path d="M8 14.8 L10.3 11.8 L5.7 11.8 Z" fill="#1e293b" />
    {/* Left triangle */}
    <path d="M1.2 8 L4.2 5.7 L4.2 10.3 Z" fill="#1e293b" />
    {/* Right triangle */}
    <path d="M14.8 8 L11.8 5.7 L11.8 10.3 Z" fill="#1e293b" />
  </svg>
);

// Autofit Page icon (matching NuraDraw image_387e6bbe.png)
export const IconAutofitPage: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    {/* Page rectangle with slight top-left corner dog-ear */}
    <path d="M5.2 3.5 L12.5 3.5 L12.5 12.5 L3.5 12.5 L3.5 5.2 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Center solid circle dot */}
    <circle cx="8" cy="8" r="1.9" fill="#1e293b" />
    {/* Top-right diagonal arrow */}
    <path d="M12.5 3.5 L15 1 M12.8 1 L15 1 L15 3.2" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Bottom-left diagonal arrow */}
    <path d="M3.5 12.5 L1 15 M3.2 15 L1 15 L1 12.8" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Symmetry Tool Icons (Create, Edit, Finish, Remove, Break Link)
export const IconSymmetryCreate: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078d7" strokeWidth="1.2" strokeDasharray="2 1.2" />
    <path d="M6.2 4.5 L2.5 8 L6.2 11.5 Z" fill="#0078d7" stroke="#0369a1" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M9.8 4.5 L13.5 8 L9.8 11.5 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.9" strokeLinejoin="round" />
    <circle cx="12.5" cy="3.5" r="2.5" fill="#16a34a" />
    <path d="M12.5 2.2V4.8M11.2 3.5H13.8" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const IconSymmetryEdit: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078d7" strokeWidth="1.2" strokeDasharray="2 1.2" />
    <path d="M6.2 4.5 L2.5 8 L6.2 11.5 Z" fill="#0078d7" stroke="#0369a1" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M9.8 4.5 L13.5 8 L9.8 11.5 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M10.5 13.5 L14 10 L15 11 L11.5 14.5 L10 14.8 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="0.7" />
  </svg>
);

export const IconSymmetryFinish: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#0078d7" strokeWidth="1.2" strokeDasharray="2 1.2" />
    <path d="M6.2 4.5 L2.5 8 L6.2 11.5 Z" fill="#0078d7" stroke="#0369a1" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M9.8 4.5 L13.5 8 L9.8 11.5 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.9" strokeLinejoin="round" />
    <circle cx="12.5" cy="12.5" r="2.7" fill="#16a34a" />
    <path d="M11.2 12.5 L12.2 13.5 L14 11.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconSymmetryRemove: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 1.2" />
    <path d="M6.2 4.5 L2.5 8 L6.2 11.5 Z" fill="#334155" stroke="#1e293b" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M9.8 4.5 L13.5 8 L9.8 11.5 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="1.5 1" strokeLinejoin="round" />
    <path d="M10.5 10.5 L14.5 14.5 M14.5 10.5 L10.5 14.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconSymmetryBreak: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path d="M5.5 4.5 L2 8 L5.5 11.5 Z" fill="#0078d7" stroke="#0369a1" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M10.5 4.5 L14 8 L10.5 11.5 Z" fill="#0078d7" stroke="#0369a1" strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M7.5 2 L8.5 5.5 L7 8 L8.5 10.5 L7.5 14" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

