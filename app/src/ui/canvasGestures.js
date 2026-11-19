// Direct editing on the preview: drag pans a panel's photo, the wheel zooms it, Shift+drag swaps two panels,
// dragging the title moves the caption, double-click resets a crop, and dropped photos land in the panel under them.
import { defaultCrop, panCrop, zoomCrop } from '../photo/panelCrop.js';

/** Swaps the contents (source, crop, tint) of panels a and b in a state draft. */
export function swapPanels(draft, a, b) {
  const first = draft.panels[a];
  draft.panels[a] = draft.panels[b];
  draft.panels[b] = first;
}

/**
 * Wires the gestures. `app` gives { getState, photos, update(mutate, { commit }), commit, select, status,
 * placeFiles(files, panel), placePhoto(id, panel) }.
 */
export function bindCanvasGestures(preview, app) {
  const surface = preview.overlay;
  let drag = null;
  let wheelTimer = 0;

  const photoOf = (index) => {
    const source = app.getState().panels[index]?.source;
    return source?.type === 'photo' ? app.photos.get(source.id) ?? null : null;
  };

  surface.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const [x, y] = preview.toCover(event);
    const state = app.getState();
    if (!event.shiftKey && preview.captionAt(x, y)) {
      drag = { mode: 'caption', x, y, ox: state.text.offsetX, oy: state.text.offsetY };
    } else {
      const index = preview.panelAt(x, y);
      if (index < 0) return;
      app.select(index);
      const mode = event.shiftKey || event.altKey ? 'swap' : 'pan';
      if (mode === 'pan' && !photoOf(index)) app.status('Painted scene: choose a photo under "Shows" to crop it');
      drag = { mode, index, x, y };
    }
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('dragging');
  });

  surface.addEventListener('pointermove', (event) => {
    const [x, y] = preview.toCover(event);
    if (!drag) {
      const overCaption = preview.captionAt(x, y);
      preview.mark({ hover: overCaption ? -1 : preview.panelAt(x, y), caption: overCaption });
      surface.style.cursor = overCaption ? 'move' : 'grab';
      return;
    }
    if (drag.mode === 'caption') {
      const { width, height } = preview.canvas;
      app.update((draft) => {
        draft.text.offsetX = drag.ox + (x - drag.x) / width;
        draft.text.offsetY = drag.oy + (y - drag.y) / height;
      }, { commit: false });
    } else if (drag.mode === 'pan') {
      const photo = photoOf(drag.index);
      const bounds = preview.panelBounds(drag.index);
      if (photo && bounds) {
        const dx = x - drag.x;
        const dy = y - drag.y;
        app.update((draft) => {
          const panel = draft.panels[drag.index];
          panel.crop = panCrop(panel.crop, dx, dy, photo.width, photo.height, bounds.w, bounds.h);
        }, { commit: false });
      }
      drag.x = x;
      drag.y = y;
    } else if (drag.mode === 'swap') {
      const target = preview.panelAt(x, y);
      preview.mark({ swapTo: target === drag.index ? -1 : target });
    }
  });

  const finish = (event) => {
    if (!drag) return;
    if (drag.mode === 'swap') {
      const [x, y] = preview.toCover(event);
      const target = preview.panelAt(x, y);
      preview.mark({ swapTo: -1 });
      if (target >= 0 && target !== drag.index) {
        const from = drag.index;
        app.update((draft) => swapPanels(draft, from, target));
        app.select(target);
        app.status(`Swapped panels ${from + 1} and ${target + 1}`);
      }
    } else {
      app.commit();
    }
    drag = null;
    surface.classList.remove('dragging');
  };
  surface.addEventListener('pointerup', finish);
  surface.addEventListener('pointercancel', finish);
  surface.addEventListener('pointerleave', () => {
    if (!drag) preview.mark({ hover: -1, caption: false });
  });

  surface.addEventListener('wheel', (event) => {
    const [x, y] = preview.toCover(event);
    const index = preview.panelAt(x, y);
    const photo = index >= 0 ? photoOf(index) : null;
    const bounds = index >= 0 ? preview.panelBounds(index) : null;
    if (!photo || !bounds) return;
    event.preventDefault();
    app.select(index);
    const factor = Math.exp(-event.deltaY * 0.0015);
    const px = (x - bounds.x) / bounds.w;
    const py = (y - bounds.y) / bounds.h;
    app.update((draft) => {
      const panel = draft.panels[index];
      panel.crop = zoomCrop(panel.crop, factor, px, py, photo.width, photo.height, bounds.w, bounds.h);
    }, { commit: false });
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => app.commit(), 350);
  }, { passive: false });

  surface.addEventListener('dblclick', (event) => {
    const [x, y] = preview.toCover(event);
    const index = preview.panelAt(x, y);
    if (index < 0) return;
    app.update((draft) => {
      draft.panels[index].crop = defaultCrop();
    });
    app.status(`Panel ${index + 1} crop reset`);
  });

  surface.addEventListener('dragover', (event) => {
    event.preventDefault();
    const [x, y] = preview.toCover(event);
    preview.mark({ swapTo: preview.panelAt(x, y) });
  });
  surface.addEventListener('dragleave', () => preview.mark({ swapTo: -1 }));
  surface.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove('dragging');
    preview.mark({ swapTo: -1 });
    const [x, y] = preview.toCover(event);
    const index = preview.panelAt(x, y);
    const photoId = event.dataTransfer.getData('text/x-photo-id');
    if (photoId) app.placePhoto(photoId, index);
    else if (event.dataTransfer.files.length) app.placeFiles([...event.dataTransfer.files], index);
  });
}
