// The live preview: renders the cover with renderCover at a preview size, fits it to the stage, maps pointer
// positions to cover pixels and draws the editing overlay (selection, panel numbers, swap target), never exported.
import { renderCover } from '../engine/renderCover.js';
import { EXPORT_SIZES } from '../engine/coverState.js';
import { pointInPolygon, polygonCentre, tracePolygon } from '../engine/panelGeometry.js';

/** Preview pixels per export pixel: big enough to judge detail, small enough to redraw while dragging. */
const PREVIEW_SCALE = 2 / 3;

export class CoverPreview {
  constructor(canvas, overlay, stage) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.stage = stage;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.octx = overlay.getContext('2d');
    this.last = null;
    this.marks = { selected: 0, hover: -1, swapTo: -1, caption: false, numbers: false };
    this.frame = 0;
    new ResizeObserver(() => this.fit()).observe(stage);
  }

  /** Sizes the canvas for an aspect id ('landscape', 'square', 'portrait'). */
  setAspect(aspect) {
    const size = EXPORT_SIZES.find((entry) => entry.id === aspect) ?? EXPORT_SIZES[0];
    const w = Math.round(size.w * PREVIEW_SCALE);
    const h = Math.round(size.h * PREVIEW_SCALE);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.fit();
    }
  }

  /** Fits the canvas inside the stage (less the hint line) keeping its aspect. */
  fit() {
    const hint = this.stage.querySelector('.hint');
    const availW = this.stage.clientWidth - 28;
    const availH = this.stage.clientHeight - 36 - (hint ? hint.offsetHeight : 0);
    const scale = Math.max(0.05, Math.min(availW / this.canvas.width, availH / this.canvas.height));
    const cssW = Math.floor(this.canvas.width * scale);
    const cssH = Math.floor(this.canvas.height * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const ratio = window.devicePixelRatio || 1;
    this.overlay.width = Math.round(cssW * ratio);
    this.overlay.height = Math.round(cssH * ratio);
    this.overlay.style.width = `${cssW}px`;
    this.overlay.style.height = `${cssH}px`;
    this.drawOverlay();
  }

  /** Renders the cover now; keeps the geometry for hit tests. */
  render(state, photos) {
    this.setAspect(state.aspect);
    const t0 = performance.now();
    this.last = renderCover(this.ctx, this.canvas.width, this.canvas.height, state, photos);
    this.lastMs = performance.now() - t0;
    this.drawOverlay();
  }

  /** Cover pixel position of a pointer event. */
  toCover(event) {
    const rect = this.overlay.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      ((event.clientY - rect.top) / rect.height) * this.canvas.height,
    ];
  }

  /** Index of the panel under cover point (x, y), or -1. */
  panelAt(x, y) {
    const panels = this.last?.geometry.panels ?? [];
    const hit = panels.find((panel) => pointInPolygon(x, y, panel.polygon));
    return hit ? hit.index : -1;
  }

  /** True when (x, y) lies on the caption block. */
  captionAt(x, y) {
    const box = this.last?.caption.box;
    if (!box) return false;
    const pad = this.canvas.width * 0.01;
    return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad;
  }

  /** The panel's bounding box at preview size. */
  panelBounds(index) {
    return this.last?.geometry.panels[index]?.bounds ?? null;
  }

  /** Updates the overlay marks and redraws it. */
  mark(changes) {
    Object.assign(this.marks, changes);
    this.drawOverlay();
  }

  drawOverlay() {
    const o = this.octx;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (!this.last) return;
    const s = this.overlay.width / this.canvas.width;
    o.setTransform(s, 0, 0, s, 0, 0);
    const line = 1.5 / s;
    const { panels } = this.last.geometry;
    const { selected, hover, swapTo, caption, numbers } = this.marks;
    for (const panel of panels) {
      const isSel = panel.index === selected;
      if (!isSel && panel.index !== hover && panel.index !== swapTo && !numbers) continue;
      o.beginPath();
      tracePolygon(o, panel.polygon);
      o.setLineDash(isSel ? [] : [6 / s, 4 / s]);
      o.lineWidth = (isSel || panel.index === swapTo ? 3 : 1.5) * line;
      o.strokeStyle = panel.index === swapTo ? '#ffd257' : isSel ? '#38e0ff' : 'rgba(255, 255, 255, 0.7)';
      o.stroke();
      const [cx, cy] = polygonCentre(panel.polygon);
      const r = 11 / s;
      o.setLineDash([]);
      o.fillStyle = isSel ? '#38e0ff' : 'rgba(12, 4, 20, 0.8)';
      o.beginPath();
      o.arc(cx, cy, r, 0, Math.PI * 2);
      o.fill();
      o.fillStyle = isSel ? '#0b0710' : '#ffffff';
      o.font = `700 ${13 / s}px system-ui, sans-serif`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillText(String(panel.index + 1), cx, cy + 0.5 / s);
    }
    if (caption && this.last.caption) {
      const box = this.last.caption.box;
      o.setLineDash([5 / s, 4 / s]);
      o.lineWidth = line;
      o.strokeStyle = '#ffd257';
      o.strokeRect(box.x, box.y, box.w, box.h);
    }
    o.setLineDash([]);
  }
}
