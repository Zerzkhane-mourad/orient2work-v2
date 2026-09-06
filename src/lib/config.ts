/**
 * Configuration publique du frontend.
 *
 * Point d'entrée UNIQUE pour l'URL de l'API : aucun autre fichier ne lit
 * `process.env` directement. Next inline les variables `NEXT_PUBLIC_*` dans le
 * bundle client au moment du build — elles sont donc publiques par construction,
 * et c'est acceptable ici : l'URL de l'API n'est pas un secret.
 *
 * Aucun secret ne doit jamais transiter par ce fichier. L'authentification
 * repose entièrement sur le backend (access token en mémoire, refresh token en
 * cookie httpOnly que le JavaScript ne peut pas lire).
 */

function readApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    // Échouer au démarrage plutôt que de laisser des `fetch("undefined/offres")`
    // partir en production.
    throw new Error(
      "NEXT_PUBLIC_API_URL est manquante. Copiez .env.example en .env.local et renseignez-la.",
    );
  }

  // Un slash final produirait des URLs `//offres` : on normalise une fois pour toutes.
  return raw.replace(/\/+$/, "");
}

export const API_URL = readApiUrl();

/** Délai au-delà duquel une requête est abandonnée (évite un spinner infini). */
export const API_TIMEOUT_MS = 15_000;

/** Où renvoyer l'utilisateur quand la session est définitivement perdue. */
export const LOGIN_PATH = "/connexion";

/** Page d'accueil de chaque rôle, après connexion. */
export const HOME_BY_ROLE = {
  JEUNE: "/espace-jeune",
  ENTREPRISE: "/espace-entreprise",
  ADMIN: "/admin",
} as const;
