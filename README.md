# Système solaire — webapp d'exploration

Webapp responsive d'exploration du système solaire, pensée comme un jeu vidéo
éducatif : on arrive dans le système, on franchit une « brume cosmique » qui se
lève au fil des découvertes, on remplit un carnet, on suit des quêtes.

Les identifiants d'écran (`1a`, `2b`, `4e`…) qui apparaissent ci-dessous
renvoient aux maquettes de direction artistique utilisées pendant
l'intégration ; ils servent d'étiquettes internes.

## Démarrer

```bash
npm install
npm run dev        # serveur de dev
npm run build      # typecheck + build de prod
npm run preview    # sert le build
npm run typecheck  # tsc seul
```

Node 20 (voir `.tool-versions`).

## Stack

- **Vite + React + TypeScript**, pas de librairie 3D (la vue système est du
  CSS 3D transforms), pas de framework CSS.
- **react-router-dom** pour le routing.
- **Zustand** + `persist` pour l'état ; progression stockée en `localStorage`
  (`solarsystem.progress`). Aucun appel réseau.
- **PWA** (`vite-plugin-pwa`, `generateSW` / `registerType: autoUpdate`) :
  tout le bundle est précaché, l'app est installable et tourne **hors-ligne**
  dès la première visite. Les polices Google sont mises en cache à l'exécution
  (stylesheet en `StaleWhileRevalidate`, `.woff2` en `CacheFirst` 1 an), donc
  disponibles hors-ligne après un premier chargement en ligne. Manifest + icônes
  dans `public/` (`pwa-192`, `pwa-512`, `maskable-512`, `apple-touch-icon`,
  `favicon.svg`). Config dans `vite.config.ts`.
- Tokens de design dans `src/styles/tokens.css` (extraits de l'artboard `2a`).

## Arborescence des écrans

| Route | Écran | Artboard(s) | État |
|---|---|---|---|
| `/` | Écran d'entrée / chargement | `2h` | **v1** |
| `/start` | Première ouverture (nom + vaisseau) | `4c` | **v1** |
| `/map` | Vue système (écran principal) | `1a` · mobile `2b` | **v1** |
| `/object/:id` | Fiche d'un objet (découvert / verrouillé) | `2c` · mobile `2d` · verrou `3d` | **v1** |
| `/zone/:id` | Sous-carte d'une zone | `2e` · mobile `3a` · Saturne `4a` · ceinture `3j` | **v1** |
| `/codex` | Codex / carnet de bord | `2f` · mobile `3b` | **v1** |
| `/quests` | Journal des quêtes | `3f` · mobile `3c` | **v1** |
| `/compare` | Comparateur de deux objets | `4b` | **v1** |
| `/quiz/:id` | Quiz éducatif | `3k` | **v1** |
| `/profile` | Profil & badges | `3i` | **v1** |
| `/present/:id` | Fiche plein écran, mode classe | `4e` | **v1** |
| `*` | Hors-ligne / erreur de chargement | `4d` | **v1** |

### Overlays (pas des routes)

| Élément | Artboard | Déclencheur |
|---|---|---|
| Quête active par-dessus la carte | `2g` | **v1** — `ActiveQuestCard` (rendu dans `SystemView`) quand une quête est suivie |
| Zone scellée (`SealedZoneCard`) + tutoriel (`Tutorial`) | `3l` | **v1** — clic sur une zone verrouillée / 1re visite (`tutorialSeen`) |
| Mode « échelle réelle » (`RealScaleView`) | `3g` | **v1** — toggle du HUD ou `/map?scale=real` |
| Moment de découverte + badge | `3e` | **v1** — 1re visite d'un objet notable (`DiscoveryOverlay`, monté dans `AppLayout`) |
| Célébration de quête accomplie | — (reprend `3e`) | **v1** — `QuestCompleteOverlay` (monté dans `AppLayout`), piloté par `pendingQuestComplete` |
| Recherche d'un objet (`SearchOverlay`) | `3h` | **v1** — bouton loupe du HUD ou touche `/` |

## Structure du code

```
src/
  components/    composants partagés (AppLayout, BodySphere, Avatar, BottomNav…)
  data/          types du domaine ; bodies.ts (42 objets), zones, badges, quêtes, quiz, blurbs simplifiés
  features/      un dossier par écran
  lib/           utilitaires transverses (lecture à voix haute, nappe sonore)
  store/         état Zustand persistant (progress.ts) + sélecteurs / logique quêtes / hooks de préférences
  styles/        tokens.css + global.css
  router.tsx     toutes les routes
  main.tsx       point d'entrée
```

## `OrbitalScene` — la scène en couches (`src/features/scene/`)

Composant partagé par `/map` et `/zone/:id`. Rendu **en couches de profondeur
indépendantes** pour un ressenti "on est *dans* une scène", pas "on zoome une
image" :

| Couche | Transform |
|---|---|
| **Fond stellaire** (`.starfield`) — étoiles + nébuleuses, scintillement | ne suit **pas** le zoom ; parallaxe légère sur le pan |
| **Le monde** (`.world`) — anneaux SVG + planètes projetées, ancré au centre du plan | `translate(pan) scale(zoom)` — c'est *ça* que le zoom transforme |
| **Voile de brume** (`fogVeilGradient`) — dégradé plein écran | fixe ; s'ouvre avec les zones débloquées et le zoom |
| HUD / panneaux (`children`) | fixes |

- **Pas de boîte 1280×800** : le monde part d'un point d'ancrage (`origin` en %
  du viewport), donc aucun bord visible à aucun zoom.
- **Deux jeux de géométrie** (`src/features/map/geometry.ts`) : `WIDE` (desktop,
  `1a` — perspective 1400, plan à 52°, rayons maquette) et `COMPACT` (mobile,
  `2b` — perspective 900, plan à 54°, rayons × 0,62, brume aplatie). `OrbitalScene`
  bascule sur `COMPACT` sous **720 px** de large (`useSceneFit`, `ResizeObserver`)
  et remonte le facteur d'ajustement pour garder un disque lisible — au lieu de
  simplement rétrécir toute la scène en `scale()`.
- **Anneaux en SVG** (`<circle>`) — nets à toutes les échelles ; le plan CSS 3D
  (`rotateX 52° / 54°`) les écrase en ellipses.
- **Billes** projetées en 2D (`projectRingPoint`) → toujours face caméra. Halo /
  ombres en **dégradé radial**, pas en `box-shadow` (qui se tuile en damier sur
  un sous-arbre mis à l'échelle).
- Gestes : **molette** = zoom vers le curseur, **glisser** = pan (seuil de 4 px
  pour ne pas gêner les clics ; `[data-nodrag]` sur le HUD).
- `zoom`/`pan` appartiennent au parent (`SystemView`/`ZoneView`) qui peuvent les
  piloter (recentrer, mode « échelle réelle »).
- Clic sur un astre révélé → **plongée** (`diveTo` / `onDiveComplete`) : la scène
  accélère doucement vers l'astre (`transform: scale(2.5)` + origine sur sa
  position projetée, courbe qui décélère), une **lueur discrète** de sa couleur
  près de lui et un **fondu sombre** qui se ferme depuis les bords, ~620 ms, puis
  `discover(id)` + `/object/:id`. Zone scellée → carte `3l`.
  `prefers-reduced-motion` → navigation directe. Actif sur `/map` (planètes +
  Soleil) et `/zone/:id` (lunes + centre).
- **Dérive orbitale** : `useOrbitalDrift` (RAF throttlé ~20 Hz) fait avancer un
  angle global ; chaque corps tourne à `driftSpeed(rayon)` (plus vite vers
  l'intérieur). En pause pendant un glisser, un survol, ou en `prefers-reduced-motion`.
- `interactive={false}` : mode décor sans molette ni glisser (écran d'entrée).

### À affiner
- Option B du zoom (re-layout des rayons) si le `scale()` CSS manque de netteté à
  fort grossissement — pour l'instant l'option A (scale sur la couche monde) suffit.
- Centrage du disque sur mobile (`origin` reste à `[50, 55]` — un cran haut
  serait plus fidèle à `2b`, mais `origin` sert aussi au voile et au zoom-curseur).

## Écran d'entrée `/` — `EntryScreen` (`2h`) & onboarding `/start` — `Onboarding` (`4c`)

- `EntryScreen` : `OrbitalScene` en mode décor (`interactive={false}`, dérive
  active) + calque héros (« Orbites », accroche, bouton « Explorer », barre de
  chargement). « Explorer » → `/start` si `explorerName` est vide, sinon `/map`.
- `Onboarding` (`src/features/entry/Onboarding.tsx`) : champ nom + choix parmi
  5 vaisseaux (`Avatar`). Deux modes selon `explorerName` :
  - **création** (nom vide) : titre « Qui explore aujourd'hui ? », un seul bouton
    « Commencer l'exploration » → `startGame(nom, avatarId)` puis `/map`.
  - **édition** (arrivée depuis le profil, « Modifier ») : titre « Change de nom
    ou de vaisseau », boutons « Enregistrer » (désactivé tant que rien n'a changé)
    et « Annuler », les deux renvoient sur `/profile`. Évite les libellés
    « commencer / reprendre » qui n'ont pas de sens pour une simple modif.

## Mode classe `/present/:id` — `Present` (`4e`)

- Fiche plein écran pensée pour la projection : grande sphère, nom en très gros,
  blurb + 4 chiffres clés (diamètre, jour, année, température).
- Navigation ‹ / › entre les objets **déjà découverts** (ordre = `codexOrder()`),
  clavier `←`/`→` idem, `Échap` → `/object/:id`. Compteur « Objet N sur 42 »
  (rang global dans le codex).
- Redirige vers `/object/:id` si l'objet n'est pas découvert. Accès via le bouton
  carré de la fiche objet.
- La sphère a une taille en px fixe : `Present` l'adapte au viewport
  (`min(340, innerWidth * 0.62)`) pour ne pas déborder sur mobile.

## Hors-ligne / route inconnue `*` — `NotFound` (`4d`)

- Écoute `navigator.onLine` + events `online`/`offline`. Hors-ligne : « La liaison
  avec la sonde est coupée » + bouton « Réessayer » (`reload`) + code 503.
  Route inconnue (en ligne) : « Tu t'es perdu dans le vide » + chemin fautif +
  « Retour à la carte ». Les deux proposent « Ouvrir mon carnet ».

## Fiche objet & découverte — notes

- `ObjectSheet` gère deux états : **découvert** (`2c`/`2d`) et **verrouillé**
  (`3d`, quand la zone n'est pas révélée). Ouvrir la fiche d'un objet révélé
  = le découvrir (`discover()` au montage).
- **Desktop** = panneau flottant à droite au-dessus d'un fond de scène. **Mobile**
  (`≤ 900 px`, artboard `2d`) : la même structure devient la **page entière** —
  fond opaque, poignée en haut, en-tête collant (retour + statut toujours
  visibles), astre + nom centrés, et le bouton d'action **fixé en bas** avec un
  dégradé de lisibilité. Uniquement des règles `@media` dans le CSS, le JSX est
  partagé. Vaut pour la fiche découverte comme verrouillée.
- `discover()` (store) pose `pendingDiscovery` si l'objet est `notable` ;
  `DiscoveryOverlay` (monté dans `AppLayout`, global) affiche alors l'overlay
  `3e` par-dessus n'importe quel écran. Badges de découverte dans
  `src/data/badges.ts`.
- Formatage des chiffres (français, séparateur d'espace) : `src/data/format.ts`.
- Textes de déblocage de zone : `revealHint()` dans `src/store/selectors.ts`.

## Sous-cartes de zone `/zone/:id` — notes

- `ZoneView` (`src/features/zone/`) = `OrbitalScene` + un panneau/fil d'Ariane.
  Param = un id de planète (`jupiter`, `saturne`, `uranus`, `neptune`, `pluton`,
  `mars`, `terre`) ou `ceinture`.
- Corps central = la planète (ou le Soleil pour la ceinture) ; membres =
  `moonsOf(id)` / `beltBodies()`.
- Une lune non découverte est une silhouette ; cliquer une lune → `discover()` +
  fiche. Le bandeau montre `N/M` révélés.
- **Rayons/tailles des lunes** dans `bodies.ts` sont calibrés pour la sous-carte
  (elles n'apparaissent pas sur la carte système).
- Entrées : fiche planète « Explorer {nom} » → `/zone/{id}` ; sur la carte, le
  marqueur « Ceinture d'astéroïdes » sur l'anneau → `/zone/ceinture`.

### À affiner
- Saturne : anneaux via le flag `rings` de `BodySphere` (simple), pas les anneaux
  détaillés de `4a`.
- Chiffres des planètes naines / comètes à revérifier (`bodies.ts`).

## Codex `/codex` — `Codex` (`2f` / `3b`)

- Sections par zone (`bodiesOfZone` inclut les lunes) + « Comètes & sondes »
  (`wanderers()`). Tuile découverte → `/object/:id` ; tuile verrouillée = cadenas.
  La dernière découverte porte le liseré ambré.
- `BottomNav` (`src/components/`) : barre d'onglets **mobile uniquement**
  (Carte / Carnet / Quêtes / Profil). Desktop : pastille « ‹ Retour à la carte ».
- Entrées : le compteur « découvertes » du HUD carte est cliquable → `/codex` ;
  bouton carré de la fiche objet aussi.

## Quêtes & quiz — `/quests` (`3f`/`3c`), `/quiz/:id` (`3k`)

- **Données** : `src/data/quests.ts` (9 missions), `src/data/quizzes.ts` (quiz « froid »).
  Badges des récompenses dans `src/data/badges.ts`.
- **Objectifs calculés**, pas stockés : `src/store/quests.ts` évalue chaque
  objectif d'après `discovered` / `quizPassed` / `compareUsed`. Le hook
  `useQuestCompletion` (dans `AppLayout`) termine automatiquement une quête dès
  que tous ses objectifs sont remplis et décerne le badge.
- `completeQuest` pose `pendingQuestComplete` (transitoire, non persisté) →
  `QuestCompleteOverlay` (monté dans `AppLayout`) : célébration plein écran
  (médaille, `+100 points`, badge, compteur de quêtes). Attend la fin de
  l'overlay `3e` si une découverte notable la déclenche en même temps.
- États d'une quête : `completed` / `active` (suivie ou entamée) / `available` /
  `locked` (zone requise pas encore révélée).
- Une seule quête **suivie** (`activeQuestId`) → carte `2g` sur la carte système.
- Le quiz réussi (`passScore` bonnes réponses) appelle `passQuiz(id)`.
- Entrées : bouton « Quêtes » du HUD carte, onglet `BottomNav` mobile, bouton
  « Voir la quête » de la fiche verrouillée.

## Comparateur `/compare` — `Compare` (`4b`)

- Deux objets côte à côte, sphères dimensionnées au diamètre relatif
  (`pow(ratio, .72)`, plancher 44 px). Métriques : diamètre, gravité, année.
- `?a=<id>&b=<id>` dans l'URL ; défaut = les deux premiers objets découverts.
  Le picker (overlay) ne propose que les objets **découverts** (hors étoile/errants).
- Ouvrir le comparateur avec deux objets valides appelle `markCompareUsed()` →
  termine la quête `compare-mondes`.
- Entrées : bouton « Comparer deux mondes » du codex, « Y aller » de la quête.

## Profil `/profile` — `Profile` (`3i`)

- En-tête : `Avatar` (`src/components/Avatar.tsx`, 5 dégradés — les vaisseaux de
  `4c`), niveau (`currentLevel`), barre d'XP (points dans le niveau), 3 tuiles
  (objets / quêtes / zones).
- Grille de badges (`src/data/badges.ts`) : obtenus vs cadenassés.
- Dernières découvertes (les 4 derniers ids de `discovered`, ordre inverse).
- Préférences : 3 interrupteurs liés à `prefs` du store, chacun avec une phrase
  d'explication. Appliqués par `usePrefsEffects` (monté dans `AppLayout`) :
  - **`readAloud`** → `data-readaloud` sur `<html>` ; `useReadAloud(text, on)`
    (`src/lib/speech.ts`, API `speechSynthesis`, voix `fr-FR`) lit la fiche à
    l'ouverture sur `/object/:id` et `/present/:id`. Hors-ligne OK (voix système).
  - **`simplified`** → `data-simplified` sur `<html>` ; `global.css` agrandit et
    aère le texte (`--fs-body` 18) et masque les blocs `[data-dense]` (la
    comparaison d'échelle chiffrée). **Contenu** : `src/data/blurbsSimple.ts`
    donne une version courte et simple du blurb pour les 42 objets ;
    `useBlurb(body)` (`src/store/useBlurb.ts`) renvoie la bonne version selon la
    préf. Utilisé par le mode classe, l'écran de découverte `3e`, le panneau des
    sous-cartes, la lecture à voix haute, et un résumé (`.lede`) ajouté en haut
    de la fiche objet quand le mode est actif.
  - **`ambientSound`** → `src/lib/ambient.ts` : nappe grave synthétisée en Web
    Audio (accord quintes/octaves + filtre passe-bas modulé + souffle), volume
    ~0,03, **aucun fichier audio**. Démarrée dans le geste du clic (le contexte
    audio a besoin d'une interaction ; sinon reprise au clic suivant).
- Entrées : bouton avatar du HUD carte (haut-gauche), onglet `BottomNav` mobile.

## Overlays de la carte — notes

- **`RealScaleView`** (`3g`) : bande horizontale, distances exactes en UA
  (`PX_PER_AU`), défilement horizontal jusqu'à Pluton, tailles exagérées.
  `realScaleMode` (transitoire, non persisté) ; `?scale=real` le force via
  `setRealScale(true)`.
- **`SearchOverlay`** (`3h`) : recherche accent-insensible parmi les objets
  découverts **ou** de zone révélée, filtres par type, `Échap` pour fermer.
- **`SealedZoneCard`** (`3l`) : remplace l'ancien toast — « il te manque N
  découvertes dans {zone} ». Auto-disparaît après 6 s.
- **`Tutorial`** (`3l`) : 3 astuces, montrées une seule fois (`tutorialSeen`).

## Prochaines étapes

1. Passe de contenu : revérifier les chiffres des planètes naines / comètes (`bodies.ts`).
2. Éventuel : auto-héberger les polices (offline dès la 1re visite même sans réseau).
3. Éventuel : `highlights` courts pour le mode simplifié (aujourd'hui seul le blurb est adapté).

**Toutes les routes et overlays prévus ont une v1** (desktop + variantes mobiles).
# solar-system
