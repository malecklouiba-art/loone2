// Pilote le pipeline vocal côté client : enregistrement → envoi → réponse.
// L'enregistrement audio (expo-audio) est volontairement encapsulé ici pour
// pouvoir évoluer (streaming en V2) sans toucher l'UI.
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { sendAICommand, confirmAICommand, undoAICommand } from "@/lib/api";
import { useVoiceStore } from "@/store/voiceStore";

export function useVoiceCommand() {
  const qc = useQueryClient();
  const store = useVoiceStore();

  // Démarre l'écoute (enregistrement audio).
  const start = useCallback(async () => {
    store.reset();
    store.setStatus("listening");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO(MVP): démarrer expo-audio Recorder + boucle d'amplitude → store.setAmplitude
  }, [store]);

  // Arrête l'écoute, envoie l'audio à ai-command.
  const stopAndSend = useCallback(
    async (audioBase64?: string) => {
      try {
        store.setStatus("processing");
        const res = await sendAICommand(
          audioBase64
            ? { input_type: "voice", audio: audioBase64, locale: "fr" }
            : { input_type: "text", text: store.transcript, locale: "fr" },
        );
        store.setTranscript(res.transcript);
        store.setResponse(res);

        if (res.requires_confirmation || res.needs_clarification) {
          store.setStatus("confirming");
        } else {
          store.setStatus("success");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await invalidateAll(qc);
        }
        return res;
      } catch (e) {
        store.setError((e as Error).message);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [store, qc],
  );

  // Envoie une commande texte (fallback clavier).
  const sendText = useCallback(
    async (text: string) => {
      store.reset();
      store.setTranscript(text);
      return stopAndSend(undefined);
    },
    [store, stopAndSend],
  );

  const confirm = useCallback(
    async (token: string) => {
      store.setStatus("processing");
      const res = await confirmAICommand(token);
      store.setResponse(res);
      store.setStatus("success");
      await invalidateAll(qc);
      return res;
    },
    [store, qc],
  );

  const undo = useCallback(
    async (token: string) => {
      await undoAICommand(token);
      await invalidateAll(qc);
      store.reset();
    },
    [store, qc],
  );

  return { ...store, start, stopAndSend, sendText, confirm, undo };
}

async function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  // L'IA peut toucher plusieurs domaines : on rafraîchit largement (MVP).
  await qc.invalidateQueries();
}
