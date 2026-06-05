import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { GlowText } from "@/components/GlowText";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const GAUGE_SIZE = width * 0.7;

function getEMFColor(value: number): string {
  if (value < 30) return "#00ff88";
  if (value < 70) return "#ffaa00";
  return "#ff3366";
}

function getEMFLevel(value: number): string {
  if (value < 15) return "NORMAL";
  if (value < 30) return "DÜŞÜK";
  if (value < 60) return "ORTA";
  if (value < 85) return "YÜKSEK";
  return "KRİTİK";
}

export default function EMFScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addSession } = useApp();

  const [isRunning, setIsRunning] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [maxValue, setMaxValue] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [readings, setReadings] = useState<number[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const magnetometerSub = useRef<any>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const startMagnetometer = useCallback(async () => {
    if (Platform.OS === "web") {
      intervalRef.current = setInterval(() => {
        const base = Math.random() * 20;
        const spike = Math.random() > 0.85 ? Math.random() * 60 : 0;
        const val = Math.min(100, base + spike);
        setCurrentValue(Math.round(val));
        setReadings((prev) => [...prev.slice(-50), val]);
        setMaxValue((prev) => Math.max(prev, val));
        if (val > 50) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 500);
    } else {
      try {
        const { Magnetometer } = require("expo-sensors");
        await Magnetometer.setUpdateInterval(500);
        magnetometerSub.current = Magnetometer.addListener(
          ({ x, y, z }: { x: number; y: number; z: number }) => {
            const total = Math.sqrt(x * x + y * y + z * z);
            const normalized = Math.min(100, (total / 100) * 100);
            setCurrentValue(Math.round(normalized));
            setReadings((prev) => [...prev.slice(-50), normalized]);
            setMaxValue((prev) => Math.max(prev, normalized));
            if (normalized > 50) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        );
      } catch {
        intervalRef.current = setInterval(() => {
          const val = Math.min(100, Math.random() * 30 + (Math.random() > 0.9 ? 50 : 0));
          setCurrentValue(Math.round(val));
          setReadings((prev) => [...prev.slice(-50), val]);
          setMaxValue((prev) => Math.max(prev, val));
        }, 500);
      }
    }
  }, []);

  const stopSensors = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (magnetometerSub.current) magnetometerSub.current.remove();
    magnetometerSub.current = null;
    intervalRef.current = null;
  }, []);

  const toggleSession = useCallback(async () => {
    if (isRunning) {
      stopSensors();
      setIsRunning(false);
      if (sessionStart) {
        const now = Date.now();
        const avg = readings.length > 0 ? readings.reduce((a, b) => a + b, 0) / readings.length : 0;
        addSession({
          id: now.toString() + Math.random().toString(36).substr(2, 5),
          startTime: sessionStart,
          endTime: now,
          duration: now - sessionStart,
          tool: "EMF",
          peakReading: maxValue,
          avgReading: Math.round(avg),
          eventsDetected: readings.filter((r) => r > 50).length,
        });
      }
      setSessionStart(null);
      setReadings([]);
    } else {
      setCurrentValue(0);
      setMaxValue(0);
      setAvgValue(0);
      setReadings([]);
      setSessionStart(Date.now());
      setIsRunning(true);
      await startMagnetometer();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [isRunning, sessionStart, readings, maxValue, addSession, startMagnetometer, stopSensors]);

  useEffect(() => {
    if (readings.length > 0) {
      setAvgValue(Math.round(readings.reduce((a, b) => a + b, 0) / readings.length));
    }
  }, [readings]);

  useEffect(() => () => stopSensors(), []);

  const emfColor = getEMFColor(currentValue);
  const level = getEMFLevel(currentValue);
  const gaugeAngle = (currentValue / 100) * 180;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#08080f" }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <GlowText text="EMF DEDEKTORU" size={13} color="#5050a0" weight="600" />
        <Text style={styles.title}>Manyetik Alan</Text>
      </View>

      <Animated.View style={[styles.gaugeContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE / 2 + 40}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="100%" r="60%">
              <Stop offset="0%" stopColor={emfColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={emfColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={GAUGE_SIZE / 2 - 10}
            fill="url(#glow)"
          />
          {[0, 30, 60, 90, 120, 150, 180].map((angle) => {
            const rad = ((angle - 180) * Math.PI) / 180;
            const x1 = GAUGE_SIZE / 2 + (GAUGE_SIZE / 2 - 20) * Math.cos(rad);
            const y1 = GAUGE_SIZE / 2 + (GAUGE_SIZE / 2 - 20) * Math.sin(rad);
            const x2 = GAUGE_SIZE / 2 + (GAUGE_SIZE / 2 - 30) * Math.cos(rad);
            const y2 = GAUGE_SIZE / 2 + (GAUGE_SIZE / 2 - 30) * Math.sin(rad);
            const tickColor = angle <= gaugeAngle ? emfColor : "#1c1c34";
            return (
              <Svg key={angle}>
                <Circle cx={x1} cy={y1} r={2} fill={tickColor} />
              </Svg>
            );
          })}
        </Svg>

        <View style={styles.gaugeCenter}>
          <GlowText
            text={currentValue.toString()}
            size={64}
            color={emfColor}
            glowColor={emfColor}
            weight="700"
          />
          <Text style={[styles.unit, { color: "#5050a0" }]}>mG</Text>
          <Text style={[styles.levelText, { color: emfColor }]}>{level}</Text>
        </View>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>MİN</Text>
          <GlowText text="0" size={24} color="#00ff88" weight="600" />
          <Text style={styles.statUnit}>mG</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ORT</Text>
          <GlowText text={avgValue.toString()} size={24} color="#ffaa00" weight="600" />
          <Text style={styles.statUnit}>mG</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>MAX</Text>
          <GlowText text={maxValue.toString()} size={24} color="#ff3366" weight="600" />
          <Text style={styles.statUnit}>mG</Text>
        </View>
      </View>

      <View style={styles.waveContainer}>
        {readings.slice(-20).map((r, i) => (
          <View
            key={i}
            style={[
              styles.wavebar,
              {
                height: Math.max(4, (r / 100) * 50),
                backgroundColor: getEMFColor(r),
                opacity: 0.4 + (i / 20) * 0.6,
              },
            ]}
          />
        ))}
        {Array.from({ length: Math.max(0, 20 - readings.length) }).map((_, i) => (
          <View key={`e${i}`} style={[styles.wavebar, { height: 4, backgroundColor: "#1c1c34" }]} />
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: isRunning ? "#1a0a0a" : "#0a1a0f", opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={toggleSession}
        testID="emf-toggle-btn"
      >
        <LinearGradient
          colors={
            isRunning
              ? ["#ff336620", "#ff336610"]
              : ["#00ff8820", "#00ff8810"]
          }
          style={styles.btnGradient}
        >
          <GlowText
            text={isRunning ? "DURDUR" : "TARA"}
            size={18}
            color={isRunning ? "#ff3366" : "#00ff88"}
            weight="700"
          />
        </LinearGradient>
      </Pressable>

      <Pressable
        style={styles.slsBtn}
        onPress={() => router.push("/sls")}
        testID="sls-btn"
      >
        <Text style={styles.slsBtnText}>SLS Kamera</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    color: "#ddddf0",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeCenter: {
    position: "absolute",
    bottom: 20,
    alignItems: "center",
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  levelText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0e0e1c",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1c1c34",
    gap: 2,
  },
  statLabel: {
    color: "#5050a0",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  statUnit: {
    color: "#5050a0",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 60,
    width: "100%",
    paddingHorizontal: 4,
  },
  wavebar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  btn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  btnGradient: {
    paddingVertical: 20,
    alignItems: "center",
  },
  slsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  slsBtnText: {
    color: "#5050a0",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
});
