// Abstraction multi-fournisseur IA (voir docs/06 §3).
// Permet de changer de fournisseur de STT ou de raisonnement sans toucher à ai-command.
import type { AnthropicTool } from "./tools.ts";

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
}

export interface AIRunResult {
  toolCalls: AIToolCall[];
  text?: string;
  model: string;
}

export interface STTProvider {
  /** Transcrit un audio en texte. */
  transcribe(audio: Uint8Array, language: string): Promise<string>;
}

export interface ReasoningProvider {
  /** Raisonnement + sélection d'outils (function calling). */
  run(opts: {
    system: string;
    messages: AIMessage[];
    tools: AnthropicTool[];
  }): Promise<AIRunResult>;
}
