# Générateur des illustrations de créatures

Outil hors jeu (Node + Google Chrome) qui peint les 96 créatures et produit leurs calques dans `assets/creatures/`, ainsi que `src/ui/creatures/sprites.ts`.

## Fichiers
- `roster.js` : la direction artistique de chaque créature (espèce, parties, couleurs). C'est le fichier à modifier pour retoucher une créature.
- `parts.js` : la bibliothèque de parties et de gabarits (animal assis, créature flottante, serpent).
- `paint.js` : le rendu « peint » (ombres et lumières douces, reflets colorés, grain, contours irréguliers).
- `creature.js` : assemble une créature en 5 calques (corps et tête de face, corps et tête de dos, aile).
- `backdrop.js` : les ciels de cartes par type.
- `png8.js` : compression en PNG à palette avec tramage.
- `build.js` : rendu Chrome, découpe, compression, écriture des fichiers du jeu.
- `preview.js` : planche de contrôle (carte de face + vue de dos) dans `out/`.

## Utilisation
```bash
node preview.js moss dragon koi
```
```bash
node build.js moss dragon
```
```bash
node build.js
```
- `preview.js` rend une planche de contrôle des créatures citées (ou `--page=N` par 12).
- `build.js` sans argument reconstruit les 96 créatures (environ 6 minutes), avec des identifiants il ne reconstruit que celles-là.
- `node build.js --backdrops` ne refait que les ciels et `sprites.ts`.

Chrome doit être installé ; un autre chemin peut être donné avec la variable d'environnement `CHROME`.
