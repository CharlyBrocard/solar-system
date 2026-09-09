import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BodyHero } from '@/components/BodyHero';
import { bodyById, moonsOf, TYPE_LABEL } from '@/data/bodies';
import type { Body, BodyType } from '@/data/types';
import { ZONE_META } from '@/data/zones';
import {
  describeBody,
  earthDiameterPct,
  fmtDay,
  fmtDiameter,
  fmtKm,
  fmtTemp,
  fmtYear,
  isTidallyLocked,
} from '@/data/format';
import { useProgress } from '@/store/progress';
import { revealHint, unlockedZones } from '@/store/selectors';
import { useBlurb, useHighlights } from '@/store/useBlurb';
import { useReadAloud } from '@/lib/speech';
import styles from './ObjectSheet.module.css';

const TYPE_COLOR: Record<BodyType, string> = {
  star: 'var(--type-star)',
  rocky: 'var(--type-rocky)',
  gas: 'var(--type-gas)',
  ice: 'var(--type-ice)',
  small: 'var(--type-small)',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function ObjectSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const body = bodyById(id);

  const discovered = useProgress((s) => s.discovered);
  const discover = useProgress((s) => s.discover);
  const unlocked = useMemo(() => unlockedZones(discovered), [discovered]);

  const zoneUnlocked = body ? unlocked.has(body.zone) : false;
  const isDiscovered = body ? discovered.includes(body.id) : false;

  useEffect(() => {
    if (!body) navigate('/map', { replace: true });
  }, [body, navigate]);

  // Ouvrir la fiche d'un objet révélé = le découvrir.
  useEffect(() => {
    if (body && zoneUnlocked && !isDiscovered) discover(body.id);
  }, [body, zoneUnlocked, isDiscovered, discover]);

  if (!body) return null;

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/map'));
  const go = (to: string, state?: Record<string, unknown>) => navigate(to, { state });

  return zoneUnlocked ? (
    <DiscoveredSheet body={body} onBack={goBack} onGo={go} />
  ) : (
    <LockedSheet body={body} discovered={discovered} onBack={goBack} onGo={go} />
  );
}

interface SheetProps {
  body: Body;
  onBack: () => void;
  onGo: (to: string, state?: Record<string, unknown>) => void;
}

function DiscoveredSheet({ body, onBack, onGo }: SheetProps) {
  // Focus posé sur le titre à chaque arrivée (dive, navigation, retour) : les
  // personnes au clavier / lecteur d'écran « entendent » l'astre sans avoir
  // à chercher — même logique que `/present`.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [body.id]);

  const moons = moonsOf(body.id);
  const pct = earthDiameterPct(body);
  const isEarth = body.id === 'terre';
  const locked = isTidallyLocked(body);
  const parentName = body.parent ? (bodyById(body.parent)?.name ?? 'sa planète') : '';
  const heroMoons = useMemo(
    () =>
      moons.slice(0, 4).map((m) => ({
        id: m.id,
        color: m.gradient[1],
        size: clamp(m.size / 260, 0.045, 0.11),
      })),
    [moons],
  );

  const simplified = useProgress((s) => s.prefs.simplified);
  const readAloud = useProgress((s) => s.prefs.readAloud);
  const blurb = useBlurb(body);
  const highlights = useHighlights(body);
  useReadAloud(
    simplified
      ? `${body.name}. ${blurb} ${highlights.join(' ')}`
      : `${body.name}. ${describeBody(body)}. ${body.blurb} ${highlights.join('. ')}`,
    readAloud,
  );

  return (
    <div
      className={styles.screen}
      role="region"
      aria-label={`Fiche — ${body.name}`}
    >
      <BodyHero
        className={styles.backdropBody}
        body={body}
        size={0}
        bleed
        tint={body.type === 'star' ? '#1c1636' : '#181234'}
        moons={heroMoons.length ? heroMoons : undefined}
      />
      <div className={styles.backdropGlow} data-star={body.type === 'star' ? 'true' : undefined} />
      <div className={styles.nebula} />
      <div className={styles.particles} />
      <div className={styles.veil} />

      <div className={styles.breadcrumb}>
        <span>Système solaire</span>
        <span className={styles.crumbSep}>›</span>
        <span className={styles.crumbLeaf}>{body.name}</span>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <button type="button" className={styles.back} onClick={onBack} aria-label="Retour">
            ‹
          </button>
          <span className={styles.statusPill} data-tone="found">
            <span className={styles.statusDot} />
            Découvert
          </span>
        </div>

        <div className={styles.identity}>
          <BodyHero body={body} size={104} tint="#2a2050" />
          <div className={styles.identityText}>
            <h1 className={styles.name} ref={headingRef} tabIndex={-1}>
              {body.name}
            </h1>
            <span className={styles.typeRow}>
              <span
                className={styles.typeDot}
                style={{ background: TYPE_COLOR[body.type] }}
              />
              {TYPE_LABEL[body.type]}
            </span>
            <span className={styles.subtitle}>{describeBody(body)}</span>
          </div>
        </div>

        {simplified && <p className={styles.lede}>{blurb}</p>}

        <div className={styles.stats}>
          <Stat k="Diamètre" v={fmtDiameter(body.facts.diameterKm)} />
          <Stat k="Distance au Soleil" v={fmtKm(body.facts.distanceSunKm)} />
          <Stat
            k="Durée du jour"
            v={fmtDay(body.facts.dayHours)}
            note={locked ? 'toujours la même face' : undefined}
          />
          <Stat
            k="Durée de l'année"
            v={fmtYear(body.facts.yearDays)}
            note={locked ? `un tour de ${parentName}` : undefined}
          />
          <div className={`${styles.stat} ${styles.statTemp}`}>
            <span className={styles.statKey}>Température moyenne</span>
            <span className={styles.statVal}>{fmtTemp(body.facts.tempC)}</span>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Faits marquants</span>
          {highlights.map((h) => (
            <div key={h} className={styles.fact}>
              <span className={styles.factDot} />
              <span className={styles.factText}>{h}</span>
            </div>
          ))}
        </div>

        {!isEarth && (
          <div className={styles.compare} data-dense="true">
            <div className={styles.compareHead}>
              <span className={styles.sectionLabel}>Comparaison d'échelle</span>
              <span className={styles.compareNote}>
                {body.name} = {pct < 1 ? '< 1' : pct} % de la Terre
              </span>
            </div>
            <div className={styles.compareBar}>
              <div
                className={styles.compareFill}
                style={{ width: `${Math.max(1.5, Math.min(pct, 100))}%` }}
              />
            </div>
            <div className={styles.compareScale}>
              <span>
                {body.name} {fmtDiameter(body.facts.diameterKm)}
              </span>
              <span>Terre 12 742 km</span>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {moons.length > 0 ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => onGo(`/zone/${body.id}`)}
            >
              Explorer {body.name}
            </button>
          ) : (
            <button type="button" className={styles.btnPrimary} onClick={() => onGo('/map')}>
              Revenir à la carte
            </button>
          )}
          <button
            type="button"
            className={styles.btnSquare}
            onClick={() => onGo(`/present/${body.id}`, { fromObject: true })}
            aria-label="Mode classe (plein écran)"
            title="Mode classe"
          >
            <span className={styles.btnSquareIcon} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LockedSheet({
  body,
  discovered,
  onBack,
  onGo,
}: SheetProps & { discovered: string[] }) {
  const hint = revealHint(discovered, body.zone);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [body.id]);

  return (
    <div
      className={styles.screen}
      data-locked="true"
      role="region"
      aria-label="Fiche — objet non découvert"
    >
      <BodyHero
        className={styles.backdropBody}
        body={body}
        size={0}
        bleed
        silhouette
        tint="#181234"
      />
      <div className={styles.backdropGlow} />
      <div className={styles.nebula} />
      <div className={styles.particles} />
      <div className={styles.veil} />

      <div className={styles.breadcrumb}>
        <span>Système solaire</span>
        <span className={styles.crumbSep}>›</span>
        <span className={styles.crumbLeaf} data-unknown="true">
          Objet inconnu
        </span>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <button type="button" className={styles.back} onClick={onBack} aria-label="Retour">
            ‹
          </button>
          <span className={styles.statusPill} data-tone="locked">
            Non découvert
          </span>
        </div>

        <div className={styles.unknownWrap}>
          <div className={styles.unknownDisc} aria-hidden>
            ?
          </div>
          <h1 className={styles.unknownName} ref={headingRef} tabIndex={-1}>
            ? ? ?
          </h1>
          <span className={styles.subtitle}>
            {TYPE_LABEL[body.type]} · Zone scellée
          </span>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Ce que l'on sait déjà</span>
          <div className={styles.stats}>
            <div
              className={`${styles.stat} ${styles.statWide}`}
              role="group"
              aria-label={`Distance au Soleil : ${fmtKm(body.facts.distanceSunKm)}`}
            >
              <span className={styles.statKey}>Distance au Soleil</span>
              <span className={styles.statVal}>{fmtKm(body.facts.distanceSunKm)}</span>
            </div>
            <Stat k="Diamètre" v="— — —" muted />
            <Stat k="Durée du jour" v="— — —" muted />
            <Stat
              k="Lunes"
              v={
                body.facts.moons
                  ? `au moins ${Math.min(body.facts.moons, 4)}`
                  : ZONE_META[body.zone].short
              }
            />
          </div>
        </div>

        <div className={styles.reveal}>
          <span className={styles.revealLabel}>Pour la révéler</span>
          <span className={styles.revealText}>{hint.text}</span>
          <div className={styles.revealProgress}>
            <div className={styles.revealTrack}>
              <div
                className={styles.revealFill}
                style={{ width: `${hint.need ? (hint.current / hint.need) * 100 : 0}%` }}
              />
            </div>
            <span className={styles.revealCount}>
              {hint.current}/{hint.need}
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnPrimary} onClick={() => onGo('/quests')}>
            Voir la quête
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  k,
  v,
  muted,
  note,
}: {
  k: string;
  v: string;
  muted?: boolean;
  note?: string;
}) {
  return (
    <div
      className={styles.stat}
      role="group"
      aria-label={note ? `${k} : ${v}, ${note}` : `${k} : ${v}`}
    >
      <span className={styles.statKey}>{k}</span>
      <span className={styles.statVal} data-muted={muted ? 'true' : undefined}>
        {v}
      </span>
      {note && <span className={styles.statHint}>{note}</span>}
    </div>
  );
}
