import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodySphere } from '@/components/BodySphere';
import BODIES_ALL, { bodyById, TYPE_LABEL } from '@/data/bodies';
import type { Body, BodyType } from '@/data/types';
import { questById } from '@/data/quests';
import { useProgress } from '@/store/progress';
import { unlockedZones } from '@/store/selectors';
import styles from './SearchOverlay.module.css';

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const FILTERS: { type: BodyType; label: string }[] = [
  { type: 'rocky', label: 'Tellurique' },
  { type: 'gas', label: 'Géante' },
  { type: 'ice', label: 'Glace' },
  { type: 'small', label: 'Petit corps' },
];

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const discovered = useProgress((s) => s.discovered);
  const activeQuestId = useProgress((s) => s.activeQuestId);

  const [q, setQ] = useState('');
  const [types, setTypes] = useState<Set<BodyType>>(new Set());

  const unlocked = useMemo(() => unlockedZones(discovered), [discovered]);
  const questTargets = useMemo(() => {
    const quest = questById(activeQuestId);
    if (!quest) return new Set<string>();
    return new Set(
      quest.objectives.flatMap((o) => [
        ...(o.target ? [o.target] : []),
        ...(o.targets ?? []),
      ]),
    );
  }, [activeQuestId]);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    return BODIES_ALL.filter((b) => {
      const known = discovered.includes(b.id) || unlocked.has(b.zone);
      if (!known) return false;
      if (types.size && !types.has(b.type)) return false;
      if (!nq) return true;
      return norm(b.name).includes(nq);
    }).slice(0, 40);
  }, [q, discovered, unlocked, types]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleType = (t: BodyType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const subtitle = (b: Body) => {
    const parent = b.parent ? bodyById(b.parent) : undefined;
    return parent ? `Lune · ${parent.name}` : TYPE_LABEL[b.type];
  };

  const pick = (b: Body) => {
    if (!discovered.includes(b.id)) return;
    onClose();
    navigate(`/object/${b.id}`);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.field}>
          <span className={styles.fieldIcon} />
          <input
            className={styles.input}
            type="text"
            value={q}
            autoFocus
            placeholder="Chercher un astre…"
            onChange={(e) => setQ(e.target.value)}
          />
          <span className={styles.count}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.results}>
          {results.length === 0 ? (
            <div className={styles.empty}>
              Rien trouvé. Essaie un autre nom, ou explore encore un peu.
            </div>
          ) : (
            results.map((b) => {
              const found = discovered.includes(b.id);
              const isQuest = questTargets.has(b.id) && !found;
              return (
                <button
                  key={b.id}
                  type="button"
                  className={styles.row}
                  data-quest={isQuest ? 'true' : undefined}
                  disabled={!found}
                  onClick={() => pick(b)}
                >
                  <BodySphere
                    body={b}
                    size={44}
                    silhouette={!found}
                    className={styles.rIcon}
                  />
                  <span className={styles.rBody}>
                    <span className={styles.rName} data-unknown={!found ? 'true' : undefined}>
                      {found ? b.name : '???'}
                    </span>
                    <span className={styles.rSub}>{subtitle(b)}</span>
                  </span>
                  <span
                    className={styles.rStatus}
                    data-tone={isQuest ? 'quest' : found ? 'found' : 'locked'}
                  >
                    {isQuest ? 'Quête active' : found ? 'Découvert' : 'Non découvert'}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.filters}>
          <span className={styles.filterLabel}>Filtrer</span>
          {FILTERS.map((f) => (
            <button
              key={f.type}
              type="button"
              className={styles.pill}
              data-on={types.has(f.type) ? 'true' : undefined}
              onClick={() => toggleType(f.type)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
