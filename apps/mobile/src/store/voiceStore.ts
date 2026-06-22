// État éphémère du pipeline vocal (UI uniquement). Voir docs/05 §4.
import { create } from "zustand";
import type { AICommandResponse } from "@loone/shared";

export type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "confirming"
  | "success"
  | "error";

interface VoiceState {
  status: VoiceStatus;
  amplitude: number; // 0..1 pour la waveform
  transcript: string;
  response: AICommandResponse | null;
  error: string | null;

  setStatus: (s: VoiceStatus) => void;
  setAmplitude: (a: number) => void;
  setTranscript: (t: string) => void;
  setResponse: (r: AICommandResponse | null) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: "idle",
  amplitude: 0,
  transcript: "",
  response: null,
  error: null,

  setStatus: (status) => set({ status }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  setError: (error) => set({ error, status: "error" }),
  reset: () => set({ status: "idle", amplitude: 0, transcript: "", response: null, error: null }),
}));
