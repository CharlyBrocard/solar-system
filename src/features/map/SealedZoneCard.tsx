import { useEffect } from 'react';
import type { Zone } from '@/data/types';
import { ZONE_META } from '@/data/zones';
import { useProgress, ZONE_UNLOCK_THRESHOLD } from '@/store/progress';
import { revealHint } from '@/store/selectors';
import styles from './MapOverlays.module.css';

/** Artboard `3l` : message affiché quand on touche une zone encore dans la brume. */
export function SealedZoneCard({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const discovered = useProgress((s) => s.discovered);
  const hint = revealHint(discovered, zone);
  const missing = Math.max(0, hint.need - hint.current);
  const prev = ZONE_UNLOCK_THRESHOLD[zone].prev;

  useEffect(() => {
    const t = window.setTimeout(onClose, 6000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className={styles.sealed} role="status" aria-live="polite">
      <div className={styles.sealedIcon}>
        <span className={styles.lockGlyph} />
      </div>
      <div>
        <div className={styles.sealedTitle}>La brume ne se dissipe pas encore</div>
        <div className={styles.sealedText}>
          Il te manque {missing} découverte{missing > 1 ? 's' : ''}
          {prev ? ` dans ${ZONE_META[prev].withArticle}` : ''} pour ouvrir{' '}
          {ZONE_META[zone].withArticle}.
        </div>
      </div>
      <button
        type="button"
        className={styles.sealedClose}
        onClick={onClose}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
