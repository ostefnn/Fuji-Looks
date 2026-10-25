# Fuji Looks

Applique des recettes Fujifilm à tes photos, directement dans ton navigateur. Rien n'est envoyé en ligne : les photos restent sur ton appareil.

**En ligne :** https://ostefnn.github.io/Fuji-Looks/

## Fonctionnalités

- **Looks** : tes recettes, un **catalogue de 344 recettes** (340 de Kata, filtrables par capteur avec un lien vers chaque article d'origine, et les exemples du convertisseur) et les 20 simulations de film Fujifilm, classés par Film Simulation, avec recherche, un filtre unique (Couleur, N&B ou une simulation précise) et favoris ; 24 looks à la fois avec « Afficher plus ». Survole un look à la souris pour le voir sur ta photo avant de cliquer.
- **Panneau en accordéons**, dans l'ordre du travail : Recette, Retouche, Cadre, Exporter et partager, Mon boîtier, Importer et bibliothèque. Chaque en-tête résume son état (simulation, cadre choisi, boîtier…) et l'app retient ceux que tu laisses ouverts.
- **Réglages de la recette** : tous les réglages sous leurs noms Fujifilm (Film Simulation, Dynamic Range, White Balance, Grain, Color Chrome, Highlight, Shadow, Clarity…), avec Annuler / Rétablir (Ctrl+Z / Ctrl+Maj+Z).
- **Balance des blancs simulée** : le mode de la recette (Daylight, Incandescent, Kelvin…) est appliqué comme sur le boîtier, pour une photo prise en lumière du jour. Un interrupteur revient au comportement du convertisseur (décalage R/B seulement) ; l'aperçu est alors identique au sien, pixel pour pixel.
- **Compatibilité boîtier** : choisis ton appareil (X-Trans III à V) pour savoir si une recette est reproductible.
- **Mon boîtier · C1–C7** : range tes recettes dans les 7 réglages perso, vérifie leur compatibilité, garde la fiche en image ou exporte un .FP1 par emplacement.
- **Comparer deux recettes** : seuls les réglages qui changent, pour savoir quoi modifier sur le boîtier.
- **Retouche** : format (1:1, 4:5, 3:2, 16:9, 9:16) avec **cadrage déplaçable**, rotation, redressement, exposition, hautes lumières / ombres, **blancs / noirs**, bouton **Auto**, et **balance des blancs de la photo** (température, teinte, pipette « point neutre ») pour corriger l'éclairage avant la recette. Effet pellicule **Halation** (halo rouge façon CineStill 800T), en option.
- **Aperçu** : zoom, déplacement, Avant / Après (maintenir le bouton), intensité du look et **histogramme** RVB en direct, avec la part d'ombres bouchées et de hautes lumières brûlées, et le bouton **Zones** qui les montre sur la photo (rouge / bleu).
- **Cadre** : Blanc, Crème, Noir, Fin, Polaroid ou Pellicule, avec au choix le nom de la recette, ses réglages ou rien, et ta **signature** (Logo, Monogramme ou Manuscrit, à gauche, au centre ou à droite). Tout est désactivé par défaut.
- **Export** : JPEG en pleine résolution, « Web » (2048 px) ou « Instagram » (1080 px de large), qualité au choix, avec les métadonnées EXIF conservées.
- **Séries** : choisis plusieurs photos à l'import ; la recette, la retouche et le cadre s'appliquent à toute la série, exportée en une fois. Sur iPhone / Android, l'écran « Photo prête » propose **Enregistrer dans Photos** (ou appui long sur l'image).
- **Partager** : image **Avant / Après** (côte à côte ou coupée), **planche contact** de ta photo dans 2 à 9 looks, et **fiche recette** avec un QR code qui ouvre la recette dans l'app.
- **Recettes** : import par texte, code ou lien de partage, profil X RAW Studio (.FP1/.FP2/.FP3), `.recipe.json`, Open Fuji Recipe (une recette ou toute une bibliothèque) ou capture d'écran (lue sur l'appareil). Export en preset Lightroom (.xmp), LUT 3D (.cube), texte, lien de partage, **Open Fuji Recipe** (format JSON ouvert, compatible avec Kata) et **profil X RAW Studio (.FP1)** pour envoyer la recette vers le boîtier (à partir d'un .FP1 enregistré une fois depuis ton appareil, qui sert de modèle).
- **Bibliothèque** sur l'appareil, avec sauvegarde et restauration compatibles avec Fuji Recipe Converter.
- **Application installable** et utilisable hors connexion. Sur iPhone : Partager → « Sur l'écran d'accueil ».

Les fichiers RAW (.RAF) ne peuvent pas être lus dans le navigateur : pars d'un JPEG ou d'un HEIC.

## Ajouter une recette

Deux façons, selon que la recette est pour toi seul ou pour tout le monde.

### Pour toi, sur ton appareil (le plus rapide)

1. Copie la recette depuis le site, le post ou la note où elle se trouve.
2. Dans l'app : **Importer et bibliothèque** → **Importer une recette**, colle le texte, puis **Appliquer**.
3. Vérifie les réglages dans **Recette**, puis touche **Enregistrer**. Elle apparaît en tête de l'onglet « Recettes », sur cet appareil seulement.

L'import comprend la plupart des façons d'écrire une recette : puces (`*`, `•`), tabulations, abréviations (`Col. Chr. Effect`, `ISO N.R.`, `EV Comp.`, `WB: K-7500`…), tirets typographiques. Il lit aussi les codes et liens de partage, les profils X RAW Studio (.FP1), les fichiers Open Fuji Recipe et les captures d'écran.

### Pour tout le monde, dans le dépôt GitHub

Les recettes intégrées à l'app sont dans [`custom-recipes.js`](custom-recipes.js). Tout se fait depuis le site GitHub, sans rien installer, même sur iPhone.

1. **Ouvre le fichier** : sur github.com, va dans le dépôt `ostefnn/Fuji-Looks`, puis clique sur `custom-recipes.js`.
2. **Passe en modification** : clique sur l'icône crayon ✏️ (« Edit this file ») en haut à droite du fichier.
3. **Va tout en bas** du fichier. La dernière recette se termine par :
   ```js
   Clarity: 0`
     }
   ];
   ```
4. **Ajoute une virgule** après le `}` de la dernière recette, puis **colle le bloc de ta recette** juste avant le `];` final :
   ```js
     },
     {
       name: "Ma recette",
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
   Clarity: 0
   Exposure Compensation: +1/3`
     }
   ];
   ```
5. **Enregistre** : clique sur **Commit changes…**, écris un message (par exemple « Ajout de la recette Ma recette »), laisse « Commit directly to the main branch » coché, puis valide.
6. **Attends 1 à 2 minutes** que GitHub Pages republie le site, puis recharge l'app : la recette est dans l'onglet « Recettes ».

#### Les règles à respecter

- Le texte de la recette est entre deux **accents graves** `` ` `` (touche `` ` `` ; sur iPhone, appui long sur l'apostrophe). N'utilise pas d'accent grave à l'intérieur du texte.
- Chaque recette est entourée de `{ … }`, séparée de la suivante par une **virgule**.
- **Ajoute toujours à la fin** : les favoris et les emplacements C1–C7 sont liés à la position des recettes. En insérer une au milieu décalerait les suivantes.
- Une ligne par réglage, au format `Réglage: valeur`. Les lignes absentes prennent la valeur par défaut (0 ou Off).
- Facultatif : `author: "Nom",` pour créditer l'auteur, et `notes: "…",` pour un conseil de prise de vue. Ces deux lignes se placent sous `name`.

#### Réglages reconnus

| Réglage | Exemples de valeurs |
|---|---|
| `Film Simulation` | Provia, Velvia, Astia, Classic Chrome, Reala Ace, Pro Neg. Hi, Pro Neg. Std, Classic Neg., Nostalgic Neg., Eterna, Eterna Bleach Bypass, Acros (+ Ye, R, G), Monochrome (+ Ye, R, G), Sepia |
| `Dynamic Range` | DR100, DR200, DR400, Auto |
| `White Balance` | Auto, Auto White Priority, Auto Ambience Priority, Daylight, Shade, Incandescent, Fluorescent 1 / 2 / 3, Underwater, ou une température : `7500K` |
| `WB Shift Red`, `WB Shift Blue` | de -9 à +9 (ou sur la ligne White Balance : `Auto, +2 Red & -1 Blue`) |
| `Grain Effect`, `Grain Size` | Off, Weak, Strong ; Small, Large |
| `Color Chrome Effect`, `Color Chrome FX Blue` | Off, Weak, Strong |
| `Color`, `Sharpness`, `Noise Reduction` | de -4 à +4 |
| `Highlight`, `Shadow` | de -2 à +4, par demi-pas (`+1.5`) |
| `Clarity` | de -5 à +5 |
| `Monochromatic Color WC`, `Monochromatic Color MG` (N&B) | de -18 à +18, une ligne chacun |
| `ISO`, `Exposure Compensation` | texte libre : `Auto up to ISO 6400`, `+1/3 to +2/3` |

**Astuce** : avant de modifier le fichier, colle la recette dans **Importer une recette** dans l'app pour vérifier qu'elle est bien lue, puis copie les valeurs affichées dans **Recette**.

Si l'app ne s'affiche plus après une modification, c'est presque toujours une virgule ou un accent grave oublié. Ouvre l'historique du fichier sur GitHub (« History ») pour revenir à la version précédente.

## Lancer en local

Aucune compilation. Sers le dossier avec n'importe quel serveur statique, par exemple :

```sh
python3 -m http.server 8000
```

puis ouvre http://localhost:8000/. Ouvrir `index.html` directement fonctionne aussi, sauf la lecture de captures d'écran, le mode hors connexion et l'export en arrière-plan.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css` | Page et styles |
| `custom-recipes.js` | Recettes perso au format texte |
| `js/kata-catalog.js` | Catalogue de 340 recettes (données générées depuis Kata) |
| `js/histogram.js` | Histogramme de l'aperçu |
| `js/series.js` | Série de photos et export groupé |
| `js/pipeline.js` | Rendu recette → LUT 3D → pixels (partagé avec le worker) |
| `js/export-worker.js` | Calcul de l'export en arrière-plan |
| `js/*.js` | Un fichier par partie de l'interface (looks, éditeur, zoom, cadre, EXIF…) chargés dans l'ordre de `index.html` |
| `js/cameras.js` | Boîtiers et réglages disponibles : à compléter si besoin |
| `sw.js`, `manifest.webmanifest`, `icons/` | Application installable et hors connexion |
| `vendor/` | Code tiers, voir ci-dessous |

## Licence

Le code de Fuji Looks est sous licence [MIT](LICENSE). Le code tiers dans `vendor/` garde sa propre licence (voir Crédits).

## Crédits

- Moteur de couleur, simulations, imports et exports : [Fuji Recipe Converter](https://github.com/sadziu/Fuji-Recipe-Converter) (MIT), copié sans modification dans `vendor/fuji-recipe-converter/`. Avec la simulation de la balance des blancs désactivée, l'aperçu de Fuji Looks est identique au sien, pixel pour pixel.
- Lecture de captures d'écran : Tesseract.js (Apache-2.0). Photos HEIC : heic-to (LGPL-3.0). QR codes : QR Code Generator de Kazuhiko Arase (MIT). Police manuscrite : Great Vibes (SIL OFL 1.1). Détails dans [`vendor/THIRD-PARTY-NOTICES.md`](vendor/THIRD-PARTY-NOTICES.md).
- Recettes Kodachrome 64, Kodachrome 25, Kodachrome II, Vintage Color v2, Fujicolor NPH et Kodak T-Max P3200 : [Fuji X Weekly](https://fujixweekly.com).
- Recettes au format .FP1 : [quiode/fujifilm-recipes](https://github.com/quiode/fujifilm-recipes) (MIT ; recettes d'origine Fuji X Weekly).
- Catalogue : instantané de la bibliothèque [Kata](https://github.com/parth181195/kata) (MIT, commit `0c47ee2`), recettes de [Fuji X Weekly](https://fujixweekly.com). Seuls les réglages sont repris ; chaque recette renvoie vers son article. Si tu utilises ces recettes, pense à soutenir l'auteur ([App Patron](https://fujixweekly.com/2021/10/22/why-should-you-become-a-fuji-x-weekly-app-patron/)).

Projet indépendant, non affilié à FUJIFILM Corporation ni à Adobe. Les rendus sont des approximations du traitement des boîtiers Fujifilm.
