import { Avatar } from '@/components/Avatar';
import styles from './Hud.module.css';

interface HudProps {
  discoveredCount: number;
  total: number;
  zoneLabel: string;
  avatarId: number;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  realScale: boolean;
  onToggleRealScale: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onOpenCodex: () => void;
  onOpenQuests: () => void;
  sealedZones: number;
}

export function Hud({
  discoveredCount,
  total,
  zoneLabel,
  avatarId,
  onOpenProfile,
  onOpenSearch,
  realScale,
  onToggleRealScale,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onOpenCodex,
  onOpenQuests,
  sealedZones,
}: HudProps) {
  const pct = total ? Math.round((discoveredCount / total) * 100) : 0;

  return (
    <>
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={onOpenProfile}
        data-nodrag
        aria-label="Ouvrir le profil"
      >
        <Avatar id={avatarId} size={40} />
      </button>

      <div className={`${styles.panel} ${styles.breadcrumb}`} data-nodrag>
        <span className={styles.crumbKey}>Zone</span>
        <span className={styles.crumbRoot}>Système solaire</span>
        <span className={styles.crumbSep}>›</span>
        <span className={styles.crumbZone}>{zoneLabel}</span>
      </div>

      <button
        type="button"
        className={`${styles.panel} ${styles.discoveries}`}
        data-nodrag
        onClick={onOpenCodex}
        aria-label="Ouvrir le carnet"
      >
        <div className={styles.token} />
        <div className={styles.count}>
          <div className={styles.countNum}>
            {discoveredCount} / {total}
          </div>
          <div className={styles.countLabel}>découvertes</div>
        </div>
        <div className={styles.divider} />
        <div className={styles.meter}>
          <div className={styles.meterTrack}>
            <div className={styles.meterFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.meterLabel}>CARNET {pct}%</div>
        </div>
      </button>

      <button
        type="button"
        className={styles.searchBtn}
        data-nodrag
        onClick={onOpenSearch}
        aria-label="Chercher un astre"
      >
        <span className={styles.searchGlyph} />
      </button>

      <button type="button" className={styles.questsBtn} onClick={onOpenQuests} data-nodrag>
        <span className={styles.questsGlyph} />
        Quêtes
      </button>

      <button
        type="button"
        className={styles.scaleToggle}
        onClick={onToggleRealScale}
        aria-pressed={realScale}
      >
        <span className={styles.switch} data-on={realScale}>
          <span className={styles.knob} />
        </span>
        <span className={styles.scaleText}>Échelle réelle</span>
        <span className={styles.scaleState}>{realScale ? 'ON' : 'OFF'}</span>
      </button>

      <div className={styles.zoom}>
        <button type="button" className={styles.zoomBtn} onClick={onZoomIn} aria-label="Zoomer">
          +
        </button>
        <button type="button" className={styles.zoomBtn} onClick={onZoomOut} aria-label="Dézoomer">
          −
        </button>
        <button
          type="button"
          className={`${styles.zoomBtn} ${styles.ghost}`}
          onClick={onRecenter}
          aria-label="Recentrer"
        >
          <span className={styles.recenterDot} />
        </button>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendRule} />
        {sealedZones > 0
          ? `Brume cosmique — ${sealedZones} zone${sealedZones > 1 ? 's' : ''} scellée${
              sealedZones > 1 ? 's' : ''
            }`
          : 'Brume cosmique — tout est révélé'}
        <span className={styles.legendRule} />
      </div>
    </>
  );
}
