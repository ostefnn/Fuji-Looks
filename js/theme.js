/* Fuji Looks — Thème de l'interface : Auto (suit l'appareil), Clair ou Sombre.
 * Le choix est appliqué dès le <head> (index.html) pour éviter un éclair au chargement. */

const THEME_KEY = "fuji-looks.theme";
const THEME_COLORS = { dark: "#121214", light: "#fbfbfc" }; // barre du navigateur, couleur de --bar
const themeOptions = document.getElementById("themeOptions");
const themeColorMeta = document.getElementById("themeColorMeta");
const systemLight = window.matchMedia("(prefers-color-scheme: light)");
let themeChoice = ["light", "dark"].includes(load(THEME_KEY)) ? load(THEME_KEY) : "auto";

function effectiveTheme() {
  return themeChoice === "auto" ? (systemLight.matches ? "light" : "dark") : themeChoice;
}

function applyTheme() {
  if (themeChoice === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = themeChoice;
  themeColorMeta.content = THEME_COLORS[effectiveTheme()];
  themeOptions.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === themeChoice)));
}

themeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-choice]");
  if (!button) return;
  themeChoice = button.dataset.themeChoice;
  store(THEME_KEY, themeChoice === "auto" ? null : themeChoice);
  applyTheme();
});

// En mode Auto, suit le passage clair / sombre de l'appareil.
systemLight.addEventListener("change", () => {
  if (themeChoice === "auto") applyTheme();
});

applyTheme();
