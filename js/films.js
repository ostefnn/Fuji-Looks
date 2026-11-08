/* Fuji Looks — Pellicules argentiques : 72 films, leur couleur et leur texture.
 *
 * Une pellicule n'est pas une recette Fujifilm : c'est un rendu. Sa couleur vient d'une LUT 3D de la
 * collection Film-Luts (69 films, js/film-luts-data.js, chargé à la demande) ou, pour les 3 films sans
 * LUT, d'un modèle paramétrique propre à Fuji Looks. Le grain, la halation et la douceur sont
 * modélisés ici, à partir de la sensibilité et du type de film.
 *
 * Partagé entre la page et le worker d'export : pas d'accès au DOM ici.
 */

const FILM_SHELVES = [
  { id: "neg", label: "Négatif", kindLabel: "Négatif couleur" },
  { id: "slide", label: "Diapo · Cross", kindLabel: "Inversible" },
  { id: "bw", label: "N&B", kindLabel: "Noir et blanc" },
  { id: "cine", label: "Cinéma", kindLabel: "Cinéma" }
];

// [clé, nom, ISO, procédé, rayon, description]
const FILM_LIST = [
  ["portra400", "Kodak Portra 400", 400, "C-41", "neg", "Peau douce et chaude, hautes lumières tendres"],
  ["ektar100", "Kodak Ektar 100", 100, "C-41", "neg", "Couleurs franches, grain très fin"],
  ["gold200", "Kodak Gold 200", 200, "C-41", "neg", "Lumière dorée toute la journée"],
  ["superia400", "Fujicolor Superia 400", 400, "C-41", "neg", "Ombres vertes, photos du quotidien"],
  ["portra160", "Kodak Portra 160", 160, "C-41", "neg", "Grain fin, carnations naturelles"],
  ["portra800", "Kodak Portra 800", 800, "C-41", "neg", "Portraits en basse lumière, grain chaud"],
  ["portra160nc", "Kodak Portra 160NC", 160, "C-41", "neg", "Couleur naturelle, contraste doux"],
  ["portra160vc", "Kodak Portra 160VC", 160, "C-41", "neg", "Couleur vive pour le portrait"],
  ["portra400nc", "Kodak Portra 400NC", 400, "C-41", "neg", "Peau neutre, couleur discrète"],
  ["portra400vc", "Kodak Portra 400VC", 400, "C-41", "neg", "Plus de couleur, même peau"],
  ["portra400uc", "Kodak Portra 400UC", 400, "C-41", "neg", "Ultra couleur pour tous les jours"],
  ["elite200", "Kodak Elite Color 200", 200, "C-41", "neg", "Couleur grand public, lumineuse"],
  ["elite400", "Kodak Elite Color 400", 400, "C-41", "neg", "Couleur du quotidien, plus rapide"],
  ["pro160c", "Fujifilm Pro 160C", 160, "C-41", "neg", "Couleur nette, froide et propre"],
  ["pro400h", "Fujifilm Pro 400H", 400, "C-41", "neg", "Pastels aériens, quatrième couche"],
  ["pro800z", "Fujifilm Pro 800Z", 800, "C-41", "neg", "Portraits de nuit, palette douce"],
  ["reala100", "Fujifilm Reala 100", 100, "C-41", "neg", "Couleur fidèle, grain fin"],
  ["superia100", "Fujifilm Superia 100", 100, "C-41", "neg", "Couleur nette en plein jour"],
  ["superia200", "Fujifilm Superia 200", 200, "C-41", "neg", "Verts Fuji, photos du quotidien"],
  ["superia800", "Fujifilm Superia 800", 800, "C-41", "neg", "Rapide en intérieur, couleur Fuji"],
  ["superia1600", "Fujifilm Superia 1600", 1600, "C-41", "neg", "Photos de nuit, grain marqué"],
  ["xtra800", "Fujifilm X-TRA 800", 800, "C-41", "neg", "Polyvalent rapide, ombres froides"],
  ["vista200", "Agfa Vista 200", 200, "C-41", "neg", "Rouges chauds, couleurs de vacances"],
  ["ultra100", "Agfa Ultra 100", 100, "C-41", "neg", "Couleur Agfa saturée et punchy"],
  ["redscale100", "Lomography Redscale 100", 100, "C-41", "neg", "Exposé à l’envers : rouge-orangé"],

  ["velvia50", "Fujichrome Velvia 50", 50, "E-6", "slide", "Diapo éclatante, contraste dur"],
  ["velvia100", "Fujifilm Velvia 100", 100, "E-6", "slide", "Couleur riche, plus douce que la 50"],
  ["provia100f", "Fujifilm Provia 100F", 100, "E-6", "slide", "Diapo neutre, couleur fidèle"],
  ["provia400f", "Fujifilm Provia 400F", 400, "E-6", "slide", "Diapo rapide, couleur propre"],
  ["provia400x", "Fujifilm Provia 400X", 400, "E-6", "slide", "Diapo rapide, grain plus fin"],
  ["astia100f", "Fujifilm Astia 100F", 100, "E-6", "slide", "Diapo douce pour la peau"],
  ["sensia100", "Fujifilm Sensia 100", 100, "E-6", "slide", "Diapo grand public, lumineuse"],
  ["kodachrome25", "Kodak Kodachrome 25", 25, "K-14", "slide", "Grain légendaire, rouges profonds"],
  ["kodachrome64", "Kodak Kodachrome 64", 64, "K-14", "slide", "Couleur de magazine des années 70"],
  ["kodachrome200", "Kodak Kodachrome 200", 200, "K-14", "slide", "Kodachrome rapide, grain chaud"],
  ["e100gx", "Kodak Ektachrome E100GX", 100, "E-6", "slide", "Ektachrome chaud et doux"],
  ["e100vs", "Kodak Ektachrome E100VS", 100, "E-6", "slide", "Ektachrome très saturé"],
  ["elitechrome200", "Kodak Elite Chrome 200", 200, "E-6", "slide", "Diapo Kodak du quotidien"],
  ["elitechrome400", "Kodak Elite Chrome 400", 400, "E-6", "slide", "Diapo Kodak rapide, plus de grain"],
  ["extracolor100", "Kodak ExtraColor 100", 100, "E-6", "slide", "Diapo Kodak extra saturée"],
  ["precisa100", "Agfa Precisa 100", 100, "E-6", "slide", "Diapo Agfa froide et nette"],
  ["elite100xpro", "Kodak Elite 100 X-Pro", 100, "X-PRO", "slide", "Diapo développée en C-41 : contraste fou"],
  ["superia200xpro", "Fujifilm Superia 200 X-Pro", 200, "X-PRO", "slide", "Croisé, hautes lumières jaunes"],
  ["xproslide200", "Lomography X-Pro Slide 200", 200, "X-PRO", "slide", "Traitement croisé : bleus et jaunes"],

  ["hp5", "Ilford HP5 Plus 400", 400, "N&B", "bw", "N&B classique, grande latitude"],
  ["trix400", "Kodak Tri-X 400", 400, "N&B", "bw", "Contraste granuleux, le classique de la rue"],
  ["tmax100", "Kodak T-MAX 100", 100, "N&B", "bw", "Grain ultra fin, tons lisses"],
  ["tmax400", "Kodak T-MAX 400", 400, "N&B", "bw", "N&B moderne et net"],
  ["tmax3200", "Kodak T-MAX P3200", 3200, "N&B", "bw", "Fait pour pousser, nuits granuleuses"],
  ["bw400cn", "Kodak BW400CN", 400, "C-41", "bw", "N&B chromogène, grain lisse"],
  ["hie", "Kodak HIE Infrared", 400, "N&B", "bw", "Infrarouge : feuillages blancs, ciels sombres"],
  ["delta100", "Ilford Delta 100", 100, "N&B", "bw", "N&B moderne, fin et net"],
  ["delta400", "Ilford Delta 400", 400, "N&B", "bw", "Grain lisse à 400"],
  ["delta3200", "Ilford Delta 3200", 3200, "N&B", "bw", "S’enfonce dans le noir"],
  ["fp4", "Ilford FP4 Plus", 125, "N&B", "bw", "N&B classique de sensibilité moyenne"],
  ["panf50", "Ilford Pan F Plus", 50, "N&B", "bw", "Lent, grain extrêmement fin"],
  ["hps800", "Ilford HPS 800", 800, "N&B", "bw", "Ilford classique et rapide"],
  ["xp2", "Ilford XP2 Super", 400, "C-41", "bw", "N&B en C-41, tons doux"],
  ["acros100", "Fujifilm Acros 100", 100, "N&B", "bw", "Grain fin, noirs profonds"],
  ["neopan1600", "Fujifilm Neopan 1600", 1600, "N&B", "bw", "N&B rapide et contrasté"],
  ["apx25", "Agfa APX 25", 25, "N&B", "bw", "N&B Agfa lent et très fin"],
  ["apx100", "Agfa APX 100", 100, "N&B", "bw", "N&B Agfa classique"],
  ["retro80s", "Rollei Retro 80S", 80, "N&B", "bw", "Rouge étendu, ciels sombres"],
  ["retro100", "Rollei Retro 100 Tonal", 100, "N&B", "bw", "N&B doux et tonal"],
  ["ortho25", "Rollei Ortho 25", 25, "N&B", "bw", "Orthochromatique : les rouges foncent"],
  ["ir400", "Rollei Infrared 400", 400, "N&B", "bw", "Touche d’infrarouge, feuillages lumineux"],

  ["cinestill800t", "CineStill 800T", 800, "C-41", "cine", "Film cinéma tungstène : la nuit vire au bleu"],
  ["cinestill400t", "CineStill 400T", 400, "C-41", "cine", "Couleur cinéma, plus douce que la 800T"],
  ["kodak2383", "Kodak Vision 2383", 200, "ECP", "cine", "Copie cinéma : ombres sarcelle"],
  ["kodak2393", "Kodak Vision 2393", 200, "ECP", "cine", "Copie cinéma, noirs plus riches"],
  ["fuji3510", "Fujifilm Eterna 3510", 200, "ECP", "cine", "Copie Fuji, couleur douce"],
  ["fuji3513", "Fujifilm Eterna 3513", 200, "ECP", "cine", "Copie Fuji pour masters numériques"]
];

/*
 * Modèle paramétrique (films sans LUT). Valeurs choisies à l'œil pour Fuji Looks.
 *   slope   pente de la courbe en S (par diaph), par canal
 *   offset  décalage du point milieu par canal, en diaphs (positif = canal plus sombre)
 *   black / white  densité minimale et maximale du tirage, par canal
 *   sat     saturation finale
 */
const FILM_MODELS = {
  gold200: { slope: [1.12, 1.1, 1.04], offset: [-0.22, -0.04, 0.24], black: [0.035, 0.028, 0.02], white: [0.985, 0.955, 0.86], sat: 1.1 },
  cinestill800t: { slope: [1.16, 1.15, 1.12], offset: [-0.06, 0, -0.04], black: [0.02, 0.032, 0.05], white: [0.975, 0.965, 0.955], sat: 0.95 },
  cinestill400t: { slope: [1.1, 1.1, 1.07], offset: [-0.05, 0, -0.03], black: [0.02, 0.03, 0.042], white: [0.975, 0.965, 0.955], sat: 0.94 }
};

// Films équilibrés pour la lumière tungstène (3200 K).
const FILM_TUNGSTEN = new Set(["cinestill800t", "cinestill400t"]);

const FILMS = FILM_LIST.map(([key, name, iso, process, shelf, tag]) => {
  const kind = shelf === "cine" ? (process === "ECP" ? "print" : "cine")
    : shelf === "slide" ? (process === "X-PRO" ? "xpro" : "slide") : shelf;
  return { key, name, iso, process, shelf, tag, kind, tungsten: FILM_TUNGSTEN.has(key) };
});
const filmByKey = new Map(FILMS.map((film) => [film.key, film]));

// --- Formats du négatif ----------------------------------------------------------

/*
 * Dimensions réelles, en mm, avec le film déroulé à l'horizontale :
 *   along   longueur de la vue le long du film     across  hauteur de la vue en travers du film
 *   film    largeur du film (35 mm ou 120)          gap     intervalle entre deux vues
 *   perfs   perforations (35 mm seulement)          pair    deux vues par vue 24×36 (demi-format)
 */
const FILM_FORMATS = {
  "135": { label: "24×36", along: 36, across: 24, film: 35, gap: 2, perfs: true },
  half: { label: "Demi-format", along: 18, across: 24, film: 35, gap: 1, perfs: true, pair: true },
  pano: { label: "Panoramique 24×65", along: 65, across: 24, film: 35, gap: 2.5, perfs: true },
  "645": { label: "6×4,5", along: 41.5, across: 56, film: 61.5, gap: 5 },
  "66": { label: "6×6", along: 56, across: 56, film: 61.5, gap: 5 },
  "67": { label: "6×7", along: 69.5, across: 56, film: 61.5, gap: 5 },
  "69": { label: "6×9", along: 84, across: 56, film: 61.5, gap: 5 }
};

function filmFormatOf(key) {
  return FILM_FORMATS[key] || FILM_FORMATS["135"];
}

/*
 * Le grain, le halo et la douceur ont une taille fixe sur le film, en micromètres. Rapportés à la
 * photo, ils grossissent quand la vue est petite (demi-format) et s'affinent sur un grand négatif
 * (6×9). Facteur relatif au 24×36, sur lequel les réglages sont calibrés : 1,5 en demi-format, 0,43 en 6×9.
 */
function formatScale(key) {
  const f = filmFormatOf(key);
  return 36 / Math.max(f.along, f.across);
}

// --- Réglages par défaut d'une pellicule -------------------------------------------

// Plus le film est rapide, plus le grain est fort et gros (0 à 7 diaphs au-dessus de 25 ISO).
function filmSpeedSteps(iso) {
  return Math.max(0, Math.min(7, Math.log2(iso / 25)));
}

function filmDefaults(film) {
  const steps = filmSpeedSteps(film.iso);
  let grain = 14 + 7 * steps;
  if (film.kind === "slide" || film.kind === "xpro") grain *= 0.7;
  if (film.kind === "print") grain = 12;
  const halation = film.kind === "cine" ? (film.key === "cinestill800t" ? 70 : 50)
    : film.kind === "neg" ? 12 : film.kind === "print" ? 8 : 6;
  const softness = film.kind === "cine" ? 30 : film.kind === "neg" ? 25 : film.kind === "bw" ? 20 : 15;
  // Coupleurs DIR : les diapos en ont le plus (couleurs franches, bords nets), les copies cinéma le moins.
  const couplers = film.kind === "slide" || film.kind === "xpro" ? 35 : film.kind === "print" ? 15 : film.kind === "bw" ? 15 : 25;
  return {
    push: 0,
    couplers,
    grade: 2,
    filterY: 0,
    filterM: 0,
    ev: film.kind === "neg" ? 0.2 : 0,
    balance: film.tungsten ? "tungsten" : "day",
    grain: Math.round(grain),
    grainSize: "auto",
    halation,
    softness
  };
}

// Description complète d'un rendu pellicule : simple objet JSON, transmis tel quel au worker.
function filmSpec(key, settings) {
  const film = filmByKey.get(key);
  return Object.assign({ film: key, name: film.name }, filmDefaults(film), settings || {});
}

function isFilmSpec(look) {
  return Boolean(look && look.film && filmByKey.has(look.film));
}

// --- LUT des films (chargées à la demande) ------------------------------------------

let filmLutTables = null;

function filmLutsReady() {
  if (filmLutTables) return true;
  const pack = self.FILM_LUTS;
  if (!pack) return false;
  const bytes = Uint8Array.from(atob(pack.data), (c) => c.charCodeAt(0));
  const size = pack.n ** 3 * 3;
  filmLutTables = { n: pack.n, map: new Map() };
  pack.keys.forEach((key, i) => filmLutTables.map.set(key, bytes.subarray(i * size, (i + 1) * size)));
  return true;
}

function filmHasLut(key) {
  return filmLutsReady() && filmLutTables.map.has(key);
}

// Lecture trilinéaire d'une LUT 8 bits n³ (rouge le plus rapide, comme un .cube).
function sampleFilmLut(table, n, r, g, b, out) {
  const n1 = n - 1;
  const fr = Math.min(n1, Math.max(0, r * n1));
  const fg = Math.min(n1, Math.max(0, g * n1));
  const fb = Math.min(n1, Math.max(0, b * n1));
  const r0 = Math.min(n1 - 1, fr | 0), g0 = Math.min(n1 - 1, fg | 0), b0 = Math.min(n1 - 1, fb | 0);
  const dr = fr - r0, dg = fg - g0, db = fb - b0;
  const nn = n * n;
  const base = (r0 + g0 * n + b0 * nn) * 3, gO = n * 3, bO = nn * 3;
  for (let j = 0; j < 3; j++) {
    const p = base + j;
    const c00 = table[p] + (table[p + 3] - table[p]) * dr;
    const c10 = table[p + gO] + (table[p + gO + 3] - table[p + gO]) * dr;
    const c01 = table[p + bO] + (table[p + bO + 3] - table[p + bO]) * dr;
    const c11 = table[p + gO + bO] + (table[p + gO + bO + 3] - table[p + gO + bO]) * dr;
    const c0 = c00 + (c10 - c00) * dg, c1 = c01 + (c11 - c01) * dg;
    out[j] = (c0 + (c1 - c0) * db) / 255;
  }
}

const filmSrgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const filmLinearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// Hautes lumières compressées doucement au lieu d'être coupées net (exposition poussée).
function softClip(v) {
  return v <= 0.8 ? v : 0.8 + 0.2 * (1 - Math.exp(-(v - 0.8) / 0.2));
}

// Gains R, V, B d'un film tungstène (3200 K) exposé en lumière du jour : l'image vire au bleu.
function filmBalanceGains(spec) {
  if (spec.balance !== "tungsten") return [1, 1, 1];
  const scene = kelvinToLinearRgb(5500);
  const film = kelvinToLinearRgb(3200);
  const gains = scene.map((v, i) => v / film[i]);
  const luma = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
  return gains.map((g) => g / luma);
}

// Courbe en S du modèle paramétrique, en diaphs autour du gris moyen (18 %).
function filmModelColor(model, lin, out) {
  for (let c = 0; c < 3; c++) {
    const e = Math.log2(Math.max(lin[c], 1e-5) / 0.18) - model.offset[c];
    const y = 1 / (1 + Math.exp(-model.slope[c] * e));
    out[c] = model.black[c] + (model.white[c] - model.black[c]) * y;
  }
  const l = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
  for (let c = 0; c < 3; c++) out[c] = Math.min(1, Math.max(0, l + (out[c] - l) * model.sat));
}

// --- Développement et tirage ---------------------------------------------------------

/*
 * Développement poussé (+1, +2 IL) ou retenu (−1 IL) : le film exposé à une autre sensibilité est
 * développé plus ou moins longtemps. Poussé : plus de contraste, des ombres plus denses, un grain
 * plus gros. Retenu : plus doux, grain plus fin.
 *
 * Tirage : grade du papier (0 doux à 5 dur, 2 normal) et filtration de l'agrandisseur en unités CC.
 * Comme en chambre noire : ajouter du jaune rend le tirage plus bleu, ajouter du magenta le rend plus vert.
 */
const PAPER_GRADES = [0.72, 0.86, 1, 1.15, 1.32, 1.52];
const CC_STOP = 0.005; // effet d'une unité CC sur la lumière du canal, en log10

function printStage(spec) {
  const push = Math.max(-1, Math.min(2, Number(spec.push) || 0));
  const grade = PAPER_GRADES[Math.max(0, Math.min(5, Math.round(Number(spec.grade ?? 2))))];
  const y = Number(spec.filterY) || 0;
  const m = Number(spec.filterM) || 0;
  const gains = [1, 10 ** (m * CC_STOP), 10 ** (y * CC_STOP)];
  const luma = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
  const mono = filmByKey.get(spec.film).shelf === "bw";
  return {
    contrast: grade * (1 + 0.16 * push),
    gains: mono ? [1, 1, 1] : gains.map((g) => g / luma),
    // Inhibition entre couches (coupleurs DIR) : couleurs plus séparées. Sans effet en N&B.
    sat: mono ? 1 : 1 + 0.3 * ((Number(spec.couplers) || 0) / 100)
  };
}

// Courbe de contraste qui garde le noir et le blanc du papier (puissance symétrique autour du gris).
function paperCurve(v, c) {
  if (c === 1) return v;
  return v < 0.5 ? 0.5 * (2 * v) ** c : 1 - 0.5 * (2 * (1 - v)) ** c;
}

function applyPrintStage(stage, out) {
  if (stage.gains[1] !== 1 || stage.gains[2] !== 1 || stage.gains[0] !== 1) {
    for (let c = 0; c < 3; c++) out[c] = filmLinearToSrgb(Math.min(1, filmSrgbToLinear(out[c]) * stage.gains[c]));
  }
  for (let c = 0; c < 3; c++) out[c] = paperCurve(Math.min(1, Math.max(0, out[c])), stage.contrast);
  if (stage.sat !== 1) {
    const l = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
    for (let c = 0; c < 3; c++) out[c] = Math.min(1, Math.max(0, l + (out[c] - l) * stage.sat));
  }
}

// LUT 3D finale (exposition, équilibrage, couleur du film, développement, tirage), au format de FR.applyLut.
const filmLutCache = new Map();

function bakeFilmLut(spec, size = 33) {
  const stage = printStage(spec);
  const key = `${spec.film}|${spec.ev}|${spec.balance}|${size}|${filmHasLut(spec.film)}|${JSON.stringify(stage)}`;
  if (filmLutCache.has(key)) return filmLutCache.get(key);
  const gains = filmBalanceGains(spec);
  const exposure = 2 ** (Number(spec.ev) || 0);
  const table = filmHasLut(spec.film) ? filmLutTables.map.get(spec.film) : null;
  const model = FILM_MODELS[spec.film] || { slope: [1.1, 1.1, 1.1], offset: [0, 0, 0], black: [0.03, 0.03, 0.03], white: [0.96, 0.96, 0.96], sat: 1 };
  const lut = new Float32Array(size ** 3 * 3);
  const lin = [0, 0, 0];
  const enc = [0, 0, 0];
  const out = [0, 0, 0];
  let p = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        [r, g, b].forEach((v, c) => { lin[c] = filmSrgbToLinear(v / (size - 1)) * exposure * gains[c]; });
        if (table) {
          for (let c = 0; c < 3; c++) enc[c] = softClip(filmLinearToSrgb(Math.max(0, lin[c])));
          sampleFilmLut(table, filmLutTables.n, enc[0], enc[1], enc[2], out);
        } else {
          filmModelColor(model, lin, out);
        }
        applyPrintStage(stage, out);
        lut[p++] = out[0];
        lut[p++] = out[1];
        lut[p++] = out[2];
      }
    }
  }
  if (filmLutCache.size > 24) filmLutCache.delete(filmLutCache.keys().next().value);
  filmLutCache.set(key, lut);
  return lut;
}

// Fichier .cube (Adobe / Resolve) : la couleur (développement et tirage compris), sans grain ni halation.
function filmCubeText(spec, size) {
  const lut = bakeFilmLut(spec, size);
  const lines = [
    `TITLE "${spec.name.replace(/"/g, "")}"`,
    "# Fuji Looks — pellicule (couleur seule). Entrée et sortie : sRGB.",
    `LUT_3D_SIZE ${size}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  for (let i = 0; i < lut.length; i += 3) lines.push(`${lut[i].toFixed(6)} ${lut[i + 1].toFixed(6)} ${lut[i + 2].toFixed(6)}`);
  return lines.join("\n") + "\n";
}

// --- Texture : douceur et grain -------------------------------------------------------

// Flou en boîte séparable (deux passes), en place sur une copie des pixels.
function boxBlurRgb(data, w, h, radius) {
  const tmp = new Float32Array(w * h * 3);
  const out = new Uint8ClampedArray(data.length);
  const span = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += data[(y * w + Math.min(w - 1, Math.max(0, k))) * 4 + c];
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 3 + c] = acc / span;
        const add = Math.min(w - 1, x + radius + 1), sub = Math.max(0, x - radius);
        acc += data[(y * w + add) * 4 + c] - data[(y * w + sub) * 4 + c];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += tmp[(Math.min(h - 1, Math.max(0, k)) * w + x) * 3 + c];
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * 4 + c] = acc / span;
        const add = Math.min(h - 1, y + radius + 1), sub = Math.max(0, y - radius);
        acc += tmp[(add * w + x) * 3 + c] - tmp[(sub * w + x) * 3 + c];
      }
    }
  }
  return out;
}

// Douceur optique : mélange avec une version légèrement floue (rayon proportionnel à la photo).
function applyFilmSoftness(img, amount, grainWidth, scale = 1) {
  if (!amount) return;
  // Sur une petite image, un rayon d'un pixel est déjà trop : on dose le mélange.
  const exact = (grainWidth / 2400) * (0.6 + amount / 60) * scale;
  const radius = Math.max(1, Math.round(exact));
  const mix = (amount / 100) * 0.7 * Math.min(1, exact);
  if (mix < 0.02) return;
  const blur = boxBlurRgb(img.data, img.width, img.height, radius);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] += (blur[i] - d[i]) * mix;
    d[i + 1] += (blur[i + 1] - d[i + 1]) * mix;
    d[i + 2] += (blur[i + 2] - d[i + 2]) * mix;
  }
}

const GRAIN_SIZES = { fine: 0.8, medium: 1.3, coarse: 2 };

function hashNoise(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295 - 0.5;
}

// Grain argentique : bruit de luminance, plus fort dans les tons moyens, taille liée au film.
// Taille en pixels d'une photo 24×36 de 3000 px de large, ramenée à la résolution rendue et au format.
function applyFilmGrain(img, spec, grainWidth) {
  const amount = (Number(spec.grain) || 0) / 100;
  if (!amount) return;
  const film = filmByKey.get(spec.film);
  // Développement poussé : grain plus gros et plus marqué ; retenu : plus fin.
  const push = Math.max(-1, Math.min(2, Number(spec.push) || 0));
  const base = (GRAIN_SIZES[spec.grainSize] || 0.7 + 0.13 * filmSpeedSteps(film.iso)) * (1 + 0.12 * push);
  // Format du négatif : un petit négatif est plus agrandi, son grain est plus gros et plus marqué.
  const scale = formatScale(spec.format);
  const exact = (base * grainWidth * scale) / 3000;
  const cell = Math.max(1, exact);
  // Grain plus petit qu'un pixel : il se moyenne, donc il se voit moins.
  const amp = amount * 46 * Math.min(1, Math.sqrt(exact)) * scale ** 0.35 * (1 + 0.3 * push);
  const { width: w, height: h, data: d } = img;
  const mono = film.shelf === "bw";
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = gy | 0, fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = gx | 0, fx = gx - x0;
      // Bruit lissé entre les cellules (moins « pixel »), deux octaves pour un aspect organique.
      const a = hashNoise(x0, y0, 1), b = hashNoise(x0 + 1, y0, 1);
      const c = hashNoise(x0, y0 + 1, 1), e = hashNoise(x0 + 1, y0 + 1, 1);
      const n1 = (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
      const n2 = hashNoise((gx * 2.3) | 0, (gy * 2.3) | 0, 7);
      const n = n1 * 0.75 + n2 * 0.45;
      const i = (y * w + x) * 4;
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const delta = n * amp * (0.3 + 0.7 * 4 * l * (1 - l));
      if (mono) {
        d[i] += delta; d[i + 1] += delta; d[i + 2] += delta;
      } else {
        // Négatif couleur : un peu de grain chromatique, comme les trois couches du film.
        d[i] += delta * 1.05 + hashNoise(x0, y0, 11) * amp * 0.12;
        d[i + 1] += delta;
        d[i + 2] += delta * 1.1 + hashNoise(x0, y0, 23) * amp * 0.16;
      }
    }
  }
}

/*
 * Effet de bord des coupleurs DIR (et du révélateur en N&B) : près d'une limite claire / sombre,
 * le côté clair se densifie et le côté sombre s'éclaircit. Netteté « chimique » sur un rayon de
 * quelques dizaines de micromètres, mis à l'échelle du format.
 */
function applyFilmCouplers(img, amount, grainWidth, scale = 1) {
  const a = amount / 100;
  if (a < 0.02) return;
  const exact = (grainWidth / 1100) * scale;
  const radius = Math.max(1, Math.round(exact));
  const k = a * 0.9 * Math.min(1, exact);
  if (k < 0.02) return;
  const blur = boxBlurRgb(img.data, img.width, img.height, radius);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const lb = 0.2126 * blur[i] + 0.7152 * blur[i + 1] + 0.0722 * blur[i + 2];
    const delta = (l - lb) * k;
    d[i] += delta;
    d[i + 1] += delta;
    d[i + 2] += delta;
  }
}

// Rendu complet d'une pellicule (la halation est ajoutée ensuite, avec celle de la retouche).
function renderFilm(src, spec, strength, grainWidth = src.width) {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  if (strength <= 0) return out;
  FR.applyLut(src.data, out.data, w, h, bakeFilmLut(spec, 33), 33, 0);
  applyFilmCouplers(out, Number(spec.couplers) || 0, grainWidth, formatScale(spec.format));
  applyFilmSoftness(out, Number(spec.softness) || 0, grainWidth, formatScale(spec.format));
  applyFilmGrain(out, spec, grainWidth);
  if (strength < 1) {
    const a = src.data;
    const b = out.data;
    for (let i = 0; i < b.length; i += 4) {
      b[i] = a[i] + (b[i] - a[i]) * strength;
      b[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * strength;
      b[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * strength;
    }
  }
  return out;
}
