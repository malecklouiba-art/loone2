# Loone AI — Guide de prévisualisation

## Lancer l'app en 3 commandes

```bash
# 1. Installer les dépendances
pnpm install

# 2. (Optionnel) Préparer Supabase local
cd supabase && npx supabase start && npx supabase db reset && cd ..

# 3. Démarrer Expo
cd apps/mobile && pnpm start
```

Scannez le QR code avec **Expo Go** (iOS/Android). L'app s'ouvre directement.

> Si vous n'avez pas de serveur Supabase local, créez un projet sur supabase.com,
> copiez l'URL + clé anon dans `apps/mobile/.env`, et redémarrez.

---

## Flows à tester

### 1 · Onboarding

```
┌─────────────────────────────┐
│   LOONE                     │
│   Votre CRM vocal           │
│                             │
│   ●  Se connecter           │
│   ○  Créer un compte        │
└─────────────────────────────┘
```

Email : `demo@loone.ai` / Password : `password123` (seed de dev)

---

### 2 · Dashboard

```
┌─────────────────────────────┐
│ Bonjour 👋                  │
├──────────┬──────────────────┤
│  8 400 € │  2 impayés       │
│  CA mois │  3 200 €         │
├──────────┴──────────────────┤
│ 💡 Sophie Martin — relance? │
├─────────────────────────────┤
│ AUJOURD'HUI                 │
│ 14h00  RDV Mariage Julie    │
│ ✓  Envoyer devis Dupont     │
└─────────────────────────────┘
         [◰] [◱] [🎙️] [▤] [⚙]
```

---

### 3 · Micro IA — LE cœur du produit

Appuyer sur **🎙️** (bouton central surélevé) → overlay s'ouvre.

**Mode voix** : parlez, les barres de waveform s'animent en temps réel.

**Mode texte** (preview sans micro) : tapez dans le champ en bas de l'overlay.

#### Commandes de test

| Commande | Tool déclenché | Criticité |
|----------|---------------|-----------|
| `Créé un client Marie Dupont, marie@example.com` | `create_client` | safe → exécuté + undo |
| `Donne-moi mes factures impayées` | `query_records` | read → liste |
| `Planifie un RDV demain à 14h avec Sophie Martin` | `create_calendar_event` | safe |
| `Envoie un email de relance à Jean Dupont` | `send_email` | **sensitive → confirmation** |
| `Quel est mon CA du mois ?` | `get_dashboard_stats` | read |
| `Crée une tâche : rappeler Julie vendredi` | `create_task` | safe |

#### États de l'overlay

```
IDLE / ÉCOUTE          TRAITEMENT          CONFIRMATION
┌───────────┐         ┌───────────┐        ┌───────────────┐
│           │         │           │        │ ✋ Confirmer   │
│   [🎙️]   │  ────►  │ Un        │  ────► │               │
│           │         │ instant…  │        │ send_email    │
│ J'écoute… │         │           │        │ À: jean@...   │
│ ▁▃▅▇▅▃▁  │         │    ⏳     │        │ [Annuler][OK] │
│           │         │           │        └───────────────┘
│ [Ou tapez]│         │           │
└───────────┘         └───────────┘

SUCCÈS                  ERREUR
┌───────────────┐      ┌───────────────┐
│ ✅ C'est fait │      │ Oups          │
│               │      │               │
│ Client créé   │      │ (message)     │
│               │      │               │
│ [Annuler][OK] │      │ [Réessayer]   │
└───────────────┘      └───────────────┘
```

---

### 4 · Clients

```
┌─────────────────────────────┐
│ 🔍 Rechercher…              │
├─────────────────────────────┤
│ SM  Sophie Martin           │
│     studio@sophie.com     › │
├─────────────────────────────┤
│ JD  Jean Dupont             │
│     Dupont SARL           › │
├─────────────────────────────┤
│ JL  Julie Leroy             │
│     julie.leroy@gmail.com › │
└─────────────────────────────┘
```

Tap sur un client → fiche complète avec appel/SMS/email direct.

---

### 5 · Projets

```
LISTE                    KANBAN
┌─────────────────┐     ┌──────┬──────┬──────┬──────┐
│ [Liste] [Kanban]│     │Prosp.│Devis │ En   │ Fait │
├─────────────────┤     ├──────┼──────┼──────┼──────┤
│ Mariage Julie   │     │      │Logo  │Marí. │      │
│ in_progress  ●  │     │      │Dup.  │Julie │      │
├─────────────────┤     │      │      │      │      │
│ Logo Dupont     │     └──────┴──────┴──────┴──────┘
│ quote_sent   ●  │
└─────────────────┘
```

---

## Variables d'environnement nécessaires

Créer `apps/mobile/.env` :

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Créer `supabase/.env` (Edge Functions) :

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
```

---

## Pipeline vocal — bout en bout

```
[Micro]               [apps/mobile]              [supabase/functions]
  │                        │                             │
  ├─ expo-audio record ─►  │                             │
  ├─ amplitude polling ─►  │ waveform bars               │
  ├─ stop() + base64  ─►  sendAICommand()               │
                           │ ──── POST /ai-command ────► │
                           │                    JWT auth │
                           │               workspace_id  │
                           │                  Whisper STT│
                           │               Claude tool   │
                           │               use + exec    │
                           │ ◄──── AICommandResponse ─── │
                     setStatus()                         │
                     (confirming/success/error)          │
```
