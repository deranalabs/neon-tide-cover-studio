// The Grade section: preset swatches, frame look, duotone, and sliders that override the preset's passes.
import { resolvePreset } from '../engine/coverState.js';
import { FRAMES, PRESETS } from '../grade/presets.js';

const SLIDERS = [
  ['mapMix', 'Colour map', 1],
  ['bloom', 'Glow', 1.2],
  ['halftone', 'Halftone', 0.6],
  ['grain', 'Grain', 0.25],
  ['vignette', 'Vignette', 1],
  ['flare', 'Flare', 1.2],
];

/** Wires the Grade section; `app` gives { update, commit, status }. Returns sync(state). */
export function bindGradeControls(app) {
  const grid = document.getElementById('presetGrid');
  const frame = document.getElementById('frameSelect');
  const duotone = document.getElementById('duotone');
  const sliderBox = document.getElementById('gradeSliders');

  const presetButtons = Object.entries(PRESETS).map(([id, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.preset = id;
    button.title = `${preset.label} grade (P cycles)`;
    const swatch = document.createElement('i');
    swatch.style.background = `linear-gradient(90deg, ${preset.swatch.join(', ')})`;
    const name = document.createElement('span');
    name.textContent = preset.label;
    button.append(swatch, name);
    button.addEventListener('click', () => {
      app.update((draft) => {
        draft.preset = id;
        draft.grade = {};
        draft.frame = null;
        draft.duotone = null;
        draft.text.style = null;
      });
      app.status(`Grade: ${preset.label}`);
    });
    grid.append(button);
    return button;
  });

  frame.append(new Option('Preset frame', ''));
  for (const [id, entry] of Object.entries(FRAMES)) frame.append(new Option(entry.label, id));
  frame.addEventListener('change', () => app.update((draft) => {
    draft.frame = frame.value || null;
  }));
  duotone.addEventListener('change', () => app.update((draft) => {
    draft.duotone = duotone.checked;
  }));

  const inputs = SLIDERS.map(([key, text, max]) => {
    const label = document.createElement('label');
    label.className = 'range';
    const name = document.createElement('span');
    name.textContent = text;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.step = '0.01';
    input.addEventListener('input', () => app.update((draft) => {
      draft.grade[key] = Number(input.value);
    }, { commit: false }));
    input.addEventListener('change', () => app.commit());
    label.append(name, input);
    sliderBox.append(label);
    return [key, input];
  });

  return function sync(state) {
    const resolved = resolvePreset(state);
    presetButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.preset === state.preset)));
    frame.value = state.frame ?? '';
    duotone.checked = resolved.duotone;
    for (const [key, input] of inputs) input.value = String(resolved[key]);
  };
}
