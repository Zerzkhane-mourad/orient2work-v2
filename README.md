# Orient2Work by OMB

> De l'orientation à l'opportunité professionnelle.

Plateforme qui connecte les jeunes talents et les entreprises : profils vérifiés,
formations employabilité, offres et entretiens.

Monorepo à deux applications :

| Dossier | Rôle | Stack |
|---|---|---|
| [`/`](.) | Frontend | Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind 3 |
| [`backend/`](backend) | API REST | Express 4 · PostgreSQL 16 · Prisma 6 · Zod · Vitest |

---

## Démarrage

Deux terminaux : l'API d'abord, le frontend ensuite.

```bash
# 1. API — détail dans backend/README.md
cd backend
cp .env.example .env          # remplir les secrets
npm install
docker compose up -d          # PostgreSQL
npm run prisma:migrate
npm run db:seed
npm run dev                   # http://localhost:4000/api/v1

# 2. Frontend
cd ..
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` doit pointer sur l'API, **préfixe de version inclus** et
sans slash final. C'est la seule variable d'environnement du frontend, et ce
n'est pas un secret : Next l'inline dans le bundle envoyé au navigateur.

Comptes de démonstration : voir [backend/README.md](backend/README.md).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` / `build` / `start` | Cycle Next.js habituel |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run smoke` | **Parcours complet contre l'API réelle** (voir plus bas) |

---

## Architecture

```
src/
  app/
    (public)/          Accueil, à propos, jeunes, entreprises, formations, offres, contact
    (auth)/            Connexion, inscription, vérification email, mot de passe
    espace-jeune/      Dashboard, profil, documents, test, formations, offres, candidatures, entretiens
    espace-entreprise/ Dashboard, profil, publier, offres, candidatures, talents, calendrier, entretiens
    admin/             Jeunes, entreprises, offres, formations, quiz, entretiens, messages, statistiques
  components/
    ui/                Primitives du design system (+ états de chargement et d'erreur)
    layout/            Header/Footer publics, AppShell et JeuneShell
    marketing/         Blocs de sections marketing
  features/            Modules métier (auth, offres, formations, talents, entretiens, contact, admin…)
  lib/
    api/               Couche réseau (voir ci-dessous)
    constants.ts       Statuts, filières — miroir de backend/src/domain/enums.ts
    types.ts           Types d'affichage partagés par plusieurs composants
```

### Principes

- **Séparation stricte des rôles** via des layouts dédiés et un garde
  `RequireRole` — doublé côté serveur par le RBAC de l'API.
- **Statuts centralisés** (`src/lib/constants.ts`), rendus par un `<StatusBadge>`
  unique.
- **Design system tokenisé** : couleurs en variables CSS, Tailwind mappe des noms
  sémantiques dessus.

---

## Comment le frontend parle à l'API

### Authentification

L'API garde l'**access token hors de tout stockage persistant** : il vit en
mémoire JavaScript ([`session.ts`](src/lib/api/session.ts)), jamais dans
`localStorage`. Un XSS ne peut donc pas l'exfiltrer par simple lecture de
stockage. Le refresh token, lui, est dans un cookie `httpOnly` que le JavaScript
ne voit pas.

Conséquence directe : **un rechargement de page perd l'access token**. Il est
reconstitué au démarrage par un appel silencieux à `/auth/refresh`, déclenché par
[`SessionProvider`](src/features/auth/session-provider.tsx).

Deuxième conséquence, structurante : le serveur Next n'a pas accès à la session.
Les pages privées sont donc des **composants clients** (31 pages), les pages
publiques restent des **Server Components** (17 pages) qui lisent l'API sans
jeton via `serverFetch`.

### Le piège de la rotation

Le refresh token tourne à chaque usage, et rejouer un token déjà consommé fait
révoquer **toutes** les sessions du compte côté backend — c'est une protection
anti-vol. Si trois requêtes reçoivent un 401 en même temps et déclenchent trois
rotations, l'utilisateur est déconnecté.

[`session.ts`](src/lib/api/session.ts) partage donc une promesse unique : une
seule rotation part réellement sur le réseau, quel que soit le nombre d'appels
concurrents.

### Couche API

```
src/lib/
  config.ts              Lecture UNIQUE de process.env
  api/
    client.ts            fetch + base URL + refresh auto + erreurs typées
    session.ts           Token en mémoire, rotation dédupliquée
    errors.ts            ApiError (status + code + erreurs par champ)
    types.ts             DTO recopiés des mappers backend
    adapters.ts          DTO → types d'affichage
    media.ts             Images et documents protégés par jeton
    use-api.ts           useApi (lecture) et useMutation (action)
    endpoints/           Une fonction typée par route
```

Aucun composant n'appelle `fetch` directement — tout passe par `api.*`.

### Images et documents protégés

`/documents/:id/contenu` exige un en-tête `Authorization` et renvoie une URL
relative à l'API. Un `<img src>` ne peut ni la résoudre ni s'authentifier :
[`media.ts`](src/lib/api/media.ts) télécharge le binaire via le client API et
l'expose en `blob:`, avec révocation au démontage.

---

## Test de bout en bout

```bash
# backend démarré, puis :
npm run smoke

# ou contre un autre port :
API_URL=http://localhost:4010/api/v1 npm run smoke
```

[`scripts/smoke-test.mts`](scripts/smoke-test.mts) exécute **les vrais modules
`src/lib/api/*`** — le même code que le navigateur — avec un shim de cookies.
53 contrôles : inscription, connexion, profil, test de validation, formations,
offres, candidature, espaces entreprise et admin, contact, newsletter, rotation
de session et déconnexion.

Il vérifie aussi des propriétés de sécurité : `status` non modifiable par le
jeune, bonnes réponses de quiz jamais envoyées au navigateur, emails des
candidats absents de la recherche de talents, routes admin fermées aux autres
rôles.

Ne le lancez **jamais** contre une base de production : il crée des comptes.

---

## Mise en production

### Frontend

- `NEXT_PUBLIC_API_URL` pointant sur l'API en **HTTPS**. La variable est lue au
  build : un changement impose un rebuild.
- Aucun secret ne doit porter le préfixe `NEXT_PUBLIC_`.

### Backend

Voir [backend/README.md](backend/README.md). Trois points concernent directement
le couple frontend/backend :

1. **CORS** — `CORS_ORIGINS` doit lister l'origine exacte du frontend. Le
   caractère `*` est refusé au démarrage : il est incompatible avec les cookies
   de session.

2. **`COOKIE_DOMAIN`** — si l'API et le frontend sont sur des sous-domaines
   distincts (`api.orient2work.ma` / `orient2work.ma`), il faut
   `COOKIE_DOMAIN=.orient2work.ma`. Sinon le cookie CSRF, posé en host-only sur
   le sous-domaine de l'API, n'est pas lisible par le frontend et **le refresh
   échoue au premier rechargement de page**.

3. **`COOKIE_SECURE=true`** — exigé en production par la validation
   d'environnement.

---

## Ce qui reste à faire

Deux fonctionnalités sont signalées dans l'interface comme non disponibles,
faute d'endpoint côté API :

- **certificats de formation** téléchargeables ;
- **export PDF/CSV** des statistiques admin.

Le contenu éditorial des pages vitrines (À propos, Jeunes, Entreprises) reste
volontairement en dur : ce sont des textes de présentation, pas des données.
