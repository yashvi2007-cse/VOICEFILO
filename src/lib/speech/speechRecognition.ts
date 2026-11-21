// Web Speech Recognition Provider with fallback abstraction

export interface SpeechRecognitionEvents {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string, isPermissionDenied?: boolean) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export class BrowserSpeechRecognitionProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private isListening: boolean = false;
  private language: string = 'hi-IN'; // Default to Hindi (India)

  constructor(language: string = 'hi-IN') {
    this.language = language;
    this.initRecognition();
  }

  private initRecognition() {
    if (!isSpeechRecognitionSupported()) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;
  }

  public setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start(events: SpeechRecognitionEvents) {
    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      events.onError?.('Speech recognition is not supported in this browser. Please use Chrome/Edge or manual input.');
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onstart = () => {
      this.isListening = true;
      events.onStart?.();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      events.onResult?.(activeText, Boolean(finalTranscript));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      const isPermissionDenied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      let errorMsg = 'Mic error: ' + event.error;
      if (isPermissionDenied) {
        errorMsg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech was detected. Please tap and try speaking again.';
      } else if (event.error === 'network') {
        errorMsg = 'Network issue with speech service. Check internet connection.';
      }
      events.onError?.(errorMsg, isPermissionDenied);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      events.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      // If already started, stop then restart
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 100);
      } catch (e) {
        events.onError?.('Could not start microphone: ' + String(e));
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Stop error:', err);
      }
    }
    this.isListening = false;
  }
}

export const speechRecognizer = new BrowserSpeechRecognitionProvider();
