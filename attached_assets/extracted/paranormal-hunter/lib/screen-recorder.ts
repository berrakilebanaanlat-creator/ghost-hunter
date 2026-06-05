/**
 * Ses Kaydı Yardımcı Modülü
 *
 * Web (Mobil): MediaRecorder API ile sadece ses kaydı
 *   - Android Chrome'da getDisplayMedia desteklenmez
 *   - VOX seslerini + mikrofon sesini kaydeder
 * Web (Desktop): getDisplayMedia ile ekran + ses kaydı
 * Native: Cihazın kendi ekran kaydı özelliğine yönlendirme
 *
 * VOX ekranında kullanılır - tarama sırasında kayıt alınabilir.
 */

import { Platform, Alert } from "react-native";

export type RecordingStatus = "idle" | "requesting" | "recording" | "saving" | "error";

export interface RecordingState {
  status: RecordingStatus;
  duration: number;
  error?: string;
}

class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private duration: number = 0;
  private onStateChange: ((state: RecordingState) => void) | null = null;
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private lastRecordingUri: string | null = null;

  /**
   * Kaydı başlat
   * Mobil web: Sadece mikrofon ses kaydı (VOX sesleri + ortam sesi)
   * Desktop web: Ekran + ses kaydı
   * Native: Kullanıcıya yönlendirme göster
   */
  async startRecording(
    onStateChange?: (state: RecordingState) => void
  ): Promise<boolean> {
    this.onStateChange = onStateChange || null;

    if (Platform.OS !== "web") {
      this.showNativeRecordingGuide();
      return false;
    }

    this.emitState("requesting", 0);

    try {
      // Mobil mi kontrol et
      const isMobile = this.isMobileBrowser();

      if (isMobile) {
        return await this.startAudioRecording();
      } else {
        return await this.startScreenRecording();
      }
    } catch (err: any) {
      const errorMsg = err?.name === "NotAllowedError"
        ? "Kayıt izni reddedildi"
        : "Kayıt başlatılamadı";
      this.emitState("error", 0, errorMsg);
      return false;
    }
  }

  /**
   * Mobil web: Sadece ses kaydı (mikrofon + VOX sesleri)
   */
  private async startAudioRecording(): Promise<boolean> {
    try {
      // Mikrofon izni iste
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.stream = micStream;
      this.recordedChunks = [];
      this.duration = 0;

      // MediaRecorder oluştur (sadece ses)
      const mimeType = this.getSupportedAudioMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveAudioRecording();
      };

      this.mediaRecorder.start(1000);

      this.durationInterval = setInterval(() => {
        this.duration += 1;
        this.emitState("recording", this.duration);
      }, 1000);

      this.emitState("recording", 0);
      return true;
    } catch (err: any) {
      const errorMsg = err?.name === "NotAllowedError"
        ? "Mikrofon izni reddedildi"
        : "Ses kaydı başlatılamadı";
      this.emitState("error", 0, errorMsg);
      return false;
    }
  }

  /**
   * Desktop web: Ekran + ses kaydı
   */
  private async startScreenRecording(): Promise<boolean> {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1080 },
        height: { ideal: 1920 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    });

    let audioStream: MediaStream | null = null;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch { /* mikrofon opsiyonel */ }

    const tracks = [...displayStream.getTracks()];
    if (audioStream) {
      try {
        this.audioContext = new AudioContext();
        this.destination = this.audioContext.createMediaStreamDestination();

        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          const displaySource = this.audioContext.createMediaStreamSource(
            new MediaStream(displayAudioTracks)
          );
          displaySource.connect(this.destination);
        }

        const micSource = this.audioContext.createMediaStreamSource(audioStream);
        micSource.connect(this.destination);

        this.destination.stream.getAudioTracks().forEach((track) => {
          tracks.push(track);
        });
      } catch {
        audioStream.getAudioTracks().forEach((track) => {
          tracks.push(track);
        });
      }
    }

    this.stream = new MediaStream(tracks);
    this.recordedChunks = [];
    this.duration = 0;

    const mimeType = this.getSupportedVideoMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.saveVideoRecording();
    };

    displayStream.getVideoTracks()[0].onended = () => {
      this.stopRecording();
    };

    this.mediaRecorder.start(1000);

    this.durationInterval = setInterval(() => {
      this.duration += 1;
      this.emitState("recording", this.duration);
    }, 1000);

    this.emitState("recording", 0);
    return true;
  }

  /**
   * Kaydı durdur
   */
  stopRecording(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch { /* */ }
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch { /* */ }
      this.audioContext = null;
      this.destination = null;
    }
  }

  /**
   * Ses kaydını kaydet/indir
   */
  private saveAudioRecording(): void {
    this.emitState("saving", this.duration);

    try {
      const mimeType = this.getSupportedAudioMimeType();
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      this.lastRecordingUri = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
      const filename = `VOX_Ses_${timestamp}.${ext}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      this.recordedChunks = [];
      this.emitState("idle", 0);
    } catch {
      this.emitState("error", 0, "Ses dosyası oluşturulamadı");
    }
  }

  /**
   * Video kaydını kaydet/indir
   */
  private saveVideoRecording(): void {
    this.emitState("saving", this.duration);

    try {
      const mimeType = this.getSupportedVideoMimeType();
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `VOX_Kayit_${timestamp}.webm`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      this.recordedChunks = [];
      this.emitState("idle", 0);
    } catch {
      this.emitState("error", 0, "Kayıt dosyası oluşturulamadı");
    }
  }

  /**
   * Native cihazlarda ekran kaydı rehberi göster
   */
  private showNativeRecordingGuide(): void {
    const isIOS = Platform.OS === "ios";
    const message = isIOS
      ? "iPhone'unuzda ekran kaydı almak için:\n\n1. Kontrol Merkezi'ni açın (sağ üst köşeden aşağı kaydırın)\n2. Ekran Kaydı butonuna dokunun\n3. 3 saniye geri sayım sonrası kayıt başlar\n4. Durdurmak için kırmızı çubuğa dokunun"
      : "Android'de ekran kaydı almak için:\n\n1. Bildirim panelini aşağı çekin\n2. 'Ekran kaydı' butonuna dokunun\n3. 'Başlat' butonuna dokunun\n4. Durdurmak için bildirim panelinden 'Durdur' butonuna dokunun";

    Alert.alert("Ekran Kaydı", message, [{ text: "Tamam" }]);
  }

  /**
   * Mobil tarayıcı mı kontrol et
   */
  private isMobileBrowser(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  /**
   * Desteklenen ses MIME tipini bul
   */
  private getSupportedAudioMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    if (typeof MediaRecorder !== "undefined") {
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
    }

    return "audio/webm";
  }

  /**
   * Desteklenen video MIME tipini bul
   */
  private getSupportedVideoMimeType(): string {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
    ];

    if (typeof MediaRecorder !== "undefined") {
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
    }

    return "video/webm";
  }

  /**
   * Kayıt durumunu yayınla
   */
  private emitState(status: RecordingStatus, duration: number, error?: string): void {
    if (this.onStateChange) {
      this.onStateChange({ status, duration, error });
    }
  }

  /**
   * Kayıt yapılıyor mu?
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /**
   * Son kaydedilen sesin URI'sini döndür
   */
  getLastRecordingUri(): string | null {
    return this.lastRecordingUri;
  }

  /**
   * Temizle
   */
  dispose(): void {
    this.stopRecording();
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onStateChange = null;
  }
}

// Singleton
let recorder: ScreenRecorder | null = null;

export function getScreenRecorder(): ScreenRecorder {
  if (!recorder) {
    recorder = new ScreenRecorder();
  }
  return recorder;
}

export { ScreenRecorder };
