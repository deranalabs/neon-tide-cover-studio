// The Caption section: title, subtitle, tagline and badge text, letter style, size, stars and the banner, ribbon
// and emblem switches.
import { resolvePreset } from '../engine/coverState.js';
import { LETTER_STYLES } from '../text/letterStyles.js';

const TEXT_FIELDS = ['title', 'subtitle', 'tagline', 'badge'];

/** Wires the Caption section; `app` gives { update, commit }. Returns sync(state). */
export function bindCaptionControls(app) {
  const fields = Object.fromEntries(TEXT_FIELDS.map((id) => [id, document.getElementById(id)]));
  const style = document.getElementById('letterStyle');
  const scale = document.getElementById('textScale');
  const stars = document.getElementById('stars');
  const banner = document.getElementById('banner');
  const ribbon = document.getElementById('ribbon');
  const emblem = document.getElementById('emblem');
  let typingTimer = 0;

  for (const [key, input] of Object.entries(fields)) {
    input.addEventListener('input', () => {
      app.update((draft) => {
        draft.text[key] = input.value;
      }, { commit: false });
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => app.commit(), 600);
    });
  }
  style.append(new Option('Preset letters', ''));
  for (const [id, entry] of Object.entries(LETTER_STYLES)) style.append(new Option(entry.label, id));
  style.addEventListener('change', () => app.update((draft) => {
    draft.text.style = style.value || null;
  }));
  scale.addEventListener('input', () => app.update((draft) => {
    draft.text.scale = Number(scale.value);
  }, { commit: false }));
  scale.addEventListener('change', () => app.commit());
  stars.addEventListener('input', () => app.update((draft) => {
    draft.stars = Number(stars.value);
  }, { commit: false }));
  stars.addEventListener('change', () => app.commit());
  banner.addEventListener('change', () => app.update((draft) => {
    draft.banner = banner.checked;
  }));
  ribbon.addEventListener('change', () => app.update((draft) => {
    draft.text.ribbon = ribbon.checked;
  }));
  emblem.addEventListener('change', () => app.update((draft) => {
    draft.text.emblem = emblem.checked;
  }));
  document.getElementById('centreText').addEventListener('click', () => app.update((draft) => {
    draft.text.offsetX = 0;
    draft.text.offsetY = 0;
    draft.text.scale = 1;
  }));

  return function sync(state) {
    for (const [key, input] of Object.entries(fields)) {
      if (document.activeElement !== input) input.value = state.text[key];
    }
    style.value = state.text.style ?? '';
    style.title = `Now: ${LETTER_STYLES[resolvePreset(state).letterStyle]?.label ?? ''}`;
    scale.value = String(state.text.scale);
    stars.value = String(state.stars);
    banner.checked = state.banner;
    ribbon.checked = state.text.ribbon;
    emblem.checked = state.text.emblem;
  };
}
