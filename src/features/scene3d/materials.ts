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

// ---- outils de surface procédurale --------------------------------------

type RGB = [number, number, number];

const parseHex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** PRNG déterministe semé par l'id : la même planète a toujours la même surface. */
function seededRnd(id: string) {
  let seed = 0x9e3779b9 ^ id.length;
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 0x85ebca6b);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bruit fractal (fBm) tuilable en longitude : les octaves bouclent sur `u`
 * pour que la couture de la sphère reste invisible ; `v` est pincé aux pôles.
 */
function fbmFactory(rnd: () => number, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, i) => {
    const gw = 6 * 2 ** i;
    const gh = 3 * 2 ** i;
    return { gw, gh, amp: 0.6 ** i, grid: Float32Array.from({ length: gw * gh }, () => rnd()) };
  });
  const norm = layers.reduce((s, l) => s + l.amp, 0);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sample = (l: (typeof layers)[number], u: number, v: number) => {
    const x = u * l.gw;
    const y = v * l.gh;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const g = (gx: number, gy: number) => {
      gx = ((gx % l.gw) + l.gw) % l.gw;
      gy = gy < 0 ? 0 : gy > l.gh - 1 ? l.gh - 1 : gy;
      return l.grid[gy * l.gw + gx];
    };
    const a = g(x0, y0);
    const b = g(x0 + 1, y0);
    const c = g(x0, y0 + 1);
    const d = g(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
  return (u: number, v: number) => {
    let sum = 0;
    for (const l of layers) sum += l.amp * sample(l, u, v);
    return sum / norm;
  };
}

interface SurfaceStyle {
  /** base peinte pixel par pixel */
  kind: 'rocky' | 'earth' | 'mars' | 'venus' | 'io' | 'europa' | 'pluto' | 'icy';
  craters?: boolean;
  craterDensity?: number;
  /** grandes plaines sombres (mers lunaires, terrains anciens de Ganymède) */
  maria?: boolean;
  /** fractures type Europe */
  lineae?: boolean;
  /** stries sombres type Triton */
  darkStreaks?: boolean;
}

function surfaceStyle(body: Body): SurfaceStyle {
  switch (body.id) {
    case 'terre':
      return { kind: 'earth' };
    case 'mars':
      return { kind: 'mars', craters: true, craterDensity: 14 };
    case 'venus':
      return { kind: 'venus' };
    case 'io':
      return { kind: 'io' };
    case 'europe':
      return { kind: 'europa', lineae: true, craters: true, craterDensity: 5 };
    case 'lune':
      return { kind: 'rocky', craters: true, craterDensity: 46, maria: true };
    case 'mercure':
      return { kind: 'rocky', craters: true, craterDensity: 54 };
    case 'ganymede':
      return { kind: 'rocky', craters: true, craterDensity: 28, maria: true };
    case 'callisto':
      return { kind: 'rocky', craters: true, craterDensity: 62 };
    case 'ceres':
    case 'charon':
      return { kind: 'rocky', craters: true, craterDensity: 24 };
    case 'phobos':
    case 'deimos':
      return { kind: 'rocky', craters: true, craterDensity: 20 };
    case 'pluton':
      return { kind: 'pluto' };
    case 'triton':
      return { kind: 'icy', darkStreaks: true };
    case 'titan':
      return { kind: 'icy' };
    case 'encelade':
      return { kind: 'icy', craters: true, craterDensity: 8 };
    default:
      return { kind: body.type === 'ice' ? 'icy' : 'rocky' };
  }
}

/**
 * Surface stylisée des telluriques / lunes. Base en bruit fractal (continents,
 * mers, calottes) puis features reconnaissables par corps : cratères en relief,
 * fractures d'Europe, taches volcaniques d'Io, cœur de Pluton…  Zéro asset.
 */
export function terrainTexture(body: Body): THREE.Texture {
  return memo(`terrain-${body.id}`, () => {
    const W = 512;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;

    const rnd = seededRnd(body.id);
    const fbm = fbmFactory(rnd, 5);
    const warp = fbmFactory(rnd, 3); // domaine perturbé → côtes moins « patates »
    const light = parseHex(body.gradient[0]);
    const mid = parseHex(body.gradient[1]);
    const dark = parseHex(body.gradient[2]);
    const style = surfaceStyle(body);

    // 1 — base peinte pixel par pixel
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H;
      const lat = Math.abs(v - 0.5) * 2; // 0 équateur → 1 pôle
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W;
        const wu = u + (warp(u, v) - 0.5) * 0.06;
        const n = fbm(wu, v);
        let col: RGB;

        switch (style.kind) {
          case 'earth': {
            if (n < 0.5) {
              col = mixRGB(dark, mid, smoothstep(0.26, 0.5, n));
            } else {
              col = mixRGB([74, 116, 66], [150, 132, 92], smoothstep(0.5, 0.86, n));
              col = mixRGB(col, [120, 96, 74], smoothstep(0.8, 1, n));
            }
            col = mixRGB(col, [236, 240, 244], smoothstep(0.74, 0.93, lat + (n - 0.5) * 0.12));
            break;
          }
          case 'mars': {
            col = mixRGB(dark, light, smoothstep(0.15, 0.85, n));
            const m = fbm(wu * 0.5 + 0.3, v * 0.5);
            col = mixRGB(col, [96, 58, 44], smoothstep(0.52, 0.34, m) * 0.7);
            col = mixRGB(col, [238, 236, 232], smoothstep(0.82, 0.95, lat) * (0.55 + 0.45 * n));
            break;
          }
          case 'io': {
            col = mixRGB(mid, light, smoothstep(0.34, 0.82, n));
            col = mixRGB(col, dark, smoothstep(0.4, 0.16, n) * 0.6);
            col = mixRGB(col, [248, 240, 208], smoothstep(0.74, 0.97, n) * 0.7);
            col = mixRGB(col, [176, 128, 54], smoothstep(0.5, 0.34, n) * 0.4);
            break;
          }
          case 'europa': {
            col = mixRGB(mid, light, smoothstep(0.35, 0.82, n));
            col = mixRGB(col, [210, 224, 230], 0.22);
            break;
          }
          case 'venus': {
            const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 7 + n * 3);
            col = mixRGB(mid, light, 0.35 + 0.4 * n);
            col = mixRGB(col, dark, band * 0.06);
            break;
          }
          case 'pluto': {
            col = mixRGB(dark, light, smoothstep(0.2, 0.85, n));
            break;
          }
          case 'icy': {
            col = mixRGB(mid, light, 0.4 + 0.45 * n);
            break;
          }
          default: {
            col =
              n < 0.5
                ? mixRGB(dark, mid, smoothstep(0.15, 0.5, n))
                : mixRGB(mid, light, smoothstep(0.5, 0.9, n));
          }
        }

        if (style.maria) {
          const m = fbm(wu * 0.6 + 1.7, v * 0.6 + 0.4);
          col = mixRGB(col, mixRGB(dark, [52, 52, 60], 0.4), smoothstep(0.46, 0.3, m) * 0.6);
        }
        // ombrage latitudinal doux
        col = mixRGB(col, dark, lat * lat * 0.26);

        const i = (y * W + x) * 4;
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // adoucit l'escalier des côtes (le lattice fBm est basse résolution)
    ctx.filter = 'blur(1px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';

    // 2 — features, dupliquées à ±W pour masquer la couture
    const wrapped = (draw: (dx: number) => void) => {
      for (const dx of [-W, 0, W]) draw(dx);
    };

    const crater = (x: number, y: number, r: number) => {
      const rx = r / Math.max(0.4, Math.sin(Math.PI * (y / H)));
      const squash = 0.85 + rnd() * 0.3;
      wrapped((dx) => {
        // cuvette sombre
        const g = ctx.createRadialGradient(x + dx, y, r * 0.1, x + dx, y, r);
        g.addColorStop(0, 'rgba(0,0,0,0.26)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.09)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + dx, y, rx, r * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        // rebord clair, fin anneau
        ctx.lineWidth = Math.max(0.6, r * 0.08);
        ctx.strokeStyle = 'rgba(255,246,232,0.09)';
        ctx.beginPath();
        ctx.ellipse(x + dx, y, rx * 0.9, r * squash * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    if (style.craters) {
      const count = style.craterDensity ?? 40;
      for (let i = 0; i < count; i++) {
        const big = rnd() < 0.13;
        crater(rnd() * W, 14 + rnd() * (H - 28), (big ? 15 : 4) + rnd() * (big ? 24 : 11));
      }
    }

    if (style.lineae || style.darkStreaks) {
      const lines = style.lineae ? 16 : 8;
      for (let i = 0; i < lines; i++) {
        const yBase = 18 + rnd() * (H - 36);
        const amp = 6 + rnd() * 22;
        const freq = 1 + Math.floor(rnd() * 3);
        const phase = rnd() * Math.PI * 2;
        ctx.strokeStyle = style.lineae
          ? `rgba(150,86,64,${(0.16 + rnd() * 0.22).toFixed(2)})`
          : `rgba(58,42,56,${(0.18 + rnd() * 0.2).toFixed(2)})`;
        ctx.lineWidth = 0.8 + rnd() * 2.4;
        wrapped((dx) => {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 6) {
            const yy = yBase + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp;
            if (x === 0) ctx.moveTo(x + dx, yy);
            else ctx.lineTo(x + dx, yy);
          }
          ctx.stroke();
        });
      }
    }

    if (style.kind === 'io') {
      for (let i = 0; i < 30; i++) {
        const x = rnd() * W;
        const y = 12 + rnd() * (H - 24);
        const r = 4 + rnd() * 14;
        const t = rnd();
        const ry = r * (0.7 + rnd() * 0.5);
        wrapped((dx) => {
          const g = ctx.createRadialGradient(x + dx, y, r * 0.2, x + dx, y, r);
          if (t < 0.34) {
            // patera : centre sombre net + auréole rousse
            g.addColorStop(0, 'rgba(30,17,12,0.85)');
            g.addColorStop(0.5, 'rgba(120,40,24,0.6)');
            g.addColorStop(1, 'rgba(120,40,24,0)');
          } else if (t < 0.68) {
            // coulée de soufre orange
            g.addColorStop(0, 'rgba(214,92,34,0.7)');
            g.addColorStop(0.6, 'rgba(214,92,34,0.35)');
            g.addColorStop(1, 'rgba(214,92,34,0)');
          } else {
            // dépôt de SO2 blanc-jaune
            g.addColorStop(0, 'rgba(250,244,214,0.78)');
            g.addColorStop(0.6, 'rgba(250,244,214,0.35)');
            g.addColorStop(1, 'rgba(250,244,214,0)');
          }
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(x + dx, y, r, ry, rnd() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    if (style.kind === 'earth') {
      for (let i = 0; i < 16; i++) {
        const x = rnd() * W;
        const y = 26 + rnd() * (H - 52);
        const r = 10 + rnd() * 30;
        const sx = 1.6 + rnd();
        wrapped((dx) => {
          const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
          g.addColorStop(0, `rgba(248,250,255,${(0.12 + rnd() * 0.16).toFixed(2)})`);
          g.addColorStop(1, 'rgba(248,250,255,0)');
          ctx.save();
          ctx.translate(x + dx, y);
          ctx.scale(sx, 1);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
    }

    if (style.kind === 'mars') {
      // Valles Marineris : longue balafre sous l'équateur
      ctx.strokeStyle = 'rgba(70,36,24,0.4)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let x = W * 0.08; x <= W * 0.62; x += 6) {
        const yy = H * 0.56 + Math.sin((x / W) * 12) * 3;
        if (x === W * 0.08) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    if (style.kind === 'pluto') {
      // Cthulhu Macula : bande sombre le long de l'équateur
      wrapped((dx) => {
        const g = ctx.createRadialGradient(W * 0.2 + dx, H * 0.52, 6, W * 0.2 + dx, H * 0.52, W * 0.2);
        g.addColorStop(0, 'rgba(46,28,30,0.42)');
        g.addColorStop(1, 'rgba(46,28,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(W * 0.2 + dx, H * 0.52, W * 0.2, H * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // Tombaugh Regio : plaine claire en forme de cœur
      const hx = W * 0.55;
      const hy = H * 0.54;
      const hr = W * 0.07;
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(240,232,214,0.9)';
      wrapped((dx) => {
        ctx.beginPath();
        ctx.arc(hx + dx - hr * 0.62, hy - hr * 0.25, hr * 0.82, 0, Math.PI * 2);
        ctx.arc(hx + dx + hr * 0.62, hy - hr * 0.25, hr * 0.82, 0, Math.PI * 2);
        ctx.moveTo(hx + dx - hr * 1.35, hy);
        ctx.lineTo(hx + dx + hr * 1.35, hy);
        ctx.lineTo(hx + dx, hy + hr * 1.7);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
      ctx.filter = 'none';
    }

    // 3 — grain fin
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 1200; i++) {
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
  return normalFromTexture(src, `${banded ? 'band' : 'terrain'}-${body.id}`, banded ? 0.6 : 0.8);
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

/**
 * Fond spatial (dôme équirectangulaire) : dégradé vertical, nébuleuses colorées
 * diffuses, une Voie lactée diagonale (bande lumineuse + voiles de poussière
 * sombre) et une fine poussière d'étoiles. Tout est peint une seule fois sur un
 * canvas puis mémoïsé — coût nul à l'exécution. Les motifs horizontaux sont
 * répétés à ±W pour que le raccord de la sphère reste invisible.
 */
export function backdropTexture(): THREE.Texture {
  return memo('backdrop', () => {
    const W = 1024;
    const H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;

    // graine déterministe : le fond est toujours le même
    let s = 0x2545f4c1;
    const rnd = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };

    // 1 — dégradé de base, plus profond en haut et en bas
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0819');
    g.addColorStop(0.34, '#141031');
    g.addColorStop(0.62, '#1a1436');
    g.addColorStop(1, '#080611');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // tache diffuse, répétée à gauche/droite pour un raccord invisible
    const blob = (x: number, y: number, r: number, col: string, op: GlobalCompositeOperation = 'source-over') => {
      ctx.globalCompositeOperation = op;
      for (const dx of [-W, 0, W]) {
        const rg = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        rg.addColorStop(0, col);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    // 2 — grandes nébuleuses colorées (additif léger : elles « brillent »)
    blob(W * 0.22, H * 0.3, W * 0.34, 'rgba(126,58,150,0.13)', 'lighter');
    blob(W * 0.8, H * 0.64, W * 0.36, 'rgba(52,86,164,0.12)', 'lighter');
    blob(W * 0.54, H * 0.2, W * 0.24, 'rgba(58,140,150,0.08)', 'lighter');
    blob(W * 0.05, H * 0.82, W * 0.28, 'rgba(150,74,120,0.09)', 'lighter');

    // 3 — Voie lactée : bande diagonale douce le long d'une sinusoïde
    const bandY = (x: number) => H * 0.52 + Math.sin((x / W) * Math.PI * 2 + 0.6) * H * 0.16;
    for (let i = 0; i < 130; i++) {
      const x = rnd() * W;
      const y = bandY(x) + (rnd() - 0.5) * H * 0.34;
      const d = Math.abs(y - bandY(x)) / (H * 0.22);
      const a = Math.max(0, 0.05 * (1 - d)) * (0.4 + rnd() * 0.6);
      blob(x, y, W * (0.04 + rnd() * 0.09), `rgba(198,206,240,${a.toFixed(3)})`, 'lighter');
    }
    // voiles de poussière sombre qui découpent la bande
    for (let i = 0; i < 34; i++) {
      const x = rnd() * W;
      const y = bandY(x) + (rnd() - 0.5) * H * 0.24;
      blob(x, y, W * (0.03 + rnd() * 0.07), `rgba(6,5,14,${(0.1 + rnd() * 0.16).toFixed(3)})`);
    }

    // 4 — marbrure : casse la platitude du dégradé
    for (let i = 0; i < 26; i++) {
      const dark = rnd() > 0.5;
      blob(
        rnd() * W,
        rnd() * H,
        W * (0.12 + rnd() * 0.16),
        dark ? `rgba(5,4,12,${(0.05 + rnd() * 0.05).toFixed(3)})` : `rgba(120,110,170,${(0.03 + rnd() * 0.04).toFixed(3)})`,
        dark ? 'source-over' : 'lighter',
      );
    }

    ctx.filter = 'blur(2px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';

    // 5 — poussière d'étoiles fine, plus dense le long de la bande (net, après flou)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 620; i++) {
      const nearBand = rnd() < 0.62;
      const x = rnd() * W;
      const y = nearBand ? bandY(x) + (rnd() - 0.5) * H * 0.4 : rnd() * H;
      const r = rnd() < 0.9 ? 0.6 : 1.2;
      const a = 0.25 + rnd() * 0.5;
      const warm = rnd() < 0.22;
      ctx.fillStyle = warm
        ? `rgba(255,224,196,${a.toFixed(3)})`
        : `rgba(220,228,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

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
