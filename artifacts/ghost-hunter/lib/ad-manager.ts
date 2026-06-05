/**
 * AdMob Reklam Yönetim Sistemi
 * Banner, Interstitial, Rewarded ve App Open reklamları yönetir
 * Web platformunda reklamlar gösterilmez - native modüller web'de import edilmez
 * 
 * HATA YÖNETİMİ:
 * - Tüm fonksiyonlar try-catch ile sarılıdır, hiçbir hata uygulamayı çökertmez
 * - Exponential backoff retry: 5s → 10s → 20s → 40s → 80s → 160s (maks 6 deneme)
 * - Cooldown: Ardışık 6 başarısız denemeden sonra 5 dakika bekleme
 * - Listener'lar güvenli şekilde eklenir/kaldırılır
 * - getNativeAds() import hatası sessizce yakalanır
 */
import { Platform } from 'react-native';
import { CrashReporter } from './crash-reporter';

// ============================================================
// REKLAM ID'LERİ
// ============================================================

export const AD_UNIT_IDS = {
  APP_ID: 'ca-app-pub-2683215724092307~4306569029',
  APP_OPEN: 'ca-app-pub-2683215724092307/2467469553',
  BANNER: 'ca-app-pub-2683215724092307/4574758144',
  INTERSTITIAL: 'ca-app-pub-2683215724092307/5341044906',
  REWARDED: 'ca-app-pub-2683215724092307/9838334980',
  // Test ID'leri (geliştirme sırasında kullanılır)
  TEST_APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  TEST_BANNER: 'ca-app-pub-3940256099942544/9214589741',
  TEST_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  TEST_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

// Geliştirme modunda test ID'leri kullan
const isDev = __DEV__;

export function getBannerAdUnitId(): string {
  if (isDev) return AD_UNIT_IDS.TEST_BANNER;
  return AD_UNIT_IDS.BANNER;
}

export function getInterstitialAdUnitId(): string {
  if (isDev) return AD_UNIT_IDS.TEST_INTERSTITIAL;
  return AD_UNIT_IDS.INTERSTITIAL;
}

export function getRewardedAdUnitId(): string {
  if (isDev) return AD_UNIT_IDS.TEST_REWARDED;
  return AD_UNIT_IDS.REWARDED;
}

export function getAppOpenAdUnitId(): string {
  if (isDev) return AD_UNIT_IDS.TEST_APP_OPEN;
  return AD_UNIT_IDS.APP_OPEN;
}

// ============================================================
// REKLAM GÖSTERIM SAYACI
// ============================================================

let screenTransitionCount = 0;
const INTERSTITIAL_FREQUENCY = 4;

export function incrementScreenTransition(): boolean {
  screenTransitionCount++;
  return screenTransitionCount % INTERSTITIAL_FREQUENCY === 0;
}

export function resetAdCounter(): void {
  screenTransitionCount = 0;
}

// ============================================================
// HATA YÖNETİMİ - Exponential Backoff Retry Sistemi
// ============================================================

const MAX_RETRIES = 6;
const BASE_RETRY_DELAY = 5000; // 5 saniye
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 dakika

interface RetryState {
  retryCount: number;
  lastAttempt: number;
  cooldownUntil: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const retryStates: Record<string, RetryState> = {
  interstitial: { retryCount: 0, lastAttempt: 0, cooldownUntil: 0, timer: null },
  rewarded: { retryCount: 0, lastAttempt: 0, cooldownUntil: 0, timer: null },
  appOpen: { retryCount: 0, lastAttempt: 0, cooldownUntil: 0, timer: null },
  init: { retryCount: 0, lastAttempt: 0, cooldownUntil: 0, timer: null },
};

function getRetryDelay(adType: string): number {
  const state = retryStates[adType];
  if (!state) return BASE_RETRY_DELAY;
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, state.retryCount), 160000);
}

function canRetry(adType: string): boolean {
  const state = retryStates[adType];
  if (!state) return true;

  const now = Date.now();

  // Cooldown kontrolü
  if (state.cooldownUntil > now) {
    console.log(`[AdMob] ${adType} cooldown aktif, ${Math.round((state.cooldownUntil - now) / 1000)}s kaldı`);
    return false;
  }

  // Maks retry kontrolü
  if (state.retryCount >= MAX_RETRIES) {
    // Cooldown başlat
    state.cooldownUntil = now + COOLDOWN_DURATION;
    state.retryCount = 0;
    console.log(`[AdMob] ${adType} maks retry aşıldı, ${COOLDOWN_DURATION / 1000}s cooldown başladı`);
    return false;
  }

  return true;
}

function recordRetryAttempt(adType: string): void {
  const state = retryStates[adType];
  if (state) {
    state.retryCount++;
    state.lastAttempt = Date.now();
  }
}

function resetRetryState(adType: string): void {
  const state = retryStates[adType];
  if (state) {
    state.retryCount = 0;
    state.cooldownUntil = 0;
  }
}

function clearRetryTimer(adType: string): void {
  const state = retryStates[adType];
  if (state?.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function scheduleRetry(adType: string, callback: () => void): void {
  if (!canRetry(adType)) return;

  clearRetryTimer(adType);
  const delay = getRetryDelay(adType);
  recordRetryAttempt(adType);

  console.log(`[AdMob] ${adType} retry #${retryStates[adType]?.retryCount} — ${delay / 1000}s sonra`);

  const state = retryStates[adType];
  if (state) {
    state.timer = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.warn(`[AdMob] ${adType} retry callback hatası:`, error);
      }
    }, delay);
  }
}

/** Tüm bekleyen retry timer'larını temizle (cleanup için) */
export function clearAllRetryTimers(): void {
  Object.keys(retryStates).forEach(clearRetryTimer);
}

// ============================================================
// Güvenli fonksiyon çağrısı wrapper
// ============================================================

function safeCall<T>(fn: () => T, fallback: T, context: string): T {
  try {
    return fn();
  } catch (error) {
    console.warn(`[AdMob] ${context} hatası:`, error);
    return fallback;
  }
}

async function safeAsyncCall<T>(fn: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[AdMob] ${context} hatası:`, error);
    CrashReporter.recordAdError(
      _contextToAdType(context),
      _contextToPhase(context),
      error,
      { retryCount: retryStates[_contextToRetryKey(context)]?.retryCount ?? 0 }
    );
    return fallback;
  }
}

// Context string'den reklam türü ve fazı çıkar
function _contextToAdType(ctx: string): 'banner' | 'interstitial' | 'rewarded' | 'app_open' {
  if (ctx.toLowerCase().includes('interstitial')) return 'interstitial';
  if (ctx.toLowerCase().includes('rewarded')) return 'rewarded';
  if (ctx.toLowerCase().includes('app open')) return 'app_open';
  if (ctx.toLowerCase().includes('banner')) return 'banner';
  return 'interstitial'; // default
}

function _contextToPhase(ctx: string): 'init' | 'load' | 'show' | 'create' | 'listener' | 'cleanup' {
  if (ctx.toLowerCase().includes('başlat')) return 'init';
  if (ctx.toLowerCase().includes('göster')) return 'show';
  if (ctx.toLowerCase().includes('oluştur')) return 'create';
  if (ctx.toLowerCase().includes('cleanup') || ctx.toLowerCase().includes('temizl')) return 'cleanup';
  return 'load'; // default
}

function _contextToRetryKey(ctx: string): string {
  if (ctx.toLowerCase().includes('interstitial')) return 'interstitial';
  if (ctx.toLowerCase().includes('rewarded')) return 'rewarded';
  if (ctx.toLowerCase().includes('app open')) return 'appOpen';
  return 'init';
}

// ============================================================
// ADMOB BAŞLATMA VE REKLAM YÖNETİMİ (Native only)
// Web'de bu fonksiyonlar no-op olarak çalışır
// ============================================================

let admobInitialized = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let appOpenLoaded = false;
let currentInterstitial: any = null;
let currentRewarded: any = null;
let currentAppOpen: any = null;

// Listener referansları (cleanup için)
let interstitialListeners: Array<() => void> = [];
let rewardedListeners: Array<() => void> = [];
let appOpenListeners: Array<() => void> = [];

// Native modüller lazy-load edilir - web'de hiç yüklenmez
let _nativeAdsCache: any = undefined; // undefined = henüz denenmedi, null = başarısız

function getNativeAds(): any | null {
  if (Platform.OS === 'web') return null;

  // Cache kontrolü - her seferinde require çağırmayı önle
  if (_nativeAdsCache !== undefined) return _nativeAdsCache;

  try {
    _nativeAdsCache = require('react-native-google-mobile-ads');
    return _nativeAdsCache;
  } catch (error) {
    console.warn('[AdMob] Native ads modülü yüklenemedi:', error);
    _nativeAdsCache = null;
    return null;
  }
}

export async function initializeAdMob(): Promise<void> {
  if (Platform.OS === 'web' || admobInitialized) return;

  const ads = getNativeAds();
  if (!ads) return;

  return safeAsyncCall(async () => {
    if (!canRetry('init')) return;

    await ads.default().initialize();
    admobInitialized = true;
    resetRetryState('init');
    console.log('[AdMob] Başarıyla başlatıldı');

    // Crashlytics'i de başlat
    CrashReporter.initialize();
    CrashReporter.log('AdMob başarıyla başlatıldı');
  }, undefined, 'AdMob başlatma');
}

// ============================================================
// LISTENER YARDIMCILARI - Güvenli ekleme/temizleme
// ============================================================

function safeAddListener(
  ad: any,
  eventType: any,
  callback: (...args: any[]) => void,
  listenerArray: Array<() => void>
): void {
  try {
    if (!ad || !eventType) return;
    const unsubscribe = ad.addAdEventListener(eventType, (...args: any[]) => {
      try {
        callback(...args);
      } catch (error) {
        console.warn('[AdMob] Listener callback hatası:', error);
      }
    });
    if (typeof unsubscribe === 'function') {
      listenerArray.push(unsubscribe);
    }
  } catch (error) {
    console.warn('[AdMob] Listener ekleme hatası:', error);
  }
}

function cleanupListeners(listenerArray: Array<() => void>): void {
  listenerArray.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // Listener zaten kaldırılmış olabilir, sessizce geç
    }
  });
  listenerArray.length = 0;
}

// ============================================================
// INTERSTITIAL REKLAM
// ============================================================

export function createInterstitialAd(): void {
  if (Platform.OS === 'web' || !admobInitialized) return;

  safeCall(() => {
    const ads = getNativeAds();
    if (!ads?.InterstitialAd) return;

    // Önceki listener'ları temizle
    cleanupListeners(interstitialListeners);
    currentInterstitial = null;
    interstitialLoaded = false;

    const adUnitId = getInterstitialAdUnitId();
    currentInterstitial = ads.InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    safeAddListener(currentInterstitial, ads.AdEventType.LOADED, () => {
      interstitialLoaded = true;
      resetRetryState('interstitial');
      console.log('[AdMob] Interstitial yüklendi');
    }, interstitialListeners);

    safeAddListener(currentInterstitial, ads.AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      // Kapandıktan sonra yeni reklam hazırla
      scheduleRetry('interstitial', createInterstitialAd);
    }, interstitialListeners);

    safeAddListener(currentInterstitial, ads.AdEventType.ERROR, (error: any) => {
      interstitialLoaded = false;
      console.warn('[AdMob] Interstitial yükleme hatası:', error?.message || error);
      CrashReporter.recordAdError('interstitial', 'load', error, {
        retryCount: retryStates.interstitial.retryCount,
        adUnitId: getInterstitialAdUnitId(),
        errorCode: error?.code,
      });
      scheduleRetry('interstitial', createInterstitialAd);
    }, interstitialListeners);

    currentInterstitial.load();
  }, undefined, 'Interstitial oluşturma');
}

export async function showInterstitialAd(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  return safeAsyncCall(async () => {
    if (!interstitialLoaded || !currentInterstitial) {
      // Reklam hazır değil, arka planda yüklemeyi başlat
      createInterstitialAd();
      return false;
    }

    await currentInterstitial.show();
    return true;
  }, false, 'Interstitial gösterme');
}

// ============================================================
// REWARDED REKLAM
// ============================================================

export function createRewardedAd(): void {
  if (Platform.OS === 'web' || !admobInitialized) return;

  safeCall(() => {
    const ads = getNativeAds();
    if (!ads?.RewardedAd) return;

    // Önceki listener'ları temizle
    cleanupListeners(rewardedListeners);
    currentRewarded = null;
    rewardedLoaded = false;

    const adUnitId = getRewardedAdUnitId();
    currentRewarded = ads.RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    safeAddListener(currentRewarded, ads.RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
      resetRetryState('rewarded');
      console.log('[AdMob] Rewarded yüklendi');
    }, rewardedListeners);

    safeAddListener(currentRewarded, ads.RewardedAdEventType.EARNED_REWARD, (reward: any) => {
      console.log('[AdMob] Ödül kazanıldı:', reward);
    }, rewardedListeners);

    safeAddListener(currentRewarded, ads.AdEventType.CLOSED, () => {
      rewardedLoaded = false;
      scheduleRetry('rewarded', createRewardedAd);
    }, rewardedListeners);

    safeAddListener(currentRewarded, ads.AdEventType.ERROR, (error: any) => {
      rewardedLoaded = false;
      console.warn('[AdMob] Rewarded yükleme hatası:', error?.message || error);
      CrashReporter.recordAdError('rewarded', 'load', error, {
        retryCount: retryStates.rewarded.retryCount,
        adUnitId: getRewardedAdUnitId(),
        errorCode: error?.code,
      });
      scheduleRetry('rewarded', createRewardedAd);
    }, rewardedListeners);

    currentRewarded.load();
  }, undefined, 'Rewarded oluşturma');
}

export async function showRewardedAd(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  return safeAsyncCall(async () => {
    if (!rewardedLoaded || !currentRewarded) {
      createRewardedAd();
      return false;
    }

    const ads = getNativeAds();
    if (!ads) return false;

    return new Promise<boolean>((resolve) => {
      // Timeout koruması: 30 saniye içinde cevap gelmezse false dön
      const timeout = setTimeout(() => {
        console.warn('[AdMob] Rewarded gösterim timeout (30s)');
        resolve(false);
      }, 30000);

      try {
        let resolved = false;
        const safeResolve = (value: boolean) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          resolve(value);
        };

        const rewardListener = currentRewarded.addAdEventListener(
          ads.RewardedAdEventType.EARNED_REWARD,
          () => {
            try { rewardListener(); } catch { /* already removed */ }
            safeResolve(true);
          }
        );

        const closeListener = currentRewarded.addAdEventListener(
          ads.AdEventType.CLOSED,
          () => {
            try { closeListener(); } catch { /* already removed */ }
            safeResolve(false);
          }
        );

        const errorListener = currentRewarded.addAdEventListener(
          ads.AdEventType.ERROR,
          () => {
            try { errorListener(); } catch { /* already removed */ }
            safeResolve(false);
          }
        );

        currentRewarded.show();
      } catch (error) {
        clearTimeout(timeout);
        console.warn('[AdMob] Rewarded show hatası:', error);
        CrashReporter.recordAdError('rewarded', 'show', error, {
          adUnitId: getRewardedAdUnitId(),
        });
        rewardedLoaded = false;
        createRewardedAd();
        resolve(false);
      }
    });
  }, false, 'Rewarded gösterme');
}

// ============================================================
// APP OPEN REKLAM (Uygulama Açılışı)
// Cold start'ı etkilememek için AdMob init sonrası lazy-load edilir
// ============================================================

export function createAppOpenAd(): void {
  if (Platform.OS === 'web' || !admobInitialized) return;

  safeCall(() => {
    const ads = getNativeAds();
    if (!ads?.AppOpenAd) return;

    // Önceki listener'ları temizle
    cleanupListeners(appOpenListeners);
    currentAppOpen = null;
    appOpenLoaded = false;

    const adUnitId = getAppOpenAdUnitId();
    currentAppOpen = ads.AppOpenAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    safeAddListener(currentAppOpen, ads.AdEventType.LOADED, () => {
      appOpenLoaded = true;
      resetRetryState('appOpen');
      console.log('[AdMob] App Open reklam yüklendi');
    }, appOpenListeners);

    safeAddListener(currentAppOpen, ads.AdEventType.CLOSED, () => {
      appOpenLoaded = false;
      scheduleRetry('appOpen', createAppOpenAd);
    }, appOpenListeners);

    safeAddListener(currentAppOpen, ads.AdEventType.ERROR, (error: any) => {
      appOpenLoaded = false;
      console.warn('[AdMob] App Open yükleme hatası:', error?.message || error);
      CrashReporter.recordAdError('app_open', 'load', error, {
        retryCount: retryStates.appOpen.retryCount,
        adUnitId: getAppOpenAdUnitId(),
        errorCode: error?.code,
      });
      scheduleRetry('appOpen', createAppOpenAd);
    }, appOpenListeners);

    currentAppOpen.load();
  }, undefined, 'App Open oluşturma');
}

export async function showAppOpenAd(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  return safeAsyncCall(async () => {
    if (!appOpenLoaded || !currentAppOpen) {
      createAppOpenAd();
      return false;
    }

    await currentAppOpen.show();
    return true;
  }, false, 'App Open gösterme');
}

// ============================================================
// DURUM KONTROL
// ============================================================

export function isInterstitialReady(): boolean {
  return interstitialLoaded;
}

export function isRewardedReady(): boolean {
  return rewardedLoaded;
}

export function isAppOpenReady(): boolean {
  return appOpenLoaded;
}

export function isAdMobInitialized(): boolean {
  return admobInitialized;
}

// ============================================================
// CLEANUP - Uygulama kapanışında çağrılmalı
// ============================================================

export function cleanupAllAds(): void {
  try {
    clearAllRetryTimers();
    cleanupListeners(interstitialListeners);
    cleanupListeners(rewardedListeners);
    cleanupListeners(appOpenListeners);
    currentInterstitial = null;
    currentRewarded = null;
    currentAppOpen = null;
    interstitialLoaded = false;
    rewardedLoaded = false;
    appOpenLoaded = false;
    console.log('[AdMob] Tüm reklamlar temizlendi');
  } catch (error) {
    console.warn('[AdMob] Cleanup hatası:', error);
  }
}
