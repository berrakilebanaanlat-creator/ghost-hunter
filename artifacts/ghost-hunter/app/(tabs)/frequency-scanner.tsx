/**
 * Frekans Tarayıcı (Frequency Scanner) - Antik Ghost Hunter
 *
 * Paranormal frekans tarama ekranı.
 * - AM (530-1700 kHz) ve FM (87.5-108 MHz) bant seçimi
 * - 10sn, 30sn, 50sn gibi rastgele aralıklarla sinyal tespiti
 * - Cızırtı/parazit ses efektleri (mp3 dosyaları)
 * - Manuel frekans ayarlama
 * - Dijital frekans göstergesi
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useAds } from "@/lib/ad-context";
import { useRouter } from "expo-router";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Band = "AM" | "FM";
type ScanState = "idle" | "scanning" | "detected";

interface SignalDetection {
  id: string;
  frequency: number;
  band: Band;
  strength: number;
  timestamp: number;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;

const BANDS = {
  AM: { min: 530, max: 1700, unit: "kHz", step: 10 },
  FM: { min: 87.5, max: 108.0, unit: "MHz", step: 0.1 },
};

const DETECTION_INTERVALS = [
  10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
];

const PARANORMAL_FREQUENCIES = {
  AM: [666, 777, 1111, 1313, 1408, 999, 616, 1234],
  FM: [91.1, 93.3, 96.6, 99.9, 100.1, 104.4, 107.7],
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function FrequencyScanner() {
  const { isScannerPurchased } = useAds();
  const router = useRouter();

  const [band, setBand] = useState<Band>("FM");
  const [frequency, setFrequency] = useState<number>(BANDS.FM.min);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [signalStrength, setSignalStrength] = useState<number>(0);
  const [detections, setDetections] = useState<SignalDetection[]>([]);
  const [scanDirection, setScanDirection] = useState<1 | -1>(1);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanStateRef = useRef<ScanState>("idle");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const noiseAnim = useRef(new Animated.Value(0.3)).current;
  const detectedFlashAnim = useRef(new Animated.Value(0)).current;

  const staticPlayer = useAudioPlayer(
    require("@/assets/sounds/static_loop.mp3")
  );
  const detectionPlayer = useAudioPlayer(
    require("@/assets/sounds/fm_static.mp3")
  );

  // scanState değişince ref'i güncelle (closure'larda stale olmaz)
  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  // ─── AUDIO SETUP ────────────────────────────────────────────────────────────

  useEffect(() => {
    setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => {
      try { staticPlayer.release(); } catch {}
      try { detectionPlayer.release(); } catch {}
    };
  }, []);

  // ─── ANIMATIONS ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (scanState === "scanning") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(noiseAnim, {
            toValue: 0.6,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(noiseAnim, {
            toValue: 0.2,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      noiseAnim.stopAnimation();
      noiseAnim.setValue(0.3);
    }
  }, [scanState]);

  // ─── DETECTION LOGIC ────────────────────────────────────────────────────────

  const getRandomInterval = useCallback(() => {
    return DETECTION_INTERVALS[Math.floor(Math.random() * DETECTION_INTERVALS.length)];
  }, []);

  const scheduleNextDetection = useCallback((currentBand: Band) => {
    if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    const interval = getRandomInterval();
    detectionTimeoutRef.current = setTimeout(() => {
      if (scanStateRef.current !== "scanning") return;

      const freqs = PARANORMAL_FREQUENCIES[currentBand];
      const detectedFreq = freqs[Math.floor(Math.random() * freqs.length)];
      const strength = 40 + Math.floor(Math.random() * 60);

      setFrequency(detectedFreq);
      setSignalStrength(strength);
      setScanState("detected");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      Animated.sequence([
        Animated.timing(detectedFlashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(detectedFlashAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(detectedFlashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(detectedFlashAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]).start();

      try {
        detectionPlayer.seekTo(0);
        detectionPlayer.play();
      } catch {}

      setDetections((prev) => [
        {
          id: Date.now().toString(),
          frequency: detectedFreq,
          band: currentBand,
          strength,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 5));

      setTimeout(() => {
        if (scanStateRef.current === "detected" || scanStateRef.current === "scanning") {
          setScanState("scanning");
          setSignalStrength(0);
          scheduleNextDetection(currentBand);
        }
      }, 3000);
    }, interval);
  }, [getRandomInterval]);

  // ─── SCAN CONTROL ──────────────────────────────────────────────────────────

  const startScan = useCallback(() => {
    setScanState("scanning");
    setSignalStrength(0);

    try {
      staticPlayer.loop = true;
      staticPlayer.volume = 0.4;
      staticPlayer.play();
    } catch {}

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const currentBand = band;
    const bandConfig = BANDS[currentBand];

    scanIntervalRef.current = setInterval(() => {
      setFrequency((prev) => {
        setScanDirection((dir) => {
          let next = prev + bandConfig.step * dir * (1 + Math.random() * 2);
          if (next >= bandConfig.max) {
            next = bandConfig.max;
            return -1;
          }
          if (next <= bandConfig.min) {
            next = bandConfig.min;
            return 1;
          }
          return dir;
        });
        return prev;
      });
      setFrequency((prev) => {
        const dir = scanDirection;
        const next = prev + bandConfig.step * dir * (1 + Math.random() * 2);
        return Math.max(bandConfig.min, Math.min(bandConfig.max, Math.round(next * 10) / 10));
      });
    }, 150);

    scheduleNextDetection(currentBand);
  }, [band, scheduleNextDetection]);

  const stopScan = useCallback(() => {
    setScanState("idle");
    setSignalStrength(0);

    try { staticPlayer.pause(); } catch {}

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
      try { staticPlayer.pause(); } catch {}
    };
  }, []);

  // ─── MANUAL FREQUENCY CONTROL ──────────────────────────────────────────────

  const adjustFrequency = (direction: 1 | -1) => {
    if (scanState !== "idle") return;
    const bandConfig = BANDS[band];
    setFrequency((prev) => {
      const next = prev + bandConfig.step * direction * 5;
      return Math.max(bandConfig.min, Math.min(bandConfig.max, Math.round(next * 10) / 10));
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ─── BAND SWITCH ───────────────────────────────────────────────────────────

  const switchBand = (newBand: Band) => {
    if (scanState !== "idle") return;
    setBand(newBand);
    setFrequency(BANDS[newBand].min);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  const formatFrequency = (freq: number, b: Band) => {
    if (b === "AM") return `${Math.round(freq)}`;
    return freq.toFixed(1);
  };

  const getStrengthColor = (strength: number) => {
    if (strength > 75) return "#FF3333";
    if (strength > 50) return "#FF8800";
    if (strength > 25) return "#FFCC00";
    return "#00FF88";
  };

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}sn önce`;
    return `${Math.floor(seconds / 60)}dk önce`;
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  const bandConfig = BANDS[band];
  const isActive = scanState !== "idle";
  const isDetected = scanState === "detected";

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FREKANS TARAYICI</Text>
          <Text style={styles.headerSubtitle}>Paranormal Sinyal Avcısı</Text>
        </View>

        {/* BAND SELECTOR */}
        <View style={styles.bandSelector}>
          <Pressable
            onPress={() => switchBand("AM")}
            style={({ pressed }) => [
              styles.bandBtn,
              band === "AM" && styles.bandBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.bandBtnText, band === "AM" && styles.bandBtnTextActive]}>AM</Text>
            <Text style={styles.bandRange}>530-1700 kHz</Text>
          </Pressable>
          <Pressable
            onPress={() => switchBand("FM")}
            style={({ pressed }) => [
              styles.bandBtn,
              band === "FM" && styles.bandBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.bandBtnText, band === "FM" && styles.bandBtnTextActive]}>FM</Text>
            <Text style={styles.bandRange}>87.5-108 MHz</Text>
          </Pressable>
        </View>

        {/* FREQUENCY DISPLAY */}
        <Animated.View
          style={[
            styles.frequencyDisplay,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: isDetected ? "#9B4FDE" : "#00FF88",
            },
          ]}
        >
          <Animated.View style={[styles.flashOverlay, { opacity: detectedFlashAnim }]} />

          <Text style={styles.frequencyLabel}>{band} FREKANS</Text>
          <View style={styles.frequencyRow}>
            <Text style={[styles.frequencyValue, isDetected && { color: "#9B4FDE" }]}>
              {formatFrequency(frequency, band)}
            </Text>
            <Text style={styles.frequencyUnit}>{bandConfig.unit}</Text>
          </View>

          {signalStrength > 0 && (
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>SİNYAL GÜCÜ</Text>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    { width: `${signalStrength}%`, backgroundColor: getStrengthColor(signalStrength) },
                  ]}
                />
              </View>
              <Text style={[styles.strengthValue, { color: getStrengthColor(signalStrength) }]}>
                {signalStrength}%
              </Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isDetected ? "#9B4FDE" : isActive ? "#00FF88" : "#333" },
              ]}
            />
            <Text style={styles.statusText}>
              {isDetected ? "⚡ SİNYAL TESPİT EDİLDİ" : isActive ? "Taranıyor..." : "Bekleniyor"}
            </Text>
          </View>
        </Animated.View>

        {/* SPECTRUM VISUALIZER */}
        <Animated.View style={[styles.spectrum, { opacity: noiseAnim }]}>
          {Array.from({ length: 32 }).map((_, i) => {
            const height = isActive ? 4 + Math.random() * (isDetected ? 40 : 20) : 4;
            return (
              <View
                key={i}
                style={[
                  styles.spectrumBar,
                  {
                    height,
                    backgroundColor: isDetected
                      ? i % 3 === 0 ? "#9B4FDE" : "#6B2FA0"
                      : i % 4 === 0 ? "#00FF88" : "#004D29",
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* CONTROLS */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => adjustFrequency(-1)}
            disabled={isActive}
            style={({ pressed }) => [
              styles.adjustBtn,
              pressed && { opacity: 0.6 },
              isActive && { opacity: 0.3 },
            ]}
          >
            <Text style={styles.adjustBtnText}>◀</Text>
          </Pressable>

          <Pressable
            onPress={isActive ? stopScan : startScan}
            style={({ pressed }) => [
              styles.scanBtn,
              isActive && styles.scanBtnActive,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.scanBtnText}>{isActive ? "DURDUR" : "TARA"}</Text>
            <Text style={styles.scanBtnSubtext}>{isActive ? "Tarama aktif" : "Başlat"}</Text>
          </Pressable>

          <Pressable
            onPress={() => adjustFrequency(1)}
            disabled={isActive}
            style={({ pressed }) => [
              styles.adjustBtn,
              pressed && { opacity: 0.6 },
              isActive && { opacity: 0.3 },
            ]}
          >
            <Text style={styles.adjustBtnText}>▶</Text>
          </Pressable>
        </View>

        {/* DETECTION HISTORY */}
        {detections.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Son Tespitler</Text>
            {detections.map((d) => (
              <View key={d.id} style={styles.historyItem}>
                <View style={styles.historyDot} />
                <Text style={styles.historyFreq}>
                  {formatFrequency(d.frequency, d.band)} {BANDS[d.band].unit}
                </Text>
                <View style={[styles.historyStrength, { backgroundColor: getStrengthColor(d.strength) }]}>
                  <Text style={styles.historyStrengthText}>{d.strength}%</Text>
                </View>
                <Text style={styles.historyTime}>{getTimeSince(d.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060609",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00FF88",
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#4A4A5A",
    marginTop: 2,
    letterSpacing: 1,
  },
  bandSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  bandBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1A1A2E",
    backgroundColor: "#0A0A12",
    alignItems: "center",
  },
  bandBtnActive: {
    borderColor: "#00FF88",
    backgroundColor: "#001A0D",
  },
  bandBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A4A5A",
  },
  bandBtnTextActive: {
    color: "#00FF88",
  },
  bandRange: {
    fontSize: 10,
    color: "#3A3A4A",
    marginTop: 2,
  },
  frequencyDisplay: {
    backgroundColor: "#0A0A12",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#9B4FDE",
    borderRadius: 16,
  },
  frequencyLabel: {
    fontSize: 11,
    color: "#4A4A5A",
    letterSpacing: 2,
    marginBottom: 4,
  },
  frequencyRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  frequencyValue: {
    fontSize: 56,
    fontWeight: "200",
    color: "#00FF88",
    fontVariant: ["tabular-nums"],
  },
  frequencyUnit: {
    fontSize: 16,
    color: "#00FF88",
    marginLeft: 8,
    opacity: 0.6,
  },
  strengthContainer: {
    width: "100%",
    marginTop: 16,
    alignItems: "center",
  },
  strengthLabel: {
    fontSize: 10,
    color: "#4A4A5A",
    letterSpacing: 1,
    marginBottom: 6,
  },
  strengthBarBg: {
    width: "80%",
    height: 6,
    backgroundColor: "#1A1A2E",
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  strengthValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#6A6A7A",
    letterSpacing: 0.5,
  },
  spectrum: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 44,
    gap: 2,
    marginBottom: 20,
  },
  spectrumBar: {
    width: (SCREEN_WIDTH - 80) / 32,
    borderRadius: 1,
    minHeight: 3,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 24,
  },
  adjustBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0A0A12",
    borderWidth: 1,
    borderColor: "#1A1A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustBtnText: {
    fontSize: 18,
    color: "#00FF88",
  },
  scanBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#001A0D",
    borderWidth: 2,
    borderColor: "#00FF88",
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnActive: {
    backgroundColor: "#1A0020",
    borderColor: "#9B4FDE",
  },
  scanBtnText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00FF88",
    letterSpacing: 2,
  },
  scanBtnSubtext: {
    fontSize: 10,
    color: "#4A4A5A",
    marginTop: 2,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1A2E",
  },
  historyTitle: {
    fontSize: 12,
    color: "#4A4A5A",
    letterSpacing: 1,
    marginBottom: 10,
    fontWeight: "600",
  },
  paywallContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  paywallIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00D4FF10",
    borderWidth: 1,
    borderColor: "#00D4FF30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  paywallIconText: {
    fontSize: 36,
  },
  paywallTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00D4FF",
    letterSpacing: 4,
    textAlign: "center",
  },
  paywallSubtitle: {
    fontSize: 12,
    color: "#5A5A70",
    letterSpacing: 1,
    textAlign: "center",
  },
  paywallDesc: {
    fontSize: 12,
    color: "#3A3A50",
    textAlign: "center",
    lineHeight: 20,
  },
  paywallFeatures: {
    gap: 6,
    width: "100%",
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00D4FF20",
    padding: 14,
  },
  paywallFeature: {
    fontSize: 12,
    color: "#00D4FF80",
    letterSpacing: 0.5,
  },
  paywallBtn: {
    backgroundColor: "#00D4FF15",
    borderWidth: 1,
    borderColor: "#00D4FF40",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  paywallBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00D4FF",
    letterSpacing: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1A1A2E",
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9B4FDE",
    marginRight: 10,
  },
  historyFreq: {
    flex: 1,
    fontSize: 14,
    color: "#CCCCDD",
    fontVariant: ["tabular-nums"],
  },
  historyStrength: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  historyStrengthText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#060609",
  },
  historyTime: {
    fontSize: 10,
    color: "#4A4A5A",
  },
});
