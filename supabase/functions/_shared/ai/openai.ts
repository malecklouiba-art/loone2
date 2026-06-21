// Implémentation du STT via OpenAI Whisper / gpt-4o-transcribe.
import OpenAI from "npm:openai@4.56.0";
import type { STTProvider } from "./provider.ts";

const STT_MODEL = Deno.env.get("OPENAI_STT_MODEL") ?? "whisper-1";

export class OpenAISTTProvider implements STTProvider {
  private client: OpenAI;

  constructor(apiKey = Deno.env.get("OPENAI_API_KEY")!) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audio: Uint8Array, language = "fr"): Promise<string> {
    // L'API attend un File ; on emballe le buffer audio (m4a/aac).
    const file = new File([audio], "command.m4a", { type: "audio/m4a" });
    const result = await this.client.audio.transcriptions.create({
      file,
      model: STT_MODEL,
      language,
      // température basse : transcription la plus fidèle possible.
      temperature: 0,
    });
    return result.text.trim();
  }
}
