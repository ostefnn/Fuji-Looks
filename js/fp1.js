/* Fuji Looks — Export d'une recette en profil X RAW Studio (.FP1), pour l'envoyer vers le boîtier.
 *
 * Un .FP1 contient l'identité du boîtier (modèle, version, numéro de série…), sans laquelle
 * X RAW Studio refuse le fichier. On part donc d'un « modèle » : un .FP1 enregistré une fois
 * depuis ton propre appareil, dont on garde tout et où l'on remplace seulement les réglages.
 * Format observé sur les profils publiés dans quiode/fujifilm-recipes (X-T50).
 */

const FP1_TEMPLATE_KEY = "fuji-looks.fp1-template";

// Valeurs X RAW Studio. Auto, Auto_White, Daylight, FLight3 et Temperature figurent dans des
// fichiers réels ; les autres sont déduites des alias du convertisseur (à confirmer).
const FP1_WB = {
  auto: "Auto", "auto-white": "Auto_White", "auto-ambience": "Auto_Ambiance", daylight: "Daylight",
  shade: "Shade", "fluorescent-1": "FLight1", "fluorescent-2": "FLight2", "fluorescent-3": "FLight3",
  incandescent: "Incand", underwater: "UWater", kelvin: "Temperature", custom: "Custom1"
};

let fp1Template = (() => {
  const saved = load(FP1_TEMPLATE_KEY);
  return saved && typeof saved.xml === "string" ? saved : null;
})();

const fp1Status = document.getElementById("fp1Status");
const fp1Button = document.getElementById("fp1Button");
const fp1TemplateFile = document.getElementById("fp1TemplateFile");

function parseFp1(xml) {
  const doc = new DOMParser().parseFromString(String(xml).replace(/^﻿/, ""), "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return null;
  const group = doc.getElementsByTagName("PropertyGroup")[0];
  return group ? { doc, group } : null;
}

// Un modèle valable vient d'un vrai boîtier : modèle et numéro de série renseignés.
function templateInfo(xml) {
  const parsed = parseFp1(xml);
  if (!parsed) return null;
  const serial = (parsed.group.getElementsByTagName("SerialNumber")[0]?.textContent || "").trim();
  const device = parsed.group.getAttribute("device") || "";
  return device && serial ? { device, serial } : null;
}

function saveFp1Template(xml) {
  const info = templateInfo(xml);
  if (!info) return false;
  fp1Template = { xml: String(xml), device: info.device, serialEnd: info.serial.slice(-4) };
  store(FP1_TEMPLATE_KEY, fp1Template);
  updateFp1Status();
  return true;
}

function updateFp1Status() {
  fp1Button.disabled = !fp1Template;
  fp1Status.textContent = fp1Template
    ? `Modèle : ${fp1Template.device} (n° de série …${fp1Template.serialEnd}).`
    : "Charge d’abord un .FP1 enregistré depuis ton boîtier dans X RAW Studio : il sert de modèle.";
}

function buildFp1(r) {
  const parsed = parseFp1(fp1Template.xml);
  const { doc, group } = parsed;
  const sim = FR.simById(r.filmSim);
  function set(tag, value) {
    let el = group.getElementsByTagName(tag)[0];
    if (!el) {
      el = doc.createElement(tag);
      group.appendChild(el);
    }
    el.textContent = String(value);
  }
  const notes = [];
  group.setAttribute("label", (r.name || "Fuji Looks").slice(0, 25));
  set("FilmSimulation", sim.fp);
  // DR-Auto n'a pas de valeur connue dans ce format : on garde celle du modèle.
  if (r.dynamicRange === "auto") notes.push("Dynamic Range Auto : valeur du modèle conservée, à régler sur le boîtier.");
  else set("DynamicRange", r.dynamicRange.replace("dr", ""));
  set("WhiteBalance", FP1_WB[r.whiteBalance] || "Auto");
  set("WBColorTemp", r.whiteBalance === "kelvin" ? `${r.kelvin}K` : "0K");
  set("WBShiftR", r.wbShiftRed);
  set("WBShiftB", r.wbShiftBlue);
  set("GrainEffect", r.grainEffect.toUpperCase());
  set("GrainEffectSize", r.grainSize.toUpperCase());
  set("ChromeEffect", r.colorChromeEffect.toUpperCase());
  set("ColorChromeBlue", r.colorChromeFxBlue.toUpperCase());
  set("HighlightTone", r.highlight);
  set("ShadowTone", r.shadow);
  set("Color", sim.mono ? 0 : r.color);
  set("Sharpness", r.sharpness);
  set("NoisReduction", r.noiseReduction);
  set("Clarity", r.clarity);
  set("BlackImageTone", sim.mono ? r.monoWC : 0);
  set("MonochromaticColor_RG", sim.mono ? r.monoMG : 0);
  let xml = new XMLSerializer().serializeToString(doc);
  if (!xml.startsWith("<?xml")) xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;
  return { xml, notes };
}

fp1Button.addEventListener("click", () => {
  if (!fp1Template) return;
  const { xml, notes } = buildFp1(FR.normalize(recipe));
  downloadText(FR.fileName(recipe, ".FP1"), xml, "application/xml");
  showStatus(notes.length ? `Profil .FP1 téléchargé. ${notes.join(" ")}` : "Profil .FP1 téléchargé : ouvre-le dans X RAW Studio pour l’envoyer au boîtier.");
});

fp1TemplateFile.addEventListener("change", async () => {
  const file = fp1TemplateFile.files?.[0];
  fp1TemplateFile.value = "";
  if (!file) return;
  const xml = await file.text();
  showStatus(saveFp1Template(xml)
    ? `Modèle de ton ${fp1Template.device} enregistré sur cet appareil.`
    : "Ce fichier ne contient pas l’identité d’un boîtier (modèle et numéro de série).");
});
