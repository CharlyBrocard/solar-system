import type { Zone } from '@/data/types';
import { bodyById } from '@/data/bodies';
import { ZONE_ORDER, ZONE_UNLOCK_THRESHOLD } from './progress';

/**
 * Zones actuellement révélées, d'après la progression.
 * Une zone se révèle quand la précédente atteint un seuil de découvertes.
 * Au démarrage, seule « interne » est visible.
 */
export function unlockedZones(discovered: string[]): Set<Zone> {
  const unlocked = new Set<Zone>(['interne']);
  for (const zone of ZONE_ORDER) {
    const { prev, need } = ZONE_UNLOCK_THRESHOLD[zone];
    if (!prev) continue;
    if (!unlocked.has(prev)) continue;
    const countInPrev = discovered.filter((id) => bodyById(id)?.zone === prev).length;
    if (countInPrev >= need) unlocked.add(zone);
  }
  return unlocked;
}

/** Nombre de découvertes dans une zone. */
export function discoveredInZone(discovered: string[], zone: Zone): number {
  return discovered.filter((id) => bodyById(id)?.zone === zone).length;
}

/** La zone verrouillée qui viendrait juste après les zones débloquées, s'il en reste une. */
export function nextLockedZone(discovered: string[]): Zone | null {
  const unlocked = unlockedZones(discovered);
  return ZONE_ORDER.find((z) => !unlocked.has(z)) ?? null;
}

const REVEAL_TEXT: Record<Zone, string> = {
  interne: 'Cette zone est déjà accessible.',
  ceinture:
    'Explore le système interne : découvre 6 de ses 8 objets pour repousser la brume jusqu’à la ceinture d’astéroïdes.',
  geantes:
    'Traverse la ceinture d’astéroïdes : repère 3 petits corps pour dissiper la brume au-delà de Mars.',
  externe:
    'Explore les géantes gazeuses : révèle 7 de leurs 12 mondes pour atteindre le système externe.',
};

/** Comment révéler une zone scellée : texte + progression courante. */
export function revealHint(discovered: string[], zone: Zone) {
  const { prev, need } = ZONE_UNLOCK_THRESHOLD[zone];
  const current = prev ? discoveredInZone(discovered, prev) : 0;
  return { text: REVEAL_TEXT[zone], current: Math.min(current, need), need };
}
