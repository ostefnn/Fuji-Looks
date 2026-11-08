/* Fuji Looks — Grille de balance des blancs : un point à déplacer sur deux axes, comme l'écran
 * « WB Shift » des boîtiers Fujifilm. Utilisée pour le décalage R / B de la recette (−9 à +9) et pour
 * la température / teinte de la retouche (−100 à +100).
 *
 *   createWbPad({ id, label, min, max, step, bigStep, x: { label, color… }, y: { … }, colors, onChange, onReset })
 *   pad.el : élément à insérer ; pad.set(x, y) : affiche des valeurs sans rappeler onChange.
 * Souris / doigt : glisser le point ou toucher la grille. Clavier : flèches (Maj : grand pas),
 * Début : retour à 0. Double-clic : remise à zéro.
 */

function createWbPad(options) {
  const { min, max, step, bigStep = step * 5, onChange, onReset } = options;
  let x = 0;
  let y = 0;

  const el = document.createElement("div");
  el.className = "wb-pad";
  if (options.id) el.id = options.id;

  const area = document.createElement("div");
  area.className = "wb-pad-area";
  // Couleurs des quatre bords : gauche, droite (axe X), haut, bas (axe Y).
  const [left, right, top, bottom] = options.colors;
  area.style.setProperty("--pad-left", left);
  area.style.setProperty("--pad-right", right);
  area.style.setProperty("--pad-top", top);
  area.style.setProperty("--pad-bottom", bottom);
  // Nombre de crans par axe (19 pour −9…+9) : la trame de points suit les crans quand ils sont peu nombreux.
  const steps = Math.round((max - min) / step);
  if (steps <= 24) area.style.setProperty("--pad-cells", String(steps + 1));
  else area.classList.add("wb-pad-fine");

  const thumb = document.createElement("div");
  thumb.className = "wb-pad-thumb";
  thumb.tabIndex = 0;
  thumb.setAttribute("role", "slider");
  thumb.setAttribute("aria-label", options.label);
  thumb.setAttribute("aria-valuemin", String(min));
  thumb.setAttribute("aria-valuemax", String(max));
  area.append(thumb);

  ["top", "bottom", "left", "right"].forEach((side) => {
    const tag = document.createElement("span");
    tag.className = `wb-pad-tag wb-pad-tag-${side}`;
    tag.textContent = options.tags[side];
    tag.setAttribute("aria-hidden", "true");
    area.append(tag);
  });

  const readout = document.createElement("div");
  readout.className = "wb-pad-readout";
  const makeValue = (axis) => {
    const box = document.createElement("div");
    const name = document.createElement("span");
    name.className = "wb-pad-name";
    name.textContent = axis.label;
    const value = document.createElement("strong");
    value.className = "wb-pad-value";
    box.append(name, value);
    readout.append(box);
    return value;
  };
  const xValue = makeValue(options.x);
  const yValue = makeValue(options.y);
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "wb-pad-reset";
  reset.textContent = "Réinitialiser";
  readout.append(reset);
  el.append(area, readout);

  const clamp = (v) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const signed = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");

  function render() {
    const fx = (x - min) / (max - min);
    const fy = (max - y) / (max - min); // haut = valeur positive
    thumb.style.left = `${fx * 100}%`;
    thumb.style.top = `${fy * 100}%`;
    xValue.textContent = signed(x);
    yValue.textContent = signed(y);
    xValue.classList.toggle("is-set", x !== 0);
    yValue.classList.toggle("is-set", y !== 0);
    reset.disabled = x === 0 && y === 0;
    thumb.setAttribute("aria-valuenow", String(x));
    thumb.setAttribute("aria-valuetext", `${options.x.label} ${signed(x)}, ${options.y.label} ${signed(y)}`);
  }

  function update(nx, ny) {
    nx = clamp(nx);
    ny = clamp(ny);
    if (nx === x && ny === y) return;
    x = nx;
    y = ny;
    render();
    onChange(x, y);
  }

  // Position de la grille relevée au début du geste : si le panneau se décale pendant le glissement
  // (une ligne « modifiée » qui apparaît au-dessus), le point continue de suivre le doigt.
  let dragRect = null;
  function fromPointer(event) {
    const rect = dragRect || area.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    update(min + fx * (max - min), max - fy * (max - min));
  }

  let dragId = null;
  area.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragId = event.pointerId;
    dragRect = area.getBoundingClientRect();
    area.setPointerCapture(event.pointerId);
    area.classList.add("is-dragging");
    thumb.focus({ preventScroll: true });
    fromPointer(event);
  });
  area.addEventListener("pointermove", (event) => {
    if (event.pointerId === dragId) fromPointer(event);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
    area.addEventListener(type, () => {
      dragId = null;
      dragRect = null;
      area.classList.remove("is-dragging");
    });
  });

  thumb.addEventListener("keydown", (event) => {
    const d = event.shiftKey ? bigStep : step;
    const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (moves[event.key]) {
      event.preventDefault();
      event.stopPropagation(); // pas de changement de look avec ← →
      update(x + moves[event.key][0], y + moves[event.key][1]);
    } else if (event.key === "Home") {
      event.preventDefault();
      onReset();
    }
  });

  area.addEventListener("dblclick", () => onReset());
  reset.addEventListener("click", () => onReset());

  render();
  return {
    el,
    set(nx, ny) {
      x = clamp(Number(nx) || 0);
      y = clamp(Number(ny) || 0);
      render();
    }
  };
}
