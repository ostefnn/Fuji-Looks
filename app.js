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
const recipeFields = document.getElementById("recipeFields");
const recipeSim = document.getElementById("recipeSim");
const recipeName = document.getElementById("recipeName");
const recipeAuthor = document.getElementById("recipeAuthor");
const recipeNotes = document.getElementById("recipeNotes");
const importText = document.getElementById("importText");
const importButton = document.getElementById("importButton");
const importFile = document.getElementById("importFile");
const xmpTarget = document.getElementById("xmpTarget");
const xmpHint = document.getElementById("xmpHint");

const LUT_N = 33;
const LUT_CACHE_MAX = 40;
const PREVIEW_MAX_SIDE = 1400;
const THUMB_MAX_SIDE = 220;
// Limite de surface des canvas sur iOS Safari (~16,7 Mpx).
const EXPORT_MAX_PIXELS = 16000000;

// --- Catalogue des looks -------------------------------------------------

const LOOKS = [{ id: "original", name: "Original", desc: "Naturel", group: "base", recipe: null }];

(window.CUSTOM_RECIPES || []).forEach(({ name, text }, i) => {
  const parsed = FR.parseText(text);
  if (!parsed) return;
  const recipe = FR.normalize(Object.assign({}, FR.DEFAULT_RECIPE, parsed.values, { name }));
  LOOKS.push({
    id: `custom-${i}`,
    name,
    desc: FR.simById(recipe.filmSim).name,
    group: "custom",
    recipe
  });
});

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
    recipe: FR.normalize({ name: sim.name, filmSim: sim.id })
  });
});

const GROUPS = [
  { id: "base", title: null },
  { id: "custom", title: "Mes recettes" },
  { id: "recipes", title: "Recettes" },
  { id: "sims", title: "Simulations de film" }
];

const lookById = new Map(LOOKS.map((look) => [look.id, look]));
const lutCache = new Map();

let originalImage = null;
let previewSource = null; // ImageData de l'aperçu (réduit)
let currentLookId = "original";
// Recette en cours d'édition ; elle n'est appliquée que si `applied` est vrai.
let recipe = FR.normalize({ name: "Ma recette" });
let applied = false;
let modified = false;
let imageUrl = null;
let renderPending = false;
let thumbJob = 0;

// --- Moteur de rendu -----------------------------------------------------

function getStrength() {
  return Number(intensity.value) / 100;
}

function getLookData(lookRecipe) {
  const derived = FR.derive(lookRecipe, { drInCurve: true });
  const key = JSON.stringify(derived);
  if (!lutCache.has(key)) {
    if (lutCache.size >= LUT_CACHE_MAX) lutCache.delete(lutCache.keys().next().value);
    lutCache.set(key, FR.buildLut(derived, LUT_N));
  }
  return { derived, lut: lutCache.get(key) };
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

// Applique une recette (ou rien si null) à une ImageData et renvoie une nouvelle ImageData.
function renderRecipe(src, lookRecipe, strength) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (!lookRecipe || strength <= 0) return out;

  const { derived, lut } = getLookData(lookRecipe);
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

function activeRecipe() {
  return applied ? recipe : null;
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

// --- Grille des looks ----------------------------------------------------

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
      canvas.getContext("2d").putImageData(renderRecipe(src, lookById.get(card.dataset.look).recipe, 1), 0, 0);
    }
    if (index < cards.length) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// --- Éditeur de recette --------------------------------------------------

const fieldRows = [];

function buildRecipeEditor() {
  FR.FIELDS.forEach((field) => {
    const row = document.createElement("label");
    row.className = "recipe-row";

    const label = document.createElement("span");
    label.className = "recipe-label";
    label.textContent = field.label;
    row.appendChild(label);

    let control;
    let output = null;

    if (field.type === "select") {
      control = document.createElement("select");
      field.options.forEach(([value, text]) => control.add(new Option(text, value)));
    } else if (field.type === "number") {
      const wrap = document.createElement("span");
      wrap.className = "recipe-range";
      control = document.createElement("input");
      control.type = "range";
      control.min = field.min;
      control.max = field.max;
      control.step = field.step;
      output = document.createElement("output");
      wrap.append(control, output);
      row.appendChild(wrap);
    } else {
      control = document.createElement("input");
      control.type = "text";
      control.maxLength = 120;
      control.placeholder = field.placeholder || "";
    }

    if (!output) row.appendChild(control);
    control.addEventListener("input", () => {
      recipe[field.key] = field.type === "number" ? Number(control.value) : control.value;
      onRecipeEdited();
    });
    recipeFields.appendChild(row);
    fieldRows.push({ field, row, control, output });
  });

  recipeName.addEventListener("input", () => {
    recipe.name = recipeName.value;
    updatePreviewLabel();
  });
  recipeAuthor.addEventListener("input", () => { recipe.author = recipeAuthor.value; });
  recipeNotes.addEventListener("input", () => { recipe.notes = recipeNotes.value; });
}

function updateRecipeEditor() {
  recipeName.value = recipe.name;
  recipeAuthor.value = recipe.author;
  recipeNotes.value = recipe.notes;
  recipeSim.textContent = FR.simById(recipe.filmSim).name.toUpperCase();

  fieldRows.forEach(({ field, row, control, output }) => {
    row.hidden = Boolean(field.when && !field.when(recipe));
    control.value = recipe[field.key];
    if (output) output.textContent = FR.formatValue(field, recipe);
  });
}

function onRecipeEdited() {
  recipe = FR.normalize(recipe);
  applied = true;
  modified = true;
  updateRecipeEditor();
  schedulePreview();
}

function loadRecipe(newRecipe) {
  recipe = FR.normalize(newRecipe);
  applied = true;
  modified = false;
  currentLookId = null;
  updateRecipeEditor();
  schedulePreview();
}

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
  const name = applied ? recipe.name || "Recette" : "Original";
  photoLabel.textContent = (modified ? `${name} · modifiée` : name).toUpperCase();
  photoLabel.hidden = !originalImage;
}

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    photoPreview.getContext("2d").putImageData(renderRecipe(previewSource, activeRecipe(), strength), 0, 0);
  }

  updatePreviewLabel();

  lookGroups.querySelectorAll(".look-card").forEach((card) => {
    const selected = card.dataset.look === currentLookId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function selectLook(id) {
  const look = lookById.get(id);
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
  statusMessage.textContent = originalImage
    ? `Look « ${look.name} » appliqué à l’aperçu.`
    : "Importe une photo pour voir ce rendu.";
}

// --- Import de photo -----------------------------------------------------

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

    intensity.value = 100;

    updatePreview();
    renderThumbnails(newImage, w, h);
    statusMessage.textContent = "Photo chargée. Choisis un look ou règle la recette.";
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
  intensity.value = 100;
  selectLook("original");

  statusMessage.textContent = originalImage
    ? "Aperçu réinitialisé."
    : "Choisis une photo pour commencer.";
});

// --- Import / export de recette ------------------------------------------

function applyImported(text) {
  const result = FR.parseAny(text);
  if (!result) {
    statusMessage.textContent = "Aucun réglage reconnu dans cette recette.";
    return;
  }
  loadRecipe(Object.assign({}, FR.DEFAULT_RECIPE, { name: "Recette importée" }, result.values));
  statusMessage.textContent = `Recette importée (${result.found.length} réglages reconnus).`;
}

importButton.addEventListener("click", () => applyImported(importText.value));

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  const text = await file.text();
  importText.value = text;
  applyImported(text);
});

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Garder l'URL disponible un moment pour laisser le navigateur
  // démarrer le téléchargement, notamment sur mobile.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    statusMessage.textContent = message;
  } catch {
    importText.value = text;
    importText.closest("details").open = true;
    statusMessage.textContent = "Copie impossible : le texte est affiché dans « Importer une recette ».";
  }
}

FR.XMP_TARGETS.forEach((target) => xmpTarget.add(new Option(target.name, target.id)));
function updateXmpHint() {
  xmpHint.textContent = FR.XMP_TARGETS.find((t) => t.id === xmpTarget.value).hint;
}
xmpTarget.addEventListener("change", updateXmpHint);
updateXmpHint();

document.getElementById("xmpButton").addEventListener("click", () => {
  downloadBlob(new Blob([FR.toXmp(recipe, xmpTarget.value)], { type: "application/rdf+xml" }), FR.fileName(recipe, ".xmp"));
  statusMessage.textContent = "Preset Lightroom téléchargé.";
});

document.getElementById("cubeButton").addEventListener("click", () => {
  downloadBlob(new Blob([FR.toCube(recipe, LUT_N)], { type: "text/plain" }), FR.fileName(recipe, `-${LUT_N}.cube`));
  statusMessage.textContent = "LUT téléchargée.";
});

document.getElementById("copyTextButton").addEventListener("click", () => {
  copyText(FR.toText(recipe), "Recette copiée dans le presse-papiers.");
});

document.getElementById("copyCodeButton").addEventListener("click", () => {
  copyText(FR.toShareCode(recipe), "Code de partage copié dans le presse-papiers.");
});

// --- Export de la photo --------------------------------------------------

function renderExport() {
  return new Promise((resolve, reject) => {
    if (!originalImage) {
      reject(new Error("Aucune photo sélectionnée."));
      return;
    }

    const { naturalWidth: w, naturalHeight: h } = originalImage;
    const src = drawToImageData(originalImage, w, h, Infinity, EXPORT_MAX_PIXELS);
    const out = renderRecipe(src, activeRecipe(), getStrength());

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
    const name = applied ? recipe.name : "original";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";

    downloadBlob(blob, `fuji-looks-${slug}.jpg`);
    statusMessage.textContent =
      "Export préparé. Si le téléchargement ne démarre pas, ouvre l’image ou utilise le menu de partage de Safari.";
  } catch (error) {
    statusMessage.textContent = "Export impossible. Essaie avec une photo plus petite.";
    console.error(error);
  } finally {
    exportButton.disabled = false;
  }
});

buildLookGrid();
buildRecipeEditor();
updateRecipeEditor();
renderThumbnails(drawSampleScene(), 300, 200);
updatePreview();
