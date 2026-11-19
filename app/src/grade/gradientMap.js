// The per-panel colour pass: contrast and saturation, then a gradient map (or duotone) blended over the photo.

/** Parses #rrggbb into [r, g, b]. */
export function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** A 256-entry RGB lookup table spreading the colour stops evenly from black point to white point. */
export function buildGradientLut(stops) {
  const colours = stops.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  const spans = colours.length - 1;
  for (let i = 0; i < 256; i += 1) {
    const position = (i / 255) * spans;
    const k = Math.min(spans - 1, Math.floor(position));
    const t = position - k;
    for (let c = 0; c < 3; c += 1) lut[i * 3 + c] = colours[k][c] * (1 - t) + colours[k + 1][c] * t;
  }
  return lut;
}

/** The duotone variant of a tint: its deep shadow and its warm highlight only. */
export function duotoneStops(stops) {
  return [stops[0], stops[2], stops[stops.length - 2]];
}

/** A smooth S-curve on 0..1 with strength `contrast` (1 = unchanged). */
function contrastCurve(contrast) {
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) {
    const x = i / 255;
    const s = x * x * (3 - 2 * x);
    const mixed = x + (s - x) * Math.min(1, (contrast - 1) * 2.5);
    curve[i] = Math.max(0, Math.min(1, 0.5 + (mixed - 0.5) * (1 + (contrast - 1) * 0.6)));
  }
  return curve;
}

/**
 * Grades ImageData in place. `lut` from buildGradientLut; `mapMix` 0..1 how much the map replaces the colour;
 * `contrast` and `saturation` shape the photo first.
 */
export function applyGradientMap(imageData, { lut, mapMix, contrast, saturation }) {
  const data = imageData.data;
  const curve = contrastCurve(contrast);
  const keep = 1 - mapMix;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;
    const index = Math.max(0, Math.min(255, Math.round(lum)));
    const graded = curve[index];
    const lift = lum > 0 ? (graded * 255) / lum : 1;
    const mapIndex = Math.round(graded * 255) * 3;
    data[i] = r * lift * keep + lut[mapIndex] * mapMix;
    data[i + 1] = g * lift * keep + lut[mapIndex + 1] * mapMix;
    data[i + 2] = b * lift * keep + lut[mapIndex + 2] * mapMix;
  }
  return imageData;
}
