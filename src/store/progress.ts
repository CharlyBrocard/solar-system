import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Zone } from '@/data/types';
import { bodyById } from '@/data/bodies';
import { discoveryBadgeFor } from '@/data/badges';

// État de jeu persistant (nom, découvertes, badges, quêtes, points, préférences).

export interface Prefs {
  readAloud: boolean;
  simplified: boolean;
  ambientSound: boolean;
}

export interface ProgressState {
  explorerName: string;
  avatarId: number;
  discovered: string[]; // ids d'objets
  badges: string[];
  activeQuestId: string | null; // quête « suivie »
  completedQuests: string[];
  quizPassed: string[]; // ids de quiz réussis
  compareUsed: boolean; // le comparateur a servi au moins une fois
  tutorialSeen: boolean; // le mini-tutoriel de la carte a été vu / passé
  points: number;
  realScaleMode: boolean;
  prefs: Prefs;

  /** Objet notable qui vient d'être découvert : déclenche l'overlay `3e`. */
  pendingDiscovery: string | null;
  /** Badges décernés pendant cette découverte, pour l'overlay. */
  pendingBadges: string[];
  /** Quête qui vient d'être accomplie : déclenche la célébration. */
  pendingQuestComplete: string | null;

  // --- actions ---
  startGame: (name: string, avatarId: number) => void;
  discover: (id: string) => void;
  dismissDiscovery: () => void;
  awardBadge: (id: string) => void;
  setActiveQuest: (id: string | null) => void;
  completeQuest: (id: string, rewardBadgeId?: string) => void;
  dismissQuestComplete: () => void;
  passQuiz: (id: string) => void;
  markCompareUsed: () => void;
  markTutorialSeen: () => void;
  toggleRealScale: () => void;
  setRealScale: (on: boolean) => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  reset: () => void;
}

export const POINTS_PER_DISCOVERY = 40;
export const POINTS_PER_QUEST = 100;
export const POINTS_PER_LEVEL = 1000;

// Seuils de déblocage de zone : nombre de découvertes requises dans la zone
// précédente pour lever la brume sur la suivante.
export const ZONE_ORDER: Zone[] = ['interne', 'ceinture', 'geantes', 'externe'];
export const ZONE_UNLOCK_THRESHOLD: Record<Zone, { prev: Zone | null; need: number }> = {
  interne: { prev: null, need: 0 },
  ceinture: { prev: 'interne', need: 6 },
  geantes: { prev: 'ceinture', need: 3 },
  externe: { prev: 'geantes', need: 7 },
};

const initialState = {
  explorerName: '',
  avatarId: 0,
  discovered: [] as string[],
  badges: [] as string[],
  activeQuestId: null as string | null,
  completedQuests: [] as string[],
  quizPassed: [] as string[],
  compareUsed: false,
  tutorialSeen: false,
  points: 0,
  realScaleMode: false,
  prefs: { readAloud: false, simplified: false, ambientSound: false } as Prefs,
  pendingDiscovery: null as string | null,
  pendingBadges: [] as string[],
  pendingQuestComplete: null as string | null,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...initialState,

      startGame: (name, avatarId) => set({ explorerName: name.trim(), avatarId }),

      discover: (id) =>
        set((s) => {
          if (s.discovered.includes(id)) return s;

          const body = bodyById(id);
          const discovered = [...s.discovered, id];

          // badges décernés par cette découverte
          const earned: string[] = [];
          if (s.discovered.length === 0 && !s.badges.includes('premier-pas')) {
            earned.push('premier-pas');
          }
          const milestone = discoveryBadgeFor(id);
          if (milestone && !s.badges.includes(milestone)) earned.push(milestone);

          const notable = body?.notable ?? false;

          return {
            discovered,
            points: s.points + POINTS_PER_DISCOVERY,
            badges: [...s.badges, ...earned],
            pendingDiscovery: notable ? id : s.pendingDiscovery,
            pendingBadges: notable ? earned : s.pendingBadges,
          };
        }),

      dismissDiscovery: () => set({ pendingDiscovery: null, pendingBadges: [] }),

      awardBadge: (id) =>
        set((s) => (s.badges.includes(id) ? s : { badges: [...s.badges, id] })),

      setActiveQuest: (id) => set({ activeQuestId: id }),

      completeQuest: (id, rewardBadgeId) =>
        set((s) => {
          if (s.completedQuests.includes(id)) return s;
          const badges =
            rewardBadgeId && !s.badges.includes(rewardBadgeId)
              ? [...s.badges, rewardBadgeId]
              : s.badges;
          return {
            completedQuests: [...s.completedQuests, id],
            activeQuestId: s.activeQuestId === id ? null : s.activeQuestId,
            badges,
            points: s.points + POINTS_PER_QUEST,
            pendingQuestComplete: id,
          };
        }),

      dismissQuestComplete: () => set({ pendingQuestComplete: null }),

      passQuiz: (id) =>
        set((s) => (s.quizPassed.includes(id) ? s : { quizPassed: [...s.quizPassed, id] })),

      markCompareUsed: () => set((s) => (s.compareUsed ? s : { compareUsed: true })),

      markTutorialSeen: () => set((s) => (s.tutorialSeen ? s : { tutorialSeen: true })),

      toggleRealScale: () => set((s) => ({ realScaleMode: !s.realScaleMode })),

      setRealScale: (on) => set((s) => (s.realScaleMode === on ? s : { realScaleMode: on })),

      setPref: (key, value) =>
        set((s) => ({ prefs: { ...s.prefs, [key]: value } })),

      reset: () => set(initialState),
    }),
    {
      name: 'solarsystem.progress',
      version: 2,
      // état transitoire : jamais persisté
      partialize: ({
        pendingDiscovery: _pd,
        pendingBadges: _pb,
        pendingQuestComplete: _pq,
        realScaleMode: _rs,
        ...rest
      }) => rest,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return { ...p, quizPassed: [], compareUsed: false } as unknown as ProgressState;
      },
    },
  ),
);

export const currentLevel = (points: number) => Math.floor(points / POINTS_PER_LEVEL) + 1;
