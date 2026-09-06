import { useEffect, useMemo, useRef } from 'react';
import { bodyById, mainMapBodies } from '@/data/bodies';
import { useProgress } from '@/store/progress';
import { unlockedZones } from '@/store/selectors';
import styles from './RealScaleView.module.css';

const AU_KM = 149_597_870;
const PX_PER_AU = 200;
const LEFT_MARGIN = 120;
const MAX_AU = 42; // jusqu'à Pluton ; on écarte Sedna / comètes

function dotSize(diameterKm: number, isStar: boolean): number {
  if (isStar) return 42;
  return Math.max(5, Math.sqrt(diameterKm) / 30);
}

/** Artboard `3g` : le système à la vraie échelle des distances. */
export function RealScaleView({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const discovered = useProgress((s) => s.discovered);
  const unlocked = useMemo(() => unlockedZones(discovered), [discovered]);

  const sun = bodyById('soleil')!;
  const planets = useMemo(
    () =>
      mainMapBodies()
        .filter((b) => b.facts.distanceSunKm / AU_KM <= MAX_AU)
        .sort((a, b) => a.facts.distanceSunKm - b.facts.distanceSunKm),
    [],
  );

  const stripWidth = LEFT_MARGIN + MAX_AU * PX_PER_AU + 200;

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
  }, []);

  const auToX = (au: number) => LEFT_MARGIN + au * PX_PER_AU;

  return (
    <div className={styles.screen} ref={scrollRef}>
      <div className={styles.stars} />

      <div className={styles.strip} style={{ width: stripWidth }}>
        <div className={styles.baseline} />

        {/* Soleil */}
        <div
          className={styles.body}
          style={{
            left: LEFT_MARGIN,
            width: dotSize(sun.facts.diameterKm, true),
            height: dotSize(sun.facts.diameterKm, true),
            background:
              'radial-gradient(circle at 36% 30%, #fff3cd, #ffca5c 34%, #f0912c 68%, #cf5f1c)',
            boxShadow: '0 0 44px rgba(255,167,64,.7)',
          }}
        />
        <span className={styles.bodyLabel} style={{ left: LEFT_MARGIN }}>
          Soleil
        </span>

        {/* graduations */}
        {Array.from({ length: MAX_AU + 1 }, (_, au) => au).map((au) =>
          au % 2 === 0 ? (
            <div key={au} className={styles.tick} style={{ left: auToX(au) }}>
              <span className={styles.tickMark} />
              <span className={styles.tickLabel}>{au} UA</span>
            </div>
          ) : null,
        )}

        {/* planètes */}
        {planets.map((b) => {
          const au = b.facts.distanceSunKm / AU_KM;
          const x = auToX(au);
          const revealed = discovered.includes(b.id) || unlocked.has(b.zone);
          const [c1, c2, c3] = b.gradient;
          const s = dotSize(b.facts.diameterKm, false);
          return (
            <div key={b.id}>
              <div
                className={styles.body}
                style={{
                  left: x,
                  width: s,
                  height: s,
                  background: revealed
                    ? `radial-gradient(circle at 34% 28%, ${c1}, ${c2} 46%, ${c3})`
                    : 'var(--fog-body)',
                  opacity: revealed ? 1 : 0.7,
                  boxShadow: revealed ? `0 0 10px ${c2}66` : 'none',
                }}
              />
              <span
                className={styles.bodyLabel}
                data-unknown={!revealed ? 'true' : undefined}
                style={{ left: x }}
              >
                {revealed ? b.name : '???'}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.hint}>Fais défiler →</div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>À la vraie échelle, c'est surtout du vide</h2>
        <p className={styles.panelText}>
          Les distances sont exactes : la Terre tient à 150 millions de kilomètres du
          Soleil, Neptune trente fois plus loin. Les tailles des billes restent
          exagérées, sinon les planètes seraient invisibles.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onClose}>
            Revenir à la carte de jeu
          </button>
        </div>
      </div>
    </div>
  );
}
