/* Fuji Looks — Export de la photo : rendu pleine résolution, partage ou téléchargement. */
// --- Export de la photo --------------------------------------------------

// --- Calcul en arrière-plan (Web Worker) ------------------------------------

let exportWorker = null;
let exportJobId = 0;

function workerAvailable() {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && location.protocol.startsWith("http");
}

// Envoie les pixels au worker (le tampon est transféré, pas copié) et attend le résultat.
function renderInWorker(src, workRecipe, strength, size) {
  return new Promise((resolve, reject) => {
    exportWorker ||= new Worker("js/export-worker.js");
    const worker = exportWorker;
    const id = ++exportJobId;
    function cleanup() {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    }
    function onMessage(event) {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(new ImageData(new Uint8ClampedArray(event.data.buffer), event.data.width, event.data.height));
    }
    function onError(event) {
      cleanup();
      worker.terminate();
      exportWorker = null;
      reject(new Error(event.message || "Worker indisponible"));
    }
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(
      { id, buffer: src.data.buffer, width: src.width, height: src.height, recipe: workRecipe, strength, source: size },
      [src.data.buffer]
    );
  });
}

// Pixels pleine résolution : dans le worker si possible, sinon sur le fil principal.
async function renderExportPixels(maxPixels) {
  const workRecipe = activeRecipe();
  const strength = getStrength();
  if (workRecipe && strength > 0 && workerAvailable()) {
    try {
      return await renderInWorker(buildEditedSource(Infinity, maxPixels), workRecipe, strength, sourceSize);
    } catch (err) {
      console.warn("Export dans le worker impossible, calcul sur la page.", err);
    }
  }
  return renderRecipe(buildEditedSource(Infinity, maxPixels), workRecipe, strength, sourceSize);
}

async function renderExport() {
  if (!originalImage) throw new Error("Aucune photo sélectionnée.");

  // Le cadre ajoute des pixels : on garde de la marge sous la limite des canvas iOS.
  const maxPixels = frameStyle === "none" ? EXPORT_MAX_PIXELS : EXPORT_MAX_PIXELS * 0.8;
  const out = await renderExportPixels(maxPixels);

  let canvas;
  if (frameStyle !== "none") {
    canvas = composeFrame(out, frameStyle, activeRecipe());
  } else {
    canvas = document.createElement("canvas");
    canvas.width = out.width;
    canvas.height = out.height;
    canvas.getContext("2d").putImageData(out, 0, 0);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
  if (!blob) throw new Error("La création de l’image a échoué.");
  return sourceExif ? withExif(blob, sourceExif, canvas.width, canvas.height) : blob;
}

function exportKey() {
  return JSON.stringify([sourceToken, applied ? recipe : null, intensityState, frameStyle, edit]);
}

// Sur mobile, la feuille de partage permet « Enregistrer l'image » dans Photos.
// Ailleurs (ou si le partage n'est pas possible), on télécharge le fichier.
async function deliverPhoto(file) {
  const canShare = matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
      // Le calcul a pris trop de temps : le navigateur exige un nouveau geste.
      if (err.name === "NotAllowedError") return "needs-tap";
    }
  }
  downloadBlob(file, file.name);
  return "downloaded";
}

const EXPORT_LABEL = exportButton.innerHTML;

exportButton.addEventListener("click", async () => {
  if (!originalImage) return;

  // Photo déjà prête, en attente d'un geste pour ouvrir le partage.
  if (pendingShare && pendingShare.key === exportKey()) {
    const result = await deliverPhoto(pendingShare.file);
    pendingShare = null;
    exportButton.innerHTML = EXPORT_LABEL;
    if (result === "shared") showStatus("Photo partagée.");
    else if (result === "downloaded") showStatus("Photo exportée.");
    return;
  }

  pendingShare = null;
  exportButton.disabled = true;
  exportButton.setAttribute("aria-busy", "true");
  exportButton.textContent = "Préparation…";
  let result = null;
  let file = null;

  try {
    // Laisser le navigateur afficher le message avant le calcul.
    await new Promise((r) => setTimeout(r, 30));
    const blob = await renderExport();
    const name = applied ? recipe.name : "original";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";
    file = new File([blob], `fuji-looks-${slug}.jpg`, { type: "image/jpeg" });
    result = await deliverPhoto(file);
  } catch (error) {
    showStatus("Export impossible. Essaie avec une photo plus petite.");
    console.error(error);
  } finally {
    exportButton.disabled = false;
    exportButton.removeAttribute("aria-busy");
    exportButton.innerHTML = EXPORT_LABEL;
  }

  if (result === "needs-tap") {
    pendingShare = { key: exportKey(), file };
    exportButton.innerHTML = 'Enregistrer la photo <span aria-hidden="true">↗</span>';
    showStatus("Photo prête : touche « Enregistrer la photo ».");
  } else if (result === "shared") {
    showStatus("Photo partagée.");
  } else if (result === "downloaded") {
    showStatus(sourceExif ? "Photo exportée (données EXIF conservées)." : "Photo exportée.");
  }
});
