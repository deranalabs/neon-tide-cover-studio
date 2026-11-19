// The wanted-level style rating row: five chunky outlined stars, the first `filled` lit gold with a shine.

/** Traces a five-point star of outer radius r at (cx, cy). */
function traceStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.48;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws the row right-aligned to `right`, vertically centred on cy, each star `size` px across. */
export function drawRatingStars(ctx, right, cy, size, filled, total = 5) {
  const r = size / 2;
  const step = size * 1.08;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < total; i += 1) {
    const cx = right - (total - i - 0.5) * step;
    traceStar(ctx, cx + r * 0.12, cy + r * 0.16, r);
    ctx.fillStyle = 'rgba(10, 0, 18, 0.75)';
    ctx.fill();
    traceStar(ctx, cx, cy, r);
    ctx.lineWidth = Math.max(2, r * 0.26);
    ctx.strokeStyle = '#12021b';
    ctx.stroke();
    if (i < filled) {
      const gold = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      gold.addColorStop(0, '#fffbe0');
      gold.addColorStop(0.45, '#ffd257');
      gold.addColorStop(1, '#ff8a2a');
      ctx.fillStyle = gold;
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    }
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.strokeStyle = i < filled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();
  }
  ctx.restore();
}
