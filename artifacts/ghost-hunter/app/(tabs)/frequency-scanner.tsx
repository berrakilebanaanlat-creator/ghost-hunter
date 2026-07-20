import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenContainer } from "@/components/screen-container";
import { getWhisperEngine } from "@/lib/whisper-engine";

const MIN_FREQ = 76.0;
const MAX_FREQ = 108.0;
const EQ_BARS = 28;

export default function FrequencyScanner() {
  const [active, setActive] = useState(false);
  const [freq, setFreq] = useState(87.5);
  const [signalFlash, setSignalFlash] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const [eqBars, setEqBars] = useState<number[]>(Array(EQ_BARS).fill(0.05));
  const [noiseVolume, setNoiseVolumeState] = useState(
    Math.max(0.1, getWhisperEngine().getNoiseVolume())
  );

  const freqRef = useRef(87.5);
  const dirRef = useRef(1);
  const freqTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eqTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const eqAnims = useRef(
    Array(EQ_BARS).fill(null).map(() => new Animated.Value(0.05))
  ).current;

  const animateEq = useCallback(
    (values: number[]) => {
      const animations = eqAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: values[i],
          duration: 120,
          useNativeDriver: false,
          easing: Easing.out(Easing.quad),
        })
      );
      Animated.parallel(animations).start();
    },
    [eqAnims]
  );

  const triggerSignal = useCallback(() => {
    setSignalFlash(true);
    setSignalCount((c) => c + 1);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSignalFlash(false), 2800);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Ekolayzer ani spike
    const spike = Array(EQ_BARS).fill(0).map(() => Math.random() * 0.9 + 0.1);
    animateEq(spike);
  }, [flashAnim, scaleAnim, animateEq]);

  const startScanning = useCallback(() => {
    setActive(true);
    getWhisperEngine().start().catch(() => {});

    freqTimer.current = setInterval(() => {
      freqRef.current += dirRef.current * 0.1;
      if (freqRef.current >= MAX_FREQ) { freqRef.current = MAX_FREQ; dirRef.current = -1; }
      if (freqRef.current <= MIN_FREQ) { freqRef.current = MIN_FREQ; dirRef.current = 1; }
      setFreq(Math.round(freqRef.current * 10) / 10);
    }, 80);

    eqTimer.current = setInterval(() => {
      const vals = Array(EQ_BARS).fill(0).map(() => Math.random() * 0.55 + 0.05);
      animateEq(vals);
    }, 130);
  }, [animateEq]);

  const stopScanning = useCallback(() => {
    setActive(false);
    getWhisperEngine().stop();
    if (freqTimer.current) clearInterval(freqTimer.current);
    if (eqTimer.current) clearInterval(eqTimer.current);
    animateEq(Array(EQ_BARS).fill(0.05));
  }, [animateEq]);

  const handleVolumeChange = useCallback((val: number) => {
    setNoiseVolumeState(val);
    getWhisperEngine().setNoiseVolume(val);
  }, []);

  useEffect(() => {
    const unsub = getWhisperEngine().onSignal(triggerSignal);
    return () => unsub();
  }, [triggerSignal]);

  useEffect(() => {
    return () => {
      if (freqTimer.current) clearInterval(freqTimer.current);
      if (eqTimer.current) clearInterval(eqTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,255,136,0)", "rgba(0,255,136,0.15)"],
  });

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <Animated.View style={[styles.flashOverlay, { backgroundColor: flashBg }]} pointerEvents="none" />

      <View style={styles.container}>
        {/* Başlık */}
        <Text style={styles.title}>FREKANS TARAYICI</Text>
        <Text style={styles.subtitle}>Paranormal Sinyal Analizi</Text>

        {/* Frekans ekranı */}
        <Animated.View style={[styles.freqBox, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.freqLabel}>FM</Text>
          <Text style={styles.freqValue}>{freq.toFixed(1)}</Text>
          <Text style={styles.freqUnit}>MHz</Text>
        </Animated.View>

        {/* Ekolayzer */}
        <View style={styles.eqContainer}>
          {eqAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.eqBar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 56],
                  }),
                  backgroundColor: signalFlash
                    ? "#FF3366"
                    : active
                    ? i % 4 === 0
                      ? "#FFFFFF"
                      : "#00FF88"
                    : "#1A1A2E",
                  opacity: active ? (signalFlash ? 1 : 0.85) : 0.3,
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

        {/* Ses seviyesi slider */}
        <View style={styles.sliderBox}>
          <Text style={styles.sliderLabel}>
            WHITE NOISE SEVİYESİ: {Math.round(noiseVolume * 100)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1}
            value={noiseVolume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="#00FF88"
            maximumTrackTintColor="#1A1A2E"
            thumbTintColor="#00FF88"
          />
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
    paddingHorizontal: 20,
    gap: 14,
    zIndex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#00FF88",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#334",
    letterSpacing: 2,
    marginTop: -8,
  },
  freqBox: {
    borderWidth: 1,
    borderColor: "#00FF8833",
    borderRadius: 12,
    backgroundColor: "#0A0A14",
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  freqLabel: {
    fontSize: 10,
    color: "#00FF8866",
    letterSpacing: 3,
    fontWeight: "700",
  },
  freqValue: {
    fontSize: 50,
    fontWeight: "900",
    color: "#00FF88",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  freqUnit: {
    fontSize: 12,
    color: "#00FF8866",
    letterSpacing: 2,
    fontWeight: "700",
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 60,
    paddingHorizontal: 4,
  },
  eqBar: {
    width: 7,
    borderRadius: 2,
    minHeight: 2,
  },
  signalBadge: {
    backgroundColor: "#FF336622",
    borderWidth: 1,
    borderColor: "#FF3366",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 18,
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
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  signalTextEmpty: {
    color: "#334",
    fontSize: 11,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBox: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  statValue: {
    fontSize: 20,
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
    height: 28,
    backgroundColor: "#1A1A2E",
  },
  sliderBox: {
    width: "100%",
    backgroundColor: "#0A0A14",
    borderWidth: 1,
    borderColor: "#1A1A2E",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sliderLabel: {
    fontSize: 10,
    color: "#00FF8888",
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 2,
  },
  slider: {
    width: "100%",
    height: 36,
  },
  btn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
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
    color: "#1A1A2E",
    textAlign: "center",
    letterSpacing: 1,
  },
});
