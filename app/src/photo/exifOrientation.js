// Minimal JPEG parser with no dependencies.
// Walks the file's markers by hand to read the EXIF orientation (1..8)
// and the stored pixel width and height.

/** Returns { orientation, width, height } from a JPEG's bytes; orientation 1 and size 0 when absent. */
export function readJpegInfo(buffer) {
  const view = new DataView(buffer);
  const info = { orientation: 1, width: 0, height: 0 };
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return info;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && info.orientation === 1) info.orientation = readExifOrientation(view, offset + 4, length - 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame && offset + 9 <= view.byteLength) {
      info.height = view.getUint16(offset + 5);
      info.width = view.getUint16(offset + 7);
      break;
    }
    offset += 2 + length;
  }
  return info;
}

/** Finds tag 0x0112 in the first IFD of an APP1 "Exif" block starting at `start`. */
function readExifOrientation(view, start, length) {
  if (start + 14 > view.byteLength || length < 14) return 1;
  if (view.getUint32(start) !== 0x45786966) return 1;
  const tiff = start + 6;
  const little = view.getUint16(tiff) === 0x4949;
  const ifd = tiff + view.getUint32(tiff + 4, little);
  if (ifd + 2 > view.byteLength) return 1;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** True when an orientation turns the picture a quarter, swapping width and height. */
export function swapsSides(orientation) {
  return orientation >= 5 && orientation <= 8;
}

/**
 * Sets ctx's transform so drawing the stored image at (0, 0, w, h) shows it upright, where w x h is the stored
 * size and the canvas is already sized to the upright size.
 */
export function applyOrientation(ctx, orientation, w, h) {
  const transforms = {
    2: [-1, 0, 0, 1, w, 0],
    3: [-1, 0, 0, -1, w, h],
    4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, h, 0],
    7: [0, -1, -1, 0, h, w],
    8: [0, -1, 1, 0, 0, w],
  };
  const t = transforms[orientation];
  if (t) ctx.transform(...t);
}
