/* Fuji Looks — Images à partager : avant / après et planche contact. */

const CREATION_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const beforeAfterLayout = document.getElementById("beforeAfterLayout");
const contactDialog = document.getElementById("contactDialog");
const contactPicker = document.getElementById("contactPicker");
const contactPreview = document.getElementById("contactPreview");
const contactCount = document.getElementById("contactCount");
const contactExport = document.getElementById("contactExport");
let baLayout = "side";

function slugify(text) {
  return String(text || "photo").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";
}

// Source retouchée à une taille donnée, pour les images à partager.
function creationSource(maxSide) {
  return buildEditedSource(maxSide);
}

function canvasToFile(canvas, name, type = "image/jpeg") {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? new File([blob], name, { type }) : null), type, 0.92);
  });
}

// Étiquette arrondie posée sur l'image (« AVANT », « APRÈS · Kodachrome 64 »).
function drawPill(ctx, text, x, y, size, alignRight = false) {
  ctx.font = `600 ${size}px ${CREATION_FONT}`;
  const padX = Math.round(size * 0.7);
  const w = ctx.measureText(text).width + padX * 2;
  const h = Math.round(size * 2);
  const left = alignRight ? x - w : x;
  ctx.fillStyle = "rgba(13, 15, 18, .72)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(left, y, w, h, Math.round(h / 2));
    ctx.fill();
  } else {
    ctx.fillRect(left, y, w, h);
  }
  ctx.fillStyle = "#f4f4f0";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, left + padX, y + h / 2);
  ctx.textBaseline = "alphabetic";
}

// --- Avant / Après -------------------------------------------------------------

function buildBeforeAfter(layout) {
  const src = creationSource(1600);
  const after = applyHalation(renderRecipe(src, recipe, getStrength(), sourceSize), edit.halation);
  const before = imageDataToCanvas(src);
  const graded = imageDataToCanvas(after);
  const w = src.width;
  const h = src.height;
  const long = Math.max(w, h);
  const label = Math.max(14, Math.round(long * 0.022));
  const name = `APRÈS · ${recipe.name || "Recette"}`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (layout === "split") {
    canvas.width = w;
    canvas.height = h;
    const half = Math.round(w / 2);
    ctx.drawImage(before, 0, 0, half, h, 0, 0, half, h);
    ctx.drawImage(graded, half, 0, w - half, h, half, 0, w - half, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(half - Math.max(1, Math.round(long * 0.0015)), 0, Math.max(2, Math.round(long * 0.003)), h);
    const m = Math.round(long * 0.02);
    drawPill(ctx, "AVANT", m, m, label);
    drawPill(ctx, name, w - m, m, label, true);
  } else {
    const gap = Math.round(long * 0.015);
    const pad = Math.round(long * 0.02);
    canvas.width = w * 2 + gap + pad * 2;
    canvas.height = h + pad * 2;
    ctx.fillStyle = "#111214";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(before, pad, pad);
    ctx.drawImage(graded, pad + w + gap, pad);
    const m = Math.round(long * 0.02);
    drawPill(ctx, "AVANT", pad + m, pad + m, label);
    drawPill(ctx, name, pad + w + gap + m, pad + m, label);
  }
  return canvas;
}

beforeAfterLayout.addEventListener("click", (event) => {
  const button = event.target.closest("[data-layout]");
  if (!button) return;
  baLayout = button.dataset.layout;
  beforeAfterLayout.querySelectorAll("[data-layout]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
});

document.getElementById("beforeAfterButton").addEventListener("click", async () => {
  if (!originalImage) {
    showStatus("Importe d’abord une photo.");
    return;
  }
  if (!applied) {
    showStatus("Choisis d’abord un look ou une recette.");
    return;
  }
  const file = await canvasToFile(buildBeforeAfter(baLayout), `fuji-looks-avant-apres-${slugify(recipe.name)}.jpg`);
  if (file) presentResult(file, { title: "Avant / Après prêt", savedMessage: "Avant / Après enregistré." });
});

// --- Planche contact ------------------------------------------------------------

const CONTACT_MAX = 9;
let contactSelection = [];

function contactLayout(n) {
  const cols = n <= 1 ? 1 : n <= 4 ? (n === 3 ? 3 : 2) : 3;
  return { cols, rows: Math.ceil(n / cols) };
}

// Grille de la photo dans chaque look, avec le nom et la simulation sous chaque vignette.
function buildContactSheet(lookIds, width) {
  const looks = lookIds.map((id) => lookById.get(id)).filter(Boolean);
  const { cols, rows } = contactLayout(looks.length);
  const pad = Math.round(width * 0.025);
  const gap = Math.round(width * 0.014);
  const cellW = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  const aspect = previewSource.height / previewSource.width;
  const cellH = Math.round(cellW * aspect);
  const nameSize = Math.max(11, Math.round(cellW * 0.05));
  const subSize = Math.max(9, Math.round(nameSize * 0.75));
  const labelH = Math.round(nameSize * 1.4 + subSize * 1.5 + gap * 0.6);
  const footer = Math.round(subSize * 2.6);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = pad * 2 + rows * (cellH + labelH) + (rows - 1) * gap + footer;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111214";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Source commune, réduite à la taille d'une vignette.
  const cellSrc = drawToImageData(imageDataToCanvas(previewSource), previewSource.width, previewSource.height, Math.max(cellW, cellH));
  looks.forEach((look, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + gap);
    const y = pad + row * (cellH + labelH + gap);
    const out = applyHalation(renderRecipe(cellSrc, look.recipe, 1, sourceSize), edit.halation);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageDataToCanvas(out), x, y, cellW, cellH);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f4f4f0";
    ctx.font = `600 ${nameSize}px ${CREATION_FONT}`;
    ctx.fillText(look.name, x, y + cellH + nameSize * 1.35, cellW);
    ctx.fillStyle = "#9ba1a9";
    ctx.font = `500 ${subSize}px ${CREATION_FONT}`;
    const sub = look.recipe ? FR.simById(look.recipe.filmSim).name.toUpperCase() : "SANS RECETTE";
    ctx.fillText(sub, x, y + cellH + nameSize * 1.35 + subSize * 1.5, cellW);
  });
  ctx.fillStyle = "#5f656d";
  ctx.font = `500 ${subSize}px ${CREATION_FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("FUJI LOOKS", width - pad, canvas.height - Math.round(footer * 0.45));
  ctx.textAlign = "left";
  return canvas;
}

function defaultContactSelection() {
  const favs = LOOKS.filter((look) => favorites.has(look.id)).map((look) => look.id);
  if (favs.length >= 2) return favs.slice(0, CONTACT_MAX);
  const first = currentLookId && currentLookId !== "original" ? [currentLookId] : [];
  const others = LOOKS.filter((look) => look.recipe && look.id !== currentLookId && look.group === "custom").map((l) => l.id);
  return [...first, ...others].slice(0, 4);
}

function renderContactPicker() {
  contactPicker.textContent = "";
  LOOKS.forEach((look) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "contact-option";
    button.dataset.look = look.id;
    button.setAttribute("aria-pressed", String(contactSelection.includes(look.id)));
    const card = lookGroups.querySelector(`.look-card[data-look="${look.id}"]`);
    ensureThumb(card);
    const thumb = card && card.querySelector("canvas");
    const mini = document.createElement("canvas");
    mini.width = 96;
    mini.height = 72;
    if (thumb && thumb.width) mini.getContext("2d").drawImage(thumb, 0, 0, 96, 72);
    const name = document.createElement("span");
    name.textContent = look.name;
    button.append(mini, name);
    contactPicker.appendChild(button);
  });
  updateContactState();
}

let contactPreviewTimer = 0;
function updateContactState() {
  const n = contactSelection.length;
  contactCount.textContent = `${n} sélectionné${n > 1 ? "s" : ""}`;
  contactExport.disabled = n < 2;
  contactPicker.querySelectorAll(".contact-option").forEach((button) => {
    const on = contactSelection.includes(button.dataset.look);
    button.setAttribute("aria-pressed", String(on));
    button.disabled = !on && n >= CONTACT_MAX;
  });
  clearTimeout(contactPreviewTimer);
  contactPreviewTimer = setTimeout(() => {
    if (n < 2) {
      contactPreview.removeAttribute("src");
      contactPreview.hidden = true;
      return;
    }
    contactPreview.hidden = false;
    contactPreview.src = buildContactSheet(contactSelection, 900).toDataURL("image/jpeg", 0.85);
  }, 150);
}

contactPicker.addEventListener("click", (event) => {
  const button = event.target.closest(".contact-option");
  if (!button) return;
  const id = button.dataset.look;
  if (contactSelection.includes(id)) contactSelection = contactSelection.filter((x) => x !== id);
  else if (contactSelection.length < CONTACT_MAX) contactSelection = [...contactSelection, id];
  updateContactState();
});

document.getElementById("contactButton").addEventListener("click", () => {
  if (!originalImage) {
    showStatus("Importe d’abord une photo.");
    return;
  }
  if (contactSelection.length < 2) contactSelection = defaultContactSelection();
  renderContactPicker();
  contactDialog.showModal();
});

document.getElementById("contactClose").addEventListener("click", () => contactDialog.close());
contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) contactDialog.close();
});

contactExport.addEventListener("click", async () => {
  if (contactSelection.length < 2) return;
  contactExport.disabled = true;
  contactExport.textContent = "Création…";
  await new Promise((r) => setTimeout(r, 30));
  const file = await canvasToFile(buildContactSheet(contactSelection, 2160), "fuji-looks-planche-contact.jpg");
  contactExport.textContent = "Créer la planche";
  contactExport.disabled = false;
  contactDialog.close();
  if (file) presentResult(file, { title: "Planche contact prête", savedMessage: "Planche contact enregistrée." });
});
