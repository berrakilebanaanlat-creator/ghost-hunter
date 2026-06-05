import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const ONBOARDING_KEY = "@onboarding_v1_seen";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "👻",
    title: "ANTIK GHOST APP'E\nHOŞ GELDİN",
    subtitle: "Paranormal araştırma araçlarını\nkeşfetmeye hazır mısın?",
    color: "#00FF88",
    tag: "HAYALETPERESİ",
  },
  {
    emoji: "📡",
    title: "EMF & RADAR",
    subtitle: "Elektromanyetik alan değişimlerini\nve yakındaki anomalileri tespit et.",
    color: "#00CCFF",
    tag: "ALGILAMA",
  },
  {
    emoji: "🔮",
    title: "VOX & EVP",
    subtitle: "Ruh iletişim motoru ile sesli mesajlar\nal ve EVP seansları kaydet.",
    color: "#9B4FDE",
    tag: "İLETİŞİM",
  },
  {
    emoji: "👁️",
    title: "SLS KAMERA",
    subtitle: "İskelet algılama teknolojisi ile\ngörünmez varlıkları görselleştir.",
    color: "#FF6B35",
    tag: "GÖRÜNTÜLEME",
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => {
        if (!seen) setVisible(true);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    setVisible(false);
  }, []);

  const handleNext = useCallback(() => {
    if (Platform.OS !== "web") {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      handleDismiss();
    }
  }, [currentSlide, handleDismiss]);

  if (!visible) return null;

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable onPress={handleDismiss} style={styles.skipBtn}>
            <Text style={styles.skipText}>ATLA</Text>
          </Pressable>

          <View style={styles.slideContent}>
            <View style={[styles.emojiContainer, { borderColor: slide.color + "40" }]}>
              <View style={[styles.emojiGlow, { backgroundColor: slide.color + "20" }]} />
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>

            <View style={[styles.tagBadge, { backgroundColor: slide.color + "18", borderColor: slide.color + "40" }]}>
              <Text style={[styles.tagText, { color: slide.color }]}>{slide.tag}</Text>
            </View>

            <Text style={[styles.title, { color: slide.color }]}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentSlide
                    ? { backgroundColor: slide.color, width: 20 }
                    : { backgroundColor: "#2A2A40" },
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: slide.color, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "ARAMAYA BAŞLA ›" : "İLERİ ›"}
            </Text>
          </Pressable>

          <Text style={styles.slideCounter}>
            {currentSlide + 1} / {SLIDES.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: "#0A0A12",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1A1A28",
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 28,
    alignItems: "center",
  },
  skipBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 10,
    color: "#3A3A50",
    fontWeight: "600",
    letterSpacing: 2,
  },
  slideContent: {
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "#0D0D18",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 24,
  },
  emoji: {
    fontSize: 36,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    color: "#6A6A88",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "400",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
    alignItems: "center",
  },
  dot: {
    height: 4,
    borderRadius: 2,
    width: 8,
  },
  nextBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 3,
  },
  slideCounter: {
    fontSize: 9,
    color: "#2A2A40",
    fontWeight: "500",
    letterSpacing: 2,
  },
});
