/**
 * Fısıltı Motoru
 * - Arka planda sürekli cızırtı (white noise) çalar
 * - 50-100 saniyede bir rastgele fısıltı sesi oynatır
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import WHISPER_SOUNDS from './whisper-sounds';

type WhisperState = 'idle' | 'running' | 'stopping';

export interface WhisperStatus {
  state: WhisperState;
  nextWhisperIn: number; // saniye cinsinden geri sayım
  lastWhisperIndex: number | null;
  totalWhispers: number;
}

type StatusCallback = (status: WhisperStatus) => void;

class WhisperEngine {
  private state: WhisperState = 'idle';
  private noisePlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private nextWhisperIn = 0;
  private lastWhisperIndex: number | null = null;
  private totalWhispers = 0;
  private statusCallback: StatusCallback | null = null;

  setStatusCallback(cb: StatusCallback | null) {
    this.statusCallback = cb;
  }

  private emitStatus() {
    this.statusCallback?.({
      state: this.state,
      nextWhisperIn: this.nextWhisperIn,
      lastWhisperIndex: this.lastWhisperIndex,
      totalWhispers: this.totalWhispers,
    });
  }

  private randomInterval(): number {
    // 50-100 saniye arası rastgele
    return Math.floor(Math.random() * 51) + 50;
  }

  private async playNoise() {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* */ }

    try {
      if (this.noisePlayer) {
        try { this.noisePlayer.remove(); } catch { /* */ }
      }
      this.noisePlayer = createAudioPlayer(
        require('../assets/sounds/static_loop.mp3')
      );
      this.noisePlayer.loop = true;
      this.noisePlayer.volume = 0.35;
      this.noisePlayer.play();
    } catch { /* */ }
  }

  private async playRandomWhisper() {
    if (this.state !== 'running') return;

    const idx = Math.floor(Math.random() * WHISPER_SOUNDS.length);
    this.lastWhisperIndex = idx;
    this.totalWhispers += 1;

    try {
      if (this.whisperPlayer) {
        try { this.whisperPlayer.remove(); } catch { /* */ }
      }
      this.whisperPlayer = createAudioPlayer(WHISPER_SOUNDS[idx]);
      this.whisperPlayer.volume = 1.0;
      this.whisperPlayer.play();
    } catch { /* */ }

    this.emitStatus();
    this.scheduleNext();
  }

  private scheduleNext() {
    if (this.state !== 'running') return;

    const secs = this.randomInterval();
    this.nextWhisperIn = secs;
    this.emitStatus();

    // Geri sayım
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      if (this.nextWhisperIn > 0) {
        this.nextWhisperIn -= 1;
        this.emitStatus();
      }
    }, 1000);

    // Fısıltı zamanı
    if (this.whisperTimer) clearTimeout(this.whisperTimer);
    this.whisperTimer = setTimeout(() => {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.playRandomWhisper();
    }, secs * 1000);
  }

  async start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this.totalWhispers = 0;
    this.lastWhisperIndex = null;
    this.emitStatus();
    await this.playNoise();
    this.scheduleNext();
  }

  stop() {
    this.state = 'idle';

    if (this.whisperTimer) { clearTimeout(this.whisperTimer); this.whisperTimer = null; }
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }

    try { this.noisePlayer?.remove(); } catch { /* */ }
    try { this.whisperPlayer?.remove(); } catch { /* */ }
    this.noisePlayer = null;
    this.whisperPlayer = null;
    this.nextWhisperIn = 0;
    this.emitStatus();
  }

  getState(): WhisperState {
    return this.state;
  }
}

// Singleton
let _engine: WhisperEngine | null = null;
export function getWhisperEngine(): WhisperEngine {
  if (!_engine) _engine = new WhisperEngine();
  return _engine;
}
