import type { Role, User } from "@prisma/client";
import type { Permission } from "../domain/permissions.js";

export interface UserDto {
  id: string;
  email: string;
  role: Role;
  /**
   * Nom d'affichage, renseigné pour les comptes d'administration.
   *
   * Absent pour un jeune ou une entreprise : leur nom vit dans leur profil
   * métier, que l'écran charge déjà. Le recopier ici en ferait une seconde
   * source de vérité à tenir à jour.
   */
  nom?: string;
  emailVerified: boolean;
  createdAt: string;
  /** Id du profil Jeune / Entreprise (null pour un admin). */
  profileId: string | null;
  /**
   * Permissions d'administration — vide pour un jeune ou une entreprise.
   *
   * Sert au back-office à n'afficher que les écrans accessibles. C'est du
   * CONFORT, pas de la sécurité : l'autorisation réelle est refaite par le
   * serveur sur chaque requête, à partir de la base et non de ce tableau.
   */
  permissions: Permission[];
}

/** Ne sélectionne QUE des champs sûrs : `passwordHash` est structurellement absent. */
export function toUserDto(
  user: Pick<User, "id" | "email" | "role" | "nom" | "emailVerified" | "createdAt">,
  profileId: string | null,
  permissions: Permission[] = [],
): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ...(user.nom ? { nom: user.nom } : {}),
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    profileId,
    permissions,
  };
}
