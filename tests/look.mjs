// Measured look check: `node tests/look.mjs [files...]` fits each screenshot inside 768x480 (as the contact sheet
// does) and reports gradEnergy, flatBlocks, colors, brightShare and meanSat against the cover targets.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { launchChrome, REPO } from './chromeDriver.mjs';

/** Targets for the cover (1-cover), raised to the measured top of the field. */
export const COVER_TARGETS = {
  gradEnergy: [8.3, Infinity],
  flatBlocks: [0, 0.17],
  colors: [200, Infinity],
  brightShare: [0.01, 0.04],
  meanSat: [0.45, 0.6],
};

/** In-page: decodes an image data URL, fits it in 768x480 and computes the five metrics. */
const MEASURE = `async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const s = Math.min(768 / img.width, 480 / img.height);
  const w = Math.round(img.width * s);
  const h = Math.round(img.height * s);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const n = w * h;
  const L = new Float32Array(n);
  let sat = 0;
  let bright = 0;
  const bins = new Map();
  for (let i = 0; i < n; i += 1) {
    const r = d[i * 4];
    const gg = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    L[i] = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    if (L[i] > 230) bright += 1;
    const mx = Math.max(r, gg, b);
    const mn = Math.min(r, gg, b);
    sat += mx > 0 ? (mx - mn) / mx : 0;
    const key = ((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4);
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  let grad = 0;
  let count = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (x + 1 < w) { grad += Math.abs(L[i + 1] - L[i]); count += 1; }
      if (y + 1 < h) { grad += Math.abs(L[i + w] - L[i]); count += 1; }
    }
  }
  let flat = 0;
  let blocks = 0;
  for (let by = 0; by + 8 <= h; by += 8) {
    for (let bx = 0; bx + 8 <= w; bx += 8) {
      let sum = 0;
      let sq = 0;
      for (let y = by; y < by + 8; y += 1) {
        for (let x = bx; x < bx + 8; x += 1) { const v = L[y * w + x]; sum += v; sq += v * v; }
      }
      const mean = sum / 64;
      if (Math.sqrt(Math.max(0, sq / 64 - mean * mean)) < 3) flat += 1;
      blocks += 1;
    }
  }
  let colors = 0;
  for (const v of bins.values()) if (v > n * 0.001) colors += 1;
  return { w, h, gradEnergy: grad / count, flatBlocks: flat / blocks, colors, brightShare: bright / n,
    meanSat: sat / n };
}`;

const shotDir = join(REPO, 'screenshots');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(shotDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort().map((f) => join(shotDir, f));

const chrome = await launchChrome({ width: 800, height: 600 });
try {
  for (const file of files) {
    const type = extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${type};base64,${readFileSync(file).toString('base64')}`;
    const m = await chrome.evaluate(`(${MEASURE})(${JSON.stringify(dataUrl)})`);
    const isCover = /1-cover/.test(file);
    const marks = Object.entries(COVER_TARGETS).map(([key, [lo, hi]]) => {
      const ok = m[key] >= lo && m[key] <= hi;
      const value = Number.isInteger(m[key]) ? m[key] : m[key].toFixed(3);
      return `${key} ${value}${isCover ? (ok ? ' ok' : ' MISS') : ''}`;
    });
    console.log(`${file.split('/').pop()} @${m.w}x${m.h}: ${marks.join(', ')}`);
  }
} finally {
  await chrome.close();
}
