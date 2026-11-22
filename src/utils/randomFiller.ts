import * as fabric from 'fabric';
import { ensureObjectId, disableObjectCaching } from './canvasHelpers';

export interface RandomFillerOptions {
  treatAsOneGroup: boolean;
  minSizePct: number;
  maxSizePct: number;
  minRotationDeg: number;
  maxRotationDeg: number;
  spacingPct: number;
  seed: number;
}

export interface RandomFillerResult {
  group: fabric.Group;
  count: number;
}

// Fast deterministic PRNG (Mulberry32)
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(rng: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + rng() * (max - min);
}

interface PlacedDisk {
  x: number;
  y: number;
  r: number;
}

interface SourcePrototype {
  obj: fabric.FabricObject;
  baseWidth: number;
  baseHeight: number;
  baseRadius: number;
}

/**
 * Generates non-overlapping, randomly scaled and rotated clones of 1 or more source objects
 * inside a target container object, clipped cleanly to the target shape's boundary.
 */
export async function generateRandomFillerGroup(
  canvas: fabric.Canvas,
  sources: fabric.FabricObject[],
  target: fabric.FabricObject,
  options: RandomFillerOptions
): Promise<RandomFillerResult> {
  if (!sources.length) {
    throw new Error('At least one source object is required.');
  }

  const rng = createSeededRandom(options.seed);
  const minSize = Math.max(5, Math.min(300, Math.min(options.minSizePct, options.maxSizePct))) / 100;
  const maxSize = Math.max(5, Math.min(300, Math.max(options.minSizePct, options.maxSizePct))) / 100;
  const minRot = Math.min(options.minRotationDeg, options.maxRotationDeg);
  const maxRot = Math.max(options.minRotationDeg, options.maxRotationDeg);
  const spacingNorm = Math.max(0, Math.min(200, options.spacingPct)) / 100;

  // Build prototypes (either one combined group or individual source prototypes)
  const prototypes: SourcePrototype[] = [];

  if (options.treatAsOneGroup && sources.length > 1) {
    const clones = await Promise.all(sources.map((s) => s.clone()));
    const tmpGroup = new fabric.Group(clones, { originX: 'center', originY: 'center' });
    const gb = tmpGroup.getBoundingRect();
    const w = Math.max(4, gb.width);
    const h = Math.max(4, gb.height);
    const baseRadius = Math.max(w, h) * 0.48;
    prototypes.push({
      obj: tmpGroup,
      baseWidth: w,
      baseHeight: h,
      baseRadius,
    });
  } else {
    for (const src of sources) {
      const b = src.getBoundingRect();
      const w = Math.max(4, b.width);
      const h = Math.max(4, b.height);
      const baseRadius = Math.max(w, h) * 0.46;
      prototypes.push({
        obj: src,
        baseWidth: w,
        baseHeight: h,
        baseRadius,
      });
    }
  }

  const tRect = target.getBoundingRect();
  const targetW = Math.max(10, tRect.width);
  const targetH = Math.max(10, tRect.height);

  // Spacing controls clearance between objects (26% matches natural loose packing)
  const gapMultiplier = 1 + spacingNorm * 0.85;

  // Spatial hash for fast O(1) collision checking
  const avgProtoR =
    prototypes.reduce((acc, p) => acc + p.baseRadius, 0) / Math.max(1, prototypes.length);
  const cellSize = Math.max(12, avgProtoR * maxSize * gapMultiplier * 2);
  const grid = new Map<string, PlacedDisk[]>();

  const getCellKey = (gx: number, gy: number) => `${gx},${gy}`;

  const collides = (x: number, y: number, effR: number): boolean => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const bucket = grid.get(getCellKey(gx + dx, gy + dy));
        if (!bucket) continue;
        for (const d of bucket) {
          const minDist = effR + d.r;
          const distSq = (x - d.x) * (x - d.x) + (y - d.y) * (y - d.y);
          if (distSq < minDist * minDist) return true;
        }
      }
    }
    return false;
  };

  const registerDisk = (x: number, y: number, r: number) => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    const key = getCellKey(gx, gy);
    const list = grid.get(key);
    if (list) {
      list.push({ x, y, r });
    } else {
      grid.set(key, [{ x, y, r }]);
    }
  };

  const placements: {
    protoIndex: number;
    x: number;
    y: number;
    scaleFactor: number;
    angleDeg: number;
  }[] = [];

  // Allow centers slightly near/past edge so border shapes clip nicely like NuraDraw Random Filler
  const maxAllowedItems = 280;
  const maxAttempts = 2200;
  let consecutiveMisses = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (placements.length >= maxAllowedItems || consecutiveMisses > 280) break;

    const protoIndex = Math.floor(rng() * prototypes.length);
    const proto = prototypes[protoIndex];

    // Bias slightly toward larger sizes early, smaller sizes fill gaps naturally
    const sizeFactor = randomBetween(rng, minSize, maxSize);
    const visualR = Math.max(2, proto.baseRadius * sizeFactor);
    const collisionR = visualR * gapMultiplier;

    const pad = visualR * 0.35;
    const cx = tRect.left - pad + rng() * (targetW + pad * 2);
    const cy = tRect.top - pad + rng() * (targetH + pad * 2);

    // For non-rectangular targets (circles, stars, polygons, paths), verify point is inside or near border
    const pt = new fabric.Point(cx, cy);
    const insideExact = typeof target.containsPoint === 'function' ? target.containsPoint(pt) : true;
    if (!insideExact) {
      // Allow slight edge overhang only if at least one cardinal offset by 0.45 * visualR is inside
      const nearEdge =
        typeof target.containsPoint === 'function' &&
        (target.containsPoint(new fabric.Point(cx + visualR * 0.45, cy)) ||
          target.containsPoint(new fabric.Point(cx - visualR * 0.45, cy)) ||
          target.containsPoint(new fabric.Point(cx, cy + visualR * 0.45)) ||
          target.containsPoint(new fabric.Point(cx, cy - visualR * 0.45)));
      if (!nearEdge) {
        consecutiveMisses++;
        continue;
      }
    }

    if (collides(cx, cy, collisionR)) {
      consecutiveMisses++;
      continue;
    }

    consecutiveMisses = 0;
    registerDisk(cx, cy, collisionR);

    const rotOffset = randomBetween(rng, minRot, maxRot);
    placements.push({
      protoIndex,
      x: cx,
      y: cy,
      scaleFactor: sizeFactor,
      angleDeg: rotOffset,
    });
  }

  // Clone placed objects
  const placedObjects: fabric.FabricObject[] = await Promise.all(
    placements.map(async (pl) => {
      const proto = prototypes[pl.protoIndex];
      const cloned = await proto.obj.clone();
      const baseScaleX = proto.obj.scaleX ?? 1;
      const baseScaleY = proto.obj.scaleY ?? 1;
      const baseAngle = proto.obj.angle ?? 0;

      cloned.set({
        originX: 'center',
        originY: 'center',
        left: pl.x,
        top: pl.y,
        scaleX: baseScaleX * pl.scaleFactor,
        scaleY: baseScaleY * pl.scaleFactor,
        angle: baseAngle + pl.angleDeg,
      });
      cloned.setCoords();
      disableObjectCaching(cloned);
      return cloned;
    })
  );

  // Ensure non-empty group fallback if target is too tiny for spacing
  if (placedObjects.length === 0) {
    const proto = prototypes[0];
    const cloned = await proto.obj.clone();
    const fitScale = Math.min(
      (targetW * 0.6) / Math.max(1, proto.baseWidth),
      (targetH * 0.6) / Math.max(1, proto.baseHeight),
      minSize
    );
    cloned.set({
      originX: 'center',
      originY: 'center',
      left: tRect.left + tRect.width / 2,
      top: tRect.top + tRect.height / 2,
      scaleX: (proto.obj.scaleX ?? 1) * fitScale,
      scaleY: (proto.obj.scaleY ?? 1) * fitScale,
      angle: (proto.obj.angle ?? 0) + randomBetween(rng, minRot, maxRot),
    });
    cloned.setCoords();
    placedObjects.push(cloned);
  }

  const fillGroup = new fabric.Group(placedObjects, {
    subTargetCheck: false,
  });
  fillGroup.setCoords();

  // Clip fillGroup strictly to target shape geometry in fillGroup's local plane
  const clipMask = await target.clone();
  clipMask.set({
    stroke: 'transparent',
    strokeWidth: 0,
    fill: '#000000',
    shadow: null,
  });
  fabric.util.sendObjectToPlane(clipMask, undefined, fillGroup.calcTransformMatrix());
  fillGroup.clipPath = clipMask;

  (fillGroup as any).customType = 'random_filler';
  ensureObjectId(fillGroup, `Random Fill (${placedObjects.length})`);
  disableObjectCaching(fillGroup);

  // Place directly above target object in canvas stack
  canvas.add(fillGroup);
  const targetIdx = canvas.getObjects().indexOf(target);
  if (targetIdx >= 0) {
    canvas.moveObjectTo(fillGroup, targetIdx + 1);
  }
  canvas.requestRenderAll();

  return {
    group: fillGroup,
    count: placedObjects.length,
  };
}
