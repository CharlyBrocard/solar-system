import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { beltBodies, bodyById, moonsOf } from '@/data/bodies';
import type { Body } from '@/data/types';
import { ZONE_META } from '@/data/zones';
import { useProgress } from '@/store/progress';
import { useBlurb } from '@/store/useBlurb';
import { unlockedZones } from '@/store/selectors';
import { OrbitalScene, ringColor } from '@/features/scene/OrbitalScene';
import type { ScenePin } from '@/features/scene/OrbitalScene';
import styles from './ZoneView.module.css';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

interface ZoneConfig {
  centerId: string;
  members: Body[];
  bg: string;
  panelTitle: string;
  panelText: string;
  isBelt: boolean;
}

function configFor(id: string | undefined): ZoneConfig | null {
  if (!id) return null;

  if (id === 'ceinture') {
    return {
      centerId: 'soleil',
      members: beltBodies(),
      bg: 'radial-gradient(110% 90% at 50% 55%, #2a2148 0%, #1b1438 44%, #120e28 76%, #0b0a1d 100%)',
      panelTitle: 'Un million de cailloux',
      panelText:
        'Entre Mars et Jupiter, des débris qui n’ont jamais formé de planète. Cérès, le plus gros, fait à peine un quart de la Lune.',
      isBelt: true,
    };
  }

  const parent = bodyById(id);
  const members = moonsOf(id);
  if (!parent || members.length === 0) return null;

  return {
    centerId: id,
    members,
    bg: 'radial-gradient(110% 90% at 44% 54%, #2f2450 0%, #1d1539 44%, #130f29 76%, #0b0a1d 100%)',
    panelTitle:
      id === 'saturne' ? 'Saturne et ses anneaux' : `Les lunes de ${parent.name}`,
    panelText: parent.blurb,
    isBelt: false,
  };
}

export function ZoneView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const discovered = useProgress((s) => s.discovered);
  const discover = useProgress((s) => s.discover);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [diveTo, setDiveTo] = useState<string | null>(null);

  const config = useMemo(() => configFor(id), [id]);
  const center = config ? bodyById(config.centerId) : undefined;
  // Sous-carte d'une planète : le texte du panneau est le blurb du corps central
  // (donc adapté au mode simplifié) ; pour la ceinture, on garde le texte fixe.
  const centerBlurb = useBlurb(config && !config.isBelt ? center : null);

  const targetZone = id === 'ceinture' ? 'ceinture' : center?.zone;
  const allowed = useMemo(
    () => (targetZone ? unlockedZones(discovered).has(targetZone) : false),
    [discovered, targetZone],
  );

  useEffect(() => {
    if (!config || !allowed) navigate('/map', { replace: true });
  }, [config, allowed, navigate]);

  const rings = useMemo(() => {
    if (!config) return [];
    const radii = [
      ...new Set(config.members.map((m) => Math.round(m.orbitRadius / 8) * 8)),
    ].sort((a, b) => a - b);
    return radii.map((r, i) => ({
      radius: r,
      dashed: config.isBelt,
      width: !config.isBelt && i === Math.floor(radii.length / 2) ? 3 : 2,
      color:
        !config.isBelt && i === Math.floor(radii.length / 2)
          ? 'rgba(232,176,75,.4)'
          : ringColor(config.isBelt ? 0.15 : 0.16),
    }));
  }, [config]);

  const pins: ScenePin[] = useMemo(
    () =>
      (config?.members ?? []).map((body) => ({
        body,
        revealed: discovered.includes(body.id),
        discovered: discovered.includes(body.id),
      })),
    [config, discovered],
  );

  if (!config || !center || !allowed) return null;

  const revealedCount = config.members.filter((m) => discovered.includes(m.id)).length;
  const total = config.members.length;

  const centerSize = config.isBelt ? 64 : clamp(center.size * 2.4, 96, 176);

  const handleSelect = (body: Body) => {
    if (!diveTo) setDiveTo(body.id);
  };

  const finishDive = (bid: string) => {
    discover(bid);
    navigate(`/object/${bid}`);
  };

  return (
    <OrbitalScene
      background={config.bg}
      origin={[46, 54]}
      zoom={zoom}
      pan={pan}
      onZoom={setZoom}
      onPan={setPan}
      zoomRange={[0.5, 3]}
      rings={rings}
      centerBody={center}
      centerSize={centerSize}
      onCenterClick={() => handleSelect(center)}
      pins={pins}
      fogOpenness={0.52}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      onSelect={handleSelect}
      diveTo={diveTo}
      onDiveComplete={finishDive}
    >
      <div className={styles.breadcrumb}>
        <span className={styles.crumbRoot}>Système solaire</span>
        {!config.isBelt && (
          <>
            <span className={styles.crumbSep}>›</span>
            <span className={styles.crumbMid}>{ZONE_META[center.zone].label}</span>
          </>
        )}
        <span className={styles.crumbSep}>›</span>
        <span className={styles.crumbLeaf}>
          {config.isBelt ? "Ceinture d'astéroïdes" : center.name}
        </span>
      </div>

      <div className={styles.panel}>
        <span className={styles.panelKey}>{config.isBelt ? 'Zone' : 'Sous-système'}</span>
        <h2 className={styles.panelTitle}>{config.panelTitle}</h2>
        <p className={styles.panelText}>
          {config.isBelt ? config.panelText : centerBlurb}
        </p>
        <div className={styles.panelProgress}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${total ? (revealedCount / total) * 100 : 0}%` }}
            />
          </div>
          <span className={styles.progressCount}>
            {revealedCount}/{total}
          </span>
        </div>
      </div>

      <button type="button" className={styles.backBtn} data-nodrag onClick={() => navigate('/map')}>
        <span className={styles.backGlyph} />
        Revenir au système
      </button>

      <div className={styles.zoom} data-nodrag>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.min(z * 1.3, 3))}
          aria-label="Zoomer"
        >
          +
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.max(z / 1.3, 0.5))}
          aria-label="Dézoomer"
        >
          −
        </button>
      </div>
    </OrbitalScene>
  );
}
