import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { bodyById } from '@/data/bodies';
import type { Body } from '@/data/types';
import styles from './SpikeR3D.module.css';

/**
 * SPIKE JETABLE — route `/r3d`, hors app.
 * Passe de polish : éclairage, bandes des géantes, bloom du Soleil, cadrage
 * caméra responsive. But : juger un rendu proche du final avant de s'engager.
 * Chargé en lazy → n'alourdit pas le bundle de l'app.
 */

const SPIKE_IDS = [
  'soleil',
  'mercure',
  'venus',
  'terre',
  'mars',
  'jupiter',
  'saturne',
  'uranus',
  'neptune',
];

const ORBIT_SCALE = 1 / 7;
const SIZE_SCALE = 1 / 13;
const SUN_RADIUS = 6;
const ELEVATION_DEG = 34;

interface Placed {
  body: Body;
  r: number;
  radius: number;
  angle0: number;
  speed: number;
  spin: number;
}

function placeBodies(): Placed[] {
  const bodies = SPIKE_IDS.map((id) => bodyById(id)).filter(Boolean) as Body[];
  const baseR = 118 * ORBIT_SCALE;
  return bodies.map((body) => {
    const isSun = body.id === 'soleil';
    const r = isSun ? 0 : body.orbitRadius * ORBIT_SCALE;
    return {
      body,
      r,
      radius: isSun
        ? SUN_RADIUS
        : THREE.MathUtils.clamp(body.size * SIZE_SCALE, 0.55, 5.4),
      angle0: THREE.MathUtils.degToRad(body.orbitAngle),
      speed: isSun ? 0 : 0.05 * Math.pow(baseR / Math.max(r, 1), 0.6),
      spin: isSun ? 0.03 : 0.1 + (body.size % 7) * 0.035,
    };
  });
}

const SCENE_RADIUS = Math.max(
  ...placeBodies()
    .filter((p) => p.r > 0)
    .map((p) => p.r),
);

/* ── textures ─────────────────────────────────────────────────────────── */

/** Bandes horizontales pour les géantes (+ Grande Tache Rouge pour Jupiter). */
function bandedTexture(body: Body): THREE.Texture {
  const W = 256;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const [light, mid, dark] = body.gradient;

  ctx.fillStyle = mid;
  ctx.fillRect(0, 0, W, H);

  const tones = [light, mid, dark, mid, light, dark, mid, light, mid, dark];
  let y = 0;
  let i = 0;
  while (y < H) {
    const h = (H / 9) * (0.6 + Math.random() * 0.8);
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, y, W, h + 1);
    y += h;
    i++;
  }

  // adoucir les transitions
  ctx.filter = 'blur(3px)';
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';

  // fines stries pour l'effet « tourbillonnant »
  ctx.globalAlpha = 0.05;
  for (let s = 0; s < 70; s++) {
    ctx.fillStyle = Math.random() > 0.5 ? light : dark;
    ctx.fillRect(0, Math.random() * H, W, 1 + Math.random() * 2);
  }
  ctx.globalAlpha = 1;

  if (body.id === 'jupiter') {
    ctx.save();
    ctx.translate(W * 0.63, H * 0.6);
    ctx.scale(1.5, 0.7);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    g.addColorStop(0, '#e8814e');
    g.addColorStop(0.55, '#c45a30');
    g.addColorStop(1, 'rgba(150,55,25,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Léger dégradé pôle → équateur pour les telluriques (casse le côté « bille »). */
function terrainTexture(body: Body): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const [light, mid, dark] = body.gradient;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, light);
  g.addColorStop(0.4, mid);
  g.addColorStop(0.65, dark);
  g.addColorStop(1, mid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function radialSprite(stops: [number, string][]): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── objets de scène ──────────────────────────────────────────────────── */

function Backdrop() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#0c0a1e');
    g.addColorStop(0.5, '#171334');
    g.addColorStop(1, '#0a0817');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh scale={520}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Sun({ radius }: { radius: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useMemo(
    () =>
      radialSprite([
        [0, 'rgba(255,228,168,0.95)'],
        [0.26, 'rgba(255,190,104,0.5)'],
        [0.6, 'rgba(255,150,64,0.14)'],
        [1, 'rgba(255,150,60,0)'],
      ]),
    [],
  );
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.03;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[radius, 48, 48]} />
        {/* couleur HDR (>1) → dépasse le seuil du bloom */}
        <meshBasicMaterial color={[2.4, 1.8, 0.95]} toneMapped={false} />
      </mesh>
      <sprite scale={[radius * 9, radius * 9, 1]}>
        <spriteMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <pointLight intensity={900} decay={1.45} color="#fff2da" />
    </group>
  );
}

function Planet({ p, onHover }: { p: Placed; onHover: (b: Body | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const banded = !!p.body.banded;
  const map = useMemo(
    () => (banded ? bandedTexture(p.body) : terrainTexture(p.body)),
    [banded, p.body],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      const a = p.angle0 - t * p.speed;
      group.current.position.set(Math.cos(a) * p.r, 0, Math.sin(a) * p.r);
    }
    if (mesh.current) mesh.current.rotation.y += dt * p.spin;
  });

  return (
    <group
      ref={group}
      position={[Math.cos(p.angle0) * p.r, 0, Math.sin(p.angle0) * p.r]}
    >
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(p.body);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[p.radius, 44, 44]} />
        <meshStandardMaterial
          map={map}
          color={banded ? '#ffffff' : '#f4f1ea'}
          roughness={0.85}
          metalness={0}
          emissive={p.body.gradient[1]}
          emissiveIntensity={0.16}
        />
      </mesh>

      {p.body.rings && <SaturnRings radius={p.radius} />}

      {p.body.id === 'terre' && (
        <mesh scale={1.08}>
          <sphereGeometry args={[p.radius, 32, 32]} />
          <meshBasicMaterial
            color="#8ec9ef"
            transparent
            opacity={0.14}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function SaturnRings({ radius }: { radius: number }) {
  const tex = useMemo(() => {
    const N = 256;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = 8;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < N; x++) {
      const v = x / N;
      // bandes concentriques + division de Cassini vers 0.62
      let a = 0.55 + 0.35 * Math.sin(v * 42);
      if (v > 0.58 && v < 0.66) a *= 0.15;
      if (v < 0.06 || v > 0.98) a = 0;
      const shade = 200 + Math.floor(30 * Math.sin(v * 30));
      ctx.fillStyle = `rgba(${shade},${shade - 24},${shade - 66},${a})`;
      ctx.fillRect(x, 0, 1, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.RingGeometry(radius * 1.45, radius * 2.75, 128, 1);
    // remappe l'UV.x sur le rayon pour que la texture soit concentrique
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const rr =
        (v.length() - radius * 1.45) / (radius * 2.75 - radius * 1.45);
      uv.setX(i, rr);
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

function OrbitRing({ r }: { r: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r - 0.035, r + 0.035, 200]} />
      <meshBasicMaterial
        color="#f6ebd6"
        transparent
        opacity={0.11}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

/** Cadre tout le système quel que soit l'aspect (portrait mobile inclus). */
function FitCamera({ controls }: { controls: React.RefObject<OrbitControlsRef> }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const portrait = aspect < 1;

    // Portrait : FOV large, vue plus plongeante, et on ne cadre que le système
    // interne (les géantes se découvrent en dézoomant) — sinon tout est minuscule.
    cam.fov = portrait ? THREE.MathUtils.clamp(96 - aspect * 34, 60, 84) : 42;
    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const frameRadius = portrait ? SCENE_RADIUS * 0.66 : SCENE_RADIUS;
    const fill = portrait ? 0.9 : 0.72;
    const dist = frameRadius / (fill * Math.tan(hFov / 2));
    const elev = THREE.MathUtils.degToRad(portrait ? 48 : ELEVATION_DEG);

    cam.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    cam.near = Math.max(0.5, dist * 0.02);
    cam.far = dist * 4 + 700;
    cam.updateProjectionMatrix();

    const c = controls.current;
    if (c) {
      c.target.set(0, 0, 0);
      c.minDistance = dist * 0.22;
      c.maxDistance = dist * (portrait ? 3.6 : 2.2);
      c.update();
    } else {
      cam.lookAt(0, 0, 0);
    }
  }, [camera, size, controls]);
  return null;
}

function Scene({
  onHover,
  controls,
}: {
  onHover: (b: Body | null) => void;
  controls: React.RefObject<OrbitControlsRef>;
}) {
  const placed = useMemo(placeBodies, []);
  return (
    <>
      <fog attach="fog" args={['#12102a', 130, 380]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#4a5a8f', '#3a2a1e', 0.32]} />
      <Backdrop />
      <Stars radius={260} depth={100} count={3400} factor={4} saturation={0} fade speed={0.35} />

      {placed
        .filter((p) => p.r > 0)
        .map((p) => (
          <OrbitRing key={`o-${p.body.id}`} r={p.r} />
        ))}

      {placed.map((p) =>
        p.r === 0 ? (
          <Sun key={p.body.id} radius={p.radius} />
        ) : (
          <Planet key={p.body.id} p={p} onHover={onHover} />
        ),
      )}

      <FitCamera controls={controls} />

      <EffectComposer>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.6}
          luminanceSmoothing={0.25}
          intensity={0.85}
          radius={0.72}
        />
      </EffectComposer>
    </>
  );
}

export default function SpikeR3D() {
  const [hovered, setHovered] = useState<Body | null>(null);
  const controls = useRef<OrbitControlsRef>(null);

  return (
    <div className={styles.wrap}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, toneMappingExposure: 1.05 }}
        camera={{ fov: 42, position: [0, 60, 110] }}
      >
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI / 2 - 0.06}
        />
        <Suspense fallback={null}>
          <Scene onHover={setHovered} controls={controls} />
        </Suspense>
      </Canvas>

      <div className={styles.hud}>
        <Link to="/map" className={styles.back}>
          ‹ Retour
        </Link>
        <span className={styles.tag}>Spike 3D · react-three-fiber</span>
      </div>

      <div className={styles.caption}>
        {hovered ? hovered.name : 'Glisse pour tourner · molette pour zoomer'}
      </div>
    </div>
  );
}
