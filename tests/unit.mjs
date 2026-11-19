// Unit tests for the pure modules (crop maths, layouts, EXIF reader, history, state repair, auto-fill, names):
// `node --test tests/unit.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, LAYOUT_IDS, layoutPanels } from '../app/src/engine/layouts.js';
import { autoFillPanels } from '../app/src/engine/autoFill.js';
import { defaultState, normaliseState, PANEL_SLOTS } from '../app/src/engine/coverState.js';
import { cropVariant, panCrop, sourceRect, zoomCrop } from '../app/src/photo/panelCrop.js';
import { readJpegInfo, swapsSides } from '../app/src/photo/exifOrientation.js';
import { EditHistory } from '../app/src/ui/history.js';
import { shuffleCover } from '../app/src/ui/randomise.js';
import { exportFileName } from '../app/src/ui/exportCover.js';
import { GLYPHS, normaliseForGlyphs } from '../app/src/text/glyphs.js';

const area = (polygon) => Math.abs(polygon.reduce((sum, [x, y], i) => {
  const [nx, ny] = polygon[(i + 1) % polygon.length];
  return sum + x * ny - nx * y;
}, 0)) / 2;

test('every layout tiles the panel area exactly, at every aspect', () => {
  assert.ok(LAYOUTS.length >= 8);
  for (const id of LAYOUT_IDS) {
    for (const aspect of ['landscape', 'square', 'portrait']) {
      const panels = layoutPanels(id, aspect);
      assert.ok(panels.length >= 1 && panels.length <= PANEL_SLOTS, `${id} ${aspect} count`);
      const total = panels.reduce((sum, polygon) => sum + area(polygon), 0);
      assert.ok(Math.abs(total - 1) < 1e-6, `${id} ${aspect} covers ${total}`);
      for (const polygon of panels) {
        for (const [x, y] of polygon) assert.ok(x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9);
      }
    }
  }
});

test('panel counts cover 1 to 7 panels', () => {
  const counts = new Set(LAYOUT_IDS.map((id) => layoutPanels(id, 'landscape').length));
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.ok(counts.has(n), `a layout with ${n} panels`);
});

test('crop source rectangle always stays inside the photo', () => {
  for (const crop of [{ zoom: 1, fx: 0, fy: 0 }, { zoom: 3, fx: 1, fy: 1 }, { zoom: 5, fx: 0.5, fy: 0.1 }]) {
    const r = sourceRect(800, 600, 300, 500, crop);
    assert.ok(r.sx >= -1e-9 && r.sy >= -1e-9);
    assert.ok(r.sx + r.sw <= 800 + 1e-9 && r.sy + r.sh <= 600 + 1e-9);
    assert.ok(Math.abs(r.sw / r.sh - 300 / 500) < 1e-9, 'keeps the panel aspect');
  }
});

test('pan follows the pointer and clamps at the photo edge', () => {
  const start = { zoom: 2, fx: 0.5, fy: 0.5, flip: false };
  const moved = panCrop(start, 50, 0, 1000, 1000, 400, 400);
  assert.ok(moved.fx < 0.5, 'dragging right shows more of the left side');
  const flipped = panCrop({ ...start, flip: true }, 50, 0, 1000, 1000, 400, 400);
  assert.ok(flipped.fx > 0.5, 'a mirrored photo still follows the pointer');
  const far = panCrop(start, 100000, 0, 1000, 1000, 400, 400);
  assert.ok(Math.abs(far.fx - 0.25) < 1e-9, 'stops at the left edge');
});

test('zoom keeps the photo point under the pointer in place', () => {
  const crop = { zoom: 1.5, fx: 0.5, fy: 0.5, flip: false };
  const before = sourceRect(1200, 900, 400, 300, crop);
  const pointX = before.sx + before.sw * 0.3;
  const zoomed = zoomCrop(crop, 1.4, 0.3, 0.5, 1200, 900, 400, 300);
  const after = sourceRect(1200, 900, 400, 300, zoomed);
  assert.ok(Math.abs(after.sx + after.sw * 0.3 - pointX) < 1e-6);
  assert.equal(zoomCrop(crop, 100, 0.5, 0.5, 1200, 900, 400, 300).zoom, 5);
});

/** A minimal JPEG: SOI, an APP1 Exif block with one orientation entry, a SOF0 with the size, EOI. */
function fakeJpeg(orientation, littleEndian, width, height) {
  const tiff = Buffer.alloc(26);
  if (littleEndian) {
    tiff.write('II', 0, 'latin1');
    tiff.writeUInt16LE(42, 2);
    tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(1, 8);
    tiff.writeUInt16LE(0x0112, 10);
    tiff.writeUInt16LE(3, 12);
    tiff.writeUInt32LE(1, 14);
    tiff.writeUInt16LE(orientation, 18);
  } else {
    tiff.write('MM', 0, 'latin1');
    tiff.writeUInt16BE(42, 2);
    tiff.writeUInt32BE(8, 4);
    tiff.writeUInt16BE(1, 8);
    tiff.writeUInt16BE(0x0112, 10);
    tiff.writeUInt16BE(3, 12);
    tiff.writeUInt32BE(1, 14);
    tiff.writeUInt16BE(orientation, 18);
  }
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(exif.length + 2, 2);
  const sof = Buffer.from([0xff, 0xc0, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0]);
  const bytes = Buffer.concat([Buffer.from([0xff, 0xd8]), app1, exif, sof, Buffer.from([0xff, 0xd9])]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}

test('EXIF orientation and stored size are read by hand in both byte orders', () => {
  assert.deepEqual(readJpegInfo(fakeJpeg(6, false, 640, 480)), { orientation: 6, width: 640, height: 480 });
  assert.deepEqual(readJpegInfo(fakeJpeg(3, true, 100, 200)), { orientation: 3, width: 100, height: 200 });
  assert.equal(readJpegInfo(new ArrayBuffer(8)).orientation, 1, 'not a JPEG');
  assert.ok(swapsSides(6) && swapsSides(8) && !swapsSides(3) && !swapsSides(1));
});

test('undo and redo walk the recorded states', () => {
  const history = new EditHistory(3);
  history.push({ n: 1 });
  history.push({ n: 2 });
  assert.equal(history.push({ n: 2 }), false, 'an unchanged state is not a step');
  history.push({ n: 3 });
  assert.deepEqual(history.undo(), { n: 2 });
  assert.deepEqual(history.redo(), { n: 3 });
  history.push({ n: 4 });
  assert.equal(history.past.length, 3, 'bounded');
  assert.equal(history.canRedo, false);
});

test('state repair turns junk into a complete, valid state', () => {
  const repaired = normaliseState({ layout: 'nope', stars: 99, panels: [{ crop: { zoom: 'x' }, tint: 'bad' }],
    text: { title: 42, scale: -3 } });
  assert.equal(repaired.layout, defaultState().layout);
  assert.equal(repaired.stars, 5);
  assert.equal(repaired.panels.length, PANEL_SLOTS);
  assert.equal(repaired.panels[0].crop.zoom, 1);
  assert.equal(repaired.panels[0].tint, null);
  assert.equal(repaired.text.title, '42');
  assert.equal(repaired.text.scale, 0.4);
  assert.deepEqual(normaliseState(normaliseState(null)), normaliseState(null), 'idempotent');
});

test('auto-fill: one photo fills several panels with different crops; none gives scenes', () => {
  const panels = autoFillPanels(defaultState().panels, ['a']);
  const photoPanels = panels.filter((p) => p.source.type === 'photo');
  assert.ok(photoPanels.length >= 3);
  assert.equal(new Set(photoPanels.map((p) => JSON.stringify(p.crop))).size, photoPanels.length);
  assert.ok(autoFillPanels(defaultState().panels, []).every((p) => p.source.type === 'scene'));
  assert.ok(autoFillPanels(defaultState().panels, ['a', 'b', 'c', 'd']).every((p) => p.source.type === 'photo'));
  assert.notDeepEqual(cropVariant(0), cropVariant(1));
});

test('shuffle is repeatable for a seed and keeps the photos and words', () => {
  const state = normaliseState({ text: { title: 'Keep Me' } });
  const a = shuffleCover(state, ['p1'], 42);
  const b = shuffleCover(state, ['p1'], 42);
  assert.deepEqual(a, b);
  assert.equal(a.text.title, 'Keep Me');
  assert.ok(a.panels.some((p) => p.source.type === 'photo' && p.source.id === 'p1'));
});

test('export file names carry the title and size', () => {
  assert.equal(exportFileName('Neon Tide!', 1920, 1080), 'neon-tide-1920x1080.png');
  assert.equal(exportFileName('Café Ñoño', 1080, 1350), 'cafe-nono-1080x1350.png');
  assert.equal(exportFileName('   ', 1080, 1080), 'cover-1080x1080.png');
});

test('the display alphabet draws every capital, digit and common mark', () => {
  for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-&\'"•') assert.ok(GLYPHS[char], char);
  assert.equal(normaliseForGlyphs('déjà vu · ok'), 'DEJA VU • OK');
});
