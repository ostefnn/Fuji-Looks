/* Fuji Looks — Panneau « Pellicule » : développement et texture du film choisi. */

const recipePanel = document.getElementById("recipePanel");
const filmPanel = document.getElementById("filmPanel");
const tabRecipe = document.getElementById("tabRecipe");
const navRecipeLabel = document.getElementById("navRecipeLabel");
const filmName = document.getElementById("filmName");
const filmMeta = document.getElementById("filmMeta");
const filmTag = document.getElementById("filmTag");
const filmSource = document.getElementById("filmSource");
const filmResetButton = document.getElementById("filmResetButton");
const filmBalance = document.getElementById("filmBalance");
const filmGrainSize = document.getElementById("filmGrainSize");
const filmPush = document.getElementById("filmPush");

const frNumber = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

// Curseurs du panneau : clé dans currentFilm, élément, affichage de la valeur.
const FILM_SLIDERS = [
  ["ev", "filmEv", (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${frNumber(Math.abs(v))} IL`],
  ["grain", "filmGrain", (v) => String(v)],
  ["halation", "filmHalation", (v) => String(v)],
  ["softness", "filmSoftness", (v) => String(v)],
  ["couplers", "filmCouplers", (v) => String(v)],
  ["grade", "filmGrade", (v) => (v === 2 ? "2 · normal" : v === 0 ? "0 · doux" : v === 5 ? "5 · dur" : String(v))],
  ["filterY", "filmFilterY", (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} Y`],
  ["filterM", "filmFilterM", (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} M`]
].map(([key, id, format]) => ({
  key,
  input: document.getElementById(id),
  output: document.getElementById(`${id}Value`),
  format
}));

function filmEdited(key, value) {
  if (!currentFilm) return;
  commit(`film:${key}`);
  currentFilm = { ...currentFilm, [key]: value };
  modified = true;
  updateFilmEditor();
  saveDraft();
  schedulePreview();
}

FILM_SLIDERS.forEach(({ key, input }) => {
  input.addEventListener("input", () => {
    markInteractive();
    filmEdited(key, Number(input.value));
  });
  // Double-clic : valeur par défaut du film.
  input.addEventListener("dblclick", () => {
    if (currentFilm) filmEdited(key, filmDefaults(filmByKey.get(currentFilm.film))[key]);
  });
});
filmBalance.addEventListener("change", () => filmEdited("balance", filmBalance.value));
filmGrainSize.addEventListener("change", () => filmEdited("grainSize", filmGrainSize.value));
filmPush.addEventListener("change", () => filmEdited("push", Number(filmPush.value)));

filmResetButton.addEventListener("click", () => {
  if (!currentFilm) return;
  commit();
  currentFilm = filmSpec(currentFilm.film);
  modified = false;
  updateFilmEditor();
  saveDraft();
  schedulePreview();
});

function filmIsDefault(spec) {
  const defaults = filmSpec(spec.film);
  return Object.keys(defaults).every((key) => defaults[key] === spec[key]);
}

// Affiche le panneau Recette ou Pellicule selon le look en cours, et les exports qui vont avec.
// Même chose pour un Picture Control Nikon (panneau « Nikon », exports .NP3 et LUT).
function updateFilmEditor() {
  const film = currentFilm && filmByKey.get(currentFilm.film);
  const filmMode = Boolean(film && applied);
  const nikonMode = Boolean(!filmMode && currentNikon && applied);
  const lookMode = filmMode || nikonMode;
  const tabLabel = filmMode ? "Pellicule" : nikonMode ? "Nikon" : "Recette";
  recipePanel.dataset.film = String(filmMode);
  tabRecipe.textContent = tabLabel;
  navRecipeLabel.textContent = tabLabel;
  if (tabRecipe.getAttribute("aria-selected") === "true") {
    recipePanel.hidden = lookMode;
    filmPanel.hidden = !filmMode;
    nikonPanel.hidden = !nikonMode;
  }
  document.body.classList.toggle("film-mode", filmMode);
  document.body.classList.toggle("nikon-mode", nikonMode);
  document.getElementById("recipeExportItems").hidden = lookMode;
  document.getElementById("filmExportItems").hidden = !filmMode;
  document.getElementById("nikonExportItems").hidden = !nikonMode;
  document.getElementById("exportLookLabel").textContent = filmMode ? `Pellicule ${film.name}`
    : nikonMode ? `Picture Control ${currentNikon.name}` : "Recette";
  document.getElementById("recipeFiles").hidden = lookMode;
  document.getElementById("recipeCodeButtons").hidden = lookMode;
  document.getElementById("filmFilesHint").hidden = !filmMode;
  document.getElementById("nikonFiles").hidden = !nikonMode;
  document.getElementById("recipeCardCard").hidden = lookMode;
  document.getElementById("recipeFilesTitle").textContent = filmMode ? "Fichier de la pellicule"
    : nikonMode ? "Fichiers du Picture Control" : "Fichiers de la recette";
  if (nikonMode) updateNikonEditor();
  if (!filmMode) return;

  const shelf = FILM_SHELVES.find((s) => s.id === film.shelf);
  filmName.textContent = film.name;
  filmMeta.textContent = `ISO ${film.iso} · ${film.process} · ${shelf.kindLabel}`;
  filmTag.textContent = `« ${film.tag} »`;
  filmSource.textContent = FILM_MODELS[film.key]
    ? "Couleur : modèle paramétrique Fuji Looks (pas de LUT pour ce film). Grain, halation, douceur, développement et tirage : modèle Fuji Looks."
    : "Couleur : LUT de la collection Film-Luts (MIT). Grain, halation, douceur, développement et tirage : modèle Fuji Looks.";
  FILM_SLIDERS.forEach(({ key, input, output, format }) => {
    input.value = currentFilm[key];
    output.textContent = format(Number(currentFilm[key]));
  });
  filmBalance.value = currentFilm.balance;
  filmGrainSize.value = currentFilm.grainSize;
  filmPush.value = String(currentFilm.push || 0);
  filmResetButton.disabled = filmIsDefault(currentFilm);
}

// LUT 3D de la pellicule en cours : la couleur seule (exposition et équilibrage compris).
document.getElementById("filmCubeButton").addEventListener("click", async () => {
  if (!currentFilm) return;
  closeMenus();
  if (!(await ensureFilmLuts())) return;
  const size = Number(lutSize.value) || 33;
  const slug = currentFilm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  downloadText(`${slug}-${size}.cube`, filmCubeText(currentFilm, size), "text/plain");
  showStatus("LUT 3D de la pellicule téléchargée.");
});
