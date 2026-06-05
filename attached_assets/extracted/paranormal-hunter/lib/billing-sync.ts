import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CrashReporter } from './crash-reporter';

/**
 * Google Play Billing Library senkronizasyon modülü
 * Her açılışta ve premium ekranında gerçek abonelik durumunu kontrol eder
 */

const BILLING_CACHE_KEY = 'billing_subscription_cache';
const BILLING_LAST_SYNC_KEY = 'billing_last_sync_timestamp';
const BILLING_SYNC_INTERVAL = 5 * 60 * 1000; // 5 dakika

export interface BillingSubscriptionState {
  isVoxPurchased: boolean;
  period: 'monthly' | 'yearly' | null;
  expiresAt: number | null;
  autoRenew: boolean;
  lastSyncTime: number;
  isSyncing: boolean;
  syncError: string | null;
}

/**
 * Google Play Billing durumunu kontrol et
 * Native taraftan gerçek abonelik bilgisini al
 */
export async function syncBillingStatus(): Promise<BillingSubscriptionState> {
  // Web platformda mock data döndür
  if (Platform.OS === 'web') {
    return {
      isVoxPurchased: false,
      period: null,
      expiresAt: null,
      autoRenew: false,
      lastSyncTime: Date.now(),
      isSyncing: false,
      syncError: null,
    };
  }

  try {
    // Son senkronizasyon zamanını kontrol et
    const lastSyncStr = await AsyncStorage.getItem(BILLING_LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();

    // Eğer son 5 dakika içinde senkronize ettiyse cache'den döndür
    if (now - lastSync < BILLING_SYNC_INTERVAL) {
      const cached = await AsyncStorage.getItem(BILLING_CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          // Cache parse hatası, yeniden senkronize et
        }
      }
    }

    // Google Play Billing Library'den gerçek durumu al
    const billingState = await fetchBillingStatusFromNative();

    // Sonucu cache'le
    await AsyncStorage.setItem(BILLING_CACHE_KEY, JSON.stringify(billingState));
    await AsyncStorage.setItem(BILLING_LAST_SYNC_KEY, now.toString());

    return billingState;
  } catch (error) {
    CrashReporter.recordError(
      error instanceof Error ? error : new Error(String(error)),
      'billing_sync_error'
    );

    // Hata durumunda cache'den döndür
    const cached = await AsyncStorage.getItem(BILLING_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Cache de bozuksa, varsayılan durumu döndür
      }
    }

    return {
      isVoxPurchased: false,
      period: null,
      expiresAt: null,
      autoRenew: false,
      lastSyncTime: Date.now(),
      isSyncing: false,
      syncError: error instanceof Error ? error.message : 'Senkronizasyon hatası',
    };
  }
}

/**
 * Native taraftan Google Play Billing durumunu al
 * Bu fonksiyon native modülü çağırır
 */
async function fetchBillingStatusFromNative(): Promise<BillingSubscriptionState> {
  try {
    // TODO: Native tarafta implementasyon gerekli
    // react-native-iap veya @react-native-firebase/inappmessaging kullanılabilir
    // Şimdilik AsyncStorage'dan oku
    const stored = await AsyncStorage.getItem('vox_subscription');
    const subscription = stored ? JSON.parse(stored) : null;

    return {
      isVoxPurchased: !!subscription?.isActive,
      period: subscription?.period || null,
      expiresAt: subscription?.expiresAt || null,
      autoRenew: subscription?.autoRenew ?? false,
      lastSyncTime: Date.now(),
      isSyncing: false,
      syncError: null,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Abonelik durumunu manuel olarak yenile
 * Premium ekranında "Senkronize Et" butonu tarafından çağrılır
 */
export async function refreshBillingStatus(): Promise<BillingSubscriptionState> {
  // Cache'i temizle ve yeniden senkronize et
  await AsyncStorage.removeItem(BILLING_LAST_SYNC_KEY);
  return syncBillingStatus();
}

/**
 * Abonelik durumunu offline modda kontrol et
 * Cache'den döndür, senkronizasyon yapma
 */
export async function getCachedBillingStatus(): Promise<BillingSubscriptionState | null> {
  const cached = await AsyncStorage.getItem(BILLING_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Abonelik durumunu temizle (logout sırasında)
 */
export async function clearBillingCache(): Promise<void> {
  await AsyncStorage.removeItem(BILLING_CACHE_KEY);
  await AsyncStorage.removeItem(BILLING_LAST_SYNC_KEY);
}
