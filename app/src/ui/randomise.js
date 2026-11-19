// The Shuffle button: a fresh layout, preset, letter style, tints and crops, keeping the person's photos and words.
import { autoFillPanels } from '../engine/autoFill.js';
import { LAYOUT_IDS } from '../engine/layouts.js';
import { PRESET_IDS, TINT_IDS } from '../grade/presets.js';
import { seededRandom } from '../grade/effects.js';
import { LETTER_STYLE_IDS } from '../text/letterStyles.js';
import { SCENE_IDS } from '../scenes/sceneCatalog.js';

const choose = (random, list) => list[Math.floor(random() * list.length)];

/** Returns a shuffled copy of `state` using `seed`; photos in `photoIds` stay in the panels. */
export function shuffleCover(state, photoIds, seed) {
  const random = seededRandom(seed);
  const panels = autoFillPanels(state.panels, photoIds).map((panel) => {
    const crop = {
      zoom: 1 + random() * 1.4,
      fx: 0.3 + random() * 0.4,
      fy: 0.2 + random() * 0.4,
      flip: random() < 0.25,
    };
    const source = panel.source.type === 'scene' ? { type: 'scene', id: choose(random, SCENE_IDS) } : panel.source;
    return { source, crop, tint: random() < 0.6 ? choose(random, TINT_IDS) : null };
  });
  const preset = choose(random, PRESET_IDS);
  return {
    ...state,
    layout: choose(random, LAYOUT_IDS),
    preset,
    frame: null,
    grade: {},
    duotone: null,
    seed: 1 + Math.floor(random() * 9999),
    stars: 2 + Math.floor(random() * 4),
    panels,
    text: { ...state.text, style: random() < 0.5 ? null : choose(random, LETTER_STYLE_IDS), offsetX: 0, offsetY: 0 },
  };
}
