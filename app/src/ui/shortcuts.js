// Keyboard shortcuts: E export, Shift+E all sizes, R shuffle, 1-3 size, [ ] layout, P preset, F flip, 0 reset,
// left/right arrows pick the panel, Ctrl/Cmd+Z undo and Ctrl/Cmd+Shift+Z or Ctrl+Y redo.

const TYPING = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

/** Wires the keys; `app` gives the actions named in the table below. */
export function bindShortcuts(app) {
  window.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const typing = TYPING.has(document.activeElement?.tagName) && document.activeElement.type !== 'range'
      && document.activeElement.type !== 'checkbox';
    if (mod && event.key.toLowerCase() === 'z' && !typing) {
      event.preventDefault();
      if (event.shiftKey) app.redo();
      else app.undo();
      return;
    }
    if (mod && event.key.toLowerCase() === 'y' && !typing) {
      event.preventDefault();
      app.redo();
      return;
    }
    if (mod || event.altKey || typing) return;
    const actions = {
      e: () => (event.shiftKey ? app.exportAll() : app.exportCurrent()),
      r: () => app.shuffle(),
      1: () => app.setAspect('landscape'),
      2: () => app.setAspect('square'),
      3: () => app.setAspect('portrait'),
      '[': () => app.stepLayout(-1),
      ']': () => app.stepLayout(1),
      p: () => app.stepPreset(1),
      f: () => app.flipSelected(),
      0: () => app.resetSelected(),
      arrowright: () => app.stepPanel(1),
      arrowleft: () => app.stepPanel(-1),
    };
    const action = actions[event.key.toLowerCase()];
    if (action) {
      event.preventDefault();
      action();
    }
  });
}
