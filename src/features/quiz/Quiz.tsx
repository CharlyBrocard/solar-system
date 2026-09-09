import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BodySphere } from '@/components/BodySphere';
import { bodyById } from '@/data/bodies';
import { quizById } from '@/data/quizzes';
import { sfx } from '@/lib/sfx';
import { useProgress } from '@/store/progress';
import styles from './Quiz.module.css';

export function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const passQuiz = useProgress((s) => s.passQuiz);

  const quiz = quizById(id);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!quiz) navigate('/quests', { replace: true });
  }, [quiz, navigate]);

  // Le clic sur « Suivant »/« Terminer » fait disparaître le bouton qui avait
  // le focus : on le repose sur le titre pertinent (question suivante, ou
  // écran de résultat) pour ne pas perdre les personnes au clavier / lecteur
  // d'écran — même logique que `/present`.
  const promptRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!finished) promptRef.current?.focus();
  }, [index, finished]);
  useEffect(() => {
    if (finished) resultRef.current?.focus();
  }, [finished]);

  if (!quiz) return null;

  const question = quiz.questions[index];
  const answered = selected !== null;
  const correct = answered && selected === question.answerIndex;
  const score = results.filter(Boolean).length;
  const passed = score >= quiz.passScore;

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    setResults((r) => [...r, i === question.answerIndex]);
    sfx.play(i === question.answerIndex ? 'correct' : 'wrong');
  };

  const next = () => {
    if (index + 1 < quiz.questions.length) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      if (score >= quiz.passScore) passQuiz(quiz.id);
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className={styles.screen}>
        <div className={styles.nebula} aria-hidden />
        <div className={styles.card}>
          <div className={styles.result}>
            <span className={styles.resultScore}>
              {quiz.title} · {score} / {quiz.questions.length}
            </span>
            <h1 className={styles.resultTitle} ref={resultRef} tabIndex={-1}>
              {passed ? 'Quête de savoir réussie !' : 'Presque…'}
            </h1>
            <p className={styles.resultText}>
              {passed
                ? "Le badge est à toi. Reviens quand tu veux réviser."
                : `Il te fallait ${quiz.passScore} bonnes réponses. Retente ta chance quand tu veux.`}
            </p>
            <div className={styles.resultActions}>
              {!passed && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    setIndex(0);
                    setSelected(null);
                    setResults([]);
                    setFinished(false);
                  }}
                >
                  Recommencer
                </button>
              )}
              <button
                type="button"
                className={styles.next}
                onClick={() => navigate('/quests')}
              >
                Retour aux quêtes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.nebula} aria-hidden />
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.tag}>
            <span className={styles.tagDot} aria-hidden />
            Quête de savoir · question {index + 1}/{quiz.questions.length}
          </span>
          <div className={styles.pips} aria-hidden>
            {quiz.questions.map((_, i) => (
              <span
                key={i}
                className={styles.pip}
                data-state={
                  i < results.length
                    ? results[i]
                      ? 'ok'
                      : 'ko'
                    : i === index
                      ? 'current'
                      : undefined
                }
              />
            ))}
          </div>
        </div>

        <h1 className={styles.prompt} ref={promptRef} tabIndex={-1}>
          {question.prompt}
        </h1>

        <div className={styles.options}>
          {question.options.map((opt, i) => {
            let mark: 'correct' | 'wrong' | undefined;
            if (answered) {
              if (i === question.answerIndex) mark = 'correct';
              else if (i === selected) mark = 'wrong';
            }
            const body = opt.bodyId ? bodyById(opt.bodyId) : undefined;
            const markSuffix =
              mark === 'correct' ? ' — bonne réponse' : mark === 'wrong' ? ' — ta réponse' : '';
            return (
              <button
                key={i}
                type="button"
                className={styles.option}
                data-mark={mark}
                disabled={answered}
                aria-label={markSuffix ? `${opt.label}${markSuffix}` : undefined}
                onClick={() => choose(i)}
              >
                {body && <BodySphere body={body} size={44} className={styles.optDisc} />}
                <span className={styles.optLabel}>{opt.label}</span>
                {mark && <span className={styles.optCheck} aria-hidden />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={styles.feedback}
            data-tone={correct ? undefined : 'ko'}
            role="status"
          >
            <span className={styles.feedbackIcon} aria-hidden />
            <span className={styles.feedbackText}>
              {correct ? 'Exact ! ' : 'Raté. '}
              {question.explanation}
            </span>
            <button type="button" className={styles.next} onClick={next}>
              {index + 1 < quiz.questions.length ? 'Suivant' : 'Terminer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
