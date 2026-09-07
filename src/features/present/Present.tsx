import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BodyHero } from '@/components/BodyHero';
import { bodyById, codexOrder } from '@/data/bodies';
import type { BodyType } from '@/data/types';
import { describeBody, fmtDay, fmtDiameter, fmtTemp, fmtYear } from '@/data/format';
import { useProgress } from '@/store/progress';
import { useBlurb } from '@/store/useBlurb';
import { useReadAloud } from '@/lib/speech';
import styles from './Present.module.css';

const TYPE_COLOR: Record<BodyType, string> = {
  star: 'var(--type-star)',
  rocky: 'var(--type-rocky)',
  gas: 'var(--type-gas)',
  ice: 'var(--type-ice)',
  small: 'var(--type-small)',
};

/** Artboard `4e` : fiche plein écran, pensée pour la projection en classe. */
export function Present() {
  const { id } = useParams();
  const navigate = useNavigate();
  const discovered = useProgress((s) => s.discovered);

  const order = useMemo(codexOrder, []);
  const seen = useMemo(
    () => order.filter((b) => discovered.includes(b.id)),
    [order, discovered],
  );

  // La sphère est dessinée à une taille fixe en px ; on l'adapte au viewport
  // pour qu'elle ne déborde pas sur mobile (artboard `4e` : figure ~ moitié de l'écran).
  const [sphereSize, setSphereSize] = useState(() =>
    typeof window === 'undefined' ? 340 : Math.min(340, Math.round(window.innerWidth * 0.62)),
  );
  useEffect(() => {
    const onResize = () =>
      setSphereSize(Math.min(340, Math.round(window.innerWidth * 0.62)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const body = bodyById(id);
  const globalRank = order.findIndex((b) => b.id === id) + 1;
  const seenIndex = seen.findIndex((b) => b.id === id);

  const blurb = useBlurb(body);
  const readAloud = useProgress((s) => s.prefs.readAloud);
  useReadAloud(body ? `${body.name}. ${describeBody(body)}. ${blurb}` : '', readAloud);

  useEffect(() => {
    if (!body || !discovered.includes(body.id)) {
      navigate(id ? `/object/${id}` : '/codex', { replace: true });
    }
  }, [body, id, discovered, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && seenIndex < seen.length - 1)
        navigate(`/present/${seen[seenIndex + 1].id}`);
      if (e.key === 'ArrowLeft' && seenIndex > 0)
        navigate(`/present/${seen[seenIndex - 1].id}`);
      if (e.key === 'Escape') navigate(`/object/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seen, seenIndex, id, navigate]);

  if (!body || seenIndex === -1) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.neb} />
      <div className={styles.stars} />

      <button
        type="button"
        className={styles.quit}
        onClick={() => navigate(`/object/${body.id}`)}
      >
        Quitter le mode classe
      </button>

      <div className={styles.row}>
        <div className={styles.figure} style={{ width: sphereSize, height: sphereSize }}>
          <BodyHero body={body} size={sphereSize} tint="#302247" />
        </div>

        <div className={styles.info}>
          <div className={styles.typeRow}>
            <span className={styles.typeDot} style={{ background: TYPE_COLOR[body.type] }} />
            {describeBody(body)}
          </div>
          <h1 className={styles.name}>{body.name}</h1>
          <p className={styles.desc}>{blurb}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statKey}>Diamètre</span>
              <span className={styles.statVal}>{fmtDiameter(body.facts.diameterKm)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Durée du jour</span>
              <span className={styles.statVal}>{fmtDay(body.facts.dayHours)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Durée de l'année</span>
              <span className={styles.statVal}>{fmtYear(body.facts.yearDays)}</span>
            </div>
            <div className={`${styles.stat} ${styles.statTemp}`}>
              <span className={styles.statKey}>Température</span>
              <span className={styles.statVal}>{fmtTemp(body.facts.tempC)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={seenIndex === 0}
          onClick={() => navigate(`/present/${seen[seenIndex - 1].id}`)}
          aria-label="Objet précédent"
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={seenIndex === seen.length - 1}
          onClick={() => navigate(`/present/${seen[seenIndex + 1].id}`)}
          aria-label="Objet suivant"
        >
          ›
        </button>
        <span className={styles.navLabel}>
          Objet {globalRank} sur {order.length}
        </span>
      </div>
    </div>
  );
}
