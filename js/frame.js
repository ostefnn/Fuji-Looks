/* Fuji Looks — Cadre façon tirage avec les infos de la recette. */
// --- Cadre façon tirage ---------------------------------------------------------

let frameStyle = ["none", "white", "black"].includes(load(FRAME_KEY)) ? load(FRAME_KEY) : "none";

const FRAME_THEMES = {
  white: { bg: "#f5f3ee", text: "#1c1c1c", muted: "#6f6c66" },
  black: { bg: "#111214", text: "#f1f0ec", muted: "#9b9a96" }
};

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

// Bordure avec, en bas, le nom de la recette, la simulation et les réglages.
// Toutes les tailles sont proportionnelles à la photo : l'aperçu et l'export sont identiques.
function composeFrame(imageData, style, frameRecipe) {
  const theme = FRAME_THEMES[style];
  const W = imageData.width;
  const H = imageData.height;
  const long = Math.max(W, H);
  const pad = Math.round(long * 0.035);
  const titleSize = Math.max(10, Math.round(long * 0.024));
  const textSize = Math.max(8, Math.round(long * 0.0145));
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let lines = [];
  if (frameRecipe) {
    ctx.font = `${textSize}px ${font}`;
    lines = wrapTokens(ctx, frameTokens(frameRecipe), W);
    if (frameRecipe.author) lines.push(`Recette : ${frameRecipe.author}`);
  }
  const band = frameRecipe ? Math.round(pad * 0.9 + titleSize * 1.25 + lines.length * textSize * 1.55 + pad * 0.9) : pad;

  canvas.width = W + pad * 2;
  canvas.height = H + pad + band;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const photo = document.createElement("canvas");
  photo.width = W;
  photo.height = H;
  photo.getContext("2d").putImageData(imageData, 0, 0);
  ctx.drawImage(photo, pad, pad);

  if (frameRecipe) {
    let y = H + pad + Math.round(pad * 0.9) + titleSize;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = theme.text;
    ctx.font = `600 ${titleSize}px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(frameRecipe.name || "Recette", pad, y, W * 0.62);
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${Math.round(titleSize * 0.8)}px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(FR.simById(frameRecipe.filmSim).name.toUpperCase(), pad + W, y, W * 0.36);

    ctx.textAlign = "left";
    ctx.font = `${textSize}px ${font}`;
    y += Math.round(titleSize * 0.25);
    lines.forEach((line, i) => {
      y += Math.round(textSize * 1.55);
      ctx.fillStyle = frameRecipe.author && i === lines.length - 1 ? theme.muted : theme.text;
      ctx.fillText(line, pad, y);
    });
  }
  return canvas;
}

function updateFrameOptions() {
  frameOptions.querySelectorAll("[data-frame]").forEach((button) => {
    const active = button.dataset.frame === frameStyle;
    button.setAttribute("aria-checked", String(active));
    button.tabIndex = active ? 0 : -1;
  });
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

frameOptions.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const buttons = [...frameOptions.querySelectorAll("[data-frame]")];
  const current = buttons.findIndex((b) => b.dataset.frame === frameStyle);
  const next = buttons[(current + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
  next.focus();
  next.click();
});
