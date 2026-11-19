// Screenshot harness: `node tests/browser.mjs --shots` renders the scenes in shots.json with headless Chrome.
// Export shots are the PNG the app's own export wrote, only scaled down to fit; the editor shot is the page itself.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, REPO, serveApp } from './chromeDriver.mjs';

const MAX_BYTES = 250 * 1024;
const args = process.argv.slice(2);
if (!args.includes('--shots')) {
  console.log('usage: node tests/browser.mjs --shots [--only name] [--keep-png]');
  process.exit(0);
}
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const keepPng = args.includes('--keep-png');
const shots = JSON.parse(readFileSync(join(REPO, 'shots.json'), 'utf8')).filter((s) => !only || s.name.includes(only));
const shotDir = join(REPO, 'screenshots');
const pngDir = join(REPO, 'tests', 'out');
mkdirSync(shotDir, { recursive: true });
if (keepPng) mkdirSync(pngDir, { recursive: true });

/** In-page: scales a PNG data URL to fit maxW x maxH and encodes JPEG under maxBytes. */
const FIT_JPEG = `async (dataUrl, maxW, maxH, maxBytes) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const s = Math.min(1, maxW / img.width, maxH / img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  for (let q = 0.93; q > 0.4; q -= 0.03) {
    const url = c.toDataURL('image/jpeg', q);
    if ((url.length - 23) * 0.75 <= maxBytes) return { url, w: c.width, h: c.height, q };
  }
  throw new Error('could not fit the byte budget');
}`;

const decode = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

const server = await serveApp();
const chrome = await launchChrome({ width: 1280, height: 720 });
try {
  for (const shot of shots) {
    const [vw, vh] = shot.viewport ?? [1280, 720];
    await chrome.setViewport(vw, vh);
    await chrome.navigate(server.url + shot.query);
    let jpeg;
    if (shot.export) {
      const [w, h] = shot.export;
      const t0 = Date.now();
      const png = await chrome.evaluate(`window.__exportCover(${w}, ${h})`, 120000);
      const ms = Date.now() - t0;
      if (keepPng) writeFileSync(join(pngDir, `${shot.name.replace(/\.\w+$/, '')}-${w}x${h}.png`), decode(png));
      const [fw, fh] = shot.fit;
      jpeg = await chrome.evaluate(`(${FIT_JPEG})(${JSON.stringify(png)}, ${fw}, ${fh}, ${MAX_BYTES})`);
      console.log(`${shot.name}: exported ${w}x${h} PNG in ${ms} ms, shown at ${jpeg.w}x${jpeg.h} q${jpeg.q.toFixed(2)}`);
      jpeg = jpeg.url;
    } else {
      await new Promise((r) => setTimeout(r, 300));
      const shotData = await chrome.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
      jpeg = `data:image/jpeg;base64,${shotData.data}`;
      console.log(`${shot.name}: page at ${vw}x${vh}`);
    }
    const bytes = decode(jpeg);
    writeFileSync(join(shotDir, shot.name), bytes);
    console.log(`  wrote screenshots/${shot.name} (${(bytes.length / 1024).toFixed(1)} KiB)`);
  }
  const problems = chrome.logs.filter((line) => /^(exception|error)/.test(line));
  if (problems.length) {
    console.log(`console problems:\n${problems.join('\n')}`);
    process.exitCode = 1;
  }
} finally {
  await chrome.close();
  await server.close();
}
