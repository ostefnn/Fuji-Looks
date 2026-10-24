/* Fuji Looks — Open Fuji Recipe (OFR v1) : format JSON ouvert d'échange entre applications.
 * Spécification : https://github.com/gosku/open-fuji-recipe (version 1, brouillon).
 */

const OFR_SIMS = {
  provia: "Provia", velvia: "Velvia", astia: "Astia", "classic-chrome": "Classic Chrome",
  "pro-neg-hi": "Pro Neg. Hi", "pro-neg-std": "Pro Neg. Std", "classic-neg": "Classic Negative",
  eterna: "Eterna", "bleach-bypass": "Eterna Bleach Bypass", "nostalgic-neg": "Nostalgic Negative",
  "reala-ace": "Reala Ace", acros: "Acros STD", "acros-ye": "Acros Yellow", "acros-r": "Acros Red",
  "acros-g": "Acros Green", monochrome: "Monochrome STD", "monochrome-ye": "Monochrome Yellow",
  "monochrome-r": "Monochrome Red", "monochrome-g": "Monochrome Green", sepia: "Sepia"
};
const OFR_WB = {
  auto: "Auto", "auto-white": "Auto (white priority)", "auto-ambience": "Auto (ambience priority)",
  daylight: "Daylight", shade: "Shade", incandescent: "Incandescent", "fluorescent-1": "Fluorescent 1",
  "fluorescent-2": "Fluorescent 2", "fluorescent-3": "Fluorescent 3", kelvin: "Kelvin",
  underwater: "Underwater", custom: "Custom 1"
};
const OFR_DR = { dr100: "DR100", dr200: "DR200", dr400: "DR400", auto: "DR-Auto" };
const OFR_ENVELOPE = ["v", "hash", "name", "source_url", "source_attribution"];

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v.toLowerCase(), k]));
const OFR_SIMS_IN = invert(OFR_SIMS);
const OFR_WB_IN = { ...invert(OFR_WB), "custom 2": "custom", "custom 3": "custom" };
const OFR_DR_IN = invert(OFR_DR);

const capitalize1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Recette Fuji Looks → document OFR (règles d'omission de la spécification).
function recipeToOfrSettings(r) {
  const sim = FR.simById(r.filmSim);
  const o = {
    film_simulation: OFR_SIMS[sim.id],
    dynamic_range: OFR_DR[r.dynamicRange],
    d_range_priority: "Off",
    grain_roughness: capitalize1(r.grainEffect),
    white_balance: OFR_WB[r.whiteBalance] || "Auto",
    white_balance_red: r.wbShiftRed,
    white_balance_blue: r.wbShiftBlue,
    highlight: r.highlight,
    shadow: r.shadow,
    sharpness: r.sharpness,
    high_iso_nr: r.noiseReduction,
    clarity: r.clarity
  };
  if (r.grainEffect !== "off") o.grain_size = capitalize1(r.grainSize);
  if (r.whiteBalance === "kelvin") o.wb_kelvin = r.kelvin;
  if (sim.mono) {
    o.monochromatic_color_warm_cool = r.monoWC;
    o.monochromatic_color_magenta_green = r.monoMG;
  } else {
    o.color = r.color;
    o.color_chrome_effect = capitalize1(r.colorChromeEffect);
    o.color_chrome_fx_blue = capitalize1(r.colorChromeFxBlue);
  }
  return o;
}

// SHA-256 de tous les champs hors enveloppe (réglages, capteurs et extensions « x_… »), clés triées,
// JSON compact : même calcul que la bibliothèque Kata (340 empreintes sur 340 identiques).
async function ofrHash(doc) {
  const payload = {};
  Object.keys(doc).filter((k) => !OFR_ENVELOPE.includes(k)).forEach((k) => { payload[k] = doc[k]; });
  if (!payload.sensors) payload.sensors = [];
  const canonical = JSON.stringify(Object.fromEntries(Object.keys(payload).sort().map((k) => [k, payload[k]])));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Correction d'exposition : « +1/3 » ↔ 0.33, « -1 2/3 » ↔ -1.67 (extension x_exposure_comp de Kata).
function exposureToNumber(text) {
  const m = /^\s*([+\-−]?)\s*(\d+)?(?:\s*(\d)\/3)?\s*(?:ev|il)?\s*$/i.exec(String(text || ""));
  if (!m || (!m[2] && !m[3])) return null;
  const thirds = (Number(m[2] || 0) * 3 + Number(m[3] || 0)) * (m[1] === "-" || m[1] === "−" ? -1 : 1);
  return Math.round((thirds / 3) * 100) / 100;
}

function exposureToText(value) {
  const thirds = Math.round(value * 3);
  if (!thirds) return "0";
  const whole = Math.floor(Math.abs(thirds) / 3);
  const rest = Math.abs(thirds) % 3;
  return `${thirds > 0 ? "+" : "-"}${whole || ""}${whole && rest ? " " : ""}${rest ? `${rest}/3` : ""}`;
}

// Nom : 25 caractères ASCII au maximum.
function ofrName(name) {
  return String(name || "Recipe").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "").trim().slice(0, 25);
}

async function recipeToOfr(r, { sensors = [], sourceUrl = "", sourceAttribution = "" } = {}) {
  const doc = { v: 1, name: ofrName(r.name), ...recipeToOfrSettings(r) };
  if (sensors.length) doc.sensors = sensors;
  if (sourceUrl) doc.source_url = sourceUrl;
  if (sourceAttribution) doc.source_attribution = sourceAttribution;
  if (r.iso) doc.x_iso = r.iso;
  const ev = exposureToNumber(r.exposureComp);
  if (ev !== null) doc.x_exposure_comp = ev;
  doc.hash = await ofrHash(doc);
  return doc;
}

// Document OFR → valeurs de recette Fuji Looks (ou null si ce n'est pas de l'OFR v1).
function ofrToRecipe(doc) {
  if (!doc || typeof doc !== "object" || doc.v !== 1 || typeof doc.film_simulation !== "string") return null;
  const lower = (v) => String(v || "").toLowerCase();
  const values = { name: String(doc.name || "Recette OFR") };
  values.filmSim = OFR_SIMS_IN[lower(doc.film_simulation)];
  if (!values.filmSim) return null;
  if (doc.dynamic_range) values.dynamicRange = OFR_DR_IN[lower(doc.dynamic_range)];
  values.whiteBalance = OFR_WB_IN[lower(doc.white_balance)] || "auto";
  if (doc.wb_kelvin) values.kelvin = doc.wb_kelvin;
  const num = { white_balance_red: "wbShiftRed", white_balance_blue: "wbShiftBlue", highlight: "highlight", shadow: "shadow",
    color: "color", sharpness: "sharpness", high_iso_nr: "noiseReduction", clarity: "clarity",
    monochromatic_color_warm_cool: "monoWC", monochromatic_color_magenta_green: "monoMG" };
  Object.entries(num).forEach(([k, key]) => { if (typeof doc[k] === "number") values[key] = doc[k]; });
  if (doc.grain_roughness) values.grainEffect = lower(doc.grain_roughness);
  if (doc.grain_size) values.grainSize = lower(doc.grain_size);
  if (doc.color_chrome_effect) values.colorChromeEffect = lower(doc.color_chrome_effect);
  if (doc.color_chrome_fx_blue) values.colorChromeFxBlue = lower(doc.color_chrome_fx_blue);
  if (typeof doc.x_iso === "string") values.iso = doc.x_iso;
  if (typeof doc.x_exposure_comp === "number") values.exposureComp = exposureToText(doc.x_exposure_comp);
  if (Array.isArray(doc.sensors)) values.camera = doc.sensors.join(" / ");
  return { values, found: Object.keys(values), source: "Open Fuji Recipe", sourceUrl: doc.source_url || "" };
}

// Texte importé : un document OFR, une liste, ou un objet { recipes: [...] } (bibliothèque Kata…).
function parseOfrText(text) {
  let data;
  try {
    data = JSON.parse(String(text).replace(/^﻿/, "").trim());
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : [data];
  const recipes = list.map((item) => ofrToRecipe(item && item.ofr ? item.ofr : item)).filter(Boolean);
  return recipes.length ? recipes : null;
}

function currentLookMeta() {
  const look = currentLookId && !modified ? lookById.get(currentLookId) : null;
  return look ? { sensors: look.sensors || [], sourceUrl: look.sourceUrl || "", sourceAttribution: look.sourceUrl ? "Fuji X Weekly" : "" } : {};
}

document.getElementById("ofrButton").addEventListener("click", async () => {
  const doc = await recipeToOfr(FR.normalize(recipe), currentLookMeta());
  downloadText(FR.fileName(recipe, ".ofr.json"), JSON.stringify(doc, null, 2), "application/json");
  showStatus("Recette exportée au format Open Fuji Recipe.");
});
