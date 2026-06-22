// Wrappers d'appel aux Edge Functions (le JWT est ajouté automatiquement par le SDK).
import { supabase } from "./supabase";
import type { AICommandRequest, AICommandResponse } from "@loone/shared";

/** Invoque l'orchestrateur vocal (ai-command). */
export async function sendAICommand(payload: AICommandRequest): Promise<AICommandResponse> {
  const { data, error } = await supabase.functions.invoke<AICommandResponse>("ai-command", {
    body: payload,
  });
  if (error) throw error;
  if (!data) throw new Error("Réponse vide de ai-command");
  return data;
}

/** Confirme une action sensible en attente. */
export function confirmAICommand(confirm_token: string) {
  return sendAICommand({ input_type: "text", confirm_token });
}

/** Annule la dernière action réversible. */
export function undoAICommand(undo_token: string) {
  return sendAICommand({ input_type: "text", undo_token });
}
