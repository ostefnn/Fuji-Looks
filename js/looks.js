/* Fuji Looks — Grille des looks : onglets, cartes, vignettes, aperçu au survol. */
// --- Grille des looks ----------------------------------------------------

// --- Favoris, recherche et filtres -------------------------------------------

const FAV_KEY = "fuji-looks.favorites";
let favorites = new Set(Array.isArray(load(FAV_KEY)) ? load(FAV_KEY) : []);
let lookQuery = "";
let lookFilter = "all"; // all | color | mono
let lookMoment = ""; // "" ou une clé de MOMENTS

function normalizeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function lookMatches(look) {
  if (!look.recipe) return true; // « Original » reste toujours visible
  const sim = FR.simById(look.recipe.filmSim);
  if (lookFilter === "color" && sim.mono) return false;
  if (lookFilter === "mono" && !sim.mono) return false;
  if (lookMoment && look.moment !== lookMoment) return false;
  if (!lookQuery) return true;
  const haystack = normalizeText([look.name, look.desc, sim.name, look.recipe.author].join(" "));
  return normalizeText(lookQuery).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function toggleFavorite(lookId) {
  if (favorites.has(lookId)) favorites.delete(lookId);
  else favorites.add(lookId);
  store(FAV_KEY, [...favorites]);
  const name = lookById.get(lookId)?.name || "Look";
  showStatus(favorites.has(lookId) ? `« ${name} » ajouté aux favoris.` : `« ${name} » retiré des favoris.`);
  buildLookGrid();
  if (thumbSource) renderThumbnails(...thumbSource);
}

// Masque les looks qui ne correspondent pas et met à jour les compteurs des onglets.
function applyLookFilter() {
  let firstWithMatches = null;
  GROUPS.forEach(({ id }) => {
    const panel = document.getElementById(`panel-${id}`);
    let count = 0;
    panel.querySelectorAll(".look-item").forEach((item) => {
      const look = lookById.get(item.dataset.look);
      const visible = lookMatches(look);
      item.hidden = !visible;
      if (visible && look.recipe) count++;
    });
    panel.querySelector(".look-empty").hidden = count > 0;
    document.querySelector(`#tab-${id} small`).textContent = count;
    if (count && !firstWithMatches) firstWithMatches = id;
  });
  // Recherche sans résultat dans l'onglet ouvert : on passe au premier onglet qui en a.
  const active = lookTabs.querySelector('[aria-selected="true"]')?.id.replace("tab-", "");
  const activeCount = active ? Number(document.querySelector(`#tab-${active} small`).textContent) : 0;
  if ((lookQuery || lookFilter !== "all" || lookMoment) && !activeCount && firstWithMatches) showTab(firstWithMatches);
}

lookSearch.addEventListener("input", () => {
  lookQuery = lookSearch.value.trim();
  applyLookFilter();
});

Object.entries(MOMENTS).forEach(([key, m]) => lookMomentSelect.add(new Option(`${m.icon} ${m.label}`, key)));
lookMomentSelect.addEventListener("change", () => {
  lookMoment = lookMomentSelect.value;
  applyLookFilter();
});

lookFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  lookFilter = button.dataset.filter;
  lookFilters.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  applyLookFilter();
});

function createLookItem(look) {
  const item = document.createElement("div");
  item.className = "look-item";
  item.dataset.look = look.id;
  item.appendChild(createLookCard(look));
  if (look.recipe) {
    const fav = document.createElement("button");
    const on = favorites.has(look.id);
    fav.type = "button";
    fav.className = "fav-button";
    fav.textContent = on ? "★" : "☆";
    fav.setAttribute("aria-pressed", String(on));
    fav.setAttribute("aria-label", `${on ? "Retirer" : "Ajouter"} ${look.name} ${on ? "des" : "aux"} favoris`);
    fav.addEventListener("click", () => toggleFavorite(look.id));
    item.appendChild(fav);
  }
  return item;
}

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
  const favLooks = LOOKS.filter((look) => favorites.has(look.id));
  GROUPS = [
    ...(favLooks.length ? [{ id: "fav", title: "★ Favoris" }] : []),
    ...ALL_GROUPS.filter((group) => LOOKS.some((look) => look.group === group.id))
  ];

  GROUPS.forEach((group) => {
    const looks = group.id === "fav" ? favLooks : LOOKS.filter((look) => look.group === group.id);

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
    const empty = document.createElement("p");
    empty.className = "look-empty";
    empty.textContent = "Aucun look ne correspond dans cet onglet.";
    empty.hidden = true;
    grid.append(createLookItem(original), ...looks.map(createLookItem), empty);
    lookGroups.appendChild(grid);
  });

  if (GROUPS.length) showTab(GROUPS.some((g) => g.id === activeTab) ? activeTab : GROUPS[0].id);
  markSelectedCard();
  updateCompat();
  applyLookFilter();

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
