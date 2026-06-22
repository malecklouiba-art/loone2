// Exécution des tool calls contre Postgres, TOUJOURS scopée au workspace de l'appelant.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AIToolCall } from "./provider.ts";

export interface ExecContext {
  svc: SupabaseClient;
  workspaceId: string;
  ownerId: string;
}

export interface ExecResult {
  entity: string;
  id?: string;
  summary: string;
  data?: unknown;
}

/** Résout "Nom ou id" vers un client_id (recherche fuzzy si nom). */
async function resolveClientId(
  ctx: ExecContext,
  nameOrId?: string,
): Promise<string | null> {
  if (!nameOrId) return null;
  // déjà un uuid ?
  if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return nameOrId;

  const { data } = await ctx.svc
    .from("clients")
    .select("id, first_name, last_name, company")
    .eq("workspace_id", ctx.workspaceId)
    .or(
      `first_name.ilike.%${nameOrId}%,last_name.ilike.%${nameOrId}%,company.ilike.%${nameOrId}%`,
    )
    .limit(1);

  return data && data.length > 0 ? (data[0].id as string) : null;
}

type Args = Record<string, unknown>;

/** Exécute un tool sûr / lecture. Les tools sensibles sont gérés en amont (confirmation). */
export async function executeTool(ctx: ExecContext, call: AIToolCall): Promise<ExecResult> {
  const a = call.arguments as Args;
  const base = { workspace_id: ctx.workspaceId, owner_id: ctx.ownerId };

  switch (call.name) {
    case "create_client": {
      const { data, error } = await ctx.svc
        .from("clients")
        .insert({
          ...base,
          first_name: a.first_name,
          last_name: a.last_name ?? null,
          email: a.email ?? null,
          phone: a.phone ?? null,
          company: a.company ?? null,
          tags: a.tags ?? [],
          notes: a.notes ?? null,
          status: a.status ?? "lead",
        })
        .select("id, first_name, last_name")
        .single();
      if (error) throw error;
      return {
        entity: "client",
        id: data.id,
        summary: `Client ${data.first_name} ${data.last_name ?? ""}`.trim() + " créé.",
        data,
      };
    }

    case "create_project": {
      const clientId = await resolveClientId(ctx, a.client_name_or_id as string);
      const { data, error } = await ctx.svc
        .from("projects")
        .insert({
          ...base,
          client_id: clientId,
          title: a.title,
          status: a.status ?? "prospect",
          budget_amount: a.budget_amount ?? null,
          currency: a.currency ?? "EUR",
          due_date: a.due_date ?? null,
          description: a.description ?? null,
        })
        .select("id, title")
        .single();
      if (error) throw error;
      return { entity: "project", id: data.id, summary: `Projet « ${data.title} » créé.`, data };
    }

    case "update_project": {
      const patch: Args = {};
      for (const k of ["status", "budget_amount", "due_date", "description"]) {
        if (a[k] !== undefined) patch[k] = a[k];
      }
      const { data, error } = await ctx.svc
        .from("projects")
        .update(patch)
        .eq("id", a.project_id)
        .eq("workspace_id", ctx.workspaceId)
        .select("id, title, status")
        .single();
      if (error) throw error;
      return { entity: "project", id: data.id, summary: `Projet « ${data.title} » mis à jour.`, data };
    }

    case "create_task": {
      const clientId = await resolveClientId(ctx, a.client_name_or_id as string);
      const { data, error } = await ctx.svc
        .from("tasks")
        .insert({
          ...base,
          client_id: clientId,
          project_id: a.project_id ?? null,
          title: a.title,
          due_at: a.due_at ?? null,
          remind_at: a.remind_at ?? a.due_at ?? null,
          priority: a.priority ?? "medium",
        })
        .select("id, title")
        .single();
      if (error) throw error;
      return { entity: "task", id: data.id, summary: `Tâche « ${data.title} » créée.`, data };
    }

    case "complete_task": {
      const { data, error } = await ctx.svc
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", a.task_id)
        .eq("workspace_id", ctx.workspaceId)
        .select("id, title")
        .single();
      if (error) throw error;
      return { entity: "task", id: data.id, summary: `Tâche « ${data.title} » terminée.`, data };
    }

    case "create_calendar_event": {
      const clientId = await resolveClientId(ctx, a.client_name_or_id as string);
      const { data, error } = await ctx.svc
        .from("calendar_events")
        .insert({
          ...base,
          client_id: clientId,
          project_id: a.project_id ?? null,
          title: a.title,
          start_at: a.start_at,
          end_at: a.end_at ?? null,
          all_day: a.all_day ?? false,
          location: a.location ?? null,
          description: a.description ?? null,
        })
        .select("id, title, start_at")
        .single();
      if (error) throw error;
      return { entity: "event", id: data.id, summary: `Rendez-vous « ${data.title} » planifié.`, data };
    }

    case "create_note": {
      const clientId = await resolveClientId(ctx, a.client_name_or_id as string);
      const { data, error } = await ctx.svc
        .from("notes")
        .insert({
          ...base,
          client_id: clientId,
          project_id: a.project_id ?? null,
          content: a.content,
          source: "voice",
        })
        .select("id")
        .single();
      if (error) throw error;
      return { entity: "note", id: data.id, summary: "Note ajoutée.", data };
    }

    case "find_client": {
      const q = (a.query as string) ?? "";
      const { data, error } = await ctx.svc
        .from("clients")
        .select("id, first_name, last_name, company, email")
        .eq("workspace_id", ctx.workspaceId)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5);
      if (error) throw error;
      return { entity: "clients", summary: `${data.length} client(s) trouvé(s).`, data };
    }

    case "query_records":
      return queryRecords(ctx, a);

    case "get_dashboard_stats":
      return dashboardStats(ctx);

    case "daily_briefing":
      return dailyBriefing(ctx);

    default:
      throw new Error(`Tool non exécutable directement : ${call.name}`);
  }
}

async function queryRecords(ctx: ExecContext, a: Args): Promise<ExecResult> {
  const entity = a.entity as string;
  const filters = (a.filters ?? {}) as Args;
  const limit = (a.limit as number) ?? 25;

  if (entity === "invoices") {
    let q = ctx.svc.from("invoices").select("*").eq("workspace_id", ctx.workspaceId);
    if (filters.status) q = q.eq("status", filters.status as string);
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    return { entity, summary: `${data.length} facture(s).`, data };
  }

  if (entity === "clients" && filters.no_contact_since_days) {
    const days = filters.no_contact_since_days as number;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await ctx.svc
      .from("clients")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${since}`)
      .limit(limit);
    if (error) throw error;
    return { entity, summary: `${data.length} client(s) sans relance depuis ${days} j.`, data };
  }

  const table = { projects: "projects", tasks: "tasks", quotes: "quotes", events: "calendar_events", emails: "emails", clients: "clients" }[entity] ?? entity;
  let q = ctx.svc.from(table).select("*").eq("workspace_id", ctx.workspaceId);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as string);
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return { entity, summary: `${data?.length ?? 0} résultat(s).`, data };
}

async function dashboardStats(ctx: ExecContext): Promise<ExecResult> {
  const ws = ctx.workspaceId;
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: paid }, { count: unpaidCount }, { data: unpaid }, { count: quotes }] = await Promise.all([
    ctx.svc.from("invoices").select("total").eq("workspace_id", ws).eq("status", "paid").gte("paid_at", startMonth),
    ctx.svc.from("invoices").select("*", { count: "exact", head: true }).eq("workspace_id", ws).in("status", ["overdue", "sent"]),
    ctx.svc.from("invoices").select("total").eq("workspace_id", ws).in("status", ["overdue", "sent"]),
    ctx.svc.from("quotes").select("*", { count: "exact", head: true }).eq("workspace_id", ws).eq("status", "sent"),
  ]);

  const stats = {
    revenue_month: (paid ?? []).reduce((s, r) => s + Number(r.total), 0),
    unpaid_invoices_count: unpaidCount ?? 0,
    unpaid_invoices_total: (unpaid ?? []).reduce((s, r) => s + Number(r.total), 0),
    pending_quotes_count: quotes ?? 0,
  };
  return { entity: "dashboard", summary: "Statistiques du dashboard.", data: stats };
}

async function dailyBriefing(ctx: ExecContext): Promise<ExecResult> {
  const ws = ctx.workspaceId;
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);

  const [{ data: events }, { data: tasks }, { data: insights }] = await Promise.all([
    ctx.svc.from("calendar_events").select("*").eq("workspace_id", ws)
      .gte("start_at", dayStart.toISOString()).lte("start_at", dayEnd.toISOString()).order("start_at"),
    ctx.svc.from("tasks").select("*").eq("workspace_id", ws).neq("status", "done")
      .lte("due_at", dayEnd.toISOString()).order("priority", { ascending: false }),
    ctx.svc.from("insights").select("*").eq("workspace_id", ws).eq("status", "new").limit(5),
  ]);

  return {
    entity: "briefing",
    summary: `${events?.length ?? 0} RDV, ${tasks?.length ?? 0} tâche(s), ${insights?.length ?? 0} suggestion(s).`,
    data: { events, tasks, insights },
  };
}
