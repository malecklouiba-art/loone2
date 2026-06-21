/**
 * Types de domaine partagés (app mobile ↔ edge functions).
 * Les types DB exacts sont générés dans database.types.ts (`pnpm db:types`).
 */
import type { ToolCall, ToolName } from "./ai-tools";

// --------------------------------------------------------------------- Enums
export type AppPlan = "free" | "pro" | "business";
export type MemberRole = "owner" | "admin" | "member";
export type ClientStatus = "lead" | "active" | "inactive" | "archived";
export type ProjectStatus =
  | "prospect"
  | "discussion"
  | "quote_sent"
  | "accepted"
  | "in_progress"
  | "completed"
  | "archived";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type InsightType =
  | "forgotten_followup"
  | "inactive_client"
  | "quote_no_response"
  | "missed_appointment"
  | "new_prospect";

// --------------------------------------------------------------------- Entités
export interface Client {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  tags: string[];
  notes: string | null;
  status: ClientStatus;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  budget_amount: number | null;
  currency: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  remind_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
}

export interface Insight {
  id: string;
  type: InsightType;
  severity: "info" | "warning" | "urgent";
  title: string;
  message: string | null;
  status: "new" | "seen" | "done" | "dismissed";
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  revenue_month: number;
  unpaid_invoices_count: number;
  unpaid_invoices_total: number;
  pending_quotes_count: number;
  tasks_today_count: number;
  events_today_count: number;
}

// --------------------------------------------------- Contrat API: ai-command
export type AIInputType = "voice" | "text";

export interface AICommandRequest {
  input_type: AIInputType;
  /** base64 audio (m4a/aac) si input_type = voice */
  audio?: string;
  /** texte si input_type = text */
  text?: string;
  locale?: string;
  client_context?: {
    screen?: string;
    selected_client_id?: string | null;
  };
  /** pour exécuter une action sensible en attente */
  confirm_token?: string;
  /** pour annuler la dernière action */
  undo_token?: string;
}

export interface AIActionResult {
  entity: string;
  id?: string;
  summary: string;
  [k: string]: unknown;
}

export interface AICommandPreview {
  type: "email" | "quote" | "invoice" | "archive";
  [k: string]: unknown;
}

export interface AICommandResponse {
  transcript: string;
  action?: { tool: ToolName; arguments: Record<string, unknown> };
  requires_confirmation: boolean;
  needs_clarification?: boolean;
  question?: string;
  candidates?: Array<{ id: string; name: string }>;
  preview?: AICommandPreview;
  confirm_token?: string;
  result?: AIActionResult;
  undo_token?: string;
  speech?: string;
  ai_action_id?: string;
  tool_calls?: ToolCall[];
}
