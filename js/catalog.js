/* Fuji Looks — Catalogue des looks (recettes perso, de démarrage, simulations) et stockage local. */
// --- Catalogue des looks -------------------------------------------------

const LOOKS = [{ id: "original", name: "Original", desc: "Naturel", group: "base", recipe: null }];

// Le parser du convertisseur retire le « - » en tête des champs texte : « -1/3 to +1/3 » devient
// « 1/3 to +1/3 ». On reprend la valeur telle qu'écrite dans la recette.
function restoreExposureText(text, result) {
  if (!result || !result.values.exposureComp) return result;
  const match = /exposure\s*comp(?:ensation)?\.?\s*[:=]\s*(.+?)\s*$/im.exec(String(text || ""));
  if (match) result.values.exposureComp = match[1].slice(0, 120);
  return result;
}

/*
 * Recettes copiées depuis un site ou un réseau social : on remet le texte au format attendu par
 * le parser du convertisseur avant de le lire. Puces, tabulations, tirets typographiques
 * (« ‑1 » devenait +1), abréviations courantes (Col. Chr., ISO N.R., EV Comp., WB: K-7500…).
 */
const RECIPE_ALIASES = [
  [/^(?:film\s*sim(?:ulation)?|simulation)\b/i, "Film Simulation"],
  [/^(?:col(?:or|our)?\.?\s*chr(?:ome)?\.?\s*(?:fx\s*)?blue|chrom(?:e)?\.?\s*fx\s*blue|ccfxb|cc\s*fx\s*blue)\b/i, "Color Chrome FX Blue"],
  [/^(?:col(?:or|our)?\.?\s*chr(?:ome)?\.?\s*(?:effect)?|cce)\b/i, "Color Chrome Effect"],
  [/^(?:iso\s*n\.?\s*r\.?|high\s*iso\s*n\.?\s*r\.?|noise\s*red(?:uction)?|nr)\b/i, "Noise Reduction"],
  [/^(?:ev\s*comp(?:ensation)?\.?|exp(?:osure)?\.?\s*comp(?:ensation)?\.?|exposure)\b/i, "Exposure Compensation"],
  [/^(?:wb|white\s*bal(?:ance)?)\b/i, "White Balance"],
  [/^(?:dr|d\.\s*range|dynamic\s*range)\b/i, "Dynamic Range"],
  [/^(?:highlights?|hl)\b/i, "Highlight"],
  [/^(?:shadows?|sh)\b/i, "Shadow"],
  [/^colou?r\b/i, "Color"],
  [/^grain(?:\s*effect)?\b/i, "Grain Effect"]
];

function normalizeRecipeText(text) {
  return String(text || "")
    .replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, "-") // tirets typographiques → « - »
    .split(/\r?\n/)
    .map((raw) => {
      let line = raw.replace(/^\s*(?:[*•·▪►>\-]|\d+[.)])\s+/, "").trim(); // puces et numéros
      // « Clé<TAB>valeur », « Clé. valeur » ou « Clé - valeur » → « Clé: valeur »
      line = line.replace(/^([A-Za-z][A-Za-z .()/]*?)\s*(?:\t+|\.\s+(?=[-+\dA-Za-z])|\s+-\s+)(?=\S)/, "$1: ");
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).trim();
        const alias = RECIPE_ALIASES.find(([re]) => re.test(key) && key.replace(re, "").trim() === "");
        if (alias) line = `${alias[1]}:${line.slice(colon + 1)}`;
      }
      // « Monochromatic Color: WC +2, MG -1 » (une seule ligne) → une ligne par réglage.
      const mono = /^mono(?:chromatic)?\s*colou?r\b[^:]*:(.*)$/i.exec(line);
      if (mono) {
        const wc = /\b(?:WC|warm\s*\/?\s*cool)\s*:?\s*([+-]?\d+(?:\.\d+)?)/i.exec(mono[1]);
        const mg = /\b(?:MG|magenta\s*\/?\s*green)\s*:?\s*([+-]?\d+(?:\.\d+)?)/i.exec(mono[1]);
        if (wc || mg) {
          return [wc && `Monochromatic Color WC: ${wc[1]}`, mg && `Monochromatic Color MG: ${mg[1]}`].filter(Boolean).join("\n");
        }
      }
      // Balance des blancs notée « K-7500 », « K 7500 » ou « 7500 K » → « 7500K »
      line = line.replace(/^(White Balance:\s*)K\s*-?\s*(\d{4,5})\b/i, "$1$2K").replace(/^(White Balance:\s*)(\d{4,5})\s+K\b/i, "$1$2K");
      return line;
    })
    .join("\n");
}

function parseRecipeText(text, opts) {
  const clean = normalizeRecipeText(text);
  return restoreExposureText(clean, FR.parseText(clean, opts));
}

function parseAnyRecipe(text) {
  // Open Fuji Recipe (un document, une liste ou une bibliothèque) : la première recette est chargée,
  // les autres sont proposées pour la bibliothèque (voir applyImport).
  const ofr = parseOfrText(text);
  if (ofr) return Object.assign(ofr[0], { batch: ofr });
  const result = FR.parseAny(text);
  if (result && result.source === "text") return parseRecipeText(text) || result;
  return result && result.source === "screenshot" ? restoreExposureText(text, result) : result;
}

function lookSlug(name) {
  return String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Identifiant stable tiré du nom : ajouter ou retirer une recette ne décale plus les favoris.
function customLookId(name) {
  return `custom-${lookSlug(name)}`;
}

/*
 * Anciens identifiants (« custom-0 »… : position dans custom-recipes.js) → identifiants actuels.
 * Les recettes retirées car identiques à une recette du catalogue renvoient vers celle-ci.
 * Un nom = recette gardée dans custom-recipes.js ; « kata-… » = recette du catalogue.
 */
const LEGACY_CUSTOM_IDS = [
  "kata-kodak-vision3-250d-v2", "kata-1970-s-summer", "kata-vivid-velvia", "kata-frgmt-b-w",
  "kata-kodachrome-64-x-trans-iv", "kata-kodachrome-25-x-trans-iv", "Kodachrome II", "kata-vintage-color-v2",
  "kata-fujicolor-nph", "Kodak T-Max P3200", "kata-classic-b-w", "kata-agfa-scala-x-trans-v",
  "kata-kodak-t-max-100-hard-tone", "kata-kodak-t-max-100-soft-tone", "Kodak Plus-X 125", "kata-ilford-fp4-plus-125",
  "Agfa 400S", "Cotton Candy Chrome", "Aerochrome v3", "Kodak Portra 400 v2", "kata-timeless-negative-x-trans-v",
  "1970's Summer", "kata-cinestill-800t-x-trans-v", "kata-superia-xtra-400-x-trans-v", "Kodak Ultramax 400",
  "California Summer", "kata-kodak-gold-200-x-trans-v", "kata-pacific-blues-x-trans-v", "Reggie's Portra",
  "Vibrant Arizona", "Kodachrome 64 (X-Trans V)", "Real Leica", "Winter Chrome"
];

function migrateLookId(id) {
  const match = /^custom-(\d+)$/.exec(String(id || ""));
  if (!match) return id;
  const target = LEGACY_CUSTOM_IDS[Number(match[1])];
  if (!target) return id;
  return target.startsWith("kata-") ? target : customLookId(target);
}

(window.CUSTOM_RECIPES || []).forEach(({ name, author = "", notes = "", text }) => {
  const parsed = parseRecipeText(text);
  if (!parsed) return;
  const recipe = FR.normalize(Object.assign({}, FR.DEFAULT_RECIPE, parsed.values, { name, author, notes }));
  LOOKS.push({
    id: customLookId(name),
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
    desc: `${FR.simById(recipe.filmSim).name} · Exemple`,
    group: "catalog", // exemples du convertisseur : « Recettes » ne garde que les tiennes
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

// Pellicules argentiques (js/films.js) : un rendu, pas une recette Fujifilm.
FILMS.forEach((film) => {
  LOOKS.push({
    id: `film-${film.key}`,
    name: film.name,
    desc: `ISO ${film.iso} · ${film.process}`,
    group: "films",
    shelf: film.shelf,
    film: film.key,
    recipe: null
  });
});

// Quatre onglets ; « Original » est repris en tête de chaque onglet.
// « Recettes » : bibliothèque, puis recettes perso, puis exemples du convertisseur.
const ALL_GROUPS = [
  { id: "custom", title: "Recettes" },
  { id: "catalog", title: "Catalogue" },
  { id: "sims", title: "Simulations" },
  { id: "films", title: "Pellicules" }
];

// Ce qu'un look applique : une recette Fujifilm, une pellicule (réglages par défaut du film) ou rien.
function lookRender(look) {
  if (!look) return null;
  return look.film ? filmSpec(look.film) : look.recipe || null;
}

function isRealLook(look) {
  return Boolean(look && (look.recipe || look.film));
}
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
// Pellicule en cours (réglages compris), ou null : la recette s'applique alors.
let currentFilm = null;
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
