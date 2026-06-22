// Conteneur d'écran : safe-area + fond thématique + scroll optionnel + large title.
import React from "react";
import { ScrollView, View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  scroll?: boolean;
  grouped?: boolean; // fond gris groupé (style Réglages)
  contentStyle?: ViewStyle;
}

export function Screen({ children, title, scroll = true, grouped = false, contentStyle }: ScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = grouped ? colors.backgroundSecondary : colors.background;

  const header = title ? (
    <Text style={[typography.largeTitle, { color: colors.label, marginBottom: spacing.md }]}>
      {title}
    </Text>
  ) : null;

  const padding = {
    paddingTop: insets.top + spacing.sm,
    paddingHorizontal: spacing.screenH,
    paddingBottom: insets.bottom + 100, // place pour la tab bar + micro
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: bg }, padding, contentStyle]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: bg }]}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
