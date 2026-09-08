import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Line, OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import type { Body } from '@/data/types';
import type { OrbitalSceneProps } from '@/features/scene/types';
import {
  backdropTexture,
  bandedTexture,
  bodyNormalMap,
  radialSprite,
  ringTexture,
  sunTexture,
  terrainTexture,
} from './materials';
import { AtmosphereRim } from './AtmosphereRim';
import { SunMaterial } from './SunSurface';
import {
  alphaOf,
  ATMOSPHERE,
  DRIFT_DEG_PER_SEC,
  ELEVATION_DEG,
  ORBIT_SCALE,
  orbitPosition,
  prefersReducedMotion,
  SIZE_SCALE,
  worldRadius,
} from './scene3d';
import { useQuality, type QualitySettings, type QualityTier } from './quality';
import { ShipMesh, shipBanks } from './Ship3D';
import { shipDef } from '@/components/Ship';
import { useProgress } from '@/store/progress';
import styles from './OrbitalScene3D.module.css';

// une seule fois par session : le mode « Auto » qui a détecté une scène qui rame
let perfProbed = false;

/**
 * Sonde de performance : sur les ~4 premières secondes de scène, si le mode est
 * « Auto » et que ça rame (framerate moyen bas ou beaucoup de frames lentes),
 * on descend d'un palier de qualité. Ne remonte jamais, une fois par session.
 */
function PerfProbe({ tier }: { tier: QualityTier }) {
  const graphics = useProgress((s) => s.prefs?.graphics);
  const setCap = useProgress((s) => s.setPerfTierCap);
  const acc = useRef({ frames: 0, time: 0, slow: 0 });

  useFrame((_, dt) => {
    if (perfProbed || graphics !== 'auto' || tier === 'bas') return;
    const a = acc.current;
    // on ignore la première demi-seconde (montage + compilation des shaders)
    if (a.time < 0.5) {
      a.time += dt;
      return;
    }
    a.frames += 1;
    a.time += dt;
    if (dt > 1 / 45) a.slow += 1;

    if ((a.time >= 4.5 && a.frames >= 8) || a.time >= 9) {
      perfProbed = true;
      const avgFps = a.frames / Math.max(0.1, a.time - 0.5);
      const slowRatio = a.slow / a.frames;
      if (import.meta.env.DEV)
        console.info('[perf]', { tier, avgFps: Math.round(avgFps), slowRatio: +slowRatio.toFixed(2) });
      if (avgFps < 45 || slowRatio > 0.35) {
        setCap(tier === 'eleve' ? 'moyen' : 'bas');
      }
    }
  });

  return null;
}

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;
type DriftRef = MutableRefObject<number>;

/* ── fond ─────────────────────────────────────────────────────────────── */

function Backdrop() {
  const tex = useMemo(backdropTexture, []);
  return (
    <mesh scale={620}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* ── astre central ────────────────────────────────────────────────────── */

function CenterBody({
  body,
  radius,
  reduced,
  segMax,
  normalMaps,
  sunShader,
  sunOctaves,
  onClick,
}: {
  body: Body;
  radius: number;
  reduced: boolean;
  segMax: number;
  normalMaps: boolean;
  sunShader: boolean;
  sunOctaves: number;
  onClick?: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const isStar = body.type === 'star';
  const glowCore = useMemo(
    () =>
      radialSprite('sun-core', [
        [0, 'rgba(255,236,186,0.8)'],
        [0.2, 'rgba(255,196,114,0.4)'],
        [0.46, 'rgba(255,158,80,0.1)'],
        [1, 'rgba(255,150,60,0)'],
      ]),
    [],
  );
  const glowWide = useMemo(
    () =>
      radialSprite('sun-wide', [
        [0, 'rgba(255,178,108,0.1)'],
        [0.45, 'rgba(240,138,68,0.03)'],
        [1, 'rgba(240,138,68,0)'],
      ]),
    [],
  );
  const map = useMemo(
    () =>
      isStar ? sunTexture() : body.banded ? bandedTexture(body) : terrainTexture(body),
    [isStar, body],
  );
  const normalMap = useMemo(
    () => (!isStar && normalMaps ? bodyNormalMap(body) : null),
    [isStar, normalMaps, body],
  );
  const normalScale = useMemo(
    () => new THREE.Vector2(body.banded ? 0.3 : 0.6, body.banded ? 0.3 : 0.6),
    [body.banded],
  );

  useFrame((_, dt) => {
    if (mesh.current && !reduced) mesh.current.rotation.y += dt * (isStar ? 0.02 : 0.05);
  });

  const pointer = onClick
    ? {
        onPointerOver: (e: THREE.Event) => {
          (e as unknown as { stopPropagation: () => void }).stopPropagation();
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          document.body.style.cursor = 'auto';
        },
        onClick: () => onClick(),
      }
    : {};

  const seg = Math.max(24, segMax);

  return (
    <group>
      <mesh ref={mesh} {...pointer} castShadow={!isStar} receiveShadow={!isStar}>
        <sphereGeometry args={[radius, seg, seg]} />
        {isStar ? (
          sunShader ? (
            <SunMaterial reduced={reduced} octaves={sunOctaves} intensity={1.9} />
          ) : (
            <meshBasicMaterial map={map} color={[2.1, 1.55, 0.85]} toneMapped={false} />
          )
        ) : (
          <meshStandardMaterial
            map={map}
            normalMap={normalMap ?? undefined}
            normalScale={normalScale}
            color={body.banded ? '#ffffff' : '#f4f1ea'}
            roughness={0.85}
            metalness={0}
            emissive={body.gradient[1]}
            emissiveIntensity={0.16}
          />
        )}
      </mesh>

      {body.rings && <PlanetRings radius={radius} />}

      {isStar && (
        <>
          <sprite scale={[radius * 5.5, radius * 5.5, 1]}>
            <spriteMaterial
              map={glowCore}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <sprite scale={[radius * 11, radius * 11, 1]}>
            <spriteMaterial
              map={glowWide}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <pointLight intensity={680} decay={1.5} color="#fff1d6" />
        </>
      )}
    </group>
  );
}

/* ── planète / lune ───────────────────────────────────────────────────── */

function Pin({
  body,
  revealed,
  driftRef,
  hovered,
  reduced,
  segMax,
  normalMaps,
  onHover,
  onSelect,
}: {
  body: Body;
  revealed: boolean;
  driftRef: DriftRef;
  hovered: boolean;
  reduced: boolean;
  segMax: number;
  normalMaps: boolean;
  onHover: (id: string | null) => void;
  onSelect: (b: Body) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const radius = worldRadius(body.size, 0.45, 5.4);
  // segments proportionnels à la taille (plafonnés par la qualité) : les petites
  // naines lointaines restent légères.
  const segs = THREE.MathUtils.clamp(Math.round(radius * 9), 12, segMax);
  const banded = !!body.banded;
  const atmosphere = ATMOSPHERE[body.id];
  const map = useMemo(
    () => (revealed ? (banded ? bandedTexture(body) : terrainTexture(body)) : null),
    [revealed, banded, body],
  );
  const normalMap = useMemo(
    () => (revealed && normalMaps ? bodyNormalMap(body) : null),
    [revealed, normalMaps, body],
  );
  const normalScale = useMemo(
    () => new THREE.Vector2(banded ? 0.35 : 0.7, banded ? 0.35 : 0.7),
    [banded],
  );
  const spin = useMemo(() => 0.1 + (body.size % 7) * 0.035, [body.size]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const sealedGlow = useMemo(
    () =>
      radialSprite('sealed', [
        [0, 'rgba(150,134,228,0.5)'],
        [0.4, 'rgba(120,105,205,0.14)'],
        [1, 'rgba(120,105,205,0)'],
      ]),
    [],
  );

  useFrame((_, dt) => {
    if (group.current) {
      orbitPosition(body, driftRef.current, tmp);
      group.current.position.copy(tmp);
    }
    if (mesh.current && revealed && !reduced) mesh.current.rotation.y += dt * spin;
  });

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        castShadow={revealed}
        receiveShadow={revealed}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(body.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(body);
        }}
      >
        <sphereGeometry args={[radius, segs, segs]} />
        {revealed ? (
          <meshStandardMaterial
            map={map ?? undefined}
            normalMap={normalMap ?? undefined}
            normalScale={normalScale}
            color={banded ? '#ffffff' : '#f4f1ea'}
            roughness={0.85}
            metalness={0}
            emissive={body.gradient[1]}
            emissiveIntensity={0.16}
          />
        ) : (
          <meshStandardMaterial
            color="#4a3f7d"
            roughness={1}
            metalness={0}
            emissive="#5646a0"
            emissiveIntensity={0.5}
          />
        )}
      </mesh>

      {!revealed && (
        <>
          {/* bille scellée : orbe violet doux, voilé par la brume — pas un anneau */}
          <mesh scale={1.08}>
            <sphereGeometry args={[radius, 20, 20]} />
            <meshBasicMaterial
              color="#c3b6ec"
              transparent
              opacity={0.14}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
          <sprite scale={[radius * 3.4, radius * 3.4, 1]}>
            <spriteMaterial
              map={sealedGlow}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </>
      )}

      {body.rings && revealed && <PlanetRings radius={radius} />}

      {revealed && atmosphere && (
        <AtmosphereRim color={atmosphere} radius={radius} scale={1.03} intensity={0.5} />
      )}

      {hovered && (
        <Billboard>
          <mesh>
            <ringGeometry args={[radius * 1.42, radius * 1.58, 64]} />
            <meshBasicMaterial color="#e8b04b" transparent opacity={0.95} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[radius * 1.58, radius * 2, 64]} />
            <meshBasicMaterial color="#e8b04b" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

function PlanetRings({ radius }: { radius: number }) {
  const tex = useMemo(ringTexture, []);
  const geom = useMemo(() => {
    const inner = radius * 1.38;
    const outer = radius * 2.35;
    const g = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setX(i, (v.length() - inner) / (outer - inner));
    }
    uv.needsUpdate = true;
    return g;
  }, [radius]);
  // profondeur alpha-testée → l'ombre portée a la forme de l'anneau
  const depthMat = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: tex,
        alphaTest: 0.4,
      }),
    [tex],
  );
  return (
    <mesh
      geometry={geom}
      rotation={[-Math.PI / 2.25, 0, 0.26]}
      castShadow
      receiveShadow
      customDepthMaterial={depthMat}
    >
      <meshBasicMaterial
        map={tex}
        color="#e6d4b0"
        transparent
        opacity={0.82}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── anneaux d'orbite ─────────────────────────────────────────────────── */

function OrbitRing3D({
  radius,
  color,
  dashed,
  highlight,
}: {
  radius: number;
  color: string;
  dashed?: boolean;
  highlight?: boolean;
}) {
  const r = radius * ORBIT_SCALE;
  const opacity = Math.min(0.85, alphaOf(color, 0.12) * (highlight ? 2.6 : 1.5));
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    return pts;
  }, [r]);
  return (
    <Line
      points={points}
      color={highlight ? '#e8b04b' : '#f6ebd6'}
      lineWidth={highlight ? 1.6 : 1}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={1.6}
      gapSize={2.6}
      depthWrite={false}
      toneMapped={false}
    />
  );
}

/* ── cailloux de la ceinture ──────────────────────────────────────────── */

function BeltDots({
  dots,
  driftRef,
  count,
}: {
  dots: NonNullable<OrbitalSceneProps['decorativeDots']>;
  driftRef: DriftRef;
  count: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // On étoffe les quelques cailloux fournis en un vrai champ d'astéroïdes :
  // même plage de rayons + même palette, dispersion déterministe.
  const rocks = useMemo(() => {
    if (!dots.length) return [];
    const rs = dots.map((d) => d.r);
    const rMin = Math.min(...rs) - 12;
    const rMax = Math.max(...rs) + 14;
    const palette = dots.map((d) => new THREE.Color(d.c));
    let seed = 0x9e3779b9;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      r: rMin + (rMax - rMin) * Math.sqrt(rnd()),
      a: rnd() * 360,
      y: (rnd() - 0.5) * 2.2,
      s: Math.max(0.11, (0.5 + rnd() * rnd() * 3.4) * SIZE_SCALE * 1.4),
      col: palette[Math.floor(rnd() * palette.length)],
      rx: rnd() * 6,
      ry: rnd() * 6,
      rz: rnd() * 6,
      spin: 0.2 + rnd() * 0.9,
    }));
  }, [dots, count]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    rocks.forEach((rock, i) => m.setColorAt(i, rock.col));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [rocks]);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = driftRef.current;
    rocks.forEach((rock, i) => {
      orbitPosition({ orbitRadius: rock.r, orbitAngle: rock.a }, t, tmp);
      dummy.position.set(tmp.x, rock.y, tmp.z);
      dummy.rotation.set(rock.rx + t * 0.006 * rock.spin, rock.ry + t * 0.006 * rock.spin, rock.rz);
      dummy.scale.setScalar(rock.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rocks.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} metalness={0} flatShading />
    </instancedMesh>
  );
}

/* ── marqueur ceinture ────────────────────────────────────────────────── */

function BeltMarker3D({ marker }: { marker: NonNullable<OrbitalSceneProps['beltMarker']> }) {
  const group = useRef<THREE.Group>(null);
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();
  const [hot, setHot] = useState(false);
  const r = marker.radius * ORBIT_SCALE;
  // écran étroit : label court pour ne pas empiéter sur le Soleil
  const label = size.width < 560 ? marker.label.split(' ')[0] : marker.label;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // le label se pose sur la ceinture : on cherche le point (angle × rayon) qui
    // reste dans le cadre en priorité, et le plus loin possible du Soleil ensuite.
    // Le balayage en rayon rattrape les cadrages serrés (mobile) où le bord de
    // l'anneau sort de l'écran.
    // on vise l'espace libre sous le Soleil : le point de la ceinture le plus bas
    // à l'écran, sans sortir du cadre ni empiéter horizontalement sur le centre.
    let bestX = r;
    let bestZ = 0;
    let bestScore = -Infinity;
    for (const rf of [1, 0.86, 0.72]) {
      const rr = r * rf;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
        ndc.set(Math.cos(a) * rr, 1.2, Math.sin(a) * rr).project(camera);
        if (ndc.z >= 1) continue;
        const score =
          -ndc.y -
          Math.max(0, Math.abs(ndc.x) - 0.5) * 22 -
          Math.max(0, -ndc.y - 0.72) * 22 -
          (1 - rf) * 0.3;
        if (score > bestScore) {
          bestScore = score;
          bestX = Math.cos(a) * rr;
          bestZ = Math.sin(a) * rr;
        }
      }
    }
    g.position.set(bestX, 1.2, bestZ);
  });

  return (
    <>
      {/* anneau invisible cliquable : cible fiable quel que soit le cadrage */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          marker.onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHot(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHot(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <ringGeometry args={[r - 1, r + 1, 96]} />
        <meshBasicMaterial
          color="#e8b04b"
          transparent
          opacity={hot ? 0.16 : 0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <group ref={group}>
        <Html center zIndexRange={[16, 0]}>
          <button
            type="button"
            className={styles.beltMarker}
            data-locked={marker.locked ? 'true' : undefined}
            data-hot={hot ? 'true' : undefined}
            onClick={marker.onClick}
          >
            {label}
          </button>
        </Html>
      </group>
    </>
  );
}

/* ── label de survol ──────────────────────────────────────────────────── */

function HoverLabel({
  body,
  revealed,
  discovered,
  driftRef,
}: {
  body: Body;
  revealed: boolean;
  discovered: boolean;
  driftRef: DriftRef;
}) {
  const group = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const radius = worldRadius(body.size, 0.45, 5.4);
  useFrame(() => {
    if (group.current) {
      orbitPosition(body, driftRef.current, tmp);
      group.current.position.copy(tmp);
    }
  });
  return (
    <group ref={group}>
      <Html center position={[0, radius + 2.6, 0]} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className={styles.label}>
          <span className={styles.labelName}>{revealed ? body.name : '???'}</span>
          <span className={styles.labelMeta}>
            {revealed ? (discovered ? 'découvert' : 'à visiter') : 'zone scellée'}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── caméra : cadrage + réconciliation du zoom ────────────────────────── */

function CameraRig({
  sceneRadius,
  zoom,
  zoomRange,
  interactive,
  diving,
  reduced,
  recenterKey,
  controls,
}: {
  sceneRadius: number;
  zoom: number;
  zoomRange: [number, number];
  interactive: boolean;
  diving: boolean;
  reduced: boolean;
  recenterKey: boolean;
  controls: React.RefObject<OrbitControlsRef>;
}) {
  const { camera, size } = useThree();
  const fitDist = useRef(sceneRadius * 3);
  const targetDist = useRef(sceneRadius * 3);
  const defaultElev = useRef(THREE.MathUtils.degToRad(ELEVATION_DEG));
  const targetAzim = useRef<number | null>(null);
  const targetPolar = useRef<number | null>(null);

  // (re)cadre au montage et au redimensionnement
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    cam.fov = portrait ? THREE.MathUtils.clamp(96 - aspect * 34, 60, 84) : 44;
    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const elev = THREE.MathUtils.degToRad(portrait ? 46 : ELEVATION_DEG);

    let d: number;
    if (portrait) {
      // le disque orbital est fortement écrasé par la projection : cadrer sur sa
      // largeur laisse le viewport à moitié vide en hauteur. On cadre donc sur sa
      // hauteur écran (≈ rayon · sin(élévation)) et on laisse les orbites externes
      // déborder sur les côtés — le pincé-zoom permet de reculer.
      const inner = sceneRadius * 0.62;
      d = (inner * Math.sin(elev)) / (0.7 * Math.tan(vFov / 2));
    } else {
      // mode décor (écran d'entrée) : cadrage fixe et généreux, on ignore `zoom`
      const fill = !interactive ? 0.58 : 0.77;
      d = sceneRadius / (fill * Math.tan(hFov / 2));
    }
    fitDist.current = d;
    targetDist.current = interactive ? d / zoom : d;
    cam.near = Math.max(0.3, d * 0.015);
    cam.far = d * 5 + 800;
    cam.updateProjectionMatrix();

    defaultElev.current = elev;
    cam.position.set(0, Math.sin(elev) * targetDist.current, Math.cos(elev) * targetDist.current);
    const c = controls.current;
    if (c) {
      // portrait : viser légèrement devant le centre → le disque bascule vers le
      // haut et se pose au milieu du viewport laissé libre par le HUD.
      c.target.set(
        0,
        portrait ? -sceneRadius * 0.04 : 0,
        portrait ? sceneRadius * 0.12 : 0,
      );
      c.minDistance = d / zoomRange[1];
      c.maxDistance = d / zoomRange[0];
      c.update();
    } else {
      cam.lookAt(0, 0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size, sceneRadius]);

  // le zoom du parent (+/- du HUD, recentrage) pilote la distance cible
  useEffect(() => {
    if (!interactive) return;
    targetDist.current = THREE.MathUtils.clamp(
      fitDist.current / zoom,
      fitDist.current / zoomRange[1],
      fitDist.current / zoomRange[0],
    );
  }, [zoom, zoomRange, interactive]);

  // recentrage (bouton du HUD) → on ramène aussi l'orbite caméra au défaut
  useEffect(() => {
    if (recenterKey) {
      targetAzim.current = 0;
      targetPolar.current = defaultElev.current;
    }
  }, [recenterKey]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || diving) return; // pendant la plongée, DiveController pilote la caméra

    const cur = c.getDistance();
    const next = THREE.MathUtils.damp(cur, targetDist.current, 6, dt);
    if (Math.abs(next - cur) > 0.01) {
      const dir = camera.position.clone().sub(c.target).normalize();
      camera.position.copy(c.target).addScaledVector(dir, next);
    }

    if (targetAzim.current !== null) {
      const a = THREE.MathUtils.damp(c.getAzimuthalAngle(), targetAzim.current, 5, dt);
      const p = THREE.MathUtils.damp(c.getPolarAngle(), targetPolar.current!, 5, dt);
      c.setAzimuthalAngle(a);
      c.setPolarAngle(p);
      if (
        Math.abs(a - targetAzim.current) < 0.002 &&
        Math.abs(p - targetPolar.current!) < 0.002
      ) {
        targetAzim.current = null;
        targetPolar.current = null;
      }
    }

    if (!interactive && !reduced) {
      c.setAzimuthalAngle(c.getAzimuthalAngle() + dt * 0.03);
    }
    c.update();
  });

  return null;
}

/* ── plongée ──────────────────────────────────────────────────────────── */

/**
 * Le vaisseau de l'explorateur file jusqu'à l'astre cliqué avant la plongée
 * caméra. Trajectoire = arc de Bézier depuis le bord du cadre ; le nez pointe
 * dans la direction. `prefers-reduced-motion` → on saute droit à la plongée.
 */
function ShipTravel({
  diveTo,
  pins,
  centerBody,
  driftRef,
  avatarId,
  onArrived,
}: {
  diveTo: string | null;
  pins: OrbitalSceneProps['pins'];
  centerBody?: Body;
  driftRef: DriftRef;
  avatarId: number;
  onArrived: () => void;
}) {
  const { camera } = useThree();
  const holder = useRef<THREE.Group>(null);
  const trip = useRef<{ curve: THREE.QuadraticBezierCurve3; t: number; dur: number } | null>(null);
  const [linePts, setLinePts] = useState<THREE.Vector3[] | null>(null);

  const accent = useMemo(() => shipDef(avatarId).accent, [avatarId]);
  // sprite blanc, teinté à la couleur du vaisseau par le matériau
  const engineGlow = useMemo(
    () =>
      radialSprite('ship-engine', [
        [0, 'rgba(255,255,255,0.9)'],
        [0.4, 'rgba(255,255,255,0.28)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    [],
  );

  useEffect(() => {
    if (!diveTo) {
      trip.current = null;
      setLinePts(null);
      return;
    }
    const target =
      centerBody?.id === diveTo
        ? centerBody
        : pins.find((p) => p.body.id === diveTo)?.body;
    // clic sur l'astre central, ou mouvement réduit : pas de voyage, on plonge
    if (!target || target.id === centerBody?.id || prefersReducedMotion()) {
      onArrived();
      return;
    }

    const dest = orbitPosition(target, driftRef.current, new THREE.Vector3());
    const targetR = worldRadius(target.size, 0.45, 5.4);
    const destLen = dest.length() || 8;

    // direction vers la caméra (pour sortir l'arc du plan des orbites)
    const toCam = camera.getWorldDirection(new THREE.Vector3()).negate();

    // départ : ~un quart du chemin, nettement soulevé vers la caméra → le
    // vaisseau apparaît en plein espace, pas noyé dans le halo du Soleil
    const start = dest
      .clone()
      .multiplyScalar(0.28)
      .addScaledVector(toCam, destLen * 0.4 + 6);
    // point de contrôle : à mi-chemin, soulevé → arc bombé au-dessus du plan
    const ctrl = start
      .clone()
      .lerp(dest, 0.5)
      .addScaledVector(toCam, destLen * 0.35 + 5);
    // on s'arrête juste devant l'astre
    const arrive = dest
      .clone()
      .addScaledVector(dest.clone().sub(start).normalize(), -Math.max(targetR * 2, 2.5));

    const curve = new THREE.QuadraticBezierCurve3(start, ctrl, arrive);
    trip.current = { curve, t: 0, dur: 0.9 };
    setLinePts(curve.getPoints(48));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveTo]);

  useFrame((_, dt) => {
    const p = trip.current;
    const g = holder.current;
    if (!p || !g) return;
    // borne l'avancée : un gros `dt` (compilation shader) ne doit pas sauter l'anim
    p.t = Math.min(1, p.t + Math.min(dt / p.dur, 0.16));
    const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
    const pos = p.curve.getPoint(e);
    g.position.copy(pos);
    g.lookAt(p.curve.getPoint(Math.min(1, e + 0.03)));
    g.visible = true;
    if (p.t >= 1) {
      trip.current = null;
      g.visible = false;
      setLinePts(null);
      onArrived();
    }
  });

  if (!linePts) return null;

  const banks = shipBanks(avatarId);
  return (
    <>
      <Line
        points={linePts}
        color={accent}
        lineWidth={1.4}
        transparent
        opacity={0.42}
        dashed
        dashSize={0.7}
        gapSize={0.5}
      />
      <group ref={holder} visible={false} scale={4.6}>
        {/* modèle nez=+Y → -Z pour suivre lookAt ; soucoupe reste à plat */}
        <group rotation={banks ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <ShipMesh id={avatarId} />
        </group>
        {/* lueur de réacteur, derrière le vaisseau, teintée à sa couleur */}
        <sprite position={[0, 0, banks ? 1.2 : 0.1]} scale={[3.4, 3.4, 1]}>
          <spriteMaterial
            map={engineGlow}
            color={accent}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    </>
  );
}

function DiveController({
  diveTo,
  pins,
  centerBody,
  driftRef,
  controls,
  onColor,
  onProgress,
  onDone,
}: {
  diveTo: string | null;
  pins: OrbitalSceneProps['pins'];
  centerBody?: Body;
  driftRef: DriftRef;
  controls: React.RefObject<OrbitControlsRef>;
  onColor: (c: string | null) => void;
  onProgress: (t: number) => void;
  onDone: (id: string) => void;
}) {
  const { camera } = useThree();
  const state = useRef<{
    id: string;
    from: THREE.Vector3;
    fromTarget: THREE.Vector3;
    dest: THREE.Vector3;
    destTarget: THREE.Vector3;
    t: number;
  } | null>(null);

  useEffect(() => {
    if (!diveTo) {
      state.current = null;
      onColor(null);
      onProgress(0);
      return;
    }
    const target =
      centerBody?.id === diveTo
        ? { body: centerBody, isCenter: true }
        : pins
            .map((p) => ({ body: p.body, isCenter: false }))
            .find((p) => p.body.id === diveTo);
    const c = controls.current;
    if (!target || !c) {
      onDone(diveTo);
      return;
    }
    const pos = target.isCenter
      ? new THREE.Vector3(0, 0, 0)
      : orbitPosition(target.body, driftRef.current, new THREE.Vector3());
    const radius = worldRadius(target.body.size, 0.6, 6);
    const dir = camera.position.clone().sub(c.target).normalize();

    if (prefersReducedMotion()) {
      onDone(diveTo);
      return;
    }

    onColor(target.body.gradient[1] ?? target.body.gradient[0]);
    state.current = {
      id: diveTo,
      from: camera.position.clone(),
      fromTarget: c.target.clone(),
      dest: pos.clone().addScaledVector(dir, Math.max(radius * 3.2, 4)),
      destTarget: pos.clone(),
      t: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveTo]);

  useFrame((_, dt) => {
    const s = state.current;
    const c = controls.current;
    if (!s || !c) return;
    s.t = Math.min(1, s.t + Math.min(dt / 0.72, 0.14));
    // accélère vers l'astre (plongée), puis décroche à la fin
    const e = s.t < 0.82 ? 1.24 * s.t * s.t : 1 - Math.pow(1 - s.t, 2) * 3.9;
    const k = THREE.MathUtils.clamp(e, 0, 1);
    camera.position.copy(s.from).lerp(s.dest, k);
    c.target.copy(s.fromTarget).lerp(s.destTarget, k);
    c.update();
    onProgress(s.t);
    if (s.t >= 1) {
      const id = s.id;
      state.current = null;
      onDone(id);
    }
  });

  return null;
}

/* ── scène ────────────────────────────────────────────────────────────── */

function Scene({
  props,
  controls,
  sceneRadius,
  quality,
  onDiveColor,
  onDiveProgress,
}: {
  props: OrbitalSceneProps;
  controls: React.RefObject<OrbitControlsRef>;
  sceneRadius: number;
  quality: QualitySettings;
  onDiveColor: (c: string | null) => void;
  onDiveProgress: (t: number) => void;
}) {
  const {
    rings,
    pins,
    centerBody,
    centerSize = 96,
    onCenterClick,
    decorativeDots,
    beltMarker,
    hoveredId,
    onHover,
    onSelect,
    zoom,
    zoomRange = [0.3, 3.2],
    interactive = true,
    drift = true,
    diveTo = null,
    fogOpenness = 1,
    onDiveComplete,
  } = props;

  const driftRef = useRef(0);
  const fogRef = useRef<THREE.Fog>(null);
  const [dragging, setDragging] = useState(false);
  const reduced = useMemo(prefersReducedMotion, []);
  const driftActive = drift && !reduced && !dragging && hoveredId === null && !diveTo;

  // le vaisseau voyage d'abord jusqu'à l'astre, puis la plongée caméra démarre
  const avatarId = useProgress((s) => s.avatarId);
  const [diveArmed, setDiveArmed] = useState(false);
  useEffect(() => {
    if (!diveTo) setDiveArmed(false);
  }, [diveTo]);

  // brume cosmique : plus les zones sont scellées, plus le brouillard se resserre
  // → tout ce qui est au-delà du système exploré se perd dans la nuit.
  const o = THREE.MathUtils.clamp(fogOpenness, 0, 1);

  useFrame((_, dt) => {
    if (driftActive) driftRef.current += dt * DRIFT_DEG_PER_SEC;

    // La brume suit la caméra : sa bande est ancrée à la distance caméra→centre,
    // pas à une valeur fixe. Sans ça, un fort dézoom repoussait tous les astres
    // au-delà de `far` et les faisait disparaître dans le brouillard.
    const c = controls.current;
    if (fogRef.current && c) {
      const dist = c.getDistance();
      fogRef.current.near = dist + sceneRadius * THREE.MathUtils.lerp(-0.15, 1.35, o);
      fogRef.current.far = dist + sceneRadius * THREE.MathUtils.lerp(0.9, 3.4, o);
    }
  });

  const hoveredPin = pins.find((p) => p.body.id === hoveredId);
  const centerIsStar = centerBody?.type === 'star';
  const centerRadius = centerBody
    ? worldRadius(centerSize, centerIsStar ? 5 : 1.8, centerIsStar ? 6.5 : 6)
    : 0;

  return (
    <>
      <color attach="background" args={['#0b0a1d']} />
      <fog
        ref={fogRef}
        attach="fog"
        args={['#0e0b22', sceneRadius * 2, sceneRadius * 5]}
      />
      <PerfProbe tier={quality.tier} />
      <ambientLight intensity={centerIsStar ? 0.42 : 0.5} />
      <hemisphereLight args={['#4a5a8f', '#3a2a1e', 0.3]} />
      {/* sous-carte (pas d'étoile au centre) : lumière-clé venue du « Soleil » */}
      {!centerIsStar && (
        <directionalLight
          position={[sceneRadius * 1.4, sceneRadius * 0.9, sceneRadius * 0.6]}
          intensity={1.7}
          color="#fff0da"
          castShadow={quality.contactShadows}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={sceneRadius * 0.015}
          shadow-camera-near={sceneRadius * 0.3}
          shadow-camera-far={sceneRadius * 3.4}
          shadow-camera-left={-sceneRadius * 1.15}
          shadow-camera-right={sceneRadius * 1.15}
          shadow-camera-top={sceneRadius * 1.15}
          shadow-camera-bottom={-sceneRadius * 1.15}
        />
      )}
      <Backdrop />
      <Stars
        radius={sceneRadius * 2.4}
        depth={sceneRadius}
        count={quality.starCount}
        factor={4}
        saturation={0.18}
        fade
        speed={reduced ? 0 : 0.32}
      />

      {rings.map((r) => (
        <OrbitRing3D
          key={r.radius}
          radius={r.radius}
          color={r.color}
          dashed={r.dashed}
          highlight={r.highlight}
        />
      ))}

      {centerBody && (
        <CenterBody
          body={centerBody}
          radius={centerRadius}
          reduced={reduced}
          segMax={quality.sphereSegments}
          normalMaps={quality.normalMaps}
          sunShader={quality.sunShader}
          sunOctaves={quality.sunOctaves}
          onClick={onCenterClick}
        />
      )}

      {pins.map((p) => (
        <Pin
          key={p.body.id}
          body={p.body}
          revealed={p.revealed}
          driftRef={driftRef}
          hovered={hoveredId === p.body.id}
          reduced={reduced}
          segMax={quality.sphereSegments}
          normalMaps={quality.normalMaps}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {decorativeDots && decorativeDots.length > 0 && (
        <BeltDots dots={decorativeDots} driftRef={driftRef} count={quality.beltCount} />
      )}

      {beltMarker && <BeltMarker3D marker={beltMarker} />}

      {hoveredPin && (
        <HoverLabel
          body={hoveredPin.body}
          revealed={hoveredPin.revealed}
          discovered={hoveredPin.discovered}
          driftRef={driftRef}
        />
      )}

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enabled={interactive && !diveTo}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.05}
        onStart={() => setDragging(true)}
        onEnd={() => setDragging(false)}
      />

      <CameraRig
        sceneRadius={sceneRadius}
        zoom={zoom}
        zoomRange={zoomRange}
        interactive={interactive}
        diving={!!diveTo}
        reduced={reduced}
        recenterKey={props.zoom === 1 && props.pan.x === 0 && props.pan.y === 0}
        controls={controls}
      />

      <ShipTravel
        diveTo={diveArmed ? null : diveTo}
        pins={pins}
        centerBody={centerBody}
        driftRef={driftRef}
        avatarId={avatarId}
        onArrived={() => setDiveArmed(true)}
      />

      <DiveController
        diveTo={diveArmed ? diveTo : null}
        pins={pins}
        centerBody={centerBody}
        driftRef={driftRef}
        controls={controls}
        onColor={onDiveColor}
        onProgress={onDiveProgress}
        onDone={(id) => onDiveComplete?.(id)}
      />

      {quality.bloom !== 'off' && (
        <EffectComposer multisampling={0}>
          <Bloom
            mipmapBlur
            levels={quality.bloom === 'high' ? 8 : 6}
            kernelSize={quality.bloom === 'high' ? KernelSize.HUGE : KernelSize.LARGE}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.35}
            intensity={0.7}
            radius={quality.bloom === 'high' ? 0.78 : 0.7}
          />
        </EffectComposer>
      )}
    </>
  );
}

/* ── composant public ─────────────────────────────────────────────────── */

export function OrbitalScene3D(props: OrbitalSceneProps) {
  const controls = useRef<OrbitControlsRef>(null);
  const quality = useQuality();
  const [diveColor, setDiveColor] = useState<string | null>(null);
  const [diveT, setDiveT] = useState(0);
  // opacité du voile pilotée par la progression de la plongée (même horloge que
  // la caméra) — plus fiable qu'une transition CSS pendant le rendu WebGL.
  const veilOpacity = THREE.MathUtils.clamp(diveT * 1.5, 0, 0.94);

  const sceneRadius = useMemo(() => {
    const maxRing = Math.max(1, ...props.rings.map((r) => r.radius));
    const maxPin = Math.max(1, ...props.pins.map((p) => p.body.orbitRadius));
    return Math.max(maxRing, maxPin) * ORBIT_SCALE + 4;
  }, [props.rings, props.pins]);

  // molette → zoom (le parent est la source de vérité)
  const onWheel = (e: React.WheelEvent) => {
    if (props.interactive === false || props.diveTo) return;
    e.preventDefault();
    const range = props.zoomRange ?? [0.3, 3.2];
    const factor = Math.exp(-e.deltaY * 0.0011);
    const next = THREE.MathUtils.clamp(props.zoom * factor, range[0], range[1]);
    if (next !== props.zoom) props.onZoom(next);
  };

  // léger vignettage d'écran ; la vraie brume est le `<fog>` 3D (modulé par fogOpenness)
  const veilAlpha = 0.28 + (1 - THREE.MathUtils.clamp(props.fogOpenness, 0, 1)) * 0.34;

  return (
    <div className={styles.wrap} style={{ background: props.background }} onWheelCapture={onWheel}>
      <Canvas
        key={quality.tier}
        dpr={quality.dpr}
        shadows={quality.contactShadows ? 'soft' : false}
        gl={{
          antialias: quality.antialias,
          toneMappingExposure: 1.05,
          powerPreference: quality.powerPreference,
        }}
        camera={{ fov: 44, position: [0, 60, 110] }}
      >
        <Suspense fallback={null}>
          <Scene
            props={props}
            controls={controls}
            sceneRadius={sceneRadius}
            quality={quality}
            onDiveColor={setDiveColor}
            onDiveProgress={setDiveT}
          />
        </Suspense>
      </Canvas>

      <div
        className={styles.fogVeil}
        style={{
          background: `radial-gradient(ellipse 78% 74% at 50% 52%, rgba(8,6,20,0) 42%, rgba(8,6,20,${(
            veilAlpha * 0.6
          ).toFixed(2)}) 78%, rgba(6,5,16,${veilAlpha.toFixed(2)}) 100%)`,
        }}
      />

      {diveColor && (
        <div
          className={styles.diveVeil}
          style={{
            opacity: veilOpacity,
            background: `radial-gradient(circle at 50% 50%, ${diveColor}55 0%, ${diveColor}22 22%, rgba(11,10,29,0) 42%), radial-gradient(circle at 50% 50%, rgba(11,10,29,0) 24%, rgba(11,10,29,0.6) 66%, rgba(11,10,29,0.97) 100%)`,
          }}
        />
      )}

      {props.children}
    </div>
  );
}

export default OrbitalScene3D;
