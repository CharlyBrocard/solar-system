import { lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import { Ship } from './Ship';

/**
 * Vaisseau « en grand » : rendu 3D bas-poly, avec la tuile SVG `<Ship>` en repli
 * instantané le temps que le chunk three.js arrive. Un seul `<Canvas>` — à
 * n'utiliser que pour l'aperçu sélectionné (onboarding, profil), pas en rangée.
 */

const Ship3D = lazy(() => import('@/features/scene3d/Ship3D'));

interface ShipHeroProps {
  id: number;
  size: number;
  className?: string;
  style?: CSSProperties;
  tint?: string;
}

export function ShipHero({ id, size, className, style, tint }: ShipHeroProps) {
  return (
    <Suspense fallback={<Ship id={id} size={size} className={className} style={style} />}>
      <Ship3D id={id} size={size} className={className} style={style} tint={tint} />
    </Suspense>
  );
}
