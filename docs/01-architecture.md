# 01 — Architecture (vision CTO)

> Document de référence définissant l'architecture de **Loone AI**, un CRM *Voice First*
> Mobile First. Rédigé avant toute écriture de code, comme socle d'ingénierie.

---

## 1. Principes directeurs

Ces principes tranchent les arbitrages techniques tout au long du projet.

1. **Voice First, pas Voice Only.** La voix est le chemin principal, mais chaque action
   reste réalisable au doigt. L'IA réduit la saisie, elle ne l'interdit pas.
2. **L'IA est un agent, pas un chatbot.** Elle ne se contente pas de répondre : elle
   *exécute* des actions via des *tools* (function calling) avec confirmation.
3. **Le client mobile est « bête », le backend est « intelligent ».** Aucune clé d'API
   tierce, aucune logique IA sensible dans l'app. Tout transite par les Edge Functions.
4. **La base de données est la source de vérité.** Le schéma SQL versionné (migrations)
   pilote tout. Les types TypeScript en sont dérivés.
5. **Sécurité par défaut.** RLS sur 100 % des tables, secrets côté serveur, principe du
   moindre privilège, auditabilité des actions IA.
6. **Latence perçue minimale.** Le pipeline vocal est optimisé pour le *time-to-first-feedback*
   (retour visuel immédiat, optimistic UI, streaming).
7. **Conçu pour le solo, prêt pour l'équipe.** Modèle de données multi-tenant
   (`workspace`) dès le MVP, même si une seule personne l'utilise au départ.

---

## 2. Vue d'ensemble (C4 — niveau Contexte)

```
                       ┌───────────────────────────┐
                       │        Utilisateur         │
                       │ (freelance, agence, artisan)│
                       └─────────────┬─────────────┘
                                     │ parle / tape
                                     ▼
        ┌──────────────────────────────────────────────────────┐
        │                    LOONE AI (système)                  │
        │   App mobile  ──►  Supabase  ──►  Edge Functions (IA)  │
        └──────────────────────────────────────────────────────┘
              │            │            │           │          │
              ▼            ▼            ▼           ▼          ▼
          OpenAI      Anthropic      Resend     Google     Microsoft
        (Whisper)      (Claude)     (emails)  (Cal/Gmail)  (Outlook)
```

---

## 3. Vue Conteneurs (C4 — niveau 2)

| Conteneur | Techno | Responsabilité |
|-----------|--------|----------------|
| **App mobile** | Expo, React Native, TypeScript, Expo Router | UI Apple HIG, capture audio, état local, appels API |
| **Supabase Auth** | GoTrue | Authentification (Apple, Google, email) + JWT |
| **PostgreSQL** | Postgres 15 + RLS | Stockage, intégrité référentielle, isolation tenant |
| **Storage** | Supabase Storage | Documents, pièces jointes, avatars, audio temporaire |
| **Realtime** | Supabase Realtime | Synchronisation live (dashboard, kanban, notifs) |
| **Edge Functions** | Deno + TypeScript | Orchestration IA, intégrations tierces, webhooks |
| **AI Orchestrator** | Edge Function `ai-command` | STT → raisonnement (Claude + tools) → exécution → log |
| **Integrations workers** | Edge Functions | Gmail/Outlook sync, Calendar sync, Resend, push |

### Pourquoi Supabase plutôt qu'un backend Node custom ?

- Auth + DB + Storage + Realtime + Functions dans une seule plateforme → vitesse MVP.
- **RLS Postgres** = sécurité multi-tenant au niveau le plus bas (impossible à contourner
  depuis le client), bien supérieure à des contrôles applicatifs.
- Edge Functions Deno pour la logique custom (IA, intégrations) → on garde le contrôle là
  où il compte, sans gérer une infra serveur complète.
- Portabilité : c'est du Postgres standard, pas de lock-in propriétaire sur les données.

---

## 4. Le pipeline vocal (cœur du produit)

C'est la fonctionnalité différenciante. Détail bout en bout :

```
  [1] L'utilisateur appuie sur le micro central, parle, relâche.
        │  (expo-av / expo-audio enregistre en m4a/aac)
        ▼
  [2] Retour visuel IMMÉDIAT : waveform animée + état "J'écoute…"
        │  (aucune latence réseau perçue à ce stade)
        ▼
  [3] L'audio est envoyé à l'Edge Function `ai-command`
        │  POST multipart (ou base64) + JWT utilisateur
        ▼
  [4] STT — OpenAI Whisper / gpt-4o-transcribe → texte
        │  ex: "Ajoute un client nommé Jean Dupont, mail jean@gmail.com"
        ▼
  [5] RAISONNEMENT — Anthropic Claude (tool use)
        │  Le modèle reçoit : transcript + contexte (date, workspace,
        │  liste de tools). Il choisit create_client{...}.
        ▼
  [6] CONFIRMATION (selon criticité)
        │  - Action sûre/réversible (créer note/tâche)  → exécution directe
        │  - Action sensible (envoyer email, supprimer)  → confirmation requise
        ▼
  [7] EXÉCUTION — la fonction applique le tool sur Postgres
        │  (avec le contexte workspace de l'utilisateur, RLS respectée)
        ▼
  [8] LOG — écriture dans ai_actions (transcript, intent, tools, résultat)
        ▼
  [9] RÉPONSE — carte de confirmation visuelle + (option) TTS
        │  "✅ Client Jean Dupont créé"  + bouton "Annuler"
        ▼
 [10] UNDO — fenêtre d'annulation (soft) pour rassurer l'utilisateur.
```

### Choix : Whisper pour le STT, Claude pour le cerveau

Le brief mentionne OpenAI **et** Anthropic. Répartition retenue (et justifiée) :

- **OpenAI Whisper / `gpt-4o-transcribe`** : meilleur rapport qualité/latence/prix pour la
  transcription multilingue (FR). Robuste sur le bruit et les noms propres.
- **Anthropic Claude** : moteur de raisonnement et d'*agentique* (tool use fiable, bon
  suivi d'instructions complexes, gestion de l'ambiguïté). C'est lui qui décide *quelle*
  action exécuter et avec *quels* paramètres.

Cette séparation est encapsulée derrière une interface `AIProvider` (voir
`docs/06-backend-architecture.md`) : on peut basculer de fournisseur sans toucher au reste.

### Modes d'entrée

| Mode | Flux |
|------|------|
| **Vocal** (principal) | audio → STT → Claude → tools |
| **Texte** (fallback) | texte → Claude → tools (saute l'étape STT) |
| **Streaming** (V2) | STT incrémental + UI qui se remplit en direct |

---

## 5. Modèle de sécurité

### 5.1 Isolation multi-tenant (RLS)

- Chaque table métier porte un `workspace_id`.
- Une fonction `auth.uid()` + table `workspace_members` déterminent l'appartenance.
- **Toutes** les policies vérifient que la ligne appartient à un workspace dont
  l'utilisateur est membre. Voir `docs/02-database-schema.md`.

### 5.2 Secrets & clés

| Secret | Où | Jamais où |
|--------|----|-----------|
| `ANON_KEY` | App mobile (publique, RLS protège) | — |
| `SERVICE_ROLE_KEY` | Edge Functions only | App mobile ❌ |
| `OPENAI/ANTHROPIC/RESEND` | Edge Functions only | App mobile ❌ |
| OAuth tokens Gmail/Outlook/Google | DB chiffrée (pgsodium/Vault) | Client ❌ |

### 5.3 Edge Functions : double contexte

Les fonctions IA utilisent le `service_role` (pour écrire), **mais** dérivent toujours le
`workspace_id` à partir du **JWT de l'utilisateur appelant** (vérifié au début de la
fonction). Une action IA ne peut jamais écrire hors du workspace de l'appelant.

### 5.4 Auditabilité

Toute action de l'IA est journalisée (`ai_actions`) : transcript, intention détectée,
paramètres, tool appelé, résultat, latence, modèle. Indispensable pour le debug, la
confiance utilisateur (historique « qu'a fait l'IA ? ») et la conformité.

---

## 6. Stratégie de données & synchronisation

- **Serveur = source de vérité.** Pas de base locale complexe au MVP.
- **TanStack Query** gère le cache serveur (invalidation, retry, offline read).
- **Supabase Realtime** pousse les changements (dashboard, kanban, notifications).
- **Optimistic UI** sur les mutations rapides (créer tâche, changer statut projet).
- **Offline (V2)** : file d'attente de mutations rejouée à la reconnexion (les commandes
  vocales capturées hors-ligne sont mises en file et traitées au retour réseau).

---

## 7. Observabilité & qualité

| Domaine | Outil/approche |
|---------|----------------|
| Erreurs client | Sentry (Expo) |
| Logs Edge | Supabase Function logs + structuré JSON |
| Métriques IA | Table `ai_actions` (latence, taux de succès, taux de confirmation) |
| Analytics produit | PostHog (events: voice_command, action_executed, action_undone…) |
| Tests | Jest + React Native Testing Library (front) · pgTAP / tests d'intégration (DB/Edge) |
| CI | Lint + typecheck + tests sur chaque PR (GitHub Actions) |

KPIs IA à suivre dès le MVP : **taux de réussite d'intention**, **taux d'annulation
(undo)**, **latence p50/p95 du pipeline vocal**, **% commandes nécessitant confirmation**.

---

## 8. Décisions d'architecture (ADR résumés)

| ADR | Décision | Raison | Alternatives écartées |
|-----|----------|--------|-----------------------|
| 001 | **Monorepo** (apps/packages/supabase) | Types partagés, migrations versionnées | Multi-repos (overhead) |
| 002 | **Expo (managed)** | iOS+Android+OTA, vélocité, EAS Build | RN bare (maintenance native) |
| 003 | **Expo Router** (file-based) | Deep links, conventions, layouts imbriqués | React Navigation manuel |
| 004 | **Supabase** | BaaS complet + RLS Postgres | Firebase (NoSQL, RLS faible), backend custom |
| 005 | **Claude = cerveau, Whisper = STT** | Tool use fiable + STT FR de qualité | Tout-OpenAI / tout-Anthropic |
| 006 | **TanStack Query + Zustand** | Cache serveur robuste + état UI léger | Redux (verbeux), Context seul |
| 007 | **Tools IA typés partagés** | 1 seul contrat client/serveur | Schémas dupliqués (dérive) |
| 008 | **Edge Functions Deno** | Proche DB, sécurisé, TS natif | API Node séparée à héberger |
| 009 | **`workspace` dès le MVP** | Multi-utilisateur sans migration douloureuse | `user_id` direct (refonte V3) |

> Les ADR détaillés vivront dans `docs/adr/` au fil des décisions.

---

## 9. Environnements

| Env | Supabase | App | Usage |
|-----|----------|-----|-------|
| **local** | `supabase start` (Docker) | Expo Go / dev client | dev quotidien |
| **staging** | projet Supabase dédié | EAS build (canal preview) | tests, démos |
| **production** | projet Supabase prod | EAS build (canal prod) + stores | clients |

Promotion : migrations appliquées via `supabase db push` en CI/CD, builds via **EAS** avec
canaux OTA pour les correctifs JS sans repasser par les stores.

---

## 10. Risques & mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Mauvaise interprétation vocale | Action erronée | Confirmation sur actions sensibles + UNDO systématique |
| Latence IA trop élevée | Friction | Feedback immédiat, streaming, cache contexte, modèle rapide |
| Coût tokens IA | Marge | Limiter contexte, cache prompt, quotas par plan, modèle adapté à la tâche |
| Dépendance fournisseur IA | Lock-in | Interface `AIProvider` abstraite, multi-fournisseurs |
| Données sensibles clients | Conformité/RGPD | RLS, chiffrement, hébergement EU, minimisation, droit à l'oubli |
| Fuite de secrets | Critique | Secrets côté Edge only, scan secrets en CI |

---

## 11. Découpage en briques (pour la roadmap)

```
Fondations ──► Auth & Workspace ──► CRUD Clients/Projets/Tâches/Calendrier
     │                                          │
     ▼                                          ▼
Design System ───────────────────────►  🎙️ Micro IA (pipeline vocal + tools MVP)
                                                │
                                                ▼
                              Dashboard ──► Emails ──► Devis/Factures
                                                │
                                                ▼
                          Automatisations IA ──► Notifications ──► Équipes/Prévisions
```

Le détail séquencé est dans [`docs/09-roadmap.md`](09-roadmap.md).
