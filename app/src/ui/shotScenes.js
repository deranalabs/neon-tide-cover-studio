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
      // Hero: the woman leaning on the convertible, palms and the low sun behind her.
      { source: photo(boulevard), crop: crop(1, 0.55, 0.06), tint: 'ember', label: 'The Driver' },
      // A tight face crop of the man on the pier.
      { source: photo(pier), crop: crop(1.5, 0.29, 0.18), tint: 'rose', label: 'The Angler' },
      // The chrome mirror and red paint of the car (mostly behind the title).
      { source: photo(boulevard), crop: crop(2.6, 0, 0.8), tint: 'ultraviolet' },
      // The lifeguard tower and the beach under the sun.
      { source: photo(boulevard), crop: crop(3, 0.18, 0.29), tint: 'flamingo', label: 'One Last Summer' },
      // The sea, the rod and the pier rail.
      { source: photo(pier), crop: crop(1.8, 1, 0.55), tint: 'lagoon', label: 'Low Tide' },
      // A palm row against the sunset sky (shown by six- and seven-panel layouts).
      { source: photo(boulevard), crop: crop(2, 1, 0.05), tint: 'flamingo' },
      { source: photo(pier), crop: crop(2.4, 0.9, 0.7), tint: 'ultraviolet' },
    ],
    text: {
      title: 'Neon Tide',
      subtitle: 'Salt Air Stories',
      tagline: 'Coming soon',
      badge: 'New',
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
