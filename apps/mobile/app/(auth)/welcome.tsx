import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme";

export default function Welcome() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.lg }}>
        <Text style={{ fontSize: 64 }}>🎙️</Text>
        <Text style={[typography.largeTitle, { color: colors.label }]}>Loone</Text>
        <Text
          style={[typography.title3, { color: colors.labelSecondary, textAlign: "center" }]}
        >
          Votre CRM qui s'utilise{"\n"}à la voix.
        </Text>
      </View>
      <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        <Button title="Continuer avec Apple" onPress={() => router.push("/(auth)/sign-in")} />
        <Button
          title="Continuer avec Google"
          variant="secondary"
          onPress={() => router.push("/(auth)/sign-in")}
        />
        <Button
          title="Continuer par email"
          variant="plain"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>
    </Screen>
  );
}
