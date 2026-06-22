// Tools IA au format Anthropic (champ `tools` de l'API Messages) + criticité.
//
// ⚠️ DOIT RESTER EN PHASE avec packages/shared/src/ai-tools.ts (source de vérité côté app).
// À terme : générer ce fichier depuis le package partagé pour éviter toute dérive.
// (Le runtime Deno des Edge Functions ne résout pas le workspace npm du monorepo,
//  d'où cette copie vendored.)

export type ToolCriticality = "safe" | "sensitive" | "read";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  criticality: ToolCriticality;
}

const str = (description?: string) => ({ type: "string", ...(description ? { description } : {}) });
const num = (description?: string) => ({ type: "number", ...(description ? { description } : {}) });
const bool = () => ({ type: "boolean" });

const PROJECT_STATUSES = [
  "prospect", "discussion", "quote_sent", "accepted", "in_progress", "completed", "archived",
];
const lineItems = {
  type: "array",
  items: {
    type: "object",
    properties: {
      product_id: str(), description: str(), quantity: num(), unit_price: num(), tax_rate: num(),
    },
    required: ["description", "quantity", "unit_price"],
  },
};

export const TOOLS: AnthropicTool[] = [
  {
    name: "find_client", criticality: "read",
    description: "Recherche un client par nom, société ou email. À utiliser AVANT toute action sur un client nommé.",
    input_schema: { type: "object", properties: { query: str("Nom, société ou email.") }, required: ["query"] },
  },
  {
    name: "create_client", criticality: "safe",
    description: "Crée une nouvelle fiche client.",
    input_schema: {
      type: "object",
      properties: {
        first_name: str("Prénom (obligatoire)."), last_name: str(), email: str(), phone: str(),
        company: str(), address: str(), tags: { type: "array", items: str() }, notes: str(),
        status: { type: "string", enum: ["lead", "active"] },
      },
      required: ["first_name"],
    },
  },
  {
    name: "update_client", criticality: "sensitive",
    description: "Met à jour un client. archive=true pour archiver (sensible).",
    input_schema: {
      type: "object",
      properties: {
        client_id: str(), first_name: str(), last_name: str(), email: str(), phone: str(),
        company: str(), notes: str(),
        status: { type: "string", enum: ["lead", "active", "inactive", "archived"] },
        archive: bool(),
      },
      required: ["client_id"],
    },
  },
  {
    name: "find_project", criticality: "read",
    description: "Recherche un projet par titre, éventuellement filtré par client.",
    input_schema: { type: "object", properties: { query: str(), client_id: str() }, required: ["query"] },
  },
  {
    name: "create_project", criticality: "safe",
    description: "Crée un projet, éventuellement rattaché à un client.",
    input_schema: {
      type: "object",
      properties: {
        title: str(), client_name_or_id: str("Nom ou id du client."),
        status: { type: "string", enum: PROJECT_STATUSES },
        budget_amount: num(), currency: str(), due_date: str("ISO 8601."), description: str(),
      },
      required: ["title"],
    },
  },
  {
    name: "update_project", criticality: "safe",
    description: "Met à jour un projet (statut, budget, échéance...).",
    input_schema: {
      type: "object",
      properties: {
        project_id: str(), status: { type: "string", enum: PROJECT_STATUSES },
        budget_amount: num(), due_date: str(), description: str(),
      },
      required: ["project_id"],
    },
  },
  {
    name: "create_task", criticality: "safe",
    description: "Crée une tâche ou un rappel.",
    input_schema: {
      type: "object",
      properties: {
        title: str(), due_at: str("ISO 8601."), remind_at: str("ISO 8601."),
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        client_name_or_id: str(), project_id: str(),
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task", criticality: "safe",
    description: "Marque une tâche comme terminée.",
    input_schema: { type: "object", properties: { task_id: str() }, required: ["task_id"] },
  },
  {
    name: "create_calendar_event", criticality: "safe",
    description: "Planifie un événement / rendez-vous.",
    input_schema: {
      type: "object",
      properties: {
        title: str(), start_at: str("Début ISO 8601 (obligatoire)."), end_at: str("Fin ISO 8601."),
        all_day: bool(), location: str(), client_name_or_id: str(), project_id: str(), description: str(),
      },
      required: ["title", "start_at"],
    },
  },
  {
    name: "create_note", criticality: "safe",
    description: "Ajoute une note, éventuellement rattachée à un client/projet.",
    input_schema: {
      type: "object",
      properties: { content: str(), client_name_or_id: str(), project_id: str() },
      required: ["content"],
    },
  },
  {
    name: "draft_email", criticality: "read",
    description: "Rédige un brouillon d'email (relance, remerciement...). À confirmer avant envoi.",
    input_schema: {
      type: "object",
      properties: {
        to_client_name_or_id: str(), to_email: str(), subject: str(),
        intent: str("Ex: 'relance devis'."), context: str("Détails à inclure."),
      },
      required: ["intent"],
    },
  },
  {
    name: "send_email", criticality: "sensitive",
    description: "Envoie un email. SENSIBLE : confirmation requise.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", items: str() }, subject: str(), body_html: str(),
        client_id: str(), draft_id: str(),
      },
      required: ["to", "subject", "body_html"],
    },
  },
  {
    name: "create_quote", criticality: "sensitive",
    description: "Crée un devis pour un client. SENSIBLE.",
    input_schema: {
      type: "object",
      properties: { client_name_or_id: str(), valid_until: str(), items: lineItems },
      required: ["client_name_or_id", "items"],
    },
  },
  {
    name: "create_invoice", criticality: "sensitive",
    description: "Crée une facture, éventuellement depuis un devis. SENSIBLE.",
    input_schema: {
      type: "object",
      properties: { client_name_or_id: str(), quote_id: str(), due_date: str(), items: lineItems },
      required: ["client_name_or_id"],
    },
  },
  {
    name: "query_records", criticality: "read",
    description: "Interroge le CRM (lecture). Ex: factures impayées, clients sans relance depuis N jours.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["clients", "projects", "tasks", "invoices", "quotes", "events", "emails"] },
        filters: { type: "object" }, sort: str(), limit: num(),
      },
      required: ["entity"],
    },
  },
  {
    name: "daily_briefing", criticality: "read",
    description: "Résume la journée : rendez-vous, tâches, suggestions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_dashboard_stats", criticality: "read",
    description: "Indicateurs du dashboard (CA, impayés, devis en attente...).",
    input_schema: { type: "object", properties: {} },
  },
];

export const TOOL_CRITICALITY: Record<string, ToolCriticality> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t.criticality]),
);

export function isSensitive(name: string): boolean {
  return TOOL_CRITICALITY[name] === "sensitive";
}
