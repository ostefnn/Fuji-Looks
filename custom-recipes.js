/*
 * Recettes personnelles, au format texte Fujifilm.
 * Elles sont lues par FR.parseText (parser du Fuji Recipe Converter).
 * Pour en ajouter une : copier un bloc { name, text } et coller la recette.
 * Facultatif : notes.
 * Une recette déjà présente dans le catalogue (js/kata-catalog.js) n'a pas besoin d'être copiée ici.
 */
window.CUSTOM_RECIPES = [
  {
    name: "Kodachrome II",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR200
Highlight: +1
Shadow: +2
Color: +1
Noise Reduction: -4
Sharpening: +1
Clarity: -2
Grain Effect: Weak, Small
Color Chrome Effect: Strong
Color Chrome Effect Blue: Weak
White Balance: Auto, +3 Red & -4 Blue
ISO: Auto, up to ISO 6400
Exposure Compensation: +1/3 to +2/3 (typically)`
  },
  {
    name: "Classic Autumn",
    text: `Film Simulation: Classic Neg
Dynamic Range: DR400
Highlight: -1.5
Shadow: +0.5
Color: 0
Noise Reduction: -4
Sharpening: -2
Clarity: -3
Grain Effect: Weak, Small
Color Chrome Effect: Strong
Color Chrome Effect Blue: Weak
White Balance: Auto, +6 Red & -6 Blue
ISO: Auto, up to ISO 6400
Exposure Compensation: +1/3(typically)`
  },
  {
    // Fonctionne aussi avec ACROS +Ye, +R ou +G : changer « Film Simulation » dans l'éditeur.
    name: "Kodak T-Max P3200",
    text: `Film Simulation: Acros
Monochromatic Color WC: -1
Monochromatic Color MG: -1
Grain Effect: Strong, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: 5500K, +4 Red & +7 Blue
Dynamic Range: DR400
Highlight: +1
Shadow: +3
Sharpness: +2
High ISO NR: -4
Clarity: +1
ISO: up to ISO 12800
Exposure Compensation: 0 to +2/3 (typically)`
  },
  {
    // Fonctionne aussi avec ACROS +Ye, +R ou +G : changer « Film Simulation » dans l'éditeur.
    name: "Kodak Plus-X 125",
    text: `Film Simulation: Acros
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Dynamic Range: DR200
Grain Effect: Weak, Large
Color Chrome Effect: Strong
Color Chrome FX Blue: Off
White Balance: Daylight, +9 Red & +9 Blue
Highlight: -1
Shadow: +1
Sharpness: -1
High ISO NR: -4
Clarity: +2
ISO: Auto, up to ISO 6400
Exposure Compensation: -1/3 to -2/3 (typically)`
  },
  {
    // Recette infrarouge : nécessite un boîtier converti IR et des filtres physiques.
    name: "Agfa 400S",
    notes: "Filtres : Tiffen Deep Yellow 15, Kolari Vision IR Chrome & QB2 Blue (boîtier converti infrarouge).",
    text: `Film Simulation: Acros+R
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Dynamic Range: DR200
Grain Effect: Strong, Small
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: 2500K, +9 Red & -2 Blue
Highlight: +4
Shadow: +4
Sharpness: -1
High ISO NR: -4
Clarity: -2
ISO: Auto, up to ISO 12800
Exposure Compensation: -1/3 to +1/3 (typically)`
  },
  {
    // Recette infrarouge : nécessite un boîtier converti IR et des filtres physiques.
    name: "Cotton Candy Chrome",
    notes: "Filtres : Tiffen Yellow 2 #8, Hoya G(XO) Yellow-Green & QB2 Blue (boîtier converti infrarouge).",
    text: `Film Simulation: Classic Negative
Dynamic Range: DR200
Grain Effect: Strong, Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Off
White Balance: Fluorescent 1, -9 Red & +6 Blue
Highlight: -1.5
Shadow: -1.5
Color: +4
Sharpness: 0
High ISO NR: -4
Clarity: -2
ISO: Auto, up to ISO 6400
Exposure Compensation: 0 to +1/3 (typically)`
  },
  {
    // Recette infrarouge : nécessite un boîtier converti IR et des filtres physiques.
    name: "Aerochrome v3",
    notes: "Filtres : True Color Infrared Autumnizer (Turquoise), Hoya G(XO) Yellow-Green & Tiffen Yellow 2 #8 (boîtier converti infrarouge).",
    text: `Film Simulation: Classic Negative
Dynamic Range: DR400
Grain Effect: Strong, Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Strong
White Balance: Daylight, +9 Red & +8 Blue
Highlight: -1.5
Shadow: -0.5
Color: +4
Sharpness: -1
High ISO NR: -4
Clarity: -2
ISO: Auto, up to ISO 6400
Exposure Compensation: -1/3 to +1/3 (typically)`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Kodak Portra 400 v2",
    notes: "Dans le fichier source, réglages identiques à Kodak Ultramax 400 sauf la Dynamic Range : à vérifier.",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR400
White Balance: Auto
WB Shift Red: +1
WB Shift Blue: -5
Grain Effect: Strong
Grain Size: Large
Color Chrome Effect: Weak
Color Chrome FX Blue: Off
Color: +4
Sharpness: 0
Highlight: +1.0
Shadow: +1.0
Noise Reduction: -4
Clarity: +3`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "1970's Summer",
    text: `Film Simulation: Nostalgic Neg.
Dynamic Range: DR400
White Balance: Colour Temperature (K)
Colour Temperature: 6500 K
WB Shift Red: -1
WB Shift Blue: -4
Grain Effect: Strong
Grain Size: Large
Color Chrome Effect: Strong
Color Chrome FX Blue: Strong
Color: -2
Sharpness: -2
Highlight: -2.0
Shadow: -2.0
Noise Reduction: -4
Clarity: -3`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Kodak Ultramax 400",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR100
White Balance: Auto
WB Shift Red: +1
WB Shift Blue: -5
Grain Effect: Strong
Grain Size: Large
Color Chrome Effect: Weak
Color Chrome FX Blue: Off
Color: +4
Sharpness: 0
Highlight: +1.0
Shadow: +1.0
Noise Reduction: -4
Clarity: +3`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "California Summer",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR400
White Balance: Colour Temperature (K)
Colour Temperature: 6700 K
WB Shift Red: -1
WB Shift Blue: -6
Grain Effect: Weak
Grain Size: Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
Color: +4
Sharpness: -2
Highlight: -2.0
Shadow: -1.0
Noise Reduction: -4
Clarity: -4`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Reggie's Portra",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR100
White Balance: Auto
WB Shift Red: +6
WB Shift Blue: -8
Grain Effect: Weak
Grain Size: Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
Color: +2
Sharpness: -2
Highlight: -1.0
Shadow: -1.0
Noise Reduction: -4
Clarity: 0`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Vibrant Arizona",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR100
White Balance: Auto
WB Shift Red: +2
WB Shift Blue: -4
Grain Effect: Weak
Grain Size: Small
Color Chrome Effect: Off
Color Chrome FX Blue: Off
Color: +4
Sharpness: -2
Highlight: 0.0
Shadow: 0.0
Noise Reduction: -4
Clarity: -3`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Kodachrome 64 (X-Trans V)",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR200
White Balance: Daylight
WB Shift Red: +2
WB Shift Blue: -5
Grain Effect: Weak
Grain Size: Small
Color Chrome Effect: Weak
Color Chrome FX Blue: Off
Color: +2
Sharpness: +1
Highlight: 0.0
Shadow: +0.5
Noise Reduction: -4
Clarity: +3`
  },
  {
    name: "Real Leica",
    text: `Film Simulation: Reala Ace
Dynamic Range: DR200
White Balance: Auto
WB Shift Red: +2
WB Shift Blue: -1
Grain Effect: Off
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
Color: +3
Sharpness: 0
Highlight: -1
Shadow: 0
Noise Reduction: -4
Clarity: 0
Exposure Compensation: +1/3`
  },
  {
    name: "Winter Chrome",
    notes: "Clarity 0 pour un traitement plus rapide dans le boîtier ; ajoute une Clarity négative en post-traitement, ou directement dans le boîtier.",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR400
White Balance: 7500K
WB Shift Red: 0
WB Shift Blue: 0
Grain Effect: Strong
Grain Size: Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Off
Color: +2
Sharpness: -1
Highlight: -1
Shadow: -2
Noise Reduction: -4
Clarity: 0`
  }
];
