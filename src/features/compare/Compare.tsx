import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BodySphere } from '@/components/BodySphere';
import BODIES, { TYPE_LABEL, bodyById } from '@/data/bodies';
import type { Body } from '@/data/types';
import { fmtDiameter, fmtGravity, fmtYear } from '@/data/format';
import { useProgress } from '@/store/progress';
import { useDialog } from '@/lib/useDialog';
import styles from './Compare.module.css';

interface Metric {
  key: string;
  label: string;
  value: (b: Body) => number;
  format: (b: Body) => string;
}

const METRICS: Metric[] = [
  {
    key: 'diameter',
    label: 'Diamètre',
    value: (b) => b.facts.diameterKm,
    format: (b) => fmtDiameter(b.facts.diameterKm),
  },
  {
    key: 'gravity',
    label: 'Gravité',
    value: (b) => b.facts.gravity ?? 0,
    format: (b) => fmtGravity(b.facts.gravity),
  },
  {
    key: 'year',
    label: "Durée de l'année",
    value: (b) => b.facts.yearDays,
    format: (b) => fmtYear(b.facts.yearDays),
  },
];

const fr1 = (n: number) => n.toFixed(1).replace('.', ',');

function blurbFor(a: Body, b: Body): string {
  const parts: string[] = [];
  const ga = a.facts.gravity;
  const gb = b.facts.gravity;
  if (ga && gb) {
    const r = gb / ga;
    parts.push(
      r < 1
        ? `Sur ${b.name}, tu pèserais environ ${Math.round(r * 100)} % de ton poids sur ${a.name}.`
        : `Sur ${b.name}, tu pèserais à peu près ${fr1(r)} fois ton poids sur ${a.name}.`,
    );
  }
  if (a.facts.yearDays && b.facts.yearDays) {
    const r = b.facts.yearDays / a.facts.yearDays;
    if (r >= 1.15)
      parts.push(`Et une année y dure ${r < 2 ? 'presque ' : ''}${fr1(r)}× plus longtemps.`);
    else if (r <= 0.85)
      parts.push(`En revanche, l'année y file : ${fr1(1 / r)}× plus vite.`);
  }
  return parts.join(' ') || `${a.name} et ${b.name}, côte à côte.`;
}

const COMPARABLE = BODIES.filter((x) => !x.wanderer && x.type !== 'star');

export function Compare() {
  const [params, setParams] = useSearchParams();
  const discovered = useProgress((s) => s.discovered);
  const markCompareUsed = useProgress((s) => s.markCompareUsed);

  const known = useMemo(
    () => COMPARABLE.filter((x) => discovered.includes(x.id)),
    [discovered],
  );

  const fallbackA = known[0]?.id ?? 'terre';
  const fallbackB = known[1]?.id ?? 'mars';
  const aId = params.get('a') ?? fallbackA;
  const bId = params.get('b') ?? fallbackB;

  const a = bodyById(aId);
  const b = bodyById(bId);

  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const pickerRef = useDialog<HTMLDivElement>(() => setPicking(null), picking !== null);

  // On valide la quête « comparateur » quand l'enfant choisit lui-même un astre,
  // pas au simple chargement de la page (les côtés ont une valeur par défaut).
  const setSide = (side: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(params);
    next.set(side, id);
    setParams(next, { replace: true });
    setPicking(null);
    const other = side === 'a' ? b : a;
    if (discovered.includes(id) && other && discovered.includes(other.id)) markCompareUsed();
  };

  const enoughKnown = known.length >= 2;
  const maxD = a && b ? Math.max(a.facts.diameterKm, b.facts.diameterKm) : 1;

  return (
    <div className={styles.screen}>
      <div className={styles.nebula} />

      <div className={styles.inner}>
        <Link to="/codex" className={styles.back}>
          ‹ Retour au carnet
        </Link>

        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Outil du carnet</div>
            <h1 className={styles.title}>Comparer deux mondes</h1>
          </div>
          <button type="button" className={styles.swap} onClick={() => setPicking('a')}>
            Changer les objets
          </button>
        </header>

        {!enoughKnown && (
          <p className={styles.pickEmpty}>
            Découvre au moins deux objets pour les comparer.
          </p>
        )}

        <div className={styles.duo}>
          <BodyPick side="a" body={a} onClick={() => setPicking('a')} maxD={maxD} />
          <div className={styles.vs}>VS</div>
          <BodyPick side="b" body={b} onClick={() => setPicking('b')} maxD={maxD} />
        </div>

        {a && b && (
          <>
            <div className={styles.rows}>
              {METRICS.map((m) => {
                const va = m.value(a);
                const vb = m.value(b);
                const max = Math.max(va, vb, 1);
                return (
                  <div
                    key={m.key}
                    role="group"
                    aria-label={`${m.label} — ${a.name} : ${m.format(a)}, ${b.name} : ${m.format(b)}`}
                  >
                    <div className={styles.row} aria-hidden>
                      <div className={styles.barWrapL}>
                        <span
                          className={styles.bar}
                          data-side="a"
                          style={{ width: `${Math.max((va / max) * 100, 4)}%` }}
                        />
                      </div>
                      <span className={styles.metric}>{m.label}</span>
                      <div className={styles.barWrapR}>
                        <span
                          className={styles.bar}
                          data-side="b"
                          style={{ width: `${Math.max((vb / max) * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                    <div className={styles.vals} aria-hidden>
                      <span className={styles.valL}>{m.format(a)}</span>
                      <span />
                      <span>{m.format(b)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.blurb} role="status" aria-live="polite">
              <span className={styles.blurbIcon} aria-hidden />
              <span className={styles.blurbText}>{blurbFor(a, b)}</span>
            </div>
          </>
        )}
      </div>

      {picking && (
        <div
          ref={pickerRef}
          className={styles.overlay}
          onClick={() => setPicking(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Choisir ${picking === 'a' ? 'le premier' : 'le second'} objet`}
        >
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>
                Choisir {picking === 'a' ? 'le premier' : 'le second'} objet
              </span>
              <button
                type="button"
                className={styles.panelClose}
                onClick={() => setPicking(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className={styles.grid}>
              {known.map((body) => {
                const current = body.id === (picking === 'a' ? aId : bId);
                return (
                  <button
                    key={body.id}
                    type="button"
                    className={styles.tile}
                    data-current={current ? 'true' : undefined}
                    aria-pressed={current}
                    onClick={() => setSide(picking, body.id)}
                  >
                    <BodySphere body={body} size={42} />
                    <span className={styles.tileName}>{body.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BodyPick({
  side,
  body,
  onClick,
  maxD,
}: {
  side: 'a' | 'b';
  body: Body | undefined;
  onClick: () => void;
  maxD: number;
}) {
  const d = body
    ? Math.max(44, Math.min(160, 160 * Math.pow(body.facts.diameterKm / maxD, 0.72)))
    : 0;
  return (
    <button
      type="button"
      className={styles.pick}
      data-side={side}
      onClick={onClick}
      aria-label={
        body
          ? `${body.name}, ${TYPE_LABEL[body.type].toLowerCase()} — changer cet objet`
          : 'Choisir un objet à comparer'
      }
    >
      {body ? (
        <>
          <BodySphere body={body} size={d} />
          <span className={styles.pickName}>{body.name}</span>
          <span className={styles.pickType}>{TYPE_LABEL[body.type]}</span>
        </>
      ) : (
        <span className={styles.pickEmpty}>Choisir un objet</span>
      )}
    </button>
  );
}
