/* Fuji Looks — Dos dateur : la date imprimée dans l'image, en chiffres orange à segments,
 * comme les compacts argentiques qui l'exposaient sur le négatif. Fait partie de la photo :
 * fonctionne avec ou sans cadre, et ne dépend pas du look. */

const DATE_BACK_KEY = "fuji-looks.date-back";
const DATE_STYLES = ["yymmdd", "ddmmyy", "mmddyy"];
const savedDateBack = load(DATE_BACK_KEY) || {};
const dateBack = {
  on: savedDateBack.on === true,
  style: DATE_STYLES.includes(savedDateBack.style) ? savedDateBack.style : "yymmdd",
  source: savedDateBack.source === "custom" ? "custom" : "photo",
  custom: /^\d{4}-\d{2}-\d{2}$/.test(savedDateBack.custom || "") ? savedDateBack.custom : ""
};

// Date de prise de vue lue dans l'EXIF (« AAAA:MM:JJ HH:MM:SS »), ou null.
let exifDateCache = { segment: null, date: null };
function exifDate(segment) {
  if (!segment) return null;
  if (exifDateCache.segment === segment) return exifDateCache.date;
  const text = new TextDecoder("latin1").decode(segment);
  const all = [...text.matchAll(/(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}/g)];
  // La date d'origine (DateTimeOriginal) suit en général la date de modification : on prend la dernière.
  const m = all.length ? all[all.length - 1] : null;
  const date = m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
  exifDateCache = { segment, date };
  return date;
}

function dateBackDate() {
  if (dateBack.source === "custom" && dateBack.custom) {
    const [y, m, d] = dateBack.custom.split("-").map(Number);
    return { y, m, d };
  }
  const fromPhoto = exifDate(sourceExif);
  if (fromPhoto) return fromPhoto;
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function dateBackText() {
  const { y, m, d } = dateBackDate();
  const two = (n) => String(n).padStart(2, "0");
  const yy = `'${two(y % 100)}`;
  if (dateBack.style === "ddmmyy") return `${two(d)} ${two(m)} ${yy}`;
  if (dateBack.style === "mmddyy") return `${two(m)} ${two(d)} ${yy}`;
  return `${yy} ${two(m)} ${two(d)}`;
}

// Chiffres à 7 segments (a en haut, puis dans le sens horaire, g au milieu).
const SEGMENTS = {
  0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg"
};

function drawSegmentDigit(ctx, digit, x, y, h) {
  const w = h * 0.56;
  const t = h * 0.13;
  const half = h / 2;
  const rects = {
    a: [x + t * 0.6, y, w - t * 1.2, t],
    b: [x + w - t, y + t * 0.6, t, half - t * 0.9],
    c: [x + w - t, y + half + t * 0.3, t, half - t * 0.9],
    d: [x + t * 0.6, y + h - t, w - t * 1.2, t],
    e: [x, y + half + t * 0.3, t, half - t * 0.9],
    f: [x, y + t * 0.6, t, half - t * 0.9],
    g: [x + t * 0.6, y + half - t / 2, w - t * 1.2, t]
  };
  for (const s of SEGMENTS[digit]) {
    const [rx, ry, rw, rh] = rects[s];
    roundedRect(ctx, rx, ry, rw, rh, t * 0.4);
    ctx.fill();
  }
  return w;
}

function measureDate(text, h) {
  let width = 0;
  for (const ch of text) width += ch === " " ? h * 0.32 : ch === "'" ? h * 0.22 : h * 0.56 + h * 0.2;
  return width;
}

function drawDateText(ctx, text, x, y, h) {
  let cx = x;
  for (const ch of text) {
    if (ch === " ") cx += h * 0.32;
    else if (ch === "'") {
      roundedRect(ctx, cx, y, h * 0.1, h * 0.28, h * 0.04);
      ctx.fill();
      cx += h * 0.22;
    } else cx += drawSegmentDigit(ctx, ch, cx, y, h) + h * 0.2;
  }
}

/*
 * Imprime la date en bas à droite de la photo, en place. Les chiffres sont exposés sur le film :
 * lumière orange ajoutée à l'image (mode « écran »), avec un halo léger.
 */
function applyDateBack(imageData) {
  if (!dateBack.on) return imageData;
  const { width: w, height: h } = imageData;
  const long = Math.max(w, h);
  // Taille fixe sur le film (≈ 1 mm de haut sur un 24×36), rapportée au format.
  const scale = filmEdgeActive() ? formatScale(filmFormat) : 1;
  const digitH = Math.max(8, long * 0.032 * scale ** 0.8);
  const text = dateBackText();
  const width = measureDate(text, digitH);
  const x = w - long * 0.05 - width;
  const y = h - long * 0.045 - digitH;
  const canvas = imageDataToCanvas(imageData);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.save();
  ctx.transform(1, 0, -0.08, 1, digitH * 0.08, 0); // chiffres légèrement penchés
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(255, 110, 20, 0.85)";
  ctx.shadowBlur = digitH * 0.35;
  ctx.fillStyle = "rgba(255, 146, 46, 0.92)";
  drawDateText(ctx, text, x, y, digitH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 196, 120, 0.55)"; // cœur plus clair, comme une LED surexposée
  drawDateText(ctx, text, x, y, digitH);
  ctx.restore();
  imageData.data.set(ctx.getImageData(0, 0, w, h).data);
  return imageData;
}

// --- Réglages ------------------------------------------------------------------------------

const dateBackOptions = document.getElementById("dateBackOptions");
const dateBackStyleRow = document.getElementById("dateBackStyleRow");
const dateBackStyleOptions = document.getElementById("dateBackStyleOptions");
const dateBackSourceRow = document.getElementById("dateBackSourceRow");
const dateBackSourceOptions = document.getElementById("dateBackSourceOptions");
const dateBackInput = document.getElementById("dateBackInput");

function saveDateBack() {
  store(DATE_BACK_KEY, { ...dateBack });
}

function updateDateBackOptions() {
  dateBackOptions.querySelectorAll("[data-dateback]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.dateback === "on") === dateBack.on)));
  dateBackStyleRow.hidden = dateBackSourceRow.hidden = !dateBack.on;
  dateBackStyleOptions.querySelectorAll("[data-datestyle]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.datestyle === dateBack.style)));
  dateBackSourceOptions.querySelectorAll("[data-datesource]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.datesource === dateBack.source)));
  dateBackInput.hidden = dateBack.source !== "custom";
  dateBackInput.value = dateBack.custom;
}

[[dateBackOptions, "dateback", (v) => { dateBack.on = v === "on"; }],
  [dateBackStyleOptions, "datestyle", (v) => { dateBack.style = v; }],
  [dateBackSourceOptions, "datesource", (v) => { dateBack.source = v; }]].forEach(([group, key, apply]) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest(`[data-${key}]`);
    if (!button) return;
    apply(button.dataset[key]);
    saveDateBack();
    updateDateBackOptions();
    schedulePreview();
  });
});

dateBackInput.addEventListener("input", () => {
  dateBack.custom = dateBackInput.value;
  saveDateBack();
  schedulePreview();
});

updateDateBackOptions();
