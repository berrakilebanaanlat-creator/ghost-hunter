/**
 * AdContext - WEB PLATFORM
 * Web'de reklamlar gösterilmez, VOX satın alma AsyncStorage ile simüle edilir
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PremiumManager, type VoxSubscription } from './premium-manager';
import type { VoxPrices, PurchaseResult } from './ad-context';

interface AdContextType {
  showInterstitial: () => Promise<void>;
  onScreenTransition: () => Promise<void>;
  showRewarded: () => Promise<boolean>;
  isPremium: boolean;
  isVoxPurchased: boolean;
  voxSubscription: VoxSubscription | null;
  voxPrices: VoxPrices | null;
  isPricesLoading: boolean;
  purchaseVoxSubscription: (period: 'monthly' | 'yearly') => Promise<PurchaseResult>;
  purchaseVox: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isVoxPurchased, setIsVoxPurchased] = useState(false);
  const [voxSubscription, setVoxSubscription] = useState<VoxSubscription | null>(null);

  useEffect(() => {
    checkStatuses();
  }, []);

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

  // Web'de tüm reklam fonksiyonları no-op
  const handleShowInterstitial = useCallback(async () => {}, []);
  const handleScreenTransition = useCallback(async () => {}, []);
  const handleShowRewarded = useCallback(async (): Promise<boolean> => false, []);

  const handlePurchaseVoxSubscription = useCallback(async (period: 'monthly' | 'yearly'): Promise<PurchaseResult> => {
    await PremiumManager.purchaseVoxSubscription(period);
    await checkStatuses();
    return { ok: true };
  }, []);

  const handlePurchaseVox = useCallback(async (): Promise<boolean> => {
    await PremiumManager.purchaseVox();
    setIsVoxPurchased(true);
    return true;
  }, []);

  const handleRestorePurchases = useCallback(async () => {
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
        voxPrices: null,
        isPricesLoading: false,
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
