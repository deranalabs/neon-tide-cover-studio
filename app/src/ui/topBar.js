// The top bar: post size tabs, undo and redo, Shuffle, Export PNG (this size) and All 3 sizes.

/** Wires the bar; `app` gives { setAspect, undo, redo, shuffle, exportCurrent, exportAll }. Returns sync. */
export function bindTopBar(app) {
  const tabs = [...document.querySelectorAll('#sizeTabs button')];
  const undo = document.getElementById('undo');
  const redo = document.getElementById('redo');
  const exportOne = document.getElementById('exportOne');
  tabs.forEach((tab) => tab.addEventListener('click', () => app.setAspect(tab.dataset.size)));
  undo.addEventListener('click', () => app.undo());
  redo.addEventListener('click', () => app.redo());
  document.getElementById('randomise').addEventListener('click', () => app.shuffle());
  exportOne.addEventListener('click', () => app.exportCurrent());
  document.getElementById('exportAll').addEventListener('click', () => app.exportAll());

  /** Reflects the aspect, the export size label and whether undo or redo can run. */
  return function sync(state, history) {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.size === state.aspect)));
    const active = tabs.find((tab) => tab.dataset.size === state.aspect);
    exportOne.textContent = `Export PNG ${active?.querySelector('small')?.textContent ?? ''}`.trim();
    undo.disabled = !history.canUndo;
    redo.disabled = !history.canRedo;
  };
}
