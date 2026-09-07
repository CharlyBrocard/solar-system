import type { ReactNode } from 'react';
import type { Body } from '@/data/types';

/**
 * Contrat partagé de la scène orbitale : les vues (`SystemView`, `ZoneView`,
 * `EntryScreen`) construisent ces props ; `OrbitalScene3D` les consomme.
 */

export interface SceneRing {
  radius: number;
  dashed?: boolean;
  color: string;
  width: number;
  highlight?: boolean;
}

export interface ScenePin {
  body: Body;
  revealed: boolean;
  discovered: boolean;
}

export interface SceneDot {
  a: number;
  r: number;
  s: number;
  c: string;
}

export interface SceneBeltMarker {
  label: string;
  angle: number;
  radius: number;
  locked: boolean;
  onClick: () => void;
}

type Pan = { x: number; y: number };

export interface OrbitalSceneProps {
  background: string;
  /** ancre du plan orbital, en % du viewport */
  origin: [number, number];
  /** zoom utilisateur : 1 = cadrage par défaut */
  zoom: number;
  pan: Pan;
  onZoom: (next: number) => void;
  onPan: (next: Pan) => void;
  zoomRange?: [number, number];
  rings: SceneRing[];
  centerBody?: Body;
  centerSize?: number;
  onCenterClick?: () => void;
  pins: ScenePin[];
  decorativeDots?: SceneDot[];
  beltMarker?: SceneBeltMarker;
  /** 0 = brume serrée, 1 = dégagé */
  fogOpenness: number;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (b: Body) => void;
  /** false = décor : ni molette ni glisser (écran d'entrée). */
  interactive?: boolean;
  /** false = fige la dérive orbitale. */
  drift?: boolean;
  /** id d'un corps vers lequel « plonger » : anime (zoom + fondu) puis `onDiveComplete`. */
  diveTo?: string | null;
  onDiveComplete?: (bodyId: string) => void;
  children?: ReactNode;
}

/** Couleur d'anneau crème translucide. */
export function ringColor(opacity: number): string {
  return `rgba(246, 235, 214, ${opacity})`;
}
