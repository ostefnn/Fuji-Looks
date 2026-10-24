/* Fuji Looks — Comparer la recette en cours avec une autre : seuls les réglages qui changent. */

const comparePanel = document.getElementById("comparePanel");
const compareSelect = document.getElementById("compareSelect");
const compareResult = document.getElementById("compareResult");
const compareApply = document.getElementById("compareApply");

// Recettes proposées : emplacements C1–C7 remplis, puis chaque onglet de looks.
function compareCandidates() {
  const groups = [];
  const slotItems = slots.map((slot, i) => slot && { key: `slot-${i}`, label: `C${i + 1} · ${slot.recipe.name}`, recipe: slot.recipe }).filter(Boolean);
  if (slotItems.length) groups.push(["Mon boîtier C1–C7", slotItems]);
  ALL_GROUPS.forEach((group) => {
    const items = LOOKS.filter((look) => look.group === group.id && look.recipe).map((look) => ({ key: look.id, label: look.name, recipe: look.recipe }));
    if (items.length) groups.push([group.title, items]);
  });
  return groups;
}

function fillCompareSelect() {
  const previous = compareSelect.value;
  compareSelect.textContent = "";
  compareSelect.add(new Option("Choisis une recette…", ""));
  compareCandidates().forEach(([title, items]) => {
    const group = document.createElement("optgroup");
    group.label = title;
    items.forEach((item) => group.appendChild(new Option(item.label, item.key)));
    compareSelect.appendChild(group);
  });
  compareSelect.value = [...compareSelect.options].some((o) => o.value === previous) ? previous : "";
}

function compareTarget() {
  const key = compareSelect.value;
  if (!key) return null;
  if (key.startsWith("slot-")) return slots[Number(key.slice(5))]?.recipe || null;
  return lookById.get(key)?.recipe || null;
}

function updateCompare() {
  if (!comparePanel.open) return;
  const other = compareTarget();
  compareResult.textContent = "";
  compareApply.hidden = !other;
  if (!other) return;
  const a = FR.normalize(recipe);
  const b = FR.normalize(other);
  // Un réglage compte s'il s'applique à l'une des deux recettes (ex. Color en couleur, WC/MG en N&B).
  const rows = FR.FIELDS.filter((f) => !f.meta && ((!f.when || f.when(a)) || (!f.when || f.when(b))) && a[f.key] !== b[f.key]);
  if (!rows.length) {
    compareResult.innerHTML = '<p class="hint">Réglages identiques.</p>';
    return;
  }
  const table = document.createElement("table");
  table.className = "compare-table";
  const head = table.createTHead().insertRow();
  ["Réglage", a.name || "Actuelle", b.name || "Autre"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    head.appendChild(th);
  });
  const body = table.createTBody();
  rows.forEach((field) => {
    const tr = body.insertRow();
    tr.insertCell().textContent = field.label;
    tr.insertCell().textContent = !field.when || field.when(a) ? FR.formatValue(field, a) : "—";
    tr.insertCell().textContent = !field.when || field.when(b) ? FR.formatValue(field, b) : "—";
  });
  const count = document.createElement("p");
  count.className = "hint";
  count.textContent = `${rows.length} réglage${rows.length > 1 ? "s" : ""} à changer sur le boîtier.`;
  compareResult.append(count, table);
}

comparePanel.addEventListener("toggle", () => {
  if (comparePanel.open) {
    fillCompareSelect();
    updateCompare();
  }
});
compareSelect.addEventListener("change", updateCompare);
compareApply.addEventListener("click", () => {
  const key = compareSelect.value;
  if (key.startsWith("slot-")) loadRecipe(slots[Number(key.slice(5))].recipe);
  else if (key) selectLook(key);
  compareSelect.value = "";
  updateCompare();
});
