/**
 * Erreurs applicatives.
 *
 * Toute erreur volontaire est une `AppError` : elle porte un statut HTTP, un code
 * machine stable pour le frontend et un message *destiné au client*. Les erreurs
 * non prévues sont converties en 500 générique par le middleware d'erreur —
 * aucune stack trace ni détail interne ne franchit la frontière HTTP.
 */

export type ErrorCode =
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
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  /** Une AppError est attendue : on la loggue en `warn`, pas en `error`. */
  readonly isOperational = true;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Données invalides.", details?: unknown) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentification requise.", code: ErrorCode = "UNAUTHENTICATED") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé.", code: ErrorCode = "FORBIDDEN") {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Cette ressource existe déjà.") {
    super(409, "CONFLICT", message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "Type de fichier non autorisé.") {
    super(415, "UNSUPPORTED_MEDIA_TYPE", message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Fichier ou requête trop volumineux.") {
    super(413, "PAYLOAD_TOO_LARGE", message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
