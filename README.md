# Orient2Work by OMB

> De l'orientation à l'opportunité professionnelle.

Plateforme qui connecte les jeunes talents et les entreprises : profils vérifiés,
formations employabilité, offres et entretiens. Portage Next.js des maquettes Stitch,
structuré selon le cahier de charges OMB.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3** — design system tokenisé (voir `tailwind.config.ts` + `globals.css`)
- Polices `next/font` : Plus Jakarta Sans (titres) / Inter (corps), icônes Material Symbols

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
npm run typecheck
```

> Données en mémoire (`src/lib/mock-data.ts`) — aucun backend requis pour la v1.
> Depuis `/connexion`, trois accès de démo : Jeune, Entreprise, Admin.

## Architecture

```
src/
  app/
    (public)/          Pages publiques (accueil, à propos, jeunes, entreprises, formations, offres, contact)
    (auth)/            Connexion + inscription (bascule jeune / entreprise)
    espace-jeune/      Espace Jeune (dashboard, profil, documents, test, formations, offres, candidatures, entretiens)
    espace-entreprise/ Espace Entreprise (dashboard, profil, publier, offres, candidatures, talents, calendrier, entretiens)
    admin/             Espace Admin OMB (jeunes, entreprises, offres, formations, quiz, entretiens, statistiques)
  components/
    ui/                Primitives du design system (Button, Card, Badge, Chip, Input, Table, StatusBadge…)
    layout/            Header/Footer publics, AppShell (sidebar + topbar des espaces authentifiés)
    marketing/         Blocs de sections marketing
  features/            Modules métier (auth, offres, formations, talents, entretiens, test, settings, jeune)
  lib/                 Constantes (statuts, filières), types du domaine, données mock, navigation, utils
```

### Principes

- **Séparation stricte des rôles** (jeune / entreprise / admin) via des layouts et une
  navigation dédiés — conforme au §16 du cahier de charges.
- **Statuts centralisés** (`src/lib/constants.ts`) : comptes jeune/entreprise, offres et
  entretiens — rendus par un `<StatusBadge>` unique.
- **Design system tokenisé** : les couleurs sont des variables CSS ; Tailwind mappe les noms
  sémantiques dessus, ce qui prépare le thème sombre et un rebranding éventuel.
- **Composants réutilisables** : `OffreCard`, `FormationCard`, `TalentCard`, `EntretienCard`,
  `OffresBrowser`, `TalentSearch`, `QuizRunner`, `AvailabilityCalendar`.

## Prochaines étapes (v2)

- Authentification réelle + base de données (les modèles de `src/lib/types.ts` sont prêts).
- Notifications email (§9) et génération automatique des liens de réunion (§10).
- Upload de fichiers (CV, documents, certificats) et génération des certificats PDF.
