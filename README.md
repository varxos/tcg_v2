# Booster Burst V2 — prototype mobile

Version 2 du prototype Expo SDK 57 / React Native. Elle reprend tout le projet de base (ouverture d'étoiles, roulette, collection, profil, boutique, étoile de test) et ajoute un vrai jeu autour de la collection.

## Lancer sur le téléphone (Expo Go)

1. `npm install` (déjà fait si `node_modules` est présent)
2. `npx expo start`
3. Scanner le QR code avec Expo Go (même réseau Wi-Fi que le PC).

Aperçu navigateur (pratique pour vérifier la mise en page) : `npm run web`.

## Nouveautés de la V2

### Combat complet façon Pokémon
- Écran de combat dédié : arène dessinée en SVG (4 thèmes), créatures sur plateformes, boîtes d'info avec PV animés et barre d'XP, texte machine à écrire, vitesse ×1/×2.
- Menu **FIGHT / SQUAD / BAG / RUN**, 4 attaques par créature avec PP, puissance, précision et priorité (appui long = détails).
- 6 types (Flame, Nature, Tide, Crystal, Lunar, Stellar), table des types ×2 / ×0.5, bonus de même type ×1.5, coups critiques.
- Statuts (brûlure, poison, sommeil, gel, éblouissement) avec immunités, modificateurs de stats de −6 à +6, attaques qui drainent, recul, soins.
- Niveaux 1 à 50, XP par K.O. (partagée avec l'équipe), gain de niveau en plein combat, nouvelles attaques apprises. Chaque créature a une attaque signature.
- IA ennemie : aléatoire pour les créatures sauvages, tactique pour les Gardiens (choix du meilleur coup, du meilleur remplaçant, objets de soin).
- Animations : entrée en scène, attaque avec projectile, impact, tremblement, flash, dégâts flottants, K.O., changement de créature, écran de victoire avec récompenses et progression de l'équipe.

### Progression
- **Partenaire de départ** au premier lancement (Emberling, Petalprance ou Wishwhale).
- **Wild Skies** : combats d'entraînement répétables adaptés au niveau de l'équipe.
- **Starfall Circuit** : 8 Gardiens à battre dans l'ordre, chacun avec son type, son arène, son Sigil et ses récompenses (revanches possibles).
- **Squad** : équipe de 5, 3 decks sauvegardables, fiche détaillée de chaque créature (stats, attaques, attaques futures) et Stardust Candy.
- **Sac et boutique Supplies** : Star Tonic, Nova Elixir, Clarity Dew, Revive Shard, Stardust Candy.
- Les doublons obtenus en ouvrant des étoiles donnent de l'XP à la créature (jusqu'au niveau 30).
- **Sauvegarde locale automatique** (AsyncStorage). Réinitialisable dans Profil › Settings.

### Quêtes cohérentes
- **Histoire** : 9 chapitres qui guident à travers tous les systèmes (étoiles, combats, équipe, types, constellations) jusqu'au Champion, avec récompense de fin de chapitre.
- **Quotidiennes** : 3 quêtes par jour (1 liée aux étoiles, 2 liées aux combats) et un bonus si les trois sont réclamées.
- **Paliers** : objectifs à long terme (étoiles ouvertes, collection, victoires, super efficaces, niveau max, Sigils, Golden).

### Constellations refaites
- Ciel entièrement dessiné en SVG à partir des mêmes coordonnées pour les lignes et les étoiles : plus aucun décalage, quelle que soit la largeur de l'écran.
- Nébuleuses, étoiles de fond, scintillements, anneau de progression autour de chaque étoile, lignes qui s'allument quand les deux étoiles sont complétées.
- Détail d'une étoile : toutes les créatures du groupe (obtenues / manquantes).

### Collection
- La collection utilise désormais toutes les créatures qui avaient déjà une illustration, un nom et une description (93 créatures au lieu de 48).

## Mise à jour 0.3 — Profil, langues, réglages, sons

### Profil
- **Photo de profil** : l'ancien rond est remplacé par un avatar au choix parmi ses propres créatures, avec un cadre cosmétique (Basic, Wave Ring, Astral Halo, Sigil Ring, Golden Crown).
- **Titres** : *Warden Breaker* et *Starfall Champion* sont maintenant affichés en gris ; *Golden Celestin* garde son effet doré.
- **Bannières** : 8 bannières en SVG : Night Voyage, **Star Chart** (qui reprend le fond des constellations), Ember Circuit, Wildwood Glade, First Light, Aurora Veil, Seraph Summit et Golden Zenith.
- **Obtention claire des cosmétiques** : chaque titre, bannière ou cadre verrouillé affiche sa condition exacte et une barre de progression.
  - Exemple : *Golden Celestin* indique « Terminez les trois constellations Golden : Gilded Epic, Gilded Legend et Gilded Seraph ».
  - Les récompenses cosmétiques apparaissent aussi là où on les gagne : sur la constellation, sur le Gardien et dans Wild Skies.
  - Une fenêtre « Nouveau cosmétique débloqué » s'ouvre au moment du déblocage, avec un bouton pour l'équiper tout de suite.

### Langues
- 10 langues : English, Français, Español, Português, Deutsch, Italiano, Русский, 日本語, 한국어, 简体中文.
- La langue du téléphone est détectée au premier lancement et peut être changée dans Profil › Réglages.
- Les noms propres restent tels quels dans toutes les langues : Celesti, créatures, attaques, objets, Gardiens, constellations, étoiles, Sigils, Wild Skies, Starfall Circuit, cosmétiques.
- Tous les textes du jeu sont traduits : interface, messages de combat, quêtes, descriptions des créatures et des attaques, dialogues des Gardiens.

### Réglages
- Audio : effets sonores et musique, chacun avec son interrupteur et son volume.
- Jeu : vibrations, vitesse du texte en combat (normal / rapide) et ouverture rapide (sans roulette).
- À propos : version, ID joueur, crédits. Données : réinitialisation de la sauvegarde. Mode développeur.

### Sons et musique
- 39 effets sonores (menus, roulette, révélations par rareté, attaques par type, coups, critiques, K.O., soins, montée de niveau, victoire, défaite…) et 2 musiques en boucle (hub et combat) dans `assets/sounds/`.
- Tous les sons sont synthétisés par programme (FM, filtres, réverbération), il n'y a aucun échantillon externe, donc aucun problème de droits.
- Lecture via `expo-audio`, qui respecte le mode silencieux d'iOS et met la musique en pause quand l'app passe en arrière-plan.

## Mise à jour 0.4 — Étoiles, événement bêta, Supernova, collection

### Ouverture d'étoile
- **Curseur corrigé** : la roulette se centrait sur la largeur de l'écran au lieu de celle de la fenêtre de roulette, et s'arrêtait donc toujours au même endroit de la carte. Elle se cale maintenant sur le vrai centre et s'arrête à une position aléatoire sur la carte gagnante. Une fine ligne lumineuse montre où tombe le curseur.

### Étoiles redessinées
- Nouvelles étoiles flottantes en SVG animé (`src/ui/stars/StarArt.tsx`), toutes avec la même base : halo pulsant, rayons en rotation, facettes façon pierre taillée, cœur lumineux, scintillements. Chaque étoile a sa variante :
  - **Dawn** : étoile à 4 branches, couronne de rayons solaires.
  - **Twilight** : étoile à 5 branches, croissant de lune, pétales de lumière et orbite pointillée.
  - **Celestial** : étoile boussole à 8 branches, anneau planétaire et petite lune.
  - **Crimson** : étoile à 6 branches bordée d'or, anneau runique.
  - **Supernova** : étoile à 16 pointes dont l'éclat dépend de la charge.
- **Onglet Étoiles** refait dans l'esprit des constellations : ciel étoilé avec nébuleuses teintées par l'étoile choisie, grande étoile au centre, et les autres reliées en constellation en bas pour les sélectionner.

### Crimson Star — événement bêta
- L'ancienne « Crimson Test Star » devient une vraie **étoile d'événement réservée à la bêta**, au même endroit sur l'accueil. La carte est animée : badge LIVE, reflet qui balaie la carte, mention « disponible uniquement pendant la bêta ».
- Contenu : les créatures des 3 étoiles, avec des chances boostées (Épique 8 %, Légendaire 2,6 %, Angélique 0,4 %) et une chance Golden doublée (2 %), pour ✦ 15.
- Désactivable d'un seul interrupteur : `betaEventActive` dans `src/data/catalog.ts`.
- Le réglage des probabilités passe dans **Réglages › Développeur** : des probabilités personnalisées qui s'appliquent à toutes les étoiles sauf la Supernova.

### Supernova (remplace « Faites éclater l'étincelle »)
- Chaque étoile ouverte ajoute 1 charge, avec une jauge de 30 sur l'onglet Étoiles. À 30 charges, on déclenche la Supernova : une créature **Épique ou Légendaire garantie**, et c'est répétable.
- Ouverture spéciale : l'étoile se charge et tremble, puis c'est le flash, les ondes de choc, l'explosion de particules et « SUPERNOVA ! » avant la carte.
- Les anciennes sauvegardes récupèrent leur progression Dawn en charges.

### Accueil
- Les cartes « Première étoile » et « Pip » sont remplacées par deux cartes détaillées :
  - **Aventure** : chapitre et titre, anneau de progression, prochaine quête avec description, barre, récompense et bouton « Continuer ».
  - **Prochain Gardien** : portrait de sa créature phare avec son Sigil, titre, type, niveau conseillé comparé au niveau de l'équipe, récompense, et parcours des 8 Sigils.
- La vitrine « Découvrez les étoiles » utilise les nouvelles étoiles dans un ciel de constellation.

### Collection
- **Recherche** par nom, type, rareté ou étoile, accents ignorés, avec des filtres : Toutes, Obtenues, Manquantes, Golden, et par étoile. Les Légendaires et Angéliques non découvertes restent secrètes : leur nom n'est pas cherchable.
- Nouvel onglet **Objets** : le sac avec les quantités et où obtenir chaque objet, les 8 Sigils (gagnés ou non) et les arènes possédées.

## Mise à jour 0.5 — Void Quasar, démons, Plongée dans l’horizon

### Le trou noir dans l’onglet Étoiles
- L’onglet Étoiles a maintenant deux pages. Glissez vers la gauche (ou utilisez le sélecteur ✦ ÉTOILES / ◉ TROU NOIR) pour afficher le **Void Quasar**. Sur la page des étoiles, le bord du trou noir dépasse à droite pour inviter au glissement.
- Le trou noir est animé en couches (`src/ui/void/BlackHole.tsx`) :
  - disque d’accrétion texturé qui tourne en perspective ;
  - image lentillée du disque au-dessus et en dessous de l’horizon ;
  - anneau de photons et halo pulsant ;
  - côté du disque plus lumineux (effet Doppler) ;
  - particules aspirées en spirale.
- Les textures du disque sont générées de façon procédurale (bruit fractal enroulé autour de l’axe) et teintées à l’exécution. Le même trou noir existe en 4 teintes : Gargantua, Crimson, Violet et Azure.

### Ouverture en plusieurs touches
- Chaque Void Quasar coûte ✦ 45 et donne **3 récompenses** : créatures (au moins une garantie), objets, ou bannières et contours du Quasar.
- On le touche 4 fois, comme une méga-boîte de Brawl Stars. À chaque touche il s’écrase et rebondit, tremble, accélère et brille davantage, avec une onde et une vibration. À la dernière, il s’effondre (flash et ondes de choc).
- Les récompenses sortent ensuite de l’horizon une par une, de la moins précieuse à la plus précieuse, puis s’affichent en récapitulatif. Un bouton « Tout révéler » permet de sauter.
- 4 nouveaux sons synthétisés : impact de touche, effondrement, apparition d’une récompense, essence démoniaque.

### Essence démoniaque et démons
- Système façon héritage d’Apex Legends :
  - 0,35 % de chance d’**Essence démoniaque** par ouverture ;
  - essence garantie au plus tard après 120 ouvertures sans en obtenir ;
  - chaque essence obtenue en donne 50.
- Avec 150 essences, l’**Autel des démons** permet d’éveiller le démon de son choix parmi 3, avec un rituel animé :
  - **Vorhex** (Lune) ;
  - **Azkarel** (Flamme) ;
  - **Nyxira** (Cristal).
- Nouvelle rareté **Démoniaque**, au même rang que les Angéliques. Les démons combattent et montent de niveau comme les autres créatures, et ont leur section dans la collection.
- Une fois les 3 démons éveillés, les essences deviennent des jackpots de 300 Celesti.
- Illustrations des démons : SVG dessinés à la main puis rendus en PNG avec Chrome sans interface.

### Cosmétiques du Quasar
- 4 bannières animées (Gargantua Horizon, Crimson Singularity, Violet Quasar, Azure Abyss) et 4 contours d’avatar animés (Event Horizon, Crimson Maw, Violet Pulsar, Azure Rift). Dans les contours, l’avatar prend la place de l’horizon et le disque passe devant sans cacher le visage.
- On ne les obtient que dans le Void Quasar (3 % par récompense).
- Nouveaux titres : **Void Walker** (atteindre la Singularité) et **DEMON LORD** (éveiller les 3 démons).

### Plongée dans l’horizon (la « constellation » du trou noir)
- Au lieu d’une carte d’étoiles, on **descend** vers le trou noir. On la trouve dans l’onglet Constellations et sur la page du Quasar.
- En faisant défiler, le trou noir grossit, les étoiles filent et le ciel s’assombrit.
- 5 profondeurs à valider dans l’ordre, chacune avec sa récompense :
  1. Disque d’accrétion ;
  2. Sphère de photons ;
  3. Lentille gravitationnelle ;
  4. Horizon des événements ;
  5. Singularité.

## Mise à jour 0.6 — Créatures redessinées, combat animé, optimisations

### Toutes les créatures peintes, dans le style des démons
- Les 93 créatures des étoiles ont chacune une **illustration peinte** : lumière et ombres douces, reflets colorés sur les bords, grain de pinceau, contours légèrement irréguliers, yeux brillants façon démons. Les **3 démons gardent leurs peintures d'origine** sur leurs cartes.
- Chaque créature a sa propre espèce, lue dans son nom et sa description, par exemple :
  - Emberling est un renardeau aux oreilles de braise ;
  - Tadcap est un petit voyageur en capuche de grenouille, avec une spore rose sur le dos ;
  - Orb Weaver est une araignée à l'abdomen lumineux ;
  - Starhermit Crab porte une coquille en spirale étoilée ;
  - Starlit Witch est un chat sorcier avec chapeau, robe et bâton étoilé.
- **Plus la rareté monte, plus la créature est spectaculaire** :
  - Commune : créature simple et douce ;
  - Rare : cornes, crêtes, ailes, motifs ;
  - Très rare : marques et cornes lumineuses ;
  - Épique : aura, yeux lumineux, grandes ailes ;
  - Légendaire : couronne, ailes de flammes ou d'étoiles, rayons de lumière derrière la carte ;
  - Angélique : halo, doubles ailes d'ange ;
  - Démoniaque : cornes, crocs, regard incandescent.
- Chaque carte a un **ciel peint** selon le type de la créature ; les rayons des cartes légendaires, angéliques et démoniaques tournent lentement dans la fiche détaillée.
- Les illustrations sont produites hors du jeu : un générateur (`tools/creature-art/`) écrit chaque créature en SVG avec des filtres de peinture, Chrome la rend, puis elle est découpée et compressée en PNG à palette. Les anciennes images de `assets/cards/` ont été supprimées ; seules les 3 peintures des démons restent.

### Créatures animées
- Chaque créature est découpée en **calques** (corps, tête, aile), de face et de dos, pour que chaque partie bouge seule :
  - les ailes battent autour de l'épaule : grands battements pour les plumes et les ailes de drake, frémissement rapide pour les insectes, ondulation pour les nageoires, claquement pour les pinces ;
  - la tête oscille autour du cou ;
  - le corps respire, ancré au sol ; les créatures flottantes lévitent.
- En combat, votre créature est vue **de dos** et l'adversaire **de face**, avec deux dessins différents. À chaque attaque :
  - la créature prend son **élan en arrière**, ailes levées ;
  - elle **se jette vers l'adversaire** en penchant corps et tête, avec un grand coup d'ailes ;
  - la créature touchée **s'écrase sous l'impact** et devient une silhouette blanche.
- Les créatures s'animent aussi dans la fiche de la collection et sur les grandes cartes (révélations du quasar).

### Corrections demandées
- La **lueur derrière les objets** du Void Quasar est recentrée sur la récompense.
- Le titre **DEMON LORD** brille comme **GOLDEN CELESTIN**, avec un reflet rouge au lieu du bleu.

### Optimisations
- Le bundle web passe de ~48 Mo à ~12 Mo d'assets : les illustrations de cartes (36,6 Mo) sortent du bundle — seules les 3 peintures de démons (1,2 Mo) restent — et avec elles tout le préchargement d'images (`warmCardArtwork`) et les décodages pendant le jeu.
- Textures du trou noir réduites (disque 768 → 512 px, halo 512 → 384 px) : 720 Ko → 459 Ko, et elles sont **préchargées au démarrage** pour que le quasar s'affiche d'un coup au lieu d'apparaître par morceaux.
- Icône de combat ramenée de 1371 px / 450 Ko à 256 px / 20 Ko.
- Les créatures ne sont animées que là où ça se voit (combat, fiche, grandes cartes) : dans les grilles, elles restent des images fixes, et toutes les animations tournent sur le thread natif.

## Mise à jour 0.7 — Interface épurée, animations fluides

### Animations sans à-coups
- La respiration, le balancement de la tête et les battements d'ailes tournent maintenant en **boucle continue** : l'animation ne saute plus au moment où elle recommence.
- En combat, les créatures ne flottent plus de haut en bas : elles restent posées sur leur plateforme (seules les créatures flottantes lévitent).

### Moins de texte, plus de mystère
Le jeu n'affiche plus que l'essentiel ; le reste s'obtient en touchant l'élément ou le bouton **(i)**.
- **Accueil** : plus de sous-titres sous les étoiles et les raccourcis, plus de prix sur Crimson Star ni de « touchez une étoile ». Les Celesti du jour affichent juste un **compte à rebours avec les secondes** ; l'aventure affiche seulement la **progression x/4**.
- **Étoiles, Void Quasar, quêtes, constellations, arène** : titres sans surtitre, descriptions et conditions rangées derrière (i) ou dans les fiches.
- **Équipe** : plus de consignes ni de statistiques dans la liste ; le bouton (i) ouvre la fiche complète.
- **Combat** : plus de « touchez pour commencer », « maintenez pour les détails » ni de textes sous la victoire ; l'écran de fin montre juste les récompenses et la progression.
- **Collection** : plus de « touchez pour infos » ; dans l'onglet Objets, touchez un objet ou l'essence pour lire sa description.
- **Réglages** : une ligne par option ; seules les options peu évidentes ont un (i).
- **Choix du partenaire** : la description et le type fort n'apparaissent que sur la créature sélectionnée.

### Profil : un menu déroulant par cosmétique
- Photo de profil, titre, bannière et cadre d'avatar sont chacun une **ligne repliée** qui montre l'élément équipé. En la touchant, elle se déplie et affiche tous les choix ; ouvrir un menu ferme les autres.
- Un choix verrouillé montre un cadenas ; en le touchant, on voit comment le débloquer et la progression.
- Les statistiques du joueur sont derrière le bouton (i) de la bannière.

## Structure

- `App.tsx` : application principale (onglets, ouverture d'étoiles, collection, boutique, détection des déblocages).
- `src/data/catalog.ts` : cartes, étoiles, tirages.
- `src/ui/creatures/` : `sprites.ts` (généré : calques de chaque créature), `CreatureSprite.tsx` (animation par calques), `CreatureArt.tsx` (carte : ciel, rayons, créature), `paintedArt.ts` (peintures des démons).
- `assets/creatures/` : calques peints de chaque créature (`fb`/`fh` corps et tête de face, `bb`/`bh` de dos, `w` aile) et ciels de cartes.
- `src/game/` : logique pure (créatures, moteur de combat, Gardiens, objets, quêtes, constellations, cosmétiques, sauvegarde et réglages).
- `src/i18n/` : `en.ts` (texte source et liste des clés), une traduction par langue, `index.tsx` (traducteur, contexte, formatage des messages de combat).
- `src/audio/sound.ts` : effets sonores et musique.
- `src/ui/` : écrans et composants (combat, quêtes, constellations, sélection du partenaire, `profile/` : avatar, bannières, profil, réglages, fenêtre de déblocage).

Ajouter une langue : créer `src/i18n/xx.ts` typé `Record<TranslationKey, string>` (TypeScript signale toute clé manquante), puis l'ajouter dans `languages.ts` et `index.tsx`.

## Important avant production

Le tirage, les combats et la sauvegarde sont locaux pour rendre le prototype jouable. Avant toute diffusion, il faut un backend qui choisit les résultats, valide les combats et stocke la progression.
