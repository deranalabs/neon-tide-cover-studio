// The cover's editable state: defaults, a normaliser for stored or partial state, and the preset it resolves to.
import { LAYOUT_IDS } from './layouts.js';
import { FRAMES, PRESETS, PRESET_IDS, TINTS } from '../grade/presets.js';
import { LETTER_STYLES } from '../text/letterStyles.js';
import { SCENES } from '../scenes/sceneCatalog.js';
import { defaultCrop } from '../photo/panelCrop.js';

/** Panel slots kept in state: the most any layout uses. */
export const PANEL_SLOTS = 7;

/** The grade knobs a person can override on top of a preset. */
export const GRADE_KEYS = ['mapMix', 'bloom', 'halftone', 'grain', 'vignette', 'flare'];

/** The cover post sizes the app exports. */
export const EXPORT_SIZES = [
  { id: 'landscape', label: '16:9', w: 1920, h: 1080 },
  { id: 'square', label: '1:1', w: 1080, h: 1080 },
  { id: 'portrait', label: '4:5', w: 1080, h: 1350 },
];

/** A fresh panel slot: no source yet (auto-fill decides), default crop, the preset's tint. */
export function emptyPanel() {
  return { source: null, crop: defaultCrop(), tint: null };
}

/** The state a new cover starts with. */
export function defaultState() {
  return {
    v: 1,
    aspect: 'landscape',
    layout: 'poster',
    preset: 'duskDrive',
    frame: null,
    grade: {},
    duotone: null,
    banner: true,
    stars: 4,
    seed: 7,
    panels: Array.from({ length: PANEL_SLOTS }, emptyPanel),
    text: {
      title: 'Neon Tide',
      subtitle: 'Salt Air Stories',
      tagline: 'Coming soon • Summer nights',
      badge: 'New',
      style: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      emblem: false,
      ribbon: true,
    },
  };
}

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const clampNumber = (value, lo, hi, fallback) => (Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback);

/** A panel source: { type: 'photo', id } or { type: 'scene', id } or null. */
function normaliseSource(source) {
  if (!source || typeof source !== 'object') return null;
  if (source.type === 'photo' && typeof source.id === 'string') return { type: 'photo', id: source.id };
  if (source.type === 'scene' && SCENES[source.id]) return { type: 'scene', id: source.id };
  return null;
}

/** Repairs any partial or stored state into a complete one, so old saves and bad input never break a render. */
export function normaliseState(raw) {
  const base = defaultState();
  const input = raw && typeof raw === 'object' ? raw : {};
  const text = { ...base.text, ...(input.text ?? {}) };
  const panels = Array.from({ length: PANEL_SLOTS }, (_, i) => {
    const panel = input.panels?.[i] ?? {};
    const crop = { ...defaultCrop(), ...(panel.crop ?? {}) };
    return {
      source: normaliseSource(panel.source),
      crop: {
        zoom: clampNumber(crop.zoom, 1, 5, 1),
        fx: clampNumber(crop.fx, 0, 1, 0.5),
        fy: clampNumber(crop.fy, 0, 1, 0.5),
        flip: Boolean(crop.flip),
      },
      tint: TINTS[panel.tint] ? panel.tint : null,
    };
  });
  const grade = {};
  for (const key of GRADE_KEYS) {
    if (Number.isFinite(input.grade?.[key])) grade[key] = clampNumber(input.grade[key], 0, 1.5, 0);
  }
  return {
    v: 1,
    aspect: pick(input.aspect, EXPORT_SIZES.map((s) => s.id), base.aspect),
    layout: pick(input.layout, LAYOUT_IDS, base.layout),
    preset: pick(input.preset, PRESET_IDS, base.preset),
    frame: FRAMES[input.frame] ? input.frame : null,
    grade,
    duotone: typeof input.duotone === 'boolean' ? input.duotone : null,
    banner: input.banner !== false,
    stars: Math.round(clampNumber(input.stars, 0, 5, base.stars)),
    seed: Math.round(clampNumber(input.seed, 1, 1e6, base.seed)),
    panels,
    text: {
      title: String(text.title ?? '').slice(0, 40),
      subtitle: String(text.subtitle ?? '').slice(0, 48),
      tagline: String(text.tagline ?? '').slice(0, 64),
      badge: String(text.badge ?? '').slice(0, 12),
      style: LETTER_STYLES[text.style] ? text.style : null,
      scale: clampNumber(text.scale, 0.4, 1.6, 1),
      offsetX: clampNumber(text.offsetX, -0.5, 0.5, 0),
      offsetY: clampNumber(text.offsetY, -0.6, 0.4, 0),
      emblem: Boolean(text.emblem),
      ribbon: text.ribbon !== false,
    },
  };
}

/** The preset with the person's overrides applied: what the renderer actually uses. */
export function resolvePreset(state) {
  const preset = PRESETS[state.preset] ?? PRESETS.duskDrive;
  const frameId = state.frame ?? preset.frame;
  return {
    ...preset,
    ...state.grade,
    id: state.preset,
    duotone: state.duotone ?? preset.duotone,
    frameId,
    frameLook: FRAMES[frameId] ?? FRAMES.ink,
    letterStyle: state.text.style ?? preset.letterStyle,
  };
}
