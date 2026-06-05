/**
 * EVP (Elektronik Ses Fenomeni) Ses Kaydı ve Oynatma - NATIVE
 * expo-audio Recording API ile mikrofon kaydı ve playback
 *
 * v3 - Crashlytics düzeltmeleri (15 Mayıs 2026):
 *
 * Düzeltilen hatalar:
 * - SesKaydedici.kaydet IllegalStateException (AudioRecorder.kt:94)
 *   → Recorder hazır değilken record() çağrılması
 *   → Çözüm: prepareToRecordAsync başarısını doğrula, record() öncesi isRecording kontrolü
 *
 * - SesKaydedici.KaydiDurdur IllegalStateException (AudioRecorder.kt:138)
 *   → Zaten durmuş recorder'da stop() çağrılması
 *   → Çözüm: stop() öncesi native recorder durumunu kontrol et
 *
 * - SesKaydedici.kaydet RuntimeException "devam etme başarısız"
 *   → Mikrofon erişim hatası / izin yok
 *   → Çözüm: İzin kontrolünü zorunlu yap, getRecordingPermissionsAsync ile ön kontrol
 *
 * - SesKaydedici.KaydiDurdur RuntimeException "duraklatma başarısız"
 *   → Recorder geçersiz durumda
 *   → Çözüm: Defensive stop - hata olsa bile state temizlenir
 *
 * Korumalar:
 * - State machine: idle → preparing → recording → stopping → idle
 * - Mutex lock: Eşzamanlı çağrıları engeller (hızlı tıklama koruması)
 * - Try-catch: Tüm native çağrılar sarmalanmış
 * - Timeout: ANR koruması (5 saniye)
 * - İzin ön kontrolü: getRecordingPermissionsAsync ile mevcut izni kontrol et
 * - Native state doğrulama: recorder.isRecording kontrolü
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
let operationLock = false; // Mutex: eşzamanlı işlemleri engeller

// Global recorder referansı - EVP ekranından set edilecek
let globalRecorder: ReturnType<typeof useAudioRecorder> | null = null;
let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

/**
 * Mutex lock al - eşzamanlı işlemleri engeller
 * Hızlı tıklama koruması sağlar
 */
function acquireLock(): boolean {
  if (operationLock) {
    console.warn('[EVP] İşlem zaten devam ediyor, yeni işlem engellendi');
    return false;
  }
  operationLock = true;
  return true;
}

function releaseLock(): void {
  operationLock = false;
}

/**
 * Timeout ile Promise sarmalama - ANR koruması
 * Native çağrılar 5 saniyeden uzun sürerse timeout olur
 */
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

/**
 * Kullanıcıya hata mesajı göster (çökme yerine)
 */
function showRecordingError(message: string): void {
  try {
    if (Platform.OS !== 'web') {
      Alert.alert('Kayıt Hatası', message, [{ text: 'Tamam' }]);
    }
  } catch {
    // Alert bile çökerse sessizce geç
  }
}

/**
 * Hook'tan gelen recorder'ı global olarak kaydet
 * EVP ekranı mount olduğunda çağrılır
 */
export function setGlobalRecorder(rec: ReturnType<typeof useAudioRecorder> | null): void {
  globalRecorder = rec;
  // Recorder değiştiğinde state'i sıfırla
  if (!rec) {
    recorderState = 'idle';
    releaseLock();
  }
}

/**
 * Mevcut recorder state'ini döndür
 */
export function getRecorderState(): RecorderState {
  return recorderState;
}

/**
 * Kayıt izni iste ve başlat
 * State machine + mutex lock + timeout korumalı
 *
 * Crashlytics düzeltmeleri:
 * - İzin ön kontrolü: Önce mevcut izni kontrol et, yoksa iste
 * - Prepare doğrulama: prepareToRecordAsync sonrası recorder durumunu kontrol et
 * - Record güvenliği: record() öncesi recorder'ın hazır olduğunu doğrula
 */
export async function startRecording(): Promise<boolean> {
  // 1. State kontrolü
  if (recorderState !== 'idle') {
    console.warn(`[EVP] Kayıt başlatılamaz, mevcut state: ${recorderState}`);
    return false;
  }

  // 2. Mutex lock
  if (!acquireLock()) {
    return false;
  }

  try {
    // 3. Recorder kontrolü
    if (!globalRecorder) {
      console.warn('[EVP] Recorder hook henüz hazır değil');
      showRecordingError('Ses kaydedici hazır değil. Lütfen ekranı yeniden açın.');
      return false;
    }

    // 4. İzin ön kontrolü - önce mevcut izni kontrol et
    try {
      const currentPermission = await getRecordingPermissionsAsync();
      if (!currentPermission.granted) {
        // İzin yoksa iste
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          console.warn('[EVP] Mikrofon izni verilmedi');
          showRecordingError('Mikrofon izni gerekli. Lütfen ayarlardan mikrofon iznini verin.');
          return false;
        }
      }
    } catch (permError) {
      console.error('[EVP] İzin kontrolü hatası:', permError);
      showRecordingError('Mikrofon izni kontrol edilemedi. Lütfen tekrar deneyin.');
      return false;
    }

    // 5. State: preparing
    recorderState = 'preparing';

    // 6. Audio modunu ayarla (timeout korumalı)
    try {
      await withTimeout(
        setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        }),
        3000,
        'setAudioModeAsync'
      );
    } catch (modeError) {
      console.error('[EVP] Audio mode ayarlama hatası:', modeError);
      recorderState = 'idle';
      showRecordingError('Ses modu ayarlanamadı. Lütfen tekrar deneyin.');
      return false;
    }

    // 7. Eğer recorder zaten kayıt yapıyorsa, önce durdur
    try {
      if (globalRecorder.isRecording) {
        console.warn('[EVP] Recorder zaten kayıt yapıyor, önce durduruluyor...');
        try {
          await withTimeout(globalRecorder.stop(), 3000, 'pre-stop');
        } catch {
          // Durdurma başarısız olsa bile devam et
        }
      }
    } catch {
      // isRecording kontrolü bile başarısız olabilir, sessizce geç
    }

    // 8. Prepare (timeout korumalı)
    try {
      await withTimeout(
        globalRecorder.prepareToRecordAsync(),
        5000,
        'prepareToRecordAsync'
      );
    } catch (prepareError) {
      console.error('[EVP] Prepare hatası:', prepareError);
      recorderState = 'idle';
      // Audio modunu geri al
      try {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      } catch { /* sessizce geç */ }
      showRecordingError('Ses kaydedici hazırlanamadı. Lütfen tekrar deneyin.');
      return false;
    }

    // 9. Record başlat - NATIVE STATE DOĞRULAMA (v4 - geliştirilmiş)
    // IllegalStateException'ı önlemek için recorder'ın gerçekten hazır olduğunu kontrol et
    try {
      // Kısa bekleme - native tarafın hazır olmasını garantile
      await new Promise(resolve => setTimeout(resolve, 100));

      // Native recorder'in hazır olduğunu doğrula
      // Eğer zaten recording durumundaysa, tekrar record() çağırma
      if (globalRecorder.isRecording) {
        console.warn('[EVP] Recorder zaten recording durumunda, record() atlanıyor');
      } else {
        globalRecorder.record();
      }
    } catch (recordError: any) {
      console.error('[EVP] Record başlatma hatası:', recordError);
      recorderState = 'idle';
      // Recorder'ı temizlemeye çalış
      try { await globalRecorder.stop(); } catch { /* sessizce geç */ }
      try {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      } catch { /* sessizce geç */ }

      // Kullanıcıya anlamlı hata mesajı
      const errorMsg = recordError?.message?.includes('IllegalState')
        ? 'Ses kaydedici hazır değil. Lütfen uygulamayı yeniden başlatın.'
        : 'Kayıt başlatılamadı. Mikrofon başka bir uygulama tarafından kullanılıyor olabilir.';
      showRecordingError(errorMsg);
      return false;
    }

    // 10. State: recording
    recorderState = 'recording';
    return true;
  } catch (error) {
    console.error('[EVP] Kayıt başlatma genel hatası:', error);
    recorderState = 'idle';
    showRecordingError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Kayıt durdur ve URI döndür
 * State machine + mutex lock + timeout korumalı
 *
 * Crashlytics düzeltmeleri:
 * - Native state kontrolü: stop() öncesi recorder.isRecording doğrulaması
 * - Defensive stop: Hata olsa bile state her zaman temizlenir
 * - Çift stop koruması: Zaten durmuş recorder'da stop() çağrılmaz
 */
export async function stopRecording(): Promise<string | null> {
  // 1. State kontrolü
  if (recorderState !== 'recording') {
    console.warn(`[EVP] Kayıt durdurulamaz, mevcut state: ${recorderState}`);
    return null;
  }

  // 2. Mutex lock
  if (!acquireLock()) {
    return null;
  }

  try {
    if (!globalRecorder) {
      recorderState = 'idle';
      return null;
    }

    // 3. State: stopping
    recorderState = 'stopping';

    // 4. Native state kontrolü - ÇÖKME KORUMASI (v4 - geliştirilmiş)
    // IllegalStateException'ı önlemek için recorder'ın gerçekten kayıt yapıp yapmadığını kontrol et
    let uri: string | null = null;
    try {
      // Kısa bekleme - native state'in güncel olmasını garantile
      await new Promise(resolve => setTimeout(resolve, 50));

      let isActuallyRecording = false;
      try {
        isActuallyRecording = globalRecorder.isRecording === true;
      } catch {
        // isRecording erişimi bile crash verebilir - güvenli varsayım: kayıt yapıyor
        isActuallyRecording = true;
      }

      if (!isActuallyRecording) {
        // Native tarafta kayıt zaten durmuş - stop() çağırmaya gerek yok
        console.warn('[EVP] Native recorder zaten durmuş, stop() atlanıyor');
        try { uri = globalRecorder.uri || null; } catch { uri = null; }
      } else {
        // 5. Stop (timeout korumali - ANR koruması)
        try {
          await withTimeout(
            globalRecorder.stop(),
            5000,
            'stop'
          );
          try { uri = globalRecorder.uri || null; } catch { uri = null; }
        } catch (stopError) {
          console.error('[EVP] Kayıt durdurma hatası:', stopError);
          // Timeout veya IllegalState olsa bile URI'yi almaya çalış
          try { uri = globalRecorder.uri || null; } catch { uri = null; }
        }
      }
    } catch (stateCheckError) {
      // Tüm blok başarısız olursa
      console.error('[EVP] Recorder state kontrolü hatası:', stateCheckError);
      // Son çare: stop() dene
      try {
        await withTimeout(globalRecorder.stop(), 3000, 'fallback-stop');
        try { uri = globalRecorder.uri || null; } catch { uri = null; }
      } catch {
        try { uri = globalRecorder.uri || null; } catch { uri = null; }
      }
    }

    // 6. Audio modunu sıfırla
    try {
      await withTimeout(
        setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        }),
        3000,
        'setAudioModeAsync (reset)'
      );
    } catch (modeError) {
      console.error('[EVP] Audio mode sıfırlama hatası:', modeError);
      // Kritik değil, devam et
    }

    // 7. State: idle
    recorderState = 'idle';
    return uri;
  } catch (error) {
    console.error('[EVP] Kayıt durdurma genel hatası:', error);
    recorderState = 'idle';
    return null;
  } finally {
    releaseLock();
  }
}

/**
 * Ses dosyasını oynat (URI ile)
 */
export async function playAudio(uri: string): Promise<void> {
  try {
    // Önceki player'ı temizle
    if (currentPlayer) {
      try {
        currentPlayer.remove();
      } catch {
        // Sessizce geç
      }
      currentPlayer = null;
    }

    currentPlayer = createAudioPlayer({ uri });
    currentPlayer.play();
  } catch (error) {
    console.error('[EVP] Ses oynatma hatası:', error);
  }
}

/**
 * Kayıt durumunu kontrol et
 */
export function isCurrentlyRecording(): boolean {
  return recorderState === 'recording';
}

/**
 * Tüm kaynakları temizle
 * Component unmount olduğunda çağrılır
 */
export function cleanup(): void {
  // Player temizle
  if (currentPlayer) {
    try {
      currentPlayer.remove();
    } catch {
      // Sessizce geç
    }
    currentPlayer = null;
  }

  // Recorder duruyorsa durdur - DEFENSIVE STOP
  if (globalRecorder && recorderState === 'recording') {
    try {
      // Native state'i kontrol et
      if (globalRecorder.isRecording) {
        globalRecorder.stop();
      }
    } catch {
      // Sessizce geç - cleanup sırasında çökme olmamalı
    }
  }

  // State sıfırla
  recorderState = 'idle';
  releaseLock();
}
