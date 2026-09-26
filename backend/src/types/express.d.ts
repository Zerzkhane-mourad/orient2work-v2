import type { Role } from "@prisma/client";
import type { Permission } from "../domain/permissions.js";

declare global {
  namespace Express {
    /** Utilisateur authentifié, posé par le middleware `authenticate`. */
    interface AuthenticatedUser {
      id: string;
      role: Role;
      /** Id du profil Jeune / Entreprise, `null` pour un admin. */
      profileId: string | null;
      emailVerified: boolean;
    }

    interface Request {
      user?: AuthenticatedUser;
      /**
       * Permissions d'administration, résolues à la demande par
       * `requirePermission` puis mémorisées pour la durée de la requête.
       */
      permissions?: Permission[];
      /** Données validées par zod — les seules que les contrôleurs doivent lire. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      id?: string;
    }
  }
}

export {};
