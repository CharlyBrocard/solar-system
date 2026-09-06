import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import { BodySphere } from '@/components/BodySphere';
import { TYPE_LABEL } from '@/data/bodies';
import type { Body } from '@/data/types';
import {
  fogVeilGradient,
  orbitTransform,
  planeTransform,
  projectRingPoint,
  WIDE_GEOMETRY,
  COMPACT_GEOMETRY,
} from '@/features/map/geometry';
import type { SceneGeometry } from '@/features/map/geometry';
import styles from './OrbitalScene.module.css';

export interface SceneRing {
  radius: number;
  dashed?: boolean;
  color: string;
  width: number;
  highlight?: boolean;
}

export interface ScenePin {
  body: Body;
  revealed: boolean;
  discovered: boolean;
}

export interface SceneDot {
  a: number;
  r: number;
  s: number;
  c: string;
}

export interface SceneBeltMarker {
  label: string;
  angle: number;
  radius: number;
  locked: boolean;
  onClick: () => void;
}

type Pan = { x: number; y: number };

interface OrbitalSceneProps {
  background: string;
  /** ancre du plan orbital, en % du viewport */
  origin: [number, number];
  /** zoom utilisateur : 1 = cadrage par défaut */
  zoom: number;
  pan: Pan;
  onZoom: (next: number) => void;
  onPan: (next: Pan) => void;
  zoomRange?: [number, number];
  rings: SceneRing[];
  centerBody?: Body;
  centerSize?: number;
  onCenterClick?: () => void;
  pins: ScenePin[];
  decorativeDots?: SceneDot[];
  beltMarker?: SceneBeltMarker;
  /** 0 = brume serrée, 1 = dégagé */
  fogOpenness: number;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (b: Body) => void;
  /** false = décor : ni molette ni glisser (écran d'entrée). */
  interactive?: boolean;
  /** false = fige la dérive orbitale. */
  drift?: boolean;
  /** id d'un corps vers lequel « plonger » : anime (zoom + fondu) puis `onDiveComplete`. */
  diveTo?: string | null;
  onDiveComplete?: (bodyId: string) => void;
  children?: ReactNode;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

// Dérive orbitale : lente, plus rapide vers l'intérieur (façon Kepler, très adouci).
const DRIFT_DEG_PER_SEC = 1.3;
const DRIFT_REF_RADIUS = 300;
const driftSpeed = (radius: number) =>
  Math.pow(DRIFT_REF_RADIUS / Math.max(radius, 90), 0.62);

function usePrefersReducedMotion() {
  return useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );
}

/** Angle courant d'un corps, dérive comprise (RAF throttlé à ~20 Hz). */
function useOrbitalDrift(active: boolean) {
  const [deg, setDeg] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const tick = (t: number) => {
      if (last) {
        const dt = Math.min((t - last) / 1000, 0.1);
        ref.current += dt * DRIFT_DEG_PER_SEC;
        acc += dt;
        if (acc >= 0.05) {
          setDeg(ref.current);
          acc = 0;
        }
      }
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return deg;
}

// En dessous de cette largeur, on passe à la géométrie mobile (`2b`).
const COMPACT_MAX_WIDTH = 720;

function useSceneFit(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ fit: 1, compact: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const compact = width > 0 && width <= COMPACT_MAX_WIDTH;
      // compact : rayons déjà ÷1,6, on remonte le facteur pour garder un disque lisible.
      const fit = compact
        ? clamp(Math.min(width, height) / 390, 0.72, 1.16)
        : clamp(Math.min(width, height) / 850, 0.42, 1.2);
      setState((s) => (s.fit === fit && s.compact === compact ? s : { fit, compact }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return state;
}

const metaFor = (body: Body, discovered: boolean) =>
  `${body.parent ? 'Lune' : TYPE_LABEL[body.type]} · ${discovered ? 'découvert' : 'à visiter'}`;

interface PinViewProps {
  pin: ScenePin;
  isCenter: boolean;
  /** angle courant (dérive comprise) ; ignoré si `isCenter` */
  angle: number;
  geometry: SceneGeometry;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (b: Body) => void;
  onCenterClick?: () => void;
}

const PinView = memo(function PinView({
  pin,
  isCenter,
  angle,
  geometry,
  hovered,
  onHover,
  onSelect,
  onCenterClick,
}: PinViewProps) {
  const { body, revealed, discovered } = pin;
  const p = isCenter
    ? { x: 0, y: 0, z: 0, scale: 1 }
    : projectRingPoint(angle, body.orbitRadius, geometry);
  const d = body.size * (isCenter ? 1 : 0.72 + 0.28 * p.scale);

  return (
    <div className={styles.pin} style={{ left: p.x, top: p.y, zIndex: 1000 + Math.round(p.z) }}>
      {hovered && !isCenter && (
        <div
          className={styles.selectRing}
          style={{ left: -d * 1.15, top: -d * 0.5, width: d * 2.3, height: d * 0.92 }}
        />
      )}
      <button
        type="button"
        data-nodrag
        className={styles.hit}
        style={{
          width: Math.max(d, 30),
          height: Math.max(d, 30),
          transform: isCenter ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={() => onHover(body.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(body.id)}
        onBlur={() => onHover(null)}
        onClick={() => (isCenter ? onCenterClick?.() : onSelect(body))}
        aria-label={revealed ? body.name : 'Objet non révélé — zone scellée'}
      >
        <BodySphere body={body} size={d} silhouette={!revealed} />
      </button>

      {hovered && (
        <div
          className={styles.label}
          style={{
            transform: `translate(-50%, calc(-100% - ${isCenter ? d / 2 + 10 : d + 8}px))`,
          }}
        >
          <span className={styles.labelName}>{revealed ? body.name : '???'}</span>
          <span className={styles.labelMeta}>
            {revealed ? metaFor(body, discovered) : 'Zone scellée'}
          </span>
        </div>
      )}
    </div>
  );
});

export function OrbitalScene({
  background,
  origin,
  zoom,
  pan,
  onZoom,
  onPan,
  zoomRange = [0.3, 3.2],
  rings,
  centerBody,
  centerSize = 96,
  onCenterClick,
  pins,
  decorativeDots = [],
  beltMarker,
  fogOpenness,
  hoveredId,
  onHover,
  onSelect,
  interactive = true,
  drift = true,
  diveTo = null,
  onDiveComplete,
  children,
}: OrbitalSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { fit: baseFit, compact } = useSceneFit(viewportRef);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const geometry = compact ? COMPACT_GEOMETRY : WIDE_GEOMETRY;
  const worldScale = baseFit * zoom;

  // Dérive orbitale : en pause pendant un glisser ou un survol (pour viser).
  const driftActive = drift && !reducedMotion && !dragging && hoveredId === null;
  const driftDeg = useOrbitalDrift(driftActive);
  const angleOf = useCallback(
    (b: { orbitAngle: number; orbitRadius: number }) =>
      b.orbitAngle - driftDeg * driftSpeed(b.orbitRadius),
    [driftDeg],
  );

  const drag = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(
    null,
  );

  const originPx = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      x: (rect?.width ?? 0) * (origin[0] / 100),
      y: (rect?.height ?? 0) * (origin[1] / 100),
      rect,
    };
  }, [origin]);

  const clampPan = useCallback((p: Pan): Pan => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const mx = (rect?.width ?? 800) * 0.9;
    const my = (rect?.height ?? 600) * 0.9;
    return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || diveTo) return;
    if ((e.target as HTMLElement).closest('button, a, [data-nodrag]')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
      if (d.moved) onPan(clampPan({ x: d.px + dx, y: d.py + dy }));
    };
    const up = () => {
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, onPan, clampPan]);

  // molette : zoom vers le curseur
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (diveTo) return;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const nextZoom = clamp(zoom * factor, zoomRange[0], zoomRange[1]);
      if (nextZoom === zoom) return;

      const { x: ox, y: oy, rect } = originPx();
      if (!rect) {
        onZoom(nextZoom);
        return;
      }
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const before = baseFit * zoom;
      const after = baseFit * nextZoom;
      const wx = (cx - ox - pan.x) / before;
      const wy = (cy - oy - pan.y) / before;
      onPan(clampPan({ x: cx - ox - wx * after, y: cy - oy - wy * after }));
      onZoom(nextZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive, diveTo, zoom, pan, baseFit, zoomRange, onZoom, onPan, originPx, clampPan]);

  // « Plongée » : au clic sur un astre, la scène accélère vers lui et un voile de
  // sa couleur monte, puis le parent navigue (`onDiveComplete`). On fige la cible
  // au déclenchement — inutile de la suivre pendant l'animation.
  const [dive, setDive] = useState<
    { x: number; y: number; color: string; running: boolean } | null
  >(null);

  useEffect(() => {
    if (!diveTo) {
      setDive(null);
      return;
    }
    const rect = viewportRef.current?.getBoundingClientRect();
    const target =
      (centerBody && centerBody.id === diveTo ? centerBody : undefined) ??
      pins.find((p) => p.body.id === diveTo)?.body;

    if (!rect || !target) {
      onDiveComplete?.(diveTo);
      return;
    }

    const isCenter = centerBody?.id === diveTo;
    const proj = isCenter
      ? { x: 0, y: 0 }
      : projectRingPoint(angleOf(target), target.orbitRadius, geometry);
    const x = rect.width * (origin[0] / 100) + pan.x + proj.x * worldScale;
    const y = rect.height * (origin[1] / 100) + pan.y + proj.y * worldScale;
    const color = target.gradient[1] ?? target.gradient[0];

    if (reducedMotion) {
      onDiveComplete?.(diveTo);
      return;
    }

    setDive({ x, y, color, running: false });
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setDive((d) => (d ? { ...d, running: true } : d)),
      ),
    );
    const done = window.setTimeout(() => onDiveComplete?.(diveTo), 620);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
    // cible figée au déclenchement : on ne dépend que de `diveTo`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveTo]);

  const fogVeil = useMemo(
    () => fogVeilGradient(origin[0], origin[1], fogOpenness, geometry.fogTighten),
    [origin, fogOpenness, geometry],
  );

  const rs = geometry.radiusScale;
  const maxRing = useMemo(
    () => (Math.max(...rings.map((r) => r.radius), 1) + 10) * rs,
    [rings, rs],
  );

  const centerPin: ScenePin | null = centerBody
    ? { body: centerBody, revealed: true, discovered: true }
    : null;

  return (
    <div
      className={styles.viewport}
      ref={viewportRef}
      data-dragging={dragging ? 'true' : undefined}
      data-static={interactive ? undefined : 'true'}
      style={{ ['--scene-bg' as string]: background }}
      onPointerDown={onPointerDown}
    >
      <div
        className={styles.diveWrap}
        data-diving={dive?.running ? 'true' : undefined}
        style={
          dive
            ? {
                transformOrigin: `${dive.x}px ${dive.y}px`,
                transform: dive.running ? 'scale(2.5)' : 'scale(1)',
              }
            : undefined
        }
      >
      {/* fond stellaire — ne suit pas le zoom */}
      <div
        className={styles.starfield}
        style={{
          transform: `translate(${pan.x * -0.09}px, ${pan.y * -0.09}px) scale(${
            1 + (zoom - 1) * 0.035
          })`,
        }}
      >
        <div
          className={styles.nebula}
          style={{
            left: '2%',
            top: '-8%',
            width: '46%',
            height: '52%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(190,74,120,.42), rgba(190,74,120,0) 66%)',
          }}
        />
        <div
          className={styles.nebula}
          style={{
            right: '-6%',
            top: '4%',
            width: '44%',
            height: '48%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(226,148,60,.36), rgba(226,148,60,0) 66%)',
          }}
        />
        <div
          className={styles.nebula}
          style={{
            left: '30%',
            bottom: '-18%',
            width: '60%',
            height: '46%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(96,72,190,.4), rgba(96,72,190,0) 68%)',
          }}
        />
        <div className={styles.stars} />
        <div className={styles.starsB} />
      </div>

      {/* le monde — seul à suivre le zoom */}
      <div
        className={styles.world}
        data-animated={dragging ? undefined : 'true'}
        style={{
          left: `${origin[0]}%`,
          top: `${origin[1]}%`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${worldScale})`,
        }}
      >
        <div className={styles.planeAnchor} style={{ perspective: geometry.perspective }}>
          <div className={styles.plane} style={{ transform: planeTransform(geometry) }}>
            <svg
              className={styles.rings}
              width={maxRing * 2}
              height={maxRing * 2}
              viewBox={`0 0 ${maxRing * 2} ${maxRing * 2}`}
              style={{ left: -maxRing, top: -maxRing }}
              aria-hidden
            >
              {rings.map((r) => (
                <circle
                  key={r.radius}
                  cx={maxRing}
                  cy={maxRing}
                  r={r.radius * rs}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={r.width}
                  strokeDasharray={r.dashed ? '2 8' : undefined}
                />
              ))}
            </svg>

            {centerBody?.type === 'star' && (
              <div
                className={styles.centerGlow}
                style={{
                  left: -centerSize * 2.6,
                  top: -centerSize * 2.6,
                  width: centerSize * 5.2,
                  height: centerSize * 5.2,
                }}
              />
            )}

            {pins
              .filter((p) => p.revealed)
              .map((p) => (
                <div
                  key={`sh-${p.body.id}`}
                  className={styles.orbitNode}
                  style={{ transform: orbitTransform(angleOf(p.body), p.body.orbitRadius, geometry) }}
                >
                  <div
                    className={styles.shadow}
                    style={{
                      left: -p.body.size * 0.7,
                      top: -p.body.size * 0.15,
                      width: p.body.size * 1.4,
                      height: p.body.size * 0.4,
                    }}
                  />
                </div>
              ))}

            {decorativeDots.map((dot, i) => (
              <div
                key={i}
                className={styles.orbitNode}
                style={{ transform: orbitTransform(angleOf({ orbitAngle: dot.a, orbitRadius: dot.r }), dot.r, geometry) }}
              >
                <div
                  className={styles.beltDot}
                  style={{
                    left: -dot.s / 2,
                    top: -dot.s / 2,
                    width: dot.s,
                    height: dot.s,
                    background: dot.c,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.pinLayer}>
          {centerPin && (
            <PinView
              pin={centerPin}
              isCenter
              angle={0}
              geometry={geometry}
              hovered={false}
              onHover={onHover}
              onSelect={onSelect}
              onCenterClick={onCenterClick}
            />
          )}

          {beltMarker && (
            <BeltMarkerView
              marker={beltMarker}
              angle={angleOf({ orbitAngle: beltMarker.angle, orbitRadius: beltMarker.radius })}
              geometry={geometry}
            />
          )}

          {pins.map((p) => (
            <PinView
              key={p.body.id}
              pin={p}
              isCenter={false}
              angle={angleOf(p.body)}
              geometry={geometry}
              hovered={hoveredId === p.body.id}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

        {/* atmosphère — voile de brume plein écran */}
        <div className={styles.fogVeil} style={{ background: fogVeil }} />
      </div>

      {children}

      {dive && (
        <div
          className={styles.diveVeil}
          data-on={dive.running ? 'true' : undefined}
          style={{
            // lueur douce autour de l'astre + fermeture sombre depuis les bords
            // (le sombre masque la bascule vers la fiche sans agresser l'œil)
            background: `radial-gradient(circle at ${dive.x}px ${dive.y}px, ${dive.color}4d 0%, ${dive.color}1f 20%, rgba(11,10,29,0) 40%), radial-gradient(circle at ${dive.x}px ${dive.y}px, rgba(11,10,29,0) 26%, rgba(11,10,29,0.55) 68%, rgba(11,10,29,0.96) 100%)`,
          }}
        />
      )}
    </div>
  );
}

function BeltMarkerView({
  marker,
  angle,
  geometry,
}: {
  marker: SceneBeltMarker;
  angle: number;
  geometry: SceneGeometry;
}) {
  const p = projectRingPoint(angle, marker.radius, geometry);
  return (
    <div className={styles.pin} style={{ left: p.x, top: p.y, zIndex: 1000 + Math.round(p.z) }}>
      <button
        type="button"
        data-nodrag
        className={styles.beltMarker}
        data-locked={marker.locked ? 'true' : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={marker.onClick}
      >
        {marker.label}
      </button>
    </div>
  );
}

export type { OrbitalSceneProps };

/** Couleur d'anneau crème translucide. */
export function ringColor(opacity: number): string {
  return `rgba(246, 235, 214, ${opacity})`;
}
