import { useEffect } from 'react';
import { ambient } from '@/lib/ambient';
import { stopSpeaking } from '@/lib/speech';
import { useProgress } from './progress';

/**
 * Applique les préférences (`prefs`) à l'app. Monté une fois dans `AppLayout`.
 * - `simplified` → attribut `data-simplified` sur `<html>` (styles dans `global.css`)
 * - `readAloud`  → attribut `data-readaloud` (indicatif) ; la lecture elle-même
 *   est déclenchée écran par écran via `useReadAloud`
 * - `ambientSound` → démarre / arrête la nappe Web Audio
 */
export function usePrefsEffects() {
  const prefs = useProgress((s) => s.prefs);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.simplified) root.dataset.simplified = 'true';
    else delete root.dataset.simplified;
  }, [prefs.simplified]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.readAloud) root.dataset.readaloud = 'true';
    else {
      delete root.dataset.readaloud;
      stopSpeaking();
    }
  }, [prefs.readAloud]);

  useEffect(() => {
    ambient.setEnabled(prefs.ambientSound);
  }, [prefs.ambientSound]);
}
