/* Fuji Looks — Grille des looks : onglets, cartes, vignettes, aperçu au survol. */
// --- Grille des looks ----------------------------------------------------

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
  GROUPS = ALL_GROUPS.filter((group) => LOOKS.some((look) => look.group === group.id));

  GROUPS.forEach((group) => {
    const looks = LOOKS.filter((look) => look.group === group.id);

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
    grid.append(createLookCard(original), ...looks.map(createLookCard));
    lookGroups.appendChild(grid);
  });

  if (GROUPS.length) showTab(GROUPS.some((g) => g.id === activeTab) ? activeTab : GROUPS[0].id);
  markSelectedCard();

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
