/* Fuji Looks — Mon boîtier : préparer les 7 réglages personnalisés C1–C7. */

const SLOTS_KEY = "fuji-looks.slots";
const SLOT_COUNT = 7;
let slots = (() => {
  const saved = load(SLOTS_KEY);
  const list = Array.isArray(saved) ? saved.slice(0, SLOT_COUNT) : [];
  while (list.length < SLOT_COUNT) list.push(null);
  return list.map((slot) => (slot && slot.recipe ? { recipe: FR.normalize(slot.recipe), lookId: slot.lookId || null } : null));
})();

const slotList = document.getElementById("slotList");
const slotsCamera = document.getElementById("slotsCamera");

function saveSlots() {
  store(SLOTS_KEY, slots);
}

function renderSlots() {
  slotList.textContent = "";
  const camera = CAMERAS.get(cameraId);
  slotsCamera.textContent = camera ? camera.name.toUpperCase() : "";
  slots.forEach((slot, i) => {
    const li = document.createElement("li");
    li.className = "slot-row";
    const num = document.createElement("span");
    num.className = "slot-num";
    num.textContent = `C${i + 1}`;
    li.appendChild(num);

    const name = document.createElement("button");
    name.type = "button";
    name.className = "slot-name";
    if (slot) {
      name.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = slot.recipe.name || "Recette";
      const sim = document.createElement("small");
      sim.textContent = FR.simById(slot.recipe.filmSim).name;
      name.append(strong, sim);
      name.title = "Ouvrir cette recette";
      name.addEventListener("click", () => {
        if (slot.lookId && lookById.has(slot.lookId) &&
            JSON.stringify(FR.normalize(lookById.get(slot.lookId).recipe)) === JSON.stringify(slot.recipe)) selectLook(slot.lookId);
        else loadRecipe(slot.recipe);
      });
    } else {
      name.textContent = "Vide";
      name.disabled = true;
    }
    li.appendChild(name);

    if (slot && camera) {
      const check = checkCompat(slot.recipe, camera);
      const issues = [...check.errors, ...check.warnings, ...check.maybes];
      const badge = document.createElement("span");
      badge.className = `slot-compat ${check.errors.length ? "is-error" : issues.length ? "is-warning" : "is-ok"}`;
      badge.textContent = check.errors.length ? "✕" : issues.length ? "!" : "✓";
      badge.title = issues.length ? issues.join("\n") : `Reproductible sur ton ${camera.name}`;
      li.appendChild(badge);
    }

    const put = document.createElement("button");
    put.type = "button";
    put.className = "secondary-button slot-put";
    put.textContent = slot ? "Remplacer" : "Placer ici";
    put.title = "Placer la recette en cours dans cet emplacement";
    put.addEventListener("click", () => {
      if (!applied) {
        showStatus("Choisis d’abord un look ou une recette.");
        return;
      }
      slots[i] = { recipe: FR.normalize(recipe), lookId: modified ? null : currentLookId };
      saveSlots();
      renderSlots();
      showStatus(`« ${recipe.name} » placée en C${i + 1}.`);
    });
    li.appendChild(put);

    if (slot) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "slot-clear";
      clear.textContent = "✕";
      clear.setAttribute("aria-label", `Vider C${i + 1}`);
      clear.addEventListener("click", () => {
        slots[i] = null;
        saveSlots();
        renderSlots();
      });
      li.appendChild(clear);
    }
    slotList.appendChild(li);
  });
}

// Fiche image des 7 emplacements, à garder sous les yeux en réglant le boîtier.
function buildSlotsCard() {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const pad = 64;
  ctx.fillStyle = "#111214";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e45b52";
  ctx.font = `700 22px ${font}`;
  ctx.fillText("MES RÉGLAGES PERSONNALISÉS", pad, 92);
  ctx.fillStyle = "#f4f4f0";
  ctx.font = `700 50px ${font}`;
  const camera = CAMERAS.get(cameraId);
  ctx.fillText(camera ? `${camera.name} · C1–C7` : "C1–C7", pad, 150);

  const top = 200;
  const rowH = (H - top - 70) / SLOT_COUNT;
  slots.forEach((slot, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(pad, y, W - pad * 2, 1);
    ctx.fillStyle = "#e45b52";
    ctx.font = `700 40px ${font}`;
    ctx.fillText(`C${i + 1}`, pad, y + 58);
    if (!slot) {
      ctx.fillStyle = "#5f656d";
      ctx.font = `500 26px ${font}`;
      ctx.fillText("Vide", pad + 110, y + 56);
      return;
    }
    ctx.fillStyle = "#f4f4f0";
    ctx.font = `700 30px ${font}`;
    ctx.fillText(slot.recipe.name || "Recette", pad + 110, y + 50, W - pad * 2 - 420);
    ctx.fillStyle = "#a3a8b0";
    ctx.font = `600 20px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(FR.simById(slot.recipe.filmSim).name.toUpperCase(), W - pad, y + 50, 300);
    ctx.textAlign = "left";
    ctx.font = `400 19px ${font}`;
    ctx.fillStyle = "#c9cdd3";
    const lines = wrapTokens(ctx, frameTokens(slot.recipe), W - pad * 2 - 110).slice(0, 3);
    lines.forEach((line, j) => ctx.fillText(line, pad + 110, y + 82 + j * 25));
  });
  ctx.fillStyle = "#5f656d";
  ctx.font = `500 18px ${font}`;
  ctx.textAlign = "right";
  ctx.fillText("FUJI LOOKS", W - pad, H - 32);
  ctx.textAlign = "left";
  return canvas;
}

document.getElementById("slotsCardButton").addEventListener("click", () => {
  if (!slots.some(Boolean)) {
    showStatus("Place d’abord au moins une recette dans C1–C7.");
    return;
  }
  buildSlotsCard().toBlob((blob) => {
    if (blob) presentResult(new File([blob], "fuji-looks-c1-c7.png", { type: "image/png" }),
      { title: "Fiche C1–C7 prête", savedMessage: "Fiche C1–C7 enregistrée." });
  }, "image/png");
});

// Un .FP1 par emplacement rempli, à envoyer dans X RAW Studio (modèle du boîtier requis).
document.getElementById("slotsFp1Button").addEventListener("click", async () => {
  if (!fp1Template) {
    showStatus("Charge d’abord le modèle .FP1 de ton boîtier (Exporter la recette → Vers ton boîtier).");
    return;
  }
  const filled = slots.map((slot, i) => slot && [i, slot]).filter(Boolean);
  if (!filled.length) {
    showStatus("Place d’abord au moins une recette dans C1–C7.");
    return;
  }
  for (const [i, slot] of filled) {
    const { xml } = buildFp1(slot.recipe);
    downloadText(`C${i + 1}-${FR.fileName(slot.recipe, ".FP1")}`, xml, "application/xml");
    await new Promise((r) => setTimeout(r, 400)); // laisse le navigateur enchaîner les téléchargements
  }
  showStatus(`${filled.length} profil${filled.length > 1 ? "s" : ""} .FP1 téléchargé${filled.length > 1 ? "s" : ""}.`);
});
