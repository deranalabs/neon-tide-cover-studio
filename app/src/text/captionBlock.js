// The caption block: an auto-fitted title (one or two lines), the subtitle in glowing neon script (or on a ribbon),
// the tagline beneath, the
// badge sticker, and an optional sun-and-palms emblem. Returns its box so the editor can hit-test and drag it.
import { drawFittedLine, fitScale, styleMargin } from './lettering.js';
import { LETTER_STYLES, SMALL_STYLES } from './letterStyles.js';
import { drawBadge, drawRibbon } from './stickers.js';
import { drawNeonBars, drawPalm, drawSunDisc } from '../grade/scenery.js';

const TITLE_PEN = 2.6;
const TITLE_TRACKING = 0.9;
const TITLE_ITALIC = 0.2;

/** Splits a title into the two lines whose longer half is shortest. */
function balancedSplit(title) {
  const words = title.trim().split(/\s+/);
  let best = [title, ''];
  let bestLength = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const longest = Math.max(a.length, b.length);
    if (longest < bestLength) {
      bestLength = longest;
      best = [a, b];
    }
  }
  return best;
}

/** Picks one or two title lines, whichever lets the letters stand taller. */
function planTitleLines(title, style, maxWidth, maxHeight) {
  const opts = { style, pen: TITLE_PEN, tracking: TITLE_TRACKING, italic: TITLE_ITALIC };
  const single = fitScale(title, { ...opts, maxWidth, maxHeight });
  const words = title.trim().split(/\s+/);
  if (words.length < 2 || (words.length === 2 && title.trim().length <= 12)) {
    return { lines: [title], lineHeight: maxHeight };
  }
  const pair = balancedSplit(title);
  const twoHeight = maxHeight * 0.66;
  const double = Math.min(...pair.map((line) => fitScale(line, { ...opts, maxWidth, maxHeight: twoHeight })));
  return double > single * 1.25 ? { lines: pair, lineHeight: twoHeight } : { lines: [title], lineHeight: maxHeight };
}

/** The optional emblem behind the title: a banded sun, two neon bars and a pair of palms. */
function drawEmblem(ctx, cx, top, sunR, linesHeight, preset, short) {
  drawSunDisc(ctx, cx, top + sunR * 0.12, sunR, preset.sun, { stripes: 6, haloAlpha: 0.55 });
  drawNeonBars(ctx, cx, top + sunR * 0.67, sunR * 3.6, Math.max(2, short * 0.0045), preset.neon, 2);
  const baseY = top + linesHeight * 0.6;
  drawPalm(ctx, cx - sunR * 1.55, baseY, sunR * 2.3, -0.18, '#10031c', 11);
  drawPalm(ctx, cx + sunR * 1.75, baseY + sunR * 0.1, sunR * 1.9, 0.2, '#10031c', 23);
}

/** Paints the tagline in widely spaced capitals centred on (cx, cy). */
export function drawTagline(ctx, tagline, cx, cy, maxWidth, height) {
  return drawFittedLine(ctx, tagline, {
    cx,
    cy,
    maxWidth,
    maxHeight: height,
    style: SMALL_STYLES.tagline,
    pen: 1.7,
    tracking: 3.4,
    italic: 0,
  });
}

/** Paints a line in the glowing Neon Script style (slanted, rounded, white core, hot pink glow) centred on (cx, cy). */
export function drawNeonScriptLine(ctx, line, cx, cy, maxWidth, height) {
  return drawFittedLine(ctx, line, {
    cx,
    cy,
    maxWidth,
    maxHeight: height,
    style: LETTER_STYLES.neonScript,
    pen: 1.5,
    tracking: 0.75,
    italic: 0.36,
  });
}

/**
 * Paints the caption. `place` is { cx, cy, maxWidth, maxHeight, short, bounds, withTagline }: the title's centre
 * and box in px, the cover's short side, the edges the badge must stay inside, and whether the tagline goes here
 * (false when the banner carries it).
 * Returns { box, titleBox, parts } in px; `parts` are the boxes the title and subtitle actually cover.
 */
export function drawCaptionBlock(ctx, place, text, preset) {
  const style = LETTER_STYLES[preset.letterStyle] ?? LETTER_STYLES.sunset;
  const { cx, cy, maxWidth, maxHeight, short } = place;
  const title = (text.title ?? '').trim();
  const plan = title ? planTitleLines(title, style, maxWidth, maxHeight) : { lines: [], lineHeight: 0 };
  const lineGap = plan.lineHeight * 0.9;
  const blockTop = cy - (plan.lines.length * lineGap) / 2;
  const sunR = maxHeight * 0.95;
  if (text.emblem) drawEmblem(ctx, cx, blockTop, sunR, plan.lines.length * lineGap, preset, short);

  let titleBox = { x: cx - maxWidth / 4, y: cy - maxHeight / 4, w: maxWidth / 2, h: maxHeight / 2 };
  plan.lines.forEach((line, i) => {
    const painted = drawFittedLine(ctx, line, {
      cx: cx + (i - (plan.lines.length - 1) / 2) * plan.lineHeight * 0.12,
      cy: blockTop + lineGap * (i + 0.5),
      maxWidth,
      maxHeight: plan.lineHeight,
      style,
      pen: TITLE_PEN,
      tracking: TITLE_TRACKING,
      italic: TITLE_ITALIC,
    });
    if (i === 0) titleBox = { ...painted };
    else {
      const right = Math.max(titleBox.x + titleBox.w, painted.x + painted.w);
      titleBox.x = Math.min(titleBox.x, painted.x);
      titleBox.w = right - titleBox.x;
      titleBox.h = painted.y + painted.h - titleBox.y;
    }
  });
  let cursorY = plan.lines.length ? titleBox.y + titleBox.h + short * 0.018 : cy;
  const parts = [];
  if (plan.lines.length) {
    const reach = styleMargin(style) * (titleBox.scale ?? 0);
    parts.push({ x: titleBox.x - reach * 0.3, y: titleBox.y - reach * 0.3, w: titleBox.w + reach * 0.6,
      h: titleBox.h + reach * 0.8 });
  }

  const subtitle = (text.subtitle ?? '').trim();
  if (subtitle && text.ribbon !== true) {
    const scriptH = Math.max(14, maxHeight * 0.22);
    const scriptW = Math.min(maxWidth * 0.8, Math.max(titleBox.w * 0.7, scriptH * 6));
    const scriptX = titleBox.x + titleBox.w * 0.56;
    const extrusion = (style.extrude?.depth ?? 0) * (titleBox.scale ?? 0) * 0.55;
    const scriptY = Math.max(cursorY, titleBox.y + titleBox.h + extrusion) + scriptH * 0.5;
    const script = drawNeonScriptLine(ctx, subtitle, scriptX, scriptY, scriptW, scriptH);
    parts.push(padBox(script, scriptH * 0.3));
    cursorY = scriptY + scriptH * 0.75;
  } else if (subtitle) {
    const ribbonH = Math.max(14, maxHeight * 0.27);
    const ribbonW = Math.min(maxWidth * 0.86, Math.max(titleBox.w * 0.62, ribbonH * 8));
    const ribbonX = titleBox.x + titleBox.w * 0.5 + ribbonH * 0.4;
    const ribbonY = cursorY + ribbonH * 0.45;
    if (text.ribbon !== false) {
      drawRibbon(ctx, ribbonX, ribbonY, ribbonW, ribbonH, {
        fill: [preset.rim[0], preset.neon[0]],
        shade: '#3a0a3f',
        outline: '#14031c',
      });
    }
    drawFittedLine(ctx, subtitle, {
      cx: ribbonX,
      cy: ribbonY,
      maxWidth: ribbonW * 0.84,
      maxHeight: ribbonH * 0.64,
      style: SMALL_STYLES.ribbonText,
      pen: 2.2,
      tracking: 1.6,
      italic: 0.14,
    });
    parts.push({ x: ribbonX - ribbonW * 0.6, y: ribbonY - ribbonH * 0.7, w: ribbonW * 1.2, h: ribbonH * 1.4 });
    cursorY = ribbonY + ribbonH * 0.8;
  }

  const tagline = (text.tagline ?? '').trim();
  if (tagline && place.withTagline) {
    const tagH = Math.max(10, maxHeight * 0.13);
    drawTagline(ctx, tagline, cx, cursorY + tagH * 0.75, maxWidth * 0.8, tagH);
    cursorY += tagH * 1.6;
  }
  const boxTop = text.emblem ? blockTop - sunR : (plan.lines.length ? titleBox.y : cy - maxHeight / 2);
  const box = { x: cx - maxWidth / 2, y: boxTop, w: maxWidth, h: cursorY - boxTop };

  const badge = (text.badge ?? '').trim();
  if (badge && plan.lines.length) {
    const r = Math.min(maxHeight * 0.4, short * 0.09);
    const right = place.bounds ? place.bounds.right - r * 1.05 : Infinity;
    const top = place.bounds ? place.bounds.top + r * 1.05 : -Infinity;
    const bx = Math.min(titleBox.x + titleBox.w + r * 0.35, right);
    const by = Math.max(titleBox.y + r * 0.1 - (bx < titleBox.x + titleBox.w ? r * 0.7 : 0), top);
    drawBadge(ctx, bx, by, r, badge, {
      fill: ['#fff7b0', '#ffc21f'],
      ring: '#7a1440',
      outline: '#14031c',
    });
  }
  return { box, titleBox, parts };
}

/** A box grown by `pad` px on every side. */
function padBox({ x, y, w, h }, pad) {
  return { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 };
}
