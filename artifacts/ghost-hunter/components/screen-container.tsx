import { View, Text, type ViewProps, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * Hide the entertainment disclaimer strip (e.g. for screens that have their own).
   */
  hideDisclaimer?: boolean;
}

/**
 * A container component that properly handles SafeArea and background colors.
 * Includes a persistent "FOR ENTERTAINMENT ONLY" disclaimer strip required by Apple.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  hideDisclaimer = false,
  ...props
}: ScreenContainerProps) {
  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        {/* Apple 1.1.6 compliance — visible on every screen */}
        {!hideDisclaimer && (
          <View style={disclaimerStyles.strip}>
            <Text style={disclaimerStyles.text}>
              ⚠️  FOR ENTERTAINMENT ONLY — THIS IS A SIMULATION. NOT REAL.
            </Text>
          </View>
        )}
        <View className={cn("flex-1", className)}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const disclaimerStyles = StyleSheet.create({
  strip: {
    backgroundColor: "#1A1000",
    borderBottomWidth: 1,
    borderBottomColor: "#FF990025",
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  text: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FF9900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
});
