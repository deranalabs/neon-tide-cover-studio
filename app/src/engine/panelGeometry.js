// Geometry helpers for cover panels defined as normalised polygons.
// Scales them to pixels, computes bounding boxes, runs point hit tests
// and traces canvas paths for clipping and outlines.

/** Scales a normalised polygon [[x, y], ...] to a w x h cover. */
export function polygonToPixels(polygon, w, h) {
  return polygon.map(([x, y]) => [x * w, y * h]);
}

/** The axis-aligned box around a polygon: { x, y, w, h }. */
export function polygonBounds(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Adds the polygon as a closed sub-path of the context's current path. */
export function tracePolygon(ctx, polygon) {
  polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** True when (px, py) lies inside the polygon (even-odd ray cast). */
export function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** The mean of a polygon's corners, a good enough centre for labels and hit hints. */
export function polygonCentre(polygon) {
  const sum = polygon.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / polygon.length, sum[1] / polygon.length];
}

/** Swaps x and y of every point: turns a landscape layout's columns into a portrait layout's rows. */
export function transposePolygon(polygon) {
  return polygon.map(([x, y]) => [y, x]);
}
