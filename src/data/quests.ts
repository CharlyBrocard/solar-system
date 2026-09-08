import type { Quest } from './types';

/**
 * Missions : courtes, 1–3 objectifs vérifiables, un badge en récompense.
 * Une seule quête « suivie » à la fois. Badges dans `src/data/badges.ts`.
 */
const QUESTS: Quest[] = [
  {
    id: 'premiers-pas',
    title: 'Premiers pas',
    description:
      'Le voyage commence à côté de chez toi. Ouvre les fiches de la Terre et de Mars.',
    objectives: [
      { id: 'terre', kind: 'visit', target: 'terre', label: 'Découvrir la Terre' },
      { id: 'mars', kind: 'visit', target: 'mars', label: 'Découvrir Mars' },
    ],
    rewardBadgeId: 'explorateur-en-herbe',
    goto: '/object/terre',
  },
  {
    id: 'voisins',
    title: 'Fais le tour du voisinage',
    description:
      'Les quatre planètes rocheuses sont nos voisines. Passe les voir une à une.',
    objectives: [
      {
        id: 'rocky',
        kind: 'visit-any',
        targets: ['mercure', 'venus', 'terre', 'mars'],
        count: 4,
        label: 'Découvrir Mercure, Vénus, la Terre et Mars',
      },
    ],
    rewardBadgeId: 'voisins-de-la-terre',
    goto: '/map',
  },
  {
    id: 'ceinture',
    title: "Traverse la ceinture d'astéroïdes",
    description:
      "Entre Mars et Jupiter flottent des millions de blocs de roche. Repère-en trois pour dissiper la brume.",
    objectives: [
      {
        id: 'trois-cailloux',
        kind: 'discover-zone',
        target: 'ceinture',
        count: 3,
        label: '3 corps de la ceinture découverts',
      },
    ],
    rewardBadgeId: 'passeur-de-ceinture',
    requires: 'ceinture',
    goto: '/zone/ceinture',
  },
  {
    id: 'sonde-europe',
    title: 'Pose une sonde sur Europe',
    description:
      "Sous sa croûte de glace, Europe cacherait un océan liquide plus vaste que tous ceux de la Terre. Approche-toi assez pour larguer une sonde.",
    objectives: [
      { id: 'jupiter', kind: 'visit', target: 'jupiter', label: 'Atteindre le système de Jupiter' },
      { id: 'europe', kind: 'visit', target: 'europe', label: 'Zoomer sur Europe et lancer la sonde' },
    ],
    rewardBadgeId: 'chasseur-d-oceans',
    requires: 'geantes',
    goto: '/zone/jupiter',
  },
  {
    id: 'lunes-de-jupiter',
    title: 'Compte les lunes de Jupiter',
    description:
      'Galilée en a repéré quatre en 1610 avec une lunette de fortune. Retrouve-les toutes les quatre.',
    objectives: [
      {
        id: 'galileennes',
        kind: 'visit-any',
        targets: ['io', 'europe', 'ganymede', 'callisto'],
        count: 4,
        label: 'Découvrir Io, Europe, Ganymède et Callisto',
      },
    ],
    rewardBadgeId: 'compteur-de-lunes',
    requires: 'geantes',
    goto: '/zone/jupiter',
  },
  {
    id: 'anneaux-de-saturne',
    title: 'Va voir les anneaux de Saturne',
    description:
      "Larges de 280 000 km, épais d'à peine quelques dizaines de mètres. Approche-toi pour les voir de près.",
    objectives: [
      { id: 'saturne', kind: 'visit', target: 'saturne', label: 'Découvrir Saturne' },
    ],
    rewardBadgeId: 'gardien-des-anneaux',
    requires: 'geantes',
    goto: '/zone/saturne',
  },
  {
    id: 'planete-couchee',
    title: 'La planète couchée',
    description:
      "Uranus ne tourne pas comme les autres : son axe est presque allongé dans le plan de son orbite. Va voir cette géante qui roule sur le côté.",
    objectives: [
      { id: 'uranus', kind: 'visit', target: 'uranus', label: 'Découvrir Uranus' },
    ],
    rewardBadgeId: 'toupie-renversee',
    requires: 'geantes',
    goto: '/object/uranus',
  },
  {
    id: 'compare-mondes',
    title: 'Compare deux mondes',
    description:
      'Mets deux astres côte à côte dans le comparateur pour sentir la différence d’échelle.',
    objectives: [{ id: 'compare', kind: 'compare', label: 'Utiliser le comparateur' }],
    rewardBadgeId: 'balance-cosmique',
    goto: '/compare',
  },
  {
    id: 'quiz-froid',
    title: 'Trouve la planète la plus froide',
    description:
      'Une quête de savoir : trois questions sur le chaud et le froid dans le système solaire.',
    objectives: [{ id: 'quiz', kind: 'quiz', target: 'froid', label: 'Réussir le quiz' }],
    rewardBadgeId: 'thermometre',
    goto: '/quiz/froid',
  },
  {
    id: 'quiz-mouvement',
    title: 'Jours, années et rotations',
    description:
      'Une quête de savoir : trois questions sur la façon dont les astres tournent.',
    objectives: [{ id: 'quiz', kind: 'quiz', target: 'mouvement', label: 'Réussir le quiz' }],
    rewardBadgeId: 'maitre-des-horloges',
    goto: '/quiz/mouvement',
  },
  {
    id: 'quiz-lunes',
    title: 'Le bal des lunes',
    description:
      'Une quête de savoir : trois questions sur les lunes du système solaire.',
    objectives: [{ id: 'quiz', kind: 'quiz', target: 'lunes', label: 'Réussir le quiz' }],
    rewardBadgeId: 'berger-de-lunes',
    requires: 'geantes',
    goto: '/quiz/lunes',
  },
  {
    id: 'confins',
    title: 'Atteins les confins',
    description:
      'Au-delà de Neptune commence un monde de glace et de nuit. Pousse jusqu’à Pluton.',
    objectives: [
      { id: 'neptune', kind: 'visit', target: 'neptune', label: 'Découvrir Neptune' },
      { id: 'pluton', kind: 'visit', target: 'pluton', label: 'Découvrir Pluton' },
    ],
    rewardBadgeId: 'sentinelle-des-confins',
    requires: 'externe',
    goto: '/map',
  },
  {
    id: 'chasseur-de-cometes',
    title: 'À l’affût des comètes',
    description:
      "Boules de glace et de poussière, les comètes plongent vers le Soleil, s’allument, puis repartent pour des siècles. Repères-en deux dans le carnet.",
    objectives: [
      {
        id: 'cometes',
        kind: 'visit-any',
        targets: ['halley', 'tchouri', 'hale-bopp'],
        count: 2,
        label: '2 comètes découvertes',
      },
    ],
    rewardBadgeId: 'oeil-de-comete',
    requires: 'externe',
    goto: '/codex',
  },
  {
    id: 'les-voyageuses',
    title: 'Les deux Voyageuses',
    description:
      "Lancées en 1977, Voyager 1 et 2 ont dépassé toutes les planètes et voguent aujourd’hui entre les étoiles. Retrouve les deux sondes.",
    objectives: [
      {
        id: 'voyagers',
        kind: 'visit-any',
        targets: ['voyager-1', 'voyager-2'],
        count: 2,
        label: 'Voyager 1 et Voyager 2 découvertes',
      },
    ],
    rewardBadgeId: 'cap-sur-les-etoiles',
    requires: 'externe',
    goto: '/codex',
  },
];

export default QUESTS;

export function questById(id: string | null | undefined): Quest | undefined {
  return id ? QUESTS.find((q) => q.id === id) : undefined;
}
