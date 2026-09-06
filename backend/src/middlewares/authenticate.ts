/**
 * Authentification par access token (Bearer).
 *
 * Le token est vérifié cryptographiquement, sans requête SQL : c'est le prix à
 * payer pour une durée de vie courte (15 min). La révocation immédiate passe par
 * le refresh token, qui est stocké en base et peut être invalidé.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Exige un utilisateur authentifié ; sinon 401. */
export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) {
    next(new UnauthenticatedError("Authentification requise."));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      profileId: payload.profileId,
      emailVerified: payload.emailVerified,
    };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attache l'utilisateur s'il y a un token valide, sans jamais échouer.
 * Utile sur les routes publiques dont la réponse s'enrichit quand on est connecté
 * (ex. « déjà candidaté » sur le détail d'une offre).
 */
export const optionalAuthenticate: RequestHandler = (req: Request, _res, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      profileId: payload.profileId,
      emailVerified: payload.emailVerified,
    };
  } catch {
    // Token expiré ou invalide : on reste simplement anonyme.
  }
  next();
};

/** Réserve une action aux comptes dont l'email est confirmé. */
export const requireVerifiedEmail: RequestHandler = (req: Request, _res, next: NextFunction) => {
  if (!req.user) {
    next(new UnauthenticatedError("Authentification requise."));
    return;
  }
  if (!req.user.emailVerified) {
    next(
      new ForbiddenError(
        "Confirmez votre adresse email pour accéder à cette fonctionnalité.",
        "EMAIL_NOT_VERIFIED",
      ),
    );
    return;
  }
  next();
};
