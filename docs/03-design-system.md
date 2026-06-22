# 03 — Design System « Loone »

> Inspiration : Apple Mail, Calendar, Notes, Reminders. Objectif : minimaliste, premium,
> épuré, rapide. Les *tokens* ci-dessous sont implémentés dans
> [`apps/mobile/src/theme/`](../apps/mobile/src/theme).

---

## 1. Philosophie

1. **Le contenu d'abord.** Beaucoup de blanc, peu de chrome. L'UI s'efface.
2. **Une action principale par écran**, toujours évidente. Sur l'app entière : le **micro**.
3. **Profondeur par la subtilité.** Ombres douces, séparateurs fins, hiérarchie par la
   taille/poids de typo plutôt que par des bordures.
4. **Mouvement avec sens.** Animations natives (spring iOS), jamais décoratives gratuites.
5. **Accessibilité native.** Dynamic Type, contrastes AA, VoiceOver, zones tactiles ≥ 44pt.

---

## 2. Couleurs

Palette Apple : blanc, noir, gris Apple, bleu Apple. Support **light & dark** dès le départ.

### Tokens sémantiques (light)

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FFFFFF` | fond principal |
| `backgroundSecondary` | `#F2F2F7` | fond groupé (listes iOS) |
| `backgroundTertiary` | `#FFFFFF` | cartes sur fond gris |
| `label` | `#000000` | texte principal |
| `labelSecondary` | `#3C3C43` @ 60% | sous-titres |
| `labelTertiary` | `#3C3C43` @ 30% | placeholder |
| `separator` | `#3C3C43` @ 29% | séparateurs fins |
| `fill` | `#787880` @ 20% | champs, chips |
| `tint` / `primary` | `#007AFF` | **bleu Apple** — actions, liens |
| `success` | `#34C759` | vert (payé, confirmé) |
| `warning` | `#FF9500` | orange (en attente, échéance) |
| `danger` | `#FF3B30` | rouge (impayé, suppression) |

### Tokens sémantiques (dark)

| Token | Hex |
|-------|-----|
| `background` | `#000000` |
| `backgroundSecondary` | `#1C1C1E` |
| `backgroundTertiary` | `#2C2C2E` |
| `label` | `#FFFFFF` |
| `labelSecondary` | `#EBEBF5` @ 60% |
| `separator` | `#545458` @ 65% |
| `tint` / `primary` | `#0A84FF` |
| `success` | `#30D158` · `warning` `#FF9F0A` · `danger` `#FF453B` |

> On utilise les **System Colors** d'Apple pour une parfaite intégration iOS et un
> équivalent cohérent sur Android (Material You en surcouche minimale).

---

## 3. Typographie

**SF Pro Display** (titres) + **SF Pro Text** (corps). Sur Android, fallback **Inter**
(métriques proches) ou la police système. Échelle alignée sur iOS *Text Styles*.

| Style | Police | Taille / Line | Poids | Usage |
|-------|--------|---------------|-------|-------|
| `largeTitle` | Display | 34 / 41 | Bold | titres d'écran (Dashboard) |
| `title1` | Display | 28 / 34 | Bold | sections |
| `title2` | Display | 22 / 28 | Bold | sous-sections |
| `title3` | Display | 20 / 25 | Semibold | en-têtes de carte |
| `headline` | Text | 17 / 22 | Semibold | titre de ligne (nom client) |
| `body` | Text | 17 / 22 | Regular | corps |
| `callout` | Text | 16 / 21 | Regular | secondaire |
| `subhead` | Text | 15 / 20 | Regular | métadonnées |
| `footnote` | Text | 13 / 18 | Regular | légendes |
| `caption1` | Text | 12 / 16 | Regular | tags, timestamps |
| `caption2` | Text | 11 / 13 | Regular | micro-labels |

Règles : **Dynamic Type** supporté (l'utilisateur peut agrandir). Jamais plus de 2 poids
par écran. Chiffres tabulaires pour les montants (alignement des colonnes).

---

## 4. Espacement & rayons

Échelle base **4 pt** (`spacing.xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32`).

| Token | Valeur |
|-------|--------|
| Marge écran (horizontale) | 16 / 20 pt |
| Espace entre cartes | 12 pt |
| Padding interne carte | 16 pt |
| Rayon carte | 12 pt |
| Rayon bouton | 12 pt (ou *pill* 999) |
| Rayon champ | 10 pt |
| Hauteur ligne de liste | 44–60 pt |
| Cible tactile min | 44 × 44 pt |

Ombres (light) : `shadow.card = { y:1, blur:3, opacity:0.08 }`,
`shadow.float = { y:8, blur:24, opacity:0.12 }` (FAB micro, modales).

---

## 5. Composants (catalogue)

Composants de base à implémenter dans `apps/mobile/src/components/ui/` :

| Composant | Description | Réf. Apple |
|-----------|-------------|------------|
| `Screen` | conteneur safe-area + scroll + large title | tous |
| `Card` | surface arrondie + ombre douce | Notes |
| `ListRow` | ligne titre/sous-titre/accessoire (chevron, switch) | Réglages |
| `SectionList` | listes groupées « inset grouped » | Réglages |
| `Button` | variants `primary`/`secondary`/`plain`/`destructive` | partout |
| `IconButton` | bouton icône circulaire | Mail |
| `TextField` | champ texte avec label flottant | Formulaires |
| `Chip` / `Tag` | pastilles (tags clients, statuts) | Rappels |
| `Avatar` | initiales ou photo, cercle | Contacts |
| `StatCard` | KPI (CA, impayés…) pour le dashboard | — |
| `Badge` | compteur (notifs, impayés) | partout |
| `StatusPill` | statut coloré (projet, facture) | Rappels |
| `SegmentedControl` | switch Liste / Kanban / Calendrier | Calendrier |
| `BottomSheet` | feuille modale (confirmations IA) | partout |
| `Toast` | confirmation éphémère + bouton Undo | — |
| `EmptyState` | illustration + CTA quand vide | partout |
| `MicButton` | **le** bouton central (voir §7) | — |
| `VoiceOverlay` | overlay plein écran d'écoute/traitement | — |

---

## 6. Navigation — Tab Bar

Bottom tab bar flottante, fond *blur* (`BlurView`), 5 entrées. Le **micro est central,
surélevé, plus grand** (le bouton le plus visible de l'app).

```
┌────────────────────────────────────────────────────────┐
│                                                          │
│                  (contenu de l'écran)                    │
│                                                          │
├────────────────────────────────────────────────────────┤
│   ◱           ◰            ◉            ▤          ⚙      │
│ Dashboard  Clients     ┌─────┐      Projets    Réglages  │
│                        │  🎙️ │  ← surélevé, bleu Apple   │
│                        └─────┘     ombre flottante       │
└────────────────────────────────────────────────────────┘
```

- Icônes : **SF Symbols** (iOS) / équivalents (Android).
- État actif : icône + label en `tint`. Inactif : `labelSecondary`.
- Le micro dépasse la barre (~28 pt au-dessus), diamètre 64 pt, dégradé bleu, halo animé.

---

## 7. Le `MicButton` & le `VoiceOverlay` (signature produit)

États du bouton micro :

| État | Visuel | Animation |
|------|--------|-----------|
| `idle` | cercle bleu, icône micro blanche | léger pulse de respiration |
| `listening` | halo qui pulse, waveform | waveform réactive au volume |
| `processing` | spinner / points | rotation douce |
| `success` | check vert | morph + haptic succès |
| `error` | shake rouge | haptic erreur |

`VoiceOverlay` (au tap sur le micro) :

```
        ╭───────────────────────────────╮
        │                               │
        │        ⠿⣿⣿⠿⣷⣿⠿⣿⠿            │  ← waveform live
        │                               │
        │        « J'écoute… »          │
        │                               │
        │   ┌───────────────────────┐   │  ← transcript en direct
        │   │ Ajoute un client...   │   │
        │   └───────────────────────┘   │
        │                               │
        │      [ Annuler ]   ●STOP      │
        ╰───────────────────────────────╯
```

Après traitement → carte de confirmation (BottomSheet) :

```
        ╭───────────────────────────────╮
        │  ✅  Client créé              │
        │  Jean Dupont                  │
        │  jean@gmail.com               │
        │                               │
        │  [ Voir la fiche ]  [Annuler] │
        ╰───────────────────────────────╯
```

Retours haptiques (`expo-haptics`) : *light* à l'appui, *success/error* à la fin.

---

## 8. Iconographie & illustrations

- **SF Symbols** comme système d'icônes de référence (poids `regular`/`semibold`).
- Illustrations *empty states* : style ligne fine monochrome `tint`, légères.
- Pas d'emojis dans l'UI de production (sauf accents ponctuels de confirmation).

---

## 9. Mouvement

- Transitions d'écran : *push* iOS natif (Expo Router / stack).
- Modales : présentation *sheet* (poignée, coins arrondis, dimming progressif).
- Listes : apparition *stagger* discrète (≤ 200 ms).
- Micro/overlay : ressorts (`spring`, damping élevé) via `react-native-reanimated`.
- Règle : durées 150–300 ms, jamais > 400 ms ; respect de *Reduce Motion*.

---

## 10. Implémentation (tokens → code)

Les tokens vivent dans :

```
apps/mobile/src/theme/
├── colors.ts        # palettes light/dark
├── typography.ts    # styles SF Pro
├── spacing.ts       # échelle 4pt, rayons
├── shadows.ts       # ombres
└── index.ts         # hook useTheme() + ThemeProvider
```

Accès via un hook : `const { colors, typography, spacing } = useTheme();`. Le thème suit
le mode système (`useColorScheme`) avec override manuel possible dans Réglages.
