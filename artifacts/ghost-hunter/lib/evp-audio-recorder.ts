/**
 * EVP Ses Kaydı - Yardımcı Modül
 *
 * Basit state machine: idle → recording → idle
 * Idle recording mekanizması KALDIRILDI — race condition ve
 * IllegalStateException crash'lerin kök nedeni buydu.
 *
 * Arka plan crash koruması artık AppState listener ile yapılıyor (evp.tsx).
 */
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { Platform, Alert } from 'react-native';

// ============================================================
// STATE MACHINE
// ============================================================

type RecorderState = 'idle' | 'preparing' | 'recording' | 'stopping';

let recorderState: RecorderState = 'idle';
let operationLock = false;

// Global recorder referansı - EVP ekranından set edilecek
let globalRecorder: ReturnType<typeof useAudioRecorder> | null = null;
let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

function acquireLock(): boolean {
  if (operationLock) return false;
  operationLock = true;
  return true;
}

function releaseLock(): void {
  operationLock = false;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[EVP] ${label} timeout (${ms}ms)`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function showRecordingError(message: string): void {
  try {
    if (Platform.OS !== 'web') {
      Alert.alert('Kayıt Hatası', message, [{ text: 'Tamam' }]);
    }
  } catch { /* */ }
}

/**
 * Hook'tan gelen recorder'ı global olarak kaydet
 * EVP ekranı mount olduğunda çağrılır
 */
export function setGlobalRecorder(rec: ReturnType<typeof useAudioRecorder> | null): void {
  globalRecorder = rec;
  if (!rec) {
    recorderState = 'idle';
    releaseLock();
  }
}

export function getRecorderState(): RecorderState {
  return recorderState;
}

/**
 * Kayıt izni iste ve başlat
 */
export async function startRecording(): Promise<boolean> {
  if (recorderState !== 'idle') return false;
  if (!acquireLock()) return false;

  try {
    if (!globalRecorder) {
      showRecordingError('Ses kaydedici hazır değil. Lütfen ekranı yeniden açın.');
      return false;
    }

    // İzin kontrolü
    try {
      const { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        const { granted: newGrant } = await requestRecordingPermissionsAsync();
        if (!newGrant) {
          showRecordingError('Mikrofon izni gerekli.');
          return false;
        }
      }
    } catch {
      showRecordingError('Mikrofon izni kontrol edilemedi.');
      return false;
    }

    recorderState = 'preparing';

    // Audio modu
    try {
      await withTimeout(
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }),
        3000, 'setAudioModeAsync'
      );
    } catch {
      recorderState = 'idle';
      return false;
    }

    // Önce durdur (güvenli)
    try {
      if (globalRecorder.isRecording) {
        await withTimeout(globalRecorder.stop(), 3000, 'pre-stop');
      }
    } catch { /* */ }

    // Prepare
    try {
      await withTimeout(globalRecorder.prepareToRecordAsync(), 5000, 'prepareToRecordAsync');
    } catch {
      recorderState = 'idle';
      try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch { /* */ }
      showRecordingError('Ses kaydedici hazırlanamadı.');
      return false;
    }

    // Native tarafın hazırlanması için kısa bekleme (IllegalStateException önlemi)
    await new Promise(resolve => setTimeout(resolve, 80));

    // Record
    try {
      if (!globalRecorder.isRecording) {
        globalRecorder.record();
      }
    } catch (err: any) {
      recorderState = 'idle';
      try { await globalRecorder.stop(); } catch { /* */ }
      try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch { /* */ }
      showRecordingError('Kayıt başlatılamadı.');
      return false;
    }

    recorderState = 'recording';
    return true;
  } catch {
    recorderState = 'idle';
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Kayıt durdur ve URI döndür
 */
export async function stopRecording(): Promise<string | null> {
  if (recorderState !== 'recording') return null;
  if (!acquireLock()) return null;

  try {
    if (!globalRecorder) {
      recorderState = 'idle';
      return null;
    }

    recorderState = 'stopping';

    let uri: string | null = null;
    try {
      const isActuallyRecording = (() => {
        try { return globalRecorder!.isRecording === true; } catch { return true; }
      })();

      if (!isActuallyRecording) {
        try { uri = globalRecorder.uri || null; } catch { /* */ }
      } else {
        await withTimeout(globalRecorder.stop(), 5000, 'stop');
        try { uri = globalRecorder.uri || null; } catch { /* */ }
      }
    } catch {
      try { uri = globalRecorder.uri || null; } catch { /* */ }
    }

    try {
      await withTimeout(
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }),
        3000, 'setAudioModeAsync (reset)'
      );
    } catch { /* */ }

    // Boş URI guard — IllegalStateException'a yol açan null/boş dosya yolu kontrolü
    if (!uri || uri.trim() === '') {
      recorderState = 'idle';
      return null;
    }

    recorderState = 'idle';
    return uri;
  } catch {
    recorderState = 'idle';
    return null;
  } finally {
    releaseLock();
  }
}

/**
 * Ses dosyasını oynat
 */
export async function playAudio(uri: string): Promise<void> {
  try {
    if (currentPlayer) {
      try { currentPlayer.remove(); } catch { /* */ }
      currentPlayer = null;
    }
    currentPlayer = createAudioPlayer({ uri });
    currentPlayer.play();
  } catch { /* */ }
}

export function isCurrentlyRecording(): boolean {
  return recorderState === 'recording';
}

/**
 * Tüm kaynakları temizle
 */
export function cleanup(): void {
  if (currentPlayer) {
    try { currentPlayer.remove(); } catch { /* */ }
    currentPlayer = null;
  }

  if (globalRecorder && recorderState === 'recording') {
    try {
      if (globalRecorder.isRecording) globalRecorder.stop();
    } catch { /* */ }
  }

  recorderState = 'idle';
  releaseLock();
}
