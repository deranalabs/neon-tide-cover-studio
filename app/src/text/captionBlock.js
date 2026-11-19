// The caption block: an auto-fitted title (one or two lines), the subtitle on a ribbon, the tagline beneath, the
// badge sticker, and an optional sun-and-palms emblem. Returns its box so the editor can hit-test and drag it.
import { drawFittedLine, fitScale } from './lettering.js';
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
  if (!/\s/.test(title.trim())) return { lines: [title], lineHeight: maxHeight };
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

/**
 * Paints the caption. `place` is { cx, cy, maxWidth, maxHeight, short, withTagline }: the title's centre and box
 * in px, the cover's short side, and whether the tagline goes here (false when the banner carries it).
 * Returns { box, titleBox } in px.
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

  const subtitle = (text.subtitle ?? '').trim();
  if (subtitle) {
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
    cursorY = ribbonY + ribbonH * 0.8;
  }

  const tagline = (text.tagline ?? '').trim();
  if (tagline && place.withTagline) {
    const tagH = Math.max(10, maxHeight * 0.13);
    drawTagline(ctx, tagline, cx, cursorY + tagH * 0.75, maxWidth * 0.8, tagH);
    cursorY += tagH * 1.6;
  }
  const boxTop = text.emblem ? blockTop - sunR : Math.min(titleBox.y, cy - maxHeight / 2);
  const box = { x: cx - maxWidth / 2, y: boxTop, w: maxWidth, h: cursorY - boxTop };

  const badge = (text.badge ?? '').trim();
  if (badge && plan.lines.length) {
    const r = Math.min(maxHeight * 0.4, short * 0.09);
    drawBadge(ctx, titleBox.x + titleBox.w + r * 0.35, titleBox.y + r * 0.1, r, badge, {
      fill: ['#fff7b0', '#ffc21f'],
      ring: '#7a1440',
      outline: '#14031c',
    });
  }
  return { box, titleBox };
}
