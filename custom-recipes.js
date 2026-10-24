/*
 * Recettes personnelles, au format texte Fujifilm.
 * Elles sont lues par FR.parseText (parser du Fuji Recipe Converter).
 * Pour en ajouter une : copier un bloc { name, text } et coller la recette.
 * Facultatif : notes, et moment conseillé (golden, midday, overcast, indoor, night).
 */
window.CUSTOM_RECIPES = [
  {
    name: "Nostalgic Fluo",
    text: `Film Simulation: Nostalgic Neg.
Dynamic Range: DR200
Grain Effect: Strong, Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Off
White Balance: Fluorescent 1, -5 Red & 0 Blue
Highlight: +4
Shadow: +3
Color: -1
Sharpness: -2
High ISO NR: -4
Clarity: -2
ISO: Auto, up to ISO 6400
Exposure Compensation: 0 to +2/3 (typically)`
  },
  {
    name: "Nostalgic 6500K",
    text: `Film Simulation: Nostalgic Neg.
Grain Effect: Strong, Large
Color Chrome Effect: Strong
Color Chrome FX Blue: Strong
White Balance: 6500K, -1 Red & -4 Blue
Dynamic Range: DR400
Highlight: -2
Shadow: -0.5
Color: -2
Sharpness: -2
High ISO NR: -4
Clarity: -3
ISO: Auto, up to ISO 6400
Exposure Compensation: +1/3 to +1 (typically)`
  },
  {
    name: "Velvia Punch",
    text: `Film Simulation: Velvia
Dynamic Range: DR400
Grain Effect: Weak, Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
White Balance: Auto Ambience Priority, +1 Red & -3 Blue
Highlight: -1
Shadow: -1
Color: +4
Sharpness: +1
High ISO NR: -4
Clarity: +3
ISO: Auto, up to ISO 6400
Exposure Compensation: +1/3 to +1 (typically)`
  },
  {
    // Fonctionne aussi avec ACROS +Ye, +R ou +G : changer « Film Simulation » dans l'éditeur.
    name: "FRGMT B&W",
    text: `Film Simulation: Acros
Monochromatic Color (Toning): WC 0 & MG 0 (Off)
Dynamic Range: DR-Auto
Grain Effect: Strong, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Auto, 0 Red & 0 Blue
Highlight: +4
Shadow: +2
Sharpness: -4
High ISO NR: -4
Clarity: +5
ISO: Auto, up to ISO 12800
Exposure Compensation: 0 to +2/3 (typically), +1/3 suggested`
  },
  {
    name: "Kodachrome 64",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR200
Highlight: 0
Shadow: 0
Color: +2
Noise Reduction: -4
Sharpening: +1
Clarity: +3
Grain Effect: Weak, Small
Color Chrome Effect: Strong
Color Chrome Effect Blue: Weak
White Balance: Daylight, +2 Red & -5 Blue
ISO: Auto, up to ISO 6400
Exposure Compensation: 0 to +2/3 (typically)`
  },
  {
    name: "Kodachrome 25",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR400
Highlight: +0.5
Shadow: -0.5
Color: +1
Noise Reduction: -4
Sharpening: +3
Clarity: +3
Grain Effect: Off
Color Chrome Effect: Strong
Color Chrome Effect Blue: Strong
White Balance: Daylight, +2 Red & -4 Blue
ISO: Auto, up to ISO 1600
Exposure Compensation: 0 to +2/3 (typically)`
  },
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
    name: "Vintage Color v2",
    text: `Film Simulation: Classic Negative
Dynamic Range: DR400
Highlight: +2
Shadow: +3
Color: -1
Noise Reduction: -4
Sharpness: -2
Clarity: -3
Grain Effect: Strong, Large
Color Chrome Effect: Strong
Color Chrome Effect Blue: Strong
White Balance: 7350K, -1 Red & -4 Blue
ISO: Auto, up to ISO 6400
Exposure Compensation: 0 to +1 (typically)`
  },
  {
    name: "Fujicolor NPH",
    text: `Film Simulation: Provia
Dynamic Range: DR100
Highlight: -1
Shadow: 0
Color: 0
Noise Reduction: -4
Sharpening: 0
Clarity: -3
Grain Effect: Weak, Large
Color Chrome Effect: Strong
Color Chrome Effect Blue: Strong
White Balance: 5250K, -3 Red & -4 Blue
ISO: Auto, up to ISO 6400
Exposure Compensation: +1/3 to +2/3 (typically)`
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
    name: "Classic B&W",
    text: `Film Simulation: Acros+G
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Dynamic Range: DR200
Grain Effect: Strong, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Incandescent, -9 Red & +9 Blue
Highlight: +3
Shadow: +4
Sharpness: +1
High ISO NR: -4
Clarity: +3
ISO: Auto, up to ISO 12800
Exposure Compensation: 0 to +2/3 (typically)`
  },
  {
    // Fonctionne aussi avec ACROS +Ye, +R ou +G : changer « Film Simulation » dans l'éditeur.
    name: "Agfa Scala",
    text: `Film Simulation: Acros
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Dynamic Range: DR100
Grain Effect: Weak, Small
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Auto, 0 Red & 0 Blue
Highlight: +4
Shadow: 0
Sharpness: +1
High ISO NR: -4
Clarity: +2
ISO: Auto, up to ISO 6400
Exposure Compensation: -1/3 to +1/3 (typically)`
  },
  {
    name: "Kodak T-Max 100 Hard Tone",
    text: `Film Simulation: Monochrome+G
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Grain Effect: Weak, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Daylight, -6 Red & -3 Blue
Dynamic Range: DR200
Highlight: +0.5
Shadow: +2.5
Sharpness: -1
High ISO NR: -4
Clarity: -1
ISO: up to ISO 6400
Exposure Compensation: -2/3 to +2/3 (typically)`
  },
  {
    name: "Kodak T-Max 100 Soft Tone",
    text: `Film Simulation: Monochrome+G
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Grain Effect: Weak, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Daylight, -6 Red & -3 Blue
Dynamic Range: DR200
Highlight: -0.5
Shadow: +1.5
Sharpness: -1
High ISO NR: -4
Clarity: -1
ISO: up to ISO 6400
Exposure Compensation: -2/3 to +2/3 (typically)`
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
    name: "Ilford FP4 Plus 125",
    text: `Film Simulation: Monochrome
Grain Effect: Weak, Large
Color Chrome Effect: Off
Color Chrome FX Blue: Off
White Balance: Daylight, +6 Red & -8 Blue
Dynamic Range: DR200
Highlight: -0.5
Shadow: -1.5
Monochromatic Color WC: 0
Monochromatic Color MG: 0
Sharpness: 0
High ISO NR: -4
Clarity: +2
ISO: Auto, up to ISO 6400
Exposure Compensation: -1 to -1/3 (typically)`
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
    moment: "golden",
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
    name: "Timeless Negative",
    moment: "indoor",
    text: `Film Simulation: Nostalgic Neg.
Dynamic Range: DR400
White Balance: Auto
WB Shift Red: +2
WB Shift Blue: -3
Grain Effect: Weak
Grain Size: Small
Color Chrome Effect: Strong
Color Chrome FX Blue: Off
Color: -3
Sharpness: 0
Highlight: +2.0
Shadow: -2.0
Noise Reduction: -4
Clarity: -2`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "1970's Summer",
    moment: "midday",
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
    name: "CineStill 800T",
    moment: "night",
    text: `Film Simulation: ETERNA / Cinema
Dynamic Range: DR400
White Balance: Fluorescent 3 (Cool White)
WB Shift Red: -6
WB Shift Blue: -4
Grain Effect: Strong
Grain Size: Large
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
Color: +4
Sharpness: -3
Highlight: 0.0
Shadow: +2.0
Noise Reduction: -4
Clarity: -5`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Superia Xtra 400",
    moment: "night",
    text: `Film Simulation: Classic Neg.
Dynamic Range: DR400
White Balance: Auto
WB Shift Red: +3
WB Shift Blue: -5
Grain Effect: Strong
Grain Size: Small
Color Chrome Effect: Off
Color Chrome FX Blue: Weak
Color: +4
Sharpness: -1
Highlight: 0.0
Shadow: -1.0
Noise Reduction: -4
Clarity: -2`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Kodak Ultramax 400",
    moment: "overcast",
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
    name: "Kodak Gold 200",
    text: `Film Simulation: Classic Chrome
Dynamic Range: DR400
White Balance: Daylight
WB Shift Red: +4
WB Shift Blue: -5
Grain Effect: Strong
Grain Size: Small
Color Chrome Effect: Weak
Color Chrome FX Blue: Off
Color: +3
Sharpness: -2
Highlight: -1.5
Shadow: +0.5
Noise Reduction: -4
Clarity: -2`
  },
  {
    // Fichier .FP1 du dépôt quiode/fujifilm-recipes (réglages Fuji X Weekly, X-Trans V).
    name: "Pacific Blues",
    text: `Film Simulation: Classic Neg.
Dynamic Range: DR400
White Balance: Colour Temperature (K)
Colour Temperature: 5800 K
WB Shift Red: +1
WB Shift Blue: -3
Grain Effect: Strong
Grain Size: Large
Color Chrome Effect: Strong
Color Chrome FX Blue: Weak
Color: +4
Sharpness: -2
Highlight: -2.0
Shadow: +3.0
Noise Reduction: -4
Clarity: -3`
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
  }
];
