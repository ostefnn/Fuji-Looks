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

// Application installable et utilisable hors connexion (pas en file://).
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {
    // Sans service worker, l'app fonctionne normalement en ligne.
  });
}

// Chrome / Android : bouton « Installer l'application ». Sur iPhone : Partager → Sur l'écran d'accueil.
let installPrompt = null;
const installButton = document.getElementById("installButton");
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  showStatus("Fuji Looks est installée.");
});
