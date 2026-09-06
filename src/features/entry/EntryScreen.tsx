import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { bodyById } from '@/data/bodies';
import type { Body } from '@/data/types';
import { useProgress } from '@/store/progress';
import { OrbitalScene, ringColor } from '@/features/scene/OrbitalScene';
import type { SceneRing, ScenePin } from '@/features/scene/OrbitalScene';
import styles from './EntryScreen.module.css';

const ENTRY_BG =
  'radial-gradient(110% 100% at 50% 78%, #3a2757 0%, #241a45 38%, #150f2e 72%, #0a0918 100%)';

// disposition décorative : les planètes s'étalent autour du Soleil, légèrement au-dessus.
const DECO = [
  { id: 'venus', radius: 176, angle: 330 },
  { id: 'terre', radius: 258, angle: 205 },
  { id: 'saturne', radius: 340, angle: 285 },
];

const RINGS: SceneRing[] = [
  { radius: 156, width: 2, color: ringColor(0.2) },
  { radius: 232, width: 2, color: ringColor(0.17) },
  { radius: 322, width: 2, color: ringColor(0.13) },
  { radius: 420, width: 2, color: ringColor(0.08), dashed: true },
];

export function EntryScreen() {
  const navigate = useNavigate();
  const explorerName = useProgress((s) => s.explorerName);

  const pins: ScenePin[] = useMemo(
    () =>
      DECO.flatMap((d) => {
        const base = bodyById(d.id);
        if (!base) return [];
        const body: Body = { ...base, orbitRadius: d.radius, orbitAngle: d.angle };
        return [{ body, revealed: true, discovered: true }];
      }),
    [],
  );

  const enter = () => navigate(explorerName ? '/map' : '/start');

  return (
    <OrbitalScene
      background={ENTRY_BG}
      origin={[50, 57]}
      zoom={0.5}
      pan={{ x: 0, y: 0 }}
      onZoom={() => {}}
      onPan={() => {}}
      interactive={false}
      rings={RINGS}
      centerBody={bodyById('soleil')}
      centerSize={92}
      pins={pins}
      fogOpenness={0.82}
      hoveredId={null}
      onHover={() => {}}
      onSelect={enter}
      onCenterClick={enter}
    >
      <div className={styles.topFade} />

      <div className={styles.hero}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Atlas d'exploration
        </span>
        <h1 className={styles.title}>Orbites</h1>
        <p className={styles.tagline}>
          Le système solaire comme une carte à dévoiler. Franchis la brume,
          découvre 42 mondes, remplis ton carnet.
        </p>
      </div>

      <div className={styles.foot}>
        <button type="button" className={styles.cta} onClick={enter} data-nodrag>
          Explorer
        </button>
        <div className={styles.loader}>
          <div className={styles.loaderTrack}>
            <div className={styles.loaderFill} />
          </div>
          <span className={styles.loaderLabel}>Chargement du disque orbital</span>
        </div>
      </div>
    </OrbitalScene>
  );
}
