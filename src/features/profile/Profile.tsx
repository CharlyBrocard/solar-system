import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShipHero } from '@/components/ShipHero';
import { BodySphere } from '@/components/BodySphere';
import { BottomNav } from '@/components/BottomNav';
import BADGES from '@/data/badges';
import { bodyById, TYPE_LABEL } from '@/data/bodies';
import { currentLevel, POINTS_PER_LEVEL, useProgress } from '@/store/progress';
import type { GraphicsPref } from '@/store/progress';
import { unlockedZones } from '@/store/selectors';
import { ambient } from '@/lib/ambient';
import { speak } from '@/lib/speech';
import styles from './Profile.module.css';

type BoolPref = 'readAloud' | 'simplified' | 'ambientSound';

const PREF_LABELS: Record<BoolPref, string> = {
  readAloud: 'Lecture des textes à voix haute',
  simplified: 'Mode simplifié (8-10 ans)',
  ambientSound: 'Ambiance sonore',
};

const PREF_HINTS: Record<BoolPref, string> = {
  readAloud: 'Chaque fiche est lue automatiquement quand tu l’ouvres.',
  simplified: 'Textes plus gros, aérés, et on masque les détails techniques.',
  ambientSound: 'Une nappe sonore très douce en fond d’exploration.',
};

const GRAPHICS_OPTIONS: { value: GraphicsPref; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'bas', label: 'Basse' },
  { value: 'moyen', label: 'Moyenne' },
  { value: 'eleve', label: 'Élevée' },
];

export function Profile() {
  const explorerName = useProgress((s) => s.explorerName);
  const avatarId = useProgress((s) => s.avatarId);
  const discovered = useProgress((s) => s.discovered);
  const badges = useProgress((s) => s.badges);
  const completedQuests = useProgress((s) => s.completedQuests);
  const points = useProgress((s) => s.points);
  const prefs = useProgress((s) => s.prefs);
  const setPref = useProgress((s) => s.setPref);

  const level = currentLevel(points);
  const intoLevel = points % POINTS_PER_LEVEL;

  const zones = useMemo(() => unlockedZones(discovered).size, [discovered]);
  const badgeSet = useMemo(() => new Set(badges), [badges]);
  const earned = BADGES.filter((b) => badgeSet.has(b.id));
  const recent = [...discovered].reverse().slice(0, 4);

  return (
    <div className={styles.screen}>
      <div className={styles.nebula} />

      <div className={styles.inner}>
        <Link to="/map" className={styles.back}>
          ‹ Retour à la carte
        </Link>

        <div className={styles.head}>
          <ShipHero id={avatarId} size={96} tint="#191436" />
          <div className={styles.identity}>
            <span className={styles.rank}>
              Explorateur · niveau {level}
              <Link to="/start" className={styles.editLink}>
                Modifier
              </Link>
            </span>
            <h1 className={styles.name}>{explorerName || 'Anonyme'}</h1>
            <div className={styles.xp}>
              <div className={styles.xpTrack}>
                <div
                  className={styles.xpFill}
                  style={{ width: `${(intoLevel / POINTS_PER_LEVEL) * 100}%` }}
                />
              </div>
              <span className={styles.xpLabel}>
                {intoLevel} / {POINTS_PER_LEVEL} pts
              </span>
            </div>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{discovered.length}</span>
              <span className={styles.statKey}>objets</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{completedQuests.length}</span>
              <span className={styles.statKey}>quêtes</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{zones}</span>
              <span className={styles.statKey}>zones</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>
            Badges — {earned.length} / {BADGES.length}
          </span>
          <div className={styles.badges}>
            {BADGES.map((badge) => {
              const has = badgeSet.has(badge.id);
              return (
                <div key={badge.id} className={styles.badge} data-locked={!has ? 'true' : undefined}>
                  {has ? (
                    <span className={styles.badgeIcon} />
                  ) : (
                    <span className={styles.badgeLock}>
                      <span className={styles.lockIcon} />
                    </span>
                  )}
                  <span className={has ? styles.badgeName : styles.badgeUnknown}>
                    {has ? badge.title : '? ? ?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.panel}>
            <span className={styles.sectionLabel}>Dernières découvertes</span>
            {recent.length === 0 ? (
              <span className={styles.empty}>Ton carnet est encore vide.</span>
            ) : (
              recent.map((id) => {
                const body = bodyById(id);
                if (!body) return null;
                return (
                  <div key={id} className={styles.recent}>
                    <BodySphere body={body} size={32} />
                    {body.name}
                    <span className={styles.rSub}>{TYPE_LABEL[body.type]}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.panel}>
            <span className={styles.sectionLabel}>Préférences</span>
            {(Object.keys(PREF_LABELS) as BoolPref[]).map((key) => (
              <div key={key} className={styles.pref}>
                <span className={styles.prefText}>
                  <span className={styles.prefLabel}>{PREF_LABELS[key]}</span>
                  <span className={styles.prefHint}>{PREF_HINTS[key]}</span>
                </span>
                <button
                  type="button"
                  className={styles.toggle}
                  data-on={prefs[key] ? 'true' : undefined}
                  onClick={() => {
                    const next = !prefs[key];
                    setPref(key, next);
                    // effets qui doivent partir dans le geste de l'utilisateur
                    if (key === 'ambientSound') ambient.setEnabled(next);
                    if (key === 'readAloud' && next) {
                      speak('La lecture à voix haute est activée.');
                    }
                  }}
                  aria-pressed={prefs[key]}
                  aria-label={PREF_LABELS[key]}
                >
                  <span className={styles.knob} />
                </button>
              </div>
            ))}

            <div className={styles.pref}>
              <span className={styles.prefText}>
                <span className={styles.prefLabel}>Qualité des graphismes</span>
                <span className={styles.prefHint}>
                  « Auto » s’adapte à ton appareil. Baisse-la si l’exploration
                  saccade.
                </span>
              </span>
              <div className={styles.segmented} role="group" aria-label="Qualité des graphismes">
                {GRAPHICS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={styles.segBtn}
                    data-on={prefs.graphics === opt.value ? 'true' : undefined}
                    aria-pressed={prefs.graphics === opt.value}
                    onClick={() => setPref('graphics', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
