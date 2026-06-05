import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const ONBOARDING_KEY = "@onboarding_v1_seen";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    tag: "FREKANS 40.0 Hz",
    title: "PARANORMAL\nARAŞTIRMA\nSİSTEMİ",
    body: "Bu uygulama, elektromanyetik anomalileri, ortam seslerini ve çevresel değişimleri algılamak için tasarlanmış profesyonel bir araçtır.",
    note: "Kullanmadan önce sessiz ve sakin bir ortam sağlayın.",
  },
  {
    tag: "MODÜL — EMF & RADAR",
    title: "ELEKTROMANYETİK\nALAN TARAMASI",
    body: "EMF dedektörü manyetik alan dalgalanmalarını ölçer. Radar modülü yakındaki hareket ve enerji değişimlerini analiz eder.",
    note: "Elektronik cihazlardan uzakta çalıştırıldığında hassasiyet artar.",
  },
  {
    tag: "MODÜL — VOX & EVP",
    title: "SES İLETİŞİM\nPROTOKOLÜ",
    body: "VOX motoru ITC yöntemini kullanarak ses frekanslarından anlamlı sesler süzer. EVP modülü ortam sesini kaydeder ve analiz eder.",
    note: "Seans sırasında açık uçlu sorular sorun ve yanıt için bekleyin.",
  },
  {
    tag: "MODÜL — SLS & KAYITLAR",
    title: "GÖRÜNTÜ ALGILAMA\nVE ARŞİVLEME",
    body: "SLS kamerası iskelet haritalaması yaparak görünmez varlıkları görselleştirir. Tüm bulgular Kanıt Duvarı'nda arşivlenir.",
    note: "Her seansa başlamadan önce cihazınızı şarj edin.",
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => {
        if (!seen) {
          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {});
  }, [fadeAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const transitionToSlide = useCallback((nextIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSlide(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleDismiss = useCallback(async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(async () => {
      try { await AsyncStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
      setVisible(false);
    });
  }, [fadeAnim]);

  const handleNext = useCallback(() => {
    if (Platform.OS !== "web") {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    if (currentSlide < SLIDES.length - 1) {
      transitionToSlide(currentSlide + 1);
    } else {
      handleDismiss();
    }
  }, [currentSlide, transitionToSlide, handleDismiss]);

  if (!visible) return null;

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 300],
  });

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Tarama çizgisi */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanTranslate }] },
            ]}
          />

          {/* Üst meta çubuğu */}
          <View style={styles.metaRow}>
            <View style={styles.statusDot} />
            <Text style={styles.metaTag}>{slide.tag}</Text>
            <Text style={styles.slideCounter}>
              {currentSlide + 1}/{SLIDES.length}
            </Text>
          </View>

          {/* Yatay çizgi */}
          <View style={styles.divider} />

          {/* Ana içerik */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>{slide.title}</Text>

            <View style={styles.dividerThin} />

            <Text style={styles.body}>{slide.body}</Text>

            <View style={styles.noteRow}>
              <View style={styles.noteBar} />
              <Text style={styles.noteText}>{slide.note}</Text>
            </View>
          </Animated.View>

          {/* Alt çubuğu */}
          <View style={styles.divider} />

          <View style={styles.footer}>
            <Pressable onPress={handleDismiss} style={styles.skipBtn}>
              <Text style={styles.skipText}>ATLA</Text>
            </Pressable>

            {/* Nokta indikatörleri */}
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentSlide ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.nextBtnText}>
                {isLast ? "BAŞLA" : "İLERİ"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: "#080810",
    borderWidth: 1,
    borderColor: "#1C1C2C",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#FFFFFF08",
    zIndex: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#4A4A6A",
  },
  metaTag: {
    flex: 1,
    fontSize: 9,
    color: "#3A3A55",
    fontWeight: "600",
    letterSpacing: 3,
  },
  slideCounter: {
    fontSize: 9,
    color: "#2A2A40",
    fontWeight: "500",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: "#13131E",
  },
  dividerThin: {
    height: 1,
    backgroundColor: "#0D0D18",
    marginVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#C0C0D8",
    letterSpacing: 5,
    lineHeight: 32,
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  body: {
    fontSize: 12,
    color: "#4A4A65",
    lineHeight: 20,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    fontWeight: "400",
  },
  noteRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: "flex-start",
  },
  noteBar: {
    width: 2,
    height: "100%",
    minHeight: 30,
    backgroundColor: "#1E1E30",
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 10,
    color: "#2E2E45",
    lineHeight: 16,
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  skipText: {
    fontSize: 9,
    color: "#252535",
    fontWeight: "600",
    letterSpacing: 2,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    height: 2,
    borderRadius: 1,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#4A4A6A",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#1A1A28",
  },
  nextBtn: {
    borderWidth: 1,
    borderColor: "#1C1C2C",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  nextBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#5A5A80",
    letterSpacing: 3,
  },
});
