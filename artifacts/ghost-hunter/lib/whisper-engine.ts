/**
 * Frekans Tarayıcı Motoru
 * Arka planda sessizce çalışır — kullanıcıya görünmez.
 * - Sürekli cızırtı (white noise) çalar
 * - 50-100 saniyede bir rastgele fısıltı karıştırır
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import WHISPER_SOUNDS from './whisper-sounds';

class WhisperEngine {
  private running = false;
  private noisePlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperTimer: ReturnType<typeof setTimeout> | null = null;
  private noiseRestartTimer: ReturnType<typeof setTimeout> | null = null;

  private startNoise() {
    if (!this.running) return;
    try {
      if (this.noiseRestartTimer) clearTimeout(this.noiseRestartTimer);
      if (this.noisePlayer) { try { this.noisePlayer.remove(); } catch { /* */ } }

      // createAudioPlayer, require() sonucunu (number) direkt kabul eder
      this.noisePlayer = createAudioPlayer(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../assets/sounds/static_loop.mp3')
      );
      this.noisePlayer.loop = true;
      this.noisePlayer.volume = 0.4;
      this.noisePlayer.play();

      // loop=true yedeklemesi: 16sn'lik dosya → 14sn'de yenile
      this.noiseRestartTimer = setTimeout(() => {
        if (this.running) this.startNoise();
      }, 14000);
    } catch { /* */ }
  }

  private scheduleWhisper() {
    if (!this.running) return;
    const ms = (Math.floor(Math.random() * 51) + 50) * 1000;
    if (this.whisperTimer) clearTimeout(this.whisperTimer);
    this.whisperTimer = setTimeout(() => {
      this.playWhisper();
    }, ms);
  }

  private playWhisper() {
    if (!this.running || WHISPER_SOUNDS.length === 0) return;
    try {
      if (this.whisperPlayer) { try { this.whisperPlayer.remove(); } catch { /* */ } }
      const src = WHISPER_SOUNDS[Math.floor(Math.random() * WHISPER_SOUNDS.length)];
      this.whisperPlayer = createAudioPlayer(src);
      this.whisperPlayer.volume = 1.0;
      this.whisperPlayer.play();
    } catch { /* */ }
    this.scheduleWhisper();
  }

  async start() {
    if (this.running) return;
    this.running = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* */ }
    // 5 saniye geciktir — uygulama tam yüklendikten sonra başlasın
    setTimeout(() => {
      if (this.running) {
        this.startNoise();
        this.scheduleWhisper();
      }
    }, 5000);
  }

  stop() {
    this.running = false;
    if (this.whisperTimer) { clearTimeout(this.whisperTimer); this.whisperTimer = null; }
    if (this.noiseRestartTimer) { clearTimeout(this.noiseRestartTimer); this.noiseRestartTimer = null; }
    try { this.noisePlayer?.remove(); } catch { /* */ }
    try { this.whisperPlayer?.remove(); } catch { /* */ }
    this.noisePlayer = null;
    this.whisperPlayer = null;
  }
}

let _engine: WhisperEngine | null = null;
export function getWhisperEngine(): WhisperEngine {
  if (!_engine) _engine = new WhisperEngine();
  return _engine;
}
