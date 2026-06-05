import { ScrollView, Text, View, Pressable, StyleSheet, Dimensions } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import { t } from "@/lib/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DashboardScreen() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [pulseOpacity, setPulseOpacity] = useState(0.3);

  // Saat güncelleme
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animasyonu
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 0.3 ? 0.8 : 0.3));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const tools = [
    {
      name: t("home.emf"),
      subtitle: t("home.emfSub"),
      route: "/emf",
      icon: "antenna.radiowaves.left.and.right" as const,
      color: "#00FF88",
    },
    {
      name: t("home.radar"),
      subtitle: t("home.radarSub"),
      route: "/radar",
      icon: "scope" as const,
      color: "#00CCFF",
    },
    {
      name: t("home.evp"),
      subtitle: t("home.evpSub"),
      route: "/evp",
      icon: "mic.fill" as const,
      color: "#FF6B35",
    },
    {
      name: t("home.vox"),
      subtitle: t("home.voxSub"),
      route: "/vox",
      icon: "waveform" as const,
      color: "#9B4FDE",
    },
    {
      name: t("home.sls"),
      subtitle: t("home.slsSub"),
      route: "/sls",
      icon: "figure.stand" as const,
      color: "#00FFAA",
    },
    {
      name: t("home.records"),
      subtitle: t("home.recordsSub"),
      route: "/records",
      icon: "doc.text.fill" as const,
      color: "#5A6A8A",
    },
  ];

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Logo ve Başlık */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoGlow, { opacity: pulseOpacity }]} />
              <Text style={styles.logoText}>A</Text>
            </View>
            <Text style={styles.appTitle}>ANTIK</Text>
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleLine} />
              <Text style={styles.appSubtitle}>GHOST APP</Text>
              <View style={styles.subtitleLine} />
            </View>
          </View>

          {/* Durum Paneli */}
          <View style={styles.statusPanel}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { opacity: pulseOpacity }]} />
              <Text style={styles.statusLabel}>AKTİF</Text>
            </View>
            <Text style={styles.statusTime}>{formatTime(time)}</Text>
          </View>

          {/* Araç Kartları */}
          <View style={styles.toolsGrid}>
            {tools.map((tool, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push(tool.route as any)}
                style={({ pressed }) => [
                  styles.toolCard,
                  {
                    borderColor: pressed ? tool.color + "60" : "#141420",
                    backgroundColor: pressed ? "#0C0C14" : "#0A0A12",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                {/* Üst kısım - ikon ve isim */}
                <View style={styles.toolHeader}>
                  <View style={[styles.toolIconBg, { backgroundColor: tool.color + "12" }]}>
                    <IconSymbol size={18} name={tool.icon} color={tool.color} />
                  </View>
                  <View style={styles.toolTextContainer}>
                    <Text style={[styles.toolName, { color: "#D0D0E0" }]}>
                      {tool.name}
                    </Text>
                    <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                  </View>
                  <View style={[styles.toolArrow, { borderColor: tool.color + "30" }]}>
                    <IconSymbol size={12} name="chevron.right" color={tool.color + "80"} />
                  </View>
                </View>

                {/* Alt kısım - dekoratif çizgi */}
                <View style={styles.toolBottomBar}>
                  <View style={[styles.toolAccentLine, { backgroundColor: tool.color + "30" }]} />
                </View>
              </Pressable>
            ))}
          </View>

          {/* Alt Bilgi */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>{t("home.subtitle").toUpperCase()}</Text>
            <Text style={styles.footerVersion}>v1.0.26</Text>
          </View>
        </View>
      </ScrollView>
      <AdBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0D0D15",
    borderWidth: 1,
    borderColor: "#00FF8830",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#00FF88",
    opacity: 0.1,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#00FF88",
    letterSpacing: 0,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#E0E0F0",
    letterSpacing: 14,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  subtitleLine: {
    width: 24,
    height: 1,
    backgroundColor: "#1E1E30",
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4A4A60",
    letterSpacing: 6,
  },
  statusPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#141420",
    borderRadius: 8,
    backgroundColor: "#0A0A12",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00FF88",
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3A3A50",
    letterSpacing: 3,
  },
  statusTime: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2A2A40",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  toolsGrid: {
    gap: 6,
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 0,
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toolIconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTextContainer: {
    flex: 1,
    gap: 1,
  },
  toolName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
  toolSubtitle: {
    fontSize: 10,
    fontWeight: "400",
    color: "#3A3A50",
    letterSpacing: 0.5,
  },
  toolArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBottomBar: {
    marginTop: 10,
    paddingTop: 0,
  },
  toolAccentLine: {
    height: 1,
    borderRadius: 1,
    width: "100%",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  footerDivider: {
    width: 32,
    height: 1,
    backgroundColor: "#141420",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 8,
    fontWeight: "500",
    color: "#1E1E30",
    letterSpacing: 4,
  },
  footerVersion: {
    fontSize: 8,
    color: "#141420",
    letterSpacing: 2,
  },
});
