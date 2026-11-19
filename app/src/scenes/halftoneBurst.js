// Painted filler panel: a comic-print sunburst with halftone dots, a ringed sun and a palm crossing the rays.
import { seededRandom } from '../grade/effects.js';
import { drawPalm } from '../grade/scenery.js';

/** Paints the burst scene into a w x h context. */
export function paintHalftoneBurst(ctx, w, h, preset, seed = 5) {
  const random = seededRandom(seed * 2909 + 1);
  const cx = w * (0.38 + random() * 0.2);
  const cy = h * (0.42 + random() * 0.12);
  const reach = Math.hypot(w, h);
  ctx.fillStyle = '#ff6a4d';
  ctx.fillRect(0, 0, w, h);
  const rays = 22;
  for (let i = 0; i < rays; i += 1) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / rays / 2;
    ctx.fillStyle = i % 2 ? '#ffb347' : '#ff2f7a';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * reach, cy + Math.sin(a0) * reach);
    ctx.lineTo(cx + Math.cos(a1) * reach, cy + Math.sin(a1) * reach);
    ctx.fill();
  }
  const cell = Math.max(5, Math.min(w, h) / 26);
  ctx.fillStyle = 'rgba(70, 8, 70, 0.55)';
  for (let y = 0; y < h + cell; y += cell) {
    for (let x = (Math.round(y / cell) % 2) * cell * 0.5; x < w + cell; x += cell) {
      const d = Math.hypot(x - cx, y - cy) / (reach * 0.55);
      const r = cell * 0.48 * Math.min(1, Math.max(0, d - 0.15));
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const sunR = Math.min(w, h) * 0.2;
  const sun = ctx.createRadialGradient(cx, cy - sunR * 0.3, sunR * 0.1, cx, cy, sunR);
  sun.addColorStop(0, preset.sun[0]);
  sun.addColorStop(0.6, preset.sun[1]);
  sun.addColorStop(1, preset.sun[2]);
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, sunR * 0.1);
  ctx.strokeStyle = '#2a0634';
  ctx.stroke();
  ctx.strokeStyle = '#fff4d6';
  ctx.lineWidth = Math.max(1, sunR * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, sunR * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  drawPalm(ctx, w * 0.78, h * 1.04, h * 0.95, -0.16, '#2a0634', seed + 21);
}
