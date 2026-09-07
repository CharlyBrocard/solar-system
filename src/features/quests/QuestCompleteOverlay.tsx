import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { badgeById } from '@/data/badges';
import { questById } from '@/data/quests';
import { POINTS_PER_QUEST, useProgress } from '@/store/progress';
import styles from './QuestCompleteOverlay.module.css';

/**
 * Célébration montrée quand une quête vient d'être accomplie.
 * Pilotée par la file `pendingQuestCompletions` du store (célébrées une à une :
 * dismiss → quête suivante) — rendue au niveau de l'app (`AppLayout`) pour passer
 * par-dessus n'importe quel écran, comme l'overlay `3e`. Pas d'artboard dédié :
 * reprend la DA de « Moment de découverte ».
 */
export function QuestCompleteOverlay() {
  const pendingId = useProgress((s) => s.pendingQuestCompletions[0] ?? null);
  const pendingDiscovery = useProgress((s) => s.pendingDiscovery);
  const dismiss = useProgress((s) => s.dismissQuestComplete);
  // rang de CETTE quête (les suivantes de la file ne comptent pas encore)
  const completedCount = useProgress(
    (s) => s.completedQuests.length - Math.max(0, s.pendingQuestCompletions.length - 1),
  );
  const navigate = useNavigate();

  // Une découverte notable peut à la fois révéler un objet et clore une quête :
  // on laisse d'abord passer l'overlay `3e`, la célébration s'affiche ensuite.
  const quest = pendingDiscovery ? undefined : questById(pendingId);

  useEffect(() => {
    if (!quest) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quest, dismiss]);

  if (!quest) return null;

  const badge = quest.rewardBadgeId ? badgeById(quest.rewardBadgeId) : undefined;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Quête accomplie : ${quest.title}`}
      onClick={dismiss}
    >
      <div className={styles.glow} />
      <div className={styles.rays} aria-hidden />
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.burst} aria-hidden>
          <span className={styles.ring} />
          <span className={styles.medal}>
            <span className={styles.medalCheck} />
          </span>
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className={styles.spark}
              style={{ '--a': `${s}deg` } as CSSProperties}
            />
          ))}
        </div>

        <span className={styles.pill}>
          <span className={styles.pillDot} />
          Quête accomplie
        </span>

        <h2 className={styles.name}>{quest.title}</h2>
        <p className={styles.blurb}>{quest.description}</p>

        <div className={styles.rewards}>
          <div className={styles.points}>
            <span className={styles.pointsNum}>+{POINTS_PER_QUEST}</span>
            <span className={styles.pointsKey}>points</span>
          </div>
          {badge && (
            <div className={styles.badge}>
              <span className={styles.badgeIcon} />
              <span className={styles.badgeText}>
                <span className={styles.badgeKey}>Badge débloqué</span>
                <span className={styles.badgeTitle}>{badge.title}</span>
              </span>
            </div>
          )}
        </div>

        <span className={styles.tally}>{completedCount} quête{completedCount > 1 ? 's' : ''} accomplie{completedCount > 1 ? 's' : ''}</span>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={dismiss}>
            Continuer l'exploration
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              dismiss();
              navigate('/quests');
            }}
          >
            Voir mes quêtes
          </button>
        </div>
      </div>
    </div>
  );
}

const SPARKS = [12, 58, 104, 150, 196, 242, 288, 334];
