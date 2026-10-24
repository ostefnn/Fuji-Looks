/* Fuji Looks — Écran « prêt » : enregistrer dans Photos (iPhone / Android) ou télécharger. */

const resultDialog = document.getElementById("resultDialog");
const resultTitle = document.getElementById("resultTitle");
const resultImage = document.getElementById("resultImage");
const resultHint = document.getElementById("resultHint");
const resultSave = document.getElementById("resultSave");
const resultDownload = document.getElementById("resultDownload");
let resultFile = null;
let resultUrl = null;

function isTouchDevice() {
  return matchMedia("(pointer: coarse)").matches;
}

function canShareFile(file) {
  try {
    return Boolean(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

function closeResult() {
  if (resultDialog.open) resultDialog.close();
}

resultDialog.addEventListener("close", () => {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null;
  resultFile = null;
  resultImage.removeAttribute("src");
});

/*
 * Présente un fichier image produit par l'app.
 * Sur écran tactile : aperçu + « Enregistrer dans Photos » (la feuille de partage s'ouvre
 * directement depuis ce bouton, donc toujours autorisée par le navigateur).
 * Sur ordinateur : téléchargement direct.
 */
function presentResult(file, { title = "Photo prête", savedMessage = "Photo enregistrée." } = {}) {
  if (!isTouchDevice()) {
    downloadBlob(file, file.name);
    showStatus(`${title.replace(/ prête$/, "")} téléchargée.`);
    return;
  }
  resultFile = file;
  resultUrl = URL.createObjectURL(file);
  resultImage.src = resultUrl;
  resultImage.alt = title;
  resultTitle.textContent = title;
  resultDialog.dataset.saved = savedMessage;

  const shareable = canShareFile(file);
  resultSave.hidden = !shareable;
  resultHint.textContent = shareable
    ? "Touche « Enregistrer dans Photos », puis « Enregistrer l’image ». Tu peux aussi faire un appui long sur l’image."
    : "Fais un appui long sur l’image puis « Ajouter à Photos », ou télécharge le fichier.";
  resultDialog.showModal();
}

resultSave.addEventListener("click", async () => {
  if (!resultFile) return;
  try {
    await navigator.share({ files: [resultFile] });
    showStatus(resultDialog.dataset.saved || "Photo enregistrée.");
    closeResult();
  } catch (err) {
    if (err.name !== "AbortError") showStatus("Partage impossible : utilise l’appui long sur l’image ou le téléchargement.");
  }
});

resultDownload.addEventListener("click", () => {
  if (!resultFile) return;
  downloadBlob(resultFile, resultFile.name);
  showStatus("Fichier téléchargé.");
});

document.getElementById("resultClose").addEventListener("click", closeResult);
// Toucher le fond sombre ferme l'écran.
resultDialog.addEventListener("click", (event) => {
  if (event.target === resultDialog) closeResult();
});
