import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
} from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import Slider from "@react-native-community/slider";
import { ScreenContainer } from "@/components/screen-container";
import { getWhisperEngine } from "@/lib/whisper-engine";

const { width: SW } = Dimensions.get("window");
const CIRCLE_SIZE = Math.min(SW * 0.76, 280);
const CX = CIRCLE_SIZE / 2;
const CY = CIRCLE_SIZE / 2;
const R = CIRCLE_SIZE / 2 - 12;
const EQ_BARS = 52;

const FREQ_LABELS = ["0", "2K", "4K", "6K", "8K", "10K", "12K", "14K", "16K"];

function generateBars(active: boolean, signal: boolean): number[] {
  return Array(EQ_BARS)
    .fill(0)
    .map((_, i) => {
      if (!active) return Math.random() * 0.04 + 0.01;
      const center = EQ_BARS * 0.42;
      const spread = EQ_BARS * 0.26;
      const envelope = Math.exp(-Math.pow(i - center, 2) / (2 * spread * spread));
      const noise = Math.random();
      if (signal) return Math.min(1, envelope * (noise * 0.5 + 0.5) + noise * 0.25);
      return envelope * (noise * 0.5 + 0.08) + noise * 0.09;
    });
}

interface MandalaProps {
  glowOpacity: number;
  signalFlash: boolean;
  active: boolean;
}

function Mandala({ glowOpacity, signalFlash, active }: MandalaProps) {
  const blue = signalFlash ? "#FF3366" : "#2255FF";
  const blueLight = signalFlash ? "#FF6688" : "#4488FF";
  const blueFaint = signalFlash ? "#FF336611" : "#2255FF11";

  const eyeW = R * 0.3;
  const eyeH = R * 0.12;

  const eyePath = [
    `M ${CX - eyeW} ${CY}`,
    `Q ${CX} ${CY - eyeH * 2} ${CX + eyeW} ${CY}`,
    `Q ${CX} ${CY + eyeH * 2} ${CX - eyeW} ${CY}`,
    "Z",
  ].join(" ");

  const diamondPts = (r: number) =>
    `${CX},${CY - r} ${CX + r},${CY} ${CX},${CY + r} ${CX - r},${CY}`;

  return (
    <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={signalFlash ? "#FF3366" : "#0033CC"} stopOpacity={glowOpacity * 0.22} />
            <Stop offset="70%" stopColor="#000820" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Background glow */}
        <Circle cx={CX} cy={CY} r={R + 30} fill="url(#bg)" />

        {/* Outer soft glow rings */}
        <Circle cx={CX} cy={CY} r={R + 20} stroke={blue} strokeWidth={28} fill="none" opacity={glowOpacity * 0.04} />
        <Circle cx={CX} cy={CY} r={R + 10} stroke={blue} strokeWidth={16} fill="none" opacity={glowOpacity * 0.08} />
        <Circle cx={CX} cy={CY} r={R + 4} stroke={blueLight} strokeWidth={8} fill="none" opacity={glowOpacity * 0.14} />

        {/* Main outer ring */}
        <Circle cx={CX} cy={CY} r={R} stroke={blueLight} strokeWidth={1.8} fill="none" opacity={0.88} />

        {/* Cross lines (full span) */}
        <Line x1={0} y1={CY} x2={CIRCLE_SIZE} y2={CY} stroke={blue} strokeWidth={0.8} opacity={0.3} />
        <Line x1={CX} y1={0} x2={CX} y2={CIRCLE_SIZE} stroke={blue} strokeWidth={0.8} opacity={0.3} />

        {/* Diagonal cross */}
        <Line x1={CX - R * 0.72} y1={CY - R * 0.72} x2={CX + R * 0.72} y2={CY + R * 0.72} stroke={blue} strokeWidth={0.6} opacity={0.2} />
        <Line x1={CX + R * 0.72} y1={CY - R * 0.72} x2={CX - R * 0.72} y2={CY + R * 0.72} stroke={blue} strokeWidth={0.6} opacity={0.2} />

        {/* Outer diamond */}
        <Polygon points={diamondPts(R * 0.75)} stroke={blue} strokeWidth={0.9} fill="none" opacity={0.45} />

        {/* Middle ring */}
        <Circle cx={CX} cy={CY} r={R * 0.72} stroke={blue} strokeWidth={1} fill="none" opacity={0.45} />

        {/* Inner diamond */}
        <Polygon points={diamondPts(R * 0.46)} stroke={blueLight} strokeWidth={0.8} fill="none" opacity={0.4} />

        {/* Inner circle */}
        <Circle cx={CX} cy={CY} r={R * 0.44} stroke={blueLight} strokeWidth={1.4} fill="none" opacity={0.65} />

        {/* Very inner ring around eye */}
        <Circle cx={CX} cy={CY} r={R * 0.2} stroke={blue} strokeWidth={0.8} fill="none" opacity={0.5} />

        {/* Cardinal tick marks */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          return (
            <Line
              key={angle}
              x1={CX + R * Math.cos(rad)}
              y1={CY + R * Math.sin(rad)}
              x2={CX + (R + 9) * Math.cos(rad)}
              y2={CY + (R + 9) * Math.sin(rad)}
              stroke={blueLight}
              strokeWidth={2.5}
              opacity={0.9}
            />
          );
        })}

        {/* 45° tick marks */}
        {[45, 135, 225, 315].map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          return (
            <Line
              key={angle}
              x1={CX + R * Math.cos(rad)}
              y1={CY + R * Math.sin(rad)}
              x2={CX + (R + 5) * Math.cos(rad)}
              y2={CY + (R + 5) * Math.sin(rad)}
              stroke={blue}
              strokeWidth={1.2}
              opacity={0.6}
            />
          );
        })}

        {/* Cardinal dots */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          return (
            <Circle
              key={`dot-${angle}`}
              cx={CX + R * Math.cos(rad)}
              cy={CY + R * Math.sin(rad)}
              r={3}
              fill={blueLight}
              opacity={0.8}
            />
          );
        })}

        {/* Additional small decoration circles on middle ring */}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          return (
            <Circle
              key={`deco-${angle}`}
              cx={CX + R * 0.72 * Math.cos(rad)}
              cy={CY + R * 0.72 * Math.sin(rad)}
              r={1.5}
              fill={blue}
              opacity={0.5}
            />
          );
        })}

        {/* Eye almond shape */}
        <Path d={eyePath} stroke={blueLight} strokeWidth={1.4} fill="none" opacity={0.9} />

        {/* Iris */}
        <Circle
          cx={CX}
          cy={CY}
          r={eyeH * 1.4}
          stroke={blueLight}
          strokeWidth={1.2}
          fill="#050714"
          opacity={0.95}
        />

        {/* Pupil */}
        <Circle cx={CX} cy={CY} r={eyeH * 0.75} fill={blue} opacity={0.85} />

        {/* Pupil glow center */}
        <Circle cx={CX} cy={CY} r={eyeH * 0.3} fill="#88AAFF" opacity={0.7} />

        {/* Highlight dot */}
        <Circle cx={CX + eyeH * 0.3} cy={CY - eyeH * 0.3} r={eyeH * 0.15} fill="#FFFFFF" opacity={0.6} />
      </Svg>
    </View>
  );
}

export default function FrequencyScanner() {
  const [active, setActive] = useState(false);
  const [ghostFreq, setGhostFreq] = useState(0.0);
  const [signalFlash, setSignalFlash] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(EQ_BARS).fill(0.02));
  const [glowOpacity, setGlowOpacity] = useState(0.3);
  const [noiseVolume, setNoiseVolumeState] = useState(
    Math.max(0.1, getWhisperEngine().getNoiseVolume())
  );

  const freqTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eqTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowDir = useRef(1);
  const glowVal = useRef(0.3);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const eqAnims = useRef(
    Array(EQ_BARS)
      .fill(null)
      .map(() => new Animated.Value(0.02))
  ).current;

  const animateBars = useCallback(
    (values: number[]) => {
      const anims = eqAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: values[i],
          duration: 110,
          useNativeDriver: false,
          easing: Easing.out(Easing.quad),
        })
      );
      Animated.parallel(anims).start();
    },
    [eqAnims]
  );

  const triggerSignal = useCallback(() => {
    setSignalFlash(true);
    setSignalCount((c) => c + 1);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSignalFlash(false), 2800);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.07, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    animateBars(generateBars(true, true));
  }, [scaleAnim, animateBars]);

  const startGlow = useCallback(() => {
    glowTimer.current = setInterval(() => {
      glowVal.current += glowDir.current * 0.025;
      if (glowVal.current >= 1) { glowVal.current = 1; glowDir.current = -1; }
      if (glowVal.current <= 0.25) { glowVal.current = 0.25; glowDir.current = 1; }
      setGlowOpacity(glowVal.current);
    }, 60);
  }, []);

  const stopGlow = useCallback(() => {
    if (glowTimer.current) clearInterval(glowTimer.current);
    setGlowOpacity(0.2);
  }, []);

  const startScanning = useCallback(() => {
    setActive(true);
    getWhisperEngine().start().catch(() => {});
    startGlow();

    freqTimer.current = setInterval(() => {
      setGhostFreq(+(Math.random() * 19 + 1).toFixed(3));
    }, 220);

    eqTimer.current = setInterval(() => {
      animateBars(generateBars(true, false));
    }, 120);
  }, [animateBars, startGlow]);

  const stopScanning = useCallback(() => {
    setActive(false);
    getWhisperEngine().stop();
    stopGlow();
    if (freqTimer.current) clearInterval(freqTimer.current);
    if (eqTimer.current) clearInterval(eqTimer.current);
    setGhostFreq(0.0);
    animateBars(Array(EQ_BARS).fill(0.02));
  }, [animateBars, stopGlow]);

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
      if (glowTimer.current) clearInterval(glowTimer.current);
    };
  }, []);

  const freqDisplay = active ? ghostFreq.toFixed(3) : "0.000";

  return (
    <ScreenContainer containerClassName="bg-[#050714]">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: active ? "#00FF88" : "#223" }]} />
          <Text style={[styles.statusText, { color: active ? "#00FF88" : "#445" }]}>
            {active ? "TARAMA AKTİF" : "BEKLENIYOR"}
          </Text>
        </View>

        {/* Frequency display */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: "center" }}>
          <View style={styles.freqRow}>
            <Text style={[styles.freqValue, signalFlash && styles.freqValueFlash]}>
              {freqDisplay}
            </Text>
            <Text style={[styles.freqUnit, signalFlash && { color: "#FF3366" }]}> Hz</Text>
          </View>
          <Text style={styles.freqLabel}>FREKANS GÜCÜ</Text>
        </Animated.View>

        {/* Spectrum */}
        <View style={styles.spectrumWrap}>
          <View style={styles.eqContainer}>
            {eqAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.eqBar,
                  {
                    height: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 72] }),
                    backgroundColor: signalFlash
                      ? "#FF3366"
                      : active
                      ? i % 5 === 0
                        ? "#AAFFCC"
                        : "#00FF88"
                      : "#112",
                    opacity: active ? (signalFlash ? 1 : 0.88) : 0.25,
                  },
                ]}
              />
            ))}
          </View>
          {/* Divider line */}
          <View style={styles.spectrumLine} />
          {/* Frequency labels */}
          <View style={styles.freqLabelsRow}>
            {FREQ_LABELS.map((label) => (
              <Text key={label} style={styles.freqLabelText}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        {/* Mandala */}
        <View style={styles.mandalaWrap}>
          <Mandala
            glowOpacity={glowOpacity}
            signalFlash={signalFlash}
            active={active}
          />
        </View>

        {/* Entities section */}
        <View style={styles.entitiesSection}>
          <Text style={[styles.entitiesTitle, signalFlash && { color: "#FF3366" }]}>
            ALGILANAN VARLIKLAR
          </Text>
          <Text style={[styles.entitiesCount, signalFlash && { color: "#FF3366" }]}>
            {signalCount}
          </Text>
          {signalFlash && (
            <Text style={styles.signalAlert}>⚡ SİNYAL ALINDI</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>
              WHITE NOISE: {Math.round(noiseVolume * 100)}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1}
              value={noiseVolume}
              onValueChange={handleVolumeChange}
              minimumTrackTintColor="#2255FF"
              maximumTrackTintColor="#111"
              thumbTintColor="#4488FF"
            />
          </View>

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
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
  },
  freqRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  freqValue: {
    fontSize: 58,
    fontWeight: "900",
    color: "#00FF88",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
    lineHeight: 64,
  },
  freqValueFlash: {
    color: "#FF3366",
  },
  freqUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00FF88",
    marginBottom: 10,
    letterSpacing: 1,
  },
  freqLabel: {
    fontSize: 10,
    color: "#556",
    letterSpacing: 4,
    fontWeight: "600",
    marginTop: -4,
  },
  spectrumWrap: {
    width: "100%",
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 76,
    width: "100%",
    gap: 1.5,
  },
  eqBar: {
    flex: 1,
    borderRadius: 1.5,
    minHeight: 2,
  },
  spectrumLine: {
    height: 1,
    backgroundColor: "#1A2040",
    marginTop: 3,
  },
  freqLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  freqLabelText: {
    fontSize: 9,
    color: "#445",
    letterSpacing: 0.5,
  },
  mandalaWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  entitiesSection: {
    alignItems: "center",
    gap: 4,
  },
  entitiesTitle: {
    fontSize: 11,
    color: "#334",
    letterSpacing: 5,
    fontWeight: "700",
  },
  entitiesCount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2255FF",
    letterSpacing: 2,
  },
  signalAlert: {
    fontSize: 12,
    color: "#FF3366",
    fontWeight: "800",
    letterSpacing: 3,
  },
  controls: {
    width: "100%",
    gap: 10,
  },
  sliderRow: {
    backgroundColor: "#080C1A",
    borderWidth: 1,
    borderColor: "#111830",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sliderLabel: {
    fontSize: 9,
    color: "#2255FF88",
    letterSpacing: 2,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 34,
  },
  btn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnStart: {
    backgroundColor: "#2255FF",
  },
  btnStop: {
    backgroundColor: "#FF3366",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  disclaimer: {
    fontSize: 9,
    color: "#1A1A2E",
    textAlign: "center",
    letterSpacing: 1,
  },
});
