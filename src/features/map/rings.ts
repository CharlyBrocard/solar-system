import type { Zone } from '@/data/types';
import { RING_RADIUS } from '@/data/bodies';

/** Anneaux d'orbite de la carte système (rayons en px de maquette). */

export interface Ring {
  radius: number;
  zone: Zone;
  dashed?: boolean;
  opacity: number;
  width: number;
}

export const RINGS: Ring[] = [
  { radius: RING_RADIUS.mercure, zone: 'interne', opacity: 0.22, width: 2 },
  { radius: RING_RADIUS.venus, zone: 'interne', opacity: 0.2, width: 2 },
  { radius: RING_RADIUS.terre, zone: 'interne', opacity: 0.26, width: 3 },
  { radius: RING_RADIUS.mars, zone: 'interne', opacity: 0.18, width: 2 },
  { radius: RING_RADIUS.ceinture, zone: 'ceinture', opacity: 0.14, width: 2, dashed: true },
  { radius: RING_RADIUS.jupiter, zone: 'geantes', opacity: 0.16, width: 2 },
  { radius: RING_RADIUS.saturne, zone: 'geantes', opacity: 0.13, width: 2 },
  { radius: RING_RADIUS.uranus, zone: 'geantes', opacity: 0.1, width: 2 },
  { radius: RING_RADIUS.neptune, zone: 'externe', opacity: 0.09, width: 2 },
  { radius: RING_RADIUS.kuiper, zone: 'externe', opacity: 0.08, width: 2, dashed: true },
  { radius: RING_RADIUS.oort, zone: 'externe', opacity: 0.05, width: 2 },
];
