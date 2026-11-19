// The painted filler scenes a panel can show instead of a photo, by id, in the order auto-fill uses them.
import { paintHalftoneBurst } from './halftoneBurst.js';
import { paintHarbourDusk } from './harbourDusk.js';
import { paintNeonGrid } from './neonGrid.js';
import { paintSkylineDusk } from './skylineDusk.js';
import { paintSunsetCruiser } from './sunsetCruiser.js';

export const SCENES = {
  skyline: { label: 'Skyline at dusk', paint: paintSkylineDusk },
  cruiser: { label: 'Coast road coupe', paint: paintSunsetCruiser },
  neonGrid: { label: 'Neon grid', paint: paintNeonGrid },
  harbour: { label: 'Harbour at dusk', paint: paintHarbourDusk },
  burst: { label: 'Halftone burst', paint: paintHalftoneBurst },
};

export const SCENE_IDS = Object.keys(SCENES);

/** Paints scene `id` (falling back to the skyline) into a w x h context. */
export function paintScene(ctx, id, w, h, preset, seed) {
  (SCENES[id] ?? SCENES.skyline).paint(ctx, w, h, preset, seed);
}
