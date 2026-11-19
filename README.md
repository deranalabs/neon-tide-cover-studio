# neon-tide-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/deranalabs/neon-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/deranalabs/neon-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into a multi-panel sunset-and-neon poster in the style of an open-world crime game cover. It is plain static files under `app/` with no build step, no libraries, no font files and no network access, and all the lettering and painted scenes are drawn in code.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (Node 22+). Fastest path: drop photos onto the page, then press E to export.

`MAKEFUN_OUTPUT_DIR=out node main.ts` packages the entry: it copies `app/` and `screenshots/` into the output folder (`/output` by default) and writes `dossier.json` there.

## What it does

- **Layouts:** 9 per aspect (Poster 1+4, Hero, Split, Stack, Grid 2×2, Shards 5, Stagger 6, Hero + Strip, Mosaic 7), with slanted seams. Portrait turns columns into rows.
- **Panels:** each panel is a photo crop (focus point, zoom 1–5, flip) or one of five painted scenes: skyline at dusk, neon grid, harbour, coast-road coupe, halftone burst.
- **Grades:** six presets (Dusk Drive, Neon Nights, Flamingo Hour, Harbor Noon, Mono Pink, Teal Tide). Sliders for gradient map, duotone, contrast, saturation, sky wash, bloom, halftone, grain, vignette, lens flare, sun disc, palms and neon bars override the preset.
- **Caption controls:** title auto-fitted on one or two lines in five letter styles, a ribbon subtitle, a spaced tagline, a starburst badge, a star rating row and an optional sun-and-palms emblem. Drag the title to move it.
- **Panel labels and neon script:** give any panel a short label tag such as THE DRIVER (upper-cased, up to 18 characters) drawn as a tilted white tag in its corner; the subtitle glows in the new Neon Script style, or sits on the ribbon if you tick it.
- **Export sizes:** PNG at 1920×1080, 1080×1080 or 1080×1350 (E for the current size, Shift+E for all three), saved as `<title>-<w>x<h>.png`.
- **Editing:** drag-and-drop of several photos, pan by dragging, wheel zoom, Shift+drag to swap panels, Shuffle (R), and undo/redo with 100 steps.
- **Privacy:** photos are decoded on your computer and never uploaded. Only settings are kept in localStorage; photos are not stored.

## Tests

Node 22+. The browser tests need Chrome at the default macOS path or `CHROME_PATH`.

```sh
node --test tests/unit.mjs          # 12 unit tests: layout tiling, crops, EXIF, history, state, file names, glyphs
node tests/editorFlow.mjs           # 10 end-to-end checks in headless Chrome, including real PNG exports
node tests/browser.mjs --shots      # regenerate screenshots/
node tests/look.mjs                 # measured look check of the screenshots
node tests/gallerySheet.mjs         # every preset and layout tiled into tests/out/
```

## Known limits

Only tested in Chrome. No HEIC and no pinch-zoom on touch screens. Photos are not kept across reloads.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
