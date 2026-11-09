/* Fuji Looks — Picture Controls Nikon : onglet « Nikon » (fichiers .NP3 importés, gardés sur l'appareil),
 * panneau de réglages et exports (.NP3, LUT 3D). Le rendu est dans js/nikon.js. */

const NIKON_KEY = "fuji-looks.nikon.v1";
let nikonLibrary = (Array.isArray(load(NIKON_KEY)) ? load(NIKON_KEY) : [])
  .filter((item) => item && item.spec)
  .map((item) => ({ id: String(item.id), savedAt: item.savedAt, spec: normalizeNikon(item.spec) }));

const nikonPanel = document.getElementById("nikonPanel");
const nikonName = document.getElementById("nikonName");
const nikonMeta = document.getElementById("nikonMeta");
const nikonComment = document.getElementById("nikonComment");
const nikonNote = document.getElementById("nikonNote");
const nikonSaveButton = document.getElementById("nikonSaveButton");
const nikonResetButton = document.getElementById("nikonResetButton");
const nikonDeleteButton = document.getElementById("nikonDeleteButton");
const nikonCurveToggle = document.getElementById("nikonCurveToggle");
const nikonToneSliders = document.getElementById("nikonToneSliders");
const nikonCurveBox = document.getElementById("nikonCurveBox");
const nikonBlenderColors = document.getElementById("nikonBlenderColors");
const nikonZones = document.getElementById("nikonZones");
const nikonNameInput = document.getElementById("nikonNameInput");
const nikonCommentInput = document.getElementById("nikonCommentInput");

let nikonColor = "red"; // couleur réglée dans le mélangeur
let nikonZone = "shadows"; // zone réglée dans l'étalonnage

const newNikonId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nkSigned = (v, digits = 0) => {
  let text = Math.abs(v).toFixed(digits);
  if (digits) text = text.replace(/\.?0+$/, "");
  text = text.replace(".", ",") || "0";
  return v > 0 ? `+${text}` : v < 0 ? `−${text}` : "0";
};

// --- Onglet « Nikon » ------------------------------------------------------------------

function nikonLookDesc(spec) {
  return `Picture Control · ${nikonBaseLabel(spec)}${spec.curve ? " · courbe" : ""}`;
}

function syncNikonLooks() {
  for (let i = LOOKS.length - 1; i >= 0; i--) {
    if (LOOKS[i].id.startsWith("nk-")) {
      lookById.delete(LOOKS[i].id);
      LOOKS.splice(i, 1);
    }
  }
  const looks = nikonLibrary.map((item) => ({
    id: `nk-${item.id}`,
    name: item.spec.name,
    desc: nikonLookDesc(item.spec),
    group: "nikon",
    nikon: item.spec
  }));
  LOOKS.push(...looks);
  looks.forEach((look) => lookById.set(look.id, look));
}

function refreshNikonLibrary() {
  store(NIKON_KEY, nikonLibrary);
  syncNikonLooks();
  buildLookGrid();
  if (thumbSource) renderThumbnails(...thumbSource);
}

function nikonItemForLook(lookId) {
  return lookId && lookId.startsWith("nk-") ? nikonLibrary.find((item) => `nk-${item.id}` === lookId) || null : null;
}

// --- Import ----------------------------------------------------------------------------

function isNikonFile(file) {
  return /\.(np3|ncp|np2)$/i.test(file.name || "");
}

// Un ou plusieurs .NP3 : ajoutés à l'onglet Nikon (sans doublon), le premier est appliqué.
async function importNikonFiles(files) {
  const added = [];
  const failed = [];
  let legacy = 0;
  for (const file of files) {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      if (!NP3.isNp3(buf)) {
        if (buf[0] === 0x4e && buf[1] === 0x43 && buf[2] === 0x50) legacy++;
        else failed.push(file.name);
        continue;
      }
      const spec = nikonFromNp3(NP3.deserialize(buf), file.name.replace(/\.[^.]+$/, ""));
      const same = nikonLibrary.find((item) => JSON.stringify(item.spec) === JSON.stringify(spec));
      if (same) {
        added.push(same);
        continue;
      }
      const item = { id: newNikonId(), savedAt: Date.now(), spec };
      nikonLibrary.push(item);
      added.push(item);
    } catch {
      failed.push(file.name);
    }
  }
  if (added.length) {
    refreshNikonLibrary();
    showTab("nikon");
    selectLook(`nk-${added[0].id}`);
  }
  const parts = [];
  if (added.length) parts.push(added.length > 1 ? `${added.length} Picture Controls Nikon ajoutés à l’onglet « Nikon ».` : `« ${added[0].spec.name} » ajouté à l’onglet « Nikon ».`);
  if (legacy) parts.push(`${legacy > 1 ? `${legacy} fichiers sont` : "Un fichier est"} au format ancien (.NCP / NP2) : ouvre-le dans NX Studio et enregistre-le en .NP3.`);
  if (failed.length) parts.push(`Illisible : ${failed.join(", ")}.`);
  const message = parts.join(" ");
  setImportStatus(message, !added.length);
  showStatus(message);
}

// --- Panneau de réglages ---------------------------------------------------------------

// Curseurs simples : clé du réglage, élément, affichage de la valeur.
const NIKON_SLIDERS = [
  ["contrast", "nikonContrast", 0],
  ["highlights", "nikonHighlights", 0],
  ["shadows", "nikonShadows", 0],
  ["whiteLevel", "nikonWhiteLevel", 0],
  ["blackLevel", "nikonBlackLevel", 0],
  ["saturation", "nikonSaturation", 0],
  ["clarity", "nikonClarity", 0],
  ["sharpening", "nikonSharpening", 2],
  ["midSharpening", "nikonMidSharpening", 1]
].map(([key, id, reset]) => ({
  key,
  reset,
  input: document.getElementById(id),
  output: document.getElementById(`${id}Value`)
}));

const NIKON_BLEND_SLIDERS = [["hue", "nikonBlendHue"], ["chroma", "nikonBlendChroma"], ["brightness", "nikonBlendBrightness"]]
  .map(([key, id]) => ({ key, input: document.getElementById(id), output: document.getElementById(`${id}Value`) }));
const NIKON_GRADE_SLIDERS = [["hue", "nikonGradeHue"], ["chroma", "nikonGradeChroma"], ["brightness", "nikonGradeBrightness"]]
  .map(([key, id]) => ({ key, input: document.getElementById(id), output: document.getElementById(`${id}Value`) }));
const nikonBlending = document.getElementById("nikonBlending");
const nikonBalance = document.getElementById("nikonBalance");

function nikonEdited(changes, key = null) {
  if (!currentNikon) return;
  commit(key && `nikon:${key}`);
  currentNikon = normalizeNikon({ ...currentNikon, ...changes });
  modified = true;
  updateNikonEditor();
  updateStageTitle();
  saveDraft();
  schedulePreview();
}

NIKON_SLIDERS.forEach(({ key, input, reset }) => {
  input.addEventListener("input", () => {
    markInteractive();
    nikonEdited({ [key]: Number(input.value) }, key);
  });
  input.addEventListener("dblclick", () => nikonEdited({ [key]: reset }));
});

function editBlender(prop, value, key) {
  const blender = { ...currentNikon.blender, [nikonColor]: { ...currentNikon.blender[nikonColor], [prop]: value } };
  nikonEdited({ blender }, key);
}

function editGrading(changes, key) {
  nikonEdited({ grading: { ...currentNikon.grading, ...changes } }, key);
}

NIKON_BLEND_SLIDERS.forEach(({ key, input }) => {
  input.addEventListener("input", () => {
    markInteractive();
    editBlender(key, Number(input.value), `blend:${nikonColor}:${key}`);
  });
  input.addEventListener("dblclick", () => editBlender(key, 0));
});

NIKON_GRADE_SLIDERS.forEach(({ key, input }) => {
  input.addEventListener("input", () => {
    markInteractive();
    editGrading({ [nikonZone]: { ...currentNikon.grading[nikonZone], [key]: Number(input.value) } }, `grade:${nikonZone}:${key}`);
  });
  input.addEventListener("dblclick", () => editGrading({ [nikonZone]: { ...currentNikon.grading[nikonZone], [key]: 0 } }));
});

nikonBlending.addEventListener("input", () => {
  markInteractive();
  editGrading({ blending: Number(nikonBlending.value) }, "grade:blending");
});
nikonBlending.addEventListener("dblclick", () => editGrading({ blending: 50 }));
nikonBalance.addEventListener("input", () => {
  markInteractive();
  editGrading({ balance: Number(nikonBalance.value) }, "grade:balance");
});
nikonBalance.addEventListener("dblclick", () => editGrading({ balance: 0 }));

// Couleurs du mélangeur et zones de l'étalonnage : boutons radio.
NIKON_COLORS.forEach(({ key, label, swatch }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nikon-swatch";
  button.dataset.color = key;
  button.setAttribute("role", "radio");
  button.setAttribute("aria-label", label);
  button.title = label;
  button.style.setProperty("--swatch", swatch);
  button.addEventListener("click", () => {
    nikonColor = key;
    updateNikonEditor();
  });
  nikonBlenderColors.append(button);
});

NIKON_ZONES.forEach(({ key, label }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.zone = key;
  button.setAttribute("role", "radio");
  button.textContent = label;
  button.addEventListener("click", () => {
    nikonZone = key;
    updateNikonEditor();
  });
  nikonZones.append(button);
});

// Courbe : remplace les curseurs de tons. Activée, elle reprend la forme donnée par les curseurs.
const nikonCurveEditor = createCurveEditor({
  id: "nikonCurve",
  label: "Courbe de tons du Picture Control",
  channels: ["rgb"],
  onChange(points) {
    markInteractive();
    nikonEdited({ curve: points, curveRaw: null }, "curve");
  },
  onReset() {
    nikonEdited({ curve: CURVE_DEFAULT.map((p) => p.slice()), curveRaw: null });
  }
});
document.getElementById("nikonCurveSlot").append(nikonCurveEditor.el);

nikonCurveToggle.addEventListener("click", () => {
  if (!currentNikon) return;
  if (currentNikon.curve) {
    nikonEdited({ curve: null, curveRaw: null });
    return;
  }
  const table = nikonToneTable(currentNikon);
  const curve = [0, 64, 128, 192, 255].map((x) => [x, Math.round(table[x] * 255)]);
  const tone = Object.fromEntries(NIKON_TONE_KEYS.map((key) => [key, 0]));
  nikonEdited({ ...tone, curve, curveRaw: null });
});

nikonNameInput.addEventListener("input", () => nikonEdited({ name: nikonNameInput.value }, "name"));
nikonCommentInput.addEventListener("input", () => nikonEdited({ comment: nikonCommentInput.value }, "comment"));

function updateNikonEditor() {
  if (!currentNikon) return;
  const spec = currentNikon;
  const item = nikonItemForLook(currentLookId);
  nikonName.textContent = spec.name + (modified ? " · modifié" : "");
  nikonMeta.textContent = `Picture Control Nikon · ${nikonBaseLabel(spec)}`;
  nikonComment.textContent = spec.comment ? `« ${spec.comment} »` : "";
  nikonComment.hidden = !spec.comment;
  const kind = nikonBaseKind(spec.baseCode);
  nikonNote.textContent = kind === "flexible"
    ? "Rendu approché, appliqué à la photo développée. La netteté n’est pas simulée. S’exporte en .NP3 (Flexible Color) et en LUT 3D."
    : kind === "mono"
      ? "Picture Control basé sur Monochrome : rendu en noir et blanc avec sa courbe. Les filtres et virages Monochrome du fichier ne sont pas lus."
      : "Picture Control basé sur une autre base Nikon : seuls la courbe et les réglages Flexible Color sont lus, le rendu peut s’écarter de NX Studio.";
  nikonResetButton.disabled = !modified || !item;
  nikonDeleteButton.hidden = !item;

  NIKON_SLIDERS.forEach(({ key, input, output }) => {
    input.value = spec[key];
    const digits = key === "clarity" || key.endsWith("harpening") ? 2 : 0;
    output.textContent = nkSigned(spec[key], digits);
  });
  const hasCurve = Boolean(spec.curve);
  nikonCurveToggle.setAttribute("aria-pressed", String(hasCurve));
  nikonToneSliders.hidden = hasCurve;
  nikonCurveBox.hidden = !hasCurve;
  if (hasCurve) nikonCurveEditor.set(spec.curve);

  nikonBlenderColors.querySelectorAll("[data-color]").forEach((button) => {
    const c = spec.blender[button.dataset.color];
    button.setAttribute("aria-checked", String(button.dataset.color === nikonColor));
    button.classList.toggle("is-set", Boolean(c.hue || c.chroma || c.brightness));
  });
  NIKON_BLEND_SLIDERS.forEach(({ key, input, output }) => {
    input.value = spec.blender[nikonColor][key];
    output.textContent = nkSigned(spec.blender[nikonColor][key]);
  });

  nikonZones.querySelectorAll("[data-zone]").forEach((button) => {
    const z = spec.grading[button.dataset.zone];
    button.setAttribute("aria-checked", String(button.dataset.zone === nikonZone));
    button.setAttribute("aria-pressed", String(button.dataset.zone === nikonZone));
    button.classList.toggle("is-set", Boolean(z.chroma || z.brightness));
  });
  const zone = spec.grading[nikonZone];
  NIKON_GRADE_SLIDERS.forEach(({ key, input, output }) => {
    input.value = zone[key];
    output.textContent = key === "hue" ? `${zone.hue}°` : nkSigned(zone[key]);
  });
  nikonBlending.value = spec.grading.blending;
  document.getElementById("nikonBlendingValue").textContent = String(spec.grading.blending);
  nikonBalance.value = spec.grading.balance;
  document.getElementById("nikonBalanceValue").textContent = nkSigned(spec.grading.balance);

  if (document.activeElement !== nikonNameInput) nikonNameInput.value = spec.name;
  if (document.activeElement !== nikonCommentInput) nikonCommentInput.value = spec.comment;
}

// --- Enregistrer, rétablir, supprimer ----------------------------------------------------

nikonSaveButton.addEventListener("click", () => {
  if (!currentNikon) return;
  const spec = normalizeNikon(currentNikon);
  const existing = nikonItemForLook(currentLookId);
  let item;
  if (existing && window.confirm(`Remplacer « ${existing.spec.name} » par ces réglages ?\n\nAnnuler : enregistrer une copie.`)) {
    existing.spec = spec;
    existing.savedAt = Date.now();
    item = existing;
  } else {
    item = { id: newNikonId(), savedAt: Date.now(), spec };
    nikonLibrary.push(item);
  }
  commit();
  currentNikon = spec;
  currentLookId = `nk-${item.id}`;
  modified = false;
  refreshNikonLibrary();
  updateRecipeEditor();
  showTab("nikon");
  schedulePreview();
  showStatus(store(NIKON_KEY, nikonLibrary)
    ? `« ${spec.name} » enregistré dans l’onglet « Nikon ».`
    : "Enregistrement impossible : le stockage du navigateur est indisponible.");
});

nikonResetButton.addEventListener("click", () => {
  if (nikonItemForLook(currentLookId)) selectLook(currentLookId);
});

nikonDeleteButton.addEventListener("click", () => {
  const item = nikonItemForLook(currentLookId);
  if (!item || !window.confirm(`Supprimer « ${item.spec.name} » de l’onglet « Nikon » ?`)) return;
  nikonLibrary = nikonLibrary.filter((other) => other !== item);
  currentLookId = null;
  modified = true;
  refreshNikonLibrary();
  updateRecipeEditor();
  showStatus(`« ${item.spec.name} » supprimé. Ses réglages restent appliqués jusqu’au prochain look.`);
});

// --- Exports -----------------------------------------------------------------------------

function nikonSlug(spec) {
  return spec.name.normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "picture-control";
}

function downloadNp3() {
  if (!currentNikon) return;
  closeMenus();
  try {
    const bytes = NP3.serialize(nikonToNp3Options(currentNikon));
    downloadBlob(new Blob([bytes], { type: "application/octet-stream" }), `${nikonSlug(currentNikon).toUpperCase().slice(0, 19)}.NP3`);
    showStatus("Picture Control téléchargé. Copie-le dans NIKON/CUSTOMPC sur la carte, puis Picture Control → Charger/enregistrer.");
  } catch (err) {
    showStatus(`Export .NP3 impossible (${err?.message || "erreur inconnue"}).`);
  }
}

function downloadNikonCube() {
  if (!currentNikon) return;
  closeMenus();
  const size = Number(lutSize.value) || 33;
  downloadText(`${nikonSlug(currentNikon)}-${size}.cube`, nikonCubeText(currentNikon, size), "text/plain");
  showStatus(`LUT 3D du Picture Control téléchargée (${size}×${size}×${size}).`);
}

document.getElementById("np3Button").addEventListener("click", downloadNp3);
document.getElementById("np3FileButton").addEventListener("click", downloadNp3);
document.getElementById("nikonCubeButton").addEventListener("click", downloadNikonCube);

// Réglages imprimés dans le cadre (option « Réglages »), avec les noms des menus Nikon.
function nikonFrameTokens(spec) {
  const tokens = [nikonBaseLabel(spec)];
  if (spec.curve) tokens.push("Tone Curve");
  else {
    [["contrast", "Contrast"], ["highlights", "Highlights"], ["shadows", "Shadows"], ["whiteLevel", "White Level"], ["blackLevel", "Black Level"]]
      .forEach(([key, label]) => { if (spec[key]) tokens.push(`${label} ${nkSigned(spec[key])}`); });
  }
  tokens.push(`Saturation ${nkSigned(spec.saturation)}`, `Clarity ${nkSigned(spec.clarity, 2)}`);
  if (NIKON_COLORS.some(({ key }) => { const c = spec.blender[key]; return c.hue || c.chroma || c.brightness; })) tokens.push("Color Blender");
  if (NIKON_ZONES.some(({ key }) => spec.grading[key].chroma || spec.grading[key].brightness)) tokens.push("Color Grading");
  return tokens;
}
