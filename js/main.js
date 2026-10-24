/* Fuji Looks — Démarrage de l'application. */
// --- Démarrage ---------------------------------------------------------------

function restoreDraft() {
  const draft = load(DRAFT_KEY);
  if (!draft || !draft.recipe) return;
  recipe = FR.normalize(draft.recipe);
  applied = Boolean(draft.applied);
  currentLookId = draft.lookId && lookById.has(draft.lookId) ? draft.lookId : null;
  modified = Boolean(draft.modified) && Boolean(currentLookId);
}

syncLibraryLooks();
restoreDraft();
buildCameraSelect();
updateEditControls();
buildLookGrid();
updateFrameOptions();
buildRecipeEditor();
renderLibraryList();
updateRecipeEditor();
importFromHash();
renderThumbnails(drawSampleScene(), 900, 600);
updatePreview();
