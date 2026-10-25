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
      { id, buffer: src.data.buffer, width: src.width, height: src.height, recipe: workRecipe, strength, source: size, simulateWb: PIPELINE_OPTIONS.simulateWb },
      [src.data.buffer]
    );
  });
}

// --- Taille et qualité d'export ------------------------------------------------

// long : grand côté maximal ; width : largeur maximale (Instagram affiche 1080 px de large).
const EXPORT_SIZES = {
  full: { label: "Pleine résolution" },
  web: { label: "Web · 2048 px", long: 2048 },
  insta: { label: "Instagram · 1080 px", width: 1080 }
};
const EXPORT_QUALITIES = { max: 0.94, standard: 0.86, light: 0.75 };
const EXPORT_KEY = "fuji-looks.export";
const savedExport = load(EXPORT_KEY) || {};
let exportSize = EXPORT_SIZES[savedExport.size] ? savedExport.size : "full";
let exportQuality = EXPORT_QUALITIES[savedExport.quality] ? savedExport.quality : "max";

const exportSizeOptions = document.getElementById("exportSizeOptions");
const exportQualityOptions = document.getElementById("exportQualityOptions");

function updateExportOptions() {
  exportSizeOptions.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === exportSize)));
  exportQualityOptions.querySelectorAll("[data-quality]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.quality === exportQuality)));
}

[[exportSizeOptions, "size"], [exportQualityOptions, "quality"]].forEach(([group, key]) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest(`[data-${key}]`);
    if (!button) return;
    if (key === "size") exportSize = button.dataset.size;
    else exportQuality = button.dataset.quality;
    store(EXPORT_KEY, { size: exportSize, quality: exportQuality });
    updateExportOptions();
  });
});
updateExportOptions();

// Grand côté de la photo à calculer pour la taille choisie (le cadre s'ajoute autour).
function exportPhotoSide() {
  const size = EXPORT_SIZES[exportSize];
  if (size.long) return size.long;
  if (size.width) return Math.round((size.width * Math.max(sourceSize.w, sourceSize.h)) / sourceSize.w);
  return Infinity;
}

// Image finale ramenée à la taille choisie, cadre compris.
function fitExportCanvas(canvas) {
  const size = EXPORT_SIZES[exportSize];
  const k = Math.min(1, size.long ? size.long / Math.max(canvas.width, canvas.height) : size.width ? size.width / canvas.width : 1);
  if (k >= 0.999) return canvas;
  const targetW = Math.round(canvas.width * k);
  let layer = canvas;
  // Réductions par moitiés : plus net qu'une seule grande réduction.
  while (layer.width / 2 > targetW) {
    const half = makeCanvas(Math.round(layer.width / 2), Math.round(layer.height / 2));
    const hctx = half.getContext("2d");
    hctx.imageSmoothingQuality = "high";
    hctx.drawImage(layer, 0, 0, half.width, half.height);
    layer = half;
  }
  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = Math.round(canvas.height * k);
  const octx = out.getContext("2d");
  octx.imageSmoothingQuality = "high";
  octx.drawImage(layer, 0, 0, out.width, out.height);
  return out;
}

// Pixels pleine résolution : dans le worker si possible, sinon sur le fil principal.
async function renderExportPixels(maxPixels, maxSide = Infinity) {
  const workRecipe = activeRecipe();
  const strength = getStrength();
  if (workRecipe && strength > 0 && workerAvailable()) {
    try {
      return await renderInWorker(buildEditedSource(maxSide, maxPixels), workRecipe, strength, sourceSize);
    } catch (err) {
      console.warn("Export dans le worker impossible, calcul sur la page.", err);
    }
  }
  return renderRecipe(buildEditedSource(maxSide, maxPixels), workRecipe, strength, sourceSize);
}

// Photo en cours (originalImage, sourceSize, sourceExif) → JPEG final.
async function renderExport() {
  if (!originalImage) throw new Error("Aucune photo sélectionnée.");

  // Le cadre ajoute des pixels : on garde de la marge sous la limite des canvas iOS.
  const maxPixels = frameStyle === "none" ? EXPORT_MAX_PIXELS : EXPORT_MAX_PIXELS * 0.8;
  const out = applyHalation(await renderExportPixels(maxPixels, exportPhotoSide()), edit.halation);
  await loadScriptFont(); // signature manuscrite prête avant de dessiner le cadre

  let canvas;
  if (frameStyle !== "none") {
    canvas = composeFrame(out, frameStyle, activeRecipe());
  } else {
    canvas = document.createElement("canvas");
    canvas.width = out.width;
    canvas.height = out.height;
    canvas.getContext("2d").putImageData(out, 0, 0);
  }
  canvas = fitExportCanvas(canvas);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", EXPORT_QUALITIES[exportQuality]));
  if (!blob) throw new Error("La création de l’image a échoué.");
  return sourceExif ? withExif(blob, sourceExif, canvas.width, canvas.height) : blob;
}

function exportFileName(suffix = "") {
  const name = applied ? recipe.name : "original";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";
  return `fuji-looks-${slug}${suffix}.jpg`;
}

const EXPORT_LABEL = exportButton.innerHTML;

exportButton.addEventListener("click", async () => {
  if (!originalImage) return;

  exportButton.disabled = true;
  exportButton.setAttribute("aria-busy", "true");
  exportButton.textContent = "Préparation…";
  let file = null;

  try {
    // Laisser le navigateur afficher le message avant le calcul.
    await new Promise((r) => setTimeout(r, 30));
    const blob = await renderExport();
    file = new File([blob], exportFileName(), { type: "image/jpeg" });
  } catch (error) {
    showStatus("Export impossible. Essaie avec une photo plus petite.");
    console.error(error);
  } finally {
    exportButton.disabled = false;
    exportButton.removeAttribute("aria-busy");
    exportButton.innerHTML = EXPORT_LABEL;
  }

  if (file) presentResult(file, { title: "Photo prête", savedMessage: "Photo enregistrée." });
});
