import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";

import { GlowText } from "@/components/GlowText";

const { width, height } = Dimensions.get("window");

interface SkeletonFigure {
  id: string;
  x: number;
  y: number;
  scale: number;
  opacity: Animated.Value;
}

const SKELETON_JOINTS = [
  { id: "head", x: 0, y: -60 },
  { id: "neck", x: 0, y: -45 },
  { id: "lshoulder", x: -20, y: -30 },
  { id: "rshoulder", x: 20, y: -30 },
  { id: "lelbow", x: -30, y: -10 },
  { id: "relbow", x: 30, y: -10 },
  { id: "lwrist", x: -38, y: 10 },
  { id: "rwrist", x: 38, y: 10 },
  { id: "hip", x: 0, y: 0 },
  { id: "lhip", x: -14, y: 5 },
  { id: "rhip", x: 14, y: 5 },
  { id: "lknee", x: -18, y: 35 },
  { id: "rknee", x: 18, y: 35 },
  { id: "lankle", x: -18, y: 65 },
  { id: "rankle", x: 18, y: 65 },
];

const SKELETON_BONES = [
  ["head", "neck"],
  ["neck", "lshoulder"],
  ["neck", "rshoulder"],
  ["lshoulder", "lelbow"],
  ["rshoulder", "relbow"],
  ["lelbow", "lwrist"],
  ["relbow", "rwrist"],
  ["neck", "hip"],
  ["hip", "lhip"],
  ["hip", "rhip"],
  ["lhip", "lknee"],
  ["rhip", "rknee"],
  ["lknee", "lankle"],
  ["rknee", "rankle"],
];

function SkeletonOverlay({ figure }: { figure: SkeletonFigure }) {
  const jointMap = Object.fromEntries(
    SKELETON_JOINTS.map((j) => [j.id, { x: figure.x + j.x * figure.scale, y: figure.y + j.y * figure.scale }])
  );

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
    >
      {SKELETON_BONES.map(([a, b]) => {
        const ja = jointMap[a];
        const jb = jointMap[b];
        if (!ja || !jb) return null;
        return (
          <Line
            key={`${a}-${b}`}
            x1={ja.x}
            y1={ja.y}
            x2={jb.x}
            y2={jb.y}
            stroke="#00ff88"
            strokeWidth={2}
            opacity={0.9}
          />
        );
      })}
      {SKELETON_JOINTS.map((j) => {
        const pos = jointMap[j.id];
        return (
          <Circle
            key={j.id}
            cx={pos.x}
            cy={pos.y}
            r={j.id === "head" ? 8 : 4}
            fill="#00ff88"
            opacity={0.9}
          />
        );
      })}
    </Svg>
  );
}

export default function SLSScreen() {
  const insets = useSafeAreaInsets();
  const [isActive, setIsActive] = useState(false);
  const [figures, setFigures] = useState<SkeletonFigure[]>([]);
  const [detected, setDetected] = useState(0);
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<any>(null);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  const animateScan = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [scanAnim]);

  const startDetection = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsActive(true);
      setScanning(true);
      animateScan();
      detectionInterval.current = setInterval(() => {
        if (Math.random() < 0.3) {
          const opacity = new Animated.Value(0);
          const fig: SkeletonFigure = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            x: 80 + Math.random() * (width - 160),
            y: 150 + Math.random() * (height - 350),
            scale: 0.6 + Math.random() * 0.8,
            opacity,
          };
          setFigures((prev) => [...prev.slice(-3), fig]);
          setDetected((d) => d + 1);
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.85, duration: 300, useNativeDriver: true }),
            Animated.delay(4000),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]).start(() => setFigures((prev) => prev.filter((f) => f.id !== fig.id)));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }, 2000);
      return;
    }

    try {
      const { Camera, CameraType } = require("expo-camera");
      const perm = await Camera.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Kamera erişimi gerekli.");
        return;
      }
      setIsActive(true);
      setScanning(true);
      animateScan();
      detectionInterval.current = setInterval(() => {
        if (Math.random() < 0.25) {
          const opacity = new Animated.Value(0);
          const fig: SkeletonFigure = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            x: 80 + Math.random() * (width - 160),
            y: 150 + Math.random() * (height - 350),
            scale: 0.7 + Math.random() * 0.7,
            opacity,
          };
          setFigures((prev) => [...prev.slice(-3), fig]);
          setDetected((d) => d + 1);
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.85, duration: 300, useNativeDriver: true }),
            Animated.delay(4000),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]).start(() => setFigures((prev) => prev.filter((f) => f.id !== fig.id)));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }, 2000);
    } catch {
      Alert.alert("Hata", "Kamera başlatılamadı.");
    }
  }, [animateScan]);

  useEffect(
    () => () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    },
    []
  );

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height - 200],
  });

  return (
    <View style={styles.container}>
      {isActive && Platform.OS !== "web" ? (
        (() => {
          try {
            const { CameraView } = require("expo-camera");
            return <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />;
          } catch {
            return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#040408" }]} />;
          }
        })()
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#040408" }]}>
          {isActive && (
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            />
          )}
        </View>
      )}

      {figures.map((fig) => (
        <Animated.View
          key={fig.id}
          style={[StyleSheet.absoluteFill, { opacity: fig.opacity }]}
        >
          <SkeletonOverlay figure={fig} />
        </Animated.View>
      ))}

      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#00ff88" />
          </Pressable>
          <View style={styles.topInfo}>
            <GlowText text="SLS KAMERA" size={13} color="#00ff88" weight="700" />
            <Text style={styles.topSubtext}>İskelet Algılama</Text>
          </View>
          <View style={styles.detectedBadge}>
            <GlowText text={detected.toString()} size={20} color="#ff3366" weight="700" />
            <Text style={styles.detectedLabel}>Algılanan</Text>
          </View>
        </View>

        {!isActive && (
          <View style={styles.startContainer}>
            <MaterialCommunityIcons name="camera-outline" size={64} color="#1c1c34" />
            <Text style={styles.startText}>SLS Kamerayı Başlat</Text>
            <Text style={styles.startSubtext}>
              Yapısal ışık sensörü ile görünmez figürleri tespit edin
            </Text>
          </View>
        )}

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {isActive && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: scanning ? "#00ff88" : "#5050a0" }]} />
              <Text style={styles.statusText}>{scanning ? "TARANIIYOR" : "HAZIR"}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.activateBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={isActive ? () => {
              if (detectionInterval.current) clearInterval(detectionInterval.current);
              setIsActive(false);
              setScanning(false);
              setFigures([]);
            } : startDetection}
            testID="sls-activate-btn"
          >
            <GlowText
              text={isActive ? "DURDUR" : "BASLAT"}
              size={16}
              color={isActive ? "#ff3366" : "#00ff88"}
              weight="700"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040408" },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#00ff8860",
    shadowColor: "#00ff88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00000080",
    alignItems: "center",
    justifyContent: "center",
  },
  topInfo: { flex: 1, gap: 2 },
  topSubtext: { color: "#5050a0", fontSize: 11, fontFamily: "Inter_400Regular" },
  detectedBadge: {
    alignItems: "center",
    backgroundColor: "#00000080",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ff336640",
  },
  detectedLabel: { color: "#5050a0", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  startContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  startText: { color: "#9090b0", fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  startSubtext: { color: "#5050a0", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bottomBar: {
    paddingHorizontal: 20,
    gap: 12,
    alignItems: "center",
    backgroundColor: "#00000080",
    paddingTop: 16,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#9090b0", fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 2 },
  activateBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#0a0a1a",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
});
