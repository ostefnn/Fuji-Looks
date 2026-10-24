/* Fuji Looks — Export de recette : preset Lightroom, LUT, texte, code et lien de partage, JSON. */
// --- Export de recette -----------------------------------------------------

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Garder l'URL disponible un moment pour laisser le navigateur
  // démarrer le téléchargement, notamment sur mobile.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadText(fileName, text, type) {
  downloadBlob(new Blob([text], { type }), fileName);
}

function copyText(text, message) {
  function fallback() {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      // ignoré : message d'échec ci-dessous
    }
    area.remove();
    showStatus(ok ? message : "Copie impossible : ton navigateur bloque le presse-papiers.");
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showStatus(message), fallback);
  } else {
    fallback();
  }
}

function shareLink() {
  return `${location.href.split("#")[0]}#r=${FR.toShareCode(recipe)}`;
}

FR.XMP_TARGETS.forEach((target) => xmpTarget.add(new Option(target.name, target.id)));

// Détail des réglages Camera Raw écrits dans le preset, comme dans le convertisseur.
function renderXmpDetails() {
  const target = FR.XMP_TARGETS.find((t) => t.id === xmpTarget.value);
  if (!target) return;
  xmpHint.textContent = target.hint;
  const x = FR.xmpSettings(recipe, target.id);
  const rows = x.settings.map(([key, value]) => [key, value === "" ? "—" : String(value)]);
  if (x.curve) rows.push(["ToneCurvePV2012", x.curve.map((pt) => pt.join(",")).join("  ")]);

  const table = document.createElement("table");
  const body = table.createTBody();
  rows.forEach(([key, value]) => {
    const tr = body.insertRow();
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = key;
    tr.appendChild(th);
    tr.insertCell().textContent = value;
  });
  xmpDetails.replaceChildren(table);
  if (x.notes.length) {
    const list = document.createElement("ul");
    x.notes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      list.appendChild(li);
    });
    xmpDetails.appendChild(list);
  }
}
xmpTarget.addEventListener("change", renderXmpDetails);

document.getElementById("xmpButton").addEventListener("click", () => {
  downloadText(FR.fileName(recipe, ".xmp"), FR.toXmp(recipe, xmpTarget.value), "application/rdf+xml");
  showStatus("Preset téléchargé. Dans Lightroom : Paramètres prédéfinis → Importer.");
});

document.getElementById("cubeButton").addEventListener("click", () => {
  const size = Number(lutSize.value);
  downloadText(FR.fileName(recipe, `-${size}.cube`), FR.toCube(recipe, size), "text/plain");
  showStatus(`LUT téléchargée (${size}×${size}×${size}).`);
});

document.getElementById("copyTextButton").addEventListener("click", () => {
  copyText(FR.toText(recipe), "Recette copiée en texte.");
});

document.getElementById("copyCodeButton").addEventListener("click", () => {
  copyText(FR.toShareCode(recipe), "Code de partage copié.");
});

document.getElementById("copyLinkButton").addEventListener("click", () => {
  copyText(shareLink(), "Lien copié : il ouvre cette recette dans Fuji Looks.");
});

document.getElementById("jsonButton").addEventListener("click", () => {
  const doc = { app: "fuji-recipe-converter", version: 1, recipe };
  downloadText(FR.fileName(recipe, ".recipe.json"), JSON.stringify(doc, null, 2), "application/json");
});
