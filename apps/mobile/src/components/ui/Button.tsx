import React from "react";
import { Pressable, Text, ActivityIndicator, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";

type Variant = "primary" | "secondary" | "plain" | "destructive";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: ButtonProps) {
  const { colors, typography, radius, spacing } = useTheme();

  const bg: Record<Variant, string> = {
    primary: colors.tint,
    secondary: colors.fill,
    plain: "transparent",
    destructive: colors.danger,
  };
  const fg: Record<Variant, string> = {
    primary: colors.white,
    secondary: colors.tint,
    plain: colors.tint,
    destructive: colors.white,
  };

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg[variant],
          borderRadius: radius.button,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text style={[typography.headline, { color: fg[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}
