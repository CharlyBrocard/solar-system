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
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Body } from '@/data/types';
import { fogVeilGradient } from '@/features/map/geometry';
import type { OrbitalSceneProps } from '@/features/scene/OrbitalScene';
import {
  backdropTexture,
  bandedTexture,
  radialSprite,
  ringTexture,
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
  const glow = useMemo(
    () =>
      radialSprite('sun', [
        [0, 'rgba(255,228,168,0.95)'],
        [0.26, 'rgba(255,190,104,0.5)'],
        [0.6, 'rgba(255,150,64,0.14)'],
        [1, 'rgba(255,150,60,0)'],
      ]),
    [],
  );
  const map = useMemo(
    () => (body.banded ? bandedTexture(body) : terrainTexture(body)),
    [body],
  );

  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * (isStar ? 0.03 : 0.05);
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
          <meshBasicMaterial color={[2.4, 1.8, 0.95]} toneMapped={false} />
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

      {isStar && (
        <>
          <sprite scale={[radius * 9, radius * 9, 1]}>
            <spriteMaterial
              map={glow}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <pointLight intensity={820} decay={1.45} color="#fff1d6" />
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
  const banded = !!body.banded;
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
    if (mesh.current) mesh.current.rotation.y += dt * spin;
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
        <sphereGeometry args={[radius, 40, 40]} />
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
          <meshStandardMaterial color="#2f2752" roughness={1} metalness={0} emissive="#1c1740" emissiveIntensity={0.5} />
        )}
      </mesh>

      {!revealed && (
        <mesh scale={1.12}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial color="#8b7fd0" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}

      {body.rings && revealed && <PlanetRings radius={radius} />}

      {body.id === 'terre' && revealed && (
        <mesh scale={1.09}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial color="#8ec9ef" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}

      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.35, radius * 1.5, 48]} />
          <meshBasicMaterial color="#e8b04b" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function PlanetRings({ radius }: { radius: number }) {
  const tex = useMemo(ringTexture, []);
  const geom = useMemo(() => {
    const inner = radius * 1.45;
    const outer = radius * 2.75;
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
        color="#efe0c2"
        transparent
        opacity={0.9}
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
  highlight,
}: {
  radius: number;
  color: string;
  highlight?: boolean;
}) {
  const r = radius * ORBIT_SCALE;
  const opacity = Math.min(0.9, alphaOf(color, 0.12) * (highlight ? 2.4 : 1.4));
  const w = highlight ? 0.07 : 0.04;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r - w, r + w, 220]} />
      <meshBasicMaterial
        color={highlight ? '#e8b04b' : '#f6ebd6'}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
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

function BeltMarker3D({
  marker,
  driftRef,
}: {
  marker: NonNullable<OrbitalSceneProps['beltMarker']>;
  driftRef: DriftRef;
}) {
  const group = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (group.current) {
      orbitPosition({ orbitRadius: marker.radius, orbitAngle: marker.angle }, driftRef.current, tmp);
      group.current.position.copy(tmp);
    }
  });
  return (
    <group ref={group}>
      <Html center distanceFactor={140} zIndexRange={[20, 0]}>
        <button
          type="button"
          className={styles.beltMarker}
          data-locked={marker.locked ? 'true' : undefined}
          onClick={marker.onClick}
        >
          {marker.label}
        </button>
      </Html>
    </group>
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
  controls,
}: {
  sceneRadius: number;
  zoom: number;
  zoomRange: [number, number];
  interactive: boolean;
  controls: React.RefObject<OrbitControlsRef>;
}) {
  const { camera, size } = useThree();
  const fitDist = useRef(sceneRadius * 3);
  const targetDist = useRef(sceneRadius * 3);

  // (re)cadre au montage et au redimensionnement
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    cam.fov = portrait ? THREE.MathUtils.clamp(96 - aspect * 34, 60, 84) : 44;
    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const frameRadius = portrait ? sceneRadius * 0.68 : sceneRadius;
    const fill = portrait ? 0.9 : 0.74;
    const d = frameRadius / (fill * Math.tan(hFov / 2));
    fitDist.current = d;
    targetDist.current = d / zoom;
    cam.near = Math.max(0.3, d * 0.015);
    cam.far = d * 5 + 800;
    cam.updateProjectionMatrix();

    const elev = THREE.MathUtils.degToRad(portrait ? 46 : ELEVATION_DEG);
    cam.position.set(0, Math.sin(elev) * targetDist.current, Math.cos(elev) * targetDist.current);
    const c = controls.current;
    if (c) {
      c.target.set(0, 0, 0);
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
    targetDist.current = THREE.MathUtils.clamp(
      fitDist.current / zoom,
      fitDist.current / zoomRange[1],
      fitDist.current / zoomRange[0],
    );
  }, [zoom, zoomRange]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const cur = c.getDistance();
    const next = THREE.MathUtils.damp(cur, targetDist.current, 6, dt);
    if (Math.abs(next - cur) > 0.01) {
      // dolly en gardant la direction
      const dir = camera.position.clone().sub(c.target).normalize();
      camera.position.copy(c.target).addScaledVector(dir, next);
    }
    if (!interactive) {
      // mode décor : lente rotation
      c.setAzimuthalAngle(c.getAzimuthalAngle() + dt * 0.03);
    }
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
  onDone,
}: {
  diveTo: string | null;
  pins: OrbitalSceneProps['pins'];
  centerBody?: Body;
  driftRef: DriftRef;
  controls: React.RefObject<OrbitControlsRef>;
  onColor: (c: string | null) => void;
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
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!diveTo) {
      state.current = null;
      onColor(null);
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
      dest: pos.clone().addScaledVector(dir, Math.max(radius * 4, 6)),
      destTarget: pos.clone(),
      t: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveTo]);

  useFrame((_, dt) => {
    const s = state.current;
    const c = controls.current;
    if (!s || !c) return;
    s.t = Math.min(1, s.t + dt / 0.62);
    const e = s.t < 0.5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2; // easeInOut
    camera.position.copy(s.from).lerp(s.dest, e);
    c.target.copy(s.fromTarget).lerp(s.destTarget, e);
    c.update();
    if (s.t >= 1) {
      const id = s.id;
      state.current = null;
      onDone(id);
    }
    void tmp;
  });

  return null;
}

/* ── scène ────────────────────────────────────────────────────────────── */

function Scene({
  props,
  controls,
  sceneRadius,
  onDiveColor,
}: {
  props: OrbitalSceneProps;
  controls: React.RefObject<OrbitControlsRef>;
  sceneRadius: number;
  onDiveColor: (c: string | null) => void;
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
  const centerRadius = centerBody
    ? worldRadius(centerSize, centerBody.type === 'star' ? 5 : 1.8, centerBody.type === 'star' ? 6.5 : 6)
    : 0;

  return (
    <>
      <color attach="background" args={['#0b0a1d']} />
      <fog attach="fog" args={['#12102a', sceneRadius * 1.4, sceneRadius * 4.2]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#4a5a8f', '#3a2a1e', 0.3]} />
      <Backdrop />
      <Stars radius={sceneRadius * 2.4} depth={sceneRadius} count={3200} factor={4} saturation={0} fade speed={0.32} />

      {rings.map((r) => (
        <OrbitRing3D key={r.radius} radius={r.radius} color={r.color} highlight={r.highlight} />
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

      {beltMarker && <BeltMarker3D marker={beltMarker} driftRef={driftRef} />}

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
        controls={controls}
      />

      <DiveController
        diveTo={diveTo}
        pins={pins}
        centerBody={centerBody}
        driftRef={driftRef}
        controls={controls}
        onColor={onDiveColor}
        onDone={(id) => onDiveComplete?.(id)}
      />

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.25} intensity={0.85} radius={0.72} />
      </EffectComposer>
    </>
  );
}

/* ── composant public ─────────────────────────────────────────────────── */

export function OrbitalScene3D(props: OrbitalSceneProps) {
  const controls = useRef<OrbitControlsRef>(null);
  const [diveColor, setDiveColor] = useState<string | null>(null);

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

  const fog = fogVeilGradient(props.origin[0], props.origin[1], props.fogOpenness);

  return (
    <div className={styles.wrap} style={{ background: props.background }} onWheelCapture={onWheel}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, toneMappingExposure: 1.05 }}
        camera={{ fov: 44, position: [0, 60, 110] }}
      >
        <Suspense fallback={null}>
          <Scene
            props={props}
            controls={controls}
            sceneRadius={sceneRadius}
            onDiveColor={setDiveColor}
          />
        </Suspense>
      </Canvas>

      <div className={styles.fogVeil} style={{ background: fog }} />

      {diveColor && (
        <div
          className={styles.diveVeil}
          data-on="true"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${diveColor}55 0%, ${diveColor}22 22%, rgba(11,10,29,0) 42%), radial-gradient(circle at 50% 50%, rgba(11,10,29,0) 24%, rgba(11,10,29,0.6) 66%, rgba(11,10,29,0.97) 100%)`,
          }}
        />
      )}

      {props.children}
    </div>
  );
}

export default OrbitalScene3D;
