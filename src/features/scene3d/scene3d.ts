import * as THREE from 'three';
import type { Body } from '@/data/types';

/** px de maquette → unités de scène 3D. */
export const ORBIT_SCALE = 1 / 7;
export const SIZE_SCALE = 1 / 12;

/** Halo d'atmosphère (couleur) pour les corps qui en ont une visible. */
export const ATMOSPHERE: Record<string, string> = {
  terre: '#8ec9ef',
  venus: '#f6dfb0',
  mars: '#e9a97e',
  titan: '#e0a869',
  jupiter: '#e9c48a',
  saturne: '#efdcb2',
  uranus: '#a8e6e2',
  neptune: '#7fa8f0',
};

/** Inclinaison par défaut du plan (° au-dessus de l'écliptique). */
export const ELEVATION_DEG = 33;

/** Dérive orbitale : lente, plus rapide vers l'intérieur (Kepler très adouci). */
export const DRIFT_DEG_PER_SEC = 2.4;
const DRIFT_REF_RADIUS = 200;
export const driftSpeed = (radius: number) =>
  Math.pow(DRIFT_REF_RADIUS / Math.max(radius, 60), 0.62);

/** Rayon d'une bille, en unités de scène. */
export function worldRadius(px: number, min = 0.5, max = 5.4) {
  return THREE.MathUtils.clamp(px * SIZE_SCALE, min, max);
}

/** Position d'un corps sur son orbite (plan y = 0), dérive comprise. */
export function orbitPosition(
  body: Pick<Body, 'orbitRadius' | 'orbitAngle'>,
  driftDeg: number,
  out = new THREE.Vector3(),
) {
  const r = body.orbitRadius * ORBIT_SCALE;
  const a = THREE.MathUtils.degToRad(
    body.orbitAngle - driftDeg * driftSpeed(body.orbitRadius),
  );
  return out.set(Math.cos(a) * r, 0, Math.sin(a) * r);
}

/** Extrait l'alpha d'une couleur `rgba(r,g,b,a)` (les anneaux du HUD). */
export function alphaOf(rgba: string, fallback = 0.15): number {
  const m = rgba.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return m ? parseFloat(m[1]) : fallback;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
