/**
 * Accès aux comptes d'ADMINISTRATION.
 *
 * Distinct de `user.repository.ts`, qui sert l'authentification (recherche par
 * email, tokens, session). Ici on manipule l'annuaire du back-office : lister,
 * créer, rattacher à un rôle, désactiver. Toutes les requêtes portent
 * `role: ADMIN` en dur — aucune ne peut atteindre un compte jeune ou entreprise
 * par accident, même avec un identifiant valide.
 */
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const fullInclude = {
  roleAdmin: { select: { id: true, nom: true, systeme: true, permissions: true } },
} satisfies Prisma.UserInclude;

export type AdminUserFull = Prisma.UserGetPayload<{ include: typeof fullInclude }>;

/** Filtre de base : aucune fonction de ce module ne voit autre chose qu'un admin. */
const ADMINS_ONLY = { role: Role.ADMIN } satisfies Prisma.UserWhereInput;

export function findAdminById(id: string): Promise<AdminUserFull | null> {
  return prisma.user.findFirst({ where: { ...ADMINS_ONLY, id }, include: fullInclude });
}

export interface AdminUserFilters {
  q?: string;
  roleAdminId?: string;
  actif?: boolean;
}

export function buildAdminWhere(filters: AdminUserFilters): Prisma.UserWhereInput {
  return {
    ...ADMINS_ONLY,
    ...(filters.q
      ? {
          OR: [
            { nom: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.roleAdminId ? { roleAdminId: filters.roleAdminId } : {}),
    ...(filters.actif !== undefined ? { isActive: filters.actif } : {}),
  };
}

export function listAdmins(
  where: Prisma.UserWhereInput,
  skip: number,
  take: number,
): Promise<[AdminUserFull[], number]> {
  return Promise.all([
    prisma.user.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
}

export function createAdmin(data: {
  email: string;
  passwordHash: string;
  nom: string;
  roleAdminId: string;
}): Promise<AdminUserFull> {
  return prisma.user.create({
    data: {
      ...data,
      role: Role.ADMIN,
      // Un compte créé par un administrateur n'a pas de boucle de vérification à
      // faire : l'adresse a été saisie par quelqu'un qui répond déjà de son
      // usage, et un admin non vérifié serait bloqué par `requireVerifiedEmail`.
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    include: fullInclude,
  });
}

export function updateAdmin(id: string, data: Prisma.UserUpdateInput): Promise<AdminUserFull> {
  return prisma.user.update({ where: { id }, data, include: fullInclude });
}

export function deleteAdmin(id: string): Promise<unknown> {
  return prisma.user.delete({ where: { id } });
}
