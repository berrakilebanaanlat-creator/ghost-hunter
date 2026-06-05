import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { GlowText } from "@/components/GlowText";
import { useApp } from "@/contexts/AppContext";

const { width } = Dimensions.get("window");
const RADAR_SIZE = Math.min(width - 40, 340);
const CENTER = RADAR_SIZE / 2;
const RADIUS = RADAR_SIZE / 2 - 10;

interface GhostBlip {
  id: string;
  angle: number;
  distance: number;
  opacity: Animated.Value;
  strength: number;
}

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const { addSession } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [blips, setBlips] = useState<GhostBlip[]>([]);
  const [totalDetected, setTotalDetected] = useState(0);
  const [signalStrength, setSignalStrength] = useState(0);
  const sweepAngle = useRef(new Animated.Value(0)).current;
  const sweepRef = useRef<Animated.CompositeAnimation | null>(null);
  const blipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart = useRef<number | null>(null);
  const detectedCount = useRef(0);

  const addRandomBlip = useCallback(() => {
    if (Math.random() > 0.35) return;
    const angle = Math.random() * 360;
    const distance = 0.2 + Math.random() * 0.75;
    const strength = Math.floor(Math.random() * 80 + 20);
    const opacity = new Animated.Value(0);
    const blip: GhostBlip = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      angle,
      distance,
      opacity,
      strength,
    };
    setBlips((prev) => [...prev.slice(-8), blip]);
    setTotalDetected((prev) => prev + 1);
    setSignalStrength(strength);
    detectedCount.current += 1;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(() =>
      setBlips((prev) => prev.filter((b) => b.id !== blip.id))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const startScanning = useCallback(() => {
    sessionStart.current = Date.now();
    detectedCount.current = 0;
    setIsScanning(true);
    setBlips([]);
    setTotalDetected(0);

    sweepRef.current = Animated.loop(
      Animated.timing(sweepAngle, { toValue: 360, duration: 2500, useNativeDriver: true })
    );
    sweepRef.current.start();

    blipIntervalRef.current = setInterval(addRandomBlip, 800);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [sweepAngle, addRandomBlip]);

  const stopScanning = useCallback(() => {
    sweepRef.current?.stop();
    if (blipIntervalRef.current) clearInterval(blipIntervalRef.current);
    setIsScanning(false);
    setBlips([]);

    const now = Date.now();
    const start = sessionStart.current ?? now;
    addSession({
      id: now.toString() + Math.random().toString(36).substr(2, 5),
      startTime: start,
      endTime: now,
      duration: now - start,
      tool: "RADAR",
      eventsDetected: detectedCount.current,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [addSession]);

  useEffect(
    () => () => {
      sweepRef.current?.stop();
      if (blipIntervalRef.current) clearInterval(blipIntervalRef.current);
    },
    []
  );

  const sweepRotation = sweepAngle.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
        },
      ]}
    >
      <View style={styles.header}>
        <GlowText text="PARANORMAL RADAR" size={13} color="#5050a0" weight="600" />
        <Text style={styles.title}>Aktivite Tarayıcı</Text>
      </View>

      <View style={styles.radarContainer}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#001a0a" />
              <Stop offset="100%" stopColor="#080810" />
            </RadialGradient>
            <SvgLinearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#00ff88" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#bg)" />
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <Circle
              key={r}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * r}
              fill="none"
              stroke="#00ff88"
              strokeWidth={0.5}
              opacity={0.2}
            />
          ))}
          <Line x1={CENTER} y1={10} x2={CENTER} y2={RADAR_SIZE - 10} stroke="#00ff88" strokeWidth={0.5} opacity={0.15} />
          <Line x1={10} y1={CENTER} x2={RADAR_SIZE - 10} y2={CENTER} stroke="#00ff88" strokeWidth={0.5} opacity={0.15} />

          {blips.map((blip) => {
            const rad = (blip.angle * Math.PI) / 180;
            const bx = CENTER + Math.cos(rad) * RADIUS * blip.distance;
            const by = CENTER + Math.sin(rad) * RADIUS * blip.distance;
            return (
              <Circle
                key={blip.id}
                cx={bx}
                cy={by}
                r={6}
                fill="#00ff88"
                opacity={0.9}
              />
            );
          })}
        </Svg>

        {isScanning && (
          <Animated.View
            style={[
              styles.sweepLine,
              { width: CENTER, transform: [{ rotate: sweepRotation }] },
            ]}
          >
            <LinearGradient
              colors={["rgba(0,255,136,0.7)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ALGILANAN</Text>
          <GlowText text={totalDetected.toString()} size={28} color="#00ff88" weight="700" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SİNYAL</Text>
          <GlowText
            text={isScanning ? `${signalStrength}%` : "--"}
            size={28}
            color={signalStrength > 70 ? "#ff3366" : "#ffaa00"}
            weight="700"
          />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>DURUM</Text>
          <Text style={[styles.statusText, { color: isScanning ? "#00ff88" : "#5050a0" }]}>
            {isScanning ? "AKTİF" : "DURDU"}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={isScanning ? stopScanning : startScanning}
        testID="radar-toggle-btn"
      >
        <LinearGradient
          colors={isScanning ? ["#2a0a10", "#1a0808"] : ["#0a1a0f", "#081008"]}
          style={styles.btnGradient}
        >
          <GlowText
            text={isScanning ? "TARAMAYI DURDUR" : "TARAMAYI BASLAT"}
            size={18}
            color={isScanning ? "#ff3366" : "#00ff88"}
            weight="700"
          />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08080f",
    paddingHorizontal: 20,
    gap: 20,
    alignItems: "center",
  },
  header: { alignItems: "center", gap: 4 },
  title: { color: "#ddddf0", fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  radarContainer: { position: "relative", alignItems: "center", justifyContent: "center" },
  sweepLine: {
    position: "absolute",
    height: 2,
    left: "50%",
    top: "50%",
    marginTop: -1,
    transformOrigin: "0% 50%",
  },
  statsRow: { flexDirection: "row", gap: 12, width: "100%" },
  statCard: {
    flex: 1,
    backgroundColor: "#0e0e1c",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1c1c34",
    gap: 4,
  },
  statLabel: { color: "#5050a0", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  statusText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  btn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  btnGradient: { paddingVertical: 20, alignItems: "center" },
});
