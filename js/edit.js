/* Fuji Looks — Retouches de base : format, rotation, redressement, exposition. */

const RATIOS = { original: null, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9, "9:16": 9 / 16 };
const DEFAULT_EDIT = { ratio: "original", rotate: 0, straighten: 0, exposure: 0 };
let edit = { ...DEFAULT_EDIT };
let originalSize = null; // dimensions de la photo importée, avant retouche

const editSection = document.getElementById("editSection");
const ratioOptions = document.getElementById("ratioOptions");
const straightenInput = document.getElementById("straighten");
const straightenValue = document.getElementById("straightenValue");
const exposureInput = document.getElementById("exposure");
const exposureValue = document.getElementById("exposureValue");
const editResetButton = document.getElementById("editResetButton");

function isIdentityEdit(e = edit) {
  return e.ratio === "original" && e.rotate === 0 && e.straighten === 0 && e.exposure === 0;
}

// Géométrie en pixels de la photo d'origine : taille finale et angle total.
function editGeometry(w, h, e = edit) {
  const quarter = e.rotate % 180 !== 0;
  const rw = quarter ? h : w;
  const rh = quarter ? w : h;
  // Redressement : plus grand rectangle de même proportion, sans coins vides.
  const a = Math.abs((e.straighten * Math.PI) / 180);
  const c = Math.cos(a);
  const s = Math.sin(a);
  // Légère marge quand l'image est inclinée : évite les pixels de bord semi-transparents.
  const fit = Math.min(rw / (rw * c + rh * s), rh / (rw * s + rh * c)) * (a ? 0.995 : 1);
  let cw = rw * fit;
  let ch = rh * fit;
  const ratio = RATIOS[e.ratio];
  if (ratio) {
    if (cw / ch > ratio) cw = ch * ratio;
    else ch = cw / ratio;
  }
  return { w: Math.max(1, Math.round(cw)), h: Math.max(1, Math.round(ch)), angle: ((e.rotate + e.straighten) * Math.PI) / 180 };
}

function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// Exposition en IL, appliquée en lumière linéaire (comme un vrai changement d'exposition).
function applyExposure(imageData, ev) {
  const gain = Math.pow(2, ev);
  const table = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) table[i] = Math.round(linearToSrgb(Math.min(1, srgbToLinear(i / 255) * gain)) * 255);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = table[d[i]];
    d[i + 1] = table[d[i + 1]];
    d[i + 2] = table[d[i + 2]];
  }
  return imageData;
}

// Source retouchée, réduite à maxSide / maxPixels. Sans retouche, identique à drawToImageData.
function buildEditedSource(maxSide, maxPixels) {
  const { w: W, h: H } = originalSize;
  if (isIdentityEdit()) return drawToImageData(originalImage, W, H, maxSide, maxPixels);

  const g = editGeometry(W, H);
  let k = Math.min(1, maxSide / Math.max(g.w, g.h));
  if (maxPixels) k = Math.min(k, Math.sqrt(maxPixels / (g.w * g.h)));
  const ow = Math.max(1, Math.round(g.w * k));
  const oh = Math.max(1, Math.round(g.h * k));
  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.translate(ow / 2, oh / 2);
  ctx.scale(k, k);
  ctx.rotate(g.angle);
  ctx.drawImage(originalImage, -W / 2, -H / 2, W, H);
  const data = ctx.getImageData(0, 0, ow, oh);
  return edit.exposure ? applyExposure(data, edit.exposure) : data;
}

// Recalcule l'aperçu après une retouche (ou un changement de photo).
function rebuildSource() {
  if (!originalImage) return;
  const g = isIdentityEdit() ? originalSize : editGeometry(originalSize.w, originalSize.h);
  sourceSize = { w: g.w, h: g.h };
  previewSource = buildEditedSource(PREVIEW_MAX_SIDE);
  sourceToken++;
  schedulePreview();
}

let editRebuildPending = false;
function scheduleRebuild() {
  if (editRebuildPending) return;
  editRebuildPending = true;
  requestAnimationFrame(() => {
    editRebuildPending = false;
    rebuildSource();
  });
}

function updateEditControls() {
  ratioOptions.querySelectorAll("[data-ratio]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.ratio === edit.ratio));
  });
  straightenInput.value = edit.straighten;
  straightenValue.textContent = `${edit.straighten > 0 ? "+" : ""}${edit.straighten.toFixed(1)}°`;
  exposureInput.value = edit.exposure;
  exposureValue.textContent = `${edit.exposure > 0 ? "+" : ""}${edit.exposure.toFixed(1)} IL`;
  editResetButton.disabled = isIdentityEdit();
}

function setEdit(changes, historyKey = null) {
  commit(historyKey);
  edit = { ...edit, ...changes };
  updateEditControls();
  scheduleRebuild();
}

function resetEdit() {
  edit = { ...DEFAULT_EDIT };
  updateEditControls();
}

ratioOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ratio]");
  if (button) setEdit({ ratio: button.dataset.ratio });
});

document.getElementById("rotateLeft").addEventListener("click", () => setEdit({ rotate: (edit.rotate + 270) % 360 }));
document.getElementById("rotateRight").addEventListener("click", () => setEdit({ rotate: (edit.rotate + 90) % 360 }));

straightenInput.addEventListener("input", () => setEdit({ straighten: Number(straightenInput.value) }, "edit:straighten"));
exposureInput.addEventListener("input", () => setEdit({ exposure: Number(exposureInput.value) }, "edit:exposure"));

// Double-clic sur un curseur : retour à 0.
straightenInput.addEventListener("dblclick", () => setEdit({ straighten: 0 }));
exposureInput.addEventListener("dblclick", () => setEdit({ exposure: 0 }));

editResetButton.addEventListener("click", () => {
  commit();
  resetEdit();
  scheduleRebuild();
  showStatus("Retouche réinitialisée.");
});
