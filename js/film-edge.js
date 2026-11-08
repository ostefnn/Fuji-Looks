/* Fuji Looks — Bande de film : la photo posée sur son négatif, au format choisi.
 *
 * Cadre « Pellicule » : la vue est recadrée au format de la fenêtre du boîtier (24×36, demi-format,
 * panoramique, 6×4,5 à 6×9) et dessinée sur la bande, avec ses perforations (35 mm), le nom du film,
 * les numéros de vue et la signature imprimés en bordure. Toutes les mesures sont en millimètres
 * de film, converties en pixels d'après la taille de la vue : l'aperçu et l'export sont identiques.
 *
 * Demi-format à deux vues : deux photos sur une vue 24×36, côte à côte, avec le même look.
 */

const FILM_FORMAT_KEY = "fuji-looks.film-format";
const FRAME_NUMBER_KEY = "fuji-looks.frame-number";
const HALF_PAIR_KEY = "fuji-looks.half-pair";

filmFormat = FILM_FORMATS[load(FILM_FORMAT_KEY)] ? load(FILM_FORMAT_KEY) : "135";
let frameNumber = Number.isInteger(load(FRAME_NUMBER_KEY)) ? load(FRAME_NUMBER_KEY) : 24;
// Seconde vue du demi-format : la photo n'est gardée que pendant la session.
const halfPair = { on: load(HALF_PAIR_KEY) === true, image: null, size: null, swap: false, cache: null };

function filmEdgeActive() {
  return frameStyle === "film";
}

// Deux vues sur la bande (pas pendant l'export d'une série : chaque photo y garde sa vue).
function halfPairActive() {
  return filmEdgeActive() && filmFormatOf(filmFormat).pair && halfPair.on && !seriesBusy;
}

// Proportion largeur / hauteur imposée à la photo (null : pas de bande de film).
// fw, fh : taille de la photo avant recadrage, pour garder son orientation.
function filmGateRatio(fw, fh) {
  if (!filmEdgeActive()) return null;
  const f = filmFormatOf(filmFormat);
  if (halfPairActive()) return f.along / f.across; // deux vues verticales, côte à côte
  const long = Math.max(f.along, f.across);
  const short = Math.min(f.along, f.across);
  return fw >= fh ? long / short : short / long;
}

// --- Seconde vue du demi-format -------------------------------------------------------

// Source de la seconde photo, à la taille exacte de la première, avec la même retouche
// (exposition, balance des blancs…) mais cadrée au centre et sans rotation.
function halfPairSource(w, h) {
  const key = `${w}x${h}|${JSON.stringify(edit)}`;
  if (halfPair.cache && halfPair.cache.key === key) return halfPair.cache.data;
  const e = { ...edit, rotate: 0, straighten: 0, cropX: 0, cropY: 0 };
  const built = buildEditedSource(Math.max(w, h), null, e, halfPair.image, halfPair.size);
  let data = built;
  if (built.width !== w || built.height !== h) {
    const c = makeCanvas(w, h);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageDataToCanvas(built), 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h);
  }
  halfPair.cache = { key, data };
  return data;
}

// Seconde vue rendue avec le look (ou null : une seule vue, ou case encore vide).
function renderHalfPair(out, look, strength, withHalation) {
  if (!halfPairActive() || !halfPair.image) return null;
  const src = halfPairSource(out.width, out.height);
  const size = editGeometry(halfPair.size.w, halfPair.size.h, { ...edit, rotate: 0, straighten: 0 });
  const rendered = renderRecipe(src, look, strength, { w: size.w, h: size.h }, out.width);
  // Comme la première vue : ni halo ni date pendant « Avant / Après ».
  if (withHalation) {
    applyHalation(rendered, halationFor(look), halationScaleFor(look));
    applyDateBack(rendered);
  }
  return rendered;
}

// --- Dessin de la bande ----------------------------------------------------------------------

const EDGE_COLORS = {
  base: "#0d0c0b", // bordure du négatif, noire une fois inversée au scan
  hole: "#e8e3d7", // lumière du scanner à travers les perforations
  print: "#f0a33c", // marquages latents, orangés sur un négatif couleur
  printMono: "#d5cfc3",
  emptyGate: "#191714"
};

// Ce qui est imprimé en bordure : le nom du film, ou celui de la recette.
function edgeLabel(look, info) {
  if (!look || info === "none") return "";
  if (look.film) return filmByKey.get(look.film).name.toUpperCase();
  return `${(look.name || "Recette").toUpperCase()}  ▸  ${frameSubtitle(look)}`;
}

function photoCanvas(imageData, rotate) {
  const c = imageDataToCanvas(imageData);
  if (!rotate) return c;
  // Rotation d'un quart de tour (sens horaire) pour poser une photo verticale sur la bande.
  const r = document.createElement("canvas");
  r.width = c.height;
  r.height = c.width;
  const ctx = r.getContext("2d");
  ctx.translate(r.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(c, 0, 0);
  return r;
}

// Petit code-barres de bordure (façon DX), dérivé du nom : purement décoratif.
function drawEdgeBars(ctx, x, y, h, mm, seed) {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  let cx = x;
  for (let i = 0; i < 22; i++) {
    const wide = (hash >>> i) & 1;
    if (i % 2 === 0) ctx.fillRect(cx, y, (wide ? 0.42 : 0.2) * mm, h);
    cx += (wide ? 0.55 : 0.32) * mm;
  }
  return cx - x;
}

function drawEdgeText(ctx, text, x, y, size, align = "left", maxWidth) {
  ctx.font = `600 ${Math.round(size)}px ${FRAME_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y, maxWidth);
}

/*
 * Bande de film. Dessinée avec le film horizontal ; une photo verticale y est couchée,
 * puis la bande entière est redressée : la photo reste droite, le film devient vertical.
 */
function composeFilmEdge(imageData, look, info, pair) {
  const f = filmFormatOf(filmFormat);
  const W = imageData.width;
  const H = imageData.height;
  const twoUp = halfPairActive();
  // Faut-il coucher la photo ? Seulement si son orientation diffère de celle de la vue.
  const rotate = !twoUp && f.along !== f.across && (W >= H) !== (f.along >= f.across);
  const gateW = rotate ? H : W; // le long du film
  const gateH = rotate ? W : H; // en travers
  const mm = gateH / f.across;
  const frames = twoUp ? 2 : 1;
  const lead = 4 + f.gap / 2; // film visible avant et après la vue
  const stripW = Math.round(gateW * frames + f.gap * mm * (frames - 1) + lead * 2 * mm);
  const stripH = Math.round(f.film * mm);
  const strip = document.createElement("canvas");
  strip.width = stripW;
  strip.height = stripH;
  const ctx = strip.getContext("2d");
  ctx.fillStyle = EDGE_COLORS.base;
  ctx.fillRect(0, 0, stripW, stripH);

  // Les vues, centrées en travers du film.
  const gateY = Math.round(((f.film - f.across) / 2) * mm);
  const gateX = (i) => Math.round(lead * mm + i * (gateW + f.gap * mm));
  const main = photoCanvas(imageData, rotate);
  const mainIndex = twoUp && halfPair.swap ? 1 : 0;
  ctx.drawImage(main, gateX(mainIndex), gateY);
  if (twoUp) {
    const other = 1 - mainIndex;
    if (pair) ctx.drawImage(photoCanvas(pair, false), gateX(other), gateY);
    else {
      ctx.fillStyle = EDGE_COLORS.emptyGate;
      ctx.fillRect(gateX(other), gateY, gateW, gateH);
    }
  }

  // Perforations du 35 mm : pas de 4,75 mm, 2,8 × 2 mm, à 2 mm du bord.
  if (f.perfs) {
    const holeW = 2.8 * mm;
    const holeH = 1.98 * mm;
    const inset = 2 * mm;
    const pitch = 4.75 * mm;
    ctx.fillStyle = EDGE_COLORS.hole;
    for (let hx = (stripW / 2) % pitch - pitch / 2; hx < stripW; hx += pitch) {
      [inset, stripH - inset - holeH].forEach((hy) => {
        roundedRect(ctx, hx, hy, holeW, holeH, 0.45 * mm);
        ctx.fill();
      });
    }
  }

  // Marquages : entre le bord du film et les perforations (35 mm), ou dans la marge du 120.
  const isMono = look && look.film && filmByKey.get(look.film).shelf === "bw";
  ctx.fillStyle = isMono ? EDGE_COLORS.printMono : EDGE_COLORS.print;
  const band = f.perfs ? 2 * mm : ((f.film - f.across) / 2) * mm;
  const textSize = Math.min(band * 0.62, 1.35 * mm);
  const topY = band / 2;
  const bottomY = stripH - band / 2;
  const label = edgeLabel(look, info);
  const firstX = gateX(0);
  const endX = gateX(frames - 1) + gateW;
  if (label) drawEdgeText(ctx, label, firstX + 1.5 * mm, topY, textSize, "left", (endX - firstX) * 0.6);
  // Numéros de vue : « 24 » au-dessus de la vue, « 24A » à l'intervalle (demi-format : une vue chacun).
  const n = Math.max(0, Math.min(99, frameNumber));
  if (twoUp) {
    drawEdgeText(ctx, `${n}`, gateX(0) + gateW / 2, bottomY, textSize, "center");
    drawEdgeText(ctx, `▸ ${n}A`, gateX(1) + gateW / 2, bottomY, textSize, "center");
  } else if (f.perfs) {
    drawEdgeText(ctx, `${n}`, firstX + gateW * 0.5, bottomY, textSize, "center");
    drawEdgeText(ctx, `▸ ${n}A`, endX + (f.gap / 2) * mm, bottomY, textSize, "center");
  } else {
    drawEdgeText(ctx, `◂ ${n}`, endX - 3 * mm, topY, textSize, "right");
  }
  if (f.perfs) drawEdgeBars(ctx, firstX + gateW * 0.68, bottomY - textSize * 0.42, textSize * 0.84, mm, label || String(n));
  // Signature imprimée en bordure : sur la ligne du nom en 35 mm (à droite si le nom occupe la gauche),
  // sur l'autre marge en 120.
  const sig = signatureName.trim();
  if (sig) {
    const position = f.perfs && label && signaturePosition !== "right" ? "right" : signaturePosition;
    const sx = position === "left" ? firstX + 1.5 * mm : position === "center" ? (firstX + endX) / 2 : endX - 1.5 * mm;
    drawEdgeText(ctx, `© ${sig.toUpperCase()}`, sx, f.perfs ? topY : bottomY, textSize * 0.9, position, gateW * 0.35);
  }

  // Redresse la bande quand la photo a été couchée.
  let canvas = strip;
  let photo = { x: gateX(mainIndex), y: gateY, w: gateW, h: gateH };
  if (rotate) {
    canvas = document.createElement("canvas");
    canvas.width = stripH;
    canvas.height = stripW;
    const rctx = canvas.getContext("2d");
    rctx.translate(0, stripW);
    rctx.rotate(-Math.PI / 2);
    rctx.drawImage(strip, 0, 0);
    photo = { x: gateY, y: stripW - (photo.x + gateW), w: gateH, h: gateW };
  }

  canvas = withInfoBand(canvas, look, info);
  canvas.photoX = photo.x;
  canvas.photoY = photo.y;
  canvas.photoW = photo.w;
  canvas.photoH = photo.h;
  return canvas;
}

// Infos complètes : les réglages, dans un cartouche noir sous la bande.
function withInfoBand(canvas, look, info) {
  if (!look || info !== "full") return canvas;
  const cfg = FRAME_STYLES.film;
  const long = Math.max(canvas.width, canvas.height);
  const textSize = Math.max(8, Math.round(long * 0.0145));
  const pad = Math.round(long * 0.03);
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `${textSize}px ${FRAME_FONT}`;
  const lines = wrapTokens(measure, frameTokens(look), canvas.width - pad * 2);
  if (look.author) lines.push(`Recette : ${look.author}`);
  const band = Math.round(pad * 1.4 + lines.length * textSize * 1.55);
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height + band;
  const ctx = out.getContext("2d");
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  ctx.font = `${textSize}px ${FRAME_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = canvas.height + Math.round(pad * 0.7);
  lines.forEach((line, i) => {
    y += Math.round(textSize * 1.55);
    ctx.fillStyle = look.author && i === lines.length - 1 ? cfg.muted : cfg.text;
    ctx.fillText(line, pad, y);
  });
  return out;
}

// --- Réglages : format, vues, numéro ------------------------------------------------------

const filmEdgeRow = document.getElementById("filmEdgeRow");
const filmFormatOptions = document.getElementById("filmFormatOptions");
const filmFormatSelect = document.getElementById("filmFormatSelect");
const halfPairRow = document.getElementById("halfPairRow");
const halfPairOptions = document.getElementById("halfPairOptions");
const halfPairPhotoRow = document.getElementById("halfPairPhotoRow");
const halfPairInput = document.getElementById("halfPairInput");
const halfPairPick = document.getElementById("halfPairPick");
const halfPairSwap = document.getElementById("halfPairSwap");
const halfPairClear = document.getElementById("halfPairClear");
const frameNumberInput = document.getElementById("frameNumberInput");
const ratioGateHint = document.getElementById("ratioGateHint");

// Le format de la vue change : recadrage, puis nouvel aperçu.
function filmGateChanged() {
  halfPair.cache = null;
  updateCropControls();
  if (originalImage) rebuildSource();
  else schedulePreview();
}

function updateGateHint() {
  ratioGateHint.hidden = !filmEdgeActive();
  ratioGateHint.textContent = `Format imposé par la bande de film (${filmFormatOf(filmFormat).label}). Fais glisser la photo pour la cadrer.`;
  ratioOptions.classList.toggle("is-locked", filmEdgeActive());
}

function updateFilmEdgeOptions() {
  const f = filmFormatOf(filmFormat);
  filmEdgeRow.hidden = !filmEdgeActive();
  filmFormatOptions.querySelectorAll("[data-format]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.format === filmFormat)));
  filmFormatSelect.value = filmFormat;
  halfPairRow.hidden = !f.pair;
  halfPairOptions.querySelectorAll("[data-pair]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.pair === "pair") === halfPair.on)));
  halfPairPhotoRow.hidden = !f.pair || !halfPair.on;
  halfPairPick.textContent = halfPair.image ? "Changer la 2e photo" : "Choisir la 2e photo";
  halfPairSwap.hidden = halfPairClear.hidden = !halfPair.image;
  frameNumberInput.value = frameNumber;
  updateGateHint();
}

function setFilmFormat(key) {
  if (!FILM_FORMATS[key] || key === filmFormat) return;
  filmFormat = key;
  store(FILM_FORMAT_KEY, key);
  updateFilmEdgeOptions();
  if (filmEdgeActive()) filmGateChanged();
  else schedulePreview(); // grain et halo d'une pellicule
}

filmFormatOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-format]");
  if (button) setFilmFormat(button.dataset.format);
});
filmFormatSelect.addEventListener("change", () => setFilmFormat(filmFormatSelect.value));

halfPairOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pair]");
  if (!button) return;
  halfPair.on = button.dataset.pair === "pair";
  store(HALF_PAIR_KEY, halfPair.on);
  updateFilmEdgeOptions();
  filmGateChanged();
  if (halfPair.on && !halfPair.image) showStatus("Choisis la seconde photo de la vue.");
});

halfPairPick.addEventListener("click", () => halfPairInput.click());
halfPairInput.addEventListener("change", async () => {
  const file = halfPairInput.files && halfPairInput.files[0];
  halfPairInput.value = "";
  if (!file) return;
  if (!isImageFile(file)) {
    showStatus("Choisis un fichier image valide.");
    return;
  }
  try {
    const img = await loadImage(file);
    halfPair.image = img;
    halfPair.size = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    halfPair.cache = null;
    updateFilmEdgeOptions();
    schedulePreview();
    showStatus("Seconde vue ajoutée. Elle prend le même look et la même retouche.");
  } catch {
    showStatus("Impossible de lire cette image. Essaie un autre fichier.");
  }
});

halfPairSwap.addEventListener("click", () => {
  halfPair.swap = !halfPair.swap;
  schedulePreview();
});

halfPairClear.addEventListener("click", () => {
  halfPair.image = halfPair.size = halfPair.cache = null;
  updateFilmEdgeOptions();
  schedulePreview();
});

frameNumberInput.addEventListener("input", () => {
  const n = Math.round(Number(frameNumberInput.value));
  if (!Number.isFinite(n)) return;
  frameNumber = Math.max(0, Math.min(99, n));
  store(FRAME_NUMBER_KEY, frameNumber);
  schedulePreview();
});
