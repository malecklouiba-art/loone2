# 05 — Architecture Frontend (Expo / React Native)

> App `apps/mobile`. Expo (managed) + TypeScript strict + Expo Router.

---

## 1. Stack & librairies

| Domaine | Choix | Raison |
|---------|-------|--------|
| Framework | **Expo SDK 51+** (managed) | iOS+Android+OTA, EAS Build, vélocité |
| Langage | **TypeScript** (strict) | sûreté, types partagés |
| Navigation | **Expo Router** | file-based, deep links, layouts imbriqués |
| Données serveur | **TanStack Query** | cache, retry, invalidation, offline read |
| État UI local | **Zustand** | léger (état du recorder, overlays) |
| Backend SDK | **@supabase/supabase-js** | auth, DB, realtime, storage |
| Audio | **expo-audio** (ou `expo-av`) | enregistrement commandes vocales |
| Animations | **react-native-reanimated** + **gesture-handler** | springs natifs, kanban drag |
| Blur / UI iOS | **expo-blur**, **expo-haptics**, **expo-symbols** | tab bar, haptics, SF Symbols |
| Formulaires | **react-hook-form** + **zod** | validation, types |
| Notifications | **expo-notifications** | push |
| Erreurs | **@sentry/react-native** | monitoring |
| i18n | **i18next** | FR par défaut, extensible |

---

## 2. Structure des dossiers

```
apps/mobile/
├── app/                          # Expo Router (routes = fichiers)
│   ├── _layout.tsx               # Root: providers (Query, Theme, Auth, Supabase)
│   ├── index.tsx                 # Redirige selon état auth
│   ├── (auth)/                   # Pile non authentifiée
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   └── sign-in.tsx
│   ├── (onboarding)/             # 1ère utilisation
│   │   └── ...
│   └── (tabs)/                   # App principale (authentifiée)
│       ├── _layout.tsx           # Tab bar custom (micro central)
│       ├── dashboard.tsx
│       ├── clients/
│       │   ├── index.tsx         # liste
│       │   ├── [id].tsx          # fiche client
│       │   └── new.tsx
│       ├── voice.tsx             # écran/overlay Micro IA
│       ├── projects/
│       │   ├── index.tsx         # liste / kanban / calendrier
│       │   └── [id].tsx
│       └── settings/
│           ├── index.tsx
│           └── integrations.tsx
├── src/
│   ├── theme/                    # tokens design system (voir doc 03)
│   ├── components/
│   │   ├── ui/                   # primitives (Button, Card, ListRow, …)
│   │   ├── voice/                # MicButton, VoiceOverlay, Waveform
│   │   ├── dashboard/            # StatCard, InsightCard, widgets
│   │   ├── clients/              # ClientRow, ClientForm, …
│   │   └── projects/            # ProjectCard, KanbanBoard, …
│   ├── features/                 # logique par domaine (hooks + queries)
│   │   ├── auth/
│   │   ├── clients/              # useClients, useClient, useCreateClient
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── voice/                # useVoiceRecorder, useVoiceCommand
│   │   └── ai/
│   ├── lib/
│   │   ├── supabase.ts           # client Supabase + storage adapter
│   │   ├── queryClient.ts
│   │   ├── api.ts                # wrappers Edge Functions (invoke)
│   │   └── haptics.ts
│   ├── store/                    # stores Zustand (voiceStore, uiStore)
│   ├── hooks/                    # hooks transverses (useTheme, useColorScheme)
│   └── utils/                    # formatters (currency, dates), helpers
├── assets/                       # polices SF Pro, icônes, images
├── app.json                      # config Expo
├── eas.json                      # config builds EAS
├── tsconfig.json
├── babel.config.js
├── package.json
└── .env.example
```

---

## 3. Gestion de l'état — répartition claire

| Type d'état | Outil | Exemples |
|-------------|-------|----------|
| **Serveur** (DB) | TanStack Query | clients, projets, tâches, factures |
| **Realtime** | Supabase Realtime → invalide Query | dashboard live, kanban |
| **UI éphémère** | Zustand | état du recorder, overlay visible, thème override |
| **Form** | react-hook-form | formulaires client/projet |
| **Session** | Context Auth + Supabase | user, workspace courant |

Règle : **pas de duplication**. Une donnée serveur n'est jamais copiée dans Zustand.

---

## 4. Pipeline vocal côté client

```ts
// features/voice/useVoiceCommand.ts (pseudo-flux)
1. start()      → useVoiceRecorder: demande perm, démarre expo-audio, haptic light
2. (live)       → met à jour voiceStore.amplitude pour la waveform
3. stop()       → récupère le fichier audio (m4a), état "processing"
4. send()       → api.invoke('ai-command', { audio, context }) (JWT auto)
5. (réponse)    → { transcript, action, requiresConfirmation, result, undoToken }
6. si confirm   → afficher BottomSheet, attendre validation, re-invoke 'ai-command/confirm'
7. succès       → Toast + haptic success + invalider les queries impactées
8. undo (option)→ api.invoke('ai-command/undo', { undoToken })
```

L'écran `voice.tsx` consomme `voiceStore` (Zustand) pour piloter l'overlay et appelle les
Edge Functions via `lib/api.ts`. Aucune clé IA n'est présente côté client.

---

## 5. Thème & design system

- `ThemeProvider` lit `useColorScheme()` (système) + override Réglages → fournit
  `{ colors, typography, spacing, shadows }`.
- Hook `useTheme()` partout ; pas de couleurs en dur.
- Polices SF Pro chargées via `expo-font` au boot (`assets/fonts/`), fallback Inter Android.

---

## 6. Navigation & deep links

- Schéma : `loone://`. Universal links V2 (`https://app.loone.ai/...`).
- Notifications push ouvrent l'écran cible (ex. `loone://clients/{id}`).
- Le micro est accessible **depuis n'importe quel onglet** (bouton central persistant).

---

## 7. Performance

- `FlashList` (Shopify) pour les longues listes (clients, emails).
- Images via `expo-image` (cache, placeholder).
- Mémoïsation des lignes de liste, `getItemLayout` quand possible.
- Optimistic updates sur mutations rapides (toggle tâche, drag kanban).
- Lazy-load des écrans lourds (kanban, calendrier).

---

## 8. Tests & qualité

- **Jest** + **React Native Testing Library** : composants UI + hooks.
- Tests de `features/*` (logique de transformation, parsing dates vocales).
- **Detox** (E2E) en V2 pour le parcours vocal critique.
- `eslint` + `prettier` + `tsc --noEmit` en pre-commit (husky) et en CI.

---

## 9. État d'avancement du scaffolding

> Cette section reflète ce qui est **présent dans le dépôt** vs. **à implémenter**.

- [x] Arborescence & configuration (`package.json`, `app.json`, `tsconfig`)
- [x] Tokens du design system (`src/theme/`)
- [x] Client Supabase + wrappers API (`src/lib/`)
- [x] Types partagés (depuis `packages/shared`)
- [x] Squelette de navigation (root, auth, tabs + micro central)
- [ ] Primitives UI complètes (en cours)
- [ ] Écrans CRUD complets (Clients/Projets/Tâches)
- [ ] Pipeline vocal branché de bout en bout
- [ ] Emails / Devis / Factures (V2)

Voir [`docs/09-roadmap.md`](09-roadmap.md) pour la séquence.
