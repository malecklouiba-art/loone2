// Barre d'onglets custom avec micro central surélevé (docs/03 §6).
// Icônes : glyphes simples ici ; cible design = SF Symbols (expo-symbols).
import React from "react";
import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/theme";
import { MicButton } from "@/components/voice/MicButton";

const ICONS: Record<string, string> = {
  dashboard: "◰",
  clients: "◱",
  projects: "▤",
  settings: "⚙",
};
const LABELS: Record<string, string> = {
  dashboard: "Accueil",
  clients: "Clients",
  projects: "Projets",
  settings: "Réglages",
};

export function TabBar({ state, navigation, onMicPress }: BottomTabBarProps & { onMicPress: () => void }) {
  const { colors, typography, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // On exclut "voice" de la liste : c'est le bouton central.
  const routes = state.routes.filter((r) => r.name !== "voice");
  const activeKey = state.routes[state.index]?.name;
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const focused = route.name === activeKey;
    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={{ flex: 1, alignItems: "center", gap: 2 }}
      >
        <Text style={{ fontSize: 22, color: focused ? colors.tint : colors.labelSecondary }}>
          {ICONS[route.name] ?? "•"}
        </Text>
        <Text
          style={[typography.caption2, { color: focused ? colors.tint : colors.labelSecondary }]}
        >
          {LABELS[route.name] ?? route.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom || spacing.md,
          paddingHorizontal: spacing.sm,
          borderTopWidth: 0.5,
          borderTopColor: colors.separator,
        }}
      >
        {left.map(renderTab)}

        {/* Emplacement central (le micro est surélevé au-dessus) */}
        <View style={{ width: 72, alignItems: "center" }}>
          <View style={{ position: "absolute", bottom: 6 }}>
            <MicButton onPress={onMicPress} />
          </View>
        </View>

        {right.map(renderTab)}
      </BlurView>
    </View>
  );
}
