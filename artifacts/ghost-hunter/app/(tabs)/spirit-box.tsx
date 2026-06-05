import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlowText } from "@/components/GlowText";
import { FREQUENCIES, SPIRIT_WORDS } from "@/constants/spirit-words";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const SCAN_SPEED = 150;

export default function SpiritBoxScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [frequency, setFrequency] = useState("87.5");
  const [spiritWord, setSpiritWord] = useState<string | null>(null);
  const [wordHistory, setWordHistory] = useState<string[]>([]);
  const [staticLevel, setStaticLevel] = useState(0);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const staticAnim = useRef(new Animated.Value(0)).current;
  const freqIdx = useRef(0);

  const animateStatic = useCallback((active: boolean) => {
    if (!active) {
      Animated.timing(staticAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(staticAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(staticAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
        Animated.timing(staticAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
        Animated.timing(staticAnim, { toValue: 0.1, duration: 120, useNativeDriver: true }),
      ])
    ).start();
  }, [staticAnim]);

  const showWord = useCallback((word: string) => {
    setSpiritWord(word);
    setWordHistory((prev) => [word, ...prev].slice(0, 6));
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setSpiritWord(null));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [glowAnim]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setWordHistory([]);
    freqIdx.current = 0;
    animateStatic(true);

    scanIntervalRef.current = setInterval(() => {
      freqIdx.current = (freqIdx.current + 1) % FREQUENCIES.length;
      setFrequency(FREQUENCIES[freqIdx.current]);
      setStaticLevel(Math.floor(Math.random() * 100));
    }, SCAN_SPEED);

    wordIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.08) {
        const word = SPIRIT_WORDS[Math.floor(Math.random() * SPIRIT_WORDS.length)];
        showWord(word);
      }
    }, SCAN_SPEED);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [animateStatic, showWord]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (wordIntervalRef.current) clearInterval(wordIntervalRef.current);
    setIsScanning(false);
    setSpiritWord(null);
    animateStatic(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [animateStatic]);

  useEffect(
    () => () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (wordIntervalRef.current) clearInterval(wordIntervalRef.current);
    },
    []
  );

  const wordOpacity = glowAnim;

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
        <GlowText text="SPİRİT BOX" size={13} color="#5050a0" weight="600" />
        <Text style={styles.title}>ITC İletişim</Text>
      </View>

      <View style={styles.displayCard}>
        <Animated.View style={[styles.staticOverlay, { opacity: staticAnim }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.staticLine,
                { top: `${i * 12.5 + Math.random() * 5}%`, opacity: Math.random() * 0.3 },
              ]}
            />
          ))}
        </Animated.View>

        <Text style={styles.freqLabel}>FM MHZ</Text>
        <GlowText
          text={frequency}
          size={52}
          color="#00ff88"
          weight="700"
        />

        <View style={styles.staticBar}>
          <View
            style={[
              styles.staticFill,
              { width: `${staticLevel}%`, backgroundColor: staticLevel > 70 ? "#ff3366" : "#00ff88" },
            ]}
          />
        </View>

        {spiritWord ? (
          <Animated.View style={[styles.wordContainer, { opacity: wordOpacity }]}>
            <GlowText
              text={spiritWord}
              size={36}
              color="#ffffff"
              glowColor="#7b2fff"
              weight="700"
            />
          </Animated.View>
        ) : (
          <View style={styles.wordPlaceholder}>
            <Text style={styles.listeningText}>
              {isScanning ? "DİNLİYOR..." : "HAZIR"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyLabel}>ALINAN MESAJLAR</Text>
        <View style={styles.historyList}>
          {wordHistory.length === 0 ? (
            <Text style={styles.historyEmpty}>Henüz mesaj alınmadı</Text>
          ) : (
            wordHistory.map((w, i) => (
              <View key={i} style={styles.historyItem}>
                <Text style={[styles.historyWord, { opacity: 1 - i * 0.12 }]}>{w}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={isScanning ? stopScanning : startScanning}
        testID="spiritbox-toggle-btn"
      >
        <LinearGradient
          colors={isScanning ? ["#2a0a10", "#1a0808"] : ["#0a1a0f", "#081008"]}
          style={styles.btnGradient}
        >
          <GlowText
            text={isScanning ? "DURDUR" : "TARA"}
            size={18}
            color={isScanning ? "#ff3366" : "#00ff88"}
            weight="700"
          />
        </LinearGradient>
      </Pressable>

      {!isPremium && (
        <Pressable
          style={styles.premiumBanner}
          onPress={() => router.push("/premium")}
          testID="premium-banner"
        >
          <LinearGradient
            colors={["#1a0a2e", "#0f0820"]}
            style={styles.premiumGradient}
          >
            <GlowText text="VOX MODU" size={13} color="#7b2fff" weight="700" />
            <Text style={styles.premiumDesc}>Gelişmiş ruh iletişimi · Premium</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08080f",
    paddingHorizontal: 20,
    gap: 16,
  },
  header: { alignItems: "center", gap: 4 },
  title: { color: "#ddddf0", fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  displayCard: {
    backgroundColor: "#060610",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00ff8820",
    gap: 12,
    overflow: "hidden",
    minHeight: 220,
    justifyContent: "center",
  },
  staticOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  staticLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#00ff88" },
  freqLabel: { color: "#2a2a50", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 3 },
  staticBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#1c1c34",
    borderRadius: 2,
    overflow: "hidden",
  },
  staticFill: { height: "100%", borderRadius: 2 },
  wordContainer: { alignItems: "center" },
  wordPlaceholder: { height: 48, alignItems: "center", justifyContent: "center" },
  listeningText: { color: "#2a2a50", fontSize: 14, fontFamily: "Inter_500Medium", letterSpacing: 4 },
  historySection: { gap: 8 },
  historyLabel: { color: "#5050a0", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  historyList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  historyEmpty: { color: "#2a2a50", fontSize: 13, fontFamily: "Inter_400Regular" },
  historyItem: {
    backgroundColor: "#0e0e1c",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  historyWord: { color: "#7b2fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  btn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  btnGradient: { paddingVertical: 20, alignItems: "center" },
  premiumBanner: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#7b2fff40",
  },
  premiumGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  premiumDesc: { color: "#9090b0", fontSize: 12, fontFamily: "Inter_400Regular" },
});
