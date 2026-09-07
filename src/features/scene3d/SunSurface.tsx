import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Surface animée du Soleil — bruit simplex 3D échantillonné en espace objet
 * (pas de couture UV) : granulation qui coule, régions actives qui dérivent,
 * léger assombrissement au limbe pour le volume. Zéro asset.
 *
 * `useSunMaterial()` renvoie le `ShaderMaterial` (à poser sur la sphère du
 * Soleil) et fait avancer le temps chaque frame (gelé en `reduced`).
 */

const SIMPLEX = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const VERT = /* glsl */ `
  varying vec3 vObjDir;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vObjDir = normalize(position);
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform int uOctaves;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uHot;
  uniform float uIntensity;
  varying vec3 vObjDir;
  varying vec3 vNormal;
  varying vec3 vView;
  ${SIMPLEX}

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      if (i >= uOctaves) break;
      sum += amp * snoise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    float t = uTime * 0.07;
    vec3 p = vObjDir * 3.3;
    // déformation du domaine : la granulation « coule »
    vec3 q = vec3(
      fbm(p + vec3(0.0) + t),
      fbm(p + vec3(5.2, 1.3, 2.7) + t * 1.1),
      fbm(p + vec3(2.9, 7.1, 0.4) - t * 0.9)
    );
    float n = fbm(p + q * 0.6 + t * 0.4) * 0.5 + 0.5;
    // sillons sombres discrets entre les cellules
    float ar = smoothstep(0.62, 0.95, fbm(p * 0.55 + t * 0.12) * 0.5 + 0.5);
    float bright = clamp(n + ar * 0.22, 0.0, 1.3);

    // rampe resserrée vers le chaud : le fond de teinte reste lumineux
    vec3 col = mix(uDeep, uMid, smoothstep(0.32, 0.58, bright));
    col = mix(col, uHot, smoothstep(0.58, 0.95, bright));

    // léger assombrissement au limbe → volume
    float limb = pow(clamp(abs(dot(vNormal, vView)), 0.0, 1.0), 0.4);
    col *= mix(0.78, 1.12, limb);

    gl_FragColor = vec4(col * uIntensity, 1.0);
  }
`;

export function useSunMaterial({
  reduced,
  octaves,
  intensity = 1.9,
}: {
  reduced: boolean;
  octaves: number;
  intensity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        toneMapped: false,
        uniforms: {
          uTime: { value: Math.random() * 100 },
          uOctaves: { value: octaves },
          uIntensity: { value: intensity },
          uDeep: { value: new THREE.Color('#e06a1e') },
          uMid: { value: new THREE.Color('#ffbe4d') },
          uHot: { value: new THREE.Color('#fff4cc') },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      }),
    // uniforms mis à jour ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uOctaves.value = octaves;
    material.uniforms.uIntensity.value = intensity;
  }, [material, octaves, intensity]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    if (!reduced) material.uniforms.uTime.value += dt;
  });

  return material;
}

/** Matériau du Soleil, prêt à poser sur un `<mesh>` (`attach="material"`). */
export function SunMaterial(props: {
  reduced: boolean;
  octaves: number;
  intensity?: number;
}) {
  const material = useSunMaterial(props);
  return <primitive object={material} attach="material" />;
}
