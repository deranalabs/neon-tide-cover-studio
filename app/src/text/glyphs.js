// Centre-line polylines for the cover's chamfered display alphabet (capitals, digits, punctuation).
// Glyphs sit on a 10-unit grid (y = 0 top, 10 baseline); `w` is centre-line width, `s` lists "x,y" strokes
// where a trailing "z" closes the path. The lettering module strokes these with a thick pen, and this file
// also exports text normalisation and a glyph lookup that falls back to a space.

export const GLYPH_HEIGHT = 10;

const RAW_GLYPHS = {
  A: { w: 5, s: ['0,10 0,2 2,0 3,0 5,2 5,10', '0,5.6 5,5.6'] },
  B: { w: 5, s: ['0,5 3.6,5 5,6.4 5,8.6 3.6,10 0,10 0,0 3.3,0 4.6,1.3 4.6,3.7 3.3,5'] },
  C: { w: 5, s: ['5,2 5,0 1.6,0 0,1.6 0,8.4 1.6,10 5,10 5,8'] },
  D: { w: 5, s: ['0,0 3.2,0 5,1.8 5,8.2 3.2,10 0,10 z'] },
  E: { w: 4.6, s: ['4.6,0 0,0 0,10 4.6,10', '0,5 3.8,5'] },
  F: { w: 4.6, s: ['4.6,0 0,0 0,10', '0,5 3.8,5'] },
  G: { w: 5, s: ['5,1.8 5,0 1.6,0 0,1.6 0,8.4 1.6,10 5,10 5,5.2 2.6,5.2'] },
  H: { w: 5, s: ['0,0 0,10', '5,0 5,10', '0,5 5,5'] },
  I: { w: 0, s: ['0,0 0,10'] },
  J: { w: 4.6, s: ['4.6,0 4.6,8.4 3,10 1.6,10 0,8.4 0,6.8'] },
  K: { w: 5, s: ['0,0 0,10', '5,0 5,1 1.4,5 5,9 5,10'] },
  L: { w: 4.4, s: ['0,0 0,10 4.4,10'] },
  M: { w: 6.4, s: ['0,10 0,0 3.2,4.6 6.4,0 6.4,10'] },
  N: { w: 5.2, s: ['0,10 0,0 5.2,10 5.2,0'] },
  O: { w: 5, s: ['1.6,0 3.4,0 5,1.6 5,8.4 3.4,10 1.6,10 0,8.4 0,1.6 z'] },
  P: { w: 5, s: ['0,10 0,0 3.6,0 5,1.4 5,4.2 3.6,5.6 0,5.6'] },
  Q: { w: 5, s: ['1.6,0 3.4,0 5,1.6 5,8.4 3.4,10 1.6,10 0,8.4 0,1.6 z', '2.8,7.4 5.6,10.6'] },
  R: { w: 5, s: ['0,10 0,0 3.6,0 5,1.4 5,4.2 3.6,5.6 0,5.6', '3.2,5.6 5,7.4 5,10'] },
  S: { w: 5, s: ['5,0 1.6,0 0,1.6 0,3.4 1.6,5 3.4,5 5,6.6 5,8.4 3.4,10 0,10'] },
  T: { w: 5.4, s: ['0,0 5.4,0', '2.7,0 2.7,10'] },
  U: { w: 5, s: ['0,0 0,8.4 1.6,10 3.4,10 5,8.4 5,0'] },
  V: { w: 5.4, s: ['0,0 0,5.6 2.7,10 5.4,5.6 5.4,0'] },
  W: { w: 6.6, s: ['0,0 0,10 3.3,5.8 6.6,10 6.6,0'] },
  X: { w: 5.2, s: ['0,0 0,1.6 5.2,8.4 5.2,10', '5.2,0 5.2,1.6 0,8.4 0,10'] },
  Y: { w: 5.4, s: ['0,0 0,2.8 2.7,5.4 5.4,2.8 5.4,0', '2.7,5.4 2.7,10'] },
  Z: { w: 5, s: ['0,0 5,0 5,1.8 0,8.2 0,10 5,10'] },
  0: { w: 5, s: ['1.6,0 3.4,0 5,1.6 5,8.4 3.4,10 1.6,10 0,8.4 0,1.6 z', '1.2,7.2 3.8,2.8'] },
  1: { w: 2.2, s: ['0,2 2.2,0 2.2,10'] },
  2: { w: 5, s: ['0,0 3.4,0 5,1.6 5,3.4 3.4,5 1.6,5 0,6.6 0,10 5,10'] },
  3: { w: 5, s: ['0,0 3.4,0 5,1.6 5,8.4 3.4,10 0,10', '1.6,5 5,5'] },
  4: { w: 5.4, s: ['0,0 0,6.4 5.4,6.4', '4,3 4,10'] },
  5: { w: 5, s: ['5,0 0,0 0,4.6 3.4,4.6 5,6.2 5,8.4 3.4,10 0,10'] },
  6: { w: 5, s: ['4.8,0 1.6,0 0,1.6 0,8.4 1.6,10 3.4,10 5,8.4 5,6.4 3.4,4.8 0,4.8'] },
  7: { w: 5, s: ['0,0 5,0 5,2.6 2.4,10'] },
  8: {
    w: 5,
    s: ['1.6,5 0,3.4 0,1.6 1.6,0 3.4,0 5,1.6 5,3.4 3.4,5 z', '1.6,5 3.4,5 5,6.6 5,8.4 3.4,10 1.6,10 0,8.4 0,6.6 z'],
  },
  9: { w: 5, s: ['0.2,10 3.4,10 5,8.4 5,1.6 3.4,0 1.6,0 0,1.6 0,3.6 1.6,5.2 5,5.2'] },
  ' ': { w: 1.6, s: [] },
  '.': { w: 0, s: ['0,9 0,10'] },
  '•': { w: 0.4, s: ['0,4.5 0.4,4.5 0.4,5.5 0,5.5 z'] },
  ',': { w: 0.6, s: ['0.6,9 0.6,10 -0.4,11.6'] },
  '!': { w: 0, s: ['0,0 0,6.2', '0,9 0,10'] },
  '?': { w: 5, s: ['0,1.6 1.6,0 3.4,0 5,1.6 5,3.2 2.5,5 2.5,6.4', '2.5,9 2.5,10'] },
  '-': { w: 3, s: ['0,5.4 3,5.4'] },
  '+': { w: 4.6, s: ['0,5.2 4.6,5.2', '2.3,2.9 2.3,7.5'] },
  "'": { w: 0, s: ['0,0 0,3'] },
  '"': { w: 2.6, s: ['0,0 0,3', '2.6,0 2.6,3'] },
  ':': { w: 0, s: ['0,2.6 0,3.6', '0,9 0,10'] },
  '/': { w: 4, s: ['0,10 4,0'] },
  '&': { w: 5.4, s: ['5.4,10 1,3.6 1,1.4 2.4,0 3.4,0 4.6,1.2 4.6,2.6 0,6.6 0,8.6 1.4,10 3.2,10 5.4,6.6'] },
  '#': { w: 5.4, s: ['1.6,0 1.2,10', '4.2,0 3.8,10', '0,3.2 5.4,3.2', '0,6.8 5.4,6.8'] },
  $: { w: 5, s: ['5,1.2 1.6,1.2 0,2.6 0,3.8 1.6,5 3.4,5 5,6.2 5,7.4 3.4,8.8 0,8.8', '2.5,-0.6 2.5,10.6'] },
  '*': { w: 4, s: ['2,1 2,6', '0,2.4 4,4.6', '0,4.6 4,2.4'] },
};

/** Side bearings [left, right] in units for letters whose open sides would read as a word gap. */
const BEARINGS = {
  A: [-0.3, -0.3], E: [0, -0.8], F: [0, -1.1], J: [-0.7, 0], L: [0, -1.3], P: [0, -0.6], T: [-0.8, -0.8],
  V: [-0.4, -0.4], W: [-0.2, -0.2], Y: [-0.7, -0.7], 7: [0, -0.6], 1: [-0.3, 0],
};

/** Parses one "x,y x,y ... z" stroke string into { points: [[x, y], ...], closed }. */
function parseStroke(text) {
  const parts = text.trim().split(/\s+/);
  const closed = parts[parts.length - 1] === 'z';
  const pairs = closed ? parts.slice(0, -1) : parts;
  const points = pairs.map((pair) => pair.split(',').map(Number));
  return { points, closed };
}

/** The parsed glyph table: char -> { width, strokes, left, right }. Built once at import. */
export const GLYPHS = Object.fromEntries(
  Object.entries(RAW_GLYPHS).map(([char, glyph]) => {
    const [left, right] = BEARINGS[char] ?? [0, 0];
    return [char, { width: glyph.w, strokes: glyph.s.map(parseStroke), left, right }];
  }),
);

/** Folds accents and lower case onto the drawable set; anything still unknown becomes a gap. */
export function normaliseForGlyphs(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[·∙●]/g, '•');
}

/** Looks up a glyph, falling back to a space for characters the alphabet does not draw. */
export function glyphFor(char) {
  return GLYPHS[char] ?? GLYPHS[' '];
}
