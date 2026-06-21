-- =============================================================================
-- Loone AI — Seed de DÉVELOPPEMENT uniquement (jamais en production)
-- Crée un utilisateur démo (demo@loone.ai / password123) + données d'exemple.
-- Exécuté par `supabase db reset` en local.
-- =============================================================================

do $$
declare
  demo_user_id uuid := '00000000-0000-0000-0000-000000000001';
  ws_id        uuid;
  c_sophie     uuid;
  c_jean       uuid;
  c_julie      uuid;
  p_mariage    uuid;
begin
  -- Ne rien faire si l'utilisateur démo existe déjà
  if exists (select 1 from auth.users where id = demo_user_id) then
    raise notice 'Seed: utilisateur démo déjà présent, on saute.';
    return;
  end if;

  -- Utilisateur démo (le trigger handle_new_user crée profil + workspace + membership)
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    demo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo@loone.ai',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maleck Louiba"}'::jsonb,
    now(), now()
  );

  select id into ws_id from public.workspaces where owner_id = demo_user_id limit 1;

  -- Clients
  insert into public.clients (workspace_id, owner_id, first_name, last_name, company, email, phone, status, tags)
  values
    (ws_id, demo_user_id, 'Sophie', 'Martin', 'Studio Martin', 'sophie@studiomartin.fr', '0612345678', 'active', array['VIP']),
    (ws_id, demo_user_id, 'Jean', 'Dupont', 'Dupont SARL', 'jean@dupont.fr', '0698765432', 'lead', array['prospect']),
    (ws_id, demo_user_id, 'Julie', 'Leroy', null, 'julie.leroy@gmail.com', '0600000000', 'active', array['mariage'])
  returning id into c_sophie;  -- (capture le 1er ; les autres via select ci-dessous)

  select id into c_jean  from public.clients where workspace_id = ws_id and last_name = 'Dupont';
  select id into c_julie from public.clients where workspace_id = ws_id and last_name = 'Leroy';

  -- Produits / prestations
  insert into public.products (workspace_id, name, category, unit_price, tax_rate, unit, is_service)
  values
    (ws_id, 'Journée de shooting', 'Photographie', 800, 20, 'jour', true),
    (ws_id, 'Reportage mariage', 'Photographie', 1500, 20, 'forfait', true),
    (ws_id, 'Création de logo', 'Design', 600, 20, 'forfait', true);

  -- Projet
  insert into public.projects (workspace_id, owner_id, client_id, title, status, budget_amount, due_date, description)
  values (ws_id, demo_user_id, c_julie, 'Mariage Julie & Thomas', 'in_progress', 3500, current_date + 30, 'Reportage complet de la journée.')
  returning id into p_mariage;

  insert into public.projects (workspace_id, owner_id, client_id, title, status, budget_amount)
  values (ws_id, demo_user_id, c_jean, 'Logo société Dupont', 'quote_sent', 1200);

  -- Tâches
  insert into public.tasks (workspace_id, owner_id, client_id, project_id, title, status, priority, due_at)
  values
    (ws_id, demo_user_id, c_julie, p_mariage, 'Envoyer le devis à Julie', 'todo', 'high', now() + interval '6 hours'),
    (ws_id, demo_user_id, c_sophie, null, 'Appeler Sophie', 'todo', 'medium', now() + interval '1 day'),
    (ws_id, demo_user_id, c_jean, null, 'Relancer Dupont sur le devis', 'done', 'medium', now() - interval '1 day');

  -- Événement calendrier
  insert into public.calendar_events (workspace_id, owner_id, client_id, title, start_at, end_at)
  values
    (ws_id, demo_user_id, c_sophie, 'Sophie Martin – Découverte', date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '11 hours'),
    (ws_id, demo_user_id, c_julie, 'RDV Julie & Thomas', date_trunc('day', now()) + interval '14 hours', date_trunc('day', now()) + interval '15 hours');

  -- Insight d'exemple (automatisation IA)
  insert into public.insights (workspace_id, type, entity_type, entity_id, severity, title, message)
  values (ws_id, 'quote_no_response', 'client', c_jean, 'warning',
          'Devis sans réponse', 'Le devis envoyé à Dupont SARL est sans réponse depuis 7 jours.');

  raise notice 'Seed terminé pour le workspace %', ws_id;
end $$;
