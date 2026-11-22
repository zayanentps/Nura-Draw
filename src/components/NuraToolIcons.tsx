import React from 'react';

export const IconPick: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    {/* NuraDraw classic pick arrow */}
    <path d="M4 2.5 L4 21.5 L8.5 17 L12.5 22.5 L15 20.8 L11 15.3 L17.5 15.3 Z" stroke="#1f2226" strokeWidth="1" />
  </svg>
);

export const IconShape: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Curved line with node handle and pointer */}
    <path d="M4 20 C6 13, 10 7, 18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Square node handle on curve */}
    <rect x="5.5" y="10.5" width="4.5" height="4.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    {/* Arrow pointer manipulating the curve */}
    <path d="M12 18 L19 14 L17 21 Z" fill="currentColor" stroke="#1f2226" strokeWidth="0.8" />
  </svg>
);

export const IconCrop: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* NuraDraw overlapping crop marks */}
    <path d="M8 3 L8 16 L21 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
    <path d="M3 8 L16 8 L16 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
  </svg>
);

export const IconKnife: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Folding pocket knife blade extending from top */}
    <path
      d="M8.5 7 C11.5 3.5, 16.5 3.5, 19.5 6.5 L12 8.5 Z"
      fill="#ffffff"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Solid angled knife handle with pivot dot */}
    <rect
      x="3.5"
      y="9"
      width="17"
      height="5"
      rx="2.5"
      transform="rotate(42 12 12)"
      fill="currentColor"
    />
    <circle cx="7.2" cy="7.5" r="1.2" fill="#ffffff" />
  </svg>
);

export const IconVirtualSegmentDelete: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Three vertical curve/segment lines cut at top-left */}
    <path d="M4.5 20.5 V10 L11.5 4.5 V20.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <line x1="8" y1="7.5" x2="8" y2="20.5" stroke="currentColor" strokeWidth="1.6" />
    <line x1="4.5" y1="12" x2="11.5" y2="12" stroke="currentColor" strokeWidth="1.3" />
    {/* Red minus delete badge */}
    <circle cx="17.5" cy="7.5" r="4.5" fill="#dc2626" />
    <line x1="15" y1="7.5" x2="20" y2="7.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

export const IconEraser: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Two-tone beveled rectangular eraser block */}
    <path
      d="M7 5.5 L9.5 3 H17.5 V19.5 H7 Z"
      fill="#ffffff"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Top dark rubber half */}
    <path d="M7 5.5 L9.5 3 H17.5 V13.5 H7 Z" fill="currentColor" />
    {/* Bottom white sleeve outline */}
    <rect x="7" y="13.5" width="10.5" height="6" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconZoom: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Magnifying glass */}
    <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="2.2" />
    <path d="M15 15 L21.5 21.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconFreehand: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Crosshair top-left */}
    <path d="M6 2.5 L6 9.5 M2.5 6 L9.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    {/* Freehand drop & wavy tail */}
    <path
      d="M6 12 V17 C6 19.2 8.2 19.2 8.5 16.5 C8.8 14 11 14 11.4 16.8 C11.8 19.4 14 19.4 14.5 16.8 C15 14.8 17.5 15 18 17.5 L21 17.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconLine2P: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3.5" y="16.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
    <rect x="16.5" y="3.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconBezier: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="1.7" />
    {/* Solid dark handle control squares */}
    <rect x="3.5" y="17.5" width="3.5" height="3.5" fill="currentColor" />
    <rect x="17" y="3.5" width="3.5" height="3.5" fill="currentColor" />
    {/* Center hollow node */}
    <rect x="10" y="10" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconPen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Fountain pen nib outline */}
    <path
      d="M12 3 L17 12.5 L15 17 H9 L7 12.5 Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Nib slit & breather dot */}
    <line x1="12" y1="3" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    {/* Collar base */}
    <rect x="8.5" y="17" width="7" height="3.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconBSpline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Dotted L-control hull */}
    <polyline points="5.5,7 5.5,18.5 17,18.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />
    {/* Smooth B-spline curve */}
    <path d="M5.5 7 C6 15, 9 18, 17 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="3.5" y="3.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16.5" y="16.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconPolyline: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Polyline angled tip & base bar matching NuraDraw Polyline icon */}
    <line x1="12" y1="3" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.7" />
    <polygon points="12,6.5 18.5,12.5 18.5,18 5.5,18 5.5,12.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <rect x="5.5" y="18" width="13" height="2.8" fill="currentColor" />
  </svg>
);

export const IconCurve3P: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Triangle chord + legs */}
    <polygon points="12,5.5 5.5,17.5 18.5,17.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Curved dashed arc across apex */}
    <path d="M6.5 15 Q12 8.5 17.5 15" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.2 1.8" />
    {/* 3 hollow vertex squares */}
    <rect x="10" y="3.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3.5" y="15.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16.5" y="15.5" width="4" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconArtisticMedia: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    {/* Paintbrush with bristle stroke */}
    <path d="M19.5 3.5 L20.5 4.5 C21.5 5.5 21.5 7 20.5 8 L13 15.5 L8.5 11 L16 3.5 C17 2.5 18.5 2.5 19.5 3.5 Z" />
    <path d="M7.5 12 L12 16.5 L9 19.5 C7 21.5 3.5 22 2 20.5 C0.5 19 1 15.5 3 13.5 Z" />
  </svg>
);

export const IconRectangle: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Clean rectangle outline */}
    <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="miter" />
  </svg>
);

export const IconEllipse: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Clean circle / ellipse outline */}
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const IconPolygon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* NuraDraw 6-sided hexagon outline */}
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="miter" />
  </svg>
);

export const IconText: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    {/* NuraDraw Signature Bold Vector 'A' Text Tool */}
    <path d="M12.5 2.5h-1L3.8 21.5h3.6l1.6-4.3h6l1.6 4.3h3.6L12.5 2.5zm-.5 11.2l2-5.4 2 5.4h-4z" />
  </svg>
);

export const IconTable: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
  </svg>
);

export const IconDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Parallel dimension measurement line with end caps */}
    <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="square" />
    {/* Bottom-left T-cap */}
    <line x1="2.5" y1="17.5" x2="6.5" y2="21.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" />
    {/* Top-right T-cap */}
    <line x1="17.5" y1="2.5" x2="21.5" y2="6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" />
  </svg>
);

export const IconHVDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Left vertical dimension bar with top/bottom T-caps and arrowheads */}
    <line x1="5" y1="3.5" x2="5" y2="16.5" stroke="currentColor" strokeWidth="1.6" />
    <line x1="2.8" y1="3.5" x2="7.2" y2="3.5" stroke="currentColor" strokeWidth="1.8" />
    <line x1="2.8" y1="16.5" x2="7.2" y2="16.5" stroke="currentColor" strokeWidth="1.8" />
    <polygon points="5,4 3.4,7 6.6,7" fill="currentColor" />
    <polygon points="5,16 3.4,13 6.6,13" fill="currentColor" />
    {/* Bottom horizontal dimension bar with left/right T-caps and arrowheads */}
    <line x1="8.5" y1="19.5" x2="21.5" y2="19.5" stroke="currentColor" strokeWidth="1.6" />
    <line x1="8.5" y1="17.3" x2="8.5" y2="21.7" stroke="currentColor" strokeWidth="1.8" />
    <line x1="21.5" y1="17.3" x2="21.5" y2="21.7" stroke="currentColor" strokeWidth="1.8" />
    <polygon points="9,19.5 12,17.9 12,21.1" fill="currentColor" />
    <polygon points="21,19.5 18,17.9 18,21.1" fill="currentColor" />
  </svg>
);

export const IconAngularDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Vertical & horizontal rays from bottom-left vertex */}
    <line x1="4" y1="3.5" x2="4" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    <line x1="4" y1="20" x2="20.5" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    {/* Curved arc with arrowheads */}
    <path d="M 4.5 7.5 A 12.5 12.5 0 0 1 16.5 19.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <polygon points="4.5,7.5 8,7.2 6.8,10.2" fill="currentColor" />
    <polygon points="16.5,19.5 13.8,17.2 16.8,16" fill="currentColor" />
  </svg>
);

export const IconSegmentDimension: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Stepped segment profile on left */}
    <polyline points="3.5,3 7.5,3 7.5,10 11,10 11,21 3.5,21" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="miter" />
    {/* Right vertical dimension arrow with top/bottom extension caps */}
    <line x1="14.5" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14.5" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" />
    <line x1="17.8" y1="10.5" x2="17.8" y2="20.5" stroke="currentColor" strokeWidth="1.6" />
    <polygon points="17.8,10.2 15.8,13.2 19.8,13.2" fill="currentColor" />
    <polygon points="17.8,20.8 15.8,17.8 19.8,17.8" fill="currentColor" />
  </svg>
);

export const IconCallout: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* 2-Leg Callout: bold angled leg pointing down-left + horizontal leg */}
    <polyline points="20.5,7 12.5,7 5,18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Arrowhead pointing down-left */}
    <polygon points="3.5,20 4.8,14.2 9.4,17.4" fill="currentColor" />
  </svg>
);

export const IconConnector: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Connecting diagonal line */}
    <line x1="6" y1="7" x2="18" y2="17" stroke="currentColor" strokeWidth="2" />
    {/* Top-left orange node */}
    <rect x="3" y="4" width="6" height="6" fill="#f97316" stroke="currentColor" strokeWidth="1.5" />
    {/* Bottom-right orange node */}
    <rect x="15" y="14" width="6" height="6" fill="#f97316" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconShadow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Underneath shadowed square */}
    <rect x="7" y="7" width="13" height="13" fill="#3f3f46" stroke="currentColor" strokeWidth="1.8" />
    {/* Top front white square */}
    <rect x="4" y="4" width="13" height="13" fill="#ffffff" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconContour: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Concentric contour squares */}
    <rect x="3.5" y="3.5" width="17" height="17" stroke="currentColor" strokeWidth="1.6" />
    <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9.5" y="9.5" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconBlend: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* 3 cascading overlapping circles */}
    <circle cx="6" cy="6" r="2.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="9.8" cy="9.8" r="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="5.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconDistort: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Jagged distorted push/pull outline */}
    <path
      d="M4 4 L9.5 6.5 L15.5 3.5 L14.5 9.5 L20.5 11.5 L17 16 L19.5 20.5 L12.5 18.5 L8.5 21 L7.5 15 L3.5 12 L7.5 9 Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconEnvelope: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Inward-curved envelope grid with 4 midpoint nodes */}
    <path
      d="M4 5 Q12 8.5 20 5 Q16.5 12 20 19 Q12 15.5 4 19 Q7.5 12 4 5 Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <rect x="10.5" y="5.5" width="3" height="3" fill="#ffffff" stroke="currentColor" strokeWidth="1.3" />
    <rect x="10.5" y="15.5" width="3" height="3" fill="#ffffff" stroke="currentColor" strokeWidth="1.3" />
    <rect x="5" y="10.5" width="3" height="3" fill="#ffffff" stroke="currentColor" strokeWidth="1.3" />
    <rect x="16" y="10.5" width="3" height="3" fill="#ffffff" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const IconExtrude: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Isometric 3D wireframe cube */}
    <polygon points="4,8 12,3.5 20,8 20,16 12,20.5 4,16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <polyline points="4,8 12,12.5 20,8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="12.5" x2="12" y2="20.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="4" y1="16" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.6" />
    <line x1="20" y1="16" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.6" />
  </svg>
);

export const IconBlockShadow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Solid extruded dark block shadow body */}
    <path
      d="M11 4.5 L20 13.5 A4.6 4.6 0 0 1 13.5 20 L4.5 11 Z"
      fill="currentColor"
    />
    {/* Front white circle */}
    <circle cx="8" cy="8" r="4.6" fill="#ffffff" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const IconTransparency: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* 4x4 checkerboard grid */}
    <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" />
    {/* Checker tiles */}
    <rect x="3" y="3" width="4.5" height="4.5" fill="currentColor" />
    <rect x="12" y="3" width="4.5" height="4.5" fill="currentColor" />
    <rect x="7.5" y="7.5" width="4.5" height="4.5" fill="currentColor" />
    <rect x="16.5" y="7.5" width="4.5" height="4.5" fill="currentColor" />
    <rect x="3" y="12" width="4.5" height="4.5" fill="currentColor" />
    <rect x="12" y="12" width="4.5" height="4.5" fill="currentColor" />
    <rect x="7.5" y="16.5" width="4.5" height="4.5" fill="currentColor" />
    <rect x="16.5" y="16.5" width="4.5" height="4.5" fill="currentColor" />
  </svg>
);

export const IconEyedropper: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Eyedropper bulb top */}
    <path d="M16 3 L20 7 L17.5 9.5 L13.5 5.5 Z" fill="currentColor" />
    {/* Eyedropper glass tube with orange fluid */}
    <path d="M14 6 L18 10 L8.5 19.5 L4.5 19.5 L4.5 15.5 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
    <path d="M10 14 L14 18 L7 19 L5 17 Z" fill="#f97316" />
    {/* Tip drop point */}
    <path d="M4.5 19.5 L2.5 21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconInteractiveFill: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    {/* Diamond paint container outline */}
    <polygon points="12,2.5 20.5,11 12,19.5 3.5,11" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    {/* Red liquid fill in bottom half */}
    <polygon points="4.5,11 12,18.5 19.5,11" fill="#e11d48" />
    {/* Red corner accent triangle on bottom-right */}
    <polygon points="21,15.5 21,21 15.5,21" fill="#e11d48" />
  </svg>
);

export const IconGear: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);
