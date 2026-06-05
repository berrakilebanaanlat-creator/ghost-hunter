import { useState, useEffect, useRef, useCallback } from "react";
import { Text, View, Pressable, StyleSheet, FlatList, Platform, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";
import { addRecording } from "@/lib/recording-history";
import {
  setGlobalRecorder,
  stopIdleRecording,
  startIdleRecordingIfPermitted,
} from "@/lib/evp-audio-recorder";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
} from "expo-audio";

interface EVPRecording {
  id: string;
  timestamp: Date;
  duration: number;
  level: number;
  audioUri: string;
}

/**
 * Recorder State Machine:
 * idle → preparing → recording → stopping → idle
 *
 * Bu state machine, native AudioRecorder'ın gerçek durumunu takip eder.
 * React state (isRecording) ile native state her zaman senkronize tutulur.
 */
type RecorderPhase = "idle" | "preparing" | "recording" | "stopping";

/**
 * Timeout ile Promise sarmalama - ANR koruması
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[EVP] ${label} timeout (${ms}ms)`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export default function EVPScreen() {
  // expo-audio hook - native'de doğru çalışır
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<EVPRecording[]>([]);
  const [waveform, setWaveform] = useState<number[]>(new Array(40).fill(0));
  const [recordingTime, setRecordingTime] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // State machine refs - React state yerine ref kullanılır çünkü
  // async işlemler sırasında güncel değere erişim gerekir
  const phaseRef = useRef<RecorderPhase>("idle");
  const lockRef = useRef(false); // Mutex lock

  // Waveform animasyonu
  useEffect(() => {
    if (isRecording) {
      waveRef.current = setInterval(() => {
        setWaveform(Array.from({ length: 40 }, () => Math.random()));
      }, 80);
    } else {
      if (waveRef.current) clearInterval(waveRef.current);
      setWaveform(new Array(40).fill(0));
    }
    return () => {
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, [isRecording]);

  // Süre sayacı
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Pulse
  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording]);

  // Arka plan crash koruması: audioRecorder'ı global'e bağla
  // Bu sayede expo-audio'nun OnActivityEntersBackground pause() çağrısı
  // her zaman Recording durumundaki bir recorder'a yapılır (IllegalStateException önlenir)
  useEffect(() => {
    setGlobalRecorder(audioRecorder);
    return () => {
      setGlobalRecorder(null);
    };
  }, [audioRecorder]);

  // Cleanup on unmount - recorder'ı güvenli şekilde durdur
  useEffect(() => {
    return () => {
      // Player temizle
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch { /* */ }
      }
      // Recorder recording durumundaysa durdur
      if (phaseRef.current === "recording") {
        try { audioRecorder.stop(); } catch { /* */ }
      }
      // State sıfırla
      phaseRef.current = "idle";
      lockRef.current = false;
    };
  }, []);

  /**
   * KAYIT BAŞLAT - Crash-safe
   *
   * Korumalar:
   * 1. Phase kontrolü: Sadece "idle" durumunda başlatılabilir
   * 2. Mutex lock: Hızlı tıklama koruması
   * 3. Timeout: Her native çağrı için 5s timeout (ANR koruması)
   * 4. Try-catch: Her adım ayrı try-catch ile sarmalanmış
   * 5. Rollback: Hata durumunda state temiz bırakılır
   */
  const handleStartRecording = useCallback(async () => {
    // 1. Phase kontrolü
    if (phaseRef.current !== "idle") {
      console.warn(`[EVP] Kayıt başlatılamaz, phase: ${phaseRef.current}`);
      return;
    }

    // 2. Mutex lock
    if (lockRef.current) {
      console.warn("[EVP] İşlem devam ediyor, tıklama engellendi");
      return;
    }
    lockRef.current = true;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // 3. İzin ön kontrolü - önce mevcut izni kontrol et, yoksa iste
      try {
        const currentPerm = await getRecordingPermissionsAsync();
        if (!currentPerm.granted) {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
            console.warn("[EVP] Mikrofon izni verilmedi");
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Mikrofon İzni", "EVP kaydı için mikrofon izni gerekli. Lütfen ayarlardan izin verin.");
            }
            return;
          }
        }
      } catch (permError) {
        console.error("[EVP] İzin kontrolü hatası:", permError);
        return;
      }

      // 4. Phase: preparing
      phaseRef.current = "preparing";

      // 5. Audio modunu ayarla (timeout korumalı)
      try {
        await withTimeout(
          setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          }),
          3000,
          "setAudioModeAsync"
        );
      } catch (modeError) {
        console.error("[EVP] Audio mode hatası:", modeError);
        phaseRef.current = "idle";
        return;
      }

      // 6. Eğer recorder zaten kayıt yapıyorsa, önce güvenli durdur
      try {
        if (audioRecorder.isRecording) {
          console.warn("[EVP] Recorder zaten kayıt yapıyor, önce durduruluyor...");
          try { await withTimeout(audioRecorder.stop(), 3000, "pre-stop"); } catch { /* */ }
        }
      } catch { /* isRecording kontrolü başarısız, devam et */ }

      // 6b. Arka plan idle kaydını durdur (gerçek kayıt başlamadan önce)
      // Eğer idle kayıt çalışıyorsa, recorder'ı serbest bırak
      await stopIdleRecording();

      // 7. Prepare (timeout korumalı)
      try {
        await withTimeout(
          audioRecorder.prepareToRecordAsync(),
          5000,
          "prepareToRecordAsync"
        );
      } catch (prepareError) {
        console.error("[EVP] Prepare hatası:", prepareError);
        phaseRef.current = "idle";
        // Audio modunu geri al
        try {
          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        } catch { /* sessizce geç */ }
        if (Platform.OS !== "web") {
          Alert.alert("Kayıt Hatası", "Ses kaydedici hazırlanamadı. Lütfen tekrar deneyin.");
        }
        return;
      }

      // 8. Kısa bekleme - native tarafın hazır olmasını garantile (v4: 100ms)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 9. Record başlat - native state doğrulama ile (v4)
      try {
        // Eğer zaten recording durumundaysa, tekrar record() çağırma
        if (audioRecorder.isRecording) {
          console.warn('[EVP] Recorder zaten recording durumunda, record() atlanıyor');
        } else {
          audioRecorder.record();
        }
      } catch (recordError: any) {
        console.error("[EVP] Record hatası:", recordError);
        phaseRef.current = "idle";
        // Cleanup: recorder'ı durdurmaya çalış
        try { await audioRecorder.stop(); } catch { /* */ }
        try {
          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        } catch { /* */ }
        if (Platform.OS !== "web") {
          const msg = recordError?.message?.includes("IllegalState")
            ? "Ses kaydedici hazır değil. Lütfen uygulamayı yeniden başlatın."
            : "Kayıt başlatılamadı. Mikrofon başka bir uygulama tarafından kullanılıyor olabilir.";
          Alert.alert("Kayıt Hatası", msg);
        }
        return;
      }

      // 10. Başarılı - Phase: recording, UI güncelle
      phaseRef.current = "recording";
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("[EVP] Kayıt başlatma genel hatası:", error);
      phaseRef.current = "idle";
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      lockRef.current = false;
    }
  }, [audioRecorder]);

  /**
   * KAYIT DURDUR - Crash-safe
   *
   * Korumalar:
   * 1. Phase kontrolü: Sadece "recording" durumunda durdurulabilir
   * 2. Mutex lock: Hızlı tıklama koruması
   * 3. Timeout: stop() için 5s timeout (ANR koruması)
   * 4. Guaranteed cleanup: Hata olsa bile UI state temizlenir
   */
  const handleStopRecording = useCallback(async () => {
    // 1. Phase kontrolü
    if (phaseRef.current !== "recording") {
      console.warn(`[EVP] Kayıt durdurulamaz, phase: ${phaseRef.current}`);
      return;
    }

    // 2. Mutex lock
    if (lockRef.current) {
      console.warn("[EVP] İşlem devam ediyor, tıklama engellendi");
      return;
    }
    lockRef.current = true;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // 3. Phase: stopping
      phaseRef.current = "stopping";

      // 4. Native state kontrolü + Stop (timeout korumalı - ANR koruması) (v4)
      let uri: string | null = null;
      try {
        // Kısa bekleme - native state'in güncel olmasını garantile
        await new Promise(resolve => setTimeout(resolve, 50));

        // Native recorder'ın gerçekten kayıt yapıp yapmadığını kontrol et
        let isActuallyRecording = false;
        try {
          isActuallyRecording = audioRecorder.isRecording === true;
        } catch {
          // isRecording erişimi crash verebilir - güvenli varsayım: kayıt yapıyor
          isActuallyRecording = true;
        }

        if (!isActuallyRecording) {
          // Native tarafta kayıt zaten durmuş - stop() çağırmaya gerek yok
          console.warn("[EVP] Native recorder zaten durmuş, stop() atlanıyor");
          try { uri = audioRecorder.uri || null; } catch { uri = null; }
        } else {
          await withTimeout(audioRecorder.stop(), 5000, "stop");
          try { uri = audioRecorder.uri || null; } catch { uri = null; }
        }
      } catch (stopError) {
        console.error("[EVP] Stop hatası:", stopError);
        // Hata olsa bile URI'yi almaya çalış
        try { uri = audioRecorder.uri || null; } catch { uri = null; }
      }

      // 5. UI güncelle (hata olsa bile)
      setIsRecording(false);

      // 6. Audio modunu sıfırla
      try {
        await withTimeout(
          setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: false,
          }),
          3000,
          "setAudioModeAsync (reset)"
        );
      } catch (modeError) {
        console.error("[EVP] Audio mode sıfırlama hatası:", modeError);
        // Kritik değil, devam et
      }

      // 7. Kayıt listesine ekle
      if (recordingTime > 0 && uri) {
        const activityLevel = Math.random() * 100;
        const newRecording: EVPRecording = {
          id: Date.now().toString(),
          timestamp: new Date(),
          duration: recordingTime,
          level: activityLevel,
          audioUri: uri,
        };
        setRecordings((prev) => [newRecording, ...prev]);

        // Geçmiş sayfasına da kaydet (AsyncStorage)
        addRecording({
          duration: recordingTime,
          audioUri: uri,
          source: "evp",
          activityLevel: Math.round(activityLevel),
        }).catch((err) => console.error("[EVP] History kaydetme hatası:", err));
      }

      // 8. Phase: idle
      phaseRef.current = "idle";

      // 9. Arka plan crash koruması: idle kaydı yeniden başlat
      // Recorder her zaman Recording durumunda olmalı
      startIdleRecordingIfPermitted().catch(() => {});
    } catch (error) {
      console.error("[EVP] Kayıt durdurma genel hatası:", error);
      // Guaranteed cleanup
      setIsRecording(false);
      phaseRef.current = "idle";
      startIdleRecordingIfPermitted().catch(() => {});
    } finally {
      lockRef.current = false;
    }
  }, [audioRecorder, recordingTime]);

  const handlePlayAudio = useCallback((uri: string) => {
    try {
      // Önceki player'ı temizle
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch { /* */ }
      }
      playerRef.current = createAudioPlayer({ uri });
      playerRef.current.play();
    } catch (error) {
      console.error("[EVP] Ses oynatma hatası:", error);
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const pulseOpacity = isRecording ? 0.3 + Math.sin(pulsePhase * 0.12) * 0.2 : 0.1;

  // Buton disabled durumu - işlem devam ederken tıklanamaz
  const isButtonDisabled = lockRef.current || (phaseRef.current !== "idle" && phaseRef.current !== "recording");

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerDot, { backgroundColor: isRecording ? "#FF6B35" : "#2A2A40", opacity: pulseOpacity + 0.5 }]} />
            <Text style={styles.headerTitle}>EVP</Text>
            <Text style={styles.headerSub}>{t("evp.record")}</Text>
          </View>
          <Text style={styles.headerTime}>{formatTime(recordingTime)}</Text>
        </View>

        {/* Waveform Görselleştirici */}
        <View style={styles.waveContainer}>
          <View style={styles.waveformArea}>
            {waveform.map((val, i) => {
              const height = Math.max(2, val * 60);
              const barColor = isRecording
                ? val > 0.7 ? "#FF6B35" : val > 0.4 ? "#FF6B3580" : "#FF6B3540"
                : "#1A1A2E40";
              return (
                <View
                  key={i}
                  style={[styles.waveBar, { height, backgroundColor: barColor }]}
                />
              );
            })}
          </View>

          {/* Kayıt durumu */}
          <View style={styles.recordingStatus}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recDot, { opacity: pulseOpacity + 0.5 }]} />
                <Text style={styles.recText}>{t("evp.recording")}</Text>
              </View>
            ) : (
              <Text style={styles.readyText}>{t("home.ready").toUpperCase()}</Text>
            )}
          </View>

          {/* Süre göstergesi */}
          <Text style={[styles.timeDisplay, { color: isRecording ? "#FF6B35" : "#2A2A40" }]}>
            {formatTime(recordingTime)}
          </Text>
        </View>

        {/* Frekans Barları */}
        <View style={styles.freqContainer}>
          <View style={styles.freqBars}>
            {Array.from({ length: 20 }).map((_, i) => {
              const h = isRecording ? Math.random() * 100 : 15;
              return (
                <View
                  key={i}
                  style={[
                    styles.freqBar,
                    {
                      height: `${Math.max(5, h)}%`,
                      backgroundColor: h > 70 ? "#FF6B35" : h > 40 ? "#FF6B3580" : "#FF6B3530",
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Kontrol Butonu */}
        <Pressable
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          style={({ pressed }) => [
            styles.mainButton,
            {
              backgroundColor: isRecording ? "#1A0A0A" : "#0D0D15",
              borderColor: isRecording ? "#FF333340" : "#FF6B3530",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.buttonInner, { backgroundColor: isRecording ? "#FF333315" : "#FF6B3510" }]}>
            <IconSymbol
              size={24}
              name={isRecording ? "stop.fill" : "mic.fill"}
              color={isRecording ? "#FF3333" : "#FF6B35"}
            />
          </View>
          <Text style={[styles.buttonText, { color: isRecording ? "#FF3333" : "#FF6B35" }]}>
            {isRecording ? t("evp.stop") : t("evp.record")}
          </Text>
        </Pressable>

        {/* Kayıt Listesi */}
        <View style={styles.recordingsList}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t("evp.recordings").toUpperCase()}</Text>
            <Text style={styles.listCount}>{recordings.length}</Text>
          </View>
          <FlatList
            data={recordings}
            keyExtractor={(item) => item.id}
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.listEmpty}>
                <Text style={styles.listEmptyText}>{t("evp.noRecordings")}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemTime}>
                    {item.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </Text>
                  <Text style={styles.listItemMeta}>
                    {formatTime(item.duration)} · %{item.level.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.listItemActions}>
                  <Pressable
                    onPress={() => handlePlayAudio(item.audioUri)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { opacity: pressed ? 0.6 : 1, borderColor: "#FF6B3530" },
                    ]}
                  >
                    <IconSymbol size={14} name="play.fill" color="#FF6B35" />
                  </Pressable>
                  <Pressable
                    onPress={() => setRecordings((prev) => prev.filter((r) => r.id !== item.id))}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { opacity: pressed ? 0.6 : 1, borderColor: "#FF333330" },
                    ]}
                  >
                    <IconSymbol size={14} name="trash" color="#FF3333" />
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      </View>
      <AdBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
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
  headerTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },

  // Waveform
  waveContainer: {
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  waveformArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: 60,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  recordingStatus: {
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3333",
  },
  recText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FF3333",
    letterSpacing: 3,
  },
  readyText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 3,
  },
  timeDisplay: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },

  // Frekans
  freqContainer: {
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 10,
    height: 50,
  },
  freqBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 2,
  },
  freqBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 2,
  },

  // Buton
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 4,
  },

  // Kayıt listesi
  recordingsList: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 10,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3A3A50",
    letterSpacing: 3,
  },
  listCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2A2A40",
  },
  listScroll: {
    flex: 1,
  },
  listEmpty: {
    alignItems: "center",
    paddingVertical: 20,
  },
  listEmptyText: {
    fontSize: 10,
    color: "#1A1A2E",
    letterSpacing: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D15",
  },
  listItemLeft: {
    gap: 2,
  },
  listItemTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A5A70",
    fontVariant: ["tabular-nums"],
  },
  listItemMeta: {
    fontSize: 9,
    color: "#2A2A40",
    letterSpacing: 1,
  },
  listItemActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D15",
  },
});
