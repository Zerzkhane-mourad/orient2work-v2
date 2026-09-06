/**
 * Validation zod des entrées HTTP.
 *
 * Règle absolue : un contrôleur ne lit JAMAIS `req.body` / `req.query` / `req.params`
 * bruts, seulement `req.validated`. Les schémas sont `strict()` par convention côté
 * appelant, ce qui rejette les champs inconnus au lieu de les ignorer (protection
 * contre le mass-assignment : un client ne peut pas glisser `role: "ADMIN"`).
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { type ZodError, type ZodTypeAny } from "zod";
import { ValidationError } from "../lib/errors.js";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

interface FieldIssue {
  field: string;
  message: string;
}

function toFieldIssues(error: ZodError, source: string): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: [source, ...issue.path.map(String)].filter(Boolean).join("."),
    message: issue.message,
  }));
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues: FieldIssue[] = [];
    const validated: NonNullable<Request["validated"]> = {};

    for (const source of ["params", "query", "body"] as const) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (result.success) {
        validated[source] = result.data;
      } else {
        issues.push(...toFieldIssues(result.error, source));
      }
    }

    if (issues.length > 0) {
      next(new ValidationError("Certains champs sont invalides.", issues));
      return;
    }

    req.validated = validated;
    next();
  };
}

/** Accesseurs typés — évitent un `as` dans chaque contrôleur. */
export function body<T>(req: Request): T {
  return req.validated?.body as T;
}

export function query<T>(req: Request): T {
  return req.validated?.query as T;
}

export function params<T>(req: Request): T {
  return req.validated?.params as T;
}
