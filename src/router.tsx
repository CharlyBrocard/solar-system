import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Codex } from '@/features/codex/Codex';
import { Compare } from '@/features/compare/Compare';
import { EntryScreen } from '@/features/entry/EntryScreen';
import { Onboarding } from '@/features/entry/Onboarding';
import { NotFound } from '@/features/error/NotFound';
import { SystemView } from '@/features/map/SystemView';
import { ObjectSheet } from '@/features/object/ObjectSheet';
import { Present } from '@/features/present/Present';
import { Profile } from '@/features/profile/Profile';
import { QuestJournal } from '@/features/quests/QuestJournal';
import { Quiz } from '@/features/quiz/Quiz';
import { ZoneView } from '@/features/zone/ZoneView';

// Spike 3D jetable (`/r3d`) — chargé en lazy pour ne pas alourdir le bundle.
const SpikeR3D = lazy(() => import('@/features/spike/SpikeR3D'));

/**
 * Toutes les routes de l'app. Les overlays (quête active `2g`, zone scellée +
 * tutoriel `3l`, échelle réelle `3g` via `/map?scale=real`, moment de découverte
 * `3e`, recherche `3h`, célébration de quête) ne sont pas des routes : ils sont
 * rendus dans `AppLayout` ou l'écran concerné.
 */
const screens = [
  {
    path: '/',
    element: <EntryScreen />,
  },
  {
    path: '/start',
    element: <Onboarding />,
  },
  {
    path: '/map',
    element: <SystemView />,
  },
  {
    path: '/object/:id',
    element: <ObjectSheet />,
  },
  {
    path: '/zone/:id',
    element: <ZoneView />,
  },
  {
    path: '/codex',
    element: <Codex />,
  },
  {
    path: '/quests',
    element: <QuestJournal />,
  },
  {
    path: '/compare',
    element: <Compare />,
  },
  {
    path: '/quiz/:id',
    element: <Quiz />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/present/:id',
    element: <Present />,
  },
  {
    path: '/r3d',
    element: (
      <Suspense fallback={null}>
        <SpikeR3D />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: screens,
  },
]);
