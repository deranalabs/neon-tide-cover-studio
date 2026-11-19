// Paints one panel's layer: the photo crop (or a painted scene), graded with its tint, halftone, grain and vignette.
// Layers are cached by everything that shapes them, so dragging one panel re-grades only that panel.
import { applyGradientMap, buildGradientLut, duotoneStops } from '../grade/gradientMap.js';
import { applyPrintTexture, drawVignette } from '../grade/effects.js';
import { TINTS } from '../grade/presets.js';
import { paintScene } from '../scenes/sceneCatalog.js';
import { sourceRect } from '../photo/panelCrop.js';

const CACHE_LIMIT = 40;
const layerCache = new Map();
const lutCache = new Map();

/** The tint a panel slot uses: its own, else the preset's cycle. */
export function panelTint(panel, slot, preset) {
  return panel.tint ?? preset.tints[slot % preset.tints.length];
}

function lutFor(tintId, duotone) {
  const key = `${tintId}:${duotone}`;
  if (!lutCache.has(key)) {
    const stops = (TINTS[tintId] ?? TINTS.flamingo).stops;
    lutCache.set(key, buildGradientLut(duotone ? duotoneStops(stops) : stops));
  }
  return lutCache.get(key);
}

/** Deepens the top of a photo panel with a magenta-violet dusk wash, so pale skies turn to sunset. */
function paintSkyWash(lc, bw, bh, strength) {
  const wash = lc.createLinearGradient(0, 0, 0, bh * 0.6);
  wash.addColorStop(0, `rgba(96, 18, 120, ${0.55 * strength})`);
  wash.addColorStop(1, 'rgba(96, 18, 120, 0)');
  lc.save();
  lc.globalCompositeOperation = 'multiply';
  lc.fillStyle = wash;
  lc.fillRect(0, 0, bw, bh);
  lc.restore();
}

/** Draws the panel's source into the layer: a photo crop (mirrored when flipped) or a scene. */
function paintSource(lc, panel, photo, bw, bh, preset, seed) {
  lc.save();
  if (panel.crop.flip) {
    lc.translate(bw, 0);
    lc.scale(-1, 1);
  }
  if (photo) {
    const { sx, sy, sw, sh } = sourceRect(photo.width, photo.height, bw, bh, panel.crop);
    lc.imageSmoothingQuality = 'high';
    lc.drawImage(photo.image, sx, sy, sw, sh, 0, 0, bw, bh);
  } else {
    paintScene(lc, panel.source?.id, bw, bh, preset, seed);
  }
  lc.restore();
}

/**
 * The graded layer (an OffscreenCanvas bw x bh) for panel slot `slot`. `coverW` sets the halftone cell so every
 * panel and every export size share one print screen.
 */
export function panelLayer(panel, slot, bw, bh, photos, preset, seed, coverW) {
  const photo = panel.source?.type === 'photo' ? photos.get(panel.source.id) ?? null : null;
  const tint = panelTint(panel, slot, preset);
  const key = [slot, bw, bh, coverW, seed, tint, preset.id, preset.duotone, preset.mapMix, preset.halftone,
    preset.grain, preset.vignette, JSON.stringify(panel), photo ? photo.key : 'scene'].join('|');
  const hit = layerCache.get(key);
  if (hit) {
    layerCache.delete(key);
    layerCache.set(key, hit);
    return hit;
  }
  const layer = new OffscreenCanvas(bw, bh);
  const lc = layer.getContext('2d', { willReadFrequently: true });
  paintSource(lc, panel, photo, bw, bh, preset, seed + slot * 17);
  const image = lc.getImageData(0, 0, bw, bh);
  const sceneMix = preset.duotone ? preset.mapMix : preset.mapMix * 0.22;
  applyGradientMap(image, {
    lut: lutFor(tint, preset.duotone),
    mapMix: photo ? preset.mapMix * (preset.duotone ? 1 : TINTS[tint]?.strength ?? 1) : sceneMix,
    contrast: photo ? preset.contrast : 1.04,
    saturation: photo ? preset.saturation : 1.05,
  });
  lc.putImageData(image, 0, 0);
  if (photo) paintSkyWash(lc, bw, bh, preset.mapMix);
  applyPrintTexture(lc, bw, bh, {
    halftone: preset.halftone,
    grain: preset.grain,
    seed: seed * 31 + slot,
    cell: coverW / 300,
  });
  drawVignette(lc, 0, 0, bw, bh, preset.vignette * 0.75);
  layerCache.set(key, layer);
  while (layerCache.size > CACHE_LIMIT) layerCache.delete(layerCache.keys().next().value);
  return layer;
}
