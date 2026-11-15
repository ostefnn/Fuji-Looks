/* Dialed — Références DOM, constantes et état global de l'application. */
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const placeholder = document.getElementById("placeholder");
const photoLabel = document.getElementById("photoLabel");
const photoFrame = document.getElementById("photoFrame");
const intensity = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");
const exportButton = document.getElementById("exportButton");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const frameOptions = document.getElementById("frameOptions");
const frameInfoOptions = document.getElementById("frameInfoOptions");
const frameInfoRow = document.getElementById("frameInfoRow");
const statusMessage = document.getElementById("statusMessage");
const lookGroups = document.getElementById("lookGroups");
const lookCount = document.getElementById("lookCount");
const recipeFields = document.getElementById("recipeFields");
const recipeSim = document.getElementById("recipeSim");
const recipeName = document.getElementById("recipeName");
const recipeAuthor = document.getElementById("recipeAuthor");
const recipeNotes = document.getElementById("recipeNotes");
const importText = document.getElementById("importText");
const importButton = document.getElementById("importButton");
const importFile = document.getElementById("importFile");
const xmpTarget = document.getElementById("xmpTarget");
const xmpHint = document.getElementById("xmpHint");
const lookTabs = document.getElementById("lookTabs");
const lookSearch = document.getElementById("lookSearch");
const lookSimSelect = document.getElementById("lookSim");
const lookSensorSelect = document.getElementById("lookSensor");
const compareButton = document.getElementById("compareButton");
const changePhotoButton = document.getElementById("changePhotoButton");
const revertButton = document.getElementById("revertButton");
const recipeSource = document.getElementById("recipeSource");
const zoomControls = document.getElementById("zoomControls");
const zoomInButton = document.getElementById("zoomIn");
const zoomOutButton = document.getElementById("zoomOut");
const zoomFitButton = document.getElementById("zoomFit");
const sampleButton = document.getElementById("sampleButton");
const saveButton = document.getElementById("saveButton");
const importStatus = document.getElementById("importStatus");
const xmpDetails = document.getElementById("xmpDetails");
const lutSize = document.getElementById("lutSize");
const libraryList = document.getElementById("libraryList");
const libraryEmpty = document.getElementById("libraryEmpty");
const libraryCount = document.getElementById("libraryCount");
const libraryMeta = document.getElementById("libraryMeta");
const libraryFile = document.getElementById("libraryFile");

const LIB_KEY = "fuji-looks.library.v1";
const DRAFT_KEY = "fuji-looks.draft.v1";
const FRAME_KEY = "fuji-looks.frame";

const PREVIEW_MAX_SIDE = 2048;
// Zoom relatif à la taille « ajustée au cadre » (1 = toute la photo visible).
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.5;
// Vignettes : recadrage 4:3 zoomé au centre de la photo pour mieux distinguer les looks.
const THUMB_W = 240;
const THUMB_H = 180;
const THUMB_ZOOM = 0.55;
// Surface maximale d'un export. iOS Safari refuse les canvas de plus de ~16,7 Mpx ;
// Android garde de la marge mémoire ; un ordinateur exporte jusqu'à 105 Mpx (GFX 100).
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const SAFE_EXPORT_PIXELS = 16000000;
const EXPORT_MAX_PIXELS = IS_IOS ? SAFE_EXPORT_PIXELS : IS_ANDROID ? 52000000 : 105000000;

// Format du négatif (js/films.js, FILM_FORMATS) : échelle du grain et du halo, et bande de film du cadre.
let filmFormat = "135";

// Versions comparées côte à côte (js/versions.js) : identifiants, ou null hors comparaison.
let versionCompare = null;
