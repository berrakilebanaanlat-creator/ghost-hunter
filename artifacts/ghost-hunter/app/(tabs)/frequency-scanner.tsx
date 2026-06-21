import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function FrequencyScanner() {
  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      <View style={styles.container}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.title}>FREKANS TARAYICI</Text>
        <Text style={styles.subtitle}>Yakında</Text>
        <Text style={styles.desc}>Bu özellik güncelleniyor.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00FF88",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#4A4A5A",
    letterSpacing: 1,
  },
  desc: {
    fontSize: 12,
    color: "#333344",
    textAlign: "center",
  },
});
