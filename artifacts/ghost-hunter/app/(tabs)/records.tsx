import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";
import {
  EvidenceManager,
  type Evidence,
  type EvidenceType,
  type EvidenceStats,
  getEvidenceIcon,
  getEvidenceColor,
  getEvidenceTypeLabel,
  getIntensityColor,
  formatTimestamp,
} from "@/lib/evidence-manager";
import { useAds } from "@/lib/ad-context";
import { showRewardedAd } from "@/lib/ad-manager";

type FilterType = "all" | EvidenceType;

export default function RecordsScreen() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [hasMigrated, setHasMigrated] = useState(false);

  const { showRewarded } = useAds();

  useEffect(() => {
    loadEvidence();
    migrateOldData();
  }, []);

  const loadEvidence = async () => {
    const data = await EvidenceManager.getAllEvidence();
    setEvidence(data);
    const s = await EvidenceManager.getStats();
    setStats(s);
  };

  const migrateOldData = async () => {
    const migrated = await AsyncStorage.getItem("@evidence_wall_migrated");
    if (migrated) {
      setHasMigrated(true);
      return;
    }
    const count = await EvidenceManager.migrateFromOldRecords();
    if (count > 0) {
      await AsyncStorage.setItem("@evidence_wall_migrated", "true");
      setHasMigrated(true);
      loadEvidence();
    }
  };

  const handleAddNote = async () => {
    if (!title.trim()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    await EvidenceManager.addNoteEvidence(
      title.trim(),
      notes.trim() || "Manuel gözlem notu",
      location.trim() || undefined,
      intensity
    );

    setTitle("");
    setLocation("");
    setNotes("");
    setIntensity(3);
    setShowForm(false);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    loadEvidence();
  };

  const handleDeleteEvidence = (id: string) => {
    Alert.alert(
      "Kanıt Sil",
      "Bu kanıtı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await EvidenceManager.deleteEvidence(id);
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            loadEvidence();
          },
        },
      ]
    );
  };

  const handleUnlockWithAd = async (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const rewarded = await showRewarded();
      if (rewarded) {
        await EvidenceManager.unlockEvidence(id);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadEvidence();
      }
    } catch {
      // Reklam gösterilemezse sessizce geç
    }
  };

  const filteredEvidence = filter === "all"
    ? evidence
    : evidence.filter((e) => e.type === filter);

  const filterOptions: { key: FilterType; label: string; color: string }[] = [
    { key: "all", label: "TÜMÜ", color: "#D0D0E0" },
    { key: "sls_image", label: "SLS", color: "#00FF88" },
    { key: "evp_audio", label: "EVP", color: "#9B4FDE" },
    { key: "emf_peak", label: "EMF", color: "#FFCC00" },
    { key: "radar_detection", label: "RADAR", color: "#00CCFF" },
    { key: "note", label: "NOT", color: "#5A6A8A" },
  ];

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        {/* Header - Arşiv tarzı */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <IconSymbol size={14} name="folder.fill" color="#5A6A8A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>KANIT DUVARI</Text>
              <Text style={styles.headerSub}>Evidence Wall</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{evidence.length}</Text>
            </View>
          </View>
        </View>

        {/* İstatistik Çubuğu */}
        {stats && stats.totalCount > 0 && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <IconSymbol size={12} name="camera.fill" color="#00FF88" />
              <Text style={styles.statValue}>{stats.slsCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <IconSymbol size={12} name="waveform" color="#9B4FDE" />
              <Text style={styles.statValue}>{stats.evpCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <IconSymbol size={12} name="antenna.radiowaves.left.and.right" color="#FFCC00" />
              <Text style={styles.statValue}>{stats.emfCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <IconSymbol size={12} name="dot.radiowaves.left.and.right" color="#00CCFF" />
              <Text style={styles.statValue}>{stats.radarCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <IconSymbol size={12} name="doc.text.fill" color="#5A6A8A" />
              <Text style={styles.statValue}>{stats.noteCount}</Text>
            </View>
          </View>
        )}

        {/* Filtre Çubuğu */}
        <View style={styles.filterBar}>
          {filterOptions.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => {
                setFilter(opt.key);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                styles.filterChip,
                filter === opt.key && {
                  backgroundColor: opt.color + "15",
                  borderColor: opt.color + "40",
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: filter === opt.key ? opt.color : "#2A2A40" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Yeni Kanıt Butonu veya Form */}
        {!showForm ? (
          <Pressable
            onPress={() => setShowForm(true)}
            style={({ pressed }) => [
              styles.addButton,
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <IconSymbol size={14} name="plus" color="#5A6A8A" />
            <Text style={styles.addButtonText}>YENİ KANIT EKLE</Text>
          </Pressable>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>YENİ GÖZLEM NOTU</Text>
              <Pressable
                onPress={() => setShowForm(false)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <IconSymbol size={14} name="xmark" color="#3A3A50" />
              </Pressable>
            </View>

            <TextInput
              placeholder="Başlık (ör: Salon'da gölge figür)"
              placeholderTextColor="#2A2A40"
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
              style={styles.input}
            />

            <TextInput
              placeholder="Konum (ör: Bodrum katı)"
              placeholderTextColor="#2A2A40"
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
              style={styles.input}
            />

            <TextInput
              placeholder="Detaylı açıklama..."
              placeholderTextColor="#2A2A40"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            />

            {/* Şiddet seçici */}
            <View style={styles.intensitySection}>
              <View style={styles.intensityHeader}>
                <Text style={styles.intensityLabel}>ŞİDDET SEVİYESİ</Text>
                <Text style={[styles.intensityValue, { color: getIntensityColor(intensity) }]}>
                  {intensity}/5
                </Text>
              </View>
              <View style={styles.intensityButtons}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setIntensity(level)}
                    style={[
                      styles.intensityBtn,
                      {
                        backgroundColor: intensity >= level ? getIntensityColor(level) + "20" : "#0D0D15",
                        borderColor: intensity >= level ? getIntensityColor(level) + "40" : "#141420",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityBtnText,
                        { color: intensity >= level ? getIntensityColor(level) : "#2A2A40" },
                      ]}
                    >
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Form butonları */}
            <View style={styles.formActions}>
              <Pressable
                onPress={() => setShowForm(false)}
                style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.cancelBtnText}>İPTAL</Text>
              </Pressable>
              <Pressable
                onPress={handleAddNote}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Text style={styles.saveBtnText}>KAYDET</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Kanıt Listesi */}
        <View style={styles.evidenceList}>
          <View style={styles.evidenceListHeader}>
            <Text style={styles.evidenceListTitle}>ARŞİV DOSYALARI</Text>
            <Text style={styles.evidenceListCount}>{filteredEvidence.length}</Text>
          </View>
          <FlatList
            data={filteredEvidence}
            keyExtractor={(item) => item.id}
            style={styles.evidenceScroll}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol size={32} name="folder.fill" color="#1A1A2E" />
                <Text style={styles.emptyText}>
                  {filter === "all" ? "Henüz kanıt yok" : "Bu kategoride kanıt yok"}
                </Text>
                <Text style={styles.emptyHint}>
                  Tarama araçlarını kullanarak kanıt toplayın
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isLocked = index >= 5 && item.isLocked;
              const typeColor = getEvidenceColor(item.type);
              const typeIcon = getEvidenceIcon(item.type);
              const typeLabel = getEvidenceTypeLabel(item.type);

              return (
                <View style={[styles.evidenceItem, isLocked && styles.evidenceItemLocked]}>
                  {/* Sol: Tip göstergesi */}
                  <View style={[styles.evidenceTypeBar, { backgroundColor: typeColor + "30" }]}>
                    <IconSymbol size={14} name={typeIcon as any} color={typeColor} />
                  </View>

                  {/* Orta: İçerik */}
                  <View style={styles.evidenceContent}>
                    <View style={styles.evidenceContentTop}>
                      <Text style={styles.evidenceTitle} numberOfLines={1}>
                        {isLocked ? "████████" : item.title}
                      </Text>
                      <Text style={[styles.evidenceTypeTag, { color: typeColor }]}>
                        {typeLabel}
                      </Text>
                    </View>

                    {!isLocked && item.description ? (
                      <Text style={styles.evidenceDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.evidenceMeta}>
                      <Text style={styles.evidenceMetaText}>
                        {item.date} · {item.time}
                      </Text>
                      {item.location && (
                        <Text style={styles.evidenceMetaText}> · {item.location}</Text>
                      )}
                    </View>

                    {/* Şiddet barı */}
                    <View style={styles.intensityBar}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.intensitySegment,
                            {
                              backgroundColor:
                                idx < item.intensity
                                  ? getIntensityColor(item.intensity)
                                  : "#0D0D15",
                              opacity: idx < item.intensity ? 0.7 : 0.3,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Sağ: Aksiyon */}
                  <View style={styles.evidenceActions}>
                    {isLocked ? (
                      <Pressable
                        onPress={() => handleUnlockWithAd(item.id)}
                        style={({ pressed }) => [
                          styles.unlockBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol size={12} name="play.fill" color="#9B4FDE" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleDeleteEvidence(item.id)}
                        style={({ pressed }) => [
                          styles.deleteBtn,
                          { opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <IconSymbol size={11} name="trash" color="#FF333380" />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
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
    gap: 10,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#5A6A8A15",
    borderWidth: 1,
    borderColor: "#5A6A8A30",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D0D0E0",
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: "500",
    color: "#3A3A50",
    letterSpacing: 2,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBadge: {
    backgroundColor: "#5A6A8A15",
    borderWidth: 1,
    borderColor: "#5A6A8A30",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A6A8A",
    fontVariant: ["tabular-nums"],
  },

  // Stats
  statsBar: {
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D0D0E0",
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#141420",
  },

  // Filter
  filterBar: {
    flexDirection: "row",
    gap: 4,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#14142040",
    backgroundColor: "#0A0A12",
    alignItems: "center",
  },
  filterChipText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Add button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5A6A8A20",
    paddingVertical: 12,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A6A8A",
    letterSpacing: 2,
  },

  // Form
  formContainer: {
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    padding: 14,
    gap: 10,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 3,
  },
  input: {
    backgroundColor: "#0D0D15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#141420",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#D0D0E0",
  },
  intensitySection: {
    gap: 6,
  },
  intensityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intensityLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  intensityValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  intensityButtons: {
    flexDirection: "row",
    gap: 4,
  },
  intensityBtn: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  intensityBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#0D0D15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#141420",
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 2,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#5A6A8A15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#5A6A8A30",
    paddingVertical: 10,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A6A8A",
    letterSpacing: 2,
  },

  // Evidence list
  evidenceList: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#141420",
    overflow: "hidden",
  },
  evidenceListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  evidenceListTitle: {
    fontSize: 9,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 3,
  },
  evidenceListCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A6A8A",
    fontVariant: ["tabular-nums"],
  },
  evidenceScroll: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#2A2A40",
    letterSpacing: 1,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 10,
    color: "#1E1E30",
    letterSpacing: 0.5,
  },

  // Evidence item
  evidenceItem: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D15",
    gap: 10,
  },
  evidenceItemLocked: {
    opacity: 0.6,
  },
  evidenceTypeBar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceContent: {
    flex: 1,
    gap: 3,
  },
  evidenceContentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  evidenceTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#D0D0E0",
  },
  evidenceTypeTag: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  evidenceDescription: {
    fontSize: 10,
    color: "#3A3A50",
    lineHeight: 14,
  },
  evidenceMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  evidenceMetaText: {
    fontSize: 9,
    color: "#2A2A40",
    fontVariant: ["tabular-nums"],
  },
  intensityBar: {
    flexDirection: "row",
    gap: 2,
    height: 3,
    marginTop: 3,
  },
  intensitySegment: {
    flex: 1,
    borderRadius: 1,
  },
  evidenceActions: {
    justifyContent: "center",
  },
  unlockBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#9B4FDE30",
    backgroundColor: "#9B4FDE10",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FF333320",
    backgroundColor: "#0D0D15",
    alignItems: "center",
    justifyContent: "center",
  },
});
