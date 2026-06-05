import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, Pressable, StyleSheet, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";

const HISTORY_SIZE = 40;

export default function EMFScreen() {
  const [emfLevel, setEmfLevel] = useState(0);
  const [maxLevel, setMaxLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // ANR FIX: Accumulators for animation timing
  const emfAccRef = useRef(0);
  const pulseAccRef = useRef(0);

  // ANR FIX: Tek RAF loop'u - EMF simülasyonu + pulse animasyonu
  const animateFrame = useCallback((time: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(animateFrame);
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // EMF simülasyonu: her 400ms'de güncelle
    emfAccRef.current += deltaTime;
    if (emfAccRef.current >= 400) {
      emfAccRef.current -= 400;

      const baseNoise = Math.random() * 8;
      const spike = Math.random() > 0.982 ? Math.random() * 45 + 20 : 0;
      const drift = Math.sin(Date.now() / 3000) * 8;
      const newLevel = Math.max(0, Math.min(100, baseNoise + spike + drift));

      setEmfLevel(newLevel);
      setMaxLevel((prev) => Math.max(prev, newLevel));
      setHistory((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), newLevel]);

      // Haptic feedback
      if (Platform.OS !== "web") {
        if (newLevel > 70) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (newLevel > 50) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }

    // Pulse: her 50ms'de 1 birim ilerle
    pulseAccRef.current += deltaTime;
    if (pulseAccRef.current >= 50) {
      const steps = Math.floor(pulseAccRef.current / 50);
      pulseAccRef.current -= steps * 50;
      setPulsePhase((p) => (p + steps) % 100);
    }

    rafRef.current = requestAnimationFrame(animateFrame);
  }, []);

  // RAF loop'u başlat/durdur
  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = null;
      emfAccRef.current = 0;
      pulseAccRef.current = 0;
      rafRef.current = requestAnimationFrame(animateFrame);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      setPulsePhase(0);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isActive, animateFrame]);

  // Süre sayacı
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const getColor = (level: number) => {
    if (level < 25) return "#00FF88";
    if (level < 50) return "#FFCC00";
    if (level < 75) return "#FF8800";
    return "#FF3333";
  };

  const getStatusText = (level: number) => {
    if (level < 15) return t("emf.normal");
    if (level < 40) return t("emf.low");
    if (level < 65) return t("emf.medium");
    if (level < 85) return t("emf.high");
    return t("emf.extreme");
  };

  const toggleActive = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setEmfLevel(0);
      setMaxLevel(0);
      setHistory([]);
      setElapsedTime(0);
      setIsActive(true);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const color = getColor(emfLevel);
  const pulseOpacity = isActive ? 0.3 + Math.sin(pulsePhase * 0.12) * 0.2 : 0.1;

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerDot, { backgroundColor: isActive ? color : "#2A2A40", opacity: pulseOpacity + 0.5 }]} />
            <Text style={styles.headerTitle}>EMF</Text>
            <Text style={styles.headerSub}>{t("home.emfSub")}</Text>
          </View>
          <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
        </View>

        {/* EMF Gösterge */}
        <View style={styles.meterContainer}>
          {/* Dairesel gösterge */}
          <View style={styles.meterCircle}>
            {/* Arka plan halkaları */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((r, i) => (
              <View
                key={i}
                style={[
                  styles.meterRing,
                  {
                    width: 200 * r,
                    height: 200 * r,
                    borderRadius: 100 * r,
                    borderColor: emfLevel / 100 > r - 0.2 ? color + "30" : "#14142020",
                  },
                ]}
              />
            ))}

            {/* Merkez değer */}
            <View style={styles.meterCenter}>
              <Text style={[styles.meterValue, { color }]}>{emfLevel.toFixed(0)}</Text>
              <Text style={styles.meterUnit}>mG</Text>
              <Text style={[styles.meterStatus, { color }]}>{getStatusText(emfLevel)}</Text>
            </View>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color }]}>{emfLevel.toFixed(1)}</Text>
            <Text style={styles.statLabel}>{t("emf.current").toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getColor(maxLevel) }]}>{maxLevel.toFixed(1)}</Text>
            <Text style={styles.statLabel}>MAX</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isActive ? color : "#2A2A40" }]}>
              {isActive ? t("emf.scanning") : t("common.off").toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>{t("emf.status").toUpperCase()}</Text>
          </View>
        </View>

        {/* Grafik */}
        <View style={styles.graphContainer}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>{t("emf.history").toUpperCase()}</Text>
            <Text style={styles.graphCount}>{history.length}/{HISTORY_SIZE}</Text>
          </View>
          <View style={styles.graph}>
            {history.map((val, i) => {
              const h = Math.max(2, (val / 100) * 60);
              return (
                <View
                  key={i}
                  style={[
                    styles.graphBar,
                    {
                      height: h,
                      backgroundColor: getColor(val),
                      opacity: 0.4 + (i / history.length) * 0.6,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Başlat/Durdur */}
        <Pressable
          onPress={toggleActive}
          style={({ pressed }) => [
            styles.mainButton,
            {
              backgroundColor: isActive ? "#0A0A14" : "#0D0D15",
              borderColor: isActive ? "#FF333340" : color + "30",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.buttonInner, { backgroundColor: isActive ? "#FF333315" : color + "10" }]}>
            <IconSymbol
              size={24}
              name={isActive ? "stop.fill" : "play.fill"}
              color={isActive ? "#FF3333" : color}
            />
          </View>
          <Text style={[styles.buttonText, { color: isActive ? "#FF3333" : color }]}>
            {isActive ? t("emf.stop") : t("emf.start")}
          </Text>
        </Pressable>
      </View>
      <AdBanner />
    </ScreenContainer>
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
  headerSub: {
    fontSize: 10,
    fontWeight: "500",
    color: "#3A3A50",
    letterSpacing: 2,
    marginTop: 2,
  },
  headerTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },

  // Meter
  meterContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  meterCircle: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  meterRing: {
    position: "absolute",
    borderWidth: 1,
  },
  meterCenter: {
    alignItems: "center",
    gap: 2,
  },
  meterValue: {
    fontSize: 42,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  meterUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  meterStatus: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 4,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#141420",
    paddingVertical: 10,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D0D0E0",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "500",
    color: "#2A2A40",
    letterSpacing: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#141420",
  },

  // Graph
  graphContainer: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    overflow: "hidden",
  },
  graphHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  graphTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  graphCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2A2A40",
    fontVariant: ["tabular-nums"],
  },
  graph: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  graphBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },

  // Button
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
});
