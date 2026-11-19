// Neon-grid filler panel for the cover grid.
// Paints a night sky with a banded sun, jagged glowing ridgelines
// and a perspective neon grid floor running to the horizon.
import { seededRandom } from '../grade/effects.js';
import { drawPalm, drawSunDisc } from '../grade/scenery.js';
import { paintSky, paintStars, strokeNeon } from './sceneKit.js';

/** A jagged ridge silhouette across the panel, its peaks between `low` and `high`. */
function paintRidge(ctx, random, w, base, low, high, fill, edge) {
  const points = [[0, base]];
  const steps = 9;
  for (let i = 0; i <= steps; i += 1) points.push([(i / steps) * w, base - (low + random() * (high - low))]);
  points.push([w, base]);
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
  strokeNeon(ctx, edge, Math.max(1, w * 0.003), () => {
    points.slice(1, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  });
}

/** Paints the neon grid scene into a w x h context. */
export function paintNeonGrid(ctx, w, h, preset, seed = 2) {
  const random = seededRandom(seed * 104729 + 5);
  const horizon = h * 0.56;
  const short = Math.min(w, h);
  paintSky(ctx, w, horizon, ['#05021a', '#1d0a4f', '#5a1683', '#d6338a']);
  paintStars(ctx, random, w, horizon * 0.7, Math.round(w / 6));
  drawSunDisc(ctx, w * 0.5, horizon - short * 0.12, short * 0.3, preset.sun, { stripes: 8, haloAlpha: 0.7 });
  paintRidge(ctx, random, w, horizon + 1, h * 0.04, h * 0.14, '#2a0b4d', preset.neon[1]);
  paintRidge(ctx, random, w, horizon + 1, h * 0.01, h * 0.07, '#160430', preset.neon[0]);
  const floor = ctx.createLinearGradient(0, horizon, 0, h);
  floor.addColorStop(0, '#2b0638');
  floor.addColorStop(1, '#07010f');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, w, h - horizon);
  const lineW = Math.max(1, short * 0.005);
  strokeNeon(ctx, preset.neon[0], lineW, () => {
    for (let i = -12; i <= 12; i += 1) {
      ctx.moveTo(w / 2 + i * w * 0.012, horizon);
      ctx.lineTo(w / 2 + i * w * 0.16, h);
    }
  });
  strokeNeon(ctx, preset.neon[1], lineW, () => {
    for (let i = 1; i <= 11; i += 1) {
      const y = horizon + (h - horizon) * Math.pow(i / 11, 2.1);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
  });
  drawPalm(ctx, w * 0.08, h * 1.02, h * 0.78, 0.1, '#06010c', seed + 9);
  drawPalm(ctx, w * 0.93, h * 1.02, h * 0.66, -0.12, '#06010c', seed + 10);
}
