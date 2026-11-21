import React, { useState } from 'react';
import * as fabric from 'fabric';
import {
  X,
  Plus,
  Trash2,
  Sliders,
  Ruler,
  Link2,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import {
  DimConstraintKind,
  GeometricConstraintType,
  ParametricState,
  ParametricVariable,
  ThemeMode,
  UnitType,
} from '../types';
import { findObjectById } from '../utils/parametricEngine';
import { getObjectLabel } from '../utils/canvasHelpers';
import { UNITS_DATA } from '../utils/units';

interface ParametersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: fabric.Canvas | null;
  parametricState: ParametricState;
  onUpdateState: (next: ParametricState, solve?: boolean) => void;
  onAutoConstrain: () => void;
  onAddDimConstraint?: (kind: DimConstraintKind) => void;
  onAddGeomConstraint?: (type: GeometricConstraintType) => void;
  unit: UnitType;
  theme?: ThemeMode;
}

export const ParametersManagerModal: React.FC<ParametersManagerModalProps> = ({
  isOpen,
  onClose,
  canvas,
  parametricState,
  onUpdateState,
  onAutoConstrain,
  onAddDimConstraint,
  onAddGeomConstraint,
  unit,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [newVarName, setNewVarName] = useState('');
  const [newVarExpr, setNewVarExpr] = useState('100');
  const [newVarUnit, setNewVarUnit] = useState<UnitType | 'deg' | 'scalar'>(unit);
  const [newVarComment, setNewVarComment] = useState('');
  const [varError, setVarError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  if (!isOpen) return null;

  const unitSym = UNITS_DATA[unit]?.symbol || unit;
  const decimals = UNITS_DATA[unit]?.decimals ?? 2;

  const resolveObjLabel = (id: string) => {
    if (!canvas) return id;
    const obj = findObjectById(canvas, id);
    return obj ? getObjectLabel(obj) : 'Missing Object';
  };

  const handleAddVariable = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = newVarName.trim().replace(/\s+/g, '_');
    if (!cleaned || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleaned)) {
      setVarError('Name must start with a letter and use letters/numbers/underscores (e.g. Width, Hole_Dia).');
      return;
    }
    const lower = cleaned.toLowerCase();
    const exists =
      parametricState.variables.some((v) => v.name.toLowerCase() === lower) ||
      parametricState.dimConstraints.some((d) => d.name.toLowerCase() === lower);
    if (exists) {
      setVarError(`Parameter "${cleaned}" already exists.`);
      return;
    }
    setVarError(null);
    const nextVar: ParametricVariable = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleaned,
      expression: newVarExpr.trim() || '0',
      value: 0,
      unit: newVarUnit,
      comment: newVarComment.trim() || undefined,
    };
    onUpdateState(
      {
        ...parametricState,
        variables: [...parametricState.variables, nextVar],
      },
      true
    );
    setNewVarName('');
    setNewVarExpr('100');
    setNewVarComment('');
  };

  const handleUpdateVar = (id: string, patch: Partial<ParametricVariable>) => {
    const nextVars = parametricState.variables.map((v) => (v.id === id ? { ...v, ...patch } : v));
    onUpdateState({ ...parametricState, variables: nextVars }, true);
  };

  const handleDeleteVar = (id: string) => {
    onUpdateState(
      {
        ...parametricState,
        variables: parametricState.variables.filter((v) => v.id !== id),
      },
      true
    );
  };

  const handleUpdateDim = (id: string, expression: string, name?: string) => {
    const nextDims = parametricState.dimConstraints.map((d) =>
      d.id === id
        ? {
            ...d,
            expression,
            ...(name !== undefined ? { name: name.trim().replace(/\s+/g, '_') || d.name } : {}),
          }
        : d
    );
    onUpdateState({ ...parametricState, dimConstraints: nextDims }, true);
  };

  const handleDeleteDim = (id: string) => {
    onUpdateState(
      {
        ...parametricState,
        dimConstraints: parametricState.dimConstraints.filter((d) => d.id !== id),
      },
      true
    );
  };

  const handleToggleGeom = (id: string) => {
    onUpdateState(
      {
        ...parametricState,
        geomConstraints: parametricState.geomConstraints.map((g) =>
          g.id === id ? { ...g, enabled: !g.enabled } : g
        ),
      },
      true
    );
  };

  const handleDeleteGeom = (id: string) => {
    onUpdateState(
      {
        ...parametricState,
        geomConstraints: parametricState.geomConstraints.filter((g) => g.id !== id),
      },
      true
    );
  };

  const q = filterText.trim().toLowerCase();
  const filteredVars = parametricState.variables.filter(
    (v) => !q || v.name.toLowerCase().includes(q) || v.expression.toLowerCase().includes(q)
  );
  const filteredDims = parametricState.dimConstraints.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.expression.toLowerCase().includes(q) ||
      d.kind.toLowerCase().includes(q)
  );
  const filteredGeoms = parametricState.geomConstraints.filter(
    (g) =>
      !q ||
      g.type.toLowerCase().includes(q) ||
      g.objectIds.some((id) => resolveObjLabel(id).toLowerCase().includes(q))
  );

  const selectedCount = canvas?.getActiveObjects()?.length || 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div
        className={`w-full max-w-4xl max-h-[86vh] rounded-md shadow-2xl border flex flex-col overflow-hidden text-xs ${
          isDark
            ? 'bg-[#383b40] border-[#595d66] text-zinc-100'
            : 'bg-[#f4f5f7] border-[#9a9ea4] text-zinc-900'
        }`}
        style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
      >
        {/* Header */}
        <div
          className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
            isDark ? 'bg-[#2c2f34] border-[#52565e]' : 'bg-[#e3e6eb] border-[#c4c8cf]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-500" />
            <div>
              <h2 className="font-semibold text-[13px] leading-tight">
                Parameters Manager <span className="font-mono text-[10px] opacity-75">(PARAMETERS / PAR)</span>
              </h2>
              <p className="text-[10.5px] opacity-75">
                Define user variables, formulas (e.g. Width = Length / 2), and live DCON / GCON rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  ...parametricState,
                  showConstraints: !parametricState.showConstraints,
                })
              }
              title="Show / Hide Constraints on Canvas"
              className={`px-2 py-1 rounded-xs border flex items-center gap-1 text-[11px] transition-colors ${
                parametricState.showConstraints
                  ? isDark
                    ? 'bg-cyan-900/40 border-cyan-500/70 text-cyan-200'
                    : 'bg-[#d0e8f9] border-[#5b9bd5] text-[#004e98]'
                  : isDark
                  ? 'border-[#595d66] text-zinc-400 hover:bg-zinc-700'
                  : 'border-[#c4c8cf] text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {parametricState.showConstraints ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{parametricState.showConstraints ? 'Badges ON' : 'Badges OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onAutoConstrain}
              title="AutoConstrain selected or canvas objects"
              className="px-2.5 py-1 rounded-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1 text-[11px] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AutoConstrain</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateState(parametricState, true)}
              title="Re-evaluate all formulas and solve constraints"
              className={`px-2 py-1 rounded-xs border flex items-center gap-1 text-[11px] ${
                isDark ? 'border-[#595d66] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-zinc-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Solve All</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-xs ${isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-300 text-zinc-700'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Toolbar: Filter + Quick Apply on Current Selection */}
        <div
          className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'bg-[#31343a] border-[#4b4f58]' : 'bg-[#eceef1] border-[#d3d7de]'
          }`}
        >
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter variables, dimensions, or constraints..."
            className={`px-2.5 py-1 rounded-xs border text-[11px] w-64 outline-none ${
              isDark
                ? 'bg-[#26292e] border-[#52565e] text-zinc-100 placeholder:text-zinc-500'
                : 'bg-white border-[#c4c8cf] text-zinc-900 placeholder:text-zinc-400'
            }`}
          />

          <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
            <span className="opacity-70 mr-1">
              Selection ({selectedCount}):
            </span>
            {onAddDimConstraint && (
              <>
                <button
                  type="button"
                  onClick={() => onAddDimConstraint('horizontal')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-blue-50'
                  }`}
                >
                  + Width (DCON)
                </button>
                <button
                  type="button"
                  onClick={() => onAddDimConstraint('vertical')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-blue-50'
                  }`}
                >
                  + Height (DCON)
                </button>
                <button
                  type="button"
                  onClick={() => onAddDimConstraint('aligned')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-blue-50'
                  }`}
                >
                  + Aligned
                </button>
              </>
            )}
            {onAddGeomConstraint && (
              <>
                <button
                  type="button"
                  onClick={() => onAddGeomConstraint('equal')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-cyan-50'
                  }`}
                >
                  = Equal
                </button>
                <button
                  type="button"
                  onClick={() => onAddGeomConstraint('concentric')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-cyan-50'
                  }`}
                >
                  ◎ Concentric
                </button>
                <button
                  type="button"
                  onClick={() => onAddGeomConstraint('symmetric')}
                  className={`px-1.5 py-0.5 rounded-xs border ${
                    isDark ? 'border-[#555a64] hover:bg-zinc-700' : 'border-[#c4c8cf] bg-white hover:bg-cyan-50'
                  }`}
                >
                  ◫ Symmetric
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* 1. USER PARAMETERS & FORMULAS */}
          <section
            className={`rounded-xs border overflow-hidden ${
              isDark ? 'border-[#52565e] bg-[#2e3136]' : 'border-[#c8ccd4] bg-white'
            }`}
          >
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between ${
                isDark ? 'bg-[#26292e] border-[#4b4f58]' : 'bg-[#e9ecf0] border-[#d3d7de]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11.5px]">
                <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                <span>User Parameters & Formulas ({filteredVars.length})</span>
              </div>
              <span className="text-[10px] opacity-70 font-mono">
                Supports +, -, *, /, ^, sqrt(), sin(), cos(), min(), max(), pi
              </span>
            </div>

            {/* Add New Parameter Form */}
            <form
              onSubmit={handleAddVariable}
              className={`p-2 border-b flex flex-wrap items-center gap-2 ${
                isDark ? 'bg-[#34383e] border-[#4b4f58]' : 'bg-[#f8f9fb] border-[#e2e5ea]'
              }`}
            >
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Name (e.g. Length)"
                className={`px-2 py-1 rounded-xs border text-[11px] font-mono w-36 outline-none ${
                  isDark ? 'bg-[#26292e] border-[#52565e] text-white' : 'bg-white border-[#c4c8cf]'
                }`}
              />
              <span className="font-mono opacity-60">=</span>
              <input
                type="text"
                value={newVarExpr}
                onChange={(e) => setNewVarExpr(e.target.value)}
                placeholder="Formula (e.g. Length / 2)"
                className={`px-2 py-1 rounded-xs border text-[11px] font-mono flex-1 min-w-[160px] outline-none ${
                  isDark ? 'bg-[#26292e] border-[#52565e] text-white' : 'bg-white border-[#c4c8cf]'
                }`}
              />
              <select
                value={newVarUnit}
                onChange={(e) => setNewVarUnit(e.target.value as any)}
                className={`px-1.5 py-1 rounded-xs border text-[11px] outline-none ${
                  isDark ? 'bg-[#26292e] border-[#52565e] text-white' : 'bg-white border-[#c4c8cf]'
                }`}
              >
                <option value={unit}>{unitSym}</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">in</option>
                <option value="px">px</option>
                <option value="deg">deg (°)</option>
                <option value="scalar">scalar</option>
              </select>
              <input
                type="text"
                value={newVarComment}
                onChange={(e) => setNewVarComment(e.target.value)}
                placeholder="Comment (optional)"
                className={`px-2 py-1 rounded-xs border text-[11px] w-36 outline-none ${
                  isDark ? 'bg-[#26292e] border-[#52565e] text-white' : 'bg-white border-[#c4c8cf]'
                }`}
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-xs bg-[#0078d7] hover:bg-[#006cbe] text-white font-medium flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Parameter</span>
              </button>
              {varError && <div className="w-full text-red-500 text-[10.5px]">{varError}</div>}
            </form>

            {filteredVars.length === 0 ? (
              <div className="px-3 py-4 text-center opacity-65 text-[11px]">
                No user parameters yet. Create variables like <span className="font-mono font-semibold">Length = 200</span> and{' '}
                <span className="font-mono font-semibold">Width = Length / 2</span>, then reference them in any Dimensional Constraint.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[10.5px] uppercase tracking-wider border-b ${
                      isDark ? 'bg-[#292c31] border-[#4b4f58] text-zinc-400' : 'bg-[#f1f3f6] border-[#dfe3e8] text-zinc-500'
                    }`}
                  >
                    <th className="px-3 py-1.5">Name</th>
                    <th className="px-3 py-1.5">Expression / Formula</th>
                    <th className="px-3 py-1.5 w-28">Value</th>
                    <th className="px-3 py-1.5">Comment</th>
                    <th className="px-2 py-1.5 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVars.map((v) => (
                    <tr
                      key={v.id}
                      className={`border-b last:border-b-0 ${
                        isDark ? 'border-[#41454d] hover:bg-[#353940]' : 'border-[#eceff3] hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono font-semibold text-cyan-500">{v.name}</td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={v.expression}
                          onChange={(e) => handleUpdateVar(v.id, { expression: e.target.value })}
                          className={`w-full px-2 py-0.5 rounded-xs border font-mono text-[11px] outline-none ${
                            v.error
                              ? 'border-red-500 bg-red-500/10'
                              : isDark
                              ? 'bg-[#24272b] border-[#52565e] focus:border-cyan-400'
                              : 'bg-white border-[#cfd4dc] focus:border-blue-500'
                          }`}
                        />
                        {v.error && <div className="text-[10px] text-red-500 mt-0.5">{v.error}</div>}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {v.error || !Number.isFinite(v.value)
                          ? 'Error'
                          : `${Number(v.value.toFixed(decimals))} ${
                              v.unit === 'deg' ? '°' : v.unit === 'scalar' ? '' : v.unit || unitSym
                            }`}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={v.comment || ''}
                          onChange={(e) => handleUpdateVar(v.id, { comment: e.target.value })}
                          placeholder="—"
                          className={`w-full px-1.5 py-0.5 rounded-xs border text-[11px] outline-none ${
                            isDark
                              ? 'bg-[#24272b] border-transparent focus:border-[#52565e]'
                              : 'bg-transparent border-transparent focus:border-[#cfd4dc] focus:bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteVar(v.id)}
                          className="p-1 text-red-500 hover:bg-red-500/15 rounded-xs"
                          title="Delete parameter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 2. DIMENSIONAL CONSTRAINTS (DIMCONSTRAINT / DCON) */}
          <section
            className={`rounded-xs border overflow-hidden ${
              isDark ? 'border-[#52565e] bg-[#2e3136]' : 'border-[#c8ccd4] bg-white'
            }`}
          >
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between ${
                isDark ? 'bg-[#26292e] border-[#4b4f58]' : 'bg-[#e9ecf0] border-[#d3d7de]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11.5px]">
                <Ruler className="w-3.5 h-3.5 text-blue-500" />
                <span>Dimensional Constraints — DIMCONSTRAINT / DCON ({filteredDims.length})</span>
              </div>
              <span className="text-[10px] opacity-70">
                Editing Expression immediately resizes/updates the linked object(s)
              </span>
            </div>

            {filteredDims.length === 0 ? (
              <div className="px-3 py-4 text-center opacity-65 text-[11px]">
                No dimensional constraints attached yet. Select an object (or 2 objects) and use{' '}
                <span className="font-semibold">Parametric &amp; Constraints → Dynamic Dimension (DCON)</span>.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[10.5px] uppercase tracking-wider border-b ${
                      isDark ? 'bg-[#292c31] border-[#4b4f58] text-zinc-400' : 'bg-[#f1f3f6] border-[#dfe3e8] text-zinc-500'
                    }`}
                  >
                    <th className="px-3 py-1.5 w-24">Name</th>
                    <th className="px-3 py-1.5 w-24">Type</th>
                    <th className="px-3 py-1.5">Target Object(s)</th>
                    <th className="px-3 py-1.5">Expression / Formula</th>
                    <th className="px-3 py-1.5 w-28">Evaluated</th>
                    <th className="px-2 py-1.5 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDims.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-b last:border-b-0 ${
                        isDark ? 'border-[#41454d] hover:bg-[#353940]' : 'border-[#eceff3] hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={d.name}
                          onChange={(e) => handleUpdateDim(d.id, d.expression, e.target.value)}
                          className={`w-20 px-1.5 py-0.5 rounded-xs border font-mono font-semibold text-blue-500 outline-none ${
                            isDark ? 'bg-[#24272b] border-[#52565e]' : 'bg-white border-[#cfd4dc]'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-1.5 capitalize">{d.kind}</td>
                      <td className="px-3 py-1.5 text-[11px] opacity-85">
                        {d.objectIds.map(resolveObjLabel).join(' ↔ ')}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={d.expression}
                          onChange={(e) => handleUpdateDim(d.id, e.target.value)}
                          className={`w-full px-2 py-0.5 rounded-xs border font-mono text-[11px] outline-none ${
                            d.error
                              ? 'border-red-500 bg-red-500/10'
                              : isDark
                              ? 'bg-[#24272b] border-[#52565e] focus:border-blue-400'
                              : 'bg-white border-[#cfd4dc] focus:border-blue-500'
                          }`}
                        />
                        {d.error && <div className="text-[10px] text-red-500 mt-0.5">{d.error}</div>}
                      </td>
                      <td className="px-3 py-1.5 font-mono font-semibold">
                        {d.error || !Number.isFinite(d.value)
                          ? 'Error'
                          : d.kind === 'angular'
                          ? `${Number(d.value.toFixed(1))}°`
                          : `${Number(d.value.toFixed(decimals))} ${unitSym}`}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteDim(d.id)}
                          className="p-1 text-red-500 hover:bg-red-500/15 rounded-xs"
                          title="Remove dimensional constraint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 3. GEOMETRIC CONSTRAINTS (GEOMCONSTRAINT / GCON) */}
          <section
            className={`rounded-xs border overflow-hidden ${
              isDark ? 'border-[#52565e] bg-[#2e3136]' : 'border-[#c8ccd4] bg-white'
            }`}
          >
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between ${
                isDark ? 'bg-[#26292e] border-[#4b4f58]' : 'bg-[#e9ecf0] border-[#d3d7de]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11.5px]">
                <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Geometric Constraints — GEOMCONSTRAINT / GCON ({filteredGeoms.length})</span>
              </div>
              <span className="text-[10px] opacity-70">
                Parallel, Perpendicular, Tangent, Concentric, Coincident, Equal, Symmetric
              </span>
            </div>

            {filteredGeoms.length === 0 ? (
              <div className="px-3 py-4 text-center opacity-65 text-[11px]">
                No geometric constraints active. Select 2+ objects and choose a rule under{' '}
                <span className="font-semibold">Parametric &amp; Constraints → Geometric Constraints (GCON)</span> or run{' '}
                <span className="font-semibold">AutoConstrain</span>.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[10.5px] uppercase tracking-wider border-b ${
                      isDark ? 'bg-[#292c31] border-[#4b4f58] text-zinc-400' : 'bg-[#f1f3f6] border-[#dfe3e8] text-zinc-500'
                    }`}
                  >
                    <th className="px-3 py-1.5 w-32">Constraint</th>
                    <th className="px-3 py-1.5">Linked Objects</th>
                    <th className="px-3 py-1.5 w-24 text-center">Active</th>
                    <th className="px-2 py-1.5 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGeoms.map((g) => (
                    <tr
                      key={g.id}
                      className={`border-b last:border-b-0 ${
                        isDark ? 'border-[#41454d] hover:bg-[#353940]' : 'border-[#eceff3] hover:bg-emerald-50/40'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-semibold capitalize text-emerald-500">{g.type}</td>
                      <td className="px-3 py-1.5 text-[11px]">
                        {g.objectIds.map(resolveObjLabel).join('  ↔  ')}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleGeom(g.id)}
                          className={`px-2 py-0.5 rounded-xs border text-[10px] font-medium inline-flex items-center gap-1 ${
                            g.enabled
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                              : 'bg-zinc-500/15 border-zinc-500/40 text-zinc-400'
                          }`}
                        >
                          {g.enabled && <Check className="w-3 h-3" />}
                          <span>{g.enabled ? 'Enabled' : 'Paused'}</span>
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteGeom(g.id)}
                          className="p-1 text-red-500 hover:bg-red-500/15 rounded-xs"
                          title="Delete constraint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* Footer */}
        <div
          className={`px-3.5 py-2 border-t flex items-center justify-between text-[11px] ${
            isDark ? 'bg-[#2c2f34] border-[#52565e]' : 'bg-[#e3e6eb] border-[#c4c8cf]'
          }`}
        >
          <span className="opacity-75">
            Tip: Click any dynamic dimension badge on the canvas to edit its value or formula directly.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 rounded-xs bg-[#0078d7] hover:bg-[#006cbe] text-white font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
