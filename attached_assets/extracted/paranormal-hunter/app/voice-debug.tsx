/**
 * Ses Tanılama Sayfası
 * Cihazdaki mevcut TTS seslerini listeler ve test eder.
 * Bu sayfa geçici - sorun çözüldükten sonra kaldırılacak.
 */
import { Text, View, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";

interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI: string;
}

export default function VoiceDebugScreen() {
  const router = useRouter();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [turkishVoices, setTurkishVoices] = useState<VoiceInfo[]>([]);
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  // Sesleri yükle
  useEffect(() => {
    if (Platform.OS !== "web") {
      setTestResult("Bu sayfa sadece web'de çalışır");
      setIsLoading(false);
      return;
    }

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const mapped: VoiceInfo[] = allVoices.map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default,
        voiceURI: v.voiceURI,
      }));
      
      setVoices(mapped);
      
      const turkish = mapped.filter(v => 
        v.lang.toLowerCase().startsWith("tr") || 
        v.name.toLowerCase().includes("türk") ||
        v.name.toLowerCase().includes("turk") ||
        v.name.toLowerCase().includes("turkish")
      );
      setTurkishVoices(turkish);
      
      const langs = [...new Set(mapped.map(v => v.lang))].sort();
      
      setTestResult(
        `Toplam ${mapped.length} ses bulundu.\n` +
        `Türkçe ses: ${turkish.length} adet\n` +
        `Diller: ${langs.join(", ")}\n` +
        `Platform: ${navigator.userAgent.substring(0, 80)}`
      );
      setIsLoading(false);
    };

    // Sesler hemen yüklenmeyebilir
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      // 5 saniye timeout
      setTimeout(() => {
        loadVoices();
      }, 5000);
    }

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Ses test et
  const testVoice = useCallback((voiceInfo: VoiceInfo, testText: string) => {
    if (Platform.OS !== "web") return;
    
    window.speechSynthesis.cancel();
    
    const allVoices = window.speechSynthesis.getVoices();
    const voice = allVoices.find(v => v.voiceURI === voiceInfo.voiceURI);
    
    const u = new SpeechSynthesisUtterance(testText);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = voiceInfo.lang;
    }
    u.pitch = 1.0;
    u.rate = 0.8;
    u.volume = 1.0;
    
    setSelectedVoice(voiceInfo.voiceURI);
    
    u.onend = () => setSelectedVoice(null);
    u.onerror = (e) => {
      setSelectedVoice(null);
      setTestResult(prev => prev + `\nHATA: ${voiceInfo.name} - ${(e as any).error || "bilinmeyen hata"}`);
    };
    
    window.speechSynthesis.speak(u);
  }, []);

  // Türkçe test
  const testTurkish = useCallback((voiceInfo: VoiceInfo) => {
    testVoice(voiceInfo, "merhaba, ben buradayım, beni duyuyor musun");
  }, [testVoice]);

  // İngilizce test
  const testEnglish = useCallback((voiceInfo: VoiceInfo) => {
    testVoice(voiceInfo, "hello, I am here, can you hear me");
  }, [testVoice]);

  // lang=tr-TR ile doğrudan test (voice objesi olmadan)
  const testDirectTurkish = useCallback(() => {
    if (Platform.OS !== "web") return;
    window.speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance("karanlık, ölüm, ruh, beni duyuyor musun");
    u.lang = "tr-TR";
    u.pitch = 0.7;
    u.rate = 0.6;
    u.volume = 1.0;
    
    u.onend = () => setTestResult(prev => prev + "\nDirekt tr-TR testi tamamlandı");
    u.onerror = (e) => setTestResult(prev => prev + `\nDirekt tr-TR HATA: ${(e as any).error || "bilinmeyen"}`);
    
    window.speechSynthesis.speak(u);
  }, []);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#060609]">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backText}>← Geri</Text>
        </Pressable>

        <Text style={styles.title}>SES TANILAMA</Text>
        <Text style={styles.subtitle}>Cihazdaki TTS seslerini listeler ve test eder</Text>

        {/* Durum */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DURUM</Text>
          {isLoading ? (
            <Text style={styles.loading}>Sesler yükleniyor...</Text>
          ) : (
            <Text style={styles.result}>{testResult}</Text>
          )}
        </View>

        {/* Direkt Türkçe Test */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DİREKT TÜRKÇE TEST</Text>
          <Text style={styles.cardDesc}>Voice objesi olmadan sadece lang="tr-TR" ile test</Text>
          <Pressable
            onPress={testDirectTurkish}
            style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.testBtnText}>TEST ET: "karanlık, ölüm, ruh..."</Text>
          </Pressable>
        </View>

        {/* Türkçe Sesler */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TÜRKÇE SESLER ({turkishVoices.length})</Text>
          {turkishVoices.length === 0 ? (
            <Text style={styles.noVoice}>Türkçe ses bulunamadı! Bu sorunun kaynağı.</Text>
          ) : (
            turkishVoices.map((v, i) => (
              <View key={i} style={styles.voiceItem}>
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceName}>{v.name}</Text>
                  <Text style={styles.voiceLang}>{v.lang} {v.localService ? "(yerel)" : "(ağ)"} {v.default ? "★" : ""}</Text>
                </View>
                <Pressable
                  onPress={() => testTurkish(v)}
                  style={({ pressed }) => [
                    styles.playBtn,
                    selectedVoice === v.voiceURI && styles.playBtnActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.playBtnText}>
                    {selectedVoice === v.voiceURI ? "..." : "▶ TR"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Tüm Sesler */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TÜM SESLER ({voices.length})</Text>
          {voices.map((v, i) => (
            <View key={i} style={styles.voiceItem}>
              <View style={styles.voiceInfo}>
                <Text style={[
                  styles.voiceName,
                  v.lang.startsWith("tr") && { color: "#00FF88" },
                ]}>
                  {v.name}
                </Text>
                <Text style={styles.voiceLang}>
                  {v.lang} {v.localService ? "(yerel)" : "(ağ)"} {v.default ? "★" : ""}
                </Text>
              </View>
              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => testTurkish(v)}
                  style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.smallBtnText}>TR</Text>
                </Pressable>
                <Pressable
                  onPress={() => testEnglish(v)}
                  style={({ pressed }) => [styles.smallBtn, styles.smallBtnEn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.smallBtnText}>EN</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: "#9B4FDE", fontSize: 16 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#666", fontSize: 13, marginBottom: 20 },
  card: {
    backgroundColor: "#0D0D15",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1A1A2E",
  },
  cardTitle: { color: "#9B4FDE", fontSize: 13, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },
  cardDesc: { color: "#666", fontSize: 12, marginBottom: 12 },
  loading: { color: "#FFAA00", fontSize: 14 },
  result: { color: "#CCCCCC", fontSize: 12, fontFamily: "monospace", lineHeight: 20 },
  noVoice: { color: "#FF4444", fontSize: 14, fontWeight: "600" },
  voiceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A2E",
  },
  voiceInfo: { flex: 1, marginRight: 12 },
  voiceName: { color: "#FFFFFF", fontSize: 13, fontWeight: "500" },
  voiceLang: { color: "#666", fontSize: 11, marginTop: 2 },
  playBtn: {
    backgroundColor: "#9B4FDE20",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#9B4FDE40",
  },
  playBtnActive: { backgroundColor: "#9B4FDE40", borderColor: "#9B4FDE" },
  playBtnText: { color: "#9B4FDE", fontSize: 13, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 6 },
  smallBtn: {
    backgroundColor: "#00FF8820",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#00FF8840",
  },
  smallBtnEn: { backgroundColor: "#0088CC20", borderColor: "#0088CC40" },
  smallBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
  testBtn: {
    backgroundColor: "#FF444420",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FF444440",
    alignItems: "center",
  },
  testBtnText: { color: "#FF4444", fontSize: 13, fontWeight: "600" },
});
