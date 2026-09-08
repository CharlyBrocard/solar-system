import type { Badge } from './types';

/**
 * Hauts faits, titres courts et imagés.
 * `premier-pas` est décerné à la 1re découverte ; les autres sont des
 * récompenses de quête (`src/data/quests.ts`).
 */
const BADGES: Badge[] = [
  { id: 'premier-pas', title: 'Premier pas', hint: 'Ouvre ta toute première fiche.' },
  { id: 'explorateur-en-herbe', title: 'Explorateur en herbe', hint: 'Découvre la Terre et Mars.' },
  { id: 'voisins-de-la-terre', title: 'Voisins de la Terre', hint: 'Découvre les quatre planètes rocheuses.' },
  { id: 'passeur-de-ceinture', title: 'Passeur de ceinture', hint: 'Traverse la ceinture d’astéroïdes.' },
  { id: 'chasseur-d-oceans', title: 'Chasseur d’océans', hint: 'Pose une sonde sur Europe.' },
  { id: 'compteur-de-lunes', title: 'Compteur de lunes', hint: 'Retrouve les quatre lunes galiléennes.' },
  { id: 'gardien-des-anneaux', title: 'Gardien des anneaux', hint: 'Va voir Saturne de près.' },
  { id: 'toupie-renversee', title: 'Toupie renversée', hint: 'Va voir Uranus, la planète qui roule sur le côté.' },
  { id: 'balance-cosmique', title: 'Balance cosmique', hint: 'Compare deux mondes.' },
  { id: 'thermometre', title: 'Thermomètre', hint: 'Réussis le quiz du chaud et du froid.' },
  { id: 'maitre-des-horloges', title: 'Maître des horloges', hint: 'Réussis le quiz des jours et des années.' },
  { id: 'berger-de-lunes', title: 'Berger de lunes', hint: 'Réussis le quiz des lunes.' },
  { id: 'chasseur-de-records', title: 'Chasseur de records', hint: 'Réussis le quiz des extrêmes du système solaire.' },
  { id: 'portier-des-geantes', title: 'Portier des géantes', hint: 'Atteins Jupiter.' },
  { id: 'arpenteur-du-froid', title: 'Arpenteur du froid', hint: 'Atteins Neptune.' },
  { id: 'oeil-de-comete', title: 'Œil de comète', hint: 'Repère deux comètes dans le carnet.' },
  { id: 'cap-sur-les-etoiles', title: 'Cap sur les étoiles', hint: 'Retrouve les sondes Voyager 1 et 2.' },
  { id: 'sentinelle-des-confins', title: 'Sentinelle des confins', hint: 'Pousse jusqu’à Pluton.' },
];

export default BADGES;

const BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function badgeById(id: string): Badge | undefined {
  return BY_ID.get(id);
}

/** Badge décerné à la première découverte de certains objets phares. */
const DISCOVERY_BADGE: Record<string, string> = {
  jupiter: 'portier-des-geantes',
  neptune: 'arpenteur-du-froid',
};

export function discoveryBadgeFor(bodyId: string): string | undefined {
  return DISCOVERY_BADGE[bodyId];
}
