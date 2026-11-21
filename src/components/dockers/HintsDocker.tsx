import React from 'react';
import { Lightbulb, MousePointer, Move, Square, Type, Magnet, HelpCircle, Scissors, Copy, Layers } from 'lucide-react';
import { ThemeMode, ToolType } from '../../types';

interface HintsDockerProps {
  theme?: ThemeMode;
  activeTool?: ToolType;
}

export const HintsDocker: React.FC<HintsDockerProps> = ({
  theme = 'light',
  activeTool = 'pick',
}) => {
  const isDark = theme === 'dark';

  const hintsMap: Record<string, { title: string; desc: string; shortcuts: string[] }> = {
    pick: {
      title: 'Pick Tool (V / Spacebar)',
      desc: 'Selects, moves, scales, and transforms objects. Click a node, midpoint, or center point to grab and magnetically snap it onto other object points and page guidelines.',
      shortcuts: [
        'Shift + Click: Multi-select objects',
        'Alt + Click: Pick object underneath',
        'P: Center selection to page',
        'L / R: Align Left / Right',
        'T / B: Align Top / Bottom',
        'C / E: Align Horizontal / Vertical centers',
      ],
    },
    rectangle: {
      title: 'Rectangle Tool (F6)',
      desc: 'Draws rectangles and squares. Click and drag on canvas, or click once to create a standard rectangle.',
      shortcuts: [
        'Ctrl / Shift: Constrain to square',
        'Alt: Draw from center',
        'Double-click tool: Create page-boundary rectangle',
      ],
    },
    ellipse: {
      title: 'Ellipse Tool (F7)',
      desc: 'Draws ellipses, circles, pie shapes, and arcs.',
      shortcuts: [
        'Ctrl / Shift: Constrain to perfect circle',
        'Alt: Draw outward from center point',
      ],
    },
    text: {
      title: 'Text Tool (F8)',
      desc: 'Creates artistic text and paragraph frames. Click to place artistic vector text or drag to create text frame.',
      shortcuts: [
        'Ctrl + B: Bold text',
        'Ctrl + I: Italic text',
        'Ctrl + Q: Convert text to curves (vector paths)',
      ],
    },
    dimension: {
      title: 'Parallel Dimension Tool',
      desc: 'Draws sloped or straight dimension lines measuring the true distance between two snapped points in document units.',
      shortcuts: [
        'Drag P1 → P2: Place parallel dimension',
        'Shift: Constrain to 15° / 45° / 90° polar angles',
        'Double-click dimension: Edit label text in Group Editing',
      ],
    },
    hv_dimension: {
      title: 'Horizontal or Vertical Dimension',
      desc: 'Measures strict horizontal (X) or vertical (Y) distance between two points with perpendicular extension lines.',
      shortcuts: [
        'Drag predominantly horizontally: Horizontal dimension',
        'Drag predominantly vertically: Vertical dimension',
        'OSNAP: Snaps to corners, midpoints, and centers',
      ],
    },
    angular_dimension: {
      title: 'Angular Dimension Tool',
      desc: 'Measures the angle in degrees between two rays radiating from a common vertex.',
      shortcuts: [
        'Click 1: Set Vertex point',
        'Click 2: Set First angle ray',
        'Click 3: Set Second angle ray & place arc',
        'Esc: Cancel current measurement',
      ],
    },
    segment_dimension: {
      title: 'Segment Dimension Tool',
      desc: 'One-click edge measurement tool for rectangles, polygons, lines, and vector path segments.',
      shortcuts: [
        'Hover edge: Highlights segment & shows live length',
        'Click edge: Places offset dimension automatically',
        'Drag anywhere: Manual offset dimension',
      ],
    },
    callout: {
      title: '2-Leg Callout Tool',
      desc: 'Draws a 2-leg leader line with arrowhead, angled elbow, horizontal shoulder, and editable callout label.',
      shortcuts: [
        'Click 1: Anchor target point',
        'Click 2: Set elbow bend',
        'Click 3: Set shoulder & create callout',
        'Double-click callout: Edit callout text',
      ],
    },
    shadow: {
      title: 'Drop Shadow Tool',
      desc: 'Adds a realistic soft-edged drop shadow behind vector shapes, text, and bitmaps.',
      shortcuts: [
        'Click object: Apply soft Drop Shadow',
        'Property Bar: Switch between all 7 interactive effects',
      ],
    },
    contour: {
      title: 'Contour Tool (Ctrl + F9)',
      desc: 'Generates concentric inner or outer contour steps around the selected object.',
      shortcuts: [
        'Click object: Generate 3-step contour',
        'Effect Options: Customize steps, offset, and colors',
      ],
    },
    blend: {
      title: 'Blend Tool',
      desc: 'Creates smooth intermediate morph steps progressing in shape, scale, and opacity.',
      shortcuts: [
        'Click object: Generate cascading blend steps',
        'Select 2 objects + Effects → Blend: Morph between two objects',
      ],
    },
    distort: {
      title: 'Distort Tool',
      desc: 'Applies Push & Pull, Zipper, or Twister vector distortion to shapes and curves.',
      shortcuts: [
        'Click vector shape: Apply Push & Pull distortion',
        'Effect Options: Apply Zipper or Twister filter distortion',
      ],
    },
    envelope: {
      title: 'Envelope Tool (Ctrl + F7)',
      desc: 'Warps and reshapes an object by stretching or arching its bounding envelope.',
      shortcuts: [
        'Click object: Apply quick Arc envelope warp',
        'Effect Options: Choose Arc, Bulge, or Perspective Skew presets',
      ],
    },
    extrude: {
      title: 'Extrude Tool',
      desc: 'Projects a 2D shape or text into 3D space with solid extruded depth faces.',
      shortcuts: [
        'Click object: Apply 3D isometric extrusion',
        'Effect Options: Customize extrusion depth and color',
      ],
    },
    block_shadow: {
      title: 'Block Shadow Tool',
      desc: 'Generates a clean, solid-color vector block shadow ideal for signage, cutting plotters, and screen printing.',
      shortcuts: [
        'Click object: Generate solid offset Block Shadow group',
      ],
    },
    freehand: {
      title: 'Freehand Tool (F5)',
      desc: 'Draws smooth freehand curves and sketches directly on the canvas.',
      shortcuts: [
        'Drag on canvas: Draw freehand stroke',
        'Property Bar: Adjust stroke width & dash style',
      ],
    },
    line2p: {
      title: '2-Point Line Tool',
      desc: 'Draws a straight line segment with two clicks: click start point P1, move cursor, and click end point P2.',
      shortcuts: [
        '1st Click → Move → 2nd Click: Create line segment',
        'Shift / ORTHO: Constrain to 0° / 90° | Esc: Cancel',
      ],
    },
    bezier: {
      title: 'Bézier Tool',
      desc: 'Draws precision cubic Bézier curves one node and handle pair at a time.',
      shortcuts: [
        'Click: Place corner cusp node',
        'Click & Drag: Pull out smooth Bézier handles',
        'Double-click / Enter: Finish curve | Click start node: Close',
      ],
    },
    pen: {
      title: 'Pen Tool',
      desc: 'Draws continuous Bézier curves with a live preview of the next curve segment.',
      shortcuts: [
        'Click: Add straight segment | Drag: Curve segment',
        'Double-click / Enter: Finish | Esc: Cancel',
      ],
    },
    b_spline: {
      title: 'B-Spline Tool',
      desc: 'Draws smooth, organic curves using floating control points without sharp kinks.',
      shortcuts: [
        'Click points: Add B-spline control vertices',
        'Click first point: Close loop | Double-click / Enter: Finish',
      ],
    },
    polyline: {
      title: 'Polyline Tool',
      desc: 'Draws connected straight line segments in one continuous open or closed path.',
      shortcuts: [
        'Click points: Add connected line segments',
        'Shift: Constrain angle | Double-click / Enter: Finish',
      ],
    },
    curve_3p: {
      title: '3-Point Curve Tool',
      desc: 'Defines a curve by dragging its start-to-end chord and clicking to set the arc apex.',
      shortcuts: [
        'Step 1 (Drag P1 → P2): Set curve endpoints',
        'Step 2 (Move & Click P3): Set arc height & finish',
        'Esc: Cancel current curve',
      ],
    },
    crop: {
      title: 'Crop Tool',
      desc: 'Draws an adjustable rectangular crop region to trim intersecting objects and remove everything outside.',
      shortcuts: [
        'Drag rectangle: Create adjustable Crop marquee',
        'Drag handles / inside: Resize or reposition Crop box',
        'Double-click inside / Enter / Crop button: Apply Crop',
        'Esc / Clear: Cancel Crop marquee',
      ],
    },
    knife: {
      title: 'Knife Tool',
      desc: 'Slices vector shapes, curves, text, and images along a cut line into two independent pieces.',
      shortcuts: [
        'Drag line across object: Slice into 2 separate parts',
        'Shift + Drag: Constrain cut angle to 15° / 45° / 90°',
        'Property Bar: Toggle Auto-Gap separation on cut',
      ],
    },
    virtual_segment_delete: {
      title: 'Virtual Segment Delete Tool',
      desc: 'Highlights and deletes individual curve or shape edge segments without removing the rest of the object.',
      shortcuts: [
        'Hover edge: Highlight target segment & show length',
        'Click highlighted segment: Delete only that segment',
        'Single-segment line: Removes entire line',
      ],
    },
    eraser: {
      title: 'Eraser Tool (X)',
      desc: 'Erases portions of objects interactively along a Round or Square nib brush stroke.',
      shortcuts: [
        'Drag across objects: Erase along nib stroke path',
        'Property Bar: Adjust Eraser Thickness & Round/Square nib',
        'Shortcut: X',
      ],
    },
    eyedropper: {
      title: 'Color Eyedropper Tool (I)',
      desc: 'Samples fill and outline stroke colors from any vector shape, text, group object, gradient, or image on the canvas and updates your primary colors.',
      shortcuts: [
        'Hover object: Preview live Fill & Stroke hex colors',
        'Click object: Sample Fill & Stroke into primary colors',
        'Shift + Click: Sample multiple objects continuously',
        'Shortcut: I',
      ],
    },
  };

  const hint = hintsMap[activeTool] || hintsMap.pick;

  return (
    <div className={`flex flex-col h-full select-none text-xs p-3 space-y-4 overflow-y-auto ${
      isDark ? 'bg-[#4d5056] text-zinc-100' : 'bg-[#f8f9fa] text-zinc-800'
    }`}>
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-300 dark:border-zinc-700">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="font-semibold text-sm">{hint.title}</span>
      </div>

      <p className={`leading-relaxed text-[11.5px] ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>
        {hint.desc}
      </p>

      <div className="space-y-1.5">
        <span className={`font-semibold text-[11px] uppercase tracking-wide ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>
          Tool Shortcuts
        </span>
        <div className="space-y-1 mt-1">
          {hint.shortcuts.map((sc, i) => (
            <div
              key={i}
              className={`px-2 py-1 rounded text-[11px] ${
                isDark ? 'bg-[#43464c] text-zinc-100 border border-[#646870]' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
              }`}
            >
              {sc}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-zinc-300/60 dark:border-zinc-700">
        <span className={`font-semibold text-[11px] uppercase tracking-wide ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>
          CorelDRAW Keyboard Shortcuts
        </span>
        <div className="grid grid-cols-1 gap-1 text-[10.5px]">
          {[
            ['Ctrl + A', 'Select All'],
            ['Ctrl + B', 'Bold'],
            ['Ctrl + C / X / V', 'Copy / Cut / Paste'],
            ['Ctrl + D', 'Duplicate'],
            ['Ctrl + E / I', 'Export / Import'],
            ['Ctrl + G / U', 'Group / Ungroup'],
            ['Ctrl + J', 'Options & Settings'],
            ['Ctrl + K / Q', 'Break Apart / Convert to Curves'],
            ['Ctrl + N / O / S / P', 'New / Open / Save / Print'],
            ['Ctrl + T', 'Format Text'],
            ['Ctrl + Z', 'Undo'],
            ['F1 / F9', 'CorelDRAW Help / Full Screen'],
            ['F2 / F3 / F4', 'Zoom Tool / Zoom Out / Fit Window'],
            ['F5 / F6 / F7 / F8', 'Freehand / Rectangle / Ellipse / Text'],
            ['F10 / F11', 'Shape Tool / Fountain Fill'],
            ['I / X', 'Color Eyedropper / Eraser'],
          ].map(([keys, desc]) => (
            <div
              key={keys}
              className={`flex items-center justify-between px-2 py-1 rounded border ${
                isDark ? 'bg-[#43464c] text-zinc-100 border-[#646870]' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              <span className="font-mono font-semibold text-sky-500">{keys}</span>
              <span className="text-right">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-700 text-[10.5px] text-zinc-500 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
        <span>Press F1 anytime to toggle Help & Shortcuts.</span>
      </div>
    </div>
  );
};
