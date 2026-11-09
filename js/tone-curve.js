/* Fuji Looks — Courbes de tons : interpolation et tables, partagées par la page et le worker d'export.
 *
 * Une courbe est une liste de points [x, y] (0 à 255), triés par x. Entre les points, l'interpolation
 * est monotone (Fritsch-Carlson) : la courbe ne fait pas de bosse entre deux points proches. Avant le
 * premier point et après le dernier, elle reste plate (comme dans Lightroom ou NX Studio).
 */

const CURVE_CHANNELS = ["rgb", "r", "g", "b"];
const CURVE_DEFAULT = [[0, 0], [255, 255]];
const CURVE_MAX_POINTS = 16;

function curveIsIdentity(points) {
  return !points || points.every(([x, y]) => x === y);
}

// Courbes de la retouche : { rgb, r, g, b }, null ou absente quand rien ne change.
function curvesActive(curves) {
  return Boolean(curves) && CURVE_CHANNELS.some((key) => !curveIsIdentity(curves[key]));
}

// Valeurs (0 à 1) de la courbe pour `size` entrées réparties de 0 à 255.
function curveTable(points, size = 256) {
  const pts = (points && points.length >= 2 ? points : CURVE_DEFAULT)
    .map(([x, y]) => [Math.max(0, Math.min(255, x)), Math.max(0, Math.min(255, y))])
    .sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  // Pentes des segments, puis tangentes aux points (Fritsch-Carlson).
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push(xs[i + 1] > xs[i] ? (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) : 0);
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  const out = new Float32Array(size);
  let seg = 0;
  for (let k = 0; k < size; k++) {
    const x = size > 1 ? (k * 255) / (size - 1) : 0;
    let y;
    if (x <= xs[0]) y = ys[0];
    else if (x >= xs[n - 1]) y = ys[n - 1];
    else {
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const h = xs[seg + 1] - xs[seg];
      const t = h > 0 ? (x - xs[seg]) / h : 0;
      const t2 = t * t;
      const t3 = t2 * t;
      y = (2 * t3 - 3 * t2 + 1) * ys[seg] + (t3 - 2 * t2 + t) * h * m[seg] +
        (-2 * t3 + 3 * t2) * ys[seg + 1] + (t3 - t2) * h * m[seg + 1];
    }
    out[k] = Math.max(0, Math.min(255, y)) / 255;
  }
  return out;
}

// Courbe d'un Picture Control Nikon : 257 valeurs de 0 à 32767 (entrée i / 256), ramenées à 256 entrées.
function rawCurveTable(raw) {
  const out = new Float32Array(256);
  for (let k = 0; k < 256; k++) {
    const f = (k * 256) / 255;
    const i = Math.min(255, Math.floor(f));
    const t = f - i;
    out[k] = Math.max(0, Math.min(1, ((raw[i] || 0) * (1 - t) + (raw[i + 1] || 0) * t) / 32767));
  }
  return out;
}

// Points -> 257 valeurs au format Nikon (pour écrire un .NP3).
function curveToRaw(points) {
  return Array.from(curveTable(points, 257), (v) => Math.round(v * 32767));
}

// Table 8 bits d'une courbe (entrée 0..255 -> sortie 0..255).
function curveBytes(points) {
  const t = curveTable(points);
  const out = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) out[i] = Math.round(t[i] * 255);
  return out;
}

// Applique les courbes { rgb, r, g, b } à une ImageData : la courbe RVB, puis celle de chaque couche.
function applyCurves(imageData, curves) {
  if (!curvesActive(curves)) return imageData;
  const master = curveBytes(curves.rgb);
  const [tr, tg, tb] = ["r", "g", "b"].map((key) => {
    const own = curveBytes(curves[key]);
    const table = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) table[i] = own[master[i]];
    return table;
  });
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = tr[d[i]];
    d[i + 1] = tg[d[i + 1]];
    d[i + 2] = tb[d[i + 2]];
  }
  return imageData;
}
