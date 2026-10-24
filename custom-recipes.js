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
  }
];
