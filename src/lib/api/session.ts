/**
 * Session côté client.
 *
 * L'access token vit UNIQUEMENT en mémoire (ce module), jamais dans
 * `localStorage` ni `sessionStorage` : un XSS ne peut donc pas l'exfiltrer par
 * simple lecture de stockage. Sa contrepartie, c'est qu'un rechargement de page
 * le perd — on le reconstitue au démarrage via `/auth/refresh`, qui s'appuie sur
 * le cookie httpOnly que le JavaScript ne voit pas.
 *
 * Le refresh token TOURNE à chaque usage côté backend, et rejouer un token déjà
 * consommé y est interprété comme un vol : toutes les sessions du compte sont
 * révoquées. D'où la déduplication ci-dessous — sans elle, trois requêtes qui
 * reçoivent un 401 en même temps déclencheraient trois rotations concurrentes et
 * déconnecteraient l'utilisateur.
 */
import { API_URL } from "@/lib/config";
import { ApiError, type ApiErrorCode } from "./errors";
import { fetchWithTimeout } from "./fetch-with-timeout";
import type { ApiEnvelope, AuthSession } from "./types";

let accessToken: string | null = null;
/** Recopié dans l'en-tête `x-csrf-token` sur les routes qui s'authentifient par cookie. */
let csrfToken: string | null = null;
let currentUser: AuthSession["user"] | null = null;

/** Rotation en cours — partagée par tous les appelants (voir en-tête du module). */
let refreshInFlight: Promise<string> | null = null;

/** `true` une fois que la restauration au démarrage a été tentée. */
let bootstrapped = false;

type Listener = (user: AuthSession["user"] | null) => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener(currentUser);
}

/** S'abonner aux changements de session (utilisé par le provider React). */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCurrentUser(): AuthSession["user"] | null {
  return currentUser;
}

export function isBootstrapped(): boolean {
  return bootstrapped;
}

/**
 * Le backend renvoie le jeton CSRF dans le corps ET dans un cookie lisible.
 * On privilégie la valeur en mémoire : en production, si l'API est sur un
 * sous-domaine distinct, le cookie n'est pas lisible depuis le frontend
 * (voir README — `COOKIE_DOMAIN` doit alors couvrir les deux).
 */
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|;\s*)o2w_csrf=([^;]*)/.exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return csrfToken ?? readCsrfCookie();
}

export function setSession(session: AuthSession): void {
  accessToken = session.accessToken;
  csrfToken = session.csrfToken;
  currentUser = session.user;
  bootstrapped = true;
  emit();
}

export function clearSession(): void {
  accessToken = null;
  csrfToken = null;
  currentUser = null;
  bootstrapped = true;
  emit();
}

/**
 * Appel brut à `/auth/refresh`, volontairement écrit sans passer par le client
 * API : celui-ci déclenche un refresh sur 401, ce qui bouclerait à l'infini.
 */
async function requestRefresh(): Promise<AuthSession> {
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  // Borné dans le temps : c'est le seul appel dont dépend l'affichage de TOUTE
  // l'application au démarrage. Sans délai, une API qui accepte la connexion
  // sans jamais répondre fige l'écran sur « Vérification de votre session… ».
  const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<AuthSession> | null;

  if (!response.ok || !payload?.success) {
    const error = payload && !payload.success ? payload.error : null;
    throw new ApiError(
      response.status,
      (error?.code as ApiErrorCode | undefined) ?? "UNAUTHENTICATED",
      error?.message ?? "Session invalide.",
    );
  }

  return payload.data;
}

/**
 * Renouvelle l'access token. Les appels concurrents partagent la même promesse :
 * une seule rotation part réellement sur le réseau.
 */
export function refreshSession(): Promise<string> {
  refreshInFlight ??= requestRefresh()
    .then((session) => {
      setSession(session);
      return session.accessToken;
    })
    .catch((error: unknown) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * Restaure la session au chargement de l'application.
 *
 * Un échec est le cas NORMAL d'un visiteur non connecté : il ne doit produire ni
 * erreur visible, ni redirection.
 */
export async function restoreSession(): Promise<AuthSession["user"] | null> {
  try {
    await refreshSession();
  } catch {
    clearSession();
  }
  bootstrapped = true;
  return currentUser;
}
