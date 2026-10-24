# Fuji Looks

Applique des recettes Fujifilm à tes photos, directement dans ton navigateur. Rien n'est envoyé en ligne : les photos restent sur ton appareil.

**En ligne :** https://ostefnn.github.io/Fuji-Looks/

## Fonctionnalités

- **Looks** : tes recettes, des recettes de départ et les 20 simulations de film Fujifilm, avec recherche, filtres Couleur / N&B et favoris. Survole un look à la souris pour le voir sur ta photo avant de cliquer.
- **Réglages de la recette** : tous les réglages sous leurs noms Fujifilm (Film Simulation, Dynamic Range, White Balance, Grain, Color Chrome, Highlight, Shadow, Clarity…), avec Annuler / Rétablir (Ctrl+Z / Ctrl+Maj+Z).
- **Compatibilité boîtier** : choisis ton appareil (X-Trans III à V) pour savoir si une recette est reproductible.
- **Retouche** : format (1:1, 4:5, 3:2, 16:9, 9:16), rotation, redressement et exposition.
- **Aperçu** : zoom, déplacement, Avant / Après (maintenir le bouton), intensité du look.
- **Cadre façon tirage** (blanc ou noir) avec le nom de la recette et ses réglages.
- **Export** : JPEG pleine résolution avec les métadonnées EXIF conservées. Sur mobile, la feuille de partage permet « Enregistrer l'image » dans Photos.
- **Recettes** : import par texte, code ou lien de partage, profil X RAW Studio (.FP1/.FP2/.FP3), `.recipe.json` ou capture d'écran (lue sur l'appareil). Export en preset Lightroom (.xmp), LUT 3D (.cube), texte, lien de partage et **fiche recette en image**.
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
| `js/pipeline.js` | Rendu recette → LUT 3D → pixels (partagé avec le worker) |
| `js/export-worker.js` | Calcul de l'export en arrière-plan |
| `js/*.js` | Un fichier par partie de l'interface (looks, éditeur, zoom, cadre, EXIF…) chargés dans l'ordre de `index.html` |
| `js/cameras.js` | Boîtiers et réglages disponibles : à compléter si besoin |
| `sw.js`, `manifest.webmanifest`, `icons/` | Application installable et hors connexion |
| `vendor/` | Code tiers, voir ci-dessous |

## Licence

Le code de Fuji Looks est sous licence [MIT](LICENSE). Le code tiers dans `vendor/` garde sa propre licence (voir Crédits).

## Crédits

- Moteur de couleur, simulations, imports et exports : [Fuji Recipe Converter](https://github.com/sadziu/Fuji-Recipe-Converter) (MIT), copié sans modification dans `vendor/fuji-recipe-converter/`. L'aperçu de Fuji Looks est identique au sien, pixel pour pixel.
- Lecture de captures d'écran : Tesseract.js (Apache-2.0). Photos HEIC : heic-to (LGPL-3.0). Détails dans [`vendor/THIRD-PARTY-NOTICES.md`](vendor/THIRD-PARTY-NOTICES.md).
- Recettes Kodachrome 64, Kodachrome 25, Kodachrome II, Vintage Color v2, Fujicolor NPH et Kodak T-Max P3200 : [Fuji X Weekly](https://fujixweekly.com).

Projet indépendant, non affilié à FUJIFILM Corporation ni à Adobe. Les rendus sont des approximations du traitement des boîtiers Fujifilm.
