# Orient2Work — API

API REST de la plateforme Orient2Work (OMB) : orientation, formation et mise en
relation entre jeunes diplômés et entreprises.

**Stack** — Node.js 20+ · Express 4 · PostgreSQL 16 · Prisma 6 · TypeScript strict · Zod · Vitest

---

## Démarrage rapide

```bash
cd backend
cp .env.example .env          # puis remplir les secrets (voir plus bas)
npm install

docker compose up -d          # PostgreSQL local (ou utilisez votre instance)
npm run prisma:migrate        # crée le schéma
npm run db:seed               # données de démonstration

npm run dev                   # http://localhost:4000/api/v1
```

Documentation interactive : <http://localhost:4000/docs> (désactivée en production).
Sonde de santé : `GET /health`.

### Générer les secrets

```bash
openssl rand -base64 48   # à faire 3 fois : JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
```

Le serveur **refuse de démarrer** si une variable est manquante ou invalide
(`src/config/env.ts`). En production il exige en plus `COOKIE_SECURE=true` et des
origines CORS en HTTPS.

### Comptes de démonstration (seed)

| Rôle                  | Email                          | Mot de passe       |
| --------------------- | ------------------------------ | ------------------ |
| Admin                 | `admin@orient2work.ma`         | `Admin!2026Change` |
| Jeune validé          | `lucas.dupont@email.com`       | `Orient2Work!2026` |
| Jeune (test échoué)   | `sara.idrissi@email.com`       | `Orient2Work!2026` |
| Entreprise validée    | `recrutement@techsolutions.ma` | `Orient2Work!2026` |
| Entreprise en attente | `jobs@datafirst.ma`            | `Orient2Work!2026` |

Ces comptes ne doivent **jamais** être créés en production.

---

## Architecture

Flux d'une requête, du transport vers la donnée :

```
routes/         Déclaration HTTP + middlewares (auth, RBAC, validation, rate limit)
   ↓
controllers/    Transport uniquement : lire req.validated, appeler le service, formater
   ↓
services/       Règles métier, contrôles de propriété, orchestration
   ↓
repositories/   Requêtes Prisma. Aucune règle métier.
   ↓
mappers/        Entité Prisma → DTO. Filtre ce qui ne doit pas sortir.
```

```
src/
├── app.ts                  Assemblage Express (ordre des middlewares = choix de sécurité)
├── server.ts               Démarrage HTTP, arrêt gracieux
├── config/
│   ├── env.ts              Validation zod de process.env — bloque le démarrage si invalide
│   └── logger.ts           pino + redaction des champs sensibles
├── domain/
│   ├── enums.ts            Miroir de src/lib/constants.ts (frontend)
│   └── profil.ts           Complétion de profil et score d'employabilité (dérivés)
├── lib/                    prisma, errors, tokens, password, cookies, upload, sanitize…
├── middlewares/            authenticate, authorize, validate, csrf, rate-limit, error-handler
├── validators/             Schémas zod, un par ressource
├── repositories/           Accès Prisma
├── services/               Métier
├── controllers/            Transport
├── mappers/                DTO
└── routes/                 Routeurs Express (JSDoc par endpoint)
```

**Pourquoi les mappers existent** — un contrôleur ne renvoie jamais une entité
Prisma brute. C'est la couche qui garantit qu'un `passwordHash`, la bonne réponse
d'un quiz ou l'email d'un candidat ne franchissent pas la frontière HTTP par
inadvertance.

---

## Sécurité

### Authentification

| Jeton         | Transport                                                                      | Durée  | Stockage serveur                    |
| ------------- | ------------------------------------------------------------------------------ | ------ | ----------------------------------- |
| Access token  | En-tête `Authorization: Bearer`                                                | 15 min | Aucun (JWT signé, vérifié sans SQL) |
| Refresh token | Cookie `o2w_refresh` httpOnly · secure · sameSite=strict · `Path=/api/v1/auth` | 7 j    | SHA-256 uniquement                  |

- **Rotation systématique** : chaque `/auth/refresh` consomme l'ancien token et en
  émet un neuf.
- **Détection de vol** : rejouer un token déjà consommé révoque _toutes_ les
  sessions du compte (`auth.service.ts`).
- Le refresh token n'apparaît **jamais** dans le corps d'une réponse.
- Deux secrets JWT distincts, vérifiés différents au démarrage.
- Changement ou réinitialisation de mot de passe → révocation de toutes les sessions.

### Mots de passe

bcrypt, coût 12 (configurable). Le point d'entrée unique est `lib/password.ts` —
passer à argon2 ne demande de modifier que ce fichier. Une comparaison factice
(`burnPasswordComparison`) est exécutée quand l'email est inconnu, pour que la
latence ne révèle pas quels comptes existent.

### Validation

Zod sur **toutes** les routes, via `middlewares/validate.ts`. Les schémas sont
`.strict()` : un champ inconnu est rejeté en 422 plutôt qu'ignoré silencieusement —
c'est ce qui bloque le mass-assignment (`{"role": "ADMIN"}` dans un payload
d'inscription est refusé). Un contrôleur ne lit jamais `req.body` brut, seulement
`req.validated`.

### Autorisation

Deux contrôles distincts et complémentaires :

1. **RBAC** — `authorize(Role.JEUNE, …)` répond à « ce rôle peut-il appeler cette
   route ? ».
2. **Propriété** — `assertOwnership(actor, ownerId)` dans les services répond à
   « cette ressource précise lui appartient-elle ? ».

Le second ne peut pas être générique : il dépend de la ressource. Concrètement —
un jeune ne modifie que son profil, une entreprise ne gère que ses offres et ne
voit que les candidatures reçues sur celles-ci, l'admin passe partout.

Champs non modifiables par leur propriétaire (absents des schémas de mise à jour) :
`Jeune.status`, `Jeune.scoreQuiz`, `Entreprise.status`, publication d'une `Offre`.

### Protection HTTP

- **helmet** avec CSP restrictive, HSTS en production, `frameAncestors: none`.
- **CORS** en whitelist stricte, `credentials: true`. `*` est rejeté par la
  validation d'environnement — il est incompatible avec les cookies de session.
- **Rate limiting** — global (300 / 15 min) et renforcé sur les routes sensibles
  (10 / 15 min sur connexion, inscription, reset). La clé est `IP + email visé`,
  ce qui bloque le bruteforce ciblé sans punir un voisin de NAT.
- **Taille des payloads** — `express.json({ limit: "10kb" })`, relevé à 512 ko sur
  les seules routes `/formations` (contenu HTML des cours).
- **CSRF** — double submit token sur les deux routes qui s'authentifient par
  cookie (`/auth/refresh`, `/auth/deconnexion`). Les autres routes utilisent
  l'en-tête `Bearer`, qu'un navigateur n'ajoute jamais spontanément : elles ne
  sont pas exposées au CSRF. `sameSite=strict` est la première barrière.
- **Injection SQL** — Prisma paramètre toutes les requêtes ; aucune concaténation
  SQL dans le code. La validation zod reste appliquée par-dessus.
- **XSS stocké** — le HTML riche des formations passe par `sanitize-html`
  (whitelist de balises, schémas d'URL sûrs, `rel="noopener"` forcé) _même_ quand
  il vient d'un admin.

### Erreurs et logs

Middleware centralisé (`middlewares/error-handler.ts`). Le client reçoit toujours
la même enveloppe ; en production aucune stack trace, aucun message Prisma,
aucune requête SQL ne sort — les erreurs inattendues deviennent un 500 générique
et le détail part uniquement dans les logs.

Logs pino avec `redact` sur les mots de passe, tokens, en-têtes `authorization` et
`cookie`. Le corps des requêtes n'est jamais journalisé. Un `x-request-id` est
propagé pour la corrélation.

### Uploads

- Stockage **hors** du répertoire servi statiquement : aucun fichier déposé n'est
  atteignable par URL directe ni exécutable.
- Nom de fichier généré aléatoirement — neutralise les traversées de chemin.
- Whitelist de types MIME **et** d'extensions, puis vérification de la signature
  binaire (magic bytes) après écriture : un exécutable renommé `.pdf` est supprimé.
- SVG volontairement exclu des logos (un SVG peut embarquer du JavaScript).
- Chaque téléchargement repasse par un contrôleur qui revérifie les droits : un CV
  n'est lisible que par son propriétaire, par une entreprise à qui il a été envoyé
  via une candidature, ou par un admin.

### Emails

Vérification d'adresse à l'inscription : token à usage unique, hashé en base,
expiration 30 min. Réinitialisation de mot de passe : 15 min. Les réponses de
`/auth/mot-de-passe/oubli` et `/auth/inscription/*` sont **constantes**, que le
compte existe ou non.

Sans `SMTP_HOST` configuré, les emails sont écrits dans les logs — pratique en
développement.

---

## Base de données

- **UUID** en clés primaires partout — aucun identifiant séquentiel exposé.
- `onDelete: Cascade` quand l'enfant n'a pas de sens sans son parent (expériences,
  questions de quiz) ; `Restrict` quand la suppression doit être bloquée pour
  préserver l'historique (entreprise ayant des offres, offre ayant des
  candidatures — une offre se _désactive_, elle ne se supprime pas).
- Index sur toutes les colonnes de recherche et de filtre : `email`, statuts,
  `filiere`, `ville`, `dateLimite`, `(status, publieeLe)`…
- Contraintes d'unicité métier : une candidature par `(jeune, offre)`, un avis par
  `(formation, jeune)`, une progression par `(jeune, formation)`.
- Migrations versionnées dans `prisma/migrations/`.

### Statuts et libellés accentués

Les **statuts** sont des enums PostgreSQL dont les valeurs sont identiques aux
littéraux du frontend (`valide`, `attente_validation`, `publiee`…) : aucun mapping
n'est nécessaire.

En revanche `filiere`, `type` d'opportunité et `mode` de travail restent des
colonnes `String` : leurs libellés contiennent accents et espaces
(`"Réseaux et télécommunications"`, `"À distance"`), ce qui imposerait des enums
Prisma mappés et un aller-retour de conversion à chaque lecture. Ils sont validés
strictement par zod contre `src/domain/enums.ts` et indexés — l'intégrité est
garantie à l'entrée, et les DTO restent identiques aux types du frontend.

---

## Alignement avec le frontend

`src/domain/enums.ts` reproduit `src/lib/constants.ts`, et les DTO reproduisent
`src/lib/types.ts`. La duplication est délibérée : le backend est déployable seul,
et un changement de libellé côté frontend doit rester un choix conscient ici aussi.

`GET /api/v1/referentiels` expose les listes de valeurs pour alimenter les
formulaires sans les redupliquer côté client.

**Valeurs dérivées, jamais stockées** — `profilCompletion` et le score
d'employabilité sont recalculés à chaque lecture (`src/domain/profil.ts`, miroir
de `src/lib/score.ts`). Un client ne peut donc pas les gonfler via l'API.

Le seed reproduit les jeux de données de `src/lib/mock-*.ts` (mêmes noms, statuts,
filières et formations) : le frontend existant peut être rebranché sans rien
changer d'autre que l'origine des données.

---

## Scripts

| Commande                      | Effet                                               |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Serveur en rechargement à chaud                     |
| `npm run build` / `npm start` | Compilation puis exécution de `dist/`               |
| `npm run typecheck`           | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` / `lint:fix`   | ESLint typé, zéro warning toléré                    |
| `npm run format`              | Prettier                                            |
| `npm test`                    | Vitest + supertest                                  |
| `npm run prisma:migrate`      | Migration de développement                          |
| `npm run prisma:deploy`       | Migration en production                             |
| `npm run prisma:studio`       | Explorateur de base                                 |
| `npm run db:seed`             | Données de démonstration (idempotent)               |
| `npm run db:reset`            | Réinitialise la base et rejoue le seed              |

---

## Tests

```bash
# Une seule fois : préparer la base de test
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy

npm test
```

Les tests d'intégration tournent contre une **vraie** base PostgreSQL
(`TEST_DATABASE_URL`), pas contre des mocks : c'est le seul moyen de vérifier
réellement les contraintes d'unicité, les cascades et les règles de propriété, qui
sont précisément ce qu'on veut garantir.

Couverture actuelle — 48 tests :

- `auth.test.ts` — inscription, connexion, rotation et rejeu du refresh token,
  CSRF, anti-énumération, mass-assignment, limite de payload ;
- `offres.test.ts` — création, refus de publication directe, propriété entre
  entreprises, visibilité publique des brouillons, modération admin ;
- `candidatures.test.ts` — gardes métier (profil validé, offre ouverte, unicité),
  étanchéité entre entreprises, CV d'autrui, cycle de vie des statuts ;
- `score.test.ts` — tests unitaires de la complétion et du score.

---

## Conventions de l'API

Toutes les réponses partagent la même enveloppe.

```jsonc
// Succès
{ "success": true, "data": … , "meta": { "page": 1, "perPage": 20, "total": 42, "totalPages": 3 } }

// Erreur
{ "success": false, "error": { "code": "NOT_OWNER", "message": "…", "details": … } }
```

Codes d'erreur stables : `VALIDATION_ERROR`, `UNAUTHENTICATED`,
`INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_DISABLED`, `TOKEN_EXPIRED`,
`TOKEN_INVALID`, `FORBIDDEN`, `NOT_OWNER`, `NOT_FOUND`, `CONFLICT`,
`PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, `CSRF_ERROR`,
`INTERNAL_ERROR`.

Pagination : `?page=1&perPage=20` (100 maximum).

Le détail de chaque endpoint est dans `openapi.yaml` et en JSDoc au-dessus de
chaque route.

---

## Déploiement

1. `NODE_ENV=production`, `COOKIE_SECURE=true`, `CORS_ORIGINS` en HTTPS.
2. Secrets régénérés — jamais ceux de `.env.example`.
3. `npm run build && npm run prisma:deploy && npm start`.
4. Derrière un reverse proxy, `trust proxy` est activé automatiquement en
   production : sans lui, le rate limiting verrait l'IP du proxy pour tout le monde.
5. Sauvegarder `UPLOAD_DIR` (les fichiers ne sont pas en base).
6. Planifier `POST /api/v1/admin/offres/expiration` (quotidien) pour basculer les
   offres dépassées en `expiree`.
