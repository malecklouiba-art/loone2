// Implémentation du raisonnement via Anthropic Claude (tool use).
import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";
import type { AIMessage, AIRunResult, ReasoningProvider } from "./provider.ts";
import type { AnthropicTool } from "./tools.ts";

// Modèle de raisonnement (famille Claude la plus récente disponible).
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5";

export class AnthropicProvider implements ReasoningProvider {
  private client: Anthropic;

  constructor(apiKey = Deno.env.get("ANTHROPIC_API_KEY")!) {
    this.client = new Anthropic({ apiKey });
  }

  async run(opts: {
    system: string;
    messages: AIMessage[];
    tools: AnthropicTool[];
  }): Promise<AIRunResult> {
    const tools = opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.2,
      system: opts.system,
      tools,
      messages: opts.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    const toolCalls = response.content
      .filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use")
      .map((c) => ({
        id: c.id,
        name: c.name,
        arguments: (c.input ?? {}) as Record<string, unknown>,
      }));

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();

    return { toolCalls, text: text || undefined, model: MODEL };
  }
}
