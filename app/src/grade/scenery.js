// Procedural scenery: the striped sun disc, palm silhouettes, neon bars and a sunset backdrop for empty panels.
import { seededRandom } from './effects.js';

/** A setting sun of radius r centred on (cx, cy): halo, banded gradient disc, and horizontal cuts in its foot. */
export function drawSunDisc(ctx, cx, cy, r, colours, { stripes = 6, haloAlpha = 0.5 } = {}) {
  ctx.save();
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.1);
  halo.addColorStop(0, hexAlpha(colours[2], haloAlpha));
  halo.addColorStop(1, hexAlpha(colours[3], 0));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  ctx.restore();

  const size = Math.ceil(r * 2 + 4);
  const layer = new OffscreenCanvas(size, size);
  const lc = layer.getContext('2d');
  const body = lc.createLinearGradient(0, 2, 0, size - 2);
  body.addColorStop(0, colours[0]);
  body.addColorStop(0.35, colours[1]);
  body.addColorStop(0.7, colours[2]);
  body.addColorStop(1, colours[3]);
  lc.fillStyle = body;
  lc.beginPath();
  lc.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  lc.fill();
  lc.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < stripes; i += 1) {
    const t = i / stripes;
    const y = size / 2 + r * (0.12 + t * 0.86);
    const gap = r * (0.03 + t * 0.07);
    lc.fillRect(0, y, size, gap);
  }
  ctx.drawImage(layer, cx - size / 2, cy - size / 2);
}

/** Converts #rrggbb plus an alpha into an rgba() string. */
export function hexAlpha(hex, alpha) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

/** One palm frond: a drooping spine from (x, y) at `angle`, with serrated leaflets on both sides. */
function drawFrond(ctx, x, y, angle, length, droop, width) {
  const steps = 14;
  const left = [];
  const right = [];
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length + droop;
  const qx = x + Math.cos(angle) * length * 0.55;
  const qy = y + Math.sin(angle) * length * 0.55 - droop * 0.35;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * qx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * qy + t * t * ey;
    const tx = 2 * (1 - t) * (qx - x) + 2 * t * (ex - qx);
    const ty = 2 * (1 - t) * (qy - y) + 2 * t * (ey - qy);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const serration = i % 2 === 0 ? 1 : 0.35;
    const wide = width * Math.sin(Math.PI * Math.min(1, t * 1.1)) * serration;
    left.push([px + nx * wide, py + ny * wide + wide * 0.6]);
    right.push([px - nx * wide, py - ny * wide + wide * 0.6]);
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (const [px, py] of left) ctx.lineTo(px, py);
  for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

/**
 * A palm tree silhouette rooted at (x, y), `height` px tall, leaning by `lean` (fraction of height, negative
 * leans left). `seed` varies the fronds.
 */
export function drawPalm(ctx, x, y, height, lean, colour, seed = 1) {
  const random = seededRandom(seed);
  const topX = x + lean * height;
  const topY = y - height;
  const midX = x + lean * height * 0.2;
  const midY = y - height * 0.55;
  const baseW = height * 0.045;
  const topW = height * 0.02;
  ctx.save();
  ctx.fillStyle = colour;
  const left = [];
  const right = [];
  const steps = 20;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * midX + t * t * topX;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * midY + t * t * topY;
    const w = (baseW * (1 - t) + topW * t) * (i % 2 === 0 ? 1 : 0.86);
    left.push([px - w, py]);
    right.push([px + w, py]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [px, py] of left) ctx.lineTo(px, py);
  for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  const fronds = 9;
  for (let i = 0; i < fronds; i += 1) {
    const base = -Math.PI / 2 + ((i / (fronds - 1)) - 0.5) * Math.PI * 1.9;
    const angle = base + (random() - 0.5) * 0.25;
    const length = height * (0.36 + random() * 0.16);
    const droop = height * (0.08 + Math.abs(Math.cos(angle)) * 0.16);
    drawFrond(ctx, topX, topY, angle, length, droop, height * 0.045);
  }
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(topX + (i - 1) * height * 0.022, topY + height * 0.03, height * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Glowing horizontal neon bars centred on cx, stacked downward from y, shrinking as they go. */
export function drawNeonBars(ctx, cx, y, width, thickness, colours, count = 3) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    const colour = colours[i % colours.length];
    const w = width * (1 - i * 0.22);
    const yy = y + i * thickness * 2.6;
    ctx.shadowColor = colour;
    ctx.shadowBlur = thickness * 4;
    ctx.strokeStyle = colour;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, yy);
    ctx.lineTo(cx + w / 2, yy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = thickness * 0.35;
    ctx.stroke();
  }
  ctx.restore();
}

/** A full sunset backdrop for a panel with no photo: sky, sun on the horizon, sea with glints, two palms. */
export function drawSunsetScene(ctx, x, y, w, h, preset, seed = 3) {
  const horizon = y + h * 0.62;
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  sky.addColorStop(0, '#1b0838');
  sky.addColorStop(0.45, '#7a1f6e');
  sky.addColorStop(0.8, '#ff5f6d');
  sky.addColorStop(1, '#ffb15c');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, horizon - y);
  const r = Math.min(w, h) * 0.26;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, horizon - y);
  ctx.clip();
  drawSunDisc(ctx, x + w * 0.5, horizon - r * 0.15, r, preset.sun, { stripes: 5 });
  ctx.restore();
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, '#5a1a6a');
  sea.addColorStop(1, '#12052a');
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  const random = seededRandom(seed);
  ctx.fillStyle = hexAlpha(preset.sun[1], 0.7);
  for (let i = 0; i < 26; i += 1) {
    const t = random();
    const gy = horizon + Math.pow(t, 1.6) * (y + h - horizon);
    const gw = w * (0.05 + (1 - t) * 0.25) * random();
    ctx.fillRect(x + w * 0.5 - gw / 2 + (random() - 0.5) * w * 0.2, gy, gw, Math.max(1, h * 0.006));
  }
  drawPalm(ctx, x + w * 0.12, y + h * 1.02, h * 0.85, 0.12, '#12041f', seed + 1);
  drawPalm(ctx, x + w * 0.9, y + h * 1.04, h * 0.7, -0.16, '#12041f', seed + 2);
}
