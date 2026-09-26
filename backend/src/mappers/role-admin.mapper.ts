import { effectivePermissions, type Permission } from "../domain/permissions.js";
import type { RoleAdminFull } from "../repositories/role-admin.repository.js";

export interface RoleAdminDto {
  id: string;
  nom: string;
  description: string;
  /**
   * Permissions EFFECTIVES, pas la colonne brute : un rôle système renvoie tout
   * le catalogue alors que sa colonne est vide. L'écran coche donc ce qui
   * s'applique réellement, sans rejouer la règle de son côté.
   */
  permissions: Permission[];
  systeme: boolean;
  /** Comptes rattachés — conditionne la suppression. */
  utilisateurs: number;
  createdAt: string;
}

/** Vue réduite, telle qu'embarquée dans la fiche d'un compte d'administration. */
export type RoleAdminBriefDto = Pick<RoleAdminDto, "id" | "nom" | "systeme">;

export function toRoleAdminDto(role: RoleAdminFull): RoleAdminDto {
  return {
    id: role.id,
    nom: role.nom,
    description: role.description,
    permissions: effectivePermissions(role),
    systeme: role.systeme,
    utilisateurs: role._count.utilisateurs,
    createdAt: role.createdAt.toISOString(),
  };
}
