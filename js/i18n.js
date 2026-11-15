/* Dialed — Langue de l'interface : français ou anglais.
 *
 * L'interface est écrite en français. En anglais, ce fichier traduit à la volée tout ce qui
 * s'affiche : textes de la page, infobulles, libellés d'accessibilité, messages, dialogues
 * confirm() et textes dessinés sur les images (fiche recette, planche contact…).
 * Il est chargé avant les autres scripts : t() est disponible partout.
 *
 * Pour traduire un nouveau texte : ajoute-le à I18N_EN (texte exact, espaces normalisés),
 * ou à I18N_EN_PATTERNS s'il contient une valeur variable.
 */

const LANG_KEY = "fuji-looks.lang";
const LANG = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LANG_KEY));
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    /* stockage indisponible : langue du navigateur */
  }
  return /^fr\b/i.test(navigator.language || "") ? "fr" : "en";
})();
document.documentElement.lang = LANG;

const I18N_EN = new Map(Object.entries({
  // --- Barre du haut, menus ---------------------------------------------------------------
  "Dialed, accueil": "Dialed, home",
  "Dialed : recettes Fujifilm et pellicules argentiques pour tes photos": "Dialed: Fujifilm recipes and film stocks for your photos",
  "Mon boîtier :": "My camera:",
  "Mon boîtier": "My camera",
  "aucun": "none",
  "Aucun": "None",
  "Aucune": "None",
  "Historique": "History",
  "Annuler (Ctrl+Z)": "Undo (Ctrl+Z)",
  "Rétablir (Ctrl+Maj+Z)": "Redo (Ctrl+Shift+Z)",
  "Plus d’actions": "More actions",
  "Plus d’actions : bibliothèque, import, sauvegarde": "More actions: library, import, backup",
  "Importer une recette…": "Import a recipe…",
  "Bibliothèque": "Library",
  "Mon boîtier et réglages C1–C7": "My camera and C1–C7 settings",
  "Thème": "Theme",
  "Auto": "Auto",
  "Clair": "Light",
  "Sombre": "Dark",
  "Suit le réglage de l’appareil": "Follows your device setting",
  "Langue": "Language",
  "Installer l’application": "Install the app",
  "À propos et crédits ↗": "About and credits ↗",
  "Importer des photos": "Import photos",
  "Exporter": "Export",
  "Photo": "Photo",
  "Exporter la photo…": "Export photo…",
  "Taille et qualité…": "Size and quality…",
  "Images à partager (avant/après, planche)…": "Images to share (before/after, contact sheet)…",
  "Recette": "Recipe",
  "Preset Lightroom, LUT, codes…": "Lightroom preset, LUT, codes…",
  "Profil X RAW Studio (.FP1)…": "X RAW Studio profile (.FP1)…",
  "Préparation…": "Preparing…",

  // --- Looks --------------------------------------------------------------------------------
  "Bibliothèque de looks": "Look library",
  "Looks": "Looks",
  "Importer": "Import",
  "Importer une recette (texte, code FR1, .FP1, .json, capture)": "Import a recipe (text, FR1 code, .FP1, .json, screenshot)",
  "Rechercher un look": "Search looks",
  "Rechercher un look, une pellicule…": "Search a look, a film…",
  "Nom, simulation, film ou auteur": "Name, simulation, film or author",
  "Type de look": "Look type",
  "Pour commencer": "Start here",
  "Recettes": "Recipes",
  "Catalogue": "Catalog",
  "Simulations": "Simulations",
  "Pellicules": "Films",
  "Nikon": "Nikon",
  "Simulation": "Simulation",
  "Couleur": "Color",
  "Noir & blanc": "Black & white",
  "Filtrer par Film Simulation": "Filter by Film Simulation",
  "Collection (onglet Nikon)": "Collection (Nikon tab)",
  "Collection Nikon": "Nikon collection",
  "Toutes les collections": "All collections",
  "Capteur": "Sensor",
  "Capteur (onglet Catalogue)": "Sensor (Catalog tab)",
  "Favoris": "Favorites",
  "Rayon": "Shelf",
  "Aperçu": "Preview",
  "Aperçu des miniatures": "Thumbnail preview",
  "Scène de référence": "Reference scene",
  "Ma photo": "My photo",
  "La même scène pour tous les films : compare leurs couleurs d’un coup d’œil.": "The same scene for every film: compare their colors at a glance.",
  "Ta photo dans chaque pellicule.": "Your photo in every film.",
  "Aucun look ne correspond dans cet onglet.": "No look matches in this tab.",
  "Afficher plus": "Show more",
  "Original": "Original",
  "Naturel": "Natural",
  "Simulation de film": "Film simulation",
  "Ajouter aux favoris": "Add to favorites",
  "Retirer des favoris": "Remove from favorites",
  "Quel boîtier utilises-tu ?": "Which camera do you use?",
  "Le catalogue ne montrera que les recettes faites pour ton capteur.": "The catalog will only show recipes made for your sensor.",
  "Choisir mon boîtier…": "Choose my camera…",
  "Plus tard": "Later",
  "Picture Controls Nikon affichés.": "Nikon Picture Controls shown.",
  "Impossible de charger les couleurs des pellicules. Vérifie la connexion.": "Couldn’t load the film colors. Check your connection.",

  // Pour commencer : ambiances
  "Tons chair doux, lumière chaude": "Soft skin tones, warm light",
  "Couleurs riches de diapo, ciel profond": "Rich slide colors, deep skies",
  "Contrasté, l’argentique du quotidien": "Contrasty, everyday film",
  "Chaud et lumineux, passe-partout": "Warm and bright, works everywhere",
  "Doré, souvenirs d’été": "Golden, summer memories",
  "Verts marqués, photos de tous les jours": "Strong greens, everyday photos",
  "Look cinéma, doux et naturel": "Cinema look, soft and natural",
  "Nuit et néons, tons cinéma froids": "Night and neon, cool cinema tones",
  "Bleus et cyans, bord de mer": "Blues and cyans, seaside",
  "Vieille diapo, nostalgique": "Old slide, nostalgic",
  "Noir et blanc granuleux, reportage": "Gritty black and white, documentary",
  "Noir et blanc doux, polyvalent": "Soft black and white, versatile",

  // Pellicules : rayons, formats, descriptions
  "Négatif": "Negative",
  "Négatif couleur": "Color negative",
  "Diapo · Cross": "Slide · Cross",
  "Inversible": "Slide",
  "N&B": "B&W",
  "Noir et blanc": "Black and white",
  "Cinéma": "Cinema",
  "Demi-format": "Half frame",
  "Panoramique 24×65": "Panoramic 24×65",
  "Contraste granuleux, le classique de la rue": "Gritty contrast, the street classic",
  "Copie Fuji pour masters numériques": "Fuji print stock for digital masters",
  "Copie cinéma : ombres sarcelle": "Cinema print: teal shadows",
  "Copie cinéma, noirs plus riches": "Cinema print, richer blacks",
  "Couleur Agfa saturée et punchy": "Saturated, punchy Agfa color",
  "Couleur cinéma, plus douce que la 800T": "Cinema color, softer than 800T",
  "Couleur de magazine des années 70": "1970s magazine color",
  "Couleur du quotidien, plus rapide": "Everyday color, faster",
  "Couleur fidèle, grain fin": "True color, fine grain",
  "Couleur riche, plus douce que la 50": "Rich color, softer than the 50",
  "Couleur vive pour le portrait": "Vivid color for portraits",
  "Couleurs franches, grain très fin": "Bold colors, very fine grain",
  "Croisé, hautes lumières jaunes": "Cross-processed, yellow highlights",
  "Diapo Kodak du quotidien": "Everyday Kodak slide",
  "Diapo Kodak extra saturée": "Extra-saturated Kodak slide",
  "Diapo douce pour la peau": "Slide that is gentle on skin",
  "Diapo développée en C-41 : contraste fou": "Slide developed in C-41: wild contrast",
  "Diapo neutre, couleur fidèle": "Neutral slide, true color",
  "Diapo éclatante, contraste dur": "Brilliant slide, hard contrast",
  "Ektachrome très saturé": "Highly saturated Ektachrome",
  "Exposé à l’envers : rouge-orangé": "Shot through the back: red-orange",
  "Fait pour pousser, nuits granuleuses": "Made to push, grainy nights",
  "Film cinéma tungstène : la nuit vire au bleu": "Tungsten cinema film: night turns blue",
  "Grain lisse à 400": "Smooth grain at 400",
  "Grain légendaire, rouges profonds": "Legendary grain, deep reds",
  "Lent, grain extrêmement fin": "Slow, extremely fine grain",
  "Lumière dorée toute la journée": "Golden light all day",
  "N&B Agfa lent et très fin": "Slow, very fine Agfa B&W",
  "N&B chromogène, grain lisse": "Chromogenic B&W, smooth grain",
  "N&B classique de sensibilité moyenne": "Classic medium-speed B&W",
  "N&B rapide et contrasté": "Fast, contrasty B&W",
  "Ombres vertes, photos du quotidien": "Green shadows, everyday photos",
  "Orthochromatique : les rouges foncent": "Orthochromatic: reds go dark",
  "Pastels aériens, quatrième couche": "Airy pastels, fourth layer",
  "Peau douce et chaude, hautes lumières tendres": "Soft warm skin, gentle highlights",
  "Peau neutre, couleur discrète": "Neutral skin, subtle color",
  "Photos de nuit, grain marqué": "Night photos, strong grain",
  "Plus de couleur, même peau": "More color, same skin",
  "Portraits en basse lumière, grain chaud": "Low-light portraits, warm grain",
  "Rapide en intérieur, couleur Fuji": "Fast indoors, Fuji color",
  "Rouge étendu, ciels sombres": "Extended red, dark skies",
  "S’enfonce dans le noir": "Sinks into the dark",
  "Touche d’infrarouge, feuillages lumineux": "A touch of infrared, glowing foliage",
  "Traitement croisé : bleus et jaunes": "Cross-processing: blues and yellows",
  "Ultra couleur pour tous les jours": "Ultra color for every day",
  "Verts Fuji, photos du quotidien": "Fuji greens, everyday photos",
  "Couleur nette, froide et propre": "Crisp, cool, clean color",
  "Portraits de nuit, palette douce": "Night portraits, soft palette",
  "Rouges chauds, couleurs de vacances": "Warm reds, holiday colors",
  "Diapo rapide, grain plus fin": "Fast slide, finer grain",
  "Ektachrome chaud et doux": "Warm, soft Ektachrome",
  "Diapo Kodak rapide, plus de grain": "Fast Kodak slide, more grain",
  "Diapo Agfa froide et nette": "Cool, crisp Agfa slide",
  "N&B moderne et net": "Modern, crisp B&W",
  "N&B moderne, fin et net": "Modern B&W, fine and crisp",
  "Ilford classique et rapide": "Classic fast Ilford",
  "N&B doux et tonal": "Soft, tonal B&W",

  // --- Photo (centre) -------------------------------------------------------------------------
  "Aperçu de ta photo": "Preview of your photo",
  "Glisse une photo ici": "Drop a photo here",
  "ou touche pour en choisir une ou plusieurs (JPEG, PNG, HEIC…)": "or tap to choose one or more (JPEG, PNG, HEIC…)",
  "Choisis un look à gauche, règle-le à droite.": "Pick a look on the left, fine-tune it on the right.",
  "Pas de photo sous la main ?": "No photo at hand?",
  "Photos d’exemple": "Sample photos",
  "Jardin · jour": "Garden · day",
  "Ville · nuit": "City · night",
  "Dépose ta photo ici": "Drop your photo here",
  "ORIGINAL": "ORIGINAL",
  "Avant": "Before",
  "Après": "After",
  "Avant / Après": "Before / After",
  "Résultat": "Result",
  "Mode d’affichage": "View mode",
  "Zoom": "Zoom",
  "Zoom arrière": "Zoom out",
  "Zoom avant": "Zoom in",
  "Ajusté": "Fit",
  "Ajuster la photo au cadre": "Fit photo to frame",
  "Histogramme": "Histogram",
  "Afficher l’histogramme": "Show histogram",
  "Histogramme de la photo (rouge, vert, bleu et luminance)": "Photo histogram (red, green, blue and luminance)",
  "Ombres bouchées": "Crushed shadows",
  "Hautes lumières brûlées": "Clipped highlights",
  "Zones": "Zones",
  "Montrer sur la photo les zones brûlées (rouge) et bouchées (bleu)": "Show clipped (red) and crushed (blue) areas on the photo",
  "Mode focus": "Focus mode",
  "Mode focus : masquer les looks et les réglages (F)": "Focus mode: hide looks and settings (F)",
  "Quitter le mode focus (F ou Échap)": "Leave focus mode (F or Esc)",
  "Maintiens pour voir l’original (ou la touche Espace)": "Hold to see the original (or the Space key)",
  "Version": "Version",
  "Garder l’état actuel comme version (V)": "Keep the current state as a version (V)",
  "Versions de la photo": "Versions of this photo",
  "Garde plusieurs essais de look sur cette photo pour les comparer côte à côte.": "Keep several look attempts on this photo to compare them side by side.",
  "Comparer": "Compare",
  "Voir les versions côte à côte ; touche une version pour l’ajouter ou la retirer (Échap pour finir)": "See versions side by side; tap a version to add or remove it (Esc to finish)",
  "Ajouter ou retirer de la comparaison": "Add to or remove from comparison",
  "Revenir à cette version": "Go back to this version",
  "Il faut au moins deux versions pour comparer.": "You need at least two versions to compare.",
  "Comparaison des versions": "Comparing versions",
  "Intensité du look": "Look intensity",
  "Intensité de la pellicule": "Film intensity",
  "Intensité du Picture Control": "Picture Control intensity",
  "look précédent / suivant ·": "previous / next look ·",
  "Espace": "Space",
  "maintenir pour voir l’original": "hold to see the original",
  "Tes photos restent sur ton appareil : rien n’est envoyé en ligne.": "Your photos stay on your device: nothing is uploaded.",
  "Photos de la série": "Photos in the series",
  "Ajouter des photos": "Add photos",
  "Ajouter des photos à la série": "Add photos to the series",
  "Série": "Series",
  "Exporter la série": "Export series",
  "Navigation principale": "Main navigation",
  "Retouche": "Edit",
  "aperçu": "preview",
  "modifié": "modified",
  "modifiée": "modified",

  // --- Panneau Recette ------------------------------------------------------------------------
  "Panneau de réglages": "Settings panel",
  "Réglages": "Settings",
  "Cadre": "Frame",
  "Aucun look appliqué": "No look applied",
  "Enregistrer…": "Save…",
  "Enregistrer": "Save",
  "Enregistrer dans ta bibliothèque (sur cet appareil)": "Save to your library (on this device)",
  "Recette d’origine ↗": "Original recipe ↗",
  "Base": "Base",
  "Tonalité": "Tone",
  "Détail": "Detail",
  "Prise de vue": "Shooting",
  "Réinitialiser": "Reset",
  "Décalage de la balance des blancs, R et B": "White balance shift, R and B",
  "Simuler la balance des blancs": "Simulate white balance",
  "Applique le mode de la recette (Daylight, Incandescent, Kelvin…) comme le boîtier, pour une photo prise en lumière du jour. Désactivé : identique au convertisseur, seul le décalage R/B est appliqué.":
    "Applies the recipe’s mode (Daylight, Incandescent, Kelvin…) like the camera does, for a photo taken in daylight. Off: same as the converter, only the R/B shift is applied.",
  "Balance des blancs simulée comme sur le boîtier.": "White balance simulated as on the camera.",
  "Balance des blancs : décalage R/B seulement, comme le convertisseur.": "White balance: R/B shift only, like the converter.",
  "Nom, auteur et notes": "Name, author and notes",
  "Nom": "Name",
  "Auteur": "Author",
  "Notes": "Notes",
  "Optionnel": "Optional",
  "Comparer avec une autre recette": "Compare with another recipe",
  "Recette à comparer": "Recipe to compare",
  "Choisis une recette…": "Choose a recipe…",
  "Mon boîtier C1–C7": "My camera C1–C7",
  "Réglage": "Setting",
  "Réglages identiques.": "Identical settings.",
  "Une pellicule est un rendu, pas une recette boîtier : elle s’exporte en LUT 3D (.cube), pas en .FP1.": "A film is a rendering, not a camera recipe: it exports as a 3D LUT (.cube), not as .FP1.",
  "Rétablir": "Restore",
  "Remettre les réglages du film par défaut": "Reset the film’s default settings",
  "Développement": "Development",
  "Traitement": "Processing",
  "Normal": "Normal",
  "Poussé · +1 IL": "Pushed · +1 EV",
  "Poussé · +2 IL": "Pushed · +2 EV",
  "Retenu · −1 IL": "Pulled · −1 EV",
  "Exposition scan": "Scan exposure",
  "Équilibrage": "Balance",
  "Lumière du jour · 5500 K": "Daylight · 5500 K",
  "Tungstène · 3200 K": "Tungsten · 3200 K",
  "Grain": "Grain",
  "Halation": "Halation",
  "Douceur": "Softness",
  "Effet de bord": "Edge effect",
  "Format du négatif": "Negative format",
  "Format": "Format",
  "Tirage": "Print",
  "Grade du papier": "Paper grade",
  "2 · normal": "2 · normal",
  "Filtre jaune": "Yellow filter",
  "Filtre magenta": "Magenta filter",
  "Comme sous l’agrandisseur : plus de jaune rend le tirage plus bleu, plus de magenta le rend plus vert. Grade 0 : papier doux ; grade 5 : papier dur.":
    "As under the enlarger: more yellow makes the print bluer, more magenta makes it greener. Grade 0: soft paper; grade 5: hard paper.",
  "Double-clic sur un curseur : valeur du film. Poussé : plus de contraste et de grain. Le format du négatif règle la taille du grain, du halo et de la douceur : plus gros en demi-format, plus fins en 6×9. L’effet de bord imite les coupleurs du film : contours plus nets et couleurs mieux séparées.":
    "Double-click a slider: film value. Pushed: more contrast and grain. The negative format sets the size of grain, halo and softness: larger in half frame, finer in 6×9. The edge effect mimics the film’s couplers: crisper edges and better-separated colors.",
  "Fichier de la pellicule": "Film file",
  "Fichiers de la recette": "Recipe files",
  "Fichiers du Picture Control": "Picture Control files",
  "LUT 3D de la pellicule téléchargée.": "Film 3D LUT downloaded.",
  "Une pellicule s’exporte en LUT 3D : la couleur du film, sans grain ni halation. Elle s’ouvre dans Photoshop, Lightroom (profil créé dans Camera Raw), Capture One ou DaVinci Resolve.":
    "A film exports as a 3D LUT: the film’s color, without grain or halation. It opens in Photoshop, Lightroom (profile created in Camera Raw), Capture One or DaVinci Resolve.",
  "Couleur : LUT de la collection Film-Luts (MIT). Grain, halation, douceur, développement et tirage : modèle Dialed.":
    "Color: LUT from the Film-Luts collection (MIT). Grain, halation, softness, development and print: Dialed model.",
  "Couleur : modèle paramétrique Dialed (pas de LUT pour ce film). Grain, halation, douceur, développement et tirage : modèle Dialed.":
    "Color: Dialed parametric model (no LUT for this film). Grain, halation, softness, development and print: Dialed model.",
  "Taille de la LUT 3D": "3D LUT size",
  "17 (fichier le plus léger)": "17 (smallest file)",
  "33 (recommandé)": "33 (recommended)",
  "65 (précision maximale)": "65 (maximum precision)",
  "LUT 3D (.cube)": "3D LUT (.cube)",
  "couleur seule": "color only",
  "Réservé aux recettes Fuji : une pellicule n’a pas de réglages boîtier.": "Fuji recipes only: a film has no camera settings.",
  "Réservés aux recettes. Pour Lightroom, Photoshop ou Resolve, utilise la LUT .cube.": "Recipes only. For Lightroom, Photoshop or Resolve, use the .cube LUT.",

  // Picture Control Nikon
  "Rendu approché, appliqué à la photo développée. La netteté n’est pas simulée. S’exporte en .NP3 (Flexible Color) et en LUT 3D.":
    "Approximate rendering, applied to the developed photo. Sharpening is not simulated. Exports as .NP3 (Flexible Color) and 3D LUT.",
  "Revenir aux réglages du fichier": "Back to the file’s settings",
  "Enregistrer dans l’onglet Nikon (sur cet appareil)": "Save to the Nikon tab (on this device)",
  "Supprimer de l’onglet Nikon": "Remove from the Nikon tab",
  "Tons": "Tones",
  "Contraste": "Contrast",
  "Hautes lumières": "Highlights",
  "Ombres": "Shadows",
  "Niveau de blanc": "White level",
  "Niveau de noir": "Black level",
  "Courbe": "Curve",
  "Remplace Contraste, Hautes lumières, Ombres, Blanc et Noir par une courbe, comme dans NX Studio": "Replaces Contrast, Highlights, Shadows, White and Black with a curve, as in NX Studio",
  "La courbe remplace les curseurs de tons, comme dans NX Studio. « Courbe » à nouveau : retour aux curseurs.": "The curve replaces the tone sliders, as in NX Studio. “Curve” again: back to sliders.",
  "Couleur et détail": "Color and detail",
  "Saturation": "Saturation",
  "Teinte": "Hue",
  "Clarté": "Clarity",
  "Mélangeur de couleurs": "Color mixer",
  "Couleur à régler": "Color to adjust",
  "Luminosité": "Brightness",
  "Étalonnage": "Color grading",
  "Zone à régler": "Range to adjust",
  "Intensité": "Strength",
  "Mélange": "Blending",
  "Équilibre": "Balance",
  "Double-clic sur un curseur : remise à zéro. Le mélange adoucit le passage d’une zone à l’autre ; l’équilibre agrandit les hautes lumières (+) ou les ombres (−).":
    "Double-click a slider: reset. Blending softens the transition between ranges; balance enlarges the highlights (+) or the shadows (−).",
  "Netteté (gardée pour le boîtier)": "Sharpening (kept for the camera)",
  "Netteté": "Sharpening",
  "Netteté tons moyens": "Mid-range sharpening",
  "Non visibles dans l’aperçu : ces valeurs sont écrites dans le .NP3 exporté.": "Not visible in the preview: these values are written to the exported .NP3.",
  "Picture Control (.NP3)": "Picture Control (.NP3)",
  "pour le boîtier ou NX Studio": "for the camera or NX Studio",
  "tons et couleurs, sans clarté": "tones and colors, no clarity",
  "Dans le .NP3, le nom est limité à 19 caractères sans accents : il est raccourci à l’export.": "In the .NP3, the name is limited to 19 characters without accents: it is shortened on export.",
  "Le .NP3 se charge dans un boîtier Nikon Z (carte mémoire, dossier NIKON/CUSTOMPC) ou dans NX Studio. Il est écrit en Flexible Color.":
    "The .NP3 loads into a Nikon Z camera (memory card, NIKON/CUSTOMPC folder) or NX Studio. It is written as Flexible Color.",
  "Courbe de tons du Picture Control": "Picture Control tone curve",
  "Picture Control basé sur Monochrome : rendu en noir et blanc avec sa courbe. Les filtres et virages Monochrome du fichier ne sont pas lus.":
    "Monochrome-based Picture Control: rendered in black and white with its curve. The file’s Monochrome filters and toning are not read.",
  "Picture Control basé sur une autre base Nikon : seuls la courbe et les réglages Flexible Color sont lus, le rendu peut s’écarter de NX Studio.":
    "Picture Control based on another Nikon base: only the curve and Flexible Color settings are read, the rendering may differ from NX Studio.",
  "Picture Control téléchargé. Copie-le dans NIKON/CUSTOMPC sur la carte, puis Picture Control → Charger/enregistrer.":
    "Picture Control downloaded. Copy it to NIKON/CUSTOMPC on the card, then Picture Control → Load/save.",
  "pas un .NP3": "not an .NP3",

  // --- Retouche ---------------------------------------------------------------------------------
  "Corrige la photo source. S’applique avant la recette.": "Corrects the source photo. Applied before the recipe.",
  "Réinitialiser la retouche": "Reset edits",
  "Retouche réinitialisée.": "Edits reset.",
  "Cadrage": "Crop",
  "Pivoter de 90° vers la gauche": "Rotate 90° left",
  "Pivoter de 90° vers la droite": "Rotate 90° right",
  "Redresser": "Straighten",
  "Fais glisser la photo pour choisir la partie gardée": "Drag the photo to choose the part to keep",
  "Fais glisser la photo pour choisir le cadrage.": "Drag the photo to choose the crop.",
  "Déplacer": "Move",
  "Lumière": "Light",
  "Corrige l’exposition, les hautes lumières et les ombres": "Corrects exposure, highlights and shadows",
  "Exposition": "Exposure",
  "Blancs": "Whites",
  "Noirs": "Blacks",
  "Balance des blancs": "White balance",
  "Balance des blancs de la photo, température et teinte": "Photo white balance, temperature and tint",
  "Température": "Temperature",
  "Pipette": "Eyedropper",
  "Touche sur la photo une zone qui devrait être grise ou blanche": "Tap an area of the photo that should be gray or white",
  "Touche une zone qui devrait être grise ou blanche.": "Tap an area that should be gray or white.",
  "Zone trop claire ou trop sombre : choisis un gris ou un blanc qui n’est pas brûlé.": "Area too bright or too dark: pick a gray or a white that isn’t clipped.",
  "Courbe de tons de la photo": "Photo tone curve",
  "Couche de la courbe": "Curve channel",
  "Touche la courbe pour ajouter un point.": "Tap the curve to add a point.",
  "Glisse un point, touche la courbe pour en ajouter un (16 au plus), double-clic sur un point pour le retirer. RVB agit sur toute l’image ; R, V et B sur une seule couleur. Appliquée après la lumière, avant le look.":
    "Drag a point, tap the curve to add one (16 at most), double-click a point to remove it. RGB acts on the whole image; R, G and B on a single color. Applied after light, before the look.",
  "Effet pellicule": "Film effect",
  "Double-clic sur un curseur : remise à zéro. Hautes lumières et Ombres agissent par zones ; Blancs et Noirs calent les extrémités de l’histogramme. La balance des blancs corrige l’éclairage de la prise de vue avant la recette. La halation ajoute le halo rouge des pellicules sans couche anti-halo autour des zones les plus claires ; elle s’ajoute à celle d’une pellicule.":
    "Double-click a slider: reset. Highlights and Shadows act by range; Whites and Blacks set the ends of the histogram. White balance corrects the shooting light before the recipe. Halation adds the red glow of films without an anti-halation layer around the brightest areas; it adds to a film’s own halation.",
  "0,0 IL": "0.0 EV",
  "0.0 IL": "0.0 EV",

  // --- Cadre ------------------------------------------------------------------------------------
  "Style de cadre": "Frame style",
  "Blanc": "White",
  "Crème": "Cream",
  "Noir": "Black",
  "Fin": "Thin",
  "Polaroid": "Polaroid",
  "Pellicule": "Film",
  "Bande de film": "Film strip",
  "La photo est recadrée au format de la vue ; fais-la glisser pour choisir le cadrage. Perforations en 35 mm, marges et numéros du 120. En demi-format, « Deux vues » met deux photos sur une même vue 24×36.":
    "The photo is cropped to the frame format; drag it to choose the crop. Sprocket holes on 35 mm, margins and numbers on 120. In half frame, “Two frames” puts two photos on one 24×36 frame.",
  "Vues": "Frames",
  "Vues du demi-format": "Half-frame frames",
  "Une vue": "One frame",
  "Deux vues": "Two frames",
  "Choisir la 2e photo": "Choose the 2nd photo",
  "Changer la 2e photo": "Change the 2nd photo",
  "Choisis la seconde photo de la vue.": "Choose the second photo for the frame.",
  "Seconde vue ajoutée. Elle prend le même look et la même retouche.": "Second frame added. It gets the same look and edits.",
  "2e vue": "2nd frame",
  "N° de vue": "Frame no.",
  "Infos": "Info",
  "Informations affichées": "Information shown",
  "Nom seul": "Name only",
  "Nom et commentaire": "Name and comment",
  "Complètes": "Full",
  "Commentaire": "Comment",
  "Signature": "Signature",
  "Ton nom ou tes initiales": "Your name or initials",
  "Style de signature": "Signature style",
  "Logo": "Logo",
  "Monogramme": "Monogram",
  "Manuscrit": "Handwritten",
  "Position de la signature": "Signature position",
  "Position": "Position",
  "Gauche": "Left",
  "Centre": "Center",
  "Droite": "Right",
  "Taille de la signature": "Signature size",
  "Taille": "Size",
  "Petite": "Small",
  "Moyenne": "Medium",
  "Grande": "Large",
  "Dos dateur": "Date back",
  "Date imprimée": "Printed date",
  "Date à imprimer": "Date to print",
  "Date": "Date",
  "De la photo": "From the photo",
  "Autre": "Other",
  "Ordre": "Order",
  "Ordre de la date": "Date order",
  "'AA MM JJ": "'YY MM DD",
  "JJ MM 'AA": "DD MM 'YY",
  "MM JJ 'AA": "MM DD 'YY",
  "Visible dans l’aperçu et dans la photo exportée. Le dos dateur imprime la date en chiffres orange dans la photo, comme les compacts argentiques : la date de prise de vue (EXIF), ou aujourd’hui à défaut. Rien n’est ajouté par défaut : choisis les infos à afficher, et écris ton nom pour ajouter une signature.":
    "Visible in the preview and the exported photo. The date back prints the date in orange digits on the photo, like film compacts: the capture date (EXIF), or today if missing. Nothing is added by default: choose the info to show, and type your name to add a signature.",
  "Importe une photo pour voir le cadre.": "Import a photo to see the frame.",
  "Format imposé par la bande de film": "Format set by the film strip",
  "Gros": "Large",
  "Moyen": "Medium",
  "Texture": "Texture",
  "Taille du grain": "Grain size",
  "Orig.": "Orig.",

  // --- Exporter et partager -------------------------------------------------------------------
  "Exporter et partager": "Export and share",
  "Fermer": "Close",
  "Photo exportée": "Exported photo",
  "Taille d’export": "Export size",
  "Pleine résolution": "Full resolution",
  "Web · 2048 px": "Web · 2048 px",
  "Instagram · 1080 px": "Instagram · 1080 px",
  "Qualité": "Quality",
  "Qualité JPEG": "JPEG quality",
  "Maximale": "Maximum",
  "Standard": "Standard",
  "Légère": "Light",
  "S’applique à « Exporter la photo » et aux séries. Instagram : 1080 px de large, cadre compris.": "Applies to “Export photo” and to series. Instagram: 1080 px wide, frame included.",
  "Exporter la photo": "Export photo",
  "Taille maximale que cet appareil peut calculer : la photo est légèrement réduite.": "Largest size this device can compute: the photo is slightly reduced.",
  "Images à partager": "Images to share",
  "L’original et le look, dans une seule image.": "The original and the look, in one image.",
  "Côte à côte": "Side by side",
  "Coupé": "Split",
  "Disposition": "Layout",
  "Créer l’avant / après": "Create before / after",
  "Planche contact": "Contact sheet",
  "Ta photo dans 2 à 9 looks, côte à côte.": "Your photo in 2 to 9 looks, side by side.",
  "Choisir les looks": "Choose looks",
  "Choisis de 2 à 9 looks.": "Choose 2 to 9 looks.",
  "Aperçu de la planche contact": "Contact sheet preview",
  "Créer la planche": "Create sheet",
  "Création…": "Creating…",
  "Fiche recette": "Recipe card",
  "Tous les réglages et un QR code qui ouvre la recette.": "All settings and a QR code that opens the recipe.",
  "Créer la fiche": "Create card",
  "Preset Lightroom et code de partage": "Lightroom preset and share code",
  "Preset Lightroom (.xmp)": "Lightroom preset (.xmp)",
  "Preset Lightroom pour": "Lightroom preset for",
  "Réglages Camera Raw écrits dans le preset": "Camera Raw settings written to the preset",
  "Copier la recette": "Copy recipe",
  "Copier le code de partage": "Copy share code",
  "Copier le lien": "Copy link",
  "Open Fuji Recipe (.json)": "Open Fuji Recipe (.json)",
  "Format ouvert Open Fuji Recipe, lu par d’autres applications": "Open Fuji Recipe open format, read by other apps",
  "Télécharger .recipe.json": "Download .recipe.json",
  "Profil X RAW Studio (.FP1)": "X RAW Studio profile (.FP1)",
  "Profil .FP1 de la recette": "Recipe .FP1 profile",
  "Photo prête": "Photo ready",
  "Enregistrer dans Photos": "Save to Photos",
  "Télécharger le fichier": "Download file",
  "Télécharger les fichiers": "Download files",
  "Photo enregistrée.": "Photo saved.",
  "Fichier téléchargé.": "File downloaded.",
  "Fichiers téléchargés.": "Files downloaded.",
  "Fais un appui long sur l’image puis « Ajouter à Photos », ou télécharge le fichier.": "Long-press the image then “Add to Photos”, or download the file.",
  "Touche « Enregistrer dans Photos », puis « Enregistrer l’image ». Tu peux aussi faire un appui long sur l’image.": "Tap “Save to Photos”, then “Save Image”. You can also long-press the image.",
  "Partage impossible : utilise l’appui long sur l’image ou le téléchargement.": "Sharing failed: long-press the image or download it.",
  "Export impossible. Essaie avec une photo plus petite.": "Export failed. Try a smaller photo.",
  "Aucune photo sélectionnée.": "No photo selected.",
  "La création de l’image a échoué.": "Creating the image failed.",
  "Avant / Après enregistré.": "Before / After saved.",
  "Avant / Après prêt": "Before / After ready",
  "Planche contact enregistrée.": "Contact sheet saved.",
  "Planche contact prête": "Contact sheet ready",
  "Fiche recette enregistrée.": "Recipe card saved.",
  "Fiche recette prête": "Recipe card ready",
  "Création de la fiche impossible.": "Couldn’t create the card.",
  "Choisis d’abord un look ou une recette.": "Pick a look or a recipe first.",
  "Importe d’abord une photo.": "Import a photo first.",
  "Série prête": "Series ready",
  "Code de partage copié.": "Share code copied.",
  "Copie impossible : ton navigateur bloque le presse-papiers.": "Copy failed: your browser blocks the clipboard.",
  "Lien copié : il ouvre cette recette dans Dialed.": "Link copied: it opens this recipe in Dialed.",
  "Preset téléchargé. Dans Lightroom : Paramètres prédéfinis → Importer.": "Preset downloaded. In Lightroom: Presets → Import.",
  "Recette copiée en texte.": "Recipe copied as text.",
  "Recette exportée au format Open Fuji Recipe.": "Recipe exported as Open Fuji Recipe.",

  // --- Importer et bibliothèque ---------------------------------------------------------------
  "Importer et bibliothèque": "Import and library",
  "Importer une recette": "Import a recipe",
  "Recette à importer": "Recipe to import",
  "Colle une recette (texte, code de partage": "Paste a recipe (text, share code",
  "ou lien de partage), charge un profil X RAW Studio (.FP1/.FP2/.FP3), un fichier": "or share link), load an X RAW Studio profile (.FP1/.FP2/.FP3), an",
  "ou une": "file or a",
  "capture d’écran": "screenshot",
  "de recette (lue sur ton appareil). Tu peux aussi faire Ctrl+V n’importe où sur la page.": "of a recipe (read on your device). You can also press Ctrl+V anywhere on the page.",
  "Picture Controls Nikon : charge un ou plusieurs fichiers": "Nikon Picture Controls: load one or more",
  "(Nikon Z, NX Studio). Ils s’ajoutent à l’onglet « Nikon ».": "files (Nikon Z, NX Studio). They are added to the “Nikon” tab.",
  "Appliquer": "Apply",
  "Fichier ou capture d’écran": "File or screenshot",
  "Les recettes enregistrées restent sur cet appareil et apparaissent en tête de l’onglet « Recettes ». Sauvegarde-les pour les transférer ailleurs.":
    "Saved recipes stay on this device and appear at the top of the “Recipes” tab. Back them up to move them elsewhere.",
  "Aucune recette enregistrée pour l’instant. Utilise « Enregistrer… » dans « Recette ».": "No saved recipes yet. Use “Save…” in “Recipe”.",
  "Ta bibliothèque est vide.": "Your library is empty.",
  "Sauvegarder la bibliothèque": "Back up library",
  "Restaurer une sauvegarde": "Restore a backup",
  "Ce fichier n’est pas une sauvegarde de bibliothèque.": "This file isn’t a library backup.",
  "Enregistrement impossible : le stockage du navigateur est indisponible.": "Can’t save: browser storage is unavailable.",
  "Photo d’exemple indisponible hors connexion.": "Sample photo unavailable offline.",
  "Utiliser cette recette": "Use this recipe",
  "Retirer": "Remove",
  "Ma recette": "My recipe",
  "Aucun réglage de recette reconnu.": "No recipe settings recognized.",
  "Aucun réglage reconnu dans cette image. Essaie une capture plus nette ou colle le texte.": "No settings recognized in this image. Try a sharper screenshot or paste the text.",
  "La lecture de captures d’écran nécessite que l’app soit servie en http(s) (GitHub Pages ou serveur local).": "Reading screenshots requires the app to be served over http(s) (GitHub Pages or a local server).",
  "Le lien ne contient pas de recette valide.": "The link doesn’t contain a valid recipe.",
  "Lecture de la capture d’écran…": "Reading the screenshot…",
  "Recette importée": "Recipe imported",
  "code de partage": "share code",
  "fichier de recette": "recipe file",
  "Choisis un fichier image valide.": "Choose a valid image file.",
  "Impossible de lire cette image. Essaie un autre fichier.": "Couldn’t read this image. Try another file.",
  "Ouverture de la photo iPhone…": "Opening iPhone photo…",
  "Photo chargée. Maintiens « Avant / Après » pour comparer.": "Photo loaded. Hold “Before / After” to compare.",
  "Importe une photo pour voir ce rendu sur ton image.": "Import a photo to see this rendering on your image.",
  "Le moteur de couleur et les simulations viennent de": "The color engine and simulations come from",
  "(MIT). Le catalogue reprend la bibliothèque": "(MIT). The catalog reuses the library",
  "(MIT) ; les recettes sont signées": "(MIT); recipes are by",
  ". La couleur des pellicules vient de la collection": ". Film colors come from the collection",
  "(MIT). Le catalogue Nikon liste les presets du dépôt": "(MIT). The Nikon catalog lists the presets from the repository",
  ": chaque fichier est téléchargé depuis ce dépôt quand tu l’affiches, et reste la propriété de son créateur (Nikon Creators, Mark G Adams, Scott Tucker…). Les fichiers .NP3 sont lus et écrits avec":
    ": each file is downloaded from that repository when you display it, and remains its creator’s property (Nikon Creators, Mark G Adams, Scott Tucker…). .NP3 files are read and written with",
  "(MIT). Le rendu s’approche du boîtier ou du film sans le reproduire exactement.": "(MIT). The rendering approaches the camera or film without reproducing it exactly.",

  // --- Mon boîtier, C1–C7, .FP1 -----------------------------------------------------------------
  "Modèle": "Model",
  "Aucun (pas de vérification)": "None (no check)",
  "Les recettes impossibles sur ce boîtier sont signalées dans les looks et dans « Recette ».": "Recipes impossible on this camera are flagged in the looks and in “Recipe”.",
  "Réglages perso C1–C7": "Custom settings C1–C7",
  "Range tes recettes dans les 7 emplacements, puis garde la fiche ou exporte les .FP1.": "Put your recipes in the 7 slots, then keep the card or export the .FP1 files.",
  "Fiche C1–C7 (image)": "C1–C7 card (image)",
  "Exporter les .FP1": "Export .FP1 files",
  "Charger le modèle de mon boîtier": "Load my camera’s template",
  "Dans X RAW Studio, appareil connecté, enregistre un profil puis charge-le ici une fois : Dialed reprend l’identité de ton boîtier. Ensuite, ouvre le .FP1 exporté dans X RAW Studio et envoie-le vers un emplacement C1–C7.":
    "In X RAW Studio, with the camera connected, save a profile then load it here once: Dialed reuses your camera’s identity. Then open the exported .FP1 in X RAW Studio and send it to a C1–C7 slot.",
  "Placer la recette en cours dans cet emplacement": "Put the current recipe in this slot",
  "Vide": "Empty",
  "Fiche C1–C7 enregistrée.": "C1–C7 card saved.",
  "Fiche C1–C7 prête": "C1–C7 card ready",
  "Place d’abord au moins une recette dans C1–C7.": "Put at least one recipe in C1–C7 first.",
  "Charge d’abord le modèle .FP1 de ton boîtier (Exporter la recette → Vers ton boîtier).": "Load your camera’s .FP1 template first (Export recipe → To your camera).",
  "Charge d’abord un .FP1 enregistré depuis ton boîtier dans X RAW Studio : il sert de modèle.": "Load an .FP1 saved from your camera in X RAW Studio first: it serves as a template.",
  "Ce fichier ne contient pas l’identité d’un boîtier (modèle et numéro de série).": "This file doesn’t contain a camera identity (model and serial number).",
  "Dynamic Range Auto : valeur du modèle conservée, à régler sur le boîtier.": "Dynamic Range Auto: template value kept, set it on the camera.",
  "Profil .FP1 téléchargé : ouvre-le dans X RAW Studio pour l’envoyer au boîtier.": ".FP1 profile downloaded: open it in X RAW Studio to send it to the camera.",
  "Clarity n’existe pas sur ce boîtier.": "Clarity doesn’t exist on this camera.",
  "Color Chrome Effect n’existe pas sur ce boîtier.": "Color Chrome Effect doesn’t exist on this camera.",
  "Color Chrome FX Blue n’existe pas sur ce boîtier.": "Color Chrome FX Blue doesn’t exist on this camera.",
  "Highlight / Shadow ne se règlent que par pas entiers : arrondis-les.": "Highlight / Shadow only take whole steps: round them.",
  "La taille du grain ne se règle pas : seul Weak / Strong est disponible.": "Grain size can’t be set: only Weak / Strong is available.",
  "Monochromatic Color (chaud / froid) n’existe pas sur ce boîtier.": "Monochromatic Color (warm / cool) doesn’t exist on this camera.",
  "Monochromatic Color (magenta / vert) n’existe pas sur ce boîtier.": "Monochromatic Color (magenta / green) doesn’t exist on this camera.",

  // --- Textes dessinés sur les images -----------------------------------------------------------
  "AVANT": "BEFORE",
  "Scanne pour ouvrir la recette": "Scan to open the recipe",
  "RECETTE FUJIFILM": "FUJIFILM RECIPE",
  "MES RÉGLAGES PERSONNALISÉS": "MY CUSTOM SETTINGS",
  "Dialed · aperçu approximatif, pas une reproduction exacte du traitement Fujifilm": "Dialed · approximate preview, not an exact reproduction of Fujifilm processing",

  // --- Divers -------------------------------------------------------------------------------------
  "Dialed est installée.": "Dialed is installed.",
  "Selon l’ISO (auto)": "Based on ISO (auto)",
  "Source": "Source",
  "Style": "Style",
  "Nom, simulation, film": "Name, simulation, film",
  "Réglages modifiés": "Changed settings",
  "Sans look": "No look",
  "exemple-jardin": "sample-garden",
  "exemple-nuit": "sample-night",
  "Courbe de tons de la photo": "Photo tone curve"
}));

// Textes avec une valeur variable : [expression, remplacement] (remplacement : texte avec $1… ou fonction).
const I18N_EN_PATTERNS = [
  [/^(.+) n’est présent sur le (.+) qu’avec un firmware récent : vérifie le menu\.$/, "$1 is only on the $2 with recent firmware: check the menu."],
  [/^(.+) n’existe pas sur le (.+)\.$/, "$1 doesn’t exist on the $2."],
  [/^Catalogue filtré pour ton (.+) \((.+)\)\.$/, "Catalog filtered for your $1 ($2)."],
  [/^Recette reproductible sur ton (.+)\.$/, "Recipe reproducible on your $1."],
  [/^Reproductible sur ton (.+)$/, "Reproducible on your $1"],
  [/^(\d+) réglages? à changer sur le boîtier\.$/, (m, n) => `${n} setting${n > 1 ? "s" : ""} to change on the camera.`],
  [/^(\d+) sélectionnés?$/, "$1 selected"],
  [/^APRÈS · (.+)$/, "AFTER · $1"],
  [/^(.+), point (\d+) : entrée (\d+), sortie (\d+)$/, (m, label, i, x, y) => `${t(label)}, point ${i}: input ${x}, output ${y}`],
  [/^Pellicule (.+)$/, "Film $1"],
  [/^Entrée (\d+) → sortie (\d+)$/, "Input $1 → output $2"],
  [/^Auto : exposition (\S+) IL, hautes lumières (\S+), ombres (\S+)\.$/, "Auto: exposure $1 EV, highlights $2, shadows $3."],
  [/^Point neutre : température (\S+), teinte (\S+)\.$/, "Neutral point: temperature $1, tint $2."],
  [/^(\d+) réglages? modifiés? par rapport à « (.+) »$/, (m, n, name) => `${n} setting${n > 1 ? "s" : ""} changed from “${name}”`],
  [/^Modifiée par rapport à « (.+) »$/, "Modified from “$1”"],
  [/^Format imposé par la bande de film \((.+)\)\. Fais glisser la photo pour la cadrer\.$/, (m, f) => `Format set by the film strip (${translateString(f) || f}). Drag the photo to frame it.`],
  [/^Modèle : (.+) \(n° de série …(.+)\)\.$/, "Template: $1 (serial no. …$2)."],
  [/^Modèle de ton (.+) enregistré sur cet appareil\.$/, "Your $1 template saved on this device."],
  [/^Profil \.FP1 téléchargé\. (.+)$/, (m, notes) => `.FP1 profile downloaded. ${translateString(notes) || notes}`],
  [/^(Poussé|Retenu) (\d+) IL$/, (m, w, n) => `${w === "Poussé" ? "Pushed" : "Pulled"} ${n} EV`],
  [/^Hautes lumières brûlées : (.+) % des pixels$/, "Clipped highlights: $1% of pixels"],
  [/^Ombres bouchées : (.+) % des pixels$/, "Crushed shadows: $1% of pixels"],
  [/^(\d+) recettes? restaurées?\.$/, (m, n) => `${n} recipe${n > 1 ? "s" : ""} restored.`],
  [/^Supprimer « (.+) » de ta bibliothèque \?$/, "Delete “$1” from your library?"],
  [/^Une recette nommée « (.+) » existe déjà\. La remplacer \?$/, "A recipe named “$1” already exists. Replace it?"],
  [/^« (.+) » supprimée\.$/, "“$1” deleted."],
  [/^« (.+) » enregistrée dans « Recettes »\.$/, "“$1” saved to “Recipes”."],
  [/^(Retirer|Ajouter) (.+) (des|aux) favoris$/, (m, verb, name) => `${verb === "Retirer" ? "Remove" : "Add"} ${name} ${verb === "Retirer" ? "from" : "to"} favorites`],
  [/^« (.+) » ajouté aux favoris\.$/, "“$1” added to favorites."],
  [/^« (.+) » retiré des favoris\.$/, "“$1” removed from favorites."],
  [/^(\d+) restants?$/, "$1 more"],
  [/^(\d+) Picture Controls Nikon ajoutés à l’onglet « Nikon »\.(.*)$/, (m, n, rest) => `${n} Nikon Picture Controls added to the “Nikon” tab.${rest ? " " + (translateString(rest.trim()) || rest) : ""}`],
  [/^« (.+) » ajouté à l’onglet « Nikon »\.(.*)$/, (m, name, rest) => `“${name}” added to the “Nikon” tab.${rest ? " " + (translateString(rest.trim()) || rest) : ""}`],
  [/^(Un fichier est|(\d+) fichiers sont) au format ancien \(\.NCP \/ NP2\) : ouvre-le dans NX Studio et enregistre-le en \.NP3\.$/,
    (m, w, n) => `${n ? `${n} files are` : "One file is"} in the old format (.NCP / NP2): open it in NX Studio and save it as .NP3.`],
  [/^Impossible de télécharger « (.+) »\. Vérifie la connexion\.$/, "Couldn’t download “$1”. Check your connection."],
  [/^LUT 3D du Picture Control téléchargée \((.+)\)\.$/, "Picture Control 3D LUT downloaded ($1)."],
  [/^Remplacer « (.+) » par ces réglages \?\n\nAnnuler : enregistrer une copie\.$/, "Replace “$1” with these settings?\n\nCancel: save a copy."],
  [/^Supprimer « (.+) » de l’onglet « Nikon » \?$/, "Delete “$1” from the “Nikon” tab?"],
  [/^Téléchargement de « (.+) »…$/, "Downloading “$1”…"],
  [/^« (.+) » supprimé\. Ses réglages restent appliqués jusqu’au prochain look\.$/, "“$1” deleted. Its settings stay applied until the next look."],
  [/^« (.+) » enregistré dans l’onglet « Nikon »\.$/, "“$1” saved to the “Nikon” tab."],
  [/^Photo réduite à (.+) : mémoire insuffisante sur cet appareil\.$/, "Photo reduced to $1: not enough memory on this device."],
  [/^Pleine résolution · (.+)$/, "Full resolution · $1"],
  [/^LUT téléchargée \((.+)\)\.$/, "LUT downloaded ($1)."],
  [/^ ?Température de couleur introuvable : réglée sur (\d+) K\.$/, "Color temperature not found: set to $1 K."],
  [/^(\d+) recettes? ajoutées? à la bibliothèque\.$/, (m, n) => `${n} recipe${n > 1 ? "s" : ""} added to the library.`],
  [/^(\d+) réglages? importés? \((.+)\)\. Vérifie-les dans « Recette »\.(.*)$/,
    (m, n, src, rest) => `${n} setting${n > 1 ? "s" : ""} imported (${translateString(src) || src}). Check them in “Recipe”.${rest ? " " + (translateString(rest.trim()) || rest) : ""}`],
  [/^Ce fichier contient (\d+) recettes\. Les ajouter toutes à ta bibliothèque \?$/, "This file contains $1 recipes. Add them all to your library?"],
  [/^Impossible de lire la capture d’écran \((.+)\)\.$/, "Couldn’t read the screenshot ($1)."],
  [/^Lecture de la capture d’écran… (\d+) %$/, "Reading the screenshot… $1%"],
  [/^Recette importée\. Ce fichier sert aussi de modèle \.FP1 pour ton (.+)\.$/, "Recipe imported. This file also serves as the .FP1 template for your $1."],
  [/^« (.+) » ne ressemble pas à un fichier de recette\.$/, "“$1” doesn’t look like a recipe file."],
  [/^Impossible de lire « (.+) »\.$/, "Couldn’t read “$1”."],
  [/^(\d+) photos? ajoutées? à la série\.$/, (m, n) => `${n} photo${n > 1 ? "s" : ""} added to the series.`],
  [/^(\d+) photos enregistrées\.$/, "$1 photos saved."],
  [/^(\d+) photos chargées : la recette et la retouche s’appliquent à toute la série\.$/, "$1 photos loaded: the recipe and edits apply to the whole series."],
  [/^Export interrompu à la photo (\d+)\. Essaie une taille d’export plus petite\.$/, "Export stopped at photo $1. Try a smaller export size."],
  [/^Exporter les (\d+) photos de la série$/, "Export the $1 photos in the series"],
  [/^Exporter les (\d+) photos$/, "Export the $1 photos"],
  [/^Retirer la photo (\d+) de la série$/, "Remove photo $1 from the series"],
  [/^(\d+) photos prêtes : télécharge les fichiers\.$/, "$1 photos ready: download the files."],
  [/^(\d+) photos prêtes\. Touche « Enregistrer les \d+ photos », puis « Enregistrer les images »\.$/, (m, n) => `${n} photos ready. Tap “Save ${n} photos”, then “Save Images”.`],
  [/^(\d+) photos téléchargées\.$/, "$1 photos downloaded."],
  [/^Enregistrer les (\d+) photos$/, "Save $1 photos"],
  [/^(.+) téléchargée\.$/, (m, what) => `${translateString(what + " prête")?.replace(/ ready$/, "") || what} downloaded.`],
  [/^(\d+) profils? \.FP1 téléchargés?\.$/, (m, n) => `${n} .FP1 profile${n > 1 ? "s" : ""} downloaded.`],
  [/^« (.+) » placée en C(\d)\.$/, "“$1” placed in C$2."],
  [/^(\d+) versions au plus : supprime-en une pour en garder une autre\.$/, "$1 versions at most: delete one to keep another."],
  [/^Retour à (.+)\.$/, "Back to $1."],
  [/^V(\d+) gardée\. Essaie un autre look, puis compare\.$/, "V$1 kept. Try another look, then compare."],
  [/^(.+) : $/, (m, label) => `${translateString(label) || label}: `]
];

// Traduit un texte (null s'il n'y a pas de traduction). Les espaces autour sont conservés.
function translateString(text) {
  if (LANG === "fr" || typeof text !== "string") return null;
  const key = text.replace(/\s+/g, " ").trim();
  if (!key || !/[A-Za-zÀ-ÿ]/.test(key)) return null;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  const exact = I18N_EN.get(key);
  if (exact !== undefined) return lead + exact + trail;
  for (const [re, rep] of I18N_EN_PATTERNS) {
    if (re.test(key)) return lead + key.replace(re, rep) + trail;
  }
  // « … » : citation (par exemple l'esprit d'une pellicule).
  const quoted = key.match(/^« (.+) »$/);
  if (quoted) {
    const inner = I18N_EN.get(quoted[1]);
    if (inner) return `${lead}“${inner}”${trail}`;
  }
  // « Nom · détail · détail » : chaque partie traduite séparément.
  if (key.includes(" · ")) {
    let changed = false;
    const parts = key.split(" · ").map((part) => {
      const tr = I18N_EN.get(part);
      if (tr === undefined) return part;
      changed = true;
      return tr;
    });
    if (changed) return lead + parts.join(" · ") + trail;
  }
  return null;
}

// Pour le code : t("Texte français") renvoie la traduction, ou le texte tel quel.
function t(text) {
  return translateString(text) ?? text;
}

// --- Traduction de la page --------------------------------------------------------------------

const I18N_ATTRS = ["title", "aria-label", "placeholder", "alt"];

function translateElementAttrs(el) {
  for (const name of I18N_ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    const tr = translateString(value);
    if (tr !== null && tr !== value) el.setAttribute(name, tr);
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    const tr = translateString(root.nodeValue);
    if (tr !== null && tr !== root.nodeValue) root.nodeValue = tr;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateElementAttrs(root);
  if (root.closest("script, style, textarea, svg")) return;
  // Champs de saisie : libellés traduits, jamais leur contenu.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE || !/^(SCRIPT|STYLE|TEXTAREA|svg)$/.test(node.nodeName)) return NodeFilter.FILTER_ACCEPT;
      if (node.nodeName === "TEXTAREA") translateElementAttrs(node);
      return NodeFilter.FILTER_REJECT;
    }
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const tr = translateString(node.nodeValue);
      if (tr !== null && tr !== node.nodeValue) node.nodeValue = tr;
    } else {
      translateElementAttrs(node);
    }
  }
}

if (LANG === "en") {
  translateTree(document.body);
  document.title = "Dialed — find your camera recipe";

  // Tout ce que les scripts ajoutent ou modifient ensuite est traduit au passage.
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") m.addedNodes.forEach(translateTree);
      else if (m.type === "characterData") translateTree(m.target);
      else if (m.type === "attributes") translateElementAttrs(m.target);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });

  // Dialogues du navigateur et textes dessinés sur les images (fiche recette, planche contact…).
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (message) => nativeConfirm(t(String(message)));
  const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
    return nativeFillText.call(this, typeof text === "string" ? t(text) : text, ...rest);
  };
}

// --- Choix de la langue (menu …) ------------------------------------------------------------

document.querySelectorAll("[data-lang-choice]").forEach((button) => {
  button.setAttribute("aria-pressed", String(button.dataset.langChoice === LANG));
  button.addEventListener("click", () => {
    if (button.dataset.langChoice === LANG) return;
    try {
      localStorage.setItem(LANG_KEY, JSON.stringify(button.dataset.langChoice));
    } catch {
      /* sans stockage, la langue suit le navigateur */
    }
    location.reload();
  });
});
