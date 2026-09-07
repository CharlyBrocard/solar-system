import { Suspense, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import type { Body } from '@/data/types';
import { bandedTexture, radialSprite, ringTexture, sunTexture, terrainTexture } from './materials';
import { ATMOSPHERE, prefersReducedMotion } from './scene3d';

/** #rrggbb → rgba(r,g,b,a) */
function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Rendu 3D d'un seul astre — même matière/éclairage que la scène orbitale, mais
 * cadré comme un portrait. Utilisé par les fiches `/object`, le moment de
 * découverte et le mode classe.
 *
 * Le `<Canvas>` est OPAQUE (couleur = `tint`, celle du fond hôte) : un canvas
 * transparent laisse un voile carré sur certains GPU. Le bord franc du canvas est
 * juste estompé par un léger masque circulaire CSS.
 */

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
}

function Sphere({ body, silhouette, spin }: Pick<BodyView3DProps, 'body' | 'silhouette' | 'spin'>) {
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
  const atmoGlow = useMemo(
    () =>
      atmosphere
        ? radialSprite(`hero-atmo-${body.id}`, [
            [0, 'rgba(0,0,0,0)'],
            [0.34, 'rgba(0,0,0,0)'],
            [0.41, hexToRgba(atmosphere, 0.24)],
            [0.52, hexToRgba(atmosphere, 0.05)],
            [1, hexToRgba(atmosphere, 0)],
          ])
        : null,
    [atmosphere, body.id],
  );

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
            emissiveIntensity={0.14}
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

      {atmoGlow && (
        <sprite scale={[2.7, 2.7, 1]}>
          <spriteMaterial
            map={atmoGlow}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}

      {body.rings && <Rings />}
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
}: BodyView3DProps) {
  const isStar = body.type === 'star';
  // caméra reculée : anneaux/halo restent dans la zone nette du masque.
  const dist = body.rings ? 9.4 : isStar ? 6.2 : 4.6;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        // estompe seulement le bord franc du canvas (le fond est déjà `tint`).
        WebkitMaskImage: 'radial-gradient(circle closest-side, #000 88%, transparent 100%)',
        maskImage: 'radial-gradient(circle closest-side, #000 88%, transparent 100%)',
        ...style,
      }}
      aria-hidden
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 30, position: [0, 0, dist] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={[tint]} />
        <fog attach="fog" args={[tint, dist + 0.8, dist + 4]} />
        <Suspense fallback={null}>
          <ambientLight intensity={isStar ? 0.95 : 0.5} />
          <hemisphereLight args={['#5a6aa0', '#3a2a1e', 0.35]} />
          {!isStar && (
            <directionalLight position={[-3.2, 2.6, 3.4]} intensity={2.4} color="#fff2df" />
          )}
          <Sphere body={body} silhouette={silhouette} spin={spin} />
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
