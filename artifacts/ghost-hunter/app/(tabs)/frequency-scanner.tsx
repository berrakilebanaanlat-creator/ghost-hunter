import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { getWhisperEngine } from "@/lib/whisper-engine";

const MIN_FREQ = 76.0;
const MAX_FREQ = 108.0;
const BAR_COUNT = 12;

export default function FrequencyScanner() {
  const [active, setActive] = useState(false);
  const [freq, setFreq] = useState(87.5);
  const [signalFlash, setSignalFlash] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(2));

  const freqRef = useRef(87.5);
  const dirRef = useRef(1);
  const freqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerFlash = useCallback(() => {
    setSignalFlash(true);
    setSignalCount((c) => c + 1);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSignalFlash(false), 2500);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [flashAnim, pulseAnim]);

  const startScanning = useCallback(() => {
    setActive(true);
    getWhisperEngine().start().catch(() => {});

    freqTimerRef.current = setInterval(() => {
      freqRef.current += dirRef.current * 0.1;
      if (freqRef.current >= MAX_FREQ) { freqRef.current = MAX_FREQ; dirRef.current = -1; }
      if (freqRef.current <= MIN_FREQ) { freqRef.current = MIN_FREQ; dirRef.current = 1; }
      setFreq(Math.round(freqRef.current * 10) / 10);
    }, 80);

    barTimerRef.current = setInterval(() => {
      setBars(Array(BAR_COUNT).fill(0).map(() => Math.floor(Math.random() * 8) + 1));
    }, 150);
  }, []);

  const stopScanning = useCallback(() => {
    setActive(false);
    getWhisperEngine().stop();
    if (freqTimerRef.current) clearInterval(freqTimerRef.current);
    if (barTimerRef.current) clearInterval(barTimerRef.current);
    setBars(Array(BAR_COUNT).fill(2));
  }, []);

  useEffect(() => {
    const unsub = getWhisperEngine().onSignal(triggerFlash);
    return () => { unsub(); };
  }, [triggerFlash]);

  useEffect(() => {
    return () => {
      if (freqTimerRef.current) clearInterval(freqTimerRef.current);
      if (barTimerRef.current) clearInterval(barTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const flashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,255,136,0)", "rgba(0,255,136,0.18)"],
  });

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <Animated.View style={[styles.flashOverlay, { backgroundColor: flashColor }]} pointerEvents="none" />

      <View style={styles.container}>
        {/* Başlık */}
        <Text style={styles.title}>FREKANS TARAYICI</Text>
        <Text style={styles.subtitle}>Paranormal Sinyal Analizi</Text>

        {/* Frekans ekranı */}
        <Animated.View style={[styles.freqBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.freqLabel}>FM</Text>
          <Text style={styles.freqValue}>{freq.toFixed(1)}</Text>
          <Text style={styles.freqUnit}>MHz</Text>
        </Animated.View>

        {/* Tarama çubuğu */}
        <View style={styles.barContainer}>
          {bars.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: active ? h * 6 + 4 : 4,
                  backgroundColor: signalFlash
                    ? "#FF3366"
                    : active
                    ? i % 3 === 0
                      ? "#00FF88"
                      : "#00AA55"
                    : "#1A1A2E",
                },
              ]}
            />
          ))}
        </View>

        {/* Sinyal bildirimi */}
        {signalFlash ? (
          <View style={styles.signalBadge}>
            <Text style={styles.signalText}>⚡ SİNYAL ALINDI</Text>
          </View>
        ) : (
          <View style={styles.signalBadgeEmpty}>
            <Text style={styles.signalTextEmpty}>
              {active ? "Taranıyor..." : "Bekleniyor"}
            </Text>
          </View>
        )}

        {/* Sinyal sayacı */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{signalCount}</Text>
            <Text style={styles.statLabel}>SİNYAL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: active ? "#00FF88" : "#444" }]}>
              {active ? "AKTİF" : "KAPALI"}
            </Text>
            <Text style={styles.statLabel}>DURUM</Text>
          </View>
        </View>

        {/* Başlat / Durdur */}
        <TouchableOpacity
          style={[styles.btn, active ? styles.btnStop : styles.btnStart]}
          onPress={active ? stopScanning : startScanning}
          activeOpacity={0.75}
        >
          <Text style={styles.btnText}>
            {active ? "■  DURDUR" : "▶  TARAMAYI BAŞLAT"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Eğlence amaçlıdır. Tüm sinyaller rastgele üretilmektedir.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 18,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00FF88",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#334",
    letterSpacing: 2,
    marginTop: -10,
  },
  freqBox: {
    borderWidth: 1,
    borderColor: "#00FF8833",
    borderRadius: 12,
    backgroundColor: "#0A0A14",
    paddingVertical: 20,
    paddingHorizontal: 36,
    alignItems: "center",
    marginVertical: 4,
  },
  freqLabel: {
    fontSize: 11,
    color: "#00FF8866",
    letterSpacing: 3,
    fontWeight: "700",
  },
  freqValue: {
    fontSize: 52,
    fontWeight: "900",
    color: "#00FF88",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  freqUnit: {
    fontSize: 13,
    color: "#00FF8866",
    letterSpacing: 2,
    fontWeight: "700",
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 56,
    paddingHorizontal: 8,
  },
  bar: {
    width: 14,
    borderRadius: 3,
    minHeight: 4,
  },
  signalBadge: {
    backgroundColor: "#FF336622",
    borderWidth: 1,
    borderColor: "#FF3366",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  signalText: {
    color: "#FF3366",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  signalBadgeEmpty: {
    backgroundColor: "#0A0A14",
    borderWidth: 1,
    borderColor: "#1A1A2E",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  signalTextEmpty: {
    color: "#334",
    fontSize: 12,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  statBox: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00FF88",
  },
  statLabel: {
    fontSize: 9,
    color: "#334",
    letterSpacing: 2,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#1A1A2E",
  },
  btn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  btnStart: {
    backgroundColor: "#00FF88",
  },
  btnStop: {
    backgroundColor: "#FF3366",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  disclaimer: {
    fontSize: 9,
    color: "#222233",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 4,
  },
});
