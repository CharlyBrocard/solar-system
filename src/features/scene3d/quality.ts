import { useMemo } from 'react';
import type { GraphicsPref } from '@/store/progress';
import { useProgress } from '@/store/progress';

/**
 * Qualité de rendu 3D : trois paliers + une détection automatique d'après
 * l'appareil. Tout ce qui coûte cher (résolution, post-traitement, densité de
 * géométrie) est piloté d'ici pour que la scène tourne sur une tablette d'école
 * comme sur une machine récente.
 */

export type QualityTier = 'bas' | 'moyen' | 'eleve';

export interface QualitySettings {
  tier: QualityTier;
  /** plage `dpr` du <Canvas> */
  dpr: [number, number];
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  /** niveau de bloom (post-traitement) */
  bloom: 'off' | 'low' | 'high';
  /** segments max d'une grande sphère */
  sphereSegments: number;
  /** nombre de cailloux dans la ceinture d'astéroïdes */
  beltCount: number;
  /** nombre d'étoiles du fond */
  starCount: number;
  /** relief procédural (normal maps) sur les astres */
  normalMaps: boolean;
  /** surface du Soleil : shader animé (true) ou texture figée (false) */
  sunShader: boolean;
  /** octaves de bruit pour le shader du Soleil */
  sunOctaves: number;
  /** ombres portées entre astres (lune ↔ planète, anneaux ↔ Saturne) */
  contactShadows: boolean;
}

const TIERS: Record<QualityTier, QualitySettings> = {
  bas: {
    tier: 'bas',
    dpr: [1, 1],
    antialias: false,
    powerPreference: 'low-power',
    bloom: 'off',
    sphereSegments: 28,
    beltCount: 55,
    starCount: 900,
    normalMaps: false,
    sunShader: false,
    sunOctaves: 0,
    contactShadows: false,
  },
  moyen: {
    tier: 'moyen',
    dpr: [1, 1.5],
    antialias: true,
    powerPreference: 'default',
    bloom: 'low',
    sphereSegments: 40,
    beltCount: 110,
    starCount: 2200,
    normalMaps: true,
    sunShader: true,
    sunOctaves: 3,
    contactShadows: false,
  },
  eleve: {
    tier: 'eleve',
    dpr: [1, 2],
    antialias: true,
    powerPreference: 'high-performance',
    bloom: 'high',
    sphereSegments: 60,
    beltCount: 165,
    starCount: 3400,
    normalMaps: true,
    sunShader: true,
    sunOctaves: 5,
    contactShadows: true,
  },
};

let detected: QualityTier | null = null;

/** Estime le palier d'après l'appareil (calculé une seule fois). */
export function detectTier(): QualityTier {
  if (detected) return detected;
  if (typeof navigator === 'undefined') return (detected = 'moyen');

  const cores = navigator.hardwareConcurrency || 4;
  // `deviceMemory` : Chrome uniquement, plafonné à 8 (Go)
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  let score = 0;
  score += cores >= 12 ? 3 : cores >= 8 ? 2 : cores >= 4 ? 1 : 0;
  score += mem >= 8 ? 2 : mem >= 4 ? 1 : 0;
  score += mobile ? 0 : 1;

  detected = score >= 4 ? 'eleve' : score >= 2 ? 'moyen' : 'bas';
  // même un mobile haut de gamme peine avec bloom + ombres + 3400 étoiles :
  // on plafonne la détection à « moyen » (la sonde perf peut encore descendre).
  if (mobile && detected === 'eleve') detected = 'moyen';
  return detected;
}

const RANK: Record<QualityTier, number> = { bas: 0, moyen: 1, eleve: 2 };

export function resolveQuality(
  pref: GraphicsPref | undefined,
  cap?: QualityTier | null,
): QualitySettings {
  let tier: QualityTier =
    pref === 'bas' || pref === 'moyen' || pref === 'eleve' ? pref : detectTier();
  // le plafond « perf » (mode Auto seulement) ne peut que descendre le palier
  if (cap && RANK[cap] < RANK[tier]) tier = cap;
  return TIERS[tier];
}

/** Réglages de qualité effectifs (résout `auto`, applique le plafond perf). */
export function useQuality(): QualitySettings {
  const pref = useProgress((s) => s.prefs?.graphics);
  const cap = useProgress((s) => s.perfTierCap);
  return useMemo(() => resolveQuality(pref, cap), [pref, cap]);
}
