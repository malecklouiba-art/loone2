// Overlay plein écran du Micro IA : écoute → traitement → confirmation/succès.
// Reçoit `vc` depuis le layout parent pour partager une seule instance du recorder.
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MicButton } from "./MicButton";
import type { VoiceCommandAPI } from "@/features/voice/useVoiceCommand";

// ----------------------------------------------------------------- Waveform

const BAR_SCALES = [0.45, 0.65, 0.85, 1.0, 0.85, 0.65, 0.45] as const;

function WaveBar({
  amplitude,
  relativeScale,
  color,
}: {
  amplitude: number;
  relativeScale: number;
  color: string;
}) {
  const height = useSharedValue(4);

  useEffect(() => {
    height.value = withSpring(Math.max(4, amplitude * 44 * relativeScale), {
      damping: 14,
      stiffness: 200,
    });
  }, [amplitude]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    borderRadius: height.value / 2,
  }));

  return <Animated.View style={[{ width: 5, backgroundColor: color }, style]} />;
}

function Waveform({ amplitude, color }: { amplitude: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 52, gap: 5 }}>
      {BAR_SCALES.map((scale, i) => (
        <WaveBar key={i} amplitude={amplitude} relativeScale={scale} color={color} />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------- TextFallback

function TextFallback({
  onSend,
  color,
  placeholderColor,
}: {
  onSend: (text: string) => void;
  color: string;
  placeholderColor: string;
}) {
  const [text, setText] = useState("");
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ou tapez une commande…"
        placeholderTextColor={placeholderColor}
        style={[
          typography.body,
          {
            flex: 1,
            color,
            backgroundColor: colors.fill,
            borderRadius: radius.field,
            paddingHorizontal: spacing.md,
            paddingVertical: Platform.select({ ios: spacing.md, default: spacing.sm }),
          },
        ]}
        returnKeyType="send"
        onSubmitEditing={() => {
          if (text.trim()) {
            Keyboard.dismiss();
            onSend(text.trim());
            setText("");
          }
        }}
      />
      <Pressable
        onPress={() => {
          if (text.trim()) {
            Keyboard.dismiss();
            onSend(text.trim());
            setText("");
          }
        }}
        style={{
          backgroundColor: colors.tint,
          borderRadius: radius.button,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <Text style={[typography.headline, { color: colors.white }]}>↑</Text>
      </Pressable>
    </View>
  );
}

// ----------------------------------------------------------------- Overlay

interface VoiceOverlayProps {
  visible: boolean;
  onClose: () => void;
  vc: VoiceCommandAPI;
}

export function VoiceOverlay({ visible, onClose, vc }: VoiceOverlayProps) {
  const { colors, typography, spacing, isDark } = useTheme();
  const res = vc.response;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1 }}
        onPress={Keyboard.dismiss}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.96)",
            padding: spacing.xl,
            justifyContent: "center",
            gap: spacing.xl,
          }}
        >
          {/* ---- FERMER ---- */}
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", top: spacing.xxl + 8, right: spacing.xl }}
          >
            <Text style={[typography.body, { color: colors.labelSecondary }]}>✕</Text>
          </Pressable>

          {/* ---- ÉCOUTE / TRAITEMENT ---- */}
          {(vc.status === "listening" || vc.status === "processing" || vc.status === "idle") && (
            <View style={{ alignItems: "center", gap: spacing.lg }}>
              <MicButton
                status={vc.status}
                size={96}
                onPress={() => vc.stopAndSend()}
              />
              <Text style={[typography.title3, { color: colors.label }]}>
                {vc.status === "processing" ? "Un instant…" : "J'écoute…"}
              </Text>

              {vc.status === "listening" && (
                <Waveform amplitude={vc.amplitude} color={colors.tint} />
              )}

              {vc.transcript ? (
                <Card style={{ width: "100%" }}>
                  <Text style={[typography.body, { color: colors.label }]}>
                    {vc.transcript}
                  </Text>
                </Card>
              ) : null}

              {vc.status !== "processing" && (
                <TextFallback
                  onSend={(text) => vc.sendText(text)}
                  color={colors.label}
                  placeholderColor={colors.labelTertiary}
                />
              )}
            </View>
          )}

          {/* ---- CONFIRMATION (action sensible) ---- */}
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
                <Button
                  title="Annuler"
                  variant="secondary"
                  onPress={onClose}
                  style={{ flex: 1 }}
                />
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

          {/* ---- CLARIFICATION ---- */}
          {vc.status === "confirming" && res?.needs_clarification && (
            <Card style={{ gap: spacing.md }}>
              <Text style={[typography.title3, { color: colors.label }]}>Précision</Text>
              <Text style={[typography.body, { color: colors.label }]}>{res.question}</Text>
              <Button title="Réessayer" onPress={() => vc.start()} />
            </Card>
          )}

          {/* ---- SUCCÈS ---- */}
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

          {/* ---- ERREUR ---- */}
          {vc.status === "error" && (
            <Card style={{ gap: spacing.md }}>
              <Text style={[typography.title3, { color: colors.danger }]}>Oups</Text>
              <Text style={[typography.body, { color: colors.label }]}>{vc.error}</Text>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button title="Réessayer" onPress={() => vc.start()} style={{ flex: 1 }} />
                <Button title="Fermer" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              </View>
            </Card>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
