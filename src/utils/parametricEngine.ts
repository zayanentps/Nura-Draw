import * as fabric from 'fabric';
import {
  DimConstraintKind,
  DimensionalConstraint,
  GeometricConstraint,
  GeometricConstraintType,
  ParametricState,
  ParametricVariable,
  UnitType,
} from '../types';
import { ensureObjectId, getObjectLabel } from './canvasHelpers';
import { pxToUnit, unitToPx, UNITS_DATA } from './units';

export const EMPTY_PARAMETRIC_STATE: ParametricState = {
  variables: [],
  dimConstraints: [],
  geomConstraints: [],
  showConstraints: true,
};

// ============================================================================
// 1. SAFE MATHEMATICAL FORMULA PARSER (Recursive Descent, zero eval/Function)
// ============================================================================

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

function tokenizeFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < s.length && s[i + 1] >= '0' && s[i + 1] <= '9')) {
      let end = i;
      let dotCount = 0;
      while (end < s.length && ((s[end] >= '0' && s[end] <= '9') || (s[end] === '.' && dotCount === 0))) {
        if (s[end] === '.') dotCount++;
        end++;
      }
      // Scientific notation e.g. 1e-3
      if (end < s.length && (s[end] === 'e' || s[end] === 'E')) {
        let expEnd = end + 1;
        if (expEnd < s.length && (s[expEnd] === '+' || s[expEnd] === '-')) expEnd++;
        if (expEnd < s.length && s[expEnd] >= '0' && s[expEnd] <= '9') {
          while (expEnd < s.length && s[expEnd] >= '0' && s[expEnd] <= '9') expEnd++;
          end = expEnd;
        }
      }
      const num = parseFloat(s.slice(i, end));
      if (!Number.isFinite(num)) throw new Error(`Invalid number near "${s.slice(i, end)}"`);
      tokens.push({ type: 'num', value: num });
      i = end;
      continue;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let end = i + 1;
      while (
        end < s.length &&
        ((s[end] >= 'a' && s[end] <= 'z') ||
          (s[end] >= 'A' && s[end] <= 'Z') ||
          (s[end] >= '0' && s[end] <= '9') ||
          s[end] === '_')
      ) {
        end++;
      }
      tokens.push({ type: 'id', value: s.slice(i, end) });
      i = end;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

const MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  sin: (deg) => Math.sin((deg * Math.PI) / 180),
  cos: (deg) => Math.cos((deg * Math.PI) / 180),
  tan: (deg) => Math.tan((deg * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  atan2: (y, x) => (Math.atan2(y, x) * 180) / Math.PI,
  sinr: (rad) => Math.sin(rad),
  cosr: (rad) => Math.cos(rad),
  tanr: (rad) => Math.tan(rad),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  round: (x, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round(x * f) / f;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  pow: (a, b) => Math.pow(a, b),
  log: (x) => Math.log(x),
  log10: (x) => Math.log10(x),
};

export function evaluateFormula(
  expression: string,
  env: Record<string, number>
): { value: number; error?: string; deps: string[] } {
  const trimmed = (expression || '').trim();
  if (!trimmed) return { value: NaN, error: 'Empty expression', deps: [] };

  try {
    const tokens = tokenizeFormula(trimmed);
    if (tokens.length === 0) return { value: NaN, error: 'Empty expression', deps: [] };

    let pos = 0;
    const deps = new Set<string>();
    const lowerEnv: Record<string, number> = {};
    for (const [k, v] of Object.entries(env)) {
      lowerEnv[k.toLowerCase()] = v;
    }

    const peek = (): Token | undefined => tokens[pos];
    const consume = (): Token => tokens[pos++];

    const parseExpr = (): number => parseAddSub();

    const parseAddSub = (): number => {
      let left = parseMulDiv();
      while (true) {
        const tok = peek();
        if (!tok || tok.type !== 'op' || (tok.value !== '+' && tok.value !== '-')) break;
        consume();
        const right = parseMulDiv();
        left = tok.value === '+' ? left + right : left - right;
      }
      return left;
    };

    const parseMulDiv = (): number => {
      let left = parsePower();
      while (true) {
        const tok = peek();
        if (!tok || tok.type !== 'op' || (tok.value !== '*' && tok.value !== '/' && tok.value !== '%')) break;
        consume();
        const right = parsePower();
        if (tok.value === '*') left *= right;
        else if (tok.value === '/') {
          if (Math.abs(right) < 1e-12) throw new Error('Division by zero');
          left /= right;
        } else {
          left %= right;
        }
      }
      return left;
    };

    const parsePower = (): number => {
      const base = parseUnary();
      const tok = peek();
      if (tok && tok.type === 'op' && tok.value === '^') {
        consume();
        const exp = parsePower();
        return Math.pow(base, exp);
      }
      return base;
    };

    const parseUnary = (): number => {
      const tok = peek();
      if (tok && tok.type === 'op' && (tok.value === '-' || tok.value === '+')) {
        consume();
        const val = parseUnary();
        return tok.value === '-' ? -val : val;
      }
      return parsePrimary();
    };

    const parsePrimary = (): number => {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of expression');
      if (tok.type === 'num') {
        consume();
        return tok.value;
      }
      if (tok.type === 'paren' && tok.value === '(') {
        consume();
        const val = parseExpr();
        const close = peek();
        if (!close || close.type !== 'paren' || close.value !== ')') {
          throw new Error('Missing closing parenthesis ")"');
        }
        consume();
        return val;
      }
      if (tok.type === 'id') {
        consume();
        const name = tok.value;
        const lower = name.toLowerCase();

        // Function call
        const nextTok = peek();
        if (nextTok && nextTok.type === 'paren' && nextTok.value === '(') {
          consume();
          const args: number[] = [];
          const argCheck = peek();
          if (!(argCheck && argCheck.type === 'paren' && argCheck.value === ')')) {
            args.push(parseExpr());
            while (peek()?.type === 'comma') {
              consume();
              args.push(parseExpr());
            }
          }
          const close = peek();
          if (!close || close.type !== 'paren' || close.value !== ')') {
            throw new Error(`Missing ")" in ${name}(...)`);
          }
          consume();
          const fn = MATH_FUNCS[lower];
          if (!fn) throw new Error(`Unknown function "${name}"`);
          const res = fn(...args);
          if (!Number.isFinite(res)) throw new Error(`Math error in ${name}(...)`);
          return res;
        }

        if (lower === 'pi') return Math.PI;
        if (lower === 'e') return Math.E;

        deps.add(name);
        if (name in env && Number.isFinite(env[name])) return env[name];
        if (lower in lowerEnv && Number.isFinite(lowerEnv[lower])) return lowerEnv[lower];
        throw new Error(`Unknown variable "${name}"`);
      }
      throw new Error('Invalid syntax');
    };

    const result = parseExpr();
    if (pos < tokens.length) {
      throw new Error('Unexpected trailing tokens');
    }
    if (!Number.isFinite(result)) {
      throw new Error('Result is not a finite number');
    }
    return { value: result, deps: Array.from(deps) };
  } catch (err: any) {
    return { value: NaN, error: err?.message || 'Formula error', deps: [] };
  }
}

export function evaluateParametricExpressions(state: ParametricState): ParametricState {
  const vars = state.variables.map((v) => ({ ...v }));
  const dims = state.dimConstraints.map((d) => ({ ...d }));

  const env: Record<string, number> = {};
  for (const v of vars) {
    if (Number.isFinite(v.value)) env[v.name] = v.value;
  }
  for (const d of dims) {
    if (Number.isFinite(d.value)) env[d.name] = d.value;
  }

  // Iterative fixed-point pass (handles chained variables & formulas cleanly)
  const maxPasses = vars.length + dims.length + 2;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const v of vars) {
      const res = evaluateFormula(v.expression, env);
      if (!res.error && Number.isFinite(res.value)) {
        if (env[v.name] !== res.value || v.error) changed = true;
        v.value = res.value;
        v.error = undefined;
        env[v.name] = res.value;
      } else {
        v.error = res.error;
      }
    }
    for (const d of dims) {
      const res = evaluateFormula(d.expression, env);
      if (!res.error && Number.isFinite(res.value)) {
        if (env[d.name] !== res.value || d.error) changed = true;
        d.value = res.value;
        d.error = undefined;
        env[d.name] = res.value;
      } else {
        d.error = res.error;
      }
    }
    if (!changed) break;
  }

  return {
    ...state,
    variables: vars,
    dimConstraints: dims,
  };
}

// ============================================================================
// 2. CANVAS OBJECT GEOMETRY HELPERS
// ============================================================================

export function findObjectById(canvas: fabric.Canvas, id: string): fabric.FabricObject | null {
  for (const obj of canvas.getObjects()) {
    if ((obj as any).id === id) return obj;
  }
  return null;
}

export function getLineEndpointsScene(line: fabric.Line): {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
} {
  line.setCoords();
  const matrix = line.calcTransformMatrix();
  const lp = line.calcLinePoints();
  const pt1 = fabric.util.transformPoint(new fabric.Point(lp.x1, lp.y1), matrix);
  const pt2 = fabric.util.transformPoint(new fabric.Point(lp.x2, lp.y2), matrix);
  return { p1: { x: pt1.x, y: pt1.y }, p2: { x: pt2.x, y: pt2.y } };
}

export function setLineEndpointsScene(
  line: fabric.Line,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) {
  line.set({
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
  });
  // Re-normalize Fabric.Line origin/left/top cleanly
  const minX = Math.min(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  line.set({
    left: minX,
    top: minY,
    width: w,
    height: h,
    x1: p1.x - cx,
    y1: p1.y - cy,
    x2: p2.x - cx,
    y2: p2.y - cy,
    originX: 'left',
    originY: 'top',
  });
  line.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center');
  line.setCoords();
}

export interface ObjectMetrics {
  id: string;
  label: string;
  type: string;
  center: { x: number; y: number };
  width: number;
  height: number;
  radius: number;
  length: number;
  angle: number;
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
}

export function getObjectMetrics(obj: fabric.FabricObject): ObjectMetrics {
  const id = ensureObjectId(obj);
  if (typeof obj.setCoords === 'function') obj.setCoords();
  const center = obj.getCenterPoint ? obj.getCenterPoint() : new fabric.Point(obj.left || 0, obj.top || 0);

  if (obj.type === 'line') {
    const { p1, p2 } = getLineEndpointsScene(obj as fabric.Line);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (ang < 0) ang += 360;
    return {
      id,
      label: getObjectLabel(obj),
      type: obj.type || 'line',
      center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      width: Math.abs(dx),
      height: Math.abs(dy),
      radius: len / 2,
      length: len,
      angle: ang,
      p1,
      p2,
    };
  }

  const w = Math.max(1, (obj.width || 0) * (obj.scaleX || 1));
  const h = Math.max(1, (obj.height || 0) * (obj.scaleY || 1));
  const r = obj.type === 'circle' ? ((obj as fabric.Circle).radius || w / 2) * (obj.scaleX || 1) : Math.max(w, h) / 2;

  return {
    id,
    label: getObjectLabel(obj),
    type: obj.type || 'object',
    center: { x: center.x, y: center.y },
    width: w,
    height: h,
    radius: r,
    length: Math.hypot(w, h),
    angle: (((obj.angle || 0) % 360) + 360) % 360,
  };
}

export function setObjectCenter(obj: fabric.FabricObject, cx: number, cy: number) {
  obj.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center');
  obj.setCoords();
}

export function setObjectDimensionsPx(
  obj: fabric.FabricObject,
  targetW: number | null,
  targetH: number | null,
  keepCenter = true
) {
  const prevCenter = obj.getCenterPoint();
  if (obj.type === 'line') {
    const { p1, p2 } = getLineEndpointsScene(obj as fabric.Line);
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const curLen = Math.hypot(dx, dy) || 1;
    let nx = dx;
    let ny = dy;
    if (targetW !== null && targetH !== null) {
      // Scale to target length = targetW
      const ux = dx / curLen;
      const uy = dy / curLen;
      nx = ux * targetW;
      ny = uy * targetW;
    } else if (targetW !== null) {
      const sign = dx >= 0 ? 1 : -1;
      nx = sign * Math.max(1, targetW);
    } else if (targetH !== null) {
      const sign = dy >= 0 ? 1 : -1;
      ny = sign * Math.max(1, targetH);
    }
    if (keepCenter) {
      setLineEndpointsScene(
        obj as fabric.Line,
        { x: cx - nx / 2, y: cy - ny / 2 },
        { x: cx + nx / 2, y: cy + ny / 2 }
      );
    } else {
      setLineEndpointsScene(obj as fabric.Line, p1, { x: p1.x + nx, y: p1.y + ny });
    }
    return;
  }

  if (obj.type === 'circle') {
    const circ = obj as fabric.Circle;
    const size = Math.max(2, targetW ?? targetH ?? ((circ.radius || 20) * 2 * (obj.scaleX || 1)));
    circ.set({ radius: size / 2, scaleX: 1, scaleY: 1 });
  } else if (obj.type === 'ellipse') {
    const ell = obj as fabric.Ellipse;
    const curW = (ell.rx || 20) * 2 * (obj.scaleX || 1);
    const curH = (ell.ry || 20) * 2 * (obj.scaleY || 1);
    const nextW = Math.max(2, targetW ?? curW);
    const nextH = Math.max(2, targetH ?? curH);
    ell.set({ rx: nextW / 2, ry: nextH / 2, scaleX: 1, scaleY: 1 });
  } else if (obj.type === 'rect') {
    const curW = (obj.width || 10) * (obj.scaleX || 1);
    const curH = (obj.height || 10) * (obj.scaleY || 1);
    obj.set({
      width: Math.max(2, targetW ?? curW),
      height: Math.max(2, targetH ?? curH),
      scaleX: 1,
      scaleY: 1,
    });
  } else {
    const baseW = Math.max(1, obj.width || 1);
    const baseH = Math.max(1, obj.height || 1);
    if (targetW !== null) obj.set('scaleX', Math.max(0.02, targetW / baseW));
    if (targetH !== null) obj.set('scaleY', Math.max(0.02, targetH / baseH));
  }

  if (keepCenter) {
    obj.setPositionByOrigin(prevCenter, 'center', 'center');
  }
  obj.setCoords();
}

export function setObjectAngleDeg(obj: fabric.FabricObject, angleDeg: number) {
  if (obj.type === 'line') {
    const { p1, p2 } = getLineEndpointsScene(obj as fabric.Line);
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rad = (angleDeg * Math.PI) / 180;
    const hx = (Math.cos(rad) * len) / 2;
    const hy = (Math.sin(rad) * len) / 2;
    setLineEndpointsScene(
      obj as fabric.Line,
      { x: cx - hx, y: cy - hy },
      { x: cx + hx, y: cy + hy }
    );
    return;
  }
  const prevCenter = obj.getCenterPoint();
  obj.set('angle', angleDeg);
  obj.setPositionByOrigin(prevCenter, 'center', 'center');
  obj.setCoords();
}

function getAnchorPoints(obj: fabric.FabricObject): { x: number; y: number }[] {
  const m = getObjectMetrics(obj);
  if (obj.type === 'line' && m.p1 && m.p2) {
    return [m.p1, m.p2, m.center];
  }
  if (obj.type === 'circle' || obj.type === 'ellipse') {
    const rx = m.width / 2;
    const ry = m.height / 2;
    return [
      m.center,
      { x: m.center.x + rx, y: m.center.y },
      { x: m.center.x - rx, y: m.center.y },
      { x: m.center.x, y: m.center.y + ry },
      { x: m.center.x, y: m.center.y - ry },
    ];
  }
  const hw = m.width / 2;
  const hh = m.height / 2;
  const rad = (m.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot = (dx: number, dy: number) => ({
    x: m.center.x + dx * cos - dy * sin,
    y: m.center.y + dx * sin + dy * cos,
  });
  return [m.center, rot(-hw, -hh), rot(hw, -hh), rot(hw, hh), rot(-hw, hh)];
}

function normalizeAngleDiff(target: number, ref: number): number {
  let d = target - ref;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function nearestParallelAngle(angleToMatch: number, currentAngle: number): number {
  const a1 = angleToMatch;
  const a2 = (angleToMatch + 180) % 360;
  return Math.abs(normalizeAngleDiff(a1, currentAngle)) <= Math.abs(normalizeAngleDiff(a2, currentAngle))
    ? a1
    : a2;
}

function nearestPerpAngle(angleToMatch: number, currentAngle: number): number {
  const a1 = (angleToMatch + 90) % 360;
  const a2 = (angleToMatch + 270) % 360;
  return Math.abs(normalizeAngleDiff(a1, currentAngle)) <= Math.abs(normalizeAngleDiff(a2, currentAngle))
    ? a1
    : a2;
}

// ============================================================================
// 3. CONSTRAINT & FORMULA SOLVER
// ============================================================================

export function pruneOrphanedConstraints(canvas: fabric.Canvas, state: ParametricState): ParametricState {
  const existingIds = new Set(canvas.getObjects().map((o) => (o as any).id).filter(Boolean));
  const dimConstraints = state.dimConstraints.filter((d) =>
    d.objectIds.length > 0 && d.objectIds.every((id) => existingIds.has(id))
  );
  const geomConstraints = state.geomConstraints.filter((g) => {
    const minReq = g.type === 'horizontal' || g.type === 'vertical' || g.type === 'fix' ? 1 : 2;
    return g.objectIds.length >= minReq && g.objectIds.every((id) => existingIds.has(id));
  });
  if (
    dimConstraints.length === state.dimConstraints.length &&
    geomConstraints.length === state.geomConstraints.length
  ) {
    return state;
  }
  return { ...state, dimConstraints, geomConstraints };
}

export function solveParametricSystem(
  canvas: fabric.Canvas,
  rawState: ParametricState,
  unit: UnitType,
  options?: { movedObjectId?: string; iterations?: number }
): { nextState: ParametricState; mutated: boolean } {
  const pruned = pruneOrphanedConstraints(canvas, rawState);
  const nextState = evaluateParametricExpressions(pruned);
  const movedId = options?.movedObjectId;
  const iterations = options?.iterations ?? 10;
  let mutated = false;

  for (let iter = 0; iter < iterations; iter++) {
    let iterChanged = false;

    // A. Enforce Dimensional Constraints (DCON)
    for (const dim of nextState.dimConstraints) {
      if (dim.error || !Number.isFinite(dim.value)) continue;

      if (dim.objectIds.length === 1) {
        const obj = findObjectById(canvas, dim.objectIds[0]);
        if (!obj) continue;
        const m = getObjectMetrics(obj);

        if (dim.kind === 'angular') {
          if (Math.abs(normalizeAngleDiff(dim.value, m.angle)) > 0.05) {
            setObjectAngleDeg(obj, dim.value);
            iterChanged = true;
          }
          continue;
        }

        const targetPx = Math.max(2, unitToPx(Math.abs(dim.value), unit));
        if (dim.kind === 'horizontal') {
          if (Math.abs(m.width - targetPx) > 0.25) {
            setObjectDimensionsPx(obj, targetPx, null, true);
            iterChanged = true;
          }
        } else if (dim.kind === 'vertical') {
          if (Math.abs(m.height - targetPx) > 0.25) {
            setObjectDimensionsPx(obj, null, targetPx, true);
            iterChanged = true;
          }
        } else if (dim.kind === 'aligned') {
          if (obj.type === 'line') {
            if (Math.abs(m.length - targetPx) > 0.25) {
              setObjectDimensionsPx(obj, targetPx, targetPx, true);
              iterChanged = true;
            }
          } else if (Math.abs(m.width - targetPx) > 0.25) {
            setObjectDimensionsPx(obj, targetPx, null, true);
            iterChanged = true;
          }
        } else if (dim.kind === 'radius') {
          const diamPx = targetPx * 2;
          if (Math.abs(m.width - diamPx) > 0.25 || Math.abs(m.height - diamPx) > 0.25) {
            setObjectDimensionsPx(obj, diamPx, diamPx, true);
            iterChanged = true;
          }
        } else if (dim.kind === 'diameter') {
          if (Math.abs(m.width - targetPx) > 0.25 || Math.abs(m.height - targetPx) > 0.25) {
            setObjectDimensionsPx(obj, targetPx, targetPx, true);
            iterChanged = true;
          }
        }
      } else if (dim.objectIds.length >= 2) {
        let objA = findObjectById(canvas, dim.objectIds[0]);
        let objB = findObjectById(canvas, dim.objectIds[1]);
        if (!objA || !objB) continue;
        // If user dragged objB, let objB drive objA
        if (movedId === dim.objectIds[1]) {
          [objA, objB] = [objB, objA];
        }
        const mA = getObjectMetrics(objA);
        const mB = getObjectMetrics(objB);

        if (dim.kind === 'angular') {
          const desiredAngle = (mA.angle + dim.value) % 360;
          if (Math.abs(normalizeAngleDiff(desiredAngle, mB.angle)) > 0.05) {
            setObjectAngleDeg(objB, desiredAngle);
            iterChanged = true;
          }
          continue;
        }

        const targetPx = unitToPx(dim.value, unit);
        if (dim.kind === 'horizontal') {
          const sign = mB.center.x >= mA.center.x ? 1 : -1;
          const desiredX = mA.center.x + sign * Math.abs(targetPx);
          if (Math.abs(mB.center.x - desiredX) > 0.25) {
            setObjectCenter(objB, desiredX, mB.center.y);
            iterChanged = true;
          }
        } else if (dim.kind === 'vertical') {
          const sign = mB.center.y >= mA.center.y ? 1 : -1;
          const desiredY = mA.center.y + sign * Math.abs(targetPx);
          if (Math.abs(mB.center.y - desiredY) > 0.25) {
            setObjectCenter(objB, mB.center.x, desiredY);
            iterChanged = true;
          }
        } else if (dim.kind === 'aligned') {
          const dx = mB.center.x - mA.center.x;
          const dy = mB.center.y - mA.center.y;
          const curDist = Math.hypot(dx, dy);
          const ux = curDist > 1e-4 ? dx / curDist : 1;
          const uy = curDist > 1e-4 ? dy / curDist : 0;
          const desiredX = mA.center.x + ux * Math.abs(targetPx);
          const desiredY = mA.center.y + uy * Math.abs(targetPx);
          if (Math.hypot(mB.center.x - desiredX, mB.center.y - desiredY) > 0.25) {
            setObjectCenter(objB, desiredX, desiredY);
            iterChanged = true;
          }
        }
      }
    }

    // B. Enforce Geometric Constraints (GCON)
    for (const gc of nextState.geomConstraints) {
      if (!gc.enabled || gc.objectIds.length === 0) continue;

      if (gc.type === 'fix') {
        const obj = findObjectById(canvas, gc.objectIds[0]);
        if (!obj || gc.fixedLeft === undefined || gc.fixedTop === undefined) continue;
        if (Math.abs((obj.left || 0) - gc.fixedLeft) > 0.2 || Math.abs((obj.top || 0) - gc.fixedTop) > 0.2) {
          obj.set({ left: gc.fixedLeft, top: gc.fixedTop });
          obj.setCoords();
          iterChanged = true;
        }
        continue;
      }

      if (gc.type === 'horizontal') {
        const obj = findObjectById(canvas, gc.objectIds[0]);
        if (!obj) continue;
        const m = getObjectMetrics(obj);
        const targetAng = nearestParallelAngle(0, m.angle);
        if (Math.abs(normalizeAngleDiff(targetAng, m.angle)) > 0.05) {
          setObjectAngleDeg(obj, targetAng);
          iterChanged = true;
        }
        continue;
      }

      if (gc.type === 'vertical') {
        const obj = findObjectById(canvas, gc.objectIds[0]);
        if (!obj) continue;
        const m = getObjectMetrics(obj);
        const targetAng = nearestParallelAngle(90, m.angle);
        if (Math.abs(normalizeAngleDiff(targetAng, m.angle)) > 0.05) {
          setObjectAngleDeg(obj, targetAng);
          iterChanged = true;
        }
        continue;
      }

      if (gc.objectIds.length < 2) continue;

      if (gc.type === 'symmetric') {
        let objA = findObjectById(canvas, gc.objectIds[0]);
        let objB = findObjectById(canvas, gc.objectIds[1]);
        if (!objA || !objB) continue;
        if (movedId === gc.objectIds[1]) {
          [objA, objB] = [objB, objA];
        }
        const mA = getObjectMetrics(objA);
        const mB = getObjectMetrics(objB);

        const axisObj = gc.objectIds[2] ? findObjectById(canvas, gc.objectIds[2]) : null;
        if (axisObj && axisObj.type === 'line') {
          const { p1, p2 } = getLineEndpointsScene(axisObj as fabric.Line);
          const vx = p2.x - p1.x;
          const vy = p2.y - p1.y;
          const lenSq = vx * vx + vy * vy || 1;
          const t = ((mA.center.x - p1.x) * vx + (mA.center.y - p1.y) * vy) / lenSq;
          const footX = p1.x + t * vx;
          const footY = p1.y + t * vy;
          const mirX = 2 * footX - mA.center.x;
          const mirY = 2 * footY - mA.center.y;
          const axisAng = (Math.atan2(vy, vx) * 180) / Math.PI;
          const mirAng = 2 * axisAng - mA.angle;
          if (
            Math.hypot(mB.center.x - mirX, mB.center.y - mirY) > 0.25 ||
            Math.abs(normalizeAngleDiff(mirAng, mB.angle)) > 0.1 ||
            Math.abs(mB.width - mA.width) > 0.3 ||
            Math.abs(mB.height - mA.height) > 0.3
          ) {
            setObjectDimensionsPx(objB, mA.width, mA.height, true);
            setObjectAngleDeg(objB, mirAng);
            setObjectCenter(objB, mirX, mirY);
            iterChanged = true;
          }
        } else {
          const axisPos = gc.axisPos ?? (mA.center.x + mB.center.x) / 2;
          const isHorizMirror = gc.axisMode === 'horizontal';
          const mirX = isHorizMirror ? mA.center.x : 2 * axisPos - mA.center.x;
          const mirY = isHorizMirror ? 2 * axisPos - mA.center.y : mA.center.y;
          const mirAng = isHorizMirror ? -mA.angle : 180 - mA.angle;
          if (
            Math.hypot(mB.center.x - mirX, mB.center.y - mirY) > 0.25 ||
            Math.abs(normalizeAngleDiff(mirAng, mB.angle)) > 0.1 ||
            Math.abs(mB.width - mA.width) > 0.3 ||
            Math.abs(mB.height - mA.height) > 0.3
          ) {
            setObjectDimensionsPx(objB, mA.width, mA.height, true);
            setObjectAngleDeg(objB, objA.type === 'rect' || objA.type === 'circle' || objA.type === 'ellipse' ? (isHorizMirror ? -mA.angle : -mA.angle) : mirAng);
            setObjectCenter(objB, mirX, mirY);
            iterChanged = true;
          }
        }
        continue;
      }

      // Multi-object constraints: use first object (or whichever object user moved) as reference
      const refId = movedId && gc.objectIds.includes(movedId) ? movedId : gc.objectIds[0];
      const refObj = findObjectById(canvas, refId);
      if (!refObj) continue;
      const mRef = getObjectMetrics(refObj);

      for (const otherId of gc.objectIds) {
        if (otherId === refId) continue;
        const otherObj = findObjectById(canvas, otherId);
        if (!otherObj) continue;
        const mOther = getObjectMetrics(otherObj);

        if (gc.type === 'concentric') {
          if (Math.hypot(mOther.center.x - mRef.center.x, mOther.center.y - mRef.center.y) > 0.2) {
            setObjectCenter(otherObj, mRef.center.x, mRef.center.y);
            iterChanged = true;
          }
        } else if (gc.type === 'parallel') {
          const targetAng = nearestParallelAngle(mRef.angle, mOther.angle);
          if (Math.abs(normalizeAngleDiff(targetAng, mOther.angle)) > 0.05) {
            setObjectAngleDeg(otherObj, targetAng);
            iterChanged = true;
          }
        } else if (gc.type === 'perpendicular') {
          const targetAng = nearestPerpAngle(mRef.angle, mOther.angle);
          if (Math.abs(normalizeAngleDiff(targetAng, mOther.angle)) > 0.05) {
            setObjectAngleDeg(otherObj, targetAng);
            iterChanged = true;
          }
        } else if (gc.type === 'equal') {
          if (refObj.type === 'line' && otherObj.type === 'line') {
            if (Math.abs(mOther.length - mRef.length) > 0.25) {
              setObjectDimensionsPx(otherObj, mRef.length, mRef.length, true);
              iterChanged = true;
            }
          } else if (refObj.type === 'circle' || otherObj.type === 'circle') {
            const targetD = mRef.radius * 2;
            if (Math.abs(mOther.width - targetD) > 0.25 || Math.abs(mOther.height - targetD) > 0.25) {
              setObjectDimensionsPx(otherObj, targetD, targetD, true);
              iterChanged = true;
            }
          } else {
            if (Math.abs(mOther.width - mRef.width) > 0.25 || Math.abs(mOther.height - mRef.height) > 0.25) {
              setObjectDimensionsPx(otherObj, mRef.width, mRef.height, true);
              iterChanged = true;
            }
          }
        } else if (gc.type === 'tangent') {
          // Circle/Ellipse <-> Circle/Ellipse tangency OR Line <-> Circle/Ellipse tangency
          if (refObj.type === 'line' && otherObj.type !== 'line' && mRef.p1 && mRef.p2) {
            const vx = mRef.p2.x - mRef.p1.x;
            const vy = mRef.p2.y - mRef.p1.y;
            const len = Math.hypot(vx, vy) || 1;
            const nx = -vy / len;
            const ny = vx / len;
            const signedDist = (mOther.center.x - mRef.p1.x) * nx + (mOther.center.y - mRef.p1.y) * ny;
            const sign = signedDist >= 0 ? 1 : -1;
            const diff = signedDist - sign * mOther.radius;
            if (Math.abs(diff) > 0.25) {
              setObjectCenter(otherObj, mOther.center.x - nx * diff, mOther.center.y - ny * diff);
              iterChanged = true;
            }
          } else if (otherObj.type === 'line' && refObj.type !== 'line' && mOther.p1 && mOther.p2) {
            const vx = mOther.p2.x - mOther.p1.x;
            const vy = mOther.p2.y - mOther.p1.y;
            const len = Math.hypot(vx, vy) || 1;
            const nx = -vy / len;
            const ny = vx / len;
            const signedDist = (mRef.center.x - mOther.p1.x) * nx + (mRef.center.y - mOther.p1.y) * ny;
            const sign = signedDist >= 0 ? 1 : -1;
            const diff = signedDist - sign * mRef.radius;
            if (Math.abs(diff) > 0.25) {
              setLineEndpointsScene(
                otherObj as fabric.Line,
                { x: mOther.p1.x + nx * diff, y: mOther.p1.y + ny * diff },
                { x: mOther.p2.x + nx * diff, y: mOther.p2.y + ny * diff }
              );
              iterChanged = true;
            }
          } else {
            const dx = mOther.center.x - mRef.center.x;
            const dy = mOther.center.y - mRef.center.y;
            const curDist = Math.hypot(dx, dy);
            const targetDist = mRef.radius + mOther.radius;
            if (Math.abs(curDist - targetDist) > 0.25) {
              const ux = curDist > 1e-4 ? dx / curDist : 1;
              const uy = curDist > 1e-4 ? dy / curDist : 0;
              setObjectCenter(
                otherObj,
                mRef.center.x + ux * targetDist,
                mRef.center.y + uy * targetDist
              );
              iterChanged = true;
            }
          }
        } else if (gc.type === 'coincident') {
          const ptsA = getAnchorPoints(refObj);
          const ptsB = getAnchorPoints(otherObj);
          let bestDist = Infinity;
          let bestShift = { dx: 0, dy: 0 };
          for (const pa of ptsA) {
            for (const pb of ptsB) {
              const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
              if (d < bestDist) {
                bestDist = d;
                bestShift = { dx: pa.x - pb.x, dy: pa.y - pb.y };
              }
            }
          }
          if (bestDist > 0.25) {
            setObjectCenter(otherObj, mOther.center.x + bestShift.dx, mOther.center.y + bestShift.dy);
            iterChanged = true;
          }
        }
      }
    }

    if (iterChanged) mutated = true;
    else break;
  }

  if (mutated) {
    canvas.requestRenderAll();
  }
  return { nextState, mutated };
}

// ============================================================================
// 4. CONSTRAINT CREATORS & AUTOCONSTRAIN
// ============================================================================

export function generateNextDimName(state: ParametricState, kind: DimConstraintKind): string {
  const prefix =
    kind === 'angular'
      ? 'ang'
      : kind === 'radius'
      ? 'rad'
      : kind === 'diameter'
      ? 'dia'
      : 'd';
  const used = new Set([
    ...state.dimConstraints.map((d) => d.name.toLowerCase()),
    ...state.variables.map((v) => v.name.toLowerCase()),
  ]);
  let idx = 1;
  while (used.has(`${prefix}${idx}`)) idx++;
  return `${prefix}${idx}`;
}

export function createDimConstraint(
  canvas: fabric.Canvas,
  state: ParametricState,
  kind: DimConstraintKind,
  objects: fabric.FabricObject[],
  unit: UnitType,
  customExpression?: string
): { state: ParametricState; created?: DimensionalConstraint; error?: string } {
  if (objects.length === 0) {
    return { state, error: 'Select 1 object (for size/angle) or 2 objects (for distance/angle).' };
  }
  const targetObjs = objects.slice(0, 2);
  const objectIds = targetObjs.map((o) => ensureObjectId(o));
  const decimals = UNITS_DATA[unit]?.decimals ?? 2;

  let measuredVal = 0;
  if (targetObjs.length === 1) {
    const m = getObjectMetrics(targetObjs[0]);
    if (kind === 'angular') {
      measuredVal = Number(m.angle.toFixed(1));
    } else if (kind === 'horizontal') {
      measuredVal = pxToUnit(m.width, unit, decimals);
    } else if (kind === 'vertical') {
      measuredVal = pxToUnit(m.height, unit, decimals);
    } else if (kind === 'radius') {
      measuredVal = pxToUnit(m.radius, unit, decimals);
    } else if (kind === 'diameter') {
      measuredVal = pxToUnit(m.radius * 2, unit, decimals);
    } else {
      measuredVal = pxToUnit(targetObjs[0].type === 'line' ? m.length : m.width, unit, decimals);
    }
  } else {
    const mA = getObjectMetrics(targetObjs[0]);
    const mB = getObjectMetrics(targetObjs[1]);
    if (kind === 'angular') {
      measuredVal = Number((((mB.angle - mA.angle) % 360 + 360) % 360).toFixed(1));
    } else if (kind === 'horizontal') {
      measuredVal = pxToUnit(Math.abs(mB.center.x - mA.center.x), unit, decimals);
    } else if (kind === 'vertical') {
      measuredVal = pxToUnit(Math.abs(mB.center.y - mA.center.y), unit, decimals);
    } else {
      measuredVal = pxToUnit(Math.hypot(mB.center.x - mA.center.x, mB.center.y - mA.center.y), unit, decimals);
    }
  }

  const name = generateNextDimName(state, kind);
  const expression = customExpression?.trim() || String(measuredVal);

  const created: DimensionalConstraint = {
    id: `dcon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    kind,
    objectIds,
    expression,
    value: measuredVal,
    offset: 22 + (state.dimConstraints.length % 3) * 14,
  };

  const nextState: ParametricState = {
    ...state,
    showConstraints: true,
    dimConstraints: [...state.dimConstraints, created],
  };

  const solved = solveParametricSystem(canvas, nextState, unit);
  return { state: solved.nextState, created };
}

export function createGeomConstraint(
  canvas: fabric.Canvas,
  state: ParametricState,
  type: GeometricConstraintType,
  objects: fabric.FabricObject[],
  unit: UnitType
): { state: ParametricState; created?: GeometricConstraint; error?: string } {
  const minCount = type === 'horizontal' || type === 'vertical' || type === 'fix' ? 1 : 2;
  if (objects.length < minCount) {
    return {
      state,
      error:
        minCount === 1
          ? `Select at least 1 object to apply ${type.toUpperCase()} constraint.`
          : `Select 2${type === 'symmetric' ? ' (or 3 with axis line)' : '+'} objects to apply ${type.toUpperCase()} constraint.`,
    };
  }

  const selected = type === 'symmetric' ? objects.slice(0, 3) : objects;
  const objectIds = selected.map((o) => ensureObjectId(o));

  // Avoid exact duplicate constraint on same object set
  const existing = state.geomConstraints.find(
    (g) =>
      g.type === type &&
      g.objectIds.length === objectIds.length &&
      g.objectIds.every((id) => objectIds.includes(id))
  );
  if (existing) {
    const solved = solveParametricSystem(canvas, state, unit);
    return { state: solved.nextState, created: existing };
  }

  let axisMode: 'vertical' | 'horizontal' | 'object' | undefined;
  let axisPos: number | undefined;
  let fixedLeft: number | undefined;
  let fixedTop: number | undefined;

  if (type === 'fix') {
    fixedLeft = selected[0].left || 0;
    fixedTop = selected[0].top || 0;
  } else if (type === 'symmetric') {
    if (selected.length >= 3 && selected[2].type === 'line') {
      axisMode = 'object';
    } else {
      const mA = getObjectMetrics(selected[0]);
      const mB = getObjectMetrics(selected[1]);
      const dx = Math.abs(mB.center.x - mA.center.x);
      const dy = Math.abs(mB.center.y - mA.center.y);
      if (dx >= dy) {
        axisMode = 'vertical';
        axisPos = (mA.center.x + mB.center.x) / 2;
      } else {
        axisMode = 'horizontal';
        axisPos = (mA.center.y + mB.center.y) / 2;
      }
    }
  }

  const created: GeometricConstraint = {
    id: `gcon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    objectIds,
    axisMode,
    axisPos,
    fixedLeft,
    fixedTop,
    enabled: true,
  };

  const nextState: ParametricState = {
    ...state,
    showConstraints: true,
    geomConstraints: [...state.geomConstraints, created],
  };

  const solved = solveParametricSystem(canvas, nextState, unit);
  return { state: solved.nextState, created };
}

export function autoConstrainObjects(
  canvas: fabric.Canvas,
  state: ParametricState,
  targetObjects: fabric.FabricObject[],
  unit: UnitType
): { state: ParametricState; addedCount: number } {
  const objs = targetObjects.filter(
    (o) => o.visible !== false && !(o as any).excludeFromExport && !(o as any).isDimension
  );
  if (objs.length === 0) return { state, addedCount: 0 };

  let curState = { ...state, showConstraints: true, geomConstraints: [...state.geomConstraints] };
  let addedCount = 0;

  const hasConstraint = (type: GeometricConstraintType, ids: string[]) =>
    curState.geomConstraints.some(
      (g) => g.type === type && g.objectIds.length === ids.length && ids.every((id) => g.objectIds.includes(id))
    );

  const pushConstraint = (gc: GeometricConstraint) => {
    curState.geomConstraints.push(gc);
    addedCount++;
  };

  const metrics = objs.map((o) => ({ obj: o, m: getObjectMetrics(o) }));

  // 1. Horizontal / Vertical lines or rotated shapes near 0° or 90°
  for (const { obj, m } of metrics) {
    if (obj.type === 'circle') continue;
    const mod180 = ((m.angle % 180) + 180) % 180;
    if (mod180 <= 3 || mod180 >= 177) {
      if (!hasConstraint('horizontal', [m.id])) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'horizontal',
          objectIds: [m.id],
          enabled: true,
        });
      }
    } else if (Math.abs(mod180 - 90) <= 3) {
      if (!hasConstraint('vertical', [m.id])) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'vertical',
          objectIds: [m.id],
          enabled: true,
        });
      }
    }
  }

  // 2. Pairwise Geometric Relationships
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const A = metrics[i];
      const B = metrics[j];
      const pairIds = [A.m.id, B.m.id];

      const centerDist = Math.hypot(B.m.center.x - A.m.center.x, B.m.center.y - A.m.center.y);

      // Concentric (centers within 12px)
      if (centerDist <= 12 && !hasConstraint('concentric', pairIds)) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'concentric',
          objectIds: pairIds,
          enabled: true,
        });
      }

      // Tangent (circle-circle or line-circle touching within 10px)
      if (
        (A.obj.type === 'circle' || A.obj.type === 'ellipse') &&
        (B.obj.type === 'circle' || B.obj.type === 'ellipse')
      ) {
        if (Math.abs(centerDist - (A.m.radius + B.m.radius)) <= 10 && !hasConstraint('tangent', pairIds)) {
          pushConstraint({
            id: `gcon-auto-${Date.now()}-${addedCount}`,
            type: 'tangent',
            objectIds: pairIds,
            enabled: true,
          });
        }
      }

      // Coincident endpoints/corners within 10px (when not concentric)
      if (centerDist > 12 && !hasConstraint('coincident', pairIds)) {
        const ptsA = getAnchorPoints(A.obj);
        const ptsB = getAnchorPoints(B.obj);
        let touches = false;
        for (const pa of ptsA) {
          for (const pb of ptsB) {
            if (Math.hypot(pa.x - pb.x, pa.y - pb.y) <= 10) {
              touches = true;
              break;
            }
          }
          if (touches) break;
        }
        if (touches) {
          pushConstraint({
            id: `gcon-auto-${Date.now()}-${addedCount}`,
            type: 'coincident',
            objectIds: pairIds,
            enabled: true,
          });
        }
      }

      // Parallel or Perpendicular lines/shapes
      const modDiff180 = Math.abs(normalizeAngleDiff(nearestParallelAngle(A.m.angle, B.m.angle), B.m.angle));
      const modPerp = Math.abs(normalizeAngleDiff(nearestPerpAngle(A.m.angle, B.m.angle), B.m.angle));
      if ((A.obj.type === 'line' || B.obj.type === 'line') && modDiff180 <= 3.5 && !hasConstraint('parallel', pairIds)) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'parallel',
          objectIds: pairIds,
          enabled: true,
        });
      } else if ((A.obj.type === 'line' || B.obj.type === 'line') && modPerp <= 3.5 && !hasConstraint('perpendicular', pairIds)) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'perpendicular',
          objectIds: pairIds,
          enabled: true,
        });
      }

      // Equal size/radius/length (within 4%)
      const isEqual =
        A.obj.type === 'line' && B.obj.type === 'line'
          ? Math.abs(A.m.length - B.m.length) / Math.max(1, A.m.length) <= 0.04
          : (A.obj.type === 'circle' || B.obj.type === 'circle')
          ? Math.abs(A.m.radius - B.m.radius) / Math.max(1, A.m.radius) <= 0.04
          : Math.abs(A.m.width - B.m.width) / Math.max(1, A.m.width) <= 0.04 &&
            Math.abs(A.m.height - B.m.height) / Math.max(1, A.m.height) <= 0.04;
      if (isEqual && !hasConstraint('equal', pairIds)) {
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'equal',
          objectIds: pairIds,
          enabled: true,
        });
      }

      // Symmetric pair (aligned horizontally or vertically with matching size)
      if (
        centerDist > 20 &&
        isEqual &&
        (Math.abs(A.m.center.y - B.m.center.y) <= 8 || Math.abs(A.m.center.x - B.m.center.x) <= 8) &&
        !hasConstraint('symmetric', pairIds)
      ) {
        const horizAligned = Math.abs(A.m.center.y - B.m.center.y) <= 8;
        pushConstraint({
          id: `gcon-auto-${Date.now()}-${addedCount}`,
          type: 'symmetric',
          objectIds: pairIds,
          axisMode: horizAligned ? 'vertical' : 'horizontal',
          axisPos: horizAligned ? (A.m.center.x + B.m.center.x) / 2 : (A.m.center.y + B.m.center.y) / 2,
          enabled: true,
        });
      }
    }
  }

  const solved = solveParametricSystem(canvas, curState, unit);
  return { state: solved.nextState, addedCount };
}

// ============================================================================
// 5. VISUAL OVERLAY DATA (DCON CALLOUTS + GCON BADGES)
// ============================================================================

export interface DimCalloutOverlay {
  id: string;
  name: string;
  expression: string;
  value: number;
  kind: DimConstraintKind;
  label: string;
  error?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  extX1: number;
  extY1: number;
  extX2: number;
  extY2: number;
  midX: number;
  midY: number;
}

export interface GeomBadgeOverlay {
  id: string;
  type: GeometricConstraintType;
  glyph: string;
  label: string;
  x: number;
  y: number;
  linkFrom?: { x: number; y: number };
  linkTo?: { x: number; y: number };
  axisLine?: { x1: number; y1: number; x2: number; y2: number };
}

const GCON_GLYPHS: Record<GeometricConstraintType, { glyph: string; label: string }> = {
  parallel: { glyph: '//', label: 'Parallel' },
  perpendicular: { glyph: '⊥', label: 'Perpendicular' },
  tangent: { glyph: '⌖', label: 'Tangent' },
  concentric: { glyph: '◎', label: 'Concentric' },
  coincident: { glyph: '⊡', label: 'Coincident' },
  equal: { glyph: '=', label: 'Equal' },
  symmetric: { glyph: '◫', label: 'Symmetric' },
  horizontal: { glyph: '—', label: 'Horizontal' },
  vertical: { glyph: '|', label: 'Vertical' },
  fix: { glyph: '🔒', label: 'Fixed' },
};

export function computeParametricOverlays(
  canvas: fabric.Canvas | null,
  state: ParametricState | undefined,
  unit: UnitType
): { dimCallouts: DimCalloutOverlay[]; geomBadges: GeomBadgeOverlay[] } {
  if (!canvas || !state || !state.showConstraints) {
    return { dimCallouts: [], geomBadges: [] };
  }

  const unitSym = UNITS_DATA[unit]?.symbol || unit;
  const decimals = UNITS_DATA[unit]?.decimals ?? 2;
  const dimCallouts: DimCalloutOverlay[] = [];
  const geomBadges: GeomBadgeOverlay[] = [];

  for (const d of state.dimConstraints) {
    const offset = d.offset ?? 24;
    const valStr = Number.isFinite(d.value) ? Number(d.value.toFixed(d.kind === 'angular' ? 1 : decimals)) : '?';
    const hasFormula = d.expression.trim() !== String(d.value) && /[a-zA-Z+\-*/^()]/.test(d.expression);
    const unitTag = d.kind === 'angular' ? '°' : ` ${unitSym}`;
    const prefix = d.kind === 'diameter' ? 'Ø ' : d.kind === 'radius' ? 'R ' : d.kind === 'angular' ? '∠ ' : '';
    const label = hasFormula ? `${d.name} = ${d.expression} (${prefix}${valStr}${unitTag})` : `${d.name} = ${prefix}${valStr}${unitTag}`;

    if (d.objectIds.length === 1) {
      const obj = findObjectById(canvas, d.objectIds[0]);
      if (!obj) continue;
      const m = getObjectMetrics(obj);
      const halfW = m.width / 2;
      const halfH = m.height / 2;

      if (d.kind === 'horizontal' || d.kind === 'aligned' || d.kind === 'diameter') {
        const y = m.center.y - halfH - offset;
        const x1 = m.center.x - halfW;
        const x2 = m.center.x + halfW;
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1,
          y1: y,
          x2,
          y2: y,
          extX1: x1,
          extY1: m.center.y - halfH,
          extX2: x2,
          extY2: m.center.y - halfH,
          midX: (x1 + x2) / 2,
          midY: y,
        });
      } else if (d.kind === 'vertical') {
        const x = m.center.x + halfW + offset;
        const y1 = m.center.y - halfH;
        const y2 = m.center.y + halfH;
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1: x,
          y1,
          x2: x,
          y2,
          extX1: m.center.x + halfW,
          extY1: y1,
          extX2: m.center.x + halfW,
          extY2: y2,
          midX: x,
          midY: (y1 + y2) / 2,
        });
      } else if (d.kind === 'radius') {
        const x1 = m.center.x;
        const y1 = m.center.y;
        const x2 = m.center.x + m.radius;
        const y2 = m.center.y - m.radius * 0.35;
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1,
          y1,
          x2,
          y2,
          extX1: x1,
          extY1: y1,
          extX2: x2,
          extY2: y2,
          midX: (x1 + x2) / 2,
          midY: (y1 + y2) / 2 - 10,
        });
      } else if (d.kind === 'angular') {
        const x1 = m.center.x;
        const y1 = m.center.y;
        const rad = (m.angle * Math.PI) / 180;
        const x2 = x1 + Math.cos(rad) * Math.max(36, halfW * 0.7);
        const y2 = y1 + Math.sin(rad) * Math.max(36, halfW * 0.7);
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1,
          y1,
          x2,
          y2,
          extX1: x1,
          extY1: y1,
          extX2: x1 + 40,
          extY2: y1,
          midX: x2 + 12,
          midY: y2 - 8,
        });
      }
    } else if (d.objectIds.length >= 2) {
      const objA = findObjectById(canvas, d.objectIds[0]);
      const objB = findObjectById(canvas, d.objectIds[1]);
      if (!objA || !objB) continue;
      const mA = getObjectMetrics(objA);
      const mB = getObjectMetrics(objB);

      if (d.kind === 'horizontal') {
        const y = Math.min(mA.center.y - mA.height / 2, mB.center.y - mB.height / 2) - offset;
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1: mA.center.x,
          y1: y,
          x2: mB.center.x,
          y2: y,
          extX1: mA.center.x,
          extY1: mA.center.y,
          extX2: mB.center.x,
          extY2: mB.center.y,
          midX: (mA.center.x + mB.center.x) / 2,
          midY: y,
        });
      } else if (d.kind === 'vertical') {
        const x = Math.max(mA.center.x + mA.width / 2, mB.center.x + mB.width / 2) + offset;
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1: x,
          y1: mA.center.y,
          x2: x,
          y2: mB.center.y,
          extX1: mA.center.x,
          extY1: mA.center.y,
          extX2: mB.center.x,
          extY2: mB.center.y,
          midX: x,
          midY: (mA.center.y + mB.center.y) / 2,
        });
      } else {
        dimCallouts.push({
          id: d.id,
          name: d.name,
          expression: d.expression,
          value: d.value,
          kind: d.kind,
          label,
          error: d.error,
          x1: mA.center.x,
          y1: mA.center.y,
          x2: mB.center.x,
          y2: mB.center.y,
          extX1: mA.center.x,
          extY1: mA.center.y,
          extX2: mB.center.x,
          extY2: mB.center.y,
          midX: (mA.center.x + mB.center.x) / 2,
          midY: (mA.center.y + mB.center.y) / 2 - 12,
        });
      }
    }
  }

  // Track per-object badge stacking so overlapping GCON icons spread horizontally
  const objBadgeCount = new Map<string, number>();

  for (const gc of state.geomConstraints) {
    if (!gc.enabled) continue;
    const meta = GCON_GLYPHS[gc.type];
    if (gc.objectIds.length === 1) {
      const obj = findObjectById(canvas, gc.objectIds[0]);
      if (!obj) continue;
      const m = getObjectMetrics(obj);
      const slot = objBadgeCount.get(m.id) || 0;
      objBadgeCount.set(m.id, slot + 1);
      geomBadges.push({
        id: gc.id,
        type: gc.type,
        glyph: meta.glyph,
        label: meta.label,
        x: m.center.x - m.width / 2 + 10 + slot * 22,
        y: m.center.y - m.height / 2 - 10,
      });
    } else if (gc.objectIds.length >= 2) {
      const objA = findObjectById(canvas, gc.objectIds[0]);
      const objB = findObjectById(canvas, gc.objectIds[1]);
      if (!objA || !objB) continue;
      const mA = getObjectMetrics(objA);
      const mB = getObjectMetrics(objB);

      let bx = (mA.center.x + mB.center.x) / 2;
      let by = (mA.center.y + mB.center.y) / 2;
      if (gc.type === 'concentric') {
        bx = mA.center.x + 14;
        by = mA.center.y - 14;
      }

      let axisLine: { x1: number; y1: number; x2: number; y2: number } | undefined;
      if (gc.type === 'symmetric' && gc.axisPos !== undefined && gc.axisMode !== 'object') {
        if (gc.axisMode === 'horizontal') {
          const minX = Math.min(mA.center.x, mB.center.x) - 40;
          const maxX = Math.max(mA.center.x, mB.center.x) + 40;
          axisLine = { x1: minX, y1: gc.axisPos, x2: maxX, y2: gc.axisPos };
        } else {
          const minY = Math.min(mA.center.y, mB.center.y) - 40;
          const maxY = Math.max(mA.center.y, mB.center.y) + 40;
          axisLine = { x1: gc.axisPos, y1: minY, x2: gc.axisPos, y2: maxY };
        }
      }

      geomBadges.push({
        id: gc.id,
        type: gc.type,
        glyph: meta.glyph,
        label: meta.label,
        x: bx,
        y: by,
        linkFrom: mA.center,
        linkTo: mB.center,
        axisLine,
      });
    }
  }

  return { dimCallouts, geomBadges };
}
