import React from "react";
import { Text, View } from "react-native";
import { Card } from "./Card";
import { useTheme } from "@/theme";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const { colors, typography, spacing } = useTheme();
  const toneColor = {
    default: colors.label,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <Card style={{ flex: 1, minHeight: 88 }}>
      <Text style={[typography.footnote, { color: colors.labelSecondary }]}>{label}</Text>
      <Text style={[typography.title1, { color: toneColor, marginTop: spacing.xs }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[typography.caption1, { color: colors.labelTertiary }]}>{hint}</Text>
      ) : (
        <View />
      )}
    </Card>
  );
}
