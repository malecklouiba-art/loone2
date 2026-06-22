# 02 — Schéma de base de données

> Source de vérité = les migrations SQL dans [`supabase/migrations/`](../supabase/migrations).
> Ce document explique le modèle, les relations et la stratégie RLS.

---

## 1. Principes du modèle

- **Multi-tenant par `workspace`.** Toute donnée métier appartient à un `workspace`.
  Au MVP, 1 utilisateur = 1 workspace (créé automatiquement). En V3, plusieurs membres.
- **`profiles` étend `auth.users`** (géré par Supabase Auth). On ne stocke jamais de mot
  de passe nous-mêmes.
- **Clés primaires `uuid`** (`gen_random_uuid()`), horodatage `created_at` / `updated_at`
  sur toutes les tables, `updated_at` maintenu par trigger.
- **Soft-delete** via `archived_at` sur les entités principales (clients, projets) — rien
  n'est perdu, l'IA peut « archiver » sans détruire.
- **Enums Postgres** pour les statuts (intégrité forte).
- **`jsonb`** pour les champs flexibles (adresse, settings, metadata IA).

---

## 2. Diagramme entités-relations (ERD)

```
                          ┌──────────────┐
                          │ auth.users   │ (Supabase)
                          └──────┬───────┘
                                 │ 1:1
                          ┌──────▼───────┐        ┌────────────────────┐
                          │  profiles    │        │   workspaces       │
                          │  (= user)    │◄───────┤  owner_id          │
                          └──────┬───────┘  owns  └─────────┬──────────┘
                                 │                          │
                                 │     ┌────────────────────┤ workspace_id (sur TOUTES
                                 │     │                     │  les tables ci-dessous)
                    ┌────────────┴─────┴───────┐
                    │     workspace_members     │ (user_id, workspace_id, role)
                    └───────────────────────────┘

  workspace_id ─┬─► clients ──┬─► projects ──┬─► tasks
                │             │              ├─► calendar_events
                │             │              ├─► notes
                │             │              ├─► documents
                │             │              ├─► quotes ──► quote_items ──► products
                │             │              └─► invoices ──► invoice_items
                │             │
                │             └─► activities (timeline / historique)
                │
                ├─► products
                ├─► emails ──► email_accounts
                ├─► ai_actions          (journal des actions IA)
                ├─► ai_conversations ──► ai_messages   (assistant conversationnel)
                ├─► insights            (automatisations / suggestions IA)
                ├─► notifications
                ├─► integrations        (Google/Microsoft/Resend creds)
                └─► push_tokens         (Expo push, lié à user_id)
```

---

## 3. Tables (résumé des colonnes clés)

### Identité & tenant

**`profiles`** — `id` (=auth.uid, PK), `email`, `full_name`, `avatar_url`, `locale`
(`fr` par défaut), `plan` (`free`/`pro`/`business`), `onboarded_at`, `created_at`.

**`workspaces`** — `id`, `owner_id → profiles`, `name`, `currency` (`EUR`), `settings`
(jsonb), `plan`, `created_at`, `updated_at`.

**`workspace_members`** — `workspace_id`, `user_id → profiles`, `role`
(`owner`/`admin`/`member`), `created_at`. PK composite `(workspace_id, user_id)`.

### CRM cœur

**`clients`** — `id`, `workspace_id`, `owner_id`, `first_name`, `last_name`, `company`,
`email`, `phone`, `address` (jsonb), `tags` (text[]), `notes`, `status`
(`lead`/`active`/`inactive`/`archived`), `last_contacted_at`, `source`, `archived_at`,
`created_at`, `updated_at`.

**`projects`** — `id`, `workspace_id`, `client_id → clients`, `owner_id`, `title`,
`description`, `status` (enum `project_status`), `budget_amount` (numeric), `currency`,
`due_date`, `started_at`, `completed_at`, `archived_at`, `created_at`, `updated_at`.

**`tasks`** — `id`, `workspace_id`, `owner_id`, `client_id?`, `project_id?`, `title`,
`notes`, `status` (`todo`/`in_progress`/`done`/`cancelled`), `priority`
(`low`/`medium`/`high`/`urgent`), `due_at`, `remind_at`, `completed_at`, `created_at`,
`updated_at`.

**`calendar_events`** — `id`, `workspace_id`, `owner_id`, `client_id?`, `project_id?`,
`title`, `description`, `location`, `start_at`, `end_at`, `all_day` (bool),
`external_provider` (`google`/`apple`/`outlook`/null), `external_id`, `created_at`,
`updated_at`.

**`notes`** — `id`, `workspace_id`, `owner_id`, `client_id?`, `project_id?`, `content`,
`source` (`manual`/`voice`/`ai`), `created_at`, `updated_at`.

**`activities`** — timeline générique (historique client/projet). `id`, `workspace_id`,
`owner_id`, `client_id?`, `project_id?`, `type` (`note`/`call`/`email`/`meeting`/
`status_change`/`quote`/`invoice`/`ai_action`), `title`, `metadata` (jsonb), `created_at`.

### Catalogue & facturation

**`products`** — `id`, `workspace_id`, `name`, `description`, `category`, `unit_price`
(numeric), `currency`, `tax_rate` (numeric, %), `unit` (`unité`/`heure`/`jour`/`forfait`),
`sku`, `is_service` (bool), `archived_at`, `created_at`, `updated_at`.

**`quotes`** (devis) — `id`, `workspace_id`, `client_id`, `project_id?`, `number`
(auto, unique/workspace), `status` (`draft`/`sent`/`accepted`/`declined`/`expired`),
`issue_date`, `valid_until`, `subtotal`, `tax_total`, `total`, `currency`, `notes`,
`created_at`, `updated_at`.

**`quote_items`** — `id`, `quote_id`, `product_id?`, `description`, `quantity`,
`unit_price`, `tax_rate`, `line_total`, `position`.

**`invoices`** (factures) — `id`, `workspace_id`, `client_id`, `project_id?`, `quote_id?`,
`number`, `status` (`draft`/`sent`/`paid`/`overdue`/`cancelled`), `issue_date`,
`due_date`, `subtotal`, `tax_total`, `total`, `paid_at`, `currency`, `notes`,
`created_at`, `updated_at`.

**`invoice_items`** — `id`, `invoice_id`, `product_id?`, `description`, `quantity`,
`unit_price`, `tax_rate`, `line_total`, `position`.

### Emails

**`email_accounts`** — `id`, `workspace_id`, `owner_id`, `provider` (`gmail`/`outlook`),
`email`, `status` (`connected`/`disconnected`/`error`), `oauth` (jsonb chiffré),
`last_synced_at`, `created_at`.

**`emails`** — `id`, `workspace_id`, `owner_id`, `client_id?`, `project_id?`, `account_id`,
`provider`, `external_id`, `thread_id`, `direction` (`inbound`/`outbound`), `from_address`,
`to_addresses` (text[]), `cc_addresses` (text[]), `subject`, `snippet`, `body_text`,
`body_html`, `status` (`unread`/`read`/`archived`/`sent`/`draft`), `ai_summary`,
`sent_at`, `received_at`, `created_at`.

### IA, automatisations, notifications

**`ai_actions`** — journal d'audit. `id`, `workspace_id`, `owner_id`, `input_type`
(`voice`/`text`), `transcript`, `intent`, `entities` (jsonb), `tool_calls` (jsonb),
`status` (`pending`/`confirmed`/`executing`/`executed`/`failed`/`cancelled`), `result`
(jsonb), `error`, `model`, `latency_ms`, `undo_token`, `undone_at`, `created_at`.

**`ai_conversations`** — `id`, `workspace_id`, `owner_id`, `title`, `created_at`.
**`ai_messages`** — `id`, `conversation_id`, `role` (`user`/`assistant`/`tool`),
`content`, `tool_calls` (jsonb), `created_at`.

**`insights`** (automatisations / suggestions) — `id`, `workspace_id`, `type`
(`forgotten_followup`/`inactive_client`/`quote_no_response`/`missed_appointment`/
`new_prospect`), `entity_type`, `entity_id`, `severity` (`info`/`warning`/`urgent`),
`title`, `message`, `suggested_action` (jsonb), `status` (`new`/`seen`/`done`/`dismissed`),
`created_at`.

**`notifications`** — `id`, `workspace_id`, `user_id`, `type`, `title`, `body`, `data`
(jsonb), `read_at`, `scheduled_for`, `sent_at`, `created_at`.

**`push_tokens`** — `id`, `user_id`, `token`, `platform` (`ios`/`android`), `created_at`.

**`integrations`** — `id`, `workspace_id`, `provider` (`google_calendar`/`gmail`/
`outlook`/`resend`/`apple_calendar`), `status`, `credentials` (jsonb chiffré), `metadata`
(jsonb), `created_at`, `updated_at`.

**`documents`** — `id`, `workspace_id`, `owner_id`, `client_id?`, `project_id?`, `name`,
`storage_path`, `mime_type`, `size_bytes`, `created_at`.

---

## 4. Relations principales

- `profiles 1—N workspaces` (en tant qu'`owner`), et `N—N` via `workspace_members`.
- `clients 1—N projects`, `clients 1—N tasks`, `clients 1—N notes`, etc.
- `projects 1—N tasks / notes / documents / calendar_events`.
- `quotes 1—N quote_items`, `invoices 1—N invoice_items`.
- `quotes 1—1 invoice` (un devis accepté peut générer une facture).
- `email_accounts 1—N emails`.
- `clients 1—N activities` (timeline) — alimentée par triggers + actions IA.

Toutes les FK enfants sont `ON DELETE CASCADE` vers leur parent métier, sauf liens
optionnels (`client_id?` sur une tâche) en `ON DELETE SET NULL`.

---

## 5. Stratégie RLS (Row Level Security)

**Règle d'or : RLS activée sur 100 % des tables, deny-by-default.**

Fonction d'aide (security definer) :

```sql
-- Renvoie true si l'utilisateur courant est membre du workspace donné.
create function public.is_workspace_member(ws uuid) returns boolean ...
```

Policy type appliquée à chaque table métier (lecture + écriture) :

```sql
create policy "members read"   on <table> for select
  using ( public.is_workspace_member(workspace_id) );

create policy "members write"  on <table> for all
  using      ( public.is_workspace_member(workspace_id) )
  with check ( public.is_workspace_member(workspace_id) );
```

Cas particuliers :
- `profiles` : un utilisateur ne lit/modifie que sa propre ligne (`id = auth.uid()`).
- `push_tokens` / `notifications` : filtrées par `user_id = auth.uid()`.
- `workspace_members` : lecture si membre du workspace ; écriture réservée
  `owner`/`admin`.
- Les **Edge Functions** utilisent le `service_role` (bypass RLS) mais re-vérifient
  toujours le `workspace_id` dérivé du JWT appelant — voir `docs/06`.

Détail exhaustif : [`supabase/migrations/0002_rls_policies.sql`](../supabase/migrations/0002_rls_policies.sql).

---

## 6. Triggers & automatisations DB

| Trigger | Sur | Effet |
|---------|-----|-------|
| `handle_new_user` | `auth.users` INSERT | crée `profiles` + `workspace` + `workspace_members(owner)` |
| `set_updated_at` | UPDATE (toutes tables) | met à jour `updated_at` |
| `assign_quote_number` | `quotes` INSERT | numéro séquentiel par workspace (`D-2026-0001`) |
| `assign_invoice_number` | `invoices` INSERT | numéro séquentiel (`F-2026-0001`) |
| `log_client_activity` | `clients`/`projects` change | écrit dans `activities` |
| `touch_client_last_contacted` | `emails`/`calendar_events` | met à jour `clients.last_contacted_at` |

---

## 7. Index (performance)

- FK indexées : `workspace_id` sur toutes les tables, `client_id`, `project_id`.
- `clients` : index sur `(workspace_id, status)`, GIN sur `tags`, trigram sur
  `(first_name, last_name, company)` pour la recherche.
- `tasks` : `(workspace_id, status, due_at)` pour « tâches du jour ».
- `calendar_events` : `(workspace_id, start_at)`.
- `invoices` : `(workspace_id, status, due_date)` pour « factures impayées / en retard ».
- `emails` : `(workspace_id, thread_id)`, `(client_id, received_at)`.

---

## 8. Conventions

- Noms de tables au pluriel, colonnes en `snake_case`.
- Montants en `numeric(12,2)`, devises en `char(3)` ISO 4217.
- Dates « métier » en `date`, horodatages en `timestamptz` (toujours UTC).
- Les types générés (`packages/shared/src/database.types.ts`) sont produits par
  `supabase gen types typescript` — **ne pas éditer à la main**.
