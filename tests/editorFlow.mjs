// End-to-end editor test in headless Chrome: `node tests/editorFlow.mjs`. Uploads a JPEG whose EXIF says "turn
// 90°", pans, zooms, undoes, swaps, presses the shortcuts, exports all three PNG sizes and reloads to check that
// the settings were kept. Fails on any console error.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, REPO, serveApp } from './chromeDriver.mjs';

const outDir = join(REPO, 'tests', 'out');
const downloads = join(outDir, 'downloads');
rmSync(downloads, { recursive: true, force: true });
mkdirSync(downloads, { recursive: true });

/** The sample boulevard photo with an APP1 Exif block (orientation 6: turn 90° clockwise) put after SOI. */
function rotatedSample() {
  const jpeg = readFileSync(join(REPO, 'app', 'samples', 'boulevard.jpg'));
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'latin1');
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(6, 18);
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const header = Buffer.alloc(4);
  header.writeUInt16BE(0xffe1, 0);
  header.writeUInt16BE(exif.length + 2, 2);
  const file = join(outDir, 'turned-boulevard.jpg');
  writeFileSync(file, Buffer.concat([jpeg.subarray(0, 2), header, exif, jpeg.subarray(2)]));
  return file;
}

const steps = [];
const step = (name) => {
  steps.push(name);
  console.log(`- ${name}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serveApp();
const chrome = await launchChrome({ width: 1280, height: 720 });
try {
  const { send, sendBrowser, evaluate } = chrome;
  const editor = (expr) => evaluate(`(() => { const e = window.__coverEditor; return ${expr}; })()`);
  /** Client position of panel `i`'s centre on the preview. */
  const panelPoint = (i) => evaluate(`(() => {
    const g = window.__coverEditor.geometry();
    const p = g.panels[${i}].polygon;
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
    const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
    const r = document.getElementById('overlay').getBoundingClientRect();
    const s = r.width / g.w;
    return [r.left + cx * s, r.top + cy * s];
  })()`);
  const mouse = (type, [x, y], extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });
  const drag = async (from, to, modifiers = 0) => {
    await mouse('mouseMoved', from, { modifiers });
    await mouse('mousePressed', from, { clickCount: 1, buttons: 1, modifiers });
    for (let t = 1; t <= 6; t += 1) {
      const at = [from[0] + ((to[0] - from[0]) * t) / 6, from[1] + ((to[1] - from[1]) * t) / 6];
      await mouse('mouseMoved', at, { buttons: 1, modifiers });
      await wait(30);
    }
    await mouse('mouseReleased', to, { clickCount: 1, modifiers });
    await wait(150);
  };
  const key = async (keyName, code, keyCode, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode,
      modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode,
      modifiers });
    await wait(120);
  };

  await chrome.navigate(server.url);
  assert.match(await evaluate('document.getElementById("status").textContent'), /Sample photos loaded/);
  step('opens with the sample photos and a full cover');

  const { root } = await send('DOM.getDocument', {});
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileInput' });
  await send('DOM.setFileInputFiles', { nodeId, files: [rotatedSample()] });
  for (let i = 0; i < 50 && !(await editor('e.photos().length === 1')); i += 1) await wait(100);
  const [photo] = await editor('e.photos()');
  assert.deepEqual([photo.width, photo.height], [720, 544], 'turned upright by the EXIF orientation');
  const sides = await evaluate(`(() => {
    const img = window.__coverEditor.photoImage('${photo.id}');
    const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
    const band = (x0, x1) => { let s = 0; let n = 0;
      for (let y = 0; y < img.height; y += 4) for (let x = x0; x < x1; x += 4) {
        const i = (y * img.width + x) * 4; s += d[i] + d[i + 1] + d[i + 2]; n += 1; }
      return s / n; };
    return [band(0, 60), band(img.width - 60, img.width)];
  })()`);
  assert.ok(sides[1] > sides[0], 'the sky (top of the stored picture) ends up on the right: turned once, clockwise');
  const filled = await editor('e.state().panels.filter((p) => p.source.type === "photo").length');
  assert.ok(filled >= 3, 'one photo fills several panels');
  step('uploads a photo, applies its EXIF turn once, replaces the samples and auto-fills panels');

  await wait(200);
  const before = await editor('e.state().panels[0].crop');
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: (await panelPoint(0))[0],
    y: (await panelPoint(0))[1], deltaX: 0, deltaY: -400 });
  await wait(500);
  const zoomed = await editor('e.state().panels[0].crop');
  assert.ok(zoomed.zoom > before.zoom, 'wheel zooms in');
  const centre = await panelPoint(0);
  await drag(centre, [centre[0] + 60, centre[1] + 30]);
  const panned = await editor('e.state().panels[0].crop');
  assert.ok(panned.fx !== zoomed.fx || panned.fy !== zoomed.fy, 'drag pans');
  step('wheel zooms and drag pans the photo inside its panel');

  await key('z', 'KeyZ', 90, 2);
  assert.deepEqual(await editor('e.state().panels[0].crop'), zoomed, 'undo restores the crop before the pan');
  await key('z', 'KeyZ', 90, 2 | 8);
  assert.deepEqual(await editor('e.state().panels[0].crop'), panned, 'redo brings the pan back');
  step('Ctrl+Z undoes and Ctrl+Shift+Z redoes');

  const sources = await editor('e.state().panels.map((p) => JSON.stringify(p.source))');
  await drag(await panelPoint(0), await panelPoint(2), 8);
  const swapped = await editor('e.state().panels.map((p) => JSON.stringify(p.source))');
  assert.equal(swapped[0], sources[2]);
  assert.equal(swapped[2], sources[0]);
  step('Shift+drag swaps two panels');

  const title = await editor('JSON.stringify(e.state().text.title)');
  await key('r', 'KeyR', 82);
  await key(']', 'BracketRight', 221);
  await key('p', 'KeyP', 80);
  await key('f', 'KeyF', 70);
  await key('2', 'Digit2', 50);
  assert.equal(await editor('e.state().aspect'), 'square');
  await key('3', 'Digit3', 51);
  assert.equal(await editor('e.state().aspect'), 'portrait');
  await key('1', 'Digit1', 49);
  assert.equal(await editor('JSON.stringify(e.state().text.title)'), title, 'shortcuts keep the words');
  step('R, ], P, F and 1-3 shortcuts run without errors');

  await sendBrowser('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  const t0 = Date.now();
  await evaluate('document.getElementById("exportAll").click()');
  const expected = ['neon-tide-1920x1080.png', 'neon-tide-1080x1080.png', 'neon-tide-1080x1350.png'];
  for (let i = 0; i < 100; i += 1) {
    const names = readdirSync(downloads);
    if (expected.every((name) => names.includes(name))) break;
    await wait(100);
  }
  const ms = Date.now() - t0;
  for (const name of expected) {
    assert.ok(existsSync(join(downloads, name)), `${name} saved`);
    const png = readFileSync(join(downloads, name));
    assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
    const [w, h] = name.match(/(\d+)x(\d+)/).slice(1).map(Number);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [w, h], `${name} size`);
  }
  step(`"All 3 sizes" saves three PNGs at 1920x1080, 1080x1080, 1080x1350 in ${ms} ms`);

  await evaluate(`(() => { const t = document.getElementById('title'); t.focus(); t.value = 'Harbor Kings';
    t.dispatchEvent(new Event('input', { bubbles: true })); t.blur(); })()`);
  await wait(1100);
  await send('Page.reload', {});
  await wait(300);
  await chrome.navigate(server.url);
  assert.equal(await editor('e.state().text.title'), 'Harbor Kings');
  step('settings survive a reload (kept in this browser only)');

  const problems = chrome.logs.filter((line) => /^(exception|error)/.test(line));
  assert.deepEqual(problems, [], 'no console errors');
  step('no console errors');
  console.log(`editor flow: ${steps.length} checks passed`);
} finally {
  await chrome.close();
  await server.close();
}
