-- =============================================================================
-- Loone AI — 0002 Row Level Security
-- RLS activée sur 100 % des tables, deny-by-default.
-- Isolation par workspace via public.is_workspace_member().
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Activation RLS sur toutes les tables
-- ----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.clients            enable row level security;
alter table public.projects           enable row level security;
alter table public.products           enable row level security;
alter table public.tasks              enable row level security;
alter table public.calendar_events    enable row level security;
alter table public.notes              enable row level security;
alter table public.activities         enable row level security;
alter table public.documents          enable row level security;
alter table public.quotes             enable row level security;
alter table public.quote_items        enable row level security;
alter table public.invoices           enable row level security;
alter table public.invoice_items      enable row level security;
alter table public.email_accounts     enable row level security;
alter table public.emails             enable row level security;
alter table public.ai_actions         enable row level security;
alter table public.ai_conversations   enable row level security;
alter table public.ai_messages        enable row level security;
alter table public.insights           enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.integrations       enable row level security;

-- ----------------------------------------------------------------------------
-- profiles : chacun ne voit/modifie que sa propre ligne
-- ----------------------------------------------------------------------------
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- workspaces : membres en lecture ; owner en écriture
-- ----------------------------------------------------------------------------
create policy "workspaces member select" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces owner update" on public.workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "workspaces owner insert" on public.workspaces
  for insert with check (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workspace_members : membres en lecture ; owner/admin en écriture
-- ----------------------------------------------------------------------------
create policy "members select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "members manage" on public.workspace_members
  for all
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_members.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_members.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- Tables métier scopées par workspace : policy générique read + write
-- (un seul pattern, appliqué à chaque table)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  business_tables text[] := array[
    'clients', 'projects', 'products', 'tasks', 'calendar_events', 'notes',
    'activities', 'documents', 'quotes', 'invoices', 'email_accounts', 'emails',
    'ai_actions', 'ai_conversations', 'insights', 'integrations'
  ];
begin
  foreach t in array business_tables loop
    execute format(
      'create policy %I on public.%I for select using (public.is_workspace_member(workspace_id));',
      t || '_member_select', t
    );
    execute format(
      'create policy %I on public.%I for all
         using (public.is_workspace_member(workspace_id))
         with check (public.is_workspace_member(workspace_id));',
      t || '_member_write', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Tables enfants (scope hérité du parent)
-- ----------------------------------------------------------------------------

-- quote_items : via quote -> workspace
create policy "quote_items member" on public.quote_items
  for all
  using (
    exists (select 1 from public.quotes q
            where q.id = quote_items.quote_id and public.is_workspace_member(q.workspace_id))
  )
  with check (
    exists (select 1 from public.quotes q
            where q.id = quote_items.quote_id and public.is_workspace_member(q.workspace_id))
  );

-- invoice_items : via invoice -> workspace
create policy "invoice_items member" on public.invoice_items
  for all
  using (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and public.is_workspace_member(i.workspace_id))
  )
  with check (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and public.is_workspace_member(i.workspace_id))
  );

-- ai_messages : via conversation -> workspace
create policy "ai_messages member" on public.ai_messages
  for all
  using (
    exists (select 1 from public.ai_conversations c
            where c.id = ai_messages.conversation_id and public.is_workspace_member(c.workspace_id))
  )
  with check (
    exists (select 1 from public.ai_conversations c
            where c.id = ai_messages.conversation_id and public.is_workspace_member(c.workspace_id))
  );

-- ----------------------------------------------------------------------------
-- Tables scopées par user (notifications, push_tokens)
-- ----------------------------------------------------------------------------
create policy "notifications own" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push_tokens own" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
