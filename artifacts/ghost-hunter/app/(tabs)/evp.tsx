import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlowText } from "@/components/GlowText";
import { useApp } from "@/contexts/AppContext";

interface Recording {
  id: string;
  uri: string;
  duration: number;
  timestamp: number;
  label: string;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function EVPScreen() {
  const insets = useSafeAreaInsets();
  const { addSession } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveHeights] = useState(() =>
    Array.from({ length: 30 }, () => new Animated.Value(4))
  );

  const recordingRef = useRef<any>(null);
  const playbackRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart = useRef<number | null>(null);
  const waveAnim = useRef<Animated.CompositeAnimation | null>(null);

  const animateWave = useCallback((active: boolean) => {
    if (waveAnim.current) waveAnim.current.stop();
    if (!active) {
      waveHeights.forEach((h) => Animated.timing(h, { toValue: 4, duration: 200, useNativeDriver: false }).start());
      return;
    }
    waveAnim.current = Animated.loop(
      Animated.stagger(
        60,
        waveHeights.map((h) =>
          Animated.sequence([
            Animated.timing(h, {
              toValue: Math.random() * 40 + 10,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(h, { toValue: 4, duration: 200, useNativeDriver: false }),
          ])
        )
      )
    );
    waveAnim.current.start();
  }, [waveHeights]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      sessionStart.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1000), 1000);
      animateWave(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }

    try {
      const { Audio } = require("expo-av");
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Mikrofon erişimi gerekli.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      sessionStart.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1000), 1000);
      animateWave(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      sessionStart.current = Date.now();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1000), 1000);
      animateWave(true);
    }
  }, [animateWave]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    animateWave(false);
    setIsRecording(false);

    const now = Date.now();
    const start = sessionStart.current ?? now;
    const duration = now - start;

    let uri = "";
    if (Platform.OS !== "web" && recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        uri = recordingRef.current.getURI() ?? "";
      } catch {}
      recordingRef.current = null;
    }

    if (duration > 1000) {
      const rec: Recording = {
        id: now.toString() + Math.random().toString(36).substr(2, 5),
        uri,
        duration,
        timestamp: start,
        label: `EVP Kaydı #${recordings.length + 1}`,
      };
      setRecordings((prev) => [rec, ...prev]);
      addSession({
        id: rec.id,
        startTime: start,
        endTime: now,
        duration,
        tool: "EVP",
        eventsDetected: 0,
      });
    }

    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [recordings.length, addSession, animateWave]);

  const playRecording = useCallback(async (rec: Recording) => {
    if (Platform.OS === "web" || !rec.uri) {
      Alert.alert("Bilgi", "Web ortamında kayıt oynatma desteklenmiyor.");
      return;
    }
    if (playbackRef.current) {
      try { await playbackRef.current.unloadAsync(); } catch {}
      playbackRef.current = null;
    }
    if (playingId === rec.id) {
      setPlayingId(null);
      return;
    }
    try {
      const { Audio } = require("expo-av");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: rec.uri });
      playbackRef.current = sound;
      setPlayingId(rec.id);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) setPlayingId(null);
      });
    } catch {
      setPlayingId(null);
    }
  }, [playingId]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackRef.current) playbackRef.current.unloadAsync().catch(() => {});
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    },
    []
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.header}>
        <GlowText text="EVP KAYDEDICI" size={13} color="#5050a0" weight="600" />
        <Text style={styles.title}>Ses Fenomeni</Text>
      </View>

      <View style={styles.recorderCard}>
        <View style={styles.waveRow}>
          {waveHeights.map((h, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: h,
                  backgroundColor: isRecording ? "#00ff88" : "#1c1c34",
                  opacity: isRecording ? 0.6 + (i % 3) * 0.13 : 1,
                },
              ]}
            />
          ))}
        </View>

        {isRecording && (
          <View style={styles.recIndicator}>
            <View style={styles.recDot} />
            <GlowText
              text={formatDuration(recordingDuration)}
              size={32}
              color="#ff3366"
              weight="700"
            />
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.recBtn,
            { backgroundColor: isRecording ? "#2a0a10" : "#0a1a0f", opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          testID="evp-toggle-btn"
        >
          <LinearGradient
            colors={isRecording ? ["#ff336620", "#ff336610"] : ["#00ff8820", "#00ff8810"]}
            style={styles.recBtnGradient}
          >
            <GlowText
              text={isRecording ? "KAYDI DURDUR" : "KAYIT BASLAT"}
              size={16}
              color={isRecording ? "#ff3366" : "#00ff88"}
              weight="700"
            />
          </LinearGradient>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>KAYITLAR</Text>

      <FlatList
        data={recordings}
        keyExtractor={(r) => r.id}
        style={styles.list}
        scrollEnabled={recordings.length > 3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz kayıt yok</Text>
            <Text style={styles.emptySubText}>İlk EVP kaydınızı oluşturun</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.recItem}>
            <View style={styles.recInfo}>
              <Text style={styles.recLabel}>{item.label}</Text>
              <Text style={styles.recMeta}>
                {formatTime(item.timestamp)} · {formatDuration(item.duration)}
              </Text>
            </View>
            <View style={styles.recActions}>
              <Pressable
                style={[styles.actionBtn, playingId === item.id && styles.actionBtnActive]}
                onPress={() => playRecording(item)}
              >
                <Text style={styles.actionBtnText}>
                  {playingId === item.id ? "■" : "▶"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() =>
                  setRecordings((prev) => prev.filter((r) => r.id !== item.id))
                }
              >
                <Text style={[styles.actionBtnText, { color: "#ff3366" }]}>✕</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
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
  recorderCard: {
    backgroundColor: "#0e0e1c",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1c1c34",
    gap: 16,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    gap: 3,
    justifyContent: "center",
  },
  waveBar: { width: 4, borderRadius: 2 },
  recIndicator: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff3366" },
  recBtn: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#1c1c34" },
  recBtnGradient: { paddingVertical: 16, alignItems: "center" },
  sectionLabel: {
    color: "#5050a0",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  list: { flex: 1 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#5050a0", fontSize: 16, fontFamily: "Inter_500Medium" },
  emptySubText: { color: "#2a2a50", fontSize: 13, fontFamily: "Inter_400Regular" },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e0e1c",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  recInfo: { flex: 1, gap: 4 },
  recLabel: { color: "#ddddf0", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  recMeta: { color: "#5050a0", fontSize: 12, fontFamily: "Inter_400Regular" },
  recActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#141428",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  actionBtnActive: { borderColor: "#00ff88", backgroundColor: "#0a1a0f" },
  actionBtnText: { color: "#00ff88", fontSize: 14 },
});
