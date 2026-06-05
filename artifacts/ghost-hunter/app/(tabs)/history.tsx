import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlowText } from "@/components/GlowText";
import { Session, useApp } from "@/contexts/AppContext";

const TOOL_LABELS: Record<Session["tool"], string> = {
  EMF: "EMF Dedektörü",
  EVP: "EVP Kaydedici",
  RADAR: "Paranormal Radar",
  SPIRIT_BOX: "Spirit Box",
};

const TOOL_COLORS: Record<Session["tool"], string> = {
  EMF: "#00ff88",
  EVP: "#ffaa00",
  RADAR: "#00ccff",
  SPIRIT_BOX: "#7b2fff",
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}dk ${sec}s`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { sessions, deleteSession } = useApp();

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert("Sil", "Bu oturumu silmek istiyor musunuz?", [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            deleteSession(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]);
    },
    [deleteSession]
  );

  const totalSessions = sessions.length;
  const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalEvents = sessions.reduce((sum, s) => sum + s.eventsDetected, 0);

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
        <GlowText text="ARAŞTIRMA GEÇMİŞİ" size={13} color="#5050a0" weight="600" />
        <Text style={styles.title}>Seans Kayıtları</Text>
      </View>

      <LinearGradient
        colors={["#0e0e1c", "#08080f"]}
        style={styles.summaryCard}
      >
        <View style={styles.summaryItem}>
          <GlowText text={totalSessions.toString()} size={28} color="#00ff88" weight="700" />
          <Text style={styles.summaryLabel}>ARAŞTIRMA</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <GlowText text={formatDuration(totalTime)} size={22} color="#ffaa00" weight="700" />
          <Text style={styles.summaryLabel}>TOPLAM SÜRE</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <GlowText text={totalEvents.toString()} size={28} color="#7b2fff" weight="700" />
          <Text style={styles.summaryLabel}>OLAY</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 90 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#2a2a50" />
            <Text style={styles.emptyText}>Henüz araştırma yok</Text>
            <Text style={styles.emptySubText}>
              Bir araç başlatın ve araştırmalarınız burada görünecek
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <View
              style={[
                styles.toolIndicator,
                { backgroundColor: TOOL_COLORS[item.tool] + "20" },
              ]}
            >
              <View
                style={[
                  styles.toolDot,
                  { backgroundColor: TOOL_COLORS[item.tool] },
                ]}
              />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.toolName}>{TOOL_LABELS[item.tool]}</Text>
              <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionDetail}>{formatDuration(item.duration)}</Text>
                {item.peakReading !== undefined && (
                  <Text style={styles.sessionDetail}>Peak: {Math.round(item.peakReading)} mG</Text>
                )}
                {item.eventsDetected > 0 && (
                  <Text style={[styles.sessionDetail, { color: TOOL_COLORS[item.tool] }]}>
                    {item.eventsDetected} olay
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => confirmDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ff3366" />
            </Pressable>
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
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  summaryItem: { alignItems: "center", gap: 4 },
  summaryLabel: { color: "#5050a0", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  divider: { width: 1, height: 40, backgroundColor: "#1c1c34" },
  list: { flex: 1 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: "#5050a0", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubText: {
    color: "#2a2a50",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: "#0e0e1c",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1c1c34",
  },
  toolIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toolDot: { width: 10, height: 10, borderRadius: 5 },
  sessionInfo: { flex: 1, gap: 3 },
  toolName: { color: "#ddddf0", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionDate: { color: "#5050a0", fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sessionDetail: { color: "#9090b0", fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1a080e",
  },
});
