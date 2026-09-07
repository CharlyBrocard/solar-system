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

/** Anneaux type Saturne : disque diffus + fine structure + division de Cassini. */
export function ringTexture(): THREE.Texture {
  return memo('saturn-rings', () => {
    const N = 512;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = 8;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < N; x++) {
      const v = x / N;
      // opacité de fond douce (bord interne plus léger, corps dense, bord externe qui s'efface)
      let a = 0.6 + 0.09 * Math.sin(v * 16) + 0.03 * Math.sin(v * 44);
      a *= THREE.MathUtils.smoothstep(v, 0.0, 0.18) * (1 - THREE.MathUtils.smoothstep(v, 0.8, 1));
      // division de Cassini, adoucie
      const cassini = 1 - 0.8 * Math.exp(-Math.pow((v - 0.63) / 0.03, 2));
      a *= cassini;
      const shade = 212 + Math.floor(12 * Math.sin(v * 18));
      ctx.fillStyle = `rgba(${shade},${shade - 24},${shade - 66},${Math.max(0, a).toFixed(3)})`;
      ctx.fillRect(x, 0, 1, 8);
    }
    ctx.filter = 'blur(1px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Sprite radial (halo du Soleil, points de brume…). */
export function radialSprite(key: string, stops: [number, string][]): THREE.Texture {
  return memo(`sprite-${key}`, () => {
    const N = 384;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
    // léger grain : casse le banding des dégradés 8 bits une fois étirés + bloomés
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(Math.random() * N, Math.random() * N, 1, 1);
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Dégradé vertical du fond spatial + deux nébuleuses très diffuses. */
export function backdropTexture(): THREE.Texture {
  return memo('backdrop', () => {
    const W = 1024;
    const H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c0a1e');
    g.addColorStop(0.5, '#171334');
    g.addColorStop(1, '#0a0817');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const blob = (x: number, y: number, r: number, col: string) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    };
    blob(W * 0.24, H * 0.32, W * 0.28, 'rgba(120,60,140,0.16)');
    blob(W * 0.78, H * 0.6, W * 0.3, 'rgba(60,80,150,0.14)');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Surface du Soleil : granulation chaude (évite le disque plat). */
export function sunTexture(): THREE.Texture {
  return memo('sun-surface', () => {
    const N = 512;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = N;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffd47e';
    ctx.fillRect(0, 0, N, N);
    // granulation fine et dense
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * N;
      const y = Math.random() * N;
      const r = 1 + Math.random() * 4;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      const t = Math.random();
      rg.addColorStop(
        0,
        t < 0.5 ? 'rgba(255,248,214,0.32)' : t < 0.8 ? 'rgba(246,158,66,0.28)' : 'rgba(224,110,40,0.24)',
      );
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // quelques taches solaires plus sombres, discrètes
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * N;
      const y = Math.random() * N;
      const r = 5 + Math.random() * 9;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(184,102,44,0.2)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.filter = 'blur(1px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}
