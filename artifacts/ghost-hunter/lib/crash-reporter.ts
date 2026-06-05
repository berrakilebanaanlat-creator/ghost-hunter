/**
 * Crash Reporter - Firebase Crashlytics Entegrasyonu
 * 
 * Reklam hatalarını ve uygulama çökmelerini Firebase Crashlytics'e raporlar.
 * Web platformunda no-op olarak çalışır (console.warn ile loglar).
 * Native platformda @react-native-firebase/crashlytics kullanır.
 * 
 * KULLANIM:
 *   import { CrashReporter } from '@/lib/crash-reporter';
 *   CrashReporter.recordAdError('interstitial', 'load', error, { retryCount: 3 });
 *   CrashReporter.log('Kullanıcı premium ekranını açtı');
 */
import { Platform } from 'react-native';

// ============================================================
// HATA KATEGORİLERİ
// ============================================================

export type AdType = 'banner' | 'interstitial' | 'rewarded' | 'app_open';
export type AdErrorPhase = 'init' | 'load' | 'show' | 'create' | 'listener' | 'cleanup';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AdErrorContext {
  retryCount?: number;
  adUnitId?: string;
  cooldownActive?: boolean;
  errorCode?: string;
  errorDomain?: string;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================
// CRASHLYTICS NATIVE MODÜL (Lazy-load)
// ============================================================

let _crashlyticsModule: any = undefined; // undefined = henüz denenmedi
let _crashlyticsAvailable = false;

function getCrashlytics(): any | null {
  if (Platform.OS === 'web') return null;

  if (_crashlyticsModule !== undefined) {
    return _crashlyticsAvailable ? _crashlyticsModule : null;
  }

  try {
    const mod = require('@react-native-firebase/crashlytics');
    _crashlyticsModule = mod.default || mod;
    _crashlyticsAvailable = true;
    return _crashlyticsModule;
  } catch (error) {
    console.warn('[CrashReporter] Crashlytics modülü yüklenemedi:', error);
    _crashlyticsModule = null;
    _crashlyticsAvailable = false;
    return null;
  }
}

// ============================================================
// CRASH REPORTER API
// ============================================================

export const CrashReporter = {
  /**
   * Crashlytics'i başlat ve temel cihaz bilgilerini ayarla
   */
  async initialize(): Promise<void> {
    try {
      const crashlytics = getCrashlytics();
      if (!crashlytics) return;

      const instance = crashlytics();
      if (!instance) return;

      // Otomatik crash raporlamayı etkinleştir
      await instance.setCrashlyticsCollectionEnabled(true);

      // Temel uygulama bilgilerini ayarla
      await instance.setAttributes({
        platform: Platform.OS,
        app_version: '1.0.20',
        build_type: __DEV__ ? 'debug' : 'release',
      });

      instance.log('[CrashReporter] Crashlytics başlatıldı');
      console.log('[CrashReporter] Firebase Crashlytics aktif');
    } catch (error) {
      console.warn('[CrashReporter] Başlatma hatası:', error);
    }
  },

  /**
   * Genel log mesajı - crash raporlarında context olarak görünür
   */
  log(message: string): void {
    try {
      const crashlytics = getCrashlytics();
      if (crashlytics) {
        crashlytics().log(message);
      }
      if (__DEV__) {
        console.log(`[CrashReporter] ${message}`);
      }
    } catch {
      // Log hatası uygulamayı çökertmemeli
    }
  },

  /**
   * Reklam hatasını Crashlytics'e raporla
   * Non-fatal error olarak kaydedilir (uygulama çökmez)
   */
  recordAdError(
    adType: AdType,
    phase: AdErrorPhase,
    error: unknown,
    context?: AdErrorContext
  ): void {
    try {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error).substring(0, 200)
          : String(error);

      const severity = this._getAdErrorSeverity(adType, phase);

      // Console log (her zaman)
      console.warn(`[CrashReporter] Ad Error [${severity}] ${adType}/${phase}: ${errorMessage}`);

      const crashlytics = getCrashlytics();
      if (!crashlytics) return;

      const instance = crashlytics();
      if (!instance) return;

      // Custom attributes ayarla
      const attributes: Record<string, string> = {
        ad_type: adType,
        ad_error_phase: phase,
        ad_error_severity: severity,
        ad_error_message: errorMessage.substring(0, 100),
      };

      if (context) {
        if (context.retryCount !== undefined) attributes.ad_retry_count = String(context.retryCount);
        if (context.adUnitId) attributes.ad_unit_id = context.adUnitId;
        if (context.cooldownActive !== undefined) attributes.ad_cooldown_active = String(context.cooldownActive);
        if (context.errorCode) attributes.ad_error_code = context.errorCode;
        if (context.errorDomain) attributes.ad_error_domain = context.errorDomain;
      }

      instance.setAttributes(attributes);

      // Log context
      instance.log(`[AD_ERROR] ${adType}/${phase}: ${errorMessage}`);

      // Non-fatal error olarak kaydet
      if (error instanceof Error) {
        instance.recordError(error);
      } else {
        // Error nesnesi değilse, yeni bir Error oluştur
        const wrappedError = new Error(`[AdMob] ${adType}/${phase}: ${errorMessage}`);
        wrappedError.name = `AdError_${adType}_${phase}`;
        instance.recordError(wrappedError);
      }
    } catch (reportError) {
      // Raporlama hatası uygulamayı çökertmemeli
      console.warn('[CrashReporter] Raporlama hatası:', reportError);
    }
  },

  /**
   * Genel uygulama hatasını raporla (reklam dışı)
   */
  recordError(error: unknown, context?: string): void {
    try {
      const crashlytics = getCrashlytics();
      if (!crashlytics) return;

      const instance = crashlytics();
      if (!instance) return;

      if (context) {
        instance.log(`[ERROR_CONTEXT] ${context}`);
        instance.setAttribute('error_context', context);
      }

      if (error instanceof Error) {
        instance.recordError(error);
      } else {
        const wrappedError = new Error(String(error));
        wrappedError.name = context ? `AppError_${context}` : 'AppError';
        instance.recordError(wrappedError);
      }
    } catch {
      // Raporlama hatası uygulamayı çökertmemeli
    }
  },

  /**
   * Kullanıcı ID'sini ayarla (anonim analytics için)
   */
  async setUserId(userId: string): Promise<void> {
    try {
      const crashlytics = getCrashlytics();
      if (!crashlytics) return;
      await crashlytics().setUserId(userId);
    } catch {
      // Sessizce geç
    }
  },

  /**
   * Custom attribute ayarla
   */
  async setAttribute(key: string, value: string): Promise<void> {
    try {
      const crashlytics = getCrashlytics();
      if (!crashlytics) return;
      await crashlytics().setAttribute(key, value);
    } catch {
      // Sessizce geç
    }
  },

  /**
   * Birden fazla attribute ayarla
   */
  async setAttributes(attributes: Record<string, string>): Promise<void> {
    try {
      const crashlytics = getCrashlytics();
      if (!crashlytics) return;
      await crashlytics().setAttributes(attributes);
    } catch {
      // Sessizce geç
    }
  },

  /**
   * Reklam hatası önem derecesini belirle
   */
  _getAdErrorSeverity(adType: AdType, phase: AdErrorPhase): ErrorSeverity {
    // Init hataları kritik
    if (phase === 'init') return 'critical';

    // Show hataları - rewarded için kritik, diğerleri yüksek
    if (phase === 'show') {
      return adType === 'rewarded' ? 'critical' : 'high';
    }

    // Load hataları orta
    if (phase === 'load') return 'medium';

    // Create ve listener hataları düşük
    return 'low';
  },

  /**
   * Crashlytics'in kullanılabilir olup olmadığını kontrol et
   */
  isAvailable(): boolean {
    return _crashlyticsAvailable;
  },
};
