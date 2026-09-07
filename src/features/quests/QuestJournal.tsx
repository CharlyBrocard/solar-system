import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { badgeById } from '@/data/badges';
import { useProgress } from '@/store/progress';
import { allQuestStatuses } from '@/store/quests';
import type { QuestStatus } from '@/store/quests';
import styles from './QuestJournal.module.css';

export function QuestJournal() {
  const navigate = useNavigate();
  const discovered = useProgress((s) => s.discovered);
  const quizPassed = useProgress((s) => s.quizPassed);
  const compareUsed = useProgress((s) => s.compareUsed);
  const completedQuests = useProgress((s) => s.completedQuests);
  const activeQuestId = useProgress((s) => s.activeQuestId);
  const setActiveQuest = useProgress((s) => s.setActiveQuest);

  const statuses = useMemo(
    () =>
      allQuestStatuses({ discovered, quizPassed, compareUsed, completedQuests, activeQuestId }),
    [discovered, quizPassed, compareUsed, completedQuests, activeQuestId],
  );

  const followed =
    statuses.find((s) => s.followed) ??
    statuses.find((s) => s.state === 'active') ??
    statuses.find((s) => s.state === 'available') ??
    null;
  const isFollowed = (s: QuestStatus) => s === followed;

  const inProgress = statuses.filter((s) => s.state === 'active' && !isFollowed(s));
  const available = statuses.filter((s) => s.state === 'available' && !isFollowed(s));
  const locked = statuses.filter((s) => s.state === 'locked' && !isFollowed(s));
  const done = statuses.filter((s) => s.state === 'completed');

  const activeCount = statuses.filter((s) => s.followed || s.state === 'active').length;

  return (
    <div className={styles.screen}>
      <div className={styles.nebula} />

      <div className={styles.inner}>
        <Link to="/map" className={styles.back}>
          ‹ Retour à la carte
        </Link>

        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Missions</div>
            <h1 className={styles.title}>Journal de bord</h1>
          </div>
          <div className={styles.pills}>
            <span className={styles.pill} data-strong="true">
              En cours · {activeCount}
            </span>
            <span className={styles.pill}>Disponibles · {available.length + locked.length}</span>
            <span className={styles.pill}>Terminées · {done.length}</span>
          </div>
        </header>

        <div className={styles.cols}>
          <div className={styles.col}>
            {followed ? (
              <FollowedCard status={followed} onGo={(to) => navigate(to)} />
            ) : (
              <div className={styles.empty}>
                Toutes les missions du moment sont terminées. Explore pour en débloquer d'autres.
              </div>
            )}

            {inProgress.map((s) => (
              <CompactRow
                key={s.quest.id}
                status={s}
                onClick={() => setActiveQuest(s.quest.id)}
              />
            ))}
          </div>

          <div className={styles.col}>
            <span className={styles.sectionLabel}>Disponibles</span>
            {available.length + locked.length === 0 && (
              <div className={styles.empty}>Rien de neuf pour l'instant.</div>
            )}
            {available.map((s) => (
              <button
                key={s.quest.id}
                type="button"
                className={styles.row}
                onClick={() => setActiveQuest(s.quest.id)}
              >
                <span className={styles.rowIcon} data-kind="badge" />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{s.quest.title}</span>
                  <span className={styles.rowSub}>{s.quest.description}</span>
                </span>
              </button>
            ))}
            {locked.map((s) => (
              <div key={s.quest.id} className={styles.row} data-tone="locked">
                <span className={styles.rowIcon} data-kind="badge" />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{s.quest.title}</span>
                  <span className={styles.rowSub}>
                    Nécessite : {zoneLabel(s.quest.requires)}
                  </span>
                </span>
              </div>
            ))}

            {done.length > 0 && (
              <>
                <span className={styles.sectionLabel} style={{ marginTop: 6 }}>
                  Terminées
                </span>
                {done.map((s) => (
                  <div key={s.quest.id} className={styles.row} data-tone="done">
                    <span className={styles.rowIcon} />
                    <span className={styles.rowBody}>
                      <span className={styles.rowTitle}>{s.quest.title}</span>
                      <span className={styles.rowSub}>
                        Badge « {badgeById(s.quest.rewardBadgeId)?.title} »
                      </span>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNav active="quests" />
    </div>
  );
}

function FollowedCard({
  status,
  onGo,
}: {
  status: QuestStatus;
  onGo: (to: string) => void;
}) {
  const { quest, objectives, doneCount, total } = status;
  const badge = badgeById(quest.rewardBadgeId);
  // Objectif unique et chiffré (« 2/4 lunes ») : on affiche SA progression, pas
  // « 0/1 objectifs » — qui contredisait le « 2/4 » de la ligne juste en dessous.
  const counted =
    objectives.length === 1 && objectives[0].total != null ? objectives[0] : null;

  return (
    <div className={styles.followed}>
      <div className={styles.followedHead}>
        <span className={styles.tagFollowed}>
          <span className={styles.tagDot} />
          Quête suivie
        </span>
        <span className={styles.tagMeta}>
          {counted
            ? `${counted.current}/${counted.total}`
            : `${doneCount}/${total} objectifs`}
        </span>
      </div>

      <h2 className={styles.followedTitle}>{quest.title}</h2>
      <p className={styles.followedDesc}>{quest.description}</p>

      <div className={styles.checklist}>
        {objectives.map((o) => (
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
        {quest.goto && (
          <button type="button" className={styles.goBtn} onClick={() => onGo(quest.goto!)}>
            Y aller
          </button>
        )}
      </div>
    </div>
  );
}

function CompactRow({ status, onClick }: { status: QuestStatus; onClick: () => void }) {
  const { quest, objectives, doneCount, total } = status;
  const withCount = objectives.find((o) => o.total != null);
  const pct = total ? (doneCount / total) * 100 : 0;

  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.rowIcon} data-kind="badge" />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{quest.title}</span>
        <span className={styles.rowSub}>
          {withCount
            ? `${withCount.label} · ${withCount.current}/${withCount.total}`
            : `${doneCount}/${total} objectifs`}
        </span>
      </span>
      <span className={styles.rowBar}>
        <span className={styles.rowFill} style={{ width: `${pct}%` }} />
      </span>
    </button>
  );
}

function zoneLabel(z: string | undefined) {
  switch (z) {
    case 'ceinture':
      return "ceinture d'astéroïdes révélée";
    case 'geantes':
      return 'géantes gazeuses révélées';
    case 'externe':
      return 'système externe révélé';
    default:
      return 'progresser dans l’exploration';
  }
}
