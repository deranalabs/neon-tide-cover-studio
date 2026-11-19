// Painted filler panel: a low sports coupe in profile racing along a palm-lined coast road under a huge sun.
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

/** The coupe body, nose to the right, `len` px long, wheels resting on `ground`, centred on x. */
function paintCoupe(ctx, x, ground, len, preset) {
  const u = len / 100;
  const left = x - 50 * u;
  const p = (px, py) => [left + px * u, ground - py * u];
  const body = [p(1, 8), p(0, 19), p(4, 22), p(20, 24), p(33, 32), p(52, 33), p(66, 24), p(88, 20), p(100, 15),
    p(100, 9), p(96, 7), p(4, 7)];
  ctx.save();
  ctx.shadowColor = preset.neon[0];
  ctx.shadowBlur = len * 0.08;
  ctx.fillStyle = preset.neon[0];
  ctx.fillRect(left + 8 * u, ground - 5 * u, 84 * u, 2.5 * u);
  ctx.restore();
  const paint = ctx.createLinearGradient(0, ground - 40 * u, 0, ground - 8 * u);
  paint.addColorStop(0, '#ff5c8a');
  paint.addColorStop(0.45, '#c3125a');
  paint.addColorStop(1, '#3d0626');
  ctx.fillStyle = paint;
  ctx.beginPath();
  body.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#14020c';
  ctx.lineWidth = Math.max(1, u * 0.8);
  ctx.stroke();
  const glass = ctx.createLinearGradient(0, ground - 32 * u, 0, ground - 24 * u);
  glass.addColorStop(0, '#ffd6a0');
  glass.addColorStop(1, '#5a2a7a');
  ctx.fillStyle = glass;
  ctx.beginPath();
  [p(25, 24), p(35, 30.5), p(51, 31.5), p(62, 24.5)].forEach(([gx, gy], i) => (i ? ctx.lineTo(gx, gy) : ctx.moveTo(gx, gy)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14020c';
  ctx.fillRect(left + 44 * u, ground - 31.5 * u, 2 * u, 7.5 * u);
  ctx.fillStyle = 'rgba(255, 240, 220, 0.85)';
  ctx.fillRect(left + 6 * u, ground - 19 * u, 86 * u, 1 * u);
  ctx.fillStyle = 'rgba(20, 2, 12, 0.6)';
  ctx.fillRect(left + 30 * u, ground - 17 * u, 0.8 * u, 9 * u);
  ctx.fillRect(left + 58 * u, ground - 17 * u, 0.8 * u, 9 * u);
  ctx.fillStyle = '#fff6c8';
  ctx.fillRect(left + 96 * u, ground - 15 * u, 4 * u, 2.5 * u);
  ctx.fillStyle = '#ff2b4a';
  ctx.fillRect(left + 0.2 * u, ground - 18 * u, 3 * u, 3 * u);
  paintWheel(ctx, left + 22 * u, ground - 8 * u, 9 * u);
  paintWheel(ctx, left + 78 * u, ground - 8 * u, 9 * u);
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
