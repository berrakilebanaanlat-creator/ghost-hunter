// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Default
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // Paranormal Hunter
  "antenna.radiowaves.left.and.right": "sensors",
  "scope": "gps-fixed",
  "waveform": "graphic-eq",
  "doc.text.fill": "description",
  "bolt.fill": "bolt",
  "exclamationmark.triangle.fill": "warning",
  "xmark": "close",
  "plus": "add",
  "trash": "delete",
  "mic.fill": "mic",
  "mic.slash.fill": "mic-off",
  "stop.fill": "stop",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "location.fill": "location-on",
  "camera.fill": "photo-camera",
  "star.fill": "star",
  "star": "star-border",
  "chevron.left": "chevron-left",
  "arrow.left": "arrow-back",
  "info.circle": "info",
  "gear": "settings",
  "chart.bar.fill": "bar-chart",
  "person.fill": "person",
  "figure.stand": "accessibility",
  "viewfinder": "center-focus-strong",
  "circle.fill": "circle",
  "record.circle": "fiber-manual-record",
  "flashlight.on.fill": "flashlight-on",
  "arrow.triangle.2.circlepath.camera": "flip-camera-ios",
  "gearshape.fill": "settings",
  "video.fill": "videocam",
  "video.slash.fill": "videocam-off",
  "folder.fill": "folder",
  "dot.radiowaves.left.and.right": "wifi-tethering",
  "clock.arrow.circlepath": "history",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
