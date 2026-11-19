// The cover's bottom banner: a sunset gradient strip with a setting sun, skyline and palm silhouettes, neon trim.
import { seededRandom } from '../grade/effects.js';
import { drawPalm, drawSunDisc } from '../grade/scenery.js';
import { paintCityRow, strokeNeon } from './sceneKit.js';

/** Paints the banner into rect { x, y, w, h } of the cover. */
export function paintBannerStrip(ctx, rect, preset, seed = 9) {
  const { x, y, w, h } = rect;
  const random = seededRandom(seed * 4421 + 17);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  const band = ctx.createLinearGradient(0, 0, 0, h);
  band.addColorStop(0, preset.sun[1]);
  band.addColorStop(0.45, preset.sun[2]);
  band.addColorStop(1, preset.sun[3]);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(40, 6, 70, 0.55)');
  side.addColorStop(0.35, 'rgba(40, 6, 70, 0)');
  side.addColorStop(0.7, 'rgba(40, 6, 70, 0)');
  side.addColorStop(1, 'rgba(40, 6, 70, 0.6)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
  drawSunDisc(ctx, w * 0.5, h * 0.78, h * 0.62, preset.sun, { stripes: 5, haloAlpha: 0.45 });
  paintCityRow(ctx, random, w, h + 1, {
    minH: h * 0.18, maxH: h * 0.62, minW: h * 0.18, maxW: h * 0.5,
    colour: 'rgba(60, 10, 70, 0.75)', windowColours: ['rgba(255, 220, 160, 0.6)'], lit: 0.25,
  });
  paintCityRow(ctx, random, w, h + 1, {
    minH: h * 0.08, maxH: h * 0.34, minW: h * 0.22, maxW: h * 0.7,
    colour: '#1a0424', windowColours: ['#ffd27a', '#ff6ad5'], lit: 0.3,
  });
  const palms = Math.max(4, Math.round(w / (h * 1.6)));
  for (let i = 0; i < palms; i += 1) {
    const px = ((i + 0.5) / palms) * w + (random() - 0.5) * h * 0.6;
    drawPalm(ctx, px, h * 1.04, h * (0.75 + random() * 0.4), (random() - 0.5) * 0.35, '#12021b', seed * 31 + i);
  }
  ctx.restore();
  strokeNeon(ctx, preset.neon[1], Math.max(1.5, h * 0.025), () => {
    ctx.moveTo(x, y + h * 0.02);
    ctx.lineTo(x + w, y + h * 0.02);
  });
}
