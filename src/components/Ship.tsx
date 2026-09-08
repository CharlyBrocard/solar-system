import type { CSSProperties, ReactElement } from 'react';

/**
 * Les vaisseaux que l'explorateur choisit à l'onboarding (`4c`).
 *
 * Cinq silhouettes dessinées en SVG (zéro asset) sur une tuile « hublot »
 * carrée-arrondie : coque crème, un accent coloré par vaisseau. Lisible de
 * 36 px (pastille du HUD) à 96 px (onboarding / profil).
 */

export interface ShipDef {
  /** nom affiché (onboarding) */
  name: string;
  /** teinte d'accent : hublot, parabole, cockpit… */
  accent: string;
  /** silhouette, viewBox 0 0 48 48, pointe vers le haut */
  render: (hull: string, accent: string) => ReactElement;
}

const HULL_A = '#f6ecd6';
const HULL_B = '#cdbfe6';

/** Navette classique — nez rond, deux ailerons, tuyère. */
function navette(hull: string, accent: string) {
  return (
    <g>
      <path
        d="M24 4c5.4 6 7 15.5 7 24v8H17v-8c0-8.5 1.6-18 7-24Z"
        fill={hull}
      />
      <path d="M17 27 11 41l6-4Z" fill={hull} opacity="0.82" />
      <path d="M31 27l6 14-6-4Z" fill={hull} opacity="0.82" />
      <path d="M20 36h8v3.5c0 3-1.7 5-4 5s-4-2-4-5Z" fill={accent} opacity="0.9" />
      <circle cx="24" cy="19" r="3.6" fill={accent} />
    </g>
  );
}

/** Soucoupe — dôme + disque large + feux dessous. */
function soucoupe(hull: string, accent: string) {
  return (
    <g>
      <ellipse cx="24" cy="26" rx="20" ry="6.5" fill={hull} />
      <path d="M14 24c1.5-9 19-9 20.5 0Z" fill={hull} opacity="0.9" />
      <ellipse cx="24" cy="20.5" rx="6" ry="4.5" fill={accent} />
      <circle cx="13" cy="29" r="1.7" fill={accent} />
      <circle cx="24" cy="31" r="1.7" fill={accent} />
      <circle cx="35" cy="29" r="1.7" fill={accent} />
    </g>
  );
}

/** Sonde — corps central, deux panneaux solaires, parabole. */
function sonde(hull: string, accent: string) {
  return (
    <g>
      <rect x="19" y="18" width="10" height="19" rx="2" fill={hull} />
      <rect x="3" y="21" width="13" height="11" rx="1" fill={hull} opacity="0.72" />
      <rect x="32" y="21" width="13" height="11" rx="1" fill={hull} opacity="0.72" />
      <path d="M9.5 21v11M32 26.5h13M3 26.5h13" stroke="#171232" strokeWidth="1.1" opacity="0.5" />
      <path d="M15 15c1.5-8 16.5-8 18 0Z" fill={accent} />
      <path d="M24 15v4" stroke={hull} strokeWidth="1.8" />
      <circle cx="24" cy="12.5" r="1.7" fill={hull} />
    </g>
  );
}

/** Chasseur — aile delta, cockpit avancé, réacteurs. */
function chasseur(hull: string, accent: string) {
  return (
    <g>
      <path d="M24 4 41 40 24 33 7 40Z" fill={hull} />
      <path d="M24 4c2.2 4 3.4 9 3.4 15L24 27l-3.4-8c0-6 1.2-11 3.4-15Z" fill={hull} opacity="0.55" />
      <circle cx="24" cy="17" r="3.4" fill={accent} />
      <rect x="18" y="35" width="4" height="6" rx="1" fill={accent} opacity="0.9" />
      <rect x="26" y="35" width="4" height="6" rx="1" fill={accent} opacity="0.9" />
    </g>
  );
}

/** Module d'atterrissage — capsule facettée sur trois pieds. */
function lander(hull: string, accent: string) {
  return (
    <g>
      <path d="M15 11h18l4 13-7 8H18l-7-8Z" fill={hull} />
      <path d="M14 29 6 41M34 29l8 12M24 32v10" stroke={hull} strokeWidth="3" strokeLinecap="round" />
      <path d="M3 41h6M21 43h6M39 41h6" stroke={hull} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="24" cy="20" r="4.6" fill={accent} />
    </g>
  );
}

export const SHIPS: ShipDef[] = [
  { name: 'La Navette', accent: '#ffb454', render: navette },
  { name: 'La Soucoupe', accent: '#6fc8e8', render: soucoupe },
  { name: 'La Sonde', accent: '#7ad9a6', render: sonde },
  { name: 'Le Chasseur', accent: '#ff8f9e', render: chasseur },
  { name: 'Le Module', accent: '#b79cf0', render: lander },
];

export function shipDef(id: number): ShipDef {
  return SHIPS[id] ?? SHIPS[0];
}

interface ShipProps {
  id: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Tuile « hublot » avec le vaisseau choisi. Purement décoratif. */
export function Ship({ id, size = 44, className, style }: ShipProps) {
  const def = shipDef(id);
  const gid = `hull-${id}`;
  return (
    <span
      className={className}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'radial-gradient(120% 120% at 30% 22%, #2b2352, #171232 78%)',
        boxShadow: `inset 0 0 0 1px rgba(246, 236, 214, 0.12), inset 0 -${Math.max(
          2,
          size * 0.06,
        )}px ${Math.max(4, size * 0.14)}px rgba(6, 4, 18, 0.5)`,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="72%"
        height="72%"
        style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(6,4,18,0.45))' }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={HULL_A} />
            <stop offset="1" stopColor={HULL_B} />
          </linearGradient>
        </defs>
        {def.render(`url(#${gid})`, def.accent)}
      </svg>
    </span>
  );
}
