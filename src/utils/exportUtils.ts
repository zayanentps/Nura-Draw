import * as fabric from 'fabric';
import jsPDF, { GState } from 'jspdf';
import { PageConfig, ParametricState } from '../types';
import { disableObjectCaching } from './canvasHelpers';

export interface NuraExportFormat {
  id: string;
  short: string;
  ext: string;
  label: string;
  mime: string;
  pinned?: boolean;
  kind: 'pdf' | 'vector' | 'raster' | 'cad' | 'json' | 'document';
}

// NuraDraw "Save as type" list including .ndr native vector project format
export const NURADRAW_EXPORT_FORMATS: NuraExportFormat[] = [
  // Pinned top common formats
  { id: 'ndr', short: 'NDR', ext: 'ndr', label: 'NDR - NuraDraw Native (.ndr)', mime: 'image/svg+xml', pinned: true, kind: 'vector' },
  { id: 'pdf', short: 'PDF', ext: 'pdf', label: 'PDF - Adobe Portable Document Format', mime: 'application/pdf', pinned: true, kind: 'pdf' },
  { id: 'svg', short: 'SVG', ext: 'svg', label: 'SVG - Scalable Vector Graphics', mime: 'image/svg+xml', pinned: true, kind: 'vector' },
  { id: 'jpg', short: 'JPG', ext: 'jpg', label: 'JPG - JPEG Bitmaps', mime: 'image/jpeg', pinned: true, kind: 'raster' },
  { id: 'png', short: 'PNG', ext: 'png', label: 'PNG - Portable Network Graphics', mime: 'image/png', pinned: true, kind: 'raster' },
  { id: 'ai', short: 'AI', ext: 'ai', label: 'AI - Adobe Illustrator', mime: 'application/postscript', pinned: true, kind: 'vector' },
  { id: 'dwg', short: 'DWG', ext: 'dwg', label: 'DWG - AutoCAD Drawing (.dwg)', mime: 'application/acad', pinned: true, kind: 'cad' },

  // Full NuraDraw format list
  { id: 'ai_full', short: 'AI', ext: 'ai', label: 'AI - Adobe Illustrator', mime: 'application/postscript', kind: 'vector' },
  { id: 'pfb', short: 'PFB', ext: 'pfb', label: 'PFB - Adobe Type 1 Font', mime: 'application/octet-stream', kind: 'document' },
  { id: 'bmp_win', short: 'BMP', ext: 'bmp', label: 'BMP - Windows Bitmap', mime: 'image/bmp', kind: 'raster' },
  { id: 'bmp_os2', short: 'BMP', ext: 'bmp', label: 'BMP - OS/2 Bitmap', mime: 'image/bmp', kind: 'raster' },
  { id: 'cal', short: 'CAL', ext: 'cal', label: 'CAL - CALS Compressed Bitmap', mime: 'application/octet-stream', kind: 'raster' },
  { id: 'cgm', short: 'CGM', ext: 'cgm', label: 'CGM - Computer Graphics Metafile', mime: 'image/cgm', kind: 'vector' },
  { id: 'cur', short: 'CUR', ext: 'cur', label: 'CUR - Windows 3.x/NT Cursor Resource', mime: 'image/x-icon', kind: 'raster' },
  { id: 'doc', short: 'DOC', ext: 'doc', label: 'DOC - MS Word for Windows 6/7', mime: 'application/msword', kind: 'document' },
  { id: 'dxf', short: 'DXF', ext: 'dxf', label: 'DXF - AutoCAD', mime: 'application/dxf', kind: 'cad' },
  { id: 'emf', short: 'EMF', ext: 'emf', label: 'EMF - Enhanced Windows Metafile', mime: 'image/emf', kind: 'vector' },
  { id: 'eps', short: 'EPS', ext: 'eps', label: 'EPS - Encapsulated PostScript', mime: 'application/postscript', kind: 'vector' },
  { id: 'fmv', short: 'FMV', ext: 'fmv', label: 'FMV - Frame Vector Metafile', mime: 'application/octet-stream', kind: 'vector' },
  { id: 'gem', short: 'GEM', ext: 'gem', label: 'GEM - GEM File', mime: 'application/octet-stream', kind: 'vector' },
  { id: 'gif', short: 'GIF', ext: 'gif', label: 'GIF - CompuServe Bitmap', mime: 'image/gif', kind: 'raster' },
  { id: 'ico', short: 'ICO', ext: 'ico', label: 'ICO - Windows 3.x/NT Icon Resource', mime: 'image/x-icon', kind: 'raster' },
  { id: 'img', short: 'IMG', ext: 'img', label: 'IMG - GEM Paint File', mime: 'application/octet-stream', kind: 'raster' },
  { id: 'jp2', short: 'JP2', ext: 'jp2', label: 'JP2 - JPEG 2000 Bitmaps', mime: 'image/jp2', kind: 'raster' },
  { id: 'jpg_full', short: 'JPG', ext: 'jpg', label: 'JPG - JPEG Bitmaps', mime: 'image/jpeg', kind: 'raster' },
  { id: 'mac', short: 'MAC', ext: 'mac', label: 'MAC - MACPaint Bitmap', mime: 'application/octet-stream', kind: 'raster' },
  { id: 'webp', short: 'WEBP', ext: 'webp', label: 'WEBP - WebP Raster Image', mime: 'image/webp', kind: 'raster' },
  { id: 'nuradraw', short: 'NURADRAW', ext: 'nuradraw', label: 'NURADRAW - NuraDraw Project JSON', mime: 'application/json', kind: 'json' },
];

export interface AdvancedExportSettings {
  // General tab
  exportRange: 'current_document' | 'current_page' | 'documents' | 'pages' | 'selection';
  pagesRangeText: string;
  pageSizeMode: 'document' | 'selected_objects';
  cropToPage: boolean;
  pdfPreset: string;
  compatibility: string;

  // Color tab
  colorManagementMode: 'document' | 'proof';
  outputColor: 'Native' | 'RGB' | 'CMYK' | 'Grayscale';
  convertSpotColors: boolean;
  spotTarget: 'CMYK' | 'RGB';
  embedColorProfile: boolean;
  preserveOverprints: boolean;
  alwaysOverprintBlack: boolean;

  // Document tab
  author: string;
  keywords: string;
  optimizeForWeb: boolean;
  includeComments: boolean;
  includeHyperlinks: boolean;
  generateBookmarks: boolean;
  generateThumbnails: boolean;
  onStartMode: 'Page Only' | 'Full Screen' | 'Bookmarks' | 'Thumbnails';
  encoding: 'ASCII 85' | 'Binary';

  // Objects tab
  compressionType: 'JPEG' | 'LZW' | 'ZIP' | 'None';
  jpegQuality: number;
  downsampleColor: boolean;
  colorDpi: number;
  downsampleGrayscale: boolean;
  grayscaleDpi: number;
  downsampleMono: boolean;
  monoDpi: number;
  compressTextLineArt: boolean;
  exportTextAsCurves: boolean;
  renderComplexFillsAsBitmaps: boolean;
  embedFonts: boolean;
  embedBase14Fonts: boolean;
  convertTrueTypeToType1: boolean;
  subsetFonts: boolean;
  subsetThreshold: number;
  epsFilesMode: 'PostScript' | 'Preview only';

  // Prepress tab
  bleedLimitEnabled: boolean;
  bleedLimitInches: number;
  preserveHalftone: boolean;
  cropMarks: boolean;
  registrationMarks: boolean;
  fileInformation: boolean;
  densitometerScales: boolean;
  maintainOpiLinks: boolean;

  // Security tab
  openPasswordEnabled: boolean;
  openPassword: string;
  openPasswordConfirm: string;
  permissionPasswordEnabled: boolean;
  permissionPassword: string;
  permissionPasswordConfirm: string;
  printingPermissions: 'None' | 'Low Resolution' | 'High Resolution';
  editingPermissions: 'None' | 'Any except extracting pages' | 'Commenting & filling forms';
  enableCopyingContent: boolean;
}

export const DEFAULT_ADVANCED_EXPORT_SETTINGS: AdvancedExportSettings = {
  exportRange: 'current_document',
  pagesRangeText: '1-2',
  pageSizeMode: 'document',
  cropToPage: false,
  pdfPreset: 'Document Distribution',
  compatibility: 'Acrobat DC',

  colorManagementMode: 'document',
  outputColor: 'Native',
  convertSpotColors: false,
  spotTarget: 'CMYK',
  embedColorProfile: true,
  preserveOverprints: true,
  alwaysOverprintBlack: false,

  author: 'user',
  keywords: '',
  optimizeForWeb: false,
  includeComments: true,
  includeHyperlinks: true,
  generateBookmarks: true,
  generateThumbnails: false,
  onStartMode: 'Page Only',
  encoding: 'Binary',

  compressionType: 'JPEG',
  jpegQuality: 97,
  downsampleColor: true,
  colorDpi: 200,
  downsampleGrayscale: true,
  grayscaleDpi: 200,
  downsampleMono: true,
  monoDpi: 600,
  compressTextLineArt: true,
  exportTextAsCurves: false,
  renderComplexFillsAsBitmaps: false,
  embedFonts: true,
  embedBase14Fonts: true,
  convertTrueTypeToType1: true,
  subsetFonts: true,
  subsetThreshold: 80,
  epsFilesMode: 'PostScript',

  bleedLimitEnabled: false,
  bleedLimitInches: 0.125,
  preserveHalftone: false,
  cropMarks: false,
  registrationMarks: false,
  fileInformation: false,
  densitometerScales: false,
  maintainOpiLinks: false,

  openPasswordEnabled: false,
  openPassword: '',
  openPasswordConfirm: '',
  permissionPasswordEnabled: false,
  permissionPassword: '',
  permissionPasswordConfirm: '',
  printingPermissions: 'None',
  editingPermissions: 'None',
  enableCopyingContent: false,
};

function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveBlobToChosenLocation(
  blob: Blob,
  filename: string,
  fileHandle?: any | null,
  dirHandle?: any | null
): Promise<'file_handle' | 'dir_handle' | 'download'> {
  if (fileHandle && typeof fileHandle.createWritable === 'function') {
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'file_handle';
  }
  if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
    const handle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'dir_handle';
  }
  triggerDownloadBlob(blob, filename);
  return 'download';
}

const PX_TO_PT = 72 / 96; // Convert 96-DPI CSS pixels to 72-DPI PDF points

function withIdentityViewport<T>(canvas: fabric.Canvas, fn: () => T): T {
  const prevVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.forEachObject((o) => o.setCoords());
  try {
    return fn();
  } finally {
    canvas.setViewportTransform(prevVpt as any);
    canvas.forEachObject((o) => o.setCoords());
  }
}

function getExportBounds(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  settings?: Partial<AdvancedExportSettings>
) {
  return withIdentityViewport(canvas, () => {
    const activeObj = canvas.getActiveObject();
    if (
      activeObj &&
      (settings?.exportRange === 'selection' || settings?.pageSizeMode === 'selected_objects')
    ) {
      const rect = activeObj.getBoundingRect();
      return {
        left: rect.left,
        top: rect.top,
        width: Math.max(16, rect.width),
        height: Math.max(16, rect.height),
      };
    }
    return {
      left: 0,
      top: 0,
      width: pageConfig.width,
      height: pageConfig.height,
    };
  });
}

async function renderCanvasToRealElement(
  canvas: fabric.Canvas,
  bounds: { left: number; top: number; width: number; height: number },
  multiplier: number,
  grayscale: boolean,
  backgroundHex?: string
): Promise<HTMLCanvasElement> {
  const dataURL = withIdentityViewport(canvas, () =>
    canvas.toDataURL({
      format: 'png',
      multiplier,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
  );

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
    img.src = dataURL;
  });

  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(bounds.width * multiplier));
  out.height = Math.max(1, Math.round(bounds.height * multiplier));
  const ctx = out.getContext('2d')!;
  if (backgroundHex) {
    ctx.fillStyle = backgroundHex;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  if (grayscale) {
    ctx.filter = 'grayscale(100%)';
  }
  ctx.drawImage(img, 0, 0, out.width, out.height);
  return out;
}

function encodeBmp24(el: HTMLCanvasElement): Blob {
  const w = el.width;
  const h = el.height;
  const ctx = el.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h).data;
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelArraySize = rowSize * h;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  // DIB Header (40 bytes BITMAPINFOHEADER)
  view.setUint32(14, 40, true);
  view.setInt32(18, w, true);
  view.setInt32(22, h, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < h; y++) {
    const srcRow = h - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      const i = (srcRow * w + x) * 4;
      const dst = rowOffset + x * 3;
      view.setUint8(dst, imgData[i + 2]); // B
      view.setUint8(dst + 1, imgData[i + 1]); // G
      view.setUint8(dst + 2, imgData[i]); // R
    }
  }
  return new Blob([buffer], { type: 'image/bmp' });
}

async function encodeIcoOrCur(el: HTMLCanvasElement, isCursor: boolean): Promise<Blob> {
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 64;
  iconCanvas.height = 64;
  const ctx = iconCanvas.getContext('2d')!;
  ctx.drawImage(el, 0, 0, 64, 64);
  const pngBlob = await new Promise<Blob>((resolve) =>
    iconCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
  );
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const out = new ArrayBuffer(22 + pngBytes.length);
  const view = new DataView(out);
  view.setUint16(0, 0, true);
  view.setUint16(2, isCursor ? 2 : 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, 64);
  view.setUint8(7, 64);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, isCursor ? 0 : 1, true);
  view.setUint16(12, isCursor ? 0 : 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true);
  new Uint8Array(out, 22).set(pngBytes);
  return new Blob([out], { type: 'image/x-icon' });
}

function resolveAciColor(color: unknown): number {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return 7; // white/black default in CAD
  const { r, g, b } = rgb;
  if (r > 200 && g < 80 && b < 80) return 1; // Red
  if (r > 200 && g > 200 && b < 80) return 2; // Yellow
  if (r < 80 && g > 180 && b < 80) return 3; // Green
  if (r < 80 && g > 180 && b > 180) return 4; // Cyan
  if (r < 80 && g < 80 && b > 180) return 5; // Blue
  if (r > 180 && g < 80 && b > 180) return 6; // Magenta
  return 7;
}

function buildDxfString(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  settings?: Partial<AdvancedExportSettings>
): string {
  const h = pageConfig.height;
  const w = pageConfig.width;
  const entities: string[] = [];

  const toCadPoint = (pt: fabric.Point, m: fabric.TMat2D) => {
    const t = pt.transform(m);
    return { x: t.x, y: h - t.y };
  };

  const emitLwPolyline = (pts: Array<{ x: number; y: number }>, closed: boolean, aci: number) => {
    if (pts.length < 2) return;
    entities.push('0', 'LWPOLYLINE', '8', '0', '62', String(aci), '90', String(pts.length), '70', closed ? '1' : '0');
    pts.forEach((p) => {
      entities.push('10', p.x.toFixed(3), '20', p.y.toFixed(3));
    });
  };

  const emitObject = (obj: fabric.FabricObject, parentMatrix?: fabric.TMat2D) => {
    if (obj.visible === false || (obj as any).excludeFromExport) return;
    const localM = obj.calcOwnMatrix();
    const worldM = parentMatrix
      ? fabric.util.multiplyTransformMatrices(parentMatrix, localM)
      : obj.calcTransformMatrix();

    if (obj.type === 'group') {
      const grp = obj as fabric.Group;
      grp.getObjects().forEach((child) => emitObject(child, worldM));
      return;
    }

    const aci = resolveAciColor((obj as any).stroke && (obj as any).stroke !== 'transparent' ? (obj as any).stroke : (obj as any).fill);

    if (obj.type === 'line') {
      const line = obj as fabric.Line;
      const pts = line.calcLinePoints();
      const p1 = toCadPoint(new fabric.Point(pts.x1, pts.y1), worldM);
      const p2 = toCadPoint(new fabric.Point(pts.x2, pts.y2), worldM);
      entities.push(
        '0', 'LINE', '8', '0', '62', String(aci),
        '10', p1.x.toFixed(3), '20', p1.y.toFixed(3), '30', '0.0',
        '11', p2.x.toFixed(3), '21', p2.y.toFixed(3), '31', '0.0'
      );
      return;
    }

    if (obj.type === 'circle' || obj.type === 'ellipse') {
      const rx = obj.type === 'circle' ? ((obj as fabric.Circle).radius || 0) : ((obj as fabric.Ellipse).rx || 0);
      const ry = obj.type === 'circle' ? ((obj as fabric.Circle).radius || 0) : ((obj as fabric.Ellipse).ry || 0);
      const center = toCadPoint(new fabric.Point(0, 0), worldM);
      const rightPt = toCadPoint(new fabric.Point(rx, 0), worldM);
      const topPt = toCadPoint(new fabric.Point(0, -ry), worldM);
      const rxWorld = Math.hypot(rightPt.x - center.x, rightPt.y - center.y);
      const ryWorld = Math.hypot(topPt.x - center.x, topPt.y - center.y);

      if (Math.abs(rxWorld - ryWorld) < 0.05 && rxWorld > 0) {
        entities.push(
          '0', 'CIRCLE', '8', '0', '62', String(aci),
          '10', center.x.toFixed(3), '20', center.y.toFixed(3), '30', '0.0',
          '40', rxWorld.toFixed(3)
        );
      } else if (rxWorld > 0 && ryWorld > 0) {
        const majorVec =
          rxWorld >= ryWorld
            ? { dx: rightPt.x - center.x, dy: rightPt.y - center.y, ratio: ryWorld / rxWorld }
            : { dx: topPt.x - center.x, dy: topPt.y - center.y, ratio: rxWorld / ryWorld };
        entities.push(
          '0', 'ELLIPSE', '8', '0', '62', String(aci),
          '10', center.x.toFixed(3), '20', center.y.toFixed(3), '30', '0.0',
          '11', majorVec.dx.toFixed(3), '21', majorVec.dy.toFixed(3), '31', '0.0',
          '40', Math.max(0.001, Math.min(1, majorVec.ratio)).toFixed(4),
          '41', '0.0', '42', (Math.PI * 2).toFixed(6)
        );
      }
      return;
    }

    if (obj.type === 'rect') {
      const rw = (obj.width || 0) / 2;
      const rh = (obj.height || 0) / 2;
      const corners = [
        toCadPoint(new fabric.Point(-rw, -rh), worldM),
        toCadPoint(new fabric.Point(rw, -rh), worldM),
        toCadPoint(new fabric.Point(rw, rh), worldM),
        toCadPoint(new fabric.Point(-rw, rh), worldM),
      ];
      emitLwPolyline(corners, true, aci);
      return;
    }

    if (obj.type === 'polygon' || obj.type === 'polyline') {
      const poly = obj as fabric.Polygon;
      const offset = poly.pathOffset || { x: 0, y: 0 };
      const pts = (poly.points || []).map((p) =>
        toCadPoint(new fabric.Point(p.x - offset.x, p.y - offset.y), worldM)
      );
      emitLwPolyline(pts, obj.type === 'polygon', aci);
      return;
    }

    if (obj.type === 'path') {
      const pathObj = obj as fabric.Path;
      const offset = pathObj.pathOffset || { x: 0, y: 0 };
      const cmds = pathObj.path || [];
      let subPts: Array<{ x: number; y: number }> = [];
      let curX = 0;
      let curY = 0;
      let startX = 0;
      let startY = 0;

      const pushLocal = (lx: number, ly: number) => {
        subPts.push(toCadPoint(new fabric.Point(lx - offset.x, ly - offset.y), worldM));
      };

      for (const cmd of cmds) {
        const op = String(cmd[0] || '');
        if (op === 'M') {
          if (subPts.length >= 2) emitLwPolyline(subPts, false, aci);
          subPts = [];
          curX = Number(cmd[1]);
          curY = Number(cmd[2]);
          startX = curX;
          startY = curY;
          pushLocal(curX, curY);
        } else if (op === 'L') {
          curX = Number(cmd[1]);
          curY = Number(cmd[2]);
          pushLocal(curX, curY);
        } else if (op === 'Q') {
          const cx = Number(cmd[1]);
          const cy = Number(cmd[2]);
          const ex = Number(cmd[3]);
          const ey = Number(cmd[4]);
          for (let s = 1; s <= 10; s++) {
            const t = s / 10;
            const mt = 1 - t;
            pushLocal(mt * mt * curX + 2 * mt * t * cx + t * t * ex, mt * mt * curY + 2 * mt * t * cy + t * t * ey);
          }
          curX = ex;
          curY = ey;
        } else if (op === 'C') {
          const x1 = Number(cmd[1]);
          const y1 = Number(cmd[2]);
          const x2 = Number(cmd[3]);
          const y2 = Number(cmd[4]);
          const ex = Number(cmd[5]);
          const ey = Number(cmd[6]);
          for (let s = 1; s <= 12; s++) {
            const t = s / 12;
            const mt = 1 - t;
            const px = mt * mt * mt * curX + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * ex;
            const py = mt * mt * mt * curY + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * ey;
            pushLocal(px, py);
          }
          curX = ex;
          curY = ey;
        } else if (op === 'Z' || op === 'z') {
          if (subPts.length >= 2) emitLwPolyline(subPts, true, aci);
          subPts = [];
          curX = startX;
          curY = startY;
        }
      }
      if (subPts.length >= 2) emitLwPolyline(subPts, false, aci);
      return;
    }

    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      const decomp = fabric.util.qrDecompose(worldM);
      const pos = toCadPoint(new fabric.Point(0, 0), worldM);
      const txt = String((obj as any).text || '').replace(/\r?\n/g, ' ');
      const fontHeight = ((obj as any).fontSize || 16) * Math.abs(decomp.scaleY || 1);
      entities.push(
        '0', 'TEXT', '8', '0', '62', String(aci),
        '10', pos.x.toFixed(3), '20', pos.y.toFixed(3), '30', '0.0',
        '40', fontHeight.toFixed(2),
        '50', (-decomp.angle).toFixed(2),
        '1', txt
      );
      return;
    }

    const br = obj.getBoundingRect();
    emitLwPolyline(
      [
        { x: br.left, y: h - br.top },
        { x: br.left + br.width, y: h - br.top },
        { x: br.left + br.width, y: h - (br.top + br.height) },
        { x: br.left, y: h - (br.top + br.height) },
      ],
      true,
      aci
    );
  };

  withIdentityViewport(canvas, () => {
    const activeObj = canvas.getActiveObject();
    const isSelectionExport =
      activeObj &&
      (settings?.exportRange === 'selection' || settings?.pageSizeMode === 'selected_objects');
    const objs = isSelectionExport
      ? activeObj.type === 'activeselection'
        ? (activeObj as fabric.ActiveSelection).getObjects()
        : [activeObj]
      : canvas.getObjects();
    objs.forEach((o) => emitObject(o));
  });

  const header = [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1015',
    '9', '$INSUNITS', '70', '4',
    '9', '$EXTMIN', '10', '0.0', '20', '0.0', '30', '0.0',
    '9', '$EXTMAX', '10', w.toFixed(2), '20', h.toFixed(2), '30', '0.0',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER', '70', '1',
    '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS',
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES',
  ];

  return [...header, ...entities, '0', 'ENDSEC', '0', 'EOF'].join('\n');
}

let _colorParseCtx: CanvasRenderingContext2D | null = null;
function parseCssColorToRgb(
  color: unknown,
  grayscale = false
): { r: number; g: number; b: number; a: number } | null {
  if (typeof color !== 'string') return null;
  const trimmed = color.trim();
  if (!trimmed || trimmed.toLowerCase() === 'transparent' || trimmed.toLowerCase() === 'none') {
    return null;
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
      if (hex.length === 4) a = parseInt(hex[3] + hex[3], 16) / 255;
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
    }
  } else if (/^rgba?\(/i.test(trimmed)) {
    const nums = trimmed.match(/[\d.]+/g);
    if (nums && nums.length >= 3) {
      r = Number(nums[0]);
      g = Number(nums[1]);
      b = Number(nums[2]);
      if (nums.length >= 4) a = Number(nums[3]);
    }
  } else {
    if (!_colorParseCtx && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      _colorParseCtx = c.getContext('2d');
    }
    if (_colorParseCtx) {
      _colorParseCtx.clearRect(0, 0, 1, 1);
      _colorParseCtx.fillStyle = '#000000';
      _colorParseCtx.fillStyle = trimmed;
      const normalized = _colorParseCtx.fillStyle;
      if (normalized && normalized.startsWith('#')) {
        return parseCssColorToRgb(normalized, grayscale);
      }
      if (normalized && /^rgba?\(/i.test(normalized)) {
        return parseCssColorToRgb(normalized, grayscale);
      }
    }
  }

  if (a <= 0.001) return null;
  if (grayscale) {
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    r = lum;
    g = lum;
    b = lum;
  }
  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
    a,
  };
}

function mapPdfFontFamily(fontFamily?: string): 'helvetica' | 'times' | 'courier' {
  const f = (fontFamily || '').toLowerCase();
  if (f.includes('times') || f.includes('georgia') || f.includes('garamond') || f.includes('serif') && !f.includes('sans')) {
    return 'times';
  }
  if (f.includes('courier') || f.includes('consolas') || f.includes('monaco') || f.includes('mono')) {
    return 'courier';
  }
  return 'helvetica';
}

function mapPdfFontStyle(weight?: string | number, style?: string): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  const isBold =
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900' ||
    (typeof weight === 'number' && weight >= 600);
  const isItalic = style === 'italic' || style === 'oblique';
  if (isBold && isItalic) return 'bolditalic';
  if (isBold) return 'bold';
  if (isItalic) return 'italic';
  return 'normal';
}

function emitFabricObjectPathToPdf(
  pdf: jsPDF,
  obj: fabric.FabricObject,
  tx: (lx: number, ly: number) => [number, number]
): { emitted: boolean; isOpenLine: boolean } {
  const type = obj.type;
  const k = 0.552284749831;

  if (type === 'rect') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const x0 = -w / 2;
    const y0 = -h / 2;
    const x1 = w / 2;
    const y1 = h / 2;
    const rx = Math.min(w / 2, Math.max(0, (obj as any).rx || 0));
    const ry = Math.min(h / 2, Math.max(0, (obj as any).ry || 0));

    if (rx > 0.01 || ry > 0.01) {
      const kx = rx * k;
      const ky = ry * k;
      pdf.moveTo(...tx(x0 + rx, y0));
      pdf.lineTo(...tx(x1 - rx, y0));
      pdf.curveTo(...tx(x1 - rx + kx, y0), ...tx(x1, y0 + ry - ky), ...tx(x1, y0 + ry));
      pdf.lineTo(...tx(x1, y1 - ry));
      pdf.curveTo(...tx(x1, y1 - ry + ky), ...tx(x1 - rx + kx, y1), ...tx(x1 - rx, y1));
      pdf.lineTo(...tx(x0 + rx, y1));
      pdf.curveTo(...tx(x0 + rx - kx, y1), ...tx(x0, y1 - ry + ky), ...tx(x0, y1 - ry));
      pdf.lineTo(...tx(x0, y0 + ry));
      pdf.curveTo(...tx(x0, y0 + ry - ky), ...tx(x0 + rx - kx, y0), ...tx(x0 + rx, y0));
      pdf.close();
    } else {
      pdf.moveTo(...tx(x0, y0));
      pdf.lineTo(...tx(x1, y0));
      pdf.lineTo(...tx(x1, y1));
      pdf.lineTo(...tx(x0, y1));
      pdf.close();
    }
    return { emitted: true, isOpenLine: false };
  }

  if (type === 'circle' || type === 'ellipse') {
    const rx =
      type === 'circle'
        ? (obj as fabric.Circle).radius || (obj.width || 0) / 2
        : (obj as fabric.Ellipse).rx || (obj.width || 0) / 2;
    const ry =
      type === 'circle'
        ? (obj as fabric.Circle).radius || (obj.height || 0) / 2
        : (obj as fabric.Ellipse).ry || (obj.height || 0) / 2;
    if (rx <= 0 || ry <= 0) return { emitted: false, isOpenLine: false };
    const ox = rx * k;
    const oy = ry * k;
    pdf.moveTo(...tx(rx, 0));
    pdf.curveTo(...tx(rx, oy), ...tx(ox, ry), ...tx(0, ry));
    pdf.curveTo(...tx(-ox, ry), ...tx(-rx, oy), ...tx(-rx, 0));
    pdf.curveTo(...tx(-rx, -oy), ...tx(-ox, -ry), ...tx(0, -ry));
    pdf.curveTo(...tx(ox, -ry), ...tx(rx, -oy), ...tx(rx, 0));
    pdf.close();
    return { emitted: true, isOpenLine: false };
  }

  if (type === 'triangle') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    pdf.moveTo(...tx(0, -h / 2));
    pdf.lineTo(...tx(w / 2, h / 2));
    pdf.lineTo(...tx(-w / 2, h / 2));
    pdf.close();
    return { emitted: true, isOpenLine: false };
  }

  if (type === 'line') {
    const lp = (obj as fabric.Line).calcLinePoints();
    pdf.moveTo(...tx(lp.x1, lp.y1));
    pdf.lineTo(...tx(lp.x2, lp.y2));
    return { emitted: true, isOpenLine: true };
  }

  if (type === 'polygon' || type === 'polyline') {
    const pts = (obj as any).points as { x: number; y: number }[] | undefined;
    if (!pts || pts.length < 2) return { emitted: false, isOpenLine: false };
    const ox = (obj as any).pathOffset?.x || 0;
    const oy = (obj as any).pathOffset?.y || 0;
    pdf.moveTo(...tx(pts[0].x - ox, pts[0].y - oy));
    for (let i = 1; i < pts.length; i++) {
      pdf.lineTo(...tx(pts[i].x - ox, pts[i].y - oy));
    }
    if (type === 'polygon') {
      pdf.close();
      return { emitted: true, isOpenLine: false };
    }
    return { emitted: true, isOpenLine: true };
  }

  if (type === 'path') {
    const cmds = (obj as fabric.Path).path as any[][] | undefined;
    if (!cmds || cmds.length === 0) return { emitted: false, isOpenLine: false };
    const ox = (obj as any).pathOffset?.x || 0;
    const oy = (obj as any).pathOffset?.y || 0;
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    let hasCmd = false;

    for (const cmd of cmds) {
      const op = String(cmd[0]);
      const up = op.toUpperCase();
      if (up === 'M') {
        curX = Number(cmd[1]);
        curY = Number(cmd[2]);
        startX = curX;
        startY = curY;
        pdf.moveTo(...tx(curX - ox, curY - oy));
        hasCmd = true;
      } else if (up === 'L') {
        curX = Number(cmd[1]);
        curY = Number(cmd[2]);
        pdf.lineTo(...tx(curX - ox, curY - oy));
        hasCmd = true;
      } else if (up === 'H') {
        curX = Number(cmd[1]);
        pdf.lineTo(...tx(curX - ox, curY - oy));
        hasCmd = true;
      } else if (up === 'V') {
        curY = Number(cmd[1]);
        pdf.lineTo(...tx(curX - ox, curY - oy));
        hasCmd = true;
      } else if (up === 'C') {
        const x1 = Number(cmd[1]);
        const y1 = Number(cmd[2]);
        const x2 = Number(cmd[3]);
        const y2 = Number(cmd[4]);
        const x3 = Number(cmd[5]);
        const y3 = Number(cmd[6]);
        pdf.curveTo(
          ...tx(x1 - ox, y1 - oy),
          ...tx(x2 - ox, y2 - oy),
          ...tx(x3 - ox, y3 - oy)
        );
        curX = x3;
        curY = y3;
        hasCmd = true;
      } else if (up === 'Q') {
        const cx = Number(cmd[1]);
        const cy = Number(cmd[2]);
        const x = Number(cmd[3]);
        const y = Number(cmd[4]);
        const cp1x = curX + (2 / 3) * (cx - curX);
        const cp1y = curY + (2 / 3) * (cy - curY);
        const cp2x = x + (2 / 3) * (cx - x);
        const cp2y = y + (2 / 3) * (cy - y);
        pdf.curveTo(
          ...tx(cp1x - ox, cp1y - oy),
          ...tx(cp2x - ox, cp2y - oy),
          ...tx(x - ox, y - oy)
        );
        curX = x;
        curY = y;
        hasCmd = true;
      } else if (up === 'Z') {
        pdf.close();
        curX = startX;
        curY = startY;
      }
    }
    return { emitted: hasCmd, isOpenLine: false };
  }

  return { emitted: false, isOpenLine: false };
}

function renderGradientCanvasForObject(
  obj: fabric.FabricObject,
  grayscale: boolean
): string | null {
  const fillObj = obj.fill as any;
  if (!fillObj || typeof fillObj !== 'object' || !Array.isArray(fillObj.colorStops)) {
    return null;
  }
  const w = Math.max(32, Math.min(1024, Math.ceil(obj.width || 128)));
  const h = Math.max(32, Math.min(1024, Math.ceil(obj.height || 128)));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return null;

  const coords = fillObj.coords || { x1: 0, y1: 0, x2: w, y2: 0 };
  const isRadial = fillObj.type === 'radial';
  const grad = isRadial
    ? ctx.createRadialGradient(
        coords.x1 ?? w / 2,
        coords.y1 ?? h / 2,
        coords.r1 ?? 0,
        coords.x2 ?? w / 2,
        coords.y2 ?? h / 2,
        coords.r2 ?? Math.max(w, h) / 2
      )
    : ctx.createLinearGradient(
        coords.x1 ?? 0,
        coords.y1 ?? 0,
        coords.x2 ?? w,
        coords.y2 ?? 0
      );

  for (const stop of fillObj.colorStops) {
    const rgb = parseCssColorToRgb(stop.color, grayscale);
    const colStr = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})` : 'rgba(0,0,0,0)';
    grad.addColorStop(Math.max(0, Math.min(1, Number(stop.offset) || 0)), colStr);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return off.toDataURL('image/png');
}

function renderFabricObjectToPdf(
  pdf: jsPDF,
  obj: fabric.FabricObject,
  bounds: { left: number; top: number; width: number; height: number },
  marginPt: number,
  settings: AdvancedExportSettings,
  parentOpacity = 1
): void {
  if (!obj || obj.visible === false || obj.opacity === 0) return;

  const effectiveOpacity = parentOpacity * (obj.opacity ?? 1);
  if (effectiveOpacity <= 0.001) return;

  const grayscale = settings.outputColor === 'Grayscale';

  // Groups & ActiveSelections: recursively render child vector objects with composed matrix
  if (obj.type === 'group' || obj.type === 'activeselection') {
    const children = (obj as fabric.Group).getObjects?.() || [];
    for (const child of children) {
      renderFabricObjectToPdf(pdf, child, bounds, marginPt, settings, effectiveOpacity);
    }
    return;
  }

  const m = obj.calcTransformMatrix(false);
  const tx = (lx: number, ly: number): [number, number] => [
    marginPt + (m[0] * lx + m[2] * ly + m[4] - bounds.left) * PX_TO_PT,
    marginPt + (m[1] * lx + m[3] * ly + m[5] - bounds.top) * PX_TO_PT,
  ];

  pdf.saveGraphicsState();
  if (effectiveOpacity < 0.999) {
    pdf.setGState(new GState({ opacity: effectiveOpacity }));
  }

  try {
    // True bitmap images (FabricImage)
    if (obj.type === 'image') {
      const imgObj = obj as fabric.FabricImage;
      const el = (imgObj as any).getElement?.() as HTMLImageElement | HTMLCanvasElement | undefined;
      if (el) {
        const iw = (el as HTMLImageElement).naturalWidth || el.width || imgObj.width || 100;
        const ih = (el as HTMLImageElement).naturalHeight || el.height || imgObj.height || 100;
        const off = document.createElement('canvas');
        off.width = Math.max(1, iw);
        off.height = Math.max(1, ih);
        const octx = off.getContext('2d');
        if (octx) {
          if (grayscale) octx.filter = 'grayscale(100%)';
          octx.drawImage(el, 0, 0, off.width, off.height);
          const url = off.toDataURL('image/png');
          const sx = Math.hypot(m[0], m[1]);
          const sy = Math.hypot(m[2], m[3]);
          const wPt = (imgObj.width || iw) * sx * PX_TO_PT;
          const hPt = (imgObj.height || ih) * sy * PX_TO_PT;
          const angleDeg = -(Math.atan2(m[1], m[0]) * 180) / Math.PI;
          const [cxPt, cyPt] = tx(0, 0);
          const rad = (angleDeg * Math.PI) / 180;
          // jsPDF addImage rotates around bottom-left (x, y + h) in screen coords
          const xPt = cxPt - wPt / 2;
          const yPt = cyPt - hPt / 2;
          if (Math.abs(angleDeg) > 0.05) {
            const cos = Math.cos(-rad);
            const sin = Math.sin(-rad);
            const dx = -wPt / 2;
            const dy = -hPt / 2;
            const rxPt = cxPt + dx * cos - dy * sin;
            const ryPt = cyPt + dx * sin + dy * cos;
            pdf.addImage(url, 'PNG', rxPt, ryPt, wPt, hPt, undefined, 'FAST', angleDeg);
          } else {
            pdf.addImage(url, 'PNG', xPt, yPt, wPt, hPt, undefined, 'FAST', 0);
          }
        }
      }
      return;
    }

    // Vector Text objects (IText / Text / Textbox)
    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      const tObj = obj as any;
      const sx = Math.hypot(m[0], m[1]) || 1;
      const sy = Math.hypot(m[2], m[3]) || 1;
      const angleDeg = -(Math.atan2(m[1], m[0]) * 180) / Math.PI;
      const fontSizePx = Number(tObj.fontSize || 16);
      const fontSizePt = Math.max(1, fontSizePx * sy * PX_TO_PT);
      const lineHeightMult = Number(tObj.lineHeight || 1.16);
      const w = Number(tObj.width || 0);
      const h = Number(tObj.height || fontSizePx);
      const align = (tObj.textAlign === 'center' || tObj.textAlign === 'right' ? tObj.textAlign : 'left') as
        | 'left'
        | 'center'
        | 'right';

      // Optional text box background color
      const bgCol = parseCssColorToRgb(tObj.textBackgroundColor || tObj.backgroundColor, grayscale);
      if (bgCol) {
        pdf.setFillColor(bgCol.r, bgCol.g, bgCol.b);
        pdf.moveTo(...tx(-w / 2, -h / 2));
        pdf.lineTo(...tx(w / 2, -h / 2));
        pdf.lineTo(...tx(w / 2, h / 2));
        pdf.lineTo(...tx(-w / 2, h / 2));
        pdf.close();
        pdf.fill();
      }

      const lines: string[] =
        Array.isArray(tObj.textLines) && tObj.textLines.length > 0
          ? tObj.textLines
          : String(tObj.text || '').split(/\r?\n/);

      const fillRgb = parseCssColorToRgb(tObj.fill, grayscale) || { r: 0, g: 0, b: 0, a: 1 };
      const strokeRgb =
        tObj.stroke && Number(tObj.strokeWidth || 0) > 0
          ? parseCssColorToRgb(tObj.stroke, grayscale)
          : null;

      pdf.setFont(mapPdfFontFamily(tObj.fontFamily), mapPdfFontStyle(tObj.fontWeight, tObj.fontStyle));
      pdf.setFontSize(fontSizePt);
      pdf.setTextColor(fillRgb.r, fillRgb.g, fillRgb.b);
      if (tObj.charSpacing) {
        pdf.setCharSpace((Number(tObj.charSpacing) / 1000) * fontSizePt);
      } else {
        pdf.setCharSpace(0);
      }

      const stepY = fontSizePx * lineHeightMult * 1.13;
      const startTopY = -h / 2;
      const localX = align === 'center' ? 0 : align === 'right' ? w / 2 : -w / 2;

      lines.forEach((lineStr, idx) => {
        const lineText = String(lineStr ?? '');
        if (!lineText) return;
        const baselineY = startTopY + idx * stepY + fontSizePx * 0.88;
        const [pxPt, pyPt] = tx(localX, baselineY);
        if (strokeRgb && !settings.alwaysOverprintBlack) {
          pdf.setDrawColor(strokeRgb.r, strokeRgb.g, strokeRgb.b);
          pdf.setLineWidth(Math.max(0.1, Number(tObj.strokeWidth || 1) * sx * PX_TO_PT));
          pdf.text(lineText, pxPt, pyPt, {
            align,
            angle: angleDeg,
            baseline: 'alphabetic',
            renderingMode: fillRgb ? 'fillThenStroke' : 'stroke',
          });
        } else {
          pdf.text(lineText, pxPt, pyPt, {
            align,
            angle: angleDeg,
            baseline: 'alphabetic',
          });
        }

        if (tObj.underline) {
          const uY = baselineY + fontSizePx * 0.14;
          const [ux1, uy1] = tx(-w / 2, uY);
          const [ux2, uy2] = tx(w / 2, uY);
          pdf.setDrawColor(fillRgb.r, fillRgb.g, fillRgb.b);
          pdf.setLineWidth(Math.max(0.4, fontSizePt * 0.06));
          pdf.line(ux1, uy1, ux2, uy2);
        }
        if (tObj.linethrough) {
          const lY = baselineY - fontSizePx * 0.3;
          const [lx1, ly1] = tx(-w / 2, lY);
          const [lx2, ly2] = tx(w / 2, lY);
          pdf.setDrawColor(fillRgb.r, fillRgb.g, fillRgb.b);
          pdf.setLineWidth(Math.max(0.4, fontSizePt * 0.06));
          pdf.line(lx1, ly1, lx2, ly2);
        }
      });
      pdf.setCharSpace(0);
      return;
    }

    // Vector Shapes & Paths (Rect, Circle, Ellipse, Triangle, Line, Polygon, Polyline, Path)
    const solidFill = parseCssColorToRgb(obj.fill, grayscale);
    const hasGradientFill = !solidFill && obj.fill && typeof obj.fill === 'object';
    const strokeRgb =
      obj.stroke && Number(obj.strokeWidth || 0) > 0
        ? parseCssColorToRgb(obj.stroke, grayscale)
        : null;

    if (!solidFill && !hasGradientFill && !strokeRgb) return;

    // Configure stroke style if needed
    if (strokeRgb) {
      if (settings.alwaysOverprintBlack && strokeRgb.r < 30 && strokeRgb.g < 30 && strokeRgb.b < 30) {
        pdf.setDrawColor(0, 0, 0);
      } else {
        pdf.setDrawColor(strokeRgb.r, strokeRgb.g, strokeRgb.b);
      }
      const avgScale = (Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3])) / 2 || 1;
      const strokeScale = obj.strokeUniform ? 1 : avgScale;
      const swPt = Math.max(0.05, Number(obj.strokeWidth || 1) * strokeScale * PX_TO_PT);
      pdf.setLineWidth(swPt);

      const cap = obj.strokeLineCap === 'round' ? 1 : obj.strokeLineCap === 'square' ? 2 : 0;
      const join = obj.strokeLineJoin === 'round' ? 1 : obj.strokeLineJoin === 'bevel' ? 2 : 0;
      pdf.setLineCap(cap);
      pdf.setLineJoin(join);

      if (Array.isArray(obj.strokeDashArray) && obj.strokeDashArray.length > 0) {
        pdf.setLineDashPattern(
          obj.strokeDashArray.map((d) => Math.max(0.2, Number(d) * strokeScale * PX_TO_PT)),
          (Number((obj as any).strokeDashOffset || 0)) * strokeScale * PX_TO_PT
        );
      } else {
        pdf.setLineDashPattern([], 0);
      }
    }

    // Gradient fill: clip high-res gradient inside exact vector silhouette, then vector-stroke
    if (hasGradientFill) {
      const gradUrl = renderGradientCanvasForObject(obj, grayscale);
      if (gradUrl) {
        const w = obj.width || 100;
        const h = obj.height || 100;
        const sx = Math.hypot(m[0], m[1]) || 1;
        const sy = Math.hypot(m[2], m[3]) || 1;
        const wPt = w * sx * PX_TO_PT;
        const hPt = h * sy * PX_TO_PT;
        const [cxPt, cyPt] = tx(0, 0);
        const angleDeg = -(Math.atan2(m[1], m[0]) * 180) / Math.PI;

        pdf.saveGraphicsState();
        const clipRes = emitFabricObjectPathToPdf(pdf, obj, tx);
        if (clipRes.emitted) {
          if ((obj as any).fillRule === 'evenodd') pdf.clipEvenOdd();
          else pdf.clip();
          pdf.discardPath();
          const rad = (angleDeg * Math.PI) / 180;
          if (Math.abs(angleDeg) > 0.05) {
            const cos = Math.cos(-rad);
            const sin = Math.sin(-rad);
            const dx = -wPt / 2;
            const dy = -hPt / 2;
            pdf.addImage(
              gradUrl,
              'PNG',
              cxPt + dx * cos - dy * sin,
              cyPt + dx * sin + dy * cos,
              wPt,
              hPt,
              undefined,
              'FAST',
              angleDeg
            );
          } else {
            pdf.addImage(gradUrl, 'PNG', cxPt - wPt / 2, cyPt - hPt / 2, wPt, hPt, undefined, 'FAST', 0);
          }
        }
        pdf.restoreGraphicsState();
      }
      if (strokeRgb) {
        const res = emitFabricObjectPathToPdf(pdf, obj, tx);
        if (res.emitted) pdf.stroke();
      }
      pdf.setLineDashPattern([], 0);
      return;
    }

    const evenOdd = (obj as any).fillRule === 'evenodd';

    if (solidFill) {
      pdf.setFillColor(solidFill.r, solidFill.g, solidFill.b);
    }

    const res = emitFabricObjectPathToPdf(pdf, obj, tx);
    if (!res.emitted) return;

    if (res.isOpenLine) {
      if (strokeRgb) pdf.stroke();
      else pdf.discardPath();
    } else if (solidFill && strokeRgb) {
      if (obj.paintFirst === 'stroke') {
        pdf.stroke();
        emitFabricObjectPathToPdf(pdf, obj, tx);
        if (evenOdd) pdf.fillEvenOdd();
        else pdf.fill();
      } else {
        if (evenOdd) pdf.fillStrokeEvenOdd();
        else pdf.fillStroke();
      }
    } else if (solidFill) {
      if (evenOdd) pdf.fillEvenOdd();
      else pdf.fill();
    } else if (strokeRgb) {
      pdf.stroke();
    }

    pdf.setLineDashPattern([], 0);
  } finally {
    pdf.restoreGraphicsState();
  }
}

export function buildPdfBlob(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  filename = 'design.pdf',
  settings: AdvancedExportSettings = DEFAULT_ADVANCED_EXPORT_SETTINGS
): Blob {
  const bounds = getExportBounds(canvas, pageConfig, settings);
  const boundsW_pt = bounds.width * PX_TO_PT;
  const boundsH_pt = bounds.height * PX_TO_PT;

  const bleedPt = settings.bleedLimitEnabled ? settings.bleedLimitInches * 72 : 0;
  const marksMarginPt =
    settings.cropMarks || settings.registrationMarks || settings.fileInformation || settings.densitometerScales
      ? 32
      : 0;
  const marginPt = Math.max(bleedPt, marksMarginPt);
  const docW_pt = boundsW_pt + marginPt * 2;
  const docH_pt = boundsH_pt + marginPt * 2;
  const orientation = docW_pt > docH_pt ? 'landscape' : 'portrait';

  const pdfOptions: any = {
    orientation,
    unit: 'pt',
    format: [docW_pt, docH_pt],
    compress: settings.compressTextLineArt,
  };

  if (settings.openPasswordEnabled && settings.openPassword) {
    const perms: string[] = [];
    if (settings.printingPermissions !== 'None') perms.push('print');
    if (settings.editingPermissions !== 'None') perms.push('modify');
    if (settings.enableCopyingContent) perms.push('copy');
    pdfOptions.encryption = {
      userPassword: settings.openPassword,
      ownerPassword:
        settings.permissionPasswordEnabled && settings.permissionPassword
          ? settings.permissionPassword
          : settings.openPassword,
      userPermissions: perms,
    };
  }

  const pdf = new jsPDF(pdfOptions);
  pdf.setProperties({
    title: filename.replace(/\.pdf$/i, ''),
    author: settings.author || 'user',
    keywords: settings.keywords || '',
    creator: `TraceDraw (${settings.compatibility})`,
  });

  const grayscale = settings.outputColor === 'Grayscale';

  // Vector Page Background
  const pageBg = parseCssColorToRgb(pageConfig.backgroundColor || '#ffffff', grayscale);
  if (pageBg) {
    pdf.setFillColor(pageBg.r, pageBg.g, pageBg.b);
    pdf.rect(marginPt, marginPt, boundsW_pt, boundsH_pt, 'F');
  }

  // Render all vector & text objects as pure native PDF vectors
  withIdentityViewport(canvas, () => {
    const activeObj = canvas.getActiveObject();
    const isSelectionExport =
      activeObj &&
      (settings.exportRange === 'selection' || settings.pageSizeMode === 'selected_objects');
    const objectsToExport = isSelectionExport
      ? activeObj.type === 'activeselection'
        ? (activeObj as fabric.ActiveSelection).getObjects()
        : [activeObj]
      : canvas.getObjects();

    pdf.saveGraphicsState();
    const clipX = settings.cropToPage ? marginPt : marginPt - bleedPt;
    const clipY = settings.cropToPage ? marginPt : marginPt - bleedPt;
    const clipW = settings.cropToPage ? boundsW_pt : boundsW_pt + bleedPt * 2;
    const clipH = settings.cropToPage ? boundsH_pt : boundsH_pt + bleedPt * 2;
    pdf.rect(clipX, clipY, clipW, clipH, null);
    pdf.clip();
    pdf.discardPath();

    for (const obj of objectsToExport) {
      renderFabricObjectToPdf(pdf, obj, bounds, marginPt, settings, 1);
    }

    pdf.restoreGraphicsState();
  });

  // Draw Prepress Marks when enabled
  if (marginPt > 0) {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    const x0 = marginPt;
    const y0 = marginPt;
    const x1 = marginPt + boundsW_pt;
    const y1 = marginPt + boundsH_pt;

    if (settings.cropMarks) {
      const mLen = 14;
      const gap = 4;
      pdf.line(x0 - gap - mLen, y0, x0 - gap, y0);
      pdf.line(x0, y0 - gap - mLen, x0, y0 - gap);
      pdf.line(x1 + gap, y0, x1 + gap + mLen, y0);
      pdf.line(x1, y0 - gap - mLen, x1, y0 - gap);
      pdf.line(x0 - gap - mLen, y1, x0 - gap, y1);
      pdf.line(x0, y1 + gap, x0, y1 + gap + mLen);
      pdf.line(x1 + gap, y1, x1 + gap + mLen, y1);
      pdf.line(x1, y1 + gap, x1, y1 + gap + mLen);
    }

    if (settings.registrationMarks) {
      const regPositions = [
        [docW_pt / 2, marginPt / 2],
        [docW_pt / 2, docH_pt - marginPt / 2],
        [marginPt / 2, docH_pt / 2],
        [docW_pt - marginPt / 2, docH_pt / 2],
      ];
      regPositions.forEach(([rx, ry]) => {
        pdf.circle(rx, ry, 5, 'S');
        pdf.line(rx - 7, ry, rx + 7, ry);
        pdf.line(rx, ry - 7, rx, ry + 7);
      });
    }

    if (settings.fileInformation) {
      pdf.setFontSize(7);
      pdf.setTextColor(60, 60, 60);
      pdf.text(
        `${filename} | ${settings.outputColor} | ${settings.compatibility} | ${new Date().toLocaleDateString()}`,
        marginPt,
        docH_pt - 8
      );
    }

    if (settings.densitometerScales) {
      const steps = [0, 25, 50, 75, 100];
      steps.forEach((pct, idx) => {
        const shade = Math.round(255 - (pct / 100) * 255);
        pdf.setFillColor(shade, shade, shade);
        pdf.rect(marginPt + idx * 14, 6, 12, 8, 'F');
      });
    }
  }

  return pdf.output('blob');
}

export async function exportWithSettings(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  format: NuraExportFormat,
  filename: string,
  settings: AdvancedExportSettings,
  fileHandle?: any | null,
  dirHandle?: any | null,
  extraNdrData?: NdrProjectExtraData
): Promise<'file_handle' | 'dir_handle' | 'download'> {
  const bounds = getExportBounds(canvas, pageConfig, settings);
  const grayscale = settings.outputColor === 'Grayscale';
  const multiplier = Math.max(1, Math.min(4, settings.colorDpi / 96));

  let blob: Blob;

  if (format.kind === 'pdf') {
    blob = buildPdfBlob(canvas, pageConfig, filename, settings);
  } else if (format.kind === 'json') {
    const projectData = {
      appName: 'TraceDraw',
      version: '1.0',
      createdAt: new Date().toISOString(),
      author: settings.author,
      keywords: settings.keywords,
      pageConfig,
      canvasData: canvas.toJSON(),
    };
    blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
  } else if (format.ext === 'ndr') {
    const ndrContent = buildNdrString(canvas, pageConfig, {
      ...extraNdrData,
      author: settings.author,
      keywords: settings.keywords,
    });
    blob = new Blob([ndrContent], { type: 'image/svg+xml;charset=utf-8' });
  } else if (format.ext === 'svg') {
    const svgString = withIdentityViewport(canvas, () =>
      canvas.toSVG({
        viewBox: {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height,
        },
        width: `${bounds.width * PX_TO_PT}pt`,
        height: `${bounds.height * PX_TO_PT}pt`,
      })
    );
    blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  } else if (format.ext === 'dxf' || format.ext === 'dwg') {
    blob = new Blob([buildDxfString(canvas, pageConfig, settings)], { type: format.mime });
  } else if (format.ext === 'eps' || format.ext === 'ai') {
    const wPt = bounds.width * PX_TO_PT;
    const hPt = bounds.height * PX_TO_PT;
    const svgString = withIdentityViewport(canvas, () =>
      canvas.toSVG({
        viewBox: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
        width: `${wPt}pt`,
        height: `${hPt}pt`,
      })
    );
    const header = `%!PS-Adobe-3.0 EPSF-3.0\n%%Title: ${filename}\n%%Creator: TraceDraw (${settings.author})\n%%BoundingBox: 0 0 ${Math.round(wPt)} ${Math.round(hPt)}\n%%EndComments\n% Embedded Vector SVG Payload\n`;
    blob = new Blob([header + svgString], { type: format.mime });
  } else if (format.ext === 'doc') {
    const el = await renderCanvasToRealElement(canvas, bounds, multiplier, grayscale, '#ffffff');
    const pngUrl = el.toDataURL('image/png');
    const htmlDoc = `<html><head><meta charset="utf-8"><title>${filename}</title></head><body><img src="${pngUrl}" width="${Math.round(bounds.width)}" height="${Math.round(bounds.height)}" /></body></html>`;
    blob = new Blob([htmlDoc], { type: 'application/msword' });
  } else if (format.ext === 'bmp') {
    const el = await renderCanvasToRealElement(canvas, bounds, multiplier, grayscale, '#ffffff');
    blob = encodeBmp24(el);
  } else if (format.ext === 'ico' || format.ext === 'cur') {
    const el = await renderCanvasToRealElement(canvas, bounds, multiplier, grayscale);
    blob = await encodeIcoOrCur(el, format.ext === 'cur');
  } else if (format.ext === 'jpg' || format.ext === 'jp2') {
    const el = await renderCanvasToRealElement(canvas, bounds, multiplier, grayscale, '#ffffff');
    const quality = Math.max(0.1, Math.min(1, settings.jpegQuality / 100));
    blob = await new Promise<Blob>((resolve) =>
      el.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality)
    );
  } else if (format.ext === 'webp') {
    const el = await renderCanvasToRealElement(canvas, bounds, multiplier, grayscale);
    const quality = Math.max(0.1, Math.min(1, settings.jpegQuality / 100));
    blob = await new Promise<Blob>((resolve) =>
      el.toBlob((b) => resolve(b || new Blob()), 'image/webp', quality)
    );
  } else if (format.kind === 'vector') {
    const svgString = withIdentityViewport(canvas, () =>
      canvas.toSVG({
        viewBox: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
        width: `${bounds.width * PX_TO_PT}pt`,
        height: `${bounds.height * PX_TO_PT}pt`,
      })
    );
    blob = new Blob([svgString], { type: format.mime });
  } else {
    // Raster fallback (png / gif / cal / img / mac / pfb)
    const el = await renderCanvasToRealElement(
      canvas,
      bounds,
      multiplier,
      grayscale,
      format.ext === 'png' ? undefined : '#ffffff'
    );
    blob = await new Promise<Blob>((resolve) =>
      el.toBlob((b) => resolve(b || new Blob()), 'image/png')
    );
  }

  return saveBlobToChosenLocation(blob, filename, fileHandle, dirHandle);
}

// Legacy quick-export helpers kept compatible for one-click shortcuts
export function exportAsSVG(canvas: fabric.Canvas, pageConfig: PageConfig, filename = 'design.svg') {
  const svgString = withIdentityViewport(canvas, () =>
    canvas.toSVG({
      viewBox: {
        x: 0,
        y: 0,
        width: pageConfig.width,
        height: pageConfig.height,
      },
      width: `${pageConfig.width * PX_TO_PT}pt`,
      height: `${pageConfig.height * PX_TO_PT}pt`,
    })
  );
  triggerDownloadBlob(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export function exportAsPNG(canvas: fabric.Canvas, pageConfig: PageConfig, multiplier = 2, filename = 'design.png') {
  const dataURL = withIdentityViewport(canvas, () =>
    canvas.toDataURL({
      format: 'png',
      multiplier,
      left: 0,
      top: 0,
      width: pageConfig.width,
      height: pageConfig.height,
    })
  );
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportAsPDF(canvas: fabric.Canvas, pageConfig: PageConfig, filename = 'design.pdf') {
  const blob = buildPdfBlob(canvas, pageConfig, filename, DEFAULT_ADVANCED_EXPORT_SETTINGS);
  triggerDownloadBlob(blob, filename);
}

export function exportAsDWG(canvas: fabric.Canvas, pageConfig: PageConfig, filename = 'design.dwg') {
  const finalName = filename.toLowerCase().endsWith('.dwg') ? filename : `${filename}.dwg`;
  const cadString = buildDxfString(canvas, pageConfig);
  triggerDownloadBlob(new Blob([cadString], { type: 'application/acad' }), finalName);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export interface NdrProjectExtraData {
  author?: string;
  keywords?: string;
  compatVersion?: string;
  pages?: PageConfig[];
  activePageIndex?: number;
  pageCanvases?: Record<number, string>;
  serializeProps?: string[];
  parametricState?: ParametricState;
}

export function buildNdrString(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  extra?: NdrProjectExtraData
): string {
  const wPt = pageConfig.width * PX_TO_PT;
  const hPt = pageConfig.height * PX_TO_PT;

  const svgBody = withIdentityViewport(canvas, () =>
    canvas.toSVG({
      viewBox: {
        x: 0,
        y: 0,
        width: pageConfig.width,
        height: pageConfig.height,
      },
      width: `${wPt}pt`,
      height: `${hPt}pt`,
    })
  );

  const canvasData = extra?.serializeProps
    ? canvas.toObject(extra.serializeProps as any)
    : canvas.toJSON();

  const projectPayload = {
    appName: 'Nura Draw',
    format: 'ndr',
    formatName: 'Nura Draw (.ndr)',
    version: '2.0',
    compatVersion: extra?.compatVersion || '25.1 (2024.1)',
    createdAt: new Date().toISOString(),
    author: extra?.author || 'user',
    keywords: extra?.keywords || '',
    pageConfig,
    pages: extra?.pages,
    activePageIndex: extra?.activePageIndex ?? 0,
    pageCanvases: extra?.pageCanvases,
    parametricState: extra?.parametricState,
    canvasData,
  };

  const encoded = utf8ToBase64(JSON.stringify(projectPayload));
  const metadataTag = `\n  <metadata id="tracedraw-ndr-project" data-format="ndr" data-version="2.0">${encoded}</metadata>\n`;

  const closeIdx = svgBody.lastIndexOf('</svg>');
  if (closeIdx >= 0) {
    return svgBody.slice(0, closeIdx) + metadataTag + svgBody.slice(closeIdx);
  }
  return `${svgBody}\n<!-- TRACEDRAW_NDR:${encoded} -->`;
}

export function exportAsNDR(
  canvas: fabric.Canvas,
  pageConfig: PageConfig,
  filename = 'Untitled-1.ndr',
  extra?: NdrProjectExtraData
) {
  const finalName = filename.toLowerCase().endsWith('.ndr') ? filename : `${filename}.ndr`;
  const ndrString = buildNdrString(canvas, pageConfig, extra);
  triggerDownloadBlob(
    new Blob([ndrString], { type: 'image/svg+xml;charset=utf-8' }),
    finalName
  );
}

export function exportAsJSON(canvas: fabric.Canvas, pageConfig: PageConfig, filename = 'project.ndr') {
  exportAsNDR(canvas, pageConfig, filename);
}

export interface FullNdrLoadMeta {
  pages?: PageConfig[];
  activePageIndex?: number;
  pageCanvases?: Record<number, string>;
  parametricState?: ParametricState;
}

export async function importFromJSON(
  file: File,
  canvas: fabric.Canvas,
  onPageConfigLoaded?: (config: PageConfig, fullMeta?: FullNdrLoadMeta) => void
): Promise<boolean> {
  try {
    const text = await file.text();
    const trimmed = text.trim();

    let data: any = null;

    // 1. Check embedded lossless NDR metadata inside SVG container
    const metaMatch = trimmed.match(
      /<metadata[^>]*id=["']tracedraw-ndr-project["'][^>]*>([\s\S]*?)<\/metadata>/i
    );
    if (metaMatch && metaMatch[1]) {
      data = JSON.parse(base64ToUtf8(metaMatch[1]));
    } else {
      const commentMatch = trimmed.match(/<!--\s*TRACEDRAW_NDR:([A-Za-z0-9+/=]+)\s*-->/);
      if (commentMatch && commentMatch[1]) {
        data = JSON.parse(base64ToUtf8(commentMatch[1]));
      }
    }

    // 2. Fallback: raw JSON (.ndr / .nuradraw / .json)
    if (!data && trimmed.startsWith('{')) {
      data = JSON.parse(trimmed);
    }

    if (data) {
      const fullMeta: FullNdrLoadMeta | undefined =
        data.pages || data.pageCanvases || data.parametricState
          ? {
              pages: data.pages,
              activePageIndex: data.activePageIndex,
              pageCanvases: data.pageCanvases,
              parametricState: data.parametricState,
            }
          : undefined;

      if (data.pageConfig && onPageConfigLoaded) {
        onPageConfigLoaded(data.pageConfig, fullMeta);
      }

      const canvasData = data.canvasData || data;
      await canvas.loadFromJSON(canvasData);
      canvas.forEachObject((obj) => disableObjectCaching(obj));
      canvas.renderAll();
      return true;
    }

    // 3. Fallback: external plain SVG saved or renamed with .ndr
    if (trimmed.includes('<svg')) {
      const result = await fabric.loadSVGFromString(trimmed);
      const objs = (result.objects || []).filter(Boolean) as fabric.FabricObject[];
      canvas.clear();
      objs.forEach((o) => {
        disableObjectCaching(o);
        canvas.add(o);
      });
      canvas.renderAll();
      return true;
    }

    // 4. Fallback: CAD DWG/DXF ASCII entity stream
    if (trimmed.includes('ENTITIES') && (trimmed.includes('SECTION') || trimmed.includes('LWPOLYLINE') || trimmed.includes('LINE'))) {
      const rawLines = text.split(/\r?\n/);
      const pairs: Array<{ code: number; value: string }> = [];
      for (let i = 0; i + 1 < rawLines.length; i += 2) {
        const code = parseInt(rawLines[i].trim(), 10);
        if (!Number.isNaN(code)) {
          pairs.push({ code, value: rawLines[i + 1].trim() });
        }
      }
      const pageH = canvas.getHeight() || 792;
      const imported: fabric.FabricObject[] = [];
      let inEntities = false;
      let curType = '';
      let entityTags: Array<{ code: number; value: string }> = [];

      const flushEntity = () => {
        if (!curType || entityTags.length === 0) return;
        const getNum = (c: number, def = 0) => {
          const found = entityTags.find((t) => t.code === c);
          return found ? Number(found.value) || def : def;
        };
        const getStr = (c: number, def = '') => {
          const found = entityTags.find((t) => t.code === c);
          return found ? found.value : def;
        };

        if (curType === 'LINE') {
          const x1 = getNum(10);
          const y1 = pageH - getNum(20);
          const x2 = getNum(11);
          const y2 = pageH - getNum(21);
          imported.push(new fabric.Line([x1, y1, x2, y2], { stroke: '#111827', strokeWidth: 1.5, fill: 'transparent' }));
        } else if (curType === 'CIRCLE') {
          const cx = getNum(10);
          const cy = pageH - getNum(20);
          const r = Math.max(1, getNum(40, 10));
          imported.push(
            new fabric.Circle({
              left: cx - r,
              top: cy - r,
              radius: r,
              fill: 'transparent',
              stroke: '#111827',
              strokeWidth: 1.5,
            })
          );
        } else if (curType === 'LWPOLYLINE') {
          const xs = entityTags.filter((t) => t.code === 10).map((t) => Number(t.value) || 0);
          const ys = entityTags.filter((t) => t.code === 20).map((t) => pageH - (Number(t.value) || 0));
          const isClosed = (getNum(70, 0) & 1) === 1;
          const pts = xs.map((x, idx) => ({ x, y: ys[idx] ?? pageH }));
          if (pts.length >= 2) {
            const Ctor = isClosed ? fabric.Polygon : fabric.Polyline;
            imported.push(new Ctor(pts, { fill: 'transparent', stroke: '#111827', strokeWidth: 1.5 }));
          }
        } else if (curType === 'TEXT') {
          const x = getNum(10);
          const y = pageH - getNum(20);
          const fontSize = Math.max(6, getNum(40, 16));
          const angle = -getNum(50, 0);
          const content = getStr(1, '');
          if (content) {
            imported.push(new fabric.IText(content, { left: x, top: y, fontSize, angle, fill: '#111827' }));
          }
        }
      };

      for (const p of pairs) {
        if (p.code === 2 && p.value === 'ENTITIES') {
          inEntities = true;
          continue;
        }
        if (inEntities && p.code === 0 && p.value === 'ENDSEC') {
          flushEntity();
          inEntities = false;
          continue;
        }
        if (!inEntities) continue;
        if (p.code === 0) {
          flushEntity();
          curType = p.value;
          entityTags = [];
        } else {
          entityTags.push(p);
        }
      }

      if (imported.length > 0) {
        canvas.clear();
        imported.forEach((o) => {
          disableObjectCaching(o);
          canvas.add(o);
        });
        canvas.renderAll();
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Failed to import project file:', err);
    return false;
  }
}
