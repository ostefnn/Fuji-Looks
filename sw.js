/* Fuji Looks — Service worker : l'app s'installe et fonctionne hors connexion. */
const CACHE = "fuji-looks-v1";

// Fichiers de l'app, mis en cache dès l'installation.
const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "vendor/fonts/great-vibes-latin-400-normal.woff2",
  "vendor/fuji-recipe-converter/data.js",
  "vendor/fuji-recipe-converter/engine.js",
  "vendor/fuji-recipe-converter/export.js",
  "vendor/fuji-recipe-converter/parser.js",
  "vendor/qrcode/qrcode.js",
  "custom-recipes.js",
  "js/pipeline.js",
  "js/export-worker.js",
  "js/state.js",
  "js/catalog.js",
  "js/render.js",
  "js/looks.js",
  "js/editor.js",
  "js/history.js",
  "js/preview.js",
  "js/photo.js",
  "js/zoom.js",
  "js/recipe-import.js",
  "js/recipe-export.js",
  "js/library.js",
  "js/photo-export.js",
  "js/frame.js",
  "js/exif.js",
  "js/edit.js",
  "js/recipe-card.js",
  "js/fp1.js",
  "js/cameras.js",
  "js/share.js",
  "js/creations.js",
  "js/main.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // OCR et décodeur HEIC : gros fichiers qui ne changent pas, servis depuis le cache une fois chargés.
  if (/\/vendor\/(tesseract|heic)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // Le reste : réseau d'abord (toujours la dernière version en ligne), cache si hors connexion.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then((cached) => cached || (request.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
