-- =============================================================================
-- Loone AI — 0001 Initial schema
-- Extensions, enums, helper functions, tables, indexes.
-- Source de vérité du modèle de données (voir docs/02-database-schema.md).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- recherche fuzzy (trigram)

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.app_plan          as enum ('free', 'pro', 'business');
create type public.member_role        as enum ('owner', 'admin', 'member');
create type public.client_status      as enum ('lead', 'active', 'inactive', 'archived');
create type public.project_status     as enum (
  'prospect', 'discussion', 'quote_sent', 'accepted', 'in_progress', 'completed', 'archived'
);
create type public.task_status        as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.task_priority      as enum ('low', 'medium', 'high', 'urgent');
create type public.note_source        as enum ('manual', 'voice', 'ai');
create type public.activity_type      as enum (
  'note', 'call', 'email', 'meeting', 'status_change', 'quote', 'invoice', 'ai_action'
);
create type public.quote_status       as enum ('draft', 'sent', 'accepted', 'declined', 'expired');
create type public.invoice_status     as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
create type public.email_provider     as enum ('gmail', 'outlook', 'resend');
create type public.email_direction    as enum ('inbound', 'outbound');
create type public.email_status       as enum ('unread', 'read', 'archived', 'sent', 'draft');
create type public.ai_input_type      as enum ('voice', 'text');
create type public.ai_action_status   as enum (
  'pending', 'confirmed', 'executing', 'executed', 'failed', 'cancelled'
);
create type public.ai_message_role    as enum ('user', 'assistant', 'tool');
create type public.insight_type       as enum (
  'forgotten_followup', 'inactive_client', 'quote_no_response', 'missed_appointment', 'new_prospect'
);
create type public.insight_severity   as enum ('info', 'warning', 'urgent');
create type public.insight_status     as enum ('new', 'seen', 'done', 'dismissed');
create type public.integration_provider as enum (
  'google_calendar', 'gmail', 'outlook', 'apple_calendar', 'resend'
);
create type public.integration_status as enum ('connected', 'disconnected', 'error');
create type public.device_platform    as enum ('ios', 'android');

-- ----------------------------------------------------------------------------
-- Helper: maintien de updated_at (sans dépendance aux tables)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Identité & tenant
-- ============================================================================

-- profiles : étend auth.users (1:1)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  locale      text not null default 'fr',
  plan        public.app_plan not null default 'free',
  onboarded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Mon espace',
  currency    char(3) not null default 'EUR',
  plan        public.app_plan not null default 'free',
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         public.member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Helpers tenant (après création des tables tenant)
-- ----------------------------------------------------------------------------

-- workspace « primaire » de l'utilisateur courant (MVP: 1 workspace/utilisateur)
create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1
$$;

-- l'utilisateur courant est-il membre du workspace donné ?
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws
      and user_id = auth.uid()
  )
$$;

-- ============================================================================
-- CRM cœur
-- ============================================================================

create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null default public.current_workspace_id()
                      references public.workspaces(id) on delete cascade,
  owner_id          uuid not null default auth.uid()
                      references public.profiles(id) on delete set null,
  first_name        text not null,
  last_name         text,
  company           text,
  email             text,
  phone             text,
  address           jsonb,
  tags              text[] not null default '{}',
  notes             text,
  status            public.client_status not null default 'lead',
  source            text,
  last_contacted_at timestamptz,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null default public.current_workspace_id()
                  references public.workspaces(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete set null,
  owner_id      uuid not null default auth.uid()
                  references public.profiles(id) on delete set null,
  title         text not null,
  description   text,
  status        public.project_status not null default 'prospect',
  budget_amount numeric(12,2),
  currency      char(3) not null default 'EUR',
  due_date      date,
  started_at    timestamptz,
  completed_at  timestamptz,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  category     text,
  unit_price   numeric(12,2) not null default 0,
  currency     char(3) not null default 'EUR',
  tax_rate     numeric(5,2) not null default 0,
  unit         text not null default 'unité',
  sku          text,
  is_service   boolean not null default true,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null default public.current_workspace_id()
                  references public.workspaces(id) on delete cascade,
  owner_id      uuid not null default auth.uid()
                  references public.profiles(id) on delete set null,
  client_id     uuid references public.clients(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null,
  notes         text,
  status        public.task_status not null default 'todo',
  priority      public.task_priority not null default 'medium',
  due_at        timestamptz,
  remind_at     timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null default public.current_workspace_id()
                      references public.workspaces(id) on delete cascade,
  owner_id          uuid not null default auth.uid()
                      references public.profiles(id) on delete set null,
  client_id         uuid references public.clients(id) on delete set null,
  project_id        uuid references public.projects(id) on delete set null,
  title             text not null,
  description       text,
  location          text,
  start_at          timestamptz not null,
  end_at            timestamptz,
  all_day           boolean not null default false,
  external_provider public.integration_provider,
  external_id       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  owner_id     uuid not null default auth.uid()
                 references public.profiles(id) on delete set null,
  client_id    uuid references public.clients(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  content      text not null,
  source       public.note_source not null default 'manual',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- timeline générique (historique client/projet)
create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  owner_id     uuid default auth.uid()
                 references public.profiles(id) on delete set null,
  client_id    uuid references public.clients(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  type         public.activity_type not null,
  title        text not null,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  owner_id     uuid not null default auth.uid()
                 references public.profiles(id) on delete set null,
  client_id    uuid references public.clients(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- Devis & factures
-- ============================================================================

create table public.quotes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete restrict,
  project_id   uuid references public.projects(id) on delete set null,
  number       text,
  status       public.quote_status not null default 'draft',
  issue_date   date not null default current_date,
  valid_until  date,
  subtotal     numeric(12,2) not null default 0,
  tax_total    numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  currency     char(3) not null default 'EUR',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.quote_items (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  tax_rate    numeric(5,2) not null default 0,
  line_total  numeric(12,2) not null default 0,
  position    int not null default 0
);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete restrict,
  project_id   uuid references public.projects(id) on delete set null,
  quote_id     uuid references public.quotes(id) on delete set null,
  number       text,
  status       public.invoice_status not null default 'draft',
  issue_date   date not null default current_date,
  due_date     date,
  subtotal     numeric(12,2) not null default 0,
  tax_total    numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  paid_at      timestamptz,
  currency     char(3) not null default 'EUR',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  tax_rate    numeric(5,2) not null default 0,
  line_total  numeric(12,2) not null default 0,
  position    int not null default 0
);

-- ============================================================================
-- Emails
-- ============================================================================

create table public.email_accounts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null default public.current_workspace_id()
                  references public.workspaces(id) on delete cascade,
  owner_id      uuid not null default auth.uid()
                  references public.profiles(id) on delete cascade,
  provider      public.email_provider not null,
  email         text not null,
  status        public.integration_status not null default 'connected',
  oauth         jsonb,                       -- chiffré (pgsodium/Vault) — jamais exposé client
  last_synced_at timestamptz,
  created_at    timestamptz not null default now()
);

create table public.emails (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null default public.current_workspace_id()
                  references public.workspaces(id) on delete cascade,
  owner_id      uuid not null default auth.uid()
                  references public.profiles(id) on delete set null,
  account_id    uuid references public.email_accounts(id) on delete set null,
  client_id     uuid references public.clients(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  provider      public.email_provider,
  external_id   text,
  thread_id     text,
  direction     public.email_direction not null,
  from_address  text,
  to_addresses  text[] not null default '{}',
  cc_addresses  text[] not null default '{}',
  subject       text,
  snippet       text,
  body_text     text,
  body_html     text,
  status        public.email_status not null default 'unread',
  ai_summary    text,
  sent_at       timestamptz,
  received_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- IA, automatisations, notifications
-- ============================================================================

-- journal d'audit de toutes les actions IA
create table public.ai_actions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  owner_id     uuid not null default auth.uid()
                 references public.profiles(id) on delete cascade,
  input_type   public.ai_input_type not null,
  transcript   text,
  intent       text,
  entities     jsonb not null default '{}'::jsonb,
  tool_calls   jsonb not null default '[]'::jsonb,
  status       public.ai_action_status not null default 'pending',
  result       jsonb,
  error        text,
  model        text,
  latency_ms   int,
  undo_token   uuid,
  undone_at    timestamptz,
  created_at   timestamptz not null default now()
);

create table public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  owner_id     uuid not null default auth.uid()
                 references public.profiles(id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            public.ai_message_role not null,
  content         text,
  tool_calls      jsonb,
  created_at      timestamptz not null default now()
);

-- automatisations / suggestions IA
create table public.insights (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null default public.current_workspace_id()
                     references public.workspaces(id) on delete cascade,
  type             public.insight_type not null,
  entity_type      text,
  entity_id        uuid,
  severity         public.insight_severity not null default 'info',
  title            text not null,
  message          text,
  suggested_action jsonb,
  status           public.insight_status not null default 'new',
  created_at       timestamptz not null default now()
);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  data          jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  scheduled_for timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null unique,
  platform   public.device_platform not null,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id()
                 references public.workspaces(id) on delete cascade,
  provider     public.integration_provider not null,
  status       public.integration_status not null default 'connected',
  credentials  jsonb,                        -- chiffré — jamais exposé client
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, provider)
);

-- ============================================================================
-- Index (performance)
-- ============================================================================
create index idx_workspace_members_user on public.workspace_members(user_id);

create index idx_clients_workspace        on public.clients(workspace_id);
create index idx_clients_status           on public.clients(workspace_id, status);
create index idx_clients_tags             on public.clients using gin(tags);
create index idx_clients_search           on public.clients
  using gin ((coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(company,'')) gin_trgm_ops);

create index idx_projects_workspace       on public.projects(workspace_id);
create index idx_projects_client          on public.projects(client_id);
create index idx_projects_status          on public.projects(workspace_id, status);

create index idx_products_workspace       on public.products(workspace_id);

create index idx_tasks_workspace          on public.tasks(workspace_id);
create index idx_tasks_due                on public.tasks(workspace_id, status, due_at);
create index idx_tasks_client             on public.tasks(client_id);
create index idx_tasks_project            on public.tasks(project_id);

create index idx_events_workspace_start   on public.calendar_events(workspace_id, start_at);
create index idx_events_client            on public.calendar_events(client_id);

create index idx_notes_client             on public.notes(client_id);
create index idx_notes_project            on public.notes(project_id);

create index idx_activities_client        on public.activities(client_id, created_at desc);
create index idx_activities_project       on public.activities(project_id, created_at desc);

create index idx_quotes_workspace_status  on public.quotes(workspace_id, status);
create index idx_quote_items_quote        on public.quote_items(quote_id);
create index idx_invoices_workspace_status on public.invoices(workspace_id, status, due_date);
create index idx_invoice_items_invoice    on public.invoice_items(invoice_id);

create index idx_emails_workspace_thread  on public.emails(workspace_id, thread_id);
create index idx_emails_client            on public.emails(client_id, received_at desc);

create index idx_ai_actions_workspace     on public.ai_actions(workspace_id, created_at desc);
create index idx_insights_workspace_status on public.insights(workspace_id, status);
create index idx_notifications_user        on public.notifications(user_id, created_at desc);
