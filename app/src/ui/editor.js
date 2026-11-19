// The editor: owns the cover state, the loaded photos, undo history and saved settings, and wires the preview,
// gestures, controls, shortcuts and export together. Every change goes through update() and one render path.
import { autoFillPanels } from '../engine/autoFill.js';
import { defaultState, EXPORT_SIZES, normaliseState } from '../engine/coverState.js';
import { LAYOUT_IDS, layoutPanelCount } from '../engine/layouts.js';
import { PRESET_IDS } from '../grade/presets.js';
import { SCENE_IDS } from '../scenes/sceneCatalog.js';
import { defaultCrop } from '../photo/panelCrop.js';
import { loadPhoto, loadPhotoFromUrl } from '../photo/photoLoader.js';
import { bindCanvasGestures } from './canvasGestures.js';
import { bindCaptionControls } from './captionControls.js';
import { CoverPreview } from './coverPreview.js';
import { exportSize } from './exportCover.js';
import { bindGradeControls } from './gradeControls.js';
import { EditHistory } from './history.js';
import { bindPanelInspector } from './panelInspector.js';
import { bindPhotoTray } from './photoTray.js';
import { shuffleCover } from './randomise.js';
import { loadSettings, saveSettings } from './settingsStore.js';
import { installShotHooks, shotState } from './shotScenes.js';
import { bindShortcuts } from './shortcuts.js';
import { bindTopBar } from './topBar.js';

export const SAMPLE_URLS = ['samples/boulevard.jpg', 'samples/pier.jpg'];

/** Starts the editor; `shot` is the ?shot= scene name or null for normal use. */
export async function startEditor(query) {
  const shot = query.get('shot');
  const photos = new Map();
  const order = [];
  const history = new EditHistory();
  const statusEl = document.getElementById('status');
  const preview = new CoverPreview(
    document.getElementById('preview'),
    document.getElementById('overlay'),
    document.getElementById('stage'),
  );
  let state = defaultState();
  let selected = 0;
  let frame = 0;
  let shuffleSeed = Date.now() % 100000;

  const status = (text, busy = false) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('busy', busy);
  };
  const photoList = () => order.map((id) => photos.get(id));
  const panelCount = () => layoutPanelCount(state.layout);

  const app = {
    getState: () => state,
    photos,
    photoList,
    status,
    panelCount,
    selected: () => selected,
    panelBounds: (index) => preview.panelBounds(index),
  };

  const syncers = [];
  const syncAll = () => syncers.forEach((sync) => sync(state, history));
  const requestRender = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      preview.render(state, photos);
    });
  };
  const commit = () => {
    if (history.push(state) && !shot) saveSettings(state);
    syncAll();
  };
  /** Applies `mutate` to a copy of the state, repairs it, re-renders, and records an undo step unless told not. */
  const update = (mutate, { commit: record = true } = {}) => {
    const draft = structuredClone(state);
    mutate(draft);
    state = normaliseState(draft);
    selected = Math.min(selected, panelCount() - 1);
    requestRender();
    if (record) commit();
    else syncAll();
  };
  const select = (index) => {
    selected = Math.max(0, Math.min(panelCount() - 1, index));
    preview.mark({ selected });
    syncAll();
  };
  const restore = (snapshot) => {
    if (!snapshot) return;
    state = normaliseState(snapshot);
    selected = Math.min(selected, panelCount() - 1);
    if (!shot) saveSettings(state);
    requestRender();
    syncAll();
  };

  const addPhotoRecord = (photo, sample = false) => {
    photo.sample = sample;
    photos.set(photo.id, photo);
    order.push(photo.id);
  };
  /** Loads files; one file dropped on a panel goes there, otherwise every panel is refilled. */
  const addFiles = async (files, panelIndex = -1) => {
    const isImage = (file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
    const images = files.filter(isImage);
    if (!images.length) {
      status('Those files are not images');
      return;
    }
    status(`Loading ${images.length} photo${images.length > 1 ? 's' : ''}…`, true);
    if (order.every((id) => photos.get(id).sample)) {
      order.splice(0).forEach((id) => photos.delete(id));
    }
    const loaded = [];
    for (const file of images) {
      try {
        const photo = await loadPhoto(file, file.name);
        addPhotoRecord(photo);
        loaded.push(photo.id);
      } catch (error) {
        status(`Could not read ${file.name}: ${error.message}`);
      }
    }
    if (!loaded.length) return;
    if (panelIndex >= 0 && loaded.length === 1) {
      update((draft) => {
        draft.panels[panelIndex] = { ...draft.panels[panelIndex], source: { type: 'photo', id: loaded[0] },
          crop: defaultCrop() };
      });
      select(panelIndex);
    } else {
      update((draft) => {
        draft.panels = autoFillPanels(draft.panels, order);
      });
    }
    status(`Loaded ${loaded.length} photo${loaded.length > 1 ? 's' : ''}. Drag to crop, then press E to export.`);
  };
  const placePhoto = (id, index) => {
    if (index < 0 || !photos.has(id)) return;
    update((draft) => {
      draft.panels[index].source = { type: 'photo', id };
      draft.panels[index].crop = defaultCrop();
    });
    select(index);
    status(`Photo placed in panel ${index + 1}`);
  };
  const removePhoto = (id) => {
    photos.delete(id);
    order.splice(order.indexOf(id), 1);
    update((draft) => {
      draft.panels.forEach((panel, i) => {
        if (panel.source?.type === 'photo' && panel.source.id === id) {
          panel.source = { type: 'scene', id: SCENE_IDS[i % SCENE_IDS.length] };
        }
      });
    });
  };
  const runExport = async (sizeIds) => {
    try {
      const names = [];
      for (const id of sizeIds) {
        status(`Rendering ${id} PNG…`, true);
        names.push(await exportSize(state, photos, id));
      }
      status(`Saved ${names.join(', ')}`);
    } catch (error) {
      status(`Export failed: ${error.message}`);
    }
  };

  Object.assign(app, {
    update,
    commit,
    select,
    addFiles,
    placePhoto,
    removePhoto,
    placeFiles: addFiles,
    autoFill: () => {
      update((draft) => {
        draft.panels = autoFillPanels(draft.panels, order);
      });
      status(order.length ? 'Panels refilled from your photos' : 'Panels filled with painted scenes');
    },
    setAspect: (aspect) => update((draft) => {
      draft.aspect = aspect;
    }),
    undo: () => restore(history.undo()),
    redo: () => restore(history.redo()),
    shuffle: () => {
      shuffleSeed += 1;
      update((draft) => Object.assign(draft, shuffleCover(draft, order, shuffleSeed)));
      status('Shuffled: R again for another, Ctrl+Z to go back');
    },
    exportCurrent: () => runExport([state.aspect]),
    exportAll: () => runExport(EXPORT_SIZES.map((size) => size.id)),
    stepLayout: (step) => update((draft) => {
      const i = LAYOUT_IDS.indexOf(draft.layout);
      draft.layout = LAYOUT_IDS[(i + step + LAYOUT_IDS.length) % LAYOUT_IDS.length];
    }),
    stepPreset: (step) => update((draft) => {
      const i = PRESET_IDS.indexOf(draft.preset);
      draft.preset = PRESET_IDS[(i + step + PRESET_IDS.length) % PRESET_IDS.length];
      draft.grade = {};
      draft.frame = null;
      draft.duotone = null;
    }),
    flipSelected: () => update((draft) => {
      draft.panels[selected].crop.flip = !draft.panels[selected].crop.flip;
    }),
    resetSelected: () => update((draft) => {
      draft.panels[selected].crop = defaultCrop();
    }),
    stepPanel: (step) => select((selected + step + panelCount()) % panelCount()),
  });

  syncers.push(
    bindTopBar(app),
    (current) => renderTray(photoList(), current),
    bindPanelInspector(app),
    bindGradeControls(app),
    bindCaptionControls(app),
  );
  const renderTray = bindPhotoTray(app);
  bindCanvasGestures(preview, app);
  bindShortcuts(app);

  const samples = await Promise.all(SAMPLE_URLS.map((url) => loadPhotoFromUrl(url)));
  samples.forEach((photo) => addPhotoRecord(photo, true));
  if (shot) {
    state = shotState(samples[0].id, samples[1].id);
    state.aspect = EXPORT_SIZES.some((size) => size.id === query.get('aspect')) ? query.get('aspect') : 'landscape';
    installShotHooks(() => state, photos);
  } else {
    const saved = loadSettings();
    state = normaliseState(saved ?? shotState(samples[0].id, samples[1].id));
    if (saved) state.panels = autoFillPanels(state.panels, order);
    status('Sample photos loaded. Drop your own photos to replace them, then press E to export.');
  }
  history.push(state);
  window.__coverEditor = {
    state: () => structuredClone(state),
    photos: () => photoList().map(({ id, name, width, height }) => ({ id, name, width, height })),
    photoImage: (id) => photos.get(id)?.image ?? null,
    geometry: () => preview.last?.geometry,
    selected: () => selected,
  };
  preview.render(state, photos);
  preview.mark({ selected, numbers: shot === 'editor' });
  syncAll();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
