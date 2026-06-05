import { ScrollView, Text, View, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import { useAds } from "@/lib/ad-context";
import { PremiumManager } from "@/lib/premium-manager";
import { PriceShimmer, PriceShimmerLarge, PriceShimmerSmall } from "@/components/price-shimmer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";
import { refreshBillingStatus } from "@/lib/billing-sync";

type PlanPeriod = "monthly" | "yearly";

export default function PremiumScreen() {
  const { isVoxPurchased, purchaseVoxSubscription, restorePurchases, refreshPremiumStatus, voxSubscription, voxPrices } = useAds();
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [expiryText, setExpiryText] = useState("");

  useEffect(() => {
    if (isVoxPurchased) {
      PremiumManager.getVoxExpiryText().then(setExpiryText);
    }
  }, [isVoxPurchased]);

  const handlePurchaseVox = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoading(true);
    try {
      const success = await purchaseVoxSubscription(selectedPlan);
      if (success && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRestoring(true);
    setRestoreSuccess(false);
    try {
      await restorePurchases();
      await refreshPremiumStatus();
      // Show success feedback
      setRestoreSuccess(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Auto-hide success message after 3 seconds
      setTimeout(() => setRestoreSuccess(false), 3000);
    } finally {
      setRestoring(false);
    }
  };

  const handleSyncBilling = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSyncing(true);
    try {
      await refreshBillingStatus();
      await refreshPremiumStatus();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setClearingCache(true);
    setCacheCleared(false);
    try {
      // Fiyat önbelleğini temizle
      await AsyncStorage.removeItem("@vox_prices_cache");
      await AsyncStorage.removeItem("@vox_prices_cache_ts");
      setCacheCleared(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // 3 saniye sonra başarı mesajını gizle
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (error) {
      Alert.alert(t("common.error"), String(error));
    } finally {
      setClearingCache(false);
    }
  };

  const handleSelectPlan = (plan: PlanPeriod) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(plan);
  };

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerDot, { backgroundColor: "#FFD700" }]} />
              <Text style={styles.headerTitle}>{t("premium.title")}</Text>
            </View>
          </View>

          {/* Açıklama */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>{t("premium.title")}</Text>            <Text style={styles.descText}>
              {t("premium.description")}
            </Text>
          </View>

          {/* ============================================================ */}
          {/* VOX ABONELİK KARTI */}
          {/* ============================================================ */}
          <View style={[styles.planCard, { borderColor: isVoxPurchased ? "#22C55E30" : "#9B4FDE30" }]}>
            {/* Başlık */}
            <View style={styles.planHeader}>
              <View style={styles.planHeaderLeft}>
                <View style={[styles.planIcon, { backgroundColor: isVoxPurchased ? "#22C55E15" : "#9B4FDE15" }]}>
                  <IconSymbol size={18} name="waveform" color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
                </View>
                <View>
                  <Text style={[styles.planName, { color: isVoxPurchased ? "#22C55E" : "#9B4FDE" }]}>VOX</Text>
                  <Text style={styles.planSubtitle}>{t("premium.voxSubtitle")}</Text>
                </View>
              </View>
              <View style={styles.planPriceContainer}>
                {isVoxPurchased ? (
                  <View style={styles.purchasedBadge}>
                    <Text style={styles.purchasedText}>{t("premium.active").toUpperCase()}</Text>
                    {expiryText ? (
                      <Text style={styles.expiryText}>{expiryText}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ alignItems: "flex-end" }}>
                    {voxPrices?.monthlyPrice ? (
                      <Text style={[styles.planPrice, { color: "#9B4FDE" }]}>{voxPrices.monthlyPrice}</Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.planPriceNote}>{t("paywall.perMonth")}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Özellikler */}
            <View style={styles.featuresList}>
              <FeatureItem text={t("premium.wordBank")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
              <FeatureItem text={t("premium.voiceChars")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
              <FeatureItem text={t("premium.radioEffects")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
              <FeatureItem text={t("paywall.feature4")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
              <FeatureItem text={t("vox.whiteNoise")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
              <FeatureItem text={t("premium.sessionRecord")} color={isVoxPurchased ? "#22C55E" : "#9B4FDE"} />
            </View>

            {/* Abonelik seçenekleri (satın alınmamışsa) */}
            {!isVoxPurchased && (
              <>
                {/* Yıllık Plan */}
                <Pressable
                  onPress={() => handleSelectPlan("yearly")}
                  style={({ pressed }) => [
                    styles.subOption,
                    selectedPlan === "yearly" && styles.subOptionSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.subOptionLeft}>
                    <View style={[
                      styles.subRadio,
                      selectedPlan === "yearly" && styles.subRadioSelected,
                    ]}>
                      {selectedPlan === "yearly" && <View style={styles.subRadioDot} />}
                    </View>
                    <View>
                      <View style={styles.subNameRow}>
                        <Text style={[
                          styles.subName,
                          selectedPlan === "yearly" && styles.subNameSelected,
                        ]}>{ t("premium.yearly").toUpperCase()}</Text>
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>{t("premium.save58")}</Text>
                        </View>
                      </View>
                      {voxPrices?.yearlyPerMonth ? (
                        <Text style={styles.subMonthly}>{`${voxPrices.yearlyPerMonth}${t("paywall.perMonth")}`}</Text>
                      ) : (
                        <PriceShimmerSmall />
                      )}
                    </View>
                  </View>
                  <View style={styles.subOptionRight}>
                    {voxPrices?.yearlyPrice ? (
                      <Text style={[
                        styles.subPrice,
                        selectedPlan === "yearly" && styles.subPriceSelected,
                      ]}>{voxPrices.yearlyPrice}</Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.subPeriod}>{t("paywall.perYear")}</Text>
                  </View>
                </Pressable>

                {/* Aylık Plan */}
                <Pressable
                  onPress={() => handleSelectPlan("monthly")}
                  style={({ pressed }) => [
                    styles.subOption,
                    selectedPlan === "monthly" && styles.subOptionSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.subOptionLeft}>
                    <View style={[
                      styles.subRadio,
                      selectedPlan === "monthly" && styles.subRadioSelected,
                    ]}>
                      {selectedPlan === "monthly" && <View style={styles.subRadioDot} />}
                    </View>
                    <Text style={[
                      styles.subName,
                      selectedPlan === "monthly" && styles.subNameSelected,
                    ]}>{ t("premium.monthly").toUpperCase()}</Text>
                  </View>
                  <View style={styles.subOptionRight}>
                    {voxPrices?.monthlyPrice ? (
                      <Text style={[
                        styles.subPrice,
                        selectedPlan === "monthly" && styles.subPriceSelected,
                      ]}>{voxPrices.monthlyPrice}</Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.subPeriod}>{t("paywall.perMonth")}</Text>
                  </View>
                </Pressable>

                {/* Satın al butonu */}
                <Pressable
                  onPress={handlePurchaseVox}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.purchaseBtn,
                    {
                      backgroundColor: "#9B4FDE15",
                      borderColor: "#9B4FDE30",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed ? 0.9 : loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.purchaseBtnText, { color: "#9B4FDE" }]}>
                    {loading
                      ? t("common.loading")
                      : selectedPlan === "yearly"
                        ? `${t("premium.subscribe")} — ${voxPrices?.yearlyPrice || "…"}${t("paywall.perYear")}`
                        : `${t("premium.subscribe")} — ${voxPrices?.monthlyPrice || "…"}${t("paywall.perMonth")}`}
                  </Text>
                </Pressable>
              </>
            )}

            {/* Aktif abonelik bilgisi ve yenileme butonu */}
            {isVoxPurchased && voxSubscription && (
              <>
                <View style={styles.activeSubInfo}>
                  <Text style={styles.activeSubText}>
                    {voxSubscription.period === "yearly" ? t("premium.yearly") : t("premium.monthly")} — {t("premium.active")}
                  </Text>
                  {expiryText ? (
                    <Text style={styles.activeSubExpiry}>{expiryText}</Text>
                  ) : null}
                </View>

                {/* Yenileme/Düzeltme Butonu */}
                <Pressable
                  onPress={handlePurchaseVox}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.renewBtn,
                    {
                      backgroundColor: "#22C55E15",
                      borderColor: "#22C55E30",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed ? 0.9 : loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.renewBtnText, { color: "#22C55E" }]}>
                    {loading ? t("common.loading") : t("premium.renew")}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* ============================================================ */}
          {/* ÜCRETSİZ ÖZELLİKLER KARTI */}
          {/* ============================================================ */}
          <View style={[styles.planCard, { borderColor: "#141420" }]}>
            <View style={styles.planHeader}>
              <View style={styles.planHeaderLeft}>
                <View style={[styles.planIcon, { backgroundColor: "#00FF8815" }]}>
                  <IconSymbol size={18} name="star.fill" color="#00FF88" />
                </View>
                <View>
                  <Text style={[styles.planName, { color: "#00FF88" }]}>{t("premium.freeFeatures")}</Text>
                  <Text style={styles.planSubtitle}>{t("premium.description")}</Text>
                </View>
              </View>
              <View style={styles.purchasedBadge}>
                <Text style={[styles.purchasedText, { color: "#00FF88" }]}>{t("premium.active").toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              <FeatureItem text={t("premium.emfScanner")} color="#00FF88" />
              <FeatureItem text={t("premium.paranormalRadar")} color="#00FF88" />
              <FeatureItem text={t("premium.evpRecorder")} color="#00FF88" />
              <FeatureItem text={t("premium.slsCamera")} color="#00FF88" />
              <FeatureItem text={t("premium.eventRecords")} color="#00FF88" />
              <FeatureItem text={t("premium.adsIncluded")} color="#3A3A50" />
            </View>
          </View>

          {/* ============================================================ */}
          {/* BİLGİ VE GERİ YÜKLEME */}
          {/* ============================================================ */}
          <View style={styles.infoSection}>
            {/* Restore Purchases Button - Prominent */}
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreBtnProminent,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                restoreSuccess && styles.restoreBtnSuccess,
              ]}
            >
              <View style={styles.restoreBtnContent}>
                <Text style={styles.restoreBtnIcon}>
                  {restoreSuccess ? "✓" : "↻"}
                </Text>
                <Text style={styles.restoreBtnText}>
                  {restoring
                    ? t("premium.restoring")
                    : restoreSuccess
                      ? t("premium.restoreSuccess")
                      : t("premium.restore")}
                </Text>
              </View>
            </Pressable>

            {/* Sync Billing Button */}
            <Pressable
              onPress={handleSyncBilling}
              disabled={syncing}
              style={({ pressed }) => [
                styles.syncBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.syncBtnText}>
                {syncing ? t("common.loading") : t("premium.syncBilling")}
              </Text>
            </Pressable>

            {/* Önbelleği Temizle Butonu */}
            <Pressable
              onPress={handleClearCache}
              disabled={clearingCache}
              style={({ pressed }) => [
                styles.clearCacheBtn,
                pressed && { opacity: 0.8 },
                cacheCleared && styles.clearCacheBtnSuccess,
              ]}
            >
              <Text style={[
                styles.clearCacheBtnText,
                cacheCleared && { color: "#22C55E" },
              ]}>
                {clearingCache
                  ? t("common.loading")
                  : cacheCleared
                    ? t("premium.cacheCleared")
                    : t("premium.clearCache")}
              </Text>
            </Pressable>

            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>+</Text>
              <Text style={styles.infoText}>{t("premium.securePayment")}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>+</Text>
              <Text style={styles.infoText}>{t("paywall.terms")}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>+</Text>
              <Text style={styles.infoText}>{t("premium.restore")}</Text>
            </View>
          </View>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>
      <AdBanner />
    </ScreenContainer>
  );
}

function FeatureItem({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureCheck, { backgroundColor: color + "15" }]}>
        <Text style={[styles.featureCheckText, { color }]}>+</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D0D0E0",
    letterSpacing: 4,
  },

  // Açıklama
  descSection: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D0D0E0",
    letterSpacing: 4,
  },
  descText: {
    fontSize: 11,
    color: "#3A3A50",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Plan kartı
  planCard: {
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
  planSubtitle: {
    fontSize: 10,
    color: "#5A5A70",
    marginTop: 1,
  },
  planPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
  },
  planPriceNote: {
    fontSize: 9,
    color: "#5A5A70",
  },
  purchasedBadge: {
    backgroundColor: "#22C55E10",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#22C55E30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  purchasedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 2,
  },
  expiryText: {
    fontSize: 8,
    color: "#22C55E80",
    marginTop: 2,
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCheckText: {
    fontSize: 10,
    fontWeight: "700",
  },
  featureText: {
    fontSize: 11,
    color: "#5A5A70",
    flex: 1,
  },

  // Abonelik seçenekleri
  subOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#060609",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#1A1A2A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subOptionSelected: {
    borderColor: "#9B4FDE",
    backgroundColor: "#9B4FDE08",
  },
  subOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#3A3A50",
    alignItems: "center",
    justifyContent: "center",
  },
  subRadioSelected: {
    borderColor: "#9B4FDE",
  },
  subRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9B4FDE",
  },
  subNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5A5A70",
    letterSpacing: 2,
  },
  subNameSelected: {
    color: "#D0D0E0",
  },
  subMonthly: {
    fontSize: 9,
    color: "#9B4FDE",
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: "#FFD70020",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#FFD700",
    letterSpacing: 1,
  },
  subOptionRight: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#5A5A70",
  },
  subPriceSelected: {
    color: "#9B4FDE",
  },
  subPeriod: {
    fontSize: 10,
    color: "#3A3A50",
    fontWeight: "600",
  },

  // Aktif abonelik bilgisi
  activeSubInfo: {
    backgroundColor: "#22C55E08",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E20",
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  activeSubText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  activeSubExpiry: {
    fontSize: 9,
    color: "#22C55E80",
  },

  purchaseBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  purchaseBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
  },

  // Yenileme butonu (aktif abonelik için)
  renewBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
  },

  // Bilgi
  infoSection: {
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 12,
    gap: 8,
  },
  restoreBtnProminent: {
    backgroundColor: "#0066FF15",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0066FF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  restoreBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  restoreBtnIcon: {
    fontSize: 16,
    color: "#0066FF",
    fontWeight: "700",
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0066FF",
    letterSpacing: 1,
  },
  restoreBtnSuccess: {
    backgroundColor: "#22C55E15",
    borderColor: "#22C55E",
  },
  syncBtn: {
    backgroundColor: "#9B4FDE15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9B4FDE30",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9B4FDE",
    letterSpacing: 0.5,
  },
  clearCacheBtn: {
    backgroundColor: "#1A1A2A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A40",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  clearCacheBtnSuccess: {
    borderColor: "#22C55E30",
    backgroundColor: "#22C55E08",
  },
  clearCacheBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A5A70",
    letterSpacing: 0.5,
  },
  restoreBtn: {
    paddingVertical: 6,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    marginBottom: 4,
  },
  restoreText: {
    fontSize: 11,
    color: "#5A5A70",
    textDecorationLine: "underline",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoIcon: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2A2A40",
  },
  infoText: {
    fontSize: 10,
    color: "#2A2A40",
    letterSpacing: 0.5,
  },
});
