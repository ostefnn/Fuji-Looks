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

const frameMeta = document.getElementById("frameMeta");
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
const SERIF_FONT = 'Georgia, "Times New Roman", serif';
const SCRIPT_FONT = '"Fuji Looks Script", "Snell Roundhand", "Apple Chancery", cursive';

// La police manuscrite est chargée à la demande ; on redessine l'aperçu une fois prête.
function loadScriptFont() {
  if (!document.fonts || signatureStyle !== "script") return Promise.resolve();
  return document.fonts.load('48px "Fuji Looks Script"', signatureName || "Signature").catch(() => {});
}

// --- Signature (logo personnel) ---------------------------------------------

const SIGNATURE_KEY = "fuji-looks.signature";
const savedSignature = load(SIGNATURE_KEY) || {};
let signatureName = typeof savedSignature.name === "string" ? savedSignature.name.slice(0, 32) : "";
let signatureStyle = ["logo", "monogram", "script"].includes(savedSignature.style) ? savedSignature.style : "monogram";
// Taille relative au grand côté de la photo : [sous les infos, seule dans le cadre].
// Volontairement discrète : la signature ne doit pas concurrencer la photo.
const SIGNATURE_SIZES = { small: [0.017, 0.021], medium: [0.023, 0.028], large: [0.03, 0.037] };
let signatureSize = SIGNATURE_SIZES[savedSignature.size] ? savedSignature.size : "small";

// « Olivier Steffen » → « OS », « ostefnn » → « O ».
function signatureInitials(name) {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [words[0] ? words[0][0] : ""];
  return letters.join("").toUpperCase();
}

// Texte espacé lettre par lettre (capitales façon logo).
function spacedWidth(ctx, text, spacing) {
  return [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, 0) - spacing;
}

function drawSpaced(ctx, text, x, y, spacing) {
  let cx = x;
  [...text].forEach((ch) => {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Largeur de la signature pour une hauteur donnée (pour l'aligner à droite ou la centrer).
function measureSignature(ctx, size) {
  return drawSignature(ctx, 0, 0, size, null, true);
}

/*
 * Dessine la signature à partir de (x, y) = coin haut gauche, sur une hauteur `size`.
 *   logo      initiales dans le carré rouge arrondi façon « F. », puis le nom en capitales espacées
 *   monogram  initiales en serif dans un cercle fin, puis le nom en petites capitales
 *   script    le nom en écriture manuscrite
 * Renvoie la largeur dessinée (ou seulement mesurée si measureOnly).
 */
function drawSignature(ctx, x, y, size, theme, measureOnly = false) {
  const name = signatureName.trim();
  const initials = signatureInitials(name);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let width = 0;

  if (signatureStyle === "script") {
    ctx.font = `${Math.round(size * 1.35)}px ${SCRIPT_FONT}`;
    width = ctx.measureText(name).width;
    if (!measureOnly) {
      ctx.fillStyle = theme.muted;
      ctx.fillText(name, x, y + size * 0.5);
    }
  } else {
    const gap = Math.round(size * 0.38);
    const label = name.toUpperCase();
    const labelSize = Math.max(7, Math.round(size * 0.42));
    const spacing = labelSize * 0.32;
    ctx.font = `500 ${labelSize}px ${FRAME_FONT}`;
    const labelW = spacedWidth(ctx, label, spacing);
    width = size + gap + labelW;
    if (!measureOnly) {
      if (signatureStyle === "logo") {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#e45b52";
        roundedRect(ctx, x, y, size, size, Math.round(size * 0.24));
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.font = `800 ${Math.round(size * (initials.length > 1 ? 0.42 : 0.56))}px ${FRAME_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(`${initials}.`, x + size / 2, y + size * 0.53);
      } else {
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = Math.max(1, size * 0.035);
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - ctx.lineWidth, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = theme.muted;
        ctx.font = `italic ${Math.round(size * (initials.length > 1 ? 0.4 : 0.5))}px ${SERIF_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(initials, x + size / 2, y + size * 0.54);
      }
      ctx.textAlign = "left";
      ctx.font = `500 ${labelSize}px ${FRAME_FONT}`;
      ctx.fillStyle = theme.muted;
      drawSpaced(ctx, label, x + size + gap, y + size / 2, spacing);
    }
  }
  ctx.restore();
  return width;
}

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
  // Signature : sur sa propre ligne en bas du cartouche (imprimée en bordure sur la pellicule).
  const hasSignature = Boolean(signatureName.trim());
  // Seule dans le cadre, la signature est un peu plus grande (elle est alors centrée).
  const [withInfo, alone] = SIGNATURE_SIZES[signatureSize];
  const sigSize = Math.max(12, Math.round(long * (showTitle || lines.length ? withInfo : alone)));
  const sigBlock = hasSignature && !cfg.film ? sigSize + (showTitle || lines.length ? Math.round(textSize * 1.2) : 0) : 0;
  const content = (showTitle ? titleSize * 1.25 : 0) + (showTitle && lines.length ? titleSize * 0.25 : 0) +
    lines.length * textSize * 1.55 + sigBlock;
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
    drawFilmStrip(ctx, 0, top + H, canvas.width, strip, false, hasSignature ? `© ${signatureName.trim().toUpperCase()}` : "", "24A");
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
    if (sigBlock) {
      // Seule dans le cartouche : centrée ; sous des infos : alignée à droite.
      const sigW = measureSignature(ctx, sigSize);
      const sigX = showTitle || lines.length ? side + W - sigW : side + (W - sigW) / 2;
      const sigY = Math.round(bandTop + (bandHeight - content) / 2 + content - sigSize);
      drawSignature(ctx, sigX, sigY, sigSize, cfg);
    }
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
  frameMeta.textContent = frameStyle === "none" ? "" : frameOptions.querySelector(`[data-frame="${frameStyle}"]`).textContent.trim().toUpperCase();
  frameInfoRow.hidden = frameStyle === "none";
  signatureRow.hidden = frameStyle === "none";
  signatureStyleRow.hidden = frameStyle === "none" || !signatureName.trim();
  signatureInput.value = signatureName;
  signatureStyleOptions.querySelectorAll("[data-signature]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.signature === signatureStyle));
  });
  signatureSizeRow.hidden = signatureStyleRow.hidden;
  signatureSizeOptions.querySelectorAll("[data-size]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.size === signatureSize));
  });
}

const signatureRow = document.getElementById("signatureRow");
const signatureStyleRow = document.getElementById("signatureStyleRow");
const signatureInput = document.getElementById("signatureInput");
const signatureStyleOptions = document.getElementById("signatureStyleOptions");
const signatureSizeRow = document.getElementById("signatureSizeRow");
const signatureSizeOptions = document.getElementById("signatureSizeOptions");

signatureSizeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-size]");
  if (!button) return;
  signatureSize = button.dataset.size;
  saveSignature();
  updateFrameOptions();
  schedulePreview();
});

function saveSignature() {
  store(SIGNATURE_KEY, { name: signatureName, style: signatureStyle, size: signatureSize });
}

signatureInput.addEventListener("input", () => {
  signatureName = signatureInput.value.slice(0, 32);
  saveSignature();
  signatureStyleRow.hidden = frameStyle === "none" || !signatureName.trim();
  signatureSizeRow.hidden = signatureStyleRow.hidden;
  schedulePreview();
});

signatureStyleOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-signature]");
  if (!button) return;
  signatureStyle = button.dataset.signature;
  saveSignature();
  updateFrameOptions();
  schedulePreview();
  loadScriptFont().then(schedulePreview);
});

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

loadScriptFont().then(schedulePreview);
