/**
 * Versions « mode simplifié » des `highlights` (préférence 8-10 ans).
 * Deux phrases courtes, vocabulaire courant, une image concrète — même esprit
 * que `blurbsSimple.ts`. Utilisées dans la fiche `/object` et la lecture à voix
 * haute quand `prefs.simplified` est actif.
 *
 * Toute clé absente retombe sur les `highlights` normaux (`simpleHighlights`).
 */
const HIGHLIGHTS_SIMPLE: Record<string, string[]> = {
  // ── Système interne ────────────────────────────────────────────────
  soleil: [
    'Il est si gros qu’on pourrait y ranger un million de Terres.',
    'Sa lumière met 8 minutes pour arriver jusqu’à nous.',
  ],
  mercure: [
    'C’est la planète la plus rapide : son année ne dure que 88 jours.',
    'Le jour on y cuit, la nuit on y gèle.',
  ],
  venus: [
    'C’est la planète la plus chaude : de quoi faire fondre du métal.',
    'Elle est cachée sous d’épais nuages, comme un four fermé.',
  ],
  terre: [
    'La seule planète où l’on a trouvé de l’eau, de l’air et de la vie.',
    'Elle fonce autour du Soleil sans qu’on sente rien.',
  ],
  lune: [
    'Elle nous montre toujours le même côté.',
    'Douze personnes ont marché dessus, il y a longtemps.',
  ],
  mars: [
    'On l’appelle la planète rouge à cause de sa poussière couleur rouille.',
    'Elle a le plus grand volcan de tout le système solaire.',
  ],
  phobos: [
    'C’est la plus grosse des deux petites lunes de Mars.',
    'Elle se rapproche de Mars et finira par tomber dessus.',
  ],
  deimos: [
    'La plus petite lune de Mars, grosse comme une montagne.',
    'Sa pesanteur est si faible qu’un grand saut suffirait pour s’envoler.',
  ],

  // ── Ceinture d’astéroïdes ──────────────────────────────────────────
  ceres: [
    'C’est le plus gros caillou de la ceinture d’astéroïdes.',
    'Elle cache peut-être beaucoup de glace, comme une patinoire géante.',
  ],
  vesta: [
    'C’est le seul astéroïde qu’on peut voir sans télescope.',
    'Des petits bouts de Vesta tombent parfois sur Terre.',
  ],
  pallas: [
    'Un gros astéroïde qui suit un chemin très penché.',
    'Sa forme est toute cabossée.',
  ],
  hygie: [
    'Un gros astéroïde presque aussi noir que du charbon.',
    'Il est assez rond pour ressembler à une mini-planète.',
  ],
  ida: [
    'Un petit astéroïde en forme de haricot.',
    'Il a sa propre toute petite lune.',
  ],
  bennu: [
    'Un astéroïde gros comme une colline.',
    'Une sonde s’est posée dessus et en a ramené de la poussière.',
  ],

  // ── Géantes gazeuses ──────────────────────────────────────────────
  jupiter: [
    'C’est la plus grosse planète : toutes les autres tiendraient dedans.',
    'Sa grande tache rouge est une tempête plus large que la Terre.',
  ],
  io: [
    'La lune la plus volcanique qu’on connaisse : ça explose sans arrêt.',
    'Ses couleurs jaunes et orange font penser à une pizza.',
  ],
  europe: [
    'Une lune toute lisse, couverte de glace.',
    'Un océan se cache dessous, sous la croûte gelée.',
  ],
  ganymede: [
    'La plus grande lune du système solaire, plus grosse que Mercure.',
    'Elle cache aussi un océan sous sa glace.',
  ],
  callisto: [
    'C’est la lune la plus couverte de cratères.',
    'Rien n’y a bougé depuis très, très longtemps.',
  ],
  saturne: [
    'Ses anneaux sont immenses, mais fins comme une feuille de papier.',
    'Ils sont faits de milliards de morceaux de glace.',
  ],
  titan: [
    'La seule lune avec un vrai ciel, plus épais que le nôtre.',
    'Il y pleut, mais ce n’est pas de l’eau : c’est du gaz devenu liquide.',
  ],
  encelade: [
    'Des jets d’eau salée jaillissent de son pôle sud.',
    'Cette eau vient d’un océan caché sous la glace.',
  ],
  mimas: [
    'Son gros cratère lui donne un air d’Étoile de la Mort.',
    'Le choc qui l’a creusé a failli la casser en deux.',
  ],
  japet: [
    'Un côté est blanc comme la neige, l’autre noir comme la nuit.',
    'Une longue montagne fait presque tout le tour de son ventre.',
  ],

  // ── Géantes de glace ─────────────────────────────────────────────
  uranus: [
    'Elle est couchée sur le côté et roule comme une bille.',
    'Chaque pôle passe 42 ans au soleil, puis 42 ans dans le noir.',
  ],
  titania: [
    'C’est la plus grande lune d’Uranus.',
    'De grandes fentes de glace traversent sa surface.',
  ],
  neptune: [
    'On l’a trouvée grâce à des calculs, avant même de la voir.',
    'Ses vents sont les plus rapides du système solaire.',
  ],
  triton: [
    'Elle tourne autour de Neptune à l’envers des autres lunes.',
    'C’est un des endroits les plus froids jamais mesurés.',
  ],

  // ── Système externe ─────────────────────────────────────────────
  pluton: [
    'Une tache en forme de cœur, faite de glace, marque sa surface.',
    'C’était la neuvième planète ; c’est maintenant une planète naine.',
  ],
  charon: [
    'Elle est si grosse que Pluton et elle tournent l’une autour de l’autre.',
    'Depuis Pluton, on la verrait toujours au même endroit dans le ciel.',
  ],
  eris: [
    'Sa découverte a fait perdre à Pluton son titre de planète.',
    'Elle est un peu plus petite que Pluton, mais plus lourde.',
  ],
  makemake: [
    'Son nom vient d’un dieu de l’île de Pâques.',
    'Sa surface gelée est un peu rougeâtre.',
  ],
  haumea: [
    'Elle tourne si vite qu’elle est étirée comme un ballon de rugby.',
    'Un jour n’y dure que 4 heures.',
  ],
  sedna: [
    'Elle voyage très, très loin, bien au-delà des planètes.',
    'Une seule de ses années dure des milliers des nôtres.',
  ],
  arrokoth: [
    'C’est l’objet le plus lointain qu’une sonde ait visité de près.',
    'Il a une forme de bonhomme de neige aplati.',
  ],

  // ── Comètes & sondes ────────────────────────────────────────────
  halley: [
    'Elle repasse près du Soleil environ tous les 75 ans.',
    'On la revoit à peu près une fois par vie humaine. Prochain passage : 2061.',
  ],
  tchouri: [
    'Une sonde s’est mise en orbite autour d’elle, puis a posé un petit robot dessus.',
    'Elle a une drôle de forme de canard.',
  ],
  'hale-bopp': [
    'On a pu la voir à l’œil nu pendant plus d’un an.',
    'Son noyau de glace est l’un des plus gros connus.',
  ],
  oumuamua: [
    'C’est le premier objet venu d’une autre étoile qu’on ait repéré.',
    'Il n’a fait que passer : il ne reviendra jamais.',
  ],
  'voyager-1': [
    'C’est l’objet fabriqué par l’humain le plus loin de la Terre.',
    'Elle emporte un disque doré, comme un message pour d’éventuels extraterrestres.',
  ],
  'voyager-2': [
    'C’est la seule sonde à être passée près d’Uranus et de Neptune.',
    'Elle a visité les quatre planètes géantes d’affilée.',
  ],
  jwst: [
    'C’est un télescope géant posté très loin de la Terre.',
    'Son grand bouclier le garde au froid pour bien voir les étoiles.',
  ],
};

/** `highlights` simplifiés d'un objet, ou `fallback` (ses highlights normaux). */
export function simpleHighlights(id: string, fallback: string[]): string[] {
  return HIGHLIGHTS_SIMPLE[id] ?? fallback;
}
