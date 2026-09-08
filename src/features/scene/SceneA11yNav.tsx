import { useState } from 'react';
import styles from './SceneA11yNav.module.css';

/**
 * Passerelle clavier / lecteur d'écran vers la scène 3D (qui est `aria-hidden`).
 * Une liste de boutons — un par élément atteignable — qui déclenchent la même
 * action qu'un clic dans le canvas. Invisible tant qu'aucun bouton n'a le focus,
 * puis affichée en petit panneau flottant pour les personnes qui naviguent au
 * clavier.
 */
export interface SceneNavItem {
  id: string;
  label: string;
  /** court complément (ex. « centre », « dans la brume ») */
  tag?: string;
  onSelect: () => void;
}

interface SceneA11yNavProps {
  label: string;
  hint: string;
  items: SceneNavItem[];
}

export function SceneA11yNav({ label, hint, items }: SceneA11yNavProps) {
  const [focused, setFocused] = useState(false);

  return (
    <nav
      aria-label={label}
      className={styles.nav}
      data-open={focused ? 'true' : undefined}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      <p className={styles.hint} aria-hidden={!focused}>
        {hint}
      </p>
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className={styles.item} onClick={it.onSelect}>
              {it.label}
              {it.tag && <span className={styles.tag}>{it.tag}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
