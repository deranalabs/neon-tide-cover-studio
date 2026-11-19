# Neon Coast Cover Studio: notes

An offline web app (plain static files under `app/`, no build, no network, no library, no font files) that turns
your photos and a caption into a multi-panel sunset/neon poster and exports a PNG at 1920×1080, 1080×1080 or
1080×1350. Photos are decoded on your machine and never uploaded. Serve with `node serve.ts`, open
http://localhost:8080.

## What exists

- **One render path** (`app/src/engine/renderCover.js`): frame → graded panels → title shade → pale gutters with
  dark keylines and a bold border → sunset banner strip → bloom and lens flare → caption → rating stars → final grain.
  The live preview renders it at 2/3 scale and export renders it at full size into an OffscreenCanvas, so what you
  see is what is saved.
- **9 layouts per aspect** (`engine/layouts.js`): Poster 1+4 (hero plus four panels, the default), Hero, Split,
  Stack, Grid 2×2, Shards 5, Stagger 6, Hero + Strip and Mosaic 7. They use slanted seams, and portrait turns columns
  into rows. Every layout tiles its area exactly (unit-tested).
- **Panels** (`engine/panelPainter.js`): each panel is a photo crop (focus point, zoom 1–5, flip) or one of five
  painted scenes (`app/src/scenes/`): skyline at dusk, neon grid, harbour at dusk, a coast-road coupe and a halftone
  burst. Each panel is graded with its own tint and given halftone, grain and a vignette. Layers are cached, so a drag
  re-grades only the dragged panel.
- **Grade** (`app/src/grade/`): gradient maps in pink, violet, orange and teal, a duotone option, contrast and
  saturation, a dusk sky wash, bloom, halftone, grain, vignette, a lens flare, a banded sun disc, palms and neon
  bars. Six presets: Dusk Drive, Neon Nights, Flamingo Hour, Harbor Noon, Mono Pink and Teal Tide. The sliders
  override the preset.
- **Lettering** (`app/src/text/`): an own stroke-skeleton alphabet (A–Z, 0–9, punctuation) drawn as heavy italic
  letters. Each letter has a glow, a stepped extrusion, an outline and rim, a gradient face and a gloss band. Side
  bearings stop open letters (E, L, T…) reading as word gaps. The title is auto-fitted on one or two lines. Five
  letter styles. The subtitle sits on a folded ribbon, the tagline is in spaced capitals, and there are a starburst
  badge, a wanted-style star row and an optional sun-and-palms emblem.
- **Panel labels and neon script**: each panel can carry a short label ("THE DRIVER", upper-cased, at most 18 characters, set in the panel inspector) drawn as a small tilted white tag in its lower-left corner and left out where the caption covers it; the subtitle defaults to the new glowing Neon Script letter style (the ribbon stays one checkbox away).
- **Poster layout and comic look**: Poster is now a hero on the left half plus a balanced 2×2 block with slanted seams (each about 12–14 % of the panel area), with the title set low across the seam, clear of the hero's face. Panels get Sobel ink lines, a coarse halftone in the shadows and mid-tones, two-tone pink/cyan rim light and pink gutter keylines, and a banded magenta-to-orange sun sits behind the title. Known gap: in the 4:5 portrait shot the title still overlaps the middle-row face crop.
- **Photos** (`app/src/photo/`): picker and drag-and-drop of several files at once. The EXIF orientation is read by
  hand and applied once (skipped if the browser already turned the picture). Photos are downscaled to 2400 px on the
  long side. One photo can fill several panels with different crops, and painted scenes fill the gaps when there are
  fewer photos than panels.
- **Editor** (`app/src/ui/`): a dark three-column studio. Undo/redo keeps 100 steps. Settings are kept in
  localStorage (photos are not). Shuffle picks a layout, preset, letters, tints and crops.

## Controls

| Action | How |
| --- | --- |
| Add photos | Drop anywhere, or click the drop zone. The two samples are replaced by your first photos. |
| Place a photo | Click a thumbnail (goes to the selected panel), drag it onto a panel, or drop a file onto a panel |
| Pan / zoom a photo | Drag inside the panel / mouse wheel, or the Zoom slider |
| Swap panels | Shift+drag (or Alt+drag) from one panel onto another, or the Swap ▸ button |
| Move the caption | Drag the title; "Re-centre caption" resets it |
| Reset a crop | Double-click the panel, the Reset button, or 0 |
| Export | E (this size), Shift+E or "All 3 sizes", saved as `<title>-<w>x<h>.png` |
| Keys | R shuffle · 1 2 3 size · [ ] layout · P preset · F flip · ← → pick panel · Ctrl/Cmd+Z undo · Ctrl+Shift+Z or Ctrl+Y redo |

Fastest path: drop photos → press E. Pick a preset or press R in between if you like.

## Tests and tools (Node 22+, Chrome at the default macOS path or `CHROME_PATH`)

- `node --test tests/unit.mjs`: 12 unit tests (layout tiling, crop clamping and zoom anchoring, EXIF reading in both
  byte orders, history, state repair, auto-fill, shuffle repeatability, file names, glyph coverage).
- `node tests/editorFlow.mjs`: 10 end-to-end checks in headless Chrome. They upload a JPEG with EXIF orientation 6
  (checked upright and turned clockwise once), use wheel zoom, drag pan, undo/redo and Shift-drag swap, run the
  shortcuts, export all three sizes as real PNG downloads (sizes checked), check that settings survive a reload,
  load a 5600×4200 PNG (downscaled to 2400×1800), and fail on any console error.
- `node tests/browser.mjs --shots [--keep-png]`: writes `screenshots/` from `shots.json`. Export shots are the PNG
  the app's own export wrote, scaled down in the page and encoded as JPEG under 250 KiB. `2-editor` is the page at
  1280×720.
- `node tests/look.mjs`: the measured look check (fit in 768×480, luminance 0.2126/0.7152/0.0722).
- `node tests/gallerySheet.mjs`: tiles the cover in every preset and every layout into `tests/out/` for a visual
  check.
- `tests/chromeDriver.mjs` drives Chrome over the DevTools protocol with Node's own WebSocket: one browser, a
  throwaway profile and a deadline on every step.

## Look-test numbers (final screenshots)

| Shot | gradEnergy | flatBlocks | colors | brightShare | meanSat |
| --- | --- | --- | --- | --- | --- |
| 1-cover (target) | ≥ 8.3 | ≤ 0.17 | ≥ 200 | 1–4 % | 0.45–0.60 |
| 1-cover | **11.61** | **0.030** | **247** | **2.7 %** | **0.511** |
| 3-square | 11.15 | 0.073 | 226 | 2.8 % | 0.513 |
| 4-portrait | 11.84 | 0.069 | 221 | 2.4 % | 0.510 |
| 2-editor | 10.19 | 0.296 | 106 | 1.2 % | 0.509 |

All five cover targets are met. The editor shot is not held to them: it is mostly a flat dark UI by design.
Export times in headless Chrome: 1920×1080 about 0.7 s, 1080×1080 about 0.4 s, 1080×1350 about 0.5 s. A full
preview redraw takes about 160 ms.

## Untested or not done

- Only tested in Chrome (headless, macOS). Firefox and Safari were not run; the code relies on OffscreenCanvas,
  `createImageBitmap(…, { imageOrientation: 'none' })` and `canvas.filter` for bloom.
- EXIF handling is tested with synthetic tags on the sample photo, not with real camera files. HEIC is not supported.
- No pinch-zoom on touch screens (pointer drag works; zoom is the wheel or the slider). Painted scenes ignore pan
  and zoom.
- Photos are not kept across reloads; only the settings are. After a reload, panels are refilled from the bundled
  samples.
- The cover screenshot uses a hand-placed crop of the two sample photos (`app/src/ui/shotScenes.js`), as a person
  would arrange it. Auto-fill alone gives the same layout with generic crops.

## Originality

All art is procedural and drawn in code here: the glyph skeletons, palms, sun, skylines, coupe, stickers and stars.
There are no fonts, logos or game artwork. The only photographs are the kit's two sample images in `app/samples/`.
