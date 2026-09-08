import { Suspense, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { shipDef } from '@/components/Ship';
import { prefersReducedMotion } from './scene3d';
import { useQuality } from './quality';

/**
 * Petit vaisseau en 3D (bas-poly, `flatShading` → look « jouet ») pour l'aperçu
 * de l'onboarding et du profil. Zéro asset : tout est fait de primitives.
 *
 * Un seul `<Canvas>` par instance ; on ne l'affiche qu'une fois à l'écran
 * (l'aperçu sélectionné). La rangée de choix reste en SVG (`<Ship>`).
 */

const HULL = '#efe6d0';
const HULL_DIM = '#d7cbe8';
const TRIM = '#2b2350';

function Hull(props: ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial color={HULL} flatShading roughness={0.62} metalness={0.05} {...props} />;
}

function Navette({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.24, 0.32, 1.0, 18]} />
        <Hull />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.24, 0.52, 18]} />
        <Hull />
      </mesh>
      <mesh position={[0, 0.16, 0.24]} rotation={[-0.3, 0, 0]}>
        <circleGeometry args={[0.11, 20]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, -0.4, 0]} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
          <mesh position={[0, -0.02, 0.24]} rotation={[0.42, 0, 0]}>
            <boxGeometry args={[0.05, 0.42, 0.34]} />
            <meshStandardMaterial color={accent} flatShading roughness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.58, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.22, 18]} />
        <meshStandardMaterial color={TRIM} flatShading />
      </mesh>
    </group>
  );
}

function Soucoupe({ accent }: { accent: string }) {
  return (
    <group rotation={[0.12, 0, 0]}>
      <mesh scale={[1, 0.26, 1]}>
        <sphereGeometry args={[0.78, 28, 18]} />
        <Hull />
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.5}
          transparent
          opacity={0.92}
        />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.52, -0.1, Math.sin(a) * 0.52]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Sonde({ accent }: { accent: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.46, 0.6, 0.46]} />
        <Hull />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.66, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.86, 0.46, 0.035]} />
            <meshStandardMaterial color="#41569c" flatShading roughness={0.4} metalness={0.25} emissive="#2b3a7a" emissiveIntensity={0.25} />
          </mesh>
          {[-0.28, 0, 0.28].map((x) => (
            <mesh key={x} position={[x, 0, 0.024]}>
              <boxGeometry args={[0.03, 0.46, 0.01]} />
              <meshStandardMaterial color={TRIM} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.024]}>
            <boxGeometry args={[0.86, 0.03, 0.01]} />
            <meshStandardMaterial color={TRIM} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.42, 0.05]} rotation={[-0.45, 0, 0]}>
        <sphereGeometry args={[0.22, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.3, 0.02]} rotation={[-0.45, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.26, 8]} />
        <Hull />
      </mesh>
    </group>
  );
}

function Chasseur({ accent }: { accent: string }) {
  return (
    <group rotation={[0.1, 0, 0]}>
      <mesh>
        <capsuleGeometry args={[0.14, 0.9, 6, 16]} />
        <Hull />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.34, -0.16, 0]} rotation={[0, 0, s * -0.5]}>
          <boxGeometry args={[0.62, 0.04, 0.5]} />
          <meshStandardMaterial color={HULL_DIM} flatShading roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, 0.13]}>
        <sphereGeometry args={[0.12, 18, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.65} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, -0.52, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.09, 0.18, 14]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

function Lander({ accent }: { accent: string }) {
  return (
    <group>
      {/* corps compact */}
      <mesh>
        <icosahedronGeometry args={[0.28, 0]} />
        <Hull />
      </mesh>
      {/* hublot */}
      <mesh position={[0, 0.05, 0.25]} rotation={[0.16, 0, 0]}>
        <circleGeometry args={[0.1, 20]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.75} />
      </mesh>
      {/* tuyère, rentrée sous le corps pour ne pas passer pour un pied */}
      <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.08, 0.1, 14]} />
        <meshStandardMaterial color={TRIM} flatShading />
      </mesh>
      {/* antenne */}
      <mesh position={[0.12, 0.28, -0.04]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <Hull />
      </mesh>
      {/* trépied : 3 pieds écartés, un vers l'arrière */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0, -0.22, 0.16]} rotation={[0.5, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
              <meshStandardMaterial color={HULL_DIM} flatShading />
            </mesh>
            {/* patin plat, posé à l'horizontale */}
            <mesh position={[0, -0.42, 0.32]}>
              <cylinderGeometry args={[0.12, 0.14, 0.045, 6]} />
              <meshStandardMaterial color={TRIM} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const MODELS: { Comp: (p: { accent: string }) => ReactElement; scale: number; y: number }[] = [
  { Comp: Navette, scale: 1.0, y: -0.02 },
  { Comp: Soucoupe, scale: 1.08, y: 0.06 },
  { Comp: Sonde, scale: 0.96, y: -0.04 },
  { Comp: Chasseur, scale: 1.02, y: 0 },
  { Comp: Lander, scale: 1.04, y: 0.0 },
];

/**
 * Juste les primitives d'un vaisseau (sans `<Canvas>` ni animation), à intégrer
 * dans une autre scène r3f — p. ex. le vaisseau qui voyage sur la carte.
 * Le modèle est dessiné « nez vers le haut » (+Y).
 */
export function ShipMesh({ id }: { id: number }) {
  const { Comp, scale } = MODELS[id] ?? MODELS[0];
  const accent = shipDef(id).accent;
  return (
    <group scale={scale}>
      <Comp accent={accent} />
    </group>
  );
}

/** La soucoupe glisse à plat ; les autres pointent le nez dans la direction. */
export const shipBanks = (id: number) => id !== 1;

function ShipModel({ id, reduced }: { id: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { Comp, scale, y } = MODELS[id] ?? MODELS[0];
  const accent = shipDef(id).accent;

  useFrame((state, dt) => {
    if (!group.current) return;
    if (reduced) {
      group.current.rotation.set(0.15, -0.6, 0);
      return;
    }
    group.current.rotation.y += dt * 0.5;
    group.current.rotation.x = 0.14 + Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
    group.current.position.y = y + Math.sin(state.clock.elapsedTime * 0.9) * 0.04;
  });

  return (
    <group ref={group} position={[0, y, 0]} scale={scale}>
      <Comp accent={accent} />
    </group>
  );
}

interface Ship3DProps {
  id: number;
  size: number;
  className?: string;
  style?: CSSProperties;
  /** couleur de fond de la tuile (le canvas est opaque) */
  tint?: string;
}

export function Ship3D({ id, size, className, style, tint = '#171232' }: Ship3DProps) {
  const q = useQuality();
  const reduced = useMemo(prefersReducedMotion, []);

  return (
    <div
      className={className}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        overflow: 'hidden',
        background: tint,
        boxShadow: `inset 0 0 0 1px rgba(246, 236, 214, 0.12)`,
        ...style,
      }}
    >
      <Canvas
        key={q.tier}
        dpr={q.dpr}
        gl={{ antialias: q.antialias, powerPreference: q.powerPreference }}
        camera={{ fov: 30, position: [0, 0.15, 3.0] }}
      >
        <color attach="background" args={[tint]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <hemisphereLight args={['#8b9bd0', '#3a2f24', 0.5]} />
          <directionalLight position={[2.4, 3, 3.2]} intensity={1.9} color="#fff2df" />
          <directionalLight position={[-3, -1, 1.5]} intensity={0.5} color="#9fb4e0" />
          <ShipModel id={id} reduced={reduced} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Ship3D;
