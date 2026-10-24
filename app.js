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
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const frameOptions = document.getElementById("frameOptions");
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
const FRAME_KEY = "fuji-looks.frame";

const LUT_N = 33;
const LUT_CACHE_MAX = 40;
const PREVIEW_MAX_SIDE = 2048;
// Zoom relatif à la taille « ajustée au cadre » (1 = toute la photo visible).
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.5;
// Vignettes : recadrage 4:3 zoomé au centre de la photo pour mieux distinguer les looks.
const THUMB_W = 240;
const THUMB_H = 180;
const THUMB_ZOOM = 0.55;
// Limite de surface des canvas sur iOS Safari (~16,7 Mpx).
const EXPORT_MAX_PIXELS = 16000000;

// --- Catalogue des looks -------------------------------------------------

const LOOKS = [{ id: "original", name: "Original", desc: "Naturel", group: "base", recipe: null }];

(window.CUSTOM_RECIPES || []).forEach(({ name, author = "", text }, i) => {
  const parsed = FR.parseText(text);
  if (!parsed) return;
  const recipe = FR.normalize(Object.assign({}, FR.DEFAULT_RECIPE, parsed.values, { name, author }));
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
let hoverLookId = null;
let hoverTimer = 0;
let intensityState = "100"; // valeur d'intensité connue de l'historique
let sourceExif = null; // segment EXIF de la photo d'origine (JPEG uniquement)
let sourceToken = 0;
let pendingShare = null;
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
// `grainWidth` = largeur équivalente de la photo entière (différente pour une vignette recadrée).
function renderRecipe(src, lookRecipe, strength, source = { w: src.width, h: src.height }, grainWidth = src.width) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (!lookRecipe || strength <= 0) return out;

  const { derived, lut } = getLookData(lookRecipe);
  FR.applyLut(src.data, out.data, w, h, lut, LUT_N, 0);

  const blur = derived.clarity ? makeBlur(out) : null;
  FR.applySpatial(out.data, w, h, derived, blur, 0, grainScale(grainWidth, source.w, source.h, derived));

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
  card.addEventListener("click", () => {
    clearTimeout(hoverTimer);
    hoverLookId = null;
    selectLook(look.id);
  });
  // Survol à la souris : le look s'affiche sur la grande photo avant de cliquer.
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse" || !previewSource) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      hoverLookId = look.id;
      schedulePreview();
    }, 90);
  });
  card.addEventListener("pointerleave", () => {
    clearTimeout(hoverTimer);
    if (hoverLookId) {
      hoverLookId = null;
      schedulePreview();
    }
  });
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
function thumbnailSource(drawable, w, h) {
  const baseW = Math.min(w, (h * THUMB_W) / THUMB_H);
  const cropW = baseW * THUMB_ZOOM;
  const cropH = (cropW * THUMB_H) / THUMB_W;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(drawable, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, THUMB_W, THUMB_H);
  return { data: ctx.getImageData(0, 0, THUMB_W, THUMB_H), grainWidth: (THUMB_W * w) / cropW };
}

function renderThumbnails(drawable, w, h) {
  thumbSource = [drawable, w, h];
  const job = ++thumbJob;
  const { data: src, grainWidth } = thumbnailSource(drawable, w, h);
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
      canvas.getContext("2d").putImageData(renderRecipe(src, lookById.get(card.dataset.look).recipe, 1, { w, h }, grainWidth), 0, 0);
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
          commit(`field:${field.key}`);
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
      commit(`field:${field.key}`);
      recipe[field.key] = field.type === "number" ? Number(control.value) : control.value;
      onRecipeEdited();
    });
    recipeFields.appendChild(row);
    fieldRows.push({ field, row, control, output, dec, inc });
  });

  recipeName.addEventListener("input", () => {
    commit("meta:name");
    recipe.name = recipeName.value;
    updatePreviewLabel();
    saveDraft();
  });
  recipeAuthor.addEventListener("input", () => {
    commit("meta:author");
    recipe.author = recipeAuthor.value;
    saveDraft();
  });
  recipeNotes.addEventListener("input", () => {
    commit("meta:notes");
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
  if (baseline) revertButton.textContent = `Revenir à « ${lookById.get(currentLookId).name} »`;
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

// --- Historique (Annuler / Rétablir) ----------------------------------------

const HISTORY_MAX = 100;
const undoStack = [];
const redoStack = [];
let lastCommit = { key: null, time: 0 };

function snapshot() {
  return { recipe: { ...recipe }, applied, modified, lookId: currentLookId, intensity: intensityState };
}

// À appeler juste avant une modification. Les modifications répétées d'un même réglage
// (glissement d'un curseur, saisie) sont regroupées en une seule étape.
function commit(key = null) {
  const now = performance.now();
  if (key && key === lastCommit.key && now - lastCommit.time < 1000) {
    lastCommit.time = now;
    return;
  }
  lastCommit = { key, time: now };
  undoStack.push(snapshot());
  if (undoStack.length > HISTORY_MAX) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
}

function restoreSnapshot(state) {
  recipe = FR.normalize(state.recipe);
  applied = state.applied;
  modified = state.modified;
  currentLookId = state.lookId;
  intensity.value = state.intensity;
  intensityState = state.intensity;
  updateRecipeEditor();
  schedulePreview();
}

function stepHistory(from, to) {
  if (!from.length) return;
  to.push(snapshot());
  restoreSnapshot(from.pop());
  lastCommit = { key: null, time: 0 };
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoButton.disabled = !undoStack.length;
  redoButton.disabled = !redoStack.length;
}

undoButton.addEventListener("click", () => stepHistory(undoStack, redoStack));
redoButton.addEventListener("click", () => stepHistory(redoStack, undoStack));

document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target;
  // Dans un champ texte, on laisse l'annulation native du navigateur.
  if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.type === "text"))) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    stepHistory(undoStack, redoStack);
  } else if ((key === "z" && event.shiftKey) || key === "y") {
    event.preventDefault();
    stepHistory(redoStack, undoStack);
  }
});

revertButton.addEventListener("click", () => {
  if (currentLookId) selectLook(currentLookId);
});

function loadRecipe(newRecipe) {
  commit();
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
  let text;
  if (comparing) text = "Original";
  else if (hoverLookId) text = `${lookById.get(hoverLookId).name} · aperçu`;
  else {
    const name = applied ? recipe.name || "Recette" : "Original";
    text = modified ? `${name} · modifiée` : name;
  }
  photoLabel.textContent = text.toUpperCase();
  photoLabel.hidden = !originalImage;
}

// Recette affichée : l'original pendant la comparaison, le look survolé, sinon la recette en cours.
function shownRecipe() {
  if (comparing) return null;
  if (hoverLookId) return lookById.get(hoverLookId)?.recipe || null;
  return activeRecipe();
}

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  if (previewSource) {
    const shown = shownRecipe();
    const out = renderRecipe(previewSource, shown, strength, sourceSize);
    const framed = frameStyle !== "none" ? composeFrame(out, frameStyle, shown) : null;
    const w = framed ? framed.width : out.width;
    const h = framed ? framed.height : out.height;
    if (photoPreview.width !== w || photoPreview.height !== h) {
      photoPreview.width = w;
      photoPreview.height = h;
      applyView();
    }
    const ctx = photoPreview.getContext("2d");
    if (framed) ctx.drawImage(framed, 0, 0);
    else ctx.putImageData(out, 0, 0);
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
  if (id !== currentLookId || modified) commit();
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
  intensityState = "100";
  sourceToken++;
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
    sourceExif = await readExif(file);
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

intensity.addEventListener("input", () => {
  commit("intensity");
  intensityState = intensity.value;
  schedulePreview();
});

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
  commit();
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
  sourceExif = null;
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

    // Le cadre ajoute des pixels : on garde de la marge sous la limite des canvas iOS.
    const maxPixels = frameStyle === "none" ? EXPORT_MAX_PIXELS : EXPORT_MAX_PIXELS * 0.8;
    const src = drawToImageData(originalImage, sourceSize.w, sourceSize.h, Infinity, maxPixels);
    const out = renderRecipe(src, activeRecipe(), getStrength(), sourceSize);

    let canvas;
    if (frameStyle !== "none") {
      canvas = composeFrame(out, frameStyle, activeRecipe());
    } else {
      canvas = document.createElement("canvas");
      canvas.width = out.width;
      canvas.height = out.height;
      canvas.getContext("2d").putImageData(out, 0, 0);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("La création de l’image a échoué."));
        return;
      }
      resolve(sourceExif ? await withExif(blob, sourceExif, canvas.width, canvas.height) : blob);
    }, "image/jpeg", 0.94);
  });
}

function exportKey() {
  return JSON.stringify([sourceToken, applied ? recipe : null, intensityState, frameStyle]);
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

// --- Cadre façon tirage ---------------------------------------------------------

let frameStyle = ["none", "white", "black"].includes(load(FRAME_KEY)) ? load(FRAME_KEY) : "none";

const FRAME_THEMES = {
  white: { bg: "#f5f3ee", text: "#1c1c1c", muted: "#6f6c66" },
  black: { bg: "#111214", text: "#f1f0ec", muted: "#9b9a96" }
};

function signedValue(v, decimals = 0) {
  const n = Number(v);
  const text = decimals ? n.toFixed(decimals).replace(/\.0$/, "") : String(Math.round(n));
  return n > 0 ? `+${text}` : n < 0 ? `−${text.slice(1)}` : "0";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Réglages de la recette, avec les noms des menus Fujifilm.
function frameTokens(r) {
  const wbName = r.whiteBalance === "kelvin" ? `${r.kelvin}K` : FR.wbById(r.whiteBalance).name;
  const tokens = [
    FR.formatValue(FR.fieldByKey("dynamicRange"), r),
    `WB ${wbName} ${signedValue(r.wbShiftRed)}R ${signedValue(r.wbShiftBlue)}B`,
    r.grainEffect === "off" ? "Grain Off" : `Grain ${capitalize(r.grainEffect)} ${capitalize(r.grainSize)}`,
    `Color Chrome ${capitalize(r.colorChromeEffect)}`,
    `FX Blue ${capitalize(r.colorChromeFxBlue)}`
  ];
  if (FR.simById(r.filmSim).mono) tokens.push(`Mono WC ${signedValue(r.monoWC)} MG ${signedValue(r.monoMG)}`);
  else tokens.push(`Color ${signedValue(r.color)}`);
  tokens.push(
    `Highlight ${signedValue(r.highlight, 1)}`,
    `Shadow ${signedValue(r.shadow, 1)}`,
    `Sharpness ${signedValue(r.sharpness)}`,
    `NR ${signedValue(r.noiseReduction)}`,
    `Clarity ${signedValue(r.clarity)}`
  );
  return tokens;
}

function wrapTokens(ctx, tokens, maxWidth) {
  const lines = [];
  let line = "";
  tokens.forEach((token) => {
    const next = line ? `${line}  ·  ${token}` : token;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

// Bordure avec, en bas, le nom de la recette, la simulation et les réglages.
// Toutes les tailles sont proportionnelles à la photo : l'aperçu et l'export sont identiques.
function composeFrame(imageData, style, frameRecipe) {
  const theme = FRAME_THEMES[style];
  const W = imageData.width;
  const H = imageData.height;
  const long = Math.max(W, H);
  const pad = Math.round(long * 0.035);
  const titleSize = Math.max(10, Math.round(long * 0.024));
  const textSize = Math.max(8, Math.round(long * 0.0145));
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let lines = [];
  if (frameRecipe) {
    ctx.font = `${textSize}px ${font}`;
    lines = wrapTokens(ctx, frameTokens(frameRecipe), W);
    if (frameRecipe.author) lines.push(`Recette : ${frameRecipe.author}`);
  }
  const band = frameRecipe ? Math.round(pad * 0.9 + titleSize * 1.25 + lines.length * textSize * 1.55 + pad * 0.9) : pad;

  canvas.width = W + pad * 2;
  canvas.height = H + pad + band;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const photo = document.createElement("canvas");
  photo.width = W;
  photo.height = H;
  photo.getContext("2d").putImageData(imageData, 0, 0);
  ctx.drawImage(photo, pad, pad);

  if (frameRecipe) {
    let y = H + pad + Math.round(pad * 0.9) + titleSize;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = theme.text;
    ctx.font = `600 ${titleSize}px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(frameRecipe.name || "Recette", pad, y, W * 0.62);
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${Math.round(titleSize * 0.8)}px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(FR.simById(frameRecipe.filmSim).name.toUpperCase(), pad + W, y, W * 0.36);

    ctx.textAlign = "left";
    ctx.font = `${textSize}px ${font}`;
    y += Math.round(titleSize * 0.25);
    lines.forEach((line, i) => {
      y += Math.round(textSize * 1.55);
      ctx.fillStyle = frameRecipe.author && i === lines.length - 1 ? theme.muted : theme.text;
      ctx.fillText(line, pad, y);
    });
  }
  return canvas;
}

function updateFrameOptions() {
  frameOptions.querySelectorAll("[data-frame]").forEach((button) => {
    const active = button.dataset.frame === frameStyle;
    button.setAttribute("aria-checked", String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

frameOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-frame]");
  if (!button) return;
  frameStyle = button.dataset.frame;
  store(FRAME_KEY, frameStyle);
  updateFrameOptions();
  schedulePreview();
  if (!originalImage && frameStyle !== "none") showStatus("Importe une photo pour voir le cadre.");
});

frameOptions.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const buttons = [...frameOptions.querySelectorAll("[data-frame]")];
  const current = buttons.findIndex((b) => b.dataset.frame === frameStyle);
  const next = buttons[(current + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
  next.focus();
  next.click();
});

// --- EXIF : on recopie les métadonnées de la photo d'origine dans l'export ------

// Renvoie le segment APP1 « Exif » d'un JPEG (ou null).
async function readExif(file) {
  if (!/jpe?g$/i.test(file.type || "") && !/\.jpe?g$/i.test(file.name || "")) return null;
  try {
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && offset + 10 <= view.byteLength &&
          String.fromCharCode(...new Uint8Array(buffer, offset + 4, 6)) === "Exif\0\0") {
        if (offset + 2 + size > view.byteLength) return null;
        return new Uint8Array(buffer.slice(offset, offset + 2 + size));
      }
      offset += 2 + size;
    }
  } catch {
    // EXIF illisible : export sans métadonnées.
  }
  return null;
}

// Adapte l'EXIF à la photo exportée : orientation déjà appliquée, pas de miniature
// (elle montrerait la photo sans le look), espace sRGB et nouvelles dimensions.
function patchExif(segment, width, height) {
  const exif = segment.slice();
  const view = new DataView(exif.buffer);
  const tiff = 10;
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o) => view.getUint16(o, little);
  const u32 = (o) => view.getUint32(o, little);
  const inRange = (o, n) => o >= tiff && o + n <= exif.length;

  function walk(ifdOffset, visit) {
    const base = tiff + ifdOffset;
    if (!inRange(base, 2)) return null;
    const count = u16(base);
    if (!inRange(base + 2, count * 12 + 4)) return null;
    for (let i = 0; i < count; i++) visit(base + 2 + i * 12);
    return base + 2 + count * 12; // position du pointeur vers l'IFD suivant
  }

  function setNumber(entry, value) {
    const type = u16(entry + 2);
    if (type === 3) view.setUint16(entry + 8, value, little);
    else if (type === 4) view.setUint32(entry + 8, value, little);
  }

  let exifIfd = null;
  const next = walk(u32(tiff + 4), (entry) => {
    const tag = u16(entry);
    if (tag === 0x0112) setNumber(entry, 1); // Orientation : normale
    if (tag === 0x8769) exifIfd = u32(entry + 8);
  });
  if (next === null) return null;
  view.setUint32(next, 0, little); // supprime l'IFD1 (miniature)

  if (exifIfd !== null) {
    walk(exifIfd, (entry) => {
      const tag = u16(entry);
      if (tag === 0xa001) setNumber(entry, 1); // ColorSpace : sRGB
      if (tag === 0xa002) setNumber(entry, width);
      if (tag === 0xa003) setNumber(entry, height);
    });
  }
  return exif;
}

async function withExif(blob, segment, width, height) {
  try {
    const exif = patchExif(segment, width, height);
    if (!exif) return blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let rest = 2;
    // Retire le segment JFIF ajouté par le navigateur : l'EXIF doit suivre directement le début du fichier.
    if (bytes[2] === 0xff && bytes[3] === 0xe0) rest = 4 + ((bytes[4] << 8) | bytes[5]);
    return new Blob([bytes.subarray(0, 2), exif, bytes.subarray(rest)], { type: "image/jpeg" });
  } catch {
    return blob;
  }
}

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
updateFrameOptions();
buildRecipeEditor();
renderLibraryList();
updateRecipeEditor();
importFromHash();
renderThumbnails(drawSampleScene(), 900, 600);
updatePreview();
