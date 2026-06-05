/**
 * VOX Streaming Audio System
 * GhostTube VOX tarzı beyaz gürültü ve paranormal ses akışı
 */

import {
  playStaticNoise,
  playParanormalEffect,
  playWhisper,
  playScreech,
  playMoan,
  playDistortion,
} from "./audio-synthesizer";

export interface StreamedAudioEvent {
  id: string;
  timestamp: number;
  type: "white_noise" | "paranormal_sound" | "signal_detected";
  frequency?: number;
  signalStrength: number;
  soundName?: string;
}

export interface ScanSession {
  id: string;
  startTime: number;
  isActive: boolean;
  events: StreamedAudioEvent[];
  totalSignalsDetected: number;
  averageSignalStrength: number;
}

/**
 * Paranormal ses türleri ve özellikleri
 */
const PARANORMAL_SOUNDS = [
  { name: "Fısıltı", type: "whisper", frequency: 200, probability: 0.15 },
  { name: "Çığlık", type: "scream", frequency: 800, probability: 0.1 },
  { name: "İnilti", type: "moan", frequency: 150, probability: 0.12 },
  { name: "Bozulma", type: "distortion", frequency: 500, probability: 0.08 },
  { name: "Glitch", type: "glitch", frequency: 400, probability: 0.1 },
  { name: "Yankı", type: "echo", frequency: 300, probability: 0.12 },
];

/**
 * VOX Streaming Audio Manager
 */
export class VoxStreamingAudioManager {
  private currentSession: ScanSession | null = null;
  private isPlaying = false;
  private whiteNoiseInterval: ReturnType<typeof setInterval> | null = null;
  private paranormalSoundInterval: ReturnType<typeof setInterval> | null = null;
  private eventCallbacks: ((event: StreamedAudioEvent) => void)[] = [];
  private whiteNoiseVolume = 0.15; // 0-1 arası
  private isWhiteNoiseEnabled = true;
  private echoVolume = 0.2; // 0-1 arası
  private isEchoEnabled = true;

  /**
   * Tarama oturumunu başlat
   */
  startScanSession(): ScanSession {
    this.currentSession = {
      id: Math.random().toString(36).substring(7),
      startTime: Date.now(),
      isActive: true,
      events: [],
      totalSignalsDetected: 0,
      averageSignalStrength: 0,
    };

    this.startAudioStreaming();
    return this.currentSession;
  }

  /**
   * Tarama oturumunu durdur
   */
  stopScanSession(): ScanSession | null {
    if (!this.currentSession) return null;

    this.stopAudioStreaming();
    this.currentSession.isActive = false;

    return this.currentSession;
  }

  /**
   * Ses akışını başlat
   */
  private startAudioStreaming(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;

    // Beyaz gürültü - her 2 saniyede bir
    this.whiteNoiseInterval = setInterval(() => {
      if (this.isPlaying && this.currentSession && this.isWhiteNoiseEnabled && this.whiteNoiseVolume > 0) {
        playStaticNoise(1500, this.whiteNoiseVolume); // 1.5 saniye, ayarlanabilir ses
      }
    }, 2000);

    // Paranormal sesler - rastgele aralıklarla
    this.paranormalSoundInterval = setInterval(() => {
      if (this.isPlaying && this.currentSession) {
        this.playRandomParanormalSound();
      }
    }, 3000 + Math.random() * 4000); // 3-7 saniye arası rastgele
  }

  /**
   * Ses akışını durdur
   */
  private stopAudioStreaming(): void {
    this.isPlaying = false;

    if (this.whiteNoiseInterval) {
      clearInterval(this.whiteNoiseInterval);
      this.whiteNoiseInterval = null;
    }

    if (this.paranormalSoundInterval) {
      clearInterval(this.paranormalSoundInterval);
      this.paranormalSoundInterval = null;
    }
  }

  /**
   * Rastgele paranormal ses çal
   */
  private async playRandomParanormalSound(): Promise<void> {
    if (!this.currentSession) return;

    // Paranormal ses seç (olasılığa göre)
    const randomValue = Math.random();
    let selectedSound = null;
    let cumulativeProbability = 0;

    for (const sound of PARANORMAL_SOUNDS) {
      cumulativeProbability += sound.probability;
      if (randomValue < cumulativeProbability) {
        selectedSound = sound;
        break;
      }
    }

    if (!selectedSound) {
      selectedSound = PARANORMAL_SOUNDS[0];
    }

    // Sinyal gücü hesapla (50-100%)
    const signalStrength = 50 + Math.random() * 50;

    // Ses çal - sadece düz frekans sesi (düt düt sesleri kaldırıldı)
    const volume = 0.2; // Düşük ses seviyesi
    await playParanormalEffect(selectedSound.frequency, 600, volume);
    
    // Yankı sesini kontrol et
    if (this.isEchoEnabled && Math.random() > 0.6) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await playParanormalEffect(selectedSound.frequency * 0.9, 400, volume * 0.5);
    }

    // Event ekle
    const event: StreamedAudioEvent = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type: "signal_detected",
      frequency: selectedSound.frequency,
      signalStrength,
      soundName: selectedSound.name,
    };

    this.currentSession.events.push(event);
    this.currentSession.totalSignalsDetected++;

    // Ortalama sinyal gücü hesapla
    const signalEvents = this.currentSession.events.filter(
      (e) => e.type === "signal_detected"
    );
    this.currentSession.averageSignalStrength =
      signalEvents.reduce((sum, e) => sum + e.signalStrength, 0) /
      signalEvents.length;

    this.notifyEventListeners(event);
  }

  /**
   * Event listener ekle
   */
  onEvent(callback: (event: StreamedAudioEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Event listener kaldır
   */
  offEvent(callback: (event: StreamedAudioEvent) => void): void {
    this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * Event listener'lara bildir
   */
  private notifyEventListeners(event: StreamedAudioEvent): void {
    this.eventCallbacks.forEach((callback) => callback(event));
  }

  /**
   * Mevcut oturumu al
   */
  getCurrentSession(): ScanSession | null {
    return this.currentSession;
  }

  /**
   * Oturumu temizle
   */
  clearSession(): void {
    this.stopAudioStreaming();
    this.currentSession = null;
    this.eventCallbacks = [];
  }

  /**
   * Tarama durumunu kontrol et
   */
  isScanning(): boolean {
    return this.isPlaying;
  }

  /**
   * Beyaz gürültü ses seviyesini ayarla
   */
  setWhiteNoiseVolume(volume: number): void {
    this.whiteNoiseVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Beyaz gürültüyü aç/kapat
   */
  setWhiteNoiseEnabled(enabled: boolean): void {
    this.isWhiteNoiseEnabled = enabled;
  }

  /**
   * Yankı ses seviyesini ayarla
   */
  setEchoVolume(volume: number): void {
    this.echoVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Yankıyı aç/kapat
   */
  setEchoEnabled(enabled: boolean): void {
    this.isEchoEnabled = enabled;
  }

  /**
   * Mevcut ses ayarlarını al
   */
  getAudioSettings() {
    return {
      whiteNoiseVolume: this.whiteNoiseVolume,
      isWhiteNoiseEnabled: this.isWhiteNoiseEnabled,
      echoVolume: this.echoVolume,
      isEchoEnabled: this.isEchoEnabled,
    };
  }
}

// Singleton instance
export const voxStreamingAudioManager = new VoxStreamingAudioManager();
