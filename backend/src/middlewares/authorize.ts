/**
 * Autorisation : rôles (RBAC), permissions fines et propriété des ressources.
 *
 * Trois contrôles distincts et complémentaires :
 *  1. `authorize(...)` — « ce TYPE de compte peut-il appeler cette route ? » ;
 *  2. `requirePermission(...)` — « cet administrateur a-t-il ce droit précis ? » ;
 *  3. la vérification de propriété — « cette ressource lui appartient-elle ? ».
 *
 * Le troisième ne peut pas être un simple middleware générique : il dépend de la
 * ressource, donc il est appliqué dans les services via `assertOwnership`. Un
 * jeune ne peut modifier que son propre profil, une entreprise que ses propres
 * offres ; l'admin passe partout.
 */
import { Role } from "@prisma/client";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors.js";
import { effectivePermissions, type Permission } from "../domain/permissions.js";
import * as roleRepository from "../repositories/role-admin.repository.js";

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

// ── Permissions d'administration ─────────────────────────────────────────────

/**
 * Permissions effectives du compte, lues en BASE et non dans le jeton.
 *
 * Le choix a un coût — une requête indexée par requête d'administration — et
 * une raison : l'access token vit 15 minutes. Y embarquer les permissions
 * voudrait dire qu'un droit retiré reste utilisable un quart d'heure, sur les
 * écrans les plus sensibles de la plateforme. Le back-office est à faible trafic
 * et sert des administrateurs : la lecture est le bon compromis.
 *
 * Un compte SANS rôle n'a aucune permission. C'est le défaut sûr : créer un
 * administrateur ne doit rien ouvrir tant qu'on ne lui a pas attribué un rôle.
 */
export async function permissionsOf(userId: string): Promise<Permission[]> {
  const row = await roleRepository.findPermissionsByUserId(userId);
  return row?.roleAdmin ? effectivePermissions(row.roleAdmin) : [];
}

/**
 * Permissions de la requête courante, résolues une seule fois.
 *
 * Plusieurs gardes peuvent se succéder sur une même route ; sans ce cache elles
 * rejoueraient chacune la requête.
 */
async function resolvePermissions(req: Request): Promise<Permission[]> {
  if (!req.permissions) req.permissions = await permissionsOf(req.user!.id);
  return req.permissions;
}

/**
 * Exige un administrateur détenant TOUTES les permissions listées.
 *
 * S'utilise après `authenticate`. Le contrôle de rôle est refait ici plutôt que
 * supposé : la route de création d'une formation, par exemple, porte ses propres
 * `authenticate, requireAdmin` et n'est pas montée sous le routeur admin.
 */
export function requirePermission(...required: Permission[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthenticatedError("Authentification requise."));
      return;
    }
    if (req.user.role !== Role.ADMIN) {
      next(new ForbiddenError("Votre rôle ne permet pas cette action."));
      return;
    }

    void resolvePermissions(req)
      .then((granted) => {
        const manquante = required.find((permission) => !granted.includes(permission));
        if (manquante) {
          // Le code manquant est nommé : l'administrateur qui gère les rôles doit
          // savoir laquelle cocher, et rien n'est révélé de la ressource visée.
          next(
            new ForbiddenError(
              `Votre rôle ne comporte pas la permission « ${manquante} ».`,
            ),
          );
          return;
        }
        next();
      })
      .catch(next);
  };
}

/**
 * Détient-il ces permissions ? Variante NON bloquante d'`assertPermission`.
 *
 * Pour les routes publiques où l'administrateur bénéficie d'un privilège en
 * plus — voir les formations non publiées, par exemple. Refuser y serait
 * absurde : la route sert aussi les visiteurs. On DÉGRADE donc vers la vue
 * publique au lieu de renvoyer 403 sur une page ouverte à tous.
 */
export async function hasPermission(actor: Actor, ...required: Permission[]): Promise<boolean> {
  if (actor.role !== Role.ADMIN) return false;
  const granted = await permissionsOf(actor.id);
  return required.every((permission) => granted.includes(permission));
}

/**
 * Même contrôle, appelable depuis un service.
 *
 * Utile là où la règle n'est pas portée par une route dédiée — une route
 * partagée dont seule la branche administrateur doit être gouvernée.
 */
export async function assertPermission(actor: Actor, ...required: Permission[]): Promise<void> {
  if (actor.role !== Role.ADMIN) {
    throw new ForbiddenError("Votre rôle ne permet pas cette action.");
  }
  const granted = await permissionsOf(actor.id);
  const manquante = required.find((permission) => !granted.includes(permission));
  if (manquante) {
    throw new ForbiddenError(`Votre rôle ne comporte pas la permission « ${manquante} ».`);
  }
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
