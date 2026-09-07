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

    const tones = [mid, dark, mid, light, dark, mid, light, mid, dark, mid];
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

    // assombrit les pôles → évite la calotte brillante au sommet de la sphère
    const pole = ctx.createLinearGradient(0, 0, 0, H);
    pole.addColorStop(0, 'rgba(0,0,0,0.34)');
    pole.addColorStop(0.16, 'rgba(0,0,0,0)');
    pole.addColorStop(0.84, 'rgba(0,0,0,0)');
    pole.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = pole;
    ctx.fillRect(0, 0, W, H);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  });
}

/** Surface stylisée des telluriques / lunes : dégradé latitudinal + reliefs doux. */
export function terrainTexture(body: Body): THREE.Texture {
  return memo(`terrain-${body.id}`, () => {
    const W = 256;
    const H = 128;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const [light, mid, dark] = body.gradient;

    // fond : latitude (pôles plus sombres, équateur clair)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, dark);
    g.addColorStop(0.16, mid);
    g.addColorStop(0.5, light);
    g.addColorStop(0.84, mid);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // PRNG déterministe par id → mêmes continents à chaque rendu
    let seed = 0;
    for (const ch of body.id) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // reliefs / taches douces, dupliqués au bord pour masquer la couture
    for (let i = 0; i < 24; i++) {
      const x = rnd() * W;
      const y = 10 + rnd() * (H - 20);
      const rad = 6 + rnd() * 24;
      ctx.globalAlpha = 0.09 + rnd() * 0.15;
      ctx.fillStyle = rnd() < 0.5 ? dark : light;
      for (const dx of [-W, 0, W]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y, rad, rad * (0.5 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'blur(2px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';

    // grain fin
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  });
}

/**
 * Normal map dérivée de la luminance d'une texture canvas : le relief déjà
 * présent (continents, bandes) accroche alors la lumière au lieu d'être plat.
 * Zéro asset — Sobel sur le canvas source.
 */
export function normalFromTexture(
  source: THREE.Texture,
  key: string,
  strength = 1,
): THREE.Texture {
  return memo(`normal-${key}`, () => {
    const src = source.image as HTMLCanvasElement;
    const W = src.width;
    const H = src.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    // léger flou : le grain fin ne doit pas faire scintiller la lumière
    ctx.filter = 'blur(1px)';
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    const px = ctx.getImageData(0, 0, W, H).data;
    const lum = (x: number, y: number) => {
      const xi = ((x % W) + W) % W;
      const yi = Math.max(0, Math.min(H - 1, y));
      const i = (yi * W + xi) * 4;
      return (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    };
    const out = ctx.createImageData(W, H);
    const s = strength * 2.2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (lum(x + 1, y) - lum(x - 1, y)) * s;
        const dy = (lum(x, y + 1) - lum(x, y - 1)) * s;
        const inv = 1 / Math.hypot(dx, dy, 1);
        const i = (y * W + x) * 4;
        out.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
        out.data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
        out.data[i + 2] = (inv * 0.5 + 0.5) * 255;
        out.data[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  });
}

/** Relief procédural (normal map) d'une planète / lune, dérivé de sa texture. */
export function bodyNormalMap(body: Body): THREE.Texture {
  const banded = !!body.banded;
  const src = banded ? bandedTexture(body) : terrainTexture(body);
  return normalFromTexture(src, `${banded ? 'band' : 'terrain'}-${body.id}`, banded ? 0.6 : 1);
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
    // léger grain : casse le banding des dégradés 8 bits une fois étirés + bloomés.
    // Confiné au disque : les coins doivent rester parfaitement transparents,
    // sinon un sprite très agrandi laisse voir un halo carré.
    ctx.save();
    ctx.beginPath();
    ctx.arc(N / 2, N / 2, N / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(Math.random() * N, Math.random() * N, 1, 1);
    }
    ctx.restore();
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
