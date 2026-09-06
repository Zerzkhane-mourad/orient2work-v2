import { type Prisma, OffreStatus, type EntrepriseStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const fullInclude = {
  user: { select: { id: true, email: true, emailVerified: true, createdAt: true } },
  _count: { select: { offres: { where: { status: OffreStatus.publiee } } } },
} satisfies Prisma.EntrepriseInclude;

export type EntrepriseFull = Prisma.EntrepriseGetPayload<{ include: typeof fullInclude }>;

export function findEntrepriseById(id: string): Promise<EntrepriseFull | null> {
  return prisma.entreprise.findUnique({ where: { id }, include: fullInclude });
}

export function findEntrepriseByUserId(userId: string): Promise<EntrepriseFull | null> {
  return prisma.entreprise.findUnique({ where: { userId }, include: fullInclude });
}

export function createEntreprise(
  data: Prisma.EntrepriseUncheckedCreateInput,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.entreprise.create({ data });
}

export function updateEntreprise(
  id: string,
  data: Prisma.EntrepriseUpdateInput,
): Promise<EntrepriseFull> {
  return prisma.entreprise.update({ where: { id }, data, include: fullInclude });
}

export interface EntrepriseFilters {
  q?: string;
  status?: EntrepriseStatus;
  ville?: string;
  secteur?: string;
}

export function buildEntrepriseWhere(filters: EntrepriseFilters): Prisma.EntrepriseWhereInput {
  const where: Prisma.EntrepriseWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.ville) where.ville = { contains: filters.ville, mode: "insensitive" };
  if (filters.secteur) where.secteur = { contains: filters.secteur, mode: "insensitive" };
  if (filters.q) {
    where.OR = [
      { nom: { contains: filters.q, mode: "insensitive" } },
      { secteur: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export function listEntreprises(
  where: Prisma.EntrepriseWhereInput,
  skip: number,
  take: number,
): Promise<[EntrepriseFull[], number]> {
  return Promise.all([
    prisma.entreprise.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.entreprise.count({ where }),
  ]);
}

export function updateEntrepriseStatus(id: string, status: EntrepriseStatus) {
  return prisma.entreprise.update({ where: { id }, data: { status } });
}
