/* Fuji Looks — Picture Controls Nikon (.NP3) : réglages et rendu, partagés par la page et le worker d'export.
 *
 * Un Picture Control « Flexible Color » se compose de curseurs de tons (ou d'une courbe), d'une
 * saturation, d'un mélangeur de couleurs (8 teintes : teinte, intensité, luminosité), d'un étalonnage
 * (ombres, tons moyens, hautes lumières) et de la clarté. Fuji Looks les applique à la photo déjà
 * développée (JPEG, HEIC) : le rendu s'approche de celui du boîtier ou de NX Studio sans le reproduire
 * exactement. La netteté n'est pas simulée.
 *
 * Les opérations de couleur se font en OKLab (luminosité, intensité et teinte séparées et perceptuelles).
 */

const NIKON_COLORS = [
  // Centre de chaque couleur du mélangeur, en angle de teinte OKLab (degrés).
  { key: "red", label: "Rouge", hue: 29, swatch: "#e5484d" },
  { key: "orange", label: "Orange", hue: 60, swatch: "#f08a24" },
  { key: "yellow", label: "Jaune", hue: 105, swatch: "#e8c531" },
  { key: "green", label: "Vert", hue: 142, swatch: "#46a758" },
  { key: "cyan", label: "Cyan", hue: 195, swatch: "#2fb8c9" },
  { key: "blue", label: "Bleu", hue: 264, swatch: "#3e63dd" },
  { key: "purple", label: "Violet", hue: 295, swatch: "#8e4ec6" },
  { key: "magenta", label: "Magenta", hue: 330, swatch: "#d6409f" }
];
const NIKON_ZONES = [
  { key: "shadows", label: "Ombres" },
  { key: "midTone", label: "Tons moyens" },
  { key: "highlights", label: "Hautes lumières" }
];
const NIKON_TONE_KEYS = ["contrast", "highlights", "shadows", "whiteLevel", "blackLevel"];
const NIKON_FLEXIBLE_BASE = 0x0020;

// Base du Picture Control : Flexible Color, Monochrome (0x06xx) ou une autre base de NX Studio.
function nikonBaseKind(code) {
  if (code === NIKON_FLEXIBLE_BASE || code === undefined || code === null) return "flexible";
  return code >> 8 === 0x06 ? "mono" : "other";
}

function nikonBaseLabel(spec) {
  const kind = nikonBaseKind(spec.baseCode);
  return kind === "flexible" ? "Flexible Color" : kind === "mono" ? "Monochrome" : "Autre base Nikon";
}

const clampNk = (v, min, max, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
};

// Réglages complets et bornés d'un Picture Control (valeurs absentes : réglage neutre).
function normalizeNikon(input = {}) {
  const blender = {};
  NIKON_COLORS.forEach(({ key }) => {
    const c = (input.blender || {})[key] || {};
    blender[key] = {
      hue: Math.round(clampNk(c.hue, -100, 100)),
      chroma: Math.round(clampNk(c.chroma, -100, 100)),
      brightness: Math.round(clampNk(c.brightness, -100, 100))
    };
  });
  const g = input.grading || {};
  const grading = { blending: Math.round(clampNk(g.blending, 0, 100, 50)), balance: Math.round(clampNk(g.balance, -100, 100)) };
  NIKON_ZONES.forEach(({ key }) => {
    const z = g[key] || {};
    grading[key] = {
      hue: Math.round(((clampNk(z.hue, -720, 720) % 360) + 360) % 360),
      chroma: Math.round(clampNk(z.chroma, -100, 100)),
      brightness: Math.round(clampNk(z.brightness, -100, 100))
    };
  });
  const curve = Array.isArray(input.curve) && input.curve.length >= 2
    ? input.curve.map(([x, y]) => [Math.round(clampNk(x, 0, 255)), Math.round(clampNk(y, 0, 255))]).sort((a, b) => a[0] - b[0])
    : null;
  const curveRaw = curve && Array.isArray(input.curveRaw) && input.curveRaw.length === 257 ? input.curveRaw.map((v) => clampNk(v, 0, 32767)) : null;
  const spec = {
    nikon: true,
    name: String(input.name || "Picture Control").slice(0, 60),
    comment: String(input.comment || "").slice(0, 256),
    baseCode: Number.isInteger(input.baseCode) ? input.baseCode : NIKON_FLEXIBLE_BASE,
    sharpening: clampNk(input.sharpening, -3, 9, 2),
    midSharpening: clampNk(input.midSharpening, -5, 5, 1),
    clarity: clampNk(input.clarity, -5, 5, 0),
    saturation: Math.round(clampNk(input.saturation, -100, 100)),
    blender,
    grading,
    curve,
    curveRaw
  };
  NIKON_TONE_KEYS.forEach((key) => { spec[key] = Math.round(clampNk(input[key], -100, 100)); });
  return spec;
}

// Fichier .NP3 lu par NP3.deserialize -> réglages Fuji Looks.
function nikonFromNp3(pc, fallbackName = "") {
  return normalizeNikon({
    name: pc.name || fallbackName,
    comment: pc.comment,
    baseCode: pc.baseCode,
    sharpening: pc.sharpning,
    midSharpening: pc.midRangeSharpning,
    clarity: pc.clarity,
    contrast: pc.contrast,
    highlights: pc.highlights,
    shadows: pc.shadows,
    whiteLevel: pc.whiteLevel,
    blackLevel: pc.blackLevel,
    saturation: pc.saturation,
    blender: pc.colorBlender,
    grading: pc.colorGrading,
    curve: pc.toneCurve && pc.toneCurve.points.length >= 2 ? pc.toneCurve.points.map((p) => [p.x, p.y]) : null,
    curveRaw: pc.toneCurve ? pc.toneCurve.raw : null
  });
}

// Réglages Fuji Looks -> options de NP3.serialize. Le fichier écrit est toujours un Flexible Color :
// une base Monochrome est rendue en noir et blanc par le mélangeur (intensité −100 sur les 8 couleurs).
function nikonToNp3Options(spec) {
  const mono = nikonBaseKind(spec.baseCode) === "mono";
  const colorBlender = {};
  NIKON_COLORS.forEach(({ key }) => {
    colorBlender[key] = { ...spec.blender[key], chroma: mono ? -100 : spec.blender[key].chroma };
  });
  const name = String(spec.name || "PICTURE CONTROL").normalize("NFD").replace(/[^\x20-\x7e]/g, "").slice(0, 19) || "FUJI LOOKS";
  const options = {
    name,
    comment: spec.comment || undefined,
    sharpning: Math.round(spec.sharpening * 4) / 4,
    midRangeSharpning: Math.round(spec.midSharpening * 4) / 4,
    clarity: Math.round(spec.clarity * 4) / 4,
    contrast: spec.contrast,
    highlights: spec.highlights,
    shadows: spec.shadows,
    whiteLevel: spec.whiteLevel,
    blackLevel: spec.blackLevel,
    saturation: spec.saturation,
    colorBlender,
    colorGrading: spec.grading
  };
  if (spec.curve) options.toneCurve = { raw: spec.curveRaw || curveToRaw(spec.curve), points: spec.curve.map(([x, y]) => ({ x, y })) };
  return options;
}

// --- Couleur : sRGB <-> OKLab ---------------------------------------------------

function nkToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function nkToSrgb(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function nkToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

function nkFromOklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}

// Direction (a, b) en OKLab d'une teinte de la roue chromatique Nikon (0° rouge, 120° vert, 240° bleu).
function nkHueDirection(deg) {
  const h = (((deg % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  const rgb = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
  const [, a, b] = nkToOklab(...rgb.map(nkToLinear));
  const len = Math.hypot(a, b) || 1;
  return [a / len, b / len];
}

const nkSmooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// --- Tons : courbe du Picture Control, ou curseurs Contraste / Hautes lumières / Ombres / Blanc / Noir --

function nikonToneTable(spec) {
  if (spec.curve) return spec.curveRaw ? rawCurveTable(spec.curveRaw) : curveTable(spec.curve);
  const c = spec.contrast / 100;
  const hl = spec.highlights / 100;
  const sh = spec.shadows / 100;
  const wl = spec.whiteLevel / 100;
  const bl = spec.blackLevel / 100;
  const out = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    let y = x + 0.9 * c * (x * x * (3 - 2 * x) - x);
    y += 0.18 * hl * 6.75 * x * x * (1 - x);
    y += 0.18 * sh * 6.75 * x * (1 - x) * (1 - x);
    y += 0.12 * wl * x * x * x;
    y += 0.12 * bl * (1 - x) * (1 - x) * (1 - x);
    out[i] = Math.max(0, Math.min(1, y));
  }
  return out;
}

// Fonction couleur du Picture Control (hors clarté). Entrée : sRGB linéaire après la courbe de tons ;
// sortie écrite dans `out` en sRGB 0..1. Sans allocation par appel : elle est évaluée pour chaque
// nœud de la LUT 3D (35 937 fois en 33³), à chaque mouvement de curseur.
function nikonColorCore(spec) {
  const mono = nikonBaseKind(spec.baseCode) === "mono";
  // −100 : noir et blanc (les recettes N&B Nikon l'utilisent) ; +100 : intensité × 1,5.
  const sat = spec.saturation >= 0 ? 1 + 0.5 * (spec.saturation / 100) : Math.max(0, 1 + spec.saturation / 100);
  const nc = NIKON_COLORS.length;
  const cHue = new Float64Array(nc);
  const cSpan = new Float64Array(nc);
  const cHueShift = new Float64Array(nc);
  const cChroma = new Float64Array(nc);
  const cBright = new Float64Array(nc);
  let blenderOn = false;
  NIKON_COLORS.forEach((c, k) => {
    const v = spec.blender[c.key];
    cHue[k] = c.hue;
    cSpan[k] = ((((NIKON_COLORS[(k + 1) % nc].hue - c.hue) % 360) + 360) % 360) || 360;
    cHueShift[k] = 30 * (v.hue / 100);
    cChroma[k] = v.chroma / 100;
    cBright[k] = 0.2 * (v.brightness / 100);
    if (v.hue || v.chroma || v.brightness) blenderOn = true;
  });
  const g = spec.grading;
  const zA = new Float64Array(3);
  const zB = new Float64Array(3);
  const zL = new Float64Array(3);
  NIKON_ZONES.forEach(({ key }, z) => {
    const v = g[key];
    const [da, db] = nkHueDirection(v.hue);
    zA[z] = da * 0.06 * (v.chroma / 100);
    zB[z] = db * 0.06 * (v.chroma / 100);
    zL[z] = 0.12 * (v.brightness / 100);
  });
  const gradingOn = [0, 1, 2].some((z) => zA[z] || zB[z] || zL[z]);
  const mid = 0.5 - 0.2 * (g.balance / 100);
  const spread = 0.15 + 0.35 * (g.blending / 100);

  return (lr, lg, lb, out) => {
    // OKLab
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    let L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    let A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    let B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    // Saturation et mélangeur de couleurs, sur l'intensité et la teinte.
    if (mono) {
      A = 0;
      B = 0;
    } else {
      const C0 = Math.sqrt(A * A + B * B);
      let C = C0 * sat;
      if (blenderOn && C > 1e-5) {
        let h = (Math.atan2(B, A) * 180) / Math.PI;
        if (h < 0) h += 360;
        // Les deux couleurs voisines, pondérées linéairement sur le cercle des teintes.
        let i = nc - 1;
        for (let k = 0; k < nc; k++) if (h >= cHue[k]) i = k;
        const j = (i + 1) % nc;
        let dh = h - cHue[i];
        if (dh < 0) dh += 360;
        const t = dh / cSpan[i];
        const colorful = C < 0.08 ? C / 0.08 : 1;
        const chroma = cChroma[i] * (1 - t) + cChroma[j] * t;
        C *= 1 + (chroma > 0 ? 0.6 * chroma : chroma);
        h += (cHueShift[i] * (1 - t) + cHueShift[j] * t) * colorful;
        L += (cBright[i] * (1 - t) + cBright[j] * t) * colorful;
        const rad = (h * Math.PI) / 180;
        A = C * Math.cos(rad);
        B = C * Math.sin(rad);
      } else if (sat !== 1) {
        A *= sat;
        B *= sat;
      }
    }
    // Étalonnage des ombres, tons moyens et hautes lumières.
    if (gradingOn) {
      const ws = 1 - nkSmooth(mid - spread, mid, L);
      const wh = nkSmooth(mid, mid + spread, L);
      const wm = Math.max(0, 1 - ws - wh);
      A += zA[0] * ws + zA[1] * wm + zA[2] * wh;
      B += zB[0] * ws + zB[1] * wm + zB[2] * wh;
      L += zL[0] * ws + zL[1] * wm + zL[2] * wh;
    }
    if (L < 0) L = 0;
    const l2 = L + 0.3963377774 * A + 0.2158037573 * B;
    const m2 = L - 0.1055613458 * A - 0.0638541728 * B;
    const s2 = L - 0.0894841775 * A - 1.291485548 * B;
    const l3 = l2 * l2 * l2;
    const m3 = m2 * m2 * m2;
    const s3 = s2 * s2 * s2;
    out[0] = nkToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
    out[1] = nkToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
    out[2] = nkToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);
  };
}

// Valeurs linéaires d'une couche après la courbe de tons, pour `n` entrées réparties de 0 à 1.
function nikonToneAxis(spec, n) {
  const tone = nikonToneTable(spec);
  const axis = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * 255;
    const k = Math.min(254, Math.floor(f));
    axis[i] = nkToLinear(tone[k] + (tone[k + 1] - tone[k]) * (f - k));
  }
  return axis;
}

// Fonction couleur complète pour une couleur sRGB 0..1 (tests, pipette) : renvoie [r, g, b].
function nikonColorFunction(spec) {
  const tone = nikonToneTable(spec);
  const core = nikonColorCore(spec);
  const toneAt = (v) => {
    const f = Math.max(0, Math.min(1, v)) * 255;
    const i = Math.min(254, Math.floor(f));
    return nkToLinear(tone[i] + (tone[i + 1] - tone[i]) * (f - i));
  };
  return (r, g, b) => {
    const out = [0, 0, 0];
    core(toneAt(r), toneAt(g), toneAt(b), out);
    return out;
  };
}

const nikonLutCache = new Map();
// Taille de la LUT : 33 par défaut ; l'aperçu passe à 17 pendant un glissement de curseur (5 fois plus rapide).
const NIKON_OPTIONS = { lutSize: 33 };

// LUT 3D (même disposition que celles du convertisseur : rouge le plus rapide, valeurs 0..1).
function nikonLut(spec, n = LUT_N) {
  const key = `${n}|${JSON.stringify(spec, (k, v) => (k === "name" || k === "comment" ? undefined : v))}`;
  if (nikonLutCache.has(key)) return nikonLutCache.get(key);
  const axis = nikonToneAxis(spec, n);
  const core = nikonColorCore(spec);
  const lut = new Float32Array(n * n * n * 3);
  const out = new Float64Array(3);
  let p = 0;
  for (let bi = 0; bi < n; bi++) {
    for (let gi = 0; gi < n; gi++) {
      for (let ri = 0; ri < n; ri++) {
        core(axis[ri], axis[gi], axis[bi], out);
        lut[p++] = out[0];
        lut[p++] = out[1];
        lut[p++] = out[2];
      }
    }
  }
  if (nikonLutCache.size >= 24) nikonLutCache.delete(nikonLutCache.keys().next().value);
  nikonLutCache.set(key, lut);
  return lut;
}

// Clarté (−5 à +5) : contraste local, la différence avec une version floutée de la luminance.
function applyNikonClarity(imageData, clarity) {
  const k = clarity * 0.08;
  if (!k) return;
  const d = imageData.data;
  const blur = makeBlur(imageData);
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const yb = 0.2126 * blur[i] + 0.7152 * blur[i + 1] + 0.0722 * blur[i + 2];
    // Moins d'effet dans les noirs et les blancs, pour ne pas les boucher ou les brûler.
    const t = y / 255;
    const delta = k * (y - yb) * 4 * t * (1 - t);
    d[i] += delta;
    d[i + 1] += delta;
    d[i + 2] += delta;
  }
}

// Applique un Picture Control à une ImageData et renvoie une nouvelle ImageData.
function renderNikon(src, spec, strength) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (strength <= 0) return out;
  const n = NIKON_OPTIONS.lutSize;
  FR.applyLut(src.data, out.data, w, h, nikonLut(spec, n), n, 0);
  if (spec.clarity) applyNikonClarity(out, spec.clarity);
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

// LUT 3D au format .cube (couleur et tons, sans la clarté).
function nikonCubeText(spec, size = 33) {
  const lut = nikonLut(spec, size);
  const lines = [`TITLE "${String(spec.name).replace(/"/g, "'")}"`, "# Picture Control Nikon, rendu Fuji Looks", `LUT_3D_SIZE ${size}`, ""];
  for (let i = 0; i < lut.length; i += 3) lines.push(`${lut[i].toFixed(6)} ${lut[i + 1].toFixed(6)} ${lut[i + 2].toFixed(6)}`);
  return `${lines.join("\n")}\n`;
}
