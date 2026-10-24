/* Fuji Looks — Retouches de base : format, rotation, redressement, exposition, hautes lumières / ombres. */

const RATIOS = { original: null, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9, "9:16": 9 / 16 };
const DEFAULT_EDIT = { ratio: "original", rotate: 0, straighten: 0, exposure: 0, highlights: 0, shadows: 0 };
let edit = { ...DEFAULT_EDIT };
let originalSize = null; // dimensions de la photo importée, avant retouche

const editSection = document.getElementById("editSection");
const editMeta = document.getElementById("editMeta");
const ratioOptions = document.getElementById("ratioOptions");
const straightenInput = document.getElementById("straighten");
const straightenValue = document.getElementById("straightenValue");
const exposureInput = document.getElementById("exposure");
const exposureValue = document.getElementById("exposureValue");
const editResetButton = document.getElementById("editResetButton");
const highlightsInput = document.getElementById("highlightsEdit");
const highlightsValue = document.getElementById("highlightsEditValue");
const shadowsInput = document.getElementById("shadowsEdit");
const shadowsValue = document.getElementById("shadowsEditValue");

function isIdentityEdit(e = edit) {
  return e.ratio === "original" && e.rotate === 0 && e.straighten === 0 && e.exposure === 0 &&
    !e.highlights && !e.shadows;
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

/*
 * Hautes lumières / ombres, de -100 à +100, appliquées localement : le poids de chaque pixel
 * dépend de la luminosité moyenne de sa zone (luminance floutée), ce qui préserve le contraste
 * local au lieu d'aplatir l'image. Hautes lumières négatives : récupère un ciel ; ombres
 * positives : débouche les zones sombres. Le gain est appliqué en lumière linéaire.
 */
function applyToneRecovery(imageData, highlights, shadows) {
  const { width: w, height: h, data: d } = imageData;
  const toLinear = new Float32Array(256);
  for (let i = 0; i < 256; i++) toLinear[i] = srgbToLinear(i / 255);
  const toSrgb = new Uint8ClampedArray(4096);
  for (let i = 0; i < 4096; i++) toSrgb[i] = Math.round(linearToSrgb(i / 4095) * 255);

  // Luminance floutée : image réduite (≈ 1/96) puis agrandie avec lissage. Une carte large
  // préserve la texture (nuages, peau) ; on la mélange à la luminance du pixel pour limiter
  // les halos le long des contrastes forts (ligne d'horizon).
  const lumaCanvas = makeCanvas(w, h);
  const lctx = lumaCanvas.getContext("2d", { willReadFrequently: true });
  const luma = lctx.createImageData(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    luma.data[i] = luma.data[i + 1] = luma.data[i + 2] = y;
    luma.data[i + 3] = 255;
  }
  lctx.putImageData(luma, 0, 0);
  const small = makeCanvas(Math.max(1, Math.round(w / 96)), Math.max(1, Math.round(h / 96)));
  const sctx = small.getContext("2d");
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(lumaCanvas, 0, 0, small.width, small.height);
  lctx.imageSmoothingQuality = "high";
  lctx.drawImage(small, 0, 0, w, h);
  const blurred = lctx.getImageData(0, 0, w, h).data;

  const hl = highlights / 100;
  const sh = shadows / 100;
  for (let i = 0; i < d.length; i += 4) {
    const t = (0.55 * blurred[i] + 0.45 * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])) / 255;
    const ev = sh * 1.3 * (1 - t) * (1 - t) + hl * 1.3 * t * t;
    if (Math.abs(ev) < 0.002) continue;
    const gain = Math.pow(2, ev);
    d[i] = toSrgb[Math.min(4095, Math.round(toLinear[d[i]] * gain * 4095))];
    d[i + 1] = toSrgb[Math.min(4095, Math.round(toLinear[d[i + 1]] * gain * 4095))];
    d[i + 2] = toSrgb[Math.min(4095, Math.round(toLinear[d[i + 2]] * gain * 4095))];
  }
  return imageData;
}

// Source retouchée, réduite à maxSide / maxPixels. Sans retouche, identique à drawToImageData.
function buildEditedSource(maxSide, maxPixels, e = edit) {
  const { w: W, h: H } = originalSize;
  if (isIdentityEdit(e)) return drawToImageData(originalImage, W, H, maxSide, maxPixels);

  const g = editGeometry(W, H, e);
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
  if (e.exposure) applyExposure(data, e.exposure);
  if (e.highlights || e.shadows) applyToneRecovery(data, e.highlights, e.shadows);
  return data;
}

/*
 * Exposition automatique : ramène la luminosité moyenne (moyenne géométrique, en linéaire)
 * vers un gris moyen sans brûler les hautes lumières, puis propose une récupération des
 * hautes lumières et des ombres selon la part de pixels presque blancs ou presque noirs.
 */
function autoExposure() {
  const base = { ...edit, exposure: 0, highlights: 0, shadows: 0 };
  const d = buildEditedSource(256, null, base).data;
  const lum = [];
  for (let i = 0; i < d.length; i += 4) {
    lum.push(srgbToLinear((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255));
  }
  const n = lum.length;
  const logMean = lum.reduce((sum, v) => sum + Math.log(v + 1e-4), 0) / n;
  const sorted = lum.slice().sort((a, b) => a - b);
  const p99 = sorted[Math.floor(n * 0.99)] || 1;
  let ev = Math.log2(0.18 / Math.exp(logMean));
  ev = Math.min(ev, Math.log2(0.92 / Math.max(p99, 1e-4))); // éviter de brûler les blancs
  ev = Math.max(-2, Math.min(2, Math.round(ev * 10) / 10));

  const gain = Math.pow(2, ev);
  const bright = lum.filter((v) => v * gain > 0.75).length / n;
  const dark = lum.filter((v) => v * gain < 0.02).length / n;
  const highlights = -Math.min(60, Math.round((bright * 300) / 5) * 5) || 0; // évite « -0 »
  const shadows = Math.min(50, Math.round((dark * 250) / 5) * 5) || 0;
  return { exposure: ev, highlights, shadows };
}

// Aperçu adaptatif : calculé à la taille réelle du cadre (× densité de l'écran), plus grand
// quand on zoome. Beaucoup plus rapide qu'un aperçu fixe en 2048 px, surtout sur téléphone.
const PREVIEW_MIN_SIDE = 720;
let previewSide = 0;

function previewTargetSide() {
  const rect = photoFrame.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const needed = Math.max(rect.width, rect.height) * dpr * Math.max(1, view.zoom);
  return Math.round(Math.min(PREVIEW_MAX_SIDE, Math.max(PREVIEW_MIN_SIDE, needed)));
}

// Après un zoom ou un changement de taille du cadre, ajuste la définition une fois le geste fini.
let resolutionTimer = 0;
function schedulePreviewResolution() {
  if (!originalImage) return;
  clearTimeout(resolutionTimer);
  resolutionTimer = setTimeout(() => {
    const target = previewTargetSide();
    if (target > previewSide * 1.15 || target < previewSide / 1.6) rebuildSource();
  }, 250);
}

// Recalcule l'aperçu après une retouche (ou un changement de photo).
function rebuildSource() {
  if (!originalImage) return;
  const g = isIdentityEdit() ? originalSize : editGeometry(originalSize.w, originalSize.h);
  sourceSize = { w: g.w, h: g.h };
  previewSide = previewTargetSide();
  previewSource = buildEditedSource(previewSide);
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
  highlightsInput.value = edit.highlights;
  highlightsValue.textContent = `${edit.highlights > 0 ? "+" : ""}${edit.highlights}`;
  shadowsInput.value = edit.shadows;
  shadowsValue.textContent = `${edit.shadows > 0 ? "+" : ""}${edit.shadows}`;
  editResetButton.disabled = isIdentityEdit();
  editMeta.textContent = isIdentityEdit() ? "" : "MODIFIÉE";
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

highlightsInput.addEventListener("input", () => setEdit({ highlights: Number(highlightsInput.value) }, "edit:highlights"));
shadowsInput.addEventListener("input", () => setEdit({ shadows: Number(shadowsInput.value) }, "edit:shadows"));
highlightsInput.addEventListener("dblclick", () => setEdit({ highlights: 0 }));
shadowsInput.addEventListener("dblclick", () => setEdit({ shadows: 0 }));

document.getElementById("autoExposureButton").addEventListener("click", () => {
  if (!originalImage) return;
  const auto = autoExposure();
  setEdit(auto);
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  showStatus(`Auto : exposition ${sign(auto.exposure.toFixed(1))} IL, hautes lumières ${sign(auto.highlights)}, ombres ${sign(auto.shadows)}.`);
});

// Double-clic sur un curseur : retour à 0.
straightenInput.addEventListener("dblclick", () => setEdit({ straighten: 0 }));
exposureInput.addEventListener("dblclick", () => setEdit({ exposure: 0 }));

editResetButton.addEventListener("click", () => {
  commit();
  resetEdit();
  scheduleRebuild();
  showStatus("Retouche réinitialisée.");
});
