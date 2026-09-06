// Modèle de données du domaine.

export type Zone = 'interne' | 'ceinture' | 'geantes' | 'externe';
export type BodyType = 'star' | 'rocky' | 'gas' | 'ice' | 'small';

export interface BodyFacts {
  diameterKm: number;
  distanceSunKm: number; // 0 pour le Soleil
  dayHours: number;
  yearDays: number;
  tempC: number;
  moons?: number;
  gravity?: number; // m/s²
}

export interface Body {
  id: string; // 'mars', 'europe'
  name: string;
  type: BodyType;
  zone: Zone;
  parent?: string; // 'jupiter' pour une lune
  orbitRadius: number; // rayon stylisé, en px de maquette
  orbitAngle: number; // position sur l'anneau, en degrés
  size: number; // diamètre de la bille, en px de maquette
  gradient: [string, string, string]; // clair, moyen, sombre
  banded?: boolean; // Jupiter, Saturne
  rings?: boolean; // Saturne
  notable?: boolean; // déclenche l'overlay de découverte (planète, lune majeure)
  wanderer?: boolean; // comète / sonde : pas d'anneau orbital sur la carte
  kind?: 'comet' | 'probe'; // sous-catégorie pour les objets errants
  facts: BodyFacts;
  highlights: string[]; // 2-3 faits marquants, une phrase chacun
  blurb: string; // une phrase pour le mode classe
}

export interface QuestObjective {
  id: string;
  label: string;
  /**
   * - `visit` : découvrir l'objet `target`
   * - `visit-any` : découvrir l'un des ids listés dans `targets`
   * - `discover-zone` : découvrir `count` objets de la zone `target`
   * - `quiz` : réussir le quiz `target`
   * - `compare` : utiliser le comparateur au moins une fois
   */
  kind: 'visit' | 'visit-any' | 'discover-zone' | 'quiz' | 'compare';
  target?: string;
  targets?: string[];
  count?: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewardBadgeId: string;
  /** Zone à révéler pour que la quête devienne disponible. */
  requires?: Zone;
  /** Où mène le bouton « Y aller ». */
  goto?: string;
}

export interface Badge {
  id: string;
  title: string;
  hint: string;
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}
