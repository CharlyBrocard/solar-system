import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import type { Body } from '@/data/types';
import { bandedTexture, radialSprite, ringTexture, sunTexture, terrainTexture } from './materials';
import { ATMOSPHERE, prefersReducedMotion } from './scene3d';

/**
 * Rendu 3D d'un seul astre — même matière/éclairage que la scène orbitale, mais
 * cadré comme un portrait. Utilisé par les fiches `/object`, le moment de
 * découverte et le mode classe.
 *
 * Le `<Canvas>` est OPAQUE (couleur = `tint`, celle du fond hôte) : un canvas
 * transparent laisse un voile carré sur certains GPU. Le bord franc du canvas est
 * juste estompé par un léger masque circulaire CSS.
 */

export interface HeroMoon {
  id: string;
  /** teinte (gradient[1] de la lune) */
  color: string;
  /** taille relative au corps central, ~0.04–0.12 */
  size: number;
}

interface BodyView3DProps {
  body: Body;
  /** côté du rendu, en px */
  size: number;
  className?: string;
  style?: CSSProperties;
  /** astre non révélé → orbe violet voilé (comme la carte) */
  silhouette?: boolean;
  /** false = fige la rotation (par défaut : suit `prefers-reduced-motion`) */
  spin?: boolean;
  /** couleur de fond de la surface hôte : le canvas est opaque et s'y fond */
  tint?: string;
  /** lunes qui gravitent autour du corps (aperçu du sous-système) */
  moons?: HeroMoon[];
  /**
   * `bleed` : le canvas occupe tout le conteneur (`position` géré par le parent),
   * l'astre est décalé vers la gauche. Plus de masque : le fond du canvas EST
   * le fond de l'écran. Pour la fiche `/object`.
   */
  bleed?: boolean;
}

/** Décale la projection pour poser l'astre ~32 % depuis la gauche. */
function LeftBiasedCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, size.width * 0.2, 0, size.width, size.height);
    cam.updateProjectionMatrix();
    return () => {
      cam.clearViewOffset();
      cam.updateProjectionMatrix();
    };
  }, [camera, size]);
  return null;
}

function Sphere({
  body,
  silhouette,
  spin,
  moons,
}: Pick<BodyView3DProps, 'body' | 'silhouette' | 'spin' | 'moons'>) {
  const mesh = useRef<THREE.Mesh>(null);
  const isStar = body.type === 'star';
  const reduced = useMemo(prefersReducedMotion, []);
  const spinning = (spin ?? !reduced) && !silhouette;

  const map = useMemo(() => {
    if (silhouette) return null;
    return isStar ? sunTexture() : body.banded ? bandedTexture(body) : terrainTexture(body);
  }, [isStar, body, silhouette]);

  const starGlow = useMemo(
    () =>
      radialSprite('hero-star', [
        [0, 'rgba(255,244,208,0.9)'],
        [0.16, 'rgba(255,206,124,0.5)'],
        [0.36, 'rgba(255,168,84,0.16)'],
        [0.66, 'rgba(255,150,60,0.03)'],
        [1, 'rgba(255,150,60,0)'],
      ]),
    [],
  );
  const sealedGlow = useMemo(
    () =>
      radialSprite('hero-sealed', [
        [0, 'rgba(150,134,228,0.55)'],
        [0.34, 'rgba(120,105,205,0.16)'],
        [0.6, 'rgba(120,105,205,0)'],
        [1, 'rgba(120,105,205,0)'],
      ]),
    [],
  );

  const atmosphere = ATMOSPHERE[body.id];

  useFrame((_, dt) => {
    if (mesh.current && spinning) mesh.current.rotation.y += dt * 0.16;
  });

  if (silhouette) {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[1, 40, 40]} />
          <meshStandardMaterial
            color="#4a3f7d"
            roughness={1}
            emissive="#5646a0"
            emissiveIntensity={0.55}
          />
        </mesh>
        <sprite scale={[3.2, 3.2, 1]}>
          <spriteMaterial
            map={sealedGlow}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    );
  }

  return (
    <group rotation={[0.15, 0, 0.05]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 56, 56]} />
        {isStar ? (
          <meshBasicMaterial map={map ?? undefined} color={[2.3, 1.7, 0.95]} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            map={map ?? undefined}
            color={body.banded ? '#ffffff' : '#f4f1ea'}
            roughness={0.85}
            metalness={0}
            emissive={body.gradient[1]}
            emissiveIntensity={0.2}
          />
        )}
      </mesh>

      {isStar &&
        [2.9, 5.2, 8].map((s, i) => (
          <sprite key={s} scale={[s, s, 1]}>
            <spriteMaterial
              map={starGlow}
              transparent
              opacity={i === 0 ? 1 : i === 1 ? 0.55 : 0.32}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}

      {atmosphere && (
        <mesh scale={1.025}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial
            color={atmosphere}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {body.rings && <Rings />}
      {moons && moons.length > 0 && <Moons moons={moons} turning={spinning} />}
    </group>
  );
}

/** Petites lunes en orbite lente autour du corps — aperçu du sous-système. */
function Moons({ moons, turning }: { moons: HeroMoon[]; turning: boolean }) {
  const group = useRef<THREE.Group>(null);
  const orbits = useMemo(
    () =>
      moons.slice(0, 4).map((m, i) => ({
        ...m,
        r: 1.34 + i * 0.28,
        phase: (i / moons.length) * Math.PI * 2 + 0.6,
        speed: 0.26 - i * 0.035,
        tilt: -0.34 + i * 0.05,
      })),
    [moons],
  );
  useFrame((state) => {
    if (!group.current || !turning) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const o = orbits[i];
      if (!o) return;
      const a = o.phase + t * o.speed;
      child.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r * o.tilt, Math.sin(a) * o.r * 0.9);
    });
  });
  return (
    <group ref={group}>
      {orbits.map((o) => (
        <mesh key={o.id}>
          <sphereGeometry args={[Math.max(0.05, o.size), 20, 20]} />
          <meshStandardMaterial color={o.color} roughness={0.9} emissive={o.color} emissiveIntensity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Rings() {
  const tex = useMemo(ringTexture, []);
  const geom = useMemo(() => {
    const inner = 1.34;
    const outer = 2.12;
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
  }, []);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2.15, 0, 0.24]}>
      <meshBasicMaterial
        map={tex}
        color="#e6d4b0"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function BodyView3D({
  body,
  size,
  className,
  style,
  silhouette,
  spin,
  tint = '#251c48',
  moons,
  bleed,
}: BodyView3DProps) {
  const isStar = body.type === 'star';
  // distance calée pour que le corps occupe ~62 % de la demi-hauteur du cadre.
  const dist = body.rings ? (bleed ? 10.6 : 12.8) : isStar ? 9.5 : bleed ? 6.2 : 6;

  const wrapStyle: CSSProperties = bleed
    ? { ...style }
    : {
        width: size,
        height: size,
        WebkitMaskImage: 'radial-gradient(circle closest-side, #000 64%, transparent 100%)',
        maskImage: 'radial-gradient(circle closest-side, #000 64%, transparent 100%)',
        ...style,
      };

  return (
    <div className={className} style={wrapStyle} aria-hidden>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 30, position: [0, 0, dist] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={[tint]} />
        {bleed && <LeftBiasedCamera />}
        <Suspense fallback={null}>
          <ambientLight intensity={isStar ? 0.95 : 0.72} />
          <hemisphereLight args={['#6a7ab0', '#40352a', 0.45]} />
          {!isStar && (
            <>
              <directionalLight position={[-3.2, 2.6, 3.4]} intensity={2.1} color="#fff2df" />
              {/* contre-jour doux : évite un limbe trop sombre en « portrait » */}
              <directionalLight position={[3.4, -1.2, 1.8]} intensity={0.55} color="#9fb4e0" />
            </>
          )}
          <Sphere body={body} silhouette={silhouette} spin={spin} moons={moons} />
          <EffectComposer multisampling={0}>
            <Bloom
              mipmapBlur
              kernelSize={KernelSize.LARGE}
              luminanceThreshold={isStar ? 0.5 : 0.85}
              luminanceSmoothing={0.4}
              intensity={isStar ? 0.9 : 0.3}
              radius={0.7}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default BodyView3D;
