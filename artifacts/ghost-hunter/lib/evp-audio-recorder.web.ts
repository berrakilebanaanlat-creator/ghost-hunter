/**
 * EVP (Elektronik Ses Fenomeni) Ses Kaydı ve Oynatma - WEB
 * Web Audio API ile mikrofon kaydı ve playback
 */

interface RecordingState {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  isRecording: boolean;
  stream: MediaStream | null;
}

let recordingState: RecordingState = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  stream: null,
};

/**
 * Kayıt izni iste ve başlat
 */
export async function startRecording(): Promise<boolean> {
  try {
    // Mikrofon erişimi iste
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingState.stream = stream;

    // MediaRecorder oluştur
    const mediaRecorder = new MediaRecorder(stream);
    recordingState.mediaRecorder = mediaRecorder;
    recordingState.audioChunks = [];

    // Veri topla
    mediaRecorder.ondataavailable = (event) => {
      recordingState.audioChunks.push(event.data);
    };

    // Kayıt başlat
    mediaRecorder.start();
    recordingState.isRecording = true;

    return true;
  } catch (error) {
    console.error("Kayıt başlatma hatası:", error);
    return false;
  }
}

/**
 * Kayıt durdur ve URI döndür
 */
export async function stopRecording(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!recordingState.mediaRecorder) {
      resolve(null);
      return;
    }

    recordingState.mediaRecorder.onstop = () => {
      // Blob oluştur
      const audioBlob = new Blob(recordingState.audioChunks, { type: "audio/webm" });
      const uri = URL.createObjectURL(audioBlob);

      // Stream'i kapat
      if (recordingState.stream) {
        recordingState.stream.getTracks().forEach((track) => track.stop());
      }

      // State sıfırla
      recordingState.mediaRecorder = null;
      recordingState.audioChunks = [];
      recordingState.isRecording = false;
      recordingState.stream = null;

      resolve(uri);
    };

    recordingState.mediaRecorder.stop();
  });
}

/**
 * Ses dosyasını oynat (URI ile)
 */
export async function playAudio(uri: string): Promise<void> {
  try {
    const audio = new Audio(uri);
    audio.play();
  } catch (error) {
    console.error("Ses oynatma hatası:", error);
  }
}

/**
 * Kayıt durumunu kontrol et
 */
export function isCurrentlyRecording(): boolean {
  return recordingState.isRecording;
}

/**
 * Tüm kayıtları temizle
 */
export function clearRecordings(): void {
  if (recordingState.stream) {
    recordingState.stream.getTracks().forEach((track) => track.stop());
  }
  recordingState = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    stream: null,
  };
}
