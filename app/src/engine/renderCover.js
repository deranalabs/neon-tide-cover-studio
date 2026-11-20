// The one render path: draws a whole cover at any size from state and photos, for the live preview and for export.
// Order: frame, graded panels, title shade, gutters, banner strip, sun glow, bloom and flare, caption, panel label
// tags, stars, final grain.
import { aspectOf, layoutAnchor, layoutPanels } from './layouts.js';
import { polygonBounds, tracePolygon } from './panelGeometry.js';
import { panelLayer } from './panelPainter.js';
import { resolvePreset } from './coverState.js';
import { applyBloom, applyInkLines, applyPrintTexture, drawLensFlare, drawNeonRim, drawSunGlow }
  from '../grade/effects.js';
import { drawSunDisc } from '../grade/scenery.js';
import { paintBannerStrip } from '../scenes/bannerStrip.js';
import { drawCaptionBlock, drawTagline } from '../text/captionBlock.js';
import { drawRatingStars } from '../text/ratingStars.js';
import { creditsLine, drawBarcode, drawTopStrip, PANEL_ACCENTS } from '../text/posterFurniture.js';
import { buildTextPath, drawFittedLine } from '../text/lettering.js';
import { SMALL_STYLES } from '../text/letterStyles.js';

const BANNER_SHARE = { landscape: 0.15, square: 0.13, portrait: 0.11 };

/** Where everything sits on a w x h cover: border, gutter, panel area, banner and panel polygons in px. */
export function coverGeometry(w, h, state) {
  const aspect = aspectOf(w, h);
  const short = Math.min(w, h);
  const border = Math.round(short * 0.02);
  const gutter = Math.max(2, Math.round(short * 0.009));
  const bannerH = state.banner ? Math.round(h * BANNER_SHARE[aspect]) : 0;
  // The thin top strip (critic stars and press quote) comes with the banner, as poster furniture.
  const stripH = state.banner ? Math.round(short * 0.056) : 0;
  const top = border + (stripH ? stripH + gutter : 0);
  const area = { x: border, y: top, w: w - border * 2, h: h - top - border - (bannerH ? bannerH + gutter : 0) };
  const banner = bannerH ? { x: border, y: area.y + area.h + gutter, w: area.w, h: bannerH } : null;
  const strip = stripH ? { x: border, y: border, w: area.w, h: stripH } : null;
  const panels = layoutPanels(state.layout, aspect).map((unit, index) => {
    const polygon = unit.map(([x, y]) => [area.x + x * area.w, area.y + y * area.h]);
    return { index, polygon, bounds: polygonBounds(polygon) };
  });
  return { w, h, aspect, short, border, gutter, area, banner, strip, panels };
}

/** The caption placement in px for this geometry and the person's offset and scale. */
export function captionPlace(geometry, state) {
  const { w, h, area, short, aspect } = geometry;
  const anchor = layoutAnchor(state.layout, aspect);
  const scale = state.text.scale;
  return {
    cx: area.x + area.w * anchor.x + w * state.text.offsetX,
    cy: area.y + area.h * anchor.y + h * state.text.offsetY,
    maxWidth: Math.min(w * 0.94, w * anchor.width * scale),
    maxHeight: Math.min(h * 0.4, short * (anchor.height ?? 0.36)) * scale,
    short,
    bounds: { left: geometry.border, right: w - geometry.border, top: geometry.border },
    withTagline: !geometry.banner,
    taglineRibbon: Boolean(geometry.banner),
  };
}

/** A soft dark ellipse behind the title, inside the panel area, so the letters read over any photo. */
function drawTitleShade(ctx, geometry, place) {
  const { area } = geometry;
  const ry = place.maxHeight * 1.15;
  const rx = place.maxWidth * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.translate(place.cx, place.cy + ry * 0.12);
  ctx.scale(rx / ry, 1);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  shade.addColorStop(0, 'rgba(14, 2, 26, 0.62)');
  shade.addColorStop(0.55, 'rgba(14, 2, 26, 0.45)');
  shade.addColorStop(1, 'rgba(14, 2, 26, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
  ctx.restore();
}

/** Gutters between panels (dark ink keyline, hot pink neon line, pale core), and the bold outer border. */
function drawFrame(ctx, geometry, frame, neon = '#ff3d9a') {
  const { w, h, border, gutter, short } = geometry;
  const key = Math.max(1, short * 0.0025);
  ctx.save();
  ctx.lineJoin = 'miter';
  const passes = [[frame.key ?? '#0a0610', gutter + key * 4], [neon, gutter + key * 1.6], [frame.gutter, gutter * 0.45]];
  for (const [colour, width] of passes) {
    for (const panel of geometry.panels) {
      ctx.beginPath();
      tracePolygon(ctx, panel.polygon);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  ctx.fillStyle = frame.border;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(border, border, w - border * 2, h - border * 2);
  ctx.fill('evenodd');
  ctx.strokeStyle = frame.key ?? '#0a0610';
  ctx.lineWidth = key * 2;
  ctx.strokeRect(key, key, w - key * 2, h - key * 2);
  if (geometry.banner) {
    const b = geometry.banner;
    ctx.lineWidth = key * 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

/**
 * The banner's small print: a drawn barcode at its left end, the credits line (built from the title) across its
 * middle and the rating stars at its right end. The tagline rides on a ribbon under the title instead.
 */
function drawBannerText(ctx, banner, state) {
  const starSize = banner.h * 0.42;
  const starsW = state.stars > 0 ? starSize * 1.08 * 5 + banner.h * 0.3 : 0;
  const pad = banner.h * 0.3;
  const codeH = banner.h * 0.62;
  const codeW = codeH * 1.45;
  drawBarcode(ctx, banner.x + pad, banner.y + (banner.h - codeH) / 2, codeW, codeH);
  const left = banner.x + pad * 2 + codeW;
  const room = banner.x + banner.w - starsW - pad - left;
  if (room > banner.h) {
    drawTagline(ctx, creditsLine(state.text.title), left + room / 2, banner.y + banner.h * 0.52, room,
      banner.h * 0.26);
  }
  if (state.stars > 0) {
    drawRatingStars(ctx, banner.x + banner.w - banner.h * 0.3, banner.y + banner.h * 0.52, starSize, state.stars);
  }
}

/** The leftmost and rightmost x where the horizontal line at y crosses a convex polygon. */
function polygonSpanAt(polygon, y) {
  let lo = Infinity;
  let hi = -Infinity;
  polygon.forEach(([x0, y0], i) => {
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    if (y0 === y1 || y < Math.min(y0, y1) || y > Math.max(y0, y1)) return;
    const x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  });
  return [lo, hi];
}

const TAG_TILT = -0.05;
const TAG_TEXT = { pen: 2.6, tracking: 1.2, italic: 0.06 };

/**
 * A panel's label ("THE DRIVER") as a small, slightly tilted white tag with bold black letters, a thin dark
 * outline and a tab in the panel's accent colour. Sized from the cover's short side; it is kept inside the panel's
 * slanted edges (tilt included) and its letters shrink when the panel is narrow, so it is never clipped. It takes
 * the first corner (lower-left, upper-left, lower-right, upper-right) clear of the caption's `avoid` boxes, and is
 * left out rather than drawn half hidden when none is.
 */
function drawPanelLabel(ctx, panel, label, geometry, avoid = [], accent = '#ff2d95') {
  const { short, gutter } = geometry;
  const tagH = Math.max(12, short * 0.044);
  const pad = gutter / 2 + tagH * 0.5;
  const textH = tagH * 0.6;
  const built = buildTextPath(label, TAG_TEXT);
  const wanted = (built.width / built.height) * textH + tagH * 1.2;
  const rise = Math.abs(Math.sin(TAG_TILT)) * wanted;
  const { y: py, h: ph } = panel.bounds;
  const spots = [[false, false], [true, false], [false, true], [true, true]].map(([upper, right]) => {
    const top = upper ? py + pad : py + ph - pad - tagH - rise;
    const bottom = top + tagH + rise;
    const [leftTop, rightTop] = polygonSpanAt(panel.polygon, top);
    const [leftBottom, rightBottom] = polygonSpanAt(panel.polygon, bottom);
    const lo = Math.max(leftTop, leftBottom) + pad;
    const hi = Math.min(rightTop, rightBottom) - pad;
    const tagW = Math.min(wanted, hi - lo);
    return { top, bottom, tagW, room: hi - lo, left: right ? hi - tagW : lo };
  });
  const spot = spots.find(({ top, bottom, tagW, room, left }) => room > tagH * 2.5 && top >= py && bottom <= py + ph
    && !avoid.some((box) => left < box.x + box.w && left + tagW > box.x && top < box.y + box.h && bottom > box.y));
  if (!spot) return;
  const { top, bottom, tagW, left } = spot;
  const line = Math.max(1, short * 0.0024);
  ctx.save();
  ctx.translate(left + tagW / 2, (top + bottom) / 2);
  ctx.rotate(TAG_TILT);
  ctx.fillStyle = 'rgba(10, 4, 18, 0.55)';
  ctx.fillRect(-tagW / 2 + tagH * 0.09, -tagH / 2 + tagH * 0.11, tagW, tagH);
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(-tagW / 2, -tagH / 2, tagW, tagH);
  ctx.fillStyle = accent;
  ctx.fillRect(-tagW / 2, -tagH / 2, tagH * 0.3, tagH);
  ctx.strokeStyle = '#0a0610';
  ctx.lineWidth = line;
  ctx.strokeRect(-tagW / 2 + line / 2, -tagH / 2 + line / 2, tagW - line, tagH - line);
  drawFittedLine(ctx, label, { cx: tagH * 0.15, cy: 0, maxWidth: tagW - tagH * 1.0, maxHeight: textH,
    style: SMALL_STYLES.panelTag, ...TAG_TEXT });
  ctx.restore();
}

/**
 * Renders the cover into a 2D context of size w x h. `photos` is a Map of id -> { image, width, height, key }.
 * Returns { geometry, caption } for hit-testing in the editor.
 */
export function renderCover(ctx, w, h, state, photos) {
  const preset = resolvePreset(state);
  const frame = preset.frameLook;
  const geometry = coverGeometry(w, h, state);
  const place = captionPlace(geometry, state);
  ctx.save();
  ctx.fillStyle = frame.border;
  ctx.fillRect(0, 0, w, h);
  for (const panel of geometry.panels) {
    const { x, y, w: pw, h: ph } = panel.bounds;
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bw = Math.max(1, Math.ceil(x + pw) - bx);
    const bh = Math.max(1, Math.ceil(y + ph) - by);
    const layer = panelLayer(state.panels[panel.index], panel.index, bw, bh, photos, preset, state.seed, w);
    ctx.save();
    ctx.beginPath();
    tracePolygon(ctx, panel.polygon);
    ctx.clip();
    ctx.drawImage(layer, bx, by);
    ctx.restore();
  }
  // Comic print look over the panels: ink on strong photo edges, then a coarse halftone screen that shows in
  // shadows and mid-tones (dots shrink to nothing in highlights, so faces stay clear).
  const ink = { x: Math.round(geometry.area.x), y: Math.round(geometry.area.y) };
  ink.w = Math.round(geometry.area.w);
  ink.h = Math.round(geometry.area.h);
  applyInkLines(ctx, ink.x, ink.y, ink.w, ink.h, 0.8, w / 960);
  applyPrintTexture(ctx, ink.w, ink.h, { halftone: Math.min(0.6, preset.halftone * 2.4), grain: 0, seed: state.seed,
    cell: w / 170, x: ink.x, y: ink.y });
  for (const panel of geometry.panels) {
    // Each panel gets its own accent (hot pink, cyan, amber, violet, teal) as rim light from both sides.
    const accent = PANEL_ACCENTS[panel.index % PANEL_ACCENTS.length];
    drawNeonRim(ctx, panel.polygon, panel.bounds, [accent, accent], 0.95, geometry.short * 0.006);
  }
  const { area } = geometry;
  const hasTitle = Boolean(state.text.title.trim());
  if (hasTitle) drawTitleShade(ctx, geometry, place);
  drawFrame(ctx, geometry, frame, preset.rim[0]);
  if (hasTitle) {
    // A banded magenta-to-orange sun behind the title, set above its centre so the letters cross its stripes.
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    drawSunDisc(ctx, place.cx, place.cy - place.maxHeight * 0.14, place.maxHeight * 0.6,
      [preset.sun[1], preset.sun[2], preset.sun[3], '#5a0f8a'],
      { stripes: 7, haloAlpha: 0.6 });
    ctx.restore();
  }
  if (geometry.banner) paintBannerStrip(ctx, geometry.banner, preset, state.seed);
  const sunX = area.x + area.w * (geometry.aspect === 'landscape' ? 0.06 : 0.1);
  const sunY = area.y + area.h * (geometry.aspect === 'portrait' ? 0.16 : 0.3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  drawSunGlow(ctx, sunX, sunY, geometry.short * 0.46, preset.flare * 0.7);
  ctx.restore();
  applyBloom(ctx, w, h, preset.bloom);
  drawLensFlare(ctx, sunX, sunY, geometry.short * 0.32, preset.flare, area.x + area.w * 0.6, area.y + area.h * 0.7);
  const caption = drawCaptionBlock(ctx, place, state.text, preset);
  for (const panel of geometry.panels) {
    const label = (state.panels[panel.index]?.label ?? '').trim();
    if (label) {
      drawPanelLabel(ctx, panel, label, geometry, caption.parts, PANEL_ACCENTS[panel.index % PANEL_ACCENTS.length]);
    }
  }
  if (geometry.banner) drawBannerText(ctx, geometry.banner, state);
  if (geometry.strip) drawTopStrip(ctx, geometry.strip, preset);
  applyPrintTexture(ctx, w, h, { halftone: 0, grain: preset.grain * 0.45, seed: state.seed + 101 });
  ctx.restore();
  return { geometry, caption };
}
