// Sistema de Sonoplastia Tátil e Feedback Háptico do SIG-Cristolândia
// Desenvolvido com Web Audio API nativa (sem dependência de arquivos externos que possam falhar)

class AudioFeedbackService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cristolandia_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cristolandia_sound_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.play('click');
    }
    return this.enabled;
  }

  public play(type: 'click' | 'scan' | 'success' | 'warning' | 'open'): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Haptic Vibration em dispositivos compatíveis (Android/Chrome)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          if (type === 'click' || type === 'open') navigator.vibrate?.(10);
          else if (type === 'scan') navigator.vibrate?.([20, 30, 20]);
          else if (type === 'success') navigator.vibrate?.([30, 40]);
          else if (type === 'warning') navigator.vibrate?.([40, 60, 40]);
        } catch {
          // ignore
        }
      }

      if (type === 'click') {
        // Micro-clique de alta precisão (subtle mechanical tactile)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'open') {
        // Abertura elegante (soft upward tone)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.06);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'scan') {
        // Bip de scanner de código de barras (crisp dual frequency)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'success') {
        // Acorde suave de confirmação (F#5 - A#5 - C#6)
        const freqs = [739.99, 932.33, 1108.73];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.025);

          gain.gain.setValueAtTime(0.03, now + idx * 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.025);
          osc.stop(now + 0.3);
        });
      } else if (type === 'warning') {
        // Pulso duplo suave para atenção/aviso
        [0, 0.09].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(370, now + offset);

          gain.gain.setValueAtTime(0.05, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.06);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.07);
        });
      }
    } catch {
      // Ignorar falhas silenciosamente caso o navegador restrinja áudio
    }
  }
}

export const soundFeedback = new AudioFeedbackService();
