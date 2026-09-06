/**
 * Autorisation : rôles (RBAC) et propriété des ressources.
 *
 * Deux contrôles distincts et complémentaires :
 *  1. `authorize(...)` — « ce rôle a-t-il le droit d'appeler cette route ? » ;
 *  2. la vérification de propriété — « cette ressource précise lui appartient-elle ? ».
 *
 * Le second ne peut pas être un simple middleware générique : il dépend de la
 * ressource, donc il est appliqué dans les services via `assertOwnership`. Un
 * jeune ne peut modifier que son propre profil, une entreprise que ses propres
 * offres ; l'admin passe partout.
 */
import { Role } from "@prisma/client";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors.js";

export function authorize(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthenticatedError("Authentification requise."));
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new ForbiddenError("Votre rôle ne permet pas cette action."));
      return;
    }
    next();
  };
}

export const requireJeune = authorize(Role.JEUNE);
export const requireEntreprise = authorize(Role.ENTREPRISE);
export const requireAdmin = authorize(Role.ADMIN);

export interface Actor {
  id: string;
  role: Role;
  profileId: string | null;
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === Role.ADMIN;
}

/**
 * Vérifie que l'acteur possède la ressource. L'admin est toujours autorisé.
 * Message volontairement identique à un refus d'accès générique : il ne révèle
 * pas si la ressource existe et appartient à quelqu'un d'autre.
 */
export function assertOwnership(actor: Actor, ownerProfileId: string): void {
  if (isAdmin(actor)) return;
  if (!actor.profileId || actor.profileId !== ownerProfileId) {
    throw new ForbiddenError("Vous ne pouvez agir que sur vos propres ressources.", "NOT_OWNER");
  }
}

/** Variante pour les ressources rattachées au `User` (notifications, documents). */
export function assertUserOwnership(actor: Actor, ownerUserId: string): void {
  if (isAdmin(actor)) return;
  if (actor.id !== ownerUserId) {
    throw new ForbiddenError("Vous ne pouvez agir que sur vos propres ressources.", "NOT_OWNER");
  }
}

/** Profil métier obligatoire (jeune ou entreprise) pour l'action demandée. */
export function requireProfileId(actor: Actor): string {
  if (!actor.profileId) {
    throw new ForbiddenError("Aucun profil associé à ce compte.");
  }
  return actor.profileId;
}

/** Extrait l'acteur courant, en garantissant qu'il est authentifié. */
export function currentActor(req: Request): Actor {
  if (!req.user) throw new UnauthenticatedError("Authentification requise.");
  return { id: req.user.id, role: req.user.role, profileId: req.user.profileId };
}
