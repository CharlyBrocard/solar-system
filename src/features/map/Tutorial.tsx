import { useEffect, useState } from 'react';
import { useProgress } from '@/store/progress';
import styles from './MapOverlays.module.css';

const TIPS = [
  {
    title: 'Explore le disque',
    text: 'Glisse pour te déplacer, la molette (ou le +/−) pour zoomer. Les étoiles restent derrière : tu te déplaces vraiment dans la scène.',
  },
  {
    title: 'Clique un astre pour ouvrir sa fiche',
    text: 'Chaque fiche ouverte ajoute l’objet à ton carnet et fait reculer la brume.',
  },
  {
    title: 'Ton carnet et tes quêtes',
    text: 'Le carnet (en haut à droite) et les quêtes (en bas à gauche) t’accompagnent tout du long.',
  },
];

/** Mini-tutoriel de la carte (`3l`), montré une seule fois. */
export function Tutorial() {
  const seen = useProgress((s) => s.tutorialSeen);
  const markSeen = useProgress((s) => s.markTutorialSeen);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (seen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') markSeen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seen, markSeen]);

  if (seen) return null;

  const tip = TIPS[step];
  const last = step === TIPS.length - 1;

  return (
    <div className={styles.tip} role="region" aria-label="Tutoriel de la carte">
      <span className={styles.tipStep}>
        Astuce {step + 1}/{TIPS.length}
      </span>
      <span className={styles.tipTitle}>{tip.title}</span>
      <span className={styles.tipText}>{tip.text}</span>
      <div className={styles.tipActions}>
        <button
          type="button"
          className={styles.tipNext}
          onClick={() => (last ? markSeen() : setStep(step + 1))}
        >
          {last ? 'C’est parti' : 'Compris'}
        </button>
        {!last && (
          <button type="button" className={styles.tipSkip} onClick={markSeen}>
            Passer le tutoriel
          </button>
        )}
      </div>
    </div>
  );
}
