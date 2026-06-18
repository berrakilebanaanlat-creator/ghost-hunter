import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAdMob,
  createAppOpenAd,
  createInterstitialAd,
  createRewardedAd,
  showAppOpenAd,
  showInterstitialAd,
  showRewardedAd,
  incrementScreenTransition,
  clearAllRetryTimers,
  cleanupAllAds,
} from './ad-manager';
import { PremiumManager, type VoxSubscription } from './premium-manager';
import { CrashReporter } from './crash-reporter';

/** Google Play Billing'den gelen yerelleştirilmiş fiyat bilgileri */
export interface VoxPrices {
  /** Aylık fiyat (ör. "₺149,99") */
  monthlyPrice: string;
  /** Yıllık fiyat (ör. "₺1.350,00") */
  yearlyPrice: string;
  /** Yıllık planın aylık karşılığı (ör. "₺112,50") */
  yearlyPerMonth: string;
}

/** Satın alma sonucu — UI'ın hata/iptal durumunu ayırt edebilmesi için */
export interface PurchaseResult {
  /** Satın alma başarılı mı */
  ok: boolean;
  /** Kullanıcı satın almayı iptal etti mi (hata mesajı gösterilmemeli) */
  cancelled?: boolean;
  /** Gerçek bir hata oluştuysa kullanıcıya gösterilecek mesaj */
  errorMessage?: string;
}

interface AdContextType {
  /** Interstitial reklam göster (premium değilse) */
  showInterstitial: () => Promise<void>;
  /** Ekran geçişi sayacını artır ve gerekirse interstitial göster */
  onScreenTransition: () => Promise<void>;
  /** Ödüllü reklam göster - true dönerse ödül kazanıldı */
  showRewarded: () => Promise<boolean>;
  /** Premium durumu */
  isPremium: boolean;
  /** VOX satın alınmış mı (abonelik aktif mi) */
  isVoxPurchased: boolean;
  /** VOX abonelik bilgisi */
  voxSubscription: VoxSubscription | null;
  /** Google Play Billing'den gelen yerelleştirilmiş fiyatlar */
  voxPrices: VoxPrices | null;
  /** Fiyatlar henüz yüklenmedi mi (ilk yükleme) */
  isPricesLoading: boolean;
  /** VOX abonelik satın al (aylık veya yıllık) */
  purchaseVoxSubscription: (period: 'monthly' | 'yearly') => Promise<PurchaseResult>;
  /** Eski tek seferlik VOX satın al (geriye uyumluluk) */
  purchaseVox: () => Promise<boolean>;
  /** Satın almaları geri yükle */
  restorePurchases: () => Promise<void>;
  /** Premium durumunu yenile */
  refreshPremiumStatus: () => Promise<void>;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isVoxPurchased, setIsVoxPurchased] = useState(false);
  const [voxSubscription, setVoxSubscription] = useState<VoxSubscription | null>(null);
  const [voxPrices, setVoxPrices] = useState<VoxPrices | null>(null);
  const [isPricesLoading, setIsPricesLoading] = useState(true);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const purchaseErrorListenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    checkStatuses();
    // Her uygulama açılışında Google Play'den abonelik durumunu doğrula
    if (Platform.OS !== 'web') {
      // ============================================================
      // KRİTİK: Purchase Updated Listener — Acknowledge işlemi burada yapılır
      // Google Play, satın alma sonrası 3 gün içinde acknowledge bekler.
      // Bu listener olmadan abonelikler otomatik iptal edilir!
      // ============================================================
      setupPurchaseListeners();

      // Uygulama açılışında pending (acknowledge edilmemiş) satın almaları kontrol et
      acknowledgePendingPurchases();

      verifySubscriptionWithStore().then(() => {
        // Doğrulama sonrası UI durumunu güncelle
        checkStatuses();
      });

      // Google Play'den yerelleştirilmiş fiyatları çek (cache fallback ile)
      loadVoxPricesWithCache().then((prices) => {
        if (prices) setVoxPrices(prices);
        setIsPricesLoading(false);
      }).catch(() => {
        setIsPricesLoading(false);
      });
      // ANR FIX: AdMob başlatmasını 3 saniye geciktir
      // Cold start sırasında UI thread'i bloklamamak için
      // Splash screen ve ilk render tamamlandıktan sonra reklam yükle
      let appOpenTimer: ReturnType<typeof setTimeout> | null = null;
      const adInitTimer = setTimeout(() => {
        initializeAdMob()
          .then(() => {
            try {
              // Önce App Open reklamı yükle ve göster
              createAppOpenAd();
              // App Open yüklendikten sonra göster (5 saniye bekle)
              appOpenTimer = setTimeout(async () => {
                try {
                  const premium = await PremiumManager.isPremium();
                  if (!premium) {
                    showAppOpenAd();
                  }
                } catch (e) {
                  console.warn('[AdContext] App Open gösterim hatası:', e);
                }
              }, 5000);
              // Diğer reklamları da hazırla
              createInterstitialAd();
              createRewardedAd();
            } catch (e) {
              console.warn('[AdContext] Reklam oluşturma hatası:', e);
            }
          })
          .catch((e) => {
            console.warn('[AdContext] AdMob başlatma hatası:', e);
            CrashReporter.recordAdError('app_open', 'init', e);
          });
      }, 3000);
      return () => {
        clearTimeout(adInitTimer);
        if (appOpenTimer) clearTimeout(appOpenTimer);
        // Purchase listener'ları temizle
        if (purchaseListenerRef.current) {
          purchaseListenerRef.current.remove();
          purchaseListenerRef.current = null;
        }
        if (purchaseErrorListenerRef.current) {
          purchaseErrorListenerRef.current.remove();
          purchaseErrorListenerRef.current = null;
        }
        // Tüm retry timer'larını ve reklam kaynaklarını temizle
        try {
          clearAllRetryTimers();
          cleanupAllAds();
        } catch {
          // Cleanup hatası uygulamayı çökertmemeli
        }
        // Google Play Billing bağlantısını kapat
        try {
          const iap = require('expo-iap');
          iap.endConnection?.();
        } catch {
          // endConnection opsiyonel, hata olursa sessizce geç
        }
      };
    }
  }, []);

  // ============================================================
  // PURCHASE LISTENER SETUP — Google Play Billing Acknowledge
  // ============================================================
  const setupPurchaseListeners = () => {
    try {
      const iap = require('expo-iap');

      // Purchase Updated Listener — HER satın alma güncellemesinde tetiklenir
      // Bu, Google Play'in acknowledge beklediği kritik noktadır
      purchaseListenerRef.current = iap.purchaseUpdatedListener(async (purchase: any) => {
        console.log('[IAP-LISTENER] Satın alma güncellendi:', purchase?.productId, 'state:', purchase?.purchaseState);

        if (!purchase) return;

        try {
          // Satın alma başarılıysa acknowledge et (finishTransaction)
          // purchaseState: 1 = PURCHASED (Android)
          const isPurchased = purchase.purchaseState === 1 || purchase.purchaseState === 'purchased';
          const isAcknowledged = purchase.isAcknowledgedAndroid === true;

          if (isPurchased && !isAcknowledged) {
            console.log('[IAP-LISTENER] Acknowledge ediliyor:', purchase.productId);
            
            // finishTransaction çağrısı — BU KRİTİK!
            // Bu çağrı Google Play'e "satın almayı aldık, onaylıyoruz" der
            await iap.finishTransaction({
              purchase: purchase,
              isConsumable: false,
            });
            
            console.log('[IAP-LISTENER] ✅ Acknowledge başarılı:', purchase.productId);

            // Abonelik durumunu güncelle
            if (purchase.productId === 'vox_monthly') {
              await PremiumManager.purchaseVoxSubscription('monthly');
            } else if (purchase.productId === 'vox_yearly') {
              await PremiumManager.purchaseVoxSubscription('yearly');
            }

            // UI durumunu güncelle
            await checkStatuses();
          } else if (isPurchased && isAcknowledged) {
            console.log('[IAP-LISTENER] Zaten acknowledge edilmiş:', purchase.productId);
            // Yine de local state'i güncelle (restore durumu için)
            if (purchase.productId === 'vox_monthly') {
              await PremiumManager.purchaseVoxSubscription('monthly');
            } else if (purchase.productId === 'vox_yearly') {
              await PremiumManager.purchaseVoxSubscription('yearly');
            }
            await checkStatuses();
          }
        } catch (error: any) {
          console.error('[IAP-LISTENER] Acknowledge hatası:', error);
          CrashReporter.recordError(
            error instanceof Error ? error : new Error(String(error)),
            'iap_acknowledge_error'
          );
        }
      });

      // Purchase Error Listener
      purchaseErrorListenerRef.current = iap.purchaseErrorListener((error: any) => {
        // Kullanıcı iptal ettiyse log'lama
        if (error?.code === 'user-cancelled' || error?.code === 'E_USER_CANCELLED') {
          console.log('[IAP-LISTENER] Kullanıcı satın almayı iptal etti');
          return;
        }
        console.warn('[IAP-LISTENER] Satın alma hatası:', error?.code, error?.message);
        CrashReporter.recordError(
          new Error(`IAP Error: ${error?.code} - ${error?.message}`),
          'iap_purchase_error'
        );
      });

      console.log('[IAP-LISTENER] ✅ Purchase listener\'lar kuruldu');
    } catch (error) {
      console.warn('[IAP-LISTENER] Listener kurulumu başarısız (dev/emulator):', error);
    }
  };

  // ============================================================
  // PENDING PURCHASES — Uygulama açılışında acknowledge edilmemiş satın almaları kontrol et
  // ============================================================
  const acknowledgePendingPurchases = async () => {
    try {
      const iap = require('expo-iap');
      await iap.initConnection();

      // Mevcut satın almaları al (pending olanlar dahil)
      const purchases = await iap.getAvailablePurchases();

      if (purchases && purchases.length > 0) {
        for (const purchase of purchases) {
          // Sadece VOX ürünlerini kontrol et
          if (purchase.productId !== 'vox_monthly' && purchase.productId !== 'vox_yearly') {
            continue;
          }

          const isPurchased = purchase.purchaseState === 1 || purchase.purchaseState === 'purchased';
          const isAcknowledged = purchase.isAcknowledgedAndroid === true;

          if (isPurchased && !isAcknowledged) {
            console.log('[IAP-PENDING] Acknowledge edilmemiş satın alma bulundu:', purchase.productId);
            
            try {
              await iap.finishTransaction({
                purchase: purchase,
                isConsumable: false,
              });
              console.log('[IAP-PENDING] ✅ Pending satın alma acknowledge edildi:', purchase.productId);

              // Abonelik durumunu güncelle
              if (purchase.productId === 'vox_monthly') {
                await PremiumManager.purchaseVoxSubscription('monthly');
              } else if (purchase.productId === 'vox_yearly') {
                await PremiumManager.purchaseVoxSubscription('yearly');
              }
            } catch (finishError: any) {
              console.error('[IAP-PENDING] finishTransaction hatası:', finishError);
              CrashReporter.recordError(
                finishError instanceof Error ? finishError : new Error(String(finishError)),
                'iap_pending_acknowledge_error'
              );
            }
          } else if (isPurchased && isAcknowledged) {
            // Acknowledge edilmiş ama local state'de olmayabilir
            if (purchase.productId === 'vox_monthly') {
              await PremiumManager.purchaseVoxSubscription('monthly');
            } else if (purchase.productId === 'vox_yearly') {
              await PremiumManager.purchaseVoxSubscription('yearly');
            }
          }
        }
        // Tüm pending işlemler sonrası UI güncelle
        await checkStatuses();
      }
    } catch (error) {
      // Dev/emulator'da IAP kullanılamaz — sessizce geç
      console.warn('[IAP-PENDING] Pending kontrol başarısız (dev/emulator):', error);
    }
  };

  const checkStatuses = async () => {
    const premium = await PremiumManager.isPremium();
    setIsPremium(premium);
    const vox = await PremiumManager.isVoxPurchased();
    setIsVoxPurchased(vox);
    const sub = await PremiumManager.getVoxSubscription();
    setVoxSubscription(sub);
  };

  const refreshPremiumStatus = useCallback(async () => {
    await checkStatuses();
  }, []);

  const handleShowInterstitial = useCallback(async () => {
    if (isPremium || Platform.OS === 'web') return;
    try {
      await showInterstitialAd();
    } catch (error) {
      console.warn('[AdContext] Interstitial gösterim hatası:', error);
      CrashReporter.recordAdError('interstitial', 'show', error);
    }
  }, [isPremium]);

  const handleScreenTransition = useCallback(async () => {
    if (isPremium || Platform.OS === 'web') return;
    try {
      const shouldShow = incrementScreenTransition();
      if (shouldShow) {
        await showInterstitialAd();
      }
    } catch (error) {
      console.warn('[AdContext] Ekran geçişi reklam hatası:', error);
      CrashReporter.recordAdError('interstitial', 'show', error);
    }
  }, [isPremium]);

  const handleShowRewarded = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      return await showRewardedAd();
    } catch (error) {
      console.warn('[AdContext] Rewarded gösterim hatası:', error);
      CrashReporter.recordAdError('rewarded', 'show', error);
      return false;
    }
  }, []);

  const handlePurchaseVoxSubscription = useCallback(async (period: 'monthly' | 'yearly'): Promise<PurchaseResult> => {
    // ============================================================
    // DEV MOCK — __DEV__ modunda mock sonuç ayarlanmışsa kullan
    // ============================================================
    if (__DEV__) {
      try {
        const { consumeMockPurchaseOutcome } = require('./mock-subscription');
        const mockOutcome = await consumeMockPurchaseOutcome();
        if (mockOutcome) {
          // Gerçek satın alma gecikmesini simüle et
          await new Promise(resolve => setTimeout(resolve, 1200));
          switch (mockOutcome) {
            case 'success_monthly':
              await PremiumManager.purchaseVoxSubscription('monthly');
              await checkStatuses();
              return { ok: true };
            case 'success_yearly':
              await PremiumManager.purchaseVoxSubscription('yearly');
              await checkStatuses();
              return { ok: true };
            case 'error':
              return { ok: false, errorMessage: 'mock-error' };
            case 'cancelled':
              return { ok: false, cancelled: true };
          }
        }
      } catch {
        // mock modülü yüklenemezse sessizce gerçek akışa geç
      }
    }

    const productId = period === 'monthly' ? 'vox_monthly' : 'vox_yearly';
    
    if (Platform.OS !== 'web') {
      let iap: any;
      try {
        iap = require('expo-iap');
      } catch {
        // IAP modülü kullanılamıyorsa (dev/emulator), AsyncStorage ile kaydet
        await PremiumManager.purchaseVoxSubscription(period);
        await checkStatuses();
        return { ok: true };
      }
      // IAP mevcut — gerçek satın alma akışını çalıştır.
      // Hata olursa kullanıcıya gösterilebilecek yapılandırılmış sonuç döner.
      const result = await purchaseVoxWithIAP(iap, productId);
      if (result.ok) {
        await PremiumManager.purchaseVoxSubscription(period);
        await checkStatuses();
      }
      return result;
    }
    // Web'de doğrudan aç (test amaçlı)
    await PremiumManager.purchaseVoxSubscription(period);
    await checkStatuses();
    return { ok: true };
  }, []);

  /** Eski tek seferlik satın alma (geriye uyumluluk) */
  const handlePurchaseVox = useCallback(async (): Promise<boolean> => {
    // Aylık abonelik olarak yönlendir
    const result = await handlePurchaseVoxSubscription('monthly');
    return result.ok;
  }, [handlePurchaseVoxSubscription]);

  const handleRestorePurchases = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        const iap = require('expo-iap');
        await restorePurchasesWithIAP(iap);
      } catch {
        // IAP kullanılamıyorsa sessizce geç
      }
      // Geri yüklemeden sonra pending acknowledge kontrol et
      await acknowledgePendingPurchases();
      // Doğrulama yap
      await verifySubscriptionWithStore();
    }
    await checkStatuses();
  }, []);

  return (
    <AdContext.Provider
      value={{
        showInterstitial: handleShowInterstitial,
        onScreenTransition: handleScreenTransition,
        showRewarded: handleShowRewarded,
        isPremium,
        isVoxPurchased,
        voxSubscription,
        voxPrices,
        isPricesLoading,
        purchaseVoxSubscription: handlePurchaseVoxSubscription,
        purchaseVox: handlePurchaseVox,
        restorePurchases: handleRestorePurchases,
        refreshPremiumStatus,
      }}
    >
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within AdProvider');
  }
  return context;
}

// ============================================================
// ABONELİK DOĞRULAMA - Google Play'den gerçek zamanlı kontrol
// İade edilen abonelikleri tespit eder ve erişimi kapatır
// ============================================================

async function verifySubscriptionWithStore(): Promise<void> {
  try {
    const iap = require('expo-iap');
    await iap.initConnection();

    // Google Play'den aktif abonelikleri sorgula
    const hasActive = await iap.hasActiveSubscriptions(['vox_monthly', 'vox_yearly']);

    if (hasActive) {
      // Aktif abonelik var - hangi plan olduğunu belirle
      const activeSubs = await iap.getActiveSubscriptions(['vox_monthly', 'vox_yearly']);
      if (activeSubs && activeSubs.length > 0) {
        const activeSub = activeSubs[0];
        const period = activeSub.productId === 'vox_yearly' ? 'yearly' : 'monthly';
        // AsyncStorage'ı güncelle (aktif olarak işaretle)
        await PremiumManager.purchaseVoxSubscription(period);
        console.log('[IAP-VERIFY] Abonelik aktif:', activeSub.productId);
      }
    } else {
      // Google Play'de aktif abonelik YOK - iade edilmiş veya iptal edilmiş
      // AsyncStorage'daki aboneliği sıfırla
      const currentSub = await PremiumManager.getVoxSubscription();
      if (currentSub && currentSub.isActive) {
        console.log('[IAP-VERIFY] Abonelik Google Play\'de aktif değil - erişim kapatılıyor');
        await PremiumManager.resetVoxPurchase();
      }
    }
  } catch (error: any) {
    // Bağlantı hatası veya IAP kullanılamıyorsa (emulator/dev)
    // Mevcut durumu koru, kullanıcıyı cezalandırma
    console.warn('[IAP-VERIFY] Doğrulama yapılamadı (bağlantı hatası):', error?.message);
  }
}

// ============================================================
// IAP YARDIMCI FONKSİYONLARI (expo-iap v3.4.10+ API)
// ============================================================

async function purchaseVoxWithIAP(iap: any, productId: string): Promise<PurchaseResult> {
  console.log('[IAP-FLOW] Satın alma başlatıldı:', productId);

  // Ürün kimliği boş kontrolü
  if (!productId) {
    CrashReporter.recordError(new Error('IAP: productId boş — satın alma başlatılamaz'), 'iap_empty_product_id');
    return { ok: false, errorMessage: 'Ürün tanımlanamadı. Lütfen uygulamayı yeniden başlatıp tekrar deneyin.' };
  }

  try {
    await iap.initConnection();

    // ============================================================
    // ABONELİK YÜKSELTME TESPİTİ (aylık → yıllık)
    // oldPurchaseToken olmadan Google Play E_ALREADY_OWNED döner
    // ============================================================
    let oldPurchaseToken: string | undefined;
    let oldProductId: string | undefined;
    if (Platform.OS === 'android') {
      try {
        const existingPurchases = await iap.getAvailablePurchases();
        if (existingPurchases && existingPurchases.length > 0) {
          for (const p of existingPurchases) {
            const pid = p?.productId;
            if ((pid === 'vox_monthly' || pid === 'vox_yearly') && pid !== productId) {
              oldPurchaseToken = p?.purchaseToken ?? p?.purchaseTokenAndroid;
              oldProductId = pid;
              break;
            }
          }
        }
      } catch (e: any) {
        // [IAP-SILENT] Mevcut abonelik tespiti başarısız — sessizce devam
        console.warn('[IAP-SILENT] getAvailablePurchases hatası:', e?.code, e?.message);
        CrashReporter.recordError(
          e instanceof Error ? e : new Error(String(e?.message ?? e)),
          'iap_get_available_purchases_error'
        );
      }
    }

    const products = await iap.fetchProducts({ skus: [productId], type: 'subs' });

    if (!products || products.length === 0) {
      console.warn('[IAP-SILENT] Ürün bulunamadı:', productId);
      CrashReporter.recordError(new Error(`IAP: fetchProducts boş döndü — ${productId}`), 'iap_product_not_found');
      return { ok: false, errorMessage: 'Ürün bulunamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' };
    }

    const product = products[0];

    let offerToken: string | undefined;
    if (Platform.OS === 'android') {
      if (product.subscriptionOffers && product.subscriptionOffers.length > 0) {
        offerToken = product.subscriptionOffers[0].offerTokenAndroid;
      } else if (product.subscriptionOfferDetailsAndroid && product.subscriptionOfferDetailsAndroid.length > 0) {
        offerToken = product.subscriptionOfferDetailsAndroid[0].offerToken;
      }
    }

    const googleRequest: any = {
      skus: [productId],
      ...(offerToken ? { subscriptionOffers: [{ sku: productId, offerToken }] } : {}),
    };

    // Abonelik yükseltme: IMMEDIATE_WITH_TIME_PRORATION
    // expo-iap karşılığı: replacementMode: 'with-time-proration'
    if (oldPurchaseToken && oldProductId) {
      googleRequest.purchaseToken = oldPurchaseToken;
      googleRequest.subscriptionProductReplacementParams = {
        oldProductId,
        replacementMode: 'with-time-proration',
      };
      console.log('[IAP-FLOW] Abonelik yükseltme:', oldProductId, '→', productId);
    }

    const purchaseResult = await iap.requestPurchase({
      request: { apple: { sku: productId }, google: googleRequest },
      type: 'subs',
    });

    if (purchaseResult) {
      // finishTransaction — çift güvenlik (asıl işlem purchaseUpdatedListener'da)
      try {
        if (!purchaseResult.isAcknowledgedAndroid) {
          await iap.finishTransaction({ purchase: purchaseResult, isConsumable: false });
          console.log('[IAP-FLOW] ✅ finishTransaction başarılı:', productId);
        }
      } catch (finishError: any) {
        // [IAP-SILENT] Listener zaten halleder — sessizce logla
        console.warn('[IAP-SILENT] finishTransaction hatası:', finishError?.code, finishError?.message);
        CrashReporter.recordError(
          finishError instanceof Error ? finishError : new Error(String(finishError?.message ?? finishError)),
          'iap_finish_transaction_error'
        );
      }
      return { ok: true };
    }

    return { ok: false, errorMessage: 'Satın alma tamamlanamadı. Lütfen tekrar deneyin.' };

  } catch (error: any) {
    const code: string = error?.code ?? '';

    // Kullanıcı iptal — sessizce çık, hata gösterme
    if (code === 'user-cancelled' || code === 'E_USER_CANCELLED') {
      console.log('[IAP-FLOW] Kullanıcı satın almayı iptal etti');
      return { ok: false, cancelled: true };
    }

    // [IAP-SILENT] Tüm hatalar CrashReporter'a iletilir, uygulama donmaz
    console.warn('[IAP-SILENT] Satın alma hatası — kod:', code, 'mesaj:', error?.message);
    CrashReporter.recordError(
      error instanceof Error ? error : new Error(`IAP Error: ${code} — ${error?.message ?? String(error)}`),
      'iap_purchase_error'
    );

    let turkishMessage: string;
    if (code === 'E_ALREADY_OWNED') {
      turkishMessage = 'Bu aboneliğe zaten sahipsiniz. Satın almalarınızı geri yüklemek için "Geri Yükle" butonunu kullanın.';
    } else if (code === 'E_ITEM_UNAVAILABLE') {
      turkishMessage = 'Ürün şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    } else if (code === 'E_NETWORK_ERROR') {
      turkishMessage = 'İnternet bağlantısı hatası. Bağlantınızı kontrol edip tekrar deneyin.';
    } else if (code === 'E_SERVICE_ERROR') {
      turkishMessage = 'Google Play hizmeti geçici olarak kullanılamıyor. Lütfen biraz bekleyip tekrar deneyin.';
    } else if (code === 'payment-pending' || code === 'E_PAYMENT_PENDING') {
      turkishMessage = 'Ödemeniz onay bekliyor. Tamamlandığında aboneliğiniz otomatik aktif olacak.';
    } else if (code === 'E_BILLING_RESPONSE_JSON_PARSE_ERROR') {
      turkishMessage = 'Google Play\'den beklenmedik bir yanıt alındı. Lütfen tekrar deneyin.';
    } else {
      turkishMessage = 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin.';
    }

    return { ok: false, errorMessage: turkishMessage };
  }
}

async function restorePurchasesWithIAP(iap: any): Promise<void> {
  try {
    await iap.initConnection();
    
    // Yeni API: restorePurchases + getAvailablePurchases
    await iap.restorePurchases();
    const purchases = await iap.getAvailablePurchases();
    
    if (purchases) {
      for (const purchase of purchases) {
        if (purchase.productId === 'vox_monthly' || purchase.productId === 'vox_yearly') {
          // Acknowledge edilmemiş satın almaları acknowledge et
          const isAcknowledged = purchase.isAcknowledgedAndroid === true;
          if (!isAcknowledged) {
            try {
              await iap.finishTransaction({
                purchase: purchase,
                isConsumable: false,
              });
              console.log('[IAP-RESTORE] ✅ Pending satın alma acknowledge edildi:', purchase.productId);
            } catch (finishError) {
              console.warn('[IAP-RESTORE] finishTransaction hatası:', finishError);
            }
          }

          // Local state güncelle
          if (purchase.productId === 'vox_monthly') {
            await PremiumManager.purchaseVoxSubscription('monthly');
          } else if (purchase.productId === 'vox_yearly') {
            await PremiumManager.purchaseVoxSubscription('yearly');
          }
        }
      }
    }

    // Aktif abonelikleri de kontrol et
    try {
      const hasActive = await iap.hasActiveSubscriptions(['vox_monthly', 'vox_yearly']);
      if (hasActive) {
        const activeSubs = await iap.getActiveSubscriptions(['vox_monthly', 'vox_yearly']);
        if (activeSubs && activeSubs.length > 0) {
          for (const sub of activeSubs) {
            if (sub.productId === 'vox_monthly') {
              await PremiumManager.purchaseVoxSubscription('monthly');
            } else if (sub.productId === 'vox_yearly') {
              await PremiumManager.purchaseVoxSubscription('yearly');
            }
          }
        }
      }
    } catch {
      // getActiveSubscriptions desteklenmiyorsa sessizce geç
    }
  } catch (error) {
    console.warn('[IAP] Geri yükleme hatası:', error);
  }
}

// ============================================================
// FIYAT BİLGİLERİ — Google Play Billing'den yerelleştirilmiş fiyat çekme
// Google Play politikası: Uygulama içinde gösterilen fiyatlar,
// Google Play Billing API'den alınan localizedPrice ile eşleşmelidir.
// ============================================================

// ============================================================
// CACHE KEY — AsyncStorage'da fiyat önbelleği için anahtar
// ============================================================
const VOX_PRICES_CACHE_KEY = '@vox_prices_cache';
const VOX_PRICES_CACHE_TIMESTAMP_KEY = '@vox_prices_cache_ts';
// Cache geçerlilik süresi: 24 saat (milisaniye)
const VOX_PRICES_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Fiyatları AsyncStorage'a kaydet.
 * Başarılı bir Google Play Billing yanıtından sonra çağrılır.
 */
async function cacheVoxPrices(prices: VoxPrices): Promise<void> {
  try {
    await AsyncStorage.setItem(VOX_PRICES_CACHE_KEY, JSON.stringify(prices));
    await AsyncStorage.setItem(VOX_PRICES_CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log('[IAP-CACHE] Fiyatlar önbelleğe kaydedildi');
  } catch (error) {
    console.warn('[IAP-CACHE] Fiyat önbelleğe kaydetme hatası:', error);
  }
}

/**
 * AsyncStorage'dan önbelleklenmiş fiyatları yükle.
 * Cache TTL süresi dolmuşsa null döner (isteğe bağlı olarak yine de kullanılabilir).
 */
async function getCachedVoxPrices(ignoreTTL = false): Promise<VoxPrices | null> {
  try {
    const cached = await AsyncStorage.getItem(VOX_PRICES_CACHE_KEY);
    if (!cached) return null;

    // TTL kontrolü
    if (!ignoreTTL) {
      const tsStr = await AsyncStorage.getItem(VOX_PRICES_CACHE_TIMESTAMP_KEY);
      if (tsStr) {
        const ts = parseInt(tsStr, 10);
        if (Date.now() - ts > VOX_PRICES_CACHE_TTL) {
          console.log('[IAP-CACHE] Önbellek süresi dolmuş (24 saat), yenilenecek');
          return null;
        }
      }
    }

    const prices: VoxPrices = JSON.parse(cached);
    // Geçerlilik kontrolü: en azından monthlyPrice veya yearlyPrice dolu olmalı
    if (prices.monthlyPrice || prices.yearlyPrice) {
      console.log('[IAP-CACHE] Önbellekten fiyatlar yüklendi:', prices);
      return prices;
    }
    return null;
  } catch (error) {
    console.warn('[IAP-CACHE] Önbellek okuma hatası:', error);
    return null;
  }
}

/**
 * Ana fiyat yükleme fonksiyonu: Önce Google Play'den çek, başarısızsa cache'den yükle.
 * 
 * Strateji:
 * 1. Google Play Billing API'den fiyatları çek
 * 2. Başarılıysa → cache'e kaydet ve dön
 * 3. Başarısızsa → cache'den yükle (TTL'i görmezden gel, çünkü eski fiyat > fiyat yok)
 */
async function loadVoxPricesWithCache(): Promise<VoxPrices | null> {
  // Önce Google Play'den güncel fiyatları çekmeyi dene
  const freshPrices = await fetchVoxPricesFromStore();
  
  if (freshPrices && (freshPrices.monthlyPrice || freshPrices.yearlyPrice)) {
    // Başarılı: cache'e kaydet ve dön
    await cacheVoxPrices(freshPrices);
    return freshPrices;
  }

  // Google Play yanıt vermedi — cache'den yükle (TTL görmezden gel)
  console.log('[IAP-CACHE] Google Play yanıt vermedi, önbellekten yükleniyor...');
  const cachedPrices = await getCachedVoxPrices(true);
  
  if (cachedPrices) {
    console.log('[IAP-CACHE] ✅ Önbellekten fiyatlar kullanılıyor (fallback)');
    return cachedPrices;
  }

  console.warn('[IAP-CACHE] ⚠️ Hem Google Play hem önbellek boş — fiyat gösterilemeyecek');
  return null;
}

async function fetchVoxPricesFromStore(): Promise<VoxPrices | null> {
  try {
    const iap = require('expo-iap');
    await iap.initConnection();

    // Her iki abonelik ürününü de çek
    const products = await iap.fetchProducts({
      skus: ['vox_monthly', 'vox_yearly'],
      type: 'subs',
    });

    if (!products || products.length === 0) {
      console.warn('[IAP-PRICES] Abonelik ürünleri bulunamadı');
      return null;
    }

    let monthlyPrice = '';
    let yearlyPrice = '';
    let yearlyPriceNumeric = 0;

    for (const product of products) {
      // displayPrice: ürün seviyesinde yerelleştirilmiş fiyat (ör. "₺149,99")
      // subscriptionOffers[0].displayPrice: teklif seviyesinde fiyat
      let price = '';
      let priceNumeric = 0;

      // Önce subscriptionOffers'dan al (daha doğru)
      if (product.subscriptionOffers && product.subscriptionOffers.length > 0) {
        const offer = product.subscriptionOffers[0];
        price = offer.displayPrice || '';
        priceNumeric = offer.price || 0;

        // Android'de pricingPhases'dan da alınabilir
        if (!price && offer.pricingPhasesAndroid?.pricingPhaseList?.length > 0) {
          const phase = offer.pricingPhasesAndroid.pricingPhaseList[
            offer.pricingPhasesAndroid.pricingPhaseList.length - 1
          ];
          price = phase.formattedPrice || '';
          priceNumeric = parseInt(phase.priceAmountMicros || '0', 10) / 1000000;
        }
      }
      // Fallback: eski API subscriptionOfferDetailsAndroid
      else if (product.subscriptionOfferDetailsAndroid && product.subscriptionOfferDetailsAndroid.length > 0) {
        const offerDetail = product.subscriptionOfferDetailsAndroid[0];
        if (offerDetail.pricingPhases?.pricingPhaseList?.length > 0) {
          const phase = offerDetail.pricingPhases.pricingPhaseList[
            offerDetail.pricingPhases.pricingPhaseList.length - 1
          ];
          price = phase.formattedPrice || '';
          priceNumeric = parseInt(phase.priceAmountMicros || '0', 10) / 1000000;
        }
      }
      // Son fallback: product.displayPrice
      if (!price && product.displayPrice) {
        price = product.displayPrice;
        priceNumeric = product.price || 0;
      }

      if (product.id === 'vox_monthly') {
        monthlyPrice = price;
      } else if (product.id === 'vox_yearly') {
        yearlyPrice = price;
        yearlyPriceNumeric = priceNumeric;
      }
    }

    // Yıllık planın aylık karşılığını hesapla
    let yearlyPerMonth = '';
    if (yearlyPriceNumeric > 0) {
      const perMonth = yearlyPriceNumeric / 12;
      // Para birimi sembolünü yearlyPrice'dan çıkar
      const currencyMatch = yearlyPrice.match(/^([^\d]*)/);
      const currencyPrefix = currencyMatch ? currencyMatch[1] : '';
      const currencySuffix = yearlyPrice.match(/([^\d.,]*$)/)?.[0] || '';
      
      // Formatla: virgül veya nokta ayracı kullanarak
      if (yearlyPrice.includes(',') && yearlyPrice.includes('.')) {
        // Türk formatı: 1.350,00
        yearlyPerMonth = currencyPrefix + perMonth.toFixed(2).replace('.', ',') + currencySuffix;
      } else if (yearlyPrice.includes(',')) {
        // Virgüllü format
        yearlyPerMonth = currencyPrefix + perMonth.toFixed(2).replace('.', ',') + currencySuffix;
      } else {
        // Standart format
        yearlyPerMonth = currencyPrefix + perMonth.toFixed(2) + currencySuffix;
      }
    }

    console.log('[IAP-PRICES] Fiyatlar alındı:', { monthlyPrice, yearlyPrice, yearlyPerMonth });

    return {
      monthlyPrice: monthlyPrice || '',
      yearlyPrice: yearlyPrice || '',
      yearlyPerMonth: yearlyPerMonth || '',
    };
  } catch (error) {
    console.warn('[IAP-PRICES] Fiyat bilgileri alınamadı (dev/emulator):', error);
    return null;
  }
}
