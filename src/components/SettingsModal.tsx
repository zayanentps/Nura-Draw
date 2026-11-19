import React, { useState } from 'react';
import {
  X,
  Settings,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Ruler,
  Sliders,
  Users
} from 'lucide-react';
import { ThemeMode, PageConfig, CollaboratorUser } from '../types';
import { ALL_UNITS, PAGE_PRESETS } from '../utils/units';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  pageConfig: PageConfig;
  onUpdatePageConfig: (config: Partial<PageConfig>) => void;
  workspaceBg: string;
  onWorkspaceBgChange: (color: string) => void;
  currentUser: CollaboratorUser;
  onUpdateUserName: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  pageConfig,
  onUpdatePageConfig,
  workspaceBg,
  onWorkspaceBgChange,
  currentUser,
  onUpdateUserName,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'document' | 'collab'>('appearance');
  const [tempName, setTempName] = useState(currentUser.name);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none font-sans">
      <div
        className={`w-[520px] rounded border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100' : 'bg-[#f5f5f7] border-zinc-400 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-b ${
            isDark ? 'bg-[#45484e] border-[#646870]' : 'bg-[#ebecee] border-zinc-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">Options & Settings (Ctrl+J)</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-zinc-700/20 ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-500 hover:text-black'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Left Tabs and Right Content */}
        <div className="flex flex-1 min-h-[340px]">
          {/* Left Category Tabs */}
          <div
            className={`w-40 border-r py-3 px-2 space-y-1 text-xs ${
              isDark ? 'bg-[#46494f] border-[#646870]' : 'bg-[#e9eaec] border-zinc-300'
            }`}
          >
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === 'appearance'
                  ? 'bg-[#0078d7] text-white font-medium shadow-xs'
                  : isDark
                  ? 'text-zinc-200 hover:bg-[#585c64] hover:text-white'
                  : 'text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('document')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === 'document'
                  ? 'bg-[#0078d7] text-white font-medium shadow-xs'
                  : isDark
                  ? 'text-zinc-200 hover:bg-[#585c64] hover:text-white'
                  : 'text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Units & Document</span>
            </button>

            <button
              onClick={() => setActiveTab('collab')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === 'collab'
                  ? 'bg-[#0078d7] text-white font-medium shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Profile</span>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-5 text-xs overflow-y-auto">
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* Theme Selector */}
                <div>
                  <label className="block font-semibold text-xs mb-2">Interface Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Light Theme Card */}
                    <button
                      onClick={() => onThemeChange('light')}
                      className={`p-3 rounded border text-left transition relative flex flex-col gap-2 ${
                        theme === 'light'
                          ? 'border-[#0078d7] bg-white ring-2 ring-[#0078d7]/30 shadow-sm'
                          : isDark
                          ? 'bg-[#575b63] border-[#6c7079] hover:border-zinc-400'
                          : 'bg-white border-zinc-300 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 font-medium text-xs ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Light Theme</span>
                        </div>
                        {theme === 'light' && <Check className="w-4 h-4 text-[#0078d7]" />}
                      </div>
                      {/* Mini preview */}
                      <div className="h-8 rounded bg-[#ebecee] border border-[#d4d6da] flex items-center px-1.5 gap-1">
                        <div className="w-2.5 h-2.5 rounded-xs bg-[#0078d7]" />
                        <div className="w-10 h-1.5 rounded-xs bg-[#c9cbcf]" />
                        <div className="w-4 h-1.5 rounded-xs bg-[#abadb3] ml-auto" />
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>Classic CorelDRAW Windows interface</span>
                    </button>

                    {/* Dark Theme Card */}
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`p-3 rounded border text-left transition relative flex flex-col gap-2 ${
                        theme === 'dark'
                          ? 'border-emerald-400 bg-[#46494f] ring-2 ring-emerald-400/30 shadow-sm'
                          : isDark
                          ? 'bg-[#575b63] border-[#6c7079] hover:border-zinc-400'
                          : 'bg-white border-zinc-300 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 font-medium text-xs ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          <Moon className="w-4 h-4 text-emerald-400" />
                          <span>Dark Theme (70% Black)</span>
                        </div>
                        {theme === 'dark' && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      {/* Mini preview */}
                      <div className="h-8 rounded bg-[#4d5056] border border-[#6a6e77] flex items-center px-1.5 gap-1">
                        <div className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                        <div className="w-10 h-1.5 rounded-xs bg-[#646870]" />
                        <div className="w-4 h-1.5 rounded-xs bg-[#767a83] ml-auto" />
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>70% charcoal dark studio interface</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Desktop Background */}
                <div className="pt-3 border-t border-zinc-300/60 dark:border-zinc-700">
                  <label className="block font-semibold text-xs mb-2">Desktop Workspace Background</label>
                  <div className="flex items-center flex-wrap gap-2">
                    {[
                      { name: 'Classic Gray', color: '#e9eaed' },
                      { name: 'Dark Studio (70%)', color: '#3f4248' },
                      { name: 'Deep Black', color: '#121315' },
                      { name: 'Paper White', color: '#f8fafc' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => onWorkspaceBgChange(preset.color)}
                        className={`px-2.5 py-1.5 rounded text-[11px] border flex items-center gap-1.5 transition ${
                          workspaceBg === preset.color
                            ? 'border-[#0078d7] font-semibold bg-[#0078d7]/15'
                            : isDark
                            ? 'border-[#686c75] hover:border-zinc-400'
                            : 'border-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: preset.color }} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                    <input
                      type="color"
                      value={workspaceBg}
                      onChange={(e) => onWorkspaceBgChange(e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-400 cursor-pointer bg-transparent"
                      title="Custom Desktop Color"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'document' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-xs mb-1.5">Measurement Units</label>
                  <select
                    value={pageConfig.units}
                    onChange={(e) => onUpdatePageConfig({ units: e.target.value as any })}
                    className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none cursor-pointer ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  >
                    {ALL_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label} ({u.symbol}) — 1 {u.symbol} = {u.pxPerUnit.toFixed(2)} px
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-xs mb-1.5">Default Paper Preset</label>
                  <select
                    value={pageConfig.preset}
                    onChange={(e) => {
                      const presetId = e.target.value;
                      const found = PAGE_PRESETS.find((p) => p.id === presetId);
                      if (found) {
                        let w = found.widthPx;
                        let h = found.heightPx;
                        if (pageConfig.orientation === 'landscape') {
                          w = Math.max(found.widthPx, found.heightPx);
                          h = Math.min(found.widthPx, found.heightPx);
                        } else {
                          w = Math.min(found.widthPx, found.heightPx);
                          h = Math.max(found.widthPx, found.heightPx);
                        }
                        onUpdatePageConfig({ preset: presetId, width: w, height: h });
                      } else {
                        onUpdatePageConfig({ preset: presetId });
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none cursor-pointer ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  >
                    <optgroup label="Standard Print">
                      {PAGE_PRESETS.filter((p) => p.category === 'Print').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.description})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Stationery & Commercial">
                      {PAGE_PRESETS.filter((p) => p.category === 'Stationery').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.description})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Digital & Web">
                      {PAGE_PRESETS.filter((p) => p.category === 'Digital / Web').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.description})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Social Media">
                      {PAGE_PRESETS.filter((p) => p.category === 'Social Media').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.description})
                        </option>
                      ))}
                    </optgroup>
                    <option value="Custom">Custom Dimensions</option>
                  </select>
                </div>


                <div className="pt-2 border-t border-zinc-300/60 dark:border-zinc-700">
                  <label className="block font-semibold text-xs mb-1">Paper Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pageConfig.backgroundColor}
                      onChange={(e) => onUpdatePageConfig({ backgroundColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border border-zinc-400 bg-transparent"
                    />
                    <span className="font-mono text-zinc-500">{pageConfig.backgroundColor}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'collab' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-xs mb-1">Your Designer Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className={`flex-1 px-2.5 py-1.5 rounded border text-xs outline-none ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                    <button
                      onClick={() => onUpdateUserName(tempName)}
                      className="px-3 py-1.5 bg-[#0078d7] text-white rounded font-medium hover:bg-[#0063b1]"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-xs mb-1">User ID</label>
                  <input
                    type="text"
                    readOnly
                    value={currentUser.id}
                    className={`w-full px-2.5 py-1.5 rounded border font-mono text-[11px] opacity-70 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2 flex items-center justify-end gap-2 border-t ${
            isDark ? 'bg-[#45484e] border-[#646870]' : 'bg-[#ebecee] border-zinc-300'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1 rounded text-xs border font-medium ${
              isDark
                ? 'bg-[#585c64] border-[#6e737d] hover:bg-[#646972] text-white'
                : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded text-xs bg-[#0078d7] hover:bg-[#0063b1] text-white font-medium shadow-xs"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
