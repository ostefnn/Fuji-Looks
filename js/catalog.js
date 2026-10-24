/* Fuji Looks — Catalogue des looks (recettes perso, de démarrage, simulations) et stockage local. */
// --- Catalogue des looks -------------------------------------------------

const LOOKS = [{ id: "original", name: "Original", desc: "Naturel", group: "base", recipe: null }];

// Moments conseillés (classement du dépôt quiode/fujifilm-recipes, d'après Fuji X Weekly).
const MOMENTS = {
  golden: { icon: "🌅", label: "Golden hour" },
  midday: { icon: "☀️", label: "Mi-journée" },
  overcast: { icon: "☁️", label: "Temps couvert" },
  indoor: { icon: "🏠", label: "Intérieur" },
  night: { icon: "🌙", label: "Nuit" }
};

// Le parser du convertisseur retire le « - » en tête des champs texte : « -1/3 to +1/3 » devient
// « 1/3 to +1/3 ». On reprend la valeur telle qu'écrite dans la recette.
function restoreExposureText(text, result) {
  if (!result || !result.values.exposureComp) return result;
  const match = /exposure\s*comp(?:ensation)?\.?\s*[:=]\s*(.+?)\s*$/im.exec(String(text || ""));
  if (match) result.values.exposureComp = match[1].slice(0, 120);
  return result;
}

function parseRecipeText(text, opts) {
  return restoreExposureText(text, FR.parseText(text, opts));
}

function parseAnyRecipe(text) {
  const result = FR.parseAny(text);
  return result && (result.source === "text" || result.source === "screenshot") ? restoreExposureText(text, result) : result;
}

(window.CUSTOM_RECIPES || []).forEach(({ name, author = "", notes = "", moment = "", text }, i) => {
  const parsed = parseRecipeText(text);
  if (!parsed) return;
  const recipe = FR.normalize(Object.assign({}, FR.DEFAULT_RECIPE, parsed.values, { name, author, notes }));
  LOOKS.push({
    id: `custom-${i}`,
    name,
    desc: MOMENTS[moment] ? `${MOMENTS[moment].icon} ${FR.simById(recipe.filmSim).name}` : FR.simById(recipe.filmSim).name,
    moment: MOMENTS[moment] ? moment : "",
    group: "custom",
    recipe
  });
});

FR.STARTERS.forEach((recipe, i) => {
  LOOKS.push({
    id: `recipe-${i}`,
    name: recipe.name,
    desc: FR.simById(recipe.filmSim).name,
    group: "custom", // exemples du convertisseur, à la suite de tes recettes
    recipe
  });
});

// Catalogue : 340 recettes de la bibliothèque Kata (réglages + lien vers l'article d'origine).
const SENSORS = ["X-Trans V", "X-Trans IV", "X-Trans III", "X-Trans II", "X-Trans I", "GFX", "Bayer"];
(window.KATA_RECIPES || []).forEach(({ recipe: values, sensors, url }) => {
  const recipe = FR.normalize(Object.assign({}, FR.DEFAULT_RECIPE, values));
  const slug = values.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Identifiant stable tiré du nom (les favoris y sont liés) ; suffixe si deux noms ne diffèrent que par la casse.
  let id = `kata-${slug}`;
  for (let n = 2; LOOKS.some((look) => look.id === id); n++) id = `kata-${slug}-${n}`;
  LOOKS.push({
    id,
    name: recipe.name,
    desc: `${FR.simById(recipe.filmSim).name} · ${sensors[0] || "?"}`,
    group: "catalog",
    sensors,
    sourceUrl: url,
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

// Deux onglets (plus ★ Favoris s'il y en a) ; « Original » est repris en tête de chaque onglet.
// « Recettes » : bibliothèque, puis recettes perso, puis exemples du convertisseur.
const ALL_GROUPS = [
  { id: "custom", title: "Recettes" },
  { id: "catalog", title: "Catalogue" },
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

// Les recettes de la bibliothèque passent en tête de l’onglet « Recettes ».
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
const view = { zoom: 1, x: 0, y: 0 };
