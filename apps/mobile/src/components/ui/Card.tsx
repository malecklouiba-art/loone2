import React from "react";
import { View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors, radius, spacing, shadows, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: isDark ? colors.backgroundTertiary : colors.white,
          borderRadius: radius.card,
          padding: spacing.lg,
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
