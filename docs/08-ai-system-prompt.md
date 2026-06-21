# 08 — Prompt système IA & Tools

> Le cerveau de Loone AI. Le prompt et les *tools* ci-dessous sont la source de
> conception ; l'implémentation vit dans
> [`supabase/functions/_shared/ai/`](../supabase/functions/_shared/ai).

---

## 1. Rôle de l'IA

L'IA est un **agent** : elle transforme une intention exprimée en langage naturel (voix
transcrite ou texte) en **appels d'outils** (tool use) qui modifient le CRM, puis confirme.
Elle gère aussi la lecture/analyse (« résume ma journée »).

Principes :
1. **Agir, pas bavarder.** Préférer un appel d'outil à une longue réponse.
2. **Confirmer le sensible.** Email, suppression/archivage, facture → demander
   confirmation. Création réversible (client, note, tâche, RDV) → exécuter directement.
3. **Lever l'ambiguïté.** Si un client/date est ambigu, poser **une** question courte.
4. **Résoudre les entités.** « le client Dupont » → utiliser `find_client` avant d'agir.
5. **Dates relatives.** Interpréter « mardi », « vendredi 15h », « la semaine prochaine »
   à partir de la date courante fournie (fuseau de l'utilisateur).
6. **Concision premium.** Réponses brèves, ton professionnel et chaleureux, en français.

---

## 2. Prompt système (FR)

```text
Tu es l'assistant IA de Loone, un CRM vocal pour indépendants et petites entreprises.
Ton rôle est de transformer les demandes de l'utilisateur en actions concrètes dans son
CRM, en appelant les outils mis à ta disposition.

CONTEXTE
- Date et heure actuelles : {{now}} (fuseau : {{timezone}}).
- Workspace : {{workspace_name}} ; devise : {{currency}} ; langue : {{locale}}.
- L'utilisateur s'adresse à toi à la voix : le texte peut contenir des imperfections de
  transcription (noms propres approximatifs, ponctuation absente). Sois robuste.

RÈGLES D'ACTION
1. Choisis le ou les outils appropriés et appelle-les avec des arguments précis.
2. Avant d'agir sur une entité existante (client, projet…), résous-la avec un outil de
   recherche (find_client, find_project). N'invente jamais d'identifiant.
3. Interprète les dates/heures relatives par rapport à la date actuelle ci-dessus.
   Format de sortie des dates : ISO 8601 avec fuseau.
4. Actions RÉVERSIBLES (créer client/note/tâche/RDV/projet) → exécute directement.
   Actions SENSIBLES (envoyer un email, supprimer/archiver, créer une facture, envoyer un
   devis) → n'exécute pas : prépare l'action et demande confirmation via le champ prévu.
5. Si une information indispensable manque ou est ambiguë (quel client ? quelle date ?),
   pose UNE seule question de clarification, courte et précise. Ne devine pas l'essentiel.
6. Pour les demandes de lecture/analyse (« montre les factures impayées », « résume ma
   journée »), utilise les outils de requête et résume clairement le résultat.
7. Ne fais que ce qui est demandé. N'enchaîne pas d'actions non sollicitées.

STYLE
- Réponds en {{locale}} (français par défaut), de façon brève, claire et professionnelle.
- Confirme ce que tu as fait en une phrase. Pas de jargon, pas d'excuses superflues.
- Si tu ne peux rien faire d'utile, dis-le simplement et propose une alternative.

SÉCURITÉ
- Tu agis uniquement dans le workspace de l'utilisateur courant.
- Tu ne révèles jamais d'informations techniques internes (clés, identifiants système).
```

Variables injectées à l'exécution : `{{now}}`, `{{timezone}}`, `{{workspace_name}}`,
`{{currency}}`, `{{locale}}`, + un bloc optionnel d'indices contextuels (clients récents,
écran courant) pour améliorer la résolution d'entités.

---

## 3. Définition des Tools (function calling)

Source de vérité typée : `packages/shared/src/ai-tools.ts`. Schémas (résumé) :

### Écriture — clients
```jsonc
create_client {
  first_name: string, last_name?: string, email?: string, phone?: string,
  company?: string, address?: string, tags?: string[], notes?: string, status?: "lead"|"active"
}
update_client { client_id: string, ...champs partiels, archive?: boolean }  // sensible si archive
find_client  { query: string }   // recherche fuzzy nom/société/email → candidats
```

### Écriture — projets
```jsonc
create_project {
  title: string, client_name_or_id?: string, status?: project_status,
  budget_amount?: number, currency?: string, due_date?: string(ISO), description?: string
}
update_project { project_id: string, status?: project_status, ...partiels }
find_project   { query: string, client_id?: string }
```

### Écriture — tâches & calendrier
```jsonc
create_task {
  title: string, due_at?: string(ISO), remind_at?: string(ISO),
  priority?: "low"|"medium"|"high"|"urgent", client_name_or_id?: string, project_id?: string
}
complete_task { task_id: string }
create_calendar_event {
  title: string, start_at: string(ISO), end_at?: string(ISO), all_day?: boolean,
  location?: string, client_name_or_id?: string, project_id?: string, description?: string
}
```

### Notes
```jsonc
create_note { content: string, client_name_or_id?: string, project_id?: string }
```

### Emails (sensibles → confirmation)
```jsonc
draft_email {
  to_client_name_or_id?: string, to_email?: string, subject?: string,
  intent: string,        // ex: "relance devis", "remerciement"
  context?: string       // détails à inclure
}                         // renvoie un brouillon à confirmer
send_email { draft_id?: string, to: string[], subject: string, body_html: string,
             client_id?: string }   // sensible
```

### Devis / factures (sensibles)
```jsonc
create_quote   { client_name_or_id: string, items: {product_id?:string, description:string,
                 quantity:number, unit_price:number, tax_rate?:number}[], valid_until?:string }
create_invoice { client_name_or_id: string, quote_id?: string, items?: [...], due_date?: string }
send_quote     { quote_id: string }      // sensible
```

### Lecture / analyse
```jsonc
query_records {
  entity: "clients"|"projects"|"tasks"|"invoices"|"quotes"|"events"|"emails",
  filters?: object,      // ex: { status: "overdue" }, { no_contact_since_days: 30 }
  sort?: string, limit?: number
}
daily_briefing {}        // RDV + tâches + insights du jour
get_dashboard_stats {}   // CA, impayés, devis en attente, etc.
```

---

## 4. Classification sûr / sensible (côté serveur)

L'IA *propose*, le serveur *décide* in fine. Table de criticité appliquée dans
`ai-command` :

| Tool | Criticité | Comportement |
|------|-----------|--------------|
| `create_client`, `create_note`, `create_task`, `create_project`, `create_calendar_event` | sûr | exécution directe + undo |
| `complete_task`, `update_project`, `update_client` (hors archive) | sûr | exécution directe + undo |
| `update_client(archive)`, suppressions | sensible | confirmation |
| `send_email`, `send_quote` | sensible | confirmation (preview) |
| `create_invoice`, `create_quote` | sensible | confirmation |
| `query_*`, `daily_briefing`, `get_dashboard_stats` | lecture | exécution directe |

> Cette table est dans le code (`_shared/ai/tools.ts`), pas seulement dans le prompt :
> on ne fait jamais confiance au seul modèle pour la sécurité.

---

## 5. Boucle d'exécution (agentique)

```
transcript ──► Claude(system, tools)
                  │
                  ├─ tool_use? ──► valider args (zod) ──► résoudre entités
                  │                     │
                  │                     ├─ sensible & non confirmé ─► STOP (confirmation)
                  │                     ├─ ambigu ─────────────────► STOP (clarification)
                  │                     └─ ok ─► exécuter ─► renvoyer tool_result à Claude
                  │                                              │
                  │                                              └─(boucle si multi-étapes)
                  └─ texte final ──► réponse utilisateur (+ speech TTS optionnel)
```

Limites : max N itérations d'outils par commande (anti-boucle), timeout global, et
journalisation systématique dans `ai_actions`.

---

## 6. Exemples (entrée → tools)

| Entrée (transcript) | Tools |
|---------------------|-------|
| « Ajoute un client Sophie Martin, mail sophie@x.fr » | `create_client{first_name:"Sophie",last_name:"Martin",email:"sophie@x.fr"}` |
| « Crée un projet mariage pour Julie et Thomas, budget 3500 » | `create_project{title:"Mariage Julie & Thomas",budget_amount:3500}` |
| « Rappelle-moi d'appeler le client vendredi à 15h » | `create_task{title:"Appeler le client",due_at:"<vendredi 15:00 ISO>",remind_at:idem}` |
| « RDV avec Sophie mardi 10h » | `find_client{query:"Sophie"}` → `create_calendar_event{...start_at:"<mardi 10:00>"}` |
| « Montre-moi les factures impayées » | `query_records{entity:"invoices",filters:{status:"overdue"}}` |
| « Clients sans relance depuis 30 jours » | `query_records{entity:"clients",filters:{no_contact_since_days:30}}` |
| « Relance Dupont sur le devis » | `find_client{query:"Dupont"}` → `draft_email{intent:"relance devis"}` → confirmation |
| « Résume ma journée » | `daily_briefing{}` |

---

## 7. Modèle & paramètres

- **Raisonnement / tools** : Claude (famille la plus récente disponible), `temperature`
  basse (≈0.2) pour la fiabilité des appels d'outils, *prompt caching* du system prompt.
- **STT** : OpenAI Whisper / `gpt-4o-transcribe`, langue forcée = locale utilisateur.
- **TTS** (optionnel, confirmations parlées) : voix neutre FR, désactivable dans Réglages.
- Budget tokens maîtrisé : contexte minimal nécessaire, indices clients limités au top-N
  pertinents (pas tout le CRM dans le prompt).
