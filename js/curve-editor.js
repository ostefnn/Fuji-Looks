/* Fuji Looks — Éditeur de courbe de tons : des points à déplacer sur un carré, comme dans Lightroom
 * ou NX Studio. Utilisé par la retouche (courbes RVB, R, V, B) et par les Picture Controls Nikon.
 *
 *   createCurveEditor({ id, label, channels, onChange(points, channel), onReset(channel) })
 *   editor.el : élément à insérer ; editor.set(curves) : affiche { rgb, r, g, b } (ou une liste de
 *   points pour une seule courbe) sans rappeler onChange.
 *
 * Souris / doigt : glisser un point ; toucher ailleurs ajoute un point ; double-clic sur un point le
 * retire. Clavier (point sélectionné) : flèches (Maj : pas de 10), Suppr retire, Tab passe au suivant.
 */

const CURVE_CHANNEL_INFO = {
  rgb: { label: "RVB", color: "var(--text)" },
  r: { label: "R", color: "#e5484d" },
  g: { label: "V", color: "#30a46c" },
  b: { label: "B", color: "#3e7bfa" }
};

function createCurveEditor(options) {
  const { onChange, onReset } = options;
  const channels = options.channels || ["rgb"];
  const svgNs = "http://www.w3.org/2000/svg";
  let curves = {};
  let channel = channels[0];
  let active = -1; // index du point sélectionné

  const el = document.createElement("div");
  el.className = "curve-editor";
  if (options.id) el.id = options.id;

  // Couches (RVB, R, V, B), seulement s'il y en a plusieurs.
  const tabs = document.createElement("div");
  tabs.className = "curve-channels";
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Couche de la courbe");
  tabs.hidden = channels.length < 2;
  const tabButtons = channels.map((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip curve-channel";
    button.dataset.channel = key;
    button.style.setProperty("--curve-color", CURVE_CHANNEL_INFO[key].color);
    button.textContent = CURVE_CHANNEL_INFO[key].label;
    button.addEventListener("click", () => {
      channel = key;
      active = -1;
      render();
    });
    tabs.append(button);
    return button;
  });

  const area = document.createElement("div");
  area.className = "curve-area";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 256 256");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const grid = document.createElementNS(svgNs, "path");
  grid.setAttribute("class", "curve-grid");
  grid.setAttribute("d", "M64 0V256M128 0V256M192 0V256M0 64H256M0 128H256M0 192H256");
  const diagonal = document.createElementNS(svgNs, "path");
  diagonal.setAttribute("class", "curve-diagonal");
  diagonal.setAttribute("d", "M0 256L256 0");
  const ghosts = document.createElementNS(svgNs, "g");
  ghosts.setAttribute("class", "curve-ghosts");
  const line = document.createElementNS(svgNs, "path");
  line.setAttribute("class", "curve-line");
  svg.append(grid, diagonal, ghosts, line);
  const handles = document.createElement("div");
  handles.className = "curve-handles";
  area.append(svg, handles);

  const readout = document.createElement("div");
  readout.className = "curve-readout";
  const value = document.createElement("span");
  value.className = "curve-value";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "wb-pad-reset";
  reset.textContent = "Réinitialiser";
  readout.append(value, reset);
  el.append(tabs, area, readout);

  const pointsOf = (key) => (curves[key] && curves[key].length >= 2 ? curves[key] : CURVE_DEFAULT);
  const pathOf = (points) => {
    const t = curveTable(points, 129);
    let d = "";
    for (let i = 0; i < t.length; i++) d += `${i ? "L" : "M"}${((i * 256) / 128).toFixed(1)} ${(256 - t[i] * 256).toFixed(1)}`;
    return d;
  };

  function render() {
    const points = pointsOf(channel);
    tabButtons.forEach((button) => {
      const key = button.dataset.channel;
      button.setAttribute("aria-pressed", String(key === channel));
      button.classList.toggle("is-set", !curveIsIdentity(curves[key]));
    });
    line.setAttribute("d", pathOf(points));
    line.style.stroke = CURVE_CHANNEL_INFO[channel].color;
    // Les autres couches modifiées restent visibles en fond.
    ghosts.textContent = "";
    channels.filter((key) => key !== channel && !curveIsIdentity(curves[key])).forEach((key) => {
      const ghost = document.createElementNS(svgNs, "path");
      ghost.setAttribute("d", pathOf(pointsOf(key)));
      ghost.style.stroke = CURVE_CHANNEL_INFO[key].color;
      ghosts.append(ghost);
    });
    if (active >= points.length) active = -1;
    handles.textContent = "";
    points.forEach(([x, y], i) => {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "curve-point";
      handle.dataset.index = String(i);
      handle.style.left = `${(x / 255) * 100}%`;
      handle.style.top = `${100 - (y / 255) * 100}%`;
      handle.setAttribute("aria-label", `${options.label}, point ${i + 1} : entrée ${x}, sortie ${y}`);
      handle.classList.toggle("is-active", i === active);
      handle.addEventListener("focus", () => {
        if (active === i) return;
        active = i;
        updateReadout();
        handles.querySelectorAll(".curve-point").forEach((h, k) => h.classList.toggle("is-active", k === i));
      });
      handles.append(handle);
    });
    updateReadout();
    reset.disabled = curveIsIdentity(curves[channel]);
  }

  function updateReadout() {
    const points = pointsOf(channel);
    value.textContent = active >= 0
      ? `Entrée ${points[active][0]} → sortie ${points[active][1]}`
      : "Touche la courbe pour ajouter un point.";
  }

  // Nouvelle liste de points pour la couche en cours (gardée triée) ; `index` est le point déplacé.
  function emit(points, focusIndex = active) {
    curves = { ...curves, [channel]: points };
    active = focusIndex;
    render();
    onChange(points, channel);
    const handle = handles.querySelector(`[data-index="${focusIndex}"]`);
    if (handle && document.activeElement !== handle && dragId !== null) handle.focus({ preventScroll: true });
  }

  // Déplace le point `i` en (x, y) : il reste entre ses voisins (une entrée ne peut pas avoir deux sorties).
  function movePoint(i, x, y) {
    const points = pointsOf(channel).map((p) => p.slice());
    const lo = i > 0 ? points[i - 1][0] + 1 : 0;
    const hi = i < points.length - 1 ? points[i + 1][0] - 1 : 255;
    const nx = Math.round(Math.max(lo, Math.min(hi, x)));
    const ny = Math.round(Math.max(0, Math.min(255, y)));
    if (points[i][0] === nx && points[i][1] === ny) return;
    points[i] = [nx, ny];
    emit(points, i);
  }

  function removePoint(i) {
    const points = pointsOf(channel);
    if (i <= 0 || i >= points.length - 1) return; // les extrémités restent
    emit(points.filter((_, k) => k !== i), -1);
  }

  let dragRect = null;
  let dragId = null;
  let dragIndex = -1;
  const toCurve = (event) => {
    const rect = dragRect || area.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 255,
      (1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))) * 255
    ];
  };

  area.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragRect = area.getBoundingClientRect();
    const [x, y] = toCurve(event);
    const points = pointsOf(channel);
    // Point le plus proche à moins de 12 px : on le prend ; sinon on en ajoute un.
    const tolerance = (12 / dragRect.width) * 255;
    let best = -1;
    let bestDist = Infinity;
    points.forEach(([px, py], i) => {
      const dist = Math.hypot(px - x, py - y);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    dragId = event.pointerId;
    area.setPointerCapture(event.pointerId);
    area.classList.add("is-dragging");
    if (bestDist <= tolerance) {
      dragIndex = best;
      active = best;
      render();
      handles.querySelector(`[data-index="${best}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (points.length >= CURVE_MAX_POINTS) {
      dragIndex = -1;
      return;
    }
    const nx = Math.round(x);
    if (points.some(([px]) => px === nx)) {
      dragIndex = -1;
      return;
    }
    const next = [...points.map((p) => p.slice()), [nx, Math.round(y)]].sort((a, b) => a[0] - b[0]);
    dragIndex = next.findIndex(([px]) => px === nx);
    emit(next, dragIndex);
  });
  area.addEventListener("pointermove", (event) => {
    if (event.pointerId !== dragId || dragIndex < 0) return;
    const [x, y] = toCurve(event);
    movePoint(dragIndex, x, y);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
    area.addEventListener(type, () => {
      dragId = null;
      dragRect = null;
      dragIndex = -1;
      area.classList.remove("is-dragging");
    });
  });

  area.addEventListener("dblclick", (event) => {
    const handle = event.target.closest(".curve-point");
    if (handle) removePoint(Number(handle.dataset.index));
    else onReset(channel);
  });

  handles.addEventListener("keydown", (event) => {
    const handle = event.target.closest(".curve-point");
    if (!handle) return;
    const i = Number(handle.dataset.index);
    const [x, y] = pointsOf(channel)[i];
    const d = event.shiftKey ? 10 : 1;
    const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (moves[event.key]) {
      event.preventDefault();
      event.stopPropagation(); // pas de changement de look avec ← →
      movePoint(i, x + moves[event.key][0], y + moves[event.key][1]);
      handles.querySelector(`[data-index="${i}"]`)?.focus();
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removePoint(i);
    }
  });

  reset.addEventListener("click", () => onReset(channel));

  render();
  return {
    el,
    set(next) {
      curves = Array.isArray(next) ? { [channels[0]]: next } : { ...(next || {}) };
      render();
    }
  };
}
