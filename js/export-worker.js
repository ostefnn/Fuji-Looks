/* Fuji Looks — Worker d'export : calcule les pixels pleine résolution hors du fil principal,
 * pour que l'écran ne fige pas pendant l'export d'une grande photo. */
self.window = self; // les scripts du convertisseur s'attachent à window.FR
importScripts(
  "../vendor/fuji-recipe-converter/data.js",
  "../vendor/fuji-recipe-converter/engine.js",
  "pipeline.js"
);

self.onmessage = (event) => {
  const { id, buffer, width, height, recipe, strength, source, simulateWb } = event.data;
  try {
    PIPELINE_OPTIONS.simulateWb = simulateWb !== false;
    const src = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const out = renderRecipe(src, recipe, strength, source);
    self.postMessage({ id, buffer: out.data.buffer, width, height }, [out.data.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
