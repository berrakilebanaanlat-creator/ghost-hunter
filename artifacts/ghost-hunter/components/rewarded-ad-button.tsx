/**
 * Ödüllü Reklam Butonu - Premium özelliklere geçici erişim
 * Reklam izledikten sonra 10 dakika erişim verir
 * 
 * HATA YÖNETİMİ:
 * - Reklam yüklenemezse kullanıcıya bilgi mesajı gösterir
 * - Timeout koruması: 15 saniye içinde yüklenemezse hata mesajı
 * - Ardışık hata durumunda cooldown ile buton devre dışı
 * - Tüm async işlemler try-catch ile sarılıdır
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAds } from '@/lib/ad-context';
import { RewardedAdManager } from '@/lib/premium-manager';
import { CrashReporter } from '@/lib/crash-reporter';
import * as Haptics from 'expo-haptics';

interface RewardedAdButtonProps {
  feature: 'sls_camera' | 'spirit_box' | 'evidence_wall';
  onRewardEarned?: () => void;
  label?: string;
}

const MAX_CONSECUTIVE_ERRORS = 3;
const ERROR_COOLDOWN = 60000; // 1 dakika

export function RewardedAdButton({ feature, onRewardEarned, label }: RewardedAdButtonProps) {
  const { showRewarded } = useAds();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const mountedRef = useRef(true);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  // Erişim durumunu kontrol et
  useEffect(() => {
    checkAccess();
    const interval = setInterval(checkAccess, 1000);
    return () => clearInterval(interval);
  }, [feature]);

  const checkAccess = useCallback(async () => {
    try {
      const hasIt = await RewardedAdManager.hasRewardedAccess(feature);
      if (!mountedRef.current) return;
      setHasAccess(hasIt);
      if (hasIt) {
        const timeRemaining = await RewardedAdManager.getRewardedAccessTimeLeft(feature);
        if (mountedRef.current) setTimeLeft(timeRemaining);
      } else {
        if (mountedRef.current) setTimeLeft(0);
      }
    } catch (error) {
      console.warn('[RewardedAdButton] Erişim kontrolü hatası:', error);
      // Hata durumunda mevcut durumu koru
    }
  }, [feature]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setErrorMessage(null);
    }
  }, []);

  const showError = useCallback((message: string, duration: number = 5000) => {
    if (!mountedRef.current) return;
    setErrorMessage(message);

    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(clearError, duration);
  }, [clearError]);

  const handleWatchAd = async () => {
    // Cooldown kontrolü
    const now = Date.now();
    if (cooldownUntil > now) {
      const remaining = Math.ceil((cooldownUntil - now) / 1000);
      showError(`Lütfen ${remaining} saniye bekleyin`, 3000);
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics hatası uygulamayı çökertmemeli
      }
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const rewardEarned = await showRewarded();

      if (!mountedRef.current) return;

      if (rewardEarned) {
        // Ödül kazanıldı - geçici erişim ver
        try {
          await RewardedAdManager.grantRewardedAccess(feature);
        } catch (grantError) {
          console.warn('[RewardedAdButton] Erişim verme hatası:', grantError);
          showError('Erişim kaydedilemedi, lütfen tekrar deneyin');
          return;
        }

        await checkAccess();
        setErrorCount(0);

        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // Haptics hatası uygulamayı çökertmemeli
          }
        }
        onRewardEarned?.();
      } else {
        // Reklam izlenmedi veya yüklenemedi
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);

        if (newErrorCount >= MAX_CONSECUTIVE_ERRORS) {
          // Çok fazla hata, cooldown başlat
          setCooldownUntil(Date.now() + ERROR_COOLDOWN);
          setErrorCount(0);
          showError('Reklam şu anda kullanılamıyor, 1 dakika sonra tekrar deneyin', 8000);
        } else {
          CrashReporter.recordAdError('rewarded', 'show', new Error('Reklam izlenmedi veya yüklenemedi'), {
            retryCount: newErrorCount,
            cooldownActive: newErrorCount >= MAX_CONSECUTIVE_ERRORS,
          });
          showError('Reklam yüklenemedi, lütfen tekrar deneyin');
        }
      }
    } catch (error) {
      console.warn('[RewardedAdButton] Reklam gösterme hatası:', error);
      CrashReporter.recordAdError('rewarded', 'show', error, {
        errorCode: 'BUTTON_SHOW_ERROR',
      });
      if (mountedRef.current) {
        showError('Bir hata oluştu, lütfen tekrar deneyin');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  if (hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.activeContainer}>
          <View style={styles.activeContent}>
            <IconSymbol size={18} name="star.fill" color="#FFD700" />
            <View style={styles.activeText}>
              <Text style={styles.activeTitle}>Erişim Aktif</Text>
              <Text style={styles.activeTime}>{formatTime(timeLeft)} kaldı</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const isCoolingDown = cooldownUntil > Date.now();
  const isDisabled = loading || isCoolingDown;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleWatchAd}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          pressed && !isDisabled && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          isDisabled && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <IconSymbol size={16} name="play.fill" color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isCoolingDown
                ? 'Lütfen bekleyin...'
                : label || 'Reklam İzle - 10 Dakika Erişim'}
            </Text>
          </>
        )}
      </Pressable>

      {/* Hata mesajı */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <IconSymbol size={12} name="exclamationmark.triangle.fill" color="#F87171" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <Text style={styles.disclaimer}>
          Reklam izledikten sonra 10 dakika boyunca erişebilirsiniz
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#9B4FDE',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  activeContainer: {
    backgroundColor: '#FFD70010',
    borderWidth: 1,
    borderColor: '#FFD70030',
    borderRadius: 10,
    padding: 10,
  },
  activeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeText: {
    flex: 1,
    gap: 2,
  },
  activeTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTime: {
    color: '#8A8AA0',
    fontSize: 11,
  },
  disclaimer: {
    fontSize: 10,
    color: '#3A3A50',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  errorText: {
    fontSize: 10,
    color: '#F87171',
    textAlign: 'center',
  },
});
