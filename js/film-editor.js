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

const frNumber = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

// Curseurs du panneau : clé dans currentFilm, élément, affichage de la valeur.
const FILM_SLIDERS = [
  ["ev", "filmEv", (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${frNumber(Math.abs(v))} IL`],
  ["grain", "filmGrain", (v) => String(v)],
  ["halation", "filmHalation", (v) => String(v)],
  ["softness", "filmSoftness", (v) => String(v)]
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
function updateFilmEditor() {
  const film = currentFilm && filmByKey.get(currentFilm.film);
  const filmMode = Boolean(film && applied);
  recipePanel.dataset.film = String(filmMode);
  tabRecipe.textContent = filmMode ? "Pellicule" : "Recette";
  navRecipeLabel.textContent = filmMode ? "Pellicule" : "Recette";
  if (tabRecipe.getAttribute("aria-selected") === "true") {
    recipePanel.hidden = filmMode;
    filmPanel.hidden = !filmMode;
  }
  document.body.classList.toggle("film-mode", filmMode);
  document.getElementById("recipeExportItems").hidden = filmMode;
  document.getElementById("filmExportItems").hidden = !filmMode;
  document.getElementById("exportLookLabel").textContent = filmMode ? `Pellicule ${film.name}` : "Recette";
  document.getElementById("recipeFiles").hidden = filmMode;
  document.getElementById("recipeCodeButtons").hidden = filmMode;
  document.getElementById("filmFilesHint").hidden = !filmMode;
  document.getElementById("recipeCardCard").hidden = filmMode;
  document.getElementById("recipeFilesTitle").textContent = filmMode ? "Fichier de la pellicule" : "Fichiers de la recette";
  if (!filmMode) return;

  const shelf = FILM_SHELVES.find((s) => s.id === film.shelf);
  filmName.textContent = film.name;
  filmMeta.textContent = `ISO ${film.iso} · ${film.process} · ${shelf.kindLabel}`;
  filmTag.textContent = `« ${film.tag} »`;
  filmSource.textContent = FILM_MODELS[film.key]
    ? "Couleur : modèle paramétrique Fuji Looks (pas de LUT pour ce film). Grain, halation et douceur : modèle Fuji Looks."
    : "Couleur : LUT de la collection Film-Luts (MIT). Grain, halation et douceur : modèle Fuji Looks.";
  FILM_SLIDERS.forEach(({ key, input, output, format }) => {
    input.value = currentFilm[key];
    output.textContent = format(Number(currentFilm[key]));
  });
  filmBalance.value = currentFilm.balance;
  filmGrainSize.value = currentFilm.grainSize;
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
