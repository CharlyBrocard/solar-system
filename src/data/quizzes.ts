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
];

export default QUIZZES;

export function quizById(id: string | undefined): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
