/**
 * Versions « mode simplifié » des blurbs (préférence 8-10 ans).
 * Une phrase courte, du vocabulaire courant, une image concrète.
 * Sert de remplacement du `blurb` quand `prefs.simplified` est actif —
 * dans le mode classe, l'écran de découverte, les sous-cartes, la lecture à voix haute.
 *
 * Toute clé absente retombe sur le `blurb` normal (`simpleBlurb`).
 */
const BLURB_SIMPLE: Record<string, string> = {
  // ── Système interne ────────────────────────────────────────────────
  soleil:
    'Une gigantesque boule de gaz brûlant. C’est notre étoile, et tout tourne autour d’elle.',
  mercure: 'La plus petite planète. Elle est collée au Soleil et couverte de cratères.',
  venus:
    'Presque de la même taille que la Terre, mais brûlante et cachée sous d’épais nuages.',
  terre:
    'Notre planète : la seule avec de l’eau liquide, de l’air à respirer et de la vie.',
  lune: 'Le gros caillou rond qui tourne autour de la Terre et brille la nuit.',
  mars:
    'La planète rouge. Aujourd’hui elle est froide et sèche, mais des rivières y ont coulé autrefois.',
  phobos: 'La plus grande des deux petites lunes de Mars, en forme de pomme de terre.',
  deimos:
    'La plus petite lune de Mars. Depuis Mars, elle ressemblerait à une grosse étoile.',

  // ── Ceinture d’astéroïdes ──────────────────────────────────────────
  ceres: 'Le plus gros objet de la ceinture d’astéroïdes. C’est presque une mini-planète.',
  vesta: 'Un gros rocher brillant et cabossé qui flotte entre Mars et Jupiter.',
  pallas: 'Un gros astéroïde dont l’orbite est très penchée par rapport aux planètes.',
  hygie: 'Un gros astéroïde très sombre, presque noir comme du charbon.',
  ida: 'Un petit astéroïde en forme de haricot qui a sa propre mini-lune.',
  bennu:
    'Un astéroïde gros comme une montagne. Une sonde en a rapporté un peu de poussière.',

  // ── Géantes gazeuses ──────────────────────────────────────────────
  jupiter:
    'La plus grosse planète : une boule de gaz rayée, avec une tempête plus large que la Terre.',
  io: 'La lune de Jupiter couverte de volcans qui crachent sans jamais s’arrêter.',
  europe: 'Une lune toute lisse et gelée. Un océan se cache sous sa croûte de glace.',
  ganymede:
    'La plus grande lune du système solaire, plus grosse même que la planète Mercure.',
  callisto:
    'Une vieille lune de Jupiter, criblée de cratères depuis des milliards d’années.',
  saturne:
    'La planète aux anneaux : d’immenses cercles faits de milliards de bouts de glace.',
  titan:
    'La lune orange de Saturne. Il y pleut et il y a des lacs, mais pas d’eau : du méthane.',
  encelade:
    'Une petite lune blanche comme neige qui envoie des jets d’eau vers l’espace.',
  mimas:
    'Une petite lune de Saturne avec un cratère si grand qu’on dirait l’Étoile de la Mort.',
  japet:
    'Une lune de Saturne à moitié claire et à moitié sombre, comme une balle bicolore.',
  uranus: 'Une géante glacée bleu-vert. Elle roule sur le côté, presque couchée.',
  titania:
    'La plus grande lune d’Uranus, un monde de glace fendu de grands canyons.',
  neptune:
    'La planète la plus éloignée du Soleil. Bleu foncé, avec les vents les plus rapides.',
  triton: 'La grande lune de Neptune. Elle tourne à l’envers et crache de l’azote gelé.',

  // ── Système externe ───────────────────────────────────────────────
  pluton:
    'Une petite planète naine gelée, tout au bord du système solaire, avec une tache en forme de cœur.',
  charon:
    'La lune de Pluton, presque aussi grosse que lui : on dirait deux planètes qui valsent.',
  eris:
    'Une planète naine glacée, à peu près de la taille de Pluton, mais encore plus loin.',
  makemake: 'Une planète naine brillante et très froide, loin derrière Neptune.',
  haumea:
    'Une planète naine en forme de ballon de rugby qui tourne très vite, avec deux lunes.',
  sedna:
    'Un monde lointain et rougeâtre. Il met plus de 10 000 ans à faire le tour du Soleil.',
  arrokoth:
    'Un petit corps glacé en forme de bonhomme de neige, l’objet le plus lointain jamais visité.',

  // ── Comètes & sondes ──────────────────────────────────────────────
  halley: 'La comète la plus célèbre. On peut la voir depuis la Terre tous les 76 ans.',
  tchouri:
    'Une comète en forme de canard. Un petit robot s’est posé dessus pour l’étudier.',
  'hale-bopp':
    'Une énorme comète apparue en 1997, si brillante qu’on la voyait même en ville.',
  oumuamua:
    'Un objet venu d’une autre étoile. Il est passé près de nous en 2017, puis reparti.',
  'voyager-1':
    'Une sonde lancée en 1977. Elle a quitté le système solaire et vole toujours.',
  'voyager-2':
    'La sonde qui a visité Jupiter, Saturne, Uranus et Neptune. On lui parle encore.',
  jwst:
    'Un télescope géant placé dans l’espace pour photographier les étoiles les plus lointaines.',
};

export default BLURB_SIMPLE;

/** Le blurb simplifié d'un objet, ou son blurb normal si aucun n'est défini. */
export function simpleBlurb(id: string, fallback: string): string {
  return BLURB_SIMPLE[id] ?? fallback;
}
