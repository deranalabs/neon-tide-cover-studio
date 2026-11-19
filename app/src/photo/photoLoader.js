// Turns a dropped or picked image file into an upright, downscaled canvas on this machine: nothing is uploaded.
import { applyOrientation, readJpegInfo, swapsSides } from './exifOrientation.js';

/** Longest side kept after loading: enough for a 1920 px export, small enough to grade fast. */
export const MAX_PHOTO_SIDE = 2400;
const THUMB_SIDE = 160;

let counter = 0;

/** Halves a canvas until it is within twice the target, so the last smooth scale does not alias. */
function stepDown(source, sw, sh, targetW) {
  let current = source;
  let w = sw;
  let h = sh;
  while (w / 2 >= targetW * 1.5) {
    const half = new OffscreenCanvas(Math.round(w / 2), Math.round(h / 2));
    const hc = half.getContext('2d');
    hc.imageSmoothingQuality = 'high';
    hc.drawImage(current, 0, 0, half.width, half.height);
    current = half;
    w = half.width;
    h = half.height;
  }
  return current;
}

/** A small JPEG data URL of the photo for the editor's photo tray. */
function thumbnailOf(canvas) {
  const scale = THUMB_SIDE / Math.max(canvas.width, canvas.height);
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(canvas.width * scale));
  thumb.height = Math.max(1, Math.round(canvas.height * scale));
  const tc = thumb.getContext('2d');
  tc.imageSmoothingQuality = 'high';
  tc.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.8);
}

/**
 * Decodes a Blob into { id, name, image, width, height, key, thumb }. The EXIF orientation is read by hand and
 * applied once (skipped when the browser has already turned the picture), and huge photos are downscaled.
 */
export async function loadPhoto(blob, name = 'photo') {
  if (!blob.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name)) {
    throw new Error(`${name} is not an image`);
  }
  const buffer = await blob.arrayBuffer();
  const info = readJpegInfo(buffer);
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'none' });
  let orientation = info.orientation;
  const alreadyTurned = swapsSides(orientation) && info.width && bitmap.width === info.height
    && bitmap.height === info.width && info.width !== info.height;
  if (alreadyTurned) orientation = 1;
  const uprightW = swapsSides(orientation) ? bitmap.height : bitmap.width;
  const uprightH = swapsSides(orientation) ? bitmap.width : bitmap.height;
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(uprightW, uprightH));
  const outW = Math.max(1, Math.round(uprightW * scale));
  const outH = Math.max(1, Math.round(uprightH * scale));
  const storedW = Math.max(1, Math.round(bitmap.width * scale));
  const storedH = Math.max(1, Math.round(bitmap.height * scale));
  const reduced = stepDown(bitmap, bitmap.width, bitmap.height, storedW);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  applyOrientation(ctx, orientation, storedW, storedH);
  ctx.drawImage(reduced, 0, 0, storedW, storedH);
  bitmap.close();
  counter += 1;
  const id = `p${counter}`;
  const key = `${id}:${outW}x${outH}`;
  return { id, name, image: canvas, width: outW, height: outH, key, thumb: thumbnailOf(canvas) };
}

/** Fetches an image bundled with the app (the samples) and loads it like a dropped file. */
export async function loadPhotoFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not read ${url}`);
  return loadPhoto(await response.blob(), url.split('/').pop());
}
