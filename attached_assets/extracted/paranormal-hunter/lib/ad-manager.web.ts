/**
 * AdMob Reklam Yönetim Sistemi - WEB PLATFORM
 * Web'de reklamlar gösterilmez, tüm fonksiyonlar no-op
 */

export const AD_UNIT_IDS = {
  APP_ID: 'ca-app-pub-2683215724092307~4306569029',
  APP_OPEN: 'ca-app-pub-2683215724092307/2467469553',
  BANNER: 'ca-app-pub-2683215724092307/4574758144',
  INTERSTITIAL: 'ca-app-pub-2683215724092307/5341044906',
  REWARDED: 'ca-app-pub-2683215724092307/9838334980',
  TEST_APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  TEST_BANNER: 'ca-app-pub-3940256099942544/9214589741',
  TEST_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  TEST_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

export function getAppOpenAdUnitId(): string { return AD_UNIT_IDS.TEST_APP_OPEN; }
export function getBannerAdUnitId(): string { return AD_UNIT_IDS.TEST_BANNER; }
export function getInterstitialAdUnitId(): string { return AD_UNIT_IDS.TEST_INTERSTITIAL; }
export function getRewardedAdUnitId(): string { return AD_UNIT_IDS.TEST_REWARDED; }

let screenTransitionCount = 0;
const INTERSTITIAL_FREQUENCY = 4;

export function incrementScreenTransition(): boolean {
  screenTransitionCount++;
  return screenTransitionCount % INTERSTITIAL_FREQUENCY === 0;
}

export function resetAdCounter(): void { screenTransitionCount = 0; }

// Web'de tüm AdMob fonksiyonları no-op
export async function initializeAdMob(): Promise<void> {}
export function createAppOpenAd(): void {}
export async function showAppOpenAd(): Promise<boolean> { return false; }
export function createInterstitialAd(): void {}
export async function showInterstitialAd(): Promise<boolean> { return false; }
export function createRewardedAd(): void {}
export async function showRewardedAd(): Promise<boolean> { return false; }
export function isAppOpenReady(): boolean { return false; }
export function isInterstitialReady(): boolean { return false; }
export function isRewardedReady(): boolean { return false; }
export function isAdMobInitialized(): boolean { return false; }
