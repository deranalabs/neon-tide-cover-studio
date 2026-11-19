// Display lettering: turns a line of text into one Path2D of glyph centre lines and paints it as heavy extruded
// letters (glow, stepped extrusion, outline, rim, gradient face, gloss) by stroking that path at several widths.
import { GLYPH_HEIGHT, glyphFor, normaliseForGlyphs } from './glyphs.js';

/**
 * Builds the unit-space path of a text line. `pen` is the stroke width, `tracking` the gap between letters and
 * `italic` the shear (x shift per unit of height). Returns { path, width, height, pen } with the visual box
 * starting at (0, 0) in units.
 */
export function buildTextPath(text, { pen = 2.4, tracking = 1.1, italic = 0.14 } = {}) {
  const chars = [...normaliseForGlyphs(text)];
  const half = pen / 2;
  const height = GLYPH_HEIGHT + pen;
  const path = new Path2D();
  let cursor = 0;
  chars.forEach((char, index) => {
    const glyph = glyphFor(char);
    if (index > 0) cursor += glyph.left;
    for (const stroke of glyph.strokes) {
      stroke.points.forEach(([gx, gy], i) => {
        const y = gy + half;
        const x = cursor + gx + half + italic * (height - y);
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      if (stroke.closed) path.closePath();
    }
    cursor += glyph.width + pen + (index < chars.length - 1 ? tracking + glyph.right : 0);
  });
  return { path, width: cursor + italic * height, height, pen };
}

/** Stroke widths (in units, each side) that a style adds around the pen. */
function styleReach(style) {
  const outline = style.outline?.width ?? 0;
  const rim = style.rim?.width ?? 0;
  return { outline, rim, edge: outline + rim };
}

/** Space a style needs around the letters, in units: outline, extrusion and glow. */
export function styleMargin(style) {
  const { edge } = styleReach(style);
  const depth = style.extrude?.depth ?? 0;
  const glow = style.glow?.blur ?? 0;
  return edge + depth + glow * 0.5 + 0.5;
}

/** Mixes two #rrggbb colours; t = 0 gives `a`. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** A vertical gradient across the letter height from colour stops [[offset, colour], ...]. */
function verticalGradient(ctx, stops, top, bottom) {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  for (const [offset, colour] of stops) gradient.addColorStop(offset, colour);
  return gradient;
}

/** Paints the letter face (gradient, gloss band, under-shade) on its own layer so the gloss stays inside it. */
function paintFace(ctx, built, style, scale, x, y) {
  const margin = Math.ceil(style.face.length ? built.pen * scale : 0) + 4;
  const layerW = Math.ceil(built.width * scale + margin * 2);
  const layerH = Math.ceil(built.height * scale + margin * 2);
  const layer = new OffscreenCanvas(Math.max(1, layerW), Math.max(1, layerH));
  const lc = layer.getContext('2d');
  lc.setTransform(scale, 0, 0, scale, margin, margin);
  lc.lineJoin = style.round ? 'round' : 'miter';
  lc.miterLimit = 2.5;
  lc.lineCap = style.round ? 'round' : 'butt';
  lc.lineWidth = built.pen;
  lc.strokeStyle = verticalGradient(lc, style.face, 0, built.height);
  lc.stroke(built.path);
  lc.globalCompositeOperation = 'source-atop';
  const shine = style.shine ?? 0;
  if (shine > 0) {
    const gloss = lc.createLinearGradient(0, 0, 0, built.height);
    gloss.addColorStop(0, `rgba(255, 255, 255, ${0.75 * shine})`);
    gloss.addColorStop(0.42, `rgba(255, 255, 255, ${0.18 * shine})`);
    gloss.addColorStop(0.46, 'rgba(255, 255, 255, 0)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    lc.fillStyle = gloss;
    lc.fillRect(-10, -10, built.width + 20, built.height + 20);
    lc.fillStyle = `rgba(255, 255, 255, ${0.65 * shine})`;
    lc.fillRect(-10, built.height * 0.5, built.width + 20, built.height * 0.035);
  }
  const shade = lc.createLinearGradient(0, built.height * 0.6, 0, built.height);
  shade.addColorStop(0, 'rgba(40, 0, 40, 0)');
  shade.addColorStop(1, `rgba(40, 0, 40, ${style.underShade ?? 0.3})`);
  lc.fillStyle = shade;
  lc.fillRect(-10, -10, built.width + 20, built.height + 20);
  ctx.drawImage(layer, x - margin, y - margin);
}

/** Paints a built path with a lettering style, its visual box's top-left at (x, y) px, `scale` px per unit. */
export function paintLettering(ctx, built, style, scale, x, y) {
  const { outline, rim, edge } = styleReach(style);
  const pen = built.pen;
  ctx.save();
  ctx.lineJoin = style.round ? 'round' : 'miter';
  ctx.miterLimit = 2.5;
  ctx.lineCap = style.round ? 'round' : 'butt';
  const base = ctx.getTransform();
  const at = (dx, dy) => {
    ctx.setTransform(base);
    ctx.translate(x + dx * scale, y + dy * scale);
    ctx.scale(scale, scale);
  };

  if (style.glow) {
    at(0, 0);
    ctx.shadowColor = style.glow.color;
    ctx.shadowBlur = style.glow.blur * scale;
    ctx.strokeStyle = style.glow.color;
    ctx.lineWidth = pen + edge * 2 + (style.glow.spread ?? 0);
    for (let i = 0; i < (style.glow.passes ?? 1); i += 1) ctx.stroke(built.path);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  if (style.extrude && style.extrude.depth > 0) {
    const { depth, dx, dy, near, far } = style.extrude;
    const steps = Math.max(2, Math.min(80, Math.ceil((depth * scale) / 1.2)));
    ctx.lineWidth = pen + edge * 2;
    for (let i = steps; i >= 1; i -= 1) {
      const t = i / steps;
      at(dx * depth * t, dy * depth * t);
      ctx.strokeStyle = mixHex(near, far, t);
      ctx.stroke(built.path);
    }
    if (style.extrude.edgeLine) {
      at(dx * depth, dy * depth);
      ctx.strokeStyle = style.extrude.edgeLine;
      ctx.lineWidth = pen + edge * 2 + 0.5;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.stroke(built.path);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  at(0, 0);
  if (outline > 0) {
    ctx.strokeStyle = style.outline.color;
    ctx.lineWidth = pen + edge * 2;
    ctx.stroke(built.path);
  }
  if (rim > 0) {
    ctx.strokeStyle = style.rim.color;
    ctx.lineWidth = pen + rim * 2;
    ctx.stroke(built.path);
  }
  ctx.restore();
  paintFace(ctx, built, style, scale, x, y);
}

/**
 * Fits a line of text inside maxWidth x maxHeight px and paints it centred on (cx, cy). Returns the painted box
 * { x, y, w, h, scale } in px (letters only, without outline or extrusion).
 */
export function drawFittedLine(ctx, text, { cx, cy, maxWidth, maxHeight, style, pen, tracking, italic }) {
  const built = buildTextPath(text, { pen, tracking, italic });
  if (built.width <= 0) return { x: cx, y: cy, w: 0, h: 0, scale: 0 };
  const margin = styleMargin(style);
  const scale = Math.min(maxWidth / (built.width + margin), maxHeight / (built.height + margin * 0.6));
  const w = built.width * scale;
  const h = built.height * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;
  paintLettering(ctx, built, style, scale, x, y);
  return { x, y, w, h, scale };
}

/** Measures the scale a line would get when fitted, without painting it. */
export function fitScale(text, { maxWidth, maxHeight, style, pen, tracking, italic }) {
  const built = buildTextPath(text, { pen, tracking, italic });
  if (built.width <= 0) return 0;
  const margin = styleMargin(style);
  return Math.min(maxWidth / (built.width + margin), maxHeight / (built.height + margin * 0.6));
}
