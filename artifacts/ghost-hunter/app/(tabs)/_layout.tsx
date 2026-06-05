import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "bolt", selected: "bolt.fill" }} />
        <Label>EMF</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="evp">
        <Icon sf={{ default: "mic", selected: "mic.fill" }} />
        <Label>EVP</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="radar">
        <Icon sf={{ default: "wave.3.forward", selected: "wave.3.forward" }} />
        <Label>Radar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spirit-box">
        <Icon sf={{ default: "radio", selected: "radio.fill" }} />
        <Label>Spirit Box</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>Geçmiş</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#08080f",
          borderTopWidth: 1,
          borderTopColor: "#1c1c34",
          elevation: 0,
          height: isWeb ? 84 : undefined,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#08080f" }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "EMF",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="bolt.fill" tintColor={color} size={size} />
            ) : (
              <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="evp"
        options={{
          title: "EVP",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="mic.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="mic" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: "Radar",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="wave.3.forward" tintColor={color} size={size} />
            ) : (
              <MaterialCommunityIcons name="radar" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="spirit-box"
        options={{
          title: "Spirit Box",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="radio.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="radio" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="clock.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="time" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
