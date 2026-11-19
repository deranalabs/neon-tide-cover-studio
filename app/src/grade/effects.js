// Finishing passes applied over the whole rendered cover: bloom glow, halftone dots, film grain,
// vignette and a lens flare. Randomised passes use a seeded generator so the same seed always
// produces the same cover.

/** Mulberry32: a small seeded random generator so every pass draws the same way for the same seed. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bloom: bright areas are thresholded on a small copy, blurred, and screened back over the cover. */
export function applyBloom(ctx, w, h, strength) {
  if (strength <= 0) return;
  const sw = Math.max(16, Math.round(w / 8));
  const sh = Math.max(16, Math.round(h / 8));
  const small = new OffscreenCanvas(sw, sh);
  const sc = small.getContext('2d', { willReadFrequently: true });
  sc.drawImage(ctx.canvas, 0, 0, sw, sh);
  const image = sc.getImageData(0, 0, sw, sh);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const k = Math.pow(Math.max(0, (lum - 0.55) / 0.45), 1.4);
    d[i] *= k;
    d[i + 1] *= k;
    d[i + 2] *= k;
  }
  sc.putImageData(image, 0, 0);
  const blurred = new OffscreenCanvas(sw, sh);
  const bc = blurred.getContext('2d');
  bc.filter = `blur(${Math.max(1.5, sw / 90)}px)`;
  bc.drawImage(small, 0, 0);
  bc.filter = `blur(${Math.max(3, sw / 30)}px)`;
  bc.globalCompositeOperation = 'lighter';
  bc.drawImage(small, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, strength);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(blurred, 0, 0, w, h);
  ctx.restore();
}

/**
 * Print texture over the whole cover: a 45-degree halftone screen whose dots grow in the shadows, and seeded
 * grain. Cell size follows the cover width so the preview and the export look alike.
 */
export function applyPrintTexture(ctx, w, h, { halftone, grain, seed, cell: cellSize }) {
  if (halftone <= 0 && grain <= 0) return;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const cell = Math.max(3, cellSize ?? w / 300);
  const inv = 1 / (cell * Math.SQRT2);
  const random = seededRandom(seed);
  const noise = new Float32Array(4096);
  for (let i = 0; i < noise.length; i += 1) noise[i] = random() - 0.5;
  const grainAmp = grain * 255;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      if (halftone > 0) {
        const u = (x + y) * inv;
        const v = (x - y) * inv;
        const fu = u - Math.floor(u) - 0.5;
        const fv = v - Math.floor(v) - 0.5;
        const dist = Math.sqrt(fu * fu + fv * fv);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const radius = Math.sqrt(1 - lum) * 0.62;
        const edge = Math.max(-1, Math.min(1, (radius - dist) * 9));
        const factor = 1 - halftone * 0.45 * (edge * 0.5 + 0.5) + halftone * 0.12 * (0.5 - edge * 0.5);
        r *= factor;
        g *= factor;
        b *= factor;
      }
      if (grainAmp > 0) {
        const n = noise[(x * 7 + y * 131 + ((x * y) & 1023)) & 4095] * grainAmp;
        r += n;
        g += n;
        b += n;
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Darkens the edges of a rectangle with a violet-black radial falloff. */
export function drawVignette(ctx, x, y, w, h, strength) {
  if (strength <= 0) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.hypot(w, h) / 2;
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(12, 2, 24, 0)');
  gradient.addColorStop(1, `rgba(12, 2, 24, ${Math.min(0.95, strength)})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** A warm lens flare at (x, y): soft core, horizontal streak and ghost rings towards (towardX, towardY). */
export function drawLensFlare(ctx, x, y, size, strength, towardX, towardY) {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, strength);
  const core = ctx.createRadialGradient(x, y, 0, x, y, size);
  core.addColorStop(0, 'rgba(255, 250, 225, 0.95)');
  core.addColorStop(0.12, 'rgba(255, 200, 120, 0.6)');
  core.addColorStop(0.45, 'rgba(255, 90, 120, 0.18)');
  core.addColorStop(1, 'rgba(255, 60, 120, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.035);
  const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.4);
  streak.addColorStop(0, 'rgba(255, 240, 220, 0.7)');
  streak.addColorStop(0.35, 'rgba(255, 150, 200, 0.22)');
  streak.addColorStop(1, 'rgba(120, 220, 255, 0)');
  ctx.fillStyle = streak;
  ctx.fillRect(-size * 2.4, -size * 2.4, size * 4.8, size * 4.8);
  ctx.restore();
  const ghosts = [
    [0.35, 0.16, 'rgba(255, 140, 90, 0.22)'],
    [0.6, 0.08, 'rgba(120, 230, 255, 0.25)'],
    [0.85, 0.24, 'rgba(255, 90, 200, 0.14)'],
  ];
  for (const [t, r, colour] of ghosts) {
    const gx = x + (towardX - x) * t;
    const gy = y + (towardY - y) * t;
    const ring = ctx.createRadialGradient(gx, gy, size * r * 0.5, gx, gy, size * r);
    ring.addColorStop(0, 'rgba(0, 0, 0, 0)');
    ring.addColorStop(0.8, colour);
    ring.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(gx, gy, size * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
