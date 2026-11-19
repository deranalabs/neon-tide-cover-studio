// Skyline-at-dusk filler panel for the cover grid.
// Paints a gradient sky, stars and a striped sun setting between towers,
// with lit windows reflected in the bay below the horizon.
import { seededRandom } from '../grade/effects.js';
import { drawPalm, drawSunDisc } from '../grade/scenery.js';
import { paintCityRow, paintCloudStreaks, paintSky, paintStars, paintWater } from './sceneKit.js';

/** Paints the skyline scene into a w x h context using the preset's sun and neon colours. */
export function paintSkylineDusk(ctx, w, h, preset, seed = 1) {
  const random = seededRandom(seed * 7919 + 11);
  const horizon = h * 0.68;
  const short = Math.min(w, h);
  paintSky(ctx, w, horizon, ['#16052e', '#4a1265', '#b02a78', '#ff6b55', '#ffc46a']);
  paintStars(ctx, random, w, horizon * 0.45, Math.round(w / 9));
  paintCloudStreaks(ctx, random, w, horizon * 0.3, horizon * 0.85, 'rgba(255, 150, 160, 0.35)', 12);
  drawSunDisc(ctx, w * 0.6, horizon - short * 0.1, short * 0.26, preset.sun, { stripes: 7, haloAlpha: 0.6 });
  paintCityRow(ctx, random, w, horizon, {
    minH: h * 0.1, maxH: h * 0.3, minW: w * 0.04, maxW: w * 0.1,
    colour: '#6a2477', windowColours: ['rgba(255, 210, 160, 0.55)', 'rgba(255, 140, 200, 0.5)'], lit: 0.35,
  });
  paintCityRow(ctx, random, w, horizon + 1, {
    minH: h * 0.16, maxH: h * 0.48, minW: w * 0.06, maxW: w * 0.14,
    colour: '#1e0629', edge: '#3a0f4a',
    windowColours: ['#ffd27a', '#ffb05c', '#ff5fcf', '#62f0ff'], lit: 0.42,
  });
  ctx.save();
  ctx.shadowColor = preset.neon[0];
  ctx.shadowBlur = short * 0.03;
  ctx.fillStyle = preset.neon[0];
  ctx.fillRect(w * 0.18, horizon - h * 0.3, w * 0.012, h * 0.12);
  ctx.fillStyle = preset.neon[1];
  ctx.fillRect(w * 0.78, horizon - h * 0.22, w * 0.07, h * 0.012);
  ctx.restore();
  paintWater(ctx, random, w, h, horizon, ['#5b1a66', '#24093a', '#0b0318'], ['#ffc46a', '#ff5fcf'], w * 0.6, 130);
  drawPalm(ctx, w * 0.06, h * 1.02, h * 0.62, 0.1, '#0d0216', seed + 3);
  drawPalm(ctx, w * 0.96, h * 1.05, h * 0.5, -0.14, '#0d0216', seed + 4);
}
