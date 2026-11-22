import QRCode from 'qrcode';
import * as fabric from 'fabric';
import { disableObjectCaching, ensureObjectId } from './canvasHelpers';

export type QrDataType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms';
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';
export type QrModuleStyle = 'square' | 'rounded' | 'dots';
export type QrEyeStyle = 'square' | 'rounded' | 'circle';

export interface QrConfig {
  dataType: QrDataType;
  url: string;
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: 'WPA' | 'WEP' | 'nopass';
  wifiHidden: boolean;
  vcardName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardCompany: string;
  vcardWebsite: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
  smsPhone: string;
  smsMessage: string;
  ecc: QrErrorCorrection;
  sizePx: number;
  marginModules: number;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  useCustomEyeColor: boolean;
  eyeColor: string;
  moduleStyle: QrModuleStyle;
  eyeStyle: QrEyeStyle;
  showCaption: boolean;
  caption: string;
}

export const DEFAULT_QR_CONFIG: QrConfig = {
  dataType: 'url',
  url: 'https://example.com',
  text: 'Hello from NuraDraw Vector QR',
  wifiSsid: 'MyNetwork',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  wifiHidden: false,
  vcardName: 'John Doe',
  vcardPhone: '+1-555-0100',
  vcardEmail: 'john@example.com',
  vcardCompany: 'Studio Design',
  vcardWebsite: 'https://example.com',
  emailTo: 'hello@example.com',
  emailSubject: 'Hello',
  emailBody: '',
  phone: '+1-555-0100',
  smsPhone: '+1-555-0100',
  smsMessage: 'Hello!',
  ecc: 'M',
  sizePx: 220,
  marginModules: 2,
  fgColor: '#000000',
  bgColor: '#ffffff',
  transparentBg: false,
  useCustomEyeColor: false,
  eyeColor: '#0078d7',
  moduleStyle: 'square',
  eyeStyle: 'square',
  showCaption: false,
  caption: 'SCAN ME',
};

function escapeWifiValue(v: string): string {
  return v.replace(/([\\;,:"])/g, '\\$1');
}

export function buildQrPayload(cfg: QrConfig): string {
  switch (cfg.dataType) {
    case 'url':
      return (cfg.url || '').trim() || 'https://example.com';
    case 'text':
      return cfg.text || ' ';
    case 'wifi': {
      const ssid = escapeWifiValue(cfg.wifiSsid.trim() || 'MyNetwork');
      const pass = cfg.wifiSecurity === 'nopass' ? '' : escapeWifiValue(cfg.wifiPassword);
      const hidden = cfg.wifiHidden ? 'true' : 'false';
      return `WIFI:T:${cfg.wifiSecurity};S:${ssid};P:${pass};H:${hidden};;`;
    }
    case 'vcard': {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${cfg.vcardName.trim() || 'Contact'}`,
        cfg.vcardCompany.trim() ? `ORG:${cfg.vcardCompany.trim()}` : '',
        cfg.vcardPhone.trim() ? `TEL:${cfg.vcardPhone.trim()}` : '',
        cfg.vcardEmail.trim() ? `EMAIL:${cfg.vcardEmail.trim()}` : '',
        cfg.vcardWebsite.trim() ? `URL:${cfg.vcardWebsite.trim()}` : '',
        'END:VCARD',
      ].filter(Boolean);
      return lines.join('\n');
    }
    case 'email': {
      const to = cfg.emailTo.trim();
      const params = new URLSearchParams();
      if (cfg.emailSubject.trim()) params.set('subject', cfg.emailSubject.trim());
      if (cfg.emailBody.trim()) params.set('body', cfg.emailBody.trim());
      const q = params.toString();
      return `mailto:${to}${q ? `?${q}` : ''}`;
    }
    case 'phone':
      return `tel:${cfg.phone.trim() || '+15550100'}`;
    case 'sms':
      return `smsto:${cfg.smsPhone.trim() || '+15550100'}:${cfg.smsMessage}`;
  }
}

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function rectPathCW(x: number, y: number, w: number, h: number): string {
  return `M${fmt(x)} ${fmt(y)}H${fmt(x + w)}V${fmt(y + h)}H${fmt(x)}Z`;
}

function rectPathCCW(x: number, y: number, w: number, h: number): string {
  return `M${fmt(x)} ${fmt(y)}V${fmt(y + h)}H${fmt(x + w)}V${fmt(y)}Z`;
}

function roundedRectPathCW(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0.001) return rectPathCW(x, y, w, h);
  return (
    `M${fmt(x + rad)} ${fmt(y)}` +
    `H${fmt(x + w - rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 1 ${fmt(x + w)} ${fmt(y + rad)}` +
    `V${fmt(y + h - rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 1 ${fmt(x + w - rad)} ${fmt(y + h)}` +
    `H${fmt(x + rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 1 ${fmt(x)} ${fmt(y + h - rad)}` +
    `V${fmt(y + rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 1 ${fmt(x + rad)} ${fmt(y)}Z`
  );
}

function roundedRectPathCCW(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0.001) return rectPathCCW(x, y, w, h);
  return (
    `M${fmt(x + rad)} ${fmt(y)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 0 ${fmt(x)} ${fmt(y + rad)}` +
    `V${fmt(y + h - rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 0 ${fmt(x + rad)} ${fmt(y + h)}` +
    `H${fmt(x + w - rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 0 ${fmt(x + w)} ${fmt(y + h - rad)}` +
    `V${fmt(y + rad)}` +
    `A${fmt(rad)} ${fmt(rad)} 0 0 0 ${fmt(x + w - rad)} ${fmt(y)}Z`
  );
}

function circlePathCW(cx: number, cy: number, r: number): string {
  return (
    `M${fmt(cx + r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx - r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx + r)} ${fmt(cy)}Z`
  );
}

function circlePathCCW(cx: number, cy: number, r: number): string {
  return (
    `M${fmt(cx + r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}Z`
  );
}

function isFinderCell(row: number, col: number, count: number): boolean {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= count - 7) return true;
  if (row >= count - 7 && col < 7) return true;
  return false;
}

function buildFinderEyePath(
  originX: number,
  originY: number,
  cell: number,
  eyeStyle: QrEyeStyle
): string {
  const outerSize = 7 * cell;
  const innerOffset = cell;
  const innerSize = 5 * cell;
  const coreOffset = 2 * cell;
  const coreSize = 3 * cell;

  if (eyeStyle === 'circle') {
    const cx = originX + outerSize / 2;
    const cy = originY + outerSize / 2;
    return (
      circlePathCW(cx, cy, outerSize / 2) +
      circlePathCCW(cx, cy, innerSize / 2) +
      circlePathCW(cx, cy, coreSize / 2)
    );
  }

  if (eyeStyle === 'rounded') {
    const outerR = cell * 1.65;
    const innerR = cell * 1.05;
    const coreR = cell * 0.75;
    return (
      roundedRectPathCW(originX, originY, outerSize, outerSize, outerR) +
      roundedRectPathCCW(originX + innerOffset, originY + innerOffset, innerSize, innerSize, innerR) +
      roundedRectPathCW(originX + coreOffset, originY + coreOffset, coreSize, coreSize, coreR)
    );
  }

  return (
    rectPathCW(originX, originY, outerSize, outerSize) +
    rectPathCCW(originX + innerOffset, originY + innerOffset, innerSize, innerSize) +
    rectPathCW(originX + coreOffset, originY + coreOffset, coreSize, coreSize)
  );
}

export interface GeneratedQrGeometry {
  payload: string;
  moduleCount: number;
  cellSize: number;
  totalWidth: number;
  totalHeight: number;
  captionHeight: number;
  eyesPathD: string;
  dataPathD: string;
  svgString: string;
  error?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateQrGeometry(cfg: QrConfig): GeneratedQrGeometry {
  const payload = buildQrPayload(cfg);
  const size = Math.max(60, Math.min(1200, Number(cfg.sizePx) || 220));
  const margin = Math.max(0, Math.min(8, Math.round(cfg.marginModules)));

  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: cfg.ecc });
    const count = qr.modules.size;
    const data = qr.modules.data;
    const totalModules = count + margin * 2;
    const cell = size / totalModules;
    const offset = margin * cell;

    // Build 3 finder eye rings + cores
    const eyesParts = [
      buildFinderEyePath(offset, offset, cell, cfg.eyeStyle),
      buildFinderEyePath(offset + (count - 7) * cell, offset, cell, cfg.eyeStyle),
      buildFinderEyePath(offset, offset + (count - 7) * cell, cell, cfg.eyeStyle),
    ];
    const eyesPathD = eyesParts.join('');

    // Build data modules (excluding finder regions)
    const dataParts: string[] = [];
    if (cfg.moduleStyle === 'square') {
      for (let r = 0; r < count; r++) {
        let c = 0;
        while (c < count) {
          const isDark = !isFinderCell(r, c, count) && Boolean(data[r * count + c]);
          if (!isDark) {
            c++;
            continue;
          }
          const startC = c;
          while (c < count && !isFinderCell(r, c, count) && Boolean(data[r * count + c])) {
            c++;
          }
          const runLen = c - startC;
          dataParts.push(
            rectPathCW(offset + startC * cell, offset + r * cell, runLen * cell, cell)
          );
        }
      }
    } else if (cfg.moduleStyle === 'rounded') {
      const pad = cell * 0.05;
      const box = cell - pad * 2;
      const rad = box * 0.34;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (isFinderCell(r, c, count) || !data[r * count + c]) continue;
          dataParts.push(
            roundedRectPathCW(offset + c * cell + pad, offset + r * cell + pad, box, box, rad)
          );
        }
      }
    } else {
      const radius = cell * 0.42;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (isFinderCell(r, c, count) || !data[r * count + c]) continue;
          dataParts.push(
            circlePathCW(offset + (c + 0.5) * cell, offset + (r + 0.5) * cell, radius)
          );
        }
      }
    }

    const dataPathD = dataParts.join('');
    const captionTrimmed = cfg.showCaption ? cfg.caption.trim() : '';
    const captionFontSize = Math.max(10, Math.round(size * 0.085));
    const captionHeight = captionTrimmed ? Math.round(captionFontSize * 1.75) : 0;
    const totalWidth = size;
    const totalHeight = size + captionHeight;
    const eyeFill = cfg.useCustomEyeColor ? cfg.eyeColor : cfg.fgColor;

    const svgBg = cfg.transparentBg
      ? ''
      : `<rect x="0" y="0" width="${fmt(totalWidth)}" height="${fmt(totalHeight)}" fill="${escapeXml(cfg.bgColor)}"/>`;
    const svgCaption = captionTrimmed
      ? `<text x="${fmt(totalWidth / 2)}" y="${fmt(size + captionFontSize * 0.95)}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${captionFontSize}" fill="${escapeXml(cfg.fgColor)}">${escapeXml(captionTrimmed)}</text>`
      : '';

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(totalWidth)} ${fmt(totalHeight)}" width="${fmt(totalWidth)}" height="${fmt(totalHeight)}">${svgBg}<path d="${eyesPathD}" fill="${escapeXml(eyeFill)}" fill-rule="nonzero"/><path d="${dataPathD}" fill="${escapeXml(cfg.fgColor)}" fill-rule="nonzero"/>${svgCaption}</svg>`;

    return {
      payload,
      moduleCount: count,
      cellSize: cell,
      totalWidth,
      totalHeight,
      captionHeight,
      eyesPathD,
      dataPathD,
      svgString,
    };
  } catch (err: any) {
    return {
      payload,
      moduleCount: 0,
      cellSize: 0,
      totalWidth: size,
      totalHeight: size,
      captionHeight: 0,
      eyesPathD: '',
      dataPathD: '',
      svgString: '',
      error: err?.message || 'Unable to encode QR payload (data may exceed QR capacity).',
    };
  }
}

export function buildQrFabricGroup(cfg: QrConfig): { group: fabric.Group; geometry: GeneratedQrGeometry } | null {
  const geo = generateQrGeometry(cfg);
  if (geo.error || !geo.eyesPathD) return null;

  const objects: fabric.FabricObject[] = [];

  // Background (or transparent bounding frame so group preserves exact quiet zone margin)
  const bgRect = new fabric.Rect({
    left: 0,
    top: 0,
    width: geo.totalWidth,
    height: geo.totalHeight,
    originX: 'left',
    originY: 'top',
    fill: cfg.transparentBg ? 'transparent' : cfg.bgColor,
    strokeWidth: 0,
    objectCaching: false,
  });
  objects.push(bgRect);

  const eyeFill = cfg.useCustomEyeColor ? cfg.eyeColor : cfg.fgColor;

  if (cfg.useCustomEyeColor && eyeFill.toLowerCase() !== cfg.fgColor.toLowerCase()) {
    const eyesPath = new fabric.Path(geo.eyesPathD, {
      originX: 'left',
      originY: 'top',
      fill: eyeFill,
      strokeWidth: 0,
      fillRule: 'nonzero',
      objectCaching: false,
    });
    const dataPath = new fabric.Path(geo.dataPathD, {
      originX: 'left',
      originY: 'top',
      fill: cfg.fgColor,
      strokeWidth: 0,
      fillRule: 'nonzero',
      objectCaching: false,
    });
    objects.push(eyesPath, dataPath);
  } else {
    const combinedPath = new fabric.Path(`${geo.eyesPathD}${geo.dataPathD}`, {
      originX: 'left',
      originY: 'top',
      fill: cfg.fgColor,
      strokeWidth: 0,
      fillRule: 'nonzero',
      objectCaching: false,
    });
    objects.push(combinedPath);
  }

  const captionTrimmed = cfg.showCaption ? cfg.caption.trim() : '';
  if (captionTrimmed) {
    const captionFontSize = Math.max(10, Math.round(geo.totalWidth * 0.085));
    const captionObj = new fabric.IText(captionTrimmed, {
      left: geo.totalWidth / 2,
      top: geo.totalWidth + geo.captionHeight * 0.42,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontSize: captionFontSize,
      fill: cfg.fgColor,
      strokeWidth: 0,
      objectCaching: false,
    });
    objects.push(captionObj);
  }

  const group = new fabric.Group(objects, {
    originX: 'center',
    originY: 'center',
    objectCaching: false,
  });

  (group as any).customType = 'qrcode';
  (group as any).qrConfig = { ...cfg };
  ensureObjectId(group, `QR Code (${cfg.dataType.toUpperCase()})`);
  disableObjectCaching(group);

  return { group, geometry: geo };
}
