import { type Prisma, type JeuneStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Profil jeune complet — la forme attendue par le mapper. */
const fullInclude = {
  user: { select: { id: true, email: true, emailVerified: true, createdAt: true } },
  // La filière est un référentiel : seul son libellé courant intéresse le mapper.
  filiere: { select: { nom: true } },
  experiences: { orderBy: { ordre: "asc" } },
  liens: true,
  progressions: {
    select: { formationId: true, lu: true, valide: true, meilleurScore: true, progression: true },
  },
  _count: { select: { candidatures: true } },
} satisfies Prisma.JeuneInclude;

export type JeuneFull = Prisma.JeuneGetPayload<{ include: typeof fullInclude }>;

export function findJeuneById(id: string): Promise<JeuneFull | null> {
  return prisma.jeune.findUnique({ where: { id }, include: fullInclude });
}

export function findJeuneByUserId(userId: string): Promise<JeuneFull | null> {
  return prisma.jeune.findUnique({ where: { userId }, include: fullInclude });
}

export function createJeune(
  data: Prisma.JeuneUncheckedCreateInput,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.jeune.create({ data });
}

export function updateJeune(id: string, data: Prisma.JeuneUpdateInput): Promise<JeuneFull> {
  return prisma.jeune.update({ where: { id }, data, include: fullInclude });
}

export function updateJeuneStatus(id: string, status: JeuneStatus) {
  return prisma.jeune.update({ where: { id }, data: { status } });
}

export interface JeuneFilters {
  q?: string;
  status?: JeuneStatus;
  filiereId?: string;
  ville?: string;
  niveauEtudes?: string;
  competences?: string[];
  scoreMin?: number;
}

/**
 * `mode: "insensitive"` s'appuie sur ILIKE côté PostgreSQL. Les valeurs restent
 * paramétrées par Prisma : aucune concaténation SQL, donc pas d'injection possible.
 */
export function buildJeuneWhere(filters: JeuneFilters): Prisma.JeuneWhereInput {
  const where: Prisma.JeuneWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.filiereId) where.filiereId = filters.filiereId;
  if (filters.niveauEtudes) where.niveauEtudes = filters.niveauEtudes;
  if (filters.ville) where.ville = { contains: filters.ville, mode: "insensitive" };
  if (filters.scoreMin !== undefined) where.scoreQuiz = { gte: filters.scoreMin };
  if (filters.competences?.length) where.competences = { hasSome: filters.competences };

  if (filters.q) {
    where.OR = [
      { prenom: { contains: filters.q, mode: "insensitive" } },
      { nom: { contains: filters.q, mode: "insensitive" } },
      { titre: { contains: filters.q, mode: "insensitive" } },
      { etablissement: { contains: filters.q, mode: "insensitive" } },
      { competences: { has: filters.q } },
    ];
  }

  return where;
}

export function listJeunes(
  where: Prisma.JeuneWhereInput,
  skip: number,
  take: number,
): Promise<[JeuneFull[], number]> {
  return Promise.all([
    prisma.jeune.findMany({
      where,
      include: fullInclude,
      orderBy: [{ scoreQuiz: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.jeune.count({ where }),
  ]);
}

// ── Expériences ──────────────────────────────────────────────────────────────

export function createExperience(data: Prisma.ExperienceUncheckedCreateInput) {
  return prisma.experience.create({ data });
}

export function findExperience(id: string) {
  return prisma.experience.findUnique({ where: { id } });
}

export function updateExperience(id: string, data: Prisma.ExperienceUpdateInput) {
  return prisma.experience.update({ where: { id }, data });
}

export function deleteExperience(id: string) {
  return prisma.experience.delete({ where: { id } });
}

export function countExperiences(jeuneId: string) {
  return prisma.experience.count({ where: { jeuneId } });
}

// ── Liens ────────────────────────────────────────────────────────────────────

export function createLien(data: Prisma.LienUncheckedCreateInput) {
  return prisma.lien.create({ data });
}

export function findLien(id: string) {
  return prisma.lien.findUnique({ where: { id } });
}

export function deleteLien(id: string) {
  return prisma.lien.delete({ where: { id } });
}
