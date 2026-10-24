
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const placeholder = document.getElementById("placeholder");
const photoLabel = document.getElementById("photoLabel");
const photoFrame = document.getElementById("photoFrame");
const intensity = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");
const exportButton = document.getElementById("exportButton");
const resetButton = document.getElementById("resetButton");
const statusMessage = document.getElementById("statusMessage");
const lookCards = document.querySelectorAll(".look-card");

let originalImage = null;
let currentLook = "original";
let imageUrl = null;

function getStrength() {
  return Number(intensity.value) / 100;
}

// Effets prototypes : ils pourront être affinés plus tard.
function getFilter(look, strength) {
  switch (look) {
    case "soft":
      return [
        `brightness(${1 + 0.08 * strength})`,
        `contrast(${1 - 0.12 * strength})`,
        `saturate(${1 - 0.12 * strength})`,
        `sepia(${0.08 * strength})`
      ].join(" ");

    case "warm":
      return [
        `brightness(${1 + 0.04 * strength})`,
        `saturate(${1 + 0.18 * strength})`,
        `sepia(${0.35 * strength})`
      ].join(" ");

    case "mono":
      return `grayscale(${strength})`;

    default:
      return "none";
  }
}

function updatePreview() {
  const strength = getStrength();

  intensityValue.textContent = `${Math.round(strength * 100)}%`;

  photoPreview.style.filter = getFilter(currentLook, strength);

  const names = {
    original: "ORIGINAL",
    soft: "SOFT",
    warm: "GOLDEN",
    mono: "MONOCHROME"
  };

  photoLabel.textContent = names[currentLook];
  photoLabel.hidden = !originalImage;

  lookCards.forEach((card) => {
    const selected = card.dataset.look === currentLook;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    statusMessage.textContent = "Choisis un fichier image valide.";
    return;
  }

  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }

  imageUrl = URL.createObjectURL(file);
  const newImage = new Image();

  newImage.onload = () => {
    originalImage = newImage;
    photoPreview.src = imageUrl;
    photoPreview.hidden = false;
    placeholder.hidden = true;
    exportButton.disabled = false;

    currentLook = "original";
    intensity.value = 100;

    updatePreview();
    statusMessage.textContent =
      "Photo chargée. Choisis un look pour commencer.";
  };

  newImage.onerror = () => {
    statusMessage.textContent =
      "Impossible de lire cette image. Essaie un autre fichier.";
    URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  };

  newImage.src = imageUrl;
});

lookCards.forEach((card) => {
  card.addEventListener("click", () => {
    currentLook = card.dataset.look;
    updatePreview();

    statusMessage.textContent = originalImage
      ? "Rendu appliqué à l’aperçu."
      : "Importe une photo pour voir ce rendu.";
  });
});

intensity.addEventListener("input", updatePreview);

resetButton.addEventListener("click", () => {
  currentLook = "original";
  intensity.value = 100;
  updatePreview();

  statusMessage.textContent = originalImage
    ? "Aperçu réinitialisé."
    : "Choisis une photo pour commencer.";
});

function renderExport() {
  return new Promise((resolve, reject) => {
    if (!originalImage) {
      reject(new Error("Aucune photo sélectionnée."));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Canvas indisponible."));
      return;
    }

    context.filter = getFilter(currentLook, getStrength());
    context.drawImage(originalImage, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("La création de l’image a échoué."));
      }
    }, "image/jpeg", 0.94);
  });
}

exportButton.addEventListener("click", async () => {
  if (!originalImage) return;

  exportButton.disabled = true;
  statusMessage.textContent = "Préparation de la photo…";

  try {
    const blob = await renderExport();
    const exportUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = exportUrl;
    link.download = "fuji-looks.jpg";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    statusMessage.textContent =
      "Export préparé. Si le téléchargement ne démarre pas, ouvre l’image ou utilise le menu de partage de Safari.";

    // Garder l'URL disponible un moment pour laisser le navigateur
    // démarrer le téléchargement, notamment sur mobile.
    setTimeout(() => URL.revokeObjectURL(exportUrl), 60000);
  } catch (error) {
    statusMessage.textContent =
      "Export impossible. Essaie avec une photo plus petite.";
    console.error(error);
  } finally {
    exportButton.disabled = false;
  }
});

updatePreview();
