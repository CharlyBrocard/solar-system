/** Quiz éducatifs (artboard `3k`). Chaque option peut afficher une bille d'astre. */
export interface QuizOption {
  label: string;
  bodyId?: string;
}

export interface QuizItem {
  prompt: string;
  options: QuizOption[];
  answerIndex: number;
  explanation: string;
}

export interface QuizDef {
  id: string;
  title: string;
  questions: QuizItem[];
  /** bonnes réponses minimales pour valider */
  passScore: number;
}

const QUIZZES: QuizDef[] = [
  {
    id: 'froid',
    title: 'Chaud et froid',
    passScore: 2,
    questions: [
      {
        prompt: 'Quelle planète est la plus froide du système solaire ?',
        options: [
          { label: 'Mars', bodyId: 'mars' },
          { label: 'Neptune', bodyId: 'neptune' },
          { label: 'Uranus', bodyId: 'uranus' },
          { label: 'Jupiter', bodyId: 'jupiter' },
        ],
        answerIndex: 1,
        explanation:
          "Neptune plafonne à −200 °C. Uranus est presque aussi froide, mais Neptune, plus loin et plus active, remporte le titre.",
      },
      {
        prompt: 'Et la plus chaude ?',
        options: [
          { label: 'Mercure', bodyId: 'mercure' },
          { label: 'Vénus', bodyId: 'venus' },
          { label: 'La Terre', bodyId: 'terre' },
          { label: 'Mars', bodyId: 'mars' },
        ],
        answerIndex: 1,
        explanation:
          "Vénus : 464 °C, assez pour fondre le plomb. Son atmosphère épaisse piège la chaleur — bien plus que Mercure, pourtant plus proche du Soleil.",
      },
      {
        prompt: "Où a-t-on mesuré l'un des endroits les plus froids connus, −235 °C ?",
        options: [
          { label: 'Sur Pluton', bodyId: 'pluton' },
          { label: 'Sur Triton', bodyId: 'triton' },
          { label: 'Sur la Lune', bodyId: 'lune' },
          { label: 'Sur Callisto', bodyId: 'callisto' },
        ],
        answerIndex: 1,
        explanation:
          "Triton, la grande lune de Neptune : −235 °C en surface, et pourtant des geysers d'azote y jaillissent encore.",
      },
    ],
  },
  {
    id: 'mouvement',
    title: 'Jours et années',
    passScore: 2,
    questions: [
      {
        prompt: 'Sur quelle planète un jour dure-t-il plus longtemps qu’une année ?',
        options: [
          { label: 'Mercure', bodyId: 'mercure' },
          { label: 'Vénus', bodyId: 'venus' },
          { label: 'Mars', bodyId: 'mars' },
          { label: 'Jupiter', bodyId: 'jupiter' },
        ],
        answerIndex: 1,
        explanation:
          'Vénus tourne sur elle-même si lentement — et à l’envers — qu’un de ses jours (243 jours terrestres) dépasse son année (225 jours).',
      },
      {
        prompt: 'Combien de temps la Lune met-elle à tourner sur elle-même ?',
        options: [
          { label: '24 heures' },
          { label: '27 jours, le temps d’un tour de la Terre' },
          { label: 'Elle ne tourne pas du tout' },
          { label: 'Un an' },
        ],
        answerIndex: 1,
        explanation:
          'Sa rotation dure exactement le temps de son orbite : elle nous montre donc toujours la même face. On appelle ça le verrouillage par les marées.',
      },
      {
        prompt: 'Quelle planète boucle un tour sur elle-même en moins de 10 heures ?',
        options: [
          { label: 'La Terre', bodyId: 'terre' },
          { label: 'Mars', bodyId: 'mars' },
          { label: 'Jupiter', bodyId: 'jupiter' },
          { label: 'Neptune', bodyId: 'neptune' },
        ],
        answerIndex: 2,
        explanation:
          'Malgré sa taille, Jupiter tourne en 9 h 56 : c’est le jour le plus court du système solaire, et ça aplatit visiblement ses pôles.',
      },
    ],
  },
  {
    id: 'lunes',
    title: 'Un monde de lunes',
    passScore: 2,
    questions: [
      {
        prompt: 'Quelle est la plus grande lune du système solaire ?',
        options: [
          { label: 'La Lune', bodyId: 'lune' },
          { label: 'Titan', bodyId: 'titan' },
          { label: 'Ganymède', bodyId: 'ganymede' },
          { label: 'Io', bodyId: 'io' },
        ],
        answerIndex: 2,
        explanation:
          'Ganymède, lune de Jupiter, est même plus grosse que la planète Mercure — et c’est la seule lune connue avec son propre champ magnétique.',
      },
      {
        prompt: 'Quelle planète compte le plus de lunes ?',
        options: [
          { label: 'Jupiter', bodyId: 'jupiter' },
          { label: 'Saturne', bodyId: 'saturne' },
          { label: 'Uranus', bodyId: 'uranus' },
          { label: 'Neptune', bodyId: 'neptune' },
        ],
        answerIndex: 1,
        explanation:
          'Saturne en dénombre près de 150, repassant devant Jupiter (95). La plupart sont de petits blocs de glace de quelques kilomètres.',
      },
      {
        prompt: 'Sur quelle lune pleut-il du méthane liquide ?',
        options: [
          { label: 'Europe', bodyId: 'europe' },
          { label: 'Titan', bodyId: 'titan' },
          { label: 'Encelade', bodyId: 'encelade' },
          { label: 'Triton', bodyId: 'triton' },
        ],
        answerIndex: 1,
        explanation:
          'Titan a une atmosphère épaisse et un vrai cycle météo : du méthane s’évapore, forme des nuages, retombe en pluie et remplit des lacs.',
      },
    ],
  },
  {
    id: 'records',
    title: 'Les records du système solaire',
    passScore: 2,
    questions: [
      {
        prompt: 'Où se dresse le plus haut volcan du système solaire ?',
        options: [
          { label: 'Sur la Terre', bodyId: 'terre' },
          { label: 'Sur Mars', bodyId: 'mars' },
          { label: 'Sur Vénus', bodyId: 'venus' },
          { label: 'Sur Io', bodyId: 'io' },
        ],
        answerIndex: 1,
        explanation:
          'Olympus Mons, sur Mars, culmine à 22 km — presque trois fois l’Everest. Sans tectonique pour le déplacer, il a grossi pendant des millions d’années au même endroit.',
      },
      {
        prompt: 'Quelle planète abrite la plus grande tempête connue ?',
        options: [
          { label: 'La Terre', bodyId: 'terre' },
          { label: 'Jupiter', bodyId: 'jupiter' },
          { label: 'Saturne', bodyId: 'saturne' },
          { label: 'Neptune', bodyId: 'neptune' },
        ],
        answerIndex: 1,
        explanation:
          'La Grande Tache Rouge de Jupiter est un tourbillon plus large que la Terre, observé sans interruption depuis près de 200 ans.',
      },
      {
        prompt: 'Où soufflent les vents les plus rapides ?',
        options: [
          { label: 'Sur Jupiter', bodyId: 'jupiter' },
          { label: 'Sur Saturne', bodyId: 'saturne' },
          { label: 'Sur Uranus', bodyId: 'uranus' },
          { label: 'Sur Neptune', bodyId: 'neptune' },
        ],
        answerIndex: 3,
        explanation:
          'Jusqu’à 2 000 km/h sur Neptune — cinq fois plus violent que les pires ouragans terrestres, et pourtant elle ne reçoit presque pas de lumière du Soleil.',
      },
    ],
  },
  {
    id: 'eau',
    title: 'La piste de l’eau',
    passScore: 2,
    questions: [
      {
        prompt: 'Quel monde cacherait sous sa glace un océan plus vaste que tous ceux de la Terre ?',
        options: [
          { label: 'La Lune', bodyId: 'lune' },
          { label: 'Europe', bodyId: 'europe' },
          { label: 'Titan', bodyId: 'titan' },
          { label: 'Mars', bodyId: 'mars' },
        ],
        answerIndex: 1,
        explanation:
          'Europe, lune de Jupiter : sous 15 à 25 km de glace, un océan salé qui contiendrait deux fois plus d’eau que la Terre.',
      },
      {
        prompt: 'D’où jaillissent des geysers d’eau salée observés par la sonde Cassini ?',
        options: [
          { label: 'Io', bodyId: 'io' },
          { label: 'Encelade', bodyId: 'encelade' },
          { label: 'Callisto', bodyId: 'callisto' },
          { label: 'Ganymède', bodyId: 'ganymede' },
        ],
        answerIndex: 1,
        explanation:
          'Encelade, petite lune de Saturne : ses panaches viennent d’un océan caché, et Cassini y a même détecté des molécules organiques.',
      },
      {
        prompt: 'Qu’a-t-on découvert à la surface de Mars qui prouve un passé humide ?',
        options: [
          { label: 'Des océans encore liquides' },
          { label: 'Des lits de rivières asséchés' },
          { label: 'Des chutes de neige quotidiennes' },
          { label: 'Des glaciers à l’équateur' },
        ],
        answerIndex: 1,
        explanation:
          'Vallées, deltas et galets arrondis : il y a des milliards d’années, de l’eau liquide a coulé sur Mars. Il n’en reste aujourd’hui que de la glace aux pôles et sous le sol.',
      },
    ],
  },
  {
    id: 'anneaux',
    title: 'Les anneaux des géantes',
    passScore: 2,
    questions: [
      {
        prompt: 'Combien des quatre planètes géantes ont des anneaux ?',
        options: [
          { label: 'Une seule, Saturne', bodyId: 'saturne' },
          { label: 'Deux : Saturne et Jupiter' },
          { label: 'Les quatre' },
          { label: 'Aucune, ce sont des lunes qu’on confond avec des anneaux' },
        ],
        answerIndex: 2,
        explanation:
          'Jupiter, Saturne, Uranus et Neptune en ont toutes. Ceux de Saturne sont juste bien plus larges et brillants — les trois autres sont fins et sombres, repérés seulement par occultation d’étoile ou grâce aux sondes.',
      },
      {
        prompt: 'De quoi sont surtout faits les anneaux de Saturne ?',
        options: [
          { label: 'De roche' },
          { label: 'De glace d’eau' },
          { label: 'De poussière de fer' },
          { label: 'De méthane gelé' },
        ],
        answerIndex: 1,
        explanation:
          'Des milliards de blocs de glace d’eau, du grain de sable à la maison, qui réfléchissent bien la lumière du Soleil — d’où leur éclat.',
      },
      {
        prompt: 'Pourquoi les anneaux d’Uranus semblent-ils presque verticaux ?',
        options: [
          { label: 'Ils sont faits d’une matière différente des autres anneaux' },
          { label: 'L’axe de rotation d’Uranus est presque couché, et ses anneaux le suivent' },
          { label: 'C’est un effet d’optique dû à la distance' },
          { label: 'Neptune les déforme par gravité' },
        ],
        answerIndex: 1,
        explanation:
          'Uranus roule sur le côté (axe incliné à 98°) : ses anneaux, alignés sur son équateur, roulent avec elle — vus de la Terre, ils paraissent dressés à la verticale.',
      },
    ],
  },
  {
    id: 'histoire',
    title: 'L’histoire des découvertes',
    passScore: 2,
    questions: [
      {
        prompt: 'Quelle planète a été trouvée grâce au calcul, avant même d’être observée ?',
        options: [
          { label: 'Uranus', bodyId: 'uranus' },
          { label: 'Neptune', bodyId: 'neptune' },
          { label: 'Mars', bodyId: 'mars' },
          { label: 'Pluton', bodyId: 'pluton' },
        ],
        answerIndex: 1,
        explanation:
          'En 1846, Urbain Le Verrier a calculé la position de Neptune à partir des perturbations qu’elle causait sur l’orbite d’Uranus. L’astronome Johann Galle l’a trouvée dans le ciel en moins d’une soirée, à l’endroit prédit.',
      },
      {
        prompt: 'Quelle a été la première planète découverte grâce à un télescope ?',
        options: [
          { label: 'Mars', bodyId: 'mars' },
          { label: 'Jupiter', bodyId: 'jupiter' },
          { label: 'Uranus', bodyId: 'uranus' },
          { label: 'Vénus', bodyId: 'venus' },
        ],
        answerIndex: 2,
        explanation:
          'Mercure à Saturne étaient connues depuis l’Antiquité, visibles à l’œil nu. William Herschel a repéré Uranus en 1781 en balayant le ciel avec son télescope — la première planète « moderne ».',
      },
      {
        prompt: 'Qui a découvert Pluton en 1930 ?',
        options: [
          { label: 'Clyde Tombaugh' },
          { label: 'Galilée' },
          { label: 'William Herschel' },
          { label: 'Urbain Le Verrier' },
        ],
        answerIndex: 0,
        explanation:
          'Clyde Tombaugh, un astronome américain de 24 ans, l’a repérée à l’observatoire Lowell en comparant deux photographies du ciel prises à quelques jours d’écart : un point y avait bougé.',
      },
    ],
  },
];

export default QUIZZES;

export function quizById(id: string | undefined): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
