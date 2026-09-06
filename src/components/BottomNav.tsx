import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

type Tab = 'map' | 'codex' | 'quests' | 'profile';

const TABS: { to: string; key: Tab; label: string }[] = [
  { to: '/map', key: 'map', label: 'Carte' },
  { to: '/codex', key: 'codex', label: 'Carnet' },
  { to: '/quests', key: 'quests', label: 'Quêtes' },
  { to: '/profile', key: 'profile', label: 'Profil' },
];

/** Barre d'onglets mobile (artboards `3b`, `3c`…). */
export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className={styles.bar}>
      {TABS.map((t) => (
        <NavLink
          key={t.key}
          to={t.to}
          className={styles.tab}
          data-active={t.key === active ? 'true' : undefined}
        >
          <span className={styles.glyph} data-shape={t.key === 'map' || t.key === 'profile' ? 'round' : 'square'} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
