import { type Prisma, type EntretienStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const fullInclude = {
  // `userId` : destinataire des notifications adressées au candidat. Jamais
  // sérialisé — le mapper choisit ses champs un à un.
  jeune: {
    select: { id: true, userId: true, prenom: true, nom: true, photo: true, titre: true },
  },
  entreprise: { select: { id: true, nom: true, logo: true } },
} satisfies Prisma.EntretienInclude;

export type EntretienFull = Prisma.EntretienGetPayload<{ include: typeof fullInclude }>;

export function findEntretienById(id: string): Promise<EntretienFull | null> {
  return prisma.entretien.findUnique({ where: { id }, include: fullInclude });
}

export function createEntretien(
  data: Prisma.EntretienUncheckedCreateInput,
): Promise<EntretienFull> {
  return prisma.entretien.create({ data, include: fullInclude });
}

export function updateEntretien(
  id: string,
  data: Prisma.EntretienUpdateInput,
): Promise<EntretienFull> {
  return prisma.entretien.update({ where: { id }, data, include: fullInclude });
}

export interface EntretienFilters {
  jeuneId?: string;
  entrepriseId?: string;
  /** Un ou plusieurs statuts : les écrans regroupent « refusé ou annulé ». */
  status?: EntretienStatus[];
  from?: Date;
  to?: Date;
  /**
   * Origine de la demande.
   *
   * Les deux sens d'une même attente n'ont rien à voir pour celui qui regarde :
   * une invitation reçue appelle une réponse, une demande spontanée envoyée
   * appelle de la patience. Les séparer côté serveur garde chaque section
   * paginée pour elle-même.
   */
  spontanee?: boolean;
}

export function buildEntretienWhere(filters: EntretienFilters): Prisma.EntretienWhereInput {
  const where: Prisma.EntretienWhereInput = {};
  if (filters.jeuneId) where.jeuneId = filters.jeuneId;
  if (filters.entrepriseId) where.entrepriseId = filters.entrepriseId;
  if (filters.status?.length) where.status = { in: filters.status };
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.spontanee !== undefined) where.spontanee = filters.spontanee;
  return where;
}

/**
 * @param ordre `asc` pour ce qui vient (le plus proche d'abord), `desc` pour
 * l'historique (le plus récent d'abord). Un historique trié en ascendant
 * ouvrirait sur le tout premier entretien du compte, jamais sur le dernier.
 */
export function listEntretiens(
  where: Prisma.EntretienWhereInput,
  skip: number,
  take: number,
  ordre: "asc" | "desc" = "asc",
): Promise<[EntretienFull[], number]> {
  return Promise.all([
    prisma.entretien.findMany({
      where,
      include: fullInclude,
      orderBy: [{ date: ordre }, { heure: ordre }],
      skip,
      take,
    }),
    prisma.entretien.count({ where }),
  ]);
}

/**
 * Répartition par statut sur un périmètre donné.
 *
 * Permet aux écrans d'afficher « Confirmés : 12 » sans charger les 12 : les
 * sections sont paginées séparément, les compteurs viennent d'ici.
 */
export async function countEntretiensByStatus(
  where: Prisma.EntretienWhereInput,
): Promise<Record<string, number>> {
  const rows = await prisma.entretien.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

// ── Test de validation général ───────────────────────────────────────────────

/** Un test avec ses questions, dans l'ordre d'affichage. */
const avecQuestions = {
  filiere: { select: { id: true, nom: true } },
  questions: { orderBy: { ordre: "asc" } },
} satisfies Prisma.TestInclude;

/**
 * Le test que passe un candidat : celui de sa filière, ou le test commun.
 *
 * Seules les questions actives sont renvoyées — désactiver une question la
 * retire des tests à venir sans toucher aux tentatives déjà passées.
 */
export async function findTestPourFiliere(filiereId?: string | null) {
  const actif = { active: true } as const;
  const questions = {
    filiere: { select: { id: true, nom: true } },
    questions: { where: actif, orderBy: { ordre: "asc" } },
  } satisfies Prisma.TestInclude;

  if (filiereId) {
    const cible = await prisma.test.findFirst({
      where: { filiereId, ...actif },
      include: questions,
    });
    if (cible) return cible;
  }

  // Repli : le test commun, servi aux filières qui n'ont pas le leur.
  return prisma.test.findFirst({ where: { filiereId: null, ...actif }, include: questions });
}

/*
 * `findQuizQuestionsByIds` a été retirée : corriger à partir des identifiants
 * FOURNIS PAR LE CLIENT laissait le candidat choisir son propre barème. La
 * correction passe désormais par `findTestPourFiliere`, qui rend le test entier
 * — et n'inclut déjà que les questions actives.
 */

/**
 * Vue administrateur d'une question, désactivées comprises — sans quoi il
 * serait impossible d'en réactiver une, ni même de la corriger.
 */
export function findQuizQuestionById(id: string) {
  return prisma.quizQuestion.findUnique({ where: { id } });
}

export function listTests(skip: number, take: number) {
  return Promise.all([
    prisma.test.findMany({
      // Le test commun en dernier : il n'est qu'un repli.
      orderBy: [{ filiereId: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        filiere: { select: { id: true, nom: true } },
        _count: { select: { questions: true } },
      },
      skip,
      take,
    }),
    prisma.test.count(),
  ]);
}

export function findTestById(id: string) {
  return prisma.test.findUnique({ where: { id }, include: avecQuestions });
}

/** Le test d'une filière, ou le test commun quand `filiereId` vaut `null`. */
export function findTestByFiliere(filiereId: string | null) {
  return prisma.test.findFirst({ where: { filiereId } });
}

export function createTest(data: Prisma.TestUncheckedCreateInput) {
  return prisma.test.create({ data, include: avecQuestions });
}

export function updateTest(id: string, data: Prisma.TestUncheckedUpdateInput) {
  return prisma.test.update({ where: { id }, data, include: avecQuestions });
}

/** Les questions partent avec le test (`onDelete: Cascade`). */
export function deleteTest(id: string) {
  return prisma.test.delete({ where: { id } });
}

export function countQuizQuestions(testId: string) {
  return prisma.quizQuestion.count({ where: { testId } });
}

/** Position suivante, pour qu'une nouvelle question arrive en fin de test. */
export async function nextQuestionOrdre(testId: string): Promise<number> {
  const last = await prisma.quizQuestion.findFirst({
    where: { testId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  return (last?.ordre ?? -1) + 1;
}

export function createQuizQuestion(data: Prisma.QuizQuestionUncheckedCreateInput) {
  return prisma.quizQuestion.create({ data });
}

export function updateQuizQuestion(id: string, data: Prisma.QuizQuestionUncheckedUpdateInput) {
  return prisma.quizQuestion.update({ where: { id }, data });
}

export function deleteQuizQuestion(id: string) {
  return prisma.quizQuestion.delete({ where: { id } });
}

export function createQuizAttempt(data: Prisma.QuizAttemptUncheckedCreateInput) {
  return prisma.quizAttempt.create({ data });
}

export function listQuizAttempts(jeuneId: string) {
  return prisma.quizAttempt.findMany({
    where: { jeuneId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
