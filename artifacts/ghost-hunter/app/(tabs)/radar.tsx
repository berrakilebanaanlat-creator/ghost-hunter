import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, Pressable, StyleSheet, Dimensions, Platform, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { Magnetometer } from "expo-sensors";
import { t } from "@/lib/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 260);
const RADAR_HALF = RADAR_SIZE / 2;

// Kalibrasyon süresi (ms) — bu süre boyunca baseline ölçülür
const CALIBRATION_MS = 3500;
// Baseline'dan bu kadar μT sapma olursa sinyal oluşur
const EMF_THRESHOLD_LOW = 4;    // düşük sinyal
const EMF_THRESHOLD_MED = 10;   // orta sinyal
const EMF_THRESHOLD_HIGH = 22;  // güçlü sinyal
// Aynı yönde art arda kaç ölçüm gerekli (debounce)
const DEBOUNCE_COUNT = 2;
// Bir sinyal oluştuktan sonra ne kadar süre cooldown (ms)
const SPAWN_COOLDOWN = 6000;
// Hedefin radar üzerinde kalma süresi (ms)
const TARGET_LIFETIME = 12000;

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  strength: number;
  emfMicrotesla: number;
  timestamp: Date;
  expiresAt: number;
}

interface MagReading {
  x: number;
  y: number;
  z: number;
}

function magnitude(r: MagReading) {
  return Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
}

// Magnetometer x,y'den pusula açısı (0=Kuzey, 90=Doğu, saat yönü)
function compassBearing(r: MagReading) {
  let angle = Math.atan2(r.y, r.x) * (180 / Math.PI);
  angle = (angle + 360) % 360;
  return angle;
}

export default function RadarScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [targets, setTargets] = useState<RadarTarget[]>([]);
  const [rotation, setRotation] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Magnetometre durumu
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0); // 0-100
  const [currentEmf, setCurrentEmf] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const magSubscriptionRef = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);

  // Kalibrasyon verileri
  const calibrationReadings = useRef<number[]>([]);
  const calibrationStartRef = useRef<number>(0);
  const baselineMagnitude = useRef<number>(0);
  const lastReading = useRef<MagReading>({ x: 0, y: 0, z: 0 });
  const lastSpawnTime = useRef<number>(0);
  const debounceBuffer = useRef<number[]>([]); // son N okumada eşik aşıldı mı

  // Animasyon accumulators
  const rotationAccRef = useRef(0);
  const pulseAccRef = useRef(0);

  // Hedef oluştur (sensör tetikli)
  const spawnTarget = useCallback((delta: number, reading: MagReading) => {
    const now = Date.now();
    if (now - lastSpawnTime.current < SPAWN_COOLDOWN) return;
    lastSpawnTime.current = now;

    const angle = compassBearing(reading);
    // Sinyal gücü kuvvetliyse daha yakın göster
    const normalizedStrength = Math.min(1, delta / 40);
    const distance = Math.max(10, 90 - normalizedStrength * 75);
    const strengthPct = Math.min(100, (delta / EMF_THRESHOLD_HIGH) * 100);
    const emfMicrotesla = baselineMagnitude.current + delta;

    const newTarget: RadarTarget = {
      id: `${now}_${Math.random().toString(36).slice(2, 5)}`,
      angle,
      distance,
      strength: strengthPct,
      emfMicrotesla,
      timestamp: new Date(),
      expiresAt: now + TARGET_LIFETIME,
    };

    if (Platform.OS !== "web" && strengthPct > 50) {
      Haptics.impactAsync(
        strengthPct > 75
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    }

    setTargets((prev) => {
      const alive = prev.filter((t) => t.expiresAt > now);
      return [...alive, newTarget].slice(-6);
    });
  }, []);

  // Magnetometre aboneliği başlat
  const startMagnetometer = useCallback(() => {
    Magnetometer.setUpdateInterval(200);
    calibrationReadings.current = [];
    calibrationStartRef.current = Date.now();
    baselineMagnitude.current = 0;
    debounceBuffer.current = [];
    setIsCalibrating(true);
    setCalibrationProgress(0);

    magSubscriptionRef.current = Magnetometer.addListener((data) => {
      lastReading.current = data;
      const mag = magnitude(data);
      setCurrentEmf(mag);

      const elapsed = Date.now() - calibrationStartRef.current;

      if (elapsed < CALIBRATION_MS) {
        // Kalibrasyon fazı: baseline hesapla
        calibrationReadings.current.push(mag);
        setCalibrationProgress(Math.min(100, (elapsed / CALIBRATION_MS) * 100));
      } else {
        if (isCalibrating) {
          // Kalibrasyon bitti — ortalama al
          const sum = calibrationReadings.current.reduce((a, b) => a + b, 0);
          baselineMagnitude.current =
            calibrationReadings.current.length > 0
              ? sum / calibrationReadings.current.length
              : mag;
          setIsCalibrating(false);
        }

        if (baselineMagnitude.current === 0) return;

        // Mevcut okuma ile baseline arasındaki sapma
        const delta = Math.abs(mag - baselineMagnitude.current);

        // Debounce: yeterince ardışık ölçüm gerekli
        debounceBuffer.current.push(delta >= EMF_THRESHOLD_LOW ? 1 : 0);
        if (debounceBuffer.current.length > DEBOUNCE_COUNT + 2) {
          debounceBuffer.current.shift();
        }
        const aboveThreshold = debounceBuffer.current
          .slice(-DEBOUNCE_COUNT)
          .every((v) => v === 1);

        if (aboveThreshold && delta >= EMF_THRESHOLD_LOW) {
          spawnTarget(delta, data);
        }
      }
    });
  }, [isCalibrating, spawnTarget]);

  // Magnetometre aboneliğini durdur
  const stopMagnetometer = useCallback(() => {
    magSubscriptionRef.current?.remove();
    magSubscriptionRef.current = null;
    setIsCalibrating(false);
    setCalibrationProgress(0);
    setCurrentEmf(0);
    baselineMagnitude.current = 0;
    debounceBuffer.current = [];
  }, []);

  // Sensör müsaitliğini kontrol et
  useEffect(() => {
    Magnetometer.isAvailableAsync().then((avail) => {
      setSensorAvailable(avail);
    }).catch(() => setSensorAvailable(false));
  }, []);

  // RAF animasyon döngüsü (sadece görsel)
  const animateFrame = useCallback((time: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(animateFrame);
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    rotationAccRef.current += deltaTime;
    if (rotationAccRef.current >= 80) {
      const steps = Math.floor(rotationAccRef.current / 80);
      rotationAccRef.current -= steps * 80;
      setRotation((prev) => (prev + steps * 3) % 360);
    }

    pulseAccRef.current += deltaTime;
    if (pulseAccRef.current >= 50) {
      const steps = Math.floor(pulseAccRef.current / 50);
      pulseAccRef.current -= steps * 50;
      setPulsePhase((p) => (p + steps) % 100);
    }

    // Süresi dolan hedefleri temizle
    const now = Date.now();
    setTargets((prev) => prev.filter((t) => t.expiresAt > now));

    rafRef.current = requestAnimationFrame(animateFrame);
  }, []);

  // Tarama başlat/durdur
  useEffect(() => {
    if (isScanning) {
      lastTimeRef.current = null;
      rotationAccRef.current = 0;
      pulseAccRef.current = 0;
      rafRef.current = requestAnimationFrame(animateFrame);

      if (sensorAvailable) {
        startMagnetometer();
      }
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      setPulsePhase(0);
      stopMagnetometer();
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isScanning, animateFrame, sensorAvailable, startMagnetometer, stopMagnetometer]);

  // Süre sayacı
  useEffect(() => {
    if (isScanning) {
      timerRef.current = setInterval(() => {
        setElapsedTime((s) => s + 1);
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
    if (strength > 35) return "#FFCC00";
    return "#00CCFF";
  };

  const getTargetLabel = (strength: number) => {
    if (strength > 70) return "EMF YÜKSEK";
    if (strength > 35) return "EMF ORTA";
    return "EMF DÜŞÜK";
  };

  const toggleScanning = () => {
    if (isScanning) {
      setIsScanning(false);
      setTargets([]);
      setElapsedTime(0);
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
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Kalibrasyon durumu etiketi
  const statusLabel = () => {
    if (!isScanning) return t("common.off").toUpperCase();
    if (!sensorAvailable) return "SİMÜLASYON";
    if (isCalibrating) return `KALİBRASYON %${calibrationProgress.toFixed(0)}`;
    return "EMF TARAMA";
  };

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerDot, { backgroundColor: isScanning ? "#00CCFF" : "#2A2A40", opacity: pulseOpacity + 0.5 }]} />
            <Text style={styles.headerTitle}>RADAR</Text>
            <Text style={styles.headerSub}>EMF DEDEKTÖR</Text>
          </View>
          <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
        </View>

        {/* Kalibrasyon çubuğu */}
        {isScanning && isCalibrating && (
          <View style={styles.calibBar}>
            <View style={[styles.calibFill, { width: `${calibrationProgress}%` }]} />
            <Text style={styles.calibText}>KALİBRASYON — ORTAM ÖLÇÜLİYOR...</Text>
          </View>
        )}

        {/* EMF anlık okuma */}
        {isScanning && !isCalibrating && sensorAvailable && (
          <View style={styles.emfReadout}>
            <Text style={styles.emfLabel}>ALAN</Text>
            <Text style={[
              styles.emfValue,
              { color: currentEmf > (baselineMagnitude.current + EMF_THRESHOLD_HIGH)
                ? "#FF3333"
                : currentEmf > (baselineMagnitude.current + EMF_THRESHOLD_MED)
                  ? "#FFCC00"
                  : "#00CCFF" },
            ]}>
              {currentEmf.toFixed(1)} μT
            </Text>
            <Text style={styles.emfLabel}>BASE {baselineMagnitude.current.toFixed(1)} μT</Text>
          </View>
        )}

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
              const dotSize = target.strength > 70 ? 9 : target.strength > 35 ? 6 : 4;
              const color = getTargetColor(target.strength);

              // Hedef soluklaşma (zaman kalan oranına göre)
              const remaining = Math.max(0, target.expiresAt - Date.now());
              const fadeOpacity = Math.min(1, remaining / 2000);

              return (
                <View
                  key={target.id}
                  style={[
                    styles.targetDot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: color,
                      left: RADAR_HALF + x - dotSize / 2,
                      top: RADAR_HALF + y - dotSize / 2,
                      opacity: fadeOpacity,
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
            <Text style={styles.statValue}>
              {isScanning && !isCalibrating && baselineMagnitude.current > 0
                ? `${Math.abs(currentEmf - baselineMagnitude.current).toFixed(1)}μT`
                : "---"}
            </Text>
            <Text style={styles.statLabel}>SAPMA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isScanning ? "#00CCFF" : "#2A2A40" }]}>
              {statusLabel()}
            </Text>
            <Text style={styles.statLabel}>{t("emf.status").toUpperCase()}</Text>
          </View>
        </View>

        {/* Hedef Listesi */}
        <View style={styles.targetList}>
          <View style={styles.targetListHeader}>
            <Text style={styles.targetListTitle}>ALGILANAN EMF SİNYALLERİ</Text>
            <Text style={styles.targetListCount}>{targets.length}</Text>
          </View>
          <FlatList
            data={[...targets].reverse()}
            keyExtractor={(item) => item.id}
            style={styles.targetScroll}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.targetEmpty}>
                <Text style={styles.targetEmptyText}>
                  {isScanning
                    ? isCalibrating
                      ? "Ortam kalibre ediliyor..."
                      : "Elektromanyetik alan izleniyor..."
                    : t("radar.startScan")}
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
                    {item.angle.toFixed(0)}° · {item.distance.toFixed(0)}m · {item.emfMicrotesla.toFixed(1)} μT
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
    gap: 10,
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

  // Kalibrasyon
  calibBar: {
    height: 20,
    backgroundColor: "#0A0A12",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#00CCFF20",
    justifyContent: "center",
  },
  calibFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#00CCFF18",
  },
  calibText: {
    fontSize: 8,
    fontWeight: "600",
    color: "#00CCFF80",
    letterSpacing: 2,
    textAlign: "center",
  },

  // EMF anlık okuma
  emfReadout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  emfLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  emfValue: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },

  // Radar
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
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
    fontSize: 13,
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
    fontSize: 9,
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
