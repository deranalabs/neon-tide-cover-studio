// Sunset-cruiser filler panel for the cover grid.
// Paints a low sports coupe in profile on a palm-lined coast road,
// set against an oversized setting sun.
import { seededRandom } from '../grade/effects.js';
import { drawPalm, drawSunDisc } from '../grade/scenery.js';
import { paintSky, strokeNeon } from './sceneKit.js';

/** A wheel with a dark tyre, chrome rim and spokes at (x, y), radius r. */
function paintWheel(ctx, x, y, r) {
  ctx.fillStyle = '#07020c';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const rim = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r * 0.62);
  rim.addColorStop(0, '#ffffff');
  rim.addColorStop(0.6, '#ff9ad5');
  rim.addColorStop(1, '#3a1050');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0526';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58);
  }
  ctx.stroke();
}

/** Fills a closed polygon of [x, y] points. */
function fillShape(ctx, points) {
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
}

/** A low fastback coupe, nose to the right, `len` px long, wheels resting on `ground`, centred on x. */
function paintCoupe(ctx, x, ground, len, preset) {
  const u = len / 100;
  const left = x - 50 * u;
  const p = (px, py) => [left + px * u, ground - py * u];
  ctx.save();
  ctx.shadowColor = preset.neon[0];
  ctx.shadowBlur = len * 0.1;
  ctx.fillStyle = preset.neon[0];
  ctx.fillRect(left + 8 * u, ground - 4.5 * u, 84 * u, 2.5 * u);
  ctx.restore();
  const paint = ctx.createLinearGradient(0, ground - 31 * u, 0, ground - 6 * u);
  paint.addColorStop(0, '#ff8ab0');
  paint.addColorStop(0.3, '#ff2f6e');
  paint.addColorStop(0.65, '#b0104e');
  paint.addColorStop(1, '#3d0626');
  ctx.fillStyle = paint;
  const body = [p(1, 7), p(0, 17), p(3, 20.5), p(14, 22), p(38, 29.5), p(50, 30), p(69, 21), p(90, 17.5),
    p(100, 13), p(100, 8.5), p(96, 6.5), p(4, 6.5)];
  fillShape(ctx, body);
  ctx.strokeStyle = '#14020c';
  ctx.lineWidth = Math.max(1, u * 0.7);
  ctx.stroke();
  const glass = ctx.createLinearGradient(0, ground - 29 * u, 0, ground - 21 * u);
  glass.addColorStop(0, '#ffe0a8');
  glass.addColorStop(0.5, '#ff8a7a');
  glass.addColorStop(1, '#4a1a6a');
  ctx.fillStyle = glass;
  fillShape(ctx, [p(22, 22), p(38, 27.8), p(49, 28.2), p(64, 21.2)]);
  ctx.fillStyle = '#14020c';
  fillShape(ctx, [p(44, 28.1), p(46, 28.2), p(47, 21.2), p(45, 21.2)]);
  fillShape(ctx, [p(0, 20.5), p(7, 20.5), p(7, 22.5), p(-1, 22.5)]);
  ctx.fillStyle = 'rgba(255, 245, 230, 0.9)';
  fillShape(ctx, [p(5, 17.6), p(92, 15.2), p(92, 16.2), p(5, 18.6)]);
  ctx.fillStyle = 'rgba(20, 2, 12, 0.55)';
  ctx.fillRect(left + 34 * u, ground - 16 * u, 0.7 * u, 8.5 * u);
  ctx.fillRect(left + 62 * u, ground - 16 * u, 0.7 * u, 8.5 * u);
  ctx.fillStyle = '#fff6c8';
  fillShape(ctx, [p(95, 14.5), p(100, 12.6), p(100, 11), p(95, 12.4)]);
  ctx.fillStyle = '#ff2b4a';
  ctx.fillRect(left + 0.2 * u, ground - 16 * u, 2.5 * u, 2.5 * u);
  paintWheel(ctx, left + 20 * u, ground - 8 * u, 8.5 * u);
  paintWheel(ctx, left + 80 * u, ground - 8 * u, 8.5 * u);
}

/** Paints the coast-road scene into a w x h context. */
export function paintSunsetCruiser(ctx, w, h, preset, seed = 4) {
  const random = seededRandom(seed * 3571 + 7);
  const road = h * 0.74;
  const short = Math.min(w, h);
  paintSky(ctx, w, road, ['#2a0a4a', '#7d1d72', '#e2456e', '#ff9a52', '#ffd781']);
  drawSunDisc(ctx, w * 0.56, road - h * 0.2, short * 0.34, preset.sun, { stripes: 7, haloAlpha: 0.65 });
  for (let i = 0; i < 6; i += 1) {
    const px = w * (i / 5) + (random() - 0.5) * w * 0.08;
    drawPalm(ctx, px, road + 1, h * (0.32 + random() * 0.22), (random() - 0.5) * 0.3, '#2a0838', seed * 13 + i);
  }
  ctx.fillStyle = '#12031d';
  ctx.fillRect(0, road, w, h - road);
  strokeNeon(ctx, preset.neon[1], Math.max(1, short * 0.006), () => {
    ctx.moveTo(0, road + 1);
    ctx.lineTo(w, road + 1);
  });
  ctx.fillStyle = 'rgba(255, 220, 160, 0.85)';
  for (let x = -random() * w * 0.1; x < w; x += w * 0.16) ctx.fillRect(x, h * 0.9, w * 0.08, h * 0.012);
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = random() < 0.5 ? preset.neon[0] : '#ffe2b0';
    const y = road - h * 0.02 - random() * h * 0.2;
    ctx.fillRect(random() * w * 0.3, y, w * (0.08 + random() * 0.2), Math.max(1, h * 0.004));
  }
  ctx.restore();
  paintCoupe(ctx, w * 0.56, h * 0.86, Math.min(w * 0.82, h * 1.5), preset);
}
