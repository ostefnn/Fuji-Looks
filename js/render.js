/* Fuji Looks — Rendu : recette -> LUT 3D -> pixels (même pipeline que Fuji Recipe Converter). */
// --- Moteur de rendu -----------------------------------------------------

function getStrength() {
  return Number(intensity.value) / 100;
}

function activeRecipe() {
  return applied ? recipe : null;
}

function drawToImageData(drawable, srcW, srcH, maxSide, maxPixels) {
  let k = Math.min(1, maxSide / Math.max(srcW, srcH));
  if (maxPixels) k = Math.min(k, Math.sqrt(maxPixels / (srcW * srcH)));
  const w = Math.max(1, Math.round(srcW * k));
  const h = Math.max(1, Math.round(srcH * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(drawable, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// Scène d'exemple du convertisseur (paysage, patchs de couleur, rampe de gris), dessinée en code.
function drawSampleScene() {
  var c = document.createElement("canvas"), w = 900, h = 600, x = c.getContext("2d"), g, i;
  c.width = w; c.height = h;
  g = x.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, "#2f6fc0"); g.addColorStop(0.6, "#9cc4e8"); g.addColorStop(1, "#f3dcc0");
  x.fillStyle = g; x.fillRect(0, 0, w, 380);
  g = x.createRadialGradient(660, 250, 0, 660, 250, 220);
  g.addColorStop(0, "rgba(255,244,214,1)"); g.addColorStop(0.12, "rgba(255,226,170,.9)"); g.addColorStop(1, "rgba(255,210,150,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, 380);
  x.fillStyle = "rgba(255,255,255,.85)";
  [[170, 110, 60], [230, 95, 45], [280, 118, 50], [480, 70, 36], [525, 80, 30]].forEach(function (p) {
    x.beginPath(); x.ellipse(p[0], p[1], p[2], p[2] * 0.42, 0, 0, 6.3); x.fill();
  });
  function ridge(y, amp, color, seed) {
    x.fillStyle = color; x.beginPath(); x.moveTo(0, h);
    for (i = 0; i <= w; i += 10) x.lineTo(i, y + Math.sin(i * 0.008 + seed) * amp + Math.sin(i * 0.021 + seed * 2) * amp * 0.4);
    x.lineTo(w, h); x.fill();
  }
  ridge(300, 34, "#6f8fb4", 1); ridge(335, 26, "#4f7f73", 2.2); ridge(372, 20, "#3f8a3a", 4); ridge(420, 14, "#7fa83a", 5.5);
  g = x.createLinearGradient(0, 430, 0, 520);
  g.addColorStop(0, "#d9b24a"); g.addColorStop(1, "#9a6a2a");
  x.fillStyle = g; x.fillRect(0, 445, w, 80);
  x.fillStyle = "#b3261e"; x.fillRect(120, 392, 86, 58);
  x.fillStyle = "#5b1a14"; x.beginPath(); x.moveTo(110, 394); x.lineTo(163, 356); x.lineTo(216, 394); x.fill();
  x.fillStyle = "#f4ead8"; x.fillRect(152, 415, 22, 35);
  x.fillStyle = "#1f3d2a"; [[330, 60], [372, 84], [760, 70], [800, 52]].forEach(function (t) {
    x.beginPath(); x.moveTo(t[0], 452); x.lineTo(t[0] + 18, 452 - t[1]); x.lineTo(t[0] + 36, 452); x.fill();
  });
  var patches = ["#735244", "#c29682", "#627a9d", "#576c43", "#8580b1", "#67bdaa", "#d67e2c", "#505ba6", "#c15a63",
                 "#5e3c6c", "#9dbc40", "#e0a32e", "#383d96", "#469449", "#af363c", "#e7c71f", "#bb5695", "#0885a1"];
  patches.forEach(function (p, j) { x.fillStyle = p; x.fillRect(j * 50, 525, 50, 45); });
  g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#000"); g.addColorStop(1, "#fff");
  x.fillStyle = g; x.fillRect(0, 570, w, 30);
  return c;
}
