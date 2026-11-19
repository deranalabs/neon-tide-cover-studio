// Entry point: starts the Neon Coast cover editor (a ?shot= query sets up a fixed scene for screenshots).
import { startEditor } from './ui/editor.js';

startEditor(new URLSearchParams(location.search)).catch((error) => {
  const status = document.getElementById('status');
  if (status) status.textContent = `Could not start: ${error.message}`;
  throw error;
});
