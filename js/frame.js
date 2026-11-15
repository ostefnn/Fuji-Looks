/* Dialed — Cadre façon tirage avec les infos de la recette. */
// --- Cadre façon tirage ---------------------------------------------------------

// Deux cadres seulement : le tirage (marge de papier égale, un peu plus large en bas)
// et le scan de négatif (js/film-edge.js). Le nom de la recette n'est jamais imprimé
// sur la photo : il a sa place sur la fiche recette.
const FRAME_STYLES = {
  print: { margin: 0.06, bottom: 0.075 },
  film: { film: true }
};
const PRINT_PAPERS = {
  white: { bg: "#f3f1ec", text: "#2a2925", muted: "#8a867e" },
  black: { bg: "#141414", text: "#e9e7e2", muted: "#8f8c86" }
};
const FRAME_PAPER_KEY = "fuji-looks.frame-paper";

const frameMeta = document.getElementById("frameMeta");
// Anciens cadres (Blanc, Crème, Noir, Fin, Polaroid) : convertis en tirage.
const LEGACY_FRAMES = { white: "white", cream: "white", thin: "white", polaroid: "white", black: "black" };
let framePaper = PRINT_PAPERS[load(FRAME_PAPER_KEY)] ? load(FRAME_PAPER_KEY) : "white";
let frameStyle = (() => {
  const saved = load(FRAME_KEY);
  if (FRAME_STYLES[saved]) return saved;
  if (LEGACY_FRAMES[saved]) {
    framePaper = LEGACY_FRAMES[saved];
    store(FRAME_KEY, "print");
    store(FRAME_PAPER_KEY, framePaper);
    return "print";
  }
  return "none";
})();
// Infos de la recette sur la photo : supprimées (gardé pour la signature des fonctions).
const frameInfo = "none";

function signedValue(v, decimals = 0) {
  const n = Number(v);
  const text = decimals ? n.toFixed(decimals).replace(/\.0$/, "") : String(Math.round(n));
  return n > 0 ? `+${text}` : n < 0 ? `−${text.slice(1)}` : "0";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Réglages de la recette, avec les noms des menus Fujifilm.
// Pellicule : sensibilité, procédé et réglages de texture à la place des réglages Fujifilm.
function filmFrameTokens(spec) {
  const film = filmByKey.get(spec.film);
  const push = Number(spec.push) || 0;
  return [`ISO ${film.iso}`, film.process, FILM_SHELVES.find((s) => s.id === film.shelf).kindLabel,
    filmFormatOf(filmFormat).label, ...(push ? [`${push > 0 ? "Poussé" : "Retenu"} ${Math.abs(push)} IL`] : []),
    `Grain ${spec.grain}`, `Halation ${spec.halation}`, `Douceur ${spec.softness}`];
}

// Sous-titre d'un look dans un cadre : la simulation, ou le procédé de la pellicule.
function frameSubtitle(r) {
  if (r.nikon) return `NIKON · ${nikonBaseLabel(r).toUpperCase()}`;
  if (r.film) {
    const film = filmByKey.get(r.film);
    return `ISO ${film.iso} · ${film.process}`;
  }
  return FR.simById(r.filmSim).name.toUpperCase();
}

function frameTokens(r) {
  if (r.film) return filmFrameTokens(r);
  if (r.nikon) return nikonFrameTokens(r);
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
const SCRIPT_FONT = '"Dialed Script", "Snell Roundhand", "Apple Chancery", cursive';

// La police manuscrite est chargée à la demande ; on redessine l'aperçu une fois prête.
function loadScriptFont() {
  if (!document.fonts || signatureStyle !== "script") return Promise.resolve();
  return document.fonts.load('48px "Dialed Script"', signatureName || "Signature").catch(() => {});
}

// --- Signature (logo personnel) ---------------------------------------------

const SIGNATURE_KEY = "fuji-looks.signature";
const savedSignature = load(SIGNATURE_KEY) || {};
let signatureName = typeof savedSignature.name === "string" ? savedSignature.name.slice(0, 32) : "";
// « Texte » : la légende en petites capitales espacées (l'ancien « Logo » y est ramené).
let signatureStyle = ["text", "monogram", "script"].includes(savedSignature.style) ? savedSignature.style : "text";
// Taille relative au grand côté de la photo : [sous les infos, seule dans le cadre].
// Volontairement discrète : la signature ne doit pas concurrencer la photo.
const SIGNATURE_SIZES = { small: [0.017, 0.021], medium: [0.023, 0.028], large: [0.03, 0.037] };
let signatureSize = SIGNATURE_SIZES[savedSignature.size] ? savedSignature.size : "small";
// Position dans le cartouche : gauche, centre ou droite.
let signaturePosition = ["left", "center", "right"].includes(savedSignature.position) ? savedSignature.position : "right";

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
    const plain = signatureStyle === "text";
    width = plain ? labelW : size + gap + labelW;
    if (!measureOnly && plain) {
      ctx.fillStyle = theme.muted;
      drawSpaced(ctx, label, x, y + size / 2, spacing);
    } else if (!measureOnly) {
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

// Tirage : la photo sur son papier, marges égales et un peu plus de place en bas,
// avec au plus une légende discrète. Tailles proportionnelles : aperçu et export identiques.
// pair : seconde vue du demi-format (ImageData), pour le scan de négatif.
function composeFrame(imageData, style, frameRecipe, info = frameInfo, pair = null) {
  const cfg = FRAME_STYLES[style];
  if (cfg.film) return composeFilmEdge(imageData, frameRecipe, info, pair);
  const paper = PRINT_PAPERS[framePaper];
  const W = imageData.width;
  const H = imageData.height;
  const long = Math.max(W, H);
  const margin = Math.round(long * cfg.margin);
  const caption = signatureName.trim();
  const sigSize = Math.max(10, Math.round(long * SIGNATURE_SIZES[signatureSize][0]));
  const bottom = Math.round(long * cfg.bottom) + (caption ? Math.round(sigSize * 1.6) : 0);

  const canvas = document.createElement("canvas");
  canvas.width = W + margin * 2;
  canvas.height = margin + H + bottom;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = paper.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imageDataToCanvas(imageData), margin, margin);
  canvas.photoX = margin; // position de la photo dans le cadre (pipette, recadrage)
  canvas.photoY = margin;

  if (caption) {
    const sigW = measureSignature(ctx, sigSize);
    const x = signaturePosition === "left" ? margin : signaturePosition === "center" ? margin + (W - sigW) / 2 : margin + W - sigW;
    const y = Math.round(margin + H + (bottom - sigSize) / 2);
    drawSignature(ctx, x, y, sigSize, paper);
  }
  return canvas;
}

// Point sur l'onglet « Cadre & effets » : cadre, halation ou dos dateur actifs.
function updateFrameMeta() {
  const halation = typeof edit !== "undefined" && edit.halation > 0;
  const date = typeof dateBack !== "undefined" && dateBack.on;
  frameMeta.hidden = frameStyle === "none" && !halation && !date;
}

function updateFrameOptions() {
  frameOptions.querySelectorAll("[data-frame]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.frame === frameStyle));
  });
  framePaperOptions.querySelectorAll("[data-paper]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.paper === framePaper));
  });
  framePaperRow.hidden = frameStyle !== "print";
  updateFrameMeta();
  // La légende va sur le papier du tirage, pas sur un négatif.
  signatureRow.hidden = frameStyle !== "print";
  signatureStyleRow.hidden = frameStyle !== "print" || !signatureName.trim();
  signatureInput.value = signatureName;
  signatureStyleOptions.querySelectorAll("[data-signature]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.signature === signatureStyle));
  });
  signatureSizeRow.hidden = signatureStyleRow.hidden;
  signaturePositionRow.hidden = signatureStyleRow.hidden;
  updateFilmEdgeOptions();
  signaturePositionOptions.querySelectorAll("[data-position]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.position === signaturePosition));
  });
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
const signaturePositionRow = document.getElementById("signaturePositionRow");
const signaturePositionOptions = document.getElementById("signaturePositionOptions");

signaturePositionOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-position]");
  if (!button) return;
  signaturePosition = button.dataset.position;
  saveSignature();
  updateFrameOptions();
  schedulePreview();
});

signatureSizeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-size]");
  if (!button) return;
  signatureSize = button.dataset.size;
  saveSignature();
  updateFrameOptions();
  schedulePreview();
});

function saveSignature() {
  store(SIGNATURE_KEY, { name: signatureName, style: signatureStyle, size: signatureSize, position: signaturePosition });
}

signatureInput.addEventListener("input", () => {
  signatureName = signatureInput.value.slice(0, 32);
  saveSignature();
  signatureStyleRow.hidden = frameStyle !== "print" || !signatureName.trim();
  signatureSizeRow.hidden = signatureStyleRow.hidden;
  signaturePositionRow.hidden = signatureStyleRow.hidden;
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
  const gateBefore = frameStyle === "film";
  frameStyle = button.dataset.frame;
  store(FRAME_KEY, frameStyle);
  updateFrameOptions();
  // La bande de film impose le format de la vue : on recadre la photo.
  if (gateBefore || frameStyle === "film") filmGateChanged();
  else schedulePreview();
  if (!originalImage && frameStyle !== "none") showStatus("Importe une photo pour voir le cadre.");
});

framePaperOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-paper]");
  if (!button) return;
  framePaper = button.dataset.paper;
  store(FRAME_PAPER_KEY, framePaper);
  updateFrameOptions();
  schedulePreview();
});

loadScriptFont().then(schedulePreview);
