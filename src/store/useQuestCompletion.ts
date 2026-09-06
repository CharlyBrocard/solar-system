import { useEffect } from 'react';
import { useProgress } from './progress';
import { newlyCompletedQuests } from './quests';

/**
 * Marque automatiquement comme terminées les quêtes dont tous les objectifs
 * sont remplis, et décerne le badge. Monté une fois dans `AppLayout`.
 */
export function useQuestCompletion() {
  const discovered = useProgress((s) => s.discovered);
  const quizPassed = useProgress((s) => s.quizPassed);
  const compareUsed = useProgress((s) => s.compareUsed);
  const completedQuests = useProgress((s) => s.completedQuests);
  const activeQuestId = useProgress((s) => s.activeQuestId);
  const completeQuest = useProgress((s) => s.completeQuest);

  useEffect(() => {
    const done = newlyCompletedQuests({
      discovered,
      quizPassed,
      compareUsed,
      completedQuests,
      activeQuestId,
    });
    for (const q of done) completeQuest(q.id, q.rewardBadgeId);
  }, [discovered, quizPassed, compareUsed, completedQuests, activeQuestId, completeQuest]);
}
