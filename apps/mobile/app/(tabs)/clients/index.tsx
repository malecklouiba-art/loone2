import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/theme";
import { useClients } from "@/features/clients/useClients";

export default function ClientsList() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useClients(search);

  return (
    <Screen title="Clients" grouped>
      <TextInput
        placeholder="🔍 Rechercher"
        placeholderTextColor={colors.labelTertiary}
        value={search}
        onChangeText={setSearch}
        style={{
          backgroundColor: colors.fill,
          borderRadius: radius.field,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          color: colors.label,
          fontSize: 17,
          marginBottom: spacing.lg,
        }}
      />

      <Card>
        {isLoading ? (
          <Text style={{ color: colors.labelSecondary }}>Chargement…</Text>
        ) : data?.length ? (
          data.map((c, idx) => (
            <ListRow
              key={c.id}
              title={`${c.first_name} ${c.last_name ?? ""}`.trim()}
              subtitle={c.company ?? c.email ?? undefined}
              left={<Avatar firstName={c.first_name} lastName={c.last_name} />}
              right={
                <Text style={[typography.caption1, { color: colors.labelTertiary }]}>
                  {c.status}
                </Text>
              }
              showChevron
              onPress={() => router.push(`/(tabs)/clients/${c.id}`)}
              isLast={idx === data.length - 1}
            />
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm }}>
            <Text style={{ fontSize: 40 }}>🎙️</Text>
            <Text style={[typography.body, { color: colors.labelSecondary, textAlign: "center" }]}>
              Aucun client.{"\n"}Appuyez sur le micro et dites{"\n"}« Ajoute un client nommé… ».
            </Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}
