import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/theme";

function initials(first?: string | null, last?: string | null): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function Avatar({
  firstName,
  lastName,
  size = 40,
}: {
  firstName?: string | null;
  lastName?: string | null;
  size?: number;
}) {
  const { colors, typography } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={[typography.subhead, { color: colors.tint, fontWeight: "600" }]}>
        {initials(firstName, lastName)}
      </Text>
    </View>
  );
}
