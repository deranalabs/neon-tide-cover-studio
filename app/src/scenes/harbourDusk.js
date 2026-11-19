// Painted filler panel: a harbour at dusk with moored boats, a lighthouse beam, pier posts and rippling water.
import { seededRandom } from '../grade/effects.js';
import { drawSunDisc } from '../grade/scenery.js';
import { paintCloudStreaks, paintSky, paintStars, paintWater } from './sceneKit.js';

/** A moored sailboat silhouette whose waterline sits at (x, y), `size` px long. */
function paintBoat(ctx, x, y, size, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y - size * 0.12);
  ctx.lineTo(x + size / 2, y - size * 0.12);
  ctx.lineTo(x + size * 0.38, y);
  ctx.lineTo(x - size * 0.4, y);
  ctx.fill();
  ctx.fillRect(x - size * 0.15, y - size * 0.22, size * 0.28, size * 0.1);
  ctx.fillRect(x - size * 0.01, y - size * 0.95, Math.max(1, size * 0.02), size * 0.85);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(0.6, size * 0.006);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.95);
  ctx.lineTo(x + size * 0.45, y - size * 0.12);
  ctx.moveTo(x, y - size * 0.95);
  ctx.lineTo(x - size * 0.42, y - size * 0.12);
  ctx.stroke();
}

/** Paints the harbour scene into a w x h context. */
export function paintHarbourDusk(ctx, w, h, preset, seed = 3) {
  const random = seededRandom(seed * 6151 + 3);
  const horizon = h * 0.55;
  const short = Math.min(w, h);
  paintSky(ctx, w, horizon, ['#0f1a3d', '#33306e', '#9a3f86', '#ff8a6b', '#ffd28a']);
  paintStars(ctx, random, w, horizon * 0.4, Math.round(w / 12));
  paintCloudStreaks(ctx, random, w, horizon * 0.2, horizon * 0.9, 'rgba(255, 190, 170, 0.4)', 16);
  drawSunDisc(ctx, w * 0.3, horizon, short * 0.16, preset.sun, { stripes: 4, haloAlpha: 0.5 });
  ctx.fillStyle = '#2a1745';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let i = 0; i <= 12; i += 1) ctx.lineTo((i / 12) * w, horizon - h * (0.02 + 0.05 * Math.sin(i * 0.9 + seed)));
  ctx.lineTo(w, horizon);
  ctx.fill();
  ctx.fillStyle = '#ffd27a';
  for (let i = 0; i < 40; i += 1) {
    ctx.fillRect(random() * w, horizon - random() * h * 0.03, Math.max(1, w * 0.003), Math.max(1, w * 0.003));
  }
  const towerX = w * 0.82;
  ctx.fillStyle = '#170a28';
  ctx.fillRect(towerX - w * 0.015, horizon - h * 0.22, w * 0.03, h * 0.22);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createLinearGradient(towerX, 0, 0, 0);
  beam.addColorStop(0, 'rgba(255, 245, 200, 0.75)');
  beam.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(towerX, horizon - h * 0.21);
  ctx.lineTo(0, horizon - h * 0.42);
  ctx.lineTo(0, horizon - h * 0.28);
  ctx.fill();
  ctx.restore();
  paintWater(ctx, random, w, h, horizon, ['#6b3a7a', '#2a1650', '#0b0820'], ['#ffd28a', '#ff8ad0'], w * 0.3, 160);
  paintBoat(ctx, w * 0.55, horizon + h * 0.08, short * 0.32, '#12081f');
  paintBoat(ctx, w * 0.75, horizon + h * 0.05, short * 0.2, '#1c0d30');
  ctx.fillStyle = '#0a0412';
  ctx.fillRect(0, h * 0.86, w, h * 0.03);
  for (let i = 0; i < 7; i += 1) ctx.fillRect(w * (0.04 + i * 0.15), h * 0.8, w * 0.025, h * 0.2);
}
