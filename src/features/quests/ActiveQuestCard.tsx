import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { badgeById } from '@/data/badges';
import { questById } from '@/data/quests';
import { useProgress } from '@/store/progress';
import { questStatus } from '@/store/quests';
import styles from './ActiveQuestCard.module.css';

/** Overlay `2g` : la quête suivie, épinglée sur la carte. */
export function ActiveQuestCard() {
  const activeQuestId = useProgress((s) => s.activeQuestId);
  const setActiveQuest = useProgress((s) => s.setActiveQuest);
  const discovered = useProgress((s) => s.discovered);
  const quizPassed = useProgress((s) => s.quizPassed);
  const compareUsed = useProgress((s) => s.compareUsed);
  const completedQuests = useProgress((s) => s.completedQuests);

  const quest = questById(activeQuestId);
  const status = useMemo(
    () =>
      quest
        ? questStatus(quest, {
            discovered,
            quizPassed,
            compareUsed,
            completedQuests,
            activeQuestId,
          })
        : null,
    [quest, discovered, quizPassed, compareUsed, completedQuests, activeQuestId],
  );

  if (!quest || !status || status.state === 'completed') return null;

  const badge = badgeById(quest.rewardBadgeId);

  return (
    <div className={styles.card} data-nodrag>
      <div className={styles.head}>
        <span className={styles.tag}>
          <span className={styles.tagDot} />
          Quête suivie
        </span>
        <button
          type="button"
          className={styles.close}
          onClick={() => setActiveQuest(null)}
          aria-label="Ne plus suivre cette quête"
        >
          ×
        </button>
      </div>

      <Link to="/quests" className={styles.link}>
        <h2 className={styles.title}>{quest.title}</h2>
      </Link>
      <p className={styles.desc}>{quest.description}</p>

      <div className={styles.checklist}>
        {status.objectives.map((o) => (
          <div key={o.id} className={styles.check} data-done={o.done ? 'true' : undefined}>
            <span className={styles.checkBox} />
            {o.label}
            {o.total != null && (
              <span className={styles.checkCount}>
                {o.current}/{o.total}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.reward}>
        <span className={styles.badgeIcon} />
        <div>
          <div className={styles.rewardKey}>Récompense</div>
          <div className={styles.rewardName}>Badge « {badge?.title} »</div>
        </div>
      </div>
    </div>
  );
}
