// Keeps the cover settings (never the photos) in this browser's localStorage, so a reload picks up where you left.

const KEY = 'neon-coast-cover/v1';

/** The saved state, or null when there is none or storage is blocked. */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let timer = 0;

/** Saves the state a moment after the last change, so dragging does not write on every frame. */
export function saveSettings(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage full or blocked: settings simply are not kept
    }
  }, 250);
}
