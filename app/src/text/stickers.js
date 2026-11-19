// Sticker elements drawn in code: the folded ribbon banner behind the subtitle and the starburst badge.
import { drawFittedLine } from './lettering.js';
import { SMALL_STYLES } from './letterStyles.js';

/** A slanted ribbon banner centred on (cx, cy), w x h px, with folded tails behind both ends. */
export function drawRibbon(ctx, cx, cy, w, h, { fill, shade, outline }) {
  const skew = h * 0.35;
  const tail = h * 0.9;
  const drop = h * 0.32;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.lineWidth = Math.max(2, h * 0.08);
  ctx.strokeStyle = outline;
  const tails = [
    [[x0 + skew, y0 + drop], [x0 - tail, y0 + drop], [x0 - tail * 0.55, (y0 + y1) / 2 + drop], [x0 - tail, y1 + drop],
      [x0, y1 + drop]],
    [[x1 - skew, y0 + drop], [x1 + tail, y0 + drop], [x1 + tail * 0.55, (y0 + y1) / 2 + drop], [x1 + tail, y1 + drop],
      [x1, y1 + drop]],
  ];
  for (const shape of tails) {
    ctx.beginPath();
    shape.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x0 + skew, y0);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1 - skew, y1);
  ctx.lineTo(x0, y1);
  ctx.closePath();
  const band = ctx.createLinearGradient(0, y0, 0, y1);
  band.addColorStop(0, fill[0]);
  band.addColorStop(1, fill[1]);
  ctx.fillStyle = band;
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1, h * 0.035);
  ctx.beginPath();
  ctx.moveTo(x0 + skew + h * 0.12, y0 + h * 0.14);
  ctx.lineTo(x1 - h * 0.08, y0 + h * 0.14);
  ctx.stroke();
  ctx.restore();
}

/** A starburst badge of radius r at (cx, cy), turned by `angle` radians, with up to two lines of text. */
export function drawBadge(ctx, cx, cy, r, text, { fill, ring, outline }, angle = -0.2) {
  const points = 18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(10, 0, 20, 0.55)';
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetY = r * 0.08;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? r : r * 0.84;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  body.addColorStop(0, fill[0]);
  body.addColorStop(1, fill[1]);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.strokeStyle = ring;
  ctx.stroke();
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '),
    words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
  const lineH = lines.length > 1 ? r * 0.42 : r * 0.62;
  lines.forEach((line, i) => {
    const cy0 = (i - (lines.length - 1) / 2) * lineH * 1.12;
    drawFittedLine(ctx, line, {
      cx: 0,
      cy: cy0,
      maxWidth: r * 1.25,
      maxHeight: lineH,
      style: SMALL_STYLES.badgeText,
      pen: 2.6,
      tracking: 0.9,
      italic: 0.1,
    });
  });
  ctx.restore();
}
