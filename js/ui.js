/* Fuji Looks — Interface : onglets du panneau, menus, dialogues, navigation mobile, raccourcis. */

// --- Onglets du panneau de droite (Recette / Pellicule, Retouche, Cadre) -----------

const INSPECTOR_TABS = [
  ["tabRecipe", () => (document.body.classList.contains("film-mode") ? filmPanel : recipePanel)],
  ["tabEdit", () => document.getElementById("editSection")],
  ["tabFrame", () => document.getElementById("framePanel")]
];

function showInspectorTab(id) {
  INSPECTOR_TABS.forEach(([tabId]) => {
    const tab = document.getElementById(tabId);
    const active = tabId === id;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  recipePanel.hidden = true;
  filmPanel.hidden = true;
  document.getElementById("editSection").hidden = true;
  document.getElementById("framePanel").hidden = true;
  INSPECTOR_TABS.find(([tabId]) => tabId === id)[1]().hidden = false;
}

INSPECTOR_TABS.forEach(([id], i) => {
  const tab = document.getElementById(id);
  tab.addEventListener("click", () => showInspectorTab(id));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.stopPropagation();
    const next = INSPECTOR_TABS[(i + (event.key === "ArrowRight" ? 1 : INSPECTOR_TABS.length - 1)) % INSPECTOR_TABS.length][0];
    document.getElementById(next).focus();
    showInspectorTab(next);
  });
});

// --- Menus déroulants (Exporter, Plus d'actions) ------------------------------------

const MENUS = [
  [document.getElementById("exportMenuButton"), document.getElementById("exportMenu")],
  [document.getElementById("moreButton"), document.getElementById("moreMenu")]
];

function closeMenus() {
  MENUS.forEach(([button, menu]) => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  });
}

MENUS.forEach(([button, menu]) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector(".menu-item:not([hidden]):not([aria-disabled='true']):not(:disabled)")?.focus();
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".menu-item");
    if (!item) return;
    if (item.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    closeMenus();
  });
  // Flèches haut / bas entre les entrées du menu, Échap pour le fermer.
  menu.addEventListener("keydown", (event) => {
    const items = [...menu.querySelectorAll(".menu-item")].filter((el) => !el.hidden && !el.closest("[hidden]") && !el.disabled);
    const i = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(i + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (event.key === "Escape") {
      closeMenus();
      button.focus();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) closeMenus();
});

// --- Dialogues (Exporter et partager, Mon boîtier, Importer et bibliothèque) ------------

function openDialog(id, sectionId) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
  const section = sectionId && document.getElementById(sectionId);
  if (section) requestAnimationFrame(() => section.scrollIntoView({ block: "start" }));
}

document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (opener) {
    closeMenus();
    openDialog(opener.dataset.open, opener.dataset.section);
    return;
  }
  const closer = event.target.closest("[data-close]");
  if (closer) closer.closest("dialog").close();
});

// Un clic en dehors du dialogue le ferme.
document.querySelectorAll("dialog.dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

// « Exporter la photo » du dialogue : même action que celle du menu.
const dialogExportButton = document.getElementById("dialogExportButton");
dialogExportButton.addEventListener("click", () => {
  document.getElementById("exportDialog").close();
  exportButton.click();
});
new MutationObserver(() => { dialogExportButton.disabled = exportButton.disabled; })
  .observe(exportButton, { attributes: true, attributeFilter: ["disabled"] });

// --- Navigation mobile : un seul volet sous la photo -----------------------------------

const mobileNav = document.querySelector(".mobile-nav");

function showPane(pane) {
  document.body.dataset.pane = pane;
  mobileNav.querySelectorAll("[data-pane]").forEach((b) => {
    if (b.dataset.pane === pane) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (pane === "recipe") showInspectorTab("tabRecipe");
  if (pane === "edit") showInspectorTab("tabEdit");
  window.scrollTo(0, 0);
}

mobileNav.querySelectorAll("[data-pane]").forEach((button) => {
  button.addEventListener("click", () => showPane(button.dataset.pane));
});

// --- Titre au-dessus de la photo, favori ------------------------------------------------

const lookTitle = document.getElementById("lookTitle");
const lookBadge = document.getElementById("lookBadge");
const lookFavButton = document.getElementById("lookFavButton");

function updateStageTitle() {
  const look = currentLookId && lookById.get(currentLookId);
  if (!applied) {
    lookTitle.textContent = "Original";
    lookBadge.textContent = "Sans look";
  } else if (currentFilm) {
    const film = filmByKey.get(currentFilm.film);
    lookTitle.textContent = film.name + (modified ? " · modifiée" : "");
    lookBadge.textContent = `Pellicule · ${film.process}`;
  } else {
    lookTitle.textContent = (recipe.name || "Recette") + (modified ? " · modifiée" : "");
    lookBadge.textContent = FR.simById(recipe.filmSim).name;
  }
  const canFav = Boolean(look && isRealLook(look));
  lookFavButton.hidden = !canFav;
  if (canFav) {
    const on = favorites.has(look.id);
    lookFavButton.setAttribute("aria-pressed", String(on));
    lookFavButton.setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris");
  }
  document.getElementById("intensityLabel").textContent = currentFilm ? "Intensité de la pellicule" : "Intensité du look";
}

lookFavButton.addEventListener("click", () => {
  if (currentLookId && lookById.has(currentLookId)) toggleFavorite(currentLookId);
});

// --- Résultat / Avant-Après -------------------------------------------------------------

const viewResult = document.getElementById("viewResult");
const viewSplit = document.getElementById("viewSplit");

function updateViewButtons() {
  viewResult.setAttribute("aria-pressed", String(!splitView));
  viewSplit.setAttribute("aria-pressed", String(splitView));
}
viewResult.addEventListener("click", () => { setSplitView(false); updateViewButtons(); });
viewSplit.addEventListener("click", () => { setSplitView(true); updateViewButtons(); });

// --- Boîtier et nom de fichier dans la barre du haut ------------------------------------

function updateCameraButton() {
  const camera = CAMERAS.get(cameraId);
  const generation = camera && CAMERA_GENERATIONS.find((g) => g.cameras.some((c) => c.id === camera.id));
  document.getElementById("cameraButtonName").textContent = camera ? camera.name : "aucun";
  document.getElementById("cameraButtonSensor").textContent = generation ? `· ${generation.name}` : "";
}
document.getElementById("cameraButton").addEventListener("click", () => openDialog("cameraDialog"));

let currentFileName = "";
function updateFileLabel() {
  const label = document.getElementById("fileLabel");
  const count = typeof series !== "undefined" && series.length > 1 ? ` · ${seriesIndex + 1} / ${series.length}` : "";
  label.textContent = currentFileName ? currentFileName + count : "";
  label.title = currentFileName;
}

// --- Raccourcis clavier ---------------------------------------------------------------------

function isTyping(target) {
  return target && (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT" ||
    (target.tagName === "INPUT" && !["range", "checkbox", "button"].includes(target.type)));
}

// Looks visibles de l'onglet ouvert, dans l'ordre affiché.
function visibleLookIds() {
  const panel = lookGroups.querySelector(".look-grid:not([hidden])");
  return panel ? [...panel.querySelectorAll(".look-item:not([hidden])")].map((item) => item.dataset.look) : [];
}

// --- Mode focus : la photo seule, sur toute la largeur (grand écran) ----------------------

const focusToggle = document.getElementById("focusToggle");
const wideScreen = window.matchMedia("(min-width: 1100px)");

function setFocusMode(on) {
  document.body.classList.toggle("focus-mode", on);
  focusToggle.setAttribute("aria-pressed", String(on));
  focusToggle.title = on ? "Quitter le mode focus (F ou Échap)" : "Mode focus : masquer les looks et les réglages (F)";
}

focusToggle.addEventListener("click", () => setFocusMode(!document.body.classList.contains("focus-mode")));
// En dessous de 1100 px, la mise en page mobile n'a pas de mode focus.
wideScreen.addEventListener("change", () => {
  if (!wideScreen.matches) setFocusMode(false);
});

document.addEventListener("keydown", (event) => {
  if (document.querySelector("dialog[open]")) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
    event.preventDefault();
    if (!exportButton.disabled) exportButton.click();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
  if (event.target.type === "range" || event.target.closest?.('[role="tablist"], [role="menu"]')) return;
  if ((event.key === "f" || event.key === "F") && wideScreen.matches) {
    event.preventDefault();
    setFocusMode(!document.body.classList.contains("focus-mode"));
    return;
  }
  if (event.key === "Escape" && document.body.classList.contains("focus-mode")) {
    setFocusMode(false);
    return;
  }
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    const ids = visibleLookIds();
    if (!ids.length) return;
    event.preventDefault();
    const i = ids.indexOf(currentLookId);
    const next = ids[i < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, i + (event.key === "ArrowRight" ? 1 : -1)))];
    if (next && next !== currentLookId) {
      selectLook(next);
      lookGroups.querySelector(`.look-card[data-look="${CSS.escape(next)}"]`)?.scrollIntoView({ block: "nearest" });
    }
  } else if (event.key === " " && originalImage && !event.target.closest("button, a, label")) {
    event.preventDefault();
    if (!event.repeat) setComparing(true);
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === " " && comparing) setComparing(false);
});

updateCameraButton();
updateStageTitle();
updateViewButtons();
