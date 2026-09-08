import { useEffect, useRef } from 'react';
import { ambient } from '@/lib/ambient';
import { sfx } from '@/lib/sfx';
import { stopSpeaking } from '@/lib/speech';
import { useProgress } from './progress';

/**
 * Applique les préférences (`prefs`) à l'app. Monté une fois dans `AppLayout`.
 * - `simplified` → attribut `data-simplified` sur `<html>` (styles dans `global.css`)
 * - `readAloud`  → attribut `data-readaloud` (indicatif) ; la lecture elle-même
 *   est déclenchée écran par écran via `useReadAloud`
 * - `ambientSound` → démarre / arrête la nappe Web Audio
 * - `soundEffects` → active les petits « blips » ; ce hook joue aussi les sons
 *   de découverte et de quête accomplie quand l'état transitoire change.
 */
export function usePrefsEffects() {
  const prefs = useProgress((s) => s.prefs);
  const discoveredCount = useProgress((s) => s.discovered.length);
  const questQueueLen = useProgress((s) => s.pendingQuestCompletions.length);

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

  useEffect(() => {
    sfx.setEnabled(prefs.soundEffects);
  }, [prefs.soundEffects]);

  // son de découverte : au changement du nombre d'astres découverts (pas au montage)
  const prevDiscovered = useRef(discoveredCount);
  useEffect(() => {
    if (discoveredCount > prevDiscovered.current) sfx.play('discovery');
    prevDiscovered.current = discoveredCount;
  }, [discoveredCount]);

  // son de quête : quand une quête entre dans la file de célébration
  const prevQueue = useRef(questQueueLen);
  useEffect(() => {
    if (questQueueLen > prevQueue.current) sfx.play('quest');
    prevQueue.current = questQueueLen;
  }, [questQueueLen]);
}
