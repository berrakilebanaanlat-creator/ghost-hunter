import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

interface GlowTextProps {
  text: string;
  color?: string;
  size?: number;
  weight?: TextStyle["fontWeight"];
  style?: TextStyle;
  glowColor?: string;
}

export function GlowText({
  text,
  color = "#00ff88",
  size = 16,
  weight = "700",
  style,
  glowColor,
}: GlowTextProps) {
  const gc = glowColor ?? color;
  return (
    <Text
      style={[
        {
          color,
          fontSize: size,
          fontWeight: weight,
          textShadowColor: gc,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}
