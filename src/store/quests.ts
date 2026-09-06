import { bodyById } from '@/data/bodies';
import QUESTS from '@/data/quests';
import type { Quest, QuestObjective } from '@/data/types';
import { unlockedZones } from './selectors';

export type QuestState = 'completed' | 'active' | 'available' | 'locked';

export interface ObjectiveStatus {
  id: string;
  label: string;
  done: boolean;
  current?: number;
  total?: number;
}

export interface QuestStatus {
  quest: Quest;
  state: QuestState;
  followed: boolean;
  objectives: ObjectiveStatus[];
  doneCount: number;
  total: number;
  allDone: boolean;
}

export interface QuestContext {
  discovered: string[];
  quizPassed: string[];
  compareUsed: boolean;
  completedQuests: string[];
  activeQuestId: string | null;
}

function objectiveStatus(o: QuestObjective, ctx: QuestContext): ObjectiveStatus {
  const base = { id: o.id, label: o.label };
  switch (o.kind) {
    case 'visit':
      return { ...base, done: ctx.discovered.includes(o.target ?? '') };
    case 'visit-any': {
      const targets = o.targets ?? [];
      const n = targets.filter((t) => ctx.discovered.includes(t)).length;
      const need = o.count ?? targets.length;
      return { ...base, done: n >= need, current: Math.min(n, need), total: need };
    }
    case 'discover-zone': {
      const n = ctx.discovered.filter((id) => bodyById(id)?.zone === o.target).length;
      const need = o.count ?? 1;
      return { ...base, done: n >= need, current: Math.min(n, need), total: need };
    }
    case 'quiz':
      return { ...base, done: ctx.quizPassed.includes(o.target ?? '') };
    case 'compare':
      return { ...base, done: ctx.compareUsed };
  }
}

export function questStatus(quest: Quest, ctx: QuestContext): QuestStatus {
  const objectives = quest.objectives.map((o) => objectiveStatus(o, ctx));
  const doneCount = objectives.filter((o) => o.done).length;
  const allDone = doneCount === objectives.length;
  const completed = ctx.completedQuests.includes(quest.id);
  const reqMet = !quest.requires || unlockedZones(ctx.discovered).has(quest.requires);
  const followed = ctx.activeQuestId === quest.id;

  let state: QuestState;
  if (completed) state = 'completed';
  else if (!reqMet) state = 'locked';
  else if (followed || (doneCount > 0 && !allDone)) state = 'active';
  else state = 'available';

  return { quest, state, followed, objectives, doneCount, total: objectives.length, allDone };
}

export function allQuestStatuses(ctx: QuestContext): QuestStatus[] {
  return QUESTS.map((q) => questStatus(q, ctx));
}

/** Quêtes tout juste terminées mais pas encore enregistrées. */
export function newlyCompletedQuests(ctx: QuestContext): Quest[] {
  return QUESTS.filter(
    (q) =>
      !ctx.completedQuests.includes(q.id) &&
      questStatus(q, ctx).allDone &&
      (!q.requires || unlockedZones(ctx.discovered).has(q.requires)),
  );
}
