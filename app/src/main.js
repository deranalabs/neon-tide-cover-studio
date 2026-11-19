// Temporary entry while the cover art is tuned: loads the samples and installs the export hook.
import { loadPhotoFromUrl } from './photo/photoLoader.js';
import { installShotHooks, shotState } from './ui/shotScenes.js';

const photos = new Map();
const boulevard = await loadPhotoFromUrl('samples/boulevard.jpg');
const pier = await loadPhotoFromUrl('samples/pier.jpg');
photos.set(boulevard.id, boulevard);
photos.set(pier.id, pier);
const state = shotState(boulevard.id, pier.id);
installShotHooks(() => state, photos);
window.__shotReady = true;
