/* Fuji Looks — Historique : Annuler / Rétablir. */
// --- Historique (Annuler / Rétablir) ----------------------------------------

const HISTORY_MAX = 100;
const undoStack = [];
const redoStack = [];
let lastCommit = { key: null, time: 0 };

function snapshot() {
  return { recipe: { ...recipe }, applied, modified, lookId: currentLookId, intensity: intensityState, edit: { ...edit } };
}

// À appeler juste avant une modification. Les modifications répétées d'un même réglage
// (glissement d'un curseur, saisie) sont regroupées en une seule étape.
function commit(key = null) {
  const now = performance.now();
  if (key && key === lastCommit.key && now - lastCommit.time < 1000) {
    lastCommit.time = now;
    return;
  }
  lastCommit = { key, time: now };
  undoStack.push(snapshot());
  if (undoStack.length > HISTORY_MAX) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
}

function restoreSnapshot(state) {
  recipe = FR.normalize(state.recipe);
  applied = state.applied;
  modified = state.modified;
  currentLookId = state.lookId;
  intensity.value = state.intensity;
  intensityState = state.intensity;
  if (JSON.stringify(state.edit) !== JSON.stringify(edit)) {
    edit = { ...state.edit };
    updateEditControls();
    rebuildSource();
  }
  updateRecipeEditor();
  schedulePreview();
}

function stepHistory(from, to) {
  if (!from.length) return;
  to.push(snapshot());
  restoreSnapshot(from.pop());
  lastCommit = { key: null, time: 0 };
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoButton.disabled = !undoStack.length;
  redoButton.disabled = !redoStack.length;
}

undoButton.addEventListener("click", () => stepHistory(undoStack, redoStack));
redoButton.addEventListener("click", () => stepHistory(redoStack, undoStack));

document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target;
  // Dans un champ texte, on laisse l'annulation native du navigateur.
  if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.type === "text"))) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    stepHistory(undoStack, redoStack);
  } else if ((key === "z" && event.shiftKey) || key === "y") {
    event.preventDefault();
    stepHistory(redoStack, undoStack);
  }
});

revertButton.addEventListener("click", () => {
  if (currentLookId) selectLook(currentLookId);
});

function loadRecipe(newRecipe) {
  commit();
  recipe = FR.normalize(newRecipe);
  applied = true;
  modified = false;
  currentLookId = null;
  updateRecipeEditor();
  schedulePreview();
}
