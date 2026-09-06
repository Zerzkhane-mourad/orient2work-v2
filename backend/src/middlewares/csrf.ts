/**
 * Protection CSRF — double submit cookie.
 *
 * Le refresh token vit dans un cookie, donc il est envoyé automatiquement par le
 * navigateur : `sameSite=strict` bloque déjà la quasi-totalité des scénarios CSRF,
 * mais on ajoute une seconde barrière indépendante du comportement du navigateur.
 *
 * Principe : un cookie non-httpOnly `o2w_csrf` est posé à la connexion ; le
 * frontend recopie sa valeur dans l'en-tête `x-csrf-token`. Un site tiers peut
 * déclencher la requête (le cookie part) mais ne peut pas LIRE le cookie pour
 * remplir l'en-tête — la comparaison échoue.
 *
 * N'est appliqué qu'aux routes utilisant le cookie de session (auth/refresh,
 * auth/logout) : les autres routes s'authentifient par en-tête Bearer, qu'un
 * navigateur n'ajoute jamais tout seul, donc elles ne sont pas exposées au CSRF.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../lib/errors.js";
import { CSRF_COOKIE_NAME } from "../lib/cookies.js";
import { generateOpaqueToken, safeCompare } from "../lib/tokens.js";

export function issueCsrfToken(): string {
  return generateOpaqueToken(32);
}

export const verifyCsrf: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const cookieToken = (req.cookies as Record<string, string | undefined>)[CSRF_COOKIE_NAME];
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || !safeCompare(cookieToken, headerToken)) {
    next(new AppError(403, "CSRF_ERROR", "Requête rejetée (jeton CSRF absent ou invalide)."));
    return;
  }
  next();
};
