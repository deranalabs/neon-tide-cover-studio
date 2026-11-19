// Regression sheet: `node tests/gallerySheet.mjs` exports the shot cover in every preset and every layout through
// the app's own export, and tiles them into tests/out/gallery-presets.jpg and tests/out/gallery-layouts.jpg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, REPO, serveApp } from './chromeDriver.mjs';

const PRESETS = ['duskDrive', 'neonNights', 'flamingoHour', 'harborNoon', 'monoPink', 'tealTide'];
const LAYOUTS = ['poster', 'hero', 'split', 'stack', 'grid', 'shards', 'stagger', 'heroStrip', 'mosaic'];

/** In-page: exports each patch at 960x540 and tiles them `cols` across into one JPEG data URL. */
const TILE = `async (patches, cols) => {
  const w = 480;
  const h = 270;
  const rows = Math.ceil(patches.length / cols);
  const sheet = document.createElement('canvas');
  sheet.width = cols * w;
  sheet.height = rows * h;
  const g = sheet.getContext('2d');
  for (let i = 0; i < patches.length; i += 1) {
    const img = new Image();
    img.src = await window.__exportCover(960, 540, patches[i]);
    await img.decode();
    g.drawImage(img, (i % cols) * w, Math.floor(i / cols) * h, w, h);
  }
  return sheet.toDataURL('image/jpeg', 0.85);
}`;

const outDir = join(REPO, 'tests', 'out');
mkdirSync(outDir, { recursive: true });
const server = await serveApp();
const chrome = await launchChrome({ width: 1280, height: 720 });
try {
  await chrome.navigate(`${server.url}?shot=cover`);
  const sheets = {
    presets: [PRESETS.map((preset) => ({ preset })), 3],
    layouts: [LAYOUTS.map((layout) => ({ layout })), 3],
  };
  for (const [name, [patches, cols]] of Object.entries(sheets)) {
    const url = await chrome.evaluate(`(${TILE})(${JSON.stringify(patches)}, ${cols})`, 180000);
    const file = join(outDir, `gallery-${name}.jpg`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`wrote ${file}`);
  }
} finally {
  await chrome.close();
  await server.close();
}
