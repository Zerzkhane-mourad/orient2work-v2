import type { Role, User } from "@prisma/client";

export interface UserDto {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  /** Id du profil Jeune / Entreprise (null pour un admin). */
  profileId: string | null;
}

/** Ne sélectionne QUE des champs sûrs : `passwordHash` est structurellement absent. */
export function toUserDto(
  user: Pick<User, "id" | "email" | "role" | "emailVerified" | "createdAt">,
  profileId: string | null,
): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    profileId,
  };
}
