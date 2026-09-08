import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BodyHero } from '@/components/BodyHero';
import { bodyById, codexOrder, moonsOf } from '@/data/bodies';
import type { BodyType } from '@/data/types';
import {
  describeBody,
  fmtDay,
  fmtDiameter,
  fmtTemp,
  fmtYear,
  isTidallyLocked,
} from '@/data/format';
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
  const location = useLocation();
  const discovered = useProgress((s) => s.discovered);

  // vrai si on est entré en mode classe depuis une fiche `/object` (bouton carré).
  // Le flag est propagé d'un astre à l'autre par les flèches, pour que « Quitter »
  // sache s'il peut simplement revenir en arrière (`navigate(-1)`).
  const fromObject = (location.state as { fromObject?: boolean } | null)?.fromObject ?? false;

  /** Quitter le mode classe : retour propre à la fiche d'origine. */
  const exitToSheet = () => {
    if (fromObject) navigate(-1);
    else navigate(`/object/${id}`, { replace: true });
  };

  const order = useMemo(codexOrder, []);
  const seen = useMemo(
    () => order.filter((b) => discovered.includes(b.id)),
    [order, discovered],
  );

  const body = bodyById(id);
  const heroMoons = useMemo(
    () =>
      moonsOf(id ?? '')
        .slice(0, 4)
        .map((m) => ({
          id: m.id,
          color: m.gradient[1],
          size: Math.max(0.045, Math.min(0.11, m.size / 260)),
        })),
    [id],
  );
  const globalRank = order.findIndex((b) => b.id === id) + 1;
  const seenIndex = seen.findIndex((b) => b.id === id);

  const blurb = useBlurb(body);
  const readAloud = useProgress((s) => s.prefs.readAloud);
  useReadAloud(body ? `${body.name}. ${describeBody(body)}. ${blurb}` : '', readAloud);

  // À chaque changement d'astre (flèches ‹/› incluses), on repose le focus sur
  // le titre : les personnes au clavier / lecteur d'écran « entendent » le
  // nouveau nom et gardent une position de focus cohérente.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [id]);

  useEffect(() => {
    if (!body || !discovered.includes(body.id)) {
      navigate(id ? `/object/${id}` : '/codex', { replace: true });
    }
  }, [body, id, discovered, navigate]);

  // navigation d'un astre à l'autre : on REMPLACE l'entrée d'historique (+ on
  // conserve le flag `fromObject`) → le mode classe reste une seule entrée.
  const goTo = (idx: number) =>
    navigate(`/present/${seen[idx].id}`, { replace: true, state: { fromObject } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && seenIndex < seen.length - 1) goTo(seenIndex + 1);
      if (e.key === 'ArrowLeft' && seenIndex > 0) goTo(seenIndex - 1);
      if (e.key === 'Escape') exitToSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, seenIndex, id, navigate, fromObject]);

  if (!body || seenIndex === -1) return null;

  const locked = isTidallyLocked(body);
  const parentName = body.parent ? (bodyById(body.parent)?.name ?? 'sa planète') : '';

  return (
    <div className={styles.screen} role="region" aria-label={`Mode classe — ${body.name}`}>
      <BodyHero
        className={styles.figure}
        body={body}
        size={0}
        bleed
        tint={body.type === 'star' ? '#241a3d' : '#1d1638'}
        moons={heroMoons.length ? heroMoons : undefined}
      />
      <div className={styles.neb} aria-hidden />
      <div className={styles.stars} aria-hidden />
      <div className={styles.veil} aria-hidden />

      <p className="srOnly">
        Fiche plein écran. Flèches gauche et droite pour changer d’objet, Échap pour quitter.
      </p>

      <button type="button" className={styles.quit} onClick={exitToSheet}>
        Quitter le mode classe
      </button>

      <div className={styles.row}>
        <div className={styles.info}>
          <div className={styles.typeRow}>
            <span
              className={styles.typeDot}
              style={{ background: TYPE_COLOR[body.type] }}
              aria-hidden
            />
            {describeBody(body)}
          </div>
          <h1 className={styles.name} ref={headingRef} tabIndex={-1}>
            {body.name}
          </h1>
          <p className={styles.desc}>{blurb}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statKey}>Diamètre</span>
              <span className={styles.statVal}>{fmtDiameter(body.facts.diameterKm)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Durée du jour</span>
              <span className={styles.statVal}>{fmtDay(body.facts.dayHours)}</span>
              {locked && <span className={styles.statHint}>toujours la même face</span>}
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Durée de l'année</span>
              <span className={styles.statVal}>{fmtYear(body.facts.yearDays)}</span>
              {locked && (
                <span className={styles.statHint}>un tour de {parentName}</span>
              )}
            </div>
            <div className={`${styles.stat} ${styles.statTemp}`}>
              <span className={styles.statKey}>Température</span>
              <span className={styles.statVal}>{fmtTemp(body.facts.tempC)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.nav} role="group" aria-label="Naviguer entre les objets">
        <button
          type="button"
          className={styles.navBtn}
          disabled={seenIndex === 0}
          onClick={() => goTo(seenIndex - 1)}
          aria-label="Objet précédent"
          aria-keyshortcuts="ArrowLeft"
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={seenIndex === seen.length - 1}
          onClick={() => goTo(seenIndex + 1)}
          aria-label="Objet suivant"
          aria-keyshortcuts="ArrowRight"
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
