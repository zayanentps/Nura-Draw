import React, { useEffect, useMemo, useState } from 'react';
import * as fabric from 'fabric';
import {
  QrCode,
  X,
  Link as LinkIcon,
  AlignLeft,
  Wifi,
  Contact,
  Mail,
  Phone,
  MessageSquare,
  Download,
  RotateCcw,
  Check,
} from 'lucide-react';
import { PageConfig, ThemeMode } from '../types';
import {
  DEFAULT_QR_CONFIG,
  QrConfig,
  QrDataType,
  QrErrorCorrection,
  QrEyeStyle,
  QrModuleStyle,
  buildQrFabricGroup,
  generateQrGeometry,
} from '../utils/qrCodeBuilder';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  pageConfig: PageConfig;
  theme?: ThemeMode;
  onCanvasUpdated: (label: string) => void;
  onToast?: (msg: string) => void;
}

const DATA_TYPE_TABS: { id: QrDataType; label: string; icon: React.ReactNode }[] = [
  { id: 'url', label: 'URL', icon: <LinkIcon className="w-3.5 h-3.5" /> },
  { id: 'text', label: 'Text', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { id: 'wifi', label: 'Wi-Fi', icon: <Wifi className="w-3.5 h-3.5" /> },
  { id: 'vcard', label: 'vCard', icon: <Contact className="w-3.5 h-3.5" /> },
  { id: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { id: 'phone', label: 'Phone', icon: <Phone className="w-3.5 h-3.5" /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  canvas,
  selectedObject,
  pageConfig,
  theme = 'light',
  onCanvasUpdated,
  onToast,
}) => {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<QrConfig>(DEFAULT_QR_CONFIG);

  const isEditingSelectedQr = Boolean(
    selectedObject && (selectedObject as any).customType === 'qrcode' && (selectedObject as any).qrConfig
  );

  // Sync config when modal opens (load from selected QR object if one is selected)
  useEffect(() => {
    if (!isOpen) return;
    if (selectedObject && (selectedObject as any).customType === 'qrcode' && (selectedObject as any).qrConfig) {
      setConfig({ ...DEFAULT_QR_CONFIG, ...(selectedObject as any).qrConfig });
    }
  }, [isOpen, selectedObject]);

  const geo = useMemo(() => generateQrGeometry(config), [config]);

  const svgPreviewUri = useMemo(() => {
    if (!geo.svgString) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(geo.svgString)}`;
  }, [geo.svgString]);

  if (!isOpen) return null;

  const update = <K extends keyof QrConfig>(key: K, value: QrConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleInsertOrUpdate = (replaceSelected: boolean) => {
    if (!canvas) return;
    if (geo.error) {
      onToast?.(geo.error);
      return;
    }

    const built = buildQrFabricGroup(config);
    if (!built) {
      onToast?.('Failed to build vector QR code');
      return;
    }

    const { group } = built;

    if (replaceSelected && isEditingSelectedQr && selectedObject) {
      const center = selectedObject.getCenterPoint();
      group.set({
        left: center.x,
        top: center.y,
        angle: selectedObject.angle || 0,
        opacity: selectedObject.opacity ?? 1,
      });
      group.setCoords();
      canvas.discardActiveObject();
      canvas.remove(selectedObject);
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      onCanvasUpdated('Update QR Code');
      onToast?.('Updated vector QR code');
    } else {
      const targetCenterX = pageConfig.width / 2;
      const targetCenterY = pageConfig.height / 2;
      group.set({
        left: targetCenterX,
        top: targetCenterY,
      });
      group.setCoords();
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      onCanvasUpdated('Insert QR Code');
      onToast?.(`Inserted crisp vector QR code (${geo.moduleCount}×${geo.moduleCount})`);
    }
    onClose();
  };

  const handleDownloadSvg = () => {
    if (!geo.svgString) return;
    const blob = new Blob([geo.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-code-${config.dataType}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.('Downloaded QR code as SVG');
  };

  const handleDownloadPng = () => {
    if (!svgPreviewUri) return;
    const exportSize = Math.max(512, geo.totalWidth * 4);
    const ratio = geo.totalHeight / Math.max(1, geo.totalWidth);
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = exportSize;
      off.height = Math.round(exportSize * ratio);
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, off.width, off.height);
      off.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-code-${config.dataType}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onToast?.('Downloaded high-res QR code PNG');
      }, 'image/png');
    };
    img.src = svgPreviewUri;
  };

  const panelBg = isDark ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100' : 'bg-[#f4f5f7] border-[#a1a5ab] text-zinc-900';
  const cardBg = isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-white border-[#cfd3da]';
  const inputCls = isDark
    ? 'bg-[#3e4147] border-[#686c75] text-zinc-100 placeholder-zinc-400 focus:border-[#0078d7]'
    : 'bg-white border-[#abadb3] text-zinc-900 placeholder-zinc-400 focus:border-[#0078d7]';
  const labelCls = `text-[11px] font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-[120] select-none font-sans p-4">
      <div className={`w-[780px] max-w-[96vw] max-h-[92vh] rounded-sm border shadow-2xl flex flex-col overflow-hidden ${panelBg}`}>
        {/* NuraDraw Title Bar */}
        <div
          className={`h-9 px-3.5 flex items-center justify-between border-b shrink-0 ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-[#e6e8ec] border-[#c4c8cf]'
          }`}
        >
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#0078d7]" />
            <span className="text-xs font-semibold tracking-tight">
              QR Code Generator {isEditingSelectedQr ? '— Edit Selected Object' : '— Insert Vector QR Code'}
            </span>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className={`p-1 rounded-xs transition ${
              isDark ? 'text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 hover:bg-zinc-300 hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-12 gap-4 text-xs">
          {/* Left Column: Data & Vector Styling */}
          <div className="col-span-7 flex flex-col gap-3">
            {/* Payload Type Tabs */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                1. QR Content Type
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DATA_TYPE_TABS.map((tab) => {
                  const active = config.dataType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => update('dataType', tab.id)}
                      className={`py-1.5 px-1 rounded-xs border flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition cursor-pointer ${
                        active
                          ? 'bg-[#0078d7] border-[#0063b1] text-white shadow-xs'
                          : isDark
                          ? 'bg-[#1d2024] border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-white border-[#c8ccd2] text-zinc-700 hover:bg-[#e5f1fb]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Form Fields */}
            <div className={`p-3 rounded-xs border space-y-2.5 ${cardBg}`}>
              {config.dataType === 'url' && (
                <div>
                  <label className={labelCls}>Website URL</label>
                  <input
                    type="text"
                    value={config.url}
                    onChange={(e) => update('url', e.target.value)}
                    placeholder="https://example.com"
                    className={`mt-1 w-full px-2.5 py-1.5 rounded-xs border text-xs outline-none ${inputCls}`}
                  />
                </div>
              )}

              {config.dataType === 'text' && (
                <div>
                  <label className={labelCls}>Plain Text</label>
                  <textarea
                    rows={3}
                    value={config.text}
                    onChange={(e) => update('text', e.target.value)}
                    placeholder="Enter any text to encode..."
                    className={`mt-1 w-full px-2.5 py-1.5 rounded-xs border text-xs outline-none resize-none ${inputCls}`}
                  />
                </div>
              )}

              {config.dataType === 'wifi' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Network Name (SSID)</label>
                    <input
                      type="text"
                      value={config.wifiSsid}
                      onChange={(e) => update('wifiSsid', e.target.value)}
                      placeholder="MyWiFi"
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Security</label>
                    <select
                      value={config.wifiSecurity}
                      onChange={(e) => update('wifiSecurity', e.target.value as QrConfig['wifiSecurity'])}
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      type="text"
                      disabled={config.wifiSecurity === 'nopass'}
                      value={config.wifiPassword}
                      onChange={(e) => update('wifiPassword', e.target.value)}
                      placeholder={config.wifiSecurity === 'nopass' ? 'No password' : 'Wi-Fi password'}
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none disabled:opacity-50 ${inputCls}`}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.wifiHidden}
                        onChange={(e) => update('wifiHidden', e.target.checked)}
                      />
                      <span className={labelCls}>Hidden SSID</span>
                    </label>
                  </div>
                </div>
              )}

              {config.dataType === 'vcard' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input
                      type="text"
                      value={config.vcardName}
                      onChange={(e) => update('vcardName', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Company / Org</label>
                    <input
                      type="text"
                      value={config.vcardCompany}
                      onChange={(e) => update('vcardCompany', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      type="text"
                      value={config.vcardPhone}
                      onChange={(e) => update('vcardPhone', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      value={config.vcardEmail}
                      onChange={(e) => update('vcardEmail', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Website</label>
                    <input
                      type="text"
                      value={config.vcardWebsite}
                      onChange={(e) => update('vcardWebsite', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                </div>
              )}

              {config.dataType === 'email' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Recipient Email</label>
                      <input
                        type="email"
                        value={config.emailTo}
                        onChange={(e) => update('emailTo', e.target.value)}
                        className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Subject</label>
                      <input
                        type="text"
                        value={config.emailSubject}
                        onChange={(e) => update('emailSubject', e.target.value)}
                        className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Message Body</label>
                    <textarea
                      rows={2}
                      value={config.emailBody}
                      onChange={(e) => update('emailBody', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none resize-none ${inputCls}`}
                    />
                  </div>
                </div>
              )}

              {config.dataType === 'phone' && (
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+1-555-0100"
                    className={`mt-1 w-full px-2.5 py-1.5 rounded-xs border text-xs outline-none ${inputCls}`}
                  />
                </div>
              )}

              {config.dataType === 'sms' && (
                <div className="space-y-2">
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input
                      type="text"
                      value={config.smsPhone}
                      onChange={(e) => update('smsPhone', e.target.value)}
                      placeholder="+1-555-0100"
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SMS Message</label>
                    <textarea
                      rows={2}
                      value={config.smsMessage}
                      onChange={(e) => update('smsMessage', e.target.value)}
                      className={`mt-0.5 w-full px-2 py-1 rounded-xs border text-xs outline-none resize-none ${inputCls}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vector Geometry & Styling Options */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                2. Vector Style &amp; Geometry
              </div>
              <div className={`p-3 rounded-xs border space-y-3 ${cardBg}`}>
                {/* Module Style, Eye Style, Error Correction */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className={labelCls}>Module Shape</label>
                    <select
                      value={config.moduleStyle}
                      onChange={(e) => update('moduleStyle', e.target.value as QrModuleStyle)}
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    >
                      <option value="square">Square (Classic)</option>
                      <option value="rounded">Rounded Blocks</option>
                      <option value="dots">Circular Dots</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Corner Eye Style</label>
                    <select
                      value={config.eyeStyle}
                      onChange={(e) => update('eyeStyle', e.target.value as QrEyeStyle)}
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    >
                      <option value="square">Square</option>
                      <option value="rounded">Rounded</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Error Correction</label>
                    <select
                      value={config.ecc}
                      onChange={(e) => update('ecc', e.target.value as QrErrorCorrection)}
                      className={`mt-1 w-full px-2 py-1 rounded-xs border text-xs outline-none ${inputCls}`}
                    >
                      <option value="L">L — Low (7%)</option>
                      <option value="M">M — Medium (15%)</option>
                      <option value="Q">Q — Quartile (25%)</option>
                      <option value="H">H — High (30%)</option>
                    </select>
                  </div>
                </div>

                {/* Size & Quiet Zone Margin */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Size (px)</label>
                      <input
                        type="number"
                        min={60}
                        max={800}
                        value={config.sizePx}
                        onChange={(e) => update('sizePx', Math.max(60, Math.min(800, Number(e.target.value) || 220)))}
                        className={`w-16 px-1.5 py-0.5 rounded-xs border text-right font-mono text-[11px] outline-none ${inputCls}`}
                      />
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={600}
                      step={10}
                      value={config.sizePx}
                      onChange={(e) => update('sizePx', Number(e.target.value))}
                      className="mt-1.5 w-full accent-[#0078d7]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Quiet Zone (Margin)</label>
                      <span className="font-mono text-[11px] text-zinc-500">{config.marginModules} mod</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={config.marginModules}
                      onChange={(e) => update('marginModules', Number(e.target.value))}
                      className="mt-1.5 w-full accent-[#0078d7]"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className={labelCls}>Foreground</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.fgColor}
                        onChange={(e) => update('fgColor', e.target.value)}
                        className="w-7 h-6 rounded-xs border border-zinc-400 cursor-pointer p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.fgColor}
                        onChange={(e) => update('fgColor', e.target.value)}
                        className={`flex-1 min-w-0 px-1.5 py-0.5 rounded-xs border font-mono text-[11px] outline-none ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Background</label>
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer text-zinc-500">
                        <input
                          type="checkbox"
                          checked={config.transparentBg}
                          onChange={(e) => update('transparentBg', e.target.checked)}
                        />
                        <span>None</span>
                      </label>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="color"
                        disabled={config.transparentBg}
                        value={config.bgColor}
                        onChange={(e) => update('bgColor', e.target.value)}
                        className="w-7 h-6 rounded-xs border border-zinc-400 cursor-pointer p-0 bg-transparent disabled:opacity-40"
                      />
                      <input
                        type="text"
                        disabled={config.transparentBg}
                        value={config.transparentBg ? 'Transparent' : config.bgColor}
                        onChange={(e) => update('bgColor', e.target.value)}
                        className={`flex-1 min-w-0 px-1.5 py-0.5 rounded-xs border font-mono text-[11px] outline-none disabled:opacity-40 ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Eye Color</label>
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer text-zinc-500">
                        <input
                          type="checkbox"
                          checked={config.useCustomEyeColor}
                          onChange={(e) => update('useCustomEyeColor', e.target.checked)}
                        />
                        <span>Custom</span>
                      </label>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="color"
                        disabled={!config.useCustomEyeColor}
                        value={config.eyeColor}
                        onChange={(e) => update('eyeColor', e.target.value)}
                        className="w-7 h-6 rounded-xs border border-zinc-400 cursor-pointer p-0 bg-transparent disabled:opacity-40"
                      />
                      <input
                        type="text"
                        disabled={!config.useCustomEyeColor}
                        value={config.useCustomEyeColor ? config.eyeColor : config.fgColor}
                        onChange={(e) => update('eyeColor', e.target.value)}
                        className={`flex-1 min-w-0 px-1.5 py-0.5 rounded-xs border font-mono text-[11px] outline-none disabled:opacity-40 ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <div className="flex items-center gap-2.5 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={config.showCaption}
                      onChange={(e) => update('showCaption', e.target.checked)}
                    />
                    <span className={labelCls}>Bottom Label</span>
                  </label>
                  <input
                    type="text"
                    disabled={!config.showCaption}
                    value={config.caption}
                    onChange={(e) => update('caption', e.target.value)}
                    placeholder="SCAN ME"
                    className={`flex-1 px-2 py-1 rounded-xs border text-xs outline-none disabled:opacity-40 ${inputCls}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Crisp Vector Preview & Export */}
          <div className="col-span-5 flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Live Vector Preview
            </div>

            <div
              className={`flex-1 min-h-[260px] rounded-xs border flex flex-col items-center justify-center p-4 relative overflow-hidden ${cardBg}`}
              style={{
                backgroundImage:
                  'linear-gradient(45deg, rgba(128,128,128,0.09) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.09) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.09) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.09) 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            >
              {geo.error ? (
                <div className="text-center text-red-500 text-xs px-3 py-2 bg-red-500/10 border border-red-500/30 rounded">
                  {geo.error}
                </div>
              ) : (
                <img
                  src={svgPreviewUri}
                  alt="Vector QR Code Preview"
                  className="max-w-[230px] max-h-[250px] object-contain shadow-sm"
                />
              )}
            </div>

            {/* Matrix Specs & Encoded Payload */}
            <div className={`p-2.5 rounded-xs border space-y-1.5 ${cardBg}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Matrix Grid:</span>
                <span className="font-mono font-semibold">
                  {geo.moduleCount ? `${geo.moduleCount}×${geo.moduleCount} modules` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Output Format:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Raw Vector Path (Zero Blur)
                </span>
              </div>
              <div className="pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-[10px] text-zinc-500 mb-0.5">Encoded Data ({geo.payload.length} chars):</div>
                <div
                  className={`text-[10px] font-mono p-1.5 rounded-xs border max-h-14 overflow-y-auto break-all ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  {geo.payload}
                </div>
              </div>
            </div>

            {/* Quick Standalone Download */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadSvg}
                disabled={!!geo.error}
                className={`py-1.5 px-2.5 rounded-xs border flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer disabled:opacity-40 ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-[#0078d7]" />
                <span>Download SVG</span>
              </button>
              <button
                onClick={handleDownloadPng}
                disabled={!!geo.error}
                className={`py-1.5 px-2.5 rounded-xs border flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer disabled:opacity-40 ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#44474d] border-[#646870]' : 'bg-[#e6e8ec] border-[#c4c8cf]'
          }`}
        >
          <button
            onClick={() => setConfig(DEFAULT_QR_CONFIG)}
            className={`px-2.5 py-1.5 rounded-xs border flex items-center gap-1.5 text-xs transition cursor-pointer ${
              isDark
                ? 'bg-[#585c64] border-[#6e737d] hover:bg-[#646972] text-zinc-100'
                : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-xs border text-xs transition cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              Cancel
            </button>
            {isEditingSelectedQr ? (
              <>
                <button
                  onClick={() => handleInsertOrUpdate(false)}
                  disabled={!!geo.error}
                  className={`px-3.5 py-1.5 rounded-xs border text-xs font-medium transition cursor-pointer disabled:opacity-40 ${
                    isDark
                      ? 'bg-zinc-700 border-zinc-500 hover:bg-zinc-600 text-white'
                      : 'bg-white border-[#0078d7] hover:bg-[#e5f1fb] text-[#0078d7]'
                  }`}
                >
                  Insert as New
                </button>
                <button
                  onClick={() => handleInsertOrUpdate(true)}
                  disabled={!!geo.error}
                  className="px-4 py-1.5 rounded-xs bg-[#0078d7] hover:bg-[#0063b1] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update QR Code</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleInsertOrUpdate(false)}
                disabled={!!geo.error}
                className="px-4 py-1.5 rounded-xs bg-[#0078d7] hover:bg-[#0063b1] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Insert QR Code</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
