/* Fuji Looks — Histogramme de l'aperçu (après recette et retouche, sans le cadre). */

const HISTO_KEY = "fuji-looks.histogram";
const HISTO_W = 256;
const HISTO_H = 90;
// Au-delà de cette part de pixels à 0 ou 255, le témoin d'écrêtage s'allume.
const CLIP_WARN = 0.005;

const histogramToggle = document.getElementById("histogramToggle");
const histogramPanel = document.getElementById("histogramPanel");
const histogramCanvas = document.getElementById("histogramCanvas");
const clipShadows = document.getElementById("clipShadows");
const clipHighlights = document.getElementById("clipHighlights");

let histogramOn = load(HISTO_KEY) === true;

// Compte les niveaux R, V, B et la luminance sur ~60 000 pixels au plus (rapide, même en glissant un curseur).
function computeHistogram(image) {
  const { data, width, height } = image;
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const l = new Uint32Array(256);
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 60000)));
  let total = 0;
  let lowClip = 0;
  let highClip = 0;
  for (let y = 0; y < height; y += step) {
    let i = y * width * 4;
    for (let x = 0; x < width; x += step, i += step * 4) {
      const R = data[i];
      const G = data[i + 1];
      const B = data[i + 2];
      r[R]++;
      g[G]++;
      b[B]++;
      l[Math.round(0.2126 * R + 0.7152 * G + 0.0722 * B)]++;
      // Bouché : les trois couches à 0 ; brûlé : au moins une couche à 255.
      if (R <= 1 && G <= 1 && B <= 1) lowClip++;
      if (R >= 254 || G >= 254 || B >= 254) highClip++;
      total++;
    }
  }
  return { r, g, b, l, total, low: lowClip / total, high: highClip / total };
}

function drawHistogram(h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (histogramCanvas.width !== HISTO_W * dpr) {
    histogramCanvas.width = HISTO_W * dpr;
    histogramCanvas.height = HISTO_H * dpr;
  }
  const ctx = histogramCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, HISTO_W, HISTO_H);

  // Courbes lissées et échelle en racine carrée : les pics isolés n’écrasent plus le reste.
  // Les extrêmes (souvent un pic à 0 ou 255) sont ignorés pour l'échelle ; l'écrêtage est chiffré dessous.
  const smooth = (bins) => {
    const out = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      let sum = 0;
      let weight = 0;
      for (let k = -2; k <= 2; k++) {
        const j = i + k;
        if (j < 0 || j > 255) continue;
        const w = 3 - Math.abs(k);
        sum += bins[j] * w;
        weight += w;
      }
      out[i] = sum / weight;
    }
    return out;
  };
  const r = smooth(h.r);
  const g = smooth(h.g);
  const b = smooth(h.b);
  const l = smooth(h.l);
  let max = 1;
  for (let i = 2; i < 254; i++) max = Math.max(max, r[i], g[i], b[i], l[i]);
  const yOf = (count) => HISTO_H - Math.min(1, Math.sqrt(count / max)) * (HISTO_H - 2);

  // Repères : ombres, quarts de ton, hautes lumières.
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 1;
  [64, 128, 192].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, HISTO_H);
    ctx.stroke();
  });

  const area = (bins, color) => {
    ctx.beginPath();
    ctx.moveTo(0, HISTO_H);
    for (let i = 0; i < 256; i++) ctx.lineTo(i, yOf(bins[i]));
    ctx.lineTo(255, HISTO_H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  // Couches en mode « écran » : là où elles se superposent, le gris tend vers le blanc.
  ctx.globalCompositeOperation = "screen";
  area(r, "rgba(255,70,70,.75)");
  area(g, "rgba(70,215,105,.75)");
  area(b, "rgba(80,135,255,.8)");
  ctx.globalCompositeOperation = "source-over";
  area(l, "rgba(240,240,240,.18)");

  const percent = (v) => (v >= 0.1 ? Math.round(v * 100) : (v * 100).toFixed(1).replace(".", ","));
  clipShadows.textContent = `◀ ${percent(h.low)} %`;
  clipHighlights.textContent = `${percent(h.high)} % ▶`;
  clipShadows.classList.toggle("is-clipped", h.low > CLIP_WARN);
  clipHighlights.classList.toggle("is-clipped", h.high > CLIP_WARN);
  clipShadows.title = `Ombres bouchées : ${percent(h.low)} % des pixels`;
  clipHighlights.title = `Hautes lumières brûlées : ${percent(h.high)} % des pixels`;
}

// Appelée par updatePreview avec l'image rendue.
function updateHistogram(image) {
  if (!histogramOn || !image) return;
  drawHistogram(computeHistogram(image));
}

function setHistogram(on) {
  histogramOn = on;
  store(HISTO_KEY, on);
  histogramPanel.hidden = !on;
  histogramToggle.setAttribute("aria-pressed", String(on));
  if (on) schedulePreview();
}

histogramToggle.addEventListener("click", (event) => {
  event.stopPropagation(); // pas de déplacement de la photo
  setHistogram(!histogramOn);
});
histogramToggle.addEventListener("pointerdown", (event) => event.stopPropagation());
histogramPanel.addEventListener("pointerdown", (event) => event.stopPropagation());
histogramPanel.hidden = !histogramOn;
histogramToggle.setAttribute("aria-pressed", String(histogramOn));
