import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Halo d'atmosphère : coque arrière avec un terme de Fresnel — la lueur se
 * concentre au limbe (diffusion atmosphérique) au lieu d'être une coque
 * translucide uniforme. Additif, ne s'écrit pas dans le depth buffer.
 */
export function AtmosphereRim({
  color,
  radius = 1,
  scale = 1.025,
  power = 3,
  intensity = 0.7,
}: {
  color: string;
  radius?: number;
  scale?: number;
  power?: number;
  intensity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // DoubleSide : la face avant remplit le limbe sombre de la planète, la
        // face arrière ajoute la lueur externe.
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uPower: { value: power },
          uIntensity: { value: intensity },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float f = pow(1.0 - abs(dot(vNormal, vView)), uPower);
            gl_FragColor = vec4(uColor * f * uIntensity, f);
          }
        `,
      }),
    // le matériau est créé une fois ; les uniforms sont mis à jour ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uColor.value.set(color);
    material.uniforms.uPower.value = power;
    material.uniforms.uIntensity.value = intensity;
  }, [material, color, power, intensity]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={scale} material={material}>
      <sphereGeometry args={[radius, 32, 32]} />
    </mesh>
  );
}
