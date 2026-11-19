import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  X,
  Minus,
  Maximize2,
  GripHorizontal,
  Clock,
} from 'lucide-react';
import { ThemeMode } from '../types';

export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface ProjectTimerSession {
  id: string;
  endedAt: string;
  durationSec: number;
}

export interface ProjectTimerState {
  totalSeconds: number;
  sessionSeconds: number;
  status: TimerStatus;
  sessions: ProjectTimerSession[];
}

export function formatDurationHMS(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ProjectTimerWindowProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  timerState: ProjectTimerState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  autoTrackEnabled: boolean;
  onToggleAutoTrack: () => void;
  theme?: ThemeMode;
}

export const ProjectTimerWindow: React.FC<ProjectTimerWindowProps> = ({
  isOpen,
  onClose,
  projectName,
  timerState,
  onPlay,
  onPause,
  onStop,
  onReset,
  autoTrackEnabled,
  onToggleAutoTrack,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(24, window.innerWidth - 360) : 720,
    y: 118,
  }));

  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const maxX = Math.max(20, window.innerWidth - 280);
      const maxY = Math.max(20, window.innerHeight - 90);
      setPosition({
        x: Math.min(maxX, Math.max(8, dragRef.current.origX + dx)),
        y: Math.min(maxY, Math.max(8, dragRef.current.origY + dy)),
      });
    };
    const handleUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  if (!isOpen) return null;

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const { totalSeconds, sessionSeconds, status, sessions } = timerState;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  const statusBadge = isRunning ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      RUNNING
    </span>
  ) : isPaused ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      PAUSED
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
      STOPPED
    </span>
  );

  const shellCls = isDark
    ? 'bg-[#4d5056] border-[#6a6e77] text-zinc-100'
    : 'bg-[#f4f5f7] border-[#969aa1] text-zinc-900';

  const titleBarCls = isDark
    ? 'bg-[#44474d] border-[#646870] text-zinc-100'
    : 'bg-[#e1e4e9] border-[#c2c6cd] text-zinc-900';

  const cardCls = isDark
    ? 'bg-[#41444a] border-[#646870]'
    : 'bg-white border-[#cfd3da]';

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-[95] w-[308px] rounded-sm border shadow-2xl select-none font-sans overflow-hidden ${shellCls}`}
    >
      {/* Draggable Title Bar */}
      <div
        onMouseDown={startDrag}
        className={`h-8 px-2.5 flex items-center justify-between border-b cursor-move ${titleBarCls}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <Timer className="w-3.5 h-3.5 text-[#0078d7] shrink-0" />
          <span className="text-[11px] font-semibold truncate">Project Timer</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Expand Timer Window' : 'Minimize Timer Window'}
            className={`p-1 rounded-xs transition cursor-pointer ${
              isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-300 text-zinc-700'
            }`}
          >
            {minimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            title="Close Window (Timer keeps state)"
            className={`p-1 rounded-xs transition cursor-pointer ${
              isDark ? 'hover:bg-red-600/80 text-zinc-300 hover:text-white' : 'hover:bg-red-500 hover:text-white text-zinc-700'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Minimized Compact Strip */}
      {minimized ? (
        <div className="p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-500 truncate">{projectName}</div>
            <div className="font-mono text-base font-bold tabular-nums tracking-wider">
              {formatDurationHMS(totalSeconds)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isRunning ? (
              <button
                onClick={onPlay}
                title="Play / Start Timer"
                className="p-1.5 rounded-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={onPause}
                title="Pause Timer"
                className="p-1.5 rounded-xs bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
            <button
              onClick={onStop}
              disabled={status === 'stopped' && sessionSeconds === 0}
              title="Stop Session"
              className={`p-1.5 rounded-xs border cursor-pointer disabled:opacity-40 ${
                isDark ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700' : 'bg-white border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={onReset}
              title="Reset Project Timer"
              className={`p-1.5 rounded-xs border cursor-pointer ${
                isDark ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700' : 'bg-white border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Full Project Timer Window Body */
        <div className="p-3 space-y-3 text-xs">
          {/* Project Info & Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                Current Project
              </div>
              <div className="text-xs font-semibold truncate" title={projectName}>
                {projectName}
              </div>
            </div>
            {statusBadge}
          </div>

          {/* Primary Digital Clock Card */}
          <div className={`p-3 rounded-xs border text-center ${cardCls}`}>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
              Total Time on Project
            </div>
            <div
              className={`font-mono text-3xl font-bold tabular-nums tracking-widest ${
                isRunning
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isPaused
                  ? 'text-amber-600 dark:text-amber-400'
                  : isDark
                  ? 'text-zinc-100'
                  : 'text-zinc-900'
              }`}
            >
              {formatDurationHMS(totalSeconds)}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Current Session:</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatDurationHMS(sessionSeconds)}
              </span>
            </div>
          </div>

          {/* Transport Controls: Play / Pause / Stop / Reset */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={onPlay}
              disabled={isRunning}
              title={isPaused ? 'Resume Timer' : 'Start Timer'}
              className="py-1.5 px-2 rounded-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-semibold flex flex-col items-center justify-center gap-0.5 text-[10px] transition cursor-pointer disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Resume' : 'Play'}</span>
            </button>

            <button
              onClick={onPause}
              disabled={!isRunning}
              title="Pause Timer"
              className="py-1.5 px-2 rounded-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-45 text-white font-semibold flex flex-col items-center justify-center gap-0.5 text-[10px] transition cursor-pointer disabled:cursor-not-allowed"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>

            <button
              onClick={onStop}
              disabled={status === 'stopped' && sessionSeconds === 0}
              title="Stop & Log Session"
              className={`py-1.5 px-2 rounded-xs border font-semibold flex flex-col items-center justify-center gap-0.5 text-[10px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-100'
                  : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current text-red-500" />
              <span>Stop</span>
            </button>

            <button
              onClick={onReset}
              disabled={totalSeconds === 0 && sessionSeconds === 0 && sessions.length === 0}
              title="Reset Project Timer to 00:00:00"
              className={`py-1.5 px-2 rounded-xs border font-semibold flex flex-col items-center justify-center gap-0.5 text-[10px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-100'
                  : 'bg-white border-[#abadb3] hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0078d7]" />
              <span>Reset</span>
            </button>
          </div>

          {/* Auto-track option */}
          <label className="flex items-center justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700 cursor-pointer">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Auto-start timer on canvas edits
            </span>
            <input
              type="checkbox"
              checked={autoTrackEnabled}
              onChange={onToggleAutoTrack}
              className="accent-[#0078d7] cursor-pointer"
            />
          </label>

          {/* Session Log */}
          {sessions.length > 0 && (
            <div className={`p-2 rounded-xs border ${cardCls}`}>
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Logged Sessions ({sessions.length})
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {sessions.slice(0, 6).map((sess, i) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between text-[11px] py-0.5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"
                  >
                    <span className="text-zinc-500">
                      #{sessions.length - i} · {sess.endedAt}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatDurationHMS(sess.durationSec)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
