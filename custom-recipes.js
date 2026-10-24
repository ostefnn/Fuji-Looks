/*
 * Recettes personnelles, au format texte Fujifilm.
 * Elles sont lues par FR.parseText (parser du Fuji Recipe Converter).
 * Pour en ajouter une : copier un bloc { name, text } et coller la recette.
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
    name: "Acros Grain",
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
  }
];
