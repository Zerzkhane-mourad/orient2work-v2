/**
 * Gestion centralisée des erreurs — dernier maillon de la chaîne Express.
 *
 * Contrat vis-à-vis du client :
 *  • toujours la même enveloppe `{ success: false, error: { code, message } }` ;
 *  • aucune stack trace, aucun message Prisma, aucune requête SQL ne sort en
 *    production : les erreurs inattendues deviennent un 500 générique et le détail
 *    part uniquement dans les logs serveur.
 */
import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError, isAppError } from "../lib/errors.js";
import { PrismaErrorCode } from "../lib/prisma.js";
import type { ApiFailure } from "../lib/http.js";

export const notFoundHandler: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  next(new NotFoundError(`Route inconnue : ${req.method} ${req.path}`));
};

/** Traduit les erreurs connues (Prisma, zod, body-parser) en `AppError`. */
function normalize(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof ZodError) {
    return new AppError(422, "VALIDATION_ERROR", "Données invalides.", {
      issues: error.issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case PrismaErrorCode.UNIQUE_CONSTRAINT:
        return new AppError(409, "CONFLICT", "Cette ressource existe déjà.");
      case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT:
        return new AppError(409, "CONFLICT", "Opération impossible : la ressource est référencée.");
      case PrismaErrorCode.RECORD_NOT_FOUND:
        return new AppError(404, "NOT_FOUND", "Ressource introuvable.");
      default:
        return new AppError(500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, "VALIDATION_ERROR", "Requête invalide.");
  }

  // body-parser : JSON malformé ou payload au-dessus de la limite.
  if (typeof error === "object" && error !== null && "type" in error) {
    const parserError = error as { type?: string; status?: number };
    if (parserError.type === "entity.too.large") {
      return new AppError(413, "PAYLOAD_TOO_LARGE", "Corps de requête trop volumineux.");
    }
    if (parserError.type === "entity.parse.failed") {
      return new AppError(400, "VALIDATION_ERROR", "JSON malformé.");
    }
  }

  return new AppError(500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
}

export const errorHandler: ErrorRequestHandler = (error, req: Request, res: Response, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = normalize(error);
  const context = {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    code: appError.code,
    statusCode: appError.statusCode,
  };

  if (appError.statusCode >= 500) {
    logger.error({ ...context, err: error }, appError.message);
  } else {
    logger.warn(context, appError.message);
  }

  const body: ApiFailure = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  // Hors production seulement : la stack aide au débogage local, jamais en ligne.
  if (!isProduction && appError.statusCode >= 500 && error instanceof Error) {
    body.error.details = { stack: error.stack };
  }

  res.status(appError.statusCode).json(body);
};
