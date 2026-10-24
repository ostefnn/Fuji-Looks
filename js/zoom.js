/* Fuji Looks — Zoom et déplacement de l'aperçu. */
// --- Zoom et déplacement de l'aperçu -------------------------------------

function fitScale() {
  const rect = photoFrame.getBoundingClientRect();
  return Math.min(rect.width / photoPreview.width, rect.height / photoPreview.height) || 1;
}

// Empêche de faire sortir la photo du cadre en la déplaçant.
function clampPan() {
  const rect = photoFrame.getBoundingClientRect();
  const scale = fitScale() * view.zoom;
  const maxX = Math.max(0, (photoPreview.width * scale - rect.width) / 2);
  const maxY = Math.max(0, (photoPreview.height * scale - rect.height) / 2);
  view.x = Math.min(maxX, Math.max(-maxX, view.x));
  view.y = Math.min(maxY, Math.max(-maxY, view.y));
}

function applyView() {
  if (!previewSource) return;
  clampPan();
  const scale = fitScale() * view.zoom;
  photoPreview.style.width = `${photoPreview.width * scale}px`;
  photoPreview.style.height = `${photoPreview.height * scale}px`;
  photoPreview.style.transform = `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`;

  const zoomed = view.zoom > ZOOM_MIN + 0.001;
  photoFrame.classList.toggle("zoomed", zoomed);
  zoomFitButton.textContent = zoomed ? `${Math.round(view.zoom * 100)}%` : "Ajusté";
  zoomOutButton.disabled = !zoomed;
  zoomInButton.disabled = view.zoom >= ZOOM_MAX - 0.001;
}

// Zoome en gardant fixe le point (cx, cy), exprimé par rapport au centre du cadre.
function zoomTo(zoom, cx = 0, cy = 0) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const k = next / view.zoom;
  view.x = cx - (cx - view.x) * k;
  view.y = cy - (cy - view.y) * k;
  view.zoom = next;
  applyView();
}

function resetZoom() {
  view.zoom = 1;
  view.x = 0;
  view.y = 0;
  applyView();
}

function framePoint(clientX, clientY) {
  const rect = photoFrame.getBoundingClientRect();
  return [clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2];
}

zoomInButton.addEventListener("click", () => zoomTo(view.zoom * ZOOM_STEP));
zoomOutButton.addEventListener("click", () => zoomTo(view.zoom / ZOOM_STEP));
zoomFitButton.addEventListener("click", resetZoom);

// Ctrl / Cmd + molette, ou pincement sur trackpad.
photoFrame.addEventListener("wheel", (event) => {
  if (!previewSource || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  zoomTo(view.zoom * Math.exp(-event.deltaY * 0.01), ...framePoint(event.clientX, event.clientY));
}, { passive: false });

// Double-clic / double-tap : bascule entre « ajusté » et 250 %.
function toggleZoomAt(clientX, clientY) {
  if (view.zoom > ZOOM_MIN + 0.001) resetZoom();
  else zoomTo(2.5, ...framePoint(clientX, clientY));
}

photoPreview.addEventListener("dblclick", (event) => toggleZoomAt(event.clientX, event.clientY));

// Le double-tap tactile est détecté à la main (pas de dblclick fiable avec touch-action: none).
let lastTap = null;
function handleTap(event) {
  if (event.pointerType !== "touch") return;
  const now = performance.now();
  if (lastTap && now - lastTap.time < 300 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
    lastTap = null;
    toggleZoomAt(event.clientX, event.clientY);
  } else {
    lastTap = { time: now, x: event.clientX, y: event.clientY };
  }
}

// Déplacement à un doigt / à la souris, pincement à deux doigts.
const pointers = new Map();
let gesture = null;

function startGesture() {
  const pts = [...pointers.values()];
  if (pts.length === 1) {
    gesture = { type: "pan", x: pts[0].x, y: pts[0].y, viewX: view.x, viewY: view.y };
  } else if (pts.length === 2) {
    const [a, b] = pts;
    gesture = {
      type: "pinch",
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: view.zoom,
      center: framePoint((a.x + b.x) / 2, (a.y + b.y) / 2),
      viewX: view.x,
      viewY: view.y
    };
  } else {
    gesture = null;
  }
}

photoPreview.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  try {
    photoPreview.setPointerCapture(event.pointerId);
  } catch {
    // Capture indisponible : le geste fonctionne quand même tant que le doigt reste sur l'image.
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
  startGesture();
});

photoPreview.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId) || !gesture) return;
  Object.assign(pointers.get(event.pointerId), { x: event.clientX, y: event.clientY });
  const pts = [...pointers.values()];

  if (gesture.type === "pan" && view.zoom > ZOOM_MIN + 0.001) {
    photoFrame.classList.add("panning");
    view.x = gesture.viewX + pts[0].x - gesture.x;
    view.y = gesture.viewY + pts[0].y - gesture.y;
    applyView();
  } else if (gesture.type === "pinch" && pts.length === 2) {
    const [a, b] = pts;
    const [cx, cy] = gesture.center;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist));
    const k = next / gesture.zoom;
    view.x = cx - (cx - gesture.viewX) * k;
    view.y = cy - (cy - gesture.viewY) * k;
    view.zoom = next;
    applyView();
  }
});

["pointerup", "pointercancel"].forEach((type) => {
  photoPreview.addEventListener(type, (event) => {
    const start = pointers.get(event.pointerId);
    if (type === "pointerup" && start && pointers.size === 1 &&
        Math.hypot(event.clientX - start.startX, event.clientY - start.startY) < 10) {
      handleTap(event);
    }
    pointers.delete(event.pointerId);
    photoFrame.classList.remove("panning");
    startGesture();
  });
});

// Le cadre change de taille (rotation, redimensionnement) : on recalcule l'ajustement.
new ResizeObserver(applyView).observe(photoFrame);

compareButton.addEventListener("click", (event) => {
  // event.detail vaut 0 pour une activation clavier (Entrée / Espace).
  if (event.detail === 0) setComparing(!comparing);
});
