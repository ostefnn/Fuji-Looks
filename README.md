# Fuji Looks

Applique des recettes Fujifilm à tes photos, directement dans ton navigateur. Rien n'est envoyé en ligne : les photos restent sur ton appareil.

**En ligne :** https://ostefnn.github.io/Fuji-Looks/

## Fonctionnalités

- **Looks** : tes recettes, un **catalogue de 340 recettes** (filtrable par capteur, avec un lien vers chaque article d'origine), des recettes de départ et les 20 simulations de film Fujifilm, classés par Film Simulation, avec recherche, filtres Couleur / N&B et par simulation, et favoris. Survole un look à la souris pour le voir sur ta photo avant de cliquer.
- **Panneau en accordéons**, dans l'ordre du travail : Recette, Retouche, Cadre, Exporter et partager, Mon boîtier, Importer et bibliothèque. Chaque en-tête résume son état (simulation, cadre choisi, boîtier…) et l'app retient ceux que tu laisses ouverts.
- **Réglages de la recette** : tous les réglages sous leurs noms Fujifilm (Film Simulation, Dynamic Range, White Balance, Grain, Color Chrome, Highlight, Shadow, Clarity…), avec Annuler / Rétablir (Ctrl+Z / Ctrl+Maj+Z).
- **Balance des blancs simulée** : le mode de la recette (Daylight, Incandescent, Kelvin…) est appliqué comme sur le boîtier, pour une photo prise en lumière du jour. Un interrupteur revient au comportement du convertisseur (décalage R/B seulement) ; l'aperçu est alors identique au sien, pixel pour pixel.
- **Compatibilité boîtier** : choisis ton appareil (X-Trans III à V) pour savoir si une recette est reproductible.
- **Mon boîtier · C1–C7** : range tes recettes dans les 7 réglages perso, vérifie leur compatibilité, garde la fiche en image ou exporte un .FP1 par emplacement.
- **Comparer deux recettes** : seuls les réglages qui changent, pour savoir quoi modifier sur le boîtier.
- **Retouche** : format (1:1, 4:5, 3:2, 16:9, 9:16), rotation, redressement, exposition, hautes lumières / ombres et bouton **Auto**.
- **Aperçu** : zoom, déplacement, Avant / Après (maintenir le bouton), intensité du look.
- **Cadre** : Blanc, Crème, Noir, Fin, Polaroid ou Pellicule, avec au choix le nom de la recette, ses réglages ou rien, et ta **signature** (Logo, Monogramme ou Manuscrit).
- **Export** : JPEG pleine résolution avec les métadonnées EXIF conservées. Sur iPhone / Android, l'écran « Photo prête » propose **Enregistrer dans Photos** (ou appui long sur l'image).
- **Partager** : image **Avant / Après** (côte à côte ou coupée), **planche contact** de ta photo dans 2 à 9 looks, et **fiche recette** avec un QR code qui ouvre la recette dans l'app.
- **Recettes** : import par texte, code ou lien de partage, profil X RAW Studio (.FP1/.FP2/.FP3), `.recipe.json`, Open Fuji Recipe (une recette ou toute une bibliothèque) ou capture d'écran (lue sur l'appareil). Export en preset Lightroom (.xmp), LUT 3D (.cube), texte, lien de partage, **Open Fuji Recipe** (format JSON ouvert, compatible avec Kata) et **profil X RAW Studio (.FP1)** pour envoyer la recette vers le boîtier (à partir d'un .FP1 enregistré une fois depuis ton appareil, qui sert de modèle).
- **Bibliothèque** sur l'appareil, avec sauvegarde et restauration compatibles avec Fuji Recipe Converter.
- **Application installable** et utilisable hors connexion. Sur iPhone : Partager → « Sur l'écran d'accueil ».

Les fichiers RAW (.RAF) ne peuvent pas être lus dans le navigateur : pars d'un JPEG ou d'un HEIC.

## Ajouter une recette

Le plus simple : colle la recette dans **Importer une recette**, puis clique sur **Enregistrer**. Elle reste dans ta bibliothèque sur cet appareil.

Pour qu'elle soit présente pour tout le monde, ajoute-la à la fin de [`custom-recipes.js`](custom-recipes.js), au format texte Fujifilm :

```js
{
  name: "Ma recette",
  author: "Optionnel",
  text: `Film Simulation: Classic Chrome
Dynamic Range: DR200
White Balance: Daylight, +2 Red & -5 Blue
...`
}
```

Ajoute les nouvelles recettes **à la fin** du tableau : les favoris sont liés à leur position.

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
