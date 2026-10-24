/* Fuji Looks — Cadre façon tirage avec les infos de la recette. */
// --- Cadre façon tirage ---------------------------------------------------------

// Styles de cadre. Marges en fraction du grand côté de la photo.
const FRAME_STYLES = {
  white: { bg: "#f5f3ee", text: "#1c1c1c", muted: "#6f6c66", side: 0.035, top: 0.035, bottom: 0.035 },
  cream: { bg: "#ece2cc", text: "#3b3127", muted: "#86775f", side: 0.035, top: 0.035, bottom: 0.035 },
  black: { bg: "#111214", text: "#f1f0ec", muted: "#9b9a96", side: 0.035, top: 0.035, bottom: 0.035 },
  thin: { bg: "#ffffff", text: "#1c1c1c", muted: "#6f6c66", side: 0.012, top: 0.012, bottom: 0.012 },
  polaroid: { bg: "#fbfaf6", text: "#2a2a2a", muted: "#77746d", side: 0.05, top: 0.05, bottom: 0.2, center: true },
  film: { bg: "#0e0d0c", text: "#efe9dc", muted: "#9b958a", side: 0.02, top: 0, bottom: 0, film: true }
};
const FRAME_INFO_KEY = "fuji-looks.frame-info";

let frameStyle = FRAME_STYLES[load(FRAME_KEY)] ? load(FRAME_KEY) : "none";
// Infos affichées : full (nom + simulation + réglages), name (nom + simulation) ou none.
let frameInfo = ["full", "name", "none"].includes(load(FRAME_INFO_KEY)) ? load(FRAME_INFO_KEY) : "full";

function signedValue(v, decimals = 0) {
  const n = Number(v);
  const text = decimals ? n.toFixed(decimals).replace(/\.0$/, "") : String(Math.round(n));
  return n > 0 ? `+${text}` : n < 0 ? `−${text.slice(1)}` : "0";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Réglages de la recette, avec les noms des menus Fujifilm.
function frameTokens(r) {
  const wbName = r.whiteBalance === "kelvin" ? `${r.kelvin}K` : FR.wbById(r.whiteBalance).name;
  const tokens = [
    FR.formatValue(FR.fieldByKey("dynamicRange"), r),
    `WB ${wbName} ${signedValue(r.wbShiftRed)}R ${signedValue(r.wbShiftBlue)}B`,
    r.grainEffect === "off" ? "Grain Off" : `Grain ${capitalize(r.grainEffect)} ${capitalize(r.grainSize)}`,
    `Color Chrome ${capitalize(r.colorChromeEffect)}`,
    `FX Blue ${capitalize(r.colorChromeFxBlue)}`
  ];
  if (FR.simById(r.filmSim).mono) tokens.push(`Mono WC ${signedValue(r.monoWC)} MG ${signedValue(r.monoMG)}`);
  else tokens.push(`Color ${signedValue(r.color)}`);
  tokens.push(
    `Highlight ${signedValue(r.highlight, 1)}`,
    `Shadow ${signedValue(r.shadow, 1)}`,
    `Sharpness ${signedValue(r.sharpness)}`,
    `NR ${signedValue(r.noiseReduction)}`,
    `Clarity ${signedValue(r.clarity)}`
  );
  return tokens;
}

function wrapTokens(ctx, tokens, maxWidth) {
  const lines = [];
  let line = "";
  tokens.forEach((token) => {
    const next = line ? `${line}  ·  ${token}` : token;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

const FRAME_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Perforations et marquages en bordure, façon pellicule 35 mm.
function drawFilmStrip(ctx, x, y, width, height, holesOnTop, edgeLeft, edgeRight) {
  const holeW = Math.round(height * 0.3);
  const holeH = Math.round(height * 0.36);
  const step = Math.round(height * 0.62);
  const holeY = holesOnTop ? y + Math.round(height * 0.12) : y + height - Math.round(height * 0.12) - holeH;
  ctx.fillStyle = "#d8d2c4";
  for (let hx = x + Math.round(step / 3); hx + holeW < x + width; hx += step) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(hx, holeY, holeW, holeH, Math.round(holeW * 0.22));
      ctx.fill();
    } else {
      ctx.fillRect(hx, holeY, holeW, holeH); // anciens navigateurs
    }
  }
  if (edgeLeft || edgeRight) {
    const size = Math.round(height * 0.2);
    const textY = holesOnTop ? y + height - Math.round(height * 0.16) : y + Math.round(height * 0.16) + size;
    ctx.fillStyle = "#e39b3a";
    ctx.font = `600 ${size}px ${FRAME_FONT}`;
    ctx.textAlign = "left";
    if (edgeLeft) ctx.fillText(edgeLeft, x + Math.round(height * 0.3), textY, width * 0.7);
    ctx.textAlign = "right";
    if (edgeRight) ctx.fillText(edgeRight, x + width - Math.round(height * 0.3), textY, width * 0.25);
    ctx.textAlign = "left";
  }
}

// Bordure façon tirage, avec selon l'option le nom de la recette, la simulation et les réglages.
// Toutes les tailles sont proportionnelles à la photo : l'aperçu et l'export sont identiques.
function composeFrame(imageData, style, frameRecipe, info = frameInfo) {
  const cfg = FRAME_STYLES[style];
  const W = imageData.width;
  const H = imageData.height;
  const long = Math.max(W, H);
  const side = Math.round(long * cfg.side);
  const strip = cfg.film ? Math.round(long * 0.085) : 0;
  const top = cfg.film ? strip : Math.round(long * cfg.top);
  const pad = Math.round(long * 0.035);
  const titleSize = Math.max(10, Math.round(long * (cfg.center ? 0.03 : 0.024)));
  const textSize = Math.max(8, Math.round(long * 0.0145));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Sur la pellicule, le nom et la simulation sont imprimés en bordure ; le cartouche ne sert qu'aux réglages.
  const showTitle = Boolean(frameRecipe) && info !== "none" && !cfg.film;
  let lines = [];
  if (frameRecipe && info === "full") {
    ctx.font = `${textSize}px ${FRAME_FONT}`;
    lines = wrapTokens(ctx, frameTokens(frameRecipe), W);
    if (frameRecipe.author) lines.push(`Recette : ${frameRecipe.author}`);
  }
  const content = (showTitle ? titleSize * 1.25 : 0) + (showTitle && lines.length ? titleSize * 0.25 : 0) + lines.length * textSize * 1.55;
  const band = content ? Math.round(pad * 0.9 * 2 + content) : 0;
  const bottomBorder = cfg.film ? strip : Math.round(long * cfg.bottom);
  const bottom = cfg.film ? strip + band : Math.max(bottomBorder, band);

  canvas.width = W + side * 2;
  canvas.height = top + H + bottom;
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const photo = document.createElement("canvas");
  photo.width = W;
  photo.height = H;
  photo.getContext("2d").putImageData(imageData, 0, 0);
  ctx.drawImage(photo, side, top);
  ctx.textBaseline = "alphabetic";

  if (cfg.film) {
    const sim = frameRecipe ? FR.simById(frameRecipe.filmSim).name.toUpperCase() : "";
    const edge = frameRecipe && info !== "none" ? `${frameRecipe.name || "Recette"}  ▸  ${sim}` : "";
    drawFilmStrip(ctx, 0, 0, canvas.width, strip, true, edge, "▸ 24");
    drawFilmStrip(ctx, 0, top + H, canvas.width, strip, false, "", "24A");
  }

  if (content) {
    const bandTop = cfg.film ? top + H + strip : top + H;
    const bandHeight = cfg.film ? band : bottom;
    // Cartouche centré verticalement dans la bordure du bas (utile pour le Polaroid).
    let y = Math.round(bandTop + (bandHeight - content) / 2);
    if (showTitle) {
      y += titleSize;
      ctx.fillStyle = cfg.text;
      ctx.font = `600 ${titleSize}px ${FRAME_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(frameRecipe.name || "Recette", side, y, W * 0.62);
      ctx.fillStyle = cfg.muted;
      ctx.font = `500 ${Math.round(titleSize * 0.8)}px ${FRAME_FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(FR.simById(frameRecipe.filmSim).name.toUpperCase(), side + W, y, W * 0.36);
      y += Math.round(titleSize * 0.25);
    }
    ctx.textAlign = "left";
    ctx.font = `${textSize}px ${FRAME_FONT}`;
    lines.forEach((line, i) => {
      y += Math.round(textSize * 1.55);
      ctx.fillStyle = frameRecipe.author && i === lines.length - 1 ? cfg.muted : cfg.text;
      ctx.fillText(line, side, y);
    });
  }
  return canvas;
}

function updateFrameOptions() {
  frameOptions.querySelectorAll("[data-frame]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.frame === frameStyle));
  });
  frameInfoOptions.querySelectorAll("[data-info]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.info === frameInfo));
  });
  frameInfoRow.hidden = frameStyle === "none";
}

frameOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-frame]");
  if (!button) return;
  frameStyle = button.dataset.frame;
  store(FRAME_KEY, frameStyle);
  updateFrameOptions();
  schedulePreview();
  if (!originalImage && frameStyle !== "none") showStatus("Importe une photo pour voir le cadre.");
});

frameInfoOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-info]");
  if (!button) return;
  frameInfo = button.dataset.info;
  store(FRAME_INFO_KEY, frameInfo);
  updateFrameOptions();
  schedulePreview();
});
