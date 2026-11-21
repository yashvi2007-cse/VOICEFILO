// Web Audio API Visualizer for active microphone feedback

export class AudioVisualizerService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  public async start(onVolumeUpdate: (volume: number) => void): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(1.0, average / 128); // 0.0 to 1.0
        onVolumeUpdate(normalized);

        this.animationFrameId = requestAnimationFrame(update);
      };

      update();
      return true;
    } catch (err) {
      console.warn('Microphone audio visualizer could not start:', err);
      return false;
    }
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
  }
}

export const audioVisualizer = new AudioVisualizerService();
