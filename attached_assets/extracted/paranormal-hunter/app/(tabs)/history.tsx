import { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { t } from "@/lib/i18n";
import {
  type RecordingEntry,
  type DateFilter,
  type RecordingSource,
  getAllRecordings,
  deleteRecording,
  toggleFavorite,
  filterByDate,
  filterFavorites,
  filterBySource,
  formatDuration,
  formatDate,
  getSourceLabel,
  getSourceColor,
} from "@/lib/recording-history";

// ============================================================
// FILTER CHIPS
// ============================================================

const DATE_FILTERS: { key: DateFilter; labelKey: string }[] = [
  { key: "all", labelKey: "whatsNew.historyAll" },
  { key: "today", labelKey: "whatsNew.historyToday" },
  { key: "week", labelKey: "whatsNew.historyWeek" },
  { key: "month", labelKey: "whatsNew.historyMonth" },
];

const SOURCE_FILTERS: { key: RecordingSource | "all"; label: string; color: string }[] = [
  { key: "all", label: "ALL", color: "#6B5BFF" },
  { key: "evp", label: "EVP", color: "#FF6B35" },
  { key: "vox", label: "VOX", color: "#00FF88" },
  { key: "itc", label: "ITC", color: "#6B5BFF" },
];

// ============================================================
// COMPONENT
// ============================================================

export default function HistoryScreen() {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<RecordingSource | "all">("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Kayıtları yükle
  const loadRecordings = useCallback(async () => {
    try {
      const all = await getAllRecordings();
      setRecordings(all);
    } catch (error) {
      console.error("[History] Kayıtlar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch {
          /* */
        }
      }
    };
  }, []);

  // Filtrelenmiş kayıtlar
  const filteredRecordings = (() => {
    let result = filterByDate(recordings, dateFilter);
    if (sourceFilter !== "all") {
      result = filterBySource(result, sourceFilter);
    }
    if (showFavoritesOnly) {
      result = filterFavorites(result);
    }
    return result;
  })();

  // Favori toggle
  const handleToggleFavorite = useCallback(
    async (id: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await toggleFavorite(id);
      // Optimistic update
      setRecordings((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
        )
      );
    },
    []
  );

  // Kayıt sil
  const handleDelete = useCallback(
    (id: string) => {
      const doDelete = async () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        // Oynatılıyorsa durdur
        if (playingId === id) {
          stopPlayback();
        }
        await deleteRecording(id);
        setRecordings((prev) => prev.filter((r) => r.id !== id));
      };

      if (Platform.OS === "web") {
        doDelete();
        return;
      }

      Alert.alert(
        t("whatsNew.historyDeleteTitle"),
        t("whatsNew.historyDeleteMessage"),
        [
          { text: t("whatsNew.historyCancel"), style: "cancel" },
          {
            text: t("whatsNew.historyDelete"),
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    },
    [playingId]
  );

  // Ses oynat
  const handlePlay = useCallback(
    async (entry: RecordingEntry) => {
      try {
        // Aynı kayıt çalıyorsa durdur
        if (playingId === entry.id) {
          stopPlayback();
          return;
        }

        // Önceki player'ı temizle
        stopPlayback();

        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });

        playerRef.current = createAudioPlayer({ uri: entry.audioUri });
        playerRef.current.play();
        setPlayingId(entry.id);

        // Süre sonunda otomatik durdur
        setTimeout(() => {
          setPlayingId((current) => {
            if (current === entry.id) {
              stopPlayback();
              return null;
            }
            return current;
          });
        }, (entry.duration + 1) * 1000);
      } catch (error) {
        console.error("[History] Oynatma hatası:", error);
        setPlayingId(null);
      }
    },
    [playingId]
  );

  const stopPlayback = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        /* */
      }
      playerRef.current = null;
    }
    setPlayingId(null);
  }, []);

  // Tarih filtresi değiştir
  const handleDateFilter = useCallback((filter: DateFilter) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDateFilter(filter);
  }, []);

  // Kaynak filtresi değiştir
  const handleSourceFilter = useCallback((source: RecordingSource | "all") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSourceFilter(source);
  }, []);

  // Favori filtresi toggle
  const handleFavoriteFilter = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFavoritesOnly((prev) => !prev);
  }, []);

  // İstatistikler
  const totalCount = recordings.length;
  const favoriteCount = recordings.filter((r) => r.isFavorite).length;
  const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);

  // ============================================================
  // RENDER
  // ============================================================

  const renderItem = useCallback(
    ({ item }: { item: RecordingEntry }) => {
      const isPlaying = playingId === item.id;
      const sourceColor = getSourceColor(item.source);

      return (
        <View style={styles.listItem}>
          {/* Sol: Kaynak badge + bilgiler */}
          <View style={styles.listItemLeft}>
            <View style={styles.listItemHeader}>
              <View
                style={[styles.sourceBadge, { backgroundColor: sourceColor + "20" }]}
              >
                <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>
                  {getSourceLabel(item.source)}
                </Text>
              </View>
              <Text style={styles.listItemDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.listItemMeta}>
              <Text style={styles.listItemDuration}>
                {formatDuration(item.duration)}
              </Text>
              <View style={styles.activityDot}>
                <View
                  style={[
                    styles.activityIndicator,
                    {
                      backgroundColor:
                        item.activityLevel > 70
                          ? "#FF3333"
                          : item.activityLevel > 40
                          ? "#FF6B35"
                          : "#2A2A40",
                    },
                  ]}
                />
                <Text style={styles.activityText}>
                  {item.activityLevel > 70
                    ? t("whatsNew.historyHighActivity")
                    : item.activityLevel > 40
                    ? t("whatsNew.historyMedActivity")
                    : t("whatsNew.historyLowActivity")}
                </Text>
              </View>
            </View>
            {item.note ? (
              <Text style={styles.noteText} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>

          {/* Sağ: Aksiyonlar */}
          <View style={styles.listItemActions}>
            {/* Favori */}
            <Pressable
              onPress={() => handleToggleFavorite(item.id)}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  opacity: pressed ? 0.6 : 1,
                  borderColor: item.isFavorite ? "#FFD70030" : "#1A1A2E",
                },
              ]}
            >
              <IconSymbol
                size={14}
                name={item.isFavorite ? "star.fill" : "star"}
                color={item.isFavorite ? "#FFD700" : "#3A3A50"}
              />
            </Pressable>

            {/* Oynat/Durdur */}
            <Pressable
              onPress={() => handlePlay(item)}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  opacity: pressed ? 0.6 : 1,
                  borderColor: isPlaying ? "#00FF8830" : "#FF6B3530",
                  backgroundColor: isPlaying ? "#00FF8810" : "#0D0D15",
                },
              ]}
            >
              <IconSymbol
                size={14}
                name={isPlaying ? "stop.fill" : "play.fill"}
                color={isPlaying ? "#00FF88" : "#FF6B35"}
              />
            </Pressable>

            {/* Sil */}
            <Pressable
              onPress={() => handleDelete(item.id)}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed ? 0.6 : 1, borderColor: "#FF333320" },
              ]}
            >
              <IconSymbol size={14} name="trash" color="#FF3333" />
            </Pressable>
          </View>
        </View>
      );
    },
    [playingId, handleToggleFavorite, handlePlay, handleDelete]
  );

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>{t("whatsNew.historyTitle")}</Text>
          </View>
          <Text style={styles.headerCount}>
            {filteredRecordings.length} / {totalCount}
          </Text>
        </View>

        {/* İstatistik barı */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>{t("whatsNew.historyTotal")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FFD700" }]}>
              {favoriteCount}
            </Text>
            <Text style={styles.statLabel}>{t("whatsNew.historyFavorites")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
            <Text style={styles.statLabel}>{t("whatsNew.historyTotalDuration")}</Text>
          </View>
        </View>

        {/* Filtreler */}
        {/* Kaynak filtreleri */}
        <View style={styles.sourceFiltersRow}>
          {SOURCE_FILTERS.map((sf) => {
            const isActive = sourceFilter === sf.key;
            return (
              <Pressable
                key={sf.key}
                onPress={() => handleSourceFilter(sf.key)}
                style={({ pressed }) => [
                  styles.sourceChip,
                  isActive && { backgroundColor: sf.color + "18", borderColor: sf.color + "40" },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {sf.key !== "all" && (
                  <View style={[styles.sourceChipDot, { backgroundColor: isActive ? sf.color : "#2A2A40" }]} />
                )}
                <Text
                  style={[
                    styles.sourceChipText,
                    isActive && { color: sf.color },
                  ]}
                >
                  {sf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filtersContainer}>
          {/* Tarih filtreleri */}
          <View style={styles.dateFilters}>
            {DATE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => handleDateFilter(f.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  dateFilter === f.key && styles.filterChipActive,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    dateFilter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {t(f.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Favori filtresi */}
          <Pressable
            onPress={handleFavoriteFilter}
            style={({ pressed }) => [
              styles.favoriteFilterBtn,
              showFavoritesOnly && styles.favoriteFilterBtnActive,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <IconSymbol
              size={14}
              name={showFavoritesOnly ? "star.fill" : "star"}
              color={showFavoritesOnly ? "#FFD700" : "#3A3A50"}
            />
          </Pressable>
        </View>

        {/* Kayıt listesi */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="small" color="#FF6B35" />
            </View>
          ) : filteredRecordings.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyIcon}>
                {showFavoritesOnly ? "★" : "🎙"}
              </Text>
              <Text style={styles.emptyText}>
                {showFavoritesOnly
                  ? t("whatsNew.historyNoFavorites")
                  : t("whatsNew.historyNoRecordings")}
              </Text>
              <Text style={styles.emptySubtext}>
                {showFavoritesOnly
                  ? t("whatsNew.historyNoFavoritesHint")
                  : t("whatsNew.historyNoRecordingsHint")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecordings}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
      <AdBanner />
    </ScreenContainer>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },

  // Header
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
    backgroundColor: "#6B5BFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D0D0E0",
    letterSpacing: 4,
  },
  headerCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D0D0E0",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#141420",
  },

  // Source Filters
  sourceFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#0A0A12",
    borderWidth: 1,
    borderColor: "#141420",
  },
  sourceChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3A3A50",
    letterSpacing: 1.5,
  },

  // Date Filters
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateFilters: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#0A0A12",
    borderWidth: 1,
    borderColor: "#141420",
  },
  filterChipActive: {
    backgroundColor: "#6B5BFF15",
    borderColor: "#6B5BFF40",
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: "#6B5BFF",
  },
  favoriteFilterBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#0A0A12",
    borderWidth: 1,
    borderColor: "#141420",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteFilterBtnActive: {
    backgroundColor: "#FFD70010",
    borderColor: "#FFD70030",
  },

  // List
  listContainer: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    overflow: "hidden",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  emptySubtext: {
    fontSize: 10,
    color: "#2A2A40",
    letterSpacing: 1,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // List item
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D15",
  },
  listItemLeft: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  listItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  listItemDate: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5A5A70",
    fontVariant: ["tabular-nums"],
  },
  listItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listItemDuration: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0E0",
    fontVariant: ["tabular-nums"],
  },
  activityDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  activityText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 1,
  },
  noteText: {
    fontSize: 10,
    color: "#5A5A70",
    fontStyle: "italic",
  },

  // Actions
  listItemActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D15",
  },
});
