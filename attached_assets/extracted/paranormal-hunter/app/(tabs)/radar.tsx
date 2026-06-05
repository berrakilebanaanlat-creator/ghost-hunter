import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, Pressable, StyleSheet, Dimensions, Platform, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 260);
const RADAR_HALF = RADAR_SIZE / 2;

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  strength: number;
  timestamp: Date;
}

export default function RadarScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [targets, setTargets] = useState<RadarTarget[]>([]);
  const [rotation, setRotation] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // ANR FIX: Animasyon accumulators
  const rotationAccRef = useRef(0);
  const pulseAccRef = useRef(0);
  const targetSpawnAccRef = useRef(0);

  // ANR FIX: Tek bir requestAnimationFrame loop'u ile tüm animasyonları yönet
  // Önceki: 80ms interval (rotation + target spawn) + 50ms interval (pulse) = 2 ayrı setInterval
  // Şimdi: Tek RAF loop, UI thread'i bloklamaz
  const animateFrame = useCallback((time: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(animateFrame);
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Rotation: her 80ms'de 3 derece dön
    rotationAccRef.current += deltaTime;
    if (rotationAccRef.current >= 80) {
      const steps = Math.floor(rotationAccRef.current / 80);
      rotationAccRef.current -= steps * 80;
      setRotation((prev) => (prev + steps * 3) % 360);
    }

    // Pulse: her 50ms'de 1 birim ilerle
    pulseAccRef.current += deltaTime;
    if (pulseAccRef.current >= 50) {
      const steps = Math.floor(pulseAccRef.current / 50);
      pulseAccRef.current -= steps * 50;
      setPulsePhase((p) => (p + steps) % 100);
    }

    // Target spawn: her 80ms'de %15 şansla hedef oluştur
    targetSpawnAccRef.current += deltaTime;
    if (targetSpawnAccRef.current >= 80) {
      targetSpawnAccRef.current -= 80;

      if (Math.random() > 0.85) {
        const newTarget: RadarTarget = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          angle: Math.random() * 360,
          distance: 15 + Math.random() * 80,
          strength: Math.random() * 100,
          timestamp: new Date(),
        };

        if (Platform.OS !== "web" && newTarget.strength > 60) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setTargets((prev) => {
          const updated = [...prev, newTarget];
          return updated.length > 8 ? updated.slice(-8) : updated;
        });
      }
    }

    rafRef.current = requestAnimationFrame(animateFrame);
  }, []);

  // RAF loop'u başlat/durdur
  useEffect(() => {
    if (isScanning) {
      lastTimeRef.current = null;
      rotationAccRef.current = 0;
      pulseAccRef.current = 0;
      targetSpawnAccRef.current = 0;
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
  }, [isScanning, animateFrame]);

  // Süre sayacı - 1s interval (hafif, ANR riski yok)
  useEffect(() => {
    if (isScanning) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isScanning]);

  const getTargetColor = (strength: number) => {
    if (strength > 70) return "#FF3333";
    if (strength > 40) return "#FFCC00";
    return "#00CCFF";
  };

  const getTargetLabel = (strength: number) => {
    if (strength > 70) return t("emf.high").toUpperCase();
    if (strength > 40) return t("emf.medium").toUpperCase();
    return t("emf.low").toUpperCase();
  };

  const toggleScanning = () => {
    if (isScanning) {
      setIsScanning(false);
    } else {
      setTargets([]);
      setElapsedTime(0);
      setIsScanning(true);
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

  const pulseOpacity = isScanning ? 0.3 + Math.sin(pulsePhase * 0.12) * 0.2 : 0.1;

  // Radar çemberleri
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerDot, { backgroundColor: isScanning ? "#00CCFF" : "#2A2A40", opacity: pulseOpacity + 0.5 }]} />
            <Text style={styles.headerTitle}>RADAR</Text>
            <Text style={styles.headerSub}>{t("radar.title").replace("PARANORMAL ", "").replace("RADAR", "").trim() || t("home.radarSub")}</Text>
          </View>
          <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
        </View>

        {/* Radar Görüntüsü */}
        <View style={styles.radarContainer}>
          <View style={[styles.radarCircle, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
            {/* Çemberler */}
            {rings.map((r, i) => (
              <View
                key={i}
                style={[
                  styles.radarRing,
                  {
                    width: RADAR_SIZE * r,
                    height: RADAR_SIZE * r,
                    borderRadius: (RADAR_SIZE * r) / 2,
                    borderColor: "#00CCFF" + (i === 3 ? "20" : "10"),
                  },
                ]}
              />
            ))}

            {/* Çapraz çizgiler */}
            <View style={[styles.crossLine, { width: RADAR_SIZE - 8, transform: [{ rotate: "0deg" }] }]} />
            <View style={[styles.crossLine, { width: RADAR_SIZE - 8, transform: [{ rotate: "90deg" }] }]} />
            <View style={[styles.crossLine, { width: RADAR_SIZE - 8, transform: [{ rotate: "45deg" }] }]} />
            <View style={[styles.crossLine, { width: RADAR_SIZE - 8, transform: [{ rotate: "135deg" }] }]} />

            {/* Sweep çizgisi */}
            {isScanning && (
              <View
                style={[
                  styles.sweepLine,
                  {
                    width: RADAR_HALF - 4,
                    transform: [
                      { translateX: (RADAR_HALF - 4) / 2 },
                      { rotate: `${rotation}deg` },
                    ],
                    transformOrigin: "left center",
                  },
                ]}
              />
            )}

            {/* Hedefler */}
            {targets.map((target) => {
              const rad = ((target.angle - 90) * Math.PI) / 180;
              const maxR = RADAR_HALF - 12;
              const r = (target.distance / 100) * maxR;
              const x = r * Math.cos(rad);
              const y = r * Math.sin(rad);
              const dotSize = target.strength > 70 ? 8 : target.strength > 40 ? 6 : 4;

              return (
                <View
                  key={target.id}
                  style={[
                    styles.targetDot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: getTargetColor(target.strength),
                      left: RADAR_HALF + x - dotSize / 2,
                      top: RADAR_HALF + y - dotSize / 2,
                    },
                  ]}
                />
              );
            })}

            {/* Merkez nokta */}
            <View style={styles.centerDot} />
          </View>

          {/* Yön etiketleri */}
          <Text style={[styles.dirLabel, { top: -2, left: RADAR_SIZE / 2 - 4 }]}>K</Text>
          <Text style={[styles.dirLabel, { bottom: -2, left: RADAR_SIZE / 2 - 4 }]}>G</Text>
          <Text style={[styles.dirLabel, { left: -4, top: RADAR_SIZE / 2 - 6 }]}>B</Text>
          <Text style={[styles.dirLabel, { right: -4, top: RADAR_SIZE / 2 - 6 }]}>D</Text>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#00CCFF" }]}>{targets.length}</Text>
            <Text style={styles.statLabel}>{t("radar.detected").toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rotation.toFixed(0)}°</Text>
            <Text style={styles.statLabel}>ANG</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isScanning ? "#00CCFF" : "#2A2A40" }]}>
              {isScanning ? t("radar.scanning").replace("...", "") : t("common.off").toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>{t("emf.status").toUpperCase()}</Text>
          </View>
        </View>

        {/* Hedef Listesi */}
        <View style={styles.targetList}>
          <View style={styles.targetListHeader}>
            <Text style={styles.targetListTitle}>{t("radar.detected").toUpperCase()}</Text>
            <Text style={styles.targetListCount}>{targets.length}</Text>
          </View>
          <FlatList
            data={targets}
            keyExtractor={(item) => item.id}
            style={styles.targetScroll}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.targetEmpty}>
                <Text style={styles.targetEmptyText}>
                  {isScanning ? t("radar.scanning") : t("radar.startScan")}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.targetItem}>
                <View style={[styles.targetItemDot, { backgroundColor: getTargetColor(item.strength) }]} />
                <View style={styles.targetItemInfo}>
                  <Text style={[styles.targetItemLabel, { color: getTargetColor(item.strength) }]}>
                    {getTargetLabel(item.strength)}
                  </Text>
                  <Text style={styles.targetItemMeta}>
                    {item.angle.toFixed(0)}° · {item.distance.toFixed(0)}m · %{item.strength.toFixed(0)}
                  </Text>
                </View>
                <Text style={styles.targetItemTime}>
                  {item.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </Text>
              </View>
            )}
          />
        </View>

        {/* Başlat/Durdur */}
        <Pressable
          onPress={toggleScanning}
          style={({ pressed }) => [
            styles.mainButton,
            {
              backgroundColor: isScanning ? "#0A0A14" : "#0D0D15",
              borderColor: isScanning ? "#FF333340" : "#00CCFF30",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.buttonInner, { backgroundColor: isScanning ? "#FF333315" : "#00CCFF10" }]}>
            <IconSymbol
              size={24}
              name={isScanning ? "stop.fill" : "play.fill"}
              color={isScanning ? "#FF3333" : "#00CCFF"}
            />
          </View>
          <Text style={[styles.buttonText, { color: isScanning ? "#FF3333" : "#00CCFF" }]}>
            {isScanning ? t("radar.stop") : t("radar.start")}
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

  // Radar
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  radarCircle: {
    borderRadius: RADAR_SIZE / 2,
    backgroundColor: "#0A0A12",
    borderWidth: 1,
    borderColor: "#00CCFF15",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1,
  },
  crossLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "#00CCFF08",
  },
  sweepLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#00CCFF40",
    left: RADAR_SIZE / 2,
    top: RADAR_SIZE / 2 - 1,
  },
  centerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00CCFF",
  },
  targetDot: {
    position: "absolute",
  },
  dirLabel: {
    position: "absolute",
    fontSize: 9,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 1,
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

  // Hedef listesi
  targetList: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    overflow: "hidden",
  },
  targetListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  targetListTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  targetListCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00CCFF",
  },
  targetScroll: {
    flex: 1,
  },
  targetEmpty: {
    padding: 20,
    alignItems: "center",
  },
  targetEmptyText: {
    fontSize: 11,
    color: "#2A2A40",
    letterSpacing: 1,
  },
  targetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D15",
    gap: 10,
  },
  targetItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  targetItemInfo: {
    flex: 1,
    gap: 2,
  },
  targetItemLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  targetItemMeta: {
    fontSize: 9,
    color: "#3A3A50",
    fontVariant: ["tabular-nums"],
  },
  targetItemTime: {
    fontSize: 9,
    color: "#2A2A40",
    fontVariant: ["tabular-nums"],
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
