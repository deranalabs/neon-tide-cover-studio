// The Photos section: file picker, drop anywhere on the page, a tray of thumbnails (click to place in the selected
// panel, drag onto any panel, × to remove) and the Auto-fill button.

/** Wires the section; `app` gives { addFiles, autoFill, placePhoto, removePhoto, selected }. Returns renderTray. */
export function bindPhotoTray(app) {
  const input = document.getElementById('fileInput');
  const tray = document.getElementById('photoTray');
  input.addEventListener('change', () => {
    if (input.files.length) app.addFiles([...input.files]);
    input.value = '';
  });
  document.getElementById('autofill').addEventListener('click', () => app.autoFill());

  let depth = 0;
  window.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    depth += 1;
    document.body.classList.add('dragging');
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) document.body.classList.remove('dragging');
  });
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging');
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length) app.addFiles(files);
  });

  /** Redraws the thumbnails for the photo list [{ id, name, thumb }]. */
  return function renderTray(photoList) {
    tray.replaceChildren(...photoList.map((photo, i) => {
      const cell = document.createElement('div');
      cell.className = 'thumb';
      cell.draggable = true;
      cell.title = `${photo.name}: click to place in the selected panel, or drag onto a panel`;
      const img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = photo.name;
      img.draggable = false;
      const label = document.createElement('b');
      label.textContent = String(i + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remove this photo';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        app.removePhoto(photo.id);
      });
      cell.append(img, label, remove);
      cell.addEventListener('click', () => app.placePhoto(photo.id, app.selected()));
      cell.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/x-photo-id', photo.id);
        event.dataTransfer.effectAllowed = 'copy';
      });
      return cell;
    }));
  };
}
