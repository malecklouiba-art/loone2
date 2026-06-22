import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/theme";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectStatus } from "@loone/shared";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  prospect: "Prospect",
  discussion: "En discussion",
  quote_sent: "Devis envoyé",
  accepted: "Accepté",
  in_progress: "En cours",
  completed: "Terminé",
  archived: "Archivé",
};

function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export default function Projects() {
  const { colors, typography, spacing } = useTheme();
  const [view, setView] = useState<"list" | "kanban">("list");
  const { data } = useProjects();

  return (
    <Screen title="Projets" grouped>
      {/* Sélecteur de vue */}
      <View style={{ flexDirection: "row", backgroundColor: colors.fill, borderRadius: 9, padding: 2, marginBottom: spacing.lg }}>
        {(["list", "kanban"] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: 7,
              backgroundColor: view === v ? colors.background : "transparent",
              alignItems: "center",
            }}
          >
            <Text style={[typography.subhead, { color: colors.label }]}>
              {v === "list" ? "Liste" : "Kanban"}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === "list" ? (
        <View style={{ gap: spacing.md }}>
          {data?.length ? (
            data.map((p) => (
              <Card key={p.id}>
                <Text style={[typography.headline, { color: colors.label }]}>{p.title}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
                  <Text style={[typography.subhead, { color: colors.labelSecondary }]}>
                    {STATUS_LABELS[p.status]}
                  </Text>
                  {p.budget_amount ? (
                    <Text style={[typography.subhead, { color: colors.label }]}>
                      {p.budget_amount} {p.currency}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <Text style={{ color: colors.labelSecondary, textAlign: "center" }}>
                Aucun projet. Dites « Crée un projet… » 🎙️
              </Text>
            </Card>
          )}
        </View>
      ) : (
        <KanbanView projects={data ?? []} />
      )}
    </Screen>
  );
}

function KanbanView({ projects }: { projects: Project[] }) {
  const { colors, typography, spacing } = useTheme();
  const columns: ProjectStatus[] = ["prospect", "discussion", "quote_sent", "in_progress"];
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {columns.map((col) => (
        <View key={col} style={{ flex: 1, gap: spacing.sm }}>
          <Text style={[typography.caption1, { color: colors.labelSecondary }]}>
            {STATUS_LABELS[col]}
          </Text>
          {projects
            .filter((p) => p.status === col)
            .map((p) => (
              <Card key={p.id} style={{ padding: spacing.md }}>
                <Text style={[typography.caption1, { color: colors.label }]} numberOfLines={2}>
                  {p.title}
                </Text>
              </Card>
            ))}
        </View>
      ))}
    </View>
  );
}
