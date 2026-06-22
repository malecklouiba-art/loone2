# Assets

Placez ici les ressources binaires référencées par `app.json` (à fournir par le design) :

- `icon.png` — 1024×1024, icône de l'app
- `splash.png` — écran de démarrage (logo centré sur fond blanc/noir)
- `adaptive-icon.png` — 1024×1024, icône adaptative Android (zone de sécurité centrale)
- `fonts/` — polices SF Pro (iOS utilise la police système ; Android : ajouter Inter)

Tant que ces fichiers ne sont pas présents, `expo start` émet un avertissement mais
fonctionne ; ils sont requis pour les builds EAS (stores).
