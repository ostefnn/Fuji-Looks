/* Fuji Looks — Pipeline de rendu partagé entre la page et le worker d'export.
 * Recette -> LUT 3D -> pixels, avec les mêmes étapes que Fuji Recipe Converter. */

const LUT_N = 33;
const LUT_CACHE_MAX = 40;
const lutCache = new Map();

// Canvas de la page, ou OffscreenCanvas dans le worker.
function makeCanvas(w, h) {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }
  return new OffscreenCanvas(w, h);
}

/*
 * Simulation du mode de balance des blancs (Daylight, Incandescent, Kelvin…).
 * Le convertisseur n'applique que le décalage R/B sur une photo développée. Ici, on considère
 * que la photo est neutre en lumière du jour (5500 K, teinte +10 comme le preset Daylight)
 * et on applique l'écart avec le mode de la recette, comme le ferait le boîtier :
 * Incandescent en plein jour → image bleutée, Shade → plus chaude. Auto / Custom : pas de valeur fixe.
 */
const PIPELINE_OPTIONS = { simulateWb: true };
const WB_REFERENCE = [5500, 10];

// Couleur (sRGB linéaire, Y = 1) d'une source à la température T (lieu de Planck, approximation de Kim).
function kelvinToLinearRgb(T) {
  const t = Math.min(25000, Math.max(1667, T));
  const x = t <= 4000
    ? -0.2661239e9 / t ** 3 - 0.2343589e6 / t ** 2 + 0.8776956e3 / t + 0.17991
    : -3.0258469e9 / t ** 3 + 2.1070379e6 / t ** 2 + 0.2226347e3 / t + 0.24039;
  const y = t <= 2222
    ? -1.1063814 * x ** 3 - 1.3481102 * x ** 2 + 2.18555832 * x - 0.20219683
    : t <= 4000
      ? -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867
      : 3.081758 * x ** 3 - 5.8733867 * x ** 2 + 3.75112997 * x - 0.37001483;
  const X = x / y;
  const Z = (1 - x - y) / y;
  return [3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.204 + 1.057 * Z];
}

// Gains R, G, B (luminance constante) pour un mode de balance des blancs, ou null s'il n'a pas de valeur fixe.
function whiteBalanceGains(r) {
  const preset = r.whiteBalance === "kelvin" ? [r.kelvin, 10] : FR.wbById(r.whiteBalance).lr;
  if (!preset) return null;
  const scene = kelvinToLinearRgb(WB_REFERENCE[0]);
  const assumed = kelvinToLinearRgb(preset[0]);
  const gains = scene.map((v, i) => v / assumed[i]);
  // Teinte : le boîtier compense une lumière verte (teinte positive) en ajoutant du magenta.
  gains[1] *= Math.pow(2, -(preset[1] - WB_REFERENCE[1]) * 0.004);
  const luma = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
  return gains.map((g) => g / luma);
}

function getLookData(lookRecipe) {
  const derived = FR.derive(lookRecipe, { drInCurve: true });
  if (PIPELINE_OPTIONS.simulateWb) {
    const extra = whiteBalanceGains(FR.normalize(lookRecipe));
    if (extra) derived.wbGains = derived.wbGains.map((g, i) => g * extra[i]);
  }
  const key = JSON.stringify(derived);
  if (!lutCache.has(key)) {
    if (lutCache.size >= LUT_CACHE_MAX) lutCache.delete(lutCache.keys().next().value);
    lutCache.set(key, FR.buildLut(derived, LUT_N));
  }
  return { derived, lut: lutCache.get(key) };
}

// Flou large et peu coûteux (réduction puis agrandissement) pour la clarté.
// Mêmes étapes et mêmes options de canvas que le convertisseur, pour un résultat identique.
function makeBlur(imageData) {
  const { width: w, height: h } = imageData;
  const graded = makeCanvas(w, h);
  graded.getContext("2d", { willReadFrequently: true }).putImageData(imageData, 0, 0);

  const small = makeCanvas(Math.max(1, w >> 4), Math.max(1, h >> 4));
  small.getContext("2d").drawImage(graded, 0, 0, small.width, small.height);

  const big = makeCanvas(w, h);
  const bctx = big.getContext("2d", { willReadFrequently: true });
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, w, h);
  return bctx.getImageData(0, 0, w, h).data;
}

// Le convertisseur affiche la photo réduite à 1100 px et calibre son grain sur 900 px.
// On reproduit la même taille de grain relative, quelle que soit la résolution rendue.
const REF_PREVIEW_SIDE = 1100;

function grainScale(width, sourceW, sourceH, derived) {
  const base = derived.grain.size > 30 ? 2.4 : 1.2;
  const refW = Math.max(1, Math.round(sourceW * Math.min(1, REF_PREVIEW_SIDE / Math.max(sourceW, sourceH))));
  const refCell = Math.max(1, Math.round(base * refW / 900));
  return (refCell * width) / refW / base;
}

// Applique une recette (ou rien si null) à une ImageData et renvoie une nouvelle ImageData.
// `source` = dimensions de la photo d'origine, pour la taille du grain.
// `grainWidth` = largeur équivalente de la photo entière (différente pour une vignette recadrée).
function renderRecipe(src, lookRecipe, strength, source = { w: src.width, h: src.height }, grainWidth = src.width) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (!lookRecipe || strength <= 0) return out;

  const { derived, lut } = getLookData(lookRecipe);
  FR.applyLut(src.data, out.data, w, h, lut, LUT_N, 0);

  const blur = derived.clarity ? makeBlur(out) : null;
  FR.applySpatial(out.data, w, h, derived, blur, 0, grainScale(grainWidth, source.w, source.h, derived));

  if (strength < 1) {
    const a = src.data;
    const b = out.data;
    for (let i = 0; i < b.length; i += 4) {
      b[i] = a[i] + (b[i] - a[i]) * strength;
      b[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * strength;
      b[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * strength;
    }
  }
  return out;
}
