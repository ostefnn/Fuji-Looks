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
renderSlots();
updateFp1Status();
updateEditControls();
buildLookGrid();
updateFrameOptions();
buildRecipeEditor();
renderLibraryList();
updateRecipeEditor();
// Mobile : une fois les looks dépassés, l'aperçu collé en haut se fait plus petit pour laisser
// de la place aux réglages. Seuil d'entrée et de sortie différents pour éviter les allers-retours,
// et défilement compensé pour que le contenu ne saute pas.
const mobileLayout = window.matchMedia("(max-width: 959px)");
const stageElement = document.querySelector(".stage");
const looksSection = document.querySelector(".looks-section");
let compactFrame = 0;

function updateCompactStage() {
  cancelAnimationFrame(compactFrame);
  compactFrame = requestAnimationFrame(() => {
    const body = document.body;
    const compact = body.classList.contains("compact-stage");
    let next = false;
    if (mobileLayout.matches && body.classList.contains("has-photo")) {
      const looksBottom = looksSection.getBoundingClientRect().bottom;
      const stageBottom = stageElement.getBoundingClientRect().bottom;
      next = compact ? looksBottom < stageBottom + 220 : looksBottom < stageBottom - 40;
    }
    if (next === compact) return;
    const before = stageElement.offsetHeight;
    body.classList.toggle("compact-stage", next);
    // La hauteur finale (sans la transition) sert à compenser le défilement.
    stageElement.querySelector(".photo-frame").style.transition = "none";
    const delta = before - stageElement.offsetHeight;
    stageElement.querySelector(".photo-frame").style.transition = "";
    if (delta) window.scrollBy(0, -delta);
  });
}

window.addEventListener("scroll", updateCompactStage, { passive: true });
mobileLayout.addEventListener("change", updateCompactStage);

// Accordéons du panneau : on retrouve ceux que tu avais ouverts.
const PANELS_KEY = "fuji-looks.panels";
const savedPanels = load(PANELS_KEY) || {};
document.querySelectorAll("details.acc").forEach((panel) => {
  if (typeof savedPanels[panel.id] === "boolean") panel.open = savedPanels[panel.id];
  panel.addEventListener("toggle", () => {
    savedPanels[panel.id] = panel.open;
    store(PANELS_KEY, savedPanels);
  });
});

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
