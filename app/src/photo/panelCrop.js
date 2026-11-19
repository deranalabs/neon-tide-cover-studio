// Crop maths for a photo inside a panel: cover-fit, zoom about a focus point, clamped pan and crop variants.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** A fresh crop: whole photo cover-fitted, centred, unflipped. */
export function defaultCrop() {
  return { zoom: 1, fx: 0.5, fy: 0.5, flip: false };
}

/**
 * Crops for the same photo repeated over several panels: the first shows it whole, the others zoom in on
 * different parts (upper third first, where faces usually are) so the panels read as different shots.
 */
const VARIANTS = [
  { zoom: 1, fx: 0.5, fy: 0.5 },
  { zoom: 2.1, fx: 0.52, fy: 0.3 },
  { zoom: 1.6, fx: 0.32, fy: 0.55 },
  { zoom: 2.6, fx: 0.62, fy: 0.42 },
  { zoom: 1.4, fx: 0.7, fy: 0.7 },
  { zoom: 3, fx: 0.45, fy: 0.25 },
  { zoom: 1.8, fx: 0.28, fy: 0.78 },
];

/** The crop for the `repeat`-th panel showing one photo. */
export function cropVariant(repeat) {
  return { ...VARIANTS[repeat % VARIANTS.length], flip: false };
}

/**
 * The source rectangle of a photo (iw x ih) that fills a panel box (bw x bh) under a crop. The focus point
 * (fx, fy) is the photo point shown at the box centre, moved inward when the zoomed view would leave the photo.
 */
export function sourceRect(iw, ih, bw, bh, crop) {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, crop.zoom ?? 1));
  const scale = Math.max(bw / iw, bh / ih) * zoom;
  const sw = bw / scale;
  const sh = bh / scale;
  const cx = Math.max(sw / 2, Math.min(iw - sw / 2, (crop.fx ?? 0.5) * iw));
  const cy = Math.max(sh / 2, Math.min(ih - sh / 2, (crop.fy ?? 0.5) * ih));
  return { sx: cx - sw / 2, sy: cy - sh / 2, sw, sh, scale };
}

/** Pulls a crop's focus back inside the range its zoom allows, so a pan never sticks past the photo edge. */
export function clampCrop(crop, iw, ih, bw, bh) {
  const rect = sourceRect(iw, ih, bw, bh, crop);
  return { ...crop, fx: (rect.sx + rect.sw / 2) / iw, fy: (rect.sy + rect.sh / 2) / ih };
}

/** Moves a crop by a drag of (dx, dy) cover pixels; the photo follows the pointer. */
export function panCrop(crop, dx, dy, iw, ih, bw, bh) {
  const { scale } = sourceRect(iw, ih, bw, bh, crop);
  const flipSign = crop.flip ? -1 : 1;
  const moved = { ...crop, fx: crop.fx - (dx * flipSign) / (scale * iw), fy: crop.fy - dy / (scale * ih) };
  return clampCrop(moved, iw, ih, bw, bh);
}

/** Zooms a crop by `factor`, keeping the photo point under (px, py) (0..1 of the panel box) where it is. */
export function zoomCrop(crop, factor, px, py, iw, ih, bw, bh) {
  const before = sourceRect(iw, ih, bw, bh, crop);
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (crop.zoom ?? 1) * factor));
  const along = crop.flip ? 1 - px : px;
  const pointX = before.sx + before.sw * along;
  const pointY = before.sy + before.sh * py;
  const after = sourceRect(iw, ih, bw, bh, { ...crop, zoom });
  const fx = (pointX - after.sw * (along - 0.5)) / iw;
  const fy = (pointY - after.sh * (py - 0.5)) / ih;
  return clampCrop({ ...crop, zoom, fx, fy }, iw, ih, bw, bh);
}
