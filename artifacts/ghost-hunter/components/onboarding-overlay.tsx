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

const ONBOARDING_KEY = "@onboarding_v2_seen";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const VOX_DEMO_WORDS = [
  { word: "Engin", char: "ERKEK" },
  { word: "buraya gel", char: "FISIL." },
  { word: "Termessos", char: "DERİN" },
  { word: "gece sonu", char: "YAŞLI" },
  { word: "Kharôn", char: "BOĞUK E." },
  { word: "bağlanmış ruh", char: "KADIN" },
  { word: "Tartaros", char: "DERİN" },
  { word: "seni görüyorum", char: "FISIL." },
];

const SLIDES = [
  {
    tag: "SİSTEM — BAŞLATILIYOR",
    title: "PARANORMAL\nARAŞTIRMA\nSİSTEMİ",
    body: "Elektromanyetik anomalileri, ortam seslerini ve çevresel değişimleri algılamak için tasarlanmış profesyonel araç seti.",
    note: "Sessiz ve sakin bir ortamda kullanılması önerilir.",
    type: "info" as const,
  },
  {
    tag: "MODÜL — VOX ITC",
    title: "VOX SES\nİLETİŞİM\nMOTORU",
    body: "ITC (Instrumental Trans-Communication) yöntemiyle frekans bantları taranır. Tespit edilen ses örüntüleri gerçek zamanlı olarak işlenir ve seslendirilir.",
    note: "Seans sırasında açık uçlu sorular sorun. Yanıt için en az 10 saniye bekleyin.",
    type: "vox_demo" as const,
  },
  {
    tag: "MODÜL — EMF & RADAR & EVP",
    title: "ELEKTROMANYETİK\nTARAMA VE\nKAYIT",
    body: "EMF dedektörü manyetik alan dalgalanmalarını ölçer. EVP modülü ortam sesini kaydeder. Radar yakındaki enerji değişimlerini analiz eder.",
    note: "Elektronik cihazlardan uzakta çalıştırıldığında hassasiyet artar.",
    type: "info" as const,
  },
  {
    tag: "MODÜL — SLS & KANIT DUVARI",
    title: "GÖRÜNTÜ\nALGILAMA VE\nARŞİVLEME",
    body: "SLS kamerası iskelet haritalaması yaparak görünmez varlıkları görselleştirir. Tüm bulgular zaman damgasıyla Kanıt Duvarı'nda saklanır.",
    note: "Her seansa başlamadan önce cihazınızı şarj edin.",
    type: "info" as const,
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  const [demoWordIndex, setDemoWordIndex] = useState(0);
  const [demoVisible, setDemoVisible] = useState(false);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordFadeAnim = useRef(new Animated.Value(0)).current;
  const freqAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(freqAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(freqAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [freqAnim]);

  useEffect(() => {
    const slide = SLIDES[currentSlide];
    if (slide?.type === "vox_demo") {
      setDemoVisible(false);
      setDemoWordIndex(0);

      const startDemo = setTimeout(() => {
        setDemoVisible(true);

        const cycleWord = () => {
          Animated.sequence([
            Animated.timing(wordFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(wordFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
          setDemoWordIndex((prev) => (prev + 1) % VOX_DEMO_WORDS.length);
        };

        Animated.timing(wordFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        demoIntervalRef.current = setInterval(cycleWord, 2200);
      }, 400);

      return () => {
        clearTimeout(startDemo);
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      };
    } else {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      setDemoVisible(false);
    }
  }, [currentSlide, wordFadeAnim]);

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
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
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

  const demoWord = VOX_DEMO_WORDS[demoWordIndex];

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
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanTranslate }] }]}
          />

          <View style={styles.metaRow}>
            <View style={styles.statusDot} />
            <Text style={styles.metaTag}>{slide.tag}</Text>
            <Text style={styles.slideCounter}>
              {currentSlide + 1}/{SLIDES.length}
            </Text>
          </View>

          <View style={styles.divider} />

          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>{slide.title}</Text>
            <View style={styles.dividerThin} />

            {slide.type === "vox_demo" ? (
              <View style={styles.voxDemoContainer}>
                <View style={styles.freqBar}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.freqSegment,
                        {
                          opacity: freqAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              0.08 + (i % 3) * 0.05,
                              0.12 + (i % 5) * 0.08,
                            ],
                          }),
                          height: 4 + (i % 4) * 3,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.voxWordBox}>
                  {demoVisible ? (
                    <Animated.View style={{ opacity: wordFadeAnim, alignItems: "center" }}>
                      <Text style={styles.voxCharLabel}>{demoWord.char}</Text>
                      <Text style={styles.voxWord}>{demoWord.word}</Text>
                      <View style={styles.voxWordUnderline} />
                    </Animated.View>
                  ) : (
                    <Text style={styles.voxScanText}>TARAMA...</Text>
                  )}
                </View>

                <Text style={styles.voxSubText}>
                  ITC motoru ses frekanslarını analiz ederek kelimeler üretir. Her kelime farklı bir karakter sesiyle iletilir.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.body}>{slide.body}</Text>
                <View style={styles.noteRow}>
                  <View style={styles.noteBar} />
                  <Text style={styles.noteText}>{slide.note}</Text>
                </View>
              </>
            )}
          </Animated.View>

          {slide.type === "info" && (
            <View style={styles.noteRowBottom}>
              <View style={styles.noteBar} />
              <Text style={styles.noteText}>{slide.note}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.footer}>
            <Pressable onPress={handleDismiss} style={styles.skipBtn}>
              <Text style={styles.skipText}>ATLA</Text>
            </Pressable>

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
    backgroundColor: "rgba(0,0,0,0.95)",
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
    backgroundColor: "#FFFFFF06",
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
    backgroundColor: "#3A3A5A",
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
    marginVertical: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#B0B0CC",
    letterSpacing: 4,
    lineHeight: 30,
    paddingHorizontal: 16,
    paddingTop: 20,
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
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "flex-start",
  },
  noteRowBottom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "flex-start",
  },
  noteBar: {
    width: 2,
    minHeight: 30,
    backgroundColor: "#1A1A2E",
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 10,
    color: "#2A2A40",
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
  voxDemoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  freqBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 24,
    marginBottom: 16,
  },
  freqSegment: {
    flex: 1,
    backgroundColor: "#3A3A6A",
    borderRadius: 1,
  },
  voxWordBox: {
    borderWidth: 1,
    borderColor: "#16162A",
    backgroundColor: "#050508",
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  voxCharLabel: {
    fontSize: 8,
    color: "#3A3A60",
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 6,
  },
  voxWord: {
    fontSize: 26,
    fontWeight: "700",
    color: "#8888BB",
    letterSpacing: 3,
    textAlign: "center",
  },
  voxWordUnderline: {
    width: 40,
    height: 1,
    backgroundColor: "#2A2A50",
    marginTop: 8,
  },
  voxScanText: {
    fontSize: 10,
    color: "#222235",
    letterSpacing: 4,
    fontWeight: "600",
  },
  voxSubText: {
    fontSize: 10,
    color: "#333348",
    lineHeight: 16,
    letterSpacing: 0.3,
    textAlign: "left",
  },
});
