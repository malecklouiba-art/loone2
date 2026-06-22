import React from "react";
import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/theme";
import { useClient } from "@/features/clients/useClients";

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { data: c, isLoading } = useClient(id);

  if (isLoading || !c) {
    return (
      <Screen grouped>
        <Text style={{ color: colors.labelSecondary }}>Chargement…</Text>
      </Screen>
    );
  }

  return (
    <Screen grouped>
      <Button title="‹ Clients" variant="plain" onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />

      {/* En-tête */}
      <View style={{ alignItems: "center", gap: spacing.sm, marginVertical: spacing.lg }}>
        <Avatar firstName={c.first_name} lastName={c.last_name} size={72} />
        <Text style={[typography.title1, { color: colors.label }]}>
          {c.first_name} {c.last_name ?? ""}
        </Text>
        {c.company ? (
          <Text style={[typography.subhead, { color: colors.labelSecondary }]}>{c.company}</Text>
        ) : null}
      </View>

      {/* Actions rapides */}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl }}>
        <Button title="Appeler" variant="secondary" style={{ flex: 1 }} onPress={() => c.phone && Linking.openURL(`tel:${c.phone}`)} />
        <Button title="Email" variant="secondary" style={{ flex: 1 }} onPress={() => c.email && Linking.openURL(`mailto:${c.email}`)} />
        <Button title="SMS" variant="secondary" style={{ flex: 1 }} onPress={() => c.phone && Linking.openURL(`sms:${c.phone}`)} />
      </View>

      {/* Coordonnées */}
      <Card>
        <ListRow title={c.email ?? "—"} subtitle="Email" />
        <ListRow title={c.phone ?? "—"} subtitle="Téléphone" />
        <ListRow title={c.status} subtitle="Statut" isLast />
      </Card>

      {c.tags?.length ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" }}>
          {c.tags.map((t) => (
            <View key={t} style={{ backgroundColor: colors.fill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 }}>
              <Text style={[typography.caption1, { color: colors.tint }]}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
