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
const lookTabs = document.getElementById("lookTabs");
const compareButton = document.getElementById("compareButton");
const changePhotoButton = document.getElementById("changePhotoButton");
const revertButton = document.getElementById("revertButton");
const zoomControls = document.getElementById("zoomControls");
const zoomInButton = document.getElementById("zoomIn");
const zoomOutButton = document.getElementById("zoomOut");
const zoomFitButton = document.getElementById("zoomFit");
const sampleButton = document.getElementById("sampleButton");
const saveButton = document.getElementById("saveButton");
const importStatus = document.getElementById("importStatus");
const xmpDetails = document.getElementById("xmpDetails");
const lutSize = document.getElementById("lutSize");
const libraryList = document.getElementById("libraryList");
const libraryEmpty = document.getElementById("libraryEmpty");
const libraryCount = document.getElementById("libraryCount");
const libraryFile = document.getElementById("libraryFile");

const LIB_KEY = "fuji-looks.library.v1";
const DRAFT_KEY = "fuji-looks.draft.v1";

const LUT_N = 33;
const LUT_CACHE_MAX = 40;
const PREVIEW_MAX_SIDE = 2048;
// Zoom relatif à la taille « ajustée au cadre » (1 = toute la photo visible).
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.5;
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

// Onglets ; « Original » est repris en tête de chaque onglet pour revenir facilement à la photo.
const ALL_GROUPS = [
  { id: "custom", title: "Mes recettes" },
  { id: "recipes", title: "Recettes" },
  { id: "sims", title: "Simulations" }
];
let GROUPS = [];

const lookById = new Map(LOOKS.map((look) => [look.id, look]));

// --- Stockage local (bibliothèque et brouillon) ---------------------------

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

// Même format que la bibliothèque du convertisseur : { id, savedAt, recipe }.
let library = (Array.isArray(load(LIB_KEY)) ? load(LIB_KEY) : [])
  .filter((item) => item && item.recipe)
  .map((item) => ({ id: String(item.id), savedAt: item.savedAt, recipe: FR.normalize(item.recipe) }));

// Les recettes de la bibliothèque passent en tête de « Mes recettes ».
function syncLibraryLooks() {
  for (let i = LOOKS.length - 1; i >= 0; i--) {
    if (LOOKS[i].id.startsWith("lib-")) {
      lookById.delete(LOOKS[i].id);
      LOOKS.splice(i, 1);
    }
  }
  const looks = library.map((item) => ({
    id: `lib-${item.id}`,
    name: item.recipe.name,
    desc: FR.simById(item.recipe.filmSim).name,
    group: "custom",
    recipe: item.recipe
  }));
  LOOKS.splice(1, 0, ...looks);
  looks.forEach((look) => lookById.set(look.id, look));
}
const lutCache = new Map();

let originalImage = null;
let previewSource = null; // ImageData de l'aperçu (réduit)
let sourceSize = null; // dimensions de la photo d'origine
let currentLookId = "original";
// Recette en cours d'édition ; elle n'est appliquée que si `applied` est vrai.
let recipe = FR.normalize({ name: "Ma recette" });
let applied = false;
let modified = false;
let renderPending = false;
let thumbJob = 0;
let comparing = false;
let toastTimer = 0;
const view = { zoom: 1, x: 0, y: 0 };

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
// Mêmes étapes et mêmes options de canvas que le convertisseur, pour un résultat identique.
function makeBlur(imageData) {
  const { width: w, height: h } = imageData;
  const graded = document.createElement("canvas");
  graded.width = w;
  graded.height = h;
  graded.getContext("2d", { willReadFrequently: true }).putImageData(imageData, 0, 0);

  const small = document.createElement("canvas");
  small.width = Math.max(1, w >> 4);
  small.height = Math.max(1, h >> 4);
  small.getContext("2d").drawImage(graded, 0, 0, small.width, small.height);

  const big = document.createElement("canvas");
  big.width = w;
  big.height = h;
  const bctx = big.getContext("2d", { willReadFrequently: true });
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, w, h);
  return bctx.getImageData(0, 0, w, h).data;
}

// Le convertisseur affiche la photo réduite à 1100 px et calibre son grain sur 900 px.
// On reproduit la même taille de grain relative, quelle que soit la résolution rendue.
const REF_PREVIEW_SIDE = 1100;

function grainScale(width, sourceW, sourceH, derived) {
  const base = derived.grain.size > 30 ? 2.4 : 1.2;
  const refW = Math.max(1, Math.round(sourceW * Math.min(1, REF_PREVIEW_SIDE / Math.max(sourceW, sourceH))));
  const refCell = Math.max(1, Math.round(base * refW / 900));
  return (refCell * width) / refW / base;
}

// Applique une recette (ou rien si null) à une ImageData et renvoie une nouvelle ImageData.
// `source` = dimensions de la photo d'origine, pour la taille du grain.
function renderRecipe(src, lookRecipe, strength, source = { w: src.width, h: src.height }) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (!lookRecipe || strength <= 0) return out;

  const { derived, lut } = getLookData(lookRecipe);
  FR.applyLut(src.data, out.data, w, h, lut, LUT_N, 0);

  const blur = derived.clarity ? makeBlur(out) : null;
  FR.applySpatial(out.data, w, h, derived, blur, 0, grainScale(w, source.w, source.h, derived));

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

// Scène d'exemple du convertisseur (paysage, patchs de couleur, rampe de gris), dessinée en code.
function drawSampleScene() {
  var c = document.createElement("canvas"), w = 900, h = 600, x = c.getContext("2d"), g, i;
  c.width = w; c.height = h;
  g = x.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, "#2f6fc0"); g.addColorStop(0.6, "#9cc4e8"); g.addColorStop(1, "#f3dcc0");
  x.fillStyle = g; x.fillRect(0, 0, w, 380);
  g = x.createRadialGradient(660, 250, 0, 660, 250, 220);
  g.addColorStop(0, "rgba(255,244,214,1)"); g.addColorStop(0.12, "rgba(255,226,170,.9)"); g.addColorStop(1, "rgba(255,210,150,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, 380);
  x.fillStyle = "rgba(255,255,255,.85)";
  [[170, 110, 60], [230, 95, 45], [280, 118, 50], [480, 70, 36], [525, 80, 30]].forEach(function (p) {
    x.beginPath(); x.ellipse(p[0], p[1], p[2], p[2] * 0.42, 0, 0, 6.3); x.fill();
  });
  function ridge(y, amp, color, seed) {
    x.fillStyle = color; x.beginPath(); x.moveTo(0, h);
    for (i = 0; i <= w; i += 10) x.lineTo(i, y + Math.sin(i * 0.008 + seed) * amp + Math.sin(i * 0.021 + seed * 2) * amp * 0.4);
    x.lineTo(w, h); x.fill();
  }
  ridge(300, 34, "#6f8fb4", 1); ridge(335, 26, "#4f7f73", 2.2); ridge(372, 20, "#3f8a3a", 4); ridge(420, 14, "#7fa83a", 5.5);
  g = x.createLinearGradient(0, 430, 0, 520);
  g.addColorStop(0, "#d9b24a"); g.addColorStop(1, "#9a6a2a");
  x.fillStyle = g; x.fillRect(0, 445, w, 80);
  x.fillStyle = "#b3261e"; x.fillRect(120, 392, 86, 58);
  x.fillStyle = "#5b1a14"; x.beginPath(); x.moveTo(110, 394); x.lineTo(163, 356); x.lineTo(216, 394); x.fill();
  x.fillStyle = "#f4ead8"; x.fillRect(152, 415, 22, 35);
  x.fillStyle = "#1f3d2a"; [[330, 60], [372, 84], [760, 70], [800, 52]].forEach(function (t) {
    x.beginPath(); x.moveTo(t[0], 452); x.lineTo(t[0] + 18, 452 - t[1]); x.lineTo(t[0] + 36, 452); x.fill();
  });
  var patches = ["#735244", "#c29682", "#627a9d", "#576c43", "#8580b1", "#67bdaa", "#d67e2c", "#505ba6", "#c15a63",
                 "#5e3c6c", "#9dbc40", "#e0a32e", "#383d96", "#469449", "#af363c", "#e7c71f", "#bb5695", "#0885a1"];
  patches.forEach(function (p, j) { x.fillStyle = p; x.fillRect(j * 50, 525, 50, 45); });
  g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#000"); g.addColorStop(1, "#fff");
  x.fillStyle = g; x.fillRect(0, 570, w, 30);
  return c;
}

// --- Grille des looks ----------------------------------------------------

function createLookCard(look) {
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
  name.title = look.name;

  const desc = document.createElement("span");
  desc.className = "look-desc";
  desc.textContent = look.desc;

  card.append(thumb, name, desc);
  card.addEventListener("click", () => selectLook(look.id));
  return card;
}

function buildLookGrid() {
  const original = lookById.get("original");
  const activeTab = lookTabs.querySelector('[aria-selected="true"]')?.id.replace("tab-", "");
  lookTabs.textContent = "";
  lookGroups.textContent = "";
  GROUPS = ALL_GROUPS.filter((group) => LOOKS.some((look) => look.group === group.id));

  GROUPS.forEach((group) => {
    const looks = LOOKS.filter((look) => look.group === group.id);

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.id = `tab-${group.id}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `panel-${group.id}`);
    tab.textContent = group.title;
    const count = document.createElement("small");
    count.textContent = looks.length;
    tab.appendChild(count);
    tab.addEventListener("click", () => showTab(group.id));
    lookTabs.appendChild(tab);

    const grid = document.createElement("div");
    grid.className = "look-grid";
    grid.id = `panel-${group.id}`;
    grid.setAttribute("role", "tabpanel");
    grid.setAttribute("aria-labelledby", tab.id);
    grid.append(createLookCard(original), ...looks.map(createLookCard));
    lookGroups.appendChild(grid);
  });

  if (GROUPS.length) showTab(GROUPS.some((g) => g.id === activeTab) ? activeTab : GROUPS[0].id);
  markSelectedCard();

  lookCount.textContent = `${LOOKS.length - 1} STYLES`;
}

function showTab(groupId) {
  GROUPS.forEach(({ id }) => {
    const active = id === groupId;
    const tab = document.getElementById(`tab-${id}`);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(`panel-${id}`).hidden = !active;
  });
}

// Navigation au clavier entre les onglets (flèches gauche / droite).
lookTabs.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const tabs = [...lookTabs.querySelectorAll(".tab")];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  const next = tabs[(current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  next.focus();
  next.click();
});

function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusMessage.classList.remove("visible"), 3200);
}

// Rendu progressif des vignettes pour ne pas bloquer l'interface.
let thumbSource = null;
function renderThumbnails(drawable, w, h) {
  thumbSource = [drawable, w, h];
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
      canvas.getContext("2d").putImageData(renderRecipe(src, lookById.get(card.dataset.look).recipe, 1, { w, h }), 0, 0);
    }
    if (index < cards.length) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// --- Éditeur de recette --------------------------------------------------

const fieldRows = [];

function buildRecipeEditor() {
  FR.FIELDS.forEach((field) => {
    const row = document.createElement("div");
    row.className = "recipe-row";

    const label = document.createElement("label");
    label.className = "recipe-label";
    label.htmlFor = `f-${field.key}`;
    label.textContent = field.label + (field.unit ? ` (${field.unit})` : "");
    row.appendChild(label);

    let control;
    let output = null;
    let dec = null;
    let inc = null;

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
      // Boutons −/+ pour régler pas à pas, comme dans le convertisseur.
      dec = document.createElement("button");
      inc = document.createElement("button");
      [dec, inc].forEach((button, i) => {
        button.type = "button";
        button.className = "step-button";
        button.textContent = i ? "+" : "−";
        button.setAttribute("aria-label", `${i ? "Augmenter" : "Diminuer"} ${field.label}`);
        button.addEventListener("click", () => {
          recipe[field.key] += i ? field.step : -field.step;
          onRecipeEdited();
        });
      });
      wrap.append(dec, control, inc, output);
      row.appendChild(wrap);
    } else {
      control = document.createElement("input");
      control.type = "text";
      control.maxLength = 120;
      control.placeholder = field.placeholder || "";
    }

    control.id = `f-${field.key}`;
    if (!output) row.appendChild(control);
    control.addEventListener("input", () => {
      recipe[field.key] = field.type === "number" ? Number(control.value) : control.value;
      onRecipeEdited();
    });
    recipeFields.appendChild(row);
    fieldRows.push({ field, row, control, output, dec, inc });
  });

  recipeName.addEventListener("input", () => {
    recipe.name = recipeName.value;
    updatePreviewLabel();
    saveDraft();
  });
  recipeAuthor.addEventListener("input", () => {
    recipe.author = recipeAuthor.value;
    saveDraft();
  });
  recipeNotes.addEventListener("input", () => {
    recipe.notes = recipeNotes.value;
    saveDraft();
  });
}

// Recette de référence du look choisi, pour repérer les réglages modifiés.
function baselineRecipe() {
  const look = currentLookId && lookById.get(currentLookId);
  return look && look.recipe ? FR.normalize(look.recipe) : null;
}

function updateRecipeEditor() {
  const baseline = modified ? baselineRecipe() : null;
  revertButton.hidden = !baseline;
  recipeName.value = recipe.name;
  recipeAuthor.value = recipe.author;
  recipeNotes.value = recipe.notes;
  recipeSim.textContent = FR.simById(recipe.filmSim).name.toUpperCase();

  fieldRows.forEach(({ field, row, control, output, dec, inc }) => {
    row.hidden = Boolean(field.when && !field.when(recipe));
    control.value = recipe[field.key];
    if (output) output.textContent = FR.formatValue(field, recipe);
    if (dec) {
      dec.disabled = recipe[field.key] <= field.min;
      inc.disabled = recipe[field.key] >= field.max;
    }
    row.classList.toggle("changed", Boolean(baseline && baseline[field.key] !== recipe[field.key]));
  });

  renderXmpDetails();
  saveDraft();
}

// Brouillon : la recette en cours est retrouvée au prochain chargement, comme dans le convertisseur.
function saveDraft() {
  store(DRAFT_KEY, { recipe, applied, modified, lookId: currentLookId });
}

function onRecipeEdited() {
  recipe = FR.normalize(recipe);
  applied = true;
  modified = true;
  updateRecipeEditor();
  schedulePreview();
}

// Comme « Reset » dans le convertisseur : recette par défaut (PROVIA, tout à 0).
document.getElementById("defaultsButton").addEventListener("click", () => {
  loadRecipe(FR.DEFAULT_RECIPE);
  showStatus("Réglages remis par défaut.");
});

revertButton.addEventListener("click", () => {
  if (currentLookId) selectLook(currentLookId);
});

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
  const name = applied && !comparing ? recipe.name || "Recette" : "Original";
  photoLabel.textContent = (modified && !comparing ? `${name} · modifiée` : name).toUpperCase();
  photoLabel.hidden = !originalImage;
}

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    const shown = comparing ? null : activeRecipe();
    photoPreview.getContext("2d").putImageData(renderRecipe(previewSource, shown, strength, sourceSize), 0, 0);
  }

  updatePreviewLabel();

  markSelectedCard();
}

function markSelectedCard() {
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
  if (!originalImage) showStatus("Importe une photo pour voir ce rendu sur ton image.");
}

// --- Import de photo -----------------------------------------------------

// Photos iPhone (.heic / .heif) : souvent sans type MIME, on vérifie aussi le nom.
function isHeicFile(file) {
  return /^image\/hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || "");
}

function isImageFile(file) {
  return /^image\//.test(file.type || "") || isHeicFile(file);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} introuvable`));
    document.head.appendChild(script);
  });
}

let heicLoading = null;
function loadHeicDecoder() {
  if (window.HeicTo) return Promise.resolve();
  heicLoading ||= loadScript("vendor/heic/heic-to.js").catch((err) => {
    heicLoading = null;
    throw err;
  });
  return heicLoading;
}

function decodeNatively(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    img.src = url;
  });
}

// Comme dans le convertisseur : Safari lit le HEIC lui-même, les autres navigateurs le convertissent localement.
async function loadImage(blob) {
  try {
    return await decodeNatively(blob);
  } catch (err) {
    if (!isHeicFile(blob)) throw err;
    await loadHeicDecoder();
    return decodeNatively(await window.HeicTo({ blob, type: "image/jpeg", quality: 0.92 }));
  }
}

function setSource(drawable, w, h) {
  originalImage = drawable;
  sourceSize = { w, h };

  previewSource = drawToImageData(drawable, w, h, PREVIEW_MAX_SIDE);
  photoPreview.width = previewSource.width;
  photoPreview.height = previewSource.height;
  photoPreview.hidden = false;
  zoomControls.hidden = false;
  placeholder.hidden = true;
  sampleButton.hidden = true;
  exportButton.disabled = false;
  compareButton.hidden = false;
  changePhotoButton.hidden = false;
  document.body.classList.add("has-photo");
  resetZoom();

  intensity.value = 100;
  updatePreview();
  renderThumbnails(drawable, w, h);
}

async function loadFile(file) {
  if (!file) return;

  if (!isImageFile(file)) {
    showStatus("Choisis un fichier image valide.");
    return;
  }

  if (isHeicFile(file)) showStatus("Ouverture de la photo iPhone…");
  try {
    const img = await loadImage(file);
    setSource(img, img.naturalWidth, img.naturalHeight);
    showStatus("Photo chargée. Maintiens « Avant / Après » pour comparer.");
  } catch {
    showStatus("Impossible de lire cette image. Essaie un autre fichier.");
  }
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

// Une image déposée devient la photo ; un fichier de recette (.txt, .json, .FP1…) est importé.
document.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault();
  photoFrame.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (isImageFile(file)) loadFile(file);
  else importRecipeFile(file);
});

intensity.addEventListener("input", schedulePreview);

// Avant / Après : maintenir le bouton (ou l'image) affiche l'original ;
// au clavier, le bouton bascule entre les deux.
function setComparing(value) {
  if (comparing === value) return;
  comparing = value;
  compareButton.setAttribute("aria-pressed", String(value));
  schedulePreview();
}

compareButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  compareButton.setPointerCapture?.(event.pointerId);
  setComparing(true);
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
  compareButton.addEventListener(type, () => setComparing(false));
});
compareButton.addEventListener("contextmenu", (event) => event.preventDefault());

// --- Zoom et déplacement de l'aperçu -------------------------------------

function fitScale() {
  const rect = photoFrame.getBoundingClientRect();
  return Math.min(rect.width / photoPreview.width, rect.height / photoPreview.height) || 1;
}

// Empêche de faire sortir la photo du cadre en la déplaçant.
function clampPan() {
  const rect = photoFrame.getBoundingClientRect();
  const scale = fitScale() * view.zoom;
  const maxX = Math.max(0, (photoPreview.width * scale - rect.width) / 2);
  const maxY = Math.max(0, (photoPreview.height * scale - rect.height) / 2);
  view.x = Math.min(maxX, Math.max(-maxX, view.x));
  view.y = Math.min(maxY, Math.max(-maxY, view.y));
}

function applyView() {
  if (!previewSource) return;
  clampPan();
  const scale = fitScale() * view.zoom;
  photoPreview.style.width = `${photoPreview.width * scale}px`;
  photoPreview.style.height = `${photoPreview.height * scale}px`;
  photoPreview.style.transform = `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`;

  const zoomed = view.zoom > ZOOM_MIN + 0.001;
  photoFrame.classList.toggle("zoomed", zoomed);
  zoomFitButton.textContent = zoomed ? `${Math.round(view.zoom * 100)}%` : "Ajusté";
  zoomOutButton.disabled = !zoomed;
  zoomInButton.disabled = view.zoom >= ZOOM_MAX - 0.001;
}

// Zoome en gardant fixe le point (cx, cy), exprimé par rapport au centre du cadre.
function zoomTo(zoom, cx = 0, cy = 0) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const k = next / view.zoom;
  view.x = cx - (cx - view.x) * k;
  view.y = cy - (cy - view.y) * k;
  view.zoom = next;
  applyView();
}

function resetZoom() {
  view.zoom = 1;
  view.x = 0;
  view.y = 0;
  applyView();
}

function framePoint(clientX, clientY) {
  const rect = photoFrame.getBoundingClientRect();
  return [clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2];
}

zoomInButton.addEventListener("click", () => zoomTo(view.zoom * ZOOM_STEP));
zoomOutButton.addEventListener("click", () => zoomTo(view.zoom / ZOOM_STEP));
zoomFitButton.addEventListener("click", resetZoom);

// Ctrl / Cmd + molette, ou pincement sur trackpad.
photoFrame.addEventListener("wheel", (event) => {
  if (!previewSource || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  zoomTo(view.zoom * Math.exp(-event.deltaY * 0.01), ...framePoint(event.clientX, event.clientY));
}, { passive: false });

// Double-clic / double-tap : bascule entre « ajusté » et 250 %.
function toggleZoomAt(clientX, clientY) {
  if (view.zoom > ZOOM_MIN + 0.001) resetZoom();
  else zoomTo(2.5, ...framePoint(clientX, clientY));
}

photoPreview.addEventListener("dblclick", (event) => toggleZoomAt(event.clientX, event.clientY));

// Le double-tap tactile est détecté à la main (pas de dblclick fiable avec touch-action: none).
let lastTap = null;
function handleTap(event) {
  if (event.pointerType !== "touch") return;
  const now = performance.now();
  if (lastTap && now - lastTap.time < 300 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
    lastTap = null;
    toggleZoomAt(event.clientX, event.clientY);
  } else {
    lastTap = { time: now, x: event.clientX, y: event.clientY };
  }
}

// Déplacement à un doigt / à la souris, pincement à deux doigts.
const pointers = new Map();
let gesture = null;

function startGesture() {
  const pts = [...pointers.values()];
  if (pts.length === 1) {
    gesture = { type: "pan", x: pts[0].x, y: pts[0].y, viewX: view.x, viewY: view.y };
  } else if (pts.length === 2) {
    const [a, b] = pts;
    gesture = {
      type: "pinch",
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: view.zoom,
      center: framePoint((a.x + b.x) / 2, (a.y + b.y) / 2),
      viewX: view.x,
      viewY: view.y
    };
  } else {
    gesture = null;
  }
}

photoPreview.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  try {
    photoPreview.setPointerCapture(event.pointerId);
  } catch {
    // Capture indisponible : le geste fonctionne quand même tant que le doigt reste sur l'image.
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
  startGesture();
});

photoPreview.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId) || !gesture) return;
  Object.assign(pointers.get(event.pointerId), { x: event.clientX, y: event.clientY });
  const pts = [...pointers.values()];

  if (gesture.type === "pan" && view.zoom > ZOOM_MIN + 0.001) {
    photoFrame.classList.add("panning");
    view.x = gesture.viewX + pts[0].x - gesture.x;
    view.y = gesture.viewY + pts[0].y - gesture.y;
    applyView();
  } else if (gesture.type === "pinch" && pts.length === 2) {
    const [a, b] = pts;
    const [cx, cy] = gesture.center;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist));
    const k = next / gesture.zoom;
    view.x = cx - (cx - gesture.viewX) * k;
    view.y = cy - (cy - gesture.viewY) * k;
    view.zoom = next;
    applyView();
  }
});

["pointerup", "pointercancel"].forEach((type) => {
  photoPreview.addEventListener(type, (event) => {
    const start = pointers.get(event.pointerId);
    if (type === "pointerup" && start && pointers.size === 1 &&
        Math.hypot(event.clientX - start.startX, event.clientY - start.startY) < 10) {
      handleTap(event);
    }
    pointers.delete(event.pointerId);
    photoFrame.classList.remove("panning");
    startGesture();
  });
});

// Le cadre change de taille (rotation, redimensionnement) : on recalcule l'ajustement.
new ResizeObserver(applyView).observe(photoFrame);

compareButton.addEventListener("click", (event) => {
  // event.detail vaut 0 pour une activation clavier (Entrée / Espace).
  if (event.detail === 0) setComparing(!comparing);
});

resetButton.addEventListener("click", () => {
  intensity.value = 100;
  selectLook("original");

  if (originalImage) showStatus("Retour à la photo originale.");
});

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

// --- Export de recette -----------------------------------------------------

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

function downloadText(fileName, text, type) {
  downloadBlob(new Blob([text], { type }), fileName);
}

function copyText(text, message) {
  function fallback() {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      // ignoré : message d'échec ci-dessous
    }
    area.remove();
    showStatus(ok ? message : "Copie impossible : ton navigateur bloque le presse-papiers.");
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showStatus(message), fallback);
  } else {
    fallback();
  }
}

function shareLink() {
  return `${location.href.split("#")[0]}#r=${FR.toShareCode(recipe)}`;
}

FR.XMP_TARGETS.forEach((target) => xmpTarget.add(new Option(target.name, target.id)));

// Détail des réglages Camera Raw écrits dans le preset, comme dans le convertisseur.
function renderXmpDetails() {
  const target = FR.XMP_TARGETS.find((t) => t.id === xmpTarget.value);
  if (!target) return;
  xmpHint.textContent = target.hint;
  const x = FR.xmpSettings(recipe, target.id);
  const rows = x.settings.map(([key, value]) => [key, value === "" ? "—" : String(value)]);
  if (x.curve) rows.push(["ToneCurvePV2012", x.curve.map((pt) => pt.join(",")).join("  ")]);

  const table = document.createElement("table");
  const body = table.createTBody();
  rows.forEach(([key, value]) => {
    const tr = body.insertRow();
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = key;
    tr.appendChild(th);
    tr.insertCell().textContent = value;
  });
  xmpDetails.replaceChildren(table);
  if (x.notes.length) {
    const list = document.createElement("ul");
    x.notes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      list.appendChild(li);
    });
    xmpDetails.appendChild(list);
  }
}
xmpTarget.addEventListener("change", renderXmpDetails);

document.getElementById("xmpButton").addEventListener("click", () => {
  downloadText(FR.fileName(recipe, ".xmp"), FR.toXmp(recipe, xmpTarget.value), "application/rdf+xml");
  showStatus("Preset téléchargé. Dans Lightroom : Paramètres prédéfinis → Importer.");
});

document.getElementById("cubeButton").addEventListener("click", () => {
  const size = Number(lutSize.value);
  downloadText(FR.fileName(recipe, `-${size}.cube`), FR.toCube(recipe, size), "text/plain");
  showStatus(`LUT téléchargée (${size}×${size}×${size}).`);
});

document.getElementById("copyTextButton").addEventListener("click", () => {
  copyText(FR.toText(recipe), "Recette copiée en texte.");
});

document.getElementById("copyCodeButton").addEventListener("click", () => {
  copyText(FR.toShareCode(recipe), "Code de partage copié.");
});

document.getElementById("copyLinkButton").addEventListener("click", () => {
  copyText(shareLink(), "Lien copié : il ouvre cette recette dans Fuji Looks.");
});

document.getElementById("jsonButton").addEventListener("click", () => {
  const doc = { app: "fuji-recipe-converter", version: 1, recipe };
  downloadText(FR.fileName(recipe, ".recipe.json"), JSON.stringify(doc, null, 2), "application/json");
});

// --- Bibliothèque ------------------------------------------------------------

function refreshLibrary() {
  store(LIB_KEY, library);
  syncLibraryLooks();
  buildLookGrid();
  if (thumbSource) renderThumbnails(...thumbSource);
  renderLibraryList();
}

function renderLibraryList() {
  libraryList.textContent = "";
  library.forEach((item) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.recipe.name;
    const summary = document.createElement("span");
    const parts = [FR.simById(item.recipe.filmSim).name, FR.formatValue(FR.fieldByKey("dynamicRange"), item.recipe)];
    if (item.recipe.grainEffect !== "off") parts.push(`Grain ${item.recipe.grainEffect}`);
    summary.textContent = parts.join(" · ");
    info.append(name, summary);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "secondary-button";
    open.textContent = "Ouvrir";
    open.addEventListener("click", () => selectLook(`lib-${item.id}`));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary-button danger";
    remove.textContent = "Supprimer";
    remove.setAttribute("aria-label", `Supprimer ${item.recipe.name}`);
    remove.addEventListener("click", () => {
      if (!window.confirm(`Supprimer « ${item.recipe.name} » de ta bibliothèque ?`)) return;
      library = library.filter((other) => other !== item);
      if (currentLookId === `lib-${item.id}`) currentLookId = null;
      refreshLibrary();
      showStatus(`« ${item.recipe.name} » supprimée.`);
    });

    li.append(info, open, remove);
    libraryList.appendChild(li);
  });
  libraryEmpty.hidden = library.length > 0;
  libraryCount.textContent = library.length ? String(library.length) : "";
}

saveButton.addEventListener("click", () => {
  const saved = FR.normalize(recipe);
  let item = library.find((other) => other.recipe.name === saved.name);
  if (item) {
    if (!window.confirm(`Une recette nommée « ${saved.name} » existe déjà. La remplacer ?`)) return;
    item.recipe = saved;
    item.savedAt = Date.now();
  } else {
    item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), savedAt: Date.now(), recipe: saved };
    library.unshift(item);
  }
  recipe = saved;
  applied = true;
  modified = false;
  currentLookId = `lib-${item.id}`;
  refreshLibrary();
  updateRecipeEditor();
  showTab("custom");
  schedulePreview();
  showStatus(store(LIB_KEY, library)
    ? `« ${saved.name} » enregistrée dans « Mes recettes ».`
    : "Enregistrement impossible : le stockage du navigateur est indisponible.");
});

// Sauvegarde / restauration compatibles avec celles du convertisseur.
document.getElementById("libraryExportButton").addEventListener("click", () => {
  if (!library.length) {
    showStatus("Ta bibliothèque est vide.");
    return;
  }
  const doc = { app: "fuji-recipe-converter", version: 1, library };
  downloadText("fuji-recipe-library.json", JSON.stringify(doc, null, 2), "application/json");
});

libraryFile.addEventListener("change", async () => {
  const file = libraryFile.files?.[0];
  libraryFile.value = "";
  if (!file) return;
  try {
    const doc = JSON.parse(await file.text());
    const items = doc.library || (doc.recipe ? [{ recipe: doc.recipe }] : null);
    if (!Array.isArray(items)) throw new Error("no recipes");
    let added = 0;
    items.forEach((entry) => {
      if (!entry || !entry.recipe || !entry.recipe.filmSim) return;
      const r = FR.normalize(entry.recipe);
      if (library.some((other) => JSON.stringify(other.recipe) === JSON.stringify(r))) return;
      library.push({ id: Date.now().toString(36) + added, savedAt: entry.savedAt || Date.now(), recipe: r });
      added++;
    });
    refreshLibrary();
    showStatus(`${added} recette${added > 1 ? "s" : ""} restaurée${added > 1 ? "s" : ""}.`);
  } catch {
    showStatus("Ce fichier n’est pas une sauvegarde de bibliothèque.");
  }
});

sampleButton.addEventListener("click", () => {
  setSource(drawSampleScene(), 900, 600);
  showStatus("Image d’exemple chargée.");
});

// --- Export de la photo --------------------------------------------------

function renderExport() {
  return new Promise((resolve, reject) => {
    if (!originalImage) {
      reject(new Error("Aucune photo sélectionnée."));
      return;
    }

    const src = drawToImageData(originalImage, sourceSize.w, sourceSize.h, Infinity, EXPORT_MAX_PIXELS);
    const out = renderRecipe(src, activeRecipe(), getStrength(), sourceSize);

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

  const label = exportButton.innerHTML;
  exportButton.disabled = true;
  exportButton.setAttribute("aria-busy", "true");
  exportButton.textContent = "Préparation…";

  try {
    // Laisser le navigateur afficher le message avant le calcul.
    await new Promise((r) => setTimeout(r, 30));
    const blob = await renderExport();
    const name = applied ? recipe.name : "original";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";

    downloadBlob(blob, `fuji-looks-${slug}.jpg`);
    showStatus("Photo exportée.");
  } catch (error) {
    showStatus("Export impossible. Essaie avec une photo plus petite.");
    console.error(error);
  } finally {
    exportButton.disabled = false;
    exportButton.removeAttribute("aria-busy");
    exportButton.innerHTML = label;
  }
});

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
buildLookGrid();
buildRecipeEditor();
renderLibraryList();
updateRecipeEditor();
importFromHash();
renderThumbnails(drawSampleScene(), 900, 600);
updatePreview();
