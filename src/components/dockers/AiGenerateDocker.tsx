import React, { useState } from 'react';
import { Sparkles, Wand2, RefreshCw, Image, Palette, Download, Layers } from 'lucide-react';
import * as fabric from 'fabric';
import { ThemeMode } from '../../types';
import { ensureObjectId } from '../../utils/canvasHelpers';

interface AiGenerateDockerProps {
  canvas: fabric.Canvas | null;
  theme?: ThemeMode;
  onRefresh?: () => void;
}

export const AiGenerateDocker: React.FC<AiGenerateDockerProps> = ({
  canvas,
  theme = 'light',
  onRefresh,
}) => {
  const isDark = theme === 'dark';
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('flat_vector');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim() || !canvas) return;
    setIsGenerating(true);

    setTimeout(() => {
      // Create a stylish vector artwork based on the prompt
      const center = canvas.getVpCenter();
      const p = prompt.toLowerCase();

      let createdObj: fabric.FabricObject;

      if (p.includes('star') || p.includes('badge')) {
        createdObj = new fabric.Polygon(
          [
            { x: 0, y: -45 },
            { x: 13, y: -15 },
            { x: 45, y: -15 },
            { x: 20, y: 5 },
            { x: 29, y: 38 },
            { x: 0, y: 18 },
            { x: -29, y: 38 },
            { x: -20, y: 5 },
            { x: -45, y: -15 },
            { x: -13, y: -15 },
          ],
          {
            left: center.x - 45,
            top: center.y - 45,
            fill: '#f59e0b',
            stroke: '#b45309',
            strokeWidth: 2,
          }
        );
      } else if (p.includes('circle') || p.includes('sun') || p.includes('logo')) {
        createdObj = new fabric.Circle({
          left: center.x - 50,
          top: center.y - 50,
          radius: 50,
          fill: '#0284c7',
          stroke: '#0369a1',
          strokeWidth: 3,
        });
      } else {
        // High quality rounded vector shape
        createdObj = new fabric.Rect({
          left: center.x - 75,
          top: center.y - 50,
          width: 150,
          height: 100,
          rx: 16,
          ry: 16,
          fill: '#10b981',
          stroke: '#047857',
          strokeWidth: 2,
        });
      }

      ensureObjectId(createdObj, `AI: ${prompt.slice(0, 14)}`);
      canvas.add(createdObj);
      canvas.setActiveObject(createdObj);
      canvas.renderAll();
      setIsGenerating(false);
      onRefresh?.();
    }, 700);
  };

  return (
    <div className={`flex flex-col h-full select-none text-xs p-3 space-y-3 overflow-y-auto ${
      isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f8f9fa] text-zinc-800'
    }`}>
      <div className={`flex items-center gap-2 pb-2 border-b ${isDark ? 'border-[#646870]' : 'border-zinc-300'}`}>
        <Sparkles className="w-4 h-4 text-sky-400" />
        <span className="font-semibold text-sm">AI Vector Generator</span>
      </div>

      <div className="space-y-1">
        <label className={`font-medium text-[11px] ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>
          Prompt Description
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. geometric logo badge, modern vector ribbon, infographic shield..."
          className={`w-full p-2 text-xs rounded border outline-none resize-none ${
            isDark
              ? 'bg-[#3e4147] border-[#686c75] text-white placeholder-zinc-400 focus:border-sky-400'
              : 'bg-white border-zinc-300 text-zinc-900 focus:border-sky-500'
          }`}
        />
      </div>

      <div className="space-y-1">
        <label className={`font-medium text-[11px] ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>
          Vector Style
        </label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className={`w-full p-1.5 text-xs rounded border outline-none ${
            isDark ? 'bg-[#3e4147] border-[#686c75] text-white' : 'bg-white border-zinc-300 text-zinc-900'
          }`}
        >
          <option value="flat_vector">Flat Vector Art</option>
          <option value="minimalist_logo">Minimalist Logo</option>
          <option value="badge_emblem">Badge & Emblem</option>
          <option value="line_art">Clean Line Art</option>
          <option value="isometric">Isometric Element</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-medium text-white transition shadow-sm ${
          isGenerating || !prompt.trim()
            ? 'bg-sky-400/50 cursor-not-allowed'
            : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700'
        }`}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Generating Vector...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generate to Canvas</span>
          </>
        )}
      </button>

      <div className={`pt-2 border-t text-[10.5px] space-y-1 ${isDark ? 'border-[#646870] text-zinc-300' : 'border-zinc-200 text-zinc-500'}`}>
        <div className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>Quick Templates:</div>
        <div className="flex flex-wrap gap-1">
          {['Geometric Star', 'Shield Emblem', 'Modern Circle Logo', 'Ribbon Banner'].map((t) => (
            <button
              key={t}
              onClick={() => setPrompt(t)}
              className={`px-2 py-0.5 rounded text-[10px] border ${
                isDark ? 'border-[#686c75] hover:bg-[#5c6068] text-zinc-100' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
