import type { Body } from './types';
import { TYPE_LABEL, bodyById } from './bodies';
import { ZONE_META } from './zones';

const nf = new Intl.NumberFormat('fr-FR');

/** Les 8 planètes, dans l'ordre, pour l'ordinal « 4ᵉ planète ». */
const PLANET_ORDER = [
  'mercure',
  'venus',
  'terre',
  'mars',
  'jupiter',
  'saturne',
  'uranus',
  'neptune',
];

const DWARF_PLANETS = new Set(['ceres', 'pluton', 'eris', 'makemake', 'haumea']);

export function fmtKm(km: number): string {
  if (!km) return '—';
  if (km >= 1e9) return `${round1(km / 1e9)} milliards de km`;
  if (km >= 1e6) return `${round1(km / 1e6)} M km`;
  return `${nf.format(Math.round(km))} km`;
}

export function fmtDiameter(km: number): string {
  if (!km) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${nf.format(Math.round(km))} km`;
}

export function fmtDay(hours: number): string {
  if (!hours) return '—';
  if (hours < 48) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  }
  return `${nf.format(Math.round(hours / 24))} jours`;
}

export function fmtYear(days: number): string {
  if (!days) return '—';
  if (days < 1) return `${round1(days * 24)} h`;
  if (days >= 365 * 2) return `${nf.format(Math.round(days / 365))} ans`;
  return `${nf.format(Math.round(days))} jours`;
}

export function fmtTemp(c: number): string {
  const rounded = Math.round(c);
  return `${rounded < 0 ? '−' : ''}${Math.abs(rounded)} °C`;
}

export function fmtGravity(g: number | undefined): string {
  if (g == null) return '—';
  return `${round1(g)} m/s²`;
}

export function planetOrdinal(id: string): number | null {
  const i = PLANET_ORDER.indexOf(id);
  return i === -1 ? null : i + 1;
}

/** Sous-titre d'identité : « 4ᵉ planète · Système interne », « Lune de Jupiter »… */
export function describeBody(body: Body): string {
  const zone = ZONE_META[body.zone].label;

  if (body.type === 'star') return 'Étoile · au centre du système';
  if (body.parent) {
    const parent = bodyById(body.parent);
    return `Lune de ${parent?.name ?? '—'}`;
  }
  if (body.wanderer) {
    if (body.kind === 'probe') return 'Sonde spatiale';
    return 'Comète';
  }

  const ord = planetOrdinal(body.id);
  if (ord) return `${ord}ᵉ planète · ${zone}`;
  if (DWARF_PLANETS.has(body.id)) return `Planète naine · ${zone}`;
  if (body.id === 'sedna') return `Planète naine candidate · ${zone}`;
  if (body.id === 'arrokoth') return `Objet de Kuiper · ${zone}`;
  if (body.zone === 'ceinture') return `Astéroïde · ${zone}`;
  return `${TYPE_LABEL[body.type]} · ${zone}`;
}

/** Comparaison de diamètre à la Terre, en %. */
export function earthDiameterPct(body: Body): number {
  const earth = bodyById('terre');
  if (!earth) return 100;
  return Math.round((body.facts.diameterKm / earth.facts.diameterKm) * 100);
}

function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return nf.format(r);
}
