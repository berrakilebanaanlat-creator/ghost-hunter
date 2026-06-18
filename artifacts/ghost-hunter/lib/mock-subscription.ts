/**
 * MOCK ABONELİK - Sadece geliştirme modunda (__DEV__) kullanılır
 *
 * Bu modül, gerçek ödeme yapmadan abonelik senaryolarını
 * Premium ekranında test etmeyi sağlar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumManager, type VoxSubscription } from './premium-manager';

// ============================================================
// MOCK SENARYOLARI
// ============================================================

export type MockScenario =
  | 'no_subscription'       // Abonelik yok (yeni kullanıcı)
  | 'monthly_active'        // Aylık aktif abonelik
  | 'yearly_active'         // Yıllık aktif abonelik
  | 'expired'               // Süresi dolmuş abonelik
  | 'prices_loading'        // Fiyatlar yükleniyor (yavaş ağ simülasyonu)
  | 'prices_unavailable';   // Fiyatlar yok (internet bağlantı hatası)

export type MockPurchaseOutcome =
  | 'success_monthly'   // Satın alma başarılı (aylık)
  | 'success_yearly'    // Satın alma başarılı (yıllık)
  | 'error'             // Satın alma hatası
  | 'cancelled';        // Kullanıcı iptal etti

// Dev-only AsyncStorage anahtarı
const MOCK_NEXT_PURCHASE_KEY = '@dev_mock_next_purchase';

/**
 * Bir sonraki satın alma isteğinin sonucunu ayarla.
 * DevSubscriptionPanel tarafından çağrılır.
 */
export async function setMockPurchaseOutcome(outcome: MockPurchaseOutcome): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.setItem(MOCK_NEXT_PURCHASE_KEY, outcome);
}

/**
 * Ayarlı mock sonucunu oku ve sil (tek kullanımlık).
 * ad-context.tsx içinde __DEV__ modunda okunur.
 */
export async function consumeMockPurchaseOutcome(): Promise<MockPurchaseOutcome | null> {
  if (!__DEV__) return null;
  const val = await AsyncStorage.getItem(MOCK_NEXT_PURCHASE_KEY);
  if (val) {
    await AsyncStorage.removeItem(MOCK_NEXT_PURCHASE_KEY);
    return val as MockPurchaseOutcome;
  }
  return null;
}

/**
 * Senaryoya göre PremiumManager durumunu ayarla.
 */
export async function applyMockScenario(scenario: MockScenario): Promise<void> {
  if (!__DEV__) return;

  const now = Date.now();

  switch (scenario) {
    case 'no_subscription':
      await PremiumManager.resetVoxPurchase();
      break;

    case 'monthly_active': {
      const sub: VoxSubscription = {
        isActive: true,
        period: 'monthly',
        purchasedAt: now - 5 * 24 * 60 * 60 * 1000,       // 5 gün önce satın alındı
        expiresAt: now + 25 * 24 * 60 * 60 * 1000,        // 25 gün kaldı
        autoRenew: true,
        productId: 'vox_monthly',
      };
      await AsyncStorage.setItem('@antik_ghost_vox_subscription', JSON.stringify(sub));
      await AsyncStorage.setItem('@antik_ghost_vox_purchased', 'true');
      break;
    }

    case 'yearly_active': {
      const sub: VoxSubscription = {
        isActive: true,
        period: 'yearly',
        purchasedAt: now - 30 * 24 * 60 * 60 * 1000,      // 30 gün önce satın alındı
        expiresAt: now + 335 * 24 * 60 * 60 * 1000,       // 335 gün kaldı
        autoRenew: true,
        productId: 'vox_yearly',
      };
      await AsyncStorage.setItem('@antik_ghost_vox_subscription', JSON.stringify(sub));
      await AsyncStorage.setItem('@antik_ghost_vox_purchased', 'true');
      break;
    }

    case 'expired': {
      const sub: VoxSubscription = {
        isActive: false,
        period: 'monthly',
        purchasedAt: now - 40 * 24 * 60 * 60 * 1000,      // 40 gün önce
        expiresAt: now - 10 * 24 * 60 * 60 * 1000,        // 10 gün önce doldu
        autoRenew: false,
        productId: 'vox_monthly',
      };
      await AsyncStorage.setItem('@antik_ghost_vox_subscription', JSON.stringify(sub));
      await AsyncStorage.setItem('@antik_ghost_vox_purchased', 'false');
      break;
    }

    // prices_loading ve prices_unavailable durumları
    // DevSubscriptionPanel tarafından ad-context'e override olarak aktarılır
    case 'prices_loading':
    case 'prices_unavailable':
      break;
  }
}
