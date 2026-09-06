import type { Zone } from '@/data/types';
import { RING_RADIUS } from '@/data/bodies';

/**
 * Géométrie du plan orbital, partagée par la carte système et les sous-cartes.
 *
 * Le rendu est en **couches indépendantes** (cf. `OrbitalScene`) : le fond
 * stellaire ne bouge pas avec le zoom, seul le "monde" (anneaux + planètes) est
 * transformé. Les anneaux vivent dans un vrai plan CSS 3D ; les billes sont
 * projetées en 2D (`projectRingPoint`) et font toujours face caméra.
 *
 * Deux jeux de paramètres : `wide` (desktop, artboard `1a`) et `compact`
 * (mobile, artboard `2b` — plan plus incliné, perspective plus courte, rayons
 * resserrés). `OrbitalScene` choisit d'après la largeur du viewport.
 */

export interface SceneGeometry {
  /** profondeur de la perspective CSS (px) */
  perspective: number;
  /** inclinaison du plan orbital */
  rotX: number;
  rotZ: number;
  /** facteur appliqué aux rayons d'orbite (compact = disque resserré) */
  radiusScale: number;
  /** resserrement du voile de brume autour du disque [x, y] */
  fogTighten: [number, number];
}

// Desktop (`1a`) : perspective ample, plan à 52°, rayons à l'échelle maquette.
export const WIDE_GEOMETRY: SceneGeometry = {
  perspective: 1400,
  rotX: 52,
  rotZ: -8,
  radiusScale: 1,
  fogTighten: [1, 1],
};

// Mobile (`2b`) : perspective 900, plan à 54°, rayons ÷ ~1,6, brume aplatie.
export const COMPACT_GEOMETRY: SceneGeometry = {
  perspective: 900,
  rotX: 54,
  rotZ: -8,
  radiusScale: 0.62,
  fogTighten: [0.92, 0.64],
};

export const planeTransform = (g: SceneGeometry) =>
  `rotateX(${g.rotX}deg) rotateZ(${g.rotZ}deg)`;

/** Place un objet à l'angle `angle` sur l'anneau de rayon `radius`, dans le plan. */
export const orbitTransform = (angle: number, radius: number, g: SceneGeometry) =>
  `rotate(${angle}deg) translateX(${radius * g.radiusScale}px)`;

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

export interface Projected {
  x: number; // px, relatif au centre du plan
  y: number;
  z: number; // profondeur (négatif = loin)
  scale: number; // facteur de perspective
}

const RAD = Math.PI / 180;

export function projectRingPoint(
  angleDeg: number,
  radius: number,
  g: SceneGeometry,
): Projected {
  const r = radius * g.radiusScale;
  const a = angleDeg * RAD;
  const lx = r * Math.cos(a);
  const ly = r * Math.sin(a);

  const rz = g.rotZ * RAD;
  const x1 = lx * Math.cos(rz) - ly * Math.sin(rz);
  const y1 = lx * Math.sin(rz) + ly * Math.cos(rz);

  const rx = g.rotX * RAD;
  const y2 = y1 * Math.cos(rx);
  const z2 = y1 * Math.sin(rx);

  const scale = g.perspective / (g.perspective - z2);
  return { x: x1 * scale, y: y2 * scale, z: z2, scale };
}

/**
 * Voile de brume cosmique — un dégradé plein écran, centré sur l'ancre du plan.
 * Pas de `backdrop-filter` (artefacts sur un sous-arbre transformé) : juste un
 * assombrissement progressif vers le vide. `openness` (0→1) : 0 = brume serrée
 * sur le disque, 1 = quasi dégagé. `tighten` [x, y] resserre l'ellipse en
 * mobile, où le disque incliné est très aplati.
 */
export function fogVeilGradient(
  cx: number,
  cy: number,
  openness: number,
  tighten: [number, number] = [1, 1],
): string {
  const o = Math.max(0, Math.min(openness, 1));
  const ex = (32 + o * 40) * tighten[0];
  const ey = (27 + o * 34) * tighten[1];
  const clear = Math.min(48 + o * 36, 92);
  const mid = Math.min(clear + 22, 97);
  return `radial-gradient(ellipse ${ex}% ${ey}% at ${cx}% ${cy}%, rgba(20,15,44,0) ${clear}%, rgba(24,18,52,.44) ${mid}%, rgba(10,8,24,.85) 100%)`;
}
