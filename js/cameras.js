/* Fuji Looks — Compatibilité des recettes avec le boîtier choisi. */

/*
 * Données indicatives, par génération de capteur. Les mises à jour firmware ajoutent
 * parfois des simulations : `maybe` liste celles qui dépendent de la version du firmware.
 * Pour corriger ou ajouter un boîtier, il suffit de modifier ce tableau.
 *
 *   cce        Color Chrome Effect
 *   ccb        Color Chrome FX Blue
 *   clarity    Clarity
 *   grainSize  taille du grain (Small / Large)
 *   halfSteps  Highlight / Shadow par demi-pas
 *   monoWC     Monochromatic Color chaud / froid
 *   monoMG     Monochromatic Color magenta / vert
 */
const SIMS_BASE = ["provia", "velvia", "astia", "pro-neg-hi", "pro-neg-std",
  "monochrome", "monochrome-ye", "monochrome-r", "monochrome-g", "sepia"];
const SIMS_ACROS = ["acros", "acros-ye", "acros-r", "acros-g"];

const CAMERA_GENERATIONS = [
  {
    name: "X-Trans III",
    sims: [...SIMS_BASE, "classic-chrome", ...SIMS_ACROS],
    features: { cce: false, ccb: false, clarity: false, grainSize: false, halfSteps: false, monoWC: false, monoMG: false },
    cameras: [
      { id: "x-pro2", name: "X-Pro2" },
      { id: "x-t2", name: "X-T2" },
      { id: "x-t20", name: "X-T20" },
      { id: "x100f", name: "X100F" },
      { id: "x-e3", name: "X-E3" },
      { id: "x-h1", name: "X-H1", extraSims: ["eterna"] }
    ]
  },
  {
    name: "X-Trans IV (X-T3, X-T30)",
    sims: [...SIMS_BASE, "classic-chrome", ...SIMS_ACROS, "eterna"],
    features: { cce: true, ccb: false, clarity: false, grainSize: false, halfSteps: false, monoWC: true, monoMG: false },
    cameras: [
      { id: "x-t3", name: "X-T3" },
      { id: "x-t30", name: "X-T30" }
    ]
  },
  {
    name: "X-Trans IV",
    sims: [...SIMS_BASE, "classic-chrome", ...SIMS_ACROS, "eterna", "classic-neg"],
    features: { cce: true, ccb: true, clarity: true, grainSize: true, halfSteps: true, monoWC: true, monoMG: true },
    cameras: [
      { id: "x-pro3", name: "X-Pro3" },
      { id: "x100v", name: "X100V" },
      { id: "x-t4", name: "X-T4", extraSims: ["bleach-bypass"] },
      { id: "x-s10", name: "X-S10", extraSims: ["bleach-bypass"] },
      { id: "x-e4", name: "X-E4", extraSims: ["bleach-bypass"] },
      { id: "x-t30-ii", name: "X-T30 II", extraSims: ["bleach-bypass"] }
    ]
  },
  {
    name: "X-Trans V",
    sims: [...SIMS_BASE, "classic-chrome", ...SIMS_ACROS, "eterna", "classic-neg", "bleach-bypass", "nostalgic-neg"],
    features: { cce: true, ccb: true, clarity: true, grainSize: true, halfSteps: true, monoWC: true, monoMG: true },
    cameras: [
      { id: "x-h2s", name: "X-H2S", maybeSims: ["reala-ace"] },
      { id: "x-h2", name: "X-H2", maybeSims: ["reala-ace"] },
      { id: "x-t5", name: "X-T5", maybeSims: ["reala-ace"] },
      { id: "x-s20", name: "X-S20", maybeSims: ["reala-ace"] },
      { id: "x100vi", name: "X100VI", extraSims: ["reala-ace"] },
      { id: "x-t50", name: "X-T50", extraSims: ["reala-ace"] },
      { id: "x-m5", name: "X-M5", extraSims: ["reala-ace"] },
      { id: "x-e5", name: "X-E5", extraSims: ["reala-ace"] }
    ]
  }
];

const CAMERA_KEY = "fuji-looks.camera";

const CAMERAS = new Map();
CAMERA_GENERATIONS.forEach((generation) => {
  generation.cameras.forEach((camera) => {
    CAMERAS.set(camera.id, {
      ...camera,
      generation: generation.name,
      sims: new Set([...generation.sims, ...(camera.extraSims || [])]),
      maybeSims: new Set(camera.maybeSims || []),
      features: generation.features
    });
  });
});

let cameraId = CAMERAS.has(load(CAMERA_KEY)) ? load(CAMERA_KEY) : "";

const cameraSelect = document.getElementById("cameraSelect");
const compatList = document.getElementById("compatList");

/*
 * Renvoie { errors, warnings, maybes } : messages pour une recette sur le boîtier choisi.
 *   errors   la simulation n'existe pas sur ce boîtier
 *   warnings un réglage ne peut pas être reproduit (il sera ignoré ou arrondi)
 *   maybes   simulation dépendant du firmware
 */
function checkCompat(r, camera = CAMERAS.get(cameraId)) {
  const result = { errors: [], warnings: [], maybes: [] };
  if (!camera || !r) return result;
  const sim = FR.simById(r.filmSim);
  const f = camera.features;

  if (camera.maybeSims.has(sim.id)) {
    result.maybes.push(`${sim.name} n’est présent sur le ${camera.name} qu’avec un firmware récent : vérifie le menu.`);
  } else if (!camera.sims.has(sim.id)) {
    result.errors.push(`${sim.name} n’existe pas sur le ${camera.name}.`);
  }
  if (!f.cce && r.colorChromeEffect !== "off") result.warnings.push("Color Chrome Effect n’existe pas sur ce boîtier.");
  if (!f.ccb && r.colorChromeFxBlue !== "off") result.warnings.push("Color Chrome FX Blue n’existe pas sur ce boîtier.");
  if (!f.clarity && r.clarity !== 0) result.warnings.push("Clarity n’existe pas sur ce boîtier.");
  if (!f.grainSize && r.grainEffect !== "off" && r.grainSize === "large") {
    result.warnings.push("La taille du grain ne se règle pas : seul Weak / Strong est disponible.");
  }
  if (!f.halfSteps && (r.highlight % 1 !== 0 || r.shadow % 1 !== 0)) {
    result.warnings.push("Highlight / Shadow ne se règlent que par pas entiers : arrondis-les.");
  }
  if (sim.mono) {
    if (!f.monoWC && r.monoWC !== 0) result.warnings.push("Monochromatic Color (chaud / froid) n’existe pas sur ce boîtier.");
    if (!f.monoMG && r.monoMG !== 0) result.warnings.push("Monochromatic Color (magenta / vert) n’existe pas sur ce boîtier.");
  }
  return result;
}

function buildCameraSelect() {
  cameraSelect.add(new Option("Aucun (pas de vérification)", ""));
  CAMERA_GENERATIONS.forEach((generation) => {
    const group = document.createElement("optgroup");
    group.label = generation.name;
    generation.cameras.forEach((camera) => group.appendChild(new Option(camera.name, camera.id)));
    cameraSelect.appendChild(group);
  });
  cameraSelect.value = cameraId;
  cameraSelect.addEventListener("change", () => {
    cameraId = cameraSelect.value;
    store(CAMERA_KEY, cameraId);
    updateCompat();
    renderSlots();
  });
}

// Messages sous l'en-tête des réglages et badge ⚠ sur les looks impossibles à reproduire.
function updateCompat() {
  const camera = CAMERAS.get(cameraId);
  compatList.textContent = "";
  if (camera && applied) {
    const { errors, warnings, maybes } = checkCompat(recipe, camera);
    const items = [
      ...errors.map((text) => ["error", text]),
      ...warnings.map((text) => ["warning", text]),
      ...maybes.map((text) => ["warning", text])
    ];
    if (!items.length) items.push(["ok", `Recette reproductible sur ton ${camera.name}.`]);
    items.forEach(([level, text]) => {
      const li = document.createElement("li");
      li.className = `compat-${level}`;
      li.textContent = text;
      compatList.appendChild(li);
    });
  }

  lookGroups.querySelectorAll(".look-card").forEach((card) => {
    const look = lookById.get(card.dataset.look);
    const check = camera && look && look.recipe ? checkCompat(look.recipe, camera) : null;
    const blocked = Boolean(check && check.errors.length);
    card.classList.toggle("incompatible", blocked);
    card.title = blocked ? check.errors[0] : "";
  });
}
