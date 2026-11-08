/* Fuji Looks — Versions : garder plusieurs essais sur la même photo et les comparer côte à côte.
 *
 * Une version est un instantané de l'état (le même que l'historique) : look, réglages de la recette
 * ou de la pellicule, retouche et intensité. Elle reste attachée à la session : une nouvelle photo
 * vide la liste (une série la garde, pour essayer les mêmes versions sur la photo suivante).
 */

const VERSIONS_MAX = 8;
const COMPARE_MAX = 4;
const VERSION_THUMB_SIDE = 120;
const versionsBar = document.getElementById("versionsBar");
const versionList = document.getElementById("versionList");
const versionAddButton = document.getElementById("versionAddButton");
const versionCompareButton = document.getElementById("versionCompareButton");
const versionHint = document.getElementById("versionHint");
let versions = [];
let versionSeq = 0;

// Nom lisible d'un état : le look, et « modifiée » si on a touché à ses réglages.
function stateName(state) {
  if (!state.applied) return "Original";
  const name = state.film ? filmByKey.get(state.film.film).name : state.recipe.name || "Recette";
  return state.modified ? `${name} · modifiée` : name;
}

function versionLook(state) {
  if (!state.applied) return null;
  return state.film ? { ...state.film, format: filmFormat } : FR.normalize(state.recipe);
}

// Rend une version sur la photo en cours, avec sa propre retouche, à maxSide pixels de grand côté.
function renderVersion(state, maxSide) {
  const e = state.edit;
  const src = buildEditedSource(maxSide, null, e);
  const size = usesGeometry(e) ? editGeometry(originalSize.w, originalSize.h, e) : originalSize;
  const look = versionLook(state);
  const ready = !(look && look.film) || filmLutsReady();
  const shown = ready ? look : null;
  const out = renderRecipe(src, shown, Number(state.intensity) / 100, { w: size.w, h: size.h });
  const halation = Math.min(100, (e.halation || 0) + (shown && shown.film ? Number(shown.halation) || 0 : 0));
  applyHalation(out, halation, halationScaleFor(shown));
  applyDateBack(out);
  return out;
}

function versionThumb(version) {
  if (version.thumbFor === originalImage && version.thumb) return version.thumb;
  version.thumb = imageDataToCanvas(renderVersion(version.state, VERSION_THUMB_SIDE)).toDataURL("image/jpeg", 0.8);
  // Pellicule pas encore chargée : vignette provisoire, recalculée au prochain affichage.
  version.thumbFor = version.state.film && !filmLutsReady() ? null : originalImage;
  return version.thumb;
}

// --- Liste des versions --------------------------------------------------------------------

function renderVersions() {
  versionsBar.hidden = !originalImage;
  if (!originalImage) return;
  const comparing = Boolean(versionCompare);
  versionList.replaceChildren(...versions.map((version) => {
    const item = document.createElement("div");
    item.className = "version-item";
    const pick = comparing ? versionCompare.indexOf(version.id) : -1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "version-chip";
    button.dataset.version = version.id;
    button.setAttribute("aria-pressed", String(comparing ? pick >= 0 : false));
    button.title = comparing ? "Ajouter ou retirer de la comparaison" : "Revenir à cette version";
    const img = document.createElement("img");
    img.alt = "";
    img.src = versionThumb(version);
    const label = document.createElement("span");
    label.className = "version-name";
    label.textContent = `${version.label} · ${version.name}`;
    button.append(img, label);
    if (pick >= 0) {
      const badge = document.createElement("span");
      badge.className = "version-pick";
      badge.textContent = "ABCD"[pick];
      button.append(badge);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "version-remove";
    remove.dataset.remove = version.id;
    remove.setAttribute("aria-label", `Supprimer ${version.label}`);
    remove.textContent = "×";
    item.append(button, remove);
    return item;
  }));
  versionAddButton.disabled = versions.length >= VERSIONS_MAX;
  versionCompareButton.disabled = versions.length < 2;
  versionCompareButton.setAttribute("aria-pressed", String(comparing));
  versionCompareButton.textContent = comparing ? "Terminer" : "Comparer";
  versionHint.hidden = versions.length > 0;
}

function addVersion() {
  if (!originalImage) return;
  if (versions.length >= VERSIONS_MAX) {
    showStatus(`${VERSIONS_MAX} versions au plus : supprime-en une pour en garder une autre.`);
    return;
  }
  const state = snapshot();
  versionSeq++;
  versions.push({ id: `v${versionSeq}`, label: `V${versionSeq}`, name: stateName(state), state });
  renderVersions();
  showStatus(`V${versionSeq} gardée. Essaie un autre look, puis compare.`);
}

function restoreVersion(id) {
  const version = versions.find((v) => v.id === id);
  if (!version) return;
  commit();
  const filmBefore = Boolean(currentFilm);
  restoreSnapshot({ ...version.state, edit: { ...version.state.edit } });
  if (currentFilm && !filmBefore) ensureFilmLuts();
  showStatus(`Retour à ${version.label} · ${version.name}.`);
}

function removeVersion(id) {
  versions = versions.filter((v) => v.id !== id);
  if (versionCompare) {
    versionCompare = versionCompare.filter((v) => v !== id);
    if (versions.length < 2) setVersionCompare(false);
  }
  renderVersions();
  schedulePreview();
}

// Nouvelle photo (hors série) : les versions appartenaient à l'ancienne.
function clearVersions() {
  versions = [];
  versionSeq = 0;
  setVersionCompare(false);
  renderVersions();
}

// --- Comparaison côte à côte ---------------------------------------------------------------

function setVersionCompare(on) {
  if (on && versions.length < 2) return;
  versionCompare = on ? versions.slice(-2).map((v) => v.id) : null;
  compareCache = null;
  document.body.classList.toggle("versions-comparing", on);
  if (on) {
    setPhotoTool(null);
    if (versions.some((v) => v.state.film)) ensureFilmLuts().then(() => { compareCache = null; schedulePreview(); });
  }
  renderVersions();
  schedulePreview();
}

// Disposition qui donne les plus grandes vignettes dans le cadre : 2 côte à côte ou l'une sous l'autre,
// 3 ou 4 en grille.
function compareLayout(n, photoAspect) {
  const rect = photoFrame.getBoundingClientRect();
  const frameW = Math.max(1, rect.width);
  const frameH = Math.max(1, rect.height);
  let best = { cols: n, rows: 1, size: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const tileW = Math.min(frameW / cols, (frameH / rows) * photoAspect);
    if (tileW > best.size) best = { cols, rows, size: tileW };
  }
  return best;
}

let compareCache = null;

// Image de comparaison pour l'aperçu : chaque version avec son nom, sur le fond de la scène.
function drawVersionCompare() {
  const picked = versionCompare.map((id) => versions.find((v) => v.id === id)).filter(Boolean);
  if (picked.length < 2) return null;
  const key = `${picked.map((v) => v.id).join()}|${sourceToken}|${previewSide}|${filmLutsReady()}|${frameStyle}`;
  if (compareCache && compareCache.key === key) return compareCache.canvas;
  const { cols, rows } = compareLayout(picked.length, sourceSize.w / sourceSize.h);
  const side = Math.max(320, Math.round(previewSide / Math.max(cols, rows)));
  const tiles = picked.map((v) => ({ version: v, data: renderVersion(v.state, side) }));
  const tileW = Math.max(...tiles.map((t) => t.data.width));
  const tileH = Math.max(...tiles.map((t) => t.data.height));
  const gap = Math.round(Math.max(tileW, tileH) * 0.025);
  const canvas = document.createElement("canvas");
  canvas.width = cols * tileW + (cols - 1) * gap;
  canvas.height = rows * tileH + (rows - 1) * gap;
  const ctx = canvas.getContext("2d");
  const font = Math.max(11, Math.round(Math.max(tileW, tileH) * 0.032));
  tiles.forEach(({ version, data }, i) => {
    const x = (i % cols) * (tileW + gap) + (tileW - data.width) / 2;
    const y = Math.floor(i / cols) * (tileH + gap) + (tileH - data.height) / 2;
    ctx.drawImage(imageDataToCanvas(data), x, y);
    // Étiquette : lettre de la comparaison, numéro et nom de la version.
    const text = `${"ABCD"[i]}  ·  ${version.label} · ${version.name}`;
    ctx.font = `600 ${font}px ${FRAME_FONT}`;
    const w = ctx.measureText(text).width + font * 1.4;
    ctx.fillStyle = "rgba(15, 15, 16, 0.78)";
    roundedRect(ctx, x + font * 0.6, y + font * 0.6, w, font * 1.9, font * 0.95);
    ctx.fill();
    ctx.fillStyle = "#f1f0ec";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + font * 1.3, y + font * 1.55);
  });
  compareCache = { key, canvas };
  return canvas;
}

// --- Événements ---------------------------------------------------------------------------------

versionAddButton.addEventListener("click", addVersion);
versionCompareButton.addEventListener("click", () => setVersionCompare(!versionCompare));

versionList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    removeVersion(remove.dataset.remove);
    return;
  }
  const chip = event.target.closest("[data-version]");
  if (!chip) return;
  const id = chip.dataset.version;
  if (!versionCompare) {
    restoreVersion(id);
    return;
  }
  // En comparaison : la version entre ou sort (2 au moins, 4 au plus).
  if (versionCompare.includes(id)) {
    if (versionCompare.length <= 2) {
      showStatus("Il faut au moins deux versions pour comparer.");
      return;
    }
    versionCompare = versionCompare.filter((v) => v !== id);
  } else {
    if (versionCompare.length >= COMPARE_MAX) versionCompare.shift();
    versionCompare.push(id);
  }
  compareCache = null;
  renderVersions();
  schedulePreview();
});

document.addEventListener("keydown", (event) => {
  if (document.querySelector("dialog[open]") || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
  if (event.key === "v" || event.key === "V") {
    event.preventDefault();
    addVersion();
  } else if (event.key === "Escape" && versionCompare) {
    setVersionCompare(false);
  }
});

renderVersions();
