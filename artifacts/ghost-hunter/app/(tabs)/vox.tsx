import { Text, View, Pressable, StyleSheet, Dimensions, ScrollView, Platform, Share, Modal } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VoxPaywall } from "@/components/vox-paywall";
import { useAds } from "@/lib/ad-context";
import * as Haptics from "expo-haptics";
import {
  getITCEngine,
  type VoiceCharacter,
  type MicrophoneState,
  type WhiteNoiseMode,
} from "@/lib/itc-voice-engine";
import { coerceVoxLang, type VoxLang } from "@/lib/vox-word-banks";
import { SettingsManager } from "@/lib/settings-manager";
import { getScreenRecorder, type RecordingState } from "@/lib/screen-recorder";
import { t } from "@/lib/i18n";
import { addRecording } from "@/lib/recording-history";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Kelime log tipi
interface WordLog {
  id: number;
  word: string;
  character: VoiceCharacter;
  timestamp: Date;
  triggeredByVoice: boolean;
}

// Karakter renkleri
const CHARACTER_COLORS: Record<VoiceCharacter, string> = {
  male: "#00CCFF",
  deep_male: "#0088CC",
  old_male: "#6688AA",
  whisper_male: "#445566",
  female: "#FF66AA",
  old_female: "#AA6688",
  whisper_female: "#664455",
  child: "#FFCC00",
  creepy_child: "#FF4400",
  girl_child: "#FFB0D0",
  nine: "#C8A882",
  muffled_male: "#556677",
  muffled_female: "#887799",
};

const CHARACTER_LABELS: Record<VoiceCharacter, string> = {
  male: "ERKEK",
  deep_male: "DERİN",
  old_male: "YAŞLI",
  whisper_male: "FISIL.",
  female: "KADIN",
  old_female: "YAŞLI K.",
  whisper_female: "FISIL. K.",
  child: "ÇOCUK",
  creepy_child: "ÜRK. Ç.",
  girl_child: "KIZ Ç.",
  nine: "NİNE",
  muffled_male: "BOĞUK E.",
  muffled_female: "BOĞUK K.",
};

const NOISE_MODE_KEYS: Record<WhiteNoiseMode, string> = {
  off: "vox.noiseOff",
  slow: "vox.noiseSlow",
  fast: "vox.noiseFast",
  continuous: "vox.noiseCont",
};

const NOISE_MODES: WhiteNoiseMode[] = ["off", "slow", "fast", "continuous"];

// VOX dilleri (TR varsayılan)
const VOX_LANGS: VoxLang[] = ["tr", "en", "de", "fr", "es"];
const VOX_LANG_LABELS: Record<VoxLang, string> = {
  tr: "TÜRKÇE",
  en: "ENGLISH",
  de: "DEUTSCH",
  fr: "FRANÇAIS",
  es: "ESPAÑOL",
};

export default function VoxScreen() {
  const { isVoxPurchased } = useAds();

  // TÜM HOOK'LAR KOŞULSUZ OLARAK EN ÜSTTE TANIMLANMALI (React Hook kuralı)
  const [isActive, setIsActive] = useState(false);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [currentCharacter, setCurrentCharacter] = useState<VoiceCharacter | null>(null);
  const [wordLog, setWordLog] = useState<WordLog[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(0));
  const [pulsePhase, setPulsePhase] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsWarning, setTtsWarning] = useState(false);
  const [voxLanguage, setVoxLanguageState] = useState<VoxLang>("tr");

  // Mikrofon durumu
  const [micState, setMicState] = useState<MicrophoneState>({
    status: "idle",
    audioLevel: 0,
    isListening: false,
    peakLevel: 0,
    voiceDetected: false,
  });
  const [isMicEnabled, setIsMicEnabled] = useState(false);

  // Ekran kaydı durumu
  const [recordingState, setRecordingState] = useState<RecordingState>({
    status: "idle",
    duration: 0,
  });
  const [isRecording, setIsRecording] = useState(false);

  // Kontrol ayarları (GhostTube VOX tarzı)
  const [whiteNoiseMode, setWhiteNoiseMode] = useState<WhiteNoiseMode>("slow");
  const [whiteNoiseVol, setWhiteNoiseVol] = useState(0.3);
  const [reverbLevel, setReverbLevel] = useState(0.25);
  const [echoLevel, setEchoLevel] = useState(0.3);
  const [distortionLevel, setDistortionLevel] = useState(0.5);
  const [sensitivity, setSensitivity] = useState(0.5);

  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    wordCount: number;
    topCharacters: { character: VoiceCharacter; count: number }[];
    topWords: string[];
  } | null>(null);

  const logIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dalga formu animasyonu
  useEffect(() => {
    if (isActive) {
      waveRef.current = setInterval(() => {
        setWaveformData((prev) => {
          const newData = [...prev];
          const micLevel = micState.audioLevel;
          for (let i = 0; i < newData.length; i++) {
            if (currentWord) {
              newData[i] = 0.3 + Math.random() * 0.7;
            } else if (isMicEnabled && micLevel > 0.05) {
              const micWave = micLevel * (0.5 + Math.random() * 0.5);
              newData[i] = Math.min(0.9, micWave);
            } else {
              newData[i] = Math.random() * 0.12;
            }
          }
          return newData;
        });
      }, 80);
    } else {
      if (waveRef.current) clearInterval(waveRef.current);
      setWaveformData(new Array(40).fill(0));
    }
    return () => {
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, [isActive, currentWord, isMicEnabled, micState.audioLevel]);

  // Pulse animasyonu
  useEffect(() => {
    if (isActive) {
      pulseRef.current = setInterval(() => {
        setPulsePhase((p) => (p + 1) % 100);
      }, 50);
    } else {
      if (pulseRef.current) clearInterval(pulseRef.current);
      setPulsePhase(0);
    }
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, [isActive]);

  // Süre sayacı
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // VOX dilini yükle ve motora uygula (TR varsayılan)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await SettingsManager.getSetting("voxLanguage");
        if (!active) return;
        const lang = coerceVoxLang(raw);
        setVoxLanguageState(lang);
        try { getITCEngine().setLanguage(lang); } catch { /* */ }
      } catch { /* */ }
    })();
    return () => { active = false; };
  }, []);

  // VOX dilini değiştir
  const changeVoxLanguage = useCallback((lang: VoxLang) => {
    setVoxLanguageState(lang);
    try { getITCEngine().setLanguage(lang); } catch { /* */ }
    void SettingsManager.setSetting("voxLanguage", lang);
    if (Platform.OS !== "web") {
      try { Haptics.selectionAsync(); } catch { /* */ }
    }
  }, []);

  // Kelime callback
  const handleWordSpoken = useCallback((word: string, character: VoiceCharacter) => {
    setCurrentWord(word);
    setCurrentCharacter(character);
    setWordCount((c) => c + 1);
    if (Platform.OS !== "web" && getITCEngine().getTurkishTTSFailed()) {
      setTtsWarning(true);
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    logIdRef.current += 1;
    const newLog: WordLog = {
      id: logIdRef.current,
      word,
      character,
      timestamp: new Date(),
      triggeredByVoice: micState.voiceDetected,
    };
    setWordLog((prev) => [newLog, ...prev].slice(0, 50));

    if (wordTimeoutRef.current) clearTimeout(wordTimeoutRef.current);
    wordTimeoutRef.current = setTimeout(() => {
      setCurrentWord(null);
      setCurrentCharacter(null);
    }, 3000);
  }, [micState.voiceDetected]);

  // Mikrofon durum callback
  const handleMicStateChange = useCallback((state: MicrophoneState) => {
    setMicState(state);
  }, []);

  // Başlat / Durdur
  const toggleActive = useCallback(async () => {
    try {
      const engine = getITCEngine();

      if (Platform.OS !== "web") {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* */ }
      }

      if (isActive) {
        try { engine.stop(); } catch { /* */ }
        setIsActive(false);
        setCurrentWord(null);
        setCurrentCharacter(null);
        setIsMicEnabled(false);
        setMicState({
          status: "idle",
          audioLevel: 0,
          isListening: false,
          peakLevel: 0,
          voiceDetected: false,
        });

        // Oturum özeti hesapla
        setWordLog((currentLog) => {
          if (currentLog.length > 0) {
            const charCounts: Partial<Record<VoiceCharacter, number>> = {};
            currentLog.forEach((entry) => {
              charCounts[entry.character] = (charCounts[entry.character] || 0) + 1;
            });
            const topCharacters = Object.entries(charCounts)
              .map(([ch, cnt]) => ({ character: ch as VoiceCharacter, count: cnt as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            const topWords = currentLog.slice(0, 5).map((e) => e.word);
            setSummaryData({
              duration: elapsedTime,
              wordCount: currentLog.length,
              topCharacters,
              topWords,
            });
            setShowSummary(true);
          }
          return currentLog;
        });
      } else {
        setElapsedTime(0);
        setWordCount(0);
        setWordLog([]);
        // Ayarları motora uygula
        try {
          engine.setWhiteNoiseMode(whiteNoiseMode);
          engine.setWhiteNoiseVolume(whiteNoiseVol);
          engine.setReverbLevel(reverbLevel);
          engine.setEchoLevel(echoLevel);
          engine.setDistortionLevel(distortionLevel);
          engine.setSensitivity(sensitivity);
          engine.setLanguage(voxLanguage);
        } catch { /* */ }
        await engine.start(handleWordSpoken);
        setIsActive(true);
      }
    } catch (e) {
      console.warn("[VOX] toggleActive hatası:", e);
      setIsActive(false);
    }
  }, [isActive, handleWordSpoken, whiteNoiseMode, whiteNoiseVol, reverbLevel, echoLevel, distortionLevel, sensitivity, voxLanguage]);

  // Mikrofon aç/kapa
  const toggleMicrophone = useCallback(async () => {
    const engine = getITCEngine();

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isMicEnabled) {
      engine.stopMicrophone();
      setIsMicEnabled(false);
    } else {
      const success = await engine.startMicrophone(handleMicStateChange);
      setIsMicEnabled(success);
      if (!success && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [isMicEnabled, handleMicStateChange]);

  // Ayar değişikliklerini motora uygula
  const updateSetting = useCallback((key: string, value: number | string) => {
    const engine = getITCEngine();
    switch (key) {
      case "whiteNoiseMode":
        setWhiteNoiseMode(value as WhiteNoiseMode);
        engine.setWhiteNoiseMode(value as WhiteNoiseMode);
        break;
      case "whiteNoiseVol":
        setWhiteNoiseVol(value as number);
        engine.setWhiteNoiseVolume(value as number);
        break;
      case "reverb":
        setReverbLevel(value as number);
        engine.setReverbLevel(value as number);
        break;
      case "echo":
        setEchoLevel(value as number);
        engine.setEchoLevel(value as number);
        break;
      case "distortion":
        setDistortionLevel(value as number);
        engine.setDistortionLevel(value as number);
        break;
      case "sensitivity":
        setSensitivity(value as number);
        engine.setSensitivity(value as number);
        break;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Ekran kaydı başlat/durdur
  const toggleRecording = useCallback(async () => {
    const recorder = getScreenRecorder();

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isRecording) {
      recorder.stopRecording();
      setIsRecording(false);
      const finalDuration = recordingState.duration || 0;
      setRecordingState({ status: "idle", duration: 0 });

      // Geçmiş sayfasına kaydet
      const lastUri = recorder.getLastRecordingUri();
      if (finalDuration > 0 && lastUri) {
        addRecording({
          duration: Math.round(finalDuration),
          audioUri: lastUri,
          source: "vox",
          activityLevel: Math.round(Math.random() * 100),
        }).catch((err) => console.error("[VOX] History kaydetme hatası:", err));
      }
    } else {
      const success = await recorder.startRecording((state) => {
        setRecordingState(state);
        if (state.status === "idle" || state.status === "error") {
          setIsRecording(false);
        }
      });
      setIsRecording(success);
    }
  }, [isRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      const engine = getITCEngine();
      engine.stop();
      const recorder = getScreenRecorder();
      recorder.dispose();
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
      if (pulseRef.current) clearInterval(pulseRef.current);
      if (wordTimeoutRef.current) clearTimeout(wordTimeoutRef.current);
    };
  }, []);

  // Oturum paylaşım fonksiyonu
  const handleShareSession = useCallback(async () => {
    if (!summaryData) return;
    if (Platform.OS !== "web") {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* */ }
    }
    const fmt = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };
    const charLines = summaryData.topCharacters
      .map((c) => `  ${CHARACTER_LABELS[c.character]}: ${c.count}`)
      .join("\n");
    const wordLines = summaryData.topWords.map((w) => `  "${w}"`).join("\n");
    const text = [
      `👻 ANTIK GHOST HUNTER — VOX ITC`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `⏱  ${t("vox.duration")}: ${fmt(summaryData.duration)}`,
      `📡 ${t("vox.messages")}: ${summaryData.wordCount}`,
      "",
      `🎙 ${t("vox.activeCharacters")}:`,
      charLines,
      "",
      `💬 ${t("vox.recentMessages")}:`,
      wordLines,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "#ghosthunter #paranormal #ITC #EVP",
    ].join("\n");
    try {
      await Share.share({ message: text, title: "Ghost Hunter VOX" });
    } catch { /* */ }
  }, [summaryData]);

  // VOX satın alınmamışsa kilit ekranı göster (hook'lardan SONRA)
  if (!isVoxPurchased) {
    return <VoxPaywall />;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const pulseOpacity = isActive ? 0.3 + Math.sin(pulsePhase * 0.12) * 0.2 : 0.1;
  const accentColor = currentWord
    ? (currentCharacter ? CHARACTER_COLORS[currentCharacter] : "#9B4FDE")
    : "#9B4FDE";
  const micLevelColor = micState.voiceDetected ? "#FF4444" : isMicEnabled ? "#00FF88" : "#2A2A40";

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      {/* ── OTURUM ÖZETİ MODAL ── */}
      <Modal
        visible={showSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Başlık */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>👻</Text>
              <Text style={styles.modalTitle}>{t("vox.sessionComplete")}</Text>
            </View>

            {/* İstatistikler */}
            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {(() => {
                    const m = Math.floor((summaryData?.duration ?? 0) / 60);
                    const s = (summaryData?.duration ?? 0) % 60;
                    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                  })()}
                </Text>
                <Text style={styles.modalStatLabel}>{t("vox.duration")}</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{summaryData?.wordCount ?? 0}</Text>
                <Text style={styles.modalStatLabel}>{t("vox.messages")}</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{summaryData?.topCharacters.length ?? 0}</Text>
                <Text style={styles.modalStatLabel}>{t("vox.spirits")}</Text>
              </View>
            </View>

            {/* Aktif karakterler */}
            {(summaryData?.topCharacters.length ?? 0) > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t("vox.activeCharacters")}</Text>
                {summaryData!.topCharacters.map((c) => (
                  <View key={c.character} style={styles.modalCharRow}>
                    <View style={[styles.modalCharDot, { backgroundColor: CHARACTER_COLORS[c.character] }]} />
                    <Text style={[styles.modalCharName, { color: CHARACTER_COLORS[c.character] }]}>
                      {CHARACTER_LABELS[c.character]}
                    </Text>
                    <Text style={styles.modalCharCount}>{c.count} mesaj</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Son mesajlar */}
            {(summaryData?.topWords.length ?? 0) > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t("vox.recentMessages")}</Text>
                {summaryData!.topWords.slice(0, 4).map((w, i) => (
                  <Text key={i} style={styles.modalWord}>"{w}"</Text>
                ))}
              </View>
            )}

            {/* Butonlar */}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleShareSession}
                style={({ pressed }) => [styles.modalShareBtn, pressed && { opacity: 0.8 }]}
              >
                <IconSymbol size={16} name="square.and.arrow.up" color="#000" />
                <Text style={styles.modalShareText}>{t("vox.share")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowSummary(false)}
                style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalCloseBtnText}>{t("vox.close")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerDot, { backgroundColor: isActive ? "#9B4FDE" : "#2A2A40", opacity: pulseOpacity + 0.5 }]} />
            <Text style={styles.headerTitle}>VOX</Text>
            <Text style={styles.headerSub}>ITC</Text>
          </View>
          <View style={styles.headerRight}>
            {isMicEnabled && (
              <View style={styles.micIndicator}>
                <View style={[styles.micDot, { backgroundColor: micLevelColor }]} />
                <Text style={[styles.micLabel, { color: micLevelColor }]}>
                  {micState.voiceDetected ? t("vox.voiceLabel") : t("vox.micLabel")}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => setShowSettings(!showSettings)}
              style={({ pressed }) => [
                styles.settingsBtn,
                showSettings && { backgroundColor: "#9B4FDE15", borderColor: "#9B4FDE40" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol size={16} name="gearshape.fill" color={showSettings ? "#9B4FDE" : "#3A3A50"} />
            </Pressable>
            <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>

        {/* TTS Uyarı Banner */}
        {ttsWarning && (
          <View style={styles.ttsWarningBanner}>
            <Text style={styles.ttsWarningIcon}>⚠️</Text>
            <Text style={styles.ttsWarningText}>
              Türkçe ses yüklenemedi — yedek ses kullanılıyor
            </Text>
            <Pressable onPress={() => setTtsWarning(false)} style={styles.ttsWarningClose}>
              <Text style={styles.ttsWarningCloseText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Ayarlar Paneli (GhostTube VOX tarzı) */}
        {showSettings && (
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsSectionTitle}>{t("vox.language").toUpperCase()}</Text>

            {/* VOX Dili (TR / EN / DE) */}
            <View style={styles.levelBarRow}>
              <Text style={styles.levelLabel}>{t("vox.language")}</Text>
              <View style={styles.noiseModeRow}>
                {VOX_LANGS.map((lang) => (
                  <Pressable
                    key={lang}
                    onPress={() => changeVoxLanguage(lang)}
                    style={({ pressed }) => [
                      styles.noiseModeBtn,
                      voxLanguage === lang && { backgroundColor: "#9B4FDE20", borderColor: "#9B4FDE60" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[
                      styles.noiseModeBtnText,
                      voxLanguage === lang && { color: "#9B4FDE" },
                    ]}>
                      {VOX_LANG_LABELS[lang]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsDivider} />
            <Text style={styles.settingsSectionTitle}>{t("vox.whiteNoise").toUpperCase()}</Text>

            {/* White Noise Modu */}
            <View style={styles.levelBarRow}>
              <Text style={styles.levelLabel}>{t("vox.whiteNoise")}</Text>
              <View style={styles.noiseModeRow}>
                {NOISE_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => updateSetting("whiteNoiseMode", mode)}
                    style={({ pressed }) => [
                      styles.noiseModeBtn,
                      whiteNoiseMode === mode && { backgroundColor: "#9B4FDE20", borderColor: "#9B4FDE60" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[
                      styles.noiseModeBtnText,
                      whiteNoiseMode === mode && { color: "#9B4FDE" },
                    ]}>
                      {t(NOISE_MODE_KEYS[mode])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {whiteNoiseMode !== "off" && (
              <LevelBar
                label={t("vox.signalStrength")}
                value={whiteNoiseVol}
                color="#9B4FDE"
                onDecrease={() => updateSetting("whiteNoiseVol", Math.max(0, whiteNoiseVol - 0.1))}
                onIncrease={() => updateSetting("whiteNoiseVol", Math.min(1, whiteNoiseVol + 0.1))}
              />
            )}

            <View style={styles.settingsDivider} />
            <Text style={styles.settingsSectionTitle}>FX</Text>

            <LevelBar
              label="REVERB"
              value={reverbLevel}
              color="#00AAFF"
              onDecrease={() => updateSetting("reverb", Math.max(0, reverbLevel - 0.1))}
              onIncrease={() => updateSetting("reverb", Math.min(1, reverbLevel + 0.1))}
            />
            <LevelBar
              label="ECHO"
              value={echoLevel}
              color="#00CCAA"
              onDecrease={() => updateSetting("echo", Math.max(0, echoLevel - 0.1))}
              onIncrease={() => updateSetting("echo", Math.min(1, echoLevel + 0.1))}
            />
            <LevelBar
              label="DISTORTION"
              value={distortionLevel}
              color="#FF6644"
              onDecrease={() => updateSetting("distortion", Math.max(0, distortionLevel - 0.1))}
              onIncrease={() => updateSetting("distortion", Math.min(1, distortionLevel + 0.1))}
            />

            <View style={styles.settingsDivider} />
            <Text style={styles.settingsSectionTitle}>{t("vox.sensitivity").toUpperCase()}</Text>

            <LevelBar
              label={t("vox.sensitivity")}
              value={sensitivity}
              color="#FFAA00"
              onDecrease={() => updateSetting("sensitivity", Math.max(0, sensitivity - 0.1))}
              onIncrease={() => updateSetting("sensitivity", Math.min(1, sensitivity + 0.1))}
            />
          </View>
        )}

        {/* Ana Görselleştirici */}
        <View style={styles.visualizerContainer}>
          {currentWord && (
            <View style={[styles.wordGlow, { backgroundColor: accentColor + "08" }]} />
          )}

          {/* Mikrofon ses seviyesi çubuğu */}
          {isMicEnabled && isActive && (
            <View style={styles.micLevelBar}>
              <View style={styles.micLevelTrack}>
                <View
                  style={[
                    styles.micLevelFill,
                    {
                      width: `${Math.min(100, micState.audioLevel * 100)}%`,
                      backgroundColor: micState.voiceDetected ? "#FF444488" : "#00FF8866",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.micPeakMark,
                    {
                      left: `${Math.min(100, micState.peakLevel * 100)}%`,
                      backgroundColor: micState.voiceDetected ? "#FF4444" : "#00FF88",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.micLevelText, { color: micLevelColor }]}>
                {Math.round(micState.audioLevel * 100)}%
              </Text>
            </View>
          )}

          {/* Dalga formu */}
          <View style={styles.waveformContainer}>
            {waveformData.map((val, i) => {
              const height = Math.max(2, val * 80);
              let barColor: string;
              if (currentWord) {
                barColor = accentColor + (val > 0.5 ? "FF" : "80");
              } else if (isMicEnabled && micState.audioLevel > 0.05) {
                const intensity = Math.min(1, val * 2);
                barColor = micState.voiceDetected
                  ? `rgba(255, 68, 68, ${intensity})`
                  : `rgba(0, 255, 136, ${intensity * 0.7})`;
              } else {
                barColor = "#1A1A2E" + (val > 0.1 ? "80" : "40");
              }
              return (
                <View
                  key={i}
                  style={[styles.waveBar, { height, backgroundColor: barColor }]}
                />
              );
            })}
          </View>

          {/* Kelime gösterimi */}
          <View style={styles.wordDisplay}>
            {currentWord ? (
              <>
                <Text style={[styles.wordText, { color: accentColor }]}>
                  {currentWord.toUpperCase()}
                </Text>
                {currentCharacter && (
                  <View style={[styles.characterBadge, { borderColor: accentColor + "40" }]}>
                    <Text style={[styles.characterText, { color: accentColor }]}>
                      {CHARACTER_LABELS[currentCharacter]}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.waitingText}>
                {isActive
                  ? isMicEnabled
                    ? micState.voiceDetected
                      ? t("vox.scanning")
                      : t("vox.waiting")
                    : t("vox.scanning")
                  : t("vox.startScan")}
              </Text>
            )}
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wordCount}</Text>
            <Text style={styles.statLabel}>WORD</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.statLabel}>TIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isMicEnabled ? "#00FF88" : "#2A2A40" }]}>
              {isMicEnabled ? t("common.on").toUpperCase() : t("common.off").toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>MIC</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isActive ? "#9B4FDE" : "#2A2A40" }]}>
              {isActive ? t("common.on").toUpperCase() : t("common.off").toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>{t("emf.status").toUpperCase()}</Text>
          </View>
        </View>

        {/* Kontrol Butonları */}
        <View style={styles.controlRow}>
          {/* Mikrofon Butonu */}
          <Pressable
            onPress={isActive ? toggleMicrophone : undefined}
            style={({ pressed }) => [
              styles.sideButton,
              {
                backgroundColor: isMicEnabled ? "#00FF8815" : "#0D0D15",
                borderColor: isMicEnabled ? "#00FF8840" : "#1A1A2E",
                opacity: isActive ? (pressed ? 0.8 : 1) : 0.4,
                transform: [{ scale: pressed && isActive ? 0.97 : 1 }],
              },
            ]}
          >
            <IconSymbol
              size={20}
              name={isMicEnabled ? "mic.fill" : "mic.slash.fill"}
              color={isMicEnabled ? "#00FF88" : "#3A3A50"}
            />
            <Text style={[styles.sideButtonText, { color: isMicEnabled ? "#00FF88" : "#3A3A50" }]}>
              {isMicEnabled ? "MİK" : "MİK"}
            </Text>
          </Pressable>

          {/* Ana Başlat/Durdur Butonu */}
          <Pressable
            onPress={toggleActive}
            style={({ pressed }) => [
              styles.mainButton,
              {
                backgroundColor: isActive ? "#1A0A2E" : "#0D0D15",
                borderColor: isActive ? "#9B4FDE40" : "#1A1A2E",
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.buttonInner, { backgroundColor: isActive ? "#9B4FDE15" : "#0A0A12" }]}>
              <IconSymbol
                size={28}
                name={isActive ? "stop.fill" : "play.fill"}
                color={isActive ? "#9B4FDE" : "#3A3A50"}
              />
            </View>
            <Text style={[styles.buttonText, { color: isActive ? "#9B4FDE" : "#3A3A50" }]}>
              {isActive ? t("vox.stop") : t("vox.start")}
            </Text>
          </Pressable>

          {/* Ekran Kaydı Butonu */}
          <Pressable
            onPress={isActive ? toggleRecording : undefined}
            style={({ pressed }) => [
              styles.sideButton,
              {
                backgroundColor: isRecording ? "#FF220015" : "#0D0D15",
                borderColor: isRecording ? "#FF220040" : "#1A1A2E",
                opacity: isActive ? (pressed ? 0.8 : 1) : 0.4,
                transform: [{ scale: pressed && isActive ? 0.97 : 1 }],
              },
            ]}
          >
            <IconSymbol
              size={20}
              name={isRecording ? "stop.fill" : "mic.fill"}
              color={isRecording ? "#FF4444" : "#3A3A50"}
            />
            <Text style={[styles.sideButtonText, { color: isRecording ? "#FF4444" : "#3A3A50" }]}>
              {isRecording ? formatTime(recordingState.duration) : t("vox.recording")}
            </Text>
          </Pressable>
        </View>

        {/* Kayıt durumu göstergesi */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {t("evp.recording")} — {formatTime(recordingState.duration)}
            </Text>
          </View>
        )}

        {/* Mikrofon izin durumu mesajı */}
        {micState.status === "denied" && (
          <View style={styles.micWarning}>
            <IconSymbol size={14} name="exclamationmark.triangle.fill" color="#FF4444" />
            <Text style={styles.micWarningText}>
              Microphone permission denied.
            </Text>
          </View>
        )}

        {/* Kelime Geçmişi */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>{t("vox.wordHistory").toUpperCase()}</Text>
            <Text style={styles.logCount}>{wordLog.length}</Text>
          </View>

          <ScrollView
            style={styles.logScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {wordLog.length === 0 ? (
              <View style={styles.logEmpty}>
                <Text style={styles.logEmptyText}>
                  {isActive ? t("vox.wordsAppear") : t("vox.startScan")}
                </Text>
              </View>
            ) : (
              wordLog.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={[styles.logDot, { backgroundColor: CHARACTER_COLORS[log.character] }]} />
                  <View style={styles.logContent}>
                    <View style={styles.logWordRow}>
                      <Text style={[styles.logWord, { color: CHARACTER_COLORS[log.character] }]}>
                        {log.word}
                      </Text>
                      {log.triggeredByVoice && (
                        <View style={styles.voiceTriggerBadge}>
                          <Text style={styles.voiceTriggerText}>MİK</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.logMeta}>
                      {CHARACTER_LABELS[log.character]} · {log.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D0D0E0",
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "500",
    color: "#3A3A50",
    letterSpacing: 2,
    marginTop: 2,
  },
  ttsWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A1800",
    borderWidth: 1,
    borderColor: "#FFAA0040",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ttsWarningIcon: {
    fontSize: 14,
  },
  ttsWarningText: {
    flex: 1,
    fontSize: 11,
    color: "#FFAA00",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  ttsWarningClose: {
    padding: 4,
  },
  ttsWarningCloseText: {
    fontSize: 12,
    color: "#AA7700",
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  settingsBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1A1A2E",
    backgroundColor: "#0D0D15",
  },

  // Mikrofon göstergesi
  micIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00FF8810",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00FF8820",
  },
  micDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  micLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Ayarlar paneli (GhostTube VOX tarzı)
  settingsPanel: {
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 12,
    gap: 8,
  },
  settingsSectionTitle: {
    fontSize: 8,
    fontWeight: "700",
    color: "#3A3A50",
    letterSpacing: 3,
    marginBottom: 2,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: "#141420",
    marginVertical: 4,
  },
  levelBarRow: {
    gap: 4,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#5A5A70",
    letterSpacing: 1.5,
  },
  levelControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#141420",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1A1A2E",
  },
  levelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6A6A80",
  },
  levelTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#141420",
    borderRadius: 3,
    overflow: "hidden",
  },
  levelFill: {
    height: "100%",
    borderRadius: 3,
  },
  levelValue: {
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    width: 32,
    textAlign: "right",
  },
  noiseModeRow: {
    flexDirection: "row",
    gap: 6,
  },
  noiseModeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1A1A2E",
    backgroundColor: "#0D0D15",
    alignItems: "center",
  },
  noiseModeBtnText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#3A3A50",
    letterSpacing: 1,
  },

  // Görselleştirici
  visualizerContainer: {
    backgroundColor: "#0A0A12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 16,
    alignItems: "center",
    minHeight: 160,
    justifyContent: "center",
    overflow: "hidden",
  },
  wordGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },

  // Mikrofon ses seviyesi
  micLevelBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
    marginBottom: 8,
  },
  micLevelTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#141420",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  micLevelFill: {
    height: "100%",
    borderRadius: 2,
  },
  micPeakMark: {
    position: "absolute",
    top: 0,
    width: 2,
    height: "100%",
    borderRadius: 1,
  },
  micLevelText: {
    fontSize: 9,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    width: 30,
    textAlign: "right",
  },

  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    gap: 2,
    width: "100%",
  },
  waveBar: {
    width: (SCREEN_WIDTH - 80) / 40,
    borderRadius: 1,
    minHeight: 2,
  },
  wordDisplay: {
    alignItems: "center",
    marginTop: 12,
    gap: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  wordText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
  },
  characterBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  characterText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
  },
  waitingText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#2A2A40",
    letterSpacing: 3,
    textAlign: "center",
  },

  // İstatistikler
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#141420",
    paddingVertical: 8,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0E0",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 7,
    fontWeight: "500",
    color: "#2A2A40",
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#141420",
  },

  // Kontrol satırı
  controlRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  sideButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
    width: 66,
  },
  sideButtonText: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FF444410",
    borderRadius: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FF444420",
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF4444",
  },
  recordingText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FF4444",
    letterSpacing: 2,
  },
  mainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  buttonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
  },

  // Mikrofon uyarı
  micWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF444410",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FF444420",
  },
  micWarningText: {
    fontSize: 10,
    color: "#FF4444",
    flex: 1,
  },

  // Log
  logSection: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    overflow: "hidden",
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  logTitle: {
    fontSize: 9,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 3,
  },
  logCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2A2A40",
    fontVariant: ["tabular-nums"],
  },
  logScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  logEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  logEmptyText: {
    fontSize: 11,
    color: "#1E1E30",
    letterSpacing: 1,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D15",
  },
  logDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  logContent: {
    flex: 1,
    gap: 1,
  },
  logWordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logWord: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  voiceTriggerBadge: {
    backgroundColor: "#00FF8815",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#00FF8830",
  },
  voiceTriggerText: {
    fontSize: 7,
    fontWeight: "700",
    color: "#00FF88",
    letterSpacing: 1,
  },
  logMeta: {
    fontSize: 9,
    color: "#2A2A40",
    letterSpacing: 0.5,
  },

  // ── OTURUM ÖZETİ MODAL ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#0D0D18",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9B4FDE40",
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    alignItems: "center",
    gap: 6,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9B4FDE",
    letterSpacing: 3,
  },
  modalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#060609",
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1A1A2E",
  },
  modalStatItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  modalStatValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E0E0FF",
    fontVariant: ["tabular-nums"],
  },
  modalStatLabel: {
    fontSize: 9,
    color: "#3A3A50",
    letterSpacing: 2,
    fontWeight: "600",
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: "#1A1A2E",
  },
  modalSection: {
    gap: 6,
  },
  modalSectionTitle: {
    fontSize: 9,
    color: "#3A3A50",
    letterSpacing: 2,
    fontWeight: "600",
    marginBottom: 2,
  },
  modalCharRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  modalCharDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalCharName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  modalCharCount: {
    fontSize: 11,
    color: "#3A3A50",
  },
  modalWord: {
    fontSize: 12,
    color: "#9B88CC",
    fontStyle: "italic",
    paddingVertical: 2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#9B4FDE",
    borderRadius: 10,
    paddingVertical: 13,
  },
  modalShareText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
  },
  modalCloseBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#1A1A2E",
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
});

function LevelBar({ label, value, color, onDecrease, onIncrease }: {
  label: string; value: number; color: string;
  onDecrease: () => void; onIncrease: () => void;
}) {
  return (
    <View style={styles.levelBarRow}>
      <Text style={styles.levelLabel}>{label}</Text>
      <View style={styles.levelControls}>
        <Pressable
          onPress={onDecrease}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
          style={({ pressed }) => [styles.levelBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.levelBtnText}>−</Text>
        </Pressable>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${value * 100}%`, backgroundColor: color }]} />
        </View>
        <Pressable
          onPress={onIncrease}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          style={({ pressed }) => [styles.levelBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.levelBtnText}>+</Text>
        </Pressable>
        <Text style={[styles.levelValue, { color }]}>{Math.round(value * 100)}%</Text>
      </View>
    </View>
  );
}
