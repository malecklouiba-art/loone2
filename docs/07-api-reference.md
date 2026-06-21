# 07 — Référence API (Edge Functions)

> Toutes les routes sont des **Edge Functions Supabase**, base :
> `https://<project>.supabase.co/functions/v1/`. Auth : header
> `Authorization: Bearer <supabase_jwt>` (obligatoire sauf mention contraire).
> Les opérations CRUD simples passent par le **SDK Supabase** directement (protégées par
> RLS) et ne sont pas listées ici — seules les fonctions « intelligentes » le sont.

---

## Conventions

- Réponses JSON. Erreurs : `{ error: { code, message } }` + statut HTTP adéquat.
- `workspace_id` n'est **jamais** dans le body : il est dérivé du JWT.
- Dates en ISO 8601 UTC. Montants en nombre + `currency` ISO 4217.

---

## 1. `POST /ai-command` ★

Cœur du produit : transforme une commande vocale/texte en action.

**Request**
```jsonc
{
  "input_type": "voice",          // "voice" | "text"
  "audio": "<base64 m4a>",         // requis si voice
  "text": "Ajoute un client...",   // requis si text
  "locale": "fr",
  "client_context": {              // optionnel, indices d'UI
    "screen": "clients",
    "selected_client_id": null
  },
  "confirm_token": null,           // pour exécuter une action en attente
  "undo_token": null               // pour annuler une action
}
```

**Response (action exécutée)**
```jsonc
{
  "transcript": "Ajoute un client nommé Jean Dupont avec le mail jean@gmail.com",
  "action": {
    "tool": "create_client",
    "arguments": { "first_name": "Jean", "last_name": "Dupont", "email": "jean@gmail.com" }
  },
  "requires_confirmation": false,
  "result": { "entity": "client", "id": "uuid", "summary": "Client Jean Dupont créé" },
  "undo_token": "uuid",
  "speech": "C'est fait, j'ai créé la fiche de Jean Dupont.",
  "ai_action_id": "uuid"
}
```

**Response (confirmation requise)**
```jsonc
{
  "transcript": "Envoie un mail de relance à Dupont",
  "action": { "tool": "send_email", "arguments": { "to": "dupont@societe.com", "...": "..." } },
  "requires_confirmation": true,
  "preview": {
    "type": "email",
    "to": "dupont@societe.com",
    "subject": "Relance — votre devis",
    "body": "Bonjour M. Dupont, ..."
  },
  "confirm_token": "uuid"          // renvoyer ce token pour exécuter
}
```

**Response (clarification nécessaire)**
```jsonc
{
  "transcript": "Crée un rendez-vous avec Sophie",
  "needs_clarification": true,
  "question": "À quelle date et heure souhaitez-vous ce rendez-vous avec Sophie Martin ?",
  "candidates": [{ "client_id": "uuid", "name": "Sophie Martin" }]
}
```

Codes : `200` ok · `400` entrée invalide · `401` non authentifié · `422` intention non
comprise · `429` quota IA dépassé · `500` erreur fournisseur.

---

## 2. `POST /ai-assistant`

Assistant conversationnel (lecture/analyse) : « Résume-moi ma journée », « Quels clients
sans relance depuis 30 jours ? ».

**Request**
```jsonc
{ "conversation_id": "uuid|null", "message": "Résume-moi ma journée", "locale": "fr" }
```
**Response**
```jsonc
{
  "conversation_id": "uuid",
  "reply": "Aujourd'hui : 2 RDV (10h Sophie, 14h Julie & Thomas), 3 tâches dont 1 urgente...",
  "data": { "appointments": [...], "tasks": [...], "insights": [...] }
}
```

---

## 3. `POST /email-send`

**Request**
```jsonc
{
  "to": ["dupont@societe.com"], "cc": [],
  "subject": "Relance — votre devis",
  "body_html": "<p>Bonjour...</p>",
  "client_id": "uuid|null", "project_id": "uuid|null",
  "provider": "resend"          // "resend" | "gmail" | "outlook"
}
```
**Response** `{ "id": "uuid", "status": "sent", "external_id": "..." }`

---

## 4. `POST /push-send` (interne / admin)

Envoi de notifications Expo. Appelée par les crons/fonctions, pas par l'app.
```jsonc
{ "user_id": "uuid", "title": "...", "body": "...", "data": { "deeplink": "loone://clients/uuid" } }
```

---

## 5. Intégrations OAuth

| Route | Méthode | Rôle |
|-------|---------|------|
| `/oauth-callback?provider=google` | GET | callback OAuth Google (Calendar/Gmail) |
| `/oauth-callback?provider=microsoft` | GET | callback OAuth Microsoft (Outlook) |
| `/calendar-sync` | POST (cron) | synchronise les événements |
| `/email-sync` | POST (cron) | tire les nouveaux emails |
| `/insights-generate` | POST (cron) | génère les suggestions IA |

---

## 6. Données CRUD via SDK Supabase (rappel)

Le client mobile lit/écrit directement (RLS protège) :

```ts
// Exemples
supabase.from('clients').select('*').order('last_name');
supabase.from('clients').insert({ first_name, last_name, email });   // workspace_id via default/trigger
supabase.from('tasks').update({ status: 'done' }).eq('id', id);
supabase.from('projects').select('*, client:clients(*)').eq('status', 'in_progress');

// Realtime
supabase.channel('dashboard')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refetch)
  .subscribe();
```

> Le `workspace_id` est rempli côté DB (valeur par défaut basée sur le membership de
> l'appelant) afin que le client n'ait pas à le gérer. Voir migrations.

---

## 7. Contrat des `tools` IA

La liste complète des tools (noms, paramètres, schémas) est **la même** que celle utilisée
par Claude et est documentée dans [`docs/08-ai-system-prompt.md`](08-ai-system-prompt.md)
et typée dans `packages/shared/src/ai-tools.ts` (source unique de vérité).
