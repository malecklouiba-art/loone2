import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme";

interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  showChevron,
  onPress,
  isLast,
}: ListRowProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        gap: spacing.md,
        backgroundColor: pressed ? colors.fill : "transparent",
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.separator,
      })}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={[typography.headline, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.subhead, { color: colors.labelSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showChevron ? (
        <Text style={{ color: colors.labelTertiary, fontSize: 20 }}>›</Text>
      ) : null}
    </Pressable>
  );
}
