/**
 * Nappe sonore d'ambiance — synthétisée à la volée avec l'API Web Audio.
 * Zéro fichier audio : tout tient dans le bundle et marche hors-ligne.
 *
 * Un accord grave très doux (quintes/octaves) passé dans un filtre passe-bas
 * lentement modulé, plus un souffle ténu. Volume minuscule (~0.03).
 * Piloté par la préférence `ambientSound`.
 */

const BASE = 55; // La1
const VOICES = [1, 1.5, 2, 3]; // fondamentale, quinte, octave, douzième
const TARGET_GAIN = 0.032;

class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private playing = false;
  private unlock: (() => void) | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    return this.ctx;
  }

  start() {
    const ctx = this.ensureCtx();
    if (!ctx || this.playing) return;
    this.playing = true;

    // le contexte démarre souvent « suspended » hors d'un geste : on retente au prochain clic
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (!this.unlock) {
        this.unlock = () => ctx.resume().catch(() => {});
        window.addEventListener('pointerdown', this.unlock, { once: true });
        window.addEventListener('keydown', this.unlock, { once: true });
      }
    }

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(TARGET_GAIN, ctx.currentTime + 2.5);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 6;
    filter.connect(master);

    // LFO lent sur la coupure du filtre → la nappe « respire »
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const oscs = VOICES.map((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = BASE * mult;
      osc.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.18 / i;
      osc.connect(g).connect(filter);
      osc.start();
      return osc;
    });

    // souffle très léger
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    this.nodes = [filter, lfo, lfoGain, ...oscs, noise, noiseFilter, noiseGain];
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    }
    const toStop = this.nodes;
    this.nodes = [];
    window.setTimeout(() => {
      toStop.forEach((n) => {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          try {
            (n as OscillatorNode).stop();
          } catch {
            /* déjà arrêté */
          }
        }
        n.disconnect();
      });
      master?.disconnect();
      this.master = null;
    }, 1400);
    if (this.unlock) {
      window.removeEventListener('pointerdown', this.unlock);
      window.removeEventListener('keydown', this.unlock);
      this.unlock = null;
    }
  }

  setEnabled(on: boolean) {
    if (on) this.start();
    else this.stop();
  }
}

export const ambient = new AmbientPlayer();
