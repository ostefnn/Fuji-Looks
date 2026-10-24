/* Fuji Looks — Bibliothèque de recettes enregistrées sur l'appareil. */
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
    ? `« ${saved.name} » enregistrée dans « Recettes ».`
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

// Ajoute plusieurs recettes d'un coup (import Open Fuji Recipe), sans doublon. Renvoie le nombre ajouté.
function addRecipesToLibrary(recipes) {
  let added = 0;
  recipes.forEach((values) => {
    const r = FR.normalize(values);
    if (library.some((other) => JSON.stringify(other.recipe) === JSON.stringify(r))) return;
    library.push({ id: Date.now().toString(36) + added + Math.random().toString(36).slice(2, 5), savedAt: Date.now(), recipe: r });
    added++;
  });
  if (added) refreshLibrary();
  return added;
}
