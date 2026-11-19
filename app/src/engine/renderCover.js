// The one render path: draws a whole cover at any size from state and photos, for the live preview and for export.
// Order: frame, graded panels, title shade, gutters, banner strip, bloom and flare, caption, stars, final grain.
import { aspectOf, layoutAnchor, layoutPanels } from './layouts.js';
import { polygonBounds, tracePolygon } from './panelGeometry.js';
import { panelLayer } from './panelPainter.js';
import { resolvePreset } from './coverState.js';
import { applyBloom, applyPrintTexture, drawLensFlare } from '../grade/effects.js';
import { paintBannerStrip } from '../scenes/bannerStrip.js';
import { drawCaptionBlock, drawTagline } from '../text/captionBlock.js';
import { drawRatingStars } from '../text/ratingStars.js';

const BANNER_SHARE = { landscape: 0.15, square: 0.13, portrait: 0.11 };

/** Where everything sits on a w x h cover: border, gutter, panel area, banner and panel polygons in px. */
export function coverGeometry(w, h, state) {
  const aspect = aspectOf(w, h);
  const short = Math.min(w, h);
  const border = Math.round(short * 0.02);
  const gutter = Math.max(2, Math.round(short * 0.009));
  const bannerH = state.banner ? Math.round(h * BANNER_SHARE[aspect]) : 0;
  const area = { x: border, y: border, w: w - border * 2, h: h - border * 2 - (bannerH ? bannerH + gutter : 0) };
  const banner = bannerH ? { x: border, y: area.y + area.h + gutter, w: area.w, h: bannerH } : null;
  const panels = layoutPanels(state.layout, aspect).map((unit, index) => {
    const polygon = unit.map(([x, y]) => [area.x + x * area.w, area.y + y * area.h]);
    return { index, polygon, bounds: polygonBounds(polygon) };
  });
  return { w, h, aspect, short, border, gutter, area, banner, panels };
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
    maxHeight: Math.min(h * 0.3, short * 0.23) * scale,
    short,
    bounds: { left: geometry.border, right: w - geometry.border, top: geometry.border },
    withTagline: !geometry.banner,
  };
}

/** A soft dark band behind the title, inside the panel area, so the letters read over any photo. */
function drawTitleShade(ctx, geometry, place) {
  const { area } = geometry;
  const half = place.maxHeight * 1.05;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  const band = ctx.createLinearGradient(0, place.cy - half, 0, place.cy + half * 1.25);
  band.addColorStop(0, 'rgba(14, 2, 26, 0)');
  band.addColorStop(0.45, 'rgba(14, 2, 26, 0.5)');
  band.addColorStop(0.75, 'rgba(14, 2, 26, 0.55)');
  band.addColorStop(1, 'rgba(14, 2, 26, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(area.x, place.cy - half, area.w, half * 2.25);
  ctx.restore();
}

/** Pale gutters with dark keylines between panels, and the bold outer border. */
function drawFrame(ctx, geometry, frame) {
  const { w, h, border, gutter, short } = geometry;
  const key = Math.max(1, short * 0.0025);
  ctx.save();
  ctx.lineJoin = 'miter';
  for (const panel of geometry.panels) {
    ctx.beginPath();
    tracePolygon(ctx, panel.polygon);
    ctx.strokeStyle = frame.key ?? '#0a0610';
    ctx.lineWidth = gutter + key * 2;
    ctx.stroke();
  }
  for (const panel of geometry.panels) {
    ctx.beginPath();
    tracePolygon(ctx, panel.polygon);
    ctx.strokeStyle = frame.gutter;
    ctx.lineWidth = gutter;
    ctx.stroke();
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

/** The banner's words: the tagline across its middle and the rating stars at its right end. */
function drawBannerText(ctx, banner, state) {
  const starSize = banner.h * 0.42;
  const starsW = state.stars > 0 ? starSize * 1.08 * 5 + banner.h * 0.3 : 0;
  const tagline = state.text.tagline.trim();
  if (tagline) {
    const pad = banner.h * 0.3;
    const room = banner.w - starsW - pad * 2;
    drawTagline(ctx, tagline, banner.x + pad + room / 2, banner.y + banner.h * 0.52, room, banner.h * 0.3);
  }
  if (state.stars > 0) {
    drawRatingStars(ctx, banner.x + banner.w - banner.h * 0.3, banner.y + banner.h * 0.52, starSize, state.stars);
  }
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
  if (state.text.title.trim()) drawTitleShade(ctx, geometry, place);
  drawFrame(ctx, geometry, frame);
  if (geometry.banner) paintBannerStrip(ctx, geometry.banner, preset, state.seed);
  applyBloom(ctx, w, h, preset.bloom);
  const { area } = geometry;
  drawLensFlare(ctx, area.x + area.w * 0.1, area.y + area.h * 0.2, geometry.short * 0.32, preset.flare,
    area.x + area.w * 0.6, area.y + area.h * 0.7);
  const caption = drawCaptionBlock(ctx, place, state.text, preset);
  if (geometry.banner) drawBannerText(ctx, geometry.banner, state);
  applyPrintTexture(ctx, w, h, { halftone: 0, grain: preset.grain * 0.45, seed: state.seed + 101 });
  ctx.restore();
  return { geometry, caption };
}
