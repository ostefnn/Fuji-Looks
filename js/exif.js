/* Fuji Looks — EXIF : copie des métadonnées de la photo d'origine dans l'export. */
// --- EXIF : on recopie les métadonnées de la photo d'origine dans l'export ------

// Renvoie le segment APP1 « Exif » d'un JPEG (ou null).
async function readExif(file) {
  if (!/jpe?g$/i.test(file.type || "") && !/\.jpe?g$/i.test(file.name || "")) return null;
  try {
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && offset + 10 <= view.byteLength &&
          String.fromCharCode(...new Uint8Array(buffer, offset + 4, 6)) === "Exif\0\0") {
        if (offset + 2 + size > view.byteLength) return null;
        return new Uint8Array(buffer.slice(offset, offset + 2 + size));
      }
      offset += 2 + size;
    }
  } catch {
    // EXIF illisible : export sans métadonnées.
  }
  return null;
}

// Adapte l'EXIF à la photo exportée : orientation déjà appliquée, pas de miniature
// (elle montrerait la photo sans le look), espace sRGB et nouvelles dimensions.
function patchExif(segment, width, height) {
  const exif = segment.slice();
  const view = new DataView(exif.buffer);
  const tiff = 10;
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o) => view.getUint16(o, little);
  const u32 = (o) => view.getUint32(o, little);
  const inRange = (o, n) => o >= tiff && o + n <= exif.length;

  function walk(ifdOffset, visit) {
    const base = tiff + ifdOffset;
    if (!inRange(base, 2)) return null;
    const count = u16(base);
    if (!inRange(base + 2, count * 12 + 4)) return null;
    for (let i = 0; i < count; i++) visit(base + 2 + i * 12);
    return base + 2 + count * 12; // position du pointeur vers l'IFD suivant
  }

  function setNumber(entry, value) {
    const type = u16(entry + 2);
    if (type === 3) view.setUint16(entry + 8, value, little);
    else if (type === 4) view.setUint32(entry + 8, value, little);
  }

  let exifIfd = null;
  const next = walk(u32(tiff + 4), (entry) => {
    const tag = u16(entry);
    if (tag === 0x0112) setNumber(entry, 1); // Orientation : normale
    if (tag === 0x8769) exifIfd = u32(entry + 8);
  });
  if (next === null) return null;
  view.setUint32(next, 0, little); // supprime l'IFD1 (miniature)

  if (exifIfd !== null) {
    walk(exifIfd, (entry) => {
      const tag = u16(entry);
      if (tag === 0xa001) setNumber(entry, 1); // ColorSpace : sRGB
      if (tag === 0xa002) setNumber(entry, width);
      if (tag === 0xa003) setNumber(entry, height);
    });
  }
  return exif;
}

async function withExif(blob, segment, width, height) {
  try {
    const exif = patchExif(segment, width, height);
    if (!exif) return blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let rest = 2;
    // Retire le segment JFIF ajouté par le navigateur : l'EXIF doit suivre directement le début du fichier.
    if (bytes[2] === 0xff && bytes[3] === 0xe0) rest = 4 + ((bytes[4] << 8) | bytes[5]);
    return new Blob([bytes.subarray(0, 2), exif, bytes.subarray(rest)], { type: "image/jpeg" });
  } catch {
    return blob;
  }
}
