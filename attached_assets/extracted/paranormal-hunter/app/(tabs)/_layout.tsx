import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t } from "@/lib/i18n";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00FF88",
        tabBarInactiveTintColor: "#2A2A40",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#08080E",
          borderTopColor: "#141420",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emf"
        options={{
          title: "EMF",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="antenna.radiowaves.left.and.right" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: "RADAR",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="scope" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="evp"
        options={{
          title: "EVP",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="waveform" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vox"
        options={{
          title: "VOX",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="waveform" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sls"
        options={{
          title: "SLS",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="figure.stand" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="clock.arrow.circlepath" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: t("tabs.records"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="folder.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: "PREMIUM",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="star.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
