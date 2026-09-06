import type { CSSProperties } from 'react';
import type { Body } from '@/data/types';

interface BodySphereProps {
  body: Body;
  /** Diamètre en px ; par défaut `body.size`. */
  size?: number;
  /** Silhouette « devinée » derrière la brume (objet non révélé). */
  silhouette?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Une sphère d'astre : dégradé radial + ombre interne opposée à la lumière.
 * Parti pris de la DA : jamais d'image ni de texture, uniquement du CSS.
 *
 * Halo et ombres en dégradé radial plutôt qu'en `box-shadow` : la scène met le
 * "monde" à l'échelle via `transform: scale()`, et les grandes `box-shadow`
 * floues se tuilent (damier) sur un sous-arbre transformé.
 */
export function BodySphere({ body, size, silhouette, className, style }: BodySphereProps) {
  const d = size ?? body.size;
  const [c1, c2, c3] = body.gradient;

  if (silhouette) {
    return (
      <div
        className={className}
        style={{
          width: d,
          height: d,
          borderRadius: '50%',
          background: 'var(--fog-body)',
          boxShadow: 'inset 0 0 0 2px rgba(246,235,214,.32)',
          // "deviné, pas invisible" : un léger flou de brume
          filter: 'blur(1.4px)',
          ...style,
        }}
      />
    );
  }

  const isStar = body.type === 'star';

  return (
    <div className={className} style={{ position: 'relative', width: d, height: d, ...style }}>
      {isStar && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '-80%',
            top: '-80%',
            width: '260%',
            height: '260%',
            borderRadius: '50%',
            pointerEvents: 'none',
            background:
              'radial-gradient(circle, rgba(255,205,120,.55) 0%, rgba(255,170,70,.3) 26%, rgba(255,150,60,0) 64%)',
          }}
        />
      )}

      {body.rings && (
        <div
          style={{
            position: 'absolute',
            left: '-46%',
            top: '39%',
            width: '192%',
            height: '22%',
            borderRadius: '50%',
            border: `${Math.max(2, d * 0.07)}px solid rgba(246,235,214,.5)`,
            transform: 'rotate(-13deg)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          width: d,
          height: d,
          borderRadius: '50%',
          overflow: 'hidden',
          background: `radial-gradient(circle at 33% 27%, ${c1} 0%, ${c2} 45%, ${c3} 100%)`,
          boxShadow: isStar
            ? `inset -${d * 0.07}px -${d * 0.09}px ${d * 0.2}px rgba(158,60,10,.45)`
            : `inset -${Math.max(3, d * 0.1)}px -${Math.max(4, d * 0.12)}px ${Math.max(
                8,
                d * 0.22,
              )}px rgba(8,4,20,.42), 0 ${Math.max(3, d * 0.08)}px ${Math.max(
                6,
                d * 0.16,
              )}px rgba(8,4,20,.4)`,
        }}
      >
        {body.banded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(93deg, rgba(255,255,255,.13) 0 ${
                d * 0.06
              }px, rgba(0,0,0,.11) ${d * 0.06}px ${d * 0.13}px)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </div>
    </div>
  );
}
