/**
 * Petits effets sonores — synthétisés à la volée (Web Audio), zéro fichier.
 * Des « blips » très courts pour ponctuer les moments-clés : découverte,
 * plongée, quête accomplie, bonne / mauvaise réponse.
 *
 * Piloté par la préférence `soundEffects` (indépendante de `ambientSound`).
 * Volume modéré (~0.16). Ne joue jamais si désactivé.
 */

export type SfxName = 'discovery' | 'dive' | 'quest' | 'correct' | 'wrong' | 'tap';

const MASTER_GAIN = 0.16;

class SfxPlayer {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private unlock: (() => void) | null = null;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensureCtx();
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      if (!this.unlock) {
        this.unlock = () => this.ctx?.resume().catch(() => {});
        window.addEventListener('pointerdown', this.unlock, { once: true });
        window.addEventListener('keydown', this.unlock, { once: true });
      }
    }
    return this.ctx;
  }

  /** Une note simple : oscillateur + enveloppe exponentielle. */
  private note(
    ctx: AudioContext,
    at: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    glideTo?: number,
  ) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(g).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  play(name: SfxName) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const G = MASTER_GAIN;

    switch (name) {
      case 'discovery':
        // éclat montant à deux notes, cloche douce
        this.note(ctx, t, 660, 0.18, 'triangle', G * 0.9);
        this.note(ctx, t + 0.09, 990, 0.28, 'sine', G * 0.8);
        break;
      case 'dive':
        // souffle descendant
        this.note(ctx, t, 420, 0.42, 'sawtooth', G * 0.5, 90);
        break;
      case 'quest': {
        // arpège majeur ascendant (do-mi-sol-do)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => this.note(ctx, t + i * 0.1, f, 0.26, 'triangle', G * 0.85));
        break;
      }
      case 'correct':
        this.note(ctx, t, 880, 0.12, 'triangle', G * 0.8);
        this.note(ctx, t + 0.08, 1318.5, 0.22, 'sine', G * 0.75);
        break;
      case 'wrong':
        this.note(ctx, t, 196, 0.22, 'square', G * 0.35, 150);
        this.note(ctx, t, 208, 0.22, 'square', G * 0.3, 150);
        break;
      case 'tap':
        this.note(ctx, t, 520, 0.05, 'sine', G * 0.4);
        break;
    }
  }
}

export const sfx = new SfxPlayer();
