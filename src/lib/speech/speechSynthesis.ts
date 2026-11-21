// Speech Synthesis Provider for natural spoken Kirana responses

export class SpeechSynthesisProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.cachedVoices = this.synth.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && this.synth) {
      this.cachedVoices = this.synth.getVoices();
    }
    return this.cachedVoices;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setPitch(pitch: number) {
    this.speechPitch = Math.max(0.5, Math.min(1.5, pitch));
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.warn('Speech cancel error:', e);
      }
    }
  }

  public repeat() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }

  public speak(text: string, onEnd?: () => void): void {
    if (!text || this.isMuted || !this.synth) {
      onEnd?.();
      return;
    }

    this.lastSpokenText = text;
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;

    // Pick best Indian voice (Hindi or Indian English)
    const voices = this.getVoices();
    const preferredVoice = voices.find(
      v => v.lang === 'hi-IN' ||
           v.lang.startsWith('hi') ||
           v.name.toLowerCase().includes('hindi') ||
           v.name.toLowerCase().includes('lekha') ||
           v.name.toLowerCase().includes('rishi') ||
           v.lang === 'en-IN'
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtterance = null;
      onEnd?.();
    };

    this.currentUtterance = utterance;

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis speak call error:', err);
      onEnd?.();
    }
  }
}

export const speechSynthesizer = new SpeechSynthesisProvider();
