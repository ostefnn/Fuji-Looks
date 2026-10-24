/*
 * Fuji Looks — rendu des looks via le moteur de Fuji Recipe Converter
 * (vendor/fuji-recipe-converter, licence MIT) : recette -> LUT 3D -> pixels.
 */
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const placeholder = document.getElementById("placeholder");
const photoLabel = document.getElementById("photoLabel");
const photoFrame = document.getElementById("photoFrame");
const intensity = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");
const exportButton = document.getElementById("exportButton");
const resetButton = document.getElementById("resetButton");
const statusMessage = document.getElementById("statusMessage");
const lookGroups = document.getElementById("lookGroups");
const lookCount = document.getElementById("lookCount");

const LUT_N = 33;
const PREVIEW_MAX_SIDE = 1400;
const THUMB_MAX_SIDE = 220;
// Limite de surface des canvas sur iOS Safari (~16,7 Mpx).
const EXPORT_MAX_PIXELS = 16000000;

// --- Catalogue des looks -------------------------------------------------

const LOOKS = [{ id: "original", name: "Original", desc: "Naturel", group: "base", recipe: null }];

FR.STARTERS.forEach((recipe, i) => {
  LOOKS.push({
    id: `recipe-${i}`,
    name: recipe.name,
    desc: FR.simById(recipe.filmSim).name,
    group: "recipes",
    recipe
  });
});

FR.SIMS.forEach((sim) => {
  LOOKS.push({
    id: `sim-${sim.id}`,
    name: sim.name,
    desc: sim.mono ? "Noir & blanc" : "Simulation de film",
    group: "sims",
    recipe: FR.normalize({ filmSim: sim.id })
  });
});

const GROUPS = [
  { id: "base", title: null },
  { id: "recipes", title: "Recettes" },
  { id: "sims", title: "Simulations de film" }
];

const lookById = new Map(LOOKS.map((look) => [look.id, look]));
const lutCache = new Map();

let originalImage = null;
let previewSource = null; // ImageData de l'aperçu (réduit)
let currentLookId = "original";
let imageUrl = null;
let renderPending = false;
let thumbJob = 0;

// --- Moteur de rendu -----------------------------------------------------

function getStrength() {
  return Number(intensity.value) / 100;
}

function getLookData(look) {
  if (!lutCache.has(look.id)) {
    const derived = FR.derive(look.recipe, { drInCurve: true });
    lutCache.set(look.id, { derived, lut: FR.buildLut(derived, LUT_N) });
  }
  return lutCache.get(look.id);
}

// Flou large et peu coûteux (réduction puis agrandissement) pour la clarté.
function makeBlur(imageData) {
  const { width: w, height: h } = imageData;
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  full.getContext("2d").putImageData(imageData, 0, 0);

  const small = document.createElement("canvas");
  small.width = Math.max(1, w >> 4);
  small.height = Math.max(1, h >> 4);
  small.getContext("2d").drawImage(full, 0, 0, small.width, small.height);

  const bctx = full.getContext("2d", { willReadFrequently: true });
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, w, h);
  return bctx.getImageData(0, 0, w, h).data;
}

// Applique un look à une ImageData et renvoie une nouvelle ImageData.
function renderLook(src, look, strength) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (!look.recipe || strength <= 0) return out;

  const { derived, lut } = getLookData(look);
  FR.applyLut(src.data, out.data, w, h, lut, LUT_N, 0);

  const blur = derived.clarity ? makeBlur(out) : null;
  // Grain calibré pour une image de 900 px de large, comme dans le convertisseur.
  FR.applySpatial(out.data, w, h, derived, blur, 0, w / 900);

  if (strength < 1) {
    const a = src.data;
    const b = out.data;
    for (let i = 0; i < b.length; i += 4) {
      b[i] = a[i] + (b[i] - a[i]) * strength;
      b[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * strength;
      b[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * strength;
    }
  }
  return out;
}

function drawToImageData(drawable, srcW, srcH, maxSide, maxPixels) {
  let k = Math.min(1, maxSide / Math.max(srcW, srcH));
  if (maxPixels) k = Math.min(k, Math.sqrt(maxPixels / (srcW * srcH)));
  const w = Math.max(1, Math.round(srcW * k));
  const h = Math.max(1, Math.round(srcH * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(drawable, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// Scène d'exemple dessinée en code, pour les vignettes avant import.
function drawSampleScene() {
  const c = document.createElement("canvas");
  const w = 300;
  const h = 200;
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  let g = x.createLinearGradient(0, 0, 0, 120);
  g.addColorStop(0, "#2f6fc0");
  g.addColorStop(0.6, "#9cc4e8");
  g.addColorStop(1, "#f3dcc0");
  x.fillStyle = g;
  x.fillRect(0, 0, w, 125);
  g = x.createRadialGradient(220, 85, 0, 220, 85, 70);
  g.addColorStop(0, "rgba(255,240,205,1)");
  g.addColorStop(1, "rgba(255,210,150,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, 125);
  x.fillStyle = "#4f6b3a";
  x.beginPath();
  x.moveTo(0, 130);
  x.quadraticCurveTo(90, 95, 170, 125);
  x.quadraticCurveTo(240, 145, 300, 115);
  x.lineTo(300, 200);
  x.lineTo(0, 200);
  x.fill();
  x.fillStyle = "#b86b4b";
  x.fillRect(40, 140, 50, 40);
  x.fillStyle = "#d9b38c";
  x.fillRect(180, 150, 70, 30);
  return c;
}

// --- Interface -----------------------------------------------------------

function buildLookGrid() {
  GROUPS.forEach((group) => {
    const looks = LOOKS.filter((look) => look.group === group.id);
    if (group.title) {
      const title = document.createElement("h3");
      title.className = "look-group-title";
      title.textContent = group.title;
      lookGroups.appendChild(title);
    }
    const grid = document.createElement("div");
    grid.className = "look-grid";
    looks.forEach((look) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "look-card";
      card.dataset.look = look.id;

      const thumb = document.createElement("canvas");
      thumb.className = "look-swatch";
      thumb.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.className = "look-name";
      name.textContent = look.name;

      const desc = document.createElement("span");
      desc.className = "look-desc";
      desc.textContent = look.desc;

      card.append(thumb, name, desc);
      card.addEventListener("click", () => selectLook(look.id));
      grid.appendChild(card);
    });
    lookGroups.appendChild(grid);
  });
  lookCount.textContent = `${String(LOOKS.length).padStart(2, "0")} STYLES`;
}

// Rendu progressif des vignettes pour ne pas bloquer l'interface.
function renderThumbnails(drawable, w, h) {
  const job = ++thumbJob;
  const src = drawToImageData(drawable, w, h, THUMB_MAX_SIDE);
  const cards = [...lookGroups.querySelectorAll(".look-card")];
  let index = 0;

  function step() {
    if (job !== thumbJob) return;
    const started = performance.now();
    while (index < cards.length && performance.now() - started < 12) {
      const card = cards[index++];
      const canvas = card.querySelector("canvas");
      canvas.width = src.width;
      canvas.height = src.height;
      canvas.getContext("2d").putImageData(renderLook(src, lookById.get(card.dataset.look), 1), 0, 0);
    }
    if (index < cards.length) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function schedulePreview() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    updatePreview();
  });
}

function updatePreview() {
  const strength = getStrength();
  const look = lookById.get(currentLookId);

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    photoPreview.getContext("2d").putImageData(renderLook(previewSource, look, strength), 0, 0);
  }

  photoLabel.textContent = look.name.toUpperCase();
  photoLabel.hidden = !originalImage;

  lookGroups.querySelectorAll(".look-card").forEach((card) => {
    const selected = card.dataset.look === currentLookId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function selectLook(id) {
  currentLookId = id;
  schedulePreview();
  statusMessage.textContent = originalImage
    ? `Look « ${lookById.get(id).name} » appliqué à l’aperçu.`
    : "Importe une photo pour voir ce rendu.";
}

function loadFile(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    statusMessage.textContent = "Choisis un fichier image valide.";
    return;
  }

  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }

  imageUrl = URL.createObjectURL(file);
  const newImage = new Image();

  newImage.onload = () => {
    originalImage = newImage;
    const { naturalWidth: w, naturalHeight: h } = newImage;

    previewSource = drawToImageData(newImage, w, h, PREVIEW_MAX_SIDE);
    photoPreview.width = previewSource.width;
    photoPreview.height = previewSource.height;
    photoPreview.hidden = false;
    placeholder.hidden = true;
    exportButton.disabled = false;

    currentLookId = "original";
    intensity.value = 100;

    updatePreview();
    renderThumbnails(newImage, w, h);
    statusMessage.textContent = "Photo chargée. Choisis un look pour commencer.";
  };

  newImage.onerror = () => {
    statusMessage.textContent = "Impossible de lire cette image. Essaie un autre fichier.";
    URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  };

  newImage.src = imageUrl;
}

photoInput.addEventListener("change", () => {
  loadFile(photoInput.files?.[0]);
  photoInput.value = "";
});

// Glisser-déposer sur le cadre photo (et sur toute la page).
["dragenter", "dragover"].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    photoFrame.classList.add("dragging");
  });
});

document.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) photoFrame.classList.remove("dragging");
});

document.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault();
  photoFrame.classList.remove("dragging");
  loadFile(event.dataTransfer.files[0]);
});

intensity.addEventListener("input", schedulePreview);

resetButton.addEventListener("click", () => {
  currentLookId = "original";
  intensity.value = 100;
  schedulePreview();

  statusMessage.textContent = originalImage
    ? "Aperçu réinitialisé."
    : "Choisis une photo pour commencer.";
});

function renderExport() {
  return new Promise((resolve, reject) => {
    if (!originalImage) {
      reject(new Error("Aucune photo sélectionnée."));
      return;
    }

    const { naturalWidth: w, naturalHeight: h } = originalImage;
    const src = drawToImageData(originalImage, w, h, Infinity, EXPORT_MAX_PIXELS);
    const out = renderLook(src, lookById.get(currentLookId), getStrength());

    const canvas = document.createElement("canvas");
    canvas.width = out.width;
    canvas.height = out.height;
    canvas.getContext("2d").putImageData(out, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("La création de l’image a échoué."));
      }
    }, "image/jpeg", 0.94);
  });
}

exportButton.addEventListener("click", async () => {
  if (!originalImage) return;

  exportButton.disabled = true;
  statusMessage.textContent = "Préparation de la photo…";

  try {
    // Laisser le navigateur afficher le message avant le calcul.
    await new Promise((r) => setTimeout(r, 30));
    const blob = await renderExport();
    const exportUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = lookById.get(currentLookId).name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    link.href = exportUrl;
    link.download = `fuji-looks-${slug}.jpg`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    statusMessage.textContent =
      "Export préparé. Si le téléchargement ne démarre pas, ouvre l’image ou utilise le menu de partage de Safari.";

    // Garder l'URL disponible un moment pour laisser le navigateur
    // démarrer le téléchargement, notamment sur mobile.
    setTimeout(() => URL.revokeObjectURL(exportUrl), 60000);
  } catch (error) {
    statusMessage.textContent = "Export impossible. Essaie avec une photo plus petite.";
    console.error(error);
  } finally {
    exportButton.disabled = false;
  }
});

buildLookGrid();
renderThumbnails(drawSampleScene(), 300, 200);
updatePreview();
