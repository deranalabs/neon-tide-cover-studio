// The Layout picker (thumbnail of every layout for the current aspect) and the selected panel's controls:
// what it shows (any photo or painted scene), zoom, tint, flip, reset and swap.
import { LAYOUTS, layoutPanels } from '../engine/layouts.js';
import { EXPORT_SIZES } from '../engine/coverState.js';
import { tracePolygon } from '../engine/panelGeometry.js';
import { TINTS } from '../grade/presets.js';
import { SCENES } from '../scenes/sceneCatalog.js';
import { defaultCrop, zoomCrop } from '../photo/panelCrop.js';
import { swapPanels } from './canvasGestures.js';

/** Draws a layout's panels as a small icon on `canvas` for an aspect. */
function drawLayoutIcon(canvas, layoutId, aspect) {
  const size = EXPORT_SIZES.find((entry) => entry.id === aspect);
  const w = 64;
  const h = Math.round((w * size.h) / size.w);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ecdcc4';
  ctx.fillRect(0, 0, w, h);
  const colours = ['#ff4fa3', '#ff9a4a', '#38e0ff', '#a85cff', '#ffd257', '#ff6a5e', '#38c9bd'];
  layoutPanels(layoutId, aspect).forEach((polygon, i) => {
    ctx.beginPath();
    tracePolygon(ctx, polygon.map(([x, y]) => [2 + x * (w - 4), 2 + y * (h - 4)]));
    ctx.fillStyle = colours[i % colours.length];
    ctx.fill();
    ctx.strokeStyle = '#ecdcc4';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });
}

/**
 * Wires the Layout and Panel sections. `app` gives { getState, photos, photoList, update, commit, selected,
 * select, status }. Returns sync(state) which refreshes the controls.
 */
export function bindPanelInspector(app) {
  const grid = document.getElementById('layoutGrid');
  const source = document.getElementById('panelSource');
  const zoom = document.getElementById('panelZoom');
  const tint = document.getElementById('panelTint');
  const label = document.getElementById('panelLabel');
  const kind = document.getElementById('panelKind');
  let iconAspect = null;

  const buttons = LAYOUTS.map((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    button.title = `${layout.label} layout`;
    const icon = document.createElement('canvas');
    const name = document.createElement('span');
    name.textContent = layout.label;
    button.append(icon, name);
    button.addEventListener('click', () => {
      app.update((draft) => {
        draft.layout = layout.id;
        draft.text.offsetX = 0;
        draft.text.offsetY = 0;
      });
      app.status(`Layout: ${layout.label}`);
    });
    grid.append(button);
    return button;
  });

  tint.append(new Option('Preset cycle', ''));
  for (const [id, entry] of Object.entries(TINTS)) tint.append(new Option(entry.label, id));

  source.addEventListener('change', () => {
    const [type, id] = source.value.split(':');
    const index = app.selected();
    app.update((draft) => {
      draft.panels[index].source = { type, id };
      draft.panels[index].crop = defaultCrop();
    });
  });
  zoom.addEventListener('input', () => {
    const index = app.selected();
    const panel = app.getState().panels[index];
    const photo = panel.source?.type === 'photo' ? app.photos.get(panel.source.id) : null;
    const bounds = app.panelBounds(index);
    if (!photo || !bounds) return;
    const factor = Number(zoom.value) / panel.crop.zoom;
    app.update((draft) => {
      const target = draft.panels[index];
      target.crop = zoomCrop(target.crop, factor, 0.5, 0.5, photo.width, photo.height, bounds.w, bounds.h);
    }, { commit: false });
  });
  zoom.addEventListener('change', () => app.commit());
  tint.addEventListener('change', () => {
    const index = app.selected();
    app.update((draft) => {
      draft.panels[index].tint = tint.value || null;
    });
  });
  document.getElementById('panelFlip').addEventListener('click', () => app.flipSelected());
  document.getElementById('panelReset').addEventListener('click', () => app.resetSelected());
  document.getElementById('panelSwap').addEventListener('click', () => {
    const index = app.selected();
    const count = app.panelCount();
    const next = (index + 1) % count;
    if (next === index) return;
    app.update((draft) => swapPanels(draft, index, next));
    app.select(next);
    app.status(`Swapped panels ${index + 1} and ${next + 1}`);
  });

  return function sync(state) {
    if (iconAspect !== state.aspect) {
      iconAspect = state.aspect;
      buttons.forEach((button) => drawLayoutIcon(button.querySelector('canvas'), button.dataset.layout, state.aspect));
    }
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layout === state.layout)));
    const index = app.selected();
    const panel = state.panels[index];
    label.textContent = String(index + 1);
    const options = [
      ...app.photoList().map((photo, i) => new Option(`Photo ${i + 1} · ${photo.name}`, `photo:${photo.id}`)),
      ...Object.entries(SCENES).map(([id, scene]) => new Option(`Scene · ${scene.label}`, `scene:${id}`)),
    ];
    source.replaceChildren(...options);
    source.value = panel.source ? `${panel.source.type}:${panel.source.id}` : '';
    const isPhoto = panel.source?.type === 'photo' && app.photos.has(panel.source.id);
    kind.textContent = isPhoto ? 'photo' : 'painted scene';
    zoom.disabled = !isPhoto;
    zoom.value = String(panel.crop.zoom);
    tint.value = panel.tint ?? '';
  };
}
