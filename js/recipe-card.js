/* Fuji Looks — Fiche recette en image (1080 × 1350, format 4:5) à partager. */

const CARD_W = 1080;
const CARD_H = 1350;
const CARD_PHOTO_H = 560;
const CARD_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Photo (ou image d'exemple) avec la recette, recadrée pour remplir le haut de la fiche.
function cardPhoto(cardRecipe) {
  const src = previewSource || drawToImageData(drawSampleScene(), 900, 600, 900);
  const size = previewSource ? sourceSize : { w: src.width, h: src.height };
  const graded = renderRecipe(src, cardRecipe, 1, size);
  const canvas = document.createElement("canvas");
  canvas.width = graded.width;
  canvas.height = graded.height;
  canvas.getContext("2d").putImageData(graded, 0, 0);
  return canvas;
}

function drawCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

// Réglages affichés : ceux de l'éditeur (noms des menus Fujifilm), sans les notes de prise de vue.
function cardEntries(r) {
  return FR.FIELDS
    .filter((field) => !field.meta && field.key !== "filmSim" && !(field.when && !field.when(r)))
    .map((field) => [field.label, String(FR.formatValue(field, r))]);
}

// QR code du lien de partage : scanné avec un téléphone, il ouvre la recette dans Fuji Looks.
// Seuls les réglages de conversion sont encodés (pas les notes, ISO, exposition, boîtier) :
// le code reste peu dense et se lit même quand la fiche est affichée en petit.
const CARD_QR_SIZE = 300;

function drawRecipeQr(ctx, cardRecipe, x, y, size) {
  if (typeof qrcode !== "function") return false;
  const shared = { ...FR.normalize(cardRecipe), notes: "", iso: "", exposureComp: "", camera: "" };
  const url = `${location.href.split("#")[0]}#r=${FR.toShareCode(shared)}`;
  const qr = qrcode(0, "L");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 2;
  const cell = Math.floor(size / (count + quiet * 2));
  const real = cell * (count + quiet * 2);
  const ox = x + Math.round((size - real) / 2);
  const oy = y + Math.round((size - real) / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ox, oy, real, real);
  ctx.fillStyle = "#111214";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    }
  }
  return true;
}

function buildRecipeCard(cardRecipe) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  const pad = 64;

  ctx.fillStyle = "#111214";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawCover(ctx, cardPhoto(cardRecipe), 0, 0, CARD_W, CARD_PHOTO_H);

  // QR code à droite de l'en-tête
  const qrX = CARD_W - pad - CARD_QR_SIZE;
  const qrY = CARD_PHOTO_H + 40;
  const hasQr = drawRecipeQr(ctx, cardRecipe, qrX, qrY, CARD_QR_SIZE);
  const textW = hasQr ? qrX - pad - 32 : CARD_W - pad * 2;
  if (hasQr) {
    ctx.fillStyle = "#a3a8b0";
    ctx.font = `500 19px ${CARD_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Scanne pour ouvrir la recette", qrX + CARD_QR_SIZE / 2, qrY + CARD_QR_SIZE + 30, CARD_QR_SIZE + 40);
    ctx.textAlign = "left";
  }

  // En-tête : nom, simulation, auteur
  let y = CARD_PHOTO_H + 70;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e45b52";
  ctx.font = `700 22px ${CARD_FONT}`;
  ctx.fillText("RECETTE FUJIFILM", pad, y);
  y += 62;
  ctx.fillStyle = "#f4f4f0";
  ctx.font = `700 54px ${CARD_FONT}`;
  ctx.fillText(cardRecipe.name || "Recette", pad, y, textW);
  y += 44;
  ctx.fillStyle = "#a3a8b0";
  ctx.font = `500 28px ${CARD_FONT}`;
  const sim = FR.simById(cardRecipe.filmSim).name.toUpperCase();
  ctx.fillText(cardRecipe.author ? `${sim}  ·  ${cardRecipe.author}` : sim, pad, y, textW);

  // ISO / exposition (texte libre de la recette) : sous le titre quand le QR code occupe la droite.
  const meta = [["ISO", cardRecipe.iso], ["Exposure Comp.", cardRecipe.exposureComp]].filter(([, v]) => v);
  function drawMeta(startY, maxW) {
    let my = startY;
    meta.forEach(([label, value]) => {
      ctx.fillStyle = "#a3a8b0";
      ctx.font = `400 24px ${CARD_FONT}`;
      ctx.fillText(`${label} : `, pad, my);
      const w = ctx.measureText(`${label} : `).width;
      ctx.fillStyle = "#f4f4f0";
      ctx.fillText(value, pad + w, my, maxW - w);
      my += 40;
    });
  }
  if (hasQr) drawMeta(y + 64, textW);

  // Réglages sur deux colonnes
  const entries = cardEntries(cardRecipe);
  const top = Math.max(y + 44 + (hasQr ? meta.length * 40 + 20 : 0), hasQr ? qrY + CARD_QR_SIZE + 52 : 0);
  const bottom = CARD_H - 70 - (hasQr ? 0 : meta.length * 40);
  const rows = Math.ceil(entries.length / 2);
  const rowH = Math.min(52, (bottom - top) / rows);
  const colW = (CARD_W - pad * 2 - 40) / 2;
  ctx.font = `400 25px ${CARD_FONT}`;
  entries.forEach(([label, value], i) => {
    const col = i < rows ? 0 : 1;
    const row = col ? i - rows : i;
    const x = pad + col * (colW + 40);
    const ry = top + row * rowH;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(x, ry + rowH - 1, colW, 1);
    ctx.fillStyle = "#a3a8b0";
    ctx.textAlign = "left";
    ctx.fillText(label, x, ry + rowH * 0.68, colW * 0.62);
    ctx.fillStyle = "#f4f4f0";
    ctx.font = `600 25px ${CARD_FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(value, x + colW, ry + rowH * 0.68, colW * 0.36);
    ctx.font = `400 25px ${CARD_FONT}`;
  });
  ctx.textAlign = "left";

  if (!hasQr) drawMeta(top + rows * rowH + 46, CARD_W - pad * 2);
  ctx.fillStyle = "#6f747c";
  ctx.font = `400 19px ${CARD_FONT}`;
  ctx.fillText("Fuji Looks · aperçu approximatif, pas une reproduction exacte du traitement Fujifilm", pad, CARD_H - 34, CARD_W - pad * 2);
  return canvas;
}

document.getElementById("cardButton").addEventListener("click", () => {
  if (!applied) {
    showStatus("Choisis d’abord un look ou une recette.");
    return;
  }
  const canvas = buildRecipeCard(recipe);
  canvas.toBlob(async (blob) => {
    if (!blob) {
      showStatus("Création de la fiche impossible.");
      return;
    }
    const file = new File([blob], FR.fileName(recipe, "-fiche.png"), { type: "image/png" });
    presentResult(file, { title: "Fiche recette prête", savedMessage: "Fiche recette enregistrée." });
  }, "image/png");
});
