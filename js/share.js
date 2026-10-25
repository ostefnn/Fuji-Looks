/* Fuji Looks — Écran « prêt » : enregistrer dans Photos (iPhone / Android) ou télécharger. */

const resultDialog = document.getElementById("resultDialog");
const resultTitle = document.getElementById("resultTitle");
const resultImage = document.getElementById("resultImage");
const resultHint = document.getElementById("resultHint");
const resultSave = document.getElementById("resultSave");
const resultDownload = document.getElementById("resultDownload");
let resultFiles = [];
let resultUrl = null;

function isTouchDevice() {
  return matchMedia("(pointer: coarse)").matches;
}

function canShareFile(files) {
  try {
    return Boolean(navigator.canShare && navigator.canShare({ files: [].concat(files) }));
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
  resultFiles = [];
  resultImage.removeAttribute("src");
});

// Plusieurs fichiers sur ordinateur : téléchargés l'un après l'autre (les navigateurs bloquent les rafales).
function downloadFiles(files) {
  files.forEach((file, i) => setTimeout(() => downloadBlob(file, file.name), i * 400));
}

/*
 * Présente un fichier image (ou une série) produit par l'app.
 * Sur écran tactile : aperçu + « Enregistrer dans Photos » (la feuille de partage s'ouvre
 * directement depuis ce bouton, donc toujours autorisée par le navigateur).
 * Sur ordinateur : téléchargement direct.
 */
function presentResult(fileOrFiles, { title = "Photo prête", savedMessage = "Photo enregistrée." } = {}) {
  const files = [].concat(fileOrFiles);
  const file = files[0];
  if (!isTouchDevice()) {
    downloadFiles(files);
    showStatus(files.length > 1 ? `${files.length} photos téléchargées.` : `${title.replace(/ prête$/, "")} téléchargée.`);
    return;
  }
  resultFiles = files;
  resultUrl = URL.createObjectURL(file);
  resultImage.src = resultUrl;
  resultImage.alt = title;
  resultTitle.textContent = title;
  resultDialog.dataset.saved = savedMessage;

  const shareable = canShareFile(files);
  const many = files.length > 1;
  resultSave.hidden = !shareable;
  resultSave.textContent = many ? `Enregistrer les ${files.length} photos` : "Enregistrer dans Photos";
  resultDownload.textContent = many ? "Télécharger les fichiers" : "Télécharger le fichier";
  resultHint.textContent = many
    ? (shareable
      ? `${files.length} photos prêtes. Touche « Enregistrer les ${files.length} photos », puis « Enregistrer les images ».`
      : `${files.length} photos prêtes : télécharge les fichiers.`)
    : shareable
      ? "Touche « Enregistrer dans Photos », puis « Enregistrer l’image ». Tu peux aussi faire un appui long sur l’image."
      : "Fais un appui long sur l’image puis « Ajouter à Photos », ou télécharge le fichier.";
  resultDialog.showModal();
}

resultSave.addEventListener("click", async () => {
  if (!resultFiles.length) return;
  try {
    await navigator.share({ files: resultFiles });
    showStatus(resultDialog.dataset.saved || "Photo enregistrée.");
    closeResult();
  } catch (err) {
    if (err.name !== "AbortError") showStatus("Partage impossible : utilise l’appui long sur l’image ou le téléchargement.");
  }
});

resultDownload.addEventListener("click", () => {
  if (!resultFiles.length) return;
  downloadFiles(resultFiles);
  showStatus(resultFiles.length > 1 ? "Fichiers téléchargés." : "Fichier téléchargé.");
});

document.getElementById("resultClose").addEventListener("click", closeResult);
// Toucher le fond sombre ferme l'écran.
resultDialog.addEventListener("click", (event) => {
  if (event.target === resultDialog) closeResult();
});
