import type { CSSProperties } from 'react';

/** Les 5 vaisseaux de l'écran d'onboarding (`4c`). */
export const AVATAR_GRADIENTS = [
  'linear-gradient(160deg, #ffca5c, #ec8a2a)',
  'linear-gradient(160deg, #b9e6f5, #2a6bad)',
  'linear-gradient(160deg, #ffbe95, #b04a24)',
  'linear-gradient(160deg, #d9c9f5, #6446a8)',
  'linear-gradient(160deg, #c7f0f8, #2b7488)',
];

interface AvatarProps {
  id: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Avatar({ id, size = 44, className, style }: AvatarProps) {
  const gradient = AVATAR_GRADIENTS[id] ?? AVATAR_GRADIENTS[0];
  return (
    <span
      className={className}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: gradient,
        boxShadow: `inset 0 -${Math.max(3, size * 0.08)}px 0 rgba(120, 60, 10, 0.4)`,
        display: 'inline-block',
        flex: 'none',
        ...style,
      }}
    />
  );
}
