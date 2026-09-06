/**
 * Client HTTP.
 *
 * Un point de passage unique pour tous les appels API : base URL, en-têtes,
 * désenveloppage de `{ success, data, meta }`, conversion des échecs en
 * `ApiError`, et renouvellement automatique de l'access token sur 401.
 *
 * Aucun composant ne doit appeler `fetch` directement — sinon la gestion du
 * token et des erreurs se met à diverger d'un écran à l'autre.
 */
import { API_URL, LOGIN_PATH } from "@/lib/config";
import { ApiError, type ApiErrorCode } from "./errors";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { clearSession, getAccessToken, getCsrfToken, refreshSession } from "./session";
import type { ApiEnvelope, ApiFailure, ApiMeta, Paginated } from "./types";

export type QueryScalar = string | number | boolean | undefined | null;
/** Un tableau devient une liste séparée par des virgules — voir `buildUrl`. */
export type QueryValue = QueryScalar | readonly QueryScalar[];
export type Query = Record<string, QueryValue>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Corps déjà encodé (upload de fichier) — `Content-Type` laissé au navigateur. */
  formData?: FormData;
  signal?: AbortSignal;
  /**
   * Routes qui s'authentifient par cookie plutôt que par Bearer : elles exigent
   * l'en-tête CSRF (double submit).
   */
  csrf?: boolean;
  /**
   * `false` désactive le renouvellement automatique. Utilisé par les routes
   * d'authentification, où un 401 est une réponse métier (mauvais mot de passe)
   * et non une session expirée.
   */
  autoRefresh?: boolean;
}

/** Ajoute les paramètres non vides à l'URL. */
function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      // Un tableau est sérialisé en `a,b,c` — la forme attendue par les filtres
      // multi-valeurs de l'API (`?status=envoyee,vue`). Un tableau vide vaut
      // « pas de filtre » et disparaît, comme `undefined`.
      const serialized = Array.isArray(value)
        ? value.filter((item) => item !== undefined && item !== null && item !== "").join(",")
        : value;
      if (serialized === undefined || serialized === null || serialized === "") continue;
      url.searchParams.set(key, String(serialized));
    }
  }
  return url.toString();
}

/**
 * Redirige vers la connexion quand la session est définitivement perdue.
 *
 * `window.location` plutôt que le routeur Next : on veut repartir d'un état
 * mémoire propre, et ce code peut s'exécuter hors d'un composant React.
 */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith(LOGIN_PATH)) return;

  const from = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`${LOGIN_PATH}?suite=${encodeURIComponent(from)}`);
}

interface RawResult<T> {
  data: T;
  meta?: ApiMeta;
}

/**
 * Extrait l'enveloppe d'échec, si c'en est bien une.
 *
 * Une réponse peut ne PAS respecter le contrat : corps vide (304, 502 d'un
 * proxy), page HTML d'erreur, JSON sans `success`. Tester `!payload.success`
 * puis lire `payload.error.code` planterait alors sur `undefined` — et l'erreur
 * remontée ne serait même plus une `ApiError`.
 */
function readFailure(payload: unknown): ApiFailure["error"] | null {
  if (typeof payload !== "object" || payload === null) return null;
  const envelope = payload as Partial<ApiFailure>;
  if (envelope.success !== false) return null;
  if (typeof envelope.error?.code !== "string") return null;
  return envelope.error;
}

/**
 * Message d'une réponse hors contrat.
 *
 * Il porte le statut HTTP : sans lui, toutes ces situations très différentes
 * s'affichaient à l'identique (« Erreur inattendue. ») et n'étaient pas
 * diagnosticables depuis l'écran.
 */
function unexpectedMessage(status: number, raw: string): string {
  if (status === 304) {
    return "Le navigateur a renvoyé une réponse de cache vide (304). Rechargez la page.";
  }
  if (!raw.trim()) return `Réponse vide du serveur (HTTP ${status}).`;
  return `Réponse illisible du serveur (HTTP ${status}).`;
}

async function send<T>(
  path: string,
  options: RequestOptions,
  retried: boolean,
): Promise<RawResult<T>> {
  const { method = "GET", body, query, formData, csrf, autoRefresh = true } = options;

  const headers: Record<string, string> = {};

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (csrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
  }

  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  // Le délai et la conversion des échecs réseau en `ApiError` sont portés par
  // `fetchWithTimeout`, partagé avec `/auth/refresh`.
  const response = await fetchWithTimeout(
    buildUrl(path, query),
    {
      method,
      headers,
      // Indispensable : le refresh token voyage en cookie, et l'API est sur une
      // autre origine que le frontend.
      credentials: "include",
      // L'API est dynamique et liée à la session : rien n'y est réutilisable
      // d'une requête à l'autre. Sans cela, Express pose un `ETag` sans
      // `Cache-Control`, le navigateur revalide, et une réponse `304` au corps
      // vide peut remonter jusqu'ici au lieu du JSON attendu.
      cache: "no-store",
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    },
    options.signal,
  );

  // 204 : suppression, déconnexion — pas de corps à lire.
  if (response.status === 204) {
    return { data: undefined as T };
  }

  // Lu en texte, puis parsé : on garde le corps brut pour pouvoir qualifier une
  // réponse qui n'est pas du JSON (`response.json()` seul perd cette information).
  const raw = await response.text().catch(() => "");
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as ApiEnvelope<T>) : null;
  } catch {
    payload = null;
  }

  if (response.ok && payload?.success) {
    return { data: payload.data, meta: payload.meta };
  }

  const failure = readFailure(payload);
  const code = failure?.code as ApiErrorCode | undefined;
  const message = failure?.message ?? unexpectedMessage(response.status, raw);
  const details = failure?.details;

  // Session expirée : une seule tentative de renouvellement, puis on réessaie.
  const expired =
    response.status === 401 && (code === "TOKEN_EXPIRED" || code === "UNAUTHENTICATED");
  if (expired && autoRefresh && !retried) {
    try {
      await refreshSession();
    } catch {
      clearSession();
      redirectToLogin();
      throw new ApiError(401, "TOKEN_EXPIRED", "Votre session a expiré.");
    }
    return send<T>(path, options, true);
  }

  if (response.status === 401 && autoRefresh && retried) {
    clearSession();
    redirectToLogin();
  }

  // Sans enveloppe exploitable, `UNEXPECTED_RESPONSE` : le statut seul ne dit
  // pas s'il s'agit d'une validation, d'un cache ou d'un proxy en travers.
  throw new ApiError(
    response.status,
    code ?? (response.status >= 500 ? "INTERNAL_ERROR" : "UNEXPECTED_RESPONSE"),
    message,
    details,
  );
}

/** Requête renvoyant directement la donnée. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await send<T>(path, options, false);
  return result.data;
}

/** Requête de liste : renvoie les éléments et la pagination. */
export async function requestList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Paginated<T>> {
  const result = await send<T[]>(path, options, false);
  return {
    items: result.data ?? [],
    meta: result.meta ?? {
      page: 1,
      perPage: result.data?.length ?? 0,
      total: result.data?.length ?? 0,
      totalPages: 1,
    },
  };
}

export const http = {
  get: <T>(path: string, query?: Query, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET", query }),

  list: <T>(path: string, query?: Query, options?: RequestOptions) =>
    requestList<T>(path, { ...options, method: "GET", query }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  upload: <T>(path: string, file: File, options?: RequestOptions) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<T>(path, { ...options, method: "POST", formData });
  },
};

/**
 * Lecture serveur (Server Components), pour les pages PUBLIQUES uniquement.
 *
 * Aucun jeton n'est attaché : le serveur Next n'a pas accès à la session, qui
 * vit dans le navigateur. Toute page privée doit être un composant client.
 */
export async function serverFetch<T>(path: string, query?: Query): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    headers: { Accept: "application/json" },
    // Le catalogue bouge peu : 60 s de cache évitent de marteler l'API.
    next: { revalidate: 60 },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    const error = payload && !payload.success ? payload.error : null;
    throw new ApiError(
      response.status,
      (error?.code as ApiErrorCode) ?? "INTERNAL_ERROR",
      error?.message ?? "Erreur inattendue.",
    );
  }
  return payload.data;
}
