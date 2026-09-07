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
import type { OrbitalSceneProps } from '@/features/scene/OrbitalScene';
import {
  backdropTexture,
  bandedTexture,
  radialSprite,
  ringTexture,
  sunTexture,
  terrainTexture,
} from './materials';
import {
  alphaOf,
  DRIFT_DEG_PER_SEC,
  ELEVATION_DEG,
  ORBIT_SCALE,
  orbitPosition,
  prefersReducedMotion,
  SIZE_SCALE,
  worldRadius,
} from './scene3d';
import styles from './OrbitalScene3D.module.css';

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;
type DriftRef = MutableRefObject<number>;

/** Halo d'atmosphère (couleur) pour les corps qui en ont une visible. */
const ATMOSPHERE: Record<string, string> = {
  terre: '#8ec9ef',
  venus: '#f6dfb0',
  mars: '#e9a97e',
  titan: '#e0a869',
  jupiter: '#e9c48a',
  saturne: '#efdcb2',
  uranus: '#a8e6e2',
  neptune: '#7fa8f0',
};

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
  onClick,
}: {
  body: Body;
  radius: number;
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

  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * (isStar ? 0.02 : 0.05);
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

  return (
    <group>
      <mesh ref={mesh} {...pointer}>
        <sphereGeometry args={[radius, 48, 48]} />
        {isStar ? (
          <meshBasicMaterial map={map} color={[2.1, 1.55, 0.85]} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            map={map}
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
  onHover,
  onSelect,
}: {
  body: Body;
  revealed: boolean;
  driftRef: DriftRef;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (b: Body) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const radius = worldRadius(body.size, 0.45, 5.4);
  // segments proportionnels à la taille : les petites naines lointaines restent légères
  const segs = THREE.MathUtils.clamp(Math.round(radius * 9), 14, 44);
  const banded = !!body.banded;
  const atmosphere = ATMOSPHERE[body.id];
  const map = useMemo(
    () => (revealed ? (banded ? bandedTexture(body) : terrainTexture(body)) : null),
    [revealed, banded, body],
  );
  const spin = useMemo(() => 0.1 + (body.size % 7) * 0.035, [body.size]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (group.current) {
      orbitPosition(body, driftRef.current, tmp);
      group.current.position.copy(tmp);
    }
    if (mesh.current && revealed) mesh.current.rotation.y += dt * spin;
  });

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
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
            color={banded ? '#ffffff' : '#f4f1ea'}
            roughness={0.85}
            metalness={0}
            emissive={body.gradient[1]}
            emissiveIntensity={0.16}
          />
        ) : (
          <meshStandardMaterial
            color="#3a2f68"
            roughness={1}
            metalness={0}
            emissive="#3a2f68"
            emissiveIntensity={0.55}
          />
        )}
      </mesh>

      {!revealed && (
        <mesh scale={1.14}>
          <sphereGeometry args={[radius, 18, 18]} />
          <meshBasicMaterial
            color="#b3a6e6"
            transparent
            opacity={0.16}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {body.rings && revealed && <PlanetRings radius={radius} />}

      {revealed && atmosphere && (
        <>
          <mesh scale={1.055}>
            <sphereGeometry args={[radius, 28, 28]} />
            <meshBasicMaterial
              color={atmosphere}
              transparent
              opacity={0.16}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
          <mesh scale={1.14}>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial
              color={atmosphere}
              transparent
              opacity={0.05}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        </>
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
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2.25, 0, 0.26]}>
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

function BeltDots({ dots, driftRef }: { dots: NonNullable<OrbitalSceneProps['decorativeDots']>; driftRef: DriftRef }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    dots.forEach((d, i) => {
      orbitPosition({ orbitRadius: d.r, orbitAngle: d.a }, driftRef.current, tmp);
      dummy.position.copy(tmp);
      dummy.scale.setScalar(Math.max(0.12, d.s * SIZE_SCALE));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, dots.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#9b8f7e" roughness={1} flatShading />
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
  recenterKey,
  controls,
}: {
  sceneRadius: number;
  zoom: number;
  zoomRange: [number, number];
  interactive: boolean;
  diving: boolean;
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
      const fill = !interactive ? 0.58 : 0.74;
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

    if (!interactive) c.setAzimuthalAngle(c.getAzimuthalAngle() + dt * 0.03);
    c.update();
  });

  return null;
}

/* ── plongée ──────────────────────────────────────────────────────────── */

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
    s.t = Math.min(1, s.t + dt / 0.7);
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
  onDiveColor,
  onDiveProgress,
}: {
  props: OrbitalSceneProps;
  controls: React.RefObject<OrbitControlsRef>;
  sceneRadius: number;
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
  const [dragging, setDragging] = useState(false);
  const reduced = useMemo(prefersReducedMotion, []);
  const driftActive = drift && !reduced && !dragging && hoveredId === null && !diveTo;

  useFrame((_, dt) => {
    if (driftActive) driftRef.current += dt * DRIFT_DEG_PER_SEC;
  });

  const hoveredPin = pins.find((p) => p.body.id === hoveredId);
  const centerIsStar = centerBody?.type === 'star';
  const centerRadius = centerBody
    ? worldRadius(centerSize, centerIsStar ? 5 : 1.8, centerIsStar ? 6.5 : 6)
    : 0;

  // brume cosmique : plus les zones sont scellées, plus le brouillard se resserre
  // → tout ce qui est au-delà du système exploré se perd dans la nuit.
  const o = THREE.MathUtils.clamp(fogOpenness, 0, 1);
  const fogNear = sceneRadius * THREE.MathUtils.lerp(0.55, 1.7, o);
  const fogFar = sceneRadius * THREE.MathUtils.lerp(1.7, 4.4, o);

  return (
    <>
      <color attach="background" args={['#0b0a1d']} />
      <fog attach="fog" args={['#0e0b22', fogNear, fogFar]} />
      <ambientLight intensity={centerIsStar ? 0.42 : 0.5} />
      <hemisphereLight args={['#4a5a8f', '#3a2a1e', 0.3]} />
      {/* sous-carte (pas d'étoile au centre) : lumière-clé venue du « Soleil » */}
      {!centerIsStar && (
        <directionalLight
          position={[sceneRadius * 1.4, sceneRadius * 0.9, sceneRadius * 0.6]}
          intensity={1.7}
          color="#fff0da"
        />
      )}
      <Backdrop />
      <Stars radius={sceneRadius * 2.4} depth={sceneRadius} count={3200} factor={4} saturation={0} fade speed={0.32} />

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
        <CenterBody body={centerBody} radius={centerRadius} onClick={onCenterClick} />
      )}

      {pins.map((p) => (
        <Pin
          key={p.body.id}
          body={p.body}
          revealed={p.revealed}
          driftRef={driftRef}
          hovered={hoveredId === p.body.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {decorativeDots && decorativeDots.length > 0 && (
        <BeltDots dots={decorativeDots} driftRef={driftRef} />
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
        recenterKey={props.zoom === 1 && props.pan.x === 0 && props.pan.y === 0}
        controls={controls}
      />

      <DiveController
        diveTo={diveTo}
        pins={pins}
        centerBody={centerBody}
        driftRef={driftRef}
        controls={controls}
        onColor={onDiveColor}
        onProgress={onDiveProgress}
        onDone={(id) => onDiveComplete?.(id)}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          levels={8}
          kernelSize={KernelSize.HUGE}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.35}
          intensity={0.7}
          radius={0.78}
        />
      </EffectComposer>
    </>
  );
}

/* ── composant public ─────────────────────────────────────────────────── */

export function OrbitalScene3D(props: OrbitalSceneProps) {
  const controls = useRef<OrbitControlsRef>(null);
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
        dpr={[1, 1.85]}
        gl={{ antialias: true, toneMappingExposure: 1.05, powerPreference: 'high-performance' }}
        camera={{ fov: 44, position: [0, 60, 110] }}
      >
        <Suspense fallback={null}>
          <Scene
            props={props}
            controls={controls}
            sceneRadius={sceneRadius}
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
