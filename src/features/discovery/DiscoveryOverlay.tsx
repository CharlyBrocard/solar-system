import { useNavigate } from 'react-router-dom';
import { BodyHero } from '@/components/BodyHero';
import { bodyById, TOTAL_BODIES } from '@/data/bodies';
import { badgeById } from '@/data/badges';
import { useProgress } from '@/store/progress';
import { useBlurb } from '@/store/useBlurb';
import { useDialog } from '@/lib/useDialog';
import styles from './DiscoveryOverlay.module.css';

/**
 * Overlay `3e` : montré quand un objet notable vient d'être découvert.
 * Piloté par `pendingDiscovery` dans le store — rendu au niveau de l'app
 * pour apparaître par-dessus n'importe quel écran.
 */
export function DiscoveryOverlay() {
  const pendingDiscovery = useProgress((s) => s.pendingDiscovery);
  const pendingBadges = useProgress((s) => s.pendingBadges);
  const dismiss = useProgress((s) => s.dismissDiscovery);
  const discoveredCount = useProgress((s) => s.discovered.length);
  const navigate = useNavigate();

  const body = bodyById(pendingDiscovery ?? undefined);
  const blurb = useBlurb(body);
  const dialogRef = useDialog<HTMLDivElement>(dismiss, !!body);

  if (!body) return null;

  const badge = pendingBadges.map(badgeById).find(Boolean);

  return (
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Découverte : ${body.name}`}
      onClick={dismiss}
    >
      <div className={styles.glow} />
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <span className={styles.pill}>
          <span className={styles.pillDot} />
          Nouvel objet découvert
        </span>

        <div className={styles.sphereWrap}>
          <BodyHero body={body} size={190} tint="#2b2253" />
        </div>

        <h2 className={styles.name}>{body.name}</h2>
        <p className={styles.blurb}>{blurb}</p>

        {badge && (
          <div className={styles.badgeRow}>
            <span className={styles.badgeIcon} />
            <span className={styles.badgeText}>
              <span className={styles.badgeKey}>Badge débloqué</span>
              <span className={styles.badgeTitle}>{badge.title}</span>
            </span>
            <span className={styles.count}>
              <span className={styles.countNum}>
                {discoveredCount} / {TOTAL_BODIES}
              </span>
              <span className={styles.countKey}>carnet</span>
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              dismiss();
              navigate(`/object/${body.id}`);
            }}
          >
            Ouvrir la fiche
          </button>
          <button type="button" className={styles.secondary} onClick={dismiss}>
            Continuer l'exploration
          </button>
        </div>
      </div>
    </div>
  );
}
