import { Outlet } from 'react-router-dom';
import { DiscoveryOverlay } from '@/features/discovery/DiscoveryOverlay';
import { QuestCompleteOverlay } from '@/features/quests/QuestCompleteOverlay';
import { LiveAnnouncer } from '@/components/LiveAnnouncer';
import { useQuestCompletion } from '@/store/useQuestCompletion';
import { usePrefsEffects } from '@/store/usePrefsEffects';

/** Coquille de l'app : l'écran courant + les overlays et la logique globale. */
export function AppLayout() {
  useQuestCompletion();
  usePrefsEffects();
  return (
    <>
      <Outlet />
      <DiscoveryOverlay />
      <QuestCompleteOverlay />
      <LiveAnnouncer />
    </>
  );
}
