// The multi-panel layouts: each id builds its panel polygons (normalised 0..1) for square, portrait and landscape.
import { transposePolygon } from './panelGeometry.js';

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** x of the line through (xTop, 0) and (xBottom, 1) at height y. */
const along = (xTop, xBottom, y) => xTop + (xBottom - xTop) * y;

/** Where the slanted column line (xTop..xBottom) meets the slanted row line (yLeft..yRight). */
function cross(xTop, xBottom, yLeft, yRight) {
  let y = (yLeft + yRight) / 2;
  for (let i = 0; i < 8; i += 1) {
    const x = along(xTop, xBottom, y);
    y = yLeft + (yRight - yLeft) * x;
  }
  return [along(xTop, xBottom, y), y];
}

/** Columns split by slanted lines, each line given as [xTop, xBottom]. */
function slantedColumns(lines) {
  const edges = [[0, 0], ...lines, [1, 1]];
  const panels = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const [a0, a1] = edges[i];
    const [b0, b1] = edges[i + 1];
    panels.push([[a0, 0], [b0, 0], [b1, 1], [a1, 1]]);
  }
  return panels;
}

/** Landscape (and square) panels for each layout, wide side across. */
const LANDSCAPE = {
  // Hero on the left half, then a 2x2 block of balanced panels with slanted seams (top row a little taller).
  poster: () => {
    const seam = [0.525, 0.475];
    const cut = [0.765, 0.735];
    const row = [0.56, 0.53];
    const a = cross(...seam, ...row);
    const b = cross(...cut, ...row);
    return [
      [[0, 0], [seam[0], 0], [seam[1], 1], [0, 1]],
      [[seam[0], 0], [cut[0], 0], b, a],
      [[cut[0], 0], [1, 0], [1, row[1]], b],
      [a, b, [cut[1], 1], [seam[1], 1]],
      [b, [1, row[1]], [1, 1], [cut[1], 1]],
    ];
  },
  hero: () => [rect(0, 0, 1, 1)],
  split: () => slantedColumns([[0.58, 0.46]]),
  stack: () => slantedColumns([[0.37, 0.31], [0.71, 0.65]]),
  grid: () => {
    const c = cross(0.57, 0.53, 0.47, 0.53);
    return [
      [[0, 0], [0.57, 0], c, [0, 0.47]],
      [[0.57, 0], [1, 0], [1, 0.53], c],
      [[0, 0.47], c, [0.53, 1], [0, 1]],
      [c, [1, 0.53], [1, 1], [0.53, 1]],
    ];
  },
  shards: () => {
    const midL = [along(0.42, 0.34, 0.6), 0.6];
    const midR = [along(0.72, 0.66, 0.4), 0.4];
    const sideL = cross(0.72, 0.66, 0.55, 0.62);
    return [
      [[0, 0], [0.42, 0], [0.34, 1], [0, 1]],
      [[0.42, 0], [0.72, 0], midR, midL],
      [midL, midR, [0.66, 1], [0.34, 1]],
      [[0.72, 0], [1, 0], [1, 0.62], sideL],
      [sideL, [1, 0.62], [1, 1], [0.66, 1]],
    ];
  },
  stagger: () => {
    const row = [0.53, 0.47];
    const top = [[0.35, 0.33], [0.68, 0.66]].map(([a, b]) => [[a, 0], cross(a, b, ...row)]);
    const bottom = [[0.43, 0.41], [0.77, 0.75]].map(([a, b]) => [cross(a, b, ...row), [b, 1]]);
    const rowAt = (x) => [x, row[0] + (row[1] - row[0]) * x];
    return [
      [[0, 0], top[0][0], top[0][1], rowAt(0)],
      [top[0][0], top[1][0], top[1][1], top[0][1]],
      [top[1][0], [1, 0], rowAt(1), top[1][1]],
      [rowAt(0), bottom[0][0], bottom[0][1], [0, 1]],
      [bottom[0][0], bottom[1][0], bottom[1][1], bottom[0][1]],
      [bottom[1][0], rowAt(1), [1, 1], bottom[1][1]],
    ];
  },
  heroStrip: () => {
    const a = cross(0.7, 0.66, 0.33, 0.35);
    const b = cross(0.7, 0.66, 0.66, 0.68);
    return [
      [[0, 0], [0.7, 0], [0.66, 1], [0, 1]],
      [[0.7, 0], [1, 0], [1, 0.35], a],
      [a, [1, 0.35], [1, 0.68], b],
      [b, [1, 0.68], [1, 1], [0.66, 1]],
    ];
  },
  mosaic: () => {
    const left = cross(0.27, 0.25, 0.47, 0.43);
    const right = cross(0.75, 0.73, 0.55, 0.6);
    const midSplit = [along(0.27, 0.25, 0.6), 0.6];
    const midSplitR = [along(0.75, 0.73, 0.58), 0.58];
    const t = (0.52 - midSplit[0]) / (midSplitR[0] - midSplit[0]);
    const footTop = [0.52, midSplit[1] + (midSplitR[1] - midSplit[1]) * t];
    const foot = [0.48, 1];
    return [
      [[0, 0], [0.27, 0], left, [0, 0.47]],
      [[0, 0.47], left, [0.25, 1], [0, 1]],
      [[0.27, 0], [0.75, 0], midSplitR, midSplit],
      [midSplit, footTop, foot, [0.25, 1]],
      [footTop, midSplitR, [0.73, 1], foot],
      [[0.75, 0], [1, 0], [1, 0.6], right],
      [right, [1, 0.6], [1, 1], [0.73, 1]],
    ];
  },
};

/**
 * A caption anchor: centre (x, y) as 0..1 of the panel area, the share of the cover width the title may use and
 * the share of the short side its height may use.
 */
const at = (x, y, width = 0.84, height = 0.36) => ({ x, y, width, height });

/** Layout catalogue in the order the editor lists it, with the default caption anchor per aspect. */
export const LAYOUTS = [
  { id: 'poster', label: 'Poster 1+4', anchor: { landscape: at(0.53, 0.73, 0.74, 0.29), square: at(0.5, 0.7, 0.86),
    portrait: at(0.5, 0.58, 0.88) } },
  { id: 'hero', label: 'Hero', anchor: { landscape: at(0.5, 0.74), square: at(0.5, 0.74), portrait: at(0.5, 0.76) } },
  { id: 'split', label: 'Split', anchor: { landscape: at(0.5, 0.74), square: at(0.5, 0.74), portrait: at(0.5, 0.5) } },
  { id: 'stack', label: 'Stack', anchor: { landscape: at(0.5, 0.74), square: at(0.5, 0.74), portrait: at(0.5, 0.7) } },
  { id: 'grid', label: 'Grid 2x2', anchor: { landscape: at(0.5, 0.5), square: at(0.5, 0.5), portrait: at(0.5, 0.5) } },
  { id: 'shards', label: 'Shards 5', anchor: { landscape: at(0.5, 0.74), square: at(0.5, 0.74),
    portrait: at(0.5, 0.74) } },
  { id: 'stagger', label: 'Stagger 6', anchor: { landscape: at(0.5, 0.5), square: at(0.5, 0.5),
    portrait: at(0.5, 0.5) } },
  { id: 'heroStrip', label: 'Hero + Strip', anchor: { landscape: at(0.36, 0.76, 0.6), square: at(0.38, 0.76, 0.66),
    portrait: at(0.5, 0.36) } },
  { id: 'mosaic', label: 'Mosaic 7', anchor: { landscape: at(0.5, 0.76), square: at(0.5, 0.76),
    portrait: at(0.5, 0.74) } },
];

export const LAYOUT_IDS = LAYOUTS.map((layout) => layout.id);

/** Aspect class of a cover size. */
export function aspectOf(w, h) {
  if (Math.abs(w - h) < 2) return 'square';
  return w > h ? 'landscape' : 'portrait';
}

/** The normalised panel polygons of a layout at an aspect; portrait turns columns into rows. */
export function layoutPanels(layoutId, aspect) {
  const build = LANDSCAPE[layoutId] ?? LANDSCAPE.hero;
  const panels = build();
  return aspect === 'portrait' ? panels.map(transposePolygon) : panels;
}

/** The default caption anchor { x, y, width } for a layout at an aspect. */
export function layoutAnchor(layoutId, aspect) {
  const layout = LAYOUTS.find((entry) => entry.id === layoutId) ?? LAYOUTS[0];
  return layout.anchor[aspect];
}

/** How many panels a layout has. */
export function layoutPanelCount(layoutId) {
  return (LANDSCAPE[layoutId] ?? LANDSCAPE.hero)().length;
}
