import { useEffect } from 'react';

/**
 * Lecture à voix haute via l'API Web Speech (`speechSynthesis`).
 * Aucune dépendance, fonctionne hors-ligne avec les voix du système.
 * Piloté par la préférence `readAloud` (voir `usePrefsEffects`).
 */

function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Choisit une voix française si le système en propose une. */
function frenchVoice(): SpeechSynthesisVoice | undefined {
  if (!supported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang.startsWith('fr'))
  );
}

export function speak(text: string) {
  if (!supported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 0.98;
  u.pitch = 1;
  const v = frenchVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}

/**
 * Lit `text` au montage (et à chaque changement) quand `enabled` est vrai.
 * Coupe la lecture en quittant l'écran.
 */
export function useReadAloud(text: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !text) return;
    // petit délai : laisse l'écran se poser avant de parler
    const id = window.setTimeout(() => speak(text), 350);
    return () => {
      window.clearTimeout(id);
      stopSpeaking();
    };
  }, [text, enabled]);
}
