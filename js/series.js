/* Fuji Looks — Série de photos : même recette et même retouche, export de toute la série. */

const seriesStrip = document.getElementById("seriesStrip");
const seriesList = document.getElementById("seriesList");
const seriesCount = document.getElementById("seriesCount");
const seriesExportButton = document.getElementById("seriesExportButton");
const seriesExportPanelButton = document.getElementById("seriesExportPanelButton"); // même action, dans « Exporter et partager »
const seriesInput = document.getElementById("seriesInput");

let series = []; // [{ file, thumb }]
let seriesIndex = -1;
let seriesBusy = false;

// Une photo : comme avant. Plusieurs : une série, en commençant par la première.
async function loadPhotos(files) {
  const images = files.filter(isImageFile);
  if (!images.length) {
    if (files.length) showStatus("Choisis un fichier image valide.");
    return;
  }
  if (images.length === 1) {
    clearSeries();
    await loadFile(images[0]);
    return;
  }
  series = images.map((file) => ({ file, thumb: "" }));
  seriesIndex = 0;
  renderSeries();
  await loadFile(series[0].file, { quiet: true });
  showStatus(`${images.length} photos chargées : la recette et la retouche s’appliquent à toute la série.`);
  makeSeriesThumbs();
}

function clearSeries() {
  series = [];
  seriesIndex = -1;
  renderSeries();
}

// Vignettes calculées l'une après l'autre (une photo décodée à la fois).
async function makeSeriesThumbs() {
  for (const item of series) {
    if (item.thumb) continue;
    try {
      const img = await loadImage(item.file);
      const k = 112 / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = makeCanvas(Math.max(1, Math.round(img.naturalWidth * k)), Math.max(1, Math.round(img.naturalHeight * k)));
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      item.thumb = canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      item.thumb = "broken";
    }
    if (series.includes(item)) renderSeries();
  }
}

function renderSeries() {
  const active = series.length > 1;
  seriesStrip.hidden = !active;
  seriesExportPanelButton.hidden = !active;
  document.body.classList.toggle("has-series", active);
  seriesList.textContent = "";
  if (!active) return;
  seriesCount.textContent = `${seriesIndex + 1} / ${series.length}`;
  seriesExportButton.textContent = `Exporter les ${series.length} photos`;
  seriesExportPanelButton.textContent = `Exporter les ${series.length} photos de la série`;
  series.forEach((item, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "series-thumb";
    button.setAttribute("aria-label", `Photo ${i + 1} : ${item.file.name}`);
    button.setAttribute("aria-current", String(i === seriesIndex));
    button.title = item.file.name;
    if (item.thumb && item.thumb !== "broken") {
      const img = document.createElement("img");
      img.src = item.thumb;
      img.alt = "";
      button.appendChild(img);
    } else {
      button.textContent = String(i + 1);
    }
    button.addEventListener("click", () => openSeriesItem(i));
    const remove = document.createElement("span");
    remove.className = "series-remove";
    remove.textContent = "✕";
    remove.setAttribute("role", "button");
    remove.setAttribute("aria-label", `Retirer la photo ${i + 1} de la série`);
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeSeriesItem(i);
    });
    button.appendChild(remove);
    seriesList.appendChild(button);
  });
  seriesList.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

async function openSeriesItem(i) {
  if (seriesBusy || i === seriesIndex) return;
  seriesIndex = i;
  renderSeries();
  await loadFile(series[i].file, { keepEdit: true, quiet: true });
}

function removeSeriesItem(i) {
  if (seriesBusy) return;
  series.splice(i, 1);
  if (series.length < 2) {
    // Il reste une seule photo : on la garde affichée, sans série.
    const last = series[0];
    const wasCurrent = i === seriesIndex;
    clearSeries();
    if (last && wasCurrent) loadFile(last.file, { keepEdit: true, quiet: true });
    return;
  }
  if (i === seriesIndex) {
    seriesIndex = Math.min(i, series.length - 1);
    loadFile(series[seriesIndex].file, { keepEdit: true, quiet: true });
  } else if (i < seriesIndex) {
    seriesIndex--;
  }
  renderSeries();
}

// Ajouter des photos à la série en cours (ou en créer une avec la photo affichée).
seriesInput.addEventListener("change", async () => {
  const files = [...(seriesInput.files || [])].filter(isImageFile);
  seriesInput.value = "";
  if (!files.length) return;
  series.push(...files.map((file) => ({ file, thumb: "" })));
  renderSeries();
  makeSeriesThumbs();
  showStatus(`${files.length} photo${files.length > 1 ? "s" : ""} ajoutée${files.length > 1 ? "s" : ""} à la série.`);
});

function seriesBaseName(file) {
  return (file.name || "photo").replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";
}

// Export de toute la série : chaque photo est décodée, rendue et encodée l'une après l'autre,
// avec la recette, la retouche, le cadre et la taille d'export en cours.
async function exportSeries() {
  if (seriesBusy || series.length < 2) return;
  seriesBusy = true;
  const saved = { originalImage, originalSize, sourceSize, sourceExif };
  const files = [];
  seriesExportButton.disabled = seriesExportPanelButton.disabled = true;
  exportButton.disabled = true;
  try {
    for (let i = 0; i < series.length; i++) {
      seriesExportButton.textContent = seriesExportPanelButton.textContent = `Photo ${i + 1} / ${series.length}…`;
      await new Promise((r) => setTimeout(r, 30)); // laisse le navigateur afficher la progression
      const item = series[i];
      let img;
      let exif;
      if (i === seriesIndex) {
        img = saved.originalImage;
        exif = saved.sourceExif;
      } else {
        img = await loadImage(item.file);
        exif = await readExif(item.file);
      }
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      originalImage = img;
      originalSize = { w, h };
      const g = isIdentityEdit() ? originalSize : editGeometry(w, h);
      sourceSize = { w: g.w, h: g.h };
      sourceExif = exif;
      const blob = await renderExport();
      files.push(new File([blob], exportFileName(`-${seriesBaseName(item.file)}`), { type: "image/jpeg" }));
    }
  } catch (error) {
    console.error(error);
    showStatus(`Export interrompu à la photo ${files.length + 1}. Essaie une taille d’export plus petite.`);
  } finally {
    ({ originalImage, originalSize, sourceSize, sourceExif } = saved);
    seriesBusy = false;
    seriesExportButton.disabled = seriesExportPanelButton.disabled = false;
    exportButton.disabled = false;
    renderSeries();
  }
  if (files.length === series.length) {
    presentResult(files, { title: "Série prête", savedMessage: `${files.length} photos enregistrées.` });
  }
}

seriesExportButton.addEventListener("click", exportSeries);
seriesExportPanelButton.addEventListener("click", exportSeries);
// L'image d'exemple remplace la série.
sampleButton.addEventListener("click", clearSeries);
