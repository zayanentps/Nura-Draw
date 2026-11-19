import React, { useEffect, useRef } from 'react';
import { UnitType, UNITS_DATA } from '../utils/units';
import { ThemeMode } from '../types';

interface RulersProps {
  zoom: number;
  pan: { x: number; y: number };
  cursorPos: { x: number; y: number };
  units: UnitType;
  theme?: ThemeMode;
  pageWidth?: number;
  pageHeight?: number;
}

/**
 * Calculates crisp, readable, human-friendly ruler intervals for any unit at any zoom level.
 */
function getNiceUnitStep(unit: UnitType, zoom: number): {
  unitStep: number;
  screenStep: number;
  subDivisions: number;
  decimals: number;
} {
  const safeZoom = Math.max(0.001, zoom);
  const info = UNITS_DATA[unit] || UNITS_DATA.px;
  const pxPerUnit = info.pxPerUnit;

  // Ideal screen distance between major labeled ticks: ~75px
  const targetDistancePx = 75;
  const rawUnitStep = targetDistancePx / (pxPerUnit * safeZoom);

  // Power of 10 exponent
  const exponent = Math.floor(Math.log10(rawUnitStep));
  const magnitude = Math.pow(10, exponent);
  const fraction = rawUnitStep / magnitude;

  let niceFraction = 1;
  let subDivisions = 5;

  if (unit === 'in' && rawUnitStep >= 0.08) {
    // For inches at normal zooms, use natural binary / fractional divisions
    if (rawUnitStep < 0.15) {
      niceFraction = 0.125;
      subDivisions = 4;
    } else if (rawUnitStep < 0.35) {
      niceFraction = 0.25;
      subDivisions = 4;
    } else if (rawUnitStep < 0.75) {
      niceFraction = 0.5;
      subDivisions = 4;
    } else if (rawUnitStep < 1.75) {
      niceFraction = 1;
      subDivisions = 8;
    } else if (rawUnitStep < 3.5) {
      niceFraction = 2;
      subDivisions = 4;
    } else if (rawUnitStep < 8) {
      niceFraction = 5;
      subDivisions = 5;
    } else {
      niceFraction = 10;
      subDivisions = 5;
    }
    const unitStep = niceFraction;
    const screenStep = unitStep * pxPerUnit * safeZoom;
    const decimals = unitStep < 1 ? (unitStep < 0.25 ? 3 : 2) : 0;
    return { unitStep, screenStep, subDivisions, decimals };
  }

  // Decimal-based units (mm, cm, px, pt, pc, ft, m, yd, and zoomed-in inches)
  if (fraction < 1.5) {
    niceFraction = 1;
    subDivisions = 5;
  } else if (fraction < 3.5) {
    niceFraction = 2;
    subDivisions = 4;
  } else if (fraction < 7.5) {
    niceFraction = 5;
    subDivisions = 5;
  } else {
    niceFraction = 10;
    subDivisions = 5;
  }

  const unitStep = niceFraction * magnitude;
  const screenStep = unitStep * pxPerUnit * safeZoom;
  const decimals = Math.min(6, Math.max(0, -exponent + (niceFraction === 0.5 ? 1 : 0)));

  return { unitStep, screenStep, subDivisions, decimals };
}

/**
 * Top Horizontal Ruler
 */
export const TopRuler: React.FC<RulersProps> = ({
  zoom,
  pan,
  cursorPos,
  units,
  theme = 'light',
  pageWidth = 816,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Razor-sharp High-DPI canvas sizing
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 800;
    const height = 20;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Desk background (outside page) — 70% black cool charcoal
    ctx.fillStyle = isDark ? '#474a50' : '#e6e7eb';
    ctx.fillRect(0, 0, width, height);

    // 2. Page span highlight (minor lighter charcoal shift for active page width)
    const pageStartX = pan.x;
    const pageEndX = pan.x + pageWidth * zoom;
    const drawPageStart = Math.max(0, pageStartX);
    const drawPageEnd = Math.min(width, pageEndX);

    if (drawPageEnd > drawPageStart) {
      ctx.fillStyle = isDark ? '#5c6068' : '#ffffff';
      ctx.fillRect(drawPageStart, 0, drawPageEnd - drawPageStart, height);
    }

    // 3. Ruler bottom baseline border
    ctx.strokeStyle = isDark ? '#6c717a' : '#c5c8cf';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    // 4. Calculate unit steps
    const { unitStep, screenStep, subDivisions, decimals } = getNiceUnitStep(units, zoom);
    if (screenStep <= 0) {
      ctx.restore();
      return;
    }

    // Text & Tick styles
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Starting tick aligned with zero at pan.x
    // x = pan.x + (k * screenStep)
    const kStart = Math.floor(-pan.x / screenStep) - 1;
    const kEnd = Math.ceil((width - pan.x) / screenStep) + 1;

    for (let k = kStart; k <= kEnd; k++) {
      const x = pan.x + k * screenStep;
      if (x < -screenStep || x > width + screenStep) continue;

      const unitVal = (k * unitStep).toFixed(decimals);
      const isZero = k === 0;
      const isPageBoundary = isZero || Math.abs(x - pageEndX) < 1;

      const px = Math.floor(x) + 0.5;

      // Major tick line
      ctx.strokeStyle = isPageBoundary
        ? isDark ? '#38bdf8' : '#0284c7'
        : isDark ? '#d1d5db' : '#525660';
      ctx.lineWidth = isPageBoundary ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(px, height);
      ctx.lineTo(px, height - (isPageBoundary ? 12 : 9));
      ctx.stroke();

      // Major Label
      if (px >= 10 && px <= width - 10) {
        ctx.fillStyle = isPageBoundary
          ? isDark ? '#38bdf8' : '#0284c7'
          : isDark ? '#f1f5f9' : '#1e293b';
        ctx.fillText(unitVal, px, 2);
      }

      // Minor Sub-divisions
      if (subDivisions > 1 && screenStep > 25) {
        ctx.strokeStyle = isDark ? '#94a3b8' : '#a1a6b0';
        ctx.lineWidth = 1;
        const subStep = screenStep / subDivisions;

        for (let s = 1; s < subDivisions; s++) {
          const subX = Math.floor(x + s * subStep) + 0.5;
          if (subX >= 0 && subX <= width) {
            const isMid = s === subDivisions / 2;
            const tickH = isMid ? 6 : 4;

            ctx.beginPath();
            ctx.moveTo(subX, height);
            ctx.lineTo(subX, height - tickH);
            ctx.stroke();
          }
        }
      }
    }

    // 5. Cursor Indicator (Hairline + triangle marker)
    const cursorScreenX = Math.floor(pan.x + cursorPos.x * zoom) + 0.5;
    if (cursorScreenX >= 0 && cursorScreenX <= width) {
      const accent = isDark ? '#38bdf8' : '#0066cc';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorScreenX, 0);
      ctx.lineTo(cursorScreenX, height);
      ctx.stroke();

      // Small pointer triangle at bottom of ruler
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cursorScreenX - 3, height);
      ctx.lineTo(cursorScreenX + 3, height);
      ctx.lineTo(cursorScreenX, height - 4);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Draw unit label on far right (e.g. "millimeters" as in image_2b0a935b.png)
    const unitName = (UNITS_DATA[units]?.label || units).toLowerCase();
    ctx.font = '9px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isDark ? '#d4d8e0' : '#64748b';
    ctx.fillText(unitName, width - 8, 3);

    ctx.restore();
  }, [zoom, pan, cursorPos, units, isDark, pageWidth]);

  return (
    <div ref={containerRef} className="w-full h-5 relative overflow-hidden select-none">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

/**
 * Left Vertical Ruler
 */
export const LeftRuler: React.FC<RulersProps> = ({
  zoom,
  pan,
  cursorPos,
  units,
  theme = 'light',
  pageHeight = 1056,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Razor-sharp High-DPI canvas sizing
    const dpr = window.devicePixelRatio || 1;
    const width = 20;
    const height = container.clientHeight || 800;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Desk background (outside page) — 70% black cool charcoal
    ctx.fillStyle = isDark ? '#474a50' : '#e6e7eb';
    ctx.fillRect(0, 0, width, height);

    // 2. Page span highlight (minor lighter charcoal shift for active page height)
    const pageStartY = pan.y;
    const pageEndY = pan.y + pageHeight * zoom;
    const drawPageStart = Math.max(0, pageStartY);
    const drawPageEnd = Math.min(height, pageEndY);

    if (drawPageEnd > drawPageStart) {
      ctx.fillStyle = isDark ? '#5c6068' : '#ffffff';
      ctx.fillRect(0, drawPageStart, width, drawPageEnd - drawPageStart);
    }

    // 3. Ruler right baseline border
    ctx.strokeStyle = isDark ? '#6c717a' : '#c5c8cf';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 0.5, 0);
    ctx.lineTo(width - 0.5, height);
    ctx.stroke();

    // 4. Calculate unit steps
    const { unitStep, screenStep, subDivisions, decimals } = getNiceUnitStep(units, zoom);
    if (screenStep <= 0) {
      ctx.restore();
      return;
    }

    // Text & Tick styles
    ctx.font = '8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const kStart = Math.floor(-pan.y / screenStep) - 1;
    const kEnd = Math.ceil((height - pan.y) / screenStep) + 1;

    for (let k = kStart; k <= kEnd; k++) {
      const y = pan.y + k * screenStep;
      if (y < -screenStep || y > height + screenStep) continue;

      const unitVal = (k * unitStep).toFixed(decimals);
      const isZero = k === 0;
      const isPageBoundary = isZero || Math.abs(y - pageEndY) < 1;

      const py = Math.floor(y) + 0.5;

      // Major tick line
      ctx.strokeStyle = isPageBoundary
        ? isDark ? '#38bdf8' : '#0284c7'
        : isDark ? '#d1d5db' : '#525660';
      ctx.lineWidth = isPageBoundary ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(width, py);
      ctx.lineTo(width - (isPageBoundary ? 12 : 9), py);
      ctx.stroke();

      // Major Label (rotated vertically or compact)
      if (py >= 12 && py <= height - 12) {
        ctx.save();
        ctx.translate(5, py);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = isPageBoundary
          ? isDark ? '#38bdf8' : '#0284c7'
          : isDark ? '#f1f5f9' : '#1e293b';
        ctx.fillText(unitVal, 0, 0);
        ctx.restore();
      }

      // Minor Sub-divisions
      if (subDivisions > 1 && screenStep > 25) {
        ctx.strokeStyle = isDark ? '#94a3b8' : '#a1a6b0';
        ctx.lineWidth = 1;
        const subStep = screenStep / subDivisions;

        for (let s = 1; s < subDivisions; s++) {
          const subY = Math.floor(y + s * subStep) + 0.5;
          if (subY >= 0 && subY <= height) {
            const isMid = s === subDivisions / 2;
            const tickH = isMid ? 6 : 4;

            ctx.beginPath();
            ctx.moveTo(width, subY);
            ctx.lineTo(width - tickH, subY);
            ctx.stroke();
          }
        }
      }
    }

    // 5. Cursor Indicator (Hairline + triangle marker)
    const cursorScreenY = Math.floor(pan.y + cursorPos.y * zoom) + 0.5;
    if (cursorScreenY >= 0 && cursorScreenY <= height) {
      const accent = isDark ? '#38bdf8' : '#0066cc';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cursorScreenY);
      ctx.lineTo(width, cursorScreenY);
      ctx.stroke();

      // Small pointer triangle at right edge of ruler
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(width, cursorScreenY - 3);
      ctx.lineTo(width, cursorScreenY + 3);
      ctx.lineTo(width - 4, cursorScreenY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [zoom, pan, cursorPos, units, isDark, pageHeight]);

  return (
    <div ref={containerRef} className="w-5 h-full relative overflow-hidden select-none">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
