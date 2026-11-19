// Exports the cover as a PNG at a post size through the same renderCover the preview uses, and saves it locally.
import { renderCover } from '../engine/renderCover.js';
import { EXPORT_SIZES } from '../engine/coverState.js';

/** A file name from the title and size, e.g. neon-tide-1920x1080.png. */
export function exportFileName(title, w, h) {
  const slug = String(title ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'cover'}-${w}x${h}.png`;
}

/** Renders the cover at w x h and resolves to a PNG Blob. */
export async function renderCoverPng(state, photos, w, h) {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  renderCover(ctx, w, h, state, photos);
  return canvas.convertToBlob({ type: 'image/png' });
}

/** Hands a Blob to the browser as a download named `name`. */
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Exports one size id ('landscape', 'square', 'portrait') and saves it; resolves to the file name. */
export async function exportSize(state, photos, sizeId) {
  const size = EXPORT_SIZES.find((entry) => entry.id === sizeId) ?? EXPORT_SIZES[0];
  const blob = await renderCoverPng(state, photos, size.w, size.h);
  const name = exportFileName(state.text.title, size.w, size.h);
  saveBlob(blob, name);
  return name;
}
