import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { t } from "@/lib/i18n";
import { useColors } from "@/hooks/use-colors";

const LAST_SEEN_VERSION_KEY = "@whats_new_last_seen_version";
const CURRENT_VERSION = "1.0.22";

// ── Release notes data structure ──────────────────────────────────
interface ReleaseFeature {
  icon: string;
  titleKey: string;
  descKey: string;
}

interface ReleaseNote {
  version: string;
  features: ReleaseFeature[];
}

// Each version's highlights — add new entries at the top for future releases
const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.22",
    features: [
      {
        icon: "🎙️",
        titleKey: "whatsNew.audioFixTitle",
        descKey: "whatsNew.audioFixDesc",
      },
      {
        icon: "🛡️",
        titleKey: "whatsNew.crashFixTitle",
        descKey: "whatsNew.crashFixDesc",
      },
      {
        icon: "💳",
        titleKey: "whatsNew.billingFixTitle",
        descKey: "whatsNew.billingFixDesc",
      },
      {
        icon: "⚡",
        titleKey: "whatsNew.soloaderFixTitle",
        descKey: "whatsNew.soloaderFixDesc",
      },
    ],
  },
  {
    version: "1.0.20",
    features: [
      {
        icon: "📁",
        titleKey: "whatsNew.evidenceWallTitle",
        descKey: "whatsNew.evidenceWallDesc",
      },
      {
        icon: "⚡",
        titleKey: "whatsNew.performanceTitle",
        descKey: "whatsNew.performanceDesc",
      },
      {
        icon: "🛡️",
        titleKey: "whatsNew.stabilityTitle",
        descKey: "whatsNew.stabilityDesc",
      },
      {
        icon: "📱",
        titleKey: "whatsNew.androidTitle",
        descKey: "whatsNew.androidDesc",
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────
export function WhatsNewModal() {
  const [visible, setVisible] = useState(false);
  const [currentNotes, setCurrentNotes] = useState<ReleaseNote | null>(null);
  const colors = useColors();

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);

      // Show modal only if user hasn't seen this version's notes yet
      if (lastSeen !== CURRENT_VERSION) {
        const notes = RELEASE_NOTES.find((r) => r.version === CURRENT_VERSION);
        if (notes) {
          setCurrentNotes(notes);
          // Small delay so the app finishes loading first
          setTimeout(() => setVisible(true), 1500);
        }
      }
    } catch {
      // Silently fail — don't block the app
    }
  };

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION);
    } catch {
      // Silently fail
    }
  }, []);

  if (!currentNotes) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.versionBadge}>v{currentNotes.version}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("whatsNew.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {t("whatsNew.subtitle")}
            </Text>
          </View>

          {/* Feature List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {currentNotes.features.map((feature, index) => (
              <View
                key={index}
                style={[styles.featureCard, { backgroundColor: colors.background }]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                    {t(feature.titleKey)}
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.muted }]}>
                    {t(feature.descKey)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dismiss Button */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {t("whatsNew.dismiss")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 380);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: MODAL_WIDTH,
    maxHeight: "80%",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#00FF88",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  header: {
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00FF88",
    backgroundColor: "rgba(0, 255, 136, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  scrollArea: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
