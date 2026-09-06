import type { Zone } from './types';

export const ZONE_META: Record<
  Zone,
  { label: string; short: string; blurb: string; withArticle: string }
> = {
  interne: {
    label: 'Système interne',
    short: 'Interne',
    withArticle: 'le système interne',
    blurb: 'Le Soleil et les quatre planètes rocheuses, jusqu’à Mars.',
  },
  ceinture: {
    label: "Ceinture d'astéroïdes",
    short: 'Ceinture',
    withArticle: "la ceinture d'astéroïdes",
    blurb: 'Des millions de blocs de roche entre Mars et Jupiter.',
  },
  geantes: {
    label: 'Géantes gazeuses',
    short: 'Géantes',
    withArticle: 'les géantes gazeuses',
    blurb: 'Jupiter, Saturne, Uranus et leurs dizaines de lunes.',
  },
  externe: {
    label: 'Système externe',
    short: 'Externe',
    withArticle: 'le système externe',
    blurb: 'Neptune, la ceinture de Kuiper et les confins glacés.',
  },
};
