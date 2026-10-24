/* Fuji Looks — Éditeur de recette : réglages Fujifilm, brouillon. */
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
  updateCompat();
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
