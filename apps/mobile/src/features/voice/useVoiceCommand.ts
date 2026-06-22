// Pilote le pipeline vocal côté client : enregistrement → envoi → réponse.
import { useCallback, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { sendAICommand, confirmAICommand, undoAICommand } from "@/lib/api";
import { useVoiceStore } from "@/store/voiceStore";

export function useVoiceCommand() {
  const qc = useQueryClient();
  const store = useVoiceStore();

  // Instancié une seule fois dans le layout parent — ne pas appeler ce hook ailleurs.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  // Polling à 80 ms → recorderState.metering (dBFS) pour la waveform.
  const recorderState = useAudioRecorderState(recorder, 80);
  // Track si on a réellement démarré l'enregistrement.
  const activeRef = useRef(false);

  // Normalise dBFS (-60..0) → amplitude (0..1) et pousse au store.
  useEffect(() => {
    if (store.status !== "listening") return;
    const dB = recorderState.metering ?? -60;
    store.setAmplitude(Math.max(0, Math.min(1, (dB + 60) / 60)));
  }, [recorderState.metering]);

  // Démarre l'enregistrement micro.
  const start = useCallback(async () => {
    store.reset();
    store.setStatus("listening");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      store.setError("Permission micro refusée — vérifiez les réglages.");
      return;
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    activeRef.current = true;
  }, [store, recorder]);

  // Arrête le micro et envoie l'audio (ou du texte) à ai-command.
  const stopAndSend = useCallback(
    async (audioBase64?: string) => {
      store.setAmplitude(0);
      try {
        store.setStatus("processing");
        let finalAudio = audioBase64;

        if (!finalAudio && activeRef.current) {
          activeRef.current = false;
          await recorder.stop();
          // L'URI est exposée sur l'objet recorder après l'arrêt.
          const uri = (recorder as unknown as { uri?: string }).uri;
          if (uri) {
            finalAudio = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        }

        const res = await sendAICommand(
          finalAudio
            ? { input_type: "voice", audio: finalAudio, locale: "fr" }
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
        activeRef.current = false;
        store.setError((e as Error).message);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [store, qc, recorder],
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

export type VoiceCommandAPI = ReturnType<typeof useVoiceCommand>;

async function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries();
}
