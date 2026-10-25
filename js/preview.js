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
  if (comparing) text = "Original";
  else if (hoverLookId) text = `${lookById.get(hoverLookId).name} · aperçu`;
  else {
    const name = applied ? recipe.name || "Recette" : "Original";
    text = modified ? `${name} · modifiée` : name;
  }
  photoLabel.textContent = text.toUpperCase();
  photoLabel.hidden = !originalImage;
}

// Recette affichée : l'original pendant la comparaison, le look survolé, sinon la recette en cours.
function shownRecipe() {
  if (comparing) return null;
  if (hoverLookId) return lookById.get(hoverLookId)?.recipe || null;
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

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    const shown = shownRecipe();
    // Pendant un glissement de curseur : rendu en demi-définition, affiché à la taille normale.
    const lite = performance.now() < interactiveUntil && photoPreview.width > 0;
    const src = lite ? liteSource() : previewSource;
    const out = renderRecipe(src, shown, strength, sourceSize);
    updateHistogram(out);
    const framed = frameStyle !== "none" ? composeFrame(out, frameStyle, shown) : null;
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

function selectLook(id) {
  const look = lookById.get(id);
  if (id !== currentLookId || modified) commit();
  currentLookId = id;
  modified = false;
  if (look.recipe) {
    recipe = FR.normalize(look.recipe);
    applied = true;
  } else {
    applied = false;
  }
  updateRecipeEditor();
  schedulePreview();
  if (!originalImage) showStatus("Importe une photo pour voir ce rendu sur ton image.");
}
