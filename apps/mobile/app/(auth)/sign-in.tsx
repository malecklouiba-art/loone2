import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";

export default function SignIn() {
  const { colors, typography, spacing, radius } = useTheme();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("demo@loone.ai");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const submit = async (mode: "in" | "up") => {
    setLoading(true);
    try {
      if (mode === "in") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const field = {
    backgroundColor: colors.fill,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.label,
    fontSize: 17,
  };

  return (
    <Screen title="Connexion">
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Text style={[typography.subhead, { color: colors.labelSecondary }]}>Email</Text>
        <TextInput
          style={field}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
          placeholderTextColor={colors.labelTertiary}
        />
        <Text style={[typography.subhead, { color: colors.labelSecondary }]}>Mot de passe</Text>
        <TextInput
          style={field}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.labelTertiary}
        />
        <Button title="Se connecter" loading={loading} onPress={() => submit("in")} />
        <Button title="Créer un compte" variant="plain" onPress={() => submit("up")} />
      </View>
    </Screen>
  );
}
