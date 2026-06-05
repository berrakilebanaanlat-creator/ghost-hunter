// Basit reklam yönetim sistemi
// Native platformlarda AdMob ID'leri kullanılacak
// Web platformunda gösterilmeyecek

export const AD_UNIT_IDS = {
  APP_ID: process.env.EXPO_PUBLIC_ADMOB_APP_ID || 'ca-app-pub-2683215724092307~4306569029',
  APP_OPEN: process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_AD_UNIT_ID || 'ca-app-pub-2683215724092307/2467469553',
  BANNER: process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID || 'ca-app-pub-2683215724092307/4574758144',
  INTERSTITIAL: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID || 'ca-app-pub-2683215724092307/5341044906',
  REWARDED: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || 'ca-app-pub-2683215724092307/9838334980',
};

// Reklam gösterim sayacı
let adShowCount = 0;

export const shouldShowInterstitialAd = (): boolean => {
  // Her 5 olay kaydından sonra interstitial reklam göster
  adShowCount++;
  return adShowCount % 5 === 0;
};

export const resetAdCounter = () => {
  adShowCount = 0;
};
