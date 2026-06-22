import React from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";

export default function Settings() {
  const { colors, typography, spacing } = useTheme();
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "—";

  const Section = ({ title }: { title: string }) => (
    <Text
      style={[
        typography.footnote,
        { color: colors.labelSecondary, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase" },
      ]}
    >
      {title}
    </Text>
  );

  return (
    <Screen title="Réglages" grouped>
      <Card>
        <ListRow
          title={email}
          subtitle="Plan Free"
          left={<Avatar firstName={email} size={48} />}
          showChevron
          isLast
        />
      </Card>

      <Section title="Intégrations" />
      <Card>
        <ListRow title="Google Calendar" subtitle="Non connecté" showChevron />
        <ListRow title="Gmail" subtitle="Non connecté" showChevron />
        <ListRow title="Outlook" subtitle="Non connecté" showChevron isLast />
      </Card>

      <Section title="IA & Voix" />
      <Card>
        <ListRow title="Langue de la voix" subtitle="Français" showChevron />
        <ListRow title="Confirmations" subtitle="Activées" showChevron />
        <ListRow title="Voix de réponse (TTS)" subtitle="Désactivée" showChevron isLast />
      </Card>

      <Section title="Application" />
      <Card>
        <ListRow title="Apparence" subtitle="Automatique" showChevron />
        <ListRow title="Notifications" showChevron isLast />
      </Card>

      <View style={{ marginTop: spacing.xxl }}>
        <Button title="Se déconnecter" variant="destructive" onPress={signOut} />
      </View>
    </Screen>
  );
}
