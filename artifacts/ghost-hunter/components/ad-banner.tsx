/**
 * AdBanner - Ekranların alt kısmında gösterilen banner reklam
 * Web platformunda gösterilmez - native modüller web'de import edilmez
 * Premium kullanıcılara gösterilmez
 * 
 * HATA YÖNETİMİ:
 * - ErrorBoundary ile sarılıdır, banner hatası uygulamayı çökertmez
 * - Yükleme hatası durumunda exponential backoff ile retry
 * - Maks 3 ardışık hata sonrası banner gizlenir (boş alan bırakmaz)
 * - Native modül import hatası sessizce yakalanır
 */
import React, { Component, useState, useCallback, useRef, useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useAds } from '@/lib/ad-context';
import { CrashReporter } from '@/lib/crash-reporter';

interface AdBannerProps {
  /** Banner boyutu - varsayılan: ANCHORED_ADAPTIVE_BANNER */
  size?: 'banner' | 'large' | 'medium' | 'full' | 'adaptive';
}

// ============================================================
// ERROR BOUNDARY - Banner çökmesini yakalar
// ============================================================

interface ErrorBoundaryState {
  hasError: boolean;
}

class BannerErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[AdBanner] ErrorBoundary yakaladı:', error?.message || error);
    CrashReporter.recordAdError('banner', 'show', error, {
      errorCode: 'ERROR_BOUNDARY',
    });
  }

  render() {
    if (this.state.hasError) {
      // Banner çöktüyse boş alan gösterme
      return null;
    }
    return this.props.children;
  }
}

// ============================================================
// ANA BANNER BİLEŞENİ
// ============================================================

export function AdBanner({ size = 'adaptive' }: AdBannerProps) {
  const { isPremium } = useAds();

  // Premium kullanıcılara veya web'de reklam gösterme
  if (isPremium || Platform.OS === 'web') {
    return null;
  }

  // ErrorBoundary ile sar
  return (
    <BannerErrorBoundary>
      <NativeBannerWithRetry size={size} />
    </BannerErrorBoundary>
  );
}

// ============================================================
// NATIVE BANNER - Retry ve hata yönetimi ile
// ============================================================

const MAX_BANNER_ERRORS = 3;
const BANNER_RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

function NativeBannerWithRetry({ size }: { size: string }) {
  const [errorCount, setErrorCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleAdError = useCallback((error: any) => {
    console.warn('[AdBanner] Yükleme hatası:', error?.message || error);

    setErrorCount((prev) => {
      const newCount = prev + 1;

      CrashReporter.recordAdError('banner', 'load', error, {
        retryCount: newCount,
        errorCode: error?.code,
        errorDomain: error?.domain,
      });

      if (newCount >= MAX_BANNER_ERRORS) {
        // Maks hata aşıldı, banner'ı gizle
        console.log('[AdBanner] Maks hata aşıldı, banner gizleniyor');
        CrashReporter.log(`Banner ${MAX_BANNER_ERRORS} hata sonrası gizlendi`);
        setIsVisible(false);
        return newCount;
      }

      // Exponential backoff ile retry
      const delay = BANNER_RETRY_DELAYS[Math.min(newCount - 1, BANNER_RETRY_DELAYS.length - 1)];
      console.log(`[AdBanner] Retry #${newCount} — ${delay / 1000}s sonra`);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      retryTimerRef.current = setTimeout(() => {
        setRetryKey((k) => k + 1);
      }, delay);

      return newCount;
    });
  }, []);

  const handleAdLoaded = useCallback(() => {
    // Başarılı yükleme, hata sayacını sıfırla
    setErrorCount(0);
  }, []);

  // Maks hata sonrası gizle
  if (!isVisible) {
    return null;
  }

  return <NativeBanner size={size} retryKey={retryKey} onError={handleAdError} onLoaded={handleAdLoaded} />;
}

// ============================================================
// NATIVE BANNER RENDER - Güvenli import ve render
// ============================================================

interface NativeBannerInnerProps {
  size: string;
  retryKey: number;
  onError: (error: any) => void;
  onLoaded: () => void;
}

function NativeBanner({ size, retryKey, onError, onLoaded }: NativeBannerInnerProps) {
  try {
    const ads = require('react-native-google-mobile-ads');
    const { getBannerAdUnitId } = require('@/lib/ad-manager');

    if (!ads?.BannerAd || !ads?.BannerAdSize) {
      console.warn('[AdBanner] BannerAd veya BannerAdSize bulunamadı');
      return null;
    }

    const BannerAd = ads.BannerAd;
    const BannerAdSize = ads.BannerAdSize;

    let adSize: string;
    try {
      adSize = size === 'adaptive'
        ? BannerAdSize.ANCHORED_ADAPTIVE_BANNER
        : size === 'large'
          ? BannerAdSize.LARGE_BANNER
          : size === 'medium'
            ? BannerAdSize.MEDIUM_RECTANGLE
            : size === 'full'
              ? BannerAdSize.FULL_BANNER
              : BannerAdSize.BANNER;
    } catch {
      adSize = BannerAdSize?.BANNER || 'BANNER';
    }

    let adUnitId: string;
    try {
      adUnitId = getBannerAdUnitId();
    } catch {
      console.warn('[AdBanner] Banner ad unit ID alınamadı');
      return null;
    }

    return (
      <View style={styles.container} key={`banner-${retryKey}`}>
        <BannerAd
          unitId={adUnitId}
          size={adSize}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={onLoaded}
          onAdFailedToLoad={onError}
        />
      </View>
    );
  } catch (error) {
    console.warn('[AdBanner] Native banner render hatası:', error);
    CrashReporter.recordAdError('banner', 'create', error);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
