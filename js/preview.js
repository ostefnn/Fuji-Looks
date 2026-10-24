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

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    const shown = shownRecipe();
    const out = renderRecipe(previewSource, shown, strength, sourceSize);
    const framed = frameStyle !== "none" ? composeFrame(out, frameStyle, shown) : null;
    const w = framed ? framed.width : out.width;
    const h = framed ? framed.height : out.height;
    if (photoPreview.width !== w || photoPreview.height !== h) {
      photoPreview.width = w;
      photoPreview.height = h;
      applyView();
    }
    const ctx = photoPreview.getContext("2d");
    if (framed) ctx.drawImage(framed, 0, 0);
    else ctx.putImageData(out, 0, 0);
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
