# 09 — Roadmap (MVP / V2 / V3)

> Séquencement produit & technique. Objectif : prouver la promesse *Voice First* au plus
> vite, puis étendre vers la couverture CRM complète et l'intelligence proactive.

---

## Principe de priorisation

On livre d'abord le **« wow » vocal** sur le périmètre CRM essentiel (clients, projets,
tâches, agenda). Les modules à forte dépendance externe (emails, facturation) viennent
ensuite. L'intelligence proactive et le multi-utilisateur ferment la marche.

---

## 🟢 MVP — « Le CRM qui s'utilise à la voix » (≈ 8–10 semaines)

**But :** un indépendant gère ses clients, projets, tâches et agenda **à la voix**, sur
iOS et Android.

### Fondations (S1–S2)
- [ ] Monorepo, CI (lint/typecheck/test), conventions.
- [ ] Supabase : schéma initial (clients, projects, tasks, calendar_events, notes,
      ai_actions, profiles, workspaces) + RLS + triggers.
- [ ] Auth Apple / Google / email ; création auto profil + workspace.
- [ ] Design system (tokens, primitives UI), navigation + tab bar à micro central.

### CRM cœur (S3–S5)
- [ ] Clients : liste, recherche, fiche, CRUD, actions (appeler/SMS/email natif).
- [ ] Projets : liste + Kanban, statuts, fiche, lien client.
- [ ] Tâches : liste, priorités, échéances, rappels (notifications locales).
- [ ] Calendrier : vue jour/semaine, événements, lien client/projet.
- [ ] Dashboard : tâches du jour, RDV, derniers clients/projets.

### Micro IA — le cœur (S5–S8)
- [ ] Pipeline vocal : enregistrement → STT (Whisper) → Claude (tools).
- [ ] Tools MVP : `create_client`, `create_project`, `create_task`,
      `create_calendar_event`, `create_note`, `find_client`, `query_records`,
      `daily_briefing`.
- [ ] Confirmation des actions sensibles + **Undo**.
- [ ] Overlay vocal (waveform, transcript live), cartes de confirmation, haptics.
- [ ] Journalisation `ai_actions` + écran « historique IA ».
- [ ] Mode texte (fallback clavier).

### Finitions (S8–S10)
- [ ] Notifications push (Expo) : rappels tâches & RDV.
- [ ] Onboarding (permissions micro/notifs + 1ère commande guidée).
- [ ] Polish animations, dark mode, accessibilité, vides (empty states).
- [ ] Builds EAS (TestFlight + Google Play interne), Sentry, analytics.

**Definition of Done MVP :** créer client / projet / tâche / RDV / note **à la voix** avec
confirmation et undo ; consulter dashboard ; recevoir rappels. Latence vocale p95 < 4 s.

---

## 🔵 V2 — « Le CRM qui communique » (≈ +8–10 semaines)

**But :** couvrir l'email, la facturation et les premières automatisations IA.

### Emails
- [ ] OAuth Gmail + Outlook, synchro entrante (`email-sync`).
- [ ] Boîte unifiée : liste, lecture, recherche, archivage.
- [ ] Envoi via Resend / compte connecté (`email-send`).
- [ ] IA email : résumé automatique, réponses suggérées, génération (« relance le
      client »), liaison email ↔ client/projet.
- [ ] Tools : `draft_email`, `send_email`.

### Produits / Devis / Factures
- [ ] Bibliothèque produits/prestations (tarifs, catégories, TVA).
- [ ] Devis : création (voix + manuel), numérotation, statuts, PDF, envoi.
- [ ] Factures : création (depuis devis), statuts, suivi paiement, relances.
- [ ] Dashboard enrichi : CA, devis en attente, factures impayées/en retard.
- [ ] Tools : `create_quote`, `create_invoice`, `send_quote`.

### Automatisations IA
- [ ] `insights-generate` (cron) : relances oubliées, devis sans réponse, clients
      inactifs, RDV manqués, nouveaux prospects.
- [ ] Suggestions sur le dashboard + notifications intelligentes.
- [ ] Assistant conversationnel (`ai-assistant`) : « clients sans relance depuis 30j »,
      « résume ma semaine ».

### Plateforme
- [ ] Synchro calendrier bidirectionnelle (Google/Outlook) + Apple Calendar (device).
- [ ] Widgets dashboard personnalisables (drag, on/off).
- [ ] Abonnements (RevenueCat / Stripe) : Free / Pro / Business.

---

## 🟣 V3 — « Le CRM proactif & collaboratif » (≈ +10–12 semaines)

**But :** intelligence proactive, équipes, et fonctionnalités premium avancées.

### Équipes & multi-utilisateurs
- [ ] Invitations, rôles (owner/admin/member), partage workspace.
- [ ] Attribution de clients/projets/tâches, fils d'activité partagés.
- [ ] RLS étendue (déjà préparée par le modèle `workspace`).

### IA proactive & premium
- [ ] Assistant personnel proactif : résumé quotidien automatique (push matinal),
      préparation des tâches prioritaires.
- [ ] Relances intelligentes automatiques (avec validation).
- [ ] Création automatique de tâches à partir des emails/RDV.
- [ ] **Prévisions de chiffre d'affaires** (pipeline pondéré, tendances).
- [ ] Détection avancée d'opportunités/risques (churn, upsell).

### Écosystème
- [ ] Mode hors-ligne complet (file de mutations + commandes vocales différées).
- [ ] Widgets iOS/Android (écran d'accueil), App Shortcuts / Siri.
- [ ] Marketplace d'intégrations (Stripe, Calendly, WhatsApp, comptabilité…).
- [ ] Export comptable, multi-devises avancé, modèles de documents personnalisés.
- [ ] Version web (lecture/édition desktop) sur la même base Supabase.

---

## Vue synthétique

| Capacité | MVP | V2 | V3 |
|----------|:---:|:--:|:--:|
| Auth + Workspace | ✅ | | |
| Clients / Projets / Tâches / Agenda | ✅ | | |
| Micro IA (créer à la voix) + Undo | ✅ | | |
| Dashboard | ✅ | ➕ | |
| Notifications rappels | ✅ | ➕ | |
| Emails (Gmail/Outlook + IA) | | ✅ | |
| Produits / Devis / Factures | | ✅ | |
| Automatisations & insights | | ✅ | ➕ |
| Assistant conversationnel | | ✅ | ➕ |
| Équipes / multi-utilisateurs | | | ✅ |
| Prévisions CA / IA proactive | | | ✅ |
| Offline complet / Siri / Web | | | ✅ |

---

## Indicateurs de succès (par phase)

- **MVP :** % d'actions créées à la voix vs manuel (cible > 60 %), taux d'undo (< 10 %),
  latence vocale p95, rétention J7.
- **V2 :** emails traités via l'app, devis/factures émis, taux d'ouverture des insights.
- **V3 :** workspaces multi-membres, précision des prévisions CA, NPS.
