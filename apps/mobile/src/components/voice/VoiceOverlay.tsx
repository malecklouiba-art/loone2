// Overlay plein écran du Micro IA : écoute → traitement → confirmation/succès.
import React from "react";
import { Modal, Text, View } from "react-native";
import { useTheme } from "@/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MicButton } from "./MicButton";
import { useVoiceCommand } from "@/features/voice/useVoiceCommand";

export function VoiceOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, typography, spacing } = useTheme();
  const vc = useVoiceCommand();
  const res = vc.response;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.96)",
          padding: spacing.xl,
          justifyContent: "center",
          gap: spacing.xl,
        }}
      >
        {/* État ÉCOUTE / TRAITEMENT */}
        {(vc.status === "listening" || vc.status === "processing" || vc.status === "idle") && (
          <View style={{ alignItems: "center", gap: spacing.lg }}>
            <MicButton status={vc.status} size={96} onPress={() => vc.stopAndSend()} />
            <Text style={[typography.title3, { color: colors.label }]}>
              {vc.status === "processing" ? "Un instant…" : "J'écoute…"}
            </Text>
            {vc.transcript ? (
              <Card style={{ width: "100%" }}>
                <Text style={[typography.body, { color: colors.label }]}>{vc.transcript}</Text>
              </Card>
            ) : null}
          </View>
        )}

        {/* CONFIRMATION (action sensible) */}
        {vc.status === "confirming" && res?.requires_confirmation && (
          <Card style={{ gap: spacing.md }}>
            <Text style={[typography.title3, { color: colors.label }]}>✋ Confirmer</Text>
            {res.preview?.type === "email" ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.subhead, { color: colors.labelSecondary }]}>
                  À : {(res.preview as any).to?.join(", ")}
                </Text>
                <Text style={[typography.headline, { color: colors.label }]}>
                  {(res.preview as any).subject}
                </Text>
                <Text style={[typography.body, { color: colors.label }]} numberOfLines={6}>
                  {(res.preview as any).body}
                </Text>
              </View>
            ) : (
              <Text style={[typography.body, { color: colors.label }]}>
                {res.action?.tool} — confirmer cette action ?
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Button title="Annuler" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <Button
                title="Confirmer"
                onPress={async () => {
                  if (res.confirm_token) await vc.confirm(res.confirm_token);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* CLARIFICATION */}
        {vc.status === "confirming" && res?.needs_clarification && (
          <Card style={{ gap: spacing.md }}>
            <Text style={[typography.title3, { color: colors.label }]}>Précision</Text>
            <Text style={[typography.body, { color: colors.label }]}>{res.question}</Text>
            <Button title="Réessayer" onPress={() => vc.start()} />
          </Card>
        )}

        {/* SUCCÈS */}
        {vc.status === "success" && (
          <Card style={{ gap: spacing.md }}>
            <Text style={[typography.title3, { color: colors.success }]}>✅ C'est fait</Text>
            <Text style={[typography.body, { color: colors.label }]}>
              {res?.result?.summary ?? "Action effectuée."}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              {res?.undo_token ? (
                <Button
                  title="Annuler"
                  variant="secondary"
                  onPress={() => vc.undo(res.undo_token!)}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button title="Terminé" onPress={onClose} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* ERREUR */}
        {vc.status === "error" && (
          <Card style={{ gap: spacing.md }}>
            <Text style={[typography.title3, { color: colors.danger }]}>Oups</Text>
            <Text style={[typography.body, { color: colors.label }]}>{vc.error}</Text>
            <Button title="Fermer" variant="secondary" onPress={onClose} />
          </Card>
        )}
      </View>
    </Modal>
  );
}
