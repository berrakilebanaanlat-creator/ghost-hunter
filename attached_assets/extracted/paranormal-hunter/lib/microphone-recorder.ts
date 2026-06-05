/**
 * Mikrofon Kaydı Sistemi
 * Web Audio API kullanarak mikrofon sesini kaydeder
 */

export interface AudioRecording {
  id: string;
  timestamp: number;
  duration: number;
  audioData: Float32Array;
  sampleRate: number;
  frequency?: Uint8Array;
}

export class MicrophoneRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording = false;
  private recordingData: Float32Array[] = [];
  private startTime = 0;
  private recordings: AudioRecording[] = [];

  /**
   * Mikrofon erişim izni al ve kaydı başlat
   */
  async startRecording(): Promise<boolean> {
    try {
      // Audio Context oluştur
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Mikrofon erişim izni al
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      // Analyser oluştur
      if (!this.analyser) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        source.connect(this.analyser);

        // ScriptProcessor oluştur (ses verisi toplamak için)
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.analyser.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        // Ses verisi topla
        this.processor.onaudioprocess = (event) => {
          if (this.isRecording) {
            const inputData = event.inputBuffer.getChannelData(0);
            this.recordingData.push(new Float32Array(inputData));
          }
        };
      }

      this.isRecording = true;
      this.recordingData = [];
      this.startTime = Date.now();

      return true;
    } catch (error) {
      console.error("Mikrofon erişim hatası:", error);
      return false;
    }
  }

  /**
   * Kaydı durdur ve ses verilerini al
   */
  stopRecording(): AudioRecording | null {
    if (!this.isRecording) return null;

    this.isRecording = false;

    // Ses verilerini birleştir
    const totalLength = this.recordingData.reduce((sum, arr) => sum + arr.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of this.recordingData) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    // Frekans verilerini al
    const frequencyData = new Uint8Array(this.analyser?.frequencyBinCount || 0);
    this.analyser?.getByteFrequencyData(frequencyData);

    // Ses kaydı oluştur
    const recording: AudioRecording = {
      id: Math.random().toString(36).substring(7),
      timestamp: this.startTime,
      duration: Date.now() - this.startTime,
      audioData,
      sampleRate: this.audioContext?.sampleRate || 44100,
      frequency: frequencyData,
    };

    this.recordings.push(recording);
    this.recordingData = [];

    return recording;
  }

  /**
   * Kaydı iptal et
   */
  cancelRecording(): void {
    this.isRecording = false;
    this.recordingData = [];
  }

  /**
   * Tüm kayıtları al
   */
  getRecordings(): AudioRecording[] {
    return this.recordings;
  }

  /**
   * Kaydı sil
   */
  deleteRecording(id: string): void {
    this.recordings = this.recordings.filter((r) => r.id !== id);
  }

  /**
   * Tüm kayıtları temizle
   */
  clearRecordings(): void {
    this.recordings = [];
  }

  /**
   * Mikrofon kaynağını kapat
   */
  async stopMicrophone(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Kaydı oynat
   */
  async playRecording(recording: AudioRecording): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // AudioBuffer oluştur
    const audioBuffer = this.audioContext.createBuffer(
      1,
      recording.audioData.length,
      recording.sampleRate
    );

    const channelData = audioBuffer.getChannelData(0);
    channelData.set(recording.audioData);

    // BufferSource oluştur ve oynat
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  /**
   * Ses verilerinden frekans analizi yap
   */
  analyzeAudioData(audioData: Float32Array): Uint8Array {
    if (!this.audioContext) {
      return new Uint8Array(0);
    }

    // FFT simülasyonu - frekans bantlarını hesapla
    const fftSize = 32;
    const frequencyData = new Uint8Array(fftSize);

    const bandSize = Math.ceil(audioData.length / fftSize);

    for (let i = 0; i < fftSize; i++) {
      const bandStart = i * bandSize;
      const bandEnd = Math.min(bandStart + bandSize, audioData.length);
      const bandData = audioData.slice(bandStart, bandEnd);

      // Bant için ortalama genlik hesapla
      const avgAmplitude =
        bandData.reduce((a, b) => a + Math.abs(b), 0) / bandData.length;

      frequencyData[i] = Math.min(Math.round(avgAmplitude * 255), 255);
    }

    return frequencyData;
  }

  /**
   * Kayıt durumunu al
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Mikrofon kullanılabilir mi kontrol et
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const microphoneRecorder = new MicrophoneRecorder();
