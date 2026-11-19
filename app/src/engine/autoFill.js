// Fills every panel slot from the photos given: photos cycle with fresh crops, painted scenes fill the gaps.
import { PANEL_SLOTS } from './coverState.js';
import { SCENE_IDS } from '../scenes/sceneCatalog.js';
import { cropVariant } from '../photo/panelCrop.js';

/** Which slots show a photo ('p') or a painted scene ('s') when there are fewer photos than slots. */
const PATTERN = ['p', 'p', 's', 'p', 's', 'p', 's'];

/**
 * Returns new panels for `photoIds` (in order). One photo fills several panels with different crops; with four
 * or more photos every slot shows a photo; with none every slot shows a scene.
 */
export function autoFillPanels(panels, photoIds) {
  const repeats = new Map();
  let photoTurn = 0;
  let sceneTurn = 0;
  const allPhotos = photoIds.length >= 4;
  return Array.from({ length: PANEL_SLOTS }, (_, slot) => {
    const old = panels[slot] ?? {};
    const wantsPhoto = photoIds.length > 0 && (allPhotos || PATTERN[slot] === 'p');
    if (!wantsPhoto) {
      const id = SCENE_IDS[sceneTurn % SCENE_IDS.length];
      sceneTurn += 1;
      return { source: { type: 'scene', id }, crop: cropVariant(0), tint: old.tint ?? null };
    }
    const id = photoIds[photoTurn % photoIds.length];
    photoTurn += 1;
    const seen = repeats.get(id) ?? 0;
    repeats.set(id, seen + 1);
    return { source: { type: 'photo', id }, crop: cropVariant(seen), tint: old.tint ?? null };
  });
}
