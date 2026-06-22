import React from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ListRow } from "@/components/ui/ListRow";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/theme";
import { useDashboard } from "@/features/dashboard/useDashboard";

function frTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const { colors, typography, spacing } = useTheme();
  const { data, isLoading } = useDashboard();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Screen title="Bonjour 👋" grouped>
      <Text style={[typography.subhead, { color: colors.labelSecondary, marginBottom: spacing.lg }]}>
        {today.charAt(0).toUpperCase() + today.slice(1)}
      </Text>

      {/* KPIs */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
        <StatCard label="CA du mois" value="—" hint="V2" />
        <StatCard label="Impayés" value="—" tone="danger" hint="V2" />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
        <StatCard label="RDV aujourd'hui" value={String(data?.events.length ?? 0)} />
        <StatCard label="Tâches" value={String(data?.tasks.length ?? 0)} tone="warning" />
      </View>

      {/* Suggestions IA */}
      {data?.insights?.length ? (
        <>
          <SectionTitle>Suggestions IA</SectionTitle>
          <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
            {data.insights.map((i) => (
              <Card key={i.id}>
                <Text style={[typography.headline, { color: colors.label }]}>⚠ {i.title}</Text>
                {i.message ? (
                  <Text style={[typography.subhead, { color: colors.labelSecondary }]}>
                    {i.message}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* RDV du jour */}
      <SectionTitle>Rendez-vous du jour</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        {isLoading ? (
          <Text style={{ color: colors.labelSecondary }}>Chargement…</Text>
        ) : data?.events.length ? (
          data.events.map((e, idx) => (
            <ListRow
              key={e.id}
              title={e.title}
              subtitle={frTime(e.start_at)}
              isLast={idx === data.events.length - 1}
            />
          ))
        ) : (
          <Text style={{ color: colors.labelSecondary }}>Aucun rendez-vous aujourd'hui.</Text>
        )}
      </Card>

      {/* Tâches du jour */}
      <SectionTitle>Tâches du jour</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        {data?.tasks.length ? (
          data.tasks.map((t, idx) => (
            <ListRow
              key={t.id}
              title={t.title}
              subtitle={t.due_at ? frTime(t.due_at) : undefined}
              left={<Text style={{ color: colors.labelTertiary, fontSize: 18 }}>○</Text>}
              isLast={idx === data.tasks.length - 1}
            />
          ))
        ) : (
          <Text style={{ color: colors.labelSecondary }}>Rien de prévu. 🎉</Text>
        )}
      </Card>

      {/* Derniers clients */}
      <SectionTitle>Derniers clients</SectionTitle>
      <Card>
        {data?.recentClients.length ? (
          data.recentClients.map((c, idx) => (
            <ListRow
              key={c.id}
              title={`${c.first_name} ${c.last_name ?? ""}`.trim()}
              subtitle={c.company ?? c.email ?? undefined}
              left={<Avatar firstName={c.first_name} lastName={c.last_name} />}
              showChevron
              isLast={idx === data.recentClients.length - 1}
            />
          ))
        ) : (
          <Text style={{ color: colors.labelSecondary }}>
            Aucun client. Appuyez sur 🎙️ et dites « Ajoute un client ».
          </Text>
        )}
      </Card>
    </Screen>
  );

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <Text
        style={[
          typography.footnote,
          { color: colors.labelSecondary, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase" },
        ]}
      >
        {children}
      </Text>
    );
  }
}
