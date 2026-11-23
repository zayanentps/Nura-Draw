import React from 'react';

// =============================================================================
// NuraDraw Windows 10 OS Fluent / Shell Icon Set (24x24 Toolbox)
// Crisp Windows 10 flat-layered colors, 1px geometric precision & Fluent accents
// =============================================================================

export const IconPick: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Classic Windows 10 Pointer Cursor: crisp white fill with clean dark/adaptive outline */}
    <path
      d="M5.5 3L18.5 11.5L12.3 13.2L15.4 19.2L13 20.5L9.9 14.5L5.5 18.2V3Z"
      fill="#ffffff"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="miter"
    />
    <path d="M7.2 6.2L14.5 11L10.5 12.1L7.2 14.8V6.2Z" fill="#0078D4" fillOpacity="0.18" />
  </svg>
);

export const IconFreehandPick: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M11 4C6.8 4 3.5 6.8 3.5 10.2C3.5 13.4 6.5 15 9 15"
      stroke="#0078D4"
      strokeWidth="1.6"
      strokeDasharray="2.5 2"
      strokeLinecap="square"
    />
    <path
      d="M9.5 6.5L19.5 12.8L14.6 14.2L17 19L15 20L12.6 15.2L9.5 18V6.5Z"
      fill="#ffffff"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconShape: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4 19C5.5 11.5 10.5 6.5 19 5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    <rect x="6.2" y="9.5" width="4.6" height="4.6" rx="0.5" fill="#50E6FF" stroke="#0078D4" strokeWidth="1.4" />
    <rect x="17" y="3" width="4" height="4" rx="0.5" fill="#ffffff" stroke="#0078D4" strokeWidth="1.3" />
    <path d="M12.5 13.5L20 16.5L16.5 17.8L15.2 21L12.5 13.5Z" fill="#0078D4" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

export const IconSmooth: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M3.5 16.5C6.5 6.5 11.5 17.5 15 8.5C16.5 5 19 5.5 20.5 7.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    <circle cx="9.5" cy="12" r="5" fill="#50E6FF" fillOpacity="0.3" stroke="#0078D4" strokeWidth="1.5" />
    <circle cx="9.5" cy="12" r="1.6" fill="#0078D4" />
  </svg>
);

export const IconCrop: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="7" y="7" width="10" height="10" fill="#50E6FF" fillOpacity="0.22" />
    <path d="M7 3V17H21" stroke="currentColor" strokeWidth="1.85" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M3 7H17V21" stroke="#0078D4" strokeWidth="1.85" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const IconKnife: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 7L17.5 3.5L19.5 6.5L14 10Z" fill="#E1DFDD" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
    <path d="M4.5 18.5L12 10L14.5 12.5L7 20.5L4.5 18.5Z" fill="#0078D4" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
    <line x1="3.5" y1="21" x2="20.5" y2="21" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 2" opacity="0.7" />
  </svg>
);

export const IconVirtualSegmentDelete: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.5 20V8.5L11.5 5V20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter" />
    <line x1="8" y1="6.8" x2="8" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <line x1="4.5" y1="12.5" x2="11.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="17.5" cy="7" r="4.5" fill="#E81123" />
    <line x1="15.2" y1="7" x2="19.8" y2="7" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="square" />
  </svg>
);

export const IconEraser: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Windows 10 Paint classic two-tone pink & blue beveled eraser */}
    <path d="M14.2 4.2L19.8 9.8L15.2 14.4L9.6 8.8L14.2 4.2Z" fill="#0078D4" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
    <path d="M9.6 8.8L15.2 14.4L10.6 19H5.6L3.8 17.2L9.6 8.8Z" fill="#F28B82" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
    <line x1="10.5" y1="19.5" x2="20.5" y2="19.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
  </svg>
);

export const IconZoom: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Windows 10 Fluent Magnifier */}
    <circle cx="10.2" cy="10.2" r="6.2" fill="#50E6FF" fillOpacity="0.35" stroke="#0078D4" strokeWidth="1.8" />
    <path d="M15 15L20.8 20.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M10.2 7.5V12.9M7.5 10.2H12.9" stroke="#005A9E" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

export const IconPanHand: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M18 11.5V6.5C18 5.7 17.3 5 16.5 5C15.7 5 15 5.7 15 6.5V10.5M15 10.5V4.5C15 3.7 14.3 3 13.5 3C12.7 3 12 3.7 12 4.5V10.5M12 10.5V5.5C12 4.7 11.3 4 10.5 4C9.7 4 9 4.7 9 5.5V12.5L6.8 10.6C6.1 10 5.1 10.1 4.5 10.8C4 11.4 4.1 12.4 4.7 13L9.3 18.2C10.3 19.3 11.7 20 13.3 20H14.5C16.7 20 18.5 18.2 18.5 16V11.5H18Z"
      fill="#ffffff"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconFreehand: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5.5 3V9M2.5 6H8.5" stroke="#0078D4" strokeWidth="1.8" strokeLinecap="square" />
    <path
      d="M5.5 11.5V16.8C5.5 19 8 19 8.5 16.2C9 13.5 11.5 13.5 12 16.5C12.5 19.2 15 19.2 15.5 16.5C16 14.5 18.2 14.5 18.8 17H21"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconLine2P: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="1.75" />
    <rect x="3.5" y="16.5" width="4" height="4" fill="#50E6FF" stroke="#0078D4" strokeWidth="1.4" />
    <rect x="16.5" y="3.5" width="4" height="4" fill="#50E6FF" stroke="#0078D4" strokeWidth="1.4" />
  </svg>
);

export const IconBezier: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5 18.5C5 10.5 19 13.5 19 5.5" stroke="currentColor" strokeWidth="1.75" />
    <line x1="5" y1="6.5" x2="19" y2="17.5" stroke="#0078D4" strokeWidth="1.3" />
    <rect x="3.5" y="5" width="3" height="3" fill="#0078D4" />
    <rect x="17.5" y="16" width="3" height="3" fill="#0078D4" />
    <rect x="10" y="10" width="4" height="4" fill="#ffffff" stroke="#0078D4" strokeWidth="1.5" />
  </svg>
);

export const IconPen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 3L17.5 12.5L15 17H9L6.5 12.5L12 3Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="miter" />
    <line x1="12" y1="3" x2="12" y2="11" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="1.4" fill="#0078D4" />
    <rect x="8.5" y="17" width="7" height="3.5" fill="#0078D4" stroke="currentColor" strokeWidth="1.35" />
  </svg>
);

export const IconBSpline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polyline points="5.5,6.5 5.5,18.5 17.5,18.5" stroke="#0078D4" strokeWidth="1.3" strokeDasharray="2 2" />
    <path d="M5.5 6.5C6.2 14.8 9.2 18 17.5 18.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3.5" y="4.5" width="4" height="4" fill="#ffffff" stroke="#0078D4" strokeWidth="1.4" />
    <rect x="16" y="16.5" width="4" height="4" fill="#ffffff" stroke="#0078D4" strokeWidth="1.4" />
  </svg>
);

export const IconPolyline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polyline points="4.5,17.5 9.5,7.5 14.5,14.5 19.5,5.5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="miter" />
    <rect x="3" y="16" width="3.2" height="3.2" fill="#0078D4" />
    <rect x="8" y="6" width="3.2" height="3.2" fill="#ffffff" stroke="#0078D4" strokeWidth="1.3" />
    <rect x="13" y="13" width="3.2" height="3.2" fill="#ffffff" stroke="#0078D4" strokeWidth="1.3" />
    <rect x="18" y="4" width="3.2" height="3.2" fill="#0078D4" />
  </svg>
);

export const IconCurve3P: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5 17.5C8 7 16 7 19 17.5" stroke="currentColor" strokeWidth="1.8" />
    <polyline points="5,17.5 12,6 19,17.5" stroke="#0078D4" strokeWidth="1.25" strokeDasharray="2 2" />
    <rect x="10.2" y="4" width="3.6" height="3.6" fill="#0078D4" />
    <rect x="3.2" y="15.7" width="3.6" height="3.6" fill="#ffffff" stroke="#0078D4" strokeWidth="1.35" />
    <rect x="17.2" y="15.7" width="3.6" height="3.6" fill="#ffffff" stroke="#0078D4" strokeWidth="1.35" />
  </svg>
);

export const IconArtisticMedia: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M17.5 3.5L21 7L13 15L9.5 11.5L17.5 3.5Z" fill="#0078D4" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
    <path d="M9.5 11.5C6.5 11.5 4.5 13.8 4.5 16.5C4.5 18 3.2 19 2.5 19.5C4.8 20.8 8 21 10.2 18.5C11.5 17 12 15.8 13 15" fill="#FFB900" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
  </svg>
);

export const IconRectangle: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="4" y="5" width="16" height="14" rx="0.8" fill="#50E6FF" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const IconEllipse: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="8" fill="#50E6FF" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const IconEllipse3P: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <ellipse cx="12" cy="12" rx="8.5" ry="5.2" transform="rotate(-30 12 12)" fill="#50E6FF" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.65" />
    <rect x="3.6" y="14.2" width="3" height="3" fill="#0078D4" />
    <rect x="17.4" y="6.8" width="3" height="3" fill="#0078D4" />
    <rect x="7.8" y="6" width="3" height="3" fill="#0078D4" />
  </svg>
);

export const IconPolygon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polygon points="12,3.5 19.5,7.8 19.5,16.2 12,20.5 4.5,16.2 4.5,7.8" fill="#50E6FF" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="miter" />
  </svg>
);

export const IconStar: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polygon
      points="12,3 14.7,8.6 20.8,9.5 16.4,13.8 17.4,19.9 12,17 6.6,19.9 7.6,13.8 3.2,9.5 9.3,8.6"
      fill="#FFC83D"
      stroke="#C28200"
      strokeWidth="1.4"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconSpiral: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M12 12C12 10.9 13 10 14 10C15.7 10 17 11.3 17 13C17 15.8 14.8 18 12 18C8.1 18 5 14.9 5 11C5 6.6 8.6 3 13 3C18 3 21 6.8 21 11.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
    />
    <rect x="11" y="11" width="2.2" height="2.2" fill="#0078D4" />
  </svg>
);

export const IconText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.6 3.5H11.4L4.2 20.5H7.2L8.7 16.7H15.3L16.8 20.5H19.8L12.6 3.5ZM9.6 14.2L12 8.2L14.4 14.2H9.6Z" />
  </svg>
);

export const IconParagraphText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="3.5" y="4" width="17" height="16" rx="0.8" fill="#ffffff" fillOpacity="0.85" stroke="#0078D4" strokeWidth="1.4" strokeDasharray="2.5 2" />
    <path d="M7.5 8.5H16.5M12 8.5V16M7 12.5H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    <path d="M14.5 13H17.5M14.5 16H17.5" stroke="#0078D4" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

export const IconTable: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="3.5" y="4.5" width="17" height="15" rx="0.8" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3.5" y="4.5" width="17" height="4.5" fill="#0078D4" />
    <path d="M3.5 9H20.5M3.5 14H20.5M9.5 4.5V19.5M15 4.5V19.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const IconDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <line x1="5.5" y1="18.5" x2="18.5" y2="5.5" stroke="currentColor" strokeWidth="1.7" />
    <line x1="3" y1="16" x2="8" y2="21" stroke="#0078D4" strokeWidth="1.8" strokeLinecap="square" />
    <line x1="16" y1="3" x2="21" y2="8" stroke="#0078D4" strokeWidth="1.8" strokeLinecap="square" />
    <polygon points="18.5,5.5 14.5,6.2 17.8,9.5" fill="#0078D4" />
    <polygon points="5.5,18.5 9.5,17.8 6.2,14.5" fill="#0078D4" />
  </svg>
);

export const IconHVDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5 4V16M3 4H7M3 16H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    <path d="M8.5 19.5H20.5M8.5 17.5V21.5M20.5 17.5V21.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    <rect x="9.5" y="4.5" width="10" height="10" rx="0.8" fill="#50E6FF" fillOpacity="0.25" stroke="#0078D4" strokeWidth="1.4" />
  </svg>
);

export const IconAngularDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.5 4V19.5H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
    <path d="M5 8A11 11 0 0 1 16 19" stroke="#0078D4" strokeWidth="1.6" />
    <polygon points="5,8 8.2,7.5 7,10.5" fill="#0078D4" />
    <polygon points="16,19 13.5,16.8 16.5,15.6" fill="#0078D4" />
  </svg>
);

export const IconSegmentDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polyline points="4,4 8,4 8,10.5 11.5,10.5 11.5,19.5 4,19.5" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="miter" />
    <path d="M15 10.5H20.5M15 19.5H20.5M17.8 10.5V19.5" stroke="#0078D4" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

export const IconCallout: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polyline points="20,7.5 12.5,7.5 5.5,18" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="miter" />
    <polygon points="4,20 5,14.5 9.2,17.5" fill="#0078D4" />
    <rect x="13" y="4.5" width="7" height="5.5" fill="#50E6FF" fillOpacity="0.3" stroke="#0078D4" strokeWidth="1.3" />
  </svg>
);

export const IconConnector: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polyline points="6.5,6.5 12,6.5 12,17.5 17.5,17.5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="miter" />
    <rect x="3.5" y="4" width="5.5" height="5.5" fill="#FFB900" stroke="currentColor" strokeWidth="1.35" />
    <rect x="15" y="14.5" width="5.5" height="5.5" fill="#FFB900" stroke="currentColor" strokeWidth="1.35" />
  </svg>
);

export const IconShadow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="8.5" y="8.5" width="11.5" height="11.5" fill="#605E5C" fillOpacity="0.55" stroke="#605E5C" strokeWidth="1.2" />
    <rect x="4" y="4" width="11.5" height="11.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconContour: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="3.5" y="3.5" width="17" height="17" fill="#50E6FF" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7" y="7" width="10" height="10" fill="#ffffff" stroke="#0078D4" strokeWidth="1.5" />
    <rect x="10.2" y="10.2" width="3.6" height="3.6" fill="#0078D4" />
  </svg>
);

export const IconBlend: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="6.2" cy="6.2" r="2.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="10.2" cy="10.2" r="3.8" fill="#50E6FF" fillOpacity="0.4" stroke="#0078D4" strokeWidth="1.4" />
    <circle cx="15.5" cy="15.5" r="5" fill="#0078D4" fillOpacity="0.75" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const IconDistort: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M4.5 4.5L9.5 6.8L15.5 3.8L14.5 9.5L20 11.5L17 16L19.5 20L12.5 18.2L8.5 20.5L7.5 15L3.8 12L7.5 9L4.5 4.5Z"
      fill="#8661C5"
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinejoin="miter"
    />
  </svg>
);

export const IconEnvelope: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M4.5 5.5Q12 8.5 19.5 5.5Q16.5 12 19.5 18.5Q12 15.5 4.5 18.5Q7.5 12 4.5 5.5Z"
      fill="#50E6FF"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinejoin="miter"
    />
    <rect x="10.5" y="5.5" width="3" height="3" fill="#0078D4" />
    <rect x="10.5" y="15.5" width="3" height="3" fill="#0078D4" />
    <rect x="4.5" y="10.5" width="3" height="3" fill="#0078D4" />
    <rect x="16.5" y="10.5" width="3" height="3" fill="#0078D4" />
  </svg>
);

export const IconExtrude: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polygon points="12,3.5 19.5,7.8 12,12 4.5,7.8" fill="#50E6FF" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
    <polygon points="4.5,7.8 12,12 12,20.5 4.5,16.2" fill="#0078D4" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
    <polygon points="12,12 19.5,7.8 19.5,16.2 12,20.5" fill="#0078D4" fillOpacity="0.7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
  </svg>
);

export const IconBlockShadow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M11 4.5L19.5 13A4.5 4.5 0 0 1 13 19.5L4.5 11Z" fill="#605E5C" stroke="currentColor" strokeWidth="1.35" />
    <circle cx="8" cy="8" r="4.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.55" />
  </svg>
);

export const IconTransparency: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect x="4" y="4" width="16" height="16" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
    <rect x="4" y="4" width="4" height="4" fill="#323130" />
    <rect x="12" y="4" width="4" height="4" fill="#323130" />
    <rect x="8" y="8" width="4" height="4" fill="#605E5C" />
    <rect x="16" y="8" width="4" height="4" fill="#605E5C" />
    <rect x="4" y="12" width="4" height="4" fill="#8A8886" />
    <rect x="12" y="12" width="4" height="4" fill="#8A8886" />
    <rect x="8" y="16" width="4" height="4" fill="#C8C6C4" />
    <rect x="16" y="16" width="4" height="4" fill="#C8C6C4" />
  </svg>
);

export const IconEyedropper: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M16.5 3.5L20.5 7.5L17.5 10.5L13.5 6.5L16.5 3.5Z" fill="#323130" stroke="currentColor" strokeWidth="1.3" />
    <path d="M14.2 7.2L16.8 9.8L8.2 18.4L4.5 19.5L5.6 15.8L14.2 7.2Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="miter" />
    <path d="M9.8 14L12.6 16.8L7.2 18.6L5.4 16.8L9.8 14Z" fill="#0078D4" />
    <line x1="4.5" y1="19.5" x2="2.5" y2="21.5" stroke="#0078D4" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconInteractiveFill: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <polygon points="12,3 20,11 12,19 4,11" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter" />
    <polygon points="4.8,11 12,18.2 19.2,11" fill="#0078D4" />
    <polygon points="21,15.5 21,21 15.5,21" fill="#E81123" />
  </svg>
);

export const IconSmartFill: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="9.2" cy="12" r="5.5" fill="#ffffff" fillOpacity="0.6" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14.8" cy="12" r="5.5" fill="#ffffff" fillOpacity="0.6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7.3C13.6 8.4 14.5 10.1 14.5 12C14.5 13.9 13.6 15.6 12 16.7C10.4 15.6 9.5 13.9 9.5 12C9.5 10.1 10.4 8.4 12 7.3Z" fill="#0078D4" />
    <polygon points="18.5,2.5 19.2,4.8 21.5,5.5 19.2,6.2 18.5,8.5 17.8,6.2 15.5,5.5 17.8,4.8" fill="#FFB900" />
  </svg>
);

export const IconGear: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Classic Windows 10 Settings Cogwheel */}
    <path
      d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94Z"
      fill="#8A8886"
      fillOpacity="0.28"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="miter"
    />
    <circle cx="12" cy="12" r="3.4" fill="#ffffff" stroke="#0078D4" strokeWidth="1.5" />
  </svg>
);
