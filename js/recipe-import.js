/* Fuji Looks — Import de recette : texte, code ou lien de partage, fichiers, capture d'écran (OCR). */
// --- Import de recette -----------------------------------------------------

function setImportStatus(message, isError = false) {
  importStatus.textContent = message;
  importStatus.classList.toggle("is-error", isError);
}

const IMPORT_SOURCES = {
  "share code": "code de partage",
  "recipe file": "fichier de recette",
  "X RAW Studio profile": "profil X RAW Studio",
  text: "texte",
  screenshot: "capture d’écran"
};

// Même logique que le convertisseur : on complète avec les valeurs par défaut et on signale
// une température de couleur absente.
function applyImport(result, emptyMessage = "Aucun réglage de recette reconnu.") {
  if (!result) {
    setImportStatus(emptyMessage, true);
    showStatus(emptyMessage);
    return false;
  }
  const values = Object.assign({}, result.values);
  if (!values.name) values.name = "Recette importée";
  loadRecipe(values);
  const n = result.found.filter((key) => FR.fieldByKey(key)).length;
  const source = IMPORT_SOURCES[result.source] || result.source;
  let message = `${n} réglage${n > 1 ? "s" : ""} importé${n > 1 ? "s" : ""} (${source}). Vérifie-les ci-dessus.`;
  if (recipe.whiteBalance === "kelvin" && !result.found.includes("kelvin")) {
    message += ` Température de couleur introuvable : réglée sur ${recipe.kelvin} K.`;
  }
  setImportStatus(message);
  showStatus(message);
  return true;
}

async function importRecipeFile(file) {
  if (!file) return;
  if (isImageFile(file)) {
    importScreenshot(file);
    return;
  }
  try {
    const text = await file.text();
    importText.value = text;
    applyImport(FR.parseAny(text), `« ${file.name} » ne ressemble pas à un fichier de recette.`);
  } catch {
    setImportStatus(`Impossible de lire « ${file.name} ».`, true);
  }
}

// Lecture d'une capture d'écran de recette (OCR Tesseract, entièrement sur l'appareil).
let tesseractLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  tesseractLoading ||= loadScript("vendor/tesseract/tesseract.min.js").catch((err) => {
    tesseractLoading = null;
    throw err;
  });
  return tesseractLoading;
}

async function importScreenshot(blob) {
  if (location.protocol === "file:") {
    setImportStatus("La lecture de captures d’écran nécessite que l’app soit servie en http(s) (GitHub Pages ou serveur local).", true);
    return;
  }
  importStatus.closest("details").open = true;
  setImportStatus("Lecture de la capture d’écran…");
  let worker = null;
  try {
    const [img] = await Promise.all([loadImage(blob), loadTesseract()]);
    // Les petites captures sont bien mieux lues une fois agrandies.
    const scale = Math.min(3, Math.max(1, 1800 / img.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const base = new URL("vendor/tesseract/", location.href).href;
    worker = await window.Tesseract.createWorker("eng", 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: `${base}lang`,
      workerBlobURL: false,
      logger: (m) => {
        if (m.status === "recognizing text") setImportStatus(`Lecture de la capture d’écran… ${Math.round(m.progress * 100)} %`);
      }
    });
    const out = await worker.recognize(canvas);
    importText.value = out.data.text;
    applyImport(FR.parseText(out.data.text, { ocr: true }),
      "Aucun réglage reconnu dans cette image. Essaie une capture plus nette ou colle le texte.");
  } catch (err) {
    setImportStatus(`Impossible de lire la capture d’écran (${err?.message || "erreur inconnue"}).`, true);
  } finally {
    if (worker) worker.terminate();
  }
}

importButton.addEventListener("click", () => applyImport(FR.parseAny(importText.value)));

importFile.addEventListener("change", () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  importRecipeFile(file);
});

// Ctrl+V hors d'un champ de saisie : une image est lue comme capture de recette, un texte est importé.
document.addEventListener("paste", (event) => {
  const data = event.clipboardData;
  if (!data) return;
  const target = event.target;
  const editable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
  const file = [...(data.files || [])].find(isImageFile);
  if (file) {
    event.preventDefault();
    importScreenshot(file);
    return;
  }
  if (editable) return;
  const text = data.getData("text/plain");
  if (text) {
    event.preventDefault();
    applyImport(FR.parseAny(text));
  }
});

// Lien de partage : …#r=FR1.xxxx
function importFromHash() {
  const match = /[#&]r=([^&]+)/.exec(location.hash);
  if (!match) return false;
  const ok = applyImport(FR.parseAny(decodeURIComponent(match[1])), "Le lien ne contient pas de recette valide.");
  history.replaceState(null, "", location.pathname + location.search);
  return ok;
}
window.addEventListener("hashchange", importFromHash);
