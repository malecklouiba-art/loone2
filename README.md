# Loone AI — Voice-First CRM

> Le CRM le plus simple du marché pour les indépendants, freelances, agences et petites entreprises.
> **Principe fondateur : tout peut être fait à la voix.**

Loone AI est un CRM **Mobile First** (iOS + Android natifs via Expo) dont le cœur est un
assistant IA vocal. L'utilisateur appuie sur le bouton micro central, parle, et l'IA
comprend l'intention puis exécute l'action (créer un client, planifier un RDV, rédiger une
relance, etc.).

```
"Ajoute un client nommé Sophie Martin"      → création fiche client
"Crée un rendez-vous mardi à 14h"           → événement calendrier
"Envoie un mail de relance au client Dupont"→ email généré + envoyé
"Montre-moi les factures impayées"          → requête + affichage
```

---

## 🏛️ Architecture en un coup d'œil

```
┌──────────────────────────────────────────────────────────────────┐
│                      APP MOBILE (Expo / RN / TS)                   │
│   Expo Router · Design System Apple HIG · TanStack Query · Zustand │
│              🎙️ Voice pipeline (enregistrement audio)              │
└───────────────────────────────┬──────────────────────────────────┘
                                 │ HTTPS (JWT Supabase)
                ┌────────────────┴─────────────────┐
                │        SUPABASE (BaaS)            │
                │  Auth · Postgres+RLS · Storage    │
                │  Realtime · Edge Functions (Deno) │
                └────────────────┬─────────────────┘
                                 │  orchestration IA & intégrations
        ┌──────────────┬─────────┴────────┬──────────────┬───────────┐
     OpenAI         Anthropic           Resend         Google      Microsoft
   (Whisper STT)  (Claude — cerveau)   (emails)     (Cal/Gmail)    (Outlook)
```

- **STT (transcription)** : OpenAI Whisper / `gpt-4o-transcribe`.
- **Cerveau / agent** : Anthropic **Claude** avec *tool use* (function calling) — choisit et
  exécute les actions.
- **Toute la logique IA et toutes les clés API vivent dans les Edge Functions**, jamais dans
  l'app mobile.

> Détails complets & justification des choix : [`docs/01-architecture.md`](docs/01-architecture.md).

---

## 📦 Structure du monorepo

```
loone2/
├── apps/
│   └── mobile/          # Application Expo (React Native + TypeScript, Expo Router)
├── packages/
│   └── shared/          # Types & contrats partagés app ↔ edge functions
├── supabase/
│   ├── migrations/      # Schéma SQL, RLS, triggers, seed (source de vérité DB)
│   └── functions/       # Edge Functions Deno (orchestration IA + intégrations)
├── docs/                # Architecture, design system, API, roadmaps, prompt IA
└── README.md
```

Pourquoi un **monorepo** : un seul dépôt, des types TypeScript partagés entre le client et le
backend (le contrat des *tools* IA est utilisé des deux côtés), des migrations versionnées à
côté du code qui les consomme.

---

## 📚 Documentation (livrables)

| # | Document | Contenu |
|---|----------|---------|
| 1 | [`docs/01-architecture.md`](docs/01-architecture.md) | Architecture système, pipeline vocal, sécurité, ADR |
| 2 | [`docs/02-database-schema.md`](docs/02-database-schema.md) | Modèle de données, ERD, relations, RLS |
| 3 | [`docs/03-design-system.md`](docs/03-design-system.md) | Couleurs, typo SF Pro, espacements, composants (Apple HIG) |
| 4 | [`docs/04-wireframes.md`](docs/04-wireframes.md) | Wireframes texte des écrans clés |
| 5 | [`docs/05-frontend-architecture.md`](docs/05-frontend-architecture.md) | Structure front, navigation, state, pipeline vocal |
| 6 | [`docs/06-backend-architecture.md`](docs/06-backend-architecture.md) | Supabase, Edge Functions, intégrations |
| 7 | [`docs/07-api-reference.md`](docs/07-api-reference.md) | Contrats des endpoints (Edge Functions) |
| 8 | [`docs/08-ai-system-prompt.md`](docs/08-ai-system-prompt.md) | Prompt système + définition des *tools* IA |
| 9 | [`docs/09-roadmap.md`](docs/09-roadmap.md) | Roadmaps MVP / V2 / V3 |

---

## 🚀 Démarrage rapide (dev)

> ⚠️ Le projet est en cours de scaffolding. Voir `docs/05-frontend-architecture.md` et
> `docs/06-backend-architecture.md` pour l'état d'avancement détaillé.

```bash
# 1. Pré-requis : Node 20+, pnpm, Expo CLI, Supabase CLI, Docker (pour Supabase local)

# 2. Backend local
supabase start                 # lance Postgres + Auth + Storage + Edge runtime
supabase db reset              # applique toutes les migrations + seed

# 3. App mobile
cd apps/mobile
cp .env.example .env           # renseigner les clés (voir ci-dessous)
pnpm install
pnpm start                     # Expo Dev Server (iOS / Android / Expo Go)
```

### Variables d'environnement

| Côté | Variable | Description |
|------|----------|-------------|
| Mobile | `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| Mobile | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (publique) |
| Edge | `OPENAI_API_KEY` | Whisper (STT) |
| Edge | `ANTHROPIC_API_KEY` | Claude (cerveau de l'agent) |
| Edge | `RESEND_API_KEY` | Envoi d'emails |
| Edge | `SUPABASE_SERVICE_ROLE_KEY` | Accès DB côté serveur (jamais exposé au client) |

> Les clés des fournisseurs IA / email ne sont **jamais** embarquées dans l'app mobile.

---

## 🗺️ Roadmap résumée

- **MVP (8–10 sem.)** : Auth, Clients, Projets, Tâches, Calendrier, **Micro IA** (créer
  client / RDV / tâche / note à la voix), Dashboard.
- **V2** : Emails (Gmail/Outlook + IA), Produits/Devis/Factures, Automatisations IA,
  notifications intelligentes.
- **V3** : Équipes/multi-utilisateurs, prévisions de CA, assistant proactif, marketplace
  d'intégrations.

Détail : [`docs/09-roadmap.md`](docs/09-roadmap.md).

---

## 🔐 Sécurité (principes)

- **RLS Postgres activée sur 100 % des tables** — isolation stricte par workspace.
- Secrets uniquement côté Edge Functions (service role + clés IA).
- OAuth Apple & Google pour l'auth ; tokens des intégrations chiffrés au repos.
- Journalisation de toute action IA dans `ai_actions` (auditabilité).

---

_Stack : React Native · Expo · TypeScript · Supabase · PostgreSQL · OpenAI · Anthropic · Resend · Expo Notifications._
