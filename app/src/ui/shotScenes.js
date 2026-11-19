// Fixed scenes for the screenshot harness (?shot=...): the two sample photos placed and cropped by hand, a fixed
// caption and grade. window.__exportCover(w, h) returns the PNG the app's own export writes, as a data URL.
import { normaliseState } from '../engine/coverState.js';
import { renderCoverPng } from './exportCover.js';

const photo = (id) => ({ type: 'photo', id });
const scene = (id) => ({ type: 'scene', id });
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
      { source: photo(boulevard), crop: crop(1, 0.55, 0.3), tint: 'flamingo' },
      { source: photo(pier), crop: crop(1.22, 0.45, 0.3), tint: 'lagoon' },
      { source: scene('neonGrid'), crop: crop(1, 0.5, 0.5) },
      { source: photo(boulevard), crop: crop(2.6, 0.58, 0.2), tint: 'ultraviolet' },
      { source: scene('cruiser'), crop: crop(1, 0.5, 0.5) },
      { source: scene('skyline'), crop: crop(1, 0.5, 0.5) },
      { source: photo(pier), crop: crop(2, 0.8, 0.6), tint: 'ultraviolet' },
    ],
    text: {
      title: 'Neon Tide',
      subtitle: 'Salt Air Stories',
      tagline: 'Coming soon • Summer nights',
      badge: 'New',
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
