import { type Prisma, type OffreStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const fullInclude = {
  entreprise: { select: { id: true, nom: true, logo: true, ville: true, status: true } },
  filiere: { select: { nom: true } },
  _count: { select: { candidatures: true } },
} satisfies Prisma.OffreInclude;

export type OffreFull = Prisma.OffreGetPayload<{ include: typeof fullInclude }>;

export function findOffreById(id: string): Promise<OffreFull | null> {
  return prisma.offre.findUnique({ where: { id }, include: fullInclude });
}

/** Version allégée pour les contrôles de propriété — évite de charger les jointures. */
export function findOffreOwner(id: string) {
  return prisma.offre.findUnique({
    where: { id },
    select: { id: true, entrepriseId: true, status: true, titre: true, dateLimite: true },
  });
}

export function createOffre(data: Prisma.OffreUncheckedCreateInput): Promise<OffreFull> {
  return prisma.offre.create({ data, include: fullInclude });
}

export function updateOffre(id: string, data: Prisma.OffreUpdateInput): Promise<OffreFull> {
  return prisma.offre.update({ where: { id }, data, include: fullInclude });
}

export function deleteOffre(id: string) {
  return prisma.offre.delete({ where: { id } });
}

export interface OffreFilters {
  q?: string;
  type?: string;
  mode?: string;
  filiereId?: string;
  ville?: string;
  niveauDemande?: string;
  entrepriseId?: string;
  status?: OffreStatus | OffreStatus[];
  /** Restreint aux offres encore ouvertes (date limite non dépassée). */
  ouvertesSeulement?: boolean;
}

export function buildOffreWhere(filters: OffreFilters): Prisma.OffreWhereInput {
  const where: Prisma.OffreWhereInput = {};

  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
  }
  if (filters.entrepriseId) where.entrepriseId = filters.entrepriseId;
  if (filters.type) where.type = filters.type;
  if (filters.mode) where.mode = filters.mode;
  if (filters.filiereId) where.filiereId = filters.filiereId;
  if (filters.niveauDemande) where.niveauDemande = filters.niveauDemande;
  if (filters.ville) where.ville = { contains: filters.ville, mode: "insensitive" };
  if (filters.ouvertesSeulement) where.dateLimite = { gte: new Date() };

  if (filters.q) {
    where.OR = [
      { titre: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { competences: { has: filters.q } },
      { entreprise: { nom: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export type OffreSort = "recent" | "dateLimite" | "candidatures";

function buildOrderBy(sort: OffreSort): Prisma.OffreOrderByWithRelationInput {
  switch (sort) {
    case "dateLimite":
      return { dateLimite: "asc" };
    case "candidatures":
      return { candidatures: { _count: "desc" } };
    case "recent":
    default:
      return { createdAt: "desc" };
  }
}

export function listOffres(
  where: Prisma.OffreWhereInput,
  skip: number,
  take: number,
  sort: OffreSort = "recent",
): Promise<[OffreFull[], number]> {
  return Promise.all([
    prisma.offre.findMany({ where, include: fullInclude, orderBy: buildOrderBy(sort), skip, take }),
    prisma.offre.count({ where }),
  ]);
}

/** Bascule en `expiree` les offres publiées dont la date limite est passée. */
export function expireOutdatedOffres() {
  return prisma.offre.updateMany({
    where: { status: "publiee", dateLimite: { lt: new Date() } },
    data: { status: "expiree" },
  });
}
