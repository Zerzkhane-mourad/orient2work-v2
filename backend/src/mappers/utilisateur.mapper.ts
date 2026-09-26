import type { AdminUserFull } from "../repositories/utilisateur.repository.js";
import type { RoleAdminBriefDto } from "./role-admin.mapper.js";

export interface UtilisateurAdminDto {
  id: string;
  email: string;
  nom: string;
  /** `null` pour un compte créé avant l'arrivée des rôles, ou dont le rôle a été retiré. */
  role: RoleAdminBriefDto | null;
  actif: boolean;
  /** `null` tant que le compte ne s'est jamais connecté — repère utile à l'audit. */
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Ne sélectionne que des champs sûrs ; `passwordHash` n'est jamais recopié.
 *
 * La liste des permissions du rôle n'est pas reprise non plus : l'annuaire
 * affiche le NOM du rôle, et l'écran des rôles détient le détail. Les dupliquer
 * dans chaque ligne alourdirait la réponse sans que rien ne les lise.
 */
export function toUtilisateurAdminDto(user: AdminUserFull): UtilisateurAdminDto {
  return {
    id: user.id,
    email: user.email,
    nom: user.nom ?? "",
    role: user.roleAdmin
      ? { id: user.roleAdmin.id, nom: user.roleAdmin.nom, systeme: user.roleAdmin.systeme }
      : null,
    actif: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
