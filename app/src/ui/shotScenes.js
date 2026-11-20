// Fixed scenes for the screenshot harness (?shot=...): the two sample photos placed and cropped by hand, a fixed
// caption and grade. window.__exportCover(w, h) returns the PNG the app's own export writes, as a data URL.
import { normaliseState } from '../engine/coverState.js';
import { renderCoverPng } from './exportCover.js';

const photo = (id) => ({ type: 'photo', id });
const crop = (zoom, fx, fy, flip = false) => ({ zoom, fx, fy, flip });

/** The hand-placed cover every shot uses; `boulevard` and `pier` are the loaded sample photo ids. */
export function shotState(boulevard, pier) {
  return normaliseState({
    aspect: 'landscape',
    layout: 'poster',
    preset: 'duskDrive',
    stars: 4,
    seed: 7,
    panels: [
      // Hero: the woman's face and sunglasses, palms behind her; the title sits below her chin.
      { source: photo(boulevard), crop: crop(1.3, 0.62, 0.19), tint: 'flamingo', label: 'The Driver' },
      // A face crop of the man in the bucket hat, his chin clear of the title.
      { source: photo(pier), crop: crop(1.9, 0.4, 0.29), tint: 'rose', label: 'The Angler' },
      // The lifeguard tower with palms under the low sun.
      { source: photo(boulevard), crop: crop(3, 0.14, 0.31), tint: 'ember', label: 'One Last Summer' },
      // The car's chrome mirror, kept at the panel's outer (left) side, away from the title.
      { source: photo(boulevard), crop: crop(1.4, 0.05, 0.75), tint: 'ultraviolet', label: 'The Mirror' },
      // The pier rail and the fishing reel over teal water, at the panel's outer (right) side.
      { source: photo(pier), crop: crop(1.6, 0.9, 0.68), tint: 'lagoon', label: 'The Pier' },
      // Extra crops for six- and seven-panel layouts: the palm row in the sunset sky, the far beach and trees.
      { source: photo(boulevard), crop: crop(2, 0.95, 0.05), tint: 'flamingo' },
      { source: photo(pier), crop: crop(2.4, 0.08, 0.3), tint: 'ultraviolet' },
    ],
    text: {
      title: 'Neon Tide',
      subtitle: 'Salt Air Stories',
      tagline: 'The tide does not wait',
      badge: 'Vol. 1',
      ribbon: false,
    },
  });
}

/** Turns a Blob into a data URL. */
function blobToDataUrl(blob) {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(reader.result);
    reader.onerror = fail;
    reader.readAsDataURL(blob);
  });
}

/**
 * Installs the export hook the harness calls; `getState` and `photos` are the editor's live ones. `patch` (for the
 * gallery sheet) overrides top-level state fields such as layout or preset.
 */
export function installShotHooks(getState, photos) {
  window.__exportCover = async (w, h, patch = {}) => {
    const state = normaliseState({ ...getState(), ...patch });
    return blobToDataUrl(await renderCoverPng(state, photos, w, h));
  };
}
