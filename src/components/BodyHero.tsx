import { lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import type { Body } from '@/data/types';
import type { HeroMoon } from '@/features/scene3d/BodyView3D';
import { BodySphere } from './BodySphere';

/**
 * Astre « en grand » : rendu 3D (matière + éclairage de la scène orbitale),
 * avec la sphère CSS `BodySphere` en repli instantané le temps que le chunk
 * three.js arrive. Pour les vignettes (codex, quiz…), garder `BodySphere`.
 */

const BodyView3D = lazy(() => import('@/features/scene3d/BodyView3D'));

interface BodyHeroProps {
  body: Body;
  size: number;
  className?: string;
  style?: CSSProperties;
  silhouette?: boolean;
  spin?: boolean;
  /** couleur du fond hôte — le rendu 3D est opaque et s'y fond */
  tint?: string;
  /** lunes en orbite autour du corps (aperçu du sous-système) */
  moons?: HeroMoon[];
  /** canvas plein cadre, astre décalé à gauche (fiche `/object`) */
  bleed?: boolean;
}

export function BodyHero({
  body,
  size,
  className,
  style,
  silhouette,
  spin,
  tint,
  moons,
  bleed,
}: BodyHeroProps) {
  return (
    <Suspense
      fallback={
        bleed ? (
          <div className={className} style={style} />
        ) : (
          <BodySphere
            body={body}
            size={size}
            silhouette={silhouette}
            className={className}
            style={style}
          />
        )
      }
    >
      <BodyView3D
        body={body}
        size={size}
        className={className}
        style={style}
        silhouette={silhouette}
        spin={spin}
        tint={tint}
        moons={moons}
        bleed={bleed}
      />
    </Suspense>
  );
}
