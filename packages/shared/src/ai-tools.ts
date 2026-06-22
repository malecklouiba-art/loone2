/**
 * Définition des "tools" IA — SOURCE UNIQUE DE VÉRITÉ.
 *
 * Utilisée :
 *  - côté Edge Function pour fournir les tools à Claude (champ `tools`) ;
 *  - côté serveur pour la classification de criticité (sûr / sensible) ;
 *  - côté client pour typer les actions et les rendus de confirmation.
 *
 * Voir docs/08-ai-system-prompt.md
 */

/** Niveau de criticité décidé côté SERVEUR (jamais par le seul modèle). */
export type ToolCriticality = "safe" | "sensitive" | "read";

/** Schéma d'un paramètre (sous-ensemble JSON Schema compatible Anthropic). */
export interface ToolParamSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: readonly string[];
  items?: ToolParamSchema;
  properties?: Record<string, ToolParamSchema>;
  required?: string[];
}

/** Définition d'un tool exposé au modèle. */
export interface ToolDefinition {
  name: ToolName;
  description: string;
  criticality: ToolCriticality;
  input_schema: {
    type: "object";
    properties: Record<string, ToolParamSchema>;
    required?: string[];
  };
}

export type ToolName =
  | "find_client"
  | "create_client"
  | "update_client"
  | "find_project"
  | "create_project"
  | "update_project"
  | "create_task"
  | "complete_task"
  | "create_calendar_event"
  | "create_note"
  | "draft_email"
  | "send_email"
  | "create_quote"
  | "create_invoice"
  | "query_records"
  | "daily_briefing"
  | "get_dashboard_stats";

export const PROJECT_STATUSES = [
  "prospect",
  "discussion",
  "quote_sent",
  "accepted",
  "in_progress",
  "completed",
  "archived",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/** Tableau des tools (ordre = priorité d'exposition au modèle). */
export const AI_TOOLS: readonly ToolDefinition[] = [
  // -------------------------------------------------------------- Clients
  {
    name: "find_client",
    description:
      "Recherche un client existant par nom, société ou email. À utiliser AVANT toute action sur un client mentionné par son nom.",
    criticality: "read",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nom, société ou email à rechercher." },
      },
      required: ["query"],
    },
  },
  {
    name: "create_client",
    description: "Crée une nouvelle fiche client.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        first_name: { type: "string", description: "Prénom (obligatoire)." },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        address: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
        status: { type: "string", enum: ["lead", "active"] },
      },
      required: ["first_name"],
    },
  },
  {
    name: "update_client",
    description:
      "Met à jour un client. Mettre archive=true pour archiver (action sensible : nécessite confirmation).",
    criticality: "sensitive",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        notes: { type: "string" },
        status: { type: "string", enum: ["lead", "active", "inactive", "archived"] },
        archive: { type: "boolean" },
      },
      required: ["client_id"],
    },
  },
  // -------------------------------------------------------------- Projets
  {
    name: "find_project",
    description: "Recherche un projet existant par titre, éventuellement filtré par client.",
    criticality: "read",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        client_id: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_project",
    description: "Crée un projet, éventuellement rattaché à un client.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        client_name_or_id: { type: "string", description: "Nom ou id du client associé." },
        status: { type: "string", enum: PROJECT_STATUSES },
        budget_amount: { type: "number" },
        currency: { type: "string" },
        due_date: { type: "string", description: "Date d'échéance ISO 8601." },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_project",
    description: "Met à jour un projet (statut, budget, échéance...).",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        status: { type: "string", enum: PROJECT_STATUSES },
        budget_amount: { type: "number" },
        due_date: { type: "string" },
        description: { type: "string" },
      },
      required: ["project_id"],
    },
  },
  // -------------------------------------------------------------- Tâches
  {
    name: "create_task",
    description: "Crée une tâche ou un rappel.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_at: { type: "string", description: "Échéance ISO 8601." },
        remind_at: { type: "string", description: "Rappel ISO 8601." },
        priority: { type: "string", enum: TASK_PRIORITIES },
        client_name_or_id: { type: "string" },
        project_id: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Marque une tâche comme terminée.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: { task_id: { type: "string" } },
      required: ["task_id"],
    },
  },
  // -------------------------------------------------------------- Calendrier
  {
    name: "create_calendar_event",
    description: "Planifie un événement / rendez-vous.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start_at: { type: "string", description: "Début ISO 8601 (obligatoire)." },
        end_at: { type: "string", description: "Fin ISO 8601." },
        all_day: { type: "boolean" },
        location: { type: "string" },
        client_name_or_id: { type: "string" },
        project_id: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "start_at"],
    },
  },
  // -------------------------------------------------------------- Notes
  {
    name: "create_note",
    description: "Ajoute une note, éventuellement rattachée à un client ou projet.",
    criticality: "safe",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        client_name_or_id: { type: "string" },
        project_id: { type: "string" },
      },
      required: ["content"],
    },
  },
  // -------------------------------------------------------------- Emails (sensibles)
  {
    name: "draft_email",
    description:
      "Rédige un brouillon d'email (relance, remerciement...). Renvoie un brouillon à confirmer avant envoi.",
    criticality: "read",
    input_schema: {
      type: "object",
      properties: {
        to_client_name_or_id: { type: "string" },
        to_email: { type: "string" },
        subject: { type: "string" },
        intent: { type: "string", description: "Ex: 'relance devis', 'remerciement'." },
        context: { type: "string", description: "Détails à inclure." },
      },
      required: ["intent"],
    },
  },
  {
    name: "send_email",
    description: "Envoie un email. ACTION SENSIBLE : nécessite confirmation explicite.",
    criticality: "sensitive",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        body_html: { type: "string" },
        client_id: { type: "string" },
        draft_id: { type: "string" },
      },
      required: ["to", "subject", "body_html"],
    },
  },
  // -------------------------------------------------------------- Devis / Factures (sensibles)
  {
    name: "create_quote",
    description: "Crée un devis pour un client. ACTION SENSIBLE.",
    criticality: "sensitive",
    input_schema: {
      type: "object",
      properties: {
        client_name_or_id: { type: "string" },
        valid_until: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
              tax_rate: { type: "number" },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
      },
      required: ["client_name_or_id", "items"],
    },
  },
  {
    name: "create_invoice",
    description: "Crée une facture, éventuellement à partir d'un devis. ACTION SENSIBLE.",
    criticality: "sensitive",
    input_schema: {
      type: "object",
      properties: {
        client_name_or_id: { type: "string" },
        quote_id: { type: "string" },
        due_date: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
              tax_rate: { type: "number" },
            },
            required: ["description", "quantity", "unit_price"],
          },
        },
      },
      required: ["client_name_or_id"],
    },
  },
  // -------------------------------------------------------------- Lecture / analyse
  {
    name: "query_records",
    description:
      "Interroge le CRM (lecture). Ex: factures impayées, clients sans relance depuis N jours, devis en attente.",
    criticality: "read",
    input_schema: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: ["clients", "projects", "tasks", "invoices", "quotes", "events", "emails"],
        },
        filters: { type: "object", description: "Filtres, ex: { status: 'overdue' } ou { no_contact_since_days: 30 }." },
        sort: { type: "string" },
        limit: { type: "number" },
      },
      required: ["entity"],
    },
  },
  {
    name: "daily_briefing",
    description: "Résume la journée : rendez-vous, tâches, suggestions IA.",
    criticality: "read",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_dashboard_stats",
    description: "Renvoie les indicateurs du dashboard (CA, impayés, devis en attente...).",
    criticality: "read",
    input_schema: { type: "object", properties: {} },
  },
];

/** Map nom → criticité, pour la décision serveur. */
export const TOOL_CRITICALITY: Record<ToolName, ToolCriticality> = AI_TOOLS.reduce(
  (acc, t) => {
    acc[t.name] = t.criticality;
    return acc;
  },
  {} as Record<ToolName, ToolCriticality>,
);

/** Une action sensible nécessite une confirmation explicite avant exécution. */
export function requiresConfirmation(tool: ToolName): boolean {
  return TOOL_CRITICALITY[tool] === "sensitive";
}

/** Un appel d'outil tel que renvoyé par le modèle. */
export interface ToolCall<T = Record<string, unknown>> {
  id: string;
  name: ToolName;
  arguments: T;
}
