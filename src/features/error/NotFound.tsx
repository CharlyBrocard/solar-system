import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './NotFound.module.css';

/**
 * Artboard `4d` : route inconnue + état hors-ligne.
 * L'app fonctionne hors-ligne après le premier chargement ; ici on couvre les
 * deux cas (URL qui n'existe pas, ou perte de réseau).
 */
export function NotFound() {
  const location = useLocation();
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const offline = !online;

  return (
    <div className={styles.screen}>
      <div className={styles.neb} />
      <div className={styles.stars} />

      <div className={styles.card}>
        <div className={styles.icon}>
          <span className={styles.iconDisc} />
          <span className={styles.iconBar} />
        </div>

        <h1 className={styles.title}>
          {offline
            ? 'La liaison avec la sonde est coupée'
            : 'Tu t’es perdu dans le vide'}
        </h1>
        <p className={styles.text}>
          {offline
            ? 'Pas de connexion pour le moment. Ton carnet et les objets déjà découverts restent consultables hors-ligne ; les nouvelles zones attendront le retour du réseau.'
            : `Cette page n’existe pas : « ${location.pathname} » ne mène nulle part. Reviens à la carte pour continuer l’exploration.`}
        </p>

        <div className={styles.actions}>
          {offline ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          ) : (
            <Link to="/map" className={styles.primary}>
              Retour à la carte
            </Link>
          )}
          <Link to="/codex" className={styles.secondary}>
            Ouvrir mon carnet
          </Link>
        </div>

        {offline && <span className={styles.code}>Erreur réseau · code 503</span>}
      </div>
    </div>
  );
}
