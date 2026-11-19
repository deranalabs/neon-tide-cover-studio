// The lettering styles: each is a recipe of face gradient, outline, rim, extrusion, glow and gloss for paintLettering.

export const LETTER_STYLES = {
  sunset: {
    label: 'Sunset Block',
    face: [[0, '#fff7c2'], [0.3, '#ffd257'], [0.56, '#ff8a3c'], [0.8, '#ff3d7f'], [1, '#d4127a']],
    outline: { color: '#1a0424', width: 0.95 },
    rim: { color: '#fff3f8', width: 0.42 },
    extrude: { depth: 2.6, dx: 0.35, dy: 0.94, near: '#7d1460', far: '#1a0424', edgeLine: '#0d0214' },
    glow: { color: 'rgba(255, 70, 150, 0.55)', blur: 4.5, passes: 1 },
    shine: 0.8,
    underShade: 0.25,
  },
  neon: {
    label: 'Neon Tube',
    face: [[0, '#ffffff'], [0.5, '#ffe3fb'], [1, '#ff9be8']],
    outline: { color: '#ff2bd6', width: 0.6 },
    rim: { color: '#2a0638', width: 0.25 },
    extrude: { depth: 1.2, dx: 0.4, dy: 0.9, near: '#3a0a5c', far: '#12031f' },
    glow: { color: 'rgba(255, 43, 214, 0.95)', blur: 5, passes: 3, spread: 0.4 },
    shine: 0.25,
    underShade: 0.1,
  },
  ink: {
    label: 'Poster Ink',
    face: [[0, '#ffffff'], [0.7, '#fff7ea'], [1, '#ffd9c2']],
    outline: { color: '#0b0710', width: 1.0 },
    rim: null,
    extrude: { depth: 2.2, dx: 0.7, dy: 0.7, near: '#0b0710', far: '#0b0710' },
    glow: null,
    shine: 0.35,
    underShade: 0.15,
  },
  chrome: {
    label: 'Chrome Teal',
    face: [[0, '#f6fffd'], [0.45, '#8ff3ea'], [0.5, '#1b8a9e'], [0.75, '#59e0d6'], [1, '#e8fffb']],
    outline: { color: '#06131f', width: 0.9 },
    rim: { color: '#ffffff', width: 0.32 },
    extrude: { depth: 2.4, dx: 0.3, dy: 0.95, near: '#0e4a63', far: '#040b14', edgeLine: '#02060c' },
    glow: { color: 'rgba(60, 230, 255, 0.45)', blur: 4, passes: 1 },
    shine: 0.5,
    underShade: 0.2,
  },
  gold: {
    label: 'Gold Rush',
    face: [[0, '#fffbe0'], [0.35, '#ffd86b'], [0.52, '#c47a12'], [0.7, '#ffcf55'], [1, '#fff0b8']],
    outline: { color: '#2a1202', width: 0.9 },
    rim: { color: '#fff6d8', width: 0.3 },
    extrude: { depth: 2.4, dx: 0.4, dy: 0.92, near: '#7a3a08', far: '#1e0a02', edgeLine: '#0f0501' },
    glow: { color: 'rgba(255, 170, 60, 0.4)', blur: 4, passes: 1 },
    shine: 0.6,
    underShade: 0.2,
  },
};

/** Lighter recipes for the small lines (subtitle on its ribbon, tagline) that pair with any title style. */
export const SMALL_STYLES = {
  ribbonText: {
    face: [[0, '#ffffff'], [1, '#ffe8f2']],
    outline: { color: '#1a0424', width: 0.7 },
    rim: null,
    extrude: { depth: 0.9, dx: 0.5, dy: 0.85, near: '#1a0424', far: '#1a0424' },
    glow: null,
    shine: 0,
    underShade: 0.12,
  },
  tagline: {
    face: [[0, '#ffffff'], [1, '#fff1d6']],
    outline: { color: '#14031c', width: 0.75 },
    rim: null,
    extrude: { depth: 0.8, dx: 0.4, dy: 0.9, near: '#14031c', far: '#14031c' },
    glow: { color: 'rgba(20, 3, 28, 0.7)', blur: 2.5, passes: 1 },
    shine: 0,
    underShade: 0.1,
  },
  badgeText: {
    face: [[0, '#2a0418'], [1, '#5a0a2c']],
    outline: null,
    rim: null,
    extrude: null,
    glow: null,
    shine: 0,
    underShade: 0,
  },
};

export const LETTER_STYLE_IDS = Object.keys(LETTER_STYLES);
