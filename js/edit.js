/* Fuji Looks — Retouches de base : format et cadrage, rotation, redressement, lumière, balance des blancs de la photo. */

const RATIOS = { original: null, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9, "9:16": 9 / 16 };
// cropX / cropY : position du cadrage dans la marge disponible, de -1 (gauche / haut) à 1 (droite / bas).
// temp / tint : balance des blancs de la photo d'origine (avant la recette), de -100 à +100.
const DEFAULT_EDIT = {
  ratio: "original", cropX: 0, cropY: 0, rotate: 0, straighten: 0,
  exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, temp: 0, tint: 0, halation: 0
};
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

// La halation s'applique après la recette : elle ne change pas la source retouchée.
function hasEdits(e = edit) {
  return !isIdentityEdit(e) || e.halation > 0;
}

function isIdentityEdit(e = edit) {
  return e.ratio === "original" && e.rotate === 0 && e.straighten === 0 && e.exposure === 0 &&
    !e.highlights && !e.shadows && !e.whites && !e.blacks && !e.temp && !e.tint;
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
  const fw = rw * fit;
  const fh = rh * fit;
  let cw = fw;
  let ch = fh;
  const ratio = RATIOS[e.ratio];
  if (ratio) {
    if (cw / ch > ratio) cw = ch * ratio;
    else ch = cw / ratio;
  }
  // Marge laissée par le format : le cadrage peut s'y déplacer (offX / offY en pixels d'origine).
  const slackX = (fw - cw) / 2;
  const slackY = (fh - ch) / 2;
  return {
    w: Math.max(1, Math.round(cw)), h: Math.max(1, Math.round(ch)),
    angle: ((e.rotate + e.straighten) * Math.PI) / 180,
    slackX, slackY, offX: (e.cropX || 0) * slackX, offY: (e.cropY || 0) * slackY
  };
}

function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/*
 * Balance des blancs de la photo : gains R, V, B en lumière linéaire. Température positive :
 * plus chaud (rouge +, bleu −) ; teinte positive : plus magenta (vert −). Les gains sont
 * normalisés pour garder la même luminosité.
 */
const WB_TEMP_STOPS = 0.8; // ±100 → ±0,8 IL sur rouge et bleu (en sens opposés) : couvre une lampe à incandescence
const WB_TINT_STOPS = 0.4;

function whiteBalanceEditGains(temp, tint) {
  const r = Math.pow(2, (WB_TEMP_STOPS * temp) / 100);
  const b = Math.pow(2, (-WB_TEMP_STOPS * temp) / 100);
  const g = Math.pow(2, (-WB_TINT_STOPS * tint) / 100);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / luma, g / luma, b / luma];
}

// Réglages inverses : température et teinte qui donnent ces gains (pour la pipette).
function gainsToWhiteBalance([r, g, b]) {
  const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));
  const temp = (Math.log2(r / b) / (2 * WB_TEMP_STOPS)) * 100;
  const tint = (-Math.log2(g / Math.sqrt(r * b)) / WB_TINT_STOPS) * 100;
  return { temp: clamp(temp), tint: clamp(tint) };
}

// Exposition (en IL) et balance des blancs, appliquées en lumière linéaire comme sur le capteur.
function applyExposure(imageData, ev, gains = [1, 1, 1]) {
  const exposure = Math.pow(2, ev);
  const tables = gains.map((gain) => {
    const table = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) table[i] = Math.round(linearToSrgb(Math.min(1, srgbToLinear(i / 255) * gain * exposure)) * 255);
    return table;
  });
  const [tr, tg, tb] = tables;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = tr[d[i]];
    d[i + 1] = tg[d[i + 1]];
    d[i + 2] = tb[d[i + 2]];
  }
  return imageData;
}

/*
 * Blancs / Noirs, de -100 à +100 : courbe qui agit surtout aux extrémités de l'histogramme.
 * Blancs + : éclaircit le haut (jusqu'au blanc pur) ; Noirs − : densifie le bas (jusqu'au noir pur).
 */
function applyWhitesBlacks(imageData, whites, blacks) {
  const w = whites / 100;
  const k = blacks / 100;
  const table = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const y = x + 0.3 * w * Math.pow(x, 3) + 0.3 * k * Math.pow(1 - x, 3);
    table[i] = Math.round(Math.max(0, Math.min(1, y)) * 255);
  }
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

/*
 * Halation : halo rouge-orangé autour des lumières fortes, comme sur une pellicule sans
 * couche anti-halo (CineStill 800T). Effet pellicule, pas un réglage Fujifilm : appliqué
 * après la recette, sur l'aperçu comme sur l'export. Taille du halo proportionnelle à la photo.
 */
const HALATION_TINT = [1, 0.3, 0.1];

function applyHalation(imageData, amount) {
  if (!amount) return imageData;
  const { width: w, height: h, data: d } = imageData;
  const mask = makeCanvas(w, h);
  const mctx = mask.getContext("2d", { willReadFrequently: true });
  const m = mctx.createImageData(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const y = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const t = Math.max(0, (y - 0.8) / 0.2);
    m.data[i] = m.data[i + 1] = m.data[i + 2] = Math.round(t * t * 255);
    m.data[i + 3] = 255;
  }
  mctx.putImageData(m, 0, 0);
  const long = Math.max(w, h);
  // Flou par réduction (rapide et sans canvas.filter, absent de Safari) : un pixel de la
  // version réduite couvre long / side pixels de la photo.
  function blurred(side) {
    const k = Math.min(1, side / long);
    let layer = mask;
    for (const step of [Math.min(1, k * 4), k]) {
      const c = makeCanvas(Math.max(1, Math.round(w * step)), Math.max(1, Math.round(h * step)));
      const cctx = c.getContext("2d");
      cctx.imageSmoothingQuality = "high";
      cctx.drawImage(layer, 0, 0, c.width, c.height);
      layer = c;
    }
    const out = makeCanvas(w, h);
    const octx = out.getContext("2d", { willReadFrequently: true });
    octx.imageSmoothingQuality = "high";
    octx.drawImage(layer, 0, 0, w, h);
    return octx.getImageData(0, 0, w, h).data;
  }
  // Halo serré autour des lumières (≈ 1 % du grand côté) et lueur large plus discrète.
  const tight = blurred(90);
  const wide = blurred(36);
  const strength = amount / 100;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.min(1, ((tight[i] / 255) * 2.2 + (wide[i] / 255) * 0.6) * strength);
    if (g < 0.004) continue;
    // Mélange « écran » : le halo éclaire sans jamais assombrir.
    for (let c = 0; c < 3; c++) d[i + c] = 255 - ((255 - d[i + c]) * (1 - g * HALATION_TINT[c]));
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
  ctx.translate(-g.offX, -g.offY);
  ctx.rotate(g.angle);
  ctx.drawImage(originalImage, -W / 2, -H / 2, W, H);
  const data = ctx.getImageData(0, 0, ow, oh);
  if (e.exposure || e.temp || e.tint) applyExposure(data, e.exposure, whiteBalanceEditGains(e.temp || 0, e.tint || 0));
  if (e.highlights || e.shadows) applyToneRecovery(data, e.highlights, e.shadows);
  if (e.whites || e.blacks) applyWhitesBlacks(data, e.whites || 0, e.blacks || 0);
  return data;
}

/*
 * Exposition automatique : ramène la luminosité moyenne (moyenne géométrique, en linéaire)
 * vers un gris moyen sans brûler les hautes lumières, puis propose une récupération des
 * hautes lumières et des ombres selon la part de pixels presque blancs ou presque noirs.
 */
function autoExposure() {
  const base = { ...edit, exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0 };
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
  return { exposure: ev, highlights, shadows, whites: 0, blacks: 0 };
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

// Curseurs simples de -100 à +100 (valeur affichée dans l'élément « …Value »).
const SLIDERS = [
  ["whites", "whitesEdit"],
  ["blacks", "blacksEdit"],
  ["temp", "tempEdit"],
  ["tint", "tintEdit"],
  ["halation", "halationEdit"]
].map(([key, id]) => ({ key, input: document.getElementById(id), output: document.getElementById(`${id}Value`) }));

function updateEditControls() {
  ratioOptions.querySelectorAll("[data-ratio]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.ratio === edit.ratio));
  });
  updateCropControls();
  SLIDERS.forEach(({ key, input, output }) => {
    input.value = edit[key] || 0;
    output.textContent = `${edit[key] > 0 && Number(input.min) < 0 ? "+" : ""}${edit[key] || 0}`;
  });
  straightenInput.value = edit.straighten;
  straightenValue.textContent = `${edit.straighten > 0 ? "+" : ""}${edit.straighten.toFixed(1)}°`;
  exposureInput.value = edit.exposure;
  exposureValue.textContent = `${edit.exposure > 0 ? "+" : ""}${edit.exposure.toFixed(1)} IL`;
  highlightsInput.value = edit.highlights;
  highlightsValue.textContent = `${edit.highlights > 0 ? "+" : ""}${edit.highlights}`;
  shadowsInput.value = edit.shadows;
  shadowsValue.textContent = `${edit.shadows > 0 ? "+" : ""}${edit.shadows}`;
  editResetButton.disabled = !hasEdits();
  editMeta.textContent = hasEdits() ? "MODIFIÉE" : "";
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
  if (button) setEdit({ ratio: button.dataset.ratio, cropX: 0, cropY: 0 });
});

SLIDERS.forEach(({ key, input }) => {
  input.addEventListener("input", () => setEdit({ [key]: Number(input.value) }, `edit:${key}`));
  input.addEventListener("dblclick", () => setEdit({ [key]: 0 }));
});

// --- Gestes sur la photo : déplacer le cadrage, pipette « point neutre » -------------

const cropMoveButton = document.getElementById("cropMoveButton");
const pipetteButton = document.getElementById("pipetteButton");
let photoTool = null; // null | "crop" | "pipette"

function setPhotoTool(tool) {
  photoTool = tool;
  cropMoveButton.setAttribute("aria-pressed", String(tool === "crop"));
  pipetteButton.setAttribute("aria-pressed", String(tool === "pipette"));
  photoFrame.classList.toggle("tool-crop", tool === "crop");
  photoFrame.classList.toggle("tool-pipette", tool === "pipette");
  if (tool === "crop") showStatus("Fais glisser la photo pour choisir le cadrage.");
  if (tool === "pipette") showStatus("Touche une zone qui devrait être grise ou blanche.");
}

function updateCropControls() {
  const movable = edit.ratio !== "original" && originalSize &&
    (() => { const g = editGeometry(originalSize.w, originalSize.h); return g.slackX > 1 || g.slackY > 1; })();
  cropMoveButton.hidden = !movable;
  if (!movable && photoTool === "crop") setPhotoTool(null);
}

cropMoveButton.addEventListener("click", () => setPhotoTool(photoTool === "crop" ? null : "crop"));
pipetteButton.addEventListener("click", () => {
  if (!originalImage) return;
  setPhotoTool(photoTool === "pipette" ? null : "pipette");
});

// Point de l'écran → position dans la photo (0..1), en tenant compte du cadre et du zoom.
function photoPointFromEvent(event) {
  const rect = photoPreview.getBoundingClientRect();
  const fx = ((event.clientX - rect.left) / rect.width - previewPhotoRect.x) / previewPhotoRect.w;
  const fy = ((event.clientY - rect.top) / rect.height - previewPhotoRect.y) / previewPhotoRect.h;
  return { fx, fy, inside: fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1, scale: rect.width * previewPhotoRect.w };
}

// Pipette : moyenne d'une petite zone de la photo retouchée, puis gains qui la rendent neutre.
function pickNeutral(point) {
  const src = previewSource;
  const cx = Math.round(point.fx * (src.width - 1));
  const cy = Math.round(point.fy * (src.height - 1));
  const radius = Math.max(2, Math.round(Math.min(src.width, src.height) / 200));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.max(0, cy - radius); y <= Math.min(src.height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(src.width - 1, cx + radius); x++) {
      const i = (y * src.width + x) * 4;
      r += srgbToLinear(src.data[i] / 255);
      g += srgbToLinear(src.data[i + 1] / 255);
      b += srgbToLinear(src.data[i + 2] / 255);
      n++;
    }
  }
  r /= n;
  g /= n;
  b /= n;
  if (Math.max(r, g, b) > 0.98 || Math.max(r, g, b) < 0.003) {
    showStatus("Zone trop claire ou trop sombre : choisis un gris ou un blanc qui n’est pas brûlé.");
    return;
  }
  const current = whiteBalanceEditGains(edit.temp || 0, edit.tint || 0);
  const mean = (r + g + b) / 3;
  const next = gainsToWhiteBalance([current[0] * mean / r, current[1] * mean / g, current[2] * mean / b]);
  setEdit(next);
  setPhotoTool(null);
  showStatus(`Point neutre : température ${next.temp > 0 ? "+" : ""}${next.temp}, teinte ${next.tint > 0 ? "+" : ""}${next.tint}.`);
}

let cropDrag = null;
photoFrame.addEventListener("pointerdown", (event) => {
  if (!photoTool || !previewSource || event.target.closest("button")) return;
  const point = photoPointFromEvent(event);
  event.stopPropagation(); // pas de déplacement / zoom de l'aperçu pendant l'outil
  event.preventDefault();
  if (photoTool === "pipette") {
    if (point.inside) pickNeutral(point);
    return;
  }
  const g = editGeometry(originalSize.w, originalSize.h);
  commit("edit:crop");
  cropDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, cropX: edit.cropX, cropY: edit.cropY, g, scale: point.scale };
}, true);

window.addEventListener("pointermove", (event) => {
  if (!cropDrag || event.pointerId !== cropDrag.id) return;
  const { g } = cropDrag;
  // Glisser vers la droite fait suivre la photo : le cadrage part vers la gauche.
  const perPixel = g.w / cropDrag.scale; // pixels d'origine par pixel d'écran
  const dx = (event.clientX - cropDrag.x) * perPixel;
  const dy = (event.clientY - cropDrag.y) * perPixel;
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const cropX = g.slackX > 1 ? clamp(cropDrag.cropX - dx / g.slackX) : 0;
  const cropY = g.slackY > 1 ? clamp(cropDrag.cropY - dy / g.slackY) : 0;
  if (cropX === edit.cropX && cropY === edit.cropY) return;
  edit = { ...edit, cropX, cropY };
  markInteractive();
  scheduleRebuild();
});

["pointerup", "pointercancel"].forEach((type) => {
  window.addEventListener(type, (event) => {
    if (cropDrag && event.pointerId === cropDrag.id) cropDrag = null;
  });
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
