/* Fuji Looks — Éditeur de recette : réglages Fujifilm, brouillon. */
// --- Éditeur de recette --------------------------------------------------

const fieldRows = [];

// Les réglages, regroupés comme sur le boîtier. Détail et Prise de vue se replient en résumé.
const FIELD_GROUPS = [
  { title: "Base", keys: ["filmSim", "dynamicRange"] },
  { title: "Tonalité", keys: ["highlight", "shadow"] },
  { title: "Couleur", keys: ["whiteBalance", "kelvin", "wbShiftRed", "wbShiftBlue", "color", "monoWC", "monoMG", "colorChromeEffect", "colorChromeFxBlue"] },
  { title: "Détail", fold: true, keys: ["grainEffect", "grainSize", "sharpness", "noiseReduction", "clarity"] },
  { title: "Prise de vue", fold: true, keys: ["iso", "exposureComp", "camera"] }
];
const foldSummaries = [];

function fieldSummary(keys) {
  return keys
    .map((key) => FR.fieldByKey(key))
    .filter((field) => field && !(field.when && !field.when(recipe)))
    .map((field) => {
      const value = field.type === "text" ? recipe[field.key] : FR.formatValue(field, recipe);
      if (!value) return "";
      const short = { "Grain Effect": "Grain", "Noise Reduction": "NR", "Exposure Compensation": "Expo.", "Camera / Sensor": "" }[field.label];
      return `${short ?? field.label} ${value}`.trim();
    })
    .filter(Boolean)
    .join(" · ") || "—";
}

function buildFieldRow(field) {
  const row = document.createElement("div");
  row.className = "row recipe-row";

  const label = document.createElement("label");
  label.htmlFor = `f-${field.key}`;
  label.textContent = field.label + (field.unit ? ` (${field.unit})` : "");
  row.appendChild(label);

  let control;
  let output = null;
  if (field.key === "whiteBalance") return buildWbModeRow(field, row, label);
  if (field.type === "select") {
    control = document.createElement("select");
    control.className = "select";
    field.options.forEach(([value, text]) => control.add(new Option(text, value)));
  } else if (field.type === "number") {
    control = document.createElement("input");
    control.type = "range";
    control.className = field.min < 0 ? "range-bi" : "range-uni";
    control.min = field.min;
    control.max = field.max;
    control.step = field.step;
    output = document.createElement("output");
    output.htmlFor = `f-${field.key}`;
  } else {
    row.classList.add("row-text");
    control = document.createElement("input");
    control.type = "text";
    control.className = "input";
    control.maxLength = 120;
    control.placeholder = field.placeholder || "";
  }

  control.id = `f-${field.key}`;
  row.appendChild(control);
  if (output) row.appendChild(output);
  control.addEventListener("input", () => {
    if (field.type === "number") markInteractive();
    commit(`field:${field.key}`);
    recipe[field.key] = field.type === "number" ? Number(control.value) : control.value;
    onRecipeEdited();
  });
  // Double-clic sur un curseur : valeur du look d'origine (ou 0).
  if (field.type === "number") {
    control.addEventListener("dblclick", () => {
      const base = baselineRecipe();
      commit(`field:${field.key}`);
      recipe[field.key] = base ? base[field.key] : Math.min(field.max, Math.max(field.min, 0));
      onRecipeEdited();
    });
  }
  fieldRows.push({ field, row, control, output });
  return row;
}

// --- Balance des blancs : pastilles de mode et grille WB Shift ---------------------------

// Noms courts des modes, comme sur l'écran du boîtier.
const WB_SHORT = {
  auto: "Auto", "auto-white": "Auto White", "auto-ambience": "Auto Ambience", daylight: "Daylight", shade: "Shade",
  "fluorescent-1": "Fluo 1", "fluorescent-2": "Fluo 2", "fluorescent-3": "Fluo 3", incandescent: "Incandescent",
  underwater: "Underwater", kelvin: "Kelvin", custom: "Custom"
};

function buildWbModeRow(field, row, label) {
  row.classList.add("row-block");
  label.removeAttribute("for");
  label.id = "wbModeLabel";
  const control = document.createElement("div");
  control.className = "wb-modes";
  control.setAttribute("role", "radiogroup");
  control.setAttribute("aria-labelledby", "wbModeLabel");
  field.options.forEach(([value, text]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.dataset.value = value;
    button.setAttribute("role", "radio");
    button.title = text;
    button.textContent = WB_SHORT[value] || text;
    control.append(button);
  });
  let current = null;
  // Même interface qu'un <select> pour updateRecipeEditor : control.value.
  Object.defineProperty(control, "value", {
    get: () => current,
    set: (v) => {
      current = v;
      control.querySelectorAll("[data-value]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === v)));
    }
  });
  control.addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");
    if (!button || button.dataset.value === recipe.whiteBalance) return;
    commit(`field:${field.key}`);
    recipe.whiteBalance = button.dataset.value;
    onRecipeEdited();
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  row.appendChild(control);
  fieldRows.push({ field, row, control, output: null });
  return row;
}

// Grille WB Shift : R à l'horizontale (rouge à droite, cyan à gauche), B à la verticale
// (bleu en haut, jaune en bas), comme sur le boîtier.
const WB_SHIFT_KEYS = ["wbShiftRed", "wbShiftBlue"];
let wbShiftPad = null;
let wbShiftRow = null;

function buildWbShiftPad() {
  wbShiftRow = document.createElement("div");
  wbShiftRow.className = "row row-block recipe-row";
  const label = document.createElement("span");
  label.className = "row-title";
  label.textContent = "WB Shift";
  wbShiftPad = createWbPad({
    id: "wbShiftPad",
    label: "Décalage de la balance des blancs, R et B",
    min: -9, max: 9, step: 1, bigStep: 3,
    x: { label: "R" }, y: { label: "B" },
    tags: { top: "B", bottom: "Y", left: "C", right: "R" },
    colors: ["rgba(40, 190, 210, .5)", "rgba(230, 60, 60, .55)", "rgba(60, 100, 240, .55)", "rgba(235, 200, 40, .5)"],
    onChange(r, b) {
      markInteractive();
      commit("field:wbShift");
      recipe.wbShiftRed = r;
      recipe.wbShiftBlue = b;
      onRecipeEdited();
    },
    onReset() {
      if (!recipe.wbShiftRed && !recipe.wbShiftBlue) return;
      commit();
      recipe.wbShiftRed = 0;
      recipe.wbShiftBlue = 0;
      onRecipeEdited();
    }
  });
  wbShiftRow.append(label, wbShiftPad.el);
  return wbShiftRow;
}

function buildRecipeEditor() {
  const placed = new Set();
  FIELD_GROUPS.forEach((group, i) => {
    const fields = group.keys.map((key) => FR.fieldByKey(key)).filter(Boolean);
    fields.forEach((field) => placed.add(field.key));
    if (i === FIELD_GROUPS.length - 1) FR.FIELDS.forEach((field) => { if (!placed.has(field.key)) fields.push(field); });
    let body;
    if (group.fold) {
      const details = document.createElement("details");
      details.className = "fold";
      const summary = document.createElement("summary");
      const text = document.createElement("span");
      text.className = "fold-title";
      const title = document.createElement("strong");
      title.textContent = group.title;
      const sum = document.createElement("small");
      sum.className = "muted";
      text.append(title, sum);
      summary.append(text);
      summary.insertAdjacentHTML("beforeend", '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron"/></svg>');
      body = document.createElement("div");
      body.className = "fold-body";
      details.append(summary, body);
      recipeFields.appendChild(details);
      foldSummaries.push({ el: sum, keys: fields.map((f) => f.key) });
    } else {
      body = document.createElement("section");
      body.className = "group";
      const h = document.createElement("h3");
      h.textContent = group.title;
      body.appendChild(h);
      recipeFields.appendChild(body);
    }
    fields.forEach((field) => {
      // R et B : une seule grille à la place de deux curseurs.
      if (field.key === "wbShiftRed") body.appendChild(buildWbShiftPad());
      if (WB_SHIFT_KEYS.includes(field.key)) return;
      body.appendChild(buildFieldRow(field));
    });
  });

  recipeName.addEventListener("input", () => {
    commit("meta:name");
    recipe.name = recipeName.value;
    recipeTitle.textContent = recipe.name || "Recette";
    updatePreviewLabel();
    updateStageTitle();
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

const recipeTitle = document.getElementById("recipeTitle");
const modifiedRow = document.getElementById("modifiedRow");
const modifiedText = document.getElementById("modifiedText");

// Recette de référence du look choisi, pour repérer les réglages modifiés.
function baselineRecipe() {
  const look = currentLookId && lookById.get(currentLookId);
  return look && look.recipe ? FR.normalize(look.recipe) : null;
}

function updateRecipeEditor() {
  updateFilmEditor();
  updateStageTitle();
  if (currentFilm || currentNikon) {
    updateCompat();
    saveDraft();
    return;
  }
  const baseline = modified ? baselineRecipe() : null;
  const sourceLook = currentLookId && lookById.get(currentLookId);
  recipeSource.hidden = !(sourceLook && sourceLook.sourceUrl);
  if (sourceLook && sourceLook.sourceUrl) recipeSource.href = sourceLook.sourceUrl;
  recipeName.value = recipe.name;
  recipeAuthor.value = recipe.author;
  recipeNotes.value = recipe.notes;
  recipeTitle.textContent = applied ? recipe.name || "Recette" : "Aucun look appliqué";
  recipeSim.textContent = FR.simById(recipe.filmSim).name;

  let changed = 0;
  fieldRows.forEach(({ field, row, control, output }) => {
    row.hidden = Boolean(field.when && !field.when(recipe));
    control.value = recipe[field.key];
    if (output) output.textContent = FR.formatValue(field, recipe);
    const diff = Boolean(baseline && baseline[field.key] !== recipe[field.key]);
    if (diff && !row.hidden) changed++;
    row.classList.toggle("changed", diff);
  });
  wbShiftPad.set(recipe.wbShiftRed, recipe.wbShiftBlue);
  const shiftDiff = Boolean(baseline && WB_SHIFT_KEYS.some((key) => baseline[key] !== recipe[key]));
  if (shiftDiff) changed++;
  wbShiftRow.classList.toggle("changed", shiftDiff);
  foldSummaries.forEach(({ el, keys }) => { el.textContent = fieldSummary(keys); });
  modifiedRow.hidden = !baseline;
  if (baseline) {
    modifiedText.textContent = changed
      ? `${changed} réglage${changed > 1 ? "s" : ""} modifié${changed > 1 ? "s" : ""} par rapport à « ${lookById.get(currentLookId).name} »`
      : `Modifiée par rapport à « ${lookById.get(currentLookId).name} »`;
  }

  renderXmpDetails();
  updateCompat();
  updateCompare();
  saveDraft();
}

// Brouillon : la recette en cours est retrouvée au prochain chargement, comme dans le convertisseur.
function saveDraft() {
  store(DRAFT_KEY, { recipe, film: currentFilm, nikon: currentNikon, applied, modified, lookId: currentLookId });
}

function onRecipeEdited() {
  recipe = FR.normalize(recipe);
  currentFilm = null;
  currentNikon = null;
  applied = true;
  modified = true;
  updateRecipeEditor();
  schedulePreview();
}

// --- Simulation de la balance des blancs ---------------------------------------

const WB_SIM_KEY = "fuji-looks.simulate-wb";
const wbSimToggle = document.getElementById("wbSimToggle");
PIPELINE_OPTIONS.simulateWb = load(WB_SIM_KEY) !== false;
wbSimToggle.checked = PIPELINE_OPTIONS.simulateWb;

wbSimToggle.addEventListener("change", () => {
  PIPELINE_OPTIONS.simulateWb = wbSimToggle.checked;
  store(WB_SIM_KEY, wbSimToggle.checked);
  schedulePreview();
  if (thumbSource) renderThumbnails(...thumbSource);
  showStatus(wbSimToggle.checked
    ? "Balance des blancs simulée comme sur le boîtier."
    : "Balance des blancs : décalage R/B seulement, comme le convertisseur.");
});
