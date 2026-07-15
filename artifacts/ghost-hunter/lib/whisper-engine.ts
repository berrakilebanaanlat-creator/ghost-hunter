/**
 * Frekans Tarayıcı Motoru
 * Arka planda sessizce çalışır — kullanıcıya görünmez.
 * - Sürekli cızırtı (white noise) çalar
 * - 50-100 saniyede bir rastgele fısıltı karıştırır
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import WHISPER_SOUNDS from './whisper-sounds';

class WhisperEngine {
  private running = false;
  private noisePlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperPlayer: ReturnType<typeof createAudioPlayer> | null = null;
  private whisperTimer: ReturnType<typeof setTimeout> | null = null;
  private noiseRestartTimer: ReturnType<typeof setTimeout> | null = null;

  private whisperUris: string[] = [];
  private noiseUri: string | null = null;
  private urisLoaded = false;

  private async loadUris(): Promise<void> {
    if (this.urisLoaded) return;
    try {
      const noiseAsset = Asset.fromModule(
        require('../assets/sounds/static_loop.mp3')
      );
      await noiseAsset.downloadAsync();
      this.noiseUri = noiseAsset.localUri ?? noiseAsset.uri;

      const assets = await Asset.loadAsync(WHISPER_SOUNDS);
      this.whisperUris = assets
        .map((a) => a.localUri ?? a.uri ?? '')
        .filter(Boolean);

      this.urisLoaded = true;
    } catch { /* */ }
  }

  private playNoise() {
    if (!this.running || !this.noiseUri) return;
    try {
      if (this.noiseRestartTimer) clearTimeout(this.noiseRestartTimer);
      if (this.noisePlayer) { try { this.noisePlayer.remove(); } catch { /* */ } }

      this.noisePlayer = createAudioPlayer({ uri: this.noiseUri });
      this.noisePlayer.loop = true;
      this.noisePlayer.volume = 0.4;
      this.noisePlayer.play();

      // loop=true yedeklemesi: ~16sn dosya → 15sn'de yeniden oluştur
      this.noiseRestartTimer = setTimeout(() => {
        if (this.running) this.playNoise();
      }, 15000);
    } catch { /* */ }
  }

  private scheduleWhisper() {
    if (!this.running) return;
    const ms = (Math.floor(Math.random() * 51) + 50) * 1000;
    this.whisperTimer = setTimeout(() => {
      this.playWhisper();
    }, ms);
  }

  private playWhisper() {
    if (!this.running || this.whisperUris.length === 0) return;
    try {
      if (this.whisperPlayer) { try { this.whisperPlayer.remove(); } catch { /* */ } }
      const uri = this.whisperUris[Math.floor(Math.random() * this.whisperUris.length)];
      this.whisperPlayer = createAudioPlayer({ uri });
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
    await this.loadUris();
    this.playNoise();
    this.scheduleWhisper();
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
