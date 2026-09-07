import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, SHIPS } from '@/components/Ship';
import { ShipHero } from '@/components/ShipHero';
import { useProgress } from '@/store/progress';
import styles from './Onboarding.module.css';

/**
 * Première ouverture (artboard `4c`) : nom d'explorateur + vaisseau.
 * Deux modes : création (depuis l'écran d'entrée) et modification (depuis le profil).
 */
export function Onboarding() {
  const navigate = useNavigate();
  const startGame = useProgress((s) => s.startGame);
  const savedName = useProgress((s) => s.explorerName);
  const savedAvatar = useProgress((s) => s.avatarId);

  const editing = savedName !== '';

  const [name, setName] = useState(savedName);
  const [avatarId, setAvatarId] = useState(savedAvatar);

  const trimmed = name.trim();
  const changed = trimmed !== savedName || avatarId !== savedAvatar;

  const save = (to: string) => {
    startGame(trimmed || savedName || 'Anonyme', avatarId);
    navigate(to);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.neb1} />
      <div className={styles.neb2} />

      <form
        className={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) save(editing ? '/profile' : '/map');
        }}
      >
        <span className={styles.eyebrow}>{editing ? 'Ton équipage' : 'Avant de partir'}</span>
        <h1 className={styles.title}>
          {editing ? 'Change de nom ou de vaisseau' : 'Qui explore aujourd’hui ?'}
        </h1>

        <label className={styles.nameField}>
          <span className={styles.nameKey}>Nom</span>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            maxLength={24}
            autoFocus
            placeholder="Capitaine…"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className={styles.ships}>
          <span className={styles.shipsLabel}>Choisis ton vaisseau</span>
          <ShipHero id={avatarId} size={150} className={styles.hangar} tint="#181334" />
          <div className={styles.shipRow}>
            {SHIPS.map((ship, i) => (
              <button
                key={ship.name}
                type="button"
                className={styles.ship}
                data-selected={i === avatarId ? 'true' : undefined}
                onClick={() => setAvatarId(i)}
                aria-label={ship.name}
                aria-pressed={i === avatarId}
              >
                <Ship
                  id={i}
                  size={96}
                  style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
                />
              </button>
            ))}
          </div>
          <span className={styles.shipName}>{SHIPS[avatarId]?.name ?? SHIPS[0].name}</span>
        </div>

        <div className={styles.actions}>
          {editing ? (
            <>
              <button
                type="submit"
                className={styles.primary}
                disabled={!trimmed || !changed}
              >
                Enregistrer
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => navigate('/profile')}
              >
                Annuler
              </button>
            </>
          ) : (
            <button type="submit" className={styles.primary} disabled={!trimmed}>
              Commencer l'exploration
            </button>
          )}
        </div>

        <span className={styles.foot}>
          Aucun compte, aucune donnée envoyée : la progression reste sur cet appareil.
        </span>
      </form>
    </div>
  );
}
