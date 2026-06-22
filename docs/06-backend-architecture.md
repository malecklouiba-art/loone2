# 06 — Architecture Backend (Supabase + Edge Functions)

> Backend = Supabase (Auth, Postgres+RLS, Storage, Realtime) + Edge Functions Deno pour
> l'orchestration IA et les intégrations tierces.

---

## 1. Composants

| Composant | Rôle |
|-----------|------|
| **Auth (GoTrue)** | Inscription/connexion Apple, Google, email + JWT |
| **PostgreSQL** | Données + intégrité + **RLS** (sécurité multi-tenant) |
| **Storage** | Documents, pièces jointes, avatars, audio temporaire |
| **Realtime** | Diffusion des changements (dashboard, kanban, notifs) |
| **Edge Functions** | Logique custom : IA, intégrations, webhooks, cron |

---

## 2. Edge Functions (catalogue)

```
supabase/functions/
├── _shared/                  # code commun (cors, auth, clients)
│   ├── cors.ts
│   ├── supabase.ts           # client service-role + helper getCallerWorkspace()
│   ├── ai/
│   │   ├── provider.ts       # interface AIProvider (abstraction)
│   │   ├── anthropic.ts      # implémentation Claude (tool use)
│   │   ├── openai.ts         # Whisper (STT)
│   │   ├── tools.ts          # définition des tools (contrat partagé)
│   │   └── system-prompt.ts  # prompt système (voir doc 08)
│   └── types.ts
├── ai-command/               # ★ cœur : voix/texte → intention → action
│   └── index.ts
├── ai-assistant/             # assistant conversationnel (chat, requêtes lecture)
│   └── index.ts
├── email-send/               # envoi via Resend / Gmail / Outlook
├── email-sync/               # synchro entrante (cron) Gmail / Outlook
├── calendar-sync/            # synchro Google / Outlook (cron + webhook)
├── insights-generate/        # automatisations IA (cron) → table insights
├── push-send/                # envoi notifications Expo
└── oauth-callback/           # callbacks OAuth des intégrations
```

### Pattern commun d'une fonction

```ts
// chaque fonction sécurisée suit ce squelette
serve(async (req) => {
  if (req.method === 'OPTIONS') return cors();
  // 1. Authentifier l'appelant à partir du JWT (anon client + getUser)
  const user = await requireUser(req);
  // 2. Déterminer le workspace de l'appelant (jamais fourni par le client)
  const workspaceId = await getCallerWorkspace(user.id);
  // 3. Logique métier avec le client service-role, MAIS scopée à workspaceId
  // 4. Réponse JSON + CORS
});
```

> **Principe de sécurité clé** : le `workspace_id` est toujours **dérivé du JWT**, jamais
> accepté depuis le corps de la requête. Le `service_role` bypass la RLS, donc le scoping
> applicatif est obligatoire.

---

## 3. Fonction `ai-command` (orchestrateur)

Le cœur du produit. Flux détaillé :

```
POST /functions/v1/ai-command
Body: { input_type: 'voice'|'text', audio?: base64, text?: string,
        client_context?: {...}, confirm_token?: string }

┌─ 1. Auth + workspace (JWT)
├─ 2. Si voice → STT (OpenAI Whisper)  ──────────► transcript
├─ 3. Construire le contexte (date, workspace, hints clients récents)
├─ 4. Appeler AIProvider.run(systemPrompt, transcript, TOOLS)
│       └─ Claude renvoie un (ou plusieurs) tool_use
├─ 5. Pour chaque tool :
│       ├─ classer: sûr (exécution directe) vs sensible (confirmation)
│       ├─ valider les arguments (zod) + résoudre les entités
│       │    (ex: "client Dupont" → recherche fuzzy → client_id)
│       ├─ si ambiguïté/sensible & pas de confirm_token → renvoyer
│       │    { requiresConfirmation, preview } et S'ARRÊTER
│       └─ sinon exécuter (insert/update sur Postgres, scoped workspace)
├─ 6. Journaliser dans ai_actions (transcript, intent, tools, result, latency)
├─ 7. Générer un undo_token (action réversible) si applicable
└─ 8. Répondre { transcript, action, result, requiresConfirmation, undoToken,
                 speech? (texte TTS optionnel) }
```

Endpoints logiques (mêmes fonctions, routées par `action`) :
- `ai-command` (par défaut : analyser + exécuter/peupler la confirmation)
- `ai-command` avec `confirm_token` → exécute l'action en attente
- `ai-command` avec `undo_token` → annule (soft) la dernière action

### Abstraction multi-fournisseur

```ts
// _shared/ai/provider.ts
export interface AIProvider {
  transcribe(audio: Uint8Array, lang: string): Promise<string>;     // STT
  run(opts: { system: string; messages: Msg[]; tools: ToolDef[] }): // raisonnement + tools
    Promise<{ toolCalls: ToolCall[]; text?: string }>;
}
```

Implémentations : `AnthropicProvider` (run/tools) + `OpenAIProvider` (transcribe). On peut
les recombiner ou en ajouter sans toucher à `ai-command`.

---

## 4. Intégrations tierces

| Intégration | Fonction(s) | Notes |
|-------------|-------------|-------|
| **Resend** | `email-send` | envoi emails transac/relances (MVP+) |
| **Gmail** | `oauth-callback`, `email-sync`, `email-send` | OAuth Google, API Gmail |
| **Outlook** | `oauth-callback`, `email-sync`, `email-send` | OAuth Microsoft Graph |
| **Google Calendar** | `oauth-callback`, `calendar-sync` | événements bidirectionnels |
| **Apple Calendar** | (côté app via EventKit) | lecture/écriture locale device |
| **Expo Push** | `push-send` | notifications |

Les credentials OAuth sont stockés **chiffrés** (pgsodium / Supabase Vault) dans
`integrations` / `email_accounts`, jamais renvoyés au client.

---

## 5. Tâches planifiées (cron)

Via `pg_cron` / Supabase Scheduled Functions :

| Job | Fréquence | Effet |
|-----|-----------|-------|
| `insights-generate` | toutes les heures | détecte relances oubliées, devis sans réponse, clients inactifs → `insights` |
| `email-sync` | 5–15 min | tire les nouveaux emails Gmail/Outlook |
| `calendar-sync` | 15 min | synchronise les calendriers |
| `daily-briefing` | chaque matin 7h | prépare le résumé du jour + push |
| `invoice-overdue` | quotidien | passe les factures en `overdue`, crée insight + notif |

---

## 6. Storage (buckets)

| Bucket | Accès | Contenu |
|--------|-------|---------|
| `avatars` | public (lecture), RLS écriture | photos profil |
| `documents` | privé (RLS) | documents projets/clients |
| `voice-temp` | privé, TTL court | audio des commandes (purgé après traitement) |

Policies Storage alignées sur le workspace (chemin `={workspace_id}/...`).

---

## 7. Sécurité backend (récap)

- RLS sur toutes les tables (doc 02). Edge Functions re-scopent par workspace.
- Secrets via variables d'environnement Supabase (`supabase secrets set`).
- Validation systématique des entrées (zod) dans les fonctions.
- Rate limiting par utilisateur sur `ai-command` (anti-abus / coûts).
- Aucun secret ni token tiers renvoyé au client.

---

## 8. Déploiement & migrations

```bash
# Migrations (source de vérité du schéma)
supabase migration new <name>      # crée un fichier horodaté
supabase db reset                  # local: rejoue tout + seed
supabase db push                   # applique sur le projet distant (CI/CD)

# Edge Functions
supabase functions deploy ai-command
supabase secrets set ANTHROPIC_API_KEY=... OPENAI_API_KEY=... RESEND_API_KEY=...

# Types TS (régénérer après chaque migration)
supabase gen types typescript --linked > packages/shared/src/database.types.ts
```

CI : sur chaque PR → lint + typecheck + tests ; sur merge `main` → `db push` (staging) puis
promotion prod.
