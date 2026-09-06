import * as THREE from 'three';
import type { Body } from '@/data/types';

/**
 * Fabriques de textures procédurales pour la scène 3D — zéro asset.
 * Toutes en canvas 2D → `CanvasTexture`. Mises en cache par id d'objet.
 */

const cache = new Map<string, THREE.Texture>();

function memo(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

/** Bandes horizontales pour les géantes (+ Grande Tache Rouge pour Jupiter). */
export function bandedTexture(body: Body): THREE.Texture {
  return memo(`band-${body.id}`, () => {
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
      const h = (H / 9) * (0.55 + Math.random() * 0.9);
      ctx.fillStyle = tones[i % tones.length];
      ctx.fillRect(0, y, W, h + 1);
      y += h;
      i++;
    }

    ctx.filter = 'blur(3px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';

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
  });
}

/** Léger dégradé pôle → équateur pour les telluriques / lunes. */
export function terrainTexture(body: Body): THREE.Texture {
  return memo(`terrain-${body.id}`, () => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const [light, mid, dark] = body.gradient;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, light);
    g.addColorStop(0.42, mid);
    g.addColorStop(0.66, dark);
    g.addColorStop(1, mid);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    // quelques taches douces
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? light : dark;
      ctx.beginPath();
      ctx.arc(Math.random() * 4, Math.random() * 128, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Anneaux type Saturne : bandes concentriques + division de Cassini. */
export function ringTexture(): THREE.Texture {
  return memo('saturn-rings', () => {
    const N = 256;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = 8;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < N; x++) {
      const v = x / N;
      let a = 0.5 + 0.35 * Math.sin(v * 42);
      if (v > 0.58 && v < 0.66) a *= 0.12;
      if (v < 0.05 || v > 0.98) a = 0;
      const shade = 205 + Math.floor(28 * Math.sin(v * 30));
      ctx.fillStyle = `rgba(${shade},${shade - 22},${shade - 62},${a})`;
      ctx.fillRect(x, 0, 1, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Sprite radial (halo du Soleil, points de brume…). */
export function radialSprite(key: string, stops: [number, string][]): THREE.Texture {
  return memo(`sprite-${key}`, () => {
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
  });
}

/** Dégradé vertical du fond spatial. */
export function backdropTexture(): THREE.Texture {
  return memo('backdrop', () => {
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
  });
}
