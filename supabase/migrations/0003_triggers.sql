-- =============================================================================
-- Loone AI — 0003 Triggers & automatisations DB
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Nouvel utilisateur : crée profil + workspace + membership (owner)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, display_name, new.raw_user_meta_data->>'avatar_url');

  insert into public.workspaces (owner_id, name)
  values (new.id, 'Mon espace')
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- updated_at automatique sur les tables concernées
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  tables_with_updated_at text[] := array[
    'profiles', 'workspaces', 'clients', 'projects', 'products', 'tasks',
    'calendar_events', 'notes', 'quotes', 'invoices', 'ai_conversations', 'integrations'
  ];
begin
  foreach t in array tables_with_updated_at loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Numérotation séquentielle des devis & factures (par workspace & année)
-- ----------------------------------------------------------------------------
create or replace function public.assign_quote_number()
returns trigger
language plpgsql
as $$
declare
  yr text := to_char(coalesce(new.issue_date, current_date), 'YYYY');
  seq int;
begin
  if new.number is not null then
    return new;
  end if;
  select count(*) + 1 into seq
  from public.quotes
  where workspace_id = new.workspace_id
    and to_char(issue_date, 'YYYY') = yr;
  new.number := 'D-' || yr || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$;

create trigger assign_quote_number
  before insert on public.quotes
  for each row execute function public.assign_quote_number();

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
as $$
declare
  yr text := to_char(coalesce(new.issue_date, current_date), 'YYYY');
  seq int;
begin
  if new.number is not null then
    return new;
  end if;
  select count(*) + 1 into seq
  from public.invoices
  where workspace_id = new.workspace_id
    and to_char(issue_date, 'YYYY') = yr;
  new.number := 'F-' || yr || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$;

create trigger assign_invoice_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

-- ----------------------------------------------------------------------------
-- Historique (timeline) : log des changements de statut projet
-- ----------------------------------------------------------------------------
create or replace function public.log_project_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.activities (workspace_id, owner_id, client_id, project_id, type, title, metadata)
    values (
      new.workspace_id, new.owner_id, new.client_id, new.id, 'status_change',
      'Statut projet : ' || old.status || ' → ' || new.status,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger log_project_status_change
  after update on public.projects
  for each row execute function public.log_project_status_change();

-- ----------------------------------------------------------------------------
-- Met à jour clients.last_contacted_at quand un email/RDV est lié à un client
-- ----------------------------------------------------------------------------
create or replace function public.touch_client_last_contacted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is not null then
    update public.clients
    set last_contacted_at = greatest(coalesce(last_contacted_at, 'epoch'::timestamptz), now())
    where id = new.client_id;
  end if;
  return new;
end;
$$;

create trigger touch_client_on_email
  after insert on public.emails
  for each row execute function public.touch_client_last_contacted();

create trigger touch_client_on_event
  after insert on public.calendar_events
  for each row execute function public.touch_client_last_contacted();
