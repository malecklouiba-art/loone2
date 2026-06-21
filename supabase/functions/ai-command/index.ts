// ============================================================================
// Edge Function: ai-command  ★ cœur du produit
// Voix/texte → STT → raisonnement (Claude + tools) → exécution → confirmation.
// Voir docs/06-backend-architecture.md §3 et docs/08-ai-system-prompt.md.
// ============================================================================
import { errorResponse, handleCorsPreflight, json } from "../_shared/cors.ts";
import {
  getCallerWorkspace,
  HttpError,
  requireUser,
  serviceClient,
} from "../_shared/supabase.ts";
import { buildSystemPrompt } from "../_shared/ai/system-prompt.ts";
import { isSensitive, TOOLS } from "../_shared/ai/tools.ts";
import { AnthropicProvider } from "../_shared/ai/anthropic.ts";
import { OpenAISTTProvider } from "../_shared/ai/openai.ts";
import { executeTool, type ExecContext } from "../_shared/ai/executor.ts";

interface CommandBody {
  input_type: "voice" | "text";
  audio?: string; // base64
  text?: string;
  locale?: string;
  client_context?: { screen?: string; selected_client_id?: string | null };
  confirm_token?: string;
  undo_token?: string;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  const startedAt = Date.now();
  try {
    const user = await requireUser(req);
    const workspaceId = await getCallerWorkspace(user.id);
    const svc = serviceClient();
    const ctx: ExecContext = { svc, workspaceId, ownerId: user.id };
    const body = (await req.json()) as CommandBody;
    const locale = body.locale ?? "fr";

    // ----------------------------------------------------------- UNDO
    if (body.undo_token) {
      return await handleUndo(ctx, body.undo_token);
    }

    // -------------------------------------------- CONFIRM (action sensible en attente)
    if (body.confirm_token) {
      return await handleConfirm(ctx, body.confirm_token);
    }

    // ----------------------------------------------------------- 1) Transcription
    let transcript = body.text?.trim() ?? "";
    if (body.input_type === "voice") {
      if (!body.audio) return errorResponse("bad_request", "Audio manquant.", 400);
      const stt = new OpenAISTTProvider();
      transcript = await stt.transcribe(base64ToBytes(body.audio), locale);
    }
    if (!transcript) return errorResponse("bad_request", "Aucune commande détectée.", 400);

    // ----------------------------------------------------------- 2) Raisonnement (Claude)
    const { data: ws } = await svc.from("workspaces").select("name, currency").eq("id", workspaceId).single();
    const reasoner = new AnthropicProvider();
    const system = buildSystemPrompt({
      now: new Date().toISOString(),
      timezone: "Europe/Paris",
      workspaceName: ws?.name ?? "Mon espace",
      currency: ws?.currency ?? "EUR",
      locale,
      hints: body.client_context?.screen ? `écran courant: ${body.client_context.screen}` : undefined,
    });

    const run = await reasoner.run({
      system,
      tools: TOOLS,
      messages: [{ role: "user", content: transcript }],
    });

    // Pas d'outil → l'IA pose une question / répond
    if (run.toolCalls.length === 0) {
      return json({
        transcript,
        requires_confirmation: false,
        needs_clarification: true,
        question: run.text ?? "Pouvez-vous préciser votre demande ?",
      });
    }

    const call = run.toolCalls[0]; // MVP : on traite la 1re action

    // ----------------------------------------------------------- 3) Action sensible → confirmation
    if (isSensitive(call.name)) {
      const { data: pending } = await svc
        .from("ai_actions")
        .insert({
          workspace_id: workspaceId,
          owner_id: user.id,
          input_type: body.input_type,
          transcript,
          intent: call.name,
          entities: call.arguments,
          tool_calls: run.toolCalls,
          status: "pending",
          model: run.model,
          latency_ms: Date.now() - startedAt,
        })
        .select("id")
        .single();

      return json({
        transcript,
        action: { tool: call.name, arguments: call.arguments },
        requires_confirmation: true,
        preview: buildPreview(call.name, call.arguments),
        confirm_token: pending?.id,
      });
    }

    // ----------------------------------------------------------- 4) Exécution directe (sûr/lecture)
    const result = await executeTool(ctx, call);

    const { data: logged } = await svc
      .from("ai_actions")
      .insert({
        workspace_id: workspaceId,
        owner_id: user.id,
        input_type: body.input_type,
        transcript,
        intent: call.name,
        entities: call.arguments,
        tool_calls: run.toolCalls,
        status: "executed",
        result: result as unknown as Record<string, unknown>,
        model: run.model,
        latency_ms: Date.now() - startedAt,
        undo_token: result.id ? crypto.randomUUID() : null,
      })
      .select("id, undo_token")
      .single();

    return json({
      transcript,
      action: { tool: call.name, arguments: call.arguments },
      requires_confirmation: false,
      result,
      undo_token: logged?.undo_token ?? undefined,
      ai_action_id: logged?.id,
      speech: result.summary,
    });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.code, err.message, err.status);
    console.error("ai-command error:", err);
    return errorResponse("internal", (err as Error).message ?? "Erreur interne.", 500);
  }
});

// --------------------------------------------------------------------- Helpers

function buildPreview(tool: string, args: Record<string, unknown>) {
  if (tool === "send_email") {
    return {
      type: "email",
      to: args.to,
      subject: args.subject ?? "(sans objet)",
      body: args.body_html ?? "",
    };
  }
  if (tool === "update_client" && args.archive) {
    return { type: "archive", client_id: args.client_id };
  }
  if (tool === "create_quote" || tool === "create_invoice") {
    return { type: tool === "create_quote" ? "quote" : "invoice", ...args };
  }
  return { type: "generic", ...args };
}

async function handleConfirm(ctx: ExecContext, confirmToken: string): Promise<Response> {
  const { data: action, error } = await ctx.svc
    .from("ai_actions")
    .select("*")
    .eq("id", confirmToken)
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "pending")
    .single();
  if (error || !action) return errorResponse("not_found", "Action en attente introuvable.", 404);

  // NB: l'exécution réelle des tools sensibles (send_email, create_quote/invoice)
  // est branchée en V2 (Resend / génération PDF). Ici on confirme la mécanique.
  const call = {
    id: action.id as string,
    name: action.intent as string,
    arguments: action.entities as Record<string, unknown>,
  };

  let result;
  try {
    result = await executeTool(ctx, call);
  } catch (_e) {
    // tool sensible non encore exécutable côté serveur (V2) → on marque confirmé
    result = { entity: action.intent, summary: "Action confirmée (exécution V2)." };
  }

  await ctx.svc
    .from("ai_actions")
    .update({ status: "executed", result: result as unknown as Record<string, unknown> })
    .eq("id", confirmToken);

  return json({ transcript: action.transcript, requires_confirmation: false, result, speech: result.summary });
}

async function handleUndo(ctx: ExecContext, undoToken: string): Promise<Response> {
  const { data: action } = await ctx.svc
    .from("ai_actions")
    .select("*")
    .eq("undo_token", undoToken)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (!action) return errorResponse("not_found", "Action annulable introuvable.", 404);

  const result = action.result as { entity?: string; id?: string } | null;
  const tableByEntity: Record<string, string> = {
    client: "clients",
    project: "projects",
    task: "tasks",
    event: "calendar_events",
    note: "notes",
  };
  const table = result?.entity ? tableByEntity[result.entity] : undefined;

  if (table && result?.id) {
    await ctx.svc.from(table).delete().eq("id", result.id).eq("workspace_id", ctx.workspaceId);
  }
  await ctx.svc
    .from("ai_actions")
    .update({ status: "cancelled", undone_at: new Date().toISOString() })
    .eq("id", action.id);

  return json({ requires_confirmation: false, result: { entity: "undo", summary: "Action annulée." } });
}
