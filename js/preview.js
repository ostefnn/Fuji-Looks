/* Fuji Looks — Aperçu de la photo et sélection des looks. */
// --- Aperçu --------------------------------------------------------------

function schedulePreview() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    updatePreview();
  });
}

function updatePreviewLabel() {
  let text;
  if (versionCompare) text = "Comparaison des versions";
  else if (comparing) text = "Original";
  else if (hoverLookId) text = `${lookById.get(hoverLookId).name} · aperçu`;
  else {
    const name = applied ? (currentFilm ? currentFilm.name : recipe.name || "Recette") : "Original";
    text = modified ? `${name} · modifiée` : name;
  }
  photoLabel.textContent = text.toUpperCase();
  photoLabel.hidden = !originalImage;
}

// Recette affichée : l'original pendant la comparaison, le look survolé, sinon la recette en cours.
function shownRecipe() {
  if (comparing) return null;
  if (hoverLookId) return withFormat(lookRender(lookById.get(hoverLookId)));
  return activeRecipe();
}

// --- Mode interactif : aperçu allégé pendant qu'on fait glisser un curseur --------

let interactiveUntil = 0;
let interactiveTimer = 0;
let liteCache = { source: null, data: null };

function markInteractive() {
  interactiveUntil = performance.now() + 160;
  clearTimeout(interactiveTimer);
  // Une fois le geste terminé, on repasse en pleine définition.
  interactiveTimer = setTimeout(schedulePreview, 200);
}

function imageDataToCanvas(data) {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext("2d").putImageData(data, 0, 0);
  return canvas;
}

// Copie de l'aperçu en demi-définition (4 fois moins de pixels à calculer).
function liteSource() {
  if (liteCache.source !== previewSource) {
    const w = Math.max(1, Math.round(previewSource.width / 2));
    const h = Math.max(1, Math.round(previewSource.height / 2));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imageDataToCanvas(previewSource), 0, 0, w, h);
    liteCache = { source: previewSource, data: ctx.getImageData(0, 0, w, h) };
  }
  return liteCache.data;
}

// Position de la photo dans l'aperçu affiché, en fraction du canvas (le cadre l'entoure).
let previewPhotoRect = { x: 0, y: 0, w: 1, h: 1 };

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)} %`;

  // Comparaison des versions : les versions choisies côte à côte, à la place de l'aperçu.
  const compareCanvas = previewSource && versionCompare ? drawVersionCompare() : null;
  if (compareCanvas) {
    previewPhotoRect = { x: 0, y: 0, w: 1, h: 1 };
    if (photoPreview.width !== compareCanvas.width || photoPreview.height !== compareCanvas.height) {
      photoPreview.width = compareCanvas.width;
      photoPreview.height = compareCanvas.height;
      applyView();
    }
    photoPreview.getContext("2d").drawImage(compareCanvas, 0, 0);
  } else if (previewSource) {
    const shown = shownRecipe();
    // Pendant un glissement de curseur : rendu en demi-définition, affiché à la taille normale.
    const lite = performance.now() < interactiveUntil && photoPreview.width > 0;
    const src = lite ? liteSource() : previewSource;
    // Pellicule pas encore chargée : on garde l'original le temps du chargement.
    const ready = !(shown && shown.film) || filmLutsReady();
    if (!ready) ensureFilmLuts();
    const out = renderRecipe(src, ready ? shown : null, strength, sourceSize);
    const look = ready ? shown : null;
    if (!comparing) {
      applyHalation(out, halationFor(look), halationScaleFor(look));
      applyDateBack(out);
    }
    // Demi-format à deux vues : la seconde photo, avec le même look.
    const pair = frameStyle === "film" ? renderHalfPair(out, look, strength, !comparing) : null;
    updateHistogram(out);
    if (splitView && !comparing) applySplit(out, src);
    if (clippingOn) markClipping(out);
    const framed = frameStyle !== "none" ? composeFrame(out, frameStyle, shown, frameInfo, pair) : null;
    previewPhotoRect = framed
      ? { x: framed.photoX / framed.width, y: framed.photoY / framed.height, w: (framed.photoW || out.width) / framed.width, h: (framed.photoH || out.height) / framed.height }
      : { x: 0, y: 0, w: 1, h: 1 };
    const ctx = photoPreview.getContext("2d");

    if (lite) {
      const layer = framed || imageDataToCanvas(out);
      ctx.imageSmoothingQuality = "low";
      ctx.drawImage(layer, 0, 0, photoPreview.width, photoPreview.height);
    } else {
      const w = framed ? framed.width : out.width;
      const h = framed ? framed.height : out.height;
      if (photoPreview.width !== w || photoPreview.height !== h) {
        photoPreview.width = w;
        photoPreview.height = h;
        applyView();
      }
      if (framed) ctx.drawImage(framed, 0, 0);
      else ctx.putImageData(out, 0, 0);
    }
  }

  updatePreviewLabel();

  markSelectedCard();
}

function markSelectedCard() {
  lookGroups.querySelectorAll(".look-card").forEach((card) => {
    const selected = card.dataset.look === currentLookId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

// Avant / Après : la moitié gauche de l'aperçu montre la photo sans le look.
let splitView = false;

function applySplit(out, src) {
  const { width: w, height: h } = out;
  const half = Math.round(w / 2);
  const a = src.data;
  const b = out.data;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    b.set(a.subarray(row, row + half * 4), row);
    // Trait de séparation, deux pixels clairs.
    for (let x = half - 1; x <= half; x++) {
      const i = row + x * 4;
      b[i] = b[i + 1] = b[i + 2] = 235;
    }
  }
}

function setSplitView(value) {
  splitView = value;
  document.body.classList.toggle("split-view", value);
  schedulePreview();
}

function selectLook(id) {
  const look = lookById.get(id);
  if (versionCompare) setVersionCompare(false); // choisir un look ramène à l'aperçu normal
  if (id !== currentLookId || modified) commit();
  currentLookId = id;
  modified = false;
  if (look.film) {
    currentFilm = filmSpec(look.film);
    applied = true;
    ensureFilmLuts();
  } else if (look.recipe) {
    currentFilm = null;
    recipe = FR.normalize(look.recipe);
    applied = true;
  } else {
    currentFilm = null;
    applied = false;
  }
  updateRecipeEditor();
  schedulePreview();
  if (!originalImage) showStatus("Importe une photo pour voir ce rendu sur ton image.");
}
