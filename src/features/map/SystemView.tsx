import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RING_RADIUS, TOTAL_BODIES, bodyById, mainMapBodies } from '@/data/bodies';
import type { Body, Zone } from '@/data/types';
import { ZONE_META } from '@/data/zones';
import { useProgress, ZONE_ORDER } from '@/store/progress';
import { unlockedZones } from '@/store/selectors';
import { RINGS } from './rings';
import { ringColor } from '@/features/scene/types';
import type { OrbitalSceneProps, ScenePin } from '@/features/scene/types';
import { ActiveQuestCard } from '@/features/quests/ActiveQuestCard';
import { SearchOverlay } from '@/features/search/SearchOverlay';
import { Hud } from './Hud';
import { RealScaleView } from './RealScaleView';
import { SealedZoneCard } from './SealedZoneCard';
import { Tutorial } from './Tutorial';

// Scène 3D (react-three-fiber) — chargée en lazy : three.js reste un chunk à part.
const OrbitalScene3D = lazy(() => import('@/features/scene3d/OrbitalScene3D'));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

// Cailloux décoratifs de la ceinture (artboard `1a`).
const BELT_DOTS = [
  { a: 30, r: 348, s: 7, c: '#9b8f7e' },
  { a: 78, r: 356, s: 5, c: '#8b7f6e' },
  { a: 122, r: 344, s: 8, c: '#a89a86' },
  { a: 168, r: 358, s: 5, c: '#8b7f6e' },
  { a: 214, r: 346, s: 7, c: '#9b8f7e' },
  { a: 262, r: 354, s: 6, c: '#8b7f6e' },
  { a: 304, r: 342, s: 8, c: '#a89a86' },
  { a: 340, r: 360, s: 5, c: '#8b7f6e' },
];

const SCENE_BG =
  'radial-gradient(120% 90% at 50% 55%, #2b1f4e 0%, #1b1438 42%, #120e28 72%, #0b0a1d 100%)';

export function SystemView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const discovered = useProgress((s) => s.discovered);
  const avatarId = useProgress((s) => s.avatarId);
  const realScale = useProgress((s) => s.realScaleMode);
  const toggleRealScale = useProgress((s) => s.toggleRealScale);
  const setRealScale = useProgress((s) => s.setRealScale);
  const discover = useProgress((s) => s.discover);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sealedZone, setSealedZone] = useState<Zone | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [diveTo, setDiveTo] = useState<string | null>(null);

  const unlocked = useMemo(() => unlockedZones(discovered), [discovered]);
  const sealedCount = ZONE_ORDER.filter((z) => !unlocked.has(z)).length;
  const lastUnlocked = [...ZONE_ORDER].reverse().find((z) => unlocked.has(z)) ?? 'interne';

  const hoveredBody = bodyById(hoveredId ?? undefined);
  const zoneLabel = hoveredBody
    ? ZONE_META[hoveredBody.zone].label
    : ZONE_META[lastUnlocked].label;

  const fogOpenness = clamp(
    0.36 + ((unlocked.size - 1) / 3) * 0.4 + Math.max(0, zoom - 1) * 0.2,
    0.36,
    0.92,
  );

  // ?scale=real ouvre la vue échelle réelle
  useEffect(() => {
    if (params.get('scale') === 'real') setRealScale(true);
  }, [params, setRealScale]);

  // "/" ouvre la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !searchOpen && !/^(INPUT|TEXTAREA)$/.test(el.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const exitRealScale = () => {
    if (params.get('scale')) {
      const next = new URLSearchParams(params);
      next.delete('scale');
      setParams(next, { replace: true });
    }
    setRealScale(false);
  };

  const handleSelect = (body: Body) => {
    if (diveTo) return;
    if (!unlocked.has(body.zone)) {
      setSealedZone(body.zone);
      return;
    }
    setDiveTo(body.id);
  };

  const finishDive = (id: string) => {
    discover(id);
    navigate(`/object/${id}`);
  };

  const handleBelt = () => {
    if (!unlocked.has('ceinture')) {
      setSealedZone('ceinture');
      return;
    }
    navigate('/zone/ceinture');
  };

  const rings = useMemo(
    () =>
      RINGS.map((r) => ({
        radius: r.radius,
        dashed: r.dashed,
        width: r.width,
        color: ringColor(unlocked.has(r.zone) ? r.opacity : r.opacity * 0.5),
      })),
    [unlocked],
  );

  const pins: ScenePin[] = useMemo(
    () =>
      mainMapBodies().map((body) => ({
        body,
        revealed: unlocked.has(body.zone),
        discovered: discovered.includes(body.id),
      })),
    [unlocked, discovered],
  );

  const sun = bodyById('soleil')!;

  if (realScale) return <RealScaleView onClose={exitRealScale} />;

  const sceneProps: OrbitalSceneProps = {
    background: SCENE_BG,
    origin: [50, 55],
    zoom,
    pan,
    onZoom: setZoom,
    onPan: setPan,
    rings,
    centerBody: sun,
    centerSize: 112,
    onCenterClick: () => handleSelect(sun),
    pins,
    decorativeDots: BELT_DOTS,
    beltMarker: {
      label: "Ceinture d'astéroïdes",
      angle: 62,
      radius: RING_RADIUS.ceinture,
      locked: !unlocked.has('ceinture'),
      onClick: handleBelt,
    },
    fogOpenness,
    hoveredId,
    onHover: setHoveredId,
    onSelect: handleSelect,
    diveTo,
    onDiveComplete: finishDive,
  };

  const sceneChildren = (
    <>
      <ActiveQuestCard />
      <Tutorial />
      {sealedZone && (
        <SealedZoneCard zone={sealedZone} onClose={() => setSealedZone(null)} />
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <Hud
        discoveredCount={discovered.length}
        total={TOTAL_BODIES}
        zoneLabel={zoneLabel}
        avatarId={avatarId}
        onOpenProfile={() => navigate('/profile')}
        onOpenSearch={() => setSearchOpen(true)}
        realScale={realScale}
        onToggleRealScale={toggleRealScale}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.3, 3.2))}
        onZoomOut={() => setZoom((z) => Math.max(z / 1.3, 0.4))}
        onRecenter={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
        onOpenCodex={() => navigate('/codex')}
        onOpenQuests={() => navigate('/quests')}
        sealedZones={sealedCount}
      />
    </>
  );

  return (
    <Suspense
      fallback={
        <div style={{ position: 'fixed', inset: 0, background: '#0b0a1d' }}>{sceneChildren}</div>
      }
    >
      <OrbitalScene3D {...sceneProps}>{sceneChildren}</OrbitalScene3D>
    </Suspense>
  );
}
