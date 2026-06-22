# 04 — Wireframes (écrans clés)

> Wireframes basse fidélité (texte) servant de référence pour le design haute-fidélité et
> l'implémentation. Conventions : `[ ]` bouton, `( )` champ, `›` chevron, `●` actif.

---

## 1. Onboarding & Auth

```
╭──────────────────────────╮      ╭──────────────────────────╮
│                          │      │                          │
│         Loone            │      │      Bienvenue 👋        │
│      ───────────         │      │                          │
│   Votre CRM qui          │      │  [  Continuer avec Apple]│
│   s'utilise à la voix    │      │  [ Continuer avec Google]│
│                          │      │  [ Continuer par email  ]│
│      🎙️                  │      │                          │
│                          │      │  En continuant, vous     │
│   [ Commencer ]          │      │  acceptez les CGU…       │
╰──────────────────────────╯      ╰──────────────────────────╯
   Splash / Value prop              Auth (Apple/Google/email)
```

Onboarding post-auth (3 cartes max) : *« Parlez, l'IA fait le reste »* → permission micro →
permission notifications → 1ère commande guidée (« Essayez : Ajoute un client… »).

---

## 2. Dashboard (onglet 1)

```
╭──────────────────────────────────────╮
│ Bonjour, Maleck            [avatar]   │  ← largeTitle + date
│ Samedi 21 juin                        │
│                                       │
│ ┌──────────┐ ┌──────────┐            │
│ │ CA mois  │ │ Impayés  │            │  ← StatCards (2 col.)
│ │ 12 400 € │ │  3 · 2.1k€│           │
│ └──────────┘ └──────────┘            │
│ ┌──────────┐ ┌──────────┐            │
│ │ Devis    │ │ RDV jour │            │
│ │ 4 attente│ │   2      │            │
│ └──────────┘ └──────────┘            │
│                                       │
│ 🔔 Suggestions IA                  ›  │
│ ┌───────────────────────────────────┐│
│ │ ⚠ Dupont : devis sans réponse 7j  ││  ← insights
│ │   [ Relancer ]                    ││
│ └───────────────────────────────────┘│
│                                       │
│ Tâches du jour                     ›  │
│ ○ Envoyer devis Julie       14:00    │
│ ○ Appeler Sophie                     │
│                                       │
│ Rendez-vous                        ›  │
│ ● 10:00 Sophie Martin – Découverte   │
│                                       │
│ Derniers clients                   ›  │
│ (Jean D.) (Julie L.) (Thomas R.)     │
╰──────────────────────────────────────╯
       [tab bar avec 🎙️ central]
```

Widgets réordonnables (drag) et activables/désactivables dans Réglages.

---

## 3. Clients (onglet 2)

```
╭──────────────────────────────────────╮      ╭──────────────────────────────────────╮
│ Clients                      [+]      │      │ ‹ Clients          [✎] [⋯]            │
│ ( 🔍 Rechercher )                     │      │                                       │
│                                       │      │      (JD)  Jean Dupont                │
│ ● Tous  Actifs  Prospects  Inactifs   │      │            Société Dupont SARL        │
│                                       │      │     [📞]  [✉]  [💬]  [＋projet]       │
│ A                                     │      │                                       │
│ ┌───────────────────────────────────┐│      │ Coordonnées                           │
│ │(AL) Alice Leroy        active    › ││      │  ✉  jean@gmail.com                    │
│ │     Studio Leroy                  ││      │  📞  06 12 34 56 78                    │
│ └───────────────────────────────────┘│      │  📍  12 rue de Paris, Lyon            │
│ D                                     │      │                                       │
│ ┌───────────────────────────────────┐│      │ Tags  (VIP) (mariage)                 │
│ │(JD) Jean Dupont       prospect   › ││      │                                       │
│ │     Société Dupont SARL           ││      │ Projets (2)                        ›  │
│ └───────────────────────────────────┘│      │ Historique                            │
│                                       │      │  • Email envoyé           hier        │
│                                       │      │  • RDV planifié          lun.        │
│                                       │      │  • Note ajoutée (voix)    21/06      │
╰──────────────────────────────────────╯      ╰──────────────────────────────────────╯
   Liste (index alpha + filtres)                  Fiche client (actions + historique)
```

---

## 4. Micro IA (onglet central) — voir aussi `03-design-system.md §7`

```
╭──────────────────────────────────────╮      ╭──────────────────────────────────────╮
│                                       │      │   ✅ C'est fait                       │
│                                       │      │                                       │
│           ⠿⣿⣿⠿⣷⣿⠿⣿⠿                  │      │   J'ai créé le client :              │
│                                       │      │   ┌─────────────────────────────────┐│
│          « J'écoute… »                │      │   │ (JD) Jean Dupont                ││
│                                       │      │   │      jean@gmail.com             ││
│   ┌─────────────────────────────────┐│      │   └─────────────────────────────────┘│
│   │ Ajoute un client nommé Jean     ││ ───► │                                       │
│   │ Dupont avec le mail jean@…      ││      │   [ Voir la fiche ]                   │
│   └─────────────────────────────────┘│      │   [ Annuler ]                         │
│                                       │      │                                       │
│        [ Annuler ]   ● STOP           │      │   « Autre chose ? » 🎙️               │
╰──────────────────────────────────────╯      ╰──────────────────────────────────────╯
   Écoute + transcript live                      Confirmation + Undo
```

Cas « confirmation requise » (email, suppression) :

```
╭──────────────────────────────────────╮
│   ✋ Confirmer l'envoi                 │
│                                       │
│   À : dupont@societe.com              │
│   Objet : Relance — votre devis       │
│   ┌─────────────────────────────────┐ │
│   │ Bonjour M. Dupont,              │ │  ← email généré par l'IA (éditable)
│   │ Je me permets de revenir vers…  │ │
│   └─────────────────────────────────┘ │
│   [ Modifier ]   [ Envoyer ✈ ]        │
╰──────────────────────────────────────╯
```

---

## 5. Projets (onglet 4)

```
╭──────────────────────────────────────╮      ╭──────────────────────────────────────╮
│ Projets                      [+]      │      │ [Liste] [● Kanban] [Calendrier]       │
│ [● Liste] [Kanban] [Calendrier]       │      │                                       │
│                                       │      │ Prospect   Discussion  Devis envoyé   │
│ EN COURS                              │      │ ┌────────┐ ┌────────┐ ┌────────┐      │
│ ┌───────────────────────────────────┐│      │ │Mariage │ │Shooting│ │Logo Co.│      │
│ │ Mariage Julie & Thomas      ●●●   ││      │ │J&T     │ │Studio  │ │Dupont  │      │
│ │ Julie L. · 3 500 € · 12 juil.  ›  ││      │ │3 500 € │ │800 €   │ │1 200 € │      │
│ └───────────────────────────────────┘│      │ └────────┘ └────────┘ └────────┘      │
│ DEVIS ENVOYÉ                          │      │            ┌────────┐                 │
│ ┌───────────────────────────────────┐│      │            │+ glisser│                │
│ │ Logo société Dupont               ││      │            └────────┘                 │
│ │ Dupont SARL · 1 200 € · —      ›  ││      │  (glisser-déposer entre colonnes)     │
│ └───────────────────────────────────┘│      │                                       │
╰──────────────────────────────────────╯      ╰──────────────────────────────────────╯
   Vue Liste (groupée par statut)                Vue Kanban (drag entre statuts)
```

Fiche projet : client associé, statut (pill), budget, échéance, onglets *Tâches /
Documents / Notes / Devis-Factures*.

---

## 6. Tâches & Calendrier

```
╭──────────────────────────────────────╮      ╭──────────────────────────────────────╮
│ Tâches                       [+]      │      │ Juin 2026             [Jour][●Sem][M] │
│ ● À faire  Terminées                  │      │ L  M  M  J  V  S  D                   │
│                                       │      │ 15 16 17 18 19 20 ●21                 │
│ AUJOURD'HUI                           │      │                                       │
│ ○ Envoyer devis Julie    14:00  🔴    │      │ 09 ─────────────────────             │
│ ○ Appeler Sophie                🟠    │      │ 10 ▓ Sophie Martin – Découverte       │
│ DEMAIN                                │      │ 11 ─────────────────────             │
│ ○ Préparer shooting             🟡    │      │ 12                                    │
│ ────                                  │      │ 14 ▓ RDV Julie & Thomas               │
│ ☑ Relancer Dupont (fait)              │      │ 15                                    │
│                                       │      │ 16 ─────────────────────             │
│  « Rappelle-moi d'appeler le          │      │  (sync Google / Apple / Outlook)     │
│    client vendredi à 15h » 🎙️         │      │                                       │
╰──────────────────────────────────────╯      ╰──────────────────────────────────────╯
   Tâches (priorité colorée)                     Calendrier (jour/semaine/mois)
```

---

## 7. Emails (V2)

```
╭──────────────────────────────────────╮      ╭──────────────────────────────────────╮
│ Boîte de réception          [✎]       │      │ ‹ Retour                    [⋯]       │
│ ( 🔍 Rechercher )                     │      │ Relance — votre devis                 │
│                                       │      │ Dupont SARL · à moi · hier            │
│ ● Dupont SARL              hier     ⓘ │      │                                       │
│   Re: votre devis                     │      │ 🤖 Résumé IA                          │
│   Le client demande un délai…         │      │ Le client accepte le devis mais       │
│ ─────────────────────────────────────│      │ demande à décaler au 20 juillet.      │
│   Studio Leroy            lun.        │      │ ─────────────────────────────────────│
│   Facture réglée ✓                    │      │ Bonjour, merci pour votre devis…      │
│ ─────────────────────────────────────│      │                                       │
│   Julie L.               12 juin      │      │ ⚡ Réponses suggérées :               │
│   Question shooting                   │      │ [ Accepter le décalage ]              │
│                                       │      │ [ Proposer une alternative ]          │
│                                       │      │ [ ✍ Rédiger avec l'IA ]               │
╰──────────────────────────────────────╯      ╰──────────────────────────────────────╯
   Inbox (Gmail/Outlook unifiés)                 Email + résumé + réponses IA
```

---

## 8. Réglages (onglet 5)

```
╭──────────────────────────────────────╮
│ Réglages                              │
│                                       │
│ (avatar) Maleck Louiba             ›  │
│          Plan Pro                     │
│ ─────────────────────────────────────│
│ COMPTE                                │
│  Profil                            ›  │
│  Workspace & équipe                ›  │
│  Abonnement                        ›  │
│ INTÉGRATIONS                          │
│  Google Calendar          connecté ›  │
│  Gmail                  non connecté ›│
│  Outlook                non connecté ›│
│ IA & VOIX                             │
│  Langue de la voix          Français ›│
│  Confirmations              Activées ›│
│  Voix de réponse (TTS)         Off  ›│
│ APP                                   │
│  Apparence              Automatique ›│
│  Notifications                     ›  │
│  Confidentialité                   ›  │
│ ─────────────────────────────────────│
│  Se déconnecter                       │
╰──────────────────────────────────────╯
```

---

## 9. Parcours vocaux de référence (à tester en priorité)

| Commande | Tool attendu | Confirmation ? |
|----------|-------------|----------------|
| « Ajoute un client Sophie Martin » | `create_client` | non (réversible) |
| « Crée un RDV mardi 14h avec Sophie » | `create_calendar_event` | non |
| « Rappelle-moi d'appeler le client vendredi 15h » | `create_task` | non |
| « Ajoute un projet mariage pour Julie et Thomas » | `create_project` (+client) | non |
| « Montre-moi les factures impayées » | `query_records` → navigation | n/a (lecture) |
| « Envoie un mail de relance à Dupont » | `draft_email` → `send_email` | **oui** |
| « Archive le client X » | `update_client` (archive) | **oui** |
| « Résume-moi ma journée » | `daily_briefing` | n/a (lecture) |
