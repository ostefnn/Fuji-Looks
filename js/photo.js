/* Fuji Looks — Import de photo (JPEG, PNG, HEIC), glisser-déposer, Avant / Après. */
// --- Import de photo -----------------------------------------------------

// Photos iPhone (.heic / .heif) : souvent sans type MIME, on vérifie aussi le nom.
function isHeicFile(file) {
  return /^image\/hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || "");
}

function isImageFile(file) {
  return /^image\//.test(file.type || "") || isHeicFile(file);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} introuvable`));
    document.head.appendChild(script);
  });
}

let heicLoading = null;
function loadHeicDecoder() {
  if (window.HeicTo) return Promise.resolve();
  heicLoading ||= loadScript("vendor/heic/heic-to.js").catch((err) => {
    heicLoading = null;
    throw err;
  });
  return heicLoading;
}

function decodeNatively(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    img.src = url;
  });
}

// Comme dans le convertisseur : Safari lit le HEIC lui-même, les autres navigateurs le convertissent localement.
async function loadImage(blob) {
  try {
    return await decodeNatively(blob);
  } catch (err) {
    if (!isHeicFile(blob)) throw err;
    await loadHeicDecoder();
    return decodeNatively(await window.HeicTo({ blob, type: "image/jpeg", quality: 0.92 }));
  }
}

function setSource(drawable, w, h) {
  originalImage = drawable;
  sourceSize = { w, h };

  previewSource = drawToImageData(drawable, w, h, PREVIEW_MAX_SIDE);
  photoPreview.width = previewSource.width;
  photoPreview.height = previewSource.height;
  photoPreview.hidden = false;
  zoomControls.hidden = false;
  placeholder.hidden = true;
  sampleButton.hidden = true;
  exportButton.disabled = false;
  compareButton.hidden = false;
  changePhotoButton.hidden = false;
  document.body.classList.add("has-photo");
  resetZoom();

  intensity.value = 100;
  intensityState = "100";
  sourceToken++;
  updatePreview();
  renderThumbnails(drawable, w, h);
}

async function loadFile(file) {
  if (!file) return;

  if (!isImageFile(file)) {
    showStatus("Choisis un fichier image valide.");
    return;
  }

  if (isHeicFile(file)) showStatus("Ouverture de la photo iPhone…");
  try {
    const img = await loadImage(file);
    sourceExif = await readExif(file);
    setSource(img, img.naturalWidth, img.naturalHeight);
    showStatus("Photo chargée. Maintiens « Avant / Après » pour comparer.");
  } catch {
    showStatus("Impossible de lire cette image. Essaie un autre fichier.");
  }
}

photoInput.addEventListener("change", () => {
  loadFile(photoInput.files?.[0]);
  photoInput.value = "";
});

// Glisser-déposer sur le cadre photo (et sur toute la page).
["dragenter", "dragover"].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    photoFrame.classList.add("dragging");
  });
});

document.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) photoFrame.classList.remove("dragging");
});

// Une image déposée devient la photo ; un fichier de recette (.txt, .json, .FP1…) est importé.
document.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault();
  photoFrame.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (isImageFile(file)) loadFile(file);
  else importRecipeFile(file);
});

intensity.addEventListener("input", () => {
  commit("intensity");
  intensityState = intensity.value;
  schedulePreview();
});

// Avant / Après : maintenir le bouton (ou l'image) affiche l'original ;
// au clavier, le bouton bascule entre les deux.
function setComparing(value) {
  if (comparing === value) return;
  comparing = value;
  compareButton.setAttribute("aria-pressed", String(value));
  schedulePreview();
}

compareButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  compareButton.setPointerCapture?.(event.pointerId);
  setComparing(true);
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
  compareButton.addEventListener(type, () => setComparing(false));
});
compareButton.addEventListener("contextmenu", (event) => event.preventDefault());
