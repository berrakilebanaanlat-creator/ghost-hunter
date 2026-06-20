import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly' | 'free';
  features: string[];
  isActive: boolean;
  /** Google Play / App Store ürün ID'si */
  productId: string;
  /** Yıllık planda aylık başına düşen fiyat */
  monthlyEquivalent?: number;
  /** Tasarruf yüzdesi */
  savingsPercent?: number;
}

export interface UserSubscription {
  planId: string;
  isActive: boolean;
  expiresAt: number | null;
  purchasedAt: number;
  autoRenew: boolean;
  period: 'monthly' | 'yearly' | 'free';
}

// Abonelik planları - Yeni monetizasyon modeli
// Ücretsiz: Tüm özellikler (reklamlı), VOX hariç
// VOX Aylık: 3.99$/ay abonelik
// VOX Yıllık: 19.99$/yıl abonelik (%58 tasarruf)
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    currency: 'USD',
    period: 'free',
    features: ['EMF Tarayıcı', 'Radar', 'EVP Kaydı', 'SLS Kamera', 'Olay Kayıtları', 'Reklamlı'],
    isActive: true,
    productId: '',
  },
  VOX_MONTHLY: {
    id: 'vox_monthly',
    name: 'VOX Aylık',
    price: 3.99,
    currency: 'USD',
    period: 'monthly',
    features: [
      'Ruh İletişim Cihazı',
      '3000+ Türkçe Kelime',
      '9 Farklı Ses Karakteri',
      'Radyo Efektleri',
      'Mikrofon Tetikleme',
      'Beyaz Gürültü ve Yankı Kontrol',
      'Oturum Kayıt Özelliği',
    ],
    isActive: true,
    productId: 'vox_monthly',
  },
  VOX_YEARLY: {
    id: 'vox_yearly',
    name: 'VOX Yıllık',
    price: 19.99,
    currency: 'USD',
    period: 'yearly',
    features: [
      'Ruh İletişim Cihazı',
      '3000+ Türkçe Kelime',
      '9 Farklı Ses Karakteri',
      'Radyo Efektleri',
      'Mikrofon Tetikleme',
      'Beyaz Gürültü ve Yankı Kontrol',
      'Oturum Kayıt Özelliği',
    ],
    isActive: true,
    productId: 'vox_yearly',
    monthlyEquivalent: 1.67,
    savingsPercent: 58,
  },
};

const SUBSCRIPTION_KEY = '@antik_ghost_subscription';
const VOX_PURCHASE_KEY = '@antik_ghost_vox_purchased';
const VOX_SUBSCRIPTION_KEY = '@antik_ghost_vox_subscription';

// Varsayılan abonelik (ücretsiz)
const DEFAULT_SUBSCRIPTION: UserSubscription = {
  planId: 'free',
  isActive: true,
  expiresAt: null,
  purchasedAt: Date.now(),
  autoRenew: false,
  period: 'free',
};

export class PremiumManager {
  // ============================================================
  // GENEL ABONELİK
  // ============================================================

  static async getUserSubscription(): Promise<UserSubscription> {
    try {
      const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      return data ? JSON.parse(data) : DEFAULT_SUBSCRIPTION;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return DEFAULT_SUBSCRIPTION;
    }
  }

  static async setUserSubscription(subscription: UserSubscription): Promise<void> {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    } catch (error) {
      console.error('Error setting subscription:', error);
    }
  }

  static async isPremium(): Promise<boolean> {
    const subscription = await this.getUserSubscription();
    if (!subscription.isActive) return false;
    if (subscription.planId === 'lifetime') return true;
    if (subscription.expiresAt && subscription.expiresAt < Date.now()) return false;
    return subscription.planId !== 'free';
  }

  static async purchasePlan(planId: string): Promise<boolean> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
      if (!plan) return false;

      const now = Date.now();
      let expiresAt: number | null = null;

      if (planId !== 'lifetime' && planId !== 'vox') {
        expiresAt = now + 365 * 24 * 60 * 60 * 1000;
      }

      const subscription: UserSubscription = {
        planId,
        isActive: true,
        expiresAt,
        purchasedAt: now,
        autoRenew: planId !== 'lifetime' && planId !== 'vox',
        period: plan.period,
      };

      await this.setUserSubscription(subscription);
      return true;
    } catch (error) {
      console.error('Error purchasing plan:', error);
      return false;
    }
  }

  static async cancelSubscription(): Promise<void> {
    await this.setUserSubscription({ ...DEFAULT_SUBSCRIPTION, purchasedAt: Date.now() });
  }

  static async getSubscriptionStatus(): Promise<string> {
    const subscription = await this.getUserSubscription();

    if (!subscription.isActive) return 'Süresi Doldu';

    if (subscription.expiresAt) {
      const daysLeft = Math.ceil((subscription.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
      return `${daysLeft} gün kaldı`;
    }

    return 'Aktif';
  }

  // ============================================================
  // VOX ABONELİK (Aylık 3.99$ / Yıllık 19.99$)
  // ============================================================

  static async isVoxPurchased(): Promise<boolean> {
    try {
      // Önce abonelik durumunu kontrol et
      const subData = await AsyncStorage.getItem(VOX_SUBSCRIPTION_KEY);
      if (subData) {
        const sub = JSON.parse(subData) as VoxSubscription;
        if (sub.isActive && sub.expiresAt > Date.now()) {
          return true;
        }
        // Süresi dolmuşsa false döndür
        if (sub.expiresAt <= Date.now()) {
          return false;
        }
      }
      // Eski tek seferlik satın alma kontrolü (geriye uyumluluk)
      const data = await AsyncStorage.getItem(VOX_PURCHASE_KEY);
      return data === 'true';
    } catch {
      return false;
    }
  }

  static async getVoxSubscription(): Promise<VoxSubscription | null> {
    try {
      const data = await AsyncStorage.getItem(VOX_SUBSCRIPTION_KEY);
      if (data) {
        return JSON.parse(data) as VoxSubscription;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async purchaseVoxSubscription(period: 'monthly' | 'yearly'): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = period === 'monthly'
        ? now + 30 * 24 * 60 * 60 * 1000   // 30 gün
        : now + 365 * 24 * 60 * 60 * 1000;  // 365 gün

      const subscription: VoxSubscription = {
        isActive: true,
        period,
        purchasedAt: now,
        expiresAt,
        autoRenew: true,
        productId: period === 'monthly' ? 'vox_monthly' : 'vox_yearly',
      };

      await AsyncStorage.setItem(VOX_SUBSCRIPTION_KEY, JSON.stringify(subscription));
      // Eski key'i de true yap (geriye uyumluluk)
      await AsyncStorage.setItem(VOX_PURCHASE_KEY, 'true');
    } catch (error) {
      console.error('Error saving VOX subscription:', error);
    }
  }

  /** Eski tek seferlik satın alma (geriye uyumluluk) */
  static async purchaseVox(): Promise<void> {
    try {
      await AsyncStorage.setItem(VOX_PURCHASE_KEY, 'true');
    } catch (error) {
      console.error('Error saving VOX purchase:', error);
    }
  }

  static async resetVoxPurchase(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VOX_PURCHASE_KEY);
      await AsyncStorage.removeItem(VOX_SUBSCRIPTION_KEY);
    } catch (error) {
      console.error('Error resetting VOX purchase:', error);
    }
  }

  static async getVoxExpiryText(): Promise<string> {
    const sub = await this.getVoxSubscription();
    if (!sub) return '';
    
    const daysLeft = Math.ceil((sub.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return 'Süresi doldu';
    if (daysLeft === 1) return '1 gün kaldı';
    return `${daysLeft} gün kaldı`;
  }
}

export interface VoxSubscription {
  isActive: boolean;
  period: 'monthly' | 'yearly';
  purchasedAt: number;
  expiresAt: number;
  autoRenew: boolean;
  productId: string;
}

// ============================================================
// SCANNER ABONELİK (Aylık / Yıllık)
// ============================================================

export interface ScannerSubscription {
  isActive: boolean;
  period: 'monthly' | 'yearly';
  purchasedAt: number;
  expiresAt: number;
  autoRenew: boolean;
  productId: string;
}

const SCANNER_SUBSCRIPTION_KEY = '@antik_ghost_scanner_subscription';

export class ScannerManager {
  static async isScannerPurchased(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(SCANNER_SUBSCRIPTION_KEY);
      if (data) {
        const sub = JSON.parse(data) as ScannerSubscription;
        if (sub.isActive && sub.expiresAt > Date.now()) return true;
        if (sub.expiresAt <= Date.now()) return false;
      }
      return false;
    } catch { return false; }
  }

  static async getScannerSubscription(): Promise<ScannerSubscription | null> {
    try {
      const data = await AsyncStorage.getItem(SCANNER_SUBSCRIPTION_KEY);
      return data ? JSON.parse(data) as ScannerSubscription : null;
    } catch { return null; }
  }

  static async purchaseScannerSubscription(period: 'monthly' | 'yearly'): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = period === 'monthly'
        ? now + 30 * 24 * 60 * 60 * 1000
        : now + 365 * 24 * 60 * 60 * 1000;
      const sub: ScannerSubscription = {
        isActive: true,
        period,
        purchasedAt: now,
        expiresAt,
        autoRenew: true,
        productId: period === 'monthly' ? 'scanner_monthly' : 'scanner_yearly',
      };
      await AsyncStorage.setItem(SCANNER_SUBSCRIPTION_KEY, JSON.stringify(sub));
    } catch (error) {
      console.error('Error saving scanner subscription:', error);
    }
  }

  static async resetScannerPurchase(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SCANNER_SUBSCRIPTION_KEY);
    } catch (error) {
      console.error('Error resetting scanner purchase:', error);
    }
  }

  static async getScannerExpiryText(): Promise<string> {
    const sub = await this.getScannerSubscription();
    if (!sub) return '';
    const daysLeft = Math.ceil((sub.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return 'Süresi doldu';
    if (daysLeft === 1) return '1 gün kaldı';
    return `${daysLeft} gün kaldı`;
  }
}

// ============================================================
// ÖDÜLLÜ REKLAM GEÇİCİ ERİŞİM (10 Dakika)
// ============================================================

export interface RewardedAdAccess {
  feature: 'sls_camera' | 'spirit_box' | 'evidence_wall';
  grantedAt: number;
  expiresAt: number;
}

const REWARDED_ACCESS_KEY = '@antik_ghost_rewarded_access';
const REWARDED_ACCESS_DURATION = 10 * 60 * 1000; // 10 dakika

export class RewardedAdManager {
  /**
   * Kullanıcıya reklam izledikten sonra geçici erişim ver
   */
  static async grantRewardedAccess(feature: 'sls_camera' | 'spirit_box' | 'evidence_wall'): Promise<void> {
    try {
      const now = Date.now();
      const access: RewardedAdAccess = {
        feature,
        grantedAt: now,
        expiresAt: now + REWARDED_ACCESS_DURATION,
      };
      await AsyncStorage.setItem(`${REWARDED_ACCESS_KEY}_${feature}`, JSON.stringify(access));
      console.log(`[Rewarded] ${feature} için 10 dakika erişim verildi`);
    } catch (error) {
      console.error('Error granting rewarded access:', error);
    }
  }

  /**
   * Kullanıcının geçici erişimi var mı kontrol et
   */
  static async hasRewardedAccess(feature: 'sls_camera' | 'spirit_box' | 'evidence_wall'): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(`${REWARDED_ACCESS_KEY}_${feature}`);
      if (!data) return false;
      const access: RewardedAdAccess = JSON.parse(data);
      if (access.feature !== feature) return false;
      if (access.expiresAt < Date.now()) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Geçici erişimin kalan süresini al (saniye cinsinden)
   */
  static async getRewardedAccessTimeLeft(feature: 'sls_camera' | 'spirit_box' | 'evidence_wall'): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(`${REWARDED_ACCESS_KEY}_${feature}`);
      if (!data) return 0;
      const access: RewardedAdAccess = JSON.parse(data);
      if (access.feature !== feature) return 0;
      const timeLeft = Math.max(0, access.expiresAt - Date.now());
      return Math.ceil(timeLeft / 1000); // Saniye cinsinden
    } catch {
      return 0;
    }
  }

  /**
   * Geçici erişimi iptal et
   */
  static async revokeRewardedAccess(feature?: string): Promise<void> {
    try {
      if (feature) {
        await AsyncStorage.removeItem(`${REWARDED_ACCESS_KEY}_${feature}`);
      } else {
        await AsyncStorage.removeItem(`${REWARDED_ACCESS_KEY}_sls_camera`);
        await AsyncStorage.removeItem(`${REWARDED_ACCESS_KEY}_spirit_box`);
        await AsyncStorage.removeItem(`${REWARDED_ACCESS_KEY}_evidence_wall`);
      }
    } catch (error) {
      console.error('Error revoking rewarded access:', error);
    }
  }
}
