// Poster furniture, the small print real posters carry: a thin top strip (five critic stars and a quoted press
// line), the banner's credits line and a drawn barcode, and the accent colour each panel slot carries. All of it
// is drawn in code; the barcode's bars come from a fixed seed so every export is the same.
import { seededRandom } from '../grade/effects.js';
import { buildTextPath, drawFittedLine, paintLettering, styleMargin } from './lettering.js';
import { SMALL_STYLES } from './letterStyles.js';
import { drawRatingStars } from './ratingStars.js';

/** One accent per panel slot (hot pink, cyan, amber, violet, teal) for its rim light and its label's tab. */
export const PANEL_ACCENTS = ['#ff2d95', '#2ee6ff', '#ffb02e', '#a45cff', '#1fd8b8', '#ff2d95', '#2ee6ff'];

const PRESS_QUOTE = '"SALT, SUN AND TROUBLE"';
const PRESS_OUTLET = '- THE DRIFTWOOD REVIEW';
const OUTLET_STYLE = { face: [[0, '#ffe08a'], [1, '#ffa84a']], outline: null, rim: null, extrude: null, glow: null,
  shine: 0, underShade: 0 };
const LINE = { pen: 1.7, tracking: 2.2, italic: 0 };

/** The credits line under the poster: built from the title, so it follows the caption. */
export function creditsLine(title) {
  const name = title.trim() || 'NEON TIDE';
  return `A ${name} PRODUCTION • STARRING YOU`;
}

/** A text line's path and its width in px at height `h` with `style`. */
function measureLine(text, h, style) {
  const built = buildTextPath(text, LINE);
  const scale = h / (built.height + styleMargin(style) * 0.6);
  return { built, scale, w: built.width * scale };
}

/** Paints a measured line with its left edge at x, centred on cy. */
function paintLine(ctx, { built, scale }, style, x, cy) {
  paintLettering(ctx, built, style, scale, x, cy - (built.height * scale) / 2);
}

/** The top strip in rect { x, y, w, h }: dark band, neon underline, five gold stars left, press quote right. */
export function drawTopStrip(ctx, rect, preset) {
  const { x, y, w, h } = rect;
  ctx.save();
  const band = ctx.createLinearGradient(x, 0, x + w, 0);
  band.addColorStop(0, '#16031f');
  band.addColorStop(0.5, '#2e0a40');
  band.addColorStop(1, '#16031f');
  ctx.fillStyle = band;
  ctx.fillRect(x, y, w, h);
  const line = Math.max(1, h * 0.07);
  ctx.fillStyle = preset.rim[0];
  ctx.fillRect(x, y + h - line, w, line);
  ctx.restore();
  const pad = h * 0.4;
  const star = h * 0.58;
  const starsW = star * 1.08 * 5;
  drawRatingStars(ctx, x + pad + starsW, y + h * 0.48, star, 5);
  const room = w - starsW - pad * 4;
  let quote = measureLine(PRESS_QUOTE, h * 0.66, SMALL_STYLES.tagline);
  let outlet = measureLine(PRESS_OUTLET, h * 0.5, OUTLET_STYLE);
  const fit = Math.min(1, room / (quote.w + outlet.w + pad));
  if (fit < 1) {
    quote = measureLine(PRESS_QUOTE, h * 0.66 * fit, SMALL_STYLES.tagline);
    outlet = measureLine(PRESS_OUTLET, h * 0.5 * fit, OUTLET_STYLE);
  }
  const right = x + w - pad;
  paintLine(ctx, outlet, OUTLET_STYLE, right - outlet.w, y + h * 0.5);
  paintLine(ctx, quote, SMALL_STYLES.tagline, right - outlet.w - pad * fit - quote.w, y + h * 0.47);
}

/** A drawn barcode in the w x h box at (x, y): pale label, seeded bars, a digit line underneath. */
export function drawBarcode(ctx, x, y, w, h, seed = 2026) {
  const random = seededRandom(seed);
  const widths = [];
  let total = 0;
  while (total < 84) {
    const unit = 1 + Math.floor(random() * 3);
    widths.push(unit);
    total += unit;
  }
  const pad = w * 0.08;
  const unit = (w - pad * 2) / total;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 18, 0.5)';
  ctx.fillRect(x + h * 0.05, y + h * 0.06, w, h);
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0a0610';
  let cursor = x + pad;
  widths.forEach((units, i) => {
    if (i % 2 === 0) ctx.fillRect(cursor, y + h * 0.1, units * unit, h * 0.62);
    cursor += units * unit;
  });
  ctx.strokeStyle = '#0a0610';
  ctx.lineWidth = Math.max(1, h * 0.03);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  drawFittedLine(ctx, '0 47 2026 1', { cx: x + w / 2, cy: y + h * 0.85, maxWidth: w - pad * 2, maxHeight: h * 0.2,
    style: SMALL_STYLES.panelTag, ...LINE, tracking: 1.4 });
}
