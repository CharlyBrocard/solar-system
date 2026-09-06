import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BodySphere } from '@/components/BodySphere';
import { BottomNav } from '@/components/BottomNav';
import { bodiesOfZone, wanderers, TOTAL_BODIES } from '@/data/bodies';
import type { Body } from '@/data/types';
import BADGES from '@/data/badges';
import { useProgress } from '@/store/progress';
import { unlockedZones } from '@/store/selectors';
import styles from './Codex.module.css';

interface Section {
  key: string;
  label: string;
  accent: string;
  bodies: Body[];
}

function buildSections(): Section[] {
  return [
    { key: 'interne', label: 'Système interne', accent: 'var(--type-rocky)', bodies: bodiesOfZone('interne') },
    { key: 'ceinture', label: "Ceinture d'astéroïdes", accent: 'var(--type-small)', bodies: bodiesOfZone('ceinture') },
    { key: 'geantes', label: 'Géantes gazeuses', accent: 'var(--type-gas)', bodies: bodiesOfZone('geantes') },
    { key: 'externe', label: 'Système externe', accent: 'var(--type-ice)', bodies: bodiesOfZone('externe') },
    { key: 'errants', label: 'Comètes & sondes', accent: 'var(--type-small)', bodies: wanderers() },
  ];
}

export function Codex() {
  const discovered = useProgress((s) => s.discovered);
  const badges = useProgress((s) => s.badges);
  const unlocked = useMemo(() => unlockedZones(discovered), [discovered]);

  const sections = useMemo(buildSections, []);
  const discoveredSet = useMemo(() => new Set(discovered), [discovered]);
  const lastDiscovered = discovered[discovered.length - 1];

  const pct = Math.round((discovered.length / TOTAL_BODIES) * 100);
  const nextBadge = BADGES.find((b) => !badges.includes(b.id));

  return (
    <div className={styles.screen}>
      <div className={styles.nebula} />

      <div className={styles.inner}>
        <Link to="/map" className={styles.back}>
          ‹ Retour à la carte
        </Link>

        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Collection</div>
            <h1 className={styles.title}>Carnet de bord</h1>
          </div>
          <Link to="/compare" className={styles.compareLink}>
            Comparer deux mondes
          </Link>
          <div className={styles.total}>
            <div>
              <div className={styles.totalNum}>
                {discovered.length} / {TOTAL_BODIES}
              </div>
              <div className={styles.totalKey}>objets découverts</div>
            </div>
            <div className={styles.totalBar}>
              <div className={styles.totalFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          {sections.map((section) => {
            const found = section.bodies.filter((b) => discoveredSet.has(b.id)).length;
            return (
              <section key={section.key} className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionName}>{section.label}</span>
                  <div className={styles.sectionTrack}>
                    <div
                      className={styles.sectionProgress}
                      style={{
                        width: `${section.bodies.length ? (found / section.bodies.length) * 100 : 0}%`,
                        background: section.accent,
                      }}
                    />
                  </div>
                  <span className={styles.sectionCount}>
                    {found}/{section.bodies.length}
                  </span>
                </div>

                <div className={styles.tiles}>
                  {section.bodies.map((body) => {
                    const isFound = discoveredSet.has(body.id);
                    // révélé si découvert, ou si sa zone est ouverte (silhouette nommée)
                    const zoneOpen = unlocked.has(body.zone);

                    if (!isFound) {
                      return (
                        <div
                          key={body.id}
                          className={styles.tile}
                          data-locked="true"
                          title={zoneOpen ? 'Pas encore découvert' : 'Zone scellée'}
                        >
                          <div className={styles.lockDisc}>
                            <span className={styles.lockIcon} />
                          </div>
                          <span className={styles.tileUnknown}>? ? ?</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={body.id}
                        to={`/object/${body.id}`}
                        className={styles.tile}
                        data-current={body.id === lastDiscovered ? 'true' : undefined}
                      >
                        <BodySphere body={body} size={46} />
                        <span className={styles.tileName}>{body.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {nextBadge && (
          <div className={styles.nextBadge}>
            <span className={styles.badgeIcon} />
            <div>
              <div className={styles.badgeTitle}>Prochain badge : {nextBadge.title}</div>
              <div className={styles.badgeHint}>{nextBadge.hint}</div>
            </div>
          </div>
        )}
      </div>

      <BottomNav active="codex" />
    </div>
  );
}
