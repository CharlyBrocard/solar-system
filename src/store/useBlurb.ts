import type { Body } from '@/data/types';
import { simpleBlurb } from '@/data/blurbsSimple';
import { useProgress } from './progress';

/**
 * Le texte de présentation d'un objet, adapté à la préférence « mode simplifié ».
 * `simplified` actif → version courte de `src/data/blurbsSimple.ts` (retombe sur
 * le blurb normal si aucune n'existe).
 */
export function useBlurb(body: Body | null | undefined): string {
  const simplified = useProgress((s) => s.prefs.simplified);
  if (!body) return '';
  return simplified ? simpleBlurb(body.id, body.blurb) : body.blurb;
}
