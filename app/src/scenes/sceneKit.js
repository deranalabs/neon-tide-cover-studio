// Shared brushes for the painted filler scenes: banded skies, star fields, city blocks with lit windows, glinting water.

/** Fills [0, bottom) with a vertical gradient through evenly spaced colours. */
export function paintSky(ctx, w, bottom, colours) {
  const sky = ctx.createLinearGradient(0, 0, 0, bottom);
  colours.forEach((colour, i) => sky.addColorStop(i / (colours.length - 1), colour));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, bottom);
}

/** Thin horizontal cloud streaks in `colour`, denser near the horizon. */
export function paintCloudStreaks(ctx, random, w, top, bottom, colour, count = 14) {
  ctx.save();
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i += 1) {
    const t = Math.pow(random(), 0.6);
    const y = top + (bottom - top) * t;
    const len = w * (0.15 + random() * 0.45);
    const x = random() * w - len * 0.3;
    const thick = Math.max(1, (bottom - top) * (0.008 + random() * 0.018));
    ctx.beginPath();
    ctx.ellipse(x + len / 2, y, len / 2, thick, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Small twinkling dots in the upper sky. */
export function paintStars(ctx, random, w, bottom, count, colour = 'rgba(255, 240, 255, 0.85)') {
  ctx.save();
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i += 1) {
    const size = Math.max(1, w * 0.0025 * (0.4 + random()));
    ctx.fillRect(random() * w, Math.pow(random(), 1.4) * bottom, size, size);
  }
  ctx.restore();
}

/**
 * A row of city blocks standing on `base`: each a slab with a stepped or spired top and a grid of windows,
 * some lit. `lit` is the share of lit windows; `windowColours` are picked at random for lit ones.
 */
export function paintCityRow(ctx, random, w, base, opts) {
  const { minH, maxH, minW, maxW, colour, windowColours, lit = 0.4, edge = null } = opts;
  let x = -random() * maxW;
  while (x < w) {
    const bw = minW + random() * (maxW - minW);
    const bh = minH + random() * (maxH - minH);
    const top = base - bh;
    ctx.fillStyle = colour;
    ctx.fillRect(x, top, bw - 1, bh + 1);
    const crown = random();
    if (crown < 0.25) {
      ctx.fillRect(x + bw * 0.2, top - bh * 0.08, bw * 0.6, bh * 0.08 + 1);
      ctx.fillRect(x + bw * 0.45, top - bh * 0.22, Math.max(1, bw * 0.05), bh * 0.16);
    } else if (crown < 0.4) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + bw / 2, top - bh * 0.12);
      ctx.lineTo(x + bw - 1, top);
      ctx.fill();
    }
    if (edge) {
      ctx.fillStyle = edge;
      ctx.fillRect(x, top, Math.max(1, bw * 0.06), bh);
    }
    const cell = Math.max(2.5, bw / 6);
    for (let wy = top + cell; wy < base - cell * 0.6; wy += cell * 1.25) {
      for (let wx = x + cell * 0.6; wx < x + bw - cell * 0.8; wx += cell) {
        if (random() > lit) continue;
        ctx.fillStyle = windowColours[Math.floor(random() * windowColours.length)];
        ctx.fillRect(wx, wy, cell * 0.5, cell * 0.62);
      }
    }
    x += bw;
  }
}

/** Water from `top` to the bottom: a gradient plus horizontal glints that mirror light at `glowX`. */
export function paintWater(ctx, random, w, h, top, colours, glint, glowX = w / 2, count = 90) {
  const sea = ctx.createLinearGradient(0, top, 0, h);
  colours.forEach((colour, i) => sea.addColorStop(i / (colours.length - 1), colour));
  ctx.fillStyle = sea;
  ctx.fillRect(0, top, w, h - top);
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const t = random();
    const y = top + Math.pow(t, 1.5) * (h - top);
    const spread = w * (0.08 + t * 0.5);
    const len = w * (0.01 + random() * 0.07) * (1 + t);
    const x = glowX + (random() - 0.5) * spread * 2 - len / 2;
    const near = 1 - Math.min(1, Math.abs(x + len / 2 - glowX) / (spread + 1));
    ctx.globalAlpha = 0.25 + near * 0.7;
    ctx.fillStyle = random() < 0.75 ? glint[0] : glint[1];
    ctx.fillRect(x, y, len, Math.max(1, (h - top) * (0.006 + t * 0.012)));
  }
  ctx.restore();
}

/** Strokes a path with a soft coloured glow and a hot white core: a neon tube. */
export function strokeNeon(ctx, colour, width, drawPath) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = colour;
  ctx.shadowBlur = width * 5;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  drawPath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = Math.max(0.6, width * 0.35);
  ctx.stroke();
  ctx.restore();
}
