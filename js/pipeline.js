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

function getLookData(lookRecipe) {
  const derived = FR.derive(lookRecipe, { drInCurve: true });
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
