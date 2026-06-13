/**
 * VOX Paywall - VOX abonelik kilit ekranı
 * VOX'a erişim için aylık veya yıllık abonelik gerektirir
 * Fiyatlar Google Play Billing API'den dinamik olarak alınır
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PriceShimmerLarge, PriceShimmerSmall } from '@/components/price-shimmer';
import { useAds } from '@/lib/ad-context';
import * as Haptics from 'expo-haptics';
import { t } from '@/lib/i18n';

type PlanPeriod = 'monthly' | 'yearly';

export function VoxPaywall() {
  const { purchaseVoxSubscription, restorePurchases, voxPrices } = useAds();
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>('yearly');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoading(true);
    try {
      const result = await purchaseVoxSubscription(selectedPlan);
      if (result.ok) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (!result.cancelled) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(t('common.error'), t('premium.purchaseError'));
      }
    } catch (error) {
      console.warn('[VoxPaywall] Abonelik hatası:', error);
      Alert.alert(t('common.error'), t('premium.purchaseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setRestoring(false);
    }
  };

  const handleSelectPlan = (plan: PlanPeriod) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(plan);
  };

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Üst kısım - Kilit ikonu ve başlık */}
          <View style={styles.topSection}>
            <View style={styles.lockIconContainer}>
              <View style={styles.lockIconOuter}>
                <View style={styles.lockIconInner}>
                  <IconSymbol size={40} name="waveform" color="#9B4FDE" />
                </View>
              </View>
              <View style={styles.lockBadge}>
                <IconSymbol size={14} name="star.fill" color="#FFD700" />
              </View>
            </View>

            <Text style={styles.title}>VOX</Text>
            <Text style={styles.subtitle}>{t("paywall.subtitle").toUpperCase()}</Text>
            <Text style={styles.description}>
              {t("paywall.subtitle")}
            </Text>
          </View>

          {/* Özellikler */}
          <View style={styles.featuresContainer}>
            <FeatureItem icon="waveform" text={t("paywall.feature1")} />
            <FeatureItem icon="waveform" text={t("paywall.feature2")} />
            <FeatureItem icon="waveform" text={t("paywall.feature3")} />
            <FeatureItem icon="waveform" text={t("paywall.feature4")} />
            <FeatureItem icon="waveform" text={t("vox.whiteNoise")} />
            <FeatureItem icon="waveform" text={t("paywall.feature5")} />
          </View>

          {/* Abonelik Planları */}
          <View style={styles.plansSection}>
           <Text style={styles.plansTitle}>{t("paywall.subscribe").toUpperCase()}</Text>

            {/* Yıllık Plan */}
            <Pressable
              onPress={() => handleSelectPlan('yearly')}
              style={({ pressed }) => [
                styles.planOption,
                selectedPlan === 'yearly' && styles.planOptionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.planOptionLeft}>
                <View style={[
                  styles.planRadio,
                  selectedPlan === 'yearly' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'yearly' && <View style={styles.planRadioDot} />}
                </View>
                <View>
                  <View style={styles.planNameRow}>
                    <Text style={[
                      styles.planName,
                      selectedPlan === 'yearly' && styles.planNameSelected,
                    ]}>{t("paywall.yearly").toUpperCase()}</Text>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>{t("premium.save58")}</Text>
                    </View>
                  </View>
                  {voxPrices?.yearlyPerMonth ? (
                    <Text style={styles.planMonthly}>{`${voxPrices.yearlyPerMonth}${t("paywall.perMonth")}`}</Text>
                  ) : (
                    <PriceShimmerSmall />
                  )}
                </View>
              </View>
              <View style={styles.planOptionRight}>
                {voxPrices?.yearlyPrice ? (
                  <Text style={[
                    styles.planPrice,
                    selectedPlan === 'yearly' && styles.planPriceSelected,
                  ]}>{voxPrices.yearlyPrice}</Text>
                ) : (
                  <PriceShimmerLarge />
                )}
                <Text style={styles.planPeriod}>{t("paywall.perYear")}</Text>
              </View>
            </Pressable>

            {/* Aylık Plan */}
            <Pressable
              onPress={() => handleSelectPlan('monthly')}
              style={({ pressed }) => [
                styles.planOption,
                selectedPlan === 'monthly' && styles.planOptionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.planOptionLeft}>
                <View style={[
                  styles.planRadio,
                  selectedPlan === 'monthly' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'monthly' && <View style={styles.planRadioDot} />}
                </View>
                <View>
                  <Text style={[
                    styles.planName,
                    selectedPlan === 'monthly' && styles.planNameSelected,
                  ]}>{t("paywall.monthly").toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.planOptionRight}>
                {voxPrices?.monthlyPrice ? (
                  <Text style={[
                    styles.planPrice,
                    selectedPlan === 'monthly' && styles.planPriceSelected,
                  ]}>{voxPrices.monthlyPrice}</Text>
                ) : (
                  <PriceShimmerLarge />
                )}
                <Text style={styles.planPeriod}>{t("paywall.perMonth")}</Text>
              </View>
            </Pressable>
          </View>

          {/* Satın al butonu */}
          <View style={styles.purchaseSection}>
            <Pressable
              onPress={handlePurchase}
              disabled={loading}
              style={({ pressed }) => [
                styles.purchaseButton,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                loading && { opacity: 0.6 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#060609" size="small" />
              ) : (
                <>
                  <IconSymbol size={18} name="star.fill" color="#060609" />
                  <Text style={styles.purchaseButtonText}>
                    {selectedPlan === 'yearly' ? `${t("paywall.subscribe")} — ${voxPrices?.yearlyPrice || "…"}${t("paywall.perYear")}` : `${t("paywall.subscribe")} — ${voxPrices?.monthlyPrice || "…"}${t("paywall.perMonth")}`}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Geri yükle butonu */}
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              {restoring ? (
                <ActivityIndicator color="#5A5A70" size="small" />
              ) : (
                <Text style={styles.restoreText}>{t("paywall.restore")}</Text>
              )}
            </Pressable>
          </View>

          {/* Alt bilgi */}
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>
              {t("paywall.terms")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <IconSymbol size={12} name={icon as any} color="#9B4FDE" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
    gap: 20,
  },

  // Üst kısım
  topSection: {
    alignItems: 'center',
    gap: 8,
  },
  lockIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  lockIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9B4FDE10',
    borderWidth: 1,
    borderColor: '#9B4FDE30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9B4FDE15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD70020',
    borderWidth: 1,
    borderColor: '#FFD70040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D0D0E0',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B4FDE',
    letterSpacing: 4,
  },
  description: {
    fontSize: 11,
    color: '#5A5A70',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },

  // Özellikler
  featuresContainer: {
    backgroundColor: '#0A0A12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B4FDE20',
    padding: 16,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#9B4FDE10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#8A8AA0',
    flex: 1,
  },

  // Abonelik planları
  plansSection: {
    gap: 10,
  },
  plansTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5A5A70',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 2,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A12',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planOptionSelected: {
    borderColor: '#9B4FDE',
    backgroundColor: '#9B4FDE08',
  },
  planOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3A3A50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: '#9B4FDE',
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9B4FDE',
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5A5A70',
    letterSpacing: 2,
  },
  planNameSelected: {
    color: '#D0D0E0',
  },
  planMonthly: {
    fontSize: 10,
    color: '#9B4FDE',
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: '#FFD70020',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  planOptionRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#5A5A70',
  },
  planPriceSelected: {
    color: '#9B4FDE',
  },
  planPeriod: {
    fontSize: 11,
    color: '#3A3A50',
    fontWeight: '600',
  },

  // Satın alma
  purchaseSection: {
    alignItems: 'center',
    gap: 12,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B4FDE',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  purchaseButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#060609',
    letterSpacing: 2,
  },
  restoreButton: {
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 11,
    color: '#5A5A70',
    textDecorationLine: 'underline',
  },

  // Alt bilgi
  footerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 9,
    color: '#2A2A40',
    textAlign: 'center',
  },
});
