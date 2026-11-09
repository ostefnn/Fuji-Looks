/* Fuji Looks — Bibliothèque de looks : onglets, filtres, cartes, vignettes, aperçu au survol. */

// --- Favoris, recherche et filtres -------------------------------------------

const FAV_KEY = "fuji-looks.favorites";
let favorites = new Set((Array.isArray(load(FAV_KEY)) ? load(FAV_KEY) : []).map(migrateLookId));
let lookQuery = "";
let lookSim = ""; // "" (toutes), "color", "mono" ou l'identifiant d'une Film Simulation
let lookSensor = ""; // "" ou un capteur (X-Trans V, X-Trans IV…), pour le catalogue seulement
let favOnly = false;
let filmShelf = "neg"; // rayon de l'onglet Pellicules
const FILM_PREVIEW_KEY = "fuji-looks.film-preview";
let filmPreview = load(FILM_PREVIEW_KEY) === "mine" ? "mine" : "ref"; // vignettes des pellicules

const favFilter = document.getElementById("favFilter");
const filmTools = document.getElementById("filmTools");
const filmShelves = document.getElementById("filmShelves");
const filmPreviewRef = document.getElementById("filmPreviewRef");
const filmPreviewMine = document.getElementById("filmPreviewMine");
const filmPreviewHint = document.getElementById("filmPreviewHint");

function normalizeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function activeTabId() {
  return lookTabs.querySelector('[aria-selected="true"]')?.id.replace("tab-", "") || null;
}

function lookMatches(look) {
  if (!isRealLook(look)) return true; // « Original » reste toujours visible
  if (favOnly && !favorites.has(look.id)) return false;
  let words;
  if (look.nikon) {
    words = [look.name, look.desc, look.nikon.comment, "nikon picture control np3"];
  } else if (look.film) {
    // Le rayon ne filtre que sans recherche : une recherche parcourt toutes les pellicules.
    if (!lookQuery && look.shelf !== filmShelf) return false;
    const film = filmByKey.get(look.film);
    words = [film.name, film.process, film.tag, `iso ${film.iso}`, FILM_SHELVES.find((s) => s.id === film.shelf).kindLabel, "pellicule film"];
  } else {
    const sim = FR.simById(look.recipe.filmSim);
    if (lookSim === "color" ? sim.mono : lookSim === "mono" ? !sim.mono : lookSim && sim.id !== lookSim) return false;
    if (lookSensor && look.group === "catalog" && !(look.sensors || []).includes(lookSensor)) return false;
    words = [look.name, look.desc, sim.name, look.recipe.author, (look.sensors || []).join(" ")];
  }
  if (!lookQuery) return true;
  const haystack = normalizeText(words.join(" "));
  return normalizeText(lookQuery).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function toggleFavorite(lookId) {
  if (favorites.has(lookId)) favorites.delete(lookId);
  else favorites.add(lookId);
  store(FAV_KEY, [...favorites]);
  const name = lookById.get(lookId)?.name || "Look";
  showStatus(favorites.has(lookId) ? `« ${name} » ajouté aux favoris.` : `« ${name} » retiré des favoris.`);
  lookGroups.querySelectorAll(`.look-item[data-look="${CSS.escape(lookId)}"] .fav-button`).forEach(updateFavButton);
  updateStageTitle();
  applyLookFilter();
}

function updateFavButton(button) {
  const id = button.closest(".look-item").dataset.look;
  const on = favorites.has(id);
  const name = lookById.get(id).name;
  button.setAttribute("aria-pressed", String(on));
  button.setAttribute("aria-label", `${on ? "Retirer" : "Ajouter"} ${name} ${on ? "des" : "aux"} favoris`);
}

// Défilement continu : chaque onglet affiche LOOK_PAGE looks de plus quand on arrive en bas.
const LOOK_PAGE = 24;
let lookLimits = {};

function resetLookPaging() {
  lookLimits = {};
}

// Masque les looks qui ne correspondent pas et met à jour les compteurs des onglets.
function applyLookFilter() {
  let firstWithMatches = null;
  GROUPS.forEach(({ id }) => {
    const panel = document.getElementById(`panel-${id}`);
    const limit = lookLimits[id] || LOOK_PAGE;
    let count = 0;
    panel.querySelectorAll(".look-item").forEach((item) => {
      const look = lookById.get(item.dataset.look);
      const matches = lookMatches(look);
      const real = isRealLook(look);
      if (matches && real) count++;
      // Le look sélectionné reste visible même au-delà de la page affichée.
      item.hidden = !matches || (real && count > limit && look.id !== currentLookId);
    });
    const more = panel.querySelector(".look-more");
    const rest = count - limit;
    more.hidden = rest <= 0;
    more.querySelector("small").textContent = rest > 0 ? `${rest} restant${rest > 1 ? "s" : ""}` : "";
    panel.querySelector(".look-empty").hidden = count > 0;
    document.querySelector(`#tab-${id} small`).textContent = id === "films" && !lookQuery && !favOnly ? FILMS.length : count;
    if (count && !firstWithMatches) firstWithMatches = id;
  });
  updateShelfCounts();
  // Recherche sans résultat dans l'onglet ouvert : on passe au premier onglet qui en a.
  const active = activeTabId();
  const activeCount = active ? Number(document.querySelector(`#tab-${active} small`).textContent) : 0;
  if ((lookQuery || lookSim || lookSensor || favOnly) && !activeCount && firstWithMatches) showTab(firstWithMatches);
}

lookSearch.addEventListener("input", () => {
  lookQuery = lookSearch.value.trim();
  resetLookPaging();
  applyLookFilter();
});

[["Couleur", false], ["Noir & blanc", true]].forEach(([label, mono]) => {
  const group = document.createElement("optgroup");
  group.label = label;
  FR.SIMS.filter((sim) => Boolean(sim.mono) === mono).forEach((sim) => group.appendChild(new Option(sim.name, sim.id)));
  lookSimSelect.appendChild(group);
});
SENSORS.forEach((sensor) => lookSensorSelect.add(new Option(sensor, sensor)));
lookSensorSelect.addEventListener("change", () => {
  lookSensor = lookSensorSelect.value;
  resetLookPaging();
  applyLookFilter();
});

lookSimSelect.addEventListener("change", () => {
  lookSim = lookSimSelect.value;
  resetLookPaging();
  applyLookFilter();
});

favFilter.addEventListener("click", () => {
  favOnly = !favOnly;
  favFilter.setAttribute("aria-pressed", String(favOnly));
  resetLookPaging();
  applyLookFilter();
});

// --- Rayons de l'onglet Pellicules ----------------------------------------------

function buildShelves() {
  filmShelves.textContent = "";
  FILM_SHELVES.forEach((shelf) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.dataset.shelf = shelf.id;
    button.innerHTML = `${shelf.label} <small></small>`;
    button.addEventListener("click", () => {
      filmShelf = shelf.id;
      resetLookPaging();
      updateShelfButtons();
      applyLookFilter();
      document.getElementById("panel-films")?.scrollIntoView?.({ block: "nearest" });
    });
    filmShelves.appendChild(button);
  });
  updateShelfButtons();
}

function updateShelfButtons() {
  filmShelves.querySelectorAll("[data-shelf]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.shelf === filmShelf)));
}

function updateShelfCounts() {
  filmShelves.querySelectorAll("[data-shelf]").forEach((b) => {
    const n = LOOKS.filter((look) => look.film && look.shelf === b.dataset.shelf && (!favOnly || favorites.has(look.id))).length;
    b.querySelector("small").textContent = n;
  });
}

function updateFilmPreviewButtons() {
  filmPreviewRef.setAttribute("aria-pressed", String(filmPreview === "ref"));
  filmPreviewMine.setAttribute("aria-pressed", String(filmPreview === "mine"));
  filmPreviewHint.textContent = filmPreview === "ref"
    ? "La même scène pour tous les films : compare leurs couleurs d’un coup d’œil."
    : "Ta photo dans chaque pellicule.";
}

[[filmPreviewRef, "ref"], [filmPreviewMine, "mine"]].forEach(([button, value]) => {
  button.addEventListener("click", () => {
    filmPreview = value;
    store(FILM_PREVIEW_KEY, value);
    updateFilmPreviewButtons();
    refreshFilmThumbs();
  });
});

// --- Cartes ----------------------------------------------------------------------

function createLookItem(look) {
  const item = document.createElement("div");
  item.className = "look-item";
  item.dataset.look = look.id;
  item.appendChild(createLookCard(look));
  if (isRealLook(look)) {
    const fav = document.createElement("button");
    fav.type = "button";
    fav.className = "fav-button";
    fav.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-star"/></svg>';
    fav.addEventListener("click", () => toggleFavorite(look.id));
    item.appendChild(fav);
    updateFavButton(fav);
  }
  return item;
}

function createLookCard(look) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "look-card";
  card.dataset.look = look.id;

  const frame = document.createElement("span");
  frame.className = "look-thumb";
  const thumb = document.createElement("canvas");
  thumb.className = "look-swatch";
  thumb.setAttribute("aria-hidden", "true");
  frame.appendChild(thumb);
  // Type du look, pour ne pas confondre une recette « Tri-X 400 » et la pellicule Tri-X 400.
  if (look.film || look.nikon || look.group === "custom" || look.group === "catalog") {
    const kind = document.createElement("span");
    kind.className = `look-kind ${look.film ? "is-film" : look.nikon ? "is-nikon" : "is-recipe"}`;
    kind.textContent = look.film ? "Pellicule" : look.nikon ? "Nikon" : "Recette";
    frame.appendChild(kind);
  }
  if (look.film) {
    const badge = document.createElement("span");
    badge.className = "look-badge";
    badge.textContent = filmByKey.get(look.film).process;
    frame.appendChild(badge);
  }

  const name = document.createElement("span");
  name.className = "look-name";
  name.textContent = look.name;

  const desc = document.createElement("span");
  desc.className = "look-desc";
  desc.textContent = look.desc;

  card.append(frame, name, desc);
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
      if (look.film && !filmLutsReady()) return;
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

// Tri par Film Simulation (ordre des menus Fujifilm), puis par nom.
// Les recettes de la bibliothèque restent en tête de l'onglet « Recettes ».
const SIM_ORDER = new Map(FR.SIMS.map((sim, i) => [sim.id, i]));

function sortBySim(looks) {
  const rank = (look) => (look.id.startsWith("lib-") ? -1 : SIM_ORDER.get(FR.simById(look.recipe.filmSim).id) ?? 99);
  return looks
    .map((look, i) => ({ look, i }))
    .sort((a, b) => rank(a.look) - rank(b.look) ||
      (a.look.id.startsWith("lib-") ? a.i - b.i : a.look.name.localeCompare(b.look.name, "fr", { sensitivity: "base" })))
    .map(({ look }) => look);
}

// Arrivée en bas de la liste : on affiche la page suivante sans bouton à toucher.
const moreObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !entry.target.hidden) entry.target.click();
  });
}, { rootMargin: "200px" });

function buildLookGrid() {
  const original = lookById.get("original");
  const activeTab = activeTabId();
  lookTabs.textContent = "";
  lookGroups.textContent = "";
  GROUPS = ALL_GROUPS.filter((group) => LOOKS.some((look) => look.group === group.id));

  GROUPS.forEach((group) => {
    const groupLooks = LOOKS.filter((look) => look.group === group.id);
    const looks = group.id === "sims" || group.id === "films" || group.id === "nikon" ? groupLooks : sortBySim(groupLooks);

    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = `tab-${group.id}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `panel-${group.id}`);
    tab.textContent = group.title;
    const count = document.createElement("small");
    count.textContent = looks.length;
    tab.append(" ", count);
    tab.addEventListener("click", () => showTab(group.id));
    lookTabs.appendChild(tab);

    const grid = document.createElement("div");
    grid.className = "look-grid";
    grid.id = `panel-${group.id}`;
    grid.setAttribute("role", "tabpanel");
    grid.setAttribute("aria-labelledby", tab.id);
    const empty = document.createElement("p");
    empty.className = "look-empty";
    empty.textContent = "Aucun look ne correspond dans cet onglet.";
    empty.hidden = true;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "look-more";
    more.innerHTML = "<strong>Afficher plus</strong><small></small>";
    more.hidden = true;
    more.addEventListener("click", () => {
      lookLimits[group.id] = (lookLimits[group.id] || LOOK_PAGE) + LOOK_PAGE;
      applyLookFilter(); // les vignettes des nouveaux looks se calculent quand elles deviennent visibles
    });
    moreObserver.observe(more);
    const items = group.id === "films" || group.id === "nikon" ? looks.map(createLookItem) : [createLookItem(original), ...looks.map(createLookItem)];
    grid.append(...items, more, empty);
    lookGroups.appendChild(grid);
  });

  if (GROUPS.length) showTab(GROUPS.some((g) => g.id === activeTab) ? activeTab : GROUPS[0].id);
  markSelectedCard();
  updateCompat();
  applyLookFilter();
  observeThumbs();

  lookCount.textContent = LOOKS.length - 1;
}

function showTab(groupId) {
  // Le filtre par capteur ne concerne que le catalogue ; les simulations ne concernent pas les pellicules.
  lookSensorSelect.hidden = groupId !== "catalog";
  lookSimSelect.hidden = groupId === "films" || groupId === "nikon";
  filmTools.hidden = groupId !== "films";
  GROUPS.forEach(({ id }) => {
    const active = id === groupId;
    const tab = document.getElementById(`tab-${id}`);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(`panel-${id}`).hidden = !active;
  });
  if (groupId === "films") ensureFilmLuts();
}

// Navigation au clavier entre les onglets (flèches gauche / droite).
lookTabs.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.stopPropagation();
  const tabs = [...lookTabs.querySelectorAll('[role="tab"]')];
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
  toastTimer = setTimeout(() => statusMessage.classList.remove("visible"), 4000);
}

// --- Couleurs des pellicules : chargées à la première utilisation -----------------

let filmLutsPromise = null;

function ensureFilmLuts() {
  if (filmLutsReady()) return Promise.resolve(true);
  filmLutsPromise ||= loadScript("js/film-luts-data.js")
    .then(() => {
      filmLutsReady();
      filmLutCache.clear();
      refreshFilmThumbs();
      if (currentFilm || (hoverLookId && hoverLookId.startsWith("film-"))) schedulePreview();
      return true;
    })
    .catch(() => {
      filmLutsPromise = null;
      showStatus("Impossible de charger les couleurs des pellicules. Vérifie la connexion.");
      return false;
    });
  return filmLutsPromise;
}

// --- Vignettes ---------------------------------------------------------------------

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

// Vignettes calculées à la demande, quand la carte devient visible (plus de 400 looks).
let thumbData = null;
let refThumbData = null; // scène de référence, pour comparer les pellicules entre elles
const thumbQueue = new Set();
let thumbPending = false;

function thumbSourceFor(look) {
  if (look.film && filmPreview === "ref") {
    if (!refThumbData) {
      const scene = drawSampleScene();
      const { data: src, grainWidth } = thumbnailSource(scene, scene.width, scene.height);
      refThumbData = { src, grainWidth, w: scene.width, h: scene.height, job: "ref" };
    }
    return refThumbData;
  }
  return thumbData;
}

function thumbJobKey(look, data) {
  return look.film ? `${data.job}|${filmLutsReady()}` : String(data.job);
}

function processThumbQueue() {
  thumbPending = false;
  if (!thumbData) return;
  const started = performance.now();
  for (const card of thumbQueue) {
    if (performance.now() - started > 12) break;
    thumbQueue.delete(card);
    const look = lookById.get(card.dataset.look);
    if (!look || !card.isConnected) continue;
    const data = thumbSourceFor(look);
    const key = thumbJobKey(look, data);
    if (card.dataset.thumbJob === key) continue;
    if (look.film && !filmLutsReady()) {
      ensureFilmLuts();
      continue;
    }
    const canvas = card.querySelector("canvas");
    canvas.width = data.src.width;
    canvas.height = data.src.height;
    NIKON_OPTIONS.lutSize = 17; // vignettes : LUT réduite, invisible à cette taille
    const thumb = renderRecipe(data.src, lookRender(look), 1, { w: data.w, h: data.h }, data.grainWidth);
    NIKON_OPTIONS.lutSize = 33;
    canvas.getContext("2d").putImageData(thumb, 0, 0);
    card.dataset.thumbJob = key;
  }
  if (thumbQueue.size) scheduleThumbs();
}

function scheduleThumbs() {
  if (thumbPending) return;
  thumbPending = true;
  requestAnimationFrame(processThumbQueue);
}

const thumbObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) thumbQueue.add(entry.target);
    else thumbQueue.delete(entry.target);
  });
  if (thumbQueue.size) scheduleThumbs();
}, { rootMargin: "300px" });

function observeThumbs(selector = ".look-card") {
  lookGroups.querySelectorAll(selector).forEach((card) => {
    thumbObserver.unobserve(card);
    thumbObserver.observe(card);
  });
}

function renderThumbnails(drawable, w, h) {
  thumbSource = [drawable, w, h];
  const { data: src, grainWidth } = thumbnailSource(drawable, w, h);
  thumbData = { src, grainWidth, w, h, job: ++thumbJob };
  observeThumbs();
}

function refreshFilmThumbs() {
  observeThumbs('.look-card[data-look^="film-"]');
}

// Force le rendu d'une vignette (par exemple pour la planche contact).
function ensureThumb(card) {
  if (!thumbData || !card) return;
  const look = lookById.get(card.dataset.look);
  if (look && card.dataset.thumbJob === thumbJobKey(look, thumbSourceFor(look))) return;
  thumbQueue.add(card);
  processThumbQueue();
}

buildShelves();
updateFilmPreviewButtons();
