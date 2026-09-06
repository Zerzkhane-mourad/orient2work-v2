/**
 * Erreurs API.
 *
 * Le backend renvoie toujours `{ success: false, error: { code, message } }` avec
 * un `code` machine stable. On le conserve tel quel plutôt que de se fier au seul
 * statut HTTP : c'est lui qui permet à l'UI de distinguer « pas connecté » de
 * « rôle insuffisant » ou « ce n'est pas à vous », qui sont tous des 401/403.
 */

/** Codes émis par le backend (src/lib/errors.ts côté API). */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_DISABLED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "FORBIDDEN"
  | "NOT_OWNER"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "CSRF_ERROR"
  | "INTERNAL_ERROR"
  /* Codes purement côté client, jamais émis par le backend. */
  | "NETWORK_ERROR"
  | "TIMEOUT"
  /** Réponse hors contrat : corps vide, non-JSON, ou sans `success`. */
  | "UNEXPECTED_RESPONSE";

/** Détail de validation zod, tel que renvoyé par le backend. */
export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** L'utilisateur n'est pas (ou plus) authentifié. */
  get isAuthError(): boolean {
    return (
      this.code === "UNAUTHENTICATED" ||
      this.code === "TOKEN_EXPIRED" ||
      this.code === "TOKEN_INVALID"
    );
  }

  /** Authentifié, mais pas le droit — rôle insuffisant ou ressource d'autrui. */
  get isForbidden(): boolean {
    return this.code === "FORBIDDEN" || this.code === "NOT_OWNER";
  }

  get isNotFound(): boolean {
    return this.code === "NOT_FOUND";
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Erreurs de validation champ par champ, prêtes à être affichées sous les
   * inputs. `[]` si l'erreur n'est pas une 422.
   */
  get fieldIssues(): FieldIssue[] {
    if (this.code !== "VALIDATION_ERROR" || !this.details) return [];

    // Le backend émet soit un tableau direct, soit `{ issues: [...] }` selon
    // qu'il vient du middleware de validation ou du gestionnaire d'erreurs.
    const raw = Array.isArray(this.details)
      ? this.details
      : (this.details as { issues?: unknown }).issues;

    if (!Array.isArray(raw)) return [];

    return raw.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const issue = entry as { field?: unknown; message?: unknown };
      if (typeof issue.field !== "string" || typeof issue.message !== "string") return [];
      // On retire le préfixe de source (`body.`, `query.`) : l'UI raisonne en
      // noms de champs de formulaire.
      return [{ field: issue.field.replace(/^(body|query|params)\./, ""), message: issue.message }];
    });
  }

  /** Message de validation associé à un champ, s'il y en a un. */
  issueFor(field: string): string | undefined {
    return this.fieldIssues.find((issue) => issue.field === field)?.message;
  }
}

/** Message court et lisible, adapté au code d'erreur. */
export function humanizeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Une erreur inattendue est survenue.";
  }

  switch (error.code) {
    case "NETWORK_ERROR":
      return "Impossible de joindre le serveur. Vérifiez votre connexion.";
    case "TIMEOUT":
      return "Le serveur met trop de temps à répondre. Réessayez.";
    case "UNAUTHENTICATED":
    case "TOKEN_EXPIRED":
    case "TOKEN_INVALID":
      return "Votre session a expiré. Reconnectez-vous.";
    case "INVALID_CREDENTIALS":
      return "Email ou mot de passe incorrect.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirmez votre adresse email pour accéder à cette fonctionnalité.";
    case "ACCOUNT_DISABLED":
      return "Ce compte a été désactivé. Contactez l'équipe OMB.";
    case "FORBIDDEN":
    case "NOT_OWNER":
      return error.message || "Vous n'avez pas accès à cette ressource.";
    case "NOT_FOUND":
      return "Cette ressource est introuvable.";
    case "RATE_LIMITED":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "PAYLOAD_TOO_LARGE":
      return "Le fichier ou le formulaire est trop volumineux.";
    case "UNSUPPORTED_MEDIA_TYPE":
      return error.message || "Format de fichier non autorisé.";
    case "INTERNAL_ERROR":
      return "Le serveur a rencontré un problème. Réessayez dans un instant.";
    case "UNEXPECTED_RESPONSE":
      // Le message porte déjà le statut HTTP : le remplacer par un texte
      // générique rendrait la panne invisible.
      return error.message;
    default:
      // VALIDATION_ERROR, CONFLICT, CSRF_ERROR : le message du backend est déjà
      // rédigé pour l'utilisateur final.
      return error.message || "Une erreur est survenue.";
  }
}
