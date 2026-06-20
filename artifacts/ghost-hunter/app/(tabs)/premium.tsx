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
import { DevSubscriptionPanel } from "@/components/dev-subscription-panel";

type PlanPeriod = "monthly" | "yearly";

export default function PremiumScreen() {
  const {
    isVoxPurchased, purchaseVoxSubscription, restorePurchases, refreshPremiumStatus,
    voxSubscription, voxPrices, isPricesLoading,
    isScannerPurchased, purchaseScannerSubscription, scannerSubscription,
    scannerPrices, isScannerPricesLoading,
  } = useAds();
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>("yearly");
  const [selectedScannerPlan, setSelectedScannerPlan] = useState<PlanPeriod>("yearly");
  const [loading, setLoading] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [scannerAwaitingConfirmation, setScannerAwaitingConfirmation] = useState(false);
  // DEV: Fiyat yükleme durumunu test için override et (__DEV__ only)
  const [devPricesLoadingOverride, setDevPricesLoadingOverride] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [expiryText, setExpiryText] = useState("");
  const [scannerExpiryText, setScannerExpiryText] = useState("");

  useEffect(() => {
    if (isVoxPurchased) {
      PremiumManager.getVoxExpiryText().then(setExpiryText);
    }
  }, [isVoxPurchased]);

  useEffect(() => {
    if (isScannerPurchased) {
      import("@/lib/premium-manager").then(({ ScannerManager }) => {
        ScannerManager.getScannerExpiryText().then(setScannerExpiryText);
      });
    }
  }, [isScannerPurchased]);

  const handlePurchaseVox = async () => {
    console.log("[PURCHASE] package:", selectedPlan);
    console.log("[PURCHASE] product:", JSON.stringify(voxPrices));
    console.log("[PURCHASE] userSubscriptionStatus:", JSON.stringify(voxSubscription));
    // Fiyatlar henüz yüklenmediyse internet uyarısı ver
    if (!voxPrices) {
      Alert.alert(
        t("common.error"),
        "İnternet bağlantınızı kontrol edin ve tekrar deneyin."
      );
      return;
    }
    // Anında disabled — çift tıklamayı önle
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const result = await purchaseVoxSubscription(selectedPlan);
      if (result.ok) {
        setAwaitingConfirmation(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Google Play onayı genellikle anında gelir; 5 sn sonra temizle
        setTimeout(() => setAwaitingConfirmation(false), 5000);
      } else if (!result.cancelled) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(
          t("common.error"),
          "İşlem tamamlanamadı, lütfen tekrar deneyin."
        );
      }
    } catch {
      Alert.alert(
        t("common.error"),
        "İşlem tamamlanamadı, lütfen tekrar deneyin."
      );
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
      // Fiyat önbelleğini temizle (VOX + Scanner)
      await AsyncStorage.removeItem("@vox_prices_cache");
      await AsyncStorage.removeItem("@vox_prices_cache_ts");
      await AsyncStorage.removeItem("@scanner_prices_cache");
      await AsyncStorage.removeItem("@scanner_prices_cache_ts");
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

  const handlePurchaseScanner = async () => {
    if (!scannerPrices) {
      Alert.alert(t("common.error"), "İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
      return;
    }
    setScannerLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const result = await purchaseScannerSubscription(selectedScannerPlan);
      if (result.ok) {
        setScannerAwaitingConfirmation(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => setScannerAwaitingConfirmation(false), 5000);
      } else if (!result.cancelled) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(t("common.error"), "İşlem tamamlanamadı, lütfen tekrar deneyin.");
      }
    } catch {
      Alert.alert(t("common.error"), "İşlem tamamlanamadı, lütfen tekrar deneyin.");
    } finally {
      setScannerLoading(false);
    }
  };

  const handleSelectScannerPlan = (plan: PlanPeriod) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedScannerPlan(plan);
  };

  const handleSelectPlan = (plan: PlanPeriod) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(plan);
  };

  // Aylık aboneyi yıllığa yükselt (Google Play değiştirme akışı)
  const handleUpgradeToYearly = async () => {
    console.log("[UPGRADE] package: yearly");
    console.log("[UPGRADE] product:", JSON.stringify(voxPrices));
    console.log("[UPGRADE] userSubscriptionStatus:", JSON.stringify(voxSubscription));
    // Anında disabled — çift tıklamayı önle
    setLoading(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      // Yükseltme öncesi mevcut satın almaları arka planda geri yükle
      // Bu, Google Play'in "zaten sahipsiniz" hatasını önler
      restorePurchases().catch(() => {/* sessizce devam et */});

      const result = await purchaseVoxSubscription("yearly");
      if (result.ok) {
        setAwaitingConfirmation(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => setAwaitingConfirmation(false), 5000);
      } else if (!result.cancelled) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(
          t("common.error"),
          "Yıllık plana geçiş tamamlanamadı, lütfen tekrar deneyin."
        );
      }
    } catch {
      Alert.alert(
        t("common.error"),
        "Yıllık plana geçiş tamamlanamadı, lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
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
                  disabled={loading || isPricesLoading || devPricesLoadingOverride}
                  style={({ pressed }) => [
                    styles.purchaseBtn,
                    {
                      backgroundColor: "#9B4FDE15",
                      borderColor: "#9B4FDE30",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed ? 0.9 : (loading || isPricesLoading || devPricesLoadingOverride) ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.purchaseBtnText, { color: "#9B4FDE" }]}>
                    {(isPricesLoading || devPricesLoadingOverride)
                      ? "Fiyatlar yükleniyor..."
                      : awaitingConfirmation
                        ? "Onay bekleniyor..."
                        : loading
                          ? "İşleniyor..."
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

                {/* Aylıktan Yıllığa Yükselt — sadece aylık abonelikte göster */}
                {voxSubscription.period === "monthly" && (
                  <Pressable
                    onPress={handleUpgradeToYearly}
                    disabled={loading || isPricesLoading || devPricesLoadingOverride}
                    style={({ pressed }) => [
                      styles.upgradeBtn,
                      {
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                        opacity: pressed ? 0.9 : (loading || isPricesLoading || devPricesLoadingOverride) ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.upgradeBtnRow}>
                      <Text style={styles.upgradeBtnText}>
                        {(isPricesLoading || devPricesLoadingOverride)
                          ? "Fiyatlar yükleniyor..."
                          : awaitingConfirmation
                            ? "Onay bekleniyor..."
                            : loading
                              ? "İşleniyor..."
                              : `${t("premium.yearly").toUpperCase()} — ${voxPrices?.yearlyPrice || "…"}${t("paywall.perYear")}`}
                      </Text>
                      {!loading && !isPricesLoading && !devPricesLoadingOverride && !awaitingConfirmation && (
                        <View style={styles.upgradeSaveBadge}>
                          <Text style={styles.upgradeSaveBadgeText}>{t("premium.save58")}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                )}

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
          {/* SCANNER ABONELİK KARTI */}
          {/* ============================================================ */}
          <View style={[styles.planCard, { borderColor: isScannerPurchased ? "#22C55E30" : "#00D4FF30" }]}>
            <View style={styles.planHeader}>
              <View style={styles.planHeaderLeft}>
                <View style={[styles.planIcon, { backgroundColor: isScannerPurchased ? "#22C55E15" : "#00D4FF15" }]}>
                  <IconSymbol size={18} name="radio" color={isScannerPurchased ? "#22C55E" : "#00D4FF"} />
                </View>
                <View>
                  <Text style={[styles.planName, { color: isScannerPurchased ? "#22C55E" : "#00D4FF" }]}>SCANNER</Text>
                  <Text style={styles.planSubtitle}>Frekans Tarayıcı</Text>
                </View>
              </View>
              <View style={styles.planPriceContainer}>
                {isScannerPurchased ? (
                  <View style={styles.purchasedBadge}>
                    <Text style={styles.purchasedText}>{t("premium.active").toUpperCase()}</Text>
                    {scannerExpiryText ? <Text style={styles.expiryText}>{scannerExpiryText}</Text> : null}
                  </View>
                ) : (
                  <View style={{ alignItems: "flex-end" }}>
                    {scannerPrices?.monthlyPrice ? (
                      <Text style={[styles.planPrice, { color: "#00D4FF" }]}>{scannerPrices.monthlyPrice}</Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.planPriceNote}>{t("paywall.perMonth")}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.featuresList}>
              <FeatureItem text="AM/FM bant taraması" color={isScannerPurchased ? "#22C55E" : "#00D4FF"} />
              <FeatureItem text="Gerçek zamanlı spektrum görselleştirme" color={isScannerPurchased ? "#22C55E" : "#00D4FF"} />
              <FeatureItem text="Dedektör geçmişi ve kayıtlar" color={isScannerPurchased ? "#22C55E" : "#00D4FF"} />
              <FeatureItem text="Otomatik frekans tespiti (10-50sn)" color={isScannerPurchased ? "#22C55E" : "#00D4FF"} />
            </View>

            {!isScannerPurchased && (
              <>
                {/* Yıllık Plan */}
                <Pressable
                  onPress={() => handleSelectScannerPlan("yearly")}
                  style={({ pressed }) => [
                    styles.subOption,
                    selectedScannerPlan === "yearly" && styles.subOptionScannerSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.subOptionLeft}>
                    <View style={[
                      styles.subRadio,
                      selectedScannerPlan === "yearly" && styles.subRadioScannerSelected,
                    ]}>
                      {selectedScannerPlan === "yearly" && <View style={[styles.subRadioDot, { backgroundColor: "#00D4FF" }]} />}
                    </View>
                    <View>
                      <View style={styles.subNameRow}>
                        <Text style={[styles.subName, selectedScannerPlan === "yearly" && { color: "#00D4FF" }]}>
                          {t("premium.yearly").toUpperCase()}
                        </Text>
                        <View style={[styles.saveBadge, { backgroundColor: "#00D4FF15", borderColor: "#00D4FF30" }]}>
                          <Text style={[styles.saveBadgeText, { color: "#00D4FF" }]}>{t("premium.save58")}</Text>
                        </View>
                      </View>
                      {scannerPrices?.yearlyPerMonth ? (
                        <Text style={styles.subMonthly}>{`${scannerPrices.yearlyPerMonth}${t("paywall.perMonth")}`}</Text>
                      ) : (
                        <PriceShimmerSmall />
                      )}
                    </View>
                  </View>
                  <View style={styles.subOptionRight}>
                    {scannerPrices?.yearlyPrice ? (
                      <Text style={[styles.subPrice, selectedScannerPlan === "yearly" && { color: "#00D4FF" }]}>
                        {scannerPrices.yearlyPrice}
                      </Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.subPeriod}>{t("paywall.perYear")}</Text>
                  </View>
                </Pressable>

                {/* Aylık Plan */}
                <Pressable
                  onPress={() => handleSelectScannerPlan("monthly")}
                  style={({ pressed }) => [
                    styles.subOption,
                    selectedScannerPlan === "monthly" && styles.subOptionScannerSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.subOptionLeft}>
                    <View style={[
                      styles.subRadio,
                      selectedScannerPlan === "monthly" && styles.subRadioScannerSelected,
                    ]}>
                      {selectedScannerPlan === "monthly" && <View style={[styles.subRadioDot, { backgroundColor: "#00D4FF" }]} />}
                    </View>
                    <Text style={[styles.subName, selectedScannerPlan === "monthly" && { color: "#00D4FF" }]}>
                      {t("premium.monthly").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.subOptionRight}>
                    {scannerPrices?.monthlyPrice ? (
                      <Text style={[styles.subPrice, selectedScannerPlan === "monthly" && { color: "#00D4FF" }]}>
                        {scannerPrices.monthlyPrice}
                      </Text>
                    ) : (
                      <PriceShimmerLarge />
                    )}
                    <Text style={styles.subPeriod}>{t("paywall.perMonth")}</Text>
                  </View>
                </Pressable>

                {/* Satın al butonu */}
                <Pressable
                  onPress={handlePurchaseScanner}
                  disabled={scannerLoading || isScannerPricesLoading}
                  style={({ pressed }) => [
                    styles.purchaseBtn,
                    {
                      backgroundColor: "#00D4FF15",
                      borderColor: "#00D4FF30",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed ? 0.9 : (scannerLoading || isScannerPricesLoading) ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.purchaseBtnText, { color: "#00D4FF" }]}>
                    {isScannerPricesLoading
                      ? "Fiyatlar yükleniyor..."
                      : scannerAwaitingConfirmation
                        ? "Onay bekleniyor..."
                        : scannerLoading
                          ? "İşleniyor..."
                          : selectedScannerPlan === "yearly"
                            ? `${t("premium.subscribe")} — ${scannerPrices?.yearlyPrice || "…"}${t("paywall.perYear")}`
                            : `${t("premium.subscribe")} — ${scannerPrices?.monthlyPrice || "…"}${t("paywall.perMonth")}`}
                  </Text>
                </Pressable>
              </>
            )}

            {isScannerPurchased && scannerSubscription && (
              <View style={styles.activeSubInfo}>
                <Text style={styles.activeSubText}>
                  {scannerSubscription.period === "yearly" ? t("premium.yearly") : t("premium.monthly")} — {t("premium.active")}
                </Text>
                {scannerExpiryText ? <Text style={styles.activeSubExpiry}>{scannerExpiryText}</Text> : null}
              </View>
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

          {/* ============================================================ */}
          {/* DEV TEST PANELİ — Sadece geliştirme modunda görünür       */}
          {/* ============================================================ */}
          {__DEV__ && (
            <DevSubscriptionPanel
              isVoxPurchased={isVoxPurchased}
              isPricesLoading={isPricesLoading || devPricesLoadingOverride}
              onRefresh={refreshPremiumStatus}
              onOverridePricesLoading={setDevPricesLoadingOverride}
            />
          )}

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
  subOptionScannerSelected: {
    borderColor: "#00D4FF",
    backgroundColor: "#00D4FF08",
  },
  subRadioScannerSelected: {
    borderColor: "#00D4FF",
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

  // Yıllığa yükselt butonu
  upgradeBtn: {
    backgroundColor: "#9B4FDE",
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#060609",
    letterSpacing: 2,
  },
  upgradeSaveBadge: {
    backgroundColor: "#06060925",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upgradeSaveBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#060609",
    letterSpacing: 1,
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
