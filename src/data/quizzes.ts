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
];

export default QUIZZES;

export function quizById(id: string | undefined): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
