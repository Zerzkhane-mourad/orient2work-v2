/**
 * Accès aux rôles d'administration.
 *
 * Aucune règle métier ici : « ce rôle peut-il être supprimé ? » appartient au
 * service, cette couche ne sait que compter ses porteurs.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * Le nombre de comptes rattachés conditionne la suppression, et s'affiche dans
 * la liste : il est chargé partout, pas seulement au moment de supprimer.
 */
const fullInclude = {
  _count: { select: { utilisateurs: true } },
} satisfies Prisma.RoleAdminInclude;

export type RoleAdminFull = Prisma.RoleAdminGetPayload<{ include: typeof fullInclude }>;

export function findRoleById(id: string): Promise<RoleAdminFull | null> {
  return prisma.roleAdmin.findUnique({ where: { id }, include: fullInclude });
}

export function findRoleByNom(nom: string): Promise<RoleAdminFull | null> {
  return prisma.roleAdmin.findUnique({ where: { nom }, include: fullInclude });
}

/**
 * Rôle et permissions du compte, pour le contrôle d'accès.
 *
 * Volontairement minimal — c'est la requête la plus chaude du back-office,
 * exécutée une fois par requête d'administration.
 */
export function findPermissionsByUserId(userId: string): Promise<{
  roleAdmin: { systeme: boolean; permissions: string[] } | null;
} | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { roleAdmin: { select: { systeme: true, permissions: true } } },
  });
}

export function buildRoleWhere(filters: { q?: string }): Prisma.RoleAdminWhereInput {
  if (!filters.q) return {};
  return {
    OR: [
      { nom: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ],
  };
}

export function listRoles(
  where: Prisma.RoleAdminWhereInput,
  skip: number,
  take: number,
): Promise<[RoleAdminFull[], number]> {
  return Promise.all([
    prisma.roleAdmin.findMany({
      where,
      include: fullInclude,
      // Le rôle système d'abord : c'est le repère par rapport auquel les autres
      // se lisent, il ne doit pas se perdre dans l'ordre alphabétique.
      orderBy: [{ systeme: "desc" }, { nom: "asc" }],
      skip,
      take,
    }),
    prisma.roleAdmin.count({ where }),
  ]);
}

export function createRole(data: {
  nom: string;
  description: string;
  permissions: string[];
}): Promise<RoleAdminFull> {
  return prisma.roleAdmin.create({ data, include: fullInclude });
}

export function updateRole(
  id: string,
  data: Prisma.RoleAdminUpdateInput,
): Promise<RoleAdminFull> {
  return prisma.roleAdmin.update({ where: { id }, data, include: fullInclude });
}

export function deleteRole(id: string): Promise<unknown> {
  return prisma.roleAdmin.delete({ where: { id } });
}

/** Nombre de comptes ADMIN actifs portant un rôle système — garde-fou anti-verrouillage. */
export function countActiveSystemAdmins(excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      roleAdmin: { systeme: true },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}
